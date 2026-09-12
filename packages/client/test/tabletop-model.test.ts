// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { validAdventureTree, type ActorCard, type AdventureTree, type TacticalToken } from "@chronicle/protocol";
import { tableParticipants, tableDiceValues, removeAdventureNode, adventureColumns } from "../src/features/tabletop-model.ts";
import { evaluateSupportedAction } from "@chronicle/rules";
import { tableDicePackage } from "../../server/src/domain/table-dice.ts";
import type { ActionCard } from "../src/features/game-api.ts";
import { parseTableTab } from "../src/navigation.ts";

describe("tabletop presentation and adventure editing", () => {
  it("opens the table by default and keeps adventure planning GM-only", () => {
    expect(parseTableTab(null, false)).toBe("table"); expect(parseTableTab("adventure", false)).toBe("table");
    expect(parseTableTab("adventure", true)).toBe("adventure"); expect(parseTableTab("tactical", false)).toBe("tactical");
  });
  it("combines public roster, authorized actors and visible tokens without inventing sheet access", () => {
    const own = { id: "own", name: "Sera", canControl: true, archivedAt: null, loreEntryId: "known" } as ActorCard;
    const token = { actorId: "seen", name: "Wächter", canMove: false } as TacticalToken;
    const people = tableParticipants([own], [{ actorId: "party", userId: "other", displayName: "Brannt", role: "spieler" }], [token]);
    expect(people.map(person => person.id)).toEqual(["party", "own", "seen"]);
    expect(people.find(person => person.id === "seen")).toMatchObject({ onMap: true, canControl: false, loreEntryId: null });
    expect(tableParticipants([own], [], []).map(person => person.id)).not.toContain("seen");
  });
  it("presents signed die faces so that their sum is exactly the server total", () => {
    const receipt = evaluateSupportedAction(tableDicePackage({ count: 4, minimum: -10, maximum: -1 }), "table_dice", { seed: "00000001000000020000000300000004", actor: {}, input: { minimum: -10 }, knowledge: { actorId: "a", passages: [] } });
    const result = tableDiceValues({ receipt } as ActionCard)!;
    expect(result.minimum).toBe(-10); expect(result.maximum).toBe(-1); expect(result.values).toHaveLength(4);
    expect(result.values.reduce((sum, value) => sum + value, 0)).toBe(receipt.total);
  });
  it("removes incoming branches with their scene and keeps joins at their deepest parent", () => {
    const document: AdventureTree = { schemaVersion: 1, name: "Turm", rootId: "a", nodes: [
      { id: "a", title: "A", notes: "", sceneId: null, choices: [{ id: "ab", label: "B", targetId: "b" }, { id: "ac", label: "C", targetId: "c" }] },
      { id: "b", title: "B", notes: "", sceneId: null, choices: [{ id: "bc", label: "C", targetId: "c" }] },
      { id: "c", title: "C", notes: "", sceneId: null, choices: [] },
    ] };
    expect(adventureColumns(document).map(column => column.map(node => node.id))).toEqual([["a"], ["b"], ["c"]]);
    const removed = removeAdventureNode(document, "c"); expect(validAdventureTree(removed)).toBe(true);
    expect(removed.nodes.flatMap(node => node.choices).map(choice => choice.id)).toEqual(["ab"]);
    expect(removeAdventureNode(removed, "a").rootId).toBe("b");
  });
});
