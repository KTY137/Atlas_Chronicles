// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { AnlageArt, AnlageOptionen, GrundrissOptionen, HoehleOptionen, RegionOptionen, SiedlungOptionen, SiedlungStandort } from "@chronicle/forge";
import { parseRoadPlan, type RoadPlan, parseSettlementPlan, type SettlementPlan, cartographyDraw, createCartographyDraw, cartographyPaintsWalls, TACTICAL_MAP_LIMITS, type BauwerkTyp, type CartographyView, type KartenSetting, type TacticalCartographyV1, type TacticalLight, type TacticalMapDocumentV1 } from "@chronicle/szene";
import type { ProjectedMapScene } from "@chronicle/render";
import { t } from "../i18n";

export type MapArt = "siedlung" | "grundriss" | "hoehle" | "region";
export type MapStyle = "grundriss" | "gemalt" | "zeitwelten" | "genres";
export interface GenerationDefaults {
  strassenplanung?: 1;
  siedlungsplanung?: 1;
  grundriss: GrundrissOptionen; hoehle: HoehleOptionen; siedlung: SiedlungOptionen;
  /** The land above the towns; an older server has no such defaults and the card stays hidden. */
  region?: RegionOptionen;
  siedlungsarten?: Readonly<Record<SiedlungOptionen["art"], SiedlungOptionen>>;
  /** Dieselben Vorgaben je Setting; eine Fantasy-Stadt aus Vierteln baut dichter als eine der Gegenwart. */
  siedlungsartenJeSetting?: Readonly<Partial<Record<KartenSetting, Readonly<Record<SiedlungOptionen["art"], SiedlungOptionen>>>>>;
  /** Default interior extent per building type, in cells; the server sizes a typed interior by it. */
  anlagen?: Readonly<Partial<Record<AnlageArt, AnlageOptionen>>>;
  gebaeude?: Readonly<Partial<Record<BauwerkTyp, readonly [number, number]>>>;
}
export interface MapNode {
  knotenId: string; titel: string; art: string; x: number; y: number;
  bauwerk?: { typ: BauwerkTyp; beschreibung: string };
  vorhandeneKarteId?: string | null;
}
export interface GenerationSettings {
  verkehr?: RoadPlan;
  planung?: SettlementPlan;
  art: MapArt; stil: MapStyle; breite: number | ""; hoehe: number | ""; anzahl: number | "";
  setting: KartenSetting;
  anlage?: AnlageArt; graben?: boolean; symmetrie?: number;
  siedlung: SiedlungOptionen["art"]; standort: SiedlungStandort; dichte: number; profil: "frei" | BauwerkTyp;
  /** 0..1 each: how mountainous the land is and how much of it carries woodland. */
  relief: number; bewaldung: number;
  /** Nur Fantasy-Siedlungen; fehlt der Wert, gilt die Vorgabe der Ortsart (Stadt: ja). */
  mauer?: boolean; burg?: boolean;
  anordnung: GrundrissOptionen["anordnung"]; moeblierung: number; licht: boolean;
}
export function generationSettings(art: MapArt = "siedlung", profil: "frei" | BauwerkTyp = "frei", stil: MapStyle = "gemalt", setting: KartenSetting = "fantasy"): GenerationSettings {
  return { art, stil, setting, breite: "", hoehe: "", anzahl: "", siedlung: "dorf", standort: "fluss", dichte: .3, relief: .5, bewaldung: .5, profil, anordnung: "streuung", moeblierung: 1, licht: true };
}
/** Die Vorgaben einer Ortsart für ein Setting; ältere Server kennen nur die Fantasy-Vorgaben. */
export function siedlungsVorgabe(defaults: GenerationDefaults, art: SiedlungOptionen["art"], setting: KartenSetting): SiedlungOptionen {
  return defaults.siedlungsartenJeSetting?.[setting]?.[art] ?? defaults.siedlungsarten?.[art] ?? defaults.siedlung;
}
export function changeGenerationSetting(value: GenerationSettings, setting: KartenSetting): GenerationSettings {
  // Mauer und Burg gehören zum Setting: eine abgewählte Stadtmauer ist kein abgewählter Schutzzaun.
  const { mauer: _mauer, burg: _burg, ...rest } = value;
  return { ...(setting === value.setting ? value : rest), setting, stil: setting === "fantasy" ? "gemalt" : "zeitwelten" };
}
export function generationDimensions(value: GenerationSettings, defaults: GenerationDefaults): readonly [number, number] {
  const std = value.art === "siedlung" && value.anlage && defaults.anlagen?.[value.anlage] ? defaults.anlagen[value.anlage]!.ausdehnung : value.art === "siedlung" ? siedlungsVorgabe(defaults, value.siedlung, value.setting).ausdehnung
    : value.art === "region" ? (defaults.region?.ausdehnung ?? [56, 42])
    : value.art === "grundriss" && value.profil !== "frei" && defaults.gebaeude?.[value.profil] ? defaults.gebaeude[value.profil]! : defaults[value.art].zellen;
  return [value.breite === "" ? std[0] : value.breite, value.hoehe === "" ? std[1] : value.hoehe];
}
export function generationOptions(value: GenerationSettings, defaults: GenerationDefaults) {
  const dimensions = value.breite !== "" || value.hoehe !== "" ? generationDimensions(value, defaults) : undefined;
  if (value.art === "siedlung" && value.anlage) return { anlage: value.anlage, standort: value.standort, setting: value.setting,
    ...(dimensions ? { ausdehnung: dimensions } : {}), ...(value.anzahl !== "" ? { bauwerke: value.anzahl } : {}),
    relief: value.relief, bewaldung: value.bewaldung, licht: value.licht,
    ...(value.anlage === "burg" ? { graben: value.graben ?? false } : { symmetrie: value.symmetrie ?? 1 }) };
  if (value.art === "siedlung") return { ...(value.verkehr?.knoten.length ? { verkehr: value.verkehr } : {}), ...(value.planung?.zonen.length ? { planung: value.planung } : {}), art: value.siedlung, standort: value.standort, setting: value.setting, ...(dimensions ? { ausdehnung: dimensions } : {}),
    ...(value.anzahl !== "" ? { bauwerke: value.anzahl } : {}), strassenDichte: value.dichte, relief: value.relief, bewaldung: value.bewaldung, licht: value.licht,
    ...(value.setting !== "gegenwart" && value.mauer !== undefined ? { mauer: value.mauer } : {}), ...(value.setting === "fantasy" && value.burg !== undefined ? { burg: value.burg } : {}) };
  if (value.art === "region") return { standort: value.standort, setting: value.setting, ...(dimensions ? { ausdehnung: dimensions } : {}), ...(value.anzahl !== "" ? { orte: value.anzahl } : {}), relief: value.relief, bewaldung: value.bewaldung };
  return { ...(dimensions ? { zellen: dimensions } : {}),
    ...(value.anzahl !== "" ? value.art === "hoehle" ? { kammern: value.anzahl } : { raeume: value.anzahl } : {}),
    ...(value.art === "grundriss" ? { profil: value.profil, anordnung: value.anordnung, setting: value.setting } : {}),
    moeblierung: value.moeblierung, licht: value.licht };
}
export function generationError(value: GenerationSettings, defaults: GenerationDefaults): string | null {
  const [w, h] = generationDimensions(value, defaults);
  if (value.verkehr !== undefined) {
    if (value.art !== "siedlung" || value.anlage || defaults.strassenplanung !== 1) return t("Dieser Kartentyp oder Server unterstützt keine Straßenpläne.");
    try { parseRoadPlan(value.verkehr); } catch { return t("Der Straßenplan ist ungültig. Prüfe Wegpunkte, Verbindungen und Höhenwechsel."); }
  }
  if (value.planung !== undefined) {
    if (value.art !== "siedlung" || value.anlage || defaults.siedlungsplanung !== 1) return t("Dieser Kartentyp oder Server unterstützt keine Siedlungszonen.");
    try { parseSettlementPlan(value.planung); } catch { return t("Der Zonenplan ist ungültig. Prüfe die Flächen und ihre Einstellungen."); }
  }
  if (value.art === "siedlung" && value.anlage) {
    if (!defaults.anlagen?.[value.anlage]) return t("Dieser Server unterstützt die gewählte Anlage noch nicht.");
    if (w < 32 || h < 28 || w > 128 || h > 128) return t("Anlagen benötigen 32–128 Zellen Breite und 28–128 Zellen Höhe.");
    const [min, max] = value.anlage === "burg" ? [7, 12] : [3, 7];
    if (value.anzahl !== "" && (!Number.isSafeInteger(value.anzahl) || value.anzahl < min! || value.anzahl > max!)) return t("Die Anzahl muss zwischen {min} und {max} liegen.", { min, max });
    if (value.anlage === "schloss" && value.symmetrie !== undefined && (!Number.isFinite(value.symmetrie) || value.symmetrie < 0 || value.symmetrie > 1)) return t("Die Symmetrie muss zwischen 0 und 1 liegen.");
  }
  if (![w, h].every(n => Number.isSafeInteger(n) && n >= 12 && n <= 192)) return t("Breite und Höhe müssen ganze Zahlen zwischen 12 und 192 sein.");
  if (w * h > 20_000) return t("Die Karte darf höchstens 20.000 Zellen enthalten. Verringere Breite oder Höhe.");
  const z = value.art === "siedlung" && value.anlage && defaults.anlagen?.[value.anlage] ? defaults.anlagen[value.anlage]!.zellgroesse : value.art === "siedlung" ? siedlungsVorgabe(defaults, value.siedlung, value.setting).zellgroesse : value.art === "region" ? (defaults.region?.zellgroesse ?? 112) : defaults[value.art].zellgroesse;
  if (w * z > TACTICAL_MAP_LIMITS.dimension || h * z > TACTICAL_MAP_LIMITS.dimension || w * h * z * z > TACTICAL_MAP_LIMITS.pixels) return t("Diese Größe überschreitet das Kartenbudget. Wähle eine kleinere Fläche.");
  const min = value.art === "siedlung" || value.art === "region" ? 1 : 2, max = value.art === "siedlung" ? 1024 : value.art === "region" ? 24 : value.art === "hoehle" ? 32 : 64;
  if (value.anzahl !== "" && (!Number.isSafeInteger(value.anzahl) || value.anzahl < min || value.anzahl > max)) return t("Die Anzahl muss zwischen {min} und {max} liegen.", { min, max });
  return null;
}
export const BUILDING_COLORS: Record<BauwerkTyp, number> = {
  haus: 0xae7960, kirche: 0xb0bbc6, taverne: 0xd6a34f, schmiede: 0x927b83, lager: 0x8f9d78, turm: 0x819cad,
  wohnblock: 0xb8a28b, buero: 0x869fae, cafe: 0xc39c70, restaurant: 0xc28b72, supermarkt: 0x9cae80,
  krankenhaus: 0xc2d7d3, polizei: 0x7b9dbb, feuerwache: 0xb87c73, schule: 0xcbba85, hotel: 0xb9a3b6,
  fabrik: 0x8d969b, bahnhof: 0xa5a59a, labor: 0x85b8b3, raumhafen: 0x8ba1b6, raumstation: 0x9cabc6,
  medstation: 0x9bccc8, kommando: 0x7d9fad, reaktor: 0x87baab, bibliothek: 0xb59b83, museum: 0xc1baa9,
  bank: 0xa5b398, werkstatt: 0xb0a28b,
  burg: 0x8c93a0, rathaus: 0xc9a86a, muehle: 0xb49a6e, bauernhof: 0xa98a5e, kaserne: 0x8e8a7c,
};
/** A stored light as the picture shows it; the colour is the stored ARGB minus its alpha. */
export const lightsToScene = (lights: readonly TacticalLight[]) => lights.map(light => ({ id: light.id, x: light.position[0], y: light.position[1], range: light.range, intensity: Math.max(0, Math.min(1, light.intensity)), color: Number.parseInt(light.colorArgb.slice(-6), 16) }));
/** Only already-authorized nodes and geometry enter this presentation adapter. */
function sceneProjector(draw: typeof cartographyDraw) {
  return function (id: string, document: TacticalMapDocumentV1, nodes: readonly MapNode[], art?: string, rasterScope?: string, setting: KartenSetting = "fantasy", cartography?: TacticalCartographyV1, view: CartographyView = {}): ProjectedMapScene {
    const byId = new Map(nodes.map(node => [node.knotenId, node]));
    const roles = new Map(cartography?.regions.map(region => [region.regionId, region]));
    const polygons = new Map(document.geometry.regions.map(region => [region.id, region.punkte]));
    // Eligibility scans every region and wall; do it once, not once for every wall on the map.
    const paintWalls = !!cartography && document.walls.length > 0 && cartographyPaintsWalls(cartography, document);
    return {
      id, width: document.geometry.size[0], height: document.geometry.size[1], ...(rasterScope ? { rasterScope } : {}),
      ...(cartography ? { drawing: draw(document, cartography, setting, view) } : {}),
      cells: document.geometry.regions.map(region => {
        const node = byId.get(region.id), role = roles.get(region.id), building = role ? role.role === "building" : node?.art === "bauwerk", street = role?.role === "road";
        return { id: region.id, polygon: region.punkte,
          ...(node ? { label: node.titel } : {}),
          fill: building ? BUILDING_COLORS[node?.bauwerk?.typ ?? "haus"] : street ? setting === "fantasy" ? 0xbfae8c : setting === "scifi" ? 0x46545c : 0x64696a : 0x596f66,
          ...(building ? { surface: "building" as const } : street ? { surface: "street" as const } : {}),
          ...(building ? { roof: setting === "fantasy" ? "pitched" as const : setting === "scifi" ? "tech" as const : "flat" as const } : {}) };
      }),
      pins: nodes.map(node => {
        const polygon = polygons.get(node.knotenId), ordinary = node.bauwerk && ["haus", "wohnblock", "buero", "lager"].includes(node.bauwerk.typ);
        const span = polygon ? Math.max(...polygon.map(point => point[0])) - Math.min(...polygon.map(point => point[0])) : 32;
        return { id: node.knotenId, x: node.x, y: node.y, label: node.titel,
          ...(node.vorhandeneKarteId ? { icon: "portal" as const, showMarker: true } : node.art === "ort" ? { icon: "city" as const, showMarker: true } : node.art === "bauwerk" && polygon ? { showMarker: false } : {}),
          ...(node.bauwerk ? { color: BUILDING_COLORS[node.bauwerk.typ] } : {}), ...(ordinary ? { labelMinScale: 32 / Math.max(1, span) } : {}) };
      }),
      lines: [...document.walls.map(wall => ({ id: wall.id, points: wall.points, ...(paintWalls ? { paint: false } : {}) })),
        ...document.portals.map(portal => ({ id: portal.id, points: portal.bounds, color: portal.closed ? 0xb58a50 : 0x6faa98 }))], grid: document.grid,
      stamps: document.geometry.stamps.map(stamp => ({ id: stamp.id, asset: stamp.a, x: stamp.x, y: stamp.y, s: stamp.s, r: stamp.r, l: stamp.l, ...(stamp.t !== undefined ? { t: stamp.t } : {}) })),
      // The map's own light sources, as pools of warmth; the colour is the stored ARGB minus its alpha.
      lights: lightsToScene(document.lights ?? []),
      // The mood is painted into the drawing already; the renderer needs it for the lights and names.
      ...((view.mood ?? cartography?.mood) ? { mood: view.mood ?? cartography!.mood! } : {}),
      // Free names travel as they are stored: the line in map units, the letter height in map units.
      ...(cartography?.labels?.length ? { labels: cartography.labels } : {}),
    };
  };
}

export const mapDocumentScene = sceneProjector(cartographyDraw);
/** Keep one projector for the lifetime of an editor to reuse unchanged landscape artwork. */
export const createMapDocumentScene = () => sceneProjector(createCartographyDraw());
