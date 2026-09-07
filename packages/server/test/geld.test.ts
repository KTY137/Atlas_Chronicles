import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createGeld } from "../src/domain/geld.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { seedActorControl } from "./actor-fixtures.ts";

// Der Geldzaehler ist eine Zahl, die der Figur gehoert — nicht dem Bogen und nicht einem Beutel.
// Zwei Aussagen tragen ihn: wer die Figur fuehrt, fuehrt ihre Boerse, und jede Aenderung nennt
// die erwartete Fassung.
const config = { origin: "https://geld.test", cookieSecret: "geld-cookie-secret-with-more-than-32-characters-ok" };
const time = Date.UTC(2026, 8, 7, 12), cfg = { now: () => time };

describe("Der Geldzähler", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => db?.close());

  async function fixture() {
    const campaign = (await createCampaigns(db, cfg).createCampaign(gm, { name: "Der Markt" })).id;
    const spieler = randomUUID(), fremd = randomUUID(), actorId = randomUUID(), fremdActor = randomUUID();
    for (const [id, name] of [[spieler, "Sera"], [fremd, "Andere"]] as const)
      await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,$2,$3)", [id, name, time]);
    for (const [id, user, name, skeleton] of [[actorId, spieler, "Sera", "sera"], [fremdActor, fremd, "Andere", "andere"]] as const) {
      await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [id, campaign, user, name]);
      await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$4,$5)", [campaign, user, name, skeleton, id]);
      await seedActorControl(db, campaign, id, user);
    }
    return { campaign, spieler, fremd, actorId, fremdActor, geld: createGeld(db, cfg) };
  }

  it("beginnt bei null und ohne Namen", async () => {
    const f = await fixture();
    // Fassung 0 heisst: es gibt noch keine Zeile. Eine Figur ohne Boerse hat null, nicht "nichts".
    expect(await f.geld.bestand(f.spieler, f.campaign, f.actorId)).toEqual({ actorId: f.actorId, betrag: 0, version: 0 });
    expect(await f.geld.einheit(f.spieler, f.campaign)).toBeNull();
  });

  it("nennt das Geld dieser Runde und lässt die Spielleitung es umbenennen", async () => {
    const f = await fixture();
    const gesetzt = await f.geld.einheitSetzen(gm, f.campaign, { name: "Silbertaler", expectedVersion: 0 });
    expect(gesetzt).toEqual({ name: "Silbertaler", version: 1 });
    expect(await f.geld.einheit(f.spieler, f.campaign)).toEqual({ name: "Silbertaler", version: 1 });
    expect(await f.geld.einheitSetzen(gm, f.campaign, { name: "Kronen", expectedVersion: 1 })).toEqual({ name: "Kronen", version: 2 });
    // Ein veralteter Stand wird abgewiesen, nicht überschrieben.
    await expect(f.geld.einheitSetzen(gm, f.campaign, { name: "Muscheln", expectedVersion: 1 })).rejects.toBeInstanceOf(Conflict);
    // Und die Runde benennt ihr Geld nicht selbst.
    await expect(f.geld.einheitSetzen(f.spieler, f.campaign, { name: "Gold", expectedVersion: 2 })).rejects.toBeInstanceOf(Gone);
    await expect(f.geld.einheitSetzen(gm, f.campaign, { name: "   ", expectedVersion: 2 })).rejects.toBeInstanceOf(Conflict);
  });

  it("lässt führen, wer die Figur führt", async () => {
    const f = await fixture();
    const erst = await f.geld.setzen(f.spieler, f.campaign, f.actorId, { betrag: 40, expectedVersion: 0 });
    expect(erst).toEqual({ actorId: f.actorId, betrag: 40, version: 1 });
    // Die Spielleitung darf ebenfalls — sie fuehrt alle Figuren.
    expect(await f.geld.setzen(gm, f.campaign, f.actorId, { betrag: 55, expectedVersion: 1 })).toMatchObject({ betrag: 55, version: 2 });
    // Eine fremde Boerse bleibt zu.
    await expect(f.geld.setzen(f.fremd, f.campaign, f.actorId, { betrag: 999, expectedVersion: 2 })).rejects.toBeInstanceOf(Gone);
    await expect(f.geld.bestand(f.fremd, f.campaign, f.actorId)).rejects.toBeInstanceOf(Gone);
  });

  it("weist den zweiten Kauf mit veraltetem Stand ab, statt ihn zu verschlucken", async () => {
    // Zwei Leute kaufen gleichzeitig. Ein `+5`-Befehl waere bequemer und wuerde den Verlust
    // verstecken; die erwartete Fassung macht ihn sichtbar.
    const f = await fixture();
    await f.geld.setzen(f.spieler, f.campaign, f.actorId, { betrag: 100, expectedVersion: 0 });
    await f.geld.setzen(gm, f.campaign, f.actorId, { betrag: 80, expectedVersion: 1 });
    await expect(f.geld.setzen(f.spieler, f.campaign, f.actorId, { betrag: 90, expectedVersion: 1 })).rejects.toBeInstanceOf(Conflict);
    expect((await f.geld.bestand(gm, f.campaign, f.actorId)).betrag).toBe(80);
  });

  it("kennt keine Schulden und keine krummen Beträge", async () => {
    const f = await fixture();
    for (const betrag of [-1, 1.5, Number.NaN, Number.MAX_VALUE])
      await expect(f.geld.setzen(f.spieler, f.campaign, f.actorId, { betrag, expectedVersion: 0 })).rejects.toBeInstanceOf(Conflict);
    expect((await f.geld.bestand(f.spieler, f.campaign, f.actorId)).version).toBe(0);
    // Null ist erlaubt: eine leere Boerse ist ein Zustand, kein Fehler.
    expect(await f.geld.setzen(f.spieler, f.campaign, f.actorId, { betrag: 0, expectedVersion: 0 })).toMatchObject({ betrag: 0, version: 1 });
  });

  it("gibt der Spielleitung den Überblick, der Runde nicht", async () => {
    const f = await fixture();
    await f.geld.setzen(f.spieler, f.campaign, f.actorId, { betrag: 12, expectedVersion: 0 });
    await f.geld.setzen(f.fremd, f.campaign, f.fremdActor, { betrag: 7, expectedVersion: 0 });
    expect((await f.geld.alle(gm, f.campaign)).map(s => s.betrag).sort((a, b) => a - b)).toEqual([7, 12]);
    // Wer wie viel hat, ist Sache der Spielleitung — nicht des Tisches.
    await expect(f.geld.alle(f.spieler, f.campaign)).rejects.toBeInstanceOf(Gone);
  });
});
