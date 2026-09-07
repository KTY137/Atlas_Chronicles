import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";

/**
 * Die Rasterzahlen existierten im Code und wurden nirgends ausgegeben. Jetzt gibt es sie —
 * hinter der Betreiberrolle, nicht offen. Diese Tests halten beide Hälften fest.
 */
describe("Betreiberauskunft über den Rasterdienst", () => {
  let db: Db;
  const config = { origin: "http://localhost:3000", cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex") };
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => { await db?.close(); });

  async function sitzung(platformRole: "gast" | "leitung") {
    const userId = randomUUID();
    await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$1,$2,1)", [userId, platformRole]);
    return `chronicle_session=${(await createIdentity(db, config).issueSession(userId)).value}`;
  }

  it("nennt dem Betreiber Warteschlange und Cache", async () => {
    const app = await buildApp(db, config);
    try {
      const reply = await app.inject({ url: "/api/operator/raster", headers: { cookie: await sitzung("leitung") } });
      expect(reply.statusCode).toBe(200);
      expect(Object.keys(reply.json() as object).sort()).toEqual(
        ["active", "cacheBytes", "cacheEntries", "cacheHits", "cacheMisses", "queued"],
      );
    } finally { await app.close(); }
  });

  it("verschweigt sie dem Spieler mit derselben 404 wie jede andere Verweigerung", async () => {
    const app = await buildApp(db, config);
    try {
      const reply = await app.inject({ url: "/api/operator/raster", headers: { cookie: await sitzung("gast") } });
      expect(reply.statusCode).toBe(404);
      expect(reply.json()).toEqual({ error: "Nicht verfügbar" });
    } finally { await app.close(); }
  });

  it("verschweigt sie dem unangemeldeten Aufrufer", async () => {
    const app = await buildApp(db, config);
    try {
      expect((await app.inject({ url: "/api/operator/raster" })).statusCode).toBe(404);
    } finally { await app.close(); }
  });

  it("nennt dem Betreiber den Verbrauch aller Kampagnen, dem Spieler nicht", async () => {
    const app = await buildApp(db, config);
    try {
      const erlaubt = await app.inject({ url: "/api/operator/usage", headers: { cookie: await sitzung("leitung") } });
      expect(erlaubt.statusCode).toBe(200);
      expect(erlaubt.json()).toHaveProperty("campaigns");
      expect((await app.inject({ url: "/api/operator/usage", headers: { cookie: await sitzung("gast") } })).statusCode).toBe(404);
      expect((await app.inject({ url: "/api/operator/usage" })).statusCode).toBe(404);
    } finally { await app.close(); }
  });
});
