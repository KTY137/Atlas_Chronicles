// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCampaignBundleV22, currentCampaignSemanticDiff, currentCampaignTables, parseCurrentCampaignBundle, serializeCurrentCampaignBundle, type CampaignRow } from "@chronicle/io";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createKampfbuehne } from "../src/domain/kampfbuehne.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";

const cfg = { origin: "https://karten.test", cookieSecret: "kampfkarten-export-secret-over-thirty-two", bootstrapToken: "kampfkarten-export-bootstrap-over-thirty-two", now: () => 1790000000000 };

// Eine verdeckte Karte ist Spielstand wie jeder andere: sie muss in der einen Datei stehen, aus ihr
// zurückkommen, und ein von Hand gebautes Paket darf sie nicht widersprüchlich hereintragen.
describe("Die Kartenlage reist im Kampagnenpaket mit", () => {
  let db: Db, gm: string, campaign: string, verdeckt: string, wolf: string;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    gm = (await createIdentity(db, cfg).bootstrap("Kaya")).userId;
    campaign = (await createCampaigns(db, cfg).createCampaign(gm, { name: "Karten im Paket" })).id;
    const buehne = createKampfbuehne(db, cfg);
    const kampfId = (await buehne.anlegen(gm, campaign, { name: "Hinterhalt" })).id;
    await buehne.teilnehmerHinzufuegen(gm, campaign, kampfId, { name: "Wolf", seite: "gegner", initiative: 12 });
    const stand = await buehne.teilnehmerHinzufuegen(gm, campaign, kampfId, { name: "Späher", seite: "gegner", initiative: 9 });
    verdeckt = stand.teilnehmer.find(k => k.name === "Späher")!.id;
    wolf = stand.teilnehmer.find(k => k.name === "Wolf")!.id;
    await buehne.eroeffnen(gm, campaign, kampfId);
    // Den Weg, auf dem die Domäne diese Zeile schreibt, gibt es erst ab Aufgabe 3. Sie steht hier so, wie er sie schreiben wird.
    await db.query(`INSERT INTO kampf_karten(teilnehmer_id,campaign_id,lage,name_fuer_runde,sicht,vom_kampf_angelegt,version,geaendert_am)
      VALUES($1,$2,'hand','Schatten im Gebüsch',$3,false,1,$4)`,
      [verdeckt, campaign, JSON.stringify({ schema: 1, standard: "verborgen", balken: { hp: "worte" }, zustaende: false, bild: false }), cfg.now()]);
  }, 30_000);
  afterAll(async () => { await db?.close(); });

  it("hebt das Paket auf Fassung 22 und nimmt die Zeile mit", async () => {
    const bundle = await exportCampaignBundle(db, gm, campaign, cfg);
    expect(bundle.version).toBe(22);
    expect(currentCampaignTables(bundle).kampf_karten).toEqual([expect.objectContaining({ teilnehmer_id: verdeckt, lage: "hand", name_fuer_runde: "Schatten im Gebüsch" })]);
  });

  it("liest sich aus einer Datei zurück und stellt dieselbe Welt her", async () => {
    const bundle = await exportCampaignBundle(db, gm, campaign, cfg);
    const text = serializeCurrentCampaignBundle(bundle);
    expect(currentCampaignSemanticDiff(bundle, parseCurrentCampaignBundle(text))).toEqual([]);
    const ziel = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(ziel);
      expect(await restoreCampaignBundle(ziel, parseCurrentCampaignBundle(text))).toMatchObject({ dryRun: false, formatVersion: 22 });
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(ziel, gm, campaign, cfg))).toEqual([]);
    } finally { await ziel.close(); }
  }, 30_000);

  it("weist eine Karte ab, die auf keinen Teilnehmer zeigt, unlesbar ist oder verdeckt am Zug steht", async () => {
    const bundle = await exportCampaignBundle(db, gm, campaign, cfg);
    const tabellen = currentCampaignTables(bundle), karte = tabellen.kampf_karten[0]!;
    const mit = (kampf_karten: unknown[], kampf_teilnehmer: unknown[] = [...tabellen.kampf_teilnehmer]) => () => createCampaignBundleV22({
      campaignId: bundle.manifest.campaignId, universeId: bundle.manifest.universeId, exportedAt: bundle.manifest.exportedAt,
      tables: { ...tabellen, kampf_teilnehmer, kampf_karten } as never });
    expect(mit([{ ...karte, teilnehmer_id: randomUUID() }])).toThrow(/combatant/);
    expect(mit([{ ...karte, campaign_id: randomUUID() }])).toThrow(/another campaign/);
    expect(mit([{ ...karte, sicht: { schema: 2 } }])).toThrow(/visibility/);
    // Dieselben Grenzen wie Datenbank und Eingabe: ein leerer oder unsichtbarer Name, eine Zeit vor 1970.
    expect(mit([{ ...karte, name_fuer_runde: "" }])).toThrow(/name_fuer_runde/);
    expect(mit([{ ...karte, name_fuer_runde: "   " }])).toThrow(/name_fuer_runde/);
    expect(mit([{ ...karte, geaendert_am: "-1" }])).toThrow(/geaendert_am/);
    expect(mit([{ ...karte, name_fuer_runde: null }])).not.toThrow();
    expect(mit([{ ...karte, name_fuer_runde: " ein Wolf " }])).not.toThrow();
    // Der Zug wandert vom Wolf auf die verdeckte Karte: ein laufender Kampf mit genau einem Zug, aber in der Hand.
    const umgehaengt = tabellen.kampf_teilnehmer.map((t): CampaignRow => ({ ...t, am_zug: t.id === verdeckt }));
    expect(umgehaengt.find(t => t.id === wolf)!.am_zug).toBe(false);
    expect(mit([karte], umgehaengt)).toThrow(/lies on the field/);
  });
});
