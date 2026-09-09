// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Atlas Chronicles contributors
import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { buildApp } from "../packages/server/src/app.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";

const port = 9800 + Math.floor(Math.random() * 190), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string;
let gmSession: Awaited<ReturnType<ReturnType<typeof createIdentity>["issueSession"]>>;
test.beforeAll(async () => {
  db = await createTestDb(); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db);
  gmSession = await identity.bootstrap("Kaya Schmiede");
  campaignId = (await campaigns.createCampaign(gmSession.userId, { name: "Regeln als Karte" })).id;
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => { await app?.close(); await db?.close(); });

test("the rule map shows the package as one picture, edits a formula at the node and embeds node nets", async ({ page: gm }) => {
  const errors: string[] = []; gm.on("pageerror", error => errors.push(error.message));
  await gm.context().addCookies([{ name: "chronicle_session", value: gmSession.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict", expires: Math.floor(gmSession.expiresAt / 1000) }]);
  await gm.goto(`${origin}/?campaign=${campaignId}&stage=schmiede&forge=rules`);
  await gm.getByRole("button", { name: "Neues Paket", exact: true }).click();
  const editor = gm.locator(".rf-editor-fields").first();
  await gm.getByRole("tab", { name: "Regelkarte", exact: true }).click();
  // Overview: the character as one card, the starter action listed as a method with its formula.
  const overview = gm.getByRole("article", { name: "Die Figur als Karte" });
  await expect(overview.getByRole("button", { name: /^Erste Aktion/ })).toBeVisible();
  await expect(overview.getByText("() → 1d20 + @insight")).toBeVisible();
  // Kraft is a number nobody uses yet: one plain finding, pointing at the node.
  const issues = gm.locator(".rm-issues");
  await expect(issues.getByText(/Hinweis/)).toBeVisible();
  await issues.locator("summary").click(); // hints stay folded until asked; only errors open by themselves
  await issues.getByRole("button", { name: /Kraft/ }).click();
  await expect(gm.getByRole("region", { name: "Bearbeiten: Kraft" })).toContainText("Wird in keiner Formel benutzt.");
  // Edit the action's formula right at the node; the Actions tab must show the same line.
  await overview.getByRole("button", { name: /^Erste Aktion/ }).click();
  const panel = gm.getByRole("region", { name: "Bearbeiten: Erste Aktion" });
  const formula = panel.getByRole("combobox", { name: "Formel", exact: true }).first();
  await expect(formula).toHaveValue("1d20 + @insight");
  await formula.fill("1d20 + @insight + @vigour");
  await expect(panel.getByText(/^Beispiel für /)).toBeVisible();
  await gm.getByRole("tab", { name: "Aktionen", exact: true }).click();
  await expect(editor.getByRole("combobox", { name: "Formel", exact: true }).first()).toHaveValue("1d20 + @insight + @vigour");
  await gm.getByRole("tab", { name: "Regelkarte", exact: true }).click();
  // Kraft is used now: the finding is gone.
  await expect(gm.locator(".rm-issues")).toHaveCount(0);
  // Map: four columns, one button per node, neighbours light up on selection.
  await gm.getByRole("button", { name: "Karte", exact: true }).click();
  const map = gm.getByRole("group", { name: "Regelkarte", exact: true });
  for (const column of ["Attribute", "Abgeleitet", "Regeln und Balken", "Aktionen"]) await expect(map.getByText(column, { exact: true })).toBeVisible();
  await map.getByRole("button", { name: "Kraft, Attribut", exact: true }).click();
  await expect(gm.getByRole("region", { name: "Bearbeiten: Kraft" }).getByRole("button", { name: /^Erste Aktion/ })).toBeVisible();
  await expect(map.locator('[data-node-id="action:erste-aktion"]')).not.toHaveClass(/is-dim/);
  await expect(map.locator('[data-node-id="attribute:name"]')).toHaveClass(/is-dim/);
  await gm.keyboard.press("Escape");
  await expect(gm.getByRole("region", { name: /^Bearbeiten: / })).toHaveCount(0);
  // Network: every formula sits inside its node as a small node net.
  await gm.getByRole("button", { name: "Knotennetz", exact: true }).click();
  const network = gm.getByRole("group", { name: "Regelkarte mit Knotennetzen", exact: true });
  await expect(network.getByRole("group", { name: "Formel als Knotennetz" }).first()).toBeVisible();
  await expect(network.locator('[data-node-id="action:erste-aktion"]').getByRole("button", { name: /Kraft/ })).toBeVisible();
  // The jump into the full editor of an action.
  await network.getByRole("button", { name: "Erste Aktion, Aktion", exact: true }).click();
  await gm.getByRole("button", { name: "Im Reiter Aktionen öffnen", exact: true }).click();
  await expect(gm.getByRole("tab", { name: "Aktionen", exact: true })).toHaveAttribute("aria-selected", "true");
  // Narrow screen: the page never scrolls sideways; the drawing scrolls in its own frame.
  await gm.getByRole("tab", { name: "Regelkarte", exact: true }).click();
  await gm.setViewportSize({ width: 390, height: 844 });
  await expect(gm.getByRole("tabpanel", { name: "Regelkarte" }).getByRole("button", { name: "Übersicht", exact: true })).toBeVisible();
  expect(await gm.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
