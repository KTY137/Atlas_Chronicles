// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { BANNER_IDS } from "../packages/theme/src/index.ts";
import { reviewApp } from "./helpers/review-app";

let app: Awaited<ReturnType<typeof reviewApp>>;
const key = "chronicle.appearance.v1";
test.beforeAll(async () => { app = await reviewApp(9743); });
test.afterAll(async () => { await app?.close(); });
async function openSettings(page: Page, language = "de") {
  await page.context().addCookies([{ name: "chronicle_session", value: app.gm.value, domain: "localhost", path: "/", httpOnly: true, secure: true, sameSite: "Strict" }]);
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=account&lang=${language}`);
  await expect(page.locator(".banner-auswahl")).toBeVisible();
}
const banner = (page: Page) => page.locator(".context-banner .pixel-banner");
const pick = (page: Page, id: string) => page.locator(`.banner-auswahl input[type=radio][value="${id}"]`).check();

test("all 20 scenes appear in the real header and persist without changing the color scheme", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openSettings(page);
  await expect(page.locator(".banner-karte")).toHaveCount(20);
  // Every card is alive before a choice or hover, not just the active scene.
  await page.mouse.move(0, 0);
  await expect.poll(() => page.locator(".pixel-banner-preview").evaluateAll(cards => cards.map(card =>
    card.getAnimations({ subtree: true }).some(animation => animation.playState === "running")))).toEqual(Array(20).fill(true));
  const theme = await page.locator("html").getAttribute("data-appearance-theme");
  for (const id of BANNER_IDS) {
    await pick(page, id);
    await expect(banner(page)).toHaveAttribute("data-scene", id);
    await expect(page.locator("html")).toHaveAttribute("data-appearance-theme", theme!);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).banner, key)).toBe(id);
  }
  await page.reload();
  await expect(banner(page)).toHaveAttribute("data-scene", "geisterstadt");
  await expect(page.getByRole("radio", { name: "Geisterstadt · Gothicpunk", exact: true })).toBeChecked();
  expect(errors).toEqual([]);
});

test("animation can be paused and respects live system motion, contrast and power preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openSettings(page);
  await pick(page, "luftschiffhafen");
  await expect(banner(page)).toHaveAttribute("data-animated", "true");
  const motion = page.locator(".context-banner .pb-float");
  expect(await motion.evaluate(el => getComputedStyle(el).animationName)).toBe("pb-bob");
  await page.getByRole("checkbox", { name: "Banner animieren", exact: true }).uncheck();
  await expect(banner(page)).toHaveAttribute("data-animated", "false");
  expect(await motion.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  expect(await page.locator(".banner-gitter").evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length)).toBe(0);
  await page.reload();
  await expect(banner(page)).toHaveAttribute("data-animated", "false");
  await page.getByRole("checkbox", { name: "Banner animieren", exact: true }).check();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(banner(page)).toHaveAttribute("data-animated", "false");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(banner(page)).toHaveAttribute("data-animated", "true");
  await page.getByRole("combobox", { name: "Bewegte Übergänge", exact: true }).selectOption("reduced");
  await expect(banner(page)).toHaveAttribute("data-animated", "false");
  await page.getByRole("checkbox", { name: "Zierbilder ausblenden", exact: true }).check();
  await expect(banner(page)).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Zierbilder ausblenden", exact: true }).uncheck();
  await expect(banner(page)).toHaveAttribute("data-scene", "luftschiffhafen");
  await page.getByRole("checkbox", { name: "Sparsame Darstellung für ältere Geräte", exact: true }).check();
  await expect(banner(page)).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Sparsame Darstellung für ältere Geräte", exact: true }).uncheck();
  await page.emulateMedia({ forcedColors: "active" });
  await expect(banner(page)).toHaveCount(0);
  await page.emulateMedia({ forcedColors: "none" });
  await expect(banner(page)).toHaveAttribute("data-scene", "luftschiffhafen");
});

test("keyboard selection, cross-window synchronization, no banner and reset use the existing preferences", async ({ page, context }) => {
  await openSettings(page);
  await page.getByRole("radio", { name: "Kein Banner", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Mondburg · Fantasy", exact: true })).toBeFocused();
  await expect(banner(page)).toHaveAttribute("data-scene", "mondburg");
  const second = await context.newPage();
  await openSettings(second);
  await pick(page, "neonregen");
  await expect(banner(second)).toHaveAttribute("data-scene", "neonregen");
  await pick(page, "none");
  await expect(banner(second)).toHaveCount(0);
  await pick(page, "sonnenraster");
  await page.getByRole("button", { name: "Meine Einstellungen zurücksetzen", exact: true }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect(banner(second)).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "Kein Banner", exact: true })).toBeChecked();
  await second.close();
});

test("the header remains operable on narrow and ultrawide screens and the art actually animates", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openSettings(page);
  await pick(page, "neonregen");
  await page.mouse.move(0, 0);
  await mkdir(".local/pixel-banners", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1800 });
  await page.locator(".banner-auswahl").screenshot({ path: ".local/pixel-banners/gallery.png" });
  for (const width of [390, 820, 1440, 3440]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(page.getByRole("button", { name: "Einstellungen", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Abmelden", exact: true })).toBeVisible();
    expect(await page.locator(".context-bar").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    if (width <= 760) await expect(page.locator(".context-banner")).toBeHidden();
    else await expect(banner(page)).toBeVisible();
    await page.locator(".context-bar").screenshot({ path: `.local/pixel-banners/header-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  const frame = await page.locator(".context-banner").screenshot();
  await expect.poll(async () => (await page.locator(".context-banner").screenshot()).equals(frame)).toBe(false);
  await page.getByRole("button", { name: "Kampagnenübersicht", exact: true }).click();
  await expect(page.locator(".banner-auswahl")).toHaveCount(0);
  await page.getByRole("button", { name: "Einstellungen", exact: true }).click();
  await expect(page.locator(".banner-auswahl")).toBeVisible();
});

test("the banner gallery is translated in English", async ({ page }) => {
  await openSettings(page, "en");
  await expect(page.getByRole("group", { name: "Pixel art banners 20 scenes", exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Airship harbor · Steampunk", exact: true }).check();
  await expect(banner(page)).toHaveAttribute("data-scene", "luftschiffhafen");
  await expect(page.getByRole("checkbox", { name: "Animate banners", exact: true })).toBeVisible();
});
