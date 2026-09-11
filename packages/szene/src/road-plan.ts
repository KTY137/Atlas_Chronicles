// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { PlanPoint } from "./settlement-plan.ts";

/** A versioned generation constraint graph. Geometry is still owned by the generated map. */
export interface RoadPlanNode { readonly id: string; readonly name: string; readonly art: "tor" | "platz" | "wegpunkt"; readonly position: PlanPoint }
export interface RoadPlanEdge { readonly id: string; readonly von: string; readonly nach: string; readonly art: "hauptstrasse" | "gasse"; readonly bruecke: boolean }
export interface RoadPlan { readonly schemaVersion: 1; readonly knoten: readonly RoadPlanNode[]; readonly verbindungen: readonly RoadPlanEdge[]; readonly maxSteigung: number }
export const ROAD_PLAN_LIMITS = { nodes: 24, edges: 32, segments: 512, searchNodes: 200_000, smoothingChecks: 512, rise: 64 } as const;
export class RoadPlanError extends Error {
  override readonly name = "RoadPlanError";
  constructor(readonly path: string) { super(`Ungültiger Straßenplan: ${path}.`); }
}
const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const closed = (v: Record<string, unknown>, keys: readonly string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const id = (v: unknown): v is string => typeof v === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(v);
export function parseRoadPlan(value: unknown): RoadPlan {
  const fail = (path: string): never => { throw new RoadPlanError(path); };
  if (!plain(value) || !closed(value, ["schemaVersion", "knoten", "verbindungen", "maxSteigung"]) || value.schemaVersion !== 1) return fail("verkehr");
  if (!Number.isSafeInteger(value.maxSteigung) || (value.maxSteigung as number) < 1 || (value.maxSteigung as number) > ROAD_PLAN_LIMITS.rise) return fail("verkehr.maxSteigung");
  if (!Array.isArray(value.knoten) || value.knoten.length > ROAD_PLAN_LIMITS.nodes || !Array.isArray(value.verbindungen) || value.verbindungen.length > ROAD_PLAN_LIMITS.edges) return fail("verkehr");
  const nodes = new Set<string>(), coordinates = new Set<string>(), edges = new Set<string>(), pairs = new Set<string>();
  const knoten = value.knoten.map((v: unknown, i): RoadPlanNode => {
    const path = `verkehr.knoten[${i}]`;
    if (!plain(v) || !closed(v, ["id", "name", "art", "position"]) || !id(v.id) || nodes.has(v.id)) return fail(path);
    if (typeof v.name !== "string" || !v.name.trim() || v.name.length > 80 || /[\u0000-\u001f\u007f-\u009f]/u.test(v.name)) return fail(`${path}.name`);
    if (!["tor", "platz", "wegpunkt"].includes(v.art as string)) return fail(`${path}.art`);
    if (!Array.isArray(v.position) || v.position.length !== 2 || !v.position.every(n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1)) return fail(`${path}.position`);
    const position: PlanPoint = [v.position[0], v.position[1]], key = JSON.stringify(position);
    if (coordinates.has(key)) return fail(`${path}.position`);
    coordinates.add(key); nodes.add(v.id);
    return { id: v.id, name: v.name.trim(), art: v.art as RoadPlanNode["art"], position };
  });
  const verbindungen = value.verbindungen.map((v: unknown, i): RoadPlanEdge => {
    const path = `verkehr.verbindungen[${i}]`;
    if (!plain(v) || !closed(v, ["id", "von", "nach", "art", "bruecke"]) || !id(v.id) || edges.has(v.id)) return fail(path);
    if (!id(v.von) || !id(v.nach) || !nodes.has(v.von) || !nodes.has(v.nach) || v.von === v.nach) return fail(`${path}.anschluss`);
    const pair = [v.von, v.nach].sort().join(":");
    if (pairs.has(pair)) return fail(`${path}.anschluss`);
    if (!["hauptstrasse", "gasse"].includes(v.art as string) || typeof v.bruecke !== "boolean") return fail(`${path}.art`);
    pairs.add(pair); edges.add(v.id);
    return { id: v.id, von: v.von, nach: v.nach, art: v.art as RoadPlanEdge["art"], bruecke: v.bruecke };
  });
  return { schemaVersion: 1, knoten, verbindungen, maxSteigung: value.maxSteigung as number };
}
