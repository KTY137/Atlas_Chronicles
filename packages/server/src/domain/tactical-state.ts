import type { TacticalTokenPlan } from "../../../protocol/src/tactical.ts";
import { parseBoundedMapJson, type TacticalPoint } from "@chronicle/szene";

/** Same canonical key order as rules.stableJson, with tactical interchange bounds. */
export function tacticalCanonicalJson(input: unknown): string {
  const sort = (value: unknown): unknown => Array.isArray(value) ? value.map(sort) : value !== null && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sort((value as Record<string, unknown>)[key])])) : value;
  // The parser treats a top-level string as source text; wrap scalar strings so
  // this encoder always canonicalizes the value itself, like stableJson does.
  const value = typeof input === "string" ? (parseBoundedMapJson([input], 96 * 1024 * 1024) as unknown[])[0] : parseBoundedMapJson(input, 96 * 1024 * 1024);
  return JSON.stringify(sort(value));
}

export interface TacticalTokenState extends TacticalTokenPlan { version: number }
export interface TacticalPortalState { id: string; closed: boolean; version: number }
export interface TacticalSnapshot {
  schemaVersion: 1; map: { id: string; revision: number; contentHash: string };
  tokens: TacticalTokenState[]; portals: TacticalPortalState[];
}
export interface TacticalPatch {
  subjectKind: "token" | "portal"; subjectId: string;
  before: TacticalTokenState | TacticalPortalState; after: TacticalTokenState | TacticalPortalState;
}
export function sameTacticalValues(a: TacticalTokenState | TacticalPortalState, b: TacticalTokenState | TacticalPortalState): boolean {
  const { version: _a, ...left } = a, { version: _b, ...right } = b;
  return tacticalCanonicalJson(left) === tacticalCanonicalJson(right);
}
/** Strict replay is shared by ring compaction and focused integrity tests. */
export function applyTacticalPatch(snapshot: TacticalSnapshot, patch: TacticalPatch): TacticalSnapshot {
  const next: TacticalSnapshot = JSON.parse(tacticalCanonicalJson(snapshot));
  const rows = patch.subjectKind === "token" ? next.tokens : next.portals;
  const index = rows.findIndex(row => row.id === patch.subjectId);
  if (index < 0 || tacticalCanonicalJson(rows[index]) !== tacticalCanonicalJson(patch.before) || patch.after.id !== patch.subjectId || patch.after.version !== patch.before.version + 1) throw new Error("Invalid tactical transition");
  rows[index] = JSON.parse(tacticalCanonicalJson(patch.after));
  return next;
}
/** Image-local polygon membership including its boundary, without LOS/collision semantics. */
export function tacticalPointInside(point: TacticalPoint, polygon: readonly TacticalPoint[]): boolean {
  const [x, y] = point; let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j]!, b = polygon[i]!, cross = (x - a[0]) * (b[1] - a[1]) - (y - a[1]) * (b[0] - a[0]);
    if (cross === 0 && x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0]) && y >= Math.min(a[1], b[1]) && y <= Math.max(a[1], b[1])) return true;
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
