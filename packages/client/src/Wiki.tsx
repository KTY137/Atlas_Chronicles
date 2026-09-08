// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Suspense, lazy, useState } from "react";
import { BookOpen, Columns2, Download, Feather, History, Images, Network, Pencil, Plus, Search, RefreshCw, Upload } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, ladeAlsDatei, type Campaign, type EntryDocument, type EntrySummary, type HistoryItem, type Member } from "./api";
import { useResource, useTask } from "./hooks";
import { locale, t } from "./i18n";
import { ArticleReader, BlockReader } from "./Reader";
import { Editor, historyEditorSeed, newEditorSeed, type EditorSeed } from "./Editor";
import { ImportView } from "./features/ImportView";
import type { Umbruch } from "./features/week-api";
import { Backlinks } from "./features/Backlinks";
import { Brotkrumen, KategorieChips, NavigationBaum, WikiUebersicht, useNavigation } from "./features/WikiNavigation";
import { WikiKopf, WikiGruppenseite, type Kopfansicht } from "./features/WikiKopf";

const WikiMedien = lazy(() => import("./features/WikiMedien").then(module => ({ default: module.WikiMedien })));
const Gegenueberstellung = lazy(() => import("./features/Gegenueberstellung").then(module => ({ default: module.Gegenueberstellung })));
const Gefuege = lazy(() => import("./features/Gefuege").then(module => ({ default: module.Gefuege })));
const Zeitstrahl = lazy(() => import("./features/Zeitstrahl").then(module => ({ default: module.Zeitstrahl })));
const ChronistWorkbench = lazy(() => import("./features/ChronistWorkbench").then(module => ({ default: module.ChronistWorkbench })));

export function Wiki({ campaign, onDirty, liveRevision = 0, onComposeLetter, onOpenDoors }: { campaign: Campaign; onDirty: (dirty: boolean) => void; liveRevision?: number; onComposeLetter?: (seed: { entryId: string; passageIds: string[] }) => void; onOpenDoors?: (id: string) => void }) {
  const [query, setQuery] = useState(""), [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<string | null>(() => new URLSearchParams(location.search).get("entry"));
  const [editor, setEditor] = useState<EditorSeed | null>(null), [dirty, setDirty] = useState(false);
  const [history, setHistory] = useState<HistoryItem[] | null>(null), [notice, setNotice] = useState("");
  const [vergleich, setVergleich] = useState(false), [gefuege, setGefuege] = useState(false);
  const [kopf, setKopf] = useState<Kopfansicht>(null);
  const [importing, setImporting] = useState(() => campaign.role === "leitung" && new URLSearchParams(location.search).has("import"));
  const [medien, setMedien] = useState(() => campaign.role === "leitung" && new URLSearchParams(location.search).get("tab") === "bilder");
  const [chronist, setChronist] = useState(() => new URLSearchParams(location.search).get("tab") === "chronist");
  const task = useTask();
  const entries = useResource<EntrySummary[]>(apiPath(campaign.id, `/entries${query ? `?q=${encodeURIComponent(query)}` : ""}`), revision + liveRevision);
  const document = useResource<Umbruch>(selected ? apiPath(campaign.id, `/entries/${encodeURIComponent(selected)}/umbruch`) : null, revision + liveRevision);
  const roster = useResource<Member[]>(campaign.role === "leitung" ? apiPath(campaign.id, "/roster") : null, revision);
  // Das Navigationsskelett. Fällt es aus, bleibt die flache Liste — Ordnung ist eine
  // Verbesserung, kein Sperrpfad zum Inhalt.
  const navigation = useNavigation(campaign.id, revision + liveRevision);
  const navBereit = !navigation.loading && !navigation.error && navigation.data !== null;
  const geordnet = !query && navBereit;
  const canEdit = campaign.role === "leitung";
  const changeDirty = (value: boolean) => { setDirty(value); onDirty(value); };
  // Stable setter wrapper prevents editor effect cleanup from clearing dirty state on parent renders.
  const [notifyDirty] = useState(() => (value: boolean) => { setDirty(value); onDirty(value); });
  const select = (id: string | null) => {
    if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return;
    setSelected(id); setKopf(null); setEditor(null); setHistory(null); setVergleich(false); setGefuege(false); setImporting(false); setMedien(false); setChronist(false); changeDirty(false); setNotice(""); task.setError("");
    const url = new URL(location.href); url.searchParams.delete("import"); if (url.searchParams.get("tab") === "chronist") url.searchParams.delete("tab"); if (id) url.searchParams.set("entry", id); else url.searchParams.delete("entry"); historyReplace(url);
  };
  const startNew = () => { if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return; clearChronistTab(); setChronist(false); setKopf(null); setEditor(newEditorSeed()); setHistory(null); setVergleich(false); setGefuege(false); setImporting(false); setMedien(false); };
  // Shared by the sidebar entry point and the empty-state action so both open the importer identically.
  const openImport = () => { if (!dirty || window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) { clearChronistTab(); setChronist(false); setEditor(null); changeDirty(false); setMedien(false); setImporting(true); } };
  const openMedien = () => {
    if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return;
    setChronist(false); setEditor(null); changeDirty(false); setImporting(false); setHistory(null); setMedien(true);
    const url = new URL(location.href); url.searchParams.set("tab", "bilder"); url.searchParams.delete("import"); historyReplace(url);
  };
  const closeMedien = () => { setMedien(false); const url = new URL(location.href); url.searchParams.delete("tab"); historyReplace(url); };
  const openChronist = () => {
    if (chronist) return;
    if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return;
    setEditor(null); setHistory(null); setKopf(null); setImporting(false); setMedien(false); setChronist(true); changeDirty(false);
    const url = new URL(location.href); url.searchParams.set("tab", "chronist"); url.searchParams.delete("import"); historyReplace(url);
  };
  const closeChronist = () => {
    if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return;
    setChronist(false); changeDirty(false); const url = new URL(location.href); url.searchParams.delete("tab"); historyReplace(url);
  };
  const edit = () => task.run(async () => {
    if (!selected) return;
    const rows = await api<HistoryItem[]>(apiPath(campaign.id, `/entries/${encodeURIComponent(selected)}/history`));
    if (!rows[0]) throw new Error(t("Für diesen Artikel ist noch keine Revision vorhanden."));
    setEditor(historyEditorSeed(selected, rows[0])); setHistory(null);
  });
  return <div className="wiki-layout"><aside className="entry-sidebar" aria-label={t("Artikelübersicht")}><div className="sidebar-heading"><div><p className="eyebrow">{t("Deine Welt")}</p><h2>{t("Die Chronik")}</h2></div>{canEdit ? <Button aria-label={t("Artikel anlegen")} title={t("Artikel anlegen")} onClick={startNew}><Plus size={18} /></Button> : null}</div>
    <Button className="wiki-chronist-entry" aria-pressed={chronist} onClick={openChronist}><Feather size={17} /><span>{t("Chronist")}</span></Button>
    <label className="search-box"><Search size={17} /><span className="sr-only">{t("Artikel durchsuchen")}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("In der Chronik suchen")} /></label>
    {entries.loading ? <Loading text={t("Artikel werden geladen …")} /> : entries.error ? <Notice error>{entries.error} <Button variant="quiet" onClick={() => setRevision((v) => v + 1)}>{t("Erneut versuchen")}</Button></Notice> : geordnet ? <NavigationBaum daten={navigation.data!} ausgewaehlt={selected} onEntry={select} /> : <nav className="entry-list" aria-label={t("Wiki-Artikel")}>{entries.data?.map((entry) => <button key={entry.id} className={selected === entry.id ? "entry-item active" : "entry-item"} onClick={() => select(entry.id)} aria-current={selected === entry.id ? "page" : undefined}><BookOpen size={16} /><span><strong>{entry.title}</strong><small>{entry.excerpt || t("Noch ohne Text")}</small></span></button>)}</nav>}
    {entries.data?.length === 0 ? <p className="sidebar-empty">{query ? t("Keine Artikel für diese Suche.") : canEdit ? t("Hier wächst eure Welt. Beginne mit dem ersten Artikel oder importiere ein bestehendes Wiki.") : t("Deine Chronik füllt sich, sobald du etwas in der Welt erfährst.")}</p> : null}
    <div className="sidebar-import">{canEdit ? <><Button onClick={openImport}><Upload size={14} /> {t("Wiki importieren")}</Button><Button onClick={openMedien}><Images size={14} /> {t("Bilder")}</Button></> : null}{/* Der Export steht ALLEN offen: eine Spielerin nimmt mit, was ihre Figur weiss. Genau das sagt auch der Kopf des Dokuments — eine Teilmenge, die sich fuer das Ganze ausgibt, waere die unangenehmste Sorte Fehler. */}<Button disabled={task.busy} onClick={() => void task.run(() => ladeAlsDatei(apiPath(campaign.id, "/wiki-export"), "chronik.md", status => status === 404 ? t("Die Chronik ist für diesen Zugang nicht verfügbar.") : t("Der Export konnte nicht erstellt werden.")))}><Download size={14} /> {canEdit ? t("Chronik exportieren") : t("Mein Wissen exportieren")}</Button></div>
    <div className="sidebar-bottom"><span>{campaign.role === "leitung" ? t("Ansicht der Spielleitung") : t("Dein Wissen")}</span><Button variant="quiet" aria-label={t("Artikel aktualisieren")} title={t("Artikel aktualisieren")} onClick={() => setRevision((v) => v + 1)}><RefreshCw size={14} /></Button></div>
  </aside><section className="document-stage" aria-label={t("Artikel")}>
    {navBereit ? <WikiKopf daten={navigation.data!} ansicht={kopf} onAnsicht={ansicht => { if (dirty && !window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) return; clearChronistTab(); changeDirty(false); setChronist(false); setKopf(ansicht); setEditor(null); setHistory(null); setVergleich(false); setGefuege(false); setImporting(false); setMedien(false); }} /> : null}
    {task.error ? <Notice error>{task.error}</Notice> : null}{document.error ? <Notice error>{document.error} <Button variant="quiet" onClick={() => setRevision((v) => v + 1)}>{t("Erneut versuchen")}</Button></Notice> : null}{notice ? <Notice>{notice}</Notice> : null}
    {chronist ? <Suspense fallback={<Loading text={t("Der Chronist wird geöffnet …")} />}><ChronistWorkbench campaign={campaign} onDirty={notifyDirty} onOpenEntry={select} onClose={closeChronist} liveRevision={revision + liveRevision} /></Suspense>
      : kopf?.art === "zeitstrahl" ? <Suspense fallback={<Loading text={t("Zeitstrahl wird geöffnet …")} />}><Zeitstrahl campaignId={campaign.id} onOpenEntry={select} onClose={() => setKopf(null)} /></Suspense>
      : kopf?.art === "gruppe" && navBereit ? <WikiGruppenseite daten={navigation.data!} gruppeId={kopf.id} onEntry={select} onAnsicht={setKopf} />
      : kopf?.art === "uebersicht" && navBereit ? <WikiUebersicht daten={navigation.data!} onEntry={select} />
      : medien ? <Suspense fallback={<Loading text={t("Bildbestand wird geöffnet …")} />}><WikiMedien campaignId={campaign.id} onClose={closeMedien} /></Suspense> : importing ? <ImportView campaignId={campaign.id} onClose={() => { setImporting(false); const url = new URL(location.href); url.searchParams.delete("import"); historyReplace(url); }} onImported={() => setRevision((v) => v + 1)} /> : editor ? <Editor key={editor.instanceId} campaignId={campaign.id} seed={editor} onDirty={notifyDirty} onCancel={() => { if (!dirty || window.confirm(t("Ungespeicherte Änderungen verwerfen?"))) { setEditor(null); changeDirty(false); } }} onSaved={(doc) => { setEditor(null); changeDirty(false); setSelected(doc.entryId); setRevision((v) => v + 1); setNotice(t("Artikel gespeichert.")); const url = new URL(location.href); url.searchParams.set("entry", doc.entryId); historyReplace(url); }} /> : !selected ? (entries.data?.length === 0 ? <EmptyState title={t("Hier beginnt eure Chronik.")} action={canEdit ? <div className="button-row"><Button variant="primary" onClick={startNew}><Plus size={16} /> {t("Ersten Artikel schreiben")}</Button><Button onClick={openImport}><Upload size={16} /> {t("Wiki importieren")}</Button></div> : undefined}>{canEdit ? t("Hier sammelt ihr das Wissen eurer Welt: Orte, Figuren, Ereignisse. Schreibe den ersten Artikel selbst oder übernimm bestehende Inhalte aus eurem Wiki.") : t("Hier sammelt eure Runde das Wissen der Welt. Sobald eure Spielleitung Artikel anlegt oder ein Wiki importiert, erscheinen sie hier.")}</EmptyState> : navBereit ? <WikiUebersicht daten={navigation.data!} onEntry={select} /> : <EmptyState title={t("Eine Welt zwischen zwei Buchdeckeln.")} action={canEdit ? <Button variant="primary" onClick={startNew}><Plus size={16} /> {t("Neuen Artikel anlegen")}</Button> : undefined}>{t("Wähle einen Artikel aus der Chronik und folge den Geschichten deiner Runde.")}</EmptyState>) : document.loading ? <Loading text={t("Artikel wird geöffnet …")} /> : document.data ? <>
      <div className="document-toolbar"><span><BookOpen size={15} /> {t("Wiki")}</span><Button aria-pressed={gefuege} onClick={() => setGefuege(value => !value)}><Network size={15} /> {t("Gefüge")}</Button>{document.data.unreadCount > 0 ? <Button disabled={task.busy} onClick={() => void task.run(async () => { try { await api(apiPath(campaign.id, `/entries/${encodeURIComponent(selected)}/read`), { method: "POST", body: { expectedHash: document.data!.readHash } }); setNotice(t("Artikel als gelesen markiert.")); } finally { setRevision(value => value + 1); } })}>{t("Als gelesen markieren")}</Button> : null}{canEdit ? <div className="button-row"><Button disabled={task.busy} onClick={() => void task.run(async () => setHistory(await api<HistoryItem[]>(apiPath(campaign.id, `/entries/${encodeURIComponent(selected)}/history`))))}><History size={15} /> {t("Historie")}</Button><Button disabled={task.busy} aria-pressed={vergleich} onClick={() => setVergleich(value => !value)}><Columns2 size={15} /> {t("Gegenüberstellung")}</Button><Button onClick={() => void edit()} disabled={task.busy}><Pencil size={15} /> {t("Bearbeiten")}</Button></div> : null}</div>
      {gefuege && selected ? <Suspense fallback={<Loading text={t("Das Gefüge wird geöffnet …")} />}><Gefuege key={selected} campaignId={campaign.id} entryId={selected} gm={canEdit} onOpenEntry={select} onClose={() => setGefuege(false)} /></Suspense> : null}
      {vergleich && canEdit ? <Suspense fallback={<Loading text={t("Beide Sichten werden geöffnet …")} />}><Gegenueberstellung key={selected} campaignId={campaign.id} entryId={selected} onClose={() => setVergleich(false)} /></Suspense> : null}
      {history ? <section className="history-panel"><div className="section-heading"><h2>{t("Die Geschichte dieses Artikels")}</h2><Button onClick={() => setHistory(null)}>{t("Schließen")}</Button></div>{history.map((row) => <details key={row.id}><summary>{t("Revision {nummer}", { nummer: row.seq })} <time>{new Date(Number(row.createdAt)).toLocaleString(locale())}</time></summary><h3>{row.document.title}</h3>{row.document.passagen.map((passage) => <BlockReader key={passage.pid} block={passage.inhalt} onEntry={(id) => select(id)} />)}</details>)}</section> : null}
      {navBereit ? <div className="article-body article-kopfzeile"><Brotkrumen daten={navigation.data!} entryId={document.data.entryId} onEntry={select} /><KategorieChips daten={navigation.data!} entryId={document.data.entryId} /></div> : null}
      <ArticleReader document={document.data} campaignId={campaign.id} unreadIds={new Set(document.data.passagen.filter(p => p.unread).map(p => p.pid))} onDoor={onOpenDoors} onSendPassage={campaign.role === "spieler" && onComposeLetter ? pid => onComposeLetter({ entryId: document.data!.entryId, passageIds: [pid] }) : undefined} onEntry={(id) => select(id)} members={roster.data ?? []} busy={task.busy} {...(canEdit ? { onReveal: (passageId: string, actorId: string) => void task.run(async () => { await api(apiPath(campaign.id, "/reveal"), { method: "POST", body: { passageId, actorId } }); setNotice(t("Die Passage ist jetzt für diese Figur freigegeben.")); }) } : {})} />
      <Backlinks campaignId={campaign.id} entryId={document.data.entryId} revision={revision + liveRevision} onEntry={select} />
    </> : null}
  </section></div>;
}

function historyReplace(url: URL) { window.history.replaceState(null, "", url); }
function clearChronistTab() { const url = new URL(location.href); if (url.searchParams.get("tab") === "chronist") { url.searchParams.delete("tab"); historyReplace(url); } }
