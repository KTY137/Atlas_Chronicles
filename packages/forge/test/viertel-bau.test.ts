// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { parseSettlementPlan } from "@chronicle/szene";
import { rauschen } from "../src/kartenwerk.ts";
import { flaeche, imPolygon, schwerpunkt, type Polygon, type Punkt } from "../src/polygon.ts";
import { getrennteDaecher, type Gasse } from "../src/stadt/gemeinsam.ts";
import { bebaueFleck, type ParzellenAuftrag } from "../src/stadt/viertel/parzellen.ts";
import { baueBurg } from "../src/stadt/viertel/burg.ts";
import { flurStreifen } from "../src/stadt/viertel/flur.ts";
import { viertelBilden, viertelPlan } from "../src/stadt/viertel/namen.ts";

const zelle: Polygon = [[0, 0], [8, 0], [9, 6], [1, 7]];
const band = (von: Punkt, bis: Punkt, id: string): Gasse => ({ id, art: "gasse", a: 0, b: 0, von, bis, band: [von, bis, [bis[0], bis[1] + .3], [von[0], von[1] + .3]] });
const rand = [band([0, 0], [8, 0], "s1"), band([8, 0], [9, 6], "s2"), band([9, 6], [1, 7], "s3"), band([1, 7], [0, 0], "s4")];
const keim = "00112233445566778899aabbccddeeff";
const auftrag = (extra: Partial<ParzellenAuftrag> = {}): ParzellenAuftrag => {
  let n = 0;
  return { nr: 0, pfad: "fleck.0_0", zelle, rolle: "wohnen", vorstadt: false, art: "stadt", randStrassen: rand, abstaende: [.3, .3, .3, .3], losFlaeche: 1.6, strassenDichte: .5, hindernisse: [], nurAnHaupt: false, r: rauschen(keim), id: (...p) => `${p.join("/")}#${n++}`, ...extra };
};
const alleGetrennt = (baue: readonly { umriss: Polygon }[]) => {
  for (let i = 0; i < baue.length; i++) for (let j = i + 1; j < baue.length; j++) expect(getrennteDaecher(baue[i]!.umriss, baue[j]!.umriss)).toBe(true);
};

describe("Parzellen", () => {
  it("füllt ein Wohnviertel mit getrennten Häuserzeilen, jedes an einer genannten Straße", () => {
    const b = bebaueFleck(auftrag());
    expect(b.baue.length).toBeGreaterThan(10);
    const strassen = new Set([...rand, ...b.gassen].map(s => s.id));
    for (const x of b.baue) expect(strassen.has(x.strasse)).toBe(true);
    alleGetrennt(b.baue);
  });
  it("schneidet Gassen, wenn Blöcke zu groß werden", () => {
    expect(bebaueFleck(auftrag({ losFlaeche: .8, strassenDichte: 1 })).gassen.length).toBeGreaterThan(0);
  });
  it("bebaut ein Adelsviertel lockerer als ein Armenviertel", () => {
    expect(bebaueFleck(auftrag({ rolle: "adel" })).baue.length).toBeLessThan(bebaueFleck(auftrag({ rolle: "arm" })).baue.length);
  });
  it("macht den Markt einer Stadt zum Platz mit Rathaus", () => {
    const m = bebaueFleck(auftrag({ rolle: "markt" }));
    expect(m.baue.map(b => b.typ)).toContain("rathaus");
    expect(m.plaetze.reduce((s, p) => s + flaeche(p.polygon), 0)).toBeGreaterThan(flaeche(zelle) * .3);
  });
  it("stellt einen Dom mit Kreuzgrundriss in den Tempelbezirk", () => {
    const dom = bebaueFleck(auftrag({ rolle: "tempel" })).baue.find(b => b.typ === "kirche")!;
    expect(dom.umriss.length).toBe(12);
  });
  it("baut nichts ins Wasser", () => {
    const wasser: Polygon = [[4, -1], [10, -1], [10, 8], [4, 8]];
    const b = bebaueFleck(auftrag({ hindernisse: [wasser] }));
    expect(b.baue.length).toBeGreaterThan(0);
    for (const x of b.baue) expect(imPolygon(schwerpunkt(x.umriss), wasser)).toBe(false);
  });
  it("baut in der Vorstadt nur an Hauptstraßen", () => {
    const haupt = rand.map((s, i) => i === 0 ? { ...s, art: "hauptstrasse" as const } : s);
    const b = bebaueFleck(auftrag({ vorstadt: true, nurAnHaupt: true, randStrassen: haupt }));
    for (const x of b.baue) expect(x.strasse).toBe("s1");
  });
});
describe("Burg", () => {
  it("hat Bergfried, Kaserne, Ecktürme und eine Mauer mit Tor", () => {
    const b = baueBurg(auftrag({ rolle: "burg" }));
    const typen = b.baue.map(x => x.typ);
    expect(typen).toContain("burg");
    expect(typen).toContain("kaserne");
    expect(typen.filter(t => t === "turm").length).toBeGreaterThanOrEqual(3);
    expect(b.mauern.length).toBeGreaterThanOrEqual(4);
    expect(b.plaetze.length).toBeGreaterThan(0);
    alleGetrennt(b.baue);
  });
});
describe("Flur und Namen", () => {
  it("teilt Felder in parallele Streifen", () => {
    const s = flurStreifen(zelle, 5, rauschen(keim));
    expect(s.length).toBe(5);
    expect(s.reduce((a, p) => a + flaeche(p), 0)).toBeCloseTo(flaeche(zelle), 1);
  });
  it("benennt zusammenhängende Viertel einmal und macht daraus einen gültigen Zonenplan", () => {
    const lagen = [0, 1, 2].map(nr => ({ nr, zelle: [[nr * 4, 0], [nr * 4 + 4, 0], [nr * 4 + 4, 4], [nr * 4, 4]] as Polygon, nachbarn: [nr - 1, nr + 1].filter(x => x >= 0 && x <= 2), kern: true }));
    const rollen = new Map([[0, "handwerk" as const], [1, "handwerk" as const], [2, "markt" as const]]);
    const v = viertelBilden(lagen, rollen, [6, 2], rauschen(keim));
    expect(v.map(x => x.nutzung).sort()).toEqual(["handwerk", "markt"]);
    const plan = viertelPlan(v, new Map(lagen.map(l => [l.nr, l.zelle])), 12, 4);
    expect(() => parseSettlementPlan(plan)).not.toThrow();
    expect(plan.zonen.length).toBe(3);
  });
});
