// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { deriveKnotenId, trustKnotenId } from "@chronicle/core";
import { MAX_TIEFE, ortswissenFuer, pruefeContainment, raumEltern, tiefe, weltkeim, type Knoten, type KantenArt } from "../src/index.ts";

const node = (id: string, parents: readonly [string, KantenArt][] = [], art: Knoten["art"] = "behaelter"): Knoten => ({
  id: trustKnotenId(id), art, titel: null,
  eltern: parents.map(([parent, kind]) => ({ von: trustKnotenId(id), nach: trustKnotenId(parent), art: kind })),
  rahmen: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" }, anker: null, herkunft: null, sichtAnker: null,
});
const root = node("world", [], "welt");

describe("containment write invariants", () => {
  it("rejects physical cycles and terminates read walks", () => {
    const a = node("a", [["b", "enthaelt_physisch"]]);
    const b = node("b", [["a", "enthaelt_physisch"]]);
    expect(pruefeContainment([a, b]).some((v) => v.art === "zyklus")).toBe(true);
    expect(() => tiefe(a.id, new Map([[a.id, a], [b.id, b]]))).toThrow("zyklus");
  });
  it("accepts depth 24 and rejects the 25th nesting edge", () => {
    const chain = [root];
    for (let i = 1; i <= MAX_TIEFE; i++) chain.push(node(String(i), [[i === 1 ? "world" : String(i - 1), "enthaelt_physisch"]]));
    expect(pruefeContainment(chain)).toEqual([]);
    expect(tiefe(chain.at(-1)!.id, new Map(chain.map((n) => [n.id, n])))).toBe(24);
    chain.push(node("25", [["24", "enthaelt_physisch"]]));
    expect(pruefeContainment(chain)).toContainEqual({ art: "max-tiefe", knotenId: trustKnotenId("25") });
  });
  it("allows multiple political/contact parents while enforcing one spatial parent", () => {
    const realm = node("realm", [["world", "liegt_in_geografie"]], "macht");
    const place = node("place", [["world", "liegt_in_geografie"], ["realm", "gehoert_zu_herrschaft"], ["realm", "beruehrt"]], "ort");
    expect(pruefeContainment([root, realm, place])).toEqual([]);
    expect(raumEltern(place)).toEqual([root.id]);
    const invalid = { ...place, eltern: [...place.eltern, { von: place.id, nach: realm.id, art: "enthaelt_physisch" as const }] };
    expect(pruefeContainment([root, realm, invalid]).some((e) => e.art === "mehrere-raumeltern")).toBe(true);
  });
  it("rejects dangling edges, forged edge owners, orphans and duplicate identities", () => {
    const dangling = node("a", [["absent", "liegt_in_geografie"]]);
    const forged = { ...dangling, eltern: [{ ...dangling.eltern[0]!, von: root.id }] };
    expect(pruefeContainment([root, root, node("orphan"), forged]).map((e) => e.art)).toEqual(expect.arrayContaining([
      "doppelte-id", "fehlender-raumelter", "fehlendes-elternteil", "falsche-kantenquelle",
    ]));
  });
  it("never inherits container knowledge or reveals its contents", () => {
    const known = new Map([[trustKnotenId("chest"), "erschlossen" as const]]);
    expect(ortswissenFuer(trustKnotenId("chest"), known)).toBe("erschlossen");
    expect(ortswissenFuer(trustKnotenId("coin"), known)).toBe("unbekannt");
  });
});

describe("world provenance", () => {
  it("canonicalizes all generation options and protects the hashed snapshot", () => {
    const options = { height: 720, nested: { z: 2, a: 1 }, width: 1280 };
    const a = weltkeim({ generator: "azgaar-fmg", version: "1.138.2", seed: "chronicle-1", optionen: options });
    const b = weltkeim({ generator: a.generator, version: a.version, seed: a.seed, optionen: { width: 1280, nested: { a: 1, z: 2 }, height: 720 } });
    expect(a.keimHash).toBe(b.keimHash);
    options.nested.a = 7;
    expect(a.optionen.nested).toEqual({ a: 1, z: 2 });
    const c = weltkeim({ generator: a.generator, version: a.version, seed: a.seed, optionen: { ...b.optionen, width: 1600 } });
    expect(c.keimHash).not.toBe(a.keimHash);
    const id = (k: typeof a) => deriveKnotenId({ erzeuger: k.generator, version: k.version, keim: k.keimHash, kind: "knoten", pfad: ["burg", "Sagyhafu", "120,400"] });
    expect(id(a)).toBe(id(b));
    expect(id(a)).not.toBe(id(c));
  });
  it("refuses invalid provenance instead of hashing an incomplete seed vector", () => {
    expect(() => weltkeim({ generator: "", version: "1", seed: "s", optionen: {} })).toThrow();
    expect(() => weltkeim({ generator: "g", version: "1", seed: "s", optionen: { width: NaN } })).toThrow();
  });
});
