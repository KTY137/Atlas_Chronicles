// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "@chronicle/core";
import { BILD_GRENZEN, formatWiderspruch, vermisseBild } from "../src/index.ts";
import { ImportValidationError } from "../src/validation.ts";

/**
 * The claim under test is the one RB-12 made and `media/LIESMICH.md` measured: **the file name
 * lies about the format, the bytes do not.** These are the real files harvested from the real
 * wiki, so the assertion is about the user's actual corpus and not about a synthetic sample.
 */
const mediaDir = fileURLToPath(new URL("../../../design/fixtures/eron/media/", import.meta.url));
const manifest = JSON.parse(readFileSync(new URL("manifest.json", `file://${mediaDir.replace(/\\/g, "/")}`), "utf8")) as {
  dateien: { datei: string; dateiname_im_wiki: string; format_laut_dateiname?: string; masse_gemessen?: string }[];
};
const file = (name: string) => new Uint8Array(readFileSync(mediaDir + name));

describe("die Bildprüfung — Format aus den Bytes", () => {
  it("reads every harvested Eron file and contradicts the name it carries in the wiki", () => {
    const rows = readdirSync(mediaDir).filter((name) => /\.(webp|png|jpg|jpeg|gif)$/i.test(name));
    expect(rows.length).toBeGreaterThan(10);
    const widersprueche: string[] = [];
    for (const name of rows) {
      const befund = vermisseBild(file(name));
      expect(befund.breite).toBeGreaterThan(0);
      expect(befund.hoehe).toBeGreaterThan(0);
      expect(befund.sha256).toMatch(/^[a-f0-9]{64}$/);
      const entry = manifest.dateien.find((row) => row.datei === name);
      if (entry && formatWiderspruch(entry.format_laut_dateiname, befund.mime)) widersprueche.push(`${entry.dateiname_im_wiki} -> ${befund.mime}`);
      // The manifest's measured size was written by an independent tool; both must agree.
      if (entry?.masse_gemessen) expect(`${befund.breite}x${befund.hoehe}`).toBe(entry.masse_gemessen);
    }
    // Not "at least one": the whole point is that this is the normal case on a real wiki.
    expect(widersprueche.length).toBeGreaterThanOrEqual(10);
  });

  it("measures the hard case and the smallest portrait exactly", () => {
    expect(vermisseBild(file("Andaria_03.02.2024.webp"))).toMatchObject({ format: "webp", mime: "image/webp", breite: 8192, hoehe: 8192 });
    expect(vermisseBild(file("Bodin.webp"))).toMatchObject({ format: "webp", mime: "image/webp", breite: 512, hoehe: 512 });
    expect(vermisseBild(file("_vorschau.png"))).toMatchObject({ format: "png", mime: "image/png", breite: 1100, hoehe: 704 });
  });

  it("hashes the bytes it was given, so a stored asset can be proven unchanged", () => {
    const bytes = file("Bodin.webp");
    expect(vermisseBild(bytes).sha256).toBe(sha256Hex(bytes));
    expect(vermisseBild(bytes).bytes).toBe(bytes.length);
  });

  it("reads a baseline JPEG frame header past its metadata segments", () => {
    // APP0/JFIF, then a comment segment, then SOF0 with 480x640 — the layout a phone camera writes.
    const jpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xff, 0xfe, 0x00, 0x05, 0x41, 0x42, 0x43,
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x80, 0x01, 0xe0, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xff, 0xd9,
    ]);
    expect(vermisseBild(jpeg)).toMatchObject({ format: "jpeg", mime: "image/jpeg", breite: 480, hoehe: 640, variante: "JPEG SOF0" });
  });

  it("refuses what it cannot honestly measure instead of guessing", () => {
    expect(() => vermisseBild(new Uint8Array(0))).toThrow(ImportValidationError);
    expect(() => vermisseBild(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))).toThrow(/unrecognised image container/);
    // An SVG is a script-carrying document. Admitting it would put active content behind an <img>.
    expect(() => vermisseBild(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'))).toThrow(/unrecognised image container/);
    // A WebP header whose declared container size disagrees with the delivered length.
    const broken = new Uint8Array(file("Bodin.webp").subarray(0, 4000));
    expect(() => vermisseBild(broken)).toThrow(/disagrees with the file length/);
    expect(() => vermisseBild(new Uint8Array(BILD_GRENZEN.bytes + 1))).toThrow(/exceeds 24 MB/);
  });

  it("only calls it a contradiction when the source actually claimed something else", () => {
    expect(formatWiderspruch("image/jpeg", "image/webp")).toBe(true);
    expect(formatWiderspruch("image/webp", "image/webp")).toBe(false);
    expect(formatWiderspruch(undefined, "image/webp")).toBe(false);
    expect(formatWiderspruch("", "image/webp")).toBe(false);
  });
});
