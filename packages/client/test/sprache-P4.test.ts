// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Paket P4 (Atlas und Kartenverwaltung): der deutsche Quelltext bleibt der Schlüssel, der
// Katalog `i18n/en/P4.json` liefert die englische Fassung. Geprüft wird beides — die
// Stichproben in Englisch und dieselben Stellen wieder auf Deutsch — an echten Komponenten
// und an den Texten, die nur zur Laufzeit erreicht werden.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { BAUWERK_LABEL, KARTEN_SETTING_LABEL } from "@chronicle/szene";
import * as I18n from "../src/i18n.ts";
import { plural, setzeEnglischeQuelleFuerTests, setzeSprache, t } from "../src/i18n.ts";

const lies = (pfad: string) => JSON.parse(readFileSync(new URL(pfad, import.meta.url), "utf8")) as Record<string, never>;
const KATALOG = { texte: lies("../src/i18n/en/P4.json"), plural: lies("../src/i18n/en.plural.json") };

const DATEIEN = ["AtlasView", "NestedMapView", "MapLibrary", "MapDeleteDialog", "MapContextMenu"] as const;
const QUELLEN = new Map(DATEIEN.map(name => [name, readFileSync(new URL(`../src/features/${name}.tsx`, import.meta.url), "utf8")]));

/** Je eine Stichprobe aus jeder Datei des Pakets: deutscher Quelltext, Fundstelle, Englisch. */
const STICHPROBEN = [
  { datei: "AtlasView", de: "Ziehen zum Bewegen · Mausrad zum Zoomen · Eingangs-Icon: Unterkarte öffnen", en: "Drag to move · scroll wheel to zoom · entrance icon: open sub-map" },
  { datei: "NestedMapView", de: "Jeder Eingang führt zu einer eigenen Karte. Eure Änderungen bleiben beim Zurückkehren erhalten.", en: "Every entrance leads to a map of its own. Your changes are kept when you return." },
  { datei: "MapLibrary", de: "Noch keine gespeicherten Karten.", en: "No saved maps yet." },
  { datei: "MapDeleteDialog", de: "Karte endgültig löschen", en: "Delete map permanently" },
  { datei: "MapContextMenu", de: "Aktionen für {label}", en: "Actions for {label}" },
] as const;

/** Prüfstand wie in den übrigen Client-Suiten: die echte Komponente ohne DOM und ohne React. */
function pruefstand() {
  const slots: any[] = [];
  let cursor = 0, changed = false;
  const gleich = (a: unknown[] | undefined, b: unknown[]) => a?.length === b.length && a.every((wert, i) => Object.is(wert, b[i]));
  const react = {
    useRef(wert: unknown) { const i = cursor++; return slots[i] ??= { current: wert }; },
    useState(anfang: any) {
      const i = cursor++; slots[i] ??= { value: typeof anfang === "function" ? anfang() : anfang };
      return [slots[i].value, (naechste: any) => { const wert = typeof naechste === "function" ? naechste(slots[i].value) : naechste; if (!Object.is(wert, slots[i].value)) { slots[i].value = wert; changed = true; } }];
    },
    useMemo(fn: () => unknown) { return fn(); },
    useCallback(fn: unknown, deps: unknown[]) { const i = cursor++; if (!slots[i] || !gleich(slots[i].deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect() {}, useLayoutEffect() {}, useId: () => "id",
  };
  const element = (typ: unknown, props: any, key?: unknown) => ({ type: typ, props, key });
  const modul = { exports: {} as any };
  runInNewContext(transformSync(QUELLEN.get("MapLibrary")!, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module: modul, exports: modul.exports,
    require: (name: string) => {
      if (name === "../i18n") return I18n;
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      return new Proxy({}, { get: (_ziel, schluessel) => String(schluessel) });
    },
  });
  return (props: any) => {
    let baum: any;
    for (let runde = 0; runde < 20; runde++) { cursor = 0; changed = false; baum = modul.exports.MapLibrary(props); if (!changed) return baum; }
    throw new Error("Bauteil kam nicht zur Ruhe");
  };
}

const texte = (baum: any): string[] => {
  const gefunden: string[] = [];
  const gehe = (knoten: any) => {
    if (Array.isArray(knoten)) knoten.forEach(gehe);
    else if (typeof knoten === "string") gefunden.push(knoten);
    else if (knoten?.props) { for (const wert of Object.values(knoten.props)) if (typeof wert === "string") gefunden.push(wert); gehe(knoten.props.children); }
  };
  gehe(baum); return gefunden;
};

const BIBLIOTHEK = { items: [{ kind: "atlas" as const, id: "welt", name: "Andaria" }], onOpen: () => {}, onEdit: () => {}, onDelete: () => {} };

describe("Sprachpaket P4 — Atlas und Kartenverwaltung", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(async () => KATALOG as never); await setzeSprache("de"); });
  afterAll(async () => { setzeEnglischeQuelleFuerTests(null); await setzeSprache("de"); });

  it("findet jede Stichprobe als Literal in ihrer Quelldatei", () => {
    for (const probe of STICHPROBEN) expect(QUELLEN.get(probe.datei)).toContain(`t("${probe.de}"`);
  });

  it("übersetzt die Stichproben aller fünf Dateien nach Englisch", async () => {
    await setzeSprache("en");
    expect(STICHPROBEN.map(probe => t(probe.de))).toEqual(STICHPROBEN.map(probe => probe.en));
  });

  it("liefert dieselben Stichproben nach der Rückkehr wieder deutsch", async () => {
    await setzeSprache("en");
    await setzeSprache("de");
    expect(STICHPROBEN.map(probe => t(probe.de))).toEqual(STICHPROBEN.map(probe => probe.de));
  });

  it("übersetzt die Anzeigetabellen aus @chronicle/szene an der Anzeigestelle", async () => {
    expect(t(BAUWERK_LABEL.taverne)).toBe("Taverne");
    expect(t(KARTEN_SETTING_LABEL.scifi)).toBe("Science-Fiction");
    await setzeSprache("en");
    expect(t(BAUWERK_LABEL.taverne)).toBe("Tavern");
    expect(t(BAUWERK_LABEL.medstation)).toBe("Med bay");
    expect(t(KARTEN_SETTING_LABEL.scifi)).toBe("Science fiction");
  });

  it("wählt für die Löschmeldungen beide Pluralformen", async () => {
    expect(plural(1, "Die Karte wurde gelöscht.", "{n} Karten wurden gelöscht.")).toBe("Die Karte wurde gelöscht.");
    expect(plural(3, "Die Karte wurde gelöscht.", "{n} Karten wurden gelöscht.")).toBe("3 Karten wurden gelöscht.");
    await setzeSprache("en");
    expect(plural(1, "Die Karte wurde gelöscht.", "{n} Karten wurden gelöscht.")).toBe("The map was deleted.");
    expect(plural(3, "Die Karte wurde gelöscht.", "{n} Karten wurden gelöscht.")).toBe("3 maps were deleted.");
    expect(plural(2, "Diese Karte wird gelöscht", "{n} Karten werden gelöscht")).toBe("2 maps will be deleted");
  });

  it("zeichnet die Kartenbibliothek in beiden Sprachen", async () => {
    const zeichne = pruefstand();
    const deutsch = texte(zeichne(BIBLIOTHEK));
    expect(deutsch).toContain("Kartenbibliothek");
    expect(deutsch).toContain("Karte suchen …");
    expect(deutsch).toContain("Weltkarte");
    expect(deutsch).toContain("Andaria");
    await setzeSprache("en");
    const englisch = texte(zeichne(BIBLIOTHEK));
    expect(englisch).toContain("Map library");
    expect(englisch).toContain("Search for a map …");
    expect(englisch).toContain("World map");
    expect(englisch).toContain("Andaria");
    expect(englisch).not.toContain("Kartenbibliothek");
  });
});
