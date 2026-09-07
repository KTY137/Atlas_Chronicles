// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Copyright (c) 2026 Atlas Chronicles contributors. SPDX-License-Identifier: MIT
import { CAMPAIGN_BUNDLE_LIMITS } from "./campaign-schema.ts";

/** V3's outer envelope can hold an original 64 MiB source, including base64
 * and JSON escaping. The unchanged v2 core still enforces its own smaller limits.
 * Individual maxima do not override the aggregate serialized-byte limit. */
export const CAMPAIGN_BUNDLE_V3_LIMITS = Object.freeze({
  ...CAMPAIGN_BUNDLE_LIMITS,
  bytes: 256 * 1024 * 1024,
  sourceBytes: 64 * 1024 * 1024,
  sourceBase64Length: 4 * Math.ceil(64 * 1024 * 1024 / 3),
  stringLength: 4 * Math.ceil(64 * 1024 * 1024 / 3),
  undoTransitionsPerSession: 50,
});
