// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { reviewApp } from "./helpers/review-app";

let app: Awaited<ReturnType<typeof reviewApp>>;
test.beforeAll(async () => { app = await reviewApp(10100 + Math.floor(Math.random() * 100)); await mkdir(".local/features-20260908", { recursive: true }); });
test.afterAll(async () => { await app?.close(); });
test.beforeEach(async ({ context }) => { await context.addCookies([{ name: "chronicle_session", value: app.gm.value, url: app.origin, httpOnly: true, secure: true, sameSite: "Strict" }]); });

test("preview a city, save it, and enter a building through the same atlas map", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=schmiede&forge=maps`);
  const workshop = page.getByRole("region", { name: "Kartenwerkstatt", exact: true });
  await workshop.getByRole("textbox", { name: "Name der Karte", exact: true }).fill("Stadt am Silberbach");
  await workshop.getByRole("group", { name: "Art der Karte", exact: true }).getByRole("button", { name: /^Stadt & Dorf/ }).click();
  await workshop.getByRole("group", { name: "Größenprofile", exact: true }).getByRole("button", { name: "Stadt", exact: true }).click();
  await workshop.locator(".map-seed-field input").fill("silberbach-city-regression");
  await expect(workshop.getByRole("button", { name: "Erzeugen und speichern", exact: true })).toBeDisabled();
  const previewResponse = page.waitForResponse(r => r.url().endsWith("/tactical/generate/preview") && r.request().method() === "POST");
  await workshop.getByRole("button", { name: "Vorschau", exact: true }).click();
  const response = await previewResponse; expect(response.ok()).toBeTruthy();
  const preview = await response.json();
  expect(preview.art).toBe("siedlung"); expect(preview.bauwerke).toBeGreaterThan(0);
  expect(preview.groesse[0] * preview.groesse[1]).toBeGreaterThan(16_000_000);
  expect(preview.document.geometry.size).toEqual(preview.groesse);
  expect(preview.nodes).toHaveLength(preview.bauwerke);
  expect(preview.nodes.every((node: { art: string; bauwerk?: { typ: string } }) => node.art === "bauwerk" && !!node.bauwerk?.typ)).toBeTruthy();
  const canvas = workshop.locator(".map-workshop-preview .tactical-canvas");
  await expect(canvas).toHaveAttribute("data-canvas-ready", "true");
  await expect(workshop.locator(".map-preview-stats")).toContainText(new RegExp(`${preview.bauwerke}\\s*Gebäude`));
  await canvas.scrollIntoViewIfNeeded();
  await page.screenshot({ path: ".local/features-20260908/siedlung-preview.png" });
  const saveResponse = page.waitForResponse(r => r.url().endsWith("/tactical/generate") && r.request().method() === "POST");
  await workshop.getByRole("button", { name: "Erzeugen und speichern", exact: true }).click();
  const savedResponse = await saveResponse; expect(savedResponse.ok()).toBeTruthy();
  const saved = await savedResponse.json();
  expect(saved.keimHash).toBe(preview.keimHash);
  await expect(page.getByRole("combobox", { name: "Szenenkarte", exact: true })).toHaveValue(saved.ack.subjectId);
  await page.getByRole("button", { name: "Karte im Atlas öffnen", exact: true }).click();
  await expect(page).toHaveURL(/atlasChild=/);
  await page.locator(".nested-building-list > li > button[aria-pressed]").first().click();
  const buildingName = await page.getByRole("textbox", { name: "Gebäudename", exact: true }).inputValue();
  expect(preview.nodes.some((node: { titel: string }) => node.titel === buildingName)).toBeTruthy();
  await page.getByRole("button", { name: "Unterkarte erzeugen", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Kartenpfad", exact: true })).toContainText("Stadt am Silberbach");
  await expect(page.getByRole("navigation", { name: "Kartenpfad", exact: true })).toContainText(buildingName);
  expect(errors).toEqual([]);
});

test("mobile map creation keeps its draft when workshop navigation is declined", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=schmiede&forge=maps`);
  const name = page.getByRole("textbox", { name: "Name der Karte", exact: true });
  await name.fill("Unser Weiler");
  await page.getByRole("group", { name: "Art der Karte", exact: true }).getByRole("button", { name: /^Stadt & Dorf/ }).click();
  await page.getByRole("group", { name: "Größenprofile", exact: true }).getByRole("button", { name: "Weiler", exact: true }).click();
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("navigation", { name: "Werkstätten", exact: true }).getByRole("button", { name: "Bilder", exact: true }).click();
  await expect(name).toHaveValue("Unser Weiler");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".local/features-20260908/siedlung-mobile.png" });
});
