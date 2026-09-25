// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { CHRONICLE_HEROES_PACKAGE } from "@chronicle/rules";
import { reviewApp } from "./helpers/review-app";
import { createDocuments } from "../packages/server/src/domain/documents.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";

let host: Awaited<ReturnType<typeof reviewApp>>, entryId: string, ruleCampaign: string;
const source = randomUUID(), target = randomUUID(), retained = randomUUID();
test.beforeAll(async () => {
  host = await reviewApp(14800 + Math.floor(Math.random() * 200));
  const campaignId = host.campaign.id;
  entryId = (await createDocuments(host.db).saveEntry(host.gm.userId, campaignId, { title: "Die Hafenwache", passages: [{ inhalt: { kind: "absatz", inhalt: [{ text: "Die Wache schützt den Hafen.", marks: [] }] } }] })).entryId;
  for (const [id, title] of [[source, "Personen"], [target, "Verbündete"], [retained, "Hafen"]]) await host.db.query("INSERT INTO categories(id,campaign_id,slug,title) VALUES($1,$2,$1,$3)", [id, campaignId, title]);
  for (const id of [source, retained]) await host.db.query("INSERT INTO entry_categories(campaign_id,entry_id,category_id) VALUES($1,$2,$3)", [campaignId, entryId, id]);
  ruleCampaign = (await createCampaigns(host.db).createCampaign(host.gm.userId, { name: "Kontextregeln" })).id;
});
test.afterAll(async () => { await host?.close(); });
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "chronicle_session", value: host.gm.value, url: host.origin, httpOnly: true, sameSite: "Strict" }]);
});

test("an article can be dragged into an empty category and moved back with the keyboard after reload", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=wiki`);
  const nav = page.getByRole("navigation", { name: "Ordnung der Chronik" });
  const group = (id: string) => nav.locator(`[data-group-id="${id}"]`);
  await expect(group(source).locator(".nav-artikel-knopf")).toHaveText("Die Hafenwache");
  const moved = page.waitForResponse(response => response.url().endsWith(`/entries/${entryId}/navigation`) && response.request().method() === "POST");
  await group(source).locator(".nav-artikel-knopf").dragTo(group(target).locator(".nav-gruppe-kopf"));
  expect((await moved).status()).toBe(200);
  await expect(group(source).locator(".nav-artikel")).toHaveCount(0);
  await expect(group(target).locator(".nav-artikel-knopf")).toHaveText("Die Hafenwache");
  await expect(group(retained).locator(".nav-artikel-knopf")).toHaveText("Die Hafenwache");
  await page.reload();
  await group(target).locator(".nav-artikel-knopf").focus();
  await page.keyboard.press("Shift+F10");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("menuitem", { name: "Verschieben nach Personen", exact: true }).click();
  await expect(group(source).locator(".nav-artikel-knopf")).toHaveText("Die Hafenwache");
  await expect(group(target).locator(".nav-artikel")).toHaveCount(0);
  await group(source).locator(".nav-artikel-knopf").click();
  await expect(page.locator(".kategorie-chips")).toContainText("Personen");
  await expect(page.locator(".kategorie-chips")).toContainText("Hafen");
  expect(errors).toEqual([]);
});

test("the rules context menu previews its target package and activates it only after review", async ({ page }) => {
  const pkg = { ...CHRONICLE_HEROES_PACKAGE, id: "de.test.context-rules", name: "Kontextregeln" };
  const base = `${host.origin}/api/campaigns/${ruleCampaign}`;
  expect((await page.request.post(`${base}/rules`, { headers: { origin: host.origin }, data: pkg })).status()).toBe(200);
  await page.goto(`${host.origin}/?campaign=${ruleCampaign}&stage=schmiede&forge=rules`);
  const item = page.locator(".rf-catalog-item").filter({ has: page.getByText("Kontextregeln", { exact: true }) });
  await item.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Für diese Runde aktivieren …", exact: true }).click();
  await expect(page.getByRole("region", { name: "Geprüfte Aktivierung" })).toContainText("de.test.context-rules");
  expect((await page.request.get(`${base}/rules`)).ok()).toBe(true);
  const before = (await page.request.get(`${base}/rules`)).json();
  expect((await before).pin.id).not.toBe(pkg.id);
  await page.getByRole("button", { name: "Geprüfte Version für diese Runde aktivieren", exact: true }).click();
  await expect(page.getByText("Diese Paketversion ist bereits aktiv.")).toBeVisible();
  await page.getByRole("button", { name: "Zur Bibliothek", exact: true }).click();
  await expect(item).toContainText("Aktiv in dieser Runde");
  await page.reload();
  await item.click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Bereits für diese Runde aktiv", exact: true })).toBeDisabled();
  expect((await (await page.request.get(`${base}/rules`)).json()).pin.id).toBe(pkg.id);
});
