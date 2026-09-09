// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { currentCampaignTables, serializeCurrentCampaignBundle, validateCurrentCampaignBundle } from "@chronicle/io";
import { exportCampaignBundle } from "../src/domain/bundles.ts";
import { seedActorControl } from "./actor-fixtures.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";

/**
 * Ein Regelpaket loswerden — auf zwei Wegen.
 *
 * „Aus der Bibliothek nehmen" ist immer erlaubt und immer umkehrbar; es sagt nichts ueber das
 * Paket aus, nur ueber die Bibliotheksansicht. „Endgueltig loeschen" geht nur, solange nichts
 * mehr darauf verweist — und was im Weg steht, sagt der Server in Alltagsdeutsch.
 */
describe("Regelpaket aus der Bibliothek nehmen und loeschen", () => {
  let db: Db; const clock = Date.UTC(2026, 8, 9, 12);
  const cfg = { now: () => clock };
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => { await db?.close(); });

  const zweite = { ...DEMO_RULE_PACKAGE, version: "1.1.0" };

  async function fixture() {
    const gm = randomUUID(), spieler = randomUUID();
    for (const [id, role] of [[gm, "leitung"], [spieler, "gast"]])
      await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$2,$3,$4)", [id, id, role, clock]);
    const campaign = await createCampaigns(db, cfg).createCampaign(gm, { name: "Die Werkstatt" });
    const actor = randomUUID();
    await db.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,$4)", [actor, campaign.id, spieler, "Sera"]);
    await db.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler',$3,$3,$4)", [campaign.id, spieler, "Sera", actor]);
    await seedActorControl(db, campaign.id, actor, spieler);
    const game = createGameplay(db, cfg);
    await game.installPackage(gm, campaign.id, DEMO_RULE_PACKAGE);
    await game.installPackage(gm, campaign.id, zweite);
    return { gm, spieler, actor, campaignId: campaign.id, game };
  }
  const stand = async (f: Awaited<ReturnType<typeof fixture>>, version: string) =>
    (await f.game.listPackages(f.gm, f.campaignId)).bibliothek.find(item => item.id === DEMO_RULE_PACKAGE.id && item.version === version)!;

  it("nimmt ein Paket aus der Bibliothek und holt es zurueck — wiederholbar, ohne den Inhalt zu ruehren", async () => {
    const f = await fixture();
    expect((await stand(f, "1.1.0")).genommen).toBe(false);
    await f.game.archivePackage(f.gm, f.campaignId, { packageId: DEMO_RULE_PACKAGE.id, packageVersion: "1.1.0" });
    expect((await stand(f, "1.1.0")).genommen).toBe(true);
    // Zweimal nehmen ist dasselbe wie einmal nehmen.
    await f.game.archivePackage(f.gm, f.campaignId, { packageId: DEMO_RULE_PACKAGE.id, packageVersion: "1.1.0" });
    expect((await db.query("SELECT 1 FROM rule_package_archiv WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(1);
    // Das Paket selbst ist unberuehrt: es steht weiter in der Liste und traegt denselben Inhalt.
    const liste = await f.game.listPackages(f.gm, f.campaignId);
    expect(liste.packages.some(p => p.version === "1.1.0")).toBe(true);
    await f.game.unarchivePackage(f.gm, f.campaignId, { packageId: DEMO_RULE_PACKAGE.id, packageVersion: "1.1.0" });
    expect((await stand(f, "1.1.0")).genommen).toBe(false);
    // Auch das Zuruecknehmen ist wiederholbar.
    await f.game.unarchivePackage(f.gm, f.campaignId, { packageId: DEMO_RULE_PACKAGE.id, packageVersion: "1.1.0" });
  });

  it("nimmt auch das angeheftete Paket aus der Bibliothek, ohne die Runde zu stoeren", async () => {
    const f = await fixture();
    await f.game.archivePackage(f.gm, f.campaignId, { packageId: DEMO_RULE_PACKAGE.id, packageVersion: DEMO_RULE_PACKAGE.version });
    const liste = await f.game.listPackages(f.spieler, f.campaignId);
    expect(liste.pin).toEqual({ id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version });
    expect(liste.bibliothek.find(i => i.version === DEMO_RULE_PACKAGE.version)!.genommen).toBe(true);
  });

  it("loescht ein Paket endgueltig, auf das nichts zeigt", async () => {
    const f = await fixture();
    expect((await stand(f, "1.1.0")).loeschbar).toBe(true);
    await f.game.archivePackage(f.gm, f.campaignId, { packageId: DEMO_RULE_PACKAGE.id, packageVersion: "1.1.0" });
    await f.game.deletePackage(f.gm, f.campaignId, { packageId: DEMO_RULE_PACKAGE.id, packageVersion: "1.1.0" });
    expect((await db.query("SELECT 1 FROM rule_packages WHERE campaign_id=$1 AND version='1.1.0'", [f.campaignId])).rowCount).toBe(0);
    // Die Archivzeile geht mit; sie waere sonst die Notiz ueber ein Paket, das es nicht gibt.
    expect((await db.query("SELECT 1 FROM rule_package_archiv WHERE campaign_id=$1", [f.campaignId])).rowCount).toBe(0);
    const liste = await f.game.listPackages(f.gm, f.campaignId);
    expect(liste.packages.some(p => p.version === "1.1.0")).toBe(false);
    // Ein zweites Loeschen findet nichts mehr.
    await expect(f.game.deletePackage(f.gm, f.campaignId, { packageId: DEMO_RULE_PACKAGE.id, packageVersion: "1.1.0" })).rejects.toBeInstanceOf(Gone);
  });

  it("verweigert das Loeschen, solange etwas darauf verweist, und sagt was", async () => {
    const f = await fixture();
    const aktiv = await stand(f, DEMO_RULE_PACKAGE.version);
    expect(aktiv.loeschbar).toBe(false);
    expect(aktiv.hindernisse).toContain("angeheftet");
    const fehler = await f.game.deletePackage(f.gm, f.campaignId, { packageId: DEMO_RULE_PACKAGE.id, packageVersion: DEMO_RULE_PACKAGE.version }).catch((e: unknown) => e);
    expect(fehler).toBeInstanceOf(Conflict);
    expect((fehler as Conflict).hinweis).toMatch(/angeheftet/);
    expect((await db.query("SELECT 1 FROM rule_packages WHERE campaign_id=$1 AND version=$2", [f.campaignId, DEMO_RULE_PACKAGE.version])).rowCount).toBe(1);
  });

  it("nennt den Bogen und den Wurf als Hindernis", async () => {
    const f = await fixture();
    await f.game.updateSheet(f.spieler, f.campaignId, { actorId: f.actor, expectedVersion: 0, fields: { insight: 2 } });
    const aktiv = await stand(f, DEMO_RULE_PACKAGE.version);
    expect(aktiv.hindernisse).toContain("boegen");
    await f.game.prepareAction(f.spieler, f.campaignId, { commandId: randomUUID(), actorId: f.actor, actionId: "investigate" });
    expect((await stand(f, DEMO_RULE_PACKAGE.version)).hindernisse).toContain("wuerfe");
  });

  it("nennt das eingebaute Paket unloeschbar, weil es gar nicht gespeichert ist", async () => {
    const gm = randomUUID();
    await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,$2,'leitung',$3)", [gm, gm, clock]);
    const campaign = await createCampaigns(db, cfg).createCampaign(gm, { name: "Ohne Paket" });
    const game = createGameplay(db, cfg);
    const liste = await game.listPackages(gm, campaign.id);
    expect(liste.bibliothek).toEqual([{ id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version, genommen: false, loeschbar: false, hindernisse: ["eingebaut", "angeheftet"] }]);
    await expect(game.deletePackage(gm, campaign.id, { packageId: DEMO_RULE_PACKAGE.id, packageVersion: DEMO_RULE_PACKAGE.version })).rejects.toBeInstanceOf(Gone);
  });

  it("laesst nur die Spielleitung nehmen, zuruecknehmen und loeschen", async () => {
    const f = await fixture();
    const wahl = { packageId: DEMO_RULE_PACKAGE.id, packageVersion: "1.1.0" };
    await expect(f.game.archivePackage(f.spieler, f.campaignId, wahl)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.unarchivePackage(f.spieler, f.campaignId, wahl)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.deletePackage(f.spieler, f.campaignId, wahl)).rejects.toBeInstanceOf(Gone);
    expect((await db.query("SELECT 1 FROM rule_packages WHERE campaign_id=$1 AND version='1.1.0'", [f.campaignId])).rowCount).toBe(1);
  });

  it("weist ein unbekanntes Paket auf jedem der drei Wege mit derselben 404 ab", async () => {
    const f = await fixture();
    const wahl = { packageId: "de.gibt.es.nicht", packageVersion: "9.9.9" };
    await expect(f.game.archivePackage(f.gm, f.campaignId, wahl)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.unarchivePackage(f.gm, f.campaignId, wahl)).rejects.toBeInstanceOf(Gone);
    await expect(f.game.deletePackage(f.gm, f.campaignId, wahl)).rejects.toBeInstanceOf(Gone);
  });

  it("nimmt das genommene Paket in die Sicherung mit — und hebt sie dafuer auf V18", async () => {
    const f = await fixture();
    // Ohne genommenes Paket bleibt die Sicherung, was sie war: die neue Tabelle draengt keiner
    // Kampagne eine neue Formatnummer auf.
    expect((await exportCampaignBundle(db, f.gm, f.campaignId)).version).toBeLessThan(18);
    await f.game.archivePackage(f.gm, f.campaignId, { packageId: DEMO_RULE_PACKAGE.id, packageVersion: "1.1.0" });
    const bundle = await exportCampaignBundle(db, f.gm, f.campaignId);
    expect(bundle.version).toBe(18);
    expect(currentCampaignTables(bundle).rule_package_archiv).toEqual([
      { campaign_id: f.campaignId, package_id: DEMO_RULE_PACKAGE.id, version: "1.1.0", archived_at: String(clock), archived_by: f.gm },
    ]);
    // Und die Datei laesst sich wieder lesen, ohne dass etwas anders herauskommt.
    expect(validateCurrentCampaignBundle(JSON.parse(serializeCurrentCampaignBundle(bundle))).manifest.contentHash).toBe(bundle.manifest.contentHash);
  });

  it("haelt den Inhalt eines Pakets weiterhin unveraenderlich — auch mit rohem SQL", async () => {
    const f = await fixture();
    await expect(db.query("UPDATE rule_packages SET content_hash='x' WHERE campaign_id=$1", [f.campaignId])).rejects.toThrow(/append-only/);
  });
});
