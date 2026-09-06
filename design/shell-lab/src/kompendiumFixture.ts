/**
 * KOMPENDIUM — Fixture für die Bühne „Kompendium“.
 *
 * Vier Pakete, jedes ein eigener Herkunfts- und Lizenzfall:
 *  - `eron-waffen`      Welt-Inhalt aus dem Eron-Wiki (CC BY-SA, share-alike).
 *  - `epos-kernregeln`  generisches Regelpaket, offen lizenziert.
 *  - `schwarzfeder-bestiarium` kommerzielles Monsterpaket, Weitergabe gesperrt
 *    ("nur in dieser Kampagne nutzbar, kein Export") — installiert und aktiv.
 *  - `silberzirkel-zauber` Zauberpaket, das NICHT installiert werden kann:
 *    die Vertriebsrechte für diesen Kampagnensitz sind noch nicht bestätigt.
 *
 * Namen der Eron-Einträge (Waffen, Völker) stammen aus
 * `design/fixtures/eron/articles.json` — reale Infobox-Felder, nicht erfunden.
 * Alle übrigen Pakete sind erkennbar generische Demo-Anbieter.
 *
 * Jedes Paket trägt `eintraegeGesamt` (die vom Anbieter behauptete Größe) neben
 * `eintraege` (die im Lab tatsächlich geladene Auswahl) — nie stillschweigend
 * vermischt. Was nicht geladen ist, wird auch nicht als geladen behauptet.
 */

export type Inhaltsart = "Regeln" | "Monster" | "Gegenstände" | "Zauber" | "Orte";

/** Wie weit ein Paket weitergegeben werden darf — nie im Kleingedruckten. */
export type Weitergabe = "frei" | "eingeschränkt" | "gesperrt";

export interface Lizenz {
  name: string;
  weitergabe: Weitergabe;
  /** Ehrlicher Klartext-Satz, der direkt auf der Fläche steht. */
  hinweis: string;
  quelle?: string;
}

export interface Sperrung {
  grund: string;
  seit: string;
}

/** Eine Kampagne nagelt ein Paket auf genau diesen Stand fest. */
export interface Anheftung {
  version: string;
  pruefsumme: string;
}

interface EintragBase {
  id: string;
  name: string;
  /** Titel im Weltkorpus, falls der Eintrag von dort stammt (Herkunftsnachweis). */
  herkunftsartikel?: string;
}

export interface SchadenStufe {
  stufe: "Gewöhnlich" | "Verbessert" | "Exzellent" | "Meisterhaft" | "Episch";
  wert: number;
}

export interface GegenstandEintrag extends EintragBase {
  art: "Gegenstände";
  klasse: string;
  schaden: SchadenStufe[];
  seltenheit: string;
  traeger?: string;
  effekt?: string;
  preis?: { kauf: string; verkauf: string };
}

export interface MonsterEintrag extends EintragBase {
  art: "Monster";
  gefahrenstufe: number;
  trefferpunkte: number;
  ruestungsklasse: number;
  angriffe: string[];
  lebensraum: string;
}

export interface ZauberEintrag extends EintragBase {
  art: "Zauber";
  schule: string;
  stufe: number;
  wirkungsbereich: string;
  wirkungsdauer: string;
  beschreibungKurz: string;
}

export interface RegelEintrag extends EintragBase {
  art: "Regeln";
  kategorie: string;
  formel: string;
  anwendung: string;
}

export interface OrtEintrag extends EintragBase {
  art: "Orte";
  region: string;
  typ: string;
  bevoelkerung?: string;
  bekanntFuer: string;
}

export type KompendiumEintrag =
  | GegenstandEintrag
  | MonsterEintrag
  | ZauberEintrag
  | RegelEintrag
  | OrtEintrag;

export interface KompendiumPaket {
  id: string;
  name: string;
  anbieter: string;
  inhaltsart: Inhaltsart;
  beschreibung: string;
  lizenz: Lizenz;
  aktuelleVersion: string;
  aktuellePruefsumme: string;
  /** Vom Anbieter behauptete Gesamtgröße — nicht dasselbe wie `eintraege.length`. */
  eintraegeGesamt: number;
  eintraege: KompendiumEintrag[];
  installiert: boolean;
  /** Gesetzt, wenn das Paket wegen fehlender Rechte nicht installiert werden darf. */
  sperrung: Sperrung | null;
  /** GM-Pin für die Kampagne. Nur gesetzt, wenn `installiert` true ist. */
  angeheftet: Anheftung | null;
}

export const KOMPENDIUM_PAKETE: readonly KompendiumPaket[] = [
  {
    id: "eron-waffen",
    name: "Eron: Waffen der Kontinente",
    anbieter: "Kaya & Redaktion (Eron-Wiki)",
    inhaltsart: "Gegenstände",
    beschreibung:
      "Nahkampfwaffen aus dem Eron-Wiki — vom zwergischen Kriegshammer bis zum " +
      "elfischen Säbel. Derselbe Korpus führt auch Zwerg, Waldelf und Ork als " +
      "eigene Volksartikel.",
    lizenz: {
      name: "CC BY-SA 3.0",
      weitergabe: "eingeschränkt",
      hinweis:
        "Weitergabe erlaubt, aber nur unter derselben Lizenz und mit Quelle, " +
        "Autor und Revision — kein stiller Rechteübergang.",
      quelle: "eron.fandom.com/de",
    },
    aktuelleVersion: "1.4.1",
    aktuellePruefsumme:
      "sha256:9e2f1a7c4b8d6e30f5a1c2b3d4e5f6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3",
    eintraegeGesamt: 47,
    installiert: true,
    sperrung: null,
    angeheftet: {
      version: "1.4.0",
      pruefsumme:
        "sha256:7a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f",
    },
    eintraege: [
      {
        art: "Gegenstände",
        id: "blechorgelhammer",
        name: "Blechorgelhammer",
        klasse: "Berserker · Kriegshammer",
        schaden: [
          { stufe: "Gewöhnlich", wert: 80 },
          { stufe: "Verbessert", wert: 92 },
          { stufe: "Exzellent", wert: 106 },
          { stufe: "Meisterhaft", wert: 122 },
          { stufe: "Episch", wert: 140 },
        ],
        seltenheit: "Nur zwei Exemplare",
        traeger: "Thorbin, Olav der Ehrliche, Baldur, Ormin",
        effekt: "Panzerbrechend · +1 Magieklasse Sturm",
        herkunftsartikel: "Blechorgelhammer",
      },
      {
        art: "Gegenstände",
        id: "kaiserliches-kurzschwert",
        name: "Kaiserliches Kurzschwert",
        klasse: "Kurzschwert",
        schaden: [
          { stufe: "Gewöhnlich", wert: 40 },
          { stufe: "Verbessert", wert: 46 },
          { stufe: "Exzellent", wert: 53 },
          { stufe: "Meisterhaft", wert: 61 },
          { stufe: "Episch", wert: 70 },
        ],
        seltenheit: "Häufig",
        traeger: "Kaiserliche Streitkräfte",
        preis: { kauf: "40 Kronen", verkauf: "20 Kronen" },
        herkunftsartikel: "Kaiserliches Kurzschwert",
      },
      {
        art: "Gegenstände",
        id: "elfischer-unionssaebel",
        name: "Elfischer Unionssäbel",
        klasse: "Kurzschwert",
        schaden: [
          { stufe: "Gewöhnlich", wert: 40 },
          { stufe: "Verbessert", wert: 46 },
          { stufe: "Exzellent", wert: 53 },
          { stufe: "Meisterhaft", wert: 61 },
          { stufe: "Episch", wert: 70 },
        ],
        seltenheit: "Häufig",
        traeger: "Elfische Unionsarmee (Waldelfen)",
        preis: { kauf: "20 Kronen", verkauf: "40 Kronen" },
        herkunftsartikel: "Elfischer Unionssäbel",
      },
      {
        art: "Gegenstände",
        id: "numerisches-landsknechtschwert",
        name: "Numerisches Landsknechtschwert",
        klasse: "Kurzschwert",
        schaden: [
          { stufe: "Gewöhnlich", wert: 40 },
          { stufe: "Verbessert", wert: 46 },
          { stufe: "Exzellent", wert: 53 },
          { stufe: "Meisterhaft", wert: 61 },
          { stufe: "Episch", wert: 70 },
        ],
        seltenheit: "Häufig",
        traeger: "Numerische Armee",
        preis: { kauf: "40 Kronen", verkauf: "20 Kronen" },
        herkunftsartikel: "Numerisches Landsknechtschwert",
      },
    ],
  },
  {
    id: "epos-kernregeln",
    name: "Epos Kernregeln",
    anbieter: "Epos-Systemteam",
    inhaltsart: "Regeln",
    beschreibung:
      "Kampfklassen, Magieklassen und Effekte des Epos-Regelwerks — desselben " +
      "Systems, auf das die Eron-Waffenartikel bereits verweisen.",
    lizenz: {
      name: "Epos Open Ruleset License 1.0",
      weitergabe: "frei",
      hinweis:
        "Frei nutzbar, veränderbar und weitergebbar — auch außerhalb dieser " +
        "Kampagne, solange die Lizenzdatei mitgeführt wird.",
      quelle: "epos-regelwerk.example/lizenz",
    },
    aktuelleVersion: "2.1.0",
    aktuellePruefsumme:
      "sha256:3c4d5e6f7a8b90c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8",
    eintraegeGesamt: 58,
    installiert: true,
    sperrung: null,
    angeheftet: {
      version: "2.1.0",
      pruefsumme:
        "sha256:3c4d5e6f7a8b90c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8",
    },
    eintraege: [
      {
        art: "Regeln",
        id: "kampfklasse-berserker",
        name: "Kampfklasse: Berserker",
        kategorie: "Kampfklasse",
        formel: "Schaden × 1,15 bei zweihändig geführten Waffen",
        anwendung: "Gilt für alle als „Berserker“ klassifizierten Waffen, z. B. den Blechorgelhammer.",
      },
      {
        art: "Regeln",
        id: "magieklasse-sturm",
        name: "Magieklasse: Sturm",
        kategorie: "Magieklasse",
        formel: "+1 Sturmresistenz pro Bonusstufe",
        anwendung: "Waffenbonus, kumulativ mit aktiver Zauberwirkung derselben Klasse.",
      },
      {
        art: "Regeln",
        id: "effekt-panzerbrechend",
        name: "Effekt: Panzerbrechend",
        kategorie: "Effekt",
        formel: "Ignoriert 20 % Rüstungsklasse des Ziels",
        anwendung: "Wird bei jedem Treffer gegen gerüstete Ziele angewendet.",
      },
    ],
  },
  {
    id: "schwarzfeder-bestiarium",
    name: "Grabkammern-Bestiarium",
    anbieter: "Schwarzfeder Verlag",
    inhaltsart: "Monster",
    beschreibung:
      "Kommerzielles Bestiarium für Tiefenkreaturen — gekauft und für diesen " +
      "Tisch freigeschaltet.",
    lizenz: {
      name: "Schwarzfeder Kampagnenlizenz",
      weitergabe: "gesperrt",
      hinweis:
        "Nur in dieser Kampagne nutzbar. Kein Export, keine Weitergabe an " +
        "andere Tische oder Plattformen — die Lizenz ist an diese Kampagnen-ID " +
        "gebunden.",
      quelle: "schwarzfeder-verlag.example/lizenz/kampagne",
    },
    aktuelleVersion: "3.0.2",
    aktuellePruefsumme:
      "sha256:b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f901",
    eintraegeGesamt: 120,
    installiert: true,
    sperrung: null,
    angeheftet: {
      version: "3.0.2",
      pruefsumme:
        "sha256:b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f901",
    },
    eintraege: [
      {
        art: "Monster",
        id: "grabwurm",
        name: "Grabwurm",
        gefahrenstufe: 3,
        trefferpunkte: 44,
        ruestungsklasse: 12,
        angriffe: ["Biss (2W8)", "Verschlingen (bei Überzahl)"],
        lebensraum: "Verlassene Gräber, feuchte Kellergewölbe",
      },
      {
        art: "Monster",
        id: "tiefenschreck",
        name: "Tiefenschreck",
        gefahrenstufe: 6,
        trefferpunkte: 71,
        ruestungsklasse: 14,
        angriffe: ["Klauenhieb (2×1W10)", "Schreckensschrei (Furcht-Probe)"],
        lebensraum: "Unterirdische Höhlensysteme",
      },
      {
        art: "Monster",
        id: "knochenhund",
        name: "Knochenhund",
        gefahrenstufe: 2,
        trefferpunkte: 26,
        ruestungsklasse: 11,
        angriffe: ["Biss (1W8)"],
        lebensraum: "Gräberfelder, Ruinen",
      },
    ],
  },
  {
    id: "silberzirkel-zauber",
    name: "Silberzirkel Zauberbibliothek",
    anbieter: "Silberzirkel Verlag",
    inhaltsart: "Zauber",
    beschreibung:
      "Zauber der Silberzirkel-Tradition — wartet auf Rechteprüfung für diesen " +
      "Tisch, bevor er installiert werden kann.",
    lizenz: {
      name: "Silberzirkel Vertriebslizenz",
      weitergabe: "eingeschränkt",
      hinweis:
        "Erfordert eine bestätigte Rechteprüfung pro Kampagnensitz vor " +
        "Aktivierung. Bis zur Bestätigung bleibt das Paket gesperrt.",
      quelle: "silberzirkel-verlag.example/lizenz",
    },
    aktuelleVersion: "1.0.0",
    aktuellePruefsumme:
      "sha256:1a2b3c4d5e6f70819243a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9",
    eintraegeGesamt: 84,
    installiert: false,
    sperrung: {
      grund:
        "Regionale Vertriebsrechte für dieses Werk sind für unseren " +
        "Kampagnensitz noch nicht bestätigt. Der Verlag verlangt eine " +
        "Rechteprüfung pro Kampagne, die noch aussteht.",
      seit: "2026-08-30",
    },
    angeheftet: null,
    eintraege: [
      {
        art: "Zauber",
        id: "silberfaden",
        name: "Silberfaden",
        schule: "Verwandlung",
        stufe: 2,
        wirkungsbereich: "9 m Reichweite",
        wirkungsdauer: "1 Minute / Stufe",
        beschreibungKurz: "Bindet ein Ziel mit einem sichtbaren Silberfaden.",
      },
      {
        art: "Zauber",
        id: "nebelzirkel",
        name: "Nebelzirkel",
        schule: "Illusion",
        stufe: 3,
        wirkungsbereich: "6 m Radius",
        wirkungsdauer: "10 Minuten",
        beschreibungKurz: "Verhüllt einen Bereich in dichtem, blickdichtem Nebel.",
      },
      {
        art: "Zauber",
        id: "mondsplitter",
        name: "Mondsplitter",
        schule: "Hervorrufung",
        stufe: 4,
        wirkungsbereich: "Einzelziel, 18 m",
        wirkungsdauer: "Sofort",
        beschreibungKurz: "Ruft einen Splitter Mondlicht als Fernangriff herbei.",
      },
    ],
  },
];
