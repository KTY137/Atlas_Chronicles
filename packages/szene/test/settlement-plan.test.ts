// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { parseSettlementPlan, planContains, planOverlaps, type SettlementPlan } from "../src/settlement-plan.ts";
const zone = () => ({ id: "west", name: "West", nutzung: "wohnen", dichte: .5, polygon: [[0, 0], [1, 0], [1, 1], [0, 1]] });
const plan = () => ({ schemaVersion: 1, zonen: [zone()] });
describe("versioned settlement masks", () => {
  it("normalizes winding and names without mutating input", () => {
    const p = plan(); p.zonen[0]!.polygon.reverse(); p.zonen[0]!.name = " West ";
    const parsed = parseSettlementPlan(p); expect(parsed.zonen[0]!.name).toBe("West");
    expect(planContains(parsed.zonen[0]!.polygon, [.5, .5])).toBe(true); expect(p.zonen[0]!.name).toBe(" West ");
  });
  for (const [name, value] of Object.entries({ null: null, array: [], version: { ...plan(), schemaVersion: 2 }, extra: { ...plan(), foreign: true }, tooMany: { schemaVersion: 1, zonen: Array.from({ length: 17 }, (_, i) => ({ ...zone(), id: String(i) })) }, duplicateIds: { schemaVersion: 1, zonen: [zone(), zone()] } })) {
    it(`rejects ${name}`, () => expect(() => parseSettlementPlan(value)).toThrow());
  }
  for (const [name, patch] of Object.entries({ noName: { name: " " }, longName: { name: "a".repeat(81) }, control: { name: "West\n" }, path: { id: "../x" }, density: { dichte: NaN }, negative: { dichte: -.1 }, high: { dichte: 1.01 }, unknown: { nutzung: "palace" }, extra: { arbitrary: true }, coordinates: { polygon: [[0, 0], [2, 0], [0, 1]] }, infinite: { polygon: [[0, 0], [Infinity, 0], [0, 1]] }, repeated: { polygon: [[0, 0], [1, 0], [1, 0], [0, 1]] }, line: { polygon: [[0, 0], [.5, .5], [1, 1]] }, crossing: { polygon: [[0, 0], [1, 1], [1, 0], [0, 1]] }, concave: { polygon: [[0, 0], [1, 0], [.4, .4], [1, 1], [0, 1]] } })) {
    it(`rejects zone ${name}`, () => expect(() => parseSettlementPlan({ schemaVersion: 1, zonen: [{ ...zone(), ...patch }] })).toThrow());
  }
  it("does not mistake a self-crossing star for a convex mask", () => {
    const p = Array.from({ length: 5 }, (_, i) => [.5 + .4 * Math.cos(i * 4 * Math.PI / 5), .5 + .4 * Math.sin(i * 4 * Math.PI / 5)]);
    expect(() => parseSettlementPlan({ schemaVersion: 1, zonen: [{ ...zone(), polygon: p }] })).toThrow();
  });
  it("contains boundaries but distinguishes touching from positive overlap", () => {
    const p = parseSettlementPlan(plan()).zonen[0]!.polygon;
    expect(planContains(p, [0, .5])).toBe(true); expect(planContains(p, [1.1, .5])).toBe(false);
    expect(planOverlaps(p, [[1, 0], [2, 0], [2, 1], [1, 1]])).toBe(false);
    expect(planOverlaps(p, [[.9, 0], [2, 0], [2, 1], [.9, 1]])).toBe(true);
  });
});
