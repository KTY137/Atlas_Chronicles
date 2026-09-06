import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPgDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createCommunication } from "../src/domain/communication.ts";

const connection = process.env["TEST_DATABASE_URL"];
const schema = `chronicle_live_cursor_${randomUUID().replaceAll("-", "")}`;
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

// PGlite serializes whole transactions and cannot expose this FK-lock interleaving.
describe.skipIf(!connection)("concurrent first live cursors on PostgreSQL", () => {
  let admin: Db, db: Db, gm: string, player: string, campaign: string;
  beforeAll(async () => {
    admin = createPgDb(connection!);
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const url = new URL(connection!);
    url.searchParams.set("options", `-c search_path=${schema}`);
    url.searchParams.set("application_name", schema);
    db = createPgDb(url.href);
    await migrate(db);
    gm = (await createIdentity(db, { origin: "https://live-cursor.test", cookieSecret: "live-cursor-test-cookie-secret-at-least-32" }).bootstrap("Kaya")).userId;
    const campaigns = createCampaigns(db);
    campaign = (await campaigns.createCampaign(gm, { name: "Simultaneous arrivals" })).id;
    const invitation = await campaigns.issueInvitation(gm, campaign);
    const join = await campaigns.requestJoin(invitation.code, { displayName: "Sera" });
    player = (await campaigns.approveJoin(gm, campaign, join.id)).userId;
  }, 30_000);
  afterAll(async () => {
    await db?.close();
    if (admin) {
      try {
        if (!/^chronicle_live_cursor_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected test schema");
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      } finally { await admin.close(); }
    }
  });

  it("finishes two fresh subscriptions without upgrading competing campaign FK locks", async () => {
    const releaseFirst = deferred();
    let firstInserted = false, secondInserted = false, secondPid = 0;
    const pending: Promise<number>[] = [];
    let outcomes: PromiseSettledResult<number>[] = [];
    const observedDb = (which: "first" | "second"): Db => ({
      query: (sql, params) => db.query(sql, params),
      close: async () => { throw new Error("The test owns the shared connection pool"); },
      transaction: work => db.transaction(async tx => {
        // Bound SQL waits even when a regression creates a deadlock or an unexpected lock.
        await tx.query("SET LOCAL statement_timeout = '12s'");
        const pid = (await tx.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0]!.pid;
        if (which === "second") secondPid = pid;
        const wrapped: Db = {
          query: async <T>(sql: string, params?: readonly unknown[]) => {
            const result = await tx.query<T>(sql, params);
            if (/^INSERT INTO event_cursors\b/.test(sql)) {
              if (which === "first") { firstInserted = true; await releaseFirst.promise; }
              else secondInserted = true;
            }
            return result;
          },
          transaction: nested => nested(wrapped),
          close: async () => { throw new Error("Cannot close a transaction"); },
        };
        return work(wrapped);
      }),
    });
    try {
      const first = createCommunication(observedDb("first")).sync(gm, campaign);
      pending.push(first);
      // Attach rejection handlers immediately; final cleanup still checks every outcome.
      void first.catch(() => {});
      await expect.poll(() => firstInserted, { timeout: 5000 }).toBe(true);
      const second = createCommunication(observedDb("second")).sync(player, campaign);
      pending.push(second);
      void second.catch(() => {});
      await expect.poll(async () => secondInserted || (secondPid !== 0 &&
        (await admin.query<{ blocked: boolean }>("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=$1 AND wait_event_type='Lock') AS blocked", [secondPid])).rows[0]!.blocked),
      { timeout: 5000 }).toBe(true);
      // Before the first cursor resumes, another viewer must wait before taking its
      // campaign FK KEY SHARE lock. Otherwise both later need a conflicting UPDATE lock.
      expect(secondInserted, "The second cursor acquired its campaign FK lock before the first viewer finished").toBe(false);
    } finally {
      releaseFirst.resolve();
      outcomes = await Promise.allSettled(pending);
    }
    expect(outcomes).toEqual([{ status: "fulfilled", value: 0 }, { status: "fulfilled", value: 0 }]);
    expect((await db.query("SELECT 1 FROM event_cursors WHERE campaign_id=$1", [campaign])).rowCount).toBe(2);
  }, 20_000);
});
