// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type } from "@sinclair/typebox";

/** Transport contract, checked against RULE_LIMITS.fields by the HTTP regression suite.
 * Kept here so importing a transport schema never executes the rules engine/catalogue. */
export const RULE_VALUE_FIELD_LIMIT = 512;
/** One transport bound for templates, sheets, player requests and rule previews. */
export const RuleValues = Type.Record(Type.String({ pattern: "^[a-z][a-z0-9_-]{0,95}$" }),
  Type.Union([Type.String({ maxLength: 4096 }), Type.Number({ minimum: -1e12, maximum: 1e12 }), Type.Boolean()]),
  { maxProperties: RULE_VALUE_FIELD_LIMIT, additionalProperties: false });
export const RuleContentHash = Type.String({ pattern: "^[a-f0-9]{64}$" });
export const RuleRuntimeSelection = Type.Object({
  packageId: Type.String({ minLength: 1, maxLength: 128 }),
  packageVersion: Type.String({ minLength: 1, maxLength: 128 }),
}, { additionalProperties: false });
export const RuleRuntimeEvaluation = Type.Object({ ...RuleRuntimeSelection.properties,
  contentHash: RuleContentHash, fields: RuleValues,
}, { additionalProperties: false });
