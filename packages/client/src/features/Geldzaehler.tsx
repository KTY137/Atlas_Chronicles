// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useState } from "react";
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

export function Geldzaehler({ campaignId, actorId, gm, revision, kompakt = false, onChanged }: {
  campaignId: string; actorId: string; gm: boolean; revision: number; kompakt?: boolean; onChanged?: () => void;
}) {
  const einheit = useResource<Einheit | null>(apiPath(campaignId, "/geld/einheit"), revision);
  const stand = useResource<Stand>(actorId ? apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}/geld`) : null, revision);
  const [entwurf, setEntwurf] = useState<number | null>(null), [name, setName] = useState<string | null>(null);
  const task = useTask();
  // Kommt ein neuer Stand vom Server, verwirft ein unangetasteter Entwurf sich selbst.
  useEffect(() => { setEntwurf(null); }, [stand.data?.version]);
  if (!actorId) return null;

  const betrag = entwurf ?? stand.data?.betrag ?? 0;
  const bezeichnung = einheit.data?.name ?? "Geld";
  const speichern = () => void task.run(async () => {
    await api(apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}/geld`), { method: "PUT",
      body: { betrag, expectedVersion: stand.data?.version ?? 0 } });
    setEntwurf(null); onChanged?.();
  });

  return <section className={kompakt ? "geldzaehler kompakt" : "geldzaehler"}>
    <h3><Coins size={17} /> {bezeichnung}</h3>
    <div className="geld-zeile">
      <label><span className="sr-only">Betrag in {bezeichnung}</span>
        <input type="number" min={0} step={1} value={betrag} disabled={task.busy}
          onChange={event => setEntwurf(Number.isFinite(event.target.valueAsNumber) ? Math.max(0, Math.trunc(event.target.valueAsNumber)) : 0)} /></label>
      <Button disabled={task.busy || entwurf === null} onClick={speichern}>Übernehmen</Button>
    </div>
    {/* Der Name des Geldes gehoert der Runde. Ohne ihn stuende hier nur eine Zahl. */}
    {gm && !kompakt ? (name === null
      ? <Button variant="quiet" onClick={() => setName(einheit.data?.name ?? "")}><Pencil size={14} /> Währung benennen</Button>
      : <form className="geld-zeile" onSubmit={event => { event.preventDefault(); void task.run(async () => {
          await api(apiPath(campaignId, "/geld/einheit"), { method: "PUT", body: { name, expectedVersion: einheit.data?.version ?? 0 } });
          setName(null); onChanged?.();
        }); }}>
        <label><span className="sr-only">Name der Währung</span>
          <input value={name} maxLength={40} required placeholder="z. B. Silbertaler" onChange={event => setName(event.target.value)} /></label>
        <Button type="submit" disabled={task.busy || !name.trim()}>Speichern</Button>
        <Button onClick={() => setName(null)}>Abbrechen</Button>
      </form>) : null}
    {task.error || stand.error || einheit.error ? <Notice error>{task.error || stand.error || einheit.error}</Notice> : null}
    {!kompakt && !einheit.data ? <p className="field-help">Diese Runde hat ihr Geld noch nicht benannt; bis dahin steht hier schlicht „Geld".</p> : null}
  </section>;
}
