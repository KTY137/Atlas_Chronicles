/**
 * Lokaler Schreibspeicher über dem importierten Korpus.
 *
 * Im Produkt läge das auf dem Server hinter `Sicht`; im Lab liegt es in
 * localStorage, damit Schreiben, Anlegen und Neuladen wirklich funktionieren
 * statt nur so auszusehen. Der Import bleibt unangetastet — Änderungen sind
 * eine Schicht darüber und jederzeit verwerfbar.
 */

const KEY = "chronicle.shell-lab.wiki.v1";

export interface StoredArticle {
  title: string;
  wikitext: string;
  /** Neu in Chronicle entstanden, nicht importiert. */
  created: boolean;
  editedAt: string;
}

type Store = Record<string, StoredArticle>;

let cache: Store | null = null;
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
  } catch {
    /* Kein Persistieren möglich — die Sitzung funktioniert trotzdem. */
  }
  for (const listener of listeners) listener();
}

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getStore = (): Store => read();

export const getEdit = (title: string): StoredArticle | undefined =>
  read()[title];

export function saveArticle(title: string, wikitext: string, created = false) {
  const current = read();
  write({
    ...current,
    [title]: {
      title,
      wikitext,
      created: current[title]?.created ?? created,
      editedAt: new Date().toISOString().slice(0, 10),
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

export const editedTitles = (): string[] => Object.keys(read());
