// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Eine Welt hat eine feste eigene Adresse — und im Heimnetz eine zweite dazu.
 *
 * **Was vorher galt und warum es nicht trug.** Im Heimnetzbetrieb WAR die Heimnetz-Adresse die
 * Adresse der Welt; `http://localhost:<Port>` antwortete dann gar nicht. Damit wechselte die
 * Adresse einer Welt mit dem Netz — und mit ihr der Cookie-Topf des Fensters, der nach der
 * Adresse heißt. Die Spielleitung stand nach jedem Netzwechsel vor der Spieler-Anmeldeseite
 * ihrer eigenen Welt. Schlimmer noch: auf einer IP-Adresse sind Passkeys unmöglich
 * (`passkeyEligible` ist dort falsch), also gab es im Heimnetz überhaupt keinen
 * selbstbedienbaren Weg zurück — nur den Zugangscode aus dem Hostfenster.
 *
 * **Was jetzt gilt.** `origin` ist immer die eigene Adresse der Welt auf diesem Rechner,
 * `http://localhost:<Port>`, und sie ändert sich nie. `lanAddress` schaltet eine ZWEITE
 * Adresse frei, unter der dieselbe Welt im Heimnetz erreichbar ist — das ist die Adresse, die
 * Mitspieler bekommen. Der Zuhörer auf der Heimnetz-Adresse bleibt genauso ausdrücklich
 * gewählt wie vorher: ohne `lanAddress` hört die Welt ausschließlich auf der Rückschleife,
 * und `0.0.0.0` ist nach wie vor keine wählbare Adresse.
 */
import { expect, it } from "vitest";
import { createIdentity, reachability } from "../src/identity/index.ts";
import { validateEmbeddedHostConfig, weltAdressen } from "../src/host.ts";

const basis = { databaseUrl: "postgresql://chronicle:test@127.0.0.1:45102/postgres", origin: "http://localhost:45101",
  cookieSecret: "c".repeat(64), staticRoot: "/client" };

it("nimmt die eigene Adresse der Welt an — mit und ohne Heimnetz", () => {
  expect(validateEmbeddedHostConfig(basis)).toBe(45101);
  expect(validateEmbeddedHostConfig({ ...basis, lanAddress: "192.168.1.2" })).toBe(45101);
});

it("weist alles zurück, was nicht die eigene Adresse dieser Welt ist", () => {
  for (const ungueltig of [
    { origin: "http://192.168.1.2:45101" },              // die Heimnetz-Adresse ist nicht mehr die eigene
    { origin: "http://192.168.1.2:45101", lanAddress: "192.168.1.2" },
    { origin: "http://127.0.0.1:45101" },                // nur der Name localhost, nicht die Zahl
    { origin: "https://localhost:45101" },
    { origin: "http://localhost:45101/pfad" },
    { origin: "http://localhost:3000" },
    { origin: "http://localhost:80" },
  ]) expect(() => validateEmbeddedHostConfig({ ...basis, ...ungueltig }), JSON.stringify(ungueltig)).toThrow();
});

it("lässt als zweite Adresse nur eine private Heimnetz-Adresse zu", () => {
  for (const lanAddress of ["0.0.0.0", "8.8.8.8", "100.64.1.2", "169.254.1.2", "127.0.0.1", "::1", "192.168.001.2", "localhost", ""])
    expect(() => validateEmbeddedHostConfig({ ...basis, lanAddress }), lanAddress).toThrow();
});

it("nennt beide Adressen der Welt, die eigene zuerst", () => {
  expect(weltAdressen({ origin: basis.origin })).toEqual(["http://localhost:45101"]);
  expect(weltAdressen({ origin: basis.origin, lanAddress: "192.168.1.2" }))
    .toEqual(["http://localhost:45101", "http://192.168.1.2:45101"]);
});

it("gibt der Spielleitung auf der eigenen Adresse einen Passkey-Weg, den es im Heimnetz nie gab", () => {
  // Der eigentliche Gewinn: auf localhost ist ein Passkey möglich, auf einer IP-Adresse nicht.
  // Vorher hatte eine Heimnetz-Welt nur die IP — und damit keinen selbstbedienbaren Weg zurück.
  expect(reachability("http://localhost:45101")).toMatchObject({ passkeyEligible: true, secureContext: true });
  expect(reachability("http://192.168.1.2:45101", true)).toMatchObject({ passkeyEligible: false, secureContext: false });
});

it("setzt das Sitzungscookie je Adresse richtig: Secure auf der eigenen, ohne Secure im Heimnetz", async () => {
  // Zwei Zugänge auf derselben Welt, jeder für seine Adresse ausgestellt. Ein mitgeschlepptes
  // Secure machte das Cookie im Heimnetz stumm; ein fehlendes wäre auf localhost eine Aufweichung.
  const eigen = createIdentity(null as never, { origin: "http://localhost:45101", cookieSecret: "l".repeat(64) });
  expect(eigen.clearCookie()).toMatch(/; Secure;/);
  const heimnetz = createIdentity(null as never, { origin: "http://192.168.1.2:45101", cookieSecret: "l".repeat(64), allowInsecureLan: true });
  expect(heimnetz.clearCookie()).not.toMatch(/; Secure(?:;|$)/);
});
