// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect } from "@playwright/test";
import { fitCamera } from "../packages/render/src/geometry.ts";
import { studioHost } from "./helpers/map-studio-host.ts";

test("brush footprint follows map scale without edits and hides for panning and selection", async ({ browser }, info) => {
  const host = await studioHost(), context = await browser.newContext({ locale: "de-DE" });
  try {
    await context.addCookies([host.cookie]);
    const page = await context.newPage(), errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(host.origin);
    const canvas = page.locator('.tactical-canvas[data-canvas-ready="true"] canvas');
    await expect(canvas).toBeVisible();
    await page.getByRole("button", { name: "Gelände", exact: true }).click();
    await page.getByRole("button", { name: "Ganze Karte", exact: true }).click();
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!, camera = fitCamera([1000, 800], [box.width, box.height]);
    const hover = () => page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const cursor = page.locator(".tactical-brush-cursor");
    await hover();
    await expect(cursor).toHaveCSS("opacity", "1");
    const diameter = await cursor.evaluate(element => element.getBoundingClientRect().width);
    expect(diameter).toBeCloseTo(100 * camera.scale, 0);
    await expect(page.getByRole("button", { name: "Kartenrevision speichern", exact: true })).toBeDisabled();
    await page.mouse.wheel(0, -120);
    await expect.poll(() => cursor.evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(diameter);
    await page.keyboard.down("Space");
    await expect(cursor).toHaveCSS("opacity", "0");
    await page.keyboard.up("Space");
    await expect(cursor).toHaveCSS("opacity", "1");
    // Releasing a key outside the window must not leave the returned brush hidden.
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", key: " " }));
      window.dispatchEvent(new Event("blur"));
    });
    await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2);
    await expect(cursor).toHaveCSS("opacity", "1");
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", key: " " }));
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "AltLeft", key: "Alt" }));
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "AltLeft", key: "Alt" }));
    });
    await expect(cursor).toHaveCSS("opacity", "0");
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space", key: " " })));
    await expect(cursor).toHaveCSS("opacity", "1");
    await page.screenshot({ path: info.outputPath("brush-footprint.png") });
    await page.getByRole("button", { name: "Auswählen", exact: true }).click();
    await hover();
    await expect(cursor).toHaveCSS("opacity", "0");
    await page.getByRole("button", { name: "Gelände", exact: true }).click();
    await hover();
    await page.mouse.down(); await page.mouse.up();
    await expect(page.getByRole("status").filter({ hasText: "Ungespeicherter Entwurf" })).toBeVisible();
    await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    await page.getByRole("button", { name: "Wiederholen", exact: true }).click();
    await page.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    expect((await host.map()).document.geometry.regions.length).toBeGreaterThan(0);
    await page.reload(); await expect(canvas).toBeVisible();
    expect((await host.map()).document.geometry.regions.length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  } finally { await context.close(); await host.close(); }
});
