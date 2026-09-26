// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Value } from "@sinclair/typebox/value";
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { MapDeleteSchema, type MapDeleteInput, type MapDeletionAck, type MapDeletionBlocker,
  type MapDeletionErrorCode, type MapDeletionFailure, type MapDeletionPreview,
  type MapKind, type MapReference, type MapVersionPin } from "@chronicle/protocol";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { floorStackFor } from "./map-studio-state.ts";
import { Conflict, Gone } from "./errors.ts";

const hash = (value: unknown) => canonicalHash(value as CanonicalValue);
export const mapReferenceKey = (map: MapReference) => `${map.kind}:${map.id}`;
export interface MapEntranceRow {
  campaign_id: string; parent_kind: MapKind; parent_map_id: string; knoten_id: string;
  map_id: string; keim_hash: string | null; created_by: string; created_at: string | number;
}
export interface MapEnterPayload {
  schemaVersion: 1; edge: MapEntranceRow; createdEdge: boolean;
  parentRevision: number | null; parentVersionBefore: number; parentVersionAfter: number;
}
export interface DeletedEntranceEvidence extends MapEntranceRow { parentRevision: number | null }
export interface MapDeletePayload { schemaVersion: 1; preview: MapDeletionPreview; entrances: DeletedEntranceEvidence[] }
export interface MapRevisePayload { schemaVersion: 1; mapId: string; mapRevision: number; mapVersion: number; contentHash: string }
export interface MapLifecycleRow {
  seq: string; command_id: string; campaign_id: string; actor_user_id: string;
  operation: "map.delete" | "map.enter" | "map.revise"; request_hash: string; request: Record<string, unknown>;
  payload: MapDeletePayload | MapEnterPayload | MapRevisePayload;
  ack: Record<string, unknown>; created_at: string;
}
export class MapLifecycleConflict extends Conflict {
  constructor(readonly code: MapDeletionErrorCode, readonly description: string,
    readonly blockers?: MapDeletionBlocker[]) { super(); }
  response(): MapDeletionFailure { return { code: this.code, error: this.description, ...(this.blockers ? { blockers: this.blockers } : {}) }; }
}
export async function mapLifecycleRows(tx: Db, campaignId: string): Promise<MapLifecycleRow[]> {
  return (await tx.query<MapLifecycleRow>("SELECT * FROM map_lifecycle_events WHERE campaign_id=$1 ORDER BY seq", [campaignId])).rows;
}
export function retiredMapKeys(events: readonly MapLifecycleRow[]): Set<string> {
  return new Set(events.filter(row => row.operation === "map.delete")
    .flatMap(row => (row.payload as { preview: MapDeletionPreview }).preview.maps.map(mapReferenceKey)));
}
export async function isMapDeleted(tx: Db, campaignId: string, kind: MapKind, id: string): Promise<boolean> {
  return (await tx.query(`SELECT 1 FROM map_lifecycle_events WHERE campaign_id=$1 AND operation='map.delete'
    AND payload->'preview'->'maps' @> $2::jsonb LIMIT 1`, [campaignId, JSON.stringify([{ kind, id }])])).rowCount > 0;
}
export async function assertMapActive(tx: Db, campaignId: string, kind: MapKind, id: string): Promise<void> {
  if (await isMapDeleted(tx, campaignId, kind, id)) throw new Gone("map-deleted");
}
/** The immutable legacy address is only the baseline; replacement links have their own evidence. */
export async function activeMapEntrances(tx: Db, campaignId: string): Promise<MapEntranceRow[]> {
  const [baseline, events] = await Promise.all([
    tx.query<MapEntranceRow>("SELECT * FROM betreten_karten WHERE campaign_id=$1", [campaignId]),
    mapLifecycleRows(tx, campaignId),
  ]);
  const retired = retiredMapKeys(events);
  const added = events.filter(row => row.operation === "map.enter" && (row.payload as MapEnterPayload).createdEdge)
    .map(row => (row.payload as MapEnterPayload).edge);
  return [...baseline.rows, ...added].filter(edge => !retired.has(`tactical:${edge.map_id}`)
    && !retired.has(`${edge.parent_kind}:${edge.parent_map_id}`));
}
/** Same campaign-first lock used by entering, editing and starting a scene. */
export async function authorizeMapLifecycle(tx: Db, userId: string, campaignId: string): Promise<void> {
  if (!(await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
    WHERE c.id=$1 AND m.user_id=$2 AND m.role='leitung' FOR UPDATE OF c FOR SHARE OF m`, [campaignId, userId])).rowCount) throw new Gone();
  await createCampaigns(tx).requireMember(userId, campaignId, ["leitung"]);
}
function validateReference(reference: MapReference): void {
  if (!["atlas", "tactical"].includes(reference.kind) || typeof reference.id !== "string"
    || !reference.id || reference.id.length > 128) throw new Gone();
}
export function createMapLifecycle(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now;
  async function previewIn(tx: Db, campaignId: string, reference: MapReference): Promise<MapDeletionPreview> {
    validateReference(reference);
    const [rows, edges, events] = await Promise.all([
      tx.query<MapVersionPin>(`SELECT 'atlas' AS kind,id,title AS name,version FROM atlas_maps WHERE campaign_id=$1
        UNION ALL SELECT 'tactical' AS kind,id,name,version FROM tactical_maps WHERE campaign_id=$1`, [campaignId]),
      activeMapEntrances(tx, campaignId), mapLifecycleRows(tx, campaignId),
    ]);
    const retired = retiredMapKeys(events), mapsByKey = new Map(rows.rows.filter(map => !retired.has(mapReferenceKey(map))).map(map => [mapReferenceKey(map), map]));
    const root = mapsByKey.get(mapReferenceKey(reference)); if (!root) throw new Gone("map");
    const children = new Map<string, MapEntranceRow[]>();
    for (const edge of edges) {
      const key = `${edge.parent_kind}:${edge.parent_map_id}`;
      const at = children.get(key) ?? []; at.push(edge); children.set(key, at);
    }
    // Ein Haus ist sein Erdgeschoss samt allen Geschossen darüber und darunter: wer es löscht, sieht
    // in der Vorschau jedes Geschoss einzeln und bestätigt sie zusammen. Ein einzelnes Geschoss
    // ohne sein Haus bleibt gesperrt, bis es aus dem Verband gelöst ist.
    const selected = new Map<string, MapVersionPin>(), pending = [root], viaHouse = new Set<string>();
    while (pending.length) {
      const current = pending.pop()!, key = mapReferenceKey(current);
      if (selected.has(key)) throw new MapLifecycleConflict("conflict", "Die Kartenhierarchie ist nicht eindeutig.");
      if (current.kind === "tactical") {
        const stack = await floorStackFor(tx, campaignId, current.id);
        if (stack && stack.root_map_id !== current.id && !viaHouse.has(current.id))
          throw new MapLifecycleConflict("conflict", "Dieses Geschoss gehört zu einem Haus. Lösche das Haus über sein Erdgeschoss – dann gehen alle Geschosse mit – oder löse das Geschoss zuerst aus dem Verband.");
        if (stack && stack.root_map_id === current.id) for (const floor of stack.document.floors) {
          const map = floor.mapId === current.id ? undefined : mapsByKey.get(`tactical:${floor.mapId}`);
          if (map) { viaHouse.add(map.id); pending.push(map); }
        }
      }
      selected.set(key, current);
      if (selected.size > 10000) throw new MapLifecycleConflict("conflict", "Mehr als 10.000 Karten: Bitte zuerst einen kleineren Unterbaum auswählen.");
      for (const edge of children.get(key) ?? []) {
        const child = mapsByKey.get(`tactical:${edge.map_id}`); if (!child) throw new Gone("child-map");
        pending.push(child);
      }
    }
    const maps = [...selected.values()].sort((a, b) => mapReferenceKey(a).localeCompare(mapReferenceKey(b), "en"));
    const incomingEdge = root.kind === "tactical" ? edges.find(edge => edge.map_id === root.id) : undefined;
    const parent = incomingEdge ? mapsByKey.get(`${incomingEdge.parent_kind}:${incomingEdge.parent_map_id}`) : undefined;
    if (incomingEdge && !parent) throw new Gone("parent-map");
    const incoming = incomingEdge && parent ? { parentKind: parent.kind, parentMapId: parent.id, parentName: parent.name,
      knotenId: incomingEdge.knoten_id, parentVersion: parent.version } : null;
    const tacticalIds = maps.filter(map => map.kind === "tactical").map(map => map.id);
    const [plans, sessions] = await Promise.all([
      tx.query<MapDeletionPreview["affectedPlans"][number]>(`SELECT p.scene_id AS "sceneId",s.name,p.version,p.map_id AS "mapId"
        FROM scene_tactical_plans p JOIN scenes s ON s.id=p.scene_id AND s.campaign_id=p.campaign_id
        WHERE p.campaign_id=$1 AND p.map_id=ANY($2::text[]) ORDER BY p.scene_id`, [campaignId, tacticalIds]),
      // A running scene holds its first map and the floor it plays on now.
      tx.query<MapDeletionBlocker>(`SELECT t.session_id AS "sessionId",t.scene_id AS "sceneId",s.name,m.map_id AS "mapId"
        FROM session_tactical_states t JOIN game_sessions g ON g.id=t.session_id AND g.campaign_id=t.campaign_id
        JOIN scenes s ON s.id=t.scene_id AND s.campaign_id=t.campaign_id
        CROSS JOIN LATERAL (SELECT t.map_id UNION SELECT f.map_id FROM session_floor_states f WHERE f.session_id=t.session_id) m
        WHERE t.campaign_id=$1 AND g.ended_at IS NULL AND m.map_id=ANY($2::text[]) ORDER BY t.session_id,m.map_id`, [campaignId, tacticalIds]),
    ]);
    const payload = { root, maps, incoming, affectedPlans: plans.rows, blockers: sessions.rows };
    return { ...payload, confirmationHash: hash({ schemaVersion: 1, campaignId, ...payload }) };
  }
  async function preview(userId: string, campaignId: string, reference: MapReference): Promise<MapDeletionPreview> {
    return db.transaction(async tx => { await authorizeMapLifecycle(tx, userId, campaignId); return previewIn(tx, campaignId, reference); });
  }
  async function remove(userId: string, campaignId: string, reference: MapReference, raw: unknown): Promise<MapDeletionAck> {
    validateReference(reference);
    if (!Value.Check(MapDeleteSchema, raw)) throw new MapLifecycleConflict("deletion-preview-changed", "Bitte die Löschvorschau erneut öffnen und alle betroffenen Karten bestätigen.");
    const input = raw as MapDeleteInput, requestHash = hash({ userId, campaignId, reference, input });
    return db.transaction(async tx => {
      await authorizeMapLifecycle(tx, userId, campaignId);
      const existing = (await tx.query<MapLifecycleRow>("SELECT * FROM map_lifecycle_events WHERE command_id=$1", [input.commandId])).rows[0];
      if (existing) {
        if (existing.operation !== "map.delete" || existing.actor_user_id !== userId || existing.campaign_id !== campaignId || existing.request_hash !== requestHash)
          throw new MapLifecycleConflict("conflict", "Dieser Befehl wurde bereits mit anderen Angaben verwendet.");
        return existing.ack as unknown as MapDeletionAck;
      }
      const current = await previewIn(tx, campaignId, reference);
      if (current.blockers.length) throw new MapLifecycleConflict("map-in-use", "Eine betroffene Karte wird noch am Tisch verwendet. Bitte zuerst die laufende Szene beenden oder wechseln.", current.blockers);
      const confirmed = [...input.confirmedMapIds].sort();
      const expected = current.maps.map(mapReferenceKey).sort();
      if (current.root.version !== input.expectedVersion || current.confirmationHash !== input.confirmationHash || hash(confirmed) !== hash(expected))
        throw new MapLifecycleConflict("deletion-preview-changed", "Die Karte oder ihre Unterkarten wurden geändert. Bitte die aktualisierte Löschvorschau bestätigen.");
      const deletedMaps: MapVersionPin[] = [];
      for (const map of current.maps) {
        if (map.version >= 2_147_483_647) throw new Conflict();
        const table = map.kind === "atlas" ? "atlas_maps" : "tactical_maps";
        if (!(await tx.query(`UPDATE ${table} SET version=version+1 WHERE campaign_id=$1 AND id=$2 AND version=$3 RETURNING id`, [campaignId, map.id, map.version])).rowCount) throw new Conflict();
        deletedMaps.push({ ...map, version: map.version + 1 });
      }
      let parent: MapVersionPin | null = null;
      if (current.incoming) {
        const at = current.incoming, table = at.parentKind === "atlas" ? "atlas_maps" : "tactical_maps";
        if (at.parentVersion >= 2_147_483_647 || !(await tx.query(`UPDATE ${table} SET version=version+1 WHERE campaign_id=$1 AND id=$2 AND version=$3 RETURNING id`, [campaignId, at.parentMapId, at.parentVersion])).rowCount) throw new Conflict();
        parent = { kind: at.parentKind, id: at.parentMapId, name: at.parentName, version: at.parentVersion + 1 };
      }
      const at = now(), ack: MapDeletionAck = { commandId: input.commandId, root: reference, deletedMaps, parent,
        affectedSceneIds: current.affectedPlans.map(plan => plan.sceneId), deletedAt: at };
      const deletedKeys = new Set(current.maps.map(mapReferenceKey));
      const detached = (await activeMapEntrances(tx, campaignId)).filter(edge => deletedKeys.has(`tactical:${edge.map_id}`));
      const parentHeads = new Map((await tx.query<{ id: string; head_revision: number }>(
        "SELECT id,head_revision FROM tactical_maps WHERE campaign_id=$1 AND id=ANY($2::text[])",
        [campaignId, detached.filter(edge => edge.parent_kind === "tactical").map(edge => edge.parent_map_id)])).rows.map(row => [row.id, row.head_revision]));
      const entrances: DeletedEntranceEvidence[] = detached.map(edge => ({ ...edge, created_at: String(edge.created_at),
        parentRevision: edge.parent_kind === "tactical" ? parentHeads.get(edge.parent_map_id)! : null }));
      await tx.query(`INSERT INTO map_lifecycle_events(command_id,campaign_id,actor_user_id,operation,request_hash,request,payload,ack,created_at)
        VALUES($1,$2,$3,'map.delete',$4,$5,$6,$7,$8)`, [input.commandId, campaignId, userId, requestHash,
        JSON.stringify({ reference, input }), JSON.stringify({ schemaVersion: 1, preview: current, entrances }), JSON.stringify(ack), at]);
      return ack;
    }).catch((error: unknown) => {
      const pg = error as { code?: string; constraint?: string };
      if (pg?.code === "23505" && pg.constraint === "map_lifecycle_events_command_id_key") throw new Conflict();
      throw error;
    });
  }
  return { preview, remove };
}
