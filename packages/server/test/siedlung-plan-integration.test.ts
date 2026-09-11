// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { parseCurrentCampaignBundle, serializeCurrentCampaignBundle, currentCampaignSemanticDiff } from "@chronicle/io";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";

describe("settlement zones over HTTP, permissions and portable persistence", () => {
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
  const planung = { schemaVersion: 1, zonen: [{ id: "craft", name: "Handwerk", nutzung: "handwerk", dichte: 1, polygon: [[0,0],[1,0],[1,1],[0,1]] }] };
  const request = () => ({ commandId: randomUUID(), art: "siedlung", stil: "gemalt", name: "Geplante Stadt", keim: "zoned-http", optionen: { art: "dorf", planung } });

  it("advertises the versioned planner", async () => {
    const res = await app.inject({url:`/api/campaigns/${campaign}/tactical/generate/defaults`,headers:{cookie}});
    expect(res.json().siedlungsplanung).toBe(1);
  });
  it("previews, saves idempotently, restores provenance and uses real workshop interiors", async () => {
    const input=request(), before=await createTactical(db).listMaps(gm,campaign), preview=await post("/tactical/generate/preview",input);
    expect(preview.statusCode,preview.body).toBe(200); expect(preview.json().bericht.planung.zonen[0].anzahl).toBeGreaterThan(0);
    expect(await createTactical(db).listMaps(gm,campaign)).toHaveLength(before.length);
    const res=await post("/tactical/generate",input); expect(res.statusCode,res.body).toBe(200); expect((await post("/tactical/generate",input)).json()).toEqual(res.json());
    const map=await createTactical(db).getMap(gm,campaign,res.json().ack.subjectId);
    expect(map.document).toEqual(preview.json().document);
    expect(map.cartography!.regions[0]!.provenance!.optionen.planung).toEqual(planung);
    const children=await createBetreten(db,config).children(gm,campaign,{parentKind:"tactical",parentMapId:map.id});
    expect(children.nodes.every(n => n.bauwerk && ["schmiede","werkstatt","lager"].includes(n.bauwerk.typ))).toBe(true);
    const workshop = children.nodes.find(n => n.bauwerk?.typ === "werkstatt" || n.bauwerk?.typ === "schmiede")!;
    expect(workshop).toBeDefined();
    const interior = await post("/betreten", { commandId: randomUUID(), parentKind: "tactical", parentMapId: map.id,
      knotenId: workshop.knotenId, expectedVersion: children.version, art: "grundriss" });
    expect(interior.statusCode, interior.body).toBe(200);
    const source = await createTactical(db).getMap(gm, campaign, interior.json().mapId);
    expect(source.cartography!.regions[0]!.provenance!.optionen.profil).toBe(workshop.bauwerk!.typ);
    const now={...config,now:()=>Date.parse("2026-09-11T13:00:00Z")}, bundle=await exportCampaignBundle(db,gm,campaign,now), target=await createTestDb();
    try { await initializeCampaignRestoreTarget(target); await restoreCampaignBundle(target,parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle)));
      expect(currentCampaignSemanticDiff(bundle,await exportCampaignBundle(target,gm,campaign,now))).toEqual([]);
      expect((await createTactical(target).getMap(gm,campaign,map.id)).cartography).toEqual(map.cartography);
    } finally { await target.close(); }
  },30000);
  it("an all-clearing plan can be stored without ghost buildings", async () => {
    const input=request(); input.optionen.planung={...planung,zonen:[{...planung.zonen[0]!,nutzung:"frei"}]};
    const res=await post("/tactical/generate",input);expect(res.statusCode,res.body).toBe(200);
    const map=await createTactical(db).getMap(gm,campaign,res.json().ack.subjectId);
    expect(map.cartography!.regions.filter(r=>r.role==="building")).toHaveLength(0);
    expect((await createBetreten(db,config).children(gm,campaign,{parentKind:"tactical",parentMapId:map.id})).nodes).toHaveLength(0);
  });
  it("rejects malformed or irrelevant masks before writing anything", async () => {
    const before=await createTactical(db).listMaps(gm,campaign);
    for (const input of [{...request(),optionen:{planung:{schemaVersion:2,zonen:[]}}}, {...request(),optionen:{anlage:"burg",planung}}, {...request(),art:"hoehle"},
      {...request(),optionen:{planung:{schemaVersion:1,zonen:[{...planung.zonen[0],polygon:[[0,0],[1,1],[0,1],[1,0]]}]}}}]) {
      const res=await post("/tactical/generate",input); expect(res.statusCode,res.body).toBe(400);
    }
    expect(await createTactical(db).listMaps(gm,campaign)).toHaveLength(before.length);
  });
  it("retains GM-only generation access", async()=> {
    expect((await post("/tactical/generate/preview",request(),playerCookie)).statusCode).toBe(404);
    expect((await post("/tactical/generate",request(),playerCookie)).statusCode).toBe(404);
  });
});
