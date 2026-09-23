# Stadtgenerator mit Vierteln — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fantasy-Siedlungen (Weiler, Dorf, Stadt) aus einem neuen Layoutbaustein „Viertel" erzeugen: Spiralflecken mit Rollen, Mauer mit Türmen und Toren, Hauptstraßen per Wegsuche, Gassen und Häuserzeilen durch Halbieren, Sonderbauten, Flur in Streifen, Viertelnamen — Version `"11"`, Gegenwart/Sci-Fi byte-gleich.

**Architecture:** `erzeugeSiedlung` prüft Optionen, bildet Keim und Landschaft wie bisher und verzweigt für `setting === "fantasy"` in `stadt/viertel/index.ts`. Der neue Baustein besteht aus kleinen, rein funktionalen Modulen (Flecken, Kantengraph, Rollen, Mauer, Wege, Parzellen, Burg, Flur, Namen). Reine Hilfen, die beide Pfade brauchen (Hausform, Brücken, Kreuzungen, Stege, Dokumentbau), wandern aus `siedlung.ts` nach `stadt/gemeinsam.ts`; ein Goldhash-Test beweist, dass v8 dabei byte-gleich bleibt.

**Tech Stack:** TypeScript 7 (tsgo), Vitest 3, npm workspaces (`@chronicle/forge`, `@chronicle/szene`, `@chronicle/server`, `@chronicle/client`), React-Client, PixiJS-Renderer, sharp für Probebilder.

**Spec:** `docs/superpowers/specs/2026-09-23-stadtgenerator-viertel-design.md`

## Global Constraints

- Keine neue npm-Abhängigkeit in Teil 1 (E1). Kein Code von Watabou (GPL).
- Keine Winkelfunktionen in `forge` (`Math.sin/cos/atan2/pow` nicht neu einführen); Richtungen sind Vektoren, Konstanten als Zahlliterale (`polygon.ts`, Regel 2).
- Alle Koordinaten in Zellen, auf Tausendstel quantisiert (`q`, `qp`), bevor sie in Dokument oder Ids gehen.
- Reihenfolgen stabil über Geometrie oder Spiralnummer, Ids nur aus Pfaden aus Koordinaten (Invariante I8).
- Fantasy erzeugt Version `"11"`; Gegenwart/Sci-Fi behalten `"8"`/`"9"`/`"10"` und byte-gleiche Ausgabe (E2).
- `SETTLEMENT_USES` += `"burg"`, `"tempel"`; `BAUWERK_TYPEN` += `"burg"`, `"rathaus"`, `"muehle"`, `"bauernhof"`, `"kaserne"` — additiv (E4, E5).
- Neue Optionen `mauer`, `burg` (boolean) an drei Stellen: `validateKartenOptionen`, TypeBox in `server/src/http/grundriss.ts`, Client (E7). Nur bei Fantasy im Keim.
- `SIEDLUNG_LIMITS.bauwerkeMax` 512, Stadt-Vorgabe 320 Gebäude, Vorlage „Großstadt" 480 (E8).
- Oberflächentexte ohne Fachjargon, jeder neue Text auch in `packages/client/src/i18n/en/*.json` (GUI-Klartext-Regel).
- Nie die volle Vitest-Suite; gezielte Suiten + Konsumenten der geänderten Exporte (`grep -rln`).
- Vor jedem Commit `npm run typecheck` und bei Client-Änderungen `npm run build` (Client-Build prüft strenger).
- Bilder rendern und ansehen, bevor eine Optikaufgabe als fertig gilt.

## Review Focus

1. **Winzige Karten und Budgets** (24×18 Zellen, 3 Gebäude, Zellgröße 128, Art Stadt): muss mindestens ein Gebäude an einer Straße liefern, keine Mauer erzwingen, nie werfen. → Test in Task 10 (`faelle` aus `siedlung.test.ts` laufen gegen v11).
2. **Standort See/Küste/Insel mit großem Wasseranteil**: Markt, Tore und Hauptstraßen dürfen nicht im Wasser liegen; Tore nur an trockenen Mauerecken. → Test in Task 7 (`waehleTore` mit Sperrfunktion) und Task 10 (Invarianten über alle Standorte).
3. **Zonenplan, der Markt oder Burg an einen unmöglichen Ort legt** (Zone über Wasser, Zone außerhalb der Stadt): Rolle wird nur auf Stadtflecken angewandt, Burg ohne Mauerfleck entfällt mit Berichtszeile, kein Absturz. → Test in Task 6.
4. **Überlappende nichtkonvexe Dächer** (L/U-Hofhaus, Kreuzdom, runde Türme neben Häusern): die SAT-Prüfung der Tests muss Trennung finden. → Jede Form läuft im Erzeuger durch `getrennteDaecher`; Test in Task 10 („überlappt keine zwei Bauwerke" über v11).
5. **Gegenwart/Sci-Fi unverändert**: Refactoring in Task 3 darf keine Byte ändern. → Goldhash-Test in Task 3, bleibt bis zum Ende grün.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `packages/forge/src/polygon.ts` (ändern) | + `einwaertsKanten`, `sehne`, `halbiere` |
| `packages/forge/src/stadt/gemeinsam.ts` (neu) | reine Hilfen aus `siedlung.ts`: `ohne`, `mitAbstand`, `getrennteDaecher`, `freieMauer`, `hausImLos` (+ U-Form), `brueckenUndKreuzungen`, `stege`, Typen `Gasse`, `RohBauwerk` |
| `packages/forge/src/stadt/viertel/flecken.ts` (neu) | Spiralpunkte, Flecken mit Lloyd nur innen |
| `packages/forge/src/stadt/viertel/graph.ts` (neu) | Kantengraph mit Eckenfang, Dijkstra mit Binärheap |
| `packages/forge/src/stadt/viertel/rollen.ts` (neu) | Markt wählen, Rollen zuweisen, Zonenplan gewinnt |
| `packages/forge/src/stadt/viertel/mauer.ts` (neu) | Mauerring, Tore, versetzte Mauerlinien, Turmpunkte, Zwölfeck |
| `packages/forge/src/stadt/viertel/wege.ts` (neu) | Hauptstraßen Tor→Markt, Ausfallstraßen, Straßenbänder je Kante |
| `packages/forge/src/stadt/viertel/parzellen.ts` (neu) | Blöcke mit Gassen, Lose mit Front, Hausformen je Rolle, Markt/Dom |
| `packages/forge/src/stadt/viertel/burg.ts` (neu) | Burg: Innenmauer, Ecktürme, Bergfried, Kaserne, Burghof |
| `packages/forge/src/stadt/viertel/flur.ts` (neu) | Feldstreifen, Wald aus Feuchte, Bauernhöfe |
| `packages/forge/src/stadt/viertel/namen.ts` (neu) | Viertelkomponenten, Namen, Beschriftungen, `viertelPlan` |
| `packages/forge/src/stadt/viertel/index.ts` (neu) | `erzeugeViertelStadt(grund)` — setzt alles zusammen |
| `packages/forge/src/siedlung.ts` (ändern) | Grundlage herauslösen, Dispatch auf Fantasy v11, Optionen `mauer`/`burg`, Grenzen |
| `packages/szene/src/settlement-plan.ts`, `model.ts` (ändern) | neue Nutzungen und Gebäudetypen |
| `packages/forge/src/bauprogramme.ts`, `grundriss.ts`, `siedlung-plan.ts` (ändern) | Innenräume und Zonen-Typen der neuen Typen |
| `packages/server/src/domain/grundriss.ts`, `http/grundriss.ts` (ändern) | Optionen `mauer`, `burg` |
| `packages/client/src/features/map-generation.ts`, `MapGenerationControls.tsx`, `MapZonePlanner.tsx`, `TacticalGenerate.tsx`, `i18n/en/*.json` (ändern) | Schalter, neue Nutzungen, „Viertel übernehmen" |
| `packages/szene/src/cartography-projection.ts` (ändern) | `cartography-12`: Rundtürme, Marktstände, Pflaster |
| Tests: `packages/forge/test/polygon.test.ts`, neu `packages/forge/test/viertel-*.test.ts`, `siedlung-gold.test.ts` | |

---

### Task 1: Polygonhilfen für Gassen und Blöcke

**Files:**
- Modify: `packages/forge/src/polygon.ts` (nach `einwaerts`, ca. Zeile 160)
- Test: `packages/forge/test/polygon.test.ts`

**Interfaces:**
- Produces: `einwaertsKanten(poly: Polygon, abstaende: readonly number[]): Polygon` — Kante `i` ist `poly[i-1] → poly[i]` (wie die Schleife in `einwaerts`); `sehne(poly, nx, ny, c): readonly [Punkt, Punkt] | null`; `halbiere(poly, lage, kippung, luecke): Halbierung | null` mit `interface Halbierung { a: Polygon; b: Polygon; luecke: Polygon; von: Punkt; bis: Punkt }`.

- [ ] **Step 1: Failing tests**

```ts
// in polygon.test.ts, neuer describe-Block
import { einwaertsKanten, sehne, halbiere, einwaerts, flaeche } from "../src/polygon.ts";
describe("Gassen und Blöcke", () => {
  const q4 = [[0, 0], [4, 0], [4, 2], [0, 2]] as const;
  it("einwaertsKanten mit gleichem Abstand entspricht einwaerts", () => {
    expect(einwaertsKanten(q4, [.5, .5, .5, .5])).toEqual(einwaerts(q4, .5));
  });
  it("einwaertsKanten versetzt nur die genannte Kante", () => {
    // Kante 1 ist [0,0]→[4,0] (unten). Nur sie rückt um 1 nach innen.
    const r = einwaertsKanten(q4, [0, 1, 0, 0]);
    expect(flaeche(r)).toBeCloseTo(4, 6);
    expect(Math.min(...r.map(p => p[1]))).toBeCloseTo(1, 6);
  });
  it("sehne liefert Ein- und Austritt einer Geraden", () => {
    const s = sehne(q4, 1, 0, 1)!;
    expect(s.map(p => p[0])).toEqual([1, 1]);
    expect(s.map(p => p[1]).sort()).toEqual([0, 2]);
    expect(sehne(q4, 1, 0, 9)).toBeNull();
  });
  it("halbiere schneidet quer zur längsten Kante und lässt eine Lücke", () => {
    const h = halbiere(q4, .5, 0, .4)!;
    expect(flaeche(h.a) + flaeche(h.b) + flaeche(h.luecke)).toBeCloseTo(8, 6);
    expect(flaeche(h.luecke)).toBeCloseTo(.8, 6);
    expect(Math.abs(h.von[0] - 2)).toBeLessThan(1e-9);
    expect(halbiere(q4, .5, 0, 0)!.luecke).toEqual([]);
  });
  it("halbiere verweigert Schnitte, die ein Teil leer lassen", () => {
    expect(halbiere(q4, .5, 0, 5)).toBeNull();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run packages/forge/test/polygon.test.ts` — Expected: FAIL (`einwaertsKanten` is not exported).

- [ ] **Step 3: Implement** (nach `einwaerts` einfügen)

```ts
/** Wie `einwaerts`, aber jede Kante mit eigenem Abstand. Kante `i` läuft von `poly[i-1]` nach
 *  `poly[i]` — dieselbe Zählung wie die Schleife oben. So rückt ein Block nur dort ein, wo eine
 *  Straße oder die Mauer an ihm liegt. */
export function einwaertsKanten(poly: Polygon, abstaende: readonly number[]): Polygon {
  if (poly.length < 3) return [];
  const positiv = doppelflaeche(poly) > 0;
  let ergebnis = poly;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j]!, b = poly[i]!, ex = b[0] - a[0], ey = b[1] - a[1];
    const laenge = Math.sqrt(ex * ex + ey * ey);
    if (laenge < 1e-9) continue;
    const nx = (positiv ? ey : -ey) / laenge, ny = (positiv ? -ex : ex) / laenge;
    ergebnis = clipHalbebene(ergebnis, nx, ny, nx * a[0] + ny * a[1] - (abstaende[i] ?? 0));
    if (!ergebnis.length) return [];
  }
  return ergebnis;
}

/** Wo die Gerade `n·x = c` ein konvexes Polygon betritt und verlässt, oder `null`. */
export function sehne(poly: Polygon, nx: number, ny: number, c: number): readonly [Punkt, Punkt] | null {
  const treffer: Punkt[] = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j]!, b = poly[i]!, da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
    if ((da < 0) !== (db < 0)) { const t = da / (da - db); treffer.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return treffer.length >= 2 ? [treffer[0]!, treffer[1]!] : null;
}

export interface Halbierung { readonly a: Polygon; readonly b: Polygon; readonly luecke: Polygon; readonly von: Punkt; readonly bis: Punkt }

/**
 * Ein konvexes Polygon quer zu seiner längsten Kante teilen. `lage` (0..1) sagt, wo auf dieser
 * Kante geschnitten wird, `kippung` neigt den Schnitt um einen Anteil der Kantenrichtung, und
 * `luecke` lässt zwischen den Hälften einen Streifen frei — die Gasse. So entstehen Lose als
 * Streifen entlang der Straße, wie in jeder gewachsenen Stadt.
 */
export function halbiere(poly: Polygon, lage: number, kippung: number, luecke: number): Halbierung | null {
  const n = poly.length;
  if (n < 3) return null;
  let beste = 0, besteLaenge = -1;
  for (let i = 0; i < n; i++) {
    const a = poly[(i + n - 1) % n]!, b = poly[i]!, l = Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
    if (l > besteLaenge) { besteLaenge = l; beste = i; }
  }
  const a = poly[(beste + n - 1) % n]!, b = poly[beste]!;
  const ux = (b[0] - a[0]) / besteLaenge, uy = (b[1] - a[1]) / besteLaenge;
  let nx = ux - uy * kippung, ny = uy + ux * kippung;
  const nl = Math.sqrt(nx * nx + ny * ny); nx /= nl; ny /= nl;
  const px = a[0] + (b[0] - a[0]) * lage, py = a[1] + (b[1] - a[1]) * lage;
  const c = nx * px + ny * py, h = luecke / 2;
  const teilA = clipHalbebene(poly, nx, ny, c - h), teilB = clipHalbebene(poly, -nx, -ny, -(c + h));
  if (teilA.length < 3 || teilB.length < 3) return null;
  const s = sehne(poly, nx, ny, c);
  if (!s) return null;
  const band = h > 0 ? clipHalbebene(clipHalbebene(poly, nx, ny, c + h), -nx, -ny, -(c - h)) : [];
  return { a: teilA, b: teilB, luecke: band, von: s[0], bis: s[1] };
}
```

(`**` auf ganzzahligen Exponenten ist Multiplikation und bitgleich; kein `Math.pow` mit Bruchexponenten.)

- [ ] **Step 4: Run** `npx vitest run packages/forge/test/polygon.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(forge): add per-edge inset, chord and gap bisection"` (+ Co-Authored-By-Zeile).

---

### Task 2: Wortschatz — neue Nutzungen, neue Gebäudetypen mit Innenräumen

**Files:**
- Modify: `packages/szene/src/settlement-plan.ts:6` (`SETTLEMENT_USES`)
- Modify: `packages/szene/src/model.ts:123-147` (`BAUWERK_TYPEN`, `BAUWERK_LABEL`, `BAUWERK_SETTINGS`)
- Modify: `packages/forge/src/bauprogramme.ts` (`BAUWERK_AUSDEHNUNG`)
- Modify: `packages/forge/src/grundriss.ts:158-183, 281-285` (`BAU_THEMEN`, `RAUM_LABEL`, `themen`)
- Modify: `packages/forge/src/siedlung-plan.ts` (`zoneBuilding` Wahllisten)
- Modify: jede weitere `Record<BauwerkTyp, …>`-Stelle, die der Typecheck meldet (`client/src/features/map-generation.ts`, `NestedMapView.tsx`)
- Test: `packages/forge/test/bauwerke.test.ts`, `packages/forge/test/siedlung-plan.test.ts`

**Interfaces:**
- Produces: `SettlementUse` enthält `"burg" | "tempel"`; `BauwerkTyp` enthält `"burg" | "rathaus" | "muehle" | "bauernhof" | "kaserne"`.

- [ ] **Step 1: Failing tests**

```ts
// bauwerke.test.ts
import { erzeugeGrundriss } from "../src/grundriss.ts";
it.each(["burg", "rathaus", "muehle", "bauernhof", "kaserne"] as const)("baut für %s einen Innenraum mit mindestens zwei Räumen", typ => {
  const g = erzeugeGrundriss({ keim: `neu:${typ}`, optionen: { profil: typ } }, paket);
  expect(g.raeume.length).toBeGreaterThanOrEqual(2);
});
// siedlung-plan.test.ts
it("kennt Burg und Tempelbezirk als Nutzung", () => {
  expect(() => parseSettlementPlan({ schemaVersion: 1, zonen: [{ id: "b", name: "Burg", nutzung: "burg", dichte: 1, polygon: [[0, 0], [.2, 0], [.2, .2]] }] })).not.toThrow();
  expect(zoneBuilding({ id: "t", name: "T", nutzung: "tempel", dichte: 1, polygon: [] }, "fantasy", .1)).toBe("kirche");
  expect(zoneBuilding({ id: "b", name: "B", nutzung: "burg", dichte: 1, polygon: [] }, "fantasy", .1)).toBe("kaserne");
});
```
(`paket` und `erzeugeGrundriss`-Aufrufmuster wie in der vorhandenen `bauwerke.test.ts` übernehmen.)

- [ ] **Step 2: Run** `npx vitest run packages/forge/test/bauwerke.test.ts packages/forge/test/siedlung-plan.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**

`settlement-plan.ts`:
```ts
export const SETTLEMENT_USES = ["wohnen", "markt", "handwerk", "hafen", "adel", "arm", "frei", "burg", "tempel"] as const;
```
`model.ts` — an `BAUWERK_TYPEN` anhängen `"burg", "rathaus", "muehle", "bauernhof", "kaserne"`; Labels `burg: "Burg", rathaus: "Rathaus", muehle: "Mühle", bauernhof: "Bauernhof", kaserne: "Kaserne"`; `BAUWERK_SETTINGS.fantasy` um dieselben fünf ergänzen.
`bauprogramme.ts` — `BAUWERK_AUSDEHNUNG` ergänzen: `burg: [24, 24], rathaus: [22, 16], muehle: [14, 14], bauernhof: [18, 14], kaserne: [22, 14]`.
`grundriss.ts` — neue `BAU_THEMEN` und Labels:
```ts
  ratssaal: { schluessel: "ratssaal", boden: "gehoben", stuecke: [["moebel", "mahl"], ["moebel", "sitz"], ["moebel", "sitz"], ["licht", "warm"]] },
  schreibstube: { schluessel: "schreibstube", boden: "wohnraum", stuecke: [["moebel", "wissen"], ["moebel", "buecher"], ["licht", "kerze"]] },
  mahlwerk: { schluessel: "mahlwerk", boden: "keller", stuecke: [["aufbau", "traeger"], ["gefaess", "vorrat"], ["gefaess", "behaelter"], ["licht", "warm"]] },
  kornboden: { schluessel: "kornboden", boden: "keller", stuecke: [["gefaess", "vorrat"], ["gefaess", "vorrat"], ["moebel", "lager"]] },
  stall: { schluessel: "stall", boden: "keller", stuecke: [["gefaess", "vorrat"], ["aufbau", "geroell"], ["licht", "kerze"]] },
  rittersaal: { schluessel: "rittersaal", boden: "halle", stuecke: [["moebel", "mahl"], ["moebel", "sitz"], ["aufbau", "thron"], ["moebel", "schild"], ["licht", "warm"]] },
  schlafsaal: { schluessel: "schlafsaal", boden: "wohnraum", stuecke: [["moebel", "rast"], ["moebel", "rast"], ["moebel", "kammer"], ["licht", "kerze"]] },
```
`RAUM_LABEL` += `ratssaal: "Ratssaal", schreibstube: "Schreibstube", mahlwerk: "Mahlwerk", kornboden: "Kornboden", stall: "Stall", rittersaal: "Rittersaal", schlafsaal: "Schlafsaal"`.
`themen` in `bauwerkRaeume` ergänzen:
```ts
      burg: ["rittersaal", "wachstube", "waffenkammer", "treppenhaus"], rathaus: ["ratssaal", "schreibstube", "kontor", "vorratsraum"],
      muehle: ["mahlwerk", "kornboden", "wohnraum"], bauernhof: ["wohnraum", "kueche", "stall", "kornboden"],
      kaserne: ["schlafsaal", "wachstube", "waffenkammer", "kueche"],
```
(`burg` wie `turm` quadratisch: `if (profil === "turm" || profil === "burg") w = h = Math.min(w, h);`)
`siedlung-plan.ts` — in allen drei Wahllisten `tempel` und `burg` ergänzen:
```ts
  // gegenwart
    tempel: ["kirche", "bibliothek"], burg: ["polizei", "feuerwache"],
  // scifi
    tempel: ["labor", "kommando"], burg: ["kommando", "reaktor"],
  // fantasy
    tempel: ["kirche", "bibliothek", "haus"], burg: ["kaserne", "turm", "lager"],
```
Dann `npm run typecheck` und jede gemeldete `Record<BauwerkTyp, …>` ergänzen (Icons/Labels im Client: `burg` → Burg-Symbol wie `turm`, `rathaus` → wie `bank`, `muehle` → wie `werkstatt`, `bauernhof` → wie `haus`, `kaserne` → wie `lager`). Englische Übersetzungen der fünf Labels und sieben Raumnamen in die `i18n/en`-Datei, in der `"Schmiedewerkstatt"` steht (`grep -rl Schmiedewerkstatt packages/client/src/i18n/en`).

- [ ] **Step 4: Run** `npx vitest run packages/forge/test/bauwerke.test.ts packages/forge/test/siedlung-plan.test.ts packages/forge/test/grundriss.test.ts` und `npm run typecheck` und `npm run gate:sprache` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(maps): add castle, town hall, mill, farm and barracks building types`.

---

### Task 3: `siedlung.ts` teilen, v8 byte-gleich halten

**Files:**
- Create: `packages/forge/src/stadt/gemeinsam.ts`
- Modify: `packages/forge/src/siedlung.ts`
- Test: `packages/forge/test/siedlung-gold.test.ts` (neu)

**Interfaces:**
- Produces (in `gemeinsam.ts`, alle ohne Zufall):
  - `export interface Gasse { readonly id: string; art: "hauptstrasse" | "gasse"; readonly a: number; readonly b: number; readonly von: Punkt; readonly bis: Punkt; readonly band: Polygon }`
  - `ohne(a: Polygon, b: Polygon): Polygon[]`, `mitAbstand(poly, abstand): Polygon`, `getrennteDaecher(a, b): boolean`, `freieMauer(a, b, hindernisse): [Punkt, Punkt][]`
  - `hausImLos(los, gasse: Pick<Gasse, "von" | "bis" | "band">, breite, tiefe, form: "rechteck" | "l" | "u"): Polygon` (bisheriges `lForm: boolean` → `form`; v8 ruft mit `lForm ? "l" : "rechteck"`)
  - `export interface SiedlungGrund` — alles, was `erzeugeSiedlung` bis vor Abschnitt 1 berechnet (siehe Step 3)
  - `siedlungGrundlage(auftrag, paket): SiedlungGrund`
- Consumes: Task 2 (Typen).

- [ ] **Step 1: Goldtest auf dem unveränderten Stand schreiben**

```ts
// packages/forge/test/siedlung-gold.test.ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAssetpaket } from "@chronicle/szene";
import { erzeugeSiedlung } from "../src/siedlung.ts";

const pack = (id: string) => parseAssetpaket(readFileSync(fileURLToPath(new URL(`../../../assets/packs/${id}/paket.json`, import.meta.url)), "utf8"));
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
const FAELLE = [
  ["gegenwart", "dorf", "fluss"], ["gegenwart", "stadt", "kueste"], ["gegenwart", "weiler", "huegel"],
  ["scifi", "dorf", "ebene"], ["scifi", "stadt", "see"], ["scifi", "weiler", "insel"],
] as const;
/** Gegenwart und Sci-Fi bleiben bis Teil 2 auf ihrem Stand, Byte für Byte (Spec E2). */
describe("Siedlung v8 bleibt für Gegenwart und Sci-Fi unverändert", () => {
  it.each(FAELLE)("%s %s %s", (setting, art, standort) => {
    const s = erzeugeSiedlung({ keim: `gold:${setting}:${art}:${standort}`, optionen: { setting, art, standort } }, pack("pk.zeitwelten"));
    expect(hash({ karte: s.karte, cartography: s.cartography, knoten: s.knoten, bericht: s.bericht, version: s.version })).toMatchSnapshot();
  });
});
```
Run `npx vitest run packages/forge/test/siedlung-gold.test.ts` — Expected: PASS und legt `__snapshots__/siedlung-gold.test.ts.snap` an. **Snapshot committen**, bevor irgendetwas umgebaut wird: `git add packages/forge/test && git commit -m "test(forge): pin v8 settlement output for modern and sci-fi"`.

- [ ] **Step 2: Reine Hilfen verschieben.** `ohne`, `mitAbstand`, `getrennteDaecher`, `freieMauer`, `hausImLos`, `frontParzellen` und das `Gasse`-Interface wortgleich nach `stadt/gemeinsam.ts` (Kopf mit SPDX-Zeilen wie in allen Dateien), in `siedlung.ts` importieren. `hausImLos` bekommt die Form als Parameter:

```ts
export type Hausform = "rechteck" | "l" | "u";
export function hausImLos(los: Polygon, gasse: Pick<Gasse, "von" | "bis" | "band">, breite: number, tiefe: number, form: Hausform): Polygon {
  // … unveränderter Rumpf, nur die Zeile mit `local` wird zu:
      const local: Polygon = form === "l" ? [[-w, -h], [w * .2, -h], [w * .2, h * -.05], [w, h * -.05], [w, h], [-w, h]]
        : form === "u" ? [[-w, -h], [w, -h], [w, h], [w * .42, h], [w * .42, -h * .15], [-w * .42, -h * .15], [-w * .42, h], [-w, h]]
        : [[-w, -h], [w, -h], [w, h], [-w, h]];
```
Aufruf in `siedlung.ts:748` → `hausImLos(innen, gassen[beste]!, w, w * r.zahl(.84, 1.32), setting === "fantasy" && r.zahl(0, 1) < .21 ? "l" : "rechteck")`. Achtung: `r.zahl` muss **an derselben Stelle** gezogen werden wie vorher (Argumentreihenfolge unverändert lassen), sonst verschiebt sich der Zufallsstrom.

- [ ] **Step 3: Grundlage herauslösen.** Den Block `siedlung.ts:347-437` (Prüfung, Keim, `r`, `ids`, Rahmen, Fluss, Landschaft, Hindernisse) als `siedlungGrundlage` nach `gemeinsam.ts`? — **Nein**: er braucht die Optionstypen aus `siedlung.ts`; er bleibt in `siedlung.ts` als nicht exportierte Funktion `grundlage(auftrag, paket): SiedlungGrund`, `gemeinsam.ts` exportiert nur das Interface:

```ts
export interface SiedlungGrund {
  readonly auftrag: { readonly keim: string; readonly titel?: string; readonly eltern?: GrundrissEltern };
  readonly art: "weiler" | "dorf" | "stadt"; readonly setting: KartenSetting; readonly standort: ReliefStandort;
  readonly optionen: { readonly bauwerke: number; readonly strassenDichte: number; readonly grundstueck: readonly [number, number]; readonly licht: boolean; readonly mauer: boolean; readonly burg: boolean };
  readonly breite: number; readonly hoehe: number; readonly z: number; readonly rand: number;
  readonly rahmen: Polygon;
  readonly version: string; readonly keim: Weltkeim; readonly layoutKeim: Weltkeim;
  readonly r: Zufall; readonly ids: IdFabrik;
  readonly landschaft: Landschaft; readonly fluss: readonly FlussStueck[]; readonly flussBreite: number;
  readonly wasser: readonly Polygon[]; readonly fels: readonly Polygon[]; readonly strand: readonly Polygon[]; readonly sumpf: readonly Polygon[];
  readonly hartHindernisse: readonly Polygon[]; readonly bauHindernisse: readonly Polygon[];
  readonly planung?: SettlementPlan; readonly verkehr?: RoadPlan;
  readonly paket: AssetpaketV1;
}
export type Zufall = ReturnType<typeof rauschen>;
```
`erzeugeSiedlung` wird zu `const g = grundlage(auftrag, paket); if (g.setting === "fantasy") return erzeugeViertelStadt(g); /* danach der alte Rumpf ab Abschnitt 1, der seine Namen aus g destrukturiert */`. In diesem Task ist `erzeugeViertelStadt` noch nicht da — der Dispatch kommt erst in Task 10; hier nur die Grundlage herauslösen und den alten Rumpf mit `const { breite, hoehe, … } = g;` weiterlaufen lassen.

- [ ] **Step 4: Run** `npx vitest run packages/forge/test/siedlung-gold.test.ts packages/forge/test/siedlung.test.ts packages/forge/test/siedlung-plan.test.ts packages/forge/test/siedlung-traffic.test.ts packages/forge/test/siedlung-standort.test.ts packages/forge/test/siedlung-hafen.test.ts packages/forge/test/siedlung-cartography.test.ts` — Expected: PASS ohne Snapshot-Änderung. Zusätzlich einmal den Goldtest für **Fantasy** lokal (nicht committen) vor/nach vergleichen: gleiche Hashes.
- [ ] **Step 5: Commit** `refactor(forge): share settlement groundwork and pure helpers`.

---

### Task 4: Flecken auf der Spirale

**Files:**
- Create: `packages/forge/src/stadt/viertel/flecken.ts`
- Test: `packages/forge/test/viertel-flecken.test.ts`

**Interfaces:**
- Produces: `interface Fleck { nr: number; punkt: Punkt; zelle: Polygon; ferne: number; pfad: string }`; `spirale(mitte: Punkt, innen: number, radiusInnen: number, rahmen: Polygon, r: { zahl(min, max): number }, max?: number): Punkt[]`; `flecken(punkte: readonly Punkt[], innen: number, rahmen: Polygon, mitte: Punkt, runden?: number): Fleck[]`.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from "vitest";
import { rauschen } from "../src/kartenwerk.ts";
import { flaeche } from "../src/polygon.ts";
import { flecken, spirale } from "../src/stadt/viertel/flecken.ts";
const rahmen = [[0, 0], [56, 0], [56, 44], [0, 44]] as const;
const r = () => rauschen("0123456789abcdef0123456789abcdef");
describe("Flecken", () => {
  it("liegen alle im Rahmen und decken ihn lückenlos", () => {
    const p = spirale([28, 22], 30, 17, rahmen, r());
    const f = flecken(p, 30, rahmen, [28, 22]);
    expect(f.reduce((s, x) => s + flaeche(x.zelle), 0)).toBeCloseTo(56 * 44, 0);
    for (const x of f) for (const [px, py] of x.zelle) { expect(px).toBeGreaterThanOrEqual(0); expect(py).toBeLessThanOrEqual(44); }
  });
  it("sind innen kleiner als außen", () => {
    const f = flecken(spirale([28, 22], 30, 17, rahmen, r()), 30, rahmen, [28, 22]);
    const innen = f.filter(x => x.nr < 30).map(x => flaeche(x.zelle)), aussen = f.filter(x => x.nr >= 60).map(x => flaeche(x.zelle));
    const mittel = (l: number[]) => l.reduce((a, b) => a + b, 0) / l.length;
    expect(mittel(aussen)).toBeGreaterThan(mittel(innen) * 1.5);
  });
  it("sind deterministisch und nummeriert wie die Spirale", () => {
    const a = flecken(spirale([28, 22], 30, 17, rahmen, r()), 30, rahmen, [28, 22]);
    const b = flecken(spirale([28, 22], 30, 17, rahmen, r()), 30, rahmen, [28, 22]);
    expect(a).toEqual(b);
    expect(a.map(x => x.nr)).toEqual([...a.map(x => x.nr)].sort((x, y) => x - y));
  });
});
```

- [ ] **Step 2: Run** `npx vitest run packages/forge/test/viertel-flecken.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { huelle, q, qp, schwerpunkt, voronoiZelle, type Polygon, type Punkt } from "../../polygon.ts";

/**
 * **Flecken: die Grundstücke der Geschichte.** Eine gewachsene Stadt ist innen eng und wird
 * nach außen weiter; ihre Viertel sind Flecken unterschiedlicher Größe. Die Punkte liegen auf
 * einer Sonnenblumenspirale (goldener Winkel), deren Ringabstand nach außen wächst, und nur die
 * inneren werden mit Lloyd beruhigt — die Flur darf grob bleiben.
 */
export interface Fleck { readonly nr: number; readonly punkt: Punkt; readonly zelle: Polygon; readonly ferne: number; readonly pfad: string }

/** 137,5° als Drehvektor, ohne Winkelfunktion (polygon.ts, Regel 2). */
const GOLD_X = -0.7373688780783197, GOLD_Y = 0.6754902942615238;

export function spirale(mitte: Punkt, innen: number, radiusInnen: number, rahmen: Polygon, r: { zahl(min: number, max: number): number }, max = 420): Punkt[] {
  let dx = r.zahl(-1, 1), dy = r.zahl(-1, 1), n = Math.sqrt(dx * dx + dy * dy);
  if (n < 1e-6) { dx = 1; dy = 0; n = 1; }
  dx /= n; dy /= n;
  const schritt = radiusInnen / (Math.sqrt(innen + .5) * 1.35);
  const [x0, y0, x1, y1] = huelle(rahmen);
  const weiteste = Math.sqrt(Math.max((mitte[0] - x0) ** 2, (x1 - mitte[0]) ** 2) + Math.max((mitte[1] - y0) ** 2, (y1 - mitte[1]) ** 2)) + schritt * 2;
  const punkte: Punkt[] = [];
  for (let i = 0; punkte.length < max; i++) {
    const radius = schritt * Math.sqrt(i + .5) * (1 + .35 * i / Math.max(1, innen)) * r.zahl(.92, 1.08);
    if (radius > weiteste) break;
    const quer = r.zahl(-.22, .22) * schritt;
    const p: Punkt = [mitte[0] + dx * radius - dy * quer, mitte[1] + dy * radius + dx * quer];
    if (p[0] > x0 + .05 && p[0] < x1 - .05 && p[1] > y0 + .05 && p[1] < y1 - .05) punkte.push(qp(p));
    const nx = dx * GOLD_X - dy * GOLD_Y, ny = dx * GOLD_Y + dy * GOLD_X;
    dx = nx; dy = ny;
  }
  return punkte;
}

export function flecken(punkte: readonly Punkt[], innen: number, rahmen: Polygon, mitte: Punkt, runden = 2): Fleck[] {
  let p = punkte.map(x => [x[0], x[1]] as Punkt);
  for (let runde = 0; runde < runden; runde++) {
    const vorher = p;
    p = vorher.map((pt, i) => {
      if (i >= innen) return pt;
      const zelle = voronoiZelle(pt, vorher, rahmen);
      return zelle.length >= 3 ? schwerpunkt(zelle) : pt;
    });
  }
  const fest = p.map(qp);
  const result: Fleck[] = [];
  fest.forEach((pt, nr) => {
    const zelle = voronoiZelle(pt, fest, rahmen).map(qp);
    if (zelle.length < 3) return;
    result.push({ nr, punkt: pt, zelle, ferne: Math.sqrt((pt[0] - mitte[0]) ** 2 + (pt[1] - mitte[1]) ** 2), pfad: `fleck.${q(pt[0])}_${q(pt[1])}` });
  });
  return result;
}
```
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(forge): spiral patches for settlement districts`.

---

### Task 5: Kantengraph und Wegsuche

**Files:**
- Create: `packages/forge/src/stadt/viertel/graph.ts`
- Test: `packages/forge/test/viertel-graph.test.ts`

**Interfaces:**
- Produces:
```ts
export interface Kante { readonly nr: number; readonly u: number; readonly v: number; readonly von: Punkt; readonly bis: Punkt; readonly laenge: number; readonly f1: number; readonly f2: number } // f1/f2: Index in der Zellenliste, f2 = -1 am Rahmen
export interface Kantengraph { readonly ecken: readonly Punkt[]; readonly kanten: readonly Kante[]; readonly an: readonly (readonly number[])[]; finde(p: Punkt): number }
export function kantengraph(zellen: readonly Polygon[]): Kantengraph;
export function weg(g: Kantengraph, start: number, ziele: ReadonlySet<number>, kosten: (k: Kante) => number): number[] | null; // Kanten-Nr in Laufrichtung
```

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from "vitest";
import { kantengraph, weg } from "../src/stadt/viertel/graph.ts";
const zellen = [[[0, 0], [1, 0], [1, 1], [0, 1]], [[1, 0], [2, 0], [2, 1], [1.0000004, 1]], [[0, 1], [1, 1], [1, 2], [0, 2]]] as const;
describe("Kantengraph", () => {
  it("fängt fast gleiche Ecken zu einer und zählt geteilte Kanten einmal", () => {
    const g = kantengraph(zellen);
    expect(g.ecken.length).toBe(8);
    expect(g.kanten.length).toBe(10);
    const geteilt = g.kanten.filter(k => k.f2 >= 0);
    expect(geteilt.map(k => [k.f1, k.f2].sort())).toEqual([[0, 1], [0, 2]]);
  });
  it("findet den billigsten Weg und respektiert gesperrte Kanten", () => {
    const g = kantengraph(zellen), start = g.finde([0, 0]), ziel = g.finde([2, 1]);
    const w = weg(g, start, new Set([ziel]), k => k.laenge)!;
    expect(w.reduce((s, n) => s + g.kanten[n]!.laenge, 0)).toBeCloseTo(3, 6);
    expect(weg(g, start, new Set([ziel]), () => Infinity)).toBeNull();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run packages/forge/test/viertel-graph.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { Polygon, Punkt } from "../../polygon.ts";

/** Die Kanten zwischen den Flecken als Graph: Ecken sind Voronoi-Ecken, gefangen auf 0,02 Zellen,
 *  weil zwei Nachbarn dieselbe Ecke in anderer Reihenfolge schneiden und im letzten Bit abweichen. */
export interface Kante { readonly nr: number; readonly u: number; readonly v: number; readonly von: Punkt; readonly bis: Punkt; readonly laenge: number; readonly f1: number; readonly f2: number }
export interface Kantengraph { readonly ecken: readonly Punkt[]; readonly kanten: readonly Kante[]; readonly an: readonly (readonly number[])[]; finde(p: Punkt): number }

const FANG = .02, RASTER = .05;

export function kantengraph(zellen: readonly Polygon[]): Kantengraph {
  const ecken: Punkt[] = [], eimer = new Map<string, number[]>();
  const suche = (p: Punkt): number => {
    const gx = Math.floor(p[0] / RASTER), gy = Math.floor(p[1] / RASTER);
    for (let x = gx - 1; x <= gx + 1; x++) for (let y = gy - 1; y <= gy + 1; y++) for (const i of eimer.get(`${x}:${y}`) ?? []) {
      const e = ecken[i]!;
      if (Math.abs(e[0] - p[0]) <= FANG && Math.abs(e[1] - p[1]) <= FANG) return i;
    }
    return -1;
  };
  const ecke = (p: Punkt): number => {
    const vorhanden = suche(p);
    if (vorhanden >= 0) return vorhanden;
    ecken.push(p);
    const key = `${Math.floor(p[0] / RASTER)}:${Math.floor(p[1] / RASTER)}`;
    eimer.set(key, [...(eimer.get(key) ?? []), ecken.length - 1]);
    return ecken.length - 1;
  };
  const roh: { u: number; v: number; f1: number; f2: number }[] = [], index = new Map<string, number>();
  zellen.forEach((zelle, f) => {
    for (let i = 0, j = zelle.length - 1; i < zelle.length; j = i++) {
      const u = ecke(zelle[j]!), v = ecke(zelle[i]!);
      if (u === v) continue;
      const key = u < v ? `${u}:${v}` : `${v}:${u}`, alt = index.get(key);
      if (alt === undefined) { index.set(key, roh.length); roh.push({ u, v, f1: f, f2: -1 }); }
      else if (roh[alt]!.f2 < 0 && roh[alt]!.f1 !== f) roh[alt]!.f2 = f;
    }
  });
  const kanten: Kante[] = roh.map((k, nr) => {
    const von = ecken[k.u]!, bis = ecken[k.v]!;
    return { nr, u: k.u, v: k.v, von, bis, laenge: Math.sqrt((bis[0] - von[0]) ** 2 + (bis[1] - von[1]) ** 2), f1: k.f1, f2: k.f2 };
  });
  const an = ecken.map(() => [] as number[]);
  for (const k of kanten) { an[k.u]!.push(k.nr); an[k.v]!.push(k.nr); }
  return { ecken, kanten, an, finde: suche };
}

/** Dijkstra mit Binärheap; gleiche Kosten entscheidet die kleinere Eckennummer (stabil). */
export function weg(g: Kantengraph, start: number, ziele: ReadonlySet<number>, kosten: (k: Kante) => number): number[] | null {
  if (start < 0 || !ziele.size) return null;
  const n = g.ecken.length, dist = new Float64Array(n).fill(Infinity), ueber = new Int32Array(n).fill(-1), fertig = new Uint8Array(n);
  const heap: [number, number][] = [];
  const kleiner = (a: [number, number], b: [number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const push = (e: [number, number]) => {
    heap.push(e);
    for (let i = heap.length - 1; i > 0;) { const p = (i - 1) >> 1; if (!kleiner(heap[i]!, heap[p]!)) break; [heap[i], heap[p]] = [heap[p]!, heap[i]!]; i = p; }
  };
  const pop = (): [number, number] => {
    const top = heap[0]!, last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < heap.length && kleiner(heap[l]!, heap[m]!)) m = l;
        if (r < heap.length && kleiner(heap[r]!, heap[m]!)) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m]!, heap[i]!]; i = m;
      }
    }
    return top;
  };
  dist[start] = 0; push([0, start]);
  while (heap.length) {
    const [d, e] = pop();
    if (fertig[e] || d > dist[e]!) continue;
    fertig[e] = 1;
    if (ziele.has(e)) {
      const pfad: number[] = [];
      for (let x = e; x !== start;) { const k = g.kanten[ueber[x]!]!; pfad.push(k.nr); x = k.u === x ? k.v : k.u; }
      return pfad.reverse();
    }
    for (const nr of g.an[e]!) {
      const k = g.kanten[nr]!, c = kosten(k);
      if (!(c < Infinity)) continue;
      const w = k.u === e ? k.v : k.u, nd = d + c;
      if (nd < dist[w]!) { dist[w] = nd; ueber[w] = nr; push([nd, w]); }
    }
  }
  return null;
}
```
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(forge): patch edge graph with snapped corners and shortest paths`.

---

### Task 6: Viertelrollen

**Files:**
- Create: `packages/forge/src/stadt/viertel/rollen.ts`
- Test: `packages/forge/test/viertel-rollen.test.ts`

**Interfaces:**
- Consumes: `SettlementPlan`, `SettlementUse`, `planContains` aus `@chronicle/szene` (Task 2).
- Produces:
```ts
export type Rolle = SettlementUse;
export interface FleckLage { readonly nr: number; readonly punkt: Punkt; readonly flaeche: number; readonly ferne: number; readonly nachbarn: readonly number[]; readonly ufer: boolean; readonly trocken: boolean; readonly kern: boolean; readonly mauerRand: boolean; readonly hoehe: number; readonly tor: boolean }
export interface RollenAuftrag { readonly art: "weiler" | "dorf" | "stadt"; readonly burg: boolean; readonly plan?: SettlementPlan; readonly breite: number; readonly hoehe: number }
export function planRolle(plan: SettlementPlan | undefined, p: Punkt, breite: number, hoehe: number): Rolle | undefined;
export function waehleMarkt(lagen: readonly FleckLage[], a: RollenAuftrag): number; // nr oder -1
export function weiseRollenZu(lagen: readonly FleckLage[], markt: number, a: RollenAuftrag): { rollen: ReadonlyMap<number, Rolle>; ausgelassen: readonly string[] };
```

- [ ] **Step 1: Failing tests** (synthetische Lagen, kein Generator nötig)

```ts
import { describe, expect, it } from "vitest";
import { planRolle, waehleMarkt, weiseRollenZu, type FleckLage } from "../src/stadt/viertel/rollen.ts";
const lage = (nr: number, x: number, y: number, extra: Partial<FleckLage> = {}): FleckLage => ({ nr, punkt: [x, y], flaeche: 10, ferne: Math.hypot(x - 20, y - 20), nachbarn: [], ufer: false, trocken: true, kern: true, mauerRand: false, hoehe: 100, tor: false, ...extra });
const stadt = { art: "stadt" as const, burg: true, breite: 40, hoehe: 40 };
const lagen = [
  lage(0, 20, 20, { nachbarn: [1, 2, 3] }), lage(1, 24, 20, { nachbarn: [0], flaeche: 14 }), lage(2, 16, 20, { nachbarn: [0], flaeche: 9 }),
  lage(3, 20, 26, { nachbarn: [0], mauerRand: true, hoehe: 160 }), lage(4, 30, 30, { kern: false, ufer: true, tor: true }), lage(5, 10, 10, { kern: false, tor: true }),
];
describe("Viertelrollen", () => {
  it("legt den Markt in den mittigsten trockenen Fleck", () => expect(waehleMarkt(lagen, stadt)).toBe(0));
  it("setzt Tempel an den Markt, Burg an die Mauer auf hohen Grund, Hafen ans Ufer", () => {
    const { rollen } = weiseRollenZu(lagen, 0, stadt);
    expect(rollen.get(0)).toBe("markt");
    expect(rollen.get(1)).toBe("tempel");
    expect(rollen.get(3)).toBe("burg");
    expect(rollen.get(4)).toBe("hafen");
  });
  it("lässt den Zonenplan gewinnen, auch für Markt und Burg", () => {
    const plan = { schemaVersion: 1 as const, zonen: [
      { id: "m", name: "Markt", nutzung: "markt" as const, dichte: 1, polygon: [[.35, .45], [.45, .45], [.45, .55], [.35, .55]] as const },
      { id: "x", name: "Park", nutzung: "frei" as const, dichte: 1, polygon: [[.55, .45], [.65, .45], [.65, .55], [.55, .55]] as const },
    ] };
    const a = { ...stadt, plan };
    expect(planRolle(plan, [16, 20], 40, 40)).toBe("markt");
    expect(waehleMarkt(lagen, a)).toBe(2);
    expect(weiseRollenZu(lagen, 2, a).rollen.get(1)).toBe("frei");
  });
  it("meldet eine gewünschte Burg ohne Mauerfleck, statt sie zu erzwingen", () => {
    const ohneRand = lagen.map(l => ({ ...l, mauerRand: false }));
    const { rollen, ausgelassen } = weiseRollenZu(ohneRand, 0, stadt);
    expect([...rollen.values()]).not.toContain("burg");
    expect(ausgelassen.join(" ")).toContain("Burg");
  });
  it("gibt einem Dorf keinen Tempel und keine Burg", () => {
    const { rollen } = weiseRollenZu(lagen, 0, { ...stadt, art: "dorf", burg: false });
    expect([...rollen.values()]).not.toContain("tempel");
    expect([...rollen.values()]).not.toContain("burg");
  });
});
```

- [ ] **Step 2: Run** `npx vitest run packages/forge/test/viertel-rollen.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { planContains, type SettlementPlan, type SettlementUse } from "@chronicle/szene";
import type { Punkt } from "../../polygon.ts";

/** Die Rolle eines Viertels ist die Nutzung des Zonenplans — eine Liste, nicht zwei (Spec E4). */
export type Rolle = SettlementUse;
export interface FleckLage { readonly nr: number; readonly punkt: Punkt; readonly flaeche: number; readonly ferne: number; readonly nachbarn: readonly number[]; readonly ufer: boolean; readonly trocken: boolean; readonly kern: boolean; readonly mauerRand: boolean; readonly hoehe: number; readonly tor: boolean }
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
  for (const l of lagen) { const geplant = planRolle(a.plan, l.punkt, a.breite, a.hoehe); if (geplant) rollen.set(l.nr, geplant); }
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
```
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(forge): assign district roles, let the zone plan win`.

---

### Task 7: Mauerring, Tore, Turmpunkte

**Files:**
- Create: `packages/forge/src/stadt/viertel/mauer.ts`
- Test: `packages/forge/test/viertel-mauer.test.ts`

**Interfaces:**
- Consumes: `Kantengraph`, `Kante` (Task 5).
- Produces:
```ts
export function mauerKanten(g: Kantengraph, istKern: (zelle: number) => boolean): number[]; // Kanten-Nr mit genau einer Kernseite, nie am Rahmen
export function waehleTore(g: Kantengraph, ring: readonly number[], istInnen: (zelle: number) => boolean, mitte: Punkt, anzahl: number, gesperrt: (p: Punkt) => boolean, start: Punkt): number[]; // Ecken-Nr
export interface MauerLinie { readonly a: Punkt; readonly b: Punkt; readonly pfad: string }
export function mauerLinien(g: Kantengraph, ring: readonly number[], kernSchwerpunkt: (zelle: number) => Punkt, istKern: (zelle: number) => boolean, versatz: number): MauerLinie[];
export function turmPunkte(linien: readonly MauerLinie[], abstand: number): Punkt[];
export function zwoelfeck(mitte: Punkt, radius: number): Polygon;
```

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from "vitest";
import { kantengraph } from "../src/stadt/viertel/graph.ts";
import { mauerKanten, mauerLinien, turmPunkte, waehleTore, zwoelfeck } from "../src/stadt/viertel/mauer.ts";
import { flaeche, schwerpunkt } from "../src/polygon.ts";
// 3×3 Quadrate, Kern = das mittlere
const zellen = [0, 1, 2].flatMap(y => [0, 1, 2].map(x => [[x * 2, y * 2], [x * 2 + 2, y * 2], [x * 2 + 2, y * 2 + 2], [x * 2, y * 2 + 2]] as const));
const g = kantengraph(zellen), kern = (i: number) => i === 4;
describe("Mauer", () => {
  it("umschließt genau den Kern", () => {
    const ring = mauerKanten(g, kern);
    expect(ring.length).toBe(4);
    expect(ring.reduce((s, nr) => s + g.kanten[nr]!.laenge, 0)).toBeCloseTo(8, 6);
  });
  it("setzt Tore an Mauerecken, gestreut, nie gesperrt", () => {
    const ring = mauerKanten(g, kern);
    const tore = waehleTore(g, ring, kern, [3, 3], 2, p => p[0] === 2 && p[1] === 2, [0, 3]);
    expect(tore.length).toBe(2);
    const punkte = tore.map(t => g.ecken[t]!);
    expect(punkte).not.toContainEqual([2, 2]);
    expect(Math.hypot(punkte[0]![0] - punkte[1]![0], punkte[0]![1] - punkte[1]![1])).toBeCloseTo(Math.SQRT2 * 2, 6);
  });
  it("versetzt die Mauer nach außen und stellt Türme an Ecken und lange Seiten", () => {
    const ring = mauerKanten(g, kern);
    const linien = mauerLinien(g, ring, i => schwerpunkt(zellen[i]!), kern, .3);
    for (const l of linien) for (const p of [l.a, l.b]) expect(Math.max(Math.abs(p[0] - 3), Math.abs(p[1] - 3))).toBeGreaterThan(1.05);
    expect(turmPunkte(linien, 6).length).toBe(4);
    expect(turmPunkte(linien, .9).length).toBeGreaterThan(4);
  });
  it("zeichnet runde Türme ohne Winkelfunktion", () => {
    const t = zwoelfeck([0, 0], 1);
    expect(t.length).toBe(12);
    expect(flaeche(t)).toBeCloseTo(3, 6);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run packages/forge/test/viertel-mauer.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { q, qp, type Polygon, type Punkt } from "../../polygon.ts";
import type { Kantengraph } from "./graph.ts";

/** Einheitsvektoren für 0°, 30°, …, 330° — Zahlliterale statt Winkelfunktion. */
const S = .8660254037844386;
const ZWOELF: readonly Punkt[] = [[1, 0], [S, .5], [.5, S], [0, 1], [-.5, S], [-S, .5], [-1, 0], [-S, -.5], [-.5, -S], [0, -1], [.5, -S], [S, -.5]];
export const zwoelfeck = (m: Punkt, radius: number): Polygon => ZWOELF.map(([x, y]) => qp([m[0] + x * radius, m[1] + y * radius]));

export function mauerKanten(g: Kantengraph, istKern: (zelle: number) => boolean): number[] {
  return g.kanten.filter(k => k.f2 >= 0 && istKern(k.f1) !== istKern(k.f2)).map(k => k.nr);
}

/** Tore sind Mauerecken, von denen eine Kante ins Umland führt. Das erste liegt `start`
 *  (der Richtung des Flusses oder dem Zufall) am nächsten, jedes weitere so weit weg von den
 *  schon gewählten wie möglich — gemessen als Skalarprodukt der Richtungen, ohne Winkel. */
export function waehleTore(g: Kantengraph, ring: readonly number[], istInnen: (zelle: number) => boolean, mitte: Punkt, anzahl: number, gesperrt: (p: Punkt) => boolean, start: Punkt): number[] {
  const ringEcken = [...new Set(ring.flatMap(nr => [g.kanten[nr]!.u, g.kanten[nr]!.v]))].sort((a, b) => a - b);
  const kandidaten = ringEcken.filter(e => !gesperrt(g.ecken[e]!) && g.an[e]!.some(nr => {
    const k = g.kanten[nr]!;
    return k.f2 >= 0 && !istInnen(k.f1) && !istInnen(k.f2);
  }));
  const richtung = (p: Punkt): Punkt => { const dx = p[0] - mitte[0], dy = p[1] - mitte[1], n = Math.sqrt(dx * dx + dy * dy) || 1; return [dx / n, dy / n]; };
  const s = richtung(start), gewaehlt: number[] = [];
  const erstes = [...kandidaten].sort((a, b) => {
    const da = richtung(g.ecken[a]!), db = richtung(g.ecken[b]!);
    return (db[0] * s[0] + db[1] * s[1]) - (da[0] * s[0] + da[1] * s[1]) || a - b;
  })[0];
  if (erstes === undefined) return [];
  gewaehlt.push(erstes);
  while (gewaehlt.length < anzahl) {
    let beste = -1, besterWert = Infinity;
    for (const e of kandidaten) {
      if (gewaehlt.includes(e)) continue;
      const d = richtung(g.ecken[e]!), naechster = Math.max(...gewaehlt.map(x => { const o = richtung(g.ecken[x]!); return d[0] * o[0] + d[1] * o[1]; }));
      if (naechster < besterWert - 1e-9) { besterWert = naechster; beste = e; }
    }
    if (beste < 0 || besterWert > .5) break; // näher als 60° an einem vorhandenen Tor: kein weiteres
    gewaehlt.push(beste);
  }
  return gewaehlt;
}

/** Jede Ringkante um `versatz` nach außen geschoben, Ecken abgeschrägt: eine geschlossene Linie
 *  ohne Verkettung (die an Y-Verzweigungen nicht definiert wäre, `polygon.ts: aussenkanten`). */
export function mauerLinien(g: Kantengraph, ring: readonly number[], kernSchwerpunkt: (zelle: number) => Punkt, istKern: (zelle: number) => boolean, versatz: number): MauerLinie[] {
  const linien: MauerLinie[] = [], ecken = new Map<number, Punkt[]>();
  for (const nr of ring) {
    const k = g.kanten[nr]!, kern = istKern(k.f1) ? k.f1 : k.f2, c = kernSchwerpunkt(kern);
    const dx = k.bis[0] - k.von[0], dy = k.bis[1] - k.von[1], l = k.laenge || 1;
    let nx = -dy / l, ny = dx / l;
    const mx = (k.von[0] + k.bis[0]) / 2, my = (k.von[1] + k.bis[1]) / 2;
    if (nx * (c[0] - mx) + ny * (c[1] - my) > 0) { nx = -nx; ny = -ny; } // nach außen
    const a = qp([k.von[0] + nx * versatz, k.von[1] + ny * versatz]), b = qp([k.bis[0] + nx * versatz, k.bis[1] + ny * versatz]);
    linien.push({ a, b, pfad: `mauer.${q(k.von[0])}_${q(k.von[1])}.${q(k.bis[0])}_${q(k.bis[1])}` });
    for (const [e, p] of [[k.u, a], [k.v, b]] as const) ecken.set(e, [...(ecken.get(e) ?? []), p]);
  }
  for (const [e, punkte] of [...ecken].sort((x, y) => x[0] - y[0]))
    if (punkte.length === 2 && (punkte[0]![0] !== punkte[1]![0] || punkte[0]![1] !== punkte[1]![1]))
      linien.push({ a: punkte[0]!, b: punkte[1]!, pfad: `mauer.ecke.${q(g.ecken[e]![0])}_${q(g.ecken[e]![1])}` });
  return linien;
}
export interface MauerLinie { readonly a: Punkt; readonly b: Punkt; readonly pfad: string }

/** Türme an jedem Linienende (zusammengefasst auf 0,25 Zellen) und entlang langer Seiten. */
export function turmPunkte(linien: readonly MauerLinie[], abstand: number): Punkt[] {
  const punkte: Punkt[] = [];
  const add = (p: Punkt) => { if (!punkte.some(o => Math.abs(o[0] - p[0]) < .25 && Math.abs(o[1] - p[1]) < .25)) punkte.push(qp(p)); };
  for (const l of linien) {
    const mitte: Punkt = [(l.a[0] + l.b[0]) / 2, (l.a[1] + l.b[1]) / 2];
    // Eine Eckabschrägung trägt einen Turm in ihrer Mitte, nicht zwei an ihren Enden.
    if (l.pfad.startsWith("mauer.ecke.")) { add(mitte); continue; }
    const laenge = Math.sqrt((l.b[0] - l.a[0]) ** 2 + (l.b[1] - l.a[1]) ** 2), zwischen = Math.floor(laenge / abstand);
    for (let i = 1; i <= zwischen; i++) { const t = i / (zwischen + 1); add([l.a[0] + (l.b[0] - l.a[0]) * t, l.a[1] + (l.b[1] - l.a[1]) * t]); }
  }
  for (const l of linien) if (!l.pfad.startsWith("mauer.ecke.")) for (const p of [l.a, l.b])
    if (!linien.some(e => e.pfad.startsWith("mauer.ecke.") && (Math.abs(e.a[0] - p[0]) < 1e-6 && Math.abs(e.a[1] - p[1]) < 1e-6 || Math.abs(e.b[0] - p[0]) < 1e-6 && Math.abs(e.b[1] - p[1]) < 1e-6))) add(p);
  return punkte.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
```
(Test „4 Türme bei Abstand 6": Quadrat 2×2 → vier Seiten mit abgeschrägten Ecken → vier Eckmitten, keine Zwischentürme. Bei Abstand 0,9 kommen Zwischentürme dazu.)

- [ ] **Step 4: Run** — Expected: PASS. Falls die Eckenzahl abweicht, Testgeometrie prüfen, nicht die Erwartung zurechtbiegen.
- [ ] **Step 5: Commit** `feat(forge): town wall ring, spread gates and tower points`.

---

### Task 8: Hauptstraßen und Straßenbänder

**Files:**
- Create: `packages/forge/src/stadt/viertel/wege.ts`
- Test: `packages/forge/test/viertel-wege.test.ts`

**Interfaces:**
- Consumes: Task 5 (`weg`, `Kantengraph`), Task 7 (Tore), `Gasse` aus `gemeinsam.ts`.
- Produces:
```ts
export interface WegeAuftrag { readonly g: Kantengraph; readonly istStadt: (z: number) => boolean; readonly istKern: (z: number) => boolean; readonly ring: ReadonlySet<number>; readonly markt: number; readonly tore: readonly number[]; readonly mitte: Punkt; readonly breite: number; readonly hoehe: number; readonly kosten: (k: Kante) => number /* Zuschlag: Fluss = Brücke, See/Fels = Infinity */ }
export interface Wege { readonly haupt: ReadonlySet<number>; readonly ausfall: ReadonlySet<number> }
export function hauptstrassen(a: WegeAuftrag): Wege;
export interface Breiten { readonly haupt: number; readonly gasse: number; readonly wall: number; readonly ausfall: number }
export function strassenBaender(g: Kantengraph, a: { istStadt(z: number): boolean; ring: ReadonlySet<number>; wege: Wege; breiten: Breiten; zelleVon(z: number): Polygon; breite: number; hoehe: number; id(...pfad: string[]): string }): { gassen: Gasse[]; kanteZuGasse: ReadonlyMap<number, number> };
```
Regeln: Straße ist jede Kante mit mindestens einer Stadtseite, nicht am Rahmen; Ringkanten werden einseitig nach innen (Wallgasse, Breite `wall`); Kanten Stadt↔Flur einseitig nach innen (`gasse`); Ausfallkanten zweiseitig (`ausfall`, Art `hauptstrasse`); Hauptkanten zweiseitig (`haupt`). `Gasse.a`/`.b` sind Zellindizes (einseitig: `b = a`), damit `nachbarn` wie in v8 funktioniert.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from "vitest";
import { kantengraph } from "../src/stadt/viertel/graph.ts";
import { hauptstrassen, strassenBaender } from "../src/stadt/viertel/wege.ts";
const zellen = [0, 1, 2, 3, 4].flatMap(y => [0, 1, 2, 3, 4].map(x => [[x * 2, y * 2], [x * 2 + 2, y * 2], [x * 2 + 2, y * 2 + 2], [x * 2, y * 2 + 2]] as const));
const g = kantengraph(zellen);
const innen = (i: number) => { const x = i % 5, y = Math.floor(i / 5); return x >= 1 && x <= 3 && y >= 1 && y <= 3; };
const kern = (i: number) => i === 12;
describe("Wege", () => {
  it("führt jedes Tor zum Markt und weiter zum Kartenrand", () => {
    const tore = [g.finde([2, 4]), g.finde([8, 6])];
    const w = hauptstrassen({ g, istStadt: innen, istKern: innen, ring: new Set(), markt: 12, tore, mitte: [5, 5], breite: 10, hoehe: 10, kosten: () => 0 });
    const marktEcken = new Set(g.kanten.filter(k => k.f1 === 12 || k.f2 === 12).flatMap(k => [k.u, k.v]));
    for (const t of tore) expect([...w.haupt].some(nr => g.kanten[nr]!.u === t || g.kanten[nr]!.v === t)).toBe(true);
    expect([...w.haupt].some(nr => marktEcken.has(g.kanten[nr]!.u) || marktEcken.has(g.kanten[nr]!.v))).toBe(true);
    expect([...w.ausfall].some(nr => { const k = g.kanten[nr]!; return [k.von, k.bis].some(p => p[0] === 0 || p[0] === 10 || p[1] === 0 || p[1] === 10); })).toBe(true);
  });
  it("baut Bänder: zweiseitig innen, einseitig an Wall und Ortsrand", () => {
    const w = { haupt: new Set<number>(), ausfall: new Set<number>() };
    let n = 0;
    const { gassen } = strassenBaender(g, { istStadt: innen, ring: new Set(), wege: w, breiten: { haupt: 1, gasse: .5, wall: .4, ausfall: .8 }, zelleVon: i => zellen[i]!, breite: 10, hoehe: 10, id: () => `g${n++}` });
    expect(gassen.filter(s => s.a === s.b).length).toBe(12); // 12 Randkanten der 3×3-Stadt
    expect(gassen.filter(s => s.a !== s.b).length).toBe(12); // 12 Innenkanten
  });
});
```
(`kern` bleibt im Test ungenutzt, falls nicht gebraucht — dann entfernen.)

- [ ] **Step 2: Run** — Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { clipHalbebene, q, qp, type Polygon, type Punkt } from "../../polygon.ts";
import type { Gasse } from "../gemeinsam.ts";
import { weg, type Kante, type Kantengraph } from "./graph.ts";

export interface WegeAuftrag { readonly g: Kantengraph; readonly istStadt: (z: number) => boolean; readonly istKern: (z: number) => boolean; readonly ring: ReadonlySet<number>; readonly markt: number; readonly tore: readonly number[]; readonly mitte: Punkt; readonly breite: number; readonly hoehe: number; readonly kosten: (k: Kante) => number }
export interface Wege { readonly haupt: ReadonlySet<number>; readonly ausfall: ReadonlySet<number> }

const amRahmen = (p: Punkt, breite: number, hoehe: number) => p[0] < .01 || p[1] < .01 || p[0] > breite - .01 || p[1] > hoehe - .01;

/** Tor → Markt über die Kanten zwischen Stadtflecken; benutzte Kanten kosten die Hälfte, damit
 *  Straßen sich bündeln wie gewachsene Wege. Danach Tor → Kartenrand durch die Flur. */
export function hauptstrassen(a: WegeAuftrag): Wege {
  const { g } = a, haupt = new Set<number>(), ausfall = new Set<number>();
  const marktEcken = new Set(g.kanten.filter(k => k.f1 === a.markt || k.f2 === a.markt).flatMap(k => [k.u, k.v]));
  const innen = (k: Kante) => k.f2 >= 0 && a.istStadt(k.f1) && a.istStadt(k.f2) && !a.ring.has(k.nr);
  for (const tor of a.tore) {
    const pfad = weg(g, tor, marktEcken, k => innen(k) ? k.laenge * (haupt.has(k.nr) ? .45 : 1) + a.kosten(k) : Infinity);
    for (const nr of pfad ?? []) haupt.add(nr);
    const t = g.ecken[tor]!, dx = t[0] - a.mitte[0], dy = t[1] - a.mitte[1], n = Math.sqrt(dx * dx + dy * dy) || 1;
    const rand = new Set(g.ecken.map((p, e) => ({ p, e })).filter(({ p }) => {
      if (!amRahmen(p, a.breite, a.hoehe)) return false;
      const ex = p[0] - a.mitte[0], ey = p[1] - a.mitte[1], m = Math.sqrt(ex * ex + ey * ey) || 1;
      return (ex * dx + ey * dy) / (m * n) >= .6;
    }).map(({ e }) => e));
    const draussen = weg(g, tor, rand, k => (a.istKern(k.f1) || (k.f2 >= 0 && a.istKern(k.f2))) ? Infinity : k.laenge * (ausfall.has(k.nr) ? .5 : 1) + a.kosten(k));
    for (const nr of draussen ?? []) ausfall.add(nr);
  }
  return { haupt, ausfall };
}

export interface Breiten { readonly haupt: number; readonly gasse: number; readonly wall: number; readonly ausfall: number }

export function strassenBaender(g: Kantengraph, a: { istStadt(z: number): boolean; ring: ReadonlySet<number>; wege: Wege; breiten: Breiten; zelleVon(z: number): Polygon; breite: number; hoehe: number; id(...pfad: string[]): string }): { gassen: Gasse[]; kanteZuGasse: ReadonlyMap<number, number> } {
  const gassen: Gasse[] = [], kanteZuGasse = new Map<number, number>();
  const kanten = [...g.kanten].sort((x, y) => x.von[1] - y.von[1] || x.von[0] - y.von[0] || x.bis[1] - y.bis[1] || x.bis[0] - y.bis[0]);
  for (const k of kanten) {
    if (amRahmen(k.von, a.breite, a.hoehe) && amRahmen(k.bis, a.breite, a.hoehe)) continue;
    const s1 = a.istStadt(k.f1), s2 = k.f2 >= 0 && a.istStadt(k.f2);
    const ausfall = a.wege.ausfall.has(k.nr);
    if (!s1 && !s2 && !ausfall) continue;
    const dx = k.bis[0] - k.von[0], dy = k.bis[1] - k.von[1], l = k.laenge;
    if (l < .3) continue;
    const einseitig = !ausfall && (a.ring.has(k.nr) || s1 !== s2);
    const breite = ausfall && !(s1 || s2) ? a.breiten.ausfall : a.wege.haupt.has(k.nr) ? a.breiten.haupt : a.ring.has(k.nr) ? a.breiten.wall : a.breiten.gasse;
    let nx = -dy / l, ny = dx / l;
    const innenZelle = einseitig ? (a.ring.has(k.nr) ? (s1 && !s2 ? k.f1 : k.f2) : s1 ? k.f1 : k.f2) : k.f1;
    if (einseitig) {
      const z = a.zelleVon(innenZelle), c = z.reduce((s, p) => [s[0] + p[0] / z.length, s[1] + p[1] / z.length] as Punkt, [0, 0] as Punkt);
      if (nx * (c[0] - (k.von[0] + k.bis[0]) / 2) + ny * (c[1] - (k.von[1] + k.bis[1]) / 2) < 0) { nx = -nx; ny = -ny; }
    }
    const h = breite / 2, roh: Polygon = einseitig
      ? [k.von, k.bis, [k.bis[0] + nx * breite, k.bis[1] + ny * breite], [k.von[0] + nx * breite, k.von[1] + ny * breite]]
      : [[k.von[0] + nx * h, k.von[1] + ny * h], [k.bis[0] + nx * h, k.bis[1] + ny * h], [k.bis[0] - nx * h, k.bis[1] - ny * h], [k.von[0] - nx * h, k.von[1] - ny * h]];
    let band = roh;
    for (const [rx, ry, rc] of [[-1, 0, 0], [1, 0, a.breite], [0, -1, 0], [0, 1, a.hoehe]] as const) band = clipHalbebene(band, rx, ry, rc);
    if (band.length < 3) continue;
    const zA = einseitig ? innenZelle : k.f1, zB = einseitig ? innenZelle : (k.f2 >= 0 ? k.f2 : k.f1);
    kanteZuGasse.set(k.nr, gassen.length);
    gassen.push({ id: a.id("gasse", `${q(k.von[0])}_${q(k.von[1])}`, `${q(k.bis[0])}_${q(k.bis[1])}`), art: a.wege.haupt.has(k.nr) || ausfall ? "hauptstrasse" : "gasse", a: zA, b: zB, von: k.von, bis: k.bis, band: band.map(qp) });
  }
  return { gassen, kanteZuGasse };
}
```
(Die Zellindizes `f1`/`f2` beziehen sich auf die Zellenliste, aus der der Graph gebaut wurde — in Task 10 ist das die Liste aller Flecken in Spiralreihenfolge.)

- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(forge): arterial roads by shortest path and street bands per edge`.

---

### Task 9: Parzellen, Hausformen, Markt und Dom; Burg; Flur; Namen

Vier Module, ein Prüfzyklus: sie sind einzeln testbar, aber erst zusammen ergeben sie eine Stadt. Jedes Modul bekommt seinen eigenen Testblock in `packages/forge/test/viertel-bau.test.ts`.

**Files:**
- Create: `packages/forge/src/stadt/viertel/parzellen.ts`, `burg.ts`, `flur.ts`, `namen.ts`
- Test: `packages/forge/test/viertel-bau.test.ts`

**Interfaces:**
- Consumes: `halbiere`, `einwaertsKanten` (Task 1); `hausImLos`, `getrennteDaecher`, `ohne`, `Gasse` (Task 3); `Rolle` (Task 6); `zwoelfeck` (Task 7).
- Produces:
```ts
// parzellen.ts
export interface Bau { readonly pfad: string; readonly umriss: Polygon; readonly los: Polygon; readonly strasse: string; readonly typ: BauwerkTyp | null /* null = nach Rolle würfeln */; readonly titel?: string; readonly rang: number /* 0 = Sonderbau, zuerst behalten */ }
export interface Platz { readonly pfad: string; readonly polygon: Polygon; readonly material: "square" | "path" | "grass" | "forest" }
export interface FleckBau { readonly baue: readonly Bau[]; readonly plaetze: readonly Platz[]; readonly gassen: readonly Gasse[]; readonly hoefe: readonly Polygon[] }
export interface ParzellenAuftrag { readonly nr: number; readonly pfad: string; readonly zelle: Polygon; readonly rolle: Rolle; readonly vorstadt: boolean; readonly art: "weiler" | "dorf" | "stadt"; readonly randStrassen: readonly Gasse[]; readonly abstaende: readonly number[]; readonly losFlaeche: number; readonly strassenDichte: number; readonly hindernisse: readonly Polygon[]; readonly nurAnHaupt: boolean; readonly r: Zufall; readonly id: (...pfad: string[]) => string }
export function bebaueFleck(a: ParzellenAuftrag): FleckBau;
export const ROLLEN_FAKTOR: Readonly<Record<Rolle, number>>;
// burg.ts
export function baueBurg(a: ParzellenAuftrag): FleckBau & { readonly mauern: readonly { a: Punkt; b: Punkt; pfad: string }[] };
// flur.ts
export function flurStreifen(zelle: Polygon, streifen: number, r: Zufall): Polygon[];
export function bauernhof(zelle: Polygon, strasse: Gasse, pfad: string, r: Zufall): Bau[];
// namen.ts
export interface Viertel { readonly id: string; readonly nutzung: Rolle; readonly name: string; readonly flecken: readonly number[]; readonly flaeche: number; readonly anker: Punkt }
export function viertelBilden(lagen: readonly { nr: number; zelle: Polygon; nachbarn: readonly number[]; kern: boolean }[], rollen: ReadonlyMap<number, Rolle>, mitte: Punkt, r: Zufall): Viertel[];
export function viertelPlan(viertel: readonly Viertel[], zellen: ReadonlyMap<number, Polygon>, breite: number, hoehe: number): SettlementPlan;
```

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from "vitest";
import { rauschen } from "../src/kartenwerk.ts";
import { flaeche, imPolygon, schwerpunkt } from "../src/polygon.ts";
import { getrennteDaecher, type Gasse } from "../src/stadt/gemeinsam.ts";
import { bebaueFleck, type ParzellenAuftrag } from "../src/stadt/viertel/parzellen.ts";
import { baueBurg } from "../src/stadt/viertel/burg.ts";
import { flurStreifen } from "../src/stadt/viertel/flur.ts";
import { viertelBilden, viertelPlan } from "../src/stadt/viertel/namen.ts";
import { parseSettlementPlan } from "@chronicle/szene";

const zelle = [[0, 0], [8, 0], [9, 6], [1, 7]] as const;
const band = (von: readonly [number, number], bis: readonly [number, number], id: string): Gasse => ({ id, art: "gasse", a: 0, b: 0, von, bis, band: [von, bis, [bis[0], bis[1] + .3], [von[0], von[1] + .3]] });
const rand = [band([0, 0], [8, 0], "s1"), band([8, 0], [9, 6], "s2"), band([9, 6], [1, 7], "s3"), band([1, 7], [0, 0], "s4")];
let n = 0;
const auftrag = (extra: Partial<ParzellenAuftrag> = {}): ParzellenAuftrag => ({ nr: 0, pfad: "fleck.0_0", zelle, rolle: "wohnen", vorstadt: false, art: "stadt", randStrassen: rand, abstaende: [.3, .3, .3, .3], losFlaeche: 1.6, strassenDichte: .5, hindernisse: [], nurAnHaupt: false, r: rauschen("00112233445566778899aabbccddeeff"), id: (...p) => `${p.join("/")}#${n++}`, ...extra });
describe("Parzellen", () => {
  it("füllt ein Wohnviertel mit getrennten Häuserzeilen, jedes an einer Straße", () => {
    const b = bebaueFleck(auftrag());
    expect(b.baue.length).toBeGreaterThan(10);
    const strassen = [...rand, ...b.gassen];
    for (const x of b.baue) expect(strassen.some(s => s.id === x.strasse)).toBe(true);
    for (let i = 0; i < b.baue.length; i++) for (let j = i + 1; j < b.baue.length; j++) expect(getrennteDaecher(b.baue[i]!.umriss, b.baue[j]!.umriss)).toBe(true);
  });
  it("schneidet Gassen, wenn Blöcke zu groß werden", () => {
    expect(bebaueFleck(auftrag({ losFlaeche: .8, strassenDichte: 1 })).gassen.length).toBeGreaterThan(0);
  });
  it("lässt ein Adelsviertel lockerer bebaut als ein Armenviertel", () => {
    const adel = bebaueFleck(auftrag({ rolle: "adel" })), arm = bebaueFleck(auftrag({ rolle: "arm" }));
    expect(adel.baue.length).toBeLessThan(arm.baue.length);
  });
  it("macht den Markt einer Stadt zum Platz mit Rathaus", () => {
    const m = bebaueFleck(auftrag({ rolle: "markt" }));
    expect(m.baue.map(b => b.typ)).toContain("rathaus");
    expect(m.plaetze.reduce((s, p) => s + flaeche(p.polygon), 0)).toBeGreaterThan(flaeche(zelle) * .3);
  });
  it("stellt einen Dom mit Kreuzgrundriss in den Tempelbezirk", () => {
    const t = bebaueFleck(auftrag({ rolle: "tempel" }));
    const dom = t.baue.find(b => b.typ === "kirche")!;
    expect(dom.umriss.length).toBe(12);
  });
  it("baut nichts ins Wasser", () => {
    const wasser = [[4, -1], [10, -1], [10, 8], [4, 8]] as const;
    for (const b of bebaueFleck(auftrag({ hindernisse: [wasser] })).baue) expect(imPolygon(schwerpunkt(b.umriss), wasser)).toBe(false);
  });
});
describe("Burg", () => {
  it("hat Bergfried, Kaserne, Ecktürme und eine Mauer mit Tor", () => {
    const b = baueBurg(auftrag({ rolle: "burg" }));
    const typen = b.baue.map(x => x.typ);
    expect(typen).toContain("burg");
    expect(typen.filter(t => t === "turm").length).toBeGreaterThanOrEqual(3);
    expect(b.mauern.length).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < b.baue.length; i++) for (let j = i + 1; j < b.baue.length; j++) expect(getrennteDaecher(b.baue[i]!.umriss, b.baue[j]!.umriss)).toBe(true);
  });
});
describe("Flur und Namen", () => {
  it("teilt Felder in parallele Streifen", () => {
    const s = flurStreifen(zelle, 5, rauschen("00112233445566778899aabbccddeeff"));
    expect(s.length).toBe(5);
    expect(s.reduce((a, p) => a + flaeche(p), 0)).toBeCloseTo(flaeche(zelle), 3);
  });
  it("benennt zusammenhängende Viertel einmal und macht daraus einen gültigen Zonenplan", () => {
    const lagen = [0, 1, 2].map(nr => ({ nr, zelle: [[nr * 4, 0], [nr * 4 + 4, 0], [nr * 4 + 4, 4], [nr * 4, 4]] as const, nachbarn: [nr - 1, nr + 1].filter(x => x >= 0 && x <= 2), kern: true }));
    const rollen = new Map([[0, "handwerk" as const], [1, "handwerk" as const], [2, "markt" as const]]);
    const v = viertelBilden(lagen, rollen, [6, 2], rauschen("00112233445566778899aabbccddeeff"));
    expect(v.map(x => x.nutzung).sort()).toEqual(["handwerk", "markt"]);
    const plan = viertelPlan(v, new Map(lagen.map(l => [l.nr, l.zelle])), 12, 4);
    expect(() => parseSettlementPlan(plan)).not.toThrow();
    expect(plan.zonen.length).toBe(3); // eine Zone je Nicht-Wohn-Fleck
  });
});
```

- [ ] **Step 2: Run** `npx vitest run packages/forge/test/viertel-bau.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement `parzellen.ts`**

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BauwerkTyp } from "@chronicle/szene";
import { abstandPolygonStrecke, clipHalbebene, einwaerts, einwaertsKanten, flaeche, halbiere, huelle, imPolygon, q, qp, schnittKonvex, schwerpunkt, type Polygon, type Punkt } from "../../polygon.ts";
import { getrennteDaecher, hausImLos, ohne, type Gasse, type Hausform, type Zufall } from "../gemeinsam.ts";
import type { Rolle } from "./rollen.ts";

export interface Bau { readonly pfad: string; readonly umriss: Polygon; readonly los: Polygon; readonly strasse: string; readonly typ: BauwerkTyp | null; readonly titel?: string; readonly rang: number }
export interface Platz { readonly pfad: string; readonly polygon: Polygon; readonly material: "square" | "path" | "grass" | "forest" }
export interface FleckBau { readonly baue: readonly Bau[]; readonly plaetze: readonly Platz[]; readonly gassen: readonly Gasse[]; readonly hoefe: readonly Polygon[] }
export interface ParzellenAuftrag { readonly nr: number; readonly pfad: string; readonly zelle: Polygon; readonly rolle: Rolle; readonly vorstadt: boolean; readonly art: "weiler" | "dorf" | "stadt"; readonly randStrassen: readonly Gasse[]; readonly abstaende: readonly number[]; readonly losFlaeche: number; readonly strassenDichte: number; readonly hindernisse: readonly Polygon[]; readonly nurAnHaupt: boolean; readonly r: Zufall; readonly id: (...pfad: string[]) => string }

/** Wie groß ein Los im Verhältnis zum Stadtmittel ist; der Rest der Stadt eicht sich daran. */
export const ROLLEN_FAKTOR: Readonly<Record<Rolle, number>> = Object.freeze({ wohnen: 1, markt: 1.1, handwerk: 1.35, hafen: 1.8, adel: 3, arm: .65, frei: 1, burg: 2, tempel: 1.4 });
interface Mass { readonly zeile: boolean; readonly fuge: number; readonly hof: number; readonly tiefe: number }
const MASS: Readonly<Record<Rolle, Mass>> = Object.freeze({
  wohnen: { zeile: true, fuge: .05, hof: .08, tiefe: 2.2 }, markt: { zeile: true, fuge: .05, hof: .1, tiefe: 2.4 },
  handwerk: { zeile: true, fuge: .07, hof: .15, tiefe: 2.6 }, hafen: { zeile: true, fuge: .09, hof: 0, tiefe: 3 },
  adel: { zeile: false, fuge: .12, hof: .5, tiefe: 3 }, arm: { zeile: true, fuge: .04, hof: 0, tiefe: 1.8 },
  frei: { zeile: false, fuge: .1, hof: 0, tiefe: 2 }, burg: { zeile: false, fuge: .1, hof: 0, tiefe: 2 }, tempel: { zeile: true, fuge: .06, hof: .1, tiefe: 2.2 },
});
const GASSE = .3;

/** Blöcke durch Halbieren: große Stücke bekommen eine Gasse, kleine werden ohne Lücke zu Losen. */
function zerteile(poly: Polygon, los: number, block: number, pfad: string, tiefe: number, a: ParzellenAuftrag, lose: { poly: Polygon; pfad: string }[], gassen: Gasse[]): void {
  const f = flaeche(poly);
  if (f <= los * 1.35 || tiefe > 12) { lose.push({ poly: poly.map(qp), pfad }); return; }
  const mitGasse = f > block && tiefe < 4;
  const h = halbiere(poly, a.r.zahl(.38, .62), a.r.zahl(-.14, .14), mitGasse ? GASSE : 0);
  if (!h) { lose.push({ poly: poly.map(qp), pfad }); return; }
  if (mitGasse && h.luecke.length >= 3) {
    gassen.push({ id: a.id("gasse", pfad, "quer"), art: "gasse", a: a.nr, b: a.nr, von: qp(h.von), bis: qp(h.bis), band: h.luecke.map(qp) });
  }
  zerteile(h.a, los, block, `${pfad}.a`, tiefe + 1, a, lose, gassen);
  zerteile(h.b, los, block, `${pfad}.b`, tiefe + 1, a, lose, gassen);
}

/** Die nächste Straße vor einem Los, oder `null`, wenn es innen liegt (dann wird es Hof). */
function vorDerTuer(los: Polygon, strassen: readonly Gasse[]): { gasse: Gasse; abstand: number } | null {
  let beste: Gasse | null = null, besterAbstand = Infinity;
  for (const s of strassen) { const d = abstandPolygonStrecke(los, s.von, s.bis); if (d < besterAbstand) { besterAbstand = d; beste = s; } }
  if (!beste) return null;
  const halbe = flaeche(beste.band) / (Math.sqrt((beste.bis[0] - beste.von[0]) ** 2 + (beste.bis[1] - beste.von[1]) ** 2) || 1);
  return besterAbstand <= halbe + .35 ? { gasse: beste, abstand: besterAbstand } : null;
}

/** Zeilenhaus: das Los ohne Fuge, hinten auf `tiefe` gekappt — der Rest ist Hinterhof. */
function zeilenhaus(los: Polygon, gasse: Gasse, fuge: number, tiefe: number): Polygon {
  const innen = einwaerts(los, fuge);
  if (innen.length < 3) return [];
  const dx = gasse.bis[0] - gasse.von[0], dy = gasse.bis[1] - gasse.von[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
  let nx = -dy / l, ny = dx / l;
  const s = schwerpunkt(los);
  if (nx * (s[0] - gasse.von[0]) + ny * (s[1] - gasse.von[1]) < 0) { nx = -nx; ny = -ny; }
  const front = Math.min(...innen.map(p => nx * p[0] + ny * p[1]));
  return clipHalbebene(innen, nx, ny, front + tiefe).map(qp);
}

function kreuz(mitte: Punkt, u: Punkt, laenge: number, breite: number): Polygon {
  const n: Punkt = [-u[1], u[0]], L = laenge / 2, W = breite / 2, qa = L * .38, T = breite * .45, WQ = breite * 1.15;
  const at = (x: number, y: number): Punkt => qp([mitte[0] + u[0] * x + n[0] * y, mitte[1] + u[1] * x + n[1] * y]);
  return [at(-L, -W), at(qa - T, -W), at(qa - T, -WQ), at(qa + T, -WQ), at(qa + T, -W), at(L, -W), at(L, W), at(qa + T, W), at(qa + T, WQ), at(qa - T, WQ), at(qa - T, W), at(-L, W)];
}
const achse = (poly: Polygon): { u: Punkt; laenge: number; breite: number } => {
  let beste = 0, bl = -1;
  for (let i = 0; i < poly.length; i++) { const a = poly[(i + poly.length - 1) % poly.length]!, b = poly[i]!, l = Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2); if (l > bl) { bl = l; beste = i; } }
  const a = poly[(beste + poly.length - 1) % poly.length]!, b = poly[beste]!, u: Punkt = [(b[0] - a[0]) / bl, (b[1] - a[1]) / bl];
  const along = poly.map(p => p[0] * u[0] + p[1] * u[1]), across = poly.map(p => -p[0] * u[1] + p[1] * u[0]);
  return { u, laenge: Math.max(...along) - Math.min(...along), breite: Math.max(...across) - Math.min(...across) };
};
const rechteck = (m: Punkt, u: Punkt, l: number, b: number): Polygon => { const n: Punkt = [-u[1], u[0]]; return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => qp([m[0] + u[0] * x * l / 2 + n[0] * y * b / 2, m[1] + u[1] * x * l / 2 + n[1] * y * b / 2])); };

/** Ein Platz mit einem Bau darauf: der Platz ist, was vom Fleck um den Bau (mit Abstand) bleibt. */
function platzUm(innen: Polygon, bauteile: readonly Polygon[], pfad: string, material: Platz["material"]): Platz[] {
  let stuecke: Polygon[] = [innen];
  for (const teil of bauteile) stuecke = stuecke.flatMap(s => ohne(s, teil));
  return stuecke.filter(s => s.length >= 3 && flaeche(s) > .05).map((polygon, i) => ({ pfad: `${pfad}.platz.${i}`, polygon: polygon.map(qp), material }));
}

export function bebaueFleck(a: ParzellenAuftrag): FleckBau {
  const innen = einwaertsKanten(a.zelle, a.abstaende).map(qp);
  if (innen.length < 3 || flaeche(innen) < .6) return { baue: [], plaetze: [], gassen: [], hoefe: [] };
  const baue: Bau[] = [], plaetze: Platz[] = [], gassen: Gasse[] = [];
  const nass = (p: Polygon) => a.hindernisse.some(w => flaeche(schnittKonvex(p, w)) > 1e-6);

  if (a.rolle === "frei") return { baue, plaetze: [{ pfad: `${a.pfad}.park`, polygon: innen, material: "forest" }], gassen, hoefe: [] };
  if (a.rolle === "markt" && a.art !== "weiler") {
    const { u, laenge, breite } = achse(innen), m = schwerpunkt(innen), strasse = a.randStrassen[0];
    if (a.art === "stadt" && strasse) {
      const halle = rechteck(m, u, Math.min(laenge * .34, 3.2), Math.min(breite * .26, 2.2));
      if (halle.every(p => imPolygon(p, innen)) && !nass(halle)) {
        const platz = platzUm(innen, [einwaerts(halle, -.35)], a.pfad, "square");
        const naechster = platz.reduce((best, p) => flaeche(p.polygon) > flaeche(best.polygon) ? p : best, platz[0]!);
        baue.push({ pfad: `${a.pfad}.rathaus`, umriss: halle, los: halle, strasse: a.id("markt", naechster.pfad), typ: "rathaus", titel: "Rathaus", rang: 0 });
        return { baue, plaetze: platz, gassen, hoefe: [] };
      }
    }
    // Dorf: der Anger — Wiese, am Rand Kirche und Taverne an ihren Straßen.
    plaetze.push({ pfad: `${a.pfad}.anger`, polygon: innen, material: a.art === "stadt" ? "square" : "grass" });
    return { baue, plaetze, gassen, hoefe: [] };
  }
  if (a.rolle === "tempel") {
    const { u, laenge, breite } = achse(innen), m = schwerpunkt(innen);
    for (const s of [1, .85, .72, .6]) {
      const dom = kreuz(m, u, laenge * .62 * s, Math.min(breite * .26, laenge * .2) * s);
      if (!dom.every(p => imPolygon(p, innen)) || nass(dom)) continue;
      const schiff = rechteck(m, u, laenge * .62 * s + .5, Math.min(breite * .26, laenge * .2) * s + .5);
      const qa = laenge * .62 * s / 2 * .38, quer: Punkt = [m[0] + u[0] * qa, m[1] + u[1] * qa];
      const querhaus = rechteck(quer, u, Math.min(breite * .26, laenge * .2) * s * .9 + .5, Math.min(breite * .26, laenge * .2) * s * 2.3 + .5);
      const platz = platzUm(innen, [schiff, querhaus], a.pfad, "square");
      const groesster = platz.reduce((best, p) => flaeche(p.polygon) > flaeche(best.polygon) ? p : best, platz[0]!);
      baue.push({ pfad: `${a.pfad}.dom`, umriss: dom, los: innen, strasse: a.id("markt", groesster.pfad), typ: "kirche", rang: 0 });
      return { baue, plaetze: platz, gassen, hoefe: [] };
    }
  }

  const mass = MASS[a.rolle], losZiel = a.losFlaeche * (a.vorstadt ? 1.4 : 1);
  const block = losZiel * (10 - a.strassenDichte * 5);
  const lose: { poly: Polygon; pfad: string }[] = [];
  zerteile(innen, losZiel, block, a.pfad, 0, a, lose, gassen);
  const strassen = [...a.randStrassen, ...gassen], hoefe: Polygon[] = [];
  for (const los of lose) {
    const tuer = vorDerTuer(los.poly, a.nurAnHaupt ? a.randStrassen.filter(s => s.art === "hauptstrasse") : strassen);
    if (!tuer || nass(los.poly)) { hoefe.push(los.poly); continue; }
    const gross = flaeche(los.poly) > losZiel * 1.6;
    let umriss: Polygon;
    if (mass.zeile && !a.vorstadt) umriss = zeilenhaus(los.poly, tuer.gasse, mass.fuge, mass.tiefe);
    else {
      const form: Hausform = gross && a.r.chance(mass.hof) ? (a.r.chance(.5) ? "u" : "l") : "rechteck";
      const w = Math.max(.65, Math.min(3.2, Math.sqrt(flaeche(los.poly)) * a.r.zahl(.6, .78)));
      umriss = hausImLos(einwaerts(los.poly, .09), tuer.gasse, w, w * a.r.zahl(.8, 1.25), form);
    }
    if (umriss.length < 3 || flaeche(umriss) < .2 || nass(umriss)) { hoefe.push(los.poly); continue; }
    if (baue.some(b => !getrennteDaecher(b.umriss, umriss))) { hoefe.push(los.poly); continue; }
    baue.push({ pfad: `${los.pfad}.los.${q(schwerpunkt(los.poly)[0])}_${q(schwerpunkt(los.poly)[1])}`, umriss: umriss.map(qp), los: los.poly, strasse: tuer.gasse.id, typ: null, rang: 2 });
  }
  return { baue, plaetze, gassen, hoefe };
}
```
Hinweis: `ohne` verlangt ein konvexes zweites Polygon — Rathaus und die zwei Dom-Rechtecke sind konvex. Die `strasse` eines Rathauses/Doms ist die Id des größten Platzstücks; Task 10 legt diese Plätze mit genau dieser Id (`id("markt", platz.pfad)`) als Straßen an.

- [ ] **Step 4: Implement `burg.ts`**

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { einwaerts, einwaertsKanten, flaeche, imPolygon, qp, schwerpunkt, type Polygon, type Punkt } from "../../polygon.ts";
import { freieMauer, getrennteDaecher, mitAbstand, ohne } from "../gemeinsam.ts";
import { zwoelfeck } from "./mauer.ts";
import type { Bau, FleckBau, ParzellenAuftrag, Platz } from "./parzellen.ts";

const TURM = .42;
/** Die Burg: eigene Mauer mit Ecktürmen, Bergfried in der Mitte, Kaserne an der längsten Seite,
 *  Burghof als Platz. Das Tor liegt auf der Seite, an der die erste Randstraße (die zum Markt)
 *  vorbeiführt; ein kurzer Burgweg verbindet es mit ihr. */
export function baueBurg(a: ParzellenAuftrag): FleckBau & { readonly mauern: readonly { a: Punkt; b: Punkt; pfad: string }[] } {
  const innen = einwaertsKanten(a.zelle, a.abstaende.map(d => d + .2)).map(qp);
  const leer = { baue: [], plaetze: [], gassen: [], hoefe: [], mauern: [] };
  if (innen.length < 3 || flaeche(innen) < 6) return leer;
  const m = schwerpunkt(innen), baue: Bau[] = [], plaetze: Platz[] = [];
  const hofId = a.id("markt", `${a.pfad}.burghof.0`);
  // Ecktürme: nach innen versetzt, damit sie die Straße vor der Burg nicht berühren.
  for (const [i, p] of innen.entries()) {
    const dx = m[0] - p[0], dy = m[1] - p[1], n = Math.sqrt(dx * dx + dy * dy) || 1;
    const c: Punkt = [p[0] + dx / n * TURM * 1.3, p[1] + dy / n * TURM * 1.3];
    const turm = zwoelfeck(c, TURM);
    if (!turm.every(q => imPolygon(q, innen)) || baue.some(b => !getrennteDaecher(b.umriss, turm))) continue;
    baue.push({ pfad: `${a.pfad}.burgturm.${i}`, umriss: turm, los: turm, strasse: hofId, typ: "turm", titel: "Burgturm", rang: 0 });
  }
  const kern = einwaerts(innen, TURM * 2.4);
  if (kern.length < 3) return leer;
  const seite = Math.sqrt(flaeche(kern)) * .42, k = schwerpunkt(kern);
  const bergfried: Polygon = [[k[0] - seite / 2, k[1] - seite / 2], [k[0] + seite / 2, k[1] - seite / 2], [k[0] + seite / 2, k[1] + seite / 2], [k[0] - seite / 2, k[1] + seite / 2]].map(p => qp(p as Punkt));
  if (bergfried.every(p => imPolygon(p, kern))) baue.push({ pfad: `${a.pfad}.bergfried`, umriss: bergfried, los: bergfried, strasse: hofId, typ: "burg", titel: "Bergfried", rang: 0 });
  // Kaserne: ein Streifen an der längsten Kante des Kerns.
  let beste = 0, bl = -1;
  for (let i = 0; i < kern.length; i++) { const p = kern[(i + kern.length - 1) % kern.length]!, q = kern[i]!, l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l > bl) { bl = l; beste = i; } }
  const e0 = kern[(beste + kern.length - 1) % kern.length]!, e1 = kern[beste]!, ux = (e1[0] - e0[0]) / bl, uy = (e1[1] - e0[1]) / bl;
  let nx = -uy, ny = ux; if (nx * (k[0] - e0[0]) + ny * (k[1] - e0[1]) < 0) { nx = -nx; ny = -ny; }
  const t = .9, s0 = .2 * bl, s1 = .8 * bl;
  const kaserne: Polygon = [[e0[0] + ux * s0, e0[1] + uy * s0], [e0[0] + ux * s1, e0[1] + uy * s1], [e0[0] + ux * s1 + nx * t, e0[1] + uy * s1 + ny * t], [e0[0] + ux * s0 + nx * t, e0[1] + uy * s0 + ny * t]].map(p => qp(p as Punkt));
  if (kaserne.every(p => imPolygon(p, kern)) && baue.every(b => getrennteDaecher(b.umriss, kaserne))) baue.push({ pfad: `${a.pfad}.kaserne`, umriss: kaserne, los: kaserne, strasse: hofId, typ: "kaserne", titel: "Kaserne", rang: 0 });
  let hof: Polygon[] = [innen];
  for (const b of baue) hof = hof.flatMap(s => ohne(s, mitAbstand(b.umriss.length === 12 ? [b.umriss[0]!, b.umriss[3]!, b.umriss[6]!, b.umriss[9]!] : b.umriss, .12)));
  hof.filter(s => s.length >= 3 && flaeche(s) > .05).forEach((polygon, i) => plaetze.push({ pfad: `${a.pfad}.burghof.${i}`, polygon: polygon.map(qp), material: "square" }));
  // Mauer auf dem Rand von `innen`, das Tor dort, wo die erste Randstraße am nächsten ist.
  const tor = a.randStrassen[0];
  const mauern: { a: Punkt; b: Punkt; pfad: string }[] = [];
  const hindernisse = baue.filter(b => b.typ === "turm").map(b => mitAbstand([b.umriss[0]!, b.umriss[3]!, b.umriss[6]!, b.umriss[9]!], .02));
  let torKante = -1, torAbstand = Infinity;
  if (tor) for (let i = 0; i < innen.length; i++) {
    const p = innen[(i + innen.length - 1) % innen.length]!, q = innen[i]!, mid: Punkt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const d = Math.hypot(mid[0] - (tor.von[0] + tor.bis[0]) / 2, mid[1] - (tor.von[1] + tor.bis[1]) / 2);
    if (d < torAbstand) { torAbstand = d; torKante = i; }
  }
  for (let i = 0; i < innen.length; i++) {
    const p = innen[(i + innen.length - 1) % innen.length]!, q = innen[i]!;
    const stuecke = i === torKante
      ? [[p, [p[0] + (q[0] - p[0]) * .4, p[1] + (q[1] - p[1]) * .4]], [[p[0] + (q[0] - p[0]) * .6, p[1] + (q[1] - p[1]) * .6], q]] as [Punkt, Punkt][]
      : [[p, q]] as [Punkt, Punkt][];
    for (const [j, [s, e]] of stuecke.entries()) for (const [k2, [x, y]] of freieMauer(s, e, hindernisse).entries()) mauern.push({ a: x, b: y, pfad: `${a.pfad}.burgmauer.${i}.${j}.${k2}` });
  }
  return { baue, plaetze, gassen: [], hoefe: [], mauern };
}
```
(Die Burgweg-Verbindung zwischen Tor und Randstraße ist der Streifen zwischen `innen` und der Zelle; er ist Teil des Burghofs, wenn `innen` nur um die Straßenbreite plus 0,2 eingerückt ist — der Hof reicht bis an die Mauerlücke, die Lücke bis an die Straße. Task 10 prüft den Zusammenhang über den Test „jedes Bauwerk an seiner Straße".)

- [ ] **Step 5: Implement `flur.ts`**

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { clipHalbebene, einwaerts, flaeche, qp, type Polygon } from "../../polygon.ts";
import { hausImLos, type Gasse, type Zufall } from "../gemeinsam.ts";
import type { Bau } from "./parzellen.ts";

/** Gewannflur: parallele Streifen quer zur längsten Kante, leicht ungleich breit. */
export function flurStreifen(zelle: Polygon, streifen: number, r: Zufall): Polygon[] {
  let beste = 0, bl = -1;
  for (let i = 0; i < zelle.length; i++) { const a = zelle[(i + zelle.length - 1) % zelle.length]!, b = zelle[i]!, l = Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2); if (l > bl) { bl = l; beste = i; } }
  const a = zelle[(beste + zelle.length - 1) % zelle.length]!, b = zelle[beste]!, ux = (b[0] - a[0]) / bl, uy = (b[1] - a[1]) / bl;
  const along = zelle.map(p => p[0] * ux + p[1] * uy), lo = Math.min(...along), hi = Math.max(...along);
  const schnitte = [lo];
  for (let i = 1; i < streifen; i++) schnitte.push(lo + (hi - lo) * (i + r.zahl(-.2, .2)) / streifen);
  schnitte.push(hi);
  const result: Polygon[] = [];
  for (let i = 0; i < streifen; i++) {
    const s = clipHalbebene(clipHalbebene(zelle, -ux, -uy, -schnitte[i]!), ux, uy, schnitte[i + 1]!);
    if (s.length >= 3) result.push(s.map(qp));
  }
  return result;
}

/** Ein Hof an der Landstraße: Wohnhaus und Scheune auf einem Stück der Zelle an der Straße. */
export function bauernhof(zelle: Polygon, strasse: Gasse, pfad: string, r: Zufall): Bau[] {
  const los = einwaerts(zelle, .15);
  if (los.length < 3 || flaeche(los) < 4) return [];
  const haus = hausImLos(los, strasse, r.zahl(1.3, 1.8), r.zahl(1, 1.3), "l");
  if (haus.length < 3) return [];
  // Das L-Haus ist Wohnhaus und Scheunenflügel in einem; eine zweite Front gibt die Zelle nicht her.
  return [{ pfad: `${pfad}.hof`, umriss: haus.map(qp), los: los.map(qp), strasse: strasse.id, typ: "bauernhof", rang: 1 }];
}
```

- [ ] **Step 6: Implement `namen.ts`**

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { SettlementPlan } from "@chronicle/szene";
import { flaeche, q, schwerpunkt, type Polygon, type Punkt } from "../../polygon.ts";
import type { Zufall } from "../gemeinsam.ts";
import type { Rolle } from "./rollen.ts";

export interface Viertel { readonly id: string; readonly nutzung: Rolle; readonly name: string; readonly flecken: readonly number[]; readonly flaeche: number; readonly anker: Punkt }
const NAMEN: Readonly<Record<Rolle, readonly string[]>> = Object.freeze({
  markt: ["Marktplatz", "Kornmarkt", "Alter Markt"], tempel: ["Domfreiheit", "Tempelbezirk", "Kirchberg"], burg: ["Burgberg", "Hohe Burg", "Zwingburg"],
  hafen: ["Hafenviertel", "Fischerviertel", "Am Kai"], handwerk: ["Gerberviertel", "Schmiedeviertel", "Weberviertel", "Töpferviertel", "Färberviertel"],
  adel: ["Oberstadt", "Herrenviertel", "Rosenhöhe"], arm: ["Unterstadt", "Lumpenviertel", "Schattengasse"],
  wohnen: ["Altstadt", "Neustadt", "Brunnenviertel", "Lindenviertel", "Mittelstadt"], frei: ["Stadtpark", "Lindengarten"],
});
const RICHTUNG: readonly [Punkt, string][] = [[[0, -1], "Nord"], [[1, 0], "Ost"], [[0, 1], "Süd"], [[-1, 0], "West"]];

/** Zusammenhängende Flecken gleicher Rolle bilden ein Viertel mit einem Namen. Vorstadtteile
 *  (außerhalb des Kerns, Wohnen/Arm/Handwerk) heißen nach ihrer Himmelsrichtung. */
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
      const [, wort] = [...RICHTUNG].sort((a, b) => (b[0][0] * dx + b[0][1] * dy) - (a[0][0] * dx + a[0][1] * dy))[0]!;
      name = `${wort}vorstadt`;
    } else {
      const frei = NAMEN[rolle].filter(n => !vergeben.has(n));
      name = frei.length ? frei[Math.floor(r.zahl(0, .999) * frei.length)]! : undefined;
    }
    if (!name || vergeben.has(name)) continue;
    vergeben.add(name);
    result.push({ id: `viertel.${q(anker[0])}_${q(anker[1])}`, nutzung: rolle, name, flecken: teil.sort((a, b) => a - b), flaeche: gesamt, anker });
  }
  return result;
}

/** Ein Zonenplan aus den erzeugten Vierteln: eine Zone je Fleck, der nicht Wohnen ist (Wohnen
 *  ist, was ohne Zone ohnehin entsteht), wichtigste Rollen zuerst, höchstens 16 (Spec E10). */
export function viertelPlan(viertel: readonly Viertel[], zellen: ReadonlyMap<number, Polygon>, breite: number, hoehe: number): SettlementPlan {
  const RANG: readonly Rolle[] = ["markt", "tempel", "burg", "hafen", "adel", "handwerk", "arm", "frei"];
  const zonen = viertel.filter(v => v.nutzung !== "wohnen").sort((a, b) => RANG.indexOf(a.nutzung) - RANG.indexOf(b.nutzung) || a.id.localeCompare(b.id))
    .flatMap(v => v.flecken.map(nr => ({ v, zelle: zellen.get(nr)! })))
    .filter(({ zelle }) => zelle && zelle.length >= 3 && zelle.length <= 32).slice(0, 16)
    .map(({ v, zelle }, i) => ({ id: `viertel-${i + 1}`, name: v.name, nutzung: v.nutzung, dichte: 1,
      polygon: zelle.map(([x, y]) => [Math.min(1, Math.max(0, Math.round(x / breite * 10000) / 10000)), Math.min(1, Math.max(0, Math.round(y / hoehe * 10000) / 10000))] as const) }));
  return { schemaVersion: 1, zonen };
}
```
- [ ] **Step 7: Run** `npx vitest run packages/forge/test/viertel-bau.test.ts` — Expected: PASS. Bei Fehlschlag der Kreuz-Erwartung (12 Ecken) nicht die Erwartung ändern: der Dom muss als Kreuz entstehen; `s`-Stufen oder Einrückung prüfen.
- [ ] **Step 8: Commit** `feat(forge): lots, row houses, market hall, cathedral, castle, fields and district names`.

---

### Task 10: Zusammensetzen — `erzeugeViertelStadt` und Dispatch

**Files:**
- Create: `packages/forge/src/stadt/viertel/index.ts`
- Modify: `packages/forge/src/siedlung.ts` (Dispatch, Optionen `mauer`/`burg`, Grenzen, `SIEDLUNG_VIERTEL_VERSION`)
- Modify: `packages/forge/src/index.ts` (Export `SIEDLUNG_VIERTEL_VERSION`)
- Test: `packages/forge/test/viertel-stadt.test.ts` (neu); vorhandene `siedlung*.test.ts`, `kette.test.ts`, `verschachtelung.test.ts`, `region.test.ts`, `packages/server/test/siedlung-integration.test.ts` prüfen und nur dort anpassen, wo sie **v8-Fantasy-Eigenheiten** festschreiben.

**Interfaces:**
- Consumes: alles aus Task 1–9; `SiedlungGrund` (Task 3).
- Produces: `erzeugeViertelStadt(g: SiedlungGrund): Siedlung`; `SIEDLUNG_VIERTEL_VERSION = "11"`; `SiedlungOptionen.mauer?: boolean; burg?: boolean`; `SiedlungBericht.viertel?: readonly { id: string; nutzung: string; name: string; flecken: number; flaeche: number }[]`, `SiedlungBericht.viertelPlan?: SettlementPlan`.

Ablauf in `erzeugeViertelStadt` (jeder Punkt eine lokale Funktion oder ein Aufruf):
1. `innen = clamp(round(bauwerke / (art === "stadt" ? 9 : art === "dorf" ? 6 : 3)), 3, 90)`; `radiusInnen = min(breite, hoehe) * (stadt .4 | dorf .3 | weiler .2)`; `mitte` = Kartenmitte ± 6 % (`r.zahl`).
2. `punkte = spirale(mitte, innen, radiusInnen, rahmen, r)`; `alle = flecken(punkte, innen, rahmen, mitte)`.
3. Trocken = Schwerpunkt nicht in `wasser`/`fels`. Stadt = die ersten `innen` trockenen Flecken (Spiralreihenfolge). Kern (bei `mauer && art === "stadt" && Stadt ≥ 5`) = Stadtflecken mit `ferne ≤ radiusInnen * .72`; sonst Kern = Stadt.
4. `g = kantengraph(alle.map(f => f.zelle))`; Nachbarn je Fleck aus `g.kanten` mit `f2 ≥ 0`.
5. Ring = `mauerKanten(g, kern)` falls Mauer; Tore = `waehleTore(g, ring oder Stadtrand, istInnen, mitte, art === "stadt" ? 4 : art === "dorf" ? 3 : 2, p => imIrgendeinem(p, [...wasser, ...fels]), flussPunkte[0] ?? r-Richtung)`. Ohne Mauer ist der „Ring" für die Torwahl die Menge der Kanten Stadt↔Nichtstadt, aber `ring` für Straßenbänder bleibt leer.
6. `lagen: FleckLage[]` (Ufer = Zellabstand ≤ .6 zu Fluss/Wasser; Höhe = `landschaft.hoehe(schwerpunkt)`; Tor = eine Torecke liegt auf der Zelle); `markt = waehleMarkt(lagen, a)`; `{ rollen, ausgelassen } = weiseRollenZu(lagen, markt, a)`.
7. `wege = hauptstrassen({... kosten: k => imFluss(mitte(k)) ? 6 : imSeeOderFels(mitte(k)) ? Infinity : 0 })`.
8. `{ gassen } = strassenBaender(g, { breiten: stadt { haupt: 1.05, gasse: .55, wall: .5, ausfall: .85 } | dorf/weiler { haupt: .85, gasse: .5, wall: .5, ausfall: .75 }, … })`; dann wie v8: Längsflussgassen entfernen, an See/Fels kappen (die zwei Schleifen aus `siedlung.ts:588-625` als Funktionen `ohneLaengsFluss`/`kappeAnHindernissen` nach `gemeinsam.ts` verschieben und in v8 an derselben Stelle aufrufen — Goldtest muss grün bleiben).
9. Bebauung je Stadtfleck in Spiralreihenfolge: `abstaende` je Kante = halbe Bandbreite + .1 (zweiseitig), volle Breite + .1 (einseitig), Ringkanten auf der Vorstadtseite `versatz + TURM + .3`; `losFlaeche` = bebaubare Fläche aller Stadtflecken / (bauwerke × 1.15) × `ROLLEN_FAKTOR[rolle]`, begrenzt auf `[gMin² × .25, gMax²]`. `burg` → `baueBurg`, sonst `bebaueFleck`; Vorstadtflecken (`!kern` bei Mauer) mit `nurAnHaupt: true`.
10. Mauer: `mauerLinien(g, ring, …, versatz = .5 + .42 + .05)`, dann `freieMauer(linie, hindernisse = Straßenbänder + Dächer + Wasser, mitAbstand .1)`; Turmpunkte `turmPunkte(linien, 6)`, jeder Turm `zwoelfeck(p, .42)`; Türme, die ein Straßenband oder Wasser schneiden, entfallen; an jedem Mauerstückende innerhalb 1,6 Zellen einer Torecke ein Flankenturm. Turm-Adresse: das Band der nächsten Ringkante (Wallgasse).
11. Flur: jeder Nicht-Stadt-Fleck, trocken, `landschaft.feuchte ≥ waldSchwelle` → Wald (`einwaerts(zelle, .22)`, Material `forest`); sonst `flurStreifen(einwaerts(zelle, .25), clamp(round(flaeche/4), 2, 7), r)` als `field`. Bauernhöfe: Stadt ≤ 6, Dorf ≤ 8 an Ausfallkanten (Zelle an einer Ausfallgasse, `bauernhof(...)`). Weiler: jeder Stadtfleck → `bauernhof` statt `bebaueFleck`.
12. Budget: Sonderbauten (`rang 0`), dann Höfe (`rang 1`), dann Häuser nach `ferne` des Flecks, bis `bauwerke`. Typen für `typ: null` per `zoneDraw(layoutKeim.keimHash, pfad, "typ")` aus der Rollentabelle (`TYPEN` unten); je Tor die nächste Nicht-Sonderbau-Adresse → `taverne`; bei Dorf der Bau am Anger mit größter Fläche → `kirche`, zweitgrößter → `taverne`; am Ufer im Handwerks-/Hafenviertel der dem Fluss nächste → `muehle`. Titel wie v8 (Namenslisten) plus `rathaus: "Rathaus"`, Dom: `Dom ${Kirchenname}`.
13. Zonenplan-Dichte (v9-Verhalten beibehalten): wenn `planung` gesetzt, jeden Nicht-Sonderbau mit `roofZone`/`zoneDraw(…, "density")` filtern wie `siedlung.ts:778-786`.
14. Gemeinsamer Schluss: Brücken, Kreuzungen, Stege (Funktionen aus `gemeinsam.ts`, in v8 an denselben Stellen aufgerufen), Stempel/Lichter wie v8 Abschnitt 7 (eigene Kopie in `index.ts`, weil v8 dort eigene Zufallszüge hat), Beschriftungen `{ id: ids.geometrieId("name", v.id), text: v.name, points: [[q(anker[0]*z), q(anker[1]*z)]], size: q(z * (v.nutzung === "markt" || v.nutzung === "burg" ? 1.3 : .8)), style: "gegend" }`, Dokument und Knoten wie v8 Abschnitt 8.

```ts
const TYPEN: Readonly<Record<Rolle, readonly (readonly [BauwerkTyp, number])[]>> = {
  wohnen: [["haus", 86], ["taverne", 3], ["werkstatt", 5], ["schmiede", 2], ["lager", 4]],
  markt: [["haus", 45], ["taverne", 15], ["bank", 10], ["lager", 12], ["werkstatt", 18]],
  handwerk: [["werkstatt", 35], ["schmiede", 20], ["lager", 20], ["haus", 25]],
  hafen: [["lager", 55], ["taverne", 12], ["werkstatt", 13], ["haus", 20]],
  adel: [["haus", 78], ["bibliothek", 10], ["museum", 4], ["bank", 8]],
  arm: [["haus", 88], ["taverne", 7], ["lager", 5]],
  tempel: [["haus", 70], ["bibliothek", 30]], burg: [["kaserne", 60], ["lager", 40]], frei: [["haus", 100]],
};
const waehleTyp = (rolle: Rolle, zug: number): BauwerkTyp => {
  const liste = TYPEN[rolle], summe = liste.reduce((s, [, w]) => s + w, 0);
  let x = zug * summe;
  for (const [typ, w] of liste) { if (x < w) return typ; x -= w; }
  return liste.at(-1)![0];
};
```

- [ ] **Step 1: Failing tests** (`viertel-stadt.test.ts`)

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, parseTacticalCartography, parseTacticalMapDocument, serializeTacticalMapDocument, SIEDLUNG_LIMITS as _L } from "@chronicle/szene";
import { erzeugeSiedlung, SIEDLUNG_LIMITS, SIEDLUNG_VIERTEL_VERSION } from "../src/siedlung.ts";
import { getrennteDaecher } from "../src/stadt/gemeinsam.ts";
import { flaeche, schnittKonvex } from "../src/polygon.ts";

const paket = parseAssetpaket(readFileSync(fileURLToPath(new URL("../../../assets/packs/pk.grundriss/paket.json", import.meta.url)), "utf8"));
const stadt = (keim: string, extra = {}) => erzeugeSiedlung({ keim, optionen: { art: "stadt", ...extra } }, paket);
const STANDORTE = ["ebene", "huegel", "wald", "gebirge", "fluss", "see", "moor", "kueste", "insel"] as const;

describe("Fantasy-Stadt v11", () => {
  it("trägt die neue Version und die Optionen im Keim", () => {
    const s = stadt("v11:a");
    expect(s.version).toBe(SIEDLUNG_VIERTEL_VERSION);
    expect(s.keim.optionen).toMatchObject({ mauer: true, burg: true });
  });
  it("hat Markt mit Rathaus, Dom, Burg, Türme und benannte Viertel", () => {
    const s = stadt("v11:b");
    const typen = s.bauwerke.map(b => b.typ);
    for (const t of ["rathaus", "kirche", "burg", "turm", "kaserne"]) expect(typen, t).toContain(t);
    expect(typen.filter(t => t === "turm").length).toBeGreaterThanOrEqual(8);
    expect(s.cartography.labels?.length).toBeGreaterThanOrEqual(4);
    expect(s.bericht.viertel?.some(v => v.nutzung === "markt")).toBe(true);
    expect(s.karte.walls.length).toBeGreaterThan(10);
  });
  it("lässt Mauer und Burg auf Wunsch weg", () => {
    const s = stadt("v11:c", { mauer: false, burg: false });
    expect(s.bauwerke.some(b => b.typ === "burg")).toBe(false);
    expect(s.bauwerke.some(b => b.typ === "turm")).toBe(false);
  });
  it("liefert über alle Standorte und Arten gültige Karten ohne Überlappung, alles an Straßen", () => {
    for (const standort of STANDORTE) for (const art of ["weiler", "dorf", "stadt"] as const) for (let i = 0; i < 3; i++) {
      const s = erzeugeSiedlung({ keim: `v11:${standort}:${art}:${i}`, optionen: { art, standort } }, paket);
      const wo = `${standort}/${art}/${i}`;
      expect(s.bauwerke.length, wo).toBeGreaterThan(0);
      for (const b of s.bauwerke) expect(s.strassen.some(x => x.id === b.strasse), `${wo} ${b.pfad}`).toBe(true);
      for (let a = 0; a < s.bauwerke.length; a++) for (let c = a + 1; c < s.bauwerke.length; c++)
        expect(getrennteDaecher(s.bauwerke[a]!.umriss, s.bauwerke[c]!.umriss), `${wo} ${s.bauwerke[a]!.pfad}/${s.bauwerke[c]!.pfad}`).toBe(true);
      expect(() => parseTacticalCartography(s.cartography, s.karte)).not.toThrow();
    }
  }, 120_000);
  it("hält die Großstadt im Budget", () => {
    const t0 = performance.now();
    const s = erzeugeSiedlung({ keim: "v11:gross", optionen: { art: "stadt", ausdehnung: [88, 64], bauwerke: 480 } }, paket);
    const dauer = performance.now() - t0;
    expect(s.karte.geometry.regions.length).toBeLessThan(4096);
    expect(serializeTacticalMapDocument(s.karte).length).toBeLessThan(1024 * 1024);
    expect(s.bauwerke.length).toBeGreaterThan(300);
    expect(dauer).toBeLessThan(4000); // Ziel 2 s; 4 s Grenze für langsame Prüfrechner
  }, 30_000);
  it("erlaubt bis zu 512 Gebäude", () => expect(SIEDLUNG_LIMITS.bauwerkeMax).toBe(512));
  it("übernimmt den eigenen Viertelplan ohne das Layout umzuwürfeln", () => {
    const a = stadt("v11:plan"), plan = a.bericht.viertelPlan!;
    const b = stadt("v11:plan", { planung: plan });
    expect(b.bericht.viertel?.map(v => v.nutzung).sort()).toEqual(a.bericht.viertel?.map(v => v.nutzung).sort());
  });
});
```

- [ ] **Step 2: Run** `npx vitest run packages/forge/test/viertel-stadt.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `index.ts` nach dem Ablauf oben; in `siedlung.ts`: `export const SIEDLUNG_VIERTEL_VERSION = "11";`, `SIEDLUNG_LIMITS.bauwerkeMax: 512`, Stadt-Vorgabe `bauwerke: 320`, `SiedlungOptionen` + `mauer?`, `burg?`; `siedlungStandard(art)` ergänzt `mauer: art === "stadt", burg: art === "stadt"`; Prüfung „Boolean erwartet" für beide; `version = setting === "fantasy" ? SIEDLUNG_VIERTEL_VERSION : (bisherige Regel)`; `layoutKeim.version` = dieselbe Version; `mauer`/`burg` nur bei Fantasy in `layoutKeim.optionen`; Dispatch `if (g.setting === "fantasy") return erzeugeViertelStadt(g);`.
- [ ] **Step 4: Run** neue Tests + Goldtest + die übrigen Siedlungssuiten:
  `npx vitest run packages/forge/test/viertel-stadt.test.ts packages/forge/test/siedlung-gold.test.ts packages/forge/test/siedlung.test.ts packages/forge/test/siedlung-plan.test.ts packages/forge/test/siedlung-traffic.test.ts packages/forge/test/siedlung-standort.test.ts packages/forge/test/siedlung-hafen.test.ts packages/forge/test/siedlung-cartography.test.ts packages/forge/test/kette.test.ts packages/forge/test/verschachtelung.test.ts packages/forge/test/region.test.ts packages/forge/test/zeitwelten.test.ts packages/forge/test/settings.test.ts`
  Jede rote Erwartung einzeln lesen: Invarianten (Adresse, Überlappung, Rahmen, Determinismus, Containment, Ids) **müssen** grün werden — Erzeuger reparieren. Erwartungen, die v8-Fantasy-Details festschreiben (Version `"8"`/`"9"`/`"10"` bei Fantasy, konkrete Zählwerte, „Stadt ohne Burg"), auf das neue Verhalten ändern und im Commit nennen. Traffic-/Plan-Tests, die `version` `"9"`/`"10"` prüfen, bekommen `setting: "gegenwart"` (dort bleibt das Verhalten), plus je ein Fantasy-Gegenstück, das `"11"` erwartet.
- [ ] **Step 5: Probe rendern und ansehen.** `.local/stadt-probe/render.ts` aus dem Hauptcheckout nach `.local/stadt-probe/` im Worktree kopieren, `npx tsx .local/stadt-probe/render.ts "stadt:fantasy:fluss,stadt:fantasy:kueste,stadt:fantasy:huegel,dorf:fantasy:fluss,dorf:fantasy:see,weiler:fantasy:ebene" nachher` und jedes PNG mit dem Read-Werkzeug ansehen. Befunde (leere Blöcke, Türme im Wasser, Straßen ins Nichts) vor dem Commit beheben.
- [ ] **Step 6: Commit** `feat(maps): generate fantasy settlements from districts (v11)`.

---

### Task 11: Server- und Client-Optionen, Zonenplaner

**Files:**
- Modify: `packages/server/src/domain/grundriss.ts:68` (Schlüssel `mauer`, `burg`)
- Modify: `packages/server/src/http/grundriss.ts:~100` (`mauer: Type.Optional(Type.Boolean()), burg: Type.Optional(Type.Boolean())`)
- Modify: `packages/client/src/features/map-generation.ts` (`GenerationSettings.mauer?`, `burg?`; `generationOptions` reicht sie bei `siedlung` und `setting === "fantasy"` durch)
- Modify: `packages/client/src/features/MapGenerationControls.tsx` (zwei Schalter mit Erklärzeile, nur bei Fantasy-Siedlung ohne Anlage; Vorlage „Großstadt" `anzahl: 480`)
- Modify: `packages/client/src/features/MapZonePlanner.tsx` (Nutzungen „Burg", „Tempelbezirk" mit Beschreibung; Prop `vorschlag?: SettlementPlan` und Knopf „Viertel aus der Karte übernehmen")
- Modify: `packages/client/src/features/TacticalGenerate.tsx` (nach Vorschau `bericht.viertelPlan` an die Steuerung durchreichen)
- Modify: `packages/client/src/i18n/en/P15.json`/`P16.json` (oder die Datei, in der die Nachbartexte stehen)
- Test: `packages/client/test/map-generation.test.ts` o. ä. (vorhandene Datei für `generationOptions` finden: `grep -rln generationOptions packages/client/test`), `packages/server/test/grundriss-http*.test.ts` (Schema)

- [ ] **Step 1: Failing tests**

```ts
// Client: generationOptions
it("reicht Mauer und Burg nur für Fantasy-Siedlungen durch", () => {
  const base = { ...generationSettings("siedlung"), siedlung: "stadt" as const, mauer: false, burg: true };
  expect(generationOptions(base, defaults)).toMatchObject({ mauer: false, burg: true });
  expect(generationOptions({ ...base, setting: "scifi" }, defaults)).not.toHaveProperty("mauer");
});
// Server: validateKartenOptionen
it("nimmt mauer und burg für Siedlungen an", () => {
  expect(() => validateKartenOptionen("siedlung", { art: "stadt", mauer: true, burg: false })).not.toThrow();
  expect(() => validateKartenOptionen("grundriss", { mauer: true } as never)).toThrow();
});
```
- [ ] **Step 2: Run** die zwei Testdateien — Expected: FAIL.
- [ ] **Step 3: Implement.** Oberflächentexte (Klartext):
  - Schalter 1: „Stadtmauer mit Türmen und Toren" — Hilfe: „Die Altstadt bekommt eine Mauer. Wo Hauptstraßen hinausführen, entstehen Tore; die Türme kannst du später betreten."
  - Schalter 2: „Burg am Stadtrand" — Hilfe: „Eine Burg mit eigener Mauer steht auf dem höchsten Platz an der Stadtmauer."
  - Nutzung „Burg" — „Hier steht die Burg mit Bergfried, Kaserne und eigenem Hof."; „Tempelbezirk" — „Ein großes Gotteshaus mit freiem Platz davor."
  - Knopf „Viertel aus der Karte übernehmen" — danach Hinweis „Die Viertel der Vorschau sind jetzt Zonen. Verschiebe sie und erzeuge die Karte neu." Knopf nur sichtbar, wenn `vorschlag` Zonen hat.
  Jeder Text als `t("…")` und in der englischen Datei.
- [ ] **Step 4: Run** Tests, `npm run typecheck`, `npm run build`, `npm run gate:sprache` — Expected: PASS. Zusätzlich `grep -rln "generationOptions\|MapZonePlanner\|validateKartenOptionen" packages/*/test` und diese Dateien laufen lassen.
- [ ] **Step 5: Commit** `feat(maps): town wall and castle switches, district adoption in the zone planner`.

---

### Task 12: Optik `cartography-12`

**Files:**
- Modify: `packages/szene/src/cartography-projection.ts` (`rendererVersion`, Gebäudezweig ab Zeile ~444, Straßen-/Platzzweig)
- Test: `packages/szene/test/cartography-projection*.test.ts` (vorhandene finden: `grep -rln rendererVersion packages/szene/test packages/server/test`)

Verhalten:
1. **Rundturm**: Gebäudepolygon mit ≥ 10 Ecken und Seitenverhältnis der Hülle 0,8–1,25 → kein Satteldach, sondern Scheibe `roofDark`, darauf Scheibe (Radius .78) `roof`, Lichtkeil (obere linke Hälfte der inneren Scheibe per `clip`) `roofLight`, Schatten wie bei Häusern.
2. **Marktstände**: Region mit `material: "square"` und Fläche ≥ 6 Zellen² bei Fantasy → auf dem globalen Gitter (Zellmitten mit `(x+y) % 3 === 0`, `phase(id)`-Versatz) kleine Rechtecke 0,5×0,35 Zellen im Wechsel zweier Markisenfarben (`roofLight` und `path` gemischt), nur wo das Rechteck ganz im Platz liegt und kein Dach schneidet; höchstens 40 je Karte (`groundBudget` beachten).
3. **Pflaster**: dieselben Plätze bekommen ein feines Fugenraster (Band-Streifen alle 0,5 Zellen in `mix(square, roofDark, .12)`, Deckkraft .25) auf dem globalen Gitter.
4. `rendererVersion = "cartography-12"`.

- [ ] **Step 1: Failing test**

```ts
it("zeichnet einen runden Turm ohne Firstband und Stände auf großen Plätzen", () => {
  const z = 64, turm = Array.from({ length: 12 }, (_, i) => [[1, 0], [.866, .5], [.5, .866], [0, 1], [-.5, .866], [-.866, .5], [-1, 0], [-.866, -.5], [-.5, -.866], [0, -1], [.5, -.866], [.866, -.5]][i]!).map(([x, y]) => [q((3 + x * .42) * z), q((3 + y * .42) * z)] as const);
  const platz = [[5 * z, 5 * z], [9 * z, 5 * z], [9 * z, 8 * z], [5 * z, 8 * z]] as const;
  const doc = dokument([{ id: "turm", punkte: turm }, { id: "platz", punkte: platz }], z);
  const carto = kartografie([{ regionId: "turm", role: "building" }, { regionId: "platz", role: "road", material: "square" }], z);
  const d = cartographyDraw(doc, carto, "fantasy");
  expect(d.rendererVersion).toBe("cartography-12");
  const turmTeile = d.polygons.filter(p => p.regionId === "turm");
  expect(turmTeile.length).toBeGreaterThanOrEqual(3);
  expect(d.polygons.filter(p => p.regionId === "platz").length).toBeGreaterThan(4);
});
```
(`dokument`/`kartografie`/`q` als kleine Fabriken im Test nach dem Muster der vorhandenen Projektionstests; die vorhandene Datei zuerst lesen und deren Helfer benutzen.)
- [ ] **Step 2: Run** — Expected: FAIL (Version).
- [ ] **Step 3: Implement** im Gebäudezweig vor dem Satteldach: `if (isRound(points)) { …; continue; }`, im Platzzweig die Stände und das Fugenraster; Version hochzählen. Raster-Tests (`packages/server/test/cartography-raster*.test.ts`) und `packages/client/test`-Dateien, die `cartography-11` erwarten (`grep -rln "cartography-11" packages`), auf `-12` ziehen.
- [ ] **Step 4: Run** Projektions-, Raster- und Client-Tests mit `rendererVersion`; Probebilder neu rendern und ansehen (Turmkronen auf der Mauer, Stände nur auf dem Markt, nicht auf Straßen).
- [ ] **Step 5: Commit** `feat(render): round towers, market stalls and paving (cartography-12)`.

---

### Task 13: Gesamtprüfung und Übergabe

- [ ] **Step 1:** `npm run typecheck && npm run build && npm run gate:sprache && npm run gate:boundaries && npm run gate:version`.
- [ ] **Step 2:** Gezielte Suiten: alle `packages/forge/test/*siedlung*`, `viertel-*`, `polygon`, `bauwerke`, `grundriss`, `kette`, `verschachtelung`, `region`; `packages/szene/test` (Projektion, Settlement-Plan, Modell); `packages/server/test/siedlung-integration.test.ts`, `grundriss*.test.ts`, `betreten*.test.ts`, `cartography-raster*.test.ts`; `packages/client/test/map-*.test.ts`, `tactical-entities-review.test.ts`.
- [ ] **Step 3:** Innenraum eines neuen Typs: ein Rathaus und eine Burg über `/betreten` bzw. `erzeugeGrundriss({ optionen: { profil } })` rendern und ansehen.
- [ ] **Step 4:** Browser: `npx playwright test e2e/map-studio.spec.ts` (nach `npm run build`); bekannte veraltete Specs (`e2e/map-settings`, `e2e/siedlung-workshop`) nur prüfen, wenn sie die neuen Schalter berühren.
- [ ] **Step 5:** Nachweise `design/iterations/stadt-viertel-20260923.md` (Vorher/Nachher-Bilder-Pfade, Messwerte: Gebäude je Stadt, Erzeugungszeit, Regionen), `STATUS.md`-Kopf, Zeile in `AGENT_COORDINATION.md` (Flächen dieser Sitzung), Memory `atlas-chronicles-kartenstudio-stand.md` um Teil 1 ergänzen.
- [ ] **Step 6: Commit** `docs(maps): record district generator evidence` — Merge nach `main` erst nach Kayas Zustimmung.
