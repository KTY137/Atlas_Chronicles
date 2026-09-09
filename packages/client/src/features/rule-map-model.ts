// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseFormula, type Formula, type FormulaType } from "@chronicle/rules";
import { t } from "../i18n";
import { resugarFormula } from "./formula-sugar";
import { draftExpression, type DraftField, type RuleDraft } from "./rule-forge-model";

/** Die Regelkarte liest den Entwurf und macht aus jedem Teil einen Knoten, aus jedem Verweis in
 * einer Formel eine Verbindung. Sie schreibt nichts; bearbeitet wird über den Entwurf selbst. */
export type RuleMapKind = "attribute" | "computed" | "rule" | "bar" | "action";
export type RuleMapRole = "berechnung" | "bedingung" | "hoechststand" | "stand" | "ergebnis" | "voraussetzung" | "bereich";
export type RuleMapStatus = "ok" | "hint" | "error";
export interface RuleMapFormula { readonly role: RuleMapRole; readonly label: string; readonly expression: string; readonly index: number }
export interface RuleMapParameter { readonly id: string; readonly label: string; readonly type: FormulaType }
export interface RuleMapNode {
  readonly id: string; readonly kind: RuleMapKind; readonly key: string; readonly localId?: string;
  readonly label: string; readonly detail: string; readonly group?: string;
  readonly formulas: readonly RuleMapFormula[]; readonly parameters: readonly RuleMapParameter[];
  readonly status: RuleMapStatus; readonly message?: string;
}
export interface RuleMapEdge { readonly from: string; readonly to: string; readonly via: RuleMapRole }
export interface RuleMapIssue { readonly nodeId: string; readonly status: Exclude<RuleMapStatus, "ok">; readonly message: string }
export interface RuleMapGraph { readonly nodes: readonly RuleMapNode[]; readonly edges: readonly RuleMapEdge[]; readonly issues: readonly RuleMapIssue[] }

export const attributeNodeId = (key: string): string => `attribute:${key}`;
export function kindLabel(kind: RuleMapKind): string {
  switch (kind) {
    case "attribute": return t("Attribut");
    case "computed": return t("Abgeleiteter Wert");
    case "rule": return t("Regel");
    case "bar": return t("Balken");
    case "action": return t("Aktion");
  }
}
export function roleLabel(role: RuleMapRole): string {
  switch (role) {
    case "berechnung": return t("Berechnung");
    case "bedingung": return t("Bedingung");
    case "hoechststand": return t("Höchststand");
    case "stand": return t("Stand");
    case "ergebnis": return t("Ergebnis");
    case "voraussetzung": return t("Voraussetzung");
    case "bereich": return t("Ergebnisbereich");
  }
}
const typeWord = (type: FormulaType): string => type === "number" ? t("Zahl") : type === "boolean" ? t("Ja/Nein") : t("Text");
const fieldType = (field: DraftField): FormulaType => field.type === "integer" ? "number" : field.type;
function attributeDetail(field: DraftField): string {
  if (field.type === "integer" || field.type === "number") return t("Zahl {von} bis {bis}", { von: field.minimum, bis: field.maximum });
  if (field.type === "boolean") return t("Ja/Nein");
  return field.hasEnum ? t("Auswahl: {werte}", { werte: field.enumValues.join(", ") }) : t("Text");
}
const sugar = (expression: string): string => { try { return resugarFormula(expression); } catch { return expression; } };

/** Alle Verweise einer Formel: welche Attribute und Parameter sie liest. `null`, wenn sie nicht lesbar ist. */
export function formulaReferences(expression: string): { actor: readonly string[]; input: readonly string[] } | null {
  let ast: Formula;
  try { ast = parseFormula(expression); } catch { return null; }
  const readsActor = new Set<string>(), readsInput = new Set<string>();
  const walk = (node: Formula): void => {
    switch (node.kind) {
      case "field": (node.source === "actor" ? readsActor : readsInput).add(node.field); return;
      case "unary": walk(node.value); return;
      case "binary": walk(node.left); walk(node.right); return;
      case "if": walk(node.condition); walk(node.then); walk(node.else); return;
      case "call": node.args.forEach(walk); return;
      default: return;
    }
  };
  walk(ast);
  return { actor: [...readsActor], input: [...readsInput] };
}

interface Pending { node: Omit<RuleMapNode, "status" | "message">; messages: { status: Exclude<RuleMapStatus, "ok">; message: string }[] }
export function ruleMapGraph(draft: RuleDraft): RuleMapGraph {
  const known = new Set(draft.fields.map(f => f.id));
  const groupOf = new Map<string, string>();
  for (const section of draft.sections) for (const key of section.fieldKeys) { const field = draft.fields.find(f => f.localId === key); if (field) groupOf.set(field.id, section.label); }
  const pending: Pending[] = [], edges: RuleMapEdge[] = [], seen = new Set<string>(), used = new Set<string>();
  const connect = (from: string, to: string, via: RuleMapRole) => { const key = `${from}→${to}`; if (seen.has(key)) return; seen.add(key); edges.push({ from, to, via }); };
  const read = (entry: Pending, parameters: readonly RuleMapParameter[]) => {
    for (const formula of entry.node.formulas) {
      const refs = formulaReferences(formula.expression);
      if (!refs) { entry.messages.push({ status: "error", message: t("Die Formel lässt sich nicht lesen. Öffne den Knoten und korrigiere sie.") }); continue; }
      for (const id of refs.actor) {
        if (known.has(id)) { used.add(id); connect(attributeNodeId(id), entry.node.id, formula.role); }
        else entry.messages.push({ status: "error", message: t("Verweist auf @{kennung}, das es in diesem Paket nicht gibt.", { kennung: id }) });
      }
      for (const id of refs.input) if (!parameters.some(p => p.id === id)) entry.messages.push({ status: "error", message: t("Verweist auf ?{kennung}, das diese Aktion nicht als Parameter hat.", { kennung: id }) });
    }
  };
  // Attributes in sheet order (section by section), then whatever no section lists.
  const bySheet = draft.sections.flatMap(s => s.fieldKeys.map(key => draft.fields.find(f => f.localId === key))).filter((f): f is DraftField => f !== undefined);
  const orderedFields = [...bySheet, ...draft.fields.filter(f => !bySheet.includes(f))];
  for (const field of orderedFields) {
    pending.push({ node: { id: attributeNodeId(field.id), kind: "attribute", key: field.id, localId: field.localId, label: field.label || field.id, detail: attributeDetail(field), group: groupOf.get(field.id) ?? t("Ohne Bogenabschnitt"), formulas: [], parameters: [] }, messages: [] });
  }
  for (const value of draft.computed ?? []) {
    const entry: Pending = { node: { id: `computed:${value.id}`, kind: "computed", key: value.id, label: value.label || value.id, detail: t("= {formel}", { formel: sugar(value.expression) }), formulas: [{ role: "berechnung", label: t("Berechnung"), expression: value.expression, index: 0 }], parameters: [] }, messages: [] };
    read(entry, []); pending.push(entry);
  }
  for (const rule of draft.constraints ?? []) {
    const entry: Pending = { node: { id: `rule:${rule.id}`, kind: "rule", key: rule.id, label: rule.message || rule.id, detail: t("Gilt, wenn {formel}", { formel: sugar(rule.expression) }), formulas: [{ role: "bedingung", label: t("Bedingung"), expression: rule.expression, index: 0 }], parameters: [] }, messages: [] };
    read(entry, []); pending.push(entry);
  }
  for (const bar of draft.vitals ?? []) {
    const entry: Pending = { node: { id: `bar:${bar.id}`, kind: "bar", key: bar.id, label: bar.label || bar.id, detail: t("Stand @{kennung}, Höchststand {formel}", { kennung: bar.id, formel: sugar(bar.max) }), formulas: [{ role: "hoechststand", label: t("Höchststand"), expression: bar.max, index: 0 }], parameters: [] }, messages: [] };
    if (known.has(bar.id)) { used.add(bar.id); connect(attributeNodeId(bar.id), entry.node.id, "stand"); }
    else entry.messages.push({ status: "error", message: t("Verweist auf @{kennung}, das es in diesem Paket nicht gibt.", { kennung: bar.id }) });
    read(entry, []); pending.push(entry);
  }
  for (const action of draft.actions) {
    const parameters = action.inputs.map(input => ({ id: input.id, label: input.label || input.id, type: fieldType(input) }));
    const formulas: RuleMapFormula[] = [];
    let result: string | null = null;
    try { result = draftExpression(action); } catch { result = null; }
    if (result !== null) formulas.push({ role: "ergebnis", label: t("Ergebnis"), expression: result, index: 0 });
    (action.preconditions ?? []).forEach((rule, index) => formulas.push({ role: "voraussetzung", label: rule.message || t("Voraussetzung {n}", { n: index + 1 }), expression: rule.expression, index }));
    (action.outcome?.bands ?? []).forEach((band, index) => formulas.push({ role: "bereich", label: band.label || t("Ergebnisbereich {n}", { n: index + 1 }), expression: band.expression, index }));
    const signature = parameters.map(p => `?${p.id}: ${typeWord(p.type)}`).join(", ");
    const entry: Pending = { node: { id: `action:${action.id}`, kind: "action", key: action.id, localId: action.localId, label: action.name || action.id, detail: result === null ? t("({parameter}) → Formel unvollständig", { parameter: signature }) : t("({parameter}) → {formel}", { parameter: signature, formel: sugar(result) }), formulas, parameters }, messages: [] };
    if (result === null) entry.messages.push({ status: "error", message: t("Die Formel lässt sich nicht lesen. Öffne den Knoten und korrigiere sie.") });
    read(entry, parameters); pending.push(entry);
  }
  for (const entry of pending) {
    if (entry.node.kind !== "attribute") continue;
    const field = draft.fields.find(f => f.id === entry.node.key);
    if (field && field.type !== "string" && !used.has(field.id)) entry.messages.push({ status: "hint", message: t("Wird in keiner Formel benutzt.") });
  }
  const issues: RuleMapIssue[] = [];
  const nodes = pending.map(({ node, messages }): RuleMapNode => {
    const worst = messages.find(m => m.status === "error") ?? messages[0];
    for (const m of messages) issues.push({ nodeId: node.id, status: m.status, message: m.message });
    return worst ? { ...node, status: worst.status, message: messages.map(m => m.message).join(" ") } : { ...node, status: "ok" };
  });
  return { nodes, edges, issues };
}

/** Die Nachbarschaft eines Knotens: alles, was mit ihm verbunden ist, in Kantenreihenfolge. */
export function relatedTo(graph: RuleMapGraph, id: string): string[] {
  const out: string[] = [];
  for (const edge of graph.edges) { if (edge.from === id && !out.includes(edge.to)) out.push(edge.to); if (edge.to === id && !out.includes(edge.from)) out.push(edge.from); }
  return out;
}

export interface RuleMapSize { readonly width: number; readonly height: number }
export interface RuleMapPlaced extends RuleMapSize { readonly id: string; readonly x: number; readonly y: number }
export interface RuleMapColumn { readonly kinds: readonly RuleMapKind[]; readonly label: string; readonly x: number; readonly width: number }
export interface RuleMapGroup { readonly label: string; readonly x: number; readonly y: number; readonly width: number }
export interface RuleMapLayout { readonly nodes: readonly RuleMapPlaced[]; readonly columns: readonly RuleMapColumn[]; readonly groups: readonly RuleMapGroup[]; readonly width: number; readonly height: number }
export const MAP_GAP_X = 72, MAP_GAP_Y = 10, MAP_HEADER = 32, MAP_GROUP = 24;
const COLUMNS: readonly (readonly RuleMapKind[])[] = [["attribute"], ["computed"], ["rule", "bar"], ["action"]];
function columnLabel(kinds: readonly RuleMapKind[]): string {
  switch (kinds[0]) {
    case "attribute": return t("Attribute");
    case "computed": return t("Abgeleitet");
    case "rule": return t("Regeln und Balken");
    default: return t("Aktionen");
  }
}
/** Vier Spalten nach Art; Attribute in Bogen-Reihenfolge unter Gruppenzeilen, alle anderen nach dem
 * Schwerpunkt ihrer Attribute sortiert, damit Verbindungen möglichst waagerecht laufen. */
export function ruleMapLayout(graph: RuleMapGraph, size: (node: RuleMapNode) => RuleMapSize): RuleMapLayout {
  const sized = new Map(graph.nodes.map(n => [n.id, size(n)]));
  const placed: RuleMapPlaced[] = [], groups: RuleMapGroup[] = [], columns: RuleMapColumn[] = [];
  const centre = new Map<string, number>();
  let x = 0, height = 0;
  for (const kinds of COLUMNS) {
    const members = graph.nodes.filter(n => kinds.includes(n.kind));
    const width = Math.max(180, ...members.map(n => sized.get(n.id)!.width));
    let y = MAP_HEADER;
    if (kinds[0] === "attribute") {
      let current: string | undefined;
      for (const node of members) {
        if (node.group !== current) { current = node.group; groups.push({ label: current ?? "", x, y, width }); y += MAP_GROUP; }
        const s = sized.get(node.id)!; placed.push({ id: node.id, x, y, ...s }); centre.set(node.id, y + s.height / 2); y += s.height + MAP_GAP_Y;
      }
    } else {
      const weight = (node: RuleMapNode): number => {
        const sources = graph.edges.filter(e => e.to === node.id).map(e => centre.get(e.from)).filter((v): v is number => v !== undefined);
        return sources.length ? sources.reduce((a, b) => a + b, 0) / sources.length : Number.POSITIVE_INFINITY;
      };
      const ordered = members.map((node, index) => ({ node, index, w: weight(node) })).sort((a, b) => a.w - b.w || a.index - b.index);
      for (const { node } of ordered) { const s = sized.get(node.id)!; placed.push({ id: node.id, x, y, ...s }); y += s.height + MAP_GAP_Y; }
    }
    columns.push({ kinds, label: columnLabel(kinds), x, width });
    height = Math.max(height, y - MAP_GAP_Y);
    x += width + MAP_GAP_X;
  }
  return { nodes: placed, columns, groups, width: x - MAP_GAP_X, height: Math.max(height, MAP_HEADER) };
}
