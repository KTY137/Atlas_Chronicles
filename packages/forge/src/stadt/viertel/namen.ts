// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { parseSettlementPlan, type SettlementPlan } from "@chronicle/szene";
import { flaeche, q, schwerpunkt, type Polygon, type Punkt } from "../../polygon.ts";
import type { Zufall } from "../gemeinsam.ts";
import type { Rolle } from "./rollen.ts";

/**
 * **Viertel mit Namen.** Zusammenhängende Flecken gleicher Rolle (und gleicher Seite der Mauer)
 * bilden ein Viertel. Es heißt nach seiner Rolle — Marktplatz, Domfreiheit, Gerberviertel —,
 * Vorstädte nach ihrer Himmelsrichtung. Jeder Name kommt einmal vor.
 */
export interface Viertel { readonly id: string; readonly nutzung: Rolle; readonly name: string; readonly flecken: readonly number[]; readonly flaeche: number; readonly anker: Punkt }

const NAMEN: Readonly<Record<Rolle, readonly string[]>> = Object.freeze({
  markt: ["Marktplatz", "Kornmarkt", "Alter Markt"], tempel: ["Domfreiheit", "Tempelbezirk", "Kirchberg"],
  burg: ["Burgberg", "Hohe Burg", "Zwingburg"], hafen: ["Hafenviertel", "Fischerviertel", "Am Kai"],
  handwerk: ["Gerberviertel", "Schmiedeviertel", "Weberviertel", "Töpferviertel", "Färberviertel"],
  adel: ["Oberstadt", "Herrenviertel", "Rosenhöhe"], arm: ["Unterstadt", "Lumpenviertel", "Schattengasse"],
  wohnen: ["Altstadt", "Neustadt", "Brunnenviertel", "Lindenviertel", "Mittelstadt"], frei: ["Stadtpark", "Lindengarten"],
});
const RICHTUNG: readonly (readonly [Punkt, string])[] = [[[0, -1], "Nord"], [[1, 0], "Ost"], [[0, 1], "Süd"], [[-1, 0], "West"]];

export function viertelBilden(lagen: readonly { nr: number; zelle: Polygon; nachbarn: readonly number[]; kern: boolean }[], rollen: ReadonlyMap<number, Rolle>, mitte: Punkt, r: Zufall): Viertel[] {
  const nachNr = new Map(lagen.map(l => [l.nr, l])), gesehen = new Set<number>(), result: Viertel[] = [], vergeben = new Set<string>();
  for (const start of [...lagen].sort((a, b) => a.nr - b.nr)) {
    if (gesehen.has(start.nr)) continue;
    const rolle = rollen.get(start.nr) ?? "wohnen", teil = [start.nr];
    gesehen.add(start.nr);
    for (let i = 0; i < teil.length; i++) for (const n of nachNr.get(teil[i]!)!.nachbarn) {
      const l = nachNr.get(n);
      if (!l || gesehen.has(n) || (rollen.get(n) ?? "wohnen") !== rolle || l.kern !== start.kern) continue;
      gesehen.add(n); teil.push(n);
    }
    const groesster = teil.map(n => nachNr.get(n)!).sort((a, b) => flaeche(b.zelle) - flaeche(a.zelle) || a.nr - b.nr)[0]!;
    const anker = schwerpunkt(groesster.zelle), gesamt = teil.reduce((s, n) => s + flaeche(nachNr.get(n)!.zelle), 0);
    let name: string | undefined;
    if (!start.kern && (rolle === "wohnen" || rolle === "arm" || rolle === "handwerk")) {
      const dx = anker[0] - mitte[0], dy = anker[1] - mitte[1];
      name = `${[...RICHTUNG].sort((a, b) => (b[0][0] * dx + b[0][1] * dy) - (a[0][0] * dx + a[0][1] * dy))[0]![1]}vorstadt`;
    } else {
      const frei = NAMEN[rolle].filter(n => !vergeben.has(n));
      name = frei.length ? frei[Math.min(frei.length - 1, Math.floor(r.zahl(0, 1) * frei.length))] : undefined;
    }
    if (!name || vergeben.has(name)) continue;
    vergeben.add(name);
    result.push({ id: `viertel.${q(anker[0])}_${q(anker[1])}`, nutzung: rolle, name, flecken: teil.sort((a, b) => a - b), flaeche: gesamt, anker });
  }
  return result;
}

/** Ein Zonenplan aus den erzeugten Vierteln: eine Zone je Fleck, der nicht Wohnen ist (Wohnen
 *  entsteht ohne Zone ohnehin), wichtigste Rollen zuerst, höchstens 16 (Spec E10). */
export function viertelPlan(viertel: readonly Viertel[], zellen: ReadonlyMap<number, Polygon>, breite: number, hoehe: number): SettlementPlan {
  const RANG: readonly Rolle[] = ["markt", "tempel", "burg", "hafen", "adel", "handwerk", "arm", "frei"];
  const bruch = (wert: number, groesse: number) => Math.min(1, Math.max(0, Math.round(wert / groesse * 10000) / 10000));
  const zonen = viertel.filter(v => v.nutzung !== "wohnen")
    .sort((a, b) => RANG.indexOf(a.nutzung) - RANG.indexOf(b.nutzung) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .flatMap(v => v.flecken.map(nr => ({ v, zelle: zellen.get(nr) })))
    .filter((x): x is { v: Viertel; zelle: Polygon } => !!x.zelle && x.zelle.length >= 3 && x.zelle.length <= 32)
    .slice(0, 16)
    .map(({ v, zelle }) => ({ name: v.name, nutzung: v.nutzung, dichte: 1, polygon: zelle.map(([x, y]) => [bruch(x, breite), bruch(y, hoehe)] as const) }))
    // Das Runden auf Zehntausendstel kann eine Zelle entarten lassen; eine Zone, die der Zonenplan
    // selbst nicht annähme, wird nicht angeboten.
    .filter(zone => { try { parseSettlementPlan({ schemaVersion: 1, zonen: [{ id: "probe", ...zone }] }); return true; } catch { return false; } })
    .map((zone, i) => ({ id: `viertel-${i + 1}`, ...zone }));
  return { schemaVersion: 1, zonen };
}
