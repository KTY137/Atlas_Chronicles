// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useMemo, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { RULE_LIMITS, VITAL_COLORS, evaluateVitals, type AnyRulePackage, type RuleVital, type Scalar, type VitalColor } from "@chronicle/rules";
import { t } from "../i18n";
import { ExpressionInput, SchemaUpgrade } from "./RuleDeclarativeEditor";
import { RuleEntryList } from "./RuleEntryList";
import { VitalBar, vitalColorClass, vitalColorStyle } from "./Vitalanzeige";
import { fixtureValues, type RuleDraft } from "./rule-forge-model";
import { formulaReferences } from "./rule-map-model";
import { isOnSheet, placeOnSheet, retargetOnSheet } from "./rule-sheet-model";
import { VITAL_PRESETS, addExampleVital, addOwnVital, addVitalPreset, hasPreset, type VitalPresetId } from "./rule-vital-model";
import { resugarFormula } from "./formula-sugar";
import "./vitalanzeige.css";

function presetLabel(id: VitalPresetId): string {
  switch (id) { case "leben": return t("Leben"); case "mana": return t("Mana"); case "ausdauer": return t("Ausdauer"); }
}
const numeric = (type: string) => type === "integer" || type === "number";
function colorLabel(color: VitalColor): string {
  switch (color) {
    case "red": return t("Rot"); case "orange": return t("Orange"); case "yellow": return t("Gelb"); case "green": return t("Grün");
    case "teal": return t("Türkis"); case "blue": return t("Blau"); case "purple": return t("Violett"); case "grey": return t("Grau");
  }
}
/** Ohne Farbe gilt die Akzentfarbe; die Kennung verschwindet dann ganz, damit das Paket byteidentisch bleibt. */
function withColor(vital: RuleVital, color: RuleVital["color"]): RuleVital {
  const { color: _old, ...rest } = vital;
  return color ? { ...rest, color } : rest;
}

/** Palette (folgt dem Look) oder freie Farbe (gilt überall gleich), je Balken. */
function VitalColorPicker({ value, onChange }: { value: RuleVital["color"]; onChange(color: RuleVital["color"]): void }) {
  const custom = value?.startsWith("#") ? value : undefined;
  const swatch = (color: RuleVital["color"], label: string) => <button type="button" className={`rf-swatch${vitalColorClass(color)}`} style={vitalColorStyle(color)} aria-pressed={value === color} aria-label={label} title={label} onClick={() => onChange(color)}><span /></button>;
  return <fieldset className="rf-color-picker"><legend>{t("Farbe")}</legend>
    <div className="rf-swatches">{swatch(undefined, t("Akzentfarbe des Looks"))}{VITAL_COLORS.map(color => <span key={color}>{swatch(color, colorLabel(color))}</span>)}
      <label className="rf-swatch-custom">{t("Eigene Farbe")}<input type="color" value={custom ?? "#c0392b"} onChange={event => onChange(event.target.value.toLowerCase() as `#${string}`)} /></label></div>
    <small>{custom ? t("Eigene Farbe {wert}: gilt in jedem Look gleich.", { wert: custom }) : t("Palettenfarben passen sich dem gewählten Look an, auch hellen. Eine eigene Farbe gilt überall gleich.")}</small>
  </fieldset>;
}

/**
 * Die Balken der Figur als eigene Sektion: anlegen mit einem Klick, bearbeiten wie jeden anderen
 * Eintrag, und daneben der echte Balken der ersten Testfigur, dessen Stand sich verstellen lässt.
 * Gerechnet wird mit `evaluateVitals`, derselben Funktion wie auf dem Server.
 */
export function RuleVitalEditor({ draft, disabled, onChange, pkg, figureName, values, onValues }: {
  draft: RuleDraft; disabled: boolean; onChange(draft: RuleDraft): void;
  /** Die zuletzt gültige Fassung für die Vorschau; `null`, solange es keine gibt. */
  pkg: AnyRulePackage | null; figureName: string; values: Readonly<Record<string, Scalar>>; onValues(values: Record<string, Scalar>): void;
}) {
  const vitals = draft.vitals ?? [];
  const [selected, setSelected] = useState("");
  const current = vitals.find(vital => vital.id === selected) ?? vitals[0];
  if (draft.schemaVersion === 1) return <SchemaUpgrade draft={draft} disabled={disabled} onChange={onChange} />;
  const numbers = draft.fields.filter(field => numeric(field.type));
  const update = (patch: Partial<RuleVital>) => {
    if (!current) return;
    const next = { ...current, ...patch };
    let result: RuleDraft = { ...draft, vitals: vitals.map(vital => vital.id === current.id ? next : vital) };
    if (patch.id !== undefined) { result = retargetOnSheet(result, "vital", current.id, patch.id); setSelected(patch.id); }
    onChange(result);
  };
  const remove = () => { if (!current) return; const off = placeOnSheet(draft, "vital", current.id, false); onChange({ ...off, vitals: (off.vitals ?? []).filter(vital => vital.id !== current.id) }); setSelected(""); };
  const own = numbers.some(field => !vitals.some(vital => vital.id === field.id));
  const quick = <div className="rf-vital-quick" role="group" aria-label={t("Schnell anlegen")}>
    {VITAL_PRESETS.map(preset => { const done = hasPreset(draft, preset); return <Button key={preset.id} disabled={disabled || done || vitals.length >= RULE_LIMITS.vitals} onClick={() => { const result = addVitalPreset(draft, preset); onChange(result.draft); setSelected(result.id); }}>{done ? <Check size={15} /> : <Plus size={15} />}{presetLabel(preset.id)}</Button>; })}
    <Button variant="quiet" disabled={disabled || !own || vitals.length >= RULE_LIMITS.vitals} onClick={() => { const result = addOwnVital(draft); if (result) { onChange(result.draft); setSelected(result.id); } }}><Plus size={15} />{t("Eigener Balken")}</Button>
  </div>;
  return <div className="rf-split rf-split-live">
    <RuleEntryList title={t("Balken")} rows={vitals.map(vital => ({ key: vital.id, name: vital.label, detail: t("Höchststand {wert}", { wert: resugarFormula(vital.max) }) }))} current={current?.id} onSelect={setSelected}
      searchLabel={t("Balken suchen")} disabled={disabled}
      help={t("Leben, Mana, Ausdauer: eine Zahl auf dem Bogen, ein Höchststand und die Frage, was ein leerer Balken bedeutet. Ein Klick legt Attribut und Balken zugleich an.")}
      empty={t("Noch kein Balken. Ein Balken ist ein Vorrat, der im Spiel sinkt und steigt, zum Beispiel Leben 10 von 10.")} extra={quick}
      onExample={vitals.length < RULE_LIMITS.vitals ? () => { const result = addExampleVital(draft); onChange(result.draft); setSelected(result.id); } : undefined} />
    {current ? <section className="rf-detail" aria-label={t("Balken")}><fieldset className="rf-editor-fields" disabled={disabled}>
      <div className="rf-section-heading"><h4>{current.label || t("Ohne Namen")}</h4><Button variant="quiet" onClick={remove}><Trash2 size={15} />{t("Balken entfernen")}</Button></div>
      <div className="rf-form-grid">
        <label>{t("Beschriftung")}<input value={current.label} maxLength={RULE_LIMITS.label} onChange={event => update({ label: event.target.value })} /><small>{t("So steht der Balken auf dem Bogen, zum Beispiel Lebenspunkte.")}</small></label>
        <label>{t("Attribut für den Stand")}<select value={current.id} onChange={event => update({ id: event.target.value })}>{numbers.filter(field => field.id === current.id || !vitals.some(vital => vital.id === field.id)).map(field => <option key={field.localId} value={field.id}>{field.label || field.id}</option>)}</select><small>{t("Die Zahl, die im Spiel steigt und fällt. Jedes Zahlenattribut trägt höchstens einen Balken.")}</small></label>
      </div>
      <ExpressionInput label={t("Höchststand")} help={t("Der volle Balken, eine Zahl oder eine Rechnung wie @konstitution * 5.")} value={current.max} onChange={max => update({ max })} draft={draft} />
      <label>{t("Wenn der Balken leer ist")}<select value={current.depletion} onChange={event => update({ depletion: event.target.value as RuleVital["depletion"] })}><option value="none">{t("Nur die Leiste ist leer")}</option><option value="defeat">{t("Die Niederlage steht zur Bestätigung an")}</option></select></label>
      <VitalColorPicker value={current.color} onChange={color => onChange({ ...draft, vitals: vitals.map(vital => vital.id === current.id ? withColor(vital, color) : vital) })} />
      <label className="rf-check"><input type="checkbox" checked={isOnSheet(draft, "vital", current.id)} onChange={event => onChange(placeOnSheet(draft, "vital", current.id, event.target.checked))} />{t("Auf dem Bogen zeigen")}</label>
    </fieldset></section> : <section className="rf-detail rf-detail-empty"><p className="rf-help">{t("Wähle links einen Balken oder leg einen an.")}</p></section>}
    <LiveBars pkg={pkg} vital={current} figureName={figureName} values={values} onValues={onValues} />
  </div>;
}

/** Die Balken der ersten Testfigur, live. Der Schieber stellt den Stand des gewählten Balkens. */
function LiveBars({ pkg, vital, figureName, values, onValues }: { pkg: AnyRulePackage | null; vital: RuleVital | undefined; figureName: string; values: Readonly<Record<string, Scalar>>; onValues(values: Record<string, Scalar>): void }) {
  const full = useMemo(() => pkg ? fixtureValues(pkg.fields, values) : {}, [pkg, values]);
  const readings = useMemo(() => { if (!pkg) return []; try { return evaluateVitals(pkg, full); } catch { return []; } }, [pkg, full]);
  const reading = readings.find(row => row.id === vital?.id);
  const field = pkg && vital ? pkg.fields[vital.id] : undefined;
  const used = useMemo(() => (vital ? formulaReferences(vital.max)?.actor ?? [] : []).filter(id => id !== vital?.id && pkg && numeric(pkg.fields[id]?.type ?? "")), [vital, pkg]);
  const set = (id: string, value: number) => onValues({ ...values, [id]: value });
  return <aside className="rf-live-panel" aria-label={t("Live-Vorschau der Balken")}>
    <h4>{t("So sieht es am Tisch aus")}</h4>
    <p className="rf-help">{t("Testfigur {name}. Die Werte gehören nur der Vorschau und erscheinen auch auf der Testtafel.", { name: figureName })}</p>
    {!pkg ? <Notice>{t("Die Vorschau erscheint, sobald der Entwurf einmal gültig ist.")}</Notice> : !readings.length ? <p className="rf-help">{t("Noch keine Balken, die sich rechnen lassen.")}</p> : <div className="vitalanzeige">{readings.map(row => <VitalBar key={row.id} vital={row} label={row.label} />)}</div>}
    {reading && field && (field.type === "integer" || field.type === "number") ? <label>{t("Stand von {name}: {wert}", { name: reading.label, wert: reading.value })}
      <input type="range" min={field.minimum ?? 0} max={Math.max(field.minimum ?? 0, Math.min(field.maximum ?? reading.maximum, reading.maximum))} step={field.type === "integer" ? 1 : "any"} value={reading.value} onChange={event => set(vital!.id, Number(event.target.value))} />
      <small>{t("Zieh nach links, um Schaden zu zeigen. Bei 0 ist der Balken leer.")}</small></label> : null}
    {pkg && used.length ? <fieldset className="rf-live-inputs"><legend>{t("Der Höchststand rechnet mit")}</legend>{used.map(id => { const schema = pkg.fields[id]!; return <label key={id}>{schema.label}<input type="number" value={Number(full[id] ?? 0)} min={schema.minimum} max={schema.maximum} step={schema.type === "integer" ? 1 : "any"} onChange={event => { const next = Number(event.target.value); if (Number.isFinite(next)) set(id, next); }} /></label>; })}</fieldset> : null}
  </aside>;
}
