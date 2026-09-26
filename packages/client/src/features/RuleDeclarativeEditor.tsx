// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useId, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { RULE_LIMITS, type ComputedField, type RuleAssertion, type RuleAttribution, type RuleOutcome, type OutcomeComparison } from "@chronicle/rules";
import { Button } from "@chronicle/ui";
import { FormulaField } from "./FormulaField";
import { RuleEntryList } from "./RuleEntryList";
import { isOnSheet, placeOnSheet, retargetOnSheet } from "./rule-sheet-model";
import { t } from "../i18n";
import { sourcesFromDraft } from "./formula-sugar";
import { moveItem, uniqueId, type RuleDraft, type DraftAction, type DraftField } from "./rule-forge-model";

const NO_INPUTS: readonly DraftField[] = [];
function comparisonLabel(comparison: OutcomeComparison): string {
  switch (comparison) {
    case "eq": return t("gleich"); case "lt": return t("kleiner als"); case "lte": return t("höchstens"); case "gt": return t("größer als"); default: return t("mindestens");
  }
}
export function ExpressionInput({ value, onChange, draft, action, label, help }: { value: string; onChange(value: string): void; draft: RuleDraft; action?: DraftAction; label: string; help?: string }) {
  const inputs = action?.inputs ?? NO_INPUTS;
  const sources = useMemo(() => sourcesFromDraft(draft.fields, inputs), [draft.fields, inputs]);
  return <FormulaField label={label} help={help} value={value} onChange={onChange} sources={sources} fields={draft.fields} inputs={inputs} actionId={action?.id} allowDice={false} allowKnowledge={false} />;
}
function AssertionEditor({ values, draft, action, onChange, limit, title }: { values: readonly RuleAssertion[]; draft: RuleDraft; action?: DraftAction; onChange(values: readonly RuleAssertion[]): void; limit: number; title: string }) {
  const update = (index: number, patch: Partial<RuleAssertion>) => onChange(values.map((value, i) => i === index ? { ...value, ...patch } : value));
  return <section><h3>{title}</h3><p className="rf-help">{t("Jede Bedingung muss wahr sein. Ihre Meldung erklärt, was vor dem Speichern oder Würfeln zu korrigieren ist.")}</p>
    {values.map((value, i) => <fieldset className="rf-card" key={i}><legend>{value.id || t("Bedingung {n}", { n: i + 1 })}</legend><div className="rf-form-grid"><label>{t("Kennung")}<input value={value.id} onChange={e => update(i, { id: e.target.value })} /></label><label>{t("Meldung")}<input value={value.message} maxLength={RULE_LIMITS.message} onChange={e => update(i, { message: e.target.value })} /></label></div>
      <ExpressionInput label={t("Bedingung")} value={value.expression} onChange={expression => update(i, { expression })} draft={draft} action={action} /><Button onClick={() => onChange(values.filter((_, index) => i !== index))}>{t("Bedingung entfernen")}</Button>
    </fieldset>)}<Button disabled={values.length >= limit} onClick={() => onChange([...values, { id: uniqueId("bedingung", values.map(v => v.id)), message: "Diese Werte sind noch nicht gültig.", expression: "true" }])}>{t("Bedingung hinzufügen")}</Button>
  </section>;
}
/** Pakete im Format 1 kennen keine abgeleiteten Werte, Regeln und Balken; das Einschalten ist ein ausdrücklicher Schritt. */
export function SchemaUpgrade({ draft, disabled = false, onChange }: { draft: RuleDraft; disabled?: boolean; onChange(draft: RuleDraft): void }) {
  return <section className="rf-card"><h3>{t("Abgeleitete Werte, Regeln und Balken")}</h3><p>{t("Damit wechselt dieses Paket auf das erweiterte Format. Lebenspunkte und andere Balken ändern Spielende dann über den Bogen, nicht über den alten Schnellknopf. Gespeicherte Würfelbelege behalten ihre bisherigen Regeln.")}</p><Button disabled={disabled} onClick={() => onChange({ ...draft, schemaVersion: 2 })}>{t("Abgeleitete Werte, Regeln und Balken einschalten")}</Button></section>;
}
const OnSheet = ({ draft, id, onChange }: { draft: RuleDraft; id: string; onChange(draft: RuleDraft): void }) =>
  <label className="rf-check"><input type="checkbox" checked={isOnSheet(draft, "computed", id)} onChange={event => onChange(placeOnSheet(draft, "computed", id, event.target.checked))} />{t("Auf dem Bogen zeigen")}</label>;

/** Abgeleitete Werte: Liste links, ein Wert rechts. Neue Werte liegen sofort auf dem Bogen. */
export function RuleComputedEditor({ draft, disabled = false, onChange }: { draft: RuleDraft; disabled?: boolean; onChange(draft: RuleDraft): void }) {
  const [selected, setSelected] = useState(0);
  if (draft.schemaVersion === 1) return <SchemaUpgrade draft={draft} disabled={disabled} onChange={onChange} />;
  const computed = draft.computed ?? [], index = Math.min(selected, computed.length - 1), value = computed[index];
  const change = (patch: Partial<ComputedField>) => {
    if (!value) return;
    const next = { ...draft, computed: computed.map((row, i) => i === index ? { ...row, ...patch } : row) };
    onChange(patch.id !== undefined ? retargetOnSheet(next, "computed", value.id, patch.id) : next);
  };
  const add = () => {
    const id = uniqueId("berechnet", [...draft.fields.map(f => f.id), ...computed.map(v => v.id)]);
    onChange(placeOnSheet({ ...draft, computed: [...computed, { id, label: "Neuer berechneter Wert", expression: "0" }] }, "computed", id, true)); setSelected(computed.length);
  };
  const remove = () => { if (!value) return; const off = placeOnSheet(draft, "computed", value.id, false); onChange({ ...off, computed: computed.filter((_, i) => i !== index) }); setSelected(Math.max(0, index - 1)); };
  return <div className="rf-split">
    <RuleEntryList title={t("Abgeleitete Werte")} rows={computed.map((row, i) => ({ key: String(i), name: row.label, detail: row.id }))} current={value ? String(index) : undefined} onSelect={key => setSelected(Number(key))}
      onAdd={computed.length < RULE_LIMITS.computed ? add : undefined} addLabel={t("Wert")} searchLabel={t("Abgeleiteten Wert suchen")} disabled={disabled}
      help={t("Werte, die sich aus Attributen ergeben, zum Beispiel ein Bonus aus Geschick. Sie werden bei der Anzeige berechnet und nicht gespeichert.")}
      empty={t("Noch kein abgeleiteter Wert. Leg oben einen an, zum Beispiel einen Bonus.")} />
    {value ? <section className="rf-detail" aria-label={t("Abgeleiteter Wert")}><fieldset className="rf-editor-fields" disabled={disabled}>
      <div className="rf-section-heading"><h4>{value.label || t("Ohne Namen")}</h4><Button variant="quiet" onClick={remove}><Trash2 size={15} />{t("Berechneten Wert entfernen")}</Button></div>
      <div className="rf-form-grid"><label>{t("Beschriftung")}<input value={value.label} maxLength={RULE_LIMITS.label} onChange={e => change({ label: e.target.value })} /></label><label>{t("Kennung")}<input value={value.id} spellCheck={false} onChange={e => change({ id: e.target.value })} /><small>{t("Nur zur Zuordnung. Formeln rechnen immer mit Attributen, nicht mit anderen abgeleiteten Werten.")}</small></label></div>
      <ExpressionInput label={t("Berechnung")} help={t("Ergibt sich aus Attributen, ohne Wurf.")} value={value.expression} onChange={expression => change({ expression })} draft={draft} />
      <OnSheet draft={draft} id={value.id} onChange={onChange} />
    </fieldset></section> : null}
  </div>;
}

/** Bogenregeln: Bedingungen, die jeder gespeicherte Bogen erfüllen muss. */
export function RuleConstraintEditor({ draft, disabled = false, onChange }: { draft: RuleDraft; disabled?: boolean; onChange(draft: RuleDraft): void }) {
  const [selected, setSelected] = useState(0);
  if (draft.schemaVersion === 1) return <SchemaUpgrade draft={draft} disabled={disabled} onChange={onChange} />;
  const rules = draft.constraints ?? [], index = Math.min(selected, rules.length - 1), rule = rules[index];
  const change = (patch: Partial<RuleAssertion>) => onChange({ ...draft, constraints: rules.map((row, i) => i === index ? { ...row, ...patch } : row) });
  return <div className="rf-split">
    <RuleEntryList title={t("Bogenregeln")} rows={rules.map((row, i) => ({ key: String(i), name: row.message, detail: row.id }))} current={rule ? String(index) : undefined} onSelect={key => setSelected(Number(key))}
      onAdd={rules.length < RULE_LIMITS.constraints ? () => { onChange({ ...draft, constraints: [...rules, { id: uniqueId("bedingung", rules.map(v => v.id)), message: "Diese Werte sind noch nicht gültig.", expression: "true" }] }); setSelected(rules.length); } : undefined}
      addLabel={t("Regel")} searchLabel={t("Bogenregel suchen")} disabled={disabled}
      help={t("Was jeder Bogen erfüllen muss, zum Beispiel: Die verteilten Punkte übersteigen das Budget nicht. Ist eine Regel verletzt, erscheint ihre Meldung beim Speichern des Bogens.")}
      empty={t("Keine Bogenregeln. Jeder Bogen mit gültigen Attributwerten lässt sich speichern.")} />
    {rule ? <section className="rf-detail" aria-label={t("Bogenregel")}><fieldset className="rf-editor-fields" disabled={disabled}>
      <div className="rf-section-heading"><h4>{rule.id || t("Bedingung {n}", { n: index + 1 })}</h4><Button variant="quiet" onClick={() => { onChange({ ...draft, constraints: rules.filter((_, i) => i !== index) }); setSelected(Math.max(0, index - 1)); }}><Trash2 size={15} />{t("Bedingung entfernen")}</Button></div>
      <div className="rf-form-grid"><label>{t("Meldung")}<input value={rule.message} maxLength={RULE_LIMITS.message} onChange={e => change({ message: e.target.value })} /><small>{t("Das liest, wer den Bogen speichern will, wenn die Regel verletzt ist.")}</small></label><label>{t("Kennung")}<input value={rule.id} spellCheck={false} onChange={e => change({ id: e.target.value })} /></label></div>
      <ExpressionInput label={t("Bedingung")} help={t("Muss wahr sein, zum Beispiel @punkte <= 30.")} value={rule.expression} onChange={expression => change({ expression })} draft={draft} />
    </fieldset></section> : null}
  </div>;
}

export function RuleActionExtensions({ draft, action, onChange }: { draft: RuleDraft; action: DraftAction; onChange(action: DraftAction): void }) {
  const controlId = useId();
  if (draft.schemaVersion !== 2) return null;
  const outcome = action.outcome;
  const changeOutcome = (value: RuleOutcome) => onChange({ ...action, thresholdEnabled: false, outcome: value });
  return <><AssertionEditor title={t("Voraussetzungen der Aktion")} values={action.preconditions ?? []} limit={RULE_LIMITS.preconditions} draft={draft} action={action} onChange={preconditions => onChange({ ...action, preconditions })} />
    <h3>{t("Ergebnis einordnen")}</h3><label className="rf-check"><input type="checkbox" checked={!!outcome} onChange={e => { if (e.target.checked) changeOutcome({ bands: [{ id: "success", label: "Gelungen", comparison: "lte", expression: "50", success: true }], fallback: { id: "failure", label: "Misslungen", success: false } }); else { const { outcome: _outcome, ...rest } = action; onChange(rest); } }} />{t("Geordnete Ergebnisbereiche verwenden")}</label>
    {outcome ? <><p>{t("Die erste passende Zeile entscheidet. Der eigentliche Wurf wird einmal ausgewertet; diese Vergleiche würfeln nicht erneut.")}</p>
      {outcome.bands.map((band, i) => { const update = (patch: Partial<typeof band>) => changeOutcome({ ...outcome, bands: outcome.bands.map((value, index) => index === i ? { ...value, ...patch } : value) }); return <fieldset className="rf-card" key={i}><legend>{t("Bereich {n}: {ergebnis}", { n: i + 1, ergebnis: band.label })}</legend><div className="rf-form-grid"><label>{t("Kennung")}<input value={band.id} onChange={e => update({ id: e.target.value })} /></label><label>{t("Ergebnistext")}<input value={band.label} maxLength={RULE_LIMITS.label} onChange={e => update({ label: e.target.value })} /></label></div><label htmlFor={`${controlId}-${i}`}>{t("Ergebnis vergleichen")}</label><select id={`${controlId}-${i}`} value={band.comparison} onChange={e => update({ comparison: e.target.value as OutcomeComparison })}>{(["eq", "lt", "lte", "gt", "gte"] as const).map(value => <option key={value} value={value}>{comparisonLabel(value)}</option>)}</select><ExpressionInput label={t("Vergleichswert")} value={band.expression} onChange={expression => update({ expression })} draft={draft} action={action} /><label className="rf-check"><input type="checkbox" checked={band.success} onChange={e => update({ success: e.target.checked })} />{t("Gilt als Erfolg")}</label><div className="button-row"><Button disabled={i === 0} onClick={() => changeOutcome({ ...outcome, bands: moveItem(outcome.bands, i, -1) })}>{t("Bereich nach oben")}</Button><Button disabled={i === outcome.bands.length - 1} onClick={() => changeOutcome({ ...outcome, bands: moveItem(outcome.bands, i, 1) })}>{t("Bereich nach unten")}</Button><Button onClick={() => changeOutcome({ ...outcome, bands: outcome.bands.filter((_, index) => index !== i) })}>{t("Bereich entfernen")}</Button></div></fieldset>; })}
      <Button disabled={outcome.bands.length >= RULE_LIMITS.outcomeBands} onClick={() => changeOutcome({ ...outcome, bands: [...outcome.bands, { id: uniqueId("bereich", [...outcome.bands.map(b => b.id), outcome.fallback.id]), label: "Neues Ergebnis", comparison: "eq", expression: "1", success: false }] })}>{t("Ergebnisbereich hinzufügen")}</Button>
      <fieldset className="rf-card"><legend>{t("Wenn kein Bereich passt")}</legend><label>{t("Kennung")}<input value={outcome.fallback.id} onChange={e => changeOutcome({ ...outcome, fallback: { ...outcome.fallback, id: e.target.value } })} /></label><label>{t("Ergebnistext")}<input value={outcome.fallback.label} maxLength={RULE_LIMITS.label} onChange={e => changeOutcome({ ...outcome, fallback: { ...outcome.fallback, label: e.target.value } })} /></label><label className="rf-check"><input type="checkbox" checked={outcome.fallback.success} onChange={e => changeOutcome({ ...outcome, fallback: { ...outcome.fallback, success: e.target.checked } })} />{t("Gilt als Erfolg")}</label></fieldset>
    </> : null}
  </>;
}
export function AttributionEditor({ value, onChange }: { value: RuleAttribution; onChange(value: RuleAttribution): void }) {
  return <details><summary>{t("Regelquellen bearbeiten")}</summary><label>{t("Quellenbezeichnung")}<input value={value.title} maxLength={RULE_LIMITS.label} onChange={e => onChange({ ...value, title: e.target.value })} /></label><label>{t("Lizenznachweis")}<input type="url" value={value.licenseUrl} maxLength={2048} onChange={e => onChange({ ...value, licenseUrl: e.target.value })} /></label><label>{t("Hinweis")}<textarea value={value.notice} maxLength={RULE_LIMITS.longText} onChange={e => onChange({ ...value, notice: e.target.value })} /></label><label>{t("Änderungen gegenüber der Quelle")}<textarea value={value.changes} maxLength={RULE_LIMITS.longText} onChange={e => onChange({ ...value, changes: e.target.value })} /></label>
    {value.sources.map((source, i) => { const update = (patch: Partial<typeof source>) => onChange({ ...value, sources: value.sources.map((item, index) => index === i ? { ...item, ...patch } : item) }); return <fieldset className="rf-card" key={i}><legend>{t("Quelle {n}", { n: i + 1 })}</legend><label>{t("Titel")}<input value={source.title} maxLength={RULE_LIMITS.label} onChange={e => update({ title: e.target.value })} /></label><label>{t("Quelladresse")}<input type="url" value={source.url} maxLength={2048} onChange={e => update({ url: e.target.value })} /></label><label>{t("Fassung")}<input value={source.revision} maxLength={RULE_LIMITS.label} onChange={e => update({ revision: e.target.value })} /></label><label>{t("Urheber (eine Zeile pro Name)")}<textarea value={source.authors.join("\n")} onChange={e => update({ authors: e.target.value.split("\n") })} /></label><Button onClick={() => onChange({ ...value, sources: value.sources.filter((_, index) => index !== i) })}>{t("Quelle entfernen")}</Button></fieldset>; })}
    <Button disabled={value.sources.length >= RULE_LIMITS.attributionSources} onClick={() => onChange({ ...value, sources: [...value.sources, { title: "Neue Quelle", url: "https://example.org/", revision: "Eigene Fassung", authors: [] }] })}>{t("Quelle hinzufügen")}</Button>
  </details>;
}
