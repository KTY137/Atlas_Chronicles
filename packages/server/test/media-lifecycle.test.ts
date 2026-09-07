// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import { RoomServiceClient, TokenVerifier } from "livekit-server-sdk";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createMedia, type MediaControl } from "../src/domain/media.ts";
import { registerMedia } from "../src/http/media.ts";

const config = { origin: "https://media-lifecycle.test", cookieSecret: "test-cookie-key-with-at-least-32-characters" };
const livekit = { url: "ws://localhost:7880", apiUrl: "http://localhost:7880", apiKey: "lifecycle-key", apiSecret: "test-livekit-key-with-at-least-32-characters" };
type Peer = { identity: string; metadata: string; active: boolean };
class Control implements MediaControl {
  rooms = new Map<string, Peer[]>(); deleted: string[] = []; failDelete = false;
  async ensureRoom(name: string) { if (!this.rooms.has(name)) this.rooms.set(name, []); }
  async deleteRoom(name: string) { if (this.failDelete) throw new Error("Provider unavailable"); this.deleted.push(name); this.rooms.delete(name); }
  async removeParticipant(name: string, identity: string) { this.rooms.set(name, (this.rooms.get(name) ?? []).filter(p => p.identity !== identity)); }
  async hasParticipant(name: string, identity: string) { return (this.rooms.get(name) ?? []).some(p => p.identity === identity && p.active); }
  async listParticipants(name: string) { return this.rooms.get(name) ?? []; }
}

describe("media admission survives neither revocation nor stale channel tokens", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Media owner")).userId; }, 30_000);
  afterAll(async () => db?.close());
  async function setup() {
    const campaigns = createCampaigns(db), campaign = (await campaigns.createCampaign(gm, { name: "Media lifecycle" })).id;
    const invite = await campaigns.issueInvitation(gm, campaign), request = await campaigns.requestJoin(invite.code, { displayName: "Sera" });
    const player = (await campaigns.approveJoin(gm, campaign, request.id)).userId;
    const identity = createIdentity(db, config), credential = await identity.issueSession(player, "cookie");
    const game = createGameplay(db), scene = await game.createScene(gm, campaign, { name: "Evening", entryIds: [], fictionDate: "Day 1" });
    await game.startScene(gm, campaign, scene.id);
    const control = new Control(), media = createMedia(db, { livekit, control });
    const joined = await media.token(player, campaign, undefined, credential.credentialId);
    const claims = await new TokenVerifier(livekit.apiKey, livekit.apiSecret).verify(joined.token);
    const roomName = claims.video!.room!, peer = { identity: player, metadata: claims.metadata!, active: true };
    control.rooms.set(roomName, [peer]);
    return { campaign, player, credential, identity, media, control, roomName, joined, peer };
  }

  it("binds the HTTP token to the authenticated credential and rejects body impersonation", async () => {
    const campaigns = createCampaigns(db), campaign = (await campaigns.createCampaign(gm, { name: "HTTP media" })).id;
    const identity = createIdentity(db, config), credential = await identity.issueSession(gm, "cookie");
    const game = createGameplay(db), scene = await game.createScene(gm, campaign, { name: "HTTP evening", entryIds: [], fictionDate: "Day 1" });
    await game.startScene(gm, campaign, scene.id);
    const create = vi.spyOn(RoomServiceClient.prototype, "createRoom").mockResolvedValue({} as never);
    const participants = vi.spyOn(RoomServiceClient.prototype, "listParticipants").mockResolvedValue([]);
    const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
    registerMedia(app, db, config, livekit);
    try {
      const response = await app.inject({ method: "POST", url: `/api/campaigns/${campaign}/media/token`, headers: { cookie: credential.setCookie }, payload: {} });
      expect(response.statusCode).toBe(200);
      const claims = await new TokenVerifier(livekit.apiKey, livekit.apiSecret).verify(response.json().token);
      expect(JSON.parse(claims.metadata!)).toEqual({ credentialId: credential.credentialId, role: "leitung" });
      expect(claims.video?.canUpdateOwnMetadata).toBe(false);
      const forged = await app.inject({ method: "POST", url: `/api/campaigns/${campaign}/media/token`, headers: { cookie: credential.setCookie }, payload: { credentialId: randomUUID() } });
      expect(forged.statusCode).toBe(400);
    } finally { await app.close(); create.mockRestore(); participants.mockRestore(); }
  });

  it("confirms actual provider presence after restart without a browser heartbeat", async () => {
    const f = await setup();
    await db.query("UPDATE media_presence SET updated_at=0 WHERE campaign_id=$1", [f.campaign]);
    expect((await f.media.status(gm, f.campaign)).presence).toEqual([]);
    await createMedia(db, { livekit, control: f.control }).reconcile();
    expect((await f.media.status(gm, f.campaign)).presence).toContainEqual({ userId: f.player, roomId: f.joined.roomId, state: "connected" });
    expect(f.control.deleted).toEqual([]);
    f.control.rooms.set(f.roomName, []);
    await f.media.reconcile();
    expect((await f.media.status(gm, f.campaign)).presence).toEqual([]);
  });

  it.each(["credential", "membership", "role", "parent", "expired", "unbound"] as const)("rotates the SFU room when %s admission is revoked", async reason => {
    const f = await setup();
    if (reason === "credential") await f.identity.revoke(f.player, f.credential.credentialId);
    if (reason === "membership") await db.query("DELETE FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2", [f.campaign, f.player]);
    if (reason === "role") await db.query("UPDATE campaign_memberships SET role='beobachter' WHERE campaign_id=$1 AND user_id=$2", [f.campaign, f.player]);
    if (reason === "expired") await db.query("UPDATE credentials SET expires_at=0 WHERE id=$1", [f.credential.credentialId]);
    if (reason === "unbound") f.peer.metadata = "";
    if (reason === "parent") {
      const parent = await f.identity.issueSession(f.player, "cookie");
      await db.query("UPDATE credentials SET parent_id=$2 WHERE id=$1", [f.credential.credentialId, parent.credentialId]);
      await f.identity.revoke(f.player, parent.credentialId);
    }
    await f.media.reconcile();
    expect(f.control.deleted).toContain(f.roomName);
    expect((await f.media.status(gm, f.campaign)).rooms.find(r => r.id === f.joined.roomId)?.generation).toBe(f.joined.generation + 1);
    expect((await f.media.status(gm, f.campaign)).presence).toEqual([]);
  });

  it("keeps revocation intent when provider deletion fails and retries it on restart", async () => {
    const f = await setup(); await f.identity.revoke(f.player, f.credential.credentialId); f.control.failDelete = true;
    await expect(f.media.reconcile()).rejects.toThrow();
    expect((await f.media.status(gm, f.campaign)).cleanupPending).toBe(true);
    expect((await f.media.status(gm, f.campaign)).rooms[0]!.generation).toBe(f.joined.generation + 1);
    f.control.failDelete = false;
    await createMedia(db, { livekit, control: f.control }).reconcile();
    expect(f.control.deleted).toContain(f.roomName);
    expect((await f.media.status(gm, f.campaign)).cleanupPending).toBe(false);
  });

  it("continues reconciling other campaigns when one provider deletion repeatedly fails", async () => {
    const first = await setup(), second = await setup(), control = first.control;
    control.rooms.set(second.roomName, [second.peer]);
    await first.identity.revoke(first.player, first.credential.credentialId);
    await second.identity.revoke(second.player, second.credential.credentialId);
    let unavailable: string | undefined;
    control.deleteRoom = async name => {
      unavailable ??= name;
      if (name === unavailable) throw new Error("One provider room remains unavailable");
      control.deleted.push(name); control.rooms.delete(name);
    };
    const media = createMedia(db, { livekit, control });
    for (let attempt = 0; attempt < 3; attempt++) {
      await expect(media.reconcile()).rejects.toThrow();
      for (const item of [first, second])
        expect((await media.status(gm, item.campaign)).rooms[0]!.generation).toBe(item.joined.generation + 1);
      expect(control.deleted.length).toBe(1);
    }
    expect([first.roomName, second.roomName]).toContain(unavailable);
    // This fixture owns the failed provider entry; leave no pending intent for later tests.
    control.deleteRoom = async name => { control.deleted.push(name); control.rooms.delete(name); };
    await media.reconcile();
  });

  it("rejects a cached token for a channel the identity has already left", async () => {
    const f = await setup(), whisper = await f.media.createWhisper(gm, f.campaign, [f.player]);
    await f.media.token(f.player, f.campaign, whisper.id, f.credential.credentialId);
    // A hostile client replays the old table token after server-side removal.
    f.control.rooms.set(f.roomName, [f.peer]);
    await f.media.reconcile();
    expect(f.control.deleted).toContain(f.roomName);
    expect((await f.media.status(gm, f.campaign)).presence[0]?.roomId).toBe(whisper.id);
  });

  it("shows moderation blocks only to the GM", async () => {
    const f = await setup(); await f.media.revokeMember(gm, f.campaign, f.player);
    expect((await f.media.status(gm, f.campaign)).blockedMemberIds).toEqual([f.player]);
    expect(await f.media.status(f.player, f.campaign)).toMatchObject({ blocked: true });
    expect(Object.hasOwn(await f.media.status(f.player, f.campaign), "blockedMemberIds")).toBe(false);
    await f.media.restoreMember(gm, f.campaign, f.player);
    expect((await f.media.status(gm, f.campaign)).blockedMemberIds).toEqual([]);
  });
});
