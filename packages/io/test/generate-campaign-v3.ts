// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Explicit developer helper. Regenerates only the two published v3 artifacts.
import { writeFile } from "node:fs/promises";
import { createCampaignBundleV3, serializeCampaignBundleV3 } from "../src/campaign-bundle-v3.ts";
import { CAMPAIGN_BUNDLE_V3_JSON_SCHEMA } from "../src/campaign-schema-v3.ts";
import { campaignFixtureV3 } from "./campaign-v3-fixture.ts";

await writeFile(new URL("../schema/campaign-v3.schema.json", import.meta.url), JSON.stringify(CAMPAIGN_BUNDLE_V3_JSON_SCHEMA, null, 2) + "\n", "utf8");
await writeFile(new URL("./fixtures/campaign-v3.chronicle", import.meta.url), serializeCampaignBundleV3(createCampaignBundleV3(campaignFixtureV3())) + "\n", "utf8");
