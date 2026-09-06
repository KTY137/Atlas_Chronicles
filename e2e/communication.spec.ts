import { test, expect, type BrowserContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { parseCampaignBundleV4 } from "@chronicle/io";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";

const port = 8100 + Math.floor(Math.random() * 700), origin = `http://localhost:${port}`;
const config = { origin, cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaign: string, gmUser: string, gmCookie: string, playerCookie: string;

test.beforeAll(async () => {
  db = await createTestDb(); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db);
  gmUser = (await identity.bootstrap("Kaya Kanal")).userId;
  campaign = (await campaigns.createCampaign(gmUser, { name: "Die Stimmen" })).id;
  const invite = await campaigns.issueInvitation(gmUser, campaign), pending = await campaigns.requestJoin(invite.code, { displayName: "Sera Kanal" });
  const player = await campaigns.approveJoin(gmUser, campaign, pending.id);
  gmCookie = (await identity.issueSession(gmUser)).value;
  playerCookie = (await identity.issueSession(player.userId)).value;
  app = await buildApp(db, config); await app.listen({ port, host: "127.0.0.1" });
});
test.afterAll(async () => { await app?.close(); await db?.close(); });
const authenticate = (context: BrowserContext, value: string) => context.addCookies([{ name: "chronicle_session", value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);

test("two browsers exchange persistent posts, recover a lost acknowledgement, reconnect and separate scene chat", async ({ browser }) => {
  const gmContext = await browser.newContext(), playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  try {
    await authenticate(gmContext, gmCookie); await authenticate(playerContext, playerCookie);
    const gm = await gmContext.newPage(), player = await playerContext.newPage();
    for (const page of [gm, player]) page.on("pageerror", error => errors.push(error.message));
    await Promise.all([gm.goto(`${origin}/?campaign=${campaign}&stage=kanal`), player.goto(`${origin}/?campaign=${campaign}&stage=kanal`)]);
    for (const page of [gm, player]) {
      await expect(page.getByRole("heading", { name: "Kampagnenkanal", exact: true })).toBeVisible();
      await expect(page.getByLabel("Live-Verbindung", { exact: true })).toHaveAttribute("data-live-state", "connected");
      await expect(page.getByLabel("Anwesenheit im Kampagnenkanal")).toContainText("Sera Kanal");
    }

    let firstCommand: string | undefined;
    await player.route("**/messages", async route => {
      if (route.request().method() !== "POST") return route.continue();
      firstCommand = route.request().postDataJSON().commandId;
      expect((await route.fetch()).status()).toBe(200);
      await route.abort("failed");
    });
    await player.getByLabel("Nachricht an die Kampagne", { exact: true }).fill("Treffen am Samstag im Wirtshaus.");
    await player.getByRole("button", { name: "Beitrag veröffentlichen", exact: true }).click();
    await expect(player.getByText(/Die Zustellung ist noch nicht bestätigt/)).toBeVisible();
    await expect(gm.locator(".channel-message-body").filter({ hasText: "Treffen am Samstag im Wirtshaus." })).toHaveCount(1);
    await player.unroute("**/messages");
    const retry = player.waitForRequest(request => request.method() === "POST" && request.url().endsWith("/messages"));
    await player.getByRole("button", { name: "Beitrag veröffentlichen", exact: true }).click();
    expect((await retry).postDataJSON().commandId).toBe(firstCommand);
    await expect(player.getByLabel("Nachricht an die Kampagne", { exact: true })).toHaveValue("");
    expect((await db.query<{ count: number }>("SELECT count(*)::int AS count FROM campaign_messages WHERE campaign_id=$1 AND body=$2", [campaign, "Treffen am Samstag im Wirtshaus."])).rows[0]!.count).toBe(1);

    await gm.getByRole("button", { name: "Auf Beitrag von Sera Kanal antworten", exact: true }).click();
    await gm.getByLabel("Nachricht an die Kampagne", { exact: true }).fill("Ich bringe die Karte mit.");
    await gm.getByRole("button", { name: "Beitrag veröffentlichen", exact: true }).click();
    await expect(player.locator(".channel-message-body").filter({ hasText: "Ich bringe die Karte mit." })).toBeVisible();
    await expect(player.getByRole("link", { name: /Antwort auf Sera Kanal/ })).toBeVisible();

    await playerContext.setOffline(true);
    await expect(player.getByLabel("Live-Verbindung", { exact: true })).toHaveAttribute("data-live-state", "offline");
    await gm.getByLabel("Nachricht an die Kampagne", { exact: true }).fill("Die Tür ist ab sechs offen.");
    await gm.getByRole("button", { name: "Beitrag veröffentlichen", exact: true }).click();
    await playerContext.setOffline(false);
    await expect(player.getByLabel("Live-Verbindung", { exact: true })).toHaveAttribute("data-live-state", "connected");
    await expect(player.locator(".channel-message-body").filter({ hasText: "Die Tür ist ab sechs offen." })).toBeVisible();

    const game = createGameplay(db);
    const first = await game.createScene(gmUser, campaign, { name: "Die Gaststube", entryIds: [], fictionDate: "Abend" });
    await game.startScene(gmUser, campaign, first.id);
    for (const page of [gm, player]) await page.getByRole("button", { name: "Tischchat", exact: true }).click();
    await expect(player.getByLabel("Nachricht an den Tisch", { exact: true })).toBeEnabled();
    await player.getByLabel("Nachricht an den Tisch", { exact: true }).fill("Ich würfle jetzt.");
    await player.getByRole("button", { name: "Am Tisch senden", exact: true }).click();
    await expect(gm.locator(".channel-message-body").filter({ hasText: "Ich würfle jetzt." })).toBeVisible();
    await player.getByLabel("Nachricht an den Tisch", { exact: true }).fill("Ein Entwurf für die Gaststube.");
    const second = await game.createScene(gmUser, campaign, { name: "Die Straße", entryIds: [], fictionDate: "Nacht" });
    await game.startScene(gmUser, campaign, second.id);
    await expect(player.getByRole("button", { name: "Entwurf verwerfen", exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(player.getByRole("button", { name: "Am Tisch senden", exact: true })).toBeDisabled();
    await expect(player.getByLabel("Nachricht an den Tisch", { exact: true })).toHaveValue("Ein Entwurf für die Gaststube.");
    await expect(player.locator(".channel-message-body")).toHaveCount(0);
    await player.getByRole("button", { name: "Entwurf verwerfen", exact: true }).click();
    await player.getByRole("button", { name: "Kampagnenbeiträge", exact: true }).click();
    await expect(player.locator(".channel-message-body")).toHaveCount(3);
    await player.getByRole("button", { name: "Beitrag von Sera Kanal löschen", exact: true }).click();
    await player.getByRole("button", { name: "Beitrag entfernen", exact: true }).click();
    await expect(player.locator(".channel-message-body")).toHaveCount(2);
    expect(await player.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await player.screenshot({ path: test.info().outputPath("channel-phone.png"), fullPage: true });
    await player.reload();
    await expect(player.locator(".channel-message-body")).toHaveCount(2);
    await gm.getByRole("button", { name: "Runde", exact: true }).click();
    const downloading = gm.waitForEvent("download");
    await gm.getByRole("button", { name: "Kampagne exportieren", exact: true }).click();
    const download = await downloading, path = test.info().outputPath("campaign.chronicle");
    await download.saveAs(path);
    const bundle = parseCampaignBundleV4(await readFile(path, "utf8"));
    expect(bundle.manifest.campaignId).toBe(campaign);
    expect(bundle.tables.campaign_messages).toHaveLength(3); // Includes the authored deletion tombstone.
    expect(bundle.tables.campaign_messages.every(message => message.kind === "letter")).toBe(true);
    expect(bundle.tables).not.toHaveProperty("credentials");
    expect(errors).toEqual([]);
  } finally { await gmContext.close(); await playerContext.close(); }
});
