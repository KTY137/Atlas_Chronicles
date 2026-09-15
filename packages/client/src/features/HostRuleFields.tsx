// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState, type ReactNode } from "react";
import type { AnyRulePackage, RuleRuntime, RuleRuntimePreview, RuleRuntimeSection, Scalar } from "@chronicle/rules";
import { Button, Loading, Notice } from "@chronicle/ui";
import { t } from "../i18n";
import { RuleFields } from "./RuleFields";
import { RulePresentationView } from "./RulePresentationView";
import { displayRuleRuntime } from "./rule-runtime-display";
import { forgetRuleAbility, ruleIdList } from "./rule-runtime-state";
import type { HostRuleEditorState } from "./useHostRules";
import "./rule-categories.css";

type RuntimeAbility = RuleRuntime["abilities"][number];
interface AbilityGroupNode { label: string; path: string; rows: RuntimeAbility[]; children: Map<string, AbilityGroupNode> }

/** Legacy v1/v2 ability grouping. Presentation-v3 packages use RulePresentationView below. */
function abilityGroupTree(rows: readonly RuntimeAbility[]): AbilityGroupNode[] {
  const root = new Map<string, AbilityGroupNode>();
  for (const ability of rows) {
    const parts = ability.group.split("/").map(part => part.trim()).filter(Boolean);
    if (!parts.length) parts.push(t("Weitere Fähigkeiten"));
    let level = root, path = ""; let node: AbilityGroupNode | undefined;
    for (const part of parts) {
      path = path ? `${path} / ${part}` : part;
      node = level.get(part);
      if (!node) { node = { label: part, path, rows: [], children: new Map() }; level.set(part, node); }
      level = node.children;
    }
    node!.rows.push(ability);
  }
  return [...root.values()];
}
function AbilityGroups({ rows, renderRow }: { rows: readonly RuntimeAbility[]; renderRow(ability: RuntimeAbility): ReactNode }) {
  const render = (node: AbilityGroupNode, depth: number): ReactNode => <section className="rule-ability-group" data-depth={Math.min(depth, 8)} key={node.path}>
    <h4>{node.label}</h4>
    {node.rows.length ? <ul className="faehigkeiten-liste">{node.rows.map(renderRow)}</ul> : null}
    {node.children.size ? <div className="rule-ability-children">{[...node.children.values()].map(child => render(child, depth + 1))}</div> : null}
  </section>;
  return <>{abilityGroupTree(rows).map(node => render(node, 0))}</>;
}

export function HostRuleFields({ state, source, onChange, disabled = false }: {
  state: HostRuleEditorState; source?: AnyRulePackage | undefined; onChange: (values: Record<string, Scalar>) => void; disabled?: boolean;
}) {
  const display = state.manifest ? displayRuleRuntime(state.manifest, state.error ? null : state.preview, source) : null;
  return <>
    {state.error ? <Notice error>{state.error} <Button onClick={state.reload}>{t("Erneut laden")}</Button></Notice> : null}
    {state.manifest && state.values ? <RuntimeFields key={`${state.manifest.pin.id}@${state.manifest.pin.version}:${state.manifest.contentHash}`}
      runtime={display!.runtime} values={state.values} preview={display!.preview} onChange={onChange} disabled={disabled} /> : state.pending ? <Loading /> : null}
    {state.pending ? <p className="field-help" role="status">{t("Das Regelwerk prüft die aktuellen Bogenwerte …")}</p> : null}
    {state.preview && !state.preview.valid ? <Notice error>{state.preview.errors.join(" ")}</Notice> : null}
  </>;
}
function RuntimeFields({ runtime, values, preview, onChange, disabled }: {
  runtime: RuleRuntime; values: Readonly<Record<string, Scalar>>; preview: RuleRuntimePreview | null;
  onChange: (values: Record<string, Scalar>) => void; disabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const special = new Set([runtime.abilities.length ? runtime.abilityField : null, runtime.conditions.length ? runtime.conditionField : null]);
  if (runtime.presentation) return <>
    <RulePresentationView runtime={runtime} preview={preview} values={values} onChange={onChange} disabled={disabled} />
    {/* Raw identifier storage remains reachable for repairing malformed legacy/imported lists. */}
    {[...special].some(Boolean) ? <details><summary>{t("Kennungslisten korrigieren")}</summary>
      <RuleFields fields={Object.fromEntries([...special].filter((id): id is string => id !== null).map(id => [id, runtime.fields[id]!]))} values={values} onChange={onChange} disabled={disabled} />
    </details> : null}
  </>;

  const learned = ruleIdList(runtime.abilityField ? values[runtime.abilityField] : undefined);
  const active = ruleIdList(runtime.conditionField ? values[runtime.conditionField] : undefined);
  const overview = preview?.valid ? preview.abilities : null;
  const learnable = new Set(overview?.learnable ?? []);
  const abilities = runtime.abilities.filter(ability => !learned.includes(ability.id) && `${ability.name} ${ability.group} ${ability.text}`.toLowerCase().includes(search.trim().toLowerCase()));
  const setList = (field: string, ids: readonly string[]) => onChange({ ...values, [field]: ids.join(", ") });
  const children = new Map<string | null, RuleRuntimeSection[]>();
  for (const section of runtime.sections) {
    const rows = children.get(section.parent) ?? [];
    rows.push(section); children.set(section.parent, rows);
  }
  const renderSection = (section: RuleRuntimeSection, depth: number): ReactNode => {
    const ids = section.fields.filter(id => !special.has(id));
    const nested = children.get(section.id) ?? [];
    if (!ids.length && !nested.length) return null;
    return <fieldset className="sheet-section rule-category" data-depth={Math.min(depth, 8)} key={section.id}>
      <legend>{section.label}</legend>
      {ids.length ? <RuleFields fields={Object.fromEntries(ids.map(id => [id, runtime.fields[id]!]))} values={values} onChange={onChange} disabled={disabled} /> : null}
      {nested.length ? <div className="rule-category-children">{nested.map(child => renderSection(child, depth + 1))}</div> : null}
    </fieldset>;
  };
  const learnedAbilities = learned.map(id => runtime.abilities.find(ability => ability.id === id)).filter((ability): ability is RuntimeAbility => !!ability);
  return <>
    {(children.get(null) ?? []).map(section => renderSection(section, 0))}
    {preview?.valid && preview.vitals.length ? <section aria-label={t("Vitalwerte")}>{preview.vitals.map(vital => <div key={vital.id}>
      <label>{vital.label} · {vital.value} / {vital.maximum} <meter min={0} max={Math.max(1, vital.maximum)} value={Math.max(0, Math.min(vital.maximum, vital.value))} /></label>
    </div>)}</section> : null}
    {preview?.valid && runtime.computed.length ? <section className="rule-computed"><h3>{t("Berechnete Werte")}</h3><dl className="rf-value-list">
      {runtime.computed.map(field => <div key={field.id}><dt>{field.label}</dt><dd>{preview.computed[field.id]}</dd></div>)}</dl></section> : null}
    {runtime.abilityField && runtime.abilities.length ? <section className="faehigkeiten-bogen" aria-label={t("Fähigkeiten und Zustände")}>
      <h3>{t("Fähigkeiten")}</h3>
      {overview ? <p role="status">{overview.budget === null ? t("Ausgegeben: {punkte} Punkte", { punkte: overview.spent }) : t("Ausgegeben: {punkte} von {budget} Punkten", { punkte: overview.spent, budget: overview.budget })}</p> : null}
      <AbilityGroups rows={learnedAbilities} renderRow={ability => <li key={ability.id}><span>{ability.name}</span>
        <Button disabled={disabled} onClick={() => setList(runtime.abilityField!, forgetRuleAbility(runtime, learned, ability.id))}>{t("Verlernen")}</Button></li>} />
      <details><summary>{t("Neue Fähigkeit lernen")}</summary>
        <label>{t("Fähigkeit suchen")}<input type="search" value={search} onChange={event => setSearch(event.target.value)} disabled={disabled} /></label>
        <AbilityGroups rows={abilities.slice(0, 40)} renderRow={ability => <li key={ability.id}><div><strong>{ability.name}</strong><small> · {ability.price}</small><p>{ability.text}</p></div>
          <Button disabled={disabled || !learnable.has(ability.id)} onClick={() => { if (learnable.has(ability.id)) setList(runtime.abilityField!, [...learned, ability.id]); }}>{t("Lernen")}</Button></li>} />
        {abilities.length > 40 ? <p>{t("{n} weitere Treffer. Grenze die Suche ein.", { n: abilities.length - 40 })}</p> : !abilities.length ? <p>{t("Keine passende Fähigkeit.")}</p> : null}
      </details>
    </section> : null}
    {runtime.conditionField && runtime.conditions.length ? <section><h3>{t("Zustände")}</h3>{runtime.conditions.map(condition => <label key={condition.id} className="check-label">
      <input type="checkbox" checked={active.includes(condition.id)} disabled={disabled} onChange={event => setList(runtime.conditionField!, event.target.checked ? [...active, condition.id] : active.filter(id => id !== condition.id))} />
      <span>{condition.name} <small>{condition.text}</small></span>
    </label>)}</section> : null}
    {[...special].some(Boolean) ? <details><summary>{t("Kennungslisten korrigieren")}</summary>
      <RuleFields fields={Object.fromEntries([...special].filter((id): id is string => id !== null).map(id => [id, runtime.fields[id]!]))} values={values} onChange={onChange} disabled={disabled} />
    </details> : null}
    <details><summary>{t("Proben dieses Regelpakets")}</summary><ul>{runtime.actions.map(action => <li key={action.id}>{action.name}</li>)}</ul></details>
  </>;
}
