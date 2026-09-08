// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Frozen v15 evidence rules. No mutable protocol/server contract is imported here.
import { createHash } from "node:crypto";
import { digest, fail, hash, keys, list, object, string } from "../campaign-v3-json.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { checkNestedMapTables } from "../native-v6/validation.ts";
import { CAMPAIGN_V14_TABLES, type CampaignTablesV14 } from "../native-v14/schema.ts";
import type { CampaignTablesV15 } from "./schema.ts";

type Kind = "atlas" | "tactical";
interface Ref { kind: Kind; id: string }
interface Pin extends Ref { name: string; version: number }
type Obj = Record<string, unknown>;
const key = (ref: Ref) => `${ref.kind}:${ref.id}`;
const address = (edge: Obj) => JSON.stringify([edge.parent_kind, edge.parent_map_id, edge.knoten_id]);
const sortPins = (a: Pin, b: Pin) => key(a).localeCompare(key(b), "en");
function integer(value: unknown, path: string, minimum = 1): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum || value > 2_147_483_647) fail(path, "bounded integer required");
  return value as number;
}
function time(value: unknown, path: string): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,18})$/.test(value)) fail(path, "retained epoch string required");
  return BigInt(value as string);
}
function same(a: unknown, b: unknown, path: string): void { if (hash(a) !== hash(b)) fail(path, "evidence differs"); }
function ref(value: unknown, path: string, pin = false): Ref | Pin {
  const row = object(value, path); keys(row, pin ? ["kind", "id", "name", "version"] : ["kind", "id"], path);
  if (row.kind !== "atlas" && row.kind !== "tactical") fail(path, "known map kind required");
  const result: Ref = { kind: row.kind as Kind, id: string(row.id, path, 128) };
  return pin ? { ...result, name: string(row.name, path, 4096), version: integer(row.version, path) } : result;
}

/** Returns only the precisely validated legacy rows which must use v15's historical rules. */
export function checkMapLifecycleTables(t: CampaignTablesV15, campaignId: string): { retired: Set<string>; retiredLegacyChildren: Set<string>; revisionMappings: Map<string, number> } {
  const users = new Set(t.users.map(row => String(row.id)));
  const maps = new Map<string, CampaignRow>([
    ...t.atlas_maps.map(row => [`atlas:${row.id}`, row] as const),
    ...t.tactical_maps.map(row => [`tactical:${row.id}`, row] as const),
  ]);
  const mapFor = (at: Ref): CampaignRow => {
    const map = maps.get(key(at)); if (!map || map.campaign_id !== campaignId) fail("map-lifecycle", "missing same-campaign map"); return map!;
  };
  const scenes = new Map(t.scenes.map(row => [String(row.id), row]));
  const plans = new Map(t.scene_tactical_plans.map(row => [String(row.scene_id), row]));
  const sessions = new Map(t.game_sessions.map(row => [String(row.id), row]));
  const revisions = new Map(t.tactical_map_revisions.map(row => [JSON.stringify([row.map_id, row.revision]), row]));
  const retired = new Set<string>(), retiredLegacyChildren = new Set<string>();
  const active = new Map<string, Obj>(), everChild = new Set<string>();
  const minimumVersion = new Map<string, number>();
  const lastMappedRevision = new Map<string, number>();
  const requiredMappingFrom = new Map<string, number>();
  function requireLaterMappings(at: Ref, fromVersion: number): void {
    if (at.kind === "tactical") requiredMappingFrom.set(at.id, Math.min(requiredMappingFrom.get(at.id) ?? fromVersion, fromVersion));
  }
  function knownVersion(at: Ref, version: number): void {
    const map = mapFor(at); if (version < (minimumVersion.get(key(at)) ?? 1) || version > Number(map.version)) fail("map-lifecycle.version", "nonmonotone or impossible CAS version");
    minimumVersion.set(key(at), version);
  }
  function readEdge(value: unknown, path: string): Obj {
    const edge = object(value, path); keys(edge, ["campaign_id", "parent_kind", "parent_map_id", "knoten_id", "map_id", "keim_hash", "created_by", "created_at"], path);
    if (edge.campaign_id !== campaignId || !users.has(String(edge.created_by))) fail(path, "cross-campaign edge or missing historical author");
    mapFor({ kind: "tactical", id: string(edge.map_id, path, 128) });
    if (edge.parent_kind !== "atlas" && edge.parent_kind !== "tactical") fail(path, "invalid parent kind");
    mapFor({ kind: edge.parent_kind as Kind, id: string(edge.parent_map_id, path, 128) });
    string(edge.knoten_id, path, 256); time(edge.created_at, path); if (edge.keim_hash !== null) digest(edge.keim_hash, path);
    return edge;
  }
  function proveEntrance(edge: Obj, parentRevision: unknown, path: string): void {
    if (edge.parent_kind === "atlas") {
      if (parentRevision !== null || !t.atlas_nodes.some(row => row.campaign_id === campaignId && row.map_id === edge.parent_map_id && row.id === edge.knoten_id)) fail(path, "missing retained atlas parent node");
    } else {
      const n = integer(parentRevision, path), revision = revisions.get(JSON.stringify([edge.parent_map_id, n]));
      if (!revision || revision.campaign_id !== campaignId) fail(path, "missing pinned historical parent revision");
      const geometry = object(object(revision!.document, path).geometry, path);
      if (!list(geometry.regions, path).some(value => object(value, path).id === edge.knoten_id)) fail(path, "entrance is absent from pinned parent revision");
    }
  }
  for (const value of t.betreten_karten) {
    const edge = readEdge(value, "betreten_karten");
    if (active.has(address(edge)) || everChild.has(String(edge.map_id))) fail("betreten_karten", "ambiguous retained entrance");
    active.set(address(edge), edge); everChild.add(String(edge.map_id));
  }
  function subtree(root: Ref): Set<string> {
    const selected = new Set<string>(), pending = [root];
    while (pending.length) {
      const current = pending.pop()!, at = key(current);
      if (retired.has(at) || selected.has(at)) fail("map-lifecycle", "retired or cyclic subtree");
      mapFor(current); selected.add(at);
      for (const edge of active.values()) if (edge.parent_kind === current.kind && edge.parent_map_id === current.id) pending.push({ kind: "tactical", id: String(edge.map_id) });
    }
    return selected;
  }
  const commands = new Set<string>();
  const revisionMappings = new Map<string, number>(), mappedVersions = new Set<string>(), mappedRevisions = new Set<string>();
  const events = [...t.map_lifecycle_events].sort((a, b) => time(a.seq, "event.seq") < time(b.seq, "event.seq") ? -1 : 1);
  let previousSeq = 0n;
  for (const row of events) {
    const seq = time(row.seq, "event.seq"), at = time(row.created_at, "event.created_at");
    if (seq <= previousSeq || commands.has(String(row.command_id)) || row.campaign_id !== campaignId || !users.has(String(row.actor_user_id))) fail("map-lifecycle", "event order, command identity or campaign is invalid");
    previousSeq = seq; commands.add(String(row.command_id));
    const payload = object(row.payload, "event.payload"), request = object(row.request, "event.request"), ack = object(row.ack, "event.ack");
    if (payload.schemaVersion !== 1) fail("event.payload", "unsupported lifecycle schema");
    if (row.operation === "map.delete") {
      keys(payload, ["schemaVersion", "preview", "entrances"], "delete.payload");
      keys(request, ["reference", "input"], "delete.request");
      const root = ref(request.reference, "delete.root"), input = object(request.input, "delete.input");
      keys(input, ["commandId", "expectedVersion", "confirmationHash", "confirmedMapIds"], "delete.input");
      if (input.commandId !== row.command_id) fail("delete.input", "command differs");
      digest(input.confirmationHash, "delete.input"); integer(input.expectedVersion, "delete.input");
      same(row.request_hash, hash({ userId: row.actor_user_id, campaignId, reference: root, input }), "delete.request_hash");
      const preview = object(payload.preview, "delete.preview");
      keys(preview, ["root", "maps", "incoming", "affectedPlans", "blockers", "confirmationHash"], "delete.preview");
      const pinnedRoot = ref(preview.root, "preview.root", true) as Pin;
      same(root, { kind: pinnedRoot.kind, id: pinnedRoot.id }, "preview.root");
      if (pinnedRoot.version !== input.expectedVersion) fail("preview.root", "root CAS differs");
      const pins = list(preview.maps, "preview.maps", 10000).map(value => ref(value, "preview.map", true) as Pin);
      const selected = subtree(root), requested = list(input.confirmedMapIds, "confirmedMapIds", 10000).map(value => string(value, "confirmedMapId", 260));
      if (!pins.length || new Set(pins.map(key)).size !== pins.length || new Set(requested).size !== requested.length) fail("delete.maps", "empty or duplicated confirmation");
      same(pins.map(key).sort(), [...selected].sort(), "delete.subtree");
      same(requested.sort(), [...selected].sort(), "delete.confirmation");
      same(pins, [...pins].sort(sortPins), "delete.order");
      same(pinnedRoot, pins.find(pin => key(pin) === key(root)), "delete.root-pin");
      for (const pin of pins) {
        const map = mapFor(pin); knownVersion(pin, pin.version);
        if (Number(map.version) !== pin.version + 1 || Number(map.head_revision ?? 1) > pin.version || (pin.kind === "atlas" ? map.title : map.name) !== pin.name) fail("delete.map", "retired map differs from deletion pin");
      }
      const incoming = root.kind === "tactical" ? [...active.values()].find(edge => edge.map_id === root.id) : undefined;
      let parentAck: Pin | null = null;
      if (incoming) {
        const parent = object(preview.incoming, "preview.incoming");
        keys(parent, ["parentKind", "parentMapId", "parentName", "knotenId", "parentVersion"], "preview.incoming");
        if (parent.parentKind !== incoming.parent_kind || parent.parentMapId !== incoming.parent_map_id || parent.knotenId !== incoming.knoten_id) fail("preview.incoming", "incoming edge differs");
        const parentRef: Ref = { kind: incoming.parent_kind as Kind, id: String(incoming.parent_map_id) };
        const version = integer(parent.parentVersion, "preview.parentVersion"), parentMap = mapFor(parentRef);
        knownVersion(parentRef, version); knownVersion(parentRef, version + 1);
        requireLaterMappings(parentRef, version + 2);
        if ((parentRef.kind === "atlas" ? parentMap.title : parentMap.name) !== parent.parentName) fail("preview.incoming", "parent name differs");
        parentAck = { ...parentRef, name: string(parent.parentName, "preview.parentName", 4096), version: version + 1 };
      } else if (preview.incoming !== null) fail("preview.incoming", "root has no incoming edge");
      const detached = [...active.values()].filter(edge => selected.has(`tactical:${edge.map_id}`));
      const proven = list(payload.entrances, "delete.entrances", 10000).map(value => {
        const evidence = object(value, "delete.entrance"); keys(evidence, ["campaign_id", "parent_kind", "parent_map_id", "knoten_id", "map_id", "keim_hash", "created_by", "created_at", "parentRevision"], "delete.entrance");
        const { parentRevision, ...rawEdge } = evidence, edge = readEdge(rawEdge, "delete.entrance");
        proveEntrance(edge, parentRevision, "delete.entrance");
        if (time(edge.created_at, "edge.created_at") > at) fail("delete.entrance", "deletion predates the entrance");
        return edge;
      });
      const orderEdges = (edges: Obj[]) => [...edges].sort((a, b) => address(a).localeCompare(address(b), "en"));
      same(orderEdges(detached), orderEdges(proven), "delete.entrances");
      if (list(preview.blockers, "delete.blockers").length) fail("delete.blockers", "active blocker cannot be acknowledged");
      for (const state of t.session_tactical_states) if (selected.has(`tactical:${state.map_id}`)) {
        const session = sessions.get(String(state.session_id));
        if (!session || session.campaign_id !== campaignId) fail("delete.session", "missing session");
        if (time(session!.started_at, "session.started_at") <= at && (session!.ended_at === null || time(session!.ended_at, "session.ended_at") > at)) fail("delete.session", "deletion overlaps an active table session");
      }
      const affected = list(preview.affectedPlans, "delete.plans", 10000).map(value => {
        const plan = object(value, "delete.plan"); keys(plan, ["sceneId", "name", "version", "mapId"], "delete.plan");
        const current = plans.get(String(plan.sceneId));
        if (!scenes.has(String(plan.sceneId)) || !selected.has(`tactical:${plan.mapId}`) || !current || integer(plan.version, "delete.plan") > Number(current.version)) fail("delete.plan", "invalid scene plan evidence");
        string(plan.name, "delete.plan.name", 4096);
        if (plan.version === current!.version && plan.mapId !== current!.map_id) fail("delete.plan", "current plan differs");
        return String(plan.sceneId);
      });
      if (new Set(affected).size !== affected.length) fail("delete.plans", "duplicate scene plan");
      const { confirmationHash, ...body } = preview;
      same(confirmationHash, hash({ schemaVersion: 1, campaignId, ...body }), "delete.confirmationHash"); same(input.confirmationHash, confirmationHash, "delete.confirmationHash");
      const expectedAck = { commandId: row.command_id, root, deletedMaps: pins.map(pin => ({ ...pin, version: pin.version + 1 })), parent: parentAck, affectedSceneIds: affected, deletedAt: Number(at) };
      same(ack, expectedAck, "delete.ack");
      for (const pin of pins) { retired.add(key(pin)); knownVersion(pin, pin.version + 1); }
      for (const edge of detached) {
        active.delete(address(edge));
        if (t.betreten_karten.some(original => original.map_id === edge.map_id)) retiredLegacyChildren.add(String(edge.map_id));
      }
    } else if (row.operation === "map.enter") {
      keys(payload, ["schemaVersion", "edge", "createdEdge", "parentRevision", "parentVersionBefore", "parentVersionAfter"], "enter.payload");
      const edge = readEdge(payload.edge, "enter.edge"), parent: Ref = { kind: edge.parent_kind as Kind, id: String(edge.parent_map_id) };
      if (retired.has(key(parent)) || retired.has(`tactical:${edge.map_id}`)) fail("enter.edge", "retired endpoint");
      proveEntrance(edge, payload.parentRevision, "enter.edge");
      keys(ack, ["mapId", "erzeugt", "keimHash"], "enter.ack");
      if (typeof payload.createdEdge !== "boolean" || typeof ack.erzeugt !== "boolean" || ack.mapId !== edge.map_id || ack.keimHash !== edge.keim_hash) fail("enter.ack", "entrance receipt differs");
      keys(request, ["commandId", "knotenId"], "enter.request", ["parentKind", "parentMapId", "expectedVersion", "targetMapId", "name", "art", "stil", "optionen"]);
      if (request.commandId !== row.command_id || request.knotenId !== edge.knoten_id || request.parentKind !== undefined && request.parentKind !== edge.parent_kind || request.parentMapId !== undefined && request.parentMapId !== edge.parent_map_id) fail("enter.request", "entrance request differs");
      same(row.request_hash, hash({ userId: row.actor_user_id, campaignId, input: request }), "enter.request_hash");
      const before = integer(payload.parentVersionBefore, "enter.before"), after = integer(payload.parentVersionAfter, "enter.after");
      knownVersion(parent, before);
      if (after !== before + (payload.createdEdge ? 1 : 0)) fail("enter.version", "invalid parent CAS transition");
      knownVersion(parent, after);
      if (payload.createdEdge) requireLaterMappings(parent, after + 1);
      if (payload.createdEdge) {
        if (request.expectedVersion !== before || active.has(address(edge)) || everChild.has(String(edge.map_id)) || edge.created_by !== row.actor_user_id || time(edge.created_at, "enter.created_at") !== at) fail("enter.edge", "duplicate or unbacked replacement entrance");
        const previousAtAddress = t.betreten_karten.some(original => address(original) === address(edge));
        if (!previousAtAddress) fail("enter.edge", "replacement has no immutable baseline entrance");
        if (request.targetMapId !== undefined) {
          if (request.targetMapId !== edge.map_id || ack.erzeugt !== false || edge.keim_hash !== null) fail("enter.target", "explicit attachment differs");
        } else {
          if (ack.erzeugt !== true || edge.keim_hash === null) fail("enter.generated", "missing generated provenance");
          const commandId = createHash("sha256").update(`betreten-import:${row.command_id}`).digest("hex");
          if (!t.tactical_command_receipts.some(receipt => receipt.command_id === commandId && receipt.operation === "map.import" && receipt.subject_id === edge.map_id)) fail("enter.generated", "missing canonical map import receipt");
        }
        active.set(address(edge), edge); everChild.add(String(edge.map_id));
        subtree(parent); // cycle check after insertion
      } else {
        same(active.get(address(edge)), edge, "enter.existing");
        if (ack.erzeugt !== false || time(edge.created_at, "enter.created_at") > at) fail("enter.existing", "invalid existing-map acknowledgement");
      }
    } else if (row.operation === "map.revise") {
      keys(payload, ["schemaVersion", "mapId", "mapRevision", "mapVersion", "contentHash"], "revise.payload");
      keys(request, ["commandId", "expectedVersion", "document", "anchors"], "revise.request");
      keys(ack, ["subjectId", "version"], "revise.ack");
      const mapId = string(payload.mapId, "revise.mapId", 128), revisionNumber = integer(payload.mapRevision, "revise.revision", 2);
      const mapVersion = integer(payload.mapVersion, "revise.version", 2), atMap: Ref = { kind: "tactical", id: mapId };
      const revision = revisions.get(JSON.stringify([mapId, revisionNumber]));
      const receipt = t.tactical_command_receipts.find(candidate => candidate.command_id === row.command_id);
      if (retired.has(key(atMap)) || mapVersion <= revisionNumber || request.commandId !== row.command_id || integer(request.expectedVersion, "revise.expectedVersion") + 1 !== mapVersion
        || ack.subjectId !== mapId || ack.version !== mapVersion || !revision || revision.campaign_id !== campaignId
        || revision.created_by !== row.actor_user_id || time(revision.created_at, "revise.created_at") > at || revision.content_hash !== payload.contentHash)
        fail("revise.mapping", "invalid retained revision/CAS evidence");
      digest(payload.contentHash, "revise.contentHash");
      same(request.document, revision!.document, "revise.document");
      const anchors = t.tactical_map_anchors.filter(anchor => anchor.map_id === mapId && anchor.map_revision === revisionNumber)
        .map(anchor => ({ targetKind: anchor.target_kind, targetId: anchor.target_id, entryId: anchor.entry_id, passageId: anchor.passage_id }));
      const ordered = (values: unknown[]) => values.map(value => hash(value)).sort();
      same(ordered(list(request.anchors, "revise.anchors")), ordered(anchors), "revise.anchors");
      same(row.request_hash, hash({ campaignId, actorUserId: row.actor_user_id, scopeKind: "map", scopeId: mapId, operation: "map.revise", input: request }), "revise.request_hash");
      if (!receipt || receipt.operation !== "map.revise" || receipt.campaign_id !== campaignId || receipt.actor_user_id !== row.actor_user_id
        || receipt.scope_kind !== "map" || receipt.scope_id !== mapId || receipt.subject_kind !== "map" || receipt.subject_id !== mapId
        || receipt.request_hash !== row.request_hash || receipt.created_at !== row.created_at) fail("revise.receipt", "missing exact original acknowledgement");
      same(receipt!.ack, ack, "revise.receipt.ack");
      const byVersion = JSON.stringify([mapId, mapVersion]), byRevision = JSON.stringify([mapId, revisionNumber]);
      if (mappedVersions.has(byVersion) || mappedRevisions.has(byRevision)
        || revisionNumber <= (lastMappedRevision.get(mapId) ?? 1)
        || t.tactical_map_cartography.some(sidecar => sidecar.map_id === mapId && (Number(sidecar.map_version) <= mapVersion || Number(sidecar.map_revision) <= revisionNumber)))
        fail("revise.mapping", "ambiguous or nonlegacy revision/CAS mapping");
      knownVersion(atMap, mapVersion - 1); knownVersion(atMap, mapVersion);
      requireLaterMappings(atMap, mapVersion);
      lastMappedRevision.set(mapId, revisionNumber);
      mappedVersions.add(byVersion); mappedRevisions.add(byRevision); revisionMappings.set(String(row.command_id), revisionNumber);
    } else fail("event.operation", "unknown lifecycle operation");
  }
  // An unmapped CAS may accidentally equal a DIFFERENT later geometry revision.
  // Explicit lifecycle CAS steps therefore require the original acknowledgement's
  // own mapping; merely finding a numbered geometry revision is insufficient.
  for (const receipt of t.tactical_command_receipts) if (receipt.operation === "map.revise") {
    const from = requiredMappingFrom.get(String(receipt.subject_id)), ack = object(receipt.ack, "receipt.ack");
    if (from !== undefined && Number(ack.version) >= from && !revisionMappings.has(String(receipt.command_id))
      && !t.tactical_map_cartography.some(sidecar => sidecar.map_id === receipt.subject_id && sidecar.map_version === ack.version))
      fail("revise.mapping", "missing original revision/CAS mapping after lifecycle version change");
  }
  // V6's current-parent-region rule is replaced only for proved retired edge/receipt pairs.
  for (const row of t.betreten_command_receipts) {
    const response = object(row.response, "legacy.receipt");
    if (!retiredLegacyChildren.has(String(response.mapId))) continue;
    keys(response, ["mapId", "erzeugt", "keimHash"], "legacy.receipt");
    const edge = t.betreten_karten.find(candidate => candidate.map_id === response.mapId)!;
    if (row.campaign_id !== campaignId || !users.has(String(row.actor_user_id)) || typeof response.erzeugt !== "boolean"
      || response.keimHash !== edge.keim_hash || response.erzeugt && response.keimHash === null || time(row.created_at, "legacy.receipt.created_at") < time(edge.created_at, "legacy.edge.created_at")) fail("legacy.receipt", "retired entrance receipt differs from immutable evidence");
  }
  // Historical evidence proves retired links; every surviving baseline/replacement
  // must independently satisfy the unchanged current-head and acyclic hierarchy rules.
  checkNestedMapTables({ ...t, betreten_karten: [...active.values()] as CampaignRow[],
    betreten_command_receipts: t.betreten_command_receipts.filter(row => !retiredLegacyChildren.has(String(object(row.response, "receipt.response").mapId))),
  }, campaignId);
  return { retired, retiredLegacyChildren, revisionMappings };
}

export function lifecycleCoreTables(tables: CampaignTablesV15, campaignId: string): CampaignTablesV14 {
  const { retiredLegacyChildren, revisionMappings } = checkMapLifecycleTables(tables, campaignId);
  return { ...Object.fromEntries(CAMPAIGN_V14_TABLES.map(table => [table.name, tables[table.name]])),
    betreten_karten: tables.betreten_karten.filter(row => !retiredLegacyChildren.has(String(row.map_id))),
    betreten_command_receipts: tables.betreten_command_receipts.filter(row => !retiredLegacyChildren.has(String(object(row.response, "receipt.response").mapId))),
    tactical_command_receipts: tables.tactical_command_receipts.map(row => revisionMappings.has(String(row.command_id))
      ? { ...row, ack: { ...object(row.ack, "receipt.ack"), version: revisionMappings.get(String(row.command_id))! } } : row),
  } as unknown as CampaignTablesV14;
}
