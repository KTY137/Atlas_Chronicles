// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export { CAMPAIGN_V18_TABLES, CAMPAIGN_V18_ADDITIONAL_TABLES, CAMPAIGN_V18_MODULES, CAMPAIGN_BUNDLE_V18_LIMITS,
  emptyCampaignTablesV18 } from "./schema.ts";
export type { CampaignTableNameV18, CampaignModuleV18, CampaignTablesV18 } from "./schema.ts";
export { createCampaignBundleV18, validateCampaignBundleV18, parseCampaignBundleV18, serializeCampaignBundleV18, campaignSemanticDiffV18, CAMPAIGN_BUNDLE_V18_VERSION } from "./bundle.ts";
export type { CampaignBundleV18, CampaignBundleDataV18 } from "./bundle.ts";
export * from "./data.ts";
export { validateRegelarchivTables } from "./validation.ts";
