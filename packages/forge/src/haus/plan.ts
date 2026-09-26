// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * **Hausplan** — aus dem Umriss eines Gebäudes auf der Stadtkarte seine Geschosse.
 *
 * Der alte Grundriss nahm den Umrisskasten mal 4,5 und legte feste Rechteckräume hinein: jedes
 * Haus bekam dieselben vier Zimmer, die Tür stand immer unten, und es gab genau ein Geschoss.
 * Hier entsteht der Plan aus dem Haus selbst:
 *
 *  1. **Rahmen.** Der Umriss wird so gedreht, dass seine lange Achse waagrecht liegt, und so
 *     skaliert, dass die kurze Seite spielbar breit ist. Ein Feld gehört zum Haus, wenn seine
 *     Mitte im Umriss liegt — Wände und Türen bleiben damit auf Zellkanten, wie Sicht und
 *     Bewegung sie erwarten.
 *  2. **Tür und Treppe.** Die Haustür liegt auf der Seite zur Straße. Die Treppe steht in jedem
 *     Geschoss auf denselben Feldern, sonst führt sie ins Leere.
 *  3. **Räume nach Wegtiefe.** Flur zuerst (von der Tür zur Treppe), dann eine gewichtete
 *     Binärteilung je zusammenhängendem Rest: öffentliche Räume an der Tür, private dahinter.
 *     Rundbauten werden radial geteilt: Mitte und Ringsektoren.
 *  4. **Türen als Spannbaum**, bevorzugt über Flur und Haupträume; eine Zusatztür zur Küche.
 *  5. **Fenster** in den Außenwänden, alle drei Felder, nicht im Keller.
 *  6. **Möbel nach Regeln** je Raumart: an die Wand, in die Ecke, an die Außenwand, in die Mitte
 *     mit Platz rundum, auf den Boden, in Reihen.
 *
 * Alles hier ist reine Geometrie auf Zellen. Welche Assets daraus werden, entscheidet `karte.ts`.
 */
import type { BauwerkTyp, KartenSetting } from "@chronicle/szene";
import type { Rauschen } from "../kartenwerk.ts";
import type { Polygon, Punkt } from "../polygon.ts";
import { programmFuer, moebelFuer, type RaumProgrammEintrag, type MoebelRegel, type Rolle } from "./programme.ts";

export interface HausRaum {
  readonly index: number; readonly titel: string; readonly art: string; readonly rolle: Rolle; readonly gruppe: string;
  readonly zellen: readonly number[];
}
/** Eine Tür auf einer Zellkante: `d = 0` rechts von (x, y), `d = 1` unter (x, y). */
export interface HausTuer { readonly x: number; readonly y: number; readonly d: 0 | 1; readonly von: number; readonly nach: number; readonly breit: boolean }
export interface HausFenster { readonly x: number; readonly y: number; readonly dx: number; readonly dy: number; readonly raum: number }
/** `o`: Seite, an der die Rückseite liegt — 0 oben, 1 rechts, 2 unten, 3 links. */
export interface HausMoebel {
  readonly typ: string; readonly x: number; readonly y: number; readonly fw: number; readonly fh: number;
  readonly o: 0 | 1 | 2 | 3; readonly raum: number; readonly boden: boolean;
}
export interface HausGeschossPlan {
  readonly stufe: number; readonly raum: Int16Array; readonly raeume: readonly HausRaum[];
  readonly tueren: readonly HausTuer[]; readonly fenster: readonly HausFenster[]; readonly moebel: readonly HausMoebel[];
  readonly oben: boolean; readonly unten: boolean;
}
export interface HausTreppe { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly zellen: readonly number[]; readonly rund: boolean }
export interface HausPlan {
  readonly breite: number; readonly hoehe: number; readonly drin: Uint8Array;
  /** Die Haustür: Feld innen und Richtung nach außen. */
  readonly tuer: { readonly x: number; readonly y: number; readonly dx: number; readonly dy: number };
  readonly treppe: HausTreppe | null;
  readonly geschosse: readonly HausGeschossPlan[];
  /** Innenfelder je Feld der Elternkarte. */
  readonly massstab: number;
  readonly rund: boolean;
}

export const HAUS_LIMITS = Object.freeze({ kanteMax: 40, kanteMin: 12, zellenMax: 1600 });

/** Kleinstes umschließendes Rechteck über die Kantenrichtungen; `u` ist die lange Achse. */
export function rahmenRechteck(p: Polygon): { c: Punkt; u: Punkt; n: Punkt; u0: number; u1: number; n0: number; n1: number } {
  let cx = 0, cy = 0; for (const q of p) { cx += q[0]; cy += q[1]; } const c: Punkt = [cx / p.length, cy / p.length];
  let best: { c: Punkt; u: Punkt; n: Punkt; u0: number; u1: number; n0: number; n1: number; fl: number } | null = null;
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!, b = p[(i + 1) % p.length]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1e-9) continue;
    const u: Punkt = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], n: Punkt = [-u[1], u[0]];
    let u0 = Infinity, u1 = -Infinity, n0 = Infinity, n1 = -Infinity;
    for (const q of p) { const du = (q[0] - c[0]) * u[0] + (q[1] - c[1]) * u[1], dn = (q[0] - c[0]) * n[0] + (q[1] - c[1]) * n[1]; u0 = Math.min(u0, du); u1 = Math.max(u1, du); n0 = Math.min(n0, dn); n1 = Math.max(n1, dn); }
    const fl = (u1 - u0) * (n1 - n0); if (!best || fl < best.fl - 1e-9) best = { c, u, n, u0, u1, n0, n1, fl };
  }
  if (!best) return { c, u: [1, 0], n: [0, 1], u0: -.5, u1: .5, n0: -.5, n1: .5 };
  if (best.n1 - best.n0 > best.u1 - best.u0) return { c: best.c, u: best.n, n: [-best.u[0], -best.u[1]], u0: best.n0, u1: best.n1, n0: -best.u1, n1: -best.u0 };
  return best;
}

function imRing(x: number, y: number, p: Polygon): boolean {
  let ok = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i]!, b = p[j]!; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) ok = !ok; }
  return ok;
}

export interface PlanAuftrag {
  /** Umriss in Feldern der Elternkarte, beliebig gedreht. */
  readonly umriss: Polygon;
  readonly profil: BauwerkTyp;
  readonly setting: KartenSetting;
  /** Außennormale der Straßenseite in Elternkoordinaten; ohne Angabe die längste Kante. */
  readonly strasse?: Punkt;
  readonly r: Rauschen;
  /** 0 setzt nur Pflichtmöbel (Kamin, Theke, Altar …), 1 alles. */
  readonly moeblierung?: number;
  /** Möbelregeln je Raumart mit den echten Maßen der Assets; ohne Angabe die Tabelle aus `programme.ts`. */
  readonly regeln?: (art: string, zellen: number) => readonly MoebelRegel[];
}

export function planeHaus(a: PlanAuftrag): HausPlan {
  const { r, setting, profil } = a;
  const zufall = () => r.zahl(0, 1);
  const prog = programmFuer(profil, setting);
  const stufen = [-1, 0, 1].filter(s => prog.geschosse[s]?.length);
  // -- Rahmen ------------------------------------------------------------------------------------
  const R = rahmenRechteck(a.umriss), kurz = Math.max(.2, R.n1 - R.n0), lang = Math.max(.2, R.u1 - R.u0);
  const M = Math.min(Math.max(4.5, prog.kurzeSeite / kurz), (HAUS_LIMITS.kanteMax - 4) / lang, (HAUS_LIMITS.kanteMax - 4) / kurz);
  const lok = a.umriss.map(q => { const dx = q[0] - R.c[0], dy = q[1] - R.c[1]; return [(dx * R.u[0] + dy * R.u[1]) * M, (dx * R.n[0] + dy * R.n[1]) * M] as Punkt; });
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity; for (const [x, y] of lok) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
  const W = Math.max(HAUS_LIMITS.kanteMin, Math.ceil(bx1 - bx0) + 4), H = Math.max(HAUS_LIMITS.kanteMin, Math.ceil(by1 - by0) + 4);
  const ox = (W - (bx1 - bx0)) / 2 - bx0, oy = (H - (by1 - by0)) / 2 - by0;
  const poly: Polygon = lok.map(q => [q[0] + ox, q[1] + oy] as Punkt);
  const drin = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) drin[y * W + x] = imRing(x + .5, y + .5, poly) ? 1 : 0;
  // Ein Umriss, der kaum ein Feld trifft (entartete Eingabe), wird zum Rechteck seines Rahmens.
  if (drin.reduce((s, v) => s + v, 0) < 16) for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) drin[y * W + x] = 1;
  const idx = (x: number, y: number) => y * W + x, xy = (i: number): [number, number] => [i % W, (i - (i % W)) / W];
  const nb4 = (i: number): number[] => { const [x, y] = xy(i), o: number[] = []; if (x > 0) o.push(i - 1); if (x < W - 1) o.push(i + 1); if (y > 0) o.push(i - W); if (y < H - 1) o.push(i + W); return o; };
  const aussen = (x: number, y: number) => x < 0 || y < 0 || x >= W || y >= H || !drin[idx(x, y)];
  const rund = prog.rund === true;

  // -- Straßenseite und Haustür -----------------------------------------------------------------------
  let seite: [number, number] = [0, 1];
  {
    let nl: Punkt | null = null;
    if (a.strasse) nl = [a.strasse[0] * R.u[0] + a.strasse[1] * R.u[1], a.strasse[0] * R.n[0] + a.strasse[1] * R.n[1]];
    else {
      let bestL = -1;
      for (let i = 0; i < poly.length; i++) { const p = poly[i]!, q = poly[(i + 1) % poly.length]!, l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l > bestL) { bestL = l; const mx = (p[0] + q[0]) / 2 - W / 2, my = (p[1] + q[1]) / 2 - H / 2; let n: Punkt = [(q[1] - p[1]) / l, -(q[0] - p[0]) / l]; if (n[0] * mx + n[1] * my < 0) n = [-n[0], -n[1]]; nl = n; } }
    }
    if (nl) seite = Math.abs(nl[0]) > Math.abs(nl[1]) ? [Math.sign(nl[0]) || 1, 0] : [0, Math.sign(nl[1]) || 1];
  }
  const randZellen: number[] = [];
  for (let i = 0; i < W * H; i++) { if (!drin[i]) continue; const [x, y] = xy(i); if (aussen(x + seite[0], y + seite[1])) randZellen.push(i); }
  const achseT = seite[0] ? 1 : 0, mitteT = randZellen.reduce((s, i) => s + xy(i)[achseT], 0) / Math.max(1, randZellen.length);
  // Nur Randfelder mit Tiefe: eine Tür in einen Zipfel führt nirgends hin.
  const tiefe = (i: number) => { const [x, y] = xy(i); let d = 0; while (d < 4 && !aussen(x - seite[0] * (d + 1), y - seite[1] * (d + 1))) d++; return d; };
  const tuerZelle = randZellen.slice().sort((p, q) => (tiefe(q) >= 3 ? 0 : 1) - (tiefe(p) >= 3 ? 0 : 1) || Math.abs(xy(p)[achseT] - mitteT) - Math.abs(xy(q)[achseT] - mitteT) || p - q)[0]!;
  const [tx, ty] = xy(tuerZelle);

  // -- Treppe: in allen Geschossen dieselben Felder -------------------------------------------------------
  const zusammen = (frei: Uint8Array): boolean => {
    let start = -1, gesamt = 0; for (let i = 0; i < frei.length; i++) if (frei[i]) { gesamt++; if (start < 0) start = i; }
    if (start < 0) return true;
    const seen = new Uint8Array(frei.length), q = [start]; seen[start] = 1; let n = 1;
    while (q.length) { const i = q.pop()!; for (const j of nb4(i)) if (frei[j] && !seen[j]) { seen[j] = 1; n++; q.push(j); } }
    return n === gesamt;
  };
  let treppe: HausTreppe | null = null;
  if (stufen.length > 1) {
    const kand: (HausTreppe & { score: number })[] = [];
    let zx = 0, zy = 0, zn = 0; for (let i = 0; i < W * H; i++) if (drin[i]) { const [x, y] = xy(i); zx += x + .5; zy += y + .5; zn++; }
    zx /= zn; zy /= zn;
    for (let y = 0; y + 2 <= H; y++) for (let x = 0; x + 2 <= W; x++) {
      const zellen = [idx(x, y), idx(x + 1, y), idx(x, y + 1), idx(x + 1, y + 1)];
      if (zellen.some(c => !drin[c])) continue;
      let anWand = false, strasse = false;
      for (const c of zellen) { const [cx, cy] = xy(c); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) if (aussen(cx + dx, cy + dy)) { anWand = true; if (dx === seite[0] && dy === seite[1]) strasse = true; } }
      const d = Math.min(...zellen.map(c => { const [cx, cy] = xy(c); return Math.abs(cx - tx) + Math.abs(cy - ty); }));
      if (d < 2) continue;
      const score = rund ? Math.hypot(x + 1 - zx, y + 1 - zy) : Math.abs(d - 3.5) + (anWand ? 0 : 1.2) + (strasse ? 3 : 0) + zufall() * .8;
      kand.push({ x, y, w: 2, h: 2, zellen, rund, score });
    }
    kand.sort((p, q) => p.score - q.score || p.y - q.y || p.x - q.x);
    for (const k of kand.slice(0, 48)) { const frei = new Uint8Array(drin); for (const c of k.zellen) frei[c] = 0; if (zusammen(frei)) { treppe = { x: k.x, y: k.y, w: 2, h: 2, zellen: k.zellen, rund }; break; } }
  }
  const istTreppe = new Uint8Array(W * H); if (treppe) for (const c of treppe.zellen) istTreppe[c] = 1;

  // -- Teilung ---------------------------------------------------------------------------------
  interface Raum { id: number; titel: string; art: string; gewicht: number; rolle: Rolle; gruppe: string }
  const teile = (zellen: number[], liste: Raum[], anker: number, out: [Raum, number[]][]): void => {
    if (!zellen.length || !liste.length) return;
    if (liste.length === 1) { out.push([liste[0]!, zellen]); return; }
    const summe = liste.reduce((s, q) => s + q.gewicht, 0), ziel = summe * (.42 + .16 * zufall());
    let k = 1, bd = Infinity, acc = 0; for (let i = 1; i < liste.length; i++) { acc += liste[i - 1]!.gewicht; const d = Math.abs(acc - ziel); if (d < bd) { bd = d; k = i; } }
    const A = liste.slice(0, k), B = liste.slice(k), anteil = A.reduce((s, q) => s + q.gewicht, 0) / summe;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const c of zellen) { const [x, y] = xy(c); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    let achse = (x1 - x0) >= (y1 - y0) ? 0 : 1;
    const seitenverh = Math.max(x1 - x0 + 1, y1 - y0 + 1) / Math.min(x1 - x0 + 1, y1 - y0 + 1); if (seitenverh < 1.3 && zufall() < .35) achse = 1 - achse;
    const ko = (c: number): number => achse === 0 ? c % W : (c - (c % W)) / W, sort = zellen.slice().sort((p, q) => ko(p) - ko(q) || p - q), n = sort.length;
    const ankerTief = ko(anker) <= (ko(sort[0]!) + ko(sort[n - 1]!)) / 2;
    const vornListe = ankerTief ? A : B, hintenListe = ankerTief ? B : A, vornAnteil = ankerTief ? anteil : 1 - anteil;
    let sch = Math.min(n - 1, Math.max(1, Math.round(vornAnteil * n))); const c0 = ko(sort[sch]!);
    let lo = sch; while (lo > 0 && ko(sort[lo - 1]!) === c0) lo--;
    let hi = sch; while (hi < n && ko(sort[hi]!) === c0) hi++;
    sch = Math.abs(lo - vornAnteil * n) <= Math.abs(hi - vornAnteil * n) ? lo : hi;
    if (sch <= 0 || sch >= n) sch = lo > 0 ? lo : hi < n ? hi : Math.floor(n / 2);
    const vorn = sort.slice(0, sch), hinten = sort.slice(sch);
    teile(vorn, vornListe, anker, out);
    let naechster = hinten[0]!; for (const c of hinten) if (Math.abs(ko(c) - c0) < Math.abs(ko(naechster) - c0)) naechster = c;
    teile(hinten, hintenListe, naechster, out);
  };

  const geschoss = (stufe: number): Omit<HausGeschossPlan, "moebel"> => {
    const liste: Raum[] = prog.geschosse[stufe]!.map(([titel, art, gewicht, rolle = "privat", gruppe = ""]: RaumProgrammEintrag, id: number) => ({ id, titel, art, gewicht, rolle, gruppe }));
    const raum = new Int16Array(W * H).fill(-1);
    const flur = liste.find(q => q.rolle === "flur"), haupt = liste.find(q => q.rolle === "oeffentlich") ?? liste[0]!;
    const eg = stufe === 0;
    if (rund) {
      let zx = 0, zy = 0, zn = 0, rm = 0; for (let i = 0; i < W * H; i++) if (drin[i]) { const [x, y] = xy(i); zx += x + .5; zy += y + .5; zn++; }
      zx /= zn; zy /= zn; for (const [x, y] of poly) rm = Math.max(rm, Math.hypot(x - zx, y - zy));
      const hubR = rm * .42, sek = [flur, ...liste.filter(q => q !== haupt && q !== flur)].filter((q): q is Raum => !!q), summe = sek.reduce((s, q) => s + q.gewicht, 0);
      const tw = Math.atan2(ty + .5 - zy, tx + .5 - zx), start = tw - (flur ? flur.gewicht / summe * Math.PI : 0);
      for (let i = 0; i < W * H; i++) {
        if (!drin[i] || istTreppe[i]) continue;
        const [x, y] = xy(i), dx = x + .5 - zx, dy = y + .5 - zy;
        if (Math.hypot(dx, dy) < hubR || !sek.length) { raum[i] = haupt.id; continue; }
        let w = (Math.atan2(dy, dx) - start) % (Math.PI * 2); if (w < 0) w += Math.PI * 2; let acc = 0;
        for (const q of sek) { acc += q.gewicht / summe * Math.PI * 2; if (w <= acc + 1e-9) { raum[i] = q.id; break; } }
        if (raum[i]! < 0) raum[i] = sek[sek.length - 1]!.id;
      }
    } else {
      if (flur) {
        const fl = new Set<number>();
        if (eg && treppe) {
          const prev = new Int32Array(W * H).fill(-1), seen = new Uint8Array(W * H), q = [tuerZelle]; seen[tuerZelle] = 1; let ziel = -1;
          for (let k = 0; k < q.length && ziel < 0; k++) { const i = q[k]!; if (nb4(i).some(j => istTreppe[j])) { ziel = i; break; } for (const j of nb4(i)) if (drin[j] && !istTreppe[j] && !seen[j]) { seen[j] = 1; prev[j] = i; q.push(j); } }
          for (let i = ziel; i >= 0; i = prev[i]!) fl.add(i);
          if (Math.min(W, H) >= 13) for (const i of [...fl]) { const [x, y] = xy(i), j = idx(Math.min(W - 1, x + Math.abs(seite[1])), Math.min(H - 1, y + Math.abs(seite[0]))); if (drin[j] && !istTreppe[j]) fl.add(j); }
        } else if (eg) {
          for (let k = 0; k < 3; k++) for (const d of [-1, 0, 1]) { const x = tx - seite[0] * k + (seite[1] ? d : 0), y = ty - seite[1] * k + (seite[0] ? d : 0); if (!aussen(x, y)) fl.add(idx(x, y)); }
        }
        if (treppe) for (const c of treppe.zellen) for (const j of nb4(c)) if (drin[j] && !istTreppe[j]) fl.add(j);
        const privat = liste.filter(q => q.rolle === "privat").length;
        if (!eg && treppe && privat >= 3) { for (const ty2 of H >= 15 ? [treppe.y, treppe.y + 1] : [treppe.y + 1]) for (let x = 0; x < W; x++) { const j = idx(x, ty2); if (drin[j] && !istTreppe[j]) fl.add(j); } }
        for (const i of fl) raum[i] = flur.id;
      }
      const rest = liste.filter(q => q !== flur).sort((p, q) => Number(q.rolle === "oeffentlich") - Number(p.rolle === "oeffentlich") || (p.gruppe < q.gruppe ? -1 : p.gruppe > q.gruppe ? 1 : 0));
      const frei: number[] = []; for (let i = 0; i < W * H; i++) if (drin[i] && !istTreppe[i] && raum[i]! < 0) frei.push(i);
      // Der Flur zerschneidet das Haus: jede Teilfläche wird für sich verteilt.
      const freiSet = new Uint8Array(W * H); for (const i of frei) freiSet[i] = 1;
      const gesehen = new Uint8Array(W * H), komp: number[][] = [];
      for (const s0 of frei) { if (gesehen[s0]) continue; const k: number[] = [], q = [s0]; gesehen[s0] = 1; while (q.length) { const i = q.pop()!; k.push(i); for (const j of nb4(i)) if (freiSet[j] && !gesehen[j]) { gesehen[j] = 1; q.push(j); } } komp.push(k.sort((p, q2) => p - q2)); }
      const anker = eg ? tuerZelle : treppe ? treppe.zellen[0]! : frei[0] ?? 0;
      const [ax, ay] = xy(anker), abst = (c: number) => { const [x, y] = xy(c); return Math.abs(x - ax) + Math.abs(y - ay); };
      komp.sort((p, q) => Math.min(...p.map(abst)) - Math.min(...q.map(abst)) || p[0]! - q[0]!);
      const gross = komp.filter(k => k.length >= 4), zuteilung: Raum[][] = gross.map(() => []);
      const gesamtZ = gross.reduce((s, k) => s + k.length, 0), gesamtG = rest.reduce((s, q) => s + q.gewicht, 0);
      const gruppen = [...new Set(rest.map(q => q.gruppe))];
      if (gruppen.length > 1 && gross.length >= gruppen.length) gruppen.forEach((g, i) => { for (const q of rest.filter(q2 => q2.gruppe === g)) zuteilung[Math.min(i, gross.length - 1)]!.push(q); });
      else if (gross.length) {
        let groesste = 0; gross.forEach((k, i) => { if (k.length > gross[groesste]!.length) groesste = i; });
        for (const q of rest) {
          let bi = 0, bw = -Infinity;
          gross.forEach((k, i) => { const soll = gesamtG * k.length / gesamtZ, ist = zuteilung[i]!.reduce((s, x) => s + x.gewicht, 0), w = (soll - ist) / Math.max(.5, soll) + (q.rolle === "oeffentlich" && i === groesste ? 99 : 0); if (w > bw) { bw = w; bi = i; } });
          zuteilung[bi]!.push(q);
        }
      }
      gross.forEach((k, i) => {
        if (!zuteilung[i]!.length) { if (flur) for (const c of k) raum[c] = flur.id; return; }
        let ank = k[0]!; for (const c of k) if (abst(c) < abst(ank)) ank = c;
        const out: [Raum, number[]][] = []; teile(k, zuteilung[i]!, ank, out);
        for (const [q, zs] of out) for (const c of zs) raum[c] = q.id;
      });
    }
    // Reste und Bruchstücke dem Nachbarn zuschlagen, winzige Räume auflösen.
    for (let runde = 0; runde < 8; runde++) {
      let geaendert = false;
      for (let i = 0; i < W * H; i++) if (drin[i] && !istTreppe[i] && raum[i]! < 0) { const n = nb4(i).find(j => raum[j]! >= 0); if (n !== undefined) { raum[i] = raum[n]!; geaendert = true; } }
      for (const q of liste) {
        const zs: number[] = []; for (let i = 0; i < W * H; i++) if (raum[i] === q.id) zs.push(i);
        const seen = new Uint8Array(W * H), stuecke: number[][] = [];
        for (const s0 of zs) { if (seen[s0]) continue; const k: number[] = [], st = [s0]; seen[s0] = 1; while (st.length) { const i = st.pop()!; k.push(i); for (const j of nb4(i)) if (raum[j] === q.id && !seen[j]) { seen[j] = 1; st.push(j); } } stuecke.push(k); }
        stuecke.sort((p, q2) => q2.length - p.length || p[0]! - q2[0]!);
        const weg = q.rolle !== "flur" && stuecke.length && stuecke[0]!.length < 4 ? stuecke : stuecke.slice(1);
        for (const k of weg) for (const c of k) { const n = nb4(c).find(j => raum[j]! >= 0 && raum[j] !== q.id); if (n !== undefined) { raum[c] = raum[n]!; geaendert = true; } }
      }
      if (!geaendert) break;
    }
    // Umschlossene Räume lösen sich in ihren Umschließer auf: ein Raumumriss hat keine Löcher.
    for (const q of liste) {
      const zs: number[] = []; for (let i = 0; i < W * H; i++) if (raum[i] === q.id) zs.push(i);
      if (!zs.length) continue;
      const nachbarn = new Set<number>(); let randOffen = false;
      for (const c of zs) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) { const [x, y] = xy(c), nx = x + dx, ny = y + dy; if (aussen(nx, ny)) randOffen = true; else if (raum[idx(nx, ny)] !== q.id && !istTreppe[idx(nx, ny)]) nachbarn.add(raum[idx(nx, ny)]!); }
      if (!randOffen && nachbarn.size === 1 && !istTreppe.some((v, i) => v && zs.includes(i))) { const ziel = [...nachbarn][0]!; if (ziel >= 0 && q.rolle !== "oeffentlich") for (const c of zs) raum[c] = ziel; }
    }
    // Die Treppe gehört zum Flur, sonst zum Nachbarn mit der längsten Grenze.
    if (treppe) {
      const zaehl = new Map<number, number>(); for (const c of treppe.zellen) for (const j of nb4(c)) if (raum[j]! >= 0) zaehl.set(raum[j]!, (zaehl.get(raum[j]!) ?? 0) + 1);
      const ziel = flur && zaehl.has(flur.id) ? flur.id : [...zaehl.entries()].sort((p, q) => q[1] - p[1] || p[0] - q[0])[0]?.[0] ?? haupt.id;
      for (const c of treppe.zellen) raum[c] = ziel;
    }
    // Ein Raumumriss hat keine Löcher: was ein Raum ganz umschließt, gehört zu ihm.
    for (let runde = 0; runde < 4; runde++) {
      let geaendert = false;
      for (const q of liste) {
        const erreicht = new Uint8Array(W * H), st: number[] = [];
        const rand = (i: number) => { if (raum[i] !== q.id && !erreicht[i]) { erreicht[i] = 1; st.push(i); } };
        for (let x = 0; x < W; x++) { rand(idx(x, 0)); rand(idx(x, H - 1)); }
        for (let y = 0; y < H; y++) { rand(idx(0, y)); rand(idx(W - 1, y)); }
        while (st.length) { const i = st.pop()!; for (const j of nb4(i)) if (!erreicht[j] && raum[j] !== q.id) { erreicht[j] = 1; st.push(j); } }
        for (let i = 0; i < W * H; i++) if (!erreicht[i] && raum[i] !== q.id && drin[i]) { raum[i] = q.id; geaendert = true; }
      }
      if (!geaendert) break;
    }
    const raeume: HausRaum[] = [];
    for (const q of liste) { const zellen: number[] = []; for (let i = 0; i < W * H; i++) if (raum[i] === q.id) zellen.push(i); if (zellen.length) raeume.push({ index: q.id, titel: q.titel, art: q.art, rolle: q.rolle, gruppe: q.gruppe, zellen }); }
    // -- Türen: Spannbaum nach Wegtiefe -----------------------------------------------------------
    const kanten = new Map<string, { x: number; y: number; d: 0 | 1 }[]>();
    for (let i = 0; i < W * H; i++) {
      if (raum[i]! < 0) continue; const [x, y] = xy(i);
      for (const [j, d] of [[x < W - 1 ? i + 1 : -1, 0], [y < H - 1 ? i + W : -1, 1]] as const) {
        if (j < 0 || raum[j]! < 0 || raum[j] === raum[i]) continue;
        const p = Math.min(raum[i]!, raum[j]!), q = Math.max(raum[i]!, raum[j]!), key = `${p}|${q}`;
        (kanten.get(key) ?? kanten.set(key, []).get(key)!).push({ x, y, d });
      }
    }
    const nachId = new Map(raeume.map(q => [q.index, q]));
    const wurzel = raeume.find(q => q.rolle === "flur") ?? (treppe ? nachId.get(raum[treppe.zellen[0]!]!) : undefined) ?? raeume.find(q => q.rolle === "oeffentlich") ?? raeume[0]!;
    const verbunden = new Set([wurzel.index]), tueren: HausTuer[] = [];
    const hatWohnen = (g: string) => raeume.some(q => q.gruppe === g && q.art === "wohnen");
    const vorliebe = (q: HausRaum, p: HausRaum): number => rund
      ? (p.rolle === "oeffentlich" ? 0 : p.rolle === "flur" ? 2 : 3)
      : (p.rolle === "flur" ? (q.gruppe && q.art !== "wohnen" && hatWohnen(q.gruppe) ? 2.5 : 0)
        : p.gruppe && p.gruppe === q.gruppe ? (p.art === "wohnen" ? .5 : 1.5)
          : p.rolle === "oeffentlich" && !q.gruppe ? 1 : 3) + (q.rolle === "privat" && p.rolle === "privat" && p.gruppe !== q.gruppe ? 5 : 0);
    const laengsterLauf = (es: { x: number; y: number; d: 0 | 1 }[]) => {
      const s = es.slice().sort((p, q) => p.d - q.d || (p.d ? p.y - q.y || p.x - q.x : p.x - q.x || p.y - q.y));
      let best: typeof es = [], lauf: typeof es = [];
      for (const e of s) { const l = lauf[lauf.length - 1]; if (l && l.d === e.d && (e.d ? l.y === e.y && e.x === l.x + 1 : l.x === e.x && e.y === l.y + 1)) lauf.push(e); else { if (lauf.length > best.length) best = lauf; lauf = [e]; } }
      return lauf.length > best.length ? lauf : best;
    };
    while (verbunden.size < raeume.length) {
      let wahl: { w: number; p: HausRaum; q: HausRaum; es: { x: number; y: number; d: 0 | 1 }[] } | null = null;
      for (const [key, es] of [...kanten.entries()].sort((p, q) => p[0] < q[0] ? -1 : 1)) {
        const [pa, pb] = key.split("|").map(Number) as [number, number]; if (verbunden.has(pa) === verbunden.has(pb)) continue;
        const p = nachId.get(verbunden.has(pa) ? pa : pb)!, q = nachId.get(verbunden.has(pa) ? pb : pa)!;
        const w = vorliebe(q, p) + zufall() * .2; if (!wahl || w < wahl.w) wahl = { w, p, q, es };
      }
      if (!wahl) break;
      const lauf = laengsterLauf(wahl.es), m = lauf[Math.floor((lauf.length - 1) / 2)]!;
      tueren.push({ ...m, von: wahl.p.index, nach: wahl.q.index, breit: false });
      if (lauf.length >= 5 && wahl.p.rolle !== "privat" && wahl.q.rolle !== "privat") { const m2 = lauf[Math.floor((lauf.length - 1) / 2) + 1]!; tueren.push({ ...m2, von: wahl.p.index, nach: wahl.q.index, breit: true }); }
      verbunden.add(wahl.q.index);
    }
    // Nicht angeschlossene Reste (ohne gemeinsame Kante) gehen im Nachbarn auf — ohne Zugang kein Raum.
    const kueche = raeume.find(q => /kueche/.test(q.art) && !q.gruppe);
    if (kueche && haupt && nachId.has(haupt.id) && !tueren.some(t => (t.von === haupt.id && t.nach === kueche.index) || (t.nach === haupt.id && t.von === kueche.index))) {
      const es = kanten.get(`${Math.min(haupt.id, kueche.index)}|${Math.max(haupt.id, kueche.index)}`);
      if (es && es.length >= 2) { const lauf = laengsterLauf(es); tueren.push({ ...lauf[Math.floor(lauf.length / 2)]!, von: haupt.id, nach: kueche.index, breit: false }); }
    }
    // -- Fenster -----------------------------------------------------------------------------------
    const fenster: HausFenster[] = [];
    if (stufe >= 0) for (const q of raeume) {
      const aussenK: { x: number; y: number; dx: number; dy: number }[] = [];
      for (const c of q.zellen) { const [x, y] = xy(c); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) if (aussen(x + dx, y + dy)) aussenK.push({ x, y, dx, dy }); }
      const gruppen2 = new Map<string, typeof aussenK>();
      for (const e of aussenK) { const key = `${e.dx},${e.dy},${e.dx ? e.x : e.y}`; (gruppen2.get(key) ?? gruppen2.set(key, []).get(key)!).push(e); }
      let zahl = 0;
      for (const key of [...gruppen2.keys()].sort()) {
        const es = gruppen2.get(key)!.sort((p, q2) => p.dx ? p.y - q2.y : p.x - q2.x), laeufe: (typeof aussenK)[] = [];
        let lauf: typeof aussenK = []; for (const e of es) { const l = lauf[lauf.length - 1]; if (l && (e.dx ? e.y === l.y + 1 : e.x === l.x + 1)) lauf.push(e); else { if (lauf.length) laeufe.push(lauf); lauf = [e]; } } if (lauf.length) laeufe.push(lauf);
        for (const L of laeufe) for (let k = L.length >= 3 ? 1 : 0; k < L.length - (L.length >= 3 ? 1 : 0); k += 3) {
          const e = L[k]!, c = idx(e.x, e.y);
          if (istTreppe[c] || (eg && c === tuerZelle && e.dx === seite[0] && e.dy === seite[1])) continue;
          if (eg && Math.abs(e.x - tx) + Math.abs(e.y - ty) <= 1 && e.dx === seite[0] && e.dy === seite[1]) continue;
          if (L.length < 3 && zahl > 0) continue;
          fenster.push({ ...e, raum: q.index }); zahl++;
        }
      }
    }
    return { stufe, raum, raeume, tueren, fenster, oben: stufen.includes(stufe + 1), unten: stufen.includes(stufe - 1) };
  };

  const plan = stufen.map(geschoss);
  const geschosse = plan.map(g => ({ ...g, moebel: moeblieren(g, { W, H, drin, xy, idx, nb4, treppe, tuerZelle, setting, zufall, moeblierung: a.moeblierung ?? 1, regeln: a.regeln ?? moebelFuer }) }));
  return { breite: W, hoehe: H, drin, tuer: { x: tx, y: ty, dx: seite[0], dy: seite[1] }, treppe, geschosse, massstab: M, rund };
}

interface MoebelKontext {
  readonly W: number; readonly H: number; readonly drin: Uint8Array; readonly xy: (i: number) => [number, number]; readonly idx: (x: number, y: number) => number;
  readonly nb4: (i: number) => number[]; readonly treppe: HausTreppe | null; readonly tuerZelle: number; readonly setting: KartenSetting;
  readonly zufall: () => number; readonly moeblierung: number;
  readonly regeln: (art: string, zellen: number) => readonly MoebelRegel[];
}
const RINGMOEBEL = new Set(["tafel", "esstisch", "rundtisch", "tisch", "couchtisch", "holotisch", "tischtennis", "amboss", "leitpult", "konferenztisch"]);

function moeblieren(g: Omit<HausGeschossPlan, "moebel">, k: MoebelKontext): HausMoebel[] {
  const { W, H, xy, idx, nb4, zufall } = k, belegt = new Uint8Array(W * H), out: HausMoebel[] = [];
  if (k.treppe) for (const c of k.treppe.zellen) { belegt[c] = 1; for (const j of nb4(c)) if (!belegt[j]) belegt[j] = 2; }
  for (const t of g.tueren) { const a = idx(t.x, t.y), b = t.d ? a + W : a + 1; belegt[a] = belegt[b] = 2; }
  if (g.stufe === 0) { belegt[k.tuerZelle] = 2; for (const j of nb4(k.tuerZelle)) if (!belegt[j]) belegt[j] = 2; }
  for (const r of g.raeume) {
    const imRaum = new Uint8Array(W * H); for (const c of r.zellen) imRaum[c] = 1;
    const zx = r.zellen.reduce((s, c) => s + xy(c)[0] + .5, 0) / r.zellen.length, zy = r.zellen.reduce((s, c) => s + xy(c)[1] + .5, 0) / r.zellen.length;
    const regeln = k.regeln(r.art, r.zellen.length);
    for (const regel of regeln) {
      if (!regel.pflicht && zufall() > k.moeblierung) continue;
      if (regel.lage === "reihe") { out.push(...reihen(g, r, imRaum, belegt, k)); continue; }
      const m = stelle(regel, r, imRaum, belegt, zx, zy, k, g);
      if (!m) continue;
      out.push(m);
      if (!m.boden) {
        for (let y = m.y; y < m.y + m.fh; y++) for (let x = m.x; x < m.x + m.fw; x++) belegt[idx(x, y)] = 1;
        if (RINGMOEBEL.has(m.typ)) for (let y = m.y - 1; y <= m.y + m.fh; y++) for (let x = m.x - 1; x <= m.x + m.fw; x++) if (x >= 0 && y >= 0 && x < W && y < H && !belegt[idx(x, y)]) belegt[idx(x, y)] = 2;
      }
    }
  }
  return out;
}

function stelle(regel: MoebelRegel, r: HausRaum, imRaum: Uint8Array, belegt: Uint8Array, zx: number, zy: number, k: MoebelKontext, g: Omit<HausGeschossPlan, "moebel">): HausMoebel | null {
  const { W, H, idx, drin, zufall } = k, [w, t] = regel.masse, lage = regel.lage;
  const wandZelle = (x: number, y: number) => x < 0 || y < 0 || x >= W || y >= H || !imRaum[idx(x, y)];
  const aussenZelle = (x: number, y: number) => x < 0 || y < 0 || x >= W || y >= H || !drin[idx(x, y)];
  let best: (HausMoebel & { score: number }) | null = null;
  for (const o of [0, 1, 2, 3] as const) {
    const fw = o % 2 === 0 ? w : t, fh = o % 2 === 0 ? t : w;
    for (const c0 of r.zellen) {
      const [x, y] = k.xy(c0); if (x + fw > W || y + fh > H) continue;
      let ok = true;
      for (let j = 0; j < fh && ok; j++) for (let i = 0; i < fw; i++) { const c = idx(x + i, y + j); if (!imRaum[c] || (lage !== "boden" && belegt[c])) { ok = false; break; } }
      if (!ok) continue;
      let score = zufall();
      if (lage === "wand" || lage === "aussen" || lage === "ecke") {
        const hinten: [number, number][] = []; for (let s = 0; s < (o % 2 === 0 ? fw : fh); s++) hinten.push(o === 0 ? [x + s, y - 1] : o === 2 ? [x + s, y + fh] : o === 1 ? [x + fw, y + s] : [x - 1, y + s]);
        if (!hinten.every(([hx, hy]) => wandZelle(hx, hy))) continue;
        if (lage === "aussen" && !hinten.every(([hx, hy]) => aussenZelle(hx, hy))) continue;
        // Schränke und Regale nicht vor Fenster stellen.
        if (regel.hoch && g.fenster.some(f => hinten.some(([hx, hy]) => f.x + f.dx === hx && f.y + f.dy === hy))) score += 3;
        const seiten: [number, number][] = o % 2 === 0 ? [[x - 1, y], [x + fw, y]] : [[x, y - 1], [x, y + fh]];
        const ecke = seiten.some(([sx, sy]) => wandZelle(sx, sy));
        if (lage === "ecke" && !ecke) continue;
        if (ecke) score -= .4;
      } else if (lage === "mitte") {
        let frei = true;
        for (let j = -1; j <= fh && frei; j++) for (let i = -1; i <= fw; i++) { const cx = x + i, cy = y + j; if (cx < 0 || cy < 0 || cx >= W || cy >= H || !imRaum[idx(cx, cy)] || belegt[idx(cx, cy)] === 1) { frei = false; break; } }
        if (!frei && fw * fh > 1) continue;
        if (!frei) score += 2;
        score += Math.hypot(x + fw / 2 - zx, y + fh / 2 - zy) * .6;
      } else score = Math.hypot(x + fw / 2 - zx, y + fh / 2 - zy) + zufall() * .3;
      if (!best || score < best.score) best = { typ: regel.typ, x, y, fw, fh, o, raum: r.index, boden: lage === "boden", score };
    }
  }
  if (!best) return null;
  const { score: _s, ...m } = best; return m;
}

/** Bankreihen quer zur Längsachse, Mittelgang, Blick zum Altarraum. */
function reihen(g: Omit<HausGeschossPlan, "moebel">, r: HausRaum, imRaum: Uint8Array, belegt: Uint8Array, k: MoebelKontext): HausMoebel[] {
  const { xy, idx } = k, out: HausMoebel[] = [];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const c of r.zellen) { const [x, y] = xy(c); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const chor = g.raeume.find(q => q.art === "chor");
  const cx = chor ? chor.zellen.reduce((s, c) => s + xy(c)[0], 0) / chor.zellen.length : x1, cy = chor ? chor.zellen.reduce((s, c) => s + xy(c)[1], 0) / chor.zellen.length : y0;
  const laengsX = x1 - x0 >= y1 - y0, zumChor = laengsX ? Math.sign(cx - (x0 + x1) / 2) || 1 : Math.sign(cy - (y0 + y1) / 2) || 1;
  const mitteQ = laengsX ? Math.round((y0 + y1 + 1) / 2) : Math.round((x0 + x1 + 1) / 2);
  const von = laengsX ? (zumChor > 0 ? x0 + 1 : x1 - 1) : (zumChor > 0 ? y0 + 1 : y1 - 1), bis = laengsX ? (zumChor > 0 ? x1 - 2 : x0 + 2) : (zumChor > 0 ? y1 - 2 : y0 + 2);
  for (let l = von; zumChor > 0 ? l <= bis : l >= bis; l += zumChor) {
    if (Math.abs(l - von) % 2 === 1) continue;
    for (const seite of [-1, 1]) {
      const zellen: number[] = [];
      for (let q = mitteQ + (seite > 0 ? 1 : -2); laengsX ? q >= y0 && q <= y1 : q >= x0 && q <= x1; q += seite) { const c = laengsX ? idx(l, q) : idx(q, l); if (!imRaum[c] || belegt[c]) break; zellen.push(c); if (zellen.length === 3) break; }
      if (zellen.length < 2) continue;
      for (const c of zellen) belegt[c] = 1;
      const ks = zellen.map(xy), lo = Math.min(...ks.map(q => laengsX ? q[1] : q[0])), hi = Math.max(...ks.map(q => laengsX ? q[1] : q[0]));
      out.push(laengsX
        ? { typ: "kirchbank", x: l, y: lo, fw: 1, fh: hi - lo + 1, o: zumChor > 0 ? 3 : 1, raum: r.index, boden: false }
        : { typ: "kirchbank", x: lo, y: l, fw: hi - lo + 1, fh: 1, o: zumChor > 0 ? 0 : 2, raum: r.index, boden: false });
    }
  }
  return out;
}
