// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Die Logik hinter Fähigkeiten und Zuständen am Bogen und am Tisch (Spec
 * 2026-09-11-chronicleheroes-faehigkeiten, Schritt 3). Rein und ohne React geprüft, an ChronicleHeroes 2.0.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as rules from "@chronicle/rules";
import { FaehigkeitenBogen } from "../src/features/FaehigkeitenBogen";
import { einsatzKandidaten, faehigkeitenListe, grundNichtLernbar, sichtbareEingaben, verlernen, wirktMit } from "../src/features/faehigkeiten-bogen";

const pkg = rules.CHRONICLE_HEROES_PACKAGE;
const bogen = (extra: Record<string, rules.Scalar> = {}) => ({
  ...rules.defaultSupportedActorFields(pkg),
  ...Object.fromEntries(rules.CHRONICLE_DEFAULT_SKILLS.map(skill => [rules.chronicleSkillField(skill.id), 40])),
  ...extra,
});

describe("Parameter, die nie als freie Eingabe erscheinen", () => {
  it("blendet einsatz und mod_* bei Paketen mit Fähigkeiten aus — und sonst nichts", () => {
    const probe = pkg.actions.find(action => action.id === "skill_athletik")!;
    expect(Object.keys(sichtbareEingaben(pkg, probe.inputs))).toEqual([]);
    const schaden = pkg.actions.find(action => action.id === "schaden")!;
    expect(Object.keys(sichtbareEingaben(pkg, schaden.inputs)).sort()).toEqual(["bonus", "critical", "dice_count", "ziel_ruestung"]);
    // Ein Regelwerk ohne Fähigkeiten darf einen eigenen Parameter so nennen.
    expect(Object.keys(sichtbareEingaben(rules.DEMO_RULE_PACKAGE, { einsatz: { type: "string", label: "Einsatz", default: "", maxLength: 10 } }))).toEqual(["einsatz"]);
  });
});

describe("Fähigkeiten am Bogen", () => {
  it("liest die Kennungsliste robust", () => {
    expect(faehigkeitenListe(" a, b,,c ")).toEqual(["a", "b", "c"]);
    expect(faehigkeitenListe(3)).toEqual([]);
  });

  it("nimmt beim Verlernen alles mit, was darauf aufbaut", () => {
    expect(verlernen(pkg, ["leichtfuessig", "kraftakt", "unermuedlich", "belesen"], "leichtfuessig")).toEqual(["belesen"]);
    expect(verlernen(pkg, ["leichtfuessig", "kraftakt"], "kraftakt")).toEqual(["leichtfuessig"]);
  });

  it("nennt, warum eine Fähigkeit noch nicht lernbar ist", () => {
    expect(grundNichtLernbar(pkg, bogen(), "leichtfuessig")).toBeNull();
    expect(grundNichtLernbar(pkg, bogen(), "kraftakt")).toEqual({ art: "vorstufe", fehlend: ["Leichtfüßig"] });
    expect(grundNichtLernbar(pkg, bogen({ skill_athletik: 10 }), "leichtfuessig")).toEqual({ art: "voraussetzung" });
    expect(grundNichtLernbar(pkg, bogen({ [rules.CHRONICLE_ABILITY_FIELD]: "belesen, wachsam, verbandskunde" }), "leichtfuessig")).toEqual({ art: "erfahrung", fehlt: 3 });
    expect(grundNichtLernbar(pkg, bogen({ [rules.CHRONICLE_ABILITY_FIELD]: "leichtfuessig" }), "leichtfuessig")).toEqual({ art: "gelernt" });
  });
});

describe("Am Tisch", () => {
  const gelernt = bogen({ skill_athletik: 60, [rules.CHRONICLE_XP_FIELD]: 10, [rules.CHRONICLE_ABILITY_FIELD]: "leichtfuessig, kraftakt, harter_schlag" });

  it("bietet für eine Aktion nur gelernte Einsatz- und Reaktionsfähigkeiten an, die sie treffen", () => {
    expect(einsatzKandidaten(pkg, gelernt, "skill_athletik").map(ability => ability.id)).toEqual(["kraftakt"]);
    expect(einsatzKandidaten(pkg, gelernt, "schaden").map(ability => ability.id)).toEqual([]);
  });

  it("zeigt, was ohnehin mitwirkt: aktive Zustände, dann dauerhafte Fähigkeiten", () => {
    const fields = { ...gelernt, [rules.CHRONICLE_CONDITION_FIELD]: "erschoepft" };
    expect(wirktMit(pkg, fields, "skill_athletik").map(eintrag => [eintrag.name, eintrag.wert])).toEqual([["Erschöpft", "-10"], ["Leichtfüßig", "5"]]);
    expect(wirktMit(pkg, fields, "schaden").map(eintrag => [eintrag.name, eintrag.wert])).toEqual([["Harter Schlag", "2"]]);
  });
});

describe("Fähigkeiten als Karten am Bogen", () => {
  const zeige = (fields: Record<string, rules.Scalar>) => renderToStaticMarkup(createElement(FaehigkeitenBogen, { pkg, fields, onChange() {} }));

  it("nennt jeden Knopf nach seiner Fähigkeit", () => {
    const html = zeige(bogen({ [rules.CHRONICLE_ABILITY_FIELD]: "leichtfuessig" }));
    expect(html).toContain("Leichtfüßig verlernen");
    expect(html).toMatch(/ lernen<\/button>/);
    expect(html).not.toMatch(/>(Lernen|Verlernen)<\/button>/);
    expect(html).toContain("ability-card");
  });

  it("sagt bei leerer Liste, was hineingehört, und erklärt den Begriff", () => {
    const html = zeige(bogen({ [rules.CHRONICLE_ABILITY_FIELD]: "" }));
    expect(html).toContain("Noch keine Fähigkeit gelernt.");
    expect(html).toContain("Was bedeutet „Fähigkeit“?");
  });

  it("zeigt Zustände als Umschalt-Chips", () => {
    expect(zeige(bogen())).toMatch(/<label class="condition-chip[^"]*"[^>]*><input[^>]*type="checkbox"/);
  });
});
