// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { BAUWERK_LABEL, type BauwerkTyp } from "@chronicle/szene";
import type { StadtStil } from "../stil.ts";
import { bebaueSektor } from "./bebauung.ts";
import { sektoren } from "./sektoren.ts";

/**
 * **Die Kolonie (Version 12, Spec 2026-09-23-stadt-zukunft, Abschnitt 6).** Nabe, Ringe und
 * Speichen statt gewachsener Viertel; ein Schutzzaun ohne Türme statt einer Steinmauer; Kuppeln,
 * Hallen und Landefelder statt Giebelhäusern. Eine Stadt ohne Hafen am Wasser bekommt ihren
 * Raumhafen im äußeren Ring.
 */
const STERNE = ["Vega", "Orion", "Kepler", "Nova", "Lyra", "Altair", "Sirius", "Deneb", "Rigel", "Castor"];
const KUPPEL: readonly BauwerkTyp[] = ["raumstation", "reaktor", "medstation"], HALLE: readonly BauwerkTyp[] = ["fabrik", "werkstatt"];

export const KOLONIE: StadtStil = Object.freeze<StadtStil>({
  setting: "scifi",
  flecken: sektoren,
  befestigung: "zaun", kernAnteil: 1, vorstadtAnteil: 1, strassenBleiben: true,
  breiten: art => art === "stadt" ? { haupt: 1, gasse: .7, wall: .6, ausfall: .9 } : art === "dorf" ? { haupt: .85, gasse: .6, wall: .55, ausfall: .75 } : { haupt: .7, gasse: .5, wall: .45, ausfall: .6 },
  nachRollen: (lagen, rollen, art, planHat) => {
    if (art !== "stadt" || planHat("hafen") || [...rollen.values()].includes("hafen")) return;
    const aussen = lagen.filter(l => l.trocken && l.mauerRand && rollen.get(l.nr) !== "markt").sort((x, y) => y.flaeche - x.flaeche || x.nr - y.nr)[0];
    if (aussen) rollen.set(aussen.nr, "hafen");
  },
  bebaue: bebaueSektor,
  typen: {
    wohnen: [["raumstation", 100]], markt: [["restaurant", 40], ["lager", 30], ["buero", 30]],
    handwerk: [["fabrik", 45], ["werkstatt", 35], ["labor", 20]], hafen: [["lager", 100]], adel: [["wohnblock", 100]],
    arm: [["lager", 50], ["wohnblock", 50]], tempel: [["labor", 60], ["medstation", 40]], burg: [["kommando", 60], ["lager", 40]],
    frei: [["raumstation", 100]], weiler: [["raumstation", 60], ["lager", 40]],
  },
  hoefe: () => 0,
  streifen: f => Math.max(2, Math.min(6, Math.round(f / 6))),
  sonderbauten: ({ art, marktMitte, torPunkte, setze, hatTyp }) => {
    const pflicht: readonly BauwerkTyp[] = art === "stadt" ? ["medstation", "labor"] : art === "dorf" ? ["medstation"] : [];
    for (const t of pflicht) if (!hatTyp(t)) setze(marktMitte, t);
    if (art !== "weiler") for (const t of torPunkte) setze(t, "lager");
  },
  titel: (t, _b, i, r) => t === "raumstation" ? `Habitat ${r.waehle(STERNE)}-${i + 1}` : `${BAUWERK_LABEL[t]} ${r.waehle(STERNE)}`,
  dach: t => KUPPEL.includes(t) ? "kuppel" : t === "raumhafen" ? "plattform" : HALLE.includes(t) ? "halle" : "flach",
  namen: {
    markt: ["Kommandodeck", "Zentralnabe"], tempel: ["Forschungsring", "Medizinsektor"], burg: ["Kommandozentrale", "Leitstand"],
    hafen: ["Raumhafen", "Landefeld"], handwerk: ["Fertigung", "Werftsektor", "Reaktorring"], adel: ["Turmring", "Oberdeck"],
    arm: ["Frachtquartier", "Containerhof"], wohnen: ["Kuppelring", "Habitat Nord", "Habitat Süd", "Wohnsektor"], frei: ["Grünring", "Biokuppel"],
  },
  vorstadt: richtung => `Außensektor ${richtung}`,
  dorfplatz: "Zentraldeck",
  burgWort: "Kommandozentrale",
  texte: { zuKlein: "Kein Schutzzaun: die Kolonie ist zu klein dafür." },
});
