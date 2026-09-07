// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { digest, fail, keys, list, object, string } from "../campaign-v3-json.ts";
import { CAMPAIGN_V6_ADDITIONAL_TABLES, type CampaignTablesV6 } from "./schema.ts";

const address = (map: unknown, node: unknown): string => JSON.stringify([map, node]);
function point(value: unknown, path: string): void {
  const coordinates = list(value, path, 2);
  if (coordinates.length !== 2 || coordinates.some(item => typeof item !== "number" || !Number.isFinite(item))) fail(path, "finite coordinate pair required");
}
function positive(value: unknown, path: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) fail(path, "finite positive scale required");
}
/** Retain the existing Knoten payload as evidence; never regenerate it during restore. */
function node(value: unknown, id: unknown, entries: ReadonlySet<string>): void {
  const data = object(value, "tactical_map_nodes.data");
  keys(data, ["id", "art", "titel", "eltern", "rahmen", "anker", "herkunft", "sichtAnker"], "tactical_map_nodes.data");
  if (data.id !== id) fail("tactical_map_nodes", "node identity differs from stored address");
  if (typeof data.art !== "string" || !["welt", "landmasse", "macht", "region", "ort", "bauwerk", "raum", "behaelter", "gegenstand"].includes(data.art)) fail("tactical_map_nodes", "unknown node kind");
  if (data.titel !== null && (typeof data.titel !== "string" || data.titel.length > 4096)) fail("tactical_map_nodes", "invalid node title");
  if (data.sichtAnker !== null && (typeof data.sichtAnker !== "string" || !entries.has(data.sichtAnker))) fail("tactical_map_nodes", "missing node knowledge anchor");
  const frame = object(data.rahmen, "node.rahmen"); keys(frame, ["ursprung", "einheitenProPixel", "ordnung", "hoch"], "node.rahmen");
  point(frame.ursprung, "node.rahmen.ursprung"); positive(frame.einheitenProPixel, "node.rahmen.einheitenProPixel");
  if (typeof frame.ordnung !== "string" || !["xy", "yx"].includes(frame.ordnung) || typeof frame.hoch !== "string" || !["oben", "unten"].includes(frame.hoch)) fail("node.rahmen", "invalid coordinate frame");
  if (data.anker !== null) {
    const anchor = object(data.anker, "node.anker"); keys(anchor, ["in", "bei", "massstab"], "node.anker");
    string(anchor.in, "node.anker.in", 256); point(anchor.bei, "node.anker.bei"); positive(anchor.massstab, "node.anker.massstab");
  }
  for (const value of list(data.eltern, "node.eltern", 1024)) {
    const edge = object(value, "node.eltern"); keys(edge, ["von", "nach", "art"], "node.eltern"); string(edge.nach, "node.eltern.nach", 256);
    if (edge.von !== id || typeof edge.art !== "string" || !["liegt_in_geografie", "gehoert_zu_herrschaft", "beruehrt", "enthaelt_physisch"].includes(edge.art)) fail("node.eltern", "invalid node edge");
  }
  if (data.herkunft !== null) {
    const origin = object(data.herkunft, "node.herkunft"); keys(origin, ["erzeuger", "version", "keimHash", "erzeugungspfad"], "node.herkunft", ["kindKeim"]);
    string(origin.erzeuger, "node.herkunft.erzeuger", 256); string(origin.version, "node.herkunft.version", 128); digest(origin.keimHash, "node.herkunft.keimHash");
    for (const component of list(origin.erzeugungspfad, "node.herkunft.erzeugungspfad", 128)) string(component, "node.herkunft.erzeugungspfad", 256);
    if (origin.kindKeim !== undefined) string(origin.kindKeim, "node.herkunft.kindKeim", 1024);
  }
}

/** Additional references are checked only after v5 validated the complete underlying campaign. */
export function checkNestedMapTables(tables: CampaignTablesV6, campaignId: string): void {
  const users = new Set(tables.users.map(row => String(row.id))), entries = new Set(tables.entries.map(row => String(row.id)));
  const maps = new Map(tables.tactical_maps.map(row => [String(row.id), row]));
  const atlasMaps = new Set(tables.atlas_maps.map(row => String(row.id)));
  const atlasNodes = new Set(tables.atlas_nodes.map(row => address(row.map_id, row.id)));
  const headRegions = new Map<string, Set<string>>();
  for (const revision of tables.tactical_map_revisions) if (maps.get(String(revision.map_id))?.head_revision === revision.revision) {
    const document = object(revision.document, "map.document"), geometry = object(document.geometry, "map.geometry");
    headRegions.set(String(revision.map_id), new Set(list(geometry.regions, "map.regions").map(region => String(object(region, "map.region").id))));
  }
  for (const table of CAMPAIGN_V6_ADDITIONAL_TABLES) for (const row of tables[table.name]) {
    if (row.campaign_id !== campaignId) fail(table.name, "cross-campaign row");
    for (const column of ["created_by", "actor_user_id"]) if (row[column] !== undefined && !users.has(String(row[column]))) fail(table.name, "missing historical identity");
  }
  for (const row of tables.tactical_map_nodes) {
    if (!maps.has(String(row.map_id))) fail("tactical_map_nodes", "missing same-campaign map");
    node(row.data, row.knoten_id, entries);
  }
  const children = new Map<string, typeof tables.betreten_karten[number]>(), parents = new Map<string, string>();
  for (const row of tables.betreten_karten) {
    const child = String(row.map_id), parent = String(row.parent_map_id);
    if (!maps.has(child)) fail("betreten_karten", "missing same-campaign child map");
    if (children.has(child)) fail("betreten_karten", "child map has more than one entrance parent");
    children.set(child, row);
    if (row.parent_kind === "atlas") {
      if (!atlasMaps.has(parent) || !atlasNodes.has(address(parent, row.knoten_id))) fail("betreten_karten", "missing same-campaign atlas parent node");
    } else {
      if (!maps.has(parent) || !headRegions.get(parent)?.has(String(row.knoten_id))) fail("betreten_karten", "missing current tactical parent region");
      parents.set(child, parent);
    }
  }
  // Every child has at most one parent. Mark each complete chain once, avoiding recursion
  // and quadratic walks even for a deliberately large imported hierarchy.
  const finished = new Set<string>();
  for (const start of parents.keys()) {
    const chain = new Set<string>(); let current: string | undefined = start;
    while (current !== undefined && !finished.has(current)) {
      if (chain.has(current)) fail("betreten_karten", "cyclic map hierarchy");
      chain.add(current); current = parents.get(current);
    }
    for (const id of chain) finished.add(id);
  }
  for (const row of tables.betreten_command_receipts) {
    const response = object(row.response, "betreten_command_receipts.response"); keys(response, ["mapId", "erzeugt", "keimHash"], "betreten_command_receipts.response");
    const child = children.get(string(response.mapId, "receipt.mapId"));
    if (!child) fail("betreten_command_receipts", "missing durable entrance for receipt");
    if (typeof response.erzeugt !== "boolean" || response.keimHash !== child!.keim_hash || (response.erzeugt && response.keimHash === null)) fail("betreten_command_receipts", "response differs from durable entrance evidence");
    if (BigInt(String(row.created_at)) < BigInt(String(child!.created_at))) fail("betreten_command_receipts", "receipt predates its entrance");
  }
}
