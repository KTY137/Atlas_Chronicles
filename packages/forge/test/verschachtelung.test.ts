import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MAX_TIEFE, parseAssetpaket, pruefeContainment, raumEltern, serializeTacticalMapDocument, tiefe,
  type AssetpaketV1, type Knoten, type KnotenId,
} from "@chronicle/szene";
import { trustKnotenId } from "@chronicle/core";
import {
  GrundrissError, MAX_MASSSTABSSPRUNG, erzeugeGrundriss, erzeugeVerschachtelt, importiereAzgaar,
  type EbenenAuftrag,
} from "../src/index.ts";

/**
 * Gate **A-G4 · Die Verschachtelung** — "verschachtelte Karten", as RB-21a §3.1 rules the phrase:
 *
 *   > *"'nested maps' means a graph of linked artifacts with containment and anchors. It does not
 *   >  mean one continuous LOD zoom."*
 *
 * So this file measures a chain of **separate artefacts**, each with its own frame, joined by one
 * containment edge and one anchor per step — and it measures the refusals just as hard:
 *
 *  - **The parent document does not change when a child appears.** RB-21a §3.3 rules the anchor a
 *    row per `(Karte, Ort)`, "not a column on Ort". If nesting wrote anything back into the level
 *    above, that ruling would be dead and every stored map would become mutable-by-descendant.
 *  - **The chain is re-derivable from the top seed alone**, because each level is seeded by the
 *    parent room's stored `kindKeim` — the derived child seed every tool in the corpus computes
 *    and discards (RB-21d:143-157).
 *  - **"Inside" is a measurable claim, not a figure of speech.** A child map is scaled so that it
 *    fits the room that holds it, and a jump beyond `MAX_MASSSTABSSPRUNG` is refused rather than
 *    silently producing two artefacts that cannot be the same physical place.
 *  - **No floors are stacked.** RB-21a R6 makes vertical position a scalar band on the node and
 *    §1.3 case 3 makes the underdark a *sibling*. `Knoten` has no band, so nothing here pretends.
 */

const PAKET_DIR = fileURLToPath(new URL("../../../assets/packs/pk.grundriss/", import.meta.url));
const paket: AssetpaketV1 = parseAssetpaket(readFileSync(`${PAKET_DIR}paket.json`, "utf8"));

const DREI: readonly EbenenAuftrag[] = [
  { art: "grundriss", titel: "Haus Vharon", optionen: { zellen: [40, 30], raeume: 8 } },
  { art: "hoehle", titel: "Der Hohlgang", optionen: { zellen: [16, 14], kammern: 3 } },
  { art: "grundriss", titel: "Der Schrein", optionen: { zellen: [12, 12], raeume: 2, minRaum: 2 } },
];

const welt = (id: KnotenId): Knoten => ({
  id, art: "welt", titel: "Prüfwelt", eltern: [],
  rahmen: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
  anker: null, herkunft: null, sichtAnker: null,
});

describe("A-G4 · Verschachtelung — die Kette der Artefakte", () => {
  it("baut drei Ebenen mit eigenen Rahmen und einer Wurzel je Ebene", () => {
    const v = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: DREI }, paket);
    expect(v.ebenen).toHaveLength(3);
    expect(v.uebergaenge).toHaveLength(2);
    expect(v.ebenen.map((e) => e.art)).toStrictEqual(["grundriss", "hoehle", "grundriss"]);
    expect(v.ebenen.map((e) => e.knoten[0]!.art)).toStrictEqual(["bauwerk", "ort", "bauwerk"]);
    expect(new Set(v.knoten.map((k) => k.id)).size).toBe(v.knoten.length);
    // Three artefacts, three frames. They differ because each has its own cell size and extent.
    const groessen = v.ebenen.map((e) => e.karte.geometry.size.join("x"));
    expect(new Set(groessen).size).toBe(3);
  });

  it("verbindet jede Ebene über genau eine Raumkante mit der Ebene darüber", () => {
    const v = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: DREI }, paket);
    const alle = new Map(v.knoten.map((k) => [k.id, k]));
    for (const uebergang of v.uebergaenge) {
      const kind = alle.get(uebergang.nach)!;
      expect(raumEltern(kind)).toStrictEqual([uebergang.von]);
      expect(kind.anker).toStrictEqual({ in: uebergang.von, bei: uebergang.bei, massstab: uebergang.massstab });
      // The room you step out of really belongs to the map the transition names.
      const raum = alle.get(uebergang.von)!;
      expect(raumEltern(raum)).toStrictEqual([uebergang.inKarte]);
    }
  });

  it("führt den Ahnenlauf des tiefsten Raums über alle drei Ebenen bis zur Welt", () => {
    const weltId = trustKnotenId("welt-verschachtelung");
    const v = erzeugeVerschachtelt({
      keim: "eron:vharon:1", ebenen: DREI,
      eltern: { knotenId: weltId, art: "liegt_in_geografie", bei: [100, 200], massstab: 40 },
    }, paket);
    const alle = new Map<KnotenId, Knoten>([[weltId, welt(weltId)] as const, ...v.knoten.map((k: Knoten) => [k.id, k] as const)]);
    expect(pruefeContainment([...alle.values()])).toStrictEqual([]);

    const tiefsterRaum = v.ebenen[2]!.knoten.find((k) => k.art === "raum")!;
    const kette: string[] = [];
    let aktuell: KnotenId | undefined = tiefsterRaum.id;
    while (aktuell) { const k: Knoten = alle.get(aktuell)!; kette.push(k.art); aktuell = raumEltern(k)[0]; }
    expect(kette).toStrictEqual(["raum", "bauwerk", "raum", "ort", "raum", "bauwerk", "welt"]);
    expect(tiefe(tiefsterRaum.id, alle)).toBe(6);
    expect(tiefe(tiefsterRaum.id, alle)).toBeLessThan(MAX_TIEFE);
  });

  it("hängt an einen echten importierten Ort und bleibt ein gültiger Graph", () => {
    const quelle = gunzipSync(readFileSync(new URL("./fixtures/azgaar-full.json.gz", import.meta.url))).toString("utf8");
    const importiert = importiereAzgaar(quelle);
    const burg = [...importiert.orte].sort((a, b) => (a.id < b.id ? -1 : 1))[0]!;
    const alleImport = new Map(importiert.knoten.map((k) => [k.id, k]));
    const v = erzeugeVerschachtelt({
      keim: burg.kindKeim!, ebenen: DREI, elternTiefe: tiefe(burg.id, alleImport),
      eltern: { knotenId: burg.id, art: "liegt_in_geografie", bei: [burg.x, burg.y], massstab: 24 },
    }, paket);
    expect(pruefeContainment([...importiert.knoten, ...v.knoten])).toStrictEqual([]);
    const alle = new Map([...alleImport, ...v.knoten.map((k) => [k.id, k] as const)]);
    const tiefster = v.ebenen[2]!.knoten.find((k) => k.art === "raum")!;
    expect(tiefe(tiefster.id, alle)).toBe(tiefe(burg.id, alleImport) + 6);
  });
});

describe("A-G4 · Verschachtelung — das Kind schreibt nicht in seinen Elternteil", () => {
  it("liefert dieselbe Elternkarte, Byte für Byte, mit und ohne Kind", () => {
    const allein = erzeugeGrundriss({ keim: "eron:vharon:1", titel: "Haus Vharon", optionen: { zellen: [40, 30], raeume: 8 } }, paket);
    const einsAllein = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: DREI.slice(0, 1) }, paket);
    const dreiTief = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: DREI }, paket);
    const bytes = (g: { karte: Parameters<typeof serializeTacticalMapDocument>[0] }) => serializeTacticalMapDocument(g.karte);
    expect(bytes(einsAllein.ebenen[0]!)).toBe(bytes(allein));
    expect(bytes(dreiTief.ebenen[0]!)).toBe(bytes(allein));
    expect(dreiTief.ebenen[0]!.knoten.map((k) => k.id)).toStrictEqual(allein.knoten.map((k) => k.id));
  });

  it("hält den Übergang als eigene Zeile, nicht als Feld in einer Karte", () => {
    const v = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: DREI }, paket);
    const eltern = v.ebenen[0]!;
    const kindWurzel = v.ebenen[1]!.wurzelId;
    // Nothing in the parent document mentions the child. The link lives only in `uebergaenge`.
    expect(serializeTacticalMapDocument(eltern.karte)).not.toContain(kindWurzel);
    expect(v.uebergaenge[0]!.nach).toBe(kindWurzel);
  });
});

describe("A-G4 · Verschachtelung — aus einem Keim wiederherstellbar", () => {
  it("erzeugt zweimal dieselbe Kette, Ids und Übergänge", () => {
    const a = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: DREI }, paket);
    const b = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: DREI }, paket);
    expect(b.knoten.map((k) => k.id)).toStrictEqual(a.knoten.map((k) => k.id));
    expect(b.uebergaenge).toStrictEqual(a.uebergaenge);
    expect(b.bericht).toStrictEqual(a.bericht);
    expect(b.ebenen.map((e) => serializeTacticalMapDocument(e.karte))).toStrictEqual(a.ebenen.map((e) => serializeTacticalMapDocument(e.karte)));
  });

  it("führt jede Ebene ausschließlich über den gespeicherten Kindkeim ihres Elternraums", () => {
    const v = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: DREI }, paket);
    for (const [i, uebergang] of v.uebergaenge.entries()) {
      const raum = v.ebenen[i]!.knoten.find((k) => k.id === uebergang.von)!;
      const kindKeim = raum.herkunft!.kindKeim!;
      // Regenerating the child standalone from that stored seed reproduces it exactly. This is the
      // whole claim: the artefact has an address, and the address is enough to rebuild it.
      const nachgebaut = erzeugeVerschachtelt({ keim: kindKeim, ebenen: DREI.slice(i + 1) }, paket);
      expect(nachgebaut.ebenen[0]!.wurzelId).toBe(uebergang.nach);
      expect(serializeTacticalMapDocument(nachgebaut.ebenen[0]!.karte)).toBe(serializeTacticalMapDocument(v.ebenen[i + 1]!.karte));
    }
  });

  it("ändert die ganze Kette, sobald eine Option einer oberen Ebene sich ändert", () => {
    const a = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: DREI }, paket);
    const geaendert = [{ ...DREI[0]!, optionen: { zellen: [40, 30] as const, raeume: 7 } }, DREI[1]!, DREI[2]!];
    const b = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: geaendert }, paket);
    // Not just the level that changed: its rooms are different, so the child seeds are different,
    // so every level below is a different artefact. That cascade is the point of the child seed.
    expect(b.ebenen.map((e) => e.wurzelId)).not.toStrictEqual(a.ebenen.map((e) => e.wurzelId));
    for (let i = 0; i < 3; i++) expect(b.ebenen[i]!.wurzelId, `Ebene ${i}`).not.toBe(a.ebenen[i]!.wurzelId);
  });
});

describe("A-G4 · Verschachtelung — „drin\" ist eine messbare Behauptung", () => {
  it("skaliert jedes Kind so, dass es in seinen Elternraum passt", () => {
    const v = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: DREI }, paket);
    for (const [i, uebergang] of v.uebergaenge.entries()) {
      const eltern = v.ebenen[i]!, kind = v.ebenen[i + 1]!;
      const elternZelle = eltern.karte.grid.kind === "square" ? eltern.karte.grid.size : 64;
      const kindZelle = kind.karte.grid.kind === "square" ? kind.karte.grid.size : 64;
      const raum = eltern.raeume.find((r) => r.id === uebergang.von)!;
      const kindEinheiten = [kind.karte.geometry.size[0] / kindZelle, kind.karte.geometry.size[1] / kindZelle] as const;
      expect(kindEinheiten[0] * uebergang.massstab).toBeLessThanOrEqual(raum.zellen[2] + 1e-9);
      expect(kindEinheiten[1] * uebergang.massstab).toBeLessThanOrEqual(raum.zellen[3] + 1e-9);
      // The anchor point is the parent room's centre, in the parent's own pixels.
      expect(uebergang.bei[0]).toBeCloseTo((raum.zellen[0] + raum.zellen[2] / 2) * elternZelle, 9);
      expect(uebergang.massstab).toBeGreaterThan(1 / MAX_MASSSTABSSPRUNG);
    }
  });

  it("weist einen unglaubwürdigen Maßstabssprung zurück, statt ihn stillschweigend zu erzeugen", () => {
    let gefangen: unknown;
    try {
      erzeugeVerschachtelt({
        keim: "eron:vharon:1",
        ebenen: [
          { art: "grundriss", optionen: { zellen: [16, 14], raeume: 2, minRaum: 2 } },
          { art: "grundriss", optionen: { zellen: [190, 190] } },
        ],
      }, paket);
    } catch (error) { gefangen = error; }
    expect(gefangen).toBeInstanceOf(GrundrissError);
    expect((gefangen as GrundrissError).code).toBe("geometrie");
    expect((gefangen as GrundrissError).message).toMatch(/feiner als ihr Elternteil/);
  });
});

describe("A-G4 · Verschachtelung — Grenzen und Ehrlichkeit", () => {
  it("weist eine Kette zurück, die MAX_TIEFE sprengen würde", () => {
    const ebenen = Array.from({ length: 13 }, (): EbenenAuftrag => ({ art: "grundriss", optionen: { zellen: [40, 30], raeume: 4 } }));
    let gefangen: unknown;
    try { erzeugeVerschachtelt({ keim: "tief", ebenen }, paket); } catch (error) { gefangen = error; }
    expect((gefangen as GrundrissError).code).toBe("tiefe");
    // And it counts the parent's own depth, not only its own contribution.
    let mitEltern: unknown;
    try { erzeugeVerschachtelt({ keim: "tief", elternTiefe: 20, ebenen: DREI }, paket); } catch (error) { mitEltern = error; }
    expect((mitEltern as GrundrissError).code).toBe("tiefe");
  });

  it("weist leere und unbekannte Ebenen zurück", () => {
    for (const ebenen of [[], [{ art: "siedlung" }]] as unknown as EbenenAuftrag[][]) {
      let gefangen: unknown;
      try { erzeugeVerschachtelt({ keim: "x", ebenen }, paket); } catch (error) { gefangen = error; }
      expect((gefangen as GrundrissError).code).toBe("option");
    }
  });

  it("nennt, was Verschachtelung hier nicht bedeutet", () => {
    const ausgelassen = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: DREI }, paket).bericht.ausgelassen.join(" ");
    for (const wort of ["Geschwisterebenen", "Zoom", "Rückwirkung", "Wissensvergabe"]) {
      expect(ausgelassen, wort).toContain(wort);
    }
  });

  it("berichtet die Kette lesbar", () => {
    const bericht = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: DREI }, paket).bericht;
    expect(bericht.kette).toStrictEqual([
      "grundriss:bauwerk", expect.stringMatching(/^raum:/), "hoehle:ort", expect.stringMatching(/^raum:/), "grundriss:bauwerk",
    ]);
    expect(bericht.massstaebe).toHaveLength(2);
    // The report must agree with the transitions it summarises. A report that counts correctly
    // while stating the wrong numbers is worse than no report, because it is trusted.
    const v = erzeugeVerschachtelt({ keim: "eron:vharon:1", ebenen: DREI }, paket);
    expect(bericht.massstaebe).toStrictEqual(v.uebergaenge.map((u) => u.massstab));
    expect(bericht.raeume).toBe(v.ebenen.reduce((sum, e) => sum + e.raeume.length, 0));
    expect(bericht.knoten).toBe(v.knoten.length);
    expect(bericht.ebenen).toBe(3);
    expect(bericht.knoten).toBeGreaterThan(10);
  });
});
