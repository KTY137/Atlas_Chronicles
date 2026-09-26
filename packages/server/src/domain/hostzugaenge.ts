// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Die Zugangsverwaltung des Hostfensters.
 *
 * **Warum das nicht über HTTP geht.** Jeder Weg in der Anwendung verlangt eine gültige
 * Sitzung. Genau die fehlt in dem Moment, in dem man sie am dringendsten braucht: eine
 * gewöhnliche Sitzung hält acht Stunden, und wer weder einen Passkey eingerichtet noch den
 * Browser gemerkt hat, steht danach vor der Anmeldeseite ohne Weg zurück — auch die
 * Spielleitung, die diesen Server selbst eingerichtet hat. Am 10.09.2026 ist genau das
 * passiert.
 *
 * Das Hostfenster ist die einzige Stelle, die das auflösen darf und kann: es läuft auf dem
 * Rechner, dem die Welt gehört, hinter Electrons Fähigkeitsprüfung, und es besitzt die
 * Profilgeheimnisse ohnehin. Wer das Fenster offen hat, hat den Ordner — eine zusätzliche
 * Anmeldung davor wäre ein Schloss an einer Tür, die schon offen steht.
 *
 * **Was hier trotzdem nicht passiert.** Es wird keine Sitzung ausgestellt und kein Zugang
 * übernommen. Der Kopplungscode ist zehn Minuten gültig, einmal einlösbar und muss im Browser
 * eingegeben werden; erst dort entsteht ein Zugang. Und keine Rollenänderung darf eine Runde
 * ohne Spielleitung zurücklassen.
 */
import { randomUUID } from "node:crypto";
import type { Db } from "../db/index.ts";
import { createIdentity, secretToken, tokenHash, type IdentityConfig } from "../identity/index.ts";
import { createCampaigns, DEFAULT_CAMPAIGN_RULES, type DomainConfig } from "./campaigns.ts";
import { Gone } from "./errors.ts";

export class HostZugangError extends Error {
  override readonly name = "HostZugangError";
}
function fail(message: string): never { throw new HostZugangError(message); }
const UUID = /^[0-9a-f-]{36}$/;
function kennung(wert: string, was: string): string {
  if (typeof wert !== "string" || !UUID.test(wert)) fail(`${was} ist keine gültige Kennung.`);
  return wert;
}

export interface HostMitglied {
  readonly userId: string;
  readonly displayName: string;
  readonly role: string;
  /** Ob dieser Mensch überhaupt noch hereinkommt: ein gültiger, nicht widerrufener Zugang. */
  readonly hasAccess: boolean;
  /** Ob er auf diesem Server eigene Runden anlegen darf. */
  readonly platformLeitung: boolean;
}
/** Jemand, der vor der Tür wartet: eine offene, nicht abgelaufene Anfrage über eine gültige Einladung. */
export interface HostWartend {
  readonly requestId: string;
  readonly displayName: string;
  readonly createdAt: number;
  readonly expiresAt: number;
}
export interface HostRunde {
  readonly campaignId: string;
  readonly name: string;
  readonly members: readonly HostMitglied[];
  readonly wartend: readonly HostWartend[];
}

/**
 * Runden und Mitglieder, wie das Hostfenster sie zur Auswahl braucht.
 *
 * `hasAccess` ist die Spalte, auf die es ankommt: sie sagt, wer gerade ausgesperrt ist.
 */
export async function hostRunden(db: Db, jetzt = Date.now()): Promise<readonly HostRunde[]> {
  const rows = await db.query<{ campaignId: string; name: string; userId: string; displayName: string; role: string; platformRole: string; zugaenge: string }>(
    `SELECT c.id AS "campaignId", c.name, m.user_id AS "userId", m.display_name AS "displayName", m.role,
            u.platform_role AS "platformRole",
            (SELECT count(*) FROM credentials cr WHERE cr.user_id=m.user_id AND cr.revoked_at IS NULL AND cr.expires_at>$1) AS "zugaenge"
       FROM campaigns c
       JOIN campaign_memberships m ON m.campaign_id=c.id
       JOIN users u ON u.id=m.user_id
      ORDER BY c.created_at, c.id, m.role DESC, m.display_name, m.user_id`, [jetzt]);
  const runden = new Map<string, { campaignId: string; name: string; members: HostMitglied[]; wartend: HostWartend[] }>();
  for (const row of rows.rows) {
    const runde = runden.get(row.campaignId) ?? { campaignId: row.campaignId, name: row.name, members: [], wartend: [] };
    runde.members.push({ userId: row.userId, displayName: row.displayName, role: row.role,
      hasAccess: Number(row.zugaenge) > 0, platformLeitung: row.platformRole === "leitung" });
    runden.set(row.campaignId, runde);
  }
  // Dieselbe Bedingung wie `listPendingJoins`: nur was eine Spielleitung im Spiel auch sähe.
  const wartende = await db.query<{ campaignId: string; requestId: string; displayName: string; createdAt: string; expiresAt: string }>(
    `SELECT j.campaign_id AS "campaignId", j.id AS "requestId", j.display_name AS "displayName", j.created_at AS "createdAt", j.expires_at AS "expiresAt"
       FROM join_requests j JOIN invitations i ON i.id=j.invitation_id
      WHERE j.status='pending' AND j.expires_at>$1 AND i.revoked_at IS NULL AND i.expires_at>$1
      ORDER BY j.created_at, j.id`, [jetzt]);
  for (const row of wartende.rows) runden.get(row.campaignId)?.wartend.push({ requestId: row.requestId, displayName: row.displayName,
    createdAt: Number(row.createdAt), expiresAt: Number(row.expiresAt) });
  return [...runden.values()];
}

async function spielleitungDerRunde(db: Db, campaignId: string): Promise<string> {
  const leitung = await db.query<{ userId: string }>(
    `SELECT user_id AS "userId" FROM campaign_memberships WHERE campaign_id=$1 AND role='leitung' ORDER BY display_name, user_id LIMIT 1`, [campaignId]);
  return leitung.rows[0]?.userId ?? fail("Diese Runde hat keine Spielleitung, die einen Beitritt freigeben könnte.");
}

/**
 * Eine Runde aus dem Hostfenster anlegen — für die Spielleitung der Welt.
 *
 * Über `createCampaign`, also mit denselben Tabellen und Regeln wie im Spiel. Besitzerin wird die
 * zuerst eingerichtete Spielleitung der Welt; ohne sie gibt es niemanden, der die Runde führen könnte.
 */
export async function hostRundeAnlegen(db: Db, name: string, cfg: DomainConfig = {}) {
  const titel = typeof name === "string" ? name.trim() : "";
  if (!titel || titel.length > 160) fail("Die Runde braucht einen Namen mit höchstens 160 Zeichen.");
  const owner = (await db.query<{ id: string }>(`SELECT id FROM users WHERE platform_role='leitung' ORDER BY created_at, id LIMIT 1`)).rows[0]?.id;
  if (!owner) fail("Diese Welt hat noch keine Spielleitung. Richte sie zuerst ein.");
  return createCampaigns(db, cfg).createCampaign(owner, { name: titel }, { rules: DEFAULT_CAMPAIGN_RULES });
}

/** Einen Beitritt freigeben oder ablehnen — als Spielleitung der Runde, über die Funktionen des Spiels. */
async function entscheide(db: Db, campaignId: string, requestId: string, cfg: DomainConfig, freigeben: boolean) {
  kennung(campaignId, "Die Runde"); kennung(requestId, "Die Anfrage");
  const leitung = await spielleitungDerRunde(db, campaignId), campaigns = createCampaigns(db, cfg);
  try {
    return freigeben ? await campaigns.approveJoin(leitung, campaignId, requestId) : await campaigns.rejectJoin(leitung, campaignId, requestId);
  } catch (error) {
    if (error instanceof Gone) fail("Diese Anfrage wartet nicht mehr — sie ist schon entschieden oder abgelaufen.");
    throw error;
  }
}
export function hostFreigeben(db: Db, campaignId: string, requestId: string, cfg: DomainConfig = {}) { return entscheide(db, campaignId, requestId, cfg, true); }
export function hostAblehnen(db: Db, campaignId: string, requestId: string, cfg: DomainConfig = {}) { return entscheide(db, campaignId, requestId, cfg, false); }

/**
 * Ein Einladungscode für eine Runde, erzeugt ohne angemeldete Spielleitung.
 *
 * `created_by` braucht trotzdem einen Menschen — die Einladung gehört jemandem. Genommen wird
 * eine Spielleitung dieser Runde; gibt es keine, wird nichts erzeugt, denn dann könnte
 * ohnehin niemand den Beitritt freigeben.
 */
export async function hostEinladung(db: Db, campaignId: string, ttlMs = 7 * 86400_000, jetzt = Date.now()) {
  kennung(campaignId, "Die Runde");
  if (!Number.isFinite(ttlMs) || ttlMs < 60_000 || ttlMs > 7 * 86400_000) fail("Die Gültigkeit muss zwischen einer Minute und sieben Tagen liegen.");
  return db.transaction(async tx => {
    const leitung = await tx.query<{ userId: string }>(
      `SELECT user_id AS "userId" FROM campaign_memberships WHERE campaign_id=$1 AND role='leitung' ORDER BY display_name, user_id LIMIT 1`, [campaignId]);
    const owner = leitung.rows[0]?.userId;
    if (!owner) fail("Diese Runde hat keine Spielleitung, die einen Beitritt freigeben könnte.");
    // Genau derselbe Code- und Hashweg wie `issueInvitation`: ein hier anders erzeugter Code
    // wäre beim Einlösen wertlos, und das fiele erst dem Eingeladenen auf.
    const id = randomUUID(), code = secretToken();
    await tx.query(`INSERT INTO invitations(id,campaign_id,code_hash,created_by,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6)`,
      [id, campaignId, tokenHash(code), owner, jetzt, jetzt + ttlMs]);
    return { id, code, expiresAt: jetzt + ttlMs };
  });
}

/**
 * Ein Kopplungscode für ein vorhandenes Mitglied — der Weg zurück, wenn niemand mehr hereinkommt.
 *
 * Bewusst über dieselbe Tabelle und dieselbe Frist wie der Code, den eine Spielleitung im
 * Betrieb ausstellt: eingelöst wird er im Browser unter „Neues Gerät verbinden". Es entsteht
 * hier kein Zugang, nur die Möglichkeit, sich einen zu holen.
 */
export async function hostKopplung(db: Db, campaignId: string, userId: string, config: IdentityConfig) {
  kennung(campaignId, "Die Runde"); kennung(userId, "Das Mitglied");
  return db.transaction(async tx => {
    const mitglied = await tx.query(`SELECT 1 FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2`, [campaignId, userId]);
    if (!mitglied.rowCount) fail("Dieses Mitglied gehört nicht zu dieser Runde.");
    // `mintPairing` verlangt eine Spielleitung als Ausstellerin. Das Hostfenster IST hier die
    // Autorität, also stellt die Spielleitung der Runde formal aus — dieselbe Zeile, die auch
    // im Betrieb entsteht, damit Einlösung und Protokoll unverändert bleiben.
    const leitung = await tx.query<{ userId: string }>(
      `SELECT user_id AS "userId" FROM campaign_memberships WHERE campaign_id=$1 AND role='leitung' ORDER BY display_name, user_id LIMIT 1`, [campaignId]);
    const aussteller = leitung.rows[0]?.userId ?? userId;
    return createIdentity(tx, config).mintPairing(aussteller, campaignId, userId);
  });
}

/**
 * Wer in einer Runde die Spielleitung ist.
 *
 * Zwei Zusicherungen, beide unverhandelbar: eine Runde bleibt nie ohne Spielleitung, und eine
 * Rollenänderung in einer Runde ändert **nicht**, wer auf diesem Server eigene Runden anlegen
 * darf. Das sind zwei verschiedene Fragen, und sie zu vermischen wäre eine stille
 * Rechteerweiterung.
 */
export async function hostRolle(db: Db, campaignId: string, userId: string, role: "leitung" | "spieler") {
  kennung(campaignId, "Die Runde"); kennung(userId, "Das Mitglied");
  if (role !== "leitung" && role !== "spieler") fail("Es gibt nur Spielleitung oder Spieler.");
  return db.transaction(async tx => {
    await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE", [campaignId]);
    const vorher = await tx.query<{ role: string }>(`SELECT role FROM campaign_memberships WHERE campaign_id=$1 AND user_id=$2`, [campaignId, userId]);
    const alt = vorher.rows[0]?.role;
    if (!alt) fail("Dieses Mitglied gehört nicht zu dieser Runde.");
    if (alt === role) return { campaignId, userId, role, changed: false };
    if (alt === "leitung") {
      const weitere = await tx.query(`SELECT 1 FROM campaign_memberships WHERE campaign_id=$1 AND role='leitung' AND user_id<>$2 LIMIT 1`, [campaignId, userId]);
      if (!weitere.rowCount) fail("Das ist die einzige Spielleitung dieser Runde. Mach zuerst jemand anderen zur Spielleitung.");
    }
    await tx.query(`UPDATE campaign_memberships SET role=$3 WHERE campaign_id=$1 AND user_id=$2`, [campaignId, userId, role]);
    return { campaignId, userId, role, changed: true };
  });
}
