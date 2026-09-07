// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parseAssetpaket, parseTacticalMapDocument, pruefeContainment, serializeTacticalMapDocument,
  type AssetpaketV1, type Knoten,
} from "@chronicle/szene";
import { trustKnotenId } from "@chronicle/core";
import { GrundrissError } from "../src/kartenwerk.ts";
import { SIEDLUNG_STANDARD, erzeugeSiedlung, type Siedlung, type SiedlungBauwerk, type SiedlungStrasse } from "../src/siedlung.ts";

/**
 * Gate **A-G5 · Die Siedlung** — the scale between a generated world and a single building.
 *
 * `erzeugeGrundriss` and `erzeugeHoehle` both answer "what is inside one building". This file
 * asks the question one level up: where does the building stand, and does the settlement it
 * stands in obey the same contracts everything else in `@chronicle/forge` already does.
 *
 *  - **Determinism over the whole option vector, not the seed** (RB-21d:234, `keim.test.ts`'s own
 *    limit). Identical vector ⇒ byte-identical document and identical ids; any changed option,
 *    including the settlement kind and the asset pack's version, ⇒ a different `keimHash`.
 *  - **The address, not the picture.** Every building is a `Knoten` that `pruefeContainment`
 *    accepts under a parent, rooted as `ort` with children rooted as `bauwerk` — the same kind
 *    `erzeugeGrundriss` mints for a single building, one containment level up. Each carries a
 *    distinct, stable `kindKeim`: the address a later `erzeugeGrundriss` call would consume to
 *    grow that building's own floorplan (`kette.test.ts` exercises the matching descent).
 *  - **Nobody is walled in.** A settlement generator that produces landlocked buildings has built
 *    a diagram, not a settlement. So every building must share a real edge with a street region,
 *    verified independently off the emitted geometry rather than trusted from internal bookkeeping.
 *
 * The pack is the real `assets/packs/pk.grundriss`, matching every sibling gate in this package.
 */

const PAKET_DIR = fileURLToPath(new URL("../../../assets/packs/pk.grundriss/", import.meta.url));
const paket: AssetpaketV1 = parseAssetpaket(readFileSync(`${PAKET_DIR}paket.json`, "utf8"));

const bauen = (keim: string, optionen: Partial<typeof SIEDLUNG_STANDARD> = {}): Siedlung =>
  erzeugeSiedlung({ keim, titel: "Prüfsiedlung", optionen }, paket);

const SAATEN = ["eron:marktflecken:1", "eron:aussenposten:2", "andaria/furt-3", "0", "ß-umlaut-keim", "x".repeat(200)];

/**
 * Geometrie **eigenständig** nachgerechnet, nicht aus `src/polygon.ts` importiert.
 *
 * Seit Fassung 2 sind Bauwerke Polygone, und die Versuchung wäre, hier dieselben Helfer zu
 * benutzen, die der Erzeuger benutzt. Dann prüfte der Test aber nur, dass eine Funktion mit sich
 * selbst übereinstimmt: ein Vorzeichenfehler im Abstandsmass wäre auf beiden Seiten derselbe und
 * bliebe unsichtbar. Zwei Zeilen doppelt sind billiger als ein Test, der nichts behauptet.
 */
type Umriss = readonly (readonly [number, number])[];

function punktStreckeAbstand(p: readonly [number, number], a: readonly [number, number], b: readonly [number, number]): number {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const qq = vx * vx + vy * vy;
  const t = qq < 1e-12 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / qq));
  return Math.hypot(a[0] + vx * t - p[0], a[1] + vy * t - p[1]);
}

/** Kleinster Abstand zweier Polygone, stumpf über alle Ecken-Kanten-Paare beider Richtungen. */
function polygonAbstand(a: Umriss, b: Umriss): number {
  let klein = Infinity;
  for (const [von, nach] of [[a, b], [b, a]] as const) {
    for (const p of von) {
      for (let i = 0, j = nach.length - 1; i < nach.length; j = i++) {
        klein = Math.min(klein, punktStreckeAbstand(p, nach[j]!, nach[i]!));
      }
    }
  }
  return klein;
}

/**
 * Ein Bauwerk liegt an einer Straße, wenn es höchstens eine Hoftiefe davon entfernt ist.
 *
 * Nicht „berührt" wie beim Rechteckraster: ein Haus steht seit Fassung 2 auf einer Parzelle und
 * hat einen Vorgarten davor. Die Aussage bleibt dieselbe — kein Haus ist eingemauert — nur das
 * Mass passt jetzt zur Geometrie. Die Schwelle ist grosszügiger als die des Erzeugers
 * (halbe Gassenbreite plus eins), damit der Test die Zusage prüft und nicht die Rechnung.
 */
const HOFTIEFE_MAX = 2;
const liegtAnStrasse = (bau: Umriss, strasse: Umriss): boolean => polygonAbstand(bau, strasse) <= HOFTIEFE_MAX;

/** Zwei konvexe Polygone sind disjunkt: Separating-Axis über die Kantennormalen beider. */
function getrennt(a: Umriss, b: Umriss): boolean {
  for (const [eins, zwei] of [[a, b], [b, a]] as const) {
    for (let i = 0, j = eins.length - 1; i < eins.length; j = i++) {
      const nx = eins[i]![1] - eins[j]![1], ny = eins[j]![0] - eins[i]![0];
      let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
      for (const p of eins) { const d = nx * p[0] + ny * p[1]; aMin = Math.min(aMin, d); aMax = Math.max(aMax, d); }
      for (const p of zwei) { const d = nx * p[0] + ny * p[1]; bMin = Math.min(bMin, d); bMax = Math.max(bMax, d); }
      if (aMax <= bMin + 1e-7 || bMax <= aMin + 1e-7) return true;
    }
  }
  return false;
}

describe("A-G5 · Siedlung — Determinismus über den vollständigen Optionsvektor", () => {
  it("liefert zweimal dasselbe Dokument, dieselben Ids und denselben Bericht", () => {
    const a = bauen("eron:marktflecken:1");
    const b = bauen("eron:marktflecken:1");
    expect(serializeTacticalMapDocument(b.karte)).toBe(serializeTacticalMapDocument(a.karte));
    expect(b.keim.keimHash).toBe(a.keim.keimHash);
    expect(b.wurzelId).toBe(a.wurzelId);
    expect(b.knoten.map((k) => k.id)).toStrictEqual(a.knoten.map((k) => k.id));
    expect(b.bauwerke).toStrictEqual(a.bauwerke);
    expect(b.strassen).toStrictEqual(a.strassen);
    expect(b.bericht).toStrictEqual(a.bericht);
  });

  it("mintet für einen anderen Keim eine andere Siedlung", () => {
    const a = bauen("eron:marktflecken:1");
    const b = bauen("eron:marktflecken:2");
    expect(b.keim.keimHash).not.toBe(a.keim.keimHash);
    expect(new Set(b.knoten.map((k) => k.id)).size).toBe(b.knoten.length);
    expect(b.knoten.filter((k) => a.knoten.some((x) => x.id === k.id))).toHaveLength(0);
  });

  for (const [name, optionen] of [
    ["Ausdehnung", { ausdehnung: [40, 30] as const }],
    ["Zellgröße", { zellgroesse: 128 }],
    ["Bauwerkzahl", { bauwerke: 9 }],
    ["Straßendichte", { strassenDichte: 0.6 }],
    ["Grundstück", { grundstueck: [4, 7] as const }],
    ["Licht", { licht: false }],
    ["Siedlungsart", { art: "stadt" as const }],
  ] as const) {
    it(`behandelt eine geänderte Option „${name}" als andere Siedlung, nicht als dieselbe`, () => {
      const a = bauen("eron:marktflecken:1");
      const b = bauen("eron:marktflecken:1", optionen);
      expect(b.keim.keimHash).not.toBe(a.keim.keimHash);
      expect(b.wurzelId).not.toBe(a.wurzelId);
    });
  }

  it("behandelt eine Siedlungsart auch dann als andere Welt, wenn die Zahlen manuell angeglichen sind", () => {
    // `art` also picks the street surface (dirt vs paved stone), so it must stay load-bearing in
    // the option vector even when every numeric field is forced to agree between two kinds.
    const gemeinsam = { ausdehnung: [30, 24] as const, bauwerke: 8, strassenDichte: 0.3, grundstueck: [3, 5] as const, licht: true };
    const a = bauen("eron:marktflecken:1", { ...gemeinsam, art: "dorf" });
    const b = bauen("eron:marktflecken:1", { ...gemeinsam, art: "stadt" });
    expect(b.keim.keimHash).not.toBe(a.keim.keimHash);
  });

  it("zählt das Assetpaket zum Optionsvektor — ein Paket-Bump ist eine andere Siedlung", () => {
    const gebumpt: AssetpaketV1 = parseAssetpaket({ ...paket, version: `${Number(paket.version.split(".")[0]) + 1}.0.0` });
    const a = erzeugeSiedlung({ keim: "eron:marktflecken:1" }, paket);
    const b = erzeugeSiedlung({ keim: "eron:marktflecken:1" }, gebumpt);
    expect(b.keim.keimHash).not.toBe(a.keim.keimHash);
    expect(b.wurzelId).not.toBe(a.wurzelId);
  });

  it("legt Keim, Version und Paketidentität offen im Keimvektor ab", () => {
    const g = bauen("eron:marktflecken:1");
    expect(g.keim.generator).toBe("chronicle-siedlung");
    expect(g.keim.seed).toBe("eron:marktflecken:1");
    expect(g.keim.optionen.paket).toStrictEqual({ id: paket.id, version: paket.version, zellgroesse: paket.zellgroesse });
    expect(g.keim.keimHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("A-G5 · Siedlung — das Dokument ist ein gewöhnliches TacticalMapDocument", () => {
  it("wird vom kanonischen Parser angenommen und serialisiert stabil", () => {
    const g = bauen("eron:aussenposten:2");
    const wieder = parseTacticalMapDocument(serializeTacticalMapDocument(g.karte));
    expect(serializeTacticalMapDocument(wieder)).toBe(serializeTacticalMapDocument(g.karte));
    expect(wieder.background).toBeNull();
    expect(wieder.walls).toStrictEqual([]);
    expect(wieder.portals).toStrictEqual([]);
  });

  it("vergibt jede Geometrie-Id genau einmal, über Bauwerke und Straßen hinweg", () => {
    for (const keim of SAATEN) {
      const g = bauen(keim);
      const ids = [
        ...g.karte.geometry.stamps.map((s) => s.id), ...g.karte.geometry.regions.map((r) => r.id),
        ...g.karte.geometry.places.map((p) => p.id), ...g.karte.lights.map((l) => l.id),
      ];
      expect(new Set(ids).size, keim).toBe(ids.length);
    }
  });

  it("hält jedes Stück Geometrie innerhalb der Karte", () => {
    for (const keim of SAATEN) {
      const g = bauen(keim);
      const [breite, hoehe] = g.karte.geometry.size;
      const drin = (p: readonly [number, number]) => p[0] >= 0 && p[1] >= 0 && p[0] <= breite && p[1] <= hoehe;
      for (const region of g.karte.geometry.regions) for (const p of region.punkte) expect(drin(p), `${keim}: Region ${region.id}`).toBe(true);
      for (const stamp of g.karte.geometry.stamps) expect(drin([stamp.x, stamp.y]), `${keim}: Stamp ${stamp.id}`).toBe(true);
    }
  });
});

describe("A-G5 · Siedlung — jedes Bauwerk bekommt eine Adresse", () => {
  it("hängt sich unter einen Elternknoten und besteht die Containment-Prüfung", () => {
    const weltId = trustKnotenId("welt-siedlungspruefstand");
    const g = erzeugeSiedlung({
      keim: "andaria/furt-3", titel: "Marktflecken",
      eltern: { knotenId: weltId, art: "liegt_in_geografie", bei: [500, 300], massstab: 20 },
    }, paket);
    const welt: Knoten = {
      id: weltId, art: "welt", titel: "Prüfwelt", eltern: [],
      rahmen: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
      anker: null, herkunft: null, sichtAnker: null,
    };
    expect(pruefeContainment([welt, ...g.knoten])).toStrictEqual([]);
    const wurzel = g.knoten.find((k) => k.id === g.wurzelId)!;
    expect(wurzel.art).toBe("ort");
    expect(wurzel.titel).toBe("Marktflecken");
    expect(wurzel.eltern).toStrictEqual([{ von: g.wurzelId, nach: weltId, art: "liegt_in_geografie" }]);
    expect(wurzel.anker).toStrictEqual({ in: weltId, bei: [500, 300], massstab: 20 });
  });

  it("bleibt ohne Elternteil ein Fragment und behauptet keine Wurzel", () => {
    const g = bauen("andaria/furt-3");
    const wurzel = g.knoten.find((k) => k.id === g.wurzelId)!;
    expect(wurzel.eltern).toStrictEqual([]);
    expect(wurzel.anker).toBeNull();
    expect(pruefeContainment([...g.knoten]).map((v) => v.art)).toContain("fehlender-raumelter");
  });

  it("wurzelt als `ort` und verankert jedes Bauwerk als `bauwerk` — die Leiter aus model.ts", () => {
    for (const keim of SAATEN) {
      const g = bauen(keim);
      const bauwerkKnoten = g.knoten.filter((k) => k.art === "bauwerk");
      expect(bauwerkKnoten, keim).toHaveLength(g.bauwerke.length);
      expect(bauwerkKnoten.length, keim).toBeGreaterThan(0);
      for (const knoten of bauwerkKnoten) {
        expect(knoten.anker?.in, keim).toBe(g.wurzelId);
        expect(knoten.herkunft?.keimHash, keim).toBe(g.keim.keimHash);
        expect(knoten.herkunft?.erzeugungspfad[0], keim).toBe("bauwerk");
        expect(knoten.titel, keim).toBeNull(); // der Erzeuger schreibt Türen, keine Artikel
        expect(knoten.sichtAnker, keim).toBeNull();
      }
    }
  });

  it("benutzt die KnotenId jedes Bauwerks als Region-Id — eine Sache, eine Identität", () => {
    const g = bauen("eron:marktflecken:1");
    const regionIds = new Set(g.karte.geometry.regions.map((r) => r.id));
    for (const b of g.bauwerke) {
      expect(regionIds.has(b.id)).toBe(true);
      const region = g.karte.geometry.regions.find((r) => r.id === b.id)!;
      // Schärfer als die alte Zusage „vier Ecken": die Region ist Punkt für Punkt der Umriss des
      // Bauwerks, in Pixeln. Ein Polygon hat keine feste Eckenzahl, aber es hat eine Identität.
      expect(region.punkte.length).toBeGreaterThanOrEqual(3);
      expect(region.punkte.length).toBe(b.umriss.length);
      const z = g.karte.grid.kind === "square" ? g.karte.grid.size : 0;
      expect(region.punkte.map((p) => p.join(":"))).toStrictEqual(
        b.umriss.map((p) => [Math.round(p[0] * z * 1000) / 1000, Math.round(p[1] * z * 1000) / 1000].join(":")));
    }
  });

  it("gibt jedem Bauwerk einen eigenen, stabilen Kindkeim", () => {
    const a = bauen("eron:marktflecken:1");
    const b = bauen("eron:marktflecken:1");
    const kindKeimeA = a.knoten.filter((k) => k.art === "bauwerk").map((k) => k.herkunft!.kindKeim!);
    const kindKeimeB = b.knoten.filter((k) => k.art === "bauwerk").map((k) => k.herkunft!.kindKeim!);
    expect(kindKeimeA.every((k) => /^[a-f0-9]{32}$/.test(k))).toBe(true);
    expect(new Set(kindKeimeA).size).toBe(kindKeimeA.length); // distinct within one settlement
    expect(kindKeimeB).toStrictEqual(kindKeimeA); // stable across two runs of the same seed
  });
});

describe("A-G5 · Siedlung — niemand ist eingemauert", () => {
  const laeufe = SAATEN.flatMap((keim) => [
    { keim, g: bauen(keim) },
    { keim: `${keim}:stadt`, g: bauen(keim, { art: "stadt" }) },
    { keim: `${keim}:weiler`, g: bauen(keim, { art: "weiler" }) },
  ]);

  it("berührt jedes Bauwerk eine Straße — keine Lücke zwischen Parzelle und Fahrbahn", () => {
    for (const { keim, g } of laeufe) {
      expect(g.bauwerke.length, keim).toBeGreaterThan(0);
      for (const b of g.bauwerke) {
        // Zusätzlich zur blossen Nähe: die Straße, die das Bauwerk **nennt**, muss es auch sein.
        // Eine Adresse, die auf eine andere Gasse zeigt als die vor der Tür, ist eine falsche Adresse.
        const genannte = g.strassen.find((s) => s.id === b.strasse);
        expect(genannte, `${keim}: ${b.pfad} nennt Straße ${b.strasse}, die es nicht gibt`).toBeTruthy();
        expect(liegtAnStrasse(b.umriss, genannte!.umriss), `${keim}: ${b.pfad} liegt ${polygonAbstand(b.umriss, genannte!.umriss).toFixed(2)} Zellen von seiner Straße`).toBe(true);
      }
    }
  });

  it("überlappt keine zwei Bauwerke", () => {
    for (const { keim, g } of laeufe) {
      for (const a of g.bauwerke) for (const b of g.bauwerke) {
        if (a.id === b.id) continue;
        expect(getrennt(a.umriss, b.umriss), `${keim}: ${a.pfad} vs ${b.pfad}`).toBe(true);
      }
    }
  });

  it("liefert für jede Straße eine echte Region, unterscheidbar von jedem Bauwerk", () => {
    for (const { keim, g } of laeufe) {
      const bauwerkIds = new Set<string>(g.bauwerke.map((b) => b.id));
      for (const s of g.strassen) {
        expect(bauwerkIds.has(s.id), keim).toBe(false);
        expect(g.karte.geometry.regions.some((r) => r.id === s.id), keim).toBe(true);
      }
    }
  });
});

describe("A-G5 · Siedlung — Adressen kollidieren nicht über viele Saaten", () => {
  it("mintet über 30 unabhängige Saaten keine doppelte Id", () => {
    const alleIds: string[] = [];
    let gesamt = 0;
    for (let i = 0; i < 30; i++) {
      const g = bauen(`kollisionstest:${i}`);
      alleIds.push(g.wurzelId, ...g.bauwerke.map((b) => b.id));
      gesamt += 1 + g.bauwerke.length;
    }
    expect(new Set(alleIds).size).toBe(gesamt);
  });

  it("bedient mit dem echten Paket jede Themenanfrage", () => {
    for (const keim of SAATEN) expect(bauen(keim).bericht.nichtBedient, keim).toStrictEqual([]);
  });

  it("zählt seinen Bericht gegen das gelieferte Dokument", () => {
    const g = bauen("eron:marktflecken:1");
    expect(g.bericht.bauwerke).toBe(g.bauwerke.length);
    expect(g.bericht.strassen).toBe(g.strassen.length);
    expect(g.bericht.stamps).toBe(g.karte.geometry.stamps.length);
    expect(Object.values(g.bericht.stampsNachArt).reduce((a, b) => a + b, 0)).toBe(g.bericht.stamps);
  });

  it("nennt, was es nicht tut", () => {
    const ausgelassen = bauen("eron:marktflecken:1").bericht.ausgelassen.join(" ");
    for (const wort of ["Gebäudeinnenräume", "Türen", "Gewerbe", "Artikel"]) expect(ausgelassen, wort).toContain(wort);
  });
});

describe("A-G5 · Siedlung — Eigenschaften über den Optionsraum, nicht über eine Saat", () => {
  const faelle = Array.from({ length: 18 }, (_, i) => ({
    keim: `raster:${i}`,
    optionen: {
      art: (["weiler", "dorf", "stadt"] as const)[i % 3]!,
      ausdehnung: [24 + (i % 7) * 4, 18 + (i % 5) * 3] as [number, number],
      zellgroesse: [48, 96, 128][i % 3]!,
      bauwerke: 3 + i,
      strassenDichte: (i % 5) / 4,
      grundstueck: [2 + (i % 3), 5 + (i % 4)] as [number, number],
      licht: i % 2 === 0,
    },
  }));

  it("liefert für jede Konfiguration eine gültige, straßenverbundene Siedlung", () => {
    for (const fall of faelle) {
      const g = erzeugeSiedlung(fall, paket);
      const wo = `${fall.keim} ${JSON.stringify(fall.optionen)}`;
      expect(g.bauwerke.length, wo).toBeGreaterThan(0);
      for (const b of g.bauwerke) {
        expect(g.strassen.some((s) => liegtAnStrasse(b.umriss, s.umriss)), `${wo} · ${b.pfad}`).toBe(true);
      }
      expect(serializeTacticalMapDocument(g.karte).length, wo).toBeGreaterThan(0);
    }
  });

  it("bleibt über den ganzen Optionsraum deterministisch", () => {
    for (const fall of faelle) {
      expect(serializeTacticalMapDocument(erzeugeSiedlung(fall, paket).karte))
        .toBe(serializeTacticalMapDocument(erzeugeSiedlung(fall, paket).karte));
    }
  });
});

describe("A-G5 · Siedlung — Grenzen und Ehrlichkeit", () => {
  for (const [name, auftrag, code] of [
    ["leerer Keim", { keim: "   " }, "option"],
    ["zu langer Keim", { keim: "x".repeat(257) }, "option"],
    ["unbekannte Siedlungsart", { keim: "a", optionen: { art: "burg" } }, "option"],
    ["Raster zu klein", { keim: "a", optionen: { ausdehnung: [4, 4] } }, "option"],
    ["Raster zu groß", { keim: "a", optionen: { ausdehnung: [200, 30] } }, "option"],
    ["Zellbudget", { keim: "a", optionen: { ausdehnung: [180, 180] } }, "budget"],
    ["Bauwerkzahl außerhalb", { keim: "a", optionen: { bauwerke: 0 } }, "option"],
    ["Straßendichte außerhalb", { keim: "a", optionen: { strassenDichte: 2 } }, "option"],
    ["Grundstück invertiert", { keim: "a", optionen: { grundstueck: [8, 3] } }, "option"],
  ] as const) {
    it(`weist „${name}" mit Code ${code} zurück`, () => {
      let gefangen: unknown;
      try { erzeugeSiedlung(auftrag as never, paket); } catch (error) { gefangen = error; }
      expect(gefangen).toBeInstanceOf(GrundrissError);
      expect((gefangen as GrundrissError).code).toBe(code);
    });
  }

  it("weist ein leeres Paket zurück", () => {
    let gefangen: unknown;
    try { erzeugeSiedlung({ keim: "a" }, { ...paket, assets: [] } as AssetpaketV1); } catch (error) { gefangen = error; }
    expect((gefangen as GrundrissError).code).toBe("paket");
  });
});
