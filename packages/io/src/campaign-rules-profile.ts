// Internal validation policy. Legacy bundle constructors never select the v5 profile.
import {
  parseRulePackage, replayAction, validateEntityFields,
  parseSupportedRulePackage, replaySupportedAction, validatePackageFields,
  type AnyRulePackage, type AnyActionResult, type ActionResult, type Scalar,
} from "@chronicle/rules";

export interface CampaignRulesProfile {
  readonly name: "rules-v1@1" | "rules-v1-v2@1";
  parse(value: unknown): AnyRulePackage;
  fields(pkg: AnyRulePackage, value: unknown): Readonly<Record<string, Scalar>>;
  replay(pkg: AnyRulePackage, receipt: unknown): { readonly valid: boolean };
}
export const LEGACY_CAMPAIGN_RULES: CampaignRulesProfile = Object.freeze({
  name: "rules-v1@1",
  parse: parseRulePackage,
  fields: (pkg: AnyRulePackage, value: unknown) => validateEntityFields(parseRulePackage(pkg).fields, value),
  replay: (pkg: AnyRulePackage, receipt: unknown) => replayAction(parseRulePackage(pkg), receipt as ActionResult),
});
export const SUPPORTED_CAMPAIGN_RULES: CampaignRulesProfile = Object.freeze({
  name: "rules-v1-v2@1",
  parse: parseSupportedRulePackage,
  fields: validatePackageFields,
  replay: (pkg: AnyRulePackage, receipt: unknown) => replaySupportedAction(pkg, receipt as AnyActionResult),
});
