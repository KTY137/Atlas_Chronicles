import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildApp } from "../packages/server/src/app.ts";
import { createPgDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createDocuments } from "../packages/server/src/domain/documents.ts";
import { contrastRatio, getThemePreset, THEME_PRESET_IDS } from "@chronicle/theme";

const schema = `chronicle_authoring_e2e_${randomUUID().replaceAll("-", "")}`;
const port = 10100 + Math.floor(Math.random() * 150), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist"), publicDeliveryEnabled: true };
let admin: Db, db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string, gm: { userId: string; value: string }, player: { userId: string; value: string }, entryId: string;
test.beforeAll(async () => {
  const settings = process.env.E2E_DATABASE_URL ? null : JSON.parse(await readFile(".local/config.json", "utf8"));
  const base = process.env.E2E_DATABASE_URL ?? settings.databaseUrl;
  admin = createPgDb(base); await admin.query(`CREATE SCHEMA "${schema}"`);
  const url = new URL(base); url.searchParams.set("options", `-c search_path=${schema}`); db = createPgDb(url.href); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db);
  gm = await identity.bootstrap("Kaya Gestaltung"); campaignId = (await campaigns.createCampaign(gm.userId, { name: "Die offenen Annalen" })).id;
  const invite = await campaigns.issueInvitation(gm.userId, campaignId), request = await campaigns.requestJoin(invite.code, { displayName: "Sera Leserin" }), member = await campaigns.approveJoin(gm.userId, campaignId, request.id);
  player = { userId: member.userId, ...await identity.issueSession(member.userId) };
  const entry = await createDocuments(db).saveEntry(gm.userId, campaignId, { title: "Der offene Hafen", passages: ["Der Hafen liegt am silbernen Meer.", "GEHEIM: Das versunkene Tor liegt unter dem Leuchtturm."].map(text => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } })) }); entryId = entry.entryId;
});
// Each independent functional scenario starts with a fresh process rate budget.
// The suite is not a cumulative minute-rate endurance test.
test.beforeEach(async () => { await app?.close(); app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port }); });
test.afterAll(async () => { await app?.close(); await db?.close(); if (admin) { if (!/^chronicle_authoring_e2e_[a-f0-9]{32}$/.test(schema)) throw new Error("Unexpected authoring schema"); await admin.query(`DROP SCHEMA "${schema}" CASCADE`); await admin.close(); } });
async function login(page: Page, session = gm, stage = "schmiede") {
  await page.context().addCookies([{ name: "chronicle_session", value: session.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  await page.goto(`${origin}/?campaign=${campaignId}&stage=${stage}`);
}

test("local appearance persists, OS restrictions win and a theme revision reaches another member", async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]); const [editor, reader] = await Promise.all(contexts.map(context => context.newPage()));
  const errors: string[] = []; for (const page of [editor!, reader!]) page.on("pageerror", error => errors.push(error.message));
  try {
    await login(editor!); await login(reader!, player, "account");
    await editor!.getByRole("navigation", { name: "Werkstätten" }).getByRole("button", { name: "Themes", exact: true }).click();
    await editor!.getByRole("button", { name: "Vorlage Cyberpunk", exact: true }).click();
    await editor!.getByLabel("Name", { exact: true }).fill("");
    await expect(editor!.getByLabel("Name", { exact: true })).toBeVisible();
    await editor!.getByLabel("Name", { exact: true }).fill("Nacht am Hafen");
    await editor!.getByRole("button", { name: "Als neues Theme speichern", exact: true }).click();
    await expect(editor!.getByText("Theme-Version gespeichert.", { exact: false })).toBeVisible();
    await expect(reader!.locator("html")).toHaveAttribute("data-appearance-theme", "Fantasy");
    await editor!.getByRole("button", { name: "Gespeicherte Revision für die Runde übernehmen", exact: true }).click();
    await expect(reader!.locator("html")).toHaveAttribute("data-appearance-theme", "Cyberpunk");
    await reader!.getByLabel("Lokaler Look", { exact: true }).selectOption("PixelArt");
    await reader!.getByLabel("Kontrast", { exact: true }).selectOption("high");
    await reader!.getByLabel("Dekoration ausblenden", { exact: true }).check();
    await reader!.reload();
    await expect(reader!.locator("html")).toHaveAttribute("data-appearance-theme", "PixelArt");
    await expect(reader!.locator("html")).toHaveAttribute("data-appearance-contrast", "high");
    await expect(reader!.locator("html")).toHaveAttribute("data-appearance-art", "off");
    await reader!.getByLabel("Kontrast", { exact: true }).selectOption("normal");
    await reader!.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
    await expect(reader!.locator("html")).toHaveAttribute("data-appearance-motion", "none");
    await expect(reader!.locator("html")).toHaveAttribute("data-appearance-contrast", "high");
    await reader!.setViewportSize({ width: 390, height: 844 });
    expect(await reader!.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await reader!.screenshot({ path: test.info().outputPath("appearance-mobile.png"), fullPage: true });
    const download = editor!.waitForEvent("download"); await editor!.getByRole("button", { name: "Gespeicherte Theme-Datei", exact: true }).click(); expect((await download).suggestedFilename()).toMatch(/\.chronicle-theme$/);
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); }
});

test("publication preview matches anonymous bytes and private later edits stay private until an explicit republish", async ({ browser }) => {
  const member = await browser.newContext(), anonymous = await browser.newContext(); const page = await member.newPage(), publicPage = await anonymous.newPage();
  try {
    await login(page); await page.getByRole("navigation", { name: "Werkstätten" }).getByRole("button", { name: "Veröffentlichung", exact: true }).click();
    await page.getByLabel("Welt ausdrücklich freigeben.", { exact: false }).check();
    await page.getByRole("button", { name: "Welt-Einstellungen speichern", exact: true }).click();
    await expect(page.getByText("Welt-Einstellungen gespeichert.", { exact: true })).toBeVisible();
    await page.getByRole("navigation", { name: "Veröffentlichung bearbeiten" }).getByRole("button", { name: "Artikel", exact: true }).click();
    await page.getByLabel("Artikel auswählen", { exact: true }).selectOption(entryId);
    await page.locator(".publication-passage").first().getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Öffentliche Vorschau prüfen", exact: true }).click();
    const preview = page.frameLocator('iframe[title="Öffentliche Artikelvorschau"]');
    await expect(preview.getByText("Der Hafen liegt am silbernen Meer.", { exact: true })).toBeVisible();
    await expect(preview.getByText("GEHEIM", { exact: false })).toHaveCount(0);
    const previewHtml = await page.locator('iframe[title="Öffentliche Artikelvorschau"]').getAttribute("srcdoc");
    await page.getByRole("button", { name: "Genau diesen geprüften Stand freigeben", exact: true }).click();
    await expect(page.getByText("Der geprüfte Artikelstand ist jetzt öffentlich.", { exact: true })).toBeVisible();
    const link = await page.getByRole("link", { name: "Öffentlichen Artikel öffnen", exact: true }).getAttribute("href"); expect(link).toBeTruthy();
    const response = await publicPage.goto(origin + link); expect(response!.status()).toBe(200); expect(await response!.text()).toBe(previewHtml);
    const previousEtag = response!.headers()["etag"];
    const doc = await createDocuments(db).getEntry(gm.userId, campaignId, entryId);
    await createDocuments(db).saveEntry(gm.userId, campaignId, { title: "Privat umbenannter Hafen", expectedVersion: doc.version!, passages: doc.passagen.map((passage, index) => ({ pid: passage.pid, inhalt: { kind: "absatz", inhalt: [{ text: index ? "GEHEIM: Neue Verschwörung." : "PRIVATER ENTWURF: Ein anderer Hafen.", marks: [] }] } })) }, entryId);
    const unchanged = await anonymous.request.get(origin + link); expect(await unchanged.text()).toBe(previewHtml); expect(unchanged.headers()["etag"]).toBe(previousEtag);
    const withGmCookie = await member.request.get(origin + link); expect(await withGmCookie.text()).toBe(previewHtml);
    await page.reload(); await page.getByRole("navigation", { name: "Werkstätten" }).getByRole("button", { name: "Veröffentlichung", exact: true }).click(); await page.getByRole("navigation", { name: "Veröffentlichung bearbeiten" }).getByRole("button", { name: "Artikel", exact: true }).click(); await page.getByLabel("Artikel auswählen", { exact: true }).selectOption(entryId);
    await page.getByRole("button", { name: "Artikel zurücknehmen", exact: true }).click(); await expect(page.getByText("Artikel zurückgenommen.", { exact: false })).toBeVisible();
    expect((await anonymous.request.get(origin + link)).status()).toBe(404);
  } finally { await member.close(); await anonymous.close(); }
});

test("theme retries retain a lost write acknowledgement and a failed revision read without creating duplicate themes", async ({ page }) => {
  await login(page); await page.getByRole("navigation", { name: "Werkstätten" }).getByRole("button", { name: "Themes", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Einmal trotz Netzfehler");
  const commands: string[] = []; let failWrite = true, failRead = true;
  await page.route(`**/api/campaigns/${campaignId}/themes`, async route => {
    if (route.request().method() !== "POST") return route.continue();
    commands.push(route.request().postDataJSON().commandId);
    const response = await route.fetch(); expect(response.status()).toBe(200);
    if (failWrite) { failWrite = false; await route.abort("failed"); } else await route.fulfill({ response });
  });
  await page.route(/\/themes\/[^/?]+\?revision=1$/, async route => { if (failRead) { failRead = false; await route.abort("failed"); } else await route.continue(); });
  const save = page.getByRole("button", { name: "Als neues Theme speichern", exact: true });
  await save.click(); await expect(page.locator(".authoring-workbench > .notice-error")).toBeVisible();
  await save.click(); await expect(page.locator(".authoring-workbench > .notice-error")).toBeVisible();
  await save.click(); await expect(page.getByText("Theme-Version gespeichert.", { exact: false })).toBeVisible();
  expect(commands).toHaveLength(2); expect(commands[0]).toBe(commands[1]);
  const stored = await db.query("SELECT id FROM theme_presets p JOIN theme_preset_revisions r ON r.theme_id=p.id WHERE p.campaign_id=$1 AND r.manifest->>'name'=$2", [campaignId, "Einmal trotz Netzfehler"]); expect(stored.rowCount).toBe(1);
});

test("all four local skins keep actual account text and primary hover controls legible", async ({ page }) => {
  await login(page, player, "account");
  const samples: unknown[] = [];
  for (const preset of THEME_PRESET_IDS) {
    await page.getByLabel("Lokaler Look", { exact: true }).selectOption(preset);
    const primary = page.getByRole("button", { name: "Passkey einrichten", exact: false });
    for (const hover of [false, true]) {
      if (hover) await primary.hover(); else await page.mouse.move(0, 0);
      const colors = await primary.evaluate(element => {
        const css = getComputedStyle(element);
        const hex = (value: string) => "#" + value.match(/[\d.]+/g)!.slice(0, 3).map(part => Math.round(Number(part)).toString(16).padStart(2, "0")).join("");
        return { foreground: hex(css.color), background: hex(css.backgroundColor) };
      });
      const ratio = contrastRatio(colors.foreground, colors.background); samples.push({ preset, hover, ...colors, ratio }); expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
    const readable = await page.locator("body").evaluate(element => {
      const css = getComputedStyle(element), hex = (value: string) => "#" + value.match(/[\d.]+/g)!.slice(0, 3).map(part => Math.round(Number(part)).toString(16).padStart(2, "0")).join("");
      return { foreground: hex(css.color), background: hex(css.backgroundColor) };
    }); expect(contrastRatio(readable.foreground, readable.background)).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({ path: test.info().outputPath(`account-${preset}.png`), fullPage: true });
  }
  await test.info().attach("rendered-contrast", { body: JSON.stringify(samples, null, 2), contentType: "application/json" });
});

test("a proven Wiki import can be published with attribution and an explicitly confirmed legacy address", async ({ page }) => {
  await login(page, gm, "wiki"); await page.getByRole("button", { name: "Wiki importieren", exact: true }).click();
  const upload = (name: string, data: unknown) => ({ name, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(data)) });
  await page.locator(".import-files input[type=file]").nth(0).setInputFiles(upload("articles.json", [{ title: "Die belegte Brücke", pageid: 9001, ns: 0, revid: 42, wikitext: "Die belegte Brücke führt über den breiten Fluss und verbindet die beiden alten Städte." }]));
  await page.locator(".import-files input[type=file]").nth(1).setInputFiles(upload("templates.json", []));
  await page.getByText("Vollständige Autorennachweise ergänzen", { exact: true }).click();
  await page.getByLabel("Autorennachweise als JSON", { exact: true }).setInputFiles(upload("attribution.json", { "9001": { complete: true, authors: ["Aerin aus der Historie"], anonymousContributions: 2, revisionSha1: "abcdef123456" } }));
  await page.getByLabel("Die mitgelieferten Nachweise enthalten", { exact: false }).check();
  const previewResponse = page.waitForResponse(response => response.url().endsWith("/imports/eron") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Importvorschau erstellen", exact: true }).click();
  const imported = await (await previewResponse).json(); expect(imported.attributionComplete).toBe(true); const importedId = imported.entries[0].id;
  await page.getByRole("button", { name: "Alle neuen Artikel auswählen", exact: true }).click(); await page.getByRole("button", { name: "Auswahl übernehmen", exact: true }).click();
  await expect(page.getByText("1 Artikel wurden übernommen.", { exact: false })).toBeVisible();
  await page.getByRole("navigation", { name: "Bereiche" }).getByRole("button", { name: "Schmiede", exact: true }).click(); await page.getByRole("navigation", { name: "Werkstätten" }).getByRole("button", { name: "Veröffentlichung", exact: true }).click();
  await page.getByLabel("Welt ausdrücklich freigeben.", { exact: false }).check(); await page.getByRole("button", { name: "Welt-Einstellungen speichern", exact: true }).click(); await expect(page.getByText("Welt-Einstellungen gespeichert.", { exact: true })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Veröffentlichung bearbeiten" }); await navigation.getByRole("button", { name: "Artikel", exact: true }).click(); await page.getByLabel("Artikel auswählen", { exact: true }).selectOption(importedId);
  await page.locator(".publication-passage").first().getByRole("checkbox").first().check(); await page.getByRole("button", { name: "Öffentliche Vorschau prüfen", exact: true }).click();
  await expect(page.frameLocator('iframe[title="Öffentliche Artikelvorschau"]').getByText("Aerin aus der Historie", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Genau diesen geprüften Stand freigeben", exact: true }).click(); await expect(page.getByText("Der geprüfte Artikelstand ist jetzt öffentlich.", { exact: true })).toBeVisible();
  await navigation.getByRole("button", { name: "Adressen", exact: true }).click(); await page.getByLabel("Adressart", { exact: true }).selectOption("legacy"); await page.getByLabel("Zielartikel", { exact: true }).selectOption(importedId);
  await page.getByRole("button", { name: "Nachgewiesene Quelle wählen:", exact: false }).first().click();
  const oldPath = await page.getByLabel("Alter Wiki-Pfad auf diesem Server", { exact: true }).inputValue();
  await page.getByLabel("Ich bestätige diese Zuordnung", { exact: false }).check(); await page.getByRole("button", { name: "Adresse zuordnen", exact: true }).click(); await expect(page.getByText("Adresse zugeordnet.", { exact: true })).toBeVisible();
  const response = await page.context().request.get(origin + oldPath, { maxRedirects: 0 }); expect(response.status()).toBe(302); expect(response.headers()["location"]).toMatch(/^\/w\//);
});

test("draft recipe preview overrides the surrounding local skin in actual CSS", async ({ page }) => {
  await login(page, gm, "account"); await page.getByLabel("Lokaler Look", { exact: true }).selectOption("PixelArt");
  await page.getByRole("navigation", { name: "Bereiche" }).getByRole("button", { name: "Schmiede", exact: true }).click(); await page.getByRole("navigation", { name: "Werkstätten" }).getByRole("button", { name: "Themes", exact: true }).click();
  await page.getByRole("button", { name: "Vorlage Medieval", exact: true }).click();
  const preview = page.getByRole("region", { name: "Theme-Vorschau", exact: true });
  await expect(page.locator("html")).toHaveAttribute("data-appearance-edges", "pixel");
  await expect(preview).toHaveCSS("border-top-style", "double"); await expect(preview).toHaveCSS("box-shadow", "none");
  await expect(preview.getByRole("button", { name: "Primäre Aktion", exact: true })).toHaveCSS("border-radius", "4px");
  await expect(preview.locator(".lucide")).toHaveCSS("stroke-width", "1.5px");
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Vorlage PixelArt", exact: true }).click();
  await expect(preview).toHaveCSS("border-top-style", "solid"); await expect(preview).not.toHaveCSS("box-shadow", "none");
  await expect(preview.locator(".lucide")).toHaveCSS("shape-rendering", "crispedges");
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("theme-preview-mobile.png"), fullPage: true });
});

test("a removed GM role clears the private theme editor and navigation after live refresh", async ({ browser }) => {
  const context = await browser.newContext(); const page = await context.newPage();
  const identity = createIdentity(db, config), authorSession = await identity.issueSession(gm.userId);
  const created = await app.inject({ method: "POST", url: `/api/campaigns/${campaignId}/themes`, headers: { origin, cookie: `chronicle_session=${authorSession.value}` }, payload: { commandId: randomUUID(), manifest: { ...getThemePreset("Fantasy"), name: "Privater unveröffentlichter Look" } } }); expect(created.statusCode).toBe(200);
  try {
    await db.query("UPDATE campaign_memberships SET role='leitung' WHERE campaign_id=$1 AND user_id=$2", [campaignId, player.userId]);
    await login(page, player); await page.getByRole("navigation", { name: "Werkstätten" }).getByRole("button", { name: "Themes", exact: true }).click();
    await page.getByRole("button", { name: "Privater unveröffentlichter Look · Revision 1", exact: true }).click();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Privater unveröffentlichter Look");
    await page.getByLabel("Name", { exact: true }).fill("Privater Entwurf im Editor");
    await db.query("UPDATE campaign_memberships SET role='spieler' WHERE campaign_id=$1 AND user_id=$2", [campaignId, player.userId]);
    await expect(page.getByRole("navigation", { name: "Bereiche" }).getByRole("button", { name: "Schmiede", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Name", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Privater unveröffentlichter Look", { exact: false })).toHaveCount(0);
  } finally { await db.query("UPDATE campaign_memberships SET role='spieler' WHERE campaign_id=$1 AND user_id=$2", [campaignId, player.userId]); await context.close(); }
});

for (const status of [503, 429]) test(`a transient ${status} membership refresh keeps the mounted authoring draft`, async ({ page }) => {
  await login(page); await page.getByRole("navigation", { name: "Werkstätten" }).getByRole("button", { name: "Themes", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Dieser Entwurf bleibt erhalten");
  await expect(page.getByRole("status", { name: "Live-Verbindung", exact: true })).toHaveAttribute("data-live-state", "connected");
  await page.route("**/api/campaigns", route => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: "Temporärer Mitgliedschaftsabruf" }) }));
  const failedRefresh = page.waitForResponse(response => response.url() === `${origin}/api/campaigns` && response.status() === status);
  const session = await createIdentity(db, config).issueSession(gm.userId);
  const nudge = await app.inject({ method: "POST", url: `/api/campaigns/${campaignId}/themes`, headers: { origin, cookie: `chronicle_session=${session.value}` }, payload: { commandId: randomUUID(), manifest: { ...getThemePreset("Fantasy"), name: `Ein anderer Entwurf ${status}` } } }); expect(nudge.statusCode).toBe(200);
  await failedRefresh;
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Dieser Entwurf bleibt erhalten");
  await expect(page.getByText("Ungespeicherter Entwurf", { exact: true })).toBeVisible();
});
