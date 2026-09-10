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

test("the mood is saved with the map, and the layer panel hides and locks for this sitting only", async ({ browser }, info) => {
  test.setTimeout(180_000); const host = await studioHost(), context = await browser.newContext();
  try {
    await context.addCookies([host.cookie]); const page = await context.newPage(), errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(host.origin); await expect(canvas(page)).toBeVisible();
    await page.getByRole("button", { name: "Ganze Karte", exact: true }).click();
    const mood = page.getByRole("combobox", { name: "Stimmung", exact: true });
    await expect(mood).toHaveValue("tag");
    await mood.selectOption("nacht");
    await expect(page.getByRole("status").filter({ hasText: "Ungespeicherter Entwurf" })).toBeVisible();
    await page.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    expect((await host.map()).cartography!.mood).toBe("nacht");
    await page.reload(); await expect(canvas(page)).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Stimmung", exact: true })).toHaveValue("nacht");
    // The layer panel is open by default: hide the water, lock the first lockable layer. Neither
    // is saved, so the status still says everything is saved.
    const panel = page.getByRole("group", { name: "Ebenen", exact: true });
    await expect(panel.getByRole("switch", { name: "Wasser", exact: true })).toBeChecked();
    await panel.getByRole("switch", { name: "Wasser", exact: true }).click();
    await expect(panel.getByRole("switch", { name: "Wasser", exact: true })).not.toBeChecked();
    await panel.getByRole("button", { name: "Ebene sperren", exact: true }).first().click();
    await expect(panel.getByRole("button", { name: "Ebene freigeben", exact: true })).toHaveCount(1);
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    await page.screenshot({ path: info.outputPath("night-layers-studio.png"), fullPage: true });
    await page.getByRole("button", { name: "Ebenen", exact: true }).click();
    await expect(panel).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally { await context.close(); await host.close(); }
});

test("the scatter brush strews a wood along one stroke, as one undoable step, on a blank sheet and on a painted coast", async ({ browser }, info) => {
  test.setTimeout(180_000); const host = await studioHost(), context = await browser.newContext();
  try {
    await context.addCookies([host.cookie]); const page = await context.newPage(), errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    const pickTree = async () => {
      await page.getByRole("button", { name: "Möbel & Objekte", exact: true }).click();
      const palette = page.getByRole("region", { name: "Kartenassets", exact: true });
      await palette.getByRole("combobox", { name: "Assetpaket", exact: true }).selectOption("pk.natur");
      await palette.getByRole("button", { name: /^Laubbaum/ }).first().click();
      await page.getByLabel("Streuen beim Ziehen", { exact: true }).check();
    };
    await page.goto(host.origin); await expect(canvas(page)).toBeVisible();
    await page.getByRole("button", { name: "Ganze Karte", exact: true }).click();
    await pickTree();
    await drag(page, [150, 150], [850, 650]);
    // One stroke is one step: undo takes the whole wood away and leaves nothing to save; redo
    // brings every tree back.
    await expect(page.getByRole("button", { name: "Rückgängig", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    await page.getByRole("button", { name: "Wiederholen", exact: true }).click();
    await page.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    const saved = await host.map(), trees = saved.document.geometry.stamps.filter(stamp => stamp.a === "pk.natur/laubbaum");
    expect(trees.length).toBeGreaterThan(8);
    expect(new Set(trees.map(stamp => stamp.r)).size).toBeGreaterThan(3);
    expect(trees.every(stamp => stamp.x >= 0 && stamp.x <= 1000 && stamp.y >= 0 && stamp.y <= 800)).toBe(true);
    const generated = await host.generate("kueste"); await page.goto(`${host.origin}/?map=${generated.ack.subjectId}`); await expect(canvas(page)).toBeVisible();
    await page.getByRole("button", { name: "Ganze Karte", exact: true }).click();
    await pickTree();
    await drag(page, [120, 700], [900, 720]);
    await page.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    await page.screenshot({ path: info.outputPath("scatter-studio.png"), fullPage: true });
    expect(errors).toEqual([]);
  } finally { await context.close(); await host.close(); }
});

test("names on the map: one along a stroke, one straight by click, renamed and removed in the list, saved with the map", async ({ browser }, info) => {
  test.setTimeout(180_000); const host = await studioHost(), context = await browser.newContext();
  try {
    await context.addCookies([host.cookie]); const page = await context.newPage(), errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(host.origin); await expect(canvas(page)).toBeVisible();
    await page.getByRole("button", { name: "Ganze Karte", exact: true }).click();
    await page.getByRole("button", { name: "Beschriften", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Namen setzen" })).toBeVisible();
    const tools = page.getByRole("complementary", { name: "Kartenwerkzeuge", exact: true });
    await tools.getByRole("textbox", { name: "Text", exact: true }).first().fill("Silberbach");
    await tools.getByRole("combobox", { name: "Art", exact: true }).first().selectOption("wasser");
    await drag(page, [150, 600], [850, 400]);
    await tools.getByRole("textbox", { name: "Text", exact: true }).first().fill("Alte Feste");
    await tools.getByRole("combobox", { name: "Art", exact: true }).first().selectOption("ort");
    await click(page, 500, 200);
    await page.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    const named = (await host.map()).cartography!.labels!;
    expect(named.map(label => [label.text, label.style])).toEqual([["Silberbach", "wasser"], ["Alte Feste", "ort"]]);
    expect(named[0]!.points.length).toBeGreaterThan(2); expect(named[1]!.points).toHaveLength(1);
    expect(named[1]!.points[0]).toEqual([500, 200]);
    // The list under the tool renames and removes; both are steps of their own and saved with the map.
    const list = page.locator(".map-label-list");
    await list.getByRole("textbox", { name: "Text", exact: true }).first().fill("Silberbach im Tal");
    await list.getByRole("textbox", { name: "Text", exact: true }).first().press("Tab");
    await list.getByRole("button", { name: "Namen entfernen", exact: true }).nth(1).click();
    await page.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    expect((await host.map()).cartography!.labels!.map(label => label.text)).toEqual(["Silberbach im Tal"]);
    await page.reload(); await expect(canvas(page)).toBeVisible();
    await page.getByRole("button", { name: "Beschriften", exact: true }).click();
    await expect(page.locator(".map-label-list").getByRole("textbox", { name: "Text", exact: true })).toHaveValue("Silberbach im Tal");
    await page.getByRole("button", { name: "Ganze Karte", exact: true }).click();
    await page.screenshot({ path: info.outputPath("names-studio.png"), fullPage: true });
    expect(errors).toEqual([]);
  } finally { await context.close(); await host.close(); }
});

test("the height tool shapes a map that never had a relief, and the relief survives save and reload", async ({ browser }, info) => {
  test.setTimeout(180_000); const host = await studioHost(), context = await browser.newContext();
  try {
    await context.addCookies([host.cookie]); const page = await context.newPage(), errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(host.origin); await expect(canvas(page)).toBeVisible();
    await page.getByRole("button", { name: "Ganze Karte", exact: true }).click();
    // The fixture is flat land without any relief: the view toggles have nothing to show yet.
    await expect(page.getByRole("switch", { name: "Höhenlinien", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Höhe", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Höhe formen" })).toBeVisible();
    await page.getByRole("button", { name: "Anheben · Hügel und Berge auftürmen", exact: true }).click();
    await drag(page, [300, 300], [700, 500]);
    await expect(page.getByRole("switch", { name: "Höhenlinien", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rückgängig", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Kartenrevision speichern", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Alle Änderungen gespeichert" })).toBeVisible();
    const saved = await host.map(), relief = saved.cartography!.relief!;
    expect(relief.columns * relief.rows).toBe(relief.heights.length);
    expect(new Set(relief.heights).size).toBeGreaterThan(1);
    expect(Math.max(...relief.heights)).toBeGreaterThan(relief.seaLevel);
    await page.reload(); await expect(canvas(page)).toBeVisible();
    await expect(page.getByRole("switch", { name: "Höhenlinien", exact: true })).toBeVisible();
    await page.getByRole("switch", { name: "Schattierung", exact: true }).click();
    await page.screenshot({ path: info.outputPath("relief-studio.png"), fullPage: true });
    expect(errors).toEqual([]);
  } finally { await context.close(); await host.close(); }
});
