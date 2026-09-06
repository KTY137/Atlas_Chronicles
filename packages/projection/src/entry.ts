import { canonicalJson, type CanonicalValue, type PassageId } from "@chronicle/core";
import type { Blockinhalt, InlineMark, InlineText, Passage } from "@chronicle/chronik";

/**
 * Der Entry-Projektor — S-P1 „Drei Bücher, ein Server" als Bibliothek.
 *
 * Grenze B9 (design/iterations/CHAMPION.md:383): der Projektor ist der Server, kein
 * Spieler-Payload trägt Sichtbarkeits-Metadaten. Zwei Mechanismen tragen das hier:
 *
 *  1. **Existenzgrenze:** eine nicht gehaltene Passage erscheint NICHT im Payload —
 *     kein Platzhalter, kein Zähler, keine Lücke mit Namen (`Kein Nenner`).
 *  2. **Totalität:** die Projektion ist eine totale Funktion über die geschlossene
 *     Union `Blockinhalt` und über `InlineMark` — OHNE default-Zweig. Ein neuer
 *     Konstruktor ohne Projektionsregel ist ein Compile-Fehler, kein Leck
 *     (Default-Deny durch Totalität, packages/chronik/src/model.ts).
 *
 * Türen: eine offene Vollmacht DIESES Betrachters dekoriert den roten Link, auf den sie
 * zeigt. Für jeden anderen Leser — auch den anonymen — ist derselbe rote Link
 * byte-identisch nackt (der Zwillingsbeweis testet genau das über `entryBytes`).
 */

// ---------------------------------------------------------------------- Betrachterwissen

export interface Tuer {
  readonly vollmachtId: string;
  readonly verfallAt: number;
}

/**
 * Was der Server über GENAU DIESEN Betrachter hergeleitet hat (Revelationen seiner Figur,
 * seine eigenen offenen Türen). Niemals clientseitig gebaut, niemals geteilt.
 */
export interface BetrachterWissen {
  readonly gehaltenePids: ReadonlySet<PassageId>;
  /** zielSlug → Tür. Nur die eigenen offenen Türen — nie die fremden. */
  readonly offeneTueren: ReadonlyMap<string, Tuer>;
}

/** Der anonyme Leser — `die offene Tür`. Hält nichts, sieht rote Links. */
export const LEERES_WISSEN: BetrachterWissen = {
  gehaltenePids: new Set<PassageId>(),
  offeneTueren: new Map<string, Tuer>(),
};

// ---------------------------------------------------------------------- Ausgabeformen

/** Geschlossene Ausgabe-AST. Ein neues Feld ist ein Schema-Akt, kein Bugfix. */
export type ProjMark =
  | { readonly art: "em" }
  | { readonly art: "strong" }
  | { readonly art: "code" }
  | {
      readonly art: "link";
      readonly zielSlug: string;
      readonly zielEntryId?: string;
      /** Nur auf dem Payload des Türhalters vorhanden. */
      readonly tuer?: Tuer;
    };

export interface ProjInline {
  readonly text: string;
  readonly marks: readonly ProjMark[];
}

export type ProjBlock =
  | { readonly kind: "absatz"; readonly inhalt: readonly ProjInline[] }
  | {
      readonly kind: "feld";
      readonly schluessel: string;
      readonly label: string;
      readonly gruppe?: string;
      readonly werte: readonly (readonly ProjInline[])[];
      readonly mehrwertig: boolean;
      // `klauselKandidat` wird bewusst NICHT projiziert: Autoren-Metadatum, kein Leserinhalt.
    }
  | {
      readonly kind: "liste";
      readonly geordnet: boolean;
      readonly punkte: readonly (readonly ProjInline[])[];
    }
  | { readonly kind: "zitat"; readonly inhalt: readonly ProjInline[] }
  | { readonly kind: "bildunterschrift"; readonly assetId: string; readonly inhalt: readonly ProjInline[] }
  | { readonly kind: "rohblock"; readonly quelltext: string; readonly grund: string };

export interface ProjiziertePassage {
  readonly pid: string;
  readonly ord: number;
  readonly pfad: readonly string[];
  readonly inhalt: ProjBlock;
}

export interface EntryProjektion {
  readonly entryId: string;
  readonly slug: string;
  readonly titel: string;
  readonly passagen: readonly ProjiziertePassage[];
}

// ---------------------------------------------------------------------- Projektion

function projiziereMark(m: InlineMark, wissen: BetrachterWissen): ProjMark {
  switch (m.art) {
    case "em":
      return { art: "em" };
    case "strong":
      return { art: "strong" };
    case "code":
      return { art: "code" };
    case "link": {
      // Blauer Link: Ziel existiert. Roter Link: nur der Slug — und NUR für den Halter
      // einer offenen Vollmacht auf diesem Anker zusätzlich die Tür.
      if (m.zielEntryId !== undefined) {
        return { art: "link", zielSlug: m.zielSlug, zielEntryId: m.zielEntryId };
      }
      const tuer = wissen.offeneTueren.get(m.zielSlug);
      if (tuer !== undefined) {
        return {
          art: "link",
          zielSlug: m.zielSlug,
          tuer: { vollmachtId: tuer.vollmachtId, verfallAt: tuer.verfallAt },
        };
      }
      return { art: "link", zielSlug: m.zielSlug };
    }
    default: {
      const _erschoepfend: never = m;
      return _erschoepfend;
    }
  }
}

function projiziereInline(
  inhalt: readonly InlineText[],
  wissen: BetrachterWissen,
): readonly ProjInline[] {
  return inhalt.map((t) => ({
    text: t.text,
    marks: t.marks.map((m) => projiziereMark(m, wissen)),
  }));
}

/** Total über `Blockinhalt` — kein default-Zweig. */
function projiziereBlock(b: Blockinhalt, wissen: BetrachterWissen): ProjBlock {
  switch (b.kind) {
    case "absatz":
      return { kind: "absatz", inhalt: projiziereInline(b.inhalt, wissen) };
    case "feld": {
      const werte = b.werte.map((w) => projiziereInline(w, wissen));
      return b.gruppe !== undefined
        ? {
            kind: "feld",
            schluessel: b.schluessel,
            label: b.label,
            gruppe: b.gruppe,
            werte,
            mehrwertig: b.mehrwertig,
          }
        : {
            kind: "feld",
            schluessel: b.schluessel,
            label: b.label,
            werte,
            mehrwertig: b.mehrwertig,
          };
    }
    case "liste":
      return {
        kind: "liste",
        geordnet: b.geordnet,
        punkte: b.punkte.map((p) => projiziereInline(p, wissen)),
      };
    case "zitat":
      return { kind: "zitat", inhalt: projiziereInline(b.inhalt, wissen) };
    case "bildunterschrift":
      return {
        kind: "bildunterschrift",
        assetId: b.assetId,
        inhalt: projiziereInline(b.inhalt, wissen),
      };
    case "rohblock":
      return { kind: "rohblock", quelltext: b.quelltext, grund: b.grund };
    default: {
      const _erschoepfend: never = b;
      return _erschoepfend;
    }
  }
}

export interface EntryQuelle {
  readonly entryId: string;
  readonly slug: string;
  readonly titel: string;
  /** Lebende Passagen des Eintrags, GM-Wahrheit, in `ord`-Reihenfolge. */
  readonly passagen: readonly Passage[];
}

export function projiziereEntry(quelle: EntryQuelle, wissen: BetrachterWissen): EntryProjektion {
  const passagen: ProjiziertePassage[] = [];
  for (const p of quelle.passagen) {
    // Existenzgrenze: nicht gehalten ⇒ nicht vorhanden. Kein Platzhalter, kein Zähler.
    if (!wissen.gehaltenePids.has(p.pid)) continue;
    passagen.push({
      pid: p.pid,
      ord: p.ord,
      pfad: p.pfad,
      inhalt: projiziereBlock(p.inhalt, wissen),
    });
  }
  return { entryId: quelle.entryId, slug: quelle.slug, titel: quelle.titel, passagen };
}

/**
 * Die einzige Serialisierung, die einen Leser-Payload verlassen darf: kanonisch,
 * locale-frei, byte-stabil — damit „byte-identisch" ein prüfbarer Satz ist.
 */
export function entryBytes(p: EntryProjektion): string {
  return canonicalJson(p as unknown as CanonicalValue);
}
