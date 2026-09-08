// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@chronicle/ui";
import { RULE_LIMITS } from "@chronicle/rules";
import { FormulaField } from "./FormulaField";
import { sourcesFromDraft } from "./formula-sugar";
import { RuleActionExtensions } from "./RuleDeclarativeEditor";
import { FieldList } from "./RuleFieldList";
import { draftExpression, moveItem, newAction, type DraftAction, type RuleDraft } from "./rule-forge-model";

export function RuleActionEditor({ draft, disabled, onChange }: { draft: RuleDraft; disabled: boolean; onChange(actions: DraftAction[]): void }) {
  const [selected, setSelected] = useState(""), [query, setQuery] = useState("");
  const action = draft.actions.find(a => a.localId === selected) ?? draft.actions[0];
  const update = (next: DraftAction) => onChange(draft.actions.map(a => a.localId === next.localId ? next : a));
  const shown = draft.actions.filter(a => !query.trim() || `${a.name} ${a.id}`.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de")));
  const index = action ? draft.actions.indexOf(action) : -1;
  return <div className="rf-split">
    <nav className="rf-list" aria-label="Aktionen">
      <div className="rf-section-heading"><h3>Aktionen</h3><Button disabled={disabled || draft.actions.length >= RULE_LIMITS.actions} onClick={() => { const next = newAction(draft.actions.map(a => a.id)); onChange([...draft.actions, next]); setSelected(next.localId); }}><Plus size={15} />Aktion</Button></div>
      <p className="rf-help">Was eine Figur tun kann: ein Wurf mit Attributen, Parametern und einer Erfolgsregel.</p>
      {draft.actions.length >= 10 ? <label className="rf-list-search"><Search size={14} aria-hidden="true" /><input aria-label="Aktion suchen" value={query} placeholder="Name oder Kennung" onChange={event => setQuery(event.target.value)} /></label> : null}
      <ul>{shown.map(a => <li key={a.localId}><button type="button" aria-current={a.localId === action?.localId ? "true" : undefined} onClick={() => setSelected(a.localId)}><strong>{a.name || "Ohne Namen"}</strong><small>{a.id}{a.inputs.length ? ` · ${a.inputs.length} Parameter` : ""}</small></button></li>)}</ul>
      {!draft.actions.length ? <p>Noch keine Aktion. Lege oben die erste an, zum Beispiel „Angriff": 1d20 plus Geschick, Erfolg ab 15.</p> : null}
    </nav>
    {action ? <section className="rf-detail" aria-label="Aktion"><fieldset className="rf-editor-fields" disabled={disabled}>
      <div className="rf-section-heading"><h4>{action.name || "Ohne Namen"}</h4><span className="rf-toolbar"><span className="rf-order"><Button variant="quiet" disabled={index <= 0} aria-label="Nach oben verschieben" onClick={() => onChange(moveItem(draft.actions, index, -1))}><ArrowUp size={14} /></Button><Button variant="quiet" disabled={index >= draft.actions.length - 1} aria-label="Nach unten verschieben" onClick={() => onChange(moveItem(draft.actions, index, 1))}><ArrowDown size={14} /></Button></span><Button variant="quiet" onClick={() => { onChange(draft.actions.filter(a => a.localId !== action.localId)); setSelected(""); }}><Trash2 size={15} />Aktion entfernen</Button></span></div>
      <div className="rf-form-grid"><label>Name<input value={action.name} maxLength={120} onChange={event => update({ ...action, name: event.target.value })} /><small>So heißt die Aktion am Tisch, zum Beispiel Angriff.</small></label><label>Kennung<input value={action.id} maxLength={96} spellCheck={false} onChange={event => update({ ...action, id: event.target.value })} /><small>Für Pakettests und Migrationen, zum Beispiel angriff. Nur Kleinbuchstaben, Ziffern, „_" und „-", beginnend mit einem Buchstaben.</small></label></div>
      <h5>Parameter</h5><p className="rf-help">Was beim Würfeln abgefragt wird, zum Beispiel ein Bonus. In der Formel als ?kennung.</p>
      <FieldList title="Parameter" fields={action.inputs} onChange={inputs => update({ ...action, inputs })} compact />
      <h5>Ergebnis</h5>
      <FormulaField label="Ergebnis" help="Der Wurf mit allen Zuschlägen, zum Beispiel 1d20 + @geschick + ?bonus." value={draftExpression(action)} onChange={expression => update({ ...action, expression })} sources={sourcesFromDraft(draft.fields, action.inputs)} fields={draft.fields} inputs={action.inputs} actionId={action.id} allowDice allowKnowledge />
      <h5>Erfolg</h5>
      <label className="rf-check"><input type="checkbox" disabled={!!action.outcome} checked={action.thresholdEnabled} onChange={event => update({ ...action, thresholdEnabled: event.target.checked })} />Feste Erfolgsschwelle verwenden</label>
      {action.thresholdEnabled ? <label>Erfolg ab Ergebnis<input type="number" value={action.threshold} step="any" onChange={event => update({ ...action, threshold: event.target.value })} /><small>Das Ergebnis mit allen Zuschlägen muss mindestens diese Zahl erreichen, zum Beispiel 15 bei einem W20.</small></label> : null}
      {action.outcome ? <p className="rf-help">Diese Aktion nutzt die Ergebnisbereiche weiter unten.</p> : null}
      <RuleActionExtensions draft={draft} action={action} onChange={update} />
      <details className="rf-input-editor"><summary>Details</summary>
        <label>Version dieser Aktion<input value={action.version} placeholder="1.0.0" onChange={event => update({ ...action, version: event.target.value })} /><small>Eigene Version, unabhängig vom Paket, zum Beispiel 1.0.0.</small></label>
        <label>Erklärung am Tisch<textarea rows={3} value={action.disclosure} maxLength={1024} onChange={event => update({ ...action, disclosure: event.target.value })} /><small>Erkläre, wie das Wissen der Figur das Ergebnis beeinflusst. Am Tisch bleibt die Bestätigung durch Menschen erforderlich.</small></label>
      </details>
    </fieldset></section> : null}
  </div>;
}
