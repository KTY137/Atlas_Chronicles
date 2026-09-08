// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { open } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { CHRONIST_CLAUDE_CLI_PROFILE, isChronistHttpProfile } from "@chronicle/chronist";
import type { ChronistProviderDescription } from "@chronicle/protocol";
import type { ChronistRuntimeConfig } from "../domain/chronist/runtime.ts";
import { createChronistHttpBinding, type ChronistHttpProviderConfig, type ChronistHttpDependencies } from "./http.ts";
import { activateChronistCli, createChronistCliBinding, type ChronistCliProviderConfig, type ChronistCliActivation } from "./cli.ts";

const MAX_CONFIG_BYTES = 256 * 1024, MAX_MODELS = 32;
export const CHRONIST_UNCONFIGURED_MODEL = "Kein lokales Modell eingerichtet";
export class ChronistConfigurationError extends Error {
  constructor() { super("Chronist-Konfiguration ungültig. Datei, Anbieteradressen und erlaubte Modelle prüfen."); }
}
function fail(): never { throw new ChronistConfigurationError(); }
function object(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !fields.includes(key))) fail();
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail();
  return value;
}
function integer(value: unknown, max: number, min = 0): number {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) fail();
  return Number(value);
}
function modelNames(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.length > MAX_MODELS) fail();
  const names = value.map(name => text(name, 256));
  if (new Set(names).size !== names.length) fail();
  return names;
}
function pricing(value: unknown): ChronistProviderDescription["pricing"] {
  if (value === undefined || value === null) return null;
  const p = object(value, ["currency", "inputMicrosPerMillion", "outputMicrosPerMillion", "asOf"]);
  const currency = text(p.currency, 3), asOf = text(p.asOf, 10);
  if (!/^[A-Z]{3}$/.test(currency) || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)
    || !Number.isFinite(Date.parse(asOf)) || new Date(asOf).toISOString().slice(0, 10) !== asOf) fail();
  return { currency, asOf, inputMicrosPerMillion: integer(p.inputMicrosPerMillion, 1_000_000_000_000),
    outputMicrosPerMillion: integer(p.outputMicrosPerMillion, 1_000_000_000_000) };
}
export interface ChronistHostSettings {
  readonly providers: readonly (ChronistHttpProviderConfig | ChronistCliProviderConfig)[];
  readonly globalConcurrency: number;
}
/** Only explicitly named environment keys are consulted. No account or key discovery. */
export function parseChronistHostSettings(value: unknown, environment: Readonly<Record<string, string | undefined>> = {}): ChronistHostSettings {
  const root = object(value, ["schemaVersion", "providers", "globalConcurrency"]);
  if (root.schemaVersion !== 1 || !Array.isArray(root.providers) || root.providers.length > 16) fail();
  const ids = new Set<string>();
  const providers = root.providers.map(raw => {
    const common = ["id", "label", "profileId", "location", "models", "apiKey", "apiKeyEnv", "pricing"];
    const p = object(raw, [...common, "baseUrl", "available", "executable", "capabilityEnabled"]);
    const id = text(p.id, 64), label = text(p.label, 128), models = modelNames(p.models);
    if (!/^[a-z][a-z0-9_-]*$/.test(id) || ids.has(id) || typeof p.profileId !== "string"
      || (!isChronistHttpProfile(p.profileId) && p.profileId !== CHRONIST_CLAUDE_CLI_PROFILE)
      || !["lokal", "fremd"].includes(String(p.location))) fail();
    ids.add(id);
    if (p.apiKey !== undefined && p.apiKeyEnv !== undefined) fail();
    let apiKey: string | undefined;
    if (p.apiKey !== undefined) apiKey = text(p.apiKey, 8192);
    if (p.apiKeyEnv !== undefined) {
      const name = text(p.apiKeyEnv, 128);
      if (!/^[A-Z][A-Z0-9_]*$/.test(name)) fail();
      const configured = environment[name];
      if (configured !== undefined && configured !== "") apiKey = text(configured, 8192);
    }
    const shared = { id, label, models, pricing: pricing(p.pricing), ...(apiKey !== undefined ? { apiKey } : {}) };
    if (p.profileId === CHRONIST_CLAUDE_CLI_PROFILE) {
      object(p, [...common, "executable", "capabilityEnabled"]);
      if (p.location !== "fremd" || p.capabilityEnabled !== undefined && typeof p.capabilityEnabled !== "boolean") fail();
      const config: ChronistCliProviderConfig = { ...shared, profileId: p.profileId, location: "fremd", executable: text(p.executable, 4096),
        ...(typeof p.capabilityEnabled === "boolean" ? { capabilityEnabled: p.capabilityEnabled } : {}) };
      try { createChronistCliBinding(config, models[0]!); } catch { fail(); }
      return config;
    }
    object(p, [...common, "baseUrl", "available"]);
    if (p.available !== undefined && typeof p.available !== "boolean") fail();
    const config: ChronistHttpProviderConfig = { ...shared, profileId: p.profileId, baseUrl: text(p.baseUrl, 2048),
      location: p.location as "lokal" | "fremd", ...(typeof p.available === "boolean" ? { available: p.available } : {}) };
    // Validate transport addresses before publishing any registry state; no I/O in this constructor.
    try { createChronistHttpBinding(config, models[0]!); } catch { fail(); }
    return config;
  });
  return { providers, globalConcurrency: root.globalConcurrency === undefined ? 2 : integer(root.globalConcurrency, 4, 1) };
}
/** The single source of the documented Anthropic defaults; the desktop operator file is derived
 *  from exactly these values. Model names carry no date suffix, so a provider-side revision of the
 *  same name needs no file edit. Prices are USD micros per million tokens, a micro being a
 *  millionth of a US dollar; they are a written operator decision, not an automatic price list. */
export const CHRONIST_ANTHROPIC_PROFILE = "anthropic-messages-2" as const;
export const CHRONIST_ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1" as const;
export const CHRONIST_ANTHROPIC_KEY_ENV = "CHRONICLE_CHRONIST_KEY_ANTHROPIC" as const;
export const CHRONIST_ANTHROPIC_MODELS = Object.freeze({ standard: "claude-sonnet-5", economy: "claude-haiku-4-5" } as const);
export const CHRONIST_ANTHROPIC_PRICING: Readonly<Record<string, NonNullable<ChronistProviderDescription["pricing"]>>> = Object.freeze({
  "claude-sonnet-5": Object.freeze({ currency: "USD", asOf: "2026-09-08", inputMicrosPerMillion: 2_000_000, outputMicrosPerMillion: 10_000_000 }),
  "claude-haiku-4-5": Object.freeze({ currency: "USD", asOf: "2026-09-08", inputMicrosPerMillion: 1_000_000, outputMicrosPerMillion: 5_000_000 }),
});
/** No hard local default model: the placeholder stays visibly unavailable until discovery or the
 *  operator file names an actually installed model. Nothing here downloads or invokes a model. */
const offlineOllama = (): ChronistHttpProviderConfig => ({ id: "ollama", label: "Ollama", profileId: "ollama-chat-1",
  location: "lokal", baseUrl: "http://127.0.0.1:11434", models: [CHRONIST_UNCONFIGURED_MODEL], available: false });

export function createChronistRuntime(settings: ChronistHostSettings = { providers: [], globalConcurrency: 2 },
  dependencies: ChronistHttpDependencies = {}, cliActivations: ReadonlyMap<string, ChronistCliActivation> = new Map()): ChronistRuntimeConfig {
  const configured = structuredClone(settings), providers = configured.providers.length ? configured.providers : [offlineOllama()];
  const ownedActivations = new Map(cliActivations);
  const bindings = new Map(providers.flatMap(provider => provider.models.map(model => {
    const binding = provider.profileId === CHRONIST_CLAUDE_CLI_PROFILE
      ? createChronistCliBinding(provider, model, ownedActivations.get(provider.id), dependencies)
      : createChronistHttpBinding(provider, model, dependencies);
    return [JSON.stringify([provider.id, model]), binding] as const;
  })));
  const descriptions = providers.map(provider => structuredClone(bindings.get(JSON.stringify([provider.id, provider.models[0]]))!.description));
  for (const description of descriptions) { Object.freeze(description.models); if (description.pricing) Object.freeze(description.pricing); Object.freeze(description); }
  let closing: Promise<void> | undefined;
  return Object.freeze({ providers: Object.freeze(descriptions), globalConcurrency: configured.globalConcurrency,
    resolveProvider: (id: string, model: string) => bindings.get(JSON.stringify([id, model])),
    close: () => closing ??= (async () => {
      const results = await Promise.allSettled([...new Set(ownedActivations.values())].map(activation => activation.dispose()));
      if (results.some(result => result.status === "rejected")) throw new ChronistConfigurationError();
    })().catch(error => { closing = undefined; throw error; }) });
}

async function boundedFile(path: string): Promise<string> {
  if (!isAbsolute(path)) fail();
  const handle = await open(path, "r");
  try {
    if (!(await handle.stat()).isFile()) fail();
    const bytes = Buffer.alloc(MAX_CONFIG_BYTES + 1); let length = 0;
    while (length < bytes.length) { const read = await handle.read(bytes, length, bytes.length - length, null); if (!read.bytesRead) break; length += read.bytesRead; }
    if (length > MAX_CONFIG_BYTES) fail();
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length));
  } finally { await handle.close(); }
}
/** The operator file's own local address, normalized exactly like the dispatch endpoint. */
function tagsUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  if (url.hostname === "localhost") url.hostname = "127.0.0.1";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/api/tags`;
  return url.href;
}
/** A local Ollama entry that names no model yet: only the placeholder invites startup discovery.
 *  An entry with a concrete model is the operator's decision and is never queried or replaced. */
function awaitsDiscovery(provider: ChronistHttpProviderConfig | ChronistCliProviderConfig): provider is ChronistHttpProviderConfig {
  return provider.profileId === "ollama-chat-1" && provider.location === "lokal"
    && provider.models.length === 1 && provider.models[0] === CHRONIST_UNCONFIGURED_MODEL;
}
async function localModels(invokeFetch: typeof fetch, baseUrl = "http://127.0.0.1:11434"): Promise<readonly string[]> {
  // Startup discovery reads installed model names only. It neither downloads nor invokes a model.
  const response = await invokeFetch(tagsUrl(baseUrl), { redirect: "manual", signal: AbortSignal.timeout(1000) });
  if (!response.ok || !response.body) { await response.body?.cancel(); return []; }
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) { const next = await reader.read(); if (next.done) break; length += next.value.byteLength; if (length > MAX_CONFIG_BYTES) fail(); chunks.push(next.value); }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    if (!value || typeof value !== "object" || !Array.isArray((value as { models?: unknown }).models)) return [];
    const names = (value as { models: unknown[] }).models.flatMap(model => {
      const name = model && typeof model === "object" ? (model as { name?: unknown }).name : undefined;
      return typeof name === "string" && name.trim() && name.length <= 256 && !/[\u0000-\u001f\u007f]/.test(name) ? [name] : [];
    });
    return [...new Set(names)].sort().slice(0, MAX_MODELS);
  } finally { await reader.cancel().catch(() => undefined); }
}
/** Called only by an explicit host startup, never by an import or provider-list request. */
export async function loadChronistRuntime(options: { readonly configPath?: string; readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: typeof fetch; readonly allowCli?: boolean } = {}): Promise<ChronistRuntimeConfig> {
  if (options.configPath) {
    const activated = new Map<string, ChronistCliActivation>();
    try {
      const parsed = parseChronistHostSettings(JSON.parse(await boundedFile(options.configPath)), options.environment ?? process.env);
      // Ruling 2026-09-08: a file no longer switches discovery off wholesale. Only an Ollama entry
      // still carrying the placeholder is filled in from its own already validated local address.
      const settings: ChronistHostSettings = { ...parsed, providers: await Promise.all(parsed.providers.map(async provider => {
        if (!awaitsDiscovery(provider)) return provider;
        const found = await localModels(options.fetch ?? fetch, provider.baseUrl).catch(() => []);
        return found.length ? { ...provider, models: [...found], available: true } : provider;
      })) };
      for (const provider of settings.providers) if (provider.profileId === CHRONIST_CLAUDE_CLI_PROFILE) {
        const activation = options.allowCli === true && provider.capabilityEnabled === true
          ? await activateChronistCli(provider)
          : Object.freeze({ available: false, availabilityCode: options.allowCli === true ? "capability-unverified" : "host-disabled", dispose: async () => undefined });
        activated.set(provider.id, activation);
      }
      return createChronistRuntime(settings, options, activated);
    } catch {
      await Promise.allSettled([...activated.values()].map(activation => activation.dispose()));
      throw new ChronistConfigurationError();
    }
  }
  const names = await localModels(options.fetch ?? fetch).catch(() => []);
  return createChronistRuntime({ globalConcurrency: 2, providers: names.length ? [{ ...offlineOllama(), models: names, available: true }] : [] }, options);
}
