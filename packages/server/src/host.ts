/** Explicit operating boundary. Importing this module never reads checkout settings,
 * starts a listener, registers process handlers, or opens a database. */
import { buildApp } from "./app.ts";
import { createPgDb, migrate, type Db } from "./db/index.ts";
import { createIdentity } from "./identity/index.ts";
import { inspectCampaignRestore, restoreCampaignBundle, enrollRestoredCampaignGm } from "./domain/bundles.ts";
import { parseCurrentCampaignBundle, CAMPAIGN_BUNDLE_V5_LIMITS } from "@chronicle/io";
import sharp from "sharp";

export { createPgDb } from "./db/index.ts";
export interface EmbeddedHostConfig {
  databaseUrl: string;
  origin: string;
  cookieSecret: string;
  staticRoot: string;
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
    app = await buildApp(db, { ...identityConfig, bootstrapToken: "", staticRoot: config.staticRoot, publicDeliveryEnabled: false });
    await app.listen({ host: "127.0.0.1", port });
  } catch (error) {
    await app?.close();
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
    close() {
      // A failed drain must not close the pool beneath active work.
      // Keep commands closed after failure, but permit an explicit shutdown retry.
      draining = true;
      closing ??= app!.close().then(() => db.close()).catch(error => { closing = undefined; throw error; });
      return closing;
    },
  };
}
