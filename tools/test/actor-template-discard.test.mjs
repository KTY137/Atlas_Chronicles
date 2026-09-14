// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("../../packages/client/src/features/ActorTemplatesHost.tsx", import.meta.url), "utf8");

test("actor template form has an explicit discard flow instead of a blanket bubbling onChange lock", () => {
  assert.doesNotMatch(source, /<form\s+className="panel creation-template-form"\s+onChange=/,
    "the whole form must not mark itself dirty for every bubbling child change");
  assert.match(source, /const\s+dirty\s*=\s*currentState\s*!==\s*baseline/,
    "dirty state must be derived from current values versus the saved baseline");
  assert.match(source, /stableJson\(\{[\s\S]*name[\s\S]*kind[\s\S]*pin[\s\S]*fields[\s\S]*beute/,
    "the dirty comparison must include the persisted template state");
  assert.match(source, /const\s+discard\s*=\s*\(\)\s*=>/,
    "the form needs an explicit discard action");
  assert.match(source, /Änderungen verwerfen/,
    "the discard action must be reachable in the UI");
  assert.match(source, /setDraft\(\{\s*pin:\s*original\?\.definition\.package\s*\?\?\s*rules\.pin,\s*fields:\s*original\?\.definition\.fields\s*\?\?\s*null\s*\}\)/,
    "discard must restore the original package pin and fields rather than merely clear the parent dirty flag");
});
