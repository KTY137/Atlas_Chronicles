import { defineConfig } from "@playwright/test";
// Die Specs pruefen die deutsche Oberflaeche. Ohne feste Sprache entscheidet die des
// Laufers: ein englischer Browser waehlt beim Start Englisch, und jeder deutsche Text-
// Locator geht ins Leere. `e2e/sprache.spec.ts` setzt seine Sprache je Fall selbst.
export default defineConfig({
  testDir:"./e2e", fullyParallel:false, workers:1, timeout:120_000,
  expect:{timeout:15_000}, reporter:[["list"],["html",{open:"never"}]],
  use:{locale:"de-DE",channel:process.env["PLAYWRIGHT_CHANNEL"] ?? (process.platform==="win32" ? "msedge" : "chromium"),headless:true,viewport:{width:1440,height:960},trace:"retain-on-failure",screenshot:"only-on-failure",actionTimeout:15_000},
});
