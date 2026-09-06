import { useState } from "react";
import { BookOpen, History, Pencil, Plus, Search, RefreshCw, Upload } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, type Campaign, type EntryDocument, type EntrySummary, type HistoryItem, type Member } from "./api";
import { useResource, useTask } from "./hooks";
import { ArticleReader, BlockReader } from "./Reader";
import { Editor, historyEditorSeed, newEditorSeed, type EditorSeed } from "./Editor";
import { ImportView } from "./features/ImportView";
import type { Umbruch } from "./features/week-api";
import { Backlinks } from "./features/Backlinks";

export function Wiki({ campaign, onDirty, liveRevision = 0, onComposeLetter, onOpenDoors }: { campaign: Campaign; onDirty: (dirty: boolean) => void; liveRevision?: number; onComposeLetter?: (seed: { entryId: string; passageIds: string[] }) => void; onOpenDoors?: (id: string) => void }) {
  const [query, setQuery] = useState(""), [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<string | null>(() => new URLSearchParams(location.search).get("entry"));
  const [editor, setEditor] = useState<EditorSeed | null>(null), [dirty, setDirty] = useState(false);
  const [history, setHistory] = useState<HistoryItem[] | null>(null), [notice, setNotice] = useState("");
  const [importing, setImporting] = useState(() => campaign.role === "leitung" && new URLSearchParams(location.search).has("import"));
  const task = useTask();
  const entries = useResource<EntrySummary[]>(apiPath(campaign.id, `/entries${query ? `?q=${encodeURIComponent(query)}` : ""}`), revision + liveRevision);
  const document = useResource<Umbruch>(selected ? apiPath(campaign.id, `/entries/${encodeURIComponent(selected)}/umbruch`) : null, revision + liveRevision);
  const roster = useResource<Member[]>(campaign.role === "leitung" ? apiPath(campaign.id, "/roster") : null, revision);
  const canEdit = campaign.role === "leitung";
  const changeDirty = (value: boolean) => { setDirty(value); onDirty(value); };
  // Stable setter wrapper prevents editor effect cleanup from clearing dirty state on parent renders.
  const [notifyDirty] = useState(() => (value: boolean) => { setDirty(value); onDirty(value); });
  const select = (id: string | null) => {
    if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return;
    setSelected(id); setEditor(null); setHistory(null); setImporting(false); changeDirty(false); setNotice(""); task.setError("");
    const url = new URL(location.href); url.searchParams.delete("import"); if (id) url.searchParams.set("entry", id); else url.searchParams.delete("entry"); historyReplace(url);
  };
  const startNew = () => { if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return; setEditor(newEditorSeed()); setHistory(null); setImporting(false); };
  const edit = () => task.run(async () => {
    if (!selected) return;
    const rows = await api<HistoryItem[]>(apiPath(campaign.id, `/entries/${encodeURIComponent(selected)}/history`));
    if (!rows[0]) throw new Error("Für diesen Artikel ist noch keine Revision vorhanden.");
    setEditor(historyEditorSeed(selected, rows[0])); setHistory(null);
  });
  return <div className="wiki-layout"><aside className="entry-sidebar" aria-label="Artikelübersicht"><div className="sidebar-heading"><div><p className="eyebrow">Deine Welt</p><h2>Die Chronik</h2></div>{canEdit ? <Button aria-label="Artikel anlegen" onClick={startNew}><Plus size={18} /></Button> : null}</div>
    <label className="search-box"><Search size={17} /><span className="sr-only">Artikel durchsuchen</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="In der Chronik suchen" /></label>
    {entries.loading ? <Loading /> : entries.error ? <Notice error>{entries.error}</Notice> : <nav className="entry-list" aria-label="Wiki-Artikel">{entries.data?.map((entry) => <button key={entry.id} className={selected === entry.id ? "entry-item active" : "entry-item"} onClick={() => select(entry.id)} aria-current={selected === entry.id ? "page" : undefined}><BookOpen size={16} /><span><strong>{entry.title}</strong><small>{entry.excerpt || "Noch ohne Text"}</small></span></button>)}</nav>}
    {entries.data?.length === 0 ? <p className="sidebar-empty">{query ? "Keine Artikel für diese Suche." : canEdit ? "Hier wächst eure Welt. Beginne mit dem ersten Artikel." : "Deine Chronik füllt sich, sobald du etwas in der Welt erfährst."}</p> : null}
    {canEdit ? <div className="sidebar-import"><Button variant="quiet" onClick={() => { if (!dirty || window.confirm("Ungespeicherte Änderungen verwerfen?")) { setEditor(null); changeDirty(false); setImporting(true); } }}><Upload size={14} /> Wiki importieren</Button></div> : null}
    <div className="sidebar-bottom"><span>{campaign.role === "leitung" ? "Ansicht der Spielleitung" : "Dein Wissen"}</span><Button variant="quiet" aria-label="Artikel aktualisieren" onClick={() => setRevision((v) => v + 1)}><RefreshCw size={14} /></Button></div>
  </aside><section className="document-stage" aria-label="Artikel">
    {task.error ? <Notice error>{task.error}</Notice> : null}{document.error ? <Notice error>{document.error}</Notice> : null}{notice ? <Notice>{notice}</Notice> : null}
    {importing ? <ImportView campaignId={campaign.id} onClose={() => { setImporting(false); const url = new URL(location.href); url.searchParams.delete("import"); historyReplace(url); }} onImported={() => setRevision((v) => v + 1)} /> : editor ? <Editor key={editor.instanceId} campaignId={campaign.id} seed={editor} onDirty={notifyDirty} onCancel={() => { if (!dirty || window.confirm("Ungespeicherte Änderungen verwerfen?")) { setEditor(null); changeDirty(false); } }} onSaved={(doc) => { setEditor(null); changeDirty(false); setSelected(doc.entryId); setRevision((v) => v + 1); setNotice("Artikel gespeichert."); const url = new URL(location.href); url.searchParams.set("entry", doc.entryId); historyReplace(url); }} /> : !selected ? <EmptyState title="Eine Welt zwischen zwei Buchdeckeln." action={canEdit ? <Button variant="primary" onClick={startNew}><Plus size={16} /> Ersten Artikel schreiben</Button> : undefined}>Wähle einen Artikel aus der Chronik und folge den Geschichten deiner Runde.</EmptyState> : document.loading ? <Loading text="Artikel wird geöffnet …" /> : document.data ? <>
      <div className="document-toolbar"><span><BookOpen size={15} /> Wiki</span>{document.data.unreadCount > 0 ? <Button disabled={task.busy} onClick={() => void task.run(async () => { try { await api(apiPath(campaign.id, `/entries/${encodeURIComponent(selected)}/read`), { method: "POST", body: { expectedHash: document.data!.readHash } }); setNotice("Artikel als gelesen markiert."); } finally { setRevision(value => value + 1); } })}>Als gelesen markieren</Button> : null}{canEdit ? <div className="button-row"><Button disabled={task.busy} onClick={() => void task.run(async () => setHistory(await api<HistoryItem[]>(apiPath(campaign.id, `/entries/${encodeURIComponent(selected)}/history`))))}><History size={15} /> Historie</Button><Button onClick={() => void edit()} disabled={task.busy}><Pencil size={15} /> Bearbeiten</Button></div> : null}</div>
      {history ? <section className="history-panel"><div className="section-heading"><h2>Die Geschichte dieses Artikels</h2><Button onClick={() => setHistory(null)}>Schließen</Button></div>{history.map((row) => <details key={row.id}><summary>Revision {row.seq} <time>{new Date(Number(row.createdAt)).toLocaleString("de-DE")}</time></summary><h3>{row.document.title}</h3>{row.document.passagen.map((passage) => <BlockReader key={passage.pid} block={passage.inhalt} onEntry={(id) => select(id)} />)}</details>)}</section> : null}
      <ArticleReader document={document.data} campaignId={campaign.id} unreadIds={new Set(document.data.passagen.filter(p => p.unread).map(p => p.pid))} onDoor={onOpenDoors} onSendPassage={campaign.role === "spieler" && onComposeLetter ? pid => onComposeLetter({ entryId: document.data!.entryId, passageIds: [pid] }) : undefined} onEntry={(id) => select(id)} members={roster.data ?? []} busy={task.busy} {...(canEdit ? { onReveal: (passageId: string, actorId: string) => void task.run(async () => { await api(apiPath(campaign.id, "/reveal"), { method: "POST", body: { passageId, actorId } }); setNotice("Die Passage ist jetzt für diese Figur freigegeben."); }) } : {})} />
      <Backlinks campaignId={campaign.id} entryId={document.data.entryId} revision={revision + liveRevision} onEntry={select} />
    </> : null}
  </section></div>;
}

function historyReplace(url: URL) { window.history.replaceState(null, "", url); }
