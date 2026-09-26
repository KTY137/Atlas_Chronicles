// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Neulingsgang (Spec 2026-09-26 „Zugänglich und schön“, Hauptziel; Plan Task 3 Step 1b).
// Kaya, 2026-09-26: „ein dummer nutzer der dass system nicht kennt damit umgehen kann bzw schnell
// weiß wie es geht“. Die drei Aufgaben des Hauptziels auf einer frisch angelegten Runde, nur über
// sichtbare Beschriftungen und Rollen: keine Testkennungen, keine URL-Sprünge nach dem Einstieg.
//  1. Spielleitung: eigenes Regelwerk anlegen, ausprobieren, für die Runde aktivieren.
//  2. Spielleitung: eine Figur für die Runde anlegen, dem einen hervorgehobenen Knopf folgend.
//  3. Spieler: eine Figur beantragen; die Spielleitung gibt frei; der Spieler findet und ändert
//     seinen Bogen auf „Ich“.
// Unterwegs prüft jede Ansicht im Umfang des Plans weich (expect.soft), dass es genau einen
// hervorgehobenen Knopf gibt und der „Was ist das hier?“-Satz (`.view-intro p`) sichtbar ist. So
// zeigt ein Lauf alle Stolpersteine einer Aufgabe; hart scheitert er erst, wo der Weg abreißt.
//
// Wo ein Knopf dem Hervorgehobenen gefolgt wird, liest der Test dessen sichtbaren Namen und prüft,
// dass er unter genau diesem Namen erreichbar ist — so, wie ein Mensch den Knopf liest und drückt.
import { expect, request, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { CHRONICLES_LITE_PACKAGE } from "@chronicle/rules";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createActors } from "../packages/server/src/domain/actors.ts";
import { createFigurantrag } from "../packages/server/src/domain/figurantrag.ts";

interface Session { userId: string; value: string }
const port = 15100 + Math.floor(Math.random() * 400), origin = `http://localhost:${port}`;
const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
let db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaignId = "";
let gm: Session, player: Session;

test.beforeAll(async () => {
  test.setTimeout(120_000);
  db = await createTestDb(); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db);
  gm = await identity.bootstrap("Kaya");
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
  // Die Runde entsteht über HTTP wie aus der Oberfläche: nur dieser Weg installiert und aktiviert
  // Chronicles Lite als Standardregelwerk (DEFAULT_CAMPAIGN_RULES in app.ts).
  const http = await request.newContext({ extraHTTPHeaders: { origin, cookie: `chronicle_session=${gm.value}` } });
  try {
    const created = await http.post(`${origin}/api/campaigns`, { data: { name: "Unsere erste Runde" } });
    if (!created.ok()) throw new Error(`Runde anlegen: ${created.status()} ${await created.text()}`);
    campaignId = ((await created.json()) as { id: string }).id;
  } finally { await http.dispose(); }
  // Ein eingeladener Spieler, über dieselben Domänenfunktionen wie e2e/helpers/review-app.ts.
  const invitation = await campaigns.issueInvitation(gm.userId, campaignId);
  const joinRequest = await campaigns.requestJoin(invitation.code, { displayName: "Sera" });
  const member = await campaigns.approveJoin(gm.userId, campaignId, joinRequest.id);
  player = { userId: member.userId, ...await identity.issueSession(member.userId) };
  // Der Beitritt legt dem Spieler eine leere Figur an und gibt ihm die Führung. Dann zeigt „Ich“
  // deren Bogen statt des Antrags. Aufgabe 3 beginnt aber ohne Figur; darum wird die Führung wie im
  // Bildwerkzeug entzogen (der Serververtrag bleibt laut Plan unverändert).
  await createActors(db).revokeController(gm.userId, campaignId, member.actorId, member.userId,
    { commandId: randomUUID(), expectedVersion: 1, reason: "Beantragt die Figur selbst." });
});
test.afterAll(async () => { await app?.close(); await db?.close(); });

// ---------------------------------------------------------------------------------------------
// Werkzeuge

async function openAs(browser: Browser, who: Session): Promise<{ context: BrowserContext; page: Page; errors: string[] }> {
  const context = await browser.newContext({ locale: "de-DE", viewport: { width: 1440, height: 960 } });
  await context.addCookies([{ name: "chronicle_session", value: who.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const page = await context.newPage(), errors: string[] = [];
  page.setDefaultTimeout(30_000);
  page.on("pageerror", error => errors.push(error.message));
  // Browser-Rückfragen, die es noch gibt, bejaht ein Mensch hier; die gestaltete kommt über confirmIfAsked.
  page.on("dialog", dialog => void dialog.accept());
  return { context, page, errors };
}

const entry = (stage?: string) => `${origin}/?campaign=${campaignId}${stage ? `&stage=${stage}` : ""}`;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const primary = (page: Page) => page.locator("main .button-primary:visible");

async function settle(page: Page, ms = 500) {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForFunction(() => !document.querySelector(".loading"), undefined, { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(ms);
}

/**
 * Maßstab je Ansicht (Spec „Ziel und Maßstab“): genau ein hervorgehobener nächster Schritt, und
 * oben der Satz, was das hier ist. Der Satz gilt nur dort, wo Spec E11 einen `ViewIntro` vorsieht
 * (Bibliothek, Werkbank-Bereiche, Figuren & NPCs, Figurvorlagen, Figur anlegen, Figurantrag, „Ich“);
 * Assistent, Schmiede-Übersicht und die Schritte des geführten Wegs prüfen nur den einen Knopf.
 */
async function view(page: Page, name: string, { intro }: { intro: boolean }) {
  await settle(page);
  await expect.soft(primary(page), `${name}: genau ein hervorgehobener nächster Schritt`).toHaveCount(1, { timeout: 8_000 });
  if (intro) await expect.soft(page.locator("main .view-intro p").first(), `${name}: oben steht, was diese Ansicht ist`).toBeVisible({ timeout: 8_000 });
}

/** Die gestaltete Rückfrage (UiHost, Plan Task 1: erst „Abbrechen“, dann der bestätigende Knopf). */
async function confirmIfAsked(page: Page) {
  const dialog = page.getByRole("dialog");
  if (await dialog.first().waitFor({ state: "visible", timeout: 1_500 }).then(() => true, () => false))
    await dialog.first().getByRole("button").last().click();
}

/**
 * Dem einen hervorgehobenen Knopf folgen, bis `arrived` erfüllt ist. Vor jedem Klick füllt `fill`
 * aus, was ein Anfänger ausfüllen würde. Liefert die Namen der gedrückten Knöpfe.
 */
async function followHighlighted(page: Page, name: string, arrived: () => Promise<boolean>,
  { intro, fill }: { intro: boolean; fill?: (page: Page) => Promise<void> }): Promise<string[]> {
  const pressed: string[] = [];
  for (let round = 1; round <= 10; round++) {
    await settle(page);
    if (await arrived()) return pressed;
    await view(page, `${name} · Schritt ${round}`, { intro });
    if (fill) await fill(page);
    const count = await primary(page).count();
    if (count !== 1) throw new Error(`${name} · Schritt ${round}: ${count} hervorgehobene Knöpfe statt genau einem (${(await primary(page).allInnerTexts()).join(" | ")}); bisher gedrückt: ${pressed.join(" → ") || "nichts"}`);
    const label = (await primary(page).innerText()).trim().replace(/\s+/g, " ");
    await expect(page.getByRole("main").getByRole("button", { name: label }), `„${label}“ ist unter seinem sichtbaren Namen erreichbar`).not.toHaveCount(0);
    await expect(primary(page), `${name}: der hervorgehobene Knopf „${label}“ ist nicht gesperrt`).toBeEnabled();
    pressed.push(label);
    await primary(page).click();
    await confirmIfAsked(page);
  }
  await settle(page);
  if (!await arrived()) throw new Error(`${name}: nach zehn hervorgehobenen Knöpfen nicht am Ziel (${pressed.join(" → ")})`);
  return pressed;
}

/**
 * Was ein Anfänger ausfüllt: leere Namensfelder bekommen den Namen der Figur, Pflichtauswahlen
 * ohne Wert die erste angebotene Möglichkeit. Alles andere bleibt auf den Vorgaben.
 */
function fillLikeABeginner(figure: string) {
  return async (page: Page) => {
    const main = page.getByRole("main");
    for (const box of await main.getByRole("textbox", { name: /name/i }).all())
      if (await box.isVisible() && await box.isEditable() && !await box.inputValue()) await box.fill(figure);
    for (const select of await main.locator("select:required").all()) {
      if (!await select.isVisible() || await select.inputValue()) continue;
      const first = await select.locator("option").evaluateAll(options => (options as HTMLOptionElement[]).find(option => option.value && !option.disabled)?.value ?? "");
      if (first) await select.selectOption(first);
    }
  };
}

/** Der Bogen einer Figur: ihre Überschrift und „Bogen speichern“ (geraten: der Plan sagt nur „its sheet“). */
function sheetOf(page: Page, figure: string) {
  return async () => await page.getByRole("heading", { name: new RegExp(escape(figure)) }).first().isVisible()
    && await page.getByRole("button", { name: /Bogen speichern/ }).first().isVisible();
}

const railButton = (page: Page, label: string) => page.getByRole("navigation", { name: "Bereiche" }).getByRole("button", { name: label, exact: true });

// ---------------------------------------------------------------------------------------------
// Die drei Aufgaben

test("1 · Die Spielleitung legt ein eigenes Regelwerk an, probiert es aus und aktiviert es für die Runde", async ({ browser }) => {
  test.setTimeout(8 * 60_000);
  const { context, page, errors } = await openAs(browser, gm);
  try {
    await page.goto(entry("schmiede"), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await view(page, "Schmiede · Übersicht", { intro: false });
    await page.getByRole("button", { name: "Regeln", exact: true }).click();
    await view(page, "Regeln · Bibliothek", { intro: true });

    await page.getByRole("button", { name: "Neues Regelwerk", exact: true }).click();
    // Heute „Name des Regelwerks“; der Plan legt die Beschriftung nicht fest.
    await page.getByRole("textbox", { name: /name/i }).first().fill("Nordlicht");
    await view(page, "Assistent · Schritt 1", { intro: false });
    for (let step = 2; step <= 6; step++) {
      await page.getByRole("button", { name: /^Weiter(?! bearbeiten)/ }).click();
      await view(page, `Assistent · Schritt ${step}`, { intro: false });
    }
    // Sechs Schritte mit den Vorgaben: der letzte heißt „Fertig“ und ist in der Schrittliste der
    // aktuelle (StepList, Plan Task 1/5); /Fertig$/ schließt „Fertigkeiten“ aus. Danach kein „Weiter“ mehr.
    await expect.soft(page.getByRole("listitem").filter({ hasText: /Fertig$/ }).first(), "Der Assistent steht auf „Fertig“")
      .toHaveAttribute("aria-current", "step", { timeout: 8_000 });
    await expect(page.getByRole("button", { name: /^Weiter(?! bearbeiten)/ })).toHaveCount(0);
    // Anlegen ist der hervorgehobene Knopf auf „Fertig“ (heute „Regelwerk anlegen“); er führt in die Werkbank.
    const transfer = page.getByRole("tab", { name: /^Übernehmen/ });
    await followHighlighted(page, "Assistent · Fertig", () => transfer.first().isVisible(), { intro: false });
    await view(page, "Werkbank · erster Bereich", { intro: true });

    await transfer.first().click();
    await view(page, "Werkbank · Übernehmen", { intro: true });
    // Plan: „Prüfen“ → „Version installieren“ → „Aktivieren“. Heute heißen Prüfen und Aktivieren
    // „Aktivierung prüfen“ und „Geprüfte Version für diese Runde aktivieren“; beide Formen passen.
    await page.getByRole("button", { name: /^(\S+ )?prüfen$/i }).first().click();
    await confirmIfAsked(page);
    await page.getByRole("button", { name: "Version installieren", exact: true }).click();
    await confirmIfAsked(page);
    const activate = page.getByRole("button", { name: /aktivieren$/i, disabled: false });
    await expect(activate.first()).toBeVisible();
    // Nur wenn vorhandene Bögen umziehen, verlangt die Aktivierung ein Häkchen (heute „… geprüft.“).
    const acknowledge = page.getByRole("checkbox", { name: /geprüft/ });
    if (await acknowledge.first().isVisible()) await acknowledge.first().check();
    await activate.first().click();
    await confirmIfAsked(page);
    await expect(activate, "Nach dem Aktivieren bietet die Werkbank kein Aktivieren mehr an").toHaveCount(0, { timeout: 30_000 });

    await page.getByRole("button", { name: "Zur Bibliothek", exact: true }).click();
    await view(page, "Regeln · Bibliothek nach dem Aktivieren", { intro: true });
    await expect(page.getByRole("main").getByRole("button").filter({ hasText: "Nordlicht" }).filter({ hasText: "Aktiv in dieser Runde" }),
      "Die Bibliothek zeigt das neue Regelwerk als aktiv").toBeVisible();
    expect.soft(errors, "keine Seitenfehler").toEqual([]);
  } finally { await context.close(); }
});

test("2 · Die Spielleitung legt eine Figur für die Runde an", async ({ browser }) => {
  test.setTimeout(8 * 60_000);
  const { context, page, errors } = await openAs(browser, gm);
  const figure = "Brann vom Hügel";
  try {
    await page.goto(entry("schmiede"), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByRole("button", { name: "Figuren & NPCs", exact: true }).click();
    await view(page, "Figuren & NPCs", { intro: true });
    // Spec E15: „Wer ist die Figur?“ → „Was kann sie?“ → „Fertig“. Der Weg dahin (Vorlage mit
    // „Mit Beispiel beginnen“ oder direkt) ist offen; der Test folgt nur dem hervorgehobenen Knopf.
    const pressed = await followHighlighted(page, "Figur anlegen", sheetOf(page, figure), { intro: true, fill: fillLikeABeginner(figure) });
    expect.soft(pressed.length, "Der Weg zur Figur braucht Knöpfe, aber kein Raten").toBeGreaterThan(0);
    await expect(page.getByRole("heading", { name: new RegExp(escape(figure)) }).first(), "Der Bogen der neuen Figur ist zu sehen").toBeVisible();
    expect.soft(errors, "keine Seitenfehler").toEqual([]);
  } finally { await context.close(); }
});

test("3 · Ein Spieler beantragt eine Figur, die Spielleitung gibt frei, der Spieler ändert seinen Bogen", async ({ browser }) => {
  test.setTimeout(8 * 60_000);
  // Vorbedingung, die keine der drei Aufgaben abdeckt: beantragen geht nur aus einer für Spieler
  // freigegebenen Vorlage (Serververtrag). Sie wird hier gesetzt, damit diese Aufgabe nicht vom
  // Ausgang der zweiten abhängt; eine Chronicles-Lite-Vorlage, weil Lite in jeder neuen Runde liegt.
  const actors = createActors(db), antrag = createFigurantrag(db);
  const template = await actors.createActorTemplate(gm.userId, campaignId, { commandId: randomUUID(), definition: {
    schemaVersion: 1, name: "Wanderin", kind: "player_character", loreEntryId: null,
    package: { id: CHRONICLES_LITE_PACKAGE.id, version: CHRONICLES_LITE_PACKAGE.version }, fields: { name: "Wanderin", role: "Wanderin" },
  } });
  await antrag.freigeben(gm.userId, campaignId, template.id, 0);

  const figure = "Sera Sturmwind";
  const spieler = await openAs(browser, player), leitung = await openAs(browser, gm);
  try {
    const p = spieler.page;
    await p.goto(entry(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    // „Heute“ gehört keiner Welle dieses Plans; der Spieler wählt „Ich“ in der Bereichsleiste.
    await railButton(p, "Ich").click();
    const waiting = p.getByText(new RegExp(`${escape(figure)}.*wartet auf die Spielleitung`));
    const pressed = await followHighlighted(p, "Figur beantragen", () => waiting.first().isVisible(), { intro: true, fill: fillLikeABeginner(figure) });
    expect.soft(pressed, "Der Antrag geht mit „Figur beantragen“ ab (Spec E7)").toContain("Figur beantragen");

    const g = leitung.page;
    await g.goto(entry(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    // Die Anträge liegen heute am Tisch unter „Figuren & Inventar“ (Plan Task 6: Reiter mit Zähler).
    // Der Tisch ist nicht im Umfang von Spec E11; dort wird nichts gemessen.
    await railButton(g, "Tisch").click();
    await g.getByRole("tab", { name: "Figuren & Inventar", exact: true }).click();
    await g.getByRole("tab", { name: /^Anträge/ }).or(g.getByRole("button", { name: /^Anträge/ })).first().click();
    await expect(g.getByText(figure, { exact: true }).first()).toBeVisible();
    // Geraten: heute „Bestätigen“.
    await g.getByRole("button", { name: /^(Bestätigen|Freigeben|Annehmen)/ }).first().click();
    await confirmIfAsked(g);

    // Ohne Neuladen: die Freigabe erreicht „Ich“ über den Live-Kanal.
    await expect.poll(sheetOf(p, figure), { message: "Der Spieler sieht seine Figur auf „Ich“", timeout: 30_000 }).toBe(true);
    await view(p, "Ich · mit Figur", { intro: true });
    // Plan Task 4: Zahlenkacheln mit „{Name} um eins erhöhen“.
    await p.getByRole("button", { name: /um eins erhöhen$/, disabled: false }).first().click();
    await p.getByRole("button", { name: /Bogen speichern/ }).first().click();
    await confirmIfAsked(p);
    await expect(p.getByText(/^(Alles gespeichert|Gespeichert)\.$/).first(), "Der geänderte Bogen ist gespeichert").toBeVisible();
    expect.soft([...spieler.errors, ...leitung.errors], "keine Seitenfehler").toEqual([]);
  } finally { await spieler.context.close(); await leitung.context.close(); }
});
