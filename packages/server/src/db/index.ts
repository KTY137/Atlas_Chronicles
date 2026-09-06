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

export function createPgDb(connectionString: string): Db {
  const pool = new Pool({ connectionString });
  return {
    async query<T>(sql: string, params: readonly unknown[] = []) {
      const result = await pool.query(sql, [...params]);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      const tx: Db = {
        async query<R>(sql: string, params: readonly unknown[] = []) {
          const r = await client.query(sql, [...params]);
          return { rows: r.rows as R[], rowCount: r.rowCount ?? 0 };
        },
        transaction: (f) => f(tx),
        close: async () => { throw new Error("Cannot close a transaction"); },
      };
      try {
        await client.query("BEGIN");
        const value = await fn(tx);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
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
  const tx: Db = { query: rawQuery, transaction: (fn) => fn(tx), close: async () => { throw new Error("Cannot close a transaction"); } };
  return {
    query: (sql, params) => exclusive(() => rawQuery(sql, params)),
    transaction: (fn) => exclusive(async () => {
      await pg.exec("BEGIN");
      try {
        const result = await fn(tx);
        await pg.exec("COMMIT");
        return result;
      } catch (error) {
        await pg.exec("ROLLBACK");
        throw error;
      }
    }),
    close: () => exclusive(() => pg.close()),
  };
}

export async function migrate(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    // Serializes startup of two app containers against the same Postgres database.
    await tx.query("SELECT pg_advisory_xact_lock(7342619)");
    await tx.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, sha256 text NOT NULL)");
    const dir = new URL("./migrations/", import.meta.url);
    for (const name of (await readdir(dir)).filter((n) => n.endsWith(".sql")).sort()) {
      const sql = await readFile(new URL(name, dir), "utf8");
      const hash = createHash("sha256").update(sql).digest("hex");
      const old = await tx.query<{ sha256: string }>("SELECT sha256 FROM schema_migrations WHERE name=$1", [name]);
      if (old.rows[0]) {
        if (old.rows[0].sha256 !== hash) throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      // Each migration statement is explicitly separated; never split SQL on raw semicolons.
      for (const statement of sql.split(/^-- statement\s*$/m).map((s) => s.trim()).filter(Boolean)) {
        await tx.query(statement);
      }
      await tx.query("INSERT INTO schema_migrations(name,sha256) VALUES($1,$2)", [name, hash]);
    }
  });
}
