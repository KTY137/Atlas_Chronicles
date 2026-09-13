// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { PackagePin, Scalar } from "@chronicle/rules";
import { defaults, type RulesState } from "./game-api";

/** A revision or an intentionally edited rule draft owns BOTH its pin and its values. */
export interface ActorTemplateRulesDraft {
  pin: PackagePin;
  fields: Record<string, Scalar>;
}

/**
 * A new, untouched rules section follows the campaign, including updates received while
 * the form stays mounted. Name, kind and lore belong to the surrounding form and are not
 * reset. As soon as values are edited or a package is explicitly selected, the caller
 * stores a draft; a later activation must not reinterpret those values under other rules.
 * A missing pinned package is reported as missing, never replaced by the first package.
 */
export function resolveActorTemplateRules(rules: Pick<RulesState, "packages" | "pin">, draft: ActorTemplateRulesDraft | null) {
  const pin = draft?.pin ?? rules.pin;
  const pkg = rules.packages.find(candidate => candidate.id === pin.id && candidate.version === pin.version);
  return { pin, pkg, fields: draft?.fields ?? (pkg ? defaults(pkg.fields) : {}) };
}
