// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseFormula, type Formula } from "./formula.ts";
import { parseSupportedRulePackage, type AnyRulePackage } from "./package-v2.ts";
import { deepFreeze } from "./validation.ts";

/**
 * What a rule package can do, computed from the package itself. Never stored, never declared:
 * a declared block could disagree with the mechanics, and adding it to the format would break
 * the byte identity of installed packages. Surfaces ask "does this rule set have vitals?",
 * never "is this D&D?".
 */
export interface RuleCapabilities {
  readonly attributes: number;
  readonly computed: number;
  readonly constraints: number;
  readonly vitals: number;
  readonly collections: number;
  readonly abilities: number;
  readonly conditions: number;
  readonly actions: number;
  /** At least one action grades its result into ordered bands instead of one threshold. */
  readonly gradedOutcomes: boolean;
  /** At least one action rolls several independent dice groups (3W20-style checks). */
  readonly multiRollChecks: boolean;
  /** Distinct dice used anywhere in actions, ascending, e.g. ["W6", "W20"]. */
  readonly diceFamilies: readonly string[];
  readonly presentationTree: boolean;
  /** 1 for a flat sheet; deeper for nested categories. 0 without sections. */
  readonly categoryDepth: number;
  readonly migrations: number;
  readonly selfTests: number;
}
function diceNodes(node: Formula, out: number[]): void {
  switch (node.kind) {
    case "dice": out.push(node.sides); return;
    case "unary": diceNodes(node.value, out); return;
    case "binary": diceNodes(node.left, out); diceNodes(node.right, out); return;
    case "if": diceNodes(node.condition, out); diceNodes(node.then, out); diceNodes(node.else, out); return;
    case "call": for (const arg of node.args) diceNodes(arg, out); return;
    default: return;
  }
}
export function describeRuleCapabilities(input: AnyRulePackage): RuleCapabilities {
  const pkg = parseSupportedRulePackage(input), v2 = pkg.schemaVersion === 2 ? pkg : null;
  const sides = new Set<number>(); let multiRoll = false;
  for (const action of pkg.actions) {
    const found: number[] = [];
    // Installed packages always parse; a defensive catch keeps a description from ever failing.
    try { diceNodes(parseFormula(action.expression), found); } catch { /* unreadable formula: no dice counted */ }
    for (const value of found) sides.add(value);
    if (found.length >= 2) multiRoll = true;
  }
  const byId = new Map(pkg.layout.sections.map(section => [section.id, section]));
  let depth = 0;
  for (const section of pkg.layout.sections) {
    let level = 1, current = section.parent, guard = 0;
    while (current && guard++ < 32) { level++; current = byId.get(current)?.parent; }
    depth = Math.max(depth, level);
  }
  return deepFreeze({
    attributes: Object.keys(pkg.fields).length,
    computed: v2?.computed?.length ?? 0,
    constraints: v2?.constraints?.length ?? 0,
    vitals: v2?.vitals?.length ?? 0,
    collections: v2?.collections?.length ?? 0,
    abilities: v2?.abilities?.length ?? 0,
    conditions: v2?.conditions?.length ?? 0,
    actions: pkg.actions.length,
    gradedOutcomes: !!v2?.actions.some(action => action.outcome !== undefined),
    multiRollChecks: multiRoll,
    diceFamilies: [...sides].sort((a, b) => a - b).map(value => `W${value}`),
    presentationTree: !!v2?.presentation,
    categoryDepth: depth,
    migrations: pkg.migrations.length,
    selfTests: pkg.selfTests?.length ?? 0,
  });
}
