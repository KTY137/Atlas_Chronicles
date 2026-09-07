// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, DoorOpen, Link, Map, Pencil, RefreshCw, WandSparkles } from "lucide-react";
import type { TacticalMapCard, TacticalMapSummary } from "@chronicle/protocol";
import type { ProjectedMapScene } from "@chronicle/render";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { useCommand } from "./game-api";
import { TacticalCanvas } from "./TacticalCanvas";
import { MapEditor, ScenePlan } from "./TacticalPreparation";
import "./tactical.css";
import "./NestedMapView.css";

export interface MapAncestor { kind: "atlas" | "tactical"; id: string; title: string }
interface Entrance { knotenId: string; titel: string; x: number; y: number; canEnter: boolean; vorhandeneKarteId: string | null }
interface Children { nodes: Entrance[]; version: number; ancestors: MapAncestor[] }

/** The same persisted tactical map is both a nested atlas view and an editable scene. */
export function NestedMapView({ campaignId, mapId, revision, onNavigate, onRoot, onChanged, onDirty }: {
  campaignId: string; mapId: string; revision: number; onNavigate: (ancestor: MapAncestor) => void;
  onRoot: () => void; onChanged: () => void; onDirty: (dirty: boolean) => void;
}) {
  const path = apiPath(campaignId, `/tactical/maps/${encodeURIComponent(mapId)}`);
  const map = useResource<TacticalMapCard>(path, revision, 10000);
  const children = useResource<Children>(apiPath(campaignId, `/maps/tactical/${encodeURIComponent(mapId)}/children`), revision, 10000);
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState({ map: false, plan: false });
  const dirty = drafts.map || drafts.plan;
  const reportMap = useCallback((value: boolean) => setDrafts(old => ({ ...old, map: value })), []);
  const reportPlan = useCallback((value: boolean) => setDrafts(old => ({ ...old, plan: value })), []);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const guard = () => !dirty || window.confirm("Ungespeicherte Kartenänderungen verwerfen?");
  const navigate = (ancestor: MapAncestor) => { if (guard()) onNavigate(ancestor); };
  const entrances = children.data?.nodes ?? [];
  const selected = entrances.find(node => node.knotenId === selectedId);
  const ancestors = children.data?.ancestors ?? [];
  const scene = useMemo<ProjectedMapScene | null>(() => {
    if (!map.data) return null;
    const document = map.data.document;
    return {
      id: mapId, width: document.geometry.size[0], height: document.geometry.size[1],
      ...(document.background ? { rasterScope: map.data.contentHash } : {}),
      cells: document.geometry.regions.map(region => ({ id: region.id, polygon: region.punkte, fill: 0x375949 })),
      lines: document.walls.map(wall => ({ id: wall.id, points: wall.points })), grid: document.grid,
      stamps: document.geometry.stamps.map(stamp => ({ id: stamp.id, asset: stamp.a, x: stamp.x, y: stamp.y, s: stamp.s, r: stamp.r, l: stamp.l })),
      pins: (children.data?.nodes ?? []).map(node => ({ id: node.knotenId, x: node.x, y: node.y, label: node.titel,
        icon: node.vorhandeneKarteId ? "portal" as const : "place" as const })),
    };
  }, [map.data, mapId, children.data]);

  return <section className="atlas-feature nested-map-view" aria-label="Unterkarte">
    <nav className="atlas-breadcrumbs" aria-label="Kartenpfad">
      <Button variant="quiet" onClick={() => { if (guard()) {
        const root = ancestors[0]; if (root?.kind === "atlas") onNavigate(root); else onRoot();
      } }}><Map size={16} /> Hauptkarte</Button>
      {ancestors.map((ancestor, index) => <span key={`${ancestor.kind}:${ancestor.id}`}><span aria-hidden="true">/</span>
        <button type="button" aria-current={index === ancestors.length - 1 ? "page" : undefined}
          disabled={ancestor.kind === "tactical" && ancestor.id === mapId} onClick={() => navigate(ancestor)}>{ancestor.title}</button></span>)}
    </nav>
    <header className="atlas-heading"><div><p className="eyebrow">Unterkarte · Auf eurem Server gespeichert</p><h1>{map.data?.name ?? "Karte öffnen"}</h1>
      <p className="muted">Jeder Eingang führt zu einer eigenen Karte. Eure Änderungen bleiben beim Zurückkehren erhalten.</p></div>
      <div className="button-row"><Button variant="quiet" aria-label="Unterkarte aktualisieren" onClick={onChanged}><RefreshCw size={16} /></Button><Button variant="quiet" onClick={() => {
        const parent = ancestors.at(-2); if (guard()) { if (parent) onNavigate(parent); else onRoot(); }
      }}><ArrowLeft size={16} /> Eine Ebene zurück</Button>
        <Button aria-pressed={editing} onClick={() => { if (guard()) { setDrafts({ map: false, plan: false }); setEditing(value => !value); } }}><Pencil size={16} /> {editing ? "Karte ansehen" : "Karte bearbeiten"}</Button></div>
    </header>
    {map.error || children.error ? <Notice error>{map.error || children.error}<Button onClick={onChanged}>Erneut laden</Button></Notice> : null}
    {map.loading ? <Loading text="Unterkarte wird geöffnet …" /> : null}
    {map.data && scene ? editing ? <><MapEditor key={mapId} current={map.data} campaignId={campaignId} onChanged={onChanged} onDirty={reportMap} />
      <ScenePlan key={`plan:${mapId}`} campaignId={campaignId} map={map.data} revision={revision} onChanged={onChanged} onDirty={reportPlan} /></>
      : <div className="nested-map-workspace"><div><TacticalCanvas scene={scene} tileBase={`${path}/tiles`} tileQuery={`revision=${map.data.revision}`}
        selection={selected ? { kind: "pin", id: selected.knotenId } : null}
        onSelect={hit => {
          if (hit?.kind !== "pin" && hit?.kind !== "cell") { setSelectedId(""); return; }
          const node = entrances.find(item => item.knotenId === hit.id);
          if (node?.vorhandeneKarteId) navigate({ kind: "tactical", id: node.vorhandeneKarteId, title: node.titel });
          else setSelectedId(node?.knotenId ?? "");
        }} />
        <p className="field-help"><DoorOpen size={14} /> Eingangs-Icons öffnen Unterkarten direkt. Wähle einen Raum, um eine weitere Ebene anzulegen.</p></div>
        <aside className="panel nested-map-rooms" aria-label="Räume und Unterkarten"><h2>Räume &amp; Unterkarten</h2>
          {children.loading ? <Loading /> : !entrances.length ? <EmptyState title="Noch keine Räume">Lege im Karteneditor eine Region an, um darin eine Unterkarte zu verknüpfen.</EmptyState> : null}
          <ul>{entrances.map(node => <li key={node.knotenId}><button type="button" aria-pressed={selectedId === node.knotenId} onClick={() => {
            if (node.vorhandeneKarteId) navigate({ kind: "tactical", id: node.vorhandeneKarteId, title: node.titel }); else setSelectedId(node.knotenId);
          }}>{node.vorhandeneKarteId ? <DoorOpen size={18} /> : <Map size={18} />}<span>{node.titel}<small>{node.vorhandeneKarteId ? "Unterkarte öffnen" : "Raum auswählen"}</small></span></button></li>)}</ul>
          {selected && children.data ? <MapEntrance key={selected.knotenId} campaignId={campaignId} parentKind="tactical" parentMapId={mapId}
            nodeId={selected.knotenId} title={selected.titel} version={children.data.version} canEnter={selected.canEnter} childMapId={selected.vorhandeneKarteId}
            onOpen={id => navigate({ kind: "tactical", id, title: selected.titel })} onChanged={onChanged} /> : null}
        </aside></div> : null}
  </section>;
}

export function MapEntrance({ campaignId, parentKind, parentMapId, nodeId, title, version, canEnter, childMapId, onOpen, onChanged }: {
  campaignId: string; parentKind: "atlas" | "tactical"; parentMapId: string; nodeId: string; title: string; version: number;
  canEnter: boolean; childMapId?: string | null; onOpen: (id: string) => void; onChanged: () => void;
}) {
  const task = useTask(), command = useCommand();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [linking, setLinking] = useState(false), [targetId, setTargetId] = useState("");
  const maps = useResource<TacticalMapSummary[]>(linking ? apiPath(campaignId, "/tactical/maps") : null);
  const enter = (targetMapId?: string) => void task.run(async () => {
    try {
      const result = await command<{ mapId: string }>(apiPath(campaignId, "/betreten"), {
        parentKind, parentMapId, knotenId: nodeId, expectedVersion: version, name: title.slice(0, 160), ...(targetMapId ? { targetMapId } : {}),
      });
      if (mounted.current) { onChanged(); onOpen(result.mapId); }
    } catch (error) { if (mounted.current) onChanged(); throw error; }
  });
  return <section className="atlas-inspector-section atlas-entrance"><h3><DoorOpen size={17} /> Unterkarte</h3>
    {childMapId ? <Button variant="primary" onClick={() => onOpen(childMapId)}><DoorOpen size={16} /> Unterkarte öffnen</Button> : <>
      <p>Erzeuge einen Grundriss für diesen Ort oder verbinde eine vorhandene Szenenkarte.</p>
      <Button variant="primary" disabled={task.busy || !canEnter} onClick={() => enter()}><WandSparkles size={16} /> {task.busy ? "Karte wird verbunden …" : "Unterkarte erzeugen"}</Button>
      <Button variant="quiet" disabled={task.busy} onClick={() => setLinking(value => !value)}><Link size={16} /> Vorhandene Karte verbinden</Button>
      {linking ? <form onSubmit={event => { event.preventDefault(); if (targetId) enter(targetId); }}>
        <label>Szenenkarte<select value={targetId} onChange={event => setTargetId(event.target.value)} required disabled={task.busy}>
          <option value="">Karte wählen …</option>{maps.data?.filter(map => parentKind !== "tactical" || map.id !== parentMapId).map(map => <option key={map.id} value={map.id}>{map.name}</option>)}
        </select></label>{maps.loading ? <Loading /> : null}{maps.error ? <Notice error>{maps.error}</Notice> : null}
        <Button type="submit" disabled={!targetId || task.busy}>Als Unterkarte verbinden</Button>
      </form> : null}</>}
    {task.error ? <Notice error>{task.error}</Notice> : null}
  </section>;
}
