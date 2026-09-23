// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { rauschen } from "../src/kartenwerk.ts";
import { flaeche, schnittKonvex, type Polygon } from "../src/polygon.ts";
import { raster } from "../src/stadt/modern/raster.ts";
import type { ParzellenAuftrag } from "../src/stadt/viertel/parzellen.ts";

const zelle: Polygon = [[0, 0], [30, 0], [30, 20], [0, 20]];
const innen: Polygon = [[.8, .8], [29.2, .8], [29.2, 19.2], [.8, 19.2]];
const auftrag = (hindernisse: Polygon[] = []): ParzellenAuftrag => ({ nr: 0, pfad: "f", zelle, rolle: "wohnen", vorstadt: false, art: "stadt", randStrassen: [], abstaende: [.8, .8, .8, .8],
  losFlaeche: 3.2, strassenDichte: .5, hindernisse, nurAnHaupt: false, r: rauschen("raster"), id: (...p: string[]) => p.join("/") });
const ueberlapp = (a: Polygon, b: Polygon) => flaeche(schnittKonvex(a, b)) > 1e-6;

/** Spec 2026-09-23-stadt-zukunft, Abschnitt 5.3: ein gedrehtes Raster je Stadtteil. */
describe("Raster im Stadtteil", () => {
  it("schneidet Blöcke, die sich weder überlappen noch Straßen berühren; Straßen überlappen einander nicht", () => {
    const r = raster(auftrag(), innen, [1, 0], 7, 9, 1);
    expect(r.bloecke.length).toBeGreaterThanOrEqual(6);
    for (const b of r.bloecke) for (const s of r.strassen) expect(ueberlapp(b.poly, s.band), `${b.pfad} / ${s.id}`).toBe(false);
    for (let i = 0; i < r.bloecke.length; i++) for (let j = i + 1; j < r.bloecke.length; j++) expect(ueberlapp(r.bloecke[i]!.poly, r.bloecke[j]!.poly)).toBe(false);
    for (let i = 0; i < r.strassen.length; i++) for (let j = i + 1; j < r.strassen.length; j++) expect(ueberlapp(r.strassen[i]!.band, r.strassen[j]!.band), `${r.strassen[i]!.id} / ${r.strassen[j]!.id}`).toBe(false);
    expect(new Set(r.strassen.map(s => s.id)).size).toBe(r.strassen.length);
  });
  it("dreht das Raster mit der Straße", () => {
    const r = raster(auftrag(), innen, [.8, .6], 7, 9, 1);
    expect(r.strassen.length).toBeGreaterThan(2);
    for (const s of r.strassen) {
      const dx = s.bis[0] - s.von[0], dy = s.bis[1] - s.von[1], l = Math.hypot(dx, dy), langs = Math.abs(dx * .8 + dy * .6) / l;
      expect(langs < .02 || langs > .98, s.id).toBe(true);
    }
  });
  it("legt keine Straße ins Wasser und behält nur Blöcke, die mindestens zu einem Drittel trocken sind", () => {
    const see: Polygon = [[12, 0], [18, 0], [18, 20], [12, 20]];
    const r = raster(auftrag([see]), innen, [1, 0], 7, 9, 1);
    for (const b of r.bloecke) expect(flaeche(schnittKonvex(b.poly, see)), b.pfad).toBeLessThanOrEqual(flaeche(b.poly) * .67);
    for (const s of r.strassen) expect(ueberlapp(s.band, see), s.id).toBe(false);
    expect(r.bloecke.length).toBeGreaterThan(0);
  });
});
