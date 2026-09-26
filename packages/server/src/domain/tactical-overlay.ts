// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { TacticalPoint } from "@chronicle/szene";

/**
 * Die Auflage einer Spielerkachel: was im Raum steht (Möbel, Türen) und seine Wände — dasselbe Bild,
 * das der Live-Renderer der Spielleitung zeichnet, aber vom Server in die Kachel gesetzt, damit die
 * Sichtmaske es mit dem Boden zusammen beschneidet.
 *
 * Nur Zahlen und fertige Bitmaps kommen hier herein. Die Bitmaps entstehen einmal je Paket-Asset
 * (`tactical-sprites.ts`); diese Datei baut nie ein SVG und ruft kein libvips auf.
 */
export interface RasterSprite {
  /** Eigengröße des Assets in Kartenpunkten bei Maßstab 1, wie der Browser sie misst. */
  readonly width: number; readonly height: number;
  /** Bitmappunkte je Kartenpunkt der Eigengröße. */
  readonly density: number;
  /** RGBA, nicht vormultipliziert, `width·density × height·density`. */
  readonly rgba: Uint8Array;
}
export interface RasterStamp {
  readonly x: number; readonly y: number; readonly r: number; readonly s: number;
  readonly tint: number; readonly shadow: boolean; readonly sprite: RasterSprite;
}
export interface TacticalOverlay {
  /** In Zeichenreihenfolge (Ebene, dann Kennung), wie der Renderer sie stapelt. */
  readonly stamps: readonly RasterStamp[];
  readonly walls: readonly (readonly TacticalPoint[])[];
  /** Wandkörper in Kartenpunkten (Zelle × 0,11 im Renderer). */
  readonly wallBody: number;
}
export const OVERLAY_LIMITS = Object.freeze({ stamps: 20_000, walls: 20_000, wallPoints: 200_000, spriteSide: 4096, spriteBytes: 64 * 1024 * 1024, pixelWrites: 64_000_000 });

class OverlayError extends Error { override readonly name = "TacticalRasterError"; readonly code = "invalid" as const; }
const fail = (message: string): never => { throw new OverlayError(message); };
const finite = (value: unknown, limit = 1e9): value is number => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;

/** Die Auflage wie jede andere Eingabe des Rasterdienstes: geprüft und kopiert, nie vertraut. */
export function overlayCopy(input: TacticalOverlay): TacticalOverlay {
  if (!input || typeof input !== "object" || !Array.isArray(input.stamps) || !Array.isArray(input.walls)
    || input.stamps.length > OVERLAY_LIMITS.stamps || input.walls.length > OVERLAY_LIMITS.walls || !finite(input.wallBody, 1e6) || input.wallBody < 0) fail("invalid tile overlay");
  const seen = new Map<RasterSprite, RasterSprite>();
  let spriteBytes = 0, wallPoints = 0;
  const sprite = (value: RasterSprite): RasterSprite => {
    const known = seen.get(value); if (known) return known;
    const side = (n: unknown) => finite(n, OVERLAY_LIMITS.spriteSide) && (n as number) > 0;
    if (!value || typeof value !== "object" || !side(value.width) || !side(value.height) || !finite(value.density, 16) || value.density <= 0
      || !(value.rgba instanceof Uint8Array)) fail("invalid overlay sprite");
    const w = Math.round(value.width * value.density), h = Math.round(value.height * value.density);
    if (w < 1 || h < 1 || w > OVERLAY_LIMITS.spriteSide || h > OVERLAY_LIMITS.spriteSide || value.rgba.length !== w * h * 4
      || (spriteBytes += value.rgba.length) > OVERLAY_LIMITS.spriteBytes) fail("invalid overlay sprite size");
    const copy: RasterSprite = { width: value.width, height: value.height, density: value.density, rgba: value.rgba };
    seen.set(value, copy); return copy;
  };
  return {
    wallBody: input.wallBody,
    stamps: input.stamps.map(stamp => {
      if (!stamp || typeof stamp !== "object" || !finite(stamp.x) || !finite(stamp.y) || !finite(stamp.r, 1e4) || !finite(stamp.s, 1e3) || stamp.s <= 0
        || !Number.isSafeInteger(stamp.tint) || stamp.tint < 0 || stamp.tint > 0xffffff || typeof stamp.shadow !== "boolean") fail("invalid overlay stamp");
      return { x: stamp.x, y: stamp.y, r: stamp.r, s: stamp.s, tint: stamp.tint, shadow: stamp.shadow, sprite: sprite(stamp.sprite) };
    }),
    walls: input.walls.map(wall => {
      if (!Array.isArray(wall) || wall.length < 2 || (wallPoints += wall.length) > OVERLAY_LIMITS.wallPoints) fail("invalid overlay wall");
      return wall.map(point => {
        if (!Array.isArray(point) || point.length !== 2 || !finite(point[0]) || !finite(point[1])) fail("invalid overlay wall point");
        return [point[0], point[1]] as TacticalPoint;
      });
    }),
  };
}

interface Geometry { readonly width: number; readonly height: number; readonly left: number; readonly top: number; readonly factor: number }
interface Pausable { pause(): Promise<void>; check(): void }

/** Mipmaps je Bitmap, damit eine weit herausgezoomte Kachel keinen Möbelrand flimmern lässt. */
const mips = new WeakMap<Uint8Array, { w: number; h: number; rgba: Uint8Array }[]>();
function levels(sprite: RasterSprite): { w: number; h: number; rgba: Uint8Array }[] {
  const known = mips.get(sprite.rgba); if (known) return known;
  const list = [{ w: Math.round(sprite.width * sprite.density), h: Math.round(sprite.height * sprite.density), rgba: sprite.rgba }];
  while (list.length < 8) {
    const prev = list[list.length - 1]!; if (prev.w < 2 && prev.h < 2) break;
    const w = Math.max(1, prev.w >> 1), h = Math.max(1, prev.h >> 1), rgba = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const sx = Math.min(prev.w - 1, x * 2 + dx), sy = Math.min(prev.h - 1, y * 2 + dy), at = (sy * prev.w + sx) * 4, alpha = prev.rgba[at + 3]!;
        r += prev.rgba[at]! * alpha; g += prev.rgba[at + 1]! * alpha; b += prev.rgba[at + 2]! * alpha; a += alpha; n++;
      }
      const at = (y * w + x) * 4;
      if (a) { rgba[at] = Math.round(r / a); rgba[at + 1] = Math.round(g / a); rgba[at + 2] = Math.round(b / a); rgba[at + 3] = Math.round(a / n); }
    }
    list.push({ w, h, rgba });
  }
  mips.set(sprite.rgba, list); return list;
}

/** Quelle-über-Ziel mit geradem Alpha; das Ziel ist die Kachel selbst. */
function blend(rgba: Buffer, at: number, r: number, g: number, b: number, opacity: number): void {
  if (opacity <= 0) return;
  const a = opacity + (rgba[at + 3]! / 255) * (1 - opacity), retain = (rgba[at + 3]! / 255) * (1 - opacity);
  rgba[at] = Math.round((r * opacity + rgba[at]! * retain) / a);
  rgba[at + 1] = Math.round((g * opacity + rgba[at + 1]! * retain) / a);
  rgba[at + 2] = Math.round((b * opacity + rgba[at + 2]! * retain) / a);
  rgba[at + 3] = Math.round(a * 255);
}

export async function paintOverlay(rgba: Buffer, overlay: TacticalOverlay, geometry: Geometry, job: Pausable): Promise<void> {
  const { width, height, left, top, factor } = geometry;
  let writes = 0;
  const budget = (n: number) => { if ((writes += n) > OVERLAY_LIMITS.pixelWrites) fail("overlay pixel-write work budget exceeded"); };
  // Tile pixel (x, y) covers map points [(left+x)·f, (left+x+1)·f); its centre is what we sample.
  const toMap = (x: number, y: number): TacticalPoint => [(left + x + .5) * factor, (top + y + .5) * factor];
  const box = (cx: number, cy: number, radius: number) => ({
    x0: Math.max(0, Math.floor((cx - radius) / factor - left)), x1: Math.min(width, Math.ceil((cx + radius) / factor - left) + 1),
    y0: Math.max(0, Math.floor((cy - radius) / factor - top)), y1: Math.min(height, Math.ceil((cy + radius) / factor - top) + 1),
  });

  // Walls first, under the furniture? No: the renderer draws walls above stamps. Stamps first.
  for (const [index, stamp] of overlay.stamps.entries()) {
    const w = stamp.sprite.width * stamp.s, h = stamp.sprite.height * stamp.s, cos = Math.cos(stamp.r), sin = Math.sin(stamp.r);
    // Soft shadow to the south-east, as the renderer does on a painted map.
    if (stamp.shadow) {
      const sx = stamp.x + w * .07, sy = stamp.y + h * .1, rx = w * .48, ry = h * .48, b = box(sx, sy, Math.max(rx, ry));
      budget((b.x1 - b.x0) * (b.y1 - b.y0));
      for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) {
        const [mx, my] = toMap(x, y), dx = mx - sx, dy = my - sy, u = (dx * cos + dy * sin) / rx, v = (-dx * sin + dy * cos) / ry;
        if (u * u + v * v <= 1) blend(rgba, (y * width + x) * 4, 0x1a, 0x14, 0x10, .26);
      }
    }
    const list = levels(stamp.sprite), perTile = stamp.sprite.density * factor / stamp.s;
    const level = Math.min(list.length - 1, Math.max(0, Math.floor(Math.log2(Math.max(1, perTile))))), m = list[level]!;
    const scaleX = m.w / stamp.sprite.width, scaleY = m.h / stamp.sprite.height;
    const tr = stamp.tint >> 16 & 255, tg = stamp.tint >> 8 & 255, tb = stamp.tint & 255;
    const b = box(stamp.x, stamp.y, Math.hypot(w, h) / 2);
    budget((b.x1 - b.x0) * (b.y1 - b.y0));
    for (let y = b.y0; y < b.y1; y++) {
      for (let x = b.x0; x < b.x1; x++) {
        const [mx, my] = toMap(x, y), dx = mx - stamp.x, dy = my - stamp.y;
        // Inverse rotation, then from map points back to the asset's own points.
        const u = (dx * cos + dy * sin) / stamp.s + stamp.sprite.width / 2, v = (-dx * sin + dy * cos) / stamp.s + stamp.sprite.height / 2;
        if (u < 0 || v < 0 || u >= stamp.sprite.width || v >= stamp.sprite.height) continue;
        const fx = Math.min(m.w - 1, Math.max(0, u * scaleX - .5)), fy = Math.min(m.h - 1, Math.max(0, v * scaleY - .5));
        const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(m.w - 1, x0 + 1), y1 = Math.min(m.h - 1, y0 + 1), ax = fx - x0, ay = fy - y0;
        let r = 0, g = 0, bl = 0, a = 0;
        for (const [px, py, weight] of [[x0, y0, (1 - ax) * (1 - ay)], [x1, y0, ax * (1 - ay)], [x0, y1, (1 - ax) * ay], [x1, y1, ax * ay]] as const) {
          const at = (py * m.w + px) * 4, alpha = m.rgba[at + 3]! * weight;
          r += m.rgba[at]! * alpha; g += m.rgba[at + 1]! * alpha; bl += m.rgba[at + 2]! * alpha; a += alpha;
        }
        if (a <= .5) continue;
        blend(rgba, (y * width + x) * 4, r / a * tr / 255, g / a * tg / 255, bl / a * tb / 255, a / 255);
      }
      if ((y & 31) === 0) await job.pause();
    }
    if ((index & 63) === 0) { job.check(); await job.pause(); }
  }

  // Walls as stone, as the renderer draws them: a cast shadow, the body, a pale seam on the crown.
  const body = Math.max(overlay.wallBody, factor * 1.2);
  const stroke = async (dx: number, dy: number, half: number, color: number, opacity: number) => {
    const r = color >> 16 & 255, g = color >> 8 & 255, b = color & 255;
    for (const wall of overlay.walls) for (let k = 1; k < wall.length; k++) {
      const ax = wall[k - 1]![0] + dx, ay = wall[k - 1]![1] + dy, bx = wall[k]![0] + dx, by = wall[k]![1] + dy;
      const vx = bx - ax, vy = by - ay, len2 = vx * vx + vy * vy;
      const bb = { x0: Math.max(0, Math.floor((Math.min(ax, bx) - half) / factor - left)), x1: Math.min(width, Math.ceil((Math.max(ax, bx) + half) / factor - left) + 1),
        y0: Math.max(0, Math.floor((Math.min(ay, by) - half) / factor - top)), y1: Math.min(height, Math.ceil((Math.max(ay, by) + half) / factor - top) + 1) };
      if (bb.x1 <= bb.x0 || bb.y1 <= bb.y0) continue;
      budget((bb.x1 - bb.x0) * (bb.y1 - bb.y0));
      for (let y = bb.y0; y < bb.y1; y++) for (let x = bb.x0; x < bb.x1; x++) {
        const [mx, my] = toMap(x, y), t = len2 ? Math.max(0, Math.min(1, ((mx - ax) * vx + (my - ay) * vy) / len2)) : 0;
        const d = Math.hypot(mx - (ax + vx * t), my - (ay + vy * t));
        // One tile pixel of antialiasing at the edge of the stroke.
        const cover = Math.max(0, Math.min(1, (half - d) / factor + .5));
        if (cover > 0) blend(rgba, (y * width + x) * 4, r, g, b, opacity * cover);
      }
      await job.pause();
    }
  };
  if (overlay.walls.length) {
    await stroke(body * .45, body * .55, body * 1.15 / 2, 0x1a1410, .32);
    await stroke(0, 0, body / 2, 0x3b2f25, 1);
    await stroke(0, 0, Math.max(factor, body * .22) / 2, 0xd9c9a8, .55);
  }
  job.check();
}
