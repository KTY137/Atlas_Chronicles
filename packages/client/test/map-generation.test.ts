// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { inferLegacyCartography, parseTacticalMapDocument, TACTICAL_MAP_LIMITS } from "@chronicle/szene";
import { validateMapScene } from "../../render/src/geometry.ts";
import {
  BUILDING_COLORS, changeGenerationSetting, generationDimensions, generationError, generationOptions, generationSettings, mapDocumentScene,
  type GenerationDefaults, type MapNode,
} from "../src/features/map-generation.ts";

// Deliberately different extents: editing one field must retain that map kind's server default.
const defaults: GenerationDefaults = {
  grundriss: { zellen: [40, 30], zellgroesse: 64, raeume: 11, minRaum: 3, schleifen: 3,
    moeblierung: 1, licht: true, gangboden: "trocken", anordnung: "streuung", profil: "frei" },
  hoehle: { zellen: [44, 32], zellgroesse: 64, kammern: 8, fuellung: .45, glaettung: 4, mindestFlaeche: 12, moeblierung: 1, licht: true },
  siedlung: { art: "dorf", ausdehnung: [36, 28], zellgroesse: 96, bauwerke: 42, strassenDichte: .3, grundstueck: [3, 6], licht: true },
};

describe("map generation request boundaries", () => {
  it.each([
    ["siedlung", [36, 28]], ["grundriss", [40, 30]], ["hoehle", [44, 32]],
  ] as const)("retains untouched %s dimensions when editing a single dimension", (art, expected) => {
    const original = generationSettings(art);
    expect(generationDimensions(original, defaults)).toEqual(expected);
    expect(generationDimensions({ ...original, breite: 52 }, defaults)).toEqual([52, expected[1]]);
    expect(generationDimensions({ ...original, hoehe: 22 }, defaults)).toEqual([expected[0], 22]);
    const key = art === "siedlung" ? "ausdehnung" : "zellen";
    expect(generationOptions({ ...original, breite: 52 }, defaults)).toHaveProperty(key, [52, expected[1]]);
    expect(generationOptions({ ...original, hoehe: 22 }, defaults)).toHaveProperty(key, [expected[0], 22]);
    expect(generationOptions(original, defaults)).not.toHaveProperty(key);
    expect(original.breite).toBe(""); expect(original.hoehe).toBe("");
  });

  it("emits the settlement, cave and floorplan option fields accepted by their separate API variants", () => {
    const edit = { breite: 42, hoehe: 24, anzahl: 18, licht: false, dichte: .45, moeblierung: .25 };
    expect(generationOptions({ ...generationSettings("siedlung"), ...edit, siedlung: "stadt" }, defaults)).toEqual({
      art: "stadt", standort: "fluss", setting: "fantasy", ausdehnung: [42, 24], bauwerke: 18, strassenDichte: .45, relief: .5, bewaldung: .5, licht: false,
    });
    expect(generationOptions({ ...generationSettings("hoehle"), ...edit }, defaults)).toEqual({
      zellen: [42, 24], kammern: 18, moeblierung: .25, licht: false,
    });
    expect(generationOptions({ ...generationSettings("grundriss", "kirche"), ...edit, anordnung: "raster" }, defaults)).toEqual({
      zellen: [42, 24], raeume: 18, profil: "kirche", anordnung: "raster", setting: "fantasy", moeblierung: .25, licht: false,
    });
    for (const art of ["siedlung", "grundriss", "hoehle"] as const) {
      const options = generationOptions(generationSettings(art), defaults);
      for (const omitted of ["bauwerke", "raeume", "kammern", "stil"]) expect(options).not.toHaveProperty(omitted);
    }
  });

  it("uses the chosen settlement profile for an untouched axis and its pixel budget", () => {
    const profiles: GenerationDefaults = { ...defaults, siedlungsarten: {
      weiler: { ...defaults.siedlung, art: "weiler", ausdehnung: [20, 16], zellgroesse: 128, bauwerke: 9, licht: false },
      dorf: defaults.siedlung,
      stadt: { ...defaults.siedlung, art: "stadt", ausdehnung: [56, 44], bauwerke: 130 },
    } };
    const weiler = { ...generationSettings("siedlung"), siedlung: "weiler" as const, breite: 32 };
    expect(generationOptions(weiler, profiles)).toHaveProperty("ausdehnung", [32, 16]);
    expect(generationOptions({ ...weiler, siedlung: "stadt" }, profiles)).toHaveProperty("ausdehnung", [32, 44]);
    expect(generationError({ ...weiler, breite: 120, hoehe: 100 }, profiles)).not.toBeNull();
    expect(generationError({ ...weiler, siedlung: "stadt", breite: 120, hoehe: 100 }, profiles)).toBeNull();
  });

  for (const field of ["breite", "hoehe", "anzahl"] as const) {
    it.each([NaN, Infinity, -Infinity, 12.5])(`rejects non-integral ${field}=%s before submission`, value => {
      expect(generationError({ ...generationSettings(), [field]: value }, defaults)).not.toBeNull();
    });
  }

  it.each([
    ["siedlung", 1, 256], ["grundriss", 2, 64], ["hoehle", 2, 32],
  ] as const)("enforces %s count bounds without converting an empty field into zero", (art, min, max) => {
    const settings = generationSettings(art);
    for (const anzahl of ["", min, max] as const) expect(generationError({ ...settings, anzahl }, defaults)).toBeNull();
    for (const anzahl of [min - 1, max + 1]) expect(generationError({ ...settings, anzahl }, defaults)).not.toBeNull();
  });

  it("rejects out-of-range dimensions and the aggregate cell budget independently of room count", () => {
    for (const [breite, hoehe] of [[11, 30], [193, 30], [40, 11], [40, 193], [192, 105]]) {
      expect(generationError({ ...generationSettings("grundriss"), breite: breite!, hoehe: hoehe! }, defaults)).not.toBeNull();
    }
    expect(generationError({ ...generationSettings("grundriss"), breite: 12, hoehe: 12 }, defaults)).toBeNull();
  });

  it("checks the real 144-million-pixel document budget, including the selected type's cell size", () => {
    expect(TACTICAL_MAP_LIMITS.pixels).toBe(144_000_000);
    const largeCells: GenerationDefaults = { ...defaults, siedlung: { ...defaults.siedlung, zellgroesse: 100 } };
    const settings = { ...generationSettings("siedlung"), breite: 120, hoehe: 120 };
    expect(generationError(settings, largeCells)).toBeNull(); // exactly 144 million, below 20,000 cells
    expect(generationError({ ...settings, breite: 121 }, largeCells)).not.toBeNull();
    expect(generationError({ ...settings, art: "grundriss" }, largeCells)).toBeNull(); // uses 64px cells
    const longCells: GenerationDefaults = { ...defaults, grundriss: { ...defaults.grundriss, zellgroesse: 256 } };
    expect(generationError({ ...generationSettings("grundriss"), breite: 129, hoehe: 12 }, longCells)).not.toBeNull(); // edge >32,768; total <144M
  });
});

const document = parseTacticalMapDocument({
  schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
  frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
  geometry: { v: 3, size: [640, 480],
    regions: [
      { id: "church", punkte: [[40, 40], [140, 40], [140, 160], [40, 160]] },
      { id: "street", punkte: [[150, 0], [190, 0], [190, 480], [150, 480]] },
      { id: "legacy-house", punkte: [[220, 40], [300, 40], [300, 120], [220, 120]] },
    ],
    stamps: [{ id: "paving", a: "pk.grundriss/stein", x: 170, y: 80, s: 1, r: .5, l: -100, t: 123 }], places: [],
  },
  grid: { kind: "square", size: 64, origin: [0, 0] }, elevation: 0, geometryElevation: [],
  walls: [{ id: "wall", kind: "wall", points: [[0, 0], [640, 0]], elevation: 0 }], portals: [], lights: [],
  environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null,
});
const nodes: readonly MapNode[] = [
  { knotenId: "church", titel: "Kirche der Morgenröte", art: "bauwerk", x: 90, y: 100, bauwerk: { typ: "kirche", beschreibung: "Am Markt" } },
  { knotenId: "legacy-house", titel: "Haus Linden", art: "bauwerk", x: 260, y: 80 },
];

const cartography = { ...inferLegacyCartography(document), regions: document.geometry.regions.map(region => ({ regionId: region.id, authored: false, locked: false, provenance: null, ...(region.id === "street" ? { role: "road" as const, material: "street" as const } : { role: "building" as const }) })) };
describe("map document presentation keeps spatial identity", () => {
  it("retains a visible portal for an existing interior while ordinary roof markers remain hidden", () => {
    const scene = mapDocumentScene("city",document,nodes.map(node => ({ ...node, vorhandeneKarteId: "interior" })),"siedlung",undefined,"fantasy",cartography);
    expect(scene.pins.every(pin => pin.icon === "portal" && pin.showMarker === true)).toBe(true);
  });
  it("renders modern and future roofs without changing footprints or picking IDs", () => {
    const contemporary = mapDocumentScene("city", document, nodes, "siedlung", undefined, "gegenwart", cartography);
    const future = mapDocumentScene("city", document, nodes, "siedlung", undefined, "scifi", cartography);
    expect(contemporary.cells[0]!.roof).toBe("flat"); expect(future.cells[0]!.roof).toBe("tech");
    expect(contemporary.cells[1]!.roof).toBeUndefined();
    expect(contemporary.cells.map(cell => [cell.id, cell.polygon])).toEqual(future.cells.map(cell => [cell.id, cell.polygon]));
    expect(contemporary.cells[1]!.fill).not.toBe(future.cells[1]!.fill);
  });
  it("paints building roofs and streets while retaining exact region identities and authorized node pins", () => {
    const scene = mapDocumentScene("city", document, nodes, "siedlung", "campaign:map", "fantasy", cartography);
    expect(scene.cells.map(cell => cell.id)).toEqual(["church", "street", "legacy-house"]);
    expect(scene.cells.map(cell => cell.surface)).toEqual(["building", "street", "building"]);
    expect(scene.cells.map(cell => cell.polygon)).toEqual(document.geometry.regions.map(region => region.punkte));
    expect(scene.cells[0]!.fill).toBe(BUILDING_COLORS.kirche);
    expect(scene.cells[2]!.fill).toBe(BUILDING_COLORS.haus);
    expect(scene.pins).toEqual([
      { id: "church", x: 90, y: 100, label: "Kirche der Morgenröte", color: BUILDING_COLORS.kirche, showMarker: false },
      { id: "legacy-house", x: 260, y: 80, label: "Haus Linden", showMarker: false },
    ]);
    expect(scene.pins.some(pin => pin.id === "street")).toBe(false);
    expect(scene).toMatchObject({ id: "city", width: 640, height: 480, rasterScope: "campaign:map", grid: document.grid,
      lines: [{id:"wall",points:document.walls[0]!.points,paint:false}],
      stamps: [{ id: "paving", asset: "pk.grundriss/stein", x: 170, y: 80, s: 1, r: .5, l: -100, t: 123 }],
    });
    expect(() => validateMapScene(scene)).not.toThrow();
    expect(scene.drawing!.polygons.some(polygon=>polygon.regionId==="wall")).toBe(true);
    expect(() => validateMapScene({...scene,drawing:{...scene.drawing!,polygons:[{...scene.drawing!.polygons[0]!,regionId:"missing-wall"}]}})).toThrow("invalid cartography polygon");
  });

  it("never guesses a street, building or entrance for an unbound legacy region", () => {
    const scene = mapDocumentScene("city", document, [], "siedlung");
    expect(scene.pins).toEqual([]);
    expect(scene.cells).toHaveLength(document.geometry.regions.length);
    expect(scene.cells.every(cell => cell.surface === undefined)).toBe(true);
    expect(scene).not.toHaveProperty("rasterScope");
  });

  it("infers existing building surfaces from supplied nodes while room maps retain ordinary region surfaces", () => {
    expect(mapDocumentScene("legacy-city", document, nodes).cells[0]!.surface).toBe("building");
    const room: MapNode = { knotenId: "church", titel: "Kirchenschiff", art: "raum", x: 90, y: 100 };
    const scene = mapDocumentScene("interior", document, [room], "grundriss");
    expect(scene.cells.every(cell => cell.surface === undefined)).toBe(true);
    expect(scene.pins).toHaveLength(1);
    expect(scene.pins[0]!.id).toBe("church");
    expect(scene.lines).toEqual([{ id: "wall", points: [[0, 0], [640, 0]] }]);
    expect(mapDocumentScene("room-map",document,[room],"grundriss",undefined,"fantasy",inferLegacyCartography(document)).lines).toEqual(scene.lines);
  });
});

describe("setting and inherited interior choices", () => {
  it("changes setting and default artwork while retaining authored sizes and building profile", () => {
    const original = { ...generationSettings("grundriss", "labor"), breite: 52, hoehe: 28, anzahl: 7 };
    const modern = changeGenerationSetting(original, "gegenwart");
    expect(modern).toMatchObject({ setting: "gegenwart", stil: "zeitwelten", profil: "labor", breite: 52, hoehe: 28, anzahl: 7 });
    expect(changeGenerationSetting(modern, "fantasy").stil).toBe("gemalt");
    expect(generationOptions(modern, defaults)).toMatchObject({ setting: "gegenwart", profil: "labor", zellen: [52, 28] });
  });
  it("retains the parent's science-fiction setting for the initial child request", () => {
    const child = generationSettings("grundriss", "medstation", "zeitwelten", "scifi");
    expect(generationOptions(child, defaults)).toMatchObject({ setting: "scifi", profil: "medstation" });
    expect(generationOptions({ ...child, art: "hoehle" }, defaults)).not.toHaveProperty("setting");
  });
});

describe("a building's interior takes its own default extent", () => {
  it("shows the building type's extent instead of the free floorplan's canvas, unless the user chose one", () => {
    const withBuildings: GenerationDefaults = { ...defaults, gebaeude: { haus: [14, 12], kirche: [18, 24] } };
    expect(generationDimensions(generationSettings("grundriss", "haus"), withBuildings)).toEqual([14, 12]);
    expect(generationDimensions(generationSettings("grundriss", "kirche"), withBuildings)).toEqual([18, 24]);
    expect(generationDimensions(generationSettings("grundriss", "frei"), withBuildings)).toEqual([40, 30]);
    expect(generationDimensions({ ...generationSettings("grundriss", "haus"), breite: 20 }, withBuildings)).toEqual([20, 12]);
    expect(generationDimensions(generationSettings("grundriss", "haus"), defaults)).toEqual([40, 30]);
    expect(generationOptions(generationSettings("grundriss", "haus"), withBuildings)).not.toHaveProperty("zellen");
  });
});
