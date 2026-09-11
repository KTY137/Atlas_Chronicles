// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createPacks } from "../src/domain/packs.ts";

describe("installed expedition artwork", () => {
  it("discovers the pack through the real manifest parser", () => {
    const packs = createPacks();
    expect(packs.list()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "pk.expedition", version: "1.0.0", assetCount: 24 }),
    ]));
    expect(packs.manifest("pk.expedition").assets).toHaveLength(24);
  });

  it("resolves and verifies every committed SVG through the serving boundary", () => {
    const packs = createPacks();
    for (const asset of packs.manifest("pk.expedition").assets) {
      const served = packs.readAsset("pk.expedition", asset.datei);
      expect(served.mimeType).toBe("image/svg+xml");
      expect(served.bytes.length).toBe(asset.bytes);
      expect(createHash("sha256").update(served.bytes).digest("hex")).toBe(asset.sha256);
      expect(served.bytes.toString("utf8")).toContain(`viewBox="0 0 ${asset.groesse.join(" ")}"`);
    }
  });

  it("does not expose unlisted files or traversal paths", () => {
    const packs = createPacks();
    for (const name of ["../pk.natur/paket.json", "lizenz.txt", "aufbau/missing.svg"]) {
      expect(() => packs.readAsset("pk.expedition", name)).toThrow();
    }
  });
});
