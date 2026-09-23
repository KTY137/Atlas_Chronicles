// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { einwaerts, einwaertsKanten, flaeche, imPolygon, qp, schwerpunkt, type Polygon, type Punkt } from "../../polygon.ts";
import { freieMauer, getrennteDaecher, mitAbstand } from "../gemeinsam.ts";
import { zwoelfeck, type MauerLinie } from "./mauer.ts";
import { achse, platzUm, rechteck, type Bau, type FleckBau, type ParzellenAuftrag } from "./parzellen.ts";

const TURM = .42;
/** Das Quadrat im Turm-Zwölfeck: konvex und klein genug, um Mauer und Hof sauber zu schneiden. */
const turmKern = (turm: Polygon): Polygon => [turm[0]!, turm[3]!, turm[6]!, turm[9]!];

/**
 * **Die Burg:** eigene Mauer auf dem eingerückten Fleck, ein Turm in jeder Ecke, der Bergfried in
 * der Mitte, die Kaserne an der längsten Seite, der Rest ist Burghof. Das Tor liegt auf der Seite,
 * an der die erste Randstraße vorbeiführt; dort bleibt in der Mauer eine Lücke bis zur Straße.
 */
export function baueBurg(a: ParzellenAuftrag): FleckBau & { readonly mauern: readonly MauerLinie[] } {
  const leer = { baue: [], plaetze: [], gassen: [], hoefe: [], mauern: [] };
  const innen = einwaertsKanten(a.zelle, a.abstaende.map(d => d + .2)).map(qp);
  if (innen.length < 3 || flaeche(innen) < 6) return leer;
  const hofId = a.id("markt", `${a.pfad}.burghof.platz.0`), baue: Bau[] = [];
  // Turmmitten sind die Ecken des um den Turmradius eingerückten Flecks: so berührt jeder Turm
  // beide Mauerseiten seiner Ecke, gleich wie spitz sie ist, und ragt nie hinaus.
  for (const [i, c] of einwaerts(innen, TURM + .03).entries()) {
    const turm = zwoelfeck(c, TURM);
    if (!turm.every(x => imPolygon(x, innen)) || baue.some(b => !getrennteDaecher(b.umriss, turm))) continue;
    baue.push({ pfad: `${a.pfad}.burgturm.${i}`, umriss: turm, los: turm, strasse: hofId, typ: "turm", titel: "Burgturm", rang: 0 });
  }
  const kern = einwaerts(innen, TURM * 2.6);
  if (kern.length < 3) return leer;
  // Kaserne: ein Streifen innen an der längsten Kante des Kerns, 0,9 Zellen tief.
  let lang = 0, langL = -1;
  for (let i = 0; i < kern.length; i++) {
    const p = kern[(i + kern.length - 1) % kern.length]!, q2 = kern[i]!, l = Math.hypot(q2[0] - p[0], q2[1] - p[1]);
    if (l > langL) { langL = l; lang = i; }
  }
  const e0 = kern[(lang + kern.length - 1) % kern.length]!, e1 = kern[lang]!, u: Punkt = [(e1[0] - e0[0]) / langL, (e1[1] - e0[1]) / langL];
  const k = schwerpunkt(kern);
  let n: Punkt = [-u[1], u[0]];
  if (n[0] * (k[0] - e0[0]) + n[1] * (k[1] - e0[1]) < 0) n = [-n[0], -n[1]];
  const TIEFE = .9, kaserne: Polygon = ([[.2, 0], [.8, 0], [.8, TIEFE], [.2, TIEFE]] as const).map(([t, d]) => qp([e0[0] + (e1[0] - e0[0]) * t + n[0] * (d + .05), e0[1] + (e1[1] - e0[1]) * t + n[1] * (d + .05)]));
  if (kaserne.every(p => imPolygon(p, kern)) && baue.every(b => getrennteDaecher(b.umriss, kaserne)))
    baue.push({ pfad: `${a.pfad}.kaserne`, umriss: kaserne, los: kaserne, strasse: hofId, typ: "kaserne", titel: "Kaserne", rang: 0 });
  // Bergfried: im Rest des Kerns, von der Kaserne weggerückt.
  const { laenge, breite } = achse(kern), seite = Math.max(.9, Math.min(laenge, breite - TIEFE) * .45);
  const bergfried = rechteck([k[0] + n[0] * TIEFE / 2, k[1] + n[1] * TIEFE / 2], u, seite, seite);
  if (bergfried.every(p => imPolygon(p, kern)) && baue.every(b => getrennteDaecher(b.umriss, bergfried)))
    baue.push({ pfad: `${a.pfad}.bergfried`, umriss: bergfried, los: bergfried, strasse: hofId, typ: "burg", titel: "Bergfried", rang: 0 });
  const plaetze = platzUm(innen, baue.map(b => mitAbstand(b.umriss.length === 12 ? turmKern(b.umriss) : b.umriss, .12)), `${a.pfad}.burghof`, "square");
  if (!plaetze.length) return leer;
  // Die Mauer auf dem Rand von `innen`; auf der Seite zur ersten Randstraße bleibt das Tor offen.
  const tor = a.randStrassen[0], mauern: MauerLinie[] = [];
  let torKante = -1, torAbstand = Infinity;
  if (tor) for (let i = 0; i < innen.length; i++) {
    const p = innen[(i + innen.length - 1) % innen.length]!, q2 = innen[i]!;
    const d = Math.hypot((p[0] + q2[0]) / 2 - (tor.von[0] + tor.bis[0]) / 2, (p[1] + q2[1]) / 2 - (tor.von[1] + tor.bis[1]) / 2);
    if (d < torAbstand) { torAbstand = d; torKante = i; }
  }
  const hindernisse = baue.filter(b => b.typ === "turm").map(b => mitAbstand(turmKern(b.umriss), .02));
  for (let i = 0; i < innen.length; i++) {
    const p = innen[(i + innen.length - 1) % innen.length]!, q2 = innen[i]!;
    const at = (t: number): Punkt => [p[0] + (q2[0] - p[0]) * t, p[1] + (q2[1] - p[1]) * t];
    const stuecke: [Punkt, Punkt][] = i === torKante ? [[p, at(.4)], [at(.6), q2]] : [[p, q2]];
    for (const [j, [s, e]] of stuecke.entries()) for (const [x, [von, bis]] of freieMauer(s, e, hindernisse).entries())
      mauern.push({ a: qp(von), b: qp(bis), pfad: `${a.pfad}.burgmauer.${i}.${j}.${x}` });
  }
  return { baue, plaetze, gassen: [], hoefe: [], mauern };
}
