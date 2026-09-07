// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Der Chronist, Teil eins: **das Regelwerk.**
 *
 * `docs/superpowers/specs/2026-09-07-chronist-agent-design.md` legt die Reihenfolge fest — das
 * Regelwerk läuft **immer zuerst** und ist der Prüfstein für alles, was ein Sprachmodell später
 * beitragen mag. Für das Aufspüren von Widersprüchen wäre ein Modell sogar schlechter: *„Bei
 * einem Prüfwerkzeug ist ein Fehlalarm teurer als ein übersehener Fall."*
 *
 * Deshalb steht hier ausschließlich, was **sicher** falsch ist:
 *
 * - Ein Tod **vor** der Geburt.
 * - **Zwei verschiedene Jahre** für dieselbe Aussage über denselben Eintrag.
 * - Ein Feld, das ein **Datum sein will** und keines hergibt.
 *
 * Bewusst NICHT enthalten: „ein Jahrhundert ohne Ereignis". Das ist ein Urteil über eine
 * erfundene Welt, kein Widerspruch — und ein Prüfwerkzeug, das Urteile fällt, wird abgeschaltet.
 *
 * **Dieses Paket ist rein.** Keine Datenbank, kein Netz, kein Modell: es bekommt Ereignisse
 * herein und gibt Befunde heraus. Jeder Befund nennt die Passagen, aus denen er stammt — ein
 * Vorschlag ohne Beleg wäre eine Behauptung, und die Chronik nimmt keine Behauptungen an.
 */

/** Ein Ereignis der Zeitleiste — strukturell, damit dieses Paket den Server nicht kennt. */
export interface Zeitereignis {
  readonly id: string;
  readonly art: string;
  readonly jahr: number | null;
  readonly genau: boolean;
  readonly roh: string;
  readonly entryId: string;
  readonly titel: string;
  readonly passageId: string;
}

export const BEFUNDARTEN = ["tod_vor_geburt", "widerspruechliche_jahre", "unlesbares_datum"] as const;
export type Befundart = typeof BEFUNDARTEN[number];

export interface Befund {
  readonly art: Befundart;
  readonly entryId: string;
  readonly titel: string;
  /** Was gefunden wurde, in einem Satz — für Menschen, nicht für Maschinen. */
  readonly text: string;
  /** Die Passagen, aus denen der Befund stammt. Ohne sie wäre er eine Behauptung. */
  readonly passagen: readonly string[];
}

/** Nur diese Arten tragen eine Jahresaussage, die sich widersprechen kann. */
const JAHRESARTEN = new Set(["geburt", "tod", "gruendung", "datum"]);
const ARTNAME: Readonly<Record<string, string>> = Object.freeze({
  geburt: "Geburt", tod: "Tod", gruendung: "Gründung", datum: "Datum",
});

const nachTitel = (a: Befund, b: Befund) => a.titel.localeCompare(b.titel, "de") || a.art.localeCompare(b.art);

/**
 * Prüft die Zeitaussagen einer Chronik.
 *
 * `ereignisse` sind die mit gelesenem Jahr, `ohneJahr` die, deren Feld ein Datum sein will und
 * keines hergibt — genau die Trennung, die die Zeitleiste ohnehin schon macht.
 */
export function pruefeChronik(ereignisse: readonly Zeitereignis[], ohneJahr: readonly Zeitereignis[] = []): readonly Befund[] {
  const befunde: Befund[] = [];
  const nachEintrag = new Map<string, Zeitereignis[]>();
  for (const ereignis of ereignisse) {
    if (ereignis.jahr === null || !JAHRESARTEN.has(ereignis.art)) continue;
    const liste = nachEintrag.get(ereignis.entryId) ?? [];
    liste.push(ereignis); nachEintrag.set(ereignis.entryId, liste);
  }

  for (const [entryId, liste] of nachEintrag) {
    const titel = liste[0]!.titel;

    // Tod vor Geburt. Nur bei ZWEI sicher gelesenen Jahren: bei einem ungefähren („um 812")
    // wäre der Vergleich selbst ungefähr, und ein ungefährer Widerspruch ist keiner.
    const geburten = liste.filter(e => e.art === "geburt" && e.genau);
    const tode = liste.filter(e => e.art === "tod" && e.genau);
    for (const geburt of geburten) for (const tod of tode) {
      if (tod.jahr! < geburt.jahr!) befunde.push({
        art: "tod_vor_geburt", entryId, titel,
        text: `Tod im Jahr ${tod.jahr} liegt vor der Geburt im Jahr ${geburt.jahr}.`,
        passagen: [geburt.passageId, tod.passageId],
      });
    }

    // Zwei verschiedene Jahre für dieselbe Aussage. Ungenaue Lesungen bleiben aussen vor:
    // „um 812" und „812" widersprechen sich nicht, sie sind dieselbe Aussage in zwei Schärfen.
    for (const art of JAHRESARTEN) {
      const genaue = liste.filter(e => e.art === art && e.genau);
      const jahre = [...new Set(genaue.map(e => e.jahr!))].sort((a, b) => a - b);
      if (jahre.length > 1) befunde.push({
        art: "widerspruechliche_jahre", entryId, titel,
        text: `${ARTNAME[art] ?? art}: ${jahre.join(" und ")} — zwei verschiedene Jahre für dieselbe Aussage.`,
        passagen: genaue.map(e => e.passageId),
      });
    }
  }

  for (const ereignis of ohneJahr) {
    if (!JAHRESARTEN.has(ereignis.art)) continue;
    befunde.push({
      art: "unlesbares_datum", entryId: ereignis.entryId, titel: ereignis.titel,
      // Der Rohtext gehoert in den Befund: wer ihn liest, sieht sofort, ob ein Tippfehler
      // vorliegt oder eine Schreibweise, die das Regelwerk noch nicht kennt.
      text: `${ARTNAME[ereignis.art] ?? ereignis.art}: „${ereignis.roh}" ergibt kein lesbares Jahr.`,
      passagen: [ereignis.passageId],
    });
  }

  return befunde.sort(nachTitel);
}
