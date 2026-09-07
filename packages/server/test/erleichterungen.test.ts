import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createErleichterungen } from "../src/domain/erleichterungen.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { seedActorControl } from "./actor-fixtures.ts";

// Eine Erleichterung ist eine festgehaltene Absprache: die Spielleitung gewährt sie, die
// Spielerin würfelt sie SELBST. Der Kern ist, dass die Zahlen aus der Zeile kommen und nicht
// aus der Anfrage — sonst wäre das Zugeständnis nur ein Vorwand, eigene Werte zu setzen.
const time = Date.UTC(2026, 8, 7, 12), SEED = "00000001000000020000000300000004";
const cfg = { now: () => time, seed: () => SEED };
const pin = { packageId: HOW_TO_BE_A_HERO_PACKAGE.id, packageVersion: HOW_TO_BE_A_HERO_PACKAGE.version };
/** Die vom Regelwerk sanktionierte Absprache-Aktion: Endwert und kritische Grenzen ausdrücklich. */
const abgesprochen = (target: number) => ({ target, critical_success_max: 5, critical_failure_min: 95, skill_check: true });

describe("Erleichterungen", () => {
  let db: Db;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => db?.close());

  async function fixture() {
    const gm = randomUUID(), spieler = randomUUID(), fremd = randomUUID(), actorId = randomUUID(), fremdActor = randomUUID();
    await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,'GM','leitung',$4),($2,'Held','gast',$4),($3,'Andere','gast',$4)", [gm, spieler, fremd, time]);
    const campaignId = (await createCampaigns(db, cfg).createCampaign(gm, { name: "Zugeständnis" })).id;
    for (const [id, user, name, skeleton] of [[actorId, spieler, "Held", "held"], [fremdActor, fremd, "Andere", "andere"]] as const) {
      await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [id, campaignId, user, name]);
      await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$4,$5)", [campaignId, user, name, skeleton, id]);
      await seedActorControl(db, campaignId, id, user);
    }
    const game = createGameplay(db, cfg), zug = createErleichterungen(db, cfg);
    await game.installPackage(gm, campaignId, HOW_TO_BE_A_HERO_PACKAGE);
    const review = await game.previewPackage(gm, campaignId, HOW_TO_BE_A_HERO_PACKAGE);
    await game.activatePackage(gm, campaignId, { ...pin, expectedVersion: 0, previewHash: review.previewHash });
    for (const [id, user] of [[actorId, spieler], [fremdActor, fremd]] as const)
      await game.updateSheet(user, campaignId, { actorId: id, expectedVersion: 0, fields: { ...HTBAH_EXAMPLE_CHARACTERS[0]!.fields } });
    return { gm, spieler, fremd, actorId, fremdActor, campaignId, game, zug };
  }
  type F = Awaited<ReturnType<typeof fixture>>;
  const gewaehren = (f: F, target = 70, aktion = "skill_klettern", actorId = f.actorId) =>
    f.zug.gewaehren(f.gm, f.campaignId, { actorId, gemeinteAktion: aktion, gewuerfelteAktion: "manual_ruling",
      eingaben: abgesprochen(target), grund: "Du hast das Seil vorher gesichert." });

  it("gewährt ein Zugeständnis, das die Spielerin selbst würfelt", async () => {
    const f = await fixture();
    const zugestaendnis = await gewaehren(f);
    expect(zugestaendnis).toMatchObject({ actorId: f.actorId, gemeinteAktion: "skill_klettern", gewuerfelteAktion: "manual_ruling", eingeloestRollId: null });
    expect(zugestaendnis.gewaehrtVon).toBe(f.gm);
    // Die Spielerin sieht, was ihr zugestanden wurde — samt Begründung.
    expect((await f.zug.offene(f.spieler, f.campaignId, f.actorId)).map(e => e.grund)).toEqual(["Du hast das Seil vorher gesichert."]);

    // Und sie wirft selbst. Der Wurf ist ihrer: prepared_by ist sie, nicht die Spielleitung.
    const wurf = await f.game.prepareAction(f.spieler, f.campaignId, { commandId: randomUUID(), actorId: f.actorId, actionId: "manual_ruling", erleichterungId: zugestaendnis.id });
    expect(wurf.receipt.action.id).toBe("manual_ruling");
    expect(wurf.receipt.context?.input).toMatchObject({ target: 70 });
    expect((await f.game.replayRoll(f.spieler, f.campaignId, wurf.id)).valid).toBe(true);
    // Danach ist sie eingelöst und zeigt auf genau diesen Wurf.
    expect(await f.zug.offene(f.spieler, f.campaignId, f.actorId)).toEqual([]);
  });

  it("nimmt die Zahlen aus der Zeile, nicht aus der Anfrage", async () => {
    // Der Kern der Sache. Wer einlöst, sagt WELCHE Erleichterung — nicht, was sie zugesteht.
    const f = await fixture();
    const zugestaendnis = await gewaehren(f, 70);
    const wurf = await f.game.prepareAction(f.spieler, f.campaignId, {
      commandId: randomUUID(), actorId: f.actorId, actionId: "damage",
      input: { target: 99, critical_success_max: 99, critical_failure_min: 100, skill_check: true },
      erleichterungId: zugestaendnis.id,
    });
    expect(wurf.receipt.action.id).toBe("manual_ruling");
    expect(wurf.receipt.context?.input).toMatchObject({ target: 70, critical_success_max: 5 });
  });

  it("lässt sich nur einmal einlösen", async () => {
    const f = await fixture();
    const zugestaendnis = await gewaehren(f);
    await f.game.prepareAction(f.spieler, f.campaignId, { commandId: randomUUID(), actorId: f.actorId, actionId: "manual_ruling", erleichterungId: zugestaendnis.id });
    // Ein zweites Mal waere ein Dauerbonus — und den hat das Regelwerk ausdruecklich nicht.
    await expect(f.game.prepareAction(f.spieler, f.campaignId, { commandId: randomUUID(), actorId: f.actorId, actionId: "manual_ruling", erleichterungId: zugestaendnis.id }))
      .rejects.toBeInstanceOf(Gone);
  });

  it("lässt höchstens ein offenes Zugeständnis je Figur und Probe zu", async () => {
    const f = await fixture();
    await gewaehren(f, 70);
    await expect(gewaehren(f, 90)).rejects.toBeInstanceOf(Conflict);
    // Für eine ANDERE Probe geht es: gestapelt wird nur dieselbe.
    await gewaehren(f, 80, "skill_feinmechanik");
    expect((await f.zug.offene(f.gm, f.campaignId)).length).toBe(2);
  });

  it("gehört der Spielleitung: gewähren, widerrufen, überblicken", async () => {
    const f = await fixture();
    await expect(f.zug.gewaehren(f.spieler, f.campaignId, { actorId: f.actorId, gemeinteAktion: "skill_klettern", gewuerfelteAktion: "manual_ruling", eingaben: abgesprochen(99), grund: "Weil ich es will." }))
      .rejects.toBeInstanceOf(Gone);
    // Ein Zugestaendnis ohne Begruendung ist eine Zahl ohne Absprache.
    await expect(f.zug.gewaehren(f.gm, f.campaignId, { actorId: f.actorId, gemeinteAktion: "skill_klettern", gewuerfelteAktion: "manual_ruling", eingaben: abgesprochen(70), grund: "   " }))
      .rejects.toBeInstanceOf(Conflict);
    // Der Gesamtueberblick ist Sache der Leitung; eine Spielerin sieht nur ihre eigene Figur.
    await expect(f.zug.offene(f.spieler, f.campaignId)).rejects.toBeInstanceOf(Gone);

    const zugestaendnis = await gewaehren(f);
    await expect(f.zug.widerrufen(f.spieler, f.campaignId, zugestaendnis.id)).rejects.toBeInstanceOf(Gone);
    await f.zug.widerrufen(f.gm, f.campaignId, zugestaendnis.id);
    // Zurueckgenommen heisst nicht geloescht — aber eingeloest wird es nicht mehr.
    await expect(f.game.prepareAction(f.spieler, f.campaignId, { commandId: randomUUID(), actorId: f.actorId, actionId: "manual_ruling", erleichterungId: zugestaendnis.id }))
      .rejects.toBeInstanceOf(Gone);
    await expect(f.zug.widerrufen(f.gm, f.campaignId, zugestaendnis.id)).rejects.toBeInstanceOf(Gone);
  });

  it("gehört der Figur, der es gewährt wurde", async () => {
    const f = await fixture();
    const zugestaendnis = await gewaehren(f);
    // Eine fremde Figur kann es weder sehen noch einloesen.
    await expect(f.zug.offene(f.fremd, f.campaignId, f.actorId)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.prepareAction(f.fremd, f.campaignId, { commandId: randomUUID(), actorId: f.fremdActor, actionId: "manual_ruling", erleichterungId: zugestaendnis.id }))
      .rejects.toBeInstanceOf(Gone);
    expect((await f.zug.offene(f.gm, f.campaignId)).map(e => e.id)).toEqual([zugestaendnis.id]);
  });
});
