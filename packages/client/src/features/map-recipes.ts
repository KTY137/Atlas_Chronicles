// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseSettlementPlan, BAUWERK_TYPEN, KARTEN_SETTINGS, parseBoundedMapJson } from "@chronicle/szene";
import { generationDimensions, generationError, type GenerationDefaults, type GenerationSettings } from "./map-generation";
import { t } from "../i18n";

/** A portable recipe, not a second map format. No map geometry, campaign secrets, URLs or
 * account data are stored. Import never generates or overwrites a map. */
export interface MapRecipe {
  schemaVersion: 1;
  kind: "atlas-map-recipe";
  name: string;
  seed: string;
  settings: GenerationSettings;
  /** Read back from the actual preview, never invented by the browser. A changed server
   * version/pack produces a different hash and is surfaced before the user commits. */
  referenceHash: string;
  generator: { id: string; version: string };
}
const KEYS = ["art", "stil", "breite", "hoehe", "anzahl", "setting", "siedlung", "standort", "dichte", "profil", "relief", "bewaldung", "anordnung", "moeblierung", "licht"];
const OPTIONAL = ["anlage", "graben", "symmetrie", "planung"];
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const bounded = (value: unknown, max: number): value is string => typeof value === "string" && !!value.trim() && value.length <= max && !/[\u0000-\u001f\u007f]/u.test(value);
const oneOf = (value: unknown, choices: readonly string[]) => typeof value === "string" && choices.includes(value);
function invalid(): never { throw new Error(t("Die Kartenvorlage ist ungültig oder verwendet eine neuere Fassung.")); }
export function parseMapRecipe(source: string, defaults: GenerationDefaults): MapRecipe {
  if (new TextEncoder().encode(source).length > 64 * 1024) invalid();
  let parsed: unknown;
  try { parsed = parseBoundedMapJson(source, 64 * 1024); } catch { invalid(); }
  if (!plain(parsed) || Object.keys(parsed).sort().join(",") !== ["schemaVersion", "kind", "name", "seed", "settings", "referenceHash", "generator"].sort().join(",")
    || parsed.schemaVersion !== 1 || parsed.kind !== "atlas-map-recipe" || !bounded(parsed.name, 160) || !bounded(parsed.seed, 256)
    || typeof parsed.referenceHash !== "string" || !/^[a-f0-9]{64}$/.test(parsed.referenceHash)) invalid();
  if (!plain(parsed.generator) || Object.keys(parsed.generator).sort().join(",") !== "id,version" || !bounded(parsed.generator.id, 128) || !bounded(parsed.generator.version, 64)) invalid();
  const s = parsed.settings;
  if (!plain(s) || KEYS.some(key => !Object.hasOwn(s, key)) || Object.keys(s).some(key => !KEYS.includes(key) && !OPTIONAL.includes(key))) invalid();
  if (!oneOf(s.art, ["siedlung", "grundriss", "hoehle", "region"]) || !oneOf(s.stil, ["grundriss", "gemalt", "zeitwelten", "genres"])
    || !oneOf(s.setting, KARTEN_SETTINGS) || !oneOf(s.siedlung, ["weiler", "dorf", "stadt"]) || !oneOf(s.profil, ["frei", ...BAUWERK_TYPEN])
    || !oneOf(s.standort, ["ebene", "huegel", "wald", "gebirge", "fluss", "see", "moor", "kueste", "insel"])
    || !oneOf(s.anordnung, ["raster", "streuung", "kachelwerk"]) || typeof s.licht !== "boolean") invalid();
  for (const key of ["dichte", "relief", "bewaldung", "moeblierung"]) if (typeof s[key] !== "number" || !Number.isFinite(s[key]) || s[key] < 0 || s[key] > 1) invalid();
  for (const key of ["breite", "hoehe", "anzahl"]) if (!Number.isSafeInteger(s[key])) invalid();
  if ("anlage" in s && (!oneOf(s.anlage, ["burg", "schloss"]) || s.art !== "siedlung")) invalid();
  if ("graben" in s && (s.anlage !== "burg" || typeof s.graben !== "boolean")) invalid();
  if ("symmetrie" in s && (s.anlage !== "schloss" || typeof s.symmetrie !== "number" || !Number.isFinite(s.symmetrie) || s.symmetrie < 0 || s.symmetrie > 1)) invalid();
  if ("planung" in s) {
    if (s.art !== "siedlung" || "anlage" in s) invalid();
    try { s.planung = parseSettlementPlan(s.planung); } catch { invalid(); }
  }
  const settings = s as unknown as GenerationSettings, problem = generationError(settings, defaults);
  if (problem) throw new Error(problem);
  return { schemaVersion: 1, kind: "atlas-map-recipe", name: parsed.name.trim(), seed: parsed.seed.trim(), settings: { ...settings }, referenceHash: parsed.referenceHash, generator: { id: parsed.generator.id, version: parsed.generator.version } };
}
export function makeMapRecipe(name: string, seed: string, settings: GenerationSettings, referenceHash: string, defaults: GenerationDefaults, generator: MapRecipe["generator"]): MapRecipe {
  const [breite, hoehe] = generationDimensions(settings, defaults);
  const count = settings.art === "siedlung" ? (settings.anlage ? defaults.anlagen?.[settings.anlage]?.bauwerke : defaults.siedlungsarten?.[settings.siedlung]?.bauwerke ?? defaults.siedlung.bauwerke)
    : settings.art === "region" ? defaults.region?.orte ?? 12 : settings.art === "hoehle" ? defaults.hoehle.kammern : defaults.grundriss.raeume;
  return parseMapRecipe(JSON.stringify({ schemaVersion: 1, kind: "atlas-map-recipe", name, seed, referenceHash, generator,
    settings: { ...settings, breite, hoehe, anzahl: settings.anzahl === "" ? count : settings.anzahl } }), defaults);
}
export const serializeMapRecipe = (recipe: MapRecipe) => JSON.stringify(recipe, null, 2) + "\n";
