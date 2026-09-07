import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { trustUniverseId } from "@chronicle/core";
import { decomposeWiki, importEron, parseBildAufruf, dateiSlug } from "../src/index.ts";
import { leseLizenz } from "../src/medien.ts";
import type { EronArticle, EronImportInput, EronMediaFile, EronTemplate } from "../src/index.ts";

/**
 * DAS BILD KOMMT MIT.
 *
 * Before this, every picture in the corpus was a `rohblock`: the reader saw wikitext in a
 * bordered "not converted" card where the portrait belonged, and the import report counted the
 * portrait of every named character as a loss. The claim under test is that a figure is now
 * structure the product owns — with a stable identity, a caption, and a licence verdict that is
 * pessimistic on purpose.
 *
 * The numbers are measured against the user's real wiki, not a fixture written to agree.
 */
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../../../design/fixtures/eron/${name}`, import.meta.url), "utf8"));
const articles = fixture("articles.json") as EronArticle[];
const templates = fixture("templates.json") as EronTemplate[];
const mediaInventory = fixture("media.json") as EronMediaFile[];
const config = { universeId: trustUniverseId("eron"), wikiUrl: "https://eron.fandom.com/de/", importiertAm: "2026-09-07T12:00:00Z", templates };
const run = (rows: EronArticle[], options: Partial<EronImportInput> = {}) => importEron({ ...config, articles: rows, ...options });
const artikel = (title: string) => articles.find((row) => row.title === title)!;

describe("die Bildsyntax", () => {
  it("separates options from the caption the way MediaWiki does", () => {
    expect(parseBildAufruf("Datei:Bodin.jpg|mini|links|220px|alt=Ein Zwerg|Bodin, [[Zwerg]] aus [[Bjoldiri]]")).toEqual({
      dateiname: "Bodin.jpg", beschriftung: "Bodin, [[Zwerg]] aus [[Bjoldiri]]", alt: "Ein Zwerg", ausrichtung: "links", breite: 220,
    });
    // German option names are not a nicety here: this corpus is German.
    expect(parseBildAufruf("Datei:X.png|miniatur|rechts|hochkant=1.4|Die Karte")).toMatchObject({ ausrichtung: "rechts", beschriftung: "Die Karte" });
    // `x120px` bounds the height. Recording 120 as a width would invent a measurement.
    expect(parseBildAufruf("Datei:X.png|x120px")).toEqual({ dateiname: "X.png", beschriftung: "" });
    expect(parseBildAufruf("Datei:X.png|100x200px")).toMatchObject({ breite: 100 });
    expect(parseBildAufruf("|mini")).toBeNull();
  });

  it("gives one picture one identity, however the source spelled it", () => {
    expect(dateiSlug("Datei:Bodin.jpg")).toBe("Bodin.jpg");
    expect(dateiSlug("File:Bodin.jpg")).toBe("Bodin.jpg");
    expect(dateiSlug("Bodin.jpg")).toBe("Bodin.jpg");
    // The real spelling in `Olav der Ehrliche`: underscores and a fragment.
    expect(dateiSlug("Datei:Olav_der_herrliche.png#filelinks")).toBe("Olav der herrliche.png");
  });
});

describe("Bilder aus dem echten Korpus", () => {
  it("turns the infobox portrait into a figure instead of quarantine", () => {
    const result = run([artikel("Bodin")]);
    const figures = result.passages.filter((p) => p.inhalt.kind === "bildunterschrift");
    expect(figures).toHaveLength(1);
    expect(figures[0]!.inhalt).toMatchObject({ kind: "bildunterschrift", dateiname: "Bodin.jpg", ausInfobox: true });
    // The whole point: it is no longer source code sitting in the middle of the article.
    expect(result.passages.some((p) => p.inhalt.kind === "rohblock" && p.inhalt.quelltext.includes("Bild="))).toBe(false);
    expect(result.report.verluste.some((v) => v.detail?.includes("Bodin.jpg"))).toBe(false);
  });

  it("reads the seven plates of Erismus with their captions", () => {
    const result = run([artikel("Erismus")]);
    const figures = result.passages.filter((p) => p.inhalt.kind === "bildunterschrift");
    expect(figures.length).toBe(7);
    const names = figures.map((p) => (p.inhalt as { dateiname?: string }).dateiname);
    expect(new Set(names).size).toBe(7);
    // At least one of them carries real words underneath, and those words keep their links.
    expect(figures.some((p) => (p.inhalt as unknown as { inhalt: unknown[] }).inhalt.length > 0)).toBe(true);
  });

  it("harvests every figure in the corpus and keeps one asset per file", () => {
    const result = run(articles);
    const figures = result.passages.filter((p) => p.inhalt.kind === "bildunterschrift");
    // 17 articles reference files; several reference more than one, two reference the same file.
    expect(figures.length).toBeGreaterThanOrEqual(21);
    const referenced = new Set(result.media.map((row) => row.fileName));
    // `1200px-Heraldic shield…` is used by both `Kaiserreich` and `Remus' Kaiserreich`: two
    // references, one asset, one identity. That is the property that makes bytes fetchable once.
    expect(result.media.length).toBeGreaterThan(referenced.size);
    const assetIds = new Set<string>(result.assets.map((a) => String(a.id)));
    expect(assetIds.size).toBe(result.assets.length);
    for (const figure of figures) {
      const inhalt = figure.inhalt as { assetId: string; dateiname?: string };
      expect(assetIds.has(inhalt.assetId)).toBe(true);
      expect(referenced.has(inhalt.dateiname!)).toBe(true);
    }
    // Identity survives a second run: fetching bytes later must not need a second import.
    expect([...assetIds].sort()).toEqual([...new Set<string>(run(articles).assets.map((a) => String(a.id)))].sort());
  });

  it("counts the real inventory, names the orphans and never invents a licence", () => {
    const result = run(articles, { media: mediaInventory });
    expect(result.assets.length).toBe(mediaInventory.length);
    /**
     * The measured truth of this wiki, and it is the product argument in one line: of 41 files,
     * **38 have no documented licence at all**. Exactly two name one — Fandom's own sample under
     * `PD` and a favicon whose description page carries `{{CC-BY-SA}}` — and exactly one, the
     * `Mensch.jpg` illustration, is declared by the wiki itself as a quotation, i.e. as somebody
     * else's work. An importer that shows this is better than Fandom in a way that can be
     * counted rather than claimed.
     */
    expect(result.report.assetsNachLizenz).toEqual({ frei: 2, zitat: 1, unbekannt: 38 });
    // The invariant behind those numbers: `frei` is never a default. It is only ever reached by
    // a file that names a licence, and the naming text is kept for a human to overrule.
    for (const asset of result.assets) {
      expect(asset.lizenzGesetztVon).toBe("import");
      if (asset.lizenzStatus === "frei") expect(asset.lizenzQuelle).toMatch(/cc|pd|gemeinfrei|public/i);
    }
    const verwaist = result.assets.filter((a) => a.verwaist);
    expect(verwaist.length).toBeGreaterThanOrEqual(10);
    expect(result.report.verluste.filter((v) => v.art === "verwaiste-datei").length).toBe(verwaist.length);
    // Provenance that a reader can act on: who uploaded it, and where the bytes live.
    const bodin = result.assets.find((a) => a.dateiname === "Bodin.jpg")!;
    expect(bodin).toMatchObject({ verwaist: false, imBestand: true, urheber: expect.any(String), lizenzStatus: "unbekannt" });
    expect(bodin.quellUrl).toMatch(/^https:\/\/static\.wikia\.nocookie\.net\//);
    // The claimed type is recorded so the bytes can contradict it later — they will: this file
    // is called `.jpg` and the CDN delivers WebP.
    expect(bodin.behaupteterMime).toBe("image/jpeg");
    expect(bodin.mime).toBeUndefined();
    expect(bodin.sha256).toBeUndefined();
    expect(result.media.every((row) => row.state === "beschrieben")).toBe(true);
  });

  it("says so when an article points at a picture the wiki does not have", () => {
    const result = run([{ pageid: 1, ns: 0, revid: 1, title: "Ort", wikitext: "[[Datei:Gibtsnicht.png|mini|Nichts]]\n\nEin ausreichend langer Absatz über diesen Ort im Norden." }],
      { media: mediaInventory });
    expect(result.assets.find((a) => a.dateiname === "Gibtsnicht.png")).toMatchObject({ imBestand: false });
    expect(result.report.verluste.some((v) => v.bezeichnung === "Gibtsnicht.png" && v.detail?.includes("nicht vorhanden"))).toBe(true);
  });

  it("still quarantines markup that names no file at all", () => {
    const document = decomposeWiki("[[Datei:|mini]]\n\nEin ausreichend langer Absatz, damit der Artikel nicht leer bleibt.", 1, templates);
    expect(document.blocks.some((b) => b.inhalt.kind === "rohblock")).toBe(true);
    expect(document.media).toHaveLength(0);
  });
});

describe("die Lizenzlesung", () => {
  it("is pessimistic by construction", () => {
    expect(leseLizenz({ title: "Datei:A.png", categories: ["Kategorie:Bildzitat"] }).status).toBe("zitat");
    expect(leseLizenz({ title: "Datei:A.png", categories: ["Kategorie:Lizenz unbekannt"] }).status).toBe("unbekannt");
    expect(leseLizenz({ title: "Datei:A.png", licence: { LicenseShortName: "CC BY-SA 3.0" } }).status).toBe("frei");
    expect(leseLizenz({ title: "Datei:A.png", licence: { License: "cc0" } }).status).toBe("frei");
    // "Own work" names an author. It does not grant terms, and reading it as a licence would let
    // the most common self-declaration on any wiki launder itself into a permission nobody gave.
    expect(leseLizenz({ title: "Datei:A.png", description_page_wikitext: "== Lizenz ==\n{{Selbst erstellt}}" }).status).toBe("unbekannt");
    // An explicit "unknown" beats a stray free-sounding word elsewhere on the page.
    expect(leseLizenz({ title: "Datei:A.png", categories: ["Lizenz unbekannt"], licence: { License: "CC BY" } }).status).toBe("unbekannt");
    expect(leseLizenz({ title: "Datei:A.png" })).toEqual({ status: "unbekannt" });
    // Every verdict can be checked against the words it was made from.
    expect(leseLizenz({ title: "Datei:A.png", categories: ["Bildzitat"] }).quelle).toBe("Bildzitat");
  });
});
