// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { createTestDb, migrate, type Db, type QueryResult } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { ActorValidationError, createActors } from "../src/domain/actors.ts";
import { createFigurantrag } from "../src/domain/figurantrag.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";

const config = { origin: "https://figurantrag.test", cookieSecret: "figurantrag-test-cookie-secret-with-more-than-32-chars" };
const command = () => randomUUID();
// `vigour` steht bewusst NICHT auf dem Paketstandard (6): nur so belegt der Merge-Test, dass ein
// nicht genanntes Feld den Wert der VORLAGE behält und nicht auf den Paketstandard zurückfällt.
const spielerVorlage = (name = "Wanderin") => ({
  schemaVersion: 1 as const, name, kind: "player_character" as const, loreEntryId: null,
  package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: { insight: 3, vigour: 9 },
});

describe("Figurantrag — die Figur entsteht erst bei der Bestätigung", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => { await db?.close(); });

  async function fixture() {
    const campaigns = createCampaigns(db), campaign = (await campaigns.createCampaign(gm, { name: `Antraege ${randomUUID()}` })).id;
    const people: { userId: string; actorId: string }[] = [];
    for (const name of ["Sera", "Brannt"]) {
      const userId = randomUUID(), actorId = randomUUID();
      await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,$2,$3)", [userId, name, Date.now()]);
      await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [actorId, campaign, userId, name]);
      await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$3,$4)", [campaign, userId, name, actorId]);
      people.push({ userId, actorId });
    }
    const actors = createActors(db);
    const vorlage = await actors.createActorTemplate(gm, campaign, { commandId: command(), definition: spielerVorlage() });
    return { campaign, sera: people[0]!, brannt: people[1]!, actors, game: createGameplay(db), campaigns,
      antraege: createFigurantrag(db), vorlage };
  }
  /** Freigeben und beantragen — der übliche Vorlauf jedes Falls hier. */
  async function offenerAntrag(f: Awaited<ReturnType<typeof fixture>>) {
    await f.antraege.freigeben(gm, f.campaign, f.vorlage.id, 0);
    return f.antraege.beantragen(f.sera.userId, f.campaign, command(),
      { templateId: f.vorlage.id, name: "Nell", anfangswerte: { insight: 3 } });
  }
  /** Ein zweites Paket aktivieren: derselbe Weg, den die Spielleitung in der Werkbank geht. */
  async function paketWechseln(f: Awaited<ReturnType<typeof fixture>>) {
    const next = { ...DEMO_RULE_PACKAGE, version: "1.1.0", migrations: [{ from: "1.0.0", to: "1.1.0", steps: [] }] };
    await f.game.installPackage(gm, f.campaign, next);
    await f.game.activatePackage(gm, f.campaign, { packageId: next.id, packageVersion: next.version, expectedVersion: 0 });
  }
  const zaehle = async (sql: string, params: readonly unknown[]) => Number((await db.query<{ n: string }>(sql, params)).rows[0]!.n);
  /** Zählt Abfragen und Transaktionen einer Verbindung, ohne ihr Verhalten zu ändern. */
  function mitZaehler(inner: Db) {
    const zaehler = { query: 0, transaction: 0 };
    const huelle = (ziel: Db): Db => ({
      query: <T = Record<string, unknown>>(sql: string, params?: readonly unknown[]) => { zaehler.query++; return ziel.query<T>(sql, params) as Promise<QueryResult<T>>; },
      transaction: <T>(fn: (tx: Db) => Promise<T>) => { zaehler.transaction++; return ziel.transaction(tx => fn(huelle(tx))); },
      close: () => ziel.close(),
    });
    return { db: huelle(inner), zaehler };
  }

  it("weist einen Antrag auf eine nicht freigegebene Vorlage ab", async () => {
    const f = await fixture();
    await expect(f.antraege.beantragen(f.sera.userId, f.campaign, command(),
      { templateId: f.vorlage.id, name: "Nell", anfangswerte: { insight: 3 } })).rejects.toBeInstanceOf(Gone);
    expect(await f.antraege.freigegebeneVorlagen(f.sera.userId, f.campaign)).toEqual([]);
    // Ein Entzug macht die Vorlage wieder unsichtbar, und der Antrag scheitert erneut.
    await f.antraege.freigeben(gm, f.campaign, f.vorlage.id, 0);
    expect(await f.antraege.freigegebeneVorlagen(f.sera.userId, f.campaign)).toHaveLength(1);
    await f.antraege.entziehen(gm, f.campaign, f.vorlage.id, 1);
    expect(await f.antraege.freigegebeneVorlagen(f.sera.userId, f.campaign)).toEqual([]);
    await expect(f.antraege.beantragen(f.sera.userId, f.campaign, command(),
      { templateId: f.vorlage.id, name: "Nell", anfangswerte: { insight: 3 } })).rejects.toBeInstanceOf(Gone);
  });

  it("weist einen Antrag auf eine Vorlage aus einem fremden Paket ab", async () => {
    const f = await fixture();
    await f.antraege.freigeben(gm, f.campaign, f.vorlage.id, 0);
    await paketWechseln(f);
    await expect(f.antraege.beantragen(f.sera.userId, f.campaign, command(),
      { templateId: f.vorlage.id, name: "Nell", anfangswerte: { insight: 3 } })).rejects.toBeInstanceOf(Conflict);
    // Freundlich heißt: die Vorlage taucht in der Auswahl gar nicht erst auf.
    expect(await f.antraege.freigegebeneVorlagen(f.sera.userId, f.campaign)).toEqual([]);
  });

  it("weist die Bestätigung ab, wenn das Paket seit dem Antrag gewechselt hat", async () => {
    const f = await fixture(), antrag = await offenerAntrag(f);
    await paketWechseln(f);
    await expect(f.antraege.bestaetigen(gm, f.campaign, antrag.id, antrag.version)).rejects.toBeInstanceOf(Conflict);
    expect((await f.antraege.liste(gm, f.campaign)).map(a => a.status)).toEqual(["offen"]);
    expect(await zaehle("SELECT count(*) AS n FROM actor_profiles WHERE campaign_id=$1", [f.campaign])).toBe(0);
  });

  it("weist eine zweite Bestätigung desselben Antrags ab", async () => {
    const f = await fixture(), antrag = await offenerAntrag(f);
    const { antrag: bestaetigt, actorId } = await f.antraege.bestaetigen(gm, f.campaign, antrag.id, antrag.version);
    expect(bestaetigt.status).toBe("bestaetigt");
    expect(bestaetigt.actorId).toBe(actorId);
    expect(bestaetigt.version).toBe(antrag.version + 1);
    await expect(f.antraege.bestaetigen(gm, f.campaign, antrag.id, antrag.version)).rejects.toBeInstanceOf(Conflict);
    await expect(f.antraege.bestaetigen(gm, f.campaign, antrag.id, bestaetigt.version)).rejects.toBeInstanceOf(Conflict);
    await expect(f.antraege.ablehnen(gm, f.campaign, antrag.id, bestaetigt.version, "Doch nicht")).rejects.toBeInstanceOf(Conflict);
    expect(await zaehle("SELECT count(*) AS n FROM actors WHERE campaign_id=$1 AND name='Nell'", [f.campaign])).toBe(1);
  });

  it("erzeugt genau einen Kontrollgrant, und zwar für den Antragsteller", async () => {
    const f = await fixture(), antrag = await offenerAntrag(f);
    const { actorId } = await f.antraege.bestaetigen(gm, f.campaign, antrag.id, antrag.version);
    const grants = await f.actors.listControllers(gm, f.campaign, actorId);
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({ userId: f.sera.userId, permission: "control", revokedAt: null, grantedBy: gm });
    const zeile = (await db.query<{ user_id: string; created_by: string }>(
      "SELECT a.user_id,p.created_by FROM actors a JOIN actor_profiles p ON p.actor_id=a.id WHERE a.id=$1", [actorId])).rows[0]!;
    expect(zeile.created_by).toBe(f.sera.userId);
    expect(zeile.user_id).toBe(f.sera.userId);
    // Nur diese eine Figur ist für Sera sichtbar; die Spielleitung braucht keinen Grant.
    expect((await f.actors.listActors(f.sera.userId, f.campaign)).map(a => a.id)).toEqual([actorId]);
    expect((await f.game.getSheet(f.sera.userId, f.campaign, actorId)).fields.insight).toBe(3);
  });

  it("legt bei einer Ablehnung keine Figur an", async () => {
    const f = await fixture(), antrag = await offenerAntrag(f);
    const vorher = await zaehle("SELECT count(*) AS n FROM actors WHERE campaign_id=$1", [f.campaign]);
    const abgelehnt = await f.antraege.ablehnen(gm, f.campaign, antrag.id, antrag.version, "Bitte eine andere Vorlage.");
    expect(abgelehnt).toMatchObject({ status: "abgelehnt", actorId: null, decidedBy: gm, reason: "Bitte eine andere Vorlage." });
    expect(await zaehle("SELECT count(*) AS n FROM actors WHERE campaign_id=$1", [f.campaign])).toBe(vorher);
    expect(await zaehle("SELECT count(*) AS n FROM actor_controllers WHERE campaign_id=$1", [f.campaign])).toBe(0);
    // Auch das Zurücknehmen erzeugt keine Figur.
    const zweiter = await f.antraege.beantragen(f.sera.userId, f.campaign, command(),
      { templateId: f.vorlage.id, name: "Nell", anfangswerte: { insight: 3 } });
    const zurueck = await f.antraege.zuruecknehmen(f.sera.userId, f.campaign, zweiter.id, zweiter.version);
    expect(zurueck.status).toBe("zurueckgezogen");
    expect(await zaehle("SELECT count(*) AS n FROM actors WHERE campaign_id=$1", [f.campaign])).toBe(vorher);
  });

  it("weist die Bestätigung ab, wenn die Freigabe zwischen Antrag und Bestätigung entzogen wurde", async () => {
    const f = await fixture(), antrag = await offenerAntrag(f);
    await f.antraege.entziehen(gm, f.campaign, f.vorlage.id, 1);
    await expect(f.antraege.bestaetigen(gm, f.campaign, antrag.id, antrag.version)).rejects.toBeInstanceOf(Conflict);
    expect(await zaehle("SELECT count(*) AS n FROM actor_profiles WHERE campaign_id=$1", [f.campaign])).toBe(0);
    // Nach einer erneuten Freigabe trägt derselbe Antrag wieder.
    await f.antraege.freigeben(gm, f.campaign, f.vorlage.id, 2);
    const { actorId } = await f.antraege.bestaetigen(gm, f.campaign, antrag.id, antrag.version);
    expect(actorId).toBeTruthy();
  });

  it("zeigt einem Spieler nur die eigenen Anträge", async () => {
    const f = await fixture();
    await f.antraege.freigeben(gm, f.campaign, f.vorlage.id, 0);
    const meiner = await f.antraege.beantragen(f.sera.userId, f.campaign, command(),
      { templateId: f.vorlage.id, name: "Nell", anfangswerte: { insight: 3 } });
    const fremder = await f.antraege.beantragen(f.brannt.userId, f.campaign, command(),
      { templateId: f.vorlage.id, name: "Torvid", anfangswerte: { insight: 2 } });
    expect((await f.antraege.liste(f.sera.userId, f.campaign)).map(a => a.id)).toEqual([meiner.id]);
    expect((await f.antraege.liste(f.brannt.userId, f.campaign)).map(a => a.id)).toEqual([fremder.id]);
    expect(new Set((await f.antraege.liste(gm, f.campaign)).map(a => a.id))).toEqual(new Set([meiner.id, fremder.id]));
    // Ein fremder Antrag lässt sich weder zurücknehmen noch entscheiden.
    await expect(f.antraege.zuruecknehmen(f.brannt.userId, f.campaign, meiner.id, meiner.version)).rejects.toBeInstanceOf(Gone);
    await expect(f.antraege.bestaetigen(f.sera.userId, f.campaign, meiner.id, meiner.version)).rejects.toBeInstanceOf(Gone);
    await expect(f.antraege.freigeben(f.sera.userId, f.campaign, f.vorlage.id, 1)).rejects.toBeInstanceOf(Gone);
  });

  it("führt den Freigabestand samt eigener Version auf der Vorlagenkarte der Spielleitung", async () => {
    const f = await fixture();
    const stand = async () => (await f.actors.getActorTemplate(gm, f.campaign, f.vorlage.id)).freigabe;
    const ausListe = async () => (await f.actors.listActorTemplates(gm, f.campaign)).find(k => k.id === f.vorlage.id)!.freigabe;
    // Nie freigegeben ist etwas anderes als entzogen — deshalb null und nicht `{frei:false}`.
    expect(await stand()).toBeNull();
    expect(await ausListe()).toBeNull();
    expect((await f.actors.createActorTemplate(gm, f.campaign, { commandId: command(), definition: spielerVorlage("Zweite") })).freigabe).toBeNull();

    expect((await f.antraege.freigeben(gm, f.campaign, f.vorlage.id, 0)).version).toBe(1);
    expect(await stand()).toEqual({ frei: true, version: 1 });
    expect(await ausListe()).toEqual({ frei: true, version: 1 });
    expect((await f.antraege.entziehen(gm, f.campaign, f.vorlage.id, 1))).toMatchObject({ freigegeben: false, version: 2 });
    expect(await stand()).toEqual({ frei: false, version: 2 });
    expect((await f.antraege.freigeben(gm, f.campaign, f.vorlage.id, 2)).version).toBe(3);
    expect(await stand()).toEqual({ frei: true, version: 3 });

    // Genau diese Version ist das erwartete `expectedVersion` — geraten wird nichts.
    await expect(f.antraege.entziehen(gm, f.campaign, f.vorlage.id, 1)).rejects.toBeInstanceOf(Conflict);
    expect((await f.antraege.entziehen(gm, f.campaign, f.vorlage.id, (await stand())!.version)).version).toBe(4);

    // Gegenstandsvorlagen kennen keine Freigabe und tragen das Feld deshalb gar nicht.
    const gegenstand = await f.actors.createItemTemplate(gm, f.campaign, { commandId: command(),
      definition: { schemaVersion: 1, name: "Messingschlüssel", loreEntryId: null, tags: ["Werkzeug"] } });
    expect(Object.hasOwn(gegenstand, "freigabe")).toBe(false);
    expect(Object.hasOwn(await f.actors.getItemTemplate(gm, f.campaign, gegenstand.id), "freigabe")).toBe(false);
  });

  it("legt die Anfangswerte als Abweichung über die Vorlage und zeigt sie auf der Karte", async () => {
    const f = await fixture();
    await f.antraege.freigeben(gm, f.campaign, f.vorlage.id, 0);
    const antrag = await f.antraege.beantragen(f.sera.userId, f.campaign, command(),
      { templateId: f.vorlage.id, name: "Nell", anfangswerte: { insight: 5 } });
    // Die Karte führt genau die Abweichung — die Spielleitung entscheidet nicht blind.
    expect(antrag.anfangswerte).toEqual({ insight: 5 });
    expect((await f.antraege.liste(gm, f.campaign))[0]!.anfangswerte).toEqual({ insight: 5 });
    expect((await f.antraege.liste(f.sera.userId, f.campaign))[0]!.anfangswerte).toEqual({ insight: 5 });

    const { actorId } = await f.antraege.bestaetigen(gm, f.campaign, antrag.id, antrag.version);
    const bogen = await f.game.getSheet(f.sera.userId, f.campaign, actorId);
    expect(bogen.fields.insight).toBe(5);
    // Nicht genannt: der Wert der Vorlage bleibt stehen (9), nicht der Paketstandard (6).
    expect(bogen.fields.vigour).toBe(9);
    expect(bogen.fields.name).toBe("Reisende Person");
    // Der Bogen wurde nach dem Erschaffen ein zweites Mal beschrieben und zählt das mit.
    expect(bogen.version).toBe(2);

    // Ein Feld, das das Paket nicht kennt, ist ein Tippfehler und kein Wunsch.
    await expect(f.antraege.beantragen(f.brannt.userId, f.campaign, command(),
      { templateId: f.vorlage.id, name: "Torvid", anfangswerte: { mut: 4 } })).rejects.toBeInstanceOf(ActorValidationError);
  });

  it("lässt je Person und Vorlage nur einen offenen Antrag zu", async () => {
    const f = await fixture(), antrag = await offenerAntrag(f);
    await expect(f.antraege.beantragen(f.sera.userId, f.campaign, command(),
      { templateId: f.vorlage.id, name: "Zweitversuch", anfangswerte: { insight: 4 } })).rejects.toBeInstanceOf(Conflict);
    // Nach der Rücknahme ist der Weg wieder frei; ein entschiedener Antrag beschränkt nichts.
    await f.antraege.zuruecknehmen(f.sera.userId, f.campaign, antrag.id, antrag.version);
    const zweiter = await f.antraege.beantragen(f.sera.userId, f.campaign, command(),
      { templateId: f.vorlage.id, name: "Zweitversuch", anfangswerte: { insight: 4 } });
    expect(zweiter.status).toBe("offen");
    // Eine andere Person ist davon nie betroffen.
    await expect(f.antraege.beantragen(f.brannt.userId, f.campaign, command(),
      { templateId: f.vorlage.id, name: "Torvid", anfangswerte: {} })).resolves.toMatchObject({ status: "offen", anfangswerte: {} });
  });

  it("beantwortet einen wiederholten Antragsbefehl mit dem heutigen Stand statt mit „offen“", async () => {
    const f = await fixture();
    await f.antraege.freigeben(gm, f.campaign, f.vorlage.id, 0);
    const befehl = command(), koerper = { templateId: f.vorlage.id, name: "Nell", anfangswerte: { insight: 3 } };
    const antrag = await f.antraege.beantragen(f.sera.userId, f.campaign, befehl, koerper);
    const { actorId } = await f.antraege.bestaetigen(gm, f.campaign, antrag.id, antrag.version);
    // Derselbe Befehl noch einmal — etwa nach einem Verbindungsabbruch. Die Quittung meint
    // dieselbe Sache, muss aber den heutigen Zustand zeigen; „offen“ wäre eine Lüge.
    const wiederholt = await f.antraege.beantragen(f.sera.userId, f.campaign, befehl, koerper);
    expect(wiederholt).toMatchObject({ id: antrag.id, status: "bestaetigt", actorId, decidedBy: gm, version: antrag.version + 1 });
    expect(await zaehle("SELECT count(*) AS n FROM figurantraege WHERE campaign_id=$1", [f.campaign])).toBe(1);
    expect(await zaehle("SELECT count(*) AS n FROM actors WHERE campaign_id=$1 AND name='Nell'", [f.campaign])).toBe(1);
    // Derselbe Befehl mit anderem Inhalt bleibt ein Konflikt.
    await expect(f.antraege.beantragen(f.sera.userId, f.campaign, befehl,
      { ...koerper, name: "Andere" })).rejects.toBeInstanceOf(Conflict);
  });

  it("liest die freigegebenen Vorlagen in einer Transaktion und ohne Abfrage je Vorlage", async () => {
    const f = await fixture();
    const gezaehlt = mitZaehler(db), antraege = createFigurantrag(gezaehlt.db);
    await f.antraege.freigeben(gm, f.campaign, f.vorlage.id, 0);
    gezaehlt.zaehler.query = 0; gezaehlt.zaehler.transaction = 0;
    expect(await antraege.freigegebeneVorlagen(f.sera.userId, f.campaign)).toHaveLength(1);
    const eine = { ...gezaehlt.zaehler };
    for (const name of ["Zweite", "Dritte"]) {
      const weitere = await f.actors.createActorTemplate(gm, f.campaign, { commandId: command(), definition: spielerVorlage(name) });
      await f.antraege.freigeben(gm, f.campaign, weitere.id, 0);
    }
    gezaehlt.zaehler.query = 0; gezaehlt.zaehler.transaction = 0;
    expect(await antraege.freigegebeneVorlagen(f.sera.userId, f.campaign)).toHaveLength(3);
    expect(gezaehlt.zaehler.query, "eine zusätzliche Abfrage je Vorlage ist ein N+1").toBe(eine.query);
    expect(gezaehlt.zaehler.transaction, "eine Liste muss einen einzigen Schnappschuss sehen").toBe(1);
  });

  it("projiziert die Vorlage für Spieler ohne Beute und ohne Wissensverweis", async () => {
    const f = await fixture(), docs = createDocuments(db);
    const lore = await docs.saveEntry(gm, f.campaign, { title: "Die Wanderin", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "Sie kennt den Pass.", marks: [] }] } }] });
    const beuteVorlage = await f.actors.createItemTemplate(gm, f.campaign, { commandId: command(),
      definition: { schemaVersion: 1, name: "Wanderstab", loreEntryId: null, tags: ["Werkzeug"] } });
    const reich = await f.actors.createActorTemplate(gm, f.campaign, { commandId: command(), definition: {
      ...spielerVorlage("Späherin"), schemaVersion: 2, loreEntryId: lore.entryId,
      beute: [{ templateId: beuteVorlage.id, templateRevision: 1, wahrscheinlichkeit: 100, menge: [1, 1] }],
    } });
    await f.antraege.freigeben(gm, f.campaign, reich.id, 0);
    const karten = await f.antraege.freigegebeneVorlagen(f.sera.userId, f.campaign);
    expect(karten).toHaveLength(1);
    expect(Object.keys(karten[0]!).sort()).toEqual(["anfangswerte", "art", "id", "name", "package", "version"]);
    expect(karten[0]).toMatchObject({ id: reich.id, name: "Späherin", art: "player_character", version: reich.version });
    expect(karten[0]!.anfangswerte.insight).toBe(3);
    expect(JSON.stringify(karten[0])).not.toContain(lore.entryId);
    expect(JSON.stringify(karten[0])).not.toContain(beuteVorlage.id);
    // Die Spielleitung sieht ihre Vorlage unverändert vollständig.
    expect((await f.actors.getActorTemplate(gm, f.campaign, reich.id)).definition).toMatchObject({ loreEntryId: lore.entryId });
  });
});
