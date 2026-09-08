// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActorCard, TacticalAck, TacticalAnchor, TacticalMapCard, TacticalMapSummary, TacticalPlan, TacticalTokenPlan } from "@chronicle/protocol";
import { TACTICAL_MAP_LIMITS, type TacticalMapDocumentV1, type TacticalPoint } from "@chronicle/szene";
import { snapMapPoint, type ProjectedMapScene } from "@chronicle/render";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath, ApiError, plainText, type EntryDocument, type EntrySummary } from "../api";
import { useResource, useTask } from "../hooks";
import { useCommand, type SceneCard } from "./game-api";
import { TacticalCanvas } from "./TacticalCanvas";
import { mapRegionOutlines } from "./map-region-outlines";
import { TacticalGenerate } from "./TacticalGenerate";
import { TacticalEntitiesEditor } from "./TacticalEntitiesEditor";
import { mapObjectWindow, objectKey, preparationObjects } from "./tactical-entities";

export function TacticalPreparation({ campaignId, revision, onChanged, onDirty }: { campaignId: string; revision: number; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const maps = useResource<TacticalMapSummary[]>(apiPath(campaignId, "/tactical/maps"), revision);
  const [selected, setSelected] = useState(""), [mode, setMode] = useState<"generate" | "library">("generate"), [parts, setParts] = useState({ map: false, plan: false, generate: false });
  const current = useResource<TacticalMapCard>(selected ? apiPath(campaignId, `/tactical/maps/${selected}`) : null, revision);
  const dirty = parts.map || parts.plan || parts.generate;
  const generationDirty = useCallback((value: boolean) => setParts(v => ({ ...v, generate: value })), []);
  const mapDirty = useCallback((value: boolean) => setParts(v => ({ ...v, map: value })), []), planDirty = useCallback((value: boolean) => setParts(v => ({ ...v, plan: value })), []);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => () => onDirty(false), [onDirty]);
  const chooseMode = (next: typeof mode) => {
    if (mode === next || (dirty && !window.confirm("Ungespeicherte Kartenänderungen verwerfen?"))) return;
    setParts({ map: false, plan: false, generate: false }); setMode(next);
  };
  return <div className="tactical-preparation"><nav className="forge-task-tabs" aria-label="Karten vorbereiten"><Button aria-pressed={mode === "generate"} onClick={() => chooseMode("generate")}>Neue Karte erzeugen</Button><Button aria-pressed={mode === "library"} onClick={() => chooseMode("library")}>Kartenbibliothek{maps.data ? ` · ${maps.data.length}` : ""}</Button></nav>
    {mode === "generate" ? <TacticalGenerate key={campaignId} campaignId={campaignId} onDirty={generationDirty} onCreated={id => { setSelected(id); setMode("library"); onChanged(); }} /> : <>
    <label>Szenenkarte<select value={selected} onChange={e => { if (dirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return; setSelected(e.target.value); }}><option value="">Karte wählen</option>{maps.data?.map(m => <option key={m.id} value={m.id}>{m.name} · Revision {m.revision}</option>)}</select></label>
    {current.data ? <Button onClick={() => {
      if (dirty && !window.confirm("Ungespeicherte Kartenänderungen verwerfen?")) return;
      const url = new URL(location.href); url.searchParams.set("stage", "atlas"); url.searchParams.set("atlasChild", current.data!.id); location.assign(url.href);
    }}>Karte im Atlas öffnen</Button> : null}
    {maps.error || current.error ? <Notice error>{maps.error || current.error}</Notice> : null}
    {current.loading ? <Loading /> : current.data ? <><MapEditor key={current.data.id} current={current.data} campaignId={campaignId} onChanged={onChanged} onDirty={mapDirty} /><ScenePlan key={current.data.id} map={current.data} campaignId={campaignId} revision={revision} onChanged={onChanged} onDirty={planDirty} /></> : <EmptyState title="Deine Karten für den nächsten Abend.">Wähle eine gespeicherte Karte zum Bearbeiten aus oder erzeuge eine neue Karte. Im Atlas kannst du ihre Gebäude und Räume betreten.</EmptyState>}
    </>}
  </div>;
}

export function MapEditor({ current, campaignId, onChanged, onDirty }: { current: TacticalMapCard; campaignId: string; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const [baseline, setBaseline] = useState(current), [document, setDocument] = useState(current.document), [anchors, setAnchors] = useState(current.anchors);
  const [drawing, setDrawing] = useState(false), [points, setPoints] = useState<TacticalPoint[]>([]), [regionId, setRegionId] = useState(""), [entryId, setEntryId] = useState(""), [passageId, setPassageId] = useState("");
  const [pointX, setPointX] = useState(0), [pointY, setPointY] = useState(0), [exportInfo, setExportInfo] = useState("");
  const [selectedObject, setSelectedObject] = useState(""), [marking, setMarking] = useState(false);
  const entries = useResource<EntrySummary[]>(apiPath(campaignId, "/entries"));
  const article = useResource<EntryDocument>(entryId ? apiPath(campaignId, `/entries/${entryId}`) : null);
  const task = useTask(), command = useCommand(), mounted = useRef(true);
  const dirty = JSON.stringify({ document, anchors }) !== JSON.stringify({ document: baseline.document, anchors: baseline.anchors }) || points.length > 0;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => { mounted.current = true; return () => { mounted.current = false; onDirty(false); }; }, [onDirty]);
  const replace = (map: TacticalMapCard) => { setBaseline(map); setDocument(map.document); setAnchors(map.anchors); setPoints([]); setDrawing(false); setMarking(false); setSelectedObject(""); };
  useEffect(() => { if (!dirty && current.version > baseline.version) replace(current); }, [current, dirty, baseline.version]);
  const objects = useMemo(() => preparationObjects(document, anchors, entries.data ?? []), [document, anchors, entries.data]);
  const visibleObjects = useMemo(() => mapObjectWindow(objects, selectedObject, document.geometry.size[0], document.geometry.size[1]), [objects, selectedObject, document.geometry.size]);
  const focusedObject = visibleObjects.find(o => objectKey(o) === selectedObject);
  const scene = useMemo<ProjectedMapScene>(() => ({ id: baseline.id, width: document.geometry.size[0], height: document.geometry.size[1], ...(document.background ? { rasterScope: baseline.contentHash } : {}),
    cells: document.geometry.regions.map(r => ({ id: r.id, polygon: r.punkte, fill: anchors.some(a => a.targetKind === "region" && a.targetId === r.id) ? 0x60bb8d : 0xd98e3b })), pins: visibleObjects.filter(o => o.kind === "place" || o.entryId || objectKey(o) === selectedObject).map(o => ({ id: objectKey(o), x: o.x, y: o.y, label: o.label, ...(o.entryId ? { entryId: o.entryId } : {}) })), grid: document.grid,
    lines: [...mapRegionOutlines(document), ...document.walls.map(w => ({ id: w.id, points: w.points })), ...(points.length >= 2 ? [{ id: "draft-region", points, color: 0xffffff }] : [])],
    stamps: document.geometry.stamps.map(stamp => ({ id: stamp.id, asset: stamp.a, x: stamp.x, y: stamp.y, s: stamp.s, r: stamp.r, l: stamp.l })),
  }), [baseline, document, anchors, points, visibleObjects]);
  const addPoint = (p: TacticalPoint) => {
    if (task.busy || p[0] < 0 || p[1] < 0 || p[0] > scene.width || p[1] > scene.height) return;
    if (marking && document.geometry.places.length < TACTICAL_MAP_LIMITS.places) { const id = crypto.randomUUID(); setDocument(old => ({ ...old, geometry: { ...old.geometry, places: [...old.geometry.places, { id, x: p[0], y: p[1] }] } })); setSelectedObject(`place:${id}`); setMarking(false); }
    else if (drawing) setPoints(old => [...old, p]);
  };
  const bind = () => { if (!regionId || !entryId) return; setAnchors(old => [...old.filter(a => !(a.targetKind === "region" && a.targetId === regionId)), { targetKind: "region", targetId: regionId, entryId, passageId: passageId || null }]); };
  const save = () => void task.run(async () => {
    try {
      await command<TacticalAck>(apiPath(campaignId, `/tactical/maps/${baseline.id}/revision`), { expectedVersion: baseline.version, document, anchors }, "PUT");
    } catch (error) { if (error instanceof ApiError && error.status === 409 && mounted.current) onChanged(); throw error; }
    const next = await api<TacticalMapCard>(apiPath(campaignId, `/tactical/maps/${baseline.id}`)); if (mounted.current) { replace(next); onChanged(); }
  });
  return <section className="panel"><div className="page-heading"><div><h2>{baseline.name}</h2><p className="field-help">Kartenrevision {baseline.revision}. Grün markiert eine verknüpfte Region. Eine laufende Szene behält ihre bereits begonnene Revision.</p></div><Button disabled={task.busy || !dirty || points.length > 0} variant="primary" onClick={save}>Kartenrevision speichern</Button></div>
    {current.version > baseline.version ? <Notice>Eine neue Revision liegt vor. <Button onClick={() => { if (!dirty || window.confirm("Ungespeicherte Kartenänderungen verwerfen?")) replace(current); }}>Aktuelle Karte übernehmen</Button></Notice> : null}
    <TacticalCanvas scene={scene} tileBase={apiPath(campaignId, `/tactical/maps/${baseline.id}/tiles`)} tileQuery={`revision=${baseline.revision}`} onPoint={addPoint} selection={focusedObject ? { kind: "pin", id: selectedObject } : null} focusObject={focusedObject ? { id: selectedObject, x: focusedObject.x, y: focusedObject.y } : null} onSelect={hit => { if (task.busy || drawing || marking) return; if (hit?.kind === "cell") setRegionId(hit.id); setSelectedObject(hit?.kind === "pin" ? hit.id : ""); }} />
    {visibleObjects.length < objects.length ? <Notice>{visibleObjects.length} von {objects.length} Objekten auf der Karte. Die vollständige Liste unten bleibt durchsuchbar; ihre Auswahl wird auf der Karte gezeigt, sofern ihre Position innerhalb der Karte liegt.</Notice> : null}
    <fieldset className="tactical-command-fields" disabled={task.busy}><div className="tactical-prep-columns"><section><h3>Wissensregionen</h3><p className="field-help">Zeichne eine Region, indem du ihre Eckpunkte auf der Karte anklickst, oder trage die Koordinaten ein. Die Liste funktioniert auch ohne Grafikbeschleunigung.</p>
      <Button aria-pressed={drawing} onClick={() => { setMarking(false); setDrawing(v => !v); }}>{drawing ? "Zeichnen pausieren" : "Region zeichnen"}</Button>
      <div className="rule-fields"><label>Eckpunkt X<input type="number" min={0} max={scene.width} value={pointX} onChange={e => setPointX(e.target.valueAsNumber)} /></label><label>Eckpunkt Y<input type="number" min={0} max={scene.height} value={pointY} onChange={e => setPointY(e.target.valueAsNumber)} /></label></div>
      <Button disabled={!Number.isFinite(pointX) || !Number.isFinite(pointY)} onClick={() => { setDrawing(true); if (pointX >= 0 && pointY >= 0 && pointX <= scene.width && pointY <= scene.height) setPoints(old => [...old, [pointX, pointY]]); }}>Eckpunkt hinzufügen</Button>
      {points.length ? <><p>{points.length} Eckpunkte vorbereitet.</p><ol className="tactical-points">{points.map((p, i) => <li key={i}>{p[0].toFixed(1)}, {p[1].toFixed(1)} <Button aria-label={`Eckpunkt ${i + 1} entfernen`} onClick={() => setPoints(old => old.filter((_, index) => index !== i))}>Entfernen</Button></li>)}</ol><div className="button-row"><Button disabled={points.length < 3} onClick={() => { const id = crypto.randomUUID(); setDocument(old => ({ ...old, geometry: { ...old.geometry, regions: [...old.geometry.regions, { id, punkte: points }] } })); setRegionId(id); setPoints([]); setDrawing(false); }}>Region schließen</Button><Button onClick={() => { setPoints([]); setDrawing(false); }}>Zeichnung verwerfen</Button></div></> : null}
      <label>Region auswählen<select value={regionId} onChange={e => setRegionId(e.target.value)}><option value="">Region wählen</option>{document.geometry.regions.map((r, i) => <option value={r.id} key={r.id}>Region {i + 1}{anchors.some(a => a.targetKind === "region" && a.targetId === r.id) ? " · Verknüpft" : " · Privat"}</option>)}</select></label>
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
    </section></div><TacticalEntitiesEditor campaignId={campaignId} document={document} anchors={anchors} objects={objects} entries={entries.data ?? []} selected={selectedObject} onSelect={setSelectedObject} marking={marking} onMarking={value => { setMarking(value); setDrawing(false); }} onChange={(next, bindings) => { setDocument(next); setAnchors(bindings); }} /></fieldset>{task.error ? <Notice error>{task.error}</Notice> : null}
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
