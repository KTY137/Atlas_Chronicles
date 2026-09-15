// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";

// Kaya, 2026-09-15: "wenn ich die Charaktererstellung mitten drin abbreche, werden die meisten
// Felder nicht mehr anklickbar". Jeder Abbruchweg muss ein bedienbares Formular hinterlassen.
const port = 9900 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string, session: { userId: string; value: string };
test.beforeAll(async () => {
  db = await createTestDb(); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db);
  session = await identity.bootstrap("Kaya Abbruch");
  campaignId = (await campaigns.createCampaign(session.userId, { name: "Abgebrochene Vorlagen" })).id;
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => { await app?.close(); await db?.close(); });
const form = (page: Page) => page.locator("form.creation-template-form");
async function open(page: Page) {
  await page.context().addCookies([{ name: "chronicle_session", value: session.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  await page.goto(`${origin}/?campaign=${campaignId}&stage=schmiede&forge=actors`);
  await expect(form(page).getByLabel("Vorlagenname", { exact: true })).toBeVisible();
  await expect(form(page).getByLabel("Scharfsinn", { exact: true })).toBeVisible();
}
async function type(page: Page) {
  await form(page).getByLabel("Vorlagenname", { exact: true }).fill("Halbfertige Waldläuferin");
  await form(page).getByLabel("Scharfsinn", { exact: true }).fill("4");
  await expect(form(page).getByLabel("Scharfsinn", { exact: true })).toHaveValue("4");
}
async function expectUsable(page: Page, label: string) {
  const f = form(page);
  await expect(f.getByLabel("Vorlagenname", { exact: true }), label).toBeEnabled();
  await expect(f.getByLabel("Scharfsinn", { exact: true }), label).toBeEnabled();
  await f.getByLabel("Vorlagenname", { exact: true }).fill("Nach dem Abbruch");
  await expect(f.getByLabel("Vorlagenname", { exact: true }), label).toHaveValue("Nach dem Abbruch");
  await f.getByLabel("Scharfsinn", { exact: true }).fill("5");
  await expect(f.getByLabel("Scharfsinn", { exact: true }), label).toHaveValue("5");
  const disabled = await f.locator("input:disabled, select:disabled, fieldset:disabled").count();
  expect(disabled, `${label}: gesperrte Felder`).toBe(0);
}
test("Abbruch über „Änderungen verwerfen“", async ({ page }) => {
  await open(page); await type(page);
  page.once("dialog", d => d.accept());
  await form(page).getByRole("button", { name: "Änderungen verwerfen", exact: true }).click();
  await expect(form(page).getByLabel("Vorlagenname", { exact: true })).toHaveValue("");
  await expectUsable(page, "verwerfen");
});
test("Abbruch über „Neue Figurvorlage“ mit Bestätigung", async ({ page }) => {
  await open(page); await type(page);
  page.once("dialog", d => d.accept());
  await page.getByRole("button", { name: "Neue Figurvorlage", exact: true }).click();
  await expectUsable(page, "neu");
});
test("Abbruch des Bestätigungsdialogs lässt das Formular bedienbar", async ({ page }) => {
  await open(page); await type(page);
  page.once("dialog", d => d.dismiss());
  await page.getByRole("button", { name: "2 · Figur erschaffen", exact: true }).click();
  await expect(form(page).getByLabel("Vorlagenname", { exact: true })).toHaveValue("Halbfertige Waldläuferin");
  await expectUsable(page, "dialog abgebrochen");
});
test("Wechsel zu „Figur erschaffen“ und zurück", async ({ page }) => {
  await open(page); await type(page);
  page.once("dialog", d => d.accept());
  await page.getByRole("button", { name: "2 · Figur erschaffen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Figur aus Vorlage erschaffen", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "1 · Figurvorlagen", exact: true }).click();
  await expect(form(page).getByLabel("Vorlagenname", { exact: true })).toBeVisible();
  await expectUsable(page, "zurück");
});
test("Wechsel in einen anderen Bereich der Schmiede und zurück", async ({ page }) => {
  await open(page); await type(page);
  page.once("dialog", d => d.accept());
  await page.goto(`${origin}/?campaign=${campaignId}&stage=schmiede&forge=loot`);
  await page.goto(`${origin}/?campaign=${campaignId}&stage=schmiede&forge=actors`);
  await expect(form(page).getByLabel("Vorlagenname", { exact: true })).toBeVisible();
  await expectUsable(page, "bereich");
});
