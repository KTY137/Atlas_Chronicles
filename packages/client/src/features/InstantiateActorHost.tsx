// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useState } from "react";
import type { ActorTemplateData, TemplateCard } from "@chronicle/protocol";
import { Button, Loading, Notice } from "@chronicle/ui";
import { apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { t } from "../i18n";
import { useCommand, type RulesState } from "./game-api";
import { useHostRules } from "./useHostRules";

const FIGURENART_LABEL: Record<ActorTemplateData["kind"], string> = {
  player_character: "Spielerfigur", npc: "Nebenfigur", creature: "Kreatur", companion: "Begleitung", vehicle: "Fahrzeug",
};

/** Instantiate an immutable template with the rule package pinned into that revision. */
export function InstantiateActor({ campaignId, rules: _rules, initialTemplateId = "", revision, onChanged, selectRef, onDirty, onCreateTemplate }: {
  campaignId: string; rules?: RulesState; initialTemplateId?: string; revision: number; onChanged: () => void;
  selectRef?: { current: HTMLSelectElement | null }; onDirty?: (dirty: boolean) => void; onCreateTemplate?: () => void;
}) {
  const templates = useResource<TemplateCard<ActorTemplateData>[]>(apiPath(campaignId, "/actor-templates"), revision);
  const [selected, setSelected] = useState(initialTemplateId), [name, setName] = useState(""), [created, setCreated] = useState("");
  const task = useTask(), command = useCommand();
  useEffect(() => { onDirty?.(!!name); }, [name, onDirty]);
  useEffect(() => () => onDirty?.(false), [onDirty]);
  const template = templates.data?.find(row => row.id === selected) ?? null;
  const runtime = useHostRules(campaignId, template?.definition.package ?? { id: "none", version: "none" }, template?.definition.fields ?? null);
  const fields = runtime.manifest ? Object.entries(runtime.manifest.fields).slice(0, 6) : [];
  return <form className="panel creation-instantiate" onSubmit={event => { event.preventDefault(); if (!template || !runtime.canSave) return; void task.run(async () => {
    await command(apiPath(campaignId, "/actors/instantiate"), { templateId: template.id, templateRevision: template.revision, ...(name.trim() ? { name: name.trim() } : {}) });
    setCreated(name.trim() || template.definition.name); setName(""); onChanged();
  }); }}><fieldset className="actor-command-fields" disabled={task.busy}><h2>{t("Figur aus Vorlage erschaffen")}</h2>
    <p className="field-help">{t("Die Vorlage behält ihr eigenes Regelpaket, auch wenn die Kampagne inzwischen ein anderes Standardregelwerk verwendet.")}</p>
    {templates.loading ? <Loading /> : !templates.data?.length && !templates.error ? <div className="actor-empty-hint"><p>{t("Du brauchst zuerst eine Figurvorlage mit Name, Art und Werten.")}</p>{onCreateTemplate ? <Button onClick={onCreateTemplate}>{t("Figurvorlage anlegen")}</Button> : null}</div> : null}
    <div className="creation-identity-fields"><label>{t("Figurvorlage")}<select ref={selectRef} required value={selected} onChange={event => { setSelected(event.target.value); setCreated(""); }}><option value="">{t("Vorlage wählen")}</option>
      {templates.data?.map(row => <option key={row.id} value={row.id}>{t("{angabe} · Revision {revision}", { angabe: row.definition.name, revision: row.revision })}</option>)}</select></label>
      <label>{t("Name dieser Figur")}<input maxLength={160} value={name} placeholder={template?.definition.name ?? t("Name aus der Vorlage")} onChange={event => setName(event.target.value)} /></label></div>
    {template ? <section className="creation-instance-preview" aria-label={t("Vorschau der neuen Figur")}><small>{runtime.manifest?.name ?? template.definition.package.id}</small><h3>{name.trim() || template.definition.name}</h3>
      <p className="field-help">{t(FIGURENART_LABEL[template.definition.kind])} · {t("Vorlage, Revision {revision}", { revision: template.revision })}</p>
      {runtime.pending ? <Loading /> : null}{runtime.error ? <Notice error>{runtime.error}</Notice> : null}
      {runtime.preview?.valid ? <dl className="creation-stat-preview">{fields.map(([key, field]) => <div key={key}><dt>{field.label}</dt><dd>{typeof runtime.preview!.fields?.[key] === "boolean" ? runtime.preview!.fields?.[key] ? t("Ja") : t("Nein") : String(runtime.preview!.fields?.[key] ?? "")}</dd></div>)}</dl> : null}
      <p className="field-help">{t("Name, Anfangswerte und Besitz werden für diese Figur übernommen. Danach entwickelt sich ihr Bogen unabhängig von der Vorlage weiter.")}</p>
    </section> : null}
    {created ? <Notice>{t("„{name}“ wurde erschaffen. Du findest die Figur und ihren Bogen am Tisch.", { name: created })}</Notice> : null}
    {task.error || templates.error ? <Notice error>{task.error || templates.error}</Notice> : null}
    <div className="creation-save-actions"><Button type="submit" variant="primary" disabled={task.busy || !template || !runtime.canSave}>{task.busy ? t("Figur wird erschaffen …") : t("Figur erschaffen")}</Button></div>
  </fieldset></form>;
}
