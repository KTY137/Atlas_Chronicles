// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type AnyRulePackage, type Scalar } from "@chronicle/rules";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS } from "@chronicle/rules/examples";
import { createPgDb, createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { seedActorControl } from "./actor-fixtures.ts";

// Ein Kampf ist keine einzelne Probe. Diese Datei fährt die Kette, die am Tisch wirklich
// vorkommt — Initiative, Angriff, Schaden, sinkende Lebenspunkte, Niederlage — gegen das
// AUSGELIEFERTE Regelwerk (How to be a Hero, Schema v2). Die Bausteine sind einzeln geprüft;
// geprüft war bisher nicht, ob sie zusammen einen Kampf ergeben.
const SEED = "00000001000000020000000300000004", time = Date.UTC(2026, 8, 6, 12);
const cfg = { now: () => time, seed: () => SEED };
const pin = (pkg: AnyRulePackage) => ({ packageId: pkg.id, packageVersion: pkg.version });
const fields = () => ({ ...HTBAH_EXAMPLE_CHARACTERS[0]!.fields });

// TEST_DATABASE_URL selects an isolated disposable schema, never the operative public schema.
describe("Kampf mit dem ausgelieferten Regelwerk", () => {
  let db: Db, admin: Db | undefined;
  const schema = `chronicle_kampf_${randomUUID().replaceAll("-", "")}`;
  beforeAll(async () => {
    const connection = process.env["TEST_DATABASE_URL"];
    if (connection) {
      admin = createPgDb(connection); await admin.query(`CREATE SCHEMA "${schema}"`);
      const url = new URL(connection); url.searchParams.set("options", `-c search_path=${schema}`);
      db = createPgDb(url.href);
    } else db = await createTestDb();
    await migrate(db);
  }, 30_000);
  afterAll(async () => {
    await db?.close();
    if (admin) {
      try { if (!/^chronicle_kampf_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected test schema"); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
      finally { await admin.close(); }
    }
  });

  async function fixture(pkg: AnyRulePackage = HOW_TO_BE_A_HERO_PACKAGE) {
    const gm = randomUUID(), player = randomUUID(), actorId = randomUUID();
    await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,'GM','leitung',$3),($2,'Held','gast',$3)", [gm, player, time]);
    const campaignId = (await createCampaigns(db, cfg).createCampaign(gm, { name: "Kampf" })).id;
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Held')", [actorId, campaignId, player]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Held','held',$3)", [campaignId, player, actorId]);
    await seedActorControl(db, campaignId, actorId, player);
    const game = createGameplay(db, cfg);
    await game.installPackage(gm, campaignId, pkg);
    const review = await game.previewPackage(gm, campaignId, pkg);
    await game.activatePackage(gm, campaignId, { ...pin(pkg), expectedVersion: 0, previewHash: review.previewHash });
    return { gm, player, actorId, campaignId, game, pkg };
  }
  type Fixture = Awaited<ReturnType<typeof fixture>>;
  const save = (f: Fixture, value: Record<string, Scalar>, expectedVersion: number) =>
    f.game.updateSheet(f.player, f.campaignId, { actorId: f.actorId, expectedVersion, fields: value });
  const wurf = (f: Fixture, actionId: string, input: Record<string, Scalar> = {}) =>
    f.game.prepareAction(f.player, f.campaignId, { commandId: randomUUID(), actorId: f.actorId, actionId, input });
  async function passage(f: Fixture) {
    const entry = await createDocuments(db, cfg).saveEntry(f.gm, f.campaignId, { title: "Der Hinterhalt", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "Der Held fällt", marks: [] }] } }] });
    return entry.passagen[0]!.pid;
  }

  it("würfelt Initiative, Angriff und Schaden aus einem einzigen bestätigten Bogen", async () => {
    const f = await fixture();
    const bogen = await save(f, fields(), 0);
    expect(bogen.fields.hp).toBe(100);

    // Initiative: 1d10 plus abgeleitete Begabung Handeln. Kein Ergebnisband, nur eine Zahl.
    const initiative = await wurf(f, "initiative");
    expect(initiative.receipt.total).toBeGreaterThan(0);
    expect(initiative.receipt.dice.some(die => die.sides === 10)).toBe(true);

    // Angriff: eine gelernte Fertigkeit mit klassifiziertem Ergebnis.
    const angriff = await wurf(f, "skill_klettern");
    expect(angriff.receipt.schemaVersion).toBe(2);
    expect(angriff.receipt.schemaVersion === 2 ? angriff.receipt.outcome?.id : undefined)
      .toMatch(/^(critical_success|critical_failure|success|failure)$/);

    // Schaden: 3W10 plus abgesprochener Bonus, kritisch verdoppelt.
    const schaden = await wurf(f, "damage", { dice_count: 3, bonus: 2, critical: true });
    expect(schaden.receipt.dice.filter(die => die.sides === 10).length).toBeGreaterThan(0);
    expect(schaden.receipt.total).toBeGreaterThanOrEqual((3 + 2) * 2);

    // Jeder dieser Würfe ist nachrechenbar — das ist die Zusicherung, auf der der Kampf sitzt.
    for (const karte of [initiative, angriff, schaden])
      expect((await f.game.replayRoll(f.player, f.campaignId, karte.id)).valid).toBe(true);
  });

  it("führt eine Figur über Schaden bis zur bestätigten Niederlage", async () => {
    const f = await fixture();
    let bogen = await save(f, fields(), 0);
    expect(bogen.fields.hp).toBe(100);
    expect(bogen.defeatPending).toBe(false);

    // Ein ausgewürfelter Treffer zieht Lebenspunkte ab. Für Schema v2 ist der versionierte
    // Bogenschreibvorgang der einzige zugelassene Weg — adjustResource lehnt v2 ausdrücklich ab.
    const treffer = await wurf(f, "damage", { dice_count: 3, bonus: 5, critical: false });
    const rest = Math.max(0, Number(bogen.fields.hp) - treffer.receipt.total);
    bogen = await save(f, { ...bogen.fields, hp: rest }, bogen.version);
    expect(bogen.fields.hp).toBe(rest);
    expect(bogen.fields.hp).toBeLessThan(100);

    // Der letzte Treffer bringt die Figur auf 0. Ab hier muss die Niederlage anstehen —
    // sonst bietet die Oberfläche einen Zustand an, hinter dem nichts Bedienbares liegt.
    bogen = await save(f, { ...bogen.fields, hp: 0 }, bogen.version);
    expect(bogen.fields.hp).toBe(0);
    expect(bogen.defeatPending).toBe(true);
    expect(bogen.defeatedAt).toBeNull();

    // Und die Spielleitung kann sie versiegeln — mit einer Passage als Beleg in der Chronik.
    const eingabe = { commandId: randomUUID(), passageId: await passage(f), actorId: f.actorId, expectedVersion: bogen.version, fictionDate: "Nebelmond" };
    const beleg = await f.game.confirmDefeat(f.gm, f.campaignId, eingabe);
    expect(beleg.kind).toBe("gesprochen");
    const danach = await f.game.getSheet(f.gm, f.campaignId, f.actorId);
    expect(danach.defeatPending).toBe(false);
    expect(danach.defeatedAt).toBe(time);
  });
});
