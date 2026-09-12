// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { RULE_LIMITS } from "@chronicle/rules";
import { t } from "../i18n";
import { FUNCTION_HELP, memberOptionLabel, memberUnusable, type FormulaOptions, type FormulaSources } from "./formula-sugar";
import { literalDraft, type FormulaDraft } from "./rule-forge-model";

export type BlockKind = "number" | "text" | "boolean" | "attribute" | "parameter" | "dice" | "calc" | "compare" | "negate" | "if" | "function";
export interface FormulaBlocksProps { value: FormulaDraft; onChange(next: FormulaDraft): void; sources: FormulaSources; options: FormulaOptions; disabled?: boolean; resultLabel?: string }
type Binary = Extract<FormulaDraft, { kind: "binary" }>;
const CALC: Binary["op"][] = ["+", "-", "*", "/", "%"], COMPARE: Binary["op"][] = ["==", "!=", ">", ">=", "<", "<=", "&&", "||"];
/** Das Zeichen eines Rechenschritts; die drei Wortformen stehen als Literal in einem Zweig,
 * damit `t` sie sieht. Die Symbole bleiben in jeder Sprache gleich. */
const opLabel = (op: Binary["op"]): string => {
  switch (op) {
    case "-": return "−";
    case "*": return "×";
    case "/": return "÷";
    case "%": return t("Rest");
    case "==": return "=";
    case "!=": return "≠";
    case ">=": return "≥";
    case "<=": return "≤";
    case "&&": return t("und");
    case "||": return t("oder");
    default: return op;
  }
};
const PRECEDENCE: Record<Binary["op"], number> = { "||": 1, "&&": 2, "==": 3, "!=": 3, ">": 4, ">=": 4, "<": 4, "<=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };
const KINDS: readonly BlockKind[] = ["number", "text", "boolean", "attribute", "parameter", "dice", "calc", "compare", "negate", "if", "function"];
function kindLabel(kind: BlockKind): string {
  switch (kind) {
    case "number": return t("Zahl");
    case "text": return t("Text");
    case "boolean": return t("Ja/Nein");
    case "attribute": return t("Attribut");
    case "parameter": return t("Parameter");
    case "dice": return t("Würfel");
    case "calc": return t("Rechnung");
    case "compare": return t("Vergleich");
    case "negate": return t("Umkehren");
    case "if": return t("Wenn … dann … sonst");
    case "function": return t("Funktion");
  }
}

export function blockKinds(sources: FormulaSources, options: FormulaOptions): readonly { id: BlockKind; label: string; disabled: boolean }[] {
  return KINDS.map(id => ({ id, label: kindLabel(id), disabled: id === "attribute" ? !sources.actor.length : id === "parameter" ? !sources.input.length : id === "dice" ? !options.allowDice : false }));
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
function BlockMenu({ label, children }: { label: string; children: ReactNode }) {
  const element = useRef<HTMLDetailsElement>(null), [open, setOpen] = useState(false);
  const close = (restore = false) => {
    if (!element.current) return;
    element.current.open = false;
    if (restore) element.current.querySelector("summary")?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => { if (!element.current?.contains(event.target as Node)) close(); };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside);
    return () => { document.removeEventListener("pointerdown", outside, true); document.removeEventListener("focusin", outside); };
  }, [open]);
  return <details ref={element} name="formula-block-menus" className="ff-block-menu" onToggle={event => setOpen(event.currentTarget.open)}
    onChange={() => close(true)} onClick={event => { if (event.target instanceof Element && event.target.closest("button")) close(true); }}
    onKeyDown={event => { if (event.key === "Escape" && !(event.target instanceof HTMLSelectElement)) { event.preventDefault(); event.stopPropagation(); close(true); } }}>
    <summary aria-label={t("Menü für {name}", { name: label })}>⋯</summary>{children}
  </details>;
}
function Block({ value, onChange, onRemove, sources, options, disabled, label, depth, parentPrecedence }: BlockProps) {
  const id = useId(), kind = kindOf(value), canNest = depth < RULE_LIMITS.formulaDepth - 1;
  const child = (node: FormulaDraft, change: (next: FormulaDraft) => void, name: string, precedence = 0, remove?: () => void) => <Block value={node} onChange={change} onRemove={remove} sources={sources} options={options} disabled={disabled} label={name} depth={depth + 1} parentPrecedence={precedence} />;
  const wrap = (side: "left" | "right") => onChange(side === "right" ? { kind: "binary", op: "+", left: value, right: literalDraft() } : { kind: "binary", op: "+", left: literalDraft(), right: value });
  const precedence = value.kind === "binary" ? PRECEDENCE[value.op] : value.kind === "unary" ? 7 : 8, parens = precedence < parentPrecedence;
  const menu = <BlockMenu label={label}>
    <label>{t("Art wechseln")}<select value={kind} disabled={disabled} onChange={event => onChange(blockFor(event.target.value as BlockKind, sources))}>{blockKinds(sources, options).map(k => <option key={k.id} value={k.id} disabled={k.disabled || (!canNest && ["calc", "compare", "negate", "if", "function"].includes(k.id))}>{k.label}</option>)}</select></label>
    <div className="ff-block-menu-actions"><button type="button" disabled={disabled || !canNest} onClick={() => wrap("left")}>{t("Links anhängen")}</button><button type="button" disabled={disabled || !canNest} onClick={() => wrap("right")}>{t("Rechts anhängen")}</button>{onRemove ? <button type="button" disabled={disabled} onClick={onRemove}>{t("Entfernen")}</button> : null}</div>
  </BlockMenu>;
  let body: ReactElement;
  switch (value.kind) {
    case "literal": body = value.type === "boolean"
      ? <select aria-label={label} value={value.value} disabled={disabled} onChange={event => onChange({ ...value, value: event.target.value })}><option value="true">{t("wahr")}</option><option value="false">{t("falsch")}</option></select>
      : <input aria-label={label} type={value.type === "number" ? "number" : "text"} step="any" size={Math.max(3, value.value.length)} value={value.value} disabled={disabled} onChange={event => onChange({ ...value, value: event.target.value })} />; break;
    case "field": { const members = sources[value.source], found = members.find(m => m.id === value.field);
      body = <select aria-label={label} value={value.field} disabled={disabled} onChange={event => onChange({ ...value, field: event.target.value })}>{!found ? <option value={value.field}>{value.field ? t("{id} (gibt es nicht mehr)", { id: value.field }) : t("wählen …")}</option> : null}{members.map(m => <option key={m.id} value={m.id} disabled={memberUnusable(m)}>{memberOptionLabel(m)}</option>)}</select>; break; }
    case "dice": body = <span className="ff-dice"><input aria-label={t("Anzahl Würfel")} type="number" min={1} max={RULE_LIMITS.dice} value={value.count} disabled={disabled} onChange={event => onChange({ ...value, count: event.target.value })} /><span>d</span><input aria-label={t("Seiten je Würfel")} type="number" min={2} max={RULE_LIMITS.sides} value={value.sides} disabled={disabled} onChange={event => onChange({ ...value, sides: event.target.value })} />
      <select aria-label={t("Welche Würfel zählen")} value={value.keep} disabled={disabled} onChange={event => onChange({ ...value, keep: event.target.value as typeof value.keep })}><option value="none">{t("alle zählen")}</option><option value="highest">{t("höchste behalten")}</option><option value="lowest">{t("niedrigste behalten")}</option></select>
      {value.keep !== "none" ? <input aria-label={t("Wie viele behalten")} type="number" min={1} max={RULE_LIMITS.dice} value={value.keepCount} disabled={disabled} onChange={event => onChange({ ...value, keepCount: event.target.value })} /> : null}
      <label className="ff-dice-explode"><input type="checkbox" checked={value.explode !== ""} disabled={disabled} onChange={event => onChange({ ...value, explode: event.target.checked ? "3" : "" })} />{t("bei Höchstwurf weiterwürfeln")}</label>
      {value.explode !== "" ? <input aria-label={t("Höchstens so oft weiterwürfeln")} type="number" min={1} max={RULE_LIMITS.explosions} value={value.explode} disabled={disabled} onChange={event => onChange({ ...value, explode: event.target.value })} /> : null}</span>; break;
    case "unary": body = <><select aria-label={t("Umkehrung")} value={value.op} disabled={disabled} onChange={event => onChange({ ...value, op: event.target.value as "-" | "!" })}><option value="-">{t("− (Vorzeichen umkehren)")}</option><option value="!">{t("nicht")}</option></select>{child(value.value, next => onChange({ ...value, value: next }), t("Wert"), 7)}</>; break;
    case "binary": { const ops = COMPARE.includes(value.op) ? COMPARE : CALC;
      body = <>{child(value.left, left => onChange({ ...value, left }), t("linke Seite"), precedence, () => onChange(value.right))}<select aria-label={t("Rechenzeichen")} value={value.op} disabled={disabled} onChange={event => onChange({ ...value, op: event.target.value as Binary["op"] })}>{ops.map(op => <option key={op} value={op}>{opLabel(op)}</option>)}</select>{child(value.right, right => onChange({ ...value, right }), t("rechte Seite"), precedence + 1, () => onChange(value.left))}</>; break; }
    case "if": body = <><span className="ff-slot-label">{t("wenn")}</span>{child(value.condition, condition => onChange({ ...value, condition }), t("Bedingung"))}<span className="ff-slot-label">{t("dann")}</span>{child(value.then, then => onChange({ ...value, then }), t("Wert wenn wahr"))}<span className="ff-slot-label">{t("sonst")}</span>{child(value.else, otherwise => onChange({ ...value, else: otherwise }), t("Wert wenn falsch"))}</>; break;
    case "call": { const help = FUNCTION_HELP.find(f => f.name === value.name), variadic = value.name === "min" || value.name === "max";
      body = <><select aria-label={t("Funktion")} value={value.name} disabled={disabled} onChange={event => { const name = event.target.value as typeof value.name, knowledge = !!FUNCTION_HELP.find(f => f.name === name)?.knowledge; onChange({ ...value, name, args: name === "min" || name === "max" ? [literalDraft(), literalDraft()] : [literalDraft(knowledge ? "string" : "number")] }); }}>{FUNCTION_HELP.filter(f => f.name !== "if" && (options.allowKnowledge || !f.knowledge)).map(f => <option key={f.name} value={f.name}>{f.name} · {f.title}</option>)}</select>
        <span className="ff-block-paren">(</span>{value.args.map((arg, i) => <span className="ff-arg" key={i}>{i ? <span className="ff-block-paren">,</span> : null}{child(arg, next => onChange({ ...value, args: value.args.map((v, n) => n === i ? next : v) }), help?.knowledge ? t("Etikett oder Kennung") : t("Wert {n}", { n: i + 1 }), 0, variadic && value.args.length > 2 ? () => onChange({ ...value, args: value.args.filter((_, n) => n !== i) }) : undefined)}</span>)}
        {variadic && value.args.length < 8 ? <button type="button" className="ff-add-arg" disabled={disabled} onClick={() => onChange({ ...value, args: [...value.args, literalDraft()] })} aria-label={t("Weiteren Wert anhängen")}>+</button> : null}<span className="ff-block-paren">)</span></>; break; }
  }
  return <span className={`ff-block ff-block-${kind}`} role="group" aria-label={label} id={id}>{parens ? <span className="ff-block-paren">(</span> : null}{body}{parens ? <span className="ff-block-paren">)</span> : null}{menu}</span>;
}
export function FormulaBlocks({ value, onChange, sources, options, disabled = false, resultLabel }: FormulaBlocksProps) {
  return <div className="ff-blocks"><Block value={value} onChange={onChange} sources={sources} options={options} disabled={disabled} label={resultLabel ?? t("Formel")} depth={0} parentPrecedence={0} /></div>;
}
