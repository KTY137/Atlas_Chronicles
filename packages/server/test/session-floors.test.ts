// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createCampaignBundleV23, currentCampaignSemanticDiff, currentCampaignTables, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "@chronicle/io";
import type { TacticalView } from "@chronicle/protocol";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGrundriss } from "../src/domain/grundriss.ts";
import { createMapStudio } from "../src/domain/map-studio.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";

/**
 * Am Spieltisch führt die Spielleitung die laufende Szene über eine Treppe ins nächste Geschoss.
 * Die Szene selbst bleibt, wie sie begann: ihre erste Karte, deren Türen und Rücknahmen stehen
 * unverändert in `session_tactical_states`; das Geschoss liegt daneben und reist in native-v23 mit.
 */
describe("Treppen am Spieltisch: die Szene wechselt das Geschoss", () => {
  let db: Db, app: FastifyInstance, gm: string, campaign: string, cookie: string, player: string, actorId: string, playerCookie: string;
  const cfg = { now: Date.now, origin: "https://geschoss.test", cookieSecret: "geschoss-test-secret-longer-than-thirty-two-characters", bootstrapToken: "geschoss-bootstrap-secret-longer-than-thirty-two" };
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const identity = createIdentity(db, cfg), campaigns = createCampaigns(db);
    gm = (await identity.bootstrap("Leitung")).userId;
    cookie = `chronicle_session=${(await identity.issueSession(gm)).value}`;
    campaign = (await campaigns.createCampaign(gm, { name: "Geschosse" })).id;
    const invite = await campaigns.issueInvitation(gm, campaign), request = await campaigns.requestJoin(invite.code, { displayName: "Sera" });
    const approved = await campaigns.approveJoin(gm, campaign, request.id);
    player = approved.userId; actorId = approved.actorId;
    playerCookie = `chronicle_session=${(await identity.issueSession(player)).value}`;
    app = await buildApp(db, cfg);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  const tactical = () => createTactical(db, cfg);
  const floor = (sessionId: string, payload: object, session = cookie) =>
    app.inject({ method: "POST", url: `/api/campaigns/${campaign}/sessions/${sessionId}/tactical/floor`, headers: { cookie: session, origin: cfg.origin }, payload });
  const door = (sessionId: string, portalId: string, payload: object) =>
    app.inject({ method: "POST", url: `/api/campaigns/${campaign}/sessions/${sessionId}/tactical/portals/${encodeURIComponent(portalId)}`, headers: { cookie, origin: cfg.origin }, payload });
  const linkTo = (view: TacticalView, level: number) => view.floor!.links.find(link => link.toLevel === level)!;

  /** A generated house (Keller, Erdgeschoss, Obergeschoss) with a scene started on its ground floor. */
  async function scene(keim: string) {
    const house = await createGrundriss(db, cfg).generate(gm, campaign, { commandId: randomUUID(), name: "Das Haus am Bach", keim, optionen: { profil: "haus", setting: "fantasy" } });
    const ground = house.ack.subjectId, stack = (await createMapStudio(db).getFloors(gm, campaign, ground)).stack;
    const stair = stack.links.find(link => [link.fromMapId, link.toMapId].includes(ground))!;
    const created = await createGameplay(db).createScene(gm, campaign, { name: `Szene ${keim}`, entryIds: [], fictionDate: "Tag eins" });
    await tactical().savePlan(gm, campaign, created.id, { commandId: randomUUID(), expectedVersion: 0, mapId: ground, mapRevision: 1,
      tokens: [{ id: randomUUID(), actorId, x: stair.position[0], y: stair.position[1], elevation: 0, rotation: 0, scale: 1 }] });
    const sessionId = String((await createGameplay(db).startScene(gm, campaign, created.id)).id);
    return { ground, stack, sessionId };
  }

  it("führt die ganze Szene über die Treppe, wiederholt dieselbe Anweisung und lässt Spieler nicht wechseln", async () => {
    const { ground, stack, sessionId } = await scene("treppe-eins");
    const upper = stack.floors.find(f => f.level === 1)!.mapId;
    const start = await tactical().getSession(gm, campaign, sessionId);
    expect(start.map!.id).toBe(ground);
    expect(start.floor).toMatchObject({ level: 0, name: "Erdgeschoss", version: 0 });
    expect(start.floor!.links.map(link => link.toLevel).sort()).toEqual([-1, 1]);

    const input = { commandId: randomUUID(), expectedVersion: 0, linkId: linkTo(start, 1).id };
    expect((await floor(sessionId, input, playerCookie)).statusCode).toBe(404);
    const moved = await floor(sessionId, input); expect(moved.statusCode, moved.body).toBe(200);
    expect(moved.json()).toEqual({ subjectId: upper, version: 1 });
    expect((await floor(sessionId, input)).json()).toEqual(moved.json());
    expect((await floor(sessionId, { ...input, linkId: linkTo(start, -1).id })).statusCode).toBe(409);
    expect((await floor(sessionId, { ...input, commandId: randomUUID() })).statusCode).toBe(409);

    const above = await tactical().getSession(gm, campaign, sessionId);
    expect(above.map!.id).toBe(upper);
    expect(above.floor).toMatchObject({ level: 1, name: "Obergeschoss", version: 1 });
    expect(above.floor!.links.map(link => link.toLevel)).toEqual([0]);
    // Every token keeps its place: the stair is one pair of coordinates on both floors.
    expect(above.tokens.map(token => [token.x, token.y])).toEqual(start.tokens.map(token => [token.x, token.y]));
    expect(above.rasterDigest).not.toBe(start.rasterDigest);
    // The player follows the scene, but sees neither the map card nor a stair in an unknown room.
    const seen = await tactical().getSession(player, campaign, sessionId);
    expect(seen.map).toBeUndefined();
    expect(seen.floor).toMatchObject({ level: 1, name: "Obergeschoss", links: [] });
  }, 60_000);

  it("hält die Türen jedes Geschosses und nimmt nur Türen der ersten Karte in die Rücknahme", async () => {
    const { sessionId } = await scene("treppe-zwei");
    const start = await tactical().getSession(gm, campaign, sessionId);
    await tactical().switchFloor(gm, campaign, sessionId, { commandId: randomUUID(), expectedVersion: 0, linkId: linkTo(start, 1).id });
    const above = await tactical().getSession(gm, campaign, sessionId), portal = above.portals![0]!;
    const toggled = await door(sessionId, portal.id, { commandId: randomUUID(), expectedVersion: portal.version, closed: !portal.closed });
    expect(toggled.statusCode, toggled.body).toBe(200);
    const after = await tactical().getSession(gm, campaign, sessionId);
    expect(after.portals!.find(p => p.id === portal.id)).toMatchObject({ closed: !portal.closed, version: portal.version + 1 });
    expect(after.undoTargets.filter(target => target.subjectKind === "portal")).toEqual([]);
    // Down and up again: the door upstairs waited, the ground floor kept its own.
    await tactical().switchFloor(gm, campaign, sessionId, { commandId: randomUUID(), expectedVersion: after.floor!.version, linkId: linkTo(after, 0).id });
    const back = await tactical().getSession(gm, campaign, sessionId);
    expect(back.map!.id).toBe(start.map!.id);
    expect(back.portals).toEqual(start.portals);
    await tactical().switchFloor(gm, campaign, sessionId, { commandId: randomUUID(), expectedVersion: back.floor!.version, linkId: linkTo(back, 1).id });
    expect((await tactical().getSession(gm, campaign, sessionId)).portals!.find(p => p.id === portal.id)).toMatchObject({ closed: !portal.closed });
  }, 60_000);

  it("lässt das bespielte Geschoss nicht aus dem Haus lösen und reist durch native v23", async () => {
    const { ground, stack, sessionId } = await scene("treppe-drei");
    const start = await tactical().getSession(gm, campaign, sessionId), cellar = stack.floors.find(f => f.level === -1)!.mapId;
    await tactical().switchFloor(gm, campaign, sessionId, { commandId: randomUUID(), expectedVersion: 0, linkId: linkTo(start, -1).id });
    const floors = await createMapStudio(db).getFloors(gm, campaign, ground);
    await expect(createMapStudio(db).detachFloor(gm, campaign, cellar, { commandId: randomUUID(), expectedVersion: floors.version })).rejects.toThrow(/spielt gerade eine Szene/);

    const bundle = await exportCampaignBundle(db, gm, campaign);
    expect(bundle.version).toBe(23);
    const target = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(target);
      await restoreCampaignBundle(target, parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle)));
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(target, gm, campaign))).toEqual([]);
      expect(await createTactical(target, cfg).getSession(gm, campaign, sessionId)).toEqual(await tactical().getSession(gm, campaign, sessionId));
    } finally { await target.close(); }

    // A hand-built bundle cannot put a floor's doors on another map or park the first map.
    const tables = currentCampaignTables(bundle), row = tables.session_floor_states[0]!;
    const build = (patch: object) => createCampaignBundleV23({ campaignId: campaign, universeId: bundle.manifest.universeId, exportedAt: bundle.manifest.exportedAt,
      tables: { ...tables, session_floor_states: tables.session_floor_states.map(candidate => candidate === row ? { ...candidate, ...patch } : candidate) } });
    expect(() => build({})).not.toThrow();
    expect(() => build({ portal_states: [...(row.portal_states as unknown[]), { id: "erfunden", closed: true, version: 1 }] })).toThrow(/doors/);
    expect(() => build({ parked: { [start.map!.id]: { revision: 1, portals: [] } } })).toThrow(/parked/);
    expect(() => build({ map_revision: 99 })).toThrow(/revision/);
  }, 90_000);
});
