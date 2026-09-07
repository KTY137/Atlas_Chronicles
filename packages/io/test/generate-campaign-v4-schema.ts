// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { writeFile } from "node:fs/promises";
import { CAMPAIGN_BUNDLE_V4_JSON_SCHEMA } from "../src/native-v4/schema.ts";
await writeFile(new URL("../schema/campaign-v4.schema.json", import.meta.url), JSON.stringify(CAMPAIGN_BUNDLE_V4_JSON_SCHEMA, null, 2) + "\n", "utf8");
