// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import sharp from "sharp";
import { svgVerstoesse, type AssetpaketV1, type Stamp, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { createPacks } from "./packs.ts";
import type { RasterSprite, RasterStamp, TacticalOverlay } from "./tactical-overlay.ts";

type PaketAsset = AssetpaketV1["assets"][number];
/** Bitmappunkte je Kartenpunkt: doppelt, damit ein hineingezoomtes Möbel scharf bleibt. */
const DENSITY = 2;
const SPRITE_PIXELS = 2048 * 2048;
/** The whole catalogue at twice its size is far below this; a stranger pack must not grow without bound. */
const CACHE_BYTES = 192 * 1024 * 1024;

/**
 * Was eine Spielerkachel nie zeigt, auch in einem bekannten Raum: Marken und Figuren der
 * Spielleitung und alles, was ein Paket als verborgen, geheim oder Falle auszeichnet.
 */
export function stampForPlayers(asset: PaketAsset): boolean {
  return asset.art !== "marke" && asset.art !== "figur" && !asset.schlagworte.some(tag => ["verborgen", "geheim", "falle"].includes(tag));
}

/**
 * Die Paket-Assets einmal als Bitmap. Die Bytes kommen aus `packs.readAsset` (Größe und sha256
 * gegen das Manifest geprüft), eine SVG muss zusätzlich reine Zeichnung sein (dieselbe Regel wie
 * `gate-assets`). Ein Asset, das diese Prüfungen nicht besteht, fehlt in der Kachel — wie im
 * Live-Renderer, der für fehlende Kunst keinen Platzhalter zeichnet.
 */
export function createStampSprites(packs = createPacks()) {
  const cache = new Map<string, Promise<RasterSprite | null>>(), sizes = new Map<string, number>();
  let cachedBytes = 0;
  const remember = (key: string, bytes: number) => {
    sizes.set(key, bytes); cachedBytes += bytes;
    for (const [oldest, size] of sizes) { if (cachedBytes <= CACHE_BYTES || oldest === key) break; sizes.delete(oldest); cache.delete(oldest); cachedBytes -= size; }
  };
  function resolve(reference: string): { packId: string; asset: PaketAsset } | null {
    const [packId, name, extra] = reference.split("/");
    if (!packId || !name || extra !== undefined) return null;
    try { const asset = packs.manifest(packId).assets.find(candidate => candidate.name === name); return asset ? { packId, asset } : null; }
    catch { return null; }
  }
  function sprite(packId: string, asset: PaketAsset): Promise<RasterSprite | null> {
    const key = `${packId}/${asset.datei}@${asset.sha256}`, known = cache.get(key);
    if (known) return known;
    const made = (async (): Promise<RasterSprite | null> => {
      try {
        const { mimeType, bytes } = packs.readAsset(packId, asset.datei), svg = mimeType === "image/svg+xml";
        if (svg && svgVerstoesse(bytes.toString("utf8")).length) return null;
        const density = svg ? DENSITY : 1;
        const { data, info } = await sharp(bytes, { ...(svg ? { density: 72 * DENSITY } : {}), limitInputPixels: SPRITE_PIXELS, failOn: "error" })
          .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        if (info.channels !== 4) return null;
        remember(key, data.length);
        return { width: info.width / density, height: info.height / density, density, rgba: new Uint8Array(data.buffer, data.byteOffset, data.length) };
      } catch { return null; }
    })();
    cache.set(key, made);
    return made;
  }
  /**
   * Die Auflage einer Spielerkachel: die Stempel, die Spieler sehen dürfen, in der Reihenfolge des
   * Renderers, dazu die Wände einer Raumkarte. `shadow` und `night` folgen dem gemalten Bild der Leitung.
   */
  async function overlay(document: TacticalMapDocumentV1, options: { readonly shadow: boolean; readonly night: boolean; readonly walls: boolean }): Promise<TacticalOverlay> {
    const stamps: RasterStamp[] = [];
    const ordered = [...document.geometry.stamps].sort((a, b) => a.l - b.l || (a.id < b.id ? -1 : 1));
    for (const stamp of ordered as Stamp[]) {
      const found = resolve(stamp.a);
      if (!found || !stampForPlayers(found.asset)) continue;
      const art = await sprite(found.packId, found.asset);
      if (!art) continue;
      stamps.push({ x: stamp.x, y: stamp.y, r: stamp.r, s: stamp.s, sprite: art,
        tint: stamp.t || (options.night ? 0x8a93b3 : 0xffffff), shadow: options.shadow && stamp.l >= -10 && stamp.l <= 10 });
    }
    const cell = document.grid.kind === "none" ? 100 : document.grid.size;
    return { stamps, walls: options.walls ? document.walls.map(wall => wall.points) : [], wallBody: cell * .11 };
  }
  /** Was die Spieler von der Auflage sehen können — der Fingerabdruck für `rasterDigest`. */
  function visible(document: TacticalMapDocumentV1, walls: boolean): unknown {
    return { stamps: document.geometry.stamps.filter(stamp => { const found = resolve(stamp.a); return found && stampForPlayers(found.asset); })
      .map(stamp => [stamp.id, stamp.a, stamp.x, stamp.y, stamp.s, stamp.r, stamp.l, stamp.t ?? 0]), walls: walls ? document.walls.map(wall => wall.points) : [] };
  }
  return { overlay, visible };
}

/** Ein Prozess, ein Katalog: die Pakete liegen fest im Programm, ihre Bitmaps bleiben im Speicher. */
export const stampSprites = createStampSprites();
