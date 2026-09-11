// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseBoundedMapJson } from "./tactical-map.ts";

/** Manual exploration is map knowledge, not a grant of associated Chronicle passages.
 * Persisted by (map, revision). A changed floor never inherits an old room's revelation. */
export type RoomFogAudience = string | null;
export interface RoomFog {
  readonly schemaVersion: 1; readonly enabled: boolean; readonly party: readonly string[];
  readonly actors: readonly { readonly actorId: string; readonly revealed: readonly string[]; readonly hidden: readonly string[] }[];
}
export interface RoomFogChange { readonly action: "reveal" | "hide" | "enable" | "knowledge"; readonly audience: RoomFogAudience; readonly regionIds: readonly string[] }
export class RoomFogValidationError extends Error { override readonly name = "RoomFogValidationError"; }
function fail(): never { throw new RoomFogValidationError("Bitte Raumfreigaben und Wissensblick prüfen."); }
const isId = (v: unknown, max = 256): v is string => typeof v === "string" && !!v.trim() && v.length <= max && !/[\u0000-\u001f\u007f-\u009f]/u.test(v);
const sorted = (ids: Iterable<string>) => [...new Set(ids)].sort();
function ids(v: unknown): asserts v is string[] { if (!Array.isArray(v) || v.length > 4096 || v.some(id => !isId(id)) || new Set(v).size !== v.length) fail(); }
export const emptyRoomFog = (): RoomFog => ({ schemaVersion: 1, enabled: false, party: [], actors: [] });
export function parseRoomFog(input: unknown): RoomFog {
  const v = parseBoundedMapJson(input, 4 * 1024 * 1024) as Record<string, unknown>;
  if (!v || Array.isArray(v) || typeof v !== "object" || Object.keys(v).sort().join() !== "actors,enabled,party,schemaVersion"
    || v.schemaVersion !== 1 || typeof v.enabled !== "boolean" || !Array.isArray(v.actors) || v.actors.length > 128) fail();
  ids(v.party); const seen = new Set<string>();
  for (const a of v.actors) {
    if (!a || typeof a !== "object" || Array.isArray(a) || Object.keys(a).sort().join() !== "actorId,hidden,revealed" || !isId(a.actorId, 128) || seen.has(a.actorId)) fail();
    ids(a.revealed); ids(a.hidden); if (a.revealed.some((r: string) => a.hidden.includes(r))) fail();
    seen.add(a.actorId);
  }
  return v as unknown as RoomFog;
}
export function applyRoomFog(before: RoomFog, change: RoomFogChange, available: ReadonlySet<string>): RoomFog {
  const state = parseRoomFog(before);
  ids(change.regionIds);
  if (!["reveal", "hide", "enable", "knowledge"].includes(change.action) || change.audience !== null && !isId(change.audience, 128)
    || change.regionIds.some(id => !available.has(id))) fail();
  if (change.action === "enable" || change.action === "knowledge") {
    if (change.audience !== null || change.regionIds.length) fail();
    return { ...state, enabled: change.action === "enable" };
  }
  if (!change.regionIds.length) fail();
  const selected = new Set(change.regionIds);
  if (change.audience === null) {
    // A party operation really applies to everyone: clear competing personal overrides.
    return parseRoomFog({ ...state, enabled: true,
      party: sorted(change.action === "reveal" ? [...state.party, ...selected] : state.party.filter(id => !selected.has(id))),
      actors: state.actors.map(a => ({ ...a, revealed: a.revealed.filter(id => !selected.has(id)), hidden: a.hidden.filter(id => !selected.has(id)) }))
        .filter(a => a.revealed.length || a.hidden.length),
    });
  }
  const actor = state.actors.find(a => a.actorId === change.audience) ?? { actorId: change.audience, revealed: [], hidden: [] };
  const next = { actorId: actor.actorId,
    revealed: sorted(change.action === "reveal" ? [...actor.revealed, ...selected] : actor.revealed.filter(id => !selected.has(id))),
    hidden: sorted(change.action === "hide" ? [...actor.hidden, ...selected] : actor.hidden.filter(id => !selected.has(id))),
  };
  return parseRoomFog({ ...state, enabled: true, actors: [...state.actors.filter(a => a.actorId !== actor.actorId), next].sort((a, b) => a.actorId.localeCompare(b.actorId, "en")) });
}
export function visibleFogRegions(state: RoomFog | null, actorId: string | null, available: ReadonlySet<string>, knowledge: ReadonlySet<string>): Set<string> {
  if (!state?.enabled) return new Set([...knowledge].filter(id => available.has(id)));
  const actor = state.actors.find(a => a.actorId === actorId), visible = new Set([...state.party, ...(actor?.revealed ?? [])]);
  for (const id of actor?.hidden ?? []) visible.delete(id);
  return new Set([...visible].filter(id => available.has(id)));
}
