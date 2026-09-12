// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { TABLE_DICE_PACKAGE_ID, type ActorCard, type AdventureTree, type TacticalToken } from "@chronicle/protocol";
import type { Member } from "../api";
import type { ActionCard } from "./game-api";

export interface TableParticipant { id: string; name: string; canControl: boolean; onMap: boolean; loreEntryId: string | null }
/** Only combine already authorized responses. Roster labels never trigger private sheet reads. */
export function tableParticipants(actors: readonly ActorCard[], roster: readonly Member[], tokens: readonly TacticalToken[]): TableParticipant[] {
  const people = new Map<string, TableParticipant>();
  for (const member of roster) if (member.role === "spieler" && member.actorId)
    people.set(member.actorId, { id: member.actorId, name: member.displayName, canControl: false, onMap: false, loreEntryId: null });
  for (const actor of actors) if (actor.archivedAt === null)
    people.set(actor.id, { id: actor.id, name: actor.name, canControl: actor.canControl, onMap: false, loreEntryId: actor.loreEntryId });
  for (const token of tokens) {
    const known = people.get(token.actorId);
    people.set(token.actorId, { id: token.actorId, name: token.name, canControl: known?.canControl ?? false, onMap: true, loreEntryId: known?.loreEntryId ?? null });
  }
  return [...people.values()];
}

export function tableDiceValues(card: ActionCard): { values: number[]; minimum: number; maximum: number } | null {
  if (card.receipt.package.id !== TABLE_DICE_PACKAGE_ID) return null;
  const minimum = card.receipt.context.input?.minimum;
  if (typeof minimum !== "number" || !card.receipt.dice.length) return null;
  return { minimum, maximum: minimum + card.receipt.dice[0]!.sides - 1,
    values: card.receipt.dice.flatMap(die => die.kept.map(index => die.rolls[index]![0]! + minimum - 1)) };
}

/** Removing a scene also removes incoming choices, so no saved branch ever points to a ghost. */
export function removeAdventureNode(document: AdventureTree, nodeId: string): AdventureTree {
  const nodes = document.nodes.filter(node => node.id !== nodeId).map(node => ({ ...node, choices: node.choices.filter(choice => choice.targetId !== nodeId) }));
  return { ...document, nodes, rootId: document.rootId === nodeId ? nodes[0]?.id ?? null : document.rootId };
}

/** A topological rank keeps joins at their deepest parent and separate drafts visible. */
export function adventureColumns(document: AdventureTree): AdventureTree["nodes"][] {
  const depth = new Map(document.nodes.map(node => [node.id, 0]));
  for (let pass = 0; pass < document.nodes.length; pass++) {
    let changed = false;
    for (const node of document.nodes) for (const choice of node.choices) {
      const next = (depth.get(node.id) ?? 0) + 1;
      if (depth.has(choice.targetId) && next > depth.get(choice.targetId)!) { depth.set(choice.targetId, next); changed = true; }
    }
    if (!changed) break;
  }
  const columns: AdventureTree["nodes"][] = [];
  for (const node of document.nodes) (columns[Math.min(depth.get(node.id) ?? 0, document.nodes.length)] ??= []).push(node);
  return columns.filter(Boolean);
}
