// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Building2, Castle, Mountain, Paintbrush, Ruler } from "lucide-react";
import { BAUWERK_LABEL, BAUWERK_TYPEN, BAUWERK_SETTINGS, KARTEN_SETTINGS, KARTEN_SETTING_LABEL } from "@chronicle/szene";
import { changeGenerationSetting, generationDimensions, type GenerationDefaults, type GenerationSettings, type MapArt } from "./map-generation";

export const MAP_KINDS = [
  { id: "siedlung", label: "Stadt & Dorf", text: "Straßen, Viertel und begehbare Gebäude", icon: Building2 },
  { id: "grundriss", label: "Gebäude & Dungeon", text: "Vom Wohnhaus über das Labor bis zur Raumstation", icon: Castle },
  { id: "hoehle", label: "Höhle", text: "Natürliche Kammern und gewachsener Fels", icon: Mountain },
] as const;

export function MapGenerationControls({ value, defaults, onChange, compact = false, profileLocked = false }: {
  value: GenerationSettings; defaults: GenerationDefaults; onChange: (next: GenerationSettings) => void; compact?: boolean; profileLocked?: boolean;
}) {
  const update = (patch: Partial<GenerationSettings>) => onChange({ ...value, ...patch });
  const [w, h] = generationDimensions(value, defaults), city = value.art === "siedlung", cave = value.art === "hoehle";
  const std = city ? defaults.siedlung : cave ? defaults.hoehle : defaults.grundriss;
  const suggested = BAUWERK_SETTINGS[value.setting];
  const presets = city ? [
    { label: "Weiler", breite: 24, hoehe: 20, anzahl: 12, siedlung: "weiler" as const, dichte: .15 },
    { label: "Dorf", breite: 36, hoehe: 28, anzahl: 42, siedlung: "dorf" as const, dichte: .3 },
    { label: "Stadt", breite: 56, hoehe: 44, anzahl: 130, siedlung: "stadt" as const, dichte: .55 },
    { label: "Großstadt", breite: 88, hoehe: 64, anzahl: 256, siedlung: "stadt" as const, dichte: .7 },
  ] : [ { label: "Klein", breite: 24, hoehe: 20, anzahl: 5 }, { label: "Mittel", breite: 40, hoehe: 30, anzahl: 11 }, { label: "Groß", breite: 64, hoehe: 48, anzahl: 24 } ];
  const changeArt = (art: MapArt) => update({ art, breite: "", hoehe: "", anzahl: "" });
  return <div className={`map-generation-controls${compact ? " compact" : ""}`}>
    {compact ? <label>Was liegt hinter dieser Tür?<select value={value.art} onChange={event => changeArt(event.target.value as MapArt)}>
      {MAP_KINDS.map(kind => <option key={kind.id} value={kind.id}>{kind.label}</option>)}
    </select></label> : <div className="map-kind-cards" role="group" aria-label="Art der Karte">
      {MAP_KINDS.map(({ id, label, text, icon: Icon }) => <button type="button" key={id} aria-pressed={value.art === id} onClick={() => changeArt(id)}><Icon size={23} /><strong>{label}</strong><span>{text}</span></button>)}
    </div>}
    {!cave ? <div className="map-era-section"><span className="map-setting-heading"><strong>Setting</strong><span>Welt & Einrichtung</span></span>
      <div className="map-era-options" role="group" aria-label="Setting">{KARTEN_SETTINGS.map(setting => <button type="button" key={setting} aria-pressed={value.setting === setting} onClick={() => onChange(changeGenerationSetting(value, setting))}>
        <strong>{KARTEN_SETTING_LABEL[setting]}</strong><small>{setting === "fantasy" ? "Gewachsene Orte & alte Mauern" : setting === "gegenwart" ? "Stadtblöcke, Alltag & Industrie" : "Kolonien, Decks & Zukunftstechnik"}</small>
      </button>)}</div><small>Bestimmt Stadtstruktur und Ausstattung. Der passende Zeichenstil wird vorausgewählt.</small>
    </div> : null}
    {value.art === "grundriss" ? <label>{profileLocked ? "Innenraum für Gebäudetyp" : "Gebäudetyp"}<select disabled={profileLocked} value={value.profil} onChange={event => update({ profil: event.target.value as GenerationSettings["profil"] })}>
      <option value="frei">Freier Grundriss / Dungeon</option><optgroup label={`Passend zu ${KARTEN_SETTING_LABEL[value.setting]}`}>{suggested.map(typ => <option key={typ} value={typ}>{BAUWERK_LABEL[typ]}</option>)}</optgroup>
      <optgroup label="Weitere Gebäudetypen">{BAUWERK_TYPEN.filter(typ => !suggested.includes(typ)).map(typ => <option key={typ} value={typ}>{BAUWERK_LABEL[typ]}</option>)}</optgroup>
    </select></label> : null}
    <div className="map-setting-heading"><Ruler size={16} /><strong>{city ? "Siedlungsgröße" : "Kartengröße"}</strong><span>{w} × {h} Zellen</span></div>
    <div className="map-size-presets" role="group" aria-label="Größenprofile">{presets.map(preset => <button type="button" key={preset.label}
      aria-pressed={value.breite === preset.breite && value.hoehe === preset.hoehe && value.anzahl === preset.anzahl} onClick={() => update(preset)}>{preset.label}</button>)}</div>
    <div className="map-numbers">
      <label>Breite<input type="number" min={12} max={192} step={1} value={value.breite} placeholder={String(w)} onChange={event => update({ breite: event.target.value === "" ? "" : event.target.valueAsNumber })} /></label>
      <label>Höhe<input type="number" min={12} max={192} step={1} value={value.hoehe} placeholder={String(h)} onChange={event => update({ hoehe: event.target.value === "" ? "" : event.target.valueAsNumber })} /></label>
      <label>{city ? "Gebäude" : cave ? "Kammern" : "Räume"}<input type="number" min={city ? 1 : 2} max={city ? 256 : cave ? 32 : 64} step={1} value={value.anzahl}
        placeholder={String(city ? defaults.siedlung.bauwerke : cave ? defaults.hoehle.kammern : defaults.grundriss.raeume)} onChange={event => update({ anzahl: event.target.value === "" ? "" : event.target.valueAsNumber })} /></label>
    </div>
    <small className="field-help">{(w * std.zellgroesse).toLocaleString("de")} × {(h * std.zellgroesse).toLocaleString("de")} Pixel · {city ? "Gebäudezahl als Ziel; Straßen und freie Flächen brauchen Platz." : "Raumzahl als Ziel; die Aufteilung richtet sich nach dem Gebäudetyp."}</small>
    <div className="map-setting-heading"><Paintbrush size={16} /><strong>Zeichenstil</strong></div>
    <div className="map-style-options" role="group" aria-label="Zeichenstil">
      <button type="button" aria-pressed={value.stil === "zeitwelten"} onClick={() => update({ stil: "zeitwelten" })}><span className="map-style-swatch zeitwelten" /><span><strong>Zeitwelten</strong><small>100 Objekte für Gegenwart & Science-Fiction</small></span></button>
      <button type="button" aria-pressed={value.stil === "gemalt"} onClick={() => update({ stil: "gemalt" })}><span className="map-style-swatch painted" /><span><strong>Gemalt</strong><small>Warme Farben und Texturen</small></span></button>
      <button type="button" aria-pressed={value.stil === "grundriss"} onClick={() => update({ stil: "grundriss" })}><span className="map-style-swatch blueprint" /><span><strong>Grundriss</strong><small>Klare Linien und Symbole</small></span></button>
    </div>
    <details className="map-fine-settings"><summary>Feineinstellungen</summary><div>
      {city ? <label>Straßendichte <output>{Math.round(value.dichte * 100)} %</output><input type="range" min={0} max={1} step={.05} value={value.dichte} onChange={event => update({ dichte: event.target.valueAsNumber })} /></label>
        : <label>Einrichtung <output>{Math.round(value.moeblierung * 100)} %</output><input type="range" min={0} max={1} step={.1} value={value.moeblierung} onChange={event => update({ moeblierung: event.target.valueAsNumber })} /></label>}
      {value.art === "grundriss" && value.profil === "frei" ? <label>Raumaufteilung<select value={value.anordnung} onChange={event => update({ anordnung: event.target.value as GenerationSettings["anordnung"] })}><option value="streuung">Organisch verbunden</option><option value="raster">Geplanter Grundriss</option><option value="kachelwerk">Verzweigte Anlage</option></select></label> : null}
      <label className="check-label"><input type="checkbox" checked={value.licht} onChange={event => update({ licht: event.target.checked })} /> Lichter platzieren</label>
    </div></details>
  </div>;
}
