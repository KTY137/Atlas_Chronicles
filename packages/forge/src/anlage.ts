// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { KARTEN_SETTINGS, parseTacticalCartography, parseTacticalMapDocument, weltkeim,
  type AssetpaketV1, type BauwerkTyp, type CartographyRegionV1, type KartenSetting, type Knoten,
  type TacticalLight, type TacticalPortal, type TacticalWall } from "@chronicle/szene";
import { fail, idFabrik, KARTENWERK_LIMITS, sortiereNachId } from "./kartenwerk.ts";
import { erzeugeLandschaft, RELIEF_STANDORTE, type ReliefStandort } from "./relief.ts";
import { flaeche, qp, schwerpunkt, schnittKonvex, type Polygon, type Punkt } from "./polygon.ts";
import type { Siedlung, SiedlungBauwerk, SiedlungStrasse } from "./siedlung.ts";
import type { GrundrissEltern } from "./kartenwerk.ts";

/** Compounds use the existing settlement/map contract, but their own architectural grammar
 * and seed version. Adding them does not change a single legacy town or interior ID. */
export const ANLAGE_ERZEUGER = "chronicle-anlage";
export const ANLAGE_VERSION = "1";
export const ANLAGE_ARTEN = ["burg", "schloss"] as const;
export type AnlageArt = typeof ANLAGE_ARTEN[number];
export const ANLAGE_LABEL = { burg: "Burg", schloss: "Schloss" } as const;
export const ANLAGE_GEBAEUDE = { burg: { min: 7, max: 12 }, schloss: { min: 3, max: 7 } } as const;
export interface AnlageOptionen {
  readonly anlage: AnlageArt;
  readonly ausdehnung: readonly [number, number];
  readonly zellgroesse: number;
  readonly bauwerke: number;
  readonly licht: boolean;
  readonly setting: KartenSetting;
  readonly standort: ReliefStandort;
  readonly relief: number;
  readonly bewaldung: number;
  /** Only castles have a moat; only palaces have adjustable symmetry. */
  readonly graben?: boolean;
  readonly symmetrie?: number;
}
export const ANLAGE_STANDARD: Readonly<Record<AnlageArt, AnlageOptionen>> = Object.freeze({
  burg: Object.freeze({ anlage: "burg", ausdehnung: [48, 40] as const, zellgroesse: 96, bauwerke: 12, licht: true, setting: "fantasy", standort: "huegel", relief: .5, bewaldung: .4, graben: false }),
  schloss: Object.freeze({ anlage: "schloss", ausdehnung: [56, 44] as const, zellgroesse: 96, bauwerke: 7, licht: true, setting: "fantasy", standort: "ebene", relief: .25, bewaldung: .3, symmetrie: 1 }),
});
export const ANLAGE_OPTION_KEYS = ["anlage", "ausdehnung", "zellgroesse", "bauwerke", "licht", "setting", "standort", "relief", "bewaldung", "graben", "symmetrie"] as const;
export function anlageOptionen(input: Partial<AnlageOptionen>): AnlageOptionen {
  if (!input || typeof input !== "object" || Array.isArray(input)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(input))
    || Object.keys(input).some(key => !(ANLAGE_OPTION_KEYS as readonly string[]).includes(key))
    || !ANLAGE_ARTEN.some(art => art === input.anlage)) fail("option", "optionen.anlage", "burg oder schloss erwartet");
  const art = input.anlage!, result = { ...ANLAGE_STANDARD[art], ...input };
  if (art === "burg" && "symmetrie" in input || art === "schloss" && "graben" in input)
    fail("option", "optionen", "Die Einstellung gehört nicht zu dieser Anlage");
  const integer = (value: number, min: number, max: number, path: string) => {
    if (!Number.isSafeInteger(value) || value < min || value > max) fail("option", `optionen.${path}`, `Ganzzahl in ${min}..${max} erwartet`);
  };
  if (!Array.isArray(result.ausdehnung) || result.ausdehnung.length !== 2) fail("option", "optionen.ausdehnung", "Zwei Abmessungen erwartet");
  const [w, h] = result.ausdehnung;
  integer(w, 32, 128, "ausdehnung[0]"); integer(h, 28, 128, "ausdehnung[1]");
  integer(result.zellgroesse, KARTENWERK_LIMITS.zellgroesseMin, KARTENWERK_LIMITS.zellgroesseMax, "zellgroesse");
  integer(result.bauwerke, ANLAGE_GEBAEUDE[art].min, ANLAGE_GEBAEUDE[art].max, "bauwerke");
  if (w * h * result.zellgroesse ** 2 > 144_000_000 || Math.max(w, h) * result.zellgroesse > KARTENWERK_LIMITS.kantePixelMax)
    fail("budget", "optionen.ausdehnung", "Kartenbudget überschritten");
  for (const name of ["relief", "bewaldung", ...(art === "schloss" ? ["symmetrie"] as const : [])] as const) {
    const n = result[name]; if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1) fail("option", `optionen.${name}`, "Zahl in 0..1 erwartet");
  }
  if (typeof result.licht !== "boolean" || art === "burg" && typeof result.graben !== "boolean") fail("option", "optionen", "Boolean erwartet");
  if (!KARTEN_SETTINGS.includes(result.setting) || !RELIEF_STANDORTE.includes(result.standort)) fail("option", "optionen", "Setting oder Standort ungültig");
  return result;
}

type Footprint = readonly [number, number, number, number];
interface Building { key: string; title: string; type: BauwerkTyp; box: Footprint; door: Punkt }
const rectangle = ([x, y, x2, y2]: Footprint): Polygon => [[x, y], [x2, y], [x2, y2], [x, y2]];

export function erzeugeAnlage(auftrag: { keim: string; titel?: string; optionen: Partial<AnlageOptionen>; eltern?: GrundrissEltern }, paket: AssetpaketV1): Siedlung {
  if (typeof auftrag?.keim !== "string" || !auftrag.keim.trim() || auftrag.keim.length > 256) fail("option", "auftrag.keim", "Nichtleerer Keim mit höchstens 256 Zeichen erwartet");
  if (!paket?.assets?.length) fail("paket", "paket", "Ein lesbares Assetpaket wird benötigt");
  const o = anlageOptionen(auftrag.optionen), [w, h] = o.ausdehnung, z = o.zellgroesse, castle = o.anlage === "burg";
  const keim = weltkeim({ generator: ANLAGE_ERZEUGER, version: ANLAGE_VERSION, seed: auftrag.keim,
    optionen: { ...o, ausdehnung: [w, h], paket: { id: paket.id, version: paket.version, zellgroesse: paket.zellgroesse } } as unknown as Readonly<Record<string, CanonicalValue>> });
  const ids = idFabrik(ANLAGE_ERZEUGER, ANLAGE_VERSION, keim.keimHash);
  const pixel = (point: Punkt): Punkt => qp([point[0] * z, point[1] * z]);
  const scaled = (box: Footprint): Footprint => [box[0] * w, box[1] * h, box[2] * w, box[3] * h];
  const buildingSpecs: Building[] = [];
  const building = (key: string, title: string, type: BauwerkTyp, box: Footprint, side: "north" | "south" | "east" | "west") => {
    let [x, y, x2, y2] = scaled(box);
    if (castle && !key.startsWith("gate")) {
      const inset = Number.parseInt(canonicalHash(`${auftrag.keim}:${key}`).slice(0, 4), 16) / 65535 * .035;
      const dw = (x2 - x) * inset, dh = (y2 - y) * inset; x += dw; x2 -= dw; y += dh; y2 -= dh;
    }
    const door: Punkt = side === "north" ? [(x + x2) / 2, y] : side === "south" ? [(x + x2) / 2, y2] : side === "east" ? [x2, (y + y2) / 2] : [x, (y + y2) / 2];
    buildingSpecs.push({ key, title, type, box: [x, y, x2, y2], door });
  };
  if (castle) {
    building("north-west", "Nordwestturm", "turm", [.12, .12, .22, .22], "south");
    building("north-east", "Nordostturm", "turm", [.78, .12, .88, .22], "south");
    building("south-west", "Südwestturm", "turm", [.12, .78, .22, .88], "north");
    building("south-east", "Südostturm", "turm", [.78, .78, .88, .88], "north");
    building("gate-west", "Westliches Torhaus", "turm", [.39, .78, .47, .88], "north");
    building("gate-east", "Östliches Torhaus", "turm", [.53, .78, .61, .88], "north");
    building("keep", "Bergfried", "turm", [.41, .25, .59, .42], "south");
    building("chapel", "Burgkapelle", "kirche", [.25, .25, .34, .40], "south");
    building("hall", "Palas", "haus", [.65, .25, .75, .42], "south");
    building("barracks", "Wachhaus", "haus", [.25, .62, .37, .73], "north");
    building("smithy", "Burgschmiede", "schmiede", [.64, .62, .75, .73], "north");
    building("stable", "Vorratshaus", "lager", [.355, .27, .395, .44], "south");
  } else {
    const skew = (1 - (o.symmetrie ?? 1)) * (.03 + Number.parseInt(canonicalHash(auftrag.keim).slice(0, 4), 16) / 65535 * .07);
    building("main", "Hauptbau", "haus", [.28, .16, .72, .30], "south");
    building("west-wing", "Westflügel", "haus", [.22, .34, .34, .65], "east");
    building("east-wing", "Ostflügel", "haus", [.66, .34, .78, .65 + skew], "west");
    building("service-west", "Wirtschaftsgebäude", "lager", [.37, .73, .47, .84], "south");
    building("service-east", "Gästehaus", "haus", [.53, .73, .63, .84], "south");
    building("pavilion-west", "Westlicher Gartenpavillon", "haus", [.06, .20, .14, .28], "south");
    building("pavilion-east", "Östlicher Gartenpavillon", "haus", [.86, .20, .94, .28], "south");
  }
  const selected = buildingSpecs.slice(0, o.bauwerke);
  const geometry: { id: string; punkte: Polygon }[] = [], roles: CartographyRegionV1[] = [];
  const common = (regionId: string) => ({ regionId, authored: false, locked: false, provenance: keim });
  const add = (key: string, polygon: Polygon, role: CartographyRegionV1) => { geometry.push({ id: key, punkte: polygon.map(pixel) }); roles.push(role); };
  const terrain = (key: string, polygon: Polygon, material: "grass" | "earth" | "forest" | "field" | "rock" | "sand" | "swamp") => {
    const id = ids.geometrieId("terrain", key); add(id, polygon, { ...common(id), role: "terrain", material });
  };
  terrain("base", rectangle([0, 0, w, h]), "grass");
  const land = erzeugeLandschaft({ breite: w, hoehe: h, standort: o.standort, keimHash: keim.keimHash,
    relief: o.relief, bewaldung: o.bewaldung, kern: { x: w / 2, y: h / 2, rx: w * .47, ry: h * .47 },
    ...(o.standort === "fluss" ? { flussAchse: [[w * .045, 0], [w * .04, h / 2], [w * .05, h]] as Punkt[], flussBreite: w * .04 } : {}) });
  // The terraced foundation and the approach are reserved. Clip natural features around
  // them, rather than covering water with roofs or pretending an island needs no causeway.
  const outer: Polygon[] = [rectangle([0, 0, w, h * .07]), rectangle([0, h * .07, w * .04, h]),
    rectangle([w * .96, h * .07, w, h]), rectangle([w * .04, h * .92, w * .48, h]), rectangle([w * .52, h * .92, w * .96, h])];
  for (const [material, polygons] of [["rock", land.fels], ["sand", land.strand], ["swamp", land.sumpf], ["forest", land.wald]] as const) {
    polygons.forEach((poly, i) => outer.forEach((clip, j) => { const piece = schnittKonvex(poly, clip); if (piece.length >= 3 && flaeche(piece) > .01) terrain(`${material}:${i}:${j}`, piece, material); }));
  }
  const water = (key: string, polygon: Polygon, material: "lake" | "sea" | "river") => { const id = ids.geometrieId("water", key); add(id, polygon, { ...common(id), role: "water", material }); };
  [...land.wasser.map(polygon => ({ polygon, material: land.wasserMaterial })), ...land.fluesse.map(row => ({ polygon: row.polygon, material: "river" as const }))]
    .forEach((row, i) => outer.forEach((clip, j) => { const piece = schnittKonvex(row.polygon, clip); if (piece.length >= 3 && flaeche(piece) > .01) water(`outer:${i}:${j}`, piece, row.material); }));
  if (castle && o.graben) for (const [i, box] of [[.07, .07, .93, .105], [.07, .895, .93, .93], [.07, .105, .105, .895], [.895, .105, .93, .895]].entries()) water(`moat:${i}`, rectangle(scaled(box as unknown as Footprint)), "lake");
  const roads: SiedlungStrasse[] = [];
  const road = (key: string, a: Punkt, b: Punkt, material: "street" | "path" | "square" | "bridge" = "street", width = .018 * Math.min(w, h)) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], distance = Math.hypot(dx, dy);
    if (distance < .001) return "";
    const nx = -dy / distance * width / 2, ny = dx / distance * width / 2;
    const polygon = [qp([a[0] + nx, a[1] + ny]), qp([a[0] - nx, a[1] - ny]), qp([b[0] - nx, b[1] - ny]), qp([b[0] + nx, b[1] + ny])];
    const id = ids.geometrieId("road", key); add(id, polygon, { ...common(id), role: "road", material }); roads.push({ id, art: "hauptstrasse", umriss: polygon }); return id;
  };
  const crossY = h * (castle ? .55 : .88);
  const plazaId = ids.geometrieId("road", "court"), plaza = rectangle(scaled(castle ? [.36, .45, .64, .60] : [.38, .35, .62, .66]));
  add(plazaId, plaza, { ...common(plazaId), role: "road", material: "square" }); roads.push({ id: plazaId, art: "hauptstrasse", umriss: plaza });
  road("axis", [w / 2, castle ? h * .42 : h * .30], [w / 2, h]);
  road("cross", [w * (castle ? .17 : .1), crossY], [w * (castle ? .83 : .9), crossY]);
  if (castle && o.graben) road("drawbridge", [w / 2, h * .89], [w / 2, h * .94], "bridge", w * .025);
  if (!castle) {
    for (const left of [.055, .825]) for (const row of [0, 1, 2]) {
      terrain(`parterre:${left}:${row}`, rectangle(scaled([left, .34 + row * .13, left + .12, .43 + row * .13])), "field");
    }
    road("garden-west", [w * .10, h * .28], [w * .10, h * .78], "path");
    road("garden-east", [w * .90, h * .28], [w * .90, h * .78], "path");
  }
  const bauwerke: SiedlungBauwerk[] = selected.map(b => {
    // Wings face the central axis; all other buildings connect to the cross street.
    const sideways = b.key.endsWith("wing");
    const target: Punkt = sideways ? [w / 2, b.door[1]] : [b.door[0], crossY];
    const street = road(`access:${b.key}`, b.door, target);
    const id = ids.knotenId("building", b.key), umriss = rectangle(b.box);
    add(id, umriss, { ...common(id), role: "building", streetRegionId: street || plazaId });
    return { id, pfad: b.key, titel: b.title, typ: b.type, umriss, strasse: street || plazaId };
  });
  const walls: TacticalWall[] = [], portals: TacticalPortal[] = [];
  if (castle) {
    const pairs: readonly (readonly [Punkt, Punkt])[] = [[[.12, .12], [.88, .12]], [[.12, .12], [.12, .88]], [[.88, .12], [.88, .88]], [[.12, .88], [.47, .88]], [[.53, .88], [.88, .88]]];
    pairs.forEach(([a, b], i) => walls.push({ id: ids.geometrieId("wall", `${i}`), kind: "wall", elevation: 0, points: [pixel([a[0] * w, a[1] * h]), pixel([b[0] * w, b[1] * h])] }));
    portals.push({ id: ids.geometrieId("portal", "gate"), position: pixel([w / 2, .88 * h]), bounds: [pixel([.47 * w, .88 * h]), pixel([.53 * w, .88 * h])], rotationRadians: 0, closed: false, freestanding: false, elevation: 0 });
  }
  const lights: TacticalLight[] = o.licht ? selected.map(b => ({ id: ids.geometrieId("light", b.key), position: pixel(b.door), range: 2 * z,
    intensity: .7, colorArgb: o.setting === "fantasy" ? "ffddaa55" : "ffbad9ee", shadows: true, elevation: 0 })) : [];
  const karte = parseTacticalMapDocument({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
    frame: { ursprung: [0, 0], einheitenProPixel: 1 / z, ordnung: "xy", hoch: "unten" },
    geometry: { v: 3, size: [w * z, h * z], stamps: [], regions: geometry, places: [] },
    grid: { kind: "square", size: z, origin: [0, 0] }, elevation: 0, geometryElevation: [], walls: sortiereNachId(walls), portals, lights: sortiereNachId(lights),
    environment: { bakedLighting: false, ambientLightArgb: "ffd9cba0" }, background: null });
  const heights = land.relief.heights.map((value, i) => { const x = i % land.relief.columns, y = Math.floor(i / land.relief.columns);
    return x >= .04 * w && x <= .96 * w && y >= .07 * h && y <= .92 * h || x >= .48 * w && x <= .52 * w && y >= .92 * h ? 116 : value; });
  const cartography = parseTacticalCartography({ schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: z, origin: [0, 0] }, regions: roles,
    relief: { ...land.relief, heights } }, karte);
  const wurzelId = ids.knotenId("compound"), provenance = (key: string) => ({ erzeuger: ANLAGE_ERZEUGER, version: ANLAGE_VERSION, keimHash: keim.keimHash, erzeugungspfad: [key], kindKeim: ids.kindKeim(key) });
  const knoten: Knoten[] = [{ id: wurzelId, art: "ort", titel: auftrag.titel ?? ANLAGE_LABEL[o.anlage], rahmen: karte.frame,
    eltern: auftrag.eltern ? [{ von: wurzelId, nach: auftrag.eltern.knotenId, art: auftrag.eltern.art }] : [],
    anker: auftrag.eltern ? { in: auftrag.eltern.knotenId, bei: auftrag.eltern.bei, massstab: auftrag.eltern.massstab } : null, herkunft: provenance("compound"), sichtAnker: null },
    ...bauwerke.map(b => ({ id: b.id, art: "bauwerk" as const, titel: b.titel, bauwerk: { typ: b.typ, beschreibung: "" }, rahmen: karte.frame,
      eltern: [{ von: b.id, nach: wurzelId, art: "liegt_in_geografie" as const }], anker: { in: wurzelId, bei: pixel(schwerpunkt(b.umriss)), massstab: 1 }, herkunft: provenance(b.pfad), sichtAnker: null }))];
  return { art: "siedlung", erzeuger: ANLAGE_ERZEUGER, version: ANLAGE_VERSION, keim, wurzelId, karte, cartography, knoten, bauwerke, strassen: roads,
    bericht: { bauwerke: bauwerke.length, angefordert: o.bauwerke, strassen: roads.length, strassenzellen: roads.reduce((sum, r) => sum + flaeche(r.umriss), 0), hofzellen: flaeche(plaza), stamps: 0, stampsNachArt: {},
      paket: { id: paket.id, version: paket.version, assets: paket.assets.length }, nichtBedient: [],
      ausgelassen: ["Gebäudeinnenräume werden beim Betreten über die vorhandenen Gebäudeprofile erzeugt.", "Keine mehrgeschossige Burg- oder Schlossinnenraumplanung; die Baufläche ist eine trockene Terrasse."] } };
}
