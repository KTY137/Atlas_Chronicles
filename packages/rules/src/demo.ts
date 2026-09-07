// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseRulePackage } from "./package.ts";

/** Original demonstration mechanics and wording; no third-party RPG content. */
export const DEMO_RULE_PACKAGE = parseRulePackage({
  schemaVersion: 1,
  id: "org.atlas-chronicles.spuren",
  name: "Spuren - Chronicle Demosystem",
  version: "1.0.0",
  engineVersion: "1.0.0",
  license: "MIT",
  authors: ["Atlas Chronicles contributors"],
  fields: {
    insight: { type: "integer", label: "Scharfsinn", minimum: 0, maximum: 6, default: 2 },
    vigour: { type: "integer", label: "Kraft", minimum: 0, maximum: 12, default: 6 },
    name: { type: "string", label: "Name", maxLength: 120, default: "Reisende Person" },
  },
  layout: { sections: [{ id: "character", label: "Figur", fields: ["name", "insight", "vigour"] }] },
  actions: [{
    id: "investigate", name: "Spuren lesen", version: "1.0.0",
    inputs: { topic: { type: "string", label: "Wissensetikett", maxLength: 96, default: "spuren" } },
    expression: '1d12 + actor.insight + if(erfahrungsgrad(input.topic) == "erfahren", 2, if(haelt_etikett(input.topic) > 0, 0, -1))',
    disclosure: "Ein W12 plus Scharfsinn. Eigenes Erfahren gibt +2, Gehoertes oder Gesprochenes +0, fehlendes Wissen -1. Nur gehaltene Passagen der handelnden Figur zaehlen.",
    threshold: 9,
    requiresConfirmation: true,
  }],
  migrations: [],
});
