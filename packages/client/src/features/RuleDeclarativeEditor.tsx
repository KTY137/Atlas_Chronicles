// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useId, useRef, useState } from "react";
import { parseFormula, type ComputedField, type FormulaFieldTypes, type RuleAssertion, type RuleAttribution, type RuleOutcome, type OutcomeComparison, type RuleVital } from "@chronicle/rules";
import { Button, Notice } from "@chronicle/ui";
import { FormulaBuilder } from "./FormulaBuilder";
import { fieldTypes, formulaDraft, formulaSource, compileFormula, moveItem, uniqueId, type FormulaDraft, type RuleDraft, type DraftAction } from "./rule-forge-model";

function ExpressionInput({ value, onChange, fields, label }: { value: string; onChange(value: string): void; fields: FormulaFieldTypes; label: string }) {
  const [visual, setVisual] = useState(false);
  const [visualDraft, setVisualDraft] = useState<FormulaDraft | null>(null), [visualError, setVisualError] = useState("");
  const emitted = useRef(value);
  useEffect(() => {
    if (value !== emitted.current) { emitted.current = value; setVisualDraft(null); setVisualError(""); }
  }, [value]);
  let parsed = null, error = "";
  try { parsed = formulaDraft(parseFormula(value)); } catch (e) { error = e instanceof Error ? e.message : "Ungültige Formel"; }
  const editVisual = (next: FormulaDraft) => {
    setVisualDraft(next);
    let source = "";
    try { source = formulaSource(compileFormula(next)); setVisualError(""); }
    catch (e) { setVisualError(e instanceof Error ? e.message : "Die Formel ist noch unvollständig."); }
    // Incomplete visual input also invalidates the package draft. Never publish
    // the previous valid expression while displaying a different unfinished one.
    emitted.current = source; onChange(source);
  };
  return <div><label>{label}<textarea rows={2} value={value} maxLength={4096} spellCheck={false} onChange={e => { setVisualDraft(null); setVisualError(""); emitted.current = e.target.value; onChange(e.target.value); }} /></label>
    <Button aria-expanded={visual} onClick={() => setVisual(!visual)}>Formelbaukasten {visual ? "schließen" : "öffnen"}</Button>
    {visual && (visualDraft ?? parsed) ? <FormulaBuilder label={label} value={(visualDraft ?? parsed)!} fields={fields} allowDice={false} allowKnowledge={false} onChange={editVisual} /> : null}
    {visual && (visualError || error) ? <Notice error>{visualError || error}</Notice> : null}</div>;
}
function AssertionEditor({ values, fields, onChange, limit, title }: { values: readonly RuleAssertion[]; fields: FormulaFieldTypes; onChange(values: readonly RuleAssertion[]): void; limit: number; title: string }) {
  const update = (index: number, patch: Partial<RuleAssertion>) => onChange(values.map((value, i) => i === index ? { ...value, ...patch } : value));
  return <section><h3>{title}</h3><p className="rf-help">Jede Bedingung muss wahr sein. Ihre Meldung erklärt, was vor dem Speichern oder Würfeln zu korrigieren ist.</p>
    {values.map((value, i) => <fieldset className="rf-card" key={i}><legend>{value.id || `Bedingung ${i + 1}`}</legend><div className="rf-form-grid"><label>Kennung<input value={value.id} onChange={e => update(i, { id: e.target.value })} /></label><label>Meldung<input value={value.message} maxLength={1024} onChange={e => update(i, { message: e.target.value })} /></label></div>
      <ExpressionInput label="Bedingung" value={value.expression} onChange={expression => update(i, { expression })} fields={fields} /><Button onClick={() => onChange(values.filter((_, index) => i !== index))}>Bedingung entfernen</Button>
    </fieldset>)}<Button disabled={values.length >= limit} onClick={() => onChange([...values, { id: uniqueId("bedingung", values.map(v => v.id)), message: "Diese Werte sind noch nicht gültig.", expression: "true" }])}>Bedingung hinzufügen</Button>
  </section>;
}
/**
 * Die Balken der Runde: welche Zahlen auf dem Bogen steigen und fallen — Leben, Mana, Ausdauer.
 *
 * **Das Feld wird gewählt, nicht getippt.** Ein Vitalwert zeigt auf ein vorhandenes Zahlenfeld;
 * ein Textfeld hätte keinen Stand, und ein erfundener Name keinen Wert. Was der Parser ohnehin
 * ablehnt, soll hier gar nicht erst eingebbar sein.
 *
 * **Erschöpfung ist eine Entscheidung, keine Voreinstellung.** Nur wer „Niederlage" wählt, macht
 * aus einer leeren Leiste einen Zustand am Tisch — genau die Verwechslung, die das Regelpaket
 * einst zum Sperren gezwungen hat (ein leergespielter Zähler ist kein Tod).
 */
function VitalEditor({ draft, onChange }: { draft: RuleDraft; onChange(draft: RuleDraft): void }) {
  const vitals = draft.vitals ?? [], fields = { actor: fieldTypes(draft.fields), input: {} };
  const zahlenfelder = draft.fields.filter(field => field.type === "integer" || field.type === "number");
  const update = (index: number, patch: Partial<RuleVital>) =>
    onChange({ ...draft, vitals: vitals.map((value, i) => i === index ? { ...value, ...patch } : value) });
  const frei = zahlenfelder.filter(field => !vitals.some(vital => vital.id === field.id));
  return <section><h3>Balken der Figur</h3>
    <p className="rf-help">Leben, Mana, Ausdauer: eine Zahl auf dem Bogen, ein Höchststand und die Frage, was Erschöpfung bedeutet. Nur Zahlenfelder können Balken tragen.</p>
    {!zahlenfelder.length ? <Notice>Dieses Regelwerk hat noch kein Zahlenfeld. Lege zuerst eines an — ein Balken braucht eine Zahl, die steigt und fällt.</Notice> : null}
    {vitals.map((vital, i) => <fieldset className="rf-card" key={i}><legend>{vital.label || `Balken ${i + 1}`}</legend>
      <div className="rf-form-grid">
        <label>Feld auf dem Bogen<select value={vital.id} onChange={e => update(i, { id: e.target.value })}>
          {zahlenfelder.map(field => <option key={field.id} value={field.id}>{field.label || field.id}</option>)}
        </select></label>
        <label>Beschriftung<input value={vital.label} maxLength={120} onChange={e => update(i, { label: e.target.value })} /></label>
      </div>
      <ExpressionInput label="Höchststand" value={vital.max} onChange={max => update(i, { max })} fields={fields} />
      <label>Wenn der Wert 0 erreicht<select value={vital.depletion} onChange={e => update(i, { depletion: e.target.value as RuleVital["depletion"] })}>
        <option value="none">Nur die Leiste ist leer</option>
        <option value="defeat">Die Niederlage steht zur Bestätigung an</option>
      </select></label>
      <Button onClick={() => onChange({ ...draft, vitals: vitals.filter((_, index) => index !== i) })}>Balken entfernen</Button>
    </fieldset>)}
    <Button disabled={vitals.length >= 8 || !frei.length} onClick={() => onChange({ ...draft, vitals: [...vitals, {
      id: frei[0]!.id, label: frei[0]!.label || frei[0]!.id, max: String(frei[0]!.maximum || "100"), depletion: "none",
    }] })}>Balken hinzufügen</Button>
    {/* `zahlenfelder.length && …` haette bei null Feldern die Ziffer 0 auf die Seite gerendert. */}
    {zahlenfelder.length > 0 && !frei.length && vitals.length < 8 ? <p className="rf-help">Jedes Zahlenfeld trägt höchstens einen Balken; für einen weiteren braucht es ein weiteres Feld.</p> : null}
  </section>;
}
export function RuleDeclarativeEditor({ draft, onChange }: { draft: RuleDraft; onChange(draft: RuleDraft): void }) {
  if (draft.schemaVersion === 1) return <section><h3>Berechnete Werte und Bedingungen</h3><p>Diese Ergänzungen verwenden das erweiterte Paketformat. Bereits gespeicherte Würfelbelege behalten ihre ursprünglichen Regeln.</p><Button onClick={() => onChange({ ...draft, schemaVersion: 2 })}>Erweiterte Regeln im Entwurf aktivieren</Button></section>;
  const computed = draft.computed ?? [], fields = { actor: fieldTypes(draft.fields), input: {} };
  const changeComputed = (index: number, patch: Partial<ComputedField>) => onChange({ ...draft, computed: computed.map((value, i) => i === index ? { ...value, ...patch } : value) });
  return <><h3>Berechnete Charakterwerte</h3><p className="rf-help">Nur gespeicherte Charakterfelder verwenden. Diese Werte werden bei der Anzeige berechnet; sie sind keine zusätzlichen gespeicherten Felder.</p>
    {computed.map((value, i) => <fieldset className="rf-card" key={i}><legend>{value.label || `Wert ${i + 1}`}</legend><div className="rf-form-grid"><label>Kennung<input value={value.id} onChange={e => changeComputed(i, { id: e.target.value })} /></label><label>Beschriftung<input value={value.label} maxLength={120} onChange={e => changeComputed(i, { label: e.target.value })} /></label></div>
      <ExpressionInput label="Berechnung" value={value.expression} onChange={expression => changeComputed(i, { expression })} fields={fields} />
      <Button onClick={() => onChange({ ...draft, computed: computed.filter((_, index) => i !== index) })}>Berechneten Wert entfernen</Button>
    </fieldset>)}<Button disabled={computed.length >= 64} onClick={() => onChange({ ...draft, computed: [...computed, { id: uniqueId("berechnet", [...draft.fields.map(f => f.id), ...computed.map(v => v.id)]), label: "Neuer berechneter Wert", expression: "0" }] })}>Berechneten Wert hinzufügen</Button>
    <AssertionEditor title="Gültigkeit des Bogens" values={draft.constraints ?? []} limit={64} fields={fields} onChange={constraints => onChange({ ...draft, constraints })} />
    <VitalEditor draft={draft} onChange={onChange} />
  </>;
}
export function RuleActionExtensions({ draft, action, onChange }: { draft: RuleDraft; action: DraftAction; onChange(action: DraftAction): void }) {
  const controlId = useId();
  if (draft.schemaVersion !== 2) return null;
  const fields = { actor: fieldTypes(draft.fields), input: fieldTypes(action.inputs) }, outcome = action.outcome;
  const changeOutcome = (value: RuleOutcome) => onChange({ ...action, thresholdEnabled: false, outcome: value });
  return <><AssertionEditor title="Voraussetzungen der Aktion" values={action.preconditions ?? []} limit={8} fields={fields} onChange={preconditions => onChange({ ...action, preconditions })} />
    <h3>Ergebnis einordnen</h3><label className="rf-check"><input type="checkbox" checked={!!outcome} onChange={e => {
      if (e.target.checked) changeOutcome({ bands: [{ id: "success", label: "Gelungen", comparison: "lte", expression: "50", success: true }], fallback: { id: "failure", label: "Misslungen", success: false } });
      else { const { outcome: _outcome, ...rest } = action; onChange(rest); }
    }} />Geordnete Ergebnisbereiche verwenden</label>
    {outcome ? <><p>Die erste passende Zeile entscheidet. Der eigentliche Wurf wird einmal ausgewertet; diese Vergleiche würfeln nicht erneut.</p>
      {outcome.bands.map((band, i) => {
        const update = (patch: Partial<typeof band>) => changeOutcome({ ...outcome, bands: outcome.bands.map((value, index) => index === i ? { ...value, ...patch } : value) });
        return <fieldset className="rf-card" key={i}><legend>Bereich {i + 1}: {band.label}</legend><div className="rf-form-grid"><label>Kennung<input value={band.id} onChange={e => update({ id: e.target.value })} /></label><label>Ergebnistext<input value={band.label} maxLength={120} onChange={e => update({ label: e.target.value })} /></label></div>
          <label htmlFor={`${controlId}-${i}`}>Ergebnis vergleichen</label><select id={`${controlId}-${i}`} value={band.comparison} onChange={e => update({ comparison: e.target.value as OutcomeComparison })}>{([['eq', 'gleich'], ['lt', 'kleiner als'], ['lte', 'höchstens'], ['gt', 'größer als'], ['gte', 'mindestens']] as const).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
          <ExpressionInput label="Vergleichswert" value={band.expression} onChange={expression => update({ expression })} fields={fields} />
          <label className="rf-check"><input type="checkbox" checked={band.success} onChange={e => update({ success: e.target.checked })} />Gilt als Erfolg</label>
          <div className="button-row"><Button disabled={i === 0} onClick={() => changeOutcome({ ...outcome, bands: moveItem(outcome.bands, i, -1) })}>Bereich nach oben</Button><Button disabled={i === outcome.bands.length - 1} onClick={() => changeOutcome({ ...outcome, bands: moveItem(outcome.bands, i, 1) })}>Bereich nach unten</Button><Button onClick={() => changeOutcome({ ...outcome, bands: outcome.bands.filter((_, index) => index !== i) })}>Bereich entfernen</Button></div>
        </fieldset>;
      })}<Button disabled={outcome.bands.length >= 8} onClick={() => changeOutcome({ ...outcome, bands: [...outcome.bands, { id: uniqueId("bereich", [...outcome.bands.map(b => b.id), outcome.fallback.id]), label: "Neues Ergebnis", comparison: "eq", expression: "1", success: false }] })}>Ergebnisbereich hinzufügen</Button>
      <fieldset className="rf-card"><legend>Wenn kein Bereich passt</legend><label>Kennung<input value={outcome.fallback.id} onChange={e => changeOutcome({ ...outcome, fallback: { ...outcome.fallback, id: e.target.value } })} /></label><label>Ergebnistext<input value={outcome.fallback.label} maxLength={120} onChange={e => changeOutcome({ ...outcome, fallback: { ...outcome.fallback, label: e.target.value } })} /></label><label className="rf-check"><input type="checkbox" checked={outcome.fallback.success} onChange={e => changeOutcome({ ...outcome, fallback: { ...outcome.fallback, success: e.target.checked } })} />Gilt als Erfolg</label></fieldset>
    </> : null}
  </>;
}
export function AttributionEditor({ value, onChange }: { value: RuleAttribution; onChange(value: RuleAttribution): void }) {
  return <details><summary>Regelquellen bearbeiten</summary><label>Quellenbezeichnung<input value={value.title} maxLength={120} onChange={e => onChange({ ...value, title: e.target.value })} /></label><label>Lizenznachweis<input type="url" value={value.licenseUrl} maxLength={2048} onChange={e => onChange({ ...value, licenseUrl: e.target.value })} /></label><label>Hinweis<textarea value={value.notice} maxLength={1024} onChange={e => onChange({ ...value, notice: e.target.value })} /></label><label>Änderungen gegenüber der Quelle<textarea value={value.changes} maxLength={1024} onChange={e => onChange({ ...value, changes: e.target.value })} /></label>
    {value.sources.map((source, i) => { const update = (patch: Partial<typeof source>) => onChange({ ...value, sources: value.sources.map((item, index) => index === i ? { ...item, ...patch } : item) }); return <fieldset className="rf-card" key={i}><legend>Quelle {i + 1}</legend><label>Titel<input value={source.title} maxLength={120} onChange={e => update({ title: e.target.value })} /></label><label>Quelladresse<input type="url" value={source.url} maxLength={2048} onChange={e => update({ url: e.target.value })} /></label><label>Fassung<input value={source.revision} maxLength={120} onChange={e => update({ revision: e.target.value })} /></label><label>Urheber (eine Zeile pro Name)<textarea value={source.authors.join("\n")} onChange={e => update({ authors: e.target.value.split("\n") })} /></label><Button onClick={() => onChange({ ...value, sources: value.sources.filter((_, index) => index !== i) })}>Quelle entfernen</Button></fieldset>; })}
    <Button disabled={value.sources.length >= 8} onClick={() => onChange({ ...value, sources: [...value.sources, { title: "Neue Quelle", url: "https://example.org/", revision: "Eigene Fassung", authors: [] }] })}>Quelle hinzufügen</Button>
  </details>;
}
