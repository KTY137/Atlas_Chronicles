// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cartographyDraw, parseAssetpaket } from "@chronicle/szene";
import { parseTacticalCartography } from "@chronicle/szene";
import { erzeugeSiedlung, type SiedlungArt } from "../src/siedlung.ts";
const paket = parseAssetpaket(readFileSync(new URL("../../../assets/packs/pk.grundriss/paket.json", import.meta.url), "utf8"));
const area = (points: readonly (readonly [number, number])[]) => Math.abs(points.reduce((sum, p, i) => { const n = points[(i + 1) % points.length]!; return sum + p[0] * n[1] - n[0] * p[1]; }, 0)) / 2;
type Polygon = readonly (readonly [number, number])[];
function overlap(a: Polygon, b: Polygon): boolean {
  for (const points of [a, b]) for (let i = 0; i < points.length; i++) {
    const p = points[i]!, n = points[(i + 1) % points.length]!, nx = n[1] - p[1], ny = p[0] - n[0];
    const left = a.map(point => point[0] * nx + point[1] * ny), right = b.map(point => point[0] * nx + point[1] * ny);
    if (Math.max(...left) <= Math.min(...right) + .01 || Math.max(...right) <= Math.min(...left) + .01) return false;
  }
  return true;
}
/** Konvexe Teile eines Dachs: ein L zerfällt in zwei Vierecke, der Kreuzgrundriss des Doms (zwölf
 *  Ecken, nichtkonvex) in Langhaus und Querhaus. Das Trennachsenverfahren unten gilt nur für konvexe
 *  Polygone; ein Kreuz als Ganzes behandelte es wie seine Hülle und sähe Plätze in den Innenecken. */
function konvexeTeile(points: Polygon): Polygon[] {
  if (points.length === 6) return [[points[0]!, points[1]!, points[2]!, points[5]!], [points[2]!, points[3]!, points[4]!, points[5]!]];
  const konvex = points.every((p, i) => { const a = points[(i + points.length - 1) % points.length]!, b = points[(i + 1) % points.length]!; return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) >= -1e-6; })
    || points.every((p, i) => { const a = points[(i + points.length - 1) % points.length]!, b = points[(i + 1) % points.length]!; return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) <= 1e-6; });
  if (points.length === 12 && !konvex) return [[points[0]!, points[5]!, points[6]!, points[11]!], [points[2]!, points[3]!, points[8]!, points[9]!]];
  return [points];
}
/** These cases each build three to six complete cities. Generation, not assertion, owns the
 * wall clock here, so they carry their own budget instead of raising the global default.
 * 30 s is the house number for that across the repo (`io/test/campaign-bundle-v3-large.test.ts`
 * and the Postgres fixtures in `server/test`), not a figure invented for these cases. */
const HEAVY = 60_000; // 2026-09-10: 30 s reichte allein (7 s), nicht unter Volllast von 96 Dateien (30,5 s).
/**
 * Seit 2026-09-23 baut Fantasy Städte aus Vierteln (v11): Häuserzeilen füllen ihr Los, Felder liegen
 * in Streifen, der Markt grenzt direkt an Straßen, ein Dorf hat einen Anger. Die Qualitätsregeln
 * dieser Datei gelten weiter; die Formregeln des Rasterbausteins (rechtwinklige Einzelhäuser mit
 * Garten) prüft der letzte Block gegen v8 mit dem Setting Gegenwart.
 */
describe("settlement canonical cartography", () => {
  it("keeps visible wall stonework, shadows and gate caps out of canonical building roofs", () => {
    const cases = [96, 16, 192].map(zellgroesse => ({ seed: "gallery:river-1", zellgroesse }))
      .concat(["gallery:orchard-2", "gallery:gate-3"].map(seed => ({ seed, zellgroesse: 96 })));
    for (const { seed, zellgroesse } of cases) {
      const generated = erzeugeSiedlung({ keim: seed, optionen: { art: "stadt", zellgroesse } }, paket);
      // Rundtürme stehen auf der Mauer: die Mauer endet unter ihnen, und die Optik (cartography-12)
      // zeichnet sie nach der Mauer. Für sie gilt die Reihenfolge, nicht der Abstand.
      const turmIds = new Set<string>(generated.bauwerke.filter(building => building.typ === "turm" && building.umriss.length === 12).map(building => building.id));
      const buildingIds = new Set<string>(generated.bauwerke.filter(building => !turmIds.has(building.id)).map(building => building.id));
      const roofs = generated.karte.geometry.regions.filter(region => buildingIds.has(region.id))
        .flatMap(region => konvexeTeile(region.punkte).map(points => ({ id: region.id, points })));
      const wallIds = new Set(generated.karte.walls.map(wall => wall.id));
      const drawing = cartographyDraw(generated.karte, generated.cartography).polygons;
      const wallPaint = drawing.filter(polygon => wallIds.has(polygon.regionId));
      const letzteMauer = Math.max(...drawing.map((polygon, index) => wallIds.has(polygon.regionId) ? index : -1));
      expect(turmIds.size, seed).toBeGreaterThan(4);
      expect(drawing.some((polygon, index) => turmIds.has(polygon.regionId) && index < letzteMauer && polygon.fill !== 0x26332b), `${seed}/${zellgroesse}: a tower is painted under the wall`).toBe(false);
      expect(wallPaint.length, seed).toBeGreaterThan(20);
      const collisions = wallPaint.flatMap(wall => roofs.filter(roof => overlap(wall.points, roof.points)).map(roof => `${wall.regionId}/${roof.id}`));
      expect([...new Set(collisions)], `${seed}/${zellgroesse}: all visible stone, caps and shadows need a real setback from buildings`).toEqual([]);
    }
  }, HEAVY);
  it("keeps usable market walks, organic core walls and landscape clear of real water and road crossings", () => {
    for (const art of ["dorf", "stadt"] as const) for (const seed of ["gallery:river-1", "gallery:orchard-2", "gallery:gate-3"]) {
      const generated = erzeugeSiedlung({ keim: seed, optionen: { art } }, paket);
      const regions = new Map(generated.karte.geometry.regions.map(region => [region.id, region.punkte]));
      const roles = generated.cartography.regions;
      const polygons = (predicate: (role: typeof roles[number]) => boolean) => roles.filter(predicate).map(role => regions.get(role.regionId)!);
      const water = polygons(role => role.role === "water"), roads = polygons(role => role.role === "road");
      const squares = polygons(role => role.role === "road" && role.material === "square");
      const paths = polygons(role => role.role === "road" && role.material === "path");
      const roofs = polygons(role => role.role === "building").flatMap(konvexeTeile);
      // Die Stadt hat einen gepflasterten Markt, das Dorf einen Anger (Wiese) — beide benannt.
      expect(generated.bericht.viertel?.some(v => v.nutzung === "markt"), `${art}/${seed}: a named market`).toBe(true);
      if (art === "stadt") expect(squares.length, `${art}/${seed}: a visible market`).toBeGreaterThan(0);
      // Der Markt grenzt an eine Straße: ein Eckpunkt des Platzes liegt höchstens eine Fünftelzelle von einer Fahrbahn.
      const z = generated.cartography.construction.cellSize;
      const naheStrasse = (square: Polygon) => roads.some(road => road !== square && square.some(([x, y]) => road.some((a, i) => {
        const b = road[(i + 1) % road.length]!, dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / ((dx * dx + dy * dy) || 1)));
        return Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y) <= z * .2;
      })));
      for (const square of squares) expect(naheStrasse(square), `${art}/${seed}: a square nobody can reach`).toBe(true);
      void paths;
      for (const place of squares) for (const obstacle of [...water, ...roofs]) {
        expect(overlap(place, obstacle), `${art}/${seed}: market access obstructed`).toBe(false);
      }
      for (const patch of polygons(role => role.role === "terrain" && ["forest", "field"].includes(role.material))) {
        for (const obstacle of [...water, ...roads]) expect(overlap(patch, obstacle), `${art}/${seed}: countryside covers a route or water`).toBe(false);
      }
      if (art !== "stadt") continue;
      const walls = generated.karte.walls;
      expect(walls.length, seed).toBeGreaterThan(10);
      const [width, height] = generated.karte.geometry.size;
      expect(walls.flatMap(wall => wall.points).every(([x, y]) => x > width * .05 && x < width * .95 && y > height * .05 && y < height * .95), seed).toBe(true);
      expect(walls.filter(wall => Math.abs(wall.points[0]![0] - wall.points[1]![0]) > 5
        && Math.abs(wall.points[0]![1] - wall.points[1]![1]) > 5).length, seed).toBeGreaterThan(8);
      for (const wall of walls) {
        const a = wall.points[0]!, b = wall.points[1]!, dx = b[0] - a[0], dy = b[1] - a[1], size = Math.hypot(dx, dy);
        const nx = -dy / size * .2, ny = dx / size * .2;
        const strip: Polygon = [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]];
        for (const obstacle of [...water, ...roads]) expect(overlap(strip, obstacle), `${seed}: wall blocks an actual crossing`).toBe(false);
      }
    }
  }, HEAVY);
  it("composes a dense inhabited city core, loose outskirts and substantial countryside across the gallery seeds", () => {
    for (const seed of ["gallery:river-1", "gallery:orchard-2", "gallery:gate-3"]) {
      const generated = erzeugeSiedlung({ keim: seed, optionen: { art: "stadt" } }, paket);
      expect(generated.bauwerke.length, seed).toBeGreaterThanOrEqual(200);
      const [width, height] = generated.karte.geometry.size, canvas = width * height;
      const regions = new Map(generated.karte.geometry.regions.map(region => [region.id, region.punkte]));
      const materialAreas = (material: string) => generated.cartography.regions
        .filter(role => "material" in role && role.material === material).map(role => area(regions.get(role.regionId)!));
      // 2026-09-10: v8 (piers) reshuffled the gallery seeds. How much wood a seed carries is the
      // land's own decision (its moisture); every city keeps some, and the patch test below keeps it a wood.
      const forest = materialAreas("forest").reduce((sum, value) => sum + value, 0);
      expect(forest, seed).toBeGreaterThan(canvas * .012);
      // The outer woods are tessellated per relief cell and merged where they are solid; a
      // wood is still a wood, not confetti: its largest merged patch spans several cells. A
      // seed whose land is dry carries copses instead, and copses are small by nature.
      if (forest > canvas * .04) expect(Math.max(...materialAreas("forest")), seed).toBeGreaterThan(canvas * .003);
      // Felder liegen in Streifen (Gewannflur): viele schmale, zusammen ein guter Teil der Karte.
      expect(materialAreas("field").length, seed).toBeGreaterThanOrEqual(12);
      expect(materialAreas("field").reduce((sum, value) => sum + value, 0), seed).toBeGreaterThan(canvas * .08);
      expect(materialAreas("river").reduce((sum, value) => sum + value, 0), seed).toBeGreaterThan(canvas * .045);
      const houses = generated.bauwerke.map(house => {
        const points = regions.get(house.id)!, center = points.reduce(([x, y], p) => [x + p[0] / points.length, y + p[1] / points.length], [0, 0]);
        return { center, area: area(points), distance: Math.hypot((center[0]! / width - .5) * 2, (center[1]! / height - .5) * 2) };
      });
      const core = houses.filter(house => house.distance < .4), outside = houses.filter(house => house.distance >= .6);
      expect(core.length, seed).toBeGreaterThan(50);
      expect(outside.length, seed).toBeGreaterThan(12);
      // Dicht heißt: der Kern ist viel stärker bebaut als der Rand — gemessen als Dachfläche je Fläche,
      // nicht als Hausgröße (Häuserzeilen im Kern füllen ihr Los und sind größer als Katen am Rand).
      const kernFlaeche = Math.PI * .2 * width * .2 * height, randFlaeche = canvas - Math.PI * .3 * width * .3 * height;
      expect(core.reduce((sum, house) => sum + house.area, 0) / kernFlaeche, seed)
        .toBeGreaterThan(outside.reduce((sum, house) => sum + house.area, 0) / randFlaeche * 2);
      const closeNeighbours = core.filter(house => houses.some(other => other !== house
        && Math.hypot(house.center[0]! - other.center[0]!, house.center[1]! - other.center[1]!) < 96 * 2.4));
      expect(closeNeighbours.length / core.length, seed).toBeGreaterThan(.8);
    }
  });
  for (const [art, setting] of (["weiler", "dorf", "stadt"] as SiedlungArt[]).flatMap(art => [[art, "fantasy"], [art, "gegenwart"], [art, "scifi"]] as const)) it(`${art}/${setting}: roofs on lots, landscape and actual water crossings across fixed seeds`, () => {
    for (const seed of ["gallery:river-1", "gallery:orchard-2", "gallery:gate-3"]) {
      const generated = erzeugeSiedlung({ keim: seed, optionen: { art, setting } }, paket);
      expect(generated.version).toBe(setting === "fantasy" ? "11" : "12");
      const roles = parseTacticalCartography(generated.cartography, generated.karte).regions;
      expect(roles).toHaveLength(generated.karte.geometry.regions.length);
      const region = (id: string) => generated.karte.geometry.regions.find(value => value.id === id)!;
      expect(roles.some(role => role.role === "terrain" && role.material === "grass")).toBe(true);
      expect(roles.some(role => role.role === "terrain" && ["field", "forest"].includes(role.material))).toBe(true);
      expect(roles.some(role => role.role === "water")).toBe(true);
      expect(roles.some(role => role.role === "road" && role.material === "bridge")).toBe(true);
      const [width, height] = generated.karte.geometry.size;
      const squares = roles.filter(role => role.role === "road" && role.material === "square");
      // Eine Kolonie hat Deck und Vorfeld (Landefelder): dort ist mehr Fläche gepflastert.
      expect(squares.reduce((sum, role) => sum + area(region(role.regionId).punkte), 0)).toBeLessThan(width * height * (setting === "scifi" ? .06 : .03));
      const waters = roles.filter(role => role.role === "water").map(role => region(role.regionId).punkte);
      expect(generated.bauwerke.length).toBeGreaterThan(0);
      for (const house of generated.bauwerke) {
        const role = roles.find(value => value.regionId === house.id)!;
        expect(role.role).toBe("building");
        if (role.role !== "building") continue;
        expect(role.streetRegionId).toBe(house.strasse);
        expect(role.lotRegionId).toBeTruthy();
        // Ein Los ist nie kleiner als sein Haus (eine Häuserzeile füllt es bis auf die Fuge).
        expect(area(region(role.lotRegionId!).punkte)).toBeGreaterThanOrEqual(area(region(house.id).punkte) - 1e-6);
        const points = region(house.id).punkte;
        expect(points.every(([x, y]) => x > width * .04 && x < width * .96 && y > height * .04 && y < height * .96)).toBe(true);
        for (const roof of konvexeTeile(points)) for (const water of waters) expect(overlap(roof, water), `${art}/${seed}/${house.titel} touches water`).toBe(false);
      }
      expect(generated.karte.geometry.regions.reduce((sum, value) => sum + value.punkte.length, 0)).toBeLessThanOrEqual(20_000);
      expect(generated.karte.geometry.stamps.length).toBeLessThan(80);
      expect(erzeugeSiedlung({ keim: seed, optionen: { art, setting } }, paket)).toEqual(generated);
    }
  }, HEAVY);
});
