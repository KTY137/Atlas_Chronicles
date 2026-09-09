// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@chronicle/ui";
import { RULE_LIMITS } from "@chronicle/rules";
import { FormulaField } from "./FormulaField";
import { t, plural } from "../i18n";
import { sourcesFromDraft } from "./formula-sugar";
import { RuleActionExtensions } from "./RuleDeclarativeEditor";
import { FieldList } from "./RuleFieldList";
import { draftExpression, moveItem, newAction, type DraftAction, type DraftField, type RuleDraft } from "./rule-forge-model";

/** A stable empty-array identity: an inline `?? []` fallback would be a fresh array (and thus a
 * fresh `sources`/`example` downstream) on every render. */
const NO_INPUTS: readonly DraftField[] = [];

export function RuleActionEditor({ draft, disabled, onChange }: { draft: RuleDraft; disabled: boolean; onChange(actions: DraftAction[]): void }) {
  const [selected, setSelected] = useState(""), [query, setQuery] = useState("");
  const action = draft.actions.find(a => a.localId === selected) ?? draft.actions[0];
  const inputs = action?.inputs ?? NO_INPUTS;
  // FormulaField memoises on `sources`/`example` identity; building this object fresh on every
  // keystroke would re-parse and re-evaluate every mounted formula (H: memoisation must hold).
  const sources = useMemo(() => sourcesFromDraft(draft.fields, inputs), [draft.fields, inputs]);
  const update = (next: DraftAction) => onChange(draft.actions.map(a => a.localId === next.localId ? next : a));
  const shown = draft.actions.filter(a => !query.trim() || `${a.name} ${a.id}`.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de")));
  const index = action ? draft.actions.indexOf(action) : -1;
  return <div className="rf-split">
    <nav className="rf-list" aria-label={t("Aktionen")}>
      <div className="rf-section-heading"><h3>{t("Aktionen")}</h3><Button disabled={disabled || draft.actions.length >= RULE_LIMITS.actions} onClick={() => { const next = newAction(draft.actions.map(a => a.id)); onChange([...draft.actions, next]); setSelected(next.localId); }}><Plus size={15} />{t("Aktion")}</Button></div>
      <p className="rf-help">{t("Was eine Figur tun kann: ein Wurf mit Attributen, Parametern und einer Erfolgsregel.")}</p>
      {draft.actions.length >= 10 ? <label className="rf-list-search"><Search size={14} aria-hidden="true" /><input aria-label={t("Aktion suchen")} value={query} placeholder={t("Name oder Kennung")} onChange={event => setQuery(event.target.value)} /></label> : null}
      <ul>{shown.map(a => <li key={a.localId}><button type="button" aria-current={a.localId === action?.localId ? "true" : undefined} onClick={() => setSelected(a.localId)}><strong>{a.name || t("Ohne Namen")}</strong><small>{a.id}{a.inputs.length ? ` · ${plural(a.inputs.length, "{n} Parameter", "{n} Parameter")}` : ""}</small></button></li>)}</ul>
      {!draft.actions.length ? <p>{t('Noch keine Aktion. Lege oben die erste an, zum Beispiel „Angriff": 1d20 plus Geschick, Erfolg ab 15.')}</p> : null}
    </nav>
    {action ? <section className="rf-detail" aria-label={t("Aktion")}><fieldset className="rf-editor-fields" disabled={disabled}>
      <div className="rf-section-heading"><h4>{action.name || t("Ohne Namen")}</h4><span className="rf-toolbar"><span className="rf-order"><Button variant="quiet" disabled={index <= 0} aria-label={t("Nach oben verschieben")} onClick={() => onChange(moveItem(draft.actions, index, -1))}><ArrowUp size={14} /></Button><Button variant="quiet" disabled={index >= draft.actions.length - 1} aria-label={t("Nach unten verschieben")} onClick={() => onChange(moveItem(draft.actions, index, 1))}><ArrowDown size={14} /></Button></span><Button variant="quiet" onClick={() => { onChange(draft.actions.filter(a => a.localId !== action.localId)); setSelected(""); }}><Trash2 size={15} />{t("Aktion entfernen")}</Button></span></div>
      <div className="rf-form-grid"><label>{t("Name")}<input value={action.name} maxLength={120} onChange={event => update({ ...action, name: event.target.value })} /><small>{t("So heißt die Aktion am Tisch, zum Beispiel Angriff.")}</small></label><label>{t("Kennung")}<input value={action.id} maxLength={96} spellCheck={false} onChange={event => update({ ...action, id: event.target.value })} /><small>{t('Für Pakettests und Migrationen, zum Beispiel angriff. Nur Kleinbuchstaben, Ziffern, „_" und „-", beginnend mit einem Buchstaben.')}</small></label></div>
      <h5>{t("Parameter")}</h5><p className="rf-help">{t("Was beim Würfeln abgefragt wird, zum Beispiel ein Bonus. In der Formel als ?kennung.")}</p>
      <FieldList title={t("Parameter")} fields={action.inputs} onChange={inputs => update({ ...action, inputs })} compact />
      <h5>{t("Ergebnis")}</h5>
      <FormulaField label={t("Ergebnis")} help={t("Der Wurf mit allen Zuschlägen, zum Beispiel 1d20 + @geschick + ?bonus.")} value={draftExpression(action)} onChange={expression => update({ ...action, expression })} sources={sources} fields={draft.fields} inputs={inputs} actionId={action.id} allowDice allowKnowledge />
      <h5>{t("Erfolg")}</h5>
      <label className="rf-check"><input type="checkbox" disabled={!!action.outcome} checked={action.thresholdEnabled} onChange={event => update({ ...action, thresholdEnabled: event.target.checked })} />{t("Feste Erfolgsschwelle verwenden")}</label>
      {action.thresholdEnabled ? <label>{t("Erfolg ab Ergebnis")}<input type="number" value={action.threshold} step="any" onChange={event => update({ ...action, threshold: event.target.value })} /><small>{t("Das Ergebnis mit allen Zuschlägen muss mindestens diese Zahl erreichen, zum Beispiel 15 bei einem W20.")}</small></label> : null}
      {action.outcome ? <p className="rf-help">{t("Diese Aktion nutzt die Ergebnisbereiche weiter unten.")}</p> : null}
      <RuleActionExtensions draft={draft} action={action} onChange={update} />
      <details className="rf-input-editor"><summary>{t("Details")}</summary>
        <label>{t("Version dieser Aktion")}<input value={action.version} placeholder="1.0.0" onChange={event => update({ ...action, version: event.target.value })} /><small>{t("Eigene Version, unabhängig vom Paket, zum Beispiel 1.0.0.")}</small></label>
        <label>{t("Erklärung am Tisch")}<textarea rows={3} value={action.disclosure} maxLength={1024} onChange={event => update({ ...action, disclosure: event.target.value })} /><small>{t("Erkläre, wie das Wissen der Figur das Ergebnis beeinflusst. Am Tisch bleibt die Bestätigung durch Menschen erforderlich.")}</small></label>
      </details>
    </fieldset></section> : null}
  </div>;
}
