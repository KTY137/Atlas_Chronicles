// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, it, expect } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";

/**
 * The transaction boundary, tested on the adapter that every other test uses.
 *
 * Services here are routinely constructed with an open transaction
 * (`createCampaigns(tx, config)`) and then call `.transaction()` themselves, so a nested
 * transaction is the normal case rather than an exotic one. These tests pin what nesting
 * means, because the answer used to be "nothing": the inner block ran on the parent
 * transaction with no boundary of its own.
 *
 * Every case here declares 30_000, because every case boots its own PGlite and that is not
 * free: measured on this machine, `createTestDb()` alone costs ~3.6s of WASM startup before
 * a single statement runs, and `migrate()` adds ~0.95s on top of it. Vitest's default budget
 * is 5s, so these six ran with ~1.4s of headroom and failed the moment the machine was busy.
 * That is not a slow test caught by a tight budget; it is the one file in this suite that
 * never got the budget its siblings have -- 30_000 appears 53 times in packages/server/test,
 * 20_000 fourteen times, 15_000 six times. The number is the convention, not a concession.
 */
describe("nested transactions are savepoints, not decoration", () => {
  const table = "CREATE TABLE IF NOT EXISTS boundary_probe (id int primary key, note text)";

  it("contains an inner failure and leaves the outer transaction usable", async () => {
    const db: Db = await createTestDb();
    await db.query(table);
    await db.transaction(async (tx) => {
      await tx.query("INSERT INTO boundary_probe(id,note) VALUES(1,'outer')");
      // The inner block fails and its caller handles the failure. Without a savepoint the
      // whole transaction is already aborted at this point and every statement below throws
      // `current transaction is aborted`, so the recovery written here would do nothing.
      await expect(tx.transaction(async (inner) => {
        await inner.query("INSERT INTO boundary_probe(id,note) VALUES(2,'inner')");
        throw new Error("inner work failed");
      })).rejects.toThrow("inner work failed");
      // The outer transaction survives and can still write.
      await tx.query("INSERT INTO boundary_probe(id,note) VALUES(3,'after')");
    });
    const rows = await db.query<{ id: number }>("SELECT id FROM boundary_probe ORDER BY id");
    // 1 and 3 committed; 2 was rolled back to its own savepoint.
    expect(rows.rows.map((r) => r.id)).toEqual([1, 3]);
    await db.close();
  }, 30_000);

  it("commits a nested block that succeeds", async () => {
    const db: Db = await createTestDb();
    await db.query(table);
    await db.transaction(async (tx) => {
      await tx.query("INSERT INTO boundary_probe(id,note) VALUES(1,'outer')");
      await tx.transaction(async (inner) => {
        await inner.query("INSERT INTO boundary_probe(id,note) VALUES(2,'inner')");
      });
    });
    const rows = await db.query<{ id: number }>("SELECT id FROM boundary_probe ORDER BY id");
    expect(rows.rows.map((r) => r.id)).toEqual([1, 2]);
    await db.close();
  }, 30_000);

  it("rolls the whole thing back when the outer transaction fails", async () => {
    const db: Db = await createTestDb();
    await db.query(table);
    await expect(db.transaction(async (tx) => {
      await tx.query("INSERT INTO boundary_probe(id,note) VALUES(1,'outer')");
      await tx.transaction(async (inner) => {
        await inner.query("INSERT INTO boundary_probe(id,note) VALUES(2,'inner')");
      });
      throw new Error("outer work failed");
    })).rejects.toThrow("outer work failed");
    const rows = await db.query("SELECT id FROM boundary_probe");
    expect(rows.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("nests more than one level deep without colliding savepoint names", async () => {
    const db: Db = await createTestDb();
    await db.query(table);
    await db.transaction(async (a) => {
      await a.query("INSERT INTO boundary_probe(id,note) VALUES(1,'a')");
      await a.transaction(async (b) => {
        await b.query("INSERT INTO boundary_probe(id,note) VALUES(2,'b')");
        await expect(b.transaction(async (c) => {
          await c.query("INSERT INTO boundary_probe(id,note) VALUES(3,'c')");
          throw new Error("deepest failed");
        })).rejects.toThrow("deepest failed");
        await b.query("INSERT INTO boundary_probe(id,note) VALUES(4,'b again')");
      });
    });
    const rows = await db.query<{ id: number }>("SELECT id FROM boundary_probe ORDER BY id");
    expect(rows.rows.map((r) => r.id)).toEqual([1, 2, 4]);
    await db.close();
  }, 30_000);

  it("still refuses to close a transaction handle", async () => {
    const db: Db = await createTestDb();
    await db.transaction(async (tx) => {
      await expect(tx.close()).rejects.toThrow("Cannot close a transaction");
    });
    await db.close();
  }, 30_000);

  it("runs the real migrations, so the boundary change cannot break startup", async () => {
    const db: Db = await createTestDb();
    await migrate(db);
    // Idempotent: a second run applies nothing and must not throw.
    await migrate(db);
    const applied = await db.query<{ name: string }>("SELECT name FROM schema_migrations ORDER BY name");
    expect(applied.rows.length).toBeGreaterThan(0);
    await db.close();
  }, 30_000);
});
