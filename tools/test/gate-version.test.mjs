// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pruefeVersionen } from "../gate-version.mjs";

test("akzeptiert übereinstimmende, gesetzte Versionen", () => {
  assert.deepEqual(pruefeVersionen([
    { name: "chronicle", version: "0.1.0" },
    { name: "@chronicle/desktop", version: "0.1.0" },
  ]), []);
});

test("weist die Platzhalterversion der Wurzel zurück", () => {
  const verstoesse = pruefeVersionen([
    { name: "chronicle", version: "0.0.0" },
    { name: "@chronicle/desktop", version: "0.1.0" },
  ]);
  assert.equal(verstoesse.length, 1);
  assert.match(verstoesse[0], /chronicle/);
});

test("weist auseinanderlaufende Versionen zurück", () => {
  const verstoesse = pruefeVersionen([
    { name: "chronicle", version: "0.1.0" },
    { name: "@chronicle/desktop", version: "0.2.0" },
  ]);
  assert.equal(verstoesse.length, 1);
  assert.match(verstoesse[0], /@chronicle\/desktop/);
});

test("ignoriert Bibliothekspakete ohne eigene Auslieferung", () => {
  assert.deepEqual(pruefeVersionen([
    { name: "chronicle", version: "0.1.0" },
    { name: "@chronicle/desktop", version: "0.1.0" },
    { name: "@chronicle/projection", version: "0.0.0" },
  ]), []);
});
