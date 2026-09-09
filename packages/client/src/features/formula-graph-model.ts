// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { inferFormulaType, type Formula, type FormulaType } from "@chronicle/rules";
import { t } from "../i18n";
import { fieldTypesOf, functionTitle, type FormulaSources } from "./formula-sugar";
import { copyJson } from "./rule-forge-model";

export type NodePath = readonly number[];
export type GraphKind = "attribute" | "parameter" | "dice" | "number" | "text" | "boolean" | "calc" | "compare" | "logic" | "negate" | "if" | "function";
export interface GraphNode { readonly id: string; readonly path: NodePath; readonly kind: GraphKind; readonly label: string; readonly detail: string; readonly type: FormulaType | "unknown"; readonly x: number; readonly y: number; readonly inputs: readonly string[] }
export interface GraphEdge { readonly from: string; readonly to: string; readonly slot: number }
export interface FormulaGraphLayout { readonly nodes: readonly GraphNode[]; readonly edges: readonly GraphEdge[]; readonly width: number; readonly height: number; readonly resultType: FormulaType | "unknown" }
export const NODE_WIDTH = 168, NODE_HEIGHT = 48, GAP_X = 56, GAP_Y = 14;
/** Das Zeichen eines Rechenschritts. Die drei Wortformen stehen als Zeichenkettenliteral in
 * einem Zweig, damit `t` sie sieht; die Symbole bleiben in jeder Sprache gleich. */
const opLabel = (op: string): string => {
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

const children = (node: Formula): readonly Formula[] => node.kind === "unary" ? [node.value] : node.kind === "binary" ? [node.left, node.right] : node.kind === "if" ? [node.condition, node.then, node.else] : node.kind === "call" ? node.args : [];
export function nodeAt(ast: Formula, path: NodePath): Formula { let node = ast; for (const index of path) { const next = children(node)[index]; if (!next) throw new Error(t("Diesen Teil der Formel gibt es nicht.")); node = next; } return node; }
function withChild(node: Formula, index: number, child: Formula): Formula {
  switch (node.kind) {
    case "unary": return { ...node, value: child };
    case "binary": return index === 0 ? { ...node, left: child } : { ...node, right: child };
    case "if": return index === 0 ? { ...node, condition: child } : index === 1 ? { ...node, then: child } : { ...node, else: child };
    case "call": return { ...node, args: node.args.map((arg, i) => i === index ? child : arg) };
    default: throw new Error(t("Dieser Teil der Formel hat keine Unterteile."));
  }
}
export function replaceAt(ast: Formula, path: NodePath, next: Formula): Formula {
  if (!path.length) return copyJson(next);
  const [index, ...rest] = path as [number, ...number[]]; const node = copyJson(ast);
  return withChild(node, index, replaceAt(children(node)[index]!, rest, next));
}
const placeholderFor = (parent: Formula, index: number): Formula => parent.kind === "if" && index === 0 || parent.kind === "unary" && parent.op === "!" || parent.kind === "binary" && (parent.op === "&&" || parent.op === "||") ? { kind: "literal", value: false } : parent.kind === "call" && ["haelt", "haelt_etikett", "erfahrungsgrad"].includes(parent.name) ? { kind: "literal", value: "" } : { kind: "literal", value: 0 };
const CALC_OPS = new Set(["+", "-", "*", "/", "%"]);
export function removeAt(ast: Formula, path: NodePath): Formula {
  if (!path.length) return { kind: "literal", value: 0 };
  const parentPath = path.slice(0, -1), index = path[path.length - 1]!, parent = nodeAt(ast, parentPath);
  // Only removing one side of a calculation promotes its sibling; comparisons, logic, if
  // and function arguments (besides variadic min/max) fall back to a typed placeholder.
  if (parent.kind === "binary" && CALC_OPS.has(parent.op)) return replaceAt(ast, parentPath, index === 0 ? parent.right : parent.left);
  if (parent.kind === "call" && (parent.name === "min" || parent.name === "max") && parent.args.length > 2) return replaceAt(ast, parentPath, { ...parent, args: parent.args.filter((_, i) => i !== index) });
  return replaceAt(ast, path, placeholderFor(parent, index));
}
export function wrapAt(ast: Formula, path: NodePath, op: "+" | "-" | "*" | "/"): Formula {
  return replaceAt(ast, path, { kind: "binary", op, left: nodeAt(ast, path), right: { kind: "literal", value: 0 } });
}
const prefix = (a: NodePath, b: NodePath) => a.length <= b.length && a.every((v, i) => v === b[i]);
export function moveSubtree(ast: Formula, from: NodePath, to: NodePath): Formula {
  if (prefix(from, to)) throw new Error(t("Ein Teil kann nicht in seinen eigenen Unterteil verschoben werden."));
  const moved = copyJson(nodeAt(ast, from)), parent = from.length ? nodeAt(ast, from.slice(0, -1)) : null;
  const cleared = parent ? replaceAt(ast, from, placeholderFor(parent, from[from.length - 1]!)) : ast;
  return replaceAt(cleared, to, moved);
}
function describe(node: Formula, sources: FormulaSources): { kind: GraphKind; label: string; detail: string } {
  switch (node.kind) {
    case "literal": return typeof node.value === "number" ? { kind: "number", label: String(node.value), detail: t("Zahl") } : typeof node.value === "boolean" ? { kind: "boolean", label: node.value ? t("wahr") : t("falsch"), detail: t("Ja/Nein") } : { kind: "text", label: `„${node.value}“`, detail: t("Text") };
    case "field": { const found = sources[node.source].find(m => m.id === node.field); return { kind: node.source === "actor" ? "attribute" : "parameter", label: found?.label ?? node.field, detail: !found ? t("gibt es nicht mehr") : node.source === "actor" ? t("Attribut · {id}", { id: node.field }) : t("Parameter · {id}", { id: node.field }) }; }
    case "dice": return { kind: "dice", label: `${node.count}d${node.sides}${node.keep ? (node.keep.mode === "highest" ? "kh" : "kl") + node.keep.count : ""}${node.explode ? "!" + node.explode : ""}`, detail: t("Würfel") };
    case "unary": return { kind: "negate", label: node.op === "-" ? "−" : t("nicht"), detail: t("Umkehren") };
    case "binary": return { kind: ["&&", "||"].includes(node.op) ? "logic" : ["+", "-", "*", "/", "%"].includes(node.op) ? "calc" : "compare", label: opLabel(node.op), detail: ["+", "-", "*", "/", "%"].includes(node.op) ? t("Rechnung") : t("Vergleich") };
    case "if": return { kind: "if", label: t("wenn"), detail: t("wenn · dann · sonst") };
    case "call": return { kind: "function", label: node.name, detail: functionTitle(node.name) };
  }
}
// Lexicographic path order: a node with a shorter path that is a prefix of a longer one comes
// first, and siblings compare by child index — this is exactly pre-order tree traversal.
const comparePath = (a: NodePath, b: NodePath): number => {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) { if (a[i] !== b[i]) return a[i]! - b[i]!; }
  return a.length - b.length;
};
export function formulaGraph(ast: Formula, sources: FormulaSources): FormulaGraphLayout {
  const fields = fieldTypesOf(sources), nodes: GraphNode[] = [], edges: (GraphEdge & { fromPath: NodePath })[] = [];
  const typeOf = (node: Formula): FormulaType | "unknown" => { try { return inferFormulaType(node, fields); } catch { return "unknown"; } };
  let depthMax = 0; let row = 0;
  // Leaves get consecutive rows in reading order; every parent sits at the mean of its children.
  const place = (node: Formula, path: NodePath, depth: number): { id: string; y: number } => {
    const id = ["n", ...path].join("."), kids = children(node); depthMax = Math.max(depthMax, depth);
    const placed = kids.map((child, i) => place(child, [...path, i], depth + 1));
    const y = placed.length ? placed.reduce((sum, p) => sum + p.y, 0) / placed.length : row++ * (NODE_HEIGHT + GAP_Y);
    for (const [i, child] of placed.entries()) edges.push({ from: child.id, to: id, slot: i, fromPath: [...path, i] });
    const { kind, label, detail } = describe(node, sources);
    nodes.push({ id, path, kind, label, detail, type: typeOf(node), x: depth, y, inputs: placed.map(p => p.id) });
    return { id, y };
  };
  place(ast, [], 0);
  // Order: parents before children in reading order (pre-order) so the tree reads left→right per row.
  const ordered = [...nodes].sort((a, b) => comparePath(a.path, b.path));
  const laid = ordered.map(n => ({ ...n, x: (depthMax - n.x) * (NODE_WIDTH + GAP_X) }));
  const orderedEdges = [...edges].sort((a, b) => comparePath(a.fromPath, b.fromPath)).map(({ fromPath: _fromPath, ...edge }) => edge);
  return { nodes: laid, edges: orderedEdges, width: (depthMax + 1) * NODE_WIDTH + depthMax * GAP_X, height: Math.max(1, row) * (NODE_HEIGHT + GAP_Y) - GAP_Y, resultType: typeOf(ast) };
}
