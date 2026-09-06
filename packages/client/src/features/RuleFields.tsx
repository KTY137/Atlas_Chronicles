import { useId } from "react";
import type { FieldSchema, Scalar } from "@chronicle/rules";

export function RuleFields({ fields, values, onChange, disabled = false }: { fields: Readonly<Record<string, FieldSchema>>; values: Readonly<Record<string, Scalar>>; onChange: (values: Record<string, Scalar>) => void; disabled?: boolean }) {
  const prefix = useId();
  return <div className="rule-fields">{Object.entries(fields).map(([key, field]) => {
    const value = values[key] ?? field.default, id = `${prefix}-${key}`;
    const update = (value: Scalar) => onChange({ ...values, [key]: value });
    return <div className="rule-field" key={key}><label htmlFor={id}>{field.label}</label>
      {field.type === "boolean" ? <input id={id} type="checkbox" checked={value === true} onChange={(e) => update(e.target.checked)} disabled={disabled} /> : field.enum ? <select id={id} value={String(value)} onChange={(e) => update(e.target.value)} disabled={disabled}>{field.enum.map((option) => <option key={option}>{option}</option>)}</select> : <input id={id} type={field.type === "string" ? "text" : "number"} value={typeof value === "boolean" ? String(value) : value} min={field.minimum} max={field.maximum} maxLength={field.maxLength} step={field.type === "integer" ? 1 : "any"} required disabled={disabled} onChange={(e) => update(field.type === "string" || e.target.value === "" ? e.target.value : e.target.valueAsNumber)} />}
    </div>;
  })}</div>;
}
