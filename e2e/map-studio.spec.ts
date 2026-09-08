// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type Page } from "@playwright/test";
import { fitCamera } from "../packages/render/src/geometry.ts";
import { studioHost } from "./helpers/map-studio-host.ts";

const canvas = (page: Page) => page.locator('.map-editor-stage .tactical-canvas[data-canvas-ready="true"] canvas');
async function point(page: Page, x: number, y: number) {
  await canvas(page).scrollIntoViewIfNeeded();
  const box = (await canvas(page).boundingBox())!, camera = fitCamera([1000, 800], [box.width, box.height]);
  return { x: box.x + camera.x + x * camera.scale, y: box.y + camera.y + y * camera.scale };
}
async function click(page: Page, x: number, y: number) { const p = await point(page, x, y); await page.mouse.click(p.x, p.y); }
async function drag(page: Page, from: readonly [number, number], to: readonly [number, number]) {
  const a = await point(page, ...from), b = await point(page, ...to);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 }); await page.mouse.up();
}

test("free interior building, door, furniture selection, room move, history and reload", async ({ browser }, info) => {
  test.setTimeout(180_000);
  const host = await studioHost(), context = await browser.newContext();
  try {
    await context.addCookies([host.cookie]); const page = await context.newPage(), errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message)); await page.goto(host.origin); await expect(canvas(page)).toBeVisible();
    await page.getByRole("button", { name: "Ganze Karte", exact: true }).click();
    await page.getByRole("button", { name: "Raum", exact: true }).click();
    await drag(page, [150, 150], [450, 400]);
    await expect(page.getByRole("button", { name: "Vorschau übernehmen", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Rückgängig", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    const first = await host.map(), room = first.cartography!.regions.find(region => region.role === "room")!;
    expect(first.document.walls).toHaveLength(4);
    await page.getByRole("button", { name: "Tür", exact: true }).click(); await click(page, 300, 150);
    await page.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    expect((await host.map()).document.portals).toHaveLength(1);
    await page.getByRole("button", { name: "Möbel & Objekte", exact: true }).click();
    const palette = page.getByRole("region", { name: "Kartenassets", exact: true });
    await palette.getByRole("combobox", { name: "Assetpaket", exact: true }).selectOption("pk.gemalt");
    await palette.getByRole("combobox", { name: "Kategorie", exact: true }).selectOption("moebel");
    await palette.locator('.map-artwork-grid button').first().click(); await click(page, 300, 300);
    await page.locator('.map-editor-stage').getByRole("button", { name: "Platzieren beenden", exact: true }).click();
    await page.getByRole("button", { name: "Auswählen", exact: true }).click();
    await drag(page, [300, 300], [350, 300]);
    await page.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    const furnished = await host.map(); expect(furnished.document.geometry.stamps).toHaveLength(1); expect(furnished.document.geometry.stamps[0]!.x).toBe(350);
    await drag(page, [200, 250], [300, 350]);
    await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
    await page.getByRole("button", { name: "Wiederholen", exact: true }).click();
    await page.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    const moved = await host.map(); expect(moved.document.geometry.regions[0]!.id).toBe(room.regionId);
    expect(moved.document.portals[0]!.position).toEqual([400, 250]); expect(moved.document.geometry.stamps[0]!.x).toBe(450);
    await page.reload(); await expect(canvas(page)).toBeVisible(); await page.screenshot({ path: info.outputPath("interior-studio-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole("button", { name: "Werkzeuge & Details", exact: true }).click();
    await expect(page.getByRole("button", { name: "Raum", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath("interior-studio-mobile.png"), fullPage: true }); expect(errors).toEqual([]);
  } finally { await context.close(); await host.close(); }
});

test("mountain and island locations render in the real studio", async ({ browser }, info) => {
  test.setTimeout(180_000); const host = await studioHost(), context = await browser.newContext();
  try {
    await context.addCookies([host.cookie]); const page = await context.newPage(), errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    for (const standort of ["gebirge", "insel"] as const) {
      const generated = await host.generate(standort); await page.goto(`${host.origin}/?map=${generated.ack.subjectId}`); await expect(canvas(page)).toBeVisible();
      await page.getByRole("button", { name: "Ganze Karte", exact: true }).click();
      await page.screenshot({ path: info.outputPath(`${standort}-studio.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
  } finally { await context.close(); await host.close(); }
});
