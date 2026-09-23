// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import type { SettlementPlan } from "@chronicle/szene";
import { planRolle, waehleMarkt, weiseRollenZu, type FleckLage } from "../src/stadt/viertel/rollen.ts";

const lage = (nr: number, x: number, y: number, extra: Partial<FleckLage> = {}): FleckLage => ({
  nr, punkt: [x, y], flaeche: 10, ferne: Math.hypot(x - 20, y - 20), nachbarn: [], ufer: false, trocken: true, kern: true, mauerRand: false, hoehe: 100, tor: false, ...extra,
});
const stadt = { art: "stadt" as const, burg: true, breite: 40, hoehe: 40 };
const lagen = [
  lage(0, 20, 20, { nachbarn: [1, 2, 3] }), lage(1, 24, 20, { nachbarn: [0], flaeche: 14 }), lage(2, 16, 20, { nachbarn: [0], flaeche: 9 }),
  lage(3, 20, 26, { nachbarn: [0], mauerRand: true, hoehe: 160 }), lage(4, 30, 30, { kern: false, ufer: true, tor: true }), lage(5, 10, 10, { kern: false, tor: true }),
];

describe("Viertelrollen", () => {
  it("legt den Markt in den mittigsten trockenen Fleck", () => expect(waehleMarkt(lagen, stadt)).toBe(0));
  it("legt keinen Markt ins Wasser", () => {
    expect(waehleMarkt(lagen.map(l => l.nr === 0 ? { ...l, trocken: false } : l), stadt)).not.toBe(0);
  });
  it("setzt Tempel an den Markt, Burg an die Mauer auf hohen Grund, Hafen ans Ufer", () => {
    const { rollen } = weiseRollenZu(lagen, 0, stadt);
    expect(rollen.get(0)).toBe("markt");
    expect(rollen.get(1)).toBe("tempel");
    expect(rollen.get(3)).toBe("burg");
    expect(rollen.get(4)).toBe("hafen");
    expect(rollen.size).toBe(lagen.length);
  });
  it("lässt den Zonenplan gewinnen, auch für Markt und Freifläche", () => {
    const plan: SettlementPlan = { schemaVersion: 1, zonen: [
      { id: "m", name: "Markt", nutzung: "markt", dichte: 1, polygon: [[.35, .45], [.45, .45], [.45, .55], [.35, .55]] },
      { id: "x", name: "Park", nutzung: "frei", dichte: 1, polygon: [[.55, .45], [.65, .45], [.65, .55], [.55, .55]] },
    ] };
    const a = { ...stadt, plan };
    expect(planRolle(plan, [16, 20], 40, 40)).toBe("markt");
    expect(waehleMarkt(lagen, a)).toBe(2);
    expect(weiseRollenZu(lagen, 2, a).rollen.get(1)).toBe("frei");
  });
  it("meldet eine gewünschte Burg ohne Mauerfleck, statt sie zu erzwingen", () => {
    const { rollen, ausgelassen } = weiseRollenZu(lagen.map(l => ({ ...l, mauerRand: false })), 0, stadt);
    expect([...rollen.values()]).not.toContain("burg");
    expect(ausgelassen.join(" ")).toContain("Burg");
  });
  it("gibt einem Dorf keinen Tempel und keine Burg", () => {
    const { rollen } = weiseRollenZu(lagen, 0, { ...stadt, art: "dorf", burg: false });
    expect([...rollen.values()]).not.toContain("tempel");
    expect([...rollen.values()]).not.toContain("burg");
  });
});
