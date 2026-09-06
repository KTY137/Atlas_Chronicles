/**
 * ERON — kuratierter Fixture-Auszug für das Shell Lab.
 * Prosa: Eron Wiki (https://eron.fandom.com/de/) · CC BY-SA 3.0 · Welt von Kaya
 * und Kollegen (autorisiert, siehe STATUS.md). Beispiel-Universum, nie
 * Produktinhalt (Invariante K7). Jede Fläche, die diese Prosa zeigt, nennt
 * Quelle und Lizenz.
 */

import mapUrl from "../../fixtures/eron/media/Karte_von_Andaria.webp";
import songKaynUrl from "../../fixtures/eron/media/SongKayn.webp";
import yalitUrl from "../../fixtures/eron/media/Yalit.webp";
import bodinUrl from "../../fixtures/eron/media/Bodin.webp";
import irmeUrl from "../../fixtures/eron/media/Irme.webp";

export type Role = "gm" | "player";
export type StageId = "heute" | "welt" | "tisch" | "kanal" | "schmiede" | "netz";
export type LookId = "obsidian" | "vellum" | "aurora";

export const ATTRIBUTION =
  "Prosa & Karte: Eron Wiki (eron.fandom.com/de) · CC BY-SA 3.0 · Beispiel-Universum, nie Produktinhalt";

export interface Person {
  id: string;
  name: string;
  short: string;
  kind: "gm" | "pc" | "npc";
  subtitle: string;
  player?: string;
  portrait?: string;
  initials: string;
  hp?: readonly [number, number];
  /** Marker-Position auf der Andaria-Karte, Prozent. */
  pos?: readonly [number, number];
}

export const KAYA: Person = {
  id: "kaya",
  name: "Kaya",
  short: "Kaya",
  kind: "gm",
  subtitle: "Spielleitung",
  initials: "K",
};

export const PARTY: readonly Person[] = [
  {
    id: "olav",
    name: "Olav der Ehrliche",
    short: "Olav",
    kind: "pc",
    subtitle: "Zwergenbarde · Flüsterer",
    player: "Timo",
    initials: "OL",
    hp: [63, 71],
    pos: [36, 60],
  },
  {
    id: "song",
    name: "Song Kayn",
    short: "Song",
    kind: "pc",
    subtitle: "Schattenkorsar · Kapitän",
    player: "Ilva",
    portrait: songKaynUrl,
    initials: "SK",
    hp: [41, 60],
    pos: [43, 65],
  },
  {
    id: "oggugat",
    name: "Oggugat",
    short: "Oggugat",
    kind: "pc",
    subtitle: "Ork · Weggefährte",
    player: "Jonte",
    initials: "OG",
    hp: [55, 55],
    pos: [38, 69],
  },
  {
    id: "yalit",
    name: "Yal'it der Wissbegierige",
    short: "Yal'it",
    kind: "pc",
    subtitle: "Waldelf · früher bei der Gruppe",
    player: "Mira",
    portrait: yalitUrl,
    initials: "YA",
    hp: [44, 44],
    pos: [49, 58],
  },
];

export const NPCS: readonly Person[] = [
  {
    id: "bodin",
    name: "Bodin",
    short: "Bodin",
    kind: "npc",
    subtitle: "Olavs Onkel · Minenzwerg",
    portrait: bodinUrl,
    initials: "BO",
  },
  {
    id: "irme",
    name: "Irme",
    short: "Irme",
    kind: "npc",
    subtitle: "Olavs Gemahlin",
    portrait: irmeUrl,
    initials: "IR",
  },
];

export const EVERYONE: readonly Person[] = [KAYA, ...PARTY];

export const personById = (id: string): Person => {
  const hit = EVERYONE.concat(NPCS).find((p) => p.id === id);
  if (!hit) throw new Error(`Unbekannte Person im Fixture: ${id}`);
  return hit;
};

/* ---------------------------------------------------------------- Kampagne */

export const CAMPAIGN = {
  universe: "Eron",
  campaign: "Hauptrunde",
  session: "Sitzung XV",
  sessionTitle: "Das Kind und die Flüsterer",
  nextSession: "Samstag, 20:00",
  map: { name: "Andaria", url: mapUrl },
} as const;

/* ------------------------------------------------------------------- Welt */

export interface ArticleLink {
  label: string;
  exists: boolean;
}

export const ARTICLE = {
  title: "Flüsterer",
  eyebrow: "Eron · Enzyklopädie · Organisation",
  lastEdit: "zuletzt bearbeitet Sitzung 14 · Kaya",
  lead:
    "Die Flüsterer sind eine im Geheimen operierende Organisation, die es sich zum Ziel gemacht hat, über Länder und Staatsgrenzen hinaus Frieden zu schaffen. Sie nutzen Attentäter, Spione und Maulwürfe, um ihre Pläne zu verwirklichen.",
  body: [
    "Eine Zeit lang wurden sie vom Höchstelfen, als „die Stimme“, kontrolliert, wodurch ihr eigentliches Ziel pervertiert wurde und sie zum Spielball eines diabolischen Planes wurden.",
    "Hervorgegangen aus dem Bardenzirkel von Schwarzweide (Gründung 835, Neugründung 867), residierten die Flüsterer nacheinander in Schwarzweide, Blattheim und Baumgard — seit 868 operieren sie dezentral an mehreren Standorten. Seit 867 führt Baldur die Organisation.",
    "Zu den besonderen Mitgliedern zählen Syrio Hofer, Olav der Ehrliche, Oggugat und Song Kayn.",
  ],
  facts: [
    ["Aufgabe", "Frieden zwischen allen Völkern Erons"],
    ["Gründung", "835 · Neugründung 867"],
    ["Oberhaupt", "Oberster Flüsterer"],
    ["Anführer", "Baldur (seit 867)"],
    ["Sitz", "dezentral (seit 868)"],
  ] as const,
  links: [
    { label: "Olav der Ehrliche", exists: true },
    { label: "Song Kayn", exists: true },
    { label: "Baldur", exists: true },
    { label: "Blattheim", exists: true },
    { label: "Bardenzirkel", exists: false },
    { label: "Oberster Flüsterer", exists: false },
  ] as ArticleLink[],
  backlinks: [
    "Olav der Ehrliche",
    "Das Kind",
    "Thorbin",
    "Massaker von Mowach",
    "Blattheim",
  ],
} as const;

/** Lens-Daten für Olav — echte Registerdaten aus dem Wiki-Auszug. */
export const OLAV_LENS = {
  fields: [
    ["Spezies", "Humanoid · Zwerg"],
    ["Volk", "Minenzwerge"],
    ["Geboren", "837 · Nord Tal"],
    ["Größe", "1,40 m"],
    ["Kopfgeld", "150.000 Silberlinge"],
    ["Bewaffnung", "Blechorgelhammer"],
    ["Merkmale", "nur noch ein Ohr"],
  ] as const,
  sicht: [
    { wer: "Timo (Olav)", was: "alles Eigene + 2 offene Passagen" },
    { wer: "Ilva (Song)", was: "öffentlicher Artikel + gemeinsame Aufträge" },
    { wer: "Jonte (Oggugat)", was: "öffentlicher Artikel" },
    { wer: "Öffentlich", was: "Steckbrief: Kopfgeld, Deckname „Mahtin“" },
  ] as const,
  history: [
    "Sitzung 15 · Passage „Die versiegelte Tür“ verknüpft",
    "Dienstag 22:10 · Kanon geprägt: Namensrune entziffert",
    "Sitzung 14 · Kopfgeld auf 150.000 erhöht",
  ] as const,
} as const;

/* ------------------------------------------------------------------ Tisch */

export const SCENE = {
  name: "Die Nördlichen Minenreiche",
  region: "Andaria · Nordwest",
  hidden: {
    id: "passage",
    name: "Die versiegelte Passage",
    hint: "3 Namen · 1 Schlüssel",
    pos: [56, 40] as const,
  },
  initiative: [
    { id: "olav", value: 17 },
    { id: "song", value: 15 },
    { id: "oggugat", value: 13 },
    { id: "yalit", value: 11 },
  ] as const,
  round: 3,
} as const;

/* ------------------------------------------------------------------ Kanal */

export type ChannelMessage =
  | { kind: "divider"; id: string; label: string }
  | {
      kind: "text";
      id: string;
      author: string;
      day: string;
      time: string;
      text: string;
      thread?: number;
      reactions?: readonly { emoji: string; count: number }[];
    }
  | {
      kind: "vollmacht";
      id: string;
      author: string;
      day: string;
      time: string;
      to: string;
      title: string;
      scope: string;
      cap: string;
      state: "offen" | "eingelöst" | "widerrufen";
    }
  | {
      kind: "roll";
      id: string;
      author: string;
      day: string;
      time: string;
      label: string;
      formula: string;
      die: number;
      mod: number;
      vs: number;
      ok: boolean;
    }
  | {
      kind: "kanon";
      id: string;
      day: string;
      time: string;
      text: string;
      source: string;
    };

export const CHANNELS = [
  { id: "zwischen", name: "zwischen-den-abenden", unread: 0 },
  { id: "kanon", name: "kanon", unread: 1 },
  { id: "tisch", name: "tischgespräch", unread: 12 },
] as const;

export const MESSAGES: readonly ChannelMessage[] = [
  { kind: "divider", id: "d1", label: "Sitzung 15 beendet · Samstag 23:40" },
  {
    kind: "text",
    id: "m1",
    author: "kaya",
    day: "Samstag",
    time: "23:12",
    text: "Die Wand hinter dem Säulengang trägt drei Namen, und ihr kennt erst zwei. Olav — die Namensrune ist andarisch, älter als der Rat. Wenn du sie diese Woche entziffern willst: Vollmacht liegt unten. Der Rest wartet auf Samstag.",
  },
  {
    kind: "vollmacht",
    id: "v1",
    author: "kaya",
    day: "Samstag",
    time: "23:14",
    to: "olav",
    title: "Wissensprobe · Die Namensrune",
    scope: "1W20 + 3 gegen SG 14 · nur diese Rune",
    cap: "einmalig · gültig bis Freitag · widerrufbar",
    state: "eingelöst",
  },
  {
    kind: "text",
    id: "m2",
    author: "olav",
    day: "Sonntag",
    time: "10:41",
    text: "Bevor ich würfle: Thorbin hat mir Lesen an alten Minenmarken beigebracht. Zählt das als Vertrautheit, oder frage ich zu viel?",
    thread: 3,
  },
  {
    kind: "roll",
    id: "r1",
    author: "olav",
    day: "Dienstag",
    time: "22:10",
    label: "Wissensprobe · Die Namensrune",
    formula: "1W20 + 3",
    die: 14,
    mod: 3,
    vs: 14,
    ok: true,
  },
  {
    kind: "kanon",
    id: "k1",
    day: "Dienstag",
    time: "22:10",
    text: "Olav entziffert die Namensrune: Sie nennt keinen Elfen und keinen Zwerg, sondern den Bardenzirkel selbst. Die versiegelte Passage gehorcht einem Lied, nicht einem Schlüssel.",
    source: "Vollmacht #7 · Wurf 17 gegen SG 14",
  },
  {
    kind: "text",
    id: "m3",
    author: "song",
    day: "Mittwoch",
    time: "08:03",
    text: "Ein Lied. Natürlich ein Lied. Ich hole die Blechorgel NICHT noch einmal aus dem Fluss.",
    reactions: [
      { emoji: "🎶", count: 3 },
      { emoji: "⚓", count: 1 },
    ],
  },
  {
    kind: "text",
    id: "m4",
    author: "kaya",
    day: "Donnerstag",
    time: "19:22",
    text: "Samstag 20:00. Bringt Antworten mit — die Passage bringt ihre eigenen Fragen.",
  },
];

/* --------------------------------------------------------------- Schmiede */

export const FORGE = {
  package: "eron-regeln",
  version: "0.3.2",
  rule: {
    name: "Wissensprobe",
    formula: "1W20 + Attribut(Wissen) gegen SG",
    trace: ["Wurf 1W20 → 14", "+ Wissen 3 → 17", "≥ SG 14 → Erfolg"],
  },
  tests: [
    { name: "Probe · Normalfall", ok: true },
    { name: "Probe · Paarige Zehner (VtM-Zählung)", ok: true },
    { name: "Vollmacht · Widerruf nach Einlösung", ok: false },
  ],
  schemas: ["Person", "Ort", "Organisation", "Gegenstand", "Passage"],
} as const;

/* ------------------------------------------------------------------- Netz */

export const NETZ = {
  room: {
    name: "Hauptrunde · Sitzung XV",
    region: "eu-central",
    rtt: 46,
    online: 4,
  },
  ladder: [
    { step: "SFU (eu-central)", state: "aktiv" },
    { step: "TURN-Relay", state: "bereit" },
    { step: "P2P-Mesh (≤ 4)", state: "bereit" },
    { step: "Sprache liegt — der Tisch läuft", state: "nie stumm" },
  ] as const,
  services: [
    { name: "Befehlsbus", detail: "WebSocket · seq 4 812 · resume ok", ok: true },
    { name: "Medienebene", detail: "LiveKit · 4 Teilnehmer · Opus 32 kb/s", ok: true },
    { name: "Präsenz", detail: "Piggyback auf Befehlsbus · 5 Clients", ok: true },
    { name: "TURN (coturn)", detail: "Relay-Kandidaten verfügbar", ok: true },
  ] as const,
  selfhost:
    "docker compose up  ·  app + postgres + livekit + coturn — ein Verbund, kein zweiter Codepfad",
  bandwidth: [22, 28, 25, 31, 38, 34, 41, 39, 44, 40, 36, 42, 47, 45, 43, 48],
} as const;
