// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { reserveLocalKeys, type RuleDraft } from "./rule-forge-model";

/**
 * Der Regelentwurf überlebt Neuladen, Schließen und Absturz (Level 2, L2-E1): er liegt im Speicher
 * dieses Geräts unter einem Schlüssel je Kampagne. Kein Server, kein Schema — der Entwurf gehört
 * niemandem außer der Spielleitung an diesem Gerät, bis sie ihn installiert.
 */
export interface StoredDraft { readonly version: 1; readonly savedAt: number; readonly draft: RuleDraft }
export type SaveResult = "saved" | "full" | "unavailable";
export const draftKey = (campaignId: string) => `atlas.rule-draft.${campaignId}`;
type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;
function storage(): Storage | null { try { return globalThis.localStorage ?? null; } catch { return null; } }

export function saveDraft(campaignId: string, draft: RuleDraft, now: number, store: Storage | null = storage()): SaveResult {
  if (!store) return "unavailable";
  try { store.setItem(draftKey(campaignId), JSON.stringify({ version: 1, savedAt: now, draft } satisfies StoredDraft)); return "saved"; }
  catch (error) { return error instanceof Error && /quota/i.test(`${error.name} ${error.message}`) ? "full" : "unavailable"; }
}
/** Ein beschädigter oder fremder Eintrag ist kein Entwurf; er wird verworfen statt die Werkstatt zu blockieren. */
export function loadDraft(campaignId: string, store: Storage | null = storage()): StoredDraft | null {
  if (!store) return null;
  try {
    const raw = store.getItem(draftKey(campaignId)); if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredDraft>;
    const draft = value.draft as RuleDraft | undefined;
    if (value.version !== 1 || typeof value.savedAt !== "number" || !draft || !Array.isArray(draft.fields) || !Array.isArray(draft.actions) || !Array.isArray(draft.sections)) { store.removeItem(draftKey(campaignId)); return null; }
    // Die Werkstatt vergibt Kennungen ab 1; ein wiederhergestellter Entwurf trägt schon welche.
    reserveLocalKeys(raw);
    return { version: 1, savedAt: value.savedAt, draft };
  } catch { return null; }
}
export function clearDraft(campaignId: string, store: Storage | null = storage()): void {
  try { store?.removeItem(draftKey(campaignId)); } catch { /* nothing to clear */ }
}
