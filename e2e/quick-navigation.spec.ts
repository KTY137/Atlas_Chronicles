// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type Page } from "@playwright/test";
import { reviewApp } from "./helpers/review-app";

let app: Awaited<ReturnType<typeof reviewApp>>;
test.beforeAll(async () => { app = await reviewApp(10200 + Math.floor(Math.random() * 150)); });
test.afterAll(async () => { await app?.close(); });

async function openCampaign(page: Page, options: { player?: boolean; query?: string } = {}) {
  await page.context().addCookies([{ name: "chronicle_session", value: (options.player ? app.player : app.gm).value,
    url: app.origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&${options.query ?? "stage=heute"}`);
  await expect(page.getByRole("button", { name: "Schnellzugriff öffnen", exact: true })).toBeVisible();
}
const palette = (page: Page) => page.getByRole("dialog", { name: "Schnellzugriff", exact: true });
const search = (page: Page) => palette(page).getByRole("combobox", { name: "Bereich oder Werkzeug suchen", exact: true });

test("keyboard search opens the canonical loot workshop and survives reload", async ({ page }) => {
  await openCampaign(page);
  await page.keyboard.press("Control+k");
  await expect(search(page)).toBeFocused();
  await search(page).fill("karte loot");
  await expect(palette(page).getByRole("option")).toHaveCount(1);
  await search(page).press("Enter");
  await expect(page).toHaveURL(/stage=schmiede.*forge=loot/);
  await expect(palette(page)).not.toBeVisible();
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.getByRole("heading", { name: "Lootkarten", exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lootkarten", exact: true }).first()).toBeVisible();
});

test("arrow selection wraps and Escape returns focus to the opener", async ({ page }) => {
  await openCampaign(page);
  const trigger = page.getByRole("button", { name: "Schnellzugriff öffnen", exact: true });
  await trigger.click();
  const options = palette(page).getByRole("option");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  await search(page).press("ArrowUp");
  await expect(options.last()).toHaveAttribute("aria-selected", "true");
  await search(page).press("ArrowDown");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  await search(page).press("Escape");
  await expect(palette(page)).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("an unknown search cannot navigate and can be reset", async ({ page }) => {
  await openCampaign(page);
  await page.keyboard.press("Control+k");
  await search(page).fill("zzzz-no-such-command");
  await expect(palette(page).getByRole("option")).toHaveCount(0);
  await expect(palette(page).getByText("Keine passenden Ziele", { exact: true })).toBeVisible();
  await search(page).press("Enter");
  await expect(page).toHaveURL(/stage=heute/);
  await expect(palette(page)).toBeVisible();
  await palette(page).getByRole("button", { name: "Alle Ziele anzeigen", exact: true }).click();
  await expect(search(page)).toHaveValue("");
  await expect(search(page)).toBeFocused();
  await expect(palette(page).getByRole("option", { name: "Chronik", exact: true })).toBeVisible();
});

test("players can reach their inventory but never see forge commands", async ({ page }) => {
  await openCampaign(page, { player: true });
  await page.keyboard.press("Control+k");
  await expect(palette(page).getByRole("option", { name: "Schmiede", exact: true })).toHaveCount(0);
  await search(page).fill("Lootkarte erstellen");
  await expect(palette(page).getByRole("option")).toHaveCount(0);
  await search(page).fill("inventory");
  await search(page).press("Enter");
  await expect(page).toHaveURL(/stage=tisch.*tab=actors/);
  await expect(page.getByRole("tab", { name: "Figuren & Inventar", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("declining navigation preserves the real loot draft and the open search", async ({ page }) => {
  await openCampaign(page, { query: "stage=schmiede&forge=loot" });
  const name = page.locator(".loot-template-form").getByLabel("Gegenstandsname", { exact: true });
  await name.fill("Nicht verlieren");
  await page.keyboard.press("Control+k");
  await search(page).fill("Chronik");
  page.once("dialog", dialog => dialog.dismiss());
  await search(page).press("Enter");
  await expect(page).toHaveURL(/forge=loot/);
  await expect(palette(page)).toBeVisible();
  await expect(search(page)).toBeFocused();
  await expect(name).toHaveValue("Nicht verlieren");
  page.once("dialog", dialog => dialog.accept());
  await search(page).press("Enter");
  await expect(page).toHaveURL(/stage=wiki/);
  await expect(palette(page)).not.toBeVisible();
});

test("mobile search fits the viewport and keeps Tab focus inside the dialog", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCampaign(page);
  await page.getByRole("button", { name: "Schnellzugriff öffnen", exact: true }).click();
  await search(page).fill("Kampf");
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press("Tab");
    expect(await palette(page).evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  const bounds = await palette(page).boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".local/quick-navigation/mobile.png", fullPage: true });
  await palette(page).getByRole("option", { name: "Kampf", exact: true }).click();
  await expect(page).toHaveURL(/stage=tisch.*tab=kampf/);
});

test("the shortcut does not stack over another modal", async ({ page }) => {
  await openCampaign(page);
  await page.evaluate(() => {
    const dialog = document.createElement("dialog");
    dialog.id = "other-modal"; dialog.textContent = "Anderer Dialog";
    document.body.append(dialog); dialog.showModal();
  });
  await page.keyboard.press("Control+k");
  await expect(palette(page)).not.toBeVisible();
  await expect(page.locator("#other-modal")).toBeVisible();
});

test("Escape closes only the search above an open mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCampaign(page);
  await page.getByRole("button", { name: "Bereiche öffnen", exact: true }).click();
  await page.getByRole("button", { name: "Schnellzugriff öffnen", exact: true }).click();
  await search(page).press("Escape");
  await expect(palette(page)).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Bereiche schließen", exact: true })).toHaveAttribute("aria-expanded", "true");
});
