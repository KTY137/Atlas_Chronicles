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
 * DAS BILD AUF DEM SCHIRM.
 *
 * Der ganze Weg durch einen echten Browser: importierter Eron-Artikel → Bildbestand mit Herkunft
 * und Lizenzstand → „Bilder holen" → dasselbe Portrait im Artikel, wo vorher Wikitext in einem
 * Kasten „nicht umgewandelt" stand.
 *
 * Die Bilddateien kommen aus `design/fixtures/eron/media/`, nicht aus dem Netz: die Abrufadresse
 * des Quell-Wikis wird abgefangen und mit den geernteten Bytes beantwortet. Damit prüft dieser
 * Test genau das, was das Produkt tut — der Browser holt, der Server misst — ohne von einem
 * fremden CDN abhängig zu sein.
 */
const port = 9400 + Math.floor(Math.random() * 400), origin = `http://localhost:${port}`;
const config = { origin, cookieSecret: randomBytes(32).toString("hex"), bootstrapToken: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist") };
const fixture = async (name: string) => JSON.parse(await readFile(resolve(`design/fixtures/eron/${name}`), "utf8"));

let db: Db, app: Awaited<ReturnType<typeof buildApp>>, campaign: string, session: string;

test.beforeAll(async () => {
  db = await createTestDb(); await migrate(db);
  const identity = createIdentity(db, config), campaigns = createCampaigns(db);
  const gm = await identity.bootstrap("Kaya");
  session = (await identity.issueSession(gm.userId)).value;
  campaign = (await campaigns.createCampaign(gm.userId, { name: "Eron" })).id;
  const articles = await fixture("articles.json") as { title: string }[];
  const imports = createImports(db, {});
  const preview = await imports.previewEron(gm.userId, campaign, {
    articles: articles.filter(row => ["Bodin", "Song Kayn", "Yunis"].includes(row.title)),
    templates: await fixture("templates.json"), media: await fixture("media.json"),
    wikiUrl: "https://eron.fandom.com/de/",
  });
  await imports.acceptEron(gm.userId, campaign, preview.artifactId, preview.entries.map(entry => entry.id));
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => { await app?.close(); await db?.close(); });

test("die Bilder des Wikis kommen mit und stehen im Artikel", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));

  // Das Quell-CDN wird durch die echten geernteten Bytes ersetzt. Ausgeliefert wird WebP unter
  // einem .jpg-Namen — genau die Lüge, die der Server anschließend selbst aufdecken muss.
  const geliefert: string[] = [];
  const dateien: Record<string, string> = { "Bodin.jpg": "Bodin.webp", "SongKayn.png": "SongKayn.webp", "Yunis.jpg": "Yunis.webp" };
  await page.route("https://static.wikia.nocookie.net/**", async route => {
    // Die Adresse ist `/eron/images/2/20/Bodin.jpg/revision/latest?cb=…` — der Dateiname steht
    // mitten im Pfad, nicht am Ende. Genau deshalb wird hier gesucht statt abgeschnitten.
    const segmente = new URL(route.request().url()).pathname.split("/").map(part => decodeURIComponent(part));
    const name = segmente.find(part => Object.hasOwn(dateien, part));
    if (!name) return route.fulfill({ status: 404, body: "" });
    geliefert.push(name);
    return route.fulfill({ status: 200, contentType: "image/webp", body: await readFile(resolve(`design/fixtures/eron/media/${dateien[name]!}`)) });
  });

  await page.context().addCookies([{ name: "chronicle_session", value: session, url: origin, httpOnly: true, sameSite: "Strict" }]);
  await page.goto(`${origin}/?campaign=${campaign}&stage=wiki`);
  await expect(page.getByRole("heading", { name: "Die Chronik" })).toBeVisible();

  // 1. Der Artikel nennt sein Bild, auch bevor eine einzige Datei geholt wurde.
  await page.getByRole("button", { name: /^Bodin/ }).first().click();
  await expect(page.locator(".article-figure.figure-missing")).toBeVisible();
  await expect(page.locator(".figure-placeholder")).toContainText("Bodin.jpg");
  await expect(page.locator(".figure-placeholder")).toContainText("noch nicht geholt");
  await page.screenshot({ path: "test-results/wiki-medien-1-ohne-bild.png", fullPage: false });

  // 2. Der Bestand: Herkunft, Lizenzstand und der Knopf, der die Dateien holt.
  await page.getByRole("button", { name: "Bilder", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bilder mit belegter Herkunft." })).toBeVisible();
  const offen = page.getByRole("button", { name: /Dateien holen$/ });
  await expect(offen).toBeVisible();
  await expect(page.locator(".medien-marke-unbekannt").first()).toBeVisible();
  await page.screenshot({ path: "test-results/wiki-medien-2-bestand.png", fullPage: false });

  // 3. Holen. Der Browser lädt beim Wiki, der Server misst die Bytes.
  await offen.click();
  // Streng formuliert: keine Datei darf fehlschlagen. Eine laxere Zusicherung hätte den Fall
  // „alles fehlgeschlagen" als Erfolg gelesen — genau das ist beim ersten Lauf passiert.
  await expect(page.getByText(/^3 von 3 Dateien geholt\.$/)).toBeVisible({ timeout: 60_000 });
  expect(geliefert.sort()).toEqual(["Bodin.jpg", "SongKayn.png", "Yunis.jpg"]);
  // Der Name im Wiki sagt JPEG, geliefert wurde WebP — und genau das meldet die Oberfläche.
  await expect(page.getByText(/widerspricht der tatsächliche Inhalt der Dateiendung/)).toBeVisible();
  await page.screenshot({ path: "test-results/wiki-medien-3-geholt.png", fullPage: false });

  // 4. Dasselbe Portrait steht jetzt im Artikel.
  await page.getByRole("button", { name: /^Bodin/ }).first().click();
  const bild = page.locator(".article-figure .figure-image").first();
  await expect(bild).toBeVisible();
  expect(await bild.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(512);
  await expect(page.locator(".article-figure.figure-missing")).toHaveCount(0);
  await page.screenshot({ path: "test-results/wiki-medien-4-im-artikel.png", fullPage: false });

  expect(errors).toEqual([]);
});

/**
 * Der zweite Weg hinein. Wer sein Wiki bereits exportiert hat, lädt Dateien hoch statt live zu
 * laden — und bekam dabei bis eben kein Dateiverzeichnis unter. Ohne dieses Feld hätte genau
 * dieser Nutzer Bilder ohne Uploader, ohne Lizenzstand und ohne Abrufadresse importiert.
 */
test("der Datei-Upload nimmt das Dateiverzeichnis mit", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.context().addCookies([{ name: "chronicle_session", value: session, url: origin, httpOnly: true, sameSite: "Strict" }]);
  await page.goto(`${origin}/?campaign=${campaign}&stage=wiki`);
  await page.getByRole("button", { name: "Wiki importieren" }).click();
  await page.getByLabel("Adresse des Quell-Wikis").fill("https://eron.fandom.com/de/");
  await page.getByRole("button", { name: "Bereits exportierte Dateien hochladen" }).click();

  const felder = page.locator('.import-files input[type="file"]');
  await expect(felder).toHaveCount(3);
  await felder.nth(0).setInputFiles(resolve("design/fixtures/eron/articles.json"));
  await felder.nth(1).setInputFiles(resolve("design/fixtures/eron/templates.json"));
  await felder.nth(2).setInputFiles(resolve("design/fixtures/eron/media.json"));
  await page.getByRole("button", { name: "Importvorschau erstellen" }).click();

  // Die Bildbilanz steht VOR der Annahme: wer importiert, soll vorher wissen, wie viele Dateien
  // mitkommen und bei wie vielen davon niemand die Lizenz kennt.
  await expect(page.getByRole("heading", { name: "Die Bilder" })).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("41 Dateien", { exact: true })).toBeVisible();
  await expect(page.getByText(/Bei 38 von 41 Dateien nennt das Quell-Wiki keine Lizenz/)).toBeVisible();
  await page.screenshot({ path: "test-results/wiki-medien-5-upload-bilanz.png", fullPage: false });
  expect(errors).toEqual([]);
});
