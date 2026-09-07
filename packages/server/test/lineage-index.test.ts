import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";

/**
 * `lineage_events` wächst pro Spielabend und wird nie aufgeräumt. Fünf Lesestellen joinen
 * über `entry_id`, eine über `revision_id`; Postgres indiziert Fremdschlüssel nicht von
 * selbst. Dieser Test hält die beiden Indizes fest, damit sie nicht unbemerkt verschwinden.
 */
describe("lineage_events trägt Indizes auf seinen Fremdschlüsseln", () => {
  let db: Db;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => { await db?.close(); });

  it("indiziert entry_id und revision_id", async () => {
    const namen = (await db.query<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE tablename='lineage_events' ORDER BY indexname",
    )).rows.map((r) => r.indexname);
    expect(namen).toContain("lineage_events_entry_id_idx");
    expect(namen).toContain("lineage_events_revision_id_idx");
  });
});
