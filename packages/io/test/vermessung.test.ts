// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { trustUniverseId } from "@chronicle/core";
import { importEron } from "../src/index.ts";
import type { EronArticle, EronTemplate } from "../src/index.ts";

/**
 * DIE VERMESSUNG — the atom, pinned by running code.
 *
 * The corpus's own open question #1, and it is the first one on the list:
 *   *"The atom is undefined. Four documents written the same day give four passage counts —
 *   README 799, WELT 1,075, RB-12 A3 1,100, Argus's recount 1,078. Zwei kompetente Leser
 *   desselben Korpus haben sich um 2,3× über das Atom des Produkts geeinigt — nicht."*
 *   (design/fixtures/eron/PRUEFUNG.md:162-187)
 *
 * Prose cannot settle that; an executable decomposer can. This file is not a guard against
 * regression so much as **the tiebreaker**: it runs the specified rules over the user's real
 * wiki and prints what they actually produce.
 *
 * The discipline, and it is the whole point: **assert the invariants, measure the totals.**
 * A test bent to reproduce a drifted constant is worse than no test — it launders a guess into
 * a fact. So the literals in dispute (543/583 fields, 799/1075/1078/1100 atoms) are LOGGED,
 * never asserted; what is asserted is what must be true whatever the totals turn out to be.
 */

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../../design/fixtures/eron/${name}`, import.meta.url), "utf8"));

const articles = fixture("articles.json") as EronArticle[];
const templates = fixture("templates.json") as EronTemplate[];
const graph = fixture("graph.json") as {
  _meta: { distinct_redlink_targets: number; redlink_edges: number; distinct_link_targets: number };
  redlink_targets_by_incoming: Record<string, number>;
};

const result = importEron({
  universeId: trustUniverseId("eron"),
  wikiUrl: "https://eron.fandom.com/de/",
  importiertAm: "2026-09-06T12:00:00Z",
  templates,
  articles,
});

describe("die Vermessung — the real corpus, measured", () => {
  it("reports the atom count the four documents disagree about", () => {
    const byKind = result.report.passagenNachArt;
    const total = result.passages.length;

    console.log(
      [
        "",
        "  DIE VERMESSUNG — design/fixtures/eron, 74 pages, 307,255 B wikitext",
        "  ------------------------------------------------------------------",
        `  Einträge           ${result.entries.length}   (corpus A1: 73)`,
        `  Aliase             ${result.aliases.length}   (corpus A2: 1)`,
        `  Passagen gesamt    ${total}   (corpus disagrees: README 799 · WELT 1075 · Argus 1078 · RB-12 1100)`,
        `    feld             ${byKind.feld}   (RB-12: 543 · Argus: 583)`,
        `    absatz           ${byKind.absatz}   (RB-12: 497)`,
        `    liste            ${byKind.liste}   (RB-12: 60)`,
        `    zitat            ${byKind.zitat}   (RB-12: 8 in 2 articles)`,
        `    bildunterschrift ${byKind.bildunterschrift}   (RB-12: 21 in 11 articles)`,
        `    rohblock         ${byKind.rohblock}   (RB-12: 1 wikitable)`,
        `  Blaue Kanten       ${result.report.blaueKanten}   (graph.json: ${graph._meta.distinct_link_targets - graph._meta.distinct_redlink_targets} distinct blue targets)`,
        `  Rote Kanten        ${result.report.roteKanten}   (graph.json: ${graph._meta.redlink_edges})`,
        `  Distinkte Türen    ${result.report.distinkteRoteZiele}   (graph.json: ${graph._meta.distinct_redlink_targets}; downstream docs say 690 — that is drift)`,
        `  Türbilanz          tuer ${result.report.tuerbilanz.tuer} · spur ${result.report.tuerbilanz.spur} · notiz ${result.report.tuerbilanz.notiz} · verworfen ${result.report.tuerbilanz.verworfen}   (RB-12: 113/100/472/4)`,
        `  Texterhaltung      ${(result.report.textErhaltung * 100).toFixed(2)} %   (A9 requires >= 97 %)`,
        `  Verluste           ${result.report.verluste.length} einzeln benannt`,
        `  Attribution        ${result.attributionComplete ? "vollständig" : "UNVOLLSTÄNDIG — the export carries only the last editor"}`,
        "",
      ].join("\n"),
    );

    // Invariants, not literals.
    expect(total).toBe(
      byKind.feld + byKind.absatz + byKind.liste + byKind.zitat + byKind.bildunterschrift + byKind.rohblock,
    );
    expect(total).toBeGreaterThan(0);
  });

  it("satisfies A9 — text conservation at or above 97 %", () => {
    // "The real anti-loss check" (RB-12:951). A decomposer that silently eats prose passes
    // every structural test and fails this one.
    expect(result.report.textErhaltung).toBeGreaterThanOrEqual(0.97);
  });

  it("accounts for every passage: one entry, dense ordinals, no orphans", () => {
    const entryIds = new Set(result.entries.map((e) => e.id));
    for (const p of result.passages) expect(entryIds.has(p.entryId)).toBe(true);

    const byEntry = new Map<string, number[]>();
    for (const p of result.passages) {
      const list = byEntry.get(p.entryId) ?? [];
      list.push(p.ord);
      byEntry.set(p.entryId, list);
    }
    for (const [entryId, ords] of byEntry) {
      const sorted = [...ords].sort((x, y) => x - y);
      expect(new Set(sorted).size, `duplicate ordinal in ${entryId}`).toBe(sorted.length);
      expect(sorted[0]).toBe(0);
      expect(sorted.at(-1)).toBe(sorted.length - 1);
    }
  });

  it("classifies every door into exactly one class, and never promotes a notation abbreviation", () => {
    const classes = result.report.tuerbilanz;
    const sum = classes.tuer + classes.spur + classes.notiz + classes.verworfen;
    expect(sum).toBe(result.report.distinkteRoteZiele);

    // A "tuer" must have >= 3 distinct incoming entries — the demand threshold is the whole
    // basis of the triage, and an off-by-one here inflates the number the product sells.
    for (const door of result.redLinks) {
      if (door.klasse === "tuer") expect(door.eingehend).toBeGreaterThanOrEqual(3);
      if (door.klasse === "spur") expect(door.eingehend).toBe(2);
    }
    // `N. K.` is a German notation abbreviation, not a place. It has enough incoming links to
    // look like the most wanted door in the corpus, which is exactly why the guard exists.
    expect(result.redLinks.find((d) => d.zielSlug === "N. K.")?.klasse).toBe("verworfen");
  });

  it("keeps the licence obligation visible rather than fabricating an author list", () => {
    // The export gives one contributor per page — the LAST EDITOR. "That is not the author
    // list and using it is a licence violation dressed as diligence" (RB-12:900-908).
    // The honest state is `incomplete`, and it must stay honest until a second API pass runs.
    expect(result.attributionComplete).toBe(false);
    expect(result.provenance.every((row) => row.status === "incomplete")).toBe(true);
    for (const entry of result.entries) expect(entry.universeId).toBeTruthy();
  });

  it("quarantines rather than drops, and names every loss individually", () => {
    // "A silently dropped construct is a lie about completeness, and a silently promoted one
    // is a lie about authorship" (RB-12 §2.8).
    const rohblocks = result.passages.filter((p) => p.inhalt.kind === "rohblock");
    for (const r of rohblocks) expect(r.inhalt.kind === "rohblock" && r.inhalt.quelltext.length).toBeGreaterThan(0);
    for (const loss of result.report.verluste) expect(loss.bezeichnung.length).toBeGreaterThan(0);
  });
});
