// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Internal validation policy. Legacy bundle constructors never select the v5 profile.
import {
  parseRulePackage, replayAction, validateEntityFields,
  parseSupportedRulePackage, replaySupportedAction, validatePackageFields,
  type AnyRulePackage, type AnyActionResult, type ActionResult, type Scalar,
} from "@chronicle/rules";

export interface CampaignRulesProfile {
  readonly name: "rules-v1@1" | "rules-v1-v2@1";
  /**
   * Nimmt dieses Profil die **Kartenfassung** einer Gegenstandsvorlage an (`schemaVersion: 2`)?
   *
   * Der eingefrorene v2-Umschlag sagt nein und MUSS nein sagen: ein altes Paket, das eine
   * Fassung enthielte, die sein eigener Leser nicht kennt, wäre kein altes Paket mehr — genau
   * die stille Umdeutung, gegen die die unveränderlichen, inhaltsgehashten Revisionen stehen.
   * Der aktuelle Pfad sagt ja. Dieselbe Naht, die schon die Regelpaket-Fassungen trennt.
   */
  readonly itemCardFaces: boolean;
  /**
   * Nimmt dieses Profil die **Beutetabelle** einer Figurvorlage an (`schemaVersion: 2`)?
   *
   * Eigene Fähigkeit statt Mitfahren bei `itemCardFaces`: es sind zwei Aussagen über zwei
   * verschiedene Vorlagenarten, und wer eine davon später zurücknehmen müsste, soll nicht die
   * andere mitnehmen. Der eingefrorene v2-Umschlag sagt zu beiden nein.
   */
  readonly npcLoot: boolean;
  parse(value: unknown): AnyRulePackage;
  fields(pkg: AnyRulePackage, value: unknown): Readonly<Record<string, Scalar>>;
  replay(pkg: AnyRulePackage, receipt: unknown): { readonly valid: boolean };
}
export const LEGACY_CAMPAIGN_RULES: CampaignRulesProfile = Object.freeze({
  name: "rules-v1@1",
  itemCardFaces: false,
  npcLoot: false,
  parse: parseRulePackage,
  fields: (pkg: AnyRulePackage, value: unknown) => validateEntityFields(parseRulePackage(pkg).fields, value),
  replay: (pkg: AnyRulePackage, receipt: unknown) => replayAction(parseRulePackage(pkg), receipt as ActionResult),
});
export const SUPPORTED_CAMPAIGN_RULES: CampaignRulesProfile = Object.freeze({
  name: "rules-v1-v2@1",
  itemCardFaces: true,
  npcLoot: true,
  parse: parseSupportedRulePackage,
  fields: validatePackageFields,
  replay: (pkg: AnyRulePackage, receipt: unknown) => replaySupportedAction(pkg, receipt as AnyActionResult),
});
