// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import type { ActorCard, TacticalView as Board } from "@chronicle/protocol";
import { Map, UserRound, BookOpen, Backpack } from "lucide-react";
import { Button } from "@chronicle/ui";
import type { Member } from "../api";
import { t } from "../i18n";
import { LiveBoard } from "./TacticalView";
import { TableDice } from "./TableDice";
import { tableParticipants } from "./tabletop-model";
import "./tabletop.css";

export function TableSurface({ campaignId, gm, actors, roster, actorId, revision, onChanged, onDirty, onOpenEntry, onOpenInventory, onOpenMap }: {
  campaignId: string; gm: boolean; actors: ActorCard[]; roster: Member[]; actorId: string; revision: number;
  onChanged: () => void; onDirty: (value: boolean) => void; onOpenEntry: (id: string) => void; onOpenInventory: (id: string) => void; onOpenMap: () => void;
}) {
  const [board, setBoard] = useState<Board | null>(null), [focusActor, setFocusActor] = useState<{ id: string; request: number } | undefined>();
  const participants = tableParticipants(actors, roster, board?.tokens ?? []);
  return <div className="tabletop-room"><div className="tabletop-furniture">
    <div className="tabletop-rail"><span className="eyebrow">{t("Eure Runde am Tisch")}</span><Button onClick={onOpenMap}><Map size={15} /> {gm ? t("Karte vorbereiten") : t("Szenenkarte")}</Button></div>
    <section className="tabletop-seats" aria-label={t("Figuren am Tisch")}>
      {participants.length ? participants.map(participant => <article key={participant.id} className={`tabletop-seat${participant.id === actorId ? " is-acting" : ""}`}>
        <button type="button" className="tabletop-miniature" aria-label={participant.onMap ? t("{figur} auf der Karte zeigen", { figur: participant.name }) : participant.canControl ? t("Inventar von {figur} öffnen", { figur: participant.name }) : participant.name} disabled={!participant.onMap && !participant.canControl}
          onClick={() => participant.onMap ? setFocusActor(previous => ({ id: participant.id, request: (previous?.request ?? 0) + 1 })) : onOpenInventory(participant.id)}>
          <span className="tabletop-miniature-figure" aria-hidden="true"><UserRound size={38} strokeWidth={1.5} /></span><span className="tabletop-miniature-base" aria-hidden="true" /><strong>{participant.name}</strong>
        </button><span className="field-help">{participant.onMap ? t("Auf der Karte") : participant.id === actorId ? t("Handelnde Figur") : t("Am Tisch")}</span>
        <div className="tabletop-seat-actions">{participant.canControl ? <Button aria-label={t("Inventar von {figur} öffnen", { figur: participant.name })} onClick={() => onOpenInventory(participant.id)}><Backpack size={15} /></Button> : null}{participant.loreEntryId ? <Button aria-label={t("Artikel von {figur} öffnen", { figur: participant.name })} onClick={() => onOpenEntry(participant.loreEntryId!)}><BookOpen size={15} /></Button> : null}</div>
      </article>) : <p className="muted">{t("Sobald Figuren zur Runde gehören oder auf der Karte sichtbar sind, nehmen sie hier Platz.")}</p>}
    </section>
    <div className="tabletop-felt"><div className="tabletop-map"><LiveBoard campaignId={campaignId} gm={gm} revision={revision} onChanged={onChanged} onDirty={onDirty} onOpenEntry={onOpenEntry} compact onBoard={setBoard} focusActor={focusActor} /></div>
      <aside className="tabletop-dice-space"><TableDice key={actorId} campaignId={campaignId} actorId={actorId} participants={participants} revision={revision} onChanged={onChanged} /></aside>
    </div>
  </div></div>;
}
