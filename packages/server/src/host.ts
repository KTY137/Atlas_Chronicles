// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/** Explicit operating boundary. Importing this module never reads checkout settings,
 * starts a listener, registers process handlers, or opens a database. */
import { buildApp, drainAppChronist } from "./app.ts";
import { createPgDb, migrate, type Db } from "./db/index.ts";
import { createIdentity } from "./identity/index.ts";
import { inspectCampaignRestore, restoreCampaignBundle, enrollRestoredCampaignGm } from "./domain/bundles.ts";
import { hostAblehnen, hostEinladung, hostFreigeben, hostKopplung, hostRolle, hostRundeAnlegen, hostRunden } from "./domain/hostzugaenge.ts";
import { parseCurrentCampaignBundle, CAMPAIGN_BUNDLE_V5_LIMITS } from "@chronicle/io";
import sharp from "sharp";
import type { ChronistRuntimeConfig } from "./domain/chronist/runtime.ts";
export { loadChronistRuntime, CHRONIST_UNCONFIGURED_MODEL, CHRONIST_ANTHROPIC_PROFILE, CHRONIST_ANTHROPIC_BASE_URL,
  CHRONIST_ANTHROPIC_KEY_ENV, CHRONIST_ANTHROPIC_MODELS, CHRONIST_ANTHROPIC_PRICING } from "./chronist-providers/registry.ts";

export { createPgDb } from "./db/index.ts";
export interface EmbeddedHostConfig {
  databaseUrl: string;
  origin: string;
  cookieSecret: string;
  staticRoot: string;
  chronist?: ChronistRuntimeConfig;
}

export function validateEmbeddedHostConfig(config: EmbeddedHostConfig): number {
  const origin = new URL(config.origin), database = new URL(config.databaseUrl);
  if (origin.origin !== config.origin || origin.protocol !== "http:" || origin.hostname !== "localhost" || !origin.port ||
      origin.username || origin.password || Number(origin.port) < 1024 || Number(origin.port) === 3000)
    throw new Error("Embedded host requires an explicit isolated localhost origin.");
  if (database.protocol !== "postgresql:" || database.hostname !== "127.0.0.1" || !database.port ||
      Number(database.port) < 1024 || Number(database.port) === 54329 || database.search || database.hash)
    throw new Error("Embedded host requires an explicit isolated loopback PostgreSQL target.");
  if (config.cookieSecret.length < 32 || !config.staticRoot) throw new Error("Missing embedded host settings.");
  return Number(origin.port);
}

/** A test may supply an already isolated SQL adapter; production always uses PG. */
export async function startEmbeddedHost(config: EmbeddedHostConfig, suppliedDb?: Db) {
  const port = validateEmbeddedHostConfig(config), db = suppliedDb ?? createPgDb(config.databaseUrl);
  const identityConfig = { origin: config.origin, cookieSecret: config.cookieSecret };
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;
  try {
    await migrate(db);
    // Exercise the actual native decoder in the worker before declaring it ready.
    const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: "#294c60" } }).png().toBuffer();
    const decoder = await sharp(png).metadata();
    if (decoder.width !== 2 || decoder.format !== "png") throw new Error("Native decoder self-check failed.");
    app = await buildApp(db, { ...identityConfig, bootstrapToken: "", staticRoot: config.staticRoot, publicDeliveryEnabled: false,
      ...(config.chronist ? { chronist: config.chronist } : {}) });
    await app.listen({ host: "127.0.0.1", port });
  } catch (error) {
    if (app) { await drainAppChronist(app); await app.close(); }
    else await config.chronist?.close?.();
    await db.close();
    throw error;
  }
  let closing: Promise<void> | undefined, draining = false;
  const open = () => { if (draining) throw new Error("Host is draining."); };
  return {
    origin: config.origin,
    nodeVersion: process.versions.node,
    decoder: sharp.versions.sharp,
    async setup(displayName: string) {
      open();
      // Restored credential-free identities must never accidentally trigger bootstrap.
      return db.transaction(async tx => {
        await tx.query("SELECT pg_advisory_xact_lock(7342620)");
        if ((await tx.query("SELECT id FROM users LIMIT 1")).rowCount) throw new Error("Only an empty new world can be set up.");
        return createIdentity(tx, identityConfig).bootstrap(displayName);
      });
    },
    async state() {
      open();
      return { setupRequired: !(await db.query("SELECT id FROM users LIMIT 1")).rowCount };
    },
    async inspectRestore(text: string) {
      open();
      if (Buffer.byteLength(text) > CAMPAIGN_BUNDLE_V5_LIMITS.bytes) throw new Error("Campaign is too large.");
      const bundle = parseCurrentCampaignBundle(text);
      const report = await inspectCampaignRestore(db, bundle);
      const gmIds = bundle.tables.campaign_memberships.filter(row => row["role"] === "leitung").map(row => String(row["user_id"]));
      return { report, gms: bundle.tables.users.filter(row => gmIds.includes(String(row["id"]))).map(row => ({ id: String(row["id"]), name: String(row["display_name"]) })) };
    },
    async restore(text: string) {
      open();
      if (Buffer.byteLength(text) > CAMPAIGN_BUNDLE_V5_LIMITS.bytes) throw new Error("Campaign is too large.");
      return restoreCampaignBundle(db, parseCurrentCampaignBundle(text));
    },
    async enroll(campaignId: string, userId: string) { open(); return enrollRestoredCampaignGm(db, campaignId, userId, identityConfig); },
    /**
     * Die Zugangsverwaltung des Hostfensters. Sie stellt keine Sitzung aus und uebernimmt
     * keinen Zugang — sie erzeugt Codes, die im Browser eingeloest werden muessen, und aendert
     * Rollen innerhalb einer Runde. Begruendung und Grenzen: `domain/hostzugaenge.ts`.
     */
    async runden() { open(); return hostRunden(db); },
    async einladung(campaignId: string, ttlMs?: number) { open(); return hostEinladung(db, campaignId, ttlMs); },
    async kopplung(campaignId: string, userId: string) { open(); return hostKopplung(db, campaignId, userId, identityConfig); },
    async rolle(campaignId: string, userId: string, role: "leitung" | "spieler") { open(); return hostRolle(db, campaignId, userId, role); },
    async rundeAnlegen(name: string) { open(); return hostRundeAnlegen(db, name); },
    async freigeben(campaignId: string, requestId: string) { open(); return hostFreigeben(db, campaignId, requestId); },
    async ablehnen(campaignId: string, requestId: string) { open(); return hostAblehnen(db, campaignId, requestId); },
    close() {
      // A failed drain must not close the pool beneath active work.
      // Keep commands closed after failure, but permit an explicit shutdown retry.
      draining = true;
      closing ??= drainAppChronist(app!).then(() => app!.close()).then(() => db.close()).catch(error => { closing = undefined; throw error; });
      return closing;
    },
  };
}
