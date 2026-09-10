// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Knoten } from "@chronicle/szene";
import { REGION_ERZEUGER, REGION_VERSION } from "@chronicle/forge";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { createBetreten } from "../src/domain/betreten.ts";

/** The region is the scale above the settlement: the same generation door, the same entrance
 * contract — and a place on the land map opens the town the map stored for it. */
describe("regions through the existing generation and entrance contracts", () => {
  let db: Db, app: FastifyInstance, gm: string, campaign: string, cookie: string;
  const config = { origin: "https://region.test", cookieSecret: "region-test-cookie-secret-more-than-32-characters", bootstrapToken: "region-test-bootstrap-secret-more-than-32-characters" };
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config), campaigns = createCampaigns(db);
    gm = (await identity.bootstrap("Kaya")).userId;
    campaign = (await campaigns.createCampaign(gm, { name: "Region integration" })).id;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  const post = (path: string, payload: object) => app.inject({ method: "POST", url: `/api/campaigns/${campaign}${path}`, headers: { cookie, origin: config.origin }, payload });
  const nodes = async (mapId: string) => (await db.query<{ data: Knoten }>("SELECT data FROM tactical_map_nodes WHERE campaign_id=$1 AND map_id=$2", [campaign, mapId])).rows.map(row => row.data);

  it("previews and stores a region with its places, and a place opens the town its size and surroundings ask for", async () => {
    const defaults = await app.inject({ url: `/api/campaigns/${campaign}/tactical/generate/defaults`, headers: { cookie } });
    expect(defaults.json().region).toMatchObject({ ausdehnung: [56, 42], zellgroesse: 112, orte: 7 });
    const request = { commandId: randomUUID(), name: "Das Silbertal", keim: "region-integration-1", art: "region", stil: "gemalt", optionen: { standort: "fluss", orte: 5, ausdehnung: [40, 30] } };
    const preview = await post("/tactical/generate/preview", request);
    expect(preview.statusCode, preview.body).toBe(200);
    expect(preview.json()).toMatchObject({ art: "region", orte: 5, groesse: [4480, 3360] });
    expect(preview.json().nodes.every((node: { art: string }) => node.art === "ort")).toBe(true);
    const generated = await post("/tactical/generate", request);
    expect(generated.statusCode, generated.body).toBe(200);
    const mapId = generated.json().ack.subjectId as string, tactical = createTactical(db);
    expect((await tactical.getSource(gm, campaign, mapId)).provenance).toMatchObject({ generator: REGION_ERZEUGER, generatorVersion: REGION_VERSION });
    const retained = await nodes(mapId), orte = retained.filter(node => node.art === "ort");
    expect(orte).toHaveLength(5); expect(retained.filter(node => node.art === "region")).toHaveLength(1);
    const map = await tactical.getMap(gm, campaign, mapId), scope = { parentKind: "tactical" as const, parentMapId: mapId };
    expect(map.cartography!.regions.filter(role => role.role === "ort")).toHaveLength(5);
    expect(map.cartography!.labels).toBeUndefined();
    // The entrances are the places, each announcing the town it opens.
    const entrance = createBetreten(db, config), children = await entrance.children(gm, campaign, scope);
    expect(children.art).toBe("region");
    expect(children.nodes.map(node => node.knotenId).sort()).toEqual(orte.map(node => node.id).sort());
    for (const node of children.nodes) expect(node).toMatchObject({ art: "ort", canEnter: true, erzeugungsArt: "siedlung", siedlung: { art: expect.stringMatching(/^(weiler|dorf|stadt)$/), standort: expect.any(String) } });
    const town = children.nodes.find(node => node.siedlung?.art === "stadt") ?? children.nodes[0]!;
    const stored = map.cartography!.regions.find(role => role.regionId === town.knotenId);
    expect(stored).toMatchObject({ role: "ort", groesse: town.siedlung!.art, standort: town.siedlung!.standort });
    const gate = await entrance.betretbar(gm, campaign, town.knotenId, scope);
    expect(gate).toMatchObject({ art: "ort", erzeugungsArt: "siedlung", siedlung: town.siedlung, kindKeim: orte.find(node => node.id === town.knotenId)!.herkunft!.kindKeim });
    // Entering without any options generates exactly the town the region stored: size, surroundings, setting.
    const expected = await post("/tactical/generate/preview", { commandId: randomUUID(), name: town.titel, keim: gate.kindKeim, art: "siedlung", stil: "gemalt", optionen: { art: town.siedlung!.art, standort: town.siedlung!.standort, setting: "fantasy" } });
    expect(expected.statusCode, expected.body).toBe(200);
    const opened = await post("/betreten", { commandId: randomUUID(), ...scope, knotenId: town.knotenId, expectedVersion: children.version });
    expect(opened.statusCode, opened.body).toBe(200);
    expect(opened.json().keimHash).toBe(expected.json().keimHash);
    const child = await tactical.getSource(gm, campaign, opened.json().mapId);
    expect(child.provenance.generator).toBe("chronicle-siedlung");
    const childMap = await tactical.getMap(gm, campaign, opened.json().mapId);
    expect(childMap.cartography!.regions.some(role => role.role === "building")).toBe(true);
    // A road is not a place: it has no entrance.
    const road = map.document.geometry.regions.find(region => map.cartography!.regions.find(role => role.regionId === region.id)!.role === "road")!;
    expect((await post("/betreten", { commandId: randomUUID(), ...scope, knotenId: road.id, expectedVersion: children.version + 1 })).statusCode).toBe(404);
  }, 120_000);

  it("refuses options that belong to another map kind and places beyond the land's budget", async () => {
    const wrong = await post("/tactical/generate/preview", { commandId: randomUUID(), name: "Falsch", keim: "x", art: "region", optionen: { bauwerke: 12 } });
    expect(wrong.statusCode).toBe(400);
    const many = await post("/tactical/generate/preview", { commandId: randomUUID(), name: "Zu viele", keim: "x", art: "region", optionen: { orte: 25 } });
    expect(many.statusCode).toBe(400);
  });
});
