// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash } from "@chronicle/core";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, parseTacticalMapDocument, parseTacticalCartography, type SettlementPlan, type SettlementZone } from "@chronicle/szene";
import { erzeugeSiedlung } from "../src/siedlung.ts";
import { abstandPolygonStrecke, huelle } from "../src/polygon.ts";
import { roofZone, zoneBuilding, zoneDraw } from "../src/siedlung-plan.ts";
const pack = parseAssetpaket(readFileSync("assets/packs/pk.gemalt/paket.json", "utf8"));
const zone = (patch: Partial<SettlementZone> = {}): SettlementZone => ({ id: "plan", name: "West", nutzung: "handwerk", dichte: 1, polygon: [[0, 0], [1, 0], [1, 1], [0, 1]], ...patch });
const plan = (z = zone()): SettlementPlan => ({ schemaVersion: 1, zonen: [z] });
const generate = (planung?: SettlementPlan) => erzeugeSiedlung({ keim: "zones-regression", optionen: { art: "dorf", standort: "ebene", ...(planung ? { planung } : {}) } }, pack);
describe("zoned settlement generation", () => {
  it("actually assigns workshops, not only differently labelled houses", () => {
    const map = generate(plan()); expect(map.version).toBe("9"); expect(map.bauwerke.length).toBeGreaterThan(4);
    expect(map.bauwerke.every(b => ["schmiede", "werkstatt", "lager"].includes(b.typ))).toBe(true);
    expect(map.keim.optionen.planung).toEqual(plan());
    expect(map.bericht.planung?.zonen[0]?.anzahl).toBe(map.bauwerke.length);
    for (const node of map.knoten) expect(node.herkunft?.version).toBe("9");
  });
  it("a full clearing creates an honestly empty but valid map", () => {
    const map = generate(plan(zone({ nutzung: "frei" })));
    expect(map.bauwerke).toHaveLength(0); expect(map.knoten).toHaveLength(1);
    expect(map.cartography.regions.some(r => r.role === "building" || r.role === "lot")).toBe(false);
    expect(map.karte.geometry.places).toHaveLength(0);
    expect(() => parseTacticalMapDocument(map.karte)).not.toThrow();
    expect(() => parseTacticalCartography(map.cartography, map.karte)).not.toThrow();
  });
  it("density is deterministic, monotonic and affects actual building count", () => {
    const sparse = generate(plan(zone({ dichte: .3 }))), dense = generate(plan());
    expect(sparse.bauwerke.length).toBeGreaterThan(0); expect(sparse.bauwerke.length).toBeLessThan(dense.bauwerke.length);
    expect(new Set(dense.bauwerke.map(b => b.typ)).size).toBeGreaterThan(1);
    const outlines = new Set(dense.bauwerke.map(b => JSON.stringify(b.umriss)));
    expect(sparse.bauwerke.every(b => outlines.has(JSON.stringify(b.umriss)))).toBe(true);
    expect(generate(plan(zone({ dichte: .3 })))).toEqual(sparse);
    expect(sparse.keim.keimHash).not.toBe(dense.keim.keimHash);
  });
  it("an absent or empty plan preserves the old version and result", () => {
    const base = generate(); expect(base.version).toBe("8");
    expect(canonicalHash(base as never)).toBe("647532b9e471b04ae647f9d62bdf1631509ab3f6f3da4f6e18be608bcf39e6f8");
    expect(generate({ schemaVersion: 1, zonen: [] })).toEqual(base);
    expect(base.keim.optionen).not.toHaveProperty("planung");
  });
  it("a plan does not reshape the terrain or original road bands", () => {
    const a = generate(), b = generate(plan());
    expect(b.cartography.relief).toEqual(a.cartography.relief);
    const roads = (map: typeof a) => map.strassen.filter(s => s.art === "hauptstrasse").map(s => JSON.stringify(s.umriss)).sort();
    expect(roads(b)).toEqual(roads(a));
  });
  it("harbor zones away from actual water explicitly stay empty", () => {
    const base = generate(), waters = base.cartography.regions.filter(r => r.role === "water").map(r => base.karte.geometry.regions.find(g => g.id === r.regionId)!.punkte.map(([x,y]) => [x / 96, y / 96] as const));
    const dry = base.bauwerke.find(b => waters.every(poly => poly.every((p,i) => abstandPolygonStrecke(b.umriss,p,poly[(i+1)%poly.length]!) > 4)));
    expect(dry).toBeDefined(); const [x0,y0,x1,y1] = huelle(dry!.umriss);
    const polygon = [[x0/36,y0/28],[x1/36,y0/28],[x1/36,y1/28],[x0/36,y1/28]] as const;
    const map = generate(plan(zone({ nutzung: "hafen", polygon })));
    expect(map.bericht.planung?.zonen[0]?.anzahl).toBe(0); expect(map.bericht.planung?.verworfen).toBeGreaterThan(0);
  });
  it("local density/type draws include the complete path and purpose", () => {
    const values = Array.from({length:40},(_,i) => zoneDraw("a".repeat(64),`plot-${i}`,"density"));
    expect(new Set(values).size).toBe(40); expect(values.every(x => x >= 0 && x < 1)).toBe(true);
    expect(zoneDraw("a".repeat(64), "plot-0", "type")).not.toBe(values[0]);
  });
  it("rejects direct malformed calls, not only HTTP requests", () => expect(() => generate({ schemaVersion: 2 } as never)).toThrow());
  it("protects the full roof, even if its centroid is outside the clearing", () => {
    const mask = plan(zone({ nutzung: "frei", polygon: [[.4, .4], [.6, .4], [.6, .6], [.4, .6]] }));
    expect(roofZone(mask, [[.1, .1], [.5, .1], [.5, .5], [.1, .5]])).toBe("excluded");
    expect(roofZone(mask, [[0, 0], [.1, 0], [.1, .1], [0, .1]])).toBeUndefined();
  });
  it("uses the last covering zone but never overrides a clearing", () => {
    const p: SettlementPlan = { schemaVersion: 1, zonen: [zone(), zone({ id: "second", nutzung: "markt" })] }, roof = [[.2,.2],[.3,.2],[.3,.3],[.2,.3]] as const;
    expect(roofZone(p, roof)).toMatchObject({ id: "second" });
    expect(roofZone({ ...p, zonen: [zone({ dichte: 0 }), p.zonen[1]!] }, roof)).toMatchObject({ id: "second" });
    expect(roofZone({ ...p, zonen: [zone({ nutzung: "frei" }), ...p.zonen] }, roof)).toBe("excluded");
  });
  it("uses era-specific building programs and rejects building on clearings", () => {
    expect(zoneBuilding(zone(), "gegenwart", .1)).toBe("werkstatt");
    expect(zoneBuilding(zone({ nutzung: "hafen" }), "scifi", .1)).toBe("raumhafen");
    expect(() => zoneBuilding(zone({ nutzung: "frei" }), "fantasy", .1)).toThrow();
  });
});
