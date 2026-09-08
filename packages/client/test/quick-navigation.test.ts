// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { navigationCommands, searchNavigationCommands, isQuickNavigationShortcut } from "../src/features/quick-navigation";
import { parseStage, parseTableTab } from "../src/navigation";
import { FORGE_SECTIONS } from "../src/features/forge-navigation";

const identity = (text: string) => text;

describe("quick navigation catalogue", () => {
  it("has unique, stable IDs", () => {
    const commands = navigationCommands(true, identity);
    assert.equal(new Set(commands.map(command => command.id)).size, commands.length);
  });
  it("only points at existing application routes", () => {
    for (const command of navigationCommands(true, identity)) {
      assert.equal(parseStage(command.stage), command.stage);
      if (command.target?.forge) assert.ok(FORGE_SECTIONS.includes(command.target.forge));
      if (command.target?.tab) assert.equal(parseTableTab(command.target.tab, true), command.target.tab);
    }
  });
  it("reaches every forge workshop through the canonical forge target", () => {
    const sections = navigationCommands(true, identity).flatMap(command => command.target?.forge ? [command.target.forge] : []);
    assert.deepEqual(new Set(sections), new Set(FORGE_SECTIONS));
  });
  it("does not offer forge or canon controls to players", () => {
    const commands = navigationCommands(false, identity);
    assert.ok(commands.length > 0);
    assert.ok(commands.every(command => command.stage !== "schmiede" && command.target?.tab !== "canon"));
    assert.deepEqual(searchNavigationCommands(commands, "Lootkarte erstellen"), []);
  });
  it("keeps player table routes valid", () => {
    for (const command of navigationCommands(false, identity)) {
      if (command.target?.tab) assert.equal(parseTableTab(command.target.tab, false), command.target.tab);
    }
  });
  it("does not mutate the catalogue while filtering", () => {
    const commands = navigationCommands(true, identity);
    const before = JSON.stringify(commands);
    searchNavigationCommands(commands, "Kampf");
    assert.equal(JSON.stringify(commands), before);
  });
});

describe("quick navigation search", () => {
  const commands = navigationCommands(true, identity);
  it("keeps the default order for an empty or whitespace query", () => {
    assert.deepEqual(searchNavigationCommands(commands, " \t\n "), commands);
  });
  it("finds names without case sensitivity", () => {
    assert.equal(searchNavigationCommands(commands, "cHrOnIk")[0]?.stage, "wiki");
  });
  it("supports German umlaut transliteration", () => {
    assert.equal(searchNavigationCommands(commands, "wuerfeln")[0]?.target?.tab, "actions");
  });
  it("supports diacritic-free input", () => {
    assert.equal(searchNavigationCommands(commands, "wurfeln")[0]?.target?.tab, "actions");
  });
  it("combines tokens instead of requiring one exact phrase", () => {
    assert.equal(searchNavigationCommands(commands, "karte loot")[0]?.target?.forge, "loot");
  });
  it("requires every token", () => {
    assert.deepEqual(searchNavigationCommands(commands, "loot unknown-command-token"), []);
  });
  it("matches familiar English aliases", () => {
    assert.equal(searchNavigationCommands(commands, "inventory")[0]?.target?.tab, "actors");
  });
  it("prioritizes an exact title over a description mention", () => {
    assert.equal(searchNavigationCommands(commands, "Kampf")[0]?.id, "table-kampf");
  });
  it("matches translated labels while retaining German aliases", () => {
    const translated = navigationCommands(true, text => text === "Chronik" ? "Chronicle" : text);
    assert.equal(searchNavigationCommands(translated, "Chronicle")[0]?.stage, "wiki");
    assert.equal(searchNavigationCommands(translated, "Chronik")[0]?.stage, "wiki");
  });
  it("returns no commands for an unknown query", () => {
    assert.deepEqual(searchNavigationCommands(commands, "zzzz-no-such-command"), []);
  });
  it("treats regex metacharacters as text", () => {
    assert.deepEqual(searchNavigationCommands(commands, ".*"), []);
  });
});

describe("quick navigation shortcut", () => {
  const key = { key: "k", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, repeat: false, isComposing: false, defaultPrevented: false };
  it("accepts Ctrl+K and Command+K", () => {
    assert.equal(isQuickNavigationShortcut(key), true);
    assert.equal(isQuickNavigationShortcut({ ...key, key: "K", ctrlKey: false, metaKey: true }), true);
  });
  it("does not take plain typing or different shortcuts", () => {
    assert.equal(isQuickNavigationShortcut({ ...key, ctrlKey: false }), false);
    assert.equal(isQuickNavigationShortcut({ ...key, key: "p" }), false);
    assert.equal(isQuickNavigationShortcut({ ...key, altKey: true }), false);
    assert.equal(isQuickNavigationShortcut({ ...key, shiftKey: true }), false);
  });
  it("leaves composition, repeat and consumed events alone", () => {
    for (const flag of ["repeat", "isComposing", "defaultPrevented"] as const) {
      assert.equal(isQuickNavigationShortcut({ ...key, [flag]: true }), false);
    }
  });
});
