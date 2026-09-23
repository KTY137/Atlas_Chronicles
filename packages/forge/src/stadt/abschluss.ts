// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { AssetpaketV1, BauwerkTyp, CartographyLabelV1, CartographyRegionV1, Herkunft, Kante, KartenSetting, Knoten, TacticalLight, Weltkeim } from "@chronicle/szene";
import { parseTacticalCartography, parseTacticalMapDocument, type TacticalCartographyV1, type TacticalMapDocumentV1 } from "@chronicle/szene";
import type { KnotenId } from "@chronicle/core";
import { bestuecker, sortiereNachId, type GrundrissEltern, type IdFabrik } from "../kartenwerk.ts";
import { clipHalbebene, flaeche, huelle, imPolygon, q, qp, schnittKonvex, schwerpunkt, type Polygon, type Punkt } from "../polygon.ts";
import type { FlussStueck } from "../relief.ts";
import { freieMauer, mitAbstand, type Gasse, type Zufall } from "./gemeinsam.ts";

/**
 * **Wie eine Siedlung fertig wird.** Beide Layoutbausteine enden gleich: Straßen, die an See und
 * Fels abbrechen, Kreuzungsflächen, Wasser mit Brücken, ein Steg am Ufer, Pflaster, Eingangsmarke
 * und Laternen aus dem Paket, und am Ende das kanonische Kartendokument mit seinen Knoten. Was
 * hier Zufall zieht (`ausstattung`), zieht ihn in genau der Reihenfolge, in der v8 es tat.
 */
export interface ExtraRegion { readonly id: string; readonly polygon: Polygon; readonly role: CartographyRegionV1 }
export interface StrasseAusgabe { readonly id: string; readonly art: "hauptstrasse" | "gasse"; readonly umriss: Polygon }
export interface Ablage {
  readonly extraRegions: ExtraRegion[];
  readonly strassen: StrasseAusgabe[];
  readonly rolle: (regionId: string) => { readonly regionId: string; readonly authored: false; readonly locked: false; readonly provenance: Weltkeim | null };
}

/** Eine Straße längs durch den Fluss ist weder Kai noch Brücke. Sie fällt weg, wenn ihre Enden
 *  über andere Straßen verbunden bleiben — vor der Parzellierung, damit keine Adresse verwaist. */
export function ohneLaengsFluss(gassen: Gasse[], fluss: readonly FlussStueck[]): void {
  const endpointKey = (point: Punkt) => `${Math.round(point[0] * 100)}:${Math.round(point[1] * 100)}`;
  for (let index = gassen.length - 1; index >= 0; index--) {
    const candidate = gassen[index]!, dx = candidate.bis[0] - candidate.von[0], dy = candidate.bis[1] - candidate.von[1];
    const alongWater = fluss.some(stueck => {
      if (flaeche(schnittKonvex(candidate.band, stueck.polygon)) < .08) return false;
      const wx = stueck.bis[0] - stueck.von[0], wy = stueck.bis[1] - stueck.von[1];
      return Math.abs(dx * wx + dy * wy) / (Math.hypot(dx, dy) * (Math.hypot(wx, wy) || 1)) > .84;
    });
    if (!alongWater) continue;
    const start = endpointKey(candidate.von), target = endpointKey(candidate.bis), reached = new Set([start]), pending = [start];
    for (let cursor = 0; cursor < pending.length && !reached.has(target); cursor++) {
      for (const [otherIndex, other] of gassen.entries()) {
        if (otherIndex === index) continue;
        const a = endpointKey(other.von), b = endpointKey(other.bis), next = a === pending[cursor] ? b : b === pending[cursor] ? a : null;
        if (next === null || reached.has(next)) continue;
        reached.add(next); pending.push(next);
      }
    }
    if (reached.has(target)) gassen.splice(index, 1);
  }
}

/** Nur Flüsse bekommen Brücken; See, Meer und Fels beenden die Straße samt Fahrbahnbreite. */
export function kappeAnHindernissen(gassen: Gasse[], hindernisse: readonly Polygon[], gassenBreite: number, ids: IdFabrik): void {
  if (!hindernisse.length) return;
  const clearance = hindernisse.map(polygon => mitAbstand(polygon, gassenBreite + .045));
  const trockeneGassen = gassen.flatMap(road => freieMauer(road.von, road.bis, clearance).flatMap(([von, bis], index) => {
    if (Math.hypot(bis[0] - von[0], bis[1] - von[1]) < gassenBreite) return [];
    const dx = bis[0] - von[0], dy = bis[1] - von[1];
    const band = clipHalbebene(clipHalbebene(road.band, -dx, -dy, -dx * von[0] - dy * von[1]), dx, dy, dx * bis[0] + dy * bis[1]).map(qp);
    if (band.length < 3 || flaeche(band) < .02 || hindernisse.some(polygon => flaeche(schnittKonvex(band, polygon)) > 1e-10)) return [];
    return [{ ...road, id: ids.geometrieId("landstrasse", road.id, `${index}`), von, bis, band }];
  }));
  gassen.splice(0, gassen.length, ...trockeneGassen);
}

/** Wo Straßen sich treffen, liegt eine Achteckfläche, damit Kreuzungen nicht als Spalt lesen. */
export function kreuzungen(gassen: readonly Gasse[], rahmen: Polygon, ids: IdFabrik, material: "street" | "path", ablage: Ablage): void {
  const junctions = new Map<string, { point: Punkt; count: number; radius: number; main: boolean }>();
  for (const road of gassen) for (const point of [road.von, road.bis]) {
    const key = `${Math.round(point[0] * 100)}:${Math.round(point[1] * 100)}`, old = junctions.get(key);
    const radius = flaeche(road.band) / Math.hypot(road.bis[0] - road.von[0], road.bis[1] - road.von[1]) / 2;
    junctions.set(key, { point, count: (old?.count ?? 0) + 1, radius: Math.max(old?.radius ?? 0, radius), main: old?.main === true || road.art === "hauptstrasse" });
  }
  for (const [key, junction] of junctions) {
    if (junction.count < 2) continue;
    const directions: Punkt[] = [[1, 0], [.707107, .707107], [0, 1], [-.707107, .707107], [-1, 0], [-.707107, -.707107], [0, -1], [.707107, -.707107]];
    const polygon = schnittKonvex(directions.map(([x, y]) => qp([junction.point[0] + x * junction.radius, junction.point[1] + y * junction.radius])), rahmen);
    const id = ids.geometrieId("kreuzung", key);
    ablage.extraRegions.push({ id, polygon, role: { ...ablage.rolle(id), role: "road", material } });
    ablage.strassen.push({ id, art: junction.main ? "hauptstrasse" : "gasse", umriss: polygon });
  }
}

/** Stehendes Wasser und jeder Flussabschnitt werden Wasser; wo eine Straße den Fluss quert, liegt
 *  darüber eine Brückenfläche — das Wasser darunter bleibt. */
export function wasserUndBruecken(wasser: readonly Polygon[], wasserMaterial: "lake" | "sea", fluss: readonly FlussStueck[], ids: IdFabrik, ablage: Ablage): void {
  const tragendeStrassen = [...ablage.strassen];
  for (const [i, polygon] of wasser.entries()) {
    const id = ids.geometrieId("wasser", `abschnitt.${i}`);
    ablage.extraRegions.push({ id, polygon, role: { ...ablage.rolle(id), role: "water", material: wasserMaterial } });
  }
  for (const [i, stueck] of fluss.entries()) {
    const id = ids.geometrieId("fluss", `abschnitt.${i}`);
    ablage.extraRegions.push({ id, polygon: stueck.polygon, role: { ...ablage.rolle(id), role: "water", material: "river" } });
    const box = huelle(stueck.polygon);
    for (const gasse of tragendeStrassen) {
      const roadBox = huelle(gasse.umriss);
      if (roadBox[2] <= box[0] || roadBox[0] >= box[2] || roadBox[3] <= box[1] || roadBox[1] >= box[3]) continue;
      const bridge = schnittKonvex(gasse.umriss, stueck.polygon); if (bridge.length < 3 || flaeche(bridge) < .00001) continue;
      const bridgeId = ids.geometrieId("brücke", gasse.id, `abschnitt.${i}`);
      ablage.extraRegions.push({ id: bridgeId, polygon: bridge, role: { ...ablage.rolle(bridgeId), role: "road", material: "bridge" } });
      ablage.strassen.push({ id: bridgeId, art: gasse.art, umriss: bridge });
    }
  }
}

/** Der Steg: von der Ortsmitte zum nächsten Uferpunkt, dann geradeaus ins Wasser. Eine Stadt an
 *  der Küste bekommt zwei. */
export function stege(a: { standort: string; art: string; wasser: readonly Polygon[]; fluss: readonly FlussStueck[]; flussBreite: number; mitteOrt: Punkt; haeuser: readonly Polygon[]; breite: number; hoehe: number; rahmen: Polygon; ids: IdFabrik }, ablage: Ablage): void {
  const { standort, art, breite, hoehe } = a;
  if (standort !== "kueste" && standort !== "see" && standort !== "fluss") return;
  const ufer = [...a.wasser, ...(standort === "fluss" ? a.fluss.map(stueck => stueck.polygon) : [])];
  const kandidaten = ufer.flatMap(polygon => polygon.filter(p => p[0] > .5 && p[1] > .5 && p[0] < breite - .5 && p[1] < hoehe - .5).map(p => ({ p, polygon, abstand: Math.hypot(p[0] - a.mitteOrt[0], p[1] - a.mitteOrt[1]) })))
    .sort((first, second) => first.abstand - second.abstand || first.p[0] - second.p[0] || first.p[1] - second.p[1]);
  let gesetzt = 0;
  for (const kandidat of kandidaten) {
    if (gesetzt >= (art === "stadt" && standort !== "fluss" ? 2 : 1)) break;
    const richtung: Punkt = [schwerpunkt(kandidat.polygon)[0] - kandidat.p[0], schwerpunkt(kandidat.polygon)[1] - kandidat.p[1]], norm = Math.hypot(richtung[0], richtung[1]) || 1;
    const dx = richtung[0] / norm, dy = richtung[1] / norm, laenge = standort === "fluss" ? Math.min(1.6, Math.max(.8, a.flussBreite * .55)) : art === "stadt" ? 3.2 : 2.2, halb = .26;
    const start: Punkt = [kandidat.p[0] - dx * .35, kandidat.p[1] - dy * .35], ende: Punkt = [start[0] + dx * (laenge + .35), start[1] + dy * (laenge + .35)];
    const steg = schnittKonvex([qp([start[0] - dy * halb, start[1] + dx * halb]), qp([ende[0] - dy * halb, ende[1] + dx * halb]), qp([ende[0] + dy * halb, ende[1] - dx * halb]), qp([start[0] + dy * halb, start[1] - dx * halb])], a.rahmen);
    if (steg.length < 3 || flaeche(steg) < .1) continue;
    if (flaeche(schnittKonvex(steg, kandidat.polygon)) < flaeche(steg) * .45) continue;
    if (a.haeuser.some(haus => flaeche(schnittKonvex(steg, haus)) > 1e-6)) continue;
    const stegId = a.ids.geometrieId("steg", `${q(kandidat.p[0])}_${q(kandidat.p[1])}`);
    if (ablage.extraRegions.some(region => region.role.role === "road" && region.role.material === "steg" && Math.hypot(schwerpunkt(region.polygon)[0] - kandidat.p[0], schwerpunkt(region.polygon)[1] - kandidat.p[1]) < 4)) continue;
    ablage.extraRegions.push({ id: stegId, polygon: steg, role: { ...ablage.rolle(stegId), role: "road", material: "steg" } });
    ablage.strassen.push({ id: stegId, art: "gasse", umriss: steg });
    gesetzt++;
  }
}

const inEinem = (p: Punkt, polys: readonly Polygon[]): boolean => {
  for (const poly of polys) if (imPolygon(p, poly)) return true;
  return false;
};

/** Pflaster, Eingangsmarke, Stellflächen (nicht Fantasy) und Laternen an Hauptstraßen — aus dem
 *  Paket erfragt, nie beim Namen genannt (`kartenwerk.ts`). */
export function ausstattung(a: {
  paket: AssetpaketV1; r: Zufall; z: number; ids: IdFabrik; setting: KartenSetting; art: string; licht: boolean;
  gassen: readonly Gasse[]; bauwerkPolys: readonly Polygon[]; hofFlaechen: readonly Polygon[]; bauHindernisse: readonly Polygon[];
  breite: number; hoehe: number; mitte: Punkt; bauwerkZahl: number;
}, ablage: Ablage) {
  const { breite, hoehe, z, ids, setting } = a;
  const werk = bestuecker(a.paket, a.r, z, ids.geometrieId, setting);
  const belag = werk.waehle("boden", setting === "gegenwart" ? "asphalt" : setting === "scifi" ? "metall" : a.art === "stadt" ? "stein" : "erde");
  if (belag) {
    const g = a.gassen.find(value => value.art === "hauptstrasse") ?? a.gassen[0]!;
    werk.setze(belag, Math.max(0, Math.min(breite - 1, Math.floor((g.von[0] + g.bis[0]) / 2))), Math.max(0, Math.min(hoehe - 1, Math.floor((g.von[1] + g.bis[1]) / 2))));
  }
  const strassenPolys = ablage.strassen.map((g) => g.umriss);
  let strassenzellen = 0, hofzellen = 0;
  for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) {
    const p: Punkt = [x + 0.5, y + 0.5];
    if (inEinem(p, a.bauwerkPolys)) continue;
    if (inEinem(p, strassenPolys)) strassenzellen++;
    else if (inEinem(p, a.hofFlaechen)) hofzellen++;
  }
  const eingangAsset = werk.waehle("marke", "eingang");
  if (eingangAsset) {
    let torX = Math.floor(a.mitte[0]), torY = Math.floor(a.mitte[1]), weiteste = -1;
    for (const g of a.gassen) {
      if (g.art !== "hauptstrasse") continue;
      for (const p of [g.von, g.bis]) {
        const d = (p[0] - a.mitte[0]) ** 2 + (p[1] - a.mitte[1]) ** 2;
        if (d > weiteste) { weiteste = d; torX = Math.max(0, Math.min(breite - 1, Math.floor(p[0]))); torY = Math.max(0, Math.min(hoehe - 1, Math.floor(p[1]))); }
      }
    }
    werk.setze(eingangAsset, torX, torY);
  }
  const lichter: TacticalLight[] = [];
  if (setting !== "fantasy") {
    const verkehr = werk.waehle("aufbau", "verkehr");
    if (verkehr) {
      const frei: [number, number][] = [];
      const obstacles = [...a.bauwerkPolys, ...a.bauHindernisse].map(polygon => ({ polygon, box: huelle(polygon) }));
      for (let y = 0; y < hoehe; y++) for (let x = 0; x < breite; x++) {
        const point: Punkt = [x + .5, y + .5], cell: Polygon = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
        if ((inEinem(point, strassenPolys) || inEinem(point, a.hofFlaechen)) && !obstacles.some(({ polygon, box }) => box[0] < x + 1 && box[2] > x && box[1] < y + 1 && box[3] > y && flaeche(schnittKonvex(polygon, cell)) > 1e-10)) frei.push([x, y]);
      }
      for (let i = 0; i < Math.min(12, Math.max(1, Math.floor(a.bauwerkZahl / 6))); i++) {
        if (!werk.platziere(verkehr, frei)) continue;
        const stamp = werk.stamps[werk.stamps.length - 1]!, [w, h] = verkehr.einheiten, x = stamp.x / z - w / 2, y = stamp.y / z - h / 2;
        const id = ids.geometrieId("stellfläche", stamp.id), polygon: Polygon = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
        ablage.extraRegions.push({ id, polygon, role: { ...ablage.rolle(id), role: "terrain", material: "rock" } });
      }
    }
  }
  if (a.licht) for (const g of a.gassen) {
    if (g.art !== "hauptstrasse") continue;
    const asset = werk.waehle("licht", setting === "fantasy" ? "warm" : "kalt");
    if (!asset) continue;
    const mx = Math.max(0, Math.min(breite - 1, Math.floor((g.von[0] + g.bis[0]) / 2)));
    const my = Math.max(0, Math.min(hoehe - 1, Math.floor((g.von[1] + g.bis[1]) / 2)));
    werk.setze(asset, mx, my);
    const letzter = werk.stamps[werk.stamps.length - 1]!;
    lichter.push({
      id: ids.geometrieId("licht", `${q(g.von[0])}_${q(g.von[1])}`, `${q(g.bis[0])}_${q(g.bis[1])}`), position: [letzter.x, letzter.y],
      range: z * 4, intensity: 0.8, colorArgb: setting === "fantasy" ? "ffdd8a33" : "ffb9ddff", shadows: true, elevation: 0,
    });
  }
  return { werk, lichter, strassenzellen, hofzellen };
}

export interface BauwerkAusgabe { readonly id: KnotenId; readonly pfad: string; readonly umriss: Polygon; readonly strasse: string; readonly typ: BauwerkTyp; readonly titel: string }
export interface Wand { readonly id: string; readonly kind: "wall"; readonly points: readonly (readonly [number, number])[]; readonly elevation: number }

/** Das kanonische Kartendokument, die Kartografie und die Knoten: die Wurzel `ort` und je Gebäude
 *  ein `bauwerk` mit seinem Kindkeim. */
export function dokument(a: {
  erzeuger: string; version: string; keim: Weltkeim; ids: IdFabrik; z: number; breite: number; hoehe: number; setting: KartenSetting;
  auftrag: { readonly titel?: string; readonly eltern?: GrundrissEltern };
  stamps: Parameters<typeof sortiereNachId>[0]; extraRegions: readonly ExtraRegion[]; bauwerke: readonly BauwerkAusgabe[]; gassen: readonly Gasse[];
  gassenMaterial: (g: Gasse) => "street" | "path"; mauern: readonly Wand[]; lichter: readonly TacticalLight[];
  relief: TacticalCartographyV1["relief"]; labels?: readonly CartographyLabelV1[]; rolle: Ablage["rolle"];
}): { karte: TacticalMapDocumentV1; cartography: TacticalCartographyV1; knoten: Knoten[]; wurzelId: KnotenId } {
  const { z, ids, keim } = a;
  const mitte = (b: BauwerkAusgabe): readonly [number, number] => { const s = schwerpunkt(b.umriss); return [q(s[0] * z), q(s[1] * z)]; };
  const nachPixeln = (poly: Polygon): readonly (readonly [number, number])[] => poly.map((p) => [q(p[0] * z), q(p[1] * z)] as const);
  const karte = parseTacticalMapDocument({
    schemaVersion: 1, kind: "tactical-map", coordinates: "image-pixels",
    frame: { ursprung: [0, 0], einheitenProPixel: 1 / z, ordnung: "xy", hoch: "unten" },
    geometry: {
      v: 3, size: [a.breite * z, a.hoehe * z],
      stamps: sortiereNachId(a.stamps),
      // A building's region id **is** its KnotenId — one thing, one identity (`grundriss.ts`).
      regions: [
        ...a.extraRegions.map(value => ({ id: value.id, punkte: nachPixeln(value.polygon) })),
        ...a.bauwerke.map((b) => ({ id: b.id, punkte: nachPixeln(b.umriss) })),
        ...a.gassen.map((s) => ({ id: s.id, punkte: nachPixeln(s.band) })),
      ],
      places: a.bauwerke.map((b) => ({ id: ids.geometrieId("platz", b.pfad), x: mitte(b)[0], y: mitte(b)[1] })),
    },
    grid: { kind: "square", size: z, origin: [0, 0] },
    elevation: 0, geometryElevation: [],
    walls: sortiereNachId([...a.mauern]), portals: [], lights: sortiereNachId([...a.lichter]),
    environment: { bakedLighting: false, ambientLightArgb: a.setting === "scifi" ? "ffb4c6dd" : a.setting === "gegenwart" ? "ffe0e4e7" : "ffd9cba0" },
    background: null,
  });
  const cartography = parseTacticalCartography({ schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: z, origin: [0, 0] }, relief: a.relief, regions: [
    ...a.extraRegions.map(value => value.role),
    ...a.bauwerke.map(b => ({ ...a.rolle(b.id), role: "building", streetRegionId: b.strasse, lotRegionId: ids.geometrieId("grundstück", b.pfad) })),
    ...a.gassen.map(g => ({ ...a.rolle(g.id), role: "road", material: a.gassenMaterial(g) })),
  ], ...(a.labels?.length ? { labels: a.labels } : {}) }, karte);
  const herkunft = (pfad: readonly string[], kindKeim: string): Herkunft =>
    ({ erzeuger: a.erzeuger, version: a.version, keimHash: keim.keimHash, erzeugungspfad: pfad, kindKeim });
  const wurzelId = ids.knotenId("siedlung");
  const wurzelEltern: readonly Kante[] = a.auftrag.eltern ? [{ von: wurzelId, nach: a.auftrag.eltern.knotenId, art: a.auftrag.eltern.art }] : [];
  const knoten: Knoten[] = [{
    id: wurzelId, art: "ort", titel: a.auftrag.titel ?? null, eltern: wurzelEltern, rahmen: karte.frame,
    anker: a.auftrag.eltern ? { in: a.auftrag.eltern.knotenId, bei: a.auftrag.eltern.bei, massstab: a.auftrag.eltern.massstab } : null,
    herkunft: herkunft(["ort"], ids.kindKeim("ort")), sichtAnker: null,
  }];
  for (const b of a.bauwerke) knoten.push({
    id: b.id, art: "bauwerk", titel: b.titel, bauwerk: { typ: b.typ, beschreibung: "" },
    eltern: [{ von: b.id, nach: wurzelId, art: "liegt_in_geografie" }], rahmen: karte.frame,
    anker: { in: wurzelId, bei: mitte(b), massstab: 1 },
    // The derived child seed, stored: this building is a re-derivable address (RB-21d:677-679).
    herkunft: herkunft(["bauwerk", b.pfad], ids.kindKeim("bauwerk", b.pfad)), sichtAnker: null,
  });
  return { karte, cartography, knoten, wurzelId };
}
