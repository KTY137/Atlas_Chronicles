// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { createCampaignBundleV3 } from "@chronicle/io";
import { campaignFixtureV3 } from "../../io/test/campaign-v3-fixture.ts";

describe("independent native v3 durable replay completeness", () => {
  it("rejects a missing pruned mutation receipt whose version advancement is still provable", () => {
    const complete = campaignFixtureV3(53);
    expect(() => createCampaignBundleV3(complete)).not.toThrow();
    // The original move is outside the 50-patch window, but its receipt is
    // durable and must still prove the token's accepted version 2.
    expect(complete.tables.tactical_transitions.some(t => t.command_id === "move-1")).toBe(false);
    complete.tables.tactical_command_receipts = complete.tables.tactical_command_receipts.filter(r => r.command_id !== "move-1");
    // Recompute every outer hash: reject the semantic gap, not an old checksum.
    expect(() => createCampaignBundleV3(complete)).toThrow();
  });
});
