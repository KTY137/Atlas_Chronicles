// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useId, type ReactElement } from "react";
import { RULE_LIMITS } from "@chronicle/rules";
import { FUNCTION_HELP, typeWord, type FormulaOptions, type FormulaSources } from "./formula-sugar";
import { literalDraft, type FormulaDraft } from "./rule-forge-model";

export type BlockKind = "number" | "text" | "boolean" | "attribute" | "parameter" | "dice" | "calc" | "compare" | "negate" | "if" | "function";
export interface FormulaBlocksProps { value: FormulaDraft; onChange(next: FormulaDraft): void; sources: FormulaSources; options: FormulaOptions; disabled?: boolean; resultLabel?: string }
type Binary = Extract<FormulaDraft, { kind: "binary" }>;
const CALC: Binary["op"][] = ["+", "-", "*", "/", "%"], COMPARE: Binary["op"][] = ["==", "!=", ">", ">=", "<", "<=", "&&", "||"];
const OP_LABEL: Record<Binary["op"], string> = { "+": "+", "-": "−", "*": "×", "/": "÷", "%": "Rest", "==": "=", "!=": "≠", ">": ">", ">=": "≥", "<": "<", "<=": "≤", "&&": "und", "||": "oder" };
const PRECEDENCE: Record<Binary["op"], number> = { "||": 1, "&&": 2, "==": 3, "!=": 3, ">": 4, ">=": 4, "<": 4, "<=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };
const KIND_LABEL: Record<BlockKind, string> = { number: "Zahl", text: "Text", boolean: "Ja/Nein", attribute: "Attribut", parameter: "Parameter", dice: "Würfel", calc: "Rechnung", compare: "Vergleich", negate: "Umkehren", if: "Wenn … dann … sonst", function: "Funktion" };

export function blockKinds(sources: FormulaSources, options: FormulaOptions): readonly { id: BlockKind; label: string; disabled: boolean }[] {
  return (Object.keys(KIND_LABEL) as BlockKind[]).map(id => ({ id, label: KIND_LABEL[id], disabled: id === "attribute" ? !sources.actor.length : id === "parameter" ? !sources.input.length : id === "dice" ? !options.allowDice : false }));
}
export function blockFor(kind: BlockKind, sources: FormulaSources): FormulaDraft {
  switch (kind) {
    case "number": return literalDraft("number"); case "text": return literalDraft("string"); case "boolean": return literalDraft("boolean");
    case "attribute": return { kind: "field", source: "actor", field: sources.actor[0]?.id ?? "" };
    case "parameter": return { kind: "field", source: "input", field: sources.input[0]?.id ?? "" };
    case "dice": return { kind: "dice", count: "1", sides: "20", keep: "none", keepCount: "1", explode: "" };
    case "calc": return { kind: "binary", op: "+", left: literalDraft(), right: literalDraft() };
    case "compare": return { kind: "binary", op: ">=", left: literalDraft(), right: literalDraft() };
    case "negate": return { kind: "unary", op: "-", value: literalDraft() };
    case "if": return { kind: "if", condition: literalDraft("boolean"), then: literalDraft(), else: literalDraft() };
    case "function": return { kind: "call", name: "min", args: [literalDraft(), literalDraft()] };
  }
}
const kindOf = (value: FormulaDraft): BlockKind => value.kind === "literal" ? (value.type === "number" ? "number" : value.type === "string" ? "text" : "boolean") : value.kind === "field" ? (value.source === "actor" ? "attribute" : "parameter") : value.kind === "binary" ? (COMPARE.includes(value.op) ? "compare" : "calc") : value.kind === "unary" ? "negate" : value.kind === "call" ? "function" : value.kind;

interface BlockProps { value: FormulaDraft; onChange(next: FormulaDraft): void; onRemove?(): void; sources: FormulaSources; options: FormulaOptions; disabled: boolean; label: string; depth: number; parentPrecedence: number }
function Block({ value, onChange, onRemove, sources, options, disabled, label, depth, parentPrecedence }: BlockProps) {
  const id = useId(), kind = kindOf(value), canNest = depth < RULE_LIMITS.formulaDepth - 1;
  const child = (node: FormulaDraft, change: (next: FormulaDraft) => void, name: string, precedence = 0, remove?: () => void) => <Block value={node} onChange={change} onRemove={remove} sources={sources} options={options} disabled={disabled} label={name} depth={depth + 1} parentPrecedence={precedence} />;
  const wrap = (side: "left" | "right") => onChange(side === "right" ? { kind: "binary", op: "+", left: value, right: literalDraft() } : { kind: "binary", op: "+", left: literalDraft(), right: value });
  const precedence = value.kind === "binary" ? PRECEDENCE[value.op] : value.kind === "unary" ? 7 : 8, parens = precedence < parentPrecedence;
  const menu = <details className="ff-block-menu"><summary aria-label={`Menü für ${label}`}>⋯</summary>
    <label>Art wechseln<select value={kind} disabled={disabled} onChange={event => onChange(blockFor(event.target.value as BlockKind, sources))}>{blockKinds(sources, options).map(k => <option key={k.id} value={k.id} disabled={k.disabled || (!canNest && ["calc", "compare", "negate", "if", "function"].includes(k.id))}>{k.label}</option>)}</select></label>
    <div className="ff-block-menu-actions"><button type="button" disabled={disabled || !canNest} onClick={() => wrap("left")}>Links anhängen</button><button type="button" disabled={disabled || !canNest} onClick={() => wrap("right")}>Rechts anhängen</button>{onRemove ? <button type="button" disabled={disabled} onClick={onRemove}>Entfernen</button> : null}</div>
  </details>;
  let body: ReactElement;
  switch (value.kind) {
    case "literal": body = value.type === "boolean"
      ? <select aria-label={label} value={value.value} disabled={disabled} onChange={event => onChange({ ...value, value: event.target.value })}><option value="true">wahr</option><option value="false">falsch</option></select>
      : <input aria-label={label} type={value.type === "number" ? "number" : "text"} step="any" size={Math.max(3, value.value.length)} value={value.value} disabled={disabled} onChange={event => onChange({ ...value, value: event.target.value })} />; break;
    case "field": { const members = sources[value.source], found = members.find(m => m.id === value.field);
      body = <select aria-label={label} value={value.field} disabled={disabled} onChange={event => onChange({ ...value, field: event.target.value })}>{!found ? <option value={value.field}>{value.field ? `${value.field} (gibt es nicht mehr)` : "wählen …"}</option> : null}{members.map(m => <option key={m.id} value={m.id} title={typeWord(m.type)}>{m.label}</option>)}</select>; break; }
    case "dice": body = <span className="ff-dice"><input aria-label="Anzahl Würfel" type="number" min={1} max={RULE_LIMITS.dice} value={value.count} disabled={disabled} onChange={event => onChange({ ...value, count: event.target.value })} /><span>d</span><input aria-label="Seiten je Würfel" type="number" min={2} max={RULE_LIMITS.sides} value={value.sides} disabled={disabled} onChange={event => onChange({ ...value, sides: event.target.value })} />
      <select aria-label="Welche Würfel zählen" value={value.keep} disabled={disabled} onChange={event => onChange({ ...value, keep: event.target.value as typeof value.keep })}><option value="none">alle zählen</option><option value="highest">höchste behalten</option><option value="lowest">niedrigste behalten</option></select>
      {value.keep !== "none" ? <input aria-label="Wie viele behalten" type="number" min={1} max={RULE_LIMITS.dice} value={value.keepCount} disabled={disabled} onChange={event => onChange({ ...value, keepCount: event.target.value })} /> : null}
      <label className="ff-dice-explode"><input type="checkbox" checked={value.explode !== ""} disabled={disabled} onChange={event => onChange({ ...value, explode: event.target.checked ? "3" : "" })} />bei Höchstwurf weiterwürfeln</label>
      {value.explode !== "" ? <input aria-label="Höchstens so oft weiterwürfeln" type="number" min={1} max={RULE_LIMITS.explosions} value={value.explode} disabled={disabled} onChange={event => onChange({ ...value, explode: event.target.value })} /> : null}</span>; break;
    case "unary": body = <><select aria-label="Umkehrung" value={value.op} disabled={disabled} onChange={event => onChange({ ...value, op: event.target.value as "-" | "!" })}><option value="-">− (Vorzeichen umkehren)</option><option value="!">nicht</option></select>{child(value.value, next => onChange({ ...value, value: next }), "Wert", 7)}</>; break;
    case "binary": { const ops = COMPARE.includes(value.op) ? COMPARE : CALC;
      body = <>{child(value.left, left => onChange({ ...value, left }), "linke Seite", precedence, () => onChange(value.right))}<select aria-label="Rechenzeichen" value={value.op} disabled={disabled} onChange={event => onChange({ ...value, op: event.target.value as Binary["op"] })}>{ops.map(op => <option key={op} value={op}>{OP_LABEL[op]}</option>)}</select>{child(value.right, right => onChange({ ...value, right }), "rechte Seite", precedence + 1, () => onChange(value.left))}</>; break; }
    case "if": body = <><span className="ff-slot-label">wenn</span>{child(value.condition, condition => onChange({ ...value, condition }), "Bedingung")}<span className="ff-slot-label">dann</span>{child(value.then, then => onChange({ ...value, then }), "Wert wenn wahr")}<span className="ff-slot-label">sonst</span>{child(value.else, otherwise => onChange({ ...value, else: otherwise }), "Wert wenn falsch")}</>; break;
    case "call": { const help = FUNCTION_HELP.find(f => f.name === value.name), variadic = value.name === "min" || value.name === "max";
      body = <><select aria-label="Funktion" value={value.name} disabled={disabled} onChange={event => { const name = event.target.value as typeof value.name, knowledge = !!FUNCTION_HELP.find(f => f.name === name)?.knowledge; onChange({ ...value, name, args: name === "min" || name === "max" ? [literalDraft(), literalDraft()] : [literalDraft(knowledge ? "string" : "number")] }); }}>{FUNCTION_HELP.filter(f => f.name !== "if" && (options.allowKnowledge || !f.knowledge)).map(f => <option key={f.name} value={f.name}>{f.name} · {f.title}</option>)}</select>
        <span className="ff-block-paren">(</span>{value.args.map((arg, i) => <span className="ff-arg" key={i}>{i ? <span className="ff-block-paren">,</span> : null}{child(arg, next => onChange({ ...value, args: value.args.map((v, n) => n === i ? next : v) }), help?.knowledge ? "Etikett oder Kennung" : `Wert ${i + 1}`, 0, variadic && value.args.length > 2 ? () => onChange({ ...value, args: value.args.filter((_, n) => n !== i) }) : undefined)}</span>)}
        {variadic && value.args.length < 8 ? <button type="button" className="ff-add-arg" disabled={disabled} onClick={() => onChange({ ...value, args: [...value.args, literalDraft()] })} aria-label="Weiteren Wert anhängen">+</button> : null}<span className="ff-block-paren">)</span></>; break; }
  }
  return <span className={`ff-block ff-block-${kind}`} role="group" aria-label={label} id={id}>{parens ? <span className="ff-block-paren">(</span> : null}{body}{parens ? <span className="ff-block-paren">)</span> : null}{menu}</span>;
}
export function FormulaBlocks({ value, onChange, sources, options, disabled = false, resultLabel = "Formel" }: FormulaBlocksProps) {
  return <div className="ff-blocks"><Block value={value} onChange={onChange} sources={sources} options={options} disabled={disabled} label={resultLabel} depth={0} parentPrecedence={0} /></div>;
}
