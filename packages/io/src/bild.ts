import { sha256Hex } from "@chronicle/core";
import { ImportValidationError } from "./validation.ts";

/**
 * DIE BILDPRÜFUNG — format and size are read from the BYTES, never from the file name.
 *
 * The measured reason, from our own corpus: Fandom's CDN silently transcodes uploads to WebP and
 * serves them under the original `.jpg`/`.png` name. All twelve files harvested by hand into
 * `design/fixtures/eron/media/` arrived as WebP; every one of them is named `.jpg` or `.png` in
 * the source wiki (`media/LIESMICH.md`, RB-12). An importer that trusts the extension writes
 * mislabelled files into the corpus, and a mislabelled file is a lie that survives every export.
 *
 * This is deliberately NOT `packages/forge/src/uvtt.ts::inspectUvttImage`. That one guards a
 * tactical battle map: it accepts exactly PNG and WebP, walks every chunk, verifies CRCs and
 * enforces a 16 MPx budget, because a map is decoded into a raster on the server. A wiki figure
 * is delivered to a browser and decoded there. It must accept what real wikis actually hold —
 * JPEG is the majority of our corpus — and it must not pretend to validate a JPEG's entropy
 * stream. So: strict on the container header, honest about what it did not check.
 */

export const BILD_GRENZEN = Object.freeze({
  /** One figure. Larger uploads are refused with a number the user can act on. */
  bytes: 24 * 1024 * 1024,
  /** Refuses a decompression bomb before any renderer sees it. */
  pixel: 80_000_000,
  kante: 20_000,
});

export type BildFormat = "png" | "jpeg" | "webp" | "gif";

export interface BildBefund {
  readonly format: BildFormat;
  /** Derived from the container, never from the file name or the source wiki's claim. */
  readonly mime: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly breite: number;
  readonly hoehe: number;
  /** Which container variant answered, kept for the provenance record. */
  readonly variante: string;
}

const fail = (grund: string): never => { throw new ImportValidationError("bild", grund); };

const ascii = (bytes: Uint8Array, start: number, text: string): boolean => {
  if (start + text.length > bytes.length) return false;
  for (let i = 0; i < text.length; i += 1) if (bytes[start + i] !== text.charCodeAt(i)) return false;
  return true;
};

function png(view: DataView, bytes: Uint8Array): Omit<BildBefund, "format" | "mime" | "sha256" | "bytes"> {
  // IHDR is required to be the first chunk; length 13, type "IHDR", then width/height big-endian.
  if (bytes.length < 33 || view.getUint32(8) !== 13 || !ascii(bytes, 12, "IHDR")) fail("PNG header missing");
  return { breite: view.getUint32(16), hoehe: view.getUint32(20), variante: `PNG bit depth ${bytes[24]}` };
}

function jpeg(view: DataView, bytes: Uint8Array): Omit<BildBefund, "format" | "mime" | "sha256" | "bytes"> {
  // Walk the marker segments to the first frame header. Progressive (C2) and baseline (C0) both
  // carry the dimensions in the same place; DHT/DAC/RSTn are explicitly not frame headers.
  let offset = 2, segments = 0;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1]!;
    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { offset += 2; continue; }
    if (++segments > 4096) fail("JPEG segment table is implausible");
    const length = view.getUint16(offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length) fail("truncated JPEG segment");
    const frame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (frame) {
      if (length < 8) fail("truncated JPEG frame header");
      return { hoehe: view.getUint16(offset + 5), breite: view.getUint16(offset + 7), variante: `JPEG SOF${marker - 0xc0}` };
    }
    if (marker === 0xda) break; // Scan data begins; no frame header was found before it.
    offset += 2 + length;
  }
  return fail("JPEG frame header missing");
}

function webp(view: DataView, bytes: Uint8Array): Omit<BildBefund, "format" | "mime" | "sha256" | "bytes"> {
  if (bytes.length < 30) fail("WebP container is truncated");
  if (view.getUint32(4, true) + 8 !== bytes.length) fail("WebP container size disagrees with the file length");
  const kind = String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!);
  if (kind === "VP8 ") {
    // The lossy frame header carries a 3-byte start code; without it the dimensions are noise.
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) fail("WebP lossy frame header missing");
    return { breite: view.getUint16(26, true) & 0x3fff, hoehe: view.getUint16(28, true) & 0x3fff, variante: "WebP VP8 (lossy)" };
  }
  if (kind === "VP8L") {
    if (bytes[20] !== 0x2f) fail("WebP lossless signature missing");
    const bits = view.getUint32(21, true);
    return { breite: (bits & 0x3fff) + 1, hoehe: ((bits >>> 14) & 0x3fff) + 1, variante: "WebP VP8L (lossless)" };
  }
  if (kind === "VP8X") {
    const b = 24;
    const breite = 1 + (bytes[b]! | (bytes[b + 1]! << 8) | (bytes[b + 2]! << 16));
    const hoehe = 1 + (bytes[b + 3]! | (bytes[b + 4]! << 8) | (bytes[b + 5]! << 16));
    // An animated figure is accepted; it is a picture in an article, not a battle map.
    return { breite, hoehe, variante: `WebP VP8X${(bytes[20]! & 2) === 2 ? " (animiert)" : ""}` };
  }
  return fail(`unsupported WebP container "${kind}"`);
}

function gif(view: DataView, bytes: Uint8Array): Omit<BildBefund, "format" | "mime" | "sha256" | "bytes"> {
  if (bytes.length < 10) fail("GIF header is truncated");
  return { breite: view.getUint16(6, true), hoehe: view.getUint16(8, true), variante: ascii(bytes, 0, "GIF89a") ? "GIF89a" : "GIF87a" };
}

/**
 * Inspect one delivered image. Throws `ImportValidationError` rather than guessing: an image
 * whose container cannot be read is refused loudly, because the alternative is a corpus entry
 * claiming a size and a type nobody measured.
 *
 * SVG is deliberately absent. It is a script-carrying document, not a picture, and admitting it
 * here would put active content behind an `<img>` in every reader's browser.
 */
export function vermisseBild(input: Uint8Array): BildBefund {
  const bytes = input instanceof Uint8Array ? input : fail("image bytes required");
  if (bytes.length === 0) fail("image is empty");
  if (bytes.length > BILD_GRENZEN.bytes) fail(`image exceeds ${Math.floor(BILD_GRENZEN.bytes / (1024 * 1024))} MB`);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let format: BildFormat, mime: string, geometry: Omit<BildBefund, "format" | "mime" | "sha256" | "bytes">;
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, "PNG\r\n\x1a\n")) { format = "png"; mime = "image/png"; geometry = png(view, bytes); }
  else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) { format = "jpeg"; mime = "image/jpeg"; geometry = jpeg(view, bytes); }
  else if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) { format = "webp"; mime = "image/webp"; geometry = webp(view, bytes); }
  else if (ascii(bytes, 0, "GIF87a") || ascii(bytes, 0, "GIF89a")) { format = "gif"; mime = "image/gif"; geometry = gif(view, bytes); }
  else return fail("unrecognised image container; only PNG, JPEG, WebP and GIF are accepted");
  const { breite, hoehe } = geometry;
  if (!Number.isSafeInteger(breite) || !Number.isSafeInteger(hoehe) || breite < 1 || hoehe < 1) fail("image dimensions could not be read");
  if (breite > BILD_GRENZEN.kante || hoehe > BILD_GRENZEN.kante) fail(`image edge exceeds ${BILD_GRENZEN.kante} px`);
  if (breite * hoehe > BILD_GRENZEN.pixel) fail(`image exceeds ${BILD_GRENZEN.pixel / 1_000_000} megapixels`);
  return Object.freeze({ format, mime, sha256: sha256Hex(bytes), bytes: bytes.length, ...geometry });
}

/**
 * True when the source wiki's claimed type disagrees with the bytes. The disagreement is
 * recorded, never corrected in silence: it is the single most useful line in an import report
 * for anyone deciding whether their own migration was faithful.
 */
export const formatWiderspruch = (behauptet: string | undefined, gemessen: string): boolean =>
  typeof behauptet === "string" && behauptet.trim() !== "" && behauptet.trim().toLowerCase() !== gemessen;
