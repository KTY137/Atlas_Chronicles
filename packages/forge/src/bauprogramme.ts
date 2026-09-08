// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BauwerkTyp, KartenSetting } from "@chronicle/szene";

/** A room program names equipment and floor materials, independently of a particular pack. */
export interface RaumThema { readonly schluessel: string; readonly boden: string; readonly stuecke: readonly (readonly [string, string])[] }
const thema = (schluessel: string, boden: string, moebel: readonly string[], aufbau: readonly string[] = []): RaumThema => ({
  schluessel, boden, stuecke: [...moebel.map(tag => ["moebel", tag] as const), ...aufbau.map(tag => ["aufbau", tag] as const), ["licht", "kalt"]],
});
export const ZEIT_THEMEN: Readonly<Record<string, RaumThema>> = Object.freeze({
  foyer: thema("foyer", "fliesen", ["empfang", "sitz"]), apartment: thema("apartment", "wohnraum", ["sofa", "hotelbett", "kuechenzeile"]),
  buero: thema("buero", "teppich", ["schreibtisch", "computer", "sitz"]), konferenz: thema("konferenz", "teppich", ["mahl", "sitz", "computer"]),
  serverraum: thema("serverraum", "metall", ["computer", "konsole"]), cafe: thema("cafe", "fliesen", ["mahl", "sitz", "sofa"]),
  theke: thema("theke", "fliesen", ["kaffeemaschine", "kasse"]), kueche: thema("kueche", "fliesen", ["kuechenzeile", "kuehlregal"]),
  speisesaal: thema("speisesaal", "wohnraum", ["mahl", "sitz", "sitz"]), spuelkueche: thema("spuelkueche", "fliesen", ["kuechenzeile"]),
  verkaufsflaeche: thema("verkaufsflaeche", "fliesen", ["regal", "regal", "kuehlregal"]), kassen: thema("kassen", "fliesen", ["kasse", "scanner"]),
  kuehllager: thema("kuehllager", "steril", ["kuehlregal", "regal"]), lager: thema("lager", "beton", ["regal", "spind"]),
  triage: thema("triage", "steril", ["empfang", "scanner", "krankenbett"]), station: thema("station", "steril", ["krankenbett", "krankenbett"]),
  operation: thema("operation", "steril", ["operation", "scanner", "computer"]), apotheke: thema("apotheke", "steril", ["regal", "kuehlregal"]),
  leitstelle: thema("leitstelle", "teppich", ["computer", "konsole", "schreibtisch"]), verhoer: thema("verhoer", "beton", ["mahl", "sitz"]),
  gewahrsam: thema("gewahrsam", "beton", ["hotelbett"]), umkleide: thema("umkleide", "fliesen", ["spind", "sitz"]),
  fahrzeughalle: thema("fahrzeughalle", "beton", ["werkbank"], ["verkehr"]), ruheraum: thema("ruheraum", "wohnraum", ["hotelbett", "sofa"]),
  klassenraum: thema("klassenraum", "fliesen", ["schulbank", "schulbank", "computer"]), lehrerzimmer: thema("lehrerzimmer", "teppich", ["schreibtisch", "sitz"]),
  mensa: thema("mensa", "fliesen", ["mahl", "sitz", "kuechenzeile"]), hotelzimmer: thema("hotelzimmer", "teppich", ["hotelbett", "schreibtisch"]),
  produktion: thema("produktion", "beton", ["werkbank"], ["maschine", "maschine"]), qualitaet: thema("qualitaet", "steril", ["labortisch", "scanner"]),
  frachthalle: thema("frachthalle", "beton", ["regal"], ["verkehr"]), wartehalle: thema("wartehalle", "fliesen", ["sitz", "sitz", "ticket"]),
  bahnsteig: thema("bahnsteig", "beton", ["sitz", "scanner"]), fahrkarten: thema("fahrkarten", "fliesen", ["ticket", "kasse"]),
  analyse: thema("analyse", "steril", ["labortisch", "scanner", "computer"]), reinraum: thema("reinraum", "steril", ["labortisch", "operation"]),
  probenlager: thema("probenlager", "steril", ["kuehlregal", "regal"]), hangar: thema("hangar", "metall", ["werkbank"], ["verkehr"]),
  kontrolle: thema("kontrolle", "metall", ["scanner", "konsole"]), schleuse: thema("schleuse", "metall", ["scanner", "spind"]),
  kommando: thema("kommando", "metall", ["konsole", "konsole", "computer"]), quartier: thema("quartier", "metall", ["kryokapsel", "spind"]),
  lebenserhaltung: thema("lebenserhaltung", "metall", ["konsole"], ["maschine"]), medizin: thema("medizin", "steril", ["krankenbett", "scanner", "operation"]),
  isolation: thema("isolation", "steril", ["kryokapsel", "scanner"]), lagezentrum: thema("lagezentrum", "metall", ["konsole", "computer", "mahl"]),
  kommunikation: thema("kommunikation", "metall", ["konsole"], ["antenne"]), reaktorkern: thema("reaktorkern", "metall", ["konsole"], ["reaktor"]),
  kuehlung: thema("kuehlung", "metall", ["konsole"], ["maschine"]), wartung: thema("wartung", "beton", ["werkbank", "spind"]),
  lesesaal: thema("lesesaal", "wohnraum", ["mahl", "sitz", "buecher"]), freihand: thema("freihand", "wohnraum", ["buecher", "buecher"]),
  archiv: thema("archiv", "beton", ["regal", "buecher"]), ausstellung: thema("ausstellung", "gehoben", ["vitrine", "vitrine"]),
  restaurierung: thema("restaurierung", "steril", ["werkbank", "labortisch"]), schalterhalle: thema("schalterhalle", "gehoben", ["empfang", "kasse"]),
  tresorraum: thema("tresorraum", "beton", ["tresor", "tresor"]), beratung: thema("beratung", "teppich", ["schreibtisch", "sitz"]),
  reparatur: thema("reparatur", "beton", ["werkbank", "werkbank"], ["maschine"]), ersatzteile: thema("ersatzteile", "beton", ["regal", "spind"]),
});
export const ZEIT_RAUM_LABEL: Readonly<Record<string, string>> = Object.freeze({
  foyer: "Empfang", apartment: "Apartment", buero: "Arbeitsbüro", konferenz: "Besprechung", serverraum: "Serverraum",
  cafe: "Cafébereich", theke: "Kaffeetheke", kueche: "Küche", speisesaal: "Speisesaal", spuelkueche: "Spülküche",
  verkaufsflaeche: "Verkaufsfläche", kassen: "Kassenbereich", kuehllager: "Kühllager", lager: "Warenlager",
  triage: "Aufnahme und Triage", station: "Patientenstation", operation: "Operationssaal", apotheke: "Apotheke",
  leitstelle: "Leitstelle", verhoer: "Vernehmung", gewahrsam: "Gewahrsam", umkleide: "Umkleide",
  fahrzeughalle: "Fahrzeughalle", ruheraum: "Bereitschaftsraum", klassenraum: "Klassenraum", lehrerzimmer: "Lehrerzimmer",
  mensa: "Mensa", hotelzimmer: "Hotelzimmer", produktion: "Produktionshalle", qualitaet: "Qualitätskontrolle",
  frachthalle: "Frachthalle", wartehalle: "Wartehalle", bahnsteig: "Bahnsteig", fahrkarten: "Fahrkartenschalter",
  analyse: "Analyselabor", reinraum: "Reinraum", probenlager: "Probenlager", hangar: "Hangar", kontrolle: "Sicherheitskontrolle",
  schleuse: "Luftschleuse", kommando: "Kommandobrücke", quartier: "Crewquartier", lebenserhaltung: "Lebenserhaltung",
  medizin: "Behandlungsraum", isolation: "Isolationsstation", lagezentrum: "Lagezentrum", kommunikation: "Kommunikation",
  reaktorkern: "Reaktorkern", kuehlung: "Kühlkreislauf", wartung: "Wartungsraum", lesesaal: "Lesesaal",
  freihand: "Bücherbestand", archiv: "Archiv", ausstellung: "Ausstellungssaal", restaurierung: "Restaurierung",
  schalterhalle: "Schalterhalle", tresorraum: "Tresorraum", beratung: "Beratungszimmer", reparatur: "Reparaturhalle", ersatzteile: "Ersatzteillager",
});
type Form = "riegel" | "fluegel" | "halle" | "kern";
interface Programm { readonly form: Form; readonly anteil: number; readonly raeume: readonly string[] }
export const BAUPROGRAMME: Readonly<Partial<Record<BauwerkTyp, Programm>>> = Object.freeze({
  wohnblock: { form: "fluegel", anteil: .23, raeume: ["foyer", "apartment", "apartment", "apartment", "apartment", "lager"] },
  buero: { form: "fluegel", anteil: .28, raeume: ["foyer", "buero", "buero", "konferenz", "serverraum"] },
  cafe: { form: "riegel", anteil: .65, raeume: ["cafe", "theke", "kueche", "lager"] },
  restaurant: { form: "halle", anteil: .62, raeume: ["speisesaal", "kueche", "kuehllager", "spuelkueche"] },
  supermarkt: { form: "riegel", anteil: .72, raeume: ["verkaufsflaeche", "kassen", "lager", "kuehllager"] },
  krankenhaus: { form: "fluegel", anteil: .25, raeume: ["triage", "station", "station", "operation", "analyse", "apotheke"] },
  polizei: { form: "fluegel", anteil: .3, raeume: ["foyer", "leitstelle", "verhoer", "gewahrsam", "umkleide"] },
  feuerwache: { form: "halle", anteil: .68, raeume: ["fahrzeughalle", "leitstelle", "umkleide", "ruheraum"] },
  schule: { form: "fluegel", anteil: .22, raeume: ["foyer", "klassenraum", "klassenraum", "klassenraum", "lehrerzimmer", "mensa"] },
  hotel: { form: "fluegel", anteil: .28, raeume: ["foyer", "hotelzimmer", "hotelzimmer", "hotelzimmer", "hotelzimmer", "lager"] },
  fabrik: { form: "halle", anteil: .72, raeume: ["produktion", "qualitaet", "frachthalle", "leitstelle"] },
  bahnhof: { form: "halle", anteil: .42, raeume: ["wartehalle", "bahnsteig", "fahrkarten", "kontrolle"] },
  labor: { form: "riegel", anteil: .55, raeume: ["analyse", "reinraum", "probenlager", "umkleide"] },
  raumhafen: { form: "halle", anteil: .7, raeume: ["hangar", "kontrolle", "frachthalle", "kommando"] },
  raumstation: { form: "kern", anteil: .42, raeume: ["schleuse", "kommando", "quartier", "lebenserhaltung", "medizin"] },
  medstation: { form: "fluegel", anteil: .26, raeume: ["triage", "medizin", "isolation", "operation", "probenlager"] },
  kommando: { form: "kern", anteil: .5, raeume: ["lagezentrum", "kommunikation", "kontrolle", "serverraum", "quartier"] },
  reaktor: { form: "kern", anteil: .56, raeume: ["reaktorkern", "leitstelle", "kuehlung", "wartung", "schleuse"] },
  bibliothek: { form: "riegel", anteil: .58, raeume: ["lesesaal", "freihand", "archiv", "foyer"] },
  museum: { form: "fluegel", anteil: .24, raeume: ["foyer", "ausstellung", "ausstellung", "restaurierung", "archiv"] },
  bank: { form: "riegel", anteil: .56, raeume: ["schalterhalle", "beratung", "tresorraum", "leitstelle"] },
  werkstatt: { form: "halle", anteil: .65, raeume: ["reparatur", "ersatzteile", "buero", "umkleide"] },
});

/** The four shared civic programs also exist before electronics and industrial furniture. */
const KLASSISCHE_THEMEN: Readonly<Record<string, Omit<RaumThema, "schluessel">>> = Object.freeze({
  lesesaal: { boden: "wohnraum", stuecke: [["moebel", "mahl"], ["moebel", "sitz"], ["moebel", "buecher"], ["licht", "kerze"]] },
  freihand: { boden: "wohnraum", stuecke: [["moebel", "buecher"], ["moebel", "buecher"], ["licht", "kerze"]] },
  archiv: { boden: "keller", stuecke: [["moebel", "buecher"], ["moebel", "lager"], ["licht", "kerze"]] },
  foyer: { boden: "halle", stuecke: [["moebel", "mahl"], ["moebel", "sitz"], ["licht", "warm"]] },
  ausstellung: { boden: "gehoben", stuecke: [["moebel", "schatz"], ["gefaess", "kult"], ["aufbau", "traeger"], ["licht", "warm"]] },
  restaurierung: { boden: "wohnraum", stuecke: [["moebel", "handwerk"], ["moebel", "mahl"], ["licht", "kerze"]] },
  schalterhalle: { boden: "gehoben", stuecke: [["moebel", "mahl"], ["gefaess", "schatz"], ["licht", "warm"]] },
  tresorraum: { boden: "keller", stuecke: [["gefaess", "schatz"], ["moebel", "schatz"], ["licht", "wache"]] },
  beratung: { boden: "wohnraum", stuecke: [["moebel", "wissen"], ["moebel", "sitz"], ["licht", "kerze"]] },
  leitstelle: { boden: "wohnraum", stuecke: [["moebel", "wissen"], ["moebel", "buecher"], ["licht", "kerze"]] },
  reparatur: { boden: "keller", stuecke: [["moebel", "handwerk"], ["moebel", "handwerk"], ["licht", "warm"]] },
  ersatzteile: { boden: "keller", stuecke: [["moebel", "lager"], ["gefaess", "behaelter"], ["licht", "kerze"]] },
  buero: { boden: "wohnraum", stuecke: [["moebel", "wissen"], ["moebel", "buecher"], ["licht", "kerze"]] },
  umkleide: { boden: "wohnraum", stuecke: [["moebel", "kammer"], ["moebel", "sitz"], ["licht", "kerze"]] },
});

export function zeitThema(key: string, setting: KartenSetting): RaumThema {
  if (setting === "fantasy" && KLASSISCHE_THEMEN[key]) return { schluessel: key, ...KLASSISCHE_THEMEN[key]! };
  const t = ZEIT_THEMEN[key]!;
  // Science-fiction keeps the room's function; its surfaces become ship/station materials.
  return setting === "scifi" && t.boden !== "steril" ? { ...t, boden: "metall" } : t;
}
export function freieZeitThemen(setting: KartenSetting): readonly RaumThema[] {
  return (setting === "scifi" ? ["kommando", "quartier", "analyse", "lebenserhaltung", "lager"]
    : ["buero", "konferenz", "lager", "foyer", "reparatur"]).map(key => zeitThema(key, setting));
}
export interface ProgrammRaum { x: number; y: number; w: number; h: number; pfad: string; thema: RaumThema }

/** Four architectural organizations: service strip, entrance wing, production hall, radial core. */
export function programmRaeume(profil: BauwerkTyp, breite: number, hoehe: number, min: number, budget: number, setting: KartenSetting): ProgrammRaum[] {
  const p = BAUPROGRAMME[profil]!, result: ProgrammRaum[] = [];
  const w = breite - 2, h = hoehe - 2, maxCount = Math.min(budget, p.raeume.length);
  const add = (nr: number, x: number, y: number, rw: number, rh: number) => {
    if (rw < min || rh < min) return;
    const key = p.raeume[nr]!;
    result.push({ x, y, w: rw, h: rh, pfad: `${profil}/${key}/${nr}`, thema: zeitThema(key, setting) });
  };
  if (p.form === "kern" && w >= 3 * min + 2 && h >= 3 * min + 2 && maxCount >= 3) {
    const cw = Math.max(min, Math.min(w - 2 * min - 2, Math.floor(w * p.anteil)));
    const ch = Math.max(min, Math.min(h - 2 * min - 2, Math.floor(h * p.anteil)));
    const cx = 1 + Math.floor((w - cw) / 2), cy = 1 + Math.floor((h - ch) / 2);
    add(0, cx, cy, cw, ch);
    if (maxCount > 1) add(1, cx, 1, cw, cy - 2);
    if (maxCount > 2) add(2, cx + cw + 1, cy, w - cx - cw, ch);
    if (maxCount > 3) add(3, cx, cy + ch + 1, cw, h - cy - ch);
    if (maxCount > 4) add(4, 1, cy, cx - 2, ch);
  } else if (p.form === "fluegel" && h >= 2 * min + 1 && w >= 2 * min + 1 && maxCount >= 3) {
    const hall = Math.max(min, Math.min(h - min - 1, Math.floor(h * p.anteil)));
    add(0, 1, h - hall + 1, w, hall);
    const available = h - hall - 1, rows = Math.min(Math.ceil((maxCount - 1) / 2), Math.floor((available + 1) / (min + 1)));
    const left = Math.floor((w - 1) / 2);
    for (let i = 1; i < maxCount && i <= rows * 2; i++) {
      const row = Math.floor((i - 1) / 2), col = (i - 1) % 2;
      const y = 1 + Math.floor(row * (available + 1) / rows), end = Math.floor((row + 1) * (available + 1) / rows);
      add(i, col === 0 ? 1 : left + 2, y, col === 0 ? left : w - left - 1, end - y);
    }
  } else {
    const horizontal = p.form === "halle", long = horizontal ? w : h, cross = horizontal ? h : w;
    const main = Math.max(min, Math.min(cross - min - 1, Math.floor(cross * p.anteil)));
    const count = Math.min(maxCount - 1, Math.floor((long + 1) / (min + 1)));
    add(0, 1, 1, horizontal ? w : main, horizontal ? main : h);
    for (let i = 1; i <= count; i++) {
      const from = 1 + Math.floor((i - 1) * (long + 1) / count), end = Math.floor(i * (long + 1) / count);
      add(i, horizontal ? from : main + 2, horizontal ? main + 2 : from, horizontal ? end - from : w - main - 1, horizontal ? h - main - 1 : end - from);
    }
  }
  return result;
}
