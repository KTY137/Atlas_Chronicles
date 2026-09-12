// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export { CAMPAIGN_V21_TABLES, CAMPAIGN_V21_ADDITIONAL_TABLES, CAMPAIGN_V21_MODULES, CAMPAIGN_BUNDLE_V21_LIMITS,
  emptyCampaignTablesV21 } from "./schema.ts";
export type { CampaignTableNameV21, CampaignModuleV21, CampaignTablesV21 } from "./schema.ts";
export { createCampaignBundleV21, validateCampaignBundleV21, parseCampaignBundleV21, serializeCampaignBundleV21, campaignSemanticDiffV21, CAMPAIGN_BUNDLE_V21_VERSION } from "./bundle.ts";
export type { CampaignBundleV21, CampaignBundleDataV21 } from "./bundle.ts";
export { validateTabletopTables } from "./validation.ts";
