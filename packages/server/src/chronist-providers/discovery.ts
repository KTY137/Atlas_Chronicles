// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Die Suche nach einem lokal laufenden Modelldienst.
 *
 * Bis zum 10.09.2026 fragte der Host beim Start genau eine Adresse — `http://127.0.0.1:11434` —
 * mit einer Sekunde Geduld, und verschluckte jeden Fehlschlag (`.catch(() => [])`). Wer Ollama
 * auf einem anderen Port betreibt, es über `OLLAMA_HOST` woanders hingelegt hat, es erst nach
 * dem Host startet oder dessen erster Aufruf länger als eine Sekunde braucht, bekam schlicht
 * „kein Anbieter" — ohne jede Angabe, warum.
 *
 * Dieses Modul ändert drei Dinge:
 *
 * 1. **Mehrere Adressen.** `OLLAMA_HOST` zuerst, dann die drei üblichen Schreibweisen von
 *    „dieser Rechner". Auf Windows ist das kein Luxus: je nach Auflösung ist `localhost`
 *    entweder `127.0.0.1` oder `::1`, und ein Dienst, der nur auf einer davon lauscht, ist
 *    über die andere unerreichbar.
 * 2. **Mehr Geduld.** Voreinstellung drei Sekunden statt einer. Der erste `/api/tags`-Aufruf
 *    nach dem Start eines Modelldienstes ist regelmäßig der langsamste.
 * 3. **Ein Grund je Adresse.** Kein stiller Fehlschlag mehr: jede geprüfte Adresse bekommt
 *    einen Code, den die Oberfläche in einen Satz übersetzt.
 *
 * Gelesen werden ausschließlich die Namen installierter Modelle. Es wird nichts geladen,
 * nichts gestartet und kein Modell aufgerufen.
 */
import type { ChronistLocalScanEntry, ChronistLocalScanReport } from "@chronicle/protocol";

/** Voreinstellung. Drei Sekunden sind für einen Dienst auf demselben Rechner reichlich und
 * für einen Menschen, der auf einen Knopf gedrückt hat, noch erträglich. */
export const CHRONIST_SCAN_TIMEOUT_MS = 3000;
const MAX_BYTES = 256 * 1024, MAX_MODELS = 32, MAX_KANDIDATEN = 6;
/** Die üblichen Schreibweisen von „dieser Rechner", in der Reihenfolge ihrer Trefferwahrscheinlichkeit. */
export const CHRONIST_DEFAULT_LOCAL_URLS = Object.freeze(["http://127.0.0.1:11434", "http://[::1]:11434"]);

/**
 * `OLLAMA_HOST` in eine Adresse übersetzen.
 *
 * Die Umgebungsvariable kennt drei Schreibweisen, und alle drei kommen in freier Wildbahn vor:
 * `11434`, `127.0.0.1:11434` und `http://127.0.0.1:11434`. `0.0.0.0` heißt „lausche auf allen
 * Schnittstellen" und ist als Ziel unbrauchbar — dorthin verbindet man sich nicht, man ersetzt
 * es durch die Rückschleife.
 */
export function chronistHostUrl(wert: string | undefined): string | null {
  const roh = (wert ?? "").trim();
  if (!roh || roh.length > 2048 || /[\u0000-\u001f\u007f\s]/.test(roh)) return null;
  // Ein fremdes Schema oder ein Pfad ist keine Dienstadresse. Ohne diese beiden Zeilen wurde aus
  // `file:///etc/passwd` durch blosses Voranstellen von `http://` die Adresse `http://file:11434`.
  const hatSchema = /^[a-z][a-z0-9+.-]*:\/\//i.test(roh);
  if (hatSchema ? !/^https?:\/\//i.test(roh) : roh.includes("/")) return null;
  const mitSchema = hatSchema ? roh : /^\d+$/.test(roh) ? `http://127.0.0.1:${roh}` : `http://${roh}`;
  let url: URL;
  try { url = new URL(mitSchema); } catch { return null; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.hostname === "0.0.0.0" || url.hostname === "[::]" || url.hostname === "::") url.hostname = "127.0.0.1";
  // `localhost` wird hier aufgelöst, weil der Versandpfad es ebenso auflöst: eine Anfrage an
  // „localhost" IST eine Anfrage an 127.0.0.1. Als eigener Kandidat wäre sie dieselbe Prüfung
  // ein zweites Mal — und `[::1]` ist die Adresse, die wirklich eine andere ist.
  if (url.hostname === "localhost") url.hostname = "127.0.0.1";
  if (!url.port) url.port = "11434";
  url.pathname = ""; url.search = ""; url.hash = "";
  return url.origin;
}

/** Eine Liste in Dienstadressen übersetzen, ohne Unbrauchbares und ohne Doppel. */
function normalisiert(werte: readonly (string | undefined)[]): readonly string[] {
  const kandidaten: string[] = [];
  for (const wert of werte) {
    const url = chronistHostUrl(wert);
    if (url && !kandidaten.includes(url)) kandidaten.push(url);
  }
  return Object.freeze(kandidaten.slice(0, MAX_KANDIDATEN));
}

/** Welche Adressen geprüft werden — die aus der Umgebung zuerst, dann die üblichen, ohne Doppel. */
export function chronistScanCandidates(environment: Readonly<Record<string, string | undefined>> = {},
  extra: readonly string[] = []): readonly string[] {
  const kandidaten: string[] = [];
  // Reihenfolge: was der Betreiber ausdrücklich hingeschrieben hat, dann die Umgebung, dann die
  // üblichen. Geprüft werden alle — die Reihenfolge entscheidet nur, wer zuerst drankommt.
  kandidaten.push(...normalisiert([...extra, environment["OLLAMA_HOST"],
    environment["CHRONICLE_CHRONIST_OLLAMA_URL"], ...CHRONIST_DEFAULT_LOCAL_URLS]));
  return Object.freeze(kandidaten.slice(0, MAX_KANDIDATEN));
}

/** Die Modellliste desselben Dienstes, genau wie der Versandpfad sie adressiert. */
function tagsUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  if (url.hostname === "localhost") url.hostname = "127.0.0.1";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/api/tags`;
  return url.href;
}

function modelNames(value: unknown): readonly string[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { models?: unknown }).models)) return [];
  const names = (value as { models: unknown[] }).models.flatMap(model => {
    const name = model && typeof model === "object" ? (model as { name?: unknown }).name : undefined;
    return typeof name === "string" && name.trim() && name.length <= 256 && !/[\u0000-\u001f\u007f]/.test(name) ? [name] : [];
  });
  return [...new Set(names)].sort().slice(0, MAX_MODELS);
}

/**
 * Eine Adresse prüfen. Wirft nie — der Grund IST das Ergebnis.
 *
 * `localhost` bleibt in der gemeldeten Adresse stehen, damit der Nutzer wiedererkennt, was er
 * eingestellt hat; angefragt wird sie normalisiert, exakt wie beim späteren Versand.
 */
export async function probeChronistLocal(invokeFetch: typeof fetch, baseUrl: string,
  timeoutMs = CHRONIST_SCAN_TIMEOUT_MS): Promise<ChronistLocalScanEntry> {
  const begonnen = Date.now();
  const fertig = (code: ChronistLocalScanEntry["code"], models: readonly string[] = []): ChronistLocalScanEntry =>
    Object.freeze({ baseUrl, code, models: Object.freeze([...models]), durationMs: Date.now() - begonnen });
  let response: Response;
  try {
    response = await invokeFetch(tagsUrl(baseUrl), { redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
  } catch (fehler) {
    // `AbortSignal.timeout` meldet einen TimeoutError; alles andere ist „da lauscht niemand".
    const name = fehler && typeof fehler === "object" && "name" in fehler ? String((fehler as { name: unknown }).name) : "";
    return fertig(name === "TimeoutError" ? "zeitueberschreitung" : "keine-antwort");
  }
  if (!response.ok || !response.body) { await response.body?.cancel().catch(() => undefined); return fertig("unlesbar"); }
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > MAX_BYTES) return fertig("unlesbar");
      chunks.push(next.value);
    }
    const names = modelNames(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))));
    // Ein antwortender Dienst ohne installiertes Modell ist etwas anderes als kein Dienst:
    // dort hilft `ollama pull`, hier hilft nur, den Dienst überhaupt zu starten.
    return names.length ? fertig("gefunden", names) : fertig("leer");
  } catch { return fertig("unlesbar"); }
  finally { await reader.cancel().catch(() => undefined); }
}

/**
 * Alle Adressen prüfen und den ersten Treffer als Ergebnis führen.
 *
 * Nacheinander, nicht gleichzeitig: die Liste ist kurz, die übliche Adresse steht vorn, und ein
 * Treffer beendet die Suche sofort. So wartet niemand drei Sekunden auf eine Adresse, die
 * ohnehin nicht gemeint war. Geprüfte Adressen bleiben im Bericht stehen — auch die, die nach
 * dem Treffer nicht mehr an die Reihe kamen, fehlen dort dann eben.
 */
export async function scanChronistLocal(options: {
  readonly fetch?: typeof fetch;
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly baseUrls?: readonly string[];
  readonly timeoutMs?: number;
  /**
   * Nur `baseUrls` prüfen, ohne Umgebung und ohne die üblichen Adressen.
   *
   * Das ist die Betriebsart für eine Betreiberdatei: sie sagt, wo gesucht werden soll, und
   * hinter ihrem Rücken werden keine weiteren Adressen angefasst. Der Suchknopf in der
   * Oberfläche schaltet das ab — dort hat ein Mensch ausdrücklich um eine breite Suche gebeten.
   */
  readonly exclusive?: boolean;
} = {}): Promise<ChronistLocalScanReport> {
  // Die Adressen aus der Betreiberdatei ERGÄNZEN sonst die Umgebung. Vorher ersetzten sie sie —
  // ein gesetztes OLLAMA_HOST wurde dann nie geprüft, sobald überhaupt eine Datei existierte.
  const kandidaten = options.exclusive
    ? normalisiert(options.baseUrls ?? [])
    : chronistScanCandidates(options.environment ?? {}, options.baseUrls ?? []);
  const invokeFetch = options.fetch ?? fetch, geprueft: ChronistLocalScanEntry[] = [];
  for (const baseUrl of kandidaten) {
    const eintrag = await probeChronistLocal(invokeFetch, baseUrl, options.timeoutMs ?? CHRONIST_SCAN_TIMEOUT_MS);
    geprueft.push(eintrag);
    if (eintrag.code === "gefunden") {
      return Object.freeze({ scannedAt: Date.now(), entries: Object.freeze(geprueft), found: eintrag });
    }
  }
  return Object.freeze({ scannedAt: Date.now(), entries: Object.freeze(geprueft), found: null });
}
