// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import type { Db } from "../db/index.ts";
import { Gone, Conflict } from "./errors.ts";
import { normalizeName } from "./names.ts";
import { secretToken, tokenHash } from "../identity/index.ts";

/**
 * `fetch` ist hier eine ABHÄNGIGKEIT und keine Bequemlichkeit: der Kartenabruf aus einem Wiki ist
 * die einzige Stelle, an der dieser Server nach draußen spricht, und ein Test darf dabei nie
 * wirklich ins Netz. Ohne diesen Haken wäre die Grenze nur behauptet.
 */
export interface DomainConfig { now?: () => number; fetch?: typeof fetch }
export interface Membership { campaignId: string; userId: string; role: "leitung" | "spieler" | "beobachter"; displayName: string; actorId: string | null; universeId: string }
export function createCampaigns(db: Db, cfg: DomainConfig = {}) {
  const now = cfg.now ?? Date.now;
  async function requireMember(userId: string, campaignId: string, roles?: readonly string[]): Promise<Membership> {
    const row = (await db.query<Membership>(`SELECT m.campaign_id AS "campaignId", m.user_id AS "userId", m.role,
      m.display_name AS "displayName",
      CASE WHEN m.role IN ('leitung','spieler') AND p.actor_id IS NOT NULL AND p.archived_at IS NULL
        AND EXISTS (SELECT 1 FROM actor_controllers g WHERE g.campaign_id=m.campaign_id
          AND g.actor_id=p.actor_id AND g.user_id=m.user_id AND g.permission='control' AND g.revoked_at IS NULL)
        THEN p.actor_id ELSE NULL END AS "actorId", c.universe_id AS "universeId"
      FROM campaign_memberships m JOIN campaigns c ON c.id=m.campaign_id
      LEFT JOIN reader_perspectives r ON r.campaign_id=m.campaign_id AND r.user_id=m.user_id
      LEFT JOIN actor_profiles p ON p.campaign_id=m.campaign_id
        AND p.actor_id=CASE WHEN r.user_id IS NULL THEN m.actor_id ELSE r.actor_id END
      WHERE m.user_id=$1 AND m.campaign_id=$2`, [userId, campaignId])).rows[0];
    if (!row || (roles && !roles.includes(row.role))) throw new Gone("membership");
    return row;
  }
  async function createCampaign(userId: string, input: { name: string }) {
    if (!input.name.trim() || input.name.length > 160) throw new Gone("campaign-name");
    return db.transaction(async (tx) => {
      const user = (await tx.query<{ display_name: string }>("SELECT display_name FROM users WHERE id=$1 AND platform_role='leitung'", [userId])).rows[0];
      if (!user) throw new Gone("owner-required");
      const id = randomUUID(), universeId = randomUUID(), name = input.name.trim();
      await tx.query("INSERT INTO universes(id,owner_user_id,name) VALUES($1,$2,$3)", [universeId, userId, name]);
      await tx.query("INSERT INTO universe_memberships(universe_id,user_id,role) VALUES($1,$2,'besitzer')", [universeId, userId]);
      await tx.query("INSERT INTO campaigns(id,universe_id,owner_user_id,name,created_at) VALUES($1,$2,$3,$4,$5)", [id, universeId, userId, name, now()]);
      await tx.query(`INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton)
        VALUES($1,$2,'leitung',$3,$4)`, [id, userId, user.display_name, normalizeName(user.display_name).skeleton]);
      await tx.query("INSERT INTO reader_perspectives(campaign_id,user_id,actor_id,version,updated_at) VALUES($1,$2,NULL,1,$3)", [id,userId,now()]);
      return { id, universeId, name, version: 1, role: "leitung" as const };
    });
  }
  async function listCampaigns(userId: string) {
    return (await db.query<{ id: string; universeId: string; name: string; version: number; role: string }>(`SELECT c.id, c.universe_id AS "universeId", c.name,c.version,m.role
      FROM campaigns c JOIN campaign_memberships m ON m.campaign_id=c.id WHERE m.user_id=$1 ORDER BY c.created_at,c.id`, [userId])).rows;
  }
  async function roster(userId: string, campaignId: string) {
    await requireMember(userId, campaignId);
    return (await db.query(`SELECT user_id AS "userId",display_name AS "displayName",role,actor_id AS "actorId"
      FROM campaign_memberships WHERE campaign_id=$1 ORDER BY display_name,user_id`, [campaignId])).rows;
  }
  async function issueInvitation(userId: string, campaignId: string, ttlMs = 86400_000) {
    await requireMember(userId, campaignId, ["leitung"]);
    if (ttlMs < 60_000 || ttlMs > 7 * 86400_000) throw new Gone("invalid-ttl");
    const id = randomUUID(), code = secretToken(), expiresAt = now() + ttlMs;
    await db.query(`INSERT INTO invitations(id,campaign_id,code_hash,created_by,created_at,expires_at)
      VALUES($1,$2,$3,$4,$5,$6)`, [id, campaignId, tokenHash(code), userId, now(), expiresAt]);
    return { id, code, expiresAt };
  }
  async function revokeInvitation(userId: string, campaignId: string, id: string) {
    await requireMember(userId, campaignId, ["leitung"]);
    if (!(await db.query("UPDATE invitations SET revoked_at=$3 WHERE id=$1 AND campaign_id=$2 RETURNING id", [id, campaignId, now()])).rowCount) throw new Gone();
  }
  async function listInvitations(userId: string, campaignId: string) {
    await requireMember(userId,campaignId,["leitung"]);
    return (await db.query(`SELECT id,created_at AS "createdAt",expires_at AS "expiresAt",revoked_at AS "revokedAt"
      FROM invitations WHERE campaign_id=$1 ORDER BY created_at DESC,id`, [campaignId])).rows;
  }
  async function requestJoin(code: string, input: { displayName: string }) {
    return db.transaction(async (tx) => {
      const invite = (await tx.query<{ id: string; campaign_id: string }>(`SELECT i.id,i.campaign_id FROM invitations i JOIN campaigns c ON c.id=i.campaign_id
        WHERE i.code_hash=$1 AND i.revoked_at IS NULL AND i.expires_at>$2 FOR UPDATE OF c`, [tokenHash(code), now()])).rows[0];
      if (!invite) throw new Gone("invitation");
      const name = normalizeName(input.displayName);
      await tx.query("UPDATE join_requests SET status='expired' WHERE campaign_id=$1 AND status='pending' AND expires_at<=$2", [invite.campaign_id, now()]);
      const existing = await tx.query(`SELECT user_id FROM campaign_memberships WHERE campaign_id=$1 AND name_skeleton=$2
        UNION ALL SELECT user_id FROM join_requests WHERE campaign_id=$1 AND name_skeleton=$2 AND status='pending'`, [invite.campaign_id, name.skeleton]);
      if (existing.rowCount) throw new Conflict();
      const id = randomUUID(), userId = randomUUID(), pollToken = secretToken(), expiresAt = now() + 30 * 60_000;
      await tx.query("INSERT INTO users(id,display_name,created_at) VALUES($1,$2,$3)", [userId, name.displayName, now()]);
      await tx.query(`INSERT INTO join_requests(id,invitation_id,campaign_id,user_id,display_name,name_skeleton,status,poll_token_hash,created_at,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9)`, [id, invite.id, invite.campaign_id, userId, name.displayName, name.skeleton, tokenHash(pollToken), now(), expiresAt]);
      return { id, pollToken, expiresAt };
    });
  }
  async function joinStatus(id: string, pollToken: string) {
    const row = (await db.query<{ status: string }>(`SELECT j.status FROM join_requests j JOIN invitations i ON i.id=j.invitation_id
      WHERE j.id=$1 AND j.poll_token_hash=$2 AND j.expires_at>$3 AND i.revoked_at IS NULL AND i.expires_at>$3 AND j.claimed_at IS NULL`, [id, tokenHash(pollToken), now()])).rows[0];
    if (!row) throw new Gone("join");
    return row;
  }
  async function claimJoin(id: string, pollToken: string) {
    const row = (await db.query<{ userId: string; campaignId: string }>(`UPDATE join_requests j SET claimed_at=$3 FROM invitations i
      WHERE j.invitation_id=i.id AND j.id=$1 AND j.poll_token_hash=$2 AND j.status='approved' AND j.claimed_at IS NULL
      AND j.expires_at>$3 AND i.revoked_at IS NULL AND i.expires_at>$3 RETURNING j.user_id AS "userId", j.campaign_id AS "campaignId"`, [id, tokenHash(pollToken), now()])).rows[0];
    if (!row) throw new Gone("join");
    return row;
  }
  async function listPendingJoins(userId: string, campaignId: string) {
    await requireMember(userId, campaignId, ["leitung"]);
    return (await db.query(`SELECT j.id,j.display_name AS "displayName",j.created_at AS "createdAt" FROM join_requests j JOIN invitations i ON i.id=j.invitation_id
      WHERE j.campaign_id=$1 AND j.status='pending' AND j.expires_at>$2 AND i.revoked_at IS NULL AND i.expires_at>$2 ORDER BY j.created_at,j.id`, [campaignId, now()])).rows;
  }
  async function approveJoin(gmUserId: string, campaignId: string, requestId: string) {
    return db.transaction(async (tx) => {
      await createCampaigns(tx, cfg).requireMember(gmUserId, campaignId, ["leitung"]);
      await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE", [campaignId]);
      const join = (await tx.query<{ user_id: string; display_name: string; name_skeleton: string }>(`SELECT j.* FROM join_requests j JOIN invitations i ON i.id=j.invitation_id
        WHERE j.id=$1 AND j.campaign_id=$2 AND j.status='pending' AND j.expires_at>$3 AND i.revoked_at IS NULL AND i.expires_at>$3 FOR UPDATE OF j`, [requestId, campaignId, now()])).rows[0];
      if (!join) throw new Gone();
      const actorId = randomUUID();
      await tx.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [actorId, campaignId, join.user_id, join.display_name]);
      await tx.query(`INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id)
        VALUES($1,$2,'spieler',$3,$4,$5)`, [campaignId, join.user_id, join.display_name, join.name_skeleton, actorId]);
      await tx.query(`INSERT INTO actor_profiles(actor_id,campaign_id,kind,version,created_by,created_at)
        VALUES($1,$2,'player_character',1,$3,$4)`, [actorId,campaignId,gmUserId,now()]);
      await tx.query(`INSERT INTO actor_controllers(actor_id,campaign_id,user_id,permission,version,granted_by,granted_at)
        VALUES($1,$2,$3,'control',1,$4,$5)`, [actorId,campaignId,join.user_id,gmUserId,now()]);
      await tx.query("INSERT INTO reader_perspectives(campaign_id,user_id,actor_id,version,updated_at) VALUES($1,$2,$3,1,$4)", [campaignId,join.user_id,actorId,now()]);
      await tx.query("UPDATE join_requests SET status='approved',approved_at=$2 WHERE id=$1", [requestId, now()]);
      return { userId: join.user_id, actorId };
    });
  }
  return { requireMember, createCampaign, listCampaigns, roster, issueInvitation, revokeInvitation, listInvitations,
    requestJoin, joinStatus, claimJoin, listPendingJoins, approveJoin };
}
