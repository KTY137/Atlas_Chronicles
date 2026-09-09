// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export { CAMPAIGN_V19_TABLES, CAMPAIGN_V19_ADDITIONAL_TABLES, CAMPAIGN_V19_MODULES, CAMPAIGN_BUNDLE_V19_LIMITS,
  emptyCampaignTablesV19 } from "./schema.ts";
export type { CampaignTableNameV19, CampaignModuleV19, CampaignTablesV19 } from "./schema.ts";
export { createCampaignBundleV19, validateCampaignBundleV19, parseCampaignBundleV19, serializeCampaignBundleV19, campaignSemanticDiffV19, CAMPAIGN_BUNDLE_V19_VERSION } from "./bundle.ts";
export type { CampaignBundleV19, CampaignBundleDataV19 } from "./bundle.ts";
export * from "./data.ts";
export { validateKartenherkunftTables } from "./validation.ts";
