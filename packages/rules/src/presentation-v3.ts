// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { evaluateFormula, inferFormulaType, parseFormula, type EvaluationContext, type Formula, type FormulaType, type Scalar } from "./formula.ts";
import { validateFieldValue, type FieldSchema } from "./package.ts";
import type { ComputedField, RuleAbility, RuleActionV2, RuleCondition, RuleVital } from "./package-v2.ts";
import { array, deepFreeze, fail, finite, identifier, integer, keys, record, snapshotJson, string, RULE_LIMITS } from "./validation.ts";

/**
 * Presentation schema v3 is intentionally independent from the package/receipt schema version.
 * Existing v1/v2 mechanics and deterministic receipts stay byte-compatible while packages may opt
 * into a richer declarative UI contract.
 */
export const RULE_PRESENTATION_SCHEMA_VERSION = 3 as const;
export type RulePresentationRender = "section" | "grid" | "list" | "cards" | "compact" | "table";

export interface RuleCollection {
  readonly id: string;
  readonly label: string;
  /** A normal package string field. Its value is the JSON encoded array for this collection. */
  readonly storageField: string;
  readonly itemFields: Readonly<Record<string, FieldSchema>>;
  readonly minItems: number;
  readonly maxItems: number;
  readonly primaryField?: string;
}

interface PresentationBase {
  readonly id: string;
  readonly label?: string;
  readonly render?: RulePresentationRender;
  /** Deterministic boolean expression over actor fields. Dice and knowledge predicates are forbidden. */
  readonly visibleIf?: string;
}
export interface RulePresentationGroup extends PresentationBase {
  readonly kind: "group";
  readonly label: string;
  readonly children: readonly RulePresentationNode[];
  readonly collapsible?: boolean;
  readonly collapsed?: boolean;
}
export interface RulePresentationField extends PresentationBase { readonly kind: "field"; readonly ref: string }
export interface RulePresentationComputed extends PresentationBase { readonly kind: "computed"; readonly ref: string }
export interface RulePresentationVital extends PresentationBase { readonly kind: "vital"; readonly ref: string }
export interface RulePresentationCollection extends PresentationBase { readonly kind: "collection"; readonly ref: string }
export interface RulePresentationAbilities extends PresentationBase { readonly kind: "abilities" }
export interface RulePresentationConditions extends PresentationBase { readonly kind: "conditions" }
export interface RulePresentationActions extends PresentationBase { readonly kind: "actions"; readonly refs?: readonly string[] }
export type RulePresentationNode = RulePresentationGroup | RulePresentationField | RulePresentationComputed | RulePresentationVital
  | RulePresentationCollection | RulePresentationAbilities | RulePresentationConditions | RulePresentationActions;
export interface RulePresentationV3 {
  readonly schemaVersion: typeof RULE_PRESENTATION_SCHEMA_VERSION;
  readonly root: readonly RulePresentationNode[];
}

export interface RulePresentationContext {
  readonly fields: Readonly<Record<string, FieldSchema>>;
  readonly computed?: readonly ComputedField[];
  readonly vitals?: readonly RuleVital[];
  readonly actions: readonly RuleActionV2[];
  readonly abilities?: readonly RuleAbility[];
  readonly conditions?: readonly RuleCondition[];
}

const RENDERS = new Set<RulePresentationRender>(["section", "grid", "list", "cards", "compact", "table"]);
const fieldTypes = (fields: Readonly<Record<string, FieldSchema>>): Readonly<Record<string, FormulaType>> =>
  Object.fromEntries(Object.entries(fields).map(([id, field]) => [id, field.type === "integer" ? "number" : field.type]));

function deterministic(ast: Formula): void {
  switch (ast.kind) {
    case "dice": fail("presentation visibility: dice forbidden");
    case "literal": case "field": return;
    case "unary": deterministic(ast.value); return;
    case "binary": deterministic(ast.left); deterministic(ast.right); return;
    case "if": deterministic(ast.condition); deterministic(ast.then); deterministic(ast.else); return;
    case "call":
      if (["haelt", "haelt_etikett", "erfahrungsgrad"].includes(ast.name)) fail("presentation visibility: knowledge predicates forbidden");
      for (const argument of ast.args) deterministic(argument);
  }
}
function visibilityExpression(value: unknown, fields: Readonly<Record<string, FieldSchema>>): string {
  const source = string(value, "presentation.visibleIf", RULE_LIMITS.formulaLength);
  const ast = parseFormula(source); deterministic(ast);
  if (inferFormulaType(ast, { actor: fieldTypes(fields), input: {} }) !== "boolean") fail("presentation.visibleIf: expected boolean expression");
  return source;
}

function fieldSchemas(input: unknown, at: string): Readonly<Record<string, FieldSchema>> {
  const raw = record(input, at);
  if (!Object.keys(raw).length) fail(`${at}: at least one item field required`);
  if (Object.keys(raw).length > RULE_LIMITS.collectionItemFields) fail(`${at}: too many item fields`);
  const result: Record<string, FieldSchema> = Object.create(null) as Record<string, FieldSchema>;
  for (const [id, value] of Object.entries(raw)) {
    identifier(id, `${at}.id`);
    const field = record(value, `${at}.${id}`);
    keys(field, ["type", "label", "default", "minimum", "maximum", "maxLength", "enum"], `${at}.${id}`);
    const label = string(field.label, `${at}.${id}.label`, RULE_LIMITS.label);
    let parsed: FieldSchema;
    if (field.type === "integer" || field.type === "number") {
      const minimum = finite(field.minimum, `${at}.${id}.minimum`), maximum = finite(field.maximum, `${at}.${id}.maximum`);
      if (minimum > maximum) fail(`${at}.${id}: reversed range`);
      if (field.type === "integer" && (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum))) fail(`${at}.${id}: integer bounds required`);
      if (field.maxLength !== undefined || field.enum !== undefined) fail(`${at}.${id}: string constraints forbidden`);
      parsed = { type: field.type, label, minimum, maximum, default: field.default as Scalar };
    } else if (field.type === "string") {
      const maxLength = integer(field.maxLength, `${at}.${id}.maxLength`, 1, RULE_LIMITS.stringValue);
      if (field.minimum !== undefined || field.maximum !== undefined) fail(`${at}.${id}: numeric constraints forbidden`);
      const values = field.enum === undefined ? undefined : array(field.enum, `${at}.${id}.enum`, RULE_LIMITS.enumValues).map(item => string(item, `${at}.${id}.enum`, maxLength));
      if (values && (!values.length || new Set(values).size !== values.length)) fail(`${at}.${id}: enum must be nonempty and unique`);
      parsed = { type: "string", label, maxLength, default: field.default as Scalar, ...(values ? { enum: values } : {}) };
    } else if (field.type === "boolean") {
      if (["minimum", "maximum", "maxLength", "enum"].some(key => field[key] !== undefined)) fail(`${at}.${id}: unsupported boolean constraint`);
      parsed = { type: "boolean", label, default: field.default as Scalar };
    } else fail(`${at}.${id}: unsupported field type`);
    validateFieldValue(parsed, field.default, `${at}.${id}.default`);
    result[id] = parsed;
  }
  return deepFreeze(result);
}

export function parseRuleCollections(input: unknown, actorFields: Readonly<Record<string, FieldSchema>>): readonly RuleCollection[] {
  if (input === undefined) return deepFreeze([] as RuleCollection[]);
  const ids = new Set<string>(), storage = new Set<string>(), result: RuleCollection[] = [];
  for (const item of array(input, "collections", RULE_LIMITS.collections)) {
    const row = record(item, "collection");
    keys(row, ["id", "label", "storageField", "itemFields", "minItems", "maxItems", "primaryField"], "collection");
    const id = identifier(row.id, "collection.id"); if (ids.has(id)) fail("collection: duplicate id"); ids.add(id);
    const label = string(row.label, "collection.label", RULE_LIMITS.label), storageField = identifier(row.storageField, "collection.storageField");
    if (storage.has(storageField)) fail("collection: storage field reused"); storage.add(storageField);
    const target = actorFields[storageField];
    if (!target || target.type !== "string" || target.enum || (target.maxLength ?? 0) < 64) fail(`collection ${id}: storageField must reference a free-form string field`);
    const itemFields = fieldSchemas(row.itemFields, `collection.${id}.itemFields`);
    const minItems = row.minItems === undefined ? 0 : integer(row.minItems, `collection.${id}.minItems`, 0, RULE_LIMITS.collectionItems);
    const maxItems = row.maxItems === undefined ? 64 : integer(row.maxItems, `collection.${id}.maxItems`, 1, RULE_LIMITS.collectionItems);
    if (minItems > maxItems) fail(`collection ${id}: minItems exceeds maxItems`);
    let primaryField: string | undefined;
    if (row.primaryField !== undefined) {
      primaryField = identifier(row.primaryField, `collection.${id}.primaryField`);
      if (!Object.hasOwn(itemFields, primaryField)) fail(`collection ${id}: unknown primaryField`);
    }
    const parsed = deepFreeze({ id, label, storageField, itemFields, minItems, maxItems, ...(primaryField ? { primaryField } : {}) });
    // Validate the package default too: loading a new actor must never start with malformed collection state.
    decodeRuleCollectionValue(parsed, target.default);
    result.push(parsed);
  }
  return deepFreeze(result);
}

export function decodeRuleCollectionValue(collection: RuleCollection, value: Scalar | undefined): readonly Readonly<Record<string, Scalar>>[] {
  if (typeof value !== "string") fail(`collection ${collection.id}: storage value must be a string`);
  let raw: unknown;
  try { raw = value.trim() ? JSON.parse(value) : []; } catch { fail(`collection ${collection.id}: invalid JSON`); }
  const rows = array(snapshotJson(raw), `collection ${collection.id}`, collection.maxItems);
  if (rows.length < collection.minItems) fail(`collection ${collection.id}: too few items`);
  const result = rows.map((item, index) => {
    const row = record(item, `collection ${collection.id}[${index}]`);
    keys(row, Object.keys(collection.itemFields), `collection ${collection.id}[${index}]`);
    const parsed: Record<string, Scalar> = {};
    for (const [id, field] of Object.entries(collection.itemFields)) parsed[id] = validateFieldValue(field, Object.hasOwn(row, id) ? row[id] : field.default, `collection ${collection.id}[${index}].${id}`);
    return deepFreeze(parsed);
  });
  return deepFreeze(result);
}

export function encodeRuleCollectionValue(collection: RuleCollection, rows: readonly Readonly<Record<string, Scalar>>[]): string {
  if (rows.length < collection.minItems || rows.length > collection.maxItems) fail(`collection ${collection.id}: item count outside declared range`);
  const validated = rows.map((row, index) => {
    const out: Record<string, Scalar> = {};
    for (const [id, field] of Object.entries(collection.itemFields)) out[id] = validateFieldValue(field, row[id] ?? field.default, `collection ${collection.id}[${index}].${id}`);
    return out;
  });
  const text = JSON.stringify(validated);
  return text;
}

export function validateRuleCollections(collections: readonly RuleCollection[], actor: Readonly<Record<string, Scalar>>): Readonly<Record<string, readonly Readonly<Record<string, Scalar>>[]>> {
  return deepFreeze(Object.fromEntries(collections.map(collection => [collection.id, decodeRuleCollectionValue(collection, actor[collection.storageField])]))) as Readonly<Record<string, readonly Readonly<Record<string, Scalar>>[]>>;
}

function parsePresentationNode(input: unknown, context: RulePresentationContext, collections: readonly RuleCollection[], state: {
  ids: Set<string>; refs: Map<string, Set<string>>; actionRefs: Set<string>; total: number;
}, depth: number): RulePresentationNode {
  if (depth > RULE_LIMITS.nestingDepth) fail("presentation: nesting too deep");
  if (++state.total > RULE_LIMITS.presentationNodes) fail("presentation: too many nodes");
  const row = record(input, "presentation node");
  const kind = string(row.kind, "presentation.kind", 32);
  const common = ["kind", "id", "label", "render", "visibleIf"];
  const id = identifier(row.id, "presentation.id"); if (state.ids.has(id)) fail("presentation: duplicate node id"); state.ids.add(id);
  const label = row.label === undefined ? undefined : string(row.label, "presentation.label", RULE_LIMITS.label);
  const render = row.render === undefined ? undefined : string(row.render, "presentation.render", 16) as RulePresentationRender;
  if (render !== undefined && !RENDERS.has(render)) fail("presentation: unsupported render hint");
  const visibleIf = row.visibleIf === undefined ? undefined : visibilityExpression(row.visibleIf, context.fields);
  const base = { id, ...(label !== undefined ? { label } : {}), ...(render !== undefined ? { render } : {}), ...(visibleIf !== undefined ? { visibleIf } : {}) };
  const uniqueRef = (bucket: string, ref: string) => { const refs = state.refs.get(bucket) ?? new Set<string>(); if (refs.has(ref)) fail(`presentation: duplicate ${bucket} reference ${ref}`); refs.add(ref); state.refs.set(bucket, refs); };
  if (kind === "group") {
    keys(row, [...common, "children", "collapsible", "collapsed"], "presentation group");
    if (label === undefined) fail("presentation group: label required");
    if (row.collapsible !== undefined && typeof row.collapsible !== "boolean") fail("presentation group: collapsible must be boolean");
    if (row.collapsed !== undefined && typeof row.collapsed !== "boolean") fail("presentation group: collapsed must be boolean");
    if (row.collapsed === true && row.collapsible !== true) fail("presentation group: collapsed requires collapsible");
    const children = array(row.children, "presentation.children", RULE_LIMITS.presentationChildren).map(child => parsePresentationNode(child, context, collections, state, depth + 1));
    return deepFreeze({ kind: "group", ...base, label, children, ...(row.collapsible === true ? { collapsible: true } : {}), ...(row.collapsed === true ? { collapsed: true } : {}) });
  }
  if (kind === "field" || kind === "computed" || kind === "vital" || kind === "collection") {
    keys(row, [...common, "ref"], `presentation ${kind}`);
    const ref = identifier(row.ref, `presentation.${kind}.ref`);
    const known = kind === "field" ? Object.hasOwn(context.fields, ref)
      : kind === "computed" ? (context.computed ?? []).some(item => item.id === ref)
      : kind === "vital" ? (context.vitals ?? []).some(item => item.id === ref)
      : collections.some(item => item.id === ref);
    if (!known) fail(`presentation: unknown ${kind} reference ${ref}`);
    uniqueRef(kind, ref);
    return deepFreeze({ kind, ...base, ref } as RulePresentationNode);
  }
  if (kind === "abilities" || kind === "conditions") {
    keys(row, common, `presentation ${kind}`);
    if (kind === "abilities" && !(context.abilities?.length)) fail("presentation: abilities node without abilities");
    if (kind === "conditions" && !(context.conditions?.length)) fail("presentation: conditions node without conditions");
    uniqueRef(kind, kind);
    return deepFreeze({ kind, ...base } as RulePresentationNode);
  }
  if (kind === "actions") {
    keys(row, [...common, "refs"], "presentation actions");
    const refs = row.refs === undefined ? context.actions.map(action => action.id) : array(row.refs, "presentation.actions.refs", RULE_LIMITS.actions).map(ref => identifier(ref, "presentation.actions.ref"));
    if (!refs.length) fail("presentation actions: at least one action required");
    for (const ref of refs) {
      if (!context.actions.some(action => action.id === ref)) fail(`presentation: unknown action reference ${ref}`);
      if (state.actionRefs.has(ref)) fail(`presentation: duplicate action reference ${ref}`);
      state.actionRefs.add(ref);
    }
    return deepFreeze({ kind: "actions", ...base, refs });
  }
  fail(`presentation: unsupported node kind ${kind}`);
}

export function parseRulePresentation(input: unknown, context: RulePresentationContext, collections: readonly RuleCollection[]): RulePresentationV3 | undefined {
  if (input === undefined) return undefined;
  const row = record(input, "presentation"); keys(row, ["schemaVersion", "root"], "presentation");
  if (row.schemaVersion !== RULE_PRESENTATION_SCHEMA_VERSION) fail(`presentation: expected schemaVersion ${RULE_PRESENTATION_SCHEMA_VERSION}`);
  const state = { ids: new Set<string>(), refs: new Map<string, Set<string>>(), actionRefs: new Set<string>(), total: 0 };
  const root = array(row.root, "presentation.root", RULE_LIMITS.presentationChildren).map(node => parsePresentationNode(node, context, collections, state, 0));
  if (!root.length) fail("presentation: root may not be empty");
  return deepFreeze({ schemaVersion: RULE_PRESENTATION_SCHEMA_VERSION, root });
}

export function visiblePresentationNodeIds(presentation: RulePresentationV3 | undefined, fields: Readonly<Record<string, Scalar>>): readonly string[] {
  if (!presentation) return deepFreeze([] as string[]);
  const context: EvaluationContext = { seed: "00000000000000000000000000000001", actor: fields, input: {}, knowledge: { actorId: "presentation", passages: [] } };
  const result: string[] = [];
  const visit = (node: RulePresentationNode, parentVisible: boolean) => {
    const own = node.visibleIf === undefined || evaluateFormula(node.visibleIf, context).value === true;
    const visible = parentVisible && own;
    if (visible) result.push(node.id);
    if (node.kind === "group") for (const child of node.children) visit(child, visible);
  };
  for (const node of presentation.root) visit(node, true);
  return deepFreeze(result);
}
