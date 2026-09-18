// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Der Umzug der Anmeldung, wenn eine Welt ihre Adresse wechselt.
 *
 * **Warum es diesen Umzug überhaupt braucht.** Das Fenster einer Welt bekommt seinen eigenen
 * Cookie-Topf, und der heißt nach der vollen Adresse (`partitionFor`). Die Adresse einer Welt
 * ist aber nicht fest: mit Heimnetz läuft sie unter `http://<IP>:<Port>`, ohne unter
 * `http://localhost:<Port>`, und die Heimnetz-IP wechselt mit dem Netz. Jede andere Adresse
 * ergibt damit einen frischen, leeren Topf — und die Spielleitung steht vor der
 * Spieler-Anmeldeseite ihrer eigenen Welt, obwohl ihr Zugang in der Datenbank dieser Welt
 * unverändert weiterlebt. Am 17.09.2026 ist genau das passiert.
 *
 * **Was hier passiert — und was nicht.** Umgezogen wird ein bereits ausgestelltes Cookie
 * derselben Welt, von einer ihrer früheren Adressen an ihre heutige. Es entsteht kein Zugang,
 * es wird keine Frist verlängert (die Ablaufzeit zieht mit) und keine fremde Sitzung
 * angefasst: beide Töpfe gehören derselben lokalen Welt auf diesem Rechner. Wer das Fenster
 * offen hat, hat den Ordner. Dasselbe tut die Wiederherstellung eines Sicherungspunkts
 * bereits (`main.ts`, `recovery-restore`); hier steht es nur an der Stelle, an der es jeden
 * Start betrifft statt nur den Ausnahmefall.
 *
 * **Warum eine vorhandene Anmeldung gewinnt.** Wer sich an der heutigen Adresse schon
 * angemeldet hat, hat das womöglich als jemand anderes getan — ein zweites Cookie darüber zu
 * legen wäre ein stiller Identitätswechsel. Der Umzug rührt einen belegten Topf nicht an.
 */
import { isPrivateLanOrigin, sessionCookieSecure } from "@chronicle/server/host";

/** Das Sitzungscookie, wie Electron es liefert und entgegennimmt. */
export interface Keks {
  readonly name: string;
  readonly value: string;
  readonly url?: string;
  readonly path?: string;
  readonly httpOnly?: boolean;
  readonly secure?: boolean;
  readonly sameSite?: string;
  /** Sekunden seit Epoche, wie im Cookie-Protokoll — nicht Millisekunden. */
  readonly expirationDate?: number;
}

/** Der Ausschnitt aus `session.cookies`, den der Umzug braucht. */
export interface Keksglas {
  get(filter: { name: string }): Promise<readonly Keks[]>;
  set(keks: Keks): Promise<void>;
  flushStore(): Promise<void>;
}

export const SITZUNGSKEKS = "chronicle_session";

/** Eine Anmeldung, die noch trägt: das Sitzungscookie ohne oder mit künftiger Ablaufzeit. */
function lebendeSitzung(kekse: readonly Keks[], jetzt: number): Keks | undefined {
  return kekse.find((keks) => keks.name === SITZUNGSKEKS && keks.value
    && (keks.expirationDate === undefined || keks.expirationDate * 1000 > jetzt));
}

/** Derselbe Topf, auch wenn dieselbe Adresse zweimal geschrieben wurde. */
function normalisiert(origin: string): string {
  try { return new URL(origin).origin; } catch { return origin; }
}

export interface Umzug {
  /** Die Adresse, unter der die Welt jetzt läuft. */
  readonly ziel: string;
  /** Früher benutzte Adressen derselben Welt, in der Reihenfolge ihrer Benutzung. */
  readonly frueher: readonly string[];
  readonly glas: (origin: string) => Keksglas;
  readonly jetzt?: number;
}

/**
 * Die Anmeldung dieser Welt an ihre heutige Adresse holen.
 *
 * Gibt die Adresse zurück, von der übernommen wurde — oder nichts, wenn nichts zu tun war.
 * Ein unlesbarer alter Topf beendet die Suche nicht: er ist ein Grund weiterzusuchen, kein
 * Grund, die Spielleitung auszusperren.
 */
export async function uebernimmSitzung({ ziel, frueher, glas, jetzt = Date.now() }: Umzug): Promise<string | undefined> {
  const zielOrigin = normalisiert(ziel);
  const zielGlas = glas(zielOrigin);
  if (lebendeSitzung(await zielGlas.get({ name: SITZUNGSKEKS }).catch(() => []), jetzt)) return undefined;

  // Die zuletzt benutzte Adresse zuerst: sie trägt die jüngste Anmeldung.
  const kandidaten = [...new Set(frueher.map(normalisiert))].reverse().filter((origin) => origin !== zielOrigin);
  for (const herkunft of kandidaten) {
    const keks = lebendeSitzung(await glas(herkunft).get({ name: SITZUNGSKEKS }).catch(() => []), jetzt);
    if (!keks) continue;
    // Secure richtet sich nach der ZIEL-Adresse, nicht nach der Herkunft: im Heimnetz läuft die
    // Welt über HTTP, auf localhost nicht. Ein mitgeschlepptes Secure machte das Cookie stumm.
    await zielGlas.set({ name: SITZUNGSKEKS, value: keks.value, url: zielOrigin, path: "/", httpOnly: true,
      secure: sessionCookieSecure(zielOrigin, isPrivateLanOrigin(zielOrigin)), sameSite: "strict",
      ...(keks.expirationDate === undefined ? {} : { expirationDate: keks.expirationDate }) });
    await zielGlas.flushStore();
    return herkunft;
  }
  return undefined;
}

/**
 * Adressen, unter denen eine Welt gelaufen sein KANN — der Rückfall für Welten ohne Adressbuch.
 *
 * Welten, die es vor dieser Änderung schon gab, haben nichts vermerkt; ausgerechnet sie sind
 * die, deren Spielleitung gerade vor der Anmeldeseite steht. Geraten wird dabei nicht: es sind
 * genau die Adressen, die diese Welt auf diesem Rechner überhaupt haben könnte — ihre eigene
 * und die privaten Heimnetz-Adressen, die der Rechner jetzt hat, jeweils auf ihrem Port. Eine
 * Adresse aus einem früheren Netz lässt sich so nicht wiederfinden; dafür bleibt der
 * Zugangslink im Hostfenster.
 */
export function moeglicheAdressen(port: number, heimnetz: readonly { address: string; name?: string }[]): string[] {
  return [`http://localhost:${port}`, ...heimnetz.map(({ address }) => `http://${address}:${port}`)];
}
