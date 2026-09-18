// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
//
// Die Anmeldung einer Welt darf nicht an ihrer Adresse hängen.
//
// Am 17.09.2026 stand die Spielleitung vor der Spieler-Anmeldeseite ihrer eigenen Welt: der
// Cookie-Topf des Fensters heißt nach der vollen Adresse (`partitionFor`), und die Adresse
// einer Welt wechselt — mit Heimnetz `http://<IP>:<Port>`, ohne `http://localhost:<Port>`,
// und die Heimnetz-IP selbst wechselt mit dem Netz. Der Zugang in der Datenbank der Welt lebte
// dabei unverändert weiter; nur das Cookie lag im vorherigen Topf.
import { expect, it } from "vitest";
import { uebernimmSitzung, type Keks, type Keksglas } from "../src/sitzung.ts";

const LOKAL = "http://localhost:47001";
const HEIM_ALT = "http://192.168.178.54:47001";
const HEIM_NEU = "http://10.17.120.45:47001";

/** Ein Cookie-Topf im Speicher — dieselbe Schnittstelle, die Electrons `session.cookies` bietet. */
function glas(...kekse: Keks[]) {
  const inhalt = [...kekse];
  let geleert = 0;
  return {
    inhalt,
    geleert: () => geleert,
    topf: {
      get: async ({ name }: { name: string }) => inhalt.filter((keks) => keks.name === name),
      set: async (keks: Keks) => { inhalt.push(keks); },
      flushStore: async () => { geleert += 1; },
    } satisfies Keksglas,
  };
}

const sitzung = (value: string, extra: Partial<Keks> = {}): Keks =>
  ({ name: "chronicle_session", value, httpOnly: true, sameSite: "strict", secure: false, ...extra });

it("trägt die Anmeldung der Welt an ihre neue Adresse um, wenn das Heimnetz eine andere IP bekommen hat", async () => {
  const alt = glas(sitzung("die-sitzung-der-spielleitung")), neu = glas();
  const toepfe = new Map([[HEIM_ALT, alt.topf], [HEIM_NEU, neu.topf]]);

  const herkunft = await uebernimmSitzung({ ziel: HEIM_NEU, frueher: [LOKAL, HEIM_ALT], glas: (o) => toepfe.get(o)!, jetzt: 1_000_000 });

  expect(herkunft).toBe(HEIM_ALT);
  expect(neu.inhalt).toEqual([expect.objectContaining({ name: "chronicle_session", value: "die-sitzung-der-spielleitung", url: HEIM_NEU, httpOnly: true, sameSite: "strict" })]);
  expect(neu.geleert()).toBe(1);
});

it("trägt auch zwischen Heimnetz-Betrieb und localhost um — in beide Richtungen", async () => {
  const heim = glas(sitzung("aus-dem-heimnetz")), lokal = glas();
  const toepfe = new Map([[HEIM_NEU, heim.topf], [LOKAL, lokal.topf]]);

  expect(await uebernimmSitzung({ ziel: LOKAL, frueher: [HEIM_NEU], glas: (o) => toepfe.get(o)!, jetzt: 1_000_000 })).toBe(HEIM_NEU);
  expect(lokal.inhalt[0]?.value).toBe("aus-dem-heimnetz");
});

it("lässt eine vorhandene Anmeldung der Zieladresse unangetastet", async () => {
  const alt = glas(sitzung("alt")), neu = glas(sitzung("schon-angemeldet"));
  const toepfe = new Map([[HEIM_ALT, alt.topf], [HEIM_NEU, neu.topf]]);

  expect(await uebernimmSitzung({ ziel: HEIM_NEU, frueher: [HEIM_ALT], glas: (o) => toepfe.get(o)!, jetzt: 1_000_000 })).toBeUndefined();
  expect(neu.inhalt).toHaveLength(1);
  expect(neu.inhalt[0]?.value).toBe("schon-angemeldet");
  expect(neu.geleert()).toBe(0);
});

it("nimmt die zuletzt benutzte Adresse, wenn mehrere noch eine Anmeldung halten", async () => {
  const aelter = glas(sitzung("aeltere-anmeldung")), juenger = glas(sitzung("juengste-anmeldung")), neu = glas();
  const toepfe = new Map([[LOKAL, aelter.topf], [HEIM_ALT, juenger.topf], [HEIM_NEU, neu.topf]]);

  // `frueher` steht in der Reihenfolge der Benutzung; die zuletzt benutzte Adresse zählt zuerst.
  expect(await uebernimmSitzung({ ziel: HEIM_NEU, frueher: [LOKAL, HEIM_ALT], glas: (o) => toepfe.get(o)!, jetzt: 1_000_000 })).toBe(HEIM_ALT);
  expect(neu.inhalt[0]?.value).toBe("juengste-anmeldung");
});

it("überspringt abgelaufene Anmeldungen, statt eine tote Sitzung umzutragen", async () => {
  const tot = glas(sitzung("abgelaufen", { expirationDate: 500 })), lebt = glas(sitzung("noch-gut")), neu = glas();
  const toepfe = new Map([[LOKAL, lebt.topf], [HEIM_ALT, tot.topf], [HEIM_NEU, neu.topf]]);

  // Die zuletzt benutzte Adresse (HEIM_ALT) hält nur noch ein totes Cookie — also zählt die davor.
  expect(await uebernimmSitzung({ ziel: HEIM_NEU, frueher: [LOKAL, HEIM_ALT], glas: (o) => toepfe.get(o)!, jetzt: 1_000_000 })).toBe(LOKAL);
  expect(neu.inhalt[0]?.value).toBe("noch-gut");
});

it("setzt das Cookie für die Zieladresse richtig: im Heimnetz ohne, auf localhost mit Secure", async () => {
  const heim = glas(sitzung("s")), lokal = glas();
  expect(await uebernimmSitzung({ ziel: LOKAL, frueher: [HEIM_NEU], glas: (o) => (o === HEIM_NEU ? heim.topf : lokal.topf), jetzt: 1 })).toBe(HEIM_NEU);
  expect(lokal.inhalt[0]?.secure).toBe(true);

  const lokal2 = glas(sitzung("s", { secure: true })), heim2 = glas();
  expect(await uebernimmSitzung({ ziel: HEIM_NEU, frueher: [LOKAL], glas: (o) => (o === LOKAL ? lokal2.topf : heim2.topf), jetzt: 1 })).toBe(LOKAL);
  expect(heim2.inhalt[0]?.secure).toBe(false);
});

it("behält die Ablaufzeit der übernommenen Anmeldung bei — der Umzug verlängert keinen Zugang", async () => {
  const alt = glas(sitzung("s", { expirationDate: 2_000_000 })), neu = glas();
  await uebernimmSitzung({ ziel: HEIM_NEU, frueher: [HEIM_ALT], glas: (o) => (o === HEIM_ALT ? alt.topf : neu.topf), jetzt: 1_000_000 });
  expect(neu.inhalt[0]?.expirationDate).toBe(2_000_000);
});

it("tut nichts, wenn es nichts zu übernehmen gibt", async () => {
  const neu = glas();
  expect(await uebernimmSitzung({ ziel: HEIM_NEU, frueher: [], glas: () => neu.topf, jetzt: 1 })).toBeUndefined();
  expect(neu.inhalt).toHaveLength(0);
  expect(neu.geleert()).toBe(0);
});

it("gibt auf, statt zu stören, wenn ein alter Topf nicht lesbar ist", async () => {
  const neu = glas(), kaputt: Keksglas = { get: async () => { throw new Error("Topf unlesbar"); }, set: async () => undefined, flushStore: async () => undefined };
  const gut = glas(sitzung("s"));
  const toepfe = new Map([[LOKAL, kaputt], [HEIM_ALT, gut.topf], [HEIM_NEU, neu.topf]]);

  // Der kaputte Topf liegt vor dem guten; er darf den Umzug nicht abbrechen.
  expect(await uebernimmSitzung({ ziel: HEIM_NEU, frueher: [LOKAL, HEIM_ALT], glas: (o) => toepfe.get(o)!, jetzt: 1 })).toBe(HEIM_ALT);
});

// Welten, die es vor dieser Änderung schon gab, haben noch kein Adressbuch. Ohne einen
// Rückfall fände die Brücke bei ihnen nichts — und ausgerechnet sie sind die, die gerade
// ausgesperrt sind. Der Rückfall rät nicht: er nimmt die eigene Adresse der Welt und die
// Heimnetz-Adressen, die dieser Rechner JETZT hat, jeweils auf dem Port dieser Welt.
it("errät für eine Welt ohne Adressbuch die Adressen, unter denen sie gelaufen sein kann", async () => {
  const { moeglicheAdressen } = await import("../src/sitzung.ts");
  expect(moeglicheAdressen(47001, [{ address: "10.17.120.45", name: "WLAN" }, { address: "192.168.1.9", name: "LAN" }]))
    .toEqual(["http://localhost:47001", "http://10.17.120.45:47001", "http://192.168.1.9:47001"]);
  expect(moeglicheAdressen(47001, [])).toEqual(["http://localhost:47001"]);
});
