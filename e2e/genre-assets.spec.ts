// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type BrowserContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { ASSET_GENRES, type AssetpaketV1 } from "@chronicle/szene";
import type { TacticalMapCard } from "@chronicle/protocol";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";

test("300 genre assets are reachable, filterable and persist as editable map artwork", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  let db: Db | undefined, app: Awaited<ReturnType<typeof buildApp>> | undefined, context: BrowserContext | undefined;
  try {
    db = await createTestDb(); await migrate(db);
    const port = 10000 + Math.floor(Math.random() * 100), origin = `http://localhost:${port}`;
    const config = { origin, cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
    const gm = await createIdentity(db, config).bootstrap("Genreleitung"), campaign = await createCampaigns(db).createCampaign(gm.userId, { name: "Zwölf Welten" });
    app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
    context = await browser.newContext();
    await context.addCookies([{ name: "chronicle_session", value: gm.value, url: origin, httpOnly: true, sameSite: "Strict" }]);
    const page = await context.newPage(), errors: string[] = [], failedAssets = new Set<string>();
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (/\/api\/packs\/[^/]+\/asset\//.test(response.url()) && !response.ok()) failedAssets.add(`${response.status()} ${response.url()}`); });
    const base = `${origin}/api/campaigns/${campaign.id}`;
    const readMap = async (id: string): Promise<TacticalMapCard> => {
      const response = await page.request.get(`${base}/tactical/maps/${id}`); expect(response.ok()).toBe(true); return response.json();
    };
    await page.goto(`${origin}/?campaign=${campaign.id}&stage=atlas`);
    await page.getByRole("button", { name: "Neue Karte", exact: true }).click();
    const workshop = page.getByRole("region", { name: "Kartenwerkstatt", exact: true });
    await workshop.getByLabel("Name der Karte", { exact: true }).fill("Hafen der zwölf Welten");
    await workshop.getByRole("group", { name: "Größenprofile", exact: true }).getByRole("button", { name: "Dorf", exact: true }).click();
    await workshop.getByRole("group", { name: "Zeichenstil", exact: true }).getByRole("button", { name: /^Genre-Archiv/ }).click();
    await workshop.locator(".map-seed-field input").fill("genre-assets-browser");
    const generated = page.waitForResponse(response => response.url().endsWith("/tactical/generate") && response.request().method() === "POST");
    await workshop.getByRole("button", { name: "Erzeugen und speichern", exact: true }).click();
    const response = await generated; expect(response.ok()).toBe(true); const mapId = (await response.json()).ack.subjectId;
    const canvas = () => page.locator('.nested-map-view .tactical-canvas[data-canvas-ready="true"] canvas');
    await expect(canvas()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("genre-city-desktop.png"), fullPage: true });
    await page.getByRole("button", { name: "Karte bearbeiten", exact: true }).click();
    const palette = page.getByRole("region", { name: "Kartenassets", exact: true }), grid = palette.locator(".map-artwork-grid");
    await expect(palette.getByRole("combobox", { name: "Assetpaket", exact: true })).toHaveValue("pk.genres");
    await expect(grid.locator("button")).toHaveCount(300);
    const genreSelect = palette.getByRole("combobox", { name: "Genre", exact: true });
    await expect(genreSelect.locator("option")).toHaveCount(13);
    for (const genre of ASSET_GENRES) {
      await genreSelect.selectOption(genre);
      await expect(grid.locator("button")).toHaveCount(25);
      await grid.locator("button").first().scrollIntoViewIfNeeded();
      await expect.poll(() => grid.locator("img").first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      await grid.locator("button").last().scrollIntoViewIfNeeded();
      await expect.poll(() => grid.locator("img").last().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    }
    const manifestResponse = await page.request.get(`${origin}/api/packs/pk.genres/manifest`); expect(manifestResponse.ok()).toBe(true);
    const manifest = await manifestResponse.json() as AssetpaketV1;
    const before = await readMap(mapId), knownIds = new Set(before.document.geometry.stamps.map(stamp => stamp.id));
    const chosen = ["fantasy", "piraten", "cyberpunk"].map(genre => manifest.assets.find(asset => asset.art === "moebel" && asset.schlagworte.includes(`genre_${genre}`))!);
    for (const [i, asset] of chosen.entries()) {
      const genre = asset.schlagworte.find(tag => tag.startsWith("genre_"))!.slice(6);
      await genreSelect.selectOption(genre);
      await palette.getByRole("combobox", { name: "Kategorie", exact: true }).selectOption("moebel");
      await palette.getByRole("textbox", { name: "Assets suchen", exact: true }).fill(asset.name.replaceAll("_", " "));
      await expect(grid.locator("button")).toHaveCount(1);
      await grid.locator("button").click();
      await canvas().scrollIntoViewIfNeeded();
      await page.locator(".nested-map-view").getByRole("button", { name: "Ganze Karte", exact: true }).click();
      const bounds = (await canvas().boundingBox())!;
      await page.mouse.click(bounds.x + bounds.width * (.3 + i * .2), bounds.y + bounds.height * .5);
    }
    const save = page.getByRole("button", { name: "Kartenrevision speichern", exact: true }); await expect(save).toBeEnabled();
    const saved = page.waitForResponse(response => response.url().endsWith(`/tactical/maps/${mapId}/revision`) && response.request().method() === "PUT");
    await save.click(); expect((await saved).ok()).toBe(true); await expect(save).toBeDisabled();
    const revised = await readMap(mapId), added = revised.document.geometry.stamps.filter(stamp => !knownIds.has(stamp.id));
    expect(added.map(stamp => stamp.a)).toEqual(chosen.map(asset => `pk.genres/${asset.name}`));
    expect(revised.revision).toBe(before.revision + 1);
    await genreSelect.selectOption("cyberpunk");
    await palette.getByRole("combobox", { name: "Kategorie", exact: true }).selectOption("all");
    await palette.getByRole("textbox", { name: "Assets suchen", exact: true }).fill("");
    await expect(grid.locator("button")).toHaveCount(25);
    await palette.screenshot({ path: testInfo.outputPath("cyberpunk-catalogue-desktop.png") });
    await page.reload(); await expect(canvas()).toBeVisible();
    expect((await readMap(mapId)).document.geometry.stamps).toEqual(revised.document.geometry.stamps);
    await page.getByRole("button", { name: "Karte bearbeiten", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await genreSelect.selectOption("piraten"); await expect(grid.locator("button")).toHaveCount(25);
    await palette.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await palette.screenshot({ path: testInfo.outputPath("pirates-catalogue-mobile.png") });
    await palette.getByRole("combobox", { name: "Assetpaket", exact: true }).selectOption("pk.zeitwelten");
    await expect(grid.locator("button")).toHaveCount(100); await expect(genreSelect).toHaveCount(0);
    expect([...failedAssets]).toEqual([]); expect(errors).toEqual([]);
  } finally { await context?.close(); await app?.close(); await db?.close(); }
});
