import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createImports } from "../packages/server/src/domain/imports.ts";

/**
 * DIE ORDNUNG AUF DEM SCHIRM.
 *
 * Der ganze Weg durch einen echten Browser: das echte Eron-Wiki wird importiert, seine
 * `[[Kategorie:…]]`-Angaben werden dabei aufgehoben — und danach steht die Chronik nicht mehr
 * als alphabetische Liste da, sondern als Übersicht, als aufklappbarer Baum und als Pfad über
 * dem Artikel.
 *
 * Der Test prüft die Sicht der SPIELLEITUNG. Die Silhouette — was eine Spielerin von den ihr
 * unbekannten Artikeln sehen darf — ist eine Aussage über den Server und steht deshalb in
 * `packages/server/test/wiki-uebersicht.test.ts`, wo sie über den Antwortkörper belegt werden
 * kann statt über Pixel.
 */
const port = 9800 + Math.floor(Math.random() * 150), origin = `http://localhost:${port}`;
const config = { origin, cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
const fixture = async (name: string) => JSON.parse(await readFile(resolve(`design/fixtures/eron/${name}`), "utf8"));

let db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaign: string, session: string;

test.beforeAll(async () => {
  db = await createTestDb(); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db);
  const gm = await identity.bootstrap("Kaya");
  session = (await identity.issueSession(gm.userId)).value;
  campaign = (await campaigns.createCampaign(gm.userId, { name: "Eron" })).id;
  const imports = createImports(db, {});
  const preview = await imports.previewEron(gm.userId, campaign, {
    articles: await fixture("articles.json"), templates: await fixture("templates.json"),
    wikiUrl: "https://eron.fandom.com/de/",
  });
  await imports.acceptEron(gm.userId, campaign, preview.artifactId, preview.entries.map(entry => entry.id));
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => { await app?.close(); await db?.close(); });

test("die Chronik zeigt ihre Ordnung: Übersicht, Baum und Pfad", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.context().addCookies([{ name: "chronicle_session", value: session, url: origin, httpOnly: true, sameSite: "Strict" }]);
  await page.goto(`${origin}/?campaign=${campaign}&stage=wiki`);

  // 1. Die Landefläche ist keine leere Bühne mehr, sondern die Ordnung der Welt.
  // Großzügig: der erste Aufruf baut die Liste über 73 Artikel auf, und der Server läuft hier
  // unter tsx ohne Vorwärmung.
  await expect(page.getByRole("heading", { name: "Die Ordnung der Welt", level: 1 })).toBeVisible({ timeout: 60_000 });
  const karten = page.locator(".uebersicht-karte");
  await expect(karten.first()).toBeVisible();
  expect(await karten.count()).toBeGreaterThan(1);
  await page.screenshot({ path: "test-results/wiki-navigation-1-uebersicht.png", fullPage: false });

  // 2. Die Seitenleiste gruppiert, statt alles alphabetisch aufzureihen.
  const baum = page.getByRole("navigation", { name: "Ordnung der Chronik" });
  await expect(baum).toBeVisible();
  const gruppen = baum.locator(".nav-gruppe-kopf");
  expect(await gruppen.count()).toBeGreaterThan(1);
  // Die aus dem Quellwiki gehobene Kategorie steht wirklich da.
  await expect(baum.getByRole("button", { name: /Charaktere/i })).toBeVisible();
  await page.screenshot({ path: "test-results/wiki-navigation-2-baum.png", fullPage: false });

  // 3. Ein Artikel aus einer Kategorie trägt seine Kategorie sichtbar am Kopf.
  // Nicht auf die Gruppenüberschrift klicken: auf oberster Ebene ist sie schon offen, ein Klick
  // klappte sie zu. Der Artikel wird innerhalb SEINER Gruppe gegriffen.
  const charaktere = baum.locator(".nav-gruppe").filter({ has: page.getByRole("button", { name: /^Charaktere/i }) }).first();
  const ersterArtikel = charaktere.locator(".nav-artikel-knopf").first();
  const name = (await ersterArtikel.textContent())?.trim() ?? "";
  await ersterArtikel.click();
  await expect(page.locator(".kategorie-chips")).toContainText(/Charaktere/i);
  await page.screenshot({ path: "test-results/wiki-navigation-3-artikel.png", fullPage: false });
  expect(name.length).toBeGreaterThan(0);

  // Eine Oberfläche, die nur aussieht, als ginge sie, ist keine Oberfläche.
  expect(errors).toEqual([]);
});
