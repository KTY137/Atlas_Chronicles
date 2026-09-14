// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { RulePackageV2 } from "../package-v2.ts";
import { CHRONICLES_LITE_PACKAGE } from "./chronicles-lite.ts";
import { FIFTH_EDITION_REFERENCE_PACKAGE } from "./fifth-edition-reference.ts";
import { D20_REFERENCE_PACKAGE, THREE_D20_REFERENCE_PACKAGE } from "./universal-reference.ts";

/**
 * The canonical first-party compatibility matrix used by the Forge and regression tests.
 * These packages are clean-room structural references, not bundled third-party rulebooks.
 */
export const UNIVERSAL_REFERENCE_PACKAGES: readonly RulePackageV2[] = Object.freeze([
  D20_REFERENCE_PACKAGE,
  FIFTH_EDITION_REFERENCE_PACKAGE,
  THREE_D20_REFERENCE_PACKAGE,
  CHRONICLES_LITE_PACKAGE,
]);
