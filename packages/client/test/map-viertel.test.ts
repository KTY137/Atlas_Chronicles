// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SettlementPlan } from "@chronicle/szene";
import { ANLAGE_STANDARD, GRUNDRISS_STANDARD, HOEHLE_STANDARD, SIEDLUNG_STANDARD, siedlungStandard } from "@chronicle/forge";
import { generationOptions, generationSettings, siedlungsVorgabe, type GenerationDefaults } from "../src/features/map-generation.ts";
import { MapGenerationControls } from "../src/features/MapGenerationControls.tsx";
import { MapZonePlanner } from "../src/features/MapZonePlanner.tsx";
import { makeMapRecipe, parseMapRecipe, serializeMapRecipe } from "../src/features/map-recipes.ts";

const jeSetting = Object.fromEntries((["fantasy", "gegenwart", "scifi"] as const).map(s => [s, { weiler: siedlungStandard("weiler", s), dorf: siedlungStandard("dorf", s), stadt: siedlungStandard("stadt", s) }]));
const defaults: GenerationDefaults = { grundriss: GRUNDRISS_STANDARD, hoehle: HOEHLE_STANDARD, siedlung: SIEDLUNG_STANDARD, anlagen: ANLAGE_STANDARD, siedlungsplanung: 1,
  siedlungsarten: jeSetting.fantasy as never, siedlungsartenJeSetting: jeSetting as never };
const stadt = (patch: object = {}) => ({ ...generationSettings(), siedlung: "stadt" as const, ...patch });
const markup = (value = stadt()) => renderToStaticMarkup(MapGenerationControls({ value, defaults, onChange: () => {} }));

describe("Stadtmauer, Burg und Viertel in der Oberfläche", () => {
  it("reicht Mauer und Burg für Fantasy durch, den Schutzzaun für Sci-Fi, in der Gegenwart nichts", () => {
    expect(generationOptions(stadt({ mauer: false, burg: true }), defaults)).toMatchObject({ mauer: false, burg: true });
    expect(generationOptions(stadt({ mauer: false, burg: true, setting: "scifi" }), defaults)).toMatchObject({ mauer: false });
    expect(generationOptions(stadt({ mauer: false, burg: true, setting: "scifi" }), defaults)).not.toHaveProperty("burg");
    expect(generationOptions(stadt({ mauer: false, setting: "gegenwart" }), defaults)).not.toHaveProperty("mauer");
    expect(generationOptions(stadt(), defaults)).not.toHaveProperty("mauer");
  });
  it("zeigt der Kolonie einen Schutzzaun und der heutigen Stadt keine Befestigung", () => {
    const kolonie = markup(stadt({ setting: "scifi" })), heute = markup(stadt({ setting: "gegenwart" }));
    expect(kolonie).toContain("Schutzzaun mit Toren");
    expect(kolonie).not.toContain("Burg am Stadtrand");
    expect(heute).not.toContain("Schutzzaun mit Toren");
    expect(heute).not.toContain("Stadtmauer mit Türmen und Toren");
  });
  it("benennt die Zonen in der Sprache des Settings", () => {
    const zone = { id: "z", name: "Z", nutzung: "burg" as const, dichte: 1, polygon: [[.4, .4], [.6, .4], [.6, .6]] as const };
    const planer = (setting: "fantasy" | "gegenwart" | "scifi") => renderToStaticMarkup(createElement(MapZonePlanner, { onChange: () => {}, setting, value: { schemaVersion: 1, zonen: [zone] } }));
    expect(planer("scifi")).toContain("Raumhafen"); expect(planer("scifi")).toContain("Kommandozentrale"); expect(planer("scifi")).not.toContain("Tempelbezirk");
    expect(planer("gegenwart")).toContain("Innenstadt"); expect(planer("gegenwart")).toContain("Rathaus &amp; Ämter"); expect(planer("gegenwart")).not.toContain("Adelsviertel");
    expect(planer("fantasy")).toContain("Tempelbezirk");
  });
  it("zeigt die zwei Schalter mit Klartext nur bei Fantasy", () => {
    expect(markup()).toContain("Stadtmauer mit Türmen und Toren");
    expect(markup()).toContain("Burg am Stadtrand");
    expect(markup(stadt({ setting: "scifi" }))).not.toContain("Stadtmauer mit Türmen und Toren");
  });
  it("nennt je Setting die Gebäudezahl, die der Server wirklich baut", () => {
    expect(siedlungsVorgabe(defaults, "stadt", "fantasy").bauwerke).toBe(320);
    expect(siedlungsVorgabe(defaults, "stadt", "scifi").bauwerke).toBe(224);
    const recipe = makeMapRecipe("Kolonie", "k", stadt({ setting: "scifi", stil: "zeitwelten" }), "a".repeat(64), defaults, { id: "chronicle-siedlung", version: "8" });
    expect(recipe.settings.anzahl).toBe(224);
  });
  it("trägt Mauer und Burg durch eine Kartenvorlage", () => {
    const recipe = makeMapRecipe("Stadt", "k", stadt({ mauer: false, burg: false }), "a".repeat(64), defaults, { id: "chronicle-siedlung", version: "11" });
    expect(parseMapRecipe(serializeMapRecipe(recipe), defaults).settings).toMatchObject({ mauer: false, burg: false });
  });
  it("bietet Burg und Tempelbezirk als Zonen an und übernimmt die Viertel der Vorschau", () => {
    const vorschlag: SettlementPlan = { schemaVersion: 1, zonen: [{ id: "viertel-1", name: "Marktplatz", nutzung: "markt", dichte: 1, polygon: [[.4, .4], [.6, .4], [.6, .6]] }] };
    const leer = renderToStaticMarkup(createElement(MapZonePlanner, { onChange: () => {} }));
    const mit = renderToStaticMarkup(createElement(MapZonePlanner, { onChange: () => {}, vorschlag }));
    expect(leer).not.toContain("Viertel aus der Karte übernehmen");
    expect(mit).toContain("Viertel aus der Karte übernehmen");
    const auswahl = renderToStaticMarkup(createElement(MapZonePlanner, { onChange: () => {}, value: { schemaVersion: 1, zonen: [{ ...vorschlag.zonen[0]!, nutzung: "burg" }] } }));
    expect(auswahl).toContain("Tempelbezirk");
    expect(auswahl).toContain("Burg");
  });
});
