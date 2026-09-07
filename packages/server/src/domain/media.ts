// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { AccessToken, ParticipantInfo_State, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig, type Membership } from "./campaigns.ts";
import { Gone } from "./errors.ts";

export interface MediaServerConfig {
  /** Browser WebSocket URL. Unencrypted transport is accepted only on loopback. */
  url: string;
  /** Server-only RoomService HTTP(S) endpoint; may be an internal Docker address. */
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  tokenTtlSeconds?: number;
}
/** Real provider boundary; tests can exercise failures without a running SFU. */
export interface MediaControl {
  ensureRoom(name: string, maxParticipants: number): Promise<void>;
  deleteRoom(name: string): Promise<void>;
  removeParticipant(name: string, identity: string): Promise<void>;
  hasParticipant(name: string, identity: string): Promise<boolean>;
  listParticipants(name: string): Promise<{ identity: string; metadata: string; active: boolean }[]>;
}
export interface MediaConfig extends DomainConfig { livekit?: MediaServerConfig; control?: MediaControl }
export class MediaUnavailable extends Error {
  constructor() { super("Sprache ist derzeit nicht verfügbar. Der Spieltisch bleibt erreichbar."); }
}
interface RoomRow { id: string; campaign_id: string; session_id: string; kind: "table" | "whisper"; provider_room: string; generation: number; closed_at: string | null }
export interface MediaRoom { id: string; kind: "table" | "whisper"; generation: number; memberIds: string[] }
export interface MediaStatus {
  configured: boolean; sessionId: string | null; rooms: MediaRoom[];
  presence: { userId: string; roomId: string; state: "joining" | "connected" }[];
  blocked: boolean; cleanupPending: boolean;
  blockedMemberIds?: string[];
}
export const MEDIA_PRESENCE_TTL_MS = 45_000;

function provider(config: MediaServerConfig): MediaControl {
  const service = new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret, { requestTimeout: 5 });
  const missing = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "not_found";
  return {
    async ensureRoom(name, maxParticipants) { await service.createRoom({ name, maxParticipants, emptyTimeout: 300, departureTimeout: 20 }); },
    async deleteRoom(name) { try { await service.deleteRoom(name); } catch (error) { if (!missing(error)) throw error; } },
    async removeParticipant(name, identity) { try { await service.removeParticipant(name, identity); } catch (error) { if (!missing(error)) throw error; } },
    async hasParticipant(name, identity) { try { const p = await service.getParticipant(name, identity); return p.state === ParticipantInfo_State.ACTIVE; } catch (error) { if (missing(error)) return false; throw error; } },
    async listParticipants(name) { try { return (await service.listParticipants(name)).map(p => ({ identity: p.identity, metadata: p.metadata, active: p.state === ParticipantInfo_State.ACTIVE })); } catch (error) { if (missing(error)) return []; throw error; } },
  };
}

/** Secrets are accepted from server configuration only, never request bodies. */
export function mediaConfigFromEnv(env: NodeJS.ProcessEnv): MediaServerConfig | undefined {
  const names = ["LIVEKIT_URL", "LIVEKIT_API_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"] as const;
  if (!names.some(name => env[name])) return undefined;
  if (names.some(name => !env[name])) throw new Error("Set all LIVEKIT_URL, LIVEKIT_API_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET values");
  return { url: env.LIVEKIT_URL!, apiUrl: env.LIVEKIT_API_URL!, apiKey: env.LIVEKIT_API_KEY!, apiSecret: env.LIVEKIT_API_SECRET! };
}

export function createMedia(db: Db, config: MediaConfig = {}) {
  const now = config.now ?? Date.now, livekit = config.livekit;
  const ttl = livekit?.tokenTtlSeconds ?? 60;
  if (livekit) {
    const browser = new URL(livekit.url), internal = new URL(livekit.apiUrl);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(browser.hostname);
    if (!(browser.protocol === "wss:" || (browser.protocol === "ws:" && loopback)) || browser.username || browser.password || browser.search || browser.hash ||
      !["http:", "https:"].includes(internal.protocol) || internal.username || internal.password || !livekit.apiKey || livekit.apiSecret.length < 32 ||
      !Number.isInteger(ttl) || ttl < 30 || ttl > 120) throw new Error("Invalid LiveKit server configuration");
  }
  const control = livekit ? (config.control ?? provider(livekit)) : undefined;
  const campaigns = createCampaigns(db, config);
  const enabled = () => { if (!livekit || !control) throw new MediaUnavailable(); return { livekit, control }; };
  const transport = async <T>(fn: () => Promise<T>): Promise<T> => { try { return await fn(); } catch { throw new MediaUnavailable(); } };

  async function authorize(tx: Db, userId: string, campaignId: string, gm = false): Promise<Membership> {
    const rows = await tx.query(`SELECT c.id FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id
      WHERE c.id=$1 AND m.user_id=$2 FOR UPDATE OF c FOR SHARE OF m`, [campaignId, userId]);
    if (!rows.rowCount) throw new Gone();
    return createCampaigns(tx, config).requireMember(userId, campaignId, gm ? ["leitung"] : undefined);
  }
  async function allowed(tx: Db, userId: string, campaignId: string) {
    if ((await tx.query("SELECT 1 FROM media_blocks WHERE campaign_id=$1 AND user_id=$2", [campaignId, userId])).rowCount) throw new Gone();
  }
  async function session(tx: Db, campaignId: string): Promise<string> {
    const row = (await tx.query<{ id: string }>("SELECT id FROM game_sessions WHERE campaign_id=$1 AND ended_at IS NULL", [campaignId])).rows[0];
    if (!row) throw new Gone("active-session-required");
    return row.id;
  }
  async function room(tx: Db, campaignId: string, id: string): Promise<RoomRow> {
    const row = (await tx.query<RoomRow>(`SELECT r.* FROM media_rooms r JOIN game_sessions s ON s.id=r.session_id
      WHERE r.id=$1 AND r.campaign_id=$2 AND r.closed_at IS NULL AND s.ended_at IS NULL`, [id, campaignId])).rows[0];
    if (!row) throw new Gone();
    return row;
  }
  async function admit(tx: Db, userId: string, campaignId: string, r: RoomRow) {
    await allowed(tx, userId, campaignId);
    if (r.kind === "whisper" && !(await tx.query("SELECT 1 FROM media_whisper_members WHERE room_id=$1 AND user_id=$2", [r.id, userId])).rowCount) throw new Gone();
  }
  async function members(tx: Db, r: RoomRow): Promise<string[]> {
    if (r.kind === "table") return [];
    return (await tx.query<{ user_id: string }>(`SELECT w.user_id FROM media_whisper_members w JOIN campaign_memberships m
      ON m.campaign_id=w.campaign_id AND m.user_id=w.user_id WHERE w.room_id=$1 ORDER BY w.user_id`, [r.id])).rows.map(p => p.user_id);
  }
  async function card(tx: Db, r: RoomRow): Promise<MediaRoom> { return { id: r.id, kind: r.kind, generation: r.generation, memberIds: await members(tx, r) }; }
  async function queue(tx: Db, r: RoomRow) {
    await tx.query("INSERT INTO media_cleanup(provider_room,campaign_id,queued_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [r.provider_room, r.campaign_id, now()]);
    await tx.query("DELETE FROM media_presence WHERE room_id=$1", [r.id]);
  }
  async function cleanup(tx: Db, campaignId: string) {
    const pending = (await tx.query<{ provider_room: string }>("SELECT provider_room FROM media_cleanup WHERE campaign_id=$1 ORDER BY queued_at,provider_room", [campaignId])).rows;
    if (!pending.length) return;
    const service = enabled().control;
    for (const r of pending) {
      await transport(() => service.deleteRoom(r.provider_room));
      await tx.query("DELETE FROM media_cleanup WHERE provider_room=$1", [r.provider_room]);
    }
  }
  async function insertRoom(tx: Db, userId: string, campaignId: string, sessionId: string, kind: RoomRow["kind"]): Promise<RoomRow> {
    const id = randomUUID();
    return (await tx.query<RoomRow>(`INSERT INTO media_rooms(id,campaign_id,session_id,kind,provider_room,created_by,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [id, campaignId, sessionId, kind, `chronicle-${randomUUID()}`, userId, now()])).rows[0]!;
  }
  async function table(tx: Db, userId: string, campaignId: string): Promise<RoomRow> {
    const sessionId = await session(tx, campaignId);
    return (await tx.query<RoomRow>("SELECT * FROM media_rooms WHERE session_id=$1 AND kind='table' AND closed_at IS NULL", [sessionId])).rows[0]
      ?? insertRoom(tx, userId, campaignId, sessionId, "table");
  }
  async function audit(tx: Db, campaignId: string, userId: string, kind: string, data: unknown) {
    await tx.query("INSERT INTO audit(campaign_id,actor_user_id,kind,data,created_at) VALUES($1,$2,$3,$4,$5)", [campaignId, userId, kind, data, now()]);
  }

  async function status(userId: string, campaignId: string): Promise<MediaStatus> {
    const viewer = await campaigns.requireMember(userId, campaignId);
    const active = (await db.query<{ id: string }>("SELECT id FROM game_sessions WHERE campaign_id=$1 AND ended_at IS NULL", [campaignId])).rows[0];
    const rows = (await db.query<RoomRow>(`SELECT r.* FROM media_rooms r JOIN game_sessions s ON s.id=r.session_id
      WHERE r.campaign_id=$1 AND r.closed_at IS NULL AND s.ended_at IS NULL ORDER BY r.created_at,r.id`, [campaignId])).rows;
    const presence = (await db.query<{ userId: string; roomId: string; state: "joining" | "connected" }>(`SELECT p.user_id AS "userId",p.room_id AS "roomId",p.state
      FROM media_presence p JOIN media_rooms r ON r.id=p.room_id JOIN game_sessions s ON s.id=r.session_id
      JOIN campaign_memberships m ON m.campaign_id=p.campaign_id AND m.user_id=p.user_id
      WHERE p.campaign_id=$1 AND p.updated_at>$2 AND r.closed_at IS NULL AND s.ended_at IS NULL AND p.generation=r.generation
      ORDER BY p.user_id`, [campaignId, now() - MEDIA_PRESENCE_TTL_MS])).rows;
    return { configured: !!livekit, sessionId: active?.id ?? null, rooms: await Promise.all(rows.map(r => card(db, r))), presence,
      blocked: !!(await db.query("SELECT 1 FROM media_blocks WHERE campaign_id=$1 AND user_id=$2", [campaignId, userId])).rowCount,
      ...(viewer.role === "leitung" ? { blockedMemberIds: (await db.query<{ user_id: string }>("SELECT user_id FROM media_blocks WHERE campaign_id=$1 ORDER BY user_id", [campaignId])).rows.map(row => row.user_id) } : {}),
      cleanupPending: !!(await db.query("SELECT 1 FROM media_cleanup WHERE campaign_id=$1 LIMIT 1", [campaignId])).rowCount };
  }
  async function createWhisper(userId: string, campaignId: string, memberIds: readonly string[]): Promise<MediaRoom> {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId, true); enabled(); await allowed(tx, userId, campaignId);
      const ids = [...new Set([userId, ...memberIds])].sort();
      if (ids.length < 2 || ids.length > 6 || memberIds.length > 6) throw new Gone("whisper-members");
      for (const id of ids) { await createCampaigns(tx, config).requireMember(id, campaignId); await allowed(tx, id, campaignId); }
      const sessionId = await session(tx, campaignId);
      if ((await tx.query("SELECT 1 FROM media_rooms WHERE session_id=$1 AND kind='whisper' AND closed_at IS NULL", [sessionId])).rowCount >= 8) throw new Gone("whisper-limit");
      const r = await insertRoom(tx, userId, campaignId, sessionId, "whisper");
      for (const id of ids) await tx.query("INSERT INTO media_whisper_members(room_id,campaign_id,user_id) VALUES($1,$2,$3)", [r.id, campaignId, id]);
      await audit(tx, campaignId, userId, "media.whisper.opened", { roomId: r.id, memberIds: ids });
      return card(tx, r);
    });
  }
  async function token(userId: string, campaignId: string, roomId?: string, credentialId?: string) {
    return db.transaction(async tx => {
      const member = await authorize(tx, userId, campaignId); const { livekit: server, control: service } = enabled();
      if (credentialId && !await validCredential(tx, userId, credentialId)) throw new Gone("credential-unavailable");
      await allowed(tx, userId, campaignId);
      const r = roomId ? await room(tx, campaignId, roomId) : await table(tx, userId, campaignId);
      await admit(tx, userId, campaignId, r);
      await cleanup(tx, campaignId);
      // Switching channels first removes the old SFU publication. A client must also
      // disconnect/unpublish locally before requesting the next channel token.
      const previous = (await tx.query<{ provider_room: string }>(`SELECT r.provider_room FROM media_presence p JOIN media_rooms r ON r.id=p.room_id
        WHERE p.campaign_id=$1 AND p.user_id=$2 AND p.room_id<>$3`, [campaignId, userId, r.id])).rows[0];
      if (previous) await transport(() => service.removeParticipant(previous.provider_room, userId));
      await transport(() => service.ensureRoom(r.provider_room, r.kind === "whisper" ? 6 : 32));
      const canPublish = member.role !== "beobachter";
      const sources = !canPublish ? [] : r.kind === "whisper" ? [TrackSource.MICROPHONE]
        : [TrackSource.MICROPHONE, TrackSource.CAMERA, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO];
      // HTTP supplies the authenticated credential, never a request-body identity.
      // Metadata survives app restarts and cannot be changed by the participant.
      const metadata = JSON.stringify({ credentialId: credentialId ?? null, role: member.role });
      const access = new AccessToken(server.apiKey, server.apiSecret, { identity: userId, name: member.displayName, ttl, metadata });
      access.addGrant({ roomJoin: true, room: r.provider_room, canPublish, canPublishSources: sources,
        canSubscribe: true, canPublishData: false, canUpdateOwnMetadata: false, roomAdmin: false, roomCreate: false, roomList: false, roomRecord: false, hidden: false });
      const jwt = await access.toJwt();
      await tx.query(`INSERT INTO media_presence(campaign_id,user_id,room_id,generation,state,updated_at) VALUES($1,$2,$3,$4,'joining',$5)
        ON CONFLICT(campaign_id,user_id) DO UPDATE SET room_id=EXCLUDED.room_id,generation=EXCLUDED.generation,state='joining',updated_at=EXCLUDED.updated_at`, [campaignId, userId, r.id, r.generation, now()]);
      return { token: jwt, url: server.url, roomId: r.id, kind: r.kind, generation: r.generation, expiresIn: ttl, canPublish };
    });
  }
  async function heartbeat(userId: string, campaignId: string, roomId: string) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId); const r = await room(tx, campaignId, roomId); await admit(tx, userId, campaignId, r);
      const p = (await tx.query("SELECT 1 FROM media_presence WHERE campaign_id=$1 AND user_id=$2 AND room_id=$3 AND generation=$4", [campaignId, userId, roomId, r.generation])).rowCount;
      if (!p) throw new Gone();
      if (!await transport(() => enabled().control.hasParticipant(r.provider_room, userId))) throw new Gone("media-not-connected");
      await tx.query("UPDATE media_presence SET state='connected',updated_at=$3 WHERE campaign_id=$1 AND user_id=$2", [campaignId, userId, now()]);
      return { ok: true as const };
    });
  }
  async function leave(userId: string, campaignId: string) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId);
      const rows = (await tx.query<{ provider_room: string }>(`SELECT r.provider_room FROM media_presence p JOIN media_rooms r ON r.id=p.room_id
        WHERE p.campaign_id=$1 AND p.user_id=$2`, [campaignId, userId])).rows;
      for (const r of rows) await transport(() => enabled().control.removeParticipant(r.provider_room, userId));
      await tx.query("DELETE FROM media_presence WHERE campaign_id=$1 AND user_id=$2", [campaignId, userId]);
      return { ok: true as const };
    });
  }
  async function flush(campaignId: string) {
    await db.transaction(async tx => { await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE", [campaignId]); await cleanup(tx, campaignId); });
  }
  async function closeWhisper(userId: string, campaignId: string, roomId: string) {
    await db.transaction(async tx => {
      await authorize(tx, userId, campaignId, true);
      const r = await room(tx, campaignId, roomId); if (r.kind !== "whisper") throw new Gone();
      await queue(tx, r); await tx.query("UPDATE media_rooms SET closed_at=$2 WHERE id=$1", [r.id, now()]);
      await audit(tx, campaignId, userId, "media.whisper.closed", { roomId });
    });
    // Commit intent first so provider failure never restores admission to a closed room.
    await flush(campaignId); return { ok: true as const };
  }
  async function revokeMember(userId: string, campaignId: string, targetId: string) {
    await db.transaction(async tx => {
      await authorize(tx, userId, campaignId, true);
      if (!(await tx.query("SELECT 1 FROM users WHERE id=$1", [targetId])).rowCount) throw new Gone();
      // Also works after membership removal, for the membership-revocation integration seam.
      if (!(await tx.query(`SELECT 1 FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2
        UNION ALL SELECT 1 FROM media_whisper_members WHERE campaign_id=$1 AND user_id=$2
        UNION ALL SELECT 1 FROM media_presence WHERE campaign_id=$1 AND user_id=$2 LIMIT 1`, [campaignId, targetId])).rowCount) throw new Gone();
      await tx.query(`INSERT INTO media_blocks(campaign_id,user_id,blocked_by,blocked_at) VALUES($1,$2,$3,$4)
        ON CONFLICT(campaign_id,user_id) DO UPDATE SET blocked_by=EXCLUDED.blocked_by,blocked_at=EXCLUDED.blocked_at`, [campaignId, targetId, userId, now()]);
      const rooms = (await tx.query<RoomRow>(`SELECT r.* FROM media_rooms r WHERE r.campaign_id=$1 AND r.closed_at IS NULL
        AND (r.kind='table' OR EXISTS(SELECT 1 FROM media_whisper_members w WHERE w.room_id=r.id AND w.user_id=$2))`, [campaignId, targetId])).rows;
      // Rotate the entire affected room: self-hosted LiveKit does not invalidate cached
      // participant JWTs on removal. With auto_create:false the old room stays dead.
      for (const r of rooms) {
        await queue(tx, r);
        await tx.query("UPDATE media_rooms SET provider_room=$2,generation=generation+1 WHERE id=$1", [r.id, `chronicle-${randomUUID()}`]);
      }
      await audit(tx, campaignId, userId, "media.member.revoked", { userId: targetId, roomIds: rooms.map(r => r.id) });
    });
    await flush(campaignId); return { ok: true as const };
  }
  async function restoreMember(userId: string, campaignId: string, targetId: string) {
    return db.transaction(async tx => {
      await authorize(tx, userId, campaignId, true); await createCampaigns(tx, config).requireMember(targetId, campaignId);
      await tx.query("DELETE FROM media_blocks WHERE campaign_id=$1 AND user_id=$2", [campaignId, targetId]);
      await audit(tx, campaignId, userId, "media.member.restored", { userId: targetId });
      return { ok: true as const };
    });
  }
  async function validCredential(tx: Db, userId: string, credentialId: string): Promise<boolean> {
    return !!(await tx.query(`SELECT c.id FROM credentials c LEFT JOIN credentials p ON p.id=c.parent_id
      WHERE c.id=$1 AND c.user_id=$2 AND c.kind IN ('guest','cookie') AND c.revoked_at IS NULL AND c.expires_at>$3
      AND (c.parent_id IS NULL OR (p.id IS NOT NULL AND p.revoked_at IS NULL AND p.expires_at>$3))`, [credentialId, userId, now()])).rowCount;
  }
  async function stillAdmitted(tx: Db, r: RoomRow, participant: { identity: string; metadata: string }): Promise<boolean> {
    let binding: { credentialId?: unknown; role?: unknown };
    try { binding = JSON.parse(participant.metadata) as typeof binding; } catch { return false; }
    if (!binding || typeof binding.credentialId !== "string" || !await validCredential(tx, participant.identity, binding.credentialId)) return false;
    const member = (await tx.query<{ role: string }>(`SELECT m.role FROM campaign_memberships m
      WHERE m.campaign_id=$1 AND m.user_id=$2 AND NOT EXISTS(SELECT 1 FROM media_blocks b WHERE b.campaign_id=m.campaign_id AND b.user_id=m.user_id)`, [r.campaign_id, participant.identity])).rows[0];
    if (!member || binding.role !== member.role) return false;
    if (!(await tx.query("SELECT 1 FROM media_presence WHERE campaign_id=$1 AND user_id=$2 AND room_id=$3 AND generation=$4", [r.campaign_id, participant.identity, r.id, r.generation])).rowCount) return false;
    return r.kind === "table" || !!(await tx.query("SELECT 1 FROM media_whisper_members WHERE room_id=$1 AND user_id=$2", [r.id, participant.identity])).rowCount;
  }
  /** Recheck actual SFU participants; admission cannot outlive its credential or membership. */
  async function reconcile() {
    if (!control) return;
    const ids = (await db.query<{ campaign_id: string }>(`SELECT DISTINCT r.campaign_id FROM media_rooms r JOIN game_sessions s ON s.id=r.session_id
      WHERE r.closed_at IS NULL UNION SELECT campaign_id FROM media_cleanup`)).rows;
    const failures: unknown[] = [];
    for (const { campaign_id: campaignId } of ids) {
      try {
      await db.transaction(async tx => {
        await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE", [campaignId]);
        const rows = (await tx.query<RoomRow & { ended_at: string | null }>(`SELECT r.*,s.ended_at FROM media_rooms r JOIN game_sessions s ON s.id=r.session_id
          WHERE r.campaign_id=$1 AND r.closed_at IS NULL`, [campaignId])).rows;
        for (const r of rows) {
          if (r.ended_at !== null) { await queue(tx, r); await tx.query("UPDATE media_rooms SET closed_at=$2 WHERE id=$1", [r.id, now()]); continue; }
          const participants = await transport(() => control.listParticipants(r.provider_room));
          for (const participant of participants) if (!await stillAdmitted(tx, r, participant)) {
            // Removing only this participant would leave its cached JWT usable.
            // Commit a new room generation before trying to destroy the old room.
            await queue(tx, r);
            await tx.query("UPDATE media_rooms SET provider_room=$2,generation=generation+1 WHERE id=$1", [r.id, `chronicle-${randomUUID()}`]);
            break;
          } else if (participant.active) {
            await tx.query("UPDATE media_presence SET state='connected',updated_at=$3 WHERE campaign_id=$1 AND user_id=$2 AND room_id=$4", [campaignId, participant.identity, now(), r.id]);
          }
          await tx.query("DELETE FROM media_presence WHERE room_id=$1 AND state='connected' AND NOT(user_id=ANY($2::text[]))", [r.id, participants.map(participant => participant.identity)]);
        }
      });
      await flush(campaignId);
      } catch (error) { failures.push(error); }
    }
    // A failing provider room must not starve revocation in unrelated campaigns.
    // Report failure only after every campaign has had its own reconciliation attempt.
    if (failures.length) throw failures[0];
  }
  return { status, createWhisper, token, heartbeat, leave, closeWhisper, revokeMember, restoreMember, reconcile };
}
