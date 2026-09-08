// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Paket P5 (Kartenstudio und Szenenkarte): der deutsche Quelltext bleibt der Schlüssel, der
// Katalog `i18n/en/P5.json` liefert die englische Fassung. Geprüft wird beides — die
// Stichproben in Englisch und dieselben Stellen wieder auf Deutsch — an den Quelldateien,
// an den Texten der Helfer, die erst zur Laufzeit entstehen, und an einer echten Komponente.
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ASSET_GENRE_LABEL, BAUWERK_LABEL, BAUWERK_TYPEN } from "@chronicle/szene";
import * as I18n from "../src/i18n.ts";
import { setzeEnglischeQuelleFuerTests, setzeSprache, t } from "../src/i18n.ts";
import { generationError, generationSettings, type GenerationDefaults } from "../src/features/map-generation.ts";
import { preparationObjects } from "../src/features/tactical-entities.ts";

const lies = (pfad: string) => JSON.parse(readFileSync(new URL(pfad, import.meta.url), "utf8")) as Record<string, never>;
const KATALOG = { texte: lies("../src/i18n/en/P5.json"), plural: lies("../src/i18n/en.plural.json") };

const DATEIEN = [
  "MapArtworkPalette.tsx", "MapEditTools.tsx", "MapEditor.tsx", "MapGenerationControls.tsx",
  "TacticalCanvas.tsx", "TacticalEntitiesEditor.tsx", "TacticalGenerate.tsx", "TacticalImport.tsx",
  "TacticalObjectList.tsx", "TacticalPreparation.tsx", "TacticalView.tsx",
  "map-generation.ts", "tactical-entities.ts",
] as const;
const QUELLEN = new Map(DATEIEN.map(name => [name, readFileSync(new URL(`../src/features/${name}`, import.meta.url), "utf8")]));

/** Je eine Stichprobe aus jeder Datei des Pakets: deutscher Quelltext, Fundstelle, Englisch. */
const STICHPROBEN = [
  { datei: "MapArtworkPalette.tsx", de: "Wähle ein Objekt und klicke auf die Karte. Es wird mit der Kartenrevision gespeichert.", en: "Choose an object and click the map. It is saved with the map revision." },
  { datei: "MapEditTools.tsx", de: "Wähle ein Gebäude, einen Raum, eine Wand oder ein Objekt auf der Karte.", en: "Choose a building, a room, a wall or an object on the map." },
  { datei: "MapEditor.tsx", de: "Landschaft gestalten. Räume bauen. Geschichten einrichten.", en: "Shape the landscape. Build rooms. Furnish stories." },
  { datei: "MapGenerationControls.tsx", de: "Bestimmt Gelände, Wasser und bebaubares Land. Danach kannst du die Landschaft frei bearbeiten.", en: "Determines terrain, water and buildable land. Afterwards you can edit the landscape freely." },
  { datei: "TacticalCanvas.tsx", de: "Kacheln erneut laden", en: "Reload tiles" },
  { datei: "TacticalEntitiesEditor.tsx", de: "Ort an diesen Koordinaten markieren", en: "Mark a place at these coordinates" },
  { datei: "TacticalGenerate.tsx", de: "Vom Ort zum Abenteuer", en: "From a place to an adventure" },
  { datei: "TacticalImport.tsx", de: "Eine Szenenkarte übernehmen", en: "Take over a scene map" },
  { datei: "TacticalObjectList.tsx", de: "Keine passenden Orte oder Kartenobjekte.", en: "No matching places or map objects." },
  { datei: "TacticalPreparation.tsx", de: "Für eine Szene vorbereiten", en: "Prepare for a scene" },
  { datei: "TacticalView.tsx", de: "Figuren auf der Karte", en: "Characters on the map" },
  { datei: "map-generation.ts", de: "Diese Größe überschreitet das Kartenbudget. Wähle eine kleinere Fläche.", en: "This size exceeds the map budget. Choose a smaller area." },
  { datei: "tactical-entities.ts", de: "Verknüpfter Artikel", en: "Linked article" },
] as const;

const STANDARD = {
  grundriss: { zellen: [40, 30], zellgroesse: 64, raeume: 11, minRaum: 3, schleifen: 3, moeblierung: 1, licht: true, gangboden: "trocken", anordnung: "streuung", profil: "frei" },
  hoehle: { zellen: [44, 32], zellgroesse: 64, kammern: 8, fuellung: .45, glaettung: 4, mindestFlaeche: 12, moeblierung: 1, licht: true },
  siedlung: { art: "dorf", ausdehnung: [36, 28], zellgroesse: 96, bauwerke: 42, strassenDichte: .3, grundstueck: [3, 6], licht: true },
} as unknown as GenerationDefaults;

const LEERES_DOKUMENT = {
  geometry: { size: [400, 400], regions: [], places: [{ id: "ort", x: 10, y: 10 }], stamps: [{ id: "objekt", a: "pk.gemalt/tisch", x: 20, y: 20, s: 1, r: 0, l: 1 }] },
} as never;

/** Prüfstand wie in den übrigen Client-Suiten: die echte Komponente ohne DOM und ohne React. */
function pruefstand() {
  const element = (typ: unknown, props: any, key?: unknown) => ({ type: typ, props, key });
  const modul = { exports: {} as any };
  runInNewContext(transformSync(QUELLEN.get("MapEditTools.tsx")!, { loader: "tsx", format: "cjs", jsx: "automatic" }).code, {
    module: modul, exports: modul.exports,
    require: (name: string) => {
      if (name === "../i18n") return I18n;
      if (name === "@chronicle/szene") return { BAUWERK_LABEL, BAUWERK_TYPEN };
      if (name === "@chronicle/ui") return { Button: "Button" };
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "Fragment" };
      return new Proxy({}, { get: (_ziel, schluessel) => String(schluessel) });
    },
  });
  const werte = modul.exports.mapToolSettings(100);
  return () => modul.exports.MapEditTools({
    value: werte, onChange: () => {}, linked: false, busy: false, childrenConfirmed: true,
    onLock: () => {}, onRotate: () => {}, onRemove: () => {}, onVary: () => {},
  });
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

describe("Sprachpaket P5 — Kartenstudio und Szenenkarte", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(async () => KATALOG as never); await setzeSprache("de"); });
  afterAll(async () => { setzeEnglischeQuelleFuerTests(null); await setzeSprache("de"); });

  it("findet jede Stichprobe als Literal in ihrer Quelldatei", () => {
    for (const probe of STICHPROBEN) expect(QUELLEN.get(probe.datei)).toContain(`t("${probe.de}"`);
  });

  it("übersetzt die Stichproben aller dreizehn Dateien nach Englisch", async () => {
    await setzeSprache("en");
    expect(STICHPROBEN.map(probe => t(probe.de))).toEqual(STICHPROBEN.map(probe => probe.en));
  });

  it("liefert dieselben Stichproben nach der Rückkehr wieder deutsch", async () => {
    await setzeSprache("en");
    await setzeSprache("de");
    expect(STICHPROBEN.map(probe => t(probe.de))).toEqual(STICHPROBEN.map(probe => probe.de));
  });

  it("übersetzt die Genretabelle der Assetpakete an der Anzeigestelle", async () => {
    expect(t(ASSET_GENRE_LABEL.noir)).toBe("Noir & Krimi");
    await setzeSprache("en");
    expect(t(ASSET_GENRE_LABEL.noir)).toBe("Noir & crime");
    expect(t(ASSET_GENRE_LABEL.piraten)).toBe("Pirates & seafaring");
  });

  it("gibt die Fehlersätze des Generators und die Marker-Namen in der gewählten Sprache", async () => {
    const zuGross = { ...generationSettings("grundriss"), breite: 190, hoehe: 190 };
    expect(generationError(zuGross, STANDARD)).toBe("Die Karte darf höchstens 20.000 Zellen enthalten. Verringere Breite oder Höhe.");
    expect(preparationObjects(LEERES_DOKUMENT, [], []).map(objekt => objekt.label)).toEqual(["Unverknüpfter Ort", "Unverknüpftes Kartenobjekt"]);
    await setzeSprache("en");
    expect(generationError(zuGross, STANDARD)).toBe("The map may contain at most 20,000 cells. Reduce the width or the height.");
    expect(preparationObjects(LEERES_DOKUMENT, [], []).map(objekt => objekt.label)).toEqual(["Unlinked place", "Unlinked map object"]);
  });

  it("zeichnet die Kartenwerkzeuge in beiden Sprachen", async () => {
    const zeichne = pruefstand();
    const deutsch = texte(zeichne());
    expect(deutsch).toContain("Werkzeuge");
    expect(deutsch).toContain("Innenräume");
    expect(deutsch).toContain("Am Raster einrasten");
    expect(deutsch).toContain("Wähle ein Gebäude, einen Raum, eine Wand oder ein Objekt auf der Karte.");
    await setzeSprache("en");
    const englisch = texte(zeichne());
    expect(englisch).toContain("Tools");
    expect(englisch).toContain("Interiors");
    expect(englisch).toContain("Snap to grid");
    expect(englisch).toContain("Choose a building, a room, a wall or an object on the map.");
    expect(englisch).not.toContain("Werkzeuge");
  });
});
