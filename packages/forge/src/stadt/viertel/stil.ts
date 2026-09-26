// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { BAUWERK_LABEL } from "@chronicle/szene";
import type { StadtStil } from "../stil.ts";
import { baueBurg } from "./burg.ts";
import { flecken, spirale } from "./flecken.ts";
import { NAMEN } from "./namen.ts";
import { bebaueFleck } from "./parzellen.ts";

/**
 * **Fantasy (Version 11).** Genau die Werte, mit denen Teil 1 die Viertelstadt gebaut hat — jede
 * Änderung hier bewegt die Gold-Hashes in `siedlung-gold-fantasy.test.ts`.
 */
const HAUSNAMEN = ["Linden", "Weber", "Falk", "Birken", "Mühlen", "Rosen", "Stein", "Eichen", "Brunnen", "Kessel", "Wolf", "Adler"];
const KIRCHEN = ["Kirche des Morgenlichts", "Kirche am Brunnen", "Kirche der stillen Wacht", "Kirche der Heimkehr"];
const DOME = ["Dom des Morgenlichts", "Dom der Sieben Lichter", "Dom der stillen Wacht", "Dom am Markt"];
const TAVERNEN = ["Zum Silberfuchs", "Zur alten Brücke", "Zum goldenen Hirsch", "Zum roten Kessel", "Zum Torwächter", "Zur Mühle", "Zum Anker", "Zum Grünen Krug"];

export const FANTASY: StadtStil = Object.freeze<StadtStil>({
  setting: "fantasy",
  flecken: ({ art, bauwerke, mitte, rahmen, breite, hoehe, r }) => {
    const innenZiel = Math.max(3, Math.min(90, Math.round(bauwerke / (art === "stadt" ? 9 : art === "dorf" ? 6 : 3))));
    const radiusInnen = Math.min(breite, hoehe) * (art === "stadt" ? .4 : art === "dorf" ? .3 : .2);
    return { alle: flecken(spirale(mitte, innenZiel, radiusInnen, rahmen, r), innenZiel, rahmen, mitte), innenZiel };
  },
  befestigung: "stein", kernAnteil: .62, vorstadtAnteil: .4,
  breiten: art => art === "stadt" ? { haupt: .85, gasse: .42, wall: .38, ausfall: .7 } : { haupt: .75, gasse: .45, wall: .4, ausfall: .65 },
  bebaue: a => a.rolle === "burg" ? baueBurg(a) : bebaueFleck(a),
  typen: {
    wohnen: [["haus", 86], ["taverne", 3], ["werkstatt", 5], ["schmiede", 2], ["lager", 4]],
    markt: [["haus", 45], ["taverne", 15], ["bank", 10], ["lager", 12], ["werkstatt", 18]],
    handwerk: [["werkstatt", 35], ["schmiede", 20], ["lager", 20], ["haus", 25]],
    hafen: [["lager", 55], ["taverne", 12], ["werkstatt", 13], ["haus", 20]],
    adel: [["haus", 78], ["bibliothek", 10], ["museum", 4], ["bank", 8]],
    arm: [["haus", 88], ["taverne", 7], ["lager", 5]],
    tempel: [["haus", 70], ["bibliothek", 30]], burg: [["kaserne", 60], ["lager", 40]], frei: [["haus", 100]],
    weiler: [["bauernhof", 45], ["lager", 25], ["haus", 30]],
  },
  hoefe: art => art === "stadt" ? 6 : art === "dorf" ? 8 : 0,
  streifen: f => Math.max(2, Math.min(8, Math.round(f / 5))),
  sonderbauten: ({ art, markt, marktMitte, torPunkte, flussNah, setze, amFluss, hatTyp }) => {
    if (art === "dorf" && markt >= 0) { setze(marktMitte, "kirche"); setze(marktMitte, "taverne"); }
    if (art === "stadt" && !hatTyp("kirche")) setze(marktMitte, "kirche");
    for (const t of torPunkte) setze(t, "taverne");
    if (flussNah && art !== "weiler") amFluss("muehle", art === "dorf" ? "alle" : ["handwerk", "hafen"]);
  },
  titel: (t, b, i, r) => t === "kirche" ? (b.rang === 0 ? r.waehle(DOME)! : r.waehle(KIRCHEN)!) : t === "taverne" ? r.waehle(TAVERNEN)!
    : t === "haus" ? `Haus ${r.waehle(HAUSNAMEN)} ${i + 1}` : `${BAUWERK_LABEL[t]} ${i + 1}`,
  dach: () => undefined,
  namen: NAMEN,
  vorstadt: richtung => `${richtung}vorstadt`,
  dorfplatz: "Dorfanger",
  burgWort: "Burg",
  texte: { zuKlein: "Keine Stadtmauer: der Ort ist zu klein für einen ummauerten Kern.", burgZuKlein: "Keine Burg: der Burgfleck ist zu klein." },
});
