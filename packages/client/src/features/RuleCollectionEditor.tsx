// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@chronicle/ui";
import { RULE_LIMITS, type FieldSchema, type RuleCollection, type Scalar } from "@chronicle/rules";
import { t } from "../i18n";
import { SchemaUpgrade } from "./RuleDeclarativeEditor";
import { RuleEntryList } from "./RuleEntryList";
import { copyJson, freeId, uniqueId, type RuleDraft } from "./rule-forge-model";
import { isOnSheet, placeOnSheet, retargetOnSheet, sheetTree, withSheetTree, withoutFields } from "./rule-sheet-model";

function collectionField(type: FieldSchema["type"] = "string"): FieldSchema {
  return type === "integer" || type === "number" ? { type, label: t("Wert"), minimum: 0, maximum: 100, default: 0 }
    : type === "boolean" ? { type, label: t("Wert"), default: false }
    : { type: "string", label: t("Wert"), maxLength: 120, default: "" };
}
function typeLabel(type: FieldSchema["type"]): string {
  switch (type) { case "integer": return t("Ganze Zahl"); case "number": return t("Zahl"); case "boolean": return t("Ja oder nein"); default: return t("Text"); }
}
function boundedNumber(value: number): number { return Math.max(-1e12, Math.min(1e12, Number.isFinite(value) ? value : 0)); }
function numeric(value: string, fallback: number): number { const next = Number(value); return Number.isFinite(next) ? boundedNumber(next) : fallback; }
function withPrimaryField(collection: RuleCollection, primaryField?: string): RuleCollection {
  const { primaryField: _primaryField, ...base } = collection;
  return primaryField ? { ...base, primaryField } : base;
}
function uniqueStrings(values: readonly string[], maxLength: number): string[] {
  const out: string[] = [], seen = new Set<string>();
  for (const raw of values) {
    const value = raw.slice(0, maxLength);
    if (!value || seen.has(value)) continue;
    seen.add(value); out.push(value);
    if (out.length >= RULE_LIMITS.enumValues) break;
  }
  return out;
}
function normalizedStringField(field: FieldSchema, patch: { maxLength?: number; defaultValue?: string; enumValues?: readonly string[] }): FieldSchema {
  if (field.type !== "string") return field;
  const maxLength = Math.max(1, Math.min(RULE_LIMITS.stringValue, Math.trunc(patch.maxLength ?? field.maxLength ?? 120)));
  const values = uniqueStrings(patch.enumValues ?? field.enum ?? [], maxLength);
  let defaultValue = (patch.defaultValue ?? String(field.default)).slice(0, maxLength);
  if (values.length && !values.includes(defaultValue)) defaultValue = values[0]!;
  return { type: "string", label: field.label, default: defaultValue, maxLength, ...(values.length ? { enum: values } : {}) };
}
function normalizedNumericField(field: FieldSchema, patch: { minimum?: number; maximum?: number; defaultValue?: number }, changed: "minimum" | "maximum" | "default"): FieldSchema {
  if (field.type !== "integer" && field.type !== "number") return field;
  const normalize = (value: number) => field.type === "integer" ? Math.trunc(boundedNumber(value)) : boundedNumber(value);
  let minimum = normalize(patch.minimum ?? field.minimum ?? 0), maximum = normalize(patch.maximum ?? field.maximum ?? 100);
  if (minimum > maximum) {
    if (changed === "minimum") maximum = minimum;
    else minimum = maximum;
  }
  let defaultValue = normalize(patch.defaultValue ?? Number(field.default));
  defaultValue = Math.max(minimum, Math.min(maximum, defaultValue));
  return { type: field.type, label: field.label, default: defaultValue, minimum, maximum };
}
function defaultCollectionRow(collection: RuleCollection): Record<string, Scalar> {
  return Object.fromEntries(Object.entries(collection.itemFields).map(([id, field]) => [id, field.default]));
}
function compatibleValue(field: FieldSchema, value: unknown): Scalar {
  if (field.type === "boolean") return typeof value === "boolean" ? value : field.default;
  if (field.type === "string") return typeof value === "string" && value.length <= (field.maxLength ?? RULE_LIMITS.stringValue) && (!field.enum || field.enum.includes(value)) ? value : field.default;
  if (typeof value !== "number" || !Number.isFinite(value) || field.type === "integer" && !Number.isSafeInteger(value)) return field.default;
  if (field.minimum !== undefined && value < field.minimum || field.maximum !== undefined && value > field.maximum) return field.default;
  return value;
}
function normalizeCollectionDefault(draft: RuleDraft, collection: RuleCollection, rename?: readonly [string, string]): RuleDraft {
  const storage = draft.fields.find(field => field.id === collection.storageField);
  if (!storage) return draft;
  let raw: unknown = [];
  try { raw = JSON.parse(storage.defaultValue || "[]"); } catch { raw = []; }
  const input = Array.isArray(raw) ? raw.slice(0, collection.maxItems) : [];
  const rows = input.map(item => {
    const source = item !== null && typeof item === "object" && !Array.isArray(item) ? { ...(item as Record<string, unknown>) } : {};
    if (rename && Object.hasOwn(source, rename[0])) { source[rename[1]] = source[rename[0]]; delete source[rename[0]]; }
    return Object.fromEntries(Object.entries(collection.itemFields).map(([id, field]) => [id, compatibleValue(field, source[id])]));
  });
  while (rows.length < collection.minItems) rows.push(defaultCollectionRow(collection));
  const defaultValue = JSON.stringify(rows);
  return { ...draft, fields: draft.fields.map(field => field.id === collection.storageField ? { ...field, defaultValue } : field) };
}

/**
 * Eine neue Liste samt Speicherattribut, schon auf dem Bogen. Den Bogen zuerst festhalten: sonst
 * landete das Speicherattribut der neuen Liste als rohes Textfeld unter „Weitere Felder“.
 */
export function withNewCollection(draft: RuleDraft, template?: { id: string; label: string; itemFields: Record<string, FieldSchema>; primaryField: string }): RuleDraft {
  const fixed = withSheetTree(draft, sheetTree(draft)), collections = fixed.collections ?? [];
  const id = template ? freeId(template.id, collections.map(row => row.id)) : uniqueId("sammlung", collections.map(row => row.id));
  const storageId = uniqueId(`${id}_daten`, fixed.fields.map(field => field.id));
  const storage = { localId: `collection-${Date.now()}-${storageId}`, id: storageId, label: `${id} Daten`, type: "string" as const, defaultValue: "[]", minimum: "0", maximum: "20", maxLength: String(RULE_LIMITS.stringValue), hasEnum: false, enumValues: [] };
  const created: RuleCollection = { id, label: template?.label ?? t("Neue Sammlung"), storageField: storageId, itemFields: template?.itemFields ?? { name: { type: "string", label: t("Name"), maxLength: 120, default: "" } }, minItems: 0, maxItems: 64, primaryField: template?.primaryField ?? "name" };
  return placeOnSheet({ ...fixed, fields: [...fixed.fields, storage], collections: [...collections, created] }, "collection", id, true);
}
/** „Mit Beispiel beginnen“ bei den Listen: Ausrüstung, je Gegenstand Name und Gewicht. */
export function withExampleCollection(draft: RuleDraft): RuleDraft {
  return withNewCollection(draft, { id: "ausruestung", label: t("Ausrüstung"), primaryField: "name", itemFields: {
    name: { type: "string", label: t("Name"), maxLength: 120, default: "" },
    gewicht: { type: "number", label: t("Gewicht"), minimum: 0, maximum: 1000, default: 1 },
  } });
}

/**
 * Listen: wiederholbare Einträge wie Waffen, Zauber oder Sprachen. Ihre Einträge liegen in einem
 * gewöhnlichen Textattribut des Bogens und reisen damit durch dieselbe Versions- und
 * Migrationslogik wie jedes Attribut.
 */
export function RuleCollectionEditor({ draft, disabled = false, onChange }: { draft: RuleDraft; disabled?: boolean; onChange(draft: RuleDraft): void }) {
  const [selected, setSelected] = useState(0);
  if (draft.schemaVersion === 1) return <SchemaUpgrade draft={draft} disabled={disabled} onChange={onChange} />;
  const collections = draft.collections ?? [], index = Math.min(selected, collections.length - 1), collection = collections[index];
  const replaceCollection = (nextCollection: RuleCollection, rename?: readonly [string, string]) => {
    const next = { ...draft, collections: collections.map((row, i) => i === index ? nextCollection : row) };
    onChange(normalizeCollectionDefault(next, nextCollection, rename));
  };
  const addCollection = (example = false) => { const next = example ? withExampleCollection(draft) : withNewCollection(draft); onChange(next); setSelected((next.collections ?? []).length - 1); };
  const remove = () => {
    if (!collection) return;
    const off = placeOnSheet(draft, "collection", collection.id, false);
    onChange(withoutFields({ ...off, collections: collections.filter((_, i) => i !== index) }, new Set([collection.storageField])));
    setSelected(Math.max(0, index - 1));
  };
  return <div className="rf-split">
    <RuleEntryList title={t("Listen")} rows={collections.map((row, i) => ({ key: String(i), name: row.label, detail: t("{n} Felder je Eintrag", { n: Object.keys(row.itemFields).length }) }))} current={collection ? String(index) : undefined} onSelect={key => setSelected(Number(key))}
      onAdd={() => addCollection()} addLabel={t("Liste")} searchLabel={t("Liste suchen")} disabled={disabled || collections.length >= RULE_LIMITS.collections}
      help={t("Wiederholbare Einträge wie Waffen, Zauber, Sprachen oder Angriffe. Jeder Eintrag hat dieselben Felder, zum Beispiel Name und Schaden.")}
      empty={t("Noch keine Liste. Eine Liste hält mehrere gleichartige Einträge, zum Beispiel die Ausrüstung mit Name und Gewicht je Gegenstand.")} onExample={() => addCollection(true)} />
    {collection ? <section className="rf-detail" aria-label={t("Liste")}><fieldset className="rf-editor-fields" disabled={disabled}>
      <div className="rf-section-heading"><h4>{collection.label}</h4><Button variant="quiet" onClick={remove}><Trash2 size={14} />{t("Liste entfernen")}</Button></div>
      <div className="rf-form-grid">
        <label>{t("Name")}<input value={collection.label} maxLength={RULE_LIMITS.label} onChange={event => replaceCollection({ ...collection, label: event.target.value })} /></label>
        <label>{t("Minimale Einträge")}<input type="number" min={0} max={collection.maxItems} value={collection.minItems} onChange={event => replaceCollection({ ...collection, minItems: Math.max(0, Math.min(collection.maxItems, event.target.valueAsNumber || 0)) })} /></label>
        <label>{t("Maximale Einträge")}<input type="number" min={Math.max(1, collection.minItems)} max={RULE_LIMITS.collectionItems} value={collection.maxItems} onChange={event => replaceCollection({ ...collection, maxItems: Math.max(Math.max(1, collection.minItems), Math.min(RULE_LIMITS.collectionItems, event.target.valueAsNumber || 1)) })} /></label>
        <label>{t("Wichtigstes Feld")}<select value={collection.primaryField ?? ""} onChange={event => replaceCollection(withPrimaryField(collection, event.target.value || undefined))}><option value="">—</option>{Object.entries(collection.itemFields).map(([id, field]) => <option key={id} value={id}>{field.label || id}</option>)}</select><small>{t("Steht in der Übersicht der Einträge vorne, zum Beispiel der Name.")}</small></label>
      </div>
      <details className="rf-advanced"><summary>{t("Für Fortgeschrittene")}</summary>
        <label>{t("Kennung")}<input value={collection.id} spellCheck={false} onChange={event => { const id = event.target.value; onChange(retargetOnSheet({ ...draft, collections: collections.map((row, i) => i === index ? { ...row, id } : row) }, "collection", collection.id, id)); }} /><small>{t("Unter diesem Namen merkt sich der Bogen die Liste. Nach dem ersten Spielabend nicht mehr ändern.")}</small></label>
      </details>
      <label className="rf-check"><input type="checkbox" checked={isOnSheet(draft, "collection", collection.id)} onChange={event => onChange(placeOnSheet(draft, "collection", collection.id, event.target.checked))} />{t("Auf dem Bogen zeigen")}</label>
      <h5>{t("Felder jedes Eintrags")}</h5>
      {Object.entries(collection.itemFields).map(([id, field]) => <div className="rf-card" key={id}><div className="rf-form-grid">
        <label>{t("Feldkennung")}<input value={id} spellCheck={false} onChange={event => { const nextId = event.target.value; const itemFields = Object.fromEntries(Object.entries(collection.itemFields).map(([key, value]) => [key === id ? nextId : key, value])); const nextCollection = withPrimaryField({ ...collection, itemFields }, collection.primaryField === id ? nextId : collection.primaryField); replaceCollection(nextCollection, [id, nextId]); }} /></label>
        <label>{t("Beschriftung")}<input value={field.label} maxLength={RULE_LIMITS.label} onChange={event => replaceCollection({ ...collection, itemFields: { ...collection.itemFields, [id]: { ...field, label: event.target.value } } })} /></label>
        <label>{t("Art")}<select value={field.type} onChange={event => { const type = event.target.value as FieldSchema["type"]; replaceCollection({ ...collection, itemFields: { ...collection.itemFields, [id]: collectionField(type) } }); }}>{(["string", "integer", "number", "boolean"] as const).map(type => <option key={type} value={type}>{typeLabel(type)}</option>)}</select></label>
        {field.type === "boolean" ? <label className="rf-check"><input type="checkbox" checked={field.default as boolean} onChange={event => replaceCollection({ ...collection, itemFields: { ...collection.itemFields, [id]: { ...field, default: event.target.checked } } })} />{t("Vorgabe")}</label>
          : field.type === "string" ? <><label>{t("Vorgabe")}{field.enum?.length ? <select value={field.default as string} onChange={event => replaceCollection({ ...collection, itemFields: { ...collection.itemFields, [id]: normalizedStringField(field, { defaultValue: event.target.value }) } })}>{field.enum.map(value => <option key={value}>{value}</option>)}</select> : <input value={field.default as string} onChange={event => replaceCollection({ ...collection, itemFields: { ...collection.itemFields, [id]: normalizedStringField(field, { defaultValue: event.target.value }) } })} />}</label><label>{t("Zeichenlimit")}<input type="number" min={1} max={RULE_LIMITS.stringValue} value={field.maxLength} onChange={event => replaceCollection({ ...collection, itemFields: { ...collection.itemFields, [id]: normalizedStringField(field, { maxLength: event.target.valueAsNumber || 1 }) } })} /></label><label>{t("Auswahlwerte (Komma)")}<input value={field.enum?.join(", ") ?? ""} onChange={event => { const enumValues = event.target.value.split(",").map(value => value.trim()).filter(Boolean); replaceCollection({ ...collection, itemFields: { ...collection.itemFields, [id]: normalizedStringField(field, { enumValues }) } }); }} /></label></>
          : <><label>{t("Vorgabe")}<input type="number" value={field.default as number} onChange={event => replaceCollection({ ...collection, itemFields: { ...collection.itemFields, [id]: normalizedNumericField(field, { defaultValue: numeric(event.target.value, field.default as number) }, "default") } })} /></label><label>{t("Minimum")}<input type="number" value={field.minimum} onChange={event => replaceCollection({ ...collection, itemFields: { ...collection.itemFields, [id]: normalizedNumericField(field, { minimum: numeric(event.target.value, field.minimum!) }, "minimum") } })} /></label><label>{t("Maximum")}<input type="number" value={field.maximum} onChange={event => replaceCollection({ ...collection, itemFields: { ...collection.itemFields, [id]: normalizedNumericField(field, { maximum: numeric(event.target.value, field.maximum!) }, "maximum") } })} /></label></>}
      </div><Button variant="quiet" disabled={Object.keys(collection.itemFields).length <= 1} onClick={() => { const itemFields = copyJson(collection.itemFields) as Record<string, FieldSchema>; delete itemFields[id]; const nextCollection = withPrimaryField({ ...collection, itemFields }, collection.primaryField === id ? undefined : collection.primaryField); replaceCollection(nextCollection); }}><Trash2 size={14} />{t("Feld entfernen")}</Button></div>)}
      <Button disabled={Object.keys(collection.itemFields).length >= RULE_LIMITS.collectionItemFields} onClick={() => { const id = uniqueId("feld", Object.keys(collection.itemFields)); replaceCollection({ ...collection, itemFields: { ...collection.itemFields, [id]: collectionField() } }); }}><Plus size={14} />{t("Feld für jeden Eintrag")}</Button>
    </fieldset></section> : null}
  </div>;
}
