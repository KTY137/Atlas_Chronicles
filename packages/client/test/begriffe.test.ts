// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BEGRIFF_ERKLAERUNG_LABEL, BEGRIFF_IDS, BEGRIFF_LABEL } from "../src/features/begriffe";
import { Begriff } from "../src/features/Begriff";

// Ein Begriff, der bleiben muss, erklärt sich an Ort und Stelle — ein Satz, ein Beispiel.
describe("Begriffe erklären sich selbst", () => {
  it("hat für jeden Begriff ein Wort und eine kurze Erklärung mit Beispiel", () => {
    expect(BEGRIFF_IDS.length).toBeGreaterThanOrEqual(15);
    for (const id of BEGRIFF_IDS) {
      expect(BEGRIFF_LABEL[id], id).toMatch(/\S/);
      const erklaerung = BEGRIFF_ERKLAERUNG_LABEL[id];
      expect(erklaerung.length, id).toBeLessThanOrEqual(220);
      expect(erklaerung, id).toContain("zum Beispiel");
      expect(erklaerung.split(/[.!?](?:\s|$)/).filter(part => part.trim()).length, id).toBeLessThanOrEqual(2);
    }
  });

  it("zeigt das Wort mit einem Fragezeichen, das die Erklärung erst auf Wunsch aufklappt", () => {
    const html = renderToStaticMarkup(createElement(Begriff, { id: "balken" }));
    expect(html).toContain(">Balken<");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Was bedeutet „Balken“?"');
    expect(html).toMatch(/class="begriff-erklaerung" hidden=""/);
    expect(html).toContain(BEGRIFF_ERKLAERUNG_LABEL.balken);
  });

  it("darf ein eigenes Wort tragen, ohne die Erklärung zu verlieren", () => {
    const html = renderToStaticMarkup(createElement(Begriff, { id: "attribut" }, "Attribute"));
    expect(html).toContain(">Attribute<");
    expect(html).toContain('aria-label="Was bedeutet „Attribut“?"');
  });
});
