// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActorCard, MapDeletionAck, MapReference, TacticalAck, TacticalMapCard, TacticalMapSummary, TacticalPlan, TacticalTokenPlan } from "@chronicle/protocol";
import { type KartenSetting } from "@chronicle/szene";
import { snapMapPoint, type ProjectedMapScene } from "@chronicle/render";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { t } from "../i18n";
import { useResource, useTask } from "../hooks";
import { useCommand, type SceneCard } from "./game-api";
import { TacticalCanvas, type MapCanvasContext } from "./TacticalCanvas";
import { TacticalGenerate } from "./TacticalGenerate";
import { mapDocumentScene, type MapNode } from "./map-generation";

import { MapEditor } from "./MapEditor";
import { MapLibrary, type MapLibraryItem } from "./MapLibrary";
import { MapDeleteDialog } from "./MapDeleteDialog";
import { MapContextMenu } from "./MapContextMenu";
export { MapEditor } from "./MapEditor";

export function TacticalPreparation({ campaignId, revision, onChanged, onDirty }: { campaignId: string; revision: number; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const maps = useResource<TacticalMapSummary[]>(apiPath(campaignId, "/tactical/maps"), revision);
  const [selected, setSelected] = useState(""), [parts, setParts] = useState({ map: false, plan: false, generate: false });
  const [generating, setGenerating] = useState(true);
  const [deleting,setDeleting] = useState<MapReference | null>(null);
  const [canvasMenu,setCanvasMenu] = useState<{key:number;nodeId?:string;x:number;y:number} | null>(null);
  const current = useResource<TacticalMapCard>(selected ? apiPath(campaignId, `/tactical/maps/${selected}`) : null, revision);
  const children = useResource<{nodes:(MapNode & {vorhandeneKarteId:string|null})[];version:number}>(selected ? apiPath(campaignId,`/maps/tactical/${selected}/children`) : null,revision);
  const dirty = parts.map || parts.plan || parts.generate;
  const mapDirty = useCallback((value: boolean) => setParts(v => ({ ...v, map: value })), []), planDirty = useCallback((value: boolean) => setParts(v => ({ ...v, plan: value })), []);
  const generateDirty = useCallback((value: boolean) => setParts(v => ({ ...v, generate: value })), []);
  const changeMode = (next: boolean) => {
    if (next === generating || (dirty && !window.confirm(t("Ungespeicherte Kartenänderungen verwerfen?")))) return;
    setParts({ map: false, plan: false, generate: false }); setGenerating(next);
  };
  const guard = () => !dirty || window.confirm(t("Ungespeicherte Kartenänderungen verwerfen?"));
  const editMap = (map: MapLibraryItem) => { if (guard()) { setParts({ map: false, plan: false, generate: false }); setSelected(map.id); } };
  const openMap = (map: MapLibraryItem) => {
    if (!guard()) return;
    const url = new URL(location.href); url.searchParams.set("stage","atlas"); url.searchParams.set("atlasChild",map.id); location.assign(url.href);
  };
  const canvasContext: MapCanvasContext = (hit,at) => {
    const node=hit && (hit.kind === "pin" || hit.kind === "cell") ? children.data?.nodes.find(node=>node.knotenId===hit.id) : undefined;
    const role=hit?.kind === "cell" ? (current.data?.cartography ?? current.data?.legacyCartography)?.regions.find(region=>region.regionId===hit.id)?.role : undefined;
    const background=role && role !== "building" && role !== "room" && children.loaded && !children.error && children.data?.version === current.data?.version;
    if (hit && (!node && !background || node && !node.vorhandeneKarteId)) { setCanvasMenu(null); return; }
    setCanvasMenu({...at,key:performance.now(),nodeId:node?.knotenId});
  };
  const menuNode=canvasMenu?.nodeId ? children.data?.nodes.find(node=>node.knotenId===canvasMenu.nodeId) : undefined;
  const menuTarget=menuNode?.vorhandeneKarteId ?? (!canvasMenu?.nodeId ? selected : null);
  useEffect(()=>{setCanvasMenu(null);},[selected,current.data?.version]);
  const deleted = (ack: MapDeletionAck) => {
    setDeleting(null);
    if (ack.deletedMaps.some(map => map.kind === "tactical" && map.id === selected)) {
      setParts({ map: false, plan: false, generate: false }); setSelected(ack.parent?.kind === "tactical" ? ack.parent.id : "");
      if (ack.parent?.kind === "atlas") { const url = new URL(location.href); url.searchParams.set("stage","atlas"); url.searchParams.set("atlasMap",ack.parent.id); url.searchParams.delete("atlasChild"); location.assign(url.href); }
    }
    onChanged();
  };
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => () => onDirty(false), [onDirty]);
  return <div className="tactical-preparation"><nav className="workbench-tabs" aria-label={t("Kartenbereiche")}>
    <Button aria-pressed={generating} onClick={() => changeMode(true)}>{t("Neue Karte erzeugen")}</Button>
    <Button aria-pressed={!generating} onClick={() => changeMode(false)}>{t("Kartenbibliothek · {anzahl}", { anzahl: maps.data?.length ?? 0 })}</Button>
  </nav>
    {canvasMenu && current.data && (!canvasMenu.nodeId || menuNode) ? <MapContextMenu key={canvasMenu.key} label={menuNode?.titel ?? current.data.name} popup={{...canvasMenu,onDismiss:()=>setCanvasMenu(null)}} actions={[
      {id:"open",label:menuNode ? t("Unterkarte öffnen") : t("Karte öffnen"),disabled:!menuTarget,onSelect:()=>openMap({kind:"tactical",id:menuTarget!,name:menuNode?.titel ?? current.data!.name})},
      ...(menuTarget ? [{id:"delete",label:menuNode ? t("Unterkarte löschen …") : t("Karte löschen …"),danger:true,onSelect:()=>{if(guard())setDeleting({kind:"tactical",id:menuTarget});}}] : []),
    ]} /> : null}
    {!generating ? <MapLibrary items={(maps.data ?? []).map(map => ({ ...map, kind: "tactical" as const }))} selected={{ kind:"tactical",id:selected }} onOpen={openMap} onEdit={editMap} onDelete={map => { if (guard()) setDeleting(map); }} /> : null}
    {deleting ? <MapDeleteDialog key={`${deleting.kind}:${deleting.id}`} campaignId={campaignId} target={deleting} onClose={() => setDeleting(null)} onDeleted={deleted} /> : null}
    {generating ? <div id="tactical-new-map"><TacticalGenerate campaignId={campaignId} onDirty={generateDirty} onCreated={id => { setParts({ map: false, plan: false, generate: false }); setSelected(id); setGenerating(false); onChanged(); }} /></div> : null}
    {current.data && !generating ? <Button onClick={() => {
      if (dirty && !window.confirm(t("Ungespeicherte Kartenänderungen verwerfen?"))) return;
      const url = new URL(location.href); url.searchParams.set("stage", "atlas"); url.searchParams.set("atlasChild", current.data!.id); location.assign(url.href);
    }}>{t("Karte im Atlas öffnen")}</Button> : null}
    {maps.error || current.error ? <Notice error>{maps.error || current.error}<Button onClick={onChanged}>{t("Erneut laden")}</Button></Notice> : null}
    {!generating ? current.loading ? <Loading /> : current.data ? <><MapEditor key={current.data.id} current={current.data} campaignId={campaignId} onChanged={onChanged} onDirty={mapDirty} onContextMenu={canvasContext} /><ScenePlan key={current.data.id} map={current.data} campaignId={campaignId} revision={revision} onChanged={onChanged} onDirty={planDirty} /></> : <EmptyState title={t("Eine Karte für euren nächsten Abend.")}>{t("Wähle eine gespeicherte Karte oder erzeuge eine neue. Danach kannst du sie bearbeiten und für eine Szene vorbereiten.")}</EmptyState> : null}
  </div>;
}

export function ScenePlan({ campaignId, map, revision, onChanged, onDirty }: { campaignId: string; map: TacticalMapCard; revision: number; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const scenes = useResource<SceneCard[]>(apiPath(campaignId, "/scenes"), revision), actors = useResource<ActorCard[]>(apiPath(campaignId, "/actors"), revision);
  const [selected, setSelected] = useState(""), [dirty, setDirty] = useState(false);
  const plan = useResource<TacticalPlan | null>(selected ? apiPath(campaignId, `/scenes/${selected}/tactical-plan`) : null, revision);
  const report = useCallback((value: boolean) => { setDirty(value); onDirty(value); }, [onDirty]);
  const selectedScene = scenes.data?.find(s => s.id === selected);
  return <section className="panel"><h2>{t("Für eine Szene vorbereiten")}</h2><label>{t("Szene")}<select value={selected} onChange={e => { if (dirty && !window.confirm(t("Ungespeicherte Vorbereitung verwerfen?"))) return; setSelected(e.target.value); }}><option value="">{t("Szene wählen")}</option>{scenes.data?.map(s => <option value={s.id} key={s.id}>{s.name} · {s.status === "active" ? t("Aktiv") : s.status === "prepared" ? t("Vorbereitet") : t("Beendet")}</option>)}</select></label>
    {scenes.error || actors.error || plan.error ? <Notice error>{scenes.error || actors.error || plan.error}</Notice> : null}
    {selectedScene && !plan.loading && (!plan.error || plan.loaded || plan.data !== null) ? <PlanForm key={`${selected}:${map.id}`} campaignId={campaignId} scene={selectedScene} map={map} current={plan.data} actors={actors.data ?? []} onChanged={onChanged} onDirty={report} /> : plan.loading ? <Loading /> : <p className="field-help">{t("Eine neue Szene kannst du in der Tischansicht „Szenen“ anlegen.")}</p>}
  </section>;
}

function PlanForm({ campaignId, scene, map: availableMap, current, actors, onChanged, onDirty }: { campaignId: string; scene: SceneCard; map: TacticalMapCard; current: TacticalPlan | null; actors: ActorCard[]; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const [map, setMap] = useState(availableMap);
  const mapDetails = useResource<{ setting?: KartenSetting }>(apiPath(campaignId, `/maps/tactical/${map.id}/children`), availableMap.version);
  const [baseline, setBaseline] = useState(current), [tokens, setTokens] = useState<TacticalTokenPlan[]>(current?.mapId === map.id ? current.tokens : []), [actorId, setActorId] = useState("");
  const task = useTask(), command = useCommand(), mounted = useRef(true);
  const [snap, setSnap] = useState(true);
  const dirty = JSON.stringify(tokens) !== JSON.stringify(baseline?.mapId === map.id ? baseline.tokens : []);
  const replace = (next: TacticalPlan | null) => { setBaseline(next); setTokens(next?.mapId === map.id ? next.tokens : []); };
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => { mounted.current = true; return () => { mounted.current = false; onDirty(false); }; }, [onDirty]);
  useEffect(() => { if (!dirty && (current?.version ?? 0) > (baseline?.version ?? 0)) replace(current); }, [current, dirty, baseline]);
  useEffect(() => { if (!dirty && availableMap.revision > map.revision) setMap(availableMap); }, [availableMap, dirty, map.revision]);
  const preview = useMemo<ProjectedMapScene>(() => ({ ...mapDocumentScene(`plan:${scene.id}:${map.id}`, map.document, [], undefined, map.document.background ? map.rasterDigest ?? map.contentHash : undefined, mapDetails.data?.setting, map.cartography ?? map.legacyCartography),
    tokens: tokens.map(token => ({ id: token.id, x: token.x, y: token.y, label: actors.find(a => a.id === token.actorId)?.name ?? t("Figur"), movable: !task.busy, radius: Math.min(40, Math.max(7, 11 * token.scale)) })),
  }), [scene.id, map, tokens, actors, task.busy, mapDetails.data?.setting]);
  return <form onSubmit={e => { e.preventDefault(); if (baseline && baseline.mapId !== map.id && !window.confirm(t("Die bisherige Szenenkarte und ihre vorbereiteten Positionen ersetzen?"))) return; void task.run(async () => {
    await command<TacticalAck>(apiPath(campaignId, `/scenes/${scene.id}/tactical-plan`), { expectedVersion: baseline?.version ?? 0, mapId: map.id, mapRevision: map.revision, tokens }, "PUT");
    const next = await api<TacticalPlan>(apiPath(campaignId, `/scenes/${scene.id}/tactical-plan`)); if (mounted.current) { replace(next); onChanged(); }
  }); }}><fieldset className="tactical-command-fields" disabled={task.busy}><p>{t("Vorbereitung:")} <strong>{map.name} · {t("Revision {revision}", { revision: map.revision })}</strong>. {t("Speichern gilt für den nächsten Szenenstart.")}</p>
    {baseline?.unavailable === "map-deleted" ? <Notice error>{t("Die bisherige Szenenkarte wurde gelöscht. Speichere diese Vorbereitung mit einer vorhandenen Karte, bevor du die Szene beginnst.")}</Notice> : null}
    {availableMap.revision > map.revision ? <Notice>{t("Eine neuere Kartenrevision liegt vor. Dein Entwurf bleibt auf Revision {revision}.", { revision: map.revision })} <Button onClick={() => { if (window.confirm(t("Zur neuen Kartenrevision wechseln und die vorbereiteten Positionen beibehalten?"))) setMap(availableMap); }}>{t("Neue Kartenrevision verwenden")}</Button></Notice> : null}
    <label className="check-label"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} /> {t("Vorbereitete Figuren am Raster einrasten")}</label>
    <TacticalCanvas scene={preview} tileBase={apiPath(campaignId, `/tactical/maps/${map.id}/tiles`)} tileQuery={`revision=${map.revision}&layer=background`} onMove={(id, point) => { if (task.busy) return; const at = snap ? snapMapPoint(point, map.document.grid) : point; setTokens(old => old.map(t => t.id === id ? { ...t, x: at[0], y: at[1] } : t)); }} />
    {baseline?.mapId && baseline.mapId !== map.id ? <Notice>{t("Diese Szene verwendet bisher eine andere Karte. Beim Speichern wird sie durch die hier ausgewählte Karte ersetzt.")}</Notice> : null}
    {(current?.version ?? 0) > (baseline?.version ?? 0) ? <Notice>{t("Die Vorbereitung wurde inzwischen geändert.")} <Button onClick={() => { if (!dirty || window.confirm(t("Ungespeicherte Vorbereitung verwerfen?"))) replace(current); }}>{t("Aktuellen Plan übernehmen")}</Button></Notice> : null}
    <label>{t("Figur platzieren")}<select value={actorId} onChange={e => setActorId(e.target.value)}><option value="">{t("Figur wählen")}</option>{actors.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label>
    <Button disabled={!actorId || tokens.length >= 1000} onClick={() => setTokens(old => [...old, { id: crypto.randomUUID(), actorId, x: map.document.geometry.size[0] / 2, y: map.document.geometry.size[1] / 2, elevation: map.document.elevation, rotation: 0, scale: 1 }])}>{t("Figur zur Vorbereitung hinzufügen")}</Button>
    <div className="tactical-token-list">{tokens.map(token => <div className="tactical-token" key={token.id}><h4>{actors.find(a => a.id === token.actorId)?.name ?? t("Nicht mehr verfügbare Figur")}</h4><div className="rule-fields">{([[
      "x", "X"], ["y", "Y"], ["elevation", t("Höhe")], ["rotation", t("Drehung (Radiant)")], ["scale", t("Größe")],
    ] as const).map(([id, label]) => <label key={id}>{label}<input type="number" step="any" required min={id === "scale" ? .001 : -1e9} max={id === "scale" ? 1e6 : 1e9} value={token[id]} onChange={e => setTokens(old => old.map(t => t.id === token.id ? { ...t, [id]: e.target.valueAsNumber } : t))} /></label>)}</div><Button onClick={() => setTokens(old => old.filter(item => item.id !== token.id))}>{t("Aus der Vorbereitung entfernen")}</Button></div>)}</div>
    <Button type="submit" variant="primary">{t("Karte & Figuren für Szene speichern")}</Button>
    {scene.status !== "active" ? <Button disabled={dirty || !baseline || !!baseline.unavailable || baseline.mapId !== map.id || baseline.mapRevision !== map.revision} onClick={() => void task.run(async () => { await api(apiPath(campaignId, `/scenes/${scene.id}/start`), { method: "POST", body: { expectedSceneVersion: scene.version, expectedPlanVersion: baseline?.version ?? 0 } }); if (mounted.current) onChanged(); })}>{t("Vorbereitete Szene beginnen")}</Button> : <p className="field-help">{t("Die Szene läuft bereits. Ihre Karte und Positionen bleiben von dieser Vorbereitung getrennt.")}</p>}
    </fieldset>{task.error ? <Notice error>{task.error}</Notice> : null}
  </form>;
}
