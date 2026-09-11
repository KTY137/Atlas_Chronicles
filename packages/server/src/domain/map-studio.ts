// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash, randomUUID } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import type { TSchema, Static } from "@sinclair/typebox";
import { parseBoundedMapJson, parseMapFloorStack, floorRoomAnchor, emptyRoomFog, applyRoomFog,
  type MapFloorStack, type Knoten, type RoomFog, type TacticalCartographyV1 } from "@chronicle/szene";
import { copyFloorBlueprint } from "@chronicle/forge";
import * as P from "../../../protocol/src/map-studio.ts";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { createTactical, tacticalHash, TacticalValidationError } from "./tactical.ts";
import { authorizeMapLifecycle, assertMapActive, isMapDeleted } from "./map-lifecycle.ts";
import { floorStackFor, roomFogFor, fogRoomIds, validateStoredFloorMaps } from "./map-studio-state.ts";
import { Conflict, Gone } from "./errors.ts";

type Operation = "floor.add" | "floor.link" | "floor.unlink" | "floor.rename" | "floor.detach" | "fog.set";
function parse<T extends TSchema>(schema: T, value: unknown): Static<T> {
  const input = parseBoundedMapJson(value, 2 * 1024 * 1024);
  if (!Value.Check(schema, input)) throw new TacticalValidationError("Bitte Geschossangaben und Raumfreigaben prüfen.");
  return input;
}
export function createMapStudio(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now;
  async function command(userId: string, campaignId: string, mapId: string, operation: Operation,
    input: { commandId: string }, work: (tx: Db) => Promise<P.MapStudioAck>): Promise<P.MapStudioAck> {
    return db.transaction(async tx => {
      await authorizeMapLifecycle(tx, userId, campaignId); await assertMapActive(tx, campaignId, "tactical", mapId);
      const hash = tacticalHash({ userId, campaignId, mapId, operation, input });
      const receipt = (await tx.query<{ request_hash: string; ack: P.MapStudioAck }>("SELECT request_hash,ack FROM map_studio_commands WHERE command_id=$1", [input.commandId])).rows[0];
      if (receipt) {
        if (receipt.request_hash !== hash) throw new Conflict();
        await assertMapActive(tx, campaignId, "tactical", receipt.ack.mapId);
        return receipt.ack;
      }
      const ack = await work(tx);
      await tx.query(`INSERT INTO map_studio_commands(command_id,campaign_id,actor_user_id,scope_id,operation,request_hash,request,ack,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [input.commandId, campaignId, userId, mapId, operation, hash, JSON.stringify(input), JSON.stringify(ack), now()]);
      return ack;
    }).catch((error: unknown) => {
      if ((error as { code?: string }).code === "23505") throw new Conflict();
      throw error;
    });
  }
  async function readStack(tx: Db, userId: string, campaignId: string, mapId: string): Promise<P.MapFloorView> {
    await createCampaigns(tx).requireMember(userId, campaignId, ["leitung"]);
    await assertMapActive(tx, campaignId, "tactical", mapId);
    const row = await floorStackFor(tx, campaignId, mapId);
    if (!row) {
      const map = await createTactical(tx, cfg).getMap(userId, campaignId, mapId);
      return { version: 0, stack: { schemaVersion: 1, rootMapId: mapId, floors: [{ mapId, level: 0, name: "Erdgeschoss" }], links: [] }, unavailable: [] };
    }
    const unavailable: string[] = [];
    for (const floor of row.document.floors) if (await isMapDeleted(tx, campaignId, "tactical", floor.mapId)) unavailable.push(floor.mapId);
    return { version: row.version, stack: row.document, unavailable };
  }
  async function storeStack(tx: Db, userId: string, campaignId: string, before: P.MapFloorView, raw: MapFloorStack): Promise<number> {
    if (before.version >= 2147483647) throw new Conflict();
    const stack = parseMapFloorStack(raw);
    await validateStoredFloorMaps(tx, campaignId, stack);
    const version = before.version + 1, at = now();
    if (before.version === 0) await tx.query(`INSERT INTO map_floor_stacks(root_map_id,campaign_id,version,document,created_by,created_at,updated_by,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$5,$6)`, [stack.rootMapId, campaignId, version, JSON.stringify(stack), userId, at]);
    else if (!(await tx.query("UPDATE map_floor_stacks SET version=$3,document=$4,updated_by=$5,updated_at=$6 WHERE root_map_id=$1 AND campaign_id=$2 AND version=$7 RETURNING root_map_id", [stack.rootMapId, campaignId, version, JSON.stringify(stack), userId, at, before.version])).rowCount) throw new Conflict();
    return version;
  }
  async function getFloors(userId: string, campaignId: string, mapId: string) { return db.transaction(tx => readStack(tx, userId, campaignId, mapId)); }
  async function addFloor(userId: string, campaignId: string, mapId: string, raw: unknown): Promise<P.MapStudioAck> {
    const input = parse(P.MapFloorAddSchema, raw);
    return command(userId, campaignId, mapId, "floor.add", input, async tx => {
      const before = await readStack(tx, userId, campaignId, mapId);
      if (before.version !== input.expectedVersion) throw new Conflict();
      const source = await createTactical(tx, cfg).getMap(userId, campaignId, mapId);
      if (source.version !== input.expectedMapVersion) throw new Conflict();
      const drawing = source.cartography ?? source.legacyCartography;
      if (!drawing || !fogRoomIds(source.document, drawing).has(input.fromRegionId)) throw new TacticalValidationError("Bitte zuerst einen vorhandenen Raum als Treppenabsatz auswählen.");
      if (before.stack.floors.some(f => f.level === input.level) || before.stack.floors.length >= 16) throw new TacticalValidationError("Diese Geschossnummer ist bereits belegt oder der Verband ist voll.");
      const names = new Map((await tx.query<{ knoten_id: string; data: Knoten }>("SELECT knoten_id,data FROM tactical_map_nodes WHERE campaign_id=$1 AND map_id=$2", [campaignId, mapId])).rows.map(r => [r.knoten_id, r.data.titel ?? "Raum"]));
      const copied = copyFloorBlueprint(source.document, drawing, names, input.commandId, input.copyContents);
      const original = await createTactical(tx, cfg).getSource(userId, campaignId, mapId);
      const originalImage = original.format === "native" ? original.image_base64 : (parseBoundedMapJson(original.source_text, 64 * 1024 * 1024) as { image?: string }).image ?? null;
      const imported = await createTactical(tx, cfg).importMap(userId, campaignId, {
        commandId: createHash("sha256").update(`floor-import:${input.commandId}`).digest("hex"), name: input.name.trim(), format: "native",
        sourceText: JSON.stringify(copied.document), anchors: [], imageBase64: originalImage,
        // Source attribution is retained, but a copied blueprint does not claim a new random generator result.
        provenance: { ...original.provenance, generator: "chronicle-floor-copy", generatorVersion: "1" },
      }, { cartography: copied.cartography, nodes: copied.nodes });
      const newId = imported.subjectId, position = floorRoomAnchor(source.document.geometry.regions.find(r => r.id === input.fromRegionId)!.punkte);
      const next: MapFloorStack = { ...before.stack, floors: [...before.stack.floors, { mapId: newId, level: input.level, name: input.name.trim() }],
        links: [...before.stack.links, { id: randomUUID(), name: input.name.trim(), kind: input.linkKind, fromMapId: mapId, toMapId: newId,
          fromRegionId: input.fromRegionId, toRegionId: copied.regionIds.get(input.fromRegionId)!, position }] };
      const version = await storeStack(tx, userId, campaignId, before, next);
      // New copies start completely hidden, independently of any knowledge of the source floor.
      await tx.query("INSERT INTO map_room_fog(map_id,campaign_id,map_revision,version,document,updated_by,updated_at) VALUES($1,$2,1,1,$3,$4,$5)",
        [newId, campaignId, JSON.stringify({ ...emptyRoomFog(), enabled: true }), userId, now()]);
      return { version, mapId: newId };
    });
  }
  async function linkFloors(userId: string, campaignId: string, mapId: string, raw: unknown) {
    const input = parse(P.MapFloorLinkSchema, raw);
    return command(userId, campaignId, mapId, "floor.link", input, async tx => {
      const before = await readStack(tx, userId, campaignId, mapId);
      if (before.version !== input.expectedVersion) throw new Conflict();
      await assertMapActive(tx, campaignId, "tactical", input.toMapId);
      const link = { id: randomUUID(), name: input.name.trim(), kind: input.kind, fromMapId: mapId, toMapId: input.toMapId,
        fromRegionId: input.fromRegionId, toRegionId: input.toRegionId, position: input.position };
      const version = await storeStack(tx, userId, campaignId, before, { ...before.stack, links: [...before.stack.links, link] });
      return { version, mapId };
    });
  }
  async function unlinkFloors(userId: string, campaignId: string, mapId: string, raw: unknown) {
    const input = parse(P.MapFloorUnlinkSchema, raw);
    return command(userId, campaignId, mapId, "floor.unlink", input, async tx => {
      const before = await readStack(tx, userId, campaignId, mapId);
      if (before.version !== input.expectedVersion) throw new Conflict();
      if (!before.stack.links.some(l => l.id === input.linkId && [l.fromMapId, l.toMapId].includes(mapId))) throw new Gone();
      return { version: await storeStack(tx, userId, campaignId, before, { ...before.stack, links: before.stack.links.filter(l => l.id !== input.linkId) }), mapId };
    });
  }
  async function renameFloor(userId: string, campaignId: string, mapId: string, raw: unknown) {
    const input = parse(P.MapFloorRenameSchema, raw);
    return command(userId, campaignId, mapId, "floor.rename", input, async tx => {
      const before = await readStack(tx, userId, campaignId, mapId);
      if (before.version !== input.expectedVersion) throw new Conflict();
      return { version: await storeStack(tx, userId, campaignId, before, { ...before.stack, floors: before.stack.floors.map(f => f.mapId === mapId ? { ...f, name: input.name.trim() } : f) }), mapId };
    });
  }
  async function detachFloor(userId: string, campaignId: string, mapId: string, raw: unknown) {
    const input = parse(P.MapFloorDetachSchema, raw);
    return command(userId, campaignId, mapId, "floor.detach", input, async tx => {
      const before = await readStack(tx, userId, campaignId, mapId);
      if (before.version !== input.expectedVersion) throw new Conflict();
      if (before.stack.rootMapId === mapId) throw new TacticalValidationError("Das Erdgeschoss bleibt die Wurzel. Bitte zuerst die anderen Geschosse lösen.");
      return { version: await storeStack(tx, userId, campaignId, before, { ...before.stack,
        floors: before.stack.floors.filter(f => f.mapId !== mapId), links: before.stack.links.filter(l => l.fromMapId !== mapId && l.toMapId !== mapId) }), mapId };
    });
  }
  async function getFog(userId: string, campaignId: string, mapId: string, revision?: number): Promise<P.RoomFogView> {
    return db.transaction(async tx => {
      const map = await createTactical(tx, cfg).getMap(userId, campaignId, mapId, revision), row = await roomFogFor(tx, campaignId, mapId, map.revision);
      const roomIds = fogRoomIds(map.document, map.cartography ?? map.legacyCartography);
      const names = new Map((await tx.query<{ knoten_id: string; data: Knoten }>("SELECT knoten_id,data FROM tactical_map_nodes WHERE campaign_id=$1 AND map_id=$2", [campaignId, mapId])).rows.map(r => [r.knoten_id, r.data.titel]));
      const actors = (await tx.query<{ actorId: string; name: string }>("SELECT a.id AS \"actorId\",a.name FROM actors a JOIN actor_profiles p ON p.actor_id=a.id AND p.campaign_id=a.campaign_id WHERE a.campaign_id=$1 AND p.archived_at IS NULL ORDER BY a.name COLLATE \"C\",a.id", [campaignId])).rows;
      return { version: row?.version ?? 0, mapId, mapRevision: map.revision, state: row?.document ?? emptyRoomFog(), actors,
        rooms: map.document.geometry.regions.filter(r => roomIds.has(r.id)).map((r, i) => ({ id: r.id, name: names.get(r.id) ?? `Raum ${i + 1}`, points: r.punkte })) };
    });
  }
  async function setFog(userId: string, campaignId: string, mapId: string, raw: unknown): Promise<P.MapStudioAck> {
    const input = parse(P.RoomFogSetSchema, raw);
    return command(userId, campaignId, mapId, "fog.set", input, async tx => {
      const map = await createTactical(tx, cfg).getMap(userId, campaignId, mapId, input.mapRevision), before = await roomFogFor(tx, campaignId, mapId, map.revision);
      if ((before?.version ?? 0) !== input.expectedVersion || (before?.version ?? 0) >= 2147483647) throw new Conflict();
      if (input.audience !== null && !(await tx.query("SELECT 1 FROM actor_profiles WHERE campaign_id=$1 AND actor_id=$2 AND archived_at IS NULL", [campaignId, input.audience])).rowCount) throw new Gone();
      const next = applyRoomFog(before?.document ?? emptyRoomFog(), input, fogRoomIds(map.document, map.cartography ?? map.legacyCartography)), version = (before?.version ?? 0) + 1;
      await tx.query(`INSERT INTO map_room_fog(map_id,campaign_id,map_revision,version,document,updated_by,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT(map_id,map_revision) DO UPDATE SET version=EXCLUDED.version,document=EXCLUDED.document,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at`,
      [mapId, campaignId, map.revision, version, JSON.stringify(next), userId, now()]);
      return { version, mapId };
    });
  }
  return { getFloors, addFloor, linkFloors, unlinkFloors, renameFloor, detachFloor, getFog, setFog };
}
