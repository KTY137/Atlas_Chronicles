// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { canonicalJson, textHash, type CanonicalValue } from "@chronicle/core";
import { pruefeContainment, raumEltern } from "@chronicle/szene";
import { AzgaarImportError, azgaarImportAdapter, importiereAzgaar } from "../src/index.ts";

/** Deliberately synthetic boundary fixture; the separately captured fixture tests real exports. */
function fixture() {
  return {
    info: { version: "1.151.2", seed: "boundary-test", width: 200, height: 100, mapName: "Zwei Inseln", mapId: 123, exportedAt: "2026-09-06" },
    settings: { options: { provinces: 50, states: 1 }, distanceScale: 3 },
    pack: {
      cells: [
        { i: 7, p: [20, 20], h: 50, f: 2, state: 1, province: 4, v: [0, 1, 2], biome: 3, religion: 1 },
        { i: 11, p: [120, 20], h: 50, f: 3, state: 1, province: 4, v: [3, 4, 5], biome: 3, religion: 1 },
        { i: 19, p: [80, 50], h: 10, f: 1, state: 0, province: 0, v: [1, 2, 3], biome: 0, religion: 0 },
      ],
      vertices: [{ i: 0, p: [0, 0] }, { i: 1, p: [40, 0] }, { i: 2, p: [20, 40] }, { i: 3, p: [100, 0] }, { i: 4, p: [140, 0] }, { i: 5, p: [120, 40] }],
      features: [{ i: 0 }, { i: 1, land: false }, { i: 2, land: true }, { i: 3, land: true }],
      states: [{ i: 0, name: "Neutrals" }, { i: 1, name: "Das Reich" }],
      provinces: [{ i: 0 }, { i: 4, name: "Übersee", center: 7 }],
      burgs: [{ i: 0 }, { i: 5, name: "Iris", x: 20, y: 20, cell: 7, population: 12, capital: 1, port: 1 }, { i: 9, name: "Iris", x: 120, y: 20, cell: 11, population: 5, capital: 0, port: 1 }],
      markers: [{ i: 1, type: "ruin" }], routes: [], rivers: [],
    },
    notes: [{ id: "marker1", name: "Lore", legend: "<script>untrusted prose</script>" }],
  };
}
const run = (value: unknown) => importiereAzgaar(JSON.stringify(value));
describe("Azgaar import boundary", () => {
  it("imports cell-derived relations, preserves parallel geography/polity and emits no articles", () => {
    const imported = run(fixture());
    expect(imported.bericht.knotenNachArt).toEqual({ welt: 1, landmasse: 2, macht: 1, region: 1, ort: 2 });
    expect(imported.orte).toHaveLength(2);
    expect(imported.orte[0]!.id).not.toBe(imported.orte[1]!.id);
    expect(pruefeContainment(imported.knoten)).toEqual([]);
    const realm = imported.knoten.find((n) => n.art === "macht")!;
    expect(realm.eltern.filter((e) => e.art === "beruehrt")).toHaveLength(2);
    const province = imported.knoten.find((n) => n.art === "region")!;
    expect(raumEltern(province)).toEqual([imported.weltId]);
    for (const place of imported.orte) expect(place.eltern).toContainEqual({ von: place.id, nach: province.id, art: "liegt_in_geografie" });
    expect(imported.szene.regions).toHaveLength(2);
    expect(imported.szene.places).toHaveLength(2);
    expect(imported.knoten.every((n) => n.sichtAnker === null)).toBe(true);
    expect(imported.bericht.unterdrueckteNotizen).toBe(1);
    expect(JSON.stringify({ ...imported, quelle: null })).not.toContain("untrusted prose");
    expect(imported).not.toHaveProperty("articles");
  });
  it("retains exact artifact bytes and source child seeds without using indexes as node IDs", () => {
    const json = JSON.stringify(fixture(), null, 3);
    const imported = importiereAzgaar(json);
    expect(imported.quelle).toEqual({ format: "azgaar-full-json", sha256: textHash(json), bytes: Buffer.byteLength(json), json });
    expect(imported.orte.map((p) => p.kindKeim).sort()).toEqual(["boundary-test0005", "boundary-test0009"]);
  });
  it("survives array reorder and ignores volatile export metadata", () => {
    const a = fixture();
    const b = fixture();
    for (const array of Object.values(b.pack)) array.reverse();
    b.info.mapId = 999;
    b.info.exportedAt = "2030-01-01";
    const left = run(a);
    const right = run(b);
    expect(canonicalJson(left.knoten as unknown as CanonicalValue)).toBe(canonicalJson(right.knoten as unknown as CanonicalValue));
    expect(left.orte).toEqual(right.orte);
    expect(left.szene).toEqual(right.szene);
    expect(left.quelle.sha256).not.toBe(right.quelle.sha256);
  });
  it("ties identities to version and the complete available options vector", () => {
    const before = run(fixture());
    const changed = fixture();
    changed.settings.options.provinces = 60;
    expect(run(changed).weltId).not.toBe(before.weltId);
    changed.info.version = "1.152.0";
    expect(run(changed).keim.keimHash).not.toBe(before.keim.keimHash);
  });
  it("rejects Minimal exports with an actionable Full-export error", () => {
    const input = fixture();
    const { cells: _cells, ...minimal } = input.pack;
    expect(() => run({ ...input, pack: minimal })).toThrow("Full JSON");
  });
  it("rejects missing cell, province and vertex references atomically", () => {
    const badBurg = fixture();
    badBurg.pack.burgs[1]!.cell = 999;
    expect(() => run(badBurg)).toThrow(AzgaarImportError);
    const badProvince = fixture();
    badProvince.pack.cells[0]!.province = 999;
    expect(() => run(badProvince)).toThrow("Referenz 999");
    const badVertex = fixture();
    badVertex.pack.cells[0]!.v[0] = 999;
    expect(() => run(badVertex)).toThrow("Ecke 999");
  });
  it("rejects duplicate source identities and ambiguous stable paths", () => {
    const duplicate = fixture();
    duplicate.pack.cells.push({ ...duplicate.pack.cells[0]! });
    expect(() => run(duplicate)).toThrow("doppelte Zell-ID");
    const ambiguous = fixture();
    ambiguous.pack.burgs[2]!.x = 20;
    expect(() => run(ambiguous)).toThrow("mehrdeutiger stabiler Erzeugungspfad");
  });
  it("rejects malformed numbers, oversized dimensions and extreme nesting", () => {
    expect(() => importiereAzgaar('{"x":1e999}')).toThrow("nichtendliche");
    expect(() => importiereAzgaar("[".repeat(66) + "0" + "]".repeat(66))).toThrow("Verschachtelung");
    const input = fixture();
    input.info.width = -1;
    expect(() => run(input)).toThrow("Kartengröße");
    expect(() => importiereAzgaar("broken")).toThrow("ungültiges JSON");
  });
  it("implements ErzeugerAdapter and refuses a forged or different provenance hash", async () => {
    const json = JSON.stringify(fixture());
    const adapter = azgaarImportAdapter(json);
    const imported = importiereAzgaar(json);
    expect(await adapter.erzeuge(imported.keim)).toEqual(imported.orte);
    await expect(adapter.erzeuge({ ...imported.keim, keimHash: "forged" })).rejects.toThrow("Keim passt nicht");
  });
});

describe("Azgaar-Marker und ihre Notizen", () => {
  const mitMarker = (markers: unknown[], notes: unknown[]) => {
    const base = fixture();
    return run({ ...base, pack: { ...base.pack, markers }, notes });
  };

  it("nimmt den Marker samt seiner Notiz auf und lässt Generator-Markup nicht in die Struktur", () => {
    const imported = mitMarker(
      [{ i: 1, type: "ruin", x: 20, y: 20, cell: 7 }],
      [{ id: "marker1", name: "Die Bruchwarte", legend: "Eine Ruine. <script>alert(1)</script> Seit dem Krieg leer." }],
    );
    const marker = imported.orte.find((ort) => ort.merkmale["sourceMarkerId"] === 1);
    expect(marker).toBeDefined();
    // Der Name steckt in der NOTIZ, nicht im Marker — ohne sie wäre der Ort namenlos.
    expect(marker!.name).toBe("Die Bruchwarte");
    expect(marker!.merkmale["description"]).toBe("Eine Ruine. Seit dem Krieg leer.");
    expect(marker!.merkmale["markerTyp"]).toBe("ruin");
    // Die Sicherheitszusage bleibt: kein Markup und kein Skriptinhalt in der Struktur.
    expect(JSON.stringify({ ...imported, quelle: null })).not.toMatch(/<script|alert\(1\)/);
    expect(imported.bericht.unterdrueckteNotizen).toBe(0);
    expect(imported.bericht.ausgelasseneDatensaetze["markers"]).toBeUndefined();
    expect(pruefeContainment(imported.knoten)).toEqual([]);
  });

  it("überspringt einen Marker ohne Notiz und einen ohne Koordinaten, statt sie namenlos aufzunehmen", () => {
    const imported = mitMarker(
      [{ i: 1, type: "ruin", x: 20, y: 20, cell: 7 }, { i: 2, type: "cave", x: 21, y: 21, cell: 7 }, { i: 3, type: "cave" }],
      [{ id: "marker1", name: "Die Bruchwarte", legend: "Eine Ruine." }, { id: "marker3", name: "Ohne Ort", legend: "Nirgends." }],
    );
    expect(imported.orte.filter((ort) => ort.merkmale["sourceMarkerId"] !== undefined)).toHaveLength(1);
    expect(imported.bericht.ausgelasseneMarker).toBe(2);
    // Die Notiz des übersprungenen Markers bleibt unterdrückt und wird gezählt.
    expect(imported.bericht.unterdrueckteNotizen).toBe(1);
  });

  it("entfernt Zeichen, die keine Datenbank tragen kann, und behält das gültige Zeichenpaar", () => {
    // Aus dem echten Korpus: die Notiz zu Nalarlethkas Monolith trägt eine erfundene Inschrift
    // aus rohen Codeeinheiten. Einzelne Surrogathälften sind kein Text, den Postgres in jsonb
    // annimmt — der Import darf daran nicht scheitern, und das echte Zeichen muss bleiben.
    const imported = mitMarker(
      [{ i: 1, type: "ruin", x: 20, y: 20, cell: 7 }],
      [{ id: "marker1", name: "Der Monolith", legend: "Inschrift: \uD802\uDC22 dann \uDC08 und \uD802 Ende." }],
    );
    const beschreibung = String(imported.orte.find((ort) => ort.merkmale["sourceMarkerId"] === 1)!.merkmale["description"]);
    expect(beschreibung).toContain("\uD802\uDC22");
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(beschreibung)).toBe(false);
    expect(beschreibung).toContain("Ende.");
  });

  it("leitet dieselbe Kennung aus derselben Markernummer ab, damit ein zweiter Import nichts verdoppelt", () => {
    const eins = mitMarker([{ i: 1, type: "ruin", x: 20, y: 20, cell: 7 }], [{ id: "marker1", name: "Die Bruchwarte", legend: "Eine Ruine." }]);
    const zwei = mitMarker([{ i: 1, type: "ruin", x: 20, y: 20, cell: 7 }], [{ id: "marker1", name: "Die Bruchwarte", legend: "Eine Ruine." }]);
    const kennung = (i: typeof eins) => i.orte.find((ort) => ort.merkmale["sourceMarkerId"] === 1)!.id;
    expect(kennung(eins)).toBe(kennung(zwei));
    expect(kennung(eins)).not.toBe(eins.orte.find((ort) => ort.merkmale["sourceMarkerId"] === undefined)!.id);
  });
});
