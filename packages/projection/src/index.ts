// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * `@chronicle/projection` — die Sicht als Bibliothek.
 *
 * Rein und serverseitig: konsumiert GM-Wahrheit (chronik-Atome) plus das hergeleitete
 * Wissen EINES Betrachters, emittiert geschlossene Payload-Formen. Kennt weder Storage
 * noch HTTP noch Pixi. `tools/gate-boundaries.mjs` hält die Schichten.
 */
export {
  projiziereEntry,
  entryBytes,
  LEERES_WISSEN,
  type EntryQuelle,
  type EntryProjektion,
  type ProjiziertePassage,
  type ProjBlock,
  type ProjInline,
  type ProjMark,
  type BetrachterWissen,
  type Tuer,
} from "./entry.ts";
