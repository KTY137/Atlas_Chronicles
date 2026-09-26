// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { CHRONICLE_HEROES_PACKAGE, CHRONICLE_ARCHETYPES } from "@chronicle/rules";
import { reviewApp } from "./helpers/review-app";
import { createActors } from "../packages/server/src/domain/actors.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";

let host: Awaited<ReturnType<typeof reviewApp>>;
test.beforeAll(async () => {
  host = await reviewApp(14100 + Math.floor(Math.random() * 200));
  const game = createGameplay(host.db), actors = createActors(host.db), pkg = CHRONICLE_HEROES_PACKAGE;
  await game.installPackage(host.gm.userId, host.campaign.id, pkg);
  await game.activatePackage(host.gm.userId, host.campaign.id, { packageId: pkg.id, packageVersion: pkg.version, expectedVersion: 0 });
  const template = await actors.createActorTemplate(host.gm.userId, host.campaign.id, { commandId: randomUUID(), definition: {
    schemaVersion: 1, name: "Archetyp", kind: "player_character", loreEntryId: null, package: { id: pkg.id, version: pkg.version }, fields: { ...CHRONICLE_ARCHETYPES[0]!.fields, name: "Mara" } } });
  await actors.instantiateActor(host.gm.userId, host.campaign.id, { commandId: randomUUID(), templateId: template.id, templateRevision: template.revision, name: "Mara" });
});
test.afterAll(async () => host?.close());

// 2026-09-26: Der neue Anlege-Weg baute seinen Entwurf bei jedem Zeichnen neu, und die Regelprüfung
// hing am Objekt statt am Inhalt — 27 Prüfungen in zehn Ruhesekunden, bis der Server die Spielleitung
// mit „Zu viele Anfragen“ aussperrte (240 je Minute). Im Ruhezustand fragt eine Ansicht höchstens die
// gewollten Abfragen ab (Szenen alle sechs Sekunden), keine Schleife.
test("keine Ansicht stellt im Ruhezustand eine Anfrageschleife", async ({ browser }) => {
  test.setTimeout(5 * 60_000);
  const context = await browser.newContext();
  await context.addCookies([{ name: "chronicle_session", value: host.gm.value, url: host.origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const page = await context.newPage();
  for (const [name, query] of [["heute", "stage=heute"], ["schmiede", "stage=schmiede"], ["figuren", "stage=schmiede&forge=actors"], ["regeln", "stage=schmiede&forge=rules"], ["tisch-figuren", "stage=tisch&tab=actors"], ["tisch-bogen", "stage=tisch&tab=sheet"], ["ich", "stage=ich"]] as const) {
    await page.goto(`${host.origin}/?campaign=${host.campaign.id}&${query}`);
    await page.waitForTimeout(4000);
    const counts = new Map<string, number>();
    const listener = (request: { url(): string }) => { const url = new URL(request.url()); if (url.pathname.startsWith("/api")) counts.set(url.pathname.replace(/[0-9a-f-]{36}/g, ":id"), (counts.get(url.pathname.replace(/[0-9a-f-]{36}/g, ":id")) ?? 0) + 1); };
    page.on("request", listener);
    await page.waitForTimeout(10_000);
    page.off("request", listener);
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    expect.soft(total, `${name}: ${[...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${v}×${k}`).join("  ")}`).toBeLessThanOrEqual(4);
  }
  await context.close();
});
