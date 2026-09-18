// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Zwei Türen zu derselben Welt — und was an ihnen getrennt bleiben muss.
 *
 * Seit dem 17.09.2026 antwortet eine Heimnetz-Welt unter zwei Adressen: ihrer eigenen, festen
 * (`http://localhost:<Port>`, hier arbeitet die Spielleitung) und der Heimnetz-Adresse (hier
 * kommen Mitspieler herein). Das ist der Grund, dass die Spielleitung nicht mehr ausgesperrt
 * wird, wenn das Netz eine neue IP vergibt — aber es verdoppelt die Angriffsfläche, wenn die
 * Türen nicht sauber getrennt sind. Genau das hält diese Datei fest:
 *
 *  - **Das `Secure` am Sitzungscookie richtet sich nach der Tür.** Im Heimnetz läuft die Welt
 *    über HTTP; ein `Secure` machte das Cookie dort stumm. Auf der eigenen Adresse wäre sein
 *    Fehlen dagegen eine stille Aufweichung.
 *  - **Eine fremde Wirtsangabe kommt nicht herein.** Nur die beiden Adressen dieser Welt.
 *  - **Kein Wechsel zwischen den Türen.** Eine Seite von der Heimnetz-Adresse darf nichts an
 *    der eigenen Adresse auslösen und umgekehrt — sonst wäre die zweite Tür ein CSRF-Weg auf
 *    die erste.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.ts";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";

const EIGEN = "http://localhost:45101";
const HEIMNETZ = "http://192.168.1.2:45101";
const config = { origin: EIGEN, lanOrigin: HEIMNETZ, cookieSecret: "test-cookie-secret-with-at-least-32-characters",
  bootstrapToken: "test-bootstrap-token-at-least-32-characters" };

let db: Db, app: FastifyInstance;
beforeAll(async () => { db = await createTestDb(); await migrate(db); app = await buildApp(db, config); }, 30_000);
afterAll(async () => { await app?.close(); await db?.close(); });

const anTuer = (tuer: string, extra: Record<string, string> = {}) =>
  ({ host: new URL(tuer).host, origin: tuer, ...extra });

it("stellt das Sitzungscookie je Tür passend aus — Secure auf der eigenen Adresse, ohne im Heimnetz", async () => {
  const eigen = await app.inject({ method: "POST", url: "/api/setup",
    headers: anTuer(EIGEN, { authorization: `Bearer ${config.bootstrapToken}` }), payload: { displayName: "Kaya" } });
  expect(eigen.statusCode).toBe(200);
  expect(eigen.headers["set-cookie"]).toMatch(/HttpOnly; Secure; SameSite=Strict/);

  // Dieselbe Welt, dieselbe Anmeldung — aber über die Heimnetz-Tür abgemeldet: ohne Secure,
  // sonst käme das Löschcookie im Heimnetz gar nicht an.
  const cookie = String(eigen.headers["set-cookie"]).split(";")[0]!;
  const abmelden = await app.inject({ method: "POST", url: "/api/logout", headers: anTuer(HEIMNETZ, { cookie }) });
  expect(abmelden.statusCode).toBe(200);
  expect(abmelden.headers["set-cookie"]).not.toMatch(/; Secure(?:;|$)/);
});

it("nennt je Tür die richtige Erreichbarkeit — Passkeys nur auf der eigenen Adresse", async () => {
  expect((await app.inject({ method: "GET", url: "/api/reachability", headers: anTuer(EIGEN) })).json())
    .toMatchObject({ passkeyEligible: true, secureContext: true });
  // Der Grund, dass es die eigene Adresse überhaupt gibt: auf einer IP sind Passkeys unmöglich,
  // im Heimnetz gab es also vorher keinen selbstbedienbaren Weg zurück.
  expect((await app.inject({ method: "GET", url: "/api/reachability", headers: anTuer(HEIMNETZ) })).json())
    .toMatchObject({ passkeyEligible: false, secureContext: false, selfHostTransport: "explicit-private-lan" });
});

it("weist eine fremde Wirtsangabe ab, auch wenn sie den richtigen Ursprung mitbringt", async () => {
  for (const fremd of ["chronicle.example:45101", "192.168.1.3:45101", "127.0.0.1:45101", "localhost:45102", ""]) {
    const antwort = await app.inject({ method: "GET", url: "/api/setup", headers: { host: fremd, origin: EIGEN } });
    expect(antwort.statusCode, fremd).toBe(404);
  }
});

it("lässt keine Tür auf die andere durchgreifen", async () => {
  // Eine Seite, die im Heimnetz geladen wurde, schreibt an die eigene Adresse — und umgekehrt.
  for (const [tuer, fremderUrsprung] of [[EIGEN, HEIMNETZ], [HEIMNETZ, EIGEN]] as const) {
    const antwort = await app.inject({ method: "POST", url: "/api/campaigns",
      headers: { host: new URL(tuer).host, origin: fremderUrsprung }, payload: { name: "Andaria" } });
    expect(antwort.statusCode, `${fremderUrsprung} -> ${tuer}`).toBe(404);
  }
  // Ganz ohne Ursprung ebenfalls nicht.
  expect((await app.inject({ method: "POST", url: "/api/campaigns", headers: { host: new URL(EIGEN).host }, payload: { name: "Andaria" } })).statusCode).toBe(404);
});

it("lässt Lesen an beiden Türen zu — sonst wäre das Heimnetz sinnlos", async () => {
  for (const tuer of [EIGEN, HEIMNETZ])
    expect((await app.inject({ method: "GET", url: "/api/setup", headers: anTuer(tuer) })).statusCode, tuer).toBe(200);
});
