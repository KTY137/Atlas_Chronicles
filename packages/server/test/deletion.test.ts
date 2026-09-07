import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createDeletion, LOESCHREIHENFOLGE, UEBERLEBT, UMWEG } from "../src/domain/deletion.ts";
import { Gone } from "../src/domain/errors.ts";

const absatz = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] }, tags: ["spuren"] });

describe("Kampagnenlöschung", () => {
  let db: Db;
  const clock = Date.UTC(2026, 8, 7, 12);
  const cfg = { now: () => clock };
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => { await db?.close(); });

  /** Eine Kampagne mit echtem Inhalt: Einträge, Revisionen, Passagen, Lineage, Enthüllung. */
  async function welt(name: string) {
    const gm = randomUUID(), spieler = randomUUID();
    for (const [id, role] of [[gm, "leitung"], [spieler, "gast"]]) {
      await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$2,$3,$4)", [id, id, role, clock]);
    }
    const campaign = await createCampaigns(db, cfg).createCampaign(gm, { name });
    const actor = randomUUID();
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [actor, campaign.id, spieler, "Sera"]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$3,$4)", [campaign.id, spieler, "Sera", actor]);
    const docs = createDocuments(db, cfg);
    const entry = await docs.saveEntry(gm, campaign.id, { title: `Haus ${name}`, passages: [absatz("Die Spur im Hof"), absatz("Der versiegelte Keller")] });
    await docs.revealPassage(gm, campaign.id, entry.passagen[0]!.pid, actor);
    // Der Trigger feuert FOR EACH ROW — ohne Zeile feuert er nicht. `audit` ist die
    // triggergeschützte Tabelle mit direkter campaign_id, also der Prüfstein für diesen Pfad.
    await db.query("INSERT INTO audit(campaign_id,actor_user_id,kind,data,created_at) VALUES($1,$2,$3,$4,$5)",
      [campaign.id, gm, "campaign.created", JSON.stringify({ name }), clock]);
    return { gm, spieler, campaignId: campaign.id, actor };
  }

  /** PGlite liefert count(*) als Zahl; die Zusicherungen vergleichen deshalb Zahlen. */
  const zaehle = async (table: string, campaignId: string): Promise<number> => {
    const where = UMWEG[table] ?? "campaign_id=$1";
    return Number((await db.query<{ n: string }>(`SELECT count(*) AS n FROM "${table}" WHERE ${where}`, [campaignId])).rows[0]!.n);
  };

  it("deckt jede Tabelle mit campaign_id ab — hergeleitet aus dem laufenden Schema", async () => {
    const imSchema = (await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.columns
       WHERE table_schema='public' AND column_name='campaign_id' ORDER BY table_name`,
    )).rows.map((r) => r.table_name);
    expect(imSchema.length).toBeGreaterThan(60);
    const abgedeckt = new Set([...LOESCHREIHENFOLGE, ...Object.keys(UEBERLEBT)]);
    // campaign_deletions überlebt bewusst: die Quittung ist der Beleg der Löschung.
    abgedeckt.add("campaign_deletions");
    const vergessen = imSchema.filter((t) => !abgedeckt.has(t));
    expect(vergessen).toEqual([]);
  });

  it("nennt keine Tabelle, die es nicht gibt", async () => {
    const vorhanden = new Set((await db.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
    )).rows.map((r) => r.table_name));
    expect(LOESCHREIHENFOLGE.filter((t) => !vorhanden.has(t))).toEqual([]);
  });

  it("weist UPDATE auf Historie weiterhin ausnahmslos ab — auch mit gesetztem Schlüssel", async () => {
    const w = await welt("Update");
    await expect(db.transaction(async (tx) => {
      await tx.query("SELECT set_config('chronicle.deleting_campaign', $1, true)", [w.campaignId]);
      await tx.query("UPDATE audit SET kind='verfaelscht' WHERE campaign_id=$1", [w.campaignId]);
    })).rejects.toThrow(/append-only/);
  });

  it("weist DELETE einer einzelnen Historienzeile ohne Schlüssel ab", async () => {
    const w = await welt("OhneSchluessel");
    await expect(db.query("DELETE FROM audit WHERE campaign_id=$1", [w.campaignId])).rejects.toThrow(/append-only/);
    expect(await zaehle("audit", w.campaignId)).toBeGreaterThan(0);
  });

  it("lässt den Schlüssel einer Kampagne nicht auf eine fremde wirken", async () => {
    const eigen = await welt("Eigen"), fremd = await welt("Fremd");
    await expect(db.transaction(async (tx) => {
      await tx.query("SELECT set_config('chronicle.deleting_campaign', $1, true)", [eigen.campaignId]);
      await tx.query("DELETE FROM audit WHERE campaign_id=$1", [fremd.campaignId]);
    })).rejects.toThrow(/append-only/);
    expect(await zaehle("audit", fremd.campaignId)).toBeGreaterThan(0);
  });

  it("entfernt die Kampagne vollständig, lässt die andere und die Nutzer unberührt", async () => {
    const weg = await welt("Verschwindet"), bleibt = await welt("Bleibt");
    const vorher = await zaehle("lineage_events", weg.campaignId);
    expect(vorher).toBeGreaterThan(0);

    const quittung = await createDeletion(db, cfg).deleteCampaign(weg.gm, weg.campaignId);

    for (const table of LOESCHREIHENFOLGE) {
      expect({ table, n: await zaehle(table, weg.campaignId) }).toEqual({ table, n: 0 });
    }
    expect(await zaehle("lineage_events", bleibt.campaignId)).toBe(vorher);
    expect(await zaehle("campaigns", bleibt.campaignId)).toBe(1);
    // Nutzer überleben: sie gehören keiner Kampagne.
    expect((await db.query("SELECT id FROM users WHERE id=$1", [weg.gm])).rowCount).toBe(1);
    expect((await db.query("SELECT id FROM users WHERE id=$1", [weg.spieler])).rowCount).toBe(1);

    expect(quittung.campaignName).toBe("Verschwindet");
    expect(quittung.rowCounts["entries"]).toBe(1);
    expect(quittung.rowCounts["campaigns"]).toBe(1);
    const beleg = (await db.query<{ campaign_name: string }>("SELECT campaign_name FROM campaign_deletions WHERE campaign_id=$1", [weg.campaignId])).rows[0];
    expect(beleg?.campaign_name).toBe("Verschwindet");
  });

  it("schließt den Riegel nach der Transaktion wieder", async () => {
    const w = await welt("Danach");
    await createDeletion(db, cfg).deleteCampaign(w.gm, w.campaignId);
    const rest = await welt("Rest");
    await expect(db.query("DELETE FROM audit WHERE campaign_id=$1", [rest.campaignId])).rejects.toThrow(/append-only/);
  });

  it("verlangt die Spielleitung und antwortet sonst mit derselben 404", async () => {
    const w = await welt("Rechte");
    await expect(createDeletion(db, cfg).deleteCampaign(w.spieler, w.campaignId)).rejects.toBeInstanceOf(Gone);
    expect(await zaehle("campaigns", w.campaignId)).toBe(1);
  });
});
