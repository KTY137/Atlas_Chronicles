// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Armchair, BedDouble, Beer, Blend, BrickWall, Check, Copy, DoorOpen, Equal, Eye, Grid2X2, Hand, House, Lock, MountainSnow, MousePointer2, Paintbrush, RotateCw, Route, Square, Trash2, TrendingDown, TrendingUp, Type, Unlock, Waves, type LucideIcon } from "lucide-react";
import { BAUWERK_LABEL, BAUWERK_TYPEN, type BauwerkTyp, type CartographyLabelStyle, type CartographyLabelV1, type CartographyRegionV1, type CartographyTerrainMaterial, type CartographyWaterMaterial } from "@chronicle/szene";
import { LABEL_SIZES, LABEL_STYLES, labelSizeName, labelStyleName, type LabelSizeId } from "./map-labels";
import { Button } from "@chronicle/ui";
import { t } from "../i18n";

export type ReliefMode = "raise" | "lower" | "smooth" | "level";
export interface MapToolSettings {
  tool: "select" | "terrain" | "road" | "building" | "room" | "wall" | "door" | "relief" | "label";
  hand: boolean;
  terrain: CartographyTerrainMaterial | "water";
  water: CartographyWaterMaterial;
  /** The height tool: what a stroke does to the land, and how hard. */
  reliefMode: ReliefMode; reliefStrength: number;
  radius: number;
  road: "path" | "street" | "square";
  roadWidth: number;
  buildingWidth: number; buildingHeight: number;
  buildingType: BauwerkTyp; buildingName: string; shape: "rectangle" | "l"; turns: 0 | 1 | 2 | 3;
  roomShape: "rectangle" | "l";
  roomFloor: "wood" | "stone" | "tile";
  roomTemplate: "empty" | "bedroom" | "tavern";
  roomWidth: number; roomHeight: number;
  doorWidth: number; doorClosed: boolean;
  /** The name tool: what the next stroke writes, how, and how large (in size steps). */
  labelText: string; labelStyle: CartographyLabelStyle; labelSize: LabelSizeId;
  snap: boolean; direct: boolean;
}

export const mapToolSettings = (cellSize: number): MapToolSettings => ({
  tool: "select", hand: false, terrain: "grass", water: "river", reliefMode: "raise", reliefStrength: .6, radius: cellSize, road: "street", roadWidth: cellSize * .4,
  buildingWidth: cellSize * .65, buildingHeight: cellSize * .5, buildingType: "haus", buildingName: "Neues Haus", shape: "rectangle", turns: 0,
  roomShape: "rectangle", roomFloor: "wood", roomTemplate: "empty", roomWidth: cellSize * 6, roomHeight: cellSize * 5,
  doorWidth: cellSize, doorClosed: true, labelText: "", labelStyle: "ort", labelSize: "normal", snap: true, direct: true,
});

type Dimension = "radius" | "roadWidth" | "buildingWidth" | "buildingHeight" | "roomWidth" | "roomHeight" | "doorWidth";
export type MapSelectionKind = "stamp" | "wall" | "portal" | "room" | "building" | "terrain" | "road";
interface MapEditToolsProps {
  value: MapToolSettings; onChange: (next: MapToolSettings) => void; selected?: CartographyRegionV1; linked: boolean;
  onLock: () => void; onRotate: () => void; onRemove: () => void; onVary: () => void; busy: boolean; childrenConfirmed: boolean;
  cellSize?: number; onAssets?: () => void; assetsActive?: boolean;
  selectedTitle?: string; selectedKind?: MapSelectionKind; selectedLocked?: boolean; onDuplicate?: () => void;
  /** The names already on the map, editable in place. */
  labels?: readonly CartographyLabelV1[]; onLabelChange?: (id: string, patch: Partial<Pick<CartographyLabelV1, "text" | "style">>) => void; onLabelRemove?: (id: string) => void;
}

const SELECTION_LABEL: Record<MapSelectionKind, string> = { stamp: "Einrichtung", wall: "Wand", portal: "Tür", room: "Raum", building: "Gebäude", terrain: "Gelände", road: "Straße" };
const SHORTCUT: Record<MapToolSettings["tool"], string> = { select: "V", terrain: "T", road: "P", building: "B", room: "F", wall: "W", door: "D", relief: "E", label: "N" };

export function MapEditTools({ value, onChange, selected, linked, onLock, onRotate, onRemove, onVary, busy, childrenConfirmed,
  cellSize = 100, onAssets, assetsActive = false, selectedTitle, selectedKind, selectedLocked, onDuplicate, labels, onLabelChange, onLabelRemove }: MapEditToolsProps) {
  const cell = Number.isFinite(cellSize) && cellSize > 0 ? cellSize : 100;
  // Die Beschriftungen entstehen bei jedem Rendern neu, damit ein Sprachwechsel sie erreicht.
  const TERRAIN = [
    ["grass", t("Wiese")], ["forest", t("Wald")], ["field", t("Feld")], ["earth", t("Erde")], ["rock", t("Fels")], ["sand", t("Sand")], ["swamp", t("Sumpf")], ["snow", t("Schnee")], ["water", t("Wasser")],
  ] as const;
  const RELIEF = [
    { id: "raise", label: t("Anheben"), text: t("Hügel und Berge auftürmen"), icon: TrendingUp },
    { id: "lower", label: t("Absenken"), text: t("Täler und Senken graben"), icon: TrendingDown },
    { id: "smooth", label: t("Glätten"), text: t("Kanten und Stufen weich machen"), icon: Blend },
    { id: "level", label: t("Einebnen"), text: t("Auf die Höhe des ersten Punkts bringen"), icon: Equal },
  ] as const;
  const WATER = [
    { id: "river", label: t("Fluss"), text: t("Fließt, kann Brücken tragen") },
    { id: "lake", label: t("See"), text: t("Steht still, mit Uferkranz") },
    { id: "sea", label: t("Meer"), text: t("Offenes Wasser bis zum Rand") },
  ] as const;
  const ROOM_SIZES = [{ label: t("Kammer"), width: 4, height: 4 }, { label: t("Zimmer"), width: 6, height: 5 }, { label: t("Saal"), width: 10, height: 8 }] as const;
  const ROOM_TEMPLATES = [
    { id: "empty", label: t("Leerer Raum"), description: t("Platz für deine Ideen"), icon: Square, width: 6, height: 5 },
    { id: "bedroom", label: t("Schlafzimmer"), description: t("Bett & Einrichtung"), icon: BedDouble, width: 6, height: 5 },
    { id: "tavern", label: t("Taverne"), description: t("Tische & Sitzplätze"), icon: Beer, width: 10, height: 8 },
  ] as const;
  const change = (patch: Partial<MapToolSettings>) => onChange({ ...value, ...patch });
  const locked = selected?.locked ?? selectedLocked ?? false;
  const hasSelection = !!selected || !!selectedKind;
  const selectionLabel = selectedKind ? t(SELECTION_LABEL[selectedKind]) : selected?.role === "building" ? t("Gebäude") : selected?.role === "road" ? t("Straße") : t("Fläche");
  const number = (label: string, key: Dimension, inCells = false) => <label className="map-tool-field">{label}<span className="map-tool-number"><input type="number" min={inCells ? .01 : 1} max={inCells ? 32768 / cell : 32768} step="any"
    value={inCells ? Math.round(value[key] / cell * 1000) / 1000 : value[key]} onChange={event => {
      const next = event.target.valueAsNumber * (inCells ? cell : 1);
      if (Number.isFinite(next) && next > 0 && next <= 32768) change({ [key]: next });
    }} /><span aria-hidden="true">{inCells ? t("Zellen") : "px"}</span></span></label>;
  const toolButton = (tool: MapToolSettings["tool"], label: string, Icon: LucideIcon) => <Button key={tool} className="map-tool-button" aria-label={label} title={`${label} · ${SHORTCUT[tool]}`}
    aria-pressed={value.tool === tool && !value.hand && !assetsActive} onClick={() => change({ tool, hand: false })}><Icon size={20} aria-hidden="true" /><span>{label}</span><kbd aria-hidden="true">{SHORTCUT[tool]}</kbd></Button>;
  const rotatePreview = <Button className="map-tool-rotate" onClick={() => change({ turns: ((value.turns + 1) % 4) as MapToolSettings["turns"] })}><RotateCw size={15} aria-hidden="true" />{t("Vorschau drehen · {grad}°", { grad: value.turns * 90 })}</Button>;

  return <aside className="map-edit-tools" aria-label={t("Kartenwerkzeuge")}><fieldset disabled={busy}>
    <div className="map-tools-heading"><span>{t("Werkzeuge")}</span><MousePointer2 size={15} aria-hidden="true" /></div>
    <div className="map-edit-tool-grid map-edit-tool-navigation" role="group" aria-label={t("Auswahl und Ansicht")}>
      {toolButton("select", t("Auswählen"), MousePointer2)}
      <Button className="map-tool-button" aria-label={t("Hand · Karte verschieben")} title={t("Karte verschieben · H")} aria-pressed={value.hand} onClick={() => change({ hand: !value.hand })}><Hand size={20} aria-hidden="true" /><span>{t("Hand")}</span><kbd aria-hidden="true">H</kbd></Button>
    </div>
    <div className="map-tool-group"><h3>{t("Landschaft")}</h3><div className="map-edit-tool-grid map-edit-tool-grid-4" role="group" aria-label={t("Landschaft zeichnen")}>
      {toolButton("terrain", t("Gelände"), Paintbrush)}{toolButton("relief", t("Höhe"), MountainSnow)}{toolButton("road", t("Straßen"), Route)}{toolButton("building", t("Gebäude"), House)}
    </div></div>
    <div className="map-tool-group"><h3>{t("Innenräume")}</h3><div className="map-edit-tool-grid" role="group" aria-label={t("Innenräume bauen")}>
      {toolButton("room", t("Raum"), Square)}{toolButton("wall", t("Wand"), BrickWall)}{toolButton("door", t("Tür"), DoorOpen)}
    </div></div>
    <div className="map-tool-group"><h3>{t("Namen")}</h3><div className="map-edit-tool-grid map-edit-tool-single" role="group" aria-label={t("Namen setzen")}>
      {toolButton("label", t("Beschriften"), Type)}
    </div></div>
    {onAssets ? <Button className="map-tool-assets" aria-label={t("Einrichtung platzieren")} title={t("Einrichtung platzieren · O")} aria-pressed={assetsActive} onClick={onAssets}><Armchair size={20} aria-hidden="true" /><span>{t("Einrichtung platzieren")}<small>{t("Objekte aus dem Katalog")}</small></span></Button> : null}

    <div className="map-tool-settings">
      {value.hand ? <div className="map-tool-empty"><Hand size={28} aria-hidden="true" /><h3>{t("Karte verschieben")}</h3><p>{t("Ziehe die Karte in die gewünschte Richtung. Mit dem Mausrad zoomst du in die Details.")}</p></div> : assetsActive ? <div className="map-tool-empty"><Armchair size={28} aria-hidden="true" /><h3>{t("Einrichten")}</h3><p>{t("Wähle ein Objekt im Katalog und klicke auf die Karte, um es zu platzieren.")}</p></div> : <>
        {value.tool === "terrain" ? <><div className="map-tool-section-title"><Paintbrush size={17} aria-hidden="true" /><h3>{t("Gelände zeichnen")}</h3></div>
          <div className="map-material-grid" role="group" aria-label={t("Geländematerial")}>{TERRAIN.map(([id, name]) => <Button key={id} className="map-material-card" aria-label={name} aria-pressed={value.terrain === id} onClick={() => change({ terrain: id })}><span className={`map-material-swatch map-material-${id}`} aria-hidden="true">{value.terrain === id ? <Check size={16} /> : null}</span><span>{name}</span></Button>)}</div>
          <label className="map-tool-field">{t("Material")}<select aria-label={t("Material")} value={value.terrain} onChange={event => change({ terrain: event.target.value as MapToolSettings["terrain"] })}>{TERRAIN.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
          {value.terrain === "water" ? <div className="map-tool-subgroup"><span className="map-tool-label">{t("Was für ein Gewässer?")}</span>
            <div className="map-water-kinds" role="group" aria-label={t("Wasserart")}>{WATER.map(({ id, label, text }) => <Button key={id} className="map-water-kind" aria-label={`${label} · ${text}`} aria-pressed={value.water === id} onClick={() => change({ water: id })}><strong>{label}</strong><small>{text}</small></Button>)}</div>
            <p className="field-help">{t("See und Meer bekommen einen hellen Uferkranz und Wellen; ein Fluss bleibt schmal und kann überbrückt werden.")}</p></div> : null}
          {number(t("Pinselradius"), "radius", true)}<p className="field-help">{t("Klicken und ziehen, um die Landschaft zu malen.")}</p>
          <details className="map-tool-advanced"><summary>{t("Präzise Maße")}</summary>{number(t("Pinselradius in Pixeln"), "radius")}</details>
        </> : null}

        {value.tool === "relief" ? <><div className="map-tool-section-title"><MountainSnow size={17} aria-hidden="true" /><h3>{t("Höhe formen")}</h3></div>
          <p className="field-help">{t("Streiche über die Landschaft. Hügel, Täler und Hänge zeigen sich als Schattierung und Höhenlinien.")}</p>
          <div className="map-relief-modes" role="group" aria-label={t("Was der Pinsel mit dem Land macht")}>{RELIEF.map(({ id, label, text, icon: Icon }) => <Button key={id} className="map-relief-mode" aria-label={`${label} · ${text}`} aria-pressed={value.reliefMode === id} onClick={() => change({ reliefMode: id })}><Icon size={18} aria-hidden="true" /><span><strong>{label}</strong><small>{text}</small></span></Button>)}</div>
          {number(t("Pinselradius"), "radius", true)}
          <label className="map-tool-field">{t("Stärke")}<span className="map-tool-number"><input type="range" min={.1} max={1} step={.1} aria-label={t("Stärke")} value={value.reliefStrength} onChange={event => change({ reliefStrength: event.target.valueAsNumber })} /><output>{Math.round(value.reliefStrength * 100)} %</output></span></label>
          <p className="map-tool-tip"><Waves size={16} aria-hidden="true" />{t("Wasser, das du mit dem Gelände-Pinsel malst, senkt das Land; Fels hebt es.")}</p>
          <details className="map-tool-advanced"><summary>{t("Präzise Maße")}</summary>{number(t("Pinselradius in Pixeln"), "radius")}</details>
        </> : null}

        {value.tool === "road" ? <><div className="map-tool-section-title"><Route size={17} aria-hidden="true" /><h3>{t("Straße zeichnen")}</h3></div>
          <label className="map-tool-field">{t("Belag")}<select aria-label={t("Belag")} value={value.road} onChange={event => change({ road: event.target.value as MapToolSettings["road"] })}><option value="path">{t("Weg")}</option><option value="street">{t("Straße")}</option><option value="square">{t("Platz")}</option></select></label>
          {number(t("Straßenbreite"), "roadWidth", true)}<p className="field-help">{t("Ziehe vom bestehenden Weg zum Ziel. Wasserquerungen werden als Brücke geprüft.")}</p>
          <details className="map-tool-advanced"><summary>{t("Präzise Maße")}</summary>{number(t("Straßenbreite in Pixeln"), "roadWidth")}</details>
        </> : null}

        {value.tool === "building" ? <><div className="map-tool-section-title"><House size={17} aria-hidden="true" /><h3>{t("Gebäude setzen")}</h3></div>
          <div className="map-building-preview" aria-hidden="true"><span className={`map-floorplan map-floorplan-${value.shape}`} style={{ transform: `rotate(${value.turns * 90}deg)` }} /><House size={18} /></div>
          <label className="map-tool-field">{t("Gebäudename")}<input value={value.buildingName} maxLength={160} onChange={event => change({ buildingName: event.target.value })} /></label>
          <label className="map-tool-field">{t("Gebäudetyp")}<select aria-label={t("Gebäudetyp")} value={value.buildingType} onChange={event => change({ buildingType: event.target.value as BauwerkTyp })}>{BAUWERK_TYPEN.map(type => <option key={type} value={type}>{t(BAUWERK_LABEL[type])}</option>)}</select></label>
          <div className="map-tool-dimensions">{number(t("Hausbreite"), "buildingWidth", true)}{number(t("Haustiefe"), "buildingHeight", true)}</div>
          <label className="map-tool-field">{t("Grundform")}<select aria-label={t("Grundform")} value={value.shape} onChange={event => change({ shape: event.target.value as "rectangle" | "l" })}><option value="rectangle">{t("Rechteck")}</option><option value="l">{t("L-förmig")}</option></select></label>{rotatePreview}
          <p className="field-help">{t("Auf freie Fläche neben einer Straße klicken. Nach dem Speichern kannst du den Innenraum im Atlas betreten.")}</p>
          <details className="map-tool-advanced"><summary>{t("Präzise Maße")}</summary>{number(t("Hausbreite in Pixeln"), "buildingWidth")}{number(t("Haustiefe in Pixeln"), "buildingHeight")}</details>
        </> : null}

        {value.tool === "room" ? <><div className="map-tool-section-title"><Square size={17} aria-hidden="true" /><h3>{t("Raum bauen")}</h3></div>
          <p className="field-help">{t("Aufziehen für eigene Maße. Ein Klick setzt die gewählte Raumgröße.")}</p>
          <div className="map-room-templates" role="group" aria-label={t("Raumvorlage")}>{ROOM_TEMPLATES.map(({ id, label, description, icon: Icon, width, height }) => <Button key={id} className="map-room-template" aria-label={label} aria-pressed={value.roomTemplate === id} onClick={() => change({ roomTemplate: id, roomWidth: width * cell, roomHeight: height * cell })}><Icon size={23} aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span>{value.roomTemplate === id ? <Check size={15} aria-hidden="true" /> : null}</Button>)}</div>
          <div className="map-tool-subgroup"><span className="map-tool-label">{t("Grundform")}</span><div className="map-room-shapes" role="group" aria-label={t("Raumform")}>{(["rectangle", "l"] as const).map(shape => <Button key={shape} className="map-room-shape" aria-label={shape === "rectangle" ? t("Rechteckiger Raum") : t("L-förmiger Raum")} aria-pressed={value.roomShape === shape} onClick={() => change({ roomShape: shape })}><span className={`map-floorplan map-floorplan-${shape}`} aria-hidden="true" /><span>{shape === "rectangle" ? t("Rechteck") : t("L-Form")}</span></Button>)}</div></div>
          <div className="map-tool-subgroup"><span className="map-tool-label">{t("Raumgröße beim Klicken")}</span><div className="map-room-sizes" role="group" aria-label={t("Raumgröße")}>{ROOM_SIZES.map(({ label, width, height }) => <Button key={label} className="map-room-size" aria-label={t("{label} · {breite} × {hoehe} Zellen", { label, breite: width, hoehe: height })} aria-pressed={Math.abs(value.roomWidth - width * cell) < .01 && Math.abs(value.roomHeight - height * cell) < .01} onClick={() => change({ roomWidth: width * cell, roomHeight: height * cell })}><strong>{label}</strong><small>{width} × {height}</small></Button>)}</div></div>
          <div className="map-tool-dimensions">{number(t("Raumbreite"), "roomWidth", true)}{number(t("Raumtiefe"), "roomHeight", true)}</div>
          <div className="map-tool-subgroup"><span className="map-tool-label">{t("Boden")}</span><div className="map-room-floors" role="group" aria-label={t("Raumboden")}>{([["wood", t("Holz"), t("Holzboden")], ["stone", t("Stein"), t("Steinboden")], ["tile", t("Fliesen"), t("Fliesenboden")]] as const).map(([floor, label, floorLabel]) => <Button key={floor} className="map-floor-card" aria-label={floorLabel} aria-pressed={value.roomFloor === floor} onClick={() => change({ roomFloor: floor })}><span className={`map-floor-swatch map-floor-${floor}`} aria-hidden="true" /><span>{label}</span></Button>)}</div></div>
          <details className="map-tool-advanced"><summary>{t("Präzise Maße")}</summary>{number(t("Raumbreite in Pixeln"), "roomWidth")}{number(t("Raumtiefe in Pixeln"), "roomHeight")}</details>
        </> : null}

        {value.tool === "wall" ? <><div className="map-tool-section-title"><BrickWall size={17} aria-hidden="true" /><h3>{t("Wand ziehen")}</h3></div><div className="map-wall-preview" aria-hidden="true"><span /><span /></div>
          <p className="field-help">{t("Ziehe vom Anfang zum Ende der Wand. So teilst du Räume auf oder ergänzt einen eigenen Grundriss.")}</p>
          <p className="map-tool-tip"><Grid2X2 size={16} aria-hidden="true" />{t("Mit Einrasten liegen die Endpunkte auf dem Konstruktionsraster.")}</p>
        </> : null}

        {value.tool === "door" ? <><div className="map-tool-section-title"><DoorOpen size={17} aria-hidden="true" /><h3>{t("Tür einsetzen")}</h3></div>
          <p className="field-help">{t("Klicke auf eine Wand. Die Tür richtet sich an ihr aus und öffnet einen Durchgang.")}</p>
          {number(t("Türbreite"), "doorWidth", true)}
          <label className="map-tool-check"><input type="checkbox" checked={value.doorClosed} onChange={event => change({ doorClosed: event.target.checked })} /><span>{t("Tür zunächst geschlossen")}</span></label>
          <details className="map-tool-advanced"><summary>{t("Präzise Maße")}</summary>{number(t("Türbreite in Pixeln"), "doorWidth")}</details>
        </> : null}

        {value.tool === "label" ? <><div className="map-tool-section-title"><Type size={17} aria-hidden="true" /><h3>{t("Namen setzen")}</h3></div>
          <label className="map-tool-field">{t("Text")}<input value={value.labelText} maxLength={80} placeholder={t("Silberbach, Finsterwald, Alter Weg …")} onChange={event => change({ labelText: event.target.value })} /></label>
          <label className="map-tool-field">{t("Art")}<select aria-label={t("Art")} value={value.labelStyle} onChange={event => change({ labelStyle: event.target.value as CartographyLabelStyle })}>{LABEL_STYLES.map(style => <option key={style} value={style}>{labelStyleName(style)}</option>)}</select></label>
          <label className="map-tool-field">{t("Schriftgröße")}<select aria-label={t("Schriftgröße")} value={value.labelSize} onChange={event => change({ labelSize: event.target.value as LabelSizeId })}>{LABEL_SIZES.map(size => <option key={size.id} value={size.id}>{labelSizeName(size.id)}</option>)}</select></label>
          <p className="field-help">{t("Klicke für einen geraden Namen oder ziehe eine Linie, der der Name folgt: an einem Fluss entlang, quer über einen Wald.")}</p>
          <p className="map-tool-tip"><Eye size={16} aria-hidden="true" />{t("Spieler sehen einen Namen, sobald die Mitte seiner Linie in einer aufgedeckten Region liegt.")}</p>
          {labels?.length ? <div className="map-tool-subgroup"><span className="map-tool-label">{t("Namen auf der Karte")}</span><ul className="map-label-list">{labels.map(label => <li key={label.id}>
            <input key={label.text} aria-label={t("Text")} defaultValue={label.text} maxLength={80} onBlur={event => { const text = event.target.value.trim(); if (text && text !== label.text) onLabelChange?.(label.id, { text }); }} />
            <select aria-label={t("Art")} value={label.style} onChange={event => onLabelChange?.(label.id, { style: event.target.value as CartographyLabelStyle })}>{LABEL_STYLES.map(style => <option key={style} value={style}>{labelStyleName(style)}</option>)}</select>
            <Button aria-label={t("Namen entfernen")} title={t("Namen entfernen")} onClick={() => onLabelRemove?.(label.id)}><Trash2 size={14} aria-hidden="true" /></Button>
          </li>)}</ul></div> : null}
        </> : null}

        {value.tool === "select" ? <><div className="map-tool-section-title"><MousePointer2 size={17} aria-hidden="true" /><h3>{t("Auswahl bearbeiten")}</h3></div>
          {hasSelection ? <><div className="map-tool-selection"><span className="map-tool-label">{selectionLabel}</span><strong>{selectedTitle ?? selectionLabel}</strong><div className="map-selection-tags">{locked ? <span><Lock size={12} aria-hidden="true" />{t("Gesperrt")}</span> : null}{selected?.authored ? <span>{t("Manuell bearbeitet")}</span> : null}{linked ? <span>{t("Innenraum verbunden")}</span> : null}</div></div>
            <p className="field-help">{t("Ziehe die Auswahl, um sie zu verschieben.")}</p>
            {selected || selectedLocked !== undefined ? <Button aria-pressed={locked} onClick={onLock}>{locked ? <Unlock size={15} aria-hidden="true" /> : <Lock size={15} aria-hidden="true" />}{locked ? t("Sperre aufheben") : t("Auswahl sperren")}</Button> : null}
            <Button disabled={locked} onClick={onRotate}><RotateCw size={15} aria-hidden="true" />{t("Auswahl drehen")}</Button>
            {onDuplicate ? <Button disabled={locked} onClick={onDuplicate}><Copy size={15} aria-hidden="true" />{t("Auswahl duplizieren")}</Button> : null}
            <Button variant="danger" disabled={locked || linked || !!selected && !childrenConfirmed} onClick={onRemove}><Trash2 size={15} aria-hidden="true" />{t("Auswahl entfernen")}</Button>
            {selected && selectedKind !== "room" ? <><Button disabled={locked || selected.authored || linked || !childrenConfirmed} onClick={onVary}>{t("Bebauung der Auswahl variieren")}</Button>{selected.authored || linked ? <p className="field-help">{t("Variation erhält manuelle Flächen und verbundene Innenräume. Verschieben und Drehen erhält die Identität des Hauses.")}</p> : null}</> : null}
          </> : <div className="map-tool-empty"><MousePointer2 size={28} aria-hidden="true" /><p>{t("Wähle ein Gebäude, einen Raum, eine Wand oder ein Objekt auf der Karte.")}</p><span>{t("Anklicken · auswählen")}<br />{t("Ziehen · verschieben")}</span></div>}
        </> : null}
      </>}
    </div>

    <div className="map-tool-preferences"><label className="map-tool-check"><input type="checkbox" checked={value.snap} onChange={event => change({ snap: event.target.checked })} /><span>{t("Am Raster einrasten")}</span><Grid2X2 size={15} aria-hidden="true" /></label>
      <label className="map-tool-check"><input type="checkbox" checked={value.direct} onChange={event => change({ direct: event.target.checked })} /><span>{t("Änderungen direkt übernehmen")}</span></label>
      <p className="field-help">{value.direct ? t("Jeder Schritt lässt sich rückgängig machen. Speichere deine Karte oben.") : t("Prüfe jeden Schritt als Vorschau und übernimm ihn unter der Karte.")}</p>
    </div>
  </fieldset></aside>;
}
