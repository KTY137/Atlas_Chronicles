// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
  type RegistrationResponseJSON, type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import type { Db } from "../db/index.ts";
import { Gone } from "../domain/errors.ts";
import { normalizeName } from "../domain/names.ts";
import { sessionCookieSecure } from "../network.ts";

export const tokenHash = (value: string): string => createHash("sha256").update(value).digest("hex");
export const secretToken = (): string => randomBytes(32).toString("base64url");
export interface AuthContext { userId: string; credentialId: string; displayName: string; platformRole: "gast" | "leitung" }
export interface IdentityConfig { origin: string; cookieSecret: string; allowInsecureLan?: boolean; now?: () => number }

export function reachability(origin: string, allowInsecureLan = false) {
  const url = new URL(origin), host = url.hostname.replace(/^\[|\]$/g, "");
  const localhost = host === "localhost" || host.endsWith(".localhost");
  const secure = url.protocol === "https:" || (url.protocol === "http:" && localhost);
  return { origin: url.origin, passkeyEligible: secure && !isIP(host) && (localhost || host.includes(".")),
    secureContext: secure, selfHostTransport: sessionCookieSecure(origin, allowInsecureLan) ? "explicit-https-or-localhost" : "explicit-private-lan" };
}

export function createIdentity(db: Db, cfg: IdentityConfig) {
  const now = cfg.now ?? Date.now;
  const origin = new URL(cfg.origin).origin;
  const secureCookie = sessionCookieSecure(cfg.origin, cfg.allowInsecureLan);
  if (cfg.cookieSecret.length < 32) throw new Error("Cookie secret must contain at least 32 characters");
  const rpID = new URL(origin).hostname;
  const signed = (body: string) => createHmac("sha256", cfg.cookieSecret).update(body).digest("base64url");
  const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
  const cookie = (value: string, seconds: number) => `chronicle_session=${value}; Path=/; HttpOnly;${secureCookie ? " Secure;" : ""} SameSite=Strict; Max-Age=${seconds}`;

  async function issueSession(userId: string, kind: "guest" | "cookie" = "guest", parentId?: string) {
    const credentialId = randomUUID(), secret = secretToken();
    const seconds = kind === "guest" ? 8 * 3600 : 30 * 86400, expiresAt = now() + seconds * 1000;
    await db.query(`INSERT INTO credentials(id,user_id,kind,token_hash,label,created_at,expires_at,parent_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [credentialId, userId, kind, tokenHash(secret),
      kind === "guest" ? "Gastabend" : "Dieser Browser", now(), expiresAt, parentId ?? null]);
    const body = `${credentialId}.${secret}`, value = `${body}.${signed(body)}`;
    return { credentialId, expiresAt, value, setCookie: cookie(value, seconds) };
  }

  /**
   * Der Zugangsvorfall — `CHAMPION.md:372-376`: „the server logs an event whenever a device
   * presents no/expired credential against a character holding an open Vollmacht."
   *
   * Er läuft, BEVOR die 404 fällt (design/08 §3), und er hält drei Bedingungen ein:
   *
   *  - **Nur für ein echtes, totes Credential.** Der MAC ist an dieser Stelle bereits geprüft,
   *    das Cookie stammt also von uns; zusätzlich muss die Id existieren UND ihr Geheimnis
   *    stimmen. Ohne diese zweite Prüfung wäre jede geratene Id ein Schreibzugriff, und das
   *    Beweismittel selbst würde zum Aufklärungswerkzeug.
   *  - **Höchstens ein Vorfall je Tür und Nutzer.** Ein Gerät mit totem Credential fragt in
   *    Schleife; Gate W1 braucht „hatte einen offenen Vorfall", nicht deren Anzahl. Die
   *    Eindeutigkeitsindizes aus Migration 018 verwerfen die Wiederholung.
   *  - **Ein Fehler hier darf die 404 nicht verfärben.** Jede Verweigerung sieht gleich aus;
   *    würde ein gescheiterter Schreibvorgang daraus eine 500 machen, wäre genau das ein
   *    Orakel. Deshalb wird geschluckt — die Alternative wäre, die Invariante zu brechen,
   *    die dieses Protokoll schützen soll.
   */
  async function protokolliereZugangsvorfall(credentialId: string, hash: string): Promise<void> {
    try {
      const owner = (await db.query<{ user_id: string }>(
        "SELECT user_id FROM credentials WHERE id=$1 AND token_hash=$2", [credentialId, hash])).rows[0];
      if (!owner) return;
      const jetzt = now();
      // Die echten Türen von heute: `action_vollmachten` (domain/gameplay.ts:394).
      await db.query(`INSERT INTO zugangsvorfaelle(campaign_id,user_id,aktions_vollmacht_id,created_at)
        SELECT v.campaign_id,$1,v.id,$2 FROM action_vollmachten v
        JOIN actors a ON a.id=v.actor_id AND a.campaign_id=v.campaign_id
        WHERE a.user_id=$1 AND v.status='offen' AND v.revoked_at IS NULL AND v.expires_at>$2
        ON CONFLICT DO NOTHING`, [owner.user_id, jetzt]);
      // Und die Dokumenttür aus 001, damit der Pfad vollständig ist, falls sie je wieder trägt.
      await db.query(`INSERT INTO zugangsvorfaelle(campaign_id,user_id,dokument_vollmacht_id,created_at)
        SELECT v.campaign_id,$1,v.id,$2 FROM vollmachten v
        JOIN actors a ON a.id=v.actor_id AND a.campaign_id=v.campaign_id
        WHERE a.user_id=$1 AND v.status='offen' AND v.expires_at>$2
        ON CONFLICT DO NOTHING`, [owner.user_id, jetzt]);
    } catch { /* siehe oben: die 404 bleibt eine 404 */ }
  }

  async function authenticate(header: string | undefined): Promise<AuthContext> {
    const value = header?.split(";").map((s) => s.trim()).find((s) => s.startsWith("chronicle_session="))?.slice(18);
    if (!value || value.length > 512) throw new Gone("credential-missing");
    const parts = value.split(".");
    if (parts.length !== 3) throw new Gone("credential-malformed");
    const [id, secret, mac] = parts as [string, string, string];
    if (!/^[A-Za-z0-9_-]+$/.test(mac) || !same(mac, signed(`${id}.${secret}`))) throw new Gone("credential-mac");
    const result = await db.query<{ userId: string; credentialId: string; displayName: string; platformRole: "gast" | "leitung" }>(`
      SELECT c.user_id AS "userId", c.id AS "credentialId", u.display_name AS "displayName", u.platform_role AS "platformRole"
      FROM credentials c JOIN users u ON u.id=c.user_id LEFT JOIN credentials p ON p.id=c.parent_id
      WHERE c.id=$1 AND c.token_hash=$2 AND c.kind IN ('guest','cookie') AND c.revoked_at IS NULL AND c.expires_at>$3
      AND (c.parent_id IS NULL OR (p.revoked_at IS NULL AND p.expires_at>$3))`, [id, tokenHash(secret), now()]);
    const context = result.rows[0];
    if (!context) { await protokolliereZugangsvorfall(id, tokenHash(secret)); throw new Gone("credential-unavailable"); }
    await db.query("UPDATE credentials SET last_used_at=$2 WHERE id=$1", [id, now()]);
    return context;
  }

  async function bootstrap(displayName: string) {
    const display = normalizeName(displayName).displayName;
    return db.transaction(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock(7342620)");
      if ((await tx.query("SELECT id FROM users WHERE platform_role='leitung'")).rowCount) throw new Gone("already-configured");
      const userId = randomUUID();
      await tx.query("INSERT INTO users(id,display_name,created_at,platform_role) VALUES($1,$2,$3,'leitung')", [userId, display, now()]);
      return { userId, ...await createIdentity(tx, cfg).issueSession(userId, "cookie") };
    });
  }

  async function revoke(userId: string, credentialId: string) {
    if (!(await db.query("UPDATE credentials SET revoked_at=$3 WHERE id=$1 AND user_id=$2 RETURNING id", [credentialId, userId, now()])).rowCount)
      throw new Gone("credential-not-owned");
  }
  async function credentials(userId: string) {
    return (await db.query(`SELECT id, kind, label, created_at AS "createdAt", last_used_at AS "lastUsedAt",
      expires_at AS "expiresAt" FROM credentials WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>$2 ORDER BY created_at,id`, [userId, now()])).rows;
  }

  async function challenge(purpose: string, value: string, userId: string | null) {
    const id = randomUUID();
    await db.query("INSERT INTO auth_challenges(id,user_id,purpose,challenge,expires_at) VALUES($1,$2,$3,$4,$5)", [id, userId, purpose, value, now() + 120_000]);
    return id;
  }
  async function consume(id: string, purpose: string, userId: string | null) {
    const result = await db.query<{ challenge: string }>(`UPDATE auth_challenges SET consumed_at=$4
      WHERE id=$1 AND purpose=$2 AND user_id IS NOT DISTINCT FROM $3 AND consumed_at IS NULL AND expires_at>$4 RETURNING challenge`, [id, purpose, userId, now()]);
    if (!result.rows[0]) throw new Gone("challenge-unavailable");
    return result.rows[0].challenge;
  }
  async function beginRegistration(userId: string) {
    if (!reachability(origin).passkeyEligible) throw new Gone("passkey-topology");
    const user = (await db.query<{ display_name: string }>("SELECT display_name FROM users WHERE id=$1", [userId])).rows[0];
    if (!user) throw new Gone();
    const existing = await db.query<{ id: string }>("SELECT id FROM credentials WHERE user_id=$1 AND kind='passkey' AND revoked_at IS NULL", [userId]);
    const options = await generateRegistrationOptions({ rpName: "Atlas Chronicles", rpID, userName: user.display_name,
      userID: new TextEncoder().encode(userId), attestationType: "none",
      authenticatorSelection: { residentKey: "required", userVerification: "required" }, excludeCredentials: existing.rows });
    return { challengeId: await challenge("register", options.challenge, userId), options };
  }
  async function finishRegistration(userId: string, challengeId: string, response: RegistrationResponseJSON, label: string) {
    const expectedChallenge = await consume(challengeId, "register", userId);
    try {
      const result = await verifyRegistrationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
      if (!result.verified) throw new Gone();
      const { credential } = result.registrationInfo;
      await db.query(`INSERT INTO credentials(id,user_id,kind,label,created_at,expires_at,public_key,counter)
        VALUES($1,$2,'passkey',$3,$4,$5,$6,$7)`, [credential.id, userId, label.slice(0,80), now(), now() + 10 * 365 * 86400_000,
        { key: Buffer.from(credential.publicKey).toString("base64url"), transports: credential.transports ?? [] }, credential.counter]);
      return { id: credential.id };
    } catch { throw new Gone("registration-failed"); }
  }
  async function beginAuthentication() {
    if (!reachability(origin).passkeyEligible) throw new Gone("passkey-topology");
    const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
    return { challengeId: await challenge("authenticate", options.challenge, null), options };
  }
  async function finishAuthentication(challengeId: string, response: AuthenticationResponseJSON) {
    const expectedChallenge = await consume(challengeId, "authenticate", null);
    return db.transaction(async (tx) => {
      const cred = (await tx.query<{ id: string; user_id: string; public_key: { key: string }; counter: number }>(
        "SELECT * FROM credentials WHERE id=$1 AND kind='passkey' AND revoked_at IS NULL AND expires_at>$2 FOR UPDATE", [response.id, now()])).rows[0];
      if (!cred) throw new Gone();
      try {
        const result = await verifyAuthenticationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID,
          requireUserVerification: true, credential: { id: cred.id, publicKey: new Uint8Array(Buffer.from(cred.public_key.key, "base64url")), counter: Number(cred.counter) } });
        if (!result.verified) throw new Gone();
        await tx.query("UPDATE credentials SET counter=$2,last_used_at=$3 WHERE id=$1", [cred.id, result.authenticationInfo.newCounter, now()]);
      } catch { throw new Gone("authentication-failed"); }
      return createIdentity(tx, cfg).issueSession(cred.user_id, "guest", cred.id);
    });
  }
  async function mintPairing(gmUserId: string, campaignId: string, userId: string) {
    const code = secretToken(), id = randomUUID();
    await db.transaction(async (tx) => {
      const membership = await tx.query(`SELECT 1 FROM campaign_memberships gm JOIN campaign_memberships target
        ON target.campaign_id=gm.campaign_id WHERE gm.campaign_id=$1 AND gm.user_id=$2 AND gm.role='leitung' AND target.user_id=$3`, [campaignId, gmUserId, userId]);
      if (!membership.rowCount) throw new Gone();
      await tx.query(`INSERT INTO pairing_codes(id,code_hash,campaign_id,user_id,minted_by,expires_at)
        VALUES($1,$2,$3,$4,$5,$6)`, [id, tokenHash(code), campaignId, userId, gmUserId, now() + 600_000]);
    });
    return { id, code, expiresAt: now() + 600_000 };
  }
  async function redeemPairing(code: string) {
    return db.transaction(async (tx) => {
      const row = (await tx.query<{ user_id: string }>(`UPDATE pairing_codes SET used_at=$2 WHERE code_hash=$1
        AND used_at IS NULL AND revoked_at IS NULL AND expires_at>$2 RETURNING user_id`, [tokenHash(code), now()])).rows[0];
      if (!row) throw new Gone();
      return createIdentity(tx, cfg).issueSession(row.user_id, "guest");
    });
  }
  return { bootstrap, issueSession, authenticate, revoke, credentials, beginRegistration, finishRegistration,
    beginAuthentication, finishAuthentication, mintPairing, redeemPairing, clearCookie: () => cookie("", 0) };
}
