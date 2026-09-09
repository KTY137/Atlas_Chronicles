// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import assert from "node:assert/strict";
import { createServer, type IncomingHttpHeaders, type ServerResponse } from "node:http";
import { setImmediate as turn, setTimeout as delay } from "node:timers/promises";
import { it, type TestContext } from "vitest";
import { canonicalHash } from "@chronicle/core";
import { CHRONIST_DEFAULT_BUDGET, CHRONIST_HTTP_PROFILES, canonicalChronistSources, deriveChronistFacts,
  makeChronistSourceSnapshot, parseChronistCallOutcome, planChronistUnits,
  type ChronistCallOutcome, type ChronistHttpProfile, type ChronistSnapshot } from "@chronicle/chronist";
import { CHRONIST_HTTP_KEY_REQUIRED, createChronistHttpBinding, decodeChronistHttpResponse, type ChronistHttpDependencies, type ChronistHttpProviderConfig } from "../src/chronist-providers/http.ts";

const model = "fixture-model", answer = '{"schemaVersion":1,"candidates":[]}', key = "fixture-key-never-real";
const pricing = { currency: "USD", inputMicrosPerMillion: 1_000_000, outputMicrosPerMillion: 2_000_000, asOf: "2026-09-08" };
const sse = (value: unknown) => `data: ${typeof value === "string" ? value : JSON.stringify(value)}\n\n`;
const ndjson = (value: unknown) => `${JSON.stringify(value)}\n`;
function snapshot(): ChronistSnapshot {
  const block = { kind: "absatz" as const, inhalt: [{ text: "Die Gruppe erreichte den verlassenen Hafen. 🧭", marks: [] }] };
  const sources = canonicalChronistSources([makeChronistSourceSnapshot({ entryId: "entry.http", passageId: "passage.http",
    revisionId: "revision.http", contentHash: canonicalHash(block) }, "Hafennotiz", block)]);
  return { schemaVersion: 1, graphVersion: "chronist-1", runId: "run.http", mode: "prosa", sessionId: null,
    scopeHash: "a".repeat(64), sources, facts: deriveChronistFacts(sources), budget: { ...CHRONIST_DEFAULT_BUDGET } };
}
interface Request { readonly url: string; readonly method: string; readonly headers: IncomingHttpHeaders; readonly body: string }
async function host(t: TestContext, handle: (res: ServerResponse, request: Request) => void | Promise<void>) {
  const requests: Request[] = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const request = { url: req.url!, method: req.method!, headers: req.headers, body: Buffer.concat(chunks).toString("utf8") };
    requests.push(request);
    try { await handle(res, request); } catch { res.destroy(); }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  t.onTestFinished(() => new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); }));
  const address = server.address(); assert(address && typeof address !== "string");
  return { baseUrl: `http://127.0.0.1:${address.port}/v1`, requests };
}
function setup(baseUrl: string, profileId: ChronistHttpProfile = "ollama-chat-1", maxOutputChars = 1000,
  dependencies: ChronistHttpDependencies = {}) {
  const config: ChronistHttpProviderConfig = { id: "fixture-provider", label: "Fixture", profileId,
    location: "lokal", baseUrl, models: [model], apiKey: key, pricing };
  const binding = createChronistHttpBinding(config, model, dependencies), source = snapshot();
  const unit = binding.prepare({ ...planChronistUnits(source)[0]!, maxOutputChars }, source, 2, []);
  const permit = { callId: "call.http", fence: 1, requestHash: unit.dispatch.requestHash };
  return { binding, unit, permit, config };
}
function failed(outcome: ChronistCallOutcome, code: "unavailable" | "cancelled" | "timeout" | "output-limit", chars: number,
  sent = true): asserts outcome is Extract<ChronistCallOutcome, { kind: "failed" }> {
  parseChronistCallOutcome(outcome);
  assert.equal(outcome.kind, "failed");
  if (outcome.kind !== "failed") return;
  assert.equal(outcome.code, code); assert.equal(outcome.mayHaveExecuted, sent);
  assert.equal(outcome.usage.outputChars, chars); assert.equal(outcome.usage.outputComplete, !sent);
  assert.equal(outcome.usage.tokensComplete, false); assert.equal(outcome.usage.costComplete, false);
  assert(!JSON.stringify(outcome).includes(key));
}
// Both Anthropic profiles share one wire protocol; profile 2 only disables thinking in the request.
const anthropicFrames: readonly unknown[] = [{ type: "message_start", message: { usage: { input_tokens: 5, cache_creation_input_tokens: 2, cache_read_input_tokens: 3, output_tokens: 1 } } },
  { type: "content_block_delta", delta: { type: "text_delta", text: answer } }, { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 6 } }, { type: "message_stop" }];
const profileFrames: Record<ChronistHttpProfile, readonly unknown[]> = {
  "ollama-chat-1": [{ message: { content: answer }, done: false }, { message: { content: "" }, done: true, prompt_eval_count: 10, eval_count: 6 }],
  "openai-responses-1": [{ type: "response.output_text.delta", delta: answer }, { type: "response.completed", response: { status: "completed", usage: { input_tokens: 10, output_tokens: 6 } } }],
  "openai-chat-1": [{ choices: [{ delta: { content: answer }, finish_reason: null }] }, { choices: [{ delta: {}, finish_reason: "stop" }] },
    { choices: [], usage: { prompt_tokens: 10, completion_tokens: 6 } }, "[DONE]"],
  "anthropic-messages-1": anthropicFrames, "anthropic-messages-2": anthropicFrames,
  "google-generate-1": [{ candidates: [{ content: { parts: [{ text: "internal", thought: true }, { text: answer }] } }] },
    { candidates: [{ finishReason: "STOP" }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4, thoughtsTokenCount: 2, totalTokenCount: 16 } }],
};
function wire(profileId: ChronistHttpProfile, frames: readonly unknown[] = profileFrames[profileId]) {
  return frames.map(profileId === "ollama-chat-1" ? ndjson : sse).join("");
}
function contentType(profileId: ChronistHttpProfile) { return profileId === "ollama-chat-1" ? "application/x-ndjson" : "text/event-stream"; }

for (const profileId of CHRONIST_HTTP_PROFILES) it(`${profileId}: real HTTP sends only the consumed complete durable dispatch and counts usage`, async t => {
  let consumed = false;
  const server = await host(t, (res) => { assert(consumed); res.writeHead(200, { "content-type": `${contentType(profileId)}; charset=utf-8` }); res.end(wire(profileId)); });
  const { binding, unit, permit } = setup(server.baseUrl, profileId);
  assert.equal(server.requests.length, 0, "prepare must stay pure");
  const durable = structuredClone(unit);
  const invoke = binding.bind(async (actualPermit, actualUnit) => {
    assert.deepEqual(actualPermit, permit); assert.deepEqual(actualUnit, durable);
    assert.equal(server.requests.length, consumed ? 1 : 0);
    if (consumed) return false;
    consumed = true; return true;
  });
  const result = await invoke(unit, permit, new AbortController().signal);
  parseChronistCallOutcome(result); assert.equal(result.kind, "returned");
  if (result.kind !== "returned") return;
  assert.equal(result.reply.text, answer); assert.equal(result.usage.inputChars, durable.dispatch.wireText.length);
  assert.equal(result.usage.outputChars, answer.length); assert.equal(result.usage.outputComplete, true);
  assert.equal(result.usage.inputTokens, 10); assert.equal(result.usage.outputTokens, 6); assert.equal(result.usage.tokensComplete, true);
  assert.equal(result.usage.costMicros, 22); assert.equal(result.usage.currency, "USD"); assert.equal(result.usage.costKind, "estimated"); assert.equal(result.usage.costComplete, true);
  const request = server.requests[0]!;
  assert.equal(request.body, durable.dispatch.wireText); assert.deepEqual(JSON.parse(request.body).tools, []);
  assert(request.body.includes("vorherige Antwort")); assert(!request.body.includes(key)); assert(!request.body.includes(permit.callId));
  assert.equal(request.method, "POST"); assert.equal(request.headers.accept, contentType(profileId));
  const paths: Record<ChronistHttpProfile, string> = { "ollama-chat-1": "/v1/api/chat", "openai-responses-1": "/v1/responses", "openai-chat-1": "/v1/chat/completions",
    "anthropic-messages-1": "/v1/messages", "anthropic-messages-2": "/v1/messages", "google-generate-1": `/v1/models/${model}:streamGenerateContent?alt=sse` };
  assert.equal(request.url, paths[profileId]);
  const anthropic = profileId === "anthropic-messages-1" || profileId === "anthropic-messages-2";
  assert.equal(request.headers[anthropic ? "x-api-key" : profileId === "google-generate-1" ? "x-goog-api-key" : "authorization"],
    anthropic || profileId === "google-generate-1" ? key : `Bearer ${key}`);
  if (anthropic) assert.equal(request.headers["anthropic-version"], "2023-06-01");
  failed(await invoke(unit, permit, new AbortController().signal), "cancelled", 0, false);
  assert.equal(server.requests.length, 1, "the same consumed permit cannot send twice");
});

it("denied or aborted permits never reach HTTP, and full-unit tampering is visible to the CAS", async t => {
  const server = await host(t, res => { res.end(); });
  const { binding, unit, permit } = setup(server.baseUrl);
  const changed = { ...structuredClone(unit), mode: "sitzung" as const };
  let calls = 0;
  const invoke = binding.bind(async (_permit, actual) => { calls++; assert.deepEqual(actual, changed); return false; });
  failed(await invoke(changed, permit, new AbortController().signal), "cancelled", 0, false);
  assert.equal(calls, 1);
  failed(await invoke(unit, permit, AbortSignal.abort()), "cancelled", 0, false);
  assert.equal(calls, 1); assert.equal(server.requests.length, 0);
});

it("no request escapes while the permit CAS is pending or after cancellation during CAS", async t => {
  const server = await host(t, res => { res.end(); }); const { binding, unit, permit } = setup(server.baseUrl);
  const controller = new AbortController(); let release!: (allowed: boolean) => void;
  const invoke = binding.bind(() => new Promise(resolve => { release = resolve; }));
  const result = invoke(unit, permit, controller.signal);
  await turn(); assert.equal(server.requests.length, 0); controller.abort(); release(true);
  failed(await result, "cancelled", 0, false); assert.equal(server.requests.length, 0);
});

for (const status of [307, 429, 500]) it(`HTTP ${status} does not redirect or retry`, async t => {
  const redirect = await host(t, res => { res.end(); });
  const server = await host(t, res => { res.writeHead(status, { location: `${redirect.baseUrl}/capture` }); res.end(key); });
  const { binding, unit, permit } = setup(server.baseUrl);
  failed(await binding.bind(async () => true)(unit, permit, new AbortController().signal), "unavailable", 0);
  assert.equal(server.requests.length, 1); assert.equal(redirect.requests.length, 0);
});

for (const profileId of CHRONIST_HTTP_PROFILES) it(`${profileId}: post-terminal model output is rejected without releasing the unknown reservation`, async t => {
  const server = await host(t, res => { res.writeHead(200, { "content-type": contentType(profileId) }); res.end(wire(profileId, [...profileFrames[profileId], profileFrames[profileId][profileId.startsWith("anthropic-messages-") ? 1 : 0]])); });
  const { binding, unit, permit } = setup(server.baseUrl, profileId);
  const result = await binding.bind(async () => true)(unit, permit, new AbortController().signal);
  failed(result, "unavailable", answer.length); assert.equal(result.usage.inputTokens, 10); assert.equal(result.usage.outputTokens, 6);
});

it("a MIME mismatch is rejected before model text is parsed", async t => {
  const server = await host(t, res => { res.writeHead(200, { "content-type": "text/html" }); res.end(wire("ollama-chat-1")); });
  const { binding, unit, permit } = setup(server.baseUrl);
  failed(await binding.bind(async () => true)(unit, permit, new AbortController().signal), "unavailable", 0);
});

for (const reason of ["cancelled", "timeout"] as const) it(`${reason} preserves text and cumulative tokens from a real partial stream`, { timeout: 5000 }, async t => {
  const controller = new AbortController();
  const server = await host(t, async res => {
    res.writeHead(200, { "content-type": "application/x-ndjson" });
    res.write(ndjson({ message: { content: "Teiltext 🧭" }, done: false, prompt_eval_count: 10, eval_count: 3 }));
    await delay(50); controller.abort(reason === "timeout" ? new DOMException("fixture deadline", "TimeoutError") : undefined);
  });
  const { binding, unit, permit } = setup(server.baseUrl);
  const result = await binding.bind(async () => true)(unit, permit, controller.signal);
  failed(result, reason, "Teiltext 🧭".length); assert.equal(result.usage.inputTokens, 10); assert.equal(result.usage.outputTokens, 3); assert.equal(result.usage.costMicros, 16);
});

it("output overflow preserves same-frame usage and never splits a surrogate pair", async t => {
  const server = await host(t, res => { res.writeHead(200, { "content-type": "application/x-ndjson" });
    res.end(ndjson({ message: { content: "abc🧭more" }, done: true, prompt_eval_count: 10, eval_count: 6 })); });
  const { binding, unit, permit } = setup(server.baseUrl, "ollama-chat-1", 4);
  const result = await binding.bind(async () => true)(unit, permit, new AbortController().signal);
  failed(result, "output-limit", 3); assert.equal(result.usage.inputTokens, 10); assert.equal(result.usage.outputTokens, 6); assert.equal(result.usage.costMicros, 22);
});

it("valid multibyte UTF-8 split across transport chunks is decoded losslessly", async t => {
  const reply = "Die Fähre 🧭", bytes = Buffer.from(ndjson({ message: { content: reply }, done: true, prompt_eval_count: 2, eval_count: 4 }));
  const server = await host(t, async res => { res.writeHead(200, { "content-type": "application/x-ndjson" });
    for (const byte of bytes) { res.write(Buffer.from([byte])); await turn(); } res.end(); });
  const { binding, unit, permit } = setup(server.baseUrl);
  const result = await binding.bind(async () => true)(unit, permit, new AbortController().signal);
  assert.equal(result.kind, "returned"); if (result.kind === "returned") assert.equal(result.reply.text, reply);
});

for (const broken of ["utf8", "json", "sse-eof", "missing-terminal", "terminal-then-broken"] as const) it(`broken stream ${broken} cannot claim completeness`, async t => {
  const profileId = broken === "sse-eof" ? "openai-chat-1" : "ollama-chat-1";
  const server = await host(t, res => {
    res.writeHead(200, { "content-type": contentType(profileId) });
    if (broken === "sse-eof") { res.end(sse({ choices: [{ delta: { content: "ok" } }] }) + "data: [DONE]"); return; }
    res.write(ndjson({ message: { content: "ok" }, done: broken === "terminal-then-broken", prompt_eval_count: 3, eval_count: 1 }));
    if (broken === "utf8") res.end(Buffer.from([0xc3]));
    else if (broken === "json" || broken === "terminal-then-broken") res.end("{broken}\n");
    else res.end();
  });
  const { binding, unit, permit } = setup(server.baseUrl, profileId);
  failed(await binding.bind(async () => true)(unit, permit, new AbortController().signal), "unavailable", 2);
});

for (const limit of ["frame", "frames", "bytes"] as const) it(`transport ${limit} has a hard bound without model output`, async t => {
  const server = await host(t, res => { res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(limit === "frame" ? `data: ${"x".repeat(256 * 1024 + 1)}` : limit === "frames" ? sse({}).repeat(10_001) : `: ${"x".repeat(1000)}\n\n`.repeat(2100)); });
  const { binding, unit, permit } = setup(server.baseUrl, "openai-chat-1");
  failed(await binding.bind(async () => true)(unit, permit, new AbortController().signal), "output-limit", 0);
});

const anthropicTool = { type: "content_block_start", content_block: { type: "server_tool_use", name: "web_search", input: {} } };
const toolFrames: Record<ChronistHttpProfile, unknown> = {
  "ollama-chat-1": { message: { tool_calls: [{ function: { name: "fetch", arguments: { url: "http://127.0.0.1" } } }] }, done: true },
  "openai-responses-1": { type: "response.output_item.added", item: { type: "function_call", name: "fetch", arguments: "{}" } },
  "openai-chat-1": { choices: [{ delta: { tool_calls: [{ function: { name: "fetch", arguments: "{}" } }] } }] },
  "anthropic-messages-1": anthropicTool, "anthropic-messages-2": anthropicTool,
  "google-generate-1": { candidates: [{ content: { parts: [{ functionCall: { name: "fetch", args: {} } }] }, finishReason: "STOP" }] },
};
for (const profileId of CHRONIST_HTTP_PROFILES) it(`${profileId}: tool output cannot become a successful text response or a second request`, async t => {
  const server = await host(t, res => { res.writeHead(200, { "content-type": contentType(profileId) }); res.end(wire(profileId, [toolFrames[profileId], ...profileFrames[profileId]])); });
  const { binding, unit, permit } = setup(server.baseUrl, profileId);
  failed(await binding.bind(async () => true)(unit, permit, new AbortController().signal), "unavailable", 0);
  assert.equal(server.requests.length, 1);
});

it("malformed final token counts retain earlier evidence but cannot claim complete token or cost accounting", async t => {
  const server = await host(t, res => { res.writeHead(200, { "content-type": "application/x-ndjson" });
    res.end(ndjson({ message: { content: "ok" }, done: false, prompt_eval_count: 3, eval_count: 1 })
      + ndjson({ message: { content: "" }, done: true, prompt_eval_count: -1, eval_count: "oops" })); });
  const { binding, unit, permit } = setup(server.baseUrl);
  const result = await binding.bind(async () => true)(unit, permit, new AbortController().signal);
  assert.equal(result.kind, "returned"); assert.equal(result.usage.inputTokens, 3); assert.equal(result.usage.outputTokens, 1);
  assert.equal(result.usage.tokensComplete, false); assert.equal(result.usage.costComplete, false);
});

it("Google output usage includes thought tokens when the optional total is absent", async t => {
  const server = await host(t, res => { res.writeHead(200, { "content-type": "text/event-stream" }); res.end(sse({ candidates: [{ content: { parts: [{ text: "ok" }] }, finishReason: "STOP" }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4, thoughtsTokenCount: 2 } })); });
  const { binding, unit, permit } = setup(server.baseUrl, "google-generate-1");
  const result = await binding.bind(async () => true)(unit, permit, new AbortController().signal);
  assert.equal(result.kind, "returned"); assert.equal(result.usage.outputTokens, 6); assert.equal(result.usage.costMicros, 22);
});

it("reader cancellation cannot hold the adapter open indefinitely", { timeout: 3000 }, async () => {
  let cancelled = 0; const controller = new AbortController();
  const body = new ReadableStream<Uint8Array>({ start(stream) { stream.enqueue(Buffer.from(ndjson({ message: { content: "ok" }, done: false, prompt_eval_count: 3, eval_count: 1 }))); },
    cancel() { cancelled++; return new Promise(() => {}); } });
  const { binding, unit, permit } = setup("http://127.0.0.1:9", "ollama-chat-1", 1000, { fetch: async () => new Response(body, { headers: { "content-type": "application/x-ndjson" } }) });
  const pending = binding.bind(async () => true)(unit, permit, controller.signal);
  await delay(25); controller.abort();
  const result = await Promise.race([pending, delay(300).then(() => "hung" as const)]);
  assert.notEqual(result, "hung"); if (result !== "hung") failed(result, "cancelled", 2); assert.equal(cancelled, 1);
});

it("provider addresses and tariff metadata are validated without network access", () => {
  const { config } = setup("http://127.0.0.1:9");
  for (const baseUrl of ["https://example.invalid", "file:///tmp/provider", "http://user:pass@127.0.0.1", "http://127.0.0.1?secret=value"]) {
    assert.throws(() => createChronistHttpBinding({ ...config, baseUrl }, model));
  }
  assert.throws(() => createChronistHttpBinding({ ...config, location: "fremd", baseUrl: "http://example.invalid" }, model));
  for (const badPrice of [{ ...pricing, currency: "usd" }, { ...pricing, inputMicrosPerMillion: -1 }]) {
    assert.throws(() => createChronistHttpBinding({ ...config, pricing: badPrice }, model));
  }
});

it("explicit literal private HausKI endpoints are accepted, while private DNS aliases and adjacent public ranges are refused", () => {
  const { config } = setup("http://127.0.0.1:9");
  for (const address of ["127.0.0.2", "10.0.0.1", "172.16.0.1", "172.31.255.254", "192.168.1.1", "[::1]", "[fc00::1]", "[fdff::1]", "localhost"]) {
    assert.equal(createChronistHttpBinding({ ...config, baseUrl: `http://${address}:11434` }, model).description.location, "lokal");
  }
  for (const address of ["hauski.local", "172.15.255.254", "172.32.0.1", "192.169.1.1", "[fe80::1]", "[fbff::1]", "[2001:db8::1]"]) {
    assert.throws(() => createChronistHttpBinding({ ...config, baseUrl: `https://${address}` }, model));
  }
  assert.equal(createChronistHttpBinding({ ...config, location: "fremd", baseUrl: "https://example.invalid" }, model).description.location, "fremd");
});

it("a chat finish reason closes text before the subsequent usage and DONE frames", async t => {
  const server = await host(t, res => { res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(wire("openai-chat-1", [profileFrames["openai-chat-1"][0], profileFrames["openai-chat-1"][1], profileFrames["openai-chat-1"][0], ...profileFrames["openai-chat-1"].slice(2)])); });
  const { binding, unit, permit } = setup(server.baseUrl, "openai-chat-1");
  failed(await binding.bind(async () => true)(unit, permit, new AbortController().signal), "unavailable", answer.length);
});

it("Anthropic partial input updates retain previously reported cache input tokens", async t => {
  const server = await host(t, res => { res.writeHead(200, { "content-type": "text/event-stream" });
    res.end(wire("anthropic-messages-1", [profileFrames["anthropic-messages-1"][0], profileFrames["anthropic-messages-1"][1],
      { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { input_tokens: 6, cache_creation_input_tokens: null, cache_read_input_tokens: null, output_tokens: 6 } }, { type: "message_stop" }])); });
  const { binding, unit, permit } = setup(server.baseUrl, "anthropic-messages-1");
  const result = await binding.bind(async () => true)(unit, permit, new AbortController().signal);
  assert.equal(result.kind, "returned"); assert.equal(result.usage.inputTokens, 11); assert.equal(result.usage.costMicros, 23); assert.equal(result.usage.tokensComplete, true);
});

it("missing final usage stays unknown even after a valid output terminal", async t => {
  const server = await host(t, res => { res.writeHead(200, { "content-type": "application/x-ndjson" });
    res.end(ndjson({ message: { content: "ok" }, done: false, prompt_eval_count: 3, eval_count: 1 }) + ndjson({ message: { content: "" }, done: true })); });
  const { binding, unit, permit } = setup(server.baseUrl);
  const result = await binding.bind(async () => true)(unit, permit, new AbortController().signal);
  assert.equal(result.kind, "returned"); assert.equal(result.usage.outputComplete, true); assert.equal(result.usage.inputTokens, 3);
  assert.equal(result.usage.outputTokens, 1); assert.equal(result.usage.tokensComplete, false); assert.equal(result.usage.costComplete, false);
});

it("SSE CRLF framing works when each CR and LF arrives in separate writes", async t => {
  const bytes = Buffer.from(wire("openai-chat-1").replace(/\n/g, "\r\n"));
  const server = await host(t, async res => { res.writeHead(200, { "content-type": "text/event-stream" });
    for (const byte of bytes) { res.write(Buffer.from([byte])); await turn(); } res.end(); });
  const { binding, unit, permit } = setup(server.baseUrl, "openai-chat-1");
  const result = await binding.bind(async () => true)(unit, permit, new AbortController().signal);
  assert.equal(result.kind, "returned"); if (result.kind === "returned") assert.equal(result.reply.text, answer);
});

for (const scenario of ["missing-usage", "partial", "overflow"] as const) it(`shared decoder and HTTP binding produce the same Anthropic ${scenario} evidence`, async t => {
  const frames = scenario === "missing-usage"
    ? [profileFrames["anthropic-messages-1"][1], { type: "message_stop" }]
    : [profileFrames["anthropic-messages-1"][0], profileFrames["anthropic-messages-1"][1]];
  const server = await host(t, res => { res.writeHead(200, { "content-type": "text/event-stream" }); res.end(wire("anthropic-messages-1", frames)); });
  const cap = scenario === "overflow" ? 4 : 1000;
  const { binding, unit, permit } = setup(server.baseUrl, "anthropic-messages-1", cap);
  const wrapped = await binding.bind(async () => true)(unit, permit, new AbortController().signal);
  // The direct consumer supplies the real already-dispatched Response and input measurement;
  // it needs no model unit, provider binding, key, or synthetic fetch implementation.
  const startedAt = performance.now() - 25;
  const response = await fetch(`${server.baseUrl}/messages`, { method: "POST", body: unit.dispatch.wireText });
  const direct = await decodeChronistHttpResponse(response, { profileId: "anthropic-messages-1", maxOutputChars: cap,
    signal: new AbortController().signal, pricing, startedAt, inputChars: unit.dispatch.wireText.length });
  const comparable = (outcome: ChronistCallOutcome) => ({ ...outcome, usage: { ...outcome.usage, durationMs: 0 } });
  assert.deepEqual(comparable(direct), comparable(wrapped)); parseChronistCallOutcome(direct);
  assert(direct.usage.durationMs >= 25); assert.equal(server.requests.length, 2);
  if (scenario === "missing-usage") {
    assert.equal(direct.kind, "returned"); assert.equal(direct.usage.outputComplete, true);
    assert.equal(direct.usage.inputTokens, null); assert.equal(direct.usage.outputTokens, null);
    assert.equal(direct.usage.tokensComplete, false); assert.equal(direct.usage.costMicros, null); assert.equal(direct.usage.costComplete, false);
  } else failed(direct, scenario === "overflow" ? "output-limit" : "unavailable", scenario === "overflow" ? cap : answer.length);
});

it("shared decoder aborts a partial reader and does not await an unresponsive cancellation acknowledgement", async () => {
  const controller = new AbortController(); let cancellations = 0;
  const body = new ReadableStream<Uint8Array>({ start(stream) {
    stream.enqueue(Buffer.from(wire("anthropic-messages-1", profileFrames["anthropic-messages-1"].slice(0, 2))));
  }, cancel() { cancellations++; return new Promise(() => {}); } });
  const pending = decodeChronistHttpResponse(new Response(body, { headers: { "content-type": "text/event-stream" } }), {
    profileId: "anthropic-messages-1", maxOutputChars: 1000, signal: controller.signal, pricing, startedAt: performance.now(), inputChars: 123 });
  await delay(25); controller.abort();
  const result = await Promise.race([pending, delay(300).then(() => "hung" as const)]);
  assert.notEqual(result, "hung"); if (result !== "hung") { failed(result, "cancelled", answer.length); assert.equal(result.usage.inputChars, 123); }
  assert.equal(cancellations, 1);
});

it("shared decoder cancels an already dispatched response on a bad MIME type", async () => {
  let cancellations = 0;
  const body = new ReadableStream<Uint8Array>({ cancel() { cancellations++; return new Promise(() => {}); } });
  const result = await decodeChronistHttpResponse(new Response(body, { headers: { "content-type": "text/html" } }), {
    profileId: "anthropic-messages-1", maxOutputChars: 1000, signal: new AbortController().signal, pricing,
    startedAt: performance.now(), inputChars: 123 });
  failed(result, "unavailable", 0); assert.equal(cancellations, 1);
});

it("shared decoder keeps the original request deadline when response headers arrive after the hard limit", async () => {
  let cancellations = 0;
  const body = new ReadableStream<Uint8Array>({ start(stream) { stream.enqueue(Buffer.from(wire("anthropic-messages-1"))); },
    cancel() { cancellations++; } });
  const result = await decodeChronistHttpResponse(new Response(body, { headers: { "content-type": "text/event-stream" } }), {
    profileId: "anthropic-messages-1", maxOutputChars: 1000, signal: new AbortController().signal, pricing,
    startedAt: performance.now() - 120_001, inputChars: 123 });
  failed(result, "timeout", 0); assert.equal(cancellations, 1);
});

// A future wire profile must not slip past the key requirement in silence. The endpoint suffix
// is an exhaustive record and would refuse to compile without its entry; the key requirement was
// a plain string array, so an unlisted profile silently counted as "needs no key" and reported
// itself available without one. This pins the record and the availability it derives.
it("declares a key requirement for every HTTP wire profile and derives availability from it", async t => {
  const { baseUrl } = await host(t, res => { res.destroy(); });
  assert.deepEqual(Object.keys(CHRONIST_HTTP_KEY_REQUIRED).sort(), [...CHRONIST_HTTP_PROFILES].sort());
  assert.deepEqual(CHRONIST_HTTP_KEY_REQUIRED, { "ollama-chat-1": false, "openai-chat-1": false, "openai-responses-1": true,
    "anthropic-messages-1": true, "anthropic-messages-2": true, "google-generate-1": true });
  for (const profileId of CHRONIST_HTTP_PROFILES) {
    const ohneSchluessel: ChronistHttpProviderConfig = { id: "fixture-provider", label: "Fixture", profileId,
      location: "lokal", baseUrl, models: [model] };
    const beschreibung = createChronistHttpBinding(ohneSchluessel, model, {}).description;
    assert.equal(beschreibung.available, !CHRONIST_HTTP_KEY_REQUIRED[profileId], profileId);
    assert.equal(beschreibung.availabilityCode, CHRONIST_HTTP_KEY_REQUIRED[profileId] ? "key-not-configured" : null, profileId);
    const mitSchluessel = createChronistHttpBinding({ ...ohneSchluessel, apiKey: key }, model, {}).description;
    assert.equal(mitSchluessel.available, true, profileId);
    assert.equal(mitSchluessel.availabilityCode, null, profileId);
  }
});
