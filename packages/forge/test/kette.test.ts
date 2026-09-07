// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parseAssetpaket, pruefeContainment, raumEltern, tiefe,
  type AssetpaketV1, type Knoten, type KnotenId,
} from "@chronicle/szene";
import { erzeugeGrundriss, importiereAzgaar, type AzgaarImport } from "../src/index.ts";

/**
 * Gate **A-G2 · Die Kette** — the claim RB-21d makes and nothing in this repository had proven.
 *
 * RB-21d §2.2 read the generator's own source and found the cross-scale mechanism already there:
 * `burgSeed = seed + String(burg.i).padStart(4, "0")` derives a settlement seed from a world seed
 * and a burg. Then it found *why nobody had unified the scales*, and it is not an algorithm:
 *
 *   > "Every one of those child worlds is rendered into an `<iframe sandbox>` and then thrown
 *   >  away. … no id, no parent edge, no coordinate frame, no permission and no persistence.
 *   >  **The gap is not the generator. It is the address.**"
 *
 * `importiereAzgaar` keeps that child seed (`Ort.kindKeim`, `azgaar.ts:245`). `erzeugeGrundriss`
 * consumes one and anchors its result. Each half was tested alone; the seam between them — a
 * world-scale artefact and a battlemap-scale artefact in **one containment graph** — was not.
 * That seam is the entire product thesis, so it gets its own gate.
 *
 * What this file measures, on the real unmodified Azgaar 1.151.2 export:
 *   1. A dungeon generated from a burg's own `kindKeim` merges into the imported world graph and
 *      `pruefeContainment` accepts the union — no orphan, no cycle, no second spatial parent.
 *   2. The room's ancestor walk really reaches `welt`, through `bauwerk` and the burg's `ort`.
 *   3. Doing it for many burgs mints no colliding id — the mechanism scales past the one example.
 *   4. Two independent imports of the same bytes produce the same chain, ids included.
 *
 * What it deliberately does NOT claim: that ids survive a changed option vector or a generator
 * version bump. `keim.test.ts` states that limit and this file inherits it.
 */

const quelle = gunzipSync(readFileSync(new URL("./fixtures/azgaar-full.json.gz", import.meta.url))).toString("utf8");
const paket: AssetpaketV1 = parseAssetpaket(
  readFileSync(fileURLToPath(new URL("../../../assets/packs/pk.grundriss/paket.json", import.meta.url)), "utf8"),
);

const welt: AzgaarImport = importiereAzgaar(quelle);
const index = (knoten: readonly Knoten[]) => new Map<KnotenId, Knoten>(knoten.map((k) => [k.id, k]));

/** Deterministic pick: sorted by minted id, so it never depends on source array order. */
const burgen = [...welt.orte].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const burg = burgen[0]!;

const grabe = (ort: typeof burg) =>
  erzeugeGrundriss({
    keim: ort.kindKeim!,
    titel: `Gewölbe unter ${ort.name}`,
    // A child map is not a zoom level. It is a separate artefact with its own frame and exactly
    // one anchor point in its parent's frame (`model.ts:18-26`), which is what these fields are.
    eltern: { knotenId: ort.id, art: "liegt_in_geografie", bei: [ort.x, ort.y], massstab: 24 },
    optionen: { zellen: [32, 24], raeume: 6 },
  }, paket);

describe("A-G2 · Die Kette — der Weltimport trägt das erzeugte Bauwerk", () => {
  it("bewahrt Azgaars eigenen Kindkeim an jedem Ort", () => {
    expect(welt.orte.length).toBeGreaterThan(600);
    expect(welt.orte.every((o) => typeof o.kindKeim === "string" && o.kindKeim.length > 0)).toBe(true);
    expect(new Set(welt.orte.map((o) => o.kindKeim)).size).toBe(welt.orte.length);
    // Exactly the shape read out of `burgs-generator.ts:560-690`: world seed + zero-padded index.
    expect(burg.kindKeim!.startsWith(welt.keim.seed)).toBe(true);
    expect(burg.kindKeim!.slice(welt.keim.seed.length)).toMatch(/^\d{4}$/);
  });

  it("nimmt das erzeugte Bauwerk in denselben Containment-Graphen auf", () => {
    const grundriss = grabe(burg);
    expect(pruefeContainment([...welt.knoten, ...grundriss.knoten])).toStrictEqual([]);
  });

  it("führt den Ahnenlauf eines Raums bis zur Welt", () => {
    const grundriss = grabe(burg);
    const alle = index([...welt.knoten, ...grundriss.knoten]);
    const raum = grundriss.knoten.find((k) => k.art === "raum")!;

    const kette: string[] = [];
    let aktuell: KnotenId | undefined = raum.id;
    while (aktuell) {
      const knoten: Knoten | undefined = alle.get(aktuell);
      expect(knoten, `Kette bricht bei ${aktuell}`).toBeDefined();
      kette.push(knoten!.art);
      aktuell = raumEltern(knoten!)[0];
    }
    expect(kette[0]).toBe("raum");
    expect(kette[1]).toBe("bauwerk");
    expect(kette[2]).toBe("ort");
    expect(kette[kette.length - 1]).toBe("welt");
    expect(kette.length).toBeGreaterThanOrEqual(5);

    // `tiefe` walks the same edges independently; the room sits exactly two levels under its burg.
    expect(tiefe(raum.id, alle)).toBe(tiefe(burg.id, alle) + 2);
    expect(tiefe(raum.id, alle)).toBeLessThan(24); // MAX_TIEFE, and nowhere near it
  });

  it("verankert das Bauwerk im Rahmen des Ortes, nicht in seinem eigenen", () => {
    const grundriss = grabe(burg);
    const bauwerk = grundriss.knoten.find((k) => k.id === grundriss.wurzelId)!;
    expect(bauwerk.anker).toStrictEqual({ in: burg.id, bei: [burg.x, burg.y], massstab: 24 });
    // Its own frame is the battlemap's, and it is a different contract from the world's.
    expect(bauwerk.rahmen).toStrictEqual(grundriss.karte.frame);
    expect(bauwerk.rahmen.einheitenProPixel).not.toBe(welt.knoten[0]!.rahmen.einheitenProPixel);
    // Every room anchors in the building, never in the world: coordinates do not nest.
    for (const raum of grundriss.knoten.filter((k) => k.art === "raum")) {
      expect(raum.anker?.in).toBe(grundriss.wurzelId);
    }
  });
});

describe("A-G2 · Die Kette — der Mechanismus trägt mehr als ein Beispiel", () => {
  const stichprobe = burgen.filter((o) => o.kindKeim).slice(0, 24);

  it("erzeugt aus 24 echten Siedlungen 24 kollisionsfreie Bauwerke in einem Graphen", () => {
    const knoten: Knoten[] = [...welt.knoten];
    const bauwerke: KnotenId[] = [];
    for (const ort of stichprobe) {
      const grundriss = grabe(ort);
      bauwerke.push(grundriss.wurzelId);
      knoten.push(...grundriss.knoten);
    }
    expect(new Set(bauwerke).size).toBe(stichprobe.length);
    expect(new Set(knoten.map((k) => k.id)).size).toBe(knoten.length);
    expect(pruefeContainment(knoten)).toStrictEqual([]);
  });

  it("gibt zwei Siedlungen niemals dasselbe Gewölbe", () => {
    const [a, b] = [grabe(stichprobe[0]!), grabe(stichprobe[1]!)];
    expect(b.keim.keimHash).not.toBe(a.keim.keimHash);
    expect(b.raeume.map((r) => r.zellen.join(":")).join("|")).not.toBe(a.raeume.map((r) => r.zellen.join(":")).join("|"));
  });

  it("bleibt über zwei unabhängige Importe derselben Bytes identisch", () => {
    const zweiteWelt = importiereAzgaar(quelle);
    const zweiteBurg = [...zweiteWelt.orte].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0]!;
    expect(zweiteBurg.id).toBe(burg.id);
    expect(zweiteBurg.kindKeim).toBe(burg.kindKeim);
    const a = grabe(burg), b = grabe(zweiteBurg);
    expect(b.wurzelId).toBe(a.wurzelId);
    expect(b.knoten.map((k) => k.id)).toStrictEqual(a.knoten.map((k) => k.id));
    expect(b.knoten.map((k) => k.herkunft?.kindKeim ?? null)).toStrictEqual(a.knoten.map((k) => k.herkunft?.kindKeim ?? null));
  });

  it("erzeugt keinen Artikel und keine Wissensvergabe auf dem ganzen Weg", () => {
    const grundriss = grabe(burg);
    // The generator emits doors, not articles (`model.ts:160-166`). If a scale boundary were the
    // place where that discipline quietly lapsed, this is where it would show.
    for (const knoten of grundriss.knoten) expect(knoten.sichtAnker).toBeNull();
    expect(grundriss.knoten.filter((k) => k.art === "raum").every((k) => k.titel === null)).toBe(true);
  });
});
