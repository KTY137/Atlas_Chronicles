// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { grundText } from "../src/features/RuleForge.tsx";
import type { RulePackageHindernis } from "../src/features/game-api";

/**
 * Das Kontextmenü an der Bibliothek der Regelwerkstatt.
 *
 * Zwei Dinge halten dieser Test fest, die beim Umbauen leicht verlorengehen: dass ein Paket, auf
 * das noch etwas verweist, seinen Grund **anzeigt** statt einfach nicht zu reagieren — und dass
 * die Werkstatt dafür das vorhandene Kartenmenü benutzt, statt ein zweites zu erfinden.
 */
const QUELLE = readFileSync(new URL("../src/features/RuleForge.tsx", import.meta.url), "utf8");
const HINDERNISSE: RulePackageHindernis[] = ["eingebaut", "angeheftet", "boegen", "wuerfe"];

describe("Bibliothek der Regelwerkstatt", () => {
  it("nennt zu jedem Hindernis einen eigenen, verständlichen Grund", () => {
    const gruende = HINDERNISSE.map(grundText);
    expect(new Set(gruende).size).toBe(HINDERNISSE.length);
    for (const grund of gruende) {
      expect(grund.length).toBeGreaterThan(8);
      // Kein Fachjargon, keine Kennung: der Satz steht in einem ausgegrauten Menüeintrag.
      expect(grund).not.toMatch(/[_{}]|foreign|constraint|23503/i);
    }
    expect(grundText("angeheftet")).toMatch(/Runde/);
    expect(grundText("boegen")).toMatch(/Figurenbögen/);
    expect(grundText("wuerfe")).toMatch(/Würfen/);
  });

  it("benutzt das vorhandene Kartenmenü in seiner popup-Form, nicht ein zweites Menü", () => {
    expect(QUELLE).toContain('import { MapContextMenu } from "./MapContextMenu";');
    expect(QUELLE).toMatch(/<MapContextMenu[^>]*popup=\{\{ x: menu\.x, y: menu\.y/);
    // Ein Eintrag der Bibliothek ist selbst ein Knopf; ein zweiter Knopf darin wäre ungültig.
    // Deshalb die popup-Form und ein eigener Rechtsklick, genau wie an der Karte.
    expect(QUELLE).toMatch(/rf-catalog-item[\s\S]{0,900}onContextMenu=\{event =>/);
  });

  it("graut das endgültige Löschen mit Begründung aus, statt es stumm scheitern zu lassen", () => {
    expect(QUELLE).toMatch(/disabled: !menuStand\.loeschbar/);
    expect(QUELLE).toMatch(/danger: true/);
    expect(QUELLE).toContain('t("Endgültig löschen — geht nicht: {grund}", { grund: menuStand.hindernisse.map(grundText).join(", ") })');
    // Ausdrückliche Rückfrage vor dem Löschen, nie ein Klick allein.
    expect(QUELLE).toMatch(/const loeschen = \(item: RulePackage\) => \{\s*\n\s*if \(!window\.confirm\(/);
  });

  it("versteckt genommene Pakete, bis der Schalter sie zeigt", () => {
    expect(QUELLE).toContain("const verfuegbar = zeigeGenommene ? packages : packages.filter(item => !stand(item).genommen);");
    expect(QUELLE).toContain("const sichtbar = verfuegbar.filter(");
    expect(QUELLE).toContain('t("Auch genommene zeigen ({anzahl})", { anzahl: genommene.length })');
    expect(QUELLE).toMatch(/\{sichtbar\.map\(item =>/);
  });
});
