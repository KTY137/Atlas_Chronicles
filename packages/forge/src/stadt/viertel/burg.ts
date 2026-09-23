// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { abstandPolygonStrecke, einwaerts, einwaertsKanten, flaeche, imPolygon, qp, schnittKonvex, schwerpunkt, type Polygon, type Punkt } from "../../polygon.ts";
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
  const roh = einwaertsKanten(a.zelle, a.abstaende.map(d => d + .2)).map(qp);
  // Eine Burg am Ufer steht auf dem trockenen Teil ihres Flecks, nie im Wasser.
  const nasse = a.hindernisse.filter(w => flaeche(schnittKonvex(roh, w)) > 1e-6);
  const trocken = nasse.length ? platzUm(roh, nasse.map(w => mitAbstand(w, .15)), `${a.pfad}.trocken`, "square").map(p => p.polygon) : [roh];
  const innen = trocken.reduce((best, p) => flaeche(p) > flaeche(best) ? p : best, trocken[0] ?? []);
  if (innen.length < 3 || flaeche(innen) < 6) return leer;
  const hofId = a.id("markt", `${a.pfad}.burghof.platz.0`), baue: Bau[] = [];
  // Turmmitten sind die Ecken des um den Turmradius eingerückten Flecks: so berührt jeder Turm
  // beide Mauerseiten seiner Ecke, gleich wie spitz sie ist, und ragt nie hinaus.
  for (const [i, c] of einwaerts(innen, TURM + .03).entries()) {
    const turm = zwoelfeck(c, TURM);
    if (!turm.every(x => imPolygon(x, innen)) || baue.some(b => !getrennteDaecher(b.umriss, turm))) continue;
    baue.push({ pfad: `${a.pfad}.burgturm.${i}`, umriss: turm, los: turm, strasse: hofId, typ: "turm", titel: "Burgturm", rang: 0 });
  }
  const kern = einwaerts(innen, .6);
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
  // Bergfried und Kaserne: die erste Größe und Lage, bei der beide passen; sonst der Bergfried
  // allein — ohne ihn ist es keine Burg.
  const TIEFE = .9, { laenge, breite } = achse(kern), grund = Math.max(.9, Math.min(laenge, breite) * .42);
  const kaserne: Polygon = ([[.2, 0], [.8, 0], [.8, TIEFE], [.2, TIEFE]] as const).map(([t, d]) => qp([e0[0] + (e1[0] - e0[0]) * t + n[0] * (d + .05), e0[1] + (e1[1] - e0[1]) * t + n[1] * (d + .05)]));
  const passt = (p: Polygon, andere: readonly Polygon[]) => p.every(x => imPolygon(x, kern)) && baue.every(b => getrennteDaecher(b.umriss, p)) && andere.every(o => getrennteDaecher(o, p));
  const kandidaten = ([[1, .8], [1, .5], [.8, 1], [.8, .7], [.62, 1.1], [.62, .5], [.5, 1.2], [1, 0], [.8, 0], [.5, 0]] as const)
    .map(([s, versatz]) => rechteck([k[0] + n[0] * TIEFE * versatz, k[1] + n[1] * TIEFE * versatz], u, grund * s, grund * s));
  const mitKaserne = passt(kaserne, []) ? kandidaten.find(b => passt(b, [kaserne])) : undefined;
  const bergfried = mitKaserne ?? kandidaten.find(b => passt(b, []));
  if (bergfried) baue.push({ pfad: `${a.pfad}.bergfried`, umriss: bergfried, los: bergfried, strasse: hofId, typ: "burg", titel: "Bergfried", rang: 0 });
  if (mitKaserne || (!bergfried && passt(kaserne, [])))
    baue.push({ pfad: `${a.pfad}.kaserne`, umriss: kaserne, los: kaserne, strasse: hofId, typ: "kaserne", titel: "Kaserne", rang: 0 });
  // Der Burghof endet eine Handbreit vor der Burgmauer, damit ihr Steinband ihn nicht überdeckt.
  let plaetze = platzUm(einwaerts(innen, .1), baue.map(b => mitAbstand(b.umriss.length === 12 ? turmKern(b.umriss) : b.umriss, .12)), `${a.pfad}.burghof`, "square");
  if (!plaetze.length) return leer;
  // Die Mauer auf dem Rand von `innen`; auf der Seite zur ersten Randstraße bleibt das Tor offen.
  const tor = a.randStrassen[0], mauern: MauerLinie[] = [];
  let torKante = -1, torAbstand = Infinity;
  if (tor) for (let i = 0; i < innen.length; i++) {
    const p = innen[(i + innen.length - 1) % innen.length]!, q2 = innen[i]!;
    const d = Math.hypot((p[0] + q2[0]) / 2 - (tor.von[0] + tor.bis[0]) / 2, (p[1] + q2[1]) / 2 - (tor.von[1] + tor.bis[1]) / 2);
    if (d < torAbstand) { torAbstand = d; torKante = i; }
  }
  // Die Burgmauer endet an ihren Türmen mit dem Abstand, den Steinband und Schatten brauchen.
  // Der Burgweg: durch die Torlücke hinaus bis auf die Straße, damit der Hof erreichbar ist.
  if (tor && torKante >= 0) {
    const p = innen[(torKante + innen.length - 1) % innen.length]!, q2 = innen[torKante]!, m: Punkt = [(p[0] + q2[0]) / 2, (p[1] + q2[1]) / 2];
    const ex = q2[0] - p[0], ey = q2[1] - p[1], el = Math.hypot(ex, ey) || 1, c = schwerpunkt(innen);
    let nx = -ey / el, ny = ex / el;
    if (nx * (c[0] - m[0]) + ny * (c[1] - m[1]) > 0) { nx = -nx; ny = -ny; }
    const aussen = Math.max(...a.abstaende) + .35, halb = .3, ux = ex / el, uy = ey / el;
    const weg: Polygon = ([[-halb, -.2], [halb, -.2], [halb, aussen], [-halb, aussen]] as const).map(([t, d]) => qp([m[0] + ux * t + nx * d, m[1] + uy * t + ny * d]));
    plaetze.push({ pfad: `${a.pfad}.burgweg`, polygon: weg, material: "path" });
  }
  const hindernisse = baue.filter(b => b.typ === "turm").map(b => mitAbstand(turmKern(b.umriss), .32));
  for (let i = 0; i < innen.length; i++) {
    const p = innen[(i + innen.length - 1) % innen.length]!, q2 = innen[i]!;
    const at = (t: number): Punkt => [p[0] + (q2[0] - p[0]) * t, p[1] + (q2[1] - p[1]) * t];
    // Die Torlücke ist so breit wie der Burgweg plus Luft, gleich wie lang die Mauerseite ist.
    const laenge = Math.hypot(q2[0] - p[0], q2[1] - p[1]) || 1, luecke = (.3 + .18) / laenge;
    const stuecke: [Punkt, Punkt][] = i === torKante ? ([[p, at(.5 - luecke)], [at(.5 + luecke), q2]] as [Punkt, Punkt][]).filter(([x, y]) => Math.hypot(y[0] - x[0], y[1] - x[1]) > .05 && (x === p ? .5 - luecke > 0 : .5 + luecke < 1)) : [[p, q2]];
    for (const [j, [s, e]] of stuecke.entries()) for (const [x, [von, bis]] of freieMauer(s, e, hindernisse).entries())
      mauern.push({ a: qp(von), b: qp(bis), pfad: `${a.pfad}.burgmauer.${i}.${j}.${x}` });
  }
  // Nur Hofstücke, die über andere Stücke mit dem Burgweg (oder, ohne ihn, dem größten Stück)
  // zusammenhängen, sind Hof; eine Tasche hinter einem Turm ist bloßer Boden.
  const nahe = (x: Polygon, y: Polygon) => x.some(p => y.some((q2, i) => abstandPolygonStrecke([p], q2, y[(i + 1) % y.length]!) <= .06))
    || y.some(p => x.some((q2, i) => abstandPolygonStrecke([p], q2, x[(i + 1) % x.length]!) <= .06));
  const startStueck = plaetze.find(p => p.pfad.endsWith(".burgweg")) ?? plaetze.reduce((b, p) => flaeche(p.polygon) > flaeche(b.polygon) ? p : b, plaetze[0]!);
  const erreicht = new Set([startStueck]);
  for (let neu = true; neu;) { neu = false; for (const p of plaetze) if (!erreicht.has(p) && [...erreicht].some(e => nahe(e.polygon, p.polygon))) { erreicht.add(p); neu = true; } }
  plaetze = plaetze.filter(p => erreicht.has(p));
  // Jeder Bau liegt am Stück des Burghofs, das ihm am nächsten ist — das ist seine Adresse.
  // Ein Eckturm ohne eigenes Hofstück liegt an der Straße vor der Burgmauer.
  const naechsterHof = (umriss: Polygon) => {
    const hof = plaetze.reduce((best, p) => {
      const d = Math.min(...p.polygon.map((q2, i) => abstandPolygonStrecke(umriss, q2, p.polygon[(i + 1) % p.polygon.length]!)));
      return d < best.d ? { d, id: a.id("markt", p.pfad) } : best;
    }, { d: Infinity, id: hofId });
    return a.randStrassen.reduce((best, st) => { const d = abstandPolygonStrecke(umriss, st.von, st.bis); return d < best.d - .5 ? { d, id: st.id } : best; }, hof).id;
  };
  for (let i = 0; i < baue.length; i++) baue[i] = { ...baue[i]!, strasse: naechsterHof(baue[i]!.umriss) };
  return { baue, plaetze, gassen: [], hoefe: [], mauern };
}
