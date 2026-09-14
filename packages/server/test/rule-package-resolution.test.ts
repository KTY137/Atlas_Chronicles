// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE, D20_REFERENCE_PACKAGE, supportedPackageContentHash } from "@chronicle/rules";
import type { Db } from "../src/db/index.ts";
import { Gone } from "../src/domain/errors.ts";
import { resolveRulePackage } from "../src/domain/rule-package-resolution.ts";

const dbWith = (document: unknown, contentHash: string): Db => ({
  query: async () => ({ rows: [{ document, content_hash: contentHash }], rowCount: 1 }),
} as unknown as Db);
const emptyDb = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Db;

describe("authoritative rule package resolution", () => {
  it("accepts the rules content hash stored by rule_packages", async () => {
    const pkg = D20_REFERENCE_PACKAGE, contentHash = supportedPackageContentHash(pkg);
    await expect(resolveRulePackage(dbWith(pkg, contentHash), "campaign", { id: pkg.id, version: pkg.version })).resolves.toEqual(pkg);
  });

  it("rejects a stored package whose declared content hash does not match", async () => {
    const pkg = D20_REFERENCE_PACKAGE;
    await expect(resolveRulePackage(dbWith(pkg, "0".repeat(64)), "campaign", { id: pkg.id, version: pkg.version })).rejects.toBeInstanceOf(Gone);
  });

  it("keeps the built-in demo as the only no-row fallback", async () => {
    await expect(resolveRulePackage(emptyDb, "campaign", { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version })).resolves.toEqual(DEMO_RULE_PACKAGE);
    await expect(resolveRulePackage(emptyDb, "campaign", { id: "org.example.missing", version: "1.0.0" })).rejects.toBeInstanceOf(Gone);
  });
});
