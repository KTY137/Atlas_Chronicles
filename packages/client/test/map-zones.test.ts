// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { parseAssetpaket, type SettlementPlan } from "@chronicle/szene";
import { GRUNDRISS_STANDARD, HOEHLE_STANDARD, SIEDLUNG_STANDARD, ANLAGE_STANDARD, erzeugeSiedlung } from "@chronicle/forge";
import { generationError, generationOptions, generationSettings, type GenerationDefaults } from "../src/features/map-generation.ts";
import { changeEntranceType } from "../src/features/map-type-selection.ts";
import { MapGenerationControls } from "../src/features/MapGenerationControls.tsx";
import { makeMapRecipe, parseMapRecipe, serializeMapRecipe } from "../src/features/map-recipes.ts";
const defaults: GenerationDefaults = { grundriss: GRUNDRISS_STANDARD, hoehle: HOEHLE_STANDARD, siedlung: SIEDLUNG_STANDARD, anlagen: ANLAGE_STANDARD, siedlungsplanung: 1 };
const planung: SettlementPlan = { schemaVersion: 1, zonen: [{ id: "west", name: "Handwerk", nutzung: "handwerk", dichte: .6, polygon: [[0,0],[.5,0],[.5,1],[0,1]] }] };
const settings = () => ({ ...generationSettings(), planung });
describe("zone controls and recipe contract", () => {
  it("sends the actual masks to the existing generator endpoint", () => expect(generationOptions(settings(), defaults)).toMatchObject({ planung }));
  it("only exposes the planner for supported, ordinary settlements", () => {
    const markup = (value = settings(), d = defaults) => renderToStaticMarkup(MapGenerationControls({value,defaults:d,onChange:()=>{}}));
    expect(markup()).toContain("Viertel &amp; Freiflächen planen");
    expect(markup()).toContain('aria-label="Zone auswählen"');
    expect(markup(settings(), { ...defaults, siedlungsplanung: undefined })).not.toContain("Zonenplan zeichnen");
    expect(markup({ ...settings(), anlage: "burg" } as never)).not.toContain("Zonenplan zeichnen");
  });
  it("preserves a normalized plan when resizing a village into a city", () => expect(changeEntranceType(settings(), "siedlung:stadt", defaults).planung).toEqual(planung));
  it.each(["grundriss:haus", "hoehle", "anlage:burg", "anlage:schloss"])("clears incompatible masks on %s", choice => expect(changeEntranceType(settings(), choice, defaults)).not.toHaveProperty("planung"));
  it("refuses unsupported or malformed planning before a request", () => {
    expect(generationError(settings(), { ...defaults, siedlungsplanung: undefined })).toMatch(/unterstützt/);
    expect(generationError({ ...settings(), planung: { schemaVersion: 2 } as never }, defaults)).toMatch(/ungültig/);
    expect(generationError({ ...settings(), art: "hoehle" }, defaults)).toMatch(/unterstützt/);
  });
  it("replays a portable zoned recipe with the same generator hash", () => {
    const pack = parseAssetpaket(readFileSync("assets/packs/pk.gemalt/paket.json", "utf8")), first = erzeugeSiedlung({keim:"zones-recipe",optionen:generationOptions(settings(),defaults)},pack);
    const recipe = makeMapRecipe("Stadt", "zones-recipe",settings(),first.keim.keimHash,defaults,{id:first.erzeuger,version:first.version});
    const copy = parseMapRecipe(serializeMapRecipe(recipe), defaults);
    expect(copy.settings.planung).toEqual(planung);
    expect(erzeugeSiedlung({keim:copy.seed,optionen:generationOptions(copy.settings,defaults)},pack).keim.keimHash).toBe(first.keim.keimHash);
    expect(() => parseMapRecipe(serializeMapRecipe(copy),{...defaults,siedlungsplanung:undefined})).toThrow();
    expect(copy.settings.planung).not.toBe(planung);
  });
});
