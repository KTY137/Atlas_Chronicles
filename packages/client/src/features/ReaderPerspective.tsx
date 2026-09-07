// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import type { ActorCard, ReaderPerspective as Perspective } from "@chronicle/protocol";
import { Button, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { useCommand } from "./game-api";
import "./actors.css";

export function ReaderPerspective({ campaignId, gm, current, revision, guard, onChanged }: {
  campaignId: string; gm: boolean; current: Perspective | null; revision: number;
  guard: () => boolean; onChanged: () => void;
}) {
  const [refresh, setRefresh] = useState(0), task = useTask(), command = useCommand();
  const actors = useResource<ActorCard[]>(apiPath(campaignId, "/actors"), revision + refresh);
  const choices = actors.data?.filter(a => a.canReadAs) ?? [];
  if (!current || (!choices.length && !current.actorId)) return actors.error ? <Notice error>{actors.error}</Notice> : null;
  return <div className="reader-perspective"><label>{gm ? "Brieffigur" : "Wissensblick"}<select aria-label={gm ? "Brieffigur" : "Wissensblick"}
    value={current.actorId ?? ""} disabled={task.busy} onChange={event => {
      const actorId = event.target.value || null;
      if (guard()) void task.run(async () => { await command(apiPath(campaignId, "/reader-perspective"), { actorId, expectedVersion: current.version }, "PUT"); onChanged(); });
    }}><option value="">Keine Figur gewählt</option>{choices.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <p className="field-help">{gm ? "Dein Buch zeigt weiterhin die Sicht der Spielleitung." : "Chronik, Atlas und empfangene Briefe folgen dieser Figur."}</p>
    {task.error || actors.error ? <Notice error>{task.error || actors.error}<Button onClick={() => { setRefresh(n => n + 1); onChanged(); }}>Auswahl aktualisieren</Button></Notice> : null}
  </div>;
}
