// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Nachricht als Schlüssel. Der deutsche Quelltext bleibt im Code und ist zugleich der
// Katalogschlüssel; `t` schlägt die englische Fassung nach und fällt bei einem fehlenden
// Eintrag auf den deutschen Text zurück. Damit ist die Oberfläche zu jedem Zeitpunkt
// vollständig — eine unübersetzte Stelle bleibt deutsch statt leer.
//
// Diese Datei importiert bewusst kein React: die Prüfstände in `packages/client/test`
// laden Komponenten ohne React-Kontext und tauschen sie über `I18nStub` aus. Den
// React-Anschluss (`useSyncExternalStore` auf `subscribe`) macht der AppearanceProvider.

export type Sprache = "de" | "en";
export type Platzhalter = Record<string, string | number>;
export interface PluralFormen { readonly eins: string; readonly viele: string }
export interface EnglischerKatalog {
  readonly texte: Readonly<Record<string, string>>;
  readonly plural: Readonly<Record<string, PluralFormen>>;
}
type EnglischeQuelle = () => Promise<EnglischerKatalog>;

/** Reservierte Katalogschlüssel: keine Übersetzung, sondern Angaben für das Sprachgate. */
const RESERVIERT = (schluessel: string) => schluessel.startsWith("__");

const leererKatalog: EnglischerKatalog = { texte: {}, plural: {} };

let sprache: Sprache = "de";
// Steigt bei jeder Aenderung, die die Oberflaeche sehen muss - auch bei der spaeten
// Ankunft des Katalogs. Die Sprache allein reicht als beobachteter Wert nicht: sie
// steht schon vor dem ersten Zeichnen fest, der Katalog kommt erst danach.
let stand = 0;
let katalog: EnglischerKatalog = leererKatalog;
let ladung: Promise<EnglischerKatalog> | null = null;
let quelle: EnglischeQuelle | null = null;
const hoerer = new Set<() => void>();

/** Ein JSON je Übersetzungspaket, damit die acht Pakete konfliktfrei mergen. Das Verzeichnis
 * steht ausdrücklich hier statt als `import.meta.glob`: Der Glob ist eine Vite-Eigenheit, und
 * die Browserwirte unter `e2e/helpers` bündeln denselben Client mit esbuild, das ihn
 * unverändert stehen lässt — der Bootstrap wirft dann `glob is not a function` und die
 * Anwendung mountet gar nicht. `gate:sprache` prüft, dass jede Paketdatei hier steht. */
const textDateien: (() => Promise<Record<string, unknown>>)[] = [
  () => import("./i18n/en/P1.json"), () => import("./i18n/en/P2.json"),
  () => import("./i18n/en/P3.json"), () => import("./i18n/en/P4.json"),
  () => import("./i18n/en/P5.json"), () => import("./i18n/en/P6.json"),
  () => import("./i18n/en/P7.json"), () => import("./i18n/en/P8.json"),
  () => import("./i18n/en/P9.json"), () => import("./i18n/en/P10.json"),
  () => import("./i18n/en/P11.json"), () => import("./i18n/en/P12.json"),
  () => import("./i18n/en/P13.json"), () => import("./i18n/en/P14.json"),
];
const pluralDateien: (() => Promise<Record<string, unknown>>)[] = [() => import("./i18n/en.plural.json")];

function inhalt(modul: Record<string, unknown>): Record<string, unknown> {
  const wert = "default" in modul ? modul.default : modul;
  return wert !== null && typeof wert === "object" && !Array.isArray(wert) ? wert as Record<string, unknown> : {};
}

async function ausDateien(): Promise<EnglischerKatalog> {
  const texte: Record<string, string> = {}, plural: Record<string, PluralFormen> = {};
  for (const lade of textDateien) {
    for (const [schluessel, wert] of Object.entries(inhalt(await lade()))) {
      if (!RESERVIERT(schluessel) && typeof wert === "string") texte[schluessel] = wert;
    }
  }
  for (const lade of pluralDateien) {
    for (const [schluessel, wert] of Object.entries(inhalt(await lade()))) {
      if (RESERVIERT(schluessel) || wert === null || typeof wert !== "object") continue;
      const formen = wert as { eins?: unknown; viele?: unknown };
      if (typeof formen.eins === "string" && typeof formen.viele === "string") plural[schluessel] = { eins: formen.eins, viele: formen.viele };
    }
  }
  return { texte, plural };
}

function fuelle(text: string, params?: Platzhalter): string {
  if (!params) return text;
  return text.replace(/\{([A-Za-z0-9_]+)\}/g, (ganz, name: string) => Object.hasOwn(params, name) ? String(params[name]) : ganz);
}

/** Der deutsche Quelltext ist der Schlüssel; ohne Eintrag bleibt er die Antwort. */
export function t(text: string, params?: Platzhalter): string {
  const gewaehlt = sprache === "en" ? katalog.texte[text] ?? text : text;
  return fuelle(gewaehlt, params);
}

/** `n` steht in beiden Formen als `{n}` bereit, in der Schreibweise der gewählten Sprache. */
export function plural(n: number, eins: string, viele: string, params?: Platzhalter): string {
  const eintrag = sprache === "en" ? katalog.plural[eins] : undefined;
  const form = n === 1 ? eintrag?.eins ?? eins : eintrag?.viele ?? viele;
  return fuelle(form, { n: n.toLocaleString(locale()), ...params });
}

export function aktuelleSprache(): Sprache { return sprache; }
/** Der beobachtete Wert fuer `useSyncExternalStore`. Siehe `stand`. */
export function spracheStand(): number { return stand; }
export function locale(): "de-DE" | "en-GB" { return sprache === "en" ? "en-GB" : "de-DE"; }

/** Für `useSyncExternalStore`; die Rückgabe meldet den Hörer wieder ab. */
export function subscribe(hoerer_: () => void): () => void {
  hoerer.add(hoerer_);
  return () => { hoerer.delete(hoerer_); };
}

/** Die Startsprache, synchron vor dem ersten Rendern. Der Katalog kommt danach nach; weil
 * die Sprache sich dabei nicht mehr ändert, baut React den Baum beim Start nicht neu auf. */
export function initialisiereSprache(gewaehlt: Sprache): void { sprache = gewaehlt; }

/** Lädt den englischen Katalog beim ersten Mal und danach nie wieder. Schlägt das Laden
 * fehl, lehnt der Aufruf ab — die Sprache bleibt dann, was sie war — und der nächste
 * Versuch darf es erneut probieren. */
export async function setzeSprache(gewaehlt: Sprache): Promise<void> {
  const vorher = katalog;
  if (gewaehlt === "en") {
    ladung ??= (quelle ?? ausDateien)();
    try { katalog = await ladung; }
    catch (fehler) { ladung = null; throw fehler; }
  }
  // Auch die späte Ankunft des Katalogs ist eine Änderung, die die Oberfläche sehen muss.
  if (gewaehlt === sprache && katalog === vorher) return;
  sprache = gewaehlt; stand += 1;
  for (const melde of [...hoerer]) melde();
}

/** Nur für Tests: setzt Sprache, Katalog und Ladezustand zurück; `null` stellt die Dateien wieder her. */
export function setzeEnglischeQuelleFuerTests(ersatz: EnglischeQuelle | null): void {
  quelle = ersatz; ladung = null; katalog = leererKatalog; sprache = "de"; stand += 1;
}

/** Ersatz für die Prüfstände in `packages/client/test`: immer Deutsch, aber mit Platzhaltern. */
export const I18nStub = {
  t: (text: string, params?: Platzhalter) => fuelle(text, params),
  plural: (n: number, eins: string, viele: string, params?: Platzhalter) => fuelle(n === 1 ? eins : viele, { n: n.toLocaleString("de-DE"), ...params }),
  aktuelleSprache: () => "de" as const,
  locale: () => "de-DE" as const,
  setzeSprache: async (_gewaehlt: Sprache) => {},
  subscribe: (_hoerer: () => void) => () => {},
  spracheStand: () => 0,
};
