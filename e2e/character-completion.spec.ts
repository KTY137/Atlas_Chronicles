// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { CHRONICLE_HEROES_PACKAGE, CHRONICLE_ARCHETYPES } from "@chronicle/rules";
import { reviewApp } from "./helpers/review-app";
import { createActors } from "../packages/server/src/domain/actors.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC1kAAAAASUVORK5CYII=", "base64");
let host: Awaited<ReturnType<typeof reviewApp>>, heroId: string, otherId: string, unusedId: string, heldId: string;
test.beforeAll(async () => {
  host = await reviewApp(13300 + Math.floor(Math.random() * 200));
  const game = createGameplay(host.db), actors = createActors(host.db), pkg = CHRONICLE_HEROES_PACKAGE;
  await game.installPackage(host.gm.userId, host.campaign.id, pkg);
  await game.activatePackage(host.gm.userId, host.campaign.id, { packageId: pkg.id, packageVersion: pkg.version, expectedVersion: 0 });
  const template = await actors.createActorTemplate(host.gm.userId, host.campaign.id, { commandId: randomUUID(), definition: {
    schemaVersion: 1, name: "Archetyp", kind: "player_character", loreEntryId: null, package: { id: pkg.id, version: pkg.version },
    fields: { ...CHRONICLE_ARCHETYPES[0]!.fields, name: "Mara", profession: "Eigener Beruf", notes: "Mein eigener Text", skill_athletik: 60, erfahrung: 4, erfahrung_fertigkeiten: 2 },
  } });
  const makeActor = (name: string, owner?: string) => actors.instantiateActor(host.gm.userId, host.campaign.id,
    { commandId: randomUUID(), templateId: template.id, templateRevision: template.revision, name },
    owner ? { createdBy: owner, grantTo: owner } : {});
  heroId = (await makeActor("Mara", host.player.userId)).id;
  otherId = (await makeActor("Liva", host.player.userId)).id;
  unusedId = (await makeActor("Unbenutzte Testfigur")).id;
  heldId = (await makeActor("Testfigur mit Historie")).id;
  const item = await actors.createItemTemplate(host.gm.userId, host.campaign.id, { commandId: randomUUID(), definition: { schemaVersion: 1, name: "Prüfschlüssel", loreEntryId: null, tags: [] } });
  await actors.instantiateItem(host.gm.userId, host.campaign.id, { commandId: randomUUID(), templateId: item.id, templateRevision: 1, holderActorId: heldId });
});
test.afterAll(async () => host?.close());

test("English Me shows all values, available points and original portraits across save, reload and character changes", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ locale: "en-GB" });
  await context.addCookies([{ name: "chronicle_session", value: host.player.value, url: host.origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const page = await context.newPage(), errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(host.origin + "/?campaign=" + host.campaign.id + "&stage=ich");
  const picker = page.getByRole("combobox", { name: "Your character", exact: true });
  await picker.selectOption(heroId);
  const overview = page.getByRole("region", { name: "Points and advancement" });
  await expect(overview.getByText("Available skill points", { exact: true })).toBeVisible();
  await expect(overview.locator(".character-progress-value").first()).toHaveText("15");
  await expect(page.getByRole("meter", { name: "Vitality" })).toBeVisible();
  await expect(page.getByLabel("Profession / role", { exact: true })).toHaveValue("Eigener Beruf");
  await expect(page.getByLabel("Notes / agreements", { exact: true })).toHaveValue("Mein eigener Text");
  await expect(page.getByLabel("Athletics · points", { exact: true })).toHaveValue("60");
  await expect(page.getByRole("region", { name: "Abilities and conditions" }).getByText("Heavy blow", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inventory · Mara", exact: true })).toBeVisible();
  const file = page.getByLabel("Choose portrait", { exact: true });
  await file.setInputFiles({ name: "portrait.png", mimeType: "image/png", buffer: png });
  const upload = page.waitForResponse(response => response.url().includes("/portrait/bytes") && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Save portrait", exact: true }).click();
  expect((await upload).status()).toBe(200);
  const original = page.getByRole("link", { name: "Open original image", exact: true });
  await expect(original).toBeVisible();
  expect(await (await page.request.get(new URL(await original.getAttribute("href") ?? "", host.origin).href)).body()).toEqual(png);
  await page.getByLabel("Athletics · points", { exact: true }).fill("65");
  await expect(overview.locator(".character-progress-value").first()).toHaveText("10");
  await page.getByRole("button", { name: "Save the sheet", exact: true }).click();
  await expect(page.getByText("All saved.", { exact: true })).toBeVisible();
  await page.reload();
  await picker.selectOption(heroId);
  await expect(page.getByLabel("Athletics · points", { exact: true })).toHaveValue("65");
  await expect(page.getByRole("img", { name: "Portrait of Mara", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Portrait of Mara", exact: true })).toHaveJSProperty("naturalWidth", 1);
  await picker.selectOption(otherId);
  await expect(page.getByText("No portrait yet", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Athletics · points", { exact: true })).toHaveValue("60");
  await picker.selectOption(heroId);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(overview).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("english-character-mobile.png"), fullPage: true });
  await overview.scrollIntoViewIfNeeded();
  await expect(overview).toBeInViewport();
  expect(await overview.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("english-character-points-mobile.png") });
  // Die Rückfrage erscheint seit 2026-09-26 im Look (confirmAction), nicht als Browserdialog.
  await page.getByRole("button", { name: "Remove portrait", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove portrait", exact: true }).click();
  await expect(page.getByText("No portrait yet", { exact: true })).toBeVisible();
  const saved = await (await page.request.get(host.origin + "/api/campaigns/" + host.campaign.id + "/actors/" + heroId + "/sheet")).json();
  expect(saved.fields).toMatchObject({ name: "Mara", profession: "Eigener Beruf", notes: "Mein eigener Text", skill_athletik: 65, faehigkeiten: "harter_schlag, leichtfuessig, beherzt" });
  expect(saved.packageId).toBe(CHRONICLE_HEROES_PACKAGE.id);
  expect(errors).toEqual([]);
  await context.close();
});

test("permanent actor deletion requires a reason and confirmation, deletes an unused sheet and preserves referenced actors", async ({ browser }) => {
  const context = await browser.newContext({ locale: "de-DE" });
  await context.addCookies([{ name: "chronicle_session", value: host.gm.value, url: host.origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const page = await context.newPage();
  await page.goto(host.origin + "/?campaign=" + host.campaign.id + "&stage=schmiede&forge=actors");
  const summary = page.getByText("Charakterbögen und Vorlagen endgültig löschen", { exact: true });
  await summary.click();
  const picker = page.getByRole("combobox", { name: "Figur / Charakterbogen", exact: true });
  const remove = page.getByRole("button", { name: "Figur samt Charakterbogen endgültig löschen", exact: true });
  await picker.selectOption(unusedId);
  await expect(remove).toBeDisabled();
  await page.getByLabel("Grund für das endgültige Löschen", { exact: true }).fill("Isolierte Browser-Testfigur");
  // Die Rückfrage erscheint im Look (confirmAction): erst abbrechen, dann wirklich löschen.
  const rueckfrage = page.getByRole("dialog");
  await remove.click(); await rueckfrage.getByRole("button", { name: "Abbrechen", exact: true }).click();
  const endpoint = host.origin + "/api/campaigns/" + host.campaign.id + "/actors/" + unusedId;
  expect((await page.request.get(endpoint)).status()).toBe(200);
  const deletion = page.waitForResponse(response => response.url() === endpoint && response.request().method() === "DELETE");
  await remove.click(); await rueckfrage.getByRole("button", { name: "Endgültig löschen", exact: true }).click(); expect((await deletion).status()).toBe(200);
  await expect(picker.locator('option[value="' + unusedId + '"]')).toHaveCount(0);
  expect((await page.request.get(endpoint + "/sheet")).status()).toBe(404);
  await page.reload(); await summary.click();
  await expect(picker.locator('option[value="' + unusedId + '"]')).toHaveCount(0);
  await picker.selectOption(heldId);
  await page.getByLabel("Grund für das endgültige Löschen", { exact: true }).fill("Referenzen bleiben geschützt");
  await remove.click(); await rueckfrage.getByRole("button", { name: "Endgültig löschen", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Historie");
  expect((await page.request.get(host.origin + "/api/campaigns/" + host.campaign.id + "/actors/" + heldId + "/sheet")).status()).toBe(200);
  await context.close();
});
