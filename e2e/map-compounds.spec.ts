// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { reviewApp } from "./helpers/review-app.ts";
import { createAtlas } from "../packages/server/src/domain/atlas.ts";

// The built client, authenticated HTTP and the real persistence layer; no application mocks.
test("main-map castle selection creates an editable persistent compound and its interior", async ({ browser }, info) => {
  const host = await reviewApp(10810 + Math.floor(Math.random() * 80));
  const context = await browser.newContext({ locale: "de-DE" });
  try {
    await createAtlas(host.db).importMap(host.gm.userId, host.campaign.id, await readFile("design/fixtures/eron/map-andaria.json", "utf8"));
    await context.addCookies([{ name: "chronicle_session", value: host.gm.value, url: host.origin, httpOnly: true, sameSite: "Strict" }]);
    const page = await context.newPage(), errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=atlas`);
    await page.locator(".atlas-place-list").getByRole("button", { name: /^Akkator/ }).click();
    const picker = page.getByRole("combobox", { name: "Was liegt hinter dieser Tür?", exact: true });
    await picker.focus(); await picker.press("Home");
    for (let step = 0; step < 3; step++) await picker.press("ArrowDown");
    await picker.press("Enter"); await expect(picker).toHaveValue("anlage:burg");
    await page.locator(".map-fine-settings > summary").click();
    await page.getByLabel("Wehrgraben mit Brücke", { exact: true }).check();
    await page.getByRole("button", { name: "Unterkarte erzeugen", exact: true }).click();
    await expect(page.locator('.tactical-canvas[data-canvas-ready="true"]')).toHaveCount(1);
    await expect(page.locator(".nested-building-list li")).toHaveCount(12);
    const compound = new URL(page.url()).searchParams.get("atlasChild"); expect(compound).toBeTruthy();
    await page.screenshot({ path: info.outputPath("castle.png"), fullPage: true });
    await page.getByRole("button", { name: "Karte bearbeiten", exact: true }).click();
    await page.getByText("Raster, Maßstab & Export", { exact: true }).click();
    await page.getByRole("combobox", { name: "Kartenraster", exact: true }).selectOption("none");
    await page.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click();
    await expect(page.getByText(/Kartenrevision 2\./)).toBeVisible();
    await page.getByRole("button", { name: "Karte ansehen", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "Karte bearbeiten", exact: true }).click();
    await page.getByText("Raster, Maßstab & Export", { exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Kartenraster", exact: true })).toHaveValue("none");
    await page.getByRole("button", { name: "Karte ansehen", exact: true }).click();
    await page.locator(".nested-building-list").getByRole("button", { name: /^Bergfried/ }).click();
    await page.getByRole("button", { name: "Unterkarte erzeugen", exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("atlasChild")).not.toBe(compound);
    await expect(page.locator('.tactical-canvas[data-canvas-ready="true"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Eine Ebene zurück", exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("atlasChild")).toBe(compound);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("castle-mobile.png"), fullPage: true });
    expect(errors).toEqual([]);
  } finally { await context.close(); await host.close(); }
});

test("palace recipes round-trip in the browser and compare without storing extra maps", async ({ browser }, info) => {
  const host = await reviewApp(10910 + Math.floor(Math.random() * 80));
  const context = await browser.newContext({ locale: "de-DE", acceptDownloads: true });
  try {
    await context.addCookies([{ name: "chronicle_session", value: host.gm.value, url: host.origin, httpOnly: true, sameSite: "Strict" }]);
    const page = await context.newPage(), errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message)); page.on("dialog", dialog => dialog.accept());
    await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=atlas`);
    await page.getByRole("button", { name: "Neue Karte", exact: true }).click();
    const studio = page.getByRole("region", { name: "Kartenwerkstatt", exact: true });
    await studio.getByLabel("Name der Karte", { exact: true }).fill("Schloss Morgenlicht");
    await studio.getByRole("combobox", { name: "Art des Ortes", exact: true }).selectOption("anlage:schloss");
    await studio.getByLabel("Weltkeim").fill("palace-browser-one");
    const preview = () => page.waitForResponse(response => response.url().endsWith("/tactical/generate/preview") && response.ok());
    let response = preview(); await studio.getByRole("button", { name: "Vorschau", exact: true }).click();
    const original = await (await response).json();
    await expect(studio.locator('.tactical-canvas[data-canvas-ready="true"]')).toHaveCount(1);
    const downloading = page.waitForEvent("download");
    await studio.getByRole("button", { name: "Vorlage als Datei speichern", exact: true }).click();
    const download = await downloading, savedPath = info.outputPath("palace-recipe.json"); await download.saveAs(savedPath);
    const recipe = JSON.parse(await readFile(savedPath, "utf8")); expect(recipe.referenceHash).toBe(original.keimHash);
    expect(recipe.settings.anlage).toBe("schloss"); expect(recipe.generator.id).toBe("chronicle-anlage");
    await studio.getByRole("button", { name: "Vorschau zum Vergleich merken", exact: true }).click();
    await studio.getByLabel("Weltkeim").fill("palace-browser-two");
    response = preview(); await studio.getByRole("button", { name: "Vorschau", exact: true }).click();
    expect((await (await response).json()).keimHash).not.toBe(original.keimHash);
    await expect(studio.getByRole("region", { name: "Vergleichskarte", exact: true })).toBeVisible();
    await expect(studio.locator('.tactical-canvas[data-canvas-ready="true"]')).toHaveCount(2);
    await page.screenshot({ path: info.outputPath("palace-variants.png"), fullPage: true });
    await studio.getByLabel("Kartenvorlage öffnen", { exact: true }).setInputFiles(savedPath);
    await expect(studio.getByLabel("Weltkeim")).toHaveValue("palace-browser-one");
    response = preview(); await studio.getByRole("button", { name: "Vorschau", exact: true }).click();
    expect((await (await response).json()).keimHash).toBe(original.keimHash);
    expect((await host.db.query("SELECT id FROM tactical_maps WHERE campaign_id=$1", [host.campaign.id])).rowCount).toBe(0);
    await studio.getByRole("button", { name: "Erzeugen und speichern", exact: true }).click();
    await expect(page.locator('.tactical-canvas[data-canvas-ready="true"]')).toHaveCount(1);
    await expect(page.locator(".nested-building-list li")).toHaveCount(7);
    await page.reload(); await expect(page.locator(".nested-building-list li")).toHaveCount(7);
    await page.screenshot({ path: info.outputPath("palace.png"), fullPage: true });
    expect(errors).toEqual([]);
  } finally { await context.close(); await host.close(); }
});
