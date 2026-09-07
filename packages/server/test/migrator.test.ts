import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";

/**
 * Der Migrator wendet je Datei eine eigene Transaktion an.
 *
 * Vorher lief ein ganzer Lauf in einer gemeinsamen: Ein Fehler in der fünfzehnten Datei nahm
 * auch die vierzehn erfolgreichen zurück, und ein großer Rückstand hielt einen entsprechend
 * langen Lock. Diese Tests halten das neue Verhalten fest — und die Prüfsummenkontrolle, die
 * dabei erhalten bleiben musste.
 */
describe("Migrator — Transaktion je Datei", () => {
  const aufraeumen: { db?: Db; verzeichnis?: string }[] = [];
  afterEach(async () => {
    for (const eintrag of aufraeumen.splice(0)) {
      await eintrag.db?.close();
      if (eintrag.verzeichnis) await rm(eintrag.verzeichnis, { recursive: true, force: true });
    }
  });

  async function umgebung(dateien: Readonly<Record<string, string>>) {
    const verzeichnis = await mkdtemp(join(tmpdir(), "chronicle-migrator-"));
    for (const [name, sql] of Object.entries(dateien)) await writeFile(join(verzeichnis, name), sql, "utf8");
    const db = await createTestDb();
    aufraeumen.push({ db, verzeichnis });
    // Ein Verzeichnis-URL braucht den abschließenden Schrägstrich, sonst löst `new URL(name, dir)`
    // gegen das übergeordnete Verzeichnis auf.
    return { db, dir: new URL(`${pathToFileURL(verzeichnis).href}/`) };
  }

  const angewandt = async (db: Db) =>
    (await db.query<{ name: string }>("SELECT name FROM schema_migrations ORDER BY name")).rows.map((r) => r.name);

  it("behält die früheren Dateien, wenn eine spätere scheitert", async () => {
    const { db, dir } = await umgebung({
      "001_erste.sql": "CREATE TABLE erste (id text PRIMARY KEY);",
      "002_zweite.sql": "CREATE TABLE zweite (id text PRIMARY KEY);",
      "003_kaputt.sql": "CREATE TABLE dritte (id text PRIMARY KEY, ref text REFERENCES gibtesnicht(id));",
    });

    await expect(migrate(db, dir)).rejects.toThrow();

    // Genau der Punkt: 001 und 002 stehen, 003 nicht.
    expect(await angewandt(db)).toEqual(["001_erste.sql", "002_zweite.sql"]);
    expect((await db.query("SELECT count(*) FROM zweite")).rows).toHaveLength(1);
  }, 30_000);

  it("setzt beim nächsten Lauf dort fort, wo es abgebrochen ist", async () => {
    const { db, dir } = await umgebung({
      "001_erste.sql": "CREATE TABLE erste (id text PRIMARY KEY);",
      "002_kaputt.sql": "CREATE TABLE zweite (id text PRIMARY KEY, ref text REFERENCES gibtesnicht(id));",
    });
    await expect(migrate(db, dir)).rejects.toThrow();
    expect(await angewandt(db)).toEqual(["001_erste.sql"]);

    // Die kaputte Datei wird repariert — wie es nach einem gescheiterten Aufstieg zugeht.
    await writeFile(join(new URL(dir).pathname.replace(/^\//, ""), "002_kaputt.sql"), "CREATE TABLE zweite (id text PRIMARY KEY);", "utf8");
    await migrate(db, dir);
    expect(await angewandt(db)).toEqual(["001_erste.sql", "002_kaputt.sql"]);
  }, 30_000);

  it("wendet nichts doppelt an und ist ein zweites Mal ein Leerlauf", async () => {
    const { db, dir } = await umgebung({ "001_erste.sql": "CREATE TABLE erste (id text PRIMARY KEY);" });
    await migrate(db, dir);
    await migrate(db, dir);
    expect(await angewandt(db)).toEqual(["001_erste.sql"]);
  }, 30_000);

  it("weist eine nachträglich geänderte, bereits angewandte Datei zurück", async () => {
    const { db, dir } = await umgebung({ "001_erste.sql": "CREATE TABLE erste (id text PRIMARY KEY);" });
    await migrate(db, dir);
    await writeFile(join(new URL(dir).pathname.replace(/^\//, ""), "001_erste.sql"), "CREATE TABLE erste (id text PRIMARY KEY, spaeter text);", "utf8");
    await expect(migrate(db, dir)).rejects.toThrow(/Applied migration changed/);
  }, 30_000);
});
