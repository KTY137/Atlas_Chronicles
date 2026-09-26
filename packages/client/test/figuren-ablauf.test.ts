// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultReason, reasonOrDefault } from "../src/features/figuren-gruende";
import { ChronicleHeroesTemplate } from "../src/features/ChronicleHeroesTemplate";

const source = (file: string) => readFileSync(new URL(`../src/features/${file}`, import.meta.url), "utf8");
const OWNED = ["ActorTemplatesHost.tsx", "InstantiateActorHost.tsx", "ActorWorkbench.tsx", "ActorInventoryWorkbench.tsx", "ChronicleHeroesTemplate.tsx",
  "FigurAntrag.tsx", "MeineFigur.tsx", "ForgeWorkbench.tsx", "ErsteSchritte.tsx"];
// Server: `reason` ist Pflicht (1–500 Zeichen, mindestens ein sichtbares Zeichen).
const SERVER_GRUND = /\S/;

describe("rund um die Figur", () => {
  it.each(OWNED)("%s fragt im Look nach, nie mit der Browser-Rückfrage", file => {
    expect(source(file)).not.toMatch(/window\.confirm/);
  });

  it.each(["bogen", "inventar", "figur", "vorlage"] as const)("füllt einen leeren Grund für „%s“ mit einem gültigen Standardgrund", art => {
    const grund = defaultReason(art);
    expect(grund).toMatch(SERVER_GRUND);
    expect(grund.length).toBeLessThanOrEqual(500);
    expect(reasonOrDefault("   ", art)).toBe(grund);
    expect(reasonOrDefault("  Heldentod  ", art)).toBe("Heldentod");
  });

  it("macht den Grund der Änderung freiwillig und sagt, wo er erscheint", () => {
    for (const file of ["ActorTemplatesHost.tsx", "ActorWorkbench.tsx", "ActorInventoryWorkbench.tsx"]) {
      const text = source(file);
      expect(text, file).not.toContain('t("Grund der Änderung")');
      expect(text, file).toContain('t("Grund (freiwillig, erscheint im Verlauf)")');
      expect(text, file).toContain("reasonOrDefault(");
    }
  });

  it("zeigt die ChronicleHeroes-Vorlage mit genau einem hervorgehobenen Knopf und Unterüberschriften", () => {
    const html = renderToStaticMarkup(createElement(ChronicleHeroesTemplate, { disabled: false, onCreate() {} }));
    expect(html.match(/button-primary/g)?.length ?? 0).toBeLessThanOrEqual(1);
    // Die Vorlage steht unter der h3 „Aus einer Vorlage beginnen“ der Bibliothek, also h4 und h5.
    expect(html).not.toMatch(/<h[23]/);
    expect(html).toMatch(/<h4/);
  });

  it("führt Figur anlegen und Figurantrag denselben Weg in drei Schritten", () => {
    const weg = source("InstantiateActorHost.tsx");
    for (const schritt of ['t("Wer ist die Figur?")', 't("Was kann sie?")', 't("Fertig")', 't("Bogen ansehen")', 't("Zurück auf die Vorgaben")']) expect(weg).toContain(schritt);
    expect(weg).toContain('part="identity"');
    expect(weg).toContain('part="values"');
    expect(weg).not.toMatch(/\buse(Memo|Id)\(/);
    const antrag = source("FigurAntrag.tsx");
    expect(antrag).toContain("<FigurWeg");
    expect(antrag).toContain('part="identity"');
    expect(antrag).toContain('part="values"');
    expect(antrag).toContain('omit={["name"]}');
    expect(antrag).toContain('t("Figur beantragen")');
    expect(antrag).toContain('t("Frühere Anträge")');
  });

  it("zeigt die Anträge der Spielleitung mit Zähler am Reiter und Paketnamen statt Kennung", () => {
    const workbench = source("ActorWorkbench.tsx");
    expect(workbench).toContain("<Tabs");
    expect(workbench).toContain("badge:");
    expect(workbench).not.toContain("antrag.package.id}@");
    expect(source("ForgeWorkbench.tsx")).toContain("<Tabs");
    expect(source("ForgeWorkbench.tsx")).toContain("<ErsteSchritte");
  });

  it("stellt jede Figurenansicht mit einem Kopf vor", () => {
    for (const file of ["ForgeWorkbench.tsx", "ActorTemplatesHost.tsx", "InstantiateActorHost.tsx", "FigurAntrag.tsx", "MeineFigur.tsx"]) expect(source(file), file).toContain("<ViewIntro");
  });
});
