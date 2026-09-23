// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { planContains, type SettlementPlan, type SettlementUse } from "@chronicle/szene";
import type { Punkt } from "../../polygon.ts";

/**
 * **Welches Viertel wofür steht.** Die Rolle eines Viertels ist die Nutzung des Zonenplans —
 * eine Liste, nicht zwei (Spec 2026-09-23, E4). Wo die Spielleitung eine Zone gemalt hat, gilt
 * sie; sonst entscheidet die Lage: der Markt in der Mitte, der Tempel an ihm, die Burg auf dem
 * höchsten Mauerfleck, der Hafen am Wasser, das Handwerk an Toren und Ufer, die Armen draußen.
 */
export type Rolle = SettlementUse;
export interface FleckLage {
  readonly nr: number; readonly punkt: Punkt; readonly flaeche: number; readonly ferne: number;
  readonly nachbarn: readonly number[]; readonly ufer: boolean; readonly trocken: boolean;
  readonly kern: boolean; readonly mauerRand: boolean; readonly hoehe: number; readonly tor: boolean;
}
export interface RollenAuftrag { readonly art: "weiler" | "dorf" | "stadt"; readonly burg: boolean; readonly plan?: SettlementPlan; readonly breite: number; readonly hoehe: number }

/** Letzte Zone gewinnt, eine Freifläche immer — dieselbe Regel wie `roofZone`. */
export function planRolle(plan: SettlementPlan | undefined, p: Punkt, breite: number, hoehe: number): Rolle | undefined {
  if (!plan) return undefined;
  const punkt = [p[0] / breite, p[1] / hoehe] as const;
  const treffer = plan.zonen.filter(zone => planContains(zone.polygon, punkt));
  if (treffer.some(zone => zone.nutzung === "frei")) return "frei";
  return treffer.at(-1)?.nutzung;
}
const planHat = (a: RollenAuftrag, rolle: Rolle) => !!a.plan?.zonen.some(zone => zone.nutzung === rolle);

export function waehleMarkt(lagen: readonly FleckLage[], a: RollenAuftrag): number {
  const trocken = lagen.filter(l => l.trocken && l.flaeche >= 1.5);
  const geplant = trocken.filter(l => planRolle(a.plan, l.punkt, a.breite, a.hoehe) === "markt");
  const kandidaten = (geplant.length ? geplant : trocken.filter(l => planRolle(a.plan, l.punkt, a.breite, a.hoehe) === undefined))
    .sort((x, y) => x.ferne - y.ferne || x.nr - y.nr);
  return kandidaten[0]?.nr ?? -1;
}

export function weiseRollenZu(lagen: readonly FleckLage[], markt: number, a: RollenAuftrag): { rollen: ReadonlyMap<number, Rolle>; ausgelassen: readonly string[] } {
  const rollen = new Map<number, Rolle>(), ausgelassen: string[] = [], nachNr = new Map(lagen.map(l => [l.nr, l]));
  for (const l of lagen) {
    const geplant = planRolle(a.plan, l.punkt, a.breite, a.hoehe);
    // Ein geplanter Markt entsteht nur dort, wo `waehleMarkt` ihn hingelegt hat — eine Stadt hat einen.
    if (geplant && geplant !== "markt") rollen.set(l.nr, geplant);
  }
  if (markt >= 0) rollen.set(markt, "markt");
  const frei = (l: FleckLage) => !rollen.has(l.nr) && l.trocken;
  const beste = (liste: readonly FleckLage[], wert: (l: FleckLage) => number) => liste.filter(frei).sort((x, y) => wert(y) - wert(x) || x.nr - y.nr);
  const nachbarVon = (nrs: readonly number[]) => lagen.filter(l => nrs.some(nr => nachNr.get(nr)?.nachbarn.includes(l.nr)));
  const n = lagen.length;

  if (a.art === "stadt" && !planHat(a, "tempel")) {
    const t = beste(nachbarVon([markt]).filter(l => l.kern), l => l.flaeche)[0];
    if (t) rollen.set(t.nr, "tempel");
  }
  if (a.burg && !planHat(a, "burg")) {
    const b = beste(lagen.filter(l => l.kern && l.mauerRand), l => l.hoehe + (l.ufer ? 12 : 0) + l.flaeche * .5)[0];
    if (b) rollen.set(b.nr, "burg");
    else ausgelassen.push("Keine Burg: die Stadt hat keinen trockenen Fleck an der Mauer, auf dem sie stehen könnte.");
  }
  if (a.art !== "weiler" && !planHat(a, "hafen"))
    for (const l of beste(lagen.filter(l => l.ufer), l => -l.ferne).slice(0, a.art === "stadt" ? 3 : 1)) rollen.set(l.nr, "hafen");
  if (a.art === "stadt") {
    if (!planHat(a, "adel")) {
      const anker = [...rollen].filter(([, rolle]) => rolle === "markt" || rolle === "tempel" || rolle === "burg").map(([nr]) => nr);
      for (const l of beste(nachbarVon(anker).filter(l => l.kern), l => l.hoehe - l.ferne * 2).slice(0, Math.max(1, Math.round(n * .1)))) rollen.set(l.nr, "adel");
    }
    if (!planHat(a, "handwerk"))
      for (const l of beste(lagen.filter(l => l.tor || l.ufer), l => (l.tor ? 2 : 0) + (l.ufer ? 1 : 0) - l.ferne * .01).slice(0, Math.max(1, Math.round(n * .16)))) rollen.set(l.nr, "handwerk");
    if (!planHat(a, "arm"))
      for (const l of beste(lagen.filter(l => !l.kern), l => (l.tor ? 1 : 0) - l.hoehe * .01).slice(0, Math.max(1, Math.round(n * .14)))) rollen.set(l.nr, "arm");
    if (!planHat(a, "frei") && n >= 14) {
      const tempel = [...rollen].find(([, rolle]) => rolle === "tempel")?.[0];
      const p = beste(nachbarVon(tempel === undefined ? [markt] : [tempel]).filter(l => l.kern), l => -l.flaeche)[0];
      if (p) rollen.set(p.nr, "frei");
    }
  } else if (a.art === "dorf" && !planHat(a, "handwerk")) {
    const h = beste(lagen.filter(l => l.ufer || l.tor), l => (l.ufer ? 1 : 0) - l.ferne * .01)[0];
    if (h) rollen.set(h.nr, "handwerk");
  }
  for (const l of lagen) if (!rollen.has(l.nr)) rollen.set(l.nr, "wohnen");
  return { rollen, ausgelassen };
}
