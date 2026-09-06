import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir:"./e2e", fullyParallel:false, workers:1, timeout:120_000,
  expect:{timeout:15_000}, reporter:[["list"],["html",{open:"never"}]],
  use:{channel:process.env["PLAYWRIGHT_CHANNEL"] ?? (process.platform==="win32" ? "msedge" : "chromium"),headless:true,viewport:{width:1440,height:960},trace:"retain-on-failure",screenshot:"only-on-failure",actionTimeout:15_000},
});
