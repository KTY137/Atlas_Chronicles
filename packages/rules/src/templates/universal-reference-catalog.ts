// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { RulePackageV2 } from "../package-v2.ts";
import { CHRONICLES_LITE_PACKAGE } from "./chronicles-lite.ts";
import { FIFTH_EDITION_REFERENCE_PACKAGE } from "./fifth-edition-reference.ts";
import { FIFTH_EDITION_SRD_PACKAGE } from "./fifth-edition-srd.ts";
import { D20_REFERENCE_PACKAGE, THREE_D20_REFERENCE_PACKAGE } from "./universal-reference.ts";

/**
 * Canonical compatibility matrix used by the Forge and regression tests.
 * Generic Atlas packages are clean-room structural references; FIFTH_EDITION_SRD_PACKAGE is the
 * separately attributed CC-BY-4.0 SRD 5.1 implementation declared in fifth-edition-srd.ts.
 */
export const UNIVERSAL_REFERENCE_PACKAGES: readonly RulePackageV2[] = Object.freeze([
  D20_REFERENCE_PACKAGE,
  FIFTH_EDITION_REFERENCE_PACKAGE,
  FIFTH_EDITION_SRD_PACKAGE,
  THREE_D20_REFERENCE_PACKAGE,
  CHRONICLES_LITE_PACKAGE,
]);
