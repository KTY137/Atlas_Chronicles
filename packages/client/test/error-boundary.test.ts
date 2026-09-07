// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { isValidElement, type ReactElement } from "react";
import { ErrorBoundary } from "../src/ErrorBoundary.tsx";

/**
 * Die Fehlergrenze ohne DOM geprüft.
 *
 * Die Testumgebung läuft in Node ohne jsdom (vitest.config.ts: environment "node"), deshalb
 * wird hier nicht gerendertes HTML untersucht, sondern der tatsächliche Vertrag: was React
 * aus einem geworfenen Fehler macht, und was die Komponente daraufhin zurückgibt.
 *
 * Der Fall, den das absichert: ein einziger Fehler beim Rendern hängt sonst den ganzen Baum ab
 * und hinterlässt eine weiße Seite — ohne Text, ohne Knopf, ohne Hinweis, dass Neuladen hilft.
 */

/** Sammelt alle Texte und Element-Eigenschaften eines Elementbaums ein. */
function walk(node: unknown, seen: { text: string[]; roles: string[]; types: string[] }): void {
  if (node === null || node === undefined || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") { seen.text.push(String(node)); return; }
  if (Array.isArray(node)) { for (const child of node) walk(child, seen); return; }
  if (isValidElement(node)) {
    const element = node as ReactElement<Record<string, unknown>>;
    if (typeof element.type === "string") seen.types.push(element.type);
    const props = element.props;
    if (typeof props["role"] === "string") seen.roles.push(props["role"]);
    walk(props["children"], seen);
  }
}

const collect = (node: unknown) => {
  const seen = { text: [] as string[], roles: [] as string[], types: [] as string[] };
  walk(node, seen);
  return { ...seen, all: seen.text.join(" ") };
};

describe("die Fehlergrenze fängt ab, statt die Seite zu leeren", () => {
  it("macht aus einem geworfenen Fehler einen benannten Zustand", () => {
    const next = ErrorBoundary.getDerivedStateFromError(new Error("Chunk konnte nicht geladen werden"));
    expect(next.failed).toBe(true);
    expect(next.detail).toBe("Chunk konnte nicht geladen werden");
  });

  it("verkraftet auch etwas, das gar kein Fehlerobjekt ist", () => {
    const next = ErrorBoundary.getDerivedStateFromError("kaputt");
    expect(next.failed).toBe(true);
    expect(next.detail).toBe("kaputt");
  });

  it("reicht im Normalfall die Kinder unverändert durch", () => {
    const boundary = new ErrorBoundary({ children: "der ganze Rest der Anwendung" });
    boundary.state = { failed: false, detail: "" };
    expect(boundary.render()).toBe("der ganze Rest der Anwendung");
  });

  it("zeigt im Fehlerfall eine Meldung mit genau einem nächsten Schritt", () => {
    const boundary = new ErrorBoundary({ children: "nie sichtbar" });
    boundary.state = { failed: true, detail: "Loading chunk 7 failed" };
    const seen = collect(boundary.render());

    // Nicht die Kinder, sondern die Auffangfläche.
    expect(seen.all).not.toContain("nie sichtbar");
    // Als Warnung ausgezeichnet, damit Screenreader sie ansagen.
    expect(seen.roles).toContain("alert");
    // Ein Weg nach vorn, kein Sackgassentext.
    expect(seen.types).toContain("button");
    expect(seen.all).toContain("Seite neu laden");
    // Sagt, dass die Inhalte des Nutzers nicht betroffen sind — das ist die eigentliche Angst.
    expect(seen.all).toMatch(/Inhalte sind davon nicht betroffen/);
    // Die technische Ursache ist verfügbar, aber nicht die Hauptaussage.
    expect(seen.all).toContain("Loading chunk 7 failed");
    expect(seen.types).toContain("details");
  });

  it("kommt ohne technische Einzelheiten aus, wenn keine da sind", () => {
    const boundary = new ErrorBoundary({ children: "x" });
    boundary.state = { failed: true, detail: "" };
    const seen = collect(boundary.render());
    expect(seen.types).not.toContain("details");
    expect(seen.all).toContain("Seite neu laden");
  });
});
