// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { test, expect, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import type { ChronistStartAck, ChronistSuggestionPage } from "@chronicle/protocol";
import { buildApp } from "../packages/server/src/app.ts";
import { createTestDb, migrate, type Db } from "../packages/server/src/db/index.ts";
import { createIdentity } from "../packages/server/src/identity/index.ts";
import { createCampaigns } from "../packages/server/src/domain/campaigns.ts";
import { createDocuments } from "../packages/server/src/domain/documents.ts";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import { createChronistHttpBinding } from "../packages/server/src/chronist-providers/http.ts";
import type { ChronistRuntimeConfig } from "../packages/server/src/domain/chronist/runtime.ts";

const port = 11300 + Math.floor(Math.random() * 300), origin = `http://localhost:${port}`;
let db: Db, app: Awaited<ReturnType<typeof buildApp>>, gm: { userId: string; value: string };
let calls: { model: string; content: string }[] = [], holdNext = false, clockOffset = 0;
const sourceText = "Die Gruppe kehrte nach Andaria zurück und erreichte das Nordtor.";
const recordedText = "Die Gruppe kehrte nach Andaria zurück.";
const paragraph = (text: string) => ({ inhalt: { kind: "absatz" as const, inhalt: [{ text, marks: [] }] } });

/** Recorded provider output only. All application requests cross real auth, HTTP and DB;
 * the sole transport double replaces the model and never uses a key or network provider. */
const recordedFetch: typeof fetch = async (_input, options) => {
  const body = JSON.parse(String(options?.body));
  const prompt = JSON.parse(body.messages.find((message: { role: string }) => message.role === "user").content);
  calls.push({ model: body.model, content: JSON.stringify(prompt) });
  if (holdNext) {
    holdNext = false;
    await new Promise<never>((_resolve, reject) => {
      if (options?.signal?.aborted) reject(new Error("recorded cancellation"));
      else options?.signal?.addEventListener("abort", () => reject(new Error("recorded cancellation")), { once: true });
    });
  }
  const source = prompt.excerpts[0];
  const output = { schemaVersion: 1, candidates: [{ kind: prompt.mode === "abriss" ? "abriss" : "ereignis", text: recordedText,
    citations: [{ sourceId: source.sourceId, from: source.from, to: source.to }], date: null }] };
  return new Response(`${JSON.stringify({ message: { content: JSON.stringify(output) }, done: true, prompt_eval_count: 120, eval_count: 40 })}\n`, { headers: { "content-type": "application/x-ndjson" } });
};

test.beforeAll(async () => {
  const local = createChronistHttpBinding({ id: "recorded-local", label: "Lokales Testmodell", profileId: "ollama-chat-1", location: "lokal", baseUrl: "http://127.0.0.1:1", models: ["recorded-local-model"] }, "recorded-local-model", { fetch: recordedFetch });
  const external = createChronistHttpBinding({ id: "recorded-external", label: "Externer Testanbieter", profileId: "ollama-chat-1", location: "fremd", baseUrl: "https://recorded.invalid", models: ["recorded-external-model"] }, "recorded-external-model", { fetch: recordedFetch });
  const offline = createChronistHttpBinding({ id: "recorded-offline", label: "Lokales Modell noch nicht eingerichtet", profileId: "ollama-chat-1", location: "lokal", available: false, baseUrl: "http://127.0.0.1:1", models: ["offline-model"] }, "offline-model", { fetch: recordedFetch });
  const chronist: ChronistRuntimeConfig = { providers: [external.description, local.description, offline.description], resolveProvider: (id, model) => {
    const binding = id === local.description.id ? local : id === external.description.id ? external : id === offline.description.id ? offline : undefined;
    return binding?.description.models.includes(model) ? binding : undefined;
  } };
  const config = { origin, bootstrapToken: randomBytes(32).toString("hex"), cookieSecret: randomBytes(32).toString("hex"), staticRoot: resolve("packages/client/dist"), chronist, now: () => Date.now() + clockOffset };
  db = await createTestDb(); await migrate(db); gm = await createIdentity(db, config).bootstrap("Chronist Spielleitung");
  app = await buildApp(db, config); await app.listen({ host: "127.0.0.1", port });
});
test.afterAll(async () => { await app?.close(); await db?.close(); });
test.beforeEach(() => { calls = []; holdNext = false; });

async function setup(page: Page) {
  const campaign = await createCampaigns(db).createCampaign(gm.userId, { name: "Chronist Browserprüfung" });
  const docs = createDocuments(db), entry = await docs.saveEntry(gm.userId, campaign.id, { title: "Die Rückkehr", passages: [paragraph(sourceText)] });
  await page.context().addCookies([{ name: "chronicle_session", value: gm.value, url: origin, httpOnly: true, secure: true, sameSite: "Strict" }]);
  await page.goto(`${origin}/?campaign=${campaign.id}&stage=wiki&tab=chronist`);
  await expect(page.getByRole("heading", { name: "Der Chronist", exact: true })).toBeVisible();
  return { campaign, entry, docs, path: `/api/campaigns/${campaign.id}/chronist` };
}
async function selectSource(page: Page, entryId: string) {
  await page.getByRole("combobox", { name: "Artikel auswählen", exact: true }).selectOption(entryId);
  await page.getByRole("button", { name: "Diese 1 Passagen wählen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "1 Passagen ausgewählt" })).toBeVisible();
}
async function preview(page: Page) {
  const response = page.waitForResponse(reply => reply.url().endsWith("/chronist/runs/preview") && reply.request().method() === "POST");
  await page.getByRole("button", { name: "Umfang und Kosten vorschauen", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole("region", { name: "Vorschau der Auswertung" })).toBeVisible();
}
async function start(page: Page) {
  const response = page.waitForResponse(reply => reply.url().endsWith("/chronist/runs") && reply.request().method() === "POST");
  await page.getByRole("button", { name: "Auswertung starten", exact: true }).click();
  const reply = await response; expect(reply.status()).toBe(202);
  return await reply.json() as ChronistStartAck;
}

test("lokale Prosa: Quellen, wiederherstellbarer Entwurf und Antrag über echtes HTTP/DB", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const { campaign, entry } = await setup(page);
  await expect(page.getByRole("combobox", { name: "Anbieter", exact: true })).toHaveValue("recorded-local");
  await selectSource(page, entry.entryId); await preview(page);
  expect(calls).toHaveLength(0);
  await expect(page.getByRole("region", { name: "Vorschau der Auswertung" })).toContainText("Kosten unbekannt");
  await start(page);
  await expect(page.getByRole("heading", { name: "Bereit zur Durchsicht", exact: true })).toBeVisible();
  await page.locator(".chronist-suggestion").first().click();
  await expect(page.getByRole("region", { name: "Vorschlag durchsehen" }).getByText(sourceText, { exact: true }).first()).toBeVisible();
  await page.getByRole("textbox", { name: "Text von Abschnitt 1", exact: true }).fill("Die Gefährten erreichten gemeinsam das Nordtor.");
  let reentryDialogs = 0;
  const reentry = async (dialog: import("@playwright/test").Dialog) => { reentryDialogs++; await dialog.dismiss(); };
  page.on("dialog", reentry); await page.getByRole("button", { name: "Chronist", exact: true }).click(); page.off("dialog", reentry);
  expect(reentryDialogs).toBe(0);
  page.once("dialog", dialog => dialog.dismiss()); await page.getByRole("button", { name: "Neue Aufgabe", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Text von Abschnitt 1", exact: true })).toHaveValue("Die Gefährten erreichten gemeinsam das Nordtor.");
  page.once("dialog", dialog => dialog.accept()); await page.reload();
  await page.getByRole("button", { name: "Läufe & Durchsicht", exact: true }).click();
  await page.locator(".chronist-suggestion").first().click();
  await page.getByRole("button", { name: "Lokalen Entwurf wiederherstellen", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Text von Abschnitt 1", exact: true })).toHaveValue("Die Gefährten erreichten gemeinsam das Nordtor.");
  await page.getByRole("button", { name: "Feld hinzufügen", exact: true }).click();
  await page.getByRole("textbox", { name: "Werte von Abschnitt 2", exact: true }).fill("Am Abend");
  await page.getByRole("button", { name: "Entwurf speichern", exact: true }).click();
  await expect(page.getByText("Entwurf gespeichert.", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Titel des neuen Artikels", exact: true }).fill("Rückkehr – geprüfter Antrag");
  await page.getByRole("button", { name: "Als Antrag einreichen", exact: true }).click();
  await page.getByRole("button", { name: "Artikel mit Antrag öffnen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Rückkehr – geprüfter Antrag", exact: true })).toBeVisible();
  await expect(page.getByText("Die Gefährten erreichten gemeinsam das Nordtor.", { exact: true })).toBeVisible();
  const passages = await db.query<{ geltung: string; praegung: unknown }>("SELECT p.geltung,p.praegung FROM passages p JOIN entries e ON e.id=p.entry_id WHERE e.campaign_id=$1 AND e.title=$2", [campaign.id, "Rückkehr – geprüfter Antrag"]);
  expect(passages.rows).toHaveLength(2); expect(passages.rows.every(row => row.geltung === "antrag" && row.praegung === null)).toBe(true);
  expect(calls).toHaveLength(1); expect(errors).toEqual([]);
});

test("Telefon: Sitzungsnotiz ausdrücklich speichern, Kontext übernehmen und externen Abriss freigeben", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { campaign } = await setup(page), game = createGameplay(db);
  const scene = await game.createScene(gm.userId, campaign.id, { name: "Das Nordtor", fictionDate: "Herbstabend", entryIds: [] });
  const session = await game.startScene(gm.userId, campaign.id, scene.id);
  await page.getByRole("button", { name: /Sitzung auswerten/ }).click();
  await page.getByRole("combobox", { name: "Spielabend auswählen", exact: true }).selectOption(String(session.id));
  await page.getByRole("button", { name: "Szenenangaben & bestätigte Würfe ansehen", exact: true }).click();
  await page.getByRole("checkbox", { name: "Szene: Das Nordtor · Herbstabend", exact: true }).check();
  await page.getByRole("button", { name: "1 Angaben in Notizentwurf übernehmen", exact: true }).click();
  const before = await db.query("SELECT id FROM entries WHERE campaign_id=$1 AND title LIKE 'Sitzungsnotizen%'", [campaign.id]); expect(before.rows).toHaveLength(0);
  page.once("dialog", dialog => dialog.dismiss()); await page.getByRole("button", { name: /Zusammenfassung erstellen/ }).click();
  await expect(page.getByRole("textbox", { name: "Artikeltitel", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Text der Passage 1", exact: true }).fill(sourceText);
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.getByText("Sitzungsnotiz gespeichert. Wähle jetzt ihre Passagen als Quellen aus.", { exact: true })).toBeVisible();
  const saved = await db.query<{ id: string }>("SELECT id FROM entries WHERE campaign_id=$1 AND title LIKE 'Sitzungsnotizen%'", [campaign.id]); expect(saved.rows).toHaveLength(1);
  await selectSource(page, saved.rows[0]!.id); await preview(page); await start(page);
  await expect(page.getByRole("heading", { name: "Bereit zur Durchsicht", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Neue Aufgabe", exact: true }).click();
  await page.getByRole("button", { name: /Zusammenfassung erstellen/ }).click();
  await page.getByRole("combobox", { name: "Anbieter", exact: true }).selectOption("recorded-external");
  await preview(page);
  await expect(page.getByRole("button", { name: "Auswertung starten", exact: true })).toBeDisabled();
  // Die Freigabe kommt vom Server, gilt fünf Minuten und steht sichtbar im Formular.
  const vorschau = page.getByRole("region", { name: "Vorschau der Auswertung" });
  await expect(vorschau).toContainText("Diese Freigabe gilt noch");
  await expect(vorschau).toContainText("Zeichen je Token");
  const beforeExternal = calls.length;
  await page.getByRole("checkbox", { name: /Ich gebe diese 1 Passagen/ }).check();
  const started = page.waitForRequest(request => request.url().endsWith("/chronist/runs") && request.method() === "POST");
  await start(page);
  const gesendet = JSON.parse((await started).postData() ?? "{}") as { externalConsent?: { token?: string } };
  expect(typeof gesendet.externalConsent?.token).toBe("string");
  await expect(page.getByRole("heading", { name: "Bereit zur Durchsicht", exact: true })).toBeVisible();
  expect(calls.length).toBeGreaterThan(beforeExternal); expect(calls.at(-1)?.model).toBe("recorded-external-model");
  // Der dauerhafte Beleg trägt Ablauf und Abdruck der Freigabe, niemals das Token selbst.
  const beleg = await db.query<{ evidence: { controlEvidence: { freigabeHash: string | null; freigabeAblaufAt: number | null }[] } }>(
    "SELECT evidence FROM chronist_laeufe WHERE campaign_id=$1 ORDER BY created_at DESC LIMIT 1", [campaign.id]);
  const control = beleg.rows[0]!.evidence.controlEvidence[0]!;
  expect(control.freigabeHash).toMatch(/^[a-f0-9]{64}$/);
  expect(control.freigabeAblaufAt).toBeGreaterThan(0);
  expect(JSON.stringify(beleg.rows[0])).not.toContain(gesendet.externalConsent!.token!);
  await page.locator(".chronist-suggestion").last().click();
  await expect(page.getByRole("heading", { name: "Erzählerischer Abriss", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("veraltete Quellen sperren Einreichung; Abbruch und Fortsetzung bewahren den Verbrauch", async ({ page }) => {
  const { campaign, entry, docs, path } = await setup(page);
  await selectSource(page, entry.entryId); await preview(page); const ack = await start(page);
  await expect(page.getByRole("heading", { name: "Bereit zur Durchsicht", exact: true })).toBeVisible();
  await page.locator(".chronist-suggestion").first().click();
  await page.getByRole("region", { name: "Vorschlag durchsehen" }).evaluate(element => element.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: test.info().outputPath("durchsicht-desktop.png") });
  const source = await docs.source(campaign.id, entry.entryId);
  await docs.saveEntry(gm.userId, campaign.id, { title: "Die Rückkehr – ergänzt", expectedVersion: source.entry.version, passages: source.passagen.map(p => ({ pid: p.pid, inhalt: p.inhalt })) }, entry.entryId);
  await expect(page.getByText(/Mindestens eine Quelle hat sich geändert/)).toBeVisible();
  await page.getByRole("textbox", { name: "Titel des neuen Artikels", exact: true }).fill("Darf nicht eingereicht werden");
  await expect(page.getByRole("button", { name: "Als Antrag einreichen", exact: true })).toBeDisabled();
  const projected = await page.request.get(`${origin}${path}/suggestions?runId=${ack.runId}`); expect((await projected.json() as ChronistSuggestionPage).suggestions[0]?.stale).toBe(true);
  await page.getByRole("button", { name: "Neue Aufgabe", exact: true }).click();
  await selectSource(page, entry.entryId); await preview(page); holdNext = true; await start(page);
  await expect.poll(() => calls.length).toBe(2);
  await page.getByRole("button", { name: "Auswertung abbrechen", exact: true }).click();
  await expect(page.getByRole("button", { name: "Auswertung fortsetzen", exact: true })).toBeVisible();
  // The recorded remote call may have executed until its deadline. Advance the fixture
  // clock past that boundary; polling itself must never replay an uncertain request.
  expect(calls.length).toBe(2); clockOffset += 61_000;
  const unknown = page.getByRole("checkbox", { name: /Ich habe den ungewissen Ausgang gelesen/ });
  if (await unknown.isVisible()) await unknown.check();
  await page.getByRole("button", { name: "Auswertung fortsetzen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bereit zur Durchsicht", exact: true })).toBeVisible();
  expect(calls.length).toBe(3);
});

test("ohne eingerichtetes Modell bleiben Regelbefunde und der Vorschlagsstapel benutzbar", async ({ page }) => {
  const { campaign, docs } = await setup(page);
  const field = (schluessel: string, label: string, text: string) => ({ inhalt: { kind: "feld" as const, schluessel, label, mehrwertig: false, klauselKandidat: false, werte: [[{ text, marks: [] }]] } });
  const entry = await docs.saveEntry(gm.userId, campaign.id, { title: "Alrik – offene Datierung", passages: [field("Geburt", "Geburtsdatum", "866"), field("Tod", "Todesdatum", "819"), paragraph(sourceText)] });
  await page.getByRole("button", { name: "Chronist aktualisieren", exact: true }).click();
  await expect(page.getByRole("region", { name: "Regelbefunde", exact: true })).toContainText("Alrik – offene Datierung");
  await page.getByRole("combobox", { name: "Artikel auswählen", exact: true }).selectOption(entry.entryId);
  await page.getByRole("button", { name: "Diese 3 Passagen wählen", exact: true }).click();
  await page.getByRole("combobox", { name: "Anbieter", exact: true }).selectOption("recorded-offline");
  await preview(page);
  await expect(page.getByRole("button", { name: "Auswertung starten", exact: true })).toBeEnabled();
  await start(page);
  await expect(page.getByRole("region", { name: "Laufstand", exact: true })).toContainText("Dieser Anbieter ist noch nicht bereit");
  await expect(page.locator(".chronist-suggestion").first()).toBeVisible();
  expect(calls).toHaveLength(0);
  await page.locator(".wiki-kopf").getByRole("button", { name: "Übersicht", exact: true }).click();
  expect(new URL(page.url()).searchParams.get("tab")).not.toBe("chronist");
  await page.reload(); await expect(page.locator(".chronist-workbench")).toHaveCount(0);
});

test("eine parallele Entwurfsänderung wird verglichen; Verwerfen bewahrt das Original", async ({ page }) => {
  const { entry, path } = await setup(page);
  await selectSource(page, entry.entryId); await preview(page); const ack = await start(page);
  await expect(page.getByRole("heading", { name: "Bereit zur Durchsicht", exact: true })).toBeVisible();
  await page.locator(".chronist-suggestion").first().click();
  await page.getByRole("textbox", { name: "Text von Abschnitt 1", exact: true }).fill("Mein noch ungespeicherter Entwurf.");
  const list = await page.request.get(`${origin}${path}/suggestions?runId=${ack.runId}`), proposal = (await list.json() as ChronistSuggestionPage).suggestions[0]!;
  const parallel = await page.request.put(`${origin}${path}/suggestions/${proposal.id}`, { headers: { origin }, data: { expectedVersion: proposal.version, blocks: [paragraph("Parallel gespeicherte Fassung.").inhalt] } });
  expect(parallel.status()).toBe(200);
  await expect(page.getByText(/Dieser Vorschlag wurde anderswo geändert/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Text von Abschnitt 1", exact: true })).toHaveValue("Mein noch ungespeicherter Entwurf.");
  await expect(page.getByRole("button", { name: "Entwurf speichern", exact: true })).toBeDisabled();
  await page.getByText("Aktuelle gespeicherte Fassung vergleichen", { exact: true }).click();
  await expect(page.getByText("Parallel gespeicherte Fassung.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Meinen verglichenen Entwurf weiterbearbeiten", exact: true }).click();
  await page.getByRole("button", { name: "Entwurf speichern", exact: true }).click();
  await expect(page.getByText("Entwurf gespeichert.", { exact: true })).toBeVisible();
  await page.getByRole("region", { name: "Vorschlag durchsehen" }).evaluate(element => element.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: test.info().outputPath("quellen-und-entwurf.png") });
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Vorschlag verwerfen", exact: true }).click();
  await expect(page.getByText("Vorschlag verworfen.", { exact: true })).toBeVisible();
  const discarded = await page.request.get(`${origin}${path}/suggestions/${proposal.id}`), value = await discarded.json();
  expect(value.state).toBe("verworfen"); expect(value.originalBlocks).toEqual([paragraph(recordedText).inhalt]); expect(value.submissionAck).toBeNull();
});
