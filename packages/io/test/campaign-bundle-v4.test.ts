// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV3, parseCampaignBundleV3, serializeCampaignBundleV3 } from "../src/campaign-bundle-v3.ts";
import { CAMPAIGN_V3_TABLES, type CampaignTablesV3 } from "../src/campaign-schema-v3.ts";
import { CAMPAIGN_V4_ADDITIONAL_TABLES, CAMPAIGN_V4_MODULES, CAMPAIGN_V4_TABLES, CAMPAIGN_BUNDLE_V4_JSON_SCHEMA, createCampaignBundleV4, validateCampaignBundleV4, parseCampaignBundleV4, serializeCampaignBundleV4, campaignSemanticDiffV4, upgradeCampaignBundleV3, type CampaignBundleV4 } from "../src/native-v4/index.ts";
import { authoringFixtureV4 } from "./native-v4-fixture.ts";

const hash = (value: unknown) => canonicalHash(value as CanonicalValue);
type Mutable = any;
function rehash(bundle: Mutable): CampaignBundleV4 {
  const core = createCampaignBundleV3({ campaignId: bundle.manifest.campaignId, universeId: bundle.manifest.universeId, exportedAt: bundle.manifest.exportedAt, tables: Object.fromEntries(CAMPAIGN_V3_TABLES.map(table => [table.name, bundle.tables[table.name]])) as unknown as CampaignTablesV3 });
  bundle.manifest.coreContentHash = core.manifest.contentHash; bundle.manifest.contentHash = hash(bundle.tables);
  bundle.manifest.modules = CAMPAIGN_V4_MODULES.map(name => { const specs = CAMPAIGN_V4_TABLES.filter(table => table.module === name); return { name, version: 1, count: specs.reduce((count, table) => count + bundle.tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, bundle.tables[table.name]]))) }; });
  return bundle;
}
describe("native V4 complete authoring evidence", () => {
  let fixture: Awaited<ReturnType<typeof authoringFixtureV4>>, original: CampaignBundleV4;
  beforeAll(async () => { fixture = await authoringFixtureV4(); original = createCampaignBundleV4(fixture.data); }, 30_000);
  const copy = (): Mutable => JSON.parse(JSON.stringify(original));
  const event = (bundle: Mutable, command: string): Mutable => bundle.tables.authoring_events.find((row: Mutable) => row.command_id === command);

  it("roundtrips all seven real domain tables, eight operations, pinned sources and old retry acks", () => {
    expect(CAMPAIGN_V4_ADDITIONAL_TABLES).toHaveLength(7);
    for (const table of CAMPAIGN_V4_ADDITIONAL_TABLES) expect(original.tables[table.name].length, table.name).toBeGreaterThan(0);
    expect(new Set(original.tables.authoring_events.map(row => row.operation)).size).toBe(8);
    const reopened = parseCampaignBundleV4(serializeCampaignBundleV4(original));
    expect(campaignSemanticDiffV4(original, reopened)).toEqual([]);
    expect(reopened.tables.theme_presets[0]).toMatchObject({ head_revision: 3, version: 3 });
    expect(reopened.tables.campaign_theme_pins[0]).toMatchObject({ theme_revision: 2 });
    expect(reopened.tables.campaign_publications[0]).toMatchObject({ theme_revision: 1, version: 6 });
    expect(event(reopened, "theme-create").ack).toEqual({ subjectId: fixture.themeId, version: 1 });
    expect(event(reopened, "entry-unpublish").after_state.enabled).toBe(false);
    const current = reopened.tables.entry_publications.find(row => row.entry_id === fixture.entryId)!;
    expect(current.revision_id).not.toBe(reopened.tables.entries.find(row => row.id === fixture.entryId)!.current_revision_id);
    expect(JSON.stringify(reopened.tables.entry_publications)).toContain("anonymousContributions");
    expect(JSON.stringify(reopened.tables.entry_publications)).toContain(fixture.mintId);
  });

  it("covers every actual SQL012 column including JSON preimages and millisecond bigint units", () => {
    for (const table of CAMPAIGN_V4_ADDITIONAL_TABLES) {
      const actual = fixture.columns.filter(row => row.table_name === table.name);
      expect(actual.map(row => row.column_name).sort()).toEqual([...table.columns].sort());
      expect(actual.filter(row => row.data_type === "bigint").map(row => row.column_name).sort()).toEqual([...table.bigintColumns].sort());
      expect(actual.filter(row => row.data_type === "jsonb").map(row => row.column_name).sort()).toEqual([...table.jsonColumns].sort());
    }
  });

  it("retains V3 bytes and adds no authoring/public state through explicit deterministic upgrade", async () => {
    const bytes = await readFile(new URL("./fixtures/campaign-v3.chronicle", import.meta.url), "utf8"), core = parseCampaignBundleV3(bytes), before = serializeCampaignBundleV3(core);
    const upgraded = upgradeCampaignBundleV3(core);
    expect(upgraded).toEqual(upgradeCampaignBundleV3(core)); expect(upgraded.report.algorithm).toBe("atlas-chronicles/v3-to-v4/empty-authoring@1");
    for (const table of CAMPAIGN_V3_TABLES) expect(upgraded.bundle.tables[table.name]).toEqual(core.tables[table.name]);
    for (const table of CAMPAIGN_V4_ADDITIONAL_TABLES) expect(upgraded.bundle.tables[table.name]).toEqual([]);
    expect(upgraded.bundle.manifest.coreContentHash).toBe(core.manifest.contentHash);
    expect(serializeCampaignBundleV3(core)).toBe(before);
    expect(() => validateCampaignBundleV4(core)).toThrow(); expect(() => upgradeCampaignBundleV3(upgraded.bundle)).toThrow();
    expect(() => parseCampaignBundleV3(serializeCampaignBundleV4(upgraded.bundle))).toThrow();
  });

  it("retains an old public bit without inventing an explicit pin", () => {
    const data = fixture.data, coreTables = Object.fromEntries(CAMPAIGN_V3_TABLES.map(table => [table.name, data.tables[table.name]])) as unknown as CampaignTablesV3;
    const upgraded = upgradeCampaignBundleV3(createCampaignBundleV3({ ...data, tables: coreTables }));
    expect(upgraded.bundle.tables.entries.some(entry => entry.public === true)).toBe(true);
    expect(upgraded.bundle.tables.entry_publications).toEqual([]); expect(upgraded.bundle.tables.campaign_publications).toEqual([]);
  });

  it.each([
    ["unknown column", (b: Mutable) => { b.tables.campaign_publications[0].future = true; }],
    ["missing column", (b: Mutable) => { delete b.tables.authoring_events[0].request; }],
    ["foreign campaign", (b: Mutable) => { b.tables.theme_presets[0].campaign_id = "foreign"; }],
    ["missing historical creator", (b: Mutable) => { b.tables.theme_presets[0].created_by = "missing"; }],
    ["missing immutable revision", (b: Mutable) => { b.tables.theme_preset_revisions.splice(1, 1); }],
    ["inflated head version", (b: Mutable) => { b.tables.theme_presets[0].version = 2147483647; }],
    ["forged contrast report", (b: Mutable) => { b.tables.theme_preset_revisions[0].accessibility_report.pairs[0].ratio = 21; }],
    ["forged theme hash", (b: Mutable) => { b.tables.theme_preset_revisions[0].content_hash = "f".repeat(64); }],
    ["foreign theme pin", (b: Mutable) => { b.tables.campaign_theme_pins[0].theme_id = "unknown"; }],
    ["half public pin", (b: Mutable) => { b.tables.campaign_publications[0].theme_revision = null; }],
    ["unseen passage selection", (b: Mutable) => { b.tables.entry_publications[0].passage_ids = ["unknown-passage"]; }],
    ["cross-entry revision", (b: Mutable) => { b.tables.entry_publications[0].revision_id = b.tables.entry_publications[1].revision_id; }],
    ["fabricated attribution", (b: Mutable) => { const r = b.tables.entry_publications.find((row: Mutable) => row.public_metadata.attributions.length); r.public_metadata.attributions[0].authors.push("Invented author"); }],
    ["fake mint date", (b: Mutable) => { const r = b.tables.entry_publications.find((row: Mutable) => row.public_metadata.mints.length); r.public_metadata.mints[0].date = "1900-01-01"; }],
    ["request preimage", (b: Mutable) => { event(b, "theme-create").request.input.manifest.name = "Changed request"; }],
    ["rehashed mismatching theme request", (b: Mutable) => { const e = event(b, "theme-create"); e.request.input.manifest.name = "Changed request"; e.request_hash = hash(e.request); }],
    ["rehashed route target swap", (b: Mutable) => { const e = event(b, "route-add"); e.request.input.entryId = fixture.importedId; e.request_hash = hash(e.request); }],
    ["rehashed command identity", (b: Mutable) => { const e = event(b, "route-add"); e.request.input.commandId = "other-command"; e.request_hash = hash(e.request); }],
    ["historical ack version", (b: Mutable) => { event(b, "theme-create").ack.version = 3; }],
    ["orphan durable event", (b: Mutable) => { b.tables.authoring_events = b.tables.authoring_events.filter((e: Mutable) => e.command_id !== "theme-revise-2"); }],
    ["missing intermediate policy event", (b: Mutable) => { b.tables.authoring_events = b.tables.authoring_events.filter((e: Mutable) => e.command_id !== "route-remove"); }],
    ["erased unpublish receipt", (b: Mutable) => { b.tables.authoring_events = b.tables.authoring_events.filter((e: Mutable) => e.command_id !== "entry-unpublish"); }],
    ["request expected policy mismatch", (b: Mutable) => { const e = event(b, "entry-publish-1"); e.request.input.expectedPolicyVersion = 6; e.request_hash = hash(e.request); }],
    ["unrecorded route removal", (b: Mutable) => { b.tables.publication_routes = b.tables.publication_routes.filter((r: Mutable) => r.route !== "old-world"); }],
    ["resurrected removed route", (b: Mutable) => { b.tables.publication_routes.push({ ...b.tables.publication_routes[0], kind: "article", route: "temporary-alias", entry_id: fixture.entryId, source_url: null }); }],
    ["unproven legacy host", (b: Mutable) => { b.tables.publication_routes.find((r: Mutable) => r.kind === "legacy").source_url = "https://unproven.example/wiki/Imported_Hall"; }],
    ["noncanonical legacy path", (b: Mutable) => { b.tables.publication_routes.find((r: Mutable) => r.kind === "legacy").route = "/wiki/%49mported_Hall"; }],
  ] as const)("rejects %s after attacker recomputes all container hashes", (_name, mutate) => {
    const changed = copy(); mutate(changed);
    expect(() => validateCampaignBundleV4(rehash(changed))).toThrow();
  });

  it("rejects duplicate/unsafe JSON keys and closes the V4 structural schema", () => {
    const bytes = serializeCampaignBundleV4(original);
    expect(() => parseCampaignBundleV4(bytes.replace('"version":4', '"version":4,"version":4'))).toThrow();
    expect(() => parseCampaignBundleV4(bytes.replace('"version":4', '"version":4,"__proto__":{}'))).toThrow();
    const schema = CAMPAIGN_BUNDLE_V4_JSON_SCHEMA as unknown as { properties: { tables: { additionalProperties: boolean; required: string[] }; manifest: { properties: { coreFormatVersion: { const: number } } } } };
    expect(schema.properties.tables.additionalProperties).toBe(false);
    expect(schema.properties.tables.required).toEqual(CAMPAIGN_V4_TABLES.map(table => table.name));
    expect(schema.properties.manifest.properties.coreFormatVersion.const).toBe(3);
  });

  it("ships the exact generated V4 structural schema", async () => {
    const stored = JSON.parse(await readFile(new URL("../schema/campaign-v4.schema.json", import.meta.url), "utf8"));
    expect(stored).toEqual(CAMPAIGN_BUNDLE_V4_JSON_SCHEMA);
  });
});
