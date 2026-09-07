// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assetIndex, parseAssetpaket, pruefeStampVerweise, type AssetpaketV1 } from "@chronicle/szene";
import { erzeugeGrundriss, erzeugeHoehle, erzeugeSiedlung } from "../src/index.ts";

/**
 * Gate **A-G6 · Der Stiltausch** — `pk.gemalt` ist ein Paket oder es ist Dekoration.
 *
 * `Stamp.a` ist paketqualifiziert, also *könnte* eine Szene den Stil wechseln, indem sie eine
 * andere Paket-Id einsetzt. Ob sie es *kann*, hängt an einer Eigenschaft, die keine Datei für
 * sich prüfen kann: die Generatoren nennen nie ein Asset beim Namen, sie fragen nach einer
 * `art` mit einem `schlagwort` (`kartenwerk.ts:279`). Ein Stilpaket, das eine dieser Anfragen
 * nicht beantwortet, erzeugt eine Karte mit Löchern — und zwar leise, denn `waehle` gibt `null`
 * zurück und der Generator zieht weiter.
 *
 * Diese Datei stellt darum die einzige Frage, die zählt: **erzeugt dasselbe Programm mit dem
 * anderen Paket eine vollständige Karte?** Gemessen wird an `bericht.nichtBedient`, dem Feld,
 * das der Generator ohnehin führt, und an `pruefeStampVerweise` gegen den echten Paketindex.
 *
 * Der Test ist bewusst nicht „vergleiche mit pk.grundriss": die beiden Pakete dürfen sich in
 * Umfang und Auswahl unterscheiden. Verlangt wird Bedienbarkeit, nicht Gleichheit.
 */

const laden = (id: string): AssetpaketV1 =>
  parseAssetpaket(readFileSync(fileURLToPath(new URL(`../../../assets/packs/${id}/paket.json`, import.meta.url)), "utf8"));

const STILE = ["pk.grundriss", "pk.gemalt"] as const;
const SAATEN = ["eron:kellergewoelbe:1", "eron:turm:2", "eron:krypta:3", "eron:schacht:4"];

describe("A-G6 · Stiltausch — jedes Stilpaket trägt jeden Generator", () => {
  for (const id of STILE) {
    const paket = laden(id);
    const index = assetIndex([paket]);

    it(`${id}: bedient jede Grundriss-Anfrage und löst jeden Stamp auf`, () => {
      for (const keim of SAATEN) {
        const g = erzeugeGrundriss({ keim, titel: "Stilprüfung", optionen: {} }, paket);
        expect(g.bericht.nichtBedient, `${id} / ${keim}`).toStrictEqual([]);
        expect(pruefeStampVerweise(g.karte.geometry, index), `${id} / ${keim}`).toStrictEqual([]);
        expect(g.karte.geometry.stamps.length, `${id} / ${keim}`).toBeGreaterThan(0);
      }
    });

    it(`${id}: bedient jede Höhlen-Anfrage und löst jeden Stamp auf`, () => {
      for (const keim of SAATEN) {
        const h = erzeugeHoehle({ keim, titel: "Stilprüfung", optionen: {} }, paket);
        expect(h.bericht.nichtBedient, `${id} / ${keim}`).toStrictEqual([]);
        expect(pruefeStampVerweise(h.karte.geometry, index), `${id} / ${keim}`).toStrictEqual([]);
      }
    });

    it(`${id}: bedient jede Siedlungs-Anfrage und löst jeden Stamp auf`, () => {
      for (const keim of SAATEN) {
        const s = erzeugeSiedlung({ keim, titel: "Stilprüfung", optionen: {} }, paket);
        expect(s.bericht.nichtBedient, `${id} / ${keim}`).toStrictEqual([]);
        expect(pruefeStampVerweise(s.karte.geometry, index), `${id} / ${keim}`).toStrictEqual([]);
      }
    });
  }

  it("dieselbe Anfrage, anderes Paket: eine andere Karte, keine Umlackierung", () => {
    const tusche = laden("pk.grundriss"), gemalt = laden("pk.gemalt");
    const a = erzeugeGrundriss({ keim: "eron:kellergewoelbe:1", titel: "Stilprüfung", optionen: {} }, tusche);
    const b = erzeugeGrundriss({ keim: "eron:kellergewoelbe:1", titel: "Stilprüfung", optionen: {} }, gemalt);

    // Beim Schreiben stand hier zuerst „gleiche Räume, gleiche Türen" — und der Test wurde rot
    // (16 Portale statt 21). Die Erwartung war falsch, nicht der Generator: die Paketidentität
    // geht in den `Weltkeim` ein, der Keim sät den Zufall, und damit ändert sich **das ganze
    // Layout**, nicht nur die Kunst darauf. Genau das sagt `assets/README.md` zu: eine andere
    // Assetbasis ist eine andere Karte, kein stiller Austausch unter derselben Id.
    //
    // Der Stiltausch ist also nichts, was man einer bestehenden Szene antut — er ist eine
    // Entscheidung beim Erzeugen. Wer dieselbe Karte in zwei Stilen will, braucht ein Paket, das
    // seine Identität teilt, und das ist eine eigene, bewusste Formatentscheidung.
    expect(b.keim.keimHash).not.toBe(a.keim.keimHash);

    // Was stattdessen gilt: beide sind vollwertige Karten, und jede Kunst kommt aus ihrem Paket.
    for (const [karte, praefix] of [[a, "pk.grundriss/"], [b, "pk.gemalt/"]] as const) {
      expect(karte.bericht.raeume).toBeGreaterThanOrEqual(2);
      expect(karte.karte.portals.length).toBeGreaterThan(0);
      for (const stamp of karte.karte.geometry.stamps) expect(stamp.a.startsWith(praefix)).toBe(true);
    }
  });
});
