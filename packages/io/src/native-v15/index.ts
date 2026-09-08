// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export { CAMPAIGN_V15_TABLES, CAMPAIGN_V15_ADDITIONAL_TABLES, CAMPAIGN_V15_MODULES, CAMPAIGN_BUNDLE_V15_LIMITS, emptyCampaignTablesV15 } from "./schema.ts";
export type { CampaignTableNameV15, CampaignModuleV15, CampaignTablesV15 } from "./schema.ts";
export { createCampaignBundleV15, validateCampaignBundleV15, parseCampaignBundleV15, serializeCampaignBundleV15, campaignSemanticDiffV15, CAMPAIGN_BUNDLE_V15_VERSION } from "./bundle.ts";
export type { CampaignBundleV15, CampaignBundleDataV15 } from "./bundle.ts";
