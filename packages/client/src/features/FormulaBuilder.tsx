import { useId } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button, Notice } from "@chronicle/ui";
import { RULE_LIMITS, inferFormulaType, type FormulaType } from "@chronicle/rules";
import { compileFormula, formulaSource, literalDraft, type FormulaDraft } from "./rule-forge-model";

interface Props {
  value: FormulaDraft; onChange(value: FormulaDraft): void;
  fields: { actor: Readonly<Record<string, FormulaType>>; input: Readonly<Record<string, FormulaType>> };
  label?: string; disabled?: boolean; allowDice?: boolean; allowKnowledge?: boolean;
}
const operators: [Extract<FormulaDraft, { kind: "binary" }>["op"], string][] = [
  ["+", "Addieren +"], ["-", "Subtrahieren −"], ["*", "Multiplizieren ×"], ["/", "Dividieren ÷"], ["%", "Rest %"],
  ["==", "Gleich ="], ["!=", "Ungleich ≠"], [">", "Größer >"], [">=", "Mindestens ≥"], ["<", "Kleiner <"], ["<=", "Höchstens ≤"], ["&&", "Und"], ["||", "Oder"],
];
const functions: { name: Extract<FormulaDraft, { kind: "call" }>["name"]; label: string; knowledge?: boolean }[] = [
  { name: "min", label: "Kleinster Wert" }, { name: "max", label: "Größter Wert" }, { name: "floor", label: "Abrunden" }, { name: "ceil", label: "Aufrunden" },
  { name: "round", label: "Runden" }, { name: "abs", label: "Absoluter Betrag" }, { name: "haelt", label: "Passage wird gehalten", knowledge: true },
  { name: "haelt_etikett", label: "Gehaltene Passagen mit Etikett zählen", knowledge: true }, { name: "erfahrungsgrad", label: "Erfahrungsgrad zu einem Etikett", knowledge: true },
];
const comparisonOps = new Set(["==", "!=", ">", ">=", "<", "<=", "&&", "||"]);
const typeLabel = (type: FormulaType): string => type === "number" ? "Zahl" : type === "boolean" ? "Wahr / falsch" : "Text";
const namedFields = (fields: Readonly<Record<string, FormulaType>>): string => Object.entries(fields).map(([name, type]) => `${name} (${typeLabel(type)})`).join(", ");

/** Dieselbe Struktur- und Typprüfung, die auch das Regelpaket vor der Installation durchläuft — keine eigene Auswertung, nur ihre Vorbedingung. */
function checkFormula(node: FormulaDraft, fields: Props["fields"]): string | null {
  try { inferFormulaType(compileFormula(node), fields); return null; }
  catch (error) { return error instanceof Error ? error.message : "Der Ausdruck konnte nicht geprüft werden."; }
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
    if (field) return { formula: gate(bin(">=", attr(field), num("12")), bin("+", die(), attr(field)), die()), hint: `Wurf 1W20, dazu „${field}“ als Zuschlag, sobald „${field}“ mindestens 12 erreicht — sonst ein einfacher Wurf.` };
    return { formula: bin("+", die(), num("2")), hint: "Wurf 1W20 mit festem Zuschlag von 2. Lege ein Zahlenfeld am Charakter an, um stattdessen einen Attributzuschlag zu verwenden." };
  }
  if (field) return { formula: gate(bin(">=", attr(field), num("10")), bin("+", attr(field), num("1")), attr(field)), hint: `Erhöht „${field}“ um 1, sobald „${field}“ mindestens 10 erreicht — sonst bleibt der Wert gleich.` };
  return { formula: num("0"), hint: "Für ein Beispiel wird zunächst ein Zahlenfeld benötigt." };
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
    <details open><summary>Was du hier bauen kannst</summary>
      <dl className="rf-value-list">
        {allowDice ? <div><dt>Würfel</dt><dd>Eine Anzahl W-Seiten, z. B. 1W20 oder 4W6 — wahlweise nur die höchsten oder niedrigsten Würfel gewertet.</dd></div> : null}
        <div><dt>Charakterfelder</dt><dd>{Object.keys(fields.actor).length ? namedFields(fields.actor) : "Noch keine Charakterfelder angelegt."}</dd></div>
        <div><dt>Aktionseingaben</dt><dd>{Object.keys(fields.input).length ? namedFields(fields.input) : "Diese Aktion hat keine eigenen Eingaben."}</dd></div>
        <div><dt>Konstanten</dt><dd>Feste Zahl, Text oder Wahr/Falsch.</dd></div>
        <div><dt>Vergleiche</dt><dd>{operators.filter(([op]) => comparisonOps.has(op)).map(([, name]) => name).join(", ")}</dd></div>
      </dl>
      <p>Beispiel: {example.hint}</p>
      {preview ? <code className="rf-expression">{preview}</code> : null}
      <Button variant="quiet" disabled={disabled} onClick={() => onChange(example.formula)}><Plus size={14} />Beispiel übernehmen</Button>
    </details>
    <div className="rf-validation" aria-live="polite">{status ? <Notice error>Ausdruck ist noch nicht gültig: {status}</Notice> : <p><Check size={16} />Ausdruck gültig.</p>}</div>
    <FormulaNode {...props} depth={0} label={props.label ?? "Ergebnis der Aktion"} />
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
    <div className="rf-formula-head"><label htmlFor={`${prefix}-kind`}>Baustein<select id={`${prefix}-kind`} value={kind} onChange={e => onChange(initialNode(e.target.value, fields))}>
      <option value="literal-number">Zahl</option><option value="literal-string">Text</option><option value="literal-boolean">Wahr / falsch</option>
      <option value="actor" disabled={!Object.keys(fields.actor).length}>Charakterfeld</option><option value="input" disabled={!Object.keys(fields.input).length}>Eingabe der Aktion</option>
      {allowDice ? <option value="dice">Würfel</option> : null}<option value="binary" disabled={!canNest}>Berechnung / Vergleich</option><option value="unary" disabled={!canNest}>Vorzeichen / Verneinung</option>
      <option value="if" disabled={!canNest}>Wenn … dann … sonst</option><option value="call" disabled={!canNest}>Funktion / Wissen</option>
    </select></label><span className="rf-node-badge">{value.kind === "literal" ? value.type === "number" ? "Zahl" : value.type === "boolean" ? "Wahrheitswert" : "Text" : value.kind === "dice" ? "Zufall" : value.kind === "field" ? fields[value.source][value.field] ?? "Feld fehlt" : "Ausdruck"}</span></div>
    {localError ? <Notice error>{localError}</Notice> : null}

    {value.kind === "literal" ? <label htmlFor={`${prefix}-value`}>Wert{value.type === "boolean" ? <select id={`${prefix}-value`} value={value.value} onChange={e => onChange({ ...value, value: e.target.value })}><option value="true">Wahr</option><option value="false">Falsch</option></select>
      : <input id={`${prefix}-value`} type={value.type === "number" ? "number" : "text"} step="any" value={value.value} required={value.type === "number"} maxLength={4096} onChange={e => onChange({ ...value, value: e.target.value })} />}</label> : null}

    {value.kind === "field" ? <label htmlFor={`${prefix}-field`}>{value.source === "actor" ? "Charakterfeld" : "Aktionseingabe"}<select id={`${prefix}-field`} value={value.field} required onChange={e => onChange({ ...value, field: e.target.value })}>
      {!Object.hasOwn(fields[value.source], value.field) ? <option value={value.field}>{value.field ? `${value.field} — nicht mehr vorhanden` : "Feld wählen"}</option> : null}
      {Object.entries(fields[value.source]).map(([name, type]) => <option key={name} value={name}>{name} · {type === "number" ? "Zahl" : type === "boolean" ? "Wahr / falsch" : "Text"}</option>)}
    </select></label> : null}

    {value.kind === "dice" ? <div className="rf-form-grid"><label>Anzahl<input aria-label="Würfelanzahl" type="number" min={1} max={RULE_LIMITS.dice} step={1} required value={value.count} onChange={e => onChange({ ...value, count: e.target.value })} /></label>
      <label>Seiten<input aria-label="Würfelseiten" type="number" min={2} max={RULE_LIMITS.sides} step={1} required value={value.sides} onChange={e => onChange({ ...value, sides: e.target.value })} /></label>
      <label>Wertung<select value={value.keep} onChange={e => onChange({ ...value, keep: e.target.value as typeof value.keep })}><option value="none">Alle Würfel</option><option value="highest">Höchste behalten</option><option value="lowest">Niedrigste behalten</option></select></label>
      {value.keep !== "none" ? <label>Wie viele behalten?<input type="number" min={1} max={Number(value.count) || RULE_LIMITS.dice} step={1} required value={value.keepCount} onChange={e => onChange({ ...value, keepCount: e.target.value })} /></label> : null}
      <label className="rf-check"><input type="checkbox" checked={value.explode !== ""} onChange={e => onChange({ ...value, explode: e.target.checked ? "1" : "" })} />Maximalen Wurf erneut würfeln</label>
      {value.explode !== "" ? <label>Maximale Zusatzwürfe pro Würfel<input type="number" min={1} max={RULE_LIMITS.explosions} step={1} required value={value.explode} onChange={e => onChange({ ...value, explode: e.target.value })} /></label> : null}
    </div> : null}

    {value.kind === "binary" ? <><label>Operation<select value={value.op} onChange={e => onChange({ ...value, op: e.target.value as typeof value.op })}>{operators.map(([op, name]) => <option key={op} value={op}>{name}</option>)}</select></label><div className="rf-formula-children">{child(value.left, left => onChange({ ...value, left }), "Linker Wert")}{child(value.right, right => onChange({ ...value, right }), "Rechter Wert")}</div></> : null}
    {value.kind === "unary" ? <><label>Operation<select value={value.op} onChange={e => onChange({ ...value, op: e.target.value as "-" | "!" })}><option value="-">Vorzeichen umkehren</option><option value="!">Wahr / falsch umkehren</option></select></label>{child(value.value, next => onChange({ ...value, value: next }), "Ausgangswert")}</> : null}
    {value.kind === "if" ? <div className="rf-formula-children">{child(value.condition, condition => onChange({ ...value, condition }), "Wenn diese Bedingung gilt")}{child(value.then, then => onChange({ ...value, then }), "Dann dieser Wert")}{child(value.else, otherwise => onChange({ ...value, else: otherwise }), "Sonst dieser Wert")}</div> : null}
    {value.kind === "call" ? <><label>Funktion<select value={value.name} onChange={e => {
      const name = e.target.value as typeof value.name, knowledge = functions.find(f => f.name === name)?.knowledge;
      onChange({ ...value, name, args: name === "min" || name === "max" ? [literalDraft(), literalDraft()] : [literalDraft(knowledge ? "string" : "number")] });
    }}>{functions.filter(f => allowKnowledge || !f.knowledge).map(f => <option key={f.name} value={f.name}>{f.label}</option>)}</select></label>
      {value.name === "erfahrungsgrad" ? <p className="rf-help">Liefert „erfahren“, „gesprochen“, „gehoert“ oder „unbekannt“. Vergleiche diesen Text in einer Bedingung.</p> : value.name === "haelt" ? <p className="rf-help">Prüft eine Passage anhand ihrer Kennung. Die Testtafel verwendet ausschließlich Beispielpassagen.</p> : value.name === "haelt_etikett" ? <p className="rf-help">Zählt nur Passagen, die die handelnde Figur tatsächlich hält.</p> : null}
      <div className="rf-formula-children">{value.args.map((arg, i) => <div className="rf-function-arg" key={i}>{child(arg, next => onChange({ ...value, args: value.args.map((v, n) => n === i ? next : v) }), functions.find(f => f.name === value.name)?.knowledge ? value.name === "haelt" ? "Passagenkennung" : "Wissensetikett" : `Wert ${i + 1}`)}
        {(value.name === "min" || value.name === "max") && value.args.length > 2 ? <Button variant="quiet" aria-label={`Wert ${i + 1} entfernen`} onClick={() => onChange({ ...value, args: value.args.filter((_, n) => i !== n) })}><Trash2 size={14} />Wert entfernen</Button> : null}</div>)}</div>
      {(value.name === "min" || value.name === "max") && value.args.length < 8 ? <Button onClick={() => onChange({ ...value, args: [...value.args, literalDraft()] })}><Plus size={14} />Weiterer Wert</Button> : null}
    </> : null}
  </fieldset>;
}
