// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { buildApp } from "./app.ts";
import { createPgDb, migrate } from "./db/index.ts";

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
  const db = createPgDb(process.env["DATABASE_URL"] ?? settings.databaseUrl);
  await migrate(db);
  const staticRoot = resolve(root, "packages/client/dist");
  const hasClient = await access(resolve(staticRoot, "index.html")).then(() => true, () => false);
  const app = await buildApp(db, { ...settings, origin, logger: true, publicDeliveryEnabled: process.env["CHRONICLE_PUBLIC_DELIVERY"] === "1", ...(hasClient ? { staticRoot } : {}) });
  const shutdown = async () => { await app.close(); await db.close(); process.exit(0); };
  process.once("SIGINT", () => { void shutdown(); }); process.once("SIGTERM", () => { void shutdown(); });
  await app.listen({ host: process.env["HOST"] ?? "127.0.0.1", port });
  console.log(`Atlas Chronicles: ${origin}\nInitial setup token: see .local/config.json (bootstrapToken).`);
}
