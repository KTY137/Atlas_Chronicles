// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useMemo, useRef, useState } from "react";
import type { TacticalAck, TacticalAnchor, TacticalMapCard } from "@chronicle/protocol";
import { inferLegacyCartography, TACTICAL_MAP_LIMITS, type AssetpaketV1, type CartographyMood, type KartenSetting, type TacticalMapDocumentV1, type TacticalPoint } from "@chronicle/szene";
import { pointInPolygon, type MapEditorInteraction, type MapHit, type ProjectedMapScene } from "@chronicle/render";
import { Button, Notice } from "@chronicle/ui";
import { api, apiPath, ApiError, errorText, plainText, type EntryDocument, type EntrySummary } from "../api";
import { t } from "../i18n";
import { useResource, useTask } from "../hooks";
import { useCommand } from "./game-api";
import { TacticalCanvas, type MapCanvasContext } from "./TacticalCanvas";
import { TacticalEntitiesEditor } from "./TacticalEntitiesEditor";
import { mapObjectWindow, objectKey, preparationObjects } from "./tactical-entities";
import { mapDocumentScene, type MapNode } from "./map-generation";
import { MapArtworkPalette } from "./MapArtworkPalette";
import { placeArtwork, type ArtworkBrush } from "./map-artwork";
import { Eye, EyeOff, Layers, Lock, MousePointer2, Palette, RotateCw, Save, Unlock } from "lucide-react";
import { applyLayers, blockedRegionIds, layerBlocked, layerView, MAP_LAYERS, mapLayerLabel, mapLayerState, toggleLayer } from "./map-layers";
import { interiorHit, snapPoint, type InteriorTarget } from "./map-studio";
import { applyInteriorEdit, type InteriorEditOperation } from "@chronicle/forge";

import { applyCartographyEdit, type CartographyEditOperation } from "@chronicle/forge";
import { MapEditTools, mapToolSettings, type MapToolSettings } from "./MapEditTools";
import { acknowledgeEdit, acceptEdit, editDocument, beginEdit, cancelEdit, commitEdit, editDirty, editFingerprint, editHistory, previewEdit, redoEdit, undoEdit, type MapEditHistory, type MapEditSnapshot } from "./map-edit-history";
import "./map-editor.css";

const snapshotOf = (map: TacticalMapCard): MapEditSnapshot => ({ document: map.document, anchors: map.anchors,
  cartography: map.cartography ?? map.legacyCartography ?? inferLegacyCartography(map.document), addedBuildings: [], addedRooms: [] });
export function MapEditor({ current, campaignId, onChanged, onDirty, onContextMenu, onOpenInterior }: { current: TacticalMapCard; campaignId: string; onChanged: () => void; onDirty: (value: boolean) => void; onContextMenu?: MapCanvasContext; onOpenInterior?: (nodeId: string, childId?: string | null) => void }) {
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
  const gesture = useRef<{ id: string; seed: string; baseline: MapEditSnapshot; path: TacticalPoint[]; regionId?: string; stampId?: string; target?: InteriorTarget; operation?: CartographyEditOperation; interiorOperation?: InteriorEditOperation } | null>(null);
  const scheduled = useRef<number | null>(null);
  const [drawing, setDrawing] = useState(false), [points, setPoints] = useState<TacticalPoint[]>([]), [regionId, setRegionId] = useState(""), [entryId, setEntryId] = useState(""), [passageId, setPassageId] = useState("");
  const [pointX, setPointX] = useState(0), [pointY, setPointY] = useState(0), [exportInfo, setExportInfo] = useState("");
  const [focusRequested, setFocusRequested] = useState(false);
  const [selectedObject, setSelectedObject] = useState(""), [marking, setMarking] = useState(false);
  const [brush, setBrush] = useState<ArtworkBrush | null>(null);
  const [interiorSelected, setInteriorSelected] = useState<InteriorTarget | null>(null);
  const [brushTurns, setBrushTurns] = useState(0), [brushScale, setBrushScale] = useState(1);
  // The layer panel: what is hidden while working and what is locked once it is done. Both are
  // this sitting's view of the map and never enter the saved map; a hidden layer is locked too.
  const [layers, setLayers] = useState(mapLayerState), [layersOpen, setLayersOpen] = useState(true);
  const blocked = (layer: Parameters<typeof layerBlocked>[1]) => { if (!layerBlocked(layers, layer)) return false; setEditError(t("Die Ebene {ebene} ist ausgeblendet oder gesperrt.", { ebene: mapLayerLabel(layer) })); return true; };
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
  const interiorAssets = useResource<AssetpaketV1>(tools.tool === "room" ? `/api/packs/${children.data?.setting && children.data.setting !== "fantasy" ? "pk.zeitwelten" : "pk.gemalt"}/manifest` : null);
  const article = useResource<EntryDocument>(entryId ? apiPath(campaignId, `/entries/${entryId}`) : null);
  const task = useTask(), command = useCommand(), mounted = useRef(true);
  // Two fingerprints of the whole snapshot per render cost ~0.4 s on a 20,000-stamp map; history only changes by state.
  const historyDirty = useMemo(() => editDirty(history), [history]);
  const dirty = historyDirty || points.length > 0 || !!pendingSave || task.busy;
  const childrenConfirmed = children.loaded && !!children.data && !children.error && children.data.version === baseline.version;
  const editingDisabled = revoked || task.busy && !pendingSave;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (scheduled.current !== null) cancelAnimationFrame(scheduled.current); gesture.current = null; onDirty(false); }; }, [onDirty]);
  const cancelGesture = () => { if (scheduled.current !== null) cancelAnimationFrame(scheduled.current); scheduled.current = null; gesture.current = null; changeHistory(cancelEdit); setEditError(""); };
  const replace = (map: TacticalMapCard) => { epoch.current++; pendingRef.current = null; heldBaseline.current = null; cancelGesture(); setBaseline(map); changeHistory(() => editHistory(snapshotOf(map))); setPoints([]); setDrawing(false); setMarking(false); setBrush(null); setSelectedObject(""); setInteriorSelected(null); setRegionId(""); setEntryId(""); setPassageId(""); setPendingSave(null); setRevoked(false); };
  useEffect(() => { if (!dirty && current.version > baseline.version) replace(current); }, [current, dirty, baseline.version]);
  useEffect(() => { if (!history.gesture && heldBaseline.current) { setBaseline(heldBaseline.current); heldBaseline.current = null; } }, [history.gesture]);
  const objects = useMemo(() => preparationObjects(document, anchors, entries.data ?? []), [document, anchors, entries.data]);
  const visibleObjects = useMemo(() => mapObjectWindow(objects, selectedObject, document.geometry.size[0], document.geometry.size[1]), [objects, selectedObject, document.geometry.size]);
  const nodes = useMemo(() => {
    const regions = new Set(document.geometry.regions.map(region => region.id));
    const pendingNodes: MapNode[] = [...visible.addedBuildings.map(intent => ({ knotenId: intent.regionId, titel: intent.titel, art: "bauwerk", bauwerk: { typ: intent.typ, beschreibung: "" }, x: 0, y: 0 })), ...(visible.addedRooms ?? []).map(intent => ({ knotenId: intent.regionId, titel: intent.titel, art: "raum", x: 0, y: 0 }))];
    return [...children.data?.nodes ?? [], ...pendingNodes].filter(node => regions.has(node.knotenId)).map(node => {
      const polygon = document.geometry.regions.find(region => region.id === node.knotenId)!.punkte;
      return { ...node, x: polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length, y: polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length };
    });
  }, [children.data, document.geometry.regions, visible.addedBuildings, visible.addedRooms]);
  const nodesById = useMemo(() => new Map(nodes.map(node => [node.knotenId, node])), [nodes]);
  const selectedNode = nodes.find(node => `node:${node.knotenId}` === selectedObject);
  const focusedObject = selectedNode ?? visibleObjects.find(o => objectKey(o) === selectedObject);
  const scene = useMemo<ProjectedMapScene>(() => {
    const projected = applyLayers({ ...mapDocumentScene(baseline.id, document, nodes, children.data?.art, document.background ? baseline.rasterDigest ?? baseline.contentHash : undefined, children.data?.setting, cartography, layerView(layers)), title: baseline.name }, layers);
    if (revoked) return { id: baseline.id, width: projected.width, height: projected.height, cells: [], pins: [] };
    return { ...projected, grid: layers.hidden.has("raster") ? { kind: "none" as const } : projected.grid?.kind === "none" ? { kind: "square" as const, size: cartography.construction.cellSize, origin: cartography.construction.origin } : projected.grid,
      cells: projected.cells.map(cell => ({ ...cell, ...(cell.surface !== "building" && anchors.some(anchor => anchor.targetKind === "region" && anchor.targetId === cell.id) ? { fill: 0x60bb8d } : {}) })),
      pins: [...projected.pins.map(pin => ({ ...pin, id: `node:${pin.id}` })),
        ...visibleObjects.filter(object => object.entryId || objectKey(object) === selectedObject || object.kind === "place" && !nodes.some(node => {
          const region = document.geometry.regions.find(region => region.id === node.knotenId);
          return region && pointInPolygon([object.x, object.y], region.punkte);
        }))
          .map(object => ({ id: objectKey(object), x: object.x, y: object.y, label: object.label, ...(object.entryId ? { entryId: object.entryId } : {}) }))],
      lines: [...(projected.lines ?? []).map(line => interiorSelected?.id === line.id ? { ...line, color: 0xffcd78, paint: true } : line), ...(points.length >= 2 ? [{ id: "draft-region", points, color: 0xffffff }] : [])],
    };
  }, [baseline, document, nodes, children.data?.art, children.data?.setting, anchors, cartography, points, visibleObjects, selectedObject, revoked, layers, interiorSelected]);
  const selectRegion = (id: string, focus = false) => {
    setFocusRequested(focus);
    setInteriorSelected(null);
    setRegionId(id); setSelectedObject(nodesById.has(id) ? `node:${id}` : "");
    const binding = anchors.find(anchor => anchor.targetKind === "region" && anchor.targetId === id);
    setEntryId(binding?.entryId ?? ""); setPassageId(binding?.passageId ?? "");
  };
  const addPoint = (p: TacticalPoint) => {
    if (editingDisabled || p[0] < 0 || p[1] < 0 || p[0] > scene.width || p[1] > scene.height) return;
    if (brush) {
      if (blocked("einrichtung")) return;
      const at = snapPoint(p, cartography.construction.cellSize, tools.snap, cartography.construction.origin);
      const placed = placeArtwork(document, brush, at, crypto.randomUUID());
      const stamp = placed ? { ...placed, r: brushTurns * Math.PI / 2, s: placed.s * brushScale } : null;
      if (stamp && document.geometry.stamps.length < TACTICAL_MAP_LIMITS.stamps) {
        const room = cartography.regions.find(region => region.role === "room" && region.interior && document.geometry.regions.some(polygon => polygon.id === region.regionId && pointInPolygon([stamp.x, stamp.y], polygon.punkte)));
        if (room?.locked) { setEditError(t("Dieser Raum ist gesperrt. Hebe die Sperre zum Einrichten auf.")); return; }
        commit(old => ({ ...editDocument(old, { ...old.document, geometry: { ...old.document.geometry, stamps: [...old.document.geometry.stamps, stamp] } }),
          cartography: { ...old.cartography, regions: old.cartography.regions.map(region => region === room && region.role === "room" && region.interior ? { ...region, interior: { ...region.interior, stampIds: [...region.interior.stampIds, stamp.id] } } : region) } }));
        setSelectedObject(`stamp:${stamp.id}`);
      }
    }
    else if (marking && document.geometry.places.length < TACTICAL_MAP_LIMITS.places) { const id = crypto.randomUUID(); setDocument(old => ({ ...old, geometry: { ...old.geometry, places: [...old.geometry.places, { id, x: p[0], y: p[1] }] } })); setSelectedObject(`place:${id}`); setMarking(false); }
    else if (drawing) setPoints(old => [...old, p]);
  };
  const bind = () => { if (!regionId || !entryId) return; setAnchors(old => [...old.filter(a => !(a.targetKind === "region" && a.targetId === regionId)), { targetKind: "region", targetId: regionId, entryId, passageId: passageId || null }]); };
  const protectedIds = (operation: CartographyEditOperation, snapshot: MapEditSnapshot) => {
    const linked = (children.data?.nodes ?? []).filter(node => node.vorhandeneKarteId).map(node => node.knotenId);
    return [...new Set([...snapshot.cartography.regions.filter(region => region.locked || operation.kind === "variation" && region.authored).map(region => region.regionId), ...(operation.kind === "transform" ? [] : linked), ...blockedRegionIds(layers, snapshot.cartography)])];
  };
  const computeGesture = () => {
    const draft = gesture.current;
    if (!draft || historyRef.current.gesture?.id !== draft.id) return;
    const last = draft.path.at(-1)!, first = draft.path[0]!;
    if (draft.stampId) {
      const stamp = draft.baseline.document.geometry.stamps.find(item => item.id === draft.stampId);
      if (!stamp) return;
      const owner = draft.baseline.cartography.regions.find(region => region.role === "building" ? region.attachedStampIds?.includes(stamp.id) : region.role === "room" && region.interior?.stampIds.includes(stamp.id));
      if (owner?.locked) { setEditError(t("Das zugehörige Gebäude oder der Raum ist gesperrt.")); return; }
      if (blocked("einrichtung")) return;
      const delta = snapPoint([last[0] - first[0], last[1] - first[1]], cartography.construction.cellSize, tools.snap);
      const next = editDocument(draft.baseline, { ...draft.baseline.document, geometry: { ...draft.baseline.document.geometry,
        stamps: draft.baseline.document.geometry.stamps.map(item => item.id === stamp.id ? { ...item, x: Math.max(0, Math.min(scene.width, item.x + delta[0])), y: Math.max(0, Math.min(scene.height, item.y + delta[1])) } : item) } });
      changeHistory(old => previewEdit(old, draft.id, next)); return;
    }
    const snap = (point: TacticalPoint) => snapPoint(point, cartography.construction.cellSize, tools.snap, cartography.construction.origin);
    const from = snap(first), to = snap(last), delta = snapPoint([last[0] - first[0], last[1] - first[1]], cartography.construction.cellSize, tools.snap);
    const target = draft.target ?? (draft.regionId && draft.baseline.cartography.regions.some(region => region.regionId === draft.regionId && region.role === "room") ? { kind: "room" as const, id: draft.regionId } : undefined);
    const interiorOperation: InteriorEditOperation | undefined = draft.interiorOperation ?? (target ? { kind: "interior-transform", target, delta }
      : tools.tool === "room" ? { kind: "room", from, to: Math.hypot(to[0] - from[0], to[1] - from[1]) < 1 ? [from[0] + tools.roomWidth, from[1] + tools.roomHeight] : to, floor: tools.roomFloor, template: tools.roomTemplate, shape: tools.roomShape, titel: tools.roomTemplate === "bedroom" ? "Schlafzimmer" : tools.roomTemplate === "tavern" ? "Schankraum" : "Neuer Raum" }
      : tools.tool === "wall" ? { kind: "wall", from, to }
      : tools.tool === "door" ? { kind: "door", at: last, width: tools.doorWidth, closed: tools.doorClosed } : undefined);
    if (interiorOperation) {
      if (!childrenConfirmed) { setEditError(t("Die Raumverbindungen werden noch geladen.")); return; }
      const wallwork = interiorOperation.kind === "wall" || interiorOperation.kind === "door" || "target" in interiorOperation && interiorOperation.target.kind !== "room";
      if (wallwork && blocked("waende")) return;
      const protectedRegionIds = [...draft.baseline.cartography.regions.filter(region => region.locked).map(region => region.regionId),
        ...(interiorOperation.kind === "interior-remove" ? (children.data?.nodes ?? []).filter(node => node.vorhandeneKarteId).map(node => node.knotenId) : []), ...blockedRegionIds(layers, draft.baseline.cartography)];
      const result = applyInteriorEdit({ document: draft.baseline.document, cartography: draft.baseline.cartography, operation: interiorOperation, operationId: draft.id, protectedRegionIds, ...(interiorAssets.data ? { assets: interiorAssets.data } : {}) });
      if (!result.ok) { setEditError(result.message); changeHistory(old => old.gesture?.id === draft.id ? { ...old, gesture: { ...old.gesture, preview: null } } : old); return; }
      const removedRegions = new Set(result.removedRegionIds), removedStamps = new Set(result.removedStampIds), removedPlaces = new Set(result.removedPlaceIds);
      setEditError(""); changeHistory(old => previewEdit(old, draft.id, { ...draft.baseline, document: result.document, cartography: result.cartography,
        anchors: draft.baseline.anchors.filter(anchor => !(anchor.targetKind === "region" && removedRegions.has(anchor.targetId) || anchor.targetKind === "stamp" && removedStamps.has(anchor.targetId) || anchor.targetKind === "place" && removedPlaces.has(anchor.targetId))),
        addedRooms: [...(draft.baseline.addedRooms ?? []).filter(intent => !removedRegions.has(intent.regionId)), ...result.addedRooms],
      })); return;
    }
    const operation: CartographyEditOperation | null = draft.operation ?? (draft.regionId ? { kind: "transform", regionId: draft.regionId, delta }
      : tools.tool === "terrain" ? { kind: "terrain", points: draft.path, radius: tools.radius, material: tools.terrain, ...(tools.terrain === "water" ? { water: tools.water } : {}) }
      : tools.tool === "road" ? { kind: "road", points: draft.path, width: tools.roadWidth, material: tools.road }
      : tools.tool === "relief" ? { kind: "relief", points: draft.path, radius: tools.radius, mode: tools.reliefMode, strength: tools.reliefStrength }
      : tools.tool === "building" ? { kind: "building", at: to, width: tools.buildingWidth, height: tools.buildingHeight, quarterTurns: tools.turns, shape: tools.shape, typ: tools.buildingType, titel: tools.buildingName } : null);
    if (!operation) return;
    // The land's height is the land: shaping it is blocked with the terrain layer.
    if (operation.kind === "relief" && blocked("gelaende")) return;
    // Shaping the height touches no region, so it never waits for the interior check.
    if (operation.kind !== "transform" && operation.kind !== "relief" && !childrenConfirmed) { setEditError(t("Verknüpfte Innenräume werden noch geprüft. Danach kannst du Flächen ersetzen oder entfernen.")); return; }
    const result = applyCartographyEdit({ document: draft.baseline.document, cartography: draft.baseline.cartography, operation,
      protectedRegionIds: protectedIds(operation, draft.baseline), seed: draft.seed, operationId: draft.id });
    if (gesture.current !== draft || historyRef.current.gesture?.id !== draft.id || editFingerprint(historyRef.current.present) !== editFingerprint(draft.baseline)) return;
    if (!result.ok) { setEditError(result.message); changeHistory(old => old.gesture?.id === draft.id ? { ...old, gesture: { ...old.gesture, preview: null } } : old); return; }
    setEditError("");
    const removedRegions = new Set(result.removedRegionIds), removedStamps = new Set(result.removedStampIds);
    const next: MapEditSnapshot = { document: result.document, cartography: result.cartography,
      anchors: draft.baseline.anchors.filter(anchor => !(anchor.targetKind === "region" && removedRegions.has(anchor.targetId) || anchor.targetKind === "stamp" && removedStamps.has(anchor.targetId))),
      addedBuildings: [...draft.baseline.addedBuildings.filter(intent => !removedRegions.has(intent.regionId)), ...result.addedBuildings],
      addedRooms: (draft.baseline.addedRooms ?? []).filter(intent => !removedRegions.has(intent.regionId)) };
    changeHistory(old => previewEdit(old, draft.id, next));
  };
  const startGesture = (path: TacticalPoint[], extra: { regionId?: string; stampId?: string; target?: InteriorTarget; operation?: CartographyEditOperation; interiorOperation?: InteriorEditOperation } = {}) => {
    cancelGesture(); const id = crypto.randomUUID(), seed = crypto.randomUUID();
    gesture.current = { id, seed, baseline: historyRef.current.present, path, ...extra };
    changeHistory(old => beginEdit(old, id, seed));
  };
  const finishGesture = () => { if (historyRef.current.gesture?.preview) changeHistory(acceptEdit); else changeHistory(cancelEdit); gesture.current = null; };
  const operationPreview = (operation: CartographyEditOperation) => { startGesture([[0, 0]], { operation }); computeGesture(); if (tools.direct) finishGesture(); };
  const interiorPreview = (interiorOperation: InteriorEditOperation) => { startGesture([[0, 0]], { interiorOperation }); computeGesture(); if (tools.direct) finishGesture(); };
  const chooseHit = (hit: MapHit | null) => {
    setInteriorSelected(null);
    if (hit?.kind === "cell") selectRegion(hit.id);
    else if (hit?.kind === "pin" && hit.id.startsWith("node:")) selectRegion(hit.id.slice(5));
    else { setSelectedObject(hit?.kind === "pin" ? hit.id : ""); setRegionId(""); }
  };
  const editor: MapEditorInteraction = {
    active: () => !editingDisabled && !drawing && !marking && !brush && !tools.hand,
    begin: (point, hit, pickedStampId) => {
      setFocusRequested(false);
      if (tools.tool === "select") {
        const primitive = interiorHit(document, point, Math.max(2, cartography.construction.cellSize * .12));
        if (primitive?.kind === "portal" || primitive && !pickedStampId) {
          setInteriorSelected(primitive); setSelectedObject(""); setRegionId(""); startGesture([point], { target: primitive }); return true;
        }
        if (pickedStampId) { setInteriorSelected(null); setRegionId(""); setSelectedObject(`stamp:${pickedStampId}`); startGesture([point], { stampId: pickedStampId }); return true; }
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
      if (draft.regionId || draft.stampId || draft.target || ["building", "room", "wall", "door"].includes(tools.tool)) draft.path = [draft.path[0]!, point];
      else if (draft.path.length < 512) draft.path.push(point);
      if (scheduled.current === null) scheduled.current = requestAnimationFrame(() => { scheduled.current = null; computeGesture(); });
    },
    commit: point => {
      const draft = gesture.current; if (!draft) return;
      if (scheduled.current !== null) cancelAnimationFrame(scheduled.current); scheduled.current = null;
      if ((draft.regionId || draft.stampId || draft.target) && Math.hypot(point[0] - draft.path[0]![0], point[1] - draft.path[0]![1]) < 1) { cancelGesture(); return; }
      draft.path.push(point); computeGesture();
      if (draft.regionId || draft.stampId || draft.target || tools.direct) finishGesture();
    },
    cancel: cancelGesture,
  };
  const reloadSaved = async (pending: NonNullable<typeof pendingSave>) => {
    const next = await api<TacticalMapCard>(apiPath(campaignId, `/tactical/maps/${pending.id}`));
    if (!mounted.current || identity.current !== pending.id || epoch.current !== pending.epoch || pendingRef.current !== pending) return;
    if (next.version !== pending.version) throw new Error(t("Gespeichert. Inzwischen liegt eine weitere Änderung vor; dein Entwurf bleibt erhalten. Lade die aktuelle Karte ausdrücklich neu."));
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
      ack = await command<TacticalAck>(apiPath(campaignId, `/tactical/maps/${baseline.id}/revision`), { schemaVersion: 3, expectedVersion: baseline.version,
        document: submitted.document, anchors: submitted.anchors, cartography: submitted.cartography, addedBuildings: submitted.addedBuildings, addedRooms: submitted.addedRooms ?? [] }, "PUT");
    } catch (error) { if (error instanceof ApiError && error.status === 409 && mounted.current) onChanged(); throw error; }
    if (!mounted.current || epoch.current !== startedEpoch || identity.current !== baseline.id) return;
    const pending = { submitted, version: ack.version, id: baseline.id, epoch: startedEpoch }; pendingRef.current = pending; setPendingSave(pending);
    await reloadSaved(pending);
  });
  const selectedRegion = cartography.regions.find(region => region.regionId === regionId);
  const selectedStamp = selectedObject.startsWith("stamp:") ? document.geometry.stamps.find(stamp => stamp.id === selectedObject.slice(6)) : undefined;
  const selectedOwner = selectedStamp ? cartography.regions.find(region => region.role === "building" ? region.attachedStampIds?.includes(selectedStamp.id) : region.role === "room" && region.interior?.stampIds.includes(selectedStamp.id)) : undefined;
  const selectedTarget: InteriorTarget | null = interiorSelected ?? (selectedRegion?.role === "room" ? { kind: "room", id: regionId } : null);
  const changeTool = (next: MapToolSettings) => { cancelGesture(); setTools(next); setBrush(null); setDrawing(false); setMarking(false); };
  const openAssets = () => { cancelGesture(); setTools(old => ({ ...old, tool: "select", hand: false })); setAssetsOpen(true); setDrawing(false); setMarking(false); setSheet(true); };
  const removeStamp = (id: string) => {
    if (selectedOwner?.locked) { setEditError(t("Der zugehörige Raum ist gesperrt.")); return; }
    if (blocked("einrichtung")) return;
    commit(old => ({ ...editDocument(old, { ...old.document, geometry: { ...old.document.geometry, stamps: old.document.geometry.stamps.filter(item => item.id !== id) }, geometryElevation: old.document.geometryElevation.filter(item => item.targetKind !== "stamp" || item.targetId !== id) }), anchors: old.anchors.filter(anchor => anchor.targetKind !== "stamp" || anchor.targetId !== id) })); setSelectedObject("");
  };
  const rotateSelection = () => {
    if (editingDisabled) return;
    if (brush) { setBrushTurns(turns => (turns + 1) % 4); return; }
    if (selectedStamp && blocked("einrichtung")) return;
    if (selectedStamp && !selectedOwner?.locked) setDocument(old => ({ ...old, geometry: { ...old.geometry, stamps: old.geometry.stamps.map(item => item.id === selectedStamp.id ? { ...item, r: (item.r + Math.PI / 2) % (2 * Math.PI) } : item) } }));
    else if (selectedTarget) interiorPreview({ kind: "interior-transform", target: selectedTarget, delta: [0, 0], quarterTurns: 1 });
    else if (regionId) operationPreview({ kind: "transform", regionId, delta: [0, 0], quarterTurns: 1 });
    else if (tools.tool === "building") setTools(old => ({ ...old, turns: ((old.turns + 1) % 4) as MapToolSettings["turns"] }));
  };
  const removeSelection = () => {
    if (editingDisabled) return;
    if (selectedStamp) removeStamp(selectedStamp.id);
    else if (selectedTarget) interiorPreview({ kind: "interior-remove", target: selectedTarget });
    else if (regionId) operationPreview({ kind: "remove", regionId });
  };
  const duplicateSelection = selectedStamp ? () => {
    if (editingDisabled || selectedOwner?.locked || document.geometry.stamps.length >= TACTICAL_MAP_LIMITS.stamps || blocked("einrichtung")) return;
    const id = crypto.randomUUID(), z = cartography.construction.cellSize;
    setDocument(old => ({ ...old, geometry: { ...old.geometry, stamps: [...old.geometry.stamps, { ...selectedStamp, id, x: Math.min(scene.width, selectedStamp.x + z), y: Math.min(scene.height, selectedStamp.y + z) }] } })); setSelectedObject(`stamp:${id}`);
  } : undefined;
  const toolHints: Record<MapToolSettings["tool"], string> = { select: t("Anklicken zum Auswählen · Ziehen zum Verschieben · R drehen · Entf entfernen"), terrain: t("Gelände mit gedrückter Maustaste malen"), relief: t("Über die Landschaft streichen, um Hügel und Täler zu formen"), road: t("Einen Weg aufziehen · Anschlüsse entstehen beim Zeichnen"), building: t("Klicken zum Bauen · R dreht das Gebäude"), room: t("Raum aufziehen oder klicken, um die gewählte Vorlage zu setzen"), wall: t("Vom Anfang bis zum Ende ziehen, um eine Wand zu bauen"), door: t("Auf eine Wand klicken: Die Tür rastet in die Wand ein") };
  if (revoked) return <section className="panel"><Notice error>{t("Die Kartenberechtigung wurde entzogen. Der Entwurf wird nicht weiter angezeigt.")}</Notice><Button disabled={task.busy} onClick={() => void task.run(async () => {
    await api<TacticalMapCard>(apiPath(campaignId, `/tactical/maps/${baseline.id}`));
    if (mounted.current) { setRevoked(false); onChanged(); }
  })}>{t("Kartensicht erneut laden")}</Button>{task.error ? <Notice error>{task.error}</Notice> : null}</section>;
  return <section className={`panel map-editor${sheet ? " map-editor-sheet" : ""}`} onKeyDown={event => {
    if (!(event.target instanceof HTMLCanvasElement) || editingDisabled) return;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "s") { event.preventDefault(); if (dirty && !history.gesture && !points.length) save(); return; }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const shortcut = ({ v: "select", t: "terrain", e: "relief", p: "road", b: "building", f: "room", w: "wall", d: "door" } as const)[key as "v"];
    if (shortcut) { event.preventDefault(); changeTool({ ...tools, tool: shortcut, hand: false }); }
    else if (key === "h") { event.preventDefault(); changeTool({ ...tools, hand: !tools.hand }); }
    else if (key === "o") { event.preventDefault(); openAssets(); }
    else if (key === "r") { event.preventDefault(); rotateSelection(); }
    else if (key === "delete" || key === "backspace") { event.preventDefault(); removeSelection(); }
    else if (key === "escape") { cancelGesture(); setBrush(null); setDrawing(false); setMarking(false); }
  }}><div className="page-heading"><div><p className="map-studio-brand"><Layers size={14} /> {t("Kartenstudio")}</p><h2>{baseline.name}</h2><p className="field-help">{t("Landschaft gestalten. Räume bauen. Geschichten einrichten.")}</p><p className="field-help">{t("Kartenrevision {revision}. Jedes Speichern legt eine neue Fassung an; eine laufende Szene behält die Fassung, mit der sie begonnen hat.", { revision: baseline.revision })}</p></div><div className="button-row map-editor-actions"><Button disabled={!history.past.length && !history.gesture || editingDisabled} onClick={() => { gesture.current = null; changeHistory(undoEdit); }}>{t("Rückgängig")}</Button><Button disabled={!history.future.length || editingDisabled || !!history.gesture} onClick={() => changeHistory(redoEdit)}>{t("Wiederholen")}</Button><Button disabled={task.busy || !dirty || !!pendingSave} onClick={() => { if (window.confirm(t("Alle ungespeicherten Kartenänderungen und gezeichneten Eckpunkte verwerfen?"))) replace(baseline); }}>{t("Entwurf zurücksetzen")}</Button><Button disabled={task.busy || revoked || !dirty || points.length > 0 || !!history.gesture} variant="primary" onClick={save}><Save size={15} />{pendingSave ? t("Gespeicherte Karte nachladen") : t("Kartenrevision speichern")}</Button></div></div>
    {current.version > baseline.version ? <Notice>{t("Eine neue Revision liegt vor.")} <Button onClick={() => { if (!dirty || window.confirm(t("Ungespeicherte Kartenänderungen verwerfen?"))) replace(current); }}>{t("Aktuelle Karte übernehmen")}</Button></Notice> : null}
    <p className="map-editor-status" role="status">{pendingSave ? t("Gespeichert, Nachladen ausstehend. Weitere Eingaben bleiben erhalten.") : history.gesture ? t("Vorschau · noch nicht übernommen") : historyDirty ? t("Ungespeicherter Entwurf") : t("Alle Änderungen gespeichert")}</p>
    <div className="map-editor-mobile-tabs"><Button aria-pressed={!sheet} onClick={() => setSheet(false)}>{t("Karte")}</Button><Button aria-pressed={sheet} onClick={() => setSheet(true)}>{t("Werkzeuge & Details")}</Button></div>
    {editError ? <Notice error>{editError}</Notice> : null}
    {revoked ? <Notice error>{t("Die Kartenberechtigung wurde entzogen. Der Entwurf wird nicht weiter angezeigt.")}</Notice> : null}
    <div className="map-editor-workspace"><MapEditTools value={tools} onChange={changeTool} cellSize={cartography.construction.cellSize} onAssets={openAssets} assetsActive={!!brush}
      selected={selectedRegion} selectedTitle={selectedStamp ? selectedStamp.a.split("/").at(-1)?.replaceAll("_", " ") : interiorSelected ? interiorSelected.kind === "portal" ? t("Tür") : t("Wand") : selectedNode?.titel}
      selectedKind={selectedStamp ? "stamp" : interiorSelected?.kind === "portal" ? "portal" : interiorSelected?.kind === "wall" ? "wall" : selectedRegion?.role === "room" ? "room" : undefined}
      {...(selectedOwner?.locked ? { selectedLocked: true } : {})} linked={!!nodesById.get(regionId)?.vorhandeneKarteId} busy={editingDisabled} childrenConfirmed={childrenConfirmed}
      onLock={() => commit(old => ({ ...old, cartography: { ...old.cartography, regions: old.cartography.regions.map(region => region.regionId === regionId ? { ...region, locked: !region.locked } : region) } }))}
      onRotate={rotateSelection} onDuplicate={duplicateSelection}
      onRemove={removeSelection} onVary={() => operationPreview({ kind: "variation", regionIds: [regionId] })} />
    <div className="map-editor-stage"><div className="map-editor-stage-toolbar"><span>{children.data?.art === "siedlung" ? t("Außenkarte") : t("Grundriss & Landschaft")}</span><div className="button-row">
      <label className="map-editor-mood" title={t("Die Stimmung wird mit der Karte gespeichert; auch Spieler sehen sie.")}><Palette size={15} />{t("Stimmung")}<select aria-label={t("Stimmung")} value={cartography.mood ?? "tag"} disabled={editingDisabled} onChange={event => {
        const mood = event.target.value as CartographyMood;
        commit(old => { const { mood: _previous, ...rest } = old.cartography; return { ...old, cartography: mood === "tag" ? rest : { ...rest, mood } }; });
      }}><option value="tag">{t("Tag")}</option><option value="nacht">{t("Nacht")}</option><option value="winter">{t("Winter")}</option><option value="herbst">{t("Herbst")}</option></select></label>
      <Button aria-pressed={layersOpen} onClick={() => setLayersOpen(value => !value)}><Layers size={15} />{t("Ebenen")}</Button><Button onClick={openAssets}><Layers size={15} />{t("Möbel & Objekte")}</Button></div></div>
    {layersOpen ? <div className="map-editor-layers" role="group" aria-label={t("Ebenen")}>{MAP_LAYERS.filter(layer => !layer.relief || cartography.relief).map(layer => {
      const hidden = layers.hidden.has(layer.id), locked = layers.locked.has(layer.id);
      // A switch, not a button: the tool buttons on the left already carry names like "Gelände".
      return <span key={layer.id} className="map-layer-chip" data-hidden={hidden} data-locked={locked}>
        <label className="map-layer-switch"><input type="checkbox" role="switch" checked={!hidden} onChange={() => setLayers(old => toggleLayer(old, layer.id, "hidden"))} />{hidden ? <EyeOff size={13} /> : <Eye size={13} />}{mapLayerLabel(layer.id)}</label>
        {layer.lockable ? <Button aria-pressed={locked} aria-label={locked ? t("Ebene freigeben") : t("Ebene sperren")} title={locked ? t("Ebene freigeben") : t("Ebene sperren")} onClick={() => setLayers(old => toggleLayer(old, layer.id, "locked"))}>{locked ? <Lock size={13} /> : <Unlock size={13} />}</Button> : null}
      </span>;
    })}<p className="field-help">{t("Ausblenden, was gerade stört; sperren, was fertig ist. Beides gilt nur für deine Ansicht beim Bearbeiten und wird nicht gespeichert.")}</p></div> : null}
    <TacticalCanvas scene={scene} onContextMenu={onContextMenu ? (hit, at) => onContextMenu(hit?.kind === "pin" && hit.id.startsWith("node:") ? { ...hit, id: hit.id.slice(5) } : hit, at) : undefined} editor={editor} onUndo={() => { gesture.current = null; changeHistory(undoEdit); }} onRedo={() => changeHistory(redoEdit)} onScopeInvalidated={() => { cancelGesture(); setRevoked(true); setSelectedObject(""); setRegionId(""); onChanged(); }} tileBase={apiPath(campaignId, `/tactical/maps/${baseline.id}/tiles`)} tileQuery={`revision=${baseline.revision}&layer=background`} onPoint={addPoint} selection={regionId ? { kind: "cell", id: regionId } : focusedObject ? { kind: "pin", id: selectedObject } : null} focusObject={focusRequested && !history.gesture && focusedObject ? { id: selectedObject, x: focusedObject.x, y: focusedObject.y } : null} onSelect={hit => {
      if (editingDisabled || drawing || marking || brush) return;
      if (hit?.kind === "cell") selectRegion(hit.id);
      else if (hit?.kind === "pin" && hit.id.startsWith("node:")) selectRegion(hit.id.slice(5));
      else { setSelectedObject(hit?.kind === "pin" ? hit.id : ""); setRegionId(""); }
    }} />
    <div className="map-editor-hint"><MousePointer2 size={14} /><span>{brush ? t("Objekt durch Klicken platzieren · R drehen · Esc beendet das Platzieren") : tools.hand ? t("Ziehen zum Verschieben der Karte") : toolHints[tools.tool]}</span></div>
    {brush ? <div className="map-editor-stage-toolbar"><Button onClick={() => setBrushTurns(value => (value + 1) % 4)}><RotateCw size={15} /> {t("Objekt drehen · {grad}°", { grad: brushTurns * 90 })}</Button><label>{t("Objektgröße")}<select value={brushScale} onChange={event => setBrushScale(Number(event.target.value))}><option value={.5}>{t("Halb")}</option><option value={1}>{t("Normal")}</option><option value={1.5}>{t("Groß")}</option><option value={2}>{t("Doppelt")}</option></select></label><Button onClick={() => setBrush(null)}>{t("Platzieren beenden")}</Button></div> : null}
    {history.gesture ? <div className="map-editor-preview-actions"><Button variant="primary" disabled={!history.gesture.preview || editingDisabled} onClick={() => { gesture.current = null; changeHistory(acceptEdit); }}>{t("Vorschau übernehmen")}</Button><Button onClick={cancelGesture}>{t("Vorschau verwerfen")}</Button></div> : null}
    </div><div className="map-editor-details"><div className="map-editor-topline"><strong>{t("Details & Einrichtung")}</strong><small>{t("{flaechen} Flächen · {waende} Wände · {tueren} Türen", { flaechen: document.geometry.regions.length, waende: document.walls.length, tueren: document.portals.length })}</small></div>
    <details className="map-editor-section" open={assetsOpen} onToggle={event => setAssetsOpen(event.currentTarget.open)}><summary>{t("Einrichtung & Kartenassets")}</summary><fieldset className="tactical-command-fields" disabled={editingDisabled}><MapArtworkPalette document={document} brush={brush} onBrush={next => { cancelGesture(); setBrush(next); setDrawing(false); setMarking(false); if (next) setSheet(false); }} selected={selectedObject.startsWith("stamp:") ? selectedObject.slice(6) : ""}
      onSelect={id => { setSelectedObject(id ? `stamp:${id}` : ""); setRegionId(""); setInteriorSelected(null); setFocusRequested(true); }} onUpdate={stamp => { if (!selectedOwner?.locked && !blocked("einrichtung")) setDocument(old => ({ ...old, geometry: { ...old.geometry, stamps: old.geometry.stamps.map(item => item.id === stamp.id ? stamp : item) } })); }}
      onRemove={removeStamp} /></fieldset></details>
    {selectedNode ? <div className="tactical-object-selected"><strong>{selectedNode.titel}</strong>{selectedNode.bauwerk?.beschreibung ? <p>{selectedNode.bauwerk.beschreibung}</p> : null}
      {onOpenInterior ? <Button disabled={dirty || !childrenConfirmed} onClick={() => onOpenInterior(selectedNode.knotenId, selectedNode.vorhandeneKarteId)}>{selectedNode.vorhandeneKarteId ? t("Innenraum bearbeiten") : t("Innenraum anlegen")}</Button> : null}
      {dirty && onOpenInterior ? <p className="field-help">{t("Speichere deinen Entwurf, um den Innenraum zu öffnen.")}</p> : null}
      {visible.addedRooms?.some(intent => intent.regionId === regionId) ? <label>{t("Raumname")}<input maxLength={160} value={visible.addedRooms.find(intent => intent.regionId === regionId)?.titel ?? ""} onChange={event => { const titel = event.target.value; commit(old => ({ ...old, addedRooms: old.addedRooms?.map(intent => intent.regionId === regionId ? { ...intent, titel } : intent) })); }} /></label> : null}
    </div> : null}
    {selectedRegion?.role === "room" && selectedRegion.interior ? <form className="map-editor-room-size" key={regionId} onSubmit={event => {
      event.preventDefault(); const data = new FormData(event.currentTarget), width = Number(data.get("width")), height = Number(data.get("height"));
      const polygon = document.geometry.regions.find(region => region.id === regionId)!; const left = Math.min(...polygon.punkte.map(p => p[0])), top = Math.min(...polygon.punkte.map(p => p[1]));
      if (width > 0 && height > 0) interiorPreview({ kind: "room-resize", regionId, from: [left, top], to: [left + width * cartography.construction.cellSize, top + height * cartography.construction.cellSize] });
    }}><strong>{t("Raumgröße")}</strong><p className="field-help">{t("Wände, Türen und zugehörige Einrichtung werden mitgeführt.")}</p><div className="map-numbers">{(["width", "height"] as const).map((name, axis) => {
      const coordinates = document.geometry.regions.find(region => region.id === regionId)!.punkte.map(p => p[axis]!);
      return <label key={name}>{axis ? t("Raumtiefe in Zellen") : t("Raumbreite in Zellen")}<input name={name} type="number" min={.5} step={.5} defaultValue={(Math.max(...coordinates) - Math.min(...coordinates)) / cartography.construction.cellSize} required /></label>;
    })}</div><Button type="submit" disabled={editingDisabled || selectedRegion.locked}>{t("Raumgröße anwenden")}</Button></form> : null}
    {children.error ? <Notice error>{t("Die Gebäudenamen konnten nicht geladen werden.")} {children.error} <Button onClick={() => setChildrenRefresh(value => value + 1)}>{t("Innenräume erneut prüfen")}</Button></Notice> : null}
    {visibleObjects.length < objects.length ? <Notice>{t("{sichtbar} von {gesamt} Objekten auf der Karte. Die vollständige Liste unten bleibt durchsuchbar; ihre Auswahl wird auf der Karte gezeigt, sofern ihre Position innerhalb der Karte liegt.", { sichtbar: visibleObjects.length, gesamt: objects.length })}</Notice> : null}
    <fieldset className="tactical-command-fields" disabled={editingDisabled}><details className="map-editor-section" open={knowledgeOpen} onToggle={event => setKnowledgeOpen(event.currentTarget.open)}><summary>{t("Wissensregionen & Verknüpfungen")}</summary><section><p className="field-help">{t("Zeichne eine Region, indem du ihre Eckpunkte auf der Karte anklickst, oder trage die Koordinaten ein. Die Liste funktioniert auch ohne Grafikbeschleunigung.")}</p>
      <Button aria-pressed={drawing} onClick={() => { setBrush(null); setMarking(false); setDrawing(v => !v); }}>{drawing ? t("Zeichnen pausieren") : t("Region zeichnen")}</Button>
      <div className="rule-fields"><label>{t("Eckpunkt X")}<input type="number" min={0} max={scene.width} value={pointX} onChange={e => setPointX(e.target.valueAsNumber)} /></label><label>{t("Eckpunkt Y")}<input type="number" min={0} max={scene.height} value={pointY} onChange={e => setPointY(e.target.valueAsNumber)} /></label></div>
      <Button disabled={!Number.isFinite(pointX) || !Number.isFinite(pointY)} onClick={() => { setBrush(null); setMarking(false); setDrawing(true); if (pointX >= 0 && pointY >= 0 && pointX <= scene.width && pointY <= scene.height) setPoints(old => [...old, [pointX, pointY]]); }}>{t("Eckpunkt hinzufügen")}</Button>
      {points.length ? <><p>{t("{anzahl} Eckpunkte vorbereitet.", { anzahl: points.length })}</p><ol className="tactical-points">{points.map((p, i) => <li key={i}>{p[0].toFixed(1)}, {p[1].toFixed(1)} <Button aria-label={t("Eckpunkt {nummer} entfernen", { nummer: i + 1 })} onClick={() => setPoints(old => old.filter((_, index) => index !== i))}>{t("Entfernen")}</Button></li>)}</ol><div className="button-row"><Button disabled={points.length < 3} onClick={() => { const id = crypto.randomUUID(); setDocument(old => ({ ...old, geometry: { ...old.geometry, regions: [...old.geometry.regions, { id, punkte: points }] } })); setRegionId(id); setPoints([]); setDrawing(false); }}>{t("Region schließen")}</Button><Button onClick={() => { setPoints([]); setDrawing(false); }}>{t("Zeichnung verwerfen")}</Button></div></> : null}
      <label>{t("Region auswählen")}<select aria-label={t("Region auswählen")} value={regionId} onChange={e => selectRegion(e.target.value, true)}><option value="">{t("Region wählen")}</option>{document.geometry.regions.map((r, i) => <option value={r.id} key={r.id}>{nodesById.get(r.id)?.titel ?? t("Region {nummer}", { nummer: i + 1 })}{" · "}{anchors.some(a => a.targetKind === "region" && a.targetId === r.id) ? t("Verknüpft") : t("Privat")}</option>)}</select></label>
      <label>{t("Wissen aus Artikel")}<select value={entryId} onChange={e => { setEntryId(e.target.value); setPassageId(""); }}><option value="">{t("Artikel wählen")}</option>{entries.data?.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
      <label>{t("Erforderliche Passage")}<select value={passageId} onChange={e => setPassageId(e.target.value)}><option value="">{t("Eine bekannte Passage des Artikels genügt")}</option>{article.data?.passagen.map((p, i) => <option key={p.pid} value={p.pid}>{i + 1}. {plainText(p.inhalt).slice(0, 100)}</option>)}</select></label>
      <div className="button-row"><Button disabled={!regionId || !entryId} onClick={bind}>{t("Region mit Wissen verknüpfen")}</Button><Button disabled={!regionId} onClick={() => setAnchors(old => old.filter(a => !(a.targetKind === "region" && a.targetId === regionId)))}>{t("Verknüpfung lösen")}</Button></div>
      {entries.error || article.error ? <Notice error>{entries.error || article.error}</Notice> : null}
    </section></details><details className="map-editor-section"><summary>{t("Raster, Maßstab & Export")}</summary><section><label>{t("Raster")}<select aria-label={t("Kartenraster")} value={document.grid.kind} onChange={e => setDocument(old => ({ ...old, grid: e.target.value === "none" ? { kind: "none" } : e.target.value === "hex" ? { kind: "hex", size: 100, origin: [0, 0], orientation: "pointy", offset: "odd" } : { kind: "square", size: 100, origin: [0, 0] } }))}><option value="square">{t("Quadratisch")}</option><option value="hex">{t("Sechseckig")}</option><option value="none">{t("Ohne Raster")}</option></select></label>
      {document.grid.kind !== "none" ? <label>{document.grid.kind === "hex" ? t("Hex-Radius in Pixeln") : t("Zellgröße in Pixeln")}<input type="number" min={.001} step="any" value={document.grid.size} onChange={e => { const value = e.target.valueAsNumber; setDocument(old => old.grid.kind === "none" ? old : { ...old, grid: { ...old.grid, size: value } }); }} /></label> : null}
      {document.grid.kind === "hex" ? <label>{t("Hex-Ausrichtung")}<select value={document.grid.orientation} onChange={e => setDocument(old => old.grid.kind !== "hex" ? old : { ...old, grid: { ...old.grid, orientation: e.target.value as "pointy" | "flat" } })}><option value="pointy">{t("Spitze oben")}</option><option value="flat">{t("Flache Seite oben")}</option></select></label> : null}
      <label>{t("Welteinheiten pro Pixel")}<input type="number" min={.000001} step="any" value={document.frame.einheitenProPixel} onChange={e => setDocument(old => ({ ...old, frame: { ...old.frame, einheitenProPixel: e.target.valueAsNumber } }))} /></label>
      <label>{t("Grundhöhe")}<input type="number" step="any" value={document.elevation} onChange={e => setDocument(old => ({ ...old, elevation: e.target.valueAsNumber }))} /></label>
      <p className="field-help">{t("Raster und Höhe helfen bei der Platzierung. Wände, Licht und Portale bleiben Daten; daraus wird keine automatische Sicht oder Bewegungssperre berechnet.")}</p>
      <Button onClick={() => void task.run(async () => { const exported = await api<{ json: string; fidelity: { issues: { message: string }[] } }>(apiPath(campaignId, `/tactical/maps/${baseline.id}/uvtt?revision=${baseline.revision}`)); const blob = new Blob([exported.json], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = window.document.createElement("a"); a.href = url; a.download = "scene.dd2vtt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); if (mounted.current) setExportInfo(exported.fidelity.issues.map(i => i.message).join(" ") || t("Die gespeicherte Karte wurde exportiert.")); })}>{t("Gespeicherte Revision als UVTT exportieren")}</Button>{exportInfo ? <Notice>{exportInfo}</Notice> : null}
    </section></details><details className="map-editor-section" open={objectsOpen} onToggle={event => setObjectsOpen(event.currentTarget.open)}><summary>{t("Orte & Kartenobjekte")}</summary><TacticalEntitiesEditor campaignId={campaignId} document={document} anchors={[...anchors]} objects={objects} entries={entries.data ?? []} selected={selectedObject} onSelect={id => { setSelectedObject(id); setFocusRequested(true); }} marking={marking} onMarking={value => { setBrush(null); setMarking(value); setDrawing(false); }} onChange={(next, bindings) => commit(old => ({ ...editDocument(old, next), anchors: bindings }))} /></details></fieldset>{task.error ? <Notice error>{task.error}</Notice> : null}
  </div></div></section>;
}
