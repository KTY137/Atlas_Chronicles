// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, it, expect } from "vitest";
import { createPgDb, type Db } from "../src/db/index.ts";

/**
 * The pool faults that used to end the process, pinned against real Postgres.
 *
 * PGlite has no connection pool and no second backend to kill, so these cannot run there.
 * Set `TEST_DATABASE_URL` to exercise them.
 */
const connection = process.env["TEST_DATABASE_URL"];

describe.skipIf(!connection)("a pooled connection dying does not take the server with it", () => {
  it("survives a connection terminated server-side and reports it instead", async () => {
    // Measured on 2026-09-06: without a Pool 'error' listener this exact sequence produced an
    // uncaught exception and would have killed the process. Every Postgres restart, upgrade
    // and administrative `pg_terminate_backend` does what this test does deliberately.
    const seen: Error[] = [];
    const db: Db = createPgDb(connection!, { onError: (error) => { seen.push(error); } });
    const mine = await db.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
    const pid = mine.rows[0]!.pid;

    const killer: Db = createPgDb(connection!, { onError: () => undefined });
    await killer.query("SELECT pg_terminate_backend($1)", [pid]);

    // Give the socket close time to surface as a pool event.
    await new Promise((resolve) => setTimeout(resolve, 750));

    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]!.message).toMatch(/terminat|connection/i);

    // And the pool is still usable afterwards: the broken connection was discarded, not kept.
    const after = await db.query<{ ok: number }>("SELECT 1 AS ok");
    expect(after.rows[0]!.ok).toBe(1);

    await killer.close();
    await db.close();
  });

  it("cuts a runaway statement instead of holding its connection open", async () => {
    const db: Db = createPgDb(connection!, { statementTimeoutMillis: 300, onError: () => undefined });
    await expect(db.query("SELECT pg_sleep(5)")).rejects.toThrow(/statement timeout/i);
    // The connection is returned to the pool in a usable state.
    const after = await db.query<{ ok: number }>("SELECT 1 AS ok");
    expect(after.rows[0]!.ok).toBe(1);
    await db.close();
  });

  it("fails fast when the pool is exhausted rather than hanging forever", async () => {
    // One connection, and a transaction holds it. Without connectionTimeoutMillis the second
    // caller waits indefinitely, which reads as a dead server rather than a busy one.
    const db: Db = createPgDb(connection!, { max: 1, connectionTimeoutMillis: 400, onError: () => undefined });
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const holding = db.transaction(async (tx) => { await tx.query("SELECT 1"); await held; });
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(db.query("SELECT 1")).rejects.toThrow(/timeout/i);
    release();
    await holding;
    await db.close();
  });

  it("keeps savepoint semantics on real Postgres, not just on the test adapter", async () => {
    const db: Db = createPgDb(connection!, { onError: () => undefined });
    const table = `boundary_${Math.random().toString(36).slice(2, 10)}`;
    await db.query(`CREATE TEMP TABLE ${table} (id int primary key)`);
    // A temp table lives per connection, so do the whole exercise inside one transaction.
    await db.transaction(async (tx) => {
      await tx.query(`CREATE TEMP TABLE IF NOT EXISTS ${table}_tx (id int primary key)`);
      await tx.query(`INSERT INTO ${table}_tx(id) VALUES(1)`);
      await expect(tx.transaction(async (inner) => {
        await inner.query(`INSERT INTO ${table}_tx(id) VALUES(2)`);
        throw new Error("inner failed");
      })).rejects.toThrow("inner failed");
      // Proves the outer transaction is not in the aborted state.
      await tx.query(`INSERT INTO ${table}_tx(id) VALUES(3)`);
      const rows = await tx.query<{ id: number }>(`SELECT id FROM ${table}_tx ORDER BY id`);
      expect(rows.rows.map((r) => r.id)).toEqual([1, 3]);
    });
    await db.close();
  });
});
