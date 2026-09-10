// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { canonicalHash, canonicalJson } from "@chronicle/core";
import type { Blockinhalt } from "@chronicle/chronik";
import { CHRONIST_DEFAULT_BUDGET, canonicalChronistSources, candidateFromDraft, chronistCandidateHash,
  chronistHash, chronistValue, deriveChronistFacts, makeChronistSourceSnapshot, parseChronistSnapshot,
  planChronistUnits, verifyChronistCandidate, type ChronistCandidate, type ChronistModelDraft,
  type ChronistModelUnit, type ChronistSnapshot, type ChronistSourceSnapshot, type ChronistUnitPlan } from "../src/index.ts";

const block = (text: string): Blockinhalt => ({ kind: "absatz", inhalt: [{ text, marks: [] }] });
function source(text: string, id: string): ChronistSourceSnapshot {
  const value = block(text);
  return makeChronistSourceSnapshot({ entryId: "eintrag", passageId: `passage-${id}`, revisionId: "revision-eintrag",
    contentHash: canonicalHash(chronistValue(value)) }, "Die Belagerung von Hallensteg", value);
}
function snapshot(sources: readonly ChronistSourceSnapshot[], mode: ChronistSnapshot["mode"]): ChronistSnapshot {
  const ordered = canonicalChronistSources(sources);
  return parseChronistSnapshot({ schemaVersion: 1, graphVersion: "chronist-1", runId: "run-eins", mode,
    sessionId: null, scopeHash: "a".repeat(64), sources: ordered, facts: deriveChronistFacts(ordered),
    budget: CHRONIST_DEFAULT_BUDGET });
}
function prepare(plan: ChronistUnitPlan, snap: ChronistSnapshot): ChronistModelUnit {
  const wireText = canonicalJson(chronistValue({ schemaVersion: 1, runId: snap.runId, plan, attempt: 1, parents: [] }));
  return { ...plan, attempt: 1, parentResults: [],
    dispatch: { schemaVersion: 1, profileId: "fixture-text-1", model: "fixture", wireText, inputChars: wireText.length,
      maxOutputChars: plan.maxOutputChars, requestHash: chronistHash("dispatch", { wireText, attempt: 1 }) } };
}
const entwurf = (kind: ChronistModelDraft["kind"], text: string, citations: ChronistModelDraft["citations"]): ChronistModelDraft =>
  ({ kind, text, citations, date: null });

describe("Der Chronist überarbeitet eine vorhandene Passage", () => {
  const quellen = [source("Im Jahr 812 fiel die Mauer. Danach zogen sie ab.", "a"),
    source("Der Verwalter hielt das Tor. Er starb im Winter.", "b"),
    source("Der Bericht des Boten ist unvollständig.", "c")];

  it("legt je Passage genau eine Einheit über den ganzen Text an — eine halb überarbeitete Passage gibt es nicht", () => {
    const snap = snapshot(quellen, "ueberarbeitung");
    const plans = planChronistUnits(snap);
    expect(plans).toHaveLength(quellen.length);
    for (const plan of plans) {
      expect(plan.sourceIds).toHaveLength(1);
      expect(plan.parentUnitIds).toEqual([]);
      const quelle = snap.sources.find(s => s.sourceId === plan.sourceIds[0])!;
      expect(plan.sourceSpans).toEqual([{ sourceId: quelle.sourceId, from: 0, to: quelle.text.length }]);
    }
    expect(new Set(plans.map(p => p.sourceIds[0])).size).toBe(quellen.length);
  });

  it("nimmt eine Fassung an, die aus ihrer eigenen Passage belegt ist", () => {
    const snap = snapshot(quellen, "ueberarbeitung");
    const plan = planChronistUnits(snap)[0]!, unit = prepare(plan, snap);
    const quelle = snap.sources.find(s => s.sourceId === plan.sourceIds[0])!;
    const kandidat = candidateFromDraft(entwurf("ueberarbeitung", "Eine klarere Fassung desselben Vorgangs.",
      [{ sourceId: quelle.sourceId, from: 0, to: quelle.text.length }]), unit, snap);
    expect(verifyChronistCandidate(kandidat, unit, snap).ok).toBe(true);
  });

  it("weist eine Fassung ab, die aus einer fremden Passage belegt ist", () => {
    const snap = snapshot(quellen, "ueberarbeitung");
    const plan = planChronistUnits(snap)[0]!, unit = prepare(plan, snap);
    const fremd = snap.sources.find(s => s.sourceId !== plan.sourceIds[0])!;
    const kandidat: ChronistCandidate = { ...candidateFromDraft(entwurf("ueberarbeitung", "Aus einem fremden Absatz.",
      [{ sourceId: fremd.sourceId, from: 0, to: fremd.text.length }]), unit, snap) };
    expect(verifyChronistCandidate(kandidat, unit, snap)).toEqual({ ok: false, reason: "citation" });
  });
});

describe("Der Chronist schreibt einen ganzen Artikel", () => {
  const quellen = [source("Die Stadt wuchs am Fluss.", "a"), source("Ihre Brücke trug den Handel.", "b"),
    source("Im Jahr 903 brannte der Speicher.", "c")];

  it("führt viele Quellen über Zwischenstufen zu einem Entwurf zusammen", () => {
    const plans = planChronistUnits(snapshot(quellen, "artikel"));
    const wurzeln = plans.filter(plan => !plans.some(other => other.parentUnitIds.includes(plan.unitId)));
    expect(wurzeln).toHaveLength(1);
    expect(wurzeln[0]!.parentUnitIds.length).toBeGreaterThan(0);
    expect(wurzeln[0]!.sourceIds).toHaveLength(quellen.length);
  });

  it("wird zu mehreren Absätzen, nicht zu einer Textwand", () => {
    const snap = snapshot(quellen, "artikel");
    const plan = planChronistUnits(snap)[0]!, unit = prepare(plan, snap);
    const quelle = snap.sources.find(s => s.sourceId === plan.sourceSpans[0]!.sourceId)!;
    const kandidat = candidateFromDraft(entwurf("artikel", "Die Lage.\n\nDer Handel.\n\n\nDas Feuer.",
      [{ sourceId: quelle.sourceId, from: 0, to: quelle.text.length }]), unit, snap);
    expect(kandidat.blocks).toEqual([block("Die Lage."), block("Der Handel."), block("Das Feuer.")]);
    expect(verifyChronistCandidate(kandidat, unit, snap).ok).toBe(true);
  });

  it("hält jede Aufgabe bei ihrer eigenen Art — ein Abriss ist kein Artikel", () => {
    const snap = snapshot(quellen, "artikel");
    const plan = planChronistUnits(snap)[0]!, unit = prepare(plan, snap);
    const quelle = snap.sources.find(s => s.sourceId === plan.sourceSpans[0]!.sourceId)!;
    const kandidat = candidateFromDraft(entwurf("abriss", "Ein Abriss an falscher Stelle.",
      [{ sourceId: quelle.sourceId, from: 0, to: quelle.text.length }]), unit, snap);
    expect(verifyChronistCandidate(kandidat, unit, snap)).toEqual({ ok: false, reason: "schema" });
  });
});
