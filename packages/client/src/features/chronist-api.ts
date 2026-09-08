// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { ApiError, apiPath } from "../api";
import { t } from "../i18n";

export const chronistPath = (campaignId: string, suffix = "") => apiPath(campaignId, `/chronist${suffix}`);
/** Die Codes links sind Daten des Servers und bleiben deutsch wie englisch gleich; die Sätze
 * rechts sind Oberfläche und werden erst an der Anzeigestelle mit `t(…)` übersetzt. */
export const CHRONIST_REASON_LABELS: Record<string, string> = {
  "source-stale": "Eine Quelle wurde inzwischen geändert. Wähle den aktuellen Artikelstand und prüfe den Umfang erneut. Der bisherige Vorschlag bleibt als ältere Fassung erhalten.",
  "scope-changed": "Umfang oder Anbieter haben sich geändert. Bitte zuerst eine neue Vorschau erstellen.",
  "freigabe-missing": "Für diesen Lauf liegt keine gültige Freigabe vor. Erstelle die Vorschau und gib den angezeigten Umfang ausdrücklich frei.",
  "freigabe-expired": "Deine Freigabe für die externe Verarbeitung ist abgelaufen. Erstelle die Vorschau erneut und gib den angezeigten Umfang noch einmal frei.",
  "freigabe-used": "Diese Freigabe wurde bereits verwendet. Jeder Lauf und jede Fortsetzung verlangt eine eigene, frisch erstellte Vorschau.",
  "run-active": "Für diese Kampagne läuft bereits eine Auswertung. Öffne sie unter „Läufe“.",
  "provider-unavailable": "Dieser Anbieter ist noch nicht bereit. Die Regelbefunde kannst du weiterhin durchsehen.",
  "budget": "Die gewählte Grenze ist erreicht. Die bisherigen Ergebnisse bleiben zur Durchsicht erhalten.",
  "outcome-unknown": "Ein bereits gesendeter Aufruf hat noch keinen sicheren Abschluss. Vor einer Fortsetzung musst du bestätigen, dass dabei weitere Kosten entstehen können.",
  "call-in-flight": "Ein gesendeter Aufruf wird noch abgeschlossen. Sein Ergebnis und Verbrauch werden weiter erfasst.",
  "target-history-unavailable": "Dieser Artikel kann gerade nicht sicher ergänzt werden. Wähle einen neuen Artikel als Ziel oder stelle seine vollständige Historie wieder her.",
  "conflict": "Der gespeicherte Stand wurde inzwischen geändert. Dein Entwurf bleibt erhalten. Lade den aktuellen Stand zum Vergleich.",
  "proposal-version": "Der Vorschlag wurde inzwischen geändert. Dein Entwurf bleibt erhalten. Lade den aktuellen Stand zum Vergleich.",
  "command-conflict": "Der letzte Vorgang gehört zu einer anderen Fassung. Lade zuerst seinen gespeicherten Stand.",
  "partial-budget": "Die gewählten Grenzen reichen möglicherweise nur für einen Teil der Quellen. Bereits geprüfte Vorschläge bleiben erhalten, wenn die Grenze erreicht ist.",
  "cancelled": "Abgebrochen. Bereits gesendete Aufrufe können noch Verbrauch melden; vorhandene Vorschläge bleiben erhalten.",
  "authorization": "Der bisherige Zugang ist nicht mehr verfügbar. Geschützte Inhalte werden nicht weiter angezeigt.",
};
export const chronistReason = (code: string | null) => !code ? ""
  : CHRONIST_REASON_LABELS[code] ? t(CHRONIST_REASON_LABELS[code]!)
  : t("Die Auswertung wurde unterbrochen. Prüfe den Laufstand und versuche die angebotene Aktion erneut.");
export class ChronistApiError extends ApiError { constructor(status: number, readonly code: string | null, message: string) { super(status, message); } }
export async function chronistApi<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const response = await fetch(path, { method: options.method ?? "GET", credentials: "same-origin", cache: "no-store", signal: options.signal,
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" }, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const code = typeof result?.code === "string" ? result.code : null;
    throw new ChronistApiError(response.status, code, code && CHRONIST_REASON_LABELS[code] ? t(CHRONIST_REASON_LABELS[code]!) : typeof result?.error === "string" ? result.error : t("Die Verbindung konnte nicht abgeschlossen werden. Bitte erneut versuchen."));
  }
  return result as T;
}
