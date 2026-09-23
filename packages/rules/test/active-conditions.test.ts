// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { CHRONICLE_HEROES_PACKAGE, DEMO_RULE_PACKAGE, activeConditions } from "../src/index.ts";

describe("Die wirkenden Zustände eines Bogens", () => {
  const feld = CHRONICLE_HEROES_PACKAGE.abilityRules!.conditionField!;
  const [erster, zweiter] = CHRONICLE_HEROES_PACKAGE.conditions!;

  it("nennt sie mit Namen — ohne Doppelte und ohne Unbekannte", () => {
    const fields = { [feld]: `${erster!.id}, gibt-es-nicht ${zweiter!.id},${erster!.id}` };
    expect(activeConditions(CHRONICLE_HEROES_PACKAGE, fields)).toEqual([{ id: erster!.id, name: erster!.name }, { id: zweiter!.id, name: zweiter!.name }]);
  });

  it("ist leer ohne Eintrag und für Pakete ohne Zustände", () => {
    expect(activeConditions(CHRONICLE_HEROES_PACKAGE, {})).toEqual([]);
    expect(activeConditions(DEMO_RULE_PACKAGE, { zustaende: "irgendwas" })).toEqual([]);
  });
});
