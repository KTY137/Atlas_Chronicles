import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPgDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createActors } from "../src/domain/actors.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";

const connection = process.env["TEST_DATABASE_URL"];
const schema = `chronicle_actor_${randomUUID().replaceAll("-", "")}`;
const config = { origin: "https://actor-pg.test", cookieSecret: "actor-postgres-cookie-secret-at-least-32-characters" };
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }

describe.skipIf(!connection)("actor custody and control on real PostgreSQL", () => {
  let admin: Db, db: Db, gm: string;
  beforeAll(async () => {
    admin = createPgDb(connection!); await admin.query(`CREATE SCHEMA "${schema}"`);
    const url = new URL(connection!);
    url.searchParams.set("options", `-c search_path=${schema} -c statement_timeout=12000`);
    url.searchParams.set("application_name", schema);
    db = createPgDb(url.href); await migrate(db);
    gm = (await createIdentity(db, config).bootstrap("Kaya")).userId;
  }, 30_000);
  afterAll(async () => {
    await db?.close();
    if (admin) {
      try { if (!/^chronicle_actor_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected test schema"); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
      finally { await admin.close(); }
    }
  });
  async function fixture() {
    const campaigns = createCampaigns(db), campaign = (await campaigns.createCampaign(gm, { name: "Concurrent custody" })).id;
    const people: { userId: string; actorId: string }[] = [];
    for (const displayName of ["Sera", "Brannt"]) {
      const userId = randomUUID(), actorId = randomUUID();
      await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,$2,1)", [userId, displayName]);
      await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [actorId, campaign, userId, displayName]);
      await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$3,$4)", [campaign, userId, displayName, actorId]);
      await db.query("INSERT INTO actor_profiles(actor_id,campaign_id,kind) VALUES($1,$2,'player_character')", [actorId, campaign]);
      await db.query("INSERT INTO actor_controllers(actor_id,campaign_id,user_id) VALUES($1,$2,$3)", [actorId, campaign, userId]);
      people.push({ userId, actorId });
    }
    const actors = createActors(db);
    const template = await actors.createItemTemplate(gm, campaign, { commandId: randomUUID(), definition: { schemaVersion: 1, name: "Einzigartiger Schlüssel", loreEntryId: null, tags: [] } });
    const item = await actors.instantiateItem(gm, campaign, { commandId: randomUUID(), templateId: template.id, templateRevision: 1, holderActorId: people[0]!.actorId });
    return { campaign, actors, item, a: people[0]!, b: people[1]! };
  }

  it("commits one of two competing custody changes and records a retried transfer once", async () => {
    const f = await fixture();
    const outcomes = await Promise.allSettled([
      f.actors.transferItem(gm, f.campaign, f.item.id, { commandId: randomUUID(), expectedVersion: 1, reason: "Second actor", holderActorId: f.b.actorId }),
      f.actors.transferItem(gm, f.campaign, f.item.id, { commandId: randomUUID(), expectedVersion: 1, reason: "GM stock", holderActorId: null }),
    ]);
    expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const failed = outcomes.find(result => result.status === "rejected");
    expect(failed?.status === "rejected" ? failed.reason : undefined).toBeInstanceOf(Conflict);
    const current = await f.actors.getItem(gm, f.campaign, f.item.id);
    expect(current.version).toBe(2);
    const retry = { commandId: randomUUID(), expectedVersion: 2, reason: "Return", holderActorId: f.a.actorId };
    const results = await Promise.all([f.actors.transferItem(gm, f.campaign, f.item.id, retry), f.actors.transferItem(gm, f.campaign, f.item.id, retry)]);
    expect(results[0]).toEqual(results[1]); expect(results[0]?.version).toBe(3);
    expect((await db.query("SELECT 1 FROM item_instances WHERE id=$1", [f.item.id])).rowCount).toBe(1);
    expect((await db.query("SELECT 1 FROM actor_inventory_events WHERE campaign_id=$1 AND operation='item.transfer'", [f.campaign])).rowCount).toBe(2);
    expect((await f.actors.listItems(f.b.userId, f.campaign, f.b.actorId))).toEqual([]);
  });

  it("rechecks the grant after waiting for an overlapping revocation to commit", async () => {
    const f = await fixture(), release = deferred(); let revoked = false;
    const observed: Db = {
      query: (sql, params) => db.query(sql, params), close: async () => { throw new Error("Shared test pool"); },
      transaction: work => db.transaction(async tx => {
        const wrapped: Db = {
          query: async <T>(sql: string, params?: readonly unknown[]) => {
            const result = await tx.query<T>(sql, params);
            if (sql.startsWith("UPDATE actor_controllers SET revoked_at")) { revoked = true; await release.promise; }
            return result;
          },
          transaction: nested => nested(wrapped), close: async () => { throw new Error("Cannot close a transaction"); },
        };
        return work(wrapped);
      }),
    };
    const pending: Promise<unknown>[] = []; let outcomes: PromiseSettledResult<unknown>[] = [];
    try {
      const revoke = createActors(observed).revokeController(gm, f.campaign, f.a.actorId, f.a.userId, { commandId: randomUUID(), expectedVersion: 1, reason: "End control" });
      pending.push(revoke); void revoke.catch(() => {});
      await expect.poll(() => revoked).toBe(true);
      const update = f.actors.updateItem(f.a.userId, f.campaign, f.item.id, { commandId: randomUUID(), expectedVersion: 1, reason: "Stale edit", state: { quantity: 7, notes: "Must not commit", equipped: true } });
      pending.push(update); void update.catch(() => {});
      await expect.poll(async () => (await admin.query<{ blocked: boolean }>("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock') AS blocked", [schema])).rows[0]!.blocked, { timeout: 5000 }).toBe(true);
    } finally { release.resolve(); outcomes = await Promise.allSettled(pending); }
    expect(outcomes[0]?.status).toBe("fulfilled");
    const edit = outcomes[1]; expect(edit?.status === "rejected" ? edit.reason : undefined).toBeInstanceOf(Gone);
    expect((await f.actors.getItem(gm, f.campaign, f.item.id)).state.quantity).toBe(1);
    expect((await db.query("SELECT 1 FROM actor_inventory_events WHERE campaign_id=$1 AND operation='item.update'", [f.campaign])).rowCount).toBe(0);
  }, 20_000);

  it("rejects a command identity raced across campaigns without committing a second object", async () => {
    const first = await fixture(), second = await fixture(), release = deferred(); let checked = 0;
    const observed: Db = {
      query: (sql, params) => db.query(sql, params), close: async () => { throw new Error("Shared test pool"); },
      transaction: work => db.transaction(async tx => {
        const wrapped: Db = {
          query: async <T>(sql: string, params?: readonly unknown[]) => {
            const result = await tx.query<T>(sql, params);
            if (sql.startsWith("SELECT campaign_id,request_hash,result FROM actor_inventory_events")) {
              checked++; if (checked === 2) release.resolve(); await release.promise;
            }
            return result;
          },
          transaction: nested => nested(wrapped), close: async () => { throw new Error("Cannot close a transaction"); },
        };
        return work(wrapped);
      }),
    };
    const actors = createActors(observed), input = { commandId: randomUUID(), definition: { schemaVersion: 1, name: "Ein Befehl", loreEntryId: null, tags: [] } };
    const pending = [actors.createItemTemplate(gm, first.campaign, input), actors.createItemTemplate(gm, second.campaign, input)];
    for (const promise of pending) void promise.catch(() => {});
    let outcomes: PromiseSettledResult<unknown>[] = [];
    try { await expect.poll(() => checked, { timeout: 5000 }).toBe(2); }
    finally { release.resolve(); outcomes = await Promise.allSettled(pending); }
    expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const failed = outcomes.find(result => result.status === "rejected");
    expect(failed?.status === "rejected" ? failed.reason : undefined).toBeInstanceOf(Conflict);
    expect((await db.query("SELECT 1 FROM actor_inventory_events WHERE actor_user_id=$1 AND command_id=$2", [gm, input.commandId])).rowCount).toBe(1);
    expect((await db.query("SELECT 1 FROM item_templates WHERE campaign_id=ANY($1::text[])", [[first.campaign, second.campaign]])).rowCount).toBe(3);
  }, 20_000);
});
