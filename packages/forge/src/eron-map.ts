// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash, deriveKnotenId, textHash, type CanonicalValue, type KnotenId } from "@chronicle/core";
import { pruefeContainment, weltkeim, type Herkunft, type Kante, type Knoten, type Ort, type Rahmen } from "@chronicle/szene";
import { AzgaarImportError, type AzgaarImport } from "./azgaar.ts";

export const ERON_MAP_IMPORT_VERSION = "1";
export const MAX_ERON_MAP_BYTES = 8 * 1024 * 1024;
export type AtlasMarkerIcon = "place" | "city" | "castle" | "cave" | "ruin" | "portal";
/**
 * Die Fandom-Karte teilt die Gestalt des Azgaar-Imports, aber nicht seine Fassung: sie zählt
 * ihre eigene Adapterversion und war bis hierher stillschweigend an die des anderen Importers
 * gebunden. Der Versionssprung des Azgaar-Adapters hat das sichtbar gemacht — beide Zahlen
 * bezeichnen verschiedene Strukturen und dürfen sich nicht gegenseitig fortschreiben.
 */
export interface EronMapImport extends Omit<AzgaarImport, "quelle" | "adapterVersion"> {
  readonly adapterVersion: typeof ERON_MAP_IMPORT_VERSION;
  readonly quelle: { readonly format: "fandom-interactivemap"; readonly sha256: string; readonly bytes: number; readonly json: string };
}
export class EronMapImportError extends AzgaarImportError {
  constructor(path: string, message: string) { super("format", path, message); this.name = "EronMapImportError"; }
}
const fail = (path: string, message: string): never => { throw new EronMapImportError(path, message); };
function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail(path, "Objekt erwartet");
  return value as Record<string, unknown>;
}
function text(value: unknown, path: string, max = 512, empty = false): string {
  if (typeof value !== "string" || value.length > max || (!empty && !value.trim())) return fail(path, `Text mit höchstens ${max} Zeichen erwartet`);
  return value;
}
function list(value: unknown, path: string, max: number): readonly unknown[] {
  if (!Array.isArray(value) || value.length > max) return fail(path, `Liste mit höchstens ${max} Einträgen erwartet`);
  return value;
}
function point(value: unknown, path: string): readonly [number, number] {
  const row = list(value, path, 2);
  if (row.length !== 2 || row.some(v => typeof v !== "number" || !Number.isFinite(v))) return fail(path, "Zwei endliche Koordinaten erwartet");
  return [row[0] as number, row[1] as number];
}
function color(value: unknown, path: string, empty = false): string {
  const result = text(value, path, 7, empty);
  if (empty && !result) return "#ffffff";
  if (!/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(result)) return fail(path, "Hex-Farbe erwartet");
  return result.length === 4 ? `#${[...result.slice(1)].map(c => c + c).join("")}` : result.toLowerCase();
}
/** A presentation hint only. Original category symbols remain intact in the source and metadata. */
function markerIcon(title: string, category: string): AtlasMarkerIcon {
  if (/ruin/i.test(category)) return "ruin";
  if (/höhle|hoehle|grotte|mine|stollen/i.test(title)) return "cave";
  if (/burg|feste|fort\b|turm|schloss/i.test(title)) return "castle";
  return "city";
}

/** Pure import: source marker IDs, source coordinates and inert popup text survive unchanged. */
export function importiereEronKarte(json: string): EronMapImport {
  if (typeof json !== "string" || Buffer.byteLength(json, "utf8") > MAX_ERON_MAP_BYTES) return fail("$", "Kartendatei darf höchstens 8 MiB groß sein");
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return fail("$", "Ungültiges JSON"); }
  const pending: { value: unknown; depth: number }[] = [{ value: parsed, depth: 0 }];
  while (pending.length) {
    const current = pending.pop()!;
    if (current.depth > 32) return fail("$", "JSON ist zu tief verschachtelt");
    if (typeof current.value === "number" && !Number.isFinite(current.value)) return fail("$", "Nichtendliche Zahl");
    if (current.value && typeof current.value === "object") for (const value of Object.values(current.value)) pending.push({ value, depth: current.depth + 1 });
  }
  const source = object(parsed, "$"), image = text(source.mapImage, "mapImage");
  const bounds = list(source.mapBounds, "mapBounds", 2);
  if (bounds.length !== 2) return fail("mapBounds", "Zwei Rahmenecken erwartet");
  const lower = point(bounds[0], "mapBounds[0]"), upper = point(bounds[1], "mapBounds[1]");
  const order = source.coordinateOrder, origin = source.origin;
  if (order !== "xy" && order !== "yx") return fail("coordinateOrder", "xy oder yx erwartet");
  if (origin !== "bottom-left" && origin !== "top-left") return fail("origin", "bottom-left oder top-left erwartet");
  const xy = (p: readonly [number, number]): readonly [number, number] => order === "xy" ? p : [p[1], p[0]];
  const [x0, y0] = xy(lower), [x1, y1] = xy(upper);
  const size: readonly [number, number] = [x1 - x0, y1 - y0];
  if (size.some(v => v <= 0 || v > 100_000)) return fail("mapBounds", "Kartenmaße müssen zwischen 0 und 100000 liegen");
  const categories = new Map<string, { name: string; color: string; symbol: string; symbolColor: string }>();
  for (const [index, value] of list(source.categories, "categories", 256).entries()) {
    const path = `categories[${index}]`, row = object(value, path), id = text(row.id, `${path}.id`, 128);
    if (categories.has(id)) return fail(path, "Doppelte Kategorie-ID");
    categories.set(id, { name: text(row.name, `${path}.name`), color: color(row.color, `${path}.color`),
      symbol: text(row.symbol ?? "", `${path}.symbol`, 16, true), symbolColor: color(row.symbolColor ?? "", `${path}.symbolColor`, true) });
  }
  const keim = weltkeim({ generator: "fandom-interactivemap", version: ERON_MAP_IMPORT_VERSION, seed: image,
    optionen: { bounds: [lower, upper], origin, coordinateOrder: order } });
  const idFor = (path: readonly string[]): KnotenId => deriveKnotenId({ erzeuger: keim.generator, version: keim.version, keim: keim.keimHash, kind: "knoten", pfad: path });
  const provenance = (path: readonly string[], child?: string): Herkunft => ({ erzeuger: keim.generator, version: keim.version,
    keimHash: keim.keimHash, erzeugungspfad: path, ...(child ? { kindKeim: child } : {}) });
  const frame: Rahmen = { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" };
  const weltId = idFor(["welt"]), titel = image.replace(/\.[^.]+$/, "").replace(/\s+\d{2}\.\d{2}\.\d{4}$/, "");
  const nodes: Knoten[] = [{ id: weltId, art: "welt", titel, eltern: [], rahmen: frame, anker: null, herkunft: provenance(["welt"]), sichtAnker: null }];
  const places: Ort[] = [], ids = new Set<string>();
  let notes = 0;
  for (const [index, value] of list(source.markers, "markers", 10_000).entries()) {
    const path = `markers[${index}]`, row = object(value, path), sourceId = text(row.id, `${path}.id`, 128);
    if (ids.has(sourceId)) return fail(path, "Doppelte Marker-ID");
    ids.add(sourceId);
    const categoryId = text(row.categoryId, `${path}.categoryId`, 128), category = categories.get(categoryId);
    if (!category) return fail(path, "Marker verweist auf unbekannte Kategorie");
    const position = point(row.position, `${path}.position`), [sourceX, sourceY] = xy(position);
    if (sourceX < x0 || sourceX > x1 || sourceY < y0 || sourceY > y1) return fail(path, "Marker liegt außerhalb des Kartenrahmens");
    const x = sourceX - x0, y = origin === "bottom-left" ? y1 - sourceY : sourceY - y0;
    const popup = object(row.popup, `${path}.popup`), name = text(popup.title, `${path}.popup.title`);
    const description = text(popup.description ?? "", `${path}.popup.description`, 64_000, true);
    const link = popup.link === undefined ? {} : object(popup.link, `${path}.popup.link`);
    const target = text(link.url ?? "", `${path}.popup.link.url`, 2000, true);
    const label = text(link.label ?? "", `${path}.popup.link.label`, 2000, true);
    if (description) notes++;
    const identityPath = ["marker", sourceId], id = idFor(identityPath);
    const child = canonicalHash({ generator: "chronicle-child", version: "1", parent: id });
    const eltern: Kante[] = [{ von: id, nach: weltId, art: "liegt_in_geografie" }];
    const herkunft = provenance(identityPath, child);
    const merkmale: Record<string, CanonicalValue> = { sourceMarkerId: sourceId, sourcePosition: position, categoryId,
      category: category.name, color: category.color, symbol: category.symbol, symbolColor: category.symbolColor,
      icon: markerIcon(name, category.name), description, sourceLink: target, sourceLinkLabel: label };
    places.push({ id, name, x, y, typ: "ort", eltern, herkunft, merkmale, kindKeim: child });
    nodes.push({ id, art: "ort", titel: name, eltern, rahmen: frame, anker: { in: weltId, bei: [x, y], massstab: 1 }, herkunft, sichtAnker: null });
  }
  nodes.sort((a, b) => a.id.localeCompare(b.id)); places.sort((a, b) => a.id.localeCompare(b.id));
  if (pruefeContainment(nodes).length) return fail("knoten", "Ungültige räumliche Verschachtelung");
  return { adapterVersion: ERON_MAP_IMPORT_VERSION, titel, keim, weltId, knoten: nodes, orte: places, zellen: [],
    szene: { v: 3, size, stamps: [], regions: [], places: places.map(p => ({ id: p.id, x: p.x, y: p.y })) },
    quelle: { format: "fandom-interactivemap", sha256: textHash(json), bytes: Buffer.byteLength(json, "utf8"), json },
    bericht: { knotenNachArt: { welt: 1, ort: places.length }, orte: places.length, zellen: 0, unterdrueckteNotizen: notes,
      // Dieser Importer lässt keinen Marker aus: die Fandom-Karte trägt Name und Koordinate im
      // Marker selbst, es gibt hier also keinen Fall „Marker ohne Notiz".
      ausgelasseneMarker: 0, ausgelasseneDatensaetze: {}, hinweise: ["Originale Marker, Koordinaten und Kategorie-Symbole übernommen. Politische Kategorien sind keine räumlichen Eltern.",
        "Markertexte bleiben als Quelle erhalten; Artikel und Freigaben werden separat gepflegt.", "Die Kindkeime sind von Chronicle aus den stabilen Marker-IDs abgeleitet."] } };
}
