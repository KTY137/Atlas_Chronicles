import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { importiereEronKarte } from "@chronicle/forge";
import { createCampaignBundle, parseCampaignBundle, serializeCampaignBundle, campaignSemanticDiff } from "../src/campaign-bundle.ts";
import { campaignFixture, value } from "./campaign-fixture.ts";

function fixture() {
  const data = campaignFixture(), source = importiereEronKarte(readFileSync(new URL("../../../design/fixtures/eron/map-andaria.json", import.meta.url), "utf8"));
  data.tables.artifacts.push({ id: "eron-map-source", campaign_id: data.campaignId, kind: "eron-map", source_hash: source.quelle.sha256,
    source: value(source), report: value(source.bericht), created_by: "gm", created_at: "1788696000000" });
  data.tables.atlas_maps.push({ id: "eron-map", campaign_id: data.campaignId, artifact_id: "eron-map-source", title: source.titel,
    width: 8192, height: 8192, version: 1, created_at: "1788696000000" });
  data.tables.atlas_nodes.push(...source.knoten.map(node => ({ map_id: "eron-map", id: node.id, campaign_id: data.campaignId, data: value(node), entry_id: null })));
  return data;
}

describe("native archive with an ERON interactive map source", () => {
  it("round-trips every real marker, original source byte string and derived identity", () => {
    const bundle = createCampaignBundle(fixture()), reopened = parseCampaignBundle(serializeCampaignBundle(bundle));
    expect(campaignSemanticDiff(bundle, reopened)).toEqual([]);
    expect(reopened.tables.atlas_nodes).toHaveLength(191);
    expect(reopened.tables.artifacts[0]!.kind).toBe("eron-map");
  });
  it("rejects edited normalized markers despite an intact original source hash", () => {
    const data = fixture();
    const source = data.tables.artifacts[0]!.source as unknown as { orte: { x: number }[] };
    source.orte[0]!.x += 40;
    expect(() => createCampaignBundle(data)).toThrow("Fandom map differs");
  });
});
