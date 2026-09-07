import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";

describe("authenticated rate budgets behind a shared network", () => {
  let db: Db;
  const config = { origin: "http://localhost:3000", cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex") };
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => db?.close());
  it("limits one verified user without blocking another user at the same IP", async () => {
    const app = await buildApp(db, config);
    try {
      const cookies = [];
      for (let i = 0; i < 2; i++) {
        const userId = randomUUID(); await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,$1,1)", [userId]);
        cookies.push(`chronicle_session=${(await createIdentity(db, config).issueSession(userId)).value}`);
      }
      for (let i = 0; i < 240; i++) expect((await app.inject({ url: "/api/health", headers: { cookie: cookies[0]! } })).statusCode).toBe(200);
      expect((await app.inject({ url: "/api/health", headers: { cookie: cookies[0]! } })).statusCode).toBe(429);
      expect((await app.inject({ url: "/api/health", headers: { cookie: cookies[1]! } })).statusCode).toBe(200);
    } finally { await app.close(); }
  });
  it("does not let forged cookie values or caller identity headers mint fresh buckets", async () => {
    const app = await buildApp(db, config);
    try {
      for (let i = 0; i < 240; i++) expect((await app.inject({ url: "/api/health", headers: { cookie: `chronicle_session=forged-${i}`, "x-user-id": randomUUID() } })).statusCode).toBe(200);
      expect((await app.inject({ url: "/api/health", headers: { cookie: "chronicle_session=one-more-forgery", "x-user-id": randomUUID() } })).statusCode).toBe(429);
      expect((await app.inject({ url: "/api/health" })).statusCode).toBe(429);
    } finally { await app.close(); }
  });
  it("drosselt den Kartenimport härter als den allgemeinen Verkehr", async () => {
    const app = await buildApp(db, config);
    try {
      const url = `/api/campaigns/${randomUUID()}/maps/import`;
      const headers = { origin: config.origin, "content-type": "application/json" };
      // Ohne Anmeldung antwortet die Route 400 oder 404 — das genügt: gezählt wird die Anfrage,
      // nicht ihr Erfolg. Entscheidend ist allein, dass die Drosselung weit vor 240 greift, denn
      // diese Route trägt bis zu 64 MiB Body, während der billige Export auf 4/Minute steht.
      for (let i = 0; i < 8; i++) {
        expect((await app.inject({ method: "POST", url, headers, payload: {} })).statusCode).not.toBe(429);
      }
      expect((await app.inject({ method: "POST", url, headers, payload: {} })).statusCode).toBe(429);
    } finally { await app.close(); }
  });
});
