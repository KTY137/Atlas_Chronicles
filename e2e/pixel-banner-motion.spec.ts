// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type ElementHandle, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { BANNER_IDS } from "../packages/theme/src/index.ts";
import { reviewApp } from "./helpers/review-app";

let app: Awaited<ReturnType<typeof reviewApp>>;
// Save the explicit sampled PNGs below. Repeated whole-gallery DOM snapshots
// consumed 41 seconds in the measured timeout; keep action/source traces here.
test.use({ trace: { mode: "retain-on-failure", screenshots: false, snapshots: false, sources: true } });
test.beforeAll(async () => { app = await reviewApp(9744); });
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

async function seekSceneFrame(surface: ElementHandle<HTMLElement | SVGElement>, milliseconds: number) {
  await surface.evaluate((element, milliseconds) => {
    for (const animation of element.getAnimations({ subtree: true })) {
      animation.pause();
      const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
      // Twinkling background stars alone cannot qualify a scene as visibly alive.
      animation.currentTime = target instanceof Element && target.closest(".pb-twinkle") ? 0 : milliseconds;
    }
  }, milliseconds);
}

async function centralSceneClip(surface: ElementHandle<HTMLElement | SVGElement>) {
  await surface.scrollIntoViewIfNeeded();
  return surface.evaluate(element => {
    const scene = element.querySelector("svg.pb-scene")!;
    const art = scene.getBoundingClientRect(), visible = element.getBoundingClientRect();
    const inset = element.classList.contains("pixel-banner-strip")
      ? Number.parseFloat(getComputedStyle(element).getPropertyValue("--pb-feather")) + 4 : 0;
    // The header mask blends side scenery into its edges. Read its actual feather
    // width, then exclude those edges from the central-motion measurement.
    const x = Math.ceil(Math.max(art.left + inset, visible.left, 0));
    const y = Math.ceil(Math.max(art.top, visible.top, 0));
    const right = Math.floor(Math.min(art.right - inset, visible.right, innerWidth));
    const bottom = Math.floor(Math.min(art.bottom, visible.bottom, innerHeight));
    return { x, y, width: right - x, height: bottom - y };
  });
}

async function changedPixels(page: Page, frames: Buffer[]) {
  return page.evaluate(async encoded => {
    const images = await Promise.all(encoded.map(async source => {
      const bytes = Uint8Array.from(atob(source), character => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      return context.getImageData(0, 0, canvas.width, canvas.height).data;
    }));
    const first = images[0]!;
    return images.slice(1).map(frame => {
      let changed = 0;
      for (let pixel = 0; pixel < first.length; pixel += 4) {
        // Ignore tiny raster rounding differences; count actual changed colors.
        if ([0, 1, 2].some(channel => Math.abs(frame[pixel + channel]! - first[pixel + channel]!) >= 8)) changed++;
      }
      return changed;
    });
  }, frames.map(frame => frame.toString("base64")));
}

test("all 25 previews and headers render moving scene details beyond twinkling stars", async ({ page }, testInfo) => {
  // Fifty real rendered surfaces, each sampled at three deterministic times.
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openSettings(page);
  await page.mouse.move(0, 0);
  const frameDirectory = ".local/pixel-banners-living/rendered-motion-frames";
  await mkdir(frameDirectory, { recursive: true });
  const evidence = [];
  try {
    for (const scene of BANNER_IDS) {
      await pick(page, scene);
      await expect(banner(page)).toHaveAttribute("data-scene", scene);
      await freezeBannerAnimations(page);
      for (const [name, surface] of [
        ["preview", page.locator(`.pixel-banner-preview[data-scene="${scene}"]`)],
        ["header", banner(page)],
      ] as const) {
        // The scene stays mounted and frozen throughout these three frames.
        // Resolve it once rather than repeating locator waits for every sample.
        const surfaceElement = await surface.elementHandle();
        if (!surfaceElement) throw new Error(`${scene} ${name} did not mount`);
        const structure = await surfaceElement.evaluate(element => ({
          landmarks: element.querySelectorAll("[data-landmark]").length,
          repetitions: element.querySelectorAll("pattern, use").length,
          vignetteCompositions: element.querySelectorAll(".pb-vignettes").length,
          vignettes: Array.from(element.querySelectorAll("[data-landmark] > .pb-vignettes > g"), vignette => vignette.innerHTML),
        }));
        expect(structure.landmarks).toBe(1);
        expect(structure.repetitions).toBe(0);
        expect(structure.vignetteCompositions).toBe(1);
        expect(structure.vignettes).toHaveLength(2);
        expect(structure.vignettes[0], `${scene} ${name} has two different vignettes`).not.toBe(structure.vignettes[1]);
        const clip = await centralSceneClip(surfaceElement);
        expect(clip.width, `${scene} ${name} central art is visible`).toBeGreaterThan(100);
        expect(clip.height).toBeGreaterThan(40);
        const frames = [];
        for (const milliseconds of [0, 800, 2000]) {
          await seekSceneFrame(surfaceElement, milliseconds);
          const frame = await page.screenshot({ clip, animations: "allow" });
          frames.push(frame);
          await writeFile(`${frameDirectory}/${scene}-${name}-${milliseconds}ms.png`, frame);
        }
        const changes = await changedPixels(page, frames);
        const minimum = Math.max(12, Math.floor(clip.width * clip.height * .001));
        evidence.push({ scene, surface: name, clip, changedPixelsFromZero: changes, minimum });
        if (Math.max(...changes) < minimum) {
          for (const [index, frame] of frames.entries()) {
            await testInfo.attach(`${scene}-${name}-${[0, 800, 2000][index]}ms`, { body: frame, contentType: "image/png" });
          }
        }
        expect(Math.max(...changes), `${scene} ${name} must visibly animate central scene details with stars frozen`).toBeGreaterThanOrEqual(minimum);
        await surfaceElement.dispose();
      }
    }
  } finally {
    await mkdir(".local/pixel-banners-living", { recursive: true });
    const report = JSON.stringify(evidence, null, 2);
    await writeFile(".local/pixel-banners-living/rendered-motion.json", report);
    await testInfo.attach("rendered-motion", { body: report, contentType: "application/json" });
  }
});
