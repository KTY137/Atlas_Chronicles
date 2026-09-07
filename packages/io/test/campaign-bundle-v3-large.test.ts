// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { textHash } from "@chronicle/core";
import { importUvtt } from "@chronicle/forge";
import { createCampaignBundleV3 } from "../src/campaign-bundle-v3.ts";
import { CAMPAIGN_BUNDLE_V3_LIMITS } from "../src/campaign-v3-limits.ts";
import { tacticalJson } from "../src/campaign-v3-json.ts";
import { campaignFixtureV3, tacticalAttribution } from "./campaign-v3-fixture.ts";
import { value } from "./campaign-fixture.ts";

describe("v3 actual source byte boundary", () => {
  it("validates a legitimate tactical document above RulePackage byte/node limits", () => {
    const data = campaignFixtureV3(0), stamps = Array.from({ length: 20_000 }, (_, i) => ({ id: `stamp-${i}`, a: "fixture/tree", x: i % 1024, y: 0, s: 1, r: 0, l: 0 }));
    for (const row of data.tables.tactical_map_revisions) {
      const document = row.document as { geometry: { stamps: unknown[] } }; document.geometry.stamps = stamps;
      row.content_hash = textHash(tacticalJson({ document, anchors: [{ targetKind: "region", targetId: "room", entryId: "entry", passageId: "passage" }] }));
    }
    const source = data.tables.tactical_sources[0]!, sourceText = JSON.stringify(data.tables.tactical_map_revisions[0]!.document);
    expect(Buffer.byteLength(sourceText)).toBeGreaterThan(1_048_576);
    Object.assign(source, { source_text: sourceText, source_hash: textHash(sourceText), source_bytes: String(Buffer.byteLength(sourceText)) });
    const session = data.tables.session_tactical_states[0]!;
    for (const key of ["initial_snapshot", "undo_base_snapshot"] as const) {
      (session[key] as { map: { contentHash: string } }).map.contentHash = String(data.tables.tactical_map_revisions[0]!.content_hash);
      session[key === "initial_snapshot" ? "initial_hash" : "undo_base_hash"] = textHash(tacticalJson(session[key]));
    }
    expect(createCampaignBundleV3(data).tables.tactical_map_revisions).toHaveLength(2);
  }, 30_000);
  it("accepts an exact 64 MiB UVTT source including outer JSON escaping, without a duplicate image", () => {
    const data = campaignFixtureV3(0), minimum = '{"format":0.3,"resolution":{"map_origin":{"x":0,"y":0},"map_size":{"x":1,"y":1},"pixels_per_grid":1}}';
    // Legal source whitespace deliberately doubles in the outer JSON string.
    const text = minimum + "\n".repeat(CAMPAIGN_BUNDLE_V3_LIMITS.sourceBytes - Buffer.byteLength(minimum)), imported = importUvtt(text, tacticalAttribution);
    data.tables.tactical_sources.push({ ...data.tables.tactical_sources[0]!, id: "maximum-uvtt", format: "uvtt", format_version: "0.3", source_text: text, source_hash: textHash(text), source_bytes: String(Buffer.byteLength(text)), fidelity: value(imported.fidelity), image_base64: null, image_meta: null });
    const bundle = createCampaignBundleV3(data);
    expect(bundle.tables.tactical_sources.find(row => row.id === "maximum-uvtt")!.source_text).toBe(text);
    expect(Buffer.byteLength(JSON.stringify(bundle), "utf8")).toBeLessThan(CAMPAIGN_BUNDLE_V3_LIMITS.bytes);
    expect(Buffer.byteLength(JSON.stringify(text), "utf8")).toBeGreaterThan(CAMPAIGN_BUNDLE_V3_LIMITS.sourceBytes);
    const over = { ...data.tables.tactical_sources.at(-1)!, source_text: text + "\n", source_hash: textHash(text + "\n"), source_bytes: String(CAMPAIGN_BUNDLE_V3_LIMITS.sourceBytes + 1) };
    data.tables.tactical_sources[data.tables.tactical_sources.length - 1] = over;
    expect(() => createCampaignBundleV3(data)).toThrow(/source_text|string|byte/);
  }, 60_000);
});
