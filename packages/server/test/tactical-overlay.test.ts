// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { svgVerstoesse, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { createTacticalRasterService } from "../src/domain/tactical-raster.ts";
import { overlayCopy, type RasterSprite, type TacticalOverlay } from "../src/domain/tactical-overlay.ts";
import { createStampSprites, stampForPlayers } from "../src/domain/tactical-sprites.ts";

/** A 20×10 sprite: red left half, blue right half, fully opaque. */
function sprite(): RasterSprite {
  const w = 20, h = 10, rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const at = (y * w + x) * 4; rgba.set(x < 10 ? [255, 0, 0, 255] : [0, 0, 255, 255], at); }
  return { width: w, height: h, density: 1, rgba };
}
async function tile(overlay: TacticalOverlay, regions: readonly (readonly [number, number])[][] | null = null) {
  const service = createTacticalRasterService();
  const png = await service.renderTacticalTile({ image: null, documentSize: [64, 64], regions, level: 0, x: 0, y: 0, tileSize: 64, overlay,
    drawing: { rendererVersion: "cartography-13", width: 64, height: 64, background: 0xffffff, polygons: [] } });
  const { data } = await sharp(png.bytes).raw().toBuffer({ resolveWithObject: true });
  return (x: number, y: number) => [...data.subarray((y * 64 + x) * 4, (y * 64 + x) * 4 + 4)];
}

describe("Spielerkacheln tragen, was im Raum steht", () => {
  it("setzt eine Bitmap an ihre Mitte, gedreht und getönt", async () => {
    const plain = await tile({ stamps: [{ x: 32, y: 32, r: 0, s: 1, tint: 0xffffff, shadow: false, sprite: sprite() }], walls: [], wallBody: 0 });
    expect(plain(26, 32)).toEqual([255, 0, 0, 255]);
    expect(plain(38, 32)).toEqual([0, 0, 255, 255]);
    expect(plain(32, 20)).toEqual([255, 255, 255, 255]);
    // A quarter turn: the red half now lies above the centre, the blue half below.
    const turned = await tile({ stamps: [{ x: 32, y: 32, r: Math.PI / 2, s: 1, tint: 0xffffff, shadow: false, sprite: sprite() }], walls: [], wallBody: 0 });
    expect(turned(32, 26)).toEqual([255, 0, 0, 255]);
    expect(turned(32, 38)).toEqual([0, 0, 255, 255]);
    // Moonlight tints like the live renderer: multiplied, not replaced.
    const night = await tile({ stamps: [{ x: 32, y: 32, r: 0, s: 1, tint: 0x8a93b3, shadow: false, sprite: sprite() }], walls: [], wallBody: 0 });
    expect(night(26, 32)).toEqual([0x8a, 0, 0, 255]);
  });

  it("wirft auf gemalten Karten einen weichen Schatten und zeichnet Wände wie der Renderer", async () => {
    const shaded = await tile({ stamps: [{ x: 20, y: 20, r: 0, s: 1, tint: 0xffffff, shadow: true, sprite: sprite() }], walls: [], wallBody: 0 });
    const below = shaded(21, 25);
    expect(below[0]).toBeLessThan(255);
    const walled = await tile({ stamps: [], walls: [[[8, 48], [56, 48]]], wallBody: 6 });
    expect(walled(30, 48)[0]).toBeLessThan(120);
    expect(walled(30, 40)).toEqual([255, 255, 255, 255]);
  });

  it("schneidet die Auflage mit der Sichtmaske wie den Boden", async () => {
    const known: (readonly [number, number])[][] = [[[0, 0], [32, 0], [32, 64], [0, 64]]];
    const masked = await tile({ stamps: [{ x: 32, y: 32, r: 0, s: 1, tint: 0xffffff, shadow: false, sprite: sprite() }], walls: [[[0, 10], [64, 10]]], wallBody: 4 }, known);
    expect(masked(26, 32)).toEqual([255, 0, 0, 255]);
    expect(masked(38, 32)[3]).toBe(0);
    expect(masked(50, 10)[3]).toBe(0);
  });

  it("prüft die Auflage wie jede Eingabe", () => {
    const good: TacticalOverlay = { stamps: [{ x: 1, y: 1, r: 0, s: 1, tint: 0, shadow: false, sprite: sprite() }], walls: [], wallBody: 1 };
    expect(() => overlayCopy(good)).not.toThrow();
    expect(() => overlayCopy({ ...good, stamps: [{ ...good.stamps[0]!, s: 0 }] })).toThrow();
    expect(() => overlayCopy({ ...good, stamps: [{ ...good.stamps[0]!, sprite: { ...sprite(), rgba: new Uint8Array(12) } }] })).toThrow();
    expect(() => overlayCopy({ ...good, walls: [[[0, 0]]] })).toThrow();
    expect(() => overlayCopy({ ...good, stamps: [{ ...good.stamps[0]!, x: Number.NaN }] })).toThrow();
  });
});

describe("Paket-Assets als Bitmaps, nur was Spieler sehen dürfen", () => {
  const doc = (stamps: TacticalMapDocumentV1["geometry"]["stamps"]): TacticalMapDocumentV1 => ({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
    frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" }, geometry: { v: 3, size: [256, 256], stamps, places: [], regions: [] },
    grid: { kind: "square", size: 64, origin: [0, 0] }, elevation: 0, geometryElevation: [], walls: [{ id: "w", kind: "wall", points: [[0, 0], [64, 0]], elevation: 0 }] as never, portals: [], lights: [],
    environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null });

  it("rastert Möbel in Eigengröße und lässt Marken und Figuren weg", async () => {
    const sprites = createStampSprites();
    const document = doc([
      { id: "a", a: "pk.grundriss/nachttisch", x: 64, y: 64, s: 1, r: 0, l: 0 },
      { id: "b", a: "pk.grundriss/unbekannt", x: 64, y: 64, s: 1, r: 0, l: 0 },
    ]);
    const overlay = await sprites.overlay(document, { shadow: true, night: false, walls: true });
    expect(overlay.stamps).toHaveLength(1);
    expect([overlay.stamps[0]!.sprite.width, overlay.stamps[0]!.sprite.height]).toEqual([64, 64]);
    expect(overlay.stamps[0]!.sprite.density).toBe(2);
    expect(overlay.walls).toHaveLength(1);
    expect(overlay.wallBody).toBeCloseTo(64 * .11);
    expect(stampForPlayers({ art: "marke", schlagworte: [] } as never)).toBe(false);
    expect(stampForPlayers({ art: "figur", schlagworte: [] } as never)).toBe(false);
    expect(stampForPlayers({ art: "tuer", schlagworte: ["geheim"] } as never)).toBe(false);
    expect(stampForPlayers({ art: "moebel", schlagworte: ["tisch"] } as never)).toBe(true);
    // The fingerprint follows what players can see, not the hidden marks.
    expect(sprites.visible(document, true)).toEqual(sprites.visible(doc([document.geometry.stamps[0]!, { id: "c", a: "pk.grundriss/unbekannt", x: 9, y: 9, s: 1, r: 0, l: 0 }]), true));
  });

  it("nimmt nur SVGs, die reine Zeichnungen sind", () => {
    expect(svgVerstoesse('<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4" fill="url(#g)"/></svg>')).toEqual([]);
    expect(svgVerstoesse('<svg><script>alert(1)</script></svg>')).toContain("script element");
    expect(svgVerstoesse('<svg><image href="file:///etc/passwd"/></svg>').length).toBeGreaterThan(0);
  });
});
