// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { weltkeim, type BauwerkTyp, type CartographyLabelV1, type SettlementPlan, type SettlementZone } from "@chronicle/szene";
import { abstandPolygonStrecke, clipHalbebene, einwaerts, flaeche, huelle, imPolygon, q, qp, schnittKonvex, schwerpunkt, type Polygon, type Punkt } from "../../polygon.ts";
import { routeRoadPlan } from "../../road-routing.ts";
import { inspectRoadNetwork } from "../../road-network.ts";
import { roofZone, zoneBuilding, zoneDraw } from "../../siedlung-plan.ts";
import type { Siedlung, SiedlungBauwerk, SiedlungGrund, SiedlungStrasse } from "../../siedlung.ts";
import { ausstattung, dokument, kappeAnHindernissen, kreuzungen, ohneLaengsFluss, stege, wasserUndBruecken, type Ablage, type ExtraRegion, type Wand } from "../abschluss.ts";
import { freieMauer, getrennteDaecher, hausImLos, mitAbstand, ohne, type Gasse } from "../gemeinsam.ts";
import { fail } from "../../kartenwerk.ts";
import { bauernhof, flurStreifen } from "./flur.ts";
import { kantengraph, weg } from "./graph.ts";
import { mauerKanten, mauerLinien, turmPunkte, waehleTore, zwoelfeck } from "./mauer.ts";
import { viertelBilden, viertelPlan } from "./namen.ts";
import { ROLLEN_FAKTOR, type Bau, type Platz } from "./parzellen.ts";
import { waehleTyp, type StadtStil } from "../stil.ts";
import { waehleMarkt, weiseRollenZu, type FleckLage, type Rolle } from "./rollen.ts";
import { hauptstrassen, strassenBaender, type Breiten } from "./wege.ts";

/**
 * **Die Siedlung aus Vierteln (Fantasy v11, Gegenwart und Sci-Fi v12).** Was den Stil ausmacht,
 * liefert `stil` (`../stil.ts`); das Folgende beschreibt die Fantasy-Stadt. Flecken auf einer Spirale, die inneren sind
 * die Stadt, der Kern bekommt eine Mauer mit Türmen und Toren. Hauptstraßen laufen von den Toren
 * zum Markt, jede Kante zwischen Stadtflecken ist eine Gasse, und jedes Viertel wird nach seiner
 * Rolle bebaut — Häuserzeilen im Kern, Gärten in der Oberstadt, Lagerhäuser am Hafen, Höfe in der
 * Flur. Was fertig ist, geht durch dieselben Endschritte wie jede Siedlung (`abschluss.ts`).
 */
const TURM = .42, MAUER_VERSATZ = .47, GLACIS = MAUER_VERSATZ + TURM + .3;

export interface ViertelBasis { readonly erzeuger: string; readonly ausgelassen: readonly string[] }

export function erzeugeViertelStadt(g: SiedlungGrund, basis: ViertelBasis, stil: StadtStil): Siedlung {
  const { art, standort, optionen, breite, hoehe, r, ids, z, rahmen, landschaft, fluss, wasser, fels, strand, sumpf, wasserMaterial,
    hartHindernisse, bauHindernisse, planung, verkehr, layoutKeim, keim, version, flussBreite, flussPunkte, auftrag, paket } = g;
  const mauerWunsch = stil.befestigung === "ring" ? art === "stadt" : optionen.mauer ?? art === "stadt";
  const burgWunsch = stil.setting === "fantasy" && (optionen.burg ?? art === "stadt");
  const ausgelassen: string[] = [];
  const id = (...pfad: string[]) => ids.geometrieId(...pfad);
  const inIrgendeinem = (p: Punkt, polys: readonly Polygon[]) => polys.some(poly => imPolygon(p, poly));

  // -- 1. Flecken auf der Spirale ------------------------------------------------------------
  const mitte: Punkt = qp([breite / 2 + r.zahl(-.06, .06) * breite, hoehe / 2 + r.zahl(-.06, .06) * hoehe]);
  const { alle, innenZiel } = stil.flecken({ art, bauwerke: optionen.bauwerke, mitte, rahmen, breite, hoehe, r });
  const zelle = (i: number) => alle[i]!.zelle;
  const trocken = alle.map(f => !inIrgendeinem(schwerpunkt(f.zelle), hartHindernisse));
  const stadtListe: number[] = [];
  for (let i = 0; i < alle.length && stadtListe.length < innenZiel; i++) if (trocken[i]) stadtListe.push(i);
  if (!stadtListe.length) fail("geometrie", "viertel", "auf dieser Karte liegt kein trockener Fleck für eine Siedlung");
  const stadtSet = new Set(stadtListe), istStadt = (i: number) => i >= 0 && stadtSet.has(i);
  // Befestigt: Stein- oder Zaunmauer, oder (Gegenwart) ein Stadtring als Straße um den Kern.
  const befestigt = mauerWunsch && stadtListe.length >= 5, mitMauer = befestigt && stil.befestigung !== "ring";
  if (mauerWunsch && !befestigt && stil.befestigung !== "ring") ausgelassen.push(stil.texte.zuKlein);
  const kernSet = new Set(befestigt ? stadtListe.slice(0, stil.befestigung === "zaun" ? stadtListe.length : Math.max(4, Math.round(stadtListe.length * stil.kernAnteil))) : stadtListe);
  const istKern = (i: number) => i >= 0 && kernSet.has(i);

  // -- 2. Kantengraph, Mauerring, Tore ------------------------------------------------------
  const graph = kantengraph(alle.map(f => f.zelle));
  const nachbarn = alle.map(() => [] as number[]);
  for (const k of graph.kanten) if (k.f2 >= 0) { nachbarn[k.f1]!.push(k.f2); nachbarn[k.f2]!.push(k.f1); }
  const ringKanten = befestigt ? mauerKanten(graph, istKern) : [], ring = mitMauer ? ringKanten : [];
  const ringSet = new Set(ring);
  const torRing = mitMauer ? ring : graph.kanten.filter(k => k.f2 >= 0 && istStadt(k.f1) !== istStadt(k.f2)).map(k => k.nr);
  const torStart: Punkt = standort === "fluss" && flussPunkte.length ? flussPunkte[0]! : [mitte[0] + r.zahl(-1, 1), mitte[1] + r.zahl(-1, 1)];
  const tore = waehleTore(graph, torRing, mitMauer ? istKern : istStadt, mitte, art === "stadt" ? 4 : art === "dorf" ? 3 : 2,
    p => inIrgendeinem(p, hartHindernisse), torStart);
  const torPunkte = tore.map(t => graph.ecken[t]!);

  // -- 3. Rollen -----------------------------------------------------------------------------
  const wasserFlaechen = [...wasser, ...fluss.map(f => f.polygon)];
  const amUfer = (poly: Polygon) => wasserFlaechen.some(w => w.some((p, i) => abstandPolygonStrecke(poly, p, w[(i + 1) % w.length]!) <= .6));
  const lagen: FleckLage[] = stadtListe.map(i => {
    const f = alle[i]!;
    const eckenDerZelle = new Set(graph.kanten.filter(k => k.f1 === i || k.f2 === i).flatMap(k => [k.u, k.v]));
    return {
      nr: i, punkt: f.punkt, flaeche: flaeche(f.zelle), ferne: f.ferne, nachbarn: nachbarn[i]!.filter(istStadt),
      ufer: amUfer(f.zelle), trocken: fluss.reduce((s, st) => s + flaeche(schnittKonvex(f.zelle, st.polygon)), 0) < flaeche(f.zelle) * .12, kern: istKern(i), mauerRand: ring.some(nr => graph.kanten[nr]!.f1 === i || graph.kanten[nr]!.f2 === i),
      hoehe: landschaft.hoehe(f.punkt[0], f.punkt[1]), tor: tore.some(t => eckenDerZelle.has(t)),
    };
  });
  const rollenAuftrag = { art, burg: burgWunsch && mitMauer, ...(planung?.zonen.length ? { plan: planung } : {}), breite, hoehe };
  const markt = waehleMarkt(lagen, rollenAuftrag);
  const { rollen, ausgelassen: rollenLuecken } = weiseRollenZu(lagen, markt, rollenAuftrag);
  stil.nachRollen?.(lagen, rollen, art, nutzung => !!planung?.zonen.some(zone => zone.nutzung === nutzung));
  ausgelassen.push(...rollenLuecken.map(text => stil.burgWort === "Burg" ? text
    : text.replaceAll("Burgzone", `Zone „${stil.burgWort}“`).replaceAll("Keine Burg", `Kein Bereich „${stil.burgWort}“`)));
  if (burgWunsch && !mitMauer && ![...rollen.values()].includes("burg")) ausgelassen.push("Keine Burg: ohne Stadtmauer hat sie keinen Platz an der Mauer.");

  // -- 4. Straßen ----------------------------------------------------------------------------
  const kantenMitte = (k: { von: Punkt; bis: Punkt }): Punkt => [(k.von[0] + k.bis[0]) / 2, (k.von[1] + k.bis[1]) / 2];
  let wege = hauptstrassen({ g: graph, istStadt, istKern: mitMauer ? istKern : istStadt, ring: ringSet, randKanten: new Set(torRing), markt, tore, mitte, breite, hoehe,
    kosten: k => inIrgendeinem(kantenMitte(k), hartHindernisse) ? Infinity : inIrgendeinem(kantenMitte(k), fluss.map(f => f.polygon)) ? 6 : 0 });
  // Ein Ort am Fluss hat einen Übergang. Liegen zufällig alle Tore auf der Marktseite, führt eine
  // Landstraße vom ersten Tor über den Fluss zum gegenüberliegenden Kartenrand.
  const amKartenrand = (k: { von: Punkt; bis: Punkt }) => [k.von, k.bis].every(p => p[0] < .01 || p[1] < .01 || p[0] > breite - .01 || p[1] > hoehe - .01);
  const quert = (k: { von: Punkt; bis: Punkt }) => fluss.some(f => abstandPolygonStrecke(f.polygon, k.von, k.bis) < 1e-9);
  if (standort === "fluss" && flussPunkte.length > 1 && ![...wege.haupt, ...wege.ausfall].some(nr => quert(graph.kanten[nr]!))) {
    const seite = (p: Punkt) => {
      let beste = 0, abstand = Infinity;
      for (let k = 1; k < flussPunkte.length; k++) { const d = abstandPolygonStrecke([p], flussPunkte[k - 1]!, flussPunkte[k]!); if (d < abstand) { abstand = d; beste = k; } }
      const a2 = flussPunkte[beste - 1]!, b2 = flussPunkte[beste]!;
      return Math.sign((b2[0] - a2[0]) * (p[1] - a2[1]) - (b2[1] - a2[1]) * (p[0] - a2[0]));
    };
    const start = tore[0] ?? graph.kanten.find(k => k.f1 === markt || k.f2 === markt)?.u ?? -1;
    if (start >= 0) {
      const gegenueber = -seite(graph.ecken[start]!), ziele = new Set<number>();
      graph.ecken.forEach((p, e) => { if ((p[0] < .01 || p[1] < .01 || p[0] > breite - .01 || p[1] > hoehe - .01) && seite(p) === gegenueber) ziele.add(e); });
      const pfad = weg(graph, start, ziele, k => amKartenrand(k) || (mitMauer && (istKern(k.f1) || (k.f2 >= 0 && istKern(k.f2)))) || inIrgendeinem(kantenMitte(k), hartHindernisse) ? Infinity : k.laenge + (quert(k) ? 4 : 0));
      if (pfad) wege = { haupt: wege.haupt, ausfall: new Set([...wege.ausfall, ...pfad]) };
    }
  }
  // Der Stadtring der Gegenwart: die Außenkanten des Kerns sind Hauptstraßen, keine Mauer.
  if (stil.befestigung === "ring" && ringKanten.length) wege = { haupt: new Set([...wege.haupt, ...ringKanten]), ausfall: wege.ausfall };
  const breiten: Breiten = stil.breiten(art);
  const { gassen } = strassenBaender(graph, { istStadt, istKern, ring: ringSet, wege, breiten, zelleVon: zelle, breite, hoehe, id });
  // Einrückung je Zellkante aus den Bändern, bevor Fluss und Fels sie kürzen.
  const einrueckung = new Map<string, number>();
  const kantenSchluessel = (a: Punkt, b: Punkt) => { const u = graph.finde(a), v = graph.finde(b); return u < v ? `${u}:${v}` : `${v}:${u}`; };
  for (const s of gassen) {
    const laenge = Math.hypot(s.bis[0] - s.von[0], s.bis[1] - s.von[1]) || 1, w = flaeche(s.band) / laenge;
    einrueckung.set(kantenSchluessel(s.von, s.bis), s.a === s.b ? w + .12 : w / 2 + .12);
  }
  ohneLaengsFluss(gassen, fluss);
  kappeAnHindernissen(gassen, hartHindernisse, .5, ids);
  // Eine Gasse, die zu einem Viertel im Fluss liegt, ist keine Uferstraße, sondern ein Steg ins Nichts.
  for (let k = gassen.length - 1; k >= 0; k--) {
    const s = gassen[k]!;
    if (s.art !== "hauptstrasse" && fluss.reduce((sum, f) => sum + flaeche(schnittKonvex(s.band, f.polygon)), 0) > flaeche(s.band) * .25) gassen.splice(k, 1);
  }
  // Brücken tragen nur Hauptstraßen; eine Nebengasse endet am Ufer wie an einem See.
  const nebengassen = gassen.filter(s => s.art !== "hauptstrasse");
  kappeAnHindernissen(nebengassen, fluss.map(f => f.polygon), .4, ids);
  gassen.splice(0, gassen.length, ...gassen.filter(s => s.art === "hauptstrasse"), ...nebengassen);
  if (!gassen.length) fail("geometrie", "strassen", "die Siedlung hat keine einzige Straße");
  const routed = verkehr?.knoten.length ? routeRoadPlan(verkehr, { width: breite, height: hoehe, obstacles: hartHindernisse, rivers: fluss.map(f => f.polygon), elevation: landschaft.hoehe }) : undefined;
  const reserviert = routed?.surfaces.map(s => s.polygon) ?? [];

  // -- 5. Bebauung ---------------------------------------------------------------------------
  // Losgröße aus dem Gebäudeziel: jedes Viertel trägt nach seiner Rolle bei (Sonderviertel nichts,
  // Vorstädte nur entlang der Ausfallstraßen), gut ein Drittel der Lose wird Hof oder Garten. Lieber
  // etwas mehr Lose als Gebäude — das Budget kürzt von außen nach innen.
  const beitrag = stadtListe.reduce((s, i) => {
    const rolleI = rollen.get(i) ?? "wohnen";
    if (rolleI === "markt" || rolleI === "tempel" || rolleI === "burg" || rolleI === "frei") return s;
    return s + flaeche(einwaerts(zelle(i), .5)) * (befestigt && !istKern(i) ? stil.vorstadtAnteil : 1) / ROLLEN_FAKTOR[rolleI] * .62;
  }, 0);
  const [gMin, gMax] = optionen.grundstueck;
  const losFlaeche = Math.min(gMax * gMax, Math.max(gMin * gMin * .2, beitrag / (optionen.bauwerke * 1.25)));
  const baue: (Bau & { ferne: number; rolle: Rolle | "weiler" })[] = [], plaetze: Platz[] = [], hoefe: Polygon[] = [], alleGassen: Gasse[] = [...gassen];
  const burgMauern: { a: Punkt; b: Punkt; pfad: string }[] = [];
  const marktMitte: Punkt = markt >= 0 ? schwerpunkt(zelle(markt)) : mitte;
  for (const i of stadtListe) {
    const c = zelle(i), rolle = rollen.get(i) ?? "wohnen", vorstadt = befestigt && !istKern(i);
    const abstaende = c.map((p, k) => {
      const v = c[(k + c.length - 1) % c.length]!, key = kantenSchluessel(v, p);
      const kante = graph.kanten.find(e => (e.u === graph.finde(v) && e.v === graph.finde(p)) || (e.v === graph.finde(v) && e.u === graph.finde(p)));
      if (kante && ringSet.has(kante.nr) && !istKern(i)) return GLACIS;
      return einrueckung.get(key) ?? .3;
    });
    const randStrassen = gassen.filter(s => s.a === i || s.b === i)
      .sort((a, b) => Math.hypot(...kantenMitte(a).map((x, k) => x - marktMitte[k]!) as [number, number]) - Math.hypot(...kantenMitte(b).map((x, k) => x - marktMitte[k]!) as [number, number]));
    const auftragFleck = { nr: i, pfad: alle[i]!.pfad, zelle: c, rolle, vorstadt: vorstadt || art === "weiler", art, randStrassen, abstaende, losFlaeche,
      strassenDichte: optionen.strassenDichte, hindernisse: [...bauHindernisse, ...reserviert], nurAnHaupt: false, r, id };
    const ergebnis = stil.bebaue(auftragFleck);
    if (rolle === "burg" && !ergebnis.baue.length) ausgelassen.push("Keine Burg: der Burgfleck ist zu klein.");
    for (const b of ergebnis.baue) baue.push({ ...b, ferne: alle[i]!.ferne, rolle: art === "weiler" ? "weiler" : rolle });
    plaetze.push(...ergebnis.plaetze); hoefe.push(...ergebnis.hoefe); alleGassen.push(...ergebnis.gassen);
    burgMauern.push(...(ergebnis.mauern ?? []));
  }

  // -- 6. Mauer mit Türmen und Toren ---------------------------------------------------------
  const mauerStuecke: { a: Punkt; b: Punkt; pfad: string }[] = [];
  if (mitMauer) {
    const linien = mauerLinien(graph, ring, i => schwerpunkt(zelle(i)), istKern, MAUER_VERSATZ);
    // Kreuzungsflächen (Achtecke an Straßenenden, `abschluss.ts: kreuzungen`) sind ebenfalls Fahrbahn.
    const enden = new Map<string, { p: Punkt; r: number; n: number }>();
    for (const g2 of alleGassen) for (const p of [g2.von, g2.bis]) {
      const key = `${Math.round(p[0] * 100)}:${Math.round(p[1] * 100)}`, alt = enden.get(key), r = flaeche(g2.band) / (Math.hypot(g2.bis[0] - g2.von[0], g2.bis[1] - g2.von[1]) || 1) / 2;
      enden.set(key, { p, r: Math.max(alt?.r ?? 0, r), n: (alt?.n ?? 0) + 1 });
    }
    const kreuzHindernisse = [...enden.values()].filter(e => e.n >= 2).map(e => mitAbstand([[e.p[0] - e.r, e.p[1] - e.r], [e.p[0] + e.r, e.p[1] - e.r], [e.p[0] + e.r, e.p[1] + e.r], [e.p[0] - e.r, e.p[1] + e.r]], .1));
    const bandHindernisse = [...alleGassen.map(s => mitAbstand(s.band, .1)), ...kreuzHindernisse], wasserHindernisse = bauHindernisse.map(p => mitAbstand(p, .07));
    const roheStuecke: { a: Punkt; b: Punkt; pfad: string }[] = [];
    for (const l of linien) for (const [x, [a, b]] of freieMauer(l.a, l.b, [...bandHindernisse, ...wasserHindernisse]).entries())
      if ([a, b].every(([px, py]) => px >= 0 && px <= breite && py >= 0 && py <= hoehe)) roheStuecke.push({ a, b, pfad: `${l.pfad}.${x}` });
    // Ein Schutzzaun (Sci-Fi) hat keine Türme: seine Stücke sind die rohen Mauerstücke.
    const mitTuermen = stil.befestigung === "stein";
    const turmOrte = mitTuermen ? turmPunkte(linien, 6).map(p => ({ p, tor: false })) : [];
    // Torflanken: wo eine Straße die Mauer nahe einem Tor durchbricht, steht links und rechts ein Turm.
    if (mitTuermen) for (const s of roheStuecke) for (const [ende, anderes] of [[s.a, s.b], [s.b, s.a]] as const) {
      if (!torPunkte.some(t => Math.hypot(t[0] - ende[0], t[1] - ende[1]) < 1.8)) continue;
      const dx = anderes[0] - ende[0], dy = anderes[1] - ende[1], l = Math.hypot(dx, dy);
      if (l < TURM * 2.4) continue;
      turmOrte.push({ p: [ende[0] + dx / l * (TURM + .06), ende[1] + dy / l * (TURM + .06)], tor: true });
    }
    let nummer = 0;
    const tuerme: Polygon[] = [];
    for (const { p, tor } of turmOrte) {
      const turm = zwoelfeck(p, TURM), box = huelle(turm);
      if (turm.some(([x, y]) => x < 0 || y < 0 || x > breite || y > hoehe)) continue;
      const ueberlappt = (poly: Polygon) => { const b = huelle(poly); return !(b[2] < box[0] || b[0] > box[2] || b[3] < box[1] || b[1] > box[3]) && !getrennteDaecher(poly, turm); };
      if (alleGassen.some(s => ueberlappt(s.band)) || hartHindernisse.some(ueberlappt) || fluss.some(f => ueberlappt(f.polygon)) || baue.some(b => ueberlappt(b.umriss))) continue;
      let naechste: Gasse | undefined, abstand = Infinity;
      for (const s of gassen) { const d = abstandPolygonStrecke(turm, s.von, s.bis); if (d < abstand) { abstand = d; naechste = s; } }
      if (!naechste || abstand > 1.6) continue;
      nummer++;
      baue.push({ pfad: `turm.${q(p[0])}_${q(p[1])}`, umriss: turm, los: turm, strasse: naechste.id, typ: "turm", titel: `${tor ? "Torturm" : "Mauerturm"} ${nummer}`, rang: 0, ferne: 0, rolle: "wohnen" });
      tuerme.push(turm);
    }
    // Die Mauer endet unter jedem Turm: die Kartenoptik zeichnet Rundtürme nach der Mauer
    // (`cartography-12`), das Mauerende samt Kappe verschwindet also unter dem Turmdach.
    const turmHindernisse = tuerme.map(t => { const c = schwerpunkt(t), h = TURM * .36; return [[c[0] - h, c[1] - h], [c[0] + h, c[1] - h], [c[0] + h, c[1] + h], [c[0] - h, c[1] + h]] as Polygon; });
    for (const s of roheStuecke) for (const [x, [a, b]] of freieMauer(s.a, s.b, turmHindernisse).entries())
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > .12) mauerStuecke.push({ a, b, pfad: `${s.pfad}.${x}` });
  }

  // -- 7. Höfe an der Landstraße, dann das Budget ----------------------------------------------
  const hoefeLimit = stil.hoefe(art);
  const hofLose: Polygon[] = [];
  for (const [i, f] of alle.entries()) {
    if (istStadt(i) || !trocken[i] || hofLose.length >= hoefeLimit || standort === "wald") continue;
    if (landschaft.feuchte(f.punkt[0], f.punkt[1]) >= landschaft.waldSchwelle) continue;
    const strasse = gassen.find(s => s.art === "hauptstrasse" && (s.a === i || s.b === i) && !istStadt(s.a) && !istStadt(s.b));
    if (!strasse) continue;
    const dx = strasse.bis[0] - strasse.von[0], dy = strasse.bis[1] - strasse.von[1], l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l, ny = dx / l;
    const sp = schwerpunkt(f.zelle);
    if (nx * (sp[0] - strasse.von[0]) + ny * (sp[1] - strasse.von[1]) < 0) { nx = -nx; ny = -ny; }
    const streifen = clipHalbebene(f.zelle, nx, ny, nx * strasse.von[0] + ny * strasse.von[1] + 3.4);
    if (streifen.length < 3) continue;
    const hof = bauernhof(clipHalbebene(streifen, -nx, -ny, -(nx * strasse.von[0] + ny * strasse.von[1] + flaeche(strasse.band) / l / 2 + .1)), strasse, f.pfad, r);
    if (!hof.length || hof.some(h => bauHindernisse.some(w => flaeche(schnittKonvex(h.los, w)) > 1e-6))) continue;
    for (const h of hof) baue.push({ ...h, ferne: f.ferne, rolle: "weiler" });
    hofLose.push(hof[0]!.los);
  }
  // -- 8. Budget, Typen, Namen ---------------------------------------------------------------
  let planVerworfen = 0;
  const zonen = new Map<string, SettlementZone>();
  // Erst das Budget, dann der Plan (wie v9): so entfernt eine geringere Dichte nur Häuser und
  // holt keine zurück, die das Budget vorher ausgeschlossen hatte.
  // Ein Rand von 4 % bleibt unbebaut: am Bildrand angeschnittene Dächer lesen als Fehler.
  const imBild = (b: Bau) => b.umriss.every(([x, y]) => x > breite * .04 && x < breite * .96 && y > hoehe * .04 && y < hoehe * .96);
  const gewaehlt = [...baue].filter(imBild).sort((a, b) => a.rang - b.rang || a.ferne - b.ferne || (a.pfad < b.pfad ? -1 : a.pfad > b.pfad ? 1 : 0)).slice(0, optionen.bauwerke).filter(b => {
    if (!planung?.zonen.length) return true;
    const zone = roofZone(planung, b.umriss.map(([x, y]) => [x / breite, y / hoehe] as const));
    // Eine Freifläche räumt alles, auch Sonderbauten. Dichte und Ufernähe gelten für gewöhnliche Häuser.
    if (zone === "excluded") { planVerworfen++; return false; }
    if (b.rang === 0) return true;
    if (b.rang === 1) { if (zone) zonen.set(b.pfad, zone); return true; }
    const amWasser = () => wasserFlaechen.some(w => w.some((p, k) => abstandPolygonStrecke(b.umriss, p, w[(k + 1) % w.length]!) <= 4));
    if (zone && (zoneDraw(layoutKeim.keimHash, b.pfad, "density") >= zone.dichte || (zone.nutzung === "hafen" && !amWasser()))) { planVerworfen++; return false; }
    if (zone) zonen.set(b.pfad, zone);
    return true;
  });
  // Notbau: auf einer winzigen Karte kann jede Regel ein Los verwerfen. Dann steht wenigstens ein
  // Hof an der ersten Straße, an der er trocken Platz hat — ein Ort ohne Haus ist keiner.
  if (!gewaehlt.length && !planung?.zonen.length) for (const i of stadtListe) {
    const los = einwaerts(zelle(i), .12);
    const haus = los.length >= 3 ? gassen.filter(s => s.a === i || s.b === i).map(s => ({ s, haus: hausImLos(los, s, .9, .8, "rechteck") }))
      .find(({ haus }) => haus.length >= 3 && !bauHindernisse.some(w => flaeche(schnittKonvex(haus, w)) > 1e-6)) : undefined;
    if (!haus) continue;
    gewaehlt.push({ pfad: `${alle[i]!.pfad}.notbau`, umriss: haus.haus.map(qp), los: los.map(qp), strasse: haus.s.id, typ: art === "weiler" ? stil.typen.weiler[0]![0] : null, rang: 1, ferne: 0, rolle: art === "weiler" ? "weiler" : "wohnen" });
    break;
  }
  if (!gewaehlt.length && !planung?.zonen.length) fail("geometrie", "bauwerke", "auf dieser Karte ließ sich kein Gebäude an einer Straße platzieren");
  // Gassen, an denen kein gewähltes Haus steht, entfallen — sonst liegen in Flecken, die das
  // Budget nicht mehr bebaut, leere Wegkreuze. Die Kanten zwischen den Flecken bleiben: sie sind das Netz.
  const genutzt = new Set(gewaehlt.map(b => b.strasse)), randIds = new Set(gassen.map(s => s.id));
  const netz = alleGassen.filter(s => randIds.has(s.id) || genutzt.has(s.id));

  // -- 8. Flur, Plätze, Wasser -----------------------------------------------------------------
  const extraRegions: ExtraRegion[] = [], strassen: SiedlungStrasse[] = [];
  // Herkunft: Die Grundfläche und die Flächen des Straßenplans — die ersten Regionen der Karte —
  // tragen den vollen Keim samt Optionsvektor (Standort, Zonen-, Straßenplan); dort lesen Server und
  // Oberfläche ihn. Gebäude, Straßen und Plätze tragen einen kompakten Vermerk, der über den
  // Keim-Hash auf ihn zeigt; Gelände und Lose sind abgeleitet und tragen keinen. Den vollen Vektor
  // an jede der tausenden Flächen zu hängen sprengte die 1-MiB-Grenze der Kartografie.
  const vermerk = weltkeim({ generator: basis.erzeuger, version, seed: keim.keimHash, optionen: {} });
  const rolle = (regionId: string) => ({ regionId, authored: false as const, locked: false as const, provenance: null });
  const mitVermerk = (regionId: string) => ({ regionId, authored: false as const, locked: false as const, provenance: vermerk });
  const mitKeim = (regionId: string) => ({ regionId, authored: false as const, locked: false as const, provenance: keim });
  const ablage: Ablage = { extraRegions, strassen, rolle: mitVermerk };
  for (const s of netz) strassen.push({ id: s.id, art: s.art, umriss: s.band });
  for (const surface of routed?.surfaces ?? []) {
    const sid = id("verkehr", surface.key);
    strassen.push({ id: sid, art: surface.art, umriss: surface.polygon });
    extraRegions.push({ id: sid, polygon: surface.polygon, role: { ...mitKeim(sid), role: "road", material: surface.square ? "square" : surface.art === "hauptstrasse" ? "street" : "path" } });
  }
  const grundId = id("gelände", "grund");
  extraRegions.push({ id: grundId, polygon: rahmen, role: { ...mitKeim(grundId), role: "terrain", material: "grass" } });
  for (const [material, polygons] of [["rock", fels], ["sand", strand], ["swamp", sumpf]] as const) for (const [index, polygon] of polygons.entries()) {
    const rid = id("standort", material, `${index}`);
    extraRegions.push({ id: rid, polygon, role: { ...rolle(rid), role: "terrain", material } });
  }
  // Parks und Anger vor der Flur: das Zeichenbudget der Kartenoptik ist geteilt, und ein Park, der
  // nach hunderten Feldstreifen kommt, bliebe eine Fläche ohne Bäume.
  for (const p of plaetze) if (p.material === "grass" || p.material === "forest") {
    const pid = id("markt", p.pfad);
    extraRegions.push({ id: pid, polygon: p.polygon, role: { ...rolle(pid), role: "terrain", material: p.material } });
  }
  kreuzungen(netz, rahmen, ids, art === "stadt" ? "street" : "path", ablage);
  const hindernisse = [...bauHindernisse.map(p => mitAbstand(p, .035)), ...strand, ...sumpf, ...strassen.map(s => mitAbstand(s.umriss, .06)), ...hofLose.map(p => mitAbstand(p, .08))]
    .filter(p => p.length >= 3).map(polygon => ({ polygon, box: huelle(polygon) }));
  // Ein grobes Rasterverzeichnis (4 Zellen) statt jedes Stück gegen jedes Hindernis: bei tausend
  // Feldstreifen und Straßen war das der teuerste Schritt der ganzen Stadt.
  type Eintrag = { polygon: Polygon; box: readonly [number, number, number, number] };
  const RASTER = 4, verzeichnis = new Map<string, Eintrag[]>();
  const eintragen = (e: Eintrag) => {
    for (let x = Math.floor(e.box[0] / RASTER); x <= Math.floor(e.box[2] / RASTER); x++) for (let y = Math.floor(e.box[1] / RASTER); y <= Math.floor(e.box[3] / RASTER); y++) {
      const key = `${x}:${y}`; verzeichnis.set(key, [...(verzeichnis.get(key) ?? []), e]);
    }
  };
  const nahe = (box: readonly [number, number, number, number], mitBewuchs: boolean) => {
    const treffer = new Set<Eintrag>();
    for (let x = Math.floor(box[0] / RASTER); x <= Math.floor(box[2] / RASTER); x++) for (let y = Math.floor(box[1] / RASTER); y <= Math.floor(box[3] / RASTER); y++)
      for (const e of verzeichnis.get(`${x}:${y}`) ?? []) if (mitBewuchs || !bewuchsSet.has(e)) treffer.add(e);
    // Reihenfolge wie in der Liste, damit das Ergebnis nicht von der Rasterung abhängt.
    return [...treffer].sort((a, b) => reihenfolge.get(a)! - reihenfolge.get(b)!);
  };
  const reihenfolge = new Map<Eintrag, number>(), bewuchsSet = new Set<Eintrag>();
  for (const h of hindernisse) { reihenfolge.set(h, reihenfolge.size); eintragen(h); }
  const bewachsen: Eintrag[] = [];
  // Die Karte trägt höchstens 4096 Flächen. Gelände ist das Einzige, was sich kürzen lässt: was danach
  // noch kommt (Häuser, Lose, Straßen, Plätze, Wasser, Brücken, Stege), ist hier schon abgezählt.
  const gelaendeGrenze = 4096 - 16 - gewaehlt.length * 2 - netz.length - plaetze.length - wasser.length - fluss.length * 3;
  const gelaende = (polygon: Polygon, pfad: string, material: "forest" | "field", aussen = false) => {
    let stuecke = [schnittKonvex(polygon, rahmen)];
    // Jedes Hindernis zerschneidet ein Stück in bis zu so viele Teile, wie es Kanten hat. Splitter
    // fallen deshalb sofort weg, und mehr als 24 Stücke je Fläche behält niemand: ein Außenwald
    // gegen hunderte Feldstreifen wuchs sonst ohne Grenze, bis dem Server der Speicher ausging.
    for (const h of nahe(huelle(stuecke[0]!.length ? stuecke[0]! : polygon), aussen)) {
      stuecke = stuecke.flatMap(stueck => {
        const box = huelle(stueck);
        return box[2] <= h.box[0] || box[0] >= h.box[2] || box[3] <= h.box[1] || box[1] >= h.box[3] ? [stueck] : ohne(stueck, h.polygon);
      }).filter(stueck => stueck.length >= 3 && flaeche(stueck) >= .18);
      if (stuecke.length > 24) stuecke = [...stuecke].sort((x, y) => flaeche(y) - flaeche(x)).slice(0, 24);
      if (!stuecke.length) break;
    }
    for (const [index, stueck] of stuecke.entries()) {
      if (stueck.length < 3 || flaeche(stueck) < .18 || extraRegions.length >= gelaendeGrenze) continue;
      const gid = id("landschaft", material, pfad, `${index}`);
      extraRegions.push({ id: gid, polygon: stueck, role: { ...rolle(gid), role: "terrain", material } });
      if (!aussen) { const e = { polygon: stueck, box: huelle(stueck) }; bewachsen.push(e); bewuchsSet.add(e); reihenfolge.set(e, reihenfolge.size); eintragen(e); }
    }
  };
  // Ein gewöhnlicher Stadtfleck, auf dem das Budget kein Haus mehr gelassen hat, ist kein leerer
  // Bauplatz, sondern Gartenland vor der Stadt: er wird Feld wie die Flur, nur weiter von den Wegen.
  const bebaut = new Set(stadtListe.filter(i => gewaehlt.some(b => b.pfad.startsWith(`${alle[i]!.pfad}.`))));
  const brach = (i: number) => istStadt(i) && !bebaut.has(i) && !["markt", "tempel", "burg", "frei"].includes(rollen.get(i) ?? "wohnen");
  for (const [i, f] of alle.entries()) {
    if ((istStadt(i) && !brach(i)) || !trocken[i]) continue;
    const innen = einwaerts(f.zelle, brach(i) ? .6 : .25);
    if (innen.length < 3) continue;
    if (standort === "wald" || landschaft.feuchte(f.punkt[0], f.punkt[1]) >= landschaft.waldSchwelle) { gelaende(innen, f.pfad, "forest"); continue; }
    const streifen = flurStreifen(innen, stil.streifen(flaeche(innen)), r);
    for (const [k, s] of streifen.entries()) { const feld = einwaerts(s, .08); if (feld.length >= 3) gelaende(feld, `${f.pfad}.${k}`, "field"); }
  }
  for (const [index, polygon] of landschaft.wald.entries()) gelaende(polygon, `wald.${index}`, "forest", true);
  for (const p of plaetze) {
    if (p.material !== "square" && p.material !== "path") continue;
    const pid = id("markt", p.pfad);
    extraRegions.push({ id: pid, polygon: p.polygon, role: { ...mitVermerk(pid), role: "road", material: p.material } });
    strassen.push({ id: pid, art: "gasse", umriss: p.polygon });
  }
  wasserUndBruecken(wasser, wasserMaterial, fluss, ids, ablage);

  const typ = new Map<string, BauwerkTyp>();
  // In einer gemalten Zone gilt ihr Gebäudeprogramm (wie seit v9), sonst die Rolle des Viertels.
  for (const b of gewaehlt) {
    const zone = zonen.get(b.pfad), zug = zoneDraw(layoutKeim.keimHash, b.pfad, "typ");
    // Sonderbauten (Rang 0) behalten ihren Typ; Höfe und Häuser in einer Zone bekommen ihr Programm.
    typ.set(b.pfad, b.rang > 0 && zone ? zoneBuilding(zone, stil.setting, zug) : b.typ ?? waehleTyp(stil.typen[b.rolle], zug));
  }
  // Kirche, Tavernen und Mühle kommen nur auf Häuser außerhalb gemalter Zonen: dort bestimmt die Zone.
  const frei = (b: typeof gewaehlt[number]) => b.rang === 2 && !zonen.has(b.pfad);
  const naechstes = (ziel: Punkt, ausser: ReadonlySet<string>) => gewaehlt.filter(b => frei(b) && !ausser.has(b.pfad))
    .sort((a, b) => Math.hypot(...schwerpunkt(a.umriss).map((x, k) => x - ziel[k]!) as [number, number]) - Math.hypot(...schwerpunkt(b.umriss).map((x, k) => x - ziel[k]!) as [number, number]) || (a.pfad < b.pfad ? -1 : 1))[0];
  const vergeben = new Set<string>();
  const setze = (ziel: Punkt, t: BauwerkTyp) => { const b = naechstes(ziel, vergeben); if (b) { typ.set(b.pfad, t); vergeben.add(b.pfad); } };
  const amFluss = (t: BauwerkTyp, rollenListe: readonly (Rolle | "weiler")[] | "alle") => {
    const kandidaten = gewaehlt.filter(b => frei(b) && !vergeben.has(b.pfad) && (rollenListe === "alle" || rollenListe.includes(b.rolle)));
    const naechster = kandidaten.map(b => ({ b, d: Math.min(...fluss.map(f => f.polygon.reduce((m, p, k, poly) => Math.min(m, abstandPolygonStrecke(b.umriss, p, poly[(k + 1) % poly.length]!)), Infinity))) }))
      .filter(x => x.d < 1.2).sort((a, c) => a.d - c.d || (a.b.pfad < c.b.pfad ? -1 : 1))[0];
    if (naechster) { typ.set(naechster.b.pfad, t); vergeben.add(naechster.b.pfad); }
  };
  stil.sonderbauten({ art, markt, marktMitte, torPunkte, flussNah: fluss.length > 0, setze, amFluss, hatTyp: t => gewaehlt.some(b => b.typ === t) });
  const titelGesehen = new Set<string>();
  const bauwerke: SiedlungBauwerk[] = gewaehlt.map((b, i) => {
    const t = typ.get(b.pfad)!;
    let titel = b.titel ?? stil.titel(t, b, i, r);
    if (titelGesehen.has(titel)) titel = `${titel} ${i + 1}`;
    titelGesehen.add(titel);
    return { id: ids.knotenId("bauwerk", b.pfad), pfad: b.pfad, umriss: b.umriss, strasse: b.strasse, typ: t, titel };
  });
  for (const b of gewaehlt) {
    const lid = id("grundstück", b.pfad);
    extraRegions.push({ id: lid, polygon: b.los, role: { ...rolle(lid), role: "lot" } });
  }
  stege({ standort, art, wasser, fluss, flussBreite, mitteOrt: marktMitte, haeuser: bauwerke.map(b => b.umriss), breite, hoehe, rahmen, ids }, ablage);

  const mauern: Wand[] = [...mauerStuecke, ...burgMauern].map(m => ({ id: id("mauer", m.pfad), kind: "wall" as const, elevation: 0, points: [[q(m.a[0] * z), q(m.a[1] * z)], [q(m.b[0] * z), q(m.b[1] * z)]] }));
  const { werk, lichter, strassenzellen, hofzellen } = ausstattung({ paket, r, z, ids, setting: stil.setting, art, licht: optionen.licht, gassen: netz,
    bauwerkPolys: bauwerke.map(b => b.umriss), hofFlaechen: hoefe, bauHindernisse, breite, hoehe, mitte, bauwerkZahl: bauwerke.length }, ablage);

  const lagenNamen = stadtListe.map(i => ({ nr: i, zelle: zelle(i), nachbarn: nachbarn[i]!.filter(istStadt), kern: istKern(i) }));
  const viertel = art === "stadt" ? viertelBilden(lagenNamen, rollen, mitte, r, stil.namen, stil.vorstadt).filter(v => v.flaeche >= 6 || v.nutzung === "markt" || v.nutzung === "burg").slice(0, 14)
    : art === "dorf" && markt >= 0 ? [{ id: `viertel.${q(marktMitte[0])}_${q(marktMitte[1])}`, nutzung: "markt" as const, name: stil.dorfplatz, flecken: [markt], flaeche: flaeche(zelle(markt)), anker: marktMitte }] : [];
  const labels: CartographyLabelV1[] = viertel.map(v => ({ id: id("name", v.id), text: v.name, points: [[q(v.anker[0] * z), q(v.anker[1] * z)]], size: q(z * (v.nutzung === "markt" || v.nutzung === "burg" ? 1.1 : .8)), style: "gegend" }));
  const plan: SettlementPlan = viertelPlan(viertel, new Map(stadtListe.map(i => [i, zelle(i)])), breite, hoehe);

  const { karte, cartography, knoten, wurzelId } = dokument({ erzeuger: basis.erzeuger, version, keim, ids, z, breite, hoehe, setting: stil.setting, auftrag,
    stamps: werk.stamps, extraRegions, bauwerke, gassen: netz, gassenMaterial: () => art === "stadt" ? "street" : "path", mauern, lichter,
    relief: landschaft.relief, labels, rolle: mitVermerk });
  return Object.freeze({
    art: "siedlung", erzeuger: basis.erzeuger, version, keim, wurzelId, karte, cartography,
    knoten: Object.freeze(knoten), bauwerke: Object.freeze(bauwerke), strassen: Object.freeze(strassen),
    bericht: Object.freeze({
      ...(routed ? { verkehr: { routes: routed.routes, invalidNodes: routed.invalidNodes, reservedRegions: routed.surfaces.map(s => id("verkehr", s.key)),
        ...inspectRoadNetwork(strassen, bauwerke, breite, hoehe, verkehr!, routed.routes) } } : {}),
      ...(planung?.zonen.length ? { planung: { zonen: planung.zonen.map(zone => ({ id: zone.id, name: zone.name, anzahl: [...zonen.values()].filter(x => x.id === zone.id).length })), verworfen: planVerworfen } } : {}),
      bauwerke: bauwerke.length, angefordert: optionen.bauwerke, strassen: strassen.length,
      strassenzellen, hofzellen, stamps: werk.stamps.length, stampsNachArt: Object.freeze({ ...werk.nachArt }),
      paket: Object.freeze({ id: paket.id, version: paket.version, assets: paket.assets.length }),
      nichtBedient: Object.freeze([...werk.nichtBedient].sort()),
      ausgelassen: Object.freeze([...basis.ausgelassen, ...ausgelassen]),
      viertel: Object.freeze(viertel.map(v => ({ id: v.id, nutzung: v.nutzung, name: v.name, flecken: v.flecken.length, flaeche: q(v.flaeche) }))),
      viertelPlan: plan,
    }),
  });
}
