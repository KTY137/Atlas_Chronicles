// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type { Server, RequestListener } from "node:http";
import { canonicalHash } from "@chronicle/core";
import { CHRONIST_CLAUDE_CLI_PROFILE, CHRONIST_DEFAULT_BUDGET, canonicalChronistSources, deriveChronistFacts,
  makeChronistSourceSnapshot, planChronistUnits, parseChronistCallOutcome, type ChronistSnapshot } from "@chronicle/chronist";
import { activateChronistCli, createChronistCliBinding, type ChronistCliActivation, type ChronistCliProviderConfig } from "../src/chronist-providers/cli.ts";
import { compileChronistWindowsJob, spawnChronistWindowsJob } from "../src/chronist-providers/cli-windows-job.ts";

const observed = vi.hoisted(() => ({ servers: [] as Server[], localKey: "", tamperBody: false }));
vi.mock("node:fs/promises", async importOriginal => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, writeFile: (path: Parameters<typeof actual.writeFile>[0], data: Parameters<typeof actual.writeFile>[1], options: Parameters<typeof actual.writeFile>[2]) => {
    if (observed.tamperBody && String(path).endsWith("bound-settings.json") && typeof data === "string") {
      const settings = JSON.parse(data), body = JSON.parse(settings.env.CLAUDE_CODE_EXTRA_BODY);
      body.messages[0].content = "UNCONSENTED_SOURCE";
      settings.env.CLAUDE_CODE_EXTRA_BODY = JSON.stringify(body); data = JSON.stringify(settings);
    }
    return actual.writeFile(path, data, options);
  } };
});
vi.mock("node:http", async importOriginal => {
  const actual = await importOriginal<typeof import("node:http")>();
  return { ...actual, createServer: (listener: RequestListener) => {
    const server = actual.createServer(listener); observed.servers.push(server);
    server.prependListener("request", request => { if (typeof request.headers["x-api-key"] === "string") observed.localKey = request.headers["x-api-key"]; });
    return server;
  } };
});

let root: string, supervisor: string;
const binary = process.env.ATLAS_CHRONIST_CLI_TEST_BINARY;
const model = "claude-sonnet-4-5-20250929", answer = '{"schemaVersion":1,"candidates":[]}';
const config: ChronistCliProviderConfig = { id: "claude-test", label: "Claude fixture", profileId: CHRONIST_CLAUDE_CLI_PROFILE,
  location: "fremd", executable: binary ?? "C:/absent/claude.exe", models: [model], apiKey: "synthetic-host-only-key", capabilityEnabled: true };
let activation: ChronistCliActivation | undefined;
beforeAll(async () => {
  if (process.platform !== "win32") return;
  root = await mkdtemp(join(tmpdir(), "atlas-chronist-cli-test-"));
  supervisor = await compileChronistWindowsJob(root);
  if (binary) { activation = await activateChronistCli(config); expect(activation).toMatchObject({ available: true, availabilityCode: null }); }
}, 20_000);
afterAll(async () => { await activation?.dispose(); if (root) await rm(root, { recursive: true, force: true }); });
const environment = () => ({ SystemRoot: process.env.SystemRoot!, WINDIR: process.env.SystemRoot!, PATH: process.env.SystemRoot! });

it.runIf(process.platform === "win32")("preserves Windows empty, quoted, Unicode and trailing slash arguments without a shell", async () => {
  const directory = join(root, "argument case"); await mkdir(directory);
  const args = ["", "a b", 'embedded"quote', "trailing\\", "Grüße 🦊", "$(SYNTHETIC)", "`literal`"];
  const child = await spawnChronistWindowsJob(supervisor, process.execPath,
    ["-e", "let input='';process.stdin.on('data',x=>input+=x);process.stdin.on('end',()=>console.log(JSON.stringify({args:process.argv.slice(1),input})));", ...args], directory, environment());
  let output = "", error = ""; child.stdout.on("data", data => output += data); child.stderr.on("data", data => error += data);
  child.stdin.end("synthetic input");
  const [code] = await once(child, "close");
  expect({ code, error }).toEqual({ code: 0, error: "" });
  expect(JSON.parse(output)).toEqual({ args, input: "synthetic input" });
}, 10_000);

function snapshot(): ChronistSnapshot {
  const block = { kind: "absatz" as const, inhalt: [{ text: "Die Gruppe erreichte den Hafen. @C:/synthetic/no-reading.txt 🦊", marks: [] }] };
  const sources = canonicalChronistSources([makeChronistSourceSnapshot({ entryId: "entry.cli", passageId: "passage.cli",
    revisionId: "revision.cli", contentHash: canonicalHash(block) }, "Synthetic notes", block)]);
  return { schemaVersion: 1, graphVersion: "chronist-1", runId: "run.cli", mode: "prosa", sessionId: null,
    scopeHash: "c".repeat(64), sources, facts: deriveChronistFacts(sources), budget: CHRONIST_DEFAULT_BUDGET };
}
function setup(transport: typeof fetch, maxOutputChars = 1000) {
  const binding = createChronistCliBinding(config, model, activation, { fetch: transport }), source = snapshot();
  const unit = binding.prepare({ ...planChronistUnits(source)[0]!, maxOutputChars }, source, 1, []);
  const permit = { callId: "call.cli", fence: 7, requestHash: unit.dispatch.requestHash };
  return { binding, unit, permit };
}
const sse = (value: { type: string; [key: string]: unknown }) => `event: ${value.type}\ndata: ${JSON.stringify(value)}\n\n`;
function prefix(text = answer): string {
  return sse({ type: "message_start", message: { id: "msg_synthetic", type: "message", role: "assistant", model,
    content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } })
    + sse({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } })
    + sse({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } });
}
function complete(text = answer): Response {
  return new Response(prefix(text) + sse({ type: "content_block_stop", index: 0 })
    + sse({ type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 6 } })
    + sse({ type: "message_stop" }), { headers: { "content-type": "text/event-stream" } });
}

it("never trusts installed names, host flags or forged activation objects as a verified capability", async () => {
  const transport = vi.fn<typeof fetch>(), binding = createChronistCliBinding(config, model,
    { available: true, availabilityCode: null, dispose: async () => undefined }, { fetch: transport });
  expect(binding.description).toMatchObject({ available: false, availabilityCode: "capability-unverified", transport: "cli", location: "fremd" });
  const source = snapshot(), unit = binding.prepare(planChronistUnits(source)[0]!, source, 1, []), consume = vi.fn(async () => true);
  expect(await binding.bind(consume, async () => true)(unit, { callId: "call", fence: 1, requestHash: unit.dispatch.requestHash }, new AbortController().signal))
    .toMatchObject({ kind: "failed", mayHaveExecuted: false });
  expect(consume).not.toHaveBeenCalled(); expect(transport).not.toHaveBeenCalled();
});

it.runIf(process.platform === "win32" && !!binary)("uses the pinned native CLI, exactly one full-unit permit and exact canonical upstream body", async () => {
  let consumed = false, checked = false;
  const transport = vi.fn<typeof fetch>(async (url, options) => {
    expect(String(url)).toBe("https://api.anthropic.com/v1/messages"); expect(consumed && checked).toBe(true);
    expect(options?.body).toBe(unit.dispatch.wireText); expect(options?.redirect).toBe("manual");
    expect(new Headers(options?.headers).get("x-api-key")).toBe(config.apiKey);
    expect(JSON.parse(String(options?.body))).toMatchObject({ tools: [], thinking: { type: "disabled" }, metadata: { user_id: "atlas-chronist" } });
    expect(String(options?.body)).not.toContain("Today's date"); return complete();
  });
  const { binding, unit, permit } = setup(transport);
  expect(binding.description.available).toBe(true);
  const consume = vi.fn(async (actualPermit, actualUnit) => { expect(actualPermit).toEqual(permit); expect(actualUnit).toEqual(unit); consumed = true; return true; });
  const check = vi.fn(async (actualPermit, actualUnit) => { expect(consumed).toBe(true); expect(actualPermit).toEqual(permit); expect(actualUnit).toEqual(unit); checked = true; return true; });
  const outcome = await binding.bind(consume, check)(unit, permit, new AbortController().signal);
  parseChronistCallOutcome(outcome);
  expect(outcome).toMatchObject({ kind: "returned", reply: { text: answer }, usage: { inputChars: unit.dispatch.wireText.length, outputChars: answer.length,
    inputTokens: 10, outputTokens: 6, tokensComplete: true, outputComplete: true } });
  expect(consume).toHaveBeenCalledTimes(1); expect(check).toHaveBeenCalledTimes(1); expect(transport).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(outcome)).not.toContain(config.apiKey);
}, 15_000);

it.runIf(process.platform === "win32" && !!binary)("does not dispatch after full-unit permit rejection or authorization lost during CLI startup", async () => {
  const transport = vi.fn<typeof fetch>(), { binding, unit, permit } = setup(transport);
  const check = vi.fn(async () => true);
  expect(await binding.bind(async () => false, check)(unit, permit, new AbortController().signal)).toMatchObject({ kind: "failed", mayHaveExecuted: false });
  expect(check).not.toHaveBeenCalled();
  expect(await binding.bind(async () => true, async () => false)(unit, permit, new AbortController().signal)).toMatchObject({ kind: "failed", mayHaveExecuted: false,
    usage: { outputChars: 0, outputComplete: true } });
  expect(transport).not.toHaveBeenCalled();
}, 15_000);

it.runIf(process.platform === "win32" && !!binary)("preserves known partial usage after a dropped native CLI stream and prevents hidden fallback calls", async () => {
  const transport = vi.fn<typeof fetch>(async () => new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode(prefix("partial")));
    setTimeout(() => controller.error(new Error("synthetic connection drop")), 100);
  } }), { headers: { "content-type": "text/event-stream" } }));
  const { binding, unit, permit } = setup(transport), outcome = await binding.bind(async () => true, async () => true)(unit, permit, new AbortController().signal);
  parseChronistCallOutcome(outcome); expect(outcome).toMatchObject({ kind: "failed", mayHaveExecuted: true,
    usage: { inputChars: unit.dispatch.wireText.length, outputChars: 7, inputTokens: 10, outputComplete: false, tokensComplete: false } });
  expect(transport).toHaveBeenCalledTimes(1);
}, 15_000);

it.runIf(process.platform === "win32" && !!binary)("bounds native output and retains the counted prefix before terminating its process tree", async () => {
  const transport = vi.fn<typeof fetch>(async () => complete("x".repeat(1000))), { binding, unit, permit } = setup(transport, 80);
  const outcome = await binding.bind(async () => true, async () => true)(unit, permit, new AbortController().signal);
  parseChronistCallOutcome(outcome); expect(outcome).toMatchObject({ kind: "failed", code: "output-limit", mayHaveExecuted: true,
    usage: { outputChars: 80, outputComplete: false } }); expect(transport).toHaveBeenCalledTimes(1);
}, 15_000);

it.runIf(process.platform === "win32" && !!binary)("cancels a hanging native response with partial usage and no surviving process", async () => {
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
  const transport = vi.fn<typeof fetch>(async () => {
    timer = setTimeout(() => controller.abort(), 150);
    return new Response(new ReadableStream({ start(stream) { stream.enqueue(new TextEncoder().encode(prefix("partial"))); } }), { headers: { "content-type": "text/event-stream" } });
  });
  const { binding, unit, permit } = setup(transport);
  try {
    const outcome = await binding.bind(async () => true, async () => true)(unit, permit, controller.signal);
    parseChronistCallOutcome(outcome); expect(outcome).toMatchObject({ kind: "failed", code: "cancelled", mayHaveExecuted: true,
      usage: { outputChars: 7, inputTokens: 10, outputComplete: false } }); expect(transport).toHaveBeenCalledTimes(1);
  } finally { clearTimeout(timer); }
}, 15_000);

it.runIf(process.platform === "win32" && !!binary)("rejects a second authenticated local request before any second upstream effect", async () => {
  let duplicateStatus: number | undefined;
  const transport = vi.fn<typeof fetch>(async (_url, options) => {
    const address = observed.servers.at(-1)!.address(); expect(address && typeof address !== "string").toBe(true);
    const response = await fetch(`http://127.0.0.1:${(address as { port: number }).port}/v1/messages?beta=true`, {
      method: "POST", body: String(options?.body), headers: { "content-type": "application/json", "x-api-key": observed.localKey } });
    duplicateStatus = response.status; return complete();
  });
  const { binding, unit, permit } = setup(transport), consume = vi.fn(async () => true), check = vi.fn(async () => true);
  const outcome = await binding.bind(consume, check)(unit, permit, new AbortController().signal);
  parseChronistCallOutcome(outcome); expect(outcome).toMatchObject({ kind: "failed", mayHaveExecuted: true });
  expect(transport).toHaveBeenCalledTimes(1); expect(consume).toHaveBeenCalledTimes(1); expect(check).toHaveBeenCalledTimes(1);
  expect(duplicateStatus).toBe(403);
}, 15_000);

it.runIf(process.platform === "win32" && !!binary)("rejects a changed CLI body before authorization recheck or upstream I/O", async () => {
  const transport = vi.fn<typeof fetch>(), { binding, unit, permit } = setup(transport), check = vi.fn(async () => true);
  observed.tamperBody = true;
  try {
    const outcome = await binding.bind(async () => true, check)(unit, permit, new AbortController().signal);
    parseChronistCallOutcome(outcome); expect(outcome).toMatchObject({ kind: "failed", mayHaveExecuted: false,
      usage: { inputChars: unit.dispatch.wireText.length, outputChars: 0, outputComplete: true } });
    expect(check).not.toHaveBeenCalled(); expect(transport).not.toHaveBeenCalled();
  } finally { observed.tamperBody = false; }
}, 15_000);

it.runIf(process.platform === "win32" && !!binary)("does not retry an upstream HTTP failure or disclose raw provider errors", async () => {
  const transport = vi.fn<typeof fetch>(async () => new Response(`synthetic upstream raw detail ${config.apiKey}`, { status: 500 }));
  const { binding, unit, permit } = setup(transport), outcome = await binding.bind(async () => true, async () => true)(unit, permit, new AbortController().signal);
  parseChronistCallOutcome(outcome); expect(outcome).toMatchObject({ kind: "failed", code: "unavailable", mayHaveExecuted: true,
    usage: { outputChars: 0, outputComplete: false } });
  expect(transport).toHaveBeenCalledTimes(1); expect(JSON.stringify(outcome)).not.toContain("synthetic upstream raw detail");
  expect(JSON.stringify(outcome)).not.toContain(config.apiKey);
}, 15_000);

it.runIf(process.platform === "win32")("kills the suspended-assigned child and its real grandchild when the supervisor is terminated", async () => {
  const directory = join(root, "descendants"); await mkdir(directory);
  const child = await spawnChronistWindowsJob(supervisor, process.execPath,
    ["-e", "const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit',windowsHide:true});console.log(JSON.stringify({child:process.pid,grandchild:c.pid}));setInterval(()=>{},1000);"], directory, environment());
  child.stdin.end();
  const [data] = await once(child.stdout, "data"); const pids = JSON.parse(String(data)) as { child: number; grandchild: number };
  expect(pids.child).toBeGreaterThan(0); expect(pids.grandchild).toBeGreaterThan(0);
  const closed = once(child, "close"); expect(child.kill()).toBe(true); await closed;
  expect(() => process.kill(pids.child, 0)).toThrow();
  expect(() => process.kill(pids.grandchild, 0)).toThrow();
}, 10_000);

it.runIf(process.platform === "win32")("atomically contains a child when cancellation kills the supervisor before its initial thread resumes", async () => {
  const directory = join(root, "startup cancellation"); await mkdir(directory);
  const child = await spawnChronistWindowsJob(supervisor, process.execPath,
    ["-e", "console.log('CHILD_THREAD_RAN');setInterval(()=>{},1000);"], directory,
    { ...environment(), ATLAS_CHRONIST_TEST_SUSPENDED_START: "1" });
  const exited = once(child, "exit"), closed = once(child, "close");
  let output = ""; child.stdout.on("data", data => output += data); child.stdin.end();
  const [data] = await once(child.stdout, "data");
  const match = /^ATLAS_CHRONIST_JOB_SUSPENDED_PID=(\d+)\r?\n$/.exec(String(data)); expect(match).not.toBeNull();
  const pid = Number(match![1]); expect(pid).toBeGreaterThan(0);
  try {
    expect(child.kill()).toBe(true); await exited;
    expect(() => process.kill(pid, 0)).toThrow();
    expect(output).not.toContain("CHILD_THREAD_RAN");
  } finally {
    // A failing regression must also clean up the otherwise orphaned suspended child.
    try { process.kill(pid); } catch { /* already terminated by the Job Object */ }
    child.kill(); await closed;
  }
}, 10_000);
