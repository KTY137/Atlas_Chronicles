// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { abstandPolygonStrecke, clipHalbebene, doppelflaeche, flaeche, huelle, imPolygon, qp, schnittKonvex, schwerpunkt, type Polygon, type Punkt } from "../polygon.ts";
import type { rauschen } from "../kartenwerk.ts";

/**
 * **Was beide Siedlungsbausteine teilen.** Der alte Rasterbaustein (Gegenwart, Sci-Fi, v8–v10)
 * und der Viertelbaustein (Fantasy, v11) brauchen dieselben reinen Geometriehilfen: ein Haus in
 * ein Los stellen, ein Hindernis aus einem Polygon schneiden, eine Mauer um Dächer herum führen.
 * Sie ziehen keinen Zufall, deshalb verschiebt ihr Umzug den Zufallsstrom keines Bausteins.
 */
export type Zufall = ReturnType<typeof rauschen>;

/** Eine Gasse zwischen zwei Vierteln — die geteilte Voronoikante, zum Band verbreitert. */
export interface Gasse {
  readonly id: string;
  art: "hauptstrasse" | "gasse";
  readonly a: number;
  readonly b: number;
  readonly von: Punkt;
  readonly bis: Punkt;
  readonly band: Polygon;
}

/** Convex clipping keeps the same geometry authoritative for water, lots and bridges. */
const schnitt = schnittKonvex;

export function ohne(a: Polygon, b: Polygon): Polygon[] {
  let remaining = a; const result: Polygon[] = [], sign = Math.sign(doppelflaeche(b));
  for (let i = 0; i < b.length && remaining.length; i++) {
    const p = b[i]!, n = b[(i + 1) % b.length]!, nx = sign * (n[1] - p[1]), ny = sign * (p[0] - n[0]), c = nx * p[0] + ny * p[1];
    const outside = clipHalbebene(remaining, -nx, -ny, -c).map(qp);
    if (outside.length >= 3 && flaeche(outside) > .001) result.push(outside);
    remaining = clipHalbebene(remaining, nx, ny, c);
  }
  return result;
}

/** A positive clearance around a convex obstacle. `einwaerts` deliberately starts from
 * the original polygon and therefore cannot expand it by receiving a negative inset. */
export function mitAbstand(poly: Polygon, abstand: number): Polygon {
  const [x0, y0, x1, y1] = huelle(poly), sign = Math.sign(doppelflaeche(poly));
  let result: Polygon = [[x0 - abstand * 2, y0 - abstand * 2], [x1 + abstand * 2, y0 - abstand * 2], [x1 + abstand * 2, y1 + abstand * 2], [x0 - abstand * 2, y1 + abstand * 2]];
  for (let i = 0; i < poly.length && result.length; i++) {
    const p = poly[i]!, n = poly[(i + 1) % poly.length]!, dx = n[0] - p[0], dy = n[1] - p[1], length = Math.hypot(dx, dy);
    if (length < 1e-9) continue;
    const nx = sign * dy / length, ny = -sign * dx / length;
    result = clipHalbebene(result, nx, ny, nx * p[0] + ny * p[1] + abstand);
  }
  return result;
}

/** Conservative roof separation also leaves L-shaped houses distinct at parcel corners. */
export function getrennteDaecher(a: Polygon, b: Polygon): boolean {
  for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!, n = poly[(i + 1) % poly.length]!, nx = n[1] - p[1], ny = p[0] - n[0];
    const aa = a.map(point => point[0] * nx + point[1] * ny), bb = b.map(point => point[0] * nx + point[1] * ny);
    if (Math.max(...aa) <= Math.min(...bb) - .0001 || Math.max(...bb) <= Math.min(...aa) - .0001) return true;
  }
  return false;
}

/** Subtract actual polygon crossings from a line, including non-convex roof outlines. */
export function freieMauer(a: Punkt, b: Punkt, hindernisse: readonly Polygon[]): readonly [Punkt, Punkt][] {
  const dx = b[0] - a[0], dy = b[1] - a[1], cuts = [0, 1];
  const at = (t: number): Punkt => [a[0] + dx * t, a[1] + dy * t];
  for (const polygon of hindernisse) for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i]!, n = polygon[(i + 1) % polygon.length]!, ex = n[0] - p[0], ey = n[1] - p[1], cross = dx * ey - dy * ex;
    if (Math.abs(cross) < 1e-10) continue;
    const t = ((p[0] - a[0]) * ey - (p[1] - a[1]) * ex) / cross;
    const u = ((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / cross;
    if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
  }
  cuts.sort((x, y) => x - y);
  const result: [Punkt, Punkt][] = [];
  for (let i = 1; i < cuts.length; i++) {
    const from = cuts[i - 1]!, to = cuts[i]!;
    if ((to - from) * Math.hypot(dx, dy) < .04 || hindernisse.some(polygon => imPolygon(at((from + to) / 2), polygon))) continue;
    result.push([qp(at(from)), qp(at(to))]);
  }
  return result;
}

/** Small orthogonal roofs face the real street tangent, while their parcel stays organic. */
export type Hausform = "rechteck" | "l" | "u";
export function hausImLos(los: Polygon, gasse: Pick<Gasse, "von" | "bis" | "band">, breite: number, tiefe: number, form: Hausform): Polygon {
  const mitte = schwerpunkt(los), dx = gasse.bis[0] - gasse.von[0], dy = gasse.bis[1] - gasse.von[1], length = Math.hypot(dx, dy);
  const ux = dx / length, uy = dy / length, nx = -uy, ny = ux;
  const seite = Math.sign((mitte[0] - gasse.von[0]) * nx + (mitte[1] - gasse.von[1]) * ny) || 1;
  const fahrbahn = flaeche(gasse.band) / length / 2;
  const abstaende = los.map(point => ((point[0] - gasse.von[0]) * nx + (point[1] - gasse.von[1]) * ny) * seite);
  const frontAbstand = Math.min(...abstaende), frontPunkte = los.filter((_, i) => abstaende[i]! < frontAbstand + .02);
  const alongFront = frontPunkte.reduce((sum, point) => sum + (point[0] - gasse.von[0]) * ux + (point[1] - gasse.von[1]) * uy, 0) / frontPunkte.length;
  const alongCenter = (mitte[0] - gasse.von[0]) * ux + (mitte[1] - gasse.von[1]) * uy;
  let best: Polygon = [], bestArea = 0;
  for (const entlang of [alongFront, alongCenter]) for (const widthScale of [1, .85, .7, .55, .4]) for (const depthScale of [1, .8, .6, .4]) {
    const w = breite * widthScale / 2, h = tiefe * depthScale / 2;
    const front: Punkt = [gasse.von[0] + entlang * ux + seite * nx * (frontAbstand + h + .025), gasse.von[1] + entlang * uy + seite * ny * (frontAbstand + h + .025)];
    for (const blend of [0, .2, .45, .7, 1]) {
      const center: Punkt = [front[0] * (1 - blend) + mitte[0] * blend, front[1] * (1 - blend) + mitte[1] * blend];
      const local: Polygon = form === "l" ? [[-w, -h], [w * .2, -h], [w * .2, h * -.05], [w, h * -.05], [w, h], [-w, h]]
        : form === "u" ? [[-w, -h], [w, -h], [w, h], [w * .42, h], [w * .42, -h * .15], [-w * .42, -h * .15], [-w * .42, h], [-w, h]]
        : [[-w, -h], [w, -h], [w, h], [-w, h]];
      const roof = local.map(([x, y]) => qp([center[0] + ux * x + nx * y, center[1] + uy * x + ny * y]));
      const area = flaeche(roof);
      if (area > Math.max(.22, bestArea) && area < flaeche(los) / 1.48 && roof.every(point => imPolygon(point, los))
        && abstandPolygonStrecke(roof, gasse.von, gasse.bis) <= fahrbahn + .95) { best = roof; bestArea = area; }
    }
  }
  return best;
}

/** Street-facing strips partition a convex block without overlapping at its corners.
 * Narrow strips along each actual street produce house rows, with their unclaimed backs
 * meeting in a shared courtyard. The finite strip count follows the validated map extent. */
export function frontParzellen(block: Polygon, strassen: readonly Gasse[], frontage: number, depth: number, r: { zahl(min: number, max: number): number }): Polygon[] {
  const center = schwerpunkt(block), result: Polygon[] = [];
  for (const road of strassen) {
    const dx = road.bis[0] - road.von[0], dy = road.bis[1] - road.von[1], length = Math.hypot(dx, dy);
    const ux = dx / length, uy = dy / length, sign = Math.sign((center[0] - road.von[0]) * -uy + (center[1] - road.von[1]) * ux) || 1;
    const nx = -uy * sign, ny = ux * sign, start = road.von[0] * ux + road.von[1] * uy;
    let fan = block;
    // Equal distance to neighbouring facades gives a true mitred corner. A triangle
    // to the ward centroid would taper whole rows when the ward is long or skewed.
    for (const other of strassen) {
      if (other === road) continue;
      const ox = other.bis[0] - other.von[0], oy = other.bis[1] - other.von[1], ol = Math.hypot(ox, oy);
      const os = Math.sign((center[0] - other.von[0]) * -oy + (center[1] - other.von[1]) * ox) || 1;
      const onx = -oy / ol * os, ony = ox / ol * os;
      fan = clipHalbebene(fan, nx - onx, ny - ony, road.von[0] * nx + road.von[1] * ny - other.von[0] * onx - other.von[1] * ony);
    }
    fan = clipHalbebene(fan, nx, ny, road.von[0] * nx + road.von[1] * ny + depth);
    if (fan.length < 3) continue;
    const count = Math.max(1, Math.floor(length / frontage)), step = length / count;
    let previous = start;
    for (let i = 0; i < count; i++) {
      const next = i === count - 1 ? start + length : start + step * (i + 1 + r.zahl(-.12, .12));
      let lot = clipHalbebene(fan, -ux, -uy, -previous);
      lot = clipHalbebene(lot, ux, uy, next);
      if (lot.length >= 3) result.push(lot.map(qp));
      previous = next;
    }
  }
  return result;
}
