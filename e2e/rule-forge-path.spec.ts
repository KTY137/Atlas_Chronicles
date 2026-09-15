// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { buildApp } from "../packages/server/src/app.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";

// Kaya, 2026-09-15: „das Regelwerk-Erstellungssystem ist noch etwas undurchsichtig“. Der Wegweiser
// sagt an jeder Stelle, was als Nächstes kommt, und die Startvorlagen liegen offen.
const port = 9990 + Math.floor(Math.random() * 9), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string;
let gmSession: Awaited<ReturnType<ReturnType<typeof createIdentity>["issueSession"]>>;
test.beforeAll(async () => {
  db = await createTestDb(); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db);
  gmSession = await identity.bootstrap("Kaya Wegweiser");
  campaignId = (await campaigns.createCampaign(gmSession.userId, { name: "Der Weg zum Regelwerk" })).id;
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => { await app?.close(); await db?.close(); });

test("the forge path leads from an installed package to an own, tested and installed version", async ({ page: gm }) => {
  const errors: string[] = []; gm.on("pageerror", error => errors.push(error.message));
  await gm.context().addCookies([{ name: "chronicle_session", value: gmSession.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict", expires: Math.floor(gmSession.expiresAt / 1000) }]);
  await gm.goto(`${origin}/?campaign=${campaignId}&stage=schmiede&forge=rules`);
  const path = gm.getByRole("list", { name: "Der Weg zum eigenen Regelwerk", exact: true });
  const station = (name: string) => path.getByRole("listitem").filter({ has: gm.getByText(name, { exact: true }) });
  // An installed package is only viewed: the first station is up, the starters are open.
  await expect(station("Grundlage wählen")).toHaveAttribute("aria-current", "step");
  await expect(gm.locator("details.rf-starter")).toHaveAttribute("open", "");
  await expect(gm.getByRole("button", { name: "Leeres Paket beginnen", exact: true })).toBeVisible();
  await expect(gm.getByRole("button", { name: "Als Regelentwurf öffnen", exact: true }).first()).toBeVisible();
  // The capability card reads the package, in plain words.
  await expect(gm.getByRole("region", { name: "Was dieses Regelwerk kann", exact: true })).toContainText("Würfel");
  // Start an empty package: station one is done, station two is up and jumps to the attributes.
  await gm.getByRole("button", { name: "Leeres Paket beginnen", exact: true }).click();
  await expect(station("Grundlage wählen")).not.toHaveAttribute("aria-current", "step");
  await expect(station("Ausprobieren")).toHaveAttribute("aria-current", "step");
  await station("Ausprobieren").getByRole("button", { name: "Zur Testtafel", exact: true }).click();
  await expect(gm.getByRole("heading", { name: /Testtafel/ })).toBeInViewport();
  // The three verbs of the handover are explained where they happen.
  await expect(gm.locator(".rf-publish-steps")).toContainText("legt diese Version unveränderlich in die Bibliothek");
  await expect(gm.locator(".rf-publish-steps")).toContainText("macht die geprüfte Version zum Regelwerk dieser Runde");
  // Install the draft: station four turns done, station five is up.
  const installed = gm.waitForResponse(r => r.url().endsWith("/rules") && r.request().method() === "POST");
  await gm.getByRole("button", { name: "Version installieren", exact: true }).click();
  expect((await installed).status()).toBe(200);
  await expect(station("Installieren")).not.toHaveAttribute("aria-current", "step");
  await expect(station("Für die Runde aktivieren")).toHaveAttribute("aria-current", "step");
  expect(errors).toEqual([]);
});
