// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { DEMO_RULE_PACKAGE, parseSupportedRulePackage } from "@chronicle/rules";

/** Synthetic 107-field fixture: the same field-count/skill representation as Chronicles Lite,
 * not a replacement or a changed edition of the user's ruleset. */
export const largeTemplatePackage = parseSupportedRulePackage({
  ...DEMO_RULE_PACKAGE, id: "de.test.actor-template-lite", version: "1.0.0", name: "Lite regression fixture",
  fields: {
    name: { type: "string", label: "Figurenname im Bogen", default: "", maxLength: 160 },
    rolle: { type: "string", label: "Rolle", default: "", maxLength: 160 },
    notizen: { type: "string", label: "Notizen", default: "", maxLength: 1000 },
    ...Object.fromEntries(["handeln", "wissen", "soziales", "lernpunkte"].map(id => [id,
      { type: "integer", label: id, default: 10, minimum: 0, maximum: 30 }])),
    ...Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`f_skill_${i}`,
      { type: "integer", label: i === 0 ? "Nahkampf" : i === 1 ? "Fernkampf" : `Fertigkeit ${i + 1}`, default: 0, minimum: 0, maximum: 30 }])),
  },
  layout: { sections: [{ id: "skills", label: "Fertigkeiten", fields: ["name", "rolle", "notizen", "handeln", "wissen", "soziales", "lernpunkte", ...Array.from({ length: 100 }, (_, i) => `f_skill_${i}`)] }] },
  actions: [{ id: "nahkampf", version: "1.0.0", name: "Nahkampf", expression: "1d50", inputs: {}, requiresConfirmation: true, disclosure: "Synthetic W50 regression probe." }],
});
