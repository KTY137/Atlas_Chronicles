// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { CampaignTables } from "./campaign-schema.ts";
import { fail, object } from "./campaign-v3-json.ts";

/** Current runtime admission adds this invariant without rewriting frozen legacy envelopes. */
export function requireReciprocalMintEvidence(tables: CampaignTables): void {
  const rolls = new Map(tables.action_rolls.map(roll => [roll.id, roll]));
  for (const mint of tables.confirmed_mints) if (mint.roll_id !== null) {
    const roll = rolls.get(mint.roll_id!), confirmation = roll?.confirmation ? object(roll.confirmation, "mint.confirmation") : null;
    if (roll?.status !== "bestaetigt" || confirmation?.success !== true || !confirmation.mint || object(confirmation.mint, "mint.confirmation.mint").id !== mint.id)
      fail("confirmed_mints", "roll-backed mint requires reciprocal successful confirmed roll evidence");
  }
}
