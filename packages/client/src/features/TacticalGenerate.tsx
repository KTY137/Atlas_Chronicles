import { useState } from "react";
import type { GrundrissBericht, GrundrissOptionen } from "@chronicle/forge";
import { Button, Loading, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { useCommand } from "./game-api";

/**
 * Die eigene Erzeugung — the surface that makes the generator reachable by a person.
 *
 * Two deliberate choices here, both of them about honesty rather than layout:
 *
 * 1. **The defaults come from the server**, which reads them from the generator itself. A form
 *    carrying its own idea of "8 rooms" would drift the moment the generator's defaults changed,
 *    and the drift would be invisible — the map would simply stop matching what the algorithm
 *    considers ordinary.
 * 2. **A preview is offered before anything is written.** Generation is cheap, but a campaign
 *    filling up with discarded dungeons is not, and the `keimHash` shown here is the thing worth
 *    seeing: it is what makes the map reproducible, and it changes when the options change.
 */
interface Vorschau {
  readonly keimHash: string;
  readonly wurzelId: string;
  readonly art: string;
  readonly raeume: number;
  readonly knoten: number;
  readonly groesse: readonly [number, number];
  readonly bericht: GrundrissBericht;
}

interface Erzeugt {
  readonly ack: { subjectId: string; version: number };
  readonly keimHash: string;
  readonly bericht: GrundrissBericht;
}

export function TacticalGenerate({ campaignId, onCreated }: { campaignId: string; onCreated: (mapId: string) => void }) {
  const defaults = useResource<GrundrissOptionen>(apiPath(campaignId, "/tactical/generate/defaults"), 0);
  const command = useCommand(), task = useTask();
  const [name, setName] = useState(""), [keim, setKeim] = useState("");
  const [raeume, setRaeume] = useState<number | "">("");
  const [breite, setBreite] = useState<number | "">(""), [hoehe, setHoehe] = useState<number | "">("");
  const [schleifen, setSchleifen] = useState<number | "">("");
  const [licht, setLicht] = useState(true);
  const [vorschau, setVorschau] = useState<Vorschau | null>(null);

  if (defaults.loading) return <Loading text="Der Generator meldet seine Vorgaben …" />;
  if (defaults.error || !defaults.data) return <Notice error>{defaults.error || "Der Generator ist auf diesem Server nicht verfügbar."}</Notice>;

  const std = defaults.data;
  // An untouched field means "whatever the generator considers ordinary" and is left out entirely,
  // rather than sent as a copy of the default that would silently freeze today's value.
  const optionen = () => ({
    ...(raeume === "" ? {} : { raeume }),
    ...(breite === "" || hoehe === "" ? {} : { zellen: [breite, hoehe] as [number, number] }),
    ...(schleifen === "" ? {} : { schleifen }),
    ...(licht === std.licht ? {} : { licht }),
  });
  const anfrage = () => ({ name: name.trim(), keim: keim.trim(), optionen: optionen() });
  const bereit = name.trim().length > 0 && keim.trim().length > 0;

  const zahl = (value: number | "", set: (v: number | "") => void, label: string, min: number, max: number, hint: string) =>
    <label>{label}<input type="number" min={min} max={max} value={value} placeholder={hint}
      onChange={event => set(event.target.value === "" ? "" : Number(event.target.value))} /></label>;

  return <section className="panel tactical-generate">
    <h2>Einen Ort erzeugen</h2>
    <p className="field-help">
      Der Grundriss entsteht aus deinem Keim. Derselbe Keim mit denselben Optionen ergibt immer
      dieselbe Karte — änderst du eine Option, ist es ehrlich eine andere Karte und nicht dieselbe
      anders.
    </p>

    <label>Name der Karte<input value={name} maxLength={160} required placeholder="z. B. Die Krypta unter Bjoldiri"
      onChange={event => { setName(event.target.value); setVorschau(null); }} /></label>
    <label>Keim<input value={keim} maxLength={512} required placeholder="Ein Wort, ein Satz, oder der Keim eines Ortes"
      onChange={event => { setKeim(event.target.value); setVorschau(null); }} />
      <small>Aus einer erzeugten Welt kannst du den Keim eines Ortes übernehmen — dann hängt der Grundriss an diesem Ort.</small>
    </label>

    <div className="rf-form-grid">
      {zahl(raeume, v => { setRaeume(v); setVorschau(null); }, "Räume", 2, 64, String(std.raeume))}
      {zahl(schleifen, v => { setSchleifen(v); setVorschau(null); }, "Zusätzliche Gänge", 0, 16, String(std.schleifen))}
      {zahl(breite, v => { setBreite(v); setVorschau(null); }, "Zellen breit", 12, 192, String(std.zellen[0]))}
      {zahl(hoehe, v => { setHoehe(v); setVorschau(null); }, "Zellen hoch", 12, 192, String(std.zellen[1]))}
    </div>
    <label className="checkbox"><input type="checkbox" checked={licht} onChange={event => { setLicht(event.target.checked); setVorschau(null); }} /> Lichter setzen</label>

    <div className="scene-links">
      <Button disabled={!bereit || task.busy} onClick={() => void task.run(async () => {
        setVorschau(await command<Vorschau>(apiPath(campaignId, "/tactical/generate/preview"), anfrage()));
      })}>Vorschau</Button>
      <Button variant="primary" disabled={!bereit || task.busy} onClick={() => void task.run(async () => {
        const erzeugt = await command<Erzeugt>(apiPath(campaignId, "/tactical/generate"), anfrage());
        setVorschau(null); setName(""); setKeim("");
        onCreated(erzeugt.ack.subjectId);
      })}>Erzeugen und speichern</Button>
    </div>
    {task.error ? <Notice error>{task.error}</Notice> : null}

    {vorschau ? <div className="tactical-generate-report">
      <p>
        <strong>{vorschau.raeume} Räume</strong> auf {vorschau.groesse[0]} × {vorschau.groesse[1]} Pixeln ·{" "}
        {vorschau.bericht.tueren} Türen · {vorschau.bericht.waende} Wände · {vorschau.bericht.lichter} Lichter ·{" "}
        {vorschau.bericht.stamps} Objekte
      </p>
      <p className="muted">
        Keim <code>{vorschau.keimHash.slice(0, 16)}</code> · Paket {vorschau.bericht.paket.id}@{vorschau.bericht.paket.version}
      </p>
      {vorschau.bericht.nichtBedient.length ? <Notice>
        Das Assetpaket kennt {vorschau.bericht.nichtBedient.length} gewünschte Stücke nicht:{" "}
        {vorschau.bericht.nichtBedient.join(", ")}. Die Karte entsteht trotzdem, an diesen Stellen bleibt sie leer.
      </Notice> : null}
    </div> : null}
  </section>;
}
