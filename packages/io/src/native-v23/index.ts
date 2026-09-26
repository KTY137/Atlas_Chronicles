// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export { CAMPAIGN_V23_TABLES, CAMPAIGN_V23_ADDITIONAL_TABLES, CAMPAIGN_V23_MODULES, CAMPAIGN_BUNDLE_V23_LIMITS,
  emptyCampaignTablesV23 } from "./schema.ts";
export type { CampaignTableNameV23, CampaignModuleV23, CampaignTablesV23 } from "./schema.ts";
export { createCampaignBundleV23, validateCampaignBundleV23, parseCampaignBundleV23, serializeCampaignBundleV23, campaignSemanticDiffV23, CAMPAIGN_BUNDLE_V23_VERSION } from "./bundle.ts";
export type { CampaignBundleV23, CampaignBundleDataV23 } from "./bundle.ts";
export { validateSessionFloorTables } from "./validation.ts";
