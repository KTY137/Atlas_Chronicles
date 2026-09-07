// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pruefeContainment } from "@chronicle/szene";
import { importiereEronKarte } from "../src/eron-map.ts";

const json = readFileSync(new URL("../../../design/fixtures/eron/map-andaria.json", import.meta.url), "utf8");
const source = () => JSON.parse(json) as { mapImage: string; coordinateOrder: string; origin: string; mapBounds: number[][];
  categories: { id: string; name: string; color: string; symbol: string; symbolColor: string }[];
  markers: { id: string; categoryId: string; position: number[]; popup: { title: string; description: string; link: { url: string; label: string } } }[] };

describe("real Andaria interactive map", () => {
  it("keeps every source marker and category symbol on the matching coordinate frame", () => {
    const map = importiereEronKarte(json);
    expect(map.titel).toBe("Andaria"); expect(map.szene.size).toEqual([8192, 8192]);
    expect(map.orte).toHaveLength(190); expect(new Set(map.orte.map(p => p.id)).size).toBe(190);
    const akkator = map.orte.find(p => p.name === "Akkator")!;
    expect(akkator).toMatchObject({ x: 3086.2545931518985, y: 3098.25, merkmale: { sourceMarkerId: "1", category: "Terabur", color: "#007afa", symbol: "T", symbolColor: "#ffffff" } });
    expect(akkator.merkmale.sourcePosition).toEqual([3086.2545931518985, 5093.75]);
    expect(map.orte.find(p => p.name === "Bjoldiri")).toMatchObject({ x: 5774, y: 3341 });
    expect(map.orte.find(p => p.name === "Blattheim")?.merkmale.description).toContain("[[Hochelfenrat]]");
    expect(map.quelle.json).toBe(json);
    expect(new Set(map.orte.map(p => p.merkmale.category)).size).toBe(16);
  });

  it("gives politics no spatial-parent edge and derives a stable child seed for each marker", () => {
    const map = importiereEronKarte(json);
    expect(pruefeContainment(map.knoten)).toEqual([]);
    expect(map.knoten).toHaveLength(191);
    for (const place of map.orte) {
      expect(place.eltern).toEqual([{ von: place.id, nach: map.weltId, art: "liegt_in_geografie" }]);
      expect(place.kindKeim).toMatch(/^[0-9a-f]{64}$/);
      expect(map.knoten.find(n => n.id === place.id)?.anker).toEqual({ in: map.weltId, bei: [place.x, place.y], massstab: 1 });
    }
  });

  it("retains marker identity and child seed across array reorder, renaming and coordinate edits", () => {
    const before = importiereEronKarte(json), edited = source();
    edited.markers.reverse(); edited.categories.reverse();
    const marker = edited.markers.find(p => p.id === "1")!;
    marker.position = [3200, 5100]; marker.popup.title = "Neuer Stadtname";
    const after = importiereEronKarte(JSON.stringify(edited));
    const oldPlace = before.orte.find(p => p.merkmale.sourceMarkerId === "1")!, newPlace = after.orte.find(p => p.merkmale.sourceMarkerId === "1")!;
    expect(newPlace.id).toBe(oldPlace.id); expect(newPlace.kindKeim).toBe(oldPlace.kindKeim);
    expect(newPlace).toMatchObject({ name: "Neuer Stadtname", x: 3200, y: 3092 });
  });

  it("normalizes a nonzero yx/top-left frame without assuming Andaria", () => {
    const edited = source(); edited.mapImage = "Other map.png"; edited.coordinateOrder = "yx";
    edited.origin = "top-left"; edited.mapBounds = [[10, 20], [110, 220]];
    edited.markers = [{ ...edited.markers[0]!, position: [40, 80] }];
    expect(importiereEronKarte(JSON.stringify(edited)).orte[0]).toMatchObject({ x: 60, y: 30 });
  });

  it.each(["duplicate", "category", "coordinate", "color", "origin"] as const)("rejects malformed source atomically: %s", fault => {
    const edited = source();
    if (fault === "duplicate") edited.markers.push(edited.markers[0]!);
    if (fault === "category") edited.markers[0]!.categoryId = "missing";
    if (fault === "coordinate") edited.markers[0]!.position[1] = 8193;
    if (fault === "color") edited.categories[0]!.color = "url(https://example.org)";
    if (fault === "origin") edited.origin = "center";
    expect(() => importiereEronKarte(JSON.stringify(edited))).toThrow();
  });

  it("keeps source text inert and rejects excessive depth before normalization", () => {
    const edited = source(); edited.markers[0]!.popup.description = '<img src=x onerror="alert(1)">';
    expect(importiereEronKarte(JSON.stringify(edited)).orte.find(p => p.merkmale.sourceMarkerId === "1")?.merkmale.description).toBe(edited.markers[0]!.popup.description);
    const nested = JSON.stringify(edited).slice(0, -1) + ',"unknown":' + '['.repeat(35) + '0' + ']'.repeat(35) + '}';
    expect(() => importiereEronKarte(nested)).toThrow("verschachtelt");
  });
});
