// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Notice, StepList, Tabs, ViewIntro, confirmAction, tabKeyTarget } from "@chronicle/ui";

// Kaya, 2026-09-26: „dass ein Nutzer, der das System nicht kennt, schnell weiß, wie es geht“.
// Diese Bausteine tragen das in jede Ansicht: wo bin ich, was ist erledigt, was kommt als Nächstes.
afterEach(() => { vi.unstubAllGlobals(); });

describe("gemeinsame Bausteine", () => {
  it("führt Pfeiltasten, Pos1 und Ende im Kreis", () => {
    expect(tabKeyTarget("ArrowRight", 2, 3)).toBe(0);
    expect(tabKeyTarget("ArrowLeft", 0, 3)).toBe(2);
    expect(tabKeyTarget("ArrowDown", 0, 3)).toBe(1);
    expect(tabKeyTarget("Home", 2, 3)).toBe(0);
    expect(tabKeyTarget("End", 0, 3)).toBe(2);
    expect(tabKeyTarget("a", 0, 3)).toBeNull();
    expect(tabKeyTarget("ArrowRight", 0, 0)).toBeNull();
  });

  it("zeigt Warnungen nicht als Erfolg und Fehler als Alarm", () => {
    const warn = renderToStaticMarkup(createElement(Notice, { tone: "warn" }, "x"));
    expect(warn).toContain("notice-warn"); expect(warn).toContain('role="status"'); expect(warn).not.toContain("notice-ok");
    expect(renderToStaticMarkup(createElement(Notice, { error: true }, "x"))).toContain('role="alert"');
    expect(renderToStaticMarkup(createElement(Notice, { error: true }, "x"))).toContain("notice-error");
    expect(renderToStaticMarkup(createElement(Notice, null, "x"))).toContain("notice-ok");
  });

  it("verbindet Reiter und Felder und macht nur den gewählten per Tab erreichbar", () => {
    const html = renderToStaticMarkup(createElement(Tabs, { label: "Ansicht", idPrefix: "v", value: "b", onChange() {}, items: [{ id: "a", label: "A" }, { id: "b", label: "B", badge: 2 }] }));
    expect(html).toContain('role="tablist"'); expect(html).toContain('aria-controls="v-panel-b"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain('aria-selected="true"'); expect(html).toContain("tab-badge");
  });

  it("sagt erledigte Schritte an und markiert den aktuellen", () => {
    const html = renderToStaticMarkup(createElement(StepList, { label: "Weg", steps: [{ id: "1", label: "Name", state: "done" }, { id: "2", label: "Würfel", state: "current" }, { id: "3", label: "Fertig", state: "todo" }] }));
    expect(html).toContain("erledigt"); expect(html).toContain('aria-current="step"');
    expect(html.match(/aria-current/g)).toHaveLength(1);
    expect(html).toContain("<ol");
  });

  it("sagt oben, was die Ansicht ist, und zeigt „Wie geht das?“ nur mit Schritten", () => {
    const plain = renderToStaticMarkup(createElement(ViewIntro, { id: "kopf", title: "Bibliothek", action: createElement("button", null, "Los") }, "Hier liegen deine Regelwerke."));
    expect(plain).toContain('<h2 id="kopf" tabindex="-1">Bibliothek</h2>');
    expect(plain).toContain("Hier liegen deine Regelwerke."); expect(plain).toContain("Los");
    expect(plain).not.toContain("<details");
    const withSteps = renderToStaticMarkup(createElement(ViewIntro, { id: "k", title: "T", level: 3, steps: ["Eins", "Zwei"] }, "Satz"));
    expect(withSteps).toContain("<h3"); expect(withSteps).toContain("Wie geht das?"); expect(withSteps).toContain("<ol><li>Eins</li><li>Zwei</li></ol>");
  });

  it("fällt ohne Host auf die Browser-Rückfrage zurück", async () => {
    const confirm = vi.fn(() => true); vi.stubGlobal("confirm", confirm);
    await expect(confirmAction({ title: "Löschen?", message: "Weg ist weg." })).resolves.toBe(true);
    expect(confirm).toHaveBeenCalledWith("Löschen?\n\nWeg ist weg.");
    await expect(confirmAction("Nur Text")).resolves.toBe(true);
    expect(confirm).toHaveBeenLastCalledWith("Nur Text");
  });

  it("sagt ohne Host und ohne Browser-Rückfrage lieber Nein", async () => {
    vi.stubGlobal("confirm", undefined);
    await expect(confirmAction("Wirklich?")).resolves.toBe(false);
  });
});
