// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo, useState } from "react";
import type { ActorCard } from "@chronicle/protocol";
import { Trash2 } from "lucide-react";
import { Button, Notice, confirmAction } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { t } from "../i18n";
import { useCommand } from "./game-api";

interface ActorTemplateCard {
  id: string;
  version: number;
  definition: { name: string };
}

/**
 * Der harte Löschpfad steht bewusst getrennt von den normalen Bearbeitungsformularen. Archivieren
 * bleibt die tägliche Aktion; hier landet nur, wer ausdrücklich etwas unwiderruflich entfernen will.
 */
export function ActorDeletionPanel({ campaignId, actors, revision, onChanged }: {
  campaignId: string; actors: readonly ActorCard[]; revision: number; onChanged(): void;
}) {
  const templates = useResource<ActorTemplateCard[]>(apiPath(campaignId, "/actor-templates"), revision);
  const [actorId, setActorId] = useState(""), [templateId, setTemplateId] = useState(""), [reason, setReason] = useState("");
  const task = useTask(), command = useCommand();
  const actor = useMemo(() => actors.find(item => item.id === actorId), [actors, actorId]);
  const template = useMemo(() => templates.data?.find(item => item.id === templateId), [templates.data, templateId]);
  const begruendet = reason.trim().length > 0;
  const done = () => { setActorId(""); setTemplateId(""); setReason(""); onChanged(); };

  return <details className="panel actor-optional">
    <summary>{t("Charakterbögen und Vorlagen endgültig löschen")}</summary>
    <p className="field-help">{t("Archivieren ist der normale Weg. Endgültiges Löschen ist nur für unbenutzte Figuren oder Vorlagen möglich; sobald Spielhistorie daran hängt, blockiert der Server den Vorgang.")}</p>
    {task.error ? <Notice error>{task.error}</Notice> : null}
    {templates.error ? <Notice error>{templates.error}</Notice> : null}
    <label>{t("Grund für das endgültige Löschen")}<input value={reason} maxLength={500} onChange={event => setReason(event.target.value)} placeholder={t("Zum Beispiel: versehentlich doppelt angelegt")} /></label>
    <div className="rule-fields">
      <label>{t("Figur / Charakterbogen")}<select value={actorId} onChange={event => setActorId(event.target.value)}>
        <option value="">{t("Figur wählen")}</option>{actors.filter(item => typeof item.version === "number").map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
      </select></label>
      <Button variant="danger" disabled={task.busy || !begruendet || !actor || typeof actor.version !== "number"} onClick={async () => {
        if (!actor || typeof actor.version !== "number") return;
        const ja = await confirmAction({ title: t("Figur endgültig löschen?"), message: t("„{name}“ samt Charakterbogen endgültig löschen? Das lässt sich nicht rückgängig machen.", { name: actor.name }), confirmLabel: t("Endgültig löschen"), danger: true });
        if (!ja) return;
        void task.run(async () => { await command(apiPath(campaignId, `/actors/${actor.id}`), { expectedVersion: actor.version, reason: reason.trim() }, "DELETE"); done(); });
      }}><Trash2 size={15} />{t("Figur samt Charakterbogen endgültig löschen")}</Button>

      <label>{t("Figurvorlage")}<select value={templateId} onChange={event => setTemplateId(event.target.value)} disabled={templates.loading}>
        <option value="">{t("Vorlage wählen")}</option>{(templates.data ?? []).map(item => <option value={item.id} key={item.id}>{item.definition.name}</option>)}
      </select></label>
      <Button variant="danger" disabled={task.busy || !begruendet || !template} onClick={async () => {
        if (!template) return;
        const ja = await confirmAction({ title: t("Figurvorlage endgültig löschen?"), message: t("„{name}“ endgültig löschen? Die Vorlage und alle ihre Fassungen verschwinden und lassen sich nicht zurückholen.", { name: template.definition.name }), confirmLabel: t("Endgültig löschen"), danger: true });
        if (!ja) return;
        void task.run(async () => { await command(apiPath(campaignId, `/actor-templates/${template.id}`), { expectedVersion: template.version, reason: reason.trim() }, "DELETE"); done(); });
      }}><Trash2 size={15} />{t("Figurvorlage endgültig löschen")}</Button>
    </div>
  </details>;
}
