// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { ANLAGE_ERZEUGER } from "@chronicle/forge";
import { parseCurrentCampaignBundle, serializeCurrentCampaignBundle, currentCampaignSemanticDiff } from "@chronicle/io";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";

describe("castle and palace generation over the real HTTP and persistence boundary", () => {
  let db: Db, app: FastifyInstance, gm: string, campaign: string, cookie: string, playerCookie: string;
  const config = { origin: "https://compound.test", cookieSecret: "compound-cookie-secret-longer-than-32", bootstrapToken: "compound-bootstrap-secret-longer-than-32" };
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, config), campaigns = createCampaigns(db);
    gm = (await identity.bootstrap("Compound tests")).userId;
    campaign = (await campaigns.createCampaign(gm, { name: "Compounds" })).id;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    const invitation = await campaigns.issueInvitation(gm, campaign), request = await campaigns.requestJoin(invitation.code, { displayName: "Player" });
    const player = (await campaigns.approveJoin(gm, campaign, request.id)).userId;
    playerCookie = `chronicle_session=${(await identity.issueSession(player)).value}`;
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });
  const post = (path: string, payload: object, session = cookie) => app.inject({ method: "POST", url: `/api/campaigns/${campaign}${path}`, headers: { cookie: session, origin: config.origin }, payload });
  const request = (anlage: "burg" | "schloss") => ({ commandId: randomUUID(), art: "siedlung", stil: "gemalt", name: anlage, keim: `persist:${anlage}`, optionen: { anlage } });

  it("advertises compound support instead of making older clients guess", async () => {
    const result = await app.inject({ url: `/api/campaigns/${campaign}/tactical/generate/defaults`, headers: { cookie } });
    expect(result.statusCode).toBe(200);
    expect(result.json().anlagen.burg).toMatchObject({ anlage: "burg", bauwerke: 12 });
    expect(result.json().anlagen.schloss).toMatchObject({ anlage: "schloss", symmetrie: 1 });
  });
  it.each(["burg", "schloss"] as const)("%s previews, persists once, exposes interiors and survives export/restore", async anlage => {
    const input = request(anlage), before = await createTactical(db).listMaps(gm, campaign);
    const preview = await post("/tactical/generate/preview", input);
    expect(preview.statusCode, preview.body).toBe(200);
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before.length);
    const saved = await post("/tactical/generate", input);
    expect(saved.statusCode, saved.body).toBe(200);
    const ack = saved.json(); expect((await post("/tactical/generate", input)).json()).toEqual(ack);
    const tactical = createTactical(db), map = await tactical.getMap(gm, campaign, ack.ack.subjectId);
    expect(map.document).toEqual(preview.json().document); expect(map.cartography).toEqual(preview.json().cartography);
    expect((await tactical.getSource(gm, campaign, map.id)).provenance.generator).toBe(ANLAGE_ERZEUGER);
    const entrance = createBetreten(db, config), scope = { parentKind: "tactical" as const, parentMapId: map.id };
    const children = await entrance.children(gm, campaign, scope);
    expect(children.nodes).toHaveLength(preview.json().bauwerke);
    expect(children.art).toBe("siedlung");
    expect(children.stil).toBe("gemalt");
    const childRequest = { commandId: randomUUID(), ...scope, knotenId: children.nodes[0]!.knotenId, expectedVersion: children.version };
    const child = await entrance.betrete(gm, campaign, childRequest);
    expect((await entrance.children(gm, campaign, { parentKind: "tactical", parentMapId: child.mapId })).nodes.length).toBeGreaterThan(1);
    expect((await entrance.betrete(gm, campaign, { ...childRequest, commandId: randomUUID() })).mapId).toBe(child.mapId);
    const now = { ...config, now: () => Date.parse("2026-09-11T12:00:00Z") }, bundle = await exportCampaignBundle(db, gm, campaign, now), target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target); await restoreCampaignBundle(target, parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle)));
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, campaign, now))).toEqual([]);
      expect((await createTactical(target).getMap(gm, campaign, map.id)).document).toEqual(map.document);
      expect((await createBetreten(target, config).betrete(gm, campaign, childRequest)).mapId).toBe(child.mapId);
    } finally { await target.close(); }
  }, 30_000);
  it("accepts a compound behind a regional entrance without silently forcing its town profile", async () => {
    const region = await post("/tactical/generate", { commandId: randomUUID(), art: "region", name: "Region", keim: "castle-from-region", optionen: { orte: 3, ausdehnung: [40, 30] } });
    expect(region.statusCode, region.body).toBe(200);
    const parentMapId = region.json().ack.subjectId, scope = { parentKind: "tactical" as const, parentMapId };
    const children = await createBetreten(db, config).children(gm, campaign, scope);
    const entered = await post("/betreten", { commandId: randomUUID(), ...scope, expectedVersion: children.version,
      knotenId: children.nodes[0]!.knotenId, art: "siedlung", optionen: { anlage: "burg", graben: true } });
    expect(entered.statusCode, entered.body).toBe(200);
    expect((await createTactical(db).getSource(gm, campaign, entered.json().mapId)).provenance.generator).toBe(ANLAGE_ERZEUGER);
  }, 15_000);
  it("honors a deliberate settlement change instead of overwriting it with regional metadata", async () => {
    const region = await post("/tactical/generate", { commandId: randomUUID(), art: "region", name: "Region", keim: "village-from-region", optionen: { orte: 3, ausdehnung: [40, 30] } });
    expect(region.statusCode, region.body).toBe(200);
    const parentMapId = region.json().ack.subjectId, scope = { parentKind: "tactical" as const, parentMapId };
    const children = await createBetreten(db, config).children(gm, campaign, scope);
    const entered = await post("/betreten", { commandId: randomUUID(), ...scope, expectedVersion: children.version,
      knotenId: children.nodes[0]!.knotenId, art: "siedlung", optionen: { art: "weiler", standort: "ebene" } });
    expect(entered.statusCode, entered.body).toBe(200);
    const map = await createTactical(db).getMap(gm, campaign, entered.json().mapId);
    expect(map.cartography!.regions[0]!.provenance!.optionen).toMatchObject({ art: "weiler", standort: "ebene" });
  }, 15_000);
  it("rejects incompatible and malformed options before writing maps", async () => {
    const before = await createTactical(db).listMaps(gm, campaign);
    for (const optionen of [{ anlage: "burg", strassenDichte: .5 }, { anlage: "schloss", graben: true }, { anlage: "burg", ausdehnung: [12, 12] }, { anlage: "burg", bauwerke: 1 }, { anlage: "schloss", symmetrie: 2 }, { anlage: "unknown" }]) {
      const response = await post("/tactical/generate", { ...request("burg"), optionen });
      expect(response.statusCode, response.body).toBe(400);
    }
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before.length);
  });
  it("does not grant players generation access", async () => {
    const before = await createTactical(db).listMaps(gm, campaign);
    expect((await post("/tactical/generate", request("burg"), playerCookie)).statusCode).toBe(404);
    expect((await post("/tactical/generate/preview", request("schloss"), playerCookie)).statusCode).toBe(404);
    expect(await createTactical(db).listMaps(gm, campaign)).toHaveLength(before.length);
  });
});
