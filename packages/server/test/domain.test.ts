import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { Gone } from "../src/domain/errors.ts";
import { normalizeName } from "../src/domain/names.ts";

// Scaffold gates only. Domain operations and the runnable HTTP server are not implemented.
describe("Postgres scaffold (same migration used by pg and PGlite)", () => {
  let db: Db;
  beforeAll(async () => {
    db = await createTestDb();
    await migrate(db);
  }, 30_000);
  afterAll(async () => { await db?.close(); });

  it("applies the migration exactly once on repeated startup", async () => {
    await migrate(db);
    const result = await db.query<{ count: string }>("SELECT count(*) FROM schema_migrations");
    expect(Number(result.rows[0]?.count)).toBe(1);
    const tables = await db.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    expect(tables.rows.map((r) => r.tablename)).toEqual(expect.arrayContaining([
      "users", "credentials", "campaigns", "campaign_memberships", "join_requests",
      "entries", "passages", "revelations", "vollmachten", "rolls", "events",
    ]));
  });

  it("rolls back every write in a failed transaction while a queued independent write survives", async () => {
    let entered!: () => void;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { entered = resolve; });
    const resume = new Promise<void>((resolve) => { release = resolve; });
    const failed = db.transaction(async (tx) => {
      await tx.query("INSERT INTO users(id,display_name,created_at) VALUES('rollback','Rollback',0)");
      entered();
      await resume;
      throw new Error("rollback-test");
    });
    const checkedFailure = expect(failed).rejects.toThrow("rollback-test");
    await ready;
    const independent = db.query("INSERT INTO users(id,display_name,created_at) VALUES('survivor','Survivor',0)");
    release();
    await checkedFailure;
    await independent;
    const result = await db.query<{ id: string }>("SELECT id FROM users WHERE id IN ('rollback','survivor') ORDER BY id");
    expect(result.rows).toEqual([{ id: "survivor" }]);
  });

  it("refuses an altered applied migration and preserves its existing data", async () => {
    const original = (await db.query<{ sha256: string }>("SELECT sha256 FROM schema_migrations WHERE name='001_initial.sql'")).rows[0]!.sha256;
    await db.query("UPDATE schema_migrations SET sha256='tampered' WHERE name='001_initial.sql'");
    try {
      await expect(migrate(db)).rejects.toThrow("Applied migration changed: 001_initial.sql");
      expect((await db.query("SELECT id FROM users WHERE id='survivor'")).rowCount).toBe(1);
    } finally {
      await db.query("UPDATE schema_migrations SET sha256=$1 WHERE name='001_initial.sql'", [original]);
    }
  });

  it("rejects a revelation that combines an actor and a passage from different campaigns", async () => {
    await db.transaction(async (tx) => {
      await tx.query("INSERT INTO universes(id,owner_user_id,name) VALUES('world','survivor','World')");
      await tx.query("INSERT INTO campaigns(id,universe_id,owner_user_id,name,created_at) VALUES('a','world','survivor','A',0),('b','world','survivor','B',0)");
      await tx.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES('actor-b','b','survivor','B')");
      await tx.query("INSERT INTO entries(id,universe_id,campaign_id,slug,title,current_revision_id,created_by) VALUES('entry-a','world','a','entry','Entry','rev-a','survivor')");
      await tx.query("INSERT INTO revisions(id,entry_id,seq,author_user_id,content_hash) VALUES('rev-a','entry-a',1,'survivor','hash')");
      await tx.query("INSERT INTO passages(id,entry_id,campaign_id,revision_id,ord,path,content) VALUES('passage-a','entry-a','a','rev-a',0,'[]','{\"kind\":\"absatz\",\"inhalt\":[]}')");
    });
    await expect(db.query("INSERT INTO revelations(campaign_id,actor_id,passage_id,granted_at,granted_by) VALUES('a','actor-b','passage-a',0,'survivor')"))
      .rejects.toMatchObject({ code: "23503" });
    expect((await db.query("SELECT * FROM revelations")).rowCount).toBe(0);
  });
});

describe("Namenswache", () => {
  it("normalizes width/accents and catches its documented Cyrillic and Greek lookalikes", () => {
    expect(normalizeName("  Ｓｅｒａ  ").displayName).toBe("Sera");
    expect(normalizeName("Séra").skeleton).toBe(normalizeName("Serа").skeleton); // Cyrillic а
    expect(normalizeName("Olav").skeleton).toBe(normalizeName("Οlav").skeleton); // Greek Ο
    expect(normalizeName("Olav").skeleton).not.toBe(normalizeName("Oggugat").skeleton);
  });

  it("counts graphemes and rejects controls instead of silently deleting them", () => {
    expect(normalizeName("a\u0301".repeat(40)).displayName).toBe("á".repeat(40));
    expect(() => normalizeName("a\u0301".repeat(41))).toThrow(Gone);
    for (const name of ["", "  ", "Sera\n", "Sera\u202e", "Se\u200bra", "\ud800"]) {
      expect(() => normalizeName(name)).toThrow(Gone);
    }
  });
});
