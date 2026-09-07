import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ItemContract } from "@chronicle/protocol";
import { Lootkarte } from "../src/features/Lootkarte";

// Die Karte ist rein darstellend. Zwei Dinge muss sie trotzdem richtig machen: nichts erfinden,
// was in der Definition nicht steht, und die Seltenheit nicht nur als Farbe sagen.
const zeige = (definition: ItemContract) =>
  renderToStaticMarkup(createElement(Lootkarte, { definition, campaignId: "kampagne" }));

const karte: ItemContract = {
  schemaVersion: 2, name: "Laterne des Kartografen", loreEntryId: null, tags: ["licht", "werkzeug"],
  seltenheit: "episch", kategorie: "Werkzeug", bildAssetId: null,
  spruch: "Sie brennt auch dort, wo es nichts zu sehen gibt.",
  zeilen: [{ label: "Gewicht", wert: "1 Pfund" }],
};

describe("Die Lootkarte", () => {
  it("nennt die Seltenheit als Wort, nicht nur als Farbe", () => {
    // Eine Aussage, die allein in der Rahmenfarbe steckt, kommt bei Farbenblindheit nicht an.
    const html = zeige(karte);
    expect(html).toContain("Episch");
    expect(html).toContain('data-seltenheit="episch"');
  });

  it("zeigt Art, Spruch, Zeilen und Etiketten", () => {
    const html = zeige(karte);
    expect(html).toContain("Werkzeug");
    expect(html).toContain("nichts zu sehen");
    expect(html).toContain("Gewicht");
    expect(html).toContain("1 Pfund");
    expect(html).toContain("licht");
  });

  it("erfindet für eine Vorlage ohne Kartengesicht nichts", () => {
    // Fassung 1 hat keine Seltenheit. Sie mit „Gewöhnlich" aufzufüllen wäre eine Aussage über
    // einen Gegenstand, die niemand getroffen hat — die Karte sagt stattdessen, dass sie fehlt.
    const alt: ItemContract = { schemaVersion: 1, name: "Laterne", loreEntryId: null, tags: ["licht"] };
    const html = zeige(alt);
    expect(html).toContain("Laterne");
    expect(html).toContain("licht");
    expect(html).toContain("noch kein Kartengesicht");
    for (const wort of ["Gewöhnlich", "Ungewöhnlich", "Selten", "Episch", "Legendär"]) expect(html).not.toContain(wort);
  });

  it("zeigt den Platzhalter, solange kein Bild gewählt ist", () => {
    expect(zeige(karte)).not.toContain("<img");
    const mitBild = zeige({ ...karte, bildAssetId: "asset-1" });
    expect(mitBild).toContain("<img");
    // Der Bildpfad ist der vorhandene Bildbestand der Kampagne — kein zweiter Bilderspeicher.
    expect(mitBild).toContain("/wiki-medien/asset-1/datei");
  });

  it("bleibt lesbar, wenn Spruch, Art und Zeilen leer sind", () => {
    const karg: ItemContract = { ...karte, kategorie: "", spruch: "", zeilen: [], tags: [] };
    const html = zeige(karg);
    expect(html).toContain("Laterne des Kartografen");
    expect(html).toContain("Episch");
  });
});
