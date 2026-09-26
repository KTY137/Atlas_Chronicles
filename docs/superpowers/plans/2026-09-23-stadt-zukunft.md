# Moderne Stadt und Kolonie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gegenwart- und Sci-Fi-Siedlungen bekommen eigene, auf den ersten Blick moderne bzw.
futuristische Layouts (Version 12) und eine eigene Optik (`cartography-13`); das Ortssymbol der
Regionskarte passt zum Setting.

**Architecture:** Die Fantasy-Viertelpipeline (`stadt/viertel/index.ts`) wird mit einem
`StadtStil` parametrisiert. Fantasy ist ein Stil mit genau den heutigen Werten (Gold-Hashes
beweisen es). Zwei neue Stile liefern Flecken, Befestigung, Bebauung, Tabellen und Namen:
`stadt/modern/` (Stadtteile mit gedrehtem Raster, Blockbebauung) und `stadt/kolonie/`
(Ringsektoren um eine Nabe, Kuppeln, Hallen, Landefelder). Die Kartografie bekommt ein optionales
`dach` je Gebäude, die Projektion zeichnet danach.

**Tech Stack:** TypeScript (ESM, `.ts`-Importe), Vitest, `@chronicle/szene` (Kartografie,
Projektion), React-Client, PixiJS/sharp-Probe in `.local/stadt-probe/`.

**Spec:** `docs/superpowers/specs/2026-09-23-stadt-zukunft-design.md` (E1–E10, Abschnitte 5–8).

## Global Constraints

- Fantasy bleibt Byte für Byte v11: `siedlung-gold-fantasy.test.ts` darf sich nach Task 1 nie ändern.
- Gegenwart und Sci-Fi erzeugen immer Version `"12"`, auch mit Zonen- oder Straßenplan.
- Keine neue Abhängigkeit. Kein `Math.sin`/`Math.cos`/`Math.atan2` im Forge-Code
  (`polygon.ts`, Regel 2); Kreisrichtungen über Halbwinkel mit `Math.sqrt`.
- Alle Koordinaten der Ausgabe quantisiert (`q`/`qp`); Reihenfolgen über Geometrie/Pfade, nie
  über Indizes, die vom Zufall abhängen (I8).
- Regionen ≤ 4096, Kartografie ≤ 1 MiB (`TACTICAL_CARTOGRAPHY_LIMITS.documentBytes`).
- Jedes Gebäude hat `strasse` = Id einer ausgegebenen Straße; Dächer überlappen weder einander
  (`getrennteDaecher`) noch Wasser.
- Oberflächentexte Klartext ohne Fachjargon; jede neue Zeichenkette im Sprachkatalog.
- Nie die volle Testsuite; nur gezielte Dateien (`npx vitest run <datei>` im Paket).
- Rohe `Error` aus dem Generator sind verboten: `fail(...)` aus `kartenwerk.ts`.
- `packages/client/src/**/manager.js`-artige Dateien ohne Compiler: nach Oberflächenänderung
  Parse-Check + `npm run build -w packages/client`.

## Review Focus

1. **Sehr kleine Karten** (Weiler 24×18, Dorf 12×12) in Gegenwart/Sci-Fi: eine erklärte
   `GrundrissError`-Absage oder mindestens ein Gebäude, nie ein roher Fehler. → Task 4/5 Test „winzig".
2. **Fluss mitten durch die Kolonie**: Sektoren im Wasser entfallen, Speichen bekommen Brücken,
   Ringstraßen enden am Ufer — kein Gebäude im Wasser. → Task 5 Invariantentest mit `standort: "fluss"`.
3. **Zonenplan mit `burg`/`tempel`/`hafen` in Gegenwart/Sci-Fi**: Rolle gewinnt, Meldungen nennen
   „Rathaus & Ämter" bzw. „Kommandozentrale" statt „Burg". → Task 4/5 Zonenplan-Test.
4. **Großstadt 88×64, 480 Gebäude** in beiden Settings: unter 15 s, ≤ 4096 Regionen, ≤ 1 MiB.
   → Task 6 Budgettest.
5. **Alte Karten ohne `dach`** und Fantasy-Karten zeichnen wie vorher (Giebel/Flachdach nach
   Setting). → Task 7 Projektionstest „ohne dach".

---

## Dateistruktur

| Datei | Verantwortung |
| --- | --- |
| `packages/forge/src/stadt/stil.ts` (neu) | `StadtStil`-Schnittstelle, `waehleTyp` |
| `packages/forge/src/stadt/viertel/stil.ts` (neu) | `FANTASY`: heutige Konstanten und Hooks aus `index.ts` |
| `packages/forge/src/stadt/viertel/index.ts` | Pipeline, nimmt `stil`; Fantasy-Literale → Stil |
| `packages/forge/src/stadt/viertel/namen.ts` | `viertelBilden` nimmt Namens-Tabelle und Vorstadtnamen |
| `packages/forge/src/stadt/kreis.ts` (neu) | `kreisRichtungen(n)`, `vieleck(m, r, n, dreh)` ohne Trigonometrie |
| `packages/forge/src/stadt/modern/raster.ts` (neu) | Raster in einem Stadtteil: Straßen und Blöcke |
| `packages/forge/src/stadt/modern/bloecke.ts` (neu) | Blockbebauung je Rolle |
| `packages/forge/src/stadt/modern/stil.ts` (neu) | `MODERN` |
| `packages/forge/src/stadt/kolonie/sektoren.ts` (neu) | Nabe, Ringe, Speichen als Flecken |
| `packages/forge/src/stadt/kolonie/bebauung.ts` (neu) | Kuppeln, Türme, Container, Hallen, Landefelder |
| `packages/forge/src/stadt/kolonie/stil.ts` (neu) | `KOLONIE` |
| `packages/forge/src/stadt/abschluss.ts` | `BauwerkAusgabe.dach?`, `dokument` schreibt es |
| `packages/forge/src/siedlung.ts` | Version 12, Stilwahl, Keim mit `mauer` für Sci-Fi, v8-Rumpf entfernt |
| `packages/forge/src/stadt/gemeinsam.ts` | `frontParzellen` nimmt `Pick<Gasse,"von"\|"bis">` (nur Typ) |
| `packages/szene/src/cartography.ts` | `CARTOGRAPHY_DACHFORMEN`, optionales `dach` |
| `packages/szene/src/cartography-projection.ts` | `cartography-13` |
| `packages/client/src/features/MapZonePlanner.tsx`, `MapGenerationControls.tsx`, `map-generation.ts` | Beschriftungen je Setting, Schutzzaun |
| Tests | `siedlung-gold-fantasy`, `stadt-kreis`, `modern-raster`, `modern-stadt`, `modern-robust`, `kolonie-sektoren`, `kolonie-stadt`, `kolonie-robust`, `cartography-dach`, Projektion |

---

### Task 1: Fantasy festnageln

**Files:**
- Create: `packages/forge/test/siedlung-gold-fantasy.test.ts`

- [ ] **Step 1: Test schreiben**

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAssetpaket } from "@chronicle/szene";
import { erzeugeSiedlung } from "../src/siedlung.ts";

const pack = (id: string) => parseAssetpaket(readFileSync(fileURLToPath(new URL(`../../../assets/packs/${id}/paket.json`, import.meta.url)), "utf8"));
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
const paket = pack("pk.grundriss");
const FAELLE = (["weiler", "dorf", "stadt"] as const).flatMap(art => (["fluss", "kueste", "huegel", "moor", "ebene"] as const).map(standort => [art, standort] as const));

/** Teil 2 baut die Viertelpipeline in eine Pipeline mit Stilen um (Spec 2026-09-23-stadt-zukunft,
 *  E3/E4). Fantasy muss dabei Byte für Byte bleiben, was Teil 1 gebaut hat. */
describe("Fantasy v11 bleibt unverändert", () => {
  it.each(FAELLE)("%s %s", (art, standort) => {
    const s = erzeugeSiedlung({ keim: `gold11:${art}:${standort}`, optionen: { art, standort } }, paket);
    expect(s.version).toBe("11");
    expect(hash({ karte: s.karte, cartography: s.cartography, knoten: s.knoten, bericht: s.bericht })).toMatchSnapshot();
  }, 30_000);
  it("Stadt mit Zonenplan", () => {
    const planung = { schemaVersion: 1 as const, zonen: [{ id: "w", name: "West", nutzung: "handwerk" as const, dichte: .8, polygon: [[0, 0], [.5, 0], [.5, 1], [0, 1]] as const }] };
    const s = erzeugeSiedlung({ keim: "gold11:plan", optionen: { art: "stadt", planung } }, paket);
    expect(hash({ karte: s.karte, cartography: s.cartography, knoten: s.knoten, bericht: s.bericht })).toMatchSnapshot();
  }, 30_000);
  it("Stadt mit Straßenplan", () => {
    const verkehr = { schemaVersion: 1 as const, knoten: [{ id: "a", x: .1, y: .5 }, { id: "b", x: .9, y: .5 }], kanten: [{ id: "ab", von: "a", nach: "b", art: "hauptstrasse" as const }] };
    const s = erzeugeSiedlung({ keim: "gold11:verkehr", optionen: { art: "stadt", verkehr } }, paket);
    expect(hash({ karte: s.karte, cartography: s.cartography, knoten: s.knoten, bericht: s.bericht })).toMatchSnapshot();
  }, 30_000);
});
```

(Vor dem Schreiben die echte `RoadPlan`-Form in `packages/szene/src/road-plan.ts` nachsehen und
das `verkehr`-Objekt daran anpassen.)

- [ ] **Step 2:** `cd packages/forge && npx vitest run test/siedlung-gold-fantasy.test.ts` — erzeugt
  17 Schnappschüsse, PASS.
- [ ] **Step 3:** Commit `test(maps): pin the fantasy town before the style refactor`.

---

### Task 2: Pipeline mit Stil (Fantasy unverändert)

**Files:**
- Create: `packages/forge/src/stadt/stil.ts`, `packages/forge/src/stadt/viertel/stil.ts`
- Modify: `packages/forge/src/stadt/viertel/index.ts`, `packages/forge/src/stadt/viertel/namen.ts`,
  `packages/forge/src/stadt/viertel/rollen.ts` (nur Meldungstexte parametrisiert),
  `packages/forge/src/siedlung.ts:336` (`erzeugeViertelStadt(g, basis, FANTASY)`)

**Interfaces (Produces):**

```ts
// stadt/stil.ts
import type { BauwerkTyp, CartographyDachform, KartenSetting } from "@chronicle/szene";
import type { Polygon, Punkt } from "../polygon.ts";
import type { Gasse, Zufall } from "./gemeinsam.ts";
import type { Fleck } from "./viertel/flecken.ts";
import type { Breiten } from "./viertel/wege.ts";
import type { Bau, FleckBau, ParzellenAuftrag } from "./viertel/parzellen.ts";
import type { Rolle, FleckLage } from "./viertel/rollen.ts";

export type Typliste = readonly (readonly [BauwerkTyp, number])[];
export type Art = "weiler" | "dorf" | "stadt";
/** Stein: Mauer mit Türmen (Fantasy). Zaun: Mauerlinie ohne Türme um die ganze Stadt (Sci-Fi).
 *  Ring: die Außenkanten des Kerns werden Hauptstraße (Gegenwart). */
export type Befestigung = "stein" | "zaun" | "ring";
export interface FleckenAuftrag { readonly art: Art; readonly bauwerke: number; readonly mitte: Punkt; readonly rahmen: Polygon; readonly breite: number; readonly hoehe: number; readonly r: Zufall }
export interface SonderAuftrag {
  readonly art: Art; readonly markt: number; readonly marktMitte: Punkt; readonly torPunkte: readonly Punkt[];
  readonly flussNah: boolean; readonly setze: (ziel: Punkt, typ: BauwerkTyp) => void;
  /** Fantasy-Mühle: nimmt das freie Haus am Fluss. */ readonly amFluss: (typ: BauwerkTyp, rollen: readonly (Rolle | "weiler")[]) => void;
  readonly hatTyp: (typ: BauwerkTyp) => boolean;
}
export interface StadtStil {
  readonly setting: KartenSetting;
  flecken(a: FleckenAuftrag): { readonly alle: readonly Fleck[]; readonly innenZiel: number };
  readonly befestigung: Befestigung;
  /** Anteil der Stadtflecken im Kern (nur mit Befestigung). */ readonly kernAnteil: number;
  /** Wie viel ein Vorstadtfleck zur Losgröße beiträgt (Fantasy .4: nur an Ausfallstraßen). */ readonly vorstadtAnteil: number;
  breiten(art: Art): Breiten;
  /** Nach der automatischen Rollenwahl (Sci-Fi: Raumhafen im äußeren Ring). */
  nachRollen?(lagen: readonly FleckLage[], rollen: Map<number, Rolle>, art: Art, planHat: (r: Rolle) => boolean): void;
  bebaue(a: ParzellenAuftrag): FleckBau & { readonly mauern?: readonly { a: Punkt; b: Punkt; pfad: string }[] };
  readonly typen: Readonly<Record<Rolle | "weiler", Typliste>>;
  hoefe(art: Art): number;
  streifen(flaeche: number): number;
  sonderbauten(a: SonderAuftrag): void;
  titel(typ: BauwerkTyp, b: Bau, i: number, r: Zufall): string;
  dach(typ: BauwerkTyp): CartographyDachform | undefined;
  readonly namen: Readonly<Record<Rolle, readonly string[]>>;
  vorstadt(richtung: "Nord" | "Ost" | "Süd" | "West"): string;
  readonly dorfplatz: string;
  /** „Burg" in Meldungen des Rollenschritts (Gegenwart „Rathaus & Ämter", Sci-Fi „Kommandozentrale"). */
  readonly burgWort: string;
  readonly texte: { readonly zuKlein: string };
}
export const waehleTyp = (liste: Typliste, zug: number): BauwerkTyp => { /* heutige Funktion aus index.ts, unverändert */ };
```

`CartographyDachform` kommt erst in Task 3; bis dahin in `stil.ts` lokal
`type CartographyDachform = "giebel" | "flach" | "halle" | "kuppel" | "plattform"` und in Task 3
auf den Szene-Export umstellen.

- [ ] **Step 1: `FANTASY` schreiben** (`viertel/stil.ts`): jede Konstante und jeder Zweig aus
  `index.ts` wörtlich übernehmen:
  - `flecken`: `innenZiel = max(3, min(90, round(bauwerke / (stadt 9 | dorf 6 | 3))))`,
    `radiusInnen = min(breite,hoehe) * (.4|.3|.2)`, `alle = flecken(spirale(mitte, innenZiel, radiusInnen, rahmen, r), innenZiel, rahmen, mitte)`.
  - `befestigung: "stein"`, `kernAnteil: .62`, `vorstadtAnteil: .4`.
  - `breiten`: Stadt `{ haupt: .85, gasse: .42, wall: .38, ausfall: .7 }`, sonst `{ haupt: .75, gasse: .45, wall: .4, ausfall: .65 }`.
  - `bebaue`: `rolle === "burg" ? baueBurg(a) : bebaueFleck(a)`; Burgmauern als `mauern`
    zurückgeben (heute `burg.mauern`). Die Meldung „Keine Burg: der Burgfleck ist zu klein." bleibt
    in `index.ts` (Bedingung `rolle === "burg" && !baue.length`).
  - `typen`: `TYPEN` aus `index.ts`; `hoefe`: Stadt 6, Dorf 8, sonst 0;
    `streifen(f) = max(2, min(8, round(f / 5)))`.
  - `sonderbauten`: Dorf mit Markt → Kirche, Taverne an `marktMitte`; Stadt ohne Kirche → Kirche;
    je Tor Taverne; mit Fluss und nicht Weiler → `amFluss("muehle", ["handwerk","hafen"] bzw. Dorf alle)`.
    Die Mühle heute: Kandidaten `frei && (rolle handwerk|hafen || art dorf)`, Abstand < 1.2 zum
    Fluss, nächster zuerst. `amFluss` bekommt diese Logik in `index.ts`, der Stil ruft nur auf.
  - `titel`: heutige Regel (Kirche Rang 0 → `DOME`, sonst `KIRCHEN`; Taverne `TAVERNEN`; Haus
    `Haus ${HAUSNAMEN} ${i+1}`; sonst `${BAUWERK_LABEL[t]} ${i+1}`), `b.titel` hat Vorrang —
    dieselben `r.waehle`-Aufrufe in derselben Reihenfolge.
  - `dach: () => undefined`; `namen`: `NAMEN` aus `namen.ts`; `vorstadt: r => \`${r}vorstadt\``;
    `dorfplatz: "Dorfanger"`, `burgWort: "Burg"`, `texte.zuKlein: "Keine Stadtmauer: der Ort ist zu klein für einen ummauerten Kern."`.
- [ ] **Step 2: `index.ts` umbauen.** Signatur
  `erzeugeViertelStadt(g, basis, stil: StadtStil)`. Ersetzungen (Reihenfolge der Zufallszüge
  unverändert):
  - Schritt 1 `innenZiel/alle` → `stil.flecken({ art, bauwerke: optionen.bauwerke, mitte, rahmen, breite, hoehe, r })`.
  - `mauerWunsch = stil.befestigung === "ring" ? art === "stadt" : optionen.mauer ?? art === "stadt"`;
    `burgWunsch = stil.setting === "fantasy" && (optionen.burg ?? art === "stadt")`.
  - `befestigt = mauerWunsch && stadtListe.length >= 5`; `mitMauer = befestigt && stil.befestigung !== "ring"`;
    Meldung `stil.texte.zuKlein` nur wenn `mauerWunsch && !befestigt && stil.befestigung !== "ring"`.
  - `kernSet = befestigt ? stadtListe.slice(0, stil.befestigung === "zaun" ? stadtListe.length : Math.max(4, Math.round(stadtListe.length * stil.kernAnteil))) : stadtListe`.
  - Ring: `ringKanten = befestigt ? mauerKanten(graph, istKern) : []`; `ring = mitMauer ? ringKanten : []`
    (alles, was heute `ring`/`ringSet` heißt, bleibt `ring`). Für `"ring"` nach `hauptstrassen`:
    `wege = { haupt: new Set([...wege.haupt, ...ringKanten]), ausfall: wege.ausfall }`.
  - `vorstadt = befestigt && !istKern(i)` (heute `mitMauer && …`: für Fantasy identisch, weil dort
    `befestigt === mitMauer`); Beitrag `* (vorstadt ? stil.vorstadtAnteil : 1)`.
  - Zeile 101 `burg: burgWunsch && mitMauer`; nach `weiseRollenZu`:
    `stil.nachRollen?.(lagen, rollen, art, n => !!planung?.zonen.some(z => z.nutzung === n))`;
    `rollenLuecken.map(t => stil.burgWort === "Burg" ? t : t.replaceAll("Burgzone", \`Zone „${stil.burgWort}"\`).replaceAll("Keine Burg", \`Kein Bereich „${stil.burgWort}"\`))`.
    `weiseRollenZu` gibt `rollen` als `Map` zurück (Typ in `rollen.ts` auf `Map` weiten).
  - Bebauung → `stil.bebaue(auftragFleck)`; `burgMauern.push(...(ergebnis.mauern ?? []))`.
  - Mauer: Türme nur `if (stil.befestigung === "stein")`; für `"zaun"` die rohen Stücke direkt
    als `mauerStuecke`.
  - `breiten` → `stil.breiten(art)`; `hoefeLimit` → `stil.hoefe(art)`;
    Flurstreifen → `stil.streifen(flaeche(innen))`.
  - Notbau-Typ `art === "weiler" ? stil.typen.weiler[0]![0] : null`.
  - Typen: `zoneBuilding(zone, stil.setting, zug)`, `waehleTyp(stil.typen[b.rolle], zug)`.
  - Sonderbauten → `stil.sonderbauten({ art, markt, marktMitte, torPunkte, flussNah: fluss.length > 0, setze, amFluss, hatTyp: t => gewaehlt.some(b => b.typ === t) })`.
  - Titel → `b.titel ?? stil.titel(t, b, i, r)`, danach wie heute die Dublettenprüfung.
  - Bauwerke bekommen `dach: stil.dach(t)` nur wenn definiert (`...(d ? { dach: d } : {})`).
  - Beschriftung: `viertelBilden(lagenNamen, rollen, mitte, r, stil.namen, stil.vorstadt)`;
    Dorf-Label `stil.dorfplatz`. `ausstattung`/`dokument`: `setting: stil.setting`.
- [ ] **Step 3: `namen.ts`**: `viertelBilden(..., namen = NAMEN, vorstadt = (r) => \`${r}vorstadt\`)`;
  `NAMEN` exportieren.
- [ ] **Step 4:** `npx vitest run test/siedlung-gold-fantasy.test.ts test/viertel-stadt.test.ts test/viertel-rollen.test.ts test/viertel-bau.test.ts` — alle PASS, keine
  Schnappschussänderung. Bei Abweichung: Zufallsreihenfolge vergleichen, nicht Schnappschuss nachziehen.
- [ ] **Step 5:** `npx tsc --noEmit -p packages/forge` sauber; Commit
  `refactor(maps): the district pipeline takes a town style`.

---

### Task 3: Dachform in der Kartografie

**Files:**
- Modify: `packages/szene/src/cartography.ts` (Typ Z. 58, Parser Z. 216 und 235), `packages/szene/src/index.ts` (Export)
- Modify: `packages/forge/src/stadt/abschluss.ts` (`BauwerkAusgabe.dach?`, `dokument` schreibt `dach`)
- Test: `packages/szene/test/cartography-dach.test.ts`

**Produces:** `export const CARTOGRAPHY_DACHFORMEN = ["giebel", "flach", "halle", "kuppel", "plattform"] as const; export type CartographyDachform = typeof CARTOGRAPHY_DACHFORMEN[number];`
Rolle `building` bekommt `readonly dach?: CartographyDachform`.

- [ ] **Step 1: Test**

```ts
import { describe, expect, it } from "vitest";
import { parseTacticalCartography } from "../src/cartography.ts";

const basis = (extra: Record<string, unknown>) => ({ schemaVersion: 1, kind: "tactical-cartography", construction: { cellSize: 32, origin: [0, 0] },
  regions: [{ regionId: "h", role: "building", authored: false, locked: false, provenance: null, ...extra }] });
describe("Dachform eines Gebäudes", () => {
  it("nimmt jede bekannte Form an und lässt sie weg, wenn sie fehlt", () => {
    for (const dach of ["giebel", "flach", "halle", "kuppel", "plattform"]) expect(parseTacticalCartography(basis({ dach })).regions[0]).toMatchObject({ dach });
    expect(parseTacticalCartography(basis({})).regions[0]).not.toHaveProperty("dach");
  });
  it("lehnt unbekannte Formen ab", () => {
    expect(() => parseTacticalCartography(basis({ dach: "zwiebel" }))).toThrow(/dach/);
  });
});
```

- [ ] **Step 2:** läuft rot (`dach` ist ein unbekanntes Feld).
- [ ] **Step 3:** Parser: `object(row, path, common, ["lotRegionId", "streetRegionId", "attachedStampIds", "dach"])`,
  `if (Object.hasOwn(row, "dach")) choice(row.dach, CARTOGRAPHY_DACHFORMEN, \`${path}.dach\`)`; `dach` in die
  Liste der optionalen Zeilenfelder (Z. 216). `abschluss.ts`: `BauwerkAusgabe` + `readonly dach?: CartographyDachform`,
  in `dokument` `...(b.dach ? { dach: b.dach } : {})`.
- [ ] **Step 4:** Test grün; `npx vitest run test/siedlung-gold-fantasy.test.ts` (Forge) weiter grün.
  `grep -rn "role: \"building\"" packages/client/src packages/server/src` — jede Stelle, die eine
  Gebäuderolle neu zusammensetzt, prüfen: Kopien mit `...role` reichen `dach` durch; wo Felder
  einzeln kopiert werden, `dach` ergänzen.
- [ ] **Step 5:** Commit `feat(maps): buildings can name their roof shape`.

---

### Task 4: Gegenwart v12 (`MODERN`)

**Files:**
- Create: `packages/forge/src/stadt/kreis.ts`, `stadt/modern/raster.ts`, `stadt/modern/bloecke.ts`, `stadt/modern/stil.ts`
- Modify: `packages/forge/src/siedlung.ts` (Gegenwart → `erzeugeViertelStadt(g, basis, MODERN)`, Version `"12"`), `stadt/gemeinsam.ts` (Typ von `frontParzellen`), `stadt/viertel/parzellen.ts` (`zerteile` exportieren)
- Test: `packages/forge/test/stadt-kreis.test.ts`, `modern-raster.test.ts`, `modern-stadt.test.ts`

**Interfaces:**

```ts
// kreis.ts — Einheitsvektoren eines regelmäßigen n-Ecks, n = 3·2^k oder 4·2^k (sonst fail).
export function kreisRichtungen(n: number): readonly Punkt[];
/** n-Eck um m, Radius r, Startrichtung d0 (Einheitsvektor), quantisiert. */
export function vieleck(m: Punkt, r: number, n: number, d0?: Punkt): Polygon;
// raster.ts
export interface Raster { readonly strassen: readonly Gasse[]; readonly bloecke: readonly { readonly pfad: string; readonly poly: Polygon }[] }
/** Gedrehtes Raster im Stadtteil: u = Richtung der längsten Hauptstraße am Rand, Maschen mu × mv. */
export function raster(a: ParzellenAuftrag, innen: Polygon, u: Punkt, mu: number, mv: number, breite: number): Raster;
// bloecke.ts — je Block ein Bauer; Ergebnis wie bebaueFleck.
export function bebaueStadtteil(a: ParzellenAuftrag): FleckBau;
```

**Algorithmus `kreisRichtungen(n)`:** Basis `n0 = 3` (cos = −.5) oder `4` (cos = 0); solange
`n0 < n`: `c = Math.sqrt((1 + c) / 2)`, `n0 *= 2`. Dann `s = Math.sqrt(1 - c*c)`; Richtungen
`d_0 = [1,0]`, `d_{i+1} = [d_i.x*c - d_i.y*s, d_i.x*s + d_i.y*c]`. Test: `n = 12` trifft `ZWOELF`
aus `mauer.ts` auf 1e-12; `n = 32` hat Länge 1 ± 1e-12 und `d_8 ≈ [0,1]`.

**Algorithmus `raster`:**
1. `v = [-u.y, u.x]`. Projektionen von `innen` auf u und v → `[u0,u1]`, `[v0,v1]`.
2. Phase `pu = a.r.zahl(.3, .7) * mu`, `pv = a.r.zahl(.3, .7) * mv`. Schnitte
   `cu = u0 + pu + k·mu` für alle mit `u0 + .45·mu < cu < u1 − .45·mu`; ebenso `cv`.
3. **Durchgehende** Straßen quer zu u (Linie `u·p = cu`): Sehne `sehne(aussen, u, cu)`, Band
   `aussen ∩ {|u·p − cu| ≤ breite/2}`. `aussen = einwaertsKanten(a.zelle, a.abstaende.map(d => Math.max(0, d - .15)))`
   (reicht 0,03 in die Hauptstraße, keine Fuge). Id `a.id("gasse", a.pfad, "raster", \`u${k}\`)`.
4. **Abschnittsstraßen** quer zu v nur zwischen zwei u-Straßen (keine Überlappung, T-/X-Kreuzungen):
   für jeden Streifen `s` zwischen `cu_{s}+b/2` und `cu_{s+1}−b/2` (Randstreifen offen) und jedes
   `cv`: Sehne im Streifenpolygon, Band wie oben. Id `…\`v${k}.${s}\``. Bänder unter 1,2 Zellen Länge entfallen.
5. **Blöcke** = `innen ∩ Streifen_u(s) ∩ Streifen_v(t)` (konvex). Pfad `${a.pfad}.b${s}_${t}`.
   Blöcke unter `.4·mu·mv` oder mit Wasser (`flaeche(schnittKonvex(block, w)) > 1e-6` für ein
   `w` in `a.hindernisse`) werden nicht bebaut und als `Platz` „grass" zurückgegeben.
   Straßen, deren Band Wasser schneidet, entfallen.

**Maschen (mu × mv) je Rolle**, skaliert mit `s = clamp(sqrt(a.losFlaeche / 3.2), .8, 1.35)`:
markt 6.5×6.5, wohnen Kern 7×9, wohnen außen/Weiler 5.5×11, arm 9×12, adel 9×11,
handwerk/hafen 11×13, tempel/burg 10×10, frei → kein Raster.

**Blockbauer (`bloecke.ts`)** — Häuser mit Straßen-Adresse über `vorDerTuer`-Logik
(nächste Straße aus `a.randStrassen ∪ raster.strassen`, Abstand ≤ Bandbreite + .35; sonst Hof):
- *markt*: größter Block → Rathausplatz: `rechteck(mitte, u, min(L*.34,3.4), min(B*.3,2.4))`,
  Rest `platzUm(block, [rechteck+.7], …, "square")`, Rathaus Rang 0 Adresse = Platz-Id
  (`a.id("markt", platz.pfad)`, wie Fantasy). Übrige Blöcke: ein Turm
  `rechteck(schwerpunkt, u, min(L*.62, 7.5), min(B*.55, 5))` (schrumpfen 1/.85/.7 bis er passt),
  Rest Platz „square". Typ `null` (Tabelle: buero, hotel, bank, supermarkt, restaurant).
- *wohnen* Kern (`!a.vorstadt && a.art === "stadt"`): **Blockrand** —
  `frontParzellen(block, kantenAlsStrassen(block), frontage = 4.5*s, tiefe = 2.3, a.r)`, jedes Los
  `einwaerts(los, .05)` ist ein Haus (Rang 2), Hof = `einwaerts(block, 2.45)` als Platz „grass".
  `kantenAlsStrassen` = Blockkanten ≥ 1,5 Zellen als `{von,bis}`.
- *wohnen* außen / Dorf / Weiler: **Einfamilienhäuser** — `zerteile(block, losFlaeche*1.4, Infinity, …)`,
  je Los mit Straße `hausImLos(einwaerts(los,.12), tuer, 1.9*s, 1.7*s, "rechteck")`, Typ `haus`.
- *arm*: **Zeilenbau** — längste Blockkante mit Straße e; Riegel senkrecht zu e: Breite 2.2,
  Länge `min(10, Blocktiefe − .6)`, Abstand 5 entlang e, Start .8; Riegel, die nicht ganz im
  Block liegen, halbieren die Länge einmal, dann entfallen sie. Typ `wohnblock`. Rest Platz „grass".
- *adel*: **Villen** — wie Einfamilienhäuser mit `losFlaeche*3`, Haus 3×2.4, Form `"l"` bei Zug < .35.
- *handwerk*, *hafen*: **Hallen** — `rechteck` an der Straßenfront: Länge `min(L*.8, 9)`,
  Tiefe `min(B*.55, 5.5)`, 0,4 hinter der Front; zweite Halle, wenn danach noch ≥ 4 Tiefe bleibt.
  Hof Platz „square". Typ `null` (Tabelle: fabrik, lager, werkstatt; Hafen: lager).
- *tempel*: **Schule & Klinik** — ein Bau `hausImLos(block, tuer, min(L*.6,8), min(B*.45,4.5), "u")`,
  Typ `krankenhaus` im ersten, `schule` im zweiten Block des Flecks (Rang 0, Adresse Straße);
  Sportplatz `rechteck` 5×3 im Rest als Platz „grass", wenn er passt.
- *burg*: **Rathaus & Ämter** — `frontParzellen` mit frontage 6: Lose 1–3 werden `rathaus`,
  `polizei`, `feuerwache` (Rang 0), Rest Platz „square".
- *frei*: kein Raster; `innen` Platz „grass", zwei Wege (Plätze „path", Breite .5) längs u und v
  durch den Schwerpunkt, 2–4 Baumgruppen `vieleck(p, 1.2, 12)` als Platz „forest" (nicht über den Wegen).

**`MODERN`** (`modern/stil.ts`):
- `flecken`: wie Fantasy mit Teiler Stadt 22, Dorf 14, Weiler 6.
- `befestigung: "ring"`, `kernAnteil: .6`, `vorstadtAnteil: 1`.
- `breiten`: `{ haupt: 1.3, gasse: 1.0, wall: 1.0, ausfall: 1.1 }` (Dorf/Weiler `{ haupt: 1.1, gasse: .9, wall: .9, ausfall: 1 }`).
- `bebaue = bebaueStadtteil`.
- `typen`: wohnen `[wohnblock 70, haus 20, cafe 5, restaurant 5]`, markt `[buero 40, hotel 15, bank 10, supermarkt 15, restaurant 10, cafe 10]`,
  handwerk `[fabrik 40, lager 35, werkstatt 25]`, hafen `[lager 80, werkstatt 20]`, adel `[haus 90, museum 5, bibliothek 5]`,
  arm `[wohnblock 100]`, tempel `[schule 50, krankenhaus 50]`, burg `[polizei 50, feuerwache 50]`, frei `[haus 100]`,
  weiler `[haus 60, bauernhof 30, lager 10]`.
- `hoefe`: Stadt 4, Dorf 6, Weiler 0; `streifen(f) = max(1, min(4, round(f / 14)))`.
- `sonderbauten`: Stadt → `krankenhaus`, `polizei`, `feuerwache`, `schule`, `bahnhof` je an
  `marktMitte`, sofern der Typ noch fehlt (`hatTyp`); Dorf → `supermarkt`, `schule`, `feuerwache`,
  `kirche` an `marktMitte`; je Tor ein `cafe` (nur Stadt/Dorf).
- `titel`: `haus`/`wohnblock` → `\`${BAUWERK_LABEL[t]} ${r.waehle(STRASSEN)} ${i+1}\``,
  `STRASSEN = ["Parkallee", "Lindenstraße", "Hafenring", "Am Markt", "Bahnhofstraße", "Gartenweg", "Ringstraße", "Mühlweg"]`;
  sonst `\`${BAUWERK_LABEL[t]} ${r.waehle(ORTE)}\`` mit `ORTE = ["Mitte", "Nord", "Süd", "West", "Ost", "am Ring", "am Park"]`,
  Dubletten fängt die Pipeline ab.
- `dach`: haus, bauernhof, kirche → `giebel`; fabrik, lager, werkstatt → `halle`; sonst `flach`.
- `namen`: markt `["Innenstadt", "City", "Altstadt"]`, tempel `["Schulzentrum", "Klinikviertel"]`,
  burg `["Rathausviertel", "Behördenviertel"]`, hafen `["Hafen", "Hafencity", "Am Kai"]`,
  handwerk `["Gewerbegebiet", "Industriegebiet", "Gewerbepark"]`, adel `["Villenviertel", "Parkhöhe", "Sonnenhang"]`,
  arm `["Hochhaussiedlung", "Wohnblöcke", "Neubaugebiet"]`, wohnen `["Wohngebiet Mitte", "Gartenstadt", "Lindenhof", "Parkviertel", "Südstadt"]`,
  frei `["Stadtpark", "Volkspark"]`; `vorstadt: r => \`${r}stadt\``; `dorfplatz: "Ortsmitte"`;
  `burgWort: "Rathaus & Ämter"`; `texte.zuKlein: ""` (Ring ist keine Option).

- [ ] **Step 1:** Test `stadt-kreis.test.ts` (Werte oben) schreiben, rot, `kreis.ts` schreiben, grün.
- [ ] **Step 2:** Test `modern-raster.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { raster } from "../src/stadt/modern/raster.ts";
import { flaeche, schnittKonvex } from "../src/polygon.ts";
import { rauschen } from "../src/kartenwerk.ts";

const zelle = [[0, 0], [30, 0], [30, 20], [0, 20]] as const;
const auftrag = { nr: 0, pfad: "f", zelle, rolle: "wohnen", vorstadt: false, art: "stadt", randStrassen: [], abstaende: [.8, .8, .8, .8],
  losFlaeche: 3.2, strassenDichte: .5, hindernisse: [], nurAnHaupt: false, r: rauschen("raster"), id: (...p: string[]) => p.join("/") } as const;
describe("Raster im Stadtteil", () => {
  it("schneidet Blöcke, die sich weder überlappen noch Straßen berühren", () => {
    const innen = [[.8, .8], [29.2, .8], [29.2, 19.2], [.8, 19.2]] as const;
    const r = raster(auftrag as never, innen, [1, 0], 7, 9, 1);
    expect(r.bloecke.length).toBeGreaterThanOrEqual(6);
    for (const b of r.bloecke) for (const s of r.strassen) expect(flaeche(schnittKonvex(b.poly, s.band))).toBeLessThan(1e-6);
    for (let i = 0; i < r.bloecke.length; i++) for (let j = i + 1; j < r.bloecke.length; j++)
      expect(flaeche(schnittKonvex(r.bloecke[i]!.poly, r.bloecke[j]!.poly))).toBeLessThan(1e-6);
    for (let i = 0; i < r.strassen.length; i++) for (let j = i + 1; j < r.strassen.length; j++)
      expect(flaeche(schnittKonvex(r.strassen[i]!.band, r.strassen[j]!.band))).toBeLessThan(1e-6);
  });
  it("dreht das Raster mit der Straße", () => {
    const innen = [[.8, .8], [29.2, .8], [29.2, 19.2], [.8, 19.2]] as const;
    const r = raster(auftrag as never, innen, [.8, .6], 7, 9, 1);
    const s = r.strassen[0]!, dx = s.bis[0] - s.von[0], dy = s.bis[1] - s.von[1];
    expect(Math.abs(dx * .8 + dy * .6) / Math.hypot(dx, dy)).toBeLessThan(.02); // quer zu u
  });
});
```

- [ ] **Step 3:** rot; `raster.ts` schreiben; grün.
- [ ] **Step 4:** Test `modern-stadt.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAssetpaket, parseTacticalCartography, TACTICAL_CARTOGRAPHY_LIMITS } from "@chronicle/szene";
import { erzeugeSiedlung } from "../src/siedlung.ts";
import { getrennteDaecher } from "../src/stadt/gemeinsam.ts";
import { flaeche, schnittKonvex } from "../src/polygon.ts";

const paket = parseAssetpaket(readFileSync(fileURLToPath(new URL("../../../assets/packs/pk.zeitwelten/paket.json", import.meta.url)), "utf8"));
const gen = (keim: string, optionen: Record<string, unknown>) => erzeugeSiedlung({ keim, optionen: { setting: "gegenwart", ...optionen } }, paket);
const STANDORTE = ["ebene", "fluss", "kueste", "huegel", "see"] as const;

describe("Gegenwart v12", () => {
  it("hat Stadtring, Innenstadt mit Rathaus, Park, Blockrand und Pflichtbauten", () => {
    const s = gen("v12:g:a", { art: "stadt", standort: "ebene" });
    expect(s.version).toBe("12");
    const typen = new Set(s.bauwerke.map(b => b.typ));
    for (const t of ["rathaus", "krankenhaus", "polizei", "feuerwache", "schule", "bahnhof", "wohnblock", "buero"]) expect(typen, t).toContain(t);
    expect(s.bericht.viertel?.some(v => v.nutzung === "frei")).toBe(true);
    expect(s.karte.walls.length).toBe(0);
    expect(s.cartography.regions.filter(r => r.role === "building" && r.dach === "halle").length + s.cartography.regions.filter(r => r.role === "building" && r.dach === "flach").length).toBeGreaterThan(20);
    expect(new Set(s.bauwerke.map(b => b.titel)).size).toBe(s.bauwerke.length);
    expect(s.cartography.labels?.some(l => l.text === "Innenstadt" || l.text === "City" || l.text === "Altstadt")).toBe(true);
  }, 30_000);
  it("dreht Raster je Stadtteil (mindestens zwei Richtungen)", () => {
    const s = gen("v12:g:b", { art: "stadt", standort: "ebene" });
    const richtungen = new Set(s.strassen.filter(x => x.id.includes("raster")).map(x => {
      const [a, b] = [x.umriss[0]!, x.umriss[1]!]; return Math.round(Math.abs(Math.atan2(b[1] - a[1], b[0] - a[0])) * 10);
    }));
    expect(richtungen.size).toBeGreaterThanOrEqual(3);
  }, 30_000);
  it.each(STANDORTE)("%s: gültig, ohne Überlappung, alles an Straßen, nichts im Wasser", standort => {
    for (const art of ["weiler", "dorf", "stadt"] as const) {
      const s = gen(`v12:g:${standort}:${art}`, { art, standort }), wo = `${standort}/${art}`;
      expect(s.bauwerke.length, wo).toBeGreaterThan(0);
      const strassen = new Set(s.strassen.map(x => x.id));
      for (const b of s.bauwerke) expect(strassen.has(b.strasse), `${wo} ${b.pfad}`).toBe(true);
      for (let a = 0; a < s.bauwerke.length; a++) for (let c = a + 1; c < s.bauwerke.length; c++)
        expect(getrennteDaecher(s.bauwerke[a]!.umriss, s.bauwerke[c]!.umriss), `${wo} ${s.bauwerke[a]!.pfad}`).toBe(true);
      const wasser = s.cartography.regions.filter(r => r.role === "water").map(r => s.karte.geometry.regions.find(g => g.id === r.regionId)!.punkte);
      const z = s.karte.grid.size;
      for (const b of s.bauwerke) for (const w of wasser) expect(flaeche(schnittKonvex(b.umriss, w.map(([x, y]) => [x / z, y / z] as const))), `${wo} ${b.pfad}`).toBeLessThan(1e-3);
      expect(() => parseTacticalCartography(s.cartography, s.karte), wo).not.toThrow();
      expect(JSON.stringify(s.cartography).length).toBeLessThanOrEqual(TACTICAL_CARTOGRAPHY_LIMITS.documentBytes);
      if (art !== "weiler") expect(s.bauwerke.length, wo).toBeGreaterThanOrEqual(Math.floor(s.bericht.angefordert * .6));
    }
  }, 60_000);
  it("ist deterministisch", () => {
    expect(gen("v12:g:det", { art: "dorf", standort: "fluss" })).toEqual(gen("v12:g:det", { art: "dorf", standort: "fluss" }));
  }, 30_000);
  it("nennt eine Zone „Rathaus & Ämter“ außerhalb der Stadt nicht „Burg“", () => {
    const planung = { schemaVersion: 1 as const, zonen: [{ id: "b", name: "Amt", nutzung: "burg" as const, dichte: 1, polygon: [[0, 0], [.04, 0], [.04, .04], [0, .04]] as const }] };
    const s = gen("v12:g:burg", { art: "stadt", standort: "ebene", planung });
    expect(s.version).toBe("12");
    expect(s.bericht.ausgelassen.join(" ")).toContain("Rathaus & Ämter");
    expect(s.bericht.ausgelassen.join(" ")).not.toContain("Burg");
  }, 30_000);
  it("antwortet auf winzige Karten mit Gebäude oder erklärter Absage", () => {
    const s = gen("v12:g:tiny", { art: "weiler", standort: "fluss", ausdehnung: [24, 18], bauwerke: 3 });
    expect(s.bauwerke.length).toBeGreaterThan(0);
  }, 30_000);
});
```

(Wasserprüfung in Zellen: Kartenpunkte durch `grid.size` teilen. Falls `grid.size` anders heißt,
im Dokument nachsehen: `karte.grid.size` laut `dokument()` in `abschluss.ts`.)

- [ ] **Step 5:** rot; `bloecke.ts`, `modern/stil.ts`, Weiche in `siedlung.ts` (Gegenwart → `MODERN`,
  Version `"12"` in `grundlage` für jedes Nicht-Fantasy-Setting, Layout-Keim-Version gleich).
  Konstante `SIEDLUNG_ZUKUNFT_VERSION = "12"` exportieren.
- [ ] **Step 6:** `npx vitest run test/modern-stadt.test.ts test/modern-raster.test.ts test/stadt-kreis.test.ts test/siedlung-gold-fantasy.test.ts` grün.
- [ ] **Step 7:** Probe `npx tsx .local/stadt-probe/render.ts stadt:gegenwart:fluss,dorf:gegenwart:ebene,weiler:gegenwart:huegel zwischen`
  (aus dem Worktree-Root), jedes Bild ansehen, Auffälligkeiten beheben, bevor committet wird.
- [ ] **Step 8:** Commit `feat(maps): modern towns with districts, grids and blocks (v12)`.

---

### Task 5: Sci-Fi v12 (`KOLONIE`)

**Files:**
- Create: `packages/forge/src/stadt/kolonie/sektoren.ts`, `kolonie/bebauung.ts`, `kolonie/stil.ts`
- Modify: `packages/forge/src/siedlung.ts` (Sci-Fi → `KOLONIE`; v8-Rumpf Z. 337–849 und seine nur
  dort benutzten Helfer/Importe löschen; `siedlungStandard`: `mauer: art === "stadt"` auch für Sci-Fi;
  Layout-Keim nimmt `mauer` für Sci-Fi auf)
- Test: `packages/forge/test/kolonie-sektoren.test.ts`, `kolonie-stadt.test.ts`

**Interfaces:**

```ts
// sektoren.ts
export interface SektorPlan { readonly ringe: readonly number[]; readonly teilung: readonly number[] }
/** Nabe, Ringsektoren und Flurring als Flecken (Zerlegung des Kartenrahmens). */
export function sektoren(a: FleckenAuftrag): { readonly alle: readonly Fleck[]; readonly innenZiel: number };
// bebauung.ts
export function bebaueSektor(a: ParzellenAuftrag): FleckBau;
```

**Algorithmus `sektoren`:**
1. `R = kurz · (Stadt .42 | Dorf .32 | Weiler .22)`, `n = Stadt 3 | Dorf 2 | Weiler 1` Ringe,
   `r0 = R · (Stadt .2 | Dorf .28 | Weiler .45)`, Ringradien `r_k = r0 + (R − r0)·k/n`.
2. Speichen `S = Stadt 8 | Dorf 6 | Weiler 4`. Teilung je Ring `A_1 = S`; `A_{k+1} = 2·A_k`, wenn
   `2π·(r_k + r_{k+1})/2 / (2·A_k) ≥ 5`, sonst `A_k`. Flurringe: `r_{n+1} = R·1.5` mit `2·A_n`,
   `r_{n+2} = hypot(breite,hoehe)` mit derselben Teilung.
3. Richtungen `kreisRichtungen(A_max)` (A_max = feinste Teilung, 3·2^k oder 4·2^k), gedreht um
   `kreisRichtungen(A_max·4)[r.ganz(0, 3)]` (kleine Keimdrehung ohne Trigonometrie). Ring k nutzt
   jede `A_max/A_k`-te Richtung.
4. Nabe = Vieleck mit den `A_1` Punkten auf `r0`. Sektor (k, j) = Punkte auf `r_{k-1}` für
   Richtungen j..j+1 (Teilung `A_k`), dann auf `r_k` **alle** Punkte des nächstfeineren Rings
   zwischen diesen Richtungen (Außenbogen mit Zwischenecken bleibt konvex), rückwärts.
   Alle Punkte `qp(mitte + d·r)`. Jede Zelle `schnittKonvex(zelle, rahmen)`; leere entfallen.
5. `Fleck`: `nr` = Index in `alle`, `punkt` = Schwerpunkt, `ferne` = Abstand Schwerpunkt–Mitte,
   `pfad = \`sektor.${k}.${j}\``. Reihenfolge: Nabe, Ring 1 (j aufsteigend), …, Flurringe.
   `innenZiel` = Nabe + Sektoren der Ringe 1..n.

**Bebauung (`bebauung.ts`)**, `innen = einwaertsKanten(a.zelle, a.abstaende)`, Richtung „außen"
= vom Kartenmittelpunkt der Stadt weg (Schwerpunkt der Zelle − Nabe ist nicht bekannt; nimm die
längste Kante mit Straße als Front):
- *markt* (Nabe oder geplanter Markt): Kommandozentrale `vieleck(m, min(2.4, ρ·.38), 8)`
  (ρ = Inkreisradius-Schätzung `sqrt(flaeche/π)`), Reaktor `vieleck(m + u·(ρ·.62), min(1.3, ρ·.2), 12)`,
  wenn er ganz in `innen` passt; Rest Platz „square"; beide Rang 0, Adresse = Platz.
- *wohnen*: Kuppeln je Kante mit Straße: Radius `ρk = clamp(sqrt(a.losFlaeche)·.62, 1, 2.1)`;
  Mittelpunkte entlang der Kante im Abstand `2ρk + .45`, `ρk + .12` nach innen; `vieleck(p, ρk, 12)`,
  nur wenn ganz in `innen`, trocken und `getrennteDaecher` zu allen bisherigen. Typ `raumstation`,
  Rang 2. Innenrest `einwaerts(innen, 2ρk + .5)` als Platz „grass" (Hydrokulturgarten), wenn ≥ 1.
- *adel*: wie wohnen mit Achtecken `vieleck(p, ρk·1.1, 8)`, Abstand `2.4ρk`, Typ `wohnblock`.
- *arm*: `frontParzellen(innen, kantenMitStrasse, 1.7, 1.3, a.r)`, je Los `einwaerts(los, .08)`,
  Typ `null` (Tabelle lager, wohnblock).
- *handwerk*: Hallen wie Gegenwart (Länge `min(L*.8, 8)`, Tiefe `min(B*.5, 4)`), Typ `null`.
- *hafen*: Landefelder `vieleck(p, ρp, 16)`, `ρp = clamp(ρ·.45, 2, 3.6)`; bis zu 3, gierig entlang
  der Achse; Typ `raumhafen`, erstes Rang 0, weitere Rang 1; Adresse = Platz „square" des Rests.
  Dazu eine Halle an der Front (Typ `lager`), wenn Platz bleibt.
- *tempel*: Labor `rechteck` (Rang 0) und Medstation `vieleck(…, 1.4, 12)` (Rang 0), Rest Platz.
- *burg*: wie markt, aber Kommando + Lagerhalle.
- *frei*: Platz „grass", 2–3 Baumgruppen „forest".

**`KOLONIE`** (`kolonie/stil.ts`):
- `flecken = sektoren`; `befestigung: "zaun"`, `kernAnteil: 1`, `vorstadtAnteil: 1`.
- `breiten`: Stadt `{ haupt: 1.3, gasse: .9, wall: .8, ausfall: 1.1 }`, sonst `{ haupt: 1.1, gasse: .8, wall: .7, ausfall: 1 }`.
- `nachRollen`: Stadt ohne `hafen`-Rolle und ohne geplanten Hafen → der trockene Sektor mit der
  größten Fläche unter denen mit `!kern || mauerRand` (äußerer Ring), der nicht Markt ist, wird `hafen`.
- `typen`: wohnen `[raumstation 100]`, markt `[restaurant 40, lager 30, buero 30]`,
  handwerk `[fabrik 45, werkstatt 35, labor 20]`, hafen `[lager 100]`, adel `[wohnblock 100]`,
  arm `[lager 50, wohnblock 50]`, tempel `[labor 60, medstation 40]`, burg `[kommando 60, lager 40]`,
  frei `[raumstation 100]`, weiler `[raumstation 60, lager 40]`.
- `hoefe: () => 0`; `streifen(f) = max(2, min(6, round(f / 6)))`.
- `sonderbauten`: Stadt → `medstation`, `labor` an `marktMitte`, wenn sie fehlen; Dorf → `medstation`;
  je Tor ein `lager` (Kontrollpunkt).
- `titel`: `raumstation` → `\`Habitat ${r.waehle(STERNE)}-${i+1}\``, sonst `\`${BAUWERK_LABEL[t]} ${r.waehle(STERNE)}\``,
  `STERNE = ["Vega", "Orion", "Kepler", "Nova", "Lyra", "Altair", "Sirius", "Deneb"]`.
- `dach`: raumstation, reaktor, medstation → `kuppel`; raumhafen → `plattform`; fabrik, werkstatt → `halle`; sonst `flach`.
- `namen`: markt `["Kommandodeck", "Zentralnabe"]`, tempel `["Forschungsring", "Medizinsektor"]`,
  burg `["Kommandozentrale", "Leitstand"]`, hafen `["Raumhafen", "Landefeld"]`,
  handwerk `["Fertigung", "Werftsektor", "Reaktorring"]`, adel `["Turmring", "Oberdeck"]`,
  arm `["Frachtquartier", "Containerhof"]`, wohnen `["Kuppelring", "Habitat Nord", "Habitat Süd", "Wohnsektor"]`,
  frei `["Grünring", "Biokuppel"]`; `vorstadt: r => \`Außensektor ${r}\``; `dorfplatz: "Zentraldeck"`;
  `burgWort: "Kommandozentrale"`; `texte.zuKlein: "Kein Schutzzaun: die Kolonie ist zu klein dafür."`.

- [ ] **Step 1:** Test `kolonie-sektoren.test.ts`: Zellen überlappen nicht (paarweise Schnittfläche
  < 1e-6), Summe der Flächen = Kartenfläche ± 0,5 %, jede Zelle konvex (Vorzeichen aller
  Kreuzprodukte gleich), Nabe ist `alle[0]` mit `ferne < 1`, `kantengraph(alle.map(f => f.zelle))`
  hat für Nabe und Ring 1 nur Kanten mit `f2 >= 0` (keine offenen Innenkanten). Rot → `sektoren.ts` → grün.
- [ ] **Step 2:** Test `kolonie-stadt.test.ts` nach dem Muster von `modern-stadt.test.ts` (Setting
  `scifi`), dazu: Stadt hat `kommando`, `raumhafen` (Dach `plattform`), ≥ 10 Kuppeln (Dach
  `kuppel`), Zaun (`walls.length > 8`) mit Lücken an Speichen (jede Hauptstraße schneidet keine
  Mauerlinie: für jede Mauer und jedes Hauptstraßenband `freieMauer(a, b, [band])` liefert genau
  das ganze Stück); `mauer: false` → keine Wände; Keim enthält `mauer`; Zonenplan `burg` außerhalb
  → Meldung mit „Kommandozentrale"; Standort `fluss` in der Schleife.
- [ ] **Step 3:** rot; `bebauung.ts`, `kolonie/stil.ts`, Weiche; v8-Rumpf löschen
  (`git grep` nach jetzt unbenutzten Exporten in `siedlung.ts`, `siedlung-plan.ts`; `lloyd`,
  `teileInParzellen` usw. bleiben, wenn andere Dateien sie nutzen).
- [ ] **Step 4:** `npx vitest run test/kolonie-sektoren.test.ts test/kolonie-stadt.test.ts test/modern-stadt.test.ts test/siedlung-gold-fantasy.test.ts` grün.
- [ ] **Step 5:** Probe `stadt:scifi:kueste,stadt:scifi:fluss,dorf:scifi:ebene,weiler:scifi:insel`, ansehen, nachbessern.
- [ ] **Step 6:** Commit `feat(maps): colonies with a hub, rings and spokes (v12)`.

---

### Task 6: Verträge und Vorgaben umstellen

**Files:**
- Modify: `packages/forge/test/siedlung-gold.test.ts` (→ v12; Schnappschüsse neu), `siedlung-plan.test.ts`,
  `siedlung-traffic.test.ts`, `siedlung-cartography.test.ts:142-180`, `settings.test.ts:87-88`,
  `zeitwelten.test.ts`; `packages/server/test/map-settings.test.ts`, `viertel-optionen.test.ts` (nur wenn rot)
- Modify: `packages/forge/src/siedlung.ts` (`siedlungStandard`: Stadt `bauwerke: 320` für alle Settings)
- Test: `packages/forge/test/zukunft-robust.test.ts` (neu)

- [ ] **Step 1:** Jede Datei einzeln laufen lassen, Fehlschläge lesen. Erwartete Anpassung:
  Version `"8"|"9"|"10"` → `"12"`; Eigenschaften (Zonen verwerfen Dächer, Straßenplan reserviert
  Flächen, Wasserquerungen mit Brücke) bleiben geprüft. Eine Eigenschaft, die v12 nicht mehr hat,
  wird nicht gelöscht, sondern gemeldet und im Ledger begründet.
- [ ] **Step 2:** `zukunft-robust.test.ts`:
  - Großstadt 88×64, 480 Gebäude, je Setting: < 15 s, Regionen ≤ 4096, Kartografie ≤ 1 MiB,
    Gebäude ≥ 300.
  - Moor-, See- und Inselstadt, je Setting, `zellgroesse: 32`, `ausdehnung [192,104]`: Regionen ≤ 4096.
  - `klein:${standort}` 12×12 Dorf je Setting: entweder Karte oder `GrundrissError`.
  - Straßenplan mit zwei Knoten je Setting: `bericht.verkehr.routes` alle `gebaut`.
- [ ] **Step 3:** `siedlungStandard` anpassen; Server-Tests `npx vitest run test/map-settings.test.ts test/viertel-optionen.test.ts` in `packages/server`.
- [ ] **Step 4:** Commit `test(maps): contracts follow the v12 towns`.

---

### Task 7: Optik `cartography-13`

**Files:**
- Modify: `packages/szene/src/cartography-projection.ts`
- Test: `packages/szene/test/cartography-projection.test.ts` (vorhandene Datei; `grep -n "cartography-12"` in `packages/**/test` und alle Treffer auf 13 heben)

Änderungen (nur Gegenwart/Sci-Fi oder gesetztes `dach`; Fantasy ohne `dach` zeichnet wie vorher):
1. `rendererVersion = "cartography-13"`.
2. Palette Gegenwart `lot: 0xb9c4a4` (Gärten/Höfe grünlich), Sci-Fi unverändert.
3. Dach: `const form = role.dach ?? (setting === "fantasy" ? "giebel" : "flach")`.
   - `giebel`: heutiger Fantasy-Zweig; Schornstein nur Fantasy.
   - `flach`: heutiger Nicht-Fantasy-Zweig plus Attika `emit(id, line(a,b,pen*.8, pen*1.2), palette.roofDark, .35)`
     je Kante (innen versetzt) und Dachaufbauten: bei Tiefe > 0,6 Zellen 1–3 Quadrate
     `size = cell*.12` auf `phase(id, 20..22)`-Positionen innerhalb (`inside`), Gegenwart `0x8d9794`,
     Sci-Fi Paneel `0x3d5f75` mit heller Kante.
   - `halle`: Grund `palette.roofLight`, dann quer zur Längsachse Streifen im Abstand `cell*.35`,
     abwechselnd `palette.roof` und `palette.roofDark` (.5).
   - `kuppel`: Grund `palette.roofLight`; zwei Ringe als Polygone, die zum Schwerpunkt auf 70 % und
     40 % skaliert sind, `tint(palette.roofLight, 18)` bzw. `tint(…, 34)`; Glanzfleck: auf 18 %
     skaliert und um (−25 %, −25 %) des Radius verschoben, `0xffffff` .5; Sci-Fi Umrandung
     `line(..., pen*.9)` in `0x5fe0e6` .8 zusätzlich zur Tinte.
   - `plattform`: Grund `0x3a4448`; Ring = auf 78 % skaliertes Polygon als Linienzug `0xe0b040` .9;
     Mittelmarke zwei gekreuzte Linien `0xe0e6e8`; vier Lichter an den Ecken der Achsen (kleine
     Quadrate `pen*1.2`, `0x7ff0ff`).
4. Straßen: Gegenwart, Material `street`, und `role` gehört zu einer `hauptstrasse`
   (Projection kennt die Art nicht → Kriterium: Bandbreite ≥ `cell*1.15`): gestrichelte Mittellinie
   `0xf2f2ea` .8, Striche `cell*.5` lang, Lücke `cell*.4`, entlang `roofAxes(points).along`.
   Sci-Fi, Material `street`: zwei Randlinien `0x5fe0e6` .55 entlang der Längsachse, Abstand
   `pen*1.2` von der Kante.
5. Plätze (`square`): Gegenwart Platten `cell*1.1` (globales Gitter, Fugen `tint(square,-14)` .3),
   Sci-Fi Deckplatten `cell*.9` mit Fugen `0x2f4148` .45 und je 7. Platte ein Licht `0x7ff0ff`.
6. Felder Sci-Fi: `phase(id, 3) < .5` → Solar: Grund `0x2c4a66`, Gitter `cell*.45` `0x6f9fc0` .5;
   sonst Hydrokultur: Grund `0x5f9a6a`, Streifen `cell*.3` `0xcfe8e0` .35.
7. Mauern Sci-Fi (Zeile ~948): `stone = 0x5fe0e6`, darunter dunkle Linie `0x1f2c33`; Breite `pen*2.4`.
8. Ortssymbol (`role === "ort"`), Zweig nach Setting:
   - Gegenwart: Dächer auf rechtwinkligem Gitter (`lean = 0`, keine Einzeldrehung), flach; Mitte
     3–5 dunkle Rechtecke `palette.roofDark` (Hochhäuser) mit Schatten; Stadt: Ringstraße als
     Umriss `palette.street` Breite `pen*1.4` statt Mauer, keine Ecktürme; keine Kirche.
   - Sci-Fi: große Kuppel in der Mitte (Zwölfeck aus `roofOf`-Quadraten ersetzt durch Kreispolygon
     mit 16 Punkten — Projektion darf Trigonometrie), Ringe wie Kuppel oben; kleine Kuppeln statt
     Dächer auf dem Gitter; Stadt: Landefeld (Plattform) neben der Mitte und Umriss als Zaun
     (`0x5fe0e6`); keine Kirche.
   - Fantasy unverändert.

- [ ] **Step 1: Tests schreiben** (in der vorhandenen Projektionstestdatei):
  - `rendererVersion` ist `cartography-13`.
  - Gegenwart-Gebäude mit `dach: "halle"` erzeugt mehr Polygone mit dieser `regionId` als mit `flach`.
  - `kuppel` in Sci-Fi enthält ein Polygon der Farbe `0x5fe0e6`.
  - Ortssymbol Gegenwart/Sci-Fi: keine Kreuzlinie (Kirche) — Prüfung: kein Polygon mit der
    Tintenfarbe, das die Kirchturm-Form hat; einfacher: Zeichnung mit `setting: "gegenwart"`
    enthält kein Polygon der Farbe `0xaaa08a` (Steinmauer) und Sci-Fi ein Polygon `0x5fe0e6`.
  - Fantasy-Gebäude ohne `dach`: Polygonliste identisch zu einer Zeichnung mit `dach: "giebel"`.
- [ ] **Step 2:** rot; umsetzen; `npx vitest run test/cartography-projection.test.ts` (szene) grün,
  Budgettests der Projektion (`grep -ln "decoration\|Budget" packages/szene/test`) grün.
- [ ] **Step 3:** Probe aller sieben Fälle als `nachher-*`, ansehen; Regionskarte mit Orten je
  Setting rendern (`erzeugeRegion` o. ä. aus `forge/src/region.ts`, Probe-Skript `.local/stadt-probe/region.ts`), ansehen.
- [ ] **Step 4:** Commit `feat(maps): modern and colony looks (cartography-13)`.

---

### Task 8: Oberfläche

**Files:**
- Modify: `packages/client/src/features/MapZonePlanner.tsx` (Beschriftungen je Setting; Prop `setting` von der Aufrufstelle durchreichen),
  `MapGenerationControls.tsx:105-110` (Sci-Fi: Schutzzaun-Kästchen; Gegenwart: kein Befestigungsblock; Großstadt 480 für alle),
  `packages/client/src/features/map-generation.ts` (Vorgaben `mauer` für Sci-Fi-Stadt)
- Modify: Sprachkatalog (die Datei, in der heute „Tempelbezirk" steht: `grep -rn "Tempelbezirk" packages/client/src --include=*.json`)
- Test: vorhandene Client-Tests der beiden Komponenten (`grep -ln "MapZonePlanner\|MapGenerationControls" packages/client/src packages/client/test`)

- [ ] **Step 1:** Beschriftungstabelle aus Spec Abschnitt 7 als
  `ZONE_LABEL: Record<KartenSetting, Record<SettlementUse, string>>` plus Erklärtexte
  (`ZONE_TITEL`) je Setting in Klartext, z. B. Gegenwart `burg`: „Rathaus, Polizei und Feuerwache um
  einen Platz.", Sci-Fi `hafen`: „Landefelder für Raumschiffe mit Frachthalle — braucht kein Wasser."
- [ ] **Step 2:** Test: Zonenplaner mit `setting="scifi"` zeigt die Option „Raumhafen", mit
  `gegenwart` „Rathaus & Ämter"; Generator-Steuerung zeigt bei Sci-Fi-Stadt „Schutzzaun mit Toren",
  bei Gegenwart keinen Befestigungsblock.
- [ ] **Step 3:** umsetzen; Katalogeinträge ergänzen; i18n-Prüfung (`grep -n "i18n" package.json`
  für das Skript, dann ausführen).
- [ ] **Step 4:** Client-Tests gezielt, `npm run build -w packages/client`.
- [ ] **Step 5:** Commit `feat(maps): the studio speaks each setting's language`.

---

### Task 9: Nachweis, Doku, Gedächtnis

- [ ] Bilder `nachher-*` neben `vorher-*` vergleichen; `design/iterations/stadt-zukunft-20260923.md`
  mit Befund je Bild (was liest modern/futuristisch, was noch nicht).
- [ ] `STATUS.md`-Kopf: Teil 2 fertig, Teil 3 offen.
- [ ] Gedächtnis `atlas-chronicles-kartenstudio-stand.md` und `MEMORY.md`-Zeile aktualisieren
  (Stil-Pipeline, v12, cartography-13, Fallen).
- [ ] `AGENT_COORDINATION.md` (Projektordner, außerhalb git) Eintrag Teil 2.
- [ ] Commit `docs(maps): part 2 notes`.

### Task 10: Schlussprüfung

- [ ] Reviewer-Subagent (opus) über `git diff main...HEAD`: Korrektheit, Fantasy-Bytegleichheit,
  Invarianten, Budget, Oberflächentexte.
- [ ] Befunde beheben (je Befund Test zuerst), gezielte Tests grün.
- [ ] finishing-a-development-branch: Menü vorlegen; Merge/Push nur auf ausdrücklichen Wunsch.
