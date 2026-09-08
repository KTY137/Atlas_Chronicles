// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { canonicalHash } from "@chronicle/core";
import { createChronistGraph, makeChronistSourceSnapshot, CHRONIST_CLAUDE_CLI_PROFILE, CHRONIST_DEFAULT_BUDGET, type ChronistSnapshot } from "@chronicle/chronist";
import { CHRONIST_UNCONFIGURED_MODEL, createChronistRuntime, loadChronistRuntime, parseChronistHostSettings } from "../src/chronist-providers/registry.ts";
import { disableChronistTracing } from "../src/chronist-providers/tracing.ts";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const config = () => ({ schemaVersion: 1, providers: [{ id: "openai", label: "OpenAI", profileId: "openai-responses-1",
  location: "fremd", baseUrl: "https://api.openai.com/v1", models: ["configured/model"] }] });
const cliConfig = () => ({ schemaVersion: 1, providers: [{ id: "claude-cli", label: "Claude CLI", profileId: CHRONIST_CLAUDE_CLI_PROFILE,
  location: "fremd", executable: join(tmpdir(), "not-an-installed-chronist-cli.exe"), models: ["claude-sonnet-4-5-20250929"],
  apiKey: "synthetic-credential", capabilityEnabled: true }] });

it("keeps explicitly configured CLI profiles unavailable until both host and capability activation allow them", async () => {
  const dir = await mkdtemp(join(tmpdir(), "atlas-chronist-config-")), path = join(dir, "provider.json");
  const transport = vi.fn<typeof fetch>(() => { throw new Error("No discovery or model request expected"); });
  try {
    const raw = cliConfig();
    await writeFile(path, JSON.stringify(raw));
    const blocked = await loadChronistRuntime({ configPath: path, fetch: transport, environment: {} });
    expect(blocked.providers).toMatchObject([{ transport: "cli", available: false, availabilityCode: "host-disabled" }]);
    await blocked.close?.();
    await writeFile(path, JSON.stringify({ ...raw, providers: [{ ...raw.providers[0], capabilityEnabled: false }] }));
    const disabled = await loadChronistRuntime({ configPath: path, fetch: transport, environment: {}, allowCli: true });
    expect(disabled.providers).toMatchObject([{ available: false, availabilityCode: "capability-unverified" }]);
    await disabled.close?.();
    expect(transport).not.toHaveBeenCalled();
  } finally { await rm(dir, { recursive: true, force: true }); }
});
it("rejects transport cross-fields and unsupported native profiles before any activation", () => {
  const raw = cliConfig(), provider = raw.providers[0]!;
  for (const changed of [
    { ...provider, baseUrl: "https://unapproved.invalid" }, { ...provider, available: true },
    { ...provider, location: "lokal" }, { ...provider, executable: "claude.exe" },
    { ...provider, executable: join(tmpdir(), "claude.cmd") }, { ...provider, models: ["unprobed-model"] },
    { ...provider, capabilityEnabled: "true" }, { ...config().providers[0]!, executable: provider.executable },
  ]) expect(() => parseChronistHostSettings({ ...raw, providers: [changed] })).toThrow("Konfiguration");
});
it("cannot promote a forged CLI activation and drains every owned activation before allowing a retry", async () => {
  const disposeFirst = vi.fn(async () => { if (disposeFirst.mock.calls.length === 1) throw new Error("synthetic cleanup failure"); });
  const disposeSecond = vi.fn(async () => undefined);
  const fake = { available: true, availabilityCode: null, dispose: disposeFirst };
  const runtime = createChronistRuntime(parseChronistHostSettings(cliConfig()), {}, new Map([
    ["claude-cli", fake], ["second-owned", { available: false, availabilityCode: "host-disabled", dispose: disposeSecond }],
    ["same-owned", fake],
  ]));
  expect(runtime.providers[0]).toMatchObject({ available: false, availabilityCode: "capability-unverified" });
  await expect(runtime.close!()).rejects.toThrow("Konfiguration");
  expect(disposeFirst).toHaveBeenCalledTimes(1); expect(disposeSecond).toHaveBeenCalledTimes(1);
  await expect(runtime.close!()).resolves.toBeUndefined();
  await expect(runtime.close!()).resolves.toBeUndefined();
  expect(disposeFirst).toHaveBeenCalledTimes(2); expect(disposeSecond).toHaveBeenCalledTimes(2);
});

it("keeps an honest offline local binding with zero possible model I/O", async () => {
  const transport = vi.fn<typeof fetch>(); const runtime = createChronistRuntime(undefined, { fetch: transport });
  expect(runtime.providers).toMatchObject([{ id: "ollama", location: "lokal", available: false, models: [CHRONIST_UNCONFIGURED_MODEL] }]);
  expect(runtime.resolveProvider("ollama", CHRONIST_UNCONFIGURED_MODEL)).toBeDefined();
  expect(runtime.resolveProvider("ollama", "unlisted")).toBeUndefined();
  expect(transport).not.toHaveBeenCalled();
});
it("resolves only the explicitly configured secret and keeps public descriptions and fingerprints secret-free", () => {
  const raw = config(); const provider = { ...raw.providers[0]!, apiKeyEnv: "ATLAS_TEST_KEY" };
  const accesses: string[] = [], environment = new Proxy({ ATLAS_TEST_KEY: "synthetic-credential" }, {
    get(target, name: string) { accesses.push(name); return target[name as keyof typeof target]; },
    ownKeys() { throw new Error("Environment enumeration is forbidden"); },
  });
  const settings = parseChronistHostSettings({ ...raw, providers: [provider] }, environment);
  const runtime = createChronistRuntime(settings), binding = runtime.resolveProvider("openai", "configured/model")!;
  expect(accesses).toEqual(["ATLAS_TEST_KEY"]); expect(binding.description.available).toBe(true);
  expect(JSON.stringify(runtime.providers)).not.toContain("synthetic-credential");
  const rotated = createChronistRuntime(parseChronistHostSettings({ ...raw, providers: [provider] }, { ATLAS_TEST_KEY: "replacement" }));
  expect(rotated.resolveProvider("openai", "configured/model")!.fingerprint).toBe(binding.fingerprint);
  expect(createChronistRuntime(parseChronistHostSettings(raw)).providers[0]).toMatchObject({ available: false, availabilityCode: "key-not-configured" });
});
it("freezes allowlists and snapshots configuration before callers can mutate it", () => {
  const settings = parseChronistHostSettings(config()), runtime = createChronistRuntime(settings);
  (settings.providers[0]!.models as string[]).push("injected");
  expect(runtime.resolveProvider("openai", "injected")).toBeUndefined();
  expect(() => (runtime.providers[0]!.models as string[]).push("injected")).toThrow();
  expect(runtime.resolveProvider("openai", "configured/model")!.description.models).toEqual(["configured/model"]);
});
it("rejects ambiguous IDs, unknown fields, unsafe targets, invalid pricing and credential injection without echoing them", () => {
  const raw = config(), provider = raw.providers[0]!;
  for (const changed of [
    { ...raw, providers: [provider, provider] }, { ...raw, command: "anything" }, { ...raw, globalConcurrency: 5 },
    { ...raw, providers: [{ ...provider, models: ["one", "one"] }] },
    { ...raw, providers: [{ ...provider, baseUrl: "https://synthetic-credential@api.openai.com/v1" }] },
    { ...raw, providers: [{ ...provider, location: "lokal" }] },
    { ...raw, providers: [{ ...provider, apiKey: "synthetic-credential\r\nHeader: value" }] },
    { ...raw, providers: [{ ...provider, apiKey: "synthetic-credential", apiKeyEnv: "ATLAS_TEST_KEY" }] },
    { ...raw, providers: [{ ...provider, pricing: { currency: "EUR", inputMicrosPerMillion: -1, outputMicrosPerMillion: 0, asOf: "2026-09-08" } }] },
    { ...raw, providers: [{ ...provider, pricing: { currency: "EUR", inputMicrosPerMillion: 1, outputMicrosPerMillion: 0, asOf: "2026-02-31" } }] },
  ]) {
    let error: unknown; try { parseChronistHostSettings(changed); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(Error); expect(String(error)).not.toContain("synthetic-credential");
  }
});
it("reads only an explicit bounded operator file and never discovers accounts or models for it", async () => {
  const dir = await mkdtemp(join(tmpdir(), "atlas-chronist-config-")), path = join(dir, "provider.json");
  const transport = vi.fn<typeof fetch>(() => { throw new Error("No discovery expected"); });
  try {
    await writeFile(path, JSON.stringify(config()));
    expect((await loadChronistRuntime({ configPath: path, fetch: transport, environment: {} })).providers[0]!.id).toBe("openai");
    await expect(loadChronistRuntime({ configPath: "relative.json", fetch: transport })).rejects.toThrow("Konfiguration");
    await writeFile(path, " ".repeat(256 * 1024 + 1));
    await expect(loadChronistRuntime({ configPath: path, fetch: transport })).rejects.toThrow("Konfiguration");
    expect(transport).not.toHaveBeenCalled();
  } finally { await rm(dir, { recursive: true, force: true }); }
});
it("discovers only bounded loopback Ollama metadata at host startup and exposes actual model names", async () => {
  const transport = vi.fn<typeof fetch>(async (url, options) => {
    expect(String(url)).toBe("http://127.0.0.1:11434/api/tags"); expect(options?.redirect).toBe("manual");
    expect(options?.method).toBeUndefined(); expect(options?.body).toBeUndefined(); expect(options?.headers).toBeUndefined();
    return new Response(JSON.stringify({ models: [{ name: "z:latest" }, { name: "a:7b" }, { name: "z:latest" }, { name: "bad\nmodel" }] }));
  });
  const runtime = await loadChronistRuntime({ fetch: transport });
  expect(runtime.providers).toMatchObject([{ id: "ollama", available: true, models: ["a:7b", "z:latest"] }]);
  expect(runtime.resolveProvider("ollama", "a:7b")).toBeDefined(); expect(transport).toHaveBeenCalledTimes(1);
  // Reading the runtime registry is pure; no model/key availability request occurs on list.
  expect(runtime.providers[0]!.models.length).toBe(2); expect(transport).toHaveBeenCalledTimes(1);
});
it("falls back to explicit offline status on redirects, missing Ollama or oversized discovery responses", async () => {
  for (const transport of [
    async () => new Response(null, { status: 302, headers: { location: "https://never-request.invalid" } }),
    async () => { throw new Error("Unavailable"); },
    async () => new Response(" ".repeat(256 * 1024 + 1)),
  ] as (typeof fetch)[]) expect((await loadChronistRuntime({ fetch: transport })).providers[0]).toMatchObject({ available: false, location: "lokal" });
});
it("executes the actual offline graph without trace egress even when all inherited tracing flags enable it", async () => {
  for (const name of ["LANGSMITH_TRACING", "LANGSMITH_TRACING_V2", "LANGCHAIN_TRACING_V2", "LANGCHAIN_TRACING"]) vi.stubEnv(name, "true");
  vi.stubEnv("LANGCHAIN_CALLBACKS_BACKGROUND", "false");
  vi.stubEnv("LANGSMITH_ENDPOINT", "http://127.0.0.1:1"); vi.stubEnv("LANGSMITH_API_KEY", "synthetic-tracing-key");
  const network = vi.fn<typeof fetch>(async () => new Response("{}")); vi.stubGlobal("fetch", network);
  disableChronistTracing();
  const block = { kind: "absatz" as const, inhalt: [{ text: "Im Jahr 812 erreichte sie den Hafen.", marks: [] }] };
  const source = makeChronistSourceSnapshot({ entryId: "entry", passageId: "passage", revisionId: "revision", contentHash: canonicalHash(block) }, "Notiz", block);
  const snapshot: ChronistSnapshot = { schemaVersion: 1, graphVersion: "chronist-1", runId: "trace-check", scopeHash: "a".repeat(64),
    mode: "prosa", sessionId: null, sources: [source], facts: [], budget: CHRONIST_DEFAULT_BUDGET };
  // Facts must be the engine's derivation, exactly as in the real source collector.
  const { deriveChronistFacts } = await import("@chronicle/chronist"); const snap = { ...snapshot, facts: deriveChronistFacts(snapshot.sources) };
  let finishes = 0; const runtime = createChronistRuntime(), provider = runtime.resolveProvider("ollama", CHRONIST_UNCONFIGURED_MODEL)!;
  await createChronistGraph({ checkpointer: new MemorySaver(), provider: { prepare: provider.prepare, invoke: provider.bind(async () => false) }, effects: {
    check: async () => "provider-unavailable", readSnapshot: async () => snap, readCandidates: async () => [],
    persistUnit: async () => { throw new Error("No offline dispatch"); }, claimCall: async () => { throw new Error("No offline claim"); },
    recordCall: async () => { throw new Error("No offline receipt"); }, persistCandidates: async () => undefined,
    recordRejection: async () => undefined, finish: async () => { finishes++; },
  } }).start(snap, new AbortController().signal);
  expect(finishes).toBe(1); expect(network).not.toHaveBeenCalled();
});
