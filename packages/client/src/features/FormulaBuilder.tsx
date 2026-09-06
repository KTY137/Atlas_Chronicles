import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@chronicle/ui";
import { RULE_LIMITS, type FormulaType } from "@chronicle/rules";
import { literalDraft, type FormulaDraft } from "./rule-forge-model";

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
  return <div className="rf-formula"><FormulaNode {...props} depth={0} label={props.label ?? "Ergebnis der Aktion"} /></div>;
}

function FormulaNode({ value, onChange, fields, label, disabled = false, allowDice = true, allowKnowledge = true, depth }: Props & { depth: number }) {
  const prefix = useId(), kind = value.kind === "literal" ? `literal-${value.type}` : value.kind === "field" ? value.source : value.kind;
  const canNest = depth < RULE_LIMITS.formulaDepth;
  const child = (node: FormulaDraft, change: (v: FormulaDraft) => void, name: string) => <FormulaNode value={node} onChange={change} fields={fields} label={name} disabled={disabled} allowDice={allowDice} allowKnowledge={allowKnowledge} depth={depth + 1} />;
  return <fieldset className="rf-formula-node" disabled={disabled} data-node-kind={value.kind}>
    <legend>{label}</legend>
    <div className="rf-formula-head"><label htmlFor={`${prefix}-kind`}>Baustein<select id={`${prefix}-kind`} value={kind} onChange={e => onChange(initialNode(e.target.value, fields))}>
      <option value="literal-number">Zahl</option><option value="literal-string">Text</option><option value="literal-boolean">Wahr / falsch</option>
      <option value="actor" disabled={!Object.keys(fields.actor).length}>Charakterfeld</option><option value="input" disabled={!Object.keys(fields.input).length}>Eingabe der Aktion</option>
      {allowDice ? <option value="dice">Würfel</option> : null}<option value="binary" disabled={!canNest}>Berechnung / Vergleich</option><option value="unary" disabled={!canNest}>Vorzeichen / Verneinung</option>
      <option value="if" disabled={!canNest}>Wenn … dann … sonst</option><option value="call" disabled={!canNest}>Funktion / Wissen</option>
    </select></label><span className="rf-node-badge">{value.kind === "literal" ? value.type === "number" ? "Zahl" : value.type === "boolean" ? "Wahrheitswert" : "Text" : value.kind === "dice" ? "Zufall" : value.kind === "field" ? fields[value.source][value.field] ?? "Feld fehlt" : "Ausdruck"}</span></div>

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
