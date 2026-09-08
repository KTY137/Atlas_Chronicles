// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { BAUWERK_LABEL, BAUWERK_TYPEN, type BauwerkTyp, type CartographyRegionV1, type CartographyTerrainMaterial } from "@chronicle/szene";
import { Button } from "@chronicle/ui";

export interface MapToolSettings {
  tool: "select" | "terrain" | "road" | "building";
  hand: boolean;
  terrain: CartographyTerrainMaterial | "water";
  radius: number;
  road: "path" | "street" | "square";
  roadWidth: number;
  buildingWidth: number; buildingHeight: number;
  buildingType: BauwerkTyp; buildingName: string; shape: "rectangle" | "l"; turns: 0 | 1 | 2 | 3;
}
export const mapToolSettings = (cellSize: number): MapToolSettings => ({ tool: "select", hand: false, terrain: "grass", radius: cellSize, road: "street", roadWidth: cellSize * .4,
  buildingWidth: cellSize * .65, buildingHeight: cellSize * .5, buildingType: "haus", buildingName: "Neues Haus", shape: "rectangle", turns: 0 });

export function MapEditTools({ value, onChange, selected, linked, onLock, onRotate, onRemove, onVary, busy, childrenConfirmed }: {
  value: MapToolSettings; onChange: (next: MapToolSettings) => void; selected?: CartographyRegionV1; linked: boolean;
  onLock: () => void; onRotate: () => void; onRemove: () => void; onVary: () => void; busy: boolean; childrenConfirmed: boolean;
}) {
  const change = (patch: Partial<MapToolSettings>) => onChange({ ...value, ...patch });
  const number = (label: string, key: "radius" | "roadWidth" | "buildingWidth" | "buildingHeight") => <label>{label}<input type="number" min={1} max={32768} step="any" value={value[key]} onChange={event => { if (Number.isFinite(event.target.valueAsNumber) && event.target.valueAsNumber > 0) change({ [key]: event.target.valueAsNumber }); }} /></label>;
  return <aside className="map-edit-tools" aria-label="Kartenwerkzeuge"><fieldset disabled={busy}>
    <div className="map-edit-tool-grid" role="group" aria-label="Werkzeug auswählen">{([
      ["select", "Auswählen"], ["terrain", "Gelände"], ["road", "Straßen"], ["building", "Gebäude"],
    ] as const).map(([tool, name]) => <Button key={tool} aria-pressed={value.tool === tool && !value.hand} onClick={() => change({ tool, hand: false })}>{name}</Button>)}</div>
    <Button aria-pressed={value.hand} onClick={() => change({ hand: !value.hand })}>Hand · Karte verschieben</Button>
    {value.tool === "terrain" ? <><h3>Gelände zeichnen</h3><label>Material<select aria-label="Material" value={value.terrain} onChange={event => change({ terrain: event.target.value as MapToolSettings["terrain"] })}>{Object.entries({ grass: "Wiese", forest: "Wald", field: "Feld", earth: "Erde", rock: "Fels", sand: "Sand", water: "Wasser" }).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>{number("Pinselradius in Pixeln", "radius")}</> : null}
    {value.tool === "road" ? <><h3>Straße zeichnen</h3><label>Belag<select aria-label="Belag" value={value.road} onChange={event => change({ road: event.target.value as MapToolSettings["road"] })}><option value="path">Weg</option><option value="street">Straße</option><option value="square">Platz</option></select></label>{number("Straßenbreite in Pixeln", "roadWidth")}<p className="field-help">Ziehe vom bestehenden Weg zum Ziel. Wasserquerungen werden als Brücke geprüft.</p></> : null}
    {value.tool === "building" ? <><h3>Gebäude setzen</h3><label>Gebäudename<input value={value.buildingName} maxLength={160} onChange={event => change({ buildingName: event.target.value })} /></label><label>Gebäudetyp<select aria-label="Gebäudetyp" value={value.buildingType} onChange={event => change({ buildingType: event.target.value as BauwerkTyp })}>{BAUWERK_TYPEN.map(type => <option key={type} value={type}>{BAUWERK_LABEL[type]}</option>)}</select></label>{number("Hausbreite in Pixeln", "buildingWidth")}{number("Haustiefe in Pixeln", "buildingHeight")}<label>Grundform<select aria-label="Grundform" value={value.shape} onChange={event => change({ shape: event.target.value as "rectangle" | "l" })}><option value="rectangle">Rechteck</option><option value="l">L-förmig</option></select></label><Button onClick={() => change({ turns: ((value.turns + 1) % 4) as MapToolSettings["turns"] })}>Vorschau drehen · {value.turns * 90}°</Button><p className="field-help">Auf freie Fläche neben einer Straße klicken. Nach dem Speichern kannst du den Innenraum im Atlas betreten.</p></> : null}
    {value.tool === "select" ? <><h3>Auswahl bearbeiten</h3><p className="field-help">Fläche anklicken und ziehen. Mit Alt oder der Hand verschiebst du die Ansicht.</p>{selected ? <><p>{selected.role === "building" ? "Gebäude" : selected.role === "road" ? "Straße" : "Fläche"}{selected.authored ? " · Manuell bearbeitet" : ""}{linked ? " · Innenraum verbunden" : ""}</p><Button aria-pressed={selected.locked} onClick={onLock}>{selected.locked ? "Sperre aufheben" : "Auswahl sperren"}</Button><div className="button-row"><Button disabled={selected.locked} onClick={onRotate}>Auswahl drehen</Button><Button disabled={selected.locked || linked || !childrenConfirmed} onClick={onRemove}>Auswahl entfernen</Button></div><Button disabled={selected.locked || selected.authored || linked || !childrenConfirmed} onClick={onVary}>Bebauung der Auswahl variieren</Button>{selected.authored || linked ? <p className="field-help">Variation erhält manuelle Flächen und verbundene Innenräume. Bewusstes Verschieben und Drehen erhält die Identität des Hauses.</p> : null}</> : <p>Wähle ein Haus oder eine Fläche auf der Karte.</p>}</> : null}
  </fieldset></aside>;
}
