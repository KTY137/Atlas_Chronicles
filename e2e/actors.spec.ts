import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseCurrentCampaignBundle } from "@chronicle/io";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createDocuments } from "../packages/server/src/domain/documents.ts";

const schema = `chronicle_actors_e2e_${randomUUID().replaceAll("-", "")}`;
const port = 9700 + Math.floor(Math.random() * 200), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let admin: Db, db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string, entryId: string, hiddenPassage: string, playerId: string;
const sessions: { userId: string; value: string }[] = [];
test.beforeAll(async () => {
  const settings = process.env.E2E_DATABASE_URL ? null : await readFile(".local/config.json", "utf8")
    .then(text => JSON.parse(text)).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  const base = process.env.E2E_DATABASE_URL ?? settings?.databaseUrl;
  if (base) {
    admin = createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
    const url = new URL(base); url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href);
  } else db = await createTestDb();
  await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db), gm = await identity.bootstrap("Kaya Figuren"); sessions.push(gm);
  campaignId = (await campaigns.createCampaign(gm.userId, { name: "Die geteilte Begleitung" })).id;
  const invite = await campaigns.issueInvitation(gm.userId, campaignId);
  for (const displayName of ["Sera", "Dorn"]) {
    const request = await campaigns.requestJoin(invite.code, { displayName }), member = await campaigns.approveJoin(gm.userId, campaignId, request.id);
    sessions.push({ userId: member.userId, ...await identity.issueSession(member.userId) });
  }
  playerId = sessions[1]!.userId;
  const entry = await createDocuments(db).saveEntry(gm.userId, campaignId, { title: "Das Gedächtnis der Begleiterin", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "Nur die Begleiterin kennt den silbernen Schlüssel.", marks: [] }] } }] });
  entryId = entry.entryId; hiddenPassage = entry.passagen[0]!.pid;
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => {
  await app?.close(); await db?.close();
  if (admin) { if (!/^chronicle_actors_e2e_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected actor schema"); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.close(); }
});
const form = (page: Page, name: string) => page.locator("form").filter({ has: page.getByRole("heading", { name, exact: true }) });
const stage = (page: Page, name: string) => page.getByRole("navigation", { name: "Bereiche" }).getByRole("button", { name, exact: true });

test("templates create independent shared actors and inventory; perspective and revoke reach real browsers", async ({ browser }) => {
  const contexts = await Promise.all(sessions.map(() => browser.newContext())), pages: Page[] = [], errors: string[] = [];
  const base = `${origin}/api/campaigns/${campaignId}`;
  try {
    for (let i = 0; i < contexts.length; i++) {
      await contexts[i]!.addCookies([{ name: "chronicle_session", value: sessions[i]!.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
      const page = await contexts[i]!.newPage(); pages.push(page); page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${origin}/?campaign=${campaignId}&stage=tisch`);
    }
    const [gm, player, outsider] = pages as [Page, Page, Page];
    await gm.getByRole("tab", { name: "Figuren & Inventar", exact: true }).click();
    await gm.getByRole("button", { name: "Figurvorlagen", exact: true }).click();
    const templateForm = form(gm, "Figurvorlage anlegen");
    await templateForm.getByLabel("Vorlagenname", { exact: true }).fill("Wegkundige Begleitung");
    await templateForm.getByRole("combobox", { name: "Art der Figur", exact: true }).selectOption("companion");
    await templateForm.getByLabel("Scharfsinn", { exact: true }).fill("4");
    const templateSaved = gm.waitForResponse(r => r.url() === `${base}/actor-templates` && r.request().method() === "POST");
    await templateForm.getByRole("button", { name: "Figurvorlage speichern", exact: true }).click();
    const templateResponse = await templateSaved; expect(templateResponse.status()).toBe(200); const template = await templateResponse.json();
    await gm.getByRole("tab", { name: "Figur anlegen", exact: true }).click();
    // Der geführte Weg: Wer ist die Figur? — Was kann sie? — Fertig.
    const instantiate = form(gm, "Figur anlegen");
    await instantiate.getByRole("combobox", { name: "Aus welcher Figurvorlage?", exact: true }).selectOption(template.id);
    await instantiate.getByLabel("Name dieser Figur", { exact: true }).fill("Mira am Frosttor");
    await instantiate.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(instantiate.getByLabel("Scharfsinn", { exact: true })).toHaveValue("4");
    await instantiate.getByRole("button", { name: "Weiter", exact: true }).click();
    const created = gm.waitForResponse(r => r.url() === `${base}/actors/instantiate` && r.request().method() === "POST");
    await instantiate.getByRole("button", { name: "Figur anlegen", exact: true }).click();
    const actorResponse = await created; expect(actorResponse.status()).toBe(200); const actor = await actorResponse.json();
    await gm.getByRole("button", { name: "Figuren am Tisch öffnen", exact: true }).click();
    await gm.getByRole("combobox", { name: "Handelnde Figur", exact: true }).selectOption(actor.id);
    const details = gm.locator(".actor-details");
    await details.getByLabel("Grund (freiwillig, erscheint im Verlauf)", { exact: true }).fill("Sera führt die Begleiterin mit.");
    await details.getByRole("combobox", { name: "Mitglied", exact: true }).selectOption(playerId);
    await details.getByRole("button", { name: "Kontrolle erlauben", exact: true }).click();
    await expect(player.getByRole("combobox", { name: "Handelnde Figur", exact: true }).locator("option", { hasText: actor.name })).toHaveCount(1);
    expect((await outsider.request.get(`${base}/actors/${actor.id}`)).status()).toBe(404);
    const reveal = await gm.request.post(`${base}/reveal`, { headers: { origin }, data: { passageId: hiddenPassage, actorId: actor.id } });
    expect(reveal.status()).toBe(200);
    expect((await player.request.get(`${base}/entries/${entryId}`)).status()).toBe(404);
    await player.getByRole("combobox", { name: "Wissensblick", exact: true }).selectOption(actor.id);
    await stage(player, "Chronik").click();
    await player.getByRole("complementary", { name: "Artikelübersicht" }).getByRole("button", { name: "Das Gedächtnis der Begleiterin", exact: true }).click();
    await expect(player.locator("article.article-body")).toContainText("silbernen Schlüssel");
    expect((await outsider.request.get(`${base}/entries/${entryId}`)).status()).toBe(404);

    // Editing an instance does not mutate its template or another instance.
    await stage(player, "Tisch").click(); await player.getByRole("combobox", { name: "Handelnde Figur", exact: true }).selectOption(actor.id);
    await player.getByRole("tab", { name: "Figur", exact: true }).click();
    await expect(player.getByLabel("Scharfsinn", { exact: true })).toHaveValue("4");
    await player.getByLabel("Scharfsinn", { exact: true }).fill("6");
    await player.getByRole("button", { name: "Bogen speichern", exact: true }).click();
    await expect.poll(async () => (await (await player.request.get(`${base}/actors/${actor.id}/sheet`)).json()).fields.insight).toBe(6);
    // The grant's reason can remain a draft; dismiss explicitly when leaving that form.
    gm.once("dialog", d => d.accept());
    await gm.getByRole("button", { name: "Lootkarten erstellen", exact: true }).click();
    const itemForm = form(gm, "Lootkarte erstellen");
    await itemForm.getByLabel("Gegenstandsname", { exact: true }).fill("Silberner Wegschlüssel");
    await itemForm.getByText("Stichwörter & Artikel · optional", { exact: true }).click();
    await itemForm.getByLabel("Etiketten, durch Komma getrennt", { exact: true }).fill("Schlüssel, Reise");
    const itemTemplateSaved = gm.waitForResponse(r => r.url() === `${base}/item-templates` && r.request().method() === "POST");
    await itemForm.getByRole("button", { name: "Lootkarte speichern", exact: true }).click();
    const itemTemplateResponse = await itemTemplateSaved; expect(itemTemplateResponse.status()).toBe(200); const itemTemplate = await itemTemplateResponse.json();
    await gm.getByRole("button", { name: "Jetzt Exemplar erzeugen", exact: true }).click();
    await gm.getByRole("combobox", { name: "Inventar", exact: true }).selectOption(actor.id);
    await gm.getByRole("combobox", { name: "Gegenstand aus Vorlage", exact: true }).selectOption(itemTemplate.id);
    const itemCreated = gm.waitForResponse(r => r.url() === `${base}/items/instantiate` && r.request().method() === "POST");
    await gm.getByRole("button", { name: "Gegenstand hinzufügen", exact: true }).click();
    const itemResponse = await itemCreated; expect(itemResponse.status()).toBe(200); const item = await itemResponse.json();
    await player.getByRole("tab", { name: "Figuren & Inventar", exact: true }).click();
    await player.getByRole("button", { name: /Silberner Wegschlüssel/ }).click();
    const itemEditor = form(player, "Silberner Wegschlüssel");
    await itemEditor.getByLabel("Menge", { exact: true }).fill("2");
    await itemEditor.getByLabel("Notizen", { exact: true }).fill("Am Frosttor gefunden.");
    await itemEditor.getByLabel("Grund (freiwillig, erscheint im Verlauf)", { exact: true }).fill("Zweiten Schlüssel erhalten");
    await itemEditor.getByRole("button", { name: "Gegenstand speichern", exact: true }).click();
    await expect.poll(async () => (await (await gm.request.get(`${base}/items/${item.id}`)).json()).state.quantity).toBe(2);
    expect((await outsider.request.get(`${base}/items/${item.id}`)).status()).toBe(404);
    const second = await gm.request.post(`${base}/actors/instantiate`, { headers: { origin }, data: { commandId: randomUUID(), templateId: template.id, templateRevision: template.revision, name: "Zweite Begleitung" } });
    expect(second.status()).toBe(200); const secondActor = await second.json();
    expect((await (await gm.request.get(`${base}/actors/${secondActor.id}/sheet`)).json()).fields.insight).toBe(4);
    expect((await (await gm.request.get(`${base}/actor-templates/${template.id}`)).json()).definition.fields.insight).toBe(4);
    await player.screenshot({ path: test.info().outputPath("shared-actor-inventory.png"), fullPage: true });

    await stage(gm, "Tisch").click();
    await gm.getByRole("tab", { name: "Figuren & Inventar", exact: true }).click();
    await gm.getByRole("combobox", { name: "Handelnde Figur", exact: true }).selectOption(actor.id);
    await details.getByLabel("Grund (freiwillig, erscheint im Verlauf)", { exact: true }).fill("Vertretung beendet.");
    const controller = details.locator("li").filter({ hasText: "Sera" });
    await controller.getByRole("button", { name: "Kontrolle entziehen", exact: true }).click();
    await expect.poll(async () => (await player.request.get(`${base}/actors/${actor.id}/sheet`)).status()).toBe(404);
    await expect(player.getByRole("combobox", { name: "Handelnde Figur", exact: true }).locator("option", { hasText: actor.name })).toHaveCount(0);
    expect((await player.request.get(`${base}/items/${item.id}`)).status()).toBe(404);
    expect((await player.request.get(`${base}/entries/${entryId}`)).status()).toBe(404);
    const archiveResponse = await gm.request.get(`${base}/export`); expect(archiveResponse.status()).toBe(200);
    const bundle = parseCurrentCampaignBundle(await archiveResponse.text());
    expect(bundle.version).toBe(5); // Authored loot cards use the extended item contract.
    expect(bundle.tables.actor_profiles.some(row => row.actor_id === actor.id)).toBe(true);
    expect(bundle.tables.item_instances.find(row => row.id === item.id)?.state).toMatchObject({ quantity: 2, notes: "Am Frosttor gefunden." });
    await gm.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => gm.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await gm.screenshot({ path: test.info().outputPath("actor-inventory-phone.png"), fullPage: true });
    expect(errors).toEqual([]);
  } finally { for (const context of contexts) await context.close(); }
});

test("Freigabe und Anträge: die Spielleitung öffnet eine Vorlage und bestätigt die beantragte Figur", async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]), errors: string[] = [];
  const base = `${origin}/api/campaigns/${campaignId}`;
  try {
    for (let i = 0; i < contexts.length; i++)
      await contexts[i]!.addCookies([{ name: "chronicle_session", value: sessions[i]!.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
    const gm = await contexts[0]!.newPage(), player = await contexts[1]!.newPage();
    for (const page of [gm, player]) page.on("pageerror", error => errors.push(error.message));
    const template = await (await gm.request.post(`${base}/actor-templates`, { headers: { origin }, data: { commandId: randomUUID(), definition: {
      schemaVersion: 1, name: "Freigegebene Wanderin", kind: "player_character", loreEntryId: null,
      package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version }, fields: { insight: 4 },
    } } })).json();

    // Der Schalter steht an der Vorlage selbst — dort, wo die Spielleitung sie ohnehin ansieht.
    await gm.goto(`${origin}/?campaign=${campaignId}&stage=schmiede&forge=actors`);
    const zeile = gm.locator("li").filter({ hasText: "Freigegebene Wanderin" });
    const freigegeben = gm.waitForResponse(r => r.url() === `${base}/actor-templates/${template.id}/freigabe` && r.request().method() === "PUT");
    await zeile.getByRole("button", { name: "Für Spieler freigeben", exact: true }).click();
    const quittung = await freigegeben; expect(quittung.status()).toBe(200);
    expect(await quittung.json()).toMatchObject({ freigegeben: true, version: 1 });
    await expect(zeile.getByRole("button", { name: "Freigabe entziehen", exact: true })).toBeVisible();
    // Erst jetzt sieht ein Spieler die Vorlage überhaupt.
    expect((await (await player.request.get(`${base}/actor-templates/freigegeben`)).json()).map((v: { id: string }) => v.id)).toContain(template.id);

    const antrag = await (await player.request.post(`${base}/figurantraege`, { headers: { origin },
      data: { commandId: randomUUID(), templateId: template.id, name: "Nell vom Frosttor", anfangswerte: { insight: 5 } } })).json();
    expect(antrag.status).toBe("offen");

    await gm.goto(`${origin}/?campaign=${campaignId}&stage=tisch`);
    await gm.getByRole("tab", { name: "Figuren & Inventar", exact: true }).click();
    // Der Reiter trägt die Zahl der offenen Anträge („Anträge, 1 offen“).
    await gm.getByRole("tab", { name: /^Anträge/ }).click();
    // Die Abweichung steht auf der Karte: bestätigt wird nicht bloß ein Name.
    await expect(gm.getByText("Nell vom Frosttor", { exact: true })).toBeVisible();
    await expect(gm.getByText("Scharfsinn · 5", { exact: true })).toBeVisible();
    const entschieden = gm.waitForResponse(r => r.url() === `${base}/figurantraege/${antrag.id}/bestaetigen` && r.request().method() === "POST");
    await gm.getByRole("button", { name: "Bestätigen", exact: true }).click();
    const antwort = await entschieden; expect(antwort.status()).toBe(200);
    const { antrag: karte, actorId } = await antwort.json();
    expect(karte.status).toBe("bestaetigt");

    // Die Figur gehört der Spielerin und trägt die bestätigten Werte; die Liste ist wieder leer.
    expect((await (await player.request.get(`${base}/actors/${actorId}/sheet`)).json()).fields.insight).toBe(5);
    await expect(gm.getByText("Zurzeit wartet kein Antrag auf eine Entscheidung.")).toBeVisible();
    await gm.screenshot({ path: test.info().outputPath("figurantrag-entscheidung.png"), fullPage: true });
    expect(errors).toEqual([]);
  } finally { for (const context of contexts) await context.close(); }
});
