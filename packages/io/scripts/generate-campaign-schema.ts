import { mkdir, writeFile } from "node:fs/promises";
import { CAMPAIGN_BUNDLE_JSON_SCHEMA } from "../src/campaign-schema.ts";
import { createCampaignBundle, serializeCampaignBundle } from "../src/campaign-bundle.ts";
import { campaignEvidenceFixture } from "../test/campaign-fixture.ts";

// Maintainer command: regenerate the published structural schema and deterministic fixture.
await mkdir(new URL("../schema/", import.meta.url), { recursive: true });
await mkdir(new URL("../test/fixtures/", import.meta.url), { recursive: true });
await writeFile(new URL("../schema/campaign-v1.schema.json", import.meta.url), JSON.stringify(CAMPAIGN_BUNDLE_JSON_SCHEMA, null, 2) + "\n", "utf8");
await writeFile(new URL("../test/fixtures/campaign-v1.chronicle", import.meta.url), serializeCampaignBundle(createCampaignBundle(campaignEvidenceFixture())) + "\n", "utf8");
