// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export { CAMPAIGN_V20_TABLES, CAMPAIGN_V20_ADDITIONAL_TABLES, CAMPAIGN_V20_MODULES, CAMPAIGN_BUNDLE_V20_LIMITS,
  emptyCampaignTablesV20 } from "./schema.ts";
export type { CampaignTableNameV20, CampaignModuleV20, CampaignTablesV20 } from "./schema.ts";
export { createCampaignBundleV20, validateCampaignBundleV20, parseCampaignBundleV20, serializeCampaignBundleV20, campaignSemanticDiffV20, CAMPAIGN_BUNDLE_V20_VERSION } from "./bundle.ts";
export type { CampaignBundleV20, CampaignBundleDataV20 } from "./bundle.ts";
export { validateMapStudioTables } from "./validation.ts";
