// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { GrundrissOptionen, HoehleOptionen, SiedlungOptionen } from "@chronicle/forge";
import { TACTICAL_MAP_LIMITS, type BauwerkTyp, type KartenSetting, type TacticalMapDocumentV1 } from "@chronicle/szene";
import type { ProjectedMapScene } from "@chronicle/render";

export type MapArt = "siedlung" | "grundriss" | "hoehle";
export type MapStyle = "grundriss" | "gemalt" | "zeitwelten";
export interface GenerationDefaults {
  grundriss: GrundrissOptionen; hoehle: HoehleOptionen; siedlung: SiedlungOptionen;
  siedlungsarten?: Readonly<Record<SiedlungOptionen["art"], SiedlungOptionen>>;
}
export interface MapNode {
  knotenId: string; titel: string; art: string; x: number; y: number;
  bauwerk?: { typ: BauwerkTyp; beschreibung: string };
}
export interface GenerationSettings {
  art: MapArt; stil: MapStyle; breite: number | ""; hoehe: number | ""; anzahl: number | "";
  setting: KartenSetting;
  siedlung: SiedlungOptionen["art"]; dichte: number; profil: "frei" | BauwerkTyp;
  anordnung: GrundrissOptionen["anordnung"]; moeblierung: number; licht: boolean;
}
export function generationSettings(art: MapArt = "siedlung", profil: "frei" | BauwerkTyp = "frei", stil: MapStyle = "gemalt", setting: KartenSetting = "fantasy"): GenerationSettings {
  return { art, stil, setting, breite: "", hoehe: "", anzahl: "", siedlung: "dorf", dichte: .3, profil, anordnung: "streuung", moeblierung: 1, licht: true };
}
export function changeGenerationSetting(value: GenerationSettings, setting: KartenSetting): GenerationSettings {
  return { ...value, setting, stil: setting === "fantasy" ? "gemalt" : "zeitwelten" };
}
export function generationDimensions(value: GenerationSettings, defaults: GenerationDefaults): readonly [number, number] {
  const std = value.art === "siedlung" ? (defaults.siedlungsarten?.[value.siedlung] ?? defaults.siedlung).ausdehnung : defaults[value.art].zellen;
  return [value.breite === "" ? std[0] : value.breite, value.hoehe === "" ? std[1] : value.hoehe];
}
export function generationOptions(value: GenerationSettings, defaults: GenerationDefaults) {
  const dimensions = value.breite !== "" || value.hoehe !== "" ? generationDimensions(value, defaults) : undefined;
  if (value.art === "siedlung") return { art: value.siedlung, setting: value.setting, ...(dimensions ? { ausdehnung: dimensions } : {}),
    ...(value.anzahl !== "" ? { bauwerke: value.anzahl } : {}), strassenDichte: value.dichte, licht: value.licht };
  return { ...(dimensions ? { zellen: dimensions } : {}),
    ...(value.anzahl !== "" ? value.art === "hoehle" ? { kammern: value.anzahl } : { raeume: value.anzahl } : {}),
    ...(value.art === "grundriss" ? { profil: value.profil, anordnung: value.anordnung, setting: value.setting } : {}),
    moeblierung: value.moeblierung, licht: value.licht };
}
export function generationError(value: GenerationSettings, defaults: GenerationDefaults): string | null {
  const [w, h] = generationDimensions(value, defaults);
  if (![w, h].every(n => Number.isSafeInteger(n) && n >= 12 && n <= 192)) return "Breite und Höhe müssen ganze Zahlen zwischen 12 und 192 sein.";
  if (w * h > 20_000) return "Die Karte darf höchstens 20.000 Zellen enthalten. Verringere Breite oder Höhe.";
  const z = value.art === "siedlung" ? (defaults.siedlungsarten?.[value.siedlung] ?? defaults.siedlung).zellgroesse : defaults[value.art].zellgroesse;
  if (w * z > TACTICAL_MAP_LIMITS.dimension || h * z > TACTICAL_MAP_LIMITS.dimension || w * h * z * z > TACTICAL_MAP_LIMITS.pixels) return "Diese Größe überschreitet das Kartenbudget. Wähle eine kleinere Fläche.";
  const min = value.art === "siedlung" ? 1 : 2, max = value.art === "siedlung" ? 256 : value.art === "hoehle" ? 32 : 64;
  if (value.anzahl !== "" && (!Number.isSafeInteger(value.anzahl) || value.anzahl < min || value.anzahl > max)) return `Die Anzahl muss zwischen ${min} und ${max} liegen.`;
  return null;
}
export const BUILDING_COLORS: Record<BauwerkTyp, number> = {
  haus: 0xae7960, kirche: 0xb0bbc6, taverne: 0xd6a34f, schmiede: 0x927b83, lager: 0x8f9d78, turm: 0x819cad,
  wohnblock: 0xb8a28b, buero: 0x869fae, cafe: 0xc39c70, restaurant: 0xc28b72, supermarkt: 0x9cae80,
  krankenhaus: 0xc2d7d3, polizei: 0x7b9dbb, feuerwache: 0xb87c73, schule: 0xcbba85, hotel: 0xb9a3b6,
  fabrik: 0x8d969b, bahnhof: 0xa5a59a, labor: 0x85b8b3, raumhafen: 0x8ba1b6, raumstation: 0x9cabc6,
  medstation: 0x9bccc8, kommando: 0x7d9fad, reaktor: 0x87baab, bibliothek: 0xb59b83, museum: 0xc1baa9,
  bank: 0xa5b398, werkstatt: 0xb0a28b,
};
/** Only already-authorized nodes and geometry enter this presentation adapter. */
export function mapDocumentScene(id: string, document: TacticalMapDocumentV1, nodes: readonly MapNode[], art?: string, rasterScope?: string, setting: KartenSetting = "fantasy"): ProjectedMapScene {
  const byId = new Map(nodes.map(node => [node.knotenId, node]));
  const city = art === "siedlung" || nodes.some(node => node.art === "bauwerk");
  return {
    id, width: document.geometry.size[0], height: document.geometry.size[1], ...(rasterScope ? { rasterScope } : {}),
    cells: document.geometry.regions.map(region => {
      const node = byId.get(region.id), building = node?.art === "bauwerk";
      return { id: region.id, polygon: region.punkte,
        fill: building ? BUILDING_COLORS[node.bauwerk?.typ ?? "haus"] : city ? setting === "fantasy" ? 0xbfae8c : setting === "scifi" ? 0x46545c : 0x64696a : 0x596f66,
        ...(city ? { surface: building ? "building" as const : "street" as const } : {}),
        ...(building ? { roof: setting === "fantasy" ? "pitched" as const : setting === "scifi" ? "tech" as const : "flat" as const } : {}) };
    }),
    pins: nodes.map(node => ({ id: node.knotenId, x: node.x, y: node.y, label: node.titel,
      ...(node.bauwerk ? { color: BUILDING_COLORS[node.bauwerk.typ] } : {}) })),
    lines: document.walls.map(wall => ({ id: wall.id, points: wall.points })), grid: document.grid,
    stamps: document.geometry.stamps.map(stamp => ({ id: stamp.id, asset: stamp.a, x: stamp.x, y: stamp.y, s: stamp.s, r: stamp.r, l: stamp.l, ...(stamp.t !== undefined ? { t: stamp.t } : {}) })),
  };
}
