// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState } from "react";
import { Coins, Pencil } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import "./geld.css";

/**
 * Der Geldzähler — **eine** Komponente für beide Orte.
 *
 * Der Auftrag verlangt ihn „im Inventar, aber noch beim Char": zwei Stellen, eine Sache. Ihn
 * zweimal zu schreiben wäre genau die Doppelung, die beim ersten Umbau auseinanderliefe — also
 * steht er einmal hier und wird zweimal gerendert.
 *
 * **Gesetzt wird ein Stand, nicht verrechnet.** Das Feld zeigt den Betrag und schickt ihn mit der
 * erwarteten Fassung; wer inzwischen eingekauft hat, bekommt einen Konflikt statt eines stillen
 * Verlusts. Ein „+5"-Knopf wäre bequemer und würde genau diesen Verlust verstecken.
 */

interface Einheit { name: string; version: number }
interface Stand { actorId: string; betrag: number; version: number }
interface Geldentwurf { scope: string; betrag: number; baseline: Stand }
interface Namensentwurf { scope: string; name: string; baseline: Einheit | null }

export function Geldzaehler({ campaignId, actorId, gm, revision, kompakt = false, onChanged, onDirty }: {
  campaignId: string; actorId: string; gm: boolean; revision: number; kompakt?: boolean; onChanged?: () => void; onDirty?: (value: boolean) => void;
}) {
  const [local, setLocal] = useState(0);
  const einheit = useResource<Einheit | null>(apiPath(campaignId, "/geld/einheit"), revision + local);
  const stand = useResource<Stand>(actorId ? apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}/geld`) : null, revision + local);
  const scope = `${campaignId}:${actorId}`;
  const activeScope = useRef<string | null>(scope);
  activeScope.current = scope;
  useEffect(() => { activeScope.current = scope; return () => { activeScope.current = null; }; }, [scope]);
  const [geldentwurf, setEntwurf] = useState<Geldentwurf | null>(null), [namensentwurf, setName] = useState<Namensentwurf | null>(null);
  const [accepted, setAccepted] = useState<{ scope: string; stand: Stand } | null>(null);
  const [acceptedName, setAcceptedName] = useState<{ scope: string; einheit: Einheit } | null>(null);
  const task = useTask();
  const entwurf = geldentwurf?.scope === scope ? geldentwurf : null;
  const name = namensentwurf?.scope === scope ? namensentwurf : null;
  const current = accepted?.scope === scope && stand.data && accepted.stand.version > stand.data.version ? accepted.stand : stand.data;
  const currency = acceptedName?.scope === scope && einheit.loaded && acceptedName.einheit.version > (einheit.data?.version ?? 0) ? acceptedName.einheit : einheit.data;
  const dirty = !!entwurf && entwurf.betrag !== entwurf.baseline.betrag || !!name && name.name !== (name.baseline?.name ?? "");
  useEffect(() => { setEntwurf(null); setName(null); setAccepted(null); setAcceptedName(null); }, [scope]);
  useEffect(() => { onDirty?.(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty?.(false), [onDirty]);
  if (!actorId) return null;

  const betrag = entwurf?.betrag ?? current?.betrag ?? 0;
  const bezeichnung = currency?.name ?? "Geld";
  const changed = () => { setLocal(value => value + 1); onChanged?.(); };
  const speichern = () => void task.run(async () => {
    if (!entwurf || !current || !currency) return;
    const saved = await api<Stand>(apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}/geld`), { method: "PUT",
      body: { betrag, expectedVersion: entwurf.baseline.version } });
    if (activeScope.current !== scope) return;
    setAccepted({ scope, stand: saved }); setEntwurf(null); changed();
  });

  return <section className={kompakt ? "geldzaehler kompakt" : "geldzaehler"}>
    <h3><Coins size={17} /> {bezeichnung}</h3>
    <div className="geld-zeile">
      <label><span className="sr-only">Betrag in {bezeichnung}</span>
        <input type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} value={betrag} disabled={task.busy || !current || !currency}
          onChange={event => { if (current && currency) setEntwurf({ scope, baseline: entwurf?.baseline ?? current, betrag: Number.isFinite(event.target.valueAsNumber) ? Math.max(0, Math.trunc(event.target.valueAsNumber)) : 0 }); }} /></label>
      <Button disabled={task.busy || !current || !currency || entwurf === null || !Number.isSafeInteger(betrag)} onClick={speichern}>Übernehmen</Button>
    </div>
    {entwurf && current && current.version > entwurf.baseline.version ? <Notice>Der Geldstand wurde inzwischen geändert. Dein Entwurf bleibt erhalten. <Button disabled={task.busy} onClick={() => { if (window.confirm("Geldentwurf verwerfen und den aktuellen Stand übernehmen?")) { setEntwurf(null); task.setError(""); } }}>Aktuellen Geldstand übernehmen</Button></Notice> : null}
    {/* Der Name des Geldes gehoert der Runde. Ohne ihn stuende hier nur eine Zahl. */}
    {gm && !kompakt ? (name === null
      ? <Button variant="quiet" disabled={task.busy || !einheit.loaded} onClick={() => setName({ scope, name: currency?.name ?? "", baseline: currency })}><Pencil size={14} /> Währung benennen</Button>
      : <form className="geld-zeile" onSubmit={event => { event.preventDefault(); void task.run(async () => {
          const saved = await api<Einheit>(apiPath(campaignId, "/geld/einheit"), { method: "PUT", body: { name: name.name, expectedVersion: name.baseline?.version ?? 0 } });
          if (activeScope.current !== scope) return;
          setAcceptedName({ scope, einheit: saved }); setName(null); changed();
        }); }}>
        <label><span className="sr-only">Name der Währung</span>
          <input value={name.name} maxLength={40} required disabled={task.busy} placeholder="z. B. Silbertaler" onChange={event => setName({ ...name, name: event.target.value })} /></label>
        <Button type="submit" disabled={task.busy || !name.name.trim()}>Speichern</Button>
        <Button disabled={task.busy} onClick={() => setName(null)}>Abbrechen</Button>
        {(currency?.version ?? 0) > (name.baseline?.version ?? 0) ? <p className="field-help">Die Währung wurde inzwischen umbenannt. Brich den Entwurf ab, um den aktuellen Namen zu übernehmen.</p> : null}
      </form>) : null}
    {task.error || stand.error || einheit.error ? <Notice error>{task.error || stand.error || einheit.error}</Notice> : null}
    {einheit.loaded && !currency ? <p className="field-help">{gm ? "Benenne zuerst die Währung eurer Runde. Danach könnt ihr Geldstände eintragen." : "Die Spielleitung muss zuerst die Währung eurer Runde benennen. Danach kannst du deinen Geldstand eintragen."}</p> : null}
  </section>;
}
