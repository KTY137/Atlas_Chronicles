// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import {
  DEMO_RULE_PACKAGE, RULE_PRESENTATION_SCHEMA_VERSION, RULE_RUNTIME_CONTRACT, buildRuleRuntime, decodeRuleCollectionValue,
  encodeRuleCollectionValue, parseSupportedRulePackage, previewRuleRuntime, supportedPackageContentHash,
} from "../src/index.ts";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const baseV2 = () => ({
  ...clone(DEMO_RULE_PACKAGE), schemaVersion: 2 as const,
  id: "org.atlas-chronicles.test.presentation", version: "1.0.0",
  computed: [{ id: "double_vigour", label: "Doppelte Kraft", expression: "actor.vigour * 2" }],
  vitals: [{ id: "vigour", label: "Kraft", max: "12", depletion: "none" as const }],
});

describe("presentation schema v3", () => {
  it("parses every universal leaf and projects host-evaluated visibility", () => {
    const raw = baseV2();
    raw.fields = {
      ...raw.fields,
      inventory_data: { type: "string", label: "Inventardaten", maxLength: 4096, default: "[]" },
    };
    const pkg = parseSupportedRulePackage({ ...raw,
      collections: [{ id: "inventory", label: "Inventar", storageField: "inventory_data", minItems: 0, maxItems: 8, primaryField: "name",
        itemFields: { name: { type: "string", label: "Name", maxLength: 120, default: "" }, amount: { type: "integer", label: "Menge", minimum: 1, maximum: 99, default: 1 } } }],
      presentation: { schemaVersion: RULE_PRESENTATION_SCHEMA_VERSION, root: [
        { kind: "group", id: "main", label: "Bogen", render: "grid", children: [
          { kind: "field", id: "field-name", ref: "name" },
          { kind: "computed", id: "computed-double", ref: "double_vigour" },
          { kind: "vital", id: "vital-vigour", ref: "vigour" },
          { kind: "collection", id: "inventory-list", ref: "inventory", render: "table" },
          { kind: "actions", id: "checks", refs: ["investigate"] },
          { kind: "group", id: "strong-only", label: "Stark", visibleIf: "actor.vigour >= 8", children: [{ kind: "field", id: "field-insight", ref: "insight" }] },
        ] },
      ] },
    });
    if (pkg.schemaVersion !== 2) throw new Error("expected v2 mechanics package");
    expect(pkg.presentation?.schemaVersion).toBe(3);
    expect(pkg.collections?.[0]?.storageField).toBe("inventory_data");
    const runtime = buildRuleRuntime(pkg);
    expect(runtime.contractVersion).toBe(RULE_RUNTIME_CONTRACT);
    expect(runtime.presentation?.root[0]?.kind).toBe("group");
    const low = previewRuleRuntime(pkg, { ...runtime.defaults, vigour: 6 });
    expect(low.valid).toBe(true);
    expect(low.visiblePresentationIds).not.toContain("strong-only");
    const high = previewRuleRuntime(pkg, { ...runtime.defaults, vigour: 9 });
    expect(high.visiblePresentationIds).toContain("strong-only");
    expect(high.visiblePresentationIds).toContain("field-insight");
  });

  it("validates collection rows through the ordinary actor field contract", () => {
    const raw = baseV2();
    raw.fields = { ...raw.fields, spells_data: { type: "string", label: "Zauberdaten", maxLength: 4096, default: "[]" } };
    const pkg = parseSupportedRulePackage({ ...raw, collections: [{ id: "spells", label: "Zauber", storageField: "spells_data", minItems: 0, maxItems: 2,
      itemFields: { name: { type: "string", label: "Name", maxLength: 80, default: "" }, level: { type: "integer", label: "Grad", minimum: 0, maximum: 9, default: 0 } } }] });
    if (pkg.schemaVersion !== 2) throw new Error("expected v2 mechanics package");
    const collection = pkg.collections![0]!;
    const encoded = encodeRuleCollectionValue(collection, [{ name: "Funke", level: 1 }]);
    expect(decodeRuleCollectionValue(collection, encoded)).toEqual([{ name: "Funke", level: 1 }]);
    expect(previewRuleRuntime(pkg, { ...buildRuleRuntime(pkg).defaults, spells_data: encoded }).valid).toBe(true);
    expect(previewRuleRuntime(pkg, { ...buildRuleRuntime(pkg).defaults, spells_data: '[{"name":"X","level":99}]' }).valid).toBe(false);
    expect(() => encodeRuleCollectionValue(collection, [{ name: "A", level: 1 }, { name: "B", level: 2 }, { name: "C", level: 3 }])).toThrow(/item count/);
  });

  it("rejects unsafe visibility and broken/duplicate references", () => {
    const raw = baseV2();
    const presentation = (node: unknown) => ({ ...raw, presentation: { schemaVersion: 3, root: [node] } });
    expect(() => parseSupportedRulePackage(presentation({ kind: "field", id: "x", ref: "missing" }))).toThrow(/unknown field reference/);
    expect(() => parseSupportedRulePackage(presentation({ kind: "group", id: "root", label: "R", children: [
      { kind: "field", id: "a", ref: "name" }, { kind: "field", id: "b", ref: "name" },
    ] }))).toThrow(/duplicate field reference/);
    expect(() => parseSupportedRulePackage(presentation({ kind: "field", id: "x", ref: "name", visibleIf: "1d20 > 10" }))).toThrow(/dice forbidden/);
    expect(() => parseSupportedRulePackage(presentation({ kind: "field", id: "x", ref: "name", visibleIf: "actor.vigour + 1" }))).toThrow(/expected boolean/);
  });

  it("binds presentation changes into immutable package content hashes", () => {
    const raw = baseV2();
    const a = parseSupportedRulePackage({ ...raw, presentation: { schemaVersion: 3, root: [{ kind: "field", id: "name-field", ref: "name" }] } });
    const b = parseSupportedRulePackage({ ...raw, presentation: { schemaVersion: 3, root: [{ kind: "field", id: "name-field", ref: "name", render: "cards" }] } });
    expect(supportedPackageContentHash(a)).not.toBe(supportedPackageContentHash(b));
  });
});
