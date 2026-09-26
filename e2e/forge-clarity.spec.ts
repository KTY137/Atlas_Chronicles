// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect } from "@playwright/test";
import { reviewApp } from "./helpers/review-app";

let app: Awaited<ReturnType<typeof reviewApp>>;
test.beforeAll(async () => { app = await reviewApp(15400 + Math.floor(Math.random() * 150)); });
test.afterAll(async () => app?.close());
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "chronicle_session", value: app.gm.value, url: app.origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
});

test("workshop entry, installed attribute browsing and draft protection remain usable", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=schmiede`);
  await expect(page.getByRole("heading", { name: "Regeln und Figuren zuerst", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("01-workshop-desktop.png"), fullPage: true });
  await page.locator(".forge-tool-grid-primary").getByRole("button", { name: /Regelschmiede/ }).click();
  await expect(page).toHaveURL(/forge=rules/);
  // Die Regelwerkstatt öffnet mit der Bibliothek; ein Klick öffnet das aktive Paket zum Ansehen.
  await page.locator(".rf-catalog-item").first().click();
  await page.getByRole("tab", { name: "Attribute", exact: true }).click();
  const editor = page.locator(".rf-editor"), attributes = editor.getByRole("navigation", { name: "Attribute", exact: true });
  const strength = attributes.getByRole("button", { name: /^Kraft / });
  await expect(strength).toBeEnabled();
  await strength.click();
  await expect(editor.getByLabel("Bezeichnung", { exact: true })).toHaveValue("Kraft");
  await expect(editor.getByLabel("Bezeichnung", { exact: true })).toBeDisabled();
  await expect(editor.getByRole("button", { name: "Attribut hinzufügen", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "Neue Version erstellen", exact: true }).click();
  await page.getByRole("tab", { name: "Attribute", exact: true }).click();
  await strength.click();
  await editor.getByLabel("Bezeichnung", { exact: true }).fill("Stärke des Nordens");
  page.once("dialog", dialog => void dialog.dismiss());
  await page.getByRole("navigation", { name: "Werkstätten", exact: true }).getByRole("button", { name: "Figuren & NPCs", exact: true }).click();
  await expect(page).toHaveURL(/forge=rules/);
  await expect(editor.getByLabel("Bezeichnung", { exact: true })).toHaveValue("Stärke des Nordens");
  await page.screenshot({ path: info.outputPath("02-rules-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath("03-rules-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("English workshop exposes the two main paths on a narrow screen", async ({ browser }, info) => {
  const context = await browser.newContext({ locale: "en-GB", viewport: { width: 390, height: 844 } });
  try {
    await context.addCookies([{ name: "chronicle_session", value: app.gm.value, url: app.origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
    const page = await context.newPage();
    await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=schmiede`);
    await expect(page.getByRole("heading", { name: "Start with rules and characters", exact: true })).toBeVisible();
    await expect(page.locator(".forge-tool-grid-primary").getByRole("button")).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath("04-workshop-english-mobile.png"), fullPage: true });
  } finally { await context.close(); }
});

test("a saved template flows directly into a separate playable character", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=schmiede&forge=actors`);
  const form = page.locator(".creation-template-form");
  await form.getByLabel("Vorlagenname", { exact: true }).fill("Wächterin der Morgenröte");
  await form.getByLabel("Scharfsinn", { exact: true }).fill("4");
  await expect(page.locator(".creation-draft-preview")).toContainText("Wächterin der Morgenröte");
  const save = page.waitForResponse(response => response.url().endsWith("/actor-templates") && response.request().method() === "POST");
  await form.getByRole("button", { name: "Figurvorlage speichern", exact: true }).click();
  const savedResponse = await save;
  expect(savedResponse.status()).toBe(200);
  const template = await savedResponse.json();
  // Nach dem Speichern ist „Figur aus dieser Vorlage anlegen“ der eine nächste Schritt (2026-09-26),
  // und das Anlegen ist ein geführter Weg: Wer ist die Figur? → Was kann sie? → Fertig.
  await page.getByRole("button", { name: "Figur aus dieser Vorlage anlegen", exact: true }).click();
  const creation = page.locator(".creation-instantiate");
  await expect(creation.getByRole("combobox", { name: "Aus welcher Figurvorlage?", exact: true })).toHaveValue(template.id);
  await creation.getByLabel("Name dieser Figur", { exact: true }).fill("Ayla");
  await page.screenshot({ path: info.outputPath("05-character-creation-desktop.png"), fullPage: true });
  await creation.getByRole("button", { name: "Weiter", exact: true }).click();
  await creation.getByRole("button", { name: "Weiter", exact: true }).click();
  const create = page.waitForResponse(response => response.url().endsWith("/actors/instantiate") && response.request().method() === "POST");
  await creation.getByRole("button", { name: "Figur anlegen", exact: true }).click();
  const createdResponse = await create;
  expect(createdResponse.status()).toBe(200);
  const actor = await createdResponse.json();
  await expect(creation).toContainText("„Ayla“ ist angelegt.");
  const sheet = await page.request.get(`${app.origin}/api/campaigns/${app.campaign.id}/actors/${actor.id}/sheet`);
  expect(sheet.status()).toBe(200);
  expect((await sheet.json()).fields.insight).toBe(4);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath("06-character-creation-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});
