// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { RULE_LIMITS, type FieldSchema } from "@chronicle/rules";
import { t } from "../i18n";
import { changeFieldType, moveItem, newField, uniqueId, type DraftField } from "./rule-forge-model";

function OrderButtons({ index, length, onMove }: { index: number; length: number; onMove(delta: -1 | 1): void }) {
  return <span className="rf-order"><Button variant="quiet" disabled={index === 0} aria-label={t("Nach oben verschieben")} onClick={() => onMove(-1)}><ArrowUp size={14} /></Button><Button variant="quiet" disabled={index === length - 1} aria-label={t("Nach unten verschieben")} onClick={() => onMove(1)}><ArrowDown size={14} /></Button></span>;
}

export function FieldList({ title, fields, onChange, compact = false }: { title: string; fields: DraftField[]; onChange(fields: DraftField[]): void; compact?: boolean }) {
  const [selected, setSelected] = useState(""), [query, setQuery] = useState("");
  const add = () => { const next = newField(uniqueId(compact ? "parameter" : "attribut", fields.map(f => f.id))); onChange([...fields, next]); setSelected(next.localId); };
  const sigil = compact ? "?" : "@";
  const editor = (field: DraftField, index: number) => <FieldEditor key={field.localId} field={field} index={index} length={fields.length} sigil={sigil} onChange={next => onChange(fields.map(f => f.localId === field.localId ? next : f))} onRemove={() => { onChange(fields.filter(f => f.localId !== field.localId)); setSelected(""); }} onMove={delta => onChange(moveItem(fields, index, delta))} />;
  const heading = <div className="rf-section-heading"><h3>{title}</h3><Button disabled={fields.length >= RULE_LIMITS.fields} onClick={add}><Plus size={15} />{compact ? t("Parameter hinzufügen") : t("Attribut hinzufügen")}</Button></div>;
  if (compact) return <>{heading}{!fields.length ? <p className="rf-help">{t("Keine Parameter. Die Aktion würfelt nur mit Attributen und festen Zahlen.")}</p> : null}{fields.map(editor)}</>;
  const current = fields.find(f => f.localId === selected) ?? fields[0];
  const shown = fields.filter(f => !query.trim() || `${f.label} ${f.id}`.toLocaleLowerCase("de").includes(query.trim().toLocaleLowerCase("de")));
  return <div className="rf-split">
    <nav className="rf-list" aria-label={t("Attribute")}>{heading}
      <p className="rf-help">{t("Die Werte, die jede Figur trägt, zum Beispiel Geschick oder Lebenspunkte. In Formeln als @kennung.")}</p>
      {fields.length >= 10 ? <label className="rf-list-search"><Search size={14} aria-hidden="true" /><input aria-label={t("Attribut suchen")} value={query} placeholder={t("Bezeichnung oder Kennung")} onChange={event => setQuery(event.target.value)} /></label> : null}
      <ul>{shown.map(f => <li key={f.localId}><button type="button" aria-current={f.localId === current?.localId ? "true" : undefined} onClick={() => setSelected(f.localId)}><strong>{f.label || t("Ohne Bezeichnung")}</strong><small>{f.type === "integer" ? t("{id} · ganze Zahl", { id: f.id }) : f.type === "number" ? t("{id} · Zahl", { id: f.id }) : f.type === "boolean" ? t("{id} · Ja/Nein", { id: f.id }) : t("{id} · Text", { id: f.id })}</small></button></li>)}</ul>
      {!fields.length ? <p>{t('Noch keine Attribute. Lege oben das erste an, zum Beispiel „Geschick" als ganze Zahl von 0 bis 6.')}</p> : null}
    </nav>
    {current ? <section className="rf-detail" aria-label={t("Attribut")}>{editor(current, fields.indexOf(current))}</section> : null}
  </div>;
}

function FieldEditor({ field, index, length, sigil, onChange, onRemove, onMove }: { field: DraftField; index: number; length: number; sigil: string; onChange(value: DraftField): void; onRemove(): void; onMove(delta: -1 | 1): void }) {
  const numericField = field.type === "integer" || field.type === "number";
  const min = Number(field.minimum), max = Number(field.maximum), def = Number(field.defaultValue);
  const idInvalid = field.id.trim() !== "" && !/^[a-z][a-z0-9_-]*$/.test(field.id);
  const rangeInverted = numericField && field.minimum.trim() !== "" && field.maximum.trim() !== "" && Number.isFinite(min) && Number.isFinite(max) && min > max;
  const defaultOutOfRange = numericField && !rangeInverted && field.defaultValue.trim() !== "" && Number.isFinite(def) && Number.isFinite(min) && Number.isFinite(max) && (def < min || def > max);
  const defaultTooLong = field.type === "string" && field.maxLength.trim() !== "" && Number.isFinite(Number(field.maxLength)) && field.defaultValue.length > Number(field.maxLength);
  return <article className="rf-card"><div className="rf-section-heading"><h4>{field.label || (sigil === "?" ? t("Parameter {n}", { n: index + 1 }) : t("Attribut {n}", { n: index + 1 }))}</h4><span className="rf-toolbar"><OrderButtons index={index} length={length} onMove={onMove} /><Button variant="quiet" aria-label={sigil === "?" ? t("Parameter {name} entfernen", { name: field.label }) : t("Attribut {name} entfernen", { name: field.label })} onClick={onRemove}><Trash2 size={15} /></Button></span></div>
    <div className="rf-form-grid"><label>{t("Bezeichnung")}<input value={field.label} maxLength={120} required onChange={e => onChange({ ...field, label: e.target.value })} /></label><label>{t("Kennung")}<input value={field.id} maxLength={96} required spellCheck={false} onChange={e => onChange({ ...field, id: e.target.value })} /><small>{t('So heißt das Attribut in Formeln: In Formeln als {zeichen}{kennung}. Nur Kleinbuchstaben, Ziffern und „_", beginnend mit einem Buchstaben; ein Bindestrich lässt sich in Formeln nicht verwenden.', { zeichen: sigil, kennung: field.id || t('kennung') })}</small></label><label>{t("Typ")}<select value={field.type} onChange={e => onChange(changeFieldType(field, e.target.value as FieldSchema["type"]))}><option value="integer">{t("Ganze Zahl")}</option><option value="number">{t("Zahl mit Nachkommastellen")}</option><option value="string">{t("Text")}</option><option value="boolean">{t("Wahr / falsch")}</option></select></label>
      <label>{t("Vorgabewert")}{field.type === "boolean" ? <select value={field.defaultValue} onChange={e => onChange({ ...field, defaultValue: e.target.value })}><option value="false">{t("Falsch")}</option><option value="true">{t("Wahr")}</option></select> : <input value={field.defaultValue} type={field.type === "string" ? "text" : "number"} step={field.type === "integer" ? 1 : "any"} onChange={e => onChange({ ...field, defaultValue: e.target.value })} />}<small>{t("Der Wert, den eine neue Figur erhält, bevor sie ihn ändert.")}</small></label>
      {numericField ? <><label>{t("Minimum")}<input type="number" value={field.minimum} step={field.type === "integer" ? 1 : "any"} required onChange={e => onChange({ ...field, minimum: e.target.value })} /></label><label>{t("Maximum")}<input type="number" value={field.maximum} step={field.type === "integer" ? 1 : "any"} required onChange={e => onChange({ ...field, maximum: e.target.value })} /><small>{t("Erlaubter Bereich, z. B. 0 bis 6 für eine kleine Eigenschaft oder 0 bis 20 für einen Fertigkeitswert.")}</small></label></> : null}
      {field.type === "string" ? <label>{t("Maximale Zeichen")}<input type="number" value={field.maxLength} min={1} max={4096} step={1} required onChange={e => onChange({ ...field, maxLength: e.target.value })} /><small>{t("Höchste erlaubte Textlänge, z. B. 120 für einen Namen.")}</small></label> : null}
    </div>
    {idInvalid ? <Notice error>{t("Die Kennung „{kennung}“ ist ungültig: Kleinbuchstaben, Ziffern, „_“ und „-“, das erste Zeichen muss ein Buchstabe sein. Beispiel: geschick.", { kennung: field.id })}</Notice> : null}
    {rangeInverted ? <Notice error>{t("Minimum ({min}) ist größer als Maximum ({max}). Setze das Minimum auf einen Wert kleiner oder gleich dem Maximum.", { min: field.minimum, max: field.maximum })}</Notice> : null}
    {defaultOutOfRange ? <Notice error>{t("Der Vorgabewert ({wert}) liegt außerhalb von Minimum und Maximum. Wähle einen Wert zwischen {min} und {max}.", { wert: field.defaultValue, min: field.minimum, max: field.maximum })}</Notice> : null}
    {defaultTooLong ? <Notice error>{t("Der Vorgabewert ist länger als das Zeichenlimit ({grenze}). Kürze den Text oder erhöhe „Maximale Zeichen“.", { grenze: field.maxLength })}</Notice> : null}
    {field.type === "string" ? <><label className="rf-check"><input type="checkbox" checked={field.hasEnum} onChange={e => onChange({ ...field, hasEnum: e.target.checked, enumValues: e.target.checked && !field.enumValues.length ? [field.defaultValue || "Wert"] : field.enumValues })} />{t("Auswahl auf festgelegte Texte beschränken")}</label>{field.hasEnum ? <div className="rf-enum">{field.enumValues.map((item, i) => <div className="rf-inline" key={i}><label>{t("Auswahlwert {n}", { n: i + 1 })}<input value={item} maxLength={4096} onChange={e => onChange({ ...field, enumValues: field.enumValues.map((value, n) => n === i ? e.target.value : value) })} /></label><Button variant="quiet" aria-label={t("Auswahlwert {n} entfernen", { n: i + 1 })} onClick={() => onChange({ ...field, enumValues: field.enumValues.filter((_, n) => n !== i) })}><Trash2 size={14} /></Button></div>)}<Button disabled={field.enumValues.length >= 64} onClick={() => onChange({ ...field, enumValues: [...field.enumValues, ""] })}><Plus size={14} />{t("Auswahlwert")}</Button></div> : null}</> : null}
  </article>;
}
