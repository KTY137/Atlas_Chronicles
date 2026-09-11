// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const panel = readFileSync(new URL("../src/features/ActorDeletionPanel.tsx", import.meta.url), "utf8");
const forge = readFileSync(new URL("../src/features/ForgeWorkbench.tsx", import.meta.url), "utf8");
const gameApi = readFileSync(new URL("../src/features/game-api.ts", import.meta.url), "utf8");

describe("permanentes Löschen von Figuren und Figurvorlagen", () => {
  it("steht nur der Spielleitung in der Figurenansicht zur Verfügung", () => {
    expect(forge).toContain("<ActorDeletionPanel");
    expect(forge).toContain("Figuren & NPCs");
  });
  it("sendet bewusstes DELETE für Figur und Vorlage und verlangt einen Grund", () => {
    expect(panel).toContain('`/actors/${actor.id}`');
    expect(panel).toContain('`/actor-templates/${template.id}`');
    expect(panel.match(/"DELETE"/g)).toHaveLength(2);
    expect(panel).toContain("reason.trim()");
    expect(panel).toContain("Figur samt Charakterbogen endgültig löschen");
    expect(panel).toContain("Figurvorlage endgültig löschen");
  });
  it("erlaubt DELETE im wiederholbaren Befehlshelfer", () => {
    expect(gameApi).toContain('"POST" | "PUT" | "DELETE"');
  });
});
