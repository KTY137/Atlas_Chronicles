// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useId } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { RULE_LIMITS, inferFormulaType, type FormulaType } from "@chronicle/rules";
import { t } from "../i18n";
import { compileFormula, formulaSource, literalDraft, type FormulaDraft } from "./rule-forge-model";

interface Props {
  value: FormulaDraft; onChange(value: FormulaDraft): void;
  fields: { actor: Readonly<Record<string, FormulaType>>; input: Readonly<Record<string, FormulaType>> };
  label?: string; disabled?: boolean; allowDice?: boolean; allowKnowledge?: boolean;
}
type BinaryOp = Extract<FormulaDraft, { kind: "binary" }>["op"];
type CallName = Extract<FormulaDraft, { kind: "call" }>["name"];
// Reihenfolge und Namen der Bausteine sind Daten; ihre Beschriftungen stehen als Literale in
// `operatorText` und `funktionsText` — `t` braucht ein Literal, und eine Tabelle am Modulkopf
// wäre einmal beim Import übersetzt und bliebe beim Sprachwechsel stehen.
const operators: BinaryOp[] = ["+", "-", "*", "/", "%", "==", "!=", ">", ">=", "<", "<=", "&&", "||"];
function operatorText(op: BinaryOp): string {
  switch (op) {
    case "-": return t("Subtrahieren −");
    case "*": return t("Multiplizieren ×");
    case "/": return t("Dividieren ÷");
    case "%": return t("Rest %");
    case "==": return t("Gleich =");
    case "!=": return t("Ungleich ≠");
    case ">": return t("Größer >");
    case ">=": return t("Mindestens ≥");
    case "<": return t("Kleiner <");
    case "<=": return t("Höchstens ≤");
    case "&&": return t("Und");
    case "||": return t("Oder");
    default: return t("Addieren +");
  }
}
const functions: { name: CallName; knowledge?: boolean }[] = [
  { name: "min" }, { name: "max" }, { name: "floor" }, { name: "ceil" }, { name: "round" }, { name: "abs" },
  { name: "haelt", knowledge: true }, { name: "haelt_etikett", knowledge: true }, { name: "erfahrungsgrad", knowledge: true },
];
function funktionsText(name: CallName): string {
  switch (name) {
    case "max": return t("Größter Wert");
    case "floor": return t("Abrunden");
    case "ceil": return t("Aufrunden");
    case "round": return t("Runden");
    case "abs": return t("Absoluter Betrag");
    case "haelt": return t("Passage wird gehalten");
    case "haelt_etikett": return t("Gehaltene Passagen mit Etikett zählen");
    case "erfahrungsgrad": return t("Erfahrungsgrad zu einem Etikett");
    default: return t("Kleinster Wert");
  }
}
const comparisonOps = new Set(["==", "!=", ">", ">=", "<", "<=", "&&", "||"]);
const typeLabel = (type: FormulaType): string => type === "number" ? t("Zahl") : type === "boolean" ? t("Wahr / falsch") : t("Text");
const namedFields = (fields: Readonly<Record<string, FormulaType>>): string => Object.entries(fields).map(([name, type]) => `${name} (${typeLabel(type)})`).join(", ");

/** Dieselbe Struktur- und Typprüfung, die auch das Regelpaket vor der Installation durchläuft — keine eigene Auswertung, nur ihre Vorbedingung. */
function checkFormula(node: FormulaDraft, fields: Props["fields"]): string | null {
  try { inferFormulaType(compileFormula(node), fields); return null; }
  catch (error) { return error instanceof Error ? error.message : t("Der Ausdruck konnte nicht geprüft werden."); }
}
function childDrafts(value: FormulaDraft): FormulaDraft[] {
  switch (value.kind) {
    case "unary": return [value.value];
    case "binary": return [value.left, value.right];
    case "if": return [value.condition, value.then, value.else];
    case "call": return value.args;
    default: return [];
  }
}
/** Feste Vorlage zum Übernehmen: ein Wurf mit Attributzuschlag gegen eine Schwelle — oder, falls Würfel/Attribut hier nicht passen, die nächstbeste gültige Variante. */
function exampleFormula(fields: Props["fields"], allowDice: boolean): { formula: FormulaDraft; hint: string } {
  const num = (value: string): FormulaDraft => ({ kind: "literal", type: "number", value });
  const attr = (name: string): FormulaDraft => ({ kind: "field", source: "actor", field: name });
  const die = (): FormulaDraft => ({ kind: "dice", count: "1", sides: "20", keep: "none", keepCount: "1", explode: "" });
  const bin = (op: Extract<FormulaDraft, { kind: "binary" }>["op"], left: FormulaDraft, right: FormulaDraft): FormulaDraft => ({ kind: "binary", op, left, right });
  const gate = (condition: FormulaDraft, then: FormulaDraft, otherwise: FormulaDraft): FormulaDraft => ({ kind: "if", condition, then, else: otherwise });
  const field = Object.entries(fields.actor).find(([, type]) => type === "number")?.[0];
  if (allowDice) {
    if (field) return { formula: gate(bin(">=", attr(field), num("12")), bin("+", die(), attr(field)), die()), hint: t("Wurf 1W20, dazu „{feld}“ als Zuschlag, sobald „{feld}“ mindestens 12 erreicht — sonst ein einfacher Wurf.", { feld: field }) };
    return { formula: bin("+", die(), num("2")), hint: t("Wurf 1W20 mit festem Zuschlag von 2. Lege ein Zahlenfeld am Charakter an, um stattdessen einen Attributzuschlag zu verwenden.") };
  }
  if (field) return { formula: gate(bin(">=", attr(field), num("10")), bin("+", attr(field), num("1")), attr(field)), hint: t("Erhöht „{feld}“ um 1, sobald „{feld}“ mindestens 10 erreicht — sonst bleibt der Wert gleich.", { feld: field }) };
  return { formula: num("0"), hint: t("Für ein Beispiel wird zunächst ein Zahlenfeld benötigt.") };
}
function initialNode(kind: string, fields: Props["fields"]): FormulaDraft {
  if (kind.startsWith("literal-")) return literalDraft(kind.slice(8) as FormulaType);
  if (kind === "actor" || kind === "input") return { kind: "field", source: kind, field: Object.keys(fields[kind])[0] ?? "" };
  if (kind === "dice") return { kind: "dice", count: "1", sides: "20", keep: "none", keepCount: "1", explode: "" };
  if (kind === "unary") return { kind: "unary", op: "-", value: literalDraft() };
  if (kind === "binary") return { kind: "binary", op: "+", left: literalDraft(), right: literalDraft() };
  if (kind === "if") return { kind: "if", condition: literalDraft("boolean"), then: literalDraft(), else: literalDraft() };
  return { kind: "call", name: "min", args: [literalDraft(), literalDraft()] };
}

export function FormulaBuilder(props: Props) {
  const { value, onChange, fields, disabled = false, allowDice = true } = props;
  const status = checkFormula(value, fields);
  const example = exampleFormula(fields, allowDice);
  let preview = "";
  try { preview = formulaSource(compileFormula(example.formula)); } catch { /* Vorlage bleibt ohne Textvorschau, falls sie ausnahmsweise nicht kompiliert. */ }
  return <div className="rf-formula">
    <details open><summary>{t("Was du hier bauen kannst")}</summary>
      <dl className="rf-value-list">
        {allowDice ? <div><dt>{t("Würfel")}</dt><dd>{t("Eine Anzahl W-Seiten, z. B. 1W20 oder 4W6 — wahlweise nur die höchsten oder niedrigsten Würfel gewertet.")}</dd></div> : null}
        <div><dt>{t("Charakterfelder")}</dt><dd>{Object.keys(fields.actor).length ? namedFields(fields.actor) : t("Noch keine Charakterfelder angelegt.")}</dd></div>
        <div><dt>{t("Aktionseingaben")}</dt><dd>{Object.keys(fields.input).length ? namedFields(fields.input) : t("Diese Aktion hat keine eigenen Eingaben.")}</dd></div>
        <div><dt>{t("Konstanten")}</dt><dd>{t("Feste Zahl, Text oder Wahr/Falsch.")}</dd></div>
        <div><dt>{t("Vergleiche")}</dt><dd>{operators.filter(op => comparisonOps.has(op)).map(op => operatorText(op)).join(", ")}</dd></div>
      </dl>
      <p>{t("Beispiel: {hinweis}", { hinweis: example.hint })}</p>
      {preview ? <code className="rf-expression">{preview}</code> : null}
      <Button variant="quiet" disabled={disabled} onClick={() => onChange(example.formula)}><Plus size={14} />{t("Beispiel übernehmen")}</Button>
    </details>
    <div className="rf-validation" aria-live="polite">{status ? <Notice error>{t("Ausdruck ist noch nicht gültig: {fehler}", { fehler: status })}</Notice> : <p><Check size={16} />{t("Ausdruck gültig.")}</p>}</div>
    <FormulaNode {...props} depth={0} label={props.label ?? t("Ergebnis der Aktion")} />
  </div>;
}

function FormulaNode({ value, onChange, fields, label, disabled = false, allowDice = true, allowKnowledge = true, depth }: Props & { depth: number }) {
  const prefix = useId(), kind = value.kind === "literal" ? `literal-${value.type}` : value.kind === "field" ? value.source : value.kind;
  const canNest = depth < RULE_LIMITS.formulaDepth;
  const child = (node: FormulaDraft, change: (v: FormulaDraft) => void, name: string) => <FormulaNode value={node} onChange={change} fields={fields} label={name} disabled={disabled} allowDice={allowDice} allowKnowledge={allowKnowledge} depth={depth + 1} />;
  const ownError = checkFormula(value, fields), hasChildError = childDrafts(value).some(node => checkFormula(node, fields) !== null);
  const localError = ownError && !hasChildError ? ownError : null;
  return <fieldset className="rf-formula-node" disabled={disabled} data-node-kind={value.kind}>
    <legend>{label}</legend>
    <div className="rf-formula-head"><label htmlFor={`${prefix}-kind`}>{t("Baustein")}<select id={`${prefix}-kind`} value={kind} onChange={e => onChange(initialNode(e.target.value, fields))}>
      <option value="literal-number">{t("Zahl")}</option><option value="literal-string">{t("Text")}</option><option value="literal-boolean">{t("Wahr / falsch")}</option>
      <option value="actor" disabled={!Object.keys(fields.actor).length}>{t("Charakterfeld")}</option><option value="input" disabled={!Object.keys(fields.input).length}>{t("Eingabe der Aktion")}</option>
      {allowDice ? <option value="dice">{t("Würfel")}</option> : null}<option value="binary" disabled={!canNest}>{t("Berechnung / Vergleich")}</option><option value="unary" disabled={!canNest}>{t("Vorzeichen / Verneinung")}</option>
      <option value="if" disabled={!canNest}>{t("Wenn … dann … sonst")}</option><option value="call" disabled={!canNest}>{t("Funktion / Wissen")}</option>
    </select></label><span className="rf-node-badge">{value.kind === "literal" ? value.type === "number" ? t("Zahl") : value.type === "boolean" ? t("Wahrheitswert") : t("Text") : value.kind === "dice" ? t("Zufall") : value.kind === "field" ? fields[value.source][value.field] ?? t("Feld fehlt") : t("Ausdruck")}</span></div>
    {localError ? <Notice error>{localError}</Notice> : null}

    {value.kind === "literal" ? <label htmlFor={`${prefix}-value`}>{t("Wert")}{value.type === "boolean" ? <select id={`${prefix}-value`} value={value.value} onChange={e => onChange({ ...value, value: e.target.value })}><option value="true">{t("Wahr")}</option><option value="false">{t("Falsch")}</option></select>
      : <input id={`${prefix}-value`} type={value.type === "number" ? "number" : "text"} step="any" value={value.value} required={value.type === "number"} maxLength={4096} onChange={e => onChange({ ...value, value: e.target.value })} />}</label> : null}

    {value.kind === "field" ? <label htmlFor={`${prefix}-field`}>{value.source === "actor" ? t("Charakterfeld") : t("Aktionseingabe")}<select id={`${prefix}-field`} value={value.field} required onChange={e => onChange({ ...value, field: e.target.value })}>
      {!Object.hasOwn(fields[value.source], value.field) ? <option value={value.field}>{value.field ? t("{feld} — nicht mehr vorhanden", { feld: value.field }) : t("Feld wählen")}</option> : null}
      {Object.entries(fields[value.source]).map(([name, type]) => <option key={name} value={name}>{name} · {typeLabel(type)}</option>)}
    </select></label> : null}

    {value.kind === "dice" ? <div className="rf-form-grid"><label>{t("Anzahl")}<input aria-label={t("Würfelanzahl")} type="number" min={1} max={RULE_LIMITS.dice} step={1} required value={value.count} onChange={e => onChange({ ...value, count: e.target.value })} /></label>
      <label>{t("Seiten")}<input aria-label={t("Würfelseiten")} type="number" min={2} max={RULE_LIMITS.sides} step={1} required value={value.sides} onChange={e => onChange({ ...value, sides: e.target.value })} /></label>
      <label>{t("Wertung")}<select value={value.keep} onChange={e => onChange({ ...value, keep: e.target.value as typeof value.keep })}><option value="none">{t("Alle Würfel")}</option><option value="highest">{t("Höchste behalten")}</option><option value="lowest">{t("Niedrigste behalten")}</option></select></label>
      {value.keep !== "none" ? <label>{t("Wie viele behalten?")}<input type="number" min={1} max={Number(value.count) || RULE_LIMITS.dice} step={1} required value={value.keepCount} onChange={e => onChange({ ...value, keepCount: e.target.value })} /></label> : null}
      <label className="rf-check"><input type="checkbox" checked={value.explode !== ""} onChange={e => onChange({ ...value, explode: e.target.checked ? "1" : "" })} />{t("Maximalen Wurf erneut würfeln")}</label>
      {value.explode !== "" ? <label>{t("Maximale Zusatzwürfe pro Würfel")}<input type="number" min={1} max={RULE_LIMITS.explosions} step={1} required value={value.explode} onChange={e => onChange({ ...value, explode: e.target.value })} /></label> : null}
    </div> : null}

    {value.kind === "binary" ? <><label>{t("Operation")}<select value={value.op} onChange={e => onChange({ ...value, op: e.target.value as typeof value.op })}>{operators.map(op => <option key={op} value={op}>{operatorText(op)}</option>)}</select></label><div className="rf-formula-children">{child(value.left, left => onChange({ ...value, left }), t("Linker Wert"))}{child(value.right, right => onChange({ ...value, right }), t("Rechter Wert"))}</div></> : null}
    {value.kind === "unary" ? <><label>{t("Operation")}<select value={value.op} onChange={e => onChange({ ...value, op: e.target.value as "-" | "!" })}><option value="-">{t("Vorzeichen umkehren")}</option><option value="!">{t("Wahr / falsch umkehren")}</option></select></label>{child(value.value, next => onChange({ ...value, value: next }), t("Ausgangswert"))}</> : null}
    {value.kind === "if" ? <div className="rf-formula-children">{child(value.condition, condition => onChange({ ...value, condition }), t("Wenn diese Bedingung gilt"))}{child(value.then, then => onChange({ ...value, then }), t("Dann dieser Wert"))}{child(value.else, otherwise => onChange({ ...value, else: otherwise }), t("Sonst dieser Wert"))}</div> : null}
    {value.kind === "call" ? <><label>{t("Funktion")}<select value={value.name} onChange={e => {
      const name = e.target.value as typeof value.name, knowledge = functions.find(f => f.name === name)?.knowledge;
      onChange({ ...value, name, args: name === "min" || name === "max" ? [literalDraft(), literalDraft()] : [literalDraft(knowledge ? "string" : "number")] });
    }}>{functions.filter(f => allowKnowledge || !f.knowledge).map(f => <option key={f.name} value={f.name}>{funktionsText(f.name)}</option>)}</select></label>
      {value.name === "erfahrungsgrad" ? <p className="rf-help">{t("Liefert „erfahren“, „gesprochen“, „gehoert“ oder „unbekannt“. Vergleiche diesen Text in einer Bedingung.")}</p> : value.name === "haelt" ? <p className="rf-help">{t("Prüft eine Passage anhand ihrer Kennung. Die Testtafel verwendet ausschließlich Beispielpassagen.")}</p> : value.name === "haelt_etikett" ? <p className="rf-help">{t("Zählt nur Passagen, die die handelnde Figur tatsächlich hält.")}</p> : null}
      <div className="rf-formula-children">{value.args.map((arg, i) => <div className="rf-function-arg" key={i}>{child(arg, next => onChange({ ...value, args: value.args.map((v, n) => n === i ? next : v) }), functions.find(f => f.name === value.name)?.knowledge ? value.name === "haelt" ? t("Passagenkennung") : t("Wissensetikett") : t("Wert {nummer}", { nummer: i + 1 }))}
        {(value.name === "min" || value.name === "max") && value.args.length > 2 ? <Button variant="quiet" aria-label={t("Wert {nummer} entfernen", { nummer: i + 1 })} onClick={() => onChange({ ...value, args: value.args.filter((_, n) => i !== n) })}><Trash2 size={14} />{t("Wert entfernen")}</Button> : null}</div>)}</div>
      {(value.name === "min" || value.name === "max") && value.args.length < 8 ? <Button onClick={() => onChange({ ...value, args: [...value.args, literalDraft()] })}><Plus size={14} />{t("Weiterer Wert")}</Button> : null}
    </> : null}
  </fieldset>;
}
