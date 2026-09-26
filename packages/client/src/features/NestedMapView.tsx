// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Anvil, ArrowLeft, Beer, Building2, Castle, Church, DoorOpen, House, Link, Map, Pencil, RefreshCw, Search, Warehouse, WandSparkles } from "lucide-react";
import type { MapDeletionAck, MapReference, TacticalMapCard, TacticalMapSummary, MapFloorView } from "@chronicle/protocol";
import { BAUWERK_LABEL, BAUWERK_TYPEN, KARTEN_SETTING_LABEL, type BauwerkTyp, type KartenSetting } from "@chronicle/szene";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import type { SiedlungArt, SiedlungStandort } from "@chronicle/forge";
import { t } from "../i18n";
import { useCommand } from "./game-api";
import { TacticalCanvas, type MapCanvasContext } from "./TacticalCanvas";
import { MapContextMenu, type MapContextAction } from "./MapContextMenu";
import { MapDeleteDialog } from "./MapDeleteDialog";
import { MapEditor, ScenePlan } from "./TacticalPreparation";
import { MapGenerationControls } from "./MapGenerationControls";
import { BUILDING_COLORS, generationError, generationOptions, generationSettings, mapDocumentScene, type GenerationDefaults, type MapArt, type MapNode, type MapStyle } from "./map-generation";
import "./tactical.css";
import "./map-workshop.css";
import "./NestedMapView.css";
import { MapFloorsPanel } from "./MapFloorsPanel";
import { stairLabel } from "./TacticalView";
import { RoomFogControls } from "./RoomFogControls";

export interface MapAncestor { kind: "atlas" | "tactical"; id: string; title: string; edit?: boolean; focus?: { id: string; x: number; y: number } }
interface Entrance extends MapNode { canEnter: boolean; vorhandeneKarteId: string | null; erzeugungsArt?: MapArt; siedlung?: { art: SiedlungArt; standort: SiedlungStandort } }
interface Children { nodes: Entrance[]; version: number; ancestors: MapAncestor[]; art?: MapArt; stil?: MapStyle; setting?: KartenSetting }
const BUILDING_ICONS: Partial<Record<BauwerkTyp, typeof House>> = { haus: House, kirche: Church, taverne: Beer, schmiede: Anvil, lager: Warehouse, turm: Castle, burg: Castle, kaserne: Castle, bauernhof: House, muehle: Warehouse, rathaus: Building2 };
const NO_ENTRANCES: Entrance[] = [];

export function NestedMapView({ campaignId, mapId, revision, onNavigate, onRoot, onChanged, onDirty, initialEditing = false, initialFocus }: {
  campaignId: string; mapId: string; revision: number; onNavigate: (ancestor: MapAncestor) => void;
  onRoot: () => void; onChanged: () => void; onDirty: (dirty: boolean) => void;
  initialEditing?: boolean; initialFocus?: { id: string; x: number; y: number };
}) {
  const path = apiPath(campaignId, `/tactical/maps/${encodeURIComponent(mapId)}`);
  const map = useResource<TacticalMapCard>(path, revision, 10000);
  const children = useResource<Children>(apiPath(campaignId, `/maps/tactical/${encodeURIComponent(mapId)}/children`), revision, 10000);
  const floorData = useResource<MapFloorView>(`${path}/floors`, revision, 10000);
  const floorLinks = floorData.data?.stack.links.filter(link => link.fromMapId === mapId || link.toMapId === mapId) ?? [];
  const [selectedId, setSelectedId] = useState(initialFocus?.id ?? ""), [query, setQuery] = useState(""), [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(initialEditing), [drafts, setDrafts] = useState({ map: false, plan: false, metadata: false });
  const [deleting,setDeleting] = useState<MapReference | null>(null);
  const [canvasMenu,setCanvasMenu] = useState<{ key: number; nodeId?: string; x: number; y: number } | null>(null);
  const [invalidated, setInvalidated] = useState<TacticalMapCard | null>(null);
  const dirty = drafts.map || drafts.plan || drafts.metadata;
  const reportMap = useCallback((value: boolean) => setDrafts(old => ({ ...old, map: value })), []);
  const reportPlan = useCallback((value: boolean) => setDrafts(old => ({ ...old, plan: value })), []);
  const reportMetadata = useCallback((value: boolean) => setDrafts(old => ({ ...old, metadata: value })), []);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const guard = () => !dirty || window.confirm(t("Ungespeicherte Kartenänderungen verwerfen?"));
  const navigate = (ancestor: MapAncestor) => { if (guard()) onNavigate(ancestor); };
  const requestDelete = (id: string) => { if (guard()) setDeleting({ kind:"tactical",id }); };
  const deleted = (ack: MapDeletionAck) => {
    setDeleting(null); onChanged();
    if (ack.deletedMaps.some(map => map.kind === "tactical" && map.id === mapId)) {
      setDrafts({ map:false,plan:false,metadata:false });
      if (ack.parent) onNavigate({ kind:ack.parent.kind,id:ack.parent.id,title:ack.parent.name }); else onRoot();
    } else { setSelectedId(""); setDrafts(old => ({ ...old,metadata:false })); }
  };
  const entrances = children.data?.nodes ?? NO_ENTRANCES, selected = entrances.find(node => node.knotenId === selectedId);
  const ancestors = children.data?.ancestors ?? [], city = children.data?.art === "siedlung" || entrances.some(node => node.art === "bauwerk");
  const presentTypes = BAUWERK_TYPEN.filter(typ => entrances.some(node => node.bauwerk?.typ === typ));
  const cartographic = !!(map.data?.cartography ?? map.data?.legacyCartography);
  const choose = (nodeId: string) => { if (nodeId === selectedId || guard()) setSelectedId(nodeId); };
  const mapActions: MapContextAction[] = [
    { id:"open",label:t("Karte ansehen"),onSelect:() => { if (guard()) setEditing(false); } },
    { id:"edit",label:t("Karte bearbeiten"),onSelect:() => { if (guard()) setEditing(true); } },
    { id:"delete",label:t("Karte löschen …"),danger:true,disabled:!map.data,onSelect:() => requestDelete(mapId) },
  ];
  const entranceActions = (node: Entrance): MapContextAction[] => [
    { id:"open",label:node.vorhandeneKarteId ? t("Unterkarte öffnen") : t("Ort auswählen"),onSelect:() => node.vorhandeneKarteId ? navigate({kind:"tactical",id:node.vorhandeneKarteId,title:node.titel}) : choose(node.knotenId) },
    { id:"edit",label:node.vorhandeneKarteId ? t("Unterkarte bearbeiten") : t("Ortsdaten bearbeiten"),onSelect:() => node.vorhandeneKarteId ? navigate({kind:"tactical",id:node.vorhandeneKarteId,title:node.titel,edit:true}) : choose(node.knotenId) },
    ...(node.vorhandeneKarteId ? [{ id:"delete",label:t("Unterkarte löschen …"),danger:true,onSelect:() => requestDelete(node.vorhandeneKarteId!) }] : []),
  ];
  const canvasContext: MapCanvasContext = (hit,at) => {
    const node = hit && (hit.kind === "pin" || hit.kind === "cell") ? entrances.find(node => node.knotenId === hit.id) : undefined;
    const role = hit?.kind === "cell" ? (map.data?.cartography ?? map.data?.legacyCartography)?.regions.find(region=>region.regionId===hit.id)?.role : undefined;
    const background = role && role !== "building" && role !== "room" && children.loaded && !children.error && children.data?.version === map.data?.version;
    // Known terrain belongs to this map. An entrance that has not loaded never means its parent.
    if (hit && !node && !background) { setCanvasMenu(null); return; }
    setCanvasMenu({ ...at,key:performance.now(),nodeId:node?.knotenId });
  };
  const menuNode = canvasMenu?.nodeId ? entrances.find(node => node.knotenId === canvasMenu.nodeId) : undefined;
  useEffect(() => { setCanvasMenu(null); },[mapId,map.data?.version]);
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de");
    return entrances.filter(node => (filter === "all" || (filter === "linked" ? !!node.vorhandeneKarteId : node.bauwerk?.typ === filter))
      && (!needle || `${node.titel} ${node.bauwerk ? BAUWERK_LABEL[node.bauwerk.typ] : ""} ${node.bauwerk?.beschreibung ?? ""}`.toLocaleLowerCase("de").includes(needle)));
  }, [entrances, query, filter]);
  const scene = useMemo(() => {
    if (!map.data) return null;
    // A drawn map comes from the server as finished tiles, in the same Atlas look the table shows;
    // furniture, walls, names and entrances are drawn live above them.
    const painted = !!map.data.cartography && !map.data.document.background;
    const result = mapDocumentScene(mapId, map.data.document, entrances, children.data?.art, map.data.document.background || painted ? map.data.rasterDigest ?? map.data.contentHash : undefined, children.data?.setting, map.data.cartography ?? map.data.legacyCartography);
    return { ...result, ...(painted ? { drawing: undefined, paintCells: false } : {}), pins: result.pins.map(pin => {
      const node = entrances.find(item => item.knotenId === pin.id)!;
      return { ...pin, ...(node.vorhandeneKarteId ? { icon: "portal" as const } : {}) };
    }).concat(floorLinks.map(link => {
      // The same words as at the table: where the stair leads, up or down.
      const floors = floorData.data?.stack.floors ?? [], here = floors.find(floor => floor.mapId === mapId), there = floors.find(floor => floor.mapId === (link.fromMapId === mapId ? link.toMapId : link.fromMapId));
      const label = here && there ? stairLabel({ id: link.id, name: link.name, kind: link.kind, x: link.position[0], y: link.position[1], toLevel: there.level, toName: there.name }, here.level) : link.name;
      return { id: `floor-link:${link.id}`, x: link.position[0], y: link.position[1], label, icon: "portal" as const };
    })) };
  }, [map.data, mapId, entrances, children.data?.art, children.data?.setting, floorData.data]);

  if (map.data && invalidated === map.data || !map.data && map.error) return <section className="atlas-feature nested-map-view" aria-label={t("Unterkarte")}><Notice error>{t("Die Kartensicht ist nicht mehr verfügbar. Namen und Kartenobjekte werden erst nach einer neuen erlaubten Antwort angezeigt.")}</Notice><Button onClick={onChanged}>{t("Kartensicht erneut laden")}</Button><Button onClick={onRoot}>{t("Zur Hauptkarte")}</Button></section>;
  return <section className="atlas-feature nested-map-view" aria-label={t("Unterkarte")}>
    {canvasMenu && map.data && (!canvasMenu.nodeId || menuNode) ? <MapContextMenu key={canvasMenu.key} label={menuNode?.titel ?? map.data.name}
      actions={menuNode ? entranceActions(menuNode) : mapActions} popup={{...canvasMenu,onDismiss:() => setCanvasMenu(null)}} /> : null}
    {deleting ? <MapDeleteDialog key={`${deleting.kind}:${deleting.id}`} campaignId={campaignId} target={deleting} onClose={() => setDeleting(null)} onDeleted={deleted} /> : null}
    <nav className="atlas-breadcrumbs" aria-label={t("Kartenpfad")}>
      <Button variant="quiet" onClick={() => { if (guard()) { const root = ancestors[0]; if (root?.kind === "atlas") onNavigate(root); else onRoot(); } }}><Map size={16} /> {t("Hauptkarte")}</Button>
      {ancestors.map((ancestor, index) => <span key={`${ancestor.kind}:${ancestor.id}`}><span aria-hidden="true">/</span><button type="button" aria-current={index === ancestors.length - 1 ? "page" : undefined}
        disabled={ancestor.kind === "tactical" && ancestor.id === mapId} onClick={() => navigate(ancestor)}>{ancestor.title}</button></span>)}
    </nav>
    <header className="atlas-heading"><div><p className="eyebrow">{city ? t("Stadtplan") : t("Unterkarte")} · {t(KARTEN_SETTING_LABEL[children.data?.setting ?? "fantasy"])}</p><h1>{map.data?.name ?? t("Karte öffnen")}</h1>
      <p className="muted">{city ? t("{anzahl} Gebäude. Wähle ein Dach, entdecke den Ort und öffne seinen Innenraum.", { anzahl: entrances.length }) : t("Jeder Eingang führt zu einer eigenen Karte. Eure Änderungen bleiben beim Zurückkehren erhalten.")}</p></div>
      <MapContextMenu label={map.data?.name ?? t("Unterkarte")} className="nested-card-actions" actions={mapActions}><div className="button-row"><Button variant="quiet" aria-label={t("Unterkarte aktualisieren")} onClick={onChanged}><RefreshCw size={16} /></Button><Button variant="quiet" onClick={() => { const parent = ancestors.at(-2); if (guard()) { if (parent) onNavigate(parent); else onRoot(); } }}><ArrowLeft size={16} /> {t("Eine Ebene zurück")}</Button>
        <Button aria-pressed={editing} onClick={() => { if (guard()) { setDrafts({ map: false, plan: false, metadata: false }); setEditing(value => !value); } }}><Pencil size={16} /> {editing ? t("Karte ansehen") : t("Karte bearbeiten")}</Button></div></MapContextMenu>
    </header>
    {map.error || children.error ? <Notice error>{map.error || children.error}<Button onClick={onChanged}>{t("Erneut laden")}</Button></Notice> : null}
    {map.loading ? <Loading text={t("Unterkarte wird geöffnet …")} /> : null}
    {map.data && scene ? <>
      <MapFloorsPanel key={`floors:${mapId}`} campaignId={campaignId} current={map.data} revision={revision} disabled={dirty} onChanged={onChanged} onOpen={destination => navigate({ kind: "tactical", ...destination })} />
      <RoomFogControls key={`fog:${mapId}:${map.data.revision}`} campaignId={campaignId} mapId={mapId} mapRevision={map.data.revision} selectedRoomId={selectedId} onChanged={onChanged} disabled={dirty} />
    </> : null}
    {map.data && scene ? editing ? <><MapEditor key={mapId} current={map.data} campaignId={campaignId} onChanged={onChanged} onDirty={reportMap} onContextMenu={canvasContext} onOpenInterior={(nodeId, childId) => { if (childId) navigate({ kind: "tactical", id: childId, title: entrances.find(node => node.knotenId === nodeId)?.titel ?? "Innenraum", edit: true }); else if (guard()) { setSelectedId(nodeId); setEditing(false); } }} /><ScenePlan key={`plan:${mapId}`} campaignId={campaignId} map={map.data} revision={revision} onChanged={onChanged} onDirty={reportPlan} /></>
      : <div className="nested-map-workspace"><div className="nested-map-stage"><TacticalCanvas scene={scene} onContextMenu={canvasContext} tileBase={`${path}/tiles`} tileQuery={map.data.cartography && !map.data.document.background ? `revision=${map.data.revision}` : `revision=${map.data.revision}&layer=background`} onScopeInvalidated={() => { setInvalidated(map.data); setSelectedId(""); onChanged(); }}
        selection={selected ? { kind: "pin", id: selected.knotenId } : null} focusObject={initialFocus && selectedId === initialFocus.id ? initialFocus : selected ? { id: selected.knotenId, x: selected.x, y: selected.y } : null}
        onSelect={hit => {
          if (hit?.kind === "pin" && hit.id.startsWith("floor-link:")) {
            const link = floorLinks.find(link => `floor-link:${link.id}` === hit.id);
            if (link) { const to = link.fromMapId === mapId ? link.toMapId : link.fromMapId; const room = link.fromMapId === mapId ? link.toRegionId : link.fromRegionId;
              navigate({ kind: "tactical", id: to, title: floorData.data?.stack.floors.find(f => f.mapId === to)?.name ?? link.name, focus: { id: room, x: link.position[0], y: link.position[1] } }); }
            return;
          }
          if (hit?.kind !== "pin" && hit?.kind !== "cell") { choose(""); return; } const node = entrances.find(item => item.knotenId === hit.id);
          if (node?.vorhandeneKarteId) navigate({ kind: "tactical", id: node.vorhandeneKarteId, title: node.titel }); else choose(node?.knotenId ?? ""); }} />
        {city ? <div className={`building-legend${cartographic ? " building-types" : ""}`} aria-label={cartographic ? t("Gebäudetypen") : t("Gebäudelegende")}>{presentTypes.map(typ => {
          const Icon = BUILDING_ICONS[typ] ?? Building2;
          return <span key={typ}>{cartographic ? <Icon size={13} aria-hidden="true" /> : <i style={{ background: `#${BUILDING_COLORS[typ].toString(16).padStart(6, "0")}` }} />}{t(BAUWERK_LABEL[typ])}</span>;
        })}</div> : null}
        <p className="field-help"><DoorOpen size={14} /> {city ? t("Dächer auswählen, Gebäudedaten bearbeiten und Innenräume erzeugen. Ein Portal öffnet eine vorhandene Unterkarte direkt.") : t("Wähle einen Raum, um ihn zu benennen oder eine weitere Unterkarte anzulegen.")}</p></div>
        <aside className="panel nested-map-rooms" aria-label={city ? t("Gebäude und Unterkarten") : t("Räume und Unterkarten")}>
          <div className="nested-index-heading"><h2>{city ? <Building2 size={18} /> : <Map size={18} />}{city ? t("Gebäude") : t("Räume & Unterkarten")}</h2><span>{t("{anzahl} erschlossen", { anzahl: entrances.filter(node => node.vorhandeneKarteId).length })}</span></div>
          <label className="nested-search"><Search size={15} /><input aria-label={city ? t("Gebäude suchen") : t("Räume suchen")} placeholder={city ? t("Name, Typ oder Beschreibung …") : t("Raum suchen …")} value={query} onChange={event => setQuery(event.target.value)} /></label>
          <select aria-label={t("Orte filtern")} value={filter} onChange={event => setFilter(event.target.value)}><option value="all">{city ? t("Alle Gebäude") : t("Alle Räume")}</option><option value="linked">{t("Mit Unterkarte")}</option>{city ? BAUWERK_TYPEN.map(typ => <option key={typ} value={typ}>{t(BAUWERK_LABEL[typ])}</option>) : null}</select>
          {children.loading ? <Loading /> : !entrances.length ? <EmptyState title={city ? t("Noch keine Gebäude") : t("Noch keine Räume")}>{t("Lege im Karteneditor eine Region an, um darin eine Unterkarte zu verknüpfen.")}</EmptyState> : null}
          <ul className="nested-building-list">{visible.map(node => { const Icon = node.bauwerk ? BUILDING_ICONS[node.bauwerk.typ] ?? Building2 : Map; return <li key={node.knotenId}><MapContextMenu label={node.titel} actions={entranceActions(node)}>
            <button type="button" aria-pressed={selectedId === node.knotenId} onClick={() => choose(node.knotenId)}><Icon size={18} /><span>{node.titel}<small>{node.bauwerk ? t(BAUWERK_LABEL[node.bauwerk.typ]) : t("Raum")} · {node.vorhandeneKarteId ? t("Innenraum vorhanden") : t("Noch nicht betreten")}</small></span></button>
            {node.vorhandeneKarteId ? <button className="nested-open-shortcut" type="button" aria-label={t("{name} betreten", { name: node.titel })} title={t("Unterkarte öffnen")} onClick={() => navigate({ kind: "tactical", id: node.vorhandeneKarteId!, title: node.titel })}><DoorOpen size={17} /></button> : null}
          </MapContextMenu></li>; })}</ul>
          {entrances.length && !visible.length ? <p className="field-help">{t("Keine passenden Orte. Ändere die Suche oder den Filter.")}</p> : null}
          {selected && children.data ? <div className="nested-building-inspector"><BuildingMetadata key={selected.knotenId} campaignId={campaignId} mapId={mapId} node={selected} version={children.data.version} onChanged={onChanged} onDirty={reportMetadata} />
            <MapEntrance key={`${selected.knotenId}:${selected.bauwerk?.typ ?? "frei"}`} campaignId={campaignId} parentKind="tactical" parentMapId={mapId} nodeId={selected.knotenId} title={selected.titel}
              version={children.data.version} canEnter={selected.canEnter && !drafts.metadata} childMapId={selected.vorhandeneKarteId} profil={selected.bauwerk?.typ} stil={children.data.stil} setting={children.data.setting}
              {...(selected.erzeugungsArt ? { defaultArt: selected.erzeugungsArt } : {})} {...(selected.siedlung ? { siedlung: selected.siedlung } : {})}
              onOpen={id => navigate({ kind: "tactical", id, title: selected.titel })} onChanged={onChanged} />
            {drafts.metadata ? <p className="field-help">{t("Speichere die Gebäudedaten, bevor du einen neuen Innenraum erzeugst.")}</p> : null}
          </div> : entrances.length ? <div className="nested-select-hint"><Building2 size={28} /><p>{city ? t("Wähle ein Gebäude auf der Karte oder in der Liste.") : t("Wähle einen Raum auf der Karte oder in der Liste.")}</p></div> : null}
        </aside></div> : null}
  </section>;
}

function BuildingMetadata({ campaignId, mapId, node, version, onChanged, onDirty }: { campaignId: string; mapId: string; node: Entrance; version: number; onChanged: () => void; onDirty: (value: boolean) => void }) {
  const [baseline, setBaseline] = useState(node), [titel, setTitel] = useState(node.titel), [typ, setTyp] = useState<BauwerkTyp>(node.bauwerk?.typ ?? "haus"), [beschreibung, setBeschreibung] = useState(node.bauwerk?.beschreibung ?? "");
  const task = useTask(), command = useCommand(), building = node.art === "bauwerk";
  const [baselineVersion, setBaselineVersion] = useState(version);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const dirty = titel !== baseline.titel || building && (typ !== (baseline.bauwerk?.typ ?? "haus") || beschreibung !== (baseline.bauwerk?.beschreibung ?? ""));
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]); useEffect(() => () => onDirty(false), [onDirty]);
  // A refresh may advance the server version while this form has a draft. Keep the draft's
  // original version for CAS; never adopt a newer version behind an older editable value.
  useEffect(() => { if (!dirty && version >= baselineVersion) { setBaseline(node); setBaselineVersion(version); setTitel(node.titel); setTyp(node.bauwerk?.typ ?? "haus"); setBeschreibung(node.bauwerk?.beschreibung ?? ""); } }, [node, version]);
  return <form className="building-metadata" onSubmit={event => { event.preventDefault(); if (!dirty || !titel.trim() || task.busy) return; void task.run(async () => {
    const result = await command<{ version: number }>(apiPath(campaignId, `/maps/tactical/${encodeURIComponent(mapId)}/knoten/${encodeURIComponent(node.knotenId)}/metadata`), { expectedVersion: baselineVersion, titel: titel.trim(), ...(building ? { bauwerk: { typ, beschreibung } } : {}) }, "PUT");
    if (!mounted.current) return;
    setBaseline({ ...node, titel: titel.trim(), ...(building ? { bauwerk: { typ, beschreibung } } : {}) }); setBaselineVersion(result.version); setTitel(titel.trim()); onChanged();
  }); }}><h3><Pencil size={16} /> {building ? t("Gebäudedaten") : t("Raumdaten")}</h3><fieldset disabled={task.busy}>
    <label>{building ? t("Gebäudename") : t("Raumname")}<input value={titel} required maxLength={160} onChange={event => setTitel(event.target.value)} /></label>
    {building ? <><label>{t("Gebäudetyp")}<select value={typ} onChange={event => setTyp(event.target.value as BauwerkTyp)}>{BAUWERK_TYPEN.map(value => <option key={value} value={value}>{t(BAUWERK_LABEL[value])}</option>)}</select></label>
      <label>{t("Beschreibung")}<textarea rows={3} value={beschreibung} maxLength={2000} placeholder={t("Was macht diesen Ort besonders?")} onChange={event => setBeschreibung(event.target.value)} /></label>
      {node.vorhandeneKarteId ? <p className="field-help">{t("Der bestehende Innenraum bleibt erhalten, auch wenn du den Typ änderst.")}</p> : <p className="field-help">{t("Der Gebäudetyp bestimmt die Aufteilung und Einrichtung des ersten Innenraums.")}</p>}</> : null}
    <Button type="submit" disabled={!dirty || !titel.trim()} variant="primary">{task.busy ? t("Wird gespeichert …") : t("Metadaten speichern")}</Button>
  </fieldset>{version > baselineVersion ? <Notice>{t("Dieser Ort wurde inzwischen geändert.")} <Button variant="quiet" onClick={() => { if (!dirty || window.confirm(t("Ungespeicherte Gebäudedaten verwerfen?"))) { setBaseline(node); setBaselineVersion(version); setTitel(node.titel); setTyp(node.bauwerk?.typ ?? "haus"); setBeschreibung(node.bauwerk?.beschreibung ?? ""); } }}>{t("Aktuellen Stand übernehmen")}</Button></Notice> : null}
    {task.error ? <Notice error>{task.error}<Button variant="quiet" onClick={onChanged}>{t("Aktuellen Stand laden")}</Button></Notice> : null}</form>;
}

export function MapEntrance({ campaignId, parentKind, parentMapId, nodeId, title, version, canEnter, childMapId, onOpen, onChanged, profil, defaultArt, stil = "gemalt", setting = "fantasy", siedlung }: {
  campaignId: string; parentKind: "atlas" | "tactical"; parentMapId: string; nodeId: string; title: string; version: number;
  canEnter: boolean; childMapId?: string | null; onOpen: (id: string) => void; onChanged: () => void;
  profil?: BauwerkTyp; defaultArt?: MapArt; stil?: MapStyle; setting?: KartenSetting;
  /** A settlement entered from its region: the town's size and surroundings come from the map. */
  siedlung?: { art: SiedlungArt; standort: SiedlungStandort };
}) {
  const task = useTask(), command = useCommand(), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [linking, setLinking] = useState(false), [targetId, setTargetId] = useState("");
  const [settings, setSettings] = useState(() => { const base = generationSettings(defaultArt ?? (parentKind === "atlas" ? "siedlung" : "grundriss"), profil ?? "frei", stil, setting); return siedlung ? { ...base, siedlung: siedlung.art, standort: siedlung.standort } : base; });
  const maps = useResource<TacticalMapSummary[]>(linking ? apiPath(campaignId, "/tactical/maps") : null);
  const defaults = useResource<GenerationDefaults>(!childMapId ? apiPath(campaignId, "/tactical/generate/defaults") : null);
  const problem = defaults.data ? generationError(settings, defaults.data) : null;
  const enter = (targetMapId?: string) => void task.run(async () => {
    try {
      const result = await command<{ mapId: string }>(apiPath(campaignId, "/betreten"), {
        parentKind, parentMapId, knotenId: nodeId, expectedVersion: version, name: title.slice(0, 160),
        ...(targetMapId ? { targetMapId } : { art: settings.art, stil: settings.stil, ...(defaults.data ? { optionen: generationOptions(settings, defaults.data) } : {}) }),
      });
      if (mounted.current) { onChanged(); onOpen(result.mapId); }
    } catch (error) { if (mounted.current) onChanged(); throw error; }
  });
  return <section className="atlas-inspector-section atlas-entrance"><h3><DoorOpen size={17} /> {profil ? t("{name} betreten", { name: t(BAUWERK_LABEL[profil]) }) : t("Unterkarte")}</h3>
    {childMapId ? <Button variant="primary" onClick={() => onOpen(childMapId)}><DoorOpen size={16} /> {t("Unterkarte öffnen")}</Button> : <>
      <p>{profil ? t("Ein passender Innenraum für {name}. Du kannst Größe und Stil vor dem ersten Betreten anpassen.", { name: title }) : t("Erzeuge eine Karte für diesen Ort oder verbinde eine vorhandene Szenenkarte.")}</p>
      {defaults.loading ? <Loading /> : defaults.data ? <details className="entrance-customize" open={profil ? undefined : true}><summary>{t("Größe, Stil & Kartenart anpassen")}</summary><fieldset className="entrance-generation-fields" disabled={task.busy}><MapGenerationControls compact profileLocked={!!profil} value={settings} defaults={defaults.data} onChange={setSettings} /></fieldset></details> : null}
      {defaults.error || problem ? <Notice error>{defaults.error || problem}</Notice> : null}
      <Button variant="primary" disabled={task.busy || !canEnter || !defaults.data || !!problem} onClick={() => enter()}><WandSparkles size={16} /> {task.busy ? t("Karte wird verbunden …") : t("Unterkarte erzeugen")}</Button>
      <p className="field-help">{t("Einmal erzeugt, dauerhaft verbunden. Beim nächsten Besuch kommst du in denselben bearbeiteten Innenraum zurück.")}</p>
      <Button variant="quiet" disabled={task.busy} onClick={() => setLinking(value => !value)}><Link size={16} /> {t("Vorhandene Karte verbinden")}</Button>
      {linking ? <form onSubmit={event => { event.preventDefault(); if (targetId) enter(targetId); }}><label>{t("Szenenkarte")}<select value={targetId} onChange={event => setTargetId(event.target.value)} required disabled={task.busy}>
        <option value="">{t("Karte wählen …")}</option>{maps.data?.filter(map => parentKind !== "tactical" || map.id !== parentMapId).map(map => <option key={map.id} value={map.id}>{map.name}</option>)}
      </select></label>{maps.loading ? <Loading /> : null}{maps.error ? <Notice error>{maps.error}</Notice> : null}<Button type="submit" disabled={!targetId || task.busy}>{t("Als Unterkarte verbinden")}</Button></form> : null}
    </>}{task.error ? <Notice error>{task.error}</Notice> : null}
  </section>;
}
