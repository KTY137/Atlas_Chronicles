// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";

/**
 * Der Fehler, der zweimal eine weiße Seite ergab.
 *
 * `@fastify/static` mit `wildcard: false` globt **einmal beim Start** und registriert je
 * gefundener Datei eine Route (`index.js`, Zweig `else` bei `opts.wildcard`). `index.html`
 * behält seinen Namen und damit seine Route — sein *Inhalt* wird von jedem Client-Build neu
 * geschrieben und zeigt dann auf neue Hashes. Für die gibt es keine Route mehr.
 *
 * Ergebnis: der Browser holt ein frisches `index.html`, fordert `index-NEU.js` an, bekommt vom
 * SPA-Rückfall wieder `index.html` mit `text/html`, verweigert das Modul und zeigt nichts.
 * Kein Fehlerstatus, kein Log — nur eine leere Seite. Genau die Sorte Ausfall, die man ohne
 * Test nie findet, weil im Terminal alles grün aussieht.
 */
describe("Ausgelieferte Dateien überleben einen Client-Build ohne Neustart", () => {
  let db: Db, app: FastifyInstance, root: string;
  const config = { origin: "https://chronicle.test", cookieSecret: "static-cookie-secret-long-enough-x", bootstrapToken: "static-bootstrap-secret-long-enough-x" };

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "chronicle-static-"));
    await mkdir(join(root, "assets"), { recursive: true });
    await writeFile(join(root, "index.html"), '<!doctype html><html><body><script type="module" src="/assets/frueh.js"></script></body></html>');
    await writeFile(join(root, "assets", "frueh.js"), "export const a = 1;\n");
    db = await createTestDb(); await migrate(db);
    app = await buildApp(db, { ...config, staticRoot: root });
    // Erst JETZT baut der Client neu — nach dem Start des Servers, wie im echten Betrieb.
    await writeFile(join(root, "assets", "spaet-CAFEBABE.js"), "export const b = 2;\n");
    await writeFile(join(root, "assets", "spaet-CAFEBABE.css"), ".a{color:red}\n");
  }, 30_000);
  afterAll(async () => { await app?.close(); await db?.close(); await rm(root, { recursive: true, force: true }); });

  it("liefert eine Datei aus, die es beim Start noch nicht gab", async () => {
    const response = await app.inject({ method: "GET", url: "/assets/spaet-CAFEBABE.js" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(/javascript/);
    expect(response.body).toContain("export const b");
  });

  it("liefert auch ein spät gebautes Stylesheet als Stylesheet aus", async () => {
    const response = await app.inject({ method: "GET", url: "/assets/spaet-CAFEBABE.css" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(/css/);
  });

  it("antwortet auf eine fehlende Datei mit 404 statt mit HTML", async () => {
    const response = await app.inject({ method: "GET", url: "/assets/gibt-es-nicht-DEADBEEF.js" });
    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).not.toMatch(/html/);
  });

  it("nennt auch für eine fehlende Datei mit Endung keine HTML-Seite", async () => {
    for (const pfad of ["/etwas.js", "/tief/verschachtelt/stil.css", "/bild.png"]) {
      const response = await app.inject({ method: "GET", url: pfad });
      expect(response.headers["content-type"]).not.toMatch(/html/);
      expect(response.statusCode).toBe(404);
    }
  });

  it("gibt die Anwendung weiterhin auf jedem echten Anwendungspfad zurück", async () => {
    // Der Punkt in der Query darf die Startseite nicht zu einer fehlenden Datei machen.
    for (const pfad of ["/", "/?campaign=haus.vharon", "/kampagne/eron", "/irgendein/tiefer/pfad"]) {
      const response = await app.inject({ method: "GET", url: pfad });
      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toMatch(/html/);
      expect(response.body).toContain("<!doctype html>");
    }
  });

  it("hält die API-Präfixe vom Rückfall fern", async () => {
    const response = await app.inject({ method: "GET", url: "/api/gibt-es-nicht" });
    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).not.toMatch(/html/);
  });
});
