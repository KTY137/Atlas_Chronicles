// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { BAUWERK_LABEL, type BauwerkTyp } from "@chronicle/szene";
import type { StadtStil } from "../stil.ts";
import { flecken, spirale } from "../viertel/flecken.ts";
import { bebaueStadtteil } from "./bloecke.ts";

/**
 * **Die heutige Stadt (Version 12, Spec 2026-09-23-stadt-zukunft, Abschnitt 5).** Weniger, größere
 * Flecken als in der Fantasy-Stadt — sie sind Stadtteile, keine Viertel. Um den Kern läuft ein
 * Stadtring als Straße; jeder Stadtteil hat sein eigenes Raster.
 */
const STRASSEN = ["Parkallee", "Lindenstraße", "Hafenring", "Am Markt", "Bahnhofstraße", "Gartenweg", "Ringstraße", "Mühlweg", "Schulstraße", "Rosenweg"];
const ORTE = ["Mitte", "Nord", "Süd", "West", "Ost", "am Ring", "am Park"];
const GIEBEL: readonly BauwerkTyp[] = ["haus", "kirche"], HALLE: readonly BauwerkTyp[] = ["fabrik", "lager", "werkstatt"];

export const MODERN: StadtStil = Object.freeze<StadtStil>({
  setting: "gegenwart",
  flecken: ({ art, bauwerke, mitte, rahmen, breite, hoehe, r }) => {
    const innenZiel = Math.max(3, Math.min(60, Math.round(bauwerke / (art === "stadt" ? 16 : art === "dorf" ? 7 : 4))));
    const radiusInnen = Math.min(breite, hoehe) * (art === "stadt" ? .5 : art === "dorf" ? .4 : .24);
    return { alle: flecken(spirale(mitte, innenZiel, radiusInnen, rahmen, r), innenZiel, rahmen, mitte), innenZiel };
  },
  befestigung: "ring", kernAnteil: .6, vorstadtAnteil: 1, strassenBleiben: true,
  breiten: art => art === "stadt" ? { haupt: 1.1, gasse: .85, wall: .85, ausfall: .95 } : art === "dorf" ? { haupt: .9, gasse: .7, wall: .7, ausfall: .8 } : { haupt: .7, gasse: .55, wall: .55, ausfall: .65 },
  bebaue: bebaueStadtteil,
  typen: {
    wohnen: [["wohnblock", 70], ["haus", 20], ["cafe", 5], ["restaurant", 5]],
    markt: [["buero", 40], ["hotel", 15], ["bank", 10], ["supermarkt", 15], ["restaurant", 10], ["cafe", 10]],
    handwerk: [["fabrik", 40], ["lager", 35], ["werkstatt", 25]], hafen: [["lager", 80], ["werkstatt", 20]],
    adel: [["haus", 90], ["museum", 5], ["bibliothek", 5]], arm: [["wohnblock", 100]],
    tempel: [["schule", 50], ["krankenhaus", 50]], burg: [["polizei", 50], ["feuerwache", 50]], frei: [["haus", 100]],
    weiler: [["haus", 70], ["lager", 20], ["werkstatt", 10]],
  },
  // Keine Einzelhöfe an der Landstraße: das Zeitwelten-Paket hat keinen heutigen Bauernhof.
  hoefe: () => 0,
  streifen: f => Math.max(1, Math.min(4, Math.round(f / 14))),
  sonderbauten: ({ art, marktMitte, torPunkte, setze, hatTyp }) => {
    const pflicht: readonly BauwerkTyp[] = art === "stadt" ? ["krankenhaus", "polizei", "feuerwache", "schule", "bahnhof"] : art === "dorf" ? ["supermarkt", "schule", "feuerwache", "kirche"] : [];
    for (const t of pflicht) if (!hatTyp(t)) setze(marktMitte, t);
    if (art !== "weiler") for (const t of torPunkte) setze(t, "cafe");
  },
  titel: (t, _b, i, r) => t === "haus" || t === "wohnblock" ? `${BAUWERK_LABEL[t]} ${r.waehle(STRASSEN)} ${i + 1}` : `${BAUWERK_LABEL[t]} ${r.waehle(ORTE)}`,
  dach: t => GIEBEL.includes(t) ? "giebel" : HALLE.includes(t) ? "halle" : "flach",
  namen: {
    markt: ["Innenstadt", "City", "Altstadt"], tempel: ["Schulzentrum", "Klinikviertel"], burg: ["Rathausviertel", "Behördenviertel"],
    hafen: ["Hafen", "Hafencity", "Am Kai"], handwerk: ["Gewerbegebiet", "Industriegebiet", "Gewerbepark"],
    adel: ["Villenviertel", "Parkhöhe", "Sonnenhang"], arm: ["Hochhaussiedlung", "Wohnblöcke", "Neubaugebiet"],
    wohnen: ["Wohngebiet Mitte", "Gartenstadt", "Lindenhof", "Parkviertel", "Südstadt"], frei: ["Stadtpark", "Volkspark"],
  },
  vorstadt: richtung => `${richtung}stadt`,
  dorfplatz: "Ortsmitte",
  burgWort: "Rathaus & Ämter",
  texte: { zuKlein: "" },
});
