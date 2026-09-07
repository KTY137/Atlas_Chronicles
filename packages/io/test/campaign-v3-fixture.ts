// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { textHash, type CanonicalValue } from "@chronicle/core";
import type { TacticalMapDocumentV1 } from "@chronicle/szene";
import { createCampaignBundleV2 } from "../src/campaign-bundle-v2.ts";
import { upgradeCampaignBundleV2, type CampaignBundleDataV3 } from "../src/campaign-bundle-v3.ts";
import type { CampaignTableNameV3 } from "../src/campaign-schema-v3.ts";
import { campaignFixtureV2 } from "./campaign-v2-fixture.ts";
import { seal, value, TIMESTAMP } from "./campaign-fixture.ts";

export const tacticalAttribution = { name: "Synthetic tactical fixture", creator: "Atlas Chronicles contributors", license: "MIT", sourceUrl: null, licenseUrl: null, retrievedAt: null, generator: null, generatorVersion: null };
export function tacticalDocument(): TacticalMapDocumentV1 {
  return { schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels", frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
    geometry: { v: 3, size: [1024, 1024], stamps: [], regions: [{ id: "room", punkte: [[0, 0], [1024, 0], [1024, 1024], [0, 1024]] }], places: [] },
    grid: { kind: "square", size: 64, origin: [0, 0] }, elevation: 0, geometryElevation: [], walls: [],
    portals: [{ id: "portal", position: [64, 64], bounds: [[64, 32], [64, 96]], rotationRadians: 0, closed: true, freestanding: false, elevation: 0 }],
    lights: [], environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null };
}
export type MutableTablesV3 = Record<CampaignTableNameV3, Record<string, CanonicalValue>[]>;
export function campaignFixtureV3(moves = 53): Omit<CampaignBundleDataV3, "tables"> & { tables: MutableTablesV3 } {
  const core = createCampaignBundleV2(campaignFixtureV2()), upgraded = upgradeCampaignBundleV2(core).bundle;
  const tables = JSON.parse(JSON.stringify(upgraded.tables)) as MutableTablesV3, at = String(TIMESTAMP), document = tacticalDocument(), sourceText = JSON.stringify(document, null, 2) + "\n";
  const anchors = [{ targetKind: "region", targetId: "room", entryId: "entry", passageId: "passage" }], contentHash = seal({ document, anchors });
  tables.tactical_sources = [{ id: "source", campaign_id: "campaign", format: "native", format_version: "1", source_text: sourceText, source_hash: textHash(sourceText), source_bytes: String(Buffer.byteLength(sourceText)), image_base64: null, image_meta: null, provenance: value(tacticalAttribution), fidelity: { version: 1, direction: "import", sourceRetained: true, exactSource: true, nativeRoundTrip: true, counts: { walls: 0, objectBlockers: 0, portals: 1, lights: 0 }, issues: [] }, created_by: "gm", created_at: at }];
  tables.tactical_maps = [{ id: "map", campaign_id: "campaign", name: "The gate", head_revision: 2, version: 2, created_by: "gm", created_at: at }];
  tables.tactical_map_revisions = [1, 2].map(revision => { const doc = { ...document, elevation: revision - 1 }; return { map_id: "map", campaign_id: "campaign", revision, source_id: "source", document: value(doc), content_hash: seal({ document: doc, anchors }), created_by: "gm", created_at: at }; });
  tables.tactical_map_anchors = [1, 2].map(map_revision => ({ map_id: "map", campaign_id: "campaign", map_revision, target_kind: "region", target_id: "room", entry_id: "entry", passage_id: "passage" }));
  tables.scene_tactical_plans = [{ scene_id: "scene", campaign_id: "campaign", map_id: "map", map_revision: 2, version: 2, updated_by: "gm", updated_at: at }];
  tables.scene_token_plans = [{ scene_id: "scene", campaign_id: "campaign", token_id: "token", actor_id: "actor-sera", x: 800, y: 0, elevation: 0, rotation: 0, scale: 1 }];
  const token = (x: number) => ({ id: "token", actorId: "actor-sera", x, y: 0, elevation: 0, rotation: 0, scale: 1, version: x + 1 });
  const snapshot = (x: number) => ({ schemaVersion: 1, map: { id: "map", revision: 1, contentHash }, tokens: [token(x)], portals: [{ id: "portal", closed: true, version: 1 }] });
  const baseSeq = Math.max(0, moves - 50), initial = snapshot(0), base = snapshot(baseSeq);
  tables.session_tactical_states = [{ session_id: "session", campaign_id: "campaign", scene_id: "scene", map_id: "map", map_revision: 1,
    initial_snapshot: value(initial), initial_hash: seal(initial), undo_base_snapshot: value(base), undo_base_hash: seal(base), base_seq: String(baseSeq), last_transition_seq: String(moves),
    portal_states: value(initial.portals), captured_by: "gm", captured_at: at }];
  tables.tactical_token_states = [{ session_id: "session", campaign_id: "campaign", token_id: "token", actor_id: "actor-sera", x: moves, y: 0, elevation: 0, rotation: 0, scale: 1, version: moves + 1 }];
  tables.tactical_command_receipts = [
    { command_id: "import", actor_user_id: "gm", campaign_id: "campaign", scope_kind: "campaign", scope_id: "campaign", subject_kind: "map", subject_id: "map", operation: "map.import", request_hash: "f".repeat(64), ack: { subjectId: "map", version: 1 }, created_at: at },
    { command_id: "revise", actor_user_id: "gm", campaign_id: "campaign", scope_kind: "map", scope_id: "map", subject_kind: "map", subject_id: "map", operation: "map.revise", request_hash: "e".repeat(64), ack: { subjectId: "map", version: 2 }, created_at: at },
    { command_id: "plan", actor_user_id: "gm", campaign_id: "campaign", scope_kind: "scene", scope_id: "scene", subject_kind: "plan", subject_id: "scene", operation: "plan.save", request_hash: "d".repeat(64), ack: { subjectId: "scene", version: 2 }, created_at: at },
  ];
  for (let move = 1; move <= moves; move++) {
    const commandId = `move-${move}`, input = { commandId, expectedVersion: move, x: move, y: 0, elevation: 0, rotation: 0, scale: 1, tokenId: "token" };
    tables.tactical_command_receipts.push({ command_id: commandId, actor_user_id: "sera", campaign_id: "campaign", scope_kind: "session", scope_id: "session", subject_kind: "token", subject_id: "token", operation: "token.move", request_hash: seal({ campaignId: "campaign", actorUserId: "sera", scopeKind: "session", scopeId: "session", operation: "token.move", input }), ack: { subjectId: "token", version: move + 1 }, created_at: String(TIMESTAMP + 1) });
    if (move > baseSeq) tables.tactical_transitions.push({ session_id: "session", campaign_id: "campaign", seq: String(move), command_id: commandId, subject_kind: "token", subject_id: "token", before_state: token(move - 1), after_state: token(move), compensates_command_id: null, created_at: at });
  }
  return { campaignId: core.manifest.campaignId, universeId: core.manifest.universeId, exportedAt: core.manifest.exportedAt, tables };
}
