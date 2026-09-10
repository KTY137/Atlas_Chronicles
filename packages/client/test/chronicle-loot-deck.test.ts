// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { ItemContractV2, LOOT_RARITIES } from "@chronicle/protocol";
import { CHRONICLE_LOOT_DECK, CHRONICLE_LOOT_SPREAD, CHRONICLE_LOOT_IMAGE_DIR } from "@chronicle/rules";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const bild = (name: string) => `${root}${CHRONICLE_LOOT_IMAGE_DIR}/${name}`;
const manifest = JSON.parse(await readFile(bild("karten.json"), "utf8")) as {
  karten: { id: string; datei: string; name: string; seltenheit: string; bytes: number; sha256: string; breite: number; hoehe: number }[];
};

describe("the ChronicleHeroes loot deck", () => {
  it("holds forty cards with unique keys, names and images", () => {
    expect(CHRONICLE_LOOT_DECK).toHaveLength(40);
    for (const key of ["id", "name", "bild"] as const) {
      expect(new Set(CHRONICLE_LOOT_DECK.map(card => card[key])).size, key).toBe(40);
    }
    for (const card of CHRONICLE_LOOT_DECK) {
      expect(card.id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(card.bild).toBe(`${card.id}.png`);
      expect(card.name.trim()).toBe(card.name);
      expect(card.spruch.length).toBeGreaterThan(4);
      expect(card.zeilen.length).toBeGreaterThan(0);
      expect(card.tags.length).toBeGreaterThan(0);
    }
  });

  it("spreads the rarities exactly as the deck design promises", () => {
    const counted: Record<string, number> = {};
    for (const card of CHRONICLE_LOOT_DECK) counted[card.seltenheit] = (counted[card.seltenheit] ?? 0) + 1;
    expect(counted).toEqual({ ...CHRONICLE_LOOT_SPREAD });
    for (const rarity of Object.keys(CHRONICLE_LOOT_SPREAD)) expect(LOOT_RARITIES).toContain(rarity);
  });

  it("turns every card into a valid item contract once a campaign supplies the image", () => {
    for (const card of CHRONICLE_LOOT_DECK) {
      const contract = {
        schemaVersion: 2 as const, name: card.name, loreEntryId: null,
        tags: [...card.tags], seltenheit: card.seltenheit, kategorie: card.kategorie,
        bildAssetId: "a".repeat(64), spruch: card.spruch,
        zeilen: card.zeilen.map(row => ({ label: row.label, wert: row.wert })),
      };
      expect(Value.Check(ItemContractV2, contract), `${card.id}: ${JSON.stringify([...Value.Errors(ItemContractV2, contract)].slice(0, 1))}`).toBe(true);
    }
  });

  it("has a drawn image on disk for every card, byte-for-byte as the manifest records it", async () => {
    expect(manifest.karten).toHaveLength(40);
    for (const card of CHRONICLE_LOOT_DECK) {
      const row = manifest.karten.find(entry => entry.id === card.id);
      expect(row, card.id).toBeDefined();
      expect(row!.name).toBe(card.name);
      expect(row!.seltenheit).toBe(card.seltenheit);
      expect(row!.breite).toBe(512); expect(row!.hoehe).toBe(768);
      const bytes = await readFile(bild(card.bild));
      expect(bytes.length, card.id).toBe(row!.bytes);
      expect(createHash("sha256").update(bytes).digest("hex"), card.id).toBe(row!.sha256);
      // A real PNG, measured rather than believed: signature plus the size in its own header.
      expect(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), card.id).toBe(true);
      expect(bytes.subarray(12, 16).toString("ascii")).toBe("IHDR");
      expect(bytes.readUInt32BE(16)).toBe(512);
      expect(bytes.readUInt32BE(20)).toBe(768);
    }
  }, 60_000);

  it("names an emblem that the card printer can actually draw", () => {
    const drawn = new Set(CHRONICLE_LOOT_DECK.map(card => card.sinnbild));
    expect(drawn.size).toBeGreaterThanOrEqual(8);
    // Every weapon shows a blade or a bow; every armour shows a plate or a cloth. A card whose
    // picture contradicts its category is worse than a card without a picture.
    for (const card of CHRONICLE_LOOT_DECK) {
      if (card.kategorie === "Waffe") expect(["klinge", "bogen"], card.id).toContain(card.sinnbild);
      if (card.kategorie === "Rüstung") expect(["panzer", "tuch"], card.id).toContain(card.sinnbild);
      if (card.kategorie === "Trank") expect(card.sinnbild).toBe("phiole");
      if (card.kategorie === "Schriftstück") expect(card.sinnbild).toBe("buch");
    }
  });
});
