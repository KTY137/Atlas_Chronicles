// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTacticalCartography } from "@chronicle/szene";
import { exportTacticalUvtt, importUvtt } from "../src/uvtt.ts";
const sample = readFileSync(new URL("./fixtures/uvtt/sampleMap.dd2vtt", import.meta.url), "utf8");
const { provenance } = JSON.parse(readFileSync(new URL("./fixtures/uvtt/provenance.json", import.meta.url), "utf8"));
const imported = importUvtt(sample, provenance);
const cartography = parseTacticalCartography({ schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 256, origin: [0, 0] }, regions: [] }, imported.document);
describe("cartographic UVTT export fidelity", () => {
  it("preserves the rendered image and says exactly which native semantics are lost", () => {
    const result = exportTacticalUvtt(imported.document, imported.image, cartography);
    expect(JSON.parse(result.json).image).toBe(imported.image!.base64);
    expect(result.fidelity.nativeRoundTrip).toBe(false);
    expect(result.fidelity.issues).toContainEqual(expect.objectContaining({ path: "cartography", severity: "loss" }));
    expect(importUvtt(result.json, provenance).document.geometry.size).toEqual(imported.document.geometry.size);
  });
  it("refuses a semantic-only cartography export instead of quietly producing a blank image", () => {
    expect(() => exportTacticalUvtt({ ...imported.document, background: null }, null, cartography)).toThrow(/gerendertes/);
  });
  it("keeps legacy exports unchanged when no cartography sidecar exists", () => {
    expect(exportTacticalUvtt(imported.document, imported.image).fidelity.issues.some(issue => issue.path === "cartography")).toBe(false);
  });
});
