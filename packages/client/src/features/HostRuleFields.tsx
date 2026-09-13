// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import type { AnyRulePackage, RuleRuntime, RuleRuntimePreview, Scalar } from "@chronicle/rules";
import { Button, Loading, Notice } from "@chronicle/ui";
import { t } from "../i18n";
import { RuleFields } from "./RuleFields";
import { displayRuleRuntime } from "./rule-runtime-display";
import { forgetRuleAbility, ruleIdList } from "./rule-runtime-state";
import type { HostRuleEditorState } from "./useHostRules";

export function HostRuleFields({ state, source, onChange, disabled = false }: {
  state: HostRuleEditorState; source?: AnyRulePackage | undefined; onChange: (values: Record<string, Scalar>) => void; disabled?: boolean;
}) {
  const display = state.manifest ? displayRuleRuntime(state.manifest, state.error ? null : state.preview, source) : null;
  return <>
    {state.error ? <Notice error>{state.error} <Button onClick={state.reload}>{t("Erneut laden")}</Button></Notice> : null}
    {state.manifest && state.values ? <RuntimeFields key={`${state.manifest.pin.id}@${state.manifest.pin.version}:${state.manifest.contentHash}`}
      runtime={display!.runtime} values={state.values} preview={display!.preview} onChange={onChange} disabled={disabled} /> : state.pending ? <Loading /> : null}
    {state.pending ? <p className="field-help" role="status">{t("Der Host prüft die aktuellen Bogenwerte …")}</p> : null}
    {state.preview && !state.preview.valid ? <Notice error>{state.preview.errors.join(" ")}</Notice> : null}
  </>;
}
function RuntimeFields({ runtime, values, preview, onChange, disabled }: {
  runtime: RuleRuntime; values: Readonly<Record<string, Scalar>>; preview: RuleRuntimePreview | null;
  onChange: (values: Record<string, Scalar>) => void; disabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const special = new Set([runtime.abilities.length ? runtime.abilityField : null, runtime.conditions.length ? runtime.conditionField : null]);
  const learned = ruleIdList(runtime.abilityField ? values[runtime.abilityField] : undefined);
  const active = ruleIdList(runtime.conditionField ? values[runtime.conditionField] : undefined);
  const overview = preview?.valid ? preview.abilities : null;
  const learnable = new Set(overview?.learnable ?? []);
  const abilities = runtime.abilities.filter(ability => !learned.includes(ability.id) && `${ability.name} ${ability.group} ${ability.text}`.toLowerCase().includes(search.trim().toLowerCase()));
  const setList = (field: string, ids: readonly string[]) => onChange({ ...values, [field]: ids.join(", ") });
  return <>
    {runtime.sections.map(section => {
      const ids = section.fields.filter(id => !special.has(id));
      return ids.length ? <fieldset className="sheet-section" key={section.id}><legend>{section.label}</legend>
        <RuleFields fields={Object.fromEntries(ids.map(id => [id, runtime.fields[id]!]))} values={values} onChange={onChange} disabled={disabled} />
      </fieldset> : null;
    })}
    {preview?.valid && preview.vitals.length ? <section aria-label={t("Vitalwerte")}>{preview.vitals.map(vital => <div key={vital.id}>
      <label>{vital.label} · {vital.value} / {vital.maximum} <meter min={0} max={Math.max(1, vital.maximum)} value={Math.max(0, Math.min(vital.maximum, vital.value))} /></label>
    </div>)}</section> : null}
    {preview?.valid && runtime.computed.length ? <section className="rule-computed"><h3>{t("Berechnete Werte")}</h3><dl className="rf-value-list">
      {runtime.computed.map(field => <div key={field.id}><dt>{field.label}</dt><dd>{preview.computed[field.id]}</dd></div>)}
    </dl></section> : null}
    {runtime.abilityField && runtime.abilities.length ? <section className="faehigkeiten-bogen" aria-label={t("Fähigkeiten und Zustände")}>
      <h3>{t("Fähigkeiten")}</h3>
      {overview ? <p role="status">{overview.budget === null ? t("Ausgegeben: {punkte} Punkte", { punkte: overview.spent }) : t("Ausgegeben: {punkte} von {budget} Punkten", { punkte: overview.spent, budget: overview.budget })}</p> : null}
      <ul className="faehigkeiten-liste">{learned.map(id => <li key={id}><span>{runtime.abilities.find(ability => ability.id === id)?.name ?? id}</span>
        <Button disabled={disabled} onClick={() => setList(runtime.abilityField!, forgetRuleAbility(runtime, learned, id))}>{t("Verlernen")}</Button></li>)}</ul>
      <details><summary>{t("Neue Fähigkeit lernen")}</summary>
        <label>{t("Fähigkeit suchen")}<input type="search" value={search} onChange={event => setSearch(event.target.value)} disabled={disabled} /></label>
        <ul className="faehigkeiten-liste">{abilities.slice(0, 40).map(ability => <li key={ability.id}><div><strong>{ability.name}</strong><small> · {ability.group} · {ability.price}</small><p>{ability.text}</p></div>
          <Button disabled={disabled || !learnable.has(ability.id)} onClick={() => { if (learnable.has(ability.id)) setList(runtime.abilityField!, [...learned, ability.id]); }}>{t("Lernen")}</Button></li>)}</ul>
        {abilities.length > 40 ? <p>{t("{n} weitere Treffer. Grenze die Suche ein.", { n: abilities.length - 40 })}</p> : !abilities.length ? <p>{t("Keine passende Fähigkeit.")}</p> : null}
      </details>
    </section> : null}
    {runtime.conditionField && runtime.conditions.length ? <section><h3>{t("Zustände")}</h3>{runtime.conditions.map(condition => <label key={condition.id} className="check-label">
      <input type="checkbox" checked={active.includes(condition.id)} disabled={disabled} onChange={event => setList(runtime.conditionField!, event.target.checked ? [...active, condition.id] : active.filter(id => id !== condition.id))} />
      <span>{condition.name} <small>{condition.text}</small></span>
    </label>)}</section> : null}
    {/* Invalid imported identifier lists stay repairable, including unknown IDs. */}
    {[...special].some(Boolean) ? <details><summary>{t("Kennungslisten korrigieren")}</summary>
      <RuleFields fields={Object.fromEntries([...special].filter((id): id is string => id !== null).map(id => [id, runtime.fields[id]!]))} values={values} onChange={onChange} disabled={disabled} />
    </details> : null}
    <details><summary>{t("Proben dieses Regelpakets")}</summary><ul>{runtime.actions.map(action => <li key={action.id}>{action.name}</li>)}</ul></details>
  </>;
}
