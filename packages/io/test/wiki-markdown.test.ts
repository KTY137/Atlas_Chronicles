// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import type { EntryProjektion, ProjBlock } from "@chronicle/projection";
import { artikelAlsMarkdown, schuetzeMarkdown, wikiAlsMarkdown } from "../src/index.ts";

// Der Export ist eine KOPIE, keine Interpretation. Diese Datei hält beides fest: dass die
// Struktur überlebt, und dass nichts behauptet wird, was in der Datei nicht steht.

const t = (text: string, ...marks: ProjBlock extends never ? never : { art: "em" | "strong" | "code" }[]) => ({ text, marks });
const absatz = (text: string): ProjBlock => ({ kind: "absatz", inhalt: [{ text, marks: [] }] });
const passage = (pid: string, ord: number, pfad: string[], inhalt: ProjBlock) => ({ pid, ord, pfad, inhalt });
const artikel = (passagen: ReturnType<typeof passage>[], titel = "Andaria", slug = "andaria"): EntryProjektion =>
  ({ entryId: "e1", slug, titel, passagen });

describe("Markdown-Schutz", () => {
  it("lässt einen Stern einen Stern bleiben", () => {
    // Ohne Schutz formatierte sich ein Artikel, der über Markdown-Zeichen spricht, beim Export
    // selbst um — der Export wäre dann keine Kopie mehr.
    expect(schuetzeMarkdown("Der *Stern* und [die] Klammer")).toBe("Der \\*Stern\\* und \\[die\\] Klammer");
    expect(schuetzeMarkdown("# keine Überschrift")).toBe("\\# keine Überschrift");
  });
});

describe("Ein Artikel als Markdown", () => {
  it("setzt Überschriften erst dort, wo der Pfad sich ändert", () => {
    const md = artikelAlsMarkdown(artikel([
      passage("p1", 0, [], absatz("Ein Reich am Fluss.")),
      passage("p2", 1, ["Geschichte"], absatz("Erst kam das Wasser.")),
      passage("p3", 2, ["Geschichte"], absatz("Dann kamen die Menschen.")),
      passage("p4", 3, ["Geschichte", "Der Krieg"], absatz("Und dann das Feuer.")),
    ]));
    // Genau EINE Überschrift „Geschichte", obwohl zwei Passagen darunter hängen.
    expect(md.match(/^### Geschichte$/gm)).toHaveLength(1);
    expect(md).toContain("#### Der Krieg");
    expect(md.indexOf("Erst kam das Wasser")).toBeLessThan(md.indexOf("#### Der Krieg"));
  });

  it("ordnet nach `ord` und nicht nach der Reihenfolge im Feld", () => {
    const md = artikelAlsMarkdown(artikel([
      passage("p2", 1, [], absatz("Zweitens.")),
      passage("p1", 0, [], absatz("Erstens.")),
    ]));
    expect(md.indexOf("Erstens")).toBeLessThan(md.indexOf("Zweitens"));
  });

  it("erhält Listen, Zitate, Auszeichnungen und Verweise", () => {
    const md = artikelAlsMarkdown(artikel([
      passage("p1", 0, [], { kind: "liste", geordnet: false, punkte: [[{ text: "Salz", marks: [] }], [{ text: "Eisen", marks: [] }]] }),
      passage("p2", 1, [], { kind: "liste", geordnet: true, punkte: [[{ text: "Zuerst", marks: [] }]] }),
      passage("p3", 2, [], { kind: "zitat", inhalt: [{ text: "Wir kamen bei Nacht.", marks: [] }] }),
      passage("p4", 3, [], { kind: "absatz", inhalt: [{ text: "wichtig", marks: [{ art: "strong" }] }, { text: " und ", marks: [] }, { text: "Eron", marks: [{ art: "link", zielSlug: "eron" }] }] }),
    ]));
    expect(md).toContain("- Salz");
    expect(md).toContain("1. Zuerst");
    expect(md).toContain("> Wir kamen bei Nacht");
    expect(md).toContain("**wichtig**");
    // Ein Verweis zeigt in dasselbe Dokument — der Export ist EINE Datei.
    expect(md).toContain("[Eron](#eron)");
  });

  it("benennt eine Abbildung, statt ein Bild zu behaupten, das nicht in der Datei liegt", () => {
    const md = artikelAlsMarkdown(artikel([
      passage("p1", 0, [], { kind: "bildunterschrift", assetId: "a1", dateiname: "burg.png", inhalt: [{ text: "Die Burg im Winter", marks: [] }] }),
    ]));
    expect(md).toContain("*Abbildung: burg\\.png*");
    expect(md).toContain("Die Burg im Winter");
    // Kein `![…](…)`: die Bytes liegen nicht bei, ein Bildverweis zeigte auf nichts.
    expect(md).not.toContain("![");
  });

  it("zeigt einen unverwandelten Rohblock, statt ihn stillschweigend fallenzulassen", () => {
    const md = artikelAlsMarkdown(artikel([
      passage("p1", 0, [], { kind: "rohblock", quelltext: "{{Vorlage|x=1}}", grund: "unbekannte Vorlage" }),
    ]));
    expect(md).toContain("Aus dem Wiki übernommen");
    expect(md).toContain("{{Vorlage|x=1}}");
  });

  it("hält mehrwertige Infobox-Zeilen als Aufzählung getrennt", () => {
    // Sie zu einer Zeile mit Kommas zusammenzuziehen verlöre die Aussage, dass es mehrere
    // getrennte Werte sind.
    const md = artikelAlsMarkdown(artikel([
      passage("p1", 0, [], { kind: "feld", schluessel: "haupt", label: "Hauptstädte", mehrwertig: true,
        werte: [[{ text: "Eron", marks: [] }], [{ text: "Kalt", marks: [] }]] }),
      passage("p2", 1, [], { kind: "feld", schluessel: "flu", label: "Fluss", mehrwertig: false, werte: [[{ text: "Aar", marks: [] }]] }),
    ]));
    expect(md).toContain("**Hauptstädte**:\n- Eron\n- Kalt");
    expect(md).toContain("**Fluss**: Aar");
  });
});

describe("Die ganze Chronik als ein Dokument", () => {
  const zwei = [artikel([passage("p1", 0, [], absatz("Ein Reich."))], "Andaria", "andaria"),
                artikel([passage("p2", 0, [], absatz("Eine Stadt."))], "Eron", "eron")];

  it("sagt im Kopf, wessen Blick das ist", () => {
    // Das Wichtigste am Spielerexport: er ist eine Teilmenge und sagt das. Bliebe es ungesagt,
    // hielte jemand seinen Ausschnitt für die Welt und merkte es nie.
    const spieler = wikiAlsMarkdown({ titel: "Andaria", artikel: zwei, erzeugtAm: "2026-09-07", vollstaendig: false });
    expect(spieler).toContain("**dein** Blick");
    expect(spieler).not.toContain("Vollständiger Stand");
    const leitung = wikiAlsMarkdown({ titel: "Andaria", artikel: zwei, erzeugtAm: "2026-09-07", vollstaendig: true });
    expect(leitung).toContain("Vollständiger Stand");
    expect(leitung).not.toContain("**dein** Blick");
  });

  it("führt jeden Artikel im Inhaltsverzeichnis und legt seine Sprungmarke", () => {
    const md = wikiAlsMarkdown({ titel: "Andaria", artikel: zwei, erzeugtAm: "2026-09-07", vollstaendig: true });
    expect(md).toContain("- [Andaria](#andaria)");
    expect(md).toContain("- [Eron](#eron)");
    expect(md).toContain('<a id="eron"></a>');
    expect(md).toContain("## Eron");
  });

  it("bleibt bei einer leeren Chronik ein gültiges Dokument", () => {
    const md = wikiAlsMarkdown({ titel: "Neu", artikel: [], erzeugtAm: "2026-09-07", vollstaendig: false });
    expect(md).toContain("# Neu");
    expect(md).toContain("Noch ist nichts zu lesen");
    expect(md).not.toContain("## Inhalt");
  });
});
