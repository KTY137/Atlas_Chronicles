import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV4, validateCampaignBundleV4 } from "../src/native-v4/bundle.ts";
import { createCampaignBundleV5, validateCampaignBundleV5, serializeCampaignBundleV5, parseCampaignBundleV5, campaignSemanticDiffV5, upgradeCampaignBundleV4, createCurrentCampaignBundle, parseCurrentCampaignBundle, CAMPAIGN_BUNDLE_V5_JSON_SCHEMA } from "../src/native-v5/index.ts";
import { campaignFixtureV5 } from "./campaign-v5-fixture.ts";
import { seal, TIMESTAMP } from "./campaign-fixture.ts";
const hash = (value: unknown) => canonicalHash(value as CanonicalValue);

describe("explicit native v5 supported-rules profile", () => {
  it("roundtrips mixed frozen receipts, computed sheets and complete actor definition history", () => {
    const input = campaignFixtureV5(), bundle = createCampaignBundleV5(input);
    const reopened = parseCampaignBundleV5(serializeCampaignBundleV5(bundle));
    expect(campaignSemanticDiffV5(bundle, reopened)).toEqual([]);
    expect(reopened.tables.action_rolls.map(row => (row.receipt as any).schemaVersion)).toEqual([1, 2]);
    expect(reopened.tables.actor_inventory_events).toEqual(bundle.tables.actor_inventory_events);
    expect(parseCurrentCampaignBundle(serializeCampaignBundleV5(bundle)).version).toBe(5);
  });
  it("chooses v5 for an installed inactive package while old constructors remain strict", () => {
    const input = campaignFixtureV5(false);
    expect(createCurrentCampaignBundle(input).version).toBe(5);
    expect(() => createCampaignBundleV4(input)).toThrow(/version|package|migration/);
    expect(() => validateCampaignBundleV4(createCampaignBundleV5(input))).toThrow(/migration/);
    input.tables.rule_packages.pop();
    expect(createCurrentCampaignBundle(input).version).toBe(4);
  });
  it("explicitly upgrades only the envelope, preserving all old package and receipt bytes", () => {
    const input = campaignFixtureV5(false); input.tables.rule_packages.pop();
    const old = createCampaignBundleV4(input), upgraded = upgradeCampaignBundleV4(old);
    expect(upgraded.bundle.tables).toEqual(old.tables);
    expect(upgraded.report.sourceContentHash).toBe(upgraded.report.targetContentHash);
    expect(upgraded.report.sourceBundleHash).not.toBe(upgraded.report.targetBundleHash);
    expect(upgraded.report.changedTables).toEqual([]);
    const { reportHash, ...body } = upgraded.report; expect(reportHash).toBe(hash(body));
    expect(() => upgradeCampaignBundleV4(upgraded.bundle)).toThrow(/migration/);
  });
  it.each(["attribution", "computed"])("binds the supplied original receipt to an altered %s even with recomputed package hashes", part => {
    const input = campaignFixtureV5(), row = input.tables.rule_packages[1]!, pkg = row.document as any;
    if (part === "attribution") pkg.attribution.notice += " altered";
    else pkg.computed.find((field: any) => field.id === "points_available").expression = "999";
    row.content_hash = seal(pkg);
    expect(() => createCampaignBundleV5(input)).toThrow(/replay/);
  });
  it("rejects receipt classification edits even after recomputing the receipt checksum", () => {
    const input = campaignFixtureV5(), row = input.tables.action_rolls[1]!;
    (row.receipt as any).outcome.success = !(row.receipt as any).outcome.success; row.receipt_hash = seal(row.receipt);
    expect(() => createCampaignBundleV5(input)).toThrow(/replay/);
  });
  it("enforces package constraints on stored fields", () => {
    const input = campaignFixtureV5(); (input.tables.actor_sheets[0]!.fields as any).gbp_spent_handeln = 24;
    expect(() => createCampaignBundleV5(input)).toThrow(/fields/);
  });
  it("enforces package constraints inside historical actor requests", () => {
    const input = campaignFixtureV5(), event = input.tables.actor_inventory_events[1]!;
    const request = JSON.parse(JSON.stringify(event.request)); request.input.definition.fields.gbp_spent_handeln = 24;
    event.request = request; event.request_hash = seal(request);
    expect(() => createCampaignBundleV5(input)).toThrow(/definition.fields/);
  });
  it("rejects a never-consumed threshold authorization over a classified action", () => {
    const input = campaignFixtureV5(), pkg = input.tables.rule_packages[1]!;
    input.tables.action_vollmachten.push({ id: "unused-authorization", campaign_id: "campaign", actor_id: "actor-sera", passage_id: "passage", passage_hash: "a".repeat(64), package_id: pkg.package_id!, package_version: pkg.version!, action_id: "aptitude_handeln", threshold: 0, fixed_input: {}, fiction_date: "Day 1", issued_by: "gm", issued_at: String(TIMESTAMP), expires_at: String(TIMESTAMP + 60_000), repeatable: false, budget_kind: "player", status: "offen", consumed_roll_id: null, revoked_at: null, version: 1, command_id: "authorization-command", request_hash: "b".repeat(64) });
    expect(() => createCampaignBundleV5(input)).toThrow(/threshold authorization/);
  });
  it("closes the envelope, rejects duplicates and verifies complete checksums", () => {
    const bundle = createCampaignBundleV5(campaignFixtureV5());
    expect(() => validateCampaignBundleV5({ ...bundle, manifest: { ...bundle.manifest, coreFormatVersion: 3 } })).toThrow(/unknown field/);
    expect(() => validateCampaignBundleV5({ ...bundle, manifest: { ...bundle.manifest, contentHash: "0".repeat(64) } })).toThrow(/checksum/);
    expect(() => parseCampaignBundleV5(serializeCampaignBundleV5(bundle).replace('"version":5', '"version":5,"version":5'))).toThrow();
  });
  it("ships the exact closed structural schema", async () => {
    expect(JSON.parse(await readFile(new URL("../schema/campaign-v5.schema.json", import.meta.url), "utf8"))).toEqual(CAMPAIGN_BUNDLE_V5_JSON_SCHEMA);
  });
});
