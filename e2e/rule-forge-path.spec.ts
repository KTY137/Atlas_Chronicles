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

test("the forge path leads from the library to an own, tested and installed version", async ({ page: gm }) => {
  const errors: string[] = []; gm.on("pageerror", error => errors.push(error.message));
  await gm.context().addCookies([{ name: "chronicle_session", value: gmSession.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict", expires: Math.floor(gmSession.expiresAt / 1000) }]);
  await gm.goto(`${origin}/?campaign=${campaignId}&stage=schmiede&forge=rules`);
  // Kaya, 2026-09-23: „maximal unübersichtlich“. Die Werkstatt öffnet mit der Bibliothek: installierte
  // Versionen und die Vorlagen liegen offen, nicht über einer halb verdeckten Werkbank.
  await expect(gm.getByRole("region", { name: "Installierte Regelpakete", exact: true })).toBeVisible();
  await expect(gm.getByRole("button", { name: "Leeres Paket beginnen", exact: true })).toBeVisible();
  await expect(gm.getByRole("button", { name: "Als Regelentwurf öffnen", exact: true }).first()).toBeVisible();
  await expect(gm.getByRole("tablist", { name: "Regelpaket bearbeiten" })).toHaveCount(0);
  // Ein installiertes Paket öffnet sich zum Ansehen; die Übersicht liest das Paket in Alltagsworten.
  await gm.locator(".rf-catalog-item").first().click();
  await expect(gm.getByRole("region", { name: "Was dieses Regelwerk kann", exact: true })).toContainText("Würfel");
  await gm.getByRole("button", { name: "Zur Bibliothek", exact: true }).click();
  // Ein leeres Paket: die Statusleiste bietet genau einen nächsten Schritt an, und er führt zur Testtafel.
  await gm.getByRole("button", { name: "Leeres Paket beginnen", exact: true }).click();
  const tabs = gm.getByRole("tablist", { name: "Regelpaket bearbeiten" });
  for (const name of ["Paket", "Regelkarte", "Attribute", "Abgeleitete Werte", "Balken", "Listen", "Bogen", "Aktionen", "Fähigkeiten", "Zustände", "Bogenregeln", "Ausprobieren", "Migration", "Übernehmen"])
    await expect(tabs.getByRole("tab", { name, exact: true })).toBeVisible();
  await gm.getByRole("button", { name: "Weiter: Ausprobieren", exact: true }).click();
  await expect(gm.getByRole("heading", { name: /Testtafel/ })).toBeInViewport();
  await expect(gm.getByRole("button", { name: "Weiter: Ausprobieren", exact: true })).toHaveCount(0);
  // Der Weg mit seinen fünf Stationen steht dort, wo übernommen wird.
  await tabs.getByRole("tab", { name: "Übernehmen", exact: true }).click();
  const path = gm.getByRole("list", { name: "Der Weg zum eigenen Regelwerk", exact: true });
  const station = (name: string) => path.getByRole("listitem").filter({ has: gm.getByText(name, { exact: true }) });
  await expect(station("Grundlage wählen")).not.toHaveAttribute("aria-current", "step");
  await expect(station("Ausprobieren")).toHaveAttribute("aria-current", "step");
  await expect(gm.locator(".rf-publish-steps")).toContainText("legt diese Version unveränderlich in die Bibliothek");
  await expect(gm.locator(".rf-publish-steps")).toContainText("macht die geprüfte Version zum Regelwerk dieser Runde");
  const installed = gm.waitForResponse(r => r.url().endsWith("/rules") && r.request().method() === "POST");
  await gm.getByRole("button", { name: "Version installieren", exact: true }).click();
  expect((await installed).status()).toBe(200);
  await expect(station("Installieren")).not.toHaveAttribute("aria-current", "step");
  await expect(station("Für die Runde aktivieren")).toHaveAttribute("aria-current", "step");
  expect(errors).toEqual([]);
});

test("bars get their own section: one click adds life, the live bar follows the slider", async ({ page: gm }) => {
  const errors: string[] = []; gm.on("pageerror", error => errors.push(error.message));
  await gm.context().addCookies([{ name: "chronicle_session", value: gmSession.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict", expires: Math.floor(gmSession.expiresAt / 1000) }]);
  await gm.goto(`${origin}/?campaign=${campaignId}&stage=schmiede&forge=rules`);
  await gm.getByRole("button", { name: "Neues Paket", exact: true }).click();
  await gm.getByRole("tab", { name: "Balken", exact: true }).click();
  await gm.getByRole("group", { name: "Schnell anlegen" }).getByRole("button", { name: "Leben", exact: true }).click();
  const live = gm.getByRole("complementary", { name: "Live-Vorschau der Balken" });
  await expect(live.getByRole("meter", { name: "Leben" })).toHaveAttribute("aria-valuetext", "20 / 20");
  await live.getByRole("slider").fill("0");
  await expect(live.getByRole("meter", { name: "Leben" })).toHaveAttribute("aria-valuetext", "0 / 20");
  await expect(live).toContainText("Aufgebraucht — die Spielleitung kann die Niederlage bestätigen.");
  // Der neue Balken liegt ohne weiteres Zutun auf dem Bogen, und die Vorschau dort zeigt denselben Stand.
  await gm.getByRole("tab", { name: "Bogen", exact: true }).click();
  const sheet = gm.getByRole("complementary", { name: "Live-Vorschau des Bogens" });
  await expect(sheet.getByRole("meter", { name: "Leben" })).toHaveAttribute("aria-valuetext", "0 / 20");
  await expect(gm.locator(".rf-statusbar")).toContainText("Paketstruktur, Feldtypen und Formeln gültig.");
  expect(errors).toEqual([]);
});
