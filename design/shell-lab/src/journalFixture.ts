/**
 * ERON — Journal-Fixture für die Bühne „Journal".
 * Prosa & Bilder: Eron Wiki (https://eron.fandom.com/de/) · CC BY-SA 3.0 ·
 * Welt von Kaya und Kollegen. Beispiel-Universum, nie Produktinhalt
 * (Invariante K7). Namen, Ereignisse und das Brief-Zitat sind aus dem
 * echten Fixture-Auszug (design/fixtures/eron/articles.json) destilliert;
 * Karten-Notiz und Steckbrief sind für diese Bühne erfundenes, aber
 * plausibles Spieltischmaterial.
 */

import bodinUrl from "../../fixtures/eron/media/Bodin.webp";
import songKaynUrl from "../../fixtures/eron/media/SongKayn.webp";
import mapUrl from "../../fixtures/eron/media/Karte_von_Andaria.webp";

export const JOURNAL_ATTRIBUTION =
  "Prosa & Bilder: Eron Wiki (eron.fandom.com/de) · CC BY-SA 3.0 · Beispiel-Universum, nie Produktinhalt";

/**
 * Welche Figur „der" Spieler in diesem Prototyp führt. Spiegelt
 * `PLAYER_SELF` aus `shell/Band.tsx` bewusst nur als Wert, nicht als
 * Import — die Bühne darf ausschließlich aus react, lucide-react,
 * motion/react und ihrer eigenen Fixture importieren.
 */
export const PLAYER_SELF_ID = "olav";

export interface Figur {
  readonly id: string;
  readonly name: string;
}

/** Deckt sich bewusst mit `OLAV_LENS.sicht` aus `fixture.ts` (gleiche
 *  Spieler, gleiche Kurznamen) — als eigene Literale, nicht als Import. */
export const FIGUREN: readonly Figur[] = [
  { id: "olav", name: "Timo (Olav)" },
  { id: "song", name: "Ilva (Song Kayn)" },
  { id: "oggugat", name: "Jonte (Oggugat)" },
  { id: "yalit", name: "Mira (Yal'it)" },
];

/* ------------------------------------------------------------------ Sicht */

export type Sicht =
  | { readonly modus: "leitung" }
  | { readonly modus: "tisch" }
  | { readonly modus: "einzeln"; readonly figuren: readonly string[] };

export const SICHT_LEITUNG: Sicht = { modus: "leitung" };
export const SICHT_TISCH: Sicht = { modus: "tisch" };
export const sichtEinzeln = (figuren: readonly string[]): Sicht => ({
  modus: "einzeln",
  figuren,
});

/* ------------------------------------------------------------------ Seiten */

interface PageBase {
  readonly id: string;
  readonly title: string;
  readonly sicht: Sicht;
  /** Verwandte Enzyklopädie-Artikel, verlinkt über `onOpenArticle`. */
  readonly refs?: readonly string[];
}

export interface TextPage extends PageBase {
  readonly kind: "text";
  readonly body: readonly string[];
}

export interface BildPage extends PageBase {
  readonly kind: "bild";
  readonly src: string;
  readonly caption: string;
}

export interface BriefHandout extends PageBase {
  readonly kind: "handout";
  readonly handout: "brief";
  readonly von: string;
  readonly an?: string;
  readonly body: readonly string[];
}

export interface KarteHandout extends PageBase {
  readonly kind: "handout";
  readonly handout: "karte";
  readonly src: string;
  readonly ort: string;
  readonly notiz: readonly string[];
}

export interface SteckbriefHandout extends PageBase {
  readonly kind: "handout";
  readonly handout: "steckbrief";
  readonly name: string;
  readonly kopfgeld?: string;
  readonly zuletztGesehen?: string;
  readonly merkmale: readonly string[];
  readonly verbrechen: readonly string[];
}

export type HandoutPage = BriefHandout | KarteHandout | SteckbriefHandout;
export type JournalPage = TextPage | BildPage | HandoutPage;

export interface Journal {
  readonly id: string;
  readonly title: string;
  readonly eyebrow: string;
  readonly summary: string;
  readonly pages: readonly JournalPage[];
}

/* --------------------------------------------------------------- Journale */

export const JOURNALS: readonly Journal[] = [
  {
    id: "olav",
    title: "Olav der Ehrliche — Personenakte",
    eyebrow: "Eron · Personenakte",
    summary:
      "Barde, Flüsterer, meistgesuchter Mann des Kaiserreichs — drei Seiten, unterschiedlich freigegeben.",
    pages: [
      {
        id: "olav-oeffentlich",
        kind: "text",
        title: "Öffentlich bekannt",
        sicht: SICHT_TISCH,
        refs: ["Flüsterer", "Massaker von Mowach"],
        body: [
          "Olav Sohn des Fjördin, besser bekannt als Olav der Ehrliche, ist ein Zwergen-Barde aus Nord Tal. Er erlangte überregionale Bekanntheit durch seine Beteiligung am Massaker von Mowach und wird von den Kaiserlichen Behörden mit 150.000 Silberlingen gesucht.",
          "Unter dem Decknamen Mahtin entging er über Monate der Fahndung. Später wurde er ein geachtetes Mitglied der Flüsterer, deren Reformen er maßgeblich mitgestaltete.",
        ],
      },
      {
        id: "olav-bodin",
        kind: "bild",
        title: "Bodin, der Onkel",
        sicht: SICHT_TISCH,
        refs: ["Bodin"],
        src: bodinUrl,
        caption:
          "Bodin nahm Olav als Lehrling in seine Schmiede — und verschwieg ihm jahrelang den Brief seines Großvaters.",
      },
      {
        id: "olav-brief",
        kind: "handout",
        handout: "brief",
        title: "Der Brief des Großvaters",
        sicht: sichtEinzeln(["olav"]),
        refs: ["Thorbin", "Blechorgelhammer"],
        von: "Thorbin (unterschrieben nur mit „Dein Großvater“)",
        an: "Olav",
        body: [
          "„Liebster Olav, es schmerzt mich, dass ich mich nicht einmal richtig von Dir verabschieden kann. Meine Vergangenheit hat mich eingeholt und ich werde anderswo gebraucht.“",
          "„Ich habe eingesehen: Nur weil ich als Barde scheiterte, musst Du nicht auch scheitern. Nimm dieses Geschenk an dich, es rettete mir einige Male das Leben. In Liebe, Dein Großvater.“",
          "Beigelegt: der Blechorgelhammer, in einer verstaubten Kiste in Bodins Schmiede gefunden.",
        ],
      },
    ],
  },
  {
    id: "fluesterer",
    title: "Die Flüsterer — Geheimakte",
    eyebrow: "Eron · Organisation · Geheimakte",
    summary:
      "Was der Tisch weiß, was nur die Leitung weiß, und ein Fahndungsplakat, das am Kai hängt.",
    pages: [
      {
        id: "fl-oeffentlich",
        kind: "text",
        title: "Was man über die Flüsterer weiß",
        sicht: SICHT_TISCH,
        refs: ["Baldur", "Blattheim"],
        body: [
          "Die Flüsterer sind eine im Geheimen operierende Organisation, die Frieden zwischen den Völkern Erons herstellen will — mit Attentätern, Spionen und Maulwürfen, wenn nötig.",
          "Hervorgegangen aus dem Bardenzirkel von Schwarzweide (Gründung 835, Neugründung 867), residierten sie nacheinander in Schwarzweide, Blattheim und Baumgard. Seit 868 operieren sie dezentral. Anführer ist seit 867 Baldur.",
        ],
      },
      {
        id: "fl-geheim",
        kind: "text",
        title: "Was nur die Leitung weiß",
        sicht: SICHT_LEITUNG,
        refs: ["Thorbin"],
        body: [
          "Eine Zeit lang wurde der Orden von einer „Stimme“ kontrolliert, die sich als Vermittlerin des Höchstelfen ausgab. Der Tisch kennt diese Wahrheit noch nicht — für ihn war der Anschlag auf Caridil ein Attentat von außen, nicht ein Befehl von innen.",
          "Tritt die Gruppe Thorbin gegenüber, entscheidet dieses Blatt, was er zugibt: den Anschlag ja, den Höchstelfen dahinter nur, wenn explizit gefragt wird.",
        ],
      },
      {
        id: "fl-steckbrief",
        kind: "handout",
        handout: "steckbrief",
        title: "Steckbrief: Olav der Ehrliche",
        sicht: SICHT_TISCH,
        refs: ["Olav der Ehrliche"],
        name: "Olav, genannt „der Ehrliche“ · Deckname „Mahtin“",
        kopfgeld: "150.000 Silberlinge",
        zuletztGesehen: "Hafenviertel von Kukiria",
        merkmale: ["nur noch ein Ohr", "roter Vollbart, Glatze", "gelbe Augen"],
        verbrechen: [
          "Massaker von Mowach",
          "Hochverrat am Kaiserreich",
          "Mitgliedschaft in einer terroristischen Organisation",
        ],
      },
    ],
  },
  {
    id: "blattheim",
    title: "Blattheim — Das Versteck der Flüsterer",
    eyebrow: "Eron · Ort · Spielleitungs-Notizen",
    summary:
      "Eine Karte mit Kayas Notiz, und was am Kai von Blattheim übrig blieb.",
    pages: [
      {
        id: "bh-karte",
        kind: "handout",
        handout: "karte",
        title: "Karte von Andaria — Notiz zum Versteck",
        sicht: SICHT_LEITUNG,
        refs: ["Blattheim"],
        src: mapUrl,
        ort: "Blattheim, Hafenviertel",
        notiz: [
          "Zugang über Edinas Freudenhaus, Codewort aus dem Brief des Freundes.",
          "Treppe ohne Ende — Halluzinogen, drei Prüfungen, dann Blutschwur.",
          "Fällt in der Nacht des Fests: Ekmont ist bereits unterwegs, wenn die Gruppe zu lange braucht.",
        ],
      },
      {
        id: "bh-song",
        kind: "bild",
        title: "Song Kayn, Kapitän der Meeresfeuer",
        sicht: SICHT_TISCH,
        refs: ["Song Kayn", "Ekmont von Radfurt"],
        src: songKaynUrl,
        caption:
          "Verließ mit einem der drei Schiffe den Hafen von Blattheim, kurz bevor Ekmonts Truppen das Versteck stürmten.",
      },
    ],
  },
];
