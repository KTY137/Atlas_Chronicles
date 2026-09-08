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
describe("settlement v6 canonical cartography", () => {
  it("keeps visible wall stonework, shadows and gate caps out of canonical building roofs", () => {
    const cases = [96, 16, 192].map(zellgroesse => ({ seed: "gallery:river-1", zellgroesse }))
      .concat(["gallery:orchard-2", "gallery:gate-3"].map(seed => ({ seed, zellgroesse: 96 })));
    for (const { seed, zellgroesse } of cases) {
      const generated = erzeugeSiedlung({ keim: seed, optionen: { art: "stadt", zellgroesse } }, paket);
      const buildingIds = new Set<string>(generated.bauwerke.map(building => building.id));
      const roofs = generated.karte.geometry.regions.filter(region => buildingIds.has(region.id))
        .flatMap(region => (region.punkte.length === 6
          ? [[region.punkte[0]!, region.punkte[1]!, region.punkte[2]!, region.punkte[5]!], [region.punkte[2]!, region.punkte[3]!, region.punkte[4]!, region.punkte[5]!]]
          : [region.punkte]).map(points => ({ id: region.id, points })));
      const wallIds = new Set(generated.karte.walls.map(wall => wall.id));
      const wallPaint = cartographyDraw(generated.karte, generated.cartography).polygons.filter(polygon => wallIds.has(polygon.regionId));
      expect(wallPaint.length, seed).toBeGreaterThan(20);
      const collisions = wallPaint.flatMap(wall => roofs.filter(roof => overlap(wall.points, roof.points)).map(roof => `${wall.regionId}/${roof.id}`));
      expect([...new Set(collisions)], `${seed}/${zellgroesse}: all visible stone, caps and shadows need a real setback from buildings`).toEqual([]);
    }
  });
  it("keeps usable market walks, organic core walls and landscape clear of real water and road crossings", () => {
    for (const art of ["dorf", "stadt"] as const) for (const seed of ["gallery:river-1", "gallery:orchard-2", "gallery:gate-3"]) {
      const generated = erzeugeSiedlung({ keim: seed, optionen: { art } }, paket);
      const regions = new Map(generated.karte.geometry.regions.map(region => [region.id, region.punkte]));
      const roles = generated.cartography.regions;
      const polygons = (predicate: (role: typeof roles[number]) => boolean) => roles.filter(predicate).map(role => regions.get(role.regionId)!);
      const water = polygons(role => role.role === "water"), roads = polygons(role => role.role === "road");
      const squares = polygons(role => role.role === "road" && role.material === "square");
      const paths = polygons(role => role.role === "road" && role.material === "path");
      const roofs = polygons(role => role.role === "building").flatMap(points => points.length === 6
        ? [[points[0]!, points[1]!, points[2]!, points[5]!], [points[2]!, points[3]!, points[4]!, points[5]!]] : [points]);
      expect(squares.length, `${art}/${seed}: a visible market`).toBeGreaterThan(0);
      const walks = paths.filter(path => squares.some(square => overlap(path, square)));
      expect(walks.length, `${art}/${seed}: a walk into the market`).toBeGreaterThan(0);
      for (const place of [...squares, ...walks]) for (const obstacle of [...water, ...roofs]) {
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
  });
  it("composes a dense inhabited city core, loose outskirts and substantial countryside across the gallery seeds", () => {
    for (const seed of ["gallery:river-1", "gallery:orchard-2", "gallery:gate-3"]) {
      const generated = erzeugeSiedlung({ keim: seed, optionen: { art: "stadt" } }, paket);
      expect(generated.bauwerke.length, seed).toBeGreaterThanOrEqual(200);
      const [width, height] = generated.karte.geometry.size, canvas = width * height;
      const regions = new Map(generated.karte.geometry.regions.map(region => [region.id, region.punkte]));
      const materialAreas = (material: string) => generated.cartography.regions
        .filter(role => "material" in role && role.material === material).map(role => area(regions.get(role.regionId)!));
      expect(materialAreas("forest").reduce((sum, value) => sum + value, 0), seed).toBeGreaterThan(canvas * .07);
      expect(Math.max(...materialAreas("forest")), seed).toBeGreaterThan(canvas * .018);
      expect(materialAreas("field").filter(value => value > canvas * .006).length, seed).toBeGreaterThanOrEqual(3);
      expect(materialAreas("river").reduce((sum, value) => sum + value, 0), seed).toBeGreaterThan(canvas * .045);
      const houses = generated.bauwerke.map(house => {
        const points = regions.get(house.id)!, center = points.reduce(([x, y], p) => [x + p[0] / points.length, y + p[1] / points.length], [0, 0]);
        return { center, area: area(points), distance: Math.hypot((center[0]! / width - .5) * 2, (center[1]! / height - .5) * 2) };
      });
      const core = houses.filter(house => house.distance < .4), outside = houses.filter(house => house.distance >= .6);
      expect(core.length, seed).toBeGreaterThan(50);
      expect(outside.length, seed).toBeGreaterThan(12);
      expect(core.reduce((sum, house) => sum + house.area, 0) / core.length, seed)
        .toBeLessThan(outside.reduce((sum, house) => sum + house.area, 0) / outside.length);
      const closeNeighbours = core.filter(house => houses.some(other => other !== house
        && Math.hypot(house.center[0]! - other.center[0]!, house.center[1]! - other.center[1]!) < 96 * 2.4));
      expect(closeNeighbours.length / core.length, seed).toBeGreaterThan(.8);
    }
  });
  for (const art of ["weiler", "dorf", "stadt"] as SiedlungArt[]) it(`${art}: small orthogonal roofs, larger lots, landscape and actual water crossings across fixed seeds`, () => {
    for (const seed of ["gallery:river-1", "gallery:orchard-2", "gallery:gate-3"]) {
      const generated = erzeugeSiedlung({ keim: seed, optionen: { art } }, paket);
      expect(generated.version).toBe("6");
      const roles = parseTacticalCartography(generated.cartography, generated.karte).regions;
      expect(roles).toHaveLength(generated.karte.geometry.regions.length);
      const region = (id: string) => generated.karte.geometry.regions.find(value => value.id === id)!;
      expect(roles.some(role => role.role === "terrain" && role.material === "grass")).toBe(true);
      expect(roles.some(role => role.role === "terrain" && ["field", "forest"].includes(role.material))).toBe(true);
      expect(roles.some(role => role.role === "water")).toBe(true);
      expect(roles.some(role => role.role === "road" && role.material === "bridge")).toBe(true);
      const [width, height] = generated.karte.geometry.size;
      const squares = roles.filter(role => role.role === "road" && role.material === "square");
      expect(squares.reduce((sum, role) => sum + area(region(role.regionId).punkte), 0)).toBeLessThan(width * height * .03);
      const waters = roles.filter(role => role.role === "water").map(role => region(role.regionId).punkte);
      expect(generated.bauwerke.length).toBeGreaterThan(0);
      for (const house of generated.bauwerke) {
        expect([4, 6]).toContain(house.umriss.length);
        const role = roles.find(value => value.regionId === house.id)!;
        expect(role.role).toBe("building");
        if (role.role !== "building") continue;
        expect(role.streetRegionId).toBe(house.strasse);
        expect(role.lotRegionId).toBeTruthy();
        expect(area(region(role.lotRegionId!).punkte)).toBeGreaterThan(area(region(house.id).punkte) * 1.45);
        const points = region(house.id).punkte;
        expect(points.every(([x, y]) => x > width * .04 && x < width * .96 && y > height * .04 && y < height * .96)).toBe(true);
        const convexRoofs = points.length === 6 ? [[points[0]!, points[1]!, points[2]!, points[5]!], [points[2]!, points[3]!, points[4]!, points[5]!]] : [points];
        for (const roof of convexRoofs) for (const water of waters) expect(overlap(roof, water), `${art}/${seed}/${house.titel} touches water`).toBe(false);
        for (let i = 0; i < house.umriss.length; i++) {
          const a = house.umriss[i]!, b = house.umriss[(i + 1) % house.umriss.length]!, c = house.umriss[(i + 2) % house.umriss.length]!;
          const ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1];
          expect(Math.abs(ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy))).toBeLessThan(.02);
        }
      }
      expect(generated.karte.geometry.regions.reduce((sum, value) => sum + value.punkte.length, 0)).toBeLessThanOrEqual(20_000);
      expect(generated.karte.geometry.stamps.length).toBeLessThan(80);
      expect(erzeugeSiedlung({ keim: seed, optionen: { art } }, paket)).toEqual(generated);
    }
  });
});
