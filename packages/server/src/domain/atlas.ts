import { randomUUID } from "node:crypto";
import { importiereAzgaar, type AzgaarImport } from "@chronicle/forge";
import type { Knoten, Ort } from "@chronicle/szene";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { createDocuments } from "./documents.ts";
import { Gone, Conflict } from "./errors.ts";

interface NodeRow { id: string; data: Knoten; entry_id: string | null }
interface MapRow { id: string; title: string; artifact_id: string; width: number; height: number; version: number }
export function createAtlas(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now, campaigns = createCampaigns(db, cfg);
  async function importMap(userId: string, campaignId: string, json: string) {
    await campaigns.requireMember(userId, campaignId, ["leitung"]);
    const world = importiereAzgaar(json);
    return db.transaction(async (tx) => {
      await createCampaigns(tx, cfg).requireMember(userId, campaignId, ["leitung"]);
      await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE", [campaignId]);
      const existing = (await tx.query<{ id: string }>(`SELECT m.id FROM atlas_maps m JOIN artifacts a ON a.id=m.artifact_id
        WHERE a.campaign_id=$1 AND a.kind='azgaar' AND a.source_hash=$2`, [campaignId, world.quelle.sha256])).rows[0];
      if (existing) return { id: existing.id, report: world.bericht, unchanged: true };
      const artifactId = randomUUID(), id = randomUUID();
      await tx.query("INSERT INTO artifacts(id,campaign_id,kind,source_hash,source,report,created_by,created_at) VALUES($1,$2,'azgaar',$3,$4,$5,$6,$7)",
        [artifactId, campaignId, world.quelle.sha256, world, world.bericht, userId, now()]);
      await tx.query("INSERT INTO atlas_maps(id,campaign_id,artifact_id,title,width,height,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [id, campaignId, artifactId, world.titel, world.szene.size[0], world.szene.size[1], now()]);
      // Batch JSON recordset keeps a real world import one transaction without thousands of round trips.
      await tx.query(`INSERT INTO atlas_nodes(map_id,id,campaign_id,data)
        SELECT $1,n.id,$2,n.data FROM jsonb_to_recordset($3::jsonb) AS n(id text,data jsonb)`,
        [id, campaignId, JSON.stringify(world.knoten.map((n) => ({ id: n.id, data: n })))]);
      return { id, report: world.bericht, unchanged: false };
    });
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
    const source = (await db.query<{ source: AzgaarImport }>("SELECT source FROM artifacts WHERE id=$1", [map.artifact_id])).rows[0]!.source;
    const allowed = new Set(nodes.map((n) => n.id)), entries = new Map(nodes.map((n) => [n.id, n.entry_id]));
    const knownEntries = member.role === "leitung" ? null : (await createDocuments(db,cfg).knowledge(userId,campaignId)).bekannteEntryIds;
    const knownEntry = (id: string | null | undefined) => id && (member.role === "leitung" || knownEntries?.has(id)) ? id : null;
    const pins = source.orte.filter((o: Ort) => allowed.has(o.id)).map((o) => ({ id: o.id, x: o.x, y: o.y, label: o.name,
      ...(knownEntry(entries.get(o.id)) ? { entryId: entries.get(o.id)! } : {}) }));
    const cells = source.zellen.filter((c) => member.role === "leitung" || [c.regionId,c.machtId,c.landmasseId].some((id) => id && allowed.has(id)))
      .map((c) => ({ id: c.id, polygon: c.polygon, fill: c.land ? 0x273d37 : 0x142632 }));
    return { id: map.id, title: map.title, width: map.width, height: map.height, cells, pins,
      nodes: nodes.map((n) => ({ id: n.id, title: n.data.titel, kind: n.data.art,
        parents: n.data.eltern.filter((e) => allowed.has(e.nach)).map((e) => ({ id: e.nach, kind: e.art })),
        ...(knownEntry(n.entry_id) ? { entryId: n.entry_id! } : {}) })), ...(member.role === "leitung" ? { version: map.version, report: source.bericht } : {}) };
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
  return { importMap, listMaps, getMap, revealNode, linkEntry };
}
