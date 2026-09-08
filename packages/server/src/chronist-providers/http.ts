// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash } from "@chronicle/core";
import { isIP } from "node:net";
import type { ReadableStreamDefaultReader } from "node:stream/web";
import { isChronistHttpProfile, parseChronistModelUnit, renderChronistUnit,
  type ChronistCallOutcome, type ChronistHttpProfile, type ChronistUsageEvidence } from "@chronicle/chronist";
import type { ChronistProviderDescription } from "@chronicle/protocol";
import type { ChronistProviderBinding } from "../domain/chronist/runtime.ts";

export interface ChronistHttpProviderConfig {
  readonly id: string; readonly label: string; readonly profileId: ChronistHttpProfile;
  readonly location: "lokal" | "fremd"; readonly baseUrl: string; readonly models: readonly string[];
  readonly apiKey?: string; readonly available?: boolean;
  readonly pricing?: ChronistProviderDescription["pricing"];
}
export interface ChronistHttpDependencies { readonly fetch?: typeof fetch }
const HARD_TIMEOUT_MS = 120_000, MAX_TRANSPORT_BYTES = 2 * 1024 * 1024, MAX_FRAME_CHARS = 256 * 1024, MAX_FRAMES = 10_000;
const record = (value: unknown): Record<string, any> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
const count = (value: unknown): number | null => Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
const plus = (a: number | null, b: number | null): number | null => a === null || b === null || !Number.isSafeInteger(a + b) ? null : a + b;
class StreamFailure extends Error { constructor(readonly code: "unavailable" | "output-limit") { super(code); } }
/** Bound awaiting the transport independently of whether a custom reader honors AbortSignal. */
function untilAborted<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
    pending.then(value => { signal.removeEventListener("abort", abort); resolve(value); }, error => { signal.removeEventListener("abort", abort); reject(error); });
  });
}
function privateAddress(hostname: string): boolean {
  const address = hostname.replace(/^\[|\]$/g, "");
  if (address === "localhost" || address === "::1") return true;
  if (isIP(address) === 6) return /^f[cd][0-9a-f]{2}:/i.test(address);
  if (isIP(address) !== 4) return false;
  const [first, second] = address.split(".").map(Number);
  return first === 127 || first === 10 || first === 172 && second! >= 16 && second! <= 31 || first === 192 && second === 168;
}
function endpoint(config: ChronistHttpProviderConfig, model: string): URL {
  const base = new URL(config.baseUrl);
  if (base.username || base.password || base.search || base.hash || !["http:", "https:"].includes(base.protocol)) throw new Error("Ungültige Chronist-Anbieteradresse.");
  // Explicit private numeric endpoints may serve HausKI. DNS aliases cannot establish
  // a private boundary; only localhost is normalized before dispatch, without resolution.
  const privateTarget = privateAddress(base.hostname);
  if (config.location === "lokal" && !privateTarget || !privateTarget && base.protocol !== "https:") throw new Error("Chronist-Anbieteradresse passt nicht zum Standort.");
  if (base.hostname === "localhost") base.hostname = "127.0.0.1";
  const suffix: Record<ChronistHttpProfile, string> = { "ollama-chat-1": "api/chat", "openai-responses-1": "responses",
    "openai-chat-1": "chat/completions", "anthropic-messages-1": "messages", "google-generate-1": `models/${encodeURIComponent(model)}:streamGenerateContent` };
  base.pathname = `${base.pathname.replace(/\/$/, "")}/${suffix[config.profileId]}`;
  if (config.profileId === "google-generate-1") base.search = "?alt=sse";
  return base;
}
export interface ChronistHttpResponseOptions {
  readonly profileId: ChronistHttpProfile;
  readonly maxOutputChars: number;
  readonly signal: AbortSignal;
  readonly pricing: ChronistProviderDescription["pricing"];
  /** performance.now() at the beginning of the actual request, including time before headers. */
  readonly startedAt: number;
  readonly inputChars: number;
}
/** Decode an already dispatched response. This owns no request, address, credentials or permit;
 * callers supply the measured input and retain ownership of their request AbortController. */
export async function decodeChronistHttpResponse(response: Response, options: ChronistHttpResponseOptions): Promise<ChronistCallOutcome> {
  const { profileId, maxOutputChars, signal, pricing, startedAt, inputChars } = options;
  const remainingMs = Math.max(0, HARD_TIMEOUT_MS - Math.max(0, Math.ceil(performance.now() - startedAt)));
  const stop = AbortSignal.any([signal, AbortSignal.timeout(remainingMs)]);
  const stopCode = () => record(stop.reason).name === "TimeoutError" ? "timeout" as const : "cancelled" as const;
  let finished = false, text = "", inputTokens: number | null = null, outputTokens: number | null = null;
  let usageValid = true, finalUsageSeen = false, chatTextFinished = false;
  let anthropicInput: number | null = null, anthropicCacheWrite = 0, anthropicCacheRead = 0;
  const usage = (complete: boolean): ChronistUsageEvidence => {
    const tokensComplete = complete && finished && usageValid && finalUsageSeen && inputTokens !== null && outputTokens !== null;
    const price = pricing;
    const calculated = price && inputTokens !== null && outputTokens !== null
      ? (BigInt(inputTokens) * BigInt(price.inputMicrosPerMillion) + BigInt(outputTokens) * BigInt(price.outputMicrosPerMillion) + 999_999n) / 1_000_000n : null;
    const costMicros = calculated !== null && calculated <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(calculated) : null;
    return { inputChars: inputChars, outputChars: text.length, outputComplete: complete,
      inputTokens, outputTokens, tokensComplete, durationMs: Math.max(0, Math.ceil(performance.now() - startedAt)),
      costMicros, currency: costMicros !== null ? price!.currency : null, costKind: costMicros === null ? "unknown" : "estimated", costComplete: tokensComplete && costMicros !== null };
  };
  const failed = (code: "unavailable" | "timeout" | "cancelled" | "output-limit"): ChronistCallOutcome => ({ kind: "failed", code,
    mayHaveExecuted: true, usage: usage(false) });
  const append = (chunk: unknown) => {
    if (typeof chunk !== "string") throw new StreamFailure("unavailable");
    const remaining = maxOutputChars - text.length;
    if (chunk.length > remaining) {
      let end = remaining;
      if (end > 0 && end < chunk.length && /[\uD800-\uDBFF]/.test(chunk[end - 1]!) && /[\uDC00-\uDFFF]/.test(chunk[end]!)) end--;
      text += chunk.slice(0, end); throw new StreamFailure("output-limit");
    }
    text += chunk;
  };
  const setTokens = (a: unknown, b: unknown) => {
    const nextIn = count(a), nextOut = count(b);
    if (a !== undefined && a !== null && nextIn === null || b !== undefined && b !== null && nextOut === null
      || nextIn !== null && inputTokens !== null && nextIn < inputTokens || nextOut !== null && outputTokens !== null && nextOut < outputTokens) usageValid = false;
    if (nextIn !== null) inputTokens = Math.max(inputTokens ?? 0, nextIn);
    if (nextOut !== null) outputTokens = Math.max(outputTokens ?? 0, nextOut);
  };
  const measuredCount = (value: unknown): number | null => {
    const result = count(value);
    if (value !== undefined && value !== null && result === null) usageValid = false;
    return result;
  };
  const sum = (a: number | null, b: number | null): number | null => {
    const result = plus(a, b); if (a !== null && b !== null && result === null) usageValid = false; return result;
  };
  const frame = (raw: string) => {
    if (finished) throw new StreamFailure("unavailable");
    if (raw === "[DONE]") {
      if (profileId !== "openai-chat-1") throw new StreamFailure("unavailable");
      finished = true; return;
    }
    const value = record(JSON.parse(raw));
    if (value.error || value.type === "error") throw new StreamFailure("unavailable");
    switch (profileId) {
      case "ollama-chat-1": {
        const message = record(value.message);
        setTokens(value.prompt_eval_count, value.eval_count);
        if (Array.isArray(message.tool_calls) && message.tool_calls.length) throw new StreamFailure("unavailable");
        if (message.content !== undefined) append(message.content);
        if (value.done === true) { finished = true; finalUsageSeen = count(value.prompt_eval_count) !== null && count(value.eval_count) !== null; }
        break;
      }
      case "openai-responses-1": {
        const response = record(value.response), measured = record(response.usage);
        setTokens(measured.input_tokens, measured.output_tokens);
        const outputs = Array.isArray(response.output) ? response.output : [];
        if ([value.type, record(value.item).type, ...outputs.map(item => record(item).type)]
          .some(type => typeof type === "string" && /(?:call|tool|mcp)/.test(type))) throw new StreamFailure("unavailable");
        if (value.type === "response.output_text.delta" || value.type === "response.refusal.delta") append(value.delta);
        if (["response.completed", "response.incomplete", "response.failed"].includes(value.type)) {
          finished = true; finalUsageSeen = count(measured.input_tokens) !== null && count(measured.output_tokens) !== null;
          if (value.type === "response.failed") throw new StreamFailure("unavailable");
        }
        break;
      }
      case "openai-chat-1": {
        const measured = record(value.usage);
        setTokens(measured.prompt_tokens, measured.completion_tokens);
        if (count(measured.prompt_tokens) !== null && count(measured.completion_tokens) !== null) finalUsageSeen = true;
        const choices = Array.isArray(value.choices) ? value.choices : [];
        if (choices.length > 1) throw new StreamFailure("unavailable");
        const choice = record(choices[0]), delta = record(choice.delta);
        if (delta.tool_calls || delta.function_call || ["tool_calls", "function_call"].includes(choice.finish_reason)
          || chatTextFinished && choices.length > 0) throw new StreamFailure("unavailable");
        if (delta.content !== undefined && delta.content !== null) append(delta.content);
        if (typeof choice.finish_reason === "string") chatTextFinished = true;
        break;
      }
      case "anthropic-messages-1": {
        const delta = record(value.delta);
        const measured = value.type === "message_start" ? record(record(value.message).usage) : record(value.usage);
        const incoming = measuredCount(measured.input_tokens), cacheWrite = measuredCount(measured.cache_creation_input_tokens), cacheRead = measuredCount(measured.cache_read_input_tokens);
        if (incoming !== null) { if (anthropicInput !== null && incoming < anthropicInput) usageValid = false; anthropicInput = Math.max(anthropicInput ?? 0, incoming); }
        if (cacheWrite !== null) { if (cacheWrite < anthropicCacheWrite) usageValid = false; anthropicCacheWrite = Math.max(anthropicCacheWrite, cacheWrite); }
        if (cacheRead !== null) { if (cacheRead < anthropicCacheRead) usageValid = false; anthropicCacheRead = Math.max(anthropicCacheRead, cacheRead); }
        setTokens(sum(sum(anthropicInput, anthropicCacheWrite), anthropicCacheRead), measured.output_tokens);
        if (value.type === "message_delta" && count(measured.output_tokens) !== null) finalUsageSeen = true;
        if (/tool/.test(String(record(value.content_block).type)) || delta.type === "input_json_delta" || delta.stop_reason === "tool_use") throw new StreamFailure("unavailable");
        if (value.type === "content_block_delta" && delta.type === "text_delta") append(delta.text);
        if (value.type === "message_stop") finished = true;
        break;
      }
      case "google-generate-1": {
        const measured = record(value.usageMetadata), incoming = measuredCount(measured.promptTokenCount), total = measuredCount(measured.totalTokenCount);
        const candidatesCount = measuredCount(measured.candidatesTokenCount), thoughts = measuredCount(measured.thoughtsTokenCount);
        const generated = incoming !== null && total !== null && total >= incoming ? total - incoming : sum(candidatesCount, thoughts ?? 0);
        if (incoming !== null && total !== null && total < incoming) usageValid = false;
        setTokens(incoming, generated);
        const candidates = Array.isArray(value.candidates) ? value.candidates : [];
        if (candidates.length > 1) throw new StreamFailure("unavailable");
        const candidate = record(candidates[0]), parts = record(candidate.content).parts;
        if (Array.isArray(parts)) for (const part of parts) {
          if (record(part).functionCall) throw new StreamFailure("unavailable");
          if (record(part).text !== undefined && record(part).thought !== true) append(record(part).text);
        }
        if (typeof candidate.finishReason === "string") { finished = true; finalUsageSeen = incoming !== null && generated !== null; }
        break;
      }
    }
  };
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    if (stop.aborted) return failed(stopCode());
    if (remainingMs === 0) return failed("timeout");
    const mime = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (!response.ok || !response.body || mime !== (profileId === "ollama-chat-1" ? "application/x-ndjson" : "text/event-stream")) return failed("unavailable");
    reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let pending = "", data: string[] = [], dataChars = 0, bytes = 0, frames = 0;
    const emit = (raw: string) => { if (raw) { if (++frames > MAX_FRAMES || raw.length > MAX_FRAME_CHARS) throw new StreamFailure("output-limit"); frame(raw); } };
    const line = (raw: string) => {
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (profileId === "ollama-chat-1") { emit(raw); return; }
      if (!raw) { if (data.length) { emit(data.join("\n")); data = []; dataChars = 0; } }
      else if (raw.startsWith("data:")) { const value = raw.slice(5).replace(/^ /, ""); dataChars += value.length + (data.length ? 1 : 0); data.push(value); }
      if (dataChars > MAX_FRAME_CHARS) throw new StreamFailure("output-limit");
    };
    for (;;) {
      const chunk = await untilAborted(reader.read(), stop);
      if (chunk.done) { pending += decoder.decode(); break; }
      bytes += chunk.value.byteLength; if (bytes > MAX_TRANSPORT_BYTES) throw new StreamFailure("output-limit");
      pending += decoder.decode(chunk.value, { stream: true });
      let boundary: number;
      while ((boundary = pending.indexOf("\n")) >= 0) { line(pending.slice(0, boundary)); pending = pending.slice(boundary + 1); }
      if (pending.length > MAX_FRAME_CHARS) throw new StreamFailure("output-limit");
    }
    // SSE events require their empty separator; EOF must not fabricate a terminal event.
    if (pending || data.length) throw new StreamFailure("unavailable");
    if (!finished) return failed("unavailable");
    return { kind: "returned", reply: { text }, usage: usage(true) };
  } catch (error) {
    if (stop.aborted) return failed(stopCode());
    return failed(error instanceof StreamFailure ? error.code : "unavailable");
  } finally {
    // A stuck cancellation acknowledgement must not retain the adapter's call slot.
    try { void (reader ? reader.cancel() : response.body?.cancel())?.catch(() => {}); }
    catch { /* No transport details in persisted evidence. */ }
  }
}

/** Configuration comes from the host's explicit registry, never from an HTTP request. */
export function createChronistHttpBinding(input: ChronistHttpProviderConfig, model: string,
  dependencies: ChronistHttpDependencies = {}): ChronistProviderBinding {
  const config = structuredClone(input);
  if (!isChronistHttpProfile(config.profileId) || !config.id || !config.label || !config.models.includes(model)
    || !["lokal", "fremd"].includes(config.location) || !model || model.length > 256 || /[\u0000-\u001f]/.test(model)) throw new Error("Unbekanntes Chronist-Anbieterprofil.");
  if (config.pricing && (!/^[A-Z]{3}$/.test(config.pricing.currency) || count(config.pricing.inputMicrosPerMillion) === null
    || count(config.pricing.outputMicrosPerMillion) === null || !config.pricing.asOf)) throw new Error("Ungültiger Chronist-Anbietertarif.");
  const target = endpoint(config, model), invokeFetch = dependencies.fetch ?? fetch;
  const requiresKey = ["openai-responses-1", "anthropic-messages-1", "google-generate-1"].includes(config.profileId);
  const available = config.available !== false && (!requiresKey || !!config.apiKey);
  const description: ChronistProviderDescription = { id: config.id, label: config.label, location: config.location, transport: "http",
    available, availabilityCode: available ? null : requiresKey && !config.apiKey ? "key-not-configured" : "provider-not-configured",
    models: [...config.models], pricing: config.pricing ?? null };
  const fingerprint = canonicalHash({ profileVersion: "chronist-http-1", id: config.id, label: config.label, profileId: config.profileId,
    location: config.location, endpoint: target.href, model, pricing: description.pricing });
  return { description, fingerprint, profileId: config.profileId,
    prepare: (plan, snapshot, attempt, parents) => renderChronistUnit(config.profileId, model, fingerprint, plan, snapshot, attempt, parents),
    bind: consumePermit => async (inputUnit, permit, signal): Promise<ChronistCallOutcome> => {
      const started = performance.now(), deadline = AbortSignal.timeout(HARD_TIMEOUT_MS), cleanup = new AbortController();
      const stop = AbortSignal.any([signal, deadline, cleanup.signal]);
      const stopCode = () => record(stop.reason).name === "TimeoutError" ? "timeout" as const : "cancelled" as const;
      const unit = parseChronistModelUnit(structuredClone(inputUnit)), body = unit.dispatch.wireText;
      let sent = false;
      const failed = (code: "unavailable" | "timeout" | "cancelled" | "output-limit"): ChronistCallOutcome => ({ kind: "failed", code,
        mayHaveExecuted: sent, usage: { inputChars: body.length, outputChars: 0, outputComplete: !sent,
          inputTokens: null, outputTokens: null, tokensComplete: false, durationMs: Math.max(0, Math.ceil(performance.now() - started)),
          costMicros: null, currency: null, costKind: "unknown", costComplete: false } });
      try {
        if (!available || unit.dispatch.profileId !== config.profileId || unit.dispatch.model !== model
          || permit.requestHash !== unit.dispatch.requestHash) return failed("unavailable");
        if (stop.aborted) return failed(stopCode());
        // The server compares the full unit against its immutable recorded dispatch in this CAS.
        if (!await untilAborted(consumePermit(permit, unit), stop)) return failed("cancelled");
        if (stop.aborted) return failed(stopCode());
        const headers: Record<string, string> = { "Content-Type": "application/json", Accept: config.profileId === "ollama-chat-1" ? "application/x-ndjson" : "text/event-stream" };
        if (config.apiKey) {
          if (config.profileId === "anthropic-messages-1") headers["x-api-key"] = config.apiKey;
          else if (config.profileId === "google-generate-1") headers["x-goog-api-key"] = config.apiKey;
          else headers.Authorization = `Bearer ${config.apiKey}`;
        }
        if (config.profileId === "anthropic-messages-1") headers["anthropic-version"] = "2023-06-01";
        sent = true;
        const response = await untilAborted(invokeFetch(target, { method: "POST", headers, body, redirect: "manual", signal: stop }), stop);
        return await decodeChronistHttpResponse(response, { profileId: config.profileId, maxOutputChars: unit.dispatch.maxOutputChars,
          signal: stop, pricing: description.pricing, startedAt: started, inputChars: body.length });
      } catch (error) {
        if (stop.aborted) return failed(stopCode());
        return failed(error instanceof StreamFailure ? error.code : "unavailable");
      } finally { cleanup.abort(); }
    },
  };
}
