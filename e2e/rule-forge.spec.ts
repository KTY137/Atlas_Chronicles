import { test, expect, type BrowserContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { parseRulePackage } from "@chronicle/rules";
import type { ActionCard } from "../packages/client/src/features/game-api";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { buildApp } from "../packages/server/src/app.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";

const port = 7100 + Math.floor(Math.random() * 700), origin = `http://localhost:${port}`;
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

test("visual package authoring, live play and reviewed migration preserve player drafts", async ({ browser, page: gm }) => {
  const context = await browser.newContext(), player = await context.newPage(), errors: string[] = [];
  for (const page of [gm, player]) page.on("pageerror", error => errors.push(error.message));
  const base = `${origin}/api/campaigns/${campaignId}`, packageId = "de.nordlicht.regeln";
  const editor = gm.locator(".rf-editor-fields");
  const preview = async () => {
    const response = gm.waitForResponse(r => r.url() === `${base}/rules/preview` && r.request().method() === "POST");
    await gm.getByRole("button", { name: "Aktivierung prüfen", exact: true }).click();
    expect((await response).status()).toBe(200);
  };
  const install = async () => {
    const response = gm.waitForResponse(r => r.url() === `${base}/rules` && r.request().method() === "POST");
    await gm.getByRole("button", { name: "Version installieren", exact: true }).click();
    expect((await response).status()).toBe(200);
  };
  const activate = async (status = 200) => {
    const response = gm.waitForResponse(r => r.url() === `${base}/rules/activate` && r.request().method() === "POST");
    await gm.getByRole("button", { name: "Geprüfte Version für diese Runde aktivieren", exact: true }).click();
    expect((await response).status()).toBe(status);
  };
  try {
    await signIn(gm.context(), gmSession); await signIn(context, playerSession);
    await gm.goto(`${origin}/?campaign=${campaignId}&stage=schmiede`);
    await gm.getByRole("button", { name: "Neues Paket", exact: true }).click();
    await editor.getByRole("textbox", { name: "Name", exact: true }).fill("Nordlicht");
    await editor.getByRole("textbox", { name: /Paketkennung/ }).fill(packageId);
    await gm.getByRole("tab", { name: "Felder", exact: true }).click();
    const insight = editor.locator(".rf-card").filter({ has: gm.getByRole("heading", { name: "Scharfsinn", exact: true }) });
    await insight.getByLabel("Vorgabewert", { exact: true }).fill("3");
    await insight.getByLabel("Bezeichnung", { exact: true }).fill("Wachsamkeit");
    await gm.getByRole("tab", { name: "Bogen", exact: true }).click();
    await editor.getByLabel("Titel", { exact: true }).fill("Erkundung");
    await gm.getByRole("tab", { name: "Aktionen", exact: true }).click();
    await editor.getByRole("button", { name: "Aktion", exact: true }).click();
    await editor.getByLabel("Name", { exact: true }).fill("Nordlichtprobe");
    await editor.getByLabel("Aktionskennung", { exact: true }).fill("explore");
    await editor.getByLabel("Feste Erfolgsschwelle verwenden").check();
    await editor.getByLabel("Erfolg ab Ergebnis").fill("1");
    const formula = editor.locator(".rf-formula");
    await formula.getByRole("combobox", { name: "Baustein", exact: true }).selectOption("binary");
    const left = formula.getByRole("group", { name: "Linker Wert", exact: true });
    const right = formula.getByRole("group", { name: "Rechter Wert", exact: true });
    await left.getByRole("combobox", { name: "Baustein", exact: true }).selectOption("dice");
    await left.getByLabel("Würfelseiten", { exact: true }).fill("6");
    await right.getByRole("combobox", { name: "Baustein", exact: true }).selectOption("actor");
    await right.getByRole("combobox", { name: "Charakterfeld", exact: true }).selectOption("insight");
    await gm.locator(".rf-preview").getByRole("combobox", { name: "Aktion", exact: true }).selectOption("explore");
    await expect(gm.locator(".rf-preview")).toContainText("Nordlichtprobe");
    const downloadPromise = gm.waitForEvent("download");
    await gm.getByRole("button", { name: "Paketdatei", exact: true }).click();
    const download = await downloadPromise, downloaded = parseRulePackage(await readFile((await download.path())!, "utf8"));
    expect(downloaded.id).toBe(packageId); expect(downloaded.fields.insight!.label).toBe("Wachsamkeit");
    expect(downloaded.actions.find(action => action.id === "explore")!.expression).toContain("actor.insight");
    await preview(); await install(); await activate();
    await expect(gm.locator(".rf-publish")).toContainText("Diese Paketversion ist bereits aktiv.");

    await player.goto(`${origin}/?campaign=${campaignId}&stage=tisch`);
    await expect(player.getByRole("button", { name: "Schmiede", exact: true })).toHaveCount(0);
    await player.getByRole("tab", { name: "Figur", exact: true }).click();
    await expect(player.getByLabel("Wachsamkeit", { exact: true })).toHaveValue("3");
    await expect(player.getByRole("group", { name: "Erkundung", exact: true })).toBeVisible();
    await player.getByLabel("Wachsamkeit", { exact: true }).fill("4");
    await player.getByRole("button", { name: "Bogen speichern", exact: true }).click();
    await expect.poll(async () => (await (await player.request.get(`${base}/actors/${actorId}/sheet`)).json()).version).toBe(1);
    await player.getByRole("tab", { name: "Aktionen", exact: true }).click();
    await player.getByRole("combobox", { name: "Aktion", exact: true }).selectOption("explore");
    const prepared = player.waitForResponse(r => r.url() === `${base}/rolls` && r.request().method() === "POST");
    await player.getByRole("button", { name: "Würfeln", exact: true }).click();
    const rolled = await prepared; expect(rolled.status()).toBe(200); const roll = await rolled.json() as ActionCard;
    expect(roll.receipt.package).toEqual({ id: packageId, version: "1.0.0" });
    expect(roll.receipt.total).toBeGreaterThanOrEqual(5); expect(roll.receipt.total).toBeLessThanOrEqual(10);
    expect(roll.receipt.dice).toHaveLength(1);

    await gm.getByRole("button", { name: "Neue Version erstellen", exact: true }).click();
    await editor.getByLabel("Version", { exact: true }).fill("1.1.0");
    await gm.getByRole("tab", { name: "Migration", exact: true }).click();
    await expect(editor.getByRole("combobox", { name: "Ausgangsversion", exact: true })).toHaveValue("1.0.0");
    await preview(); await install();
    await gm.getByRole("checkbox", { name: "Ich habe die Feldänderungen und archivierten Werte geprüft.", exact: true }).check();
    await player.getByRole("tab", { name: "Figur", exact: true }).click();
    await player.getByLabel("Wachsamkeit", { exact: true }).fill("5");
    const saved = player.waitForResponse(r => r.url() === `${base}/actors/${actorId}/sheet` && r.request().method() === "PUT");
    await player.getByRole("button", { name: "Bogen speichern", exact: true }).click(); expect((await saved).status()).toBe(200);
    await player.getByLabel("Wachsamkeit", { exact: true }).fill("6");
    await context.setOffline(true);
    await player.getByRole("button", { name: "Tisch aktualisieren", exact: true }).click();
    await expect(player.getByRole("alert").first()).toBeVisible();
    await expect(player.getByLabel("Wachsamkeit", { exact: true })).toHaveValue("6");
    await context.setOffline(false);
    await player.getByRole("button", { name: "Tisch aktualisieren", exact: true }).click();
    await activate(409); await expect(gm.getByRole("alert")).toContainText("seit der Vorschau verändert");
    await preview(); await gm.getByRole("checkbox", { name: "Ich habe die Feldänderungen und archivierten Werte geprüft.", exact: true }).check(); await activate();
    await expect(player.getByRole("button", { name: "Aktuellen Bogen übernehmen", exact: true })).toBeVisible();
    await expect(player.getByLabel("Wachsamkeit", { exact: true })).toHaveValue("6");
    player.once("dialog", dialog => dialog.accept());
    await player.getByRole("button", { name: "Aktuellen Bogen übernehmen", exact: true }).click();
    await expect(player.getByLabel("Wachsamkeit", { exact: true })).toHaveValue("5");
    expect((await (await player.request.get(`${base}/rolls/${roll.id}/replay`)).json()).valid).toBe(true);
    expect((await (await player.request.get(`${base}/rolls/${roll.id}`)).json()).receipt).toEqual(roll.receipt);
    await gm.setViewportSize({ width: 390, height: 844 });
    expect(await gm.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  } finally { await context.setOffline(false); await context.close(); }
});
