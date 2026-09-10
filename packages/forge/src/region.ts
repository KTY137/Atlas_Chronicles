// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { type CanonicalValue, type KnotenId } from "@chronicle/core";
import { KARTEN_SETTINGS, parseTacticalCartography, parseTacticalMapDocument, weltkeim, type AssetpaketV1, type CartographyRegionV1, type Herkunft, type Kante, type KartenSetting, type Knoten, type TacticalCartographyV1, type TacticalMapDocumentV1, type Weltkeim } from "@chronicle/szene";
import { RELIEF_LEVELS } from "@chronicle/szene";
import { fail, idFabrik, rauschen } from "./kartenwerk.ts";
import { delaunayKanten, flaeche, huelle, imPolygon, q, qp, schnittKonvex, spannbaumMitSchleifen, type Polygon, type Punkt } from "./polygon.ts";
import { erzeugeLandschaft, MEERESSPIEGEL, RELIEF_STANDORTE, type FlussStueck, type ReliefStandort } from "./relief.ts";
import type { SiedlungArt } from "./siedlung.ts";

/**
 * **The scale above the settlement.** `erzeugeSiedlung` answers "what does this town look like";
 * nothing answered "where do the towns stand, and how does one ride from here to there". This
 * generator is that fourth peer: the same relief engine shapes a whole region, settlement sites
 * are read off the land (flat, dry, near water, apart from each other), roads join them along
 * the cheapest ground with bridges over every river, and every settlement is an enterable `ort`
 * whose size and surroundings are stored in its own cartography role — entering it generates
 * the matching town with `erzeugeSiedlung`.
 */
export const REGION_ERZEUGER = "chronicle-region";
export const REGION_VERSION = "1";
export const REGION_LIMITS = Object.freeze({ zellenMin: 16, zellenMax: 192, zellenGesamt: 20_000, zellgroesseMin: 16, zellgroesseMax: 512, kantePixelMax: 32_768, orteMin: 1, orteMax: 24 });
export const REGION_STANDORTE = RELIEF_STANDORTE;

export interface RegionOptionen {
  readonly setting?: KartenSetting;
  /** The character of the whole land; every settlement reads its own surroundings off it. */
  readonly standort?: ReliefStandort;
  readonly relief?: number;
  readonly bewaldung?: number;
  readonly ausdehnung: readonly [number, number];
  readonly zellgroesse: number;
  /** How many settlements the land should carry; fewer when it has no room for them. */
  readonly orte: number;
}
// A coarse cell on purpose: a region is read from far away, and every drawn feature — crown,
// crag, contour, road — scales with the cell, so the sheet stays a painting instead of a haze.
export const REGION_STANDARD: RegionOptionen = Object.freeze({ setting: "fantasy", standort: "huegel", relief: .6, bewaldung: .5, ausdehnung: [56, 42] as const, zellgroesse: 112, orte: 7 });
export interface RegionAuftrag { readonly keim: string; readonly titel?: string; readonly optionen?: Partial<RegionOptionen> }
export interface RegionOrt {
  readonly id: KnotenId;
  readonly titel: string;
  readonly groesse: SiedlungArt;
  readonly standort: ReliefStandort;
  /** In cells. */
  readonly mitte: Punkt;
  readonly umriss: Polygon;
  readonly pfad: string;
}
export interface RegionStrasse { readonly id: string; readonly von: KnotenId; readonly nach: KnotenId; readonly umriss: Polygon; readonly material: "path" | "street" }
export interface RegionBericht {
  readonly orte: number; readonly angefordert: number; readonly strassen: number; readonly bruecken: number;
  /** Every settlement reachable from every other by road. */
  readonly verbunden: boolean;
  readonly paket: { readonly id: string; readonly version: string; readonly assets: number };
}
export interface Region {
  readonly art: "region";
  readonly erzeuger: string;
  readonly version: string;
  readonly keim: Weltkeim;
  readonly wurzelId: KnotenId;
  readonly karte: TacticalMapDocumentV1;
  readonly cartography: TacticalCartographyV1;
  readonly knoten: readonly Knoten[];
  readonly orte: readonly RegionOrt[];
  readonly strassen: readonly RegionStrasse[];
  readonly bericht: RegionBericht;
}

const VORN = ["Alten", "Silber", "Wolfs", "Hoch", "Nieder", "Wester", "Oster", "Grün", "Stein", "Falken", "Rot", "Königs", "Eichen", "Rabens", "Weiß", "Neu", "Kalt", "Sonnen", "Nebel", "Bären"] as const;
const HINTEN = ["bach", "furt", "berg", "hain", "brück", "heim", "burg", "feld", "au", "tal", "stein", "hafen", "moor", "wald", "hof", "kirchen"] as const;

/** Whether `sea` and `land` thresholds place a height at water, on the plain, on hills or on rock. */
const lage = (h: number) => h < MEERESSPIEGEL ? "wasser" : h < MEERESSPIEGEL + RELIEF_LEVELS.flatLand ? "flach" : h < MEERESSPIEGEL + RELIEF_LEVELS.rockAbove ? "huegel" : "fels";

export function erzeugeRegion(auftrag: RegionAuftrag, paket: AssetpaketV1): Region {
  if (typeof auftrag?.keim !== "string" || !auftrag.keim.trim() || auftrag.keim.length > 256) fail("option", "auftrag.keim", "nichtleerer Keim mit höchstens 256 Zeichen erwartet");
  const setting = auftrag.optionen?.setting === undefined ? "fantasy" : auftrag.optionen.setting;
  if (!KARTEN_SETTINGS.some(era => era === setting)) fail("option", "optionen.setting", "fantasy, gegenwart oder scifi erwartet");
  const standort = auftrag.optionen?.standort === undefined ? REGION_STANDARD.standort! : auftrag.optionen.standort;
  if (!REGION_STANDORTE.some(value => value === standort)) fail("option", "optionen.standort", `${REGION_STANDORTE.join(", ")} erwartet`);
  const optionen: RegionOptionen = { ...REGION_STANDARD, ...auftrag.optionen, setting, standort };
  const relief = optionen.relief ?? .6, bewaldung = optionen.bewaldung ?? .5;
  for (const [name, value] of [["relief", relief], ["bewaldung", bewaldung]] as const) if (typeof value !== "number" || !(value >= 0 && value <= 1)) fail("option", `optionen.${name}`, "Zahl in 0..1 erwartet");
  const [breite, hoehe] = optionen.ausdehnung, L = REGION_LIMITS;
  const ganzIn = (wert: number, min: number, max: number, pfad: string): number => Number.isSafeInteger(wert) && wert >= min && wert <= max ? wert : fail("option", pfad, `Ganzzahl in ${min}..${max} erwartet`);
  ganzIn(breite, L.zellenMin, L.zellenMax, "optionen.ausdehnung[0]"); ganzIn(hoehe, L.zellenMin, L.zellenMax, "optionen.ausdehnung[1]");
  ganzIn(optionen.zellgroesse, L.zellgroesseMin, L.zellgroesseMax, "optionen.zellgroesse"); ganzIn(optionen.orte, L.orteMin, L.orteMax, "optionen.orte");
  if (breite * hoehe > L.zellenGesamt) fail("budget", "optionen.ausdehnung", `höchstens ${L.zellenGesamt} Zellen`);
  if (breite * optionen.zellgroesse > L.kantePixelMax || hoehe * optionen.zellgroesse > L.kantePixelMax) fail("budget", "optionen.zellgroesse", `höchstens ${L.kantePixelMax} Pixel Kantenlänge`);
  if (!paket?.assets?.length) fail("paket", "paket", "Assetpaket mit mindestens einem Asset erwartet");

  const keim = weltkeim({ generator: REGION_ERZEUGER, version: REGION_VERSION, seed: auftrag.keim,
    optionen: { ausdehnung: [breite, hoehe], zellgroesse: optionen.zellgroesse, orte: optionen.orte, setting, standort, relief, bewaldung,
      paket: { id: paket.id, version: paket.version, zellgroesse: paket.zellgroesse } } as Readonly<Record<string, CanonicalValue>> });
  const r = rauschen(keim.keimHash), z = optionen.zellgroesse, ids = idFabrik(REGION_ERZEUGER, REGION_VERSION, keim.keimHash);
  const rahmen: Polygon = [[0, 0], [breite, 0], [breite, hoehe], [0, hoehe]];

  // -- 1. The land -------------------------------------------------------------------------------
  // A river region gets one great river drawn through the whole sheet; every other kind leaves
  // the water to the hydrology. No town core is flattened: the sites are read off the land after.
  const quer = r.ganz(0, 1) === 1, laenge = quer ? breite : hoehe, querMass = quer ? hoehe : breite;
  const kontrollen = [r.zahl(.2, .35), r.zahl(.1, .3), r.zahl(.7, .9), r.zahl(.6, .8)].map(value => value * querMass);
  const flussPunkte: Punkt[] = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24, u = 1 - t, at = u ** 3 * kontrollen[0]! + 3 * u * u * t * kontrollen[1]! + 3 * u * t * t * kontrollen[2]! + t ** 3 * kontrollen[3]!;
    return quer ? [q(laenge * t), q(at)] : [q(at), q(laenge * t)];
  });
  const flussBreite = Math.max(.6, Math.min(2.4, Math.min(breite, hoehe) * .03));
  const landschaft = erzeugeLandschaft({ breite, hoehe, standort, keimHash: keim.keimHash, relief, bewaldung, kern: { x: breite / 2, y: hoehe / 2, rx: .5, ry: .5 },
    ...(standort === "fluss" ? { flussAchse: flussPunkte, flussBreite } : {}) });
  const grosserFluss: FlussStueck[] = standort === "fluss" ? flussPunkte.slice(1).flatMap((b, i): FlussStueck[] => {
    const a = flussPunkte[i]!, dx = b[0] - a[0], dy = b[1] - a[1], size = Math.hypot(dx, dy) || 1, half = flussBreite / 2 * (.8 + .5 * i / 24);
    const polygon = schnittKonvex([qp([a[0] - dy / size * half, a[1] + dx / size * half]), qp([a[0] + dy / size * half, a[1] - dx / size * half]), qp([b[0] + dy / size * half, b[1] - dx / size * half]), qp([b[0] - dy / size * half, b[1] + dx / size * half])], rahmen);
    return polygon.length >= 3 ? [{ polygon, von: a, bis: b }] : [];
  }) : [];
  const fluesse = [...grosserFluss, ...landschaft.fluesse];
  const wasserBoxen = [...landschaft.wasser, ...fluesse.map(stueck => stueck.polygon)].map(polygon => ({ polygon, box: huelle(polygon) }));
  const inWasser = (p: Punkt) => wasserBoxen.some(({ polygon, box }) => p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3] && imPolygon(p, polygon));
  const inEinem = (p: Punkt, polygone: readonly Polygon[]) => polygone.some(polygon => imPolygon(p, polygon));
  const nahWasser = (p: Punkt, reichweite: number) => wasserBoxen.some(({ polygon, box }) => p[0] >= box[0] - reichweite && p[0] <= box[2] + reichweite && p[1] >= box[1] - reichweite && p[1] <= box[3] + reichweite && polygon.some(v => Math.hypot(v[0] - p[0], v[1] - p[1]) <= reichweite));

  // -- 2. Where people would settle ----------------------------------------------------------------
  // Every second cell is scored: flat and dry, not in water, rock or marsh, with water nearby
  // worth a lot and a little noise so two equal plains do not settle in the same corner. Sites
  // are taken best-first, each keeping the others at a distance that shrinks only if the land
  // is too poor to carry the requested number.
  const hoeheBei = (x: number, y: number) => landschaft.hoehe(Math.max(0, Math.min(breite, x)), Math.max(0, Math.min(hoehe, y)));
  const gefaelle = (x: number, y: number) => Math.max(Math.abs(hoeheBei(x + 2, y) - hoeheBei(x - 2, y)), Math.abs(hoeheBei(x, y + 2) - hoeheBei(x, y - 2)));
  const rand = Math.max(2, Math.min(breite, hoehe) * .06);
  const kandidaten: { p: Punkt; wert: number }[] = [];
  for (let y = Math.ceil(rand); y <= hoehe - rand; y++) for (let x = Math.ceil(rand); x <= breite - rand; x++) {
    const p: Punkt = [x, y], h = hoeheBei(x, y), art = lage(h);
    if (art === "wasser" || art === "fels" || inWasser(p) || inEinem(p, landschaft.sumpf)) continue;
    const neigung = gefaelle(x, y);
    if (neigung > 30) continue;
    const wasserNaehe = nahWasser(p, 2) ? 1 : nahWasser(p, 4.5) ? .55 : 0;
    const wert = 1 - neigung / 30 + wasserNaehe * .5 + (art === "flach" ? .12 : 0) - (inEinem(p, landschaft.fels) ? 1 : 0) + r.zahl(0, .18);
    kandidaten.push({ p, wert });
  }
  kandidaten.sort((a, b) => b.wert - a.wert || a.p[1] - b.p[1] || a.p[0] - b.p[0]);
  let abstand = Math.max(5.5, Math.min(breite, hoehe) / (Math.sqrt(optionen.orte) + 1.2));
  let plaetze: Punkt[] = [];
  for (let versuch = 0; versuch < 3 && plaetze.length < optionen.orte; versuch++) {
    plaetze = [];
    for (const { p } of kandidaten) { if (plaetze.length >= optionen.orte) break; if (plaetze.every(other => Math.hypot(other[0] - p[0], other[1] - p[1]) >= abstand)) plaetze.push(p); }
    abstand *= .72;
  }
  if (!plaetze.length) fail("budget", "optionen.orte", "das Land bietet keinen Platz für einen Ort");
  // The best site is the town, roughly two in five are villages, the rest hamlets.
  const groesseFuer = (rang: number): SiedlungArt => rang === 0 && plaetze.length >= 4 ? "stadt" : rang < Math.max(1, Math.round(plaetze.length * .4)) ? "dorf" : "weiler";
  const standortFuer = (p: Punkt): ReliefStandort => {
    const h = hoeheBei(p[0], p[1]);
    if ((standort === "kueste" || standort === "insel") && landschaft.wasserMaterial === "sea" && landschaft.wasser.some(polygon => polygon.some(v => Math.hypot(v[0] - p[0], v[1] - p[1]) <= 4))) return "kueste";
    if (landschaft.wasserMaterial === "lake" && landschaft.wasser.some(polygon => polygon.some(v => Math.hypot(v[0] - p[0], v[1] - p[1]) <= 4))) return "see";
    if (landschaft.sumpf.some(polygon => polygon.some(v => Math.hypot(v[0] - p[0], v[1] - p[1]) <= 3))) return "moor";
    if (fluesse.some(stueck => stueck.polygon.some(v => Math.hypot(v[0] - p[0], v[1] - p[1]) <= 2.5))) return "fluss";
    if (h > MEERESSPIEGEL + RELIEF_LEVELS.flatLand + 40 || gefaelle(p[0], p[1]) > 20) return "gebirge";
    if (landschaft.feuchte(p[0], p[1]) >= landschaft.waldSchwelle) return "wald";
    return lage(h) === "huegel" ? "huegel" : "ebene";
  };
  const genannt = new Set<string>();
  const name = (): string => {
    for (let versuch = 0; versuch < 40; versuch++) {
      const wahl = `${VORN[r.ganz(0, VORN.length - 1)]}${HINTEN[r.ganz(0, HINTEN.length - 1)]}`;
      if (!genannt.has(wahl)) { genannt.add(wahl); return wahl; }
    }
    return `Ort ${genannt.size + 1}`;
  };
  const orte: RegionOrt[] = plaetze.map((mitte, rang) => {
    const groesse = groesseFuer(rang), pfad = `${q(mitte[0])}_${q(mitte[1])}`, radius = groesse === "stadt" ? 2.6 : groesse === "dorf" ? 1.6 : 1.05;
    const umriss = schnittKonvex(Array.from({ length: 12 }, (_, k) => { const a = k / 12 * Math.PI * 2, rr = radius * r.zahl(.86, 1.12); return qp([mitte[0] + Math.cos(a) * rr, mitte[1] + Math.sin(a) * rr * .82]); }), rahmen);
    return { id: ids.knotenId("ort", pfad), titel: name(), groesse, standort: standortFuer(mitte), mitte, umriss, pfad };
  });

  // -- 3. Roads: the cheapest way over the land, bridges over rivers -------------------------------
  // The settlements' Delaunay neighbours, thinned to a spanning tree plus a few loops, each
  // link walked with A* over the cell grid: slopes cost, rock and marsh cost more, still water
  // is impassable, a river costs a bridge. The town's links are paved, the rest are tracks.
  const felsBoxen = landschaft.fels.map(polygon => ({ polygon, box: huelle(polygon) })), sumpfBoxen = landschaft.sumpf.map(polygon => ({ polygon, box: huelle(polygon) }));
  const drin = (p: Punkt, liste: { polygon: Polygon; box: readonly [number, number, number, number] }[]) => liste.some(({ polygon, box }) => p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3] && imPolygon(p, polygon));
  const stehendBoxen = landschaft.wasser.map(polygon => ({ polygon, box: huelle(polygon) })), flussBoxen = fluesse.map(stueck => ({ polygon: stueck.polygon, box: huelle(stueck.polygon) }));
  const kosten = new Float64Array((breite + 1) * (hoehe + 1));
  for (let y = 0; y <= hoehe; y++) for (let x = 0; x <= breite; x++) {
    const p: Punkt = [x, y], h = hoeheBei(x, y);
    let wert = 1 + gefaelle(x, y) * .12 + (landschaft.feuchte(x, y) >= landschaft.waldSchwelle ? .5 : 0);
    if (lage(h) === "fels" || drin(p, felsBoxen)) wert += 30;
    if (drin(p, sumpfBoxen)) wert += 4;
    if (drin(p, flussBoxen)) wert += 5;
    if (drin(p, stehendBoxen) || (lage(h) === "wasser" && !drin(p, flussBoxen))) wert += 400;
    kosten[y * (breite + 1) + x] = wert;
  }
  const weg = (von: Punkt, nach: Punkt): Punkt[] => {
    const start = [Math.round(von[0]), Math.round(von[1])] as const, ziel = [Math.round(nach[0]), Math.round(nach[1])] as const, spalten = breite + 1;
    const index = (x: number, y: number) => y * spalten + x, offen = new Map<number, number>(), g = new Map<number, number>(), her = new Map<number, number>();
    const h = (x: number, y: number) => Math.hypot(x - ziel[0], y - ziel[1]);
    g.set(index(start[0], start[1]), 0); offen.set(index(start[0], start[1]), h(start[0], start[1]));
    const zielIndex = index(ziel[0], ziel[1]);
    while (offen.size) {
      let aktuell = -1, best = Infinity;
      for (const [k, f] of offen) if (f < best || f === best && k < aktuell) { best = f; aktuell = k; }
      offen.delete(aktuell);
      if (aktuell === zielIndex) break;
      const x = aktuell % spalten, y = Math.floor(aktuell / spalten), basis = g.get(aktuell)!;
      for (const [dx, dy, laengeSchritt] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, -1, Math.SQRT2]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx > breite || ny > hoehe) continue;
        const k = index(nx, ny), wert = basis + laengeSchritt * (kosten[k]! + kosten[aktuell]!) / 2;
        if (wert < (g.get(k) ?? Infinity)) { g.set(k, wert); her.set(k, aktuell); offen.set(k, wert + h(nx, ny)); }
      }
    }
    if (!her.has(zielIndex) && zielIndex !== index(start[0], start[1])) return [];
    const punkte: Punkt[] = []; let k: number | undefined = zielIndex;
    while (k !== undefined) { punkte.unshift([k % spalten, Math.floor(k / spalten)]); k = her.get(k); }
    // Corners are softened twice, then thinned so a road is a few smooth reaches, not a staircase.
    let glatt = punkte;
    for (let runde = 0; runde < 2; runde++) glatt = glatt.length < 3 ? glatt : [glatt[0]!, ...glatt.slice(1, -1).flatMap((p, i) => { const a = glatt[i]!, b = glatt[i + 2]!; return [[p[0] * .75 + a[0] * .25, p[1] * .75 + a[1] * .25], [p[0] * .75 + b[0] * .25, p[1] * .75 + b[1] * .25]] as Punkt[]; }), glatt.at(-1)!];
    const ausgeduennt: Punkt[] = [glatt[0]!];
    for (const p of glatt.slice(1)) { const last = ausgeduennt.at(-1)!; if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 1.2) ausgeduennt.push(p); }
    if (ausgeduennt.at(-1) !== glatt.at(-1)) ausgeduennt.push(glatt.at(-1)!);
    return ausgeduennt.map(qp);
  };
  const kanten = orte.length > 1 ? spannbaumMitSchleifen(delaunayKanten(orte.map(ort => ort.mitte), rahmen), kante => {
    const a = orte[kante.a]!.mitte, b = orte[kante.b]!.mitte; return Math.hypot(a[0] - b[0], a[1] - b[1]);
  }, orte.length, Math.max(0, Math.floor(orte.length / 4))) : [];
  const strassen: RegionStrasse[] = [], bruecken: { id: string; polygon: Polygon }[] = [];
  const verbindungen = new Map<number, Set<number>>();
  for (const kante of kanten) {
    const von = orte[kante.a]!, nach = orte[kante.b]!, punkte = weg(von.mitte, nach.mitte);
    if (punkte.length < 2) continue;
    (verbindungen.get(kante.a) ?? verbindungen.set(kante.a, new Set()).get(kante.a)!).add(kante.b);
    (verbindungen.get(kante.b) ?? verbindungen.set(kante.b, new Set()).get(kante.b)!).add(kante.a);
    const material = von.groesse !== "weiler" && nach.groesse !== "weiler" ? "street" : "path", halb = material === "street" ? .17 : .12;
    for (let i = 1; i < punkte.length; i++) {
      const a = punkte[i - 1]!, b = punkte[i]!, dx = b[0] - a[0], dy = b[1] - a[1], size = Math.hypot(dx, dy) || 1, nx = -dy / size * halb, ny = dx / size * halb, ex = dx / size * halb * .6, ey = dy / size * halb * .6;
      const umriss = schnittKonvex([qp([a[0] + nx - ex, a[1] + ny - ey]), qp([b[0] + nx + ex, b[1] + ny + ey]), qp([b[0] - nx + ex, b[1] - ny + ey]), qp([a[0] - nx - ex, a[1] - ny - ey])], rahmen);
      if (umriss.length < 3 || flaeche(umriss) < 1e-6) continue;
      const id = ids.geometrieId("straße", von.pfad, nach.pfad, `abschnitt.${i}`);
      strassen.push({ id, von: von.id, nach: nach.id, umriss, material });
      for (const [k, stueck] of fluesse.entries()) {
        const box = huelle(stueck.polygon), roadBox = huelle(umriss);
        if (roadBox[2] <= box[0] || roadBox[0] >= box[2] || roadBox[3] <= box[1] || roadBox[1] >= box[3]) continue;
        const bridge = schnittKonvex(umriss, stueck.polygon);
        if (bridge.length >= 3 && flaeche(bridge) > 1e-6) bruecken.push({ id: ids.geometrieId("brücke", id, `fluss.${k}`), polygon: bridge });
      }
    }
  }
  const erreicht = new Set<number>([0]), stapel = [0];
  while (stapel.length) { const k = stapel.pop()!; for (const other of verbindungen.get(k) ?? []) if (!erreicht.has(other)) { erreicht.add(other); stapel.push(other); } }

  // -- 4. Regions, document, cartography, nodes ------------------------------------------------------
  const generatedRole = (regionId: string) => ({ regionId, authored: false, locked: false, provenance: keim });
  const regions: { id: string; polygon: Polygon; role: CartographyRegionV1 }[] = [];
  const groundId = ids.geometrieId("gelände", "grund");
  regions.push({ id: groundId, polygon: rahmen, role: { ...generatedRole(groundId), role: "terrain", material: "grass" } });
  const landscape = (liste: readonly Polygon[], name: string, role: (id: string) => CartographyRegionV1) => { for (const [index, polygon] of liste.entries()) { if (polygon.length < 3) continue; const id = ids.geometrieId(name, `${index}`); regions.push({ id, polygon, role: role(id) }); } };
  landscape(landschaft.strand, "strand", id => ({ ...generatedRole(id), role: "terrain", material: "sand" }));
  landscape(landschaft.sumpf, "sumpf", id => ({ ...generatedRole(id), role: "terrain", material: "swamp" }));
  landscape(landschaft.wald, "wald", id => ({ ...generatedRole(id), role: "terrain", material: "forest" }));
  landscape(landschaft.fels, "fels", id => ({ ...generatedRole(id), role: "terrain", material: "rock" }));
  landscape(landschaft.wasser, "wasser", id => ({ ...generatedRole(id), role: "water", material: landschaft.wasserMaterial }));
  landscape(fluesse.map(stueck => stueck.polygon), "fluss", id => ({ ...generatedRole(id), role: "water", material: "river" }));
  for (const strasse of strassen) regions.push({ id: strasse.id, polygon: strasse.umriss, role: { ...generatedRole(strasse.id), role: "road", material: strasse.material } });
  for (const bridge of bruecken) regions.push({ id: bridge.id, polygon: bridge.polygon, role: { ...generatedRole(bridge.id), role: "road", material: "bridge" } });
  for (const ort of orte) regions.push({ id: ort.id, polygon: ort.umriss, role: { ...generatedRole(ort.id), role: "ort", groesse: ort.groesse, standort: ort.standort } });
  if (regions.length > 4096) fail("budget", "optionen.ausdehnung", "die Landschaft zerfällt in zu viele Flächen; wähle weniger Relief oder Wald");

  const nachPixeln = (poly: Polygon): readonly (readonly [number, number])[] => poly.map(p => [q(p[0] * z), q(p[1] * z)] as const);
  const karte = parseTacticalMapDocument({
    schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
    frame: { ursprung: [0, 0], einheitenProPixel: 1 / z, ordnung: "xy", hoch: "unten" },
    geometry: { v: 3, size: [breite * z, hoehe * z], stamps: [], regions: regions.map(value => ({ id: value.id, punkte: nachPixeln(value.polygon) })), places: [] },
    grid: { kind: "square", size: z, origin: [0, 0] }, elevation: 0, geometryElevation: [], walls: [], portals: [], lights: [],
    environment: { bakedLighting: false, ambientLightArgb: setting === "scifi" ? "ffb4c6dd" : setting === "gegenwart" ? "ffe0e4e7" : "ffd9cba0" }, background: null,
  });
  // The places carry their names as nodes, which the picture letters at their markers; free
  // names on the sheet are the game master's to add, so the same name never appears twice.
  const cartography = parseTacticalCartography({ schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: z, origin: [0, 0] }, relief: landschaft.relief,
    regions: regions.map(value => value.role) }, karte);

  const herkunft = (pfad: readonly string[], kindKeim: string): Herkunft => ({ erzeuger: REGION_ERZEUGER, version: REGION_VERSION, keimHash: keim.keimHash, erzeugungspfad: pfad, kindKeim });
  const wurzelId = ids.knotenId("region");
  const knoten: Knoten[] = [{ id: wurzelId, art: "region", titel: auftrag.titel ?? null, eltern: [] as readonly Kante[], rahmen: karte.frame, anker: null, herkunft: herkunft(["region"], ids.kindKeim("region")), sichtAnker: null }];
  for (const ort of orte) knoten.push({ id: ort.id, art: "ort", titel: ort.titel, eltern: [{ von: ort.id, nach: wurzelId, art: "liegt_in_geografie" }], rahmen: karte.frame,
    anker: { in: wurzelId, bei: [q(ort.mitte[0] * z), q(ort.mitte[1] * z)], massstab: 1 }, herkunft: herkunft(["ort", ort.pfad, ort.groesse, ort.standort], ids.kindKeim("ort", ort.pfad)), sichtAnker: null });

  return Object.freeze({
    art: "region", erzeuger: REGION_ERZEUGER, version: REGION_VERSION, keim, wurzelId, karte, cartography,
    knoten: Object.freeze(knoten), orte: Object.freeze(orte), strassen: Object.freeze(strassen),
    bericht: { orte: orte.length, angefordert: optionen.orte, strassen: strassen.length, bruecken: bruecken.length, verbunden: erreicht.size === orte.length, paket: { id: paket.id, version: paket.version, assets: paket.assets.length } },
  });
}
