// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { KartenSetting, TacticalPoint } from "@chronicle/szene";

/**
 * **Atlas-Look** — die Pixelrunde der Kartenentwürfe (Artefakt „Kartenlook", Runde 1–4) über der
 * flachen Kachel einer Ortskarte.
 *
 * Die Projektion malt Flächen, Dächer und Kronen als flache Farbe. Hier kommt dazu, was sich nur je
 * Bildpunkt sagen lässt: Wasser wird zur Mitte tiefer und schäumt am Ufer, Gassen tragen Pflaster,
 * Asphalt oder Platten, Hausfüße sitzen im Kontaktschatten, das Land ist gefleckt, und Häuser,
 * Kronen und Mauern werfen aus einer Lichtrichtung einen weichen Schatten.
 *
 * Alles rechnet in Weltkoordinaten (Rauschen, Pflaster), also sind die Kacheln fugenlos. Die
 * Distanzfelder brauchen Umgebung; jede Kachel rechnet deshalb mit einem Rand. Farben wirken
 * relativ zum Grundbild — was die Projektion für Nacht oder Winter dunkler oder heller malt,
 * bleibt so.
 */
export interface AtlasRoad { readonly points: readonly TacticalPoint[]; readonly material: string }
export interface AtlasBuilding { readonly points: readonly TacticalPoint[]; readonly height: number }
export interface AtlasInput {
  readonly setting: KartenSetting;
  /** Kartenpunkte je Konstruktionszelle; alle Längen der Entwürfe sind in Zellen gedacht. */
  readonly cell: number;
  readonly night: boolean; readonly winter: boolean;
  readonly water: readonly (readonly TacticalPoint[])[];
  readonly roads: readonly AtlasRoad[];
  readonly buildings: readonly AtlasBuilding[];
  readonly forest: readonly (readonly TacticalPoint[])[];
  readonly walls: readonly (readonly TacticalPoint[])[];
}
export const ATLAS_LIMITS = Object.freeze({ polygons: 40_000, points: 400_000, pixelWrites: 96_000_000 });

class AtlasError extends Error { override readonly name = "TacticalRasterError"; readonly code = "invalid" as const; }
const fail = (message: string): never => { throw new AtlasError(message); };
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1e9;

export function atlasCopy(input: AtlasInput): AtlasInput {
  if (!input || typeof input !== "object" || !["fantasy", "gegenwart", "scifi"].includes(input.setting) || !finite(input.cell) || input.cell <= 0
    || typeof input.night !== "boolean" || typeof input.winter !== "boolean") fail("invalid atlas input");
  let polygons = 0, points = 0;
  const ring = (value: readonly TacticalPoint[], min = 3): TacticalPoint[] => {
    if (!Array.isArray(value) || value.length < min || ++polygons > ATLAS_LIMITS.polygons || (points += value.length) > ATLAS_LIMITS.points) fail("invalid atlas polygon or work budget");
    return value.map(point => { if (!Array.isArray(point) || point.length !== 2 || !finite(point[0]) || !finite(point[1])) fail("invalid atlas point"); return [point[0], point[1]] as TacticalPoint; });
  };
  const list = <T>(value: readonly T[]): readonly T[] => { if (!Array.isArray(value)) fail("invalid atlas list"); return value; };
  return {
    setting: input.setting, cell: input.cell, night: input.night, winter: input.winter,
    water: list(input.water).map(p => ring(p)),
    roads: list(input.roads).map(road => { if (!road || typeof road.material !== "string" || road.material.length > 32) fail("invalid atlas road"); return { points: ring(road.points), material: road.material }; }),
    buildings: list(input.buildings).map(b => { if (!b || !finite(b.height) || b.height < 0 || b.height > 20) fail("invalid atlas building"); return { points: ring(b.points), height: b.height }; }),
    forest: list(input.forest).map(p => ring(p)),
    walls: list(input.walls).map(p => ring(p, 2)),
  };
}

// -- Rauschen in Weltkoordinaten, wie in den Entwürfen ------------------------------------------
function hash2(x: number, y: number, k: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((k | 0) + 1, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
function rausch(x: number, y: number, k: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, k), b = hash2(xi + 1, yi, k), c = hash2(xi, yi + 1, k), d = hash2(xi + 1, yi + 1, k);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number, k: number, octaves: number): number {
  let s = 0, amp = .5, f = 1, n = 0;
  for (let i = 0; i < octaves; i++) { s += amp * rausch(x * f, y * f, k + i * 17); n += amp; amp *= .5; f *= 2.03; }
  return s / n;
}
const WR = new Float64Array(3);
function worley(x: number, y: number, k: number): void {
  const xi = Math.floor(x), yi = Math.floor(y); let f1 = 9, f2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j, dx = cx + hash2(cx, cy, k) - x, dy = cy + hash2(cx, cy, k + 1) - y, dd = dx * dx + dy * dy;
    if (dd < f1) { f2 = f1; f1 = dd; id = hash2(cx, cy, k + 2); } else if (dd < f2) f2 = dd;
  }
  WR[0] = Math.sqrt(f1); WR[1] = Math.sqrt(f2); WR[2] = id;
}
const clamp = (v: number, a: number, b: number) => v < a ? a : v > b ? b : v;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const glatt = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// -- Masken und exakte Distanzfelder (Felzenszwalb & Huttenlocher) --------------------------------
interface Grid { readonly w: number; readonly h: number; readonly x0: number; readonly y0: number; readonly step: number }
function fill(mask: Uint8Array, grid: Grid, points: readonly TacticalPoint[], dx = 0, dy = 0): number {
  const { w, h, x0, y0, step } = grid;
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
  for (const p of points) { const py = p[1] + dy, px = p[0] + dx; if (py < minY) minY = py; if (py > maxY) maxY = py; if (px < minX) minX = px; if (px > maxX) maxX = px; }
  const j0 = Math.max(0, Math.floor((minY - y0) / step - .5)), j1 = Math.min(h - 1, Math.ceil((maxY - y0) / step - .5));
  if (j1 < j0 || (maxX - x0) / step < -1 || (minX - x0) / step > w + 1) return 0;
  const xs: number[] = []; let writes = 0;
  for (let j = j0; j <= j1; j++) {
    const y = y0 + (j + .5) * step; xs.length = 0;
    for (let i = 0, k = points.length - 1; i < points.length; k = i++) {
      const ay = points[k]![1] + dy, by = points[i]![1] + dy;
      if ((ay > y) !== (by > y)) xs.push(points[k]![0] + dx + (y - ay) * (points[i]![0] - points[k]![0]) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let n = 0; n + 1 < xs.length; n += 2) {
      const a = Math.max(0, Math.ceil((xs[n]! - x0) / step - .5)), b = Math.min(w - 1, Math.ceil((xs[n + 1]! - x0) / step - .5) - 1);
      for (let i = a; i <= b; i++) mask[j * w + i] = 1;
      writes += Math.max(0, b - a + 1);
    }
  }
  return writes;
}
function thick(mask: Uint8Array, grid: Grid, line: readonly TacticalPoint[], half: number, dx: number, dy: number): number {
  const { w, h, x0, y0, step } = grid; let writes = 0;
  for (let k = 1; k < line.length; k++) {
    const ax = line[k - 1]![0] + dx, ay = line[k - 1]![1] + dy, bx = line[k]![0] + dx, by = line[k]![1] + dy, vx = bx - ax, vy = by - ay, len2 = vx * vx + vy * vy;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - half - x0) / step)), i1 = Math.min(w - 1, Math.ceil((Math.max(ax, bx) + half - x0) / step));
    const j0 = Math.max(0, Math.floor((Math.min(ay, by) - half - y0) / step)), j1 = Math.min(h - 1, Math.ceil((Math.max(ay, by) + half - y0) / step));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = x0 + (i + .5) * step, y = y0 + (j + .5) * step, t = len2 ? clamp(((x - ax) * vx + (y - ay) * vy) / len2, 0, 1) : 0;
      if (Math.hypot(x - ax - vx * t, y - ay - vy * t) <= half) mask[j * w + i] = 1;
    }
    writes += Math.max(0, (i1 - i0 + 1) * (j1 - j0 + 1));
  }
  return writes;
}
function dt1(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q]! + q * q) - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= z[k]!) { k--; s = ((f[q]! + q * q) - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1]! < q) k++; const t = q - v[k]!; d[q] = t * t + f[v[k]!]!; }
}
/** Abstand jedes Punkts zur nächsten Zelle mit `mask === target`, in Gitterpunkten. */
function edt(mask: Uint8Array, w: number, h: number, target: 0 | 1): Float32Array {
  const g = new Float32Array(w * h); for (let i = 0; i < g.length; i++) g[i] = mask[i] === target ? 0 : 1e20;
  const m = Math.max(w, h), f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]!; dt1(f, h, d, v, z); for (let y = 0; y < h; y++) g[y * w + x] = d[y]!; }
  for (let y = 0; y < h; y++) { const o = y * w; for (let x = 0; x < w; x++) f[x] = g[o + x]!; dt1(f, w, d, v, z); for (let x = 0; x < w; x++) g[o + x] = Math.sqrt(d[x]!); }
  return g;
}
function blur(mask: Float32Array, w: number, h: number, radius: number): Float32Array {
  if (radius < 1) return mask;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = radius * 2 + 1;
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -radius; x <= radius; x++) s += mask[y * w + clamp(x, 0, w - 1)]!;
    for (let x = 0; x < w; x++) { tmp[y * w + x] = s / n; s += mask[y * w + clamp(x + radius + 1, 0, w - 1)]! - mask[y * w + clamp(x - radius, 0, w - 1)]!; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -radius; y <= radius; y++) s += tmp[clamp(y, 0, h - 1) * w + x]!;
    for (let y = 0; y < h; y++) { out[y * w + x] = s / n; s += tmp[clamp(y + radius + 1, 0, h - 1) * w + x]! - tmp[clamp(y - radius, 0, h - 1) * w + x]!; } }
  return out;
}

interface Geometry { readonly width: number; readonly height: number; readonly left: number; readonly top: number; readonly factor: number }
interface Pausable { pause(): Promise<void>; check(): void }
const SCHATTEN: Record<KartenSetting, readonly [number, number, number]> = { fantasy: [0x1c, 0x27, 0x48], gegenwart: [0x1b, 0x27, 0x46], scifi: [0x18, 0x22, 0x3e] };
const GLOW = [0x5f, 0xe0, 0xe6] as const;
/** Eine Lichtrichtung für die ganze Karte: von Nordwesten, Schatten fallen nach Südosten. */
const LIGHT = (() => { const l = Math.hypot(.56, .83); return [.56 / l, .83 / l] as const; })();
/** Schattenlänge je Höhe in Zellen; so lang wie in den Entwürfen am Tag. */
const SHADOW_PER_HEIGHT = .3;

/** Die Atlas-Runde über `rgba` (die schon gemalte Kachel). `visible` wird danach wie immer angewandt. */
export async function paintAtlas(rgba: Buffer, input: AtlasInput, geometry: Geometry, job: Pausable): Promise<void> {
  const { width, height, left, top, factor } = geometry, cell = input.cell, perCell = cell / factor;
  // Tiles far out (a cell smaller than two pixels) keep the flat picture: texture there is only noise.
  if (perCell < 2) return;
  const maxHeight = input.buildings.reduce((m, b) => Math.max(m, b.height), 1);
  const margin = Math.ceil((Math.max(.6, maxHeight * SHADOW_PER_HEIGHT * 1.2) * cell) / factor) + 2;
  const grid: Grid = { w: width + margin * 2, h: height + margin * 2, x0: (left - margin) * factor, y0: (top - margin) * factor, step: factor };
  const { w, h } = grid, size = w * h;
  const box = [grid.x0 - cell * 4, grid.y0 - cell * 4, grid.x0 + w * factor + cell * 4, grid.y0 + h * factor + cell * 4] as const;
  const near = (points: readonly TacticalPoint[]) => points.some(p => p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3])
    || (() => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of points) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); } return a <= box[2] && c >= box[0] && b <= box[3] && d >= box[1]; })();
  let writes = 0;
  const budget = (n: number) => { if ((writes += n) > ATLAS_LIMITS.pixelWrites) fail("atlas pixel-write work budget exceeded"); };

  const water = new Uint8Array(size), road = new Uint8Array(size), build = new Uint8Array(size), park = new Uint8Array(size), wood = new Uint8Array(size), deck = new Uint8Array(size);
  const decks = input.roads.filter(r => (r.material === "bridge" || r.material === "steg") && near(r.points));
  for (const p of input.water) if (near(p)) budget(fill(water, grid, p));
  for (const r of input.roads) if (near(r.points)) { budget(fill(road, grid, r.points)); if (r.material === "parking") budget(fill(park, grid, r.points)); }
  // Bridges and jetties keep their drawn planks: neither water nor paving is painted over them.
  for (const r of decks) budget(fill(deck, grid, r.points));
  const buildings = input.buildings.filter(b => near(b.points));
  for (const b of buildings) budget(fill(build, grid, b.points));
  for (const p of input.forest) if (near(p)) budget(fill(wood, grid, p));
  await job.pause();
  const wIn = edt(water, w, h, 0), wOut = edt(water, w, h, 1), rIn = edt(road, w, h, 0), bOut = edt(build, w, h, 1);
  await job.pause();

  // Cast shadows: every building swept along the light by its height, town walls and bridge decks
  // in one crisp layer; woods in a second, much softer one — a wood is many crowns, not a slab.
  const shade = new Uint8Array(size), canopy = new Uint8Array(size), lx = LIGHT[0], ly = LIGHT[1];
  for (const b of buildings) {
    const len = b.height * SHADOW_PER_HEIGHT * cell;
    for (let k = 1; k <= 6; k++) budget(fill(shade, grid, b.points, lx * len * k / 6, ly * len * k / 6));
  }
  for (const wall of input.walls) if (near(wall)) for (let k = 1; k <= 4; k++) budget(thick(shade, grid, wall, cell * .15, lx * cell * .39 * k / 4, ly * cell * .39 * k / 4));
  for (const r of decks) budget(fill(shade, grid, r.points, lx * cell * .12, ly * cell * .12));
  for (const p of input.forest) if (near(p)) budget(fill(canopy, grid, p, lx * cell * .22, ly * cell * .22));
  const crisp = blur(Float32Array.from(shade), w, h, Math.max(1, Math.round(perCell * .05)));
  const woods = blur(Float32Array.from(canopy), w, h, Math.max(1, Math.round(perCell * .14)));
  const soft = new Float32Array(size); for (let i = 0; i < size; i++) soft[i] = Math.max(crisp[i]!, woods[i]! * .6);
  await job.pause();

  const S = SCHATTEN[input.setting], alpha = input.night ? .32 : input.winter ? .42 : .5;
  const k0 = input.setting === "fantasy" ? 7 : input.setting === "gegenwart" ? 3 : 9;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4; if (rgba[at + 3] === 0) continue;
      const gi = (y + margin) * w + (x + margin), wx = (left + x + .5) * factor / cell, wy = (top + y + .5) * factor / cell;
      let r = rgba[at]!, g = rgba[at + 1]!, b = rgba[at + 2]!;
      if (deck[gi]) {
        // The planks as drawn; only the shadows below reach them.
      } else if (water[gi]) {
        // Deeper towards the middle, a few ripple bands along the shore, foam at the edge, glints far out.
        const dIn = wIn[gi]! / perCell, t = glatt(0, .8, dIn), n = rausch(wx * 1.1, wy * 1.1, 23);
        const deep = [.4 + .6 * (1 - t), .57 + .43 * (1 - t), .7 + .3 * (1 - t)] as const;
        let f = .92 + .16 * n;
        r *= deep[0] * f; g *= deep[1] * f; b *= deep[2] * f;
        for (let q = 1; q <= 3; q++) { const e = Math.abs(dIn - q * .14) * perCell; if (e < 1.2 && n > .45) { const a = (1 - e / 1.2) * .24 * (1 - q / 4) * glatt(.45, .6, n); r = mix(r, Math.min(255, r * 1.9 + 40), a); g = mix(g, Math.min(255, g * 1.9 + 40), a); b = mix(b, Math.min(255, b * 1.9 + 40), a); } }
        const foam = (input.winter ? .16 : .075) * (.5 + rausch(wx * 5, wy * 5, 3));
        if (dIn < foam) { const a = (1 - dIn / foam) * .85, crest = input.night ? 150 : 238; r = mix(r, crest, a); g = mix(g, crest + 6, a); b = mix(b, crest, a); }
        if (!input.winter && t > .6) { const gl = rausch(wx * 2.2, wy * 7, 41); if (gl > .8) { f = (gl - .8) * 1.4; r = mix(r, input.night ? 170 : 255, f); g = mix(g, input.night ? 180 : 255, f); b = mix(b, input.night ? 200 : 255, f); } }
      } else if (!build[gi]) {
        const land = !road[gi]; let f = 1;
        if (land) {
          f *= .86 + .26 * fbm(wx * .42, wy * .42, 11, 3); f *= .965 + .07 * hash2(x + left, y + top, 1);
        } else {
          const dR = rIn[gi]! / perCell;
          if (input.setting === "fantasy") {
            // Cobbles: Worley cells with dark joints, darker towards the gutters.
            worley(wx * 5.2, wy * 5.2, k0); const f1 = WR[0]!, f2 = WR[1]!, id = WR[2]!, joint = f2 - f1;
            f *= .9 + .18 * id; if (joint < .09) f *= .72 + 2.8 * joint; f *= 1 - .5 * f1 * f1;
            if (dR < .07) f *= .8 + 2.8 * dR;
          } else if (input.setting === "gegenwart") {
            if (park[gi]) f *= .95 + .07 * hash2(x + left, y + top, 4);
            else if (dR < .11) { f *= 1.34; const fu = Math.min((wx * 2.6) % 1, (wy * 2.6) % 1); if (fu < .04) f *= .9; }
            else if (dR < .135) f *= .62;
            else {
              f *= .93 + .09 * hash2(x + left, y + top, 3);
              const mid = rIn[gi]!, crest = mid >= rIn[gi - 1]! && mid >= rIn[gi + 1]! && mid >= rIn[gi - w]! && mid >= rIn[gi + w]!;
              if (dR > .2 && dR < .55 && crest && ((wx + wy) * 2.2) % 1 < .55) { r = Math.min(255, r * 2.3); g = Math.min(255, g * 2.3); b = Math.min(255, b * 2.2); }
            }
          } else {
            const fu = Math.min((wx * 2) % 1, (wy * 2) % 1); if (fu < .035) f *= .7; f *= .92 + .12 * hash2(Math.floor(wx * 2), Math.floor(wy * 2), 9);
            if (dR < .06) { const a = (1 - dR / .06) * .7; r = mix(r, GLOW[0], a); g = mix(g, GLOW[1], a); b = mix(b, GLOW[2], a); }
          }
        }
        // Contact shadow at the foot of every house, and a darker shore band on the land.
        const dB = bOut[gi]! / perCell; if (dB < .24) { const t = 1 - dB / .24; f *= 1 - .45 * t * t; }
        r *= f; g *= f; b *= f;
        if (land) { const dO = wOut[gi]! / perCell; if (dO < .16) { const a = (1 - dO / .16) * .5; r = mix(r, r * .72, a); g = mix(g, g * .74, a); b = mix(b, b * .62, a); } }
      }
      // The cast shadow falls on the ground and the water, never on a roof or a crown.
      const s = soft[gi]!;
      if (s > 0 && !build[gi] && !wood[gi] && !deck[gi]) { const a = s * alpha; r *= mix(1, S[0] / 255, a); g *= mix(1, S[1] / 255, a); b *= mix(1, S[2] / 255, a); }
      rgba[at] = clamp(Math.round(r), 0, 255); rgba[at + 1] = clamp(Math.round(g), 0, 255); rgba[at + 2] = clamp(Math.round(b), 0, 255);
    }
    if ((y & 15) === 0) await job.pause();
  }
  job.check();
}
