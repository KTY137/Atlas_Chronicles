// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export { CAMPAIGN_V22_TABLES, CAMPAIGN_V22_ADDITIONAL_TABLES, CAMPAIGN_V22_MODULES, CAMPAIGN_BUNDLE_V22_LIMITS,
  emptyCampaignTablesV22 } from "./schema.ts";
export type { CampaignTableNameV22, CampaignModuleV22, CampaignTablesV22 } from "./schema.ts";
export { createCampaignBundleV22, validateCampaignBundleV22, parseCampaignBundleV22, serializeCampaignBundleV22, campaignSemanticDiffV22, CAMPAIGN_BUNDLE_V22_VERSION } from "./bundle.ts";
export type { CampaignBundleV22, CampaignBundleDataV22 } from "./bundle.ts";
export { validateKampfkartenTables } from "./validation.ts";
