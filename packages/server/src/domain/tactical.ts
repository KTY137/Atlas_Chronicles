// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash, randomUUID } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import type { Static, TSchema } from "@sinclair/typebox";
import { resolvePassage, type LineageEvent } from "@chronicle/chronik";
import { trustPassageId } from "@chronicle/core";
import { importUvtt, exportUvtt, exportTacticalUvtt, inspectUvttImage, type UvttImage, type UvttProvenance, type FidelityReport } from "@chronicle/forge";
import { cartographyDraw, rendererVersion, inferLegacyCartography, parseBoundedMapJson, parseTacticalCartography, parseTacticalMapDocument, tacticalCartographyHash, tacticalCompositionHash, TACTICAL_MAP_LIMITS,
  type BuildingIntent, type CartographyRegionV1, type Knoten, type LegacyCartographyEvidence, type TacticalCartographyV1, type TacticalMapDocumentV1 } from "@chronicle/szene";
import * as P from "../../../protocol/src/tactical.ts";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig, type Membership } from "./campaigns.ts";
import { createDocuments } from "./documents.ts";
import { authorizeActor, listControlledActorIds } from "./actors.ts";
import { Conflict, Gone } from "./errors.ts";
import { activeMapEntrances, assertMapActive, isMapDeleted, mapLifecycleRows, retiredMapKeys } from "./map-lifecycle.ts";
import { validateImage, renderTacticalTile, renderCartographyImage, TACTICAL_RASTER_LIMITS } from "./tactical-raster.ts";
import { applyTacticalPatch, sameTacticalValues, tacticalPointInside, tacticalCanonicalJson, type TacticalSnapshot, type TacticalTokenState, type TacticalPortalState, type TacticalPatch } from "./tactical-state.ts";

export const TACTICAL_UNDO_LIMIT = 50;
export const tacticalHash = (value: unknown) => createHash("sha256").update(tacticalCanonicalJson(value)).digest("hex");
const sourceHash = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const sorted = <T extends { id: string }>(rows: readonly T[]): T[] => [...rows].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const sortedAnchors = (rows: readonly P.TacticalAnchor[]) => [...rows].sort((a, b) => `${a.targetKind}:${a.targetId}` < `${b.targetKind}:${b.targetId}` ? -1 : `${a.targetKind}:${a.targetId}` > `${b.targetKind}:${b.targetId}` ? 1 : 0);
const json = (value: unknown) => JSON.stringify(value);
function visiblePoint(view: Pick<P.TacticalView, "size" | "regions">, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x <= view.size[0] && y <= view.size[1] && view.regions.some(r => tacticalPointInside([x, y], r.points));
}
export class TacticalValidationError extends Error { readonly statusCode = 400; }
function parse<T extends TSchema>(schema: T, input: unknown): Static<T> {
  const copy = parseBoundedMapJson(input, 96 * 1024 * 1024);
  if (!Value.Check(schema, copy)) throw new TacticalValidationError("Bitte Kartendaten und erwartete Version prüfen.");
  return copy;
}
type Scope = "campaign" | "map" | "scene" | "session";
type Subject = "map" | "plan" | "token" | "portal";
type Operation = "map.import" | "map.revise" | "plan.save" | "token.move" | "portal.set" | "undo";
interface SessionRow {
  session_id: string; campaign_id: string; scene_id: string; map_id: string; map_revision: number;
  initial_snapshot: TacticalSnapshot; initial_hash: string; undo_base_snapshot: TacticalSnapshot; undo_base_hash: string;
  base_seq: string; last_transition_seq: string; portal_states: TacticalPortalState[]; ended_at: string | null;
}
interface TransitionRow {
  seq: string; command_id: string; subject_kind: "token" | "portal"; subject_id: string;
  before_state: TacticalTokenState | TacticalPortalState; after_state: TacticalTokenState | TacticalPortalState;
  compensates_command_id: string | null;
}
interface SourceRow {
  id: string; format: "uvtt" | "native"; source_text: string; source_hash: string; source_bytes: string;
  image_base64: string | null; image_meta: Omit<UvttImage, "base64"> | null; provenance: UvttProvenance; fidelity: FidelityReport;
}
async function authorize(tx: Db, userId: string, campaignId: string, gm = false, write = false): Promise<Membership> {
  const lock = write ? "FOR UPDATE OF c FOR SHARE OF m" : "FOR SHARE OF c,m";
  if (!(await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id WHERE c.id=$1 AND m.user_id=$2 ${lock}`, [campaignId, userId])).rowCount) throw new Gone();
  return createCampaigns(tx).requireMember(userId, campaignId, gm ? ["leitung"] : undefined);
}
const tokenColumns = 'token_id AS id,actor_id AS "actorId",x,y,elevation,rotation,scale';
async function tokens(tx: Db, sessionId: string): Promise<TacticalTokenState[]> {
  return sorted((await tx.query<TacticalTokenState>(`SELECT ${tokenColumns},version FROM tactical_token_states WHERE session_id=$1`, [sessionId])).rows);
}
async function anchors(tx: Db, mapId: string, revision: number): Promise<P.TacticalAnchor[]> {
  return sortedAnchors((await tx.query<P.TacticalAnchor>(`SELECT target_kind AS "targetKind",target_id AS "targetId",entry_id AS "entryId",passage_id AS "passageId"
    FROM tactical_map_anchors WHERE map_id=$1 AND map_revision=$2`, [mapId, revision])).rows);
}
async function mapCard(tx: Db, campaignId: string, mapId: string, revision?: number): Promise<P.TacticalMapCard> {
  const row = (await tx.query<{ id: string; name: string; version: number; revision: number; sourceId: string; contentHash: string; document: TacticalMapDocumentV1 }>(`SELECT m.id,m.name,m.version,r.revision,r.source_id AS "sourceId",r.content_hash AS "contentHash",r.document
    FROM tactical_maps m JOIN tactical_map_revisions r ON r.map_id=m.id AND r.revision=COALESCE($3,m.head_revision) WHERE m.campaign_id=$1 AND m.id=$2`, [campaignId, mapId, revision ?? null])).rows[0];
  if (!row) throw new Gone();
  const bindings = await anchors(tx, mapId, row.revision), document = parseTacticalMapDocument(row.document);
  if (tacticalHash({ document, anchors: bindings }) !== row.contentHash) throw new Gone();
  const stored = (await tx.query<{ document: unknown; content_hash: string }>("SELECT document,content_hash FROM tactical_map_cartography WHERE campaign_id=$1 AND map_id=$2 AND map_revision=$3", [campaignId, mapId, row.revision])).rows[0];
  if (stored) {
    const cartography = parseTacticalCartography(stored.document, document), cartographyHash = tacticalCartographyHash(cartography);
    if (cartographyHash !== stored.content_hash) throw new Gone();
    const compositionHash = tacticalCompositionHash(row.contentHash, cartographyHash);
    const original = (await tx.query<{ provenance: UvttProvenance }>("SELECT provenance FROM tactical_sources WHERE campaign_id=$1 AND id=$2", [campaignId, row.sourceId])).rows[0];
    if (!original) throw new Gone();
    const rasterDigest = tacticalHash({ mapRevision: row.revision, compositionHash, rendererVersion, setting: original.provenance.setting ?? "fantasy" });
    return { ...row, document, anchors: bindings, cartography, cartographyHash, compositionHash, rasterDigest };
  }
  if ((await tx.query("SELECT 1 FROM tactical_map_cartography WHERE campaign_id=$1 AND map_id=$2 AND map_revision<$3 LIMIT 1", [campaignId, mapId, row.revision])).rowCount) throw new Gone();
  const storedNodes = (await tx.query<{ data: Knoten }>("SELECT data FROM tactical_map_nodes WHERE campaign_id=$1 AND map_id=$2", [campaignId, mapId])).rows.map(value => value.data);
  const original = (await tx.query<Pick<SourceRow, "format" | "source_text" | "source_hash" | "provenance">>("SELECT format,source_text,source_hash,provenance FROM tactical_sources WHERE campaign_id=$1 AND id=$2", [campaignId, row.sourceId])).rows[0];
  if (!original || sourceHash(original.source_text) !== original.source_hash) throw new Gone();
  const originalDocument = original.format === "native" ? parseTacticalMapDocument(original.source_text) : undefined;
  const originalIds = new Set(originalDocument?.geometry.regions.map(region => region.id));
  // Metadata rows can be created long after this pinned revision. Only retained original
  // generator nodes establish an old role; a current room name must not rewrite history.
  const nodes = storedNodes.filter(node => originalIds.has(node.id) && node.herkunft !== null
    && ["chronicle-siedlung", "chronicle-grundriss", "chronicle-hoehle"].includes(node.herkunft.erzeuger)
    && node.herkunft.erzeuger === original.provenance.generator && node.herkunft.version === original.provenance.generatorVersion);
  let settlement: LegacyCartographyEvidence["settlement"];
  if (originalDocument && original.provenance.generator === "chronicle-siedlung" && ["1", "2", "3", "4"].includes(original.provenance.generatorVersion ?? "")) {
    const buildingRegionIds = nodes.filter(node => node.art === "bauwerk" && originalIds.has(node.id)).map(node => node.id as string);
    if (buildingRegionIds.length) settlement = { generator: "chronicle-siedlung", version: original.provenance.generatorVersion as "1" | "2" | "3" | "4", originalDocument, buildingRegionIds };
  }
  return { ...row, document, anchors: bindings, legacyCartography: inferLegacyCartography(document, { nodes, ...(settlement ? { settlement } : {}) }) };
}

/** The generator is an internal caller; an HTTP import cannot supply this trusted argument. */
export interface GeneratedMapContent { readonly cartography: TacticalCartographyV1; readonly nodes: readonly Knoten[] }
async function storeCartography(tx: Db, campaignId: string, mapId: string, revision: number, cartography: TacticalCartographyV1, mapVersion = revision): Promise<void> {
  await tx.query("INSERT INTO tactical_map_cartography(map_id,campaign_id,map_revision,map_version,document,content_hash) VALUES($1,$2,$3,$4,$5,$6)", [mapId, campaignId, revision, mapVersion, json(cartography), tacticalCartographyHash(cartography)]);
}
const regionMeaning = ({ authored: _authored, locked: _locked, provenance: _provenance, ...meaning }: CartographyRegionV1) => meaning;
function validateAuthoredCartography(before: P.TacticalMapCard, document: TacticalMapDocumentV1, cartography: TacticalCartographyV1): void {
  const previous = new Map((before.cartography ?? before.legacyCartography)!.regions.map(region => [region.regionId, region]));
  const oldGeometry = new Map(before.document.geometry.regions.map(region => [region.id, region])), nextGeometry = new Map(document.geometry.regions.map(region => [region.id, region]));
  const oldStamps = new Map(before.document.geometry.stamps.map(stamp => [stamp.id, stamp])), nextStamps = new Map(document.geometry.stamps.map(stamp => [stamp.id, stamp]));
  for (const region of cartography.regions) {
    const old = previous.get(region.regionId);
    const same = old && tacticalHash(oldGeometry.get(region.regionId)) === tacticalHash(nextGeometry.get(region.regionId)) && tacticalHash(regionMeaning(old)) === tacticalHash(regionMeaning(region))
      && (region.role !== "building" || (region.attachedStampIds ?? []).every(id => oldStamps.has(id) && nextStamps.has(id) && tacticalHash(oldStamps.get(id)) === tacticalHash(nextStamps.get(id))));
    if (!same && (!region.authored || region.provenance !== null)) throw new TacticalValidationError("Neue oder bearbeitete Flächen benötigen authored:true und dürfen keine Generatorherkunft behaupten.");
    if (same && tacticalHash(old.provenance) !== tacticalHash(region.provenance)) throw new TacticalValidationError("Die gespeicherte Herkunft einer unveränderten Fläche bleibt erhalten.");
  }
}
async function plan(tx: Db, campaignId: string, sceneId: string): Promise<P.TacticalPlan | null> {
  if (!(await tx.query("SELECT 1 FROM scenes WHERE id=$1 AND campaign_id=$2", [sceneId, campaignId])).rowCount) throw new Gone();
  const row = (await tx.query<Omit<P.TacticalPlan, "tokens">>('SELECT scene_id AS "sceneId",map_id AS "mapId",map_revision AS "mapRevision",version FROM scene_tactical_plans WHERE scene_id=$1 AND campaign_id=$2', [sceneId, campaignId])).rows[0];
  return row ? { ...row, tokens: sorted((await tx.query<P.TacticalTokenPlan>(`SELECT ${tokenColumns} FROM scene_token_plans WHERE scene_id=$1`, [sceneId])).rows) } : null;
}

/** Called only inside the existing startScene transaction, after its session INSERT. */
export async function captureTacticalSession(tx: Db, campaignId: string, sceneId: string, sessionId: string, startedBy: string, at: number): Promise<void> {
  if (!(await tx.query("SELECT 1 FROM game_sessions WHERE id=$1 AND campaign_id=$2 AND scene_id=$3", [sessionId, campaignId, sceneId])).rowCount) throw new Gone();
  if ((await tx.query("SELECT 1 FROM session_tactical_states WHERE session_id=$1", [sessionId])).rowCount) return;
  const chosen = await plan(tx, campaignId, sceneId); if (!chosen) return;
  if (await isMapDeleted(tx, campaignId, "tactical", chosen.mapId))
    throw new TacticalValidationError("Die vorbereitete Karte wurde gelöscht. Bitte vor dem Szenenstart eine verfügbare Karte in der Vorbereitung speichern.");
  const source = await mapCard(tx, campaignId, chosen.mapId, chosen.mapRevision);
  const snapshot: TacticalSnapshot = { schemaVersion: 1, map: { id: source.id, revision: source.revision, contentHash: source.contentHash },
    tokens: sorted(chosen.tokens.map(token => ({ ...token, version: 1 }))), portals: sorted(source.document.portals.map(p => ({ id: p.id, closed: p.closed, version: 1 }))) };
  const hash = tacticalHash(snapshot);
  await tx.query(`INSERT INTO session_tactical_states(session_id,campaign_id,scene_id,map_id,map_revision,initial_snapshot,initial_hash,undo_base_snapshot,undo_base_hash,portal_states,captured_by,captured_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$6,$7,$8,$9,$10)`, [sessionId, campaignId, sceneId, source.id, source.revision, json(snapshot), hash, json(snapshot.portals), startedBy, at]);
  for (const token of snapshot.tokens) await tx.query(`INSERT INTO tactical_token_states(session_id,campaign_id,token_id,actor_id,x,y,elevation,rotation,scale) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [sessionId, campaignId, token.id, token.actorId, token.x, token.y, token.elevation, token.rotation, token.scale]);
}

function attribution(raw: unknown): UvttProvenance {
  // The adapter owns the already-published attribution contract; this tiny empty
  // source reuses that validator without reading files, decoding pixels or creating data.
  return importUvtt('{"format":0.3,"resolution":{"map_origin":{"x":0,"y":0},"map_size":{"x":1,"y":1},"pixels_per_grid":1}}', raw as UvttProvenance).source.provenance;
}
async function prepareImport(input: P.TacticalImportInput) {
  const provenance = attribution(input.provenance);
  let document: TacticalMapDocumentV1, image: UvttImage | null, fidelity: FidelityReport, formatVersion: string;
  if (input.format === "uvtt") {
    if (input.imageBase64 != null) throw new TacticalValidationError("UVTT-Bilddaten bleiben ausschließlich in ihrer Originalquelle.");
    const imported = importUvtt(input.sourceText, provenance);
    ({ document, image, fidelity } = imported); formatVersion = String(imported.source.formatVersion);
  } else {
    document = parseTacticalMapDocument(input.sourceText); image = input.imageBase64 ? inspectUvttImage(input.imageBase64) : null; formatVersion = "1";
    fidelity = { version: 1, direction: "import", sourceRetained: true, exactSource: true, nativeRoundTrip: true,
      counts: { walls: document.walls.filter(w => w.kind === "wall").length, objectBlockers: document.walls.filter(w => w.kind === "object").length, portals: document.portals.length, lights: document.lights.length }, issues: [] };
  }
  const imageMeta = image ? { sha256: image.sha256, mimeType: image.mimeType, width: image.width, height: image.height, bytes: image.bytes } : null;
  validateServerMap(document);
  if (document.background !== null && (!imageMeta || tacticalHash(document.background) !== tacticalHash({ sha256: imageMeta.sha256, mimeType: imageMeta.mimeType, width: imageMeta.width, height: imageMeta.height }))) throw new TacticalValidationError("Das Originalbild passt nicht zur Karte.");
  if (image && !document.background) throw new TacticalValidationError("Ein Bild benötigt eine passende Hintergrundreferenz.");
  if (image) await validateImage(Buffer.from(image.base64, "base64"), document.background!);
  return { document, imageMeta, fidelity, provenance, formatVersion };
}
function validateServerMap(document: TacticalMapDocumentV1) {
  const [w, h] = document.geometry.size;
  if (!Number.isSafeInteger(w) || !Number.isSafeInteger(h)) throw new TacticalValidationError("Dieser Server unterstützt Karten mit ganzen Pixelmaßen.");
  // The native parser already bounds vector documents to TACTICAL_MAP_LIMITS. Only a
  // background enters the raster decoder and its full-image RGBA/mask allocation; applying
  // that smaller budget to pure geometry made a valid city preview impossible to save.
  if (document.background !== null && w * h > TACTICAL_RASTER_LIMITS.pixels) throw new TacticalValidationError("Dieser Server unterstützt Hintergrundbilder bis 16.000.000 Pixeln.");
  if (document.geometry.regions.reduce((n, region) => n + region.punkte.length, 0) > TACTICAL_RASTER_LIMITS.points) throw new TacticalValidationError("Dieser Server unterstützt höchstens 20.000 Regionspunkte pro Karte.");
}

export function createTactical(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now;
  async function command(userId: string, campaignId: string, scopeKind: Scope, scopeId: string, operation: Operation,
    input: { commandId: string; [key: string]: unknown }, gm: boolean,
    check: (tx: Db, member: Membership) => Promise<void>, work: (tx: Db, member: Membership) => Promise<{ subjectKind: Subject; ack: P.TacticalAck }>): Promise<P.TacticalAck> {
    return db.transaction(async tx => {
      const member = await authorize(tx, userId, campaignId, gm, true); await check(tx, member);
      const hash = tacticalHash({ campaignId, actorUserId: userId, scopeKind, scopeId, operation, input });
      const old = (await tx.query<{ actor_user_id: string; campaign_id: string; scope_kind: Scope; scope_id: string; operation: Operation; subject_kind: Subject; subject_id: string; request_hash: string; ack: P.TacticalAck }>("SELECT * FROM tactical_command_receipts WHERE command_id=$1", [input.commandId])).rows[0];
      if (old) {
        if (old.actor_user_id !== userId || old.campaign_id !== campaignId || old.scope_kind !== scopeKind || old.scope_id !== scopeId || old.operation !== operation || old.request_hash !== hash
          || operation === "token.move" && (old.subject_kind !== "token" || old.subject_id !== input.tokenId)
          || operation === "portal.set" && (old.subject_kind !== "portal" || old.subject_id !== input.portalId)) throw new Conflict();
        if (operation === "map.import") await assertMapActive(tx, campaignId, "tactical", old.subject_id);
        return old.ack;
      }
      const outcome = await work(tx, member);
      const at = now();
      await tx.query(`INSERT INTO tactical_command_receipts(command_id,actor_user_id,campaign_id,scope_kind,scope_id,subject_kind,subject_id,operation,request_hash,ack,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [input.commandId, userId, campaignId, scopeKind, scopeId, outcome.subjectKind, outcome.ack.subjectId, operation, hash, json(outcome.ack), at]);
      if (operation === "map.revise" && input.schemaVersion !== 2) {
        const revision = (await tx.query<{ revision: number; content_hash: string }>(`SELECT r.revision,r.content_hash FROM tactical_maps m
          JOIN tactical_map_revisions r ON r.map_id=m.id AND r.revision=m.head_revision WHERE m.id=$1 AND m.campaign_id=$2`, [scopeId, campaignId])).rows[0]!;
        if (outcome.ack.version !== revision.revision) await tx.query(`INSERT INTO map_lifecycle_events(command_id,campaign_id,actor_user_id,operation,request_hash,request,payload,ack,created_at)
          VALUES($1,$2,$3,'map.revise',$4,$5,$6,$7,$8)`, [input.commandId, campaignId, userId, hash, json(input),
          json({ schemaVersion: 1, mapId: scopeId, mapRevision: revision.revision, mapVersion: outcome.ack.version, contentHash: revision.content_hash }), json(outcome.ack), at]);
      }
      return outcome.ack;
    }).catch((error: unknown) => {
      const e = error as { code?: string; constraint?: string };
      if (e?.code === "23505" && ["tactical_command_receipts_pkey", "tactical_transitions_command_id_key", "map_lifecycle_events_command_id_key"].includes(e.constraint ?? "")) throw new Conflict();
      throw error;
    });
  }
  async function validateAnchors(tx: Db, campaignId: string, document: TacticalMapDocumentV1, input: readonly P.TacticalAnchor[]) {
    const ids = { stamp: new Set(document.geometry.stamps.map(x => x.id)), region: new Set(document.geometry.regions.map(x => x.id)), place: new Set(document.geometry.places.map(x => x.id)) };
    const seen = new Set<string>();
    for (const a of input) {
      const key = `${a.targetKind}:${a.targetId}`;
      if (seen.has(key) || !ids[a.targetKind].has(a.targetId)) throw new TacticalValidationError("Ein Kartenanker benötigt ein eindeutiges vorhandenes Geometrieziel."); seen.add(key);
    }
    if (!input.length) return [];
    const entries = new Set((await tx.query<{ id: string }>("SELECT id FROM entries WHERE campaign_id=$1 AND id=ANY($2::text[])", [campaignId, [...new Set(input.map(a => a.entryId))]])).rows.map(e => e.id));
    const passageIds = [...new Set(input.flatMap(a => a.passageId === null ? [] : [a.passageId]))];
    const passages = new Map((await tx.query<{ id: string; entry_id: string }>("SELECT id,entry_id FROM passages WHERE campaign_id=$1 AND id=ANY($2::text[])", [campaignId, passageIds])).rows.map(p => [p.id, p.entry_id]));
    for (const a of input) if (!entries.has(a.entryId) || a.passageId !== null && passages.get(a.passageId) !== a.entryId) throw new Gone();
    return sortedAnchors(input);
  }
  async function storeAnchors(tx: Db, campaignId: string, mapId: string, revision: number, rows: readonly P.TacticalAnchor[]) {
    if (rows.length) await tx.query(`INSERT INTO tactical_map_anchors(map_id,campaign_id,map_revision,target_kind,target_id,entry_id,passage_id)
      SELECT $1,$2,$3,a."targetKind",a."targetId",a."entryId",a."passageId"
      FROM jsonb_to_recordset($4::jsonb) AS a("targetKind" text,"targetId" text,"entryId" text,"passageId" text)`, [mapId, campaignId, revision, json(rows)]);
  }
  async function importPreview(userId: string, campaignId: string, raw: unknown) {
    await createCampaigns(db).requireMember(userId, campaignId, ["leitung"]);
    const input = parse(P.TacticalImportSchema, raw), prepared = await prepareImport(input);
    return db.transaction(async tx => { await authorize(tx, userId, campaignId, true); const bindings = await validateAnchors(tx, campaignId, prepared.document, input.anchors ?? []);
      return { document: prepared.document, anchors: bindings, fidelity: prepared.fidelity, image: prepared.imageMeta, sourceHash: sourceHash(input.sourceText) }; });
  }
  async function importMap(userId: string, campaignId: string, raw: unknown, generated?: GeneratedMapContent): Promise<P.TacticalAck> {
    await createCampaigns(db).requireMember(userId, campaignId, ["leitung"]);
    const parsed = parse(P.TacticalImportSchema, raw), input = { ...parsed, imageBase64: parsed.imageBase64 ?? null, anchors: parsed.anchors ?? [] }, prepared = await prepareImport(input);
    const generatedContent = generated ? { cartography: parseTacticalCartography(generated.cartography, prepared.document), nodes: generated.nodes } : undefined;
    return command(userId, campaignId, "campaign", campaignId, "map.import", { ...input, ...(generatedContent ? { generated: generatedContent } : {}) }, true, async () => {}, async tx => {
      const id = randomUUID(), sourceId = randomUUID(), at = now(), bindings = await validateAnchors(tx, campaignId, prepared.document, input.anchors);
      await tx.query(`INSERT INTO tactical_sources(id,campaign_id,format,format_version,source_text,source_hash,source_bytes,image_base64,image_meta,provenance,fidelity,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [sourceId, campaignId, input.format, prepared.formatVersion, input.sourceText, sourceHash(input.sourceText), Buffer.byteLength(input.sourceText, "utf8"), input.format === "native" ? input.imageBase64 : null, prepared.imageMeta ? json(prepared.imageMeta) : null, json(prepared.provenance), json(prepared.fidelity), userId, at]);
      await tx.query("INSERT INTO tactical_maps(id,campaign_id,name,created_by,created_at) VALUES($1,$2,$3,$4,$5)", [id, campaignId, input.name, userId, at]);
      await tx.query("INSERT INTO tactical_map_revisions(map_id,campaign_id,revision,source_id,document,content_hash,created_by,created_at) VALUES($1,$2,1,$3,$4,$5,$6,$7)", [id, campaignId, sourceId, json(prepared.document), tacticalHash({ document: prepared.document, anchors: bindings }), userId, at]);
      await storeAnchors(tx, campaignId, id, 1, bindings);
      if (generatedContent) {
        await storeCartography(tx, campaignId, id, 1, generatedContent.cartography);
        await tx.query(`INSERT INTO tactical_map_nodes(map_id,knoten_id,campaign_id,data)
          SELECT $1,n.id,$2,n.data FROM jsonb_to_recordset($3::jsonb) AS n(id text,data jsonb)`,
        [id, campaignId, json(generatedContent.nodes.map(data => ({ id: data.id, data })))]);
      }
      return { subjectKind: "map", ack: { subjectId: id, version: 1 } };
    });
  }
  async function listMaps(userId: string, campaignId: string): Promise<P.TacticalMapSummary[]> {
    return db.transaction(async tx => { await authorize(tx, userId, campaignId, true);
      const retired = retiredMapKeys(await mapLifecycleRows(tx, campaignId));
      return (await tx.query<P.TacticalMapSummary>("SELECT id,name,head_revision AS revision,version FROM tactical_maps WHERE campaign_id=$1 ORDER BY name COLLATE \"C\",id", [campaignId])).rows.filter(map => !retired.has(`tactical:${map.id}`)); });
  }
  async function getMap(userId: string, campaignId: string, mapId: string, revision?: number) {
    return db.transaction(async tx => { await authorize(tx, userId, campaignId, true); await assertMapActive(tx, campaignId, "tactical", mapId); return mapCard(tx, campaignId, mapId, revision); });
  }
  async function source(tx: Db, campaignId: string, sourceId: string): Promise<SourceRow> {
    const row = (await tx.query<SourceRow>("SELECT * FROM tactical_sources WHERE id=$1 AND campaign_id=$2", [sourceId, campaignId])).rows[0];
    if (!row || sourceHash(row.source_text) !== row.source_hash || Buffer.byteLength(row.source_text, "utf8") !== Number(row.source_bytes)) throw new Gone(); return row;
  }
  async function getSource(userId: string, campaignId: string, mapId: string, revision?: number) {
    return db.transaction(async tx => { await authorize(tx, userId, campaignId, true); await assertMapActive(tx, campaignId, "tactical", mapId); const map = await mapCard(tx, campaignId, mapId, revision); return source(tx, campaignId, map.sourceId); });
  }
  async function exportMap(userId: string, campaignId: string, mapId: string, revision?: number) {
    const evidence = await db.transaction(async tx => { await authorize(tx, userId, campaignId, true); await assertMapActive(tx, campaignId, "tactical", mapId); const map = await mapCard(tx, campaignId, mapId, revision); return { map, source: await source(tx, campaignId, map.sourceId) }; });
    if (evidence.map.cartography) {
      const drawing = cartographyDraw(evidence.map.document, evidence.map.cartography, evidence.source.provenance.setting ?? "fantasy");
      const rendered = await renderCartographyImage({ image: imageBytes(evidence.source), documentSize: evidence.map.document.geometry.size, drawing });
      const image = inspectUvttImage(rendered.bytes.toString("base64"));
      const document = { ...evidence.map.document, background: { sha256: image.sha256, mimeType: image.mimeType, width: image.width, height: image.height } };
      const exported = exportTacticalUvtt(document, image, evidence.map.cartography);
      await db.transaction(async tx => { await authorize(tx, userId, campaignId, true); await assertMapActive(tx, campaignId, "tactical", mapId); });
      return { ...exported, fidelity: { ...exported.fidelity, sourceRetained: true } };
    }
    return evidence.source.format === "uvtt" ? exportUvtt(importUvtt(evidence.source.source_text, evidence.source.provenance), evidence.map.document)
      : exportTacticalUvtt(evidence.map.document, evidence.source.image_base64 ? inspectUvttImage(evidence.source.image_base64) : null);
  }
  async function reviseMap(userId: string, campaignId: string, mapId: string, raw: unknown) {
    const parsed = parse(P.TacticalRevisionSchema, raw), input = { ...parsed, document: parseTacticalMapDocument(parsed.document) };
    validateServerMap(input.document);
    return command(userId, campaignId, "map", mapId, "map.revise", input, true, async () => {}, async tx => {
      await assertMapActive(tx, campaignId, "tactical", mapId);
      const before = await mapCard(tx, campaignId, mapId); if (input.expectedVersion !== before.version) throw new Conflict();
      const v2 = "schemaVersion" in input && input.schemaVersion === 2;
      if (before.cartography && !v2) throw new TacticalValidationError("Diese Karte benötigt den aktuellen Karteneditor.");
      const cartography = v2 ? parseTacticalCartography(input.cartography, input.document) : undefined;
      if (cartography) validateAuthoredCartography(before, input.document, cartography);
      if (tacticalHash(input.document.background) !== tacticalHash(before.document.background)) throw new TacticalValidationError("Ein anderes Hintergrundbild bitte als neue Karte importieren.");
      const regions = new Set(input.document.geometry.regions.map(region => region.id));
      const entrances = (await activeMapEntrances(tx, campaignId)).filter(edge => edge.parent_kind === "tactical" && edge.parent_map_id === mapId);
      if (entrances.some(entrance => !regions.has(entrance.knoten_id)))
        throw new TacticalValidationError("Ein Raum mit verknüpfter Unterkarte muss als Zugang auf dieser Karte erhalten bleiben.");
      if (cartography) {
        const roles = new Map(cartography.regions.map(region => [region.regionId, region.role])), oldRoles = new Map((before.cartography ?? before.legacyCartography)!.regions.map(region => [region.regionId, region.role]));
        if (entrances.some(entrance => roles.get(entrance.knoten_id) !== oldRoles.get(entrance.knoten_id))) throw new TacticalValidationError("Die Rolle eines Zugangs mit vorhandener Unterkarte bleibt erhalten.");
      }
      const addedBuildings: readonly BuildingIntent[] = v2 ? input.addedBuildings : [];
      if (cartography) {
        const oldIds = new Set(before.document.geometry.regions.map(region => region.id)), roles = new Map(cartography.regions.map(region => [region.regionId, region.role])), seen = new Set<string>();
        const oldRoles = new Map((before.cartography ?? before.legacyCartography)!.regions.map(region => [region.regionId, region.role]));
        const historicalIds = new Set((await tx.query<{ knoten_id: string }>("SELECT knoten_id FROM tactical_map_nodes WHERE campaign_id=$1 AND map_id=$2", [campaignId, mapId])).rows.map(row => row.knoten_id));
        for (const intent of addedBuildings) {
          if (seen.has(intent.regionId) || oldIds.has(intent.regionId) || historicalIds.has(intent.regionId) || roles.get(intent.regionId) !== "building") throw new TacticalValidationError("Neue Gebäude benötigen eine neue, eindeutige Gebäude-Region ohne frühere Knotenidentität.");
          seen.add(intent.regionId);
        }
        for (const region of cartography.regions) if (region.role === "building") {
          if (oldIds.has(region.regionId) && oldRoles.get(region.regionId) !== "building") throw new TacticalValidationError("Ein neues Gebäude benötigt eine neue Gebäude-Region mit Name und Gebäudetyp.");
          if (!oldIds.has(region.regionId) && !seen.has(region.regionId)) throw new TacticalValidationError("Für jedes neue Gebäude werden Name und Gebäudetyp benötigt.");
        }
      }
      const bindings = await validateAnchors(tx, campaignId, input.document, input.anchors), next = before.revision + 1;
      await tx.query("INSERT INTO tactical_map_revisions(map_id,campaign_id,revision,source_id,document,content_hash,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [mapId, campaignId, next, before.sourceId, json(input.document), tacticalHash({ document: input.document, anchors: bindings }), userId, now()]);
      if (cartography) await storeCartography(tx, campaignId, mapId, next, cartography, before.version + 1);
      for (const intent of addedBuildings) {
        const seed = tacticalHash(["chronicle-room-child-v1", campaignId, mapId, intent.regionId]);
        const node: Knoten = { id: intent.regionId as Knoten["id"], art: "bauwerk", titel: intent.titel.trim(), bauwerk: { typ: intent.typ, beschreibung: "" },
          eltern: [], rahmen: input.document.frame, anker: null, sichtAnker: null,
          herkunft: { erzeuger: "chronicle-manual-cartography", version: "1", keimHash: seed, erzeugungspfad: ["building", intent.regionId], kindKeim: seed } };
        await tx.query("INSERT INTO tactical_map_nodes(map_id,knoten_id,campaign_id,data) VALUES($1,$2,$3,$4)", [mapId, intent.regionId, campaignId, json(node)]);
      }
      await storeAnchors(tx, campaignId, mapId, next, bindings); await tx.query("UPDATE tactical_maps SET head_revision=$2,version=version+1 WHERE id=$1", [mapId, next]);
      return { subjectKind: "map", ack: { subjectId: mapId, version: before.version + 1 } };
    });
  }
  async function getPlan(userId: string, campaignId: string, sceneId: string) { return db.transaction(async tx => {
    await authorize(tx, userId, campaignId, true); const saved = await plan(tx, campaignId, sceneId);
    return saved && await isMapDeleted(tx, campaignId, "tactical", saved.mapId) ? { ...saved, unavailable: "map-deleted" as const } : saved;
  }); }
  async function savePlan(userId: string, campaignId: string, sceneId: string, raw: unknown) {
    const parsed = parse(P.TacticalPlanSchema, raw), input = { ...parsed, tokens: sorted(parsed.tokens) };
    return command(userId, campaignId, "scene", sceneId, "plan.save", input, true, async () => {}, async (tx, member) => {
      const old = await plan(tx, campaignId, sceneId); if ((old?.version ?? 0) !== input.expectedVersion) throw new Conflict();
      await assertMapActive(tx, campaignId, "tactical", input.mapId);
      await mapCard(tx, campaignId, input.mapId, input.mapRevision); const ids = new Set<string>();
      for (const token of input.tokens) { if (ids.has(token.id)) throw new TacticalValidationError("Token-IDs müssen eindeutig sein."); ids.add(token.id); await authorizeActor(tx, member, token.actorId); }
      await tx.query(`INSERT INTO scene_tactical_plans(scene_id,campaign_id,map_id,map_revision,updated_by,updated_at) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(scene_id) DO UPDATE SET map_id=EXCLUDED.map_id,map_revision=EXCLUDED.map_revision,version=scene_tactical_plans.version+1,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at`, [sceneId, campaignId, input.mapId, input.mapRevision, userId, now()]);
      await tx.query("DELETE FROM scene_token_plans WHERE scene_id=$1", [sceneId]);
      for (const token of input.tokens) await tx.query("INSERT INTO scene_token_plans(scene_id,campaign_id,token_id,actor_id,x,y,elevation,rotation,scale) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)", [sceneId, campaignId, token.id, token.actorId, token.x, token.y, token.elevation, token.rotation, token.scale]);
      return { subjectKind: "plan", ack: { subjectId: sceneId, version: (old?.version ?? 0) + 1 } };
    });
  }

  async function session(tx: Db, campaignId: string, sessionId: string): Promise<SessionRow> {
    const row = (await tx.query<SessionRow>("SELECT t.*,g.ended_at FROM session_tactical_states t JOIN game_sessions g ON g.id=t.session_id AND g.campaign_id=t.campaign_id WHERE t.session_id=$1 AND t.campaign_id=$2", [sessionId, campaignId])).rows[0];
    if (!row || tacticalHash(row.initial_snapshot) !== row.initial_hash || tacticalHash(row.undo_base_snapshot) !== row.undo_base_hash) throw new Gone(); return row;
  }
  async function ring(tx: Db, sessionId: string): Promise<TransitionRow[]> {
    return (await tx.query<TransitionRow>("SELECT * FROM tactical_transitions WHERE session_id=$1 ORDER BY seq", [sessionId])).rows;
  }
  function candidates(transitions: readonly TransitionRow[], state: TacticalSnapshot): TransitionRow[] {
    const compensated = new Set(transitions.flatMap(t => t.compensates_command_id ? [t.compensates_command_id] : [])), seen = new Set<string>(), result: TransitionRow[] = [];
    for (const t of [...transitions].reverse()) {
      if (t.compensates_command_id || compensated.has(t.command_id)) continue;
      const key = `${t.subject_kind}:${t.subject_id}`; if (seen.has(key)) continue; seen.add(key);
      const current = (t.subject_kind === "token" ? state.tokens : state.portals).find(x => x.id === t.subject_id);
      if (current && sameTacticalValues(current, t.after_state)) result.push(t);
    }
    return result;
  }
  async function currentSnapshot(tx: Db, row: SessionRow): Promise<TacticalSnapshot> {
    return { schemaVersion: 1, map: row.initial_snapshot.map, tokens: await tokens(tx, row.session_id), portals: row.portal_states };
  }
  async function project(tx: Db, member: Membership, row: SessionRow): Promise<P.TacticalView> {
    const map = await mapCard(tx, member.campaignId, row.map_id, row.map_revision), state = await currentSnapshot(tx, row), gm = member.role === "leitung";
    const controlled = new Set(await listControlledActorIds(tx, member));
    const docs = createDocuments(tx, cfg), held = gm ? new Set<string>() : await docs.held(member.campaignId, member.actorId);
    const known = gm ? new Set<string>() : new Set((await tx.query<{ entry_id: string }>("SELECT DISTINCT entry_id FROM passages WHERE campaign_id=$1 AND id=ANY($2::text[]) AND retired_at_revision IS NULL", [member.campaignId, [...held]])).rows.map(r => r.entry_id));
    const lineage = new Map<string, LineageEvent[]>();
    if (!gm) for (const r of (await tx.query<{ entry_id: string; event: LineageEvent }>("SELECT l.entry_id,l.event FROM lineage_events l JOIN entries e ON e.id=l.entry_id WHERE e.campaign_id=$1 ORDER BY l.seq", [member.campaignId])).rows) {
      const events = lineage.get(r.entry_id) ?? []; events.push(r.event); lineage.set(r.entry_id, events);
    }
    const activePassages = gm ? new Set<string>() : new Set((await tx.query<{ id: string }>("SELECT id FROM passages WHERE campaign_id=$1 AND retired_at_revision IS NULL", [member.campaignId])).rows.map(r => r.id));
    // One current decision per bound passage, shared by regions and entities.
    // Scope this cache to the transaction so revocation and reader changes cannot reuse it.
    const passageKnowledge = new Map<string, boolean>();
    function knowsAnchor(a: P.TacticalAnchor): boolean {
      if (gm) return true;
      if (a.passageId === null) return known.has(a.entryId);
      if (!passageKnowledge.has(a.passageId)) {
        const successors = resolvePassage(trustPassageId(a.passageId), lineage.get(a.entryId) ?? []);
        passageKnowledge.set(a.passageId, successors.length > 0 && successors.every(id => activePassages.has(id) && held.has(id)));
      }
      return passageKnowledge.get(a.passageId)!;
    }
    const knownRegions = new Set<string>();
    for (const a of map.anchors) if (a.targetKind === "region" && knowsAnchor(a)) knownRegions.add(a.targetId);
    const regions = map.document.geometry.regions.filter(r => gm || knownRegions.has(r.id)).map(r => ({ id: r.id, points: r.punkte }));
    const titles = new Map((await tx.query<{ id: string; title: string }>("SELECT id,title FROM entries WHERE campaign_id=$1 AND id=ANY($2::text[])", [member.campaignId, [...new Set(map.anchors.filter(a => a.targetKind !== "region" && knowsAnchor(a)).map(a => a.entryId))]])).rows.map(e => [e.id, e.title]));
    const geometry = { stamp: new Map(map.document.geometry.stamps.map(s => [s.id, s])), place: new Map(map.document.geometry.places.map(p => [p.id, p])) };
    const entities: P.TacticalEntity[] = [];
    for (const a of map.anchors) {
      if (a.targetKind === "region" || !knowsAnchor(a)) continue;
      const point = geometry[a.targetKind].get(a.targetId), label = titles.get(a.entryId);
      if (!point || label === undefined || !gm && !visiblePoint({ size: map.document.geometry.size, regions }, point.x, point.y)) continue;
      entities.push({ id: point.id, kind: a.targetKind, x: point.x, y: point.y, entryId: a.entryId, label });
    }
    const party = new Set((await tx.query<{ actor_id: string }>("SELECT actor_id FROM campaign_memberships WHERE campaign_id=$1 AND role='spieler' AND actor_id IS NOT NULL", [member.campaignId])).rows.map(r => r.actor_id));
    const profiles = (await tx.query<{ id: string; name: string; lore_entry_id: string | null; archived_at: string | null }>("SELECT a.id,a.name,p.lore_entry_id,p.archived_at FROM actors a JOIN actor_profiles p ON p.actor_id=a.id AND p.campaign_id=a.campaign_id WHERE a.campaign_id=$1", [member.campaignId])).rows;
    const projected: P.TacticalToken[] = [];
    for (const token of state.tokens) {
      const actor = profiles.find(a => a.id === token.actorId); if (!actor) continue;
      const inRegion = visiblePoint({ size: map.document.geometry.size, regions }, token.x, token.y);
      if (!gm && (!inRegion || !(controlled.has(token.actorId) || party.has(token.actorId) || actor.lore_entry_id !== null && known.has(actor.lore_entry_id)))) continue;
      const canMove = row.ended_at === null && actor.archived_at === null && controlled.has(token.actorId);
      projected.push({ ...token, name: actor.name, canMove, version: canMove ? token.version : null });
    }
    const undoTargets: P.TacticalUndoTarget[] = [];
    if (row.ended_at === null) for (const t of candidates(await ring(tx, row.session_id), state)) {
      if (t.subject_kind === "portal") { if (gm) undoTargets.push({ commandId: t.command_id, subjectKind: "portal", subjectId: t.subject_id, version: state.portals.find(p => p.id === t.subject_id)!.version }); }
      else {
        const token = projected.find(p => p.id === t.subject_id);
        const target = t.before_state as TacticalTokenState;
        if (token?.canMove && (gm || visiblePoint({ size: map.document.geometry.size, regions }, target.x, target.y))) undoTargets.push({ commandId: t.command_id, subjectKind: "token", subjectId: t.subject_id, version: token.version! });
      }
    }
    const cartographyPin = map.cartography ? { mapRevision: map.revision, compositionHash: map.compositionHash, rendererVersion, setting: (await source(tx, member.campaignId, map.sourceId)).provenance.setting ?? "fantasy" } : {};
    const rasterDigest = tacticalHash({ sessionId: row.session_id, perspectiveActorId: gm ? null : member.actorId, gm, size: map.document.geometry.size, regions, ...cartographyPin });
    const view: Omit<P.TacticalView, "digest"> = { sessionId: row.session_id, sceneId: row.scene_id, active: row.ended_at === null, gm, size: map.document.geometry.size, frame: map.document.frame, grid: map.document.grid, elevation: map.document.elevation,
      regions, entities: sorted(entities), tokens: projected, undoTargets, rasterDigest,
      hatRaster: map.document.background !== null || map.cartography !== undefined,
      ...(gm ? { map: { id: map.id, name: map.name, revision: map.revision, version: map.version }, document: map.document, walls: map.document.walls,
        ...(map.cartography ? { cartography: map.cartography, compositionHash: map.compositionHash! } : {}),
        portals: map.document.portals.map(p => ({ ...p, ...state.portals.find(x => x.id === p.id)! })) } : {}) };
    return { ...view, digest: tacticalHash(view) };
  }
  async function getSession(userId: string, campaignId: string, sessionId: string): Promise<P.TacticalView> {
    return db.transaction(async tx => project(tx, await authorize(tx, userId, campaignId), await session(tx, campaignId, sessionId)));
  }
  async function getActive(userId: string, campaignId: string): Promise<P.TacticalView | null> {
    return db.transaction(async tx => { const member = await authorize(tx, userId, campaignId); const row = (await tx.query<{ id: string }>("SELECT t.session_id AS id FROM session_tactical_states t JOIN game_sessions g ON g.id=t.session_id WHERE t.campaign_id=$1 AND g.ended_at IS NULL", [campaignId])).rows[0]; return row ? project(tx, member, await session(tx, campaignId, row.id)) : null; });
  }
  async function append(tx: Db, row: SessionRow, commandId: string, patch: TacticalPatch, compensates: string | null) {
    const seq = Number(row.last_transition_seq) + 1; if (!Number.isSafeInteger(seq)) throw new Conflict();
    if (patch.after.version > 2_147_483_647) throw new Conflict();
    if (patch.subjectKind === "token") {
      const token = patch.after as TacticalTokenState;
      await tx.query("UPDATE tactical_token_states SET x=$3,y=$4,elevation=$5,rotation=$6,scale=$7,version=$8 WHERE session_id=$1 AND token_id=$2", [row.session_id, token.id, token.x, token.y, token.elevation, token.rotation, token.scale, token.version]);
    } else {
      row.portal_states = row.portal_states.map(p => p.id === patch.subjectId ? patch.after as TacticalPortalState : p);
    }
    await tx.query(`INSERT INTO tactical_transitions(session_id,campaign_id,seq,command_id,subject_kind,subject_id,before_state,after_state,compensates_command_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [row.session_id, row.campaign_id, seq, commandId, patch.subjectKind, patch.subjectId, json(patch.before), json(patch.after), compensates, now()]);
    const transitions = await ring(tx, row.session_id); let base = row.undo_base_snapshot, baseSeq = Number(row.base_seq);
    while (transitions.length > TACTICAL_UNDO_LIMIT) {
      const first = transitions.shift()!; if (Number(first.seq) !== baseSeq + 1) throw new Gone();
      base = applyTacticalPatch(base, { subjectKind: first.subject_kind, subjectId: first.subject_id, before: first.before_state, after: first.after_state }); baseSeq++;
      await tx.query("DELETE FROM tactical_transitions WHERE session_id=$1 AND seq=$2", [row.session_id, first.seq]);
    }
    await tx.query("UPDATE session_tactical_states SET portal_states=$2,undo_base_snapshot=$3,undo_base_hash=$4,base_seq=$5,last_transition_seq=$6 WHERE session_id=$1", [row.session_id, json(row.portal_states), json(base), tacticalHash(base), baseSeq, seq]);
  }
  async function tokenAuthority(tx: Db, member: Membership, sessionId: string, tokenId: string) {
    const row = await session(tx, member.campaignId, sessionId), token = (await tokens(tx, sessionId)).find(t => t.id === tokenId); if (!token) throw new Gone();
    await authorizeActor(tx, member, token.actorId, { active: false });
    return { row, token };
  }
  async function moveToken(userId: string, campaignId: string, sessionId: string, tokenId: string, raw: unknown) {
    const input = parse(P.TacticalMoveSchema, raw);
    return command(userId, campaignId, "session", sessionId, "token.move", { ...input, tokenId }, false,
      async (tx, member) => { await tokenAuthority(tx, member, sessionId, tokenId); }, async (tx, member) => {
        const { row, token } = await tokenAuthority(tx, member, sessionId, tokenId);
        if (row.ended_at !== null || token.version !== input.expectedVersion) throw new Conflict();
        await authorizeActor(tx, member, token.actorId);
        const view = await project(tx, member, row);
        if (!view.tokens.some(t => t.id === tokenId && t.canMove) || !view.gm && !visiblePoint(view, input.x, input.y)) throw new Gone();
        const after: TacticalTokenState = { id: token.id, actorId: token.actorId, x: input.x, y: input.y, elevation: input.elevation, rotation: input.rotation, scale: input.scale, version: token.version + 1 };
        if (sameTacticalValues(token, after)) return { subjectKind: "token", ack: { subjectId: tokenId, version: token.version } };
        await append(tx, row, input.commandId, { subjectKind: "token", subjectId: tokenId, before: token, after }, null);
        return { subjectKind: "token", ack: { subjectId: tokenId, version: after.version } };
      });
  }
  async function setPortal(userId: string, campaignId: string, sessionId: string, portalId: string, raw: unknown) {
    const input = parse(P.TacticalPortalSchema, raw);
    return command(userId, campaignId, "session", sessionId, "portal.set", { ...input, portalId }, true,
      async tx => { if (!(await session(tx, campaignId, sessionId)).portal_states.some(p => p.id === portalId)) throw new Gone(); }, async tx => {
        const row = await session(tx, campaignId, sessionId), before = row.portal_states.find(p => p.id === portalId)!;
        if (row.ended_at !== null || before.version !== input.expectedVersion) throw new Conflict();
        if (before.closed === input.closed) return { subjectKind: "portal", ack: { subjectId: portalId, version: before.version } };
        const after = { ...before, closed: input.closed, version: before.version + 1 };
        await append(tx, row, input.commandId, { subjectKind: "portal", subjectId: portalId, before, after }, null);
        return { subjectKind: "portal", ack: { subjectId: portalId, version: after.version } };
      });
  }
  async function undo(userId: string, campaignId: string, sessionId: string, raw: unknown) {
    const input = parse(P.TacticalUndoSchema, raw);
    async function authority(tx: Db, member: Membership) {
      const target = (await tx.query<{ scope_id: string; campaign_id: string; subject_kind: Subject; subject_id: string }>("SELECT scope_id,campaign_id,subject_kind,subject_id FROM tactical_command_receipts WHERE command_id=$1", [input.targetCommandId])).rows[0];
      if (!target || target.campaign_id !== campaignId || target.scope_id !== sessionId || !["token", "portal"].includes(target.subject_kind)) throw new Gone();
      if (target.subject_kind === "portal") { if (member.role !== "leitung") throw new Gone(); }
      else await tokenAuthority(tx, member, sessionId, target.subject_id);
    }
    return command(userId, campaignId, "session", sessionId, "undo", input, false, authority, async (tx, member) => {
      const row = await session(tx, campaignId, sessionId); if (row.ended_at !== null) throw new Conflict();
      const state = await currentSnapshot(tx, row), target = candidates(await ring(tx, sessionId), state).find(t => t.command_id === input.targetCommandId);
      const view = await project(tx, member, row);
      if (!target || !view.undoTargets.some(t => t.commandId === input.targetCommandId)) throw new Conflict();
      const before = (target.subject_kind === "token" ? state.tokens : state.portals).find(t => t.id === target.subject_id)!;
      if (before.version !== input.expectedVersion) throw new Conflict();
      const after = { ...target.before_state, version: before.version + 1 };
      await append(tx, row, input.commandId, { subjectKind: target.subject_kind, subjectId: target.subject_id, before, after }, input.targetCommandId);
      return { subjectKind: target.subject_kind, ack: { subjectId: target.subject_id, version: after.version } };
    });
  }
  function imageBytes(row: SourceRow): Buffer | null {
    if (!row.image_meta) return null;
    const base64 = row.format === "native" ? row.image_base64 : (parseBoundedMapJson(row.source_text, TACTICAL_MAP_LIMITS.sourceBytes) as { image?: string }).image;
    if (!base64) throw new Gone(); return Buffer.from(base64, "base64");
  }
  async function getTile(userId: string, campaignId: string, sessionId: string, level: number, x: number, y: number, expectedView?: string) {
    const input = await db.transaction(async tx => {
      const member = await authorize(tx, userId, campaignId), row = await session(tx, campaignId, sessionId), view = await project(tx, member, row);
      if (expectedView !== undefined && expectedView !== view.rasterDigest) throw new Conflict();
      const map = await mapCard(tx, campaignId, row.map_id, row.map_revision), original = await source(tx, campaignId, map.sourceId);
      return { digest: view.rasterDigest, request: { image: imageBytes(original), documentSize: view.size, regions: view.gm ? null : view.regions.map(r => r.points), level, x, y, tileSize: 256,
        ...(map.cartography ? { drawing: cartographyDraw(map.document, map.cartography, original.provenance.setting ?? "fantasy") } : {}) } };
    });
    const tile = await renderTacticalTile(input.request);
    if ((await getSession(userId, campaignId, sessionId)).rasterDigest !== input.digest) throw new Conflict();
    return { ...tile, view: input.digest };
  }
  async function getMapTile(userId: string, campaignId: string, mapId: string, revision: number | undefined, level: number, x: number, y: number, expectedView?: string, layer?: "background") {
    const input = await db.transaction(async tx => {
      await authorize(tx, userId, campaignId, true); await assertMapActive(tx, campaignId, "tactical", mapId);
      const map = await mapCard(tx, campaignId, mapId, revision);
      if (layer !== undefined && layer !== "background") throw new TacticalValidationError("Bitte eine vorhandene Kartenebene auswählen.");
      const digest = map.rasterDigest ?? map.contentHash;
      if (expectedView !== undefined && expectedView !== digest) throw new Conflict();
      const original = await source(tx, campaignId, map.sourceId);
      const image = imageBytes(original);
      if (layer === "background" && image === null) throw new TacticalValidationError("Diese Karte besitzt kein ursprüngliches Hintergrundbild.");
      return { revision: map.revision, digest, request: { image, documentSize: map.document.geometry.size, regions: null, level, x, y, tileSize: 256,
        ...(layer !== "background" && map.cartography ? { drawing: cartographyDraw(map.document, map.cartography, original.provenance.setting ?? "fantasy") } : {}) } };
    });
    const tile = await renderTacticalTile(input.request);
    const current = await getMap(userId, campaignId, mapId, input.revision);
    if ((current.rasterDigest ?? current.contentHash) !== input.digest) throw new Conflict();
    return { ...tile, view: input.digest, layer: layer ?? "composite" };
  }
  return { importPreview, importMap, listMaps, getMap, getSource, exportMap, reviseMap, getPlan, savePlan, getActive, getSession, moveToken, setPortal, undo, getTile, getMapTile };
}
