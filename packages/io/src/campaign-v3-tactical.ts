// Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT
import { canonicalJson, textHash, type CanonicalValue } from "@chronicle/core";
import { importUvtt, inspectUvttImage, type UvttProvenance, type UvttImage } from "@chronicle/forge";
import { parseTacticalMapDocument, parseBoundedMapJson, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { CAMPAIGN_V3_ADDITIONAL_TABLES, type CampaignTablesV3, type CampaignTableNameV3 } from "./campaign-schema-v3.ts";
import { type CampaignRow } from "./campaign-schema.ts";
import { CAMPAIGN_BUNDLE_V3_LIMITS as LIMITS } from "./campaign-v3-limits.ts";
import { fail, object, list, keys, string, numeric, tacticalJson as stableJson } from "./campaign-v3-json.ts";

const seal = (value: unknown) => textHash(stableJson(value));
const same = (a: unknown, b: unknown) => stableJson(a) === stableJson(b);
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
function group(rows: readonly CampaignRow[], key: (row: CampaignRow) => string): Map<string, CampaignRow[]> {
  const index = new Map<string, CampaignRow[]>();
  for (const row of rows) { const id = key(row), found = index.get(id); if (found) found.push(row); else index.set(id, [row]); }
  return index;
}
class Graph {
  private readonly indexes = new Map<string, Map<string, CampaignRow>>();
  constructor(readonly tables: CampaignTablesV3) {}
  ref(name: CampaignTableNameV3, values: readonly unknown[], columns: readonly string[] = ["id"]): CampaignRow {
    const nameKey = `${name}:${columns.join(",")}`; let index = this.indexes.get(nameKey);
    if (!index) { index = new Map(this.tables[name].map(row => [canonicalJson(columns.map(key => row[key]!) as CanonicalValue), row])); this.indexes.set(nameKey, index); }
    const row = index.get(canonicalJson(values as CanonicalValue)); if (!row) fail(name, "missing same-campaign reference"); return row!;
  }
}
function provenance(value: unknown): void {
  parseBoundedMapJson(value, 16_384);
  const row = object(value, "source.provenance"), names = ["name", "creator", "sourceUrl", "license", "licenseUrl", "retrievedAt", "generator", "generatorVersion"];
  keys(row, names, "source.provenance");
  for (const key of names) {
    const value = row[key]; if (value === null && !["name", "creator", "license"].includes(key)) continue;
    if (typeof value !== "string" || !value.trim() || value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) fail("source.provenance", "bounded attribution text required");
  }
  for (const key of ["sourceUrl", "licenseUrl"]) if (row[key] !== null) {
    try { const url = new URL(String(row[key])); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) fail("source.provenance", "HTTP(S) attribution without credentials required"); }
    catch { fail("source.provenance", "invalid attribution URL"); }
  }
  if (row.retrievedAt !== null && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(String(row.retrievedAt)) || !Number.isFinite(Date.parse(String(row.retrievedAt))))) fail("source.provenance", "UTC attribution time required");
}
function imageMeta(image: UvttImage | null): unknown {
  if (!image) return null;
  return { sha256: image.sha256, mimeType: image.mimeType, width: image.width, height: image.height, bytes: image.bytes };
}
const imageRef = (image: UvttImage | null): unknown => image ? { sha256: image.sha256, mimeType: image.mimeType, width: image.width, height: image.height } : null;
function source(row: CampaignRow): { document: TacticalMapDocumentV1; image: UvttImage | null } {
  const text = string(row.source_text, "source.source_text", LIMITS.sourceBytes), bytes = Buffer.byteLength(text, "utf8");
  if (!bytes || bytes > LIMITS.sourceBytes || String(bytes) !== row.source_bytes || textHash(text) !== row.source_hash) fail("source", "source byte count or hash mismatch");
  provenance(row.provenance);
  if (row.format === "uvtt") {
    if (row.image_base64 !== null) fail("source", "UVTT image must remain in its original source, without a duplicate payload");
    const imported = importUvtt(text, row.provenance as unknown as UvttProvenance);
    if (String(imported.source.formatVersion) !== row.format_version || !same(imported.fidelity, row.fidelity) || !same(imageMeta(imported.image), row.image_meta)) fail("source", "UVTT metadata/fidelity differs from original source");
    return { document: imported.document, image: imported.image };
  }
  if (row.format_version !== "1") fail("source", "native source version must be 1");
  const document = parseTacticalMapDocument(parseBoundedMapJson(text)), image = row.image_base64 === null ? null : inspectUvttImage(string(row.image_base64, "source.image_base64", LIMITS.sourceBase64Length));
  if (!same(imageMeta(image), row.image_meta) || !same(document.background, imageRef(image))) fail("source", "native background bytes/reference mismatch");
  const expectedFidelity = { version: 1, direction: "import", sourceRetained: true, exactSource: true, nativeRoundTrip: true,
    counts: { walls: document.walls.filter(row => row.kind === "wall").length, objectBlockers: document.walls.filter(row => row.kind === "object").length, portals: document.portals.length, lights: document.lights.length }, issues: [] };
  if (!same(row.fidelity, expectedFidelity)) fail("source", "native fidelity differs from original source");
  return { document, image };
}
function version(value: unknown, path: string): number {
  const v = numeric(value, path, 1); if (v > 2_147_483_647) fail(path, "SQL version limit exceeded"); return v;
}
function pose(row: CampaignRow): void {
  for (const key of ["x", "y", "elevation", "rotation"]) if (typeof row[key] !== "number" || !Number.isFinite(row[key]) || Math.abs(row[key] as number) > 1e9) fail("token.pose", "coordinate outside bounds");
  if (typeof row.scale !== "number" || !Number.isFinite(row.scale) || row.scale <= 0 || row.scale > 1e6) fail("token.scale", "positive bounded scale required");
}
function state(value: unknown, kind: "token" | "portal", g: Graph): CampaignRow {
  const row = object(value, `snapshot.${kind}`); keys(row, kind === "token" ? ["id", "actorId", "x", "y", "elevation", "rotation", "scale", "version"] : ["id", "closed", "version"], `snapshot.${kind}`);
  string(row.id, "snapshot.id", kind === "portal" ? 256 : 128); version(row.version, "snapshot.version");
  if (kind === "token") { g.ref("actor_profiles", [row.actorId], ["actor_id"]); pose(row); }
  else if (typeof row.closed !== "boolean") fail("snapshot.portal", "boolean required");
  return row;
}
interface Snapshot { schemaVersion: 1; map: { id: string; revision: number; contentHash: string }; tokens: CampaignRow[]; portals: CampaignRow[] }
function snapshot(value: unknown, revision: CampaignRow, document: TacticalMapDocumentV1, g: Graph): Snapshot {
  const row = object(value, "snapshot"); keys(row, ["schemaVersion", "map", "tokens", "portals"], "snapshot");
  if (row.schemaVersion !== 1 || !same(row.map, { id: revision.map_id, revision: revision.revision, contentHash: revision.content_hash })) fail("snapshot", "snapshot map pin mismatch");
  const tokens = list(row.tokens, "snapshot.tokens", 1000).map(value => state(value, "token", g)), portals = list(row.portals, "snapshot.portals", 20_000).map(value => state(value, "portal", g));
  for (const values of [tokens, portals]) if (new Set(values.map(row => row.id)).size !== values.length || values.some((row, i) => i > 0 && compare(String(values[i - 1]!.id), String(row.id)) >= 0)) fail("snapshot", "state IDs must be unique and sorted");
  if (!same(portals.map(row => row.id), document.portals.map(row => row.id).sort(compare))) fail("snapshot", "portal set differs from pinned map");
  return { schemaVersion: 1, map: row.map as unknown as Snapshot["map"], tokens, portals };
}
const values = (row: CampaignRow): CampaignRow => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "version"));
const stateRow = (row: CampaignRow): CampaignRow => ({ id: row.token_id!, actorId: row.actor_id!, x: row.x!, y: row.y!, elevation: row.elevation!, rotation: row.rotation!, scale: row.scale!, version: row.version! });
const changedVersions = (snap: Snapshot): bigint => [...snap.tokens, ...snap.portals].reduce((n, row) => n + BigInt(Number(row.version) - 1), 0n);

export function checkTacticalTables(t: CampaignTablesV3, campaignId: string): void {
  const g = new Graph(t), sources = new Map<string, ReturnType<typeof source>>(), maps = new Map<string, TacticalMapDocumentV1>();
  const histories = group(t.tactical_map_revisions, row => String(row.map_id));
  const anchorGroups = group(t.tactical_map_anchors, row => `${String(row.map_id)}:${row.map_revision}`);
  const tokenPlans = group(t.scene_token_plans, row => String(row.scene_id)), tokenStates = group(t.tactical_token_states, row => String(row.session_id));
  const transitionGroups = group(t.tactical_transitions, row => String(row.session_id));
  const geometryTargets = new Map<string, { stamp: Set<string>; region: Set<string>; place: Set<string> }>();
  for (const table of CAMPAIGN_V3_ADDITIONAL_TABLES) for (const row of t[table.name]) {
    if (row.campaign_id !== campaignId) fail(table.name, "cross-campaign row");
    for (const key of ["created_by", "updated_by", "captured_by", "actor_user_id"]) if (row[key] !== undefined) g.ref("users", [row[key]]);
  }
  for (const row of t.tactical_sources) sources.set(String(row.id), source(row));
  for (const row of t.tactical_maps) {
    if (typeof row.name !== "string" || !/\S/.test(row.name)) fail("tactical_maps", "nonempty map name required");
    g.ref("tactical_map_revisions", [row.id, row.head_revision], ["map_id", "revision"]);
    const history = histories.get(String(row.id)) ?? [];
    if (history.length !== row.head_revision || history.some(rev => Number(rev.revision) > Number(row.head_revision)) || Number(row.version) < Number(row.head_revision)) fail("tactical_maps", "map head does not match complete revision history");
  }
  for (const row of t.tactical_map_revisions) {
    g.ref("tactical_maps", [row.map_id]); g.ref("tactical_sources", [row.source_id]);
    const document = parseTacticalMapDocument(row.document), artifact = sources.get(String(row.source_id))!;
    if (row.revision === 1 && !same(document, artifact.document)) fail("tactical_map_revisions", "initial map document differs from its retained source");
    if (!same(document.background, imageRef(artifact.image))) fail("tactical_map_revisions", "map background differs from retained source image");
    const anchors = (anchorGroups.get(`${String(row.map_id)}:${row.revision}`) ?? []).map(anchor => ({ targetKind: anchor.target_kind!, targetId: anchor.target_id!, entryId: anchor.entry_id!, passageId: anchor.passage_id! }))
      .sort((a, b) => compare(String(a.targetKind), String(b.targetKind)) || compare(String(a.targetId), String(b.targetId)));
    if (row.content_hash !== seal({ document, anchors })) fail("tactical_map_revisions", "map document/anchor hash mismatch");
    maps.set(`${String(row.map_id)}:${row.revision}`, document);
    geometryTargets.set(`${String(row.map_id)}:${row.revision}`, { stamp: new Set(document.geometry.stamps.map(row => row.id)), region: new Set(document.geometry.regions.map(row => row.id)), place: new Set(document.geometry.places.map(row => row.id)) });
  }
  for (const row of t.tactical_map_anchors) {
    g.ref("tactical_map_revisions", [row.map_id, row.map_revision], ["map_id", "revision"]); g.ref("entries", [row.entry_id]);
    if (row.passage_id !== null && g.ref("passages", [row.passage_id]).entry_id !== row.entry_id) fail("tactical_map_anchors", "passage belongs to another entry");
    const targets = geometryTargets.get(`${String(row.map_id)}:${row.map_revision}`)!;
    if (!targets[row.target_kind as keyof typeof targets].has(String(row.target_id))) fail("tactical_map_anchors", "missing geometry target");
  }
  for (const row of t.scene_tactical_plans) { g.ref("scenes", [row.scene_id]); g.ref("tactical_map_revisions", [row.map_id, row.map_revision], ["map_id", "revision"]); }
  for (const row of t.scene_token_plans) { g.ref("scene_tactical_plans", [row.scene_id], ["scene_id"]); g.ref("actor_profiles", [row.actor_id], ["actor_id"]); pose(row); }
  for (const row of t.scene_tactical_plans) if ((tokenPlans.get(String(row.scene_id))?.length ?? 0) > 1000) fail("scene_token_plans", "token plan limit exceeded");
  for (const row of t.tactical_token_states) { g.ref("session_tactical_states", [row.session_id], ["session_id"]); g.ref("actor_profiles", [row.actor_id], ["actor_id"]); pose(row); }
  const currentBySession = new Map<string, Snapshot>(), baseBySession = new Map<string, Snapshot>();
  const currentSubjects = new Map<string, Map<string, CampaignRow>>();
  for (const row of t.session_tactical_states) {
    if (g.ref("game_sessions", [row.session_id]).scene_id !== row.scene_id) fail("session_tactical_states", "session/scene mismatch");
    g.ref("scenes", [row.scene_id]); const revision = g.ref("tactical_map_revisions", [row.map_id, row.map_revision], ["map_id", "revision"]), document = maps.get(`${String(row.map_id)}:${row.map_revision}`)!;
    const initial = snapshot(row.initial_snapshot, revision, document, g), base = snapshot(row.undo_base_snapshot, revision, document, g);
    if (row.initial_hash !== seal(initial) || row.undo_base_hash !== seal(base)) fail("session_tactical_states", "snapshot hash mismatch");
    const portalDefaults = new Map(document.portals.map(row => [row.id, row.closed]));
    if ([...initial.tokens, ...initial.portals].some(value => value.version !== 1) || initial.portals.some(portal => portalDefaults.get(String(portal.id)) !== portal.closed)) fail("initial_snapshot", "initial state differs from pinned map defaults");
    if (!same(initial.tokens.map(value => [value.id, value.actorId]), base.tokens.map(value => [value.id, value.actorId]))) fail("undo_base_snapshot", "initial actor/token roster changed");
    const current = snapshot({ schemaVersion: 1, map: initial.map, tokens: (tokenStates.get(String(row.session_id)) ?? []).map(stateRow).sort((a, b) => compare(String(a.id), String(b.id))), portals: row.portal_states }, revision, document, g);
    if (!same(initial.tokens.map(value => [value.id, value.actorId]), current.tokens.map(value => [value.id, value.actorId]))) fail("session_tactical_states", "current actor/token roster changed");
    const baseSeq = BigInt(String(row.base_seq)), lastSeq = BigInt(String(row.last_transition_seq));
    if (lastSeq < baseSeq || lastSeq - baseSeq > BigInt(LIMITS.undoTransitionsPerSession) || changedVersions(base) !== baseSeq || changedVersions(current) !== lastSeq) fail("session_tactical_states", "sequence/version accounting mismatch");
    if (baseSeq === 0n && !same(initial, base)) fail("undo_base_snapshot", "unpruned base must equal initial snapshot");
    currentBySession.set(String(row.session_id), current); baseBySession.set(String(row.session_id), base);
    currentSubjects.set(String(row.session_id), new Map([...current.tokens.map(row => [`token:${String(row.id)}`, row] as const), ...current.portals.map(row => [`portal:${String(row.id)}`, row] as const)]));
  }
  const liveAckVersions = new Map<string, Set<number>>();
  const liveSubjectKey = (sessionId: unknown, subjectKind: unknown, subjectId: unknown) => JSON.stringify([sessionId, subjectKind, subjectId]);
  for (const receipt of t.tactical_command_receipts) {
    const ack = object(receipt.ack, "receipt.ack"); keys(ack, ["subjectId", "version"], "receipt.ack");
    if (ack.subjectId !== receipt.subject_id) fail("receipt", "ack subject mismatch");
    const acknowledged = version(ack.version, "receipt.ack.version"); let currentVersion: number;
    if (receipt.operation === "map.import" || receipt.operation === "map.revise") {
      if (receipt.subject_kind !== "map" || receipt.scope_kind !== (receipt.operation === "map.import" ? "campaign" : "map") || receipt.scope_id !== (receipt.operation === "map.import" ? campaignId : receipt.subject_id)) fail("receipt", "map receipt scope mismatch");
      currentVersion = Number(g.ref("tactical_maps", [receipt.subject_id]).version);
      if (receipt.operation === "map.import" && acknowledged !== 1 || receipt.operation === "map.revise" && acknowledged < 2) fail("receipt", "map acknowledgement is impossible for its operation");
      g.ref("tactical_map_revisions", [receipt.subject_id, acknowledged], ["map_id", "revision"]);
    } else if (receipt.operation === "plan.save") {
      if (receipt.subject_kind !== "plan" || receipt.scope_kind !== "scene" || receipt.scope_id !== receipt.subject_id) fail("receipt", "plan receipt scope mismatch");
      currentVersion = Number(g.ref("scene_tactical_plans", [receipt.subject_id], ["scene_id"]).version);
    } else {
      if (receipt.scope_kind !== "session" || !["token", "portal"].includes(String(receipt.subject_kind)) || (receipt.operation === "token.move" && receipt.subject_kind !== "token") || (receipt.operation === "portal.set" && receipt.subject_kind !== "portal")) fail("receipt", "live receipt scope mismatch");
      g.ref("session_tactical_states", [receipt.scope_id], ["session_id"]);
      const subject = currentSubjects.get(String(receipt.scope_id))!.get(`${String(receipt.subject_kind)}:${String(receipt.subject_id)}`);
      if (!subject) fail("receipt", "missing current subject"); currentVersion = Number(subject!.version);
      const key = liveSubjectKey(receipt.scope_id, receipt.subject_kind, receipt.subject_id);
      let acknowledgedVersions = liveAckVersions.get(key);
      if (!acknowledgedVersions) { acknowledgedVersions = new Set<number>(); liveAckVersions.set(key, acknowledgedVersions); }
      acknowledgedVersions.add(acknowledged);
    }
    if (acknowledged > currentVersion) fail("receipt", "ack version is ahead of current subject");
  }
  // Every live version advance has a durable minimal acknowledgement, including
  // changes older than the undo window. No-op receipts may repeat a version but
  // cannot replace a missing advance. Iterate stored receipts, never an untrusted
  // current version, and make no claim about discarded positions/request inputs.
  for (const [sessionId, current] of currentBySession) for (const kind of ["token", "portal"] as const) {
    for (const subject of kind === "token" ? current.tokens : current.portals) {
      const acknowledgedVersions = [...(liveAckVersions.get(liveSubjectKey(sessionId, kind, subject.id)) ?? [])].sort((a, b) => a - b);
      let last = 1;
      for (const acknowledged of acknowledgedVersions) {
        if (acknowledged === 1) continue;
        if (acknowledged !== last + 1) fail("receipt", "missing durable acknowledgement for live version advance");
        last = acknowledged;
      }
      if (last !== subject.version) fail("receipt", "missing durable acknowledgement for live version advance");
    }
  }
  const transitionCommands = new Set<string>();
  for (const row of t.tactical_transitions) {
    g.ref("session_tactical_states", [row.session_id], ["session_id"]);
    if (transitionCommands.has(String(row.command_id))) fail("tactical_transitions", "duplicate transition command"); transitionCommands.add(String(row.command_id));
  }
  for (const session of t.session_tactical_states) {
    const transitions = [...(transitionGroups.get(String(session.session_id)) ?? [])].sort((a, b) => BigInt(String(a.seq)) < BigInt(String(b.seq)) ? -1 : 1);
    const base = baseBySession.get(String(session.session_id))!, replay = JSON.parse(stableJson(base)) as Snapshot, compensated = new Set<string>();
    const positions = { token: new Map(replay.tokens.map((row, i) => [row.id, i])), portal: new Map(replay.portals.map((row, i) => [row.id, i])) };
    if (transitions.length > LIMITS.undoTransitionsPerSession || BigInt(transitions.length) !== BigInt(String(session.last_transition_seq)) - BigInt(String(session.base_seq))) fail("tactical_transitions", "retained suffix length mismatch");
    for (let i = 0; i < transitions.length; i++) {
      const row = transitions[i]!, receipt = g.ref("tactical_command_receipts", [row.command_id], ["command_id"]), kind = row.subject_kind as "token" | "portal";
      if (BigInt(String(row.seq)) !== BigInt(String(session.base_seq)) + BigInt(i + 1) || receipt.scope_kind !== "session" || receipt.scope_id !== session.session_id || receipt.subject_kind !== kind || receipt.subject_id !== row.subject_id) fail("tactical_transitions", "receipt/sequence mismatch");
      const before = state(row.before_state, kind, g), after = state(row.after_state, kind, g), states = kind === "token" ? replay.tokens : replay.portals, index = positions[kind].get(row.subject_id!) ?? -1;
      if (index < 0 || !same(states[index], before) || before.id !== row.subject_id || after.id !== row.subject_id || Number(after.version) !== Number(before.version) + 1 || same(values(before), values(after)) || kind === "token" && before.actorId !== after.actorId) fail("tactical_transitions", "invalid object change");
      if (!same(receipt.ack, { subjectId: row.subject_id, version: after.version })) fail("tactical_transitions", "ack differs from accepted object version");
      let input: CampaignRow;
      if (row.compensates_command_id !== null) {
        if (receipt.operation !== "undo" || compensated.has(String(row.compensates_command_id))) fail("tactical_transitions", "invalid/double compensation");
        const target = g.ref("tactical_command_receipts", [row.compensates_command_id], ["command_id"]);
        if (target.scope_kind !== "session" || target.scope_id !== session.session_id || target.subject_kind !== kind || target.subject_id !== row.subject_id || target.operation !== (kind === "token" ? "token.move" : "portal.set")) fail("tactical_transitions", "compensation target mismatch");
        const retained = transitions.find(value => value.command_id === target.command_id);
        const latest = transitions.slice(0, i).reverse().find(value => value.subject_kind === kind && value.subject_id === row.subject_id && value.compensates_command_id === null && !compensated.has(String(value.command_id)));
        if (latest && latest.command_id !== target.command_id) fail("tactical_transitions", "compensation skips a newer uncompensated object change");
        if (retained) {
          if (BigInt(String(retained.seq)) >= BigInt(String(row.seq)) || BigInt(String(row.seq)) - BigInt(String(retained.seq)) > 50n || !same(values(before), values(object(retained.after_state, "undo.after"))) || !same(values(after), values(object(retained.before_state, "undo.before")))) fail("tactical_transitions", "compensation is not the retained target inverse");
        } else {
          const subject = (kind === "token" ? base.tokens : base.portals)[index]!;
          if (Number(object(target.ack, "undo.ack").version) > Number(subject.version)) fail("tactical_transitions", "missing compensation target is newer than the base");
        }
        compensated.add(String(target.command_id)); input = { commandId: row.command_id!, targetCommandId: target.command_id!, expectedVersion: before.version! };
      } else {
        if (receipt.operation !== (kind === "token" ? "token.move" : "portal.set")) fail("tactical_transitions", "live operation/patch mismatch");
        input = kind === "token" ? { commandId: row.command_id!, expectedVersion: before.version!, x: after.x!, y: after.y!, elevation: after.elevation!, rotation: after.rotation!, scale: after.scale!, tokenId: row.subject_id! }
          : { commandId: row.command_id!, expectedVersion: before.version!, closed: after.closed!, portalId: row.subject_id! };
      }
      if (receipt.request_hash !== seal({ campaignId, actorUserId: receipt.actor_user_id, scopeKind: "session", scopeId: session.session_id, operation: receipt.operation, input })) fail("tactical_transitions", "retained request hash mismatch");
      states[index] = after;
    }
    if (!same(replay, currentBySession.get(String(session.session_id)))) fail("session_tactical_states", "retained suffix does not reach current state");
  }
}
