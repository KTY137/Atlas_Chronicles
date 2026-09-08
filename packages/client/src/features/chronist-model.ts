// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ApiError, type Block } from "../api";

export const CHRONIST_TASKS = [
  { id: "prosa", title: "Wiki durchsehen", description: "Ereignisse und offene Fragen in euren Artikeln finden." },
  { id: "sitzung", title: "Sitzung auswerten", description: "Gespeicherte Notizen zum Spielabend durchsehen." },
  { id: "abriss", title: "Zusammenfassung erstellen", description: "Aus gewählten Quellen einen erzählerischen Abriss entwerfen." },
] as const;
export type ChronistMode = typeof CHRONIST_TASKS[number]["id"];
export const DEFAULT_CHRONIST_BUDGET = Object.freeze({ maxCalls: 8, maxInputChars: 160_000, maxOutputChars: 32_000,
  maxInputCharsPerCall: 24_000, maxOutputCharsPerCall: 8_000, callTimeoutMs: 60_000, maxActiveMs: 300_000, concurrency: 1 });

/** A lost acknowledgement keeps the exact command, even if the caller renders again. */
export function createChronistCommand<T extends object, R>(transport: (body: T & { commandId: string }) => Promise<R>, makeId = () => crypto.randomUUID()) {
  let pending: { fingerprint: string; body: T & { commandId: string } } | null = null;
  let inFlight: Promise<R> | null = null;
  return {
    get pending() { return pending?.body ?? null; },
    send(body: T): Promise<R> {
      const fingerprint = JSON.stringify(body);
      if (pending && fingerprint !== pending.fingerprint) return Promise.reject(new Error("Der letzte Vorgang ist noch ungeklärt. Bitte zuerst unverändert erneut versuchen."));
      if (inFlight) return inFlight;
      pending ??= { fingerprint, body: { ...structuredClone(body), commandId: makeId() } };
      const attempt = pending;
      inFlight = Promise.resolve().then(() => transport(attempt.body)).then(result => { pending = null; return result; }, error => {
        if (error instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(error.status)) pending = null;
        throw error;
      }).finally(() => { inFlight = null; });
      return inFlight;
    },
  };
}

export interface ChronistDraftRecovery { schemaVersion: 1; proposalId: string; version: number; draftHash: string; blocks: Block[] }
function recoveryRows(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 1000 && value.every(row => Array.isArray(row) && row.length <= 10_000 && row.every(part => {
    if (!part || typeof part !== "object" || typeof part.text !== "string" || !Array.isArray(part.marks) || part.marks.length > 20) return false;
    return part.marks.every((mark: { art?: string; zielSlug?: string; zielEntryId?: string }) => mark && (["em", "strong", "code"].includes(mark.art ?? "") || mark.art === "link" && typeof mark.zielSlug === "string" && (mark.zielEntryId === undefined || typeof mark.zielEntryId === "string")));
  }));
}
function recoveryBlock(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const block = value as Block;
  switch (block.kind) {
    case "absatz": case "zitat": return recoveryRows([block.inhalt]);
    case "feld": return typeof block.schluessel === "string" && typeof block.label === "string" && typeof block.mehrwertig === "boolean" && recoveryRows(block.werte);
    case "liste": return typeof block.geordnet === "boolean" && recoveryRows(block.punkte);
    default: return false;
  }
}
export function readChronistDraft(raw: string | null, proposalId: string): ChronistDraftRecovery | null {
  if (!raw || raw.length > 2_097_152) return null;
  try {
    const value = JSON.parse(raw) as ChronistDraftRecovery;
    if (value.schemaVersion !== 1 || value.proposalId !== proposalId || !Number.isSafeInteger(value.version) || value.version < 1 || !/^[a-f0-9]{64}$/.test(value.draftHash) || !Array.isArray(value.blocks) || value.blocks.length > 1000) return null;
    // Local recovery is an untrusted edit, never a server record. Admission remains at PUT.
    if (!value.blocks.every(recoveryBlock)) return null;
    return value;
  } catch { return null; }
}
export const draftStoragePrefix = (campaignId: string) => `chronist-draft:${campaignId}:`;
export function clearChronistDrafts(storage: Storage, campaignId: string) {
  const prefix = draftStoragePrefix(campaignId);
  const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((key): key is string => key !== null && key.startsWith(prefix));
  for (const key of keys) storage.removeItem(key);
}
export const chronistNumber = (value: number) => value.toLocaleString("de-DE");
export function chronistCost(micros: number | null | undefined, currency: string | null | undefined): string {
  if (micros == null || !currency) return "Kosten unbekannt";
  try { return new Intl.NumberFormat("de-DE", { style: "currency", currency, maximumFractionDigits: 4 }).format(micros / 1_000_000); }
  catch { return `${(micros / 1_000_000).toLocaleString("de-DE")} ${currency}`; }
}
