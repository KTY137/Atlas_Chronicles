// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { defaultSupportedActorFields, evaluateSupportedAction, evaluateVitals } from "@chronicle/rules";
import { validateDraft } from "../src/features/rule-forge-model";
import { isOnSheet } from "../src/features/rule-sheet-model";
import { GENRES, SYSTEMS, defaultAnswers, genreSkills, identifierFor, withGenre, wizardDraft, wizardProblems, type WizardSystem } from "../src/features/rule-wizard-model";

// Der Regelwerk-Assistent: jede Antwort muss ein gültiges, sofort spielbares Paket ergeben.
const SEED = "00000001000000020000000300000004";

describe("Regelwerk-Assistent", () => {
  for (const genre of GENRES) for (const system of Object.keys(SYSTEMS) as WizardSystem[]) {
    it(`baut ein spielbares Paket: ${genre} mit ${system}`, () => {
      const base = withGenre(defaultAnswers(), genre);
      const skills = genreSkills(genre).slice(0, 3).map(skill => ({ name: skill.name, attribute: base.attributes[skill.attribute]! }));
      for (const skillValues of [false, true]) {
        const answers = { ...base, name: "Nordlicht", system, skills, skillValues };
        expect(wizardProblems(answers)).toEqual([]);
        const draft = wizardDraft(answers, "Kaya", []);
        const checked = validateDraft(draft);
        if (!checked.valid) throw new Error(checked.error);
        const pkg = checked.value;
        expect(pkg.name).toBe("Nordlicht");
        expect(pkg.actions).toHaveLength(answers.attributes.length + skills.length);
        const actor = defaultSupportedActorFields(pkg);
        for (const action of pkg.actions) {
          const result = evaluateSupportedAction(pkg, action.id, { seed: SEED, actor, input: {}, knowledge: { actorId: "probe", passages: [] } });
          expect(Number.isFinite(result.total)).toBe(true);
          expect(typeof result.success).toBe("boolean");
        }
        const bars = answers.bars.filter(bar => bar.on);
        expect(evaluateVitals(pkg, actor).map(v => v.label)).toEqual(bars.map(bar => bar.label));
        for (const vital of pkg.schemaVersion === 2 ? pkg.vitals ?? [] : []) expect(isOnSheet(draft, "vital", vital.id)).toBe(true);
      }
    });
  }

  it("nennt die Chance exakt", () => {
    expect(SYSTEMS.w20.chance(2)).toBeCloseTo(0.4);
    expect(SYSTEMS.w100.chance(60)).toBeCloseTo(0.6);
    expect(SYSTEMS["3w6"].chance(10)).toBeCloseTo(0.5);
    expect(SYSTEMS["2w6"].chance(1)).toBeCloseTo(26 / 36);
  });

  it("macht aus Namen Kennungen, die Formeln lesen können", () => {
    const taken = new Set<string>();
    expect(identifierFor("Stärke", taken)).toBe("staerke");
    expect(identifierFor("Geistige Gesundheit", taken)).toBe("geistige_gesundheit");
    expect(identifierFor("3D-Druck", taken)).toBe("d_druck");
    expect(identifierFor("Stärke", new Set(["staerke"]))).toBe("staerke_2");
  });

  it("verlangt mindestens eine Eigenschaft", () => {
    expect(wizardProblems({ ...defaultAnswers(), attributes: [] })).toHaveLength(1);
  });
});
