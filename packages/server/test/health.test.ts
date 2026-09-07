import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomBytes } from "node:crypto";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";

/**
 * Liveness must not depend on the database, and readiness must.
 *
 * The failure this pins: the container healthcheck used to run a database round trip every
 * 15 s with five retries, so an exhausted pool on a busy evening got a working server
 * restarted — and the restart added load. A restart also cannot repair a database that is
 * down. Liveness therefore answers "is this process serving HTTP", nothing more.
 */
describe("liveness and readiness are different questions", () => {
  let db: Db;
  let app: Awaited<ReturnType<typeof buildApp>>;
  const config = {
    origin: "http://health.test",
    cookieSecret: randomBytes(32).toString("hex"),
    bootstrapToken: randomBytes(32).toString("hex"),
  };

  // Dieselbe ausdrückliche Frist, die 40 der 41 Dateien mit `createTestDb` setzen. Ohne sie
  // lief dieser Aufbau gegen vitests Vorgabe von 5000 ms, während PGlites Start unter der
  // Parallellast der vollen Menge allein mehrere Sekunden misst — die Datei fiel dann
  // vollständig aus und war einzeln trotzdem grün.
  beforeAll(async () => {
    db = await createTestDb();
    await migrate(db);
    app = await buildApp(db, config);
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); });

  it("reports liveness without touching the database", async () => {
    const response = await app.inject({ url: "/api/live" });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { ok: boolean; uptimeSeconds: number };
    expect(body.ok).toBe(true);
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("reports readiness when the database answers", async () => {
    const response = await app.inject({ url: "/api/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ready: true });
  });

  it("answers 503 for readiness once the database is gone, and stays live", async () => {
    // A separate app over a closed database: readiness must fail, liveness must not.
    const dead = await createTestDb();
    await migrate(dead);
    const app2 = await buildApp(dead, config);
    await dead.close();

    const ready = await app2.inject({ url: "/api/ready" });
    expect(ready.statusCode).toBe(503);
    expect(ready.json()).toEqual({ ready: false });

    const live = await app2.inject({ url: "/api/live" });
    expect(live.statusCode).toBe(200);

    await app2.close();
  }, 30_000);

  it("never lets a probe be rate limited into a false outage", async () => {
    // The global limiter is 240/minute per IP. A probe that gets 429 during a traffic spike
    // would report exactly the outage this split exists to prevent, so both are exempt.
    for (let i = 0; i < 260; i++) {
      const response = await app.inject({ url: "/api/live" });
      expect(response.statusCode).toBe(200);
    }
  });

  it("keeps the existing /api/health contract for its current callers", async () => {
    const response = await app.inject({ url: "/api/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it("does not disclose connection details when readiness fails", async () => {
    const dead = await createTestDb();
    await migrate(dead);
    const app2 = await buildApp(dead, config);
    await dead.close();
    const body = (await app2.inject({ url: "/api/ready" })).body;
    expect(body).not.toMatch(/postgres|password|connection string|ECONNREFUSED|127\.0\.0\.1/i);
    await app2.close();
  }, 30_000);
});
