import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseCampaignBundleV2 } from "@chronicle/io";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createDocuments } from "../packages/server/src/domain/documents.ts";

const schema = `chronicle_actors_e2e_${randomUUID().replaceAll("-", "")}`;
const port = 9700 + Math.floor(Math.random() * 200), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let admin: Db, db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string, entryId: string, hiddenPassage: string, playerId: string;
const sessions: { userId: string; value: string }[] = [];
test.beforeAll(async () => {
  const settings = process.env.E2E_DATABASE_URL ? null : JSON.parse(await readFile(".local/config.json", "utf8"));
  const base = process.env.E2E_DATABASE_URL ?? settings.databaseUrl;
  admin = createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
  const url = new URL(base); url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href); await migrate(db);
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
    await gm.getByRole("button", { name: "Figuren & Besitz", exact: true }).click();
    const instantiate = form(gm, "Figur aus Vorlage erschaffen");
    await instantiate.getByRole("combobox", { name: "Figurvorlage", exact: true }).selectOption(template.id);
    await instantiate.getByLabel("Name dieser Figur", { exact: true }).fill("Mira am Frosttor");
    const created = gm.waitForResponse(r => r.url() === `${base}/actors/instantiate` && r.request().method() === "POST");
    await instantiate.getByRole("button", { name: "Figur erschaffen", exact: true }).click();
    const actorResponse = await created; expect(actorResponse.status()).toBe(200); const actor = await actorResponse.json();
    await gm.getByRole("combobox", { name: "Handelnde Figur", exact: true }).selectOption(actor.id);
    const details = gm.locator(".actor-details");
    await details.getByLabel("Grund der Änderung", { exact: true }).fill("Sera führt die Begleiterin mit.");
    await details.getByRole("combobox", { name: "Mitglied", exact: true }).selectOption(playerId);
    await details.getByRole("button", { name: "Kontrolle erlauben", exact: true }).click();
    await expect(player.getByRole("combobox", { name: "Handelnde Figur", exact: true }).locator("option", { hasText: actor.name })).toHaveCount(1);
    expect((await outsider.request.get(`${base}/actors/${actor.id}`)).status()).toBe(404);
    const reveal = await gm.request.post(`${base}/reveal`, { headers: { origin }, data: { passageId: hiddenPassage, actorId: actor.id } });
    expect(reveal.status()).toBe(200);
    expect((await player.request.get(`${base}/entries/${entryId}`)).status()).toBe(404);
    await player.getByRole("combobox", { name: "Wissensblick", exact: true }).selectOption(actor.id);
    await stage(player, "Chronik").click();
    await player.getByRole("button", { name: /Das Gedächtnis der Begleiterin/ }).click();
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
    await gm.getByRole("button", { name: "Gegenstandsvorlagen", exact: true }).click();
    const itemForm = form(gm, "Gegenstandsvorlage anlegen");
    await itemForm.getByLabel("Gegenstandsname", { exact: true }).fill("Silberner Wegschlüssel");
    await itemForm.getByLabel("Etiketten, durch Komma getrennt", { exact: true }).fill("Schlüssel, Reise");
    const itemTemplateSaved = gm.waitForResponse(r => r.url() === `${base}/item-templates` && r.request().method() === "POST");
    await itemForm.getByRole("button", { name: "Gegenstandsvorlage speichern", exact: true }).click();
    const itemTemplateResponse = await itemTemplateSaved; expect(itemTemplateResponse.status()).toBe(200); const itemTemplate = await itemTemplateResponse.json();
    await gm.getByRole("button", { name: "Figuren & Besitz", exact: true }).click();
    await gm.getByRole("combobox", { name: "Handelnde Figur", exact: true }).selectOption(actor.id);
    await gm.getByRole("combobox", { name: "Gegenstand aus Vorlage", exact: true }).selectOption(itemTemplate.id);
    const itemCreated = gm.waitForResponse(r => r.url() === `${base}/items/instantiate` && r.request().method() === "POST");
    await gm.getByRole("button", { name: "Gegenstand hinzufügen", exact: true }).click();
    const itemResponse = await itemCreated; expect(itemResponse.status()).toBe(200); const item = await itemResponse.json();
    await player.getByRole("tab", { name: "Figuren & Inventar", exact: true }).click();
    await player.getByRole("button", { name: /Silberner Wegschlüssel · 1/ }).click();
    const itemEditor = form(player, "Silberner Wegschlüssel");
    await itemEditor.getByLabel("Menge", { exact: true }).fill("2");
    await itemEditor.getByLabel("Notizen", { exact: true }).fill("Am Frosttor gefunden.");
    await itemEditor.getByLabel("Grund der Änderung", { exact: true }).fill("Zweiten Schlüssel erhalten");
    await itemEditor.getByRole("button", { name: "Gegenstand speichern", exact: true }).click();
    await expect.poll(async () => (await (await gm.request.get(`${base}/items/${item.id}`)).json()).state.quantity).toBe(2);
    expect((await outsider.request.get(`${base}/items/${item.id}`)).status()).toBe(404);
    const second = await gm.request.post(`${base}/actors/instantiate`, { headers: { origin }, data: { commandId: randomUUID(), templateId: template.id, templateRevision: template.revision, name: "Zweite Begleitung" } });
    expect(second.status()).toBe(200); const secondActor = await second.json();
    expect((await (await gm.request.get(`${base}/actors/${secondActor.id}/sheet`)).json()).fields.insight).toBe(4);
    expect((await (await gm.request.get(`${base}/actor-templates/${template.id}`)).json()).definition.fields.insight).toBe(4);
    await player.screenshot({ path: test.info().outputPath("shared-actor-inventory.png"), fullPage: true });

    await details.getByLabel("Grund der Änderung", { exact: true }).fill("Vertretung beendet.");
    const controller = details.locator("li").filter({ hasText: "Sera" });
    await controller.getByRole("button", { name: "Kontrolle entziehen", exact: true }).click();
    await expect.poll(async () => (await player.request.get(`${base}/actors/${actor.id}/sheet`)).status()).toBe(404);
    await expect(player.getByRole("combobox", { name: "Handelnde Figur", exact: true }).locator("option", { hasText: actor.name })).toHaveCount(0);
    expect((await player.request.get(`${base}/items/${item.id}`)).status()).toBe(404);
    expect((await player.request.get(`${base}/entries/${entryId}`)).status()).toBe(404);
    const archiveResponse = await gm.request.get(`${base}/export`); expect(archiveResponse.status()).toBe(200);
    const bundle = parseCampaignBundleV2(await archiveResponse.text());
    expect(bundle.version).toBe(2); expect(bundle.tables.actor_profiles.some(row => row.actor_id === actor.id)).toBe(true);
    expect(bundle.tables.item_instances.find(row => row.id === item.id)?.state).toMatchObject({ quantity: 2, notes: "Am Frosttor gefunden." });
    await gm.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => gm.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await gm.screenshot({ path: test.info().outputPath("actor-inventory-phone.png"), fullPage: true });
    expect(errors).toEqual([]);
  } finally { for (const context of contexts) await context.close(); }
});
