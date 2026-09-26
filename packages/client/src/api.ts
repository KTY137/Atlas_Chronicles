// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { t } from "./i18n";
export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); this.name = "ApiError"; }
}

/**
 * Der Schreibstand zählt jede abgeschlossene Änderung und jede Live-Meldung. `useResource` teilt eine
 * laufende Abfrage nur mit Aufrufern desselben Stands — wer nach einer Änderung lädt, hängt sich nie
 * an eine Abfrage, die davor begonnen hat.
 */
let schreibStand = 0;
export function markiereAenderung(): void { schreibStand++; }
export function aktuellerSchreibStand(): number { return schreibStand; }

export async function api<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal; authorization?: string } = {}): Promise<T> {
  const schreibt = (options.method ?? "GET") !== "GET";
  try { return await apiRoh<T>(path, options); } finally { if (schreibt) markiereAenderung(); }
}
async function apiRoh<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal; authorization?: string }): Promise<T> {
  const response = await fetch(path, { method: options.method ?? "GET", credentials: "same-origin", cache: "no-store",
    headers: { ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(options.authorization ? { Authorization: options.authorization } : {}) },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}), ...(options.signal ? { signal: options.signal } : {}) });
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new ApiError(response.status, body?.error ?? "Die Verbindung konnte nicht abgeschlossen werden.");
  return body as T;
}

export const apiPath = (campaignId: string, suffix = "") => `/api/campaigns/${encodeURIComponent(campaignId)}${suffix}`;
// Serverfehler bleiben deutsche Saetze; `t` uebersetzt die statischen darunter, sobald sie
// im Katalog stehen, und laesst dynamische Texte unveraendert deutsch.
export const errorText = (error: unknown) => error instanceof Error ? t(error.message) : t("Etwas ist schiefgegangen. Bitte erneut versuchen.");

export interface Me { userId: string; displayName: string; canCreateCampaign: boolean; credentialId: string }
export interface Campaign { id: string; universeId: string; name: string; version: number; role: "leitung" | "spieler" | "beobachter" }
export interface Member { userId: string; displayName: string; role: Campaign["role"]; actorId: string | null }
export interface EntrySummary { id: string; slug: string; title: string; excerpt: string }
export type Mark = { art: "em" | "strong" | "code" } | { art: "link"; zielSlug: string; zielEntryId?: string; tuer?: { vollmachtId: string; verfallAt: number } };
export interface Inline { text: string; marks: readonly Mark[] }
export type Block =
  | { kind: "absatz" | "zitat"; inhalt: readonly Inline[] }
  | { kind: "bildunterschrift"; assetId: string; inhalt: readonly Inline[]; dateiname?: string; alt?: string; ausrichtung?: "links" | "rechts" | "zentriert" | "ohne"; breite?: number; ausInfobox?: boolean }
  | { kind: "feld"; schluessel: string; label: string; gruppe?: string; werte: readonly (readonly Inline[])[]; mehrwertig: boolean; klauselKandidat?: boolean }
  | { kind: "liste"; geordnet: boolean; punkte: readonly (readonly Inline[])[] }
  | { kind: "rohblock"; quelltext: string; grund: string };
export interface ProjectedPassage { pid: string; ord: number; pfad: readonly string[]; inhalt: Block }
export interface EntryDocument { entryId: string; slug: string; titel: string; passagen: readonly ProjectedPassage[]; version?: number; revisionId?: string }
export interface DraftPassage { pid?: string; inhalt: Block; pfad: string[]; tags: string[]; localKey: string }
export interface HistoryItem { id: string; seq: number; contentHash: string; createdAt: number | string; document: { title: string; slug: string; passagen: (ProjectedPassage & { geltung: string; praegung: unknown })[]; tags?: string[][] } }
export interface WikiAsset {
  id: string; dateiname: string; mime: string | null; sha256: string | null; bytes: number | null;
  breite: number | null; hoehe: number | null; behaupteterMime: string | null;
  lizenzStatus: "frei" | "zitat" | "unbekannt"; lizenzQuelle: string | null;
  beschreibungsseiteUrl: string | null; quellUrl: string | null; urheber: string | null; hochgeladenAm: string | null;
  verwendetVon: readonly string[]; verwaist: boolean; imBestand: boolean; vorhanden: boolean; formatWiderspruch: boolean;
  /** Selbst hochgeladen statt aus einem Wiki geholt — „im Quell-Wiki nicht vorhanden“ wäre hier falsch. */
  selbstHochgeladen: boolean;
  /** Falsch, sobald ein Artikel oder eine Lootkarte dieses Bild zeigt. Der Server prüft es erneut. */
  loeschbar: boolean;
}
export interface WikiMedienBestand {
  assets: readonly WikiAsset[];
  bilanz: { gesamt: number; vorhanden: number; offen: number; verwaist: number; ohneQuelle: number;
    nachLizenz: { frei: number; zitat: number; unbekannt: number }; formatwidersprueche: number };
}
/** Das Bild einer Passage. Fehlen die Bytes, antwortet der Server 404 und der Leser sieht den Platzhalter. */
export const assetPath = (campaignId: string, assetId: string) =>
  `${apiPath(campaignId, `/wiki-medien/${encodeURIComponent(assetId)}/datei`)}`;
export interface Invitation { id: string; code: string; expiresAt: number }
export interface PendingJoin { id: string; pollToken: string; expiresAt: number }
export interface JoinRequest { id: string; displayName: string; createdAt: number | string }
export interface Credential { id: string; kind: string; label: string; createdAt: number | string; lastUsedAt: number | string | null; expiresAt: number | string }

export function plainText(block: Block): string {
  switch (block.kind) {
    case "absatz": case "zitat": case "bildunterschrift": return block.inhalt.map((row) => row.text).join("");
    case "feld": return block.werte.map((row) => row.map((part) => part.text).join("")).join("\n");
    case "liste": return block.punkte.map((row) => row.map((part) => part.text).join("")).join("\n");
    case "rohblock": return block.quelltext;
  }
}

/**
 * Eine Antwort des Servers als Datei speichern.
 *
 * Einmal geschrieben, zweimal benutzt — Kampagnenpaket und Wiki-Export. Der Dateiname kommt
 * bevorzugt aus dem `Content-Disposition` der Antwort: der Server weiss besser als der Browser,
 * wie die Datei heissen soll, und bei einem Namen aus der Welt der Runde ist genau das der
 * Unterschied zwischen `chronik.md` und `download`.
 */
export async function ladeAlsDatei(pfad: string, rueckfallName: string, fehler: (status: number) => string): Promise<void> {
  const antwort = await fetch(pfad, { credentials: "same-origin", cache: "no-store" });
  if (!antwort.ok) throw new ApiError(antwort.status, fehler(antwort.status));
  const url = URL.createObjectURL(await antwort.blob()), link = document.createElement("a");
  link.href = url; link.download = dateinameAus(antwort.headers.get("Content-Disposition")) ?? rueckfallName;
  document.body.append(link); link.click(); link.remove();
  // Erst freigeben, wenn der Browser die Daten sicher uebernommen hat.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Der Dateiname aus `Content-Disposition`; die kodierte Fassung (RFC 5987) hat Vorrang. */
export function dateinameAus(kopfzeile: string | null): string | null {
  if (!kopfzeile) return null;
  const kodiert = /filename\*=UTF-8''([^;]+)/i.exec(kopfzeile);
  if (kodiert) { try { return decodeURIComponent(kodiert[1]!); } catch { /* unbrauchbar kodiert */ } }
  return /filename="([^"]*)"/i.exec(kopfzeile)?.[1] || null;
}
