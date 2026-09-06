import type { FastifyInstance } from "fastify";
import type { Db } from "../db/index.ts";

/**
 * Liveness and readiness, deliberately separated.
 *
 * `/api/health` (in `app.ts`) does a database round trip, and the container healthcheck used
 * to probe it every 15 s with five retries. That makes load self-amplifying: a busy evening
 * exhausts the pool, the probe cannot get a connection, the orchestrator declares the container
 * unhealthy and restarts a server that was working — and the restart adds load. A restart also
 * cannot repair a database that is genuinely down, so tying process lifetime to database
 * reachability buys nothing and costs availability.
 *
 * So:
 *   - `/api/live`  — is this process alive and still serving HTTP? No database, no rate limit.
 *                    This is what decides whether to restart the container.
 *   - `/api/ready` — can it actually serve requests right now? Bounded database round trip.
 *                    This is what a load balancer or an operator asks before sending traffic,
 *                    and what `docker compose up --wait` should wait for on first boot.
 *
 * Both are exempt from the rate limiter: a probe that gets 429 during a traffic spike would
 * report exactly the false outage this split exists to prevent.
 *
 * `/api/health` still exists unchanged, but be precise about who calls it: as of 2026-09-06
 * that is only the test suite — `rate-limit.test.ts` uses it as a cheap endpoint whose throttling
 * it asserts, and `application-shutdown.test.ts` as an in-flight request. Nothing in production
 * reaches it: the image probes `/api/live`, the compose file probes `/api/ready`, and the client
 * never calls it. It is kept because those tests depend on its exact behaviour, including that it
 * is deliberately NOT exempt from the rate limiter.
 */

/** How long a readiness probe may wait before it reports "not ready" rather than hanging. */
const READY_BUDGET_MS = 2_000;

export function registerHealth(app: FastifyInstance, db: Db): void {
  const startedAt = Date.now();

  app.get("/api/live", { config: { rateLimit: false } }, async () => ({
    ok: true,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  }));

  app.get("/api/ready", { config: { rateLimit: false } }, async (_req, reply) => {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        db.query("SELECT 1"),
        new Promise((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error("database did not answer in time")), READY_BUDGET_MS);
        }),
      ]);
      return { ready: true };
    } catch (error) {
      // Deliberately coarse to the caller and precise in the log: a readiness body is reachable
      // without authentication, so it names the state and never the connection string, the host
      // or the driver's error detail.
      app.log.warn({ err: error }, "readiness probe failed");
      return reply.code(503).send({ ready: false });
    } finally {
      if (timer) clearTimeout(timer);
    }
  });
}
