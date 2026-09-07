// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useId } from "react";
import { validateFieldValue, type FieldSchema, type Scalar } from "@chronicle/rules";

// Short plain-language explanation of the expected content; omitted where the control is
// already self-explanatory (a checkbox, or a closed selection offered via <select>).
function fieldHint(field: FieldSchema): string | null {
  if (field.type === "boolean" || field.enum) return null;
  if (field.type === "integer" || field.type === "number") return `${field.type === "integer" ? "Ganzzahl" : "Zahl"} von ${field.minimum} bis ${field.maximum}, z. B. ${field.default}`;
  const example = typeof field.default === "string" && field.default.length ? `, z. B. „${field.default}“` : "";
  return `Text, höchstens ${field.maxLength} Zeichen${example}`;
}
// Reuses the package's own field validator so this can never drift from what is actually
// enforced on save; only the German wording of the message is decided here.
function fieldError(field: FieldSchema, value: Scalar): string | null {
  try { validateFieldValue(field, value, "field"); return null; }
  catch {
    if (field.type === "boolean") return "Bitte Ja oder Nein auswählen.";
    if (field.type === "integer" || field.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) return "Bitte eine Zahl eingeben.";
      if (field.type === "integer" && !Number.isSafeInteger(value)) return "Bitte eine ganze Zahl eingeben.";
      return `Bitte einen Wert von ${field.minimum} bis ${field.maximum} eingeben.`;
    }
    if (field.enum) return "Bitte eine der vorgegebenen Optionen wählen.";
    return `Bitte höchstens ${field.maxLength} Zeichen verwenden.`;
  }
}

export function RuleFields({ fields, values, onChange, disabled = false }: { fields: Readonly<Record<string, FieldSchema>>; values: Readonly<Record<string, Scalar>>; onChange: (values: Record<string, Scalar>) => void; disabled?: boolean }) {
  const prefix = useId();
  return <div className="rule-fields">{Object.entries(fields).map(([key, field]) => {
    const value = values[key] ?? field.default, id = `${prefix}-${key}`;
    const update = (value: Scalar) => onChange({ ...values, [key]: value });
    const required = (field.type === "integer" || field.type === "number") && !field.enum;
    const hint = fieldHint(field), error = fieldError(field, value), hintId = `${id}-hint`, errorId = `${id}-error`, requirementId = `${id}-requirement`;
    const describedBy = [requirementId, hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
    return <div className="rule-field" key={key}><label htmlFor={id}>{field.label}</label><small id={requirementId}>{required ? "Pflichtfeld" : "optional"}</small>
      {field.type === "boolean" ? <input id={id} type="checkbox" checked={value === true} onChange={(e) => update(e.target.checked)} disabled={disabled} aria-describedby={describedBy} aria-invalid={error ? true : undefined} /> : field.enum ? <select id={id} value={String(value)} onChange={(e) => update(e.target.value)} disabled={disabled} aria-describedby={describedBy} aria-invalid={error ? true : undefined}>{field.enum.map((option) => <option key={option}>{option}</option>)}</select> : <input id={id} type={field.type === "string" ? "text" : "number"} value={typeof value === "boolean" ? String(value) : value} min={field.minimum} max={field.maximum} maxLength={field.maxLength} step={field.type === "integer" ? 1 : "any"} required={required} disabled={disabled} aria-describedby={describedBy} aria-invalid={error ? true : undefined} onChange={(e) => update(field.type === "string" || e.target.value === "" ? e.target.value : e.target.valueAsNumber)} />}
      {hint ? <p id={hintId} className="field-help">{hint}</p> : null}
      {error ? <span id={errorId} role="alert">{error}</span> : null}
    </div>;
  })}</div>;
}
