// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify from "fastify";
import { TokenVerifier } from "livekit-server-sdk";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createMedia, mediaConfigFromEnv, MEDIA_PRESENCE_TTL_MS, MediaUnavailable, type MediaControl } from "../src/domain/media.ts";
import { Gone } from "../src/domain/errors.ts";
import { registerMedia } from "../src/http/media.ts";

const identityConfig = { origin: "https://chronicle.test", cookieSecret: "media-test-cookie-secret-with-at-least-32-characters" };
const livekit = { url: "ws://localhost:7880", apiUrl: "http://localhost:7880", apiKey: "media-test-key", apiSecret: "media-test-sdk-signing-secret-with-at-least-32-characters" };
class Control implements MediaControl {
  calls: string[] = []; connected = new Set<string>(); failDelete = false; failCreate = false;
  async ensureRoom(name: string) { this.calls.push(`create:${name}`); if (this.failCreate) throw new Error("SFU offline"); }
  async deleteRoom(name: string) { this.calls.push(`delete:${name}`); if (this.failDelete) throw new Error("SFU offline"); }
  async removeParticipant(name: string, identity: string) { this.calls.push(`remove:${name}:${identity}`); this.connected.delete(identity); }
  async hasParticipant(_name: string, identity: string) { return this.connected.has(identity); }
  async listParticipants() { return []; }
}

describe("membership-bound media with separate whisper rooms", () => {
  let db: Db, gm: string, cookie: string;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    const account = await createIdentity(db, identityConfig).bootstrap("Media GM");
    gm = account.userId; cookie = account.setCookie.split(";")[0]!;
  }, 30_000);
  afterAll(async () => db?.close());
  async function setup(active = true) {
    const campaigns = createCampaigns(db), campaign = (await campaigns.createCampaign(gm, { name: "Media table" })).id;
    async function player(name: string) {
      const invitation = await campaigns.issueInvitation(gm, campaign);
      const join = await campaigns.requestJoin(invitation.code, { displayName: name });
      return (await campaigns.approveJoin(gm, campaign, join.id)).userId;
    }
    const a = await player("Sera"), b = await player("Daro"), observer = await player("Listener");
    await db.query("UPDATE campaign_memberships SET role='beobachter' WHERE campaign_id=$1 AND user_id=$2", [campaign, observer]);
    const control = new Control(); let clock = Date.now();
    const media = createMedia(db, { livekit, control, now: () => clock });
    if (active) {
      const game = createGameplay(db); const scene = await game.createScene(gm, campaign, { name: "Evening", entryIds: [], fictionDate: "Day 1" });
      await game.startScene(gm, campaign, scene.id);
    }
    return { campaign, a, b, observer, control, media, advance: (ms: number) => { clock += ms; } };
  }
  const verify = (token: string) => new TokenVerifier(livekit.apiKey, livekit.apiSecret).verify(token);

  it("rejects incomplete/unsafe provider config and reports disabled media honestly", async () => {
    expect(mediaConfigFromEnv({})).toBeUndefined();
    expect(() => mediaConfigFromEnv({ LIVEKIT_URL: livekit.url })).toThrow("Set all");
    expect(() => createMedia(db, { livekit: { ...livekit, url: "ws://remote.example" } })).toThrow("Invalid");
    expect(() => createMedia(db, { livekit: { ...livekit, tokenTtlSeconds: 3600 } })).toThrow("Invalid");
    const f = await setup();
    expect((await createMedia(db).status(gm, f.campaign)).configured).toBe(false);
    await expect(createMedia(db).token(gm, f.campaign)).rejects.toBeInstanceOf(MediaUnavailable);
  });
  it("requires an active game session and exact campaign membership before touching the SFU", async () => {
    const f = await setup(false), foreign = await setup();
    await expect(f.media.token(f.a, f.campaign)).rejects.toBeInstanceOf(Gone);
    await expect(f.media.token(foreign.a, f.campaign)).rejects.toBeInstanceOf(Gone);
    await expect(f.media.status(foreign.a, f.campaign)).rejects.toBeInstanceOf(Gone);
    expect(f.control.calls).toEqual([]);
  });
  it("signs real short-lived identity JWTs with table video grants and listen-only observers", async () => {
    const f = await setup(); const before = Math.floor(Date.now() / 1000);
    const joined = await f.media.token(f.a, f.campaign), claims = await verify(joined.token);
    expect(claims.sub).toBe(f.a); expect(claims.name).toBe("Sera");
    expect(claims.exp).toBeGreaterThanOrEqual(before + 60); expect(claims.exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 60);
    expect(claims.video).toMatchObject({ roomJoin: true, canSubscribe: true, canPublish: true, canPublishSources: ["microphone", "camera", "screen_share", "screen_share_audio"], canPublishData: false,
      roomAdmin: false, roomCreate: false, roomList: false, roomRecord: false, hidden: false, canUpdateOwnMetadata: false });
    expect(claims.video?.room).toMatch(/^chronicle-/);
    const observer = await f.media.token(f.observer, f.campaign);
    expect(observer.roomId).toBe(joined.roomId);
    expect((await verify(observer.token)).video).toMatchObject({ canPublish: false, canSubscribe: true, canPublishSources: [] });
    expect((await f.media.status(f.b, f.campaign)).presence).toContainEqual({ userId: f.a, roomId: joined.roomId, state: "joining" });
  });
  it("persists explicit whispers, exposes their existence to the table, and admits only invited members", async () => {
    const f = await setup(), foreign = await setup();
    await expect(f.media.createWhisper(f.a, f.campaign, [f.b])).rejects.toBeInstanceOf(Gone);
    await expect(f.media.createWhisper(gm, f.campaign, [foreign.a])).rejects.toBeInstanceOf(Gone);
    const whisper = await f.media.createWhisper(gm, f.campaign, [f.a]);
    const reopened = createMedia(db, { livekit, control: f.control });
    const tableView = await reopened.status(f.b, f.campaign);
    expect(tableView.rooms).toContainEqual(whisper);
    expect(JSON.stringify(tableView)).not.toContain("chronicle-");
    expect(JSON.stringify(tableView)).not.toContain(livekit.apiSecret);
    await expect(reopened.token(f.b, f.campaign, whisper.id)).rejects.toBeInstanceOf(Gone);
    const privateJoin = await reopened.token(f.a, f.campaign, whisper.id), tableJoin = await reopened.token(f.b, f.campaign);
    expect((await verify(privateJoin.token)).video?.canPublishSources).toEqual(["microphone"]);
    expect((await verify(privateJoin.token)).video?.room).not.toBe((await verify(tableJoin.token)).video?.room);
    expect((await db.query("SELECT * FROM media_whisper_members WHERE room_id=$1", [whisper.id])).rowCount).toBe(2);
  });
  it("confirms connected presence against the SFU, expires leases, and removes old audio before switching", async () => {
    const f = await setup(); const table = await f.media.token(f.a, f.campaign);
    await expect(f.media.heartbeat(f.a, f.campaign, table.roomId)).rejects.toBeInstanceOf(Gone);
    f.control.connected.add(f.a); await f.media.heartbeat(f.a, f.campaign, table.roomId);
    expect((await f.media.status(f.b, f.campaign)).presence[0]?.state).toBe("connected");
    f.advance(MEDIA_PRESENCE_TTL_MS + 1); expect((await f.media.status(f.b, f.campaign)).presence).toEqual([]);
    const whisper = await f.media.createWhisper(gm, f.campaign, [f.a]); f.control.calls = [];
    await f.media.token(f.a, f.campaign, whisper.id);
    expect(f.control.calls[0]).toMatch(/^remove:/); expect(f.control.calls[1]).toMatch(/^create:/);
    await f.media.leave(f.a, f.campaign); expect((await f.media.status(f.b, f.campaign)).presence).toEqual([]);
  });
  it("persists failed revocation, blocks new tokens, retries deletion and rotates affected room names", async () => {
    const f = await setup(); const old = await f.media.token(f.a, f.campaign), oldName = (await verify(old.token)).video!.room!;
    const whisper = await f.media.createWhisper(gm, f.campaign, [f.a]); await f.media.token(gm, f.campaign, whisper.id);
    f.control.failDelete = true;
    await expect(f.media.revokeMember(gm, f.campaign, f.a)).rejects.toBeInstanceOf(MediaUnavailable);
    expect((await f.media.status(f.a, f.campaign))).toMatchObject({ blocked: true, cleanupPending: true });
    await expect(f.media.token(f.a, f.campaign)).rejects.toBeInstanceOf(Gone);
    await expect(f.media.token(f.b, f.campaign)).rejects.toBeInstanceOf(MediaUnavailable);
    f.control.failDelete = false; await f.media.reconcile();
    expect(f.control.calls).toContain(`delete:${oldName}`);
    const next = await f.media.token(f.b, f.campaign);
    expect(next.roomId).toBe(old.roomId); expect(next.generation).toBe(old.generation + 1);
    expect((await verify(next.token)).video?.room).not.toBe(oldName);
    expect((await f.media.status(f.b, f.campaign)).cleanupPending).toBe(false);
    await expect(f.media.restoreMember(f.b, f.campaign, f.a)).rejects.toBeInstanceOf(Gone);
    await f.media.restoreMember(gm, f.campaign, f.a); await expect(f.media.token(f.a, f.campaign)).resolves.toMatchObject({ roomId: old.roomId });
  });
  it("keeps whisper closure authoritative when provider deletion fails", async () => {
    const f = await setup(), whisper = await f.media.createWhisper(gm, f.campaign, [f.a]);
    await f.media.token(f.a, f.campaign, whisper.id); f.control.failDelete = true;
    await expect(f.media.closeWhisper(gm, f.campaign, whisper.id)).rejects.toBeInstanceOf(MediaUnavailable);
    await expect(f.media.token(f.a, f.campaign, whisper.id)).rejects.toBeInstanceOf(Gone);
    expect((await f.media.status(f.b, f.campaign)).rooms).toEqual([]);
    f.control.failDelete = false; await f.media.reconcile();
    expect((await db.query("SELECT 1 FROM media_cleanup WHERE campaign_id=$1", [f.campaign])).rowCount).toBe(0);
  });
  it("retires media rooms when their game session ends and cleans them after reconciliation", async () => {
    const f = await setup(), old = await f.media.token(f.a, f.campaign);
    const game = createGameplay(db), nextScene = await game.createScene(gm, f.campaign, { name: "Next", entryIds: [], fictionDate: "Day 2" });
    await game.startScene(gm, f.campaign, nextScene.id);
    await expect(f.media.token(f.a, f.campaign, old.roomId)).rejects.toBeInstanceOf(Gone);
    expect((await f.media.status(f.a, f.campaign)).presence).toEqual([]);
    await f.media.reconcile(); expect(f.control.calls.some(c => c.startsWith("delete:"))).toBe(true);
    expect((await f.media.token(f.a, f.campaign)).roomId).not.toBe(old.roomId);
  });
  it("does not claim joining or return a token when room creation fails", async () => {
    const f = await setup(); f.control.failCreate = true;
    await expect(f.media.token(f.a, f.campaign)).rejects.toBeInstanceOf(MediaUnavailable);
    expect((await f.media.status(f.a, f.campaign)).presence).toEqual([]);
  });
  it("uses existing cookie identity and closed HTTP schemas; disabled media returns an honest 503", async () => {
    const f = await setup(); const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
    app.setErrorHandler((error, _req, reply) => reply.code(error instanceof Gone ? 404 : typeof error === "object" && error !== null && "validation" in error ? 400 : 500).send({ error: "unavailable" }));
    registerMedia(app, db, identityConfig);
    try {
      expect((await app.inject({ method: "GET", url: `/api/campaigns/${f.campaign}/media` })).statusCode).toBe(404);
      const denied = await app.inject({ method: "POST", url: `/api/campaigns/${f.campaign}/media/token`, headers: { cookie }, payload: { identity: f.b, room: "forged", roomAdmin: true } });
      expect(denied.statusCode).toBe(400);
      const disabled = await app.inject({ method: "POST", url: `/api/campaigns/${f.campaign}/media/token`, headers: { cookie }, payload: {} });
      expect(disabled.statusCode).toBe(503); expect(disabled.json().error).toBe("media-unavailable");
    } finally { await app.close(); }
  });
});
