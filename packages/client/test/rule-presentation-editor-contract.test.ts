// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Bogen-Editor und Listen teilen sich seit dem Umbau vom 2026-09-23 auf zwei Dateien; der Vertrag gilt für beide.
const editor = ["RulePresentationEditor.tsx", "RuleCollectionEditor.tsx"].map(file => readFileSync(new URL(`../src/features/${file}`, import.meta.url), "utf8")).join("\n");
const translations = JSON.parse(readFileSync(new URL("../src/i18n/en/universal-rules.json", import.meta.url), "utf8")) as Record<string, string>;

describe("Presentation-v3 Forge contract", () => {
  it("prevents duplicate presentation references through the ordinary editor path", () => {
    expect(editor).toContain("function referenced(");
    expect(editor).toContain("function usedActions(");
    expect(editor).toContain("function availableRefs(");
    expect(editor).toContain('canAdd("abilities") ?');
    expect(editor).toContain('canAdd("actions") ?');
    expect(editor).toContain("!flat.some(row => row.node.kind === \"abilities\")");
    expect(editor).toContain("!flat.some(row => row.node.kind === \"conditions\")");
    expect(editor).toContain("unavailableActions.has(action.id)");
    expect(editor).toContain("(node.refs?.length ?? 0) <= 1");
  });

  it("never writes explicit undefined into exact-optional presentation properties", () => {
    expect(editor).toContain("function withPrimaryField(");
    expect(editor).toContain("function normalizedStringField(");
    expect(editor).toContain("function withOptionalNodeText(");
    expect(editor).not.toContain("primaryField: undefined");
    expect(editor).not.toContain("enum: undefined");
    expect(editor).not.toContain("label: event.target.value || undefined");
    expect(editor).not.toContain("visibleIf: event.target.value || undefined");
  });

  it("keeps collection package defaults compatible when the collection schema changes", () => {
    expect(editor).toContain("function normalizeCollectionDefault(");
    expect(editor).toContain("while (rows.length < collection.minItems)");
    expect(editor).toContain("raw.slice(0, collection.maxItems)");
    expect(editor).toContain("compatibleValue(field, source[id])");
    expect(editor).toContain("replaceCollection(nextCollection, [id, nextId])");
  });

  it("normalizes enum and numeric bounds before the parser has to reject the draft", () => {
    expect(editor).toContain("function uniqueStrings(");
    expect(editor).toContain("if (values.length && !values.includes(defaultValue)) defaultValue = values[0]!");
    expect(editor).toContain("function normalizedNumericField(");
    expect(editor).toContain("if (minimum > maximum)");
    expect(editor).toContain("defaultValue = Math.max(minimum, Math.min(maximum, defaultValue))");
    expect(editor).toContain("field.enum?.length ? <select");
  });

  it("ships English copy for every new collection-schema control", () => {
    expect(translations).toMatchObject({
      "Neue Sammlung": "New collection",
      "Minimale Einträge": "Minimum entries",
      "Maximale Einträge": "Maximum entries",
      "Vorgabe": "Default",
      "Zeichenlimit": "Character limit",
      "Auswahlwerte (Komma)": "Choice values (comma-separated)",
      "Minimum": "Minimum",
      "Maximum": "Maximum",
      "Feld entfernen": "Remove field",
    });
  });
});
