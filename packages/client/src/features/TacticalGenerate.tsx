// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useMemo, useRef, useState } from "react";
import type { GrundrissBericht, GrundrissOptionen, HoehleOptionen, SiedlungArt, SiedlungBericht, SiedlungOptionen } from "@chronicle/forge";
import type { TacticalMapDocumentV1 } from "@chronicle/szene";
import type { ProjectedMapScene } from "@chronicle/render";
import { Button, Loading, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { useCommand } from "./game-api";
import { TacticalCanvas } from "./TacticalCanvas";
import { mapRegionOutlines } from "./map-region-outlines";

type Kartenart = "grundriss" | "hoehle" | "siedlung";
interface Defaults {
  grundriss: GrundrissOptionen; hoehle: HoehleOptionen;
  siedlung: Record<SiedlungArt, SiedlungOptionen>;
}
interface Vorschau {
  keimHash: string; wurzelId: string; art: Kartenart; knoten: number;
  groesse: readonly [number, number]; karte: TacticalMapDocumentV1;
  bericht: GrundrissBericht | SiedlungBericht;
  raeume?: number; bauwerke?: number; strassen?: number;
}

/** All kinds use the existing map renderer and canonical map storage. */
export function TacticalGenerate({ campaignId, onCreated, onDirty }: {
  campaignId: string; onCreated: (mapId: string) => void; onDirty?: (value: boolean) => void;
}) {
  const defaults = useResource<Defaults>(apiPath(campaignId, "/tactical/generate/defaults"), 0);
  const command = useCommand(), task = useTask(), mounted = useRef(true);
  const [art, setArt] = useState<Kartenart>("grundriss"), [siedlungsart, setSiedlungsart] = useState<SiedlungArt>("dorf");
  const [name, setName] = useState(""), [keim, setKeim] = useState("");
  const [anzahl, setAnzahl] = useState<number | "">("");
  const [breite, setBreite] = useState<number | "">(""), [hoehe, setHoehe] = useState<number | "">("");
  const [schleifen, setSchleifen] = useState<number | "">(""), [dichte, setDichte] = useState<number | "">("");
  const [licht, setLicht] = useState<boolean | null>(null);
  const [vorschau, setVorschau] = useState<Vorschau | null>(null);
  const dirty = !!name || !!keim || anzahl !== "" || breite !== "" || hoehe !== "" || schleifen !== "" || dichte !== "" || licht !== null;
  useEffect(() => { onDirty?.(dirty); }, [dirty, onDirty]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; onDirty?.(false); }; }, [onDirty]);
  const scene = useMemo<ProjectedMapScene | null>(() => {
    if (!vorschau?.karte) return null;
    const map = vorschau.karte;
    return {
      id: `preview:${vorschau.keimHash}`, width: map.geometry.size[0], height: map.geometry.size[1], grid: map.grid, pins: [],
      cells: map.geometry.regions.map(region => ({ id: region.id, polygon: region.punkte, fill: 0x375949 })),
      lines: [...mapRegionOutlines(map), ...map.walls.map(wall => ({ id: wall.id, points: wall.points }))],
      stamps: map.geometry.stamps.map(stamp => ({ id: stamp.id, asset: stamp.a, x: stamp.x, y: stamp.y, s: stamp.s, r: stamp.r, l: stamp.l })),
    };
  }, [vorschau]);

  if (defaults.loading) return <Loading text="Kartenwerkstatt wird vorbereitet …" />;
  if (defaults.error || !defaults.data) return <Notice error>{defaults.error || "Der Generator ist auf diesem Server nicht verfügbar."}</Notice>;
  const siedlung = art === "siedlung", hoehle = art === "hoehle";
  const std = siedlung ? defaults.data.siedlung[siedlungsart] : hoehle ? defaults.data.hoehle : defaults.data.grundriss;
  const extent = "ausdehnung" in std ? std.ausdehnung : std.zellen;
  const options = () => ({
    ...(siedlung ? { art: siedlungsart } : {}),
    ...(anzahl === "" ? {} : siedlung ? { bauwerke: anzahl } : hoehle ? { kammern: anzahl } : { raeume: anzahl }),
    ...(breite === "" && hoehe === "" ? {} : { [siedlung ? "ausdehnung" : "zellen"]: [breite === "" ? extent[0] : breite, hoehe === "" ? extent[1] : hoehe] }),
    ...(schleifen === "" || siedlung || hoehle ? {} : { schleifen }),
    ...(dichte === "" || !siedlung ? {} : { strassenDichte: dichte / 100 }),
    ...(licht === null ? {} : { licht }),
  });
  const request = () => ({ art, name: name.trim(), keim: keim.trim() || name.trim(), optionen: options() });
  const resetOptions = () => { setAnzahl(""); setBreite(""); setHoehe(""); setSchleifen(""); setDichte(""); setLicht(null); setVorschau(null); };
  const number = (value: number | "", set: (value: number | "") => void, label: string, min: number, max: number, hint: number) =>
    <label>{label}<input type="number" min={min} max={max} step={1} value={value} placeholder={String(hint)} onChange={event => {
      set(event.target.value === "" ? "" : Number(event.target.value)); setVorschau(null);
    }} /></label>;

  return <section className="panel tactical-generate">
    <header><p className="eyebrow">1 · Gestalten & ansehen</p><h2>Einen Ort erzeugen</h2>
      <p className="field-help">Wähle einen Kartentyp und gib dem Ort einen Namen. Die Vorschau zeigt die Karte, bevor sie in deiner Runde gespeichert wird.</p></header>
    <fieldset className="tactical-command-fields" disabled={task.busy}>
      <div className="generator-basics">
        <label>Name der Karte<input value={name} maxLength={160} required placeholder={siedlung ? "z. B. Das Dorf am Silberbach" : "z. B. Die Krypta unter Bjoldiri"} onChange={event => { setName(event.target.value); setVorschau(null); }} /></label>
        <label>Art der Karte<select value={art} onChange={event => { setArt(event.target.value as Kartenart); resetOptions(); }}>
          <option value="grundriss">Grundriss · Schloss, Haus oder Krypta</option><option value="hoehle">Höhle · Kammern im Fels</option><option value="siedlung">Siedlung · Weiler, Dorf oder Stadt</option>
        </select></label>
      </div>
      {siedlung ? <div className="generator-settlement"><label>Größe der Siedlung<select value={siedlungsart} onChange={event => { setSiedlungsart(event.target.value as SiedlungArt); resetOptions(); }}>
        <option value="weiler">Weiler · wenige Häuser</option><option value="dorf">Dorf · Häuser und Wege</option><option value="stadt">Stadt · Viertel und Stadtmauer</option>
      </select></label><p className="field-help">Straßen und Grundstücke entstehen gemeinsam. Gebäude kannst du später im Atlas betreten und mit Innenräumen verbinden.</p></div> : null}
      <details className="generator-options"><summary>Größe, Gestaltung & Startwert anpassen</summary><div className="rf-form-grid">
        {number(anzahl, setAnzahl, siedlung ? "Gewünschte Gebäude" : hoehle ? "Kammern" : "Räume", siedlung ? 1 : 2, siedlung ? 256 : hoehle ? 32 : 64,
          "bauwerke" in std ? std.bauwerke : "kammern" in std ? std.kammern : std.raeume)}
        {number(breite, setBreite, "Zellen breit", 12, 192, extent[0])}{number(hoehe, setHoehe, "Zellen hoch", 12, 192, extent[1])}
        {siedlung ? number(dichte, setDichte, "Straßendichte in Prozent", 0, 100, Math.round((std as SiedlungOptionen).strassenDichte * 100))
          : hoehle ? null : number(schleifen, setSchleifen, "Zusätzliche Gänge", 0, 16, (std as GrundrissOptionen).schleifen)}
      </div><label>Startwert (Keim)<input value={keim} maxLength={256} placeholder="Leer lassen: Kartenname verwenden" onChange={event => { setKeim(event.target.value); setVorschau(null); }} />
        <small>Gleicher Startwert und gleiche Einstellungen ergeben dieselbe Karte.</small></label>
        <Button onClick={() => { setKeim(crypto.randomUUID()); setVorschau(null); }}>Zufälligen Startwert wählen</Button>
        <label className="checkbox"><input type="checkbox" checked={licht ?? std.licht} onChange={event => { setLicht(event.target.checked); setVorschau(null); }} /> Lichter setzen</label>
      </details>
      <div className="button-row"><Button disabled={!name.trim() || task.busy} onClick={() => void task.run(async () => {
        const result = await command<Vorschau>(apiPath(campaignId, "/tactical/generate/preview"), request());
        if (mounted.current) setVorschau(result);
      })}>{task.busy ? "Karte wird vorbereitet …" : "Vorschau"}</Button>
        <Button variant="primary" disabled={!vorschau || task.busy} onClick={() => void task.run(async () => {
          const result = await command<{ ack: { subjectId: string } }>(apiPath(campaignId, "/tactical/generate"), request());
          if (mounted.current) { setName(""); setKeim(""); resetOptions(); onDirty?.(false); onCreated(result.ack.subjectId); }
        })}>Erzeugen und speichern</Button></div>
    </fieldset>
    {task.error ? <Notice error>{task.error}</Notice> : null}
    {vorschau ? <section className="generator-preview" aria-label="Kartenvorschau"><header><p className="eyebrow">2 · Prüfen & speichern</p><h3>{name}</h3>
      <p>{vorschau.art === "siedlung" ? `${vorschau.bauwerke} Gebäude · ${vorschau.strassen} Straßen` : `${vorschau.raeume} ${vorschau.art === "hoehle" ? "Kammern" : "Räume"}`} · noch nicht gespeichert</p></header>
      {scene ? <TacticalCanvas scene={scene} tileBase="" /> : null}
      {vorschau.art === "siedlung" && (vorschau.bericht as SiedlungBericht).bauwerke < (vorschau.bericht as SiedlungBericht).angefordert
        ? <Notice>Auf diese Fläche passen {vorschau.bauwerke} der gewünschten {(vorschau.bericht as SiedlungBericht).angefordert} Gebäude. Vergrößere die Karte für mehr Platz.</Notice> : null}
      {vorschau.bericht.nichtBedient.length ? <Notice>Für {vorschau.bericht.nichtBedient.length} Gestaltungselemente fehlen Bilder im Assetpaket. Die Geometrie bleibt erhalten.</Notice> : null}
    </section> : <div className="generator-preview-empty"><p>Deine Karte erscheint hier.</p><span>Die Vorschau lässt sich verschieben und vergrößern.</span></div>}
  </section>;
}
