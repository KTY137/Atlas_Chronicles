import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { AzgaarImportError, MAX_AZGAAR_BYTES, importiereAzgaar, importiereEronKarte, type AzgaarImport, type EronMapImport, type AtlasMarkerIcon } from "@chronicle/forge";
import type { Knoten, Ort } from "@chronicle/szene";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { createDocuments } from "./documents.ts";
import { Gone, Conflict } from "./errors.ts";

interface NodeRow { id: string; data: Knoten; entry_id: string | null }
interface MapRow { id: string; title: string; artifact_id: string; width: number; height: number; version: number }
type AtlasSource = AzgaarImport | EronMapImport;
const ERON_MAP = new URL("../../../../design/fixtures/eron/map-andaria.json", import.meta.url);
const ERON_IMAGE = new URL("../../../../design/fixtures/eron/media/Andaria_03.02.2024.webp", import.meta.url);
function isEron(source: AtlasSource): source is EronMapImport { return source.quelle.format === "fandom-interactivemap"; }
function hasBundledRaster(source: AtlasSource): boolean {
  return isEron(source) && source.keim.seed === "Andaria 03.02.2024.jpg" && source.szene.size[0] === 8192 && source.szene.size[1] === 8192;
}
export function createAtlas(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now, campaigns = createCampaigns(db, cfg);
  async function importMap(userId: string, campaignId: string, json: string) {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    // Detection must retain the parser's size boundary before allocating a parsed document.
    if (typeof json !== "string" || Buffer.byteLength(json, "utf8") > MAX_AZGAAR_BYTES)
      throw new AzgaarImportError("limit", "$", "Kartendatei darf höchstens 32 MiB groß sein");
    let format: unknown;
    try { format = JSON.parse(json); } catch { /* The selected parser reports the bounded format error. */ }
    const world: AtlasSource = format && typeof format === "object" && "mapBounds" in format ? importiereEronKarte(json) : importiereAzgaar(json);
    const artifactKind = isEron(world) ? "eron-map" : "azgaar";
    return db.transaction(async (tx) => {
      await createCampaigns(tx, cfg).requireMember(userId, campaignId, ["leitung"]);
      await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE", [campaignId]);
      const existing = (await tx.query<{ id: string }>(`SELECT m.id FROM atlas_maps m JOIN artifacts a ON a.id=m.artifact_id
        WHERE a.campaign_id=$1 AND a.kind=$2 AND a.source_hash=$3`, [campaignId, artifactKind, world.quelle.sha256])).rows[0];
      if (existing) return { id: existing.id, report: world.bericht, unchanged: true };
      const artifactId = randomUUID(), id = randomUUID();
      await tx.query("INSERT INTO artifacts(id,campaign_id,kind,source_hash,source,report,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [artifactId, campaignId, artifactKind, world.quelle.sha256, world, world.bericht, userId, now()]);
      await tx.query("INSERT INTO atlas_maps(id,campaign_id,artifact_id,title,width,height,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [id, campaignId, artifactId, world.titel, world.szene.size[0], world.szene.size[1], now()]);
      // Batch JSON recordset keeps a real world import one transaction without thousands of round trips.
      await tx.query(`INSERT INTO atlas_nodes(map_id,id,campaign_id,data)
        SELECT $1,n.id,$2,n.data FROM jsonb_to_recordset($3::jsonb) AS n(id text,data jsonb)`,
        [id, campaignId, JSON.stringify(world.knoten.map((n) => ({ id: n.id, data: n })))]);
      return { id, report: world.bericht, unchanged: false };
    });
  }
  async function importEronMap(userId: string, campaignId: string) {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    return importMap(userId, campaignId, await readFile(ERON_MAP, "utf8"));
  }
  async function visible(userId: string, campaignId: string, mapId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    const map = (await db.query<MapRow>("SELECT * FROM atlas_maps WHERE id=$1 AND campaign_id=$2", [mapId, campaignId])).rows[0];
    if (!map) throw new Gone();
    const all = (await db.query<NodeRow>("SELECT id,data,entry_id FROM atlas_nodes WHERE map_id=$1 ORDER BY id", [mapId])).rows;
    if (member.role === "leitung") return { map, member, nodes: all };
    const direct = new Set((await db.query<{ node_id: string }>("SELECT node_id FROM atlas_revelations WHERE map_id=$1 AND actor_id=$2", [mapId, member.actorId])).rows.map((r) => r.node_id));
    const knowledge = await createDocuments(db, cfg).knowledge(userId, campaignId);
    const nodes = all.filter((n) => direct.has(n.id) || (n.entry_id && knowledge.bekannteEntryIds?.has(n.entry_id)));
    if (!nodes.length) throw new Gone();
    return { map, member, nodes };
  }
  async function listMaps(userId: string, campaignId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    const all = (await db.query<MapRow>("SELECT * FROM atlas_maps WHERE campaign_id=$1 ORDER BY created_at,id", [campaignId])).rows;
    const result: { id: string; title: string }[] = [];
    for (const m of all) {
      if (member.role !== "leitung") { try { await visible(userId, campaignId, m.id); } catch (e) { if (e instanceof Gone) continue; throw e; } }
      result.push({ id: m.id, title: m.title });
    }
    return result;
  }
  async function getMap(userId: string, campaignId: string, mapId: string) {
    const { map, member, nodes } = await visible(userId, campaignId, mapId);
    const source = (await db.query<{ source: AtlasSource }>("SELECT source FROM artifacts WHERE id=$1", [map.artifact_id])).rows[0]!.source;
    const gm = member.role === "leitung";
    const children = new Map(gm ? (await db.query<{ knoten_id: string; map_id: string }>(
      "SELECT knoten_id,map_id FROM betreten_karten WHERE campaign_id=$1 AND parent_kind='atlas' AND parent_map_id=$2", [campaignId, mapId])).rows.map(row => [row.knoten_id, row.map_id]) : []);
    const allowed = new Set(nodes.map((n) => n.id)), entries = new Map(nodes.map((n) => [n.id, n.entry_id]));
    const knownEntries = member.role === "leitung" ? null : (await createDocuments(db,cfg).knowledge(userId,campaignId)).bekannteEntryIds;
    const knownEntry = (id: string | null | undefined) => id && (member.role === "leitung" || knownEntries?.has(id)) ? id : null;
    const icons: readonly AtlasMarkerIcon[] = ["place", "city", "castle", "cave", "ruin", "portal"];
    const pins = source.orte.filter((o: Ort) => allowed.has(o.id)).map((o) => {
      const markerColor = typeof o.merkmale.color === "string" && /^#[\da-f]{6}$/i.test(o.merkmale.color) ? Number.parseInt(o.merkmale.color.slice(1), 16) : undefined;
      const icon: AtlasMarkerIcon = children.has(o.id) ? "portal" : icons.includes(o.merkmale.icon as AtlasMarkerIcon) ? o.merkmale.icon as AtlasMarkerIcon : "city";
      return { id: o.id, x: o.x, y: o.y, label: o.name, icon,
        ...(markerColor === undefined ? {} : { color: markerColor }),
        ...(typeof o.merkmale.category === "string" ? { category: o.merkmale.category } : {}),
        ...(typeof o.merkmale.symbol === "string" ? { symbol: o.merkmale.symbol, symbolColor: o.merkmale.symbolColor } : {}),
        ...(knownEntry(entries.get(o.id)) ? { entryId: entries.get(o.id)! } : {}) };
    });
    const cells = source.zellen.filter((c) => member.role === "leitung" || [c.regionId,c.machtId,c.landmasseId].some((id) => id && allowed.has(id)))
      .map((c) => ({ id: c.id, polygon: c.polygon, fill: c.land ? 0x273d37 : 0x142632 }));
    return { id: map.id, title: map.title, width: map.width, height: map.height, cells, pins,
      nodes: nodes.map((n) => ({ id: n.id, title: n.data.titel, kind: n.data.art,
        parents: n.data.eltern.filter((e) => allowed.has(e.nach)).map((e) => ({ id: e.nach, kind: e.art })),
        ...(knownEntry(n.entry_id) ? { entryId: n.entry_id! } : {}),
        ...(gm ? { canEnter: Boolean(n.data.herkunft?.kindKeim), ...(children.has(n.id) ? { childMapId: children.get(n.id)! } : {}) } : {}) })),
      ...(gm ? { version: map.version, report: source.bericht } : {}),
      ...(gm && hasBundledRaster(source) ? { background: { url: `/api/campaigns/${encodeURIComponent(campaignId)}/maps/${encodeURIComponent(mapId)}/image`, width: 8192, height: 8192 } } : {}) };
  }
  async function getNode(userId: string, campaignId: string, mapId: string, nodeId: string) {
    const { nodes, member } = await visible(userId, campaignId, mapId);
    const selected = nodes.find(node => node.id === nodeId);
    if (!selected) throw new Gone("node");
    // The complete provenance includes child seeds and is authoring information.
    if (member.role !== "leitung") throw new Gone("membership");
    return { node: selected.data, ...(selected.entry_id ? { entryId: selected.entry_id } : {}) };
  }
  async function mapImage(userId: string, campaignId: string, mapId: string) {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    const row = (await db.query<{ source: AtlasSource }>(`SELECT a.source FROM atlas_maps m JOIN artifacts a ON a.id=m.artifact_id
      WHERE m.id=$1 AND m.campaign_id=$2`, [mapId, campaignId])).rows[0];
    if (!row || !hasBundledRaster(row.source)) throw new Gone("map-image");
    // This path is constant. Neither uploaded source names nor route parameters resolve files.
    return readFile(ERON_IMAGE);
  }
  async function revealNode(userId: string, campaignId: string, mapId: string, nodeId: string, actorId: string) {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    const valid = await db.query(`SELECT 1 FROM atlas_nodes n JOIN actors a ON a.campaign_id=n.campaign_id
      WHERE n.map_id=$1 AND n.id=$2 AND n.campaign_id=$3 AND a.id=$4`, [mapId, nodeId, campaignId, actorId]);
    if (!valid.rowCount) throw new Gone();
    await db.query(`INSERT INTO atlas_revelations(map_id,node_id,campaign_id,actor_id,knowledge,granted_by,granted_at)
      VALUES($1,$2,$3,$4,'benannt',$5,$6) ON CONFLICT(map_id,node_id,actor_id) DO NOTHING`, [mapId,nodeId,campaignId,actorId,userId,now()]);
  }
  async function linkEntry(userId: string, campaignId: string, mapId: string, nodeId: string, entryId: string, expectedVersion: number) {
    return db.transaction(async (tx) => {
      await createCampaigns(tx, cfg).requireMember(userId, campaignId, ["leitung"]);
      await createDocuments(tx, cfg).source(campaignId, entryId);
      if (!(await tx.query("UPDATE atlas_maps SET version=version+1 WHERE id=$1 AND campaign_id=$2 AND version=$3 RETURNING id", [mapId,campaignId,expectedVersion])).rowCount) throw new Conflict();
      if (!(await tx.query("UPDATE atlas_nodes SET entry_id=$4 WHERE map_id=$1 AND id=$2 AND campaign_id=$3 RETURNING id", [mapId,nodeId,campaignId,entryId])).rowCount) throw new Gone();
      return { ok: true };
    });
  }
  return { importMap, importEronMap, listMaps, getMap, getNode, mapImage, revealNode, linkEntry };
}
