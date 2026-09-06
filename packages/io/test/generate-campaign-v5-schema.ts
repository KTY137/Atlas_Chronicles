import { writeFile } from "node:fs/promises";
import { CAMPAIGN_BUNDLE_V5_JSON_SCHEMA } from "../src/native-v5/schema.ts";
await writeFile(new URL("../schema/campaign-v5.schema.json", import.meta.url), JSON.stringify(CAMPAIGN_BUNDLE_V5_JSON_SCHEMA, null, 2) + "\n");
