// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { ReactNode } from "react";
import type { AnyRulePackage, RuleRuntime, RuleRuntimePreview, RuleRuntimeSection, Scalar } from "@chronicle/rules";
import { Button, Loading, Notice } from "@chronicle/ui";
import { t } from "../i18n";
import { Begriff } from "./Begriff";
import { VitalBar } from "./Vitalanzeige";
import { RuleFields } from "./RuleFields";
import { RulePresentationView, SheetAbilities, SheetConditions } from "./RulePresentationView";
import { displayRuleRuntime } from "./rule-runtime-display";
import { showsField, showsValues, unknownListEntries, type RuleFieldsPart } from "./rule-fields-model";
import type { HostRuleEditorState } from "./useHostRules";
import "./rule-categories.css";
import "./rule-fields.css";

/**
 * Der Bogen einer Figur, wie ihn der Host auswertet. `part` teilt ihn für den geführten Weg (E15):
 * „identity“ zeigt, wer die Figur ist, „values“, was sie kann. `omit` blendet einzelne Felder aus,
 * etwa den Namen, wenn der Ablauf ihn selbst abfragt; `onChange` bekommt trotzdem alle Werte.
 */
export function HostRuleFields({ state, source, onChange, disabled = false, part = "all", omit }: {
  state: HostRuleEditorState; source?: AnyRulePackage | undefined; onChange: (values: Record<string, Scalar>) => void; disabled?: boolean;
  part?: RuleFieldsPart; omit?: readonly string[];
}) {
  const display = state.manifest ? displayRuleRuntime(state.manifest, state.error ? null : state.preview, source) : null;
  return <>
    {state.error ? <Notice error>{state.error} <Button onClick={state.reload}>{t("Erneut laden")}</Button></Notice> : null}
    {state.manifest && state.values ? <RuntimeFields key={`${state.manifest.pin.id}@${state.manifest.pin.version}:${state.manifest.contentHash}`}
      runtime={display!.runtime} values={state.values} preview={display!.preview} onChange={onChange} disabled={disabled} part={part} omit={omit} /> : state.pending ? <Loading /> : null}
    {state.pending ? <p className="field-help" role="status">{t("Das Regelwerk prüft die aktuellen Bogenwerte …")}</p> : null}
    {state.preview && !state.preview.valid ? <Notice error>{t("So lässt sich der Bogen noch nicht speichern.")} {state.preview.errors.join(" ")}</Notice> : null}
  </>;
}
function RuntimeFields({ runtime, values, preview, onChange, disabled, part, omit }: {
  runtime: RuleRuntime; values: Readonly<Record<string, Scalar>>; preview: RuleRuntimePreview | null;
  onChange: (values: Record<string, Scalar>) => void; disabled: boolean; part: RuleFieldsPart; omit: readonly string[] | undefined;
}) {
  const withValues = showsValues(part);
  // Die rohen Kennungslisten erscheinen nur, wenn eine davon Einträge hält, die das Regelwerk nicht
  // kennt (alter oder eingespielter Bogen). Sonst bearbeiten Karten und Chips die Listen vollständig.
  const broken = withValues ? unknownListEntries(runtime, values).filter(entry => runtime.fields[entry.field]) : [];
  const repair = broken.length ? <details className="sheet-block sheet-repair"><summary>{t("Gespeicherte Liste reparieren")}</summary>
    <p className="field-help">{t("Diese gespeicherte Liste enthält Einträge, die das Regelwerk nicht kennt: {liste}. Lösche sie hier aus dem Text.", { liste: broken.flatMap(entry => entry.unknown).join(", ") })}</p>
    <RuleFields fields={Object.fromEntries(broken.map(entry => [entry.field, runtime.fields[entry.field]!]))} values={values} onChange={onChange} disabled={disabled} />
  </details> : null;

  if (runtime.presentation) return <>
    <RulePresentationView runtime={runtime} preview={preview} values={values} onChange={onChange} disabled={disabled} part={part} omit={omit} />
    {repair}
  </>;

  // Pakete ohne eigenen Bogenaufbau (v1/v2): Balken zuerst, dann die Abschnitte, dann was daraus folgt.
  const special = new Set([runtime.abilities.length ? runtime.abilityField : null, runtime.conditions.length ? runtime.conditionField : null]);
  const children = new Map<string | null, RuleRuntimeSection[]>();
  for (const section of runtime.sections) {
    const rows = children.get(section.parent) ?? [];
    rows.push(section); children.set(section.parent, rows);
  }
  const renderSection = (section: RuleRuntimeSection, depth: number): ReactNode => {
    const ids = section.fields.filter(id => !special.has(id) && runtime.fields[id] && showsField(id, runtime.fields[id]!, part, omit, runtime));
    const nested = (children.get(section.id) ?? []).map(child => renderSection(child, depth + 1)).filter(Boolean);
    if (!ids.length && !nested.length) return null;
    return <fieldset className="sheet-section rule-category" data-depth={Math.min(depth, 8)} key={section.id}>
      <legend>{section.label}</legend>
      {ids.length ? <RuleFields fields={Object.fromEntries(ids.map(id => [id, runtime.fields[id]!]))} values={values} onChange={onChange} disabled={disabled} /> : null}
      {nested.length ? <div className="rule-category-children">{nested}</div> : null}
    </fieldset>;
  };
  return <>
    {withValues && preview?.valid && preview.vitals.length ? <section className="sheet-vitals">
      <h3><Begriff id="balken" /></h3>
      <div className="vitalanzeige-liste">{preview.vitals.map(vital => <VitalBar key={vital.id} vital={vital} label={vital.label} />)}</div>
    </section> : null}
    {(children.get(null) ?? []).map(section => renderSection(section, 0))}
    {withValues && preview?.valid && runtime.computed.length ? <section className="sheet-block rule-computed">
      <h3><Begriff id="berechneter-wert">{t("Berechnete Werte")}</Begriff></h3>
      <dl className="stat-tiles">{runtime.computed.map(field => <div className="stat-tile" key={field.id}><dt>{field.label}</dt><dd>{preview.computed[field.id]}</dd></div>)}</dl>
    </section> : null}
    {withValues ? <SheetAbilities runtime={runtime} preview={preview} values={values} onChange={onChange} disabled={disabled} regionLabel={t("Fähigkeiten und Zustände")} /> : null}
    {withValues ? <SheetConditions runtime={runtime} values={values} onChange={onChange} disabled={disabled} /> : null}
    {repair}
    {withValues && runtime.actions.length ? <details className="sheet-block"><summary>{t("Proben dieses Regelwerks")}</summary><ul>{runtime.actions.map(action => <li key={action.id}>{action.name}</li>)}</ul></details> : null}
  </>;
}
