/**
 * Lokaler Schreibspeicher über dem importierten Korpus.
 *
 * Im Produkt läge das auf dem Server hinter `Sicht`; im Lab liegt es in
 * localStorage, damit Schreiben, Anlegen und Neuladen wirklich funktionieren
 * statt nur so auszusehen. Der gebündelte Import bleibt unangetastet —
 * Änderungen sind eine Schicht darüber und jederzeit verwerfbar.
 */

const KEY = "chronicle.shell-lab.wiki.v1";

export interface StoredOrigin {
  source: string;
  license: string;
  revision: number | null;
}

export interface StoredArticle {
  title: string;
  wikitext: string;
  /** Neu in Chronicle entstanden, nicht importiert. */
  created: boolean;
  editedAt: string;
  /** Gesetzt, wenn der Artikel live aus einem fremden Wiki kam. */
  origin?: StoredOrigin;
}

type Store = Record<string, StoredArticle>;

let cache: Store | null = null;
let lastWriteError: string | null = null;
const listeners = new Set<() => void>();

function read(): Store {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    /* Privater Modus oder beschädigter Eintrag: im Speicher weiterarbeiten. */
    cache = {};
  }
  return cache;
}

function write(next: Store) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    lastWriteError = null;
  } catch (error) {
    /* Nicht still schlucken: Der Nutzer muss erfahren, dass nichts persistiert
       wurde. Die Sitzung läuft weiter, aber ein Neuladen verliert alles. */
    const quota = error instanceof Error && /quota|exceed/i.test(error.message);
    lastWriteError = quota
      ? "Der Browserspeicher ist voll. Die Änderungen gelten für diese Sitzung, überleben aber kein Neuladen."
      : "Speichern im Browser nicht möglich. Die Änderungen gelten nur für diese Sitzung.";
  }
  for (const listener of listeners) listener();
}

export const getWriteError = (): string | null => lastWriteError;

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getStore = (): Store => read();

export const getEdit = (title: string): StoredArticle | undefined => read()[title];

export function saveArticle(title: string, wikitext: string, created = false) {
  const current = read();
  const existing = current[title];
  write({
    ...current,
    [title]: {
      title,
      wikitext,
      created: existing?.created ?? created,
      editedAt: new Date().toISOString().slice(0, 10),
      ...(existing?.origin ? { origin: existing.origin } : {}),
    },
  });
}

export function revertArticle(title: string) {
  const next = { ...read() };
  delete next[title];
  write(next);
}

export function revertAll() {
  write({});
}

/** Ergebnis eines Live-Imports als Bestand übernehmen. */
export function importArticles(
  pages: {
    title: string;
    wikitext: string;
    revision: number | null;
    timestamp: string;
  }[],
  origin: { source: string; license: string },
) {
  const next = { ...read() };
  for (const page of pages) {
    next[page.title] = {
      title: page.title,
      wikitext: page.wikitext,
      created: false,
      editedAt: page.timestamp,
      origin: { ...origin, revision: page.revision },
    };
  }
  write(next);
}

/** Nur die live importierten Artikel entfernen, Selbstgeschriebenes behalten. */
export function clearImported() {
  write(
    Object.fromEntries(
      Object.entries(read()).filter(([, article]) => !article.origin),
    ),
  );
}

export const importedCount = (): number =>
  Object.values(read()).filter((article) => article.origin).length;

export const editedTitles = (): string[] => Object.keys(read());
