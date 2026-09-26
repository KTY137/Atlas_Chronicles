// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
// Bildwerkzeug, kein Test: UX-/Barrierefreiheits-Aufnahme fuer Regelschmiede, Figurenbau,
// „Ich“, Figurantrag und Tisch. Laeuft nur mit UX_AUDIT=1 und schreibt Bildschirmfotos,
// axe-Ergebnisse und Messwerte nach UX_AUDIT_OUT (Vorgabe: test-results/ux-audit; der naechste
// Playwright-Lauf leert test-results, Bilder zum Aufheben also vorher wegkopieren oder
// UX_AUDIT_OUT setzen). Eingrenzen mit UX_AUDIT_LOOK=default|parchment und
// UX_AUDIT_GROUP=forge,actors,table,player. Der dauerhafte Pruefer ist e2e/zugaenglichkeit.spec.ts.
import { test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CHRONICLE_ARCHETYPES, CHRONICLE_HEROES_PACKAGE, CHRONICLES_LITE_PACKAGE } from "@chronicle/rules";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createActors } from "../packages/server/src/domain/actors.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import { createFigurantrag } from "../packages/server/src/domain/figurantrag.ts";

test.skip(!process.env.UX_AUDIT, "Bildwerkzeug, nur mit UX_AUDIT=1");

const OUT = resolve(process.env.UX_AUDIT_OUT ?? "test-results/ux-audit");
if (process.env.UX_AUDIT) mkdirSync(OUT, { recursive: true });
const AXE = resolve("node_modules/axe-core/axe.min.js");
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const VIEWPORTS = [{ id: "d1440", width: 1440, height: 960 }, { id: "m390", width: 390, height: 844 }] as const;
/** Ein heller Look genuegt fuer die Lecksuche: Parchment ist der neutrale helle Arbeitslook. */
const LOOKS = { default: null, parchment: "Parchment" } as const;
type Look = keyof typeof LOOKS;
const ONLY_LOOK = process.env.UX_AUDIT_LOOK as Look | undefined;
const ONLY_GROUP = process.env.UX_AUDIT_GROUP;

interface Session { userId: string; value: string }
let db: Db, app: Awaited<ReturnType<typeof buildApp>>, origin = "";
let campaignId = "", liteCampaignId = "", heroId = "", kaelId = "";
const s: Record<"gm" | "sera" | "nell" | "ole" | "tamo", Session> = {} as never;

test.beforeAll(async () => {
  test.setTimeout(180_000);
  const port = 14100 + Math.floor(Math.random() * 400);
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
    { commandId: randomUUID(), expectedVersion: 1, reason: "Beantragt die Figur selbst." }).catch(error => console.log("[ux-audit] revoke: " + (error as Error).message));

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
  } }).catch(error => console.log("[ux-audit] creature template: " + (error as Error).message));
  const make = (c: string, template: { id: string; revision: number }, name: string, owner?: string) => actors.instantiateActor(gm.userId, c,
    { commandId: randomUUID(), templateId: template.id, templateRevision: template.revision, name }, owner ? { createdBy: owner, grantTo: owner } : {});
  heroId = (await make(campaignId, heroes, "Mara", sera.member.userId)).id;
  await make(campaignId, second, "Liva", sera.member.userId);
  await antrag.freigeben(gm.userId, campaignId, heroes.id, 0);
  await antrag.freigeben(gm.userId, campaignId, second.id, 0);
  // Ole wartet mit einem offenen Antrag: Spielerseite „wartet“, Spielleitungsseite „Anträge“.
  await antrag.beantragen(ole.member.userId, campaignId, randomUUID(), { templateId: second.id, name: "Ole vom Frosttor", anfangswerte: { name: "Ole vom Frosttor" } })
    .catch(error => console.log("[ux-audit] antrag: " + (error as Error).message));

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

async function openContext(browser: Browser, who: Session, look: Look): Promise<{ context: BrowserContext; page: Page; log: string[] }> {
  const context = await browser.newContext({ locale: "de-DE", viewport: { width: 1440, height: 960 }, bypassCSP: true });
  await context.addCookies([{ name: "chronicle_session", value: who.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  const skin = LOOKS[look];
  const prefs = { schemaVersion: 3, contrast: "system", motion: "system", transparency: "system", art: "on", font: "theme", density: "comfortable",
    atmosphere: "crafted", lowPower: false, localSkin: skin, language: "de", banner: "none", bannerAnimation: true };
  await context.addInitScript(value => { try { localStorage.setItem("chronicle.appearance.v1", value); } catch { /* ignore */ } }, JSON.stringify(prefs));
  const page = await context.newPage(), log: string[] = [];
  page.setDefaultTimeout(30_000);
  // Ein offener Live-Kanal oder ein spaetes Bild verzoegert „load“; fuer das Audit genuegt das DOM.
  const goto = page.goto.bind(page);
  page.goto = (target: string, options?: Parameters<Page["goto"]>[1]) => goto(target, { waitUntil: "domcontentloaded", timeout: 60_000, ...options });
  page.on("pageerror", error => log.push("pageerror: " + error.message));
  page.on("console", message => { if (message.type() === "error") log.push("console: " + message.text().slice(0, 300)); });
  page.on("dialog", dialog => void dialog.accept());
  return { context, page, log };
}

async function settle(page: Page, ms = 700) {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForFunction(() => !document.querySelector(".loading"), undefined, { timeout: 15_000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
  await page.waitForTimeout(ms);
}

const skipped: string[] = [];
function note(line: string) { skipped.push(line); console.log("[ux-audit] " + line); }

/** Messwerte, die axe nicht liefert: Ueberlauf, winzige Schrift, kleine Ziele. */
async function measure(page: Page) {
  return page.evaluate(() => {
    const sel = (el: Element) => {
      const parts: string[] = []; let e: Element | null = el;
      for (let i = 0; i < 4 && e && e !== document.body; i++) {
        let p = e.tagName.toLowerCase();
        if (e.id) { parts.unshift(p + "#" + e.id); break; }
        const cls = [...e.classList].slice(0, 3).join("."); if (cls) p += "." + cls;
        const role = e.getAttribute("role"); if (role) p += `[role=${role}]`;
        parts.unshift(p); e = e.parentElement;
      }
      return parts.join(" > ");
    };
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
      const st = getComputedStyle(el); if (st.visibility === "hidden" || st.display === "none" || Number(st.opacity) < 0.05) return false;
      return !el.closest("[hidden],[aria-hidden=true]") || el.closest("svg") !== null;
    };
    const vw = innerWidth;
    const main = document.querySelector(".main-stage") as HTMLElement | null;
    const overflow = { docScrollWidth: document.documentElement.scrollWidth, innerWidth: vw, docOverflow: document.documentElement.scrollWidth > vw + 1,
      mainScrollWidth: main?.scrollWidth ?? null, mainClientWidth: main?.clientWidth ?? null, mainOverflow: main ? main.scrollWidth > main.clientWidth + 1 : null,
      offenders: [] as { selector: string; right: number; width: number; text: string }[] };
    for (const el of document.querySelectorAll("body *")) {
      if (overflow.offenders.length >= 12) break;
      const r = el.getBoundingClientRect(); if (r.right <= vw + 1 || !visible(el)) continue;
      const parent = el.parentElement?.getBoundingClientRect();
      if (parent && parent.right > vw + 1) continue; // nur der erste Ueberlaeufer einer Kette
      overflow.offenders.push({ selector: sel(el), right: Math.round(r.right), width: Math.round(r.width), text: (el.textContent ?? "").trim().slice(0, 50) });
    }
    const small: Record<string, { size: string; count: number; sample: string }> = {};
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null; let smallTotal = 0;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim(); if (!text) continue;
      const el = node.parentElement; if (!el || !visible(el) || el.closest("script,style,noscript")) continue;
      const size = parseFloat(getComputedStyle(el).fontSize); if (size >= 12) continue;
      smallTotal++;
      const key = sel(el); small[key] ??= { size: size.toFixed(1) + "px", count: 0, sample: text.slice(0, 50) }; small[key].count++;
    }
    const targets: { selector: string; w: number; h: number; name: string; inline: boolean; disabled: boolean }[] = [];
    let targetTotal = 0;
    for (const el of document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=radio], [role=checkbox], [role=switch], [role=menuitem], [role=option], [role=slider], [tabindex]:not([tabindex='-1'])")) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect(); if (r.width >= 24 && r.height >= 24) continue;
      targetTotal++;
      if (targets.length < 40) targets.push({ selector: sel(el), w: Math.round(r.width), h: Math.round(r.height),
        name: (el.getAttribute("aria-label") ?? el.textContent ?? (el as HTMLInputElement).type ?? "").trim().slice(0, 40),
        inline: el.tagName === "A" && !!el.closest("p"), disabled: (el as HTMLButtonElement).disabled === true });
    }
    return { overflow, smallText: { total: smallTotal, groups: Object.entries(small).sort((a, b) => b[1].count - a[1].count).slice(0, 30).map(([selector, v]) => ({ selector, ...v })) },
      smallTargets: { total: targetTotal, items: targets } };
  });
}

async function runAxe(page: Page) {
  const hasAxe = await page.evaluate(() => typeof (window as unknown as { axe?: unknown }).axe !== "undefined");
  if (!hasAxe) await page.addScriptTag({ path: AXE });
  return page.evaluate(async (tags) => {
    const axe = (window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: AxeRule[]; incomplete: AxeRule[]; passes: unknown[] }> } }).axe;
    type AxeRule = { id: string; impact: string | null; help: string; helpUrl: string; tags: string[]; nodes: { target: unknown[]; html: string; failureSummary?: string; any?: { message: string }[] }[] };
    const result = await axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations", "incomplete"] });
    const slim = (rules: AxeRule[]) => rules.map(rule => ({ id: rule.id, impact: rule.impact, help: rule.help, helpUrl: rule.helpUrl, tags: rule.tags,
      nodes: rule.nodes.slice(0, 25).map(n => ({ target: n.target, html: n.html.slice(0, 220), summary: (n.failureSummary ?? n.any?.map(a => a.message).join(" | ") ?? "").slice(0, 400) })), nodeCount: rule.nodes.length }));
    return { violations: slim(result.violations), incomplete: slim(result.incomplete) };
  }, AXE_TAGS);
}

async function fullShot(page: Page, file: string, width: number, height: number) {
  let need = height;
  for (let i = 0; i < 2; i++) {
    need = await page.evaluate(() => {
      const main = document.querySelector(".main-stage") as HTMLElement | null;
      let extra = main ? main.scrollHeight - main.clientHeight : 0;
      // Auch andere innere Scrollflaechen (Werkbank-Editor) koennen den Inhalt verstecken.
      for (const el of document.querySelectorAll(".rf-editor, .rw-body, .rule-forge")) { const h = el as HTMLElement; if (h.scrollHeight > h.clientHeight + 4 && getComputedStyle(h).overflowY !== "visible") extra = Math.max(extra, h.scrollHeight - h.clientHeight); }
      return Math.max(document.documentElement.scrollHeight, innerHeight + extra);
    });
    if (need <= height + 4) break;
    await page.setViewportSize({ width, height: Math.min(need, 15000) }); await page.waitForTimeout(350);
  }
  await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
  await page.setViewportSize({ width, height }); await page.waitForTimeout(250);
}

/** Ein Bildschirm: beide Groessen, Faltbild + Vollbild, axe und Messwerte. */
async function capture(page: Page, screen: string, look: Look, log: string[]) {
  for (const vp of VIEWPORTS) {
    const base = `${screen}__${look}__${vp.id}`;
    try {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await settle(page, 600);
      await page.evaluate(() => { const m = document.querySelector(".main-stage"); if (m) m.scrollTop = 0; window.scrollTo(0, 0); });
      await page.screenshot({ path: join(OUT, base + "__fold.png"), animations: "disabled" });
      const metrics = await measure(page);
      let axe: unknown = null;
      try { axe = await runAxe(page); } catch (error) { note(`${base}: axe failed: ${(error as Error).message.slice(0, 200)}`); }
      writeFileSync(join(OUT, base + ".json"), JSON.stringify({ screen, look, viewport: vp.id, url: page.url(), metrics, axe, consoleErrors: log.slice(-20) }, null, 1));
      await fullShot(page, join(OUT, base + ".png"), vp.width, vp.height);
      console.log(`[ux-audit] captured ${base}`);
    } catch (error) { note(`${base}: capture failed: ${(error as Error).message.slice(0, 300)}`); }
  }
  await page.setViewportSize({ width: 1440, height: 960 }).catch(() => undefined);
}

async function step(name: string, fn: () => Promise<void>) {
  try { await fn(); } catch (error) { note(`SKIPPED ${name}: ${(error as Error).message.split("\n")[0]!.slice(0, 300)}`); }
}

/** Tab-Probe: wohin geht der Fokus, und ist er sichtbar? */
async function keyboardProbe(page: Page, name: string, fromTop: boolean) {
  const rows: unknown[] = [];
  if (fromTop) await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur?.(); window.scrollTo(0, 0); });
  const describe = () => page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return { tag: "body" };
    const r = el.getBoundingClientRect(), st = getComputedStyle(el);
    const path: string[] = []; let e: Element | null = el;
    for (let i = 0; i < 3 && e && e !== document.body; i++) { path.unshift(e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + ([...e.classList].slice(0, 2).map(c => "." + c).join(""))); e = e.parentElement; }
    const main = document.querySelector(".main-stage")?.getBoundingClientRect();
    return { tag: el.tagName.toLowerCase(), role: el.getAttribute("role"), name: (el.getAttribute("aria-label") ?? el.textContent ?? (el as HTMLInputElement).placeholder ?? "").trim().replace(/\s+/g, " ").slice(0, 50),
      selector: path.join(" > "), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      inViewport: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
      inMainVisible: main ? r.bottom > main.top && r.top < main.bottom : null,
      focusVisible: el.matches(":focus-visible"), outline: `${st.outlineStyle} ${st.outlineWidth} ${st.outlineColor}`, outlineOffset: st.outlineOffset, boxShadow: st.boxShadow.slice(0, 80) };
  });
  rows.push({ press: 0, ...(await describe()) });
  for (let i = 1; i <= 16; i++) {
    await page.keyboard.press("Tab"); await page.waitForTimeout(140);
    rows.push({ press: i, ...(await describe()) });
    if ([1, 3, 6, 10, 16].includes(i)) await page.screenshot({ path: join(OUT, `kbd__${name}__tab${String(i).padStart(2, "0")}.png`), animations: "disabled" });
  }
  writeFileSync(join(OUT, `kbd__${name}.json`), JSON.stringify(rows, null, 1));
  return rows;
}

const url = (stage: string, extra = "", c = campaignId) => `${origin}/?campaign=${c}&stage=${stage}${extra}`;
const include = (group: string) => !ONLY_GROUP || ONLY_GROUP.split(",").includes(group);

// ---------------------------------------------------------------------------------------------
// Bildschirme

for (const look of Object.keys(LOOKS) as Look[]) {
  if (ONLY_LOOK && ONLY_LOOK !== look) continue;

  test(`${look}: Regelwerkstatt – Bibliothek, Assistent, Werkbank`, async ({ browser }) => {
    test.skip(!include("forge"));
    test.setTimeout(40 * 60_000);
    const { context, page, log } = await openContext(browser, s.gm, look);
    await step("rules-library", async () => {
      await page.goto(url("schmiede", "&forge=rules"));
      await page.getByRole("region", { name: "Installierte Regelpakete", exact: true }).waitFor();
      await capture(page, "01-rules-library", look, log);
      if (look === "default") await keyboardProbe(page, "rules-library", true);
    });
    await step("rules-installed-view", async () => {
      await page.goto(url("schmiede", "&forge=rules"));
      await page.locator(".rf-catalog-item").first().click();
      await page.getByRole("region", { name: "Was dieses Regelwerk kann", exact: true }).waitFor();
      await capture(page, "02-rules-installed-readonly", look, log);
    });
    await step("rules-wizard", async () => {
      await page.goto(url("schmiede", "&forge=rules"));
      await page.getByRole("button", { name: "Neues Regelwerk", exact: true }).click();
      await page.getByLabel("Name des Regelwerks").waitFor();
      if (look === "default") {
        // Wohin fuehrt das Oeffnen den Fokus? Danach 16 Tabs.
        await keyboardProbe(page, "rules-wizard", false);
        await page.getByRole("button", { name: "Assistent schließen" }).click();
        await page.getByRole("button", { name: "Neues Regelwerk", exact: true }).click();
      }
      await capture(page, "03-wizard-1-name-empty", look, log);
      await page.getByLabel("Name des Regelwerks").fill("Nordlicht");
      await step("wizard genre", async () => { await page.getByRole("radio", { name: /Horror/ }).click(); });
      await capture(page, "03-wizard-1-name", look, log);
      const flow: [string, string, (() => Promise<void>) | null][] = [
        ["Weiter: Würfeln", "03-wizard-2-dice", async () => { await page.getByRole("radio", { name: /Ein W100 unter den Wert/ }).click(); }],
        ["Weiter: Eigenschaften", "03-wizard-3-attributes", async () => { await page.getByLabel("Eigene Eigenschaft").fill("Mut"); await page.keyboard.press("Enter"); }],
        ["Weiter: Vorräte", "03-wizard-4-bars", null],
        ["Weiter: Fertigkeiten", "03-wizard-5-skills", async () => { await page.getByRole("button", { name: /Nachforschen auf Verstand/ }).click(); }],
        ["Weiter: Fertig", "03-wizard-6-done", async () => { await page.getByRole("button", { name: "Nachforschen", exact: true }).click(); }],
      ];
      for (const [button, screen, after] of flow) {
        await step(screen, async () => {
          await page.getByRole("button", { name: button }).click();
          await settle(page, 400);
          if (after) await step(screen + " interaction", after);
          await capture(page, screen, look, log);
        });
      }
    });
    await step("rules-bench", async () => {
      await page.goto(url("schmiede", "&forge=rules"));
      // Chronicle Heroes als Entwurf: das reichste Paket (Faehigkeiten, Zustaende, Balken).
      await page.getByRole("button", { name: "Als Regelentwurf öffnen", exact: true }).first().click();
      const tabs = page.getByRole("tablist", { name: "Regelpaket bearbeiten" });
      await tabs.waitFor();
      if (look === "default") {
        await keyboardProbe(page, "rules-bench-after-open", false);
        // Pfeiltasten in der Registerleiste
        await step("bench arrow keys", async () => {
          const first = tabs.getByRole("tab").first(); await first.focus();
          const before = await page.evaluate(() => document.activeElement?.textContent?.trim());
          await page.keyboard.press("ArrowDown"); await page.waitForTimeout(150);
          const afterDown = await page.evaluate(() => ({ text: document.activeElement?.textContent?.trim(), selected: document.activeElement?.getAttribute("aria-selected") }));
          await page.keyboard.press("ArrowRight"); await page.waitForTimeout(150);
          const afterRight = await page.evaluate(() => ({ text: document.activeElement?.textContent?.trim(), selected: document.activeElement?.getAttribute("aria-selected") }));
          await page.keyboard.press("End"); await page.waitForTimeout(150);
          const afterEnd = await page.evaluate(() => ({ text: document.activeElement?.textContent?.trim(), selected: document.activeElement?.getAttribute("aria-selected") }));
          writeFileSync(join(OUT, "kbd__rules-bench-tablist-arrows.json"), JSON.stringify({ before, afterDown, afterRight, afterEnd }, null, 1));
          await first.click();
        });
        await page.goto(url("schmiede", "&forge=rules"));
        await keyboardProbe(page, "rules-library-with-open-draft", true);
        await page.getByRole("button", { name: "Weiter bearbeiten" }).click();
        await tabs.waitFor();
      }
      const names = await tabs.getByRole("tab").allInnerTexts();
      writeFileSync(join(OUT, `bench-tabs__${look}.json`), JSON.stringify(names));
      for (let i = 0; i < names.length; i++) {
        const label = names[i]!.trim().replace(/\s+/g, " ");
        await step(`bench tab ${label}`, async () => {
          await tabs.getByRole("tab").nth(i).click();
          await settle(page, 500);
          const slug = label.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          await capture(page, `04-bench-${String(i + 1).padStart(2, "0")}-${slug}`, look, log);
        });
      }
    });
    writeFileSync(join(OUT, `console__forge__${look}.txt`), log.join("\n"));
    await context.close();
  });

  test(`${look}: Figurenwerkstatt (Vorlagen, neue Vorlage, Erschaffen)`, async ({ browser }) => {
    test.skip(!include("actors"));
    test.setTimeout(20 * 60_000);
    const { context, page, log } = await openContext(browser, s.gm, look);
    await step("actors list", async () => {
      await page.goto(url("schmiede", "&forge=actors"));
      await page.getByRole("heading", { name: "Figurvorlagen" }).waitFor();
      await capture(page, "05-actors-list", look, log);
      if (look === "default") await keyboardProbe(page, "actors-list", true);
    });
    await step("actors template edit (Heroes)", async () => {
      await page.goto(url("schmiede", "&forge=actors"));
      await page.getByRole("button", { name: /Klingentänzerin/ }).first().click();
      await settle(page, 900);
      await capture(page, "05-actors-template-edit-heroes", look, log);
    });
    await step("actors new template", async () => {
      await page.goto(url("schmiede", "&forge=actors"));
      await page.getByRole("button", { name: "Neue Figurvorlage", exact: true }).click();
      await settle(page, 900);
      await capture(page, "05-actors-new-template", look, log);
    });
    await step("actors instantiate", async () => {
      await page.goto(url("schmiede", "&forge=actors"));
      await page.getByRole("button", { name: "Aus Vorlage Figur erschaffen", exact: true }).first().click();
      await settle(page, 900);
      await step("instantiate choose template", async () => {
        const picker = page.getByRole("combobox", { name: "Figurvorlage" });
        const value = await picker.locator("option", { hasText: "Klingentänzerin" }).first().getAttribute("value");
        if (value) await picker.selectOption(value);
        await settle(page, 700);
      });
      await capture(page, "05-actors-instantiate", look, log);
    });
    await step("forge overview", async () => {
      await page.goto(url("schmiede"));
      await settle(page, 900);
      await capture(page, "08-forge-overview", look, log);
    });
    writeFileSync(join(OUT, `console__actors__${look}.txt`), log.join("\n"));
    await context.close();
  });

  test(`${look}: Tisch (Spieltisch, Figur, Anträge)`, async ({ browser }) => {
    test.skip(!include("table"));
    test.setTimeout(20 * 60_000);
    const { context, page, log } = await openContext(browser, s.gm, look);
    await step("table default", async () => {
      await page.goto(url("tisch"));
      await page.getByRole("tablist", { name: "Tischansichten" }).waitFor();
      await capture(page, "06-table-spieltisch", look, log);
    });
    await step("table sheet heroes", async () => {
      await page.goto(url("tisch", "&tab=sheet"));
      await page.getByRole("tablist", { name: "Tischansichten" }).waitFor();
      await page.getByRole("combobox", { name: "Handelnde Figur" }).selectOption(heroId);
      await settle(page, 1200);
      await capture(page, "06-table-sheet-heroes", look, log);
    });
    await step("table sheet lite", async () => {
      await page.goto(url("tisch", "&tab=sheet", liteCampaignId));
      await page.getByRole("tablist", { name: "Tischansichten" }).waitFor();
      await page.getByRole("combobox", { name: "Handelnde Figur" }).selectOption(kaelId);
      await settle(page, 1200);
      await capture(page, "06-table-sheet-lite", look, log);
    });
    await step("table kampf", async () => {
      await page.goto(url("tisch", "&tab=kampf"));
      await settle(page, 1200);
      await capture(page, "06-table-kampf", look, log);
    });
    await step("table requests", async () => {
      await page.goto(url("tisch", "&tab=actors"));
      await settle(page, 900);
      await page.getByRole("button", { name: "Anträge", exact: true }).click();
      await settle(page, 900);
      await capture(page, "06-table-actors-antraege", look, log);
    });
    writeFileSync(join(OUT, `console__table__${look}.txt`), log.join("\n"));
    await context.close();
  });

  test(`${look}: Spieler – Ich und Figurantrag`, async ({ browser }) => {
    test.skip(!include("player"));
    test.setTimeout(20 * 60_000);
    {
      const { context, page, log } = await openContext(browser, s.sera, look);
      await step("ich heroes", async () => {
        await page.goto(url("ich"));
        const picker = page.getByRole("combobox", { name: "Deine Figur", exact: true });
        await picker.selectOption(heroId);
        await page.getByRole("button", { name: "Bogen speichern" }).waitFor();
        await settle(page, 1200);
        await capture(page, "07-ich-heroes", look, log);
        if (look === "default") await keyboardProbe(page, "ich-heroes", true);
      });
      writeFileSync(join(OUT, `console__ich__${look}.txt`), log.join("\n"));
      await context.close();
    }
    {
      const { context, page, log } = await openContext(browser, s.tamo, look);
      await step("ich lite", async () => {
        await page.goto(url("ich", "", liteCampaignId));
        const picker = page.getByRole("combobox", { name: "Deine Figur", exact: true });
        await page.getByRole("button", { name: "Bogen speichern" }).waitFor();
        if (await picker.count()) await picker.selectOption(kaelId);
        await settle(page, 1200);
        await capture(page, "07-ich-lite", look, log);
      });
      await context.close();
    }
    {
      const { context, page, log } = await openContext(browser, s.nell, look);
      await step("figurantrag empty", async () => {
        await page.goto(url("ich"));
        await page.getByRole("heading", { name: "Deine eigene Figur" }).waitFor();
        await settle(page, 900);
        await capture(page, "09-figurantrag-1-start", look, log);
      });
      await step("figurantrag form", async () => {
        await page.getByRole("button", { name: "Figur anlegen", exact: true }).click();
        await settle(page, 600);
        await capture(page, "09-figurantrag-2-form-empty", look, log);
        const picker = page.getByRole("combobox", { name: "Figurvorlage" });
        const value = await picker.locator("option", { hasText: "Klingentänzerin" }).first().getAttribute("value");
        if (value) await picker.selectOption(value);
        await page.getByLabel("Name deiner Figur").fill("Nell die Kühne");
        await settle(page, 1200);
        await capture(page, "09-figurantrag-3-form-heroes", look, log);
        if (look === "default") await keyboardProbe(page, "figurantrag-form", true);
      });
      writeFileSync(join(OUT, `console__figurantrag__${look}.txt`), log.join("\n"));
      await context.close();
    }
    {
      const { context, page, log } = await openContext(browser, s.ole, look);
      await step("figurantrag waiting", async () => {
        await page.goto(url("ich"));
        await page.getByRole("heading", { name: "Deine eigene Figur" }).waitFor();
        await settle(page, 900);
        await capture(page, "09-figurantrag-4-waiting", look, log);
      });
      await context.close();
    }
  });
}

// Zum Schluss: alle Einzeldateien zu einer knappen Uebersicht verdichten (liest die Platte, damit
// ein Worker-Neustart nach einem Fehler keine Ergebnisse verliert).
test("zz: Zusammenfassung schreiben", async () => {
  type Row = { screen: string; look: string; viewport: string; metrics: { overflow: { docOverflow: boolean; mainOverflow: boolean | null; offenders: { selector: string }[] }; smallText: { total: number; groups: { selector: string; size: string; count: number; sample: string }[] }; smallTargets: { total: number; items: { selector: string; w: number; h: number; name: string; inline: boolean }[] } };
    axe: { violations: { id: string; impact: string; help: string; nodeCount: number; nodes: { target: unknown[] }[] }[]; incomplete: { id: string; nodeCount: number }[] } | null };
  const files = readdirSync(OUT).filter(f => f.endsWith(".json") && /__(default|parchment)__(d1440|m390)\.json$/.test(f));
  const rules: Record<string, { impact: string; help: string; nodes: number; screens: Set<string>; examples: Set<string> }> = {};
  const incomplete: Record<string, { nodes: number; screens: Set<string> }> = {};
  const perScreen: string[] = [];
  for (const file of files.sort()) {
    const row = JSON.parse(readFileSync(join(OUT, file), "utf8")) as Row;
    const tag = `${row.screen}/${row.look}/${row.viewport}`;
    for (const v of row.axe?.violations ?? []) {
      const r = rules[v.id] ??= { impact: v.impact, help: v.help, nodes: 0, screens: new Set(), examples: new Set() };
      r.nodes += v.nodeCount; r.screens.add(tag); for (const n of v.nodes.slice(0, 2)) if (r.examples.size < 4) r.examples.add(JSON.stringify(n.target));
    }
    for (const v of row.axe?.incomplete ?? []) { const r = incomplete[v.id] ??= { nodes: 0, screens: new Set() }; r.nodes += v.nodeCount; r.screens.add(tag); }
    const m = row.metrics;
    perScreen.push(`${tag}: axe=${(row.axe?.violations ?? []).map(v => `${v.id}(${v.nodeCount})`).join(",") || "-"} | overflow doc=${m.overflow.docOverflow} main=${m.overflow.mainOverflow}${m.overflow.offenders.length ? " [" + m.overflow.offenders.slice(0, 3).map(o => o.selector).join(" ; ") + "]" : ""} | smallText=${m.smallText.total}${m.smallText.groups.length ? " [" + m.smallText.groups.slice(0, 3).map(g => `${g.selector} ${g.size}×${g.count}`).join(" ; ") + "]" : ""} | smallTargets=${m.smallTargets.total}${m.smallTargets.items.length ? " [" + m.smallTargets.items.filter(i => !i.inline).slice(0, 3).map(i => `${i.selector} ${i.w}x${i.h} "${i.name}"`).join(" ; ") + "]" : ""}`);
  }
  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 } as Record<string, number>;
  const lines = ["# axe violations (rule | impact | nodes | screens | examples)"];
  for (const [id, r] of Object.entries(rules).sort((a, b) => (order[a[1].impact] ?? 9) - (order[b[1].impact] ?? 9) || b[1].nodes - a[1].nodes))
    lines.push(`${id} | ${r.impact} | ${r.nodes} | ${r.screens.size}: ${[...r.screens].join(", ")} | ${[...r.examples].join(" ")} | ${r.help}`);
  lines.push("", "# axe incomplete (needs review)");
  for (const [id, r] of Object.entries(incomplete).sort((a, b) => b[1].nodes - a[1].nodes)) lines.push(`${id} | ${r.nodes} | ${r.screens.size} screens`);
  lines.push("", "# per screen", ...perScreen, "", "# skipped / failures in this run", ...skipped);
  writeFileSync(join(OUT, "summary.txt"), lines.join("\n"));
  console.log(`[ux-audit] summary: ${files.length} screen files, ${Object.keys(rules).length} violated rules → ${join(OUT, "summary.txt")}`);
});
