// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const editor = readFileSync(new URL("../src/features/RulePresentationEditor.tsx", import.meta.url), "utf8");
const translations = JSON.parse(readFileSync(new URL("../src/i18n/en/universal-rules.json", import.meta.url), "utf8")) as Record<string, string>;

describe("Presentation-v3 Forge contract", () => {
  it("prevents duplicate presentation references through the ordinary editor path", () => {
    expect(editor).toContain("function referenced(");
    expect(editor).toContain("function usedActions(");
    expect(editor).toContain("function availableRefs(");
    expect(editor).toContain("disabled={!canAdd(newKind)}");
    expect(editor).toContain("!flat.some(row => row.node.kind === \"abilities\")");
    expect(editor).toContain("!flat.some(row => row.node.kind === \"conditions\")");
    expect(editor).toContain("unavailableActions.has(action.id)");
    expect(editor).toContain("(node.refs?.length ?? 0) <= 1");
  });

  it("never writes explicit undefined into exact-optional collection properties", () => {
    expect(editor).toContain("function withPrimaryField(");
    expect(editor).toContain("function withStringEnum(");
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
    expect(editor).toContain("replaceCollection(index, nextCollection, [id, nextId])");
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
