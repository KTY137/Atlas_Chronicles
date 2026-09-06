/**
 * Sammlungen — Roll20s Ordner und Foundrys Verzeichnisbäume, ohne deren Schwäche.
 *
 * Dort liegt ein Objekt in genau einem Ordner. Ein Ort ist aber gleichzeitig
 * „Nördliche Minenreiche", „Schauplatz Sitzung 15" und „noch nicht freigegeben".
 * Deshalb sind Sammlungen hier **gespeicherte Abfragen**: Ein Artikel kann in
 * beliebig vielen liegen, ohne kopiert zu werden. Handgepflegte Listen bleiben
 * für die Fälle, in denen keine Abfrage passt.
 */

import type { WikiArticle } from "./wiki";

export type Operator =
  | "art-ist"
  | "verlinkt-auf"
  | "backlinks-mindestens"
  | "woerter-hoechstens"
  | "woerter-mindestens"
  | "titel-enthaelt"
  | "bearbeitet-seit"
  | "hier-entstanden";

export interface Condition {
  id: string;
  operator: Operator;
  value: string;
}

export interface Collection {
  id: string;
  name: string;
  hint: string;
  /** Abfrage-Sammlungen rechnen; handgepflegte tragen ihre Titel selbst. */
  kind: "abfrage" | "handgepflegt";
  conditions: Condition[];
  members: string[];
}

export const OPERATOR_LABEL: Record<Operator, string> = {
  "art-ist": "Art ist",
  "verlinkt-auf": "verlinkt auf",
  "backlinks-mindestens": "Backlinks mindestens",
  "woerter-hoechstens": "Wörter höchstens",
  "woerter-mindestens": "Wörter mindestens",
  "titel-enthaelt": "Titel enthält",
  "bearbeitet-seit": "bearbeitet seit",
  "hier-entstanden": "in Chronicle entstanden",
};

/** Operatoren, die keinen Wert brauchen. */
export const VALUELESS: readonly Operator[] = ["hier-entstanden"];

export function matches(article: WikiArticle, condition: Condition): boolean {
  const value = condition.value.trim();
  switch (condition.operator) {
    case "art-ist":
      return article.kind.toLowerCase() === value.toLowerCase();
    case "verlinkt-auf":
      return article.links.some(
        (link) => link.toLowerCase() === value.toLowerCase(),
      );
    case "backlinks-mindestens":
      return article.backlinks.length >= Number(value || 0);
    case "woerter-hoechstens":
      return article.words <= Number(value || 0);
    case "woerter-mindestens":
      return article.words >= Number(value || 0);
    case "titel-enthaelt":
      return article.title.toLowerCase().includes(value.toLowerCase());
    case "bearbeitet-seit":
      return Boolean(article.lastEdit) && article.lastEdit >= value;
    case "hier-entstanden":
      return article.created;
  }
}

/** Alle Bedingungen mit UND. Eine Sammlung ohne Bedingung trifft nichts. */
export function resolve(
  collection: Collection,
  articles: readonly WikiArticle[],
): WikiArticle[] {
  if (collection.kind === "handgepflegt") {
    return articles.filter((article) => collection.members.includes(article.title));
  }
  if (!collection.conditions.length) return [];
  return articles.filter((article) =>
    collection.conditions.every((condition) => matches(article, condition)),
  );
}

const condition = (operator: Operator, value = ""): Condition => ({
  id: `${operator}-${value}-${Math.random().toString(36).slice(2, 7)}`,
  operator,
  value,
});

/** Fünf Sammlungen, deren Bedingungen auf dem echten Eron-Korpus greifen. */
export const COLLECTIONS: Collection[] = [
  {
    id: "personen",
    name: "Alle Personen",
    hint: "Jeder Artikel, dessen Infobox ihn als Person führt.",
    kind: "abfrage",
    conditions: [condition("art-ist", "Person")],
    members: [],
  },
  {
    id: "tragend",
    name: "Was die Welt zusammenhält",
    hint: "Artikel, auf die viele andere zeigen — reißt einer, reißt viel.",
    kind: "abfrage",
    conditions: [condition("backlinks-mindestens", "10")],
    members: [],
  },
  {
    id: "duenn",
    name: "Dünne Stellen",
    hint: "Verlinkt, aber kaum geschrieben. Der nächste Abend füllt sie.",
    kind: "abfrage",
    conditions: [
      condition("woerter-hoechstens", "40"),
      condition("backlinks-mindestens", "3"),
    ],
    members: [],
  },
  {
    id: "fluesterer",
    name: "Rund um die Flüsterer",
    hint: "Alles, was auf die Organisation zeigt.",
    kind: "abfrage",
    conditions: [condition("verlinkt-auf", "Flüsterer")],
    members: [],
  },
  {
    id: "sitzung15",
    name: "Schauplätze Sitzung XV",
    hint: "Handverlesen — keine Abfrage trifft, was am Tisch wichtig war.",
    kind: "handgepflegt",
    conditions: [],
    members: [
      "Olav der Ehrliche",
      "Flüsterer",
      "Blattheim",
      "Das Kind",
      "Song Kayn",
    ],
  },
];
