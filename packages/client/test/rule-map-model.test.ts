// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { HOW_TO_BE_A_HERO_PACKAGE } from "@chronicle/rules";
import { relatedTo, ruleMapGraph, ruleMapLayout, type RuleMapNode } from "../src/features/rule-map-model";
import { newField, newPackage, packageDraft, type RuleDraft } from "../src/features/rule-forge-model";

const htbah = packageDraft(HOW_TO_BE_A_HERO_PACKAGE);
const size = (node: RuleMapNode) => ({ width: node.kind === "attribute" ? 180 : 220, height: 44 });

/** Ein kleines Paket mit allen drei Befundarten: unlesbar, unbekannt, unbenutzt. */
function troubled(): RuleDraft {
  const draft = newPackage("Kaya");
  draft.schemaVersion = 2;
  draft.fields = [...draft.fields, { ...newField("unbenutzt"), label: "Unbenutzt" }];
  draft.computed = [{ id: "weg", label: "Weg", expression: "actor.insight + actor.laufen" }];
  draft.constraints = [{ id: "kaputt", message: "Kaputt.", expression: "1 +" }];
  draft.vitals = [{ id: "vigour", label: "Kraft-Balken", max: "actor.vigour * 2", depletion: "none" }];
  return draft;
}

describe("rule map graph", () => {
  it("turns every part of the HTBAH package into a node and every formula reference into an edge", () => {
    const graph = ruleMapGraph(htbah);
    const kinds = (kind: RuleMapNode["kind"]) => graph.nodes.filter(n => n.kind === kind);
    expect(kinds("attribute")).toHaveLength(htbah.fields.length);
    expect(kinds("computed")).toHaveLength(htbah.computed!.length);
    expect(kinds("rule")).toHaveLength(htbah.constraints!.length);
    expect(kinds("bar")).toHaveLength(1);
    expect(kinds("action")).toHaveLength(htbah.actions.length);
    // The bar reads its attribute even without a formula reference; the damage action has three parameters.
    expect(graph.edges).toContainEqual({ from: "attribute:hp", to: "bar:hp", via: "stand" });
    expect(graph.nodes.find(n => n.id === "action:damage")?.parameters.map(p => p.id)).toEqual(["dice_count", "bonus", "critical"]);
    expect(graph.nodes.find(n => n.id === "action:damage")?.detail).toContain("?bonus");
    // Every attribute lives under its sheet section, and the well-formed template has no findings.
    expect(graph.nodes.find(n => n.id === "attribute:hp")?.group).toBe("Figur und Absprachen");
    expect(graph.issues).toEqual([]);
    // Deduplicated edges: aptitude formulas reference every skill of the group once.
    const toAptitude = graph.edges.filter(e => e.to === "computed:aptitude_handeln");
    expect(new Set(toAptitude.map(e => e.from)).size).toBe(toAptitude.length);
  });
  it("reports unreadable formulas, unknown attributes and unused numbers as plain findings", () => {
    const graph = ruleMapGraph(troubled());
    const status = Object.fromEntries(graph.nodes.map(n => [n.id, n.status]));
    expect(status["computed:weg"]).toBe("error");
    expect(status["rule:kaputt"]).toBe("error");
    expect(status["attribute:unbenutzt"]).toBe("hint");
    expect(status["attribute:name"]).toBe("ok");
    expect(status["attribute:vigour"]).toBe("ok");
    expect(graph.issues.map(i => i.message)).toEqual(expect.arrayContaining([
      "Verweist auf @laufen, das es in diesem Paket nicht gibt.",
      "Die Formel lässt sich nicht lesen. Öffne den Knoten und korrigiere sie.",
      "Wird in keiner Formel benutzt.",
    ]));
    // A partially readable formula still yields its readable edges.
    expect(graph.edges).toContainEqual({ from: "attribute:insight", to: "computed:weg", via: "berechnung" });
  });
  it("lists the neighbourhood of a node for highlighting", () => {
    const graph = ruleMapGraph(troubled());
    expect(relatedTo(graph, "attribute:insight")).toEqual(expect.arrayContaining(["computed:weg", "action:investigate"]));
    expect(relatedTo(graph, "bar:vigour")).toEqual(["attribute:vigour"]);
    expect(relatedTo(graph, "nicht-da")).toEqual([]);
  });
});

describe("rule map layout", () => {
  it("places attributes, derived values, rules and bars, actions in four columns left to right", () => {
    const graph = ruleMapGraph(htbah), layout = ruleMapLayout(graph, size);
    expect(layout.columns.map(c => c.kinds)).toEqual([["attribute"], ["computed"], ["rule", "bar"], ["action"]]);
    const x = (id: string) => layout.nodes.find(n => n.id === id)!.x;
    expect(x("attribute:hp")).toBeLessThan(x("computed:points_spent"));
    expect(x("computed:points_spent")).toBeLessThan(x("bar:hp"));
    expect(x("bar:hp")).toBeLessThan(x("action:damage"));
    expect(layout.width).toBeGreaterThan(4 * 180);
    // Sheet sections become group rows above their attributes, in sheet order.
    expect(layout.groups.map(g => g.label).slice(0, 2)).toEqual(htbah.sections.slice(0, 2).map(s => s.label));
    const group = layout.groups[0]!, hp = layout.nodes.find(n => n.id === "attribute:hp")!;
    expect(hp.y).toBeGreaterThan(group.y);
    // No two nodes in one column overlap.
    for (const column of layout.columns) {
      const placed = layout.nodes.filter(n => column.kinds.includes(graph.nodes.find(g => g.id === n.id)!.kind)).sort((a, b) => a.y - b.y);
      for (let i = 1; i < placed.length; i++) expect(placed[i]!.y).toBeGreaterThanOrEqual(placed[i - 1]!.y + placed[i - 1]!.height);
    }
  });
  it("orders a column by the centre of gravity of its attributes", () => {
    const draft = newPackage("Kaya"); draft.schemaVersion = 2;
    draft.computed = [{ id: "unten", label: "Unten", expression: "actor.vigour" }, { id: "oben", label: "Oben", expression: "actor.insight" }];
    const layout = ruleMapLayout(ruleMapGraph(draft), size);
    const y = (id: string) => layout.nodes.find(n => n.id === id)!.y;
    expect(y("attribute:insight")).toBeLessThan(y("attribute:vigour"));
    expect(y("computed:oben")).toBeLessThan(y("computed:unten"));
  });
  it("uses the size each node asks for, so an embedded formula gets its real height", () => {
    const graph = ruleMapGraph(htbah);
    const layout = ruleMapLayout(graph, node => node.id === "action:damage" ? { width: 900, height: 400 } : size(node));
    const damage = layout.nodes.find(n => n.id === "action:damage")!;
    expect(damage.width).toBe(900); expect(damage.height).toBe(400);
    expect(layout.columns[3]!.width).toBe(900);
  });
});
