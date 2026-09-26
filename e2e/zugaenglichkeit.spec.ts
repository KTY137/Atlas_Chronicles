// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Dauerhafter Zugänglichkeitstest (Spec 2026-09-26 „Zugänglich und schön“, Abschnitt Prüfnetz;
// Plan Task 3). Bibliothek, Assistent (alle sechs Schritte), Werkbank (Paket, Attribute, Aktionen,
// Übernehmen), Figurvorlagen, Vorlagenformular, Figurantrag, „Ich“ und Tisch-Bogen — je im dunklen
// Standardlook Fantasy und im hellen Parchment, je bei 1440 und 390 Pixel Breite:
//  - axe-core 4.13 (wcag2a/aa, wcag21a/aa, wcag22aa, best-practice). Blockiert jeden Befund
//    „serious“/„critical“ und dazu region, heading-order, aria-prohibited-attr, label, button-name.
//    Tippziele unter 24 px meldet axe selbst (`target-size`, „serious“). Eine eigene, strengere
//    Messung fehlt mit Absicht: sie meldete die 20-px-Kontrollkästchen aus Plan Task 2 zu Unrecht.
//  - kein waagrechter Überlauf (Seite und Hauptbereich);
//  - kein sichtbarer Text unter 12 px im Hauptbereich;
//  - nach „Neues Regelwerk“, nach jedem „Weiter“ im Assistenten und nach „Als Regelentwurf öffnen“
//    steht der Fokus auf der neuen Überschrift (h1–h3).
// Jeder Test sammelt die Befunde aller seiner Bildschirme und scheitert einmal mit der ganzen Liste;
// an Bildschirme mit Befund hängt er ein Bild. Ziel: grün, ohne Ausnahmeliste.
//
// Die Vorbereitung ist aus e2e/ux-audit.spec.ts kopiert, nicht importiert: das Bildwerkzeug darf
// sich ändern, ohne dass dieser Test bricht.
import { expect, test, type Browser, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { CHRONICLE_ARCHETYPES, CHRONICLE_HEROES_PACKAGE, CHRONICLES_LITE_PACKAGE } from "@chronicle/rules";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createActors } from "../packages/server/src/domain/actors.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import { createFigurantrag } from "../packages/server/src/domain/figurantrag.ts";

const AXE = resolve("node_modules/axe-core/axe.min.js");
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const BLOCKING_RULES = ["region", "heading-order", "aria-prohibited-attr", "label", "button-name"];
const WIDTHS = [{ width: 1440, height: 960 }, { width: 390, height: 844 }] as const;
/** Fantasy ist der Standardlook (dunkel), Parchment der neutrale helle Arbeitslook. */
const LOOKS = [{ name: "Fantasy", skin: "Fantasy" }, { name: "Parchment", skin: "Parchment" }] as const;
/** „Weiter“ im Assistenten — heute „Weiter: Würfeln“ usw.; „Weiter bearbeiten“ ist der Bibliotheksknopf. */
const WEITER = /^Weiter(?! bearbeiten)/;

interface Session { userId: string; value: string }
let db: Db, app: Awaited<ReturnType<typeof buildApp>>, origin = "";
let campaignId = "", liteCampaignId = "", heroId = "", kaelId = "";
const s: Record<"gm" | "sera" | "nell" | "ole" | "tamo", Session> = {} as never;

// ---------------------------------------------------------------------------------------------
// Vorbereitung — Kopie aus e2e/ux-audit.spec.ts (beforeAll): Spielleitung und Spieler, eine Runde
// mit Lite und Chronicle Heroes, eine Lite-Runde, je eine Figur, ein offener Antrag.

test.beforeAll(async () => {
  test.setTimeout(180_000);
  const port = 14600 + Math.floor(Math.random() * 400);
  origin = `http://localhost:${port}`;
  const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
  db = await createTestDb(); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db);
  const gm = await identity.bootstrap("Kaya"); s.gm = gm;
  campaignId = (await campaigns.createCampaign(gm.userId, { name: "Die Chroniken des Nordens" })).id;
  const invite = await campaigns.issueInvitation(gm.userId, campaignId);
  const join = async (name: string) => {
    const request = await campaigns.requestJoin(invite.code, { displayName: name });
    const member = await campaigns.approveJoin(gm.userId, campaignId, request.id);
    return { member, session: { userId: member.userId, ...await identity.issueSession(member.userId) } };
  };
  const sera = await join("Sera"), nell = await join("Nell"), ole = await join("Ole");
  s.sera = sera.session; s.nell = nell.session; s.ole = ole.session;

  const game = createGameplay(db), actors = createActors(db), antrag = createFigurantrag(db);
  // Eine Kampagne fuehrt alle Boegen unter EINEM Paket (Aktivieren migriert jeden Bogen). Lite wird
  // zuerst aktiviert (steht damit in Bibliothek und Verlauf), dann Chronicle Heroes: dessen Boegen
  // zeigen Faehigkeiten und Zustaende. Der lange Lite-Bogen lebt in einer zweiten Kampagne.
  await game.installPackage(gm.userId, campaignId, CHRONICLES_LITE_PACKAGE);
  await game.activatePackage(gm.userId, campaignId, { packageId: CHRONICLES_LITE_PACKAGE.id, packageVersion: CHRONICLES_LITE_PACKAGE.version, expectedVersion: 0 });
  await game.installPackage(gm.userId, campaignId, CHRONICLE_HEROES_PACKAGE);
  await game.activatePackage(gm.userId, campaignId, { packageId: CHRONICLE_HEROES_PACKAGE.id, packageVersion: CHRONICLE_HEROES_PACKAGE.version, expectedVersion: 1 });
  // Nell und Ole fuehren keine Figur: die leere Flaeche, auf der ein Antrag beginnt.
  for (const who of [nell, ole]) await actors.revokeController(gm.userId, campaignId, who.member.actorId, who.member.userId,
    { commandId: randomUUID(), expectedVersion: 1, reason: "Beantragt die Figur selbst." }).catch(error => console.log("[zugaenglichkeit] revoke: " + (error as Error).message));

  const heroesPkg = { id: CHRONICLE_HEROES_PACKAGE.id, version: CHRONICLE_HEROES_PACKAGE.version };
  const heroes = await actors.createActorTemplate(gm.userId, campaignId, { commandId: randomUUID(), definition: {
    schemaVersion: 1, name: "Klingentänzerin", kind: "player_character", loreEntryId: null, package: heroesPkg,
    fields: { ...CHRONICLE_ARCHETYPES[0]!.fields, name: "Mara", profession: "Klingentänzerin", notes: "Sucht ihren Bruder im Norden.", skill_athletik: 60, erfahrung: 4, erfahrung_fertigkeiten: 2 },
  } });
  const second = await actors.createActorTemplate(gm.userId, campaignId, { commandId: randomUUID(), definition: {
    schemaVersion: 1, name: "Wegkundiger", kind: "player_character", loreEntryId: null, package: heroesPkg,
    fields: { ...(CHRONICLE_ARCHETYPES[1] ?? CHRONICLE_ARCHETYPES[0]!).fields, name: "Liva" },
  } });
  await actors.createActorTemplate(gm.userId, campaignId, { commandId: randomUUID(), definition: {
    schemaVersion: 1, name: "Frostwolf", kind: "creature", loreEntryId: null, package: heroesPkg, fields: { name: "Frostwolf" },
  } }).catch(error => console.log("[zugaenglichkeit] creature template: " + (error as Error).message));
  const make = (c: string, template: { id: string; revision: number }, name: string, owner?: string) => actors.instantiateActor(gm.userId, c,
    { commandId: randomUUID(), templateId: template.id, templateRevision: template.revision, name }, owner ? { createdBy: owner, grantTo: owner } : {});
  heroId = (await make(campaignId, heroes, "Mara", sera.member.userId)).id;
  await make(campaignId, second, "Liva", sera.member.userId);
  await antrag.freigeben(gm.userId, campaignId, heroes.id, 0);
  await antrag.freigeben(gm.userId, campaignId, second.id, 0);
  // Ole wartet mit einem offenen Antrag: Spielerseite „wartet“, Spielleitungsseite „Anträge“.
  await antrag.beantragen(ole.member.userId, campaignId, randomUUID(), { templateId: second.id, name: "Ole vom Frosttor", anfangswerte: { name: "Ole vom Frosttor" } })
    .catch(error => console.log("[zugaenglichkeit] antrag: " + (error as Error).message));

  // Zweite Kampagne: Chronicles Lite aktiv, Tamo fuehrt Kael (100 Fertigkeiten, Vitalitaetsbalken).
  liteCampaignId = (await campaigns.createCampaign(gm.userId, { name: "Grenzland (Lite)" })).id;
  const liteInvite = await campaigns.issueInvitation(gm.userId, liteCampaignId);
  const tamoJoin = await campaigns.approveJoin(gm.userId, liteCampaignId, (await campaigns.requestJoin(liteInvite.code, { displayName: "Tamo" })).id);
  s.tamo = { userId: tamoJoin.userId, ...await identity.issueSession(tamoJoin.userId) };
  await game.installPackage(gm.userId, liteCampaignId, CHRONICLES_LITE_PACKAGE);
  await game.activatePackage(gm.userId, liteCampaignId, { packageId: CHRONICLES_LITE_PACKAGE.id, packageVersion: CHRONICLES_LITE_PACKAGE.version, expectedVersion: 0 });
  const lite = await actors.createActorTemplate(gm.userId, liteCampaignId, { commandId: randomUUID(), definition: {
    schemaVersion: 1, name: "Grenzläufer", kind: "player_character", loreEntryId: null,
    package: { id: CHRONICLES_LITE_PACKAGE.id, version: CHRONICLES_LITE_PACKAGE.version },
    fields: { name: "Kael", role: "Späher", vitality: 14, max_vitality: 20 },
  } });
  kaelId = (await make(liteCampaignId, lite, "Kael", tamoJoin.userId)).id;

  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => { await app?.close(); await db?.close(); });

// ---------------------------------------------------------------------------------------------
// Werkzeuge

async function openContext(browser: Browser, who: Session, skin: string): Promise<{ context: BrowserContext; page: Page }> {
  // bypassCSP: axe wird als Skript in die Seite gelegt; die Inhaltsrichtlinie der App verbietet das sonst.
  const context = await browser.newContext({ locale: "de-DE", viewport: { width: 1440, height: 960 }, bypassCSP: true });
  await context.addCookies([{ name: "chronicle_session", value: who.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const prefs = { schemaVersion: 3, contrast: "system", motion: "system", transparency: "system", art: "on", font: "theme", density: "comfortable",
    atmosphere: "crafted", lowPower: false, localSkin: skin, language: "de", banner: "none", bannerAnimation: true };
  await context.addInitScript(value => { try { localStorage.setItem("chronicle.appearance.v1", value); } catch { /* ohne Speicher: Standardlook */ } }, JSON.stringify(prefs));
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.on("dialog", dialog => void dialog.accept());
  return { context, page };
}

/** Ein offener Live-Kanal oder ein spätes Bild verzögert „load“; für die Prüfung genügt das DOM. */
const go = (page: Page, target: string) => page.goto(target, { waitUntil: "domcontentloaded", timeout: 60_000 });
const url = (stage: string, extra = "", c = campaignId) => `${origin}/?campaign=${c}&stage=${stage}${extra}`;
const firstLine = (error: unknown) => ((error as Error)?.message ?? String(error)).split("\n")[0]!.slice(0, 300);

async function settle(page: Page, ms = 600) {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForFunction(() => !document.querySelector(".loading"), undefined, { timeout: 15_000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready.then(() => true)).catch(() => undefined);
  await page.waitForTimeout(ms);
}

/** axe auf der ganzen Seite; zurück kommen nur die blockierenden Befunde, lesbar als eine Zeile je Regel. */
async function axeBlocking(page: Page): Promise<string[]> {
  if (!await page.evaluate(() => "axe" in window)) await page.addScriptTag({ path: AXE });
  const violations = await page.evaluate(async tags => {
    type Rule = { id: string; impact?: string | null; nodes: { target: unknown[] }[] };
    const axe = (window as unknown as { axe: { run(context: Document, options: unknown): Promise<{ violations: Rule[] }> } }).axe;
    const result = await axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] });
    return result.violations.map(rule => ({ id: rule.id, impact: rule.impact ?? "", count: rule.nodes.length,
      targets: rule.nodes.slice(0, 3).map(node => node.target.map(String).join(" ")) }));
  }, AXE_TAGS);
  return violations.filter(rule => ["serious", "critical"].includes(rule.impact) || BLOCKING_RULES.includes(rule.id))
    .map(rule => `${rule.id} (${rule.impact || "ohne Stufe"}, ${rule.count}×): ${rule.targets.join(" | ")}`);
}

/** Waagrechter Überlauf der Seite oder des Hauptbereichs, mit den äußersten Verursachern. */
async function overflow(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const viewport = innerWidth, pageWidth = document.documentElement.scrollWidth;
    const main = document.querySelector("main");
    const mainOverflow = main ? main.scrollWidth - main.clientWidth : 0;
    if (pageWidth <= viewport + 1 && mainOverflow <= 1) return null;
    const limit = main && pageWidth <= viewport + 1 ? main.getBoundingClientRect().right : viewport;
    const name = (el: Element) => el.tagName.toLowerCase() + [...el.classList].slice(0, 2).map(c => "." + c).join("");
    const culprits: string[] = [];
    for (const el of document.querySelectorAll(main && pageWidth <= viewport + 1 ? "main *" : "body *")) {
      if (culprits.length >= 3) break;
      const box = el.getBoundingClientRect(); if (box.width < 1 || box.height < 1 || box.right <= limit + 1) continue;
      const parent = el.parentElement?.getBoundingClientRect(); if (parent && parent.right > limit + 1) continue; // nur der äußerste einer Kette
      culprits.push(`${name(el)} bis ${Math.round(box.right)} px`);
    }
    const what = pageWidth > viewport + 1 ? `Seite ${pageWidth} px breit bei ${viewport} px Fenster` : `Hauptbereich scrollt ${mainOverflow} px waagrecht`;
    return culprits.length ? `${what} (${culprits.join(", ")})` : what;
  });
}

/** Sichtbarer Text unter 12 px im Hauptbereich (Messung aus Plan Task 3, mit Größe und Textprobe). */
async function smallText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const hits = [...document.querySelectorAll("main *")].filter(el => {
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || el.closest(".sr-only")) return false;
      const text = [...el.childNodes].some(node => node.nodeType === 3 && node.textContent!.trim());
      return text && parseFloat(style.fontSize) < 12 && (el as HTMLElement).offsetParent !== null;
    });
    const sample = hits.slice(0, 5).map(el => {
      const text = [...el.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent!.trim()).join(" ").slice(0, 30);
      return `${el.getAttribute("class") || el.tagName.toLowerCase()} ${parseFloat(getComputedStyle(el).fontSize)} px „${text}“`;
    });
    return hits.length > 5 ? [...sample, `… insgesamt ${hits.length} Stellen`] : sample;
  });
}

/** Ein Bildschirm in beiden Breiten: axe, Überlauf, kleine Schrift. Befunde landen in `problems`. */
async function checkScreen(page: Page, screen: string, look: string, problems: string[], info: TestInfo) {
  for (const size of WIDTHS) {
    const where = `${screen} · ${look} · ${size.width} px`, before = problems.length;
    try {
      await page.setViewportSize(size);
      await settle(page);
      await page.evaluate(() => { document.querySelector("main")?.scrollTo(0, 0); window.scrollTo(0, 0); });
      for (const line of await axeBlocking(page)) problems.push(`${where} · axe ${line}`);
      const wide = await overflow(page);
      if (wide) problems.push(`${where} · Überlauf: ${wide}`);
      const small = await smallText(page);
      if (small.length) problems.push(`${where} · Text unter 12 px: ${small.join(" ; ")}`);
    } catch (error) { problems.push(`${where} · Prüfung abgebrochen: ${firstLine(error)}`); }
    if (problems.length > before) {
      const shot = await page.screenshot({ animations: "disabled" }).catch(() => null);
      if (shot) await info.attach(`${where}.png`, { body: shot, contentType: "image/png" });
    }
  }
  await page.setViewportSize(WIDTHS[0]).catch(() => undefined);
}

/** Einen Bildschirm ansteuern. Scheitert der Weg dorthin, ist das selbst ein Befund. */
async function reach(problems: string[], screen: string, look: string, route: () => Promise<void>): Promise<boolean> {
  try { await route(); return true; } catch (error) { problems.push(`${screen} · ${look} · nicht erreicht: ${firstLine(error)}`); return false; }
}

/** Nach einem Ansichtswechsel steht der Fokus auf der neuen Überschrift (Spec E4, Plan Task 3). */
async function focusOnHeading(page: Page, after: string, look: string, problems: string[]) {
  const landed = await page.waitForFunction(() => /^H[1-3]$/.test(document.activeElement?.tagName ?? ""), undefined, { timeout: 3_000 }).then(() => true, () => false);
  if (landed) return;
  const where = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return "body";
    return el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + [...el.classList].slice(0, 2).map(c => "." + c).join("");
  });
  problems.push(`Fokus nach „${after}“ · ${look}: liegt auf ${where}, nicht auf der neuen Überschrift (h1–h3)`);
}

function report(problems: string[]) {
  expect(problems, `${problems.length} Befunde — jede Zeile: Bildschirm · Look · Breite · Befund`).toEqual([]);
}

// ---------------------------------------------------------------------------------------------
// Bildschirme

for (const look of LOOKS) {
  test(`${look.name}: Regelschmiede – Bibliothek, Assistent in sechs Schritten, Werkbank`, async ({ browser }, info) => {
    test.setTimeout(20 * 60_000);
    const problems: string[] = [];
    const { context, page } = await openContext(browser, s.gm, look.skin);
    const check = (screen: string) => checkScreen(page, screen, look.name, problems, info);
    try {
      if (await reach(problems, "Bibliothek", look.name, async () => {
        await go(page, url("schmiede", "&forge=rules"));
        await page.getByRole("button", { name: "Neues Regelwerk", exact: true }).waitFor();
      })) await check("Bibliothek");

      if (await reach(problems, "Assistent · Schritt 1", look.name, async () => {
        await go(page, url("schmiede", "&forge=rules"));
        await page.getByRole("button", { name: "Neues Regelwerk", exact: true }).click();
        await focusOnHeading(page, "Neues Regelwerk", look.name, problems);
        // Heute „Name des Regelwerks“; der Plan legt die Beschriftung nicht fest.
        await page.getByRole("textbox", { name: /name/i }).first().fill("Nordlicht");
      })) {
        await check("Assistent · Schritt 1");
        for (let step = 2; step <= 6; step++) {
          if (!await reach(problems, `Assistent · Schritt ${step}`, look.name, async () => {
            await page.getByRole("button", { name: WEITER }).click();
            await focusOnHeading(page, `Weiter (zu Schritt ${step})`, look.name, problems);
          })) break;
          await check(`Assistent · Schritt ${step}`);
        }
      }

      if (await reach(problems, "Werkbank", look.name, async () => {
        await go(page, url("schmiede", "&forge=rules"));
        await page.getByRole("button", { name: "Als Regelentwurf öffnen", exact: true }).first().click();
        await focusOnHeading(page, "Als Regelentwurf öffnen", look.name, problems);
      })) {
        // Reiter dürfen ihre Problemzahl im Namen tragen („Attribute, 2 Probleme“, Plan Task 5), daher ^Name.
        for (const tab of ["Paket", "Attribute", "Aktionen", "Übernehmen"]) {
          if (await reach(problems, `Werkbank · ${tab}`, look.name, async () => {
            await page.getByRole("tab", { name: new RegExp(`^${tab}`) }).first().click();
          })) await check(`Werkbank · ${tab}`);
        }
      }
    } finally { await context.close(); }
    report(problems);
  });

  test(`${look.name}: Figurvorlagen, Vorlagenformular und Tisch-Bogen`, async ({ browser }, info) => {
    test.setTimeout(15 * 60_000);
    const problems: string[] = [];
    const { context, page } = await openContext(browser, s.gm, look.skin);
    const check = (screen: string) => checkScreen(page, screen, look.name, problems, info);
    try {
      if (await reach(problems, "Figurvorlagen", look.name, async () => {
        await go(page, url("schmiede", "&forge=actors"));
        await page.getByRole("heading", { name: /Figurvorlagen/ }).first().waitFor();
      })) await check("Figurvorlagen");

      if (await reach(problems, "Figurvorlage · Formular", look.name, async () => {
        await go(page, url("schmiede", "&forge=actors"));
        // Geraten: heute „Neue Figurvorlage“; der Plan nennt den Öffner nicht.
        await page.getByRole("button", { name: /^(Neue Figurvorlage|Figurvorlage anlegen)$/ }).first().click();
      })) await check("Figurvorlage · Formular");

      for (const [screen, campaign, actor] of [["Tisch-Bogen · Chronicle Heroes", campaignId, heroId], ["Tisch-Bogen · Chronicles Lite", liteCampaignId, kaelId]] as const) {
        if (await reach(problems, screen, look.name, async () => {
          await go(page, url("tisch", "&tab=sheet", campaign));
          // Der Tisch liegt außerhalb der Wellen dieses Plans; „Handelnde Figur“ ist die heutige Beschriftung.
          await page.getByRole("combobox", { name: /Handelnde Figur/ }).first().selectOption(actor);
          await page.getByRole("button", { name: /Bogen speichern/ }).first().waitFor();
        })) await check(screen);
      }
    } finally { await context.close(); }
    report(problems);
  });

  test(`${look.name}: Spieler – Figurantrag und Ich`, async ({ browser }, info) => {
    test.setTimeout(15 * 60_000);
    const problems: string[] = [];
    {
      // Nell führt keine Figur: auf „Ich“ beginnt ihr Antrag.
      const { context, page } = await openContext(browser, s.nell, look.skin);
      try {
        if (await reach(problems, "Figurantrag · Formular", look.name, async () => {
          await go(page, url("ich"));
          // Heute „Figur anlegen“; Spec E7 nennt „Figur beantragen“.
          await page.getByRole("button", { name: /^Figur (anlegen|beantragen)$/ }).first().click();
          await page.getByRole("combobox", { name: /vorlage/i }).first().selectOption({ label: "Klingentänzerin" });
          await page.getByLabel(/Name deiner Figur/).first().fill("Nell die Kühne");
        })) await checkScreen(page, "Figurantrag · Formular", look.name, problems, info);
      } finally { await context.close(); }
    }
    {
      // Sera führt zwei Figuren: „Ich“ mit Figurwähler und Heroes-Bogen.
      const { context, page } = await openContext(browser, s.sera, look.skin);
      try {
        if (await reach(problems, "Ich", look.name, async () => {
          await go(page, url("ich"));
          await page.getByRole("combobox", { name: "Deine Figur", exact: true }).selectOption(heroId);
          await page.getByRole("button", { name: /Bogen speichern/ }).first().waitFor();
        })) await checkScreen(page, "Ich", look.name, problems, info);
      } finally { await context.close(); }
    }
    report(problems);
  });
}
