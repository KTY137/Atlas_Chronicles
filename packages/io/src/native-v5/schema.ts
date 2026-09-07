// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { CAMPAIGN_BUNDLE_V4_JSON_SCHEMA } from "../native-v4/schema.ts";
export { CAMPAIGN_V4_TABLES as CAMPAIGN_V5_TABLES, CAMPAIGN_V4_MODULES as CAMPAIGN_V5_MODULES, CAMPAIGN_BUNDLE_V4_LIMITS as CAMPAIGN_BUNDLE_V5_LIMITS, emptyCampaignTablesV4 as emptyCampaignTablesV5 } from "../native-v4/schema.ts";
export type { CampaignTablesV4 as CampaignTablesV5, CampaignTableNameV4 as CampaignTableNameV5, CampaignModuleV4 as CampaignModuleV5 } from "../native-v4/schema.ts";
const previous = CAMPAIGN_BUNDLE_V4_JSON_SCHEMA;
const { coreFormatVersion: _oldCore, ...fields } = (previous.properties.manifest as { properties: Record<string, unknown> }).properties;
const manifest = { ...fields, rulePackageSchemaVersion: { const: 2 }, ruleProfile: { const: "rules-v1-v2@1" }, coreTableVersion: { const: 3 } };
export const CAMPAIGN_BUNDLE_V5_JSON_SCHEMA = {
  ...previous, $id: "urn:atlas-chronicles:campaign:5", title: "Atlas Chronicles native campaign v5",
  description: "Explicit supported-rules profile; the table layout remains v4. The reference parser validates both rule generations, package-bound replay, actor history, tactical state and authoring evidence.",
  properties: { ...previous.properties, version: { const: 5 }, manifest: { type: "object", additionalProperties: false, required: Object.keys(manifest), properties: manifest } },
} as const;
