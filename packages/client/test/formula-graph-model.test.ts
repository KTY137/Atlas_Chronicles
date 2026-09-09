// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { parseFormula } from "@chronicle/rules";
import { formulaGraph, moveSubtree, nodeAt, removeAt, replaceAt, wrapAt, NODE_WIDTH } from "../src/features/formula-graph-model";
import { formulaSource } from "../src/features/rule-forge-model";
import type { FormulaSources } from "../src/features/formula-sugar";

const sources: FormulaSources = { actor: [{ id: "geschick", label: "Geschick", type: "number" }], input: [{ id: "bonus", label: "Bonus", type: "number" }] };
const ast = parseFormula("1d20 + actor.geschick >= input.bonus");

describe("graph layout", () => {
  it("places leaves left, the result right, and types every node", () => {
    const graph = formulaGraph(ast, sources);
    expect(graph.nodes.map(n => [n.kind, n.label])).toEqual([["compare", "≥"], ["calc", "+"], ["dice", "1d20"], ["attribute", "Geschick"], ["parameter", "Bonus"]]);
    const x = Object.fromEntries(graph.nodes.map(n => [n.label, n.x]));
    expect(x["1d20"]).toBe(0); expect(x["+"]).toBe(NODE_WIDTH + 56); expect(x["≥"]).toBe(2 * (NODE_WIDTH + 56));
    expect(graph.nodes.find(n => n.label === "≥")?.type).toBe("boolean"); expect(graph.resultType).toBe("boolean");
    expect(graph.edges).toEqual([{ from: "n.0", to: "n", slot: 0 }, { from: "n.0.0", to: "n.0", slot: 0 }, { from: "n.0.1", to: "n.0", slot: 1 }, { from: "n.1", to: "n", slot: 1 }]);
    expect(graph.nodes.find(n => n.label === "Bonus")!.y).toBeGreaterThan(graph.nodes.find(n => n.label === "Geschick")!.y);
  });
  it("marks unknown references without throwing", () => {
    expect(formulaGraph(parseFormula("actor.weg + 1"), sources).nodes[1]).toMatchObject({ kind: "attribute", type: "unknown", detail: "gibt es nicht mehr" });
  });
});

describe("graph edits", () => {
  it("replaces, removes, wraps and moves subtrees by path", () => {
    expect(formulaSource(replaceAt(ast, [0, 1], { kind: "literal", value: 4 }))).toBe("1d20 + 4 >= input.bonus");
    expect(formulaSource(removeAt(ast, [0, 0]))).toBe("actor.geschick >= input.bonus");
    expect(formulaSource(removeAt(ast, [1]))).toBe("1d20 + actor.geschick >= 0");
    expect(formulaSource(wrapAt(ast, [1], "*"))).toBe("1d20 + actor.geschick >= input.bonus * 0");
    expect(formulaSource(moveSubtree(ast, [0, 0], [1]))).toBe("0 + actor.geschick >= 1d20");
    expect(nodeAt(ast, [0, 1])).toEqual({ kind: "field", source: "actor", field: "geschick" });
    expect(() => moveSubtree(ast, [0], [0, 1])).toThrow(/eigenen/);
  });
  it("removes a leaf of a function or if by turning it into a placeholder", () => {
    expect(formulaSource(removeAt(parseFormula("min(1, 2)"), [0]))).toBe("min(0, 2)");
    expect(formulaSource(removeAt(parseFormula("if(true, 1, 2)"), [0]))).toBe("if(false, 1, 2)");
  });
});
