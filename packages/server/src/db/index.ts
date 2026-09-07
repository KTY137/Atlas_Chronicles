// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";

export interface QueryResult<T> { rows: T[]; rowCount: number }
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<QueryResult<T>>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * Operational settings. Every one of these has a failure it prevents, named at its default.
 * All are overridable so a self-host on a laptop and a hosted room can differ without a
 * second code path (design/08-backend-architektur.md).
 */
export interface PgOptions {
  /** Ceiling on concurrent server-side connections. Postgres' own `max_connections` is the
   *  real limit; exceeding it turns a busy evening into connection errors for everyone. */
  readonly max?: number;
  /** How long `pool.connect()` may wait for a free connection. Without it, an exhausted pool
   *  makes requests hang forever instead of failing, and the hang looks like a dead server. */
  readonly connectionTimeoutMillis?: number;
  /** How long an unused connection is kept. Keeps idle self-host installs from holding
   *  backends open for days. */
  readonly idleTimeoutMillis?: number;
  /** Server-side cap per statement. A runaway query otherwise holds its connection until
   *  someone notices, which on a small pool is an outage. Set to 0 to disable. */
  readonly statementTimeoutMillis?: number;
  /** Where non-fatal pool faults are reported. Wired to the app logger in `main.ts`. */
  readonly onError?: (error: Error) => void;
}

const envInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : fallback;
};

export function createPgDb(connectionString: string, options: PgOptions = {}): Db {
  const statementTimeout = options.statementTimeoutMillis ?? envInt("DB_STATEMENT_TIMEOUT_MS", 30_000);
  const report = options.onError ?? ((error: Error) => console.error("[db]", error.message));
  const pool = new Pool({
    connectionString,
    max: options.max ?? envInt("DB_POOL_MAX", 10),
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? envInt("DB_CONNECT_TIMEOUT_MS", 10_000),
    idleTimeoutMillis: options.idleTimeoutMillis ?? envInt("DB_IDLE_TIMEOUT_MS", 30_000),
    ...(statementTimeout > 0 ? { statement_timeout: statementTimeout } : {}),
  });

  // THE CRASH THIS PREVENTS, measured rather than assumed (2026-09-06): terminate a pooled
  // connection server-side — which is what every Postgres restart, upgrade and
  // `pg_terminate_backend` does — and `pg` emits 'error' on the Pool. An EventEmitter 'error'
  // with no listener is an uncaught exception, so a routine database restart took the whole
  // application process down. The pool discards the broken connection by itself; all this
  // listener has to do is exist and say what happened.
  pool.on("error", (error: Error) => { report(error); });

  // Passed as a driver option rather than as a statement on connect. The earlier version fired
  // `SET statement_timeout` from the pool's 'connect' handler without awaiting it, which overlapped
  // with the caller's first query on the same client and produced pg's "client is already executing
  // a query" deprecation warning. It is also not set through the connection string's `options`
  // parameter, because that already carries `search_path` for isolated test schemas and
  // overwriting it would silently move a test onto the wrong schema.

  /**
   * Nested transactions become SAVEPOINTs.
   *
   * Services are routinely constructed with an open transaction (`createCampaigns(tx, config)`)
   * and those same services call `.transaction()` themselves, so nesting is normal here rather
   * than exotic. The previous implementation ran the inner block on the parent transaction and
   * returned — no savepoint, no boundary. That is fine until an inner block fails and its caller
   * handles the failure: Postgres has already marked the whole transaction aborted, so every
   * later statement fails with `current transaction is aborted`, and the recovery the caller
   * wrote does nothing. With a savepoint the inner failure rolls back to its own boundary and
   * the outer transaction stays usable.
   */
  const wrap = (run: (sql: string, params: readonly unknown[]) => Promise<QueryResult<unknown>>, depth: number): Db => {
    const self: Db = {
      query: <R,>(sql: string, params: readonly unknown[] = []) => run(sql, params) as Promise<QueryResult<R>>,
      async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
        const name = `sp_${depth}`;
        await run(`SAVEPOINT ${name}`, []);
        try {
          const value = await fn(wrap(run, depth + 1));
          await run(`RELEASE SAVEPOINT ${name}`, []);
          return value;
        } catch (error) {
          // A failing rollback must never replace the error that caused it.
          await run(`ROLLBACK TO SAVEPOINT ${name}`, []).catch(report);
          throw error;
        }
      },
      close: async () => { throw new Error("Cannot close a transaction"); },
    };
    return self;
  };

  return {
    async query<T>(sql: string, params: readonly unknown[] = []) {
      const result = await pool.query(sql, [...params]);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      const run = async (sql: string, params: readonly unknown[]): Promise<QueryResult<unknown>> => {
        const r = await client.query(sql, [...params]);
        return { rows: r.rows as unknown[], rowCount: r.rowCount ?? 0 };
      };
      try {
        await client.query("BEGIN");
        const value = await fn(wrap(run, 0));
        await client.query("COMMIT");
        return value;
      } catch (error) {
        // Report a failed rollback, never let it mask the original failure.
        await client.query("ROLLBACK").catch(report);
        throw error;
      } finally { client.release(); }
    },
    close: () => pool.end(),
  };
}

/** The test adapter uses the same SQL. Serialize the whole transaction, not individual
 * statements, so unrelated promises cannot accidentally execute inside somebody else's TX. */
export async function createTestDb(dataDir?: string): Promise<Db> {
  const pg = new PGlite(dataDir);
  await pg.waitReady;
  let tail: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = tail.then(fn, fn);
    tail = next.catch(() => undefined);
    return next;
  };
  const rawQuery = async <T>(sql: string, params: readonly unknown[] = []): Promise<QueryResult<T>> => {
    const r = await pg.query<T>(sql, [...params]);
    // PGlite reports affectedRows=0 for SELECT; pg.rowCount counts selected rows too.
    return { rows: r.rows, rowCount: Math.max(r.affectedRows ?? 0, r.rows.length) };
  };
  // Savepoints here too, so the test adapter and Postgres agree about what a nested
  // transaction means. A test that passes against weaker semantics is not a test.
  const wrap = (depth: number): Db => ({
    query: rawQuery,
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      const name = `sp_${depth}`;
      await pg.exec(`SAVEPOINT ${name}`);
      try {
        const value = await fn(wrap(depth + 1));
        await pg.exec(`RELEASE SAVEPOINT ${name}`);
        return value;
      } catch (error) {
        await pg.exec(`ROLLBACK TO SAVEPOINT ${name}`).catch(() => undefined);
        throw error;
      }
    },
    close: async () => { throw new Error("Cannot close a transaction"); },
  });
  return {
    query: (sql, params) => exclusive(() => rawQuery(sql, params)),
    transaction: (fn) => exclusive(async () => {
      await pg.exec("BEGIN");
      try {
        const result = await fn(wrap(0));
        await pg.exec("COMMIT");
        return result;
      } catch (error) {
        await pg.exec("ROLLBACK").catch(() => undefined);
        throw error;
      }
    }),
    close: () => exclusive(() => pg.close()),
  };
}

/**
 * Wendet ausstehende Migrationen an — **je Datei eine Transaktion**.
 *
 * Vorher lief der ganze Lauf in einer gemeinsamen Transaktion. Das war atomar, nahm aber bei
 * einem Fehler in der fünfzehnten Datei auch die vierzehn erfolgreichen desselben Laufs zurück
 * und hielt bei einem großen Rückstand einen entsprechend langen Lock. Ein teilweise
 * angewandter Stand ist kein kaputter Zustand — genau den führt `schema_migrations` mit, und
 * genau in ihm steht jede etwas ältere Installation ohnehin.
 *
 * Der Advisory-Lock wird je Datei neu genommen, nicht über den ganzen Lauf gehalten. Zwei
 * gleichzeitig startende Container können sich dabei abwechseln, und das ist harmlos: Die
 * Prüfung auf „schon angewandt" liegt in derselben Transaktion wie das Anwenden, der zweite
 * sieht die Datei also als erledigt und überspringt sie.
 *
 * Die Prüfsumme jeder bereits angewandten Datei wird weiterhin bei jedem Start nachgerechnet.
 *
 * `dir` ist nur für Tests da: Nur so lässt sich ein Fehlschlag mitten im Lauf überhaupt
 * herbeiführen und damit belegen, dass die früheren Dateien stehen bleiben.
 */
export async function migrate(db: Db, dir: URL = new URL("./migrations/", import.meta.url)): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(7342619)");
    await tx.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, sha256 text NOT NULL)");
  });
  for (const name of (await readdir(dir)).filter((n) => n.endsWith(".sql")).sort()) {
    const sql = await readFile(new URL(name, dir), "utf8");
    const hash = createHash("sha256").update(sql).digest("hex");
    await db.transaction(async (tx) => {
      // Serializes startup of two app containers against the same Postgres database.
      await tx.query("SELECT pg_advisory_xact_lock(7342619)");
      const old = await tx.query<{ sha256: string }>("SELECT sha256 FROM schema_migrations WHERE name=$1", [name]);
      if (old.rows[0]) {
        if (old.rows[0].sha256 !== hash) throw new Error(`Applied migration changed: ${name}`);
        return;
      }
      // Each migration statement is explicitly separated; never split SQL on raw semicolons.
      for (const statement of sql.split(/^-- statement\s*$/m).map((s) => s.trim()).filter(Boolean)) {
        await tx.query(statement);
      }
      await tx.query("INSERT INTO schema_migrations(name,sha256) VALUES($1,$2)", [name, hash]);
    });
  }
}
