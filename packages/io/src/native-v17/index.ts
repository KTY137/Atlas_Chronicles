// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export { CAMPAIGN_V17_TABLES, CAMPAIGN_V17_ADDITIONAL_TABLES, CAMPAIGN_V17_MODULES, CAMPAIGN_BUNDLE_V17_LIMITS,
  FIGURANTRAG_STATES, FIGURANTRAG_EVENT_OPERATIONS, emptyCampaignTablesV17 } from "./schema.ts";
export type { CampaignTableNameV17, CampaignModuleV17, CampaignTablesV17 } from "./schema.ts";
export { createCampaignBundleV17, validateCampaignBundleV17, parseCampaignBundleV17, serializeCampaignBundleV17, campaignSemanticDiffV17, CAMPAIGN_BUNDLE_V17_VERSION } from "./bundle.ts";
export type { CampaignBundleV17, CampaignBundleDataV17 } from "./bundle.ts";
export * from "./data.ts";
export { validateFigurantragTables } from "./validation.ts";
