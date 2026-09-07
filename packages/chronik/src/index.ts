// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * `@chronicle/chronik` — Passage, Revelation, document, provenance.
 *
 * May NOT know: Pixi, map paint (design/06-giga-product-architecture.md:2870-2882).
 * `packages/forge` may never import this package — gate K-G8, enforced by
 * `tools/gate-boundaries.mjs`. Cheap now, impossible to repair later.
 */
export {
  BLOCK_AST_VERSION,
  type Entry,
  type EntryArt,
  type Revision,
  type Alias,
  type InlineMark,
  type InlineText,
  type Blockinhalt,
  type RohblockGrund,
  type Bildausrichtung,
  type Geltung,
  type Praegung,
  type Passage,
  type LineageEvent,
  type Quelle,
  type Erfahrungsgrad,
  type Revelation,
  type Link,
  type Beziehung,
  type Beziehungsart,
  type Gefuegegraph,
  graphVon,
  istGerichtet,
  type Tuerklasse,
  type RoterLink,
  type ImportHerkunft,
  type LizenzStatus,
  type Asset,
  type ImportBericht,
  type Verlust,
} from "./model.ts";

export {
  lineage,
  resolvePassage,
  mergeGuard,
  erfahrungsgrad,
  tuerklasse,
  type LineageBlock,
  type MergeBlocker,
} from "./lineage.ts";
