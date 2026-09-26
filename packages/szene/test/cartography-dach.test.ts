// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { parseTacticalCartography } from "../src/cartography.ts";

const basis = (extra: Record<string, unknown>) => ({ schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 32, origin: [0, 0] },
  regions: [{ regionId: "h", role: "building", authored: false, locked: false, provenance: null, ...extra }] });

/** Spec 2026-09-23-stadt-zukunft, E6: ein Gebäude darf sagen, wie sein Dach aussieht. */
describe("Dachform eines Gebäudes", () => {
  it("nimmt jede bekannte Form an und lässt sie weg, wenn sie fehlt", () => {
    for (const dach of ["giebel", "flach", "halle", "kuppel", "plattform"]) expect(parseTacticalCartography(basis({ dach })).regions[0]).toMatchObject({ dach });
    expect(parseTacticalCartography(basis({})).regions[0]).not.toHaveProperty("dach");
  });
  it("lehnt unbekannte Formen ab", () => {
    expect(() => parseTacticalCartography(basis({ dach: "zwiebel" }))).toThrow(/dach/);
  });
  it("gibt die Dachform nur Gebäuden", () => {
    expect(() => parseTacticalCartography({ ...basis({}), regions: [{ regionId: "l", role: "lot", authored: false, locked: false, provenance: null, dach: "flach" }] })).toThrow();
  });
});
