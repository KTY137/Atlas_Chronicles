// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { qp, schnittKonvex, schwerpunkt, type Polygon, type Punkt } from "../../polygon.ts";
import { kreisRichtungen } from "../kreis.ts";
import type { FleckenAuftrag } from "../stil.ts";
import type { Fleck } from "../viertel/flecken.ts";

/**
 * **Nabe, Ringe, Speichen** (Spec 2026-09-23-stadt-zukunft, 6.1–6.2). Eine Kolonie ist um ihre
 * Nabe gebaut: ein Vieleck in der Mitte, darum Ringe aus Sektoren, außen zwei Flurringe bis über
 * den Kartenrand. Die Zellen zerlegen die Karte lückenlos, deshalb liefert der Kantengraph der
 * Pipeline Ringstraßen (Kanten zwischen zwei Ringen) und Speichen (Kanten zwischen zwei Sektoren)
 * von selbst. Ein äußerer Ring darf feiner geteilt sein als der innere: dessen Außenbogen trägt
 * dann die Zwischenecken und bleibt konvex (er wölbt sich nach außen).
 */
export function sektoren({ art, mitte, rahmen, breite, hoehe, r }: FleckenAuftrag): { readonly alle: readonly Fleck[]; readonly innenZiel: number } {
  const kurz = Math.min(breite, hoehe);
  const R = kurz * (art === "stadt" ? .42 : art === "dorf" ? .38 : .36), ringe = art === "stadt" ? 3 : art === "dorf" ? 2 : 1;
  const r0 = R * (art === "stadt" ? .2 : art === "dorf" ? .26 : .36), speichen = art === "stadt" ? 8 : art === "dorf" ? 6 : 4;
  const radien = [r0, ...Array.from({ length: ringe }, (_, k) => r0 + (R - r0) * (k + 1) / ringe), R * 1.5, Math.hypot(breite, hoehe) * 2];
  // teilung[m]: Sektoren des Rings m+1 (zwischen radien[m] und radien[m+1]). Ein Stadtring teilt
  // doppelt so fein wie der innere, solange ein Sektor dann in der Mitte noch fünf Zellen breit ist;
  // der erste Flurring teilt doppelt, der äußerste wie der erste.
  const teilung = [speichen];
  for (let k = 1; k < radien.length - 1; k++) {
    const alt = teilung[k - 1]!, mittel = (radien[k]! + radien[k + 1]!) / 2;
    teilung.push(k === ringe ? alt * 2 : k > ringe ? alt : 2 * Math.PI * mittel / (2 * alt) >= 5 ? alt * 2 : alt);
  }
  const fein = teilung.at(-1)!;
  // Eine kleine Drehung aus dem Keim, ebenfalls ohne Winkelfunktion: ein Viertel eines Feinschritts.
  const [dc, ds] = kreisRichtungen(fein * 4)[r.ganz(0, 3)]!;
  const richtung = kreisRichtungen(fein).map(([x, y]) => [x * dc - y * ds, x * ds + y * dc] as Punkt);
  const punkt = (k: number, i: number): Punkt => { const d = richtung[i % fein]!; return qp([mitte[0] + d[0] * radien[k]!, mitte[1] + d[1] * radien[k]!]); };

  const zellen: { zelle: Polygon; pfad: string }[] = [];
  const schritt0 = fein / teilung[0]!;
  zellen.push({ zelle: Array.from({ length: teilung[0]! }, (_, j) => punkt(0, j * schritt0)), pfad: "sektor.0.0" });
  for (let k = 1; k < radien.length; k++) {
    const schritt = fein / teilung[k - 1]!, aussenSchritt = fein / (teilung[k] ?? teilung[k - 1]!);
    for (let j = 0; j < teilung[k - 1]!; j++) {
      const von = j * schritt, bis = (j + 1) * schritt, zelle: Punkt[] = [punkt(k - 1, von), punkt(k - 1, bis)];
      for (let i = bis; i >= von; i -= aussenSchritt) zelle.push(punkt(k, i));
      zellen.push({ zelle, pfad: `sektor.${k}.${j}` });
    }
  }
  const alle: Fleck[] = [];
  let innenZiel = 0;
  for (const { zelle, pfad } of zellen) {
    const geschnitten = schnittKonvex(zelle, rahmen);
    if (geschnitten.length < 3) continue;
    const p = qp(schwerpunkt(geschnitten));
    alle.push({ nr: alle.length, punkt: p, zelle: geschnitten, ferne: Math.hypot(p[0] - mitte[0], p[1] - mitte[1]), pfad });
    if (Number(pfad.split(".")[1]) <= ringe) innenZiel++;
  }
  return { alle, innenZiel };
}
