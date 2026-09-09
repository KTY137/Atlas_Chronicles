import { test, expect, type BrowserContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { parseSupportedRulePackage, evaluateComputedFields } from "@chronicle/rules";
import { parseCurrentCampaignBundle } from "@chronicle/io";
import type { ActionCard } from "../packages/client/src/features/game-api";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { buildApp } from "../packages/server/src/app.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";

const port = 8100 + Math.floor(Math.random() * 600), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId: string, actorId: string;
let gmSession: Awaited<ReturnType<ReturnType<typeof createIdentity>["issueSession"]>>, playerSession: typeof gmSession;
test.beforeAll(async () => {
  db = await createTestDb(); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db);
  gmSession = await identity.bootstrap("Kaya HTBAH");
  campaignId = (await campaigns.createCampaign(gmSession.userId, { name: "Helden aus eigener Hand" })).id;
  const invitation = await campaigns.issueInvitation(gmSession.userId, campaignId);
  const joined = await campaigns.requestJoin(invitation.code, { displayName: "Mara am Tisch" });
  actorId = (await campaigns.approveJoin(gmSession.userId, campaignId, joined.id)).actorId;
  playerSession = await identity.issueSession((await campaigns.claimJoin(joined.id, joined.pollToken)).userId);
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => { await app?.close(); await db?.close(); });
async function signIn(context: BrowserContext, session: typeof gmSession) {
  await context.addCookies([{ name: "chronicle_session", value: session.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict", expires: Math.floor(session.expiresAt / 1000) }]);
}

test("HTBAH catalogue, computed sheet, classified rolls and v5 export survive host reopen", async ({ browser, page: gm }, info) => {
  const context = await browser.newContext(), player = await context.newPage(), errors: string[] = [];
  for (const page of [gm, player]) page.on("pageerror", error => errors.push(error.message));
  const base = `${origin}/api/campaigns/${campaignId}`, sheetUrl = `${base}/actors/${actorId}/sheet`;
  const sheet = async () => (await player.request.get(sheetUrl)).json();
  const saveSheet = async () => {
    const response = player.waitForResponse(r => r.url() === sheetUrl && r.request().method() === "PUT");
    await player.getByRole("button", { name: "Bogen speichern", exact: true }).click();
    expect((await response).status()).toBe(200);
  };
  const prepare = async (actionId: string) => {
    await player.locator(".action-form").getByRole("combobox", { name: "Aktion", exact: true }).selectOption(actionId);
    const response = player.waitForResponse(r => r.url() === `${base}/rolls` && r.request().method() === "POST");
    await player.getByRole("button", { name: "Würfeln", exact: true }).click();
    const result = await response; expect(result.status()).toBe(200); return result.json() as Promise<ActionCard>;
  };
  try {
    await signIn(gm.context(), gmSession); await signIn(context, playerSession);
    await gm.goto(`${origin}/?campaign=${campaignId}&stage=schmiede&forge=rules`);
    const template = gm.getByRole("region", { name: "How to be a Hero Vorlage" });
    await template.getByRole("button", { name: "HTBAH-Vorlage anpassen" }).click();
    await template.getByRole("group", { name: "Fertigkeit 1", exact: true }).getByLabel("Name", { exact: true }).fill("Klettern und Kraxeln");
    await template.getByRole("button", { name: "HTBAH als Regelentwurf öffnen" }).click();
    const preview = gm.locator(".rf-preview");
    await preview.getByRole("button", { name: "HTBAH-Beispielfiguren laden" }).click();
    const mara = preview.getByRole("article", { name: "Testfigur Mara Morgenwind" });
    await expect(mara).toContainText("Das vereinbarte Punktebudget ist vollständig verteilt.");
    await expect(mara.locator(".rf-fixture-result")).toContainText("Gelungen");

    await gm.getByRole("tab", { name: "Abgeleitet", exact: true }).click();
    const computed = gm.locator(".rf-editor-fields").getByRole("group", { name: "Begabung · Handeln", exact: true });
    await computed.getByLabel("Beschriftung", { exact: true }).fill("Handeln · Begabung");
    const downloadPromise = gm.waitForEvent("download");
    await gm.getByRole("button", { name: "Paketdatei", exact: true }).click();
    const downloaded = parseSupportedRulePackage(await readFile((await (await downloadPromise).path())!, "utf8"));
    expect(downloaded.schemaVersion).toBe(2);
    expect(downloaded.fields.skill_klettern!.label).toBe("Klettern und Kraxeln · Rohpunkte");
    if (downloaded.schemaVersion !== 2) throw new Error("Expected extended package");
    expect(downloaded.attribution?.sources[0]?.url).toContain("howtobeahero.de");
    expect(downloaded.computed?.[0]?.label).toBe("Handeln · Begabung");
    for (const [suffix, button] of [["/rules/preview", "Aktivierung prüfen"], ["/rules", "Version installieren"], ["/rules/activate", "Geprüfte Version für diese Runde aktivieren"]]) {
      const response = gm.waitForResponse(r => r.url() === `${base}${suffix}` && r.request().method() === "POST");
      await gm.getByRole("button", { name: button!, exact: true }).click(); expect((await response).status()).toBe(200);
    }
    await expect(gm.locator(".rf-publish")).toContainText("Diese Paketversion ist bereits aktiv.");

    await player.goto(`${origin}/?campaign=${campaignId}&stage=tisch`);
    await expect(player.getByRole("button", { name: "Schmiede", exact: true })).toHaveCount(0);
    await player.getByRole("tab", { name: "Figur", exact: true }).click();
    await player.getByRole("button", { name: "Mara Morgenwind als Beispiel übernehmen" }).click();
    await player.getByLabel("Notizen / Absprachen", { exact: true }).fill("");
    await saveSheet();
    expect(await sheet()).toMatchObject({ version: 1, fields: { hp: 100, notes: "", skill_klettern: 65 }, defeatPending: false });
    const raw = player.getByLabel("Klettern und Kraxeln · Rohpunkte", { exact: true });
    await raw.fill("100"); await expect(player.getByRole("button", { name: "Bogen speichern", exact: true })).toBeDisabled();
    await expect(player.getByRole("alert")).toContainText("effektiver Wert über 100");
    await raw.fill("65");
    await player.getByRole("button", { name: "Geistesblitz einsetzen · Handeln", exact: true }).click();
    expect((await sheet()).fields.gbp_spent_handeln).toBe(0); // Explicit draft; no hidden expenditure.
    await saveSheet();
    expect((await sheet()).fields.gbp_spent_handeln).toBe(1);
    expect(evaluateComputedFields(downloaded, (await sheet()).fields).gbp_remaining_handeln).toBe(1);
    await player.getByRole("spinbutton", { name: "Lebenspunkte", exact: true }).fill("9");
    await expect(player.getByRole("status").filter({ hasText: "Unter 10 Lebenspunkten" })).toBeVisible();
    await saveSheet(); expect(await sheet()).toMatchObject({ version: 3, fields: { hp: 9 }, defeatPending: false, defeatedAt: null });
    await player.screenshot({ path: info.outputPath("htbah-sheet-desktop.png"), fullPage: true });

    await player.getByRole("tab", { name: "Aktionen", exact: true }).click();
    const roll = await prepare("skill_klettern");
    expect(roll.receipt.schemaVersion).toBe(2);
    if (roll.receipt.schemaVersion !== 2) throw new Error("Expected extended receipt");
    expect(roll.receipt.outcome).toBeDefined(); expect(roll.receipt.dice).toHaveLength(1);
    expect(roll.receipt.total).toBeGreaterThanOrEqual(1); expect(roll.receipt.total).toBeLessThanOrEqual(100);
    const card = player.locator(".roll-card").filter({ has: player.getByRole("heading", { name: "skill_klettern", exact: true }) });
    await expect(card.getByRole("status")).toHaveText(roll.receipt.outcome!.label);
    await card.getByRole("button", { name: "Ergebnis bestätigen", exact: true }).click();
    await expect(card).toContainText("Bestätigt");
    await card.getByRole("button", { name: "Nachrechnen", exact: true }).click();
    await expect(card).toContainText("Nachgerechnet: Würfel, Regelversion und Beleg stimmen überein.");
    await player.locator(".action-form").getByRole("combobox", { name: "Aktion", exact: true }).selectOption("damage");
    await player.getByLabel("Anzahl W10", { exact: true }).fill("2");
    await player.getByLabel("Abgesprochener Schadensbonus", { exact: true }).fill("3");
    await player.getByLabel("Kritischer Angriff", { exact: true }).check();
    // Keep the edited action input; selecting an action again intentionally resets it.
    const damageResponse = player.waitForResponse(r => r.url() === `${base}/rolls` && r.request().method() === "POST");
    await player.getByRole("button", { name: "Würfeln", exact: true }).click();
    const damage = await (await damageResponse).json() as ActionCard;
    expect(damage.receipt.total).toBe((damage.receipt.dice[0]!.total + 3) * 2);
    expect((await sheet()).fields.hp).toBe(9); // Damage receipt never silently changes HP.
    const bundleResponse = await gm.request.get(`${base}/export`); expect(bundleResponse.status()).toBe(200);
    const bundle = parseCurrentCampaignBundle(await bundleResponse.text()); expect(bundle.version).toBe(5);
    expect(JSON.stringify(bundle.tables)).toContain("CC-BY-NC-SA-4.0");
    expect(JSON.stringify(bundle.tables)).toContain(roll.receiptHash);

    await app.close(); app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
    await player.reload();
    await expect(player.locator(".roll-card").filter({ hasText: "skill_klettern" })).toContainText("Bestätigt");
    expect((await (await player.request.get(`${base}/rolls/${roll.id}/replay`)).json()).valid).toBe(true);
    await player.getByRole("tab", { name: "Figur", exact: true }).click();
    await expect(player.getByRole("spinbutton", { name: "Lebenspunkte", exact: true })).toHaveValue("9");
    await player.setViewportSize({ width: 390, height: 844 });
    expect(await player.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await player.screenshot({ path: info.outputPath("htbah-sheet-mobile.png"), fullPage: true });
    await gm.setViewportSize({ width: 390, height: 844 });
    expect(await gm.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await gm.screenshot({ path: info.outputPath("htbah-forge-mobile.png"), fullPage: true });
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
