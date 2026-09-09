// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { isIP } from "node:net";
import { ImportValidationError, leseLizenz, type EronMediaFile } from "@chronicle/io";

/**
 * DER ABRUF — die einzige Stelle, an der dieser Server ein fremdes Wiki anspricht.
 *
 * Sie ist bewusst klein und bewusst allein: alles, was hier passiert, passiert, weil ein Mensch
 * gerade eine Adresse eingetippt und einen Knopf gedrückt hat. Kein importierter Inhalt, kein
 * Zeitplan und kein Programmstart erreicht diese Datei — die Adresse ist immer ein Parameter
 * einer Spielleitungs-Aktion, nie ein Feld aus einer Karte, einem Artikel oder einer Sicherung.
 *
 * Die Grenzen stehen als Zahlen und nicht als Absicht:
 *
 * - nur `https:`, nie `http:`, nie `file:`, nie `data:`
 * - keine Zugangsdaten in der Adresse, keine Abfrage, kein Anker
 * - keine privaten oder Rückschleifen-Ziele (der Server steht in einem Heimnetz; ein Wiki, das
 *   auf `192.168.…` zeigt, ist kein Wiki, sondern ein Weg an der Haustür vorbei)
 * - `redirect: "manual"` und höchstens drei Sprünge, jeder einzeln erneut geprüft
 * - harte Zeit- und Größengrenzen, gemessen an den Bytes und nicht an `Content-Length`
 */

export const WIKI_ABRUF_GRENZEN = Object.freeze({
  /** Die Kartenseite. Deckungsgleich mit `MAX_ERON_MAP_BYTES` des Kartenparsers. */
  karteBytes: 8 * 1024 * 1024,
  /**
   * Das Kartenbild. Die 24 MiB sind die Zusage des Bildbestands (`WIKI_ASSET_GRENZEN.bytes`) —
   * mehr zu holen als der Bestand aufbewahren kann, wäre ein Abruf mit angekündigtem Ausgang.
   */
  bildBytes: 24 * 1024 * 1024,
  /** Eine `api.php`-Auskunft ist eine Handvoll Felder, kein Datenbestand. */
  auskunftBytes: 1024 * 1024,
  zeitMs: 20_000,
  spruenge: 3,
});

const fehler = (feld: string, grund: string): never => { throw new ImportValidationError(feld, grund); };

/**
 * Ein privates Ziel. Namen werden hier NICHT aufgelöst — eine Auflösung wäre eine zweite
 * Wahrheit zwischen Prüfung und Verbindung. Geprüft wird, was in der Adresse steht.
 */
function privatesZiel(hostname: string): boolean {
  const adresse = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (adresse === "localhost" || adresse.endsWith(".localhost") || adresse === "::1" || adresse === "::") return true;
  if (isIP(adresse) === 6) return /^(?:f[cd][0-9a-f]{2}:|fe80:|::ffff:)/i.test(adresse);
  if (isIP(adresse) !== 4) return false;
  const [a, b] = adresse.split(".").map(Number);
  return a === 0 || a === 127 || a === 10 || a === 169 && b === 254
    || a === 172 && b! >= 16 && b! <= 31 || a === 192 && b === 168;
}

/** Prüft ein einzelnes Ziel — vor dem ersten Aufruf und nach jeder Weiterleitung erneut. */
export function pruefeZiel(url: URL, feld = "wiki"): URL {
  if (url.protocol !== "https:") fehler(feld, "the address must start with https://");
  if (url.username || url.password) fehler(feld, "the address must not carry credentials");
  if (!url.hostname || privatesZiel(url.hostname)) fehler(feld, "the address must name a public wiki");
  return url;
}

/**
 * Die Wiki-Adresse, wie ein Mensch sie schreibt: `eron.fandom.com/de`, mit oder ohne Schema,
 * mit oder ohne Schrägstrich am Ende. Heraus kommt ein Verzeichnis, auf das `api.php` und
 * `wiki/…` relativ aufsetzen.
 */
export function wikiBasis(eingabe: string, feld = "wiki"): URL {
  const roh = typeof eingabe === "string" ? eingabe.trim() : "";
  if (!roh || roh.length > 500) fehler(feld, "a wiki address between 1 and 500 characters is required");
  let url: URL;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(roh) ? roh : `https://${roh}`); }
  catch { return fehler(feld, "the wiki address is not a valid web address"); }
  if (url.search || url.hash) fehler(feld, "the wiki address must not carry a query or anchor");
  pruefeZiel(url, feld);
  // `/de` und `/de/` bezeichnen dasselbe Wiki; ohne Schrägstrich verschluckt die relative
  // Auflösung das letzte Stück und `api.php` landet in der falschen Sprache.
  url.pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  return url;
}

/** Ein Seitentitel, wie MediaWiki ihn kennt. Er wird nie zu einem Pfad und nie zu einer Datei. */
export function pruefeSeitentitel(eingabe: string, feld = "titel"): string {
  const titel = typeof eingabe === "string" ? eingabe.trim().replace(/_/g, " ").replace(/\s+/g, " ") : "";
  if (!titel || titel.length > 255) fehler(feld, "a page title between 1 and 255 characters is required");
  if ([...titel].some(zeichen => zeichen < " " || zeichen === String.fromCharCode(127))) fehler(feld, "the page title must not contain control characters");
  if (/[#<>[\]{}|]/.test(titel)) fehler(feld, "the page title must not contain # < > [ ] { } or |");
  return titel;
}

const mediawikiTitel = (titel: string) => encodeURIComponent(titel.replace(/ /g, "_"));

/**
 * Der Hauptweg: `?action=raw` liefert den Seiteninhalt selbst, ohne Umschlag. Genau das steht in
 * `design/fixtures/eron/map-andaria.json` — der Auspackweg über `action=query` wird nur noch für
 * Seiten- und Revisionsnummer gebraucht, also für die Herkunft, nicht für den Inhalt.
 */
export const rohseitenAdresse = (basis: URL, titel: string): URL =>
  new URL(`wiki/${mediawikiTitel(titel)}?action=raw`, basis);

export const seitenauskunftAdresse = (basis: URL, titel: string): URL =>
  new URL(`api.php?action=query&prop=revisions&rvprop=ids%7Ctimestamp&rvslots=main&meta=siteinfo&siprop=rightsinfo&format=json&formatversion=2&titles=${mediawikiTitel(titel)}`, basis);

export const dateiauskunftAdresse = (basis: URL, dateiname: string): URL =>
  new URL(`api.php?action=query&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Cextmetadata&format=json&formatversion=2&titles=${mediawikiTitel(`Datei:${dateiname}`)}`, basis);

export interface AbrufOptionen {
  readonly maxBytes: number;
  readonly invokeFetch?: typeof fetch;
  readonly feld?: string;
}

/**
 * Ein Abruf, gedeckelt in Zeit und Bytes.
 *
 * Weiterleitungen werden von Hand verfolgt (`redirect: "manual"`), weil eine automatisch
 * verfolgte Weiterleitung genau die Prüfung überspringt, für die dieses Modul da ist: ein Wiki
 * darf auf `https://cdn.…` zeigen, aber nicht auf `http://` und nicht ins Heimnetz.
 *
 * Die Größe wird an den EMPFANGENEN Bytes gemessen. `Content-Length` ist eine Behauptung des
 * Gegenübers und wird nur benutzt, um früh abzubrechen, nie um spät zu vertrauen.
 */
export async function hole(start: URL, optionen: AbrufOptionen): Promise<{ bytes: Uint8Array; antwort: Response; ziel: URL }> {
  const feld = optionen.feld ?? "wiki", invokeFetch = optionen.invokeFetch ?? fetch;
  const stop = AbortSignal.timeout(WIKI_ABRUF_GRENZEN.zeitMs);
  let ziel = pruefeZiel(new URL(start.href), feld);
  for (let sprung = 0; ; sprung += 1) {
    let antwort: Response;
    try {
      antwort = await invokeFetch(ziel.href, { method: "GET", redirect: "manual", signal: stop,
        headers: { accept: "*/*", "user-agent": "AtlasChronicles/1 (Kartenabruf auf Anforderung der Spielleitung)" } });
    } catch { return fehler(feld, "the wiki did not answer in time"); }
    if (antwort.status >= 300 && antwort.status < 400) {
      if (sprung >= WIKI_ABRUF_GRENZEN.spruenge) return fehler(feld, "the wiki redirects too often");
      const nach = antwort.headers.get("location");
      if (!nach) return fehler(feld, "the wiki redirected without a target");
      let naechste: URL;
      try { naechste = new URL(nach, ziel); } catch { return fehler(feld, "the wiki redirected to an invalid address"); }
      // Ein anderer Wirt ist erlaubt — aber nur nach derselben Prüfung wie der erste.
      ziel = pruefeZiel(naechste, feld);
      continue;
    }
    if (!antwort.ok) return fehler(feld, `the wiki answered with status ${antwort.status}`);
    const angekuendigt = Number(antwort.headers.get("content-length") ?? "");
    if (Number.isFinite(angekuendigt) && angekuendigt > optionen.maxBytes) return fehler(feld, "the answer is larger than allowed");
    const bytes = await lies(antwort, optionen.maxBytes, feld);
    return { bytes, antwort, ziel };
  }
}

async function lies(antwort: Response, maxBytes: number, feld: string): Promise<Uint8Array> {
  const koerper = antwort.body;
  if (!koerper) {
    const puffer = new Uint8Array(await antwort.arrayBuffer());
    if (puffer.byteLength > maxBytes) return fehler(feld, "the answer is larger than allowed");
    return puffer;
  }
  const leser = koerper.getReader();
  const teile: Uint8Array[] = [];
  let gesamt = 0;
  try {
    for (;;) {
      const { done, value } = await leser.read();
      if (done) break;
      const stueck = value as Uint8Array;
      gesamt += stueck.byteLength;
      if (gesamt > maxBytes) { await leser.cancel().catch(() => {}); return fehler(feld, "the answer is larger than allowed"); }
      teile.push(stueck);
    }
  } catch { return fehler(feld, "the wiki broke off the answer"); }
  const alles = new Uint8Array(gesamt);
  let offset = 0;
  for (const teil of teile) { alles.set(teil, offset); offset += teil.byteLength; }
  return alles;
}

const text = (bytes: Uint8Array) => new TextDecoder("utf-8", { fatal: false }).decode(bytes);

/** Die Kartenseite als reiner Quelltext. */
export async function holeSeitenquelle(basis: URL, titel: string, invokeFetch?: typeof fetch): Promise<string> {
  const { bytes } = await hole(rohseitenAdresse(basis, titel),
    { maxBytes: WIKI_ABRUF_GRENZEN.karteBytes, ...(invokeFetch ? { invokeFetch } : {}), feld: "karte" });
  const inhalt = text(bytes).trim();
  if (!inhalt) throw new ImportValidationError("karte", "the wiki page is empty or does not exist");
  return inhalt;
}

function antwortobjekt(bytes: Uint8Array, feld: string): Record<string, unknown> {
  let gelesen: unknown;
  try { gelesen = JSON.parse(text(bytes)); } catch { return fehler(feld, "the wiki answered with something that is not an answer"); }
  if (!gelesen || typeof gelesen !== "object" || Array.isArray(gelesen)) return fehler(feld, "the wiki answered with something that is not an answer");
  return gelesen as Record<string, unknown>;
}
function ersteSeite(wurzel: Record<string, unknown>, feld: string): Record<string, unknown> {
  const seiten = (wurzel as { query?: { pages?: unknown } }).query?.pages;
  const erste = Array.isArray(seiten) ? seiten[0] : seiten && typeof seiten === "object" ? Object.values(seiten)[0] : undefined;
  if (!erste || typeof erste !== "object") return fehler(feld, "the wiki does not know this page");
  return erste as Record<string, unknown>;
}

export interface Seitenkennung { readonly pageid?: number; readonly revid?: number; readonly bearbeitetAm?: string; readonly lizenz?: string }

/**
 * Seiten- und Revisionsnummer. Ausdrücklich weich: die Karte ist schon geholt, und eine Seite,
 * die ihre Nummern nicht herausgibt, ist kein Grund, den Import zu verwerfen — sie ist ein Grund,
 * die Herkunft ohne Nummern zu schreiben statt Nummern zu erfinden.
 */
export async function holeSeitenkennung(basis: URL, titel: string, invokeFetch?: typeof fetch): Promise<Seitenkennung> {
  try {
    const { bytes } = await hole(seitenauskunftAdresse(basis, titel),
      { maxBytes: WIKI_ABRUF_GRENZEN.auskunftBytes, ...(invokeFetch ? { invokeFetch } : {}), feld: "karte" });
    const wurzel = antwortobjekt(bytes, "karte"), seite = ersteSeite(wurzel, "karte");
    const revision = Array.isArray(seite.revisions) ? seite.revisions[0] as Record<string, unknown> | undefined : undefined;
    const zahl = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : undefined;
    const zeit = typeof revision?.timestamp === "string" ? revision.timestamp.slice(0, 40) : undefined;
    // Die Lizenz der SEITE sagt das Wiki selbst (`rightsinfo`) — dieselbe Angabe, die unten auf
    // jeder MediaWiki-Seite steht. Fehlt sie, bleibt sie leer statt geraten.
    const rechte = (wurzel as { query?: { rightsinfo?: { text?: unknown } } }).query?.rightsinfo?.text;
    return { ...(zahl(seite.pageid) ? { pageid: zahl(seite.pageid)! } : {}),
      ...(zahl(revision?.revid) ? { revid: zahl(revision?.revid)! } : {}),
      ...(zeit ? { bearbeitetAm: zeit } : {}),
      ...(klartext(rechte) ? { lizenz: klartext(rechte)! } : {}) };
  } catch { return {}; }
}

export interface Dateiauskunft {
  readonly dateiname: string;
  readonly url: string;
  readonly beschreibungsseite?: string;
  readonly behaupteterMime?: string;
  readonly urheber?: string;
  readonly hochgeladenAm?: string;
  readonly lizenzStatus: "frei" | "zitat" | "unbekannt";
  readonly lizenzQuelle?: string;
}

const klartext = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const sauber = value.replace(/<[^>]{0,200}>/g, " ").replace(/\s+/g, " ").trim();
  return sauber ? sauber.slice(0, 2000) : undefined;
};

/**
 * Was das Wiki über seine Datei sagt — und ausdrücklich nur das.
 *
 * Das Lizenzurteil fällt `leseLizenz` aus `@chronicle/io`, dasselbe, das jeder Artikelimport
 * benutzt (docs/WIKI_MEDIEN.md). Es ist absichtlich pessimistisch: ohne benannte Lizenz bleibt
 * eine Datei `unbekannt`, wird aufgenommen, sichtbar markiert und nie als frei behandelt.
 */
export async function holeDateiauskunft(basis: URL, dateiname: string, invokeFetch?: typeof fetch): Promise<Dateiauskunft> {
  const { bytes } = await hole(dateiauskunftAdresse(basis, dateiname),
    { maxBytes: WIKI_ABRUF_GRENZEN.auskunftBytes, ...(invokeFetch ? { invokeFetch } : {}), feld: "bild" });
  const seite = ersteSeite(antwortobjekt(bytes, "bild"), "bild");
  if (seite.missing === true || seite.invalid === true) throw new ImportValidationError("bild", "the wiki does not hold this map image");
  const info = Array.isArray(seite.imageinfo) ? seite.imageinfo[0] as Record<string, unknown> | undefined : undefined;
  const quelle = typeof info?.url === "string" ? info.url : "";
  if (!quelle) throw new ImportValidationError("bild", "the wiki does not name a file address for this map image");
  const extra = info?.extmetadata && typeof info.extmetadata === "object" ? info.extmetadata as Record<string, { value?: unknown }> : {};
  const feld = (name: string) => klartext(extra[name]?.value);
  // Auf die Form gebracht, die `leseLizenz` liest — ein Urteil, nicht zwei.
  const datei: EronMediaFile = { title: `Datei:${dateiname}`, categories: [], used_by_articles: [],
    licence: Object.fromEntries((["LicenseShortName", "License", "UsageTerms", "Attribution", "Copyrighted", "Permission"] as const)
      .map(name => [name, feld(name) ?? null])) };
  const urteil = leseLizenz(datei);
  return { dateiname, url: quelle,
    ...(typeof seite.title === "string" && typeof info?.descriptionurl === "string" ? { beschreibungsseite: info.descriptionurl } : {}),
    ...(typeof info?.mime === "string" ? { behaupteterMime: info.mime.slice(0, 200) } : {}),
    ...(feld("Artist") ? { urheber: feld("Artist")! } : {}),
    ...(feld("DateTimeOriginal") ? { hochgeladenAm: feld("DateTimeOriginal")!.slice(0, 64) } : {}),
    lizenzStatus: urteil.status, ...(urteil.quelle ? { lizenzQuelle: urteil.quelle } : {}) };
}

/** Die Bytes des Kartenbildes. Die Adresse stammt aus der Auskunft desselben Wikis. */
export async function holeBildbytes(quelle: string, invokeFetch?: typeof fetch): Promise<Uint8Array> {
  let url: URL;
  try { url = new URL(quelle); } catch { return fehler("bild", "the wiki named an invalid file address"); }
  const { bytes } = await hole(url, { maxBytes: WIKI_ABRUF_GRENZEN.bildBytes, ...(invokeFetch ? { invokeFetch } : {}), feld: "bild" });
  return bytes;
}
