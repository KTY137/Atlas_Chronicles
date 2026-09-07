// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { CanonicalValue } from "@chronicle/core";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS, evaluateSupportedAction } from "@chronicle/rules";
import { createCampaignBundleV2 } from "../src/campaign-bundle-v2.ts";
import { upgradeCampaignBundleV2 } from "../src/campaign-bundle-v3.ts";
import { upgradeCampaignBundleV3 } from "../src/native-v4/bundle.ts";
import type { CampaignBundleDataV5 } from "../src/native-v5/bundle.ts";
import type { CampaignTableNameV4 } from "../src/native-v4/schema.ts";
import { campaignFixtureV2 } from "./campaign-v2-fixture.ts";
import { seal, value, TIMESTAMP } from "./campaign-fixture.ts";

export type MutableV5 = Omit<CampaignBundleDataV5, "tables"> & { tables: Record<CampaignTableNameV4, Record<string, CanonicalValue>[]> };
export function campaignFixtureV5(active = true): MutableV5 {
  const old = upgradeCampaignBundleV3(upgradeCampaignBundleV2(createCampaignBundleV2(campaignFixtureV2())).bundle).bundle;
  const data: MutableV5 = { campaignId: old.manifest.campaignId, universeId: old.manifest.universeId, exportedAt: old.manifest.exportedAt, tables: JSON.parse(JSON.stringify(old.tables)) };
  const t = data.tables, pkg = HOW_TO_BE_A_HERO_PACKAGE, fields = HTBAH_EXAMPLE_CHARACTERS[0]!.fields;
  t.rule_packages.push({ campaign_id: "campaign", package_id: pkg.id, version: pkg.version, document: value(pkg), content_hash: seal(pkg), installed_by: "gm", installed_at: String(TIMESTAMP) });
  if (!active) return data;
  Object.assign(t.campaign_rule_pins[0]!, { package_id: pkg.id, package_version: pkg.version });
  Object.assign(t.actor_sheets[0]!, { package_id: pkg.id, package_version: pkg.version, fields: value(fields) });
  // Keep the old v1 roll and add a v2 receipt to the same history.
  const receipt = evaluateSupportedAction(pkg, "aptitude_handeln", { seed: "00000001000000020000000300000004", actor: fields, input: {}, knowledge: { actorId: "actor-sera", passages: [] } });
  t.action_rolls.push({ ...t.action_rolls[0]!, id: "hero-roll", command_id: "hero-prepare", package_id: pkg.id, package_version: pkg.version, action_id: "aptitude_handeln", receipt: value(receipt), receipt_hash: seal(receipt) });
  const definition = { schemaVersion: 1, name: "Companion", kind: "companion", loreEntryId: "entry", package: { id: pkg.id, version: pkg.version }, fields: value(fields) };
  Object.assign(t.actor_template_revisions[0]!, { definition, content_hash: seal(definition) });
  const result = { id: "actor-template", revision: 1, version: 1, archivedAt: null, definition, contentHash: seal(definition) };
  const request = { campaignId: "campaign", operation: "actor.template.create", subjectId: null, input: { commandId: "hero-template", definition } };
  t.actor_inventory_events.push({ id: "hero-template-event", campaign_id: "campaign", actor_user_id: "gm", operation: "actor.template.create", subject_id: "actor-template", command_id: "hero-template", request, request_hash: seal(request), before_state: null, after_state: result, result, reason: null, created_at: String(TIMESTAMP) });
  return data;
}
