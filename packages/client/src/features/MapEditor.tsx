// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useMemo, useRef, useState } from "react";
import type { TacticalAck, TacticalAnchor, TacticalMapCard } from "@chronicle/protocol";
import { inferLegacyCartography, TACTICAL_MAP_LIMITS, type KartenSetting, type TacticalMapDocumentV1, type TacticalPoint } from "@chronicle/szene";
import { pointInPolygon, type MapEditorInteraction, type MapHit, type ProjectedMapScene } from "@chronicle/render";
import { Button, Notice } from "@chronicle/ui";
import { api, apiPath, ApiError, errorText, plainText, type EntryDocument, type EntrySummary } from "../api";
import { useResource, useTask } from "../hooks";
import { useCommand } from "./game-api";
import { TacticalCanvas, type MapCanvasContext } from "./TacticalCanvas";
import { TacticalEntitiesEditor } from "./TacticalEntitiesEditor";
import { mapObjectWindow, objectKey, preparationObjects } from "./tactical-entities";
import { mapDocumentScene, type MapNode } from "./map-generation";
import { MapArtworkPalette } from "./MapArtworkPalette";
import { placeArtwork, type ArtworkBrush } from "./map-artwork";

import { applyCartographyEdit, type CartographyEditOperation } from "@chronicle/forge";
import { MapEditTools, mapToolSettings, type MapToolSettings } from "./MapEditTools";
import { acknowledgeEdit, acceptEdit, editDocument, beginEdit, cancelEdit, commitEdit, editDirty, editFingerprint, editHistory, previewEdit, redoEdit, undoEdit, type MapEditHistory, type MapEditSnapshot } from "./map-edit-history";
import "./map-editor.css";

const snapshotOf = (map: TacticalMapCard): MapEditSnapshot => ({ document: map.document, anchors: map.anchors,
  cartography: map.cartography ?? map.legacyCartography ?? inferLegacyCartography(map.document), addedBuildings: [] });
export function MapEditor({ current, campaignId, onChanged, onDirty, onContextMenu }: { current: TacticalMapCard; campaignId: string; onChanged: () => void; onDirty: (value: boolean) => void; onContextMenu?: MapCanvasContext }) {
  const [baseline, setBaseline] = useState(current), [history, setHistory] = useState(() => editHistory(snapshotOf(current)));
  const historyRef = useRef(history); historyRef.current = history;
  const changeHistory = (change: (old: MapEditHistory) => MapEditHistory) => { const next = change(historyRef.current); historyRef.current = next; setHistory(next); };
  const commit = (change: (old: MapEditSnapshot) => MapEditSnapshot) => changeHistory(old => commitEdit(old, change(old.present)));
  const visible = history.gesture?.preview ?? history.present, { document, anchors, cartography } = visible;
  const setDocument = (change: TacticalMapDocumentV1 | ((old: TacticalMapDocumentV1) => TacticalMapDocumentV1)) => commit(old => editDocument(old, typeof change === "function" ? change(old.document) : change));
  const setAnchors = (change: readonly TacticalAnchor[] | ((old: readonly TacticalAnchor[]) => readonly TacticalAnchor[])) => commit(old => ({ ...old, anchors: typeof change === "function" ? change(old.anchors) : change }));
  const [tools, setTools] = useState(() => mapToolSettings(visible.cartography.construction.cellSize)), [sheet, setSheet] = useState(false);
  const [editError, setEditError] = useState(""), [revoked, setRevoked] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ submitted: MapEditSnapshot; version: number; id: string; epoch: number } | null>(null);
  const pendingRef = useRef(pendingSave); pendingRef.current = pendingSave;
  const epoch = useRef(0), identity = useRef(current.id); identity.current = current.id;
  const heldBaseline = useRef<TacticalMapCard | null>(null);
  const [childrenRefresh, setChildrenRefresh] = useState(0);
  const gesture = useRef<{ id: string; seed: string; baseline: MapEditSnapshot; path: TacticalPoint[]; regionId?: string; stampId?: string; operation?: CartographyEditOperation } | null>(null);
  const scheduled = useRef<number | null>(null);
  const [drawing, setDrawing] = useState(false), [points, setPoints] = useState<TacticalPoint[]>([]), [regionId, setRegionId] = useState(""), [entryId, setEntryId] = useState(""), [passageId, setPassageId] = useState("");
  const [pointX, setPointX] = useState(0), [pointY, setPointY] = useState(0), [exportInfo, setExportInfo] = useState("");
  const [focusRequested, setFocusRequested] = useState(false);
  const [selectedObject, setSelectedObject] = useState(""), [marking, setMarking] = useState(false);
  const [brush, setBrush] = useState<ArtworkBrush | null>(null);
  const [assetsOpen, setAssetsOpen] = useState(false), [knowledgeOpen, setKnowledgeOpen] = useState(false), [objectsOpen, setObjectsOpen] = useState(false);
  // A new tool or selection may reveal its controls. Clearing it never overrides the user's
  // disclosure choice, and an explicit close stays closed until a new relevant selection.
  useEffect(() => { if (brush) setAssetsOpen(true); }, [brush]);
  useEffect(() => { if (drawing) setKnowledgeOpen(true); }, [drawing]);
  useEffect(() => { if (marking) setObjectsOpen(true); }, [marking]);
  useEffect(() => {
    if (selectedObject.startsWith("stamp:")) setAssetsOpen(true);
    if (selectedObject.startsWith("place:")) setObjectsOpen(true);
  }, [selectedObject]);
  const entries = useResource<EntrySummary[]>(apiPath(campaignId, "/entries"));
  const children = useResource<{ nodes: (MapNode & { vorhandeneKarteId?: string | null })[]; version: number; art?: string; setting?: KartenSetting }>(apiPath(campaignId, `/maps/tactical/${current.id}/children`), baseline.version + childrenRefresh);
  const article = useResource<EntryDocument>(entryId ? apiPath(campaignId, `/entries/${entryId}`) : null);
  const task = useTask(), command = useCommand(), mounted = useRef(true);
  // Two fingerprints of the whole snapshot per render cost ~0.4 s on a 20,000-stamp map; history only changes by state.
  const historyDirty = useMemo(() => editDirty(history), [history]);
  const dirty = historyDirty || points.length > 0 || !!pendingSave || task.busy;
  const childrenConfirmed = children.loaded && !!children.data && !children.error && children.data.version === baseline.version;
  const editingDisabled = revoked || task.busy && !pendingSave;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (scheduled.current !== null) cancelAnimationFrame(scheduled.current); gesture.current = null; onDirty(false); }; }, [onDirty]);
  const cancelGesture = () => { if (scheduled.current !== null) cancelAnimationFrame(scheduled.current); scheduled.current = null; gesture.current = null; changeHistory(cancelEdit); setEditError(""); };
  const replace = (map: TacticalMapCard) => { epoch.current++; pendingRef.current = null; heldBaseline.current = null; cancelGesture(); setBaseline(map); changeHistory(() => editHistory(snapshotOf(map))); setPoints([]); setDrawing(false); setMarking(false); setBrush(null); setSelectedObject(""); setRegionId(""); setEntryId(""); setPassageId(""); setPendingSave(null); setRevoked(false); };
  useEffect(() => { if (!dirty && current.version > baseline.version) replace(current); }, [current, dirty, baseline.version]);
  useEffect(() => { if (!history.gesture && heldBaseline.current) { setBaseline(heldBaseline.current); heldBaseline.current = null; } }, [history.gesture]);
  const objects = useMemo(() => preparationObjects(document, anchors, entries.data ?? []), [document, anchors, entries.data]);
  const visibleObjects = useMemo(() => mapObjectWindow(objects, selectedObject, document.geometry.size[0], document.geometry.size[1]), [objects, selectedObject, document.geometry.size]);
  const nodes = useMemo(() => {
    const regions = new Set(document.geometry.regions.map(region => region.id));
    return (children.data?.nodes ?? []).filter(node => regions.has(node.knotenId)).map(node => {
      const polygon = document.geometry.regions.find(region => region.id === node.knotenId)!.punkte;
      return { ...node, x: polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length, y: polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length };
    });
  }, [children.data, document.geometry.regions]);
  const nodesById = useMemo(() => new Map(nodes.map(node => [node.knotenId, node])), [nodes]);
  const selectedNode = nodes.find(node => `node:${node.knotenId}` === selectedObject);
  const focusedObject = selectedNode ?? visibleObjects.find(o => objectKey(o) === selectedObject);
  const scene = useMemo<ProjectedMapScene>(() => {
    const projected = mapDocumentScene(baseline.id, document, nodes, children.data?.art, document.background ? baseline.rasterDigest ?? baseline.contentHash : undefined, children.data?.setting, cartography);
    if (revoked) return { id: baseline.id, width: projected.width, height: projected.height, cells: [], pins: [] };
    return { ...projected,
      cells: projected.cells.map(cell => ({ ...cell, ...(cell.surface !== "building" && anchors.some(anchor => anchor.targetKind === "region" && anchor.targetId === cell.id) ? { fill: 0x60bb8d } : {}) })),
      pins: [...projected.pins.map(pin => ({ ...pin, id: `node:${pin.id}` })),
        ...visibleObjects.filter(object => object.entryId || objectKey(object) === selectedObject || object.kind === "place" && !nodes.some(node => {
          const region = document.geometry.regions.find(region => region.id === node.knotenId);
          return region && pointInPolygon([object.x, object.y], region.punkte);
        }))
          .map(object => ({ id: objectKey(object), x: object.x, y: object.y, label: object.label, ...(object.entryId ? { entryId: object.entryId } : {}) }))],
      lines: [...projected.lines ?? [], ...(points.length >= 2 ? [{ id: "draft-region", points, color: 0xffffff }] : [])],
    };
  }, [baseline, document, nodes, children.data?.art, children.data?.setting, anchors, cartography, points, visibleObjects, selectedObject, revoked]);
  const selectRegion = (id: string, focus = false) => {
    setFocusRequested(focus);
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
  const protectedIds = (operation: CartographyEditOperation, snapshot: MapEditSnapshot) => {
    const linked = (children.data?.nodes ?? []).filter(node => node.vorhandeneKarteId).map(node => node.knotenId);
    return [...new Set([...snapshot.cartography.regions.filter(region => region.locked || operation.kind === "variation" && region.authored).map(region => region.regionId), ...(operation.kind === "transform" ? [] : linked)])];
  };
  const computeGesture = () => {
    const draft = gesture.current;
    if (!draft || historyRef.current.gesture?.id !== draft.id) return;
    const last = draft.path.at(-1)!, first = draft.path[0]!;
    if (draft.stampId) {
      const stamp = draft.baseline.document.geometry.stamps.find(item => item.id === draft.stampId);
      if (!stamp) return;
      const next = editDocument(draft.baseline, { ...draft.baseline.document, geometry: { ...draft.baseline.document.geometry,
        stamps: draft.baseline.document.geometry.stamps.map(item => item.id === stamp.id ? { ...item, x: item.x + last[0] - first[0], y: item.y + last[1] - first[1] } : item) } });
      changeHistory(old => previewEdit(old, draft.id, next)); return;
    }
    const operation: CartographyEditOperation | null = draft.operation ?? (draft.regionId ? { kind: "transform", regionId: draft.regionId, delta: [last[0] - first[0], last[1] - first[1]] }
      : tools.tool === "terrain" ? { kind: "terrain", points: draft.path, radius: tools.radius, material: tools.terrain }
      : tools.tool === "road" ? { kind: "road", points: draft.path, width: tools.roadWidth, material: tools.road }
      : tools.tool === "building" ? { kind: "building", at: last, width: tools.buildingWidth, height: tools.buildingHeight, quarterTurns: tools.turns, shape: tools.shape, typ: tools.buildingType, titel: tools.buildingName } : null);
    if (!operation) return;
    if (operation.kind !== "transform" && !childrenConfirmed) { setEditError("Verknüpfte Innenräume werden noch geprüft. Danach kannst du Flächen ersetzen oder entfernen."); return; }
    const result = applyCartographyEdit({ document: draft.baseline.document, cartography: draft.baseline.cartography, operation,
      protectedRegionIds: protectedIds(operation, draft.baseline), seed: draft.seed, operationId: draft.id });
    if (gesture.current !== draft || historyRef.current.gesture?.id !== draft.id || editFingerprint(historyRef.current.present) !== editFingerprint(draft.baseline)) return;
    if (!result.ok) { setEditError(result.message); changeHistory(old => old.gesture?.id === draft.id ? { ...old, gesture: { ...old.gesture, preview: null } } : old); return; }
    setEditError("");
    const removedRegions = new Set(result.removedRegionIds), removedStamps = new Set(result.removedStampIds);
    const next: MapEditSnapshot = { document: result.document, cartography: result.cartography,
      anchors: draft.baseline.anchors.filter(anchor => !(anchor.targetKind === "region" && removedRegions.has(anchor.targetId) || anchor.targetKind === "stamp" && removedStamps.has(anchor.targetId))),
      addedBuildings: [...draft.baseline.addedBuildings.filter(intent => !removedRegions.has(intent.regionId)), ...result.addedBuildings] };
    changeHistory(old => previewEdit(old, draft.id, next));
  };
  const startGesture = (path: TacticalPoint[], extra: { regionId?: string; stampId?: string; operation?: CartographyEditOperation } = {}) => {
    cancelGesture(); const id = crypto.randomUUID(), seed = crypto.randomUUID();
    gesture.current = { id, seed, baseline: historyRef.current.present, path, ...extra };
    changeHistory(old => beginEdit(old, id, seed));
  };
  const operationPreview = (operation: CartographyEditOperation) => { startGesture([[0, 0]], { operation }); computeGesture(); };
  const chooseHit = (hit: MapHit | null) => {
    if (hit?.kind === "cell") selectRegion(hit.id);
    else if (hit?.kind === "pin" && hit.id.startsWith("node:")) selectRegion(hit.id.slice(5));
    else { setSelectedObject(hit?.kind === "pin" ? hit.id : ""); setRegionId(""); }
  };
  const editor: MapEditorInteraction = {
    active: () => !editingDisabled && !drawing && !marking && !brush && !tools.hand,
    begin: (point, hit) => {
      setFocusRequested(false);
      if (tools.tool === "select") {
        chooseHit(hit);
        const id = hit?.kind === "cell" ? hit.id : hit?.kind === "pin" && hit.id.startsWith("node:") ? hit.id.slice(5) : undefined;
        const stampId = hit?.kind === "pin" && hit.id.startsWith("stamp:") ? hit.id.slice(6) : undefined;
        if (!id && !stampId) return false;
        startGesture([point], { ...(id ? { regionId: id } : {}), ...(stampId ? { stampId } : {}) });
      } else { startGesture([point]); computeGesture(); }
      return true;
    },
    move: point => {
      const draft = gesture.current; if (!draft) return;
      const previous = draft.path.at(-1)!;
      if (Math.hypot(point[0] - previous[0], point[1] - previous[1]) < Math.max(1, cartography.construction.cellSize * .12)) return;
      if (draft.regionId || draft.stampId || tools.tool === "building") draft.path = [draft.path[0]!, point];
      else if (draft.path.length < 512) draft.path.push(point);
      if (scheduled.current === null) scheduled.current = requestAnimationFrame(() => { scheduled.current = null; computeGesture(); });
    },
    commit: point => {
      const draft = gesture.current; if (!draft) return;
      if (scheduled.current !== null) cancelAnimationFrame(scheduled.current); scheduled.current = null;
      if ((draft.regionId || draft.stampId) && Math.hypot(point[0] - draft.path[0]![0], point[1] - draft.path[0]![1]) < 1) { cancelGesture(); return; }
      draft.path.push(point); computeGesture();
      if (draft.regionId || draft.stampId) { changeHistory(acceptEdit); gesture.current = null; }
    },
    cancel: cancelGesture,
  };
  const reloadSaved = async (pending: NonNullable<typeof pendingSave>) => {
    const next = await api<TacticalMapCard>(apiPath(campaignId, `/tactical/maps/${pending.id}`));
    if (!mounted.current || identity.current !== pending.id || epoch.current !== pending.epoch || pendingRef.current !== pending) return;
    if (next.version !== pending.version) throw new Error("Gespeichert. Inzwischen liegt eine weitere Änderung vor; dein Entwurf bleibt erhalten. Lade die aktuelle Karte ausdrücklich neu.");
    changeHistory(old => acknowledgeEdit(old, pending.submitted, snapshotOf(next)));
    if (gesture.current && historyRef.current.gesture?.id === gesture.current.id) gesture.current.baseline = historyRef.current.gesture.baseline;
    if (historyRef.current.gesture) heldBaseline.current = next; else setBaseline(next);
    pendingRef.current = null; setPendingSave(null); onChanged();
  };
  const save = () => void task.run(async () => {
    if (pendingSave) { await reloadSaved(pendingSave); return; }
    const submitted = historyRef.current.present, startedEpoch = epoch.current;
    let ack: TacticalAck;
    try {
      ack = await command<TacticalAck>(apiPath(campaignId, `/tactical/maps/${baseline.id}/revision`), { schemaVersion: 2, expectedVersion: baseline.version,
        document: submitted.document, anchors: submitted.anchors, cartography: submitted.cartography, addedBuildings: submitted.addedBuildings }, "PUT");
    } catch (error) { if (error instanceof ApiError && error.status === 409 && mounted.current) onChanged(); throw error; }
    if (!mounted.current || epoch.current !== startedEpoch || identity.current !== baseline.id) return;
    const pending = { submitted, version: ack.version, id: baseline.id, epoch: startedEpoch }; pendingRef.current = pending; setPendingSave(pending);
    await reloadSaved(pending);
  });
  if (revoked) return <section className="panel"><Notice error>Die Kartenberechtigung wurde entzogen. Der Entwurf wird nicht weiter angezeigt.</Notice><Button disabled={task.busy} onClick={() => void task.run(async () => {
    await api<TacticalMapCard>(apiPath(campaignId, `/tactical/maps/${baseline.id}`));
    if (mounted.current) { setRevoked(false); onChanged(); }
  })}>Kartensicht erneut laden</Button>{task.error ? <Notice error>{task.error}</Notice> : null}</section>;
  return <section className={`panel map-editor${sheet ? " map-editor-sheet" : ""}`}><div className="page-heading"><div><h2>{baseline.name}</h2><p className="field-help">Kartenrevision {baseline.revision}. Die Regionsauswahl zeigt eure Wissensverknüpfungen. Eine laufende Szene behält ihre bereits begonnene Revision.</p></div><div className="button-row map-editor-actions"><Button disabled={!history.past.length && !history.gesture || editingDisabled} onClick={() => { gesture.current = null; changeHistory(undoEdit); }}>Rückgängig</Button><Button disabled={!history.future.length || editingDisabled || !!history.gesture} onClick={() => changeHistory(redoEdit)}>Wiederholen</Button><Button disabled={task.busy || !dirty || !!pendingSave} onClick={() => { if (window.confirm("Alle ungespeicherten Kartenänderungen und gezeichneten Eckpunkte verwerfen?")) replace(baseline); }}>Entwurf zurücksetzen</Button><Button disabled={task.busy || revoked || !dirty || points.length > 0 || !!history.gesture} variant="primary" onClick={save}>{pendingSave ? "Gespeicherte Karte nachladen" : "Kartenrevision speichern"}</Button></div></div>
    {current.version > baseline.version ? <Notice>Eine neue Revision liegt vor. <Button onClick={() => { if (!dirty || window.confirm("Ungespeicherte Kartenänderungen verwerfen?")) replace(current); }}>Aktuelle Karte übernehmen</Button></Notice> : null}
    <p className="map-editor-status" role="status">{pendingSave ? "Gespeichert, Nachladen ausstehend. Weitere Eingaben bleiben erhalten." : history.gesture ? "Vorschau · noch nicht übernommen" : historyDirty ? "Ungespeicherter Entwurf" : "Alle Änderungen gespeichert"}</p>
    <div className="map-editor-mobile-tabs"><Button aria-pressed={!sheet} onClick={() => setSheet(false)}>Karte</Button><Button aria-pressed={sheet} onClick={() => setSheet(true)}>Werkzeuge & Details</Button></div>
    {editError ? <Notice error>{editError}</Notice> : null}
    {revoked ? <Notice error>Die Kartenberechtigung wurde entzogen. Der Entwurf wird nicht weiter angezeigt.</Notice> : null}
    <div className="map-editor-workspace"><MapEditTools value={tools} onChange={next => { cancelGesture(); setTools(next); setBrush(null); setDrawing(false); setMarking(false); }}
      selected={cartography.regions.find(region => region.regionId === regionId)} linked={!!nodesById.get(regionId)?.vorhandeneKarteId} busy={editingDisabled} childrenConfirmed={childrenConfirmed}
      onLock={() => commit(old => ({ ...old, cartography: { ...old.cartography, regions: old.cartography.regions.map(region => region.regionId === regionId ? { ...region, locked: !region.locked } : region) } }))}
      onRotate={() => operationPreview({ kind: "transform", regionId, delta: [0, 0], quarterTurns: 1 })}
      onRemove={() => operationPreview({ kind: "remove", regionId })} onVary={() => operationPreview({ kind: "variation", regionIds: [regionId] })} />
    <div className="map-editor-stage"><TacticalCanvas scene={scene} onContextMenu={onContextMenu ? (hit, at) => onContextMenu(hit?.kind === "pin" && hit.id.startsWith("node:") ? { ...hit, id: hit.id.slice(5) } : hit, at) : undefined} editor={editor} onUndo={() => { gesture.current = null; changeHistory(undoEdit); }} onRedo={() => changeHistory(redoEdit)} onScopeInvalidated={() => { cancelGesture(); setRevoked(true); setSelectedObject(""); setRegionId(""); onChanged(); }} tileBase={apiPath(campaignId, `/tactical/maps/${baseline.id}/tiles`)} tileQuery={`revision=${baseline.revision}&layer=background`} onPoint={addPoint} selection={regionId ? { kind: "cell", id: regionId } : focusedObject ? { kind: "pin", id: selectedObject } : null} focusObject={focusRequested && !history.gesture && focusedObject ? { id: selectedObject, x: focusedObject.x, y: focusedObject.y } : null} onSelect={hit => {
      if (editingDisabled || drawing || marking || brush) return;
      if (hit?.kind === "cell") selectRegion(hit.id);
      else if (hit?.kind === "pin" && hit.id.startsWith("node:")) selectRegion(hit.id.slice(5));
      else { setSelectedObject(hit?.kind === "pin" ? hit.id : ""); setRegionId(""); }
    }} />
    {history.gesture ? <div className="map-editor-preview-actions"><Button variant="primary" disabled={!history.gesture.preview || editingDisabled} onClick={() => { gesture.current = null; changeHistory(acceptEdit); }}>Vorschau übernehmen</Button><Button onClick={cancelGesture}>Vorschau verwerfen</Button></div> : null}
    </div></div><div className="map-editor-details">
    {brush ? <Notice>Auf die Karte klicken, um „{brush.asset.name.replaceAll("_", " ")}“ zu platzieren. <Button onClick={() => setBrush(null)}>Platzieren beenden</Button></Notice> : null}
    <details className="map-editor-section" open={assetsOpen} onToggle={event => setAssetsOpen(event.currentTarget.open)}><summary>Einrichtung & Kartenassets</summary><fieldset className="tactical-command-fields" disabled={editingDisabled}><MapArtworkPalette document={document} brush={brush} onBrush={next => { setBrush(next); setDrawing(false); setMarking(false); }} selected={selectedObject.startsWith("stamp:") ? selectedObject.slice(6) : ""}
      onSelect={id => { setSelectedObject(id ? `stamp:${id}` : ""); setFocusRequested(true); }} onUpdate={stamp => setDocument(old => ({ ...old, geometry: { ...old.geometry, stamps: old.geometry.stamps.map(item => item.id === stamp.id ? stamp : item) } }))}
      onRemove={id => {
        commit(old => ({ ...editDocument(old, { ...old.document, geometry: { ...old.document.geometry, stamps: old.document.geometry.stamps.filter(item => item.id !== id) }, geometryElevation: old.document.geometryElevation.filter(item => item.targetKind !== "stamp" || item.targetId !== id) }), anchors: old.anchors.filter(anchor => anchor.targetKind !== "stamp" || anchor.targetId !== id) })); setSelectedObject("");
      }} /></fieldset></details>
    {selectedNode ? <div className="tactical-object-selected"><strong>{selectedNode.titel}</strong>{selectedNode.bauwerk?.beschreibung ? <p>{selectedNode.bauwerk.beschreibung}</p> : null}<p className="field-help">Hier verknüpfst du das Gebäude oder den Raum mit eurem Wissen. Namen, Gebäudetyp und Unterkarte bearbeitest du in der Atlasansicht.</p></div> : null}
    {children.error ? <Notice error>Die Gebäudenamen konnten nicht geladen werden. {children.error} <Button onClick={() => setChildrenRefresh(value => value + 1)}>Innenräume erneut prüfen</Button></Notice> : null}
    {visibleObjects.length < objects.length ? <Notice>{visibleObjects.length} von {objects.length} Objekten auf der Karte. Die vollständige Liste unten bleibt durchsuchbar; ihre Auswahl wird auf der Karte gezeigt, sofern ihre Position innerhalb der Karte liegt.</Notice> : null}
    <fieldset className="tactical-command-fields" disabled={editingDisabled}><details className="map-editor-section" open={knowledgeOpen} onToggle={event => setKnowledgeOpen(event.currentTarget.open)}><summary>Wissensregionen & Verknüpfungen</summary><section><p className="field-help">Zeichne eine Region, indem du ihre Eckpunkte auf der Karte anklickst, oder trage die Koordinaten ein. Die Liste funktioniert auch ohne Grafikbeschleunigung.</p>
      <Button aria-pressed={drawing} onClick={() => { setBrush(null); setMarking(false); setDrawing(v => !v); }}>{drawing ? "Zeichnen pausieren" : "Region zeichnen"}</Button>
      <div className="rule-fields"><label>Eckpunkt X<input type="number" min={0} max={scene.width} value={pointX} onChange={e => setPointX(e.target.valueAsNumber)} /></label><label>Eckpunkt Y<input type="number" min={0} max={scene.height} value={pointY} onChange={e => setPointY(e.target.valueAsNumber)} /></label></div>
      <Button disabled={!Number.isFinite(pointX) || !Number.isFinite(pointY)} onClick={() => { setBrush(null); setMarking(false); setDrawing(true); if (pointX >= 0 && pointY >= 0 && pointX <= scene.width && pointY <= scene.height) setPoints(old => [...old, [pointX, pointY]]); }}>Eckpunkt hinzufügen</Button>
      {points.length ? <><p>{points.length} Eckpunkte vorbereitet.</p><ol className="tactical-points">{points.map((p, i) => <li key={i}>{p[0].toFixed(1)}, {p[1].toFixed(1)} <Button aria-label={`Eckpunkt ${i + 1} entfernen`} onClick={() => setPoints(old => old.filter((_, index) => index !== i))}>Entfernen</Button></li>)}</ol><div className="button-row"><Button disabled={points.length < 3} onClick={() => { const id = crypto.randomUUID(); setDocument(old => ({ ...old, geometry: { ...old.geometry, regions: [...old.geometry.regions, { id, punkte: points }] } })); setRegionId(id); setPoints([]); setDrawing(false); }}>Region schließen</Button><Button onClick={() => { setPoints([]); setDrawing(false); }}>Zeichnung verwerfen</Button></div></> : null}
      <label>Region auswählen<select aria-label="Region auswählen" value={regionId} onChange={e => selectRegion(e.target.value, true)}><option value="">Region wählen</option>{document.geometry.regions.map((r, i) => <option value={r.id} key={r.id}>{nodesById.get(r.id)?.titel ?? `Region ${i + 1}`}{anchors.some(a => a.targetKind === "region" && a.targetId === r.id) ? " · Verknüpft" : " · Privat"}</option>)}</select></label>
      <label>Wissen aus Artikel<select value={entryId} onChange={e => { setEntryId(e.target.value); setPassageId(""); }}><option value="">Artikel wählen</option>{entries.data?.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
      <label>Erforderliche Passage<select value={passageId} onChange={e => setPassageId(e.target.value)}><option value="">Eine bekannte Passage des Artikels genügt</option>{article.data?.passagen.map((p, i) => <option key={p.pid} value={p.pid}>{i + 1}. {plainText(p.inhalt).slice(0, 100)}</option>)}</select></label>
      <div className="button-row"><Button disabled={!regionId || !entryId} onClick={bind}>Region mit Wissen verknüpfen</Button><Button disabled={!regionId} onClick={() => setAnchors(old => old.filter(a => !(a.targetKind === "region" && a.targetId === regionId)))}>Verknüpfung lösen</Button></div>
      {entries.error || article.error ? <Notice error>{entries.error || article.error}</Notice> : null}
    </section></details><details className="map-editor-section"><summary>Raster, Maßstab & Export</summary><section><label>Raster<select aria-label="Kartenraster" value={document.grid.kind} onChange={e => setDocument(old => ({ ...old, grid: e.target.value === "none" ? { kind: "none" } : e.target.value === "hex" ? { kind: "hex", size: 100, origin: [0, 0], orientation: "pointy", offset: "odd" } : { kind: "square", size: 100, origin: [0, 0] } }))}><option value="square">Quadratisch</option><option value="hex">Sechseckig</option><option value="none">Ohne Raster</option></select></label>
      {document.grid.kind !== "none" ? <label>{document.grid.kind === "hex" ? "Hex-Radius in Pixeln" : "Zellgröße in Pixeln"}<input type="number" min={.001} step="any" value={document.grid.size} onChange={e => { const value = e.target.valueAsNumber; setDocument(old => old.grid.kind === "none" ? old : { ...old, grid: { ...old.grid, size: value } }); }} /></label> : null}
      {document.grid.kind === "hex" ? <label>Hex-Ausrichtung<select value={document.grid.orientation} onChange={e => setDocument(old => old.grid.kind !== "hex" ? old : { ...old, grid: { ...old.grid, orientation: e.target.value as "pointy" | "flat" } })}><option value="pointy">Spitze oben</option><option value="flat">Flache Seite oben</option></select></label> : null}
      <label>Welteinheiten pro Pixel<input type="number" min={.000001} step="any" value={document.frame.einheitenProPixel} onChange={e => setDocument(old => ({ ...old, frame: { ...old.frame, einheitenProPixel: e.target.valueAsNumber } }))} /></label>
      <label>Grundhöhe<input type="number" step="any" value={document.elevation} onChange={e => setDocument(old => ({ ...old, elevation: e.target.valueAsNumber }))} /></label>
      <p className="field-help">Raster und Höhe helfen bei der Platzierung. Wände, Licht und Portale bleiben Daten; daraus wird keine automatische Sicht oder Bewegungssperre berechnet.</p>
      <Button onClick={() => void task.run(async () => { const exported = await api<{ json: string; fidelity: { issues: { message: string }[] } }>(apiPath(campaignId, `/tactical/maps/${baseline.id}/uvtt?revision=${baseline.revision}`)); const blob = new Blob([exported.json], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = window.document.createElement("a"); a.href = url; a.download = "scene.dd2vtt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); if (mounted.current) setExportInfo(exported.fidelity.issues.map(i => i.message).join(" ") || "Die gespeicherte Karte wurde exportiert."); })}>Gespeicherte Revision als UVTT exportieren</Button>{exportInfo ? <Notice>{exportInfo}</Notice> : null}
    </section></details><details className="map-editor-section" open={objectsOpen} onToggle={event => setObjectsOpen(event.currentTarget.open)}><summary>Orte & Kartenobjekte</summary><TacticalEntitiesEditor campaignId={campaignId} document={document} anchors={[...anchors]} objects={objects} entries={entries.data ?? []} selected={selectedObject} onSelect={id => { setSelectedObject(id); setFocusRequested(true); }} marking={marking} onMarking={value => { setBrush(null); setMarking(value); setDrawing(false); }} onChange={(next, bindings) => commit(old => ({ ...editDocument(old, next), anchors: bindings }))} /></details></fieldset>{task.error ? <Notice error>{task.error}</Notice> : null}
  </div></section>;
}
