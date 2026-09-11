// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type Locator, type Page } from "@playwright/test";
import { reviewApp } from "./helpers/review-app";

let app: Awaited<ReturnType<typeof reviewApp>>;
test.beforeAll(async () => { app = await reviewApp(11843); });
test.afterAll(async () => { await app?.close(); });
const seeds = [0x43, 0x20260911, 0xc0ffee, 0x71f00d];
function random(seed: number) { let n = seed >>> 0; return (limit: number) => { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) % limit; }; }
async function enter(page: Page, stage: string) {
  await page.context().addCookies([{ name: "chronicle_session", value: app.gm.value, url: app.origin, httpOnly: true, sameSite: "Strict" }]);
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=${stage}`);
}
/** A real pointer opens the native popup; keys commit an option. No force click or
 * selectOption: both would miss the reported "visible but not selectable" failure. */
async function choose(select: Locator, value: string) {
  const values = await select.evaluate((node: HTMLSelectElement) => [...node.options]
    .filter(option => !option.disabled && !(option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled))
    .map(option => option.value));
  const index = values.indexOf(value); expect(index).toBeGreaterThanOrEqual(0);
  await select.click(); await select.press("Home");
  for (let i = 0; i < index; i++) await select.press("ArrowDown");
  await select.press("Enter"); await expect(select).toHaveValue(value);
}
function errors(page: Page) {
  const messages: string[] = [];
  page.on("pageerror", error => messages.push(error.message));
  page.on("console", message => { if (message.type() === "error" && /Maximum update|uncontrolled|controlled input|NaN|unmounted component/i.test(message.text())) messages.push(message.text()); });
  return messages;
}

for (const seed of seeds) test(`seeded GUI state monkey ${seed.toString(16)}`, async ({ page }, info) => {
  test.setTimeout(180_000);
  const pick = random(seed), trace: unknown[] = [], failures = errors(page);
  if (seed & 1) await page.setViewportSize({ width: 390, height: 844 });
  try {
    await enter(page, "atlas");
    await page.getByRole("button", { name: "Neue Karte", exact: true }).click();
    const studio = page.getByRole("region", { name: "Kartenwerkstatt", exact: true });
    await studio.getByLabel("Name der Karte", { exact: true }).fill(`Fuzz ${seed}`);
    const families = studio.getByRole("group", { name: "Art der Karte", exact: true }).getByRole("button");
    await expect(families).toHaveCount(4);
    for (let step = 0; step < 48; step++) {
      const op = pick(5); trace.push({ step, op });
      if (op === 0) {
        const index = pick(4); trace.push({ family: index }); await families.nth(index).click();
        await expect(families.nth(index)).toHaveAttribute("aria-pressed", "true");
      } else if (op === 1) {
        const selects = studio.locator("select:visible:not(:disabled)");
        const count = await selects.count();
        if (count) {
          const select = selects.nth(pick(count));
          const values = await select.locator("option:not(:disabled)").evaluateAll(nodes => nodes.map(n => (n as HTMLOptionElement).value));
          if (values.length) { const value = values[pick(values.length)]!; trace.push({ select: await select.getAttribute("aria-label"), value }); await choose(select, value); }
        }
      } else if (op === 2) {
        const sizes = studio.getByRole("group", { name: "Größenprofile", exact: true }).getByRole("button");
        const index = pick(await sizes.count()); await sizes.nth(index).click();
        // A size choice is an edit, not a submission or a lost draft.
        await expect(studio.getByLabel("Name der Karte", { exact: true })).toHaveValue(`Fuzz ${seed}`);
      } else if (op === 3) {
        const summary = studio.locator("summary").filter({ hasText: /^Feineinstellungen$/ });
        await summary.click();
        const checkboxes = studio.locator('input[type="checkbox"]:visible:not(:disabled)');
        if (await checkboxes.count()) { const box = checkboxes.nth(pick(await checkboxes.count())); const before = await box.isChecked(); await box.click(); await expect(box).toBeChecked({ checked: !before }); }
      } else {
        const width = studio.getByLabel("Breite", { exact: true });
        const value = ["", "11", "193", "24.5", "36"][pick(5)]!;
        trace.push({ width: value }); await width.fill(value);
        await expect(width).toHaveValue(value);
      }
      expect(failures, JSON.stringify(trace)).toEqual([]);
      // Every displayed controlled select must correspond to an actual option.
      const invalid = await studio.locator("select:visible:not(:disabled)").evaluateAll(nodes => nodes.filter(n => (n as HTMLSelectElement).options.length && (n as HTMLSelectElement).selectedIndex < 0).map(n => n.outerHTML));
      expect(invalid, JSON.stringify(trace)).toEqual([]);
    }
    // Deterministic recovery from arbitrary invalid intermediate states.
    await families.nth(1).click();
    await choose(studio.getByRole("combobox", { name: "Art des Ortes", exact: true }), "siedlung:dorf");
    await studio.getByLabel("Breite", { exact: true }).fill("36");
    await studio.getByLabel("Höhe", { exact: true }).fill("28");
    await studio.getByLabel("Gebäude", { exact: true }).fill("20");
    await studio.getByLabel("Weltkeim", { exact: true }).fill(`gui-fuzz-${seed}`);
    const preview = page.waitForResponse(response => response.url().endsWith("/tactical/generate/preview") && response.request().method() === "POST");
    await studio.getByRole("button", { name: "Vorschau", exact: true }).click();
    expect((await preview).status(), JSON.stringify(trace)).toBe(200);
    await expect(studio.getByRole("button", { name: "Erzeugen und speichern", exact: true })).toBeEnabled();
    expect(failures).toEqual([]);
    await page.screenshot({ path: info.outputPath("recovered-studio.png") });
  } finally { await info.attach("seed-and-actions", { body: JSON.stringify({ seed, trace, failures }, null, 2), contentType: "application/json" }); }
});

test("native loot dropdowns survive rapid choices, media navigation and a cancelled departure", async ({ page }, info) => {
  const failures = errors(page); await enter(page, "schmiede&forge=loot");
  const form = page.locator(".loot-template-form");
  await form.getByLabel("Gegenstandsname", { exact: true }).fill("Dropdown Regression");
  const select = form.getByRole("combobox", { name: "Seltenheit", exact: true });
  const values = await select.locator("option").evaluateAll(nodes => nodes.map(n => (n as HTMLOptionElement).value));
  for (const value of [...values, ...values.toReversed()]) await choose(select, value);
  await choose(select, "selten");
  await form.getByRole("button", { name: "Bild hochladen oder Bestand öffnen", exact: true }).click();
  await page.getByRole("button", { name: "Zurück zur Lootkarte", exact: true }).click();
  await expect(select).toHaveValue("selten");
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("navigation", { name: "Bereiche", exact: true }).getByRole("button", { name: "Tisch", exact: true }).click();
  await expect(form.getByLabel("Gegenstandsname", { exact: true })).toHaveValue("Dropdown Regression");
  await choose(select, values.at(-1)!);
  expect(failures).toEqual([]); await page.screenshot({ path: info.outputPath("loot-dropdown.png") });
});

test("settings dropdown cancellation does not leave the settings screen", async ({ page }, info) => {
  await enter(page, "heute"); await page.getByRole("button", { name: "Einstellungen", exact: true }).click();
  const selects = page.locator("main select:visible"); await expect.poll(() => selects.count()).toBeGreaterThan(2);
  // Exclude language: changing it is an explicit full-page transition, not a cosmetic setting.
  for (let i = 1; i < await selects.count(); i++) {
    const select = selects.nth(i), before = await select.inputValue();
    await select.click(); await select.press("Escape"); await expect(select).toBeVisible();
    await expect(select).toHaveValue(before);
  }
  await page.screenshot({ path: info.outputPath("settings-dropdowns.png") });
});
