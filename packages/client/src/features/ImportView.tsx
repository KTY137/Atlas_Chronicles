import { useEffect, useState } from "react";
import { ArrowLeft, Check, Download, FileJson, Upload } from "lucide-react";
import { Button, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, errorText } from "../api";
import { useTask } from "../hooks";

interface Report { eintraege: number; aliase: number; passagen: number; passagenNachArt: Record<string, number>; blaueKanten: number; roteKanten: number; textErhaltung: number; verluste: { art: string; bezeichnung: string; detail?: string }[] }
interface Preview { artifactId: string; report: Report; attributionComplete: boolean; entries: { id: string; title: string; existing: boolean }[]; notice: string }
interface Artifact { source: { result: { entries: { id: string; titel: string }[]; report: Report; attributionComplete: boolean }; versions: Record<string, number> }; report: Report }

export function ImportView({ campaignId, onClose, onImported }: { campaignId: string; onClose: () => void; onImported: () => void }) {
  const task = useTask(), [articles, setArticles] = useState<File | null>(null), [templates, setTemplates] = useState<File | null>(null);
  const [wikiUrl, setWikiUrl] = useState("https://eron.fandom.com/de/"), [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set()), [applied, setApplied] = useState<number | null>(null), [resuming, setResuming] = useState(false), [resumeError, setResumeError] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("import"); if (!id) return;
    const controller = new AbortController(); setResuming(true);
    api<Artifact>(apiPath(campaignId, `/imports/${encodeURIComponent(id)}`), { signal: controller.signal }).then((artifact) => {
      if (controller.signal.aborted) return;
      const result = artifact.source.result;
      setPreview({ artifactId: id, report: artifact.report, attributionComplete: result.attributionComplete,
        entries: result.entries.map((entry) => ({ id: entry.id, title: entry.titel, existing: artifact.source.versions[entry.id] !== undefined })),
        notice: "Dies ist die gespeicherte Importvorschau. Wähle die Artikel aus, deren Inhalt du übernehmen möchtest." });
    }).catch((error) => { if (!controller.signal.aborted) setResumeError(errorText(error)); }).finally(() => { if (!controller.signal.aborted) setResuming(false); });
    return () => controller.abort();
  }, [campaignId]);

  const makePreview = () => task.run(async () => {
    if (!articles || !templates) throw new Error("Wähle die Artikel- und die Vorlagendatei aus.");
    if (articles.size + templates.size > 20_000_000) throw new Error("Die beiden Dateien dürfen zusammen höchstens 20 MB groß sein.");
    const [a, t] = await Promise.all([articles.text(), templates.text()]);
    let articleJson: unknown, templateJson: unknown;
    try { articleJson = JSON.parse(a); templateJson = JSON.parse(t); } catch { throw new Error("Eine der Dateien enthält kein gültiges JSON."); }
    if (!Array.isArray(articleJson) || !Array.isArray(templateJson)) throw new Error("Artikel und Vorlagen müssen jeweils als JSON-Liste exportiert sein.");
    const result = await api<Preview>(apiPath(campaignId, "/imports/eron"), { method: "POST", body: { articles: articleJson, templates: templateJson, wikiUrl } });
    setPreview(result); setSelected(new Set()); setApplied(null);
    const url = new URL(location.href); url.searchParams.set("import", result.artifactId); window.history.replaceState(null, "", url);
  });
  const download = () => task.run(async () => {
    if (!preview) return;
    const source = await api<Artifact>(apiPath(campaignId, `/imports/${encodeURIComponent(preview.artifactId)}`));
    const url = URL.createObjectURL(new Blob([JSON.stringify(source, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `chronicle-import-${preview.artifactId}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  return <section className="import-view"><div className="document-toolbar"><Button variant="quiet" onClick={onClose}><ArrowLeft size={16} /> Zur Chronik</Button><span>Eron / Fandom übernehmen</span></div><div className="import-content">
    <p className="eyebrow">Deine Welt zieht ein</p><h1>Geschichten mit Herkunft.</h1><p className="muted">Übernimm eure Wiki-Artikel. Du siehst vor dem Speichern, was ankommt und was als Quelltext erhalten bleibt.</p>
    {task.error ? <Notice error>{task.error}</Notice> : null}{resumeError ? <Notice error>{resumeError}</Notice> : null}
    {resuming ? <Loading text="Gespeicherter Importbericht wird geöffnet …" /> : !preview ? <form className="panel" onSubmit={(event) => { event.preventDefault(); void makePreview(); }}>
      <div className="import-files"><label><FileJson size={20} /> Artikeldatei<input type="file" accept=".json,application/json" required onChange={(event) => setArticles(event.target.files?.[0] ?? null)} /><span className="field-help">articles.json mit vollständigem Wikitext</span></label><label><FileJson size={20} /> Vorlagendatei<input type="file" accept=".json,application/json" required onChange={(event) => setTemplates(event.target.files?.[0] ?? null)} /><span className="field-help">templates.json mit Infobox-Definitionen</span></label></div>
      <label>Adresse des Quell-Wikis<input type="url" value={wikiUrl} onChange={(event) => setWikiUrl(event.target.value)} required /></label>
      <Button type="submit" variant="primary" disabled={task.busy || !articles || !templates}><Upload size={16} /> {task.busy ? "Prüft die Quelle …" : "Importvorschau erstellen"}</Button>
    </form> : <>
      {applied !== null ? <Notice>{applied} Artikel wurden übernommen. Der Importbericht und die unveränderte Quelle sind auf dem Server gespeichert.</Notice> : null}
      {!preview.attributionComplete ? <Notice>Die vollständige Autorenhistorie und Revisionsnachweise fehlen in diesem Export. Diese Lücke bleibt in jeder Quellenangabe vermerkt. Importierte Texte bleiben Notizen; Medien sind nicht als lizenzgeprüft freigegeben.</Notice> : null}
      <div className="import-metrics"><div><strong>{preview.report.eintraege}</strong><span>Artikel</span></div><div><strong>{preview.report.passagen}</strong><span>Passagen</span></div><div><strong>{preview.report.aliase}</strong><span>Weiterleitungen</span></div><div><strong>{preview.report.verluste.length}</strong><span>Hinweise zur Übernahme</span></div></div>
      <div className="button-row import-actions"><Button disabled={task.busy} onClick={() => void download()}><Download size={16} /> Quelle und Bericht sichern</Button><Button onClick={() => { navigator.clipboard?.writeText(location.href).catch(() => task.setError("Der Link konnte nicht kopiert werden. Kopiere die Adresse aus der Browserzeile.")); }}>Bericht-Link kopieren</Button></div>
      <section className="panel"><div className="section-heading"><h2>Was möchtest du übernehmen?</h2><span className="muted">{selected.size} ausgewählt</span></div><p className="field-help">{preview.notice}</p>
        <div className="button-row"><Button onClick={() => setSelected(new Set(preview.entries.filter((entry) => !entry.existing).map((entry) => entry.id)))}>Alle neuen Artikel auswählen</Button><Button onClick={() => setSelected(new Set())}>Auswahl aufheben</Button></div>
        <div className="import-entry-list">{preview.entries.map((entry) => <label key={entry.id}><input type="checkbox" checked={selected.has(entry.id)} disabled={task.busy} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(entry.id); else next.delete(entry.id); return next; })} /><span>{entry.title}{entry.existing ? <small>Vorhandenen Artikel nach Prüfung ersetzen</small> : <small>Neuer Artikel</small>}</span></label>)}</div>
        <Button variant="primary" disabled={task.busy || selected.size === 0} onClick={() => void task.run(async () => { const result = await api<{ applied: number }>(apiPath(campaignId, `/imports/${encodeURIComponent(preview.artifactId)}/accept`), { method: "POST", body: { entryIds: [...selected] } }); setApplied(result.applied); setSelected(new Set()); onImported(); })}><Check size={16} /> Auswahl übernehmen</Button>
      </section>
      <section className="panel"><h2>Was nicht vollständig umgewandelt wurde</h2>{preview.report.verluste.length ? <div className="import-losses">{preview.report.verluste.map((loss, i) => <details key={`${loss.bezeichnung}-${i}`}><summary>{loss.bezeichnung} <span>{loss.art}</span></summary><pre>{loss.detail ?? "Die ursprüngliche Quelle bleibt im Importartefakt erhalten."}</pre></details>)}</div> : <p className="muted">Für diese Artikel wurden keine Umwandlungsverluste gemeldet.</p>}</section>
    </>}
  </div></section>;
}
