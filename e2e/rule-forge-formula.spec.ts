// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Atlas Chronicles contributors
import { test, expect, type BrowserContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { parseSupportedRulePackage, stableJson, HOW_TO_BE_A_HERO_PACKAGE } from "@chronicle/rules";
import type { ActionCard } from "../packages/client/src/features/game-api";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { buildApp } from "../packages/server/src/app.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";

const port = 9100 + Math.floor(Math.random() * 600), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string, actorId: string;
let gmSession: Awaited<ReturnType<ReturnType<typeof createIdentity>["issueSession"]>>, playerSession: typeof gmSession;
test.beforeAll(async () => {
  db = await createTestDb(); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db);
  gmSession = await identity.bootstrap("Kaya Schmiede");
  campaignId = (await campaigns.createCampaign(gmSession.userId, { name: "Regeln aus eigener Hand" })).id;
  const invitation = await campaigns.issueInvitation(gmSession.userId, campaignId);
  const joined = await campaigns.requestJoin(invitation.code, { displayName: "Sera Schmiede" });
  const approved = await campaigns.approveJoin(gmSession.userId, campaignId, joined.id); actorId = approved.actorId;
  const claimed = await campaigns.claimJoin(joined.id, joined.pollToken);
  playerSession = await identity.issueSession(claimed.userId);
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => { await app?.close(); await db?.close(); });
async function signIn(context: BrowserContext, session: typeof gmSession) {
  await context.addCookies([{ name: "chronicle_session", value: session.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict", expires: Math.floor(session.expiresAt / 1000) }]);
}

test("typing a formula with suggestions, plain errors, three views, install and roll", async ({ browser, page: gm }) => {
  const context = await browser.newContext(), player = await context.newPage(), errors: string[] = [];
  for (const page of [gm, player]) page.on("pageerror", error => errors.push(error.message));
  const base = `${origin}/api/campaigns/${campaignId}`, editor = gm.locator(".rf-editor-fields").first();
  try {
    await signIn(gm.context(), gmSession); await signIn(context, playerSession);
    await gm.goto(`${origin}/?campaign=${campaignId}&stage=schmiede&forge=rules`);
    await gm.getByRole("button", { name: "Neues Paket", exact: true }).click();
    await editor.getByRole("textbox", { name: /Paketkennung/ }).fill("de.nordlicht.formeln");
    await gm.getByRole("tab", { name: "Aktionen", exact: true }).click();
    const formula = editor.getByRole("combobox", { name: "Formel", exact: true }).first();
    await formula.fill("1d20 + @ins");
    const suggestions = gm.getByRole("listbox", { name: "Vorschläge" });
    await expect(suggestions.getByRole("option")).toHaveCount(1);
    await gm.keyboard.press("Enter");
    await expect(formula).toHaveValue("1d20 + @insight");
    await expect(editor.getByText(/^Beispiel für /)).toBeVisible();
    await formula.fill("1d20 + @insigt");
    await expect(editor.getByText("Das Attribut „insigt“ gibt es nicht. Meintest du „insight“?")).toBeVisible();
    await expect(gm.getByRole("button", { name: "Version installieren", exact: true })).toBeDisabled();
    await formula.fill("1d20 + @insight");
    await gm.getByRole("button", { name: "Bausteine", exact: true }).click();
    await expect(editor.getByRole("group", { name: "Ergebnis", exact: true }).getByRole("combobox", { name: "Rechenzeichen", exact: true })).toHaveValue("+");
    await editor.getByRole("group", { name: "Ergebnis", exact: true }).getByRole("combobox", { name: "Rechenzeichen", exact: true }).selectOption("*");
    await expect(formula).toHaveValue("1d20 * @insight");
    await gm.getByRole("button", { name: "Knoten", exact: true }).click();
    const graphGroup = gm.getByRole("group", { name: "Formel als Knotennetz", exact: true });
    await expect(graphGroup.getByRole("button", { name: /Geschick|insight|Scharfsinn/ })).toBeVisible();
    // A stale drag (finding 1): start dragging from the attribute node's port, release far outside
    // the graph (not on any node), then click a node. Without the pointer-capture fix this leaves
    // `dragging` set and the click above silently runs moveSubtree, rewriting the formula.
    const dragPort = graphGroup.getByRole("button", { name: /insight|Scharfsinn/ }).locator(".ff-port-out");
    const portBox = await dragPort.boundingBox();
    if (!portBox) throw new Error("drag port not found");
    await gm.mouse.move(portBox.x + portBox.width / 2, portBox.y + portBox.height / 2);
    await gm.mouse.down();
    await gm.mouse.move(4, 4);
    await gm.mouse.up();
    await graphGroup.getByRole("button", { name: /Rechnung$/ }).click();
    await expect(formula).toHaveValue("1d20 * @insight");
    await gm.getByRole("button", { name: "Zeile", exact: true }).click();
    // The coloured overlay must scroll together with the input once the formula is wider than the
    // field (finding 2); otherwise typing continues at what still looks like the start.
    await formula.fill("1d20 + @insight + @insight + @insight + @insight + @insight + @insight + @insight");
    await formula.press("End");
    await expect.poll(() => editor.evaluate(container => container.querySelector<HTMLInputElement>(".ff-line-input")!.scrollLeft)).toBeGreaterThan(0);
    const [inputScroll, overlayScroll] = await editor.evaluate(container => {
      const input = container.querySelector<HTMLInputElement>(".ff-line-input")!, overlay = container.querySelector<HTMLElement>(".ff-line-overlay")!;
      return [input.scrollLeft, overlay.scrollLeft];
    });
    expect(overlayScroll).toBe(inputScroll);
    await formula.fill("1d20 + @insight");
    const install = gm.waitForResponse(r => r.url() === `${base}/rules` && r.request().method() === "POST");
    await gm.getByRole("button", { name: "Version installieren", exact: true }).click(); expect((await install).status()).toBe(200);
    const preview = gm.waitForResponse(r => r.url() === `${base}/rules/preview` && r.request().method() === "POST");
    await gm.getByRole("button", { name: "Aktivierung prüfen", exact: true }).click(); expect((await preview).status()).toBe(200);
    const activate = gm.waitForResponse(r => r.url() === `${base}/rules/activate` && r.request().method() === "POST");
    await gm.getByRole("button", { name: "Geprüfte Version für diese Runde aktivieren", exact: true }).click(); expect((await activate).status()).toBe(200);
    await player.goto(`${origin}/?campaign=${campaignId}&stage=tisch`);
    await player.getByRole("tab", { name: "Aktionen", exact: true }).click();
    const rolled = player.waitForResponse(r => r.url() === `${base}/rolls` && r.request().method() === "POST");
    await player.getByRole("button", { name: "Würfeln", exact: true }).click();
    const roll = await (await rolled).json() as ActionCard;
    expect(roll.receipt.expression).toBe("1d20 + actor.insight");
    await gm.setViewportSize({ width: 390, height: 844 });
    await expect(formula).toBeVisible();
    expect(await gm.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test("opening the HTBAH template shows sugar and downloads the package byte for byte", async ({ page: gm }) => {
  await signIn(gm.context(), gmSession);
  await gm.goto(`${origin}/?campaign=${campaignId}&stage=schmiede&forge=rules`);
  await gm.getByRole("button", { name: "HTBAH-Vorlage anpassen" }).click();
  await gm.getByRole("button", { name: "HTBAH als Regelentwurf öffnen" }).click();
  await gm.getByRole("tab", { name: "Aktionen", exact: true }).click();
  await gm.getByRole("button", { name: /Initiative/ }).click();
  await expect(gm.locator(".rf-editor-fields").first().getByRole("combobox", { name: "Formel", exact: true }).first()).toHaveValue(/^1d10 \+ /);
  const downloadPromise = gm.waitForEvent("download");
  await gm.getByRole("button", { name: "Paketdatei", exact: true }).click();
  const downloaded = parseSupportedRulePackage(await readFile((await (await downloadPromise).path())!, "utf8"));
  expect(stableJson(downloaded)).toBe(stableJson(HOW_TO_BE_A_HERO_PACKAGE));
});
