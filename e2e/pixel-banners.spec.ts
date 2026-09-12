// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type Locator, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { BANNER_IDS } from "../packages/theme/src/index.ts";
import { reviewApp } from "./helpers/review-app";

let app: Awaited<ReturnType<typeof reviewApp>>;
const key = "chronicle.appearance.v1";
// Continuous screencast capture adds thousands of frames while all cards animate.
// Keep action/DOM/source traces; full scene sampling has its own focused spec.
test.use({ trace: { mode: "retain-on-failure", screenshots: false, snapshots: true, sources: true } });
test.beforeAll(async () => { app = await reviewApp(9743); });
test.afterAll(async () => { await app?.close(); });
async function openSettings(page: Page, language = "de") {
  await page.context().addCookies([{ name: "chronicle_session", value: app.gm.value, domain: "localhost", path: "/", httpOnly: true, secure: true, sameSite: "Strict" }]);
  await page.goto(`${app.origin}/?campaign=${app.campaign.id}&stage=account&lang=${language}`);
  await expect(page.locator(".banner-auswahl")).toBeVisible();
}
const banner = (page: Page) => page.locator(".context-banner .pixel-banner");
const pick = (page: Page, id: string) => page.locator(`.banner-auswahl input[type=radio][value="${id}"]`).check();

async function freezeBannerAnimations(page: Page) {
  await page.locator(".pixel-banner").evaluateAll(surfaces => {
    for (const surface of surfaces) for (const animation of surface.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = 0;
    }
  });
}

async function expectStillBanners(page: Page) {
  await page.mouse.move(0, 0);
  const surfaces = [page.locator(".banner-gitter"), banner(page)];
  const first = [];
  for (const surface of surfaces) first.push(await surface.screenshot({ animations: "allow" }));
  // Real elapsed time matters here: disabled motion must stop rendered pixels,
  // not merely remove a running Web Animations API entry.
  await page.waitForTimeout(350);
  for (const [index, surface] of surfaces.entries()) {
    expect((await surface.screenshot({ animations: "allow" })).equals(first[index]!),
      `${index === 0 ? "all 25 preview cards" : "header"} remain still with motion disabled`).toBe(true);
  }
}

async function seekPrecipitation(surface: Locator, layer: number, progress: number) {
  await surface.evaluate((element, { layer, progress }) => {
    const animations = element.getAnimations({ subtree: true }).filter(animation =>
      animation.effect instanceof KeyframeEffect && animation.effect.target instanceof Element &&
      animation.effect.target.matches(".pb-rain, .pb-snow"));
    const animation = animations[layer]!;
    animation.currentTime = Number(animation.effect!.getTiming().duration) * progress;
  }, { layer, progress });
}

test("all 25 scenes appear in the real header and persist without changing the color scheme", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 3440, height: 960 });
  await openSettings(page);
  await expect(page.locator(".banner-karte")).toHaveCount(25);
  await expect(page.locator(".banner-auswahl input[type=radio]")).toHaveCount(26);
  // Every card is alive before a choice or hover, not just the active scene.
  await page.mouse.move(0, 0);
  await expect.poll(() => page.locator(".pixel-banner-preview").evaluateAll(cards => cards.map(card =>
    card.getAnimations({ subtree: true }).some(animation => animation.playState === "running")))).toEqual(Array(25).fill(true));
  // This test covers selection and geometry. The motion spec measures every scene,
  // so the unrelated gallery need not repaint during these reads.
  await freezeBannerAnimations(page);
  const theme = await page.locator("html").getAttribute("data-appearance-theme");
  for (const id of BANNER_IDS) {
    await pick(page, id);
    await expect(banner(page)).toHaveAttribute("data-scene", id);
    const geometry = await banner(page).evaluate((element, key) => ({
      scenes: element.querySelectorAll("svg.pb-scene").length,
      landmarks: Array.from(element.querySelectorAll("[data-landmark]"), landmark => landmark.getAttribute("data-landmark")),
      vignetteCompositions: element.querySelectorAll(".pb-vignettes").length,
      vignettes: Array.from(element.querySelectorAll("[data-landmark] > .pb-vignettes > g"), vignette => vignette.innerHTML),
      repetitions: element.querySelectorAll("pattern, use").length,
      wings: Array.from(element.querySelectorAll("[data-landscape-wing]"), wing => ({ side: wing.getAttribute("data-landscape-wing"), art: wing.innerHTML })),
      width: element.querySelector("svg.pb-scene")!.getBoundingClientRect().width,
      // Each direct group is one tree, palm, house or similar small terrain item.
      // Full-width backdrop paths are siblings and deliberately excluded here.
      terrainWidths: Array.from(element.querySelectorAll<SVGGElement>("[data-landscape-wing] > g"), item => item.getBBox().width),
      invalidCoordinates: Array.from(element.querySelectorAll("[data-landscape-wing] path"), path => path.getAttribute("d")!)
        .filter(path => path.includes("--")),
      theme: document.documentElement.getAttribute("data-appearance-theme"),
      selected: JSON.parse(localStorage.getItem(key)!).banner,
    }), key);
    expect(geometry.scenes).toBe(1);
    expect(geometry.landmarks).toEqual([id]);
    expect(geometry.vignetteCompositions).toBe(1);
    expect(geometry.vignettes).toHaveLength(2);
    expect(geometry.vignettes[0], `${id} has two different vignettes inside its single composition`).not.toBe(geometry.vignettes[1]);
    expect(geometry.repetitions).toBe(0);
    expect(geometry.wings.map(wing => wing.side)).toEqual(["left", "right"]);
    expect(geometry.wings[0]!.art, `${id} has different left and right landscape extensions`).not.toBe(geometry.wings[1]!.art);
    expect(geometry.width).toBeCloseTo(640 * 2 / 3, 1);
    expect(geometry.terrainWidths.length).toBeGreaterThan(0);
    expect(Math.max(...geometry.terrainWidths), `${id} individual terrain items must not stretch across the panorama`).toBeLessThan(400);
    expect(geometry.invalidCoordinates, `${id} landscape paths must not contain doubled negative signs`).toEqual([]);
    expect(geometry.theme).toBe(theme);
    expect(geometry.selected).toBe(id);
  }
  await page.reload();
  await expect(banner(page)).toHaveAttribute("data-scene", "nachtmarkt");
  await expect(page.getByRole("radio", { name: "Nachtmarkt · Laternenfest", exact: true })).toBeChecked();
  expect(errors).toEqual([]);
});


test("animation can be paused and respects live system motion, contrast and power preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openSettings(page);
  await pick(page, "luftschiffhafen");
  await expect(banner(page)).toHaveAttribute("data-animated", "true");
  const motion = page.locator(".context-banner .pb-float").first();
  expect(await motion.evaluate(el => getComputedStyle(el).animationName)).toBe("pb-bob");
  await page.getByRole("checkbox", { name: "Banner animieren", exact: true }).uncheck();
  await expect(banner(page)).toHaveAttribute("data-animated", "false");
  expect(await motion.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  expect(await page.locator(".banner-gitter").evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length)).toBe(0);
  await expectStillBanners(page);
  await page.reload();
  await expect(banner(page)).toHaveAttribute("data-animated", "false");
  await page.getByRole("checkbox", { name: "Banner animieren", exact: true }).check();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(banner(page)).toHaveAttribute("data-animated", "false");
  await expectStillBanners(page);
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
  // This whole-gallery artifact and the viewport checks concern composition.
  // Keep the large catalog still; actual motion is checked below and for all50
  // surfaces by the dedicated deterministic pixel test.
  await freezeBannerAnimations(page);
  await mkdir(".local/pixel-banners", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 3400 });
  await page.locator(".banner-auswahl").screenshot({ path: ".local/pixel-banners/gallery.png" });
  for (const width of [390, 820, 1440, 3440]) {
    await page.setViewportSize({ width, height: 960 });
    if (width !== 3440) {
      const previews = await page.locator(".pixel-banner-preview").evaluateAll(elements => elements.map(element => {
        const svg = element.querySelector<SVGSVGElement>("svg.pb-scene")!;
        const bounds = element.getBoundingClientRect(), artwork = svg.getBoundingClientRect();
        const matrix = svg.getScreenCTM()!;
        return { scene: element.getAttribute("data-scene"), width: bounds.width, height: bounds.height,
          edges: [artwork.left - bounds.left, artwork.right - bounds.right, artwork.top - bounds.top, artwork.bottom - bounds.bottom],
          viewBox: [svg.viewBox.baseVal.x, svg.viewBox.baseVal.y, svg.viewBox.baseVal.width, svg.viewBox.baseVal.height],
          // The viewBox's corners must reach the card's corners, not disappear
          // outside an overflow crop or leave a reduced slice of the scene visible.
          mappedEdges: [matrix.e - bounds.left, matrix.e + matrix.a * 640 - bounds.right,
            matrix.f - bounds.top, matrix.f + matrix.d * 96 - bounds.bottom],
          scaleX: matrix.a, scaleY: matrix.d, aspectMode: svg.preserveAspectRatio.baseVal.meetOrSlice,
        };
      }));
      expect(previews).toHaveLength(25);
      for (const preview of previews) {
        expect(preview.viewBox).toEqual([0, 0, 640, 96]);
        expect(preview.aspectMode, `${preview.scene} fits the full scene at ${width}px`).toBe(1);
        expect(preview.width / preview.height).toBeCloseTo(640 / 96, 2);
        expect(preview.scaleX).toBeCloseTo(preview.scaleY, 5);
        expect(Math.max(...preview.edges.map(Math.abs)), `${preview.scene} SVG stays inside its preview at ${width}px`).toBeLessThan(1);
        expect(Math.max(...preview.mappedEdges.map(Math.abs)), `${preview.scene} shows the entire viewBox at ${width}px`).toBeLessThan(1);
      }
    }
    await expect(page.getByRole("button", { name: "Einstellungen", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Abmelden", exact: true })).toBeVisible();
    expect(await page.locator(".context-bar").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    if (width <= 760) await expect(page.locator(".context-banner")).toBeHidden();
    else await expect(banner(page)).toBeVisible();
    await page.locator(".context-bar").screenshot({ path: `.local/pixel-banners/header-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await banner(page).evaluate(element => {
    for (const animation of element.getAnimations({ subtree: true })) animation.play();
  });
  const frame = await page.locator(".context-banner").screenshot();
  await expect.poll(async () => (await page.locator(".context-banner").screenshot()).equals(frame)).toBe(false);
  await page.getByRole("button", { name: "Kampagnenübersicht", exact: true }).click();
  await expect(page.locator(".banner-auswahl")).toHaveCount(0);
  await page.getByRole("button", { name: "Einstellungen", exact: true }).click();
  await expect(page.locator(".banner-auswahl")).toBeVisible();
});

test("rain and snow render the same pixels across a complete loop in the card and panoramic header", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // Expose the new side-weather fields as well as the central scene's fields.
  await page.setViewportSize({ width: 3440, height: 960 });
  await openSettings(page);
  await page.mouse.move(0, 0);
  await mkdir(".local/pixel-banners-polish", { recursive: true });
  for (const scene of ["neonregen", "eiswacht"]) {
    await pick(page, scene);
    for (const [name, width, surface] of [
      ["preview-390", 390, page.locator(`.pixel-banner-preview[data-scene="${scene}"]`)],
      ["preview-820", 820, page.locator(`.pixel-banner-preview[data-scene="${scene}"]`)],
      ["preview-1440", 1440, page.locator(`.pixel-banner-preview[data-scene="${scene}"]`)],
      ["header", 3440, banner(page)],
    ] as const) {
      await page.setViewportSize({ width, height: 960 });
      await freezeBannerAnimations(page);
      const layers = await surface.evaluate(element => {
        const precipitation = element.getAnimations({ subtree: true }).filter(animation =>
          animation.effect instanceof KeyframeEffect && animation.effect.target instanceof Element &&
          animation.effect.target.matches(".pb-rain, .pb-snow"));
        for (const animation of precipitation) {
          // A finite iteration exposes its actual final frame. Seeking an infinite animation
          // to its duration would wrap to zero and let a visibly broken seam pass this test.
          animation.effect!.updateTiming({ iterations: 1, fill: "both", delay: 0, endDelay: 0 });
          animation.currentTime = 0;
        }
        return precipitation.length;
      });
      expect(layers, `${scene} ${name} composes each precipitation layer exactly once`).toBe(name === "header" ? 4 : 2);
      const animationState = () => surface.evaluate(element => element.getAnimations({ subtree: true }).map(animation => {
        const effect = animation.effect as KeyframeEffect;
        return { name: animation instanceof CSSAnimation ? animation.animationName : animation.id,
          state: animation.playState, pending: animation.pending, currentTime: animation.currentTime,
          timing: effect.getComputedTiming(), target: effect.target?.getAttribute("class"),
          transform: effect.target instanceof Element ? getComputedStyle(effect.target).transform : null };
      }));
      const startState = await animationState();
      const framePath = `.local/pixel-banners-polish/loop-${scene}-${name}`;
      const start = await surface.screenshot({ animations: "allow", path: `${framePath}-start.png` });
      for (let layer = 0; layer < layers; layer++) {
        await seekPrecipitation(surface, layer, 0.5);
        const halfway = await surface.screenshot({ animations: "allow", path: `${framePath}-${layer}-half.png` });
        expect(halfway.equals(start), `${scene} ${name} layer ${layer} visibly moves`).toBe(false);
        await seekPrecipitation(surface, layer, 1);
        const end = await surface.screenshot({ animations: "allow", path: `${framePath}-${layer}-end.png` });
        await writeFile(`${framePath}-${layer}-timing.json`, JSON.stringify({ start: startState, end: await animationState() }, null, 2));
        expect(end.equals(start), `${scene} ${name} layer ${layer} repeats without a reset jump`).toBe(true);
        await seekPrecipitation(surface, layer, 0);
      }
    }
  }
});

test("the banner gallery is translated in English", async ({ page }) => {
  await openSettings(page, "en");
  await expect(page.getByRole("group", { name: "Pixel art banners 25 scenes", exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Airship harbor · Steampunk", exact: true }).check();
  await expect(banner(page)).toHaveAttribute("data-scene", "luftschiffhafen");
  await expect(page.getByRole("checkbox", { name: "Animate banners", exact: true })).toBeVisible();
  for (const [id, label] of [
    ["sternwarte", "Observatory · Star magic"],
    ["versunkener_tempel", "Sunken temple · Deep sea magic"],
    ["pilzdorf", "Mushroom village · Fairy realm"],
    ["wolkenkloster", "Cloud monastery · Cloud realm"],
    ["nachtmarkt", "Night market · Lantern festival"],
  ] as const) {
    await page.getByRole("radio", { name: label, exact: true }).check();
    await expect(banner(page)).toHaveAttribute("data-scene", id);
  }
});
