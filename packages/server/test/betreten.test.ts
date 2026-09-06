import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Knoten } from "@chronicle/szene";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createTactical } from "../src/domain/tactical.ts";
import { createBetreten } from "../src/domain/betreten.ts";
import { Gone } from "../src/domain/errors.ts";

/**
 * A-G2's missing half: not "does the chain exist in data" (that is `kette.test.ts`, in
 * `@chronicle/forge`) but "can anyone walk it." `betreten.ts` is the address; these tests are
 * what keep the address honest — idempotent per node, seeded only by the node, and closed to
 * everyone but `leitung`.
 *
 * Node fixtures are inserted directly into `atlas_nodes` rather than through a real Azgaar
 * import (`createAtlas(db).importMap`, which needs a full multi-thousand-row export like
 * `packages/forge/test/fixtures/azgaar-full.json.gz`). That importer is exercised elsewhere
 * (`atlas.test.ts`, `kette.test.ts`); what is under test here is only what `betreten.ts` does
 * with a `Knoten` row once one exists, so a minimal hand-built row is the more honest fixture.
 */
describe("Der Zugang — die Adresse, die man begehen kann", () => {
  let db: Db, gm: string, spieler: string, campaign: string;
  const config = { origin: "https://betreten.test", cookieSecret: "betreten-test-cookie-secret-more-than-32-characters" };

  beforeAll(async () => {
    db = await createTestDb();
    await migrate(db);
    const identity = createIdentity(db, config);
    gm = (await identity.bootstrap("Kaya")).userId;
    campaign = (await createCampaigns(db).createCampaign(gm, { name: "Zugang" })).id;
    const campaigns = createCampaigns(db);
    const invite = await campaigns.issueInvitation(gm, campaign);
    const join = await campaigns.requestJoin(invite.code, { displayName: "Spieler" });
    spieler = (await campaigns.approveJoin(gm, campaign, join.id)).userId;
  }, 30_000);
  afterAll(async () => { await db?.close(); });

  /**
   * Hand-built node row. `herkunft.kindKeim` mirrors exactly what `azgaar.ts:245,247` writes
   * onto both `Ort.kindKeim` and the imported `Knoten`'s own `herkunft.kindKeim` for a burg —
   * the field `betreten.ts` actually reads.
   */
  async function seedKnoten(opts: { titel: string | null; kindKeim?: string }): Promise<string> {
    const id = randomUUID(), artifactId = randomUUID(), mapId = randomUUID(), at = Date.now();
    await db.query(
      "INSERT INTO artifacts(id,campaign_id,kind,source_hash,source,report,created_by,created_at) VALUES($1,$2,'test',$3,'{}','{}',$4,$5)",
      [artifactId, campaign, randomUUID(), gm, at],
    );
    await db.query(
      "INSERT INTO atlas_maps(id,campaign_id,artifact_id,title,width,height,created_at) VALUES($1,$2,$3,'Testkarte',10,10,$4)",
      [mapId, campaign, artifactId, at],
    );
    const knoten: Knoten = {
      id: id as Knoten["id"], art: "ort", titel: opts.titel, eltern: [],
      rahmen: { ursprung: [0, 0], einheitenProPixel: 1, ordnung: "xy", hoch: "unten" },
      anker: null, sichtAnker: null,
      herkunft: {
        erzeuger: "test", version: "1", keimHash: "0".repeat(64), erzeugungspfad: ["ort", id],
        ...(opts.kindKeim !== undefined ? { kindKeim: opts.kindKeim } : {}),
      },
    };
    await db.query("INSERT INTO atlas_nodes(map_id,id,campaign_id,data) VALUES($1,$2,$3,$4)", [mapId, id, campaign, JSON.stringify(knoten)]);
    return id;
  }

  const input = (knotenId: string, over: Partial<{ commandId: string; name: string }> = {}) => ({ commandId: randomUUID(), knotenId, ...over });

  it("meldet einen Knoten mit Kindkeim als begehbar", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Die Gruft", kindKeim: "seed-eins-0001" });
    const status = await betreten.betretbar(gm, campaign, knotenId);
    expect(status.kindKeim).toBe("seed-eins-0001");
    expect(status.vorhandeneKarteId).toBeNull();
    expect(status.titel).toBe("Die Gruft");
  });

  it("erzeugt beim Betreten eine Karte und persistiert sie", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Die zweite Gruft", kindKeim: "seed-zwei-0002" });
    const result = await betreten.betrete(gm, campaign, input(knotenId));
    expect(result.erzeugt).toBe(true);
    expect(result.mapId).toBeTruthy();
    expect(result.keimHash).toMatch(/^[a-f0-9]{64}$/);
    // Read through the canonical path, not through `betreten.ts`'s own storage — the point
    // is that the generated map is an ordinary tactical map, indistinguishable from one a GM
    // imported by hand.
    const map = await createTactical(db).getMap(gm, campaign, result.mapId);
    expect(map.document.kind).toBe("tactical-map");
  });

  it("betritt man denselben Knoten erneut, kommt dieselbe Karte zurück, nicht erzeugt", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Dritte Gruft", kindKeim: "seed-drei-0003" });
    const erste = await betreten.betrete(gm, campaign, input(knotenId, { name: "Erster Besuch" }));
    // A different commandId and a different cosmetic name: idempotency must be keyed on the
    // node, not on replaying the same request (module doc point 3).
    const zweite = await betreten.betrete(gm, campaign, input(knotenId, { name: "Zweiter Besuch" }));
    expect(zweite.erzeugt).toBe(false);
    expect(zweite.mapId).toBe(erste.mapId);
    const status = await betreten.betretbar(gm, campaign, knotenId);
    expect(status.vorhandeneKarteId).toBe(erste.mapId);
  });

  it("derselbe Knoten liefert bei zwei Aufrufen denselben keimHash", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Vierte Gruft", kindKeim: "seed-vier-0004" });
    const erste = await betreten.betrete(gm, campaign, input(knotenId));
    const zweite = await betreten.betrete(gm, campaign, input(knotenId));
    expect(zweite.keimHash).toBe(erste.keimHash);
  });

  it("meldet einen Knoten ohne Kindkeim ehrlich als nicht begehbar, und Erzeugen wird verweigert", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Nur ein Marktplatz" });
    const status = await betreten.betretbar(gm, campaign, knotenId);
    expect(status.kindKeim).toBeNull();
    await expect(betreten.betrete(gm, campaign, input(knotenId))).rejects.toBeInstanceOf(Gone);
    expect(await betreten.betretbar(gm, campaign, knotenId)).toMatchObject({ vorhandeneKarteId: null });
  });

  it("verweigert einem Mitglied ohne Leitung das Betreten, und es entsteht keine Karte", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Fünfte Gruft", kindKeim: "seed-fuenf-0005" });
    await expect(betreten.betrete(spieler, campaign, input(knotenId))).rejects.toBeInstanceOf(Gone);
    const status = await betreten.betretbar(gm, campaign, knotenId);
    expect(status.vorhandeneKarteId).toBeNull();
  });

  it("verweigert einen unbekannten Knoten, statt etwas zu erfinden", async () => {
    const betreten = createBetreten(db, config);
    const unbekannt = randomUUID();
    await expect(betreten.betretbar(gm, campaign, unbekannt)).rejects.toBeInstanceOf(Gone);
    await expect(betreten.betrete(gm, campaign, input(unbekannt))).rejects.toBeInstanceOf(Gone);
  });

  it("die erzeugte Kindkarte ist über den gewöhnlichen taktischen Lesepfad lesbar", async () => {
    const betreten = createBetreten(db, config);
    const knotenId = await seedKnoten({ titel: "Sechste Gruft", kindKeim: "seed-sechs-0006" });
    const result = await betreten.betrete(gm, campaign, input(knotenId));
    const tactical = createTactical(db);
    const maps = await tactical.listMaps(gm, campaign);
    expect(maps.some((m) => m.id === result.mapId)).toBe(true);
    const map = await tactical.getMap(gm, campaign, result.mapId);
    expect(map.document.geometry.regions.length).toBeGreaterThan(0);
    // A generated map has no photograph — same invariant `grundriss.test.ts` guards.
    expect(map.document.background).toBeNull();
  });
});
