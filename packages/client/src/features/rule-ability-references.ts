// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Sichere Änderungen an Kennungen im ENTWURF. Niemals installierte Pakete, Figuren oder Quittungen
 * ändern. Nur erklärte Kennungslisten werden angefasst; freie Texte und Formeln bleiben erhalten.
 */
import type { RuleAbility, Scalar } from "@chronicle/rules";
import type { DraftField, RuleDraft } from "./rule-forge-model";

export type RuleEntryKind = "ability" | "condition";
export interface RuleEntryReference {
  readonly kind: "ability" | "field" | "action" | "test" | "migration";
  readonly name: string;
}
export type RuleEntryEdit =
  | { readonly ok: true; readonly draft: RuleDraft }
  | { readonly ok: false; readonly reason: "missing" | "identifier" | "duplicate" | "length" | "used" };

const entries = (draft: RuleDraft, kind: RuleEntryKind) => kind === "ability" ? draft.abilities ?? [] : draft.conditions ?? [];
const listField = (draft: RuleDraft, kind: RuleEntryKind) => kind === "ability" ? draft.abilityRules?.abilityField : draft.abilityRules?.conditionField;
const contains = (value: unknown, id: string): boolean => typeof value === "string" && value.split(",").some(part => part.trim() === id);
/** Exact tokens only, retaining whitespace, order and unrelated values byte for byte. */
const replace = (value: string, from: string, to: string): string => value.split(",").map(part => part.trim() === from ? part.replace(from, to) : part).join(",");

/** Every explicit reference that must be removed deliberately before deleting an entry. */
export function ruleEntryReferences(draft: RuleDraft, kind: RuleEntryKind, id: string): RuleEntryReference[] {
  const refs: RuleEntryReference[] = [], field = listField(draft, kind);
  if (kind === "ability") {
    for (const ability of draft.abilities ?? []) if (ability.requires?.includes(id)) refs.push({ kind: "ability", name: ability.name || ability.id });
    for (const action of draft.actions) if (action.inputs.some(input => input.id === "einsatz" && contains(input.defaultValue, id))) refs.push({ kind: "action", name: action.name || action.id });
  }
  for (const candidate of draft.fields) if (candidate.id === field && contains(candidate.defaultValue, id)) refs.push({ kind: "field", name: candidate.label || candidate.id });
  for (const test of draft.selfTests) if ((field !== undefined && contains(test.context.actor[field], id)) || (kind === "ability" && contains(test.context.input?.einsatz, id))) refs.push({ kind: "test", name: test.name });
  for (const migration of draft.migrations) if (migration.steps.some(step => step.kind === "add" && step.field === field && step.type === "string" && contains(step.value, id))) refs.push({ kind: "migration", name: migration.from });
  return refs;
}

/**
 * Commit an identifier change once, not once per keystroke. All typed draft references travel with
 * it, including disabled package tests and migration seeds. Rejected edits never mutate the draft.
 */
export function renameRuleEntry(draft: RuleDraft, kind: RuleEntryKind, from: string, to: string): RuleEntryEdit {
  const catalog = entries(draft, kind);
  if (catalog.filter(entry => entry.id === from).length !== 1) return { ok: false, reason: "missing" };
  if (from === to) return { ok: true, draft };
  if (!/^[a-z][a-z0-9_-]*$/.test(to) || to.length > 96 || ["constructor", "prototype", "__proto__"].includes(to)) return { ok: false, reason: "identifier" };
  if (catalog.some(entry => entry.id === to)) return { ok: false, reason: "duplicate" };
  const field = listField(draft, kind);
  let tooLong = false;
  const renamedValue = (value: Scalar, schema: DraftField | undefined): Scalar => {
    if (typeof value !== "string" || !contains(value, from)) return value;
    const next = replace(value, from, to), limit = Number(schema?.maxLength);
    if (schema && Number.isFinite(limit) && next.length > limit) tooLong = true;
    return next;
  };
  const fieldSchema = draft.fields.find(candidate => candidate.id === field);
  const fields = draft.fields.map(candidate => candidate.id === field
    ? { ...candidate, defaultValue: renamedValue(candidate.defaultValue, candidate) as string } : candidate);
  const actions = kind === "ability" ? draft.actions.map(action => ({ ...action,
    inputs: action.inputs.map(input => input.id === "einsatz" ? { ...input, defaultValue: renamedValue(input.defaultValue, input) as string } : input),
  })) : draft.actions;
  const selfTests = draft.selfTests.map(test => {
    const actor = test.context.actor, input = test.context.input;
    const action = draft.actions.find(candidate => candidate.id === test.actionId);
    return { ...test, context: { ...test.context,
      actor: field !== undefined && Object.hasOwn(actor, field) ? { ...actor, [field]: renamedValue(actor[field]!, fieldSchema) } : actor,
      ...(input === undefined ? {} : { input: kind === "ability" && Object.hasOwn(input, "einsatz")
        ? { ...input, einsatz: renamedValue(input.einsatz!, action?.inputs.find(candidate => candidate.id === "einsatz")) } : input }),
    } };
  });
  const migrations = draft.migrations.map(migration => ({ ...migration, steps: migration.steps.map(step =>
    step.kind === "add" && step.type === "string" && step.field === field
      ? { ...step, value: renamedValue(step.value, fieldSchema) as string } : step),
  }));
  if (tooLong) return { ok: false, reason: "length" };
  const common = { ...draft, fields, actions, selfTests, migrations };
  return kind === "ability"
    ? { ok: true, draft: { ...common, abilities: (draft.abilities ?? []).map(ability => ({ ...ability,
      ...(ability.id === from ? { id: to } : {}),
      ...(ability.requires?.includes(from) ? { requires: ability.requires.map(id => id === from ? to : id) } : {}),
    })) } }
    : { ok: true, draft: { ...common, conditions: (draft.conditions ?? []).map(condition => condition.id === from ? { ...condition, id: to } : condition) } };
}

/** No cascading deletion and, especially, no silently weakened prerequisite. */
export function removeRuleEntry(draft: RuleDraft, kind: RuleEntryKind, id: string): RuleEntryEdit {
  if (entries(draft, kind).filter(entry => entry.id === id).length !== 1) return { ok: false, reason: "missing" };
  if (ruleEntryReferences(draft, kind, id).length) return { ok: false, reason: "used" };
  return kind === "ability"
    ? { ok: true, draft: { ...draft, abilities: (draft.abilities ?? []).filter(entry => entry.id !== id) } }
    : { ok: true, draft: { ...draft, conditions: (draft.conditions ?? []).filter(entry => entry.id !== id) } };
}

/** Exclude direct and transitive cycles, even for an imported draft that already contains a cycle. */
export function prerequisiteCandidates(draft: RuleDraft, id: string): RuleAbility[] {
  const catalog = draft.abilities ?? [], current = catalog.find(ability => ability.id === id);
  if (!current || (current.requires?.length ?? 0) >= 4) return [];
  const byId = new Map(catalog.map(ability => [ability.id, ability]));
  const reachesCurrent = (start: string): boolean => {
    const pending = [start], seen = new Set<string>();
    while (pending.length) {
      const next = pending.pop()!;
      if (next === id) return true;
      if (seen.has(next)) continue;
      seen.add(next);
      pending.push(...(byId.get(next)?.requires ?? []));
    }
    return false;
  };
  return catalog.filter(ability => !current.requires?.includes(ability.id) && !reachesCurrent(ability.id));
}
