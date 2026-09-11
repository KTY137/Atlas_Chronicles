// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.

/** Generation constraints, not a second map document. Coordinates are fractions of the map.
 * Order is meaningful: the last covering zone wins; no-build polygons always take precedence. */
export const SETTLEMENT_USES = ["wohnen", "markt", "handwerk", "hafen", "adel", "arm", "frei"] as const;
export type SettlementUse = typeof SETTLEMENT_USES[number];
export type PlanPoint = readonly [number, number];
export interface SettlementZone {
  readonly id: string;
  readonly name: string;
  readonly nutzung: SettlementUse;
  readonly dichte: number;
  readonly polygon: readonly PlanPoint[];
}
export interface SettlementPlan { readonly schemaVersion: 1; readonly zonen: readonly SettlementZone[] }
export const SETTLEMENT_PLAN_LIMITS = { zones: 16, vertices: 32 } as const;
const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const keys = (v: Record<string, unknown>, names: readonly string[]) => Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const cross = (a: PlanPoint, b: PlanPoint, c: PlanPoint) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

export class SettlementPlanError extends Error {
  constructor(readonly path: string) { super(`Ungültiger Zonenplan: ${path}.`); this.name = "SettlementPlanError"; }
}
export function parseSettlementPlan(value: unknown): SettlementPlan {
  const fail = (path: string): never => { throw new SettlementPlanError(path); };
  if (!plain(value) || !keys(value, ["schemaVersion", "zonen"]) || value.schemaVersion !== 1 || !Array.isArray(value.zonen) || value.zonen.length > SETTLEMENT_PLAN_LIMITS.zones) return fail("planung");
  const ids = new Set<string>();
  const zonen = value.zonen.map((zone: unknown, i): SettlementZone => {
    const path = `planung.zonen[${i}]`;
    if (!plain(zone) || !keys(zone, ["id", "name", "nutzung", "dichte", "polygon"])) return fail(path);
    if (typeof zone.id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(zone.id) || ids.has(zone.id)) return fail(`${path}.id`);
    ids.add(zone.id);
    if (typeof zone.name !== "string" || !zone.name.trim() || zone.name.length > 80 || /[\u0000-\u001f\u007f-\u009f]/u.test(zone.name)) return fail(`${path}.name`);
    if (!SETTLEMENT_USES.some(x => x === zone.nutzung)) return fail(`${path}.nutzung`);
    if (typeof zone.dichte !== "number" || !Number.isFinite(zone.dichte) || zone.dichte < 0 || zone.dichte > 1) return fail(`${path}.dichte`);
    if (!Array.isArray(zone.polygon) || zone.polygon.length < 3 || zone.polygon.length > SETTLEMENT_PLAN_LIMITS.vertices) return fail(`${path}.polygon`);
    const polygon: PlanPoint[] = zone.polygon.map((p: unknown) => {
      if (!Array.isArray(p) || p.length !== 2 || !p.every(n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1)) return fail(`${path}.polygon`);
      return [p[0], p[1]];
    });
    // Every other vertex must lie strictly on the same side of each edge. This excludes
    // concavity, duplicate/collinear points AND self-crossing stars (turn signs alone do not).
    const sign = Math.sign(cross(polygon[0]!, polygon[1]!, polygon[2]!));
    if (!sign || polygon.some((a, j) => polygon.some((p, k) => k !== j && k !== (j + 1) % polygon.length && cross(a, polygon[(j + 1) % polygon.length]!, p) * sign <= 1e-10))) return fail(`${path}.polygon`);
    if (sign < 0) polygon.reverse();
    return { id: zone.id, name: zone.name.trim(), nutzung: zone.nutzung as SettlementUse, dichte: zone.dichte, polygon };
  });
  return { schemaVersion: 1, zonen };
}
/** Inclusive containment of a point in a validated convex planning polygon. */
export function planContains(polygon: readonly PlanPoint[], point: PlanPoint): boolean {
  return polygon.every((p, i) => cross(p, polygon[(i + 1) % polygon.length]!, point) >= -1e-10);
}
/** SAT against convex planning masks. The subject may be concave: its convex hull makes
 * exclusion conservative, never allowing a roof to cross a protected clearing. */
export function planOverlaps(a: readonly PlanPoint[], b: readonly PlanPoint[]): boolean {
  for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!, q = poly[(i + 1) % poly.length]!, nx = q[1] - p[1], ny = p[0] - q[0];
    const aa = a.map(v => v[0] * nx + v[1] * ny), bb = b.map(v => v[0] * nx + v[1] * ny);
    if (Math.max(...aa) <= Math.min(...bb) + 1e-10 || Math.max(...bb) <= Math.min(...aa) + 1e-10) return false;
  }
  return true;
}
