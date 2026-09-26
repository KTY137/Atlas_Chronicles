// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Raumprogramme je Gebäudetyp und Geschoss, und die Möbelregeln je Raumart.
 *
 * Ein Programm nennt je Geschoss (−1 Keller, 0 Erdgeschoss, 1 Obergeschoss) die Räume mit einem
 * Gewicht (Flächenanteil) und einer Rolle: der **Flur** verbindet Tür und Treppe, der
 * **öffentliche** Raum liegt an der Haustür, **private** Räume dahinter. Wohnungen im Wohnblock
 * tragen eine Gruppe und bleiben unter sich. Typen ohne eigenes Programm leiten eines aus
 * `BAUPROGRAMME` ab, damit jedes der 33 Gebäude betretbar bleibt.
 */
import type { BauwerkTyp, KartenSetting } from "@chronicle/szene";
import { BAUPROGRAMME, ZEIT_RAUM_LABEL } from "../bauprogramme.ts";

export type Rolle = "flur" | "oeffentlich" | "privat";
export type RaumProgrammEintrag = readonly [titel: string, art: string, gewicht: number, rolle?: Rolle, gruppe?: string];
export interface HausProgramm {
  readonly geschosse: Readonly<Partial<Record<number, readonly RaumProgrammEintrag[]>>>;
  /** Mindestbreite der kurzen Hausseite in Innenfeldern. */
  readonly kurzeSeite: number;
  readonly rund?: boolean;
}
export type MoebelLage = "wand" | "aussen" | "ecke" | "mitte" | "boden" | "reihe";
export interface MoebelRegel {
  readonly typ: string;
  /** Breite entlang der Wand, Tiefe in den Raum, in Feldern. */
  readonly masse: readonly [number, number];
  readonly lage: MoebelLage;
  /** Pflichtstücke stehen auch bei geringer Möblierung: der Kamin in der Stube, der Altar im Chor. */
  readonly pflicht?: boolean;
  /** Hohe Stücke stehen nicht vor Fenstern. */
  readonly hoch?: boolean;
}

const P = (geschosse: HausProgramm["geschosse"], kurzeSeite = 10, rund = false): HausProgramm => Object.freeze({ geschosse, kurzeSeite, ...(rund ? { rund } : {}) });
const FLUR = (titel = "Flur"): RaumProgrammEintrag => [titel, "flur", .6, "flur"];

const FANTASY: Readonly<Partial<Record<BauwerkTyp, HausProgramm>>> = {
  haus: P({ [-1]: [["Vorratskeller", "vorrat", 1, "oeffentlich"]], 0: [["Diele", "diele", .8, "flur"], ["Stube", "stube", 2.4, "oeffentlich"], ["Küche", "kueche", 1.5]], 1: [FLUR(), ["Schlafkammer", "schlaf", 1.4], ["Kinderkammer", "kammer", 1.1], ["Nähstube", "naehen", .9]] }),
  taverne: P({ [-1]: [["Weinkeller", "weinkeller", 1.6, "oeffentlich"], ["Vorratskeller", "vorrat", 1]], 0: [["Schankraum", "schank", 4, "oeffentlich"], ["Küche", "kueche", 1.4], ["Lager", "lager", .8]], 1: [FLUR(), ["Gästezimmer", "gast", 1], ["Gästezimmer", "gast", 1], ["Gästezimmer", "gast", 1], ["Wirtsstube", "schlaf", 1.2]] }, 12),
  schmiede: P({ 0: [["Werkstatt", "werkstatt", 3, "oeffentlich"], ["Kohlenlager", "lager", .9], ["Verkaufsraum", "laden", 1.1]], 1: [FLUR(), ["Schlafkammer", "schlaf", 1.3], ["Stube", "stube", 1.3]] }),
  kirche: P({ [-1]: [["Krypta", "krypta", 1, "oeffentlich"]], 0: [["Kirchenschiff", "schiff", 5, "oeffentlich"], ["Chor", "chor", 1.4], ["Sakristei", "sakristei", .7]] }, 14),
  lager: P({ [-1]: [["Keller", "vorrat", 1, "oeffentlich"]], 0: [["Lagerhalle", "lager", 3, "oeffentlich"], ["Kontor", "kontor", 1], ["Ladestube", "lager", .8]], 1: [["Speicher", "lager", 2, "oeffentlich"], ["Kammer", "kammer", .8]] }),
  turm: P({ [-1]: [["Verlies", "verlies", 1, "oeffentlich"]], 0: [["Wachstube", "wache", 2, "oeffentlich"], ["Waffenkammer", "waffenkammer", 1]], 1: [["Wehrgang", "wache", 1.5, "oeffentlich"], ["Kammer", "kammer", 1]] }, 11),
  burg: P({ [-1]: [["Kerker", "verlies", 1.4, "oeffentlich"], ["Vorratskeller", "vorrat", 1]], 0: [["Halle", "flur", .7, "flur"], ["Rittersaal", "rittersaal", 3, "oeffentlich"], ["Wachstube", "wache", 1.2], ["Waffenkammer", "waffenkammer", 1], ["Küche", "kueche", 1.2]], 1: [FLUR(), ["Gemach", "schlaf", 1.6], ["Kemenate", "kammer", 1.2], ["Kapelle", "chor", 1], ["Schreibstube", "kontor", 1]] }, 14),
  rathaus: P({ [-1]: [["Archiv", "archiv", 1, "oeffentlich"]], 0: [["Halle", "flur", .8, "flur"], ["Ratssaal", "ratssaal", 3, "oeffentlich"], ["Schreibstube", "kontor", 1.1], ["Amtsstube", "kontor", 1]], 1: [FLUR(), ["Bürgermeisterstube", "kontor", 1.4], ["Kammer", "kammer", 1], ["Registratur", "archiv", 1]] }, 12),
  muehle: P({ 0: [["Mahlwerk", "mahlwerk", 3, "oeffentlich"], ["Kornlager", "lager", 1.2]], 1: [["Kornboden", "lager", 2, "oeffentlich"], ["Müllerstube", "stube", 1.2]] }),
  bauernhof: P({ [-1]: [["Vorratskeller", "vorrat", 1, "oeffentlich"]], 0: [["Diele", "diele", .7, "flur"], ["Stube", "stube", 2, "oeffentlich"], ["Küche", "kueche", 1.4], ["Stall", "stall", 2]], 1: [FLUR(), ["Schlafkammer", "schlaf", 1.3], ["Knechtkammer", "kammer", 1.1], ["Heuboden", "lager", 1.6]] }),
  kaserne: P({ 0: [["Halle", "flur", .7, "flur"], ["Speisesaal", "schank", 2, "oeffentlich"], ["Waffenkammer", "waffenkammer", 1], ["Küche", "kueche", 1.1], ["Wachstube", "wache", 1]], 1: [FLUR(), ["Schlafsaal", "schlafsaal", 2], ["Schlafsaal", "schlafsaal", 2], ["Hauptmannstube", "kontor", 1]] }, 12),
};
const GEGENWART: Readonly<Partial<Record<BauwerkTyp, HausProgramm>>> = {
  haus: P({ [-1]: [["Hobbyraum", "hobby", 1.5, "oeffentlich"], ["Technik", "technik", .6]], 0: [["Flur", "flur", .7, "flur"], ["Wohnzimmer", "wohnen", 2.6, "oeffentlich"], ["Küche", "kueche_modern", 1.3], ["Gäste-WC", "wc", .45]], 1: [FLUR(), ["Schlafzimmer", "schlafen", 1.5], ["Kinderzimmer", "kind", 1.1], ["Arbeitszimmer", "buero_klein", 1], ["Bad", "bad", .8]] }),
  wohnblock: P({ [-1]: [["Keller", "technik", 1, "oeffentlich"], ["Waschkeller", "hobby", 1]], 0: [["Treppenhaus", "treppenhaus", .8, "flur"], ["Wohnen", "wohnen", 1.6, "privat", "A"], ["Küche", "kueche_modern", .8, "privat", "A"], ["Bad", "bad", .5, "privat", "A"], ["Schlafen", "schlafen", 1, "privat", "A"], ["Wohnen", "wohnen", 1.6, "privat", "B"], ["Küche", "kueche_modern", .8, "privat", "B"], ["Bad", "bad", .5, "privat", "B"], ["Schlafen", "schlafen", 1, "privat", "B"]], 1: [["Treppenhaus", "treppenhaus", .8, "flur"], ["Wohnen", "wohnen", 1.6, "privat", "C"], ["Küche", "kueche_modern", .8, "privat", "C"], ["Bad", "bad", .5, "privat", "C"], ["Kinderzimmer", "kind", 1, "privat", "C"], ["Wohnen", "wohnen", 1.6, "privat", "D"], ["Küche", "kueche_modern", .8, "privat", "D"], ["Bad", "bad", .5, "privat", "D"], ["Schlafen", "schlafen", 1, "privat", "D"]] }, 12),
  kirche: P({ 0: [["Kirchenschiff", "schiff", 5, "oeffentlich"], ["Chor", "chor", 1.4], ["Sakristei", "sakristei", .7]] }, 14),
};
const SCIFI: Readonly<Partial<Record<BauwerkTyp, HausProgramm>>> = {
  raumstation: P({ [-1]: [["Technikdeck", "technik_sci", 1.2, "oeffentlich"], ["Lager", "lager_sci", 1], ["Wasseraufbereitung", "wasser", 1], ["Lager", "lager_sci", .8]], 0: [["Gemeinschaftsraum", "gemeinschaft", 2, "oeffentlich"], ["Schleuse", "schleuse", .55, "flur"], ["Quartier", "quartier", 1], ["Quartier", "quartier", 1], ["Hydrokultur", "hydro", 1.2], ["Sanitär", "sanitaer", .6]], 1: [["Beobachtung", "beobachtung", 2, "oeffentlich"], ["Quartier", "quartier", 1], ["Quartier", "quartier", 1], ["Labor", "labor_sci", 1.2], ["Krankenstation", "med", 1]] }, 13, true),
  medstation: P({ 0: [["Aufnahme", "schleuse", .6, "flur"], ["Triage", "med", 2, "oeffentlich"], ["Operationssaal", "med", 1.2], ["Isolationsstation", "med", .9], ["Probenlager", "lager_sci", .8]] }, 13, true),
  reaktor: P({ [-1]: [["Kühlung", "technik_sci", 1.2, "oeffentlich"], ["Wartung", "lager_sci", 1]], 0: [["Schleuse", "schleuse", .6, "flur"], ["Reaktorkern", "reaktorkern", 2.2, "oeffentlich"], ["Leitstelle", "leitstand", 1.2], ["Wartung", "lager_sci", .9]] }, 13, true),
  kommando: P({ [-1]: [["Bunker", "bunker", 1.5, "oeffentlich"], ["Serverraum", "server", 1]], 0: [["Vorraum", "schleuse", .7, "flur"], ["Leitstand", "leitstand", 3, "oeffentlich"], ["Funkraum", "funk", 1], ["Waffenkammer", "waffen_sci", .8], ["Besprechung", "besprechung", 1.2]], 1: [FLUR(), ["Kommandantin", "quartier_gross", 1.5], ["Quartier", "quartier", 1], ["Quartier", "quartier", 1], ["Sanitär", "sanitaer", .6]] }, 13),
  wohnblock: P({ 0: [["Schleuse", "schleuse", .7, "flur"], ["Messe", "gemeinschaft", 1.6, "oeffentlich"], ["Quartier", "quartier", 1], ["Quartier", "quartier", 1], ["Sanitär", "sanitaer", .6]], 1: [FLUR(), ["Quartier", "quartier", 1], ["Quartier", "quartier", 1], ["Quartier", "quartier", 1], ["Hydrokultur", "hydro", 1]] }, 12),
};

/** Aus dem alten Raumprogramm abgeleitet: erster Raum öffentlich, ab vier Räumen ein Flur, ab sechs ein Obergeschoss. */
function abgeleitet(profil: BauwerkTyp): HausProgramm {
  const raeume = BAUPROGRAMME[profil]?.raeume ?? ["wohnraum", "kammer"];
  const titel = (art: string) => ZEIT_RAUM_LABEL[art] ?? art.charAt(0).toUpperCase() + art.slice(1);
  const eintraege: RaumProgrammEintrag[] = raeume.map((art, i) => [titel(art), art, i === 0 ? 2.4 : 1, i === 0 ? "oeffentlich" : "privat"]);
  if (eintraege.length >= 6) {
    const eg = eintraege.slice(0, Math.ceil(eintraege.length / 2)), og = eintraege.slice(Math.ceil(eintraege.length / 2));
    return P({ 0: [FLUR(), ...eg], 1: [FLUR(), ...og] }, 12);
  }
  return P({ 0: eintraege.length >= 4 ? [FLUR(), ...eintraege] : eintraege }, 12);
}

export function programmFuer(profil: BauwerkTyp, setting: KartenSetting): HausProgramm {
  const tabelle = setting === "scifi" ? SCIFI : setting === "gegenwart" ? GEGENWART : FANTASY;
  return tabelle[profil] ?? (BAUPROGRAMME[profil] ? abgeleitet(profil) : FANTASY[profil] ?? FANTASY.haus!);
}

const M = (typ: string, w: number, t: number, lage: MoebelLage, extra: { pflicht?: boolean; hoch?: boolean } = {}): MoebelRegel => Object.freeze({ typ, masse: [w, t] as const, lage, ...extra });
/** Möbelregeln je Raumart. Unbekannte Arten bekommen ihre Stücke aus dem Thema (siehe `karte.ts`). */
export const MOEBEL_REGELN: Readonly<Record<string, readonly MoebelRegel[]>> = Object.freeze({
  stube: [M("teppich", 3, 2, "boden"), M("kamin", 2, 1, "aussen", { pflicht: true }), M("tafel", 2, 1, "mitte"), M("regal", 2, 1, "wand", { hoch: true }), M("truhe", 1, 1, "wand"), M("bank", 2, 1, "wand"), M("kerzen", 1, 1, "ecke")],
  kueche: [M("herd", 2, 1, "aussen", { pflicht: true }), M("arbeitstisch", 2, 1, "wand"), M("fass", 1, 1, "ecke"), M("fass", 1, 1, "ecke"), M("regal", 2, 1, "wand", { hoch: true }), M("sack", 1, 1, "ecke"), M("tisch", 1, 1, "mitte")],
  diele: [M("laeufer", 1, 3, "boden"), M("truhe", 1, 1, "wand"), M("kerzen", 1, 1, "ecke")],
  flur: [M("laeufer", 1, 3, "boden"), M("kerzen", 1, 1, "ecke")],
  schlaf: [M("teppich_klein", 2, 2, "boden"), M("bett", 1, 2, "ecke", { pflicht: true }), M("bett", 1, 2, "wand"), M("truhe", 1, 1, "wand"), M("schrank", 2, 1, "wand", { hoch: true }), M("nachttisch", 1, 1, "wand")],
  kammer: [M("bett", 1, 2, "ecke", { pflicht: true }), M("truhe", 1, 1, "wand"), M("regal", 2, 1, "wand", { hoch: true }), M("teppich_klein", 2, 2, "boden")],
  naehen: [M("webstuhl", 2, 1, "aussen", { pflicht: true }), M("tisch", 1, 1, "mitte"), M("truhe", 1, 1, "wand"), M("sack", 1, 1, "ecke")],
  vorrat: [M("regal", 2, 1, "wand", { hoch: true }), M("regal", 2, 1, "wand", { hoch: true }), M("fass", 1, 1, "ecke"), M("fass", 1, 1, "ecke"), M("fass", 1, 1, "wand"), M("kisten", 1, 1, "wand"), M("sack", 1, 1, "wand"), M("sack", 1, 1, "wand"), M("kisten", 1, 1, "ecke")],
  weinkeller: [M("weinregal", 3, 1, "wand", { pflicht: true, hoch: true }), M("weinregal", 3, 1, "wand", { hoch: true }), M("fass", 1, 1, "ecke"), M("fass", 1, 1, "ecke"), M("fass", 1, 1, "wand"), M("kerzen", 1, 1, "ecke")],
  schank: [M("theke", 3, 1, "wand", { pflicht: true }), M("kamin", 2, 1, "aussen"), M("rundtisch", 1, 1, "mitte"), M("rundtisch", 1, 1, "mitte"), M("rundtisch", 1, 1, "mitte"), M("tafel", 2, 1, "mitte"), M("rundtisch", 1, 1, "mitte"), M("fass", 1, 1, "ecke"), M("fass", 1, 1, "ecke"), M("bank", 2, 1, "wand")],
  lager: [M("kisten", 1, 1, "ecke"), M("kisten", 1, 1, "wand"), M("fass", 1, 1, "ecke"), M("sack", 1, 1, "wand"), M("regal", 2, 1, "wand", { hoch: true }), M("kisten", 1, 1, "wand"), M("fass", 1, 1, "wand")],
  gast: [M("bett", 1, 2, "ecke", { pflicht: true }), M("truhe", 1, 1, "wand"), M("tisch", 1, 1, "mitte"), M("teppich_klein", 2, 2, "boden")],
  werkstatt: [M("esse", 2, 2, "aussen", { pflicht: true }), M("amboss", 1, 1, "mitte", { pflicht: true }), M("trog", 1, 1, "wand"), M("werkbank", 2, 1, "wand"), M("werkzeugwand", 2, 1, "wand", { hoch: true }), M("kisten", 1, 1, "ecke"), M("fass", 1, 1, "ecke")],
  laden: [M("theke", 3, 1, "wand", { pflicht: true }), M("waffenstaender", 2, 1, "wand", { hoch: true }), M("regal", 2, 1, "wand", { hoch: true }), M("truhe", 1, 1, "ecke")],
  schiff: [M("kirchbank", 0, 0, "reihe", { pflicht: true }), M("kerzen", 1, 1, "ecke"), M("kerzen", 1, 1, "ecke")],
  chor: [M("teppich", 3, 2, "boden"), M("altar", 2, 1, "wand", { pflicht: true }), M("kerzen", 1, 1, "ecke"), M("kerzen", 1, 1, "ecke")],
  sakristei: [M("schrank", 2, 1, "wand", { hoch: true }), M("truhe", 1, 1, "wand"), M("tisch", 1, 1, "mitte"), M("regal", 2, 1, "wand", { hoch: true })],
  krypta: [M("sarkophag", 1, 2, "mitte", { pflicht: true }), M("sarkophag", 1, 2, "mitte"), M("sarkophag", 1, 2, "wand"), M("sarkophag", 1, 2, "wand"), M("kerzen", 1, 1, "ecke"), M("kerzen", 1, 1, "ecke")],
  kontor: [M("schreibpult", 2, 1, "wand", { pflicht: true }), M("regal", 2, 1, "wand", { hoch: true }), M("truhe", 1, 1, "wand"), M("kerzen", 1, 1, "ecke")],
  archiv: [M("regal", 2, 1, "wand", { hoch: true }), M("regal", 2, 1, "wand", { hoch: true }), M("regal", 2, 1, "wand", { hoch: true }), M("truhe", 1, 1, "ecke"), M("tisch", 1, 1, "mitte")],
  wache: [M("tafel", 2, 1, "mitte"), M("waffenstaender", 2, 1, "wand", { hoch: true }), M("bank", 2, 1, "wand"), M("kerzen", 1, 1, "ecke")],
  waffenkammer: [M("waffenstaender", 2, 1, "wand", { pflicht: true, hoch: true }), M("waffenstaender", 2, 1, "wand", { hoch: true }), M("ruestung", 1, 1, "wand"), M("truhe", 1, 1, "ecke")],
  verlies: [M("kisten", 1, 1, "ecke"), M("sack", 1, 1, "ecke"), M("kerzen", 1, 1, "ecke")],
  rittersaal: [M("teppich", 3, 2, "boden"), M("tafel", 2, 1, "mitte", { pflicht: true }), M("tafel", 2, 1, "mitte"), M("kamin", 2, 1, "aussen"), M("thron", 2, 2, "wand"), M("waffenstaender", 2, 1, "wand", { hoch: true })],
  ratssaal: [M("teppich", 3, 2, "boden"), M("tafel", 2, 1, "mitte", { pflicht: true }), M("tafel", 2, 1, "mitte"), M("kamin", 2, 1, "aussen"), M("regal", 2, 1, "wand", { hoch: true })],
  mahlwerk: [M("saeule", 1, 1, "mitte", { pflicht: true }), M("sack", 1, 1, "wand"), M("sack", 1, 1, "wand"), M("kisten", 1, 1, "ecke")],
  stall: [M("trog", 1, 1, "wand"), M("trog", 1, 1, "wand"), M("sack", 1, 1, "ecke"), M("fass", 1, 1, "ecke")],
  schlafsaal: [M("bett", 1, 2, "wand", { pflicht: true }), M("bett", 1, 2, "wand"), M("bett", 1, 2, "wand"), M("bett", 1, 2, "wand"), M("truhe", 1, 1, "wand"), M("truhe", 1, 1, "wand")],
  wohnen: [M("teppich_modern", 3, 2, "boden"), M("sofa", 3, 1, "wand", { pflicht: true }), M("couchtisch", 2, 1, "mitte"), M("fernseher", 2, 1, "wand"), M("esstisch", 2, 2, "mitte"), M("pflanze", 1, 1, "ecke"), M("regal", 2, 1, "wand", { hoch: true }), M("pflanze", 1, 1, "ecke")],
  kueche_modern: [M("kuechenzeile", 3, 1, "wand", { pflicht: true }), M("kuehlschrank", 1, 1, "ecke"), M("esstisch", 2, 2, "mitte"), M("pflanze", 1, 1, "ecke")],
  wc: [M("wc", 1, 1, "wand", { pflicht: true }), M("waschbecken", 1, 1, "wand")],
  bad: [M("wanne", 2, 1, "wand", { pflicht: true }), M("dusche", 1, 1, "ecke"), M("wc", 1, 1, "wand"), M("waschbecken", 1, 1, "wand")],
  schlafen: [M("teppich_modern", 3, 2, "boden"), M("doppelbett", 2, 2, "wand", { pflicht: true }), M("schrank_modern", 2, 1, "wand", { hoch: true }), M("pflanze", 1, 1, "ecke")],
  kind: [M("bett_modern", 1, 2, "ecke", { pflicht: true }), M("schreibtisch", 2, 1, "wand"), M("regal", 2, 1, "wand", { hoch: true }), M("spielzeug", 1, 1, "mitte")],
  buero_klein: [M("schreibtisch", 2, 1, "wand", { pflicht: true }), M("regal", 2, 1, "wand", { hoch: true }), M("regal", 2, 1, "wand", { hoch: true }), M("pflanze", 1, 1, "ecke"), M("sessel", 1, 1, "ecke")],
  hobby: [M("tischtennis", 3, 2, "mitte"), M("regal", 2, 1, "wand", { hoch: true }), M("waschmaschine", 1, 1, "wand"), M("waschmaschine", 1, 1, "wand")],
  technik: [M("heizung", 2, 1, "wand", { pflicht: true }), M("regal", 2, 1, "wand", { hoch: true }), M("kisten", 1, 1, "ecke")],
  treppenhaus: [M("pflanze", 1, 1, "ecke"), M("briefkaesten", 2, 1, "wand")],
  gemeinschaft: [M("holotisch", 2, 2, "mitte", { pflicht: true }), M("sessel", 1, 1, "wand"), M("sessel", 1, 1, "wand"), M("pflanze", 1, 1, "ecke"), M("konsole", 1, 1, "wand")],
  schleuse: [M("spind", 1, 1, "wand"), M("anzug", 1, 1, "wand"), M("anzug", 1, 1, "wand")],
  quartier: [M("koje", 1, 2, "ecke", { pflicht: true }), M("spind", 1, 1, "wand"), M("konsole", 1, 1, "wand")],
  quartier_gross: [M("doppelbett", 2, 2, "wand", { pflicht: true }), M("schreibtisch", 2, 1, "wand"), M("spind", 1, 1, "wand"), M("sessel", 1, 1, "ecke"), M("pflanze", 1, 1, "ecke")],
  hydro: [M("hydroregal", 3, 1, "wand", { pflicht: true, hoch: true }), M("hydroregal", 3, 1, "wand", { hoch: true }), M("hydroregal", 3, 1, "wand", { hoch: true }), M("tank", 1, 1, "ecke")],
  sanitaer: [M("dusche", 1, 1, "ecke", { pflicht: true }), M("wc", 1, 1, "wand"), M("waschbecken", 1, 1, "wand")],
  beobachtung: [M("sessel", 1, 1, "aussen"), M("sessel", 1, 1, "aussen"), M("sessel", 1, 1, "aussen"), M("holotisch", 2, 2, "mitte"), M("pflanze", 1, 1, "ecke")],
  labor_sci: [M("labortisch", 2, 1, "wand", { pflicht: true }), M("labortisch", 2, 1, "wand"), M("konsole", 1, 1, "wand"), M("kryokapsel", 1, 2, "wand")],
  med: [M("krankenbett", 1, 2, "wand", { pflicht: true }), M("krankenbett", 1, 2, "wand"), M("konsole", 1, 1, "wand"), M("spind", 1, 1, "wand")],
  technik_sci: [M("reaktor", 2, 2, "mitte", { pflicht: true }), M("konsole", 1, 1, "wand"), M("rohre", 3, 1, "wand"), M("behaelter", 1, 1, "ecke")],
  lager_sci: [M("behaelter", 1, 1, "ecke"), M("behaelter", 1, 1, "wand"), M("behaelter", 1, 1, "wand"), M("regal", 2, 1, "wand", { hoch: true }), M("regal", 2, 1, "wand", { hoch: true })],
  wasser: [M("tank", 1, 1, "ecke", { pflicht: true }), M("tank", 1, 1, "ecke"), M("rohre", 3, 1, "wand"), M("konsole", 1, 1, "wand")],
  reaktorkern: [M("reaktor", 2, 2, "mitte", { pflicht: true }), M("rohre", 3, 1, "wand"), M("konsole", 1, 1, "wand"), M("konsole", 1, 1, "wand")],
  leitstand: [M("kommandokonsole", 2, 2, "mitte", { pflicht: true }), M("bildschirmwand", 3, 1, "wand"), M("konsole", 1, 1, "wand"), M("konsole", 1, 1, "wand"), M("sessel", 1, 1, "ecke")],
  funk: [M("konsole", 1, 1, "wand", { pflicht: true }), M("konsole", 1, 1, "wand"), M("sessel", 1, 1, "wand"), M("regal", 2, 1, "wand", { hoch: true })],
  waffen_sci: [M("waffenstaender", 2, 1, "wand", { pflicht: true, hoch: true }), M("waffenstaender", 2, 1, "wand", { hoch: true }), M("behaelter", 1, 1, "ecke")],
  besprechung: [M("holotisch", 2, 2, "mitte", { pflicht: true }), M("bildschirmwand", 3, 1, "wand")],
  bunker: [M("koje", 1, 2, "wand", { pflicht: true }), M("koje", 1, 2, "wand"), M("behaelter", 1, 1, "ecke"), M("behaelter", 1, 1, "ecke"), M("tank", 1, 1, "ecke")],
  server: [M("server", 1, 1, "wand", { pflicht: true }), M("server", 1, 1, "wand"), M("server", 1, 1, "wand"), M("server", 1, 1, "wand"), M("konsole", 1, 1, "wand")],
});
/** Füllstücke für große Räume: ein zweiter Durchgang, damit eine Halle nicht leer wirkt. */
export const FUELLER: Readonly<Record<string, readonly MoebelRegel[]>> = Object.freeze({
  kueche: [M("fass", 1, 1, "wand"), M("sack", 1, 1, "wand"), M("kisten", 1, 1, "ecke")],
  lager: [M("kisten", 1, 1, "wand"), M("fass", 1, 1, "wand"), M("sack", 1, 1, "wand")],
  vorrat: [M("kisten", 1, 1, "wand"), M("fass", 1, 1, "wand"), M("sack", 1, 1, "mitte")],
  schank: [M("rundtisch", 1, 1, "mitte"), M("fass", 1, 1, "ecke"), M("bank", 2, 1, "wand")],
  werkstatt: [M("kisten", 1, 1, "wand"), M("fass", 1, 1, "wand"), M("werkbank", 2, 1, "wand")],
  stube: [M("sessel", 1, 1, "ecke"), M("truhe", 1, 1, "wand")],
  wohnen: [M("pflanze", 1, 1, "ecke"), M("sessel", 1, 1, "ecke")],
  hydro: [M("tank", 1, 1, "wand")],
  gemeinschaft: [M("sessel", 1, 1, "wand"), M("pflanze", 1, 1, "wand")],
  leitstand: [M("konsole", 1, 1, "wand")],
  lager_sci: [M("behaelter", 1, 1, "wand")],
  weinkeller: [M("fass", 1, 1, "wand")],
  schiff: [M("kerzen", 1, 1, "wand")],
  rittersaal: [M("waffenstaender", 2, 1, "wand", { hoch: true }), M("bank", 2, 1, "wand")],
  schlafsaal: [M("bett", 1, 2, "wand"), M("truhe", 1, 1, "wand")],
});

/** Die Regeln eines Raums: seine Stücke, und in großen Räumen einige Füllstücke dazu. */
export function moebelFuer(art: string, zellen: number): readonly MoebelRegel[] {
  const basis = MOEBEL_REGELN[art] ?? [], fuell = FUELLER[art] ?? [];
  const extra = zellen > 26 && fuell.length ? Math.floor((zellen - 18) / 9) : 0;
  return [...basis, ...Array.from({ length: extra }, (_, k) => fuell[k % fuell.length]!)];
}
