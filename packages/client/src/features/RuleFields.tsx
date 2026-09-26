// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useId } from "react";
import { validateFieldValue, type FieldSchema, type Scalar } from "@chronicle/rules";
import { Button, announce } from "@chronicle/ui";
import { locale, t } from "../i18n";
import { displayNumber, rangeText, showsField, stepValue, textCounter, type RuleFieldsLayout, type RuleFieldsPart } from "./rule-fields-model";
import "./rule-fields.css";

// Short plain-language explanation of the expected content; omitted where the control is
// already self-explanatory (a checkbox, or a closed selection offered via <select>).
function fieldHint(field: FieldSchema): string | null {
  if (field.type === "boolean" || field.enum) return null;
  if (field.type === "integer" || field.type === "number") {
    const grenzen = { min: String(field.minimum), max: String(field.maximum), beispiel: String(field.default) };
    return field.type === "integer" ? t("Ganzzahl von {min} bis {max}, z. B. {beispiel}", grenzen) : t("Zahl von {min} bis {max}, z. B. {beispiel}", grenzen);
  }
  return typeof field.default === "string" && field.default.length
    ? t("Text, höchstens {max} Zeichen, z. B. „{beispiel}“", { max: String(field.maxLength), beispiel: field.default })
    : t("Text, höchstens {max} Zeichen", { max: String(field.maxLength) });
}
// Reuses the package's own field validator so this can never drift from what is actually
// enforced on save; only the German wording of the message is decided here.
function fieldError(field: FieldSchema, value: Scalar): string | null {
  try { validateFieldValue(field, value, "field"); return null; }
  catch {
    if (field.type === "boolean") return t("Bitte Ja oder Nein auswählen.");
    if (field.type === "integer" || field.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) return t("Bitte eine Zahl eingeben.");
      if (field.type === "integer" && !Number.isSafeInteger(value)) return t("Bitte eine ganze Zahl eingeben.");
      return t("Bitte einen Wert von {min} bis {max} eingeben.", { min: String(field.minimum), max: String(field.maximum) });
    }
    if (field.enum) return t("Bitte eine der vorgegebenen Optionen wählen.");
    return t("Bitte höchstens {max} Zeichen verwenden.", { max: String(field.maxLength) });
  }
}

export interface RuleFieldsProps {
  fields: Readonly<Record<string, FieldSchema>>;
  values: Readonly<Record<string, Scalar>>;
  onChange: (values: Record<string, Scalar>) => void;
  disabled?: boolean;
  /** "sheet" (Standard): Wertkacheln wie auf einem Charakterbogen. "form": das Formular der Regelschmiede. */
  layout?: RuleFieldsLayout;
  /** Nur „Wer ist die Figur?“ (identity) oder nur „Was kann sie?“ (values); Standard: alles. */
  part?: RuleFieldsPart;
  /** Diese Feldkennungen erscheinen gar nicht, etwa der Name, wenn der Ablauf ihn selbst abfragt. */
  omit?: readonly string[];
}

/**
 * Die Werte eines Bogens. Auf dem Bogen (Spec E3) ist jede Zahl eine Kachel mit − und +, der Bereich
 * steht leise darunter, die ausführliche Beschreibung hört nur der Bildschirmleser. Texte sind
 * Zeilen, deren Zeichengrenze erst kurz vor dem Ende erscheint. „Pflichtfeld“ und „optional“ gibt es
 * nur noch im Formular der Regelschmiede.
 */
export function RuleFields({ fields, values, onChange, disabled = false, layout = "sheet", part = "all", omit }: RuleFieldsProps) {
  const prefix = useId();
  const entries = Object.entries(fields).filter(([key, field]) => showsField(key, field, part, omit));
  if (layout === "form") return <div className="rule-fields">{entries.map(([key, field]) => {
    const value = values[key] ?? field.default, id = `${prefix}-${key}`;
    const update = (value: Scalar) => onChange({ ...values, [key]: value });
    const required = (field.type === "integer" || field.type === "number") && !field.enum;
    const hint = fieldHint(field), error = fieldError(field, value), hintId = `${id}-hint`, errorId = `${id}-error`, requirementId = `${id}-requirement`;
    const describedBy = [requirementId, hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
    return <div className="rule-field" key={key}><label htmlFor={id}>{field.label}</label><small id={requirementId}>{required ? t("Pflichtfeld") : t("optional")}</small>
      {field.type === "boolean" ? <input id={id} type="checkbox" checked={value === true} onChange={(e) => update(e.target.checked)} disabled={disabled} aria-describedby={describedBy} aria-invalid={error ? true : undefined} /> : field.enum ? <select id={id} value={String(value)} onChange={(e) => update(e.target.value)} disabled={disabled} aria-describedby={describedBy} aria-invalid={error ? true : undefined}>{field.enum.map((option) => <option key={option}>{option}</option>)}</select> : <input id={id} type={field.type === "string" ? "text" : "number"} value={typeof value === "boolean" ? String(value) : value} min={field.minimum} max={field.maximum} maxLength={field.maxLength} step={field.type === "integer" ? 1 : "any"} required={required} disabled={disabled} aria-describedby={describedBy} aria-invalid={error ? true : undefined} onChange={(e) => update(field.type === "string" || e.target.value === "" ? e.target.value : e.target.valueAsNumber)} />}
      {hint ? <p id={hintId} className="field-help">{hint}</p> : null}
      {error ? <span id={errorId} role="alert">{error}</span> : null}
    </div>;
  })}</div>;

  if (!entries.length) return null;
  return <div className="rule-fields is-sheet">{entries.map(([key, field]) => {
    const value = values[key] ?? field.default, id = `${prefix}-${key}`;
    const update = (value: Scalar) => onChange({ ...values, [key]: value });
    const error = fieldError(field, value), hintId = `${id}-hint`, errorId = `${id}-error`;
    const invalid = error ? true : undefined, errorText = error ? <span id={errorId} className="rule-field-error" role="alert">{error}</span> : null;
    const describe = (...ids: (string | null)[]) => [...ids, error ? errorId : null].filter(Boolean).join(" ") || undefined;

    if (field.type === "boolean") return <div className={`rule-field rule-field-row is-toggle${error ? " is-invalid" : ""}`} key={key}>
      <label className="rule-field-toggle"><input id={id} type="checkbox" checked={value === true} onChange={(e) => update(e.target.checked)} disabled={disabled} aria-describedby={describe()} aria-invalid={invalid} /><span>{field.label}</span></label>
      {errorText}
    </div>;

    if (field.enum) return <div className={`rule-field rule-field-row is-choice${error ? " is-invalid" : ""}`} key={key}>
      <label htmlFor={id}>{field.label}</label>
      <select id={id} value={String(value)} onChange={(e) => update(e.target.value)} disabled={disabled} aria-describedby={describe()} aria-invalid={invalid}>{field.enum.map((option) => <option key={option}>{option}</option>)}</select>
      {errorText}
    </div>;

    if (field.type === "string") {
      const counter = textCounter(value, field.maxLength);
      return <div className={`rule-field rule-field-row is-text${error ? " is-invalid" : ""}`} key={key}>
        <label htmlFor={id}>{field.label}</label>
        <input id={id} type="text" value={typeof value === "string" ? value : String(value)} maxLength={field.maxLength} disabled={disabled} aria-describedby={describe(hintId)} aria-invalid={invalid} onChange={(e) => update(e.target.value)} />
        {counter ? <span className="rule-field-count">{counter}</span> : null}
        <span id={hintId} className="sr-only">{t("Text, höchstens {max} Zeichen", { max: String(field.maxLength) })}</span>
        {errorText}
      </div>;
    }

    // Eine Zahl: die Kachel. − und + holen ein leeres Feld beim kleinsten Wert ab und verlassen den Bereich nie.
    const lower = stepValue(field, value, -1), raise = stepValue(field, value, 1);
    const zahl = (n: number) => n.toLocaleString(locale()), min = displayNumber(field.minimum ?? 0, zahl), max = displayNumber(field.maximum ?? 0, zahl);
    // Der Fokus bleibt auf − oder +; die neue Zahl hört man deshalb über die ruhige Live-Region. Sperrt
    // sich der Knopf mit diesem Schritt (Grenze erreicht), wandert der Fokus ins Zahlenfeld statt ins Leere.
    const step = (next: number | null, direction: 1 | -1) => {
      if (next === null) return;
      update(next); announce(t("{label} ist jetzt {wert}.", { label: field.label, wert: displayNumber(next, zahl) }));
      if (stepValue(field, next, direction) === null) document.getElementById(id)?.focus();
    };
    return <div className={`rule-field rule-field-tile${error ? " is-invalid" : ""}`} key={key}>
      <label htmlFor={id}>{field.label}</label>
      <div className="rule-field-stepper">
        <Button variant="quiet" className="rule-field-step" disabled={disabled || lower === null} onClick={() => step(lower, -1)}
          aria-label={lower === null && !disabled ? t("{label} um eins senken – {min} ist schon der kleinste Wert", { label: field.label, min }) : t("{label} um eins senken", { label: field.label })}>−</Button>
        <input id={id} type="number" inputMode={field.type === "integer" ? "numeric" : "decimal"} value={typeof value === "boolean" ? String(value) : value} min={field.minimum} max={field.maximum} step={field.type === "integer" ? 1 : "any"} required disabled={disabled} aria-describedby={describe(hintId)} aria-invalid={invalid}
          onChange={(e) => update(e.target.value === "" ? e.target.value : e.target.valueAsNumber)} />
        <Button variant="quiet" className="rule-field-step" disabled={disabled || raise === null} onClick={() => step(raise, 1)}
          aria-label={raise === null && !disabled ? t("{label} um eins erhöhen – {max} ist schon der größte Wert", { label: field.label, max }) : t("{label} um eins erhöhen", { label: field.label })}>+</Button>
      </div>
      <span className="rule-field-range" aria-hidden="true">{rangeText(field, zahl)}</span>
      <span id={hintId} className="sr-only">{t("Wert von {min} bis {max}", { min, max })}</span>
      {errorText}
    </div>;
  })}</div>;
}
