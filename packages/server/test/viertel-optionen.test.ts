// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { createGrundriss, validateKartenOptionen } from "../src/domain/grundriss.ts";
import { GrundrissSchema } from "../src/http/grundriss.ts";
import type { Db } from "../src/db/index.ts";

const request = (optionen: object) => ({ commandId: "c", name: "Stadt", keim: "k", art: "siedlung", stil: "gemalt", optionen });
describe("Stadtmauer und Burg als Siedlungsoptionen (Viertelstadt)", () => {
  it("nimmt mauer und burg für Siedlungen an, an jeder der drei Stellen", () => {
    expect(() => validateKartenOptionen("siedlung", { art: "stadt", mauer: false, burg: true })).not.toThrow();
    expect(Value.Check(GrundrissSchema, request({ art: "stadt", mauer: false, burg: true }))).toBe(true);
    expect(Value.Check(GrundrissSchema, request({ art: "stadt", mauer: "ja" }))).toBe(false);
  });
  it("lehnt sie für andere Kartenarten ab", () => {
    expect(() => validateKartenOptionen("grundriss", { mauer: true } as never)).toThrow();
  });
  it("veröffentlicht die Vorgaben je Setting, damit Vorschau und Vorlage dieselbe Zahl nennen", () => {
    const defaults = createGrundriss(null as unknown as Db, { origin: "https://x.test", cookieSecret: "x".repeat(40) } as never).defaults();
    expect(defaults.siedlungsartenJeSetting.fantasy.stadt).toMatchObject({ bauwerke: 320, mauer: true, burg: true });
    expect(defaults.siedlungsartenJeSetting.scifi.stadt.bauwerke).toBe(224);
    expect(defaults.siedlungsarten.stadt.bauwerke).toBe(320);
  });
});
