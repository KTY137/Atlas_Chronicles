import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE, defaultActorFields } from "@chronicle/rules";
import { createCampaignBundle, serializeCampaignBundle, validateCampaignBundle } from "../src/campaign-bundle.ts";
import { createCampaignBundleV2, validateCampaignBundleV2, serializeCampaignBundleV2, parseCampaignBundleV2, upgradeCampaignBundleV1, campaignSemanticDiffV2 } from "../src/campaign-bundle-v2.ts";
import { CAMPAIGN_TABLES } from "../src/campaign-schema.ts";
import { CAMPAIGN_BUNDLE_V2_JSON_SCHEMA } from "../src/campaign-schema-v2.ts";
import { campaignEvidenceFixture, seal } from "./campaign-fixture.ts";
import { campaignFixtureV2 } from "./campaign-v2-fixture.ts";

describe("additive native campaign v2", () => {
  it("roundtrips actor and item instances, immutable definitions and durable retry cards", () => {
    const bundle = createCampaignBundleV2(campaignFixtureV2());
    expect(campaignSemanticDiffV2(bundle, parseCampaignBundleV2(serializeCampaignBundleV2(bundle)))).toEqual([]);
    expect(bundle.tables.item_instances[0]!.holder_actor_id).toBe("companion");
    expect(bundle.manifest.modules).toHaveLength(10);
  });
  it("keeps the original v1 parser, core modules and historical seal bytes intact", () => {
    const source = createCampaignBundle(campaignEvidenceFixture()), upgraded = upgradeCampaignBundleV1(source);
    expect(upgraded.bundle.manifest.coreContentHash).toBe(source.manifest.contentHash);
    expect(upgraded.bundle.manifest.modules.slice(0, 8)).toEqual(source.manifest.modules);
    for (const table of CAMPAIGN_TABLES) expect(upgraded.bundle.tables[table.name]).toEqual(source.tables[table.name]);
    expect(serializeCampaignBundle(validateCampaignBundle(source))).toBe(serializeCampaignBundle(source));
    expect(() => validateCampaignBundle(upgraded.bundle)).toThrow(/migration/);
    expect(() => validateCampaignBundleV2(source)).toThrow();
  });
  it("upgrades only exact legacy authorization and leaves unknown historical provenance null", () => {
    const data = campaignEvidenceFixture();
    data.tables.actors.push({ id: "extra\nlegacy-id", campaign_id: "campaign", user_id: "sera", name: "Unbound historical NPC" });
    data.tables.campaign_memberships[2]!.role = "beobachter";
    const source = createCampaignBundle(data), first = upgradeCampaignBundleV1(source), second = upgradeCampaignBundleV1(source);
    expect(first).toEqual(second);
    expect(first.bundle.tables.actor_profiles.find(row => row.actor_id === "extra\nlegacy-id")).toMatchObject({ kind: "unspecified", created_by: null, created_at: null });
    expect(first.bundle.tables.actor_controllers).toHaveLength(1);
    expect(first.bundle.tables.actor_controllers[0]).toMatchObject({ actor_id: "actor-sera", user_id: "sera", granted_by: null, granted_at: null });
    expect(first.bundle.tables.reader_perspectives.find(row => row.user_id === "brannt")).toMatchObject({ actor_id: null, updated_at: null });
    expect(first.report.sourceContentHash).toBe(source.manifest.contentHash);
    expect(first.report.targetContentHash).toBe(first.bundle.manifest.contentHash);
    expect(first.bundle.tables.actor_inventory_events).toEqual([]);
  });
  it.each([
    ["unknown future table", (d: ReturnType<typeof campaignFixtureV2>) => Object.assign(d.tables, { tactical_sessions: [] })],
    ["unknown durable column", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.actor_profiles[0]!.future = true; }],
    ["cross campaign", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.item_instances[0]!.campaign_id = "elsewhere"; }],
    ["missing holder", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.item_instances[0]!.holder_actor_id = "missing"; }],
    ["missing profile", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.actor_profiles.splice(0, 1); }],
    ["partial provenance", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.actor_profiles[0]!.created_by = "gm"; }],
    ["partial template pin", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.actor_profiles[0]!.template_id = "actor-template"; }],
    ["unknown state key", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.item_instances[0]!.state = { quantity: 1, notes: "", equipped: false, script: "run" }; }],
    ["unbounded quantity", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.item_instances[0]!.state = { quantity: 1000001, notes: "", equipped: false }; }],
    ["bad definition hash", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.item_template_revisions[0]!.content_hash = "a".repeat(64); }],
    ["unknown definition schema", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.item_template_revisions[0]!.definition = { schemaVersion: 2 }; }],
    ["duplicate durable command", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.actor_inventory_events.push({ ...d.tables.actor_inventory_events[0]!, id: "another-event" }); }],
    ["unknown receipt field", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.actor_inventory_events[0]!.result = { fabricated: true }; }],
    ["request hash mismatch", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.actor_inventory_events[0]!.request_hash = "a".repeat(64); }],
    ["forged request with recomputed hash", (d: ReturnType<typeof campaignFixtureV2>) => {
      const row = d.tables.actor_inventory_events[0]!;
      row.request = { campaignId: "campaign", operation: "item.instantiate", subjectId: null, input: { commandId: "create-lantern", templateId: "item-template", templateRevision: 1, holderActorId: null } };
      row.request_hash = seal(row.request);
    }],
    ["missing immutable revision", (d: ReturnType<typeof campaignFixtureV2>) => { d.tables.item_templates[0]!.head_revision = 2; }],
  ])("rejects %s independently of a freshly recomputed outer hash", (_name, mutate) => {
    const data = campaignFixtureV2(); mutate(data); expect(() => createCampaignBundleV2(data)).toThrow();
  });
  it("retains historical item cards after later custody/state changes and revoked saved perspectives", () => {
    const data = campaignFixtureV2();
    data.tables.item_instances[0]!.holder_actor_id = null; data.tables.item_instances[0]!.state = { quantity: 4, notes: "Later", equipped: true }; data.tables.item_instances[0]!.version = 2;
    data.tables.reader_perspectives[1]!.actor_id = "companion";
    data.tables.actor_controllers.find(row => row.actor_id === "companion")!.revoked_at = "1788696000001";
    expect(() => createCampaignBundleV2(data)).not.toThrow();
  });
  it("validates old template pins after a newer immutable definition is authored", () => {
    const data = campaignFixtureV2(), first = data.tables.item_template_revisions[0]!;
    const definition = { schemaVersion: 1, name: "A new lantern", loreEntryId: null, tags: [] };
    data.tables.item_template_revisions.push({ ...first, revision: 2, definition, content_hash: seal(definition) });
    data.tables.item_templates[0]!.head_revision = 2; data.tables.item_templates[0]!.version = 2;
    expect(() => createCampaignBundleV2(data)).not.toThrow();
  });
  it("preserves normalized actor defaults at the unchanged rule v1 field limits", () => {
    const data = campaignFixtureV2(), fieldName = `lore-${"x".repeat(91)}`;
    const pkg = { ...DEMO_RULE_PACKAGE, id: "custom.actor-fields", fields: { ...DEMO_RULE_PACKAGE.fields, [fieldName]: { type: "string" as const, label: "Long historical note", maxLength: 4096, default: "x".repeat(4096) } } };
    data.tables.rule_packages.push({ ...data.tables.rule_packages[0]!, package_id: pkg.id, document: JSON.parse(JSON.stringify(pkg)), content_hash: seal(pkg) });
    const definition = { schemaVersion: 1, name: "Companion", kind: "companion", loreEntryId: "entry", package: { id: pkg.id, version: pkg.version }, fields: defaultActorFields(pkg) };
    data.tables.actor_template_revisions[0]!.definition = definition;
    data.tables.actor_template_revisions[0]!.content_hash = seal(definition);
    expect(() => createCampaignBundleV2(data)).not.toThrow();
  });
  it.each(["actor.update", "actor.archive"])("rejects an impossible %s receipt that rewrites unrelated historical fields", operation => {
    const data = campaignFixtureV2(), reason = "An explicit change";
    const before = { id: "companion", campaignId: "campaign", name: "Ash", kind: "companion", version: 1, archivedAt: null, loreEntryId: "entry", template: { id: "actor-template", revision: 1 }, canControl: true, canReadAs: true };
    const after = { ...before, version: 2, ...(operation === "actor.update" ? { name: "Ash renamed" } : { archivedAt: 1788696000000, canControl: false, canReadAs: false }) };
    const input = { commandId: operation, expectedVersion: 1, reason, ...(operation === "actor.update" ? { name: after.name, kind: after.kind, loreEntryId: after.loreEntryId } : {}) };
    const request = { campaignId: "campaign", operation, subjectId: "companion", input };
    const event = { id: operation, campaign_id: "campaign", actor_user_id: "gm", operation, subject_id: "companion", command_id: operation, request, request_hash: seal(request), before_state: before, after_state: after, result: after, reason, created_at: "1788696000000" };
    data.tables.actor_inventory_events.push(event);
    expect(() => createCampaignBundleV2(data)).not.toThrow();
    if (operation === "actor.update") Object.assign(after, { template: null });
    else after.name = "Forged during archive";
    expect(() => createCampaignBundleV2(data)).toThrow(/outside its declared operation/);
  });
  it("rejects ambiguous JSON and forged manifests without invoking accessors", () => {
    const bundle = createCampaignBundleV2(campaignFixtureV2()), text = serializeCampaignBundleV2(bundle);
    expect(() => parseCampaignBundleV2(text.replace('"version":2', '"version":2,"version":2'))).toThrow(/duplicate JSON key/);
    expect(() => validateCampaignBundleV2({ ...bundle, manifest: { ...bundle.manifest, coreContentHash: "a".repeat(64) } })).toThrow(/checksum/);
    const data = campaignFixtureV2(); Object.defineProperty(data.tables.item_instances[0], "state", { enumerable: true, get() { throw new Error("getter ran"); } });
    expect(() => createCampaignBundleV2(data)).toThrow(/accessors/);
  });
  it("publishes the structural schema and a portable native v2 fixture", async () => {
    expect(JSON.parse(await readFile(new URL("../schema/campaign-v2.schema.json", import.meta.url), "utf8"))).toEqual(CAMPAIGN_BUNDLE_V2_JSON_SCHEMA);
    const fixture = parseCampaignBundleV2(await readFile(new URL("./fixtures/campaign-v2.chronicle", import.meta.url), "utf8"));
    expect(campaignSemanticDiffV2(fixture, createCampaignBundleV2(campaignFixtureV2()))).toEqual([]);
  });
});
