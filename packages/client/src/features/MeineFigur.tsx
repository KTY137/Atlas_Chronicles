// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useEffect, useState } from "react";
import type { ActorCard } from "@chronicle/protocol";
import { RefreshCw } from "lucide-react";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { apiPath, type Campaign } from "../api";
import { useResource } from "../hooks";
import { CharacterSheet } from "./CharacterSheet";
import { Inventory } from "./ActorWorkbench";
import type { RulesState } from "./game-api";
import "./gameplay.css";

/**
 * `Ich` — die eigene Figur, ohne Umweg über den Spielabend.
 *
 * Bogen und Inventar sind dieselben Komponenten, die auch am Tisch laufen; diese Fläche
 * erfindet keine zweite Fassung und keine zweite Route. Sie beantwortet nur die Frage, die
 * unter der Woche zuerst gestellt wird und für die der Tisch der falsche Ort war:
 * *Was habe ich, und was kann ich?*
 */
export function MeineFigur({ campaign, onDirty }: { campaign: Campaign; onDirty: (value: boolean) => void }) {
  const [revision, setRevision] = useState(0), [chosen, setChosen] = useState<string | null>(null);
  const rules = useResource<RulesState>(apiPath(campaign.id, "/rules"), revision);
  const actors = useResource<ActorCard[]>(apiPath(campaign.id, "/actors"), revision);
  const meine = actors.data?.filter(actor => actor.canControl) ?? [];
  // Die erste Wahl wird einmal festgehalten. Eine spätere Freigabe darf keinen offenen Entwurf umhängen.
  useEffect(() => { if (chosen === null && actors.data) setChosen(meine[0]?.id ?? ""); }, [chosen, actors.data, meine]);
  const actorId = meine.find(actor => actor.id === chosen)?.id ?? "";
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const gm = campaign.role === "leitung";
  return <section className="page-content table-page"><div className="page-heading"><div>
      <p className="eyebrow">Was du hältst und was du kannst</p><h1>Deine Figur</h1>
      <p className="muted">Bogen und Inventar — dieselben, die am Tisch gelten.</p>
    </div><Button aria-label="Figur aktualisieren" onClick={refresh}><RefreshCw size={16} /></Button></div>
    {rules.error || actors.error ? <Notice error>{rules.error || actors.error}</Notice> : null}
    {meine.length > 1 ? <div className="table-controls"><label className="actor-picker">Deine Figur
      <select value={actorId} onChange={event => setChosen(event.target.value)}>
        {meine.map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
      </select></label></div> : null}
    {rules.loading || actors.loading ? <Loading />
      : !actorId ? <EmptyState title="Noch führst du keine Figur.">Sobald deine Spielleitung dir eine Figur anvertraut, findest du hier ihren Bogen und alles, was sie trägt.</EmptyState>
      : rules.data ? <>
        <CharacterSheet key={actorId} campaignId={campaign.id} actorId={actorId} rules={rules.data} gm={gm} liveRevision={revision} onDirty={onDirty} onChanged={refresh} />
        <Inventory campaignId={campaign.id} actorId={actorId} actors={actors.data ?? []} gm={false} revision={revision} onChanged={refresh} onDirty={onDirty} />
      </> : null}
  </section>;
}
