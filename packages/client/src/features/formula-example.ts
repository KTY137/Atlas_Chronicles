// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { evaluateFormula, parseFormula, type Formula, type ProjectedKnowledge, type Scalar } from "@chronicle/rules";
import { resugarFormula, type FormulaSources } from "./formula-sugar";
import { formulaSource, scalarValue, type DraftField } from "./rule-forge-model";

export interface ExampleFigure { readonly name: string; readonly values: Readonly<Record<string, Scalar>>; readonly inputs: Readonly<Record<string, Readonly<Record<string, Scalar>>>>; readonly passages: ProjectedKnowledge["passages"] }
export interface ExampleContext { readonly seed: string; readonly actor: Readonly<Record<string, Scalar>>; readonly input: Readonly<Record<string, Scalar>>; readonly knowledge: ProjectedKnowledge; readonly name: string }
export interface ExamplePart { readonly label: string; readonly value: Scalar; readonly sign: "+" | "-" }
export type ExampleResult = { readonly ok: true; readonly value: Scalar; readonly parts: readonly ExamplePart[]; readonly text: string } | { readonly ok: false; readonly message: string };
export const DEFAULT_EXAMPLE_SEED = "00000001000000020000000300000004";

export function randomSeed(): string {
  const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
  const seed = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  return /^0+$/.test(seed) ? DEFAULT_EXAMPLE_SEED : seed;
}
function draftValues(fields: readonly DraftField[], given: Readonly<Record<string, Scalar>>): Record<string, Scalar> {
  const values: Record<string, Scalar> = {};
  for (const field of fields) {
    if (!/^[a-z][a-z0-9_-]*$/.test(field.id)) continue;
    if (Object.hasOwn(given, field.id)) { values[field.id] = given[field.id]!; continue; }
    try { values[field.id] = scalarValue(field.type === "integer" ? "number" : field.type, field.defaultValue, field.label); } catch { /* an incomplete draft field simply has no example value yet */ }
  }
  return values;
}
export function exampleContextFor(fields: readonly DraftField[], inputs: readonly DraftField[], figure: ExampleFigure | null, seed: string, actionId?: string): ExampleContext {
  return {
    seed, name: figure?.name || "Beispielfigur", actor: draftValues(fields, figure?.values ?? {}), input: draftValues(inputs, (actionId && figure?.inputs[actionId]) || {}),
    knowledge: { actorId: "beispiel", passages: figure?.passages ?? [] },
  };
}
/** Top-level `+`/`-` chain as ordered terms with their trace paths; anything else is a single term. */
function terms(ast: Formula, path: string, sign: "+" | "-"): { node: Formula; path: string; sign: "+" | "-" }[] {
  if (ast.kind === "binary" && (ast.op === "+" || ast.op === "-")) return [...terms(ast.left, `${path}.left`, sign), ...terms(ast.right, `${path}.right`, ast.op === "-" ? (sign === "+" ? "-" : "+") : sign)];
  return [{ node: ast, path, sign }];
}
function label(node: Formula, sources: FormulaSources): string {
  if (node.kind === "field") return sources[node.source].find(m => m.id === node.field)?.label ?? node.field;
  return resugarFormula(formulaSource(node));
}
const show = (value: Scalar): string => typeof value === "boolean" ? (value ? "trifft zu" : "trifft nicht zu") : typeof value === "number" ? String(Math.round(value * 100) / 100).replace(/^-/, "−") : `„${value}“`;
function plain(message: string): string {
  if (/division by zero/.test(message)) return "Mit den Beispielwerten teilt diese Formel durch null.";
  if (/unknown (actor|input)\./.test(message)) return "Die Formel verweist auf ein Attribut, das die Beispielfigur nicht hat.";
  if (/limit/.test(message)) return "Die Formel braucht mehr Rechenschritte, als erlaubt sind.";
  return "Das Beispiel lässt sich mit diesen Werten nicht berechnen.";
}
export function formulaExample(canonical: string, context: ExampleContext, sources: FormulaSources): ExampleResult {
  try {
    const ast = parseFormula(canonical), result = evaluateFormula(ast, { seed: context.seed, actor: context.actor, input: context.input, knowledge: context.knowledge });
    const chain = terms(ast, "root", "+");
    const parts: ExamplePart[] = chain.length > 1 ? chain.map(term => ({ sign: term.sign, label: label(term.node, sources), value: result.trace.find(step => step.path === term.path)?.value ?? 0 })) : [];
    const head = `Beispiel für ${context.name}: ${show(result.value)}`;
    const text = parts.length ? `${head} = ${parts.map((part, i) => `${i === 0 ? (part.sign === "-" ? "− " : "") : part.sign === "-" ? " − " : " + "}${show(part.value)} (${part.label})`).join("")}` : head;
    return { ok: true, value: result.value, parts, text };
  } catch (error) { return { ok: false, message: plain(error instanceof Error ? error.message : "") }; }
}
