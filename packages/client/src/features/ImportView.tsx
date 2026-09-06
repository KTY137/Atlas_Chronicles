import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Download, FileJson, Globe, Search, Upload } from "lucide-react";
import { Button, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, errorText } from "../api";
import { useTask } from "../hooks";

interface Report { eintraege: number; aliase: number; passagen: number; passagenNachArt: Record<string, number>; blaueKanten: number; roteKanten: number; textErhaltung: number; verluste: { art: string; bezeichnung: string; detail?: string }[] }
interface Preview { artifactId: string; report: Report; attributionComplete: boolean; entries: { id: string; title: string; existing: boolean }[]; notice: string }
interface Artifact { source: { result: { entries: { id: string; titel: string }[]; report: Report; attributionComplete: boolean; source: { articles: { pageid: number; title: string }[] } }; versions: Record<string, number> }; report: Report }

interface WikiProbe { endpoint: string; siteName: string; language: string; articlesCount: number; license: { text: string; url: string } | null }
interface WikiFetchProgress { fetched: number; total: number; batch: number }
interface LiveArticle { title: string; pageid: number; ns: number; revid: number; wikitext: string }
interface LiveTemplate { title: string; source: string }

/**
 * Live-Wiki-Import direkt aus dem Browser, ohne Server-Umweg: MediaWiki-APIs beantworten
 * anonyme Anfragen mit `origin=*` selbst mit CORS-Freigabe. Portiert aus dem Laborcode
 * design/shell-lab/src/importer.ts (dort nicht produktiv, hier eigenständig nachgebaut) —
 * mit zwei Korrekturen gegenüber dem Original: `pageid`/`ns` werden mitgenommen (die
 * Passagen-Identität in packages/io/src/eron.ts braucht pageid) und Weiterleitungen werden
 * NICHT mehr herausgefiltert (importEron erkennt „#WEITERLEITUNG" selbst und baut daraus
 * Aliase; filtert man sie hier weg, verschwinden sie ersatzlos statt als Alias zu landen).
 */
function wikiEndpointCandidates(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  let url: URL;
  try { url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`); } catch { return []; }
  if (url.pathname.endsWith("/api.php")) return [url.origin + url.pathname];
  const path = url.pathname.replace(/\/(wiki|index\.php)\/.*$/i, "").replace(/\/+$/, "");
  return [...new Set([`${url.origin}${path}/api.php`, `${url.origin}${path}/w/api.php`, `${url.origin}/w/api.php`, `${url.origin}/api.php`])];
}

/** Basisadresse ohne Artikelpfad, Login, Suchparameter oder Anker — das ist die Herkunftsangabe jeder importierten Passage, nicht die Adresse eines einzelnen Artikels. */
function wikiBaseUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let url: URL;
  try { url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
  const path = url.pathname.replace(/\/(wiki|index\.php)\/.*$/i, "").replace(/\/+$/, "");
  return `${url.origin}${path}/`;
}

async function wikiApiGet(endpoint: string, params: Record<string, string>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const query = new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params });
  const response = await fetch(`${endpoint}?${query}`, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Das Wiki antwortete mit Status ${response.status}. Prüfe die Adresse, oder ob das Wiki öffentlich lesbar ist.`);
  return await response.json() as Record<string, unknown>;
}

async function probeWiki(input: string, signal?: AbortSignal): Promise<WikiProbe> {
  const candidates = wikiEndpointCandidates(input);
  if (!candidates.length) throw new Error("Das ist keine gültige Wiki-Adresse. Beispiel: https://mein-wiki.fandom.com/de/");
  let sawNetworkError = false;
  for (const endpoint of candidates) {
    try {
      const data = await wikiApiGet(endpoint, { action: "query", meta: "siteinfo", siprop: "general|statistics|rightsinfo" }, signal) as
        { query?: { general?: { sitename?: string; lang?: string }; statistics?: { articles?: number }; rightsinfo?: { text?: string; url?: string } } };
      const general = data.query?.general;
      if (!general?.sitename) continue;
      return { endpoint, siteName: general.sitename, language: general.lang ?? "", articlesCount: data.query?.statistics?.articles ?? 0,
        license: data.query?.rightsinfo?.text ? { text: data.query.rightsinfo.text, url: data.query.rightsinfo.url ?? "" } : null };
    } catch (error) {
      if (signal?.aborted) throw new Error("Prüfung abgebrochen.");
      if (error instanceof TypeError) sawNetworkError = true;
    }
  }
  throw new Error(sawNetworkError
    ? "Unter dieser Adresse antwortet keine MediaWiki-API. Möglich: Das Wiki blockiert Anfragen aus dem Browser, oder ist nicht öffentlich lesbar. Nutze in dem Fall den Datei-Upload weiter unten."
    : "Unter dieser Adresse antwortet keine MediaWiki-API. Prüfe die Adresse, oder nutze den Datei-Upload weiter unten.");
}

async function fetchWikiArticles(probe: WikiProbe, onProgress: (p: WikiFetchProgress) => void, signal?: AbortSignal): Promise<LiveArticle[]> {
  const rows: LiveArticle[] = []; let cont: Record<string, string> | null = null, batch = 0;
  const cancelled = () => new Error(`Laden abgebrochen. ${rows.length} Artikel waren bereits geladen.`);
  try {
    do {
      const data = await wikiApiGet(probe.endpoint, { action: "query", generator: "allpages", gaplimit: "50", gapnamespace: "0",
        // "all" statt "nonredirects": eine Weiterleitung trägt "#WEITERLEITUNG [[Ziel]]" als eigenen
        // Wikitext, den importEron selbst erkennt und in einen Alias verwandelt. Filtert man sie
        // hier heraus, verliert der Import diese Ziel-Zuordnung ersatzlos.
        gapfilterredir: "all", prop: "revisions", rvprop: "content|ids", rvslots: "main", ...(cont ?? {}) }, signal) as
        { continue?: Record<string, string>; query?: { pages?: { pageid: number; ns: number; title: string; revisions?: { revid?: number; slots?: { main?: { content?: string } } }[] }[] } };
      batch += 1;
      for (const page of data.query?.pages ?? []) {
        const content = page.revisions?.[0]?.slots?.main?.content;
        if (typeof content !== "string") continue;
        rows.push({ title: page.title, pageid: page.pageid, ns: page.ns, revid: page.revisions?.[0]?.revid ?? 0, wikitext: content });
      }
      onProgress({ fetched: rows.length, total: probe.articlesCount, batch });
      cont = data.continue ?? null;
    } while (cont && !signal?.aborted);
  } catch (error) { throw signal?.aborted ? cancelled() : error; }
  if (signal?.aborted) throw cancelled();
  if (!rows.length) throw new Error("Das Wiki antwortet, liefert aber keine Artikel im Hauptnamensraum. Ist das Wiki leer, oder falsch adressiert?");
  return rows;
}

async function fetchWikiTemplates(probe: WikiProbe, onProgress: (p: WikiFetchProgress) => void, signal?: AbortSignal): Promise<LiveTemplate[]> {
  const rows: LiveTemplate[] = []; let cont: Record<string, string> | null = null, batch = 0;
  const cancelled = () => new Error(`Laden abgebrochen. ${rows.length} Vorlagen waren bereits geladen.`);
  try {
    do {
      const data = await wikiApiGet(probe.endpoint, { action: "query", generator: "allpages", gaplimit: "50", gapnamespace: "10",
        gapfilterredir: "nonredirects", prop: "revisions", rvprop: "content", rvslots: "main", ...(cont ?? {}) }, signal) as
        { continue?: Record<string, string>; query?: { pages?: { title: string; revisions?: { slots?: { main?: { content?: string } } }[] }[] } };
      batch += 1;
      for (const page of data.query?.pages ?? []) {
        const content = page.revisions?.[0]?.slots?.main?.content;
        if (typeof content === "string") rows.push({ title: page.title, source: content });
      }
      onProgress({ fetched: rows.length, total: 0, batch });
      cont = data.continue ?? null;
    } while (cont && !signal?.aborted);
  } catch (error) { throw signal?.aborted ? cancelled() : error; }
  if (signal?.aborted) throw cancelled();
  return rows; // Ein Wiki ganz ohne Vorlagen ist gültig — dann bleibt die Liste leer.
}

/**
 * Übersetzt die technischen "pfad: grund"-Meldungen des Servers (packages/io/src/validation.ts,
 * eron.ts) in verständliches Deutsch mit einer konkreten nächsten Handlung. Unbekannte Meldungen
 * (z. B. die bereits deutschen Texte aus app.ts wie "Konflikt: …") bleiben unverändert — nichts
 * wird verschluckt, nur bekannte Fälle werden lesbar gemacht.
 */
const KNOWN_REASONS: Record<string, string> = {
  "object required": "muss ein JSON-Objekt sein",
  "plain JSON object required": "muss ein einfaches JSON-Objekt sein (kein Array, keine Klasse)",
  "bounded string required": "fehlt, ist leer oder zu lang",
  "boolean required": "muss ja/nein (true/false) sein",
  "maximum JSON depth exceeded": "ist zu tief verschachtelt",
  "unsafe object key": "enthält einen nicht erlaubten Schlüsselnamen",
  "absolute HTTP(S) URL required": "muss eine vollständige http(s)-Adresse sein",
  "plain HTTP(S) source URL required": "darf keine Anmeldedaten, Suchparameter oder Anker (#…) enthalten",
  "duplicate page identity/title": "kommt doppelt vor (gleiche Seiten-ID oder gleicher Titel wie ein anderer Artikel)",
  "duplicate template title": "kommt doppelt vor (gleicher Titel wie eine andere Vorlage)",
  "maximum source size is 20 MB": "sind zusammen größer als 20 MB",
  "UTC ISO timestamp required": "hat ein ungültiges Zeitformat",
  "complete revision history must be explicitly confirmed": "muss ausdrücklich als vollständig bestätigt werden",
  "MediaWiki SHA1 required": "enthält keine gültige Revisions-Prüfsumme",
  "author history cannot be empty": "darf nicht leer sein",
  "maximum author-history JSON size is 2 MiB": "sind größer als 2 MiB",
};
function pathSubject(path: string): string {
  const article = /^articles\[(\d+)\]\.?(.*)$/.exec(path);
  if (article) return `Artikel Nr. ${Number(article[1]) + 1} in der Artikeldatei${article[2] ? ` (Feld „${article[2]}")` : ""}`;
  const template = /^templates\[(\d+)\]\.?(.*)$/.exec(path);
  if (template) return `Vorlage Nr. ${Number(template[1]) + 1} in der Vorlagendatei${template[2] ? ` (Feld „${template[2]}")` : ""}`;
  if (path === "articles") return "Die Artikeldatei";
  if (path === "templates") return "Die Vorlagendatei";
  if (path === "wikiUrl") return "Die Wiki-Adresse";
  if (path === "license") return "Die Lizenzangabe";
  if (path === "source") return "Die hochgeladenen Dateien";
  if (path.startsWith("attribution")) return "Die Autorennachweise";
  return `„${path}"`;
}
function friendlyImportError(raw: string): string {
  const cut = raw.indexOf(": ");
  if (cut < 0) return raw;
  const path = raw.slice(0, cut), reason = raw.slice(cut + 2);
  if (!/^[a-zA-Z][\w.[\]]*$/.test(path)) return raw;
  const plain = KNOWN_REASONS[reason]
    ?? (/^integer >= \d+ required$/.test(reason) ? "fehlt oder ist keine gültige Zahl" : undefined)
    ?? (/^array of at most \d+ items required$/.test(reason) ? "ist keine JSON-Liste, oder hat zu viele Einträge" : undefined)
    ?? (/^expected /.test(reason) ? "hat einen nicht erlaubten Wert" : undefined);
  if (!plain) return raw;
  return `${pathSubject(path)}: ${plain}. Prüfe die Datei und lade sie erneut hoch, oder exportiere sie erneut aus dem Wiki.`;
}
const formatPercent = (value: number) => `${(value * 100).toFixed(2).replace(".", ",")} %`;

/**
 * Für die Verlustarten "nicht-umgewandelt" und "kurzer-absatz" ist `bezeichnung` serverseitig
 * (packages/io/src/wikitext.ts) nur die numerische Seiten-ID des Artikels, kein Titel — an der
 * Stelle in der Umwandlung ist der Titel nicht mehr bekannt. Der Client sieht die Titel aber kurz
 * vor dem Versand (Datei-Upload, Live-Ladung) bzw. im wiederhergestellten Artefakt und hält sie in
 * `pageTitles` fest, um sie der Seiten-ID hier wieder zuzuordnen. Ohne Treffer bleibt es ehrlich
 * bei „Seite N" — es wird kein Artikelbezug erfunden, der nicht belegt ist.
 */
function lossSubject(bezeichnung: string, pageTitles: Record<number, string>): string {
  if (!/^\d+$/.test(bezeichnung)) return bezeichnung;
  const title = pageTitles[Number(bezeichnung)];
  return title ? `${title} (Seite ${bezeichnung})` : `Seite ${bezeichnung}`;
}
function groupLosses(verluste: Report["verluste"]): [string, Report["verluste"]][] {
  const groups = new Map<string, Report["verluste"]>();
  for (const loss of verluste) { const list = groups.get(loss.art) ?? []; list.push(loss); groups.set(loss.art, list); }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
}

export function ImportView({ campaignId, onClose, onImported }: { campaignId: string; onClose: () => void; onImported: () => void }) {
  const task = useTask(), [mode, setMode] = useState<"live" | "upload">("live");
  const [articles, setArticles] = useState<File | null>(null), [templates, setTemplates] = useState<File | null>(null);
  const [attributionFile, setAttributionFile] = useState<File | null>(null), [attributionConfirmed, setAttributionConfirmed] = useState(false), [license, setLicense] = useState("CC-BY-SA-3.0");
  const [wikiUrl, setWikiUrl] = useState(""), [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set()), [applied, setApplied] = useState<number | null>(null), [resuming, setResuming] = useState(false), [resumeError, setResumeError] = useState("");
  const [probe, setProbe] = useState<WikiProbe | null>(null), [phase, setPhase] = useState(""), [cancelable, setCancelable] = useState(false);
  const [pageTitles, setPageTitles] = useState<Record<number, string>>({});
  const liveAbort = useRef<AbortController | null>(null), successRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("import"); if (!id) return;
    const controller = new AbortController(); setResuming(true);
    api<Artifact>(apiPath(campaignId, `/imports/${encodeURIComponent(id)}`), { signal: controller.signal }).then((artifact) => {
      if (controller.signal.aborted) return;
      const result = artifact.source.result;
      setPageTitles(Object.fromEntries(result.source.articles.map((row) => [row.pageid, row.title])));
      setPreview({ artifactId: id, report: artifact.report, attributionComplete: result.attributionComplete,
        entries: result.entries.map((entry) => ({ id: entry.id, title: entry.titel, existing: artifact.source.versions[entry.id] !== undefined })),
        notice: "Dies ist die gespeicherte Importvorschau. Wähle die Artikel aus, deren Inhalt du übernehmen möchtest." });
    }).catch((error) => { if (!controller.signal.aborted) setResumeError(errorText(error)); }).finally(() => { if (!controller.signal.aborted) setResuming(false); });
    return () => controller.abort();
  }, [campaignId]);

  // Die Erfolgsmeldung steht am Kopf des Ergebnisbereichs; bei einer langen Artikelliste (73+
  // Einträge zum Ankreuzen) ist der Bildschirm beim Klick auf "Auswahl übernehmen" oft weit nach
  // unten gescrollt. Ohne diesen Sprung sieht die Ansicht nach dem echten Schreiben von Artikeln
  // und Passagen unverändert aus — genau das führte zur Annahme, der Import täte gar nichts.
  useEffect(() => { if (applied !== null) successRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [applied]);

  const changeWikiUrl = (value: string) => { setWikiUrl(value); setProbe(null); };
  const normalizeWikiUrl = () => { const base = wikiBaseUrl(wikiUrl); if (base && base !== wikiUrl) setWikiUrl(base); };

  const sendToServer = async (articleJson: unknown[], templateJson: unknown[], effectiveWikiUrl: string) => {
    let attributionByPageId: unknown;
    if (attributionFile) {
      if (!attributionConfirmed) throw new Error("Bestätige die vollständige Autorenhistorie der mitgelieferten Nachweise.");
      if (attributionFile.size > 2 * 1024 * 1024) throw new Error("Die Autorennachweise dürfen höchstens 2 MiB groß sein.");
      try { attributionByPageId = JSON.parse(await attributionFile.text()); } catch { throw new Error("Die Autorennachweise enthalten kein gültiges JSON."); }
      if (!attributionByPageId || typeof attributionByPageId !== "object" || Array.isArray(attributionByPageId)) throw new Error("Die Nachweisdatei muss Seitenkennungen auf Autorenhistorien abbilden.");
    }
    setPhase("Wird an den Server gesendet und ausgewertet – bei größeren Wikis kann das etwas dauern …");
    const result = await api<Preview>(apiPath(campaignId, "/imports/eron"), { method: "POST",
      body: { articles: articleJson, templates: templateJson, wikiUrl: effectiveWikiUrl, license, ...(attributionByPageId ? { attributionByPageId } : {}) } });
    setPreview(result); setSelected(new Set()); setApplied(null); setPhase("");
    const url = new URL(location.href); url.searchParams.set("import", result.artifactId); window.history.replaceState(null, "", url);
  };

  const makePreview = () => task.run(async () => {
    if (!articles || !templates) throw new Error("Wähle beide Dateien aus: die Artikeldatei (articles.json) und die Vorlagendatei (templates.json).");
    if (articles.size + templates.size > 20_000_000) throw new Error("Artikel- und Vorlagendatei sind zusammen größer als 20 MB. Teile den Export auf (z. B. nach Kategorie) und importiere ihn in mehreren Durchgängen.");
    const base = wikiBaseUrl(wikiUrl);
    if (!base) throw new Error("Die Adresse des Quell-Wikis fehlt oder ist ungültig. Beispiel: https://mein-wiki.fandom.com/de/");
    setWikiUrl(base);
    setPhase("Dateien werden gelesen …");
    const [a, t] = await Promise.all([articles.text(), templates.text()]);
    let articleJson: unknown, templateJson: unknown;
    try { articleJson = JSON.parse(a); } catch { throw new Error(`„${articles.name}" enthält kein gültiges JSON. Prüfe, ob wirklich der articles.json-Export aus dem Wiki hochgeladen wurde, und lade ihn im Zweifel erneut herunter.`); }
    try { templateJson = JSON.parse(t); } catch { throw new Error(`„${templates.name}" enthält kein gültiges JSON. Prüfe, ob wirklich der templates.json-Export aus dem Wiki hochgeladen wurde, und lade ihn im Zweifel erneut herunter.`); }
    if (!Array.isArray(articleJson)) throw new Error(`„${articles.name}" ist keine JSON-Liste. Die Artikeldatei muss ein Array von Artikeln sein: [{ "title": …, … }, …].`);
    if (!Array.isArray(templateJson)) throw new Error(`„${templates.name}" ist keine JSON-Liste. Die Vorlagendatei muss ein Array von Vorlagen sein: [{ "title": …, … }, …].`);
    const titles: Record<number, string> = {};
    for (const row of articleJson) {
      if (!row || typeof row !== "object") continue;
      const pageid = (row as Record<string, unknown>).pageid, title = (row as Record<string, unknown>).title;
      if (typeof pageid === "number" && typeof title === "string") titles[pageid] = title;
    }
    setPageTitles(titles);
    await sendToServer(articleJson, templateJson, base);
  });

  const runProbe = () => task.run(async () => {
    const base = wikiBaseUrl(wikiUrl);
    if (!base) throw new Error("Gib zuerst eine gültige Wiki-Adresse ein. Beispiel: https://mein-wiki.fandom.com/de/");
    if (base !== wikiUrl) setWikiUrl(base);
    setProbe(null);
    const controller = new AbortController(); liveAbort.current = controller; setCancelable(true);
    try { setPhase("Wiki wird geprüft …"); setProbe(await probeWiki(base, controller.signal)); }
    finally { liveAbort.current = null; setCancelable(false); setPhase(""); }
  });

  const loadFromWiki = () => task.run(async () => {
    if (!probe) throw new Error("Prüfe zuerst die Wiki-Adresse.");
    const controller = new AbortController(); liveAbort.current = controller; setCancelable(true);
    try {
      const liveArticles = await fetchWikiArticles(probe, (p) => setPhase(`Lädt Artikel … ${p.fetched}${p.total ? ` von ca. ${p.total}` : ""} (Stapel ${p.batch})`), controller.signal);
      setPageTitles(Object.fromEntries(liveArticles.map((a) => [a.pageid, a.title])));
      const liveTemplates = await fetchWikiTemplates(probe, (p) => setPhase(`Lädt Vorlagen … ${p.fetched} geladen (Stapel ${p.batch})`), controller.signal);
      const base = wikiBaseUrl(wikiUrl) ?? probe.endpoint;
      await sendToServer(liveArticles, liveTemplates, base);
    } finally { liveAbort.current = null; setCancelable(false); }
  });
  const cancelLive = () => liveAbort.current?.abort();

  const download = () => task.run(async () => {
    if (!preview) return;
    const source = await api<Artifact>(apiPath(campaignId, `/imports/${encodeURIComponent(preview.artifactId)}`));
    const url = URL.createObjectURL(new Blob([JSON.stringify(source, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `chronicle-import-${preview.artifactId}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const submitIntake = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (task.busy) return;
    if (mode === "upload") void makePreview();
    else if (!probe) void runProbe();
    else void loadFromWiki();
  };
  const switchMode = (next: "live" | "upload") => { setMode(next); task.setError(""); };

  return <section className="import-view"><div className="document-toolbar"><Button variant="quiet" onClick={onClose}><ArrowLeft size={16} /> Zur Chronik</Button><span>Wiki importieren</span></div><div className="import-content">
    <p className="eyebrow">Deine Welt zieht ein</p><h1>Geschichten mit Herkunft.</h1><p className="muted">Übernimm die Artikel eures Wikis. Du siehst vor dem Speichern, was ankommt, was sich nicht automatisch umwandeln ließ, und wie viel vom Originaltext erhalten bleibt.</p>
    {task.error ? <Notice error>{friendlyImportError(task.error)}</Notice> : null}{resumeError ? <Notice error>{friendlyImportError(resumeError)}</Notice> : null}
    {resuming ? <Loading text="Gespeicherter Importbericht wird geöffnet …" /> : !preview ? <form className="panel" onSubmit={submitIntake}>
      <label>Adresse des Quell-Wikis<input type="url" value={wikiUrl} required disabled={task.busy} placeholder="https://mein-wiki.fandom.com/de/"
        onChange={(event) => changeWikiUrl(event.target.value)} onBlur={normalizeWikiUrl} />
        <span className="field-help">Die Basisadresse des Wikis — nicht die Adresse eines einzelnen Artikels. Sie erscheint als Quellenangabe an jedem übernommenen Absatz und wird dafür beim Verlassen des Felds automatisch auf die Basisadresse gekürzt.</span>
      </label>
      <label>Lizenz der importierten Texte<input value={license} maxLength={200} required disabled={task.busy} onChange={event => setLicense(event.target.value)} /></label>

      <div className="button-row">
        <Button type="button" variant={mode === "live" ? "primary" : "quiet"} disabled={task.busy} onClick={() => switchMode("live")}><Globe size={16} /> Direkt aus dem Wiki laden</Button>
        <Button type="button" variant={mode === "upload" ? "primary" : "quiet"} disabled={task.busy} onClick={() => switchMode("upload")}><FileJson size={16} /> Bereits exportierte Dateien hochladen</Button>
      </div>

      {mode === "live" ? <div className="panel">
        <p className="field-help">Diese Ansicht ruft Artikel und Vorlagen direkt über die MediaWiki-Schnittstelle des Wikis ab — dafür muss nichts exportiert oder hochgeladen werden. Voraussetzung: Das Wiki läuft auf MediaWiki (u. a. Fandom-Wikis, Wikipedia, die meisten selbstgehosteten Wikis) und ist ohne Anmeldung lesbar.</p>
        {!probe ? <>
          <Button type="submit" variant="primary" disabled={task.busy || !wikiUrl.trim()}><Search size={16} /> Wiki prüfen</Button>
          {!task.busy && !wikiUrl.trim() ? <p className="field-help">Gib zuerst oben die Adresse des Quell-Wikis ein.</p> : null}
        </> : <>
          <div className="import-metrics">
            <div><strong>{probe.siteName}</strong><span>Wiki gefunden</span></div>
            <div><strong>{probe.language || "?"}</strong><span>Sprache</span></div>
            <div><strong>{probe.articlesCount}</strong><span>Artikel laut Wiki-Statistik</span></div>
            <div><strong>{probe.license?.text ?? "unbekannt"}</strong><span>Lizenz</span></div>
          </div>
          {probe.articlesCount > 2000 ? <Notice>Das sind sehr viele Artikel für einen einzelnen Import (Grenze: 20 MB Rohtext insgesamt für Artikel und Vorlagen zusammen). Das Laden kann lange dauern oder am Ende an der Größe scheitern.</Notice> : null}
          <div className="button-row">
            <Button type="submit" variant="primary" disabled={task.busy}><Upload size={16} /> Ist das dein Wiki? Artikel und Vorlagen jetzt laden</Button>
            <Button type="button" variant="quiet" disabled={task.busy} onClick={() => setProbe(null)}>Andere Adresse prüfen</Button>
          </div>
        </>}
      </div> : <div className="panel">
        <p>Zwei JSON-Dateien aus einem MediaWiki-API-Export dieses Wikis: <strong>articles.json</strong> (ein Eintrag je Artikel mit Titel, Seiten-ID, Namensraum, Revisions-ID und dem vollständigen Wikitext) und <strong>templates.json</strong> (ein Eintrag je Infobox-Vorlage mit Titel und Quelltext). Das ist NICHT die Datei aus „Spezial:Exportieren" des Wikis — die liefert XML ohne Vorlagen und ohne Seiten-ID. Ohne eigenen JSON-Export lieber oben „Direkt aus dem Wiki laden" verwenden.</p>
        <details><summary>Genaues Format der beiden Dateien</summary>
          <pre>{"articles.json:  [{ \"title\": \"Erismus\", \"pageid\": 305, \"ns\": 0, \"revid\": 1023, \"wikitext\": \"…\" }, …]\ntemplates.json: [{ \"title\": \"Vorlage:Person\", \"source\": \"…\" }, …]"}</pre>
        </details>
        <div className="import-files">
          <label><FileJson size={20} /> Artikeldatei<input type="file" accept=".json,application/json" required disabled={task.busy} onChange={(event) => setArticles(event.target.files?.[0] ?? null)} /><span className="field-help">articles.json mit vollständigem Wikitext</span></label>
          <label><FileJson size={20} /> Vorlagendatei<input type="file" accept=".json,application/json" required disabled={task.busy} onChange={(event) => setTemplates(event.target.files?.[0] ?? null)} /><span className="field-help">templates.json mit Infobox-Definitionen</span></label>
        </div>
        <Button type="submit" variant="primary" disabled={task.busy || !articles || !templates || !wikiUrl.trim()}><Upload size={16} /> Importvorschau erstellen</Button>
        {!task.busy && (!wikiUrl.trim() || !articles || !templates) ? <p className="field-help">
          {!wikiUrl.trim() ? "Gib zuerst oben die Adresse des Quell-Wikis ein." : !articles && !templates ? "Wähle beide Dateien aus." : !articles ? "Es fehlt noch die Artikeldatei (articles.json)." : "Es fehlt noch die Vorlagendatei (templates.json)."}
        </p> : null}
      </div>}

      {task.busy ? <div className="button-row"><Loading text={phase || "Wird verarbeitet …"} />{cancelable ? <Button type="button" variant="quiet" onClick={cancelLive}>Abbrechen</Button> : null}</div> : null}

      <details><summary>Vollständige Autorennachweise ergänzen</summary><p>Für eine spätere öffentliche Freigabe brauchen importierte Texte die vollständige Autorenhistorie und den Revisionsnachweis ihrer Quelle. Fehlende Angaben bleiben ausdrücklich offen.</p>
        <label>Autorennachweise als JSON<input type="file" accept=".json,application/json" disabled={task.busy} onChange={event => { setAttributionFile(event.target.files?.[0] ?? null); setAttributionConfirmed(false); }} /></label>
        <p className="field-help">Die Datei ordnet jeder Seitenkennung einen Nachweis mit complete, authors, anonymousContributions und revisionSha1 zu. Verwende die vollständige Historie, nicht nur den letzten Bearbeiter.</p>
        <label className="check-label"><input type="checkbox" disabled={!attributionFile || task.busy} checked={attributionConfirmed} onChange={event => setAttributionConfirmed(event.target.checked)} /> Die mitgelieferten Nachweise enthalten die vollständige Autorenhistorie der angegebenen Seiten.</label>
      </details>
    </form> : <>
      {applied !== null ? <div ref={successRef} className="panel">
        <div className="section-heading"><h2><Check size={18} /> Import abgeschlossen</h2></div>
        <p>{applied} von {preview.entries.length} ausgewählten Artikeln {applied === 1 ? "wurde" : "wurden"} jetzt gespeichert — Teil eines Imports mit insgesamt {preview.report.eintraege} Artikeln und {preview.report.passagen} Passagen ({formatPercent(preview.report.textErhaltung)} Texterhaltung). Importbericht und unveränderte Quelle bleiben auf dem Server gespeichert.</p>
        <div className="button-row"><Button variant="primary" onClick={onClose}><ArrowLeft size={16} /> Zur Chronik — importierte Artikel ansehen</Button></div>
      </div> : null}
      {!preview.attributionComplete ? <Notice>Die vollständige Autorenhistorie und Revisionsnachweise fehlen in diesem Export. Diese Lücke bleibt in jeder Quellenangabe vermerkt. Importierte Texte bleiben Notizen; Medien sind nicht als lizenzgeprüft freigegeben.</Notice> : null}
      <div className="import-metrics"><div><strong>{preview.report.eintraege}</strong><span>Artikel</span></div><div><strong>{preview.report.passagen}</strong><span>Passagen</span></div><div><strong>{preview.report.aliase}</strong><span>Weiterleitungen</span></div><div><strong>{formatPercent(preview.report.textErhaltung)}</strong><span>Texterhaltung</span></div><div><strong>{preview.report.verluste.length}</strong><span>Hinweise zur Übernahme</span></div></div>
      <div className="button-row import-actions"><Button disabled={task.busy} onClick={() => void download()}><Download size={16} /> Quelle und Bericht sichern</Button><Button onClick={() => { navigator.clipboard?.writeText(location.href).catch(() => task.setError("Der Link konnte nicht kopiert werden. Kopiere die Adresse aus der Browserzeile.")); }}>Bericht-Link kopieren</Button></div>
      <section className="panel"><div className="section-heading"><h2>Was möchtest du übernehmen?</h2><span className="muted">{selected.size} ausgewählt</span></div><p className="field-help">{preview.notice}</p>
        <div className="button-row"><Button onClick={() => setSelected(new Set(preview.entries.filter((entry) => !entry.existing).map((entry) => entry.id)))}>Alle neuen Artikel auswählen</Button><Button onClick={() => setSelected(new Set())}>Auswahl aufheben</Button></div>
        <div className="import-entry-list">{preview.entries.map((entry) => <label key={entry.id}><input type="checkbox" checked={selected.has(entry.id)} disabled={task.busy} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(entry.id); else next.delete(entry.id); return next; })} /><span>{entry.title}{entry.existing ? <small>Vorhandenen Artikel nach Prüfung ersetzen</small> : <small>Neuer Artikel</small>}</span></label>)}</div>
        <Button variant="primary" disabled={task.busy || selected.size === 0} onClick={() => void task.run(async () => {
          const result = await api<{ applied: number }>(apiPath(campaignId, `/imports/${encodeURIComponent(preview.artifactId)}/accept`), { method: "POST", body: { entryIds: [...selected] } });
          setApplied(result.applied); setSelected(new Set()); onImported();
          const url = new URL(location.href); url.searchParams.delete("import"); window.history.replaceState(null, "", url);
        })}><Check size={16} /> Auswahl übernehmen</Button>
      </section>
      <section className="panel"><h2>Was nicht vollständig umgewandelt wurde</h2><p className="field-help">Die ehrliche Liste dessen, was nicht automatisch übernommen wurde — die Originalquelle bleibt dabei vollständig im gespeicherten Importartefakt erhalten.</p>
        {preview.report.verluste.length ? groupLosses(preview.report.verluste).map(([art, items]) => {
          const examples = [...new Set(items.map((loss) => lossSubject(loss.bezeichnung, pageTitles)))];
          return <details key={art}><summary>{art} ({items.length}) — u. a. {examples.slice(0, 3).join(", ")}{examples.length > 3 ? " …" : ""}</summary>
            <div className="import-losses">{items.map((loss, i) => <details key={`${loss.bezeichnung}-${i}`}><summary>{lossSubject(loss.bezeichnung, pageTitles)}</summary><pre>{loss.detail ?? "Die ursprüngliche Quelle bleibt im Importartefakt erhalten."}</pre></details>)}</div>
          </details>;
        }) : <p className="muted">Für diese Artikel wurden keine Umwandlungsverluste gemeldet.</p>}
      </section>
    </>}
  </div></section>;
}
