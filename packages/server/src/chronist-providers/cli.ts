// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash, randomBytes } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createReadStream } from "node:fs";
import { copyFile, lstat, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { canonicalHash, canonicalJson } from "@chronicle/core";
import { CHRONIST_CLAUDE_CLI_PROFILE, chronistValue, parseChronistModelUnit, renderChronistUnit,
  type ChronistCallOutcome, type ChronistUsageEvidence } from "@chronicle/chronist";
import type { ChronistProviderDescription } from "@chronicle/protocol";
import type { ChronistProviderBinding } from "../domain/chronist/runtime.ts";
import { decodeChronistHttpResponse, type ChronistHttpDependencies } from "./http.ts";
import { compileChronistWindowsJob, spawnChronistWindowsJob } from "./cli-windows-job.ts";

export const CHRONIST_CLAUDE_CLI_SHA256 = "f2f5d1a155167488aeb32cd263e15436253c7b1681ae147c9e73e4d6bbc3c852";
export const CHRONIST_CLAUDE_CLI_VERSION = "2.1.261";
export const CHRONIST_CLAUDE_CLI_MODELS = Object.freeze(["claude-sonnet-4-5-20250929"]);
const UPSTREAM = "https://api.anthropic.com/v1/messages", MAX_BODY_BYTES = 256 * 1024;
const MAX_STDOUT_BYTES = 2 * 1024 * 1024, MAX_STDERR_BYTES = 32 * 1024;
export interface ChronistCliProviderConfig {
  readonly id: string; readonly label: string; readonly profileId: typeof CHRONIST_CLAUDE_CLI_PROFILE;
  readonly location: "fremd"; readonly executable: string; readonly models: readonly string[];
  readonly apiKey?: string; readonly capabilityEnabled?: boolean;
  readonly pricing?: ChronistProviderDescription["pricing"];
}
export interface ChronistCliActivation {
  readonly available: boolean; readonly availabilityCode: string | null;
  readonly dispose: () => Promise<void>;
}
interface Active { readonly root: string; readonly executable: string; readonly supervisor: string; readonly supervisorHash: string; readonly configHash: string; disposed: boolean }
const activations = new WeakMap<ChronistCliActivation, Active>();
function configIdentity(config: ChronistCliProviderConfig): string {
  return canonicalHash({ id: config.id, label: config.label, profileId: config.profileId, location: config.location,
    executable: config.executable, models: [...config.models], pricing: config.pricing ?? null,
    binaryHash: CHRONIST_CLAUDE_CLI_SHA256, binaryVersion: CHRONIST_CLAUDE_CLI_VERSION,
    processProfile: "windows-job-1", transportProfile: "claude-exact-one-request-1", upstream: UPSTREAM });
}
function validate(config: ChronistCliProviderConfig, model?: string): void {
  if (config.profileId !== CHRONIST_CLAUDE_CLI_PROFILE || config.location !== "fremd"
    || !/^[a-z][a-z0-9_-]{0,63}$/.test(config.id) || !config.label || config.label.length > 128
    || !isAbsolute(config.executable) || !config.executable.toLowerCase().endsWith(".exe")
    || !config.models.length || new Set(config.models).size !== config.models.length
    || config.models.some(name => !CHRONIST_CLAUDE_CLI_MODELS.includes(name)) || model !== undefined && !config.models.includes(model)) {
    throw new Error("Unbekanntes Chronist-CLI-Profil.");
  }
}
async function sha256(path: string): Promise<string> {
  const hash = createHash("sha256"); for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
function bounded<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    promise.then(value => { signal.removeEventListener("abort", abort); resolve(value); }, error => { signal.removeEventListener("abort", abort); reject(error); });
  });
}
/** Observe only whether fixed policy sources exist, never their contents or account state. */
async function policyAbsent(directory: string): Promise<boolean> {
  for (const path of ["C:/Program Files/ClaudeCode/managed-settings.json", "C:/Program Files/ClaudeCode/managed-settings.d"]) {
    try { await lstat(path); return false; } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") return false; }
  }
  const systemRoot = process.env.SystemRoot;
  if (!systemRoot || !isAbsolute(systemRoot)) return false;
  const script = "$ErrorActionPreference='Stop'; try { foreach($hive in @([Microsoft.Win32.Registry]::LocalMachine,[Microsoft.Win32.Registry]::CurrentUser)) { $key=$hive.OpenSubKey('SOFTWARE\\Policies\\ClaudeCode'); if($null -ne $key) { $key.Dispose(); exit 3 } }; exit 0 } catch { exit 4 }";
  const child = spawn(join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), ["-NoProfile", "-NonInteractive", "-Command", script],
    { cwd: directory, shell: false, windowsHide: true, env: { SystemRoot: systemRoot, WINDIR: systemRoot, TEMP: directory, TMP: directory } });
  child.stdout.resume(); child.stderr.resume();
  const timeout = setTimeout(() => child.kill(), 5000);
  try { const [code] = await once(child, "close"); return code === 0; } catch { return false; } finally { clearTimeout(timeout); }
}
function environment(directory: string, address: string, key: string): Record<string, string> {
  const systemRoot = process.env.SystemRoot!;
  return { SystemRoot: systemRoot, WINDIR: systemRoot, PATH: join(systemRoot, "System32"),
    HOME: directory, USERPROFILE: directory, APPDATA: directory, LOCALAPPDATA: directory,
    TEMP: directory, TMP: directory, CLAUDE_CONFIG_DIR: directory,
    HTTP_PROXY: address, HTTPS_PROXY: address, ALL_PROXY: address, NO_PROXY: "127.0.0.1",
    ANTHROPIC_BASE_URL: address, ANTHROPIC_API_KEY: key,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1", DISABLE_TELEMETRY: "1", DISABLE_ERROR_REPORTING: "1", DISABLE_AUTOUPDATER: "1", DISABLE_UPDATES: "1",
    CLAUDE_CODE_MAX_RETRIES: "0", CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK: "1", DISABLE_AUTO_COMPACT: "1", DISABLE_COMPACT: "1",
    CLAUDE_CODE_ATTRIBUTION_HEADER: "0", CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING: "1", MAX_THINKING_TOKENS: "0",
    CLAUDE_CODE_DISABLE_ATTACHMENTS: "1", CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1", CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
    ENABLE_CLAUDEAI_MCP_SERVERS: "false", MAX_STRUCTURED_OUTPUT_RETRIES: "0", DISABLE_PROMPT_CACHING: "1",
    LANGSMITH_TRACING: "false", LANGSMITH_TRACING_V2: "false", LANGCHAIN_TRACING: "false", LANGCHAIN_TRACING_V2: "false" };
}
function noUsage(inputChars: number, startedAt: number): ChronistUsageEvidence {
  return { inputChars, outputChars: 0, outputComplete: true, inputTokens: null, outputTokens: null, tokensComplete: false,
    durationMs: Math.max(0, Math.ceil(performance.now() - startedAt)), costMicros: null, currency: null, costKind: "unknown", costComplete: false };
}
type Upstream = (body: string, signal: AbortSignal) => Promise<Response>;
interface Invocation { readonly maxOutputChars: number; readonly signal: AbortSignal; readonly pricing: ChronistProviderDescription["pricing"];
  readonly startedAt: number; readonly checkDispatch: () => Promise<boolean>; readonly upstream: Upstream; readonly probeMarkers?: boolean }

async function execute(active: Active, wireText: string, options: Invocation): Promise<ChronistCallOutcome> {
  const body = JSON.parse(wireText) as { model: string; max_tokens: number };
  const cleanup = new AbortController(), stop = AbortSignal.any([options.signal, cleanup.signal]);
  const directory = await mkdtemp(join(active.root, "call-"));
  const key = randomBytes(24).toString("hex");
  let child: ChildProcessWithoutNullStreams | undefined, admitted = false, sent = false, invalid = false;
  let childClosed: Promise<unknown> | undefined;
  let decoded: Promise<ChronistCallOutcome> | undefined, resultText: string | undefined, initSeen = false;
  const fail = (code: "unavailable" | "cancelled" | "timeout" | "output-limit" = "unavailable"): ChronistCallOutcome => ({
    kind: "failed", code, mayHaveExecuted: sent, usage: { ...noUsage(wireText.length, options.startedAt), outputComplete: !sent } });
  const stopCode = () => options.signal.reason?.name === "TimeoutError" ? "timeout" as const : "cancelled" as const;
  const server = createServer((request, response) => { void handle(request, response).catch(() => {
    invalid = true; response.destroy();
    if (decoded) void decoded.then(() => cleanup.abort(), () => cleanup.abort()); else cleanup.abort();
  }); });
  server.on("connect", (_request, socket) => { invalid = true; socket.end("HTTP/1.1 403 Forbidden\r\n\r\n"); cleanup.abort(); });
  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    // Set the gate synchronously before parsing or awaiting authorization. A second socket
    // can neither reuse a permit nor become a retry, compaction or discovery request.
    if (admitted || request.method !== "POST" || request.url !== "/v1/messages?beta=true" || request.headers["x-api-key"] !== key) {
      invalid = true; response.writeHead(403).end(); cleanup.abort(); return;
    }
    admitted = true;
    const chunks: Buffer[] = []; let bytes = 0;
    for await (const chunk of request) { bytes += chunk.length; if (bytes > MAX_BODY_BYTES) throw new Error(); chunks.push(chunk); }
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    if (canonicalJson(chronistValue(value)) !== wireText || stop.aborted || !await bounded(options.checkDispatch(), stop) || stop.aborted) {
      invalid = true; response.writeHead(403).end(); cleanup.abort(); return;
    }
    sent = true;
    const upstream = await bounded(options.upstream(wireText, stop), stop);
    if (!upstream.body) { decoded = Promise.resolve(fail()); response.writeHead(502).end(); cleanup.abort(); return; }
    if (!upstream.ok || upstream.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "text/event-stream") {
      decoded = decodeChronistHttpResponse(upstream, { profileId: "anthropic-messages-1", maxOutputChars: options.maxOutputChars,
        signal: stop, pricing: options.pricing, startedAt: options.startedAt, inputChars: wireText.length });
      await decoded;
      // Neither raw provider errors nor an unexpected response format enter the CLI.
      response.writeHead(502, { "content-type": "application/json" }).end('{"type":"error","error":{"type":"api_error","message":"Provider unavailable"}}');
      cleanup.abort(); return;
    }
    const [accounting, forwarding] = upstream.body.tee();
    decoded = decodeChronistHttpResponse(new Response(accounting, { status: upstream.status, headers: upstream.headers }), {
      profileId: "anthropic-messages-1", maxOutputChars: options.maxOutputChars, signal: stop,
      pricing: options.pricing, startedAt: options.startedAt, inputChars: wireText.length });
    void decoded.then(outcome => { if (outcome.kind === "failed") cleanup.abort(); }, () => cleanup.abort());
    response.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") ?? "application/octet-stream" });
    const reader = forwarding.getReader();
    try {
      for (;;) { const next = await bounded(reader.read(), stop); if (next.done) break;
        if (!response.write(next.value)) await bounded(once(response, "drain"), stop); }
      response.end();
    } finally { void reader.cancel().catch(() => undefined); }
  }
  const abort = () => { child?.kill(); server.closeAllConnections(); };
  stop.addEventListener("abort", abort, { once: true });
  try {
    server.listen(0, "127.0.0.1"); await bounded(once(server, "listening"), stop);
    const address = server.address(); if (!address || typeof address === "string") return fail();
    const env = environment(directory, `http://127.0.0.1:${address.port}`, key);
    if (options.probeMarkers) {
      // All markers belong to this fresh host probe, including ancestors outside cwd.
      // Accidentally loaded hooks or MCP servers hit the denying loopback listener.
      const settingsMarker = { hooks: { SessionStart: [{ hooks: [{ type: "http", url: `http://127.0.0.1:${address.port}/hook-marker` }] }] } };
      await mkdir(join(active.root, ".claude"), { recursive: true });
      await mkdir(join(directory, ".claude"), { recursive: true });
      await mkdir(join(directory, ".claude", "skills", "synthetic-capability-marker"), { recursive: true });
      await writeFile(join(active.root, "CLAUDE.md"), "SYNTHETIC_OUTSIDE_CWD_CONTEXT_MARKER");
      await writeFile(join(active.root, ".claude", "settings.json"), JSON.stringify(settingsMarker));
      await writeFile(join(directory, "CLAUDE.md"), "SYNTHETIC_CWD_CONTEXT_MARKER");
      await writeFile(join(directory, "settings.json"), JSON.stringify(settingsMarker));
      await writeFile(join(directory, ".claude", "settings.json"), JSON.stringify(settingsMarker));
      await writeFile(join(directory, ".claude", "skills", "synthetic-capability-marker", "SKILL.md"),
        "---\nname: synthetic-capability-marker\ndescription: Synthetic forbidden discovery marker\n---\nSYNTHETIC_SKILL_MARKER");
      await writeFile(join(directory, ".mcp.json"), JSON.stringify({ mcpServers: { synthetic: { type: "http", url: `http://127.0.0.1:${address.port}/mcp-marker` } } }));
    }
    env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = String(body.max_tokens);
    const settings = join(directory, "bound-settings.json");
    await writeFile(settings, JSON.stringify({ env: { CLAUDE_CODE_EXTRA_BODY: wireText } }), { flag: "wx" });
    if (stop.aborted) return fail(stopCode());
    child = await spawnChronistWindowsJob(active.supervisor, active.executable, ["--bare", "--print", "--tools", "", "--strict-mcp-config",
      "--mcp-config", '{"mcpServers":{}}', "--no-session-persistence", "--setting-sources", "", "--disable-slash-commands", "--no-chrome",
      "--permission-prompts", "none", "--max-turns", "1", "--system-prompt", "Atlas Chronist.", "--model", body.model,
      "--output-format", "stream-json", "--verbose", "--settings", settings], directory, env);
    childClosed = once(child, "close");
    if (stop.aborted) child.kill();
    let pending = "", stdoutBytes = 0, stderrBytes = 0;
    const decoder = new TextDecoder("utf-8", { fatal: true });
    child.stdout.on("data", chunk => {
      try {
        stdoutBytes += chunk.length; if (stdoutBytes > MAX_STDOUT_BYTES) throw new Error();
        pending += decoder.decode(chunk, { stream: true }); let newline: number;
        while ((newline = pending.indexOf("\n")) >= 0) {
          const line = pending.slice(0, newline); pending = pending.slice(newline + 1); if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "system" && event.subtype === "init") {
            if (initSeen || event.claude_code_version !== CHRONIST_CLAUDE_CLI_VERSION || event.model !== body.model
              || [event.tools, event.mcp_servers, event.skills, event.plugins, event.slash_commands].some(list => !Array.isArray(list) || list.length)
              || event.analytics_disabled !== true) throw new Error();
            initSeen = true;
          }
          if (event.type === "result") {
            if (resultText !== undefined || event.is_error !== false || event.subtype !== "success" || event.num_turns !== 1 || typeof event.result !== "string") throw new Error();
            resultText = event.result;
          }
        }
      } catch { invalid = true; cleanup.abort(); }
    });
    child.stderr.on("data", chunk => { stderrBytes += chunk.length; if (stderrBytes > MAX_STDERR_BYTES) { invalid = true; cleanup.abort(); } });
    child.stdin.on("error", () => undefined); child.stdin.end("Atlas Chronist: gebundene Eingabe.");
    const [code] = await childClosed as [number | null];
    const outcome = decoded ? await decoded : fail(options.signal.aborted ? stopCode() : "unavailable");
    if (outcome.kind === "failed") return outcome;
    if (options.signal.aborted) return { kind: "failed", code: stopCode(), mayHaveExecuted: sent, usage: outcome.usage };
    if (code !== 0 || invalid || !initSeen || pending.trim() || resultText !== outcome.reply.text) {
      return { kind: "failed", code: "unavailable", mayHaveExecuted: sent, usage: outcome.usage };
    }
    return outcome;
  } catch {
    cleanup.abort();
    if (decoded) {
      const known = await decoded.catch(() => undefined);
      if (known?.kind === "failed") return known;
      if (known) return { kind: "failed", code: options.signal.aborted ? stopCode() : "unavailable", mayHaveExecuted: sent, usage: known.usage };
    }
    return fail(options.signal.aborted ? stopCode() : "unavailable");
  }
  finally {
    cleanup.abort(); stop.removeEventListener("abort", abort); child?.kill(); server.closeAllConnections();
    await childClosed?.catch(() => undefined);
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}

const CANARY_BODY = canonicalJson(chronistValue({ model: CHRONIST_CLAUDE_CLI_MODELS[0], system: "Synthetic capability probe.",
  messages: [{ role: "user", content: "Synthetic fixed input." }], tools: [], metadata: { user_id: "atlas-chronist" },
  max_tokens: 64, thinking: { type: "disabled" }, temperature: 1, stream: true }));
function canaryResponse(): Response {
  const event = (value: { type: string; [key: string]: unknown }) => `event: ${value.type}\ndata: ${JSON.stringify(value)}\n\n`;
  return new Response(event({ type: "message_start", message: { id: "synthetic", type: "message", role: "assistant", model: CHRONIST_CLAUDE_CLI_MODELS[0], content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 2, output_tokens: 0 } } })
    + event({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } })
    + event({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "synthetic" } })
    + event({ type: "content_block_stop", index: 0 })
    + event({ type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 1 } })
    + event({ type: "message_stop" }), { headers: { "content-type": "text/event-stream" } });
}

/** Explicit operator activation uses only local synthetic transport. No key/account probing. */
export async function activateChronistCli(input: ChronistCliProviderConfig): Promise<ChronistCliActivation> {
  const config = structuredClone(input); validate(config);
  let root: string | undefined, active: Active | undefined;
  const dispose = async () => { if (active) active.disposed = true; if (root) await rm(root, { recursive: true, force: true }); };
  const unavailable = async (availabilityCode: string): Promise<ChronistCliActivation> => { await dispose(); return Object.freeze({ available: false, availabilityCode, dispose: async () => undefined }); };
  if (process.platform !== "win32") return unavailable("host-not-supported");
  if (config.capabilityEnabled !== true) return unavailable("capability-unverified");
  if (!config.apiKey) return unavailable("key-not-configured");
  try { if (!(await lstat(config.executable)).isFile()) return unavailable("binary-not-found"); } catch { return unavailable("binary-not-found"); }
  try {
    root = await mkdtemp(join(tmpdir(), "atlas-chronist-cli-"));
    if (!await policyAbsent(root)) return unavailable("capability-unverified");
    const executable = join(root, "claude.exe"); await copyFile(config.executable, executable);
    if (await sha256(executable) !== CHRONIST_CLAUDE_CLI_SHA256) return unavailable("capability-unverified");
    const supervisor = await compileChronistWindowsJob(root);
    active = { root, executable, supervisor, supervisorHash: await sha256(supervisor), configHash: configIdentity(config), disposed: false };
    let calls = 0;
    const outcome = await execute(active, CANARY_BODY, { maxOutputChars: 64, signal: AbortSignal.timeout(15_000), pricing: null, probeMarkers: true,
      startedAt: performance.now(), checkDispatch: async () => true,
      upstream: async body => { if (body !== CANARY_BODY || ++calls !== 1) throw new Error(); return canaryResponse(); } });
    if (outcome.kind !== "returned" || outcome.reply.text !== "synthetic" || calls !== 1) return unavailable("capability-unverified");
    const activation = Object.freeze({ available: true, availabilityCode: null, dispose }); activations.set(activation, active); return activation;
  } catch { return unavailable("capability-unverified"); }
}

export function createChronistCliBinding(input: ChronistCliProviderConfig, model: string,
  activation?: ChronistCliActivation, dependencies: ChronistHttpDependencies = {}): ChronistProviderBinding {
  const config = structuredClone(input); validate(config, model);
  const active = activation ? activations.get(activation) : undefined;
  const available = config.capabilityEnabled === true && !!config.apiKey && !!active && !active.disposed && active.configHash === configIdentity(config);
  const description: ChronistProviderDescription = { id: config.id, label: config.label, location: "fremd", transport: "cli", available,
    availabilityCode: available ? null : activation?.availabilityCode ?? (!config.apiKey ? "key-not-configured" : "capability-unverified"),
    models: Object.freeze([...config.models]), pricing: config.pricing ? Object.freeze({ ...config.pricing }) : null };
  const fingerprint = canonicalHash({ configuration: configIdentity(config), model });
  return { description: Object.freeze(description), fingerprint, profileId: config.profileId,
    prepare: (plan, snapshot, attempt, parents) => renderChronistUnit(config.profileId, model, fingerprint, plan, snapshot, attempt, parents),
    bind: (consumePermit, checkDispatch) => async (inputUnit, permit, signal) => {
      const startedAt = performance.now(), stop = AbortSignal.any([signal, AbortSignal.timeout(120_000)]);
      const unit = parseChronistModelUnit(structuredClone(inputUnit));
      const failed = (): ChronistCallOutcome => ({ kind: "failed", code: "unavailable", mayHaveExecuted: false, usage: noUsage(unit.dispatch.inputChars, startedAt) });
      try {
        if (!available || !active || active.disposed || !checkDispatch || stop.aborted
          || unit.dispatch.profileId !== config.profileId || unit.dispatch.model !== model || unit.dispatch.requestHash !== permit.requestHash
          || await bounded(sha256(active.executable), stop) !== CHRONIST_CLAUDE_CLI_SHA256
          || await bounded(sha256(active.supervisor), stop) !== active.supervisorHash) return failed();
        // The durable one-use CAS authorizes this supervised local process. The bridge's
        // one-use gate rechecks that same dispatched call immediately before upstream I/O.
        if (!await bounded(consumePermit(permit, unit), stop) || stop.aborted) return failed();
        // This fixed read-only policy inspection also spawns a process, so it follows
        // the durable permit instead of becoming an unclaimed preflight effect.
        if (!await bounded(policyAbsent(active.root), stop) || stop.aborted) return failed();
        return execute(active, unit.dispatch.wireText, { maxOutputChars: unit.dispatch.maxOutputChars, signal: stop,
          pricing: description.pricing, startedAt, checkDispatch: () => checkDispatch(permit, unit),
          upstream: (body, requestSignal) => (dependencies.fetch ?? fetch)(UPSTREAM, { method: "POST", body, redirect: "manual", signal: requestSignal,
            headers: { "content-type": "application/json", accept: "text/event-stream", "anthropic-version": "2023-06-01", "x-api-key": config.apiKey! } }) });
      } catch { return failed(); }
    } };
}
