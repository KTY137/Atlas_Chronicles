// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync, readdirSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CHRONICLE_HEROES_PACKAGE, CHRONICLE_ARCHETYPES, CHRONICLE_SKILL_LIBRARY, CHRONICLE_RULE_GUIDANCE, createChronicleHeroesPackage, evaluateComputedFields, defaultSupportedActorFields, abilityOverview, stableJson, type RulePackageV2 } from "@chronicle/rules";
import { setzeEnglischeQuelleFuerTests, setzeSprache, t } from "../src/i18n";
import { chronicleSkillLabel, displayChronicleExample, displayRulePackage } from "../src/features/chronicle-heroes-display";
import { CharacterProgress } from "../src/features/CharacterProgress";
import { RuleComputedFields } from "../src/features/RuleComputedFields";
import { FaehigkeitenBogen } from "../src/features/FaehigkeitenBogen";

const dir = new URL("../src/i18n/en/", import.meta.url);
const catalogue: Record<string, string> = Object.assign({}, ...readdirSync(dir).filter(path => path.endsWith(".json")).map(path => JSON.parse(readFileSync(new URL(path, dir), "utf8"))));
const fields = { ...CHRONICLE_ARCHETYPES[0]!.fields, name: "Kämpfer von Köln", profession: "Schmied", notes: "Privater eigener Text" };
const unchangedMechanics = (pkg: RulePackageV2) => JSON.parse(JSON.stringify(pkg, (key, value) => ["label","name","text","group","disclosure","message","attribution"].includes(key) ? undefined : value));

describe("English ChronicleHeroes presentation", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(async () => ({ texte: catalogue, plural: {} })); await setzeSprache("en"); });
  afterEach(() => setzeEnglischeQuelleFuerTests(null));
  it("covers all supplied skills, abilities, conditions and generated catalogue fields", () => {
    const pkg = CHRONICLE_HEROES_PACKAGE, view = displayRulePackage(pkg);
    for (const [id, field] of Object.entries(pkg.fields)) expect(view.fields[id]?.label).toBe(catalogue[field.label] ?? field.label);
    for (const ability of pkg.abilities!) {
      expect(catalogue[ability.name], ability.id + " name").toBeDefined();
      expect(catalogue[ability.text], ability.id + " text").toBeDefined();
      expect(catalogue[ability.group], ability.id + " group").toBeDefined();
      expect(view.abilities!.find(row => row.id === ability.id)).toMatchObject({ name: catalogue[ability.name], text: catalogue[ability.text], group: catalogue[ability.group] });
    }
    for (const condition of pkg.conditions!) expect(view.conditions!.find(row => row.id === condition.id)).toMatchObject({ name: catalogue[condition.name], text: catalogue[condition.text] });
    for (const skill of CHRONICLE_SKILL_LIBRARY) {
      expect(catalogue[skill.label], skill.id).toBeDefined();
      expect(chronicleSkillLabel(skill)).toBe(catalogue[skill.label]);
      for (const suffix of ["Punkte", "Talentbonus", "Wert"]) expect(catalogue[skill.label + " · " + suffix], skill.id + suffix).toBeDefined();
    }
    for (const text of Object.values(CHRONICLE_RULE_GUIDANCE)) expect(catalogue[text]).toBeDefined();
    const customCatalogue = displayRulePackage(createChronicleHeroesPackage({ skills: CHRONICLE_SKILL_LIBRARY.filter(skill => ["klettern", "sprachen", "singen"].includes(skill.id)) }));
    expect(customCatalogue.fields.skill_klettern?.label).toBe("Climbing · points");
    expect(customCatalogue.actions.find(action => action.id === "skill_sprachen")?.name).toBe("Languages");
    expect(customCatalogue.computed?.find(field => field.id === "effective_singen")?.label).toBe("Singing · value");
  });
  it("never mutates package bytes, saved fields, expressions, identifiers or calculations", () => {
    const pkg = CHRONICLE_HEROES_PACKAGE, original = stableJson(pkg), saved = stableJson(fields), view = displayRulePackage(pkg);
    expect(view).not.toBe(pkg);
    expect(unchangedMechanics(view)).toEqual(unchangedMechanics(pkg));
    expect(evaluateComputedFields(view, fields)).toEqual(evaluateComputedFields(pkg, fields));
    expect(abilityOverview(view, fields)).toEqual(abilityOverview(pkg, fields));
    expect(stableJson(fields)).toBe(saved); expect(stableJson(pkg)).toBe(original);
    const output = renderToStaticMarkup(createElement(FaehigkeitenBogen, { pkg, fields, onChange() {} }));
    expect(output).toContain("Heavy blow"); expect(output).toContain("Your hits land hard: +2 damage.");
    expect(output).not.toContain("Deine Treffer sitzen");
  });
  it("preserves custom text even when another template label uses the same German wording", () => {
    const pkg = structuredClone(CHRONICLE_HEROES_PACKAGE) as unknown as { fields: Record<string, { label: string }>; abilities: { name: string; text: string }[] } & RulePackageV2;
    pkg.fields.skill_athletik!.label = "Wahrnehmung";
    pkg.abilities[0]!.name = "Harter Schlag"; pkg.abilities[0]!.text = "Unser eigener Bonus: +7.";
    const view = displayRulePackage(pkg);
    expect(view.fields.skill_athletik?.label).toBe("Wahrnehmung");
    expect(view.abilities![0]).toMatchObject({ name: "Harter Schlag", text: "Unser eigener Bonus: +7." });
    const unrelated = { ...pkg, attribution: undefined } as RulePackageV2;
    expect(displayRulePackage(unrelated)).toBe(unrelated);
  });
  it("updates the point and experience overview from the draft and translates chosen new archetypes only", () => {
    const pkg = CHRONICLE_HEROES_PACKAGE, draft = { ...defaultSupportedActorFields(pkg), erfahrung: 4, erfahrung_fertigkeiten: 2, skill_athletik: 30 };
    const progress = renderToStaticMarkup(createElement(CharacterProgress, { pkg, fields: draft }));
    expect(progress).toContain("Available skill points"); expect(progress).toContain("<dd>340</dd>");
    expect(progress).toContain("Available ability experience"); expect(progress).toContain("<dd>11</dd>");
    const computed = renderToStaticMarkup(createElement(RuleComputedFields, { pkg, fields: draft }));
    expect(computed).toContain("Talent · Body"); expect(computed).toContain("Athletics · value");
    const example = displayChronicleExample(CHRONICLE_ARCHETYPES[0]!);
    expect(example.name).toBe("Fighter"); expect(example.fields.profession).toBe("Mercenary");
    expect(fields).toMatchObject({ name: "Kämpfer von Köln", profession: "Schmied", notes: "Privater eigener Text" });
    expect(t("Verfügbare Skill-Punkte")).toBe("Available skill points");
  });
  it("returns the original display when switched back to German", async () => {
    const english = displayRulePackage(CHRONICLE_HEROES_PACKAGE);
    await setzeSprache("de");
    expect(displayRulePackage(CHRONICLE_HEROES_PACKAGE)).toBe(CHRONICLE_HEROES_PACKAGE);
    await setzeSprache("en");
    expect(displayRulePackage(CHRONICLE_HEROES_PACKAGE).fields.skill_athletik?.label).toBe(english.fields.skill_athletik?.label);
  });
});
