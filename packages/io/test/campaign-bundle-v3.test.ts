// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { textHash } from "@chronicle/core";
import { importUvtt } from "@chronicle/forge";
import { createCampaignBundleV2, serializeCampaignBundleV2, validateCampaignBundleV2 } from "../src/campaign-bundle-v2.ts";
import { createCampaignBundleV3, validateCampaignBundleV3, serializeCampaignBundleV3, parseCampaignBundleV3, campaignSemanticDiffV3, upgradeCampaignBundleV2 } from "../src/campaign-bundle-v3.ts";
import { CAMPAIGN_V2_TABLES } from "../src/campaign-schema-v2.ts";
import { CAMPAIGN_V3_ADDITIONAL_TABLES, CAMPAIGN_BUNDLE_V3_JSON_SCHEMA } from "../src/campaign-schema-v3.ts";
import { CAMPAIGN_BUNDLE_V3_LIMITS } from "../src/campaign-v3-limits.ts";
import { tacticalJson } from "../src/campaign-v3-json.ts";
import { campaignFixtureV2 } from "./campaign-v2-fixture.ts";
import { campaignFixtureV3, tacticalAttribution } from "./campaign-v3-fixture.ts";
import { seal, value } from "./campaign-fixture.ts";

describe("native campaign v3 tactical state and bounded receipts", () => {
  it("preserves the immutable v2 core through an explicit deterministic empty upgrade", () => {
    const core = createCampaignBundleV2(campaignFixtureV2()), before = serializeCampaignBundleV2(core), upgraded = upgradeCampaignBundleV2(core);
    expect(upgraded).toEqual(upgradeCampaignBundleV2(core));
    expect(upgraded.bundle.manifest).toMatchObject({ coreFormatVersion: 2, tacticalMapSchemaVersion: 1, coreContentHash: core.manifest.contentHash, assetMode: "source-artifacts-and-tactical-sources" });
    expect(upgraded.bundle.manifest.modules.slice(0, 10)).toEqual(core.manifest.modules);
    for (const table of CAMPAIGN_V2_TABLES) expect(upgraded.bundle.tables[table.name]).toEqual(core.tables[table.name]);
    for (const table of CAMPAIGN_V3_ADDITIONAL_TABLES) expect(upgraded.bundle.tables[table.name]).toEqual([]);
    expect(serializeCampaignBundleV2(validateCampaignBundleV2(core))).toBe(before);
    expect(() => validateCampaignBundleV2(upgraded.bundle)).toThrow(); expect(() => validateCampaignBundleV3(core)).toThrow();
    expect(upgraded.report.addedRows).toHaveLength(10);
  });
  it("roundtrips pinned plans, a distinct original/base/current snapshot and permanent old receipts", () => {
    const bundle = createCampaignBundleV3(campaignFixtureV3());
    expect(bundle.tables.tactical_transitions).toHaveLength(50);
    expect(bundle.tables.tactical_command_receipts.find(row => row.command_id === "move-1")!.ack).toEqual({ subjectId: "token", version: 2 });
    expect(bundle.tables.tactical_transitions.some(row => row.command_id === "move-1")).toBe(false);
    expect(bundle.tables.session_tactical_states[0]).toMatchObject({ base_seq: "3", last_transition_seq: "53", map_revision: 1 });
    expect(bundle.tables.scene_tactical_plans[0]!.map_revision).toBe(2);
    expect(campaignSemanticDiffV3(bundle, parseCampaignBundleV3(serializeCampaignBundleV3(bundle)))).toEqual([]);
  });
  it.each([
    ["unknown table", (d: ReturnType<typeof campaignFixtureV3>) => Object.assign(d.tables, { future_tactical: [] })],
    ["extra column", (d: ReturnType<typeof campaignFixtureV3>) => { d.tables.tactical_maps[0]!.future = true; }],
    ["source checksum", (d: ReturnType<typeof campaignFixtureV3>) => { d.tables.tactical_sources[0]!.source_hash = "a".repeat(64); }],
    ["source byte length", (d: ReturnType<typeof campaignFixtureV3>) => { d.tables.tactical_sources[0]!.source_bytes = "1"; }],
    ["anchor passage entry", (d: ReturnType<typeof campaignFixtureV3>) => { d.tables.tactical_map_anchors[0]!.entry_id = "missing"; }],
    ["anchor geometry", (d: ReturnType<typeof campaignFixtureV3>) => { d.tables.tactical_map_anchors[0]!.target_id = "missing"; }],
    ["cross campaign", (d: ReturnType<typeof campaignFixtureV3>) => { d.tables.tactical_token_states[0]!.campaign_id = "elsewhere"; }],
    ["base hash", (d: ReturnType<typeof campaignFixtureV3>) => { d.tables.session_tactical_states[0]!.undo_base_hash = "a".repeat(64); }],
    ["ring gap", (d: ReturnType<typeof campaignFixtureV3>) => { d.tables.tactical_transitions.splice(1, 1); }],
    ["missing permanent receipt", (d: ReturnType<typeof campaignFixtureV3>) => { d.tables.tactical_command_receipts.splice(-1, 1); }],
    ["forged retained request hash", (d: ReturnType<typeof campaignFixtureV3>) => { d.tables.tactical_command_receipts.at(-1)!.request_hash = "a".repeat(64); }],
    ["current pose differs from replay", (d: ReturnType<typeof campaignFixtureV3>) => { d.tables.tactical_token_states[0]!.x = 90; }],
    ["position data in minimal ack", (d: ReturnType<typeof campaignFixtureV3>) => { d.tables.tactical_command_receipts[0]!.ack = { subjectId: "map", version: 1, x: 0 }; }],
    ["zero scale", (d: ReturnType<typeof campaignFixtureV3>) => { d.tables.scene_token_plans[0]!.scale = 0; }],
  ])("rejects %s with freshly generated outer hashes", (_name, mutate) => { const data = campaignFixtureV3(); mutate(data); expect(() => createCampaignBundleV3(data)).toThrow(); });
  it("allows no-op acknowledgement duplicates without letting them replace a missing live version", () => {
    const data = campaignFixtureV3(), first = data.tables.tactical_command_receipts.find(row => row.command_id === "move-1")!;
    data.tables.tactical_command_receipts.push({ ...first, command_id: "old-noop", request_hash: "c".repeat(64) });
    expect(() => createCampaignBundleV3(data)).not.toThrow();
    data.tables.tactical_command_receipts = data.tables.tactical_command_receipts.filter(row => row.command_id !== "move-2");
    expect(() => createCampaignBundleV3(data)).toThrow(/durable acknowledgement/);
  });
  it("rejects an unproven large version without iterating the declared version range", () => {
    const data = campaignFixtureV3(), session = data.tables.session_tactical_states[0]!, current = data.tables.tactical_token_states[0]!;
    const base = session.undo_base_snapshot as { tokens: { version: number; x: number }[] };
    current.version = 2_147_483_647; base.tokens[0]!.version = 2_147_483_647; base.tokens[0]!.x = Number(current.x);
    session.undo_base_hash = seal(base); session.base_seq = "2147483646"; session.last_transition_seq = "2147483646";
    data.tables.tactical_transitions = [];
    expect(() => createCampaignBundleV3(data)).toThrow(/durable acknowledgement/);
  });
  it("does not claim reconstruction of discarded positions or discarded request preimages", () => {
    const data = campaignFixtureV3(); data.tables.tactical_command_receipts.find(row => row.command_id === "move-1")!.request_hash = "b".repeat(64);
    expect(() => createCampaignBundleV3(data)).not.toThrow();
  });
  it("checks initial snapshots even when a consistent suffix and rolling base survive", () => {
    const data = campaignFixtureV3(), row = data.tables.session_tactical_states[0]!, initial = row.initial_snapshot as { tokens: { version: number }[] };
    initial.tokens[0]!.version = 2; row.initial_hash = seal(initial);
    expect(() => createCampaignBundleV3(data)).toThrow(/initial/);
  });
  it("validates an undo whose own acceptance pruned its original target from the ring", () => {
    const data = campaignFixtureV3(49), session = data.tables.session_tactical_states[0]!, initial = session.initial_snapshot as { portals: { id: string; closed: boolean; version: number }[] };
    const base = JSON.parse(JSON.stringify(initial)); base.portals[0] = { id: "portal", closed: false, version: 2 };
    session.undo_base_snapshot = value(base); session.undo_base_hash = seal(base); session.base_seq = "1"; session.last_transition_seq = "51";
    session.portal_states = [{ id: "portal", closed: true, version: 3 }];
    for (const row of data.tables.tactical_transitions) row.seq = String(Number(row.seq) + 1);
    const addReceipt = (commandId: string, operation: string, input: unknown, version: number) => data.tables.tactical_command_receipts.push({ command_id: commandId, actor_user_id: "gm", campaign_id: "campaign", scope_kind: "session", scope_id: "session", subject_kind: "portal", subject_id: "portal", operation,
      request_hash: seal({ campaignId: "campaign", actorUserId: "gm", scopeKind: "session", scopeId: "session", operation, input }), ack: { subjectId: "portal", version }, created_at: "1788696000000" });
    addReceipt("portal-first", "portal.set", { commandId: "portal-first", expectedVersion: 1, closed: false, portalId: "portal" }, 2);
    addReceipt("portal-compensate", "undo", { commandId: "portal-compensate", expectedVersion: 2, targetCommandId: "portal-first" }, 3);
    data.tables.tactical_transitions.push({ session_id: "session", campaign_id: "campaign", seq: "51", command_id: "portal-compensate", subject_kind: "portal", subject_id: "portal", before_state: { id: "portal", closed: false, version: 2 }, after_state: { id: "portal", closed: true, version: 3 }, compensates_command_id: "portal-first", created_at: "1788696000000" });
    expect(createCampaignBundleV3(data).tables.tactical_transitions).toHaveLength(50);
    data.tables.tactical_command_receipts.find(row => row.command_id === "portal-first")!.subject_id = "token";
    expect(() => createCampaignBundleV3(data)).toThrow();
  });
  it("rejects duplicate JSON keys and unsupported manifest semantics", () => {
    const bundle = createCampaignBundleV3(campaignFixtureV3()), serialized = serializeCampaignBundleV3(bundle);
    expect(() => parseCampaignBundleV3(serialized.replace('"version":3', '"version":3,"version":3'))).toThrow(/duplicate/);
    expect(() => validateCampaignBundleV3({ ...bundle, manifest: { ...bundle.manifest, assetMode: "source-artifacts-only" } })).toThrow(/migration/);
  });
  it("retains exact UVTT source text, metadata and unknown source-only fields", () => {
    const data = campaignFixtureV3(), sourceText = '{"format":0.3,"resolution":{"map_origin":{"x":0,"y":0},"map_size":{"x":1,"y":1},"pixels_per_grid":1},"sourceOnly":{"attribution":"kept"}}\n', imported = importUvtt(sourceText, tacticalAttribution);
    data.tables.tactical_sources.push({ ...data.tables.tactical_sources[0]!, id: "uvtt", format: "uvtt", format_version: "0.3", source_text: sourceText, source_hash: textHash(sourceText), source_bytes: String(Buffer.byteLength(sourceText)), fidelity: value(imported.fidelity), image_meta: null });
    const bundle = parseCampaignBundleV3(serializeCampaignBundleV3(createCampaignBundleV3(data)));
    expect(bundle.tables.tactical_sources.find(row => row.id === "uvtt")!.source_text).toBe(sourceText);
    data.tables.tactical_sources.at(-1)!.image_base64 = "AAAA";
    expect(() => createCampaignBundleV3(data)).toThrow(/duplicate/);
  });
  it("roundtrips the licensed real UVTT fixture with its embedded image stored exactly once", async () => {
    const text = await readFile(new URL("../../forge/test/fixtures/uvtt/sampleMap.dd2vtt", import.meta.url), "utf8"), attribution = JSON.parse(await readFile(new URL("../../forge/test/fixtures/uvtt/provenance.json", import.meta.url), "utf8"));
    const imported = importUvtt(text, attribution.provenance), data = campaignFixtureV3(0), { base64: _base64, ...meta } = imported.image!;
    data.tables.tactical_sources.push({ ...data.tables.tactical_sources[0]!, id: "real-uvtt", format: "uvtt", format_version: String(imported.source.formatVersion), source_text: text, source_hash: imported.source.sha256, source_bytes: String(imported.source.bytes), provenance: value(imported.source.provenance), fidelity: value(imported.fidelity), image_base64: null, image_meta: value(meta) });
    data.tables.tactical_maps.push({ ...data.tables.tactical_maps[0]!, id: "real-map", head_revision: 1, version: 1 });
    data.tables.tactical_map_revisions.push({ ...data.tables.tactical_map_revisions[0]!, map_id: "real-map", source_id: "real-uvtt", document: value(imported.document), content_hash: textHash(tacticalJson({ document: imported.document, anchors: [] })) });
    const reparsed = parseCampaignBundleV3(serializeCampaignBundleV3(createCampaignBundleV3(data))), source = reparsed.tables.tactical_sources.find(row => row.id === "real-uvtt")!;
    expect(source.source_text).toBe(text); expect(source.image_base64).toBeNull(); expect(source.image_meta).toEqual(meta);
  });
  it("publishes a standalone structural schema and portable v3 fixture", async () => {
    expect(JSON.parse(await readFile(new URL("../schema/campaign-v3.schema.json", import.meta.url), "utf8"))).toEqual(CAMPAIGN_BUNDLE_V3_JSON_SCHEMA);
    const fixture = parseCampaignBundleV3(await readFile(new URL("./fixtures/campaign-v3.chronicle", import.meta.url), "utf8"));
    expect(campaignSemanticDiffV3(fixture, createCampaignBundleV3(campaignFixtureV3()))).toEqual([]);
    expect(CAMPAIGN_BUNDLE_V3_LIMITS.bytes).toBe(256 * 1024 * 1024);
  });
});
