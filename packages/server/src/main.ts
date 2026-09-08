// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { buildApp, drainAppChronist } from "./app.ts";
import { createPgDb, migrate } from "./db/index.ts";
import { loadChronistRuntime } from "./chronist-providers/registry.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const local = resolve(root, ".local");
const settingsFile = resolve(local, "config.json");
interface LocalSettings { databaseUrl: string; cookieSecret: string; bootstrapToken: string }
let settings: LocalSettings;
if (process.env["NODE_ENV"] === "production") {
  const databaseUrl = process.env["DATABASE_URL"], cookieSecret = process.env["COOKIE_SECRET"], bootstrapToken = process.env["BOOTSTRAP_TOKEN"];
  if (!databaseUrl || !cookieSecret || !bootstrapToken) throw new Error("DATABASE_URL, COOKIE_SECRET and BOOTSTRAP_TOKEN are required");
  settings = { databaseUrl, cookieSecret, bootstrapToken };
} else {
  await mkdir(local, { recursive: true });
  try { settings = JSON.parse(await readFile(settingsFile, "utf8")) as LocalSettings; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const password = randomBytes(32).toString("hex");
    settings = { databaseUrl: `postgresql://chronicle:${password}@localhost:54329/chronicle`, cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex") };
    await writeFile(settingsFile, JSON.stringify(settings, null, 2), { flag: "wx", mode: 0o600 });
    await writeFile(resolve(local, "postgres.env"), `POSTGRES_USER=chronicle\nPOSTGRES_DB=chronicle\nPOSTGRES_PASSWORD=${password}\n`, { flag: "wx", mode: 0o600 });
  }
}
if (process.argv.includes("--configure")) {
  console.log("Local configuration prepared in .local/config.json and .local/postgres.env");
} else {
  const port = Number(process.env["PORT"] ?? 3000), origin = process.env["CHRONICLE_ORIGIN"] ?? `http://localhost:${port}`;
  const chronist = await loadChronistRuntime({ allowCli: process.env["CHRONICLE_CHRONIST_ALLOW_CLI"] === "1",
    ...(process.env["CHRONICLE_CHRONIST_CONFIG"] ? { configPath: process.env["CHRONICLE_CHRONIST_CONFIG"] } : {}) });
  let db: ReturnType<typeof createPgDb> | undefined;
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;
  try {
    db = createPgDb(process.env["DATABASE_URL"] ?? settings.databaseUrl);
    await migrate(db);
    const staticRoot = resolve(root, "packages/client/dist");
    const hasClient = await access(resolve(staticRoot, "index.html")).then(() => true, () => false);
    app = await buildApp(db, { ...settings, origin, chronist, logger: true, publicDeliveryEnabled: process.env["CHRONICLE_PUBLIC_DELIVERY"] === "1", ...(hasClient ? { staticRoot } : {}) });
    await app.listen({ host: process.env["HOST"] ?? "127.0.0.1", port });
  } catch (error) {
    // The runtime may own activated native helpers before SQL or Fastify exists.
    // Keep SQL open if draining still fails, exactly as for an ordinary shutdown.
    if (app) { await drainAppChronist(app); await app.close(); }
    else await chronist.close?.();
    await db?.close();
    throw error;
  }
  const runningApp = app, runningDb = db;
  let shutdownPending: Promise<void> | undefined;
  const shutdown = () => shutdownPending ??= (async () => {
    await drainAppChronist(runningApp); await runningApp.close(); await runningDb.close(); process.exit(0);
  })().catch(() => { shutdownPending = undefined; console.error("Host noch nicht vollständig beendet. Abschluss erneut anfordern."); });
  process.on("SIGINT", () => { void shutdown(); }); process.on("SIGTERM", () => { void shutdown(); });
  console.log(`Atlas Chronicles: ${origin}\nInitial setup token: see .local/config.json (bootstrapToken).`);
}
