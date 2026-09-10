// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { open } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { CHRONIST_CLAUDE_CLI_PROFILE, isChronistHttpProfile } from "@chronicle/chronist";
import type { ChronistProviderDescription } from "@chronicle/protocol";
import type { ChronistRuntimeConfig } from "../domain/chronist/runtime.ts";
import { createChronistHttpBinding, type ChronistHttpProviderConfig, type ChronistHttpDependencies } from "./http.ts";
import { activateChronistCli, createChronistCliBinding, type ChronistCliProviderConfig, type ChronistCliActivation } from "./cli.ts";
import { scanChronistLocal } from "./discovery.ts";
import type { ChronistLocalScanReport } from "@chronicle/protocol";

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
/** Ein lokaler Ollama-Eintrag, der noch kein Modell nennt: nur der Platzhalter laedt zur Suche
 *  ein. Ein Eintrag mit einem konkreten Modell ist die Entscheidung des Betreibers und wird
 *  weder abgefragt noch ersetzt. */
function awaitsDiscovery(provider: ChronistHttpProviderConfig | ChronistCliProviderConfig): provider is ChronistHttpProviderConfig {
  return provider.profileId === "ollama-chat-1" && provider.location === "lokal"
    && provider.models.length === 1 && provider.models[0] === CHRONIST_UNCONFIGURED_MODEL;
}

/**
 * Einen Satz Anbieter mit dem Ergebnis eines Suchlaufs auffrischen.
 *
 * Beruehrt ausschliesslich Ollama-Eintraege, die noch den Platzhalter tragen. Findet die Suche
 * nichts, bleibt der Platzhalter stehen — ein Eintrag, der sichtbar „noch nicht bereit" ist,
 * sagt mehr als gar kein Eintrag.
 */
const LEERER_LAUF = (): ChronistLocalScanReport => Object.freeze({ scannedAt: Date.now(), entries: Object.freeze([]), found: null });

async function withDiscovery(settings: ChronistHostSettings,
  options: { readonly fetch?: typeof fetch; readonly environment?: Readonly<Record<string, string | undefined>> },
  umfang: "datei" | "breit",
): Promise<{ readonly settings: ChronistHostSettings; readonly scan: ChronistLocalScanReport }> {
  const offen = settings.providers.filter(awaitsDiscovery);
  // Nichts zu suchen heisst: gar nicht suchen. Eine Betreiberdatei, die konkrete Modelle nennt
  // oder gar kein Ollama fuehrt, darf keinen einzigen Netzzugriff ausloesen.
  if (!offen.length) return { settings, scan: LEERER_LAUF() };
  // `umfang` haelt die Festlegung vom 2026-09-08 ein: eine Betreiberdatei sagt, WO gesucht wird,
  // und hinter ihrem Ruecken werden keine weiteren Adressen angefasst. Breit gesucht wird nur
  // ohne Datei — und auf ausdruecklichen Knopfdruck in der Oberflaeche.
  const scan = await scanChronistLocal({ ...(options.fetch ? { fetch: options.fetch } : {}),
    environment: options.environment ?? process.env,
    baseUrls: offen.map(provider => provider.baseUrl),
    ...(umfang === "datei" ? { exclusive: true } : {}) });
  if (!scan.found) return { settings, scan };
  const treffer = scan.found;
  return { scan, settings: { ...settings, providers: settings.providers.map(provider =>
    awaitsDiscovery(provider) ? { ...provider, baseUrl: treffer.baseUrl, models: [...treffer.models], available: true } : provider) } };
}

/**
 * Eine Laufzeit, die sich austauschen laesst, ohne dass irgendwer sie neu bekommt.
 *
 * Die Anbieterliste haengt an einem Getter statt an einem festen Feld: alles, was diese Laufzeit
 * schon in der Hand haelt, sieht nach einem Suchlauf sofort das neue Ergebnis. `close` schliesst
 * immer die AKTUELLE innere Laufzeit — alle inneren teilen sich dieselben aktivierten
 * Befehlszeilen-Bruecken, also wird jede genau einmal beendet.
 */
function createRescanableRuntime(initial: ChronistRuntimeConfig,
  rescan: () => Promise<{ readonly runtime: ChronistRuntimeConfig; readonly scan: ChronistLocalScanReport }>): ChronistRuntimeConfig {
  let current = initial, laufend: Promise<ChronistLocalScanReport> | undefined;
  return Object.freeze({
    get providers() { return current.providers; },
    // `?? 2` ist derselbe Vorgabewert, den `parseChronistHostSettings` einsetzt; die innere
    // Laufzeit fuehrt ihn immer, der Getter darf ihn nach aussen aber nicht als fehlend melden.
    get globalConcurrency() { return current.globalConcurrency ?? 2; },
    resolveProvider: (id: string, model: string) => current.resolveProvider(id, model),
    close: () => current.close?.() ?? Promise.resolve(),
    // Zwei gleichzeitige Klicks duerfen nicht zwei Suchlaeufe ausloesen; der zweite bekommt
    // das Ergebnis des ersten.
    rescanLocal: () => laufend ??= (async () => {
      try { const { runtime, scan } = await rescan(); current = runtime; return scan; }
      finally { laufend = undefined; }
    })(),
  });
}

/** Called only by an explicit host startup, never by an import or provider-list request. */
export async function loadChronistRuntime(options: { readonly configPath?: string; readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: typeof fetch; readonly allowCli?: boolean } = {}): Promise<ChronistRuntimeConfig> {
  if (options.configPath) {
    const activated = new Map<string, ChronistCliActivation>();
    try {
      const parsed = parseChronistHostSettings(JSON.parse(await boundedFile(options.configPath)), options.environment ?? process.env);
      // Ruling 2026-09-08: a file no longer switches discovery off wholesale. Only an Ollama entry
      // still carrying the placeholder is filled in — seit 2026-09-10 aus mehreren Adressen.
      const erste = await withDiscovery(parsed, options, "datei");
      for (const provider of erste.settings.providers) if (provider.profileId === CHRONIST_CLAUDE_CLI_PROFILE) {
        const activation = options.allowCli === true && provider.capabilityEnabled === true
          ? await activateChronistCli(provider)
          : Object.freeze({ available: false, availabilityCode: options.allowCli === true ? "capability-unverified" : "host-disabled", dispose: async () => undefined });
        activated.set(provider.id, activation);
      }
      // Ein spaeterer Suchlauf geht immer von der DATEI aus, nie vom letzten Ergebnis: sonst
      // waere ein einmal gefundener Platzhalter fuer immer besetzt und ein abgeschalteter
      // Dienst bliebe ewig als „bereit" stehen. Die Bruecken bleiben, wie sie sind.
      return createRescanableRuntime(createChronistRuntime(erste.settings, options, activated), async () => {
        // Der Knopf sucht breit: hier hat jemand ausdruecklich darum gebeten, und der Bericht
        // zeigt ihm hinterher jede gepruefte Adresse.
        const erneut = await withDiscovery(parsed, options, "breit");
        return { runtime: createChronistRuntime(erneut.settings, options, activated), scan: erneut.scan };
      });
    } catch {
      await Promise.allSettled([...activated.values()].map(activation => activation.dispose()));
      throw new ChronistConfigurationError();
    }
  }
  // Ohne Betreiberdatei ist der Platzhalter der ganze Bestand — genau der Fall, den die Suche
  // fuellen soll.
  const ohneDatei: ChronistHostSettings = { globalConcurrency: 2, providers: [offlineOllama()] };
  const erste = await withDiscovery(ohneDatei, options, "breit");
  return createRescanableRuntime(createChronistRuntime(erste.settings, options), async () => {
    const erneut = await withDiscovery(ohneDatei, options, "breit");
    return { runtime: createChronistRuntime(erneut.settings, options), scan: erneut.scan };
  });
}
