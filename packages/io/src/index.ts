/** File adapters only. Import results are GM review material, never reader projections. */
export { importEron, planEronReimport } from "./eron.ts";
export { decomposeWiki, parseWikiInline, splitWikiTopLevel, balancedEnd, wikiSlug, blockPlainText, inlinePlainText, ERON_TEMPLATE_TYPES, eronNotationTarget, namespaceLinkTarget, MEDIAWIKI_NAMESPACES } from "./wikitext.ts";
export { ImportValidationError } from "./validation.ts";
export { createWikiBundle, serializeWikiBundle, parseWikiBundle, validateWikiBundle, WIKI_BUNDLE_VERSION } from "./bundle.ts";
export type { WikiBundle, WikiBundleData } from "./bundle.ts";
export { createCampaignBundle, validateCampaignBundle, parseCampaignBundle, serializeCampaignBundle, campaignSemanticDiff, CAMPAIGN_BUNDLE_VERSION } from "./campaign-bundle.ts";
export type { CampaignBundle, CampaignBundleData } from "./campaign-bundle.ts";
export { CAMPAIGN_TABLES, CAMPAIGN_MODULES, CAMPAIGN_EXCLUSIONS, CAMPAIGN_EXCLUDED_TABLES, CAMPAIGN_BUNDLE_LIMITS, CAMPAIGN_BUNDLE_JSON_SCHEMA, emptyCampaignTables } from "./campaign-schema.ts";
export type { CampaignTableName, CampaignColumn, CampaignModule, CampaignRow, CampaignTables } from "./campaign-schema.ts";
export type { EronArticle, EronTemplate, EronAttribution, EronImportInput, EronImportResult, ImportProvenance, EronSource, EronReimportPlan, ImportedMediaReference } from "./model.ts";
