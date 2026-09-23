// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, parseTacticalCartography, serializeTacticalMapDocument } from "@chronicle/szene";
import { erzeugeSiedlung, SIEDLUNG_LIMITS, SIEDLUNG_VIERTEL_VERSION } from "../src/siedlung.ts";
import { getrennteDaecher } from "../src/stadt/gemeinsam.ts";

const paket = parseAssetpaket(readFileSync(fileURLToPath(new URL("../../../assets/packs/pk.grundriss/paket.json", import.meta.url)), "utf8"));
const stadt = (keim: string, extra: Record<string, unknown> = {}) => erzeugeSiedlung({ keim, optionen: { art: "stadt", ...extra } }, paket);
const STANDORTE = ["ebene", "huegel", "wald", "gebirge", "fluss", "see", "moor", "kueste", "insel"] as const;

describe("Fantasy-Stadt aus Vierteln (v11)", () => {
  it("trägt die neue Version und Mauer/Burg im Keim", () => {
    const s = stadt("v11:a");
    expect(s.version).toBe(SIEDLUNG_VIERTEL_VERSION);
    expect(s.keim.optionen).toMatchObject({ mauer: true, burg: true });
  });
  it("hat Markt mit Rathaus, Dom, Burg mit Kaserne, Türme, eine Mauer und benannte Viertel", () => {
    const s = stadt("v11:b");
    const typen = s.bauwerke.map(b => b.typ);
    for (const t of ["rathaus", "kirche", "burg", "turm", "kaserne", "taverne"]) expect(typen, t).toContain(t);
    expect(typen.filter(t => t === "turm").length).toBeGreaterThanOrEqual(8);
    expect(s.cartography.labels?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(s.bericht.viertel?.some(v => v.nutzung === "markt")).toBe(true);
    expect(s.karte.walls.length).toBeGreaterThan(10);
    expect(new Set(s.bauwerke.map(b => b.titel)).size).toBe(s.bauwerke.length);
  });
  it("lässt Mauer und Burg auf Wunsch weg", () => {
    const s = stadt("v11:c", { mauer: false, burg: false });
    expect(s.bauwerke.some(b => b.typ === "burg")).toBe(false);
    expect(s.bauwerke.some(b => b.typ === "turm")).toBe(false);
    expect(s.keim.optionen).toMatchObject({ mauer: false, burg: false });
  });
  it("gibt einem Dorf Kirche und Taverne am Anger, aber keine Mauer", () => {
    const d = erzeugeSiedlung({ keim: "v11:dorf", optionen: { art: "dorf" } }, paket);
    const typen = d.bauwerke.map(b => b.typ);
    expect(typen).toContain("kirche");
    expect(typen).toContain("taverne");
    expect(d.karte.walls.length).toBe(0);
  });
  // Je Standort ein eigener Test: ein einziger Lauf über alle 54 Städte blockierte den Worker so
  // lange, dass Vitest seine Rückmeldung verlor ("Timeout calling onTaskUpdate").
  it.each(STANDORTE)("liefert am Standort %s gültige Karten ohne Überlappung, alles an benannten Straßen", standort => {
    for (const art of ["weiler", "dorf", "stadt"] as const) for (let i = 0; i < 2; i++) {
      const s = erzeugeSiedlung({ keim: `v11:${standort}:${art}:${i}`, optionen: { art, standort } }, paket);
      const wo = `${standort}/${art}/${i}`;
      expect(s.bauwerke.length, wo).toBeGreaterThan(0);
      const strassen = new Set(s.strassen.map(x => x.id));
      for (const b of s.bauwerke) expect(strassen.has(b.strasse), `${wo} ${b.pfad}`).toBe(true);
      for (let a = 0; a < s.bauwerke.length; a++) for (let c = a + 1; c < s.bauwerke.length; c++)
        expect(getrennteDaecher(s.bauwerke[a]!.umriss, s.bauwerke[c]!.umriss), `${wo} ${s.bauwerke[a]!.pfad} / ${s.bauwerke[c]!.pfad}`).toBe(true);
      expect(() => parseTacticalCartography(s.cartography, s.karte), wo).not.toThrow();
    }
  }, 60_000);
  it("hält die Großstadt im Budget", () => {
    const t0 = performance.now();
    const s = erzeugeSiedlung({ keim: "v11:gross", optionen: { art: "stadt", ausdehnung: [88, 64], bauwerke: 480 } }, paket);
    const dauer = performance.now() - t0;
    expect(s.karte.geometry.regions.length).toBeLessThan(4096);
    expect(serializeTacticalMapDocument(s.karte).length).toBeLessThan(1024 * 1024);
    expect(s.bauwerke.length).toBeGreaterThan(300);
    expect(dauer).toBeLessThan(6000);
  }, 60_000);
  it("erlaubt bis zu 512 Gebäude", () => expect(SIEDLUNG_LIMITS.bauwerkeMax).toBe(512));
  it("übernimmt den eigenen Viertelplan, ohne das Layout umzuwürfeln", () => {
    const a = stadt("v11:plan"), plan = a.bericht.viertelPlan!;
    expect(plan.zonen.length).toBeGreaterThan(0);
    const b = stadt("v11:plan", { planung: plan });
    expect(b.version).toBe(SIEDLUNG_VIERTEL_VERSION);
    expect(b.bericht.viertel?.map(v => v.nutzung).sort()).toEqual(a.bericht.viertel?.map(v => v.nutzung).sort());
  });
});
