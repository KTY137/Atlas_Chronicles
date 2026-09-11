// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * ChronicleHeroes 2.0 — der Inhalt (Spec 2026-09-11-chronicleheroes-faehigkeiten, Schritt 2).
 * Geprüft wird nicht nur, dass es 200 Fähigkeiten gibt, sondern dass jede davon mit einem gültigen
 * Bogen erreichbar ist und beim Würfeln tatsächlich etwas bewirkt.
 */
import { describe, expect, it } from "vitest";
import * as rules from "../src/index.ts";

const pkg = rules.CHRONICLE_HEROES_PACKAGE, sammlung = rules.CHRONICLE_ABILITY_LIBRARY;
const nachKennung = new Map(sammlung.map(faehigkeit => [faehigkeit.id, faehigkeit]));
const kette = (id: string): string[] => { const ids: string[] = []; for (let aktuell = nachKennung.get(id); aktuell; aktuell = aktuell.vorstufe ? nachKennung.get(aktuell.vorstufe) : undefined) ids.unshift(aktuell.id); return ids; };
const basis = { ...rules.defaultSupportedActorFields(pkg), ...Object.fromEntries(rules.CHRONICLE_DEFAULT_SKILLS.map(skill => [rules.chronicleSkillField(skill.id), 70])), [rules.CHRONICLE_XP_FIELD]: 40 };
const kontext = (actor: Record<string, unknown>, input: Record<string, unknown> = {}) => ({ seed: "00000001000000020000000300000004", actor, input, knowledge: { actorId: "held", passages: [] } }) as unknown as rules.EvaluationContext;
const trifft = (muster: string, aktion: string) => muster.endsWith("*") ? aktion.startsWith(muster.slice(0, -1)) : muster === aktion;

describe("Die Fähigkeitensammlung", () => {
  it("hat 200 Fähigkeiten: je 60 für Körper, Geist und Herz, 20 allgemeine — eindeutig nach Kennung und Name", () => {
    expect(sammlung).toHaveLength(200);
    const zaehlung = Object.fromEntries(["koerper", "geist", "herz", "allgemein"].map(feld => [feld, sammlung.filter(faehigkeit => faehigkeit.feld === feld).length]));
    expect(zaehlung).toEqual({ koerper: 60, geist: 60, herz: 60, allgemein: 20 });
    expect(new Set(sammlung.map(faehigkeit => faehigkeit.id)).size).toBe(200);
    expect(new Set(sammlung.map(faehigkeit => faehigkeit.name)).size).toBe(200);
  });

  it("baut Ränge als Ketten: Rang 2 und 3 stehen auf einer Vorstufe vom Rang darunter, Rang 1 auf keiner", () => {
    for (const faehigkeit of sammlung) {
      if (faehigkeit.rang === 1) expect(faehigkeit.vorstufe, faehigkeit.id).toBeUndefined();
      else expect(nachKennung.get(faehigkeit.vorstufe!)?.rang, faehigkeit.id).toBe(faehigkeit.rang - 1);
    }
  });

  it("steckt vollständig im Paket, zusammen mit 12 Zuständen, und das Paket heißt 2.0.0", () => {
    expect(pkg.version).toBe("2.0.0");
    expect(pkg.abilities).toHaveLength(200);
    expect(pkg.conditions).toHaveLength(12);
    expect(rules.CHRONICLE_CONDITIONS).toHaveLength(12);
  });

  it("macht jede Fähigkeit samt Vorstufen mit einem gültigen Bogen erlernbar", () => {
    for (const faehigkeit of sammlung) {
      expect(() => rules.validatePackageFields(pkg, { ...basis, [rules.CHRONICLE_ABILITY_FIELD]: kette(faehigkeit.id).join(", ") }), faehigkeit.id).not.toThrow();
    }
  });

  it("wirkt beim Würfeln: jede Fähigkeit mit Wirkung trifft eine Aktion und steht in der Quittung", () => {
    for (const faehigkeit of pkg.abilities!) {
      if (!faehigkeit.modifiers?.length) continue;
      const aktion = pkg.actions.find(kandidat => faehigkeit.modifiers!.some(modifier => modifier.actions.some(muster => trifft(muster, kandidat.id))));
      expect(aktion, faehigkeit.id).toBeDefined();
      const ergebnis = rules.evaluateSupportedAction(pkg, aktion!.id, kontext({ ...basis, [rules.CHRONICLE_ABILITY_FIELD]: kette(faehigkeit.id).join(", ") },
        faehigkeit.kind === "dauerhaft" ? {} : { einsatz: faehigkeit.id })) as unknown as { modifiers?: readonly { id: string }[] };
      expect(ergebnis.modifiers?.some(eintrag => eintrag.id === faehigkeit.id), faehigkeit.id).toBe(true);
    }
    // Die meisten Fähigkeiten tragen eine Regelwirkung, nicht nur Text.
    expect(pkg.abilities!.filter(faehigkeit => faehigkeit.modifiers?.length).length).toBeGreaterThanOrEqual(150);
  });
});

describe("Zustände und Aufstieg", () => {
  it("lässt einen aktiven Zustand die Probe erschweren", () => {
    const ergebnis = rules.evaluateSupportedAction(pkg, "skill_athletik", kontext({ ...basis, [rules.CHRONICLE_CONDITION_FIELD]: "erschoepft" })) as unknown as { modifiers: readonly { id: string; value: number }[] };
    expect(ergebnis.modifiers.find(eintrag => eintrag.id === "erschoepft")!.value).toBeLessThan(0);
  });

  it("gibt je auf Fertigkeiten gelegter Erfahrung 5 Punkte, und der Rest trägt Fähigkeiten", () => {
    const bogen = { ...rules.defaultSupportedActorFields(pkg), [rules.CHRONICLE_XP_FIELD]: 4, [rules.CHRONICLE_XP_SKILLS_FIELD]: 2 };
    expect(rules.evaluateComputedFields(pkg, bogen).points_available).toBe(rules.CHRONICLE_START_POINTS + 10);
    expect(rules.abilityOverview(pkg, bogen).budget).toBe(9 + 4 - 2);
    expect(() => rules.validatePackageFields(pkg, { ...bogen, [rules.CHRONICLE_XP_SKILLS_FIELD]: 5 })).toThrow();
  });
});

describe("Archetypen", () => {
  it("bietet 12 Startpakete mit gültigem Bogen, höchstens den Startpunkten und drei Fähigkeiten vom Rang 1", () => {
    expect(rules.CHRONICLE_ARCHETYPES).toHaveLength(12);
    for (const archetyp of rules.CHRONICLE_ARCHETYPES) {
      const ids = String(archetyp.fields[rules.CHRONICLE_ABILITY_FIELD]).split(",").map(teil => teil.trim());
      expect(ids, archetyp.id).toHaveLength(3);
      for (const id of ids) expect(nachKennung.get(id)?.rang, `${archetyp.id}: ${id}`).toBe(1);
      expect(() => rules.validatePackageFields(pkg, archetyp.fields), archetyp.id).not.toThrow();
      expect(rules.evaluateComputedFields(pkg, archetyp.fields).points_available, archetyp.id).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Grenzen und Herkunft", () => {
  it("übernimmt keinen fremden Regeltext", () => {
    const text = rules.stableJson(pkg);
    for (const fremd of ["How to be a Hero", "howtobeahero", "Geistesblitz", "Begabung"]) expect(text).not.toContain(fremd);
  });

  it("hält die Grenzen der Engine auch mit 24 Fertigkeiten", () => {
    const gross = rules.createChronicleHeroesPackage({ skills: rules.CHRONICLE_SKILL_LIBRARY.slice(0, rules.CHRONICLE_MAX_SKILLS) });
    expect(gross.abilities).toHaveLength(200);
    expect(new TextEncoder().encode(rules.stableJson(gross)).length).toBeLessThan(rules.RULE_LIMITS.packageBytes);
  });
});
