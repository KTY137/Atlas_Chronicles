// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import sharp from "sharp";
import type { Knoten, TacticalMapDocumentV1 } from "@chronicle/szene";
import { currentCampaignSemanticDiff, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "@chronicle/io";
import { bauwerkAusdehnung, SIEDLUNG_ERZEUGER, SIEDLUNG_VIERTEL_VERSION } from "@chronicle/forge";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { createTacticalRasterService } from "../src/domain/tactical-raster.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";

/** The engine already has geometric unit coverage. This suite proves the missing product
 * boundary: a village is previewable, persisted once, walkable through its actual buildings,
 * and retained in the existing native export format with no alternate data store. */
describe("settlements through the existing tactical and entrance contracts", () => {
  let db: Db, app: FastifyInstance, gm: string, player: string, campaign: string, cookie: string, playerCookie: string;
  const config = {
    origin: "https://settlement.test",
    cookieSecret: "settlement-test-cookie-secret-more-than-32-characters",
    bootstrapToken: "settlement-test-bootstrap-secret-more-than-32-characters",
  };
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config), campaigns = createCampaigns(db);
    gm = (await identity.bootstrap("Kaya")).userId;
    campaign = (await campaigns.createCampaign(gm, { name: "Settlement integration" })).id;
    const invite = await campaigns.issueInvitation(gm, campaign);
    const join = await campaigns.requestJoin(invite.code, { displayName: "Player" });
    player = (await campaigns.approveJoin(gm, campaign, join.id)).userId;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    playerCookie = `chronicle_session=${(await identity.issueSession(player)).value}`;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  const post = (path: string, payload: object, session = cookie, campaignId = campaign) => app.inject({
    method: "POST", url: `/api/campaigns/${campaignId}${path}`,
    headers: { cookie: session, origin: config.origin }, payload,
  });
  const body = (over: Record<string, unknown> = {}) => ({
    commandId: randomUUID(), name: "Bachfurt", keim: "settlement-integration-1", art: "siedlung", ...over,
  });
  const generate = async (over: Record<string, unknown> = {}, campaignId = campaign) => {
    const response = await post("/tactical/generate", body(over), cookie, campaignId);
    expect(response.statusCode, response.body).toBe(200);
    return response.json() as { ack: { subjectId: string; version: number }; keimHash: string };
  };
  const nodes = async (mapId: string, campaignId = campaign) => (await db.query<{ data: Knoten }>(
    "SELECT data FROM tactical_map_nodes WHERE campaign_id=$1 AND map_id=$2", [campaignId, mapId],
  )).rows.map(row => row.data);

  it("exposes a complete default vector for hamlet, village and town", async () => {
    const response = await app.inject({ url: `/api/campaigns/${campaign}/tactical/generate/defaults`, headers: { cookie } });
    expect(response.statusCode).toBe(200);
    const values = response.json().siedlungsarten;
    expect(values).toBeDefined();
    for (const art of ["weiler", "dorf", "stadt"] as const) {
      expect(values[art]).toMatchObject({ art, ausdehnung: expect.any(Array), bauwerke: expect.any(Number), licht: expect.any(Boolean) });
      expect(values[art].ausdehnung).toHaveLength(2);
      expect(values[art].grundstueck).toHaveLength(2);
      expect(values[art].zellgroesse).toBeGreaterThan(0);
      expect(values[art].setting).toBe("fantasy");
    }
    expect(values.weiler.bauwerke).toBeLessThan(values.dorf.bauwerke);
    expect(values.dorf.bauwerke).toBeLessThan(values.stadt.bauwerke);
  });

  it.each(["weiler", "dorf", "stadt"])("previews a real %s with buildings and roads without saving", async art => {
    const before = await createTactical(db).listMaps(gm, campaign);
    const request = body({ optionen: { art } });
    const response = await post("/tactical/generate/preview", request);
    expect(response.statusCode, response.body).toBe(200);
    const preview = response.json();
    expect(preview.art).toBe("siedlung");
    expect(preview.bauwerke).toBeGreaterThan(0);
    expect(preview.strassen).toBeGreaterThan(0);
    expect(preview.raeume).toBeUndefined();
    expect(preview.bericht.bauwerke).toBe(preview.bauwerke);
    expect(preview.bericht.strassen).toBe(preview.strassen);
    expect(preview.knoten).toBe(preview.bauwerke + 1);
    expect(preview.document.kind).toBe("tactical-map");
    expect(preview.document.geometry.regions).toHaveLength(preview.cartography.regions.length);
    expect(preview.cartography.regions.filter((region: { role: string }) => region.role === "building")).toHaveLength(preview.bauwerke);
    expect(preview.cartography.regions.filter((region: { role: string }) => region.role === "road")).toHaveLength(preview.strassen);
    expect(preview.cartography.regions.some((region: { role: string }) => region.role === "terrain")).toBe(true);
    expect(preview.document.geometry.stamps.length).toBeGreaterThan(0);
    expect(preview.document.geometry.size).toEqual(preview.groesse);
    expect(preview.document.background).toBeNull();
    expect(preview.keimHash).toMatch(/^[a-f0-9]{64}$/);
    expect((await post("/tactical/generate/preview", { ...request, commandId: randomUUID() })).json().keimHash).toBe(preview.keimHash);
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before.length);
    if (art === "stadt") expect(preview.document.walls.length).toBeGreaterThan(0);
  });

  it("saves the preview geometry, retained building addresses and true generator provenance", async () => {
    const request = body({ optionen: { art: "dorf", ausdehnung: [30, 24], bauwerke: 16, zellgroesse: 64, strassenDichte: 0.4, grundstueck: [3, 6], licht: false } });
    const previewResponse = await post("/tactical/generate/preview", request);
    expect(previewResponse.statusCode, previewResponse.body).toBe(200);
    const preview = previewResponse.json(), before = await createTactical(db).listMaps(gm, campaign);
    const saved = await post("/tactical/generate", request);
    expect(saved.statusCode, saved.body).toBe(200);
    const result = saved.json(), tactical = createTactical(db);
    const map = await tactical.getMap(gm, campaign, result.ack.subjectId);
    expect(result.keimHash).toBe(preview.keimHash);
    expect(map.document).toEqual(preview.document);
    expect(map.document.geometry.size).toEqual([1920, 1536]);
    expect(map.document.lights).toHaveLength(0);
    const retained = await nodes(map.id), buildings = retained.filter(node => node.art === "bauwerk");
    expect(buildings).toHaveLength(preview.bauwerke);
    expect(retained.filter(node => node.art === "ort")).toHaveLength(1);
    expect(buildings.every(node => node.herkunft?.kindKeim && map.document.geometry.regions.some(region => region.id === node.id))).toBe(true);
    const source = await tactical.getSource(gm, campaign, map.id);
    expect(source.format).toBe("native");
    expect(source.provenance).toMatchObject({ creator: SIEDLUNG_ERZEUGER, generator: SIEDLUNG_ERZEUGER, generatorVersion: SIEDLUNG_VIERTEL_VERSION, license: expect.any(String) });
    expect((await post("/tactical/generate", request)).json()).toEqual(result);
    expect(await tactical.listMaps(gm, campaign)).toHaveLength(before.length + 1);
  });

  it("offers actual buildings as entrances and never gives a road an invented interior", async () => {
    const generated = await generate({ optionen: { art: "weiler" } }), mapId = generated.ack.subjectId;
    const tactical = createTactical(db), retained = await nodes(mapId), buildings = retained.filter(node => node.art === "bauwerk");
    const map = await tactical.getMap(gm, campaign, mapId), scope = { parentKind: "tactical" as const, parentMapId: mapId };
    const children = await createBetreten(db, config).children(gm, campaign, scope);
    expect(children.nodes.map(node => node.knotenId).sort()).toEqual(buildings.map(node => node.id).sort());
    expect(children.nodes.every(node => node.canEnter && node.art === "bauwerk" && node.bauwerk && node.titel.trim())).toBe(true);
    const road = map.document.geometry.regions.find(region => !retained.some(node => node.id === region.id))!;
    expect(road).toBeDefined();
    const refused = await post("/betreten", { commandId: randomUUID(), ...scope, knotenId: road.id, expectedVersion: children.version });
    expect(refused.statusCode).toBe(404);
    const building = buildings[0]!, entrance = await createBetreten(db, config).betretbar(gm, campaign, building.id, scope);
    expect(entrance.kindKeim).toBe(building.herkunft!.kindKeim);
    // The interior is sized by the building's outline on the town map (`bauwerkAusdehnung`).
    const outline = map.document.geometry.regions.find(region => region.id === building.id)!.punkte, cell = map.cartography!.construction.cellSize;
    const umfang: readonly [number, number] = [(Math.max(...outline.map(p => p[0])) - Math.min(...outline.map(p => p[0]))) / cell, (Math.max(...outline.map(p => p[1])) - Math.min(...outline.map(p => p[1]))) / cell];
    const expected = await post("/tactical/generate/preview", body({ art: "grundriss", keim: entrance.kindKeim,
      optionen: { setting: entrance.setting, profil: building.bauwerk!.typ, zellen: bauwerkAusdehnung(building.bauwerk!.typ, umfang) } }));
    expect(expected.statusCode, expected.body).toBe(200);
    const opened = await post("/betreten", { commandId: randomUUID(), ...scope, knotenId: building.id, expectedVersion: children.version });
    expect(opened.statusCode, opened.body).toBe(200);
    expect(opened.json().keimHash).toBe(expected.json().keimHash);
    expect((await tactical.getSource(gm, campaign, opened.json().mapId)).provenance.generator).toBe("chronicle-grundriss");
  });

  it("saves a default city larger than the raster image budget and serves bounded painted tiles", async () => {
    // The city defaults are 5376 x 4224 pixels (22.7M). The old 16M image-decoder admission
    // applied to geometry too: preview succeeded, then saving the exact preview failed.
    const generated = await generate({ name: "Large default city", optionen: { art: "stadt" } });
    const map = await createTactical(db).getMap(gm, campaign, generated.ack.subjectId);
    expect(map.document.geometry.size[0] * map.document.geometry.size[1]).toBeGreaterThan(16_000_000);
    expect(map.document.background).toBeNull();
    const response = await app.inject({ url: `/api/campaigns/${campaign}/tactical/maps/${map.id}/tiles/0/0/0`, headers: { cookie } });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.headers["content-type"]).toContain("image/png");
    const decoded = await sharp(response.rawPayload).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(decoded.info.width).toBe(256);
    expect(decoded.info.height).toBe(256);
    expect(decoded.data.some((value, index) => index % 4 === 3 && value > 0)).toBe(true);
    expect((await app.inject({ url: `/api/campaigns/${campaign}/tactical/maps/${map.id}/tiles/0/0/0`, headers: { cookie: playerCookie } })).statusCode).toBe(404);
  });

  it("keeps the image-decoder and tile-size limits when large geometry becomes admissible", async () => {
    const service = createTacticalRasterService();
    const image = await sharp({ create: { width: 1, height: 1, channels: 4, background: "#ffffff" } }).png().toBuffer();
    const request = { image, documentSize: [5376, 4224] as const, regions: null, level: 0, x: 0, y: 0 };
    await expect(service.renderTacticalTile(request)).rejects.toMatchObject({ code: "invalid", message: "server raster pixel limit is 16,000,000" });
    await expect(service.renderTacticalTile({ ...request, image: null, tileSize: 1025 })).rejects.toMatchObject({ code: "invalid" });
    await expect(service.renderTacticalTile({ ...request, image: null, documentSize: [12001, 12000] })).rejects.toMatchObject({ code: "invalid" });
  });

  it("walks from an atlas settlement through a generated building and retains the full return path", async () => {
    // The Azgaar importer has separate source coverage. Seed its durable node shape here so
    // this assertion isolates the public traversal of atlas -> settlement -> building.
    const knotenId = randomUUID(), artifactId = randomUUID(), parentMapId = randomUUID();
    await db.query("INSERT INTO artifacts(id,campaign_id,kind,source_hash,source,report,created_by,created_at) VALUES($1,$2,'test',$3,'{\"orte\":[],\"zellen\":[],\"bericht\":{},\"quelle\":{\"format\":\"test\"}}','{}',$4,$5)",
      [artifactId, campaign, randomUUID(), gm, Date.now()]);
    await db.query("INSERT INTO atlas_maps(id,campaign_id,artifact_id,title,width,height,created_at) VALUES($1,$2,$3,'Atlas route',10,10,$4)",
      [parentMapId, campaign, artifactId, Date.now()]);
    const node: Knoten = { id: knotenId as Knoten["id"], art: "ort", titel: "Atlas village", eltern: [],
      rahmen: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" }, anker: null, sichtAnker: null,
      herkunft: { erzeuger: "test", version: "1", keimHash: "0".repeat(64), erzeugungspfad: ["ort", knotenId], kindKeim: "atlas-settlement-child" } };
    await db.query("INSERT INTO atlas_nodes(map_id,id,campaign_id,data) VALUES($1,$2,$3,$4)", [parentMapId, knotenId, campaign, JSON.stringify(node)]);
    const response = await post("/betreten", { commandId: randomUUID(), parentKind: "atlas", parentMapId,
      knotenId, expectedVersion: 1, art: "siedlung", optionen: { art: "dorf" } });
    expect(response.statusCode, response.body).toBe(200);
    const villageId = response.json().mapId, entrance = createBetreten(db, config);
    const village = await entrance.children(gm, campaign, { parentKind: "tactical", parentMapId: villageId });
    expect(village.nodes.length).toBeGreaterThan(0);
    const interior = await entrance.betrete(gm, campaign, { commandId: randomUUID(), parentKind: "tactical", parentMapId: villageId,
      knotenId: village.nodes[0]!.knotenId, expectedVersion: village.version });
    const inside = await entrance.children(gm, campaign, { parentKind: "tactical", parentMapId: interior.mapId });
    expect(inside.ancestors.map(item => [item.kind, item.id])).toEqual([["atlas", parentMapId], ["tactical", villageId], ["tactical", interior.mapId]]);
  });

  it.each(["weiler", "dorf", "stadt"])("creates a nested %s from the retained parent seed and reopens it without rerolling", async siedlungsart => {
    // Three generations plus a reopen; the stadt alone takes several seconds, so this case carries its own budget.
    const root = await generate({ art: "grundriss", name: `Parent ${siedlungsart}`, keim: `nested-${siedlungsart}` });
    const rootMap = await createTactical(db).getMap(gm, campaign, root.ack.subjectId);
    const scope = { parentKind: "tactical" as const, parentMapId: rootMap.id };
    const knotenId = rootMap.document.geometry.regions[0]!.id;
    const address = await createBetreten(db, config).betretbar(gm, campaign, knotenId, scope);
    const request = { commandId: randomUUID(), ...scope, knotenId, expectedVersion: address.version, art: "siedlung", optionen: { art: siedlungsart }, name: `Nested ${siedlungsart}` };
    const response = await post("/betreten", request);
    expect(response.statusCode, response.body).toBe(200);
    const opened = response.json(), source = await createTactical(db).getSource(gm, campaign, opened.mapId);
    expect(source.provenance.generator).toBe(SIEDLUNG_ERZEUGER);
    const preview = await post("/tactical/generate/preview", body({ keim: address.kindKeim, optionen: { art: siedlungsart } }));
    expect(preview.statusCode, preview.body).toBe(200);
    expect(opened.keimHash).toBe(preview.json().keimHash);
    const children = await createBetreten(db, config).children(gm, campaign, { parentKind: "tactical", parentMapId: opened.mapId });
    expect(children.ancestors.map(row => row.id)).toEqual([rootMap.id, opened.mapId]);
    expect(children.nodes).toHaveLength(preview.json().bauwerke);
    const reopened = await post("/betreten", { ...request, commandId: randomUUID(), optionen: { art: siedlungsart === "stadt" ? "weiler" : "stadt" } });
    expect(reopened.statusCode, reopened.body).toBe(200);
    expect(reopened.json()).toEqual({ ...opened, erzeugt: false });
    expect((await post("/betreten", request)).json()).toEqual(opened);
  }, 30_000);

  it("rejects foreign option vectors, misspelled kinds, numeric strings and malformed bounds", async () => {
    const invalid = [
      { optionen: { art: "metropole" } }, { optionen: { raeume: 5 } }, { optionen: { kammern: 5 } },
      { optionen: { zellen: [24, 24] } }, { optionen: { ausdehnung: [24] } },
      { optionen: { ausdehnung: [24, "24"] } }, { optionen: { grundstueck: [8, 3] } },
      { optionen: { bauwerke: "5" } }, { optionen: { bauwerke: 0 } }, { optionen: { bauwerke: 257 } },
      { optionen: { strassenDichte: 2 } }, { optionen: { licht: "false" } },
      { art: "grundriss", optionen: { bauwerke: 5 } }, { art: "hoehle", optionen: { ausdehnung: [24, 24] } },
    ];
    const before = await createTactical(db).listMaps(gm, campaign);
    for (const over of invalid) {
      const response = await post("/tactical/generate", body(over));
      expect(response.statusCode, JSON.stringify(over)).toBe(400);
    }
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before.length);
  });

  it("refuses generation and private child traversal to a player without creating a map", async () => {
    const generated = await generate({ optionen: { art: "weiler" } }), mapId = generated.ack.subjectId;
    const firstBuilding = (await nodes(mapId)).find(node => node.art === "bauwerk")!;
    const before = await createTactical(db).listMaps(gm, campaign);
    for (const path of ["/tactical/generate/preview", "/tactical/generate"]) {
      expect((await post(path, body(), playerCookie)).statusCode).toBe(404);
    }
    expect((await post("/betreten", { commandId: randomUUID(), parentKind: "tactical", parentMapId: mapId,
      knotenId: firstBuilding.id, expectedVersion: 1, art: "siedlung", optionen: { art: "dorf" } }, playerCookie)).statusCode).toBe(404);
    const response = await app.inject({ url: `/api/campaigns/${campaign}/maps/tactical/${mapId}/children`, headers: { cookie: playerCookie } });
    expect(response.statusCode).toBe(404);
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before.length);
  });

  it("rejects nested settlement options when they cannot take effect", async () => {
    const root = await generate({ art: "grundriss", name: "Rejected child kinds" });
    const map = await createTactical(db).getMap(gm, campaign, root.ack.subjectId);
    const base = { commandId: randomUUID(), parentKind: "tactical", parentMapId: map.id,
      knotenId: map.document.geometry.regions[0]!.id, expectedVersion: 1 };
    for (const over of [
      { optionen: { art: "dorf" } }, { art: "grundriss", optionen: { art: "dorf" } },
      { art: "siedlung", optionen: { art: "metropole" } }, { art: "siedlung", optionen: { raeume: 7 } },
      { targetMapId: map.id, optionen: { art: "dorf" } }, { targetMapId: map.id, art: "siedlung" },
    ]) expect((await post("/betreten", { ...base, ...over })).statusCode, JSON.stringify(over)).toBe(400);
  });

  it("restores settlement geometry, building seeds and child addresses through the frozen native contract", async () => {
    const campaignId = (await createCampaigns(db).createCampaign(gm, { name: "Settlement export" })).id;
    const generated = await generate({ name: "Export village", optionen: { art: "weiler" } }, campaignId);
    const mapId = generated.ack.subjectId, building = (await nodes(mapId, campaignId)).find(node => node.art === "bauwerk")!;
    const request = { commandId: randomUUID(), parentKind: "tactical" as const, parentMapId: mapId,
      knotenId: building.id, expectedVersion: 1, name: "The building interior" };
    const opened = await createBetreten(db, config).betrete(gm, campaignId, request);
    const fixed = { ...config, now: () => Date.parse("2026-09-08T12:00:00Z") };
    const bundle = await exportCampaignBundle(db, gm, campaignId, fixed), target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target);
      const parsed = parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle));
      await restoreCampaignBundle(target, parsed);
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, campaignId, fixed))).toEqual([]);
      const original = await createTactical(db).getMap(gm, campaignId, mapId);
      const restored = await createTactical(target).getMap(gm, campaignId, mapId);
      expect(restored.document).toEqual(original.document as TacticalMapDocumentV1);
      expect((await createTactical(target).getSource(gm, campaignId, mapId)).provenance.generator).toBe(SIEDLUNG_ERZEUGER);
      const entrances = createBetreten(target, config);
      expect(await entrances.betrete(gm, campaignId, request)).toEqual(opened);
      const children = await entrances.children(gm, campaignId, { parentKind: "tactical", parentMapId: mapId });
      expect(children.nodes.find(node => node.knotenId === building.id)?.vorhandeneKarteId).toBe(opened.mapId);
      expect((await entrances.betretbar(gm, campaignId, building.id, { parentKind: "tactical", parentMapId: mapId })).kindKeim).toBe(building.herkunft!.kindKeim);
      const inside = await entrances.children(gm, campaignId, { parentKind: "tactical", parentMapId: opened.mapId });
      expect(inside.ancestors.map(row => row.id)).toEqual([mapId, opened.mapId]);
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, campaignId, fixed))).toEqual([]);
    } finally { await target.close(); }
  }, 30_000);
});
