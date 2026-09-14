// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { canonicalHash, type CanonicalValue } from "@chronicle/core";
import { DEMO_RULE_PACKAGE, D20_REFERENCE_PACKAGE, supportedPackageContentHash } from "@chronicle/rules";
import type { Db } from "../src/db/index.ts";
import { Gone } from "../src/domain/errors.ts";
import { resolveRulePackage } from "../src/domain/rule-package-resolution.ts";

const dbWith = (document: unknown, contentHash: string): Db => ({
  query: async () => ({ rows: [{ document, content_hash: contentHash }], rowCount: 1 }),
} as unknown as Db);
const emptyDb = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Db;

describe("authoritative rule package resolution", () => {
  it("accepts the rules stableJson content hash used by rule_packages", async () => {
    const pkg = D20_REFERENCE_PACKAGE, contentHash = supportedPackageContentHash(pkg);
    await expect(resolveRulePackage(dbWith(pkg, contentHash), "campaign", { id: pkg.id, version: pkg.version })).resolves.toEqual(pkg);
  });

  it("does not confuse the core canonical hash with the rules package hash", async () => {
    const pkg = D20_REFERENCE_PACKAGE;
    const wrongDialect = canonicalHash(pkg as unknown as CanonicalValue);
    expect(wrongDialect).not.toBe(supportedPackageContentHash(pkg));
    await expect(resolveRulePackage(dbWith(pkg, wrongDialect), "campaign", { id: pkg.id, version: pkg.version })).rejects.toBeInstanceOf(Gone);
  });

  it("keeps the built-in demo as the only no-row fallback", async () => {
    await expect(resolveRulePackage(emptyDb, "campaign", { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version })).resolves.toEqual(DEMO_RULE_PACKAGE);
    await expect(resolveRulePackage(emptyDb, "campaign", { id: "org.example.missing", version: "1.0.0" })).rejects.toBeInstanceOf(Gone);
  });
});
