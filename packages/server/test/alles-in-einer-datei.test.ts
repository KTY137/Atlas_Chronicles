import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS } from "@chronicle/rules";
import { currentCampaignSemanticDiff, currentCampaignTables, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "@chronicle/io";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createDocuments } from "../src/domain/documents.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createActors } from "../src/domain/actors.ts";
import { createKampfbuehne } from "../src/domain/kampfbuehne.ts";
import { createErleichterungen } from "../src/domain/erleichterungen.ts";
import { createWikiMedien } from "../src/domain/wiki-medien.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";
import { seedActorControl } from "./actor-fixtures.ts";

/**
 * „Alles kann als EINE Datei exportiert werden."
 *
 * Diese Datei prüft genau dieses Wort. Sie baut eine Kampagne, die alles enthält, was in dieser
 * Sitzung dazugekommen ist — Kampfbühne, Lootkarte mit Kartengesicht, Erleichterung samt
 * eingelöstem Wurf — **und ein echtes Bild mit Bytes**, weil ein Dateipfad neben dem Paket
 * genau die Stelle wäre, an der es unvollständig wird (so sagt es Migration 015 selbst).
 *
 * Dann: ein einziger JSON-Text, eine leere Datenbank, und danach derselbe Inhalt.
 */
const cfg = { origin: "https://alles.test", cookieSecret: "alles-in-einer-datei-secret-over-thirty-two-chars", bootstrapToken: "alles-in-einer-datei-bootstrap-over-thirty-two-ch", now: () => 1788696000000, seed: () => "00000001000000020000000300000004" };
/** Ein echtes 1×1-PNG. Der Server bestimmt den Typ aus den Magic Bytes, nicht aus dem Namen. */
const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("Alles in einer Datei", () => {
  let quelle: Db, gm: string, campaign: string, actorId: string, assetId: string, kampfId: string, erleichterungId: string;

  beforeAll(async () => {
    quelle = await createTestDb(); await migrate(quelle);
    gm = (await createIdentity(quelle, cfg).bootstrap("Kaya")).userId;
    const spieler = randomUUID(); actorId = randomUUID();
    await quelle.query("INSERT INTO users(id,display_name,created_at) VALUES($1,'Sera',$2)", [spieler, cfg.now()]);
    const kampagne = await createCampaigns(quelle, cfg).createCampaign(gm, { name: "Die ganze Welt" });
    campaign = kampagne.id;
    await quelle.query("INSERT INTO actors(id,campaign_id,user_id,name) VALUES($1,$2,$3,'Sera')", [actorId, campaign, spieler]);
    await quelle.query("INSERT INTO campaign_memberships(campaign_id,user_id,role,display_name,name_skeleton,actor_id) VALUES($1,$2,'spieler','Sera','sera',$3)", [campaign, spieler, actorId]);
    await seedActorControl(quelle, campaign, actorId, spieler);

    // Ein Artikel, damit die Chronik nicht leer ist.
    const docs = createDocuments(quelle, cfg);
    await docs.saveEntry(gm, campaign, { title: "Der Hafen", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "Die Kaimauer trägt.", marks: [] }] } }] });

    // Ein Bild MIT Bytes — der Kern der Frage, ob „eine Datei" wirklich eine ist.
    assetId = randomUUID();
    const universeId = (await quelle.query<{ universe_id: string }>("SELECT universe_id FROM campaigns WHERE id=$1", [campaign])).rows[0]!.universe_id;
    await quelle.query(`INSERT INTO wiki_assets(id,campaign_id,universe_id,dateiname,lizenz_status,lizenz_gesetzt_von,created_by,created_at)
      VALUES($1,$2,$3,'hafen.png','frei','mensch',$4,$5)`, [assetId, campaign, universeId, gm, cfg.now()]);
    await createWikiMedien(quelle, cfg).bytesAnnehmen(gm, campaign, assetId, Buffer.from(PNG_BASE64, "base64"));

    // Regelwerk und Bogen — Voraussetzung für Wurf und Erleichterung.
    const game = createGameplay(quelle, cfg);
    await game.installPackage(gm, campaign, HOW_TO_BE_A_HERO_PACKAGE);
    const review = await game.previewPackage(gm, campaign, HOW_TO_BE_A_HERO_PACKAGE);
    await game.activatePackage(gm, campaign, { packageId: HOW_TO_BE_A_HERO_PACKAGE.id, packageVersion: HOW_TO_BE_A_HERO_PACKAGE.version, expectedVersion: 0, previewHash: review.previewHash });
    await game.updateSheet(spieler, campaign, { actorId, expectedVersion: 0, fields: { ...HTBAH_EXAMPLE_CHARACTERS[0]!.fields } });

    // Eine Lootkarte mit Kartengesicht, im Vorrat der Spielleitung.
    const actors = createActors(quelle, cfg);
    const vorlage = await actors.createItemTemplate(gm, campaign, { commandId: randomUUID(), definition: {
      schemaVersion: 2, name: "Laterne des Kartografen", loreEntryId: null, tags: ["licht"],
      seltenheit: "selten", kategorie: "Werkzeug", bildAssetId: assetId,
      spruch: "Sie brennt auch dort, wo es nichts zu sehen gibt.", zeilen: [{ label: "Gewicht", wert: "1 Pfund" }],
    } });
    await actors.instantiateItem(gm, campaign, { commandId: randomUUID(), templateId: vorlage.id, templateRevision: 1, holderActorId: null });

    // Eine Kampfbühne, eröffnet.
    const buehne = createKampfbuehne(quelle, cfg);
    const kampf = await buehne.anlegen(gm, campaign, { name: "Der Hinterhalt" });
    kampfId = kampf.id;
    await buehne.teilnehmerHinzufuegen(gm, campaign, kampfId, { name: "Sera", seite: "gefaehrten", initiative: 17, actorId });
    await buehne.teilnehmerHinzufuegen(gm, campaign, kampfId, { name: "Wolf", seite: "gegner", initiative: 12 });
    await buehne.eroeffnen(gm, campaign, kampfId);

    // Zwei Erleichterungen: eine offen, eine bereits eingelöst — beide Zustände müssen mit.
    const zug = createErleichterungen(quelle, cfg);
    const eingaben = { target: 70, critical_success_max: 5, critical_failure_min: 95, skill_check: true };
    erleichterungId = (await zug.gewaehren(gm, campaign, { actorId, gemeinteAktion: "skill_klettern", gewuerfelteAktion: "manual_ruling", eingaben, grund: "Du hast das Seil gesichert." })).id;
    const zweite = await zug.gewaehren(gm, campaign, { actorId, gemeinteAktion: "skill_feinmechanik", gewuerfelteAktion: "manual_ruling", eingaben, grund: "Gutes Werkzeug." });
    await game.prepareAction(spieler, campaign, { commandId: randomUUID(), actorId, actionId: "manual_ruling", erleichterungId: zweite.id });
  }, 60_000);
  afterAll(async () => { await quelle?.close(); });

  it("nimmt alles mit — Bühne, Lootkarte, Zugeständnis und die Bildbytes", async () => {
    const bundle = await exportCampaignBundle(quelle, gm, campaign, cfg);
    expect(bundle.version).toBe(12);
    const tabellen = currentCampaignTables(bundle);
    // Was diese Sitzung gebaut hat, steht wirklich im Paket.
    expect(tabellen.kaempfe).toHaveLength(1);
    expect(tabellen.kampf_teilnehmer).toHaveLength(2);
    expect(tabellen.erleichterungen).toHaveLength(2);
    expect(tabellen.item_template_revisions).toHaveLength(1);
    expect((tabellen.item_template_revisions[0]!.definition as { schemaVersion: number }).schemaVersion).toBe(2);
    // Beide Zustaende des Zugestaendnisses: eines offen, eines eingeloest mit Wurfbeleg.
    const eingeloest = tabellen.erleichterungen.filter(row => row.eingeloest_roll_id !== null);
    expect(eingeloest).toHaveLength(1);
    expect(tabellen.action_rolls.some(row => row.id === eingeloest[0]!.eingeloest_roll_id)).toBe(true);
    // Und die Bildbytes liegen IM Paket, nicht daneben.
    expect(tabellen.wiki_assets[0]!.daten).toBe(PNG_BASE64);
  });

  it("ist genau EINE Datei: ein JSON-Text, der alles enthält", async () => {
    const bundle = await exportCampaignBundle(quelle, gm, campaign, cfg);
    const text = serializeCurrentCampaignBundle(bundle);
    // Ein einziger, gültiger JSON-Text — kein Archiv, kein Beiwerk, keine Nachbardatei.
    expect(() => JSON.parse(text) as unknown).not.toThrow();
    expect(text.startsWith("{")).toBe(true);
    expect(text).toContain(PNG_BASE64);
    // Und er liest sich vollständig zurück.
    expect(currentCampaignSemanticDiff(bundle, parseCurrentCampaignBundle(text))).toEqual([]);
  });

  it("stellt aus dieser einen Datei dieselbe Welt wieder her", async () => {
    const bundle = await exportCampaignBundle(quelle, gm, campaign, cfg);
    const ziel = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(ziel);
      expect((await ziel.query("SELECT 1 FROM users")).rowCount).toBe(0);
      const gelesen = parseCurrentCampaignBundle(serializeCurrentCampaignBundle(bundle));
      expect(await restoreCampaignBundle(ziel, gelesen)).toMatchObject({ dryRun: false, formatVersion: 12 });
      // Der Beweis: erneut exportiert ergibt sich kein einziger inhaltlicher Unterschied.
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(ziel, gm, campaign, cfg))).toEqual([]);

      // Und die Welt ist danach wirklich benutzbar, nicht nur zeilengleich.
      const buehne = await createKampfbuehne(ziel, cfg).buehne(gm, campaign, kampfId);
      expect(buehne).toMatchObject({ name: "Der Hinterhalt", zustand: "laufend", runde: 1 });
      expect(buehne.teilnehmer.map(t => t.name)).toEqual(["Sera", "Wolf"]);
      const offene = await createErleichterungen(ziel, cfg).offene(gm, campaign);
      expect(offene.map(e => e.id)).toEqual([erleichterungId]);
      expect(offene[0]!.grund).toContain("Seil");
      const bild = await createWikiMedien(ziel, cfg).ausliefern(gm, campaign, assetId);
      expect(Buffer.from(bild.daten).toString("base64")).toBe(PNG_BASE64);
    } finally { await ziel.close(); }
  }, 60_000);

  it("nennt die Datei nach der Welt, nicht nach der Kennung", async () => {
    // Vorher hiess jeder Export `campaign.chronicle`: wer drei Kampagnen sichert, hatte dreimal
    // denselben Namen im Ordner und musste sie oeffnen, um sie zu unterscheiden.
    const app = await buildApp(quelle, cfg);
    try {
      const cookie = `chronicle_session=${(await createIdentity(quelle, cfg).issueSession(gm)).value}`;
      const antwort = await app.inject({ method: "GET", url: `/api/campaigns/${campaign}/export`, headers: { cookie } });
      expect(antwort.statusCode).toBe(200);
      const disposition = String(antwort.headers["content-disposition"]);
      expect(disposition).toContain("die-ganze-welt.chronicle");
      expect(disposition).not.toMatch(/[\r\n]/);
      // Und der Rumpf ist derselbe eine JSON-Text.
      expect(String(antwort.headers["content-type"])).toContain("atlas-chronicles");
      expect(() => JSON.parse(antwort.body) as unknown).not.toThrow();
    } finally { await app.close(); }
  }, 60_000);
});
