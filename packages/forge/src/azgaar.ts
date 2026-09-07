// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalHash, canonicalJson, deriveKnotenId, textHash, type CanonicalValue, type KnotenId } from "@chronicle/core";
import { pruefeContainment, weltkeim, type ErzeugerAdapter, type Herkunft, type Kante, type Knoten, type KnotenArt, type Ort, type Rahmen, type SceneDoc, type Weltkeim } from "@chronicle/szene";

export const AZGAAR_IMPORT_VERSION = "2";
/** Eine Markerbeschreibung ist ein Hinweis, kein Artikel. */
const MAX_NOTIZ_ZEICHEN = 2000;
export const MAX_AZGAAR_BYTES = 32 * 1024 * 1024;
const MAX_RECORDS = 200_000;
type RecordValue = Record<string, unknown>;
type Point = readonly [number, number];
interface SourceCell { i: number; p: Point; f: number; state: number; province: number; h: number; vertices: readonly number[]; data: RecordValue }

export class AzgaarImportError extends Error {
  constructor(readonly code: "format" | "limit" | "reference" | "identity" | "containment", readonly path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "AzgaarImportError";
  }
}
export interface AzgaarZelle {
  readonly id: string;
  readonly punkt: Point;
  readonly land: boolean;
  readonly landmasseId: KnotenId | null;
  readonly machtId: KnotenId | null;
  readonly regionId: KnotenId | null;
  readonly polygon: readonly Point[];
}
export interface AzgaarImport {
  readonly adapterVersion: typeof AZGAAR_IMPORT_VERSION;
  readonly titel: string;
  readonly keim: Weltkeim;
  readonly weltId: KnotenId;
  readonly knoten: readonly Knoten[];
  readonly orte: readonly Ort[];
  readonly szene: SceneDoc;
  /** Geometry is ground truth. The server must project it before sending it to a player. */
  readonly zellen: readonly AzgaarZelle[];
  readonly quelle: { readonly format: "azgaar-full-json"; readonly sha256: string; readonly bytes: number; readonly json: string };
  readonly bericht: {
    readonly knotenNachArt: Readonly<Partial<Record<KnotenArt, number>>>;
    readonly orte: number;
    readonly zellen: number;
    readonly unterdrueckteNotizen: number;
    /** Marker ohne Notiz, ohne Koordinate oder als entfernt markiert. */
    readonly ausgelasseneMarker: number;
    readonly ausgelasseneDatensaetze: Readonly<Record<string, number>>;
    readonly hinweise: readonly string[];
  };
}

function error(path: string, message: string): never { throw new AzgaarImportError("format", path, message); }
function record(value: unknown, path: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) error(path, "Objekt erwartet");
  return value as RecordValue;
}
function list(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) error(path, "Array erwartet; bitte Azgaar als Full JSON exportieren (Minimal enthält keine Zellrelationen)");
  if (value.length > MAX_RECORDS) throw new AzgaarImportError("limit", path, `höchstens ${MAX_RECORDS} Datensätze`);
  return value;
}
function number(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) error(path, "endliche Zahl erwartet");
  return value;
}
function integer(value: unknown, path: string): number {
  const result = number(value, path);
  if (!Number.isSafeInteger(result) || result < 0) error(path, "nichtnegative Ganzzahl erwartet");
  return result;
}
function text(value: unknown, path: string, empty = false): string {
  if (typeof value !== "string" || value.length > 4096 || (!empty && !value.trim())) error(path, "Text mit höchstens 4096 Zeichen erwartet");
  return value;
}
/**
 * Generatorprosa als reiner Text.
 *
 * Die Notiz einer Karte ist fremdes HTML aus einer Datei, die jemand hochlädt. Sie darf als
 * Aussage über die Welt hereinkommen, aber nicht als Auszeichnung: `<script>` und `<style>`
 * fallen samt Inhalt weg, alle übrigen Marken werden abgestreift. Das unveränderte Original
 * bleibt in `quelle.json` erhalten — hier steht die Fassung, die weitergereicht wird.
 */
function klartext(value: unknown, path: string): string {
  const roh = text(value, path, true);
  const ohneSkript = roh.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
  const ohneMarken = ohneSkript.replace(/<[^>]*>/g, " ");
  // Gemessen am echten Korpus: die Notiz zu „Nalarlethkas Monolith" trägt eine erfundene
  // Inschrift aus rohen Codeeinheiten — einzelne Surrogathälften ohne Partner. Das ist kein
  // Text, den Postgres in `jsonb` annimmt, und der Import scheiterte daran. Entfernt werden
  // nur die HALBEN Paare; ein vollständiges astrales Zeichen ist gültige Schrift und bleibt.
  const tragbar = ohneMarken
    .replace(/\u0000/g, "")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
  const gestrafft = tragbar.replace(/\s+/g, " ").trim();
  return gestrafft.length > MAX_NOTIZ_ZEICHEN ? `${gestrafft.slice(0, MAX_NOTIZ_ZEICHEN)}…` : gestrafft;
}
function point(value: unknown, path: string): Point {
  const values = list(value, path);
  if (values.length !== 2) error(path, "genau zwei Koordinaten erwartet");
  return [number(values[0], `${path}[0]`), number(values[1], `${path}[1]`)];
}
function within(p: Point, size: Point, path: string): Point {
  if (p[0] < 0 || p[1] < 0 || p[0] > size[0] || p[1] > size[1]) error(path, "Koordinate außerhalb des Kartenrahmens");
  return p;
}
function sourceRecords(value: unknown, path: string): Map<number, RecordValue> {
  const result = new Map<number, RecordValue>();
  for (const [offset, value_] of list(value, path).entries()) {
    // FMG tombstones and index-zero sentinels are data-format conventions, never entities.
    if (value_ === null || value_ === 0) continue;
    const row = record(value_, `${path}[${offset}]`);
    if (row.removed !== undefined && typeof row.removed !== "boolean") error(`${path}[${offset}].removed`, "Boolean erwartet");
    const i = integer(row.i, `${path}[${offset}].i`);
    if (result.has(i)) throw new AzgaarImportError("identity", path, `doppelte Quell-ID ${i}`);
    result.set(i, row);
  }
  return result;
}
function alive(rows: ReadonlyMap<number, RecordValue>): readonly [number, RecordValue][] {
  return [...rows.entries()].filter(([i, row]) => i !== 0 && !row.removed);
}
const codeOrder = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

/**
 * Import an actual Azgaar Full JSON artifact. Pure and atomic: no database, network,
 * generator runtime, wiki articles, generated prose or visibility decisions are created here.
 * Cells are exported as records, unlike the live browser's parallel typed arrays (RB-21d).
 */
export function importiereAzgaar(json: string): AzgaarImport {
  if (typeof json !== "string") error("$", "JSON-Datei als Text erwartet");
  const bytes = Buffer.byteLength(json, "utf8");
  if (bytes > MAX_AZGAAR_BYTES) throw new AzgaarImportError("limit", "$", `Datei größer als ${MAX_AZGAAR_BYTES} Bytes`);
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return error("$", "ungültiges JSON"); }
  // Bound nesting before recursive canonical serialization; reject non-finite JSON numbers.
  const pending: { value: unknown; depth: number }[] = [{ value: parsed, depth: 0 }];
  while (pending.length) {
    const current = pending.pop()!;
    if (current.depth > 64) throw new AzgaarImportError("limit", "$", "JSON-Verschachtelung größer als 64");
    if (typeof current.value === "number" && !Number.isFinite(current.value)) error("$", "nichtendliche Zahl");
    if (current.value && typeof current.value === "object") {
      for (const value of Object.values(current.value)) pending.push({ value, depth: current.depth + 1 });
    }
  }
  const source = record(parsed, "$");
  const info = record(source.info, "info");
  const pack = record(source.pack, "pack");
  const settings = record(source.settings, "settings");
  const width = number(info.width, "info.width");
  const height = number(info.height, "info.height");
  if (width <= 0 || height <= 0 || width > 1_000_000 || height > 1_000_000) error("info", "ungültige Kartengröße");
  const size: Point = [width, height];
  const titel = text(info.mapName, "info.mapName");
  const keim = weltkeim({
    generator: "azgaar-fmg", version: text(info.version, "info.version"), seed: text(info.seed, "info.seed"),
    optionen: { width, height, settings: settings as CanonicalValue, mapCoordinates: (source.mapCoordinates ?? null) as CanonicalValue },
  });
  const cells = new Map<number, SourceCell>();
  for (const [offset, value] of list(pack.cells, "pack.cells").entries()) {
    const row = record(value, `pack.cells[${offset}]`);
    const i = integer(row.i, `pack.cells[${offset}].i`);
    if (cells.has(i)) throw new AzgaarImportError("identity", "pack.cells", `doppelte Zell-ID ${i}`);
    cells.set(i, {
      i, p: within(point(row.p, `pack.cells[${i}].p`), size, `pack.cells[${i}].p`),
      f: integer(row.f, `pack.cells[${i}].f`), state: integer(row.state, `pack.cells[${i}].state`),
      province: integer(row.province, `pack.cells[${i}].province`), h: number(row.h, `pack.cells[${i}].h`),
      vertices: list(row.v, `pack.cells[${i}].v`).map((v) => integer(v, `pack.cells[${i}].v`)), data: row,
    });
  }
  if (!cells.size) error("pack.cells", "Karte enthält keine Zellen");
  const vertices = new Map<number, Point>();
  for (const [i, row] of sourceRecords(pack.vertices, "pack.vertices")) vertices.set(i, point(row.p, `pack.vertices[${i}].p`));
  const features = sourceRecords(pack.features, "pack.features");
  const states = sourceRecords(pack.states, "pack.states");
  const provinces = sourceRecords(pack.provinces, "pack.provinces");
  const burgs = sourceRecords(pack.burgs, "pack.burgs");
  const idSet = new Set<KnotenId>();
  const provenance = (path: readonly string[], child?: string): Herkunft => ({
    erzeuger: keim.generator, version: keim.version, keimHash: keim.keimHash, erzeugungspfad: path,
    ...(child === undefined ? {} : { kindKeim: child }),
  });
  const mint = (path: readonly string[]): KnotenId => {
    const id = deriveKnotenId({ erzeuger: keim.generator, version: keim.version, keim: keim.keimHash, kind: "knoten", pfad: path });
    if (idSet.has(id)) throw new AzgaarImportError("identity", path.join("/"), "mehrdeutiger stabiler Erzeugungspfad");
    idSet.add(id);
    return id;
  };
  const frame: Rahmen = { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" };
  const nodes: Knoten[] = [];
  const worldPath = ["welt"];
  const weltId = mint(worldPath);
  const addNode = (id: KnotenId, art: KnotenArt, title: string | null, edges: readonly Kante[], path: readonly string[], anchor?: Point, child?: string): void => {
    nodes.push({ id, art, titel: title, eltern: edges, rahmen: frame, anker: anchor ? { in: weltId, bei: anchor, massstab: 1 } : null, herkunft: provenance(path, child), sichtAnker: null });
  };
  addNode(weltId, "welt", titel, [], worldPath);
  const edge = (from: KnotenId, to: KnotenId, art: Kante["art"]): Kante => ({ von: from, nach: to, art });
  const territories = { f: new Map<number, SourceCell[]>(), state: new Map<number, SourceCell[]>(), province: new Map<number, SourceCell[]>() };
  for (const cell of cells.values()) for (const kind of ["f", "state", "province"] as const) {
    const group = territories[kind].get(cell[kind]);
    if (group) group.push(cell);
    else territories[kind].set(cell[kind], [cell]);
  }
  const territory = (kind: "f" | "state" | "province", sourceId: number): readonly SourceCell[] => territories[kind].get(sourceId) ?? [];
  const footprint = (rows: readonly SourceCell[]): string => canonicalHash(rows.map((c) => canonicalJson(c.p)).sort(codeOrder));
  const featureIds = new Map<number, KnotenId>();
  const stateIds = new Map<number, KnotenId>();
  const provinceIds = new Map<number, KnotenId>();
  const reference = (map: ReadonlyMap<number, KnotenId>, sourceId: number, path: string): KnotenId => {
    const value = map.get(sourceId);
    if (!value) throw new AzgaarImportError("reference", path, `unbekannte oder entfernte Referenz ${sourceId}`);
    return value;
  };
  for (const [i, row] of features) {
    if (i === 0 || row.removed) continue;
    if (typeof row.land !== "boolean") error(`pack.features[${i}].land`, "Boolean erwartet");
    if (!row.land) continue;
    const landCells = territory("f", i);
    if (!landCells.length) error(`pack.features[${i}]`, "Landmasse ohne Zellen");
    const path = ["landmasse", footprint(landCells)];
    const id = mint(path);
    featureIds.set(i, id);
    addNode(id, "landmasse", typeof row.name === "string" && row.name ? text(row.name, "feature.name") : null, [edge(id, weltId, "liegt_in_geografie")], path);
  }
  for (const [i, row] of alive(states)) {
    const title = text(row.fullName || row.name, `pack.states[${i}].name`);
    const stateCells = territory("state", i);
    const path = ["macht", title, footprint(stateCells)];
    const id = mint(path);
    stateIds.set(i, id);
    const lands = [...new Set(stateCells.filter((c) => c.h >= 20).map((c) => reference(featureIds, c.f, `state ${i} geography`)))].sort(codeOrder);
    addNode(id, "macht", title, [edge(id, weltId, "liegt_in_geografie"), ...lands.map((land) => edge(id, land, "beruehrt"))], path);
  }
  for (const [i, row] of alive(provinces)) {
    const title = text(row.fullName || row.name, `pack.provinces[${i}].name`);
    const regionCells = territory("province", i);
    const path = ["region", title, footprint(regionCells)];
    const id = mint(path);
    provinceIds.set(i, id);
    const lands = [...new Set(regionCells.filter((c) => c.h >= 20).map((c) => reference(featureIds, c.f, `province ${i} geography`)))].sort(codeOrder);
    const realmIds = [...new Set(regionCells.filter((c) => c.state !== 0).map((c) => reference(stateIds, c.state, `province ${i} polity`)))].sort(codeOrder);
    // An overseas province cannot be nested twice: root spatially, touch each landmass.
    const spatialParent = lands.length === 1 ? lands[0]! : weltId;
    addNode(id, "region", title, [edge(id, spatialParent, "liegt_in_geografie"),
      ...realmIds.map((realm) => edge(id, realm, "gehoert_zu_herrschaft")),
      ...(lands.length > 1 ? lands.map((land) => edge(id, land, "beruehrt")) : [])], path);
  }
  const places: Ort[] = [];
  for (const [i, row] of alive(burgs)) {
    const name = text(row.name, `pack.burgs[${i}].name`);
    const p = within([number(row.x, `burg ${i}.x`), number(row.y, `burg ${i}.y`)], size, `burg ${i}`);
    const cellId = integer(row.cell, `burg ${i}.cell`);
    const cell = cells.get(cellId);
    if (!cell) throw new AzgaarImportError("reference", `burg ${i}.cell`, `unbekannte Zelle ${cellId}`);
    if (cell.h < 20) error(`burg ${i}.cell`, "Siedlung liegt in einer Wasserzelle");
    const land = reference(featureIds, cell.f, `burg ${i}.feature`);
    const parent = cell.province ? reference(provinceIds, cell.province, `burg ${i}.province`) : land;
    const path = ["ort", name, canonicalJson(p)];
    const id = mint(path);
    const parents = [edge(id, parent, "liegt_in_geografie")];
    if (cell.state) parents.push(edge(id, reference(stateIds, cell.state, `burg ${i}.state`), "gehoert_zu_herrschaft"));
    // This is Azgaar's own child-generator seed, preserved as source provenance only.
    const child = `${keim.seed}${String(i).padStart(4, "0")}`;
    const facts: Record<string, CanonicalValue> = {};
    for (const key of ["population", "capital", "port", "culture", "citadel", "walls", "plaza", "temple", "shanty"]) {
      const value = row[key];
      if (value !== undefined) {
        if (typeof value !== "number" && typeof value !== "boolean") error(`burg ${i}.${key}`, "Zahl oder Boolean erwartet");
        facts[key] = value;
      }
    }
    for (const key of ["biome", "religion"]) if (cell.data[key] !== undefined) facts[key] = integer(cell.data[key], `cell ${cellId}.${key}`);
    const place: Ort = { id, name, x: p[0], y: p[1], typ: typeof row.type === "string" ? text(row.type, `burg ${i}.type`, true) : "siedlung", eltern: parents, herkunft: provenance(path, child), merkmale: facts, kindKeim: child };
    places.push(place);
    addNode(id, "ort", name, parents, path, p, child);
  }
  // Marker und ihre Notiz gehören zusammen: der Marker trägt Symbol und Koordinate, die Notiz
  // trägt Namen UND Beschreibung. Ein Marker ohne Notiz wäre ein namenloses Symbol auf einer
  // Koordinate — deshalb wurden beide bis hierher gemeinsam weggelassen. Sie kommen gemeinsam
  // zurück. `alive` ist hier bewusst NICHT benutzt: `marker0` ist ein echter Marker, kein
  // Index-Null-Platzhalter wie bei Burgen und Provinzen.
  const notizen = new Map<string, RecordValue>();
  for (const [offset, value] of list(source.notes ?? [], "notes").entries()) {
    const row = record(value, `notes[${offset}]`);
    notizen.set(text(row.id, `notes[${offset}].id`), row);
  }
  const benutzteNotizen = new Set<string>();
  let ausgelasseneMarker = 0;
  for (const [i, row] of sourceRecords(pack.markers ?? [], "pack.markers")) {
    if (row.removed) { ausgelasseneMarker += 1; continue; }
    const notizId = `marker${i}`, notiz = notizen.get(notizId);
    // Ohne Notiz kein Name, ohne Koordinate kein Ort. Beides wird gezählt, nicht geraten.
    if (!notiz || row.x === undefined || row.y === undefined || row.cell === undefined) { ausgelasseneMarker += 1; continue; }
    const name = text(notiz.name, `notes.${notizId}.name`);
    const p = within([number(row.x, `marker ${i}.x`), number(row.y, `marker ${i}.y`)], size, `marker ${i}`);
    const cellId = integer(row.cell, `marker ${i}.cell`);
    const cell = cells.get(cellId);
    if (!cell) throw new AzgaarImportError("reference", `marker ${i}.cell`, `unbekannte Zelle ${cellId}`);
    // Ein Marker darf liegen, wo keine Siedlung stehen kann: auf dem Wasser, in einer Zelle
    // ohne Provinz, auf einer Landmasse, die als entfernt markiert ist. Ein Vulkan im Meer ist
    // eine gültige Aussage über die Welt und kein Grund, den Import abzubrechen — er hängt dann
    // an der Welt selbst. Burgen bleiben streng: eine Siedlung ohne Land IST ein Formatfehler.
    const parent = (cell.province ? provinceIds.get(cell.province) : undefined)
      ?? (cell.h >= 20 ? featureIds.get(cell.f) : undefined)
      ?? weltId;
    const path = ["marker", String(i), name];
    const id = mint(path);
    const parents = [edge(id, parent, "liegt_in_geografie")];
    const macht = cell.state ? stateIds.get(cell.state) : undefined;
    if (macht) parents.push(edge(id, macht, "gehoert_zu_herrschaft"));
    const child = `${keim.seed}m${String(i).padStart(4, "0")}`;
    const merkmale: Record<string, CanonicalValue> = { sourceMarkerId: i, description: klartext(notiz.legend, `notes.${notizId}.legend`) };
    if (typeof row.type === "string") merkmale["markerTyp"] = text(row.type, `marker ${i}.type`, true);
    if (typeof row.icon === "string") merkmale["icon"] = text(row.icon, `marker ${i}.icon`, true);
    places.push({ id, name, x: p[0], y: p[1], typ: "marker", eltern: parents, herkunft: provenance(path, child), merkmale, kindKeim: child });
    addNode(id, "ort", name, parents, path, p, child);
    benutzteNotizen.add(notizId);
  }

  const zellen: AzgaarZelle[] = [];
  const cellIdentities = new Set<string>();
  for (const cell of cells.values()) {
    const id = deriveKnotenId({ erzeuger: keim.generator, version: keim.version, keim: keim.keimHash, kind: "knoten", pfad: ["zelle", canonicalJson(cell.p)] });
    if (cellIdentities.has(id)) throw new AzgaarImportError("identity", "pack.cells", "doppelte Zellkoordinaten");
    cellIdentities.add(id);
    if (cell.vertices.length < 3) error(`cell ${cell.i}.v`, "Polygon braucht mindestens drei Ecken");
    const polygon = cell.vertices.map((v) => {
      const p = vertices.get(v);
      if (!p) throw new AzgaarImportError("reference", `cell ${cell.i}.v`, `unbekannte Ecke ${v}`);
      // Voronoi boundary vertices can extend outside the canvas; preserve, renderer clips.
      return p;
    });
    zellen.push({ id, punkt: cell.p, land: cell.h >= 20, landmasseId: cell.h >= 20 ? reference(featureIds, cell.f, `cell ${cell.i}.f`) : null,
      machtId: cell.state ? reference(stateIds, cell.state, `cell ${cell.i}.state`) : null,
      regionId: cell.province ? reference(provinceIds, cell.province, `cell ${cell.i}.province`) : null, polygon });
  }
  nodes.sort((a, b) => codeOrder(a.id, b.id));
  places.sort((a, b) => codeOrder(a.id, b.id));
  zellen.sort((a, b) => codeOrder(a.id, b.id));
  const violations = pruefeContainment(nodes);
  if (violations.length) throw new AzgaarImportError("containment", "knoten", canonicalJson(violations as unknown as CanonicalValue));
  const counts: Partial<Record<KnotenArt, number>> = {};
  for (const node of nodes) counts[node.art] = (counts[node.art] ?? 0) + 1;
  const ignored: Record<string, number> = {};
  for (const key of ["rivers", "routes", "cultures", "religions", "zones", "goods", "markets", "deals"]) {
    if (pack[key] !== undefined) ignored[key] = list(pack[key], `pack.${key}`).length;
  }
  return {
    adapterVersion: AZGAAR_IMPORT_VERSION, titel, keim, weltId, knoten: nodes, orte: places, zellen,
    szene: { v: 3, size, stamps: [], regions: zellen.filter((c) => c.land).map((c) => ({ id: c.id, punkte: c.polygon })), places: places.map((p) => ({ id: p.id, x: p.x, y: p.y })) },
    quelle: { format: "azgaar-full-json", sha256: textHash(json), bytes, json },
    bericht: { knotenNachArt: counts, orte: places.length, zellen: cells.size, unterdrueckteNotizen: notizen.size - benutzteNotizen.size, ausgelasseneMarker,
      ausgelasseneDatensaetze: ignored, hinweise: ["Marker werden samt ihrer Notiz als Orte übernommen; deren Text kommt als reiner Text herein, die unveränderte Quelldatei bleibt erhalten.", "Weltkeim dokumentiert die Herkunft und verspricht keine Wiedererzeugung über Generatorversionen hinweg."] },
  };
}

/** Bind an imported artifact to the named generator boundary without invoking a generator. */
export function azgaarImportAdapter(json: string): ErzeugerAdapter {
  const imported = importiereAzgaar(json);
  return { name: "azgaar-import", version: AZGAAR_IMPORT_VERSION, async erzeuge(keim) {
    const expected = weltkeim(keim);
    if (expected.keimHash !== keim.keimHash || expected.keimHash !== imported.keim.keimHash) {
      throw new AzgaarImportError("identity", "Weltkeim", "Keim passt nicht zum importierten Artefakt");
    }
    return imported.orte;
  } };
}
