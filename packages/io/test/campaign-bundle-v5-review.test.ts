import { describe, expect, it } from "vitest";
import { evaluateSupportedAction, parseSupportedRulePackage, type EvaluationContext } from "@chronicle/rules";
import { createCampaignBundleV5 } from "../src/native-v5/bundle.ts";
import { validateCurrentCampaignBundle } from "../src/native-v5/current.ts";
import { createCampaignBundleV4 } from "../src/native-v4/bundle.ts";
import { campaignFixtureV5 } from "./campaign-v5-fixture.ts";
import { seal, TIMESTAMP, value } from "./campaign-fixture.ts";

/** A valid deterministic failed receipt and a valid failure confirmation must never
 * gain a minted passage through an independently sealed orphan mint row. */
function rollWithMint(success = false, legacy = false) {
  const data = campaignFixtureV5(!legacy), tables = data.tables;
  if (legacy) tables.rule_packages.pop();
  const roll = tables.action_rolls[legacy ? 0 : 1]!;
  if (success) {
    const pkg = parseSupportedRulePackage(tables.rule_packages[1]!.document);
    const receipt = evaluateSupportedAction(pkg, "manual_ruling", (roll.receipt as unknown as { context: EvaluationContext }).context);
    Object.assign(roll, { action_id: "manual_ruling", receipt: value(receipt), receipt_hash: seal(receipt) });
  }
  const receipt = roll.receipt as { success: boolean };
  expect(receipt.success).toBe(success);
  roll.target_passage_id = "passage";
  roll.target_passage_hash = "c".repeat(64);
  roll.status = "bestaetigt";
  roll.confirmed_at = String(TIMESTAMP);
  const provenance = {
    schemaVersion: 1, kind: "wurf", userId: "sera", actorId: roll.actor_id,
    serverTime: TIMESTAMP, requestHash: "d".repeat(64), playDate: "2026-09-06", fictionDate: "Day 1",
    rollId: roll.id, receiptHash: roll.receipt_hash, vollmachtId: null, replaces: null,
    passageHash: roll.target_passage_hash, package: { id: roll.package_id, version: roll.package_version },
    augenblick: { capturedAt: TIMESTAMP, sceneId: "scene", sessionId: "session" },
  };
  const mint = { id: "orphan-mint", passageId: "passage", revisionId: "revision", provenance };
  const confirmation = { rollId: roll.id, success, mint: success ? { ...mint, kind: "wurf", seal: seal(mint), confirmedAt: TIMESTAMP } : null, confirmedAt: TIMESTAMP };
  roll.confirmation = value({ ...confirmation, seal: seal({ ...confirmation, receiptHash: roll.receipt_hash }) });
  tables.confirmed_mints.push({
    id: mint.id, campaign_id: "campaign", kind: "wurf", passage_id: mint.passageId,
    revision_id: mint.revisionId, roll_id: roll.id!, user_id: "sera", command_id: "orphan-mint-command",
    provenance: value(provenance), seal: seal(mint), confirmed_at: String(TIMESTAMP),
  });
  const revision = tables.revisions[0]!;
  revision.document = value({ ...(revision.document as Record<string, unknown>), mint: provenance });
  revision.content_hash = seal(revision.document);
  return data;
}

describe("native v5 independent adversarial review", () => {
  it("rejects an orphan minted passage attached to a confirmed failed v2 roll", () => {
    expect(() => createCampaignBundleV5(rollWithMint())).toThrow(/mint|success|confirmation/);
  });
  it("rejects an orphan minted passage attached to an unconfirmed failed v2 roll", () => {
    const data = rollWithMint();
    Object.assign(data.tables.action_rolls[1]!, { status: "ausstehend", confirmed_at: null, confirmation: null });
    expect(() => createCampaignBundleV5(data)).toThrow(/mint|success|confirmation/);
  });
  it("admits a successful v2 mint reciprocally linked to its successful confirmation", () => {
    expect(createCampaignBundleV5(rollWithMint(true)).tables.confirmed_mints).toHaveLength(1);
  });
  it("admits a confirmed failed v2 roll with no minted passage", () => {
    const data = campaignFixtureV5(), roll = data.tables.action_rolls[1]!;
    const confirmation = { rollId: roll.id, success: false, mint: null, confirmedAt: TIMESTAMP };
    Object.assign(roll, { status: "bestaetigt", confirmed_at: String(TIMESTAMP), confirmation: value({ ...confirmation, seal: seal({ ...confirmation, receiptHash: roll.receipt_hash }) }) });
    expect(createCampaignBundleV5(data).tables.confirmed_mints).toEqual([]);
  });
  it("rejects the same inherited orphan mint on current-runtime v4 admission", () => {
    const legacy = createCampaignBundleV4(rollWithMint(false, true));
    expect(legacy.version).toBe(4);
    expect(() => validateCurrentCampaignBundle(legacy)).toThrow(/mint|success|confirmation/);
  });
});
