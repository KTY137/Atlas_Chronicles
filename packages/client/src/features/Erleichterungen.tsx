// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { HandHeart, Trash2 } from "lucide-react";
import { Button, Loading, Notice } from "@chronicle/ui";
import type { RuleRuntime, Scalar } from "@chronicle/rules";
import type { Member } from "../api";
import { api, apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { RuleFields } from "./RuleFields";
import { defaults, useCommand, type ActionCard, type ActorSheet, type RulesState } from "./game-api";
import { t } from "../i18n";
import { useHostRules } from "./useHostRules";
import "./erleichterungen.css";

/**
 * Erleichterungen — die Spielleitung gewährt ein Zugeständnis, die Spielerin würfelt es selbst.
 *
 * Beide Hälften stehen hier, weil sie dieselbe Sache von zwei Seiten sind. Sie stehen bei den
 * **Aktionen** und nicht bei den Vollmachten: eine Vollmacht ist eine Tür für später, eine
 * Erleichterung gilt für diesen Moment am Tisch.
 *
 * Die Eingabefelder zeichnet `RuleFields` — dieselbe Komponente wie überall sonst. Ein eigenes
 * Formular für dieselben Felder wäre eine Doppelung, die beim nächsten Feldtyp auseinanderliefe.
 *
 * Aktionsnamen, Begründungen und Feldnamen stammen aus dem Regelpaket und vom Tisch; sie
 * bleiben, wie sie geschrieben wurden.
 */

export interface Erleichterung {
  id: string; actorId: string; gemeinteAktion: string; gewuerfelteAktion: string;
  eingaben: Record<string, Scalar>; grund: string;
  gewaehrtVon: string; gewaehrtAm: number;
  eingeloestRollId: string | null; eingeloestAm: number | null; widerrufenAm: number | null;
}

/** Was die Spielerin sieht: was ihr zugestanden wurde, und der Knopf, es selbst zu würfeln. */
export function OffeneErleichterungen({ campaignId, actorId, runtime, gm, revision, onChanged, onGewuerfelt }: {
  campaignId: string; actorId: string; runtime: RuleRuntime | null; gm: boolean; revision: number;
  onChanged: () => void; onGewuerfelt: (karte: ActionCard) => void;
}) {
  const offene = useResource<Erleichterung[]>(actorId ? apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}/erleichterungen`) : null, revision, 6000);
  const task = useTask(), command = useCommand();
  const actions = runtime?.actions ?? [], namen = new Map(actions.map(action => [action.id, action.name]));
  if (!actorId || !offene.data?.length) return null;
  return <section className="panel erleichterungen">
    <h2><HandHeart size={19} /> {t("Dir wurde entgegengekommen")}</h2>
    {task.error ? <Notice error>{task.error}</Notice> : null}
    <ul className="erleichterung-liste">{offene.data.map(zugestaendnis => <li key={zugestaendnis.id}>
      <article>
        <strong>{namen.get(zugestaendnis.gemeinteAktion) ?? zugestaendnis.gemeinteAktion}</strong>
        <p className="erleichterung-grund">„{zugestaendnis.grund}"</p>
        {/* Was abgesprochen ist, steht offen da — eine Erleichterung ist keine Ueberraschung. */}
        <dl className="erleichterung-werte">{Object.entries(zugestaendnis.eingaben).filter(([feld]) => actions.find(action => action.id === zugestaendnis.gewuerfelteAktion)?.inputs[feld]).map(([feld, wert]) =>
          <div key={feld}><dt>{actions.find(action => action.id === zugestaendnis.gewuerfelteAktion)?.inputs[feld]?.label ?? feld}</dt><dd>{String(wert)}</dd></div>)}</dl>
        <div className="button-row">
          <Button variant="primary" disabled={task.busy} onClick={() => void task.run(async () => {
            onGewuerfelt(await command<ActionCard>(apiPath(campaignId, "/rolls"), { actorId, actionId: zugestaendnis.gewuerfelteAktion, erleichterungId: zugestaendnis.id }));
            onChanged();
          })}>{t("Erleichterte Probe würfeln")}</Button>
          {gm ? <Button variant="danger" disabled={task.busy} onClick={() => void task.run(async () => {
            await api(apiPath(campaignId, `/erleichterungen/${encodeURIComponent(zugestaendnis.id)}`), { method: "DELETE" }); onChanged();
          })}><Trash2 size={15} /> {t("Zurücknehmen")}</Button> : null}
        </div>
      </article></li>)}</ul>
  </section>;
}

/** Was die Spielleitung tut: ein Zugeständnis benennen, festlegen und begründen. */
export function ErleichterungGewaehren({ campaignId, rules, roster, revision, onChanged }: {
  campaignId: string; rules: RulesState; roster: Member[]; revision: number; onChanged: () => void;
}) {
  const [actorId, setActorId] = useState(""), [gemeint, setGemeint] = useState(""), [grund, setGrund] = useState("");
  const [gewuerfelt, setGewuerfelt] = useState(""), [eingaben, setEingaben] = useState<Record<string, Scalar>>({});
  const sheet = useResource<ActorSheet>(actorId ? apiPath(campaignId, `/actors/${encodeURIComponent(actorId)}/sheet`) : null, revision);
  const selectedSheet = sheet.data?.actorId === actorId ? sheet.data : null;
  const pin = selectedSheet ? { id: selectedSheet.packageId, version: selectedSheet.packageVersion } : null;
  const host = useHostRules(campaignId, pin, selectedSheet?.fields ?? null), runtime = host.manifest;
  const alle = runtime?.actions ?? [], traegt = alle.filter(action => Object.keys(action.inputs).length > 0);
  const aktion = traegt.find(action => action.id === gewuerfelt) ?? traegt.find(action => action.id === "manual_ruling") ?? traegt[0];
  const alleOffenen = useResource<Erleichterung[]>(apiPath(campaignId, "/erleichterungen"), revision, 8000);
  const task = useTask(), figuren = roster.filter(member => member.actorId);

  if (actorId && !runtime && !host.error) return <section className="panel"><h2><HandHeart size={19} /> {t("Eine Probe erleichtern")}</h2><Loading /></section>;
  if (actorId && !traegt.length) return <section className="panel"><h2><HandHeart size={19} /> {t("Eine Probe erleichtern")}</h2>
    {host.error ? <Notice error>{host.error}</Notice> : <p className="field-help">{t("Dieses Regelwerk kennt keine Aktion mit festlegbaren Eingaben. Eine Erleichterung braucht eine solche Absprache-Aktion — sonst gäbe es nichts, was die Spielleitung vereinbaren könnte.")}</p>}</section>;

  return <form className="panel" onSubmit={event => { event.preventDefault(); if (!aktion || !host.canSave) return; void task.run(async () => {
    await api(apiPath(campaignId, "/erleichterungen"), { method: "POST", body: {
      actorId, gemeinteAktion: gemeint || aktion.id, gewuerfelteAktion: aktion.id,
      eingaben: { ...defaults(aktion.inputs), ...eingaben }, grund,
    } }); setGrund(""); setEingaben({}); onChanged();
  }); }}>
    <h2><HandHeart size={19} /> {t("Eine Probe erleichtern")}</h2>
    <p className="field-help">{t("Du legst die Absprache fest — gewürfelt wird sie von der Spielerin selbst. Der Beleg zeigt danach, dass du sie zugestanden hast.")}</p>
    {host.error || sheet.error ? <Notice error>{host.error || sheet.error}</Notice> : null}
    <div className="rule-fields">
      <label>{t("Figur")}<select required value={actorId} onChange={e => { setActorId(e.target.value); setGewuerfelt(""); setGemeint(""); setEingaben({}); }}>
        <option value="">{t("Figur wählen")}</option>
        {figuren.map(m => <option key={m.actorId} value={m.actorId!}>{m.displayName}</option>)}</select></label>
      <label>{t("Gemeinte Probe")}<select value={gemeint} onChange={e => setGemeint(e.target.value)}>
        <option value="">{t("Wie die gewürfelte")}</option>
        {alle.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    </div>
    <label>{t("Wird gewürfelt als")}<select value={aktion?.id ?? ""} onChange={e => { setGewuerfelt(e.target.value); setEingaben({}); }}>
      {traegt.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    {aktion ? <><p className="field-help">{aktion.disclosure}</p>
      <RuleFields fields={aktion.inputs} values={{ ...defaults(aktion.inputs), ...eingaben }} onChange={next => setEingaben(current => ({ ...current, ...next }))} disabled={task.busy} /></> : null}
    <label>{t("Begründung")}<input required maxLength={500} value={grund} onChange={e => setGrund(e.target.value)}
      placeholder={t("z. B. Du hast das Seil vorher gesichert.")} /></label>
    {task.error ? <Notice error>{task.error}</Notice> : null}
    <Button type="submit" variant="primary" disabled={task.busy || !actorId || !grund.trim() || !aktion || !host.canSave}>{t("Erleichterung gewähren")}</Button>

    {alleOffenen.loading && !alleOffenen.data ? <Loading /> : alleOffenen.data?.length
      ? <details className="erleichterung-offen"><summary>{t("Offen: {n}", { n: alleOffenen.data.length })}</summary>
        <ul>{alleOffenen.data.map(z => <li key={z.id}>
          {figuren.find(m => m.actorId === z.actorId)?.displayName ?? t("Figur")} · {alle.find(a => a.id === z.gemeinteAktion)?.name ?? z.gemeinteAktion} — „{z.grund}"</li>)}</ul>
      </details> : null}
  </form>;
}
