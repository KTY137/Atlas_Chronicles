// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export type Stage = "heute" | "ich" | "wiki" | "atlas" | "tisch" | "kanal" | "woche" | "schmiede" | "runde" | "account";
export type TableTab = "actions" | "sheet" | "scenes" | "canon" | "doors" | "actors" | "tactical" | "kampf";

export function parseStage(value: string | null, hasEntry = false): Stage {
  const stages: readonly string[] = ["heute", "ich", "wiki", "atlas", "tisch", "kanal", "woche", "schmiede", "runde", "account"];
  return stages.includes(value ?? "") ? value as Stage : hasEntry ? "wiki" : "heute";
}

/** Bookmarks, dashboard shortcuts and table controls resolve to the same view. */
export function parseTableTab(value: string | null, gm: boolean): TableTab {
  const tabs: readonly string[] = ["actions", "sheet", "scenes", "doors", "actors", "tactical", "kampf", ...(gm ? ["canon"] : [])];
  return tabs.includes(value ?? "") ? value as TableTab : "actions";
}
