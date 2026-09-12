// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const closed = { additionalProperties: false } as const;
const id = Type.String({ minLength: 1, maxLength: 128, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
const nullableId = Type.Union([id, Type.Null()]);
const name = Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" });
const expected = Type.Integer({ minimum: 0, maximum: 2147483646 });

/** A finite, inclusive range per die. The rules engine's 100 dice / 100,000 faces bound applies. */
export const TableDiceSpec = Type.Object({
  count: Type.Integer({ minimum: 1, maximum: 100 }),
  minimum: Type.Integer({ minimum: -1_000_000, maximum: 1_000_000 }),
  maximum: Type.Integer({ minimum: -1_000_000, maximum: 1_000_000 }),
}, closed);
export type TableDiceInput = Static<typeof TableDiceSpec>;
export const TABLE_DICE_PACKAGE_ID = "org.atlas-chronicles.table-dice";
export const TABLE_DICE_ACTION_ID = "table_dice";
export function validTableDice(input: unknown): input is TableDiceInput {
  return Value.Check(TableDiceSpec, input) && input.maximum - input.minimum >= 1 && input.maximum - input.minimum < 100_000;
}

export const AdventureChoice = Type.Object({ id, label: name, targetId: id }, closed);
export const AdventureNode = Type.Object({
  id, title: name, notes: Type.String({ maxLength: 8000 }), sceneId: nullableId,
  choices: Type.Array(AdventureChoice, { maxItems: 32 }),
}, closed);
/** Narrative planning data only. Advancing the story is an explicit, authorized GM command. */
export const AdventureDocument = Type.Object({
  schemaVersion: Type.Literal(1), name, rootId: nullableId,
  nodes: Type.Array(AdventureNode, { maxItems: 128 }),
}, closed);
export type AdventureTree = Static<typeof AdventureDocument>;
export type AdventureScene = Static<typeof AdventureNode>;
export const AdventureUpdate = Type.Object({ commandId: id, expectedVersion: expected, document: AdventureDocument }, closed);
export const AdventureAdvance = Type.Object({ commandId: id, expectedVersion: expected, nodeId: id, expectedSceneVersion: Type.Optional(Type.Integer({ minimum: 1, maximum: 2147483647 })) }, closed);
export interface AdventureCard { version: number; document: AdventureTree; currentNodeId: string | null; updatedAt: number | null }
export const emptyAdventureTree = (): AdventureTree => ({ schemaVersion: 1, name: "Abenteuer", rootId: null, nodes: [] });

/** Shared by HTTP/domain and native restore: names, references, bounds and cycles agree. */
export function validAdventureTree(input: unknown): input is AdventureTree {
  if (!Value.Check(AdventureDocument, input)) return false;
  const nodes = new Map(input.nodes.map(node => [node.id, node]));
  if (nodes.size !== input.nodes.length || (nodes.size === 0 ? input.rootId !== null : !nodes.has(input.rootId ?? ""))) return false;
  const choiceIds = new Set<string>();
  for (const node of nodes.values()) for (const choice of node.choices) {
    if (!nodes.has(choice.targetId) || choiceIds.has(choice.id)) return false;
    choiceIds.add(choice.id);
  }
  // A branch may rejoin another branch. A cycle is not an adventure tree and cannot be saved.
  const complete = new Set<string>(), visiting = new Set<string>();
  const visit = (nodeId: string): boolean => {
    if (complete.has(nodeId)) return true;
    if (visiting.has(nodeId)) return false;
    visiting.add(nodeId);
    for (const choice of nodes.get(nodeId)!.choices) if (!visit(choice.targetId)) return false;
    visiting.delete(nodeId); complete.add(nodeId); return true;
  };
  return input.nodes.every(node => visit(node.id));
}
