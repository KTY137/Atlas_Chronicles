// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Building2, Castle, CloudSun, Droplets, Mountain, Paintbrush, Ruler, MapPin, Trees, Waves, Sprout, Sailboat, Circle, Palmtree, Map } from "lucide-react";
import { BAUWERK_LABEL, BAUWERK_TYPEN, BAUWERK_SETTINGS, KARTEN_SETTINGS, KARTEN_SETTING_LABEL } from "@chronicle/szene";
import { locale, t } from "../i18n";
import { changeGenerationSetting, generationDimensions, type GenerationDefaults, type GenerationSettings, type MapArt } from "./map-generation";

// Die Anzeigetexte stehen als Tabelle daneben, damit die Anzeigestelle sie mit `t` nachschlägt.
const MAP_KIND_LABEL = { region: "Land & Region", siedlung: "Stadt & Dorf", grundriss: "Gebäude & Dungeon", hoehle: "Höhle" } as const;
const MAP_KIND_TITEL = {
  region: "Weites Land mit Orten, die du betreten kannst",
  siedlung: "Straßen, Viertel und begehbare Gebäude",
  grundriss: "Vom Wohnhaus über das Labor bis zur Raumstation",
  hoehle: "Natürliche Kammern und gewachsener Fels",
} as const;
export const MAP_KINDS = [
  { id: "region", label: MAP_KIND_LABEL.region, text: MAP_KIND_TITEL.region, icon: Map },
  { id: "siedlung", label: MAP_KIND_LABEL.siedlung, text: MAP_KIND_TITEL.siedlung, icon: Building2 },
  { id: "grundriss", label: MAP_KIND_LABEL.grundriss, text: MAP_KIND_TITEL.grundriss, icon: Castle },
  { id: "hoehle", label: MAP_KIND_LABEL.hoehle, text: MAP_KIND_TITEL.hoehle, icon: Mountain },
] as const;

const MAP_LOCATION_LABEL = { ebene: "Ebene", huegel: "Hügelland", wald: "Wald", gebirge: "Gebirge", fluss: "Fluss", see: "See", moor: "Moor", kueste: "Küste", insel: "Insel" } as const;
const MAP_LOCATION_TITEL = {
  ebene: "Offenes Land & Felder", huegel: "Sanfte Hügel & weite Sicht", wald: "Lichtung im dichten Wald", gebirge: "Ein Ort zwischen Felsen", fluss: "Ufer, Brücken & Wege",
  see: "Siedlung am Seeufer", moor: "Sumpf, Schilf & stilles Wasser", kueste: "Strand & offenes Meer", insel: "Rundum vom Meer umgeben",
} as const;
export const MAP_LOCATIONS = [
  { id: "ebene", label: MAP_LOCATION_LABEL.ebene, text: MAP_LOCATION_TITEL.ebene, icon: Sprout },
  { id: "huegel", label: MAP_LOCATION_LABEL.huegel, text: MAP_LOCATION_TITEL.huegel, icon: CloudSun },
  { id: "wald", label: MAP_LOCATION_LABEL.wald, text: MAP_LOCATION_TITEL.wald, icon: Trees },
  { id: "gebirge", label: MAP_LOCATION_LABEL.gebirge, text: MAP_LOCATION_TITEL.gebirge, icon: Mountain },
  { id: "fluss", label: MAP_LOCATION_LABEL.fluss, text: MAP_LOCATION_TITEL.fluss, icon: Waves },
  { id: "see", label: MAP_LOCATION_LABEL.see, text: MAP_LOCATION_TITEL.see, icon: Circle },
  { id: "moor", label: MAP_LOCATION_LABEL.moor, text: MAP_LOCATION_TITEL.moor, icon: Droplets },
  { id: "kueste", label: MAP_LOCATION_LABEL.kueste, text: MAP_LOCATION_TITEL.kueste, icon: Sailboat },
  { id: "insel", label: MAP_LOCATION_LABEL.insel, text: MAP_LOCATION_TITEL.insel, icon: Palmtree },
] as const;

export function MapGenerationControls({ value, defaults, onChange, compact = false, profileLocked = false }: {
  value: GenerationSettings; defaults: GenerationDefaults; onChange: (next: GenerationSettings) => void; compact?: boolean; profileLocked?: boolean;
}) {
  const update = (patch: Partial<GenerationSettings>) => onChange({ ...value, ...patch });
  const [w, h] = generationDimensions(value, defaults), city = value.art === "siedlung", cave = value.art === "hoehle";
  const cityDefaults = defaults.siedlungsarten?.[value.siedlung] ?? defaults.siedlung;
  const std = city ? cityDefaults : cave ? defaults.hoehle : defaults.grundriss;
  const suggested = BAUWERK_SETTINGS[value.setting];
  const presets = city ? [
    ...(["weiler", "dorf", "stadt"] as const).map((art, index) => {
      const fallback = [{ ausdehnung: [24, 20], bauwerke: 12, strassenDichte: .15, licht: false }, defaults.siedlung, { ausdehnung: [56, 44], bauwerke: 130, strassenDichte: .55, licht: true }][index]!;
      const preset = defaults.siedlungsarten?.[art] ?? fallback;
      return { label: [t("Weiler"), t("Dorf"), t("Stadt")][index]!, breite: preset.ausdehnung[0]!, hoehe: preset.ausdehnung[1]!, anzahl: preset.bauwerke, siedlung: art, dichte: preset.strassenDichte, licht: preset.licht };
    }),
    { label: t("Großstadt"), breite: 88, hoehe: 64, anzahl: 256, siedlung: "stadt" as const, dichte: .7 },
  ] : [ { label: t("Klein"), breite: 24, hoehe: 20, anzahl: 5 }, { label: t("Mittel"), breite: 40, hoehe: 30, anzahl: 11 }, { label: t("Groß"), breite: 64, hoehe: 48, anzahl: 24 } ];
  const changeArt = (art: MapArt) => update({ art, breite: "", hoehe: "", anzahl: "" });
  return <div className={`map-generation-controls${compact ? " compact" : ""}`}>
    {compact ? <label>{t("Was liegt hinter dieser Tür?")}<select value={value.art} onChange={event => changeArt(event.target.value as MapArt)}>
      {MAP_KINDS.map(kind => <option key={kind.id} value={kind.id}>{t(MAP_KIND_LABEL[kind.id])}</option>)}
    </select></label> : <div className="map-kind-cards" role="group" aria-label={t("Art der Karte")}>
      {MAP_KINDS.map(({ id, icon: Icon }) => <button type="button" key={id} aria-pressed={value.art === id} onClick={() => changeArt(id)}><Icon size={23} /><strong>{t(MAP_KIND_LABEL[id])}</strong><span>{t(MAP_KIND_TITEL[id])}</span></button>)}
    </div>}
    {city ? <section className="map-location-section" aria-label={t("Standort der Siedlung")}>
      <div className="map-setting-heading"><MapPin size={16} /><strong>{t("Wo liegt dein Ort?")}</strong></div>
      <div className="map-location-cards" role="group" aria-label={t("Landschaft auswählen")}>
        {MAP_LOCATIONS.map(({ id, icon: Icon }) => <button type="button" key={id} aria-pressed={value.standort === id} onClick={() => update({ standort: id })}>
          <span className={`map-location-swatch ${id}`} aria-hidden="true"><Icon size={20} /></span><span><strong>{t(MAP_LOCATION_LABEL[id])}</strong><small>{t(MAP_LOCATION_TITEL[id])}</small></span>
        </button>)}
      </div>
      <small>{t("Bestimmt Gelände, Wasser und bebaubares Land. Danach kannst du die Landschaft frei bearbeiten.")}</small>
    </section> : null}
    {!cave ? <div className="map-era-section"><span className="map-setting-heading"><strong>{t("Setting")}</strong><span>{t("Welt & Einrichtung")}</span></span>
      <div className="map-era-options" role="group" aria-label={t("Setting")}>{KARTEN_SETTINGS.map(setting => <button type="button" key={setting} aria-pressed={value.setting === setting} onClick={() => onChange(changeGenerationSetting(value, setting))}>
        <strong>{t(KARTEN_SETTING_LABEL[setting])}</strong><small>{setting === "fantasy" ? t("Gewachsene Orte & alte Mauern") : setting === "gegenwart" ? t("Stadtblöcke, Alltag & Industrie") : t("Kolonien, Decks & Zukunftstechnik")}</small>
      </button>)}</div><small>{t("Bestimmt Stadtstruktur und Ausstattung. Der passende Zeichenstil wird vorausgewählt.")}</small>
    </div> : null}
    {value.art === "grundriss" ? <label>{profileLocked ? t("Innenraum für Gebäudetyp") : t("Gebäudetyp")}<select disabled={profileLocked} value={value.profil} onChange={event => update({ profil: event.target.value as GenerationSettings["profil"] })}>
      <option value="frei">{t("Freier Grundriss / Dungeon")}</option><optgroup label={t("Passend zu {setting}", { setting: t(KARTEN_SETTING_LABEL[value.setting]) })}>{suggested.map(typ => <option key={typ} value={typ}>{t(BAUWERK_LABEL[typ])}</option>)}</optgroup>
      <optgroup label={t("Weitere Gebäudetypen")}>{BAUWERK_TYPEN.filter(typ => !suggested.includes(typ)).map(typ => <option key={typ} value={typ}>{t(BAUWERK_LABEL[typ])}</option>)}</optgroup>
    </select></label> : null}
    <div className="map-setting-heading"><Ruler size={16} /><strong>{city ? t("Siedlungsgröße") : t("Kartengröße")}</strong><span>{t("{breite} × {hoehe} Zellen", { breite: w, hoehe: h })}</span></div>
    <div className="map-size-presets" role="group" aria-label={t("Größenprofile")}>{presets.map(preset => <button type="button" key={preset.label}
      aria-pressed={value.breite === preset.breite && value.hoehe === preset.hoehe && value.anzahl === preset.anzahl} onClick={() => update(preset)}>{preset.label}</button>)}</div>
    <div className="map-numbers">
      <label>{t("Breite")}<input type="number" min={12} max={192} step={1} value={value.breite} placeholder={String(w)} onChange={event => update({ breite: event.target.value === "" ? "" : event.target.valueAsNumber })} /></label>
      <label>{t("Höhe")}<input type="number" min={12} max={192} step={1} value={value.hoehe} placeholder={String(h)} onChange={event => update({ hoehe: event.target.value === "" ? "" : event.target.valueAsNumber })} /></label>
      <label>{city ? t("Gebäude") : cave ? t("Kammern") : t("Räume")}<input type="number" min={city ? 1 : 2} max={city ? 256 : cave ? 32 : 64} step={1} value={value.anzahl}
        placeholder={String(city ? cityDefaults.bauwerke : cave ? defaults.hoehle.kammern : defaults.grundriss.raeume)} onChange={event => update({ anzahl: event.target.value === "" ? "" : event.target.valueAsNumber })} /></label>
    </div>
    <small className="field-help">{t("{breite} × {hoehe} Pixel", { breite: (w * std.zellgroesse).toLocaleString(locale()), hoehe: (h * std.zellgroesse).toLocaleString(locale()) })} · {city ? t("Gebäudezahl als Ziel; Straßen und freie Flächen brauchen Platz.") : t("Raumzahl als Ziel; die Aufteilung richtet sich nach dem Gebäudetyp.")}</small>
    <div className="map-setting-heading"><Paintbrush size={16} /><strong>{t("Zeichenstil")}</strong></div>
    <div className="map-style-options" role="group" aria-label={t("Zeichenstil")}>
      <button type="button" aria-pressed={value.stil === "genres"} onClick={() => update({ stil: "genres" })}><span className="map-style-swatch genres" /><span><strong>{t("Genre-Archiv")}</strong><small>{t("300 Motive · Genre-Mix passend zum Setting")}</small></span></button>
      <button type="button" aria-pressed={value.stil === "zeitwelten"} onClick={() => update({ stil: "zeitwelten" })}><span className="map-style-swatch zeitwelten" /><span><strong>{t("Zeitwelten")}</strong><small>{t("100 Objekte für Gegenwart & Science-Fiction")}</small></span></button>
      <button type="button" aria-pressed={value.stil === "gemalt"} onClick={() => update({ stil: "gemalt" })}><span className="map-style-swatch painted" /><span><strong>{t("Gemalt")}</strong><small>{t("Warme Farben und Texturen")}</small></span></button>
      <button type="button" aria-pressed={value.stil === "grundriss"} onClick={() => update({ stil: "grundriss" })}><span className="map-style-swatch blueprint" /><span><strong>{t("Grundriss")}</strong><small>{t("Klare Linien und Symbole")}</small></span></button>
    </div>
    <details className="map-fine-settings"><summary>{t("Feineinstellungen")}</summary><div>
      {city ? <label>{t("Straßendichte")} <output>{Math.round(value.dichte * 100)} %</output><input type="range" min={0} max={1} step={.05} value={value.dichte} onChange={event => update({ dichte: event.target.valueAsNumber })} /></label>
        : <label>{t("Einrichtung")} <output>{Math.round(value.moeblierung * 100)} %</output><input type="range" min={0} max={1} step={.1} value={value.moeblierung} onChange={event => update({ moeblierung: event.target.valueAsNumber })} /></label>}
      {city ? <label>{t("Relief")} <output>{value.relief < .25 ? t("Flach") : value.relief > .75 ? t("Gebirgig") : t("Hügelig")}</output><input type="range" min={0} max={1} step={.05} aria-label={t("Relief")} value={value.relief} onChange={event => update({ relief: event.target.valueAsNumber })} /></label> : null}
      {city ? <label>{t("Bewaldung")} <output>{value.bewaldung < .25 ? t("Kahl") : value.bewaldung > .75 ? t("Dicht") : t("Gehölze")}</output><input type="range" min={0} max={1} step={.05} aria-label={t("Bewaldung")} value={value.bewaldung} onChange={event => update({ bewaldung: event.target.valueAsNumber })} /></label> : null}
      {city ? <small className="field-help">{t("Relief formt Hügel, Täler und Flüsse; Bewaldung bestimmt, wie viel offenes Land Wald trägt. Beides kannst du danach mit den Werkzeugen Höhe und Gelände weiter bearbeiten.")}</small> : null}
      {value.art === "grundriss" && value.profil === "frei" ? <label>{t("Raumaufteilung")}<select value={value.anordnung} onChange={event => update({ anordnung: event.target.value as GenerationSettings["anordnung"] })}><option value="streuung">{t("Organisch verbunden")}</option><option value="raster">{t("Geplanter Grundriss")}</option><option value="kachelwerk">{t("Verzweigte Anlage")}</option></select></label> : null}
      <label className="check-label"><input type="checkbox" checked={value.licht} onChange={event => update({ licht: event.target.checked })} /> {t("Lichter platzieren")}</label>
    </div></details>
  </div>;
}
