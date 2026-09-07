// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { CanonicalValue } from "@chronicle/core";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { createCampaignBundle } from "../src/campaign-bundle.ts";
import { upgradeCampaignBundleV1 } from "../src/campaign-bundle-v2.ts";
import type { CampaignBundleDataV2 } from "../src/campaign-bundle-v2.ts";
import type { CampaignTableNameV2 } from "../src/campaign-schema-v2.ts";
import { campaignEvidenceFixture, seal, TIMESTAMP } from "./campaign-fixture.ts";

export type MutableTablesV2 = Record<CampaignTableNameV2, Record<string, CanonicalValue>[]>;
export function campaignFixtureV2(): Omit<CampaignBundleDataV2, "tables"> & { tables: MutableTablesV2 } {
  const bundle = upgradeCampaignBundleV1(createCampaignBundle(campaignEvidenceFixture())).bundle;
  const tables = JSON.parse(JSON.stringify(bundle.tables)) as MutableTablesV2, at = String(TIMESTAMP);
  const actorDefinition = { schemaVersion: 1, name: "Companion", kind: "companion", loreEntryId: "entry", package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: {} };
  const itemDefinition = { schemaVersion: 1, name: "Lantern", loreEntryId: "entry", tags: ["light"] };
  for (const [prefix, definition] of [["actor", actorDefinition], ["item", itemDefinition]] as const) {
    tables[`${prefix}_templates`] = [{ id: `${prefix}-template`, campaign_id: "campaign", head_revision: 1, version: 1, created_by: "gm", created_at: at, archived_at: null }];
    tables[`${prefix}_template_revisions`] = [{ template_id: `${prefix}-template`, campaign_id: "campaign", revision: 1, definition, content_hash: seal(definition), created_by: "gm", created_at: at }];
  }
  tables.actors.push({ id: "companion", campaign_id: "campaign", user_id: "gm", name: "Ash" });
  tables.actor_profiles.push({ actor_id: "companion", campaign_id: "campaign", kind: "companion", template_id: "actor-template", template_revision: 1, lore_entry_id: "entry", version: 1, archived_at: null, created_by: "gm", created_at: at });
  tables.actor_controllers.push({ actor_id: "companion", campaign_id: "campaign", user_id: "sera", permission: "control", version: 1, granted_by: "gm", granted_at: at, revoked_at: null });
  const itemState = { quantity: 1, notes: "A descriptive lantern", equipped: false };
  tables.item_instances = [{ id: "lantern", campaign_id: "campaign", template_id: "item-template", template_revision: 1, holder_actor_id: "companion", state: itemState, version: 1, created_by: "gm", created_at: at, archived_at: null }];
  const result = { id: "lantern", version: 1, holderActorId: "companion", archivedAt: null, template: { id: "item-template", revision: 1 }, definition: itemDefinition, state: itemState };
  const request = { campaignId: "campaign", operation: "item.instantiate", subjectId: null, input: { commandId: "create-lantern", templateId: "item-template", templateRevision: 1, holderActorId: "companion", state: itemState } };
  tables.actor_inventory_events = [{ id: "item-created", campaign_id: "campaign", actor_user_id: "gm", operation: "item.instantiate", subject_id: "lantern", command_id: "create-lantern", request, request_hash: seal(request), before_state: null, after_state: result, result, reason: null, created_at: at }];
  return { campaignId: "campaign", universeId: "universe", exportedAt: bundle.manifest.exportedAt, tables };
}
