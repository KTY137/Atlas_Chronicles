// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it, vi } from "vitest";
import { CORE_SECTIONS, SECTIONS, SECTION_MODE_KEY, explainValidationError, readSectionMode, sectionCounts, visibleSections, writeSectionMode } from "../src/features/forge-navigation-model";
import { newPackage } from "../src/features/rule-forge-model";

// Spec E10: Die Werkbank öffnet mit dem Wichtigsten; ein Bereich mit Inhalt oder Problem wird nie versteckt.
describe("Das Wichtigste zuerst", () => {
  const none = {};
  it("zeigt die acht Kernbereiche immer", () => {
    expect(visibleSections("wichtig", none, none)).toEqual(["package", "fields", "vitals", "sheet", "actions", "abilities", "try", "publish"]);
    expect(CORE_SECTIONS).toHaveLength(8);
  });
  it("zeigt einen Nebenbereich, sobald er Inhalt hat", () => {
    expect(visibleSections("wichtig", { conditions: 1 }, none)).toContain("conditions");
    expect(visibleSections("wichtig", { conditions: 0 }, none)).not.toContain("conditions");
  });
  it("zeigt einen Nebenbereich mit einem Problem", () => {
    expect(visibleSections("wichtig", none, { migrations: 1 })).toContain("migrations");
  });
  it("zeigt in „Alle Bereiche“ alle vierzehn in der bisherigen Reihenfolge", () => {
    expect(visibleSections("alle", none, none)).toEqual([...SECTIONS]);
    expect(SECTIONS).toHaveLength(14);
  });
  it("versteckt den gerade offenen Bereich nie", () => {
    expect(visibleSections("wichtig", none, none, "map")).toContain("map");
  });
  it("zählt die Einträge eines Entwurfs je Bereich", () => {
    const counts = sectionCounts(newPackage("Kaya"));
    expect(counts.fields).toBeGreaterThan(0);
    expect(counts.package).toBe(0);
    expect(Object.keys(counts)).toHaveLength(14);
  });
  it("merkt sich die Wahl und übersteht gesperrten Speicher", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) });
    expect(readSectionMode()).toBe("wichtig");
    writeSectionMode("alle");
    expect(store.get(SECTION_MODE_KEY)).toBe("alle");
    expect(readSectionMode()).toBe("alle");
    vi.stubGlobal("localStorage", { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } });
    expect(readSectionMode()).toBe("wichtig");
    expect(() => writeSectionMode("alle")).not.toThrow();
    vi.unstubAllGlobals();
  });
});

describe("Befunde in Alltagssprache", () => {
  it("erklärt einen falschen Würfelstart ohne Fachwort", () => {
    const text = explainValidationError("seed: expected nonzero 128-bit hexadecimal seed");
    expect(text).toContain("Würfelstart");
    expect(text).not.toMatch(/hexadecimal|Hexadezimal|seed/);
  });
  it("lässt unbekannte Befunde stehen", () => {
    expect(explainValidationError("something new")).toBe("something new");
  });
});
