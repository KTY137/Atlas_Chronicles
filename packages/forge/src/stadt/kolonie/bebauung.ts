// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BauwerkTyp } from "@chronicle/szene";
import { abstandPolygonStrecke, einwaerts, einwaertsKanten, flaeche, imPolygon, q, qp, schnittKonvex, schwerpunkt, type Polygon, type Punkt } from "../../polygon.ts";
import { frontParzellen, getrennteDaecher, mitAbstand, type Gasse } from "../gemeinsam.ts";
import { vieleck } from "../kreis.ts";
import { achse, platzUm, rechteck, vorDerTuer, type Bau, type FleckBau, type ParzellenAuftrag, type Platz } from "../viertel/parzellen.ts";

/**
 * **Ein Sektor der Kolonie wird bebaut** (Spec 2026-09-23-stadt-zukunft, 6.4). Die Nabe trägt
 * Kommandozentrale und Reaktor auf einem Deck; Wohnsektoren reihen Kuppeln an ihren Straßen und
 * halten innen einen Hydrokulturgarten; Wohntürme sind Achtecke; das Frachtquartier stapelt
 * Container; die Fertigung hat Hallen; der Raumhafen Landefelder auf einem Vorfeld.
 */
const bandBreite = (s: Gasse) => flaeche(s.band) / (Math.hypot(s.bis[0] - s.von[0], s.bis[1] - s.von[1]) || 1);
/** Kanten des Sektors, an denen eine Straße liegt. */
function fronten(innen: Polygon, strassen: readonly Gasse[]) {
  return innen.flatMap((p, i) => {
    const b = innen[(i + 1) % innen.length]!, laenge = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const mitte: Punkt = [(p[0] + b[0]) / 2, (p[1] + b[1]) / 2];
    return laenge >= 1.5 && strassen.some(s => abstandPolygonStrecke([mitte], s.von, s.bis) <= bandBreite(s) + .35) ? [{ von: p, bis: b, laenge }] : [];
  });
}

export function bebaueSektor(a: ParzellenAuftrag): FleckBau {
  const innen = einwaertsKanten(a.zelle, a.abstaende).map(qp);
  const leer: FleckBau = { baue: [], plaetze: [], gassen: [], hoefe: [] };
  if (innen.length < 3 || flaeche(innen) < .8) return leer;
  const nass = (p: Polygon) => a.hindernisse.some(w => flaeche(schnittKonvex(p, w)) > 1e-6);
  const baue: Bau[] = [], plaetze: Platz[] = [], hoefe: Polygon[] = [];
  const strassen = a.randStrassen, m = schwerpunkt(innen), rho = Math.sqrt(flaeche(innen) / Math.PI);
  const { u } = achse(innen);
  const frei = (p: Polygon) => p.length >= 3 && p.every(x => imPolygon(x, innen)) && !nass(p) && baue.every(b => getrennteDaecher(b.umriss, p));
  const setze = (pfad: string, umriss: Polygon, los: Polygon, tuer: Gasse | string, typ: BauwerkTyp | null, rang: number): boolean => {
    if (!frei(umriss) || flaeche(umriss) < .2) return false;
    baue.push({ pfad, umriss: umriss.map(qp), los: (nass(los) ? umriss : los).map(qp), strasse: typeof tuer === "string" ? tuer : tuer.id, typ, rang });
    return true;
  };
  const pfadVon = (p: Polygon, art: string) => { const c = schwerpunkt(p); return `${a.pfad}.${art}.${q(c[0])}_${q(c[1])}`; };
  /** Sonderbauten auf einem Deck: was vom Sektor bleibt, ist Platz, und der Platz ist ihre Adresse. */
  const deck = (teile: readonly (readonly [Polygon, BauwerkTyp, number])[]) => {
    const passend = teile.filter(([p]) => frei(p));
    if (!passend.length) return false;
    const platz = platzUm(innen, passend.map(([p]) => mitAbstand(p, .25)), a.pfad, "square").filter(p => !nass(p.polygon));
    if (!platz.length) return false;
    const groesster = platz.reduce((x, y) => flaeche(y.polygon) > flaeche(x.polygon) ? y : x);
    plaetze.push(...platz);
    for (const [p, typ, rang] of passend) setze(pfadVon(p, typ), p, p, a.id("markt", groesster.pfad), typ, rang);
    return true;
  };
  /** Runde Bauten in Reihe an jeder Straßenkante: Mittelpunkte im Abstand, einen Radius nach innen. */
  const reihe = (radius: number, ecken: number, abstand: number, typ: BauwerkTyp | null) => {
    for (const f of fronten(innen, strassen)) {
      const t: Punkt = [(f.bis[0] - f.von[0]) / f.laenge, (f.bis[1] - f.von[1]) / f.laenge];
      let n: Punkt = [-t[1], t[0]];
      if ((m[0] - f.von[0]) * n[0] + (m[1] - f.von[1]) * n[1] < 0) n = [-n[0], -n[1]];
      const anzahl = Math.floor((f.laenge - .3) / abstand);
      for (let i = 0; i < anzahl; i++) {
        const x = (f.laenge - anzahl * abstand) / 2 + abstand * (i + .5), c: Punkt = [f.von[0] + t[0] * x + n[0] * (radius + .12), f.von[1] + t[1] * x + n[1] * (radius + .12)];
        const bau = vieleck(c, radius, ecken, ecken === 8 ? [.9238795325112867, .3826834323650898] : [1, 0]);
        const tuer = vorDerTuer(bau, strassen);
        const los = schnittKonvex(rechteck(c, t, 2 * radius + .3, 2 * radius + .3), innen);
        if (tuer && los.length >= 3) setze(pfadVon(bau, "kuppel"), bau, los, tuer, typ, 2);
      }
    }
    const garten = einwaerts(innen, 2 * radius + .5);
    if (garten.length >= 3 && flaeche(garten) >= 1 && !nass(garten)) plaetze.push({ pfad: `${a.pfad}.garten`, polygon: garten.map(qp), material: "grass" });
  };
  /** Ein rechteckiger Bau im Los, entlang seiner längsten Kante, so groß wie er hineinpasst. */
  const kasten = (los: Polygon, anteil: number): Polygon => {
    const { u: ul, laenge, breite } = achse(los), c = schwerpunkt(los);
    for (const s of [anteil, anteil * .8, anteil * .62]) {
      const r = rechteck(c, ul, laenge * s, breite * s);
      if (r.every(p => imPolygon(p, los))) return r;
    }
    return [];
  };
  const lose = (frontage: number, tiefe: number, anteil: number, typ: BauwerkTyp | null) => {
    for (const los of frontParzellen(innen, fronten(innen, strassen), frontage, tiefe, a.r)) {
      const tuer = vorDerTuer(los, strassen);
      if (!tuer || nass(los) || !setze(pfadVon(los, "los"), kasten(los, anteil), los, tuer, typ, 2)) hoefe.push(los);
    }
  };
  // Der Kuppelradius folgt dem Losmaß der Stadt, aber nie über den Platz, den der Sektor hat.
  const inkreis = Math.min(...innen.map((p, i) => {
    const b = innen[(i + 1) % innen.length]!, l = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
    return Math.abs((b[0] - p[0]) * (m[1] - p[1]) - (b[1] - p[1]) * (m[0] - p[0])) / l;
  }));
  const radius = Math.max(.6, Math.min(1.5, Math.sqrt(a.losFlaeche) * .45, inkreis * .8));

  switch (a.rolle) {
    case "markt": case "burg": {
      const kern = Math.max(.9, Math.min(2.4, rho * .38)), neben: Punkt = [m[0] + u[0] * rho * .62, m[1] + u[1] * rho * .62];
      const zweit = a.rolle === "markt" ? vieleck(neben, Math.max(.7, Math.min(1.3, rho * .2)), 12) : rechteck(neben, u, Math.min(3, rho * .5), Math.min(2, rho * .3));
      if (!deck([[vieleck(m, kern, 8, [.9238795325112867, .3826834323650898]), "kommando", 0], [zweit, a.rolle === "markt" ? "reaktor" : "lager", a.rolle === "markt" ? 0 : 1]]) && !nass(innen))
        plaetze.push({ pfad: `${a.pfad}.deck`, polygon: innen, material: "square" });
      break;
    }
    case "tempel": {
      const l = Math.min(4, rho * .7), b = Math.min(2.4, rho * .4);
      deck([[rechteck([m[0] - u[0] * l * .45, m[1] - u[1] * l * .45], u, l, b), "labor", 0], [vieleck([m[0] + u[0] * l * .55, m[1] + u[1] * l * .55], Math.min(1.4, b * .7), 12), "medstation", 0]]);
      break;
    }
    case "hafen": {
      // Landefelder gierig entlang der Achse, dann das Vorfeld drumherum.
      const pr = Math.max(1.6, Math.min(3.6, rho * .45)), felder: [Polygon, BauwerkTyp, number][] = [];
      for (const k of [0, 1, -1, 2, -2]) {
        if (felder.length >= 3) break;
        const c: Punkt = [m[0] + u[0] * k * (2 * pr + .8), m[1] + u[1] * k * (2 * pr + .8)], feld = vieleck(c, pr, 16);
        if (frei(feld) && felder.every(([f]) => getrennteDaecher(f, feld))) felder.push([feld, "raumhafen", felder.length ? 1 : 0]);
      }
      if (!felder.length || !deck(felder)) lose(3.4, 2.8, .8, "lager");
      break;
    }
    case "frei": {
      if (nass(innen)) break;
      plaetze.push({ pfad: `${a.pfad}.gruen`, polygon: innen, material: "grass" });
      for (const [k, sg] of [-1, 1].entries()) {
        const hain = vieleck([m[0] + u[0] * sg * rho * .4, m[1] + u[1] * sg * rho * .4], Math.min(1.5, rho * .3), 12);
        if (hain.every(p => imPolygon(p, innen))) plaetze.push({ pfad: `${a.pfad}.hain.${k}`, polygon: hain, material: "forest" });
      }
      break;
    }
    case "adel": reihe(radius * 1.1, 8, radius * 2.2 + .35, "wohnblock"); break;
    case "arm": lose(1.5, 1.3, .82, null); break;
    case "handwerk": lose(3.4, 2.8, .8, null); break;
    default: reihe(radius, 12, radius * 2 + .3, a.art === "weiler" ? null : "raumstation");
  }
  return { baue, plaetze, gassen: [], hoefe };
}
