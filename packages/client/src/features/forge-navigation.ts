// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export const FORGE_SECTIONS = ["overview", "loot", "actors", "maps", "media", "rules", "themes", "publication"] as const;
export type ForgeSection = typeof FORGE_SECTIONS[number];

export function parseForgeSection(value: string | null): ForgeSection {
  return FORGE_SECTIONS.find(section => section === value) ?? "overview";
}
