import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assetIndex, parseAssetpaket, parseTacticalMapDocument, pruefeContainment, pruefeStampVerweise,
  serializeTacticalMapDocument, type AssetpaketV1, type Knoten, type TacticalMapDocumentV1,
} from "@chronicle/szene";
import { trustKnotenId } from "@chronicle/core";
import { GRUNDRISS_STANDARD, GrundrissError, erzeugeGrundriss, exportTacticalUvtt, type Grundriss } from "../src/index.ts";

/**
 * Gate **A-G1 · Der Grundriss** — the first map Chronicle generates rather than imports.
 *
 * What this file asks, and why each question is the one that matters:
 *
 *  - **Determinism over the whole option vector, not over the seed.** RB-21d:234 measured the
 *    same seed at a different canvas keeping `(id, name)` for 0 of 664 generated settlements.
 *    So the tests below require *both* directions: identical vector ⇒ byte-identical document and
 *    identical ids; any changed option — including the **asset pack's version** — ⇒ a different
 *    `keimHash`. A generator that quietly returned the old map after a pack bump would be lying
 *    about what produced the bytes.
 *  - **The address, not the rectangles.** RB-21d:172 — Watabou's dungeons are real, free and
 *    thrown into an iframe because there is nowhere to put them. So the load-bearing assertions
 *    are that every room is a `Knoten` that `pruefeContainment` accepts under a parent, that its
 *    `Region` id *is* that `KnotenId`, and that it carries an anchor and a `kindKeim`.
 *  - **Playability is a property, not a screenshot.** Reachability, a door for every room, no
 *    wall across a doorway and no furniture in one — checked over many seeds, because a dungeon
 *    generator that is right on the seed you looked at is not a generator.
 *
 * The pack is the real `assets/packs/pk.grundriss`, so a broken manifest fails here too.
 */

const PAKET_DIR = fileURLToPath(new URL("../../../assets/packs/pk.grundriss/", import.meta.url));
const paket: AssetpaketV1 = parseAssetpaket(readFileSync(`${PAKET_DIR}paket.json`, "utf8"));
const index = assetIndex([paket]);

const bauen = (keim: string, optionen: Partial<typeof GRUNDRISS_STANDARD> = {}): Grundriss =>
  erzeugeGrundriss({ keim, titel: "Prüfstand", optionen }, paket);

/** Unit-edge keys of every wall run, so a portal can be tested against actual wall coverage. */
function wandkanten(karte: TacticalMapDocumentV1): Set<string> {
  const z = karte.grid.kind === "square" ? karte.grid.size : 64;
  const kanten = new Set<string>();
  for (const wand of karte.walls) {
    const [a, b] = [wand.points[0]!, wand.points[1]!];
    if (a[1] === b[1]) for (let x = Math.min(a[0], b[0]); x < Math.max(a[0], b[0]); x += z) kanten.add(`w:${a[1] / z}:${x / z}`);
    else for (let y = Math.min(a[1], b[1]); y < Math.max(a[1], b[1]); y += z) kanten.add(`s:${a[0] / z}:${y / z}`);
  }
  return kanten;
}

const SAATEN = ["eron:kellergewoelbe:1", "eron:turm:2", "andaria/burg-3", "0", "ß-umlaut-keim", "x".repeat(200)];

describe("A-G1 · Grundriss — Determinismus über den vollständigen Optionsvektor", () => {
  it("liefert zweimal dasselbe Dokument, dieselben Ids und denselben Keimhash", () => {
    const a = bauen("eron:kellergewoelbe:1");
    const b = bauen("eron:kellergewoelbe:1");
    expect(serializeTacticalMapDocument(b.karte)).toBe(serializeTacticalMapDocument(a.karte));
    expect(b.keim.keimHash).toBe(a.keim.keimHash);
    expect(b.knoten.map((k) => k.id)).toStrictEqual(a.knoten.map((k) => k.id));
    expect(b.raeume).toStrictEqual(a.raeume);
    expect(b.bericht).toStrictEqual(a.bericht);
  });

  it("mintet für einen anderen Keim eine andere Welt", () => {
    const a = bauen("eron:kellergewoelbe:1");
    const b = bauen("eron:kellergewoelbe:2");
    expect(b.keim.keimHash).not.toBe(a.keim.keimHash);
    expect(new Set(b.knoten.map((k) => k.id)).size).toBe(b.knoten.length);
    expect(b.knoten.filter((k) => a.knoten.some((x) => x.id === k.id))).toHaveLength(0);
  });

  for (const [name, optionen] of [
    ["Raster", { zellen: [44, 30] as const }],
    ["Zellgröße", { zellgroesse: 128 }],
    ["Raumzahl", { raeume: 7 }],
    ["Mindestraum", { minRaum: 4 }],
    ["Schleifen", { schleifen: 3 }],
    ["Möblierung", { moeblierung: 0.5 }],
    ["Licht", { licht: false }],
    ["Gangboden", { gangboden: "verfall" }],
  ] as const) {
    it(`behandelt eine geänderte Option „${name}" als andere Welt, nicht als dieselbe`, () => {
      const a = bauen("eron:kellergewoelbe:1");
      const b = bauen("eron:kellergewoelbe:1", optionen);
      expect(b.keim.keimHash).not.toBe(a.keim.keimHash);
      expect(b.bauwerkId).not.toBe(a.bauwerkId);
    });
  }

  it("verschiebt auch bei einer rein kosmetischen Option die Räume selbst", () => {
    // The mutation this kills: seeding the PRNG from the bare seed instead of the `keimHash`.
    // Ids would still differ (they are minted from the hash), so an assertion on ids alone
    // passes while the actual floorplan silently ignores half its option vector. RB-21d:104 is
    // a statement about the artefact, not about its labels.
    const a = bauen("eron:kellergewoelbe:1");
    const grundriss = (g: Grundriss) => g.raeume.map((r) => r.zellen.join(":")).join("|");
    for (const optionen of [{ gangboden: "verfall" }, { licht: false }, { moeblierung: 0.5 }, { schleifen: 3 }] as const) {
      const b = bauen("eron:kellergewoelbe:1", optionen);
      expect(grundriss(b), JSON.stringify(optionen)).not.toBe(grundriss(a));
      expect(serializeTacticalMapDocument(b.karte)).not.toBe(serializeTacticalMapDocument(a.karte));
    }
  });

  it("zählt das Assetpaket zum Optionsvektor — ein Paket-Bump ist eine andere Karte", () => {
    const gebumpt: AssetpaketV1 = parseAssetpaket({ ...paket, version: "1.1.0" });
    const a = erzeugeGrundriss({ keim: "eron:kellergewoelbe:1" }, paket);
    const b = erzeugeGrundriss({ keim: "eron:kellergewoelbe:1" }, gebumpt);
    expect(b.keim.keimHash).not.toBe(a.keim.keimHash);
    expect(b.bauwerkId).not.toBe(a.bauwerkId);
  });

  it("legt Keim, Version und Paketidentität offen im Keimvektor ab", () => {
    const g = bauen("eron:kellergewoelbe:1");
    expect(g.keim.generator).toBe("chronicle-grundriss");
    expect(g.keim.seed).toBe("eron:kellergewoelbe:1");
    expect(g.keim.optionen.paket).toStrictEqual({ id: paket.id, version: paket.version, zellgroesse: paket.zellgroesse });
    expect(g.keim.keimHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("A-G1 · Grundriss — das Dokument ist ein gewöhnliches TacticalMapDocument", () => {
  it("wird vom kanonischen Parser angenommen und serialisiert stabil", () => {
    const g = bauen("eron:turm:2");
    const wieder = parseTacticalMapDocument(serializeTacticalMapDocument(g.karte));
    expect(serializeTacticalMapDocument(wieder)).toBe(serializeTacticalMapDocument(g.karte));
    expect(wieder.background).toBeNull();
    expect(wieder.geometry.size).toStrictEqual([40 * 64, 30 * 64]);
    expect(wieder.grid).toStrictEqual({ kind: "square", size: 64, origin: [0, 0] });
    expect(wieder.frame.einheitenProPixel).toBeCloseTo(1 / 64, 12);
  });

  it("vergibt jede Geometrie-Id genau einmal", () => {
    const g = bauen("eron:turm:2");
    const ids = [
      ...g.karte.geometry.stamps.map((s) => s.id), ...g.karte.geometry.regions.map((r) => r.id),
      ...g.karte.geometry.places.map((p) => p.id), ...g.karte.walls.map((w) => w.id),
      ...g.karte.portals.map((p) => p.id), ...g.karte.lights.map((l) => l.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-f0-9]{32}$/.test(id))).toBe(true);
  });

  it("exportiert nach UVTT und benennt den Verlust, statt ihn zu verschweigen", () => {
    const g = bauen("eron:turm:2");
    const uvtt = exportTacticalUvtt(g.karte);
    const roh = JSON.parse(uvtt.json) as { resolution: { pixels_per_grid: number }; line_of_sight: unknown[]; portals: unknown[] };
    expect(roh.resolution.pixels_per_grid).toBe(64);
    expect(roh.line_of_sight.length).toBe(g.karte.walls.length);
    expect(roh.portals.length).toBe(g.karte.portals.length);
    const verluste = uvtt.fidelity.issues.filter((i) => i.severity === "loss").map((i) => i.path);
    expect(verluste).toContain("geometry.stamps");
    expect(verluste).toContain("geometry.regions");
    expect(uvtt.fidelity.nativeRoundTrip).toBe(false);
  });
});

describe("A-G1 · Grundriss — jeder Raum bekommt eine Adresse", () => {
  it("hängt sich unter einen Elternknoten und besteht die Containment-Prüfung", () => {
    const weltId = trustKnotenId("welt-pruefstand");
    const g = erzeugeGrundriss({
      keim: "andaria/burg-3", titel: "Kellergewölbe",
      eltern: { knotenId: weltId, art: "liegt_in_geografie", bei: [812.5, 419.25], massstab: 40 },
    }, paket);
    const welt: Knoten = {
      id: weltId, art: "welt", titel: "Prüfwelt", eltern: [],
      rahmen: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
      anker: null, herkunft: null, sichtAnker: null,
    };
    expect(pruefeContainment([welt, ...g.knoten])).toStrictEqual([]);
    const bauwerk = g.knoten.find((k) => k.id === g.bauwerkId)!;
    expect(bauwerk.art).toBe("bauwerk");
    expect(bauwerk.titel).toBe("Kellergewölbe");
    expect(bauwerk.eltern).toStrictEqual([{ von: g.bauwerkId, nach: weltId, art: "liegt_in_geografie" }]);
    expect(bauwerk.anker).toStrictEqual({ in: weltId, bei: [812.5, 419.25], massstab: 40 });
  });

  it("bleibt ohne Elternteil ein Fragment und behauptet keine Wurzel", () => {
    const g = bauen("andaria/burg-3");
    const bauwerk = g.knoten.find((k) => k.id === g.bauwerkId)!;
    expect(bauwerk.eltern).toStrictEqual([]);
    expect(bauwerk.anker).toBeNull();
    // A `bauwerk` without a spatial parent is exactly what `pruefeContainment` must reject:
    // the fragment is honest about needing a parent instead of inventing a world.
    expect(pruefeContainment([...g.knoten]).map((v) => v.art)).toContain("fehlender-raumelter");
  });

  it("benutzt die KnotenId des Raums als Region-Id — eine Sache, eine Identität", () => {
    const g = bauen("eron:kellergewoelbe:1");
    const regionen = g.karte.geometry.regions.map((r) => r.id).sort();
    expect(regionen).toStrictEqual(g.raeume.map((r) => r.id).sort());
    for (const raum of g.raeume) {
      const region = g.karte.geometry.regions.find((r) => r.id === raum.id)!;
      expect(region.punkte).toHaveLength(4);
      expect(region.punkte[0]).toStrictEqual([raum.zellen[0] * 64, raum.zellen[1] * 64]);
    }
  });

  it("verankert jeden Raum im Bauwerk und speichert seinen Kindkeim", () => {
    const g = bauen("eron:kellergewoelbe:1");
    const raumknoten = g.knoten.filter((k) => k.art === "raum");
    expect(raumknoten).toHaveLength(g.raeume.length);
    for (const knoten of raumknoten) {
      expect(knoten.anker?.in).toBe(g.bauwerkId);
      expect(knoten.herkunft?.keimHash).toBe(g.keim.keimHash);
      expect(knoten.herkunft?.kindKeim).toMatch(/^[a-f0-9]{32}$/);
      expect(knoten.herkunft?.erzeugungspfad[0]).toBe("raum");
      expect(knoten.titel).toBeNull(); // der Generator schreibt Türen, keine Artikel
      expect(knoten.sichtAnker).toBeNull();
    }
    expect(new Set(raumknoten.map((k) => k.herkunft!.kindKeim)).size).toBe(raumknoten.length);
  });

  it("hält den Kindkeim über zwei Läufe stabil", () => {
    const a = bauen("eron:kellergewoelbe:1").knoten.map((k) => k.herkunft?.kindKeim ?? null);
    const b = bauen("eron:kellergewoelbe:1").knoten.map((k) => k.herkunft?.kindKeim ?? null);
    expect(b).toStrictEqual(a);
  });
});

describe("A-G1 · Grundriss — spielbare Geometrie über viele Saaten", () => {
  const laeufe = SAATEN.map((keim) => ({ keim, g: bauen(keim) }));

  it("erzeugt für jede Saat begehbare, verbundene Räume mit Türen", () => {
    for (const { keim, g } of laeufe) {
      expect(g.raeume.length, keim).toBeGreaterThanOrEqual(2);
      expect(g.bericht.gangzellen, keim).toBeGreaterThan(0);
      for (const raum of g.raeume) expect(raum.tueren.length, `${keim}/${raum.pfad}`).toBeGreaterThanOrEqual(1);
      expect(g.raeume.filter((r) => r.rolle === "eingang"), keim).toHaveLength(1);
    }
  });

  it("überlappt keine zwei Räume", () => {
    for (const { keim, g } of laeufe) {
      for (const a of g.raeume) for (const b of g.raeume) {
        if (a.id === b.id) continue;
        const getrennt = a.zellen[0] + a.zellen[2] <= b.zellen[0] || b.zellen[0] + b.zellen[2] <= a.zellen[0]
          || a.zellen[1] + a.zellen[3] <= b.zellen[1] || b.zellen[1] + b.zellen[3] <= a.zellen[1];
        expect(getrennt, `${keim}: ${a.pfad} vs ${b.pfad}`).toBe(true);
      }
    }
  });

  it("legt keine Wand über eine Tür", () => {
    for (const { keim, g } of laeufe) {
      const kanten = wandkanten(g.karte);
      for (const tuer of g.karte.portals) {
        const [a, b] = tuer.bounds;
        const key = a[1] === b[1] ? `w:${a[1] / 64}:${Math.min(a[0], b[0]) / 64}` : `s:${a[0] / 64}:${Math.min(a[1], b[1]) / 64}`;
        expect(kanten.has(key), `${keim}: Tür ${tuer.id} liegt unter einer Wand`).toBe(false);
      }
    }
  });

  it("stellt keine Möbel in einen Türdurchgang", () => {
    for (const { keim, g } of laeufe) {
      const gesperrt = new Set<string>();
      for (const tuer of g.karte.portals) {
        const [a, b] = tuer.bounds;
        if (a[1] === b[1]) { const x = Math.min(a[0], b[0]) / 64, y = a[1] / 64; gesperrt.add(`${x}:${y - 1}`); gesperrt.add(`${x}:${y}`); }
        else { const x = a[0] / 64, y = Math.min(a[1], b[1]) / 64; gesperrt.add(`${x - 1}:${y}`); gesperrt.add(`${x}:${y}`); }
      }
      for (const stamp of g.karte.geometry.stamps) {
        const art = index.get(stamp.a)!.asset;
        if (art.art === "boden" || art.art === "tuer") continue;
        const [ew, eh] = art.einheiten;
        const zx = Math.round(stamp.x / 64 - ew / 2), zy = Math.round(stamp.y / 64 - eh / 2);
        for (let y = zy; y < zy + eh; y++) for (let x = zx; x < zx + ew; x++) {
          expect(gesperrt.has(`${x}:${y}`), `${keim}: ${stamp.a} versperrt eine Tür bei ${x}:${y}`).toBe(false);
        }
      }
    }
  });

  it("hält jedes Stück Geometrie innerhalb der Karte", () => {
    for (const { keim, g } of laeufe) {
      const [breite, hoehe] = g.karte.geometry.size;
      const drin = (p: readonly [number, number]) => p[0] >= 0 && p[1] >= 0 && p[0] <= breite && p[1] <= hoehe;
      for (const wand of g.karte.walls) for (const p of wand.points) expect(drin(p), `${keim}: Wand ${wand.id}`).toBe(true);
      for (const region of g.karte.geometry.regions) for (const p of region.punkte) expect(drin(p), `${keim}: Region ${region.id}`).toBe(true);
      for (const stamp of g.karte.geometry.stamps) expect(drin([stamp.x, stamp.y]), `${keim}: Stamp ${stamp.id}`).toBe(true);
    }
  });
});

describe("A-G1 · Grundriss — Eigenschaften über den Optionsraum, nicht über eine Saat", () => {
  // Six hand-picked seeds prove a generator works on six maps. These 36 configurations sweep
  // grid, cell size, room count, minimum room, loops, furnishing and light together, because
  // the failure mode of a layout generator is a corner of its option space, not a bad seed.
  const faelle = Array.from({ length: 36 }, (_, i) => ({
    keim: `raster:${i}`,
    optionen: {
      zellen: [16 + (i % 19) * 2, 14 + (i % 13)] as [number, number],
      zellgroesse: [32, 64, 128][i % 3]!,
      raeume: 2 + (i % 13),
      minRaum: 2 + (i % 4),
      schleifen: i % 5,
      moeblierung: (i % 5) / 4,
      licht: i % 2 === 0,
    },
  }));

  it("liefert für jede Konfiguration eine begehbare Karte mit auflösbaren Assets", () => {
    for (const fall of faelle) {
      const g = erzeugeGrundriss(fall, paket);
      const wo = `${fall.keim} ${JSON.stringify(fall.optionen)}`;
      expect(g.raeume.length, wo).toBeGreaterThanOrEqual(2);
      for (const raum of g.raeume) expect(raum.tueren.length, `${wo} · ${raum.pfad}`).toBeGreaterThanOrEqual(1);
      expect(pruefeStampVerweise(g.karte.geometry, index), wo).toStrictEqual([]);
      expect(g.bericht.nichtBedient, wo).toStrictEqual([]);
      expect(serializeTacticalMapDocument(g.karte).length, wo).toBeGreaterThan(0);
    }
  });

  it("bleibt über den ganzen Optionsraum deterministisch", () => {
    for (const fall of faelle.slice(0, 12)) {
      expect(serializeTacticalMapDocument(erzeugeGrundriss(fall, paket).karte))
        .toBe(serializeTacticalMapDocument(erzeugeGrundriss(fall, paket).karte));
    }
  });
});

describe("A-G1 · Grundriss — jede Assetreferenz ist echt", () => {
  it("löst jeden Stamp gegen das echte Paket auf", () => {
    for (const keim of SAATEN) {
      const g = bauen(keim);
      expect(pruefeStampVerweise(g.karte.geometry, index), keim).toStrictEqual([]);
      expect(g.karte.geometry.stamps.length, keim).toBeGreaterThan(0);
    }
  });

  it("skaliert Stamps auf die Zellgröße der Karte, nicht auf die des Pakets", () => {
    const fein = bauen("eron:turm:2", { zellgroesse: 128 });
    expect(fein.karte.geometry.stamps.every((s) => s.s === 128 / paket.zellgroesse)).toBe(true);
    expect(bauen("eron:turm:2").karte.geometry.stamps.every((s) => s.s === 64 / paket.zellgroesse)).toBe(true);
  });

  it("legt Böden unter alles andere und Türen darüber", () => {
    const g = bauen("eron:kellergewoelbe:1");
    for (const stamp of g.karte.geometry.stamps) {
      const art = index.get(stamp.a)!.asset.art;
      if (art === "boden") expect(stamp.l).toBe(-100);
      if (art === "tuer") expect(stamp.l).toBe(20);
    }
    expect(g.karte.geometry.stamps.filter((s) => index.get(s.a)!.asset.art === "tuer")).toHaveLength(g.karte.portals.length);
  });

  it("meldet ein Paket, das eine Themenanfrage nicht bedienen kann, statt still zu verarmen", () => {
    const duenn: AssetpaketV1 = parseAssetpaket({ ...paket, assets: paket.assets.filter((a) => a.art === "boden") });
    const g = erzeugeGrundriss({ keim: "eron:kellergewoelbe:1" }, duenn);
    expect(g.bericht.nichtBedient.length).toBeGreaterThan(0);
    expect(g.bericht.nichtBedient).toContain("tuer/drehbar");
    expect(g.karte.geometry.stamps.every((s) => index.get(s.a)!.asset.art === "boden")).toBe(true);
    // Still a usable map: geometry does not depend on the catalogue.
    expect(g.karte.portals.length).toBeGreaterThan(0);
    expect(g.raeume.length).toBeGreaterThanOrEqual(2);
  });

  it("bedient mit dem echten Paket jede Themenanfrage", () => {
    for (const keim of SAATEN) expect(bauen(keim).bericht.nichtBedient, keim).toStrictEqual([]);
  });
});

describe("A-G1 · Grundriss — Grenzen und Ehrlichkeit", () => {
  for (const [name, auftrag, code] of [
    ["leerer Keim", { keim: "   " }, "option"],
    ["zu langer Keim", { keim: "x".repeat(257) }, "option"],
    ["Raster zu klein", { keim: "a", optionen: { zellen: [4, 4] as const } }, "option"],
    ["Raster zu groß", { keim: "a", optionen: { zellen: [200, 30] as const } }, "option"],
    ["Zellbudget", { keim: "a", optionen: { zellen: [180, 180] as const } }, "budget"],
    ["Pixelkante", { keim: "a", optionen: { zellen: [160, 20] as const, zellgroesse: 512 } }, "budget"],
    ["Raumzahl", { keim: "a", optionen: { raeume: 1 } }, "option"],
    ["Möblierung außerhalb 0..1", { keim: "a", optionen: { moeblierung: 2 } }, "option"],
    ["Mindestraum passt nicht", { keim: "a", optionen: { zellen: [12, 12] as const, minRaum: 12 } }, "option"],
    ["Bruchzahl als Raumzahl", { keim: "a", optionen: { raeume: 3.5 } }, "option"],
  ] as const) {
    it(`weist „${name}" mit Code ${code} zurück`, () => {
      let gefangen: unknown;
      try { erzeugeGrundriss(auftrag, paket); } catch (error) { gefangen = error; }
      expect(gefangen).toBeInstanceOf(GrundrissError);
      expect((gefangen as GrundrissError).code).toBe(code);
    });
  }

  it("weist ein leeres Paket zurück", () => {
    let gefangen: unknown;
    try { erzeugeGrundriss({ keim: "a" }, { ...paket, assets: [] } as AssetpaketV1); } catch (error) { gefangen = error; }
    expect((gefangen as GrundrissError).code).toBe("paket");
  });

  it("zählt seinen Bericht gegen das gelieferte Dokument", () => {
    const g = bauen("eron:kellergewoelbe:1");
    expect(g.bericht.raeume).toBe(g.karte.geometry.regions.length);
    expect(g.bericht.tueren).toBe(g.karte.portals.length);
    expect(g.bericht.waende).toBe(g.karte.walls.length);
    expect(g.bericht.lichter).toBe(g.karte.lights.length);
    expect(g.bericht.stamps).toBe(g.karte.geometry.stamps.length);
    expect(Object.values(g.bericht.stampsNachArt).reduce((a, b) => a + b, 0)).toBe(g.bericht.stamps);
    expect(Object.values(g.bericht.themen).reduce((a, b) => a + b, 0)).toBe(g.bericht.raeume);
  });

  it("nennt, was es nicht tut", () => {
    const ausgelassen = bauen("eron:kellergewoelbe:1").bericht.ausgelassen.join(" ");
    for (const wort of ["Sichtlinien", "Hintergrundbild", "Geheimtüren", "Artikel", "Höhen"]) {
      expect(ausgelassen, wort).toContain(wort);
    }
  });

  it("erzeugt ohne Licht auch keine Lichter und ohne Möblierung nur Treppen und Boden", () => {
    expect(bauen("eron:kellergewoelbe:1", { licht: false }).karte.lights).toStrictEqual([]);
    const kahl = bauen("eron:kellergewoelbe:1", { moeblierung: 0 });
    const arten = new Set(kahl.karte.geometry.stamps.map((s) => index.get(s.a)!.asset.art));
    expect([...arten].sort()).toStrictEqual(["aufbau", "boden", "marke", "tuer"]);
  });
});
