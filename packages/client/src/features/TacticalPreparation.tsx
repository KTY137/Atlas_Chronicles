// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActorCard, TacticalAck, TacticalAnchor, TacticalMapCard, TacticalMapSummary, TacticalPlan, TacticalTokenPlan } from "@chronicle/protocol";
import { TACTICAL_MAP_LIMITS, type KartenSetting, type TacticalMapDocumentV1, type TacticalPoint } from "@chronicle/szene";
import { snapMapPoint, type ProjectedMapScene } from "@chronicle/render";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, ApiError, plainText, type EntryDocument, type EntrySummary } from "../api";
import { useResource, useTask } from "../hooks";
import { useCommand, type SceneCard } from "./game-api";
import { TacticalCanvas } from "./TacticalCanvas";
import { TacticalGenerate } from "./TacticalGenerate";
import { TacticalEntitiesEditor } from "./TacticalEntitiesEditor";
import { mapObjectWindow, objectKey, preparationObjects } from "./tactical-entities";
import { mapDocumentScene, type MapNode } from "./map-generation";
import { MapArtworkPalette } from "./MapArtworkPalette";
import { placeArtwork, type ArtworkBrush } from "./map-artwork";

export function TacticalPreparation({ campaignId, revision, onChanged, onDirty }: { campaignId: string; revision: number; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const maps = useResource<TacticalMapSummary[]>(apiPath(campaignId, "/tactical/maps"), revision);
  const [selected, setSelected] = useState(""), [parts, setParts] = useState({ map: false, plan: false });
  const [generating, setGenerating] = useState(false);
  const current = useResource<TacticalMapCard>(selected ? apiPath(campaignId, `/tactical/maps/${selected}`) : null, revision);
  const dirty = parts.map || parts.plan;
  const mapDirty = useCallback((value: boolean) => setParts(v => ({ ...v, map: value })), []), planDirty = useCallback((value: boolean) => setParts(v => ({ ...v, plan: value })), []);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => () => onDirty(false), [onDirty]);
  return <div className="tactical-preparation"><div className="page-heading"><label>Szenenkarte<select value={selected} disabled={generating} onChange={e => { if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return; setParts({ map: false, plan: false }); setSelected(e.target.value); }}><option value="">Karte wählen</option>{maps.data?.map(m => <option key={m.id} value={m.id}>{m.name} · Revision {m.revision}</option>)}</select></label>
    <Button aria-expanded={generating} aria-controls="tactical-new-map" disabled={dirty} onClick={() => setGenerating(value => !value)}>{generating ? "Zurück zur Kartenbearbeitung" : "Neue Karte"}</Button></div>
    {dirty ? <p className="field-help">Speichere oder verwirf den aktuellen Entwurf, bevor du eine neue Karte erzeugst.</p> : null}
    {generating ? <div id="tactical-new-map"><TacticalGenerate campaignId={campaignId} onCreated={id => { setParts({ map: false, plan: false }); setSelected(id); setGenerating(false); onChanged(); }} /></div> : null}
    {current.data && !generating ? <Button onClick={() => {
      if (dirty && !window.confirm("Ungespeicherte Kartenänderungen verwerfen?")) return;
      const url = new URL(location.href); url.searchParams.set("stage", "atlas"); url.searchParams.set("atlasChild", current.data!.id); location.assign(url.href);
    }}>Karte im Atlas öffnen</Button> : null}
    {maps.error || current.error ? <Notice error>{maps.error || current.error}</Notice> : null}
    {!generating ? current.loading ? <Loading /> : current.data ? <><MapEditor key={current.data.id} current={current.data} campaignId={campaignId} onChanged={onChanged} onDirty={mapDirty} /><ScenePlan key={current.data.id} map={current.data} campaignId={campaignId} revision={revision} onChanged={onChanged} onDirty={planDirty} /></> : <EmptyState title="Eine Karte für euren nächsten Abend.">Erzeuge über „Neue Karte“ eine Siedlung, einen Grundriss oder eine Höhle, oder wähle eine importierte Karte. Danach kannst du sie bearbeiten und für eine Szene vorbereiten.</EmptyState> : null}
  </div>;
}

export function MapEditor({ current, campaignId, onChanged, onDirty }: { current: TacticalMapCard; campaignId: string; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const [baseline, setBaseline] = useState(current), [document, setDocument] = useState(current.document), [anchors, setAnchors] = useState(current.anchors);
  const [drawing, setDrawing] = useState(false), [points, setPoints] = useState<TacticalPoint[]>([]), [regionId, setRegionId] = useState(""), [entryId, setEntryId] = useState(""), [passageId, setPassageId] = useState("");
  const [pointX, setPointX] = useState(0), [pointY, setPointY] = useState(0), [exportInfo, setExportInfo] = useState("");
  const [selectedObject, setSelectedObject] = useState(""), [marking, setMarking] = useState(false);
  const [brush, setBrush] = useState<ArtworkBrush | null>(null);
  const entries = useResource<EntrySummary[]>(apiPath(campaignId, "/entries"));
  const children = useResource<{ nodes: MapNode[]; art?: string; setting?: KartenSetting }>(apiPath(campaignId, `/maps/tactical/${current.id}/children`), current.version);
  const article = useResource<EntryDocument>(entryId ? apiPath(campaignId, `/entries/${entryId}`) : null);
  const task = useTask(), command = useCommand(), mounted = useRef(true);
  const dirty = JSON.stringify({ document, anchors }) !== JSON.stringify({ document: baseline.document, anchors: baseline.anchors }) || points.length > 0;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => { mounted.current = true; return () => { mounted.current = false; onDirty(false); }; }, [onDirty]);
  const replace = (map: TacticalMapCard) => { setBaseline(map); setDocument(map.document); setAnchors(map.anchors); setPoints([]); setDrawing(false); setMarking(false); setBrush(null); setSelectedObject(""); setRegionId(""); setEntryId(""); setPassageId(""); };
  useEffect(() => { if (!dirty && current.version > baseline.version) replace(current); }, [current, dirty, baseline.version]);
  const objects = useMemo(() => preparationObjects(document, anchors, entries.data ?? []), [document, anchors, entries.data]);
  const visibleObjects = useMemo(() => mapObjectWindow(objects, selectedObject, document.geometry.size[0], document.geometry.size[1]), [objects, selectedObject, document.geometry.size]);
  const nodes = useMemo(() => {
    const regions = new Set(document.geometry.regions.map(region => region.id));
    return (children.data?.nodes ?? []).filter(node => regions.has(node.knotenId));
  }, [children.data, document.geometry.regions]);
  const nodesById = useMemo(() => new Map(nodes.map(node => [node.knotenId, node])), [nodes]);
  const selectedNode = nodes.find(node => `node:${node.knotenId}` === selectedObject);
  const focusedObject = selectedNode ?? visibleObjects.find(o => objectKey(o) === selectedObject);
  const scene = useMemo<ProjectedMapScene>(() => {
    const projected = mapDocumentScene(baseline.id, document, nodes, children.data?.art, document.background ? baseline.contentHash : undefined, children.data?.setting);
    return { ...projected,
      cells: projected.cells.map(cell => ({ ...cell, ...(cell.surface !== "building" && anchors.some(anchor => anchor.targetKind === "region" && anchor.targetId === cell.id) ? { fill: 0x60bb8d } : {}) })),
      pins: [...projected.pins.map(pin => ({ ...pin, id: `node:${pin.id}` })),
        ...visibleObjects.filter(object => object.kind === "place" || object.entryId || objectKey(object) === selectedObject)
          .map(object => ({ id: objectKey(object), x: object.x, y: object.y, label: object.label, ...(object.entryId ? { entryId: object.entryId } : {}) }))],
      lines: [...projected.lines ?? [], ...(points.length >= 2 ? [{ id: "draft-region", points, color: 0xffffff }] : [])],
    };
  }, [baseline, document, nodes, children.data?.art, children.data?.setting, anchors, points, visibleObjects, selectedObject]);
  const selectRegion = (id: string) => {
    setRegionId(id); setSelectedObject(nodesById.has(id) ? `node:${id}` : "");
    const binding = anchors.find(anchor => anchor.targetKind === "region" && anchor.targetId === id);
    setEntryId(binding?.entryId ?? ""); setPassageId(binding?.passageId ?? "");
  };
  const addPoint = (p: TacticalPoint) => {
    if (task.busy || p[0] < 0 || p[1] < 0 || p[0] > scene.width || p[1] > scene.height) return;
    if (brush) {
      const stamp = placeArtwork(document, brush, p, crypto.randomUUID());
      if (stamp && document.geometry.stamps.length < TACTICAL_MAP_LIMITS.stamps) {
        setDocument(old => old.geometry.stamps.length >= TACTICAL_MAP_LIMITS.stamps ? old : { ...old, geometry: { ...old.geometry, stamps: [...old.geometry.stamps, stamp] } });
        setSelectedObject(`stamp:${stamp.id}`);
      }
    }
    else if (marking && document.geometry.places.length < TACTICAL_MAP_LIMITS.places) { const id = crypto.randomUUID(); setDocument(old => ({ ...old, geometry: { ...old.geometry, places: [...old.geometry.places, { id, x: p[0], y: p[1] }] } })); setSelectedObject(`place:${id}`); setMarking(false); }
    else if (drawing) setPoints(old => [...old, p]);
  };
  const bind = () => { if (!regionId || !entryId) return; setAnchors(old => [...old.filter(a => !(a.targetKind === "region" && a.targetId === regionId)), { targetKind: "region", targetId: regionId, entryId, passageId: passageId || null }]); };
  const save = () => void task.run(async () => {
    try {
      await command<TacticalAck>(apiPath(campaignId, `/tactical/maps/${baseline.id}/revision`), { expectedVersion: baseline.version, document, anchors }, "PUT");
    } catch (error) { if (error instanceof ApiError && error.status === 409 && mounted.current) onChanged(); throw error; }
    const next = await api<TacticalMapCard>(apiPath(campaignId, `/tactical/maps/${baseline.id}`)); if (mounted.current) { replace(next); onChanged(); }
  });
  return <section className="panel"><div className="page-heading"><div><h2>{baseline.name}</h2><p className="field-help">Kartenrevision {baseline.revision}. Die Regionsauswahl zeigt eure Wissensverknüpfungen. Eine laufende Szene behält ihre bereits begonnene Revision.</p></div><div className="button-row"><Button disabled={task.busy || !dirty} onClick={() => { if (window.confirm("Alle ungespeicherten Kartenänderungen und gezeichneten Eckpunkte verwerfen?")) replace(baseline); }}>Entwurf zurücksetzen</Button><Button disabled={task.busy || !dirty || points.length > 0} variant="primary" onClick={save}>Kartenrevision speichern</Button></div></div>
    {current.version > baseline.version ? <Notice>Eine neue Revision liegt vor. <Button onClick={() => { if (!dirty || window.confirm("Ungespeicherte Kartenänderungen verwerfen?")) replace(current); }}>Aktuelle Karte übernehmen</Button></Notice> : null}
    <TacticalCanvas scene={scene} tileBase={apiPath(campaignId, `/tactical/maps/${baseline.id}/tiles`)} tileQuery={`revision=${baseline.revision}`} onPoint={addPoint} selection={focusedObject ? { kind: "pin", id: selectedObject } : regionId ? { kind: "cell", id: regionId } : null} focusObject={focusedObject ? { id: selectedObject, x: focusedObject.x, y: focusedObject.y } : null} onSelect={hit => {
      if (task.busy || drawing || marking || brush) return;
      if (hit?.kind === "cell") selectRegion(hit.id);
      else if (hit?.kind === "pin" && hit.id.startsWith("node:")) selectRegion(hit.id.slice(5));
      else { setSelectedObject(hit?.kind === "pin" ? hit.id : ""); setRegionId(""); }
    }} />
    {brush ? <Notice>Auf die Karte klicken, um „{brush.asset.name.replaceAll("_", " ")}“ zu platzieren. <Button onClick={() => setBrush(null)}>Platzieren beenden</Button></Notice> : null}
    <fieldset className="tactical-command-fields" disabled={task.busy}><MapArtworkPalette document={document} brush={brush} onBrush={next => { setBrush(next); setDrawing(false); setMarking(false); }} selected={selectedObject.startsWith("stamp:") ? selectedObject.slice(6) : ""}
      onSelect={id => setSelectedObject(id ? `stamp:${id}` : "")} onUpdate={stamp => setDocument(old => ({ ...old, geometry: { ...old.geometry, stamps: old.geometry.stamps.map(item => item.id === stamp.id ? stamp : item) } }))}
      onRemove={id => {
        setDocument(old => ({ ...old, geometry: { ...old.geometry, stamps: old.geometry.stamps.filter(item => item.id !== id) }, geometryElevation: old.geometryElevation.filter(item => item.targetKind !== "stamp" || item.targetId !== id) }));
        setAnchors(old => old.filter(anchor => anchor.targetKind !== "stamp" || anchor.targetId !== id)); setSelectedObject("");
      }} /></fieldset>
    {selectedNode ? <div className="tactical-object-selected"><strong>{selectedNode.titel}</strong>{selectedNode.bauwerk?.beschreibung ? <p>{selectedNode.bauwerk.beschreibung}</p> : null}<p className="field-help">Hier verknüpfst du das Gebäude oder den Raum mit eurem Wissen. Namen, Gebäudetyp und Unterkarte bearbeitest du in der Atlasansicht.</p></div> : null}
    {children.error ? <Notice error>Die Gebäudenamen konnten nicht geladen werden. {children.error}</Notice> : null}
    {visibleObjects.length < objects.length ? <Notice>{visibleObjects.length} von {objects.length} Objekten auf der Karte. Die vollständige Liste unten bleibt durchsuchbar; ihre Auswahl wird auf der Karte gezeigt, sofern ihre Position innerhalb der Karte liegt.</Notice> : null}
    <fieldset className="tactical-command-fields" disabled={task.busy}><div className="tactical-prep-columns"><section><h3>Wissensregionen</h3><p className="field-help">Zeichne eine Region, indem du ihre Eckpunkte auf der Karte anklickst, oder trage die Koordinaten ein. Die Liste funktioniert auch ohne Grafikbeschleunigung.</p>
      <Button aria-pressed={drawing} onClick={() => { setBrush(null); setMarking(false); setDrawing(v => !v); }}>{drawing ? "Zeichnen pausieren" : "Region zeichnen"}</Button>
      <div className="rule-fields"><label>Eckpunkt X<input type="number" min={0} max={scene.width} value={pointX} onChange={e => setPointX(e.target.valueAsNumber)} /></label><label>Eckpunkt Y<input type="number" min={0} max={scene.height} value={pointY} onChange={e => setPointY(e.target.valueAsNumber)} /></label></div>
      <Button disabled={!Number.isFinite(pointX) || !Number.isFinite(pointY)} onClick={() => { setBrush(null); setMarking(false); setDrawing(true); if (pointX >= 0 && pointY >= 0 && pointX <= scene.width && pointY <= scene.height) setPoints(old => [...old, [pointX, pointY]]); }}>Eckpunkt hinzufügen</Button>
      {points.length ? <><p>{points.length} Eckpunkte vorbereitet.</p><ol className="tactical-points">{points.map((p, i) => <li key={i}>{p[0].toFixed(1)}, {p[1].toFixed(1)} <Button aria-label={`Eckpunkt ${i + 1} entfernen`} onClick={() => setPoints(old => old.filter((_, index) => index !== i))}>Entfernen</Button></li>)}</ol><div className="button-row"><Button disabled={points.length < 3} onClick={() => { const id = crypto.randomUUID(); setDocument(old => ({ ...old, geometry: { ...old.geometry, regions: [...old.geometry.regions, { id, punkte: points }] } })); setRegionId(id); setPoints([]); setDrawing(false); }}>Region schließen</Button><Button onClick={() => { setPoints([]); setDrawing(false); }}>Zeichnung verwerfen</Button></div></> : null}
      <label>Region auswählen<select value={regionId} onChange={e => selectRegion(e.target.value)}><option value="">Region wählen</option>{document.geometry.regions.map((r, i) => <option value={r.id} key={r.id}>{nodesById.get(r.id)?.titel ?? `Region ${i + 1}`}{anchors.some(a => a.targetKind === "region" && a.targetId === r.id) ? " · Verknüpft" : " · Privat"}</option>)}</select></label>
      <label>Wissen aus Artikel<select value={entryId} onChange={e => { setEntryId(e.target.value); setPassageId(""); }}><option value="">Artikel wählen</option>{entries.data?.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
      <label>Erforderliche Passage<select value={passageId} onChange={e => setPassageId(e.target.value)}><option value="">Eine bekannte Passage des Artikels genügt</option>{article.data?.passagen.map((p, i) => <option key={p.pid} value={p.pid}>{i + 1}. {plainText(p.inhalt).slice(0, 100)}</option>)}</select></label>
      <div className="button-row"><Button disabled={!regionId || !entryId} onClick={bind}>Region mit Wissen verknüpfen</Button><Button disabled={!regionId} onClick={() => setAnchors(old => old.filter(a => !(a.targetKind === "region" && a.targetId === regionId)))}>Verknüpfung lösen</Button></div>
      {entries.error || article.error ? <Notice error>{entries.error || article.error}</Notice> : null}
    </section><section><h3>Raster & Maßstab</h3><label>Raster<select aria-label="Kartenraster" value={document.grid.kind} onChange={e => setDocument(old => ({ ...old, grid: e.target.value === "none" ? { kind: "none" } : e.target.value === "hex" ? { kind: "hex", size: 100, origin: [0, 0], orientation: "pointy", offset: "odd" } : { kind: "square", size: 100, origin: [0, 0] } }))}><option value="square">Quadratisch</option><option value="hex">Sechseckig</option><option value="none">Ohne Raster</option></select></label>
      {document.grid.kind !== "none" ? <label>{document.grid.kind === "hex" ? "Hex-Radius in Pixeln" : "Zellgröße in Pixeln"}<input type="number" min={.001} step="any" value={document.grid.size} onChange={e => { const value = e.target.valueAsNumber; setDocument(old => old.grid.kind === "none" ? old : { ...old, grid: { ...old.grid, size: value } }); }} /></label> : null}
      {document.grid.kind === "hex" ? <label>Hex-Ausrichtung<select value={document.grid.orientation} onChange={e => setDocument(old => old.grid.kind !== "hex" ? old : { ...old, grid: { ...old.grid, orientation: e.target.value as "pointy" | "flat" } })}><option value="pointy">Spitze oben</option><option value="flat">Flache Seite oben</option></select></label> : null}
      <label>Welteinheiten pro Pixel<input type="number" min={.000001} step="any" value={document.frame.einheitenProPixel} onChange={e => setDocument(old => ({ ...old, frame: { ...old.frame, einheitenProPixel: e.target.valueAsNumber } }))} /></label>
      <label>Grundhöhe<input type="number" step="any" value={document.elevation} onChange={e => setDocument(old => ({ ...old, elevation: e.target.valueAsNumber }))} /></label>
      <p className="field-help">Raster und Höhe helfen bei der Platzierung. Wände, Licht und Portale bleiben Daten; daraus wird keine automatische Sicht oder Bewegungssperre berechnet.</p>
      <Button onClick={() => void task.run(async () => { const exported = await api<{ json: string; fidelity: { issues: { message: string }[] } }>(apiPath(campaignId, `/tactical/maps/${baseline.id}/uvtt?revision=${baseline.revision}`)); const blob = new Blob([exported.json], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = window.document.createElement("a"); a.href = url; a.download = "scene.dd2vtt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); if (mounted.current) setExportInfo(exported.fidelity.issues.map(i => i.message).join(" ") || "Die gespeicherte Karte wurde exportiert."); })}>Gespeicherte Revision als UVTT exportieren</Button>{exportInfo ? <Notice>{exportInfo}</Notice> : null}
    </section></div><TacticalEntitiesEditor campaignId={campaignId} document={document} anchors={anchors} objects={objects} entries={entries.data ?? []} selected={selectedObject} onSelect={setSelectedObject} marking={marking} onMarking={value => { setBrush(null); setMarking(value); setDrawing(false); }} onChange={(next, bindings) => { setDocument(next); setAnchors(bindings); }} /></fieldset>{task.error ? <Notice error>{task.error}</Notice> : null}
  </section>;
}

export function ScenePlan({ campaignId, map, revision, onChanged, onDirty }: { campaignId: string; map: TacticalMapCard; revision: number; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const scenes = useResource<SceneCard[]>(apiPath(campaignId, "/scenes"), revision), actors = useResource<ActorCard[]>(apiPath(campaignId, "/actors"), revision);
  const [selected, setSelected] = useState(""), [dirty, setDirty] = useState(false);
  const plan = useResource<TacticalPlan | null>(selected ? apiPath(campaignId, `/scenes/${selected}/tactical-plan`) : null, revision);
  const report = useCallback((value: boolean) => { setDirty(value); onDirty(value); }, [onDirty]);
  const selectedScene = scenes.data?.find(s => s.id === selected);
  return <section className="panel"><h2>Für eine Szene vorbereiten</h2><label>Szene<select value={selected} onChange={e => { if (dirty && !window.confirm("Ungespeicherte Vorbereitung verwerfen?")) return; setSelected(e.target.value); }}><option value="">Szene wählen</option>{scenes.data?.map(s => <option value={s.id} key={s.id}>{s.name} · {s.status === "active" ? "Aktiv" : s.status === "prepared" ? "Vorbereitet" : "Beendet"}</option>)}</select></label>
    {scenes.error || actors.error || plan.error ? <Notice error>{scenes.error || actors.error || plan.error}</Notice> : null}
    {selectedScene && !plan.loading && (!plan.error || plan.loaded || plan.data !== null) ? <PlanForm key={`${selected}:${map.id}`} campaignId={campaignId} scene={selectedScene} map={map} current={plan.data} actors={actors.data ?? []} onChanged={onChanged} onDirty={report} /> : plan.loading ? <Loading /> : <p className="field-help">Eine neue Szene kannst du in der Tischansicht „Szenen“ anlegen.</p>}
  </section>;
}

function PlanForm({ campaignId, scene, map: availableMap, current, actors, onChanged, onDirty }: { campaignId: string; scene: SceneCard; map: TacticalMapCard; current: TacticalPlan | null; actors: ActorCard[]; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const [map, setMap] = useState(availableMap);
  const [baseline, setBaseline] = useState(current), [tokens, setTokens] = useState<TacticalTokenPlan[]>(current?.mapId === map.id ? current.tokens : []), [actorId, setActorId] = useState("");
  const task = useTask(), command = useCommand(), mounted = useRef(true);
  const [snap, setSnap] = useState(true);
  const dirty = JSON.stringify(tokens) !== JSON.stringify(baseline?.mapId === map.id ? baseline.tokens : []);
  const replace = (next: TacticalPlan | null) => { setBaseline(next); setTokens(next?.mapId === map.id ? next.tokens : []); };
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => { mounted.current = true; return () => { mounted.current = false; onDirty(false); }; }, [onDirty]);
  useEffect(() => { if (!dirty && (current?.version ?? 0) > (baseline?.version ?? 0)) replace(current); }, [current, dirty, baseline]);
  useEffect(() => { if (!dirty && availableMap.revision > map.revision) setMap(availableMap); }, [availableMap, dirty, map.revision]);
  const preview = useMemo<ProjectedMapScene>(() => ({ id: `plan:${scene.id}:${map.id}`, width: map.document.geometry.size[0], height: map.document.geometry.size[1], ...(map.document.background ? { rasterScope: map.contentHash } : {}),
    cells: map.document.geometry.regions.map(r => ({ id: r.id, polygon: r.punkte, fill: 0x60bb8d })), pins: [], grid: map.document.grid,
    tokens: tokens.map(t => ({ id: t.id, x: t.x, y: t.y, label: actors.find(a => a.id === t.actorId)?.name ?? "Figur", movable: !task.busy, radius: Math.min(40, Math.max(7, 11 * t.scale)) })),
  }), [scene.id, map, tokens, actors, task.busy]);
  return <form onSubmit={e => { e.preventDefault(); if (baseline && baseline.mapId !== map.id && !window.confirm("Die bisherige Szenenkarte und ihre vorbereiteten Positionen ersetzen?")) return; void task.run(async () => {
    await command<TacticalAck>(apiPath(campaignId, `/scenes/${scene.id}/tactical-plan`), { expectedVersion: baseline?.version ?? 0, mapId: map.id, mapRevision: map.revision, tokens }, "PUT");
    const next = await api<TacticalPlan>(apiPath(campaignId, `/scenes/${scene.id}/tactical-plan`)); if (mounted.current) { replace(next); onChanged(); }
  }); }}><fieldset className="tactical-command-fields" disabled={task.busy}><p>Vorbereitung: <strong>{map.name} · Revision {map.revision}</strong>. Speichern gilt für den nächsten Szenenstart.</p>
    {availableMap.revision > map.revision ? <Notice>Eine neuere Kartenrevision liegt vor. Dein Entwurf bleibt auf Revision {map.revision}. <Button onClick={() => { if (window.confirm("Zur neuen Kartenrevision wechseln und die vorbereiteten Positionen beibehalten?")) setMap(availableMap); }}>Neue Kartenrevision verwenden</Button></Notice> : null}
    <label className="check-label"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} /> Vorbereitete Figuren am Raster einrasten</label>
    <TacticalCanvas scene={preview} tileBase={apiPath(campaignId, `/tactical/maps/${map.id}/tiles`)} tileQuery={`revision=${map.revision}`} onMove={(id, point) => { if (task.busy) return; const at = snap ? snapMapPoint(point, map.document.grid) : point; setTokens(old => old.map(t => t.id === id ? { ...t, x: at[0], y: at[1] } : t)); }} />
    {baseline?.mapId && baseline.mapId !== map.id ? <Notice>Diese Szene verwendet bisher eine andere Karte. Beim Speichern wird sie durch die hier ausgewählte Karte ersetzt.</Notice> : null}
    {(current?.version ?? 0) > (baseline?.version ?? 0) ? <Notice>Die Vorbereitung wurde inzwischen geändert. <Button onClick={() => { if (!dirty || window.confirm("Ungespeicherte Vorbereitung verwerfen?")) replace(current); }}>Aktuellen Plan übernehmen</Button></Notice> : null}
    <label>Figur platzieren<select value={actorId} onChange={e => setActorId(e.target.value)}><option value="">Figur wählen</option>{actors.map(a => <option value={a.id} key={a.id}>{a.name}</option>)}</select></label>
    <Button disabled={!actorId || tokens.length >= 1000} onClick={() => setTokens(old => [...old, { id: crypto.randomUUID(), actorId, x: map.document.geometry.size[0] / 2, y: map.document.geometry.size[1] / 2, elevation: map.document.elevation, rotation: 0, scale: 1 }])}>Figur zur Vorbereitung hinzufügen</Button>
    <div className="tactical-token-list">{tokens.map(token => <div className="tactical-token" key={token.id}><h4>{actors.find(a => a.id === token.actorId)?.name ?? "Nicht mehr verfügbare Figur"}</h4><div className="rule-fields">{([[
      "x", "X"], ["y", "Y"], ["elevation", "Höhe"], ["rotation", "Drehung (Radiant)"], ["scale", "Größe"],
    ] as const).map(([id, label]) => <label key={id}>{label}<input type="number" step="any" required min={id === "scale" ? .001 : -1e9} max={id === "scale" ? 1e6 : 1e9} value={token[id]} onChange={e => setTokens(old => old.map(t => t.id === token.id ? { ...t, [id]: e.target.valueAsNumber } : t))} /></label>)}</div><Button onClick={() => setTokens(old => old.filter(t => t.id !== token.id))}>Aus der Vorbereitung entfernen</Button></div>)}</div>
    <Button type="submit" variant="primary">Karte & Figuren für Szene speichern</Button>
    {scene.status !== "active" ? <Button disabled={dirty || !baseline || baseline.mapId !== map.id || baseline.mapRevision !== map.revision} onClick={() => void task.run(async () => { await api(apiPath(campaignId, `/scenes/${scene.id}/start`), { method: "POST", body: { expectedSceneVersion: scene.version, expectedPlanVersion: baseline?.version ?? 0 } }); if (mounted.current) onChanged(); })}>Vorbereitete Szene beginnen</Button> : <p className="field-help">Die Szene läuft bereits. Ihre Karte und Positionen bleiben von dieser Vorbereitung getrennt.</p>}
    </fieldset>{task.error ? <Notice error>{task.error}</Notice> : null}
  </form>;
}
