/**
 * Infobox-Fixture — Vorlagendaten für die Bühne „Infobox Studio".
 *
 * Feldnamen, Feldreihenfolge und Beispielwerte stammen aus dem echten
 * Eron-Korpus: den Vorlagen „Person", „Rasse/Spezies", „Stadt" und
 * „Regierung" (siehe design/fixtures/eron/templates.json,
 * used_by_count/infobox_fields) sowie den Artikeln „Olav der Ehrliche" und
 * „Zwerg" (siehe design/fixtures/eron/articles.json). Keine erfundenen
 * Feldnamen — nur eine kuratierte Teilmenge der echten.
 *
 * Prosa & Bild: Eron Wiki (https://eron.fandom.com/de/) · CC BY-SA 3.0 ·
 * Beispiel-Universum, nie Produktinhalt (Invariante K7).
 */

import beispielBildUrl from "../../fixtures/eron/media/Irme.webp";

/** Die sieben Feldtypen. Genug für jede Infobox im Korpus, ohne Turing-Vollständigkeit. */
export type FieldType =
  | "text"
  | "zahl"
  | "datum"
  | "auswahl"
  | "verweis"
  | "liste"
  | "bild";

export interface FieldTypeMeta {
  id: FieldType;
  label: string;
  hint: string;
}

export const FIELD_TYPES: readonly FieldTypeMeta[] = [
  { id: "text", label: "Text", hint: "Freier Text, eine Zeile." },
  { id: "zahl", label: "Zahl", hint: "Nur Ziffern — sortier- und vergleichbar." },
  { id: "datum", label: "Datum", hint: "Ein Zeitpunkt im Kalender der Welt." },
  { id: "auswahl", label: "Auswahl", hint: "Eine von mehreren festgelegten Optionen." },
  {
    id: "verweis",
    label: "Verweis",
    hint: "Verlinkt einen anderen Artikel und erzeugt dort einen Backlink.",
  },
  { id: "liste", label: "Liste", hint: "Mehrere Einträge, einer pro Zeile." },
  { id: "bild", label: "Bild", hint: "Ein hochgeladenes oder verlinktes Bild." },
] as const;

export interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  help: string;
  /** Nur bei type „auswahl": die zulässigen Optionen. */
  options?: string[];
  /** Beispielwert für die Vorschau (Bildunterschrift bei type „bild"). */
  example: string;
  /** Nur bei type „liste": mehrere Beispielzeilen statt einer. */
  exampleItems?: string[];
  /** Nur bei type „bild": tatsächliche Bildquelle, falls in der Fixture vorhanden. */
  imageUrl?: string;
}

export interface InfoboxTemplateDef {
  id: string;
  name: string;
  summary: string;
  /** Die reale Vorlage im Eron-Korpus, aus der Feldnamen und Reihenfolge stammen. */
  sourceTemplate: string;
  /** Ein realer Artikel, der diese Vorlage nutzt — Herkunft der Beispielwerte. */
  exampleArticle: string;
  /** Wie oft die Vorlage laut Korpus bereits verwendet wird (used_by_count). */
  usageCount: number;
  fields: TemplateField[];
}

export const INFOBOX_TEMPLATES: readonly InfoboxTemplateDef[] = [
  {
    id: "person",
    name: "Person",
    summary: "Für Figuren: Spielercharaktere, NSCs, Widersacher.",
    sourceTemplate: "Vorlage:Person",
    exampleArticle: "Olav der Ehrliche",
    usageCount: 20,
    fields: [
      {
        id: "bild",
        label: "Bild",
        type: "bild",
        required: false,
        help: "Porträt oder Symbolbild. Erscheint oben in der Infobox.",
        example: "Beispielbild aus der Vorschau — Irme, Gemahlin von Olav dem Ehrlichen.",
        imageUrl: beispielBildUrl,
      },
      {
        id: "spezies",
        label: "Spezies",
        type: "verweis",
        required: true,
        help: "Übergeordnete biologische Einordnung, etwa Humanoide.",
        example: "Humanoide",
      },
      {
        id: "rasse",
        label: "Rasse",
        type: "verweis",
        required: true,
        help: "Volk oder Rasse der Person.",
        example: "Zwerg",
      },
      {
        id: "volk",
        label: "Volk",
        type: "text",
        required: false,
        help: "Genauere Zugehörigkeit innerhalb der Rasse.",
        example: "Minenzwerge",
      },
      {
        id: "geschlecht",
        label: "Geschlecht",
        type: "auswahl",
        required: false,
        help: "Eine festgelegte Option statt Freitext.",
        options: ["Männlich", "Weiblich", "Divers", "Unbekannt"],
        example: "Männlich",
      },
      {
        id: "groesse",
        label: "Größe",
        type: "text",
        required: false,
        help: "Körpergröße, frei formatiert.",
        example: "1,40 m",
      },
      {
        id: "kopfgeld",
        label: "Kopfgeld",
        type: "text",
        required: false,
        help: "Höhe der Belohnung samt Währung.",
        example: "150.000 Silberlinge",
      },
      {
        id: "geburt",
        label: "Geburt",
        type: "datum",
        required: false,
        help: "Zeitpunkt der Geburt im Kalender der Welt.",
        example: "837",
      },
      {
        id: "geburtsort",
        label: "Geburtsort",
        type: "verweis",
        required: false,
        help: "Verlinkt den Ort und erzeugt dort einen Backlink.",
        example: "Nord Tal",
      },
      {
        id: "heimat",
        label: "Heimat",
        type: "liste",
        required: false,
        help: "Ein Wohnort pro Zeile, chronologisch.",
        example: "Nord Tal, Nördliche Minenreiche",
        exampleItems: ["Nord Tal, Nördliche Minenreiche", "Bjoldiri (ab 867)"],
      },
      {
        id: "verwandte",
        label: "Verwandte",
        type: "liste",
        required: false,
        help: "Eine Person pro Zeile, mit Rolle in Klammern.",
        example: "Fjördin der Tapfere (Vater)",
        exampleItems: [
          "Fjördin der Tapfere (Vater)",
          "Hylde (Mutter)",
          "Irme (Gemahlin)",
          "Ormin (Sohn)",
        ],
      },
      {
        id: "beruf",
        label: "Beruf",
        type: "liste",
        required: false,
        help: "Ein Beruf pro Zeile.",
        example: "Barde/Tagelöhner",
        exampleItems: ["Barde/Tagelöhner", "Krimineller"],
      },
      {
        id: "bewaffnung",
        label: "Bewaffnung",
        type: "verweis",
        required: false,
        help: "Verlinkt die Waffe und erzeugt dort einen Backlink.",
        example: "Blechorgelhammer",
      },
      {
        id: "organisation",
        label: "Organisation",
        type: "verweis",
        required: false,
        help: "Verlinkt die Gruppe, der die Person angehört.",
        example: "Flüsterer",
      },
      {
        id: "merkmale",
        label: "Merkmale",
        type: "text",
        required: false,
        help: "Auffällige körperliche Besonderheiten.",
        example: "Nur noch ein Ohr",
      },
    ],
  },
  {
    id: "ort",
    name: "Ort",
    summary: "Für Städte, Siedlungen und Regionen.",
    sourceTemplate: "Vorlage:Stadt",
    exampleArticle: "Bjoldiri",
    usageCount: 2,
    fields: [
      {
        id: "bild",
        label: "Bild",
        type: "bild",
        required: false,
        help: "Foto oder Karte des Ortes.",
        example: "",
      },
      {
        id: "errichtet",
        label: "Errichtet",
        type: "datum",
        required: false,
        help: "Zeitpunkt der Gründung.",
        example: "612",
      },
      {
        id: "erbauer",
        label: "Erbauer",
        type: "verweis",
        required: false,
        help: "Verlinkt die Person oder Gruppe, die den Ort errichtet hat.",
        example: "Baurin Pyriter",
      },
      {
        id: "land",
        label: "Land",
        type: "verweis",
        required: true,
        help: "Übergeordnetes Staatsgebiet. Verlinkt den Artikel und erzeugt dort einen Backlink.",
        example: "Südliche Minenreiche",
      },
      {
        id: "region",
        label: "Region",
        type: "text",
        required: false,
        help: "Landschaftliche Lage innerhalb des Landes.",
        example: "Salzflussinseln",
      },
      {
        id: "flaeche",
        label: "Fläche",
        type: "text",
        required: false,
        help: "Ausdehnung, frei formatiert.",
        example: "38 km²",
      },
      {
        id: "einwohnerzahl",
        label: "Einwohnerzahl",
        type: "zahl",
        required: false,
        help: "Geschätzte Bevölkerung.",
        example: "42.000",
      },
      {
        id: "regierungsform",
        label: "Regierungsform",
        type: "auswahl",
        required: false,
        help: "Eine festgelegte Option statt Freitext.",
        options: ["Monarchie", "Republik", "Freie Stadt", "Rat", "Sonstige"],
        example: "Freie Stadt",
      },
      {
        id: "sehenswuerdigkeiten",
        label: "Sehenswürdigkeiten",
        type: "liste",
        required: false,
        help: "Ein Ort pro Zeile.",
        example: "Der Große Hafen",
        exampleItems: ["Der Große Hafen", "Zwergenmarkt"],
      },
      {
        id: "zugehoerigkeit",
        label: "Zugehörigkeit",
        type: "verweis",
        required: false,
        help: "Verlinkt Fraktion oder Bündnis, dem der Ort angehört.",
        example: "Südliche Minenreiche",
      },
    ],
  },
  {
    id: "organisation",
    name: "Organisation",
    summary: "Für Regierungen, Bünde und Fraktionen.",
    sourceTemplate: "Vorlage:Regierung",
    exampleArticle: "Flüsterer",
    usageCount: 9,
    fields: [
      {
        id: "bild",
        label: "Bild",
        type: "bild",
        required: false,
        help: "Wappen oder Symbol der Organisation.",
        example: "",
      },
      {
        id: "regierungstyp",
        label: "Regierungstyp",
        type: "auswahl",
        required: false,
        help: "Eine festgelegte Option statt Freitext.",
        options: ["Geheimbund", "Monarchie", "Rat", "Zunft", "Orden", "Sonstige"],
        example: "Geheimbund",
      },
      {
        id: "gruender",
        label: "Gründer",
        type: "verweis",
        required: false,
        help: "Verlinkt die gründende Person und erzeugt dort einen Backlink.",
        example: "Thorbin",
      },
      {
        id: "anfuehrer",
        label: "Anführer",
        type: "verweis",
        required: false,
        help: "Verlinkt die aktuell führende Person.",
        example: "Thorbin",
      },
      {
        id: "mitglieder",
        label: "Mitglieder",
        type: "liste",
        required: false,
        help: "Ein Mitglied pro Zeile.",
        example: "Olav der Ehrliche",
        exampleItems: ["Olav der Ehrliche", "Baldur", "Thorbin"],
      },
      {
        id: "regierungssitz",
        label: "Regierungssitz",
        type: "verweis",
        required: false,
        help: "Verlinkt den Ort, von dem aus regiert wird.",
        example: "Blattheim",
      },
      {
        id: "gruendung",
        label: "Gründung",
        type: "datum",
        required: false,
        help: "Zeitpunkt der Gründung.",
        example: "612",
      },
      {
        id: "sprache",
        label: "Sprache",
        type: "text",
        required: false,
        help: "Innerhalb der Organisation gesprochene Sprache.",
        example: "Andarisch",
      },
      {
        id: "waehrung",
        label: "Währung",
        type: "text",
        required: false,
        help: "Innerhalb der Organisation genutzte Währung.",
        example: "Silberlinge",
      },
    ],
  },
  {
    id: "spezies",
    name: "Spezies",
    summary: "Für Völker und Rassen: Zwerge, Elfen, Orks.",
    sourceTemplate: "Vorlage:Rasse/Spezies",
    exampleArticle: "Zwerg",
    usageCount: 8,
    fields: [
      {
        id: "bild",
        label: "Bild",
        type: "bild",
        required: false,
        help: "Typisches Erscheinungsbild der Spezies.",
        example: "",
      },
      {
        id: "spezies",
        label: "Spezies",
        type: "verweis",
        required: true,
        help: "Übergeordnete biologische Einordnung, etwa Humanoide.",
        example: "Humanoide",
      },
      {
        id: "durchschnittsgroesse",
        label: "Durchschnittsgröße",
        type: "text",
        required: false,
        help: "Typische Körpergröße ausgewachsener Exemplare.",
        example: "1,45 m",
      },
      {
        id: "lebenserwartung",
        label: "Durchschnittliche Lebenserwartung",
        type: "zahl",
        required: false,
        help: "In Jahren.",
        example: "65",
      },
      {
        id: "pubertaet",
        label: "Durchschnittliches Alter der Pubertät",
        type: "zahl",
        required: false,
        help: "In Jahren.",
        example: "9",
      },
      {
        id: "mehrheitsgebiete",
        label: "Staaten/Länder mit Mehrheit",
        type: "liste",
        required: false,
        help: "Ein Gebiet pro Zeile.",
        example: "Minenreiche",
        exampleItems: [
          "Minenreiche",
          "Nördliche Minenreiche",
          "Südliche Minenreiche",
          "Bjoldiri",
        ],
      },
    ],
  },
];
