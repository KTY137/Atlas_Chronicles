// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseAssetpaket, type RoadPlan } from "@chronicle/szene";
import { GRUNDRISS_STANDARD, HOEHLE_STANDARD, SIEDLUNG_STANDARD, ANLAGE_STANDARD, erzeugeSiedlung } from "@chronicle/forge";
import { generationError, generationOptions, generationSettings, type GenerationDefaults } from "../src/features/map-generation.ts";
import { changeEntranceType } from "../src/features/map-type-selection.ts";
import { MapGenerationControls } from "../src/features/MapGenerationControls.tsx";
import { MapRoadPlanner, RoadPlanReport } from "../src/features/MapRoadPlanner.tsx";
import { makeMapRecipe, parseMapRecipe, serializeMapRecipe } from "../src/features/map-recipes.ts";
const defaults: GenerationDefaults = { grundriss: GRUNDRISS_STANDARD, hoehle: HOEHLE_STANDARD, siedlung: SIEDLUNG_STANDARD, anlagen: ANLAGE_STANDARD, strassenplanung: 1 };
const verkehr: RoadPlan = { schemaVersion: 1, maxSteigung: 24,
  knoten: [{ id: "entry", name: "Westtor", art: "tor", position: [.1,.5] }, { id: "market", name: "Markt", art: "platz", position: [.9,.5] }],
  verbindungen: [{ id: "avenue", von: "entry", nach: "market", art: "hauptstrasse", bruecke: false }] };
const settings = () => ({ ...generationSettings(), standort: "ebene" as const, relief: 0, verkehr });

describe("road-planning controls and portable recipes", () => {
  it("uses the shared themed buttons instead of browser-default controls", () => {
    const markup=renderToStaticMarkup(createElement(MapRoadPlanner,{value:verkehr,onChange:()=>{}}));
    const buttons=markup.match(/<button[^>]*>/g)??[];
    expect(buttons).toHaveLength(2);
    for(const button of buttons) expect(button).toContain('class="button button-default ');
  });
  it("sends the graph without a second geometry representation", () => expect(generationOptions(settings(), defaults)).toMatchObject({ verkehr }));
  it("gates the planner by actual server capability and generator type", () => {
    const markup = (value = settings(), d = defaults) => renderToStaticMarkup(MapGenerationControls({value,defaults:d,onChange:()=>{}}));
    expect(markup()).toContain("Straßen &amp; Verbindungen planen");
    expect(markup()).toContain('aria-label="Straßenplan zeichnen"');
    expect(markup(settings(), { ...defaults, strassenplanung: undefined })).not.toContain("Straßenplan zeichnen");
    expect(markup({ ...settings(), anlage: "burg" } as never)).not.toContain("Straßenplan zeichnen");
    expect(markup({ ...settings(), art: "grundriss" })).not.toContain("Straßenplan zeichnen");
  });
  it("preserves a normalized graph across settlement sizes", () => expect(changeEntranceType(settings(), "siedlung:stadt", defaults).verkehr).toEqual(verkehr));
  it.each(["grundriss:haus", "grundriss:frei", "hoehle", "anlage:burg", "anlage:schloss"])("clears incompatible graph on %s", choice => expect(changeEntranceType(settings(), choice, defaults)).not.toHaveProperty("verkehr"));
  it("rejects a malformed graph, empty editing name, or unsupported host before requesting", () => {
    expect(generationError(settings(), defaults)).toBeNull();
    expect(generationError(settings(), { ...defaults, strassenplanung: undefined })).toMatch(/unterstützt/);
    expect(generationError({ ...settings(), verkehr: { schemaVersion: 2 } as never }, defaults)).toMatch(/ungültig/);
    expect(generationError({ ...settings(), verkehr: { ...verkehr, knoten: [{...verkehr.knoten[0]!,name:""},verkehr.knoten[1]!] } }, defaults)).toMatch(/ungültig/);
    expect(generationError({ ...settings(), art: "hoehle" }, defaults)).toMatch(/unterstützt/);
  });
  it("replays the exact graph and original hash from a portable recipe", () => {
    const pack = parseAssetpaket(readFileSync("assets/packs/pk.gemalt/paket.json", "utf8"));
    const first = erzeugeSiedlung({ keim:"roads-recipe", optionen:generationOptions(settings(),defaults) },pack);
    const recipe = makeMapRecipe("Straßennetz", "roads-recipe",settings(),first.keim.keimHash,defaults,{id:first.erzeuger,version:first.version});
    const copy = parseMapRecipe(serializeMapRecipe(recipe),defaults);
    expect(copy.settings.verkehr).toEqual(verkehr); expect(copy.settings.verkehr).not.toBe(verkehr);
    expect(erzeugeSiedlung({keim:copy.seed,optionen:generationOptions(copy.settings,defaults)},pack).keim.keimHash).toBe(first.keim.keimHash);
    expect(() => parseMapRecipe(serializeMapRecipe(copy),{...defaults,strassenplanung:undefined})).toThrow(/unterstützt/);
    expect(() => parseMapRecipe(serializeMapRecipe({...copy,settings:{...copy.settings,verkehr:{...verkehr,verbindungen:[{...verkehr.verbindungen[0]!,nach:"missing"}]}}}),defaults)).toThrow();
  });
  it("reports failures, unserved nodes and qualified bottlenecks with escaped user names", () => {
    const report={components:2,invalidNodes:["market"],unreachableNodes:["market"],unreachableBuildings:["b"],singleLinks:["avenue"],reservedRegions:[],routes:[{id:"avenue",von:"entry",nach:"market",status:"endpunkt" as const,points:[],length:0,riverCrossings:0}]};
    const markup=renderToStaticMarkup(RoadPlanReport({report,plan:verkehr,names:new Map([["b","<img src=x onerror=alert(1)>"]])}));
    expect(markup).toContain("Ziel oder Platz liegt in Wasser");
    expect(markup).toContain("Nicht erreichbare Wegpunkte: Markt");
    expect(markup).toContain("Das automatische Netz kann weitere Wege bieten");
    expect(markup).toContain("&lt;img"); expect(markup).not.toContain("<img");
  });
  it("formats report distances and singular counts in the selected language", () => {
    const report={components:1,invalidNodes:[],unreachableNodes:[],unreachableBuildings:[],singleLinks:["avenue"],reservedRegions:[],routes:[{id:"avenue",von:"entry",nach:"market",status:"gebaut" as const,points:[],length:28.8,riverCrossings:1}]};
    const markup=renderToStaticMarkup(RoadPlanReport({report,plan:verkehr,names:new Map()}));
    expect(markup).toContain("Gebaut: 28,8 Zellen, 1 Flussquerung");
    expect(markup).not.toContain("1 Flussquerungen");
    expect(markup).toContain("1 Straßennetz auf der gesamten Karte.");
    expect(markup).toContain("1 Verbindung ohne Alternativweg");
  });
  it("does not send an empty graph or change legacy generator provenance", () => {
    const empty={...settings(),verkehr:{...verkehr,knoten:[],verbindungen:[]}};
    expect(generationOptions(empty,defaults)).not.toHaveProperty("verkehr");
  });
});
