// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPgDb, createTestDb, migrate, type Db } from "../src/db/index.ts";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS } from "@chronicle/rules/examples";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { seedActorControl } from "./actor-fixtures.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createKampfbuehne, type Seite } from "../src/domain/kampfbuehne.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { buildApp } from "../src/app.ts";
import { createIdentity } from "../src/identity/index.ts";

// Die Bühne ist die abstrakte Schwester der taktischen Karte: keine Koordinaten, sondern zwei
// Reihen, eine Reihenfolge, ein Rundenzähler. Diese Datei fährt genau das, was am Tisch
// vorkommt — aufstellen, eröffnen, reihum, neue Runde, jemand fällt weg, Schluss.
const time = Date.UTC(2026, 8, 7, 12), cfg = { now: () => time };

describe("Die Kampfbühne", () => {
  let db: Db, admin: Db | undefined;
  const schema = `chronicle_buehne_${randomUUID().replaceAll("-", "")}`;
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
      try { if (!/^chronicle_buehne_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected test schema"); await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
      finally { await admin.close(); }
    }
  });

  async function fixture() {
    const gm = randomUUID(), spieler = randomUUID(), actorId = randomUUID();
    await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,'GM','leitung',$3),($2,'Held','gast',$3)", [gm, spieler, time]);
    const campaignId = (await createCampaigns(db, cfg).createCampaign(gm, { name: "Bühne" })).id;
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Held')", [actorId, campaignId, spieler]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Held','held',$3)", [campaignId, spieler, actorId]);
    return { gm, spieler, actorId, campaignId, buehne: createKampfbuehne(db, cfg) };
  }
  type Fixture = Awaited<ReturnType<typeof fixture>>;

  const stellen = (f: Fixture, kampfId: string, name: string, initiative: number, seite: Seite = "gefaehrten", actorId?: string) =>
    f.buehne.teilnehmerHinzufuegen(f.gm, f.campaignId, kampfId, { name, seite, initiative, actorId: actorId ?? null });
  const namen = (kampf: { teilnehmer: readonly { name: string }[] }) => kampf.teilnehmer.map(t => t.name);
  const amZug = (kampf: { teilnehmer: readonly { name: string; amZug: boolean }[] }) => kampf.teilnehmer.find(t => t.amZug)?.name ?? null;

  it("ordnet nach Initiative und entscheidet Gleichstände nach der Aufnahme", async () => {
    const f = await fixture();
    const kampf = await f.buehne.anlegen(f.gm, f.campaignId, { name: "Der Hinterhalt" });
    expect(kampf).toMatchObject({ zustand: "vorbereitet", runde: 0, beendetAm: null, teilnehmer: [] });

    await stellen(f, kampf.id, "Späher", 12, "gegner");
    await stellen(f, kampf.id, "Held", 17, "gefaehrten", f.actorId);
    // Zwei mit derselben Initiative: die zuerst Aufgenommene steht vorn, und zwar dauerhaft.
    await stellen(f, kampf.id, "Wolf A", 12, "gegner");
    const voll = await stellen(f, kampf.id, "Fährtenleser", 20, "neutral");

    expect(namen(voll)).toEqual(["Fährtenleser", "Held", "Späher", "Wolf A"]);
    expect(voll.teilnehmer.map(t => t.seite)).toEqual(["neutral", "gefaehrten", "gegner", "gegner"]);
    expect(voll.teilnehmer.find(t => t.name === "Held")?.actorId).toBe(f.actorId);
    // Wer von Hand gesetzt wurde, hat keinen Beleg — und sagt das, statt es zu verschweigen.
    expect(voll.teilnehmer.every(t => t.initiativeRollId === null)).toBe(true);
    // Die Reihenfolge ist eine Eigenschaft der Bühne, nicht des Aufrufs: erneut gelesen dieselbe.
    expect(namen(await f.buehne.buehne(f.spieler, f.campaignId, kampf.id))).toEqual(namen(voll));
  });

  it("führt reihum und zählt die Runde beim Rücksprung an den Anfang", async () => {
    const f = await fixture();
    const kampf = await f.buehne.anlegen(f.gm, f.campaignId, { name: "Reihum" });
    await stellen(f, kampf.id, "Erste", 20);
    await stellen(f, kampf.id, "Zweite", 10, "gegner");

    // Vor der Eröffnung ist niemand dran — sonst gäbe es einen Zug ohne Kampf.
    expect(amZug(await f.buehne.buehne(f.gm, f.campaignId, kampf.id))).toBeNull();
    let stand = await f.buehne.eroeffnen(f.gm, f.campaignId, kampf.id);
    expect(stand).toMatchObject({ zustand: "laufend", runde: 1 });
    expect(amZug(stand)).toBe("Erste");

    stand = await f.buehne.naechsterZug(f.gm, f.campaignId, kampf.id, stand.teilnehmer[0]!.id, stand.runde);
    expect(amZug(stand)).toBe("Zweite");
    expect(stand.runde).toBe(1);

    // Der Rücksprung an den Anfang IST die neue Runde — kein Zähler, den die Oberfläche führt.
    stand = await f.buehne.naechsterZug(f.gm, f.campaignId, kampf.id, stand.teilnehmer[1]!.id, stand.runde);
    expect(amZug(stand)).toBe("Erste");
    expect(stand.runde).toBe(2);
  });

  it("weist den zweiten Klick auf denselben Zug ab, statt jemanden zu überspringen", async () => {
    const f = await fixture();
    const kampf = await f.buehne.anlegen(f.gm, f.campaignId, { name: "Doppelklick" });
    await stellen(f, kampf.id, "A", 30); await stellen(f, kampf.id, "B", 20); await stellen(f, kampf.id, "C", 10);
    const offen = await f.buehne.eroeffnen(f.gm, f.campaignId, kampf.id);
    const a = offen.teilnehmer[0]!.id;

    const nach = await f.buehne.naechsterZug(f.gm, f.campaignId, kampf.id, a, offen.runde);
    expect(amZug(nach)).toBe("B");
    await expect(f.buehne.naechsterZug(f.gm, f.campaignId, kampf.id, a, offen.runde)).rejects.toBeInstanceOf(Conflict);
    // Und C wurde nicht übersprungen: B ist weiterhin dran.
    expect(amZug(await f.buehne.buehne(f.gm, f.campaignId, kampf.id))).toBe("B");
  });

  it("advances the round when removing the active participant wraps to the start", async () => {
    const f = await fixture();
    const kampf = await f.buehne.anlegen(f.gm, f.campaignId, { name: "Last in order" });
    await stellen(f, kampf.id, "A", 20); await stellen(f, kampf.id, "B", 10);
    const opened = await f.buehne.eroeffnen(f.gm, f.campaignId, kampf.id);
    const next = await f.buehne.naechsterZug(f.gm, f.campaignId, kampf.id, opened.teilnehmer[0]!.id, opened.runde);
    const removed = await f.buehne.teilnehmerEntfernen(f.gm, f.campaignId, kampf.id, next.teilnehmer[1]!.id);
    expect(amZug(removed)).toBe("A");
    expect(removed.runde).toBe(2);
  });

  it("restores the turn when adding to a running stage emptied by removals", async () => {
    const f = await fixture();
    const kampf = await f.buehne.anlegen(f.gm, f.campaignId, { name: "Reinforcements" });
    await stellen(f, kampf.id, "A", 20);
    const opened = await f.buehne.eroeffnen(f.gm, f.campaignId, kampf.id);
    await f.buehne.teilnehmerEntfernen(f.gm, f.campaignId, kampf.id, opened.teilnehmer[0]!.id);
    const added = await stellen(f, kampf.id, "B", 10);
    expect(amZug(added)).toBe("B");
    expect((await f.buehne.naechsterZug(f.gm, f.campaignId, kampf.id, added.teilnehmer[0]!.id, added.runde)).runde).toBe(2);
  });

  it("rejects replaying a single participant's turn from a previous round", async () => {
    const f = await fixture();
    const kampf = await f.buehne.anlegen(f.gm, f.campaignId, { name: "Solo" });
    await stellen(f, kampf.id, "A", 10);
    const opened = await f.buehne.eroeffnen(f.gm, f.campaignId, kampf.id);
    const actor = opened.teilnehmer[0]!.id;
    expect((await f.buehne.naechsterZug(f.gm, f.campaignId, kampf.id, actor, 1)).runde).toBe(2);
    await expect(f.buehne.naechsterZug(f.gm, f.campaignId, kampf.id, actor, 1)).rejects.toBeInstanceOf(Conflict);
    expect((await f.buehne.buehne(f.gm, f.campaignId, kampf.id)).runde).toBe(2);
    expect((await f.buehne.naechsterZug(f.gm, f.campaignId, kampf.id, actor, 2)).runde).toBe(3);
  });

  it("rejects a delayed turn request when its participant acts again after a full round", async () => {
    const f = await fixture();
    const kampf = await f.buehne.anlegen(f.gm, f.campaignId, { name: "Round replay" });
    await stellen(f, kampf.id, "A", 20); await stellen(f, kampf.id, "B", 10);
    const opened = await f.buehne.eroeffnen(f.gm, f.campaignId, kampf.id);
    const [a, b] = opened.teilnehmer;
    await f.buehne.naechsterZug(f.gm, f.campaignId, kampf.id, a!.id, 1);
    await f.buehne.naechsterZug(f.gm, f.campaignId, kampf.id, b!.id, 1);
    await expect(f.buehne.naechsterZug(f.gm, f.campaignId, kampf.id, a!.id, 1)).rejects.toBeInstanceOf(Conflict);
    const current = await f.buehne.buehne(f.gm, f.campaignId, kampf.id);
    expect(amZug(current)).toBe("A");
    expect(current.runde).toBe(2);
  });

  it("requires the round at the HTTP boundary and rejects stale requests", async () => {
    const f = await fixture();
    const kampf = await f.buehne.anlegen(f.gm, f.campaignId, { name: "HTTP round" });
    await stellen(f, kampf.id, "A", 10);
    const opened = await f.buehne.eroeffnen(f.gm, f.campaignId, kampf.id);
    const config = { ...cfg, origin: "https://kampf.test", cookieSecret: "kampf-review-cookie-secret-over-32-characters",
      bootstrapToken: "kampf-review-bootstrap-token-over-32-characters" };
    const app = await buildApp(db, config);
    try {
      const session = await createIdentity(db, config).issueSession(f.gm);
      const headers = { cookie: `chronicle_session=${session.value}`, origin: config.origin };
      const send = (payload: object) => app.inject({ method: "POST", url: `/api/campaigns/${f.campaignId}/kaempfe/${kampf.id}/zug`, headers, payload });
      const von = opened.teilnehmer[0]!.id;
      expect((await send({ von })).statusCode).toBe(400);
      const advanced = await send({ von, runde: 1 });
      expect(advanced.statusCode).toBe(200);
      expect(advanced.json().runde).toBe(2);
      expect((await send({ von, runde: 1 })).statusCode).toBe(409);
    } finally { await app.close(); }
  });

  it("schiebt den Zug weiter, wenn die Kämpfende am Zug die Bühne verlässt", async () => {
    const f = await fixture();
    const kampf = await f.buehne.anlegen(f.gm, f.campaignId, { name: "Flucht" });
    await stellen(f, kampf.id, "A", 30); await stellen(f, kampf.id, "B", 20);
    const offen = await f.buehne.eroeffnen(f.gm, f.campaignId, kampf.id);
    expect(amZug(offen)).toBe("A");

    const ohneA = await f.buehne.teilnehmerEntfernen(f.gm, f.campaignId, kampf.id, offen.teilnehmer[0]!.id);
    expect(namen(ohneA)).toEqual(["B"]);
    // Ein laufender Kampf ohne jemanden am Zug wäre eine Bühne, die niemand weiterschieben kann.
    expect(amZug(ohneA)).toBe("B");

    // Auch die letzte Karte darf herunter; dann ist die Bühne leer und niemand ist am Zug.
    const leer = await f.buehne.teilnehmerEntfernen(f.gm, f.campaignId, kampf.id, ohneA.teilnehmer[0]!.id);
    expect(leer.teilnehmer).toEqual([]);
  });

  it("beendet den Kampf, nimmt den Zug zurück und verweigert danach jede Aufnahme", async () => {
    const f = await fixture();
    const kampf = await f.buehne.anlegen(f.gm, f.campaignId, { name: "Schluss" });
    await stellen(f, kampf.id, "A", 10);
    await f.buehne.eroeffnen(f.gm, f.campaignId, kampf.id);

    const aus = await f.buehne.beenden(f.gm, f.campaignId, kampf.id);
    expect(aus).toMatchObject({ zustand: "beendet", beendetAm: time });
    expect(amZug(aus)).toBeNull();
    await expect(stellen(f, kampf.id, "Zu spät", 1)).rejects.toBeInstanceOf(Conflict);
    await expect(f.buehne.naechsterZug(f.gm, f.campaignId, kampf.id, aus.teilnehmer[0]!.id, aus.runde)).rejects.toBeInstanceOf(Conflict);
    await expect(f.buehne.beenden(f.gm, f.campaignId, kampf.id)).rejects.toBeInstanceOf(Conflict);
  });

  it("lässt die Runde zusehen, aber nur die Spielleitung führen", async () => {
    const f = await fixture();
    const kampf = await f.buehne.anlegen(f.gm, f.campaignId, { name: "Zuschauen" });
    await stellen(f, kampf.id, "A", 10);

    // Sehen darf die Spielerin: sie muss wissen, wann sie dran ist.
    expect(namen(await f.buehne.buehne(f.spieler, f.campaignId, kampf.id))).toEqual(["A"]);
    expect((await f.buehne.buehnen(f.spieler, f.campaignId)).map(k => k.name)).toContain("Zuschauen");

    // Führen darf sie nicht — und erfährt nicht einmal, dass es an der Rolle liegt.
    for (const versuch of [
      () => f.buehne.anlegen(f.spieler, f.campaignId, { name: "Eigener" }),
      () => stellen({ ...f, gm: f.spieler }, kampf.id, "Geschmuggelt", 99),
      () => f.buehne.eroeffnen(f.spieler, f.campaignId, kampf.id),
      () => f.buehne.beenden(f.spieler, f.campaignId, kampf.id),
    ]) await expect(versuch()).rejects.toBeInstanceOf(Gone);
  });

  it("haengt einen echten Initiativwurf als Beleg an die Karte", async () => {
    const f = await fixture();
    // Die Wuerfelmaschinerie ist dieselbe wie am Tisch — ein erfundener Beleg waere keiner.
    const game = createGameplay(db, { now: () => time, seed: () => "00000001000000020000000300000004" });
    await seedActorControl(db, f.campaignId, f.actorId, f.spieler);
    await game.installPackage(f.gm, f.campaignId, HOW_TO_BE_A_HERO_PACKAGE);
    const review = await game.previewPackage(f.gm, f.campaignId, HOW_TO_BE_A_HERO_PACKAGE);
    await game.activatePackage(f.gm, f.campaignId, { packageId: HOW_TO_BE_A_HERO_PACKAGE.id, packageVersion: HOW_TO_BE_A_HERO_PACKAGE.version, expectedVersion: 0, previewHash: review.previewHash });
    await game.updateSheet(f.spieler, f.campaignId, { actorId: f.actorId, expectedVersion: 0, fields: { ...HTBAH_EXAMPLE_CHARACTERS[0]!.fields } });
    const wurf = await game.prepareAction(f.spieler, f.campaignId, { commandId: randomUUID(), actorId: f.actorId, actionId: "initiative" });

    const kampf = await f.buehne.anlegen(f.gm, f.campaignId, { name: "Mit Beleg" });
    const stand = await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaignId, kampf.id,
      { name: "Held", seite: "gefaehrten", initiative: Math.trunc(wurf.receipt.total), actorId: f.actorId, initiativeRollId: wurf.id });
    const karte = stand.teilnehmer[0]!;
    expect(karte.initiativeRollId).toBe(wurf.id);
    expect(karte.initiative).toBe(Math.trunc(wurf.receipt.total));

    // Und der Beleg ist einloesbar: der genannte Wurf laesst sich nachrechnen.
    expect((await game.replayRoll(f.spieler, f.campaignId, karte.initiativeRollId!)).valid).toBe(true);
  });

  it("weist einen erfundenen Beleg ab, statt ihn zu speichern", async () => {
    const f = await fixture();
    const kampf = await f.buehne.anlegen(f.gm, f.campaignId, { name: "Erfunden" });
    await expect(f.buehne.teilnehmerHinzufuegen(f.gm, f.campaignId, kampf.id,
      { name: "Schwindler", seite: "gegner", initiative: 99, initiativeRollId: randomUUID() })).rejects.toThrow();
    expect((await f.buehne.buehne(f.gm, f.campaignId, kampf.id)).teilnehmer).toEqual([]);
  });

  it("eröffnet keine leere Bühne und kein zweites Mal", async () => {
    const f = await fixture();
    const leer = await f.buehne.anlegen(f.gm, f.campaignId, { name: "Leer" });
    await expect(f.buehne.eroeffnen(f.gm, f.campaignId, leer.id)).rejects.toBeInstanceOf(Conflict);
    await stellen(f, leer.id, "A", 5);
    await f.buehne.eroeffnen(f.gm, f.campaignId, leer.id);
    await expect(f.buehne.eroeffnen(f.gm, f.campaignId, leer.id)).rejects.toBeInstanceOf(Conflict);
  });
});
