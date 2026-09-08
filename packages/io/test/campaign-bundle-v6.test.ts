// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import type { CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV3 } from "../src/campaign-bundle-v3.ts";
import { upgradeCampaignBundleV3, validateCampaignBundleV4 } from "../src/native-v4/bundle.ts";
import { validateCampaignBundleV5 } from "../src/native-v5/bundle.ts";
import { createCampaignBundleV6, parseCampaignBundleV6, serializeCampaignBundleV6, validateCampaignBundleV6 } from "../src/native-v6/bundle.ts";
import { emptyCampaignTablesV6, type CampaignTableNameV6 } from "../src/native-v6/schema.ts";
import { createCurrentCampaignBundle, currentCampaignSemanticDiff, parseCurrentCampaignBundle } from "../src/native-v6/current.ts";
import { campaignFixtureV3 } from "./campaign-v3-fixture.ts";
import { campaignFixtureV5 } from "./campaign-v5-fixture.ts";

type MutableRow = Record<string, CanonicalValue>;
function fixture() {
  const legacy = upgradeCampaignBundleV3(createCampaignBundleV3(campaignFixtureV3(0))).bundle;
  const tables = JSON.parse(JSON.stringify({ ...emptyCampaignTablesV6(), ...legacy.tables })) as Record<CampaignTableNameV6, MutableRow[]>;
  for (const child of ["child", "grandchild"]) {
    tables.tactical_maps.push({ ...tables.tactical_maps[0]!, id: child });
    tables.tactical_map_revisions.push(...tables.tactical_map_revisions.filter(row => row.map_id === "map").map(row => ({ ...row, map_id: child })));
    tables.tactical_map_anchors.push(...tables.tactical_map_anchors.filter(row => row.map_id === "map").map(row => ({ ...row, map_id: child })));
  }
  tables.tactical_map_nodes.push({ map_id: "map", knoten_id: "room", campaign_id: "campaign", data: {
    id: "room", art: "raum", titel: "A retained room", eltern: [], rahmen: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" }, anker: null, herkunft: null, sichtAnker: null,
  } });
  tables.betreten_karten = [
    { campaign_id: "campaign", parent_kind: "tactical", parent_map_id: "map", knoten_id: "room", map_id: "child", keim_hash: "a".repeat(64), created_by: "gm", created_at: "1788696000000" },
    { campaign_id: "campaign", parent_kind: "tactical", parent_map_id: "child", knoten_id: "room", map_id: "grandchild", keim_hash: null, created_by: "gm", created_at: "1788696000000" },
  ];
  tables.betreten_command_receipts = tables.betreten_karten.map((row, i) => ({ command_id: `enter-${i}`, campaign_id: "campaign", actor_user_id: "gm", request_hash: "b".repeat(64), response: { mapId: row.map_id!, erzeugt: i === 0, keimHash: row.keim_hash! }, created_at: row.created_at! }));
  return { campaignId: "campaign", universeId: "universe", exportedAt: legacy.manifest.exportedAt, tables };
}

describe("native v6 durable nested map addresses", () => {
  it("roundtrips optional building metadata without changing the persistent address or legacy nodes", () => {
    const data = fixture();
    const node = data.tables.tactical_map_nodes[0]!.data as MutableRow;
    node.art = "bauwerk"; node.titel = "Kirche der Morgenröte";
    node.bauwerk = { typ: "kirche", beschreibung: "Steinerne Kirche am Marktplatz." };
    const reopened = parseCampaignBundleV6(serializeCampaignBundleV6(createCampaignBundleV6(data)));
    expect(reopened.tables.tactical_map_nodes).toEqual(data.tables.tactical_map_nodes);
    delete node.bauwerk;
    expect(() => createCampaignBundleV6(data)).not.toThrow();
  });

  it.each([
    null, { typ: "burg", beschreibung: "" }, { typ: "haus" }, { typ: "haus", beschreibung: 42 },
    { typ: "haus", beschreibung: "x".repeat(2001) }, { typ: "haus", beschreibung: "", titel: "duplicate" },
  ])("rejects malformed building metadata %j", metadata => {
    const data = fixture(), node = data.tables.tactical_map_nodes[0]!.data as MutableRow;
    node.art = "bauwerk"; node.bauwerk = metadata as CanonicalValue;
    expect(() => createCampaignBundleV6(data)).toThrow();
  });

  it("rejects building metadata on a room node", () => {
    const data = fixture(), node = data.tables.tactical_map_nodes[0]!.data as MutableRow;
    node.bauwerk = { typ: "haus", beschreibung: "" };
    expect(() => createCampaignBundleV6(data)).toThrow(/building node/);
  });

  it("roundtrips metadata edit receipts alongside entrance receipts", () => {
    const data = fixture();
    const node = data.tables.tactical_map_nodes[0]!.data as MutableRow;
    node.art = "bauwerk"; node.titel = "Kirche am Markt";
    node.bauwerk = { typ: "kirche", beschreibung: "x".repeat(2000) };
    data.tables.betreten_command_receipts.push({
      ...data.tables.betreten_command_receipts[0]!, command_id: "metadata-edit",
      response: { operation: "knoten.metadata", parentMapId: "map", knotenId: "room", version: 2 },
    });
    const reopened = parseCampaignBundleV6(serializeCampaignBundleV6(createCampaignBundleV6(data)));
    expect(reopened.tables.betreten_command_receipts).toEqual(data.tables.betreten_command_receipts);
    expect(reopened.tables.tactical_map_nodes).toEqual(data.tables.tactical_map_nodes);
    expect(reopened.tables.betreten_karten).toHaveLength(data.tables.betreten_karten.length);
    expect(reopened.tables.betreten_karten).toEqual(expect.arrayContaining(data.tables.betreten_karten));
  });

  it.each([
    { parentMapId: "missing", knotenId: "room", version: 2 },
    { parentMapId: "map", knotenId: "missing", version: 2 },
    { parentMapId: "child", knotenId: "room", version: 2 },
    { parentMapId: "map", knotenId: "room", version: 3 },
    { parentMapId: "map", knotenId: "room", version: 0 },
    { parentMapId: "map", knotenId: "room", version: 1.5 },
    { parentMapId: "map", knotenId: "room", version: "2" },
    { parentMapId: "map", knotenId: "room", version: 2, mapId: "child" },
  ])("rejects metadata receipt with invalid address or version %j", response => {
    const data = fixture();
    data.tables.betreten_command_receipts[0]!.response = { operation: "knoten.metadata", ...response } as CanonicalValue;
    expect(() => createCampaignBundleV6(data)).toThrow();
  });

  it("roundtrips scoped repeated room ids, generated/manual links, node metadata and replay receipts", () => {
    const data = fixture(), bundle = createCampaignBundleV6(data), encoded = serializeCampaignBundleV6(bundle);
    const reopened = parseCampaignBundleV6(encoded);
    expect(reopened.tables.betreten_karten).toEqual(bundle.tables.betreten_karten);
    expect(reopened.tables.tactical_map_nodes).toEqual(data.tables.tactical_map_nodes);
    expect(reopened.tables.betreten_command_receipts).toEqual(data.tables.betreten_command_receipts);
    expect(currentCampaignSemanticDiff(bundle, reopened)).toEqual([]);
    expect(parseCurrentCampaignBundle(encoded).version).toBe(6);
    expect(createCurrentCampaignBundle(data).version).toBe(6);
  });

  it("keeps v4/v5 envelopes when nested tables are empty and leaves their strict readers intact", () => {
    const legacy = upgradeCampaignBundleV3(createCampaignBundleV3(campaignFixtureV3(0))).bundle;
    const data = { campaignId: "campaign", universeId: "universe", exportedAt: legacy.manifest.exportedAt, tables: { ...emptyCampaignTablesV6(), ...legacy.tables } };
    expect(createCurrentCampaignBundle(data)).toEqual(legacy);
    expect(currentCampaignSemanticDiff(legacy, createCampaignBundleV6(data))).toEqual([]);
    expect(createCurrentCampaignBundle({ ...campaignFixtureV5(false), tables: { ...emptyCampaignTablesV6(), ...campaignFixtureV5(false).tables } }).version).toBe(5);
    const nested = createCampaignBundleV6(fixture());
    expect(() => validateCampaignBundleV4(nested)).toThrow(); expect(() => validateCampaignBundleV5(nested)).toThrow();
  });

  it.each([
    ["cross-campaign edge", (t: ReturnType<typeof fixture>["tables"]) => { t.betreten_karten[0]!.campaign_id = "foreign"; }],
    ["dangling child", (t: ReturnType<typeof fixture>["tables"]) => { t.betreten_karten[0]!.map_id = "missing"; }],
    ["dangling parent region", (t: ReturnType<typeof fixture>["tables"]) => { t.betreten_karten[0]!.knoten_id = "missing"; }],
    ["dangling atlas parent", (t: ReturnType<typeof fixture>["tables"]) => { t.betreten_karten[0]!.parent_kind = "atlas"; }],
    ["cyclic hierarchy", (t: ReturnType<typeof fixture>["tables"]) => { t.betreten_karten[0]!.parent_map_id = "grandchild"; }],
    ["duplicate child", (t: ReturnType<typeof fixture>["tables"]) => { t.betreten_karten[1]!.map_id = "child"; }],
    ["node identity mismatch", (t: ReturnType<typeof fixture>["tables"]) => { t.tactical_map_nodes[0]!.knoten_id = "different"; }],
    ["node map missing", (t: ReturnType<typeof fixture>["tables"]) => { t.tactical_map_nodes[0]!.map_id = "different"; }],
    ["receipt target missing", (t: ReturnType<typeof fixture>["tables"]) => { (t.betreten_command_receipts[0]!.response as MutableRow).mapId = "map"; }],
    ["receipt evidence mismatch", (t: ReturnType<typeof fixture>["tables"]) => { (t.betreten_command_receipts[0]!.response as MutableRow).keimHash = null; }],
    ["receipt actor missing", (t: ReturnType<typeof fixture>["tables"]) => { t.betreten_command_receipts[0]!.actor_user_id = "missing"; }],
  ] as const)("rejects %s before restoration", (_name, mutate) => {
    const data = fixture(); mutate(data.tables); expect(() => createCampaignBundleV6(data)).toThrow();
  });

  it("detects altered evidence checksums and cannot silently omit a nested table", () => {
    const bundle = JSON.parse(serializeCampaignBundleV6(createCampaignBundleV6(fixture())));
    bundle.tables.betreten_command_receipts[0].request_hash = "c".repeat(64);
    expect(() => validateCampaignBundleV6(bundle)).toThrow(/checksum/);
    const data = fixture(); delete (data.tables as Partial<typeof data.tables>).betreten_command_receipts;
    expect(() => createCurrentCampaignBundle(data)).toThrow(/required/);
  });
});
