// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Der Zwillingsbeweis — der Beleg, den `design/08-backend-architektur.md` §3 für Grenze B9
 * nennt und den `../src/entry.ts:19` im Kommentar behauptet, den es aber bis hier nicht gab.
 *
 * Zwei Welten, deren gehaltene Hälfte byte-gleich ist und deren verborgene Hälfte sich
 * unterscheidet, müssen für einen Betrachter, der nur die gehaltene Hälfte hält, denselben
 * Payload ergeben — byte-identisch, nicht nur strukturgleich. Deshalb vergleicht dieser Test
 * `entryBytes` und nicht die Objekte.
 */
import { describe, expect, it } from "vitest";
import { trustEntryId, trustPassageId, trustRevisionId } from "@chronicle/core";
import type { Blockinhalt, Passage } from "@chronicle/chronik";
import {
  projiziereEntry,
  entryBytes,
  LEERES_WISSEN,
  type BetrachterWissen,
  type EntryQuelle,
} from "../src/index.ts";

const ENTRY = "haus-vharon";

const absatz = (text: string): Blockinhalt => ({ kind: "absatz", inhalt: [{ text, marks: [] }] });

const passage = (pid: string, ord: number, inhalt: Blockinhalt): Passage => ({
  pid: trustPassageId(pid),
  gen: 1,
  entryId: trustEntryId(ENTRY),
  ord,
  pfad: [],
  inhalt,
  geltung: "kanon",
  praegung: null,
  erstelltInRevision: trustRevisionId("r-1"),
});

const welt = (passagen: readonly Passage[]): EntryQuelle => ({
  entryId: ENTRY,
  slug: ENTRY,
  titel: "Haus Vharon",
  passagen,
});

// Die gehaltene Hälfte ist in beiden Zwillingen dieselbe. Sie trägt einen roten Link
// (`link` ohne `zielEntryId`) — genau die Stelle, an der eine Tür dekorieren würde.
const GEHALTEN = passage("p-gehalten", 0, {
  kind: "absatz",
  inhalt: [
    { text: "Der Hof liegt hinter der ", marks: [] },
    { text: "Kellertür", marks: [{ art: "link", zielSlug: "kellertuer" }] },
  ],
});

describe("Zwillingsbeweis — zwei Welten, eine gehaltene Hälfte", () => {
  const wissenOhneTuer: BetrachterWissen = {
    gehaltenePids: new Set([GEHALTEN.pid]),
    offeneTueren: new Map(),
  };

  const zwillingA = welt([GEHALTEN, passage("p-a", 1, absatz("Im Keller liegt der Bruder."))]);
  const zwillingB = welt([GEHALTEN, passage("p-b", 1, absatz("Im Keller liegt nichts."))]);

  it("liefert für den Nicht-Halter byte-identische Payloads", () => {
    expect(entryBytes(projiziereEntry(zwillingA, wissenOhneTuer)))
      .toBe(entryBytes(projiziereEntry(zwillingB, wissenOhneTuer)));
  });

  it("verrät über ord weder Zahl noch Position der verborgenen Passagen", () => {
    const versteckt = welt([
      passage("p-vorne", 0, absatz("verborgen")),
      GEHALTEN,
      passage("p-hinten", 2, absatz("verborgen")),
    ]);
    expect(projiziereEntry(versteckt, wissenOhneTuer).passagen.map((p) => p.ord)).toEqual([0]);
  });

  it("gibt dem anonymen Leser eine Projektion ohne Passagen", () => {
    expect(projiziereEntry(zwillingA, LEERES_WISSEN).passagen).toEqual([]);
  });

  it("dekoriert den roten Link nur für den Türhalter und lässt ihn sonst nackt", () => {
    const halter: BetrachterWissen = {
      gehaltenePids: new Set([GEHALTEN.pid]),
      offeneTueren: new Map([["kellertuer", { vollmachtId: "v-1", verfallAt: 1 }]]),
    };
    const nackt = entryBytes(projiziereEntry(zwillingA, wissenOhneTuer));
    const dekoriert = entryBytes(projiziereEntry(zwillingA, halter));
    expect(dekoriert).not.toBe(nackt);
    expect(dekoriert).toContain("v-1");
    expect(nackt).not.toContain("v-1");
  });
});
