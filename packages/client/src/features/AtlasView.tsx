import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Compass, Eye, Link, Map, Maximize, Minus, Plus, RefreshCw, Search, Upload, X } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { createMapRenderer, type MapRenderer, type ProjectedMapScene } from "@chronicle/render";
import { api, apiPath, ApiError, errorText, type EntryDocument, type EntrySummary, type Member } from "../api.ts";
import { useResource, useTask } from "../hooks.ts";
import "./AtlasView.css";
import { useAppearance } from "./Appearance";

interface AtlasNode { id: string; title: string | null; kind: string; entryId?: string; parents: readonly { id: string; kind: string }[] }
interface ImportReport { orte: number; zellen: number; unterdrueckteNotizen: number; hinweise: readonly string[]; ausgelasseneDatensaetze: Record<string, number> }
interface AtlasMap extends ProjectedMapScene { title: string; nodes: readonly AtlasNode[]; version?: number; report?: ImportReport }
interface MapSummary { id: string; title: string }
export interface AtlasViewProps { campaignId: string; role: "leitung" | "spieler" | "beobachter"; onOpenEntry: (id: string) => void }
const kindLabel: Record<string, string> = { welt: "Welt", landmasse: "Landmasse", macht: "Herrschaft", region: "Region", ort: "Ort", bauwerk: "Bauwerk", raum: "Raum", behaelter: "Behälter", gegenstand: "Gegenstand" };
const pathId = (id: string) => encodeURIComponent(id);

export function AtlasView({ campaignId, role, onOpenEntry }: AtlasViewProps) {
  const { resolved } = useAppearance();
  const gm = role === "leitung";
  const selectionKey = `chronicle.atlas-map.${campaignId}`;
  const [mapId, setMapId] = useState("");
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [entryId, setEntryId] = useState("");
  const [actorId, setActorId] = useState("");
  const [articleTitle, setArticleTitle] = useState("");
  const [articleBody, setArticleBody] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState("");
  const [rendererError, setRendererError] = useState("");
  const [rendererReady, setRendererReady] = useState(false);
  const [zoom, setZoom] = useState(100);
  const task = useTask();
  const maps = useResource<MapSummary[]>(apiPath(campaignId, "/maps"), revision, 15000);
  const map = useResource<AtlasMap>(mapId ? apiPath(campaignId, `/maps/${pathId(mapId)}`) : null, revision, 10000);
  const roster = useResource<Member[]>(gm ? apiPath(campaignId, "/roster") : null, revision, 15000);
  const entries = useResource<EntrySummary[]>(gm && mapId ? apiPath(campaignId, "/entries") : null, revision);
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<MapRenderer | null>(null);
  const sceneRef = useRef<AtlasMap | null>(null);
  const presentedScene = useMemo(() => map.data ? { ...map.data, rasterSampling: resolved.sampling } : null, [map.data, resolved.sampling]);
  sceneRef.current = presentedScene;
  const mapIdRef = useRef(mapId);
  mapIdRef.current = mapId;
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = map.data?.nodes.find((node) => node.id === selectedId);
  const members = roster.data?.filter((member) => member.actorId) ?? [];
  const nodes = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de");
    return (map.data?.nodes ?? []).filter((node) => (kind === "all" || (kind === "places" ? node.kind === "ort" : node.kind !== "ort"))
      && (!needle || (node.title ?? "Unbenannt").toLocaleLowerCase("de").includes(needle)))
      .sort((a, b) => (a.title ?? "Unbenannt").localeCompare(b.title ?? "Unbenannt", "de"));
  }, [map.data, query, kind]);

  useEffect(() => {
    setMapId(""); setSelectedId(""); setMessage(""); setQuery("");
  }, [campaignId]);
  useEffect(() => {
    if (!maps.data) return;
    if (maps.data.some((row) => row.id === mapIdRef.current)) return;
    let remembered = "";
    try { remembered = sessionStorage.getItem(selectionKey) ?? ""; } catch { /* Optional preference storage. */ }
    setMapId(maps.data.find((row) => row.id === remembered)?.id ?? maps.data[0]?.id ?? "");
  }, [maps.data, selectionKey]);
  useEffect(() => {
    if (!mapId) return;
    try { sessionStorage.setItem(selectionKey, mapId); } catch { /* The map itself is saved on the server. */ }
  }, [mapId, selectionKey]);
  useEffect(() => {
    setSelectedId(""); setRendererError("");
  }, [mapId]);
  useEffect(() => {
    setEntryId(selected?.entryId ?? ""); setActorId(""); setShowCreate(false);
    setArticleTitle(selected?.title?.slice(0, 200) ?? ""); setArticleBody(""); task.setError("");
  }, [selectedId]);

  useEffect(() => {
    const current = sceneRef.current;
    if (!current || !host.current) return;
    const controller = new AbortController();
    setRendererReady(false); setRendererError("");
    void createMapRenderer(host.current, current, { signal: controller.signal,
      onCameraChange: (camera) => setZoom(Math.round(camera.scale * 100)),
      onSelect: (hit) => { if (hit?.kind === "pin") setSelectedId(hit.id); },
    }).then((instance) => {
      if (controller.signal.aborted) { instance.destroy(); return; }
      renderer.current = instance;
      if (sceneRef.current) instance.update(sceneRef.current);
      setRendererReady(true);
    }).catch((error: unknown) => { if (!controller.signal.aborted) setRendererError(errorText(error)); });
    return () => { controller.abort(); renderer.current?.destroy(); renderer.current = null; setRendererReady(false); };
  }, [map.data?.id]);
  useEffect(() => {
    if (presentedScene && renderer.current) renderer.current.update(presentedScene);
  }, [presentedScene]);

  function choose(nodeId: string) {
    setSelectedId(nodeId);
    const pin = map.data?.pins.find((p) => p.id === nodeId);
    renderer.current?.select(pin ? { kind: "pin", id: nodeId } : null);
  }
  const refresh = () => setRevision((value) => value + 1);
  async function linkArticle(id: string) {
    if (!map.data || !selected || map.data.version === undefined) throw new Error("Die Karte muss neu geladen werden, bevor sie geändert werden kann.");
    try {
      await api(apiPath(campaignId, `/maps/${pathId(mapId)}/nodes/${pathId(selected.id)}/link`), {
        method: "POST", body: { entryId: id, expectedVersion: map.data.version },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        refresh(); throw new Error("Die Karte wurde zwischenzeitlich geändert. Prüfe den aktuellen Stand und verknüpfe den Artikel erneut.");
      }
      throw error;
    }
    setMessage("Der Artikel ist mit diesem Ort verbunden."); refresh();
  }
  async function importFile(file: File) {
    await task.run(async () => {
      setMessage("");
      if (file.size > 32 * 1024 * 1024) throw new Error("Die Kartendatei darf höchstens 32 MiB groß sein.");
      if (!file.name.toLowerCase().endsWith(".json")) throw new Error("Bitte die Karte in Azgaar als Full JSON exportieren und diese .json-Datei auswählen.");
      const json = await file.text();
      const result = await api<{ id: string; report: ImportReport; unchanged: boolean }>(apiPath(campaignId, "/maps/import"), { method: "POST", body: { json } });
      setMapId(result.id);
      setMessage(result.unchanged ? "Diese Karte ist bereits gespeichert. Ihr bestehender Stand wurde geöffnet."
        : `Karte gespeichert: ${result.report.orte} Orte können jetzt mit euren Geschichten verbunden werden.`);
      refresh();
    });
    if (fileInput.current) fileInput.current.value = "";
  }

  return <section className="atlas-feature" aria-label="Atlas">
    <header className="atlas-heading"><div><p className="eyebrow">Eure Welt, Ort für Ort</p><h1><Compass size={28} aria-hidden="true" /> Atlas</h1><p className="muted">Jede Reise beginnt mit einem Ort.</p></div>
      <div className="atlas-heading-actions"><Button variant="quiet" aria-label="Atlas aktualisieren" disabled={task.busy} onClick={refresh}><RefreshCw size={16} /></Button>
        {gm && <><input ref={fileInput} className="atlas-file-input" type="file" accept=".json,application/json" aria-label="Azgaar-Kartendatei auswählen"
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }} />
          <Button variant="primary" disabled={task.busy} onClick={() => fileInput.current?.click()}><Upload size={16} /> {task.busy ? "Wird gespeichert …" : "Karte importieren"}</Button></>}
      </div></header>
    {task.error && <Notice error>{task.error}</Notice>}
    {message && <Notice>{message}</Notice>}
    {maps.error && <Notice error>{maps.error}</Notice>}
    {maps.loading && <Loading text="Euer Atlas wird geöffnet …" />}
    {!maps.loading && !maps.error && !maps.data?.length && !mapId && <EmptyState title={gm ? "Eine Welt wartet auf ihre Geschichte." : "Deine Reise beginnt hier."}
      action={gm ? <Button variant="primary" onClick={() => fileInput.current?.click()}><Upload size={16} /> Weltkarte auswählen</Button> : undefined}>
      {gm ? "Exportiere deine Welt in Azgaar über Export → Full JSON. Deine Orte werden gespeichert; Artikel legst du gezielt an." : "Sobald die Spielleitung einen Ort für deine Figur freigibt, erscheint er hier."}
    </EmptyState>}
    {!!maps.data?.length && <div className="atlas-map-choice"><Map size={17} aria-hidden="true" /><label htmlFor="atlas-map-select">Weltkarte</label>
      <select id="atlas-map-select" value={mapId} onChange={(event) => { setMapId(event.target.value); setMessage(""); }} disabled={task.busy}>{maps.data.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select>
      <span className="atlas-saved">Auf eurem Server gespeichert</span></div>}
    {map.loading && <Loading text="Karte und Orte werden geladen …" />}
    {map.error && <Notice error>{map.error} <Button variant="quiet" onClick={refresh}>Erneut laden</Button></Notice>}
    {map.data && <div className="atlas-workspace">
      <aside className="atlas-places" aria-label="Orte und Gebiete"><div className="atlas-places-heading"><h2>{map.data.title}</h2><p>Orte &amp; Gebiete</p></div>
        <label className="atlas-search"><Search size={16} aria-hidden="true" /><span className="atlas-sr-only">Orte durchsuchen</span><input type="search" placeholder="Einen Ort finden …" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="atlas-filter"><span className="atlas-sr-only">Art des Ortes</span><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="all">Alle Orte &amp; Gebiete</option><option value="places">Siedlungen</option><option value="regions">Gebiete &amp; Herrschaften</option></select></label>
        <ul className="atlas-place-list">{nodes.map((node) => <li key={node.id}><button type="button" className={node.id === selectedId ? "is-selected" : ""} aria-pressed={node.id === selectedId} onClick={() => choose(node.id)}>
          <span className="atlas-place-symbol" aria-hidden="true">{node.kind === "ort" ? "◆" : "◇"}</span><span><strong>{node.title ?? "Unbenannt"}</strong><small>{kindLabel[node.kind] ?? node.kind}</small></span>{node.entryId && <BookOpen size={14} aria-label="Mit Wiki-Artikel verbunden" />}
        </button></li>)}</ul>{!nodes.length && <p className="atlas-no-results">Keine passenden Orte.</p>}
      </aside>
      <div className="atlas-canvas-column"><div className="atlas-map-frame"><div ref={host} className="atlas-render-host" />
        {!rendererReady && !rendererError && <div className="atlas-canvas-loading"><Loading text="Karte wird gezeichnet …" /></div>}
        {rendererError && <div className="atlas-canvas-fallback"><Compass size={40} /><p>{rendererError}</p><p>Alle verfügbaren Orte findest du in der Ortsliste.</p></div>}
        <div className="atlas-map-tools" aria-label="Kartenansicht"><Button disabled={!rendererReady} aria-label="Karte vergrößern" onClick={() => renderer.current?.zoomAt(1.3)}><Plus size={16} /></Button>
          <span aria-label={`Vergrößerung ${zoom} Prozent`}>{zoom}%</span><Button disabled={!rendererReady} aria-label="Karte verkleinern" onClick={() => renderer.current?.zoomAt(1 / 1.3)}><Minus size={16} /></Button>
          <Button disabled={!rendererReady} aria-label="Gesamte Karte anzeigen" onClick={() => renderer.current?.fit()}><Maximize size={16} /></Button></div>
        <span className="atlas-map-caption">{map.data.title}</span></div><p className="atlas-navigation-hint">Ziehen zum Bewegen · Mausrad zum Zoomen · Orte auch über die Liste öffnen</p>
        {gm && map.data.report && <details className="atlas-import-report"><summary>Importbericht</summary><p>{map.data.report.orte} Orte · {map.data.report.zellen} Kartenzellen</p>
          <p>{map.data.report.unterdrueckteNotizen} Generatornotizen wurden als Quelle aufbewahrt und nicht veröffentlicht.</p>
          {map.data.report.hinweise.map((line) => <p key={line}>{line}</p>)}</details>}
      </div>
      {selected && <aside className="atlas-inspector" aria-label={`Ort: ${selected.title ?? "Unbenannt"}`}><div className="atlas-inspector-top"><span className="eyebrow">{kindLabel[selected.kind] ?? selected.kind}</span><Button variant="quiet" aria-label="Ortsdetails schließen" onClick={() => { setSelectedId(""); renderer.current?.select(null); }}><X size={16} /></Button></div>
        <h2>{selected.title ?? "Unbenannt"}</h2>
        {!!selected.parents.length && <div className="atlas-parents">{selected.parents.map((parent) => {
          const node = map.data!.nodes.find((row) => row.id === parent.id);
          return node ? <button key={`${parent.kind}:${parent.id}`} type="button" onClick={() => choose(node.id)}>{node.title ?? "Unbenannt"}</button> : null;
        })}</div>}
        {selected.entryId ? <Button variant="primary" className="full-width" onClick={() => onOpenEntry(selected.entryId!)}><BookOpen size={16} /> Geschichte öffnen</Button>
          : <p className="atlas-door">Ein Ort mit Raum für eure Geschichte.</p>}
        {gm && <><section className="atlas-inspector-section"><h3><Link size={15} /> Mit dem Wiki verbinden</h3>
          {entries.error && <Notice error>{entries.error}</Notice>}
          <form onSubmit={(event) => { event.preventDefault(); void task.run(() => linkArticle(entryId)); }}><label>Vorhandener Artikel<select value={entryId} onChange={(event) => setEntryId(event.target.value)} required disabled={task.busy || entries.loading}><option value="">Artikel auswählen …</option>{entries.data?.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>
            <Button type="submit" disabled={task.busy || !entryId || map.data.version === undefined}>Artikel verknüpfen</Button></form>
          <Button variant="quiet" onClick={() => setShowCreate((value) => !value)} disabled={task.busy}><Plus size={14} /> Neuen Artikel verfassen</Button>
          {showCreate && <form className="atlas-create-form" onSubmit={(event) => { event.preventDefault(); void task.run(async () => {
            const created = await api<EntryDocument>(apiPath(campaignId, "/entries"), { method: "POST", body: { title: articleTitle.trim(), passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: articleBody.trim(), marks: [] }] }, pfad: [], tags: [] }] } });
            setEntryId(created.entryId); setShowCreate(false); refresh();
            try { await linkArticle(created.entryId); } catch (error) { throw new Error(`Der Artikel wurde gespeichert. Die Verknüpfung fehlt noch: ${errorText(error)}`); }
          }); }}><label>Titel<input required maxLength={200} value={articleTitle} onChange={(event) => setArticleTitle(event.target.value)} /></label><label>Eure erste Passage<textarea required maxLength={64000} rows={5} value={articleBody} onChange={(event) => setArticleBody(event.target.value)} /></label><Button variant="primary" type="submit" disabled={task.busy || !articleTitle.trim() || !articleBody.trim()}>Artikel anlegen &amp; verbinden</Button></form>}
        </section><section className="atlas-inspector-section"><h3><Eye size={16} /> Diesen Ort freigeben</h3><p>Die Freigabe gilt für diesen Ort. Inhalte und weitere Orte werden einzeln freigegeben.</p>
          {roster.error && <Notice error>{roster.error}</Notice>}
          {members.length ? <form onSubmit={(event) => { event.preventDefault(); void task.run(async () => {
            await api(apiPath(campaignId, `/maps/${pathId(mapId)}/nodes/${pathId(selected.id)}/reveal`), { method: "POST", body: { actorId } });
            setMessage(`„${selected.title ?? "Unbenannt"}“ ist für die ausgewählte Figur freigegeben.`); refresh();
          }); }}><label>Figur<select value={actorId} onChange={(event) => setActorId(event.target.value)} required><option value="">Figur auswählen …</option>{members.map((member) => <option key={member.actorId} value={member.actorId!}>{member.displayName}</option>)}</select></label><Button type="submit" disabled={task.busy || !actorId}>Ort freigeben</Button></form>
            : <p className="muted">Sobald Spieler der Runde beigetreten sind, kannst du Orte für sie freigeben.</p>}
        </section></>}
      </aside>}
    </div>}
  </section>;
}
