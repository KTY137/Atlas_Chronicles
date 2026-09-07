// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE, defaultActorFields, evaluateAction, parseRulePackage, stableJson } from "@chronicle/rules";
import { RollCard } from "../src/features/RollCard";
import type { ActionCard } from "../src/features/game-api";

function cardFor(expression: string, seed: string): ActionCard {
  const pkg = parseRulePackage({ ...DEMO_RULE_PACKAGE, actions: [{ ...DEMO_RULE_PACKAGE.actions[0]!, expression }] });
  const receipt = evaluateAction(pkg, "investigate", {
    seed, actor: defaultActorFields(pkg), input: {}, knowledge: { actorId: "actor", passages: [] },
  });
  return { id: "roll", actorId: "actor", status: "ausstehend", receipt, receiptHash: "a".repeat(64),
    preparedAt: Date.UTC(2026, 8, 6, 12), fictionDate: "Tag 1", vollmachtId: null, confirmation: null };
}

function renderDice(card: ActionCard) {
  const before = stableJson(card.receipt);
  const html = renderToStaticMarkup(createElement(RollCard, { card, campaignId: "campaign", actorName: "Sera", onChanged: () => {} }));
  expect(stableJson(card.receipt)).toBe(before);
  const dice = html.match(/<div class="dice-results"[^>]*>(.*?)<\/div>/s)?.[1];
  expect(dice).toBeDefined();
  return { html: dice!, text: dice!.replace(/<[^>]+>/g, "") };
}

describe("RollCard retained dice", () => {
  it("displays the W12 face selected by index zero", () => {
    const card = cardFor("1d12", "1234567890abcdef01234567fedcba98");
    expect(card.receipt.dice[0]).toMatchObject({ rolls: [[10]], kept: [0], total: 10 });
    const rendered = renderDice(card);
    expect(rendered.text).toBe("10W12");
    expect(rendered.html).toContain('aria-label="W12: 10"');
  });

  it("displays retained exploding chains and their totals, excluding lower ranks", () => {
    const card = cardFor("4d6kh2!2", "deadbeefc0ffee00123456789abcdef0");
    expect(card.receipt.dice[0]).toMatchObject({ rolls: [[3], [5], [6, 6, 6], [3]], kept: [1, 2], total: 23, capped: true });
    const rendered = renderDice(card);
    expect(rendered.text).toBe("5W66 + 6 + 6 = 18W6");
    expect(rendered.html).toContain('aria-label="W6: 6 + 6 + 6 = 18"');
  });

  it("renders lowest retained faces without the discarded exploding chain", () => {
    const card = cardFor("4d6kl2!2", "deadbeefc0ffee00123456789abcdef0");
    expect(card.receipt.dice[0]).toMatchObject({ rolls: [[3], [5], [6, 6, 6], [3]], kept: [0, 3], total: 6 });
    expect(renderDice(card).text).toBe("3W63W6");
  });
});
