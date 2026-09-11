// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Compass, DoorOpen, Eye, Globe, Link, Map, Maximize, Minus, Plus, RefreshCw, Search, Upload, X } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { createMapRenderer, imageRasterLayout, type MapCamera, type MapRenderer, type ProjectedMapScene } from "@chronicle/render";
import { api, apiPath, ApiError, errorText, type EntryDocument, type EntrySummary, type Member } from "../api.ts";
import { useResource, useTask } from "../hooks.ts";
import "./AtlasView.css";
import { useAppearance } from "./Appearance";
import { MapEntrance, NestedMapView, type MapAncestor } from "./NestedMapView";
import { TacticalGenerate } from "./TacticalGenerate";
import type { MapDeletionAck, MapReference, TacticalMapSummary } from "@chronicle/protocol";
import { MapLibrary, type MapLibraryItem } from "./MapLibrary";
import { MapContextMenu, type MapContextAction } from "./MapContextMenu";
import { MapDeleteDialog } from "./MapDeleteDialog";
import { locale, plural, t } from "../i18n";

interface AtlasNode { id: string; title: string | null; kind: string; entryId?: string; canEnter?: boolean; childMapId?: string; description?: string; parents: readonly { id: string; kind: string }[] }
interface ImportReport { orte: number; zellen: number; unterdrueckteNotizen: number; hinweise: readonly string[]; ausgelasseneDatensaetze: Record<string, number> }
/** Woher diese Karte kommt. Kommt vom Server aus der Kampagne — nicht mehr aus dem Quelltext. */
interface Kartenherkunft { art: "wiki" | "beispiel" | "bild"; wikiUrl?: string; seitentitel?: string; pageid?: number; revid?: number; lizenz?: string; abgerufenAm: number }
interface AtlasMap extends ProjectedMapScene { title: string; nodes: readonly AtlasNode[]; version?: number; report?: ImportReport; herkunft?: Kartenherkunft; background?: { url: string; width: number; height: number } }
interface KartenErgebnis { id: string; unchanged: boolean; report?: ImportReport; bild: { status: "geholt" | "vorhanden" | "keins" | "fehlgeschlagen"; dateiname?: string; grund?: string } }
interface MapSummary { id: string; title: string }
export interface AtlasViewProps { campaignId: string; role: "leitung" | "spieler" | "beobachter"; onOpenEntry: (id: string) => void; onDirty: (dirty: boolean) => void }
const KARTENART_LABEL: Record<string, string> = { welt: "Welt", landmasse: "Landmasse", macht: "Herrschaft", region: "Region", ort: "Ort", bauwerk: "Bauwerk", raum: "Raum", behaelter: "Behälter", gegenstand: "Gegenstand" };
const pathId = (id: string) => encodeURIComponent(id);

export function AtlasView({ campaignId, role, onOpenEntry, onDirty }: AtlasViewProps) {
  const { resolved } = useAppearance();
  const gm = role === "leitung";
  const selectionKey = `chronicle.atlas-map.${campaignId}`;
  const [mapId, setMapId] = useState("");
  const [childMapId, setChildMapId] = useState(() => gm ? new URLSearchParams(location.search).get("atlasChild") ?? "" : "");
  const [childFocus, setChildFocus] = useState<MapAncestor["focus"]>();
  const [childEditing,setChildEditing] = useState(false), [deleting,setDeleting] = useState<MapReference | null>(null);
  const [canvasMenu,setCanvasMenu] = useState<{ key:number; nodeId?:string; x:number; y:number } | null>(null);
  const [deletedIds,setDeletedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [entryId, setEntryId] = useState("");
  const [actorId, setActorId] = useState("");
  const [articleTitle, setArticleTitle] = useState("");
  const [articleBody, setArticleBody] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [message, setMessage] = useState("");
  const [rendererError, setRendererError] = useState("");
  const [rendererReady, setRendererReady] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [backgroundError, setBackgroundError] = useState("");
  const [showQuelle, setShowQuelle] = useState(false);
  const [wikiAdresse, setWikiAdresse] = useState("");
  const [kartenname, setKartenname] = useState("");
  const cameras = useRef<Record<string, MapCamera>>({});
  const childDirty = useRef(false);
  const navigationUrl = useRef(location.href);
  const reportDirty = useCallback((dirty: boolean) => { childDirty.current = dirty; onDirty(dirty); }, [onDirty]);
  const task = useTask();
  const maps = useResource<MapSummary[]>(apiPath(campaignId, "/maps"), revision, 15000);
  const localMaps = useResource<TacticalMapSummary[]>(gm ? apiPath(campaignId, "/tactical/maps") : null, revision, 15000);
  const availableMaps = useMemo(() => (maps.data ?? []).filter(map => !deletedIds.has(`atlas:${map.id}`)),[maps.data,deletedIds]);
  const libraryMaps = useMemo<MapLibraryItem[]>(() => [
    ...availableMaps.map(map => ({ kind:"atlas" as const,id:map.id,name:map.title })),
    ...(localMaps.data ?? []).filter(map => !deletedIds.has(`tactical:${map.id}`)).map(map => ({ kind:"tactical" as const,id:map.id,name:map.name,revision:map.revision })),
  ],[availableMaps,localMaps.data,deletedIds]);
  const map = useResource<AtlasMap>(mapId ? apiPath(campaignId, `/maps/${pathId(mapId)}`) : null, revision, 10000);
  const roster = useResource<Member[]>(gm ? apiPath(campaignId, "/roster") : null, revision, 15000);
  const entries = useResource<EntrySummary[]>(gm && mapId ? apiPath(campaignId, "/entries") : null, revision);
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<MapRenderer | null>(null);
  const sceneRef = useRef<AtlasMap | null>(null);
  const presentedScene = useMemo(() => map.data ? { ...map.data, rasterSampling: resolved.sampling,
    ...(map.data.background ? { rasterScope: map.data.id } : {}) } : null, [map.data, resolved.sampling]);
  sceneRef.current = presentedScene;
  const mapIdRef = useRef(mapId);
  mapIdRef.current = mapId;
  const fileInput = useRef<HTMLInputElement>(null);
  const bildInput = useRef<HTMLInputElement>(null);
  const selected = map.data?.nodes.find((node) => node.id === selectedId);
  const members = roster.data?.filter((member) => member.actorId) ?? [];
  const nodes = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de");
    return (map.data?.nodes ?? []).filter((node) => (kind === "all" || (kind === "linked" ? !!node.childMapId : kind === "places" ? node.kind === "ort" : node.kind !== "ort"))
      && (!needle || (node.title ?? "Unbenannt").toLocaleLowerCase("de").includes(needle)))
      .sort((a, b) => (a.title ?? "Unbenannt").localeCompare(b.title ?? "Unbenannt", "de"));
  }, [map.data, query, kind]);
  // Was liegt im ausgewählten Ort? Kein eigener Server-Aufruf nötig: jeder Knoten kennt seine Eltern,
  // die Umkehrung ergibt bereits im Client, was ein Ort enthält.
  const children = useMemo(() => (map.data?.nodes ?? []).filter((node) => node.parents.some((parent) => parent.id === selectedId))
    .sort((a, b) => (a.title ?? "Unbenannt").localeCompare(b.title ?? "Unbenannt", "de")), [map.data, selectedId]);

  useEffect(() => {
    setMapId(""); setSelectedId(""); setMessage(""); setQuery(""); setDeleting(null); setDeletedIds(new Set());
  }, [campaignId]);
  useEffect(() => {
    if (!maps.data) return;
    if (availableMaps.some((row) => row.id === mapIdRef.current)) return;
    let remembered = "";
    try { remembered = sessionStorage.getItem(selectionKey) ?? ""; } catch { /* Optional preference storage. */ }
    const fromUrl = new URLSearchParams(location.search).get("atlasMap");
    setMapId(availableMaps.find((row) => row.id === fromUrl)?.id ?? availableMaps.find((row) => row.id === remembered)?.id ?? availableMaps[0]?.id ?? "");
  }, [maps.data, availableMaps, selectionKey]);
  useEffect(() => {
    if (!mapId) return;
    try { sessionStorage.setItem(selectionKey, mapId); } catch { /* The map itself is saved on the server. */ }
  }, [mapId, selectionKey]);
  useEffect(() => {
    setSelectedId(""); setRendererError(""); setCanvasMenu(null);
  }, [mapId]);
  useEffect(() => {
    setEntryId(selected?.entryId ?? ""); setActorId(""); setShowCreate(false);
    setArticleTitle(selected?.title?.slice(0, 200) ?? ""); setArticleBody(""); task.setError("");
  }, [selectedId]);

  function navigateMap(ancestor?: MapAncestor) {
    if (showGenerator && childDirty.current && !window.confirm(t("Ungespeicherte Kartenänderungen verwerfen?"))) return;
    if (renderer.current && mapId) cameras.current[mapId] = renderer.current.getCamera();
    const nextChild = ancestor?.kind === "tactical" ? ancestor.id : "";
    if (ancestor?.kind === "atlas") setMapId(ancestor.id);
    setChildMapId(nextChild); setChildFocus(ancestor?.focus); setChildEditing(!!ancestor?.edit); reportDirty(false);
    const url = new URL(location.href);
    url.searchParams.set("atlasMap", ancestor?.kind === "atlas" ? ancestor.id : mapId);
    if (nextChild) url.searchParams.set("atlasChild", nextChild); else url.searchParams.delete("atlasChild");
    window.history.pushState(null, "", url);
    navigationUrl.current = url.href;
  }
  const navigateRef = useRef(navigateMap); navigateRef.current = navigateMap;
  useEffect(() => {
    const back = () => {
      if (childDirty.current && !window.confirm(t("Ungespeicherte Kartenänderungen verwerfen?"))) { window.history.pushState(null, "", navigationUrl.current); return; }
      const params = new URLSearchParams(location.search);
      if (params.get("atlasMap")) setMapId(params.get("atlasMap")!);
      setChildMapId(gm ? params.get("atlasChild") ?? "" : ""); setChildFocus(undefined); reportDirty(false);
      navigationUrl.current = location.href;
    };
    window.addEventListener("popstate", back); return () => window.removeEventListener("popstate", back);
  }, [gm, reportDirty]);

  useEffect(() => {
    const current = sceneRef.current;
    if (!current || !host.current || childMapId) return;
    const controller = new AbortController();
    setRendererReady(false); setRendererError("");
    void createMapRenderer(host.current, current, { signal: controller.signal,
      onCameraChange: (camera) => setZoom(Math.round(camera.scale * 100)),
      onSelect: (hit) => {
        if (hit?.kind !== "pin") return;
        const node = sceneRef.current?.nodes.find(item => item.id === hit.id);
        if (gm && node?.childMapId) navigateRef.current({ kind: "tactical", id: node.childMapId, title: node.title ?? t("Unterkarte") });
        else setSelectedId(hit.id);
      },
    }).then((instance) => {
      if (controller.signal.aborted) { instance.destroy(); return; }
      renderer.current = instance;
      if (sceneRef.current) instance.update(sceneRef.current);
      if (cameras.current[current.id]) instance.setCamera(cameras.current[current.id]!);
      setRendererReady(true);
    }).catch((error: unknown) => { if (!controller.signal.aborted) setRendererError(errorText(error)); });
    return () => { controller.abort(); renderer.current?.destroy(); renderer.current = null; setRendererReady(false); };
  }, [map.data?.id, childMapId, gm]);
  useEffect(() => {
    if (presentedScene && renderer.current) renderer.current.update(presentedScene);
  }, [presentedScene]);

  useEffect(() => {
    const instance = renderer.current, background = map.data?.background;
    if (!rendererReady || !instance || !background || childMapId) return;
    const controller = new AbortController(), scope = map.data!.id;
    // Das Bild liegt so groß über der Karte, wie die Karte selbst ist. Hier stand eine feste
    // Aufteilung auf 8192 x 8192 — die Maße der einen Karte, die einmal im Programm lag. Jede
    // andere Größe verwarf der Renderer als Ganzes, und sichtbar blieben nur die Marker.
    const layout = imageRasterLayout([map.data!.width, map.data!.height]);
    setBackgroundError("");
    void (async () => {
      const response = await fetch(background.url, { credentials: "same-origin", signal: controller.signal });
      if (!response.ok) { instance.setRasterTiles(scope, []); throw new Error(t("Das Kartenbild konnte nicht geladen werden. Die Ortsmarker bleiben über die Liste erreichbar.")); }
      if (!layout.tiles.length) { instance.setRasterTiles(scope, []); return; }
      // Nicht `response.blob()`: einen großen Antwortkörper legt Chromium als Datei-Blob auf der
      // Platte ab, und bei knappem Plattenplatz scheitert das als „Failed to fetch" — gemessen an
      // einem 10,9-MB-Kartenbild, das als ArrayBuffer vollständig ankam. Ein Blob aus dem Speicher
      // braucht diesen Umweg nicht.
      const blob = new Blob([await response.arrayBuffer()], { type: response.headers.get("content-type") ?? "" });
      const bitmap = await createImageBitmap(blob, { resizeWidth: layout.bitmap[0], resizeHeight: layout.bitmap[1], resizeQuality: "high" });
      const tiles = [];
      try {
        for (const tile of layout.tiles) {
          const image = await createImageBitmap(bitmap, tile.sx, tile.sy, tile.sw, tile.sh);
          // Der Name der Kachel gehört zur Karte, nicht zu einer bestimmten Welt: hier stand
          // einmal `andaria:…`, aus der Zeit, als genau eine Karte im Programm lag.
          tiles.push({ id: `kartenbild:${tile.id}`, left: tile.left, top: tile.top, width: tile.width, height: tile.height, pixelScale: tile.pixelScale, image });
        }
        if (controller.signal.aborted || renderer.current !== instance) { for (const tile of tiles) tile.image.close(); return; }
        instance.setRasterTiles(scope, tiles);
      } catch (error) { for (const tile of tiles) tile.image.close(); throw error; }
      finally { bitmap.close(); }
    })().catch((error: unknown) => { if (!controller.signal.aborted) setBackgroundError(errorText(error)); });
    return () => { controller.abort(); };
  }, [map.data?.background?.url, map.data?.width, map.data?.height, rendererReady, childMapId]);

  function choose(nodeId: string) {
    setSelectedId(nodeId);
    const pin = map.data?.pins.find((p) => p.id === nodeId);
    renderer.current?.select(pin ? { kind: "pin", id: nodeId } : null);
  }
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const requestDelete = (target: MapReference) => { if (!childDirty.current || window.confirm(t("Ungespeicherte Kartenänderungen verwerfen?"))) setDeleting(target); };
  const entranceActions = (node: AtlasNode): MapContextAction[] => node.childMapId && !deletedIds.has(`tactical:${node.childMapId}`) ? [
    { id:"open",label:t("Unterkarte öffnen"),onSelect:() => navigateMap({kind:"tactical",id:node.childMapId!,title:node.title ?? t("Unterkarte")}) },
    { id:"edit",label:t("Unterkarte bearbeiten"),onSelect:() => navigateMap({kind:"tactical",id:node.childMapId!,title:node.title ?? t("Unterkarte"),edit:true}) },
    { id:"delete",label:t("Unterkarte löschen …"),danger:true,onSelect:() => requestDelete({kind:"tactical",id:node.childMapId!}) },
  ] : [{ id:"select",label:t("Ort auswählen"),onSelect:() => choose(node.id) }];
  const menuNode = canvasMenu?.nodeId ? map.data?.nodes.find(node => node.id === canvasMenu.nodeId) : undefined;
  const deleted = (ack: MapDeletionAck) => {
    setDeleting(null); setDeletedIds(old => new Set([...old,...ack.deletedMaps.map(map => `${map.kind}:${map.id}`)])); refresh();
    const removesCurrent = ack.deletedMaps.some(map => map.kind === "atlas" && map.id === mapId || map.kind === "tactical" && map.id === childMapId);
    if (removesCurrent) {
      setSelectedId(""); setShowGenerator(false); reportDirty(false);
      if (ack.parent) navigateMap({ kind:ack.parent.kind,id:ack.parent.id,title:ack.parent.name });
      else {
        setMapId(""); setChildMapId(""); const url = new URL(location.href); url.searchParams.delete("atlasMap"); url.searchParams.delete("atlasChild"); window.history.replaceState(null,"",url); navigationUrl.current=url.href;
      }
    }
    setMessage(plural(ack.deletedMaps.length, "Die Karte wurde gelöscht.", "{n} Karten wurden gelöscht."));
  };
  async function linkArticle(id: string) {
    if (!map.data || !selected || map.data.version === undefined) throw new Error(t("Die Karte muss neu geladen werden, bevor sie geändert werden kann."));
    try {
      await api(apiPath(campaignId, `/maps/${pathId(mapId)}/nodes/${pathId(selected.id)}/link`), {
        method: "POST", body: { entryId: id, expectedVersion: map.data.version },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        refresh(); throw new Error(t("Die Karte wurde zwischenzeitlich geändert. Prüfe den aktuellen Stand und verknüpfe den Artikel erneut."));
      }
      throw error;
    }
    setMessage(t("Der Artikel ist mit diesem Ort verbunden.")); refresh();
  }
  /** Eine Meldung, die auch sagt, was aus dem Bild wurde — eine Karte ohne Bild ist kein Fehler. */
  function meldung(result: KartenErgebnis): string {
    const karte = result.unchanged ? t("Diese Karte ist bereits gespeichert. Ihr bestehender Stand wurde geöffnet.")
      : t("Karte gespeichert: {orte} Orte können jetzt mit euren Geschichten verbunden werden.", { orte: result.report?.orte ?? 0 });
    if (result.bild.status === "geholt") return `${karte} ${t("Das Kartenbild liegt jetzt bei euren Bildern.")}`;
    if (result.bild.status === "fehlgeschlagen") return `${karte} ${t("Das Kartenbild kam nicht an: {grund}", { grund: result.bild.grund ?? "" })}`;
    if (result.bild.status === "keins") return `${karte} ${t("Diese Karte bringt kein eigenes Bild mit.")}`;
    return karte;
  }
  async function holeAusWiki() {
    await task.run(async () => {
      setMessage("");
      const result = await api<KartenErgebnis>(apiPath(campaignId, "/maps/aus-wiki"),
        { method: "POST", body: { wiki: wikiAdresse.trim(), titel: kartenname.trim() } });
      setMapId(result.id); refresh(); setMessage(meldung(result));
    });
  }
  async function importBild(file: File) {
    await task.run(async () => {
      setMessage("");
      if (file.size > 24 * 1024 * 1024) throw new Error(t("Das Kartenbild darf höchstens 24 MiB groß sein."));
      const antwort = await fetch(`${apiPath(campaignId, "/maps/bild")}?dateiname=${encodeURIComponent(file.name)}`, {
        method: "POST", credentials: "same-origin", body: await file.arrayBuffer(),
        headers: { "Content-Type": "application/octet-stream" } });
      const koerper = await antwort.json().catch(() => null) as (KartenErgebnis & { error?: string }) | null;
      if (!antwort.ok) throw new Error(koerper?.error ?? t("Der Server lehnte die Datei ab (Status {status}).", { status: antwort.status }));
      setMapId(koerper!.id); refresh(); setMessage(meldung(koerper!));
    });
    if (bildInput.current) bildInput.current.value = "";
  }
  async function importFile(file: File) {
    await task.run(async () => {
      setMessage("");
      if (file.size > 32 * 1024 * 1024) throw new Error(t("Die Kartendatei darf höchstens 32 MiB groß sein."));
      if (!file.name.toLowerCase().endsWith(".json")) throw new Error(t("Bitte eine Kartendatei im JSON-Format auswählen. Ein Kartenbild geht über „Kartenbild hochladen“."));
      const json = await file.text();
      const result = await api<{ id: string; report: ImportReport; unchanged: boolean }>(apiPath(campaignId, "/maps/import"), { method: "POST", body: { json } });
      setMapId(result.id);
      setMessage(result.unchanged ? t("Diese Karte ist bereits gespeichert. Ihr bestehender Stand wurde geöffnet.")
        : t("Karte gespeichert: {orte} Orte können jetzt mit euren Geschichten verbunden werden.", { orte: result.report.orte }));
      refresh();
    });
    if (fileInput.current) fileInput.current.value = "";
  }

  if (gm && childMapId) return <NestedMapView key={`${campaignId}:${childMapId}`} campaignId={campaignId} mapId={childMapId} revision={revision} initialEditing={childEditing} initialFocus={childFocus}
    onNavigate={navigateMap} onRoot={() => navigateMap()} onChanged={refresh} onDirty={reportDirty} />;

  return <section className="atlas-feature" aria-label={t("Atlas")}>
    {gm && canvasMenu && map.data && (!canvasMenu.nodeId || menuNode) ? <MapContextMenu key={canvasMenu.key} label={menuNode?.title ?? map.data.title}
      actions={menuNode ? entranceActions(menuNode) : [
        { id:"open",label:t("Karte ansehen"),onSelect:() => setSelectedId("") },
        { id:"delete",label:t("Karte löschen …"),danger:true,onSelect:() => requestDelete({kind:"atlas",id:mapId}) },
      ]} popup={{...canvasMenu,onDismiss:() => setCanvasMenu(null)}} /> : null}
    {deleting ? <MapDeleteDialog key={`${deleting.kind}:${deleting.id}`} campaignId={campaignId} target={deleting} onClose={() => setDeleting(null)} onDeleted={deleted} /> : null}
    <header className="atlas-heading"><div><p className="eyebrow">{t("Eure Welt, Ort für Ort")}</p><h1><Compass size={28} aria-hidden="true" /> {t("Atlas")}</h1><p className="muted">{t("Jede Reise beginnt mit einem Ort.")}</p></div>
      <div className="atlas-heading-actions"><Button variant="quiet" aria-label={t("Atlas aktualisieren")} title={t("Atlas aktualisieren")} disabled={task.busy} onClick={refresh}><RefreshCw size={16} /></Button>
        {gm ? <Button aria-expanded={showGenerator} onClick={() => { if (!showGenerator || !childDirty.current || window.confirm(t("Ungespeicherte Kartenänderungen verwerfen?"))) setShowGenerator(value => !value); }}><Map size={16} /> {showGenerator ? t("Kartenwerkstatt schließen") : t("Neue Karte")}</Button> : null}
        {gm && <Button aria-expanded={showQuelle} disabled={task.busy} onClick={() => setShowQuelle(value => !value)}><Globe size={16} /> {showQuelle ? t("Kartenquelle schließen") : t("Karte aus einem Wiki holen")}</Button>}
        {gm && <><input ref={fileInput} className="atlas-file-input" type="file" accept=".json,application/json" aria-label={t("Kartendatei auswählen")}
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }} />
          <Button variant="primary" disabled={task.busy} onClick={() => fileInput.current?.click()}><Upload size={16} /> {task.busy ? t("Wird gespeichert …") : t("Karte importieren")}</Button></>}
      </div></header>
    {task.error && <Notice error>{task.error}</Notice>}
    {message && <Notice>{message}</Notice>}
    {maps.error && <Notice error>{maps.error}</Notice>}
    {gm && showQuelle ? <section className="atlas-quelle" aria-label={t("Karte aus einem Wiki holen")}>
      <h2>{t("Karte aus einem Wiki holen")}</h2>
      <p className="field-help">{t("Gib die Adresse des Wikis und den Namen der Kartenseite an. Wir holen die Karte und ihr Bild von dort und schreiben auf, woher beides stammt. Das passiert nur, wenn du hier auf Holen drückst.")}</p>
      <form onSubmit={(event) => { event.preventDefault(); void holeAusWiki(); }}>
        <label>{t("Adresse des Wikis")}<input type="text" inputMode="url" required value={wikiAdresse} disabled={task.busy}
          placeholder={t("zum Beispiel eron.fandom.com/de")} onChange={(event) => setWikiAdresse(event.target.value)} /></label>
        <label>{t("Name der Kartenseite")}<input type="text" required value={kartenname} disabled={task.busy}
          placeholder={t("zum Beispiel Karte:Andaria")} onChange={(event) => setKartenname(event.target.value)} /></label>
        <Button type="submit" variant="primary" disabled={task.busy || !wikiAdresse.trim() || !kartenname.trim()}><Globe size={16} /> {task.busy ? t("Wird geholt …") : t("Karte holen")}</Button>
      </form>
      <div className="atlas-quelle-weitere">
        <input ref={bildInput} className="atlas-file-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label={t("Kartenbild auswählen")}
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBild(file); }} />
        <Button disabled={task.busy} onClick={() => bildInput.current?.click()}><Upload size={16} /> {t("Kartenbild hochladen")}</Button>
      </div>
      <p className="field-help">{t("Ein Kartenbild wird zur Karte: Bild als Hintergrund, Ortsmarker setzt ihr selbst. So kommen auch Karten aus Zeichenprogrammen herein.")}</p>
    </section> : null}
    {gm && showGenerator ? <TacticalGenerate key={campaignId} campaignId={campaignId} onDirty={reportDirty} onCreated={id => { setShowGenerator(false); refresh(); navigateMap({ kind: "tactical", id, title: t("Neue Karte") }); }} /> : null}
    {gm ? <MapLibrary items={libraryMaps} selected={{kind:"atlas",id:mapId}} disabled={task.busy} onOpen={map => navigateMap({kind:map.kind,id:map.id,title:map.name})}
      onEdit={map => navigateMap({kind:map.kind,id:map.id,title:map.name,edit:map.kind === "tactical"})} onDelete={requestDelete} /> : null}
    {gm && localMaps.error ? <Notice error>{localMaps.error}</Notice> : null}
    {maps.loading && <Loading text={t("Euer Atlas wird geöffnet …")} />}
    {!maps.loading && !maps.error && !maps.data?.length && !mapId && <EmptyState title={gm ? t("Euer Atlas wartet auf die erste Weltkarte.") : t("Deine Reise beginnt hier.")}
      action={gm ? <Button variant="primary" onClick={() => fileInput.current?.click()}><Upload size={16} /> {t("Weltkarte importieren")}</Button> : undefined}>
      {gm ? t("Hol eure Karte aus einem Wiki, lade ein Kartenbild hoch oder importiere eine Kartendatei. An jedem Ort kannst du eine eigene Unterkarte erzeugen oder eine vorhandene Szenenkarte verbinden.") : t("Der Atlas zeigt die Weltkarte eurer Kampagne, aber nur die Orte, die eure Spielleitung für deine Figur freigegeben hat. Sobald der erste Ort freigegeben ist, erscheint er hier.")}
    </EmptyState>}
    {!gm && !!maps.data?.length && <div className="atlas-map-choice"><Map size={17} aria-hidden="true" /><label htmlFor="atlas-map-select">{t("Weltkarte")}</label>
      <select id="atlas-map-select" value={mapId} onChange={(event) => { setMapId(event.target.value); setMessage(""); }} disabled={task.busy}>{maps.data.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select>
      <span className="atlas-saved">{t("Auf eurem Server gespeichert")}</span></div>}
    {map.loading && <Loading text={t("Karte und Orte werden geladen …")} />}
    {map.error && <Notice error>{map.error} <Button variant="quiet" onClick={refresh}>{t("Erneut laden")}</Button></Notice>}
    {map.data && <div className="atlas-workspace">
      <aside className="atlas-places" aria-label={t("Orte und Gebiete")}><div className="atlas-places-heading"><h2>{map.data.title}</h2><p>{t("Orte & Gebiete")}</p></div>
        <label className="atlas-search"><Search size={16} aria-hidden="true" /><span className="atlas-sr-only">{t("Orte durchsuchen")}</span><input type="search" placeholder={t("Einen Ort finden …")} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="atlas-filter"><span className="atlas-sr-only">{t("Art des Ortes")}</span><select value={kind} onChange={(event) => setKind(event.target.value)}><option value="all">{t("Alle Orte & Gebiete")}</option><option value="places">{t("Siedlungen")}</option><option value="regions">{t("Gebiete & Herrschaften")}</option><option value="linked">{t("Mit Unterkarte")}</option></select></label>
        <ul className="atlas-place-list">{nodes.map((node) => { const row = <button type="button" className={node.id === selectedId ? "is-selected" : ""} aria-pressed={node.id === selectedId} onClick={() => choose(node.id)}>
          <span className="atlas-place-symbol" aria-hidden="true">{node.childMapId ? <DoorOpen size={18} /> : node.kind === "ort" ? "◆" : "◇"}</span><span><strong>{node.title ?? t("Unbenannt")}</strong><small>{node.childMapId ? t("Mit Unterkarte") : t(KARTENART_LABEL[node.kind] ?? node.kind)}</small></span>{node.entryId && <BookOpen size={14} aria-label={t("Mit Wiki-Artikel verbunden")} />}
        </button>; return <li key={node.id}>{gm && node.childMapId && !deletedIds.has(`tactical:${node.childMapId}`) ? <MapContextMenu label={node.title ?? t("Unterkarte")} actions={entranceActions(node)}>{row}</MapContextMenu> : row}</li>; })}</ul>{!nodes.length && <p className="atlas-no-results">{t("Keine passenden Orte.")}</p>}
      </aside>
      <div className="atlas-canvas-column"><div className="atlas-map-frame"><div ref={host} className="atlas-render-host" onContextMenu={event => {
        if (!gm || !rendererReady || !renderer.current) return;
        event.preventDefault(); event.stopPropagation(); const bounds=event.currentTarget.getBoundingClientRect();
        const hit=renderer.current.hitTest([event.clientX-bounds.left,event.clientY-bounds.top]);
        const node=hit && map.data?.nodes.find(node => node.id === hit.id);
        setCanvasMenu({ key:performance.now(),nodeId:node?.id,x:event.clientX,y:event.clientY });
      }} onKeyDown={event => {
        if (!gm || !rendererReady || !(event.key === "ContextMenu" || event.shiftKey && event.key === "F10")) return;
        event.preventDefault(); event.stopPropagation(); const bounds=event.currentTarget.getBoundingClientRect();
        setCanvasMenu({ key:performance.now(),nodeId:selected?.id,x:bounds.left+bounds.width/2,y:bounds.top+bounds.height/2 });
      }} />
        {!rendererReady && !rendererError && <div className="atlas-canvas-loading"><Loading text={t("Karte wird gezeichnet …")} /></div>}
        {rendererError && <div className="atlas-canvas-fallback"><Compass size={40} /><p>{rendererError}</p><p>{t("Alle verfügbaren Orte findest du in der Ortsliste.")}</p></div>}
        <div className="atlas-map-tools" aria-label={t("Kartenansicht")}><Button disabled={!rendererReady} aria-label={t("Karte vergrößern")} title={t("Karte vergrößern")} onClick={() => renderer.current?.zoomAt(1.3)}><Plus size={16} /></Button>
          <span aria-label={t("Vergrößerung {zoom} Prozent", { zoom })}>{zoom}%</span><Button disabled={!rendererReady} aria-label={t("Karte verkleinern")} title={t("Karte verkleinern")} onClick={() => renderer.current?.zoomAt(1 / 1.3)}><Minus size={16} /></Button>
          <Button disabled={!rendererReady} aria-label={t("Gesamte Karte anzeigen")} title={t("Gesamte Karte anzeigen")} onClick={() => renderer.current?.fit()}><Maximize size={16} /></Button></div>
        <span className="atlas-map-caption">{map.data.title}</span></div><p className="atlas-navigation-hint">{t("Ziehen zum Bewegen · Mausrad zum Zoomen · Eingangs-Icon: Unterkarte öffnen")}</p>
        {backgroundError ? <Notice error>{backgroundError}</Notice> : null}
        {map.data.herkunft ? <p className="field-help">{t("Woher diese Karte kommt:")}{" "}
          {map.data.herkunft.wikiUrl && map.data.herkunft.seitentitel
            ? <a href={`${map.data.herkunft.wikiUrl}wiki/${encodeURIComponent(map.data.herkunft.seitentitel.replace(/ /g, "_"))}`} target="_blank" rel="noreferrer">{map.data.herkunft.seitentitel}</a>
            : t("Ein hochgeladenes Kartenbild")}
          {map.data.herkunft.revid ? ` · ${t("Fassung {revid}", { revid: map.data.herkunft.revid })}` : ""}
          {` · ${map.data.herkunft.lizenz ?? t("Lizenz nicht angegeben")}`}
          {` · ${t("Geholt am {datum}", { datum: new Date(map.data.herkunft.abgerufenAm).toLocaleDateString(locale()) })}`}</p> : null}
        {gm && map.data.report && <details className="atlas-import-report"><summary>{t("Importbericht")}</summary><p>{t("{orte} Orte · {zellen} Kartenzellen", { orte: map.data.report.orte, zellen: map.data.report.zellen })}</p>
          <p>{t("{anzahl} Generatornotizen wurden als Quelle aufbewahrt und nicht veröffentlicht.", { anzahl: map.data.report.unterdrueckteNotizen })}</p>
          {map.data.report.hinweise.map((line) => <p key={line}>{line}</p>)}</details>}
      </div>
      {selected && <aside className="atlas-inspector" aria-label={t("Ort: {name}", { name: selected.title ?? t("Unbenannt") })}><div className="atlas-inspector-top"><span className="eyebrow">{t(KARTENART_LABEL[selected.kind] ?? selected.kind)}</span><Button variant="quiet" aria-label={t("Ortsdetails schließen")} title={t("Ortsdetails schließen")} onClick={() => { setSelectedId(""); renderer.current?.select(null); }}><X size={16} /></Button></div>
        <h2>{selected.title ?? t("Unbenannt")}</h2>
        {gm && map.data.version !== undefined && (selected.kind === "ort" || selected.childMapId) ? <MapEntrance key={`${mapId}:${selected.id}`} campaignId={campaignId} parentKind="atlas" parentMapId={mapId}
          nodeId={selected.id} title={selected.title ?? t("Unterkarte")} version={map.data.version} canEnter={!!selected.canEnter} childMapId={selected.childMapId}
          defaultArt={map.data.pins.find(pin => pin.id === selected.id)?.icon === "cave" ? "hoehle" : map.data.pins.find(pin => pin.id === selected.id)?.icon === "castle" || map.data.pins.find(pin => pin.id === selected.id)?.icon === "ruin" ? "grundriss" : "siedlung"}
          onOpen={id => navigateMap({ kind: "tactical", id, title: selected.title ?? t("Unterkarte") })} onChanged={refresh} /> : null}
        {!!selected.parents.length && <div className="atlas-hierarchy"><p className="atlas-hierarchy-label">{t("Liegt in")}</p><div className="atlas-parents">{selected.parents.map((parent) => {
          const node = map.data!.nodes.find((row) => row.id === parent.id);
          return node ? <button key={`${parent.kind}:${parent.id}`} type="button" onClick={() => choose(node.id)}>{node.title ?? t("Unbenannt")}</button> : null;
        })}</div></div>}
        {!!children.length && <div className="atlas-hierarchy"><p className="atlas-hierarchy-label">{t("Enthält")}</p><div className="atlas-parents">{children.map((node) => (
          <button key={node.id} type="button" onClick={() => choose(node.id)}>{node.title ?? t("Unbenannt")}</button>
        ))}</div></div>}
        {selected.description ? <section className="atlas-inspector-section atlas-quelltext">
          <h3>{t("Aus der Quelle")}</h3>
          <p>{selected.description}</p>
          <p className="field-help">{t("Übernommener Text der Kartenquelle. Er wird nicht zu einem Artikel und nicht zu Kanon — das entscheidet ihr.")}</p>
        </section> : null}
        {selected.entryId ? <Button variant="primary" className="full-width" onClick={() => onOpenEntry(selected.entryId!)}><BookOpen size={16} /> {t("Geschichte öffnen")}</Button>
          : <p className="atlas-door">{t("Ein Ort mit Raum für eure Geschichte.")}</p>}
        {gm && <><section className="atlas-inspector-section"><h3><Link size={15} /> {t("Mit dem Wiki verbinden")}</h3>
          {entries.error && <Notice error>{entries.error}</Notice>}
          {entries.loading && <Loading text={t("Artikel werden geladen …")} />}
          <form onSubmit={(event) => { event.preventDefault(); void task.run(() => linkArticle(entryId)); }}><label>{t("Vorhandener Artikel")}<select value={entryId} onChange={(event) => setEntryId(event.target.value)} required disabled={task.busy || entries.loading}><option value="">{t("Artikel auswählen …")}</option>{entries.data?.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>
            <Button type="submit" disabled={task.busy || !entryId || map.data.version === undefined}>{t("Artikel verknüpfen")}</Button></form>
          <Button variant="quiet" onClick={() => setShowCreate((value) => !value)} disabled={task.busy}>{showCreate ? <><X size={14} /> {t("Formular schließen")}</> : <><Plus size={14} /> {t("Neuen Artikel verfassen")}</>}</Button>
          {showCreate && <form className="atlas-create-form" onSubmit={(event) => { event.preventDefault(); void task.run(async () => {
            const created = await api<EntryDocument>(apiPath(campaignId, "/entries"), { method: "POST", body: { title: articleTitle.trim(), passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: articleBody.trim(), marks: [] }] }, pfad: [], tags: [] }] } });
            setEntryId(created.entryId); setShowCreate(false); refresh();
            try { await linkArticle(created.entryId); } catch (error) { throw new Error(t("Der Artikel wurde gespeichert. Die Verknüpfung fehlt noch: {fehler}", { fehler: errorText(error) })); }
          }); }}><label>{t("Titel")}<input required maxLength={200} value={articleTitle} onChange={(event) => setArticleTitle(event.target.value)} /></label><label>{t("Eure erste Passage")}<textarea required maxLength={64000} rows={5} value={articleBody} onChange={(event) => setArticleBody(event.target.value)} /></label><Button variant="primary" type="submit" disabled={task.busy || !articleTitle.trim() || !articleBody.trim()}>{t("Artikel anlegen & verbinden")}</Button></form>}
        </section><section className="atlas-inspector-section"><h3><Eye size={16} /> {t("Diesen Ort freigeben")}</h3><p>{t("Die Freigabe gilt für diesen Ort. Inhalte und weitere Orte werden einzeln freigegeben.")}</p>
          {roster.error && <Notice error>{roster.error}</Notice>}
          {roster.loading ? <Loading text={t("Figuren werden geladen …")} /> : members.length ? <form onSubmit={(event) => { event.preventDefault(); void task.run(async () => {
            await api(apiPath(campaignId, `/maps/${pathId(mapId)}/nodes/${pathId(selected.id)}/reveal`), { method: "POST", body: { actorId } });
            setMessage(t("„{name}“ ist für die ausgewählte Figur freigegeben.", { name: selected.title ?? t("Unbenannt") })); refresh();
          }); }}><label>{t("Figur")}<select value={actorId} onChange={(event) => setActorId(event.target.value)} required><option value="">{t("Figur auswählen …")}</option>{members.map((member) => <option key={member.actorId} value={member.actorId!}>{member.displayName}</option>)}</select></label><Button type="submit" disabled={task.busy || !actorId}>{t("Ort freigeben")}</Button></form>
            : <p className="muted">{t("Sobald Spieler der Runde beigetreten sind, kannst du Orte für sie freigeben.")}</p>}
        </section></>}
      </aside>}
    </div>}
  </section>;
}
