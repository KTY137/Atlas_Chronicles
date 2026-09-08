// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type BrowserContext } from "@playwright/test";
import { reviewApp } from "./helpers/review-app";

let app: Awaited<ReturnType<typeof reviewApp>>;
test.beforeAll(async () => { app = await reviewApp(9800 + Math.floor(Math.random() * 150)); });
test.afterAll(async () => { await app?.close(); });
async function signIn(context: BrowserContext, player = false) {
  await context.addCookies([{ name: "chronicle_session", value: (player ? app.player : app.gm).value, url: app.origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
}

test("a direct combat link and a reload preserve the selected table view", async ({ page }) => {
  await signIn(page.context());
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=tisch&tab=kampf`);
  await expect(page.getByRole("tab", { name: "Kampf", exact: true })).toHaveAttribute("aria-selected", "true", { timeout: 5000 });
  await page.getByRole("tab", { name: "Figuren & Inventar", exact: true }).click();
  await expect(page).toHaveURL(/tab=actors/);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Figuren & Inventar", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("a campaign opens with named creation tasks and a stable loot workshop", async ({ page }) => {
  await signIn(page.context());
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=heute`);
  await page.getByRole("button", { name: "Lootkarte erstellen", exact: true }).click();
  await expect(page).toHaveURL(/forge=loot/);
  await expect(page.getByRole("heading", { name: "Lootkarten", exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lootkarten", exact: true }).first()).toBeVisible();
  await page.screenshot({ path: ".local/review-20260908/loot-desktop.png", fullPage: true });
});

test("mobile navigation reaches the forge and closes without overflowing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page.context());
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=heute`);
  const menu = page.getByRole("button", { name: "Bereiche öffnen", exact: true });
  await menu.click();
  await page.getByRole("navigation", { name: "Bereiche", exact: true }).getByRole("button", { name: "Schmiede", exact: true }).click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("heading", { name: "Schmiede", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".local/review-20260908/forge-mobile.png", fullPage: true });
});

test("players see play tasks without creation tools", async ({ page }) => {
  await signIn(page.context(), true);
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=heute`);
  await expect(page.getByRole("heading", { name: app.campaign.name, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lootkarte erstellen", exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Bereiche", exact: true }).getByRole("button", { name: "Schmiede", exact: true })).toHaveCount(0);
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=schmiede&forge=loot`);
  await expect(page.getByText("Die Schmiede gehört der Spielleitung.", { exact: true })).toBeVisible();
});

test("create an illustrated loot card, keep its draft through upload, and give a real copy to a player", async ({ page, browser }) => {
  await signIn(page.context());
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const base = `${app.origin}/api/campaigns/${app.campaign.id}`;
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=schmiede&forge=loot`);
  const form = page.locator(".loot-template-form");
  await form.getByLabel("Gegenstandsname", { exact: true }).fill("Trank der Morgenröte");
  await form.getByLabel("Art des Gegenstands", { exact: true }).fill("Trank");
  await form.getByRole("combobox", { name: "Seltenheit", exact: true }).selectOption("selten");
  await expect(page.locator(".loot-live-preview")).toContainText("Trank der Morgenröte");

  // Opening images must keep the card draft and its navigation protection alive.
  await form.getByRole("button", { name: "Bild hochladen oder Bestand öffnen", exact: true }).click();
  await page.getByLabel("Bilddatei", { exact: true }).setInputFiles({
    name: "morgenroete.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
  });
  await page.getByRole("button", { name: "Hochladen", exact: true }).click();
  await expect(page.getByText("„morgenroete.png“ liegt jetzt im Bestand.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Zurück zur Lootkarte", exact: true }).click();
  await expect(form.getByLabel("Gegenstandsname", { exact: true })).toHaveValue("Trank der Morgenröte");
  await form.getByRole("combobox", { name: "Kartenbild", exact: true }).selectOption({ label: "morgenroete.png" });

  // A partially filled row must be reported, never silently dropped at save time.
  await form.locator("summary").filter({ hasText: "Werte auf der Karte" }).click();
  await form.getByRole("button", { name: "Zeile hinzufügen", exact: true }).click();
  const valueRow = form.locator(".loot-value-row").first();
  await valueRow.locator("input").first().fill("Heilung");
  await expect(form.getByRole("button", { name: "Lootkarte speichern", exact: true })).toBeDisabled();
  await valueRow.locator("input").nth(1).fill("1W6");
  const saved = page.waitForResponse(r => r.url() === `${base}/item-templates` && r.request().method() === "POST");
  await form.getByRole("button", { name: "Lootkarte speichern", exact: true }).click();
  const savedResponse = await saved; expect(savedResponse.status()).toBe(200);
  const template = await savedResponse.json();
  expect(template.definition.zeilen).toEqual([{ label: "Heilung", wert: "1W6" }]);
  await page.getByRole("button", { name: "Jetzt Exemplar erzeugen", exact: true }).click();
  await page.getByRole("combobox", { name: "Gegenstand aus Vorlage", exact: true }).selectOption(template.id);
  const created = page.waitForResponse(r => r.url() === `${base}/items/instantiate` && r.request().method() === "POST");
  await page.getByRole("button", { name: "Gegenstand hinzufügen", exact: true }).click();
  const createdResponse = await created; expect(createdResponse.status()).toBe(200);
  const item = await createdResponse.json();
  await page.locator(".beute-uebergabe").getByRole("combobox", { name: "Ziel", exact: true }).selectOption(app.actorId);
  await page.getByRole("button", { name: /1 Stück an Sera übergeben/ }).click();
  await expect(page.locator(".beute-uebergabe")).toHaveCount(0);
  expect((await (await page.request.get(`${base}/items/${item.id}`)).json()).holderActorId).toBe(app.actorId);

  const playerContext = await browser.newContext();
  try {
    await signIn(playerContext, true);
    const player = await playerContext.newPage();
    player.on("pageerror", error => errors.push(error.message));
    await player.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=ich`);
    await player.getByRole("button", { name: "Zum Inventar", exact: true }).click();
    const card = player.getByRole("article", { name: "Trank der Morgenröte — Selten", exact: true }).first();
    await expect(card).toBeVisible();
    await expect.poll(() => card.locator("img").evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await expect(card).toBeInViewport();
    await expect(player.locator(".context-bar")).toBeInViewport();
    expect(await player.evaluate(() => window.scrollY)).toBe(0);
    await player.screenshot({ path: ".local/review-20260908/player-loot.png" });
  } finally { await playerContext.close(); }
  expect(errors).toEqual([]);
});

test("declining navigation preserves a loot draft and accepting prompts only once", async ({ page }) => {
  await signIn(page.context());
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=schmiede&forge=loot`);
  const name = page.getByLabel("Gegenstandsname", { exact: true });
  await name.fill("Ungespeicherter Fund");
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("navigation", { name: "Werkstätten", exact: true }).getByRole("button", { name: "Bilder", exact: true }).click();
  await expect(name).toHaveValue("Ungespeicherter Fund");
  await expect(page).toHaveURL(/forge=loot/);
  let prompts = 0;
  page.on("dialog", dialog => { prompts++; void dialog.accept(); });
  await page.getByRole("navigation", { name: "Bereiche", exact: true }).getByRole("button", { name: "Tisch", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Am Tisch", exact: true })).toBeVisible();
  expect(prompts).toBe(1);
});
