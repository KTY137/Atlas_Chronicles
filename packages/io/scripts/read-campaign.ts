// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFile } from "node:fs/promises";
import { parseCampaignBundle } from "../src/campaign-bundle.ts";

// Reference reader: validates the complete native file without a database or network.
const filename = process.argv[2];
if (!filename || process.argv.length !== 3) throw new Error("Usage: tsx packages/io/scripts/read-campaign.ts <campaign.chronicle>");
const bundle = parseCampaignBundle(await readFile(filename, "utf8"));
process.stdout.write(JSON.stringify({ format: bundle.format, version: bundle.version, campaignId: bundle.manifest.campaignId, contentHash: bundle.manifest.contentHash, modules: bundle.manifest.modules }, null, 2) + "\n");
