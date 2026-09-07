import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments, type PassageInput } from "../src/domain/documents.ts";
import { createActors, listControlledActorIds } from "../src/domain/actors.ts";
import { createIdentity } from "../src/identity/index.ts";
import { Gone } from "../src/domain/errors.ts";

/**
 * Permanente Spielerprofile: **ein Account, mehrere Figuren.**
 *
 * Der Befund, der diesem Test vorausging: das Modell trägt das längst, und zwar an einer Stelle,
 * die man leicht übersieht. `requireMember` leitet die handelnde Figur aus dem **Wissensblick**
 * ab (`reader_perspectives`) und fällt nur ersatzweise auf die Hauptfigur der Mitgliedschaft
 * zurück — und `actor_controllers` ist eine Viele-zu-viele-Beziehung. Wer zwei Figuren führt,
 * wechselt zwischen ihnen, und Chronik, Atlas und Briefe folgen mit.
 *
 * Drei Namensebenen gibt es dabei, und sie sind getrennt: der **Accountname** (`users`), der
 * **Name in dieser Runde** (`campaign_memberships`) und die **Namen der Figuren** (`actors`).
 */
const config = { origin: "https://profile.test", cookieSecret: "spielerprofile-cookie-secret-with-over-32-chars" };
const befehl = () => ({ commandId: randomUUID() });
const absatz = (text: string): PassageInput => ({ inhalt: { kind: "absatz", inhalt: [{ text, marks: [] }] } });
const figurvorlage = (name: string) => ({ schemaVersion: 1 as const, name, kind: "player_character" as const, loreEntryId: null,
  package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: {} });

describe("Permanente Spielerprofile", () => {
  let db: Db, gm: string;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); gm = (await createIdentity(db, config).bootstrap("Kaya")).userId; }, 30_000);
  afterAll(async () => db?.close());

  /** Ein Account mit zwei Figuren in einer Runde — beide ausdrücklich freigegeben. */
  async function fixture(rundenname = "Sera am Tisch") {
    const campaign = (await createCampaigns(db).createCampaign(gm, { name: "Die lange Reise" })).id;
    const konto = randomUUID();
    await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'seraphine.b',$2)", [konto, Date.now()]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton) VALUES($1,$2,'spieler',$3,$4)",
      [campaign, konto, rundenname, rundenname.toLowerCase()]);
    const actors = createActors(db);
    const figuren: string[] = [];
    for (const name of ["Sera die Späherin", "Bruder Halm"]) {
      const vorlage = await actors.createActorTemplate(gm, campaign, { ...befehl(), definition: figurvorlage(name) });
      const figur = await actors.instantiateActor(gm, campaign, { ...befehl(), templateId: vorlage.id, templateRevision: 1 });
      await actors.grantController(gm, campaign, figur.id, konto, { ...befehl(), expectedVersion: 0, reason: "Diese Figur gehört dieser Person." });
      figuren.push(figur.id);
    }
    return { campaign, konto, sera: figuren[0]!, halm: figuren[1]!, actors, campaigns: createCampaigns(db) };
  }

  it("führt zwei Figuren unter einem Account", async () => {
    const f = await fixture();
    const mitglied = await f.campaigns.requireMember(f.konto, f.campaign);
    expect(await listControlledActorIds(db, mitglied)).toEqual([f.sera, f.halm].sort());
    // Beide sind aus der Sicht dieses Accounts führbar — das ist der Kern von „mehrere Figuren".
    for (const id of [f.sera, f.halm]) expect((await f.actors.getActor(f.konto, f.campaign, id)).canControl).toBe(true);
  });

  it("lässt Chronik und Wissen der gewählten Figur folgen", async () => {
    const f = await fixture();
    const docs = createDocuments(db);
    const geheim = await docs.saveEntry(gm, f.campaign, { title: "Der Pfad hinterm Wehr", passages: [absatz("Nur Sera kennt ihn.")] });
    await docs.revealPassage(gm, f.campaign, geheim.passagen[0]!.pid, f.sera);

    // Voreingestellt ist noch keine Figur gewaehlt: dann traegt die Mitgliedschaft nichts bei.
    const stand = await f.actors.getReaderPerspective(f.konto, f.campaign);
    await f.actors.setReaderPerspective(f.konto, f.campaign, { ...befehl(), expectedVersion: stand.version, actorId: f.sera });
    expect((await docs.listEntries(f.konto, f.campaign)).map(e => e.title)).toEqual(["Der Pfad hinterm Wehr"]);

    // Umgeschaltet auf die andere Figur — und dasselbe Konto weiss davon nichts mehr.
    const jetzt = await f.actors.getReaderPerspective(f.konto, f.campaign);
    await f.actors.setReaderPerspective(f.konto, f.campaign, { ...befehl(), expectedVersion: jetzt.version, actorId: f.halm });
    expect(await docs.listEntries(f.konto, f.campaign)).toEqual([]);
    await expect(docs.getEntry(f.konto, f.campaign, geheim.entryId)).rejects.toBeInstanceOf(Gone);
  });

  it("hält Accountname, Rundenname und Figurennamen auseinander", async () => {
    const f = await fixture("Die Erzählerin");
    const konto = (await db.query<{ display_name: string }>("SELECT display_name FROM users WHERE id=$1", [f.konto])).rows[0]!;
    const mitglied = await f.campaigns.requireMember(f.konto, f.campaign);
    expect(konto.display_name).toBe("seraphine.b");
    expect(mitglied.displayName).toBe("Die Erzählerin");
    expect((await f.actors.getActor(f.konto, f.campaign, f.sera)).name).toBe("Sera die Späherin");
    // Drei Ebenen, drei Werte — keiner leitet sich aus einem anderen ab.
    expect(new Set([konto.display_name, mitglied.displayName, "Sera die Späherin"]).size).toBe(3);
  });

  it("lässt niemanden mit fremden Augen lesen", async () => {
    const f = await fixture();
    const fremd = randomUUID();
    await db.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'anderer',$2)", [fremd, Date.now()]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton) VALUES($1,$2,'spieler','Anderer','anderer')", [f.campaign, fremd]);
    const stand = await f.actors.getReaderPerspective(fremd, f.campaign);
    // Der Wissensblick braucht eine ausdrueckliche Freigabe — sonst waere er ein Schluessel.
    await expect(f.actors.setReaderPerspective(fremd, f.campaign, { ...befehl(), expectedVersion: stand.version, actorId: f.sera }))
      .rejects.toBeInstanceOf(Gone);
  });

  it("bleibt dasselbe Konto in einer zweiten Runde, mit eigenem Namen und eigenen Figuren", async () => {
    // „Permanent" heisst: das Konto bleibt, die Rolle darin ist je Runde eine eigene.
    const erste = await fixture("Sera am Tisch");
    const zweite = (await createCampaigns(db).createCampaign(gm, { name: "Ein anderer Tisch" })).id;
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton) VALUES($1,$2,'spieler','Kapitänin','kapitaenin')", [zweite, erste.konto]);
    const vorlage = await erste.actors.createActorTemplate(gm, zweite, { ...befehl(), definition: figurvorlage("Nore vom Kai") });
    const figur = await erste.actors.instantiateActor(gm, zweite, { ...befehl(), templateId: vorlage.id, templateRevision: 1 });
    await erste.actors.grantController(gm, zweite, figur.id, erste.konto, { ...befehl(), expectedVersion: 0, reason: "Neue Runde, neue Figur." });

    expect((await erste.campaigns.requireMember(erste.konto, erste.campaign)).displayName).toBe("Sera am Tisch");
    expect((await erste.campaigns.requireMember(erste.konto, zweite)).displayName).toBe("Kapitänin");
    // Und die Figuren der einen Runde tauchen in der anderen nicht auf.
    expect(await listControlledActorIds(db, await erste.campaigns.requireMember(erste.konto, zweite))).toEqual([figur.id]);
  });
});
