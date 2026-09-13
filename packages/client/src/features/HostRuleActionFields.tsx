// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { RuleRuntimeAction, RuleRuntimeActionState, Scalar } from "@chronicle/rules";
import { t } from "../i18n";
import { RuleFields } from "./RuleFields";

const ids = (value: Scalar | undefined): string[] => typeof value === "string" ? [...new Set(value.split(/[\s,]+/).filter(Boolean))] : [];
const signed = (value: number) => value >= 0 ? `+${value}` : String(value);

/**
 * Action editor driven exclusively by the host runtime contract. Executable formulas, outcome
 * definitions and modifier matching never reach this component; it receives only safe fields
 * and the actor-specific choices already selected by the host preview.
 */
export function HostRuleActionFields({ action, state, input, onChange, disabled = false }: {
  action: RuleRuntimeAction; state?: RuleRuntimeActionState | undefined;
  input: Readonly<Record<string, Scalar>>; onChange: (next: Record<string, Scalar>) => void; disabled?: boolean;
}) {
  const values = { ...Object.fromEntries(Object.entries(action.inputs).map(([id, field]) => [id, field.default])), ...input };
  const selected = ids(input.einsatz);
  const choose = (id: string, enabled: boolean) => onChange({ ...input, einsatz: (enabled ? [...selected, id] : selected.filter(current => current !== id)).join(", ") });
  return <>
    {action.disclosure ? <p className="field-help">{action.disclosure}</p> : null}
    {Object.keys(action.inputs).length ? <RuleFields fields={action.inputs} values={values} onChange={next => onChange({ ...input, ...next })} disabled={disabled} /> : null}
    {state?.passive.length || state?.abilities.length ? <fieldset className="einsatz-wahl"><legend>{t("Fähigkeiten und Zustände")}</legend>
      {state.passive.length ? <p className="field-help">{t("Wirkt ohnehin mit: {liste}", { liste: state.passive.map(effect => `${effect.name} ${signed(effect.value)}`).join(", ") })}</p> : null}
      {state.abilities.map(ability => <label key={ability.id} className="check-label"><input type="checkbox" disabled={disabled} checked={selected.includes(ability.id)}
        onChange={event => choose(ability.id, event.target.checked)} /> <span><strong>{ability.name}</strong>{ability.cost ? ` · ${t("{kosten} Funken", { kosten: ability.cost })}` : ""} <small>{ability.text}</small></span></label>)}
      {state.abilities.some(ability => ability.cost > 0) ? <p className="field-help">{t("Funken für eingesetzte Fähigkeiten hakst du danach am Bogen ab.")}</p> : null}
    </fieldset> : null}
  </>;
}
