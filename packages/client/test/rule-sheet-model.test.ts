// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { D20_REFERENCE_PACKAGE, stableJson, type RulePresentationNode } from "@chronicle/rules";
import { compilePackage, newField, newPackage, packageDraft, validateDraft } from "../src/features/rule-forge-model";
import { isOnSheet, placeOnSheet, sectionsFromTree, sheetTree, syncSheetWithFields, withSheetTree } from "../src/features/rule-sheet-model";

const refs = (nodes: readonly RulePresentationNode[], kind: RulePresentationNode["kind"]): string[] => nodes.flatMap(node =>
  [...(node.kind === kind && "ref" in node ? [node.ref] : []), ...(node.kind === "group" ? refs(node.children, kind) : [])]);

describe("der Bogen hat eine Wahrheit", () => {
  it("lässt ein unberührtes Paket byteidentisch", () => {
    const draft = packageDraft(D20_REFERENCE_PACKAGE);
    expect(placeOnSheet(draft, "vital", D20_REFERENCE_PACKAGE.vitals![0]!.id, true)).toBe(draft);
    expect(syncSheetWithFields(draft, draft.fields)).toBe(draft);
    expect(stableJson(compilePackage(draft))).toBe(stableJson(D20_REFERENCE_PACKAGE));
  });

  it("zeigt bei einem neuen Paket den Baum, den die Prüfung auch benutzt (Befund 7)", () => {
    const draft = newPackage("Kaya");
    const fields = [...draft.fields, { ...newField("mut"), label: "Mut" }];
    const next = syncSheetWithFields({ ...draft, fields }, draft.fields);
    expect(refs(sheetTree(next), "field")).toContain("mut");
    const compiled = compilePackage(next);
    expect(compiled.schemaVersion === 2 && refs(compiled.presentation!.root, "field")).toContain("mut");
  });

  it("leitet die Abschnitte aus den Kategorien des Baums ab (Befund 5)", () => {
    const draft = newPackage("Kaya");
    const root: RulePresentationNode[] = [{ kind: "group", id: "group-werte", label: "Werte", children: [
      { kind: "field", id: "feld-name", ref: "name" },
      { kind: "group", id: "koerper", label: "Körper", children: [{ kind: "field", id: "feld-vigour", ref: "vigour" }] },
    ] }, { kind: "field", id: "feld-insight", ref: "insight" }];
    const next = withSheetTree(draft, root);
    expect(next.presentationAuto).toBe(false);
    const compiled = validateDraft(next);
    expect(compiled.valid).toBe(true);
    if (!compiled.valid) return;
    expect(compiled.value.layout.sections).toEqual([
      { id: "werte", label: "Werte", fields: ["name"] },
      { id: "koerper", label: "Körper", fields: ["vigour"], parent: "werte" },
    ]);
  });

  it("hält sich an die Grenze von 64 Abschnitten", () => {
    const groups: RulePresentationNode[] = Array.from({ length: 70 }, (_, i) => ({ kind: "group", id: `g${i}`, label: `G${i}`, children: [] }));
    expect(sectionsFromTree(groups, [])).toHaveLength(64);
  });

  it("legt einen neuen Balken sofort auf den Bogen, oben zu den anderen Balken (Befund 6)", () => {
    const draft = newPackage("Kaya");
    const withVital = { ...draft, vitals: [{ id: "vigour", label: "Leben", max: "10", depletion: "defeat" as const }] };
    expect(isOnSheet(withVital, "vital", "vigour")).toBe(false);
    const placed = placeOnSheet(withVital, "vital", "vigour", true);
    expect(placed.presentation!.root[0]).toMatchObject({ kind: "vital", ref: "vigour" });
    expect(validateDraft(placed).valid).toBe(true);
    const removed = placeOnSheet(placed, "vital", "vigour", false);
    expect(isOnSheet(removed, "vital", "vigour")).toBe(false);
    expect(validateDraft(removed).valid).toBe(true);
  });

  it("nimmt Knoten und Balken eines entfernten Attributs mit, statt das Paket zu zerbrechen", () => {
    const base = newPackage("Kaya");
    const draft = placeOnSheet({ ...base, vitals: [{ id: "vigour", label: "Leben", max: "10", depletion: "none" as const }] }, "vital", "vigour", true);
    const fields = draft.fields.filter(field => field.id !== "vigour");
    const next = syncSheetWithFields({ ...draft, fields, sections: draft.sections.map(s => ({ ...s, fieldKeys: s.fieldKeys.filter(key => fields.some(f => f.localId === key)) })) }, draft.fields);
    expect(next.vitals).toEqual([]);
    expect(refs(sheetTree(next), "field")).not.toContain("vigour");
    expect(refs(sheetTree(next), "vital")).not.toContain("vigour");
    expect(validateDraft(next).valid).toBe(true);
  });

  it("nimmt eine Liste mit, wenn ihr Speicherattribut entfernt wird (Review 2026-09-23)", () => {
    const draft = packageDraft(D20_REFERENCE_PACKAGE);
    const storage = draft.collections![0]!.storageField;
    const fields = draft.fields.filter(field => field.id !== storage);
    const next = syncSheetWithFields({ ...draft, fields, sections: draft.sections.map(s => ({ ...s, fieldKeys: s.fieldKeys.filter(key => fields.some(f => f.localId === key)) })) }, draft.fields);
    expect(next.collections!.map(row => row.storageField)).not.toContain(storage);
    expect(refs(sheetTree(next), "collection")).not.toContain(draft.collections![0]!.id);
    expect(validateDraft(next).valid).toBe(true);
  });

  it("legt ein neues Attribut bei festem Baum in „Weitere Felder“ oder ans Ende", () => {
    const draft = placeOnSheet({ ...newPackage("Kaya"), vitals: [{ id: "vigour", label: "Leben", max: "10", depletion: "none" as const }] }, "vital", "vigour", true);
    const fields = [...draft.fields, { ...newField("mut"), label: "Mut" }];
    const next = syncSheetWithFields({ ...draft, fields }, draft.fields);
    expect(refs(sheetTree(next), "field")).toContain("mut");
    expect(validateDraft(next).valid).toBe(true);
  });
});
