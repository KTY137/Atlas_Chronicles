import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DEMO_RULE_PACKAGE } from "@chronicle/rules";
import type { ActorCard, ItemCard, ItemContract, TemplateCard } from "@chronicle/protocol";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createActors } from "../packages/server/src/domain/actors.ts";

// Each regression gets a real, isolated campaign/database and real authenticated requests.
// The only network interception holds an actual server response; it never invents product data.
let schema: string, origin: string, campaignId: string, admin: Db, db: Db;
let app: Awaited<ReturnType<typeof buildApp>>;
let gmSession: { userId: string; value: string }, playerSession: { userId: string; value: string };
let earlier: ActorCard, later: ActorCard, item: ItemCard, itemTemplate: TemplateCard<ItemContract>;

test.beforeEach(async () => {
  schema = `chronicle_actor_drafts_${randomUUID().replaceAll("-", "")}`;
  const port = 9500 + Math.floor(Math.random() * 150); origin = `http://localhost:${port}`;
  const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
  const settings = process.env.E2E_DATABASE_URL ? null : JSON.parse(await readFile(".local/config.json", "utf8"));
  const base = process.env.E2E_DATABASE_URL ?? settings.databaseUrl;
  admin = createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
  const url = new URL(base); url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db), actors = createActors(db);
  gmSession = await identity.bootstrap("Kaya Entwürfe");
  campaignId = (await campaigns.createCampaign(gmSession.userId, { name: "Entwürfe am Frosttor" })).id;
  const invite = await campaigns.issueInvitation(gmSession.userId, campaignId), request = await campaigns.requestJoin(invite.code, { displayName: "Sera" });
  const member = await campaigns.approveJoin(gmSession.userId, campaignId, request.id);
  playerSession = { userId: member.userId, ...await identity.issueSession(member.userId) };
  const template = await actors.createActorTemplate(gmSession.userId, campaignId, {
    commandId: randomUUID(), definition: { schemaVersion: 1, name: "Wegkundige Begleitung", kind: "companion", loreEntryId: null,
      package: { id: DEMO_RULE_PACKAGE.id, version: DEMO_RULE_PACKAGE.version },
      fields: Object.fromEntries(Object.entries(DEMO_RULE_PACKAGE.fields).map(([id, field]) => [id, field.default])) },
  });
  const created: ActorCard[] = [];
  for (const name of ["Mira am Frosttor", "Dorn am Westweg"]) created.push(await actors.instantiateActor(gmSession.userId, campaignId, {
    commandId: randomUUID(), templateId: template.id, templateRevision: template.revision, name,
  }));
  [earlier, later] = created.sort((a, b) => a.id < b.id ? -1 : 1) as [ActorCard, ActorCard];
  // Start the player with exactly the later UUID, so a later grant deterministically changes sort order.
  for (const own of await actors.listActors(playerSession.userId, campaignId)) {
    const grant = (await actors.listControllers(gmSession.userId, campaignId, own.id)).find(g => g.userId === playerSession.userId)!;
    await actors.revokeController(gmSession.userId, campaignId, own.id, playerSession.userId, { commandId: randomUUID(), expectedVersion: grant.version, reason: "Separate Testfigur" });
  }
  await actors.grantController(gmSession.userId, campaignId, later.id, playerSession.userId, { commandId: randomUUID(), expectedVersion: 0, reason: "Begleitung führen" });
  const perspective = await actors.getReaderPerspective(gmSession.userId, campaignId);
  await actors.setReaderPerspective(gmSession.userId, campaignId, { commandId: randomUUID(), expectedVersion: perspective.version, actorId: later.id });
  itemTemplate = await actors.createItemTemplate(gmSession.userId, campaignId, { commandId: randomUUID(), definition: { schemaVersion: 1, name: "Silberner Wegschlüssel", tags: ["Reise"], loreEntryId: null } });
  item = await actors.instantiateItem(gmSession.userId, campaignId, { commandId: randomUUID(), templateId: itemTemplate.id, templateRevision: itemTemplate.revision, holderActorId: later.id });
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});

test.afterEach(async () => {
  await app?.close(); await db?.close();
  if (admin) {
    if (!/^chronicle_actor_drafts_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected actor draft schema");
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.close();
  }
});

const base = () => `${origin}/api/campaigns/${campaignId}`;
const paint = (page: Page) => page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };
async function access(browser: Browser, gm = true): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext(), session = gm ? gmSession : playerSession;
  await context.addCookies([{ name: "chronicle_session", value: session.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  return { context, page: await context.newPage() };
}
async function openInventory(page: Page) {
  await page.goto(`${origin}/?campaign=${campaignId}&stage=tisch`);
  await page.getByRole("combobox", { name: "Handelnde Figur", exact: true }).selectOption(later.id);
  await page.getByRole("tab", { name: "Figuren & Inventar", exact: true }).click();
  await page.getByRole("button", { name: "Silberner Wegschlüssel · 1", exact: true }).click();
  const editor = page.locator(".inventory-section"); await expect(editor.getByRole("heading", { name: "Silberner Wegschlüssel", exact: true })).toBeVisible(); return editor;
}

test("same selection and adding inventory cannot silently abandon an existing draft", async ({ browser }) => {
  for (const selected of ["item", "tab"] as const) await test.step(`reselecting the same ${selected} keeps the draft protected`, async () => {
    const { context, page } = await access(browser);
    try {
      const editor = await openInventory(page), notes = editor.getByRole("textbox", { name: "Notizen", exact: true });
      await notes.fill(`Ungespeicherter ${selected}-Entwurf`);
      await expect(page.locator(".band-status")).toHaveText("Ungespeicherter Entwurf");
      // Old behavior asks to discard, yet keeps the child mounted with its draft and clears only the guard.
      page.on("dialog", dialog => dialog.accept());
      if (selected === "item") await page.getByRole("button", { name: "Silberner Wegschlüssel · 1", exact: true }).click();
      else await page.getByRole("tab", { name: "Figuren & Inventar", exact: true }).click();
      await paint(page);
      await expect.soft(notes, "reselecting the current object is a no-op").toHaveValue(`Ungespeicherter ${selected}-Entwurf`, { timeout: 2000 });
      await expect.soft(page.locator(".band-status"), "the still-visible draft retains the navigation guard").toHaveText("Ungespeicherter Entwurf", { timeout: 2000 });
    } finally { await context.close(); }
  });
  await test.step("creating another item respects the current editor's draft", async () => {
    const { context, page } = await access(browser);
    try {
      const editor = await openInventory(page), notes = editor.getByRole("textbox", { name: "Notizen", exact: true });
      await notes.fill("Diesen Entwurf nicht durch einen neuen Gegenstand ersetzen");
      await page.getByRole("combobox", { name: "Gegenstand aus Vorlage", exact: true }).selectOption(itemTemplate.id);
      page.on("dialog", dialog => dialog.dismiss());
      const add = page.getByRole("button", { name: "Gegenstand hinzufügen", exact: true });
      if (await add.isEnabled()) {
        const response = page.waitForResponse(r => r.url() === `${base()}/items/instantiate` && r.request().method() === "POST", { timeout: 2000 }).catch(() => null);
        await add.click(); await response; await expect(add).toBeEnabled(); await paint(page);
      }
      await expect.soft(notes, "creation must either be guarded or retain the old selected editor").toHaveValue("Diesen Entwurf nicht durch einen neuen Gegenstand ersetzen", { timeout: 2000 });
      await expect.soft(page.locator(".band-status")).toHaveText("Ungespeicherter Entwurf", { timeout: 2000 });
    } finally { await context.close(); }
  });
});

test("an in-flight save and an earlier actor grant cannot overwrite later edits or switch actors", async ({ browser }) => {
  await test.step("edits typed while the real save response is delayed survive, or inputs are locked", async () => {
    const { context, page } = await access(browser), held = deferred(), release = deferred();
    try {
      const editor = await openInventory(page), notes = editor.getByRole("textbox", { name: "Notizen", exact: true });
      await notes.fill("Zum Speichern abgesendete Notiz"); await editor.getByLabel("Grund der Änderung", { exact: true }).fill("Fund notiert");
      await page.route(`${base()}/items/${item.id}`, async route => {
        if (route.request().method() !== "PUT") { await route.continue(); return; }
        const response = await route.fetch(); expect(response.status()).toBe(200); held.resolve();
        await release.promise; await route.fulfill({ response });
      });
      const save = editor.getByRole("button", { name: "Gegenstand speichern", exact: true });
      await save.click(); await held.promise;
      const locked = await notes.isDisabled();
      if (!locked) await notes.fill("Nach dem Absenden weitergeschriebener Entwurf");
      release.resolve(); await expect(save).toBeEnabled(); await paint(page);
      await expect.soft(notes, "the response may not erase text entered after submission").toHaveValue(locked ? "Zum Speichern abgesendete Notiz" : "Nach dem Absenden weitergeschriebener Entwurf", { timeout: 2000 });
      expect((await (await page.request.get(`${base()}/items/${item.id}`)).json()).state.notes).toBe("Zum Speichern abgesendete Notiz");
    } finally { release.resolve(); await context.close(); }
  });
  await test.step("a lower UUID granted by the GM does not change an untouched actor selector", async () => {
    const gm = await access(browser), player = await access(browser, false);
    try {
      await player.page.goto(`${origin}/?campaign=${campaignId}&stage=tisch`);
      const picker = player.page.getByRole("combobox", { name: "Handelnde Figur", exact: true });
      await expect(picker).toHaveValue(later.id); // Deliberately do not issue a select gesture.
      await player.page.getByRole("tab", { name: "Figur", exact: true }).click();
      await player.page.getByLabel("Scharfsinn", { exact: true }).fill("6");
      await gm.page.goto(`${origin}/?campaign=${campaignId}&stage=tisch`);
      await gm.page.getByRole("combobox", { name: "Handelnde Figur", exact: true }).selectOption(earlier.id);
      await gm.page.getByRole("tab", { name: "Figuren & Inventar", exact: true }).click();
      const details = gm.page.locator(".actor-details");
      await details.getByLabel("Grund der Änderung", { exact: true }).fill("Weitere Begleitung freigeben");
      await details.getByRole("combobox", { name: "Mitglied", exact: true }).selectOption(playerSession.userId);
      await details.getByRole("button", { name: "Kontrolle erlauben", exact: true }).click();
      await expect(picker.locator(`option[value="${earlier.id}"]`)).toHaveCount(1); await paint(player.page);
      await expect.soft(picker, "a grant may extend choices without selecting another actor").toHaveValue(later.id, { timeout: 2000 });
      await expect.soft(player.page.getByLabel("Scharfsinn", { exact: true }), "the first actor's unsaved sheet remains mounted").toHaveValue("6", { timeout: 2000 });
    } finally { await gm.context.close(); await player.context.close(); }
  });
});

test("a delayed initial reader perspective cannot erase an already editable wiki draft", async ({ browser }) => {
  const { context, page } = await access(browser), held = deferred(), release = deferred();
  try {
    await page.route(`${base()}/reader-perspective`, async route => {
      if (route.request().method() !== "GET") { await route.continue(); return; }
      const response = await route.fetch(); expect(response.status()).toBe(200);
      expect((await response.json()).actorId).not.toBeNull(); held.resolve(); await release.promise; await route.fulfill({ response });
    });
    await page.goto(`${origin}/?campaign=${campaignId}&stage=wiki`); await held.promise; await paint(page);
    const create = page.getByRole("button", { name: "Artikel anlegen", exact: true }), title = page.getByLabel("Artikeltitel", { exact: true });
    const editableBeforePerspective = await create.isVisible();
    if (editableBeforePerspective) { await create.click(); await title.fill("Mein Entwurf vor dem Wissensblick"); }
    release.resolve(); await expect(page.getByRole("combobox", { name: "Brieffigur", exact: true })).toBeVisible(); await paint(page);
    if (!editableBeforePerspective) { await create.click(); await title.fill("Mein Entwurf vor dem Wissensblick"); }
    await expect(title, "initial perspective hydration must gate editing or preserve a started editor").toHaveValue("Mein Entwurf vor dem Wissensblick", { timeout: 2000 });
    await expect(page.locator(".band-status")).toHaveText("Ungespeicherter Entwurf");
  } finally { release.resolve(); await context.close(); }
});

test("a delayed template save cannot erase a subsequently opened template draft", async ({ browser }) => {
  for (const kind of ["actor", "item"] as const) await test.step(`${kind} template responses belong to their original editor`, async () => {
    const { context, page } = await access(browser), held = deferred(), release = deferred();
    const path = kind === "actor" ? "/actor-templates" : "/item-templates";
    const names = kind === "actor"
      ? { view: "Figurvorlagen", input: "Vorlagenname", save: "Figurvorlage speichern", create: "Neue Figurvorlage" }
      : { view: "Gegenstandsvorlagen", input: "Gegenstandsname", save: "Gegenstandsvorlage speichern", create: "Neue Gegenstandsvorlage" };
    try {
      await page.goto(`${origin}/?campaign=${campaignId}&stage=tisch`);
      await page.getByRole("tab", { name: "Figuren & Inventar", exact: true }).click();
      await page.getByRole("button", { name: names.view, exact: true }).click();
      const field = page.getByRole("textbox", { name: names.input, exact: true });
      await field.fill(`Abgesendete ${kind}-Vorlage A`);
      await page.route(`${base()}${path}`, async route => {
        if (route.request().method() !== "POST") { await route.continue(); return; }
        const response = await route.fetch(); expect(response.status()).toBe(200);
        held.resolve(); await release.promise; await route.fulfill({ response });
      });
      const response = page.waitForResponse(r => r.url() === `${base()}${path}` && r.request().method() === "POST");
      await page.getByRole("button", { name: names.save, exact: true }).click();
      await held.promise;
      const chooseNew = page.getByRole("button", { name: names.create, exact: true });
      const locked = await chooseNew.isDisabled();
      page.on("dialog", dialog => dialog.accept());
      if (!locked) {
        await chooseNew.click();
        await field.fill(`Noch ungespeicherter ${kind}-Entwurf B`);
        await expect(page.locator(".band-status")).toHaveText("Ungespeicherter Entwurf");
      }
      release.resolve(); await response; await paint(page);
      if (locked) {
        await expect(chooseNew).toBeEnabled();
        await chooseNew.click(); await field.fill(`Noch ungespeicherter ${kind}-Entwurf B`);
      }
      await expect.soft(field, "an earlier successful response cannot close a later editor").toHaveValue(`Noch ungespeicherter ${kind}-Entwurf B`, { timeout: 2000 });
      await expect.soft(page.locator(".band-status"), "the later editor retains its navigation guard").toHaveText("Ungespeicherter Entwurf", { timeout: 2000 });
    } finally { release.resolve(); await context.close(); }
  });
});
