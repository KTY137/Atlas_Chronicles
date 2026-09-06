import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV4, validateCampaignBundleV4, type CampaignBundleV4, type CampaignBundleDataV4 } from "../native-v4/bundle.ts";
import { CAMPAIGN_V4_TABLES, CAMPAIGN_BUNDLE_V4_LIMITS, type CampaignTableNameV4 } from "../native-v4/schema.ts";
import { assertJson, fail, hash, object, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV5, validateCampaignBundleV5, type CampaignBundleV5 } from "./bundle.ts";
import { requireReciprocalMintEvidence } from "../campaign-current-evidence.ts";

export type CurrentCampaignBundle = CampaignBundleV4 | CampaignBundleV5;
/** An inactive installed package is still durable campaign data and selects v5. */
export function createCurrentCampaignBundle(data: CampaignBundleDataV4): CurrentCampaignBundle {
  assertJson(data);
  const supported = data.tables.rule_packages.some(row => object(row.document, "rule_packages.document").schemaVersion === 2)
    || data.tables.action_rolls.some(row => object(row.receipt, "action_rolls.receipt").schemaVersion === 2);
  if (supported) return createCampaignBundleV5(data);
  const bundle = createCampaignBundleV4(data); requireReciprocalMintEvidence(bundle.tables); return bundle;
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle {
  assertJson(value); const version = object(value, "$").version;
  if (version === 4) { const bundle = validateCampaignBundleV4(value); requireReciprocalMintEvidence(bundle.tables); return bundle; }
  if (version === 5) return validateCampaignBundleV5(value);
  return fail("version", "unsupported campaign version; select an explicit source migration");
}
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V4_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
/** Different supported envelopes can describe exactly the same durable table contents. */
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV4[] {
  const left = validateCurrentCampaignBundle(a), right = validateCurrentCampaignBundle(b);
  return CAMPAIGN_V4_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
