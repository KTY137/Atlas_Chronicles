// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ANLAGE_STANDARD, BAUWERK_AUSDEHNUNG, GRUNDRISS_STANDARD, HOEHLE_STANDARD, SIEDLUNG_STANDARD, REGION_STANDARD,
  erzeugeAnlage, erzeugeGrundriss, erzeugeHoehle, erzeugeSiedlung, erzeugeRegion } from "@chronicle/forge";
import { parseAssetpaket } from "@chronicle/szene";
import { generationOptions, generationSettings, type GenerationDefaults, type GenerationSettings } from "../src/features/map-generation.ts";
import { changeEntranceType } from "../src/features/map-type-selection.ts";
import { makeMapRecipe, parseMapRecipe, serializeMapRecipe } from "../src/features/map-recipes.ts";
const defaults: GenerationDefaults = { grundriss: GRUNDRISS_STANDARD, hoehle: HOEHLE_STANDARD, siedlung: SIEDLUNG_STANDARD, region: REGION_STANDARD, gebaeude: BAUWERK_AUSDEHNUNG, anlagen: ANLAGE_STANDARD };
const pack = parseAssetpaket(readFileSync(new URL("../../../assets/packs/pk.gemalt/paket.json", import.meta.url), "utf8"));
const generate = (settings: GenerationSettings) => {
  const optionen = generationOptions(settings, defaults), input = { keim: "recipe:stable", titel: "Rezept", optionen };
  return settings.art === "siedlung" ? settings.anlage ? erzeugeAnlage(input as Parameters<typeof erzeugeAnlage>[0], pack) : erzeugeSiedlung(input, pack)
    : settings.art === "grundriss" ? erzeugeGrundriss(input, pack) : settings.art === "hoehle" ? erzeugeHoehle(input, pack) : erzeugeRegion(input, pack);
};
const base = () => makeMapRecipe("Rezept", "recipe:stable", generationSettings(), "a".repeat(64), defaults, { id: "chronicle-siedlung", version: "8" });
describe("portable map recipes", () => {
  it.each(["dorf", "haus", "hoehle", "region", "burg", "schloss"])("replays %s with resolved defaults and the same actual generator hash", kind => {
    const settings = kind === "burg" || kind === "schloss" ? changeEntranceType(generationSettings(), `anlage:${kind}`, defaults)
      : kind === "haus" ? generationSettings("grundriss", "haus") : generationSettings(kind === "dorf" ? "siedlung" : kind as "hoehle" | "region");
    const first = generate(settings), recipe = makeMapRecipe("Rezept", "recipe:stable", settings, first.keim.keimHash, defaults, { id: first.erzeuger, version: first.version });
    const restored = parseMapRecipe(serializeMapRecipe(recipe), defaults);
    expect(restored).toEqual(recipe); expect(generate(restored.settings).keim.keimHash).toBe(first.keim.keimHash);
    expect(restored.settings.breite).not.toBe(""); expect(restored.settings.anzahl).not.toBe("");
  });
  it("does not retain live references to mutable settings", () => {
    const recipe = base(), next = parseMapRecipe(serializeMapRecipe(recipe), defaults);
    next.settings.breite = 32; expect(recipe.settings.breite).toBe(36);
  });
  it.each([
    { schemaVersion: 2 }, { kind: "another-format" }, { name: "" }, { seed: " " }, { referenceHash: "fake" },
    { campaignId: "must-not-travel" }, { generator: { id: "", version: "1" } }, { generator: { id: "gen", version: "1", url: "https://unsafe.test" } },
  ])("rejects an incompatible envelope %j", patch => {
    expect(() => parseMapRecipe(JSON.stringify({ ...base(), ...patch }), defaults)).toThrow();
  });
  it.each([
    { art: "bogus" }, { breite: 999999 }, { hoehe: "24" }, { anzahl: 1.5 }, { dichte: 5 }, { licht: "yes" },
    { profil: "invented" }, { setting: "invented" }, { standort: "unknown" }, { anlage: "burg", symmetrie: 1 },
    { anlage: "schloss", graben: true }, { hiddenScript: "never execute" },
  ])("rejects invalid settings %j", patch => {
    const value = base(); value.settings = { ...value.settings, ...patch } as GenerationSettings;
    expect(() => parseMapRecipe(JSON.stringify(value), defaults)).toThrow();
  });
  it("rejects duplicate keys, prototype keys and oversized files", () => {
    const source = serializeMapRecipe(base());
    expect(() => parseMapRecipe(source.replace('"schemaVersion": 1', '"schemaVersion": 1, "schemaVersion": 1'), defaults)).toThrow();
    expect(() => parseMapRecipe(source.replace('"name": "Rezept"', '"name": "Rezept", "__proto__": {}'), defaults)).toThrow();
    expect(() => parseMapRecipe(" ".repeat(65537), defaults)).toThrow();
  });
  it("refuses compound recipes on a host that has not advertised that capability", () => {
    const recipe = makeMapRecipe("Burg", "seed", changeEntranceType(generationSettings(), "anlage:burg", defaults), "b".repeat(64), defaults, { id: "chronicle-anlage", version: "1" });
    expect(() => parseMapRecipe(serializeMapRecipe(recipe), { ...defaults, anlagen: undefined })).toThrow(/unterstützt/);
  });
});
