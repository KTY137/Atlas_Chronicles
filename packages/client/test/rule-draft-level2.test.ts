// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { localKey, newField, newPackage } from "../src/features/rule-forge-model";
import { COALESCE_MS, HISTORY_LIMIT, changedArea, emptyHistory, record, redo, undo } from "../src/features/rule-draft-history";
import { clearDraft, draftKey, loadDraft, saveDraft } from "../src/features/rule-draft-store";

// Level 2 der Regelschmiede: nichts geht verloren (docs/superpowers/specs/2026-09-25-regelschmiede-leiter-design.md).
function memoryStorage(limit = Infinity) {
  const map = new Map<string, string>();
  return { map, getItem: (key: string) => map.get(key) ?? null, removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => { if (value.length > limit) { const error = new Error("exceeded"); error.name = "QuotaExceededError"; throw error; } map.set(key, value); } };
}

describe("Rückgängig über den ganzen Entwurf", () => {
  const base = newPackage("Kaya");
  const renamed = { ...base, name: "Nordlicht" };
  const withField = { ...renamed, fields: [...renamed.fields, newField("mut")] };

  it("erkennt den geänderten Bereich", () => {
    expect(changedArea(base, renamed)).toBe("package");
    expect(changedArea(renamed, withField)).toBe("fields");
  });

  it("nimmt Schritte zurück und wiederholt sie", () => {
    let history = record(emptyHistory(), base, renamed, 0);
    history = record(history, renamed, withField, 5000);
    const back = undo(history, withField)!;
    expect(back.draft).toBe(renamed);
    const back2 = undo(back.history, back.draft)!;
    expect(back2.draft).toBe(base);
    expect(undo(back2.history, back2.draft)).toBeNull();
    const forward = redo(back2.history, back2.draft)!;
    expect(forward.draft).toBe(renamed);
  });

  it("fasst schnelles Tippen im selben Bereich zu einem Schritt zusammen", () => {
    const typed = [base, { ...base, name: "N" }, { ...base, name: "No" }, { ...base, name: "Nor" }];
    let history = emptyHistory();
    for (let i = 1; i < typed.length; i++) history = record(history, typed[i - 1]!, typed[i]!, i * (COALESCE_MS / 4));
    expect(history.past).toHaveLength(1);
    expect(undo(history, typed[3]!)!.draft).toBe(base);
  });

  it("vergisst die Zukunft nach einer neuen Änderung und begrenzt den Verlauf", () => {
    let history = record(emptyHistory(), base, renamed, 0);
    history = undo(history, renamed)!.history;
    history = record(history, base, withField, 5000);
    expect(history.future).toHaveLength(0);
    let long = emptyHistory(), draft = base;
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) { const next = { ...draft, name: `n${i}` }; long = record(long, draft, next, i * 10_000); draft = next; }
    expect(long.past).toHaveLength(HISTORY_LIMIT);
  });
});

describe("Entwurf auf dem Gerät", () => {
  it("überlebt Speichern und Laden, und neue Kennungen fallen nicht mit alten zusammen", () => {
    const store = memoryStorage(), draft = newPackage("Kaya");
    expect(saveDraft("kampagne", draft, 1234, store)).toBe("saved");
    expect(store.map.has(draftKey("kampagne"))).toBe(true);
    const loaded = loadDraft("kampagne", store)!;
    expect(loaded.savedAt).toBe(1234);
    expect(loaded.draft).toEqual(draft);
    const taken = new Set(JSON.stringify(draft).match(/forge-\d+/g));
    expect(taken.has(localKey())).toBe(false);
    clearDraft("kampagne", store);
    expect(loadDraft("kampagne", store)).toBeNull();
  });

  it("meldet einen vollen Speicher statt still zu scheitern", () => {
    expect(saveDraft("kampagne", newPackage("Kaya"), 1, memoryStorage(10))).toBe("full");
    expect(saveDraft("kampagne", newPackage("Kaya"), 1, null)).toBe("unavailable");
  });

  it("verwirft einen beschädigten Eintrag, statt die Werkstatt zu blockieren", () => {
    const store = memoryStorage();
    store.map.set(draftKey("kampagne"), "{kaputt");
    expect(loadDraft("kampagne", store)).toBeNull();
    store.map.set(draftKey("kampagne"), JSON.stringify({ version: 1, savedAt: 1, draft: { name: "ohne Felder" } }));
    expect(loadDraft("kampagne", store)).toBeNull();
    expect(store.map.has(draftKey("kampagne"))).toBe(false);
  });
});
