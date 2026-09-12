// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { _electron as electron, chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Uses the compiled desktop and its managed PostgreSQL, with an isolated OS-encrypted profile.
// An external browser joins through the real adapter address; no profile cookies are injected.
const root = fileURLToPath(new URL("../../../", import.meta.url));
const address = process.env.CHRONICLE_TEST_LAN_IP;
assert(address && Object.values(networkInterfaces()).flat().some(adapter => adapter?.family === "IPv4" && !adapter.internal && adapter.address === address), "Set CHRONICLE_TEST_LAN_IP to a current private LAN adapter address.");
const profiles = join(root, ".local/desktop-profiles"); await mkdir(profiles, { recursive: true });
const run = await mkdtemp(join(profiles, "lan-"));
const evidence = { schema: "chronicle-desktop-lan-smoke/1", startedAt: new Date().toISOString(), address, run,
  version: JSON.parse(await readFile(join(root, "packages/desktop/package.json"), "utf8")).version, checks: [], secondPhysicalComputer: false };
let application, browser, manager, origin;
const record = name => { evidence.checks.push(name); console.log(`PASS ${name}`); };
async function invoke(request) {
  const reply = await manager.evaluate(request => window.chronicleDesktop.invoke(request), request);
  assert.equal(reply.ok, true, reply.error); return reply.value;
}
async function identity(page) { return page.evaluate(async () => { const response = await fetch("/api/me"); return { status: response.status, data: await response.json() }; }); }
try {
  application = await electron.launch({ executablePath: join(root, "node_modules/electron/dist/electron.exe"),
    args: [join(root, "packages/desktop/dist"), `--user-data=${join(run, "user-data")}`], timeout: 90_000,
    env: Object.fromEntries(Object.entries(process.env).filter(([name]) => !["ELECTRON_RUN_AS_NODE", "NODE_OPTIONS", "DATABASE_URL", "COOKIE_SECRET", "CHRONICLE_CHRONIST_CONFIG"].includes(name))) });
  manager = await application.firstWindow(); manager.setDefaultTimeout(45_000);
  await manager.waitForURL("chronicle-shell://app/index.html");
  await manager.locator(`#netzwerk-adresse option[value="${address}"]`).waitFor({ state: "attached" });
  await manager.locator("#netzwerk-adresse").selectOption(address);
  await manager.locator("#profile-name").fill("LAN Smoke Testwelt");
  await manager.getByRole("button", { name: "Welt anlegen", exact: true }).click();
  let lastStage;
  await expect.poll(async () => {
    const status = await invoke({ kind: "status" });
    if (status.state !== lastStage) { lastStage = status.state; console.log(`Desktop startup: ${status.state}`); }
    if (status.state === "failed" && !status.busy) throw new Error(status.failure ?? "Desktop startup failed.");
    return status.state === "ready" && !status.busy;
  }, { timeout: 240_000, intervals: [1500] }).toBe(true);
  await manager.locator("#gm-name").fill("LAN Smoke Spielleitung");
  const opened = application.waitForEvent("window", { timeout: 90_000 });
  await manager.getByRole("button", { name: "Spielleitung einrichten", exact: true }).click();
  const game = await opened; game.setDefaultTimeout(45_000);
  const state = await invoke({ kind: "status" }); origin = state.origin;
  assert.equal(new URL(origin).hostname, address); evidence.origin = origin;
  await game.waitForURL(`${origin}/**`);
  await expect.poll(async () => (await identity(game)).status).toBe(200);
  record("LAN world starts through manager, private worker and managed PostgreSQL");
  assert.equal(await game.evaluate(() => isSecureContext), false);
  assert.match(await game.evaluate(() => crypto.randomUUID()), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  record("Desktop first-login cookie and secure UUID generation work over HTTP LAN");
  await manager.locator("#runde-name").fill("LAN Smoke Runde");
  await manager.getByRole("button", { name: "Runde anlegen", exact: true }).click();
  await manager.locator("#zugang-einladung").click();
  await expect(manager.locator("#zugang-link")).toHaveValue(/\?join=.+/);
  const invitation = await manager.locator("#zugang-link").inputValue();
  assert.equal(new URL(invitation).origin, origin); assert(new URL(invitation).searchParams.get("join"));
  await expect(manager.locator("#zugang-reichweite")).toContainText(origin);
  record("Manager publishes the selected LAN address in invitation and reachability text");
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge", headless: true });
  const context = await browser.newContext({ locale: "de-DE" }), player = await context.newPage();
  await player.goto(invitation);
  await player.getByLabel("Dein Name in der Runde").fill("LAN Smoke Spieler");
  await player.getByRole("button", { name: "Beitritt anfragen" }).click();
  await manager.bringToFront();
  await manager.getByRole("button", { name: "Freigeben", exact: true }).click({ timeout: 45_000 });
  await player.getByRole("button", { name: "Die Runde betreten" }).click();
  await expect.poll(async () => (await identity(player)).status).toBe(200);
  const guest = (await identity(player)).data;
  assert.notEqual(guest.userId, (await identity(game)).data.userId);
  const cookie = (await context.cookies(origin)).find(cookie => cookie.name === "chronicle_session");
  assert(cookie?.httpOnly && !cookie.secure && cookie.sameSite === "Strict");
  await player.reload(); assert.equal((await identity(player)).data.userId, guest.userId);
  record("External Edge browser joins after manager approval and keeps its real LAN cookie on reload");
  await assert.rejects(fetch(`http://127.0.0.1:${new URL(origin).port}/api/health`, { signal: AbortSignal.timeout(3000) }));
  record("LAN listener is bound to the chosen adapter address, not all interfaces or loopback");
  await context.close();
  await invoke({ kind: "stop" });
  await assert.rejects(fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(3000) }));
  assert.equal((await invoke({ kind: "status" })).state, "stopped");
  record("Orderly stop releases the LAN listener and managed world");
} catch (error) {
  evidence.failure = error instanceof Error ? error.message : String(error);
  console.error(evidence.failure); process.exitCode = 1;
  if (manager && !manager.isClosed()) {
    const status = await invoke({ kind: "status" }).catch(() => undefined);
    if (status) evidence.failureState = { state: status.state, busy: status.busy, failure: status.failure };
    await manager.screenshot({ path: join(run, "manager-failure.png"), fullPage: true }).catch(() => undefined);
  }
} finally {
  evidence.finishedAt = new Date().toISOString();
  await writeFile(join(run, "evidence.json"), JSON.stringify(evidence, null, 2));
  await browser?.close();
  if (manager && !manager.isClosed()) {
    try {
      await expect.poll(async () => (await invoke({ kind: "status" })).busy, { timeout: 180_000, intervals: [1500] }).toBe(false);
      if ((await invoke({ kind: "status" })).state !== "stopped") await invoke({ kind: "stop" });
      await manager.close();
    }
    catch (error) { console.error(`Host cleanup not confirmed: ${error.message}`); process.exitCode = 1; }
  }
  await application?.close();
  console.log(`LAN smoke evidence: ${join(run, "evidence.json")}`);
}
