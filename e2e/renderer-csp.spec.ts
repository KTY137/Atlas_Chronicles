// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import sharp from "sharp";

// The ordinary web test host does not inject Electron's main-frame CSP. Exercise that
// exact production policy with the real renderer and Pixi, including actual painted pixels.
const policy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'self'";

test("the real map renderer initializes and paints under the desktop CSP without unsafe-eval", async ({ page }, testInfo) => {
  const bundle = await build({ stdin: { contents: `
    import { createMapRenderer } from './packages/render/src/renderer.ts';
    const host = document.querySelector('#map');
    try { new Function('return 1')(); window.cspBlocksEval = false; } catch { window.cspBlocksEval = true; }
    try {
      const map = await createMapRenderer(host, { id: 'csp-map', width: 200, height: 200, pins: [],
        cells: [{ id: 'square', polygon: [[40,40],[160,40],[160,160],[40,160]], surface: 'street', fill: 0x258e68 }] });
      const camera = map.getCamera();
      window.rendererProbe = { ready: true, backend: map.backend, point: [camera.x + 100 * camera.scale, camera.y + 100 * camera.scale] };
      window.addEventListener('pagehide', () => map.destroy(), { once: true });
    } catch (error) { window.rendererProbe = { ready: false, error: String(error), cause: String(error.cause) }; }
  `, resolveDir: process.cwd(), loader: "ts" }, bundle: true, format: "esm", platform: "browser", target: "es2022", write: false, logLevel: "silent" });
  await page.route("http://renderer-csp.test/**", route => route.fulfill({
    status: 200, headers: { "Content-Security-Policy": policy },
    contentType: route.request().url().endsWith("/renderer.js") ? "text/javascript" : "text/html",
    body: route.request().url().endsWith("/renderer.js") ? bundle.outputFiles[0]!.text
      : '<!doctype html><html><body><div id="map" style="width:400px;height:300px"></div><script type="module" src="/renderer.js"></script></body></html>',
  }));
  const response = await page.goto("http://renderer-csp.test/");
  expect(response!.headers()["content-security-policy"]).toBe(policy);
  await page.waitForFunction(() => "rendererProbe" in window);
  // The probe executes in the served script. CDP's evaluate privilege can bypass CSP and
  // therefore cannot itself establish that page-owned Function construction is blocked.
  expect(await page.evaluate(() => (window as unknown as { cspBlocksEval: boolean }).cspBlocksEval)).toBe(true);
  const probe = await page.evaluate(() => (window as unknown as { rendererProbe: { ready: boolean; backend?: string; point?: [number, number]; error?: string; cause?: string } }).rendererProbe);
  expect(probe, JSON.stringify(probe)).toMatchObject({ ready: true });
  expect(["pixi-webgl", "pixi-webgpu", "pixi-canvas"]).toContain(probe.backend);
  const screenshot = await page.locator("#map canvas").screenshot();
  await testInfo.attach("csp-rendered-map", { body: screenshot, contentType: "image/png" });
  const pixel = await sharp(screenshot).extract({ left: Math.round(probe.point![0]), top: Math.round(probe.point![1]), width: 1, height: 1 }).removeAlpha().raw().toBuffer();
  expect([...pixel]).toEqual([0x25, 0x8e, 0x68]);
});
