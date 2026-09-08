// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle, currentCampaignSemanticDiff, currentCampaignTables } from "@chronicle/io";
import { serializeTacticalMapDocument, tacticalCartographyHash, type TacticalCartographyV1, type TacticalMapDocumentV1 } from "@chronicle/szene";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createTactical, tacticalHash } from "../src/domain/tactical.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { createMapLifecycle } from "../src/domain/map-lifecycle.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";

const config = { origin: "https://map-native-review.test", cookieSecret: "map-native-review-secret-more-than-32-characters", now: Date.now };
const provenance = { name: "Native review fixture", creator: "Tests", sourceUrl: null, license: "CC0-1.0", licenseUrl: null,
  retrievedAt: null, generator: null, generatorVersion: null };
const document = (): TacticalMapDocumentV1 => ({ schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
  frame: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
  geometry: { v: 3, size: [64, 64], stamps: [], places: [], regions: [
    { id: "entrance", punkte: [[4, 4], [28, 4], [28, 28], [4, 28]] },
    { id: "outside", punkte: [[32, 32], [60, 32], [60, 60], [32, 60]] },
  ] }, grid: { kind: "square", size: 8, origin: [0, 0] }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [],
  environment: { bakedLighting: false, ambientLightArgb: "ffffffff" }, background: null });

describe("independent native lifecycle review using actual retained campaign data", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => { await db?.close(); });

  async function fixture() {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Native lifecycle review" })).id;
    const tactical = createTactical(db, config), entering = createBetreten(db, config), lifecycle = createMapLifecycle(db, config);
    const makeMap = async (name: string) => (await tactical.importMap(gm, campaign, { commandId: randomUUID(), name,
      format: "native", sourceText: serializeTacticalMapDocument(document()), provenance })).subjectId;
    const parent = await makeMap("Parent"), first = await makeMap("First interior"), replacement = await makeMap("Replacement interior");
    const firstInput = { commandId: randomUUID(), parentKind: "tactical" as const, parentMapId: parent,
      knotenId: "entrance", expectedVersion: 1, targetMapId: first };
    await entering.betrete(gm, campaign, firstInput);
    const remove = async (id: string) => {
      const reference = { kind: "tactical" as const, id }, preview = await lifecycle.preview(gm, campaign, reference);
      const input = { commandId: randomUUID(), expectedVersion: preview.root.version, confirmationHash: preview.confirmationHash,
        confirmedMapIds: preview.maps.map(map => `${map.kind}:${map.id}`).sort() };
      const ack = await lifecycle.remove(gm, campaign, reference, input);
      return { input, ack };
    };
    const deletion = await remove(first);
    const replacementInput = { ...firstInput, commandId: randomUUID(), targetMapId: replacement,
      expectedVersion: (await tactical.getMap(gm, campaign, parent)).version };
    await entering.betrete(gm, campaign, replacementInput);
    // A genuine later revision lets the tamper probe alter only the current head while
    // preserving the actual creation/deletion entrance evidence in revision one.
    const card = await tactical.getMap(gm, campaign, parent);
    await tactical.reviseMap(gm, campaign, parent, { schemaVersion: 2, commandId: randomUUID(), expectedVersion: card.version,
      document: card.document, anchors: card.anchors, cartography: card.legacyCartography!, addedBuildings: [] });
    return { campaign, parent, first, replacement, tactical, entering, lifecycle, remove, deletion, replacementInput };
  }

  it("restores replacement entrances and preserves the original delete acknowledgement", async () => {
    const f = await fixture(), bundle = await exportCampaignBundle(db, gm, f.campaign);
    expect(bundle.version).toBe(15);
    const target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target); await restoreCampaignBundle(target, bundle);
      const children = await createBetreten(target, config).children(gm, f.campaign, { parentKind: "tactical", parentMapId: f.parent });
      expect(children.nodes.find(node => node.knotenId === "entrance")?.vorhandeneKarteId).toBe(f.replacement);
      expect(await createMapLifecycle(target, config).remove(gm, f.campaign, { kind: "tactical", id: f.first }, f.deletion.input)).toEqual(f.deletion.ack);
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, f.campaign))).toEqual([]);
    } finally { await target.close(); }
  }, 30_000);

  it("rejects a resealed current head with no entrance for its ACTIVE replacement child", async () => {
    const f = await fixture(), bundle = await exportCampaignBundle(db, gm, f.campaign), tables = currentCampaignTables(bundle);
    const head = tables.tactical_maps.find(map => map.id === f.parent)!.head_revision;
    const revisions = tables.tactical_map_revisions.map(row => {
      if (row.map_id !== f.parent || row.revision !== head) return row;
      const before = row.document as unknown as TacticalMapDocumentV1;
      const changed = { ...before, geometry: { ...before.geometry, regions: before.geometry.regions.filter(region => region.id !== "entrance") } };
      return { ...row, document: changed as unknown as CanonicalValue, content_hash: tacticalHash({ document: changed, anchors: [] }) };
    });
    const cartography = tables.tactical_map_cartography.map(row => {
      if (row.map_id !== f.parent || row.map_revision !== head) return row;
      const before = row.document as unknown as TacticalCartographyV1;
      const changed = { ...before, regions: before.regions.filter(region => region.regionId !== "entrance") };
      return { ...row, document: changed as unknown as CanonicalValue, content_hash: tacticalCartographyHash(changed) };
    });
    expect(() => createCurrentCampaignBundle({ campaignId: f.campaign, universeId: bundle.manifest.universeId,
      exportedAt: bundle.manifest.exportedAt, tables: { ...tables, tactical_map_revisions: revisions,
        tactical_map_cartography: cartography } })).toThrow(/current.*parent.*region|active.*entrance/i);
  }, 30_000);

  it("allows the freed entrance to be removed after BOTH historical children were retired", async () => {
    const f = await fixture(); await f.remove(f.replacement);
    const card = await f.tactical.getMap(gm, f.campaign, f.parent);
    const changed = { ...card.document, geometry: { ...card.document.geometry,
      regions: card.document.geometry.regions.filter(region => region.id !== "entrance") } };
    await f.tactical.reviseMap(gm, f.campaign, f.parent, { schemaVersion: 2, commandId: randomUUID(), expectedVersion: card.version,
      document: changed, anchors: [], addedBuildings: [], cartography: { ...card.cartography!,
        regions: card.cartography!.regions.filter(region => region.regionId !== "entrance") } });
    const bundle = await exportCampaignBundle(db, gm, f.campaign), target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target); await restoreCampaignBundle(target, bundle);
      const children = await createBetreten(target, config).children(gm, f.campaign, { parentKind: "tactical", parentMapId: f.parent });
      expect(children.nodes.some(node => node.knotenId === "entrance")).toBe(false);
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, f.campaign))).toEqual([]);
    } finally { await target.close(); }
  }, 30_000);
});
