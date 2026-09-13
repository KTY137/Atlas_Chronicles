// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type Page } from "@playwright/test";
import type { AnyRulePackage } from "@chronicle/rules";
import { reviewApp } from "./helpers/review-app";
import { largeTemplatePackage as lite } from "./helpers/actor-template-package";

let app: Awaited<ReturnType<typeof reviewApp>>, original: AnyRulePackage;
const key = (pkg: { id: string; version: string }) => `${pkg.id}@${pkg.version}`;
const base = () => `${app.origin}/api/campaigns/${app.campaign.id}`;
const form = (page: Page) => page.locator(".creation-template-form");
const picker = (page: Page) => form(page).getByRole("combobox", { name: "Regelpaket für die Anfangswerte", exact: true });
async function activate(page: Page) {
  const preview = await page.request.post(`${base()}/rules/preview`, { headers: { Origin: app.origin }, data: { package: lite } });
  expect(preview.status(), await preview.text()).toBe(200);
  const review = await preview.json();
  const response = await page.request.post(`${base()}/rules/activate`, { headers: { Origin: app.origin }, data: {
    packageId: lite.id, packageVersion: lite.version, expectedVersion: review.pinVersion, previewHash: review.previewHash,
  } });
  expect(response.status(), await response.text()).toBe(200);
}
async function open(page: Page) {
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=schmiede&forge=actors`);
  await expect(picker(page)).toBeVisible();
}
test.beforeEach(async ({ context, page }) => {
  app = await reviewApp(15900 + Math.floor(Math.random() * 150));
  await context.addCookies([{ name: "chronicle_session", value: app.gm.value, url: app.origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const state = await (await page.request.get(`${base()}/rules`)).json();
  original = state.packages.find((pkg: AnyRulePackage) => key(pkg) === key(state.pin));
  expect(original).toBeTruthy();
  const install = await page.request.post(`${base()}/rules`, { headers: { Origin: app.origin }, data: lite });
  expect(install.status(), await install.text()).toBe(200);
});
test.afterEach(async () => { await app?.close(); });

test("explicit package selection replaces all skills and defaults in both directions", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await open(page);
  await form(page).getByLabel("Vorlagenname", { exact: true }).fill("Wandernde Begleitung");
  await form(page).getByLabel("Art der Figur", { exact: true }).selectOption("companion");
  await picker(page).selectOption(key(lite));
  await expect(form(page).locator(".rule-field")).toHaveCount(107);
  await expect(form(page).getByLabel("Nahkampf", { exact: true })).toHaveValue("0");
  await form(page).getByLabel("Nahkampf", { exact: true }).fill("9");
  await expect(form(page).getByLabel("Fertigkeit 100", { exact: true })).toHaveValue("0");
  await picker(page).selectOption(key(original));
  await expect(form(page).locator(".rule-field")).toHaveCount(Object.keys(original.fields).length);
  await picker(page).selectOption(key(lite));
  await expect(form(page).getByLabel("Nahkampf", { exact: true })).toHaveValue("0");
  await expect(form(page).getByLabel("Vorlagenname", { exact: true })).toHaveValue("Wandernde Begleitung");
  await expect(form(page).getByLabel("Art der Figur", { exact: true })).toHaveValue("companion");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath("lite-template-mobile.png") });
  expect(errors).toEqual([]);
});

test("an untouched rules section follows an activation without remounting or losing identity", async ({ page }) => {
  await open(page);
  await form(page).getByLabel("Vorlagenname", { exact: true }).fill("Name bleibt erhalten");
  await form(page).getByLabel("Art der Figur", { exact: true }).selectOption("creature");
  await activate(page);
  await expect(picker(page)).toHaveValue(key(lite));
  await expect(form(page).locator(".rule-field")).toHaveCount(107);
  await expect(form(page).getByLabel("Nahkampf", { exact: true })).toHaveValue("0");
  await expect(form(page).getByLabel("Vorlagenname", { exact: true })).toHaveValue("Name bleibt erhalten");
  await expect(form(page).getByLabel("Art der Figur", { exact: true })).toHaveValue("creature");
});

test("activation preserves an edited rules draft until the user explicitly changes its package", async ({ page }) => {
  await open(page);
  const field = Object.values(original.fields).find(f => f.type === "integer" && !f.enum)!;
  expect(field).toBeTruthy();
  const changed = Number(field.default) === field.minimum ? Number(field.default) + 1 : field.minimum!;
  await form(page).getByLabel(field.label, { exact: true }).fill(String(changed));
  await activate(page);
  await expect(form(page)).toContainText("Diese Vorlage verwendet andere Regeln als die Kampagne.");
  await expect(picker(page)).toHaveValue(key(original));
  await expect(form(page).getByLabel(field.label, { exact: true })).toHaveValue(String(changed));
  await picker(page).selectOption(key(lite));
  await expect(form(page).locator(".rule-field")).toHaveCount(107);
  await expect(form(page).getByLabel("Nahkampf", { exact: true })).toHaveValue("0");
});

test("a 107-field template saves and creates a playable character with the selected skills", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await activate(page); await open(page);
  await expect(picker(page)).toHaveValue(key(lite));
  await form(page).getByLabel("Vorlagenname", { exact: true }).fill("Lite Waldläuferin");
  await form(page).getByLabel("Nahkampf", { exact: true }).fill("7");
  const save = page.waitForResponse(r => r.url() === `${base()}/actor-templates` && r.request().method() === "POST");
  await form(page).getByRole("button", { name: "Figurvorlage speichern", exact: true }).click();
  const response = await save;
  expect(response.status(), await response.text()).toBe(200);
  const saved = await response.json();
  expect(Object.keys(saved.definition.fields)).toHaveLength(107);
  expect(saved.definition.fields.f_skill_0).toBe(7);
  expect(saved.definition.package).toEqual({ id: lite.id, version: lite.version });
  await page.getByRole("button", { name: "Aus Vorlage Figur erschaffen", exact: true }).click();
  const creation = page.locator(".creation-instantiate");
  await creation.getByLabel("Name dieser Figur", { exact: true }).fill("Liora");
  const create = page.waitForResponse(r => r.url() === `${base()}/actors/instantiate` && r.request().method() === "POST");
  await creation.getByRole("button", { name: "Figur erschaffen", exact: true }).click();
  const created = await create;
  expect(created.status(), await created.text()).toBe(200);
  const actor = await created.json();
  const sheet = await page.request.get(`${base()}/actors/${actor.id}/sheet`);
  expect(sheet.status()).toBe(200);
  const data = await sheet.json();
  expect(data.packageId).toBe(lite.id);
  expect(Object.keys(data.fields)).toHaveLength(107);
  expect(data.fields.f_skill_0).toBe(7);
  expect(errors).toEqual([]);
});
