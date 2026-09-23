<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Kampftisch — Karten, Balken, Masken: Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Kampfbühne wird zum Kampftisch. Gegner und Spielerfiguren liegen als Karten auf dem Spieltisch und tragen alle Balken des Regelpakets. Die Spielleitung bestimmt, wo jede Karte liegt (Hand, Feld, umgelegt, Ablage) und was die Runde von jedem Balken sieht.

**Architecture:** Jede Karte zeigt auf eine Figur mit Bogen. Die Balken kommen aus `evaluateVitals` über den echten Bogen. Die neue Tabelle `kampf_karten` hält Lage, Sichteinstellung und „Name für die Runde“ (Migration 037, Exportfassung 22). Der Server projiziert jede Antwort je Betrachter, und zwar mit einer reinen Funktion in `@chronicle/projection`. Die Oberfläche rechnet nie selbst; die Vorschau der Spielleitung holt sie beim Server ab. Der Live-Fingerabdruck hasht die projizierte Nutzlast, deshalb verrät kein Refresh-Zeitpunkt eine verdeckte Karte.

**Tech Stack:** TypeScript, Fastify und TypeBox (Server), PGlite/Postgres, React 19 (Client), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-23-kampftisch-karten-design.md` (Commit `3b7b439`). Mockup: `design/iterations/kampftisch-20260923/mockup.html`. Beide vor Aufgabe 1 lesen.

## Global Constraints

- **Arbeitsort:** eigener Zweig `feature/kampftisch` in einem Worktree (`superpowers:using-git-worktrees`). Auf `main` arbeitet parallel eine andere Sitzung (Release 0.5.1).
- **Commits:** nur ausdrückliche Pfade (`git add -- <pfad>`), nie `git commit -am`. Jede Nachricht endet mit `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- **Tests:** nie die volle Suite (`npm test`). Laufen die betroffenen Dateien plus die genannten Konsumenten, gezielt mit `npx vitest run <dateien>`. Playwright braucht vorher `npm run build`. Playwright und Vitest laufen nie gleichzeitig.
- **Typprüfung:** `npm run typecheck` (Wurzel; streng: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) **und** `npm run build` (Client). Die Wurzel schließt `packages/client` aus.
- **Sprache der Oberfläche:** Alltagsdeutsch ohne Fachwort (Kayas Klartext-Regel). Sichtbar nie „Maske“, „Projektion“, „Nutzlast“, „Schema“, „Server“, „Token“, „ID“, „Vitalwert“.
- **Sprachkatalog:** Jeder neue `t("…")`-Satz braucht einen englischen Eintrag in `packages/client/src/i18n/en/kampftisch.json`. Der Katalog steht in `i18n.ts` bei `textDateien`. Anzeigetabellen heißen `*_LABEL` und werden als `t(NAME_LABEL[schluessel])` aufgerufen. Keine verwaisten Einträge. Derselbe Satz darf in zwei Katalogen nicht verschieden übersetzt sein. `npm run gate:sprache` muss grün sein.
- **Keine Rückfrage über `window.confirm`/`alert`.** Das ist der Electron-Fokusfehler. Rückfragen stehen in der Oberfläche.
- **Farben:** Karten, Fenster und Marken nutzen nur Farbwerte der Looks, ohne Ersatzwerte wie `var(--x, #fff)`. Holz und Filz kommen unverändert aus `tabletop.css`.
- **Grenze B9** (`packages/core/src/nurleitung.ts`): Eine Nutzlast für Nicht-Leitung enthält nie Karten in `hand`/`ablage`, nie `ordnung`, `sicht`, `vomKampfAngelegt` oder `initiativeRollId`, und nie `actorId`/`bogenVersion` fremder Figuren. Sie hat keinen Zähler über Verborgenes.
- **Exportformat:** `kampf_karten` gibt es erst ab `native-v22`. Ein Paket ohne Zeile in `kampf_karten` bleibt bei seiner bisherigen Fassung (`alles-in-einer-datei.test.ts` erwartet weiter Fassung 12).
- **Migration:** `037_kampfkarten.sql`. Sie ist rein additiv, `kampf_teilnehmer` bleibt unverändert.

## Review Focus

Die fünf Fälle, die die Spezifikation einschließt und die am ehesten beißen, stehen hier, jeder mit seinem Test in der zuständigen Aufgabe:

1. **Die Spielleitung setzt mitten in der Runde die Initiative der Karte, die gerade am Zug ist.** Erwartet: Die Karte bleibt am Zug, ab dem nächsten Zug gilt die neue Reihenfolge. Test in Aufgabe 3.
2. **Eine Gegnerfigur wird während des Kampfes über die Figurenliste archiviert.** Erwartet: Die Karte bleibt mit ihren Werten liegen, nichts stürzt ab. Test in Aufgabe 4.
3. **Zwei Klicks oder zwei Fenster der Spielleitung ändern dieselbe Karte mit altem Stand.** Erwartet: 409, keine stille Überschreibung. Test in Aufgabe 3, die Meldung in der Oberfläche in Aufgabe 8.
4. **Das Regelpaket wird gewechselt, nachdem Balken eingestellt wurden (neue Kennungen).** Erwartet: Unbekannte Balken folgen `standard`, nichts wird plötzlich offen. Test in Aufgabe 1.
5. **Die Spielleitung verkleidet die Figur eines Spielers.** Erwartet: Wer die Figur führt, sieht sie mit echtem Namen und genauen Werten, alle anderen nur die Verkleidung. Tests in Aufgabe 1 und Aufgabe 4.

## Dateien

| Datei | Verantwortung |
| --- | --- |
| `packages/protocol/src/kampf.ts` (neu) | Anfrageschemata und Antworttypen des Kampftischs |
| `packages/projection/src/kampfkarte.ts` (neu) | reine Projektion einer Karte je Betrachter |
| `packages/rules/src/package-v2.ts` | `activeConditions` (wirkende Zustände für Anzeigen) |
| `packages/server/src/db/migrations/037_kampfkarten.sql` (neu) | Tabelle `kampf_karten` |
| `packages/io/src/native-v22/*` (neu) | Exportfassung 22 |
| `packages/server/src/domain/kampf-zug.ts` (neu) | reine Zugregeln über Feld-Karten |
| `packages/server/src/domain/kampf-lesen.ts` (neu) | Zeilen lesen, Werte anreichern, Nutzlast bauen |
| `packages/server/src/domain/kampfbuehne.ts` | Befehle und Lesewege des Kampftischs |
| `packages/server/src/domain/gameplay.ts` | `boegenFuerProjektion`, `setVital` |
| `packages/server/src/http/kampfbuehne.ts`, `http/gameplay.ts` | neue Wege |
| `packages/server/src/domain/communication.ts` | Kämpfe im Live-Fingerabdruck |
| `packages/client/src/features/kampftisch-model.ts` (neu) | reine Ansichtslogik und Anzeigetabellen |
| `packages/client/src/features/KampfBalken.tsx`, `Kampfkarte.tsx`, `KampfFenster.tsx`, `KampfAufnahme.tsx`, `Kampftisch.tsx` (neu) | Oberfläche |
| `packages/client/src/features/kampftisch.css` (neu) | Aussehen, ersetzt `kampfbuehne.css` |
| `packages/client/src/i18n/en/kampftisch.json` (neu) | englischer Katalog |

`Kampfbuehne.tsx` und `kampfbuehne.css` werden gelöscht.

---

### Task 1: Drahtvertrag und reine Projektion

**Files:**

- Create: `packages/protocol/src/kampf.ts`
- Modify: `packages/protocol/src/index.ts` (Ende)
- Create: `packages/projection/src/kampfkarte.ts`
- Modify: `packages/projection/src/index.ts`, `packages/projection/package.json`, `package-lock.json`
- Test: `packages/projection/test/kampfkarte.test.ts`

**Interfaces:**

- Produces (Protokoll): `KAMPF_SEITEN`, `KARTEN_LAGEN`, `BALKEN_MASKEN`, `KampfSeite`, `KartenLage`, `BalkenMaske`, `Kampfzustand`, `Wortstufe`, `BalkenArt`, `KampfSeiteSchema`, `StartLageSchema`, `NameFuerRundeSchema`, `KartenSicht`, `KartenSichtDaten`, `gueltigeKartenSicht(wert): wert is KartenSichtDaten`, `KarteLageSetzen`, `KarteSichtSetzen`, `KarteInitiativeSetzen`, `KartenAusVorlage`, `KampfBeenden`, `VitalSetzen`, `BalkenFuerRunde`, `BalkenFuerLeitung`, `KartenZustand`, `KartenBild`, `KarteFuerLeitung`, `KarteFuerRunde`, `KampfKopf`, `KampfFuerLeitung`, `KampfFuerRunde`, `KampfAufraeumen`.
- Produces (Projektion): `VitalStand`, `KartenQuelle`, `vorgabeSicht(seite)`, `wortstufe(wert, hoechst)`, `zehntel(wert, hoechst)`, `balkenArt(depletion)`, `maskeFuer(sicht, vitalId)`, `balkenFuerRunde(vital, maske)`, `zeigtBild(karte, fuehrt)`, `karteFuerLeitung(quelle)`, `karteFuerRunde(quelle, fuehrt)`.

- [ ] **Step 1: Write the failing test**

`packages/projection/test/kampfkarte.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { balkenFuerRunde, karteFuerLeitung, karteFuerRunde, vorgabeSicht, wortstufe, zehntel, type KartenQuelle, type VitalStand } from "../src/index.ts";

// Die Projektion ist die ganze Sichtregel des Kampftischs. Was hier nicht steht, erreicht die
// Runde nicht — deshalb prüft diese Datei vor allem, was FEHLT.
const leben: VitalStand = { id: "hp", label: "Leben", wert: 9, hoechst: 14, depletion: "defeat" };
const mana: VitalStand = { id: "mana", label: "Mana", wert: 22, hoechst: 30, depletion: "none" };
const quelle = (teil: Partial<KartenQuelle> = {}): KartenQuelle => ({
  id: "k1", name: "Graf Veyl", nameFuerRunde: null, seite: "gegner", lage: "feld", actorId: "a1", initiative: 17, ordnung: 3,
  initiativeRollId: "wurf-1", amZug: false, sicht: vorgabeSicht("gegner"), vomKampfAngelegt: true, version: 2, bogenVersion: 4,
  vitals: [leben, mana], zustaende: [{ id: "blutend", name: "Blutend" }], bild: { version: 2 }, aufgebraucht: false, ...teil,
});
const niemand = new Set<string>();

describe("Wortstufen und Zehntel", () => {
  it.each([[0, 10, "leer"], [-3, 10, "leer"], [0.1, 10, "knapp"], [4.9, 10, "knapp"], [5, 10, "gut"], [9.99, 10, "gut"], [10, 10, "voll"], [12, 10, "voll"], [1, 0, "voll"], [0, 0, "leer"]] as const)(
    "wortstufe(%s, %s) = %s", (wert, hoechst, stufe) => expect(wortstufe(wert, hoechst)).toBe(stufe));
  it.each([[0, 10, 0], [0.01, 10, 1], [0.4, 10, 1], [5, 10, 5], [9.6, 10, 9], [9.99, 10, 9], [10, 10, 10], [11, 10, 10], [3, 0, 10]] as const)(
    "zehntel(%s, %s) = %s", (wert, hoechst, z) => expect(zehntel(wert, hoechst)).toBe(z));
});

describe("Ein Balken für die Runde", () => {
  it("trägt je Anzeige nur, was diese Anzeige braucht", () => {
    expect(balkenFuerRunde(leben, "genau")).toEqual({ id: "hp", label: "Leben", art: "leben", anzeige: "genau", wert: 9, hoechst: 14 });
    expect(balkenFuerRunde(leben, "fuellstand")).toEqual({ id: "hp", label: "Leben", art: "leben", anzeige: "fuellstand", zehntel: 6 });
    expect(balkenFuerRunde(mana, "worte")).toEqual({ id: "mana", label: "Mana", art: "vorrat", anzeige: "worte", stufe: "gut" });
    expect(balkenFuerRunde(leben, "verborgen")).toBeNull();
  });
});

describe("Eine Karte für die Runde", () => {
  it("lässt Hand und Ablage ganz weg", () => {
    expect(karteFuerRunde(quelle({ lage: "hand" }), niemand)).toBeNull();
    expect(karteFuerRunde(quelle({ lage: "ablage" }), niemand)).toBeNull();
  });

  it("trägt keine Ordnung, keine Einstellungen, keinen Beleg und keine fremde Figur", () => {
    const karte = karteFuerRunde(quelle(), niemand)!;
    expect(Object.keys(karte).sort()).toEqual(["amZug", "balken", "bild", "eigene", "gewuerfelt", "id", "initiative", "lage", "name", "seite", "zustaende"]);
    expect(karte.gewuerfelt).toBe(true);
  });

  it("ersetzt den Namen und versteckt Bild und Zustände nach Einstellung", () => {
    const karte = karteFuerRunde(quelle({ nameFuerRunde: "Vermummte Gestalt", sicht: { ...vorgabeSicht("gegner"), bild: false, zustaende: false } }), niemand)!;
    expect(karte).toMatchObject({ name: "Vermummte Gestalt", bild: null, zustaende: [] });
    expect(JSON.stringify(karte)).not.toContain("Graf Veyl");
  });

  it("nimmt für Balken ohne eigene Einstellung den Standard — auch nach einem Paketwechsel", () => {
    // `mana` hat keinen Eintrag, `alt` gibt es im Paket nicht mehr: weder bricht etwas, noch wird etwas offen.
    const sicht = { schema: 1 as const, standard: "verborgen" as const, balken: { hp: "fuellstand" as const, alt: "genau" as const }, zustaende: true, bild: true };
    expect(karteFuerRunde(quelle({ sicht }), niemand)!.balken).toEqual([{ id: "hp", label: "Leben", art: "leben", anzeige: "fuellstand", zehntel: 6 }]);
  });

  it("zeigt die eigene Figur genau und mit echtem Namen, auch wenn die Spielleitung sie verkleidet", () => {
    const sicht = { ...vorgabeSicht("gegner"), standard: "verborgen" as const, bild: false, zustaende: false };
    const verkleidet = quelle({ nameFuerRunde: "Die Fremde", sicht });
    const eigene = karteFuerRunde(verkleidet, new Set(["a1"]))!;
    expect(eigene).toMatchObject({ eigene: true, name: "Graf Veyl", actorId: "a1", bogenVersion: 4, bild: { version: 2 } });
    expect(eigene.balken.map(b => b.anzeige)).toEqual(["genau", "genau"]);
    expect(karteFuerRunde(verkleidet, new Set(["jemand-anders"]))).toMatchObject({ eigene: false, name: "Die Fremde", balken: [], bild: null });
  });
});

describe("Eine Karte für die Spielleitung", () => {
  it("liest an jedem Balken mit, was die Runde bekommt", () => {
    const karte = karteFuerLeitung(quelle({ sicht: { ...vorgabeSicht("gegner"), balken: { mana: "verborgen" } } }));
    expect(karte.balken).toEqual([
      { id: "hp", label: "Leben", wert: 9, hoechst: 14, art: "leben", maske: "worte", fuerRunde: { id: "hp", label: "Leben", art: "leben", anzeige: "worte", stufe: "gut" } },
      { id: "mana", label: "Mana", wert: 22, hoechst: 30, art: "vorrat", maske: "verborgen", fuerRunde: null },
    ]);
    expect(karte).toMatchObject({ ordnung: 3, initiativeRollId: "wurf-1", gewuerfelt: true, vomKampfAngelegt: true, version: 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/projection/test/kampfkarte.test.ts`
Expected: FAIL. `balkenFuerRunde` und die anderen Funktionen werden von `../src/index.ts` nicht exportiert.

- [ ] **Step 3: Write the protocol contract**

`packages/protocol/src/kampf.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

/**
 * Der Kampftisch auf dem Draht — Anfragen als Schema, Antworten als Typ.
 *
 * Zwei Antwortformen, und der Unterschied ist die Aussage: die Spielleitung bekommt die Wahrheit
 * samt ihren Einstellungen (`KampfFuerLeitung`), alle anderen bekommen, was die Spielleitung sie
 * sehen lässt (`KampfFuerRunde`). Die zweite Form hat KEINE Felder für Verborgenes — keine
 * Ordnungszahl, keine Sichteinstellung, kein „verdeckt" —, damit ein vergessener Filter nicht still
 * etwas mitschickt (Grenze B9, `packages/core/src/nurleitung.ts`).
 */
export const KAMPF_SEITEN = ["gefaehrten", "gegner", "neutral"] as const;
export const KARTEN_LAGEN = ["hand", "feld", "umgelegt", "ablage"] as const;
export const BALKEN_MASKEN = ["genau", "fuellstand", "worte", "verborgen"] as const;
export type KampfSeite = typeof KAMPF_SEITEN[number];
export type KartenLage = typeof KARTEN_LAGEN[number];
export type BalkenMaske = typeof BALKEN_MASKEN[number];
export type Kampfzustand = "vorbereitet" | "laufend" | "beendet";
export type Wortstufe = "voll" | "gut" | "knapp" | "leer";
/** `leben` = Erschöpfung ist Niederlage (`depletion: "defeat"`), `vorrat` = jeder andere Balken. */
export type BalkenArt = "leben" | "vorrat";

const closed = { additionalProperties: false } as const;
const id = Type.String({ minLength: 1, maxLength: 128 });
const version = Type.Integer({ minimum: 0, maximum: 2_147_483_647 });
const initiative = Type.Integer({ minimum: -1_000_000, maximum: 1_000_000 });
const Maske = Type.Union([Type.Literal("genau"), Type.Literal("fuellstand"), Type.Literal("worte"), Type.Literal("verborgen")]);
const Lage = Type.Union([Type.Literal("hand"), Type.Literal("feld"), Type.Literal("umgelegt"), Type.Literal("ablage")]);
export const KampfSeiteSchema = Type.Union([Type.Literal("gefaehrten"), Type.Literal("gegner"), Type.Literal("neutral")]);
/** Eine neue Karte kommt aufs Feld oder verdeckt in die Hand — umgelegt oder abgelegt beginnt niemand. */
export const StartLageSchema = Type.Union([Type.Literal("hand"), Type.Literal("feld")]);
export const NameFuerRundeSchema = Type.Union([Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" }), Type.Null()]);

/** Was die Runde von einer Karte sieht, Fassung 1. Balkenkennungen folgen der Feldregel der Regelpakete. */
export const KartenSicht = Type.Object({
  schema: Type.Literal(1),
  standard: Maske,
  balken: Type.Record(Type.String({ pattern: "^[a-z][a-z0-9_-]{0,95}$" }), Maske, { maxProperties: 8 }),
  zustaende: Type.Boolean(),
  bild: Type.Boolean(),
}, closed);
export type KartenSichtDaten = Static<typeof KartenSicht>;
export const gueltigeKartenSicht = (wert: unknown): wert is KartenSichtDaten => Value.Check(KartenSicht, wert);

export const KarteLageSetzen = Type.Object({ lage: Lage, expectedVersion: version }, closed);
export const KarteSichtSetzen = Type.Object({ sicht: KartenSicht, nameFuerRunde: NameFuerRundeSchema, expectedVersion: version }, closed);
export const KarteInitiativeSetzen = Type.Object({ initiative, initiativeRollId: Type.Union([id, Type.Null()]) }, closed);
/** `commandId` bleibt kürzer als eine Kennung: je Figur wird `:<nummer>` angehängt. */
export const KartenAusVorlage = Type.Object({
  commandId: Type.String({ minLength: 1, maxLength: 120 }), templateId: id, templateRevision: Type.Integer({ minimum: 1, maximum: 2_147_483_647 }),
  anzahl: Type.Integer({ minimum: 1, maximum: 12 }), name: Type.Optional(Type.String({ minLength: 1, maxLength: 150, pattern: "\\S" })),
  seite: KampfSeiteSchema, initiative, lage: StartLageSchema,
}, closed);
export const KampfBeenden = Type.Object({ archivieren: Type.Optional(Type.Boolean()) }, closed);
export const VitalSetzen = Type.Object({ wert: Type.Number({ minimum: -1_000_000_000, maximum: 1_000_000_000 }), expectedVersion: version }, closed);

/** Ein Balken, wie ihn ein Betrachter ohne Leitung bekommt. Ein verborgener Balken fehlt ganz. */
export type BalkenFuerRunde =
  | { readonly id: string; readonly label: string; readonly art: BalkenArt; readonly anzeige: "genau"; readonly wert: number; readonly hoechst: number }
  | { readonly id: string; readonly label: string; readonly art: BalkenArt; readonly anzeige: "fuellstand"; readonly zehntel: number }
  | { readonly id: string; readonly label: string; readonly art: BalkenArt; readonly anzeige: "worte"; readonly stufe: Wortstufe };
export interface BalkenFuerLeitung {
  readonly id: string; readonly label: string; readonly wert: number; readonly hoechst: number; readonly art: BalkenArt;
  readonly maske: BalkenMaske;
  /** Was die Runde von diesem Balken bekommt, von derselben Funktion erzeugt. `null` = nichts. */
  readonly fuerRunde: BalkenFuerRunde | null;
}
export interface KartenZustand { readonly id: string; readonly name: string }
export interface KartenBild { readonly version: number }

export interface KarteFuerLeitung {
  readonly id: string; readonly name: string; readonly nameFuerRunde: string | null; readonly seite: KampfSeite; readonly lage: KartenLage;
  readonly actorId: string | null; readonly initiative: number; readonly ordnung: number; readonly initiativeRollId: string | null;
  readonly gewuerfelt: boolean; readonly amZug: boolean; readonly sicht: KartenSichtDaten; readonly vomKampfAngelegt: boolean;
  /** Stand der Kartenzeile; 0 = noch keine Zeile (Voreinstellung). */
  readonly version: number;
  readonly bogenVersion: number | null; readonly balken: readonly BalkenFuerLeitung[]; readonly zustaende: readonly KartenZustand[];
  readonly bild: KartenBild | null;
  /** Ein Balken mit Niederlage-Folge ist leer oder der Bogen wartet auf die Niederlage. Nur ein Hinweis. */
  readonly aufgebraucht: boolean;
}
export interface KarteFuerRunde {
  readonly id: string; readonly name: string; readonly seite: KampfSeite; readonly lage: "feld" | "umgelegt";
  readonly initiative: number; readonly gewuerfelt: boolean; readonly amZug: boolean;
  /** Der Betrachter führt diese Figur. Nur dann tragen die beiden folgenden Felder etwas. */
  readonly eigene: boolean; readonly actorId?: string; readonly bogenVersion?: number;
  readonly balken: readonly BalkenFuerRunde[]; readonly zustaende: readonly KartenZustand[]; readonly bild: KartenBild | null;
}
export interface KampfKopf {
  readonly id: string; readonly name: string; readonly zustand: Kampfzustand; readonly runde: number;
  readonly erstelltAm: number; readonly beendetAm: number | null;
}
export interface KampfFuerLeitung extends KampfKopf { readonly leitung: true; readonly teilnehmer: readonly KarteFuerLeitung[] }
export interface KampfFuerRunde extends KampfKopf { readonly teilnehmer: readonly KarteFuerRunde[] }
export interface KampfAufraeumen { readonly archiviert: readonly string[]; readonly nichtArchiviert: readonly string[] }
```

Am Ende von `packages/protocol/src/index.ts` anfügen:

```ts
export * from "./kampf.ts";
```

- [ ] **Step 4: Write the projection**

`packages/projection/src/kampfkarte.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { BalkenArt, BalkenFuerRunde, BalkenMaske, KampfSeite, KarteFuerLeitung, KarteFuerRunde, KartenBild, KartenLage,
  KartenSichtDaten, KartenZustand, Wortstufe } from "@chronicle/protocol";

/**
 * Die Sicht auf eine Karte des Kampftischs — rein, ohne Speicher, ohne HTTP.
 *
 * Der Server ist der Projektor (Grenze B9): er baut aus der Wahrheit der Spielleitung
 * (`KartenQuelle`) je Betrachter die Karte, die dieser bekommen darf. Die Oberfläche rechnet
 * nie selbst; sogar die Vorschau „Mit den Augen der Runde" holt sie beim Server ab. Eine zweite
 * Rechnung liefe beim ersten Randfall auseinander — und wäre dann die, die etwas verrät.
 */
export interface VitalStand { readonly id: string; readonly label: string; readonly wert: number; readonly hoechst: number; readonly depletion: "defeat" | "none" }
export interface KartenQuelle {
  readonly id: string; readonly name: string; readonly nameFuerRunde: string | null; readonly seite: KampfSeite; readonly lage: KartenLage;
  readonly actorId: string | null; readonly initiative: number; readonly ordnung: number; readonly initiativeRollId: string | null;
  readonly amZug: boolean; readonly sicht: KartenSichtDaten; readonly vomKampfAngelegt: boolean; readonly version: number;
  readonly bogenVersion: number | null; readonly vitals: readonly VitalStand[]; readonly zustaende: readonly KartenZustand[];
  readonly bild: KartenBild | null; readonly aufgebraucht: boolean;
}

/** Gefährten sieht die Runde genau, alles andere in Worten. Die Spielleitung ändert das je Karte. */
export function vorgabeSicht(seite: KampfSeite): KartenSichtDaten {
  return { schema: 1, standard: seite === "gefaehrten" ? "genau" : "worte", balken: {}, zustaende: true, bild: true };
}

/** Voll, mehr als halb, noch etwas, leer. Ein Höchstwert ≤ 0 zählt als voll, solange etwas da ist. */
export function wortstufe(wert: number, hoechst: number): Wortstufe {
  if (wert <= 0) return "leer";
  if (hoechst <= 0) return "voll";
  const anteil = wert / hoechst;
  return anteil >= 1 ? "voll" : anteil >= 0.5 ? "gut" : "knapp";
}

/**
 * Der Füllstand in Zehnteln. Ein fast voller Balken erscheint nicht voll und ein fast leerer nicht
 * leer; ohne Höchstwert lässt sich aus der Zahl kein genauer Wert zurückrechnen.
 */
export function zehntel(wert: number, hoechst: number): number {
  if (wert <= 0) return 0;
  if (hoechst <= 0 || wert / hoechst >= 1) return 10;
  return Math.min(9, Math.max(1, Math.round(wert / hoechst * 10)));
}

export const balkenArt = (depletion: "defeat" | "none"): BalkenArt => depletion === "defeat" ? "leben" : "vorrat";

/** Die Einstellung eines Balkens; ohne eigenen Eintrag gilt der Standard der Karte. */
export function maskeFuer(sicht: KartenSichtDaten, vitalId: string): BalkenMaske {
  const eigene = Object.hasOwn(sicht.balken, vitalId) ? sicht.balken[vitalId] : undefined;
  return eigene ?? sicht.standard;
}

export function balkenFuerRunde(vital: VitalStand, maske: BalkenMaske): BalkenFuerRunde | null {
  const { id, label } = vital, art = balkenArt(vital.depletion);
  switch (maske) {
    case "genau": return { id, label, art, anzeige: "genau", wert: vital.wert, hoechst: vital.hoechst };
    case "fuellstand": return { id, label, art, anzeige: "fuellstand", zehntel: zehntel(vital.wert, vital.hoechst) };
    case "worte": return { id, label, art, anzeige: "worte", stufe: wortstufe(vital.wert, vital.hoechst) };
    case "verborgen": return null;
  }
}

/** Sieht ein Betrachter ohne Leitung das Bild dieser Karte? Dieselbe Regel für Nutzlast und Bildweg. */
export function zeigtBild(karte: Pick<KartenQuelle, "lage" | "actorId" | "sicht">, fuehrt: ReadonlySet<string>): boolean {
  if (karte.lage === "hand" || karte.lage === "ablage") return false;
  return (karte.actorId !== null && fuehrt.has(karte.actorId)) || karte.sicht.bild;
}

export function karteFuerLeitung(q: KartenQuelle): KarteFuerLeitung {
  return {
    id: q.id, name: q.name, nameFuerRunde: q.nameFuerRunde, seite: q.seite, lage: q.lage, actorId: q.actorId,
    initiative: q.initiative, ordnung: q.ordnung, initiativeRollId: q.initiativeRollId, gewuerfelt: q.initiativeRollId !== null,
    amZug: q.amZug, sicht: q.sicht, vomKampfAngelegt: q.vomKampfAngelegt, version: q.version, bogenVersion: q.bogenVersion,
    balken: q.vitals.map(vital => {
      const maske = maskeFuer(q.sicht, vital.id);
      return { id: vital.id, label: vital.label, wert: vital.wert, hoechst: vital.hoechst, art: balkenArt(vital.depletion), maske, fuerRunde: balkenFuerRunde(vital, maske) };
    }),
    zustaende: q.zustaende, bild: q.bild, aufgebraucht: q.aufgebraucht,
  };
}

/**
 * Eine Karte für einen Betrachter ohne Leitung. `null` heißt: die Karte fehlt in seiner Nutzlast —
 * nicht „verdeckt", sondern nicht da. `fuehrt` sind die Figuren, die der Betrachter führt; ihre
 * Werte sieht er immer genau, denn ihren Bogen kann er ohnehin lesen.
 */
export function karteFuerRunde(q: KartenQuelle, fuehrt: ReadonlySet<string>): KarteFuerRunde | null {
  if (q.lage === "hand" || q.lage === "ablage") return null;
  const eigene = q.actorId !== null && fuehrt.has(q.actorId);
  const balken = q.vitals.flatMap(vital => {
    const b = balkenFuerRunde(vital, eigene ? "genau" : maskeFuer(q.sicht, vital.id));
    return b ? [b] : [];
  });
  return {
    id: q.id, name: eigene ? q.name : q.nameFuerRunde ?? q.name, seite: q.seite, lage: q.lage,
    initiative: q.initiative, gewuerfelt: q.initiativeRollId !== null, amZug: q.amZug, eigene,
    ...(eigene && q.actorId !== null ? { actorId: q.actorId, ...(q.bogenVersion !== null ? { bogenVersion: q.bogenVersion } : {}) } : {}),
    balken, zustaende: eigene || q.sicht.zustaende ? q.zustaende : [], bild: zeigtBild(q, fuehrt) ? q.bild : null,
  };
}
```

An `packages/projection/src/index.ts` anfügen:

```ts
export {
  vorgabeSicht, wortstufe, zehntel, balkenArt, maskeFuer, balkenFuerRunde, zeigtBild, karteFuerLeitung, karteFuerRunde,
  type VitalStand, type KartenQuelle,
} from "./kampfkarte.ts";
```

In `packages/projection/package.json` unter `dependencies` ergänzen: `"@chronicle/protocol": "*"`. Im Eintrag `"packages/projection"` von `package-lock.json` dieselbe Zeile unter `dependencies` ergänzen (von Hand, kein `npm install` nötig). `git diff package-lock.json` zeigt danach genau diese eine Zeile.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/projection/test/kampfkarte.test.ts packages/projection/test/entry.test.ts`
Expected: PASS, alle Fälle grün.

Run: `npm run typecheck`
Expected: 0 Fehler.

Run: `npm run gate:boundaries`
Expected: keine Verletzung (`projection → protocol` ist erlaubt).

- [ ] **Step 6: Gegenprobe**

In `karteFuerRunde` vorübergehend `if (q.lage === "hand" || q.lage === "ablage") return null;` auskommentieren. Der Test „lässt Hand und Ablage ganz weg“ muss rot werden. Danach die Zeile wieder einkommentieren und den Test erneut grün laufen lassen.

- [ ] **Step 7: Commit**

```bash
git add -- packages/protocol/src/kampf.ts packages/protocol/src/index.ts packages/projection/src/kampfkarte.ts packages/projection/src/index.ts packages/projection/package.json package-lock.json packages/projection/test/kampfkarte.test.ts
git commit -m "feat(kampf): Drahtvertrag und reine Projektion der Kampfkarte

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Tabelle `kampf_karten`, Exportfassung 22, Wiederherstellen, Löschen

Diese fünf Orte landen zusammen. Zwischen Migration und `restoreOrder` ist der Baum rot (`requireCoveredSchema` bricht jeden Export). Die Reihenfolge der Schritte ist deshalb nicht verhandelbar.

**Files:**

- Create: `packages/server/src/db/migrations/037_kampfkarten.sql`
- Create: `packages/io/src/native-v22/schema.ts`, `validation.ts`, `bundle.ts`, `current.ts`, `index.ts`
- Modify: `packages/io/src/index.ts` (letzte zwei `export`-Zeilen der Formatfassungen)
- Modify: `packages/server/src/domain/bundles.ts` (Import-Block Z. 3–11, `restoreOrder` Z. 51, `formatVersion` Z. ~79)
- Modify: `packages/server/src/domain/deletion.ts` (Z. ~71)
- Modify: `packages/server/test/restore-order.test.ts` (Z. 5 und 24)
- Test: `packages/server/test/kampfkarten-export.test.ts`

**Interfaces:**

- Consumes: `gueltigeKartenSicht` (Task 1).
- Produces: Tabelle `kampf_karten(teilnehmer_id PK, campaign_id, lage, name_fuer_runde, sicht jsonb, vom_kampf_angelegt, version, geaendert_am)`; `CAMPAIGN_V22_TABLES`, `CampaignTablesV22`, `CampaignTableNameV22`, `createCampaignBundleV22`, `validateCampaignBundleV22`, `validateKampfkartenTables` aus `@chronicle/io`; die `currentCampaign*`-Funktionen zeigen auf Fassung 22.

- [ ] **Step 1: Write the failing test**

`packages/server/test/kampfkarten-export.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCampaignBundleV22, currentCampaignSemanticDiff, currentCampaignTables, parseCurrentCampaignBundle, serializeCurrentCampaignBundle } from "@chronicle/io";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { createIdentity } from "../src/identity/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createKampfbuehne } from "../src/domain/kampfbuehne.ts";
import { exportCampaignBundle, initializeCampaignRestoreTarget, restoreCampaignBundle } from "../src/domain/bundles.ts";

const cfg = { origin: "https://karten.test", cookieSecret: "kampfkarten-export-secret-over-thirty-two", bootstrapToken: "kampfkarten-export-bootstrap-over-thirty-two", now: () => 1790000000000 };

// Eine verdeckte Karte ist Spielstand wie jeder andere: sie muss in der einen Datei stehen, aus ihr
// zurückkommen, und ein von Hand gebautes Paket darf sie nicht widersprüchlich hereintragen.
describe("Die Kartenlage reist im Kampagnenpaket mit", () => {
  let db: Db, gm: string, campaign: string, verdeckt: string, wolf: string;
  beforeAll(async () => {
    db = await createTestDb(); await migrate(db);
    gm = (await createIdentity(db, cfg).bootstrap("Kaya")).userId;
    campaign = (await createCampaigns(db, cfg).createCampaign(gm, { name: "Karten im Paket" })).id;
    const buehne = createKampfbuehne(db, cfg);
    const kampfId = (await buehne.anlegen(gm, campaign, { name: "Hinterhalt" })).id;
    await buehne.teilnehmerHinzufuegen(gm, campaign, kampfId, { name: "Wolf", seite: "gegner", initiative: 12 });
    const stand = await buehne.teilnehmerHinzufuegen(gm, campaign, kampfId, { name: "Späher", seite: "gegner", initiative: 9 });
    verdeckt = stand.teilnehmer.find(k => k.name === "Späher")!.id;
    wolf = stand.teilnehmer.find(k => k.name === "Wolf")!.id;
    await buehne.eroeffnen(gm, campaign, kampfId);
    // Den Weg, auf dem die Domäne diese Zeile schreibt, gibt es erst ab Aufgabe 3. Sie steht hier so, wie er sie schreiben wird.
    await db.query(`INSERT INTO kampf_karten(teilnehmer_id,campaign_id,lage,name_fuer_runde,sicht,vom_kampf_angelegt,version,geaendert_am)
      VALUES($1,$2,'hand','Schatten im Gebüsch',$3,false,1,$4)`,
      [verdeckt, campaign, JSON.stringify({ schema: 1, standard: "verborgen", balken: { hp: "worte" }, zustaende: false, bild: false }), cfg.now()]);
  }, 30_000);
  afterAll(async () => { await db?.close(); });

  it("hebt das Paket auf Fassung 22 und nimmt die Zeile mit", async () => {
    const bundle = await exportCampaignBundle(db, gm, campaign, cfg);
    expect(bundle.version).toBe(22);
    expect(currentCampaignTables(bundle).kampf_karten).toEqual([expect.objectContaining({ teilnehmer_id: verdeckt, lage: "hand", name_fuer_runde: "Schatten im Gebüsch" })]);
  });

  it("liest sich aus einer Datei zurück und stellt dieselbe Welt her", async () => {
    const bundle = await exportCampaignBundle(db, gm, campaign, cfg);
    const text = serializeCurrentCampaignBundle(bundle);
    expect(currentCampaignSemanticDiff(bundle, parseCurrentCampaignBundle(text))).toEqual([]);
    const ziel = await createTestDb();
    try {
      await initializeCampaignRestoreTarget(ziel);
      expect(await restoreCampaignBundle(ziel, parseCurrentCampaignBundle(text))).toMatchObject({ dryRun: false, formatVersion: 22 });
      expect(currentCampaignSemanticDiff(bundle, await exportCampaignBundle(ziel, gm, campaign, cfg))).toEqual([]);
    } finally { await ziel.close(); }
  });

  it("weist eine Karte ab, die auf keinen Teilnehmer zeigt, unlesbar ist oder verdeckt am Zug steht", async () => {
    const bundle = await exportCampaignBundle(db, gm, campaign, cfg);
    const tabellen = currentCampaignTables(bundle), karte = tabellen.kampf_karten[0]!;
    const mit = (kampf_karten: unknown[], kampf_teilnehmer: unknown[] = [...tabellen.kampf_teilnehmer]) => () => createCampaignBundleV22({
      campaignId: bundle.manifest.campaignId, universeId: bundle.manifest.universeId, exportedAt: bundle.manifest.exportedAt,
      tables: { ...tabellen, kampf_teilnehmer, kampf_karten } as never });
    expect(mit([{ ...karte, teilnehmer_id: randomUUID() }])).toThrow(/combatant/);
    expect(mit([{ ...karte, sicht: { schema: 2 } }])).toThrow(/visibility/);
    // Der Zug wandert vom Wolf auf die verdeckte Karte: ein laufender Kampf mit genau einem Zug, aber in der Hand.
    const umgehaengt = tabellen.kampf_teilnehmer.map(t => ({ ...t, am_zug: t.id === verdeckt }));
    expect(umgehaengt.find(t => t.id === wolf)!.am_zug).toBe(false);
    expect(mit([karte], umgehaengt)).toThrow(/lies on the field/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/server/test/kampfkarten-export.test.ts`
Expected: FAIL. `createCampaignBundleV22` wird nicht exportiert, und die Tabelle `kampf_karten` existiert nicht.

- [ ] **Step 3: Write the migration**

`packages/server/src/db/migrations/037_kampfkarten.sql`:

```sql
-- Die Kartenlage des Kampftischs: wo eine Karte liegt und was die Runde von ihr sieht.
--
-- Eine eigene Tabelle statt neuer Spalten an `kampf_teilnehmer`: diese Tabelle steht im
-- eingefrorenen Exportprofil native-v11, und kein Profil kann Spalten an eine bestehende Tabelle
-- anhängen — `requireCoveredSchema` bräche jeden Export. Dasselbe Muster wie `actor_portraits`
-- neben `actor_profiles` (design/10-hosted-betrieb-und-auslieferung.md §1.4: rein additiv).
--
-- Eine Karte OHNE Zeile hier liegt auf dem Feld und trägt die Voreinstellung ihrer Seite. So
-- bleiben ältere Pakete (v11–v21) gültig, und ein Kampf ohne Besonderheiten erzeugt keine Zeile.
--
-- „Wer am Zug ist, liegt auf dem Feld" gilt über zwei Tabellen und lässt sich deshalb nicht als
-- CHECK schreiben. Die Domäne hält es unter der Kampfsperre, das Paket prüft es beim Einlesen.
CREATE TABLE kampf_karten (
  teilnehmer_id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  lage text NOT NULL CHECK (lage IN ('hand','feld','umgelegt','ablage')),
  name_fuer_runde text CHECK (name_fuer_runde IS NULL OR length(name_fuer_runde) BETWEEN 1 AND 160),
  sicht jsonb NOT NULL,
  vom_kampf_angelegt boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  geaendert_am bigint NOT NULL CHECK (geaendert_am >= 0),
  FOREIGN KEY (teilnehmer_id, campaign_id) REFERENCES kampf_teilnehmer(id, campaign_id)
);
-- statement
CREATE INDEX kampf_karten_campaign_idx ON kampf_karten(campaign_id);
```

- [ ] **Step 4: Write native-v22**

`packages/io/src/native-v22/schema.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
/**
 * Native v22 nimmt die Kartenlage des Kampftischs auf (Migration 037). Modul `play`, kein neues:
 * wo eine Karte liegt, ist Spielstand wie der Kampf selbst (native-v11).
 */
import { CAMPAIGN_V21_TABLES, CAMPAIGN_V21_MODULES, CAMPAIGN_BUNDLE_V21_LIMITS, type CampaignTablesV21 } from "../native-v21/schema.ts";
import type { CampaignColumn, CampaignRow } from "../campaign-schema.ts";

export const CAMPAIGN_BUNDLE_V22_LIMITS = CAMPAIGN_BUNDLE_V21_LIMITS;
const id = (): CampaignColumn => ({ kind: "text", maxLength: 128, pattern: "^[^\\u0000-\\u001f\\u007f]+$" });
function table<const N extends string>(name: N, fields: Readonly<Record<string, CampaignColumn>>, primaryKey: readonly string[]) {
  return Object.freeze({ name, module: "play" as const, fields: Object.freeze(fields), columns: Object.freeze(Object.keys(fields)), primaryKey: Object.freeze(primaryKey),
    bigintColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "bigint")), jsonColumns: Object.freeze(Object.keys(fields).filter(k => fields[k]!.kind === "json")) });
}
export const CAMPAIGN_V22_ADDITIONAL_TABLES = Object.freeze([
  table("kampf_karten", {
    teilnehmer_id: id(), campaign_id: id(),
    lage: { kind: "text", values: ["hand", "feld", "umgelegt", "ablage"] },
    name_fuer_runde: { kind: "text", maxLength: 160, nullable: true },
    sicht: { kind: "json" },
    vom_kampf_angelegt: { kind: "boolean" },
    version: { kind: "integer", minimum: 1, maximum: 2147483647 },
    geaendert_am: { kind: "bigint" },
  }, ["teilnehmer_id"]),
] as const);
export const CAMPAIGN_V22_TABLES = Object.freeze([...CAMPAIGN_V21_TABLES, ...CAMPAIGN_V22_ADDITIONAL_TABLES] as const);
export const CAMPAIGN_V22_MODULES = CAMPAIGN_V21_MODULES;
export type CampaignTableNameV22 = typeof CAMPAIGN_V22_TABLES[number]["name"];
export type CampaignModuleV22 = typeof CAMPAIGN_V22_MODULES[number];
export type CampaignTablesV22 = CampaignTablesV21 & { readonly kampf_karten: readonly CampaignRow[] };
export function emptyCampaignTablesV22(): CampaignTablesV22 { return Object.fromEntries(CAMPAIGN_V22_TABLES.map(t => [t.name, []])) as unknown as CampaignTablesV22; }
```

`packages/io/src/native-v22/validation.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { gueltigeKartenSicht } from "@chronicle/protocol";
import { fail, object } from "../campaign-v3-json.ts";
import type { CampaignTablesV22 } from "./schema.ts";

/**
 * Was eine wiederhergestellte Kartenlage beweisen muss — dieselben Aussagen, die in der Datenbank
 * Fremdschlüssel und Domäne halten, weil ein von Hand gebautes Paket an beiden vorbeigeht:
 *
 *  1. Die Karte gehört dieser Kampagne und zeigt auf einen Teilnehmer, den das Paket enthält.
 *  2. Die Sichteinstellung hat die Form, die der Server liest. Eine unlesbare würde beim Lesen
 *     als „alles verborgen" gezeigt; das Paket soll sie gar nicht erst hereintragen.
 *  3. Wer am Zug ist, liegt auf dem Feld. Eine verdeckte Karte am Zug wäre ein Zug, den die
 *     Runde nicht sehen darf, auf einer Bühne, die niemand weiterschieben kann.
 */
export function validateKampfkartenTables(t: CampaignTablesV22, campaignId: string): void {
  const teilnehmer = new Map(t.kampf_teilnehmer.map(row => [String(object(row, "tables.kampf_teilnehmer").id), row]));
  for (const [index, value] of t.kampf_karten.entries()) {
    const path = `tables.kampf_karten[${index}]`, row = object(value, path);
    if (row.campaign_id !== campaignId) fail(path, "card belongs to another campaign");
    const teil = teilnehmer.get(String(row.teilnehmer_id));
    if (!teil || teil.campaign_id !== campaignId) fail(`${path}.teilnehmer_id`, "card names a combatant this bundle does not contain");
    if (!gueltigeKartenSicht(row.sicht)) fail(`${path}.sicht`, "card visibility settings are not readable");
    if (teil.am_zug === true && row.lage !== "feld") fail(`${path}.lage`, "a combatant at turn lies on the field");
  }
}
```

Prüfen, dass `fail` in `packages/io/src/campaign-v3-json.ts` als `never` erklärt ist (`native-v21/validation.ts` verlässt sich darauf). Falls nicht, `teil` nach der zweiten Prüfung mit `if (!teil) return;` absichern.

`packages/io/src/native-v22/bundle.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCampaignBundleV21, type CampaignBundleV21 } from "../native-v21/bundle.ts";
import type { CampaignRow } from "../campaign-schema.ts";
import { assertJson, fail, hash, object, list, string, keys, validateColumn, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { CAMPAIGN_V22_TABLES, CAMPAIGN_V22_MODULES, CAMPAIGN_BUNDLE_V22_LIMITS as LIMITS,
  type CampaignTablesV22, type CampaignModuleV22, type CampaignTableNameV22 } from "./schema.ts";
import { validateKampfkartenTables } from "./validation.ts";

export const CAMPAIGN_BUNDLE_V22_VERSION = 22 as const;
export interface CampaignBundleDataV22 { readonly campaignId: string; readonly universeId: string; readonly exportedAt: string; readonly tables: CampaignTablesV22 }
export interface CampaignBundleV22 {
  readonly format: "atlas-chronicles/campaign"; readonly version: 22;
  readonly manifest: Omit<CampaignBundleV21["manifest"], "modules"> & { readonly kampfkartenSchemaVersion: 1;
    readonly modules: readonly { readonly name: CampaignModuleV22; readonly version: 1; readonly count: number; readonly sha256: string }[] };
  readonly tables: CampaignTablesV22;
}
export function createCampaignBundleV22(data: CampaignBundleDataV22): CampaignBundleV22 {
  assertJson(data); keys(object(data, "data"), ["campaignId", "universeId", "exportedAt", "tables"], "data");
  keys(object(data.tables, "tables"), CAMPAIGN_V22_TABLES.map(table => table.name), "tables");
  // Alle Zeilen werden vollstaendig geprueft, BEVOR die eng gefasste Vorgängerprüfung laeuft.
  const original: Record<string, CampaignRow[]> = {};
  let rowCount = 0;
  for (const table of CAMPAIGN_V22_TABLES) {
    const seen = new Set<string>();
    original[table.name] = list(data.tables[table.name], `tables.${table.name}`, LIMITS.rowsPerTable).map((value, index) => {
      const path = `tables.${table.name}[${index}]`, row = object(value, path); keys(row, table.columns, path);
      for (const [column, field] of Object.entries(table.fields)) validateColumn(row[column], field, `${path}.${column}`);
      const pk = canonicalJson(table.primaryKey.map(column => row[column]!) as CanonicalValue);
      if (seen.has(pk)) fail(path, "duplicate primary key"); seen.add(pk);
      return JSON.parse(JSON.stringify(row)) as CampaignRow;
    }).sort((left, right) => {
      for (const column of table.primaryKey) { const a = String(left[column]), b = String(right[column]); if (a !== b) return a < b ? -1 : 1; }
      return 0;
    });
    rowCount += original[table.name]!.length;
    if (rowCount > LIMITS.rows) fail("tables", "total row limit exceeded");
  }
  const validated = original as unknown as CampaignTablesV22;
  const { kampf_karten, ...previous } = validated;
  const core = createCampaignBundleV21({ ...data, tables: previous as unknown as CampaignBundleV21["tables"] });
  const tables: CampaignTablesV22 = { ...core.tables, kampf_karten };
  validateKampfkartenTables(tables, data.campaignId);
  const modules = CAMPAIGN_V22_MODULES.map(name => {
    const specs = CAMPAIGN_V22_TABLES.filter(table => table.module === name);
    return { name, version: 1 as const, count: specs.reduce((count, table) => count + tables[table.name].length, 0), sha256: hash(Object.fromEntries(specs.map(table => [table.name, tables[table.name]]))) };
  });
  const bundle: CampaignBundleV22 = { format: "atlas-chronicles/campaign", version: 22,
    manifest: { ...core.manifest, kampfkartenSchemaVersion: 1, contentHash: hash(tables), modules }, tables };
  if (Buffer.byteLength(canonicalJson(bundle as unknown as CanonicalValue), "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  return bundle;
}
export function validateCampaignBundleV22(value: unknown): CampaignBundleV22 {
  assertJson(value); const row = object(value, "$"), manifest = object(row.manifest, "manifest"); keys(row, ["format", "version", "manifest", "tables"], "$");
  if (row.format !== "atlas-chronicles/campaign" || row.version !== 22 || manifest.kampfkartenSchemaVersion !== 1) fail("manifest", "unsupported campaign profile/version; explicit migration required");
  const bundle = createCampaignBundleV22({ campaignId: string(manifest.campaignId, "manifest.campaignId"), universeId: string(manifest.universeId, "manifest.universeId"), exportedAt: string(manifest.exportedAt, "manifest.exportedAt", 40), tables: row.tables as unknown as CampaignTablesV22 });
  keys(manifest, Object.keys(bundle.manifest), "manifest");
  if (hash(manifest) !== hash(bundle.manifest)) fail("manifest", "payload/core/module checksum or count mismatch");
  return bundle;
}
export function parseCampaignBundleV22(text: string): CampaignBundleV22 {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCampaignBundleV22(value);
}
export function serializeCampaignBundleV22(bundle: CampaignBundleV22): string { return canonicalJson(validateCampaignBundleV22(bundle) as unknown as CanonicalValue); }
export function campaignSemanticDiffV22(a: CampaignBundleV22, b: CampaignBundleV22): readonly CampaignTableNameV22[] {
  const left = validateCampaignBundleV22(a), right = validateCampaignBundleV22(b);
  return CAMPAIGN_V22_TABLES.filter(table => hash(left.tables[table.name]) !== hash(right.tables[table.name])).map(table => table.name);
}
```

`packages/io/src/native-v22/current.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { canonicalJson, type CanonicalValue } from "@chronicle/core";
import { createCurrentCampaignBundle as createPrevious, validateCurrentCampaignBundle as validatePrevious, type CurrentCampaignBundle as PreviousBundle } from "../native-v21/current.ts";
import { assertJson, fail, hash, object, list, rejectDuplicateKeys } from "../campaign-v3-json.ts";
import { createCampaignBundleV22, validateCampaignBundleV22, type CampaignBundleV22, type CampaignBundleDataV22 } from "./bundle.ts";
import { CAMPAIGN_V22_TABLES, CAMPAIGN_BUNDLE_V22_LIMITS, emptyCampaignTablesV22, type CampaignTablesV22, type CampaignTableNameV22 } from "./schema.ts";
export type CurrentCampaignBundle = PreviousBundle | CampaignBundleV22;
export function currentCampaignTables(bundle: CurrentCampaignBundle): CampaignTablesV22 { return { ...emptyCampaignTablesV22(), ...bundle.tables }; }
/** Solange keine Karte eine eigene Lage hat, bleibt die bisherige Formatversion der Sicherung erhalten. */
export function createCurrentCampaignBundle(data: Parameters<typeof createPrevious>[0] | CampaignBundleDataV22): CurrentCampaignBundle {
  assertJson(data); const tables = object(data.tables, "tables");
  if (Object.hasOwn(tables, "kampf_karten") && list(tables.kampf_karten, "tables.kampf_karten").length)
    return createCampaignBundleV22(data as CampaignBundleDataV22);
  const { kampf_karten: _karten, ...previous } = tables;
  return createPrevious({ ...data, tables: previous as unknown as Parameters<typeof createPrevious>[0]["tables"] });
}
export function validateCurrentCampaignBundle(value: unknown): CurrentCampaignBundle { assertJson(value); return object(value, "$").version === 22 ? validateCampaignBundleV22(value) : validatePrevious(value); }
export function parseCurrentCampaignBundle(text: string): CurrentCampaignBundle {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > CAMPAIGN_BUNDLE_V22_LIMITS.bytes) fail("$", "maximum campaign bundle size exceeded");
  rejectDuplicateKeys(text); let value: unknown; try { value = JSON.parse(text); } catch { fail("$", "invalid campaign JSON"); }
  return validateCurrentCampaignBundle(value);
}
export function serializeCurrentCampaignBundle(bundle: CurrentCampaignBundle): string { return canonicalJson(validateCurrentCampaignBundle(bundle) as unknown as CanonicalValue); }
export function currentCampaignSemanticDiff(a: CurrentCampaignBundle, b: CurrentCampaignBundle): readonly CampaignTableNameV22[] {
  const left = currentCampaignTables(validateCurrentCampaignBundle(a)), right = currentCampaignTables(validateCurrentCampaignBundle(b));
  return CAMPAIGN_V22_TABLES.filter(table => hash(left[table.name]) !== hash(right[table.name])).map(table => table.name);
}
```

`packages/io/src/native-v22/index.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
export { CAMPAIGN_V22_TABLES, CAMPAIGN_V22_ADDITIONAL_TABLES, CAMPAIGN_V22_MODULES, CAMPAIGN_BUNDLE_V22_LIMITS,
  emptyCampaignTablesV22 } from "./schema.ts";
export type { CampaignTableNameV22, CampaignModuleV22, CampaignTablesV22 } from "./schema.ts";
export { createCampaignBundleV22, validateCampaignBundleV22, parseCampaignBundleV22, serializeCampaignBundleV22, campaignSemanticDiffV22, CAMPAIGN_BUNDLE_V22_VERSION } from "./bundle.ts";
export type { CampaignBundleV22, CampaignBundleDataV22 } from "./bundle.ts";
export { validateKampfkartenTables } from "./validation.ts";
```

In `packages/io/src/index.ts` die Zeile mit `./native-v21/current.ts` ersetzen durch:

```ts
export * from "./native-v22/index.ts";
export { createCurrentCampaignBundle, validateCurrentCampaignBundle, parseCurrentCampaignBundle, serializeCurrentCampaignBundle, currentCampaignSemanticDiff, currentCampaignTables, type CurrentCampaignBundle } from "./native-v22/current.ts";
```

Die Zeile `export * from "./native-v21/index.ts";` bleibt stehen.

- [ ] **Step 5: Wire the server**

In `packages/server/src/domain/bundles.ts`, Import-Block:

- `CAMPAIGN_V21_TABLES as CAMPAIGN_TABLES` wird `CAMPAIGN_V22_TABLES as CAMPAIGN_TABLES`
- `type CampaignTablesV21 as CampaignTables` wird `type CampaignTablesV22 as CampaignTables`
- `type CampaignTableNameV21 as CampaignTableName` wird `type CampaignTableNameV22 as CampaignTableName`

In `restoreOrder` die Zeile `"kaempfe", "kampf_teilnehmer",` ersetzen durch:

```ts
  "kaempfe", "kampf_teilnehmer", "kampf_karten",
```

In `CampaignRestoreReport` die Union `formatVersion: 4 | … | 20 | 21` um `| 22` erweitern.

In `packages/server/src/domain/deletion.ts` in `LOESCHREIHENFOLGE` die Zeile `"kampf_teilnehmer", "kaempfe",` ersetzen durch:

```ts
  "kampf_karten", "kampf_teilnehmer", "kaempfe",
```

In `packages/server/test/restore-order.test.ts` `CAMPAIGN_V21_TABLES` an beiden Stellen durch `CAMPAIGN_V22_TABLES` ersetzen.

Danach nach weiteren Wächtern suchen, die „die neueste Fassung“ fest nennen:

Run: `git grep -n "CAMPAIGN_V21_TABLES\|native-v21/current\|version === 21\|formatVersion: 21" -- packages e2e tools`
Expected: Treffer nur noch in `packages/io/src/native-v21/**` und in `native-v22/current.ts` (Import des Vorgängers). Jeden anderen Treffer, der die neueste Fassung meint, auf 22 heben. `tabletop.test.ts:122` (`toBe(21)`) bleibt: diese Kampagne hat keine Kartenzeile.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run packages/server/test/kampfkarten-export.test.ts packages/server/test/restore-order.test.ts packages/server/test/deletion.test.ts packages/server/test/alles-in-einer-datei.test.ts packages/server/test/tabletop.test.ts packages/server/test/kampfbuehne.test.ts`
Expected: PASS. `alles-in-einer-datei` meldet weiter Fassung 12 und `tabletop` weiter 21, denn beide haben keine Zeile in `kampf_karten`.

Run: `npx vitest run packages/io`
Expected: PASS.

Run: `npm run typecheck`
Expected: 0 Fehler.

- [ ] **Step 7: Commit**

```bash
git add -- packages/server/src/db/migrations/037_kampfkarten.sql packages/io/src/native-v22 packages/io/src/index.ts packages/server/src/domain/bundles.ts packages/server/src/domain/deletion.ts packages/server/test/restore-order.test.ts packages/server/test/kampfkarten-export.test.ts
git commit -m "feat(kampf): Kartenlage als Tabelle, Exportfassung 22, Wiederherstellen und Loeschen

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Kartenlage und Zugregeln

**Files:**

- Create: `packages/server/src/domain/kampf-zug.ts`
- Create: `packages/server/src/domain/kampf-lesen.ts` (erste Fassung: Zeilen lesen, Nutzlast der Spielleitung ohne Werte)
- Modify: `packages/server/src/domain/kampfbuehne.ts` (ganze Datei neu, siehe Step 4)
- Create: `packages/server/test/kampf-fixture.ts`
- Test: `packages/server/test/kampf-zug.test.ts`, `packages/server/test/kampfkarten.test.ts` (Abschnitt „Lage und Zug“)
- Konsumenten: `packages/server/test/kampfbuehne.test.ts`, `packages/server/test/alles-in-einer-datei.test.ts`, `packages/server/test/kampfkarten-export.test.ts`

**Interfaces:**

- Consumes: `karteFuerLeitung`, `vorgabeSicht`, `KartenQuelle` (Task 1); `gueltigeKartenSicht`, `KampfFuerLeitung`, `KartenLage`, `KartenSichtDaten`, `KampfSeite` (Task 1); Tabelle `kampf_karten` (Task 2).
- Produces:
  - `kampf-zug.ts`: `naechsteFeldkarte(karten, vonId): { id; neueRunde } | null`, `zugNachVerlassen(karten, wegId): { amZug: string | null; neueRunde: boolean }`
  - `kampf-lesen.ts`: `KarteRoh`, `KampfRoh`, `lies(tx, campaignId, kampfId, sperren?)`, `kampfFuerLeitung(tx, cfg, campaignId, roh): Promise<KampfFuerLeitung>`
  - `createKampfbuehne(db, cfg)`: `teilnehmerHinzufuegen(userId, campaignId, kampfId, { name, seite, initiative, actorId?, initiativeRollId?, lage?, nameFuerRunde?, sicht? })`, `lageSetzen(userId, campaignId, kampfId, teilnehmerId, { lage, expectedVersion })`, `initiativeSetzen(userId, campaignId, kampfId, teilnehmerId, { initiative, initiativeRollId })`. Alle Befehle geben `KampfFuerLeitung` zurück. `anlegen`, `teilnehmerEntfernen`, `eroeffnen`, `naechsterZug`, `beenden`, `buehnen`, `buehne` bleiben mit ihren bisherigen Parametern bestehen.
  - `kampf-fixture.ts`: `kampfFixture(db)`, `kampfCfg`, `KAMPF_ZEIT`, `PAKET`, `PNG_BASE64`

- [ ] **Step 1: Write the failing pure test**

`packages/server/test/kampf-zug.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import type { KartenLage } from "@chronicle/protocol";
import { naechsteFeldkarte, zugNachVerlassen } from "../src/domain/kampf-zug.ts";

// Die Karten stehen bereits in Initiativreihenfolge. Am Zug ist nur, wer auf dem Feld liegt.
const k = (id: string, lage: KartenLage = "feld") => ({ id, lage });

describe("Der nächste Zug", () => {
  it("überspringt Karten, die nicht auf dem Feld liegen", () =>
    expect(naechsteFeldkarte([k("a"), k("b", "hand"), k("c", "umgelegt"), k("d")], "a")).toEqual({ id: "d", neueRunde: false }));
  it("beginnt die Runde neu, wenn der Zug an den Anfang springt", () =>
    expect(naechsteFeldkarte([k("a"), k("b", "ablage"), k("c")], "c")).toEqual({ id: "a", neueRunde: true }));
  it("lässt eine einzelne Feldkarte in der nächsten Runde wieder handeln", () =>
    expect(naechsteFeldkarte([k("a"), k("b", "hand")], "a")).toEqual({ id: "a", neueRunde: true }));
  it("kennt keinen Nachfolger für eine Karte außerhalb des Felds", () =>
    expect(naechsteFeldkarte([k("a", "hand"), k("b")], "a")).toBeNull());
});

describe("Die Karte am Zug verlässt das Feld", () => {
  it("gibt an die nächste Feldkarte weiter", () =>
    expect(zugNachVerlassen([k("a"), k("b", "hand"), k("c")], "a")).toEqual({ amZug: "c", neueRunde: false }));
  it("springt beim Verlassen der letzten an den Anfang und zählt die Runde", () =>
    expect(zugNachVerlassen([k("a"), k("c")], "c")).toEqual({ amZug: "a", neueRunde: true }));
  it("lässt niemanden am Zug, wenn die letzte Feldkarte geht", () =>
    expect(zugNachVerlassen([k("a"), k("b", "hand")], "a")).toEqual({ amZug: null, neueRunde: false }));
});
```

- [ ] **Step 2: Write the shared fixture and the failing domain test**

`packages/server/test/kampf-fixture.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS } from "@chronicle/rules/examples";
import type { Db } from "../src/db/index.ts";
import { createCampaigns } from "../src/domain/campaigns.ts";
import { createActors } from "../src/domain/actors.ts";
import { createGameplay } from "../src/domain/gameplay.ts";
import { createKampfbuehne } from "../src/domain/kampfbuehne.ts";
import { createCommunication } from "../src/domain/communication.ts";

export const KAMPF_ZEIT = Date.UTC(2026, 8, 23, 12);
export const kampfCfg = { now: () => KAMPF_ZEIT, seed: () => "00000001000000020000000300000004" };
export const PAKET = { id: HOW_TO_BE_A_HERO_PACKAGE.id, version: HOW_TO_BE_A_HERO_PACKAGE.version };
/** Ein echtes 1×1-PNG — der Server bestimmt den Typ aus den Bytes. */
export const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * Eine Runde, wie sie am Tisch sitzt: Spielleitung, zwei Spielende mit eigener Figur, How to be a
 * Hero aktiv (ein Balken `hp` „Lebenspunkte", Höchstwert 100, leer = Niederlage) und eine
 * Wolf-Vorlage mit 40 Lebenspunkten. Mira hat 70.
 */
export async function kampfFixture(db: Db) {
  const gm = randomUUID();
  await db.query("INSERT INTO users(id,display_name,platform_role,created_at) VALUES($1,'Spielleitung','leitung',$2)", [gm, KAMPF_ZEIT]);
  const campaigns = createCampaigns(db, kampfCfg), campaign = (await campaigns.createCampaign(gm, { name: "Kampftisch" })).id;
  const einladung = await campaigns.issueInvitation(gm, campaign);
  const beitreten = async (displayName: string) => {
    const mitglied = await campaigns.approveJoin(gm, campaign, (await campaigns.requestJoin(einladung.code, { displayName })).id);
    return { userId: mitglied.userId, actorId: mitglied.actorId! };
  };
  const mira = await beitreten("Mira"), thorn = await beitreten("Thorn");
  const game = createGameplay(db, kampfCfg), actors = createActors(db, kampfCfg);
  await game.installPackage(gm, campaign, HOW_TO_BE_A_HERO_PACKAGE);
  const review = await game.previewPackage(gm, campaign, HOW_TO_BE_A_HERO_PACKAGE);
  await game.activatePackage(gm, campaign, { packageId: PAKET.id, packageVersion: PAKET.version, expectedVersion: 0, previewHash: review.previewHash });
  await game.updateSheet(mira.userId, campaign, { actorId: mira.actorId, expectedVersion: 0, fields: { ...HTBAH_EXAMPLE_CHARACTERS[0]!.fields, hp: 70 } });
  const wolf = await actors.createActorTemplate(gm, campaign, { commandId: randomUUID(), definition: {
    schemaVersion: 1, name: "Wolf", kind: "creature", loreEntryId: null, package: PAKET, fields: { hp: 40 } } });
  /** Eine Gegnerfigur aus der Wolf-Vorlage — sie gehört der Spielleitung, keine Spielerin sieht sie in ihrer Liste. */
  const gegner = async (name: string) => (await actors.instantiateActor(gm, campaign, { commandId: randomUUID(), templateId: wolf.id, templateRevision: wolf.revision, name })).id;
  return { gm, campaign, mira, thorn, game, actors, wolf, gegner, buehne: createKampfbuehne(db, kampfCfg), live: createCommunication(db, kampfCfg) };
}
```

Falls `approveJoin` `actorId` schon als `string` liefert, bleibt das `!` harmlos. Falls `createCommunication` keinen zweiten Parameter nimmt (Signatur in `domain/communication.ts` prüfen), `kampfCfg` dort weglassen.

`packages/server/test/kampfkarten.test.ts` (erste Fassung; Aufgaben 4 bis 7 hängen weitere `describe`-Blöcke an):

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { KampfFuerLeitung } from "@chronicle/protocol";
import { createTestDb, migrate, type Db } from "../src/db/index.ts";
import { Conflict, Gone } from "../src/domain/errors.ts";
import { kampfFixture } from "./kampf-fixture.ts";

// Was am Tisch vorkommt: verdecken, ausspielen, umlegen, vom Feld nehmen — und wer dabei dran ist.
describe("Der Kampftisch", () => {
  let db: Db;
  beforeAll(async () => { db = await createTestDb(); await migrate(db); }, 30_000);
  afterAll(async () => { await db?.close(); });

  type Stand = { readonly teilnehmer: readonly { readonly name: string; readonly amZug: boolean; readonly lage: string }[] };
  const amZug = (k: Stand) => k.teilnehmer.find(t => t.amZug)?.name ?? null;
  const namen = (k: { readonly teilnehmer: readonly { readonly name: string }[] }) => k.teilnehmer.map(t => t.name);
  /** Wer am Zug ist, liegt auf dem Feld — nach jedem Schritt. */
  const invariante = (k: Stand) => expect(k.teilnehmer.filter(t => t.amZug && t.lage !== "feld")).toEqual([]);
  const karte = (k: KampfFuerLeitung, name: string) => k.teilnehmer.find(t => t.name === name)!;

  async function tisch(karten: readonly { name: string; initiative: number; lage?: "hand" | "feld" }[]) {
    const f = await kampfFixture(db);
    const kampf = await f.buehne.anlegen(f.gm, f.campaign, { name: "Tisch" });
    for (const k of karten) await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaign, kampf.id,
      { name: k.name, seite: "gegner", initiative: k.initiative, ...(k.lage ? { lage: k.lage } : {}) });
    return { f, kampfId: kampf.id };
  }

  describe("Lage und Zug", () => {
    it("lässt verdeckte Karten aus der Zugfolge und zählt die Runde nur über das Feld", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }, { name: "B", initiative: 15, lage: "hand" }, { name: "C", initiative: 10 }]);
      let stand = await f.buehne.eroeffnen(f.gm, f.campaign, kampfId); invariante(stand);
      expect(amZug(stand)).toBe("A");
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "A").id, 1);
      expect([amZug(stand), stand.runde]).toEqual(["C", 1]);
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "C").id, 1);
      expect([amZug(stand), stand.runde]).toEqual(["A", 2]); invariante(stand);
    });

    it("reiht eine ausgespielte Karte nach Initiative ein; vor dem aktuellen Zug handelt sie ab der nächsten Runde", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }, { name: "B", initiative: 15, lage: "hand" }, { name: "C", initiative: 10 }]);
      let stand = await f.buehne.eroeffnen(f.gm, f.campaign, kampfId);
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "A").id, 1);
      const b = karte(stand, "B");
      stand = await f.buehne.lageSetzen(f.gm, f.campaign, kampfId, b.id, { lage: "feld", expectedVersion: b.version });
      expect(amZug(stand)).toBe("C"); invariante(stand);
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "C").id, 1);
      expect([amZug(stand), stand.runde]).toEqual(["A", 2]);
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "A").id, 2);
      expect(amZug(stand)).toBe("B");
    });

    it("gibt den Zug weiter, wenn die Karte am Zug umgelegt wird, und zählt beim Rücksprung die Runde", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }, { name: "B", initiative: 10 }]);
      let stand = await f.buehne.eroeffnen(f.gm, f.campaign, kampfId);
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "A").id, 1);
      const b = karte(stand, "B");
      stand = await f.buehne.lageSetzen(f.gm, f.campaign, kampfId, b.id, { lage: "umgelegt", expectedVersion: b.version });
      expect([amZug(stand), stand.runde, karte(stand, "B").lage]).toEqual(["A", 2, "umgelegt"]); invariante(stand);
    });

    it("lässt niemanden am Zug, wenn das Feld leer wird — die nächste Feldkarte beginnt", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }, { name: "B", initiative: 10, lage: "hand" }]);
      let stand = await f.buehne.eroeffnen(f.gm, f.campaign, kampfId);
      const a = karte(stand, "A");
      stand = await f.buehne.lageSetzen(f.gm, f.campaign, kampfId, a.id, { lage: "ablage", expectedVersion: a.version });
      expect(amZug(stand)).toBeNull(); invariante(stand);
      const b = karte(stand, "B");
      stand = await f.buehne.lageSetzen(f.gm, f.campaign, kampfId, b.id, { lage: "feld", expectedVersion: b.version });
      expect(amZug(stand)).toBe("B");
    });

    it("eröffnet nicht ohne Karte auf dem Feld", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20, lage: "hand" }]);
      await expect(f.buehne.eroeffnen(f.gm, f.campaign, kampfId)).rejects.toBeInstanceOf(Conflict);
    });

    it("weist einen veralteten Stand ab, statt still zu überschreiben", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }]);
      const vorher = karte(await f.buehne.buehne(f.gm, f.campaign, kampfId) as KampfFuerLeitung, "A");
      expect(vorher.version).toBe(0);
      const nach = await f.buehne.lageSetzen(f.gm, f.campaign, kampfId, vorher.id, { lage: "hand", expectedVersion: 0 });
      expect(karte(nach, "A")).toMatchObject({ lage: "hand", version: 1 });
      // Ein zweites Fenster mit dem alten Stand:
      await expect(f.buehne.lageSetzen(f.gm, f.campaign, kampfId, vorher.id, { lage: "umgelegt", expectedVersion: 0 })).rejects.toBeInstanceOf(Conflict);
      expect(karte(await f.buehne.buehne(f.gm, f.campaign, kampfId) as KampfFuerLeitung, "A").lage).toBe("hand");
    });

    it("ändert nach dem Ende nichts mehr", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }]);
      await f.buehne.eroeffnen(f.gm, f.campaign, kampfId);
      const aus = await f.buehne.beenden(f.gm, f.campaign, kampfId), a = karte(aus, "A");
      await expect(f.buehne.lageSetzen(f.gm, f.campaign, kampfId, a.id, { lage: "hand", expectedVersion: a.version })).rejects.toBeInstanceOf(Conflict);
      await expect(f.buehne.initiativeSetzen(f.gm, f.campaign, kampfId, a.id, { initiative: 3, initiativeRollId: null })).rejects.toBeInstanceOf(Conflict);
    });

    it("lässt die Karte am Zug dran, wenn ihre Initiative mitten in der Runde sinkt; danach gilt die neue Reihenfolge", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 30 }, { name: "B", initiative: 20 }, { name: "C", initiative: 10 }]);
      let stand = await f.buehne.eroeffnen(f.gm, f.campaign, kampfId);
      stand = await f.buehne.initiativeSetzen(f.gm, f.campaign, kampfId, karte(stand, "A").id, { initiative: 5, initiativeRollId: null });
      expect(namen(stand)).toEqual(["B", "C", "A"]);
      expect(amZug(stand)).toBe("A");
      // A steht jetzt hinten: der nächste Zug springt an den Anfang. C kommt in dieser Runde nicht
      // mehr dran — so hat die Spielleitung die Reihenfolge gesetzt, und so steht es in der Spezifikation (E6).
      stand = await f.buehne.naechsterZug(f.gm, f.campaign, kampfId, karte(stand, "A").id, 1);
      expect([amZug(stand), stand.runde]).toEqual(["B", 2]);
    });

    it("nimmt eine Karte samt ihrer Lage vom Tisch", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20, lage: "hand" }]);
      const a = karte(await f.buehne.buehne(f.gm, f.campaign, kampfId) as KampfFuerLeitung, "A");
      expect(a.version).toBe(1);
      expect((await f.buehne.teilnehmerEntfernen(f.gm, f.campaign, kampfId, a.id)).teilnehmer).toEqual([]);
    });

    it("lässt Spielende weder Lage noch Initiative ändern", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }]);
      const a = karte(await f.buehne.buehne(f.gm, f.campaign, kampfId) as KampfFuerLeitung, "A");
      await expect(f.buehne.lageSetzen(f.thorn.userId, f.campaign, kampfId, a.id, { lage: "hand", expectedVersion: 0 })).rejects.toBeInstanceOf(Gone);
      await expect(f.buehne.initiativeSetzen(f.thorn.userId, f.campaign, kampfId, a.id, { initiative: 1, initiativeRollId: null })).rejects.toBeInstanceOf(Gone);
    });

    it("schreibt für eine Karte in Voreinstellung keine Zeile", async () => {
      const { f, kampfId } = await tisch([{ name: "A", initiative: 20 }]);
      expect(karte(await f.buehne.buehne(f.gm, f.campaign, kampfId) as KampfFuerLeitung, "A").version).toBe(0);
      expect((await db.query("SELECT 1 FROM kampf_karten WHERE campaign_id=$1", [f.campaign])).rowCount).toBe(0);
    });
  });
});
```

Aufgabe 4 ergänzt den Import `import { randomUUID } from "node:crypto";` oben in dieser Datei, sobald er gebraucht wird.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run packages/server/test/kampf-zug.test.ts packages/server/test/kampfkarten.test.ts`
Expected: FAIL. `kampf-zug.ts` fehlt, `lageSetzen` und `initiativeSetzen` gibt es noch nicht.

- [ ] **Step 4: Implement**

`packages/server/src/domain/kampf-zug.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { KartenLage } from "@chronicle/protocol";

/**
 * Die Zugregeln des Kampftischs, rein. Die Karten stehen bereits in Initiativreihenfolge; am Zug
 * ist nur, wer auf dem Feld liegt, und nur Feld-Karten zählen die Runde (Spezifikation E2).
 */
export interface ZugKarte { readonly id: string; readonly lage: KartenLage }

/** Wer nach `vonId` dran ist, und ob dabei eine neue Runde beginnt. */
export function naechsteFeldkarte(karten: readonly ZugKarte[], vonId: string): { readonly id: string; readonly neueRunde: boolean } | null {
  const feld = karten.filter(k => k.lage === "feld"), stelle = feld.findIndex(k => k.id === vonId);
  if (stelle < 0) return null;
  const naechste = (stelle + 1) % feld.length;
  return { id: feld[naechste]!.id, neueRunde: naechste === 0 };
}

/**
 * Die Karte `wegId` war am Zug und verlässt das Feld. Der Zug geht an die Karte, die jetzt an
 * ihrer Stelle steht; war sie die letzte, springt er an den Anfang, und das ist die neue Runde.
 */
export function zugNachVerlassen(karten: readonly ZugKarte[], wegId: string): { readonly amZug: string | null; readonly neueRunde: boolean } {
  const feld = karten.filter(k => k.lage === "feld"), stelle = feld.findIndex(k => k.id === wegId), rest = feld.filter(k => k.id !== wegId);
  if (stelle < 0 || !rest.length) return { amZug: null, neueRunde: false };
  return { amZug: rest[stelle % rest.length]!.id, neueRunde: stelle === rest.length };
}
```

`packages/server/src/domain/kampf-lesen.ts` (erste Fassung):

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { gueltigeKartenSicht, type KampfFuerLeitung, type KampfKopf, type KampfSeite, type KartenLage, type KartenSichtDaten, type Kampfzustand } from "@chronicle/protocol";
import { karteFuerLeitung, vorgabeSicht, type KartenQuelle } from "@chronicle/projection";
import type { Db } from "../db/index.ts";
import type { DomainConfig } from "./campaigns.ts";
import { Gone } from "./errors.ts";

/**
 * Den Kampftisch lesen: Zeilen aus `kaempfe`, `kampf_teilnehmer` und `kampf_karten` zu einem
 * Stand, der für Befehle reicht (`KampfRoh`), und daraus die Nutzlast der Spielleitung.
 */
export interface KarteRoh {
  readonly id: string; readonly name: string; readonly seite: KampfSeite; readonly actorId: string | null;
  readonly initiative: number; readonly ordnung: number; readonly initiativeRollId: string | null; readonly amZug: boolean;
  readonly lage: KartenLage; readonly nameFuerRunde: string | null; readonly sicht: KartenSichtDaten;
  readonly vomKampfAngelegt: boolean;
  /** 0 = die Karte hat noch keine Zeile in `kampf_karten`, sie trägt die Voreinstellung. */
  readonly version: number;
}
export interface KampfRoh extends KampfKopf { readonly karten: readonly KarteRoh[] }

interface KampfRow { id: string; name: string; zustand: Kampfzustand; runde: number; erstellt_am: string | number; beendet_am: string | number | null }
interface KarteRow {
  id: string; name: string; seite: KampfSeite; actor_id: string | null; initiative: number; ordnung: number; initiative_roll_id: string | null; am_zug: boolean;
  lage: KartenLage | null; name_fuer_runde: string | null; sicht: unknown; vom_kampf_angelegt: boolean | null; version: number | null;
}

/** Eine unlesbare Sichteinstellung zeigt nichts — der sichere Rückfall, nie der offene. */
const SICHT_BEI_FEHLER: KartenSichtDaten = { schema: 1, standard: "verborgen", balken: {}, zustaende: false, bild: false };

/** Höhere Initiative zuerst, Gleichstand nach der stabilen Ordnungszahl. */
const nachInitiative = (a: KarteRoh, b: KarteRoh): number => b.initiative - a.initiative || a.ordnung - b.ordnung;

function karteAusZeile(row: KarteRow): KarteRoh {
  const sicht = row.sicht === null || row.sicht === undefined ? vorgabeSicht(row.seite) : gueltigeKartenSicht(row.sicht) ? row.sicht : SICHT_BEI_FEHLER;
  return {
    id: row.id, name: row.name, seite: row.seite, actorId: row.actor_id, initiative: Number(row.initiative), ordnung: Number(row.ordnung),
    initiativeRollId: row.initiative_roll_id, amZug: row.am_zug, lage: row.lage ?? "feld", nameFuerRunde: row.name_fuer_runde,
    sicht, vomKampfAngelegt: row.vom_kampf_angelegt ?? false, version: row.version === null ? 0 : Number(row.version),
  };
}

export async function lies(tx: Db, campaignId: string, kampfId: string, sperren = false): Promise<KampfRoh> {
  const kopf = (await tx.query<KampfRow>(
    `SELECT id,name,zustand,runde,erstellt_am,beendet_am FROM kaempfe WHERE id=$1 AND campaign_id=$2${sperren ? " FOR UPDATE" : ""}`,
    [kampfId, campaignId])).rows[0];
  if (!kopf) throw new Gone();
  const reihen = (await tx.query<KarteRow>(
    `SELECT t.id,t.name,t.seite,t.actor_id,t.initiative,t.ordnung,t.initiative_roll_id,t.am_zug,
       k.lage,k.name_fuer_runde,k.sicht,k.vom_kampf_angelegt,k.version
     FROM kampf_teilnehmer t LEFT JOIN kampf_karten k ON k.teilnehmer_id=t.id AND k.campaign_id=t.campaign_id
     WHERE t.campaign_id=$1 AND t.kampf_id=$2`, [campaignId, kampfId])).rows;
  return {
    id: kopf.id, name: kopf.name, zustand: kopf.zustand, runde: Number(kopf.runde),
    erstelltAm: Number(kopf.erstellt_am), beendetAm: kopf.beendet_am === null ? null : Number(kopf.beendet_am),
    karten: reihen.map(karteAusZeile).sort(nachInitiative),
  };
}

export const kampfKopf = (roh: KampfRoh): KampfKopf =>
  ({ id: roh.id, name: roh.name, zustand: roh.zustand, runde: roh.runde, erstelltAm: roh.erstelltAm, beendetAm: roh.beendetAm });

/** Eine Karte ohne Werte. Aufgabe 4 ersetzt das durch das Lesen der Bögen. */
const ohneWerte = (k: KarteRoh): KartenQuelle => ({ ...k, bogenVersion: null, vitals: [], zustaende: [], bild: null, aufgebraucht: false });

export async function kampfFuerLeitung(_tx: Db, _cfg: DomainConfig, _campaignId: string, roh: KampfRoh): Promise<KampfFuerLeitung> {
  return { leitung: true, ...kampfKopf(roh), teilnehmer: roh.karten.map(k => karteFuerLeitung(ohneWerte(k))) };
}
```

`packages/server/src/domain/kampfbuehne.ts`, ganze Datei:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { stableJson } from "@chronicle/rules";
import type { KampfFuerLeitung, KampfFuerRunde, KampfSeite, KartenLage, KartenSichtDaten } from "@chronicle/protocol";
import { vorgabeSicht } from "@chronicle/projection";
import type { Db } from "../db/index.ts";
import { createCampaigns, type DomainConfig } from "./campaigns.ts";
import { Conflict, Gone } from "./errors.ts";
import { kampfFuerLeitung, lies, type KampfRoh, type KarteRoh } from "./kampf-lesen.ts";
import { naechsteFeldkarte, zugNachVerlassen } from "./kampf-zug.ts";

/**
 * Der Kampftisch — wer liegt wo, wer ist dran, in welcher Runde, und was sieht die Runde davon.
 *
 * Die Spielleitung führt, alle am Tisch sehen zu — aber nur, was die Spielleitung sie sehen
 * lässt. Karten in der Hand oder in der Ablage erreichen niemanden sonst (Spezifikation E2/E4).
 *
 * **Figur und Runde sichern den Zug gemeinsam.** Dieselbe Figur ist in der nächsten Runde
 * wieder dran; ihre Kennung allein erkennt dann keinen verspäteten zweiten Klick mehr.
 * Schreibvorgänge sperren den Kampf, bevor sie Lage oder Zug lesen — so gilt „wer am Zug ist,
 * liegt auf dem Feld", obwohl keine Datenbankregel es über zwei Tabellen halten kann.
 */

export type Seite = KampfSeite;
export type { Kampfzustand } from "@chronicle/protocol";

interface NeueKarte { id: string; seite: KampfSeite; lage: KartenLage; nameFuerRunde: string | null; sicht: KartenSichtDaten; vomKampfAngelegt: boolean }
/** Eine Karte, die in allem der Voreinstellung entspricht, braucht keine Zeile (Spezifikation, Datenmodell). */
const istVoreinstellung = (k: NeueKarte): boolean =>
  k.lage === "feld" && k.nameFuerRunde === null && !k.vomKampfAngelegt && stableJson(k.sicht) === stableJson(vorgabeSicht(k.seite));
const naechsteOrdnung = (roh: KampfRoh): number => roh.karten.reduce((hoechste, k) => Math.max(hoechste, k.ordnung), -1) + 1;

export function createKampfbuehne(db: Db, config: DomainConfig = {}) {
  const campaigns = createCampaigns(db, config), now = config.now ?? Date.now;

  async function leitung(userId: string, campaignId: string) {
    const member = await campaigns.requireMember(userId, campaignId);
    // 404 statt 403: wer nicht führen darf, soll nicht einmal erfahren, dass es die Bühne gibt.
    if (member.role !== "leitung") throw new Gone();
    return member;
  }

  async function neueKarte(tx: Db, campaignId: string, karte: NeueKarte): Promise<void> {
    if (istVoreinstellung(karte)) return;
    await tx.query(`INSERT INTO kampf_karten(teilnehmer_id,campaign_id,lage,name_fuer_runde,sicht,vom_kampf_angelegt,version,geaendert_am)
      VALUES($1,$2,$3,$4,$5,$6,1,$7)`, [karte.id, campaignId, karte.lage, karte.nameFuerRunde, JSON.stringify(karte.sicht), karte.vomKampfAngelegt, now()]);
  }

  async function karteAendern(tx: Db, campaignId: string, karte: KarteRoh,
    aenderung: { lage?: KartenLage; nameFuerRunde?: string | null; sicht?: KartenSichtDaten }): Promise<void> {
    await tx.query(`INSERT INTO kampf_karten(teilnehmer_id,campaign_id,lage,name_fuer_runde,sicht,vom_kampf_angelegt,version,geaendert_am)
      VALUES($1,$2,$3,$4,$5,$6,1,$7)
      ON CONFLICT(teilnehmer_id) DO UPDATE SET lage=EXCLUDED.lage,name_fuer_runde=EXCLUDED.name_fuer_runde,sicht=EXCLUDED.sicht,
        version=kampf_karten.version+1,geaendert_am=EXCLUDED.geaendert_am`,
    [karte.id, campaignId, aenderung.lage ?? karte.lage, aenderung.nameFuerRunde === undefined ? karte.nameFuerRunde : aenderung.nameFuerRunde,
      JSON.stringify(aenderung.sicht ?? karte.sicht), karte.vomKampfAngelegt, now()]);
  }

  /** Die Karte `wegId` war am Zug und verlässt das Feld: der Zug geht weiter, wie am Tisch. */
  async function zugAbgeben(tx: Db, campaignId: string, roh: KampfRoh, wegId: string): Promise<void> {
    const { amZug, neueRunde } = zugNachVerlassen(roh.karten, wegId);
    await tx.query("UPDATE kampf_teilnehmer SET am_zug=false WHERE id=$1 AND campaign_id=$2", [wegId, campaignId]);
    if (amZug) await tx.query("UPDATE kampf_teilnehmer SET am_zug=true WHERE id=$1 AND campaign_id=$2", [amZug, campaignId]);
    if (neueRunde) await tx.query("UPDATE kaempfe SET runde=runde+1 WHERE id=$1 AND campaign_id=$2", [roh.id, campaignId]);
  }

  /** Ein laufender Kampf ohne jemanden am Zug gibt den Zug der nächsten Karte, die aufs Feld kommt. */
  const zugFrei = (roh: KampfRoh): boolean => roh.zustand === "laufend" && !roh.karten.some(k => k.amZug);

  const stand = async (tx: Db, campaignId: string, kampfId: string): Promise<KampfFuerLeitung> =>
    kampfFuerLeitung(tx, config, campaignId, await lies(tx, campaignId, kampfId));

  /**
   * Alle am Tisch sehen die Kämpfe ihrer Kampagne. AUFGABE 4 ersetzt diese beiden Lesewege durch
   * die Projektion je Betrachter — bis dahin bekommt jede Rolle die Nutzlast der Spielleitung.
   */
  async function buehnen(userId: string, campaignId: string): Promise<readonly (KampfFuerLeitung | KampfFuerRunde)[]> {
    await campaigns.requireMember(userId, campaignId);
    const koepfe = (await db.query<{ id: string }>("SELECT id FROM kaempfe WHERE campaign_id=$1 ORDER BY erstellt_am DESC,id", [campaignId])).rows;
    const alle: KampfFuerLeitung[] = [];
    for (const kopf of koepfe) alle.push(await stand(db, campaignId, kopf.id));
    return alle;
  }
  async function buehne(userId: string, campaignId: string, kampfId: string): Promise<KampfFuerLeitung | KampfFuerRunde> {
    await campaigns.requireMember(userId, campaignId);
    return stand(db, campaignId, kampfId);
  }

  async function anlegen(userId: string, campaignId: string, input: { name: string }): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    const id = randomUUID();
    await db.query("INSERT INTO kaempfe(id,campaign_id,name,zustand,runde,erstellt_am) VALUES($1,$2,$3,'vorbereitet',0,$4)", [id, campaignId, input.name, now()]);
    return stand(db, campaignId, id);
  }

  /**
   * Eine Karte auf den Tisch legen — aufs Feld oder verdeckt in die Hand. Die Ordnungszahl vergibt
   * der Server fortlaufend; sie entscheidet nur Gleichstände der Initiative.
   */
  async function teilnehmerHinzufuegen(userId: string, campaignId: string, kampfId: string, input: {
    name: string; seite: KampfSeite; initiative: number; actorId?: string | null; initiativeRollId?: string | null;
    lage?: "hand" | "feld"; nameFuerRunde?: string | null; sicht?: KartenSichtDaten;
  }): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      // Ein beendeter Kampf nimmt niemanden mehr auf.
      if (vorher.zustand === "beendet") throw new Conflict();
      const id = randomUUID(), lage = input.lage ?? "feld";
      await tx.query(`INSERT INTO kampf_teilnehmer(id,kampf_id,campaign_id,seite,name,actor_id,initiative,ordnung,initiative_roll_id,am_zug)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, kampfId, campaignId, input.seite, input.name, input.actorId ?? null, input.initiative, naechsteOrdnung(vorher),
        input.initiativeRollId ?? null, lage === "feld" && zugFrei(vorher)]);
      await neueKarte(tx, campaignId, { id, seite: input.seite, lage, nameFuerRunde: input.nameFuerRunde ?? null,
        sicht: input.sicht ?? vorgabeSicht(input.seite), vomKampfAngelegt: false });
      return stand(tx, campaignId, kampfId);
    });
  }

  /** Eine Karte ganz löschen — für Versehen. Wer nur vom Feld soll, kommt in die Ablage. */
  async function teilnehmerEntfernen(userId: string, campaignId: string, kampfId: string, teilnehmerId: string): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      const weg = vorher.karten.find(k => k.id === teilnehmerId);
      if (!weg) throw new Gone();
      if (weg.amZug) await zugAbgeben(tx, campaignId, vorher, weg.id);
      await tx.query("DELETE FROM kampf_karten WHERE teilnehmer_id=$1 AND campaign_id=$2", [teilnehmerId, campaignId]);
      await tx.query("DELETE FROM kampf_teilnehmer WHERE id=$1 AND campaign_id=$2", [teilnehmerId, campaignId]);
      return stand(tx, campaignId, kampfId);
    });
  }

  /**
   * Die Spielleitung legt eine Karte woanders hin. Verlässt die Karte am Zug das Feld, geht der Zug
   * weiter; kommt eine Karte auf ein Feld, auf dem niemand am Zug ist, ist sie sofort dran.
   */
  async function lageSetzen(userId: string, campaignId: string, kampfId: string, teilnehmerId: string,
    input: { lage: KartenLage; expectedVersion: number }): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      if (vorher.zustand === "beendet") throw new Conflict();
      const karte = vorher.karten.find(k => k.id === teilnehmerId);
      if (!karte) throw new Gone();
      if (karte.version !== input.expectedVersion) throw new Conflict();
      if (karte.lage === input.lage) return stand(tx, campaignId, kampfId);
      if (karte.amZug) await zugAbgeben(tx, campaignId, vorher, karte.id);
      await karteAendern(tx, campaignId, karte, { lage: input.lage });
      if (input.lage === "feld" && zugFrei(vorher))
        await tx.query("UPDATE kampf_teilnehmer SET am_zug=true WHERE id=$1 AND campaign_id=$2", [karte.id, campaignId]);
      return stand(tx, campaignId, kampfId);
    });
  }

  /**
   * Die Initiative neu setzen. Die Karte am Zug bleibt am Zug; ab dem nächsten Zug gilt die neue
   * Reihenfolge. Wer von Hand setzt, verliert den Beleg — eine Karte, die einen Wurf behauptet, den
   * sie nicht zeigt, wäre schlimmer als eine ohne.
   */
  async function initiativeSetzen(userId: string, campaignId: string, kampfId: string, teilnehmerId: string,
    input: { initiative: number; initiativeRollId: string | null }): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      if (vorher.zustand === "beendet") throw new Conflict();
      if (!vorher.karten.some(k => k.id === teilnehmerId)) throw new Gone();
      await tx.query("UPDATE kampf_teilnehmer SET initiative=$3,initiative_roll_id=$4 WHERE id=$1 AND campaign_id=$2",
        [teilnehmerId, campaignId, input.initiative, input.initiativeRollId]);
      return stand(tx, campaignId, kampfId);
    });
  }

  /** Den Kampf eröffnen: Runde 1, und die höchste Initiative auf dem Feld ist dran. */
  async function eroeffnen(userId: string, campaignId: string, kampfId: string): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      // Zweimal eröffnen würde die Runde zurücksetzen und den laufenden Zug verwerfen.
      if (vorher.zustand !== "vorbereitet") throw new Conflict();
      const erste = vorher.karten.find(k => k.lage === "feld");
      // Ein leeres Feld hat niemanden, der anfangen könnte — verdeckte Karten fangen nicht an.
      if (!erste) throw new Conflict();
      await tx.query("UPDATE kaempfe SET zustand='laufend',runde=1 WHERE id=$1 AND campaign_id=$2", [kampfId, campaignId]);
      await tx.query("UPDATE kampf_teilnehmer SET am_zug=true WHERE id=$1 AND campaign_id=$2", [erste.id, campaignId]);
      return stand(tx, campaignId, kampfId);
    });
  }

  /** Den Zug weiterschieben. `von` und `runde` nennen den erwarteten Zug. */
  async function naechsterZug(userId: string, campaignId: string, kampfId: string, von: string, runde: number): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      if (vorher.zustand !== "laufend" || vorher.runde !== runde) throw new Conflict();
      const aktuell = vorher.karten.find(k => k.amZug);
      // Der Zug ist inzwischen weitergegangen — ein zweiter Klick würde jemanden überspringen.
      if (!aktuell || aktuell.id !== von) throw new Conflict();
      const weiter = naechsteFeldkarte(vorher.karten, aktuell.id);
      if (!weiter) throw new Conflict();
      await tx.query("UPDATE kampf_teilnehmer SET am_zug=false WHERE id=$1 AND campaign_id=$2", [aktuell.id, campaignId]);
      await tx.query("UPDATE kampf_teilnehmer SET am_zug=true WHERE id=$1 AND campaign_id=$2", [weiter.id, campaignId]);
      // Der Sprung an den Anfang der Feld-Karten IST die neue Runde.
      if (weiter.neueRunde) await tx.query("UPDATE kaempfe SET runde=runde+1 WHERE id=$1 AND campaign_id=$2", [kampfId, campaignId]);
      return stand(tx, campaignId, kampfId);
    });
  }

  /** Den Kampf schließen. Niemand bleibt am Zug — ein beendeter Kampf hat keinen. */
  async function beenden(userId: string, campaignId: string, kampfId: string): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      if (vorher.zustand === "beendet") throw new Conflict();
      await tx.query("UPDATE kampf_teilnehmer SET am_zug=false WHERE campaign_id=$1 AND kampf_id=$2 AND am_zug", [campaignId, kampfId]);
      // Ein nie eröffneter Kampf hat Runde 0; der CHECK verlangt, dass nur `vorbereitet` dort steht.
      await tx.query("UPDATE kaempfe SET zustand='beendet',beendet_am=$3,runde=greatest(runde,1) WHERE id=$1 AND campaign_id=$2", [kampfId, campaignId, now()]);
      return stand(tx, campaignId, kampfId);
    });
  }

  return { buehnen, buehne, anlegen, teilnehmerHinzufuegen, teilnehmerEntfernen, lageSetzen, initiativeSetzen, eroeffnen, naechsterZug, beenden };
}
```

In `packages/server/src/http/kampfbuehne.ts` bleibt `{ ...req.body, seite: req.body.seite as Seite }` gültig; die Wege selbst ändern sich erst in Aufgabe 6.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run packages/server/test/kampf-zug.test.ts packages/server/test/kampfkarten.test.ts packages/server/test/kampfbuehne.test.ts packages/server/test/kampfkarten-export.test.ts packages/server/test/alles-in-einer-datei.test.ts`
Expected: PASS. Die 14 bisherigen Fälle der Kampfbühne bleiben grün.

Run: `npm run typecheck`
Expected: 0 Fehler.

- [ ] **Step 6: Gegenprobe**

In `lageSetzen` die Zeile `if (karte.amZug) await zugAbgeben(…)` vorübergehend auskommentieren. „gibt den Zug weiter, wenn die Karte am Zug umgelegt wird“ und „lässt niemanden am Zug …“ müssen rot werden, weil der eindeutige Index oder die Invariante bricht. Danach die Zeile wieder einkommentieren.

- [ ] **Step 7: Commit**

```bash
git add -- packages/server/src/domain/kampf-zug.ts packages/server/src/domain/kampf-lesen.ts packages/server/src/domain/kampfbuehne.ts packages/server/test/kampf-fixture.ts packages/server/test/kampf-zug.test.ts packages/server/test/kampfkarten.test.ts
git commit -m "feat(kampf): Karten liegen in Hand, Feld, umgelegt oder Ablage; nur das Feld handelt

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Werte, Einstellungen und was die Runde sieht

**Files:**

- Modify: `packages/rules/src/package-v2.ts` (nach `abilityOverview`, Z. ~412), `packages/rules/src/index.ts` (Z. 10, Exportliste)
- Modify: `packages/server/src/domain/gameplay.ts` (neue Methode in `createGameplay`, Rückgabeobjekt Z. ~599)
- Modify: `packages/server/src/domain/kampf-lesen.ts` (Werte lesen, `kampfFuerRunde`)
- Modify: `packages/server/src/domain/kampfbuehne.ts` (`buehnen`, `buehne` ersetzen; `alsRunde`, `sichtSetzen`, `bild` neu)
- Test: `packages/rules/test/active-conditions.test.ts`, `packages/server/test/kampfkarten.test.ts` (Abschnitt „Was die Runde sieht“)
- Konsumenten: `packages/server/test/kampfbuehne.test.ts`, `packages/rules/test/package-v2.test.ts`

**Interfaces:**

- Consumes: `karteFuerLeitung`, `karteFuerRunde`, `zeigtBild`, `VitalStand`, `KartenQuelle` (Task 1); `lies`, `KampfRoh`, `KarteRoh`, `kampfKopf` (Task 3).
- Produces:
  - `activeConditions(pkg, fields): readonly { id: string; name: string }[]` aus `@chronicle/rules`
  - `createGameplay(db, cfg).boegenFuerProjektion(campaignId, actorIds): Promise<ReadonlyMap<string, { sheet: ActorSheet; pkg: RulePackage }>>`. Dieser Weg prüft keine Rechte und gibt seine Daten nie direkt nach außen.
  - `kampfFuerLeitung(tx, cfg, campaignId, roh)` liefert jetzt Werte; `kampfFuerRunde(tx, cfg, campaignId, roh, fuehrt): Promise<KampfFuerRunde>`
  - `createKampfbuehne`:
    - `buehnen` und `buehne` projizieren je Betrachter
    - `alsRunde(userId, campaignId, kampfId): Promise<KampfFuerRunde>` (nur Leitung)
    - `sichtSetzen(userId, campaignId, kampfId, teilnehmerId, { sicht, nameFuerRunde, expectedVersion })`
    - `bild(userId, campaignId, kampfId, teilnehmerId): Promise<{ mime: string; sha256: string; data: Buffer }>`

- [ ] **Step 1: Write the failing rules test**

`packages/rules/test/active-conditions.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { CHRONICLE_HEROES_PACKAGE, DEMO_RULE_PACKAGE, activeConditions } from "../src/index.ts";

describe("Die wirkenden Zustände eines Bogens", () => {
  const feld = CHRONICLE_HEROES_PACKAGE.abilityRules!.conditionField!;
  const [erster, zweiter] = CHRONICLE_HEROES_PACKAGE.conditions!;

  it("nennt sie mit Namen — ohne Doppelte und ohne Unbekannte", () => {
    const fields = { [feld]: `${erster!.id}, gibt-es-nicht ${zweiter!.id},${erster!.id}` };
    expect(activeConditions(CHRONICLE_HEROES_PACKAGE, fields)).toEqual([{ id: erster!.id, name: erster!.name }, { id: zweiter!.id, name: zweiter!.name }]);
  });

  it("ist leer ohne Eintrag und für Pakete ohne Zustände", () => {
    expect(activeConditions(CHRONICLE_HEROES_PACKAGE, {})).toEqual([]);
    expect(activeConditions(DEMO_RULE_PACKAGE, { zustaende: "irgendwas" })).toEqual([]);
  });
});
```

- [ ] **Step 2: Write the failing domain tests**

Oben in `packages/server/test/kampfkarten.test.ts` die Importe ergänzen:

```ts
import { randomUUID } from "node:crypto";
import type { KampfFuerRunde } from "@chronicle/protocol";
import { createActorPortraits } from "../src/domain/actor-portrait.ts";
import { PNG_BASE64, kampfCfg } from "./kampf-fixture.ts";
```

`KampfFuerRunde` in den bestehenden `import type { KampfFuerLeitung }` aufnehmen. `kampfFixture` wird schon aus `./kampf-fixture.ts` importiert; beide Namen in diesen Import einfügen.

Dann innerhalb von `describe("Der Kampftisch", …)` hinter dem Block „Lage und Zug“ anfügen:

```ts
  describe("Was die Runde sieht", () => {
    /** Mira (15) und Thorn (11) als Gefährten, ein Wolf (12) auf dem Feld, ein Späher (9) verdeckt in der Hand. */
    async function tischMitGegner() {
      const f = await kampfFixture(db);
      const kampf = await f.buehne.anlegen(f.gm, f.campaign, { name: "Sicht" });
      const wolf = await f.gegner("Wolf"), spaeher = await f.gegner("Späher");
      await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaign, kampf.id, { name: "Mira", seite: "gefaehrten", initiative: 15, actorId: f.mira.actorId });
      await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaign, kampf.id, { name: "Thorn", seite: "gefaehrten", initiative: 11, actorId: f.thorn.actorId });
      await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaign, kampf.id, { name: "Wolf", seite: "gegner", initiative: 12, actorId: wolf });
      await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaign, kampf.id, { name: "Späher", seite: "gegner", initiative: 9, actorId: spaeher, lage: "hand" });
      return { f, kampfId: kampf.id, wolf, spaeher };
    }
    const leitungsSicht = async (f: Awaited<ReturnType<typeof kampfFixture>>, kampfId: string) => await f.buehne.buehne(f.gm, f.campaign, kampfId) as KampfFuerLeitung;
    const rundenSicht = async (f: Awaited<ReturnType<typeof kampfFixture>>, userId: string, kampfId: string) => await f.buehne.buehne(userId, f.campaign, kampfId) as KampfFuerRunde;
    const von = <K extends { readonly name: string }>(kampf: { readonly teilnehmer: readonly K[] }, name: string): K => kampf.teilnehmer.find(k => k.name === name)!;

    it("lässt Handkarten, Ordnung und Einstellungen aus der Nutzlast der Spielenden", async () => {
      const { f, kampfId } = await tischMitGegner();
      const mira = await rundenSicht(f, f.mira.userId, kampfId);
      expect(Object.keys(mira).sort()).toEqual(["beendetAm", "erstelltAm", "id", "name", "runde", "teilnehmer", "zustand"]);
      expect(namen(mira)).toEqual(["Mira", "Wolf", "Thorn"]);
      expect(Object.keys(von(mira, "Wolf")).sort()).toEqual(["amZug", "balken", "bild", "eigene", "gewuerfelt", "id", "initiative", "lage", "name", "seite", "zustaende"]);
      expect(JSON.stringify(mira)).not.toContain("Späher");
    });

    it("zeigt Gegner in Worten, die eigene Figur genau und fremde Gefährten nach Einstellung", async () => {
      const { f, kampfId } = await tischMitGegner();
      const mira = await rundenSicht(f, f.mira.userId, kampfId);
      expect(von(mira, "Wolf").balken).toEqual([{ id: "hp", label: "Lebenspunkte", art: "leben", anzeige: "worte", stufe: "knapp" }]);
      expect(von(mira, "Mira")).toMatchObject({ eigene: true, actorId: f.mira.actorId, balken: [{ anzeige: "genau", wert: 70, hoechst: 100 }] });
      expect(von(mira, "Thorn").balken[0]).toMatchObject({ anzeige: "genau" });
      // Die Spielleitung verbirgt Thorns Werte vor der Runde; Thorns eigener Spieler sieht sie weiter.
      const thorn = von(await leitungsSicht(f, kampfId), "Thorn");
      await f.buehne.sichtSetzen(f.gm, f.campaign, kampfId, thorn.id, { sicht: { ...thorn.sicht, standard: "verborgen" }, nameFuerRunde: null, expectedVersion: thorn.version });
      expect(von(await rundenSicht(f, f.mira.userId, kampfId), "Thorn").balken).toEqual([]);
      expect(von(await rundenSicht(f, f.thorn.userId, kampfId), "Thorn").balken[0]).toMatchObject({ anzeige: "genau" });
      // Und die Spielleitung liest an jedem Balken mit, was die Runde bekommt.
      expect(von(await leitungsSicht(f, kampfId), "Wolf").balken[0]).toMatchObject({ wert: 40, maske: "worte", fuerRunde: { stufe: "knapp" } });
    });

    it("ersetzt den Namen, versteckt Bild und Zustände und zeigt der Spielleitung dasselbe als Vorschau", async () => {
      const { f, kampfId } = await tischMitGegner();
      const wolf = von(await leitungsSicht(f, kampfId), "Wolf");
      await f.buehne.sichtSetzen(f.gm, f.campaign, kampfId, wolf.id, {
        sicht: { ...wolf.sicht, balken: { hp: "fuellstand" }, bild: false, zustaende: false }, nameFuerRunde: "Schatten im Gebüsch", expectedVersion: wolf.version });
      const mira = await rundenSicht(f, f.mira.userId, kampfId);
      expect(von(mira, "Schatten im Gebüsch")).toMatchObject({ bild: null, zustaende: [], balken: [{ anzeige: "fuellstand", zehntel: 4 }] });
      expect(JSON.stringify(mira)).not.toContain("Wolf");
      const vorschau = await f.buehne.alsRunde(f.gm, f.campaign, kampfId);
      expect(namen(vorschau)).toEqual(["Mira", "Schatten im Gebüsch", "Thorn"]);
      expect(vorschau.teilnehmer.every(k => !k.eigene)).toBe(true);
      await expect(f.buehne.alsRunde(f.mira.userId, f.campaign, kampfId)).rejects.toBeInstanceOf(Gone);
    });

    it("zeigt dem Spieler seine eigene Figur mit echtem Namen, auch wenn die Spielleitung sie verkleidet", async () => {
      const { f, kampfId } = await tischMitGegner();
      const m = von(await leitungsSicht(f, kampfId), "Mira");
      await f.buehne.sichtSetzen(f.gm, f.campaign, kampfId, m.id, { sicht: { ...m.sicht, standard: "verborgen" }, nameFuerRunde: "Die Fremde", expectedVersion: m.version });
      expect(von(await rundenSicht(f, f.mira.userId, kampfId), "Mira")).toMatchObject({ eigene: true, balken: [{ anzeige: "genau", wert: 70 }] });
      const thorn = await rundenSicht(f, f.thorn.userId, kampfId);
      expect(namen(thorn)).toContain("Die Fremde");
      expect(von(thorn, "Die Fremde").balken).toEqual([]);
    });

    it("weist eine Sicht mit altem Stand ab und lässt Spielende keine Sicht setzen", async () => {
      const { f, kampfId } = await tischMitGegner();
      const wolf = von(await leitungsSicht(f, kampfId), "Wolf");
      await f.buehne.sichtSetzen(f.gm, f.campaign, kampfId, wolf.id, { sicht: wolf.sicht, nameFuerRunde: "A", expectedVersion: wolf.version });
      await expect(f.buehne.sichtSetzen(f.gm, f.campaign, kampfId, wolf.id, { sicht: wolf.sicht, nameFuerRunde: "B", expectedVersion: wolf.version })).rejects.toBeInstanceOf(Conflict);
      await expect(f.buehne.sichtSetzen(f.mira.userId, f.campaign, kampfId, wolf.id, { sicht: wolf.sicht, nameFuerRunde: null, expectedVersion: wolf.version + 1 })).rejects.toBeInstanceOf(Gone);
    });

    it("zeigt in beendeten Kämpfen keine Balken", async () => {
      const { f, kampfId } = await tischMitGegner();
      await f.buehne.eroeffnen(f.gm, f.campaign, kampfId); await f.buehne.beenden(f.gm, f.campaign, kampfId);
      const balkenZahl = (k: { readonly teilnehmer: readonly { readonly balken: readonly unknown[] }[] }) => k.teilnehmer.map(t => t.balken.length);
      expect(balkenZahl(await leitungsSicht(f, kampfId)).every(n => n === 0)).toBe(true);
      expect(balkenZahl(await rundenSicht(f, f.mira.userId, kampfId)).every(n => n === 0)).toBe(true);
    });

    it("zeigt eine Gegnerfigur, die mitten im Kampf ins Archiv ging, weiter mit ihren Werten", async () => {
      const { f, kampfId, wolf } = await tischMitGegner();
      const figur = await f.actors.getActor(f.gm, f.campaign, wolf);
      await f.actors.archiveActor(f.gm, f.campaign, wolf, { commandId: randomUUID(), expectedVersion: figur.version!, reason: "Aus der Liste geräumt" });
      expect(von(await leitungsSicht(f, kampfId), "Wolf").balken[0]).toMatchObject({ wert: 40 });
    });

    it("liefert Bilder nur für Karten, die der Betrachter sehen darf", async () => {
      const { f, kampfId, wolf, spaeher } = await tischMitGegner();
      const bilder = createActorPortraits(db, kampfCfg), png = Buffer.from(PNG_BASE64, "base64");
      await bilder.upload(f.gm, f.campaign, wolf, 0, png); await bilder.upload(f.gm, f.campaign, spaeher, 0, png);
      const gm = await leitungsSicht(f, kampfId), w = von(gm, "Wolf"), s = von(gm, "Späher");
      expect(w.bild).toEqual({ version: 1 });
      expect((await f.buehne.bild(f.mira.userId, f.campaign, kampfId, w.id)).data.equals(png)).toBe(true);
      await expect(f.buehne.bild(f.mira.userId, f.campaign, kampfId, s.id)).rejects.toBeInstanceOf(Gone);
      expect((await f.buehne.bild(f.gm, f.campaign, kampfId, s.id)).mime).toBe("image/png");
      await f.buehne.sichtSetzen(f.gm, f.campaign, kampfId, w.id, { sicht: { ...w.sicht, bild: false }, nameFuerRunde: null, expectedVersion: w.version });
      await expect(f.buehne.bild(f.mira.userId, f.campaign, kampfId, w.id)).rejects.toBeInstanceOf(Gone);
    });

    it("meldet der Spielleitung aufgebrauchtes Leben, entscheidet aber nichts", async () => {
      const { f, kampfId, wolf } = await tischMitGegner();
      const bogen = await f.game.getSheet(f.gm, f.campaign, wolf);
      await f.game.updateSheet(f.gm, f.campaign, { actorId: wolf, expectedVersion: bogen.version, fields: { ...bogen.fields, hp: 0 } });
      expect(von(await leitungsSicht(f, kampfId), "Wolf")).toMatchObject({ aufgebraucht: true, lage: "feld" });
    });
  });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run packages/rules/test/active-conditions.test.ts packages/server/test/kampfkarten.test.ts`
Expected: FAIL. `activeConditions`, `sichtSetzen`, `alsRunde` und `bild` fehlen, und die Spielenden bekommen noch die Nutzlast der Spielleitung.

- [ ] **Step 4: Implement `activeConditions`**

In `packages/rules/src/package-v2.ts` direkt nach `abilityOverview` einfügen:

```ts
/**
 * Die wirkenden Zustände eines Bogens, für Anzeigen wie den Kampftisch: Kennung und Name, sonst
 * nichts. Anders als `abilityOverview` prüft sie keinen Fähigkeitskatalog — eine Karte will wissen,
 * was wirkt, nicht was lernbar wäre —, und eine unbekannte Kennung fällt weg, statt die Anzeige
 * scheitern zu lassen.
 */
export function activeConditions(rawPackage: AnyRulePackage, fields: Readonly<Record<string, Scalar>>): readonly { readonly id: string; readonly name: string }[] {
  const pkg = parseSupportedRulePackage(rawPackage);
  if (pkg.schemaVersion !== 2 || !pkg.abilityRules?.conditionField || !pkg.conditions?.length) return deepFreeze([]);
  const roh = fields[pkg.abilityRules.conditionField];
  if (typeof roh !== "string") return deepFreeze([]);
  const namen = new Map(pkg.conditions.map(condition => [condition.id, condition.name]));
  return deepFreeze([...new Set(roh.split(/[\s,]+/).filter(Boolean))].flatMap(id => {
    const name = namen.get(id);
    return name === undefined ? [] : [{ id, name }];
  }));
}
```

Falls `Scalar` in `package-v2.ts` noch nicht importiert ist, mit `import type` aus derselben Quelle ergänzen, aus der `validatePackageFields` ihn bezieht. In `packages/rules/src/index.ts` Z. 10 `activeConditions` in die Exportliste neben `evaluateVitals` setzen.

- [ ] **Step 5: Implement `boegenFuerProjektion`**

In `packages/server/src/domain/gameplay.ts` innerhalb von `createGameplay`, direkt nach `getSheet`:

```ts
  /**
   * Bögen samt Regelpaket für eine serverseitige Projektion (Kampftisch).
   *
   * **Ohne Rechteprüfung**: der Aufrufer projiziert, bevor irgendetwas davon einen Betrachter
   * erreicht. Dieser Weg wird nie an eine HTTP-Antwort gereicht. Ein Bogen, dessen Paket fehlt oder
   * kaputt ist, fehlt hier einfach — eine Karte ohne Balken ist besser als ein Tisch, der nicht lädt.
   */
  async function boegenFuerProjektion(campaignId: string, actorIds: readonly string[]): Promise<ReadonlyMap<string, { sheet: ActorSheet; pkg: RulePackage }>> {
    const ergebnis = new Map<string, { sheet: ActorSheet; pkg: RulePackage }>(), pakete = new Map<string, RulePackage>();
    for (const actorId of new Set(actorIds)) {
      try {
        const bogen = await sheet(db, campaignId, actorId), schluessel = `${bogen.packageId}@${bogen.packageVersion}`;
        let pkg = pakete.get(schluessel);
        if (!pkg) { pkg = await packageFor(db, campaignId, { id: bogen.packageId, version: bogen.packageVersion }); pakete.set(schluessel, pkg); }
        ergebnis.set(actorId, { sheet: bogen, pkg });
      } catch { /* siehe oben: fehlt, statt den Tisch zu sprengen */ }
    }
    return ergebnis;
  }
```

`boegenFuerProjektion` in das Rückgabeobjekt von `createGameplay` aufnehmen (die lange `return { listPackages, … }`-Zeile).

- [ ] **Step 6: Implement the reading side**

`packages/server/src/domain/kampf-lesen.ts`:

- Importzeilen erweitern: `KampfFuerRunde` aus `@chronicle/protocol`; `karteFuerRunde` und `type VitalStand` aus `@chronicle/projection`; neu `import { activeConditions, evaluateVitals, type AnyRulePackage, type Scalar } from "@chronicle/rules";` und `import { createGameplay } from "./gameplay.ts";`.
- `ohneWerte` und das bisherige `kampfFuerLeitung` durch folgendes ersetzen:

```ts
const vitalStaende = (pkg: AnyRulePackage, fields: Readonly<Record<string, Scalar>>): VitalStand[] => {
  // Ein Bogen mitten im Umbau kann ungültig sein — dann eben keine Balken, statt eines Fehlers.
  try { return evaluateVitals(pkg, fields).map(v => ({ id: v.id, label: v.label, wert: v.value, hoechst: v.maximum, depletion: v.depletion })); }
  catch { return []; }
};
const zustaendeVon = (pkg: AnyRulePackage, fields: Readonly<Record<string, Scalar>>) => {
  try { return [...activeConditions(pkg, fields)]; } catch { return []; }
};

/**
 * Die Karten mit ihren Werten. Beendete Kämpfe lesen keine Bögen: die Werte von jetzt sind nicht
 * die von damals, und der Rückblick zeigt, wer dabei war und wer lag (Spezifikation E4).
 */
async function quellen(tx: Db, cfg: DomainConfig, campaignId: string, roh: KampfRoh): Promise<KartenQuelle[]> {
  const ids = [...new Set(roh.karten.flatMap(k => k.actorId ? [k.actorId] : []))];
  const boegen = roh.zustand !== "beendet" && ids.length ? await createGameplay(tx, cfg).boegenFuerProjektion(campaignId, ids) : new Map();
  const bilder = new Map(ids.length ? (await tx.query<{ actor_id: string; version: number }>(
    "SELECT actor_id,version FROM actor_portraits WHERE campaign_id=$1 AND actor_id=ANY($2::text[]) AND mime IS NOT NULL", [campaignId, ids])).rows
    .map(row => [row.actor_id, { version: Number(row.version) }] as const) : []);
  return roh.karten.map(k => {
    const bogen = k.actorId ? boegen.get(k.actorId) : undefined;
    const vitals = bogen ? vitalStaende(bogen.pkg, bogen.sheet.fields) : [];
    return {
      ...k, bogenVersion: bogen ? bogen.sheet.version : null, vitals,
      zustaende: bogen ? zustaendeVon(bogen.pkg, bogen.sheet.fields) : [],
      bild: k.actorId ? bilder.get(k.actorId) ?? null : null,
      aufgebraucht: !!bogen && (bogen.sheet.defeatPending || vitals.some(v => v.depletion === "defeat" && v.wert <= 0)),
    };
  });
}

export async function kampfFuerLeitung(tx: Db, cfg: DomainConfig, campaignId: string, roh: KampfRoh): Promise<KampfFuerLeitung> {
  return { leitung: true, ...kampfKopf(roh), teilnehmer: (await quellen(tx, cfg, campaignId, roh)).map(karteFuerLeitung) };
}

/** Für jeden ohne Leitung. Verdeckte Karten verlassen den Server nicht — ihre Bögen werden gar nicht erst gelesen. */
export async function kampfFuerRunde(tx: Db, cfg: DomainConfig, campaignId: string, roh: KampfRoh, fuehrt: ReadonlySet<string>): Promise<KampfFuerRunde> {
  const sichtbar: KampfRoh = { ...roh, karten: roh.karten.filter(k => k.lage === "feld" || k.lage === "umgelegt") };
  return { ...kampfKopf(roh), teilnehmer: (await quellen(tx, cfg, campaignId, sichtbar)).flatMap(q => { const karte = karteFuerRunde(q, fuehrt); return karte ? [karte] : []; }) };
}
```

`VitalReading.depletion` ist `"defeat" | "none"`. Ist er in `package-v2.ts` optional, `v.depletion ?? "none"` schreiben.

- [ ] **Step 7: Implement the viewer-aware reads, `sichtSetzen` and `bild`**

In `packages/server/src/domain/kampfbuehne.ts`:

- Importe erweitern: `KampfFuerRunde` nutzen; `zeigtBild` aus `@chronicle/projection`; `kampfFuerRunde` aus `./kampf-lesen.ts`; `import { listControlledActorIds } from "./actors.ts";`.
- Die beiden Funktionen `buehnen` und `buehne` samt ihrem Kommentar „AUFGABE 4 ersetzt …“ ersetzen durch:

```ts
  /** `null` = Spielleitung. Sonst die Figuren, die der Betrachter führt. */
  async function betrachter(userId: string, campaignId: string): Promise<ReadonlySet<string> | null> {
    const member = await campaigns.requireMember(userId, campaignId);
    return member.role === "leitung" ? null : new Set(await listControlledActorIds(db, member));
  }
  const darstellen = (tx: Db, campaignId: string, roh: KampfRoh, fuehrt: ReadonlySet<string> | null) =>
    fuehrt === null ? kampfFuerLeitung(tx, config, campaignId, roh) : kampfFuerRunde(tx, config, campaignId, roh, fuehrt);

  /** Alle am Tisch sehen die Kämpfe ihrer Kampagne — jede und jeder so, wie die Spielleitung es zulässt. */
  async function buehnen(userId: string, campaignId: string): Promise<readonly (KampfFuerLeitung | KampfFuerRunde)[]> {
    const fuehrt = await betrachter(userId, campaignId);
    const koepfe = (await db.query<{ id: string }>("SELECT id FROM kaempfe WHERE campaign_id=$1 ORDER BY erstellt_am DESC,id", [campaignId])).rows;
    const alle: (KampfFuerLeitung | KampfFuerRunde)[] = [];
    for (const kopf of koepfe) alle.push(await darstellen(db, campaignId, await lies(db, campaignId, kopf.id), fuehrt));
    return alle;
  }
  async function buehne(userId: string, campaignId: string, kampfId: string): Promise<KampfFuerLeitung | KampfFuerRunde> {
    const fuehrt = await betrachter(userId, campaignId);
    return darstellen(db, campaignId, await lies(db, campaignId, kampfId), fuehrt);
  }

  /** „Mit den Augen der Runde": genau die Nutzlast eines Betrachters, der keine Figur führt. */
  async function alsRunde(userId: string, campaignId: string, kampfId: string): Promise<KampfFuerRunde> {
    await leitung(userId, campaignId);
    return kampfFuerRunde(db, config, campaignId, await lies(db, campaignId, kampfId), new Set());
  }

  /** Was die Runde von einer Karte sieht: Balken, Name für die Runde, Bild, Zustände. */
  async function sichtSetzen(userId: string, campaignId: string, kampfId: string, teilnehmerId: string,
    input: { sicht: KartenSichtDaten; nameFuerRunde: string | null; expectedVersion: number }): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      const vorher = await lies(tx, campaignId, kampfId, true);
      if (vorher.zustand === "beendet") throw new Conflict();
      const karte = vorher.karten.find(k => k.id === teilnehmerId);
      if (!karte) throw new Gone();
      if (karte.version !== input.expectedVersion) throw new Conflict();
      await karteAendern(tx, campaignId, karte, { sicht: input.sicht, nameFuerRunde: input.nameFuerRunde });
      return stand(tx, campaignId, kampfId);
    });
  }

  /**
   * Das Porträt einer Karte, über den Kampf statt über die Figur: eine Spielerin darf die Figur des
   * Gegners nicht lesen, sein Bild auf dem Tisch aber sehen — wenn die Spielleitung es zeigt.
   * Dieselbe Regel wie in der Nutzlast (`zeigtBild`); wer die Karte nicht sieht, bekommt 404.
   */
  async function bild(userId: string, campaignId: string, kampfId: string, teilnehmerId: string): Promise<{ mime: string; sha256: string; data: Buffer }> {
    const fuehrt = await betrachter(userId, campaignId);
    const karte = (await lies(db, campaignId, kampfId)).karten.find(k => k.id === teilnehmerId);
    if (!karte?.actorId) throw new Gone();
    if (fuehrt !== null && !zeigtBild(karte, fuehrt)) throw new Gone();
    const row = (await db.query<{ mime: string | null; sha256: string | null; daten: string | null }>(
      "SELECT mime,sha256,daten FROM actor_portraits WHERE campaign_id=$1 AND actor_id=$2", [campaignId, karte.actorId])).rows[0];
    if (!row?.mime || !row.sha256 || !row.daten) throw new Gone();
    return { mime: row.mime, sha256: row.sha256, data: Buffer.from(row.daten, "base64") };
  }
```

- Das Rückgabeobjekt erweitern: `return { buehnen, buehne, alsRunde, bild, anlegen, teilnehmerHinzufuegen, teilnehmerEntfernen, lageSetzen, sichtSetzen, initiativeSetzen, eroeffnen, naechsterZug, beenden };`
- Den Dateikommentar oben um einen Satz ergänzen: „Die Lesewege projizieren je Betrachter (`kampf-lesen.ts`), die Befehle geben immer die Nutzlast der Spielleitung zurück — nur sie darf sie auslösen.“

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run packages/rules/test/active-conditions.test.ts packages/rules/test/package-v2.test.ts packages/server/test/kampfkarten.test.ts packages/server/test/kampfbuehne.test.ts packages/server/test/kampfkarten-export.test.ts packages/server/test/alles-in-einer-datei.test.ts packages/server/test/actor-portrait.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: 0 Fehler.

- [ ] **Step 9: Gegenprobe**

In `kampfFuerRunde` den Filter `.filter(k => k.lage === "feld" || k.lage === "umgelegt")` vorübergehend entfernen. „lässt Handkarten … aus der Nutzlast“ bleibt trotzdem grün, weil `karteFuerRunde` die Karte selbst verwirft: das ist die zweite Sperre, und sie hält. Nun zusätzlich in `packages/projection/src/kampfkarte.ts` die Zeile `if (q.lage === "hand" …) return null;` auskommentieren: jetzt muss der Test rot werden. Beides zurücksetzen und die Tests erneut grün laufen lassen.

- [ ] **Step 10: Commit**

```bash
git add -- packages/rules/src/package-v2.ts packages/rules/src/index.ts packages/rules/test/active-conditions.test.ts packages/server/src/domain/gameplay.ts packages/server/src/domain/kampf-lesen.ts packages/server/src/domain/kampfbuehne.ts packages/server/test/kampfkarten.test.ts
git commit -m "feat(kampf): Balken, Zustaende und Bilder auf der Karte; die Runde sieht nur, was die Spielleitung zeigt

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Schnellgegner aus Vorlage und Aufräumen beim Beenden

**Files:**

- Modify: `packages/server/src/domain/kampfbuehne.ts` (neu: `ausVorlage`, `archiviereKampffiguren`)
- Test: `packages/server/test/kampfkarten.test.ts` (Abschnitt „Schnellgegner und Aufräumen“)

**Interfaces:**

- Consumes: `instantiatePinnedActorInTx(tx, cfg, userId, campaignId, raw)` aus `./pinned-actors.ts`; `createActors(db, cfg).getActor` und `.archiveActor`; `neueKarte`, `lies`, `naechsteOrdnung`, `zugFrei`, `stand` (Task 3).
- Produces:
  - `ausVorlage(userId, campaignId, kampfId, { commandId, templateId, templateRevision, anzahl, name?, seite, initiative, lage }): Promise<KampfFuerLeitung>`
  - `archiviereKampffiguren(userId, campaignId, kampfId): Promise<KampfAufraeumen>`

- [ ] **Step 1: Write the failing tests**

In `packages/server/test/kampfkarten.test.ts` den Typ-Import um `KampfAufraeumen` erweitern. Dann hinter „Was die Runde sieht“ anfügen:

```ts
  describe("Schnellgegner und Aufräumen", () => {
    const rudel = (f: Awaited<ReturnType<typeof kampfFixture>>, anzahl: number, teil: { name?: string; lage?: "hand" | "feld"; commandId?: string } = {}) => ({
      commandId: teil.commandId ?? randomUUID(), templateId: f.wolf.id, templateRevision: f.wolf.revision, anzahl,
      seite: "gegner" as const, initiative: 12, lage: teil.lage ?? "hand", ...(teil.name ? { name: teil.name } : {}) });

    it("legt Schnellgegner als eigene Figuren an — verdeckt, nummeriert und nur für die Spielleitung", async () => {
      const f = await kampfFixture(db);
      const kampf = await f.buehne.anlegen(f.gm, f.campaign, { name: "Rudel" });
      const eingabe = rudel(f, 3);
      const stand = await f.buehne.ausVorlage(f.gm, f.campaign, kampf.id, eingabe);
      expect(namen(stand)).toEqual(["Wolf 1", "Wolf 2", "Wolf 3"]);
      expect(stand.teilnehmer.every(k => k.lage === "hand" && k.vomKampfAngelegt && k.actorId !== null && k.version === 1)).toBe(true);
      expect(stand.teilnehmer.map(k => k.balken[0]?.wert)).toEqual([40, 40, 40]);
      const figuren = stand.teilnehmer.map(k => k.actorId!);
      expect((await f.actors.listActors(f.mira.userId, f.campaign)).some(a => figuren.includes(a.id))).toBe(false);
      // Ein wiederholter Befehl (die Antwort ging verloren) legt nichts doppelt an.
      expect(namen(await f.buehne.ausVorlage(f.gm, f.campaign, kampf.id, eingabe))).toEqual(["Wolf 1", "Wolf 2", "Wolf 3"]);
    });

    it("nimmt einen eigenen Namen und nummeriert eine einzelne Figur nicht", async () => {
      const f = await kampfFixture(db);
      const kampf = await f.buehne.anlegen(f.gm, f.campaign, { name: "Einzeln" });
      expect(namen(await f.buehne.ausVorlage(f.gm, f.campaign, kampf.id, rudel(f, 1, { name: "Grauwolf", lage: "feld" })))).toEqual(["Grauwolf"]);
    });

    it("legt für einen beendeten Kampf keine Figur an", async () => {
      const f = await kampfFixture(db);
      const kampf = await f.buehne.anlegen(f.gm, f.campaign, { name: "Zu spät" });
      await f.buehne.beenden(f.gm, f.campaign, kampf.id);
      const vorher = (await f.actors.listActors(f.gm, f.campaign)).length;
      await expect(f.buehne.ausVorlage(f.gm, f.campaign, kampf.id, rudel(f, 2))).rejects.toBeInstanceOf(Conflict);
      expect((await f.actors.listActors(f.gm, f.campaign)).length).toBe(vorher);
    });

    it("räumt beim Beenden nur die Figuren weg, die der Kampf selbst angelegt hat", async () => {
      const f = await kampfFixture(db);
      const kampf = await f.buehne.anlegen(f.gm, f.campaign, { name: "Aufräumen" });
      await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaign, kampf.id, { name: "Mira", seite: "gefaehrten", initiative: 15, actorId: f.mira.actorId });
      const angelegt = (await f.buehne.ausVorlage(f.gm, f.campaign, kampf.id, rudel(f, 2, { lage: "feld" }))).teilnehmer.filter(k => k.vomKampfAngelegt).map(k => k.actorId!);
      await expect(f.buehne.archiviereKampffiguren(f.gm, f.campaign, kampf.id)).rejects.toBeInstanceOf(Conflict);
      await f.buehne.beenden(f.gm, f.campaign, kampf.id);
      const bericht: KampfAufraeumen = await f.buehne.archiviereKampffiguren(f.gm, f.campaign, kampf.id);
      expect([...bericht.archiviert].sort()).toEqual([...angelegt].sort());
      expect(bericht.nichtArchiviert).toEqual([]);
      const uebrig = (await f.actors.listActors(f.gm, f.campaign)).map(a => a.id);
      expect(uebrig).toContain(f.mira.actorId);
      expect(uebrig.some(id => angelegt.includes(id))).toBe(false);
      // Zweimal aufräumen findet nichts mehr.
      expect((await f.buehne.archiviereKampffiguren(f.gm, f.campaign, kampf.id)).archiviert).toEqual([]);
      await expect(f.buehne.archiviereKampffiguren(f.mira.userId, f.campaign, kampf.id)).rejects.toBeInstanceOf(Gone);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/server/test/kampfkarten.test.ts -t "Schnellgegner"`
Expected: FAIL mit „f.buehne.ausVorlage is not a function“.

- [ ] **Step 3: Implement**

In `packages/server/src/domain/kampfbuehne.ts` die Importe ergänzen:

```ts
import type { KampfAufraeumen } from "@chronicle/protocol";
import { createActors, listControlledActorIds } from "./actors.ts";
import { instantiatePinnedActorInTx } from "./pinned-actors.ts";
```

Den vorhandenen Import von `listControlledActorIds` damit zusammenführen, nicht doppeln. Dann innerhalb von `createKampfbuehne` nach `teilnehmerHinzufuegen` einfügen:

```ts
  /**
   * „Wolf aus Vorlage × 3": in EINER Transaktion N Figuren und N Karten. Jede Figur ist eine echte
   * Figur mit Bogen, Beute und Würfen (Spezifikation E1); sie gehört der Spielleitung, also sieht
   * keine Spielerin sie in ihrer Figurenliste.
   *
   * Die Befehlskennung jeder Figur ist `<commandId>:<nummer>`. Kommt derselbe Befehl zweimal (die
   * Antwort ging verloren), liefert die Figurenanlage dieselben Figuren zurück — und deren Karten
   * liegen dann schon auf dem Tisch.
   */
  async function ausVorlage(userId: string, campaignId: string, kampfId: string, input: {
    commandId: string; templateId: string; templateRevision: number; anzahl: number; name?: string;
    seite: KampfSeite; initiative: number; lage: "hand" | "feld";
  }): Promise<KampfFuerLeitung> {
    await leitung(userId, campaignId);
    return db.transaction(async tx => {
      // Erst die Kampagne, dann der Kampf: dieselbe Sperrreihenfolge wie jede Figurenanlage.
      await tx.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE", [campaignId]);
      const vorher = await lies(tx, campaignId, kampfId, true);
      if (vorher.zustand === "beendet") throw new Conflict();
      const vorlage = (await tx.query<{ name: string }>(
        "SELECT definition->>'name' AS name FROM actor_template_revisions WHERE template_id=$1 AND campaign_id=$2 AND revision=$3",
        [input.templateId, campaignId, input.templateRevision])).rows[0];
      if (!vorlage) throw new Gone();
      const basis = (input.name ?? vorlage.name).slice(0, 150);
      const liegen = new Set(vorher.karten.flatMap(k => k.actorId ? [k.actorId] : []));
      let ordnung = naechsteOrdnung(vorher), frei = input.lage === "feld" && zugFrei(vorher);
      for (let nummer = 1; nummer <= input.anzahl; nummer++) {
        const figur = await instantiatePinnedActorInTx(tx, config, userId, campaignId, {
          commandId: `${input.commandId}:${nummer}`, templateId: input.templateId, templateRevision: input.templateRevision,
          name: input.anzahl > 1 ? `${basis} ${nummer}` : basis });
        if (liegen.has(figur.id)) continue;
        const id = randomUUID();
        await tx.query(`INSERT INTO kampf_teilnehmer(id,kampf_id,campaign_id,seite,name,actor_id,initiative,ordnung,initiative_roll_id,am_zug)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,NULL,$9)`, [id, kampfId, campaignId, input.seite, figur.name, figur.id, input.initiative, ordnung++, frei]);
        frei = false;
        await neueKarte(tx, campaignId, { id, seite: input.seite, lage: input.lage, nameFuerRunde: null, sicht: vorgabeSicht(input.seite), vomKampfAngelegt: true });
      }
      return stand(tx, campaignId, kampfId);
    });
  }

  /**
   * Nach dem Kampf die Figuren ins Archiv legen, die der Kampf selbst angelegt hat — nie andere.
   * Archivieren löscht nichts; Inventar und Beute bleiben an der Figur. Jede Figur ist ein eigener
   * `actor.archive`-Befehl: scheitert einer, bleibt der Kampf trotzdem beendet, und der Bericht
   * nennt, wer übrig blieb (Spezifikation E7).
   */
  async function archiviereKampffiguren(userId: string, campaignId: string, kampfId: string): Promise<KampfAufraeumen> {
    await leitung(userId, campaignId);
    const roh = await lies(db, campaignId, kampfId);
    if (roh.zustand !== "beendet") throw new Conflict();
    const actors = createActors(db, config), archiviert: string[] = [], nichtArchiviert: string[] = [];
    for (const karte of roh.karten) {
      if (!karte.vomKampfAngelegt || !karte.actorId) continue;
      try {
        const figur = await actors.getActor(userId, campaignId, karte.actorId);
        if (figur.archivedAt !== null || figur.version === null) continue;
        await actors.archiveActor(userId, campaignId, karte.actorId, { commandId: randomUUID(), expectedVersion: figur.version, reason: "Der Kampf ist vorbei." });
        archiviert.push(karte.actorId);
      } catch { nichtArchiviert.push(karte.actorId); }
    }
    return { archiviert, nichtArchiviert };
  }
```

`ausVorlage` und `archiviereKampffiguren` in das Rückgabeobjekt aufnehmen.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/server/test/kampfkarten.test.ts packages/server/test/kampfbuehne.test.ts packages/server/test/actor-projection.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: 0 Fehler.

- [ ] **Step 5: Commit**

```bash
git add -- packages/server/src/domain/kampfbuehne.ts packages/server/test/kampfkarten.test.ts
git commit -m "feat(kampf): Schnellgegner aus Vorlage und Aufraeumen beim Beenden

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: HTTP-Wege und „einen Vitalwert setzen“

**Files:**

- Modify: `packages/server/src/domain/gameplay.ts` (neu: `setVital`, im Rückgabeobjekt)
- Modify: `packages/server/src/http/gameplay.ts` (ein Weg nach `/actors/:id/sheet`)
- Modify: `packages/server/src/http/kampfbuehne.ts` (ganze Datei, siehe Step 3)
- Test: `packages/server/test/kampfkarten.test.ts` (Abschnitt „Über HTTP“)

**Interfaces:**

- Consumes: `VitalSetzen`, `KarteLageSetzen`, `KarteSichtSetzen`, `KarteInitiativeSetzen`, `KartenAusVorlage`, `KampfBeenden`, `KampfSeiteSchema`, `StartLageSchema`, `NameFuerRundeSchema`, `KartenSicht` (Task 1); alle Domänenfunktionen aus Task 3 bis 5.
- Produces:
  - `createGameplay(db, cfg).setVital(userId, campaignId, { actorId, vital, wert, expectedVersion }): Promise<ActorSheet>`
  - Wege, alle unter `/api/campaigns/:campaignId`:
    - `PUT /actors/:id/sheet/vitals/:vital` mit `{wert, expectedVersion}`
    - `GET /kaempfe/:kampfId/als-runde`
    - `POST /kaempfe/:kampfId/teilnehmer/aus-vorlage`
    - `POST /kaempfe/:kampfId/teilnehmer/:teilnehmerId/lage`, `…/sicht`, `…/initiative`
    - `GET /kaempfe/:kampfId/teilnehmer/:teilnehmerId/bild`
    - `POST /kaempfe/:kampfId/beenden` mit `{archivieren?}`; die Antwort trägt dann `aufraeumen: KampfAufraeumen`
    - `POST /kaempfe/:kampfId/teilnehmer` nimmt zusätzlich `lage`, `nameFuerRunde`, `sicht`

- [ ] **Step 1: Write the failing tests**

In `packages/server/test/kampfkarten.test.ts` die Importe ergänzen:

```ts
import { buildApp } from "../src/app.ts";
import { createIdentity } from "../src/identity/index.ts";
```

Dann hinter „Schnellgegner und Aufräumen“ anfügen:

```ts
  describe("Über HTTP", () => {
    const httpCfg = { ...kampfCfg, origin: "https://kampftisch.test", cookieSecret: "kampftisch-http-cookie-secret-over-32-characters", bootstrapToken: "kampftisch-http-bootstrap-token-over-32-characters" };
    const kopf = async (userId: string) => ({ cookie: `chronicle_session=${(await createIdentity(db, httpCfg).issueSession(userId)).value}`, origin: httpCfg.origin });

    it("setzt Vitalwerte nur für Befugte und nur für ausgewiesene Balken", async () => {
      const f = await kampfFixture(db), app = await buildApp(db, httpCfg);
      try {
        const mira = await kopf(f.mira.userId), bogen = await f.game.getSheet(f.mira.userId, f.campaign, f.mira.actorId);
        const setze = (actorId: string, vital: string, payload: object) =>
          app.inject({ method: "PUT", url: `/api/campaigns/${f.campaign}/actors/${actorId}/sheet/vitals/${vital}`, headers: mira, payload });
        const ok = await setze(f.mira.actorId, "hp", { wert: 55, expectedVersion: bogen.version });
        expect(ok.statusCode).toBe(200);
        expect(ok.json().fields.hp).toBe(55);
        expect((await setze(f.mira.actorId, "hp", { wert: 50, expectedVersion: bogen.version })).statusCode).toBe(409);
        expect((await setze(f.mira.actorId, "name", { wert: 1, expectedVersion: bogen.version + 1 })).statusCode).toBe(404);
        expect((await setze(await f.gegner("Wolf"), "hp", { wert: 1, expectedVersion: 1 })).statusCode).toBe(404);
        expect((await setze(f.mira.actorId, "hp", { wert: "viel", expectedVersion: bogen.version + 1 })).statusCode).toBe(400);
      } finally { await app.close(); }
    });

    it("führt Lage, Sicht, Vorlage, Bild und Aufräumen über HTTP und lässt Spielende draußen", async () => {
      const f = await kampfFixture(db), app = await buildApp(db, httpCfg);
      try {
        const gm = await kopf(f.gm), mira = await kopf(f.mira.userId), basis = `/api/campaigns/${f.campaign}/kaempfe`;
        const post = (url: string, payload: object, headers = gm) => app.inject({ method: "POST", url, headers, payload });
        const get = (url: string, headers = gm) => app.inject({ method: "GET", url, headers });
        const kampf = (await post(basis, { name: "HTTP" })).json();
        const vorlage = { commandId: randomUUID(), templateId: f.wolf.id, templateRevision: f.wolf.revision, anzahl: 2, seite: "gegner", initiative: 12, lage: "hand" };
        const rudel = await post(`${basis}/${kampf.id}/teilnehmer/aus-vorlage`, vorlage);
        expect(rudel.statusCode).toBe(200);
        const w1 = rudel.json().teilnehmer.find((k: { name: string }) => k.name === "Wolf 1");
        expect((await post(`${basis}/${kampf.id}/teilnehmer/aus-vorlage`, { ...vorlage, commandId: randomUUID(), anzahl: 13 })).statusCode).toBe(400);
        const lage = `${basis}/${kampf.id}/teilnehmer/${w1.id}/lage`;
        expect((await post(lage, { lage: "irgendwo", expectedVersion: w1.version })).statusCode).toBe(400);
        expect((await post(lage, { lage: "feld", expectedVersion: w1.version }, mira)).statusCode).toBe(404);
        expect((await get(`${basis}/${kampf.id}/teilnehmer/${w1.id}/bild`, mira)).statusCode).toBe(404);
        expect((await get(`${basis}/${kampf.id}/als-runde`, mira)).statusCode).toBe(404);
        expect((await get(`${basis}/${kampf.id}/als-runde`)).json().teilnehmer).toEqual([]);
        expect((await post(lage, { lage: "feld", expectedVersion: w1.version })).statusCode).toBe(200);
        const sicht = await post(`${basis}/${kampf.id}/teilnehmer/${w1.id}/sicht`, {
          sicht: { schema: 1, standard: "verborgen", balken: {}, zustaende: false, bild: false }, nameFuerRunde: "Schatten", expectedVersion: w1.version + 1 });
        expect(sicht.statusCode).toBe(200);
        expect((await post(`${basis}/${kampf.id}/teilnehmer/${w1.id}/initiative`, { initiative: 3, initiativeRollId: null })).statusCode).toBe(200);
        const miraSieht = (await get(`${basis}/${kampf.id}`, mira)).json();
        expect(miraSieht.teilnehmer.map((k: { name: string }) => k.name)).toEqual(["Schatten"]);
        expect(JSON.stringify(miraSieht)).not.toMatch(/Wolf|"ordnung"|"sicht"/);
        const ende = await post(`${basis}/${kampf.id}/beenden`, { archivieren: true });
        expect(ende.statusCode).toBe(200);
        expect(ende.json().aufraeumen.archiviert).toHaveLength(2);
      } finally { await app.close(); }
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/server/test/kampfkarten.test.ts -t "Über HTTP"`
Expected: FAIL mit 404 auf den neuen Wegen.

- [ ] **Step 3: Implement**

In `packages/server/src/domain/gameplay.ts` nach `updateSheet` einfügen und ins Rückgabeobjekt aufnehmen:

```ts
  /**
   * Einen Vitalwert setzen — die schmale Schwester von `updateSheet` für den Kampftisch. Genau ein
   * Feld, und nur eines, das das Regelpaket als Balken ausweist; geschrieben wird über `updateSheet`
   * mit derselben Feldprüfung und derselben Niederlage-Markierung. Einen zweiten Wert an der
   * Karte gibt es nicht (Spezifikation E5).
   */
  async function setVital(userId: string, campaignId: string, input: { actorId: string; vital: string; wert: number; expectedVersion: number }) {
    return db.transaction(async tx => {
      const member = await authorize(tx, userId, campaignId); await controller(tx, member, input.actorId);
      const old = await sheet(tx, campaignId, input.actorId); if (old.version !== input.expectedVersion) throw new Conflict();
      const pkg = await packageFor(tx, campaignId, { id: old.packageId, version: old.packageVersion });
      if (pkg.schemaVersion !== 2 || !pkg.vitals?.some(vital => vital.id === input.vital)) throw new Gone("vital");
      return createGameplay(tx, cfg).updateSheet(userId, campaignId, { actorId: input.actorId, expectedVersion: input.expectedVersion, fields: { ...old.fields, [input.vital]: input.wert } });
    });
  }
```

In `packages/server/src/http/gameplay.ts` direkt nach dem `PUT …/actors/:id/sheet`-Weg:

```ts
  app.put<{Params:Item & {vital:string};Body:Static<typeof P.VitalSetzen>}>(`${base}/actors/:id/sheet/vitals/:vital`,{schema:{body:P.VitalSetzen}},async req=>game.setVital(await auth(req),req.params.campaignId,{actorId:req.params.id,vital:req.params.vital,wert:req.body.wert,expectedVersion:req.body.expectedVersion}));
```

`packages/server/src/http/kampfbuehne.ts`, ganze Datei:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { KampfBeenden, KampfSeiteSchema, KarteInitiativeSetzen, KarteLageSetzen, KarteSichtSetzen, KartenAusVorlage, KartenSicht,
  NameFuerRundeSchema, StartLageSchema } from "@chronicle/protocol";
import type { Db } from "../db/index.ts";
import type { AppConfig } from "../app.ts";
import { createIdentity } from "../identity/index.ts";
import { createKampfbuehne } from "../domain/kampfbuehne.ts";

const id = Type.String({ minLength: 1, maxLength: 128 });
export const SEITEN = ["gefaehrten", "gegner", "neutral"] as const;

const KampfAnlegen = Type.Object({ name: Type.String({ minLength: 1, maxLength: 512 }) }, { additionalProperties: false });
/**
 * Die geschlossene Menge steht im Schema, damit eine erfundene Seite an der Tür scheitert und
 * nicht erst am CHECK der Datenbank. Die Initiative darf negativ sein: nicht jedes Regelsystem
 * zählt von null aufwärts.
 */
const TeilnehmerAnlegen = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 512 }),
  seite: KampfSeiteSchema,
  initiative: Type.Integer({ minimum: -1_000_000, maximum: 1_000_000 }),
  actorId: Type.Optional(Type.Union([id, Type.Null()])),
  initiativeRollId: Type.Optional(Type.Union([id, Type.Null()])),
  lage: Type.Optional(StartLageSchema),
  nameFuerRunde: Type.Optional(NameFuerRundeSchema),
  sicht: Type.Optional(KartenSicht),
}, { additionalProperties: false });
/** A participant acts again next round, so both values identify the expected turn. */
const ZugWeiter = Type.Object({ von: id, runde: Type.Integer({ minimum: 1, maximum: 2_147_483_647 }) }, { additionalProperties: false });

export function registerKampfbuehne(app: FastifyInstance, db: Db, config: AppConfig) {
  const identity = createIdentity(db, config), domain = createKampfbuehne(db, config);
  const user = async (cookie: string | undefined) => (await identity.authenticate(cookie)).userId;
  type Scope = { campaignId: string };
  type Kampf = Scope & { kampfId: string };
  type Karte = Kampf & { teilnehmerId: string };
  const basis = "/api/campaigns/:campaignId/kaempfe", kampf = `${basis}/:kampfId`, karte = `${kampf}/teilnehmer/:teilnehmerId`;

  app.get<{ Params: Scope }>(basis, async req => domain.buehnen(await user(req.headers.cookie), req.params.campaignId));
  app.get<{ Params: Kampf }>(kampf, async req => domain.buehne(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId));
  app.get<{ Params: Kampf }>(`${kampf}/als-runde`, async req => domain.alsRunde(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId));
  app.post<{ Params: Scope; Body: Static<typeof KampfAnlegen> }>(basis, { schema: { body: KampfAnlegen } }, async req =>
    domain.anlegen(await user(req.headers.cookie), req.params.campaignId, req.body));
  app.post<{ Params: Kampf; Body: Static<typeof TeilnehmerAnlegen> }>(`${kampf}/teilnehmer`, { schema: { body: TeilnehmerAnlegen } }, async req =>
    domain.teilnehmerHinzufuegen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.body));
  app.post<{ Params: Kampf; Body: Static<typeof KartenAusVorlage> }>(`${kampf}/teilnehmer/aus-vorlage`, { schema: { body: KartenAusVorlage } }, async req =>
    domain.ausVorlage(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.body));
  app.delete<{ Params: Karte }>(karte, async req =>
    domain.teilnehmerEntfernen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.params.teilnehmerId));
  app.post<{ Params: Karte; Body: Static<typeof KarteLageSetzen> }>(`${karte}/lage`, { schema: { body: KarteLageSetzen } }, async req =>
    domain.lageSetzen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.params.teilnehmerId, req.body));
  app.post<{ Params: Karte; Body: Static<typeof KarteSichtSetzen> }>(`${karte}/sicht`, { schema: { body: KarteSichtSetzen } }, async req =>
    domain.sichtSetzen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.params.teilnehmerId, req.body));
  app.post<{ Params: Karte; Body: Static<typeof KarteInitiativeSetzen> }>(`${karte}/initiative`, { schema: { body: KarteInitiativeSetzen } }, async req =>
    domain.initiativeSetzen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.params.teilnehmerId, req.body));
  app.get<{ Params: Karte }>(`${karte}/bild`, async (req, reply) => {
    const bild = await domain.bild(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.params.teilnehmerId);
    return reply.header("Cache-Control", "private, no-store").header("X-Content-Type-Options", "nosniff")
      .header("Content-Security-Policy", "default-src 'none'; sandbox").header("ETag", `"${bild.sha256}"`).type(bild.mime).send(bild.data);
  });
  app.post<{ Params: Kampf }>(`${kampf}/eroeffnen`, async req => domain.eroeffnen(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId));
  app.post<{ Params: Kampf; Body: Static<typeof ZugWeiter> }>(`${kampf}/zug`, { schema: { body: ZugWeiter } }, async req =>
    domain.naechsterZug(await user(req.headers.cookie), req.params.campaignId, req.params.kampfId, req.body.von, req.body.runde));
  app.post<{ Params: Kampf; Body: Static<typeof KampfBeenden> }>(`${kampf}/beenden`, { schema: { body: KampfBeenden } }, async req => {
    const userId = await user(req.headers.cookie), stand = await domain.beenden(userId, req.params.campaignId, req.params.kampfId);
    return req.body.archivieren ? { ...stand, aufraeumen: await domain.archiviereKampffiguren(userId, req.params.campaignId, req.params.kampfId) } : stand;
  });
}
```

Prüfen, ob `SEITEN` noch irgendwo importiert wird (`git grep -n "SEITEN" -- packages`). Falls nicht, die Konstante entfernen.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/server/test/kampfkarten.test.ts packages/server/test/kampfbuehne.test.ts packages/server/test/health.test.ts`
Expected: PASS. Falls es `health.test.ts` nicht gibt, stattdessen `git grep -ln "buildApp" -- packages/server/test | head -3` und eine dieser Dateien laufen lassen, als Beweis, dass die App mit den neuen Wegen startet.

Run: `npm run typecheck`
Expected: 0 Fehler.

- [ ] **Step 5: Commit**

```bash
git add -- packages/server/src/domain/gameplay.ts packages/server/src/http/gameplay.ts packages/server/src/http/kampfbuehne.ts packages/server/test/kampfkarten.test.ts
git commit -m "feat(kampf): Wege fuer Lage, Sicht, Initiative, Vorlage, Bild und Vitalwert

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Live-Signal ohne Seitenkanal

**Files:**

- Modify: `packages/server/src/domain/communication.ts` (`projectedFingerprint`, Z. ~72–86; Import oben)
- Test: `packages/server/test/kampfkarten.test.ts` (Abschnitt „Live“)
- Konsumenten: `packages/server/test/actor-projection.test.ts`, alle Tests mit `live.sync` (`git grep -ln "live.sync\|\.sync(" -- packages/server/test`)

**Interfaces:**

- Consumes: `createKampfbuehne(db, cfg).buehnen(userId, campaignId)` (Task 4).
- Produces: Der Fingerabdruck je Betrachter enthält `kaempfe`, also genau die Nutzlast, die dieser Betrachter bekommt.

- [ ] **Step 1: Write the failing test**

In `packages/server/test/kampfkarten.test.ts` hinter „Über HTTP“ anfügen:

```ts
  describe("Live", () => {
    it("meldet der Runde nur, was sie sehen kann — auch der Zeitpunkt verrät nichts", async () => {
      const f = await kampfFixture(db);
      const kampf = await f.buehne.anlegen(f.gm, f.campaign, { name: "Live" });
      const wolf = await f.gegner("Wolf"), spaeher = await f.gegner("Späher");
      await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaign, kampf.id, { name: "Wolf", seite: "gegner", initiative: 12, actorId: wolf });
      const mitHand = await f.buehne.teilnehmerHinzufuegen(f.gm, f.campaign, kampf.id, { name: "Späher", seite: "gegner", initiative: 9, actorId: spaeher, lage: "hand" });
      const verdeckt = mitHand.teilnehmer.find(k => k.name === "Späher")!;
      const vorher = await f.live.sync(f.mira.userId, f.campaign);

      // Alles an der verdeckten Karte bleibt unsichtbar: Name, Einstellung, Werte.
      await f.buehne.sichtSetzen(f.gm, f.campaign, kampf.id, verdeckt.id, { sicht: { ...verdeckt.sicht, standard: "genau" }, nameFuerRunde: "Schatten", expectedVersion: verdeckt.version });
      const spaeherBogen = await f.game.getSheet(f.gm, f.campaign, spaeher);
      await f.game.updateSheet(f.gm, f.campaign, { actorId: spaeher, expectedVersion: spaeherBogen.version, fields: { ...spaeherBogen.fields, hp: 5 } });
      expect(await f.live.sync(f.mira.userId, f.campaign)).toBe(vorher);

      // Ein sichtbarer Wert, der sich in Worten ändert (40 → 60: „knapp" → „gut"), kommt an.
      const wolfBogen = await f.game.getSheet(f.gm, f.campaign, wolf);
      await f.game.updateSheet(f.gm, f.campaign, { actorId: wolf, expectedVersion: wolfBogen.version, fields: { ...wolfBogen.fields, hp: 60 } });
      const danach = await f.live.sync(f.mira.userId, f.campaign);
      expect(danach).toBeGreaterThan(vorher);

      // Eine sichtbare Änderung, die in Worten gleich bleibt (60 → 55, weiter „gut"), bleibt still.
      const wieder = await f.game.getSheet(f.gm, f.campaign, wolf);
      await f.game.updateSheet(f.gm, f.campaign, { actorId: wolf, expectedVersion: wieder.version, fields: { ...wieder.fields, hp: 55 } });
      expect(await f.live.sync(f.mira.userId, f.campaign)).toBe(danach);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/server/test/kampfkarten.test.ts -t "Live"`
Expected: FAIL. `danach` ist gleich `vorher`, weil der Fingerabdruck die Kämpfe noch nicht kennt.

- [ ] **Step 3: Implement**

In `packages/server/src/domain/communication.ts` oben importieren:

```ts
import { createKampfbuehne } from "./kampfbuehne.ts";
```

In `projectedFingerprint` im `hash({ … })`-Objekt hinter `table:await messages(userId,campaignId,"table")` ergänzen:

```ts
,kaempfe:await createKampfbuehne(db,cfg).buehnen(userId,campaignId)
```

Darüber eine Kommentarzeile im Stil der Datei:

```ts
    // Der Kampftisch geht als PROJIZIERTE Nutzlast ein: eine Änderung an einer verdeckten Karte ändert den Abdruck der Runde nicht, und ihr Zeitpunkt verrät deshalb nichts (Spezifikation E4).
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run packages/server/test/kampfkarten.test.ts packages/server/test/actor-projection.test.ts`
Expected: PASS.

Run: `git grep -ln "\.sync(" -- packages/server/test`, dann alle genannten Dateien gezielt laufen lassen.
Expected: PASS. Die in `atlas-chronicles-aussehen-umbau` festgehaltenen, schon vorher roten Live-Sequenz-Fälle sind Altlast. Mit `git stash` gegenprüfen, ob sie auch ohne diese Änderung fallen, und nur dann als vorbestehend melden.

- [ ] **Step 5: Commit**

```bash
git add -- packages/server/src/domain/communication.ts packages/server/test/kampfkarten.test.ts
git commit -m "feat(kampf): der Kampftisch kommt live an, ohne verdeckte Karten zu verraten

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Die Oberfläche des Kampftischs

Die Oberfläche ersetzt `Kampfbuehne.tsx`. Das Mockup (`design/iterations/kampftisch-20260923/mockup.html`) ist die Vorlage für Anordnung und Anmutung, Farben und Holz/Filz kommen aber aus den Looks bzw. `tabletop.css`. Die Oberfläche rechnet nichts, was der Server liefert: Wortstufen, Zehntel und „Die Runde sieht …“ stehen in der Nutzlast.

**Files:**

- Create: `packages/client/src/features/kampftisch-model.ts`
- Create: `packages/client/src/features/KampfBalken.tsx`, `Kampfkarte.tsx`, `KampfFenster.tsx`, `KampfAufnahme.tsx`, `Kampftisch.tsx`
- Create: `packages/client/src/features/kampftisch.css`
- Modify: `packages/client/src/features/tabletop.css` (Z. 4–6: Beschriftungsfarbe als Variable)
- Modify: `packages/client/src/features/TableView.tsx` (Import Z. 16, Einbindung in Z. 71)
- Delete: `packages/client/src/features/Kampfbuehne.tsx`, `packages/client/src/features/kampfbuehne.css`
- Create: `packages/client/src/i18n/en/kampftisch.json`; Modify: `packages/client/src/i18n.ts` (`textDateien`)
- Test: `packages/client/test/kampftisch-model.test.ts`, `packages/client/test/kampftisch-render.test.ts`, gemeinsame Beispiele in `packages/client/test/kampftisch-beispiele.ts`

**Interfaces:**

- Consumes: alle Antworttypen aus `@chronicle/protocol` (Task 1); die HTTP-Wege aus Task 6.
- Produces (`kampftisch-model.ts`):
  - Typen: `Kampf`, `BalkenAnsicht { anzeige: BalkenFuerRunde; leitung: BalkenFuerLeitung | null }`, `KartenAnsicht`, `BalkenFarbe`, `LageWeg`, `Aufnahme`, `KartenAktionen`
  - Funktionen: `istLeitungssicht(kampf)`, `ansichtFuerLeitung(karte)`, `ansichtFuerRunde(karte)`, `reihen(karten)`, `zielDes(weg)`, `balkenFarbe(balken, stelle)`, `initialen(name)`, `juengsterInitiativwurf(wuerfe, actorId)`
  - Tabellen: `SEITEN`, `SEITE_LABEL`, `MASKE_LABEL`, `MASKE_ERKLAERUNG_LABEL`, `WORT_LEBEN_LABEL`, `WORT_VORRAT_LABEL`, `LAGE_WEGE`, `LAGE_WEG_LABEL`, `AUFNAHMEN`, `AUFNAHME_LABEL`
- Produces (Komponenten): `Kampftisch(props wie bisher Kampfbuehne)`, `Kampfkarte`, `KampfBalken` samt `rundeSieht(balken)`, `Schwebe`, `MaskenWahl`, `WertAendern`, `KartenMenue`, `SichtBearbeiten`, `InitiativeAendern`, `LoeschenRueckfrage`, `BeendenRueckfrage`, `KampfAufnahme`.

- [ ] **Step 1: Write the failing model test**

`packages/client/test/kampftisch-beispiele.ts` (gemeinsame Beispielkarten für Modell- und Render-Test; keine Testdatei, damit nichts doppelt läuft):

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { KarteFuerLeitung, KarteFuerRunde } from "@chronicle/protocol";

export const LEITUNGSKARTE: KarteFuerLeitung = {
  id: "w1", name: "Graf Veyl", nameFuerRunde: "Vermummte Gestalt", seite: "gegner", lage: "feld", actorId: "a1", initiative: 17, ordnung: 0,
  initiativeRollId: null, gewuerfelt: false, amZug: true, sicht: { schema: 1, standard: "worte", balken: {}, zustaende: true, bild: true },
  vomKampfAngelegt: false, version: 1, bogenVersion: 3,
  balken: [{ id: "hp", label: "Lebenspunkte", wert: 40, hoechst: 100, art: "leben", maske: "worte", fuerRunde: { id: "hp", label: "Lebenspunkte", art: "leben", anzeige: "worte", stufe: "knapp" } }],
  zustaende: [{ id: "blutend", name: "Blutend" }], bild: null, aufgebraucht: false,
};
export const RUNDENKARTE: KarteFuerRunde = {
  id: "w1", name: "Vermummte Gestalt", seite: "gegner", lage: "feld", initiative: 17, gewuerfelt: false, amZug: false, eigene: false,
  balken: [{ id: "hp", label: "Lebenspunkte", art: "leben", anzeige: "worte", stufe: "knapp" }], zustaende: [], bild: null,
};
```

`packages/client/test/kampftisch-model.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { describe, expect, it } from "vitest";
import { KARTEN_LAGEN, type KarteFuerLeitung } from "@chronicle/protocol";
import type { ActionCard } from "../src/features/game-api";
import { LAGE_WEGE, LAGE_WEG_LABEL, ansichtFuerLeitung, ansichtFuerRunde, balkenFarbe, initialen, juengsterInitiativwurf, reihen, zielDes } from "../src/features/kampftisch-model";
import { LEITUNGSKARTE, RUNDENKARTE } from "./kampftisch-beispiele";

describe("Die Ansicht einer Karte", () => {
  it("zeigt der Spielleitung jeden Balken genau und hält ihre Einstellung daneben", () => {
    const ansicht = ansichtFuerLeitung(LEITUNGSKARTE);
    expect(ansicht.balken[0]!.anzeige).toEqual({ id: "hp", label: "Lebenspunkte", art: "leben", anzeige: "genau", wert: 40, hoechst: 100 });
    expect(ansicht.balken[0]!.leitung?.maske).toBe("worte");
    expect(ansicht.bearbeitbar).toEqual({ actorId: "a1", bogenVersion: 3 });
    expect(ansicht.roh).toBe(LEITUNGSKARTE);
  });

  it("lässt die Runde nur ihre eigene Figur bearbeiten und sagt nie „ohne Werte“", () => {
    expect(ansichtFuerRunde(RUNDENKARTE)).toMatchObject({ bearbeitbar: null, roh: null, ohneWerte: false });
    const eigene = ansichtFuerRunde({ ...RUNDENKARTE, eigene: true, actorId: "a9", bogenVersion: 2, balken: [] });
    expect(eigene).toMatchObject({ bearbeitbar: { actorId: "a9", bogenVersion: 2 }, ohneWerte: false });
  });
});

describe("Die Reihen auf dem Tisch", () => {
  it("stellt Gegner oben, Gefährten unten und lässt Hand und Ablage weg", () => {
    const karte = (id: string, seite: KarteFuerLeitung["seite"], lage: KarteFuerLeitung["lage"]) => ansichtFuerLeitung({ ...LEITUNGSKARTE, id, seite, lage });
    const ergebnis = reihen([karte("a", "gefaehrten", "feld"), karte("b", "gegner", "hand"), karte("c", "gegner", "umgelegt"), karte("d", "neutral", "ablage"), karte("e", "neutral", "feld")]);
    expect(ergebnis.map(r => [r.seite, r.karten.map(k => k.id)])).toEqual([["gegner", ["c"]], ["neutral", ["e"]], ["gefaehrten", ["a"]]]);
  });
});

describe("Die Wege einer Karte", () => {
  it("bietet aus jeder Lage einen beschrifteten Weg in jede andere erreichbare Lage, nie in dieselbe", () => {
    for (const lage of KARTEN_LAGEN) for (const weg of LAGE_WEGE[lage]) {
      expect(zielDes(weg)).not.toBe(lage);
      expect(LAGE_WEG_LABEL[weg].length).toBeGreaterThan(0);
    }
    expect(LAGE_WEGE.hand.map(zielDes)).toEqual(["feld", "ablage"]);
  });
});

describe("Kleinigkeiten", () => {
  it("färbt Leben rot und reiht andere Balken durch", () => {
    const b = (art: "leben" | "vorrat") => ({ anzeige: { id: "x", label: "X", art, anzeige: "worte" as const, stufe: "gut" as const }, leitung: null });
    expect(balkenFarbe(b("leben"), 0)).toBe("danger");
    expect([1, 2, 3, 4].map(stelle => balkenFarbe(b("vorrat"), stelle))).toEqual(["ok", "warning", "private", "info"]);
  });
  it("bildet Initialen aus höchstens zwei Wörtern", () => {
    expect(initialen("Wolf 1")).toBe("W1");
    expect(initialen("graf von veyl")).toBe("GV");
  });
  it("findet den jüngsten Initiativwurf einer Figur", () => {
    const wurf = (id: string, actorId: string, aktion: string, preparedAt: number) => ({ id, actorId, preparedAt, receipt: { action: { id: aktion }, total: 7 } }) as unknown as ActionCard;
    const wuerfe = [wurf("alt", "a1", "initiative", 1), wurf("neu", "a1", "initiative", 5), wurf("fremd", "a2", "initiative", 9), wurf("probe", "a1", "klettern", 8)];
    expect(juengsterInitiativwurf(wuerfe, "a1")?.id).toBe("neu");
    expect(juengsterInitiativwurf(wuerfe, null)).toBeNull();
  });
});
```

Der Render-Test in Step 11 benutzt dieselben Beispielkarten aus `kampftisch-beispiele.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/client/test/kampftisch-model.test.ts`
Expected: FAIL. `kampftisch-model` existiert nicht.

- [ ] **Step 3: Write the model**

`packages/client/src/features/kampftisch-model.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { KAMPF_SEITEN, type BalkenFuerLeitung, type BalkenFuerRunde, type BalkenMaske, type KampfFuerLeitung, type KampfFuerRunde, type KampfSeite,
  type KarteFuerLeitung, type KarteFuerRunde, type KartenBild, type KartenLage, type KartenSichtDaten, type KartenZustand, type Wortstufe } from "@chronicle/protocol";
import type { ActionCard } from "./game-api";

/**
 * Die Ansichtslogik des Kampftischs — rein und ohne Übersetzung, damit sie prüfbar bleibt.
 *
 * Sie rechnet nichts nach, was der Server liefert: welche Stufe ein Balken hat und was die Runde
 * sieht, steht in der Nutzlast. Hier wird nur geordnet, beschriftet und in eine gemeinsame Form
 * gebracht, damit eine Karte der Spielleitung und eine Karte der Runde gleich gezeichnet werden.
 *
 * Die Tabellen enden auf `_LABEL`: `tools/gate-sprache.mjs` erkennt genau diese Endung als
 * Anzeigetabelle und verlangt für jeden Wert einen Katalogeintrag.
 */
export type Kampf = KampfFuerLeitung | KampfFuerRunde;
export const istLeitungssicht = (kampf: Kampf): kampf is KampfFuerLeitung => "leitung" in kampf;

export interface BalkenAnsicht { readonly anzeige: BalkenFuerRunde; readonly leitung: BalkenFuerLeitung | null }
export interface KartenAnsicht {
  readonly id: string; readonly name: string; readonly nameFuerRunde: string | null; readonly seite: KampfSeite; readonly lage: KartenLage;
  readonly initiative: number; readonly gewuerfelt: boolean; readonly amZug: boolean; readonly eigene: boolean;
  readonly bild: KartenBild | null; readonly zustaende: readonly KartenZustand[]; readonly balken: readonly BalkenAnsicht[];
  readonly aufgebraucht: boolean;
  /** Wo ein Wert geändert werden darf: die Figur und der Stand ihres Bogens. */
  readonly bearbeitbar: { readonly actorId: string; readonly bogenVersion: number } | null;
  /** Nur in der Sicht der Spielleitung: die Karte, auf die sich ihre Befehle beziehen. */
  readonly roh: KarteFuerLeitung | null;
  /** Nur die Spielleitung erfährt, dass eine Karte gar keinen Bogen hat — für die Runde sähe das aus wie „alles verborgen“. */
  readonly ohneWerte: boolean;
}

export function ansichtFuerLeitung(k: KarteFuerLeitung): KartenAnsicht {
  return {
    id: k.id, name: k.name, nameFuerRunde: k.nameFuerRunde, seite: k.seite, lage: k.lage, initiative: k.initiative, gewuerfelt: k.gewuerfelt,
    amZug: k.amZug, eigene: false, bild: k.bild, zustaende: k.zustaende,
    balken: k.balken.map(b => ({ anzeige: { id: b.id, label: b.label, art: b.art, anzeige: "genau", wert: b.wert, hoechst: b.hoechst }, leitung: b })),
    aufgebraucht: k.aufgebraucht,
    bearbeitbar: k.actorId !== null && k.bogenVersion !== null ? { actorId: k.actorId, bogenVersion: k.bogenVersion } : null,
    roh: k, ohneWerte: k.actorId === null,
  };
}
export function ansichtFuerRunde(k: KarteFuerRunde): KartenAnsicht {
  return {
    id: k.id, name: k.name, nameFuerRunde: null, seite: k.seite, lage: k.lage, initiative: k.initiative, gewuerfelt: k.gewuerfelt,
    amZug: k.amZug, eigene: k.eigene, bild: k.bild, zustaende: k.zustaende, balken: k.balken.map(anzeige => ({ anzeige, leitung: null })),
    aufgebraucht: false,
    bearbeitbar: k.eigene && k.actorId !== undefined && k.bogenVersion !== undefined ? { actorId: k.actorId, bogenVersion: k.bogenVersion } : null,
    roh: null, ohneWerte: false,
  };
}

/** Gegner oben, Dazwischen in der Mitte, Gefährten unten — wie ein Kartenspiel auf dem Tisch. */
const TISCHORDNUNG: readonly KampfSeite[] = ["gegner", "neutral", "gefaehrten"];
export function reihen(karten: readonly KartenAnsicht[]): { readonly seite: KampfSeite; readonly karten: readonly KartenAnsicht[] }[] {
  return TISCHORDNUNG.map(seite => ({ seite, karten: karten.filter(k => k.seite === seite && (k.lage === "feld" || k.lage === "umgelegt")) }))
    .filter(reihe => reihe.karten.length > 0);
}

export const SEITEN = KAMPF_SEITEN;
export const SEITE_LABEL: Readonly<Record<KampfSeite, string>> = { gegner: "Gegner", neutral: "Dazwischen", gefaehrten: "Gefährten" };
export const MASKE_LABEL: Readonly<Record<BalkenMaske, string>> = { genau: "Genau", fuellstand: "Nur Füllstand", worte: "In Worten", verborgen: "Verborgen" };
export const MASKE_ERKLAERUNG_LABEL: Readonly<Record<BalkenMaske, string>> = {
  genau: "Zahl und Balken, zum Beispiel 37 / 100.",
  fuellstand: "Der Balken grob in Zehnteln, ohne Zahl.",
  worte: "Ein Wort wie „angeschlagen“ oder „fast leer“.",
  verborgen: "Die Runde sieht diesen Balken gar nicht.",
};
export const WORT_LEBEN_LABEL: Readonly<Record<Wortstufe, string>> = { voll: "unversehrt", gut: "angeschlagen", knapp: "schwer angeschlagen", leer: "am Boden" };
export const WORT_VORRAT_LABEL: Readonly<Record<Wortstufe, string>> = { voll: "voll", gut: "gut gefüllt", knapp: "fast leer", leer: "leer" };

export type LageWeg = "feld>hand" | "feld>umgelegt" | "feld>ablage" | "umgelegt>feld" | "umgelegt>hand" | "umgelegt>ablage" | "hand>feld" | "hand>ablage" | "ablage>feld" | "ablage>hand";
export const LAGE_WEGE: Readonly<Record<KartenLage, readonly LageWeg[]>> = {
  feld: ["feld>hand", "feld>umgelegt", "feld>ablage"],
  umgelegt: ["umgelegt>feld", "umgelegt>hand", "umgelegt>ablage"],
  hand: ["hand>feld", "hand>ablage"],
  ablage: ["ablage>feld", "ablage>hand"],
};
export const LAGE_WEG_LABEL: Readonly<Record<LageWeg, string>> = {
  "feld>hand": "In die Hand (verdecken)", "feld>umgelegt": "Umlegen", "feld>ablage": "Vom Feld nehmen",
  "umgelegt>feld": "Aufstehen lassen", "umgelegt>hand": "In die Hand (verdecken)", "umgelegt>ablage": "Vom Feld nehmen",
  "hand>feld": "Aufs Feld (ausspielen)", "hand>ablage": "In die Ablage",
  "ablage>feld": "Aufs Feld", "ablage>hand": "In die Hand",
};
export const zielDes = (weg: LageWeg): KartenLage => weg.slice(weg.indexOf(">") + 1) as KartenLage;

export const AUFNAHMEN = ["vorlage", "figur", "name"] as const;
export type Aufnahme = typeof AUFNAHMEN[number];
export const AUFNAHME_LABEL: Readonly<Record<Aufnahme, string>> = { vorlage: "Aus Vorlage", figur: "Figur am Tisch", name: "Nur Name" };

/** Leben ist rot; jeder andere Balken bekommt reihum eine eigene Farbe des Looks. */
export type BalkenFarbe = "danger" | "info" | "ok" | "warning" | "private";
const VORRAT_FARBEN: readonly BalkenFarbe[] = ["info", "ok", "warning", "private"];
export const balkenFarbe = (b: BalkenAnsicht, stelle: number): BalkenFarbe =>
  b.anzeige.art === "leben" ? "danger" : VORRAT_FARBEN[stelle % VORRAT_FARBEN.length]!;

export const initialen = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(wort => wort[0]!.toLocaleUpperCase()).join("");

/** Ausdrücklich der jüngste — die Reihenfolge der Liste verspricht niemand. */
export function juengsterInitiativwurf(wuerfe: readonly ActionCard[], actorId: string | null): ActionCard | null {
  if (!actorId) return null;
  return [...wuerfe].filter(karte => karte.actorId === actorId && karte.receipt.action?.id === "initiative")
    .sort((a, b) => b.preparedAt - a.preparedAt)[0] ?? null;
}

/** Was eine Karte auslösen kann. Der Kampftisch führt es aus; die Karte kennt keinen Weg zum Server. */
export interface KartenAktionen {
  lage(karte: KarteFuerLeitung, lage: KartenLage): void;
  sicht(karte: KarteFuerLeitung, sicht: KartenSichtDaten, nameFuerRunde: string | null): void;
  maske(karte: KarteFuerLeitung, vital: string, maske: BalkenMaske): void;
  initiative(karte: KarteFuerLeitung, initiative: number, initiativeRollId: string | null): void;
  loeschen(karte: KarteFuerLeitung): void;
  wert(actorId: string, vital: string, wert: number, bogenVersion: number): void;
  inventar?: (actorId: string) => void;
}
```

Zur Farbe: `VORRAT_FARBEN[stelle % 4]` ergibt für die Stellen 1 bis 4 `ok`, `warning`, `private`, `info`. Genau das erwartet der Test.

- [ ] **Step 4: Run model test**

Run: `npx vitest run packages/client/test/kampftisch-model.test.ts`
Expected: PASS.

- [ ] **Step 5: Write `KampfBalken.tsx`**

```tsx
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import type { ReactNode } from "react";
import { Eye, EyeOff, Gauge, Type, type LucideIcon } from "lucide-react";
import type { BalkenFuerRunde, BalkenMaske } from "@chronicle/protocol";
import { t } from "../i18n";
import { MASKE_LABEL, WORT_LEBEN_LABEL, WORT_VORRAT_LABEL, type BalkenAnsicht, type BalkenFarbe } from "./kampftisch-model";

/**
 * Ein Balken auf der Karte. Er zeigt, was er bekommt: eine Zahl, einen Füllstand in Zehnteln
 * oder ein Wort. Die Beschriftung stammt aus dem Regelpaket und bleibt dessen Text.
 *
 * **Die Zahl steht immer da, wo es eine gibt.** Der Füllstand trägt seine Aussage zusätzlich als
 * Text für Vorleseprogramme („etwa 6 von 10“), ein Wort ist ohnehin Text.
 */
export function rundeSieht(balken: BalkenFuerRunde | null): string {
  if (!balken) return t("nichts");
  if (balken.anzeige === "genau") return `${balken.wert} / ${balken.hoechst}`;
  if (balken.anzeige === "fuellstand") return t("etwa {n} von 10", { n: balken.zehntel });
  return balken.art === "leben" ? t(WORT_LEBEN_LABEL[balken.stufe]) : t(WORT_VORRAT_LABEL[balken.stufe]);
}
const SYMBOL: Readonly<Record<BalkenMaske, LucideIcon>> = { genau: Eye, fuellstand: Gauge, worte: Type, verborgen: EyeOff };

export function KampfBalken({ balken, farbe, onMaske, onWert, schwebe }: {
  balken: BalkenAnsicht; farbe: BalkenFarbe; onMaske?: (() => void) | undefined; onWert?: (() => void) | undefined; schwebe?: ReactNode;
}) {
  const { anzeige, leitung } = balken;
  const text = anzeige.anzeige === "fuellstand" ? null : rundeSieht(anzeige);
  const Symbol = leitung ? SYMBOL[leitung.maske] : null;
  const anteil = anzeige.anzeige === "genau" && anzeige.hoechst > 0 ? Math.max(0, Math.min(1, anzeige.wert / anzeige.hoechst)) * 100 : 0;
  return <div className="kampf-balken kampf-anker" data-farbe={farbe}>
    <div className="kampf-balken-kopf">
      {onMaske && leitung && Symbol ? <button type="button" className="kampf-auge" data-maske={leitung.maske} onClick={onMaske}
        aria-label={t("Was die Runde bei {balken} sieht: {anzeige}", { balken: anzeige.label, anzeige: t(MASKE_LABEL[leitung.maske]) })}>
        <Symbol size={13} aria-hidden="true" /></button> : null}
      <span className="kampf-balken-name">{anzeige.label}</span>
      {text === null ? null : onWert
        ? <button type="button" className="kampf-balken-wert" onClick={onWert} aria-label={t("{balken} ändern, jetzt {wert}", { balken: anzeige.label, wert: text })}>{text}</button>
        : <span className={anzeige.anzeige === "worte" ? "kampf-balken-wort" : "kampf-balken-wert"}>{text}</span>}
    </div>
    {anzeige.anzeige === "genau"
      ? <div className="kampf-spur" role="meter" aria-label={anzeige.label} aria-valuemin={0} aria-valuemax={anzeige.hoechst} aria-valuenow={anzeige.wert} aria-valuetext={text ?? ""}>
          <span style={{ inlineSize: `${anteil}%` }} /></div>
      : anzeige.anzeige === "fuellstand"
        ? <div className="kampf-spur in-zehnteln" role="meter" aria-label={anzeige.label} aria-valuemin={0} aria-valuemax={10} aria-valuenow={anzeige.zehntel}
            aria-valuetext={t("etwa {n} von 10", { n: anzeige.zehntel })}><span style={{ inlineSize: `${anzeige.zehntel * 10}%` }} /></div>
        : null}
    {leitung && leitung.maske !== "genau" ? <p className="kampf-balken-runde">{t("Die Runde sieht: {was}", { was: rundeSieht(leitung.fuerRunde) })}</p> : null}
    {schwebe}
  </div>;
}
```

Prüfen, dass `lucide-react` die Symbole `Gauge` und `Type` führt: `node -e "const l=require('lucide-react'); console.log(!!l.Gauge, !!l.Type)"` im Client-Ordner muss `true true` ausgeben. Fehlt eines, `Gauge` durch `BarChart3` und `Type` durch `CaseSensitive` ersetzen.

- [ ] **Step 6: Write `Kampfkarte.tsx`**

```tsx
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useCallback, useState } from "react";
import { EyeOff, MoreHorizontal } from "lucide-react";
import { Button } from "@chronicle/ui";
import { t } from "../i18n";
import type { ActionCard } from "./game-api";
import { KampfBalken } from "./KampfBalken";
import { InitiativeAendern, KartenMenue, LoeschenRueckfrage, MaskenWahl, SichtBearbeiten, WertAendern } from "./KampfFenster";
import { balkenFarbe, initialen, type KartenAktionen, type KartenAnsicht } from "./kampftisch-model";

type Offen = { art: "menue" | "sicht" | "initiative" | "loeschen" } | { art: "maske" | "wert"; vital: string };

/**
 * Eine Karte auf dem Tisch. Dieselbe Karte für Spielleitung und Runde — nur die Spielleitung
 * bekommt Kartenmenü und Augen an den Balken, und nur wer die Figur führt, ändert ihre Werte.
 * Zustände stehen als Wort, nie nur als Farbe: am Zug, umgelegt, verdeckt, deine Figur.
 */
export function Kampfkarte({ karte, leitung, klein = false, busy, aktionen, bildUrl, wurf }: {
  karte: KartenAnsicht; leitung: boolean; klein?: boolean; busy: boolean; aktionen: KartenAktionen;
  bildUrl: (karteId: string, version: number) => string; wurf: ActionCard | null;
}) {
  const [offen, setOffen] = useState<Offen | null>(null);
  const schliessen = useCallback(() => setOffen(null), []);
  const roh = leitung ? karte.roh : null;
  const klassen = ["kampfkarte", `seite-${karte.seite}`, karte.amZug ? "amzug" : "", karte.lage === "umgelegt" ? "umgelegt" : "",
    klein ? "klein" : "", karte.eigene ? "eigene" : ""].filter(Boolean).join(" ");
  const menueOffen = offen !== null && (offen.art === "menue" || offen.art === "sicht" || offen.art === "initiative" || offen.art === "loeschen");

  return <article className={klassen} aria-label={karte.name} aria-current={karte.amZug ? "step" : undefined}>
    {karte.amZug ? <span className="kampfkarte-marke">{t("am Zug")}</span> : null}
    {karte.eigene ? <span className="kampfkarte-eigene">{t("Deine Figur")}</span> : null}
    {karte.lage === "umgelegt" ? <span className="kampfkarte-stempel">{t("umgelegt")}</span> : null}
    <span className="kampfkarte-siegel" title={t("Initiative")}>{karte.initiative}</span>
    {roh ? <div className="kampf-anker kampfkarte-menue-ort">
      <button type="button" className="kampfkarte-menue" aria-haspopup="dialog" aria-expanded={menueOffen}
        aria-label={t("Was mit {name} geschehen soll", { name: karte.name })} onClick={() => setOffen({ art: "menue" })}>
        <MoreHorizontal size={16} aria-hidden="true" /></button>
      {offen?.art === "menue" ? <KartenMenue karte={roh} onClose={schliessen}
        onLage={ziel => { setOffen(null); aktionen.lage(roh, ziel); }}
        onSicht={() => setOffen({ art: "sicht" })} onInitiative={() => setOffen({ art: "initiative" })} onLoeschen={() => setOffen({ art: "loeschen" })}
        onInventar={roh.actorId && aktionen.inventar ? () => { setOffen(null); aktionen.inventar!(roh.actorId!); } : undefined} /> : null}
      {offen?.art === "sicht" ? <SichtBearbeiten karte={roh} onClose={schliessen}
        onSpeichern={(sicht, name) => { setOffen(null); aktionen.sicht(roh, sicht, name); }} /> : null}
      {offen?.art === "initiative" ? <InitiativeAendern karte={roh} wurf={wurf} onClose={schliessen}
        onSetzen={(wert, rollId) => { setOffen(null); aktionen.initiative(roh, wert, rollId); }} /> : null}
      {offen?.art === "loeschen" ? <LoeschenRueckfrage karte={roh} onClose={schliessen}
        onLoeschen={() => { setOffen(null); aktionen.loeschen(roh); }} /> : null}
    </div> : null}
    <div className="kampfkarte-bild">{karte.bild
      ? <img src={bildUrl(karte.id, karte.bild.version)} alt="" loading="lazy" />
      : <span className="kampfkarte-monogramm" aria-hidden="true">{initialen(karte.name)}</span>}</div>
    <h4 className="kampfkarte-name">{karte.name}
      {leitung && karte.nameFuerRunde ? <small>{t("Die Runde liest: „{name}“", { name: karte.nameFuerRunde })}</small> : null}</h4>
    {klein ? <span className="kampfkarte-verdeckt"><EyeOff size={12} aria-hidden="true" /> {t("verdeckt")}</span> : <>
      {karte.balken.length ? <div className="kampfkarte-balken">{karte.balken.map((balken, stelle) => {
        const vital = balken.anzeige.id, anzeige = balken.anzeige;
        const bearbeitbar = karte.bearbeitbar && anzeige.anzeige === "genau" ? karte.bearbeitbar : null;
        const schwebe = offen?.art === "maske" && offen.vital === vital && roh && balken.leitung
          ? <MaskenWahl balken={balken.leitung} onClose={schliessen} onWahl={maske => { setOffen(null); aktionen.maske(roh, vital, maske); }} />
          : offen?.art === "wert" && offen.vital === vital && bearbeitbar && anzeige.anzeige === "genau"
            ? <WertAendern label={anzeige.label} wert={anzeige.wert} hoechst={anzeige.hoechst} onClose={schliessen}
                onSetzen={wert => { setOffen(null); aktionen.wert(bearbeitbar.actorId, vital, wert, bearbeitbar.bogenVersion); }} />
            : null;
        return <KampfBalken key={vital} balken={balken} farbe={balkenFarbe(balken, stelle)} schwebe={schwebe}
          onMaske={roh && balken.leitung ? () => setOffen({ art: "maske", vital }) : undefined}
          onWert={bearbeitbar ? () => setOffen({ art: "wert", vital }) : undefined} />;
      })}</div> : leitung && karte.ohneWerte ? <p className="kampfkarte-ohne">{t("Ohne Werte")}</p> : null}
      {karte.zustaende.length ? <ul className="kampfkarte-zustaende" aria-label={t("Zustände")}>
        {karte.zustaende.map(zustand => <li key={zustand.id}>{zustand.name}</li>)}</ul> : null}
      {roh && karte.aufgebraucht && karte.lage === "feld" ? <div className="kampfkarte-hinweis" role="status">{t("Leben aufgebraucht. Umlegen?")}
        <Button disabled={busy} onClick={() => aktionen.lage(roh, "umgelegt")}>{t("Umlegen")}</Button></div> : null}
      <p className="kampfkarte-fuss">{karte.gewuerfelt ? t("gewürfelt") : t("gesetzt")}</p>
    </>}
  </article>;
}
```

- [ ] **Step 7: Write `KampfFenster.tsx`**

```tsx
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { BALKEN_MASKEN, type BalkenFuerLeitung, type BalkenMaske, type KarteFuerLeitung, type KartenLage, type KartenSichtDaten } from "@chronicle/protocol";
import { Button } from "@chronicle/ui";
import { t } from "../i18n";
import type { ActionCard } from "./game-api";
import { rundeSieht } from "./KampfBalken";
import { LAGE_WEGE, LAGE_WEG_LABEL, MASKE_ERKLAERUNG_LABEL, MASKE_LABEL, zielDes } from "./kampftisch-model";

/**
 * Die kleinen Fenster am Kampftisch. Jede Rückfrage steht hier in der Oberfläche, nie über
 * `window.confirm`: dessen nativer Dialog lässt in Electron den Tastaturfokus liegen.
 * Escape und ein Klick daneben schließen; der erste Knopf bekommt den Fokus.
 */
export function Schwebe({ titel, onClose, children }: { titel: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null), schliessen = useRef(onClose);
  schliessen.current = onClose;
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>(".kampf-schwebe-inhalt button, .kampf-schwebe-inhalt input, .kampf-schwebe-inhalt select")?.focus();
    const taste = (event: KeyboardEvent) => { if (event.key === "Escape") schliessen.current(); };
    const zeiger = (event: PointerEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) schliessen.current(); };
    document.addEventListener("keydown", taste); document.addEventListener("pointerdown", zeiger);
    return () => { document.removeEventListener("keydown", taste); document.removeEventListener("pointerdown", zeiger); };
  }, []);
  return <div ref={ref} className="kampf-schwebe" role="dialog" aria-label={titel}>
    <div className="kampf-schwebe-kopf"><h4>{titel}</h4>
      <button type="button" className="kampf-schwebe-zu" aria-label={t("Schließen")} onClick={() => schliessen.current()}><X size={14} aria-hidden="true" /></button></div>
    <div className="kampf-schwebe-inhalt">{children}</div>
  </div>;
}

export function MaskenWahl({ balken, onWahl, onClose }: { balken: BalkenFuerLeitung; onWahl: (maske: BalkenMaske) => void; onClose: () => void }) {
  return <Schwebe titel={t("Was sieht die Runde bei „{balken}“?", { balken: balken.label })} onClose={onClose}>
    <div role="radiogroup" aria-label={t("Anzeige für die Runde")}>
      {BALKEN_MASKEN.map(maske => <button key={maske} type="button" role="radio" aria-checked={maske === balken.maske} className="kampf-option" onClick={() => onWahl(maske)}>
        <b>{t(MASKE_LABEL[maske])}</b><span>{t(MASKE_ERKLAERUNG_LABEL[maske])}</span></button>)}
    </div>
    <p className="kampf-vorschau">{t("So sieht es die Runde gerade: {was}", { was: rundeSieht(balken.fuerRunde) })}</p>
    <p className="field-help">{t("Wer die Figur selbst führt, sieht ihre Werte immer genau.")}</p>
  </Schwebe>;
}

export function WertAendern({ label, wert, hoechst, onSetzen, onClose }: { label: string; wert: number; hoechst: number; onSetzen: (wert: number) => void; onClose: () => void }) {
  const [neu, setNeu] = useState(wert);
  const schritt = (d: number) => setNeu(alt => (Number.isFinite(alt) ? alt : wert) + d);
  return <Schwebe titel={t("{balken} ändern", { balken: label })} onClose={onClose}>
    <div className="kampf-stepper">
      <button type="button" aria-label={t("{n} abziehen", { n: 5 })} onClick={() => schritt(-5)}>−5</button>
      <button type="button" aria-label={t("{n} abziehen", { n: 1 })} onClick={() => schritt(-1)}>−1</button>
      <input type="number" aria-label={t("Neuer Wert")} value={Number.isFinite(neu) ? neu : ""} onChange={event => setNeu(event.target.valueAsNumber)} />
      <button type="button" aria-label={t("{n} dazu", { n: 1 })} onClick={() => schritt(1)}>+1</button>
      <button type="button" aria-label={t("{n} dazu", { n: 5 })} onClick={() => schritt(5)}>+5</button>
    </div>
    <p className="field-help">{t("Höchstwert {n}. Der Wert steht im Bogen der Figur; die Karte zeigt ihn nur an.", { n: hoechst })}</p>
    <Button variant="primary" disabled={!Number.isFinite(neu)} onClick={() => onSetzen(neu)}>{t("Übernehmen")}</Button>
  </Schwebe>;
}

export function KartenMenue({ karte, onLage, onSicht, onInitiative, onInventar, onLoeschen, onClose }: {
  karte: KarteFuerLeitung; onLage: (ziel: KartenLage) => void; onSicht: () => void; onInitiative: () => void;
  onInventar?: (() => void) | undefined; onLoeschen: () => void; onClose: () => void;
}) {
  return <Schwebe titel={karte.name} onClose={onClose}>
    <ul className="kampf-menue">
      {LAGE_WEGE[karte.lage].map(weg => <li key={weg}><button type="button" onClick={() => onLage(zielDes(weg))}>{t(LAGE_WEG_LABEL[weg])}</button></li>)}
      <li className="kampf-menue-trenner" role="separator" />
      <li><button type="button" onClick={onSicht}>{t("Was sieht die Runde?")}</button></li>
      <li><button type="button" onClick={onInitiative}>{t("Initiative ändern")}</button></li>
      {onInventar ? <li><button type="button" onClick={onInventar}>{t("Inventar öffnen")}</button></li> : null}
      <li className="kampf-menue-trenner" role="separator" />
      <li><button type="button" className="gefahr" onClick={onLoeschen}>{t("Karte löschen …")}</button></li>
    </ul>
  </Schwebe>;
}

export function SichtBearbeiten({ karte, onSpeichern, onClose }: { karte: KarteFuerLeitung; onSpeichern: (sicht: KartenSichtDaten, nameFuerRunde: string | null) => void; onClose: () => void }) {
  const [name, setName] = useState(karte.nameFuerRunde ?? ""), [bild, setBild] = useState(karte.sicht.bild);
  const [zustaende, setZustaende] = useState(karte.sicht.zustaende), [standard, setStandard] = useState<BalkenMaske>(karte.sicht.standard);
  return <Schwebe titel={t("Was sieht die Runde von „{name}“?", { name: karte.name })} onClose={onClose}>
    <label>{t("Name für die Runde")}<input value={name} maxLength={160} placeholder={t("leer lassen für „{name}“", { name: karte.name })} onChange={event => setName(event.target.value)} /></label>
    <label className="kampf-haken"><input type="checkbox" checked={bild} onChange={event => setBild(event.target.checked)} /> {t("Bild zeigen")}</label>
    <label className="kampf-haken"><input type="checkbox" checked={zustaende} onChange={event => setZustaende(event.target.checked)} /> {t("Zustände zeigen")}</label>
    <label>{t("Alle Balken ohne eigene Einstellung")}<select value={standard} onChange={event => setStandard(event.target.value as BalkenMaske)}>
      {BALKEN_MASKEN.map(maske => <option key={maske} value={maske}>{t(MASKE_LABEL[maske])}</option>)}</select></label>
    <p className="field-help">{t("Einzelne Balken stellst du am Auge neben dem Balken ein.")}</p>
    <Button variant="primary" onClick={() => onSpeichern({ ...karte.sicht, bild, zustaende, standard }, name.trim() || null)}>{t("Übernehmen")}</Button>
  </Schwebe>;
}

export function InitiativeAendern({ karte, wurf, onSetzen, onClose }: { karte: KarteFuerLeitung; wurf: ActionCard | null; onSetzen: (initiative: number, rollId: string | null) => void; onClose: () => void }) {
  const [wert, setWert] = useState(karte.initiative);
  return <Schwebe titel={t("Initiative von {name}", { name: karte.name })} onClose={onClose}>
    <label>{t("Initiative")}<input type="number" value={Number.isFinite(wert) ? wert : ""} onChange={event => setWert(event.target.valueAsNumber)} /></label>
    {wurf ? <p className="kampf-wurf">{t("Jüngster Initiativwurf dieser Figur:")} <strong>{Math.trunc(wurf.receipt.total)}</strong>
      <Button onClick={() => onSetzen(Math.trunc(wurf.receipt.total), wurf.id)}>{t("Wert übernehmen")}</Button></p> : null}
    <p className="field-help">{t("Von Hand gesetzt gilt der Wert als gesetzt, nicht als gewürfelt. Ab dem nächsten Zug gilt die neue Reihenfolge.")}</p>
    <Button variant="primary" disabled={!Number.isInteger(wert)} onClick={() => onSetzen(wert, null)}>{t("Übernehmen")}</Button>
  </Schwebe>;
}

export function LoeschenRueckfrage({ karte, onLoeschen, onClose }: { karte: KarteFuerLeitung; onLoeschen: () => void; onClose: () => void }) {
  return <Schwebe titel={t("Karte löschen?")} onClose={onClose}>
    <p>{t("„{name}“ verschwindet ganz vom Tisch, auch aus Hand und Ablage. Das ist für Versehen gedacht; wer nur vom Feld soll, kommt in die Ablage.", { name: karte.name })}</p>
    <div className="button-row"><Button variant="danger" onClick={onLoeschen}>{t("Löschen")}</Button><Button onClick={onClose}>{t("Abbrechen")}</Button></div>
  </Schwebe>;
}

export function BeendenRueckfrage({ angelegt, onBeenden, onClose }: { angelegt: number; onBeenden: (archivieren: boolean) => void; onClose: () => void }) {
  const [archivieren, setArchivieren] = useState(true);
  return <Schwebe titel={t("Kampf beenden?")} onClose={onClose}>
    <p>{t("Danach ist niemand mehr am Zug, und der Kampf nimmt keine Karten mehr auf.")}</p>
    {angelegt ? <>
      <label className="kampf-haken"><input type="checkbox" checked={archivieren} onChange={event => setArchivieren(event.target.checked)} />
        {" "}{t("Gegner, die für diesen Kampf angelegt wurden, ins Archiv legen ({n})", { n: angelegt })}</label>
      <p className="field-help">{t("Archivieren löscht nichts: Inventar und Beute bleiben an der Figur, und du kannst sie zurückholen.")}</p>
    </> : null}
    <div className="button-row"><Button variant="primary" onClick={() => onBeenden(angelegt > 0 && archivieren)}>{t("Beenden")}</Button><Button onClick={onClose}>{t("Abbrechen")}</Button></div>
  </Schwebe>;
}
```

- [ ] **Step 8: Write `KampfAufnahme.tsx`**

```tsx
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { Plus } from "lucide-react";
import type { ActorCard, ActorTemplateData, KampfSeite, TemplateCard } from "@chronicle/protocol";
import { Button, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useTask } from "../hooks";
import { t } from "../i18n";
import type { ActionCard } from "./game-api";
import { AUFNAHMEN, AUFNAHME_LABEL, SEITEN, SEITE_LABEL, juengsterInitiativwurf, type Aufnahme } from "./kampftisch-model";

/**
 * „Wer kämpft mit?“ — drei Wege auf den Tisch: aus einer Figurvorlage (auch mehrere auf einmal),
 * eine Figur, die schon am Tisch sitzt, oder nur ein Name für das, was keine Werte braucht.
 * Wer eine Figur wählt, übernimmt deren Namen: zwei Namen für dieselbe Person wären genau die
 * Doppelung, die am Tisch niemand auflösen kann.
 */
export function KampfAufnahme({ campaignId, kampfId, actors, vorlagen, wuerfe, onChanged }: {
  campaignId: string; kampfId: string; actors: readonly ActorCard[]; vorlagen: readonly TemplateCard<ActorTemplateData>[];
  wuerfe: readonly ActionCard[]; onChanged: () => void;
}) {
  const [art, setArt] = useState<Aufnahme>("vorlage"), [actorId, setActorId] = useState(""), [vorlageId, setVorlageId] = useState("");
  const [anzahl, setAnzahl] = useState(1), [name, setName] = useState(""), [seite, setSeite] = useState<KampfSeite>("gegner");
  const [initiative, setInitiative] = useState(10), [lage, setLage] = useState<"feld" | "hand">("feld"), [beleg, setBeleg] = useState<string | null>(null);
  const task = useTask();
  const offene = vorlagen.filter(v => v.archivedAt === null), vorlage = offene.find(v => v.id === vorlageId) ?? null;
  const wurf = art === "figur" ? juengsterInitiativwurf(wuerfe, actorId || null) : null;
  const vorlagenName = name.trim() || vorlage?.definition.name || "";
  const bereit = !Number.isNaN(initiative) && (art === "vorlage" ? vorlage !== null : art === "figur" ? actorId !== "" : name.trim() !== "");

  const waehleArt = (neu: Aufnahme) => { setArt(neu); setBeleg(null); setSeite(neu === "figur" ? "gefaehrten" : "gegner"); };
  const waehleFigur = (id: string) => { setActorId(id); setBeleg(null); const figur = actors.find(a => a.id === id); if (figur) setName(figur.name); };
  const absenden = () => void task.run(async () => {
    const pfad = `/kaempfe/${encodeURIComponent(kampfId)}/teilnehmer`;
    if (art === "vorlage" && vorlage) await api(apiPath(campaignId, `${pfad}/aus-vorlage`), { method: "POST", body: {
      commandId: crypto.randomUUID(), templateId: vorlage.id, templateRevision: vorlage.revision, anzahl,
      ...(name.trim() ? { name: name.trim() } : {}), seite, initiative, lage } });
    else await api(apiPath(campaignId, pfad), { method: "POST", body: {
      name: name.trim(), seite, initiative, lage, actorId: art === "figur" ? actorId : null, initiativeRollId: art === "figur" ? beleg : null } });
    setName(""); setActorId(""); setBeleg(null); setAnzahl(1); onChanged();
  });

  return <form className="kampftisch-fach kampf-aufnahme" onSubmit={event => { event.preventDefault(); absenden(); }}>
    <h4><Plus size={16} aria-hidden="true" /> {t("Wer kämpft mit?")}</h4>
    <div className="kampf-aufnahme-wahl" role="group" aria-label={t("Woher kommt die Karte?")}>
      {AUFNAHMEN.map(a => <button key={a} type="button" aria-pressed={art === a} onClick={() => waehleArt(a)}>{t(AUFNAHME_LABEL[a])}</button>)}
    </div>
    {art === "figur" ? <label>{t("Figur am Tisch")}<select value={actorId} onChange={event => waehleFigur(event.target.value)}>
      <option value="">{t("Figur wählen")}</option>{actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label> : null}
    {art === "vorlage" ? offene.length ? <div className="kampf-felder">
      <label>{t("Vorlage")}<select value={vorlageId} onChange={event => setVorlageId(event.target.value)}>
        <option value="">{t("Vorlage wählen")}</option>{offene.map(v => <option key={v.id} value={v.id}>{v.definition.name}</option>)}</select></label>
      <label>{t("Anzahl")}<input type="number" min={1} max={12} value={anzahl}
        onChange={event => setAnzahl(Math.min(12, Math.max(1, Math.trunc(event.target.valueAsNumber) || 1)))} /></label>
    </div> : <p className="field-help">{t("Noch keine Figurvorlage. Lege in der Schmiede eine an, zum Beispiel „Wolf“; danach stellst du hier mehrere auf einmal auf.")}</p> : null}
    {art !== "figur" ? <label>{art === "vorlage" ? t("Name (leer lassen für den Namen der Vorlage)") : t("Name auf der Karte")}
      <input value={name} onChange={event => setName(event.target.value)} maxLength={art === "vorlage" ? 150 : 160}
        placeholder={art === "name" ? t("z. B. Einstürzende Decke") : undefined} /></label> : null}
    <div className="kampf-felder">
      <label>{t("Seite")}<select value={seite} onChange={event => setSeite(event.target.value as KampfSeite)}>
        {SEITEN.map(s => <option key={s} value={s}>{t(SEITE_LABEL[s])}</option>)}</select></label>
      <label>{t("Initiative")}<input type="number" value={Number.isNaN(initiative) ? "" : initiative}
        onChange={event => { setInitiative(event.target.valueAsNumber); setBeleg(null); }} /></label>
      <label>{t("Wohin?")}<select value={lage} onChange={event => setLage(event.target.value as "feld" | "hand")}>
        <option value="feld">{t("Gleich aufs Feld")}</option><option value="hand">{t("Verdeckt in deine Hand")}</option></select></label>
    </div>
    {wurf ? <p className="kampf-wurf">{t("Diese Figur hat Initiative gewürfelt:")} <strong>{Math.trunc(wurf.receipt.total)}</strong>.{" "}
      {beleg === wurf.id ? <span className="kampfkarte-beleg">{t("übernommen")}</span>
        : <Button onClick={() => { setInitiative(Math.trunc(wurf.receipt.total)); setBeleg(wurf.id); }}>{t("Wert übernehmen")}</Button>}</p> : null}
    {art === "vorlage" && vorlage ? <p className="field-help">{anzahl > 1
      ? t("Legt „{name} 1“ bis „{name} {n}“ als eigene Figuren an. Nur du siehst sie in der Figurenliste.", { name: vorlagenName, n: anzahl })
      : t("Legt „{name}“ als eigene Figur an. Nur du siehst sie in der Figurenliste.", { name: vorlagenName })}</p> : null}
    <p className="field-help">{t("Höhere Initiative handelt zuerst. Bei Gleichstand entscheidet, wer zuerst aufgestellt wurde — und das bleibt so.")}</p>
    <Button type="submit" variant="primary" disabled={task.busy || !bereit}>{t("Auf den Tisch legen")}</Button>
    {task.error ? <Notice error>{task.error}</Notice> : null}
  </form>;
}
```

- [ ] **Step 9: Write `Kampftisch.tsx`**

```tsx
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useState } from "react";
import { ChevronRight, Eye, Flag, Plus, Swords } from "lucide-react";
import type { ActorCard, ActorTemplateData, KampfFuerRunde, TemplateCard } from "@chronicle/protocol";
import { Button, EmptyState, Loading, Notice } from "@chronicle/ui";
import { api, apiPath } from "../api";
import { useResource, useTask } from "../hooks";
import { t } from "../i18n";
import type { ActionCard } from "./game-api";
import { KampfAufnahme } from "./KampfAufnahme";
import { BeendenRueckfrage } from "./KampfFenster";
import { Kampfkarte } from "./Kampfkarte";
import { SEITE_LABEL, ansichtFuerLeitung, ansichtFuerRunde, istLeitungssicht, juengsterInitiativwurf, reihen,
  type Kampf, type KartenAktionen, type KartenAnsicht } from "./kampftisch-model";
import "./tabletop.css";
import "./kampftisch.css";

/**
 * Der Kampftisch — Gegner oben, Gefährten unten, jede Figur eine Karte mit allen Balken.
 *
 * Die abstrakte Schwester der Szenenkarte: kein Gelände, keine Koordinaten, nur wer liegt wo und
 * wer ist dran. Die Reihenfolge und alles, was die Runde sieht, kommt vom Server; diese Fläche
 * sortiert nichts nach und rechnet keine Wortstufe aus. Gäbe es hier eine zweite Rechnung, wäre
 * sie die unzuverlässige — und die, die etwas verrät.
 */
const zustandstext = (zustand: Kampf["zustand"]): string =>
  zustand === "vorbereitet" ? t("Vorbereitet") : zustand === "laufend" ? t("Läuft") : t("Beendet");

export function Kampftisch({ campaignId, gm, actors, revision, onChanged, onOpenInventory }: {
  campaignId: string; gm: boolean; actors: ActorCard[]; revision: number; onChanged: () => void; onOpenInventory?: (actorId: string) => void;
}) {
  const kaempfe = useResource<Kampf[]>(apiPath(campaignId, "/kaempfe"), revision, 4000);
  // Dieselbe Wurfliste wie im Reiter „Aktionen“ — kein zweiter Kanal für dieselbe Sache.
  const wuerfe = useResource<ActionCard[]>(gm ? apiPath(campaignId, "/rolls") : null, revision, 6000);
  const vorlagen = useResource<TemplateCard<ActorTemplateData>[]>(gm ? apiPath(campaignId, "/actor-templates") : null, revision);
  const [offen, setOffen] = useState(""), [vorschau, setVorschau] = useState(false);
  const task = useTask();
  const liste = kaempfe.data ?? [];
  // Ohne eigene Wahl steht der jüngste nicht beendete Kampf vorn — der, um den es gerade geht.
  const gewaehlt = liste.find(k => k.id === offen) ?? liste.find(k => k.zustand === "laufend") ?? liste.find(k => k.zustand !== "beendet") ?? liste[0];
  const alsRunde = useResource<KampfFuerRunde>(gm && vorschau && gewaehlt ? apiPath(campaignId, `/kaempfe/${encodeURIComponent(gewaehlt.id)}/als-runde`) : null, revision);

  const fuehren = (pfad: string, body?: unknown, method: "POST" | "PUT" | "DELETE" = "POST") => void task.run(async () => {
    // Auch ein abgewiesener Befehl lädt neu: wer einen alten Stand hatte, sieht danach den neuen.
    try { await api(apiPath(campaignId, pfad), method === "DELETE" ? { method } : { method, body: body ?? {} }); }
    finally { onChanged(); }
  });

  return <div className="kampftisch">
    <div className="page-heading kampftisch-seitenkopf">
      <div><p className="eyebrow">{t("Wer ist dran")}</p><h2>{t("Der Kampftisch")}</h2>
        <p className="muted">{t("Gegner oben, Gefährten unten, jede Figur eine Karte. Für Gelände und Marken ist die Szenenkarte nebenan zuständig.")}</p></div>
      {gm ? <NeuerKampf campaignId={campaignId} onAngelegt={id => { setOffen(id); onChanged(); }} /> : null}
    </div>
    {task.error ? <Notice error>{task.status === 409 ? t("Das hat sich inzwischen geändert — hier ist der neue Stand.") : task.error}</Notice> : null}
    {kaempfe.error ? <Notice error>{kaempfe.error}</Notice> : null}

    {liste.length > 1 ? <div className="kampf-wahl" role="tablist" aria-label={t("Kämpfe dieser Runde")}>
      {liste.map(k => <button key={k.id} type="button" role="tab" aria-selected={k.id === gewaehlt?.id}
        className={k.id === gewaehlt?.id ? "kampf-reiter aktiv" : "kampf-reiter"} onClick={() => setOffen(k.id)}>
        {k.name}<small>{zustandstext(k.zustand)}</small></button>)}
    </div> : null}

    {kaempfe.loading && !kaempfe.data ? <Loading /> : !gewaehlt
      ? <EmptyState title={t("Noch ist es ruhig.")}>{gm
        ? t("Leg einen Kampf an, leg die Kämpfenden auf den Tisch und eröffne. Wer dran ist, führt das Programm danach für dich.")
        : t("Sobald deine Spielleitung einen Kampf eröffnet, siehst du hier, wer wann dran ist.")}</EmptyState>
      : <Tisch kampf={gewaehlt} vorschau={vorschau ? alsRunde.data : null} vorschauAn={vorschau} gm={gm} busy={task.busy}
          campaignId={campaignId} actors={actors} vorlagen={vorlagen.data ?? []} wuerfe={wuerfe.data ?? []} fuehren={fuehren}
          onVorschau={gm ? () => setVorschau(an => !an) : null} onChanged={onChanged} onOpenInventory={onOpenInventory} />}
  </div>;
}

function Tisch({ kampf, vorschau, vorschauAn, gm, busy, campaignId, actors, vorlagen, wuerfe, fuehren, onVorschau, onChanged, onOpenInventory }: {
  kampf: Kampf; vorschau: KampfFuerRunde | null; vorschauAn: boolean; gm: boolean; busy: boolean; campaignId: string;
  actors: readonly ActorCard[]; vorlagen: readonly TemplateCard<ActorTemplateData>[]; wuerfe: readonly ActionCard[];
  fuehren: (pfad: string, body?: unknown, method?: "POST" | "PUT" | "DELETE") => void; onVorschau: (() => void) | null;
  onChanged: () => void; onOpenInventory?: ((actorId: string) => void) | undefined;
}) {
  const [beenden, setBeenden] = useState(false);
  const leitung = istLeitungssicht(kampf) && !vorschau;
  const karten: KartenAnsicht[] = vorschau ? vorschau.teilnehmer.map(ansichtFuerRunde)
    : istLeitungssicht(kampf) ? kampf.teilnehmer.map(ansichtFuerLeitung) : kampf.teilnehmer.map(ansichtFuerRunde);
  const dran = karten.find(k => k.amZug) ?? null;
  const pfad = `/kaempfe/${encodeURIComponent(kampf.id)}`, teil = (id: string) => `${pfad}/teilnehmer/${encodeURIComponent(id)}`;
  const bildUrl = (karteId: string, version: number) => apiPath(campaignId, `${teil(karteId)}/bild?v=${version}`);
  const angelegt = istLeitungssicht(kampf) ? kampf.teilnehmer.filter(k => k.vomKampfAngelegt && k.actorId !== null).length : 0;
  const aktionen: KartenAktionen = {
    lage: (karte, lage) => fuehren(`${teil(karte.id)}/lage`, { lage, expectedVersion: karte.version }),
    sicht: (karte, sicht, nameFuerRunde) => fuehren(`${teil(karte.id)}/sicht`, { sicht, nameFuerRunde, expectedVersion: karte.version }),
    maske: (karte, vital, maske) => fuehren(`${teil(karte.id)}/sicht`, {
      sicht: { ...karte.sicht, balken: { ...karte.sicht.balken, [vital]: maske } }, nameFuerRunde: karte.nameFuerRunde, expectedVersion: karte.version }),
    initiative: (karte, initiative, initiativeRollId) => fuehren(`${teil(karte.id)}/initiative`, { initiative, initiativeRollId }),
    loeschen: karte => fuehren(teil(karte.id), undefined, "DELETE"),
    wert: (actorId, vital, wert, expectedVersion) =>
      fuehren(`/actors/${encodeURIComponent(actorId)}/sheet/vitals/${encodeURIComponent(vital)}`, { wert, expectedVersion }, "PUT"),
    ...(onOpenInventory ? { inventar: onOpenInventory } : {}),
  };
  const zeige = (karte: KartenAnsicht, klein = false) => <li key={karte.id}><Kampfkarte karte={karte} leitung={leitung} klein={klein} busy={busy}
    aktionen={aktionen} bildUrl={bildUrl} wurf={leitung ? juengsterInitiativwurf(wuerfe, karte.roh?.actorId ?? null) : null} /></li>;
  const alleReihen = reihen(karten), oben = alleReihen.filter(r => r.seite !== "gefaehrten"), unten = alleReihen.filter(r => r.seite === "gefaehrten");
  const reihe = (r: (typeof alleReihen)[number]) => <div key={r.seite} className={`kampftisch-reihe seite-${r.seite}`}>
    <h4 className="kampftisch-reihe-kopf">{t(SEITE_LABEL[r.seite])}</h4><ul className="kampftisch-karten">{r.karten.map(k => zeige(k))}</ul></div>;
  const hand = karten.filter(k => k.lage === "hand"), ablage = karten.filter(k => k.lage === "ablage");

  return <section className="kampftisch-tafel">
    <header className="panel kampftisch-kopf">
      <div><h3>{kampf.name}</h3><p className="muted">{zustandstext(kampf.zustand)}{kampf.runde > 0 ? ` · ${t("Runde {n}", { n: kampf.runde })}` : ""}</p></div>
      <p className="kampftisch-dran" aria-live="polite">{dran ? <><span className="muted">{t("Am Zug")}</span><strong>{dran.name}</strong></>
        : kampf.zustand === "beendet" ? <span className="muted">{t("Der Kampf ist vorbei.")}</span>
        : kampf.zustand === "laufend" ? <span className="muted">{t("Niemand ist am Zug. Die nächste Karte, die aufs Feld kommt, beginnt.")}</span>
        : <span className="muted">{t("Noch nicht eröffnet.")}</span>}</p>
      {gm ? <div className="button-row">
        {leitung && kampf.zustand === "vorbereitet" ? <Button variant="primary" disabled={busy || !karten.some(k => k.lage === "feld")}
          onClick={() => fuehren(`${pfad}/eroeffnen`)}><Swords size={16} /> {t("Eröffnen")}</Button> : null}
        {leitung && kampf.zustand === "laufend" && dran ? <Button variant="primary" disabled={busy}
          onClick={() => fuehren(`${pfad}/zug`, { von: dran.id, runde: kampf.runde })}><ChevronRight size={16} /> {t("Nächster Zug")}</Button> : null}
        {onVorschau ? <Button aria-pressed={vorschauAn} onClick={onVorschau}><Eye size={16} /> {t("Mit den Augen der Runde")}</Button> : null}
        {leitung && kampf.zustand !== "beendet" ? <span className="kampf-anker">
          <Button disabled={busy} onClick={() => setBeenden(true)}><Flag size={16} /> {t("Beenden")}</Button>
          {beenden ? <BeendenRueckfrage angelegt={angelegt} onClose={() => setBeenden(false)}
            onBeenden={archivieren => { setBeenden(false); fuehren(`${pfad}/beenden`, { archivieren }); }} /> : null}</span> : null}
      </div> : null}
    </header>
    {vorschauAn ? <p className="kampftisch-vorschau" role="status">{t("So sieht die Runde den Tisch gerade. Deine Hand, die Ablage und verborgene Werte fehlen dort ganz, und nichts verrät, dass etwas fehlt.")}</p> : null}
    <div className={leitung ? "kampftisch-flaeche mit-leiste" : "kampftisch-flaeche"}>
      <div className="tabletop-furniture kampftisch-holz"><section className="tabletop-felt kampftisch-filz" aria-label={t("Spieltisch")}>
        {!oben.length && !unten.length
          ? <p className="kampftisch-leer">{leitung ? t("Noch liegt keine Karte auf dem Feld. Stell Kämpfende auf oder spiel eine aus deiner Hand aus.") : t("Die Spielleitung stellt gerade auf.")}</p>
          : <>{oben.map(reihe)}
            <div className="kampftisch-mitte">{kampf.runde > 0 ? t("Runde {n}", { n: kampf.runde }) : t("Noch nicht eröffnet.")}</div>
            {unten.map(reihe)}</>}
      </section></div>
      {leitung ? <aside className="kampftisch-leiste" aria-label={t("Nur für dich sichtbar")}>
        <section className="kampftisch-fach"><h4>{t("Deine Hand")} <small>{t("nur du siehst sie")}</small></h4>
          <p className="field-help">{t("Verdeckte Karten sind noch nicht im Spiel und kommen nicht an die Reihe. Spiel sie aus, wenn es so weit ist.")}</p>
          {hand.length ? <ul className="kampftisch-hand">{hand.map(k => zeige(k, true))}</ul> : <p className="muted">{t("Keine verdeckten Karten.")}</p>}
        </section>
        <section className="kampftisch-fach"><h4>{t("Ablage")} <small>{t("vom Feld genommen")}</small></h4>
          {ablage.length ? <ul className="kampftisch-ablage">{ablage.map(k => <li key={k.id}><span>{k.name}</span><span className="button-row">
            <Button variant="quiet" disabled={busy} onClick={() => aktionen.lage(k.roh!, "hand")}>{t("In die Hand")}</Button>
            <Button variant="quiet" disabled={busy} onClick={() => aktionen.lage(k.roh!, "feld")}>{t("Aufs Feld")}</Button></span></li>)}</ul>
            : <p className="muted">{t("Leer.")}</p>}
        </section>
        {kampf.zustand !== "beendet" ? <KampfAufnahme campaignId={campaignId} kampfId={kampf.id} actors={actors} vorlagen={vorlagen} wuerfe={wuerfe} onChanged={onChanged} /> : null}
      </aside> : null}
    </div>
  </section>;
}

function NeuerKampf({ campaignId, onAngelegt }: { campaignId: string; onAngelegt: (id: string) => void }) {
  const [name, setName] = useState(""), task = useTask();
  return <form className="kampf-neu" onSubmit={event => { event.preventDefault(); void task.run(async () => {
    const kampf = await api<{ id: string }>(apiPath(campaignId, "/kaempfe"), { method: "POST", body: { name } });
    setName(""); onAngelegt(kampf.id);
  }); }}>
    <label className="sr-only" htmlFor="kampf-name">{t("Name des Kampfes")}</label>
    <input id="kampf-name" value={name} onChange={event => setName(event.target.value)} required maxLength={160} placeholder={t("z. B. Der Hinterhalt am Pass")} />
    <Button type="submit" variant="primary" disabled={task.busy || !name.trim()}><Plus size={16} /> {t("Kampf anlegen")}</Button>
    {task.error ? <Notice error>{task.error}</Notice> : null}
  </form>;
}
```

In `packages/client/src/features/TableView.tsx`:

- Z. 16 `import { Kampfbuehne } from "./Kampfbuehne";` wird `import { Kampftisch } from "./Kampftisch";`.
- In Z. 71 wird `<Kampfbuehne onOpenInventory=…` zu `<Kampftisch onOpenInventory=…`. Die Props bleiben gleich.

Dann `git rm packages/client/src/features/Kampfbuehne.tsx packages/client/src/features/kampfbuehne.css`.

- [ ] **Step 10: Write the styles**

In `packages/client/src/features/tabletop.css`:

- `.tabletop-furniture { … }` bekommt als erste Eigenschaft `--tisch-beschriftung: #f0dcc0;`.
- In `.tabletop-rail` und `.tabletop-rail .eyebrow` wird `color: #f0dcc0` jeweils zu `color: var(--tisch-beschriftung)`.

So gibt es die Schriftfarbe auf Holz und Filz genau einmal.

`packages/client/src/features/kampftisch.css`:

```css
/* SPDX-License-Identifier: BUSL-1.1
   Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. */
/* Der Kampftisch. Holz und Filz sind derselbe Tisch wie im Reiter „Spieltisch" (tabletop.css) —
   ein Gegenstand, der in jedem Look gleich bleibt. Alles, was darauf liegt, folgt dem Look: hier
   stehen nur Farbwerte der Looks, keine fest verdrahtete Farbe und keine Ersatzwerte. */
.kampftisch { display: grid; gap: 1rem; }
.kampftisch-seitenkopf { align-items: end; gap: 1rem; flex-wrap: wrap; }
.kampf-neu { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
.kampf-neu input { min-inline-size: 16rem; }
.kampf-wahl { display: flex; gap: .35rem; flex-wrap: wrap; }
.kampf-reiter { display: grid; gap: .1rem; text-align: start; padding: .4rem .7rem; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); color: inherit; cursor: pointer; }
.kampf-reiter small { color: var(--text-muted); font-size: .75rem; }
.kampf-reiter.aktiv { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }

.kampftisch-tafel { display: grid; gap: 1rem; }
.kampftisch-kopf { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; }
.kampftisch-kopf h3 { margin: 0; }
/* Die eine Aussage, für die die Fläche existiert: wer ist dran. Sie darf nicht klein sein. */
.kampftisch-dran { display: grid; justify-items: center; gap: .1rem; margin: 0; }
.kampftisch-dran .muted { font-size: .74rem; letter-spacing: .1em; text-transform: uppercase; }
.kampftisch-dran strong { font-family: var(--font-display); font-size: 1.45rem; line-height: 1.1; color: var(--accent-strong); }
.kampftisch-vorschau { margin: 0; padding: .55rem .9rem; border-radius: var(--radius); background: var(--info-soft); color: var(--info); border: 1px solid color-mix(in srgb, var(--info) 45%, transparent); }

.kampftisch-flaeche { display: grid; gap: 1rem; align-items: start; }
.kampftisch-flaeche.mit-leiste { grid-template-columns: minmax(0, 1fr) minmax(15rem, 18rem); }
.kampftisch-holz { margin-block-end: 1.4rem; }
/* Derselbe Filz, aber eine Spalte: die Würfelschale des Spieltischs gibt es hier nicht. */
.kampftisch-filz.tabletop-felt { grid-template-columns: minmax(0, 1fr); gap: 1.1rem; padding: 1.3rem 1.1rem 1.5rem; }
.kampftisch-reihe { display: grid; gap: .45rem; }
.kampftisch-reihe-kopf { display: flex; align-items: center; gap: .5rem; margin: 0; font: 600 .72rem var(--font-body); letter-spacing: .14em; text-transform: uppercase; color: var(--tisch-beschriftung); }
.kampftisch-reihe-kopf::before { content: ""; inline-size: .6rem; block-size: .6rem; border-radius: 2px; background: var(--seite-farbe); }
.kampftisch-karten { list-style: none; margin: 0; padding: .7rem 0 .2rem; display: flex; flex-wrap: wrap; gap: .9rem; justify-content: center; }
.kampftisch-mitte { display: flex; align-items: center; gap: .8rem; color: var(--tisch-beschriftung); font-family: var(--font-display); letter-spacing: .1em; font-size: .85rem; }
.kampftisch-mitte::before, .kampftisch-mitte::after { content: ""; flex: 1; block-size: 1px; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--tisch-beschriftung) 55%, transparent), transparent); }
.kampftisch-leer { margin: 1.5rem auto; max-inline-size: 30rem; text-align: center; color: var(--tisch-beschriftung); }

.seite-gegner { --seite-farbe: var(--danger); --seite-weich: var(--danger-soft); }
.seite-gefaehrten { --seite-farbe: var(--accent); --seite-weich: var(--accent-soft); }
.seite-neutral { --seite-farbe: var(--line-strong); --seite-weich: var(--surface-hover); }

/* Die Karte */
.kampfkarte { position: relative; inline-size: 11.5rem; display: grid; gap: .45rem; padding: 0 0 .6rem; border-radius: calc(var(--radius) - 2px);
  background: linear-gradient(170deg, var(--surface-2), var(--surface)); border: 1px solid var(--line-strong); color: var(--text); box-shadow: var(--shadow-2);
  transition: transform var(--panel-motion) var(--motion-easing), box-shadow var(--panel-motion) var(--motion-easing), opacity var(--panel-motion) var(--motion-easing); }
.kampfkarte::before { content: ""; position: absolute; inset: 0 0 auto; block-size: 4px; border-start-start-radius: inherit; border-start-end-radius: inherit; background: var(--seite-farbe); }
.kampfkarte-bild { margin: 4px 4px 0; aspect-ratio: 16 / 10; overflow: hidden; display: grid; place-items: center; border-radius: calc(var(--radius) - 5px); border: 1px solid var(--line);
  background: radial-gradient(90% 90% at 50% 35%, color-mix(in srgb, var(--seite-farbe) 30%, var(--seite-weich)), var(--seite-weich) 75%); }
.kampfkarte-bild img { inline-size: 100%; block-size: 100%; object-fit: cover; display: block; }
.kampfkarte-monogramm { font-family: var(--font-display); font-size: 2.1rem; color: color-mix(in srgb, var(--seite-farbe) 75%, var(--text)); }
.kampfkarte-siegel { position: absolute; inset-block-start: -.55rem; inset-inline-start: -.55rem; z-index: 2; inline-size: 2.3rem; block-size: 2.3rem; border-radius: 50%;
  display: grid; place-items: center; font: 700 .95rem var(--font-mono); background: var(--bg-deep); color: var(--text); border: 2px solid var(--seite-farbe); box-shadow: var(--shadow-1); }
.kampfkarte-menue-ort { position: absolute; inset-block-start: .35rem; inset-inline-end: .35rem; z-index: 4; }
.kampfkarte-menue { inline-size: 1.9rem; block-size: 1.9rem; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface) 85%, transparent); color: var(--text); cursor: pointer; }
.kampfkarte-name { margin: 0; padding: 0 .65rem; font-family: var(--font-display); font-size: 1rem; line-height: 1.2; overflow-wrap: anywhere; }
.kampfkarte-name small { display: block; font-family: var(--font-body); font-size: .68rem; color: var(--text-faint); }
.kampfkarte-balken { display: grid; gap: .4rem; padding: 0 .65rem; }
.kampfkarte-ohne { margin: 0; padding: 0 .65rem; font-size: .74rem; font-style: italic; color: var(--text-faint); }
.kampfkarte-zustaende { list-style: none; margin: 0; padding: 0 .65rem; display: flex; flex-wrap: wrap; gap: .25rem; }
.kampfkarte-zustaende li { font-size: .66rem; padding: .08rem .42rem; border-radius: 999px; background: var(--surface-hover); color: var(--text-muted); border: 1px solid var(--line); }
.kampfkarte-hinweis { margin: 0 .5rem; padding: .4rem .5rem; display: grid; gap: .3rem; justify-items: start; border-radius: 6px; font-size: .74rem;
  background: var(--danger-soft); color: var(--danger); border: 1px solid color-mix(in srgb, var(--danger) 40%, transparent); }
.kampfkarte-fuss { margin: 0; padding: 0 .65rem; font-size: .66rem; letter-spacing: .06em; text-transform: uppercase; color: var(--text-faint); }
.kampfkarte-verdeckt { display: inline-flex; gap: .25rem; align-items: center; margin: 0 .55rem; font-size: .64rem; letter-spacing: .08em; text-transform: uppercase; color: var(--text-faint); }
.kampfkarte-beleg { letter-spacing: .04em; text-transform: uppercase; font-size: .68rem; color: var(--text-muted); }
/* Am Zug, umgelegt, deine Figur: jedes Mal auch als WORT, nie nur als Farbe. */
.kampfkarte-marke { position: absolute; inset-block-start: -.75rem; inset-inline-start: 50%; transform: translateX(-50%); z-index: 3; padding: .1rem .55rem; border-radius: 999px; white-space: nowrap;
  font-size: .64rem; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; background: var(--accent); color: var(--accent-ink); }
.kampfkarte-eigene { position: absolute; inset-block-start: -.7rem; inset-inline-end: .6rem; z-index: 3; padding: .08rem .5rem; border-radius: 999px; font-size: .64rem;
  letter-spacing: .08em; text-transform: uppercase; background: var(--private-soft); color: var(--private); border: 1px solid var(--private); }
.kampfkarte-stempel { position: absolute; inset-block-start: 34%; inset-inline-start: 50%; transform: translate(-50%, -50%) rotate(-14deg); z-index: 3; padding: .15rem .6rem; border-radius: 4px;
  border: 2px solid var(--danger); color: var(--danger); background: color-mix(in srgb, var(--surface) 82%, transparent); font: 700 .82rem var(--font-display); letter-spacing: .14em; text-transform: uppercase; }
.kampfkarte.amzug { transform: translateY(-10px); box-shadow: var(--shadow-3), 0 0 0 2px var(--accent), 0 0 26px color-mix(in srgb, var(--accent) 35%, transparent); }
.kampfkarte.umgelegt { transform: rotate(-5deg) translateY(6px); opacity: .78; filter: grayscale(.85); }
.kampfkarte.eigene { border-color: var(--private); }
.kampfkarte.klein { inline-size: 7.6rem; gap: .3rem; }
.kampfkarte.klein .kampfkarte-name { font-size: .82rem; }
.kampfkarte.klein .kampfkarte-bild { aspect-ratio: 16 / 9; }
.kampfkarte.klein .kampfkarte-monogramm { font-size: 1.4rem; }
.kampfkarte.klein .kampfkarte-siegel { inline-size: 1.9rem; block-size: 1.9rem; font-size: .8rem; }

/* Balken */
.kampf-balken { display: grid; gap: .18rem; }
.kampf-balken[data-farbe="danger"] { --balken-farbe: var(--danger); }
.kampf-balken[data-farbe="info"] { --balken-farbe: var(--info); }
.kampf-balken[data-farbe="ok"] { --balken-farbe: var(--ok); }
.kampf-balken[data-farbe="warning"] { --balken-farbe: var(--warning); }
.kampf-balken[data-farbe="private"] { --balken-farbe: var(--private); }
.kampf-balken-kopf { display: flex; align-items: center; gap: .3rem; font-size: .74rem; }
.kampf-balken-name { color: var(--text-muted); }
.kampf-balken-wert, .kampf-balken-wort { margin-inline-start: auto; }
.kampf-balken-wert { font-family: var(--font-mono); font-size: .76rem; }
button.kampf-balken-wert { border: 0; background: none; color: inherit; padding: 0 .15rem; border-radius: 4px; cursor: pointer; text-decoration: underline dotted var(--line-strong); text-underline-offset: 3px; }
.kampf-balken-wort { font-size: .78rem; font-weight: 600; color: var(--balken-farbe); }
.kampf-auge { inline-size: 1.35rem; block-size: 1.35rem; display: grid; place-items: center; padding: 0; border: 1px solid var(--line); border-radius: 5px; background: var(--input-bg); color: var(--text-muted); cursor: pointer; }
.kampf-auge[data-maske="worte"], .kampf-auge[data-maske="fuellstand"] { color: var(--warning); border-color: color-mix(in srgb, var(--warning) 50%, var(--line)); }
.kampf-auge[data-maske="verborgen"] { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 50%, var(--line)); }
.kampf-spur { position: relative; block-size: .5rem; overflow: hidden; border-radius: 999px; background: var(--input-bg); border: 1px solid var(--line); }
.kampf-spur > span { position: absolute; inset: 0 auto 0 0; border-radius: inherit; background: var(--balken-farbe); transition: inline-size var(--panel-motion) var(--motion-easing); }
/* Nur Füllstand: die Zehntel bleiben sichtbar, damit niemand eine Genauigkeit liest, die es nicht gibt. */
.kampf-spur.in-zehnteln { background-image: repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), var(--line) calc(10% - 1px) 10%); }
.kampf-balken-runde { margin: 0; font-size: .64rem; color: var(--text-faint); }

/* Schwebende Fenster */
.kampf-anker { position: relative; }
.kampf-schwebe { position: absolute; z-index: 30; inset-block-start: calc(100% + .35rem); inset-inline-end: 0; inline-size: min(18rem, 86vw); display: grid; gap: .5rem; padding: .7rem;
  border-radius: var(--radius); background: var(--surface-2); color: var(--text); border: 1px solid var(--line-strong); box-shadow: var(--shadow-3); text-align: start; }
.kampf-balken > .kampf-schwebe { inset-inline-end: auto; inset-inline-start: 0; }
.kampf-schwebe-kopf { display: flex; justify-content: space-between; align-items: start; gap: .5rem; }
.kampf-schwebe-kopf h4 { margin: 0; font-size: .92rem; }
.kampf-schwebe-zu { border: 0; background: none; color: var(--text-muted); cursor: pointer; padding: .1rem; border-radius: 4px; }
.kampf-schwebe-inhalt { display: grid; gap: .5rem; }
.kampf-schwebe label { display: grid; gap: .2rem; font-size: .78rem; color: var(--text-muted); }
.kampf-schwebe input:not([type="checkbox"]), .kampf-schwebe select { font: inherit; font-size: .88rem; padding: .35rem .5rem; border-radius: 6px; border: 1px solid var(--control-line); background: var(--input-bg); color: var(--text); }
.kampf-option { inline-size: 100%; display: grid; gap: .1rem; text-align: start; padding: .4rem .5rem; border-radius: 6px; border: 1px solid transparent; background: none; color: inherit; cursor: pointer; }
.kampf-option:hover { background: var(--surface-hover); }
.kampf-option[aria-checked="true"] { border-color: var(--accent); background: var(--accent-soft); }
.kampf-option span { font-size: .72rem; color: var(--text-muted); }
.kampf-vorschau { margin: 0; padding: .4rem .5rem; border-radius: 6px; background: var(--input-bg); font-size: .76rem; color: var(--text-muted); }
.kampf-menue { list-style: none; margin: 0; padding: 0; display: grid; gap: .1rem; }
.kampf-menue button { inline-size: 100%; text-align: start; padding: .38rem .5rem; border: 0; border-radius: 6px; background: none; color: inherit; cursor: pointer; font: inherit; font-size: .86rem; }
.kampf-menue button:hover, .kampf-menue button:focus-visible { background: var(--surface-hover); }
.kampf-menue .gefahr { color: var(--danger); }
.kampf-menue-trenner { block-size: 1px; background: var(--line); margin: .2rem 0; }
.kampf-schwebe .kampf-haken, .kampf-aufnahme .kampf-haken { display: flex; gap: .45rem; align-items: center; color: var(--text); font-size: .84rem; }
.kampf-stepper { display: grid; grid-template-columns: repeat(2, 2.3rem) minmax(0, 1fr) repeat(2, 2.3rem); gap: .3rem; }
.kampf-stepper button { padding: .35rem 0; border-radius: 6px; border: 1px solid var(--control-line); background: var(--surface); color: var(--text); cursor: pointer; font-family: var(--font-mono); }
.kampf-stepper input { text-align: center; font-family: var(--font-mono); min-inline-size: 0; }

/* Seitenleiste der Spielleitung */
.kampftisch-leiste { display: grid; gap: .9rem; }
.kampftisch-fach { display: grid; gap: .55rem; padding: .8rem; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); }
.kampftisch-fach h4 { margin: 0; display: flex; justify-content: space-between; align-items: baseline; gap: .5rem; font-size: .95rem; }
.kampftisch-fach h4 small { font-family: var(--font-body); font-weight: 400; font-size: .72rem; color: var(--text-faint); }
.kampftisch-hand { list-style: none; margin: .3rem 0 0; padding: .9rem 0 .4rem; display: flex; justify-content: center; }
.kampftisch-hand > li { margin-inline: -.55rem; transition: transform var(--panel-motion) var(--motion-easing); }
.kampftisch-hand > li:nth-child(odd) { transform: rotate(-6deg); }
.kampftisch-hand > li:nth-child(even) { transform: rotate(5deg) translateY(4px); }
.kampftisch-hand > li:hover, .kampftisch-hand > li:focus-within { transform: translateY(-12px); z-index: 5; }
.kampftisch-ablage { list-style: none; margin: 0; padding: 0; display: grid; gap: .35rem; }
.kampftisch-ablage li { display: flex; justify-content: space-between; align-items: center; gap: .5rem; padding: .35rem .55rem; border: 1px dashed var(--line-strong); border-radius: 6px; font-size: .84rem; }
.kampf-aufnahme h4 { justify-content: flex-start; }
.kampf-aufnahme label { display: grid; gap: .2rem; font-size: .78rem; color: var(--text-muted); }
.kampf-aufnahme-wahl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .25rem; }
.kampf-aufnahme-wahl button { padding: .35rem .2rem; font-size: .74rem; border-radius: 6px; border: 1px solid var(--line-strong); background: var(--surface-2); color: var(--text); cursor: pointer; }
.kampf-aufnahme-wahl button[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); }
.kampf-felder { display: grid; gap: .5rem; grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr)); }
.kampf-wurf { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin: 0; }

@media (max-width: 900px) {
  .kampftisch-flaeche.mit-leiste { grid-template-columns: minmax(0, 1fr); }
  .kampfkarte { inline-size: calc(50% - .5rem); min-inline-size: 9.5rem; }
  .kampftisch-hand { overflow-x: auto; justify-content: flex-start; padding-inline: 1.5rem; }
}
@media (prefers-reduced-motion: reduce) {
  .kampfkarte, .kampftisch-hand > li, .kampf-spur > span { transition: none; }
}
```

Die Regel `.kampfkarte.klein` hat höhere Spezifität als die `.kampfkarte`-Regel im schmalen Bildschirm, deshalb bleiben Handkarten dort klein.

- [ ] **Step 11: Write the render test**

`packages/client/test/kampftisch-render.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { KarteFuerRunde } from "@chronicle/protocol";
import { Kampfkarte } from "../src/features/Kampfkarte";
import { ansichtFuerLeitung, ansichtFuerRunde, type KartenAktionen, type KartenAnsicht } from "../src/features/kampftisch-model";
import { LEITUNGSKARTE, RUNDENKARTE } from "./kampftisch-beispiele";

// Die Karte zeichnet, was sie bekommt. Zwei Dinge muss sie trotzdem richtig machen: der Runde
// nichts zeigen, was nur die Spielleitung bedienen darf, und jeden Zustand als Wort sagen.
const nichts = () => undefined;
const aktionen: KartenAktionen = { lage: nichts, sicht: nichts, maske: nichts, initiative: nichts, loeschen: nichts, wert: nichts };
const zeige = (karte: KartenAnsicht, leitung: boolean) => renderToStaticMarkup(createElement(Kampfkarte,
  { karte, leitung, busy: false, aktionen, bildUrl: (id: string, v: number) => `/bild/${id}?v=${v}`, wurf: null }));

describe("Die Kampfkarte", () => {
  it("zeigt der Spielleitung Wert, Rundensicht, zweiten Namen und das Kartenmenü", () => {
    const html = zeige(ansichtFuerLeitung(LEITUNGSKARTE), true);
    expect(html).toContain("40 / 100");
    expect(html).toContain("Die Runde sieht: schwer angeschlagen");
    expect(html).toContain("Die Runde liest: „Vermummte Gestalt“");
    expect(html).toContain('aria-label="Was mit Graf Veyl geschehen soll"');
    expect(html).toContain("am Zug");
    expect(html).toContain("Blutend");
  });

  it("zeigt der Runde nur das Wort, kein Menü und nie „Ohne Werte“", () => {
    const html = zeige(ansichtFuerRunde(RUNDENKARTE), false);
    expect(html).toContain("schwer angeschlagen");
    expect(html).not.toContain("/ 100");
    expect(html).not.toContain("geschehen soll");
    expect(html).not.toContain("Ohne Werte");
    expect(html).not.toContain("Die Runde sieht");
  });

  it("sagt den Füllstand ohne Zahl und stempelt umgelegte Karten mit Wort", () => {
    const karte: KarteFuerRunde = { ...RUNDENKARTE, lage: "umgelegt", balken: [{ id: "hp", label: "Lebenspunkte", art: "leben", anzeige: "fuellstand", zehntel: 6 }] };
    const html = zeige(ansichtFuerRunde(karte), false);
    expect(html).toContain('aria-valuetext="etwa 6 von 10"');
    expect(html).toContain("umgelegt");
    expect(html).not.toMatch(/\d+ \/ \d+/);
  });

  it("gibt der eigenen Figur eine Marke und einen Knopf für den Wert", () => {
    const eigene: KarteFuerRunde = { ...RUNDENKARTE, name: "Mira", eigene: true, actorId: "a9", bogenVersion: 2,
      balken: [{ id: "hp", label: "Lebenspunkte", art: "leben", anzeige: "genau", wert: 70, hoechst: 100 }] };
    const html = zeige(ansichtFuerRunde(eigene), false);
    expect(html).toContain("Deine Figur");
    expect(html).toContain('aria-label="Lebenspunkte ändern, jetzt 70 / 100"');
  });

  it("zeigt der Spielleitung eine Karte ohne Bogen als „Ohne Werte“ und eine Handkarte als verdeckt", () => {
    expect(zeige(ansichtFuerLeitung({ ...LEITUNGSKARTE, actorId: null, bogenVersion: null, balken: [] }), true)).toContain("Ohne Werte");
    const klein = renderToStaticMarkup(createElement(Kampfkarte, { karte: ansichtFuerLeitung({ ...LEITUNGSKARTE, lage: "hand", amZug: false }), leitung: true, klein: true,
      busy: false, aktionen, bildUrl: () => "", wurf: null }));
    expect(klein).toContain("verdeckt");
  });
});
```

- [ ] **Step 12: Add the English catalogue**

`packages/client/src/i18n/en/kampftisch.json`:

```json
{
  "Aus Vorlage": "From template",
  "Nur Name": "Name only",
  "Genau": "Exact",
  "Nur Füllstand": "Fill level only",
  "In Worten": "In words",
  "Verborgen": "Hidden",
  "Zahl und Balken, zum Beispiel 37 / 100.": "Number and bar, for example 37 / 100.",
  "Der Balken grob in Zehnteln, ohne Zahl.": "The bar in rough tenths, without a number.",
  "Ein Wort wie „angeschlagen“ oder „fast leer“.": "A word such as “hurt” or “almost empty”.",
  "Die Runde sieht diesen Balken gar nicht.": "The group does not see this bar at all.",
  "unversehrt": "unhurt",
  "angeschlagen": "hurt",
  "schwer angeschlagen": "badly hurt",
  "am Boden": "down",
  "voll": "full",
  "gut gefüllt": "well filled",
  "fast leer": "almost empty",
  "leer": "empty",
  "In die Hand (verdecken)": "Into your hand (face down)",
  "Umlegen": "Knock down",
  "Vom Feld nehmen": "Take off the field",
  "Aufstehen lassen": "Let them get up",
  "Aufs Feld (ausspielen)": "Onto the field (play)",
  "In die Ablage": "To the discard pile",
  "Aufs Feld": "Onto the field",
  "In die Hand": "Into your hand",
  "nichts": "nothing",
  "etwa {n} von 10": "about {n} of 10",
  "Was die Runde bei {balken} sieht: {anzeige}": "What the group sees of {balken}: {anzeige}",
  "{balken} ändern, jetzt {wert}": "Change {balken}, now {wert}",
  "Die Runde sieht: {was}": "The group sees: {was}",
  "Deine Figur": "Your character",
  "umgelegt": "knocked down",
  "Was mit {name} geschehen soll": "What should happen to {name}",
  "Die Runde liest: „{name}“": "The group reads: “{name}”",
  "verdeckt": "face down",
  "Ohne Werte": "No values",
  "Zustände": "Conditions",
  "Leben aufgebraucht. Umlegen?": "Life used up. Knock down?",
  "Schließen": "Close",
  "Was sieht die Runde bei „{balken}“?": "What does the group see of “{balken}”?",
  "Anzeige für die Runde": "Display for the group",
  "So sieht es die Runde gerade: {was}": "This is what the group sees right now: {was}",
  "Wer die Figur selbst führt, sieht ihre Werte immer genau.": "Whoever plays the character always sees its exact values.",
  "{balken} ändern": "Change {balken}",
  "{n} abziehen": "Subtract {n}",
  "{n} dazu": "Add {n}",
  "Neuer Wert": "New value",
  "Höchstwert {n}. Der Wert steht im Bogen der Figur; die Karte zeigt ihn nur an.": "Maximum {n}. The value lives on the character sheet; the card only shows it.",
  "Übernehmen": "Apply",
  "Was sieht die Runde?": "What does the group see?",
  "Initiative ändern": "Change initiative",
  "Karte löschen …": "Delete card …",
  "Was sieht die Runde von „{name}“?": "What does the group see of “{name}”?",
  "Name für die Runde": "Name for the group",
  "leer lassen für „{name}“": "leave empty for “{name}”",
  "Bild zeigen": "Show picture",
  "Zustände zeigen": "Show conditions",
  "Alle Balken ohne eigene Einstellung": "All bars without their own setting",
  "Einzelne Balken stellst du am Auge neben dem Balken ein.": "Set single bars with the eye next to the bar.",
  "Initiative von {name}": "Initiative of {name}",
  "Jüngster Initiativwurf dieser Figur:": "Latest initiative roll of this character:",
  "Von Hand gesetzt gilt der Wert als gesetzt, nicht als gewürfelt. Ab dem nächsten Zug gilt die neue Reihenfolge.": "Set by hand, the value counts as set, not rolled. The new order applies from the next turn.",
  "Karte löschen?": "Delete card?",
  "„{name}“ verschwindet ganz vom Tisch, auch aus Hand und Ablage. Das ist für Versehen gedacht; wer nur vom Feld soll, kommt in die Ablage.": "“{name}” disappears from the table entirely, including hand and discard pile. This is meant for mistakes; to just take someone off the field, use the discard pile.",
  "Löschen": "Delete",
  "Kampf beenden?": "End the fight?",
  "Danach ist niemand mehr am Zug, und der Kampf nimmt keine Karten mehr auf.": "Afterwards nobody has the turn, and the fight takes no more cards.",
  "Gegner, die für diesen Kampf angelegt wurden, ins Archiv legen ({n})": "Archive the enemies created for this fight ({n})",
  "Archivieren löscht nichts: Inventar und Beute bleiben an der Figur, und du kannst sie zurückholen.": "Archiving deletes nothing: inventory and loot stay with the character, and you can bring them back.",
  "Woher kommt die Karte?": "Where does the card come from?",
  "Figur wählen": "Choose character",
  "Vorlage": "Template",
  "Vorlage wählen": "Choose template",
  "Anzahl": "Number",
  "Noch keine Figurvorlage. Lege in der Schmiede eine an, zum Beispiel „Wolf“; danach stellst du hier mehrere auf einmal auf.": "No character template yet. Create one in the forge, for example “Wolf”; then you can place several at once here.",
  "Name (leer lassen für den Namen der Vorlage)": "Name (leave empty for the template's name)",
  "z. B. Einstürzende Decke": "e.g. Collapsing ceiling",
  "Wohin?": "Where to?",
  "Gleich aufs Feld": "Straight onto the field",
  "Verdeckt in deine Hand": "Face down into your hand",
  "Legt „{name} 1“ bis „{name} {n}“ als eigene Figuren an. Nur du siehst sie in der Figurenliste.": "Creates “{name} 1” to “{name} {n}” as characters of their own. Only you see them in the character list.",
  "Legt „{name}“ als eigene Figur an. Nur du siehst sie in der Figurenliste.": "Creates “{name}” as a character of its own. Only you see it in the character list.",
  "Auf den Tisch legen": "Put on the table",
  "Der Kampftisch": "The combat table",
  "Gegner oben, Gefährten unten, jede Figur eine Karte. Für Gelände und Marken ist die Szenenkarte nebenan zuständig.": "Enemies at the top, companions at the bottom, every character a card. The scene map next door handles terrain and tokens.",
  "Kampf anlegen": "Create fight",
  "Leg einen Kampf an, leg die Kämpfenden auf den Tisch und eröffne. Wer dran ist, führt das Programm danach für dich.": "Create a fight, put the combatants on the table and open it. From then on the program keeps track of whose turn it is.",
  "Das hat sich inzwischen geändert — hier ist der neue Stand.": "That has changed in the meantime — here is the current state.",
  "Niemand ist am Zug. Die nächste Karte, die aufs Feld kommt, beginnt.": "Nobody has the turn. The next card that comes onto the field goes first.",
  "Mit den Augen der Runde": "Through the group's eyes",
  "So sieht die Runde den Tisch gerade. Deine Hand, die Ablage und verborgene Werte fehlen dort ganz, und nichts verrät, dass etwas fehlt.": "This is how the group sees the table right now. Your hand, the discard pile and hidden values are missing entirely, and nothing gives away that anything is missing.",
  "Noch liegt keine Karte auf dem Feld. Stell Kämpfende auf oder spiel eine aus deiner Hand aus.": "No card is on the field yet. Place combatants or play one from your hand.",
  "Nur für dich sichtbar": "Visible only to you",
  "Deine Hand": "Your hand",
  "nur du siehst sie": "only you see it",
  "Verdeckte Karten sind noch nicht im Spiel und kommen nicht an die Reihe. Spiel sie aus, wenn es so weit ist.": "Face-down cards are not in play yet and do not get a turn. Play them when the time comes.",
  "Keine verdeckten Karten.": "No face-down cards.",
  "Ablage": "Discard pile",
  "vom Feld genommen": "taken off the field",
  "Leer.": "Empty."
}
```

In `packages/client/src/i18n.ts` in `textDateien` als erste Zeile ergänzen: `() => import("./i18n/en/kampftisch.json"),`.

- [ ] **Step 13: Run tests, parse and build**

Run: `npx vitest run packages/client/test/kampftisch-model.test.ts packages/client/test/kampftisch-render.test.ts packages/client/test/vitalanzeige.test.ts packages/client/test/navigation-integration-review.test.ts`
Expected: PASS.

Run: `npm run build`
Expected: Typprüfung und Vite-Build grün. Das ist der einzige Compiler über `packages/client`.

Run: `npm run gate:sprache`
Expected: Das Gate darf hier noch „verwaist“ für die alten Sätze der Kampfbühne in `P3.json` und „uneinheitlich“ für Doppelungen melden. Beides bereinigt Aufgabe 9. Es darf **kein** „fehlend“ und kein „nicht-literal“ melden. Kommt eines davon, jetzt beheben.

- [ ] **Step 14: Commit**

```bash
git add -- packages/client/src/features/kampftisch-model.ts packages/client/src/features/KampfBalken.tsx packages/client/src/features/Kampfkarte.tsx packages/client/src/features/KampfFenster.tsx packages/client/src/features/KampfAufnahme.tsx packages/client/src/features/Kampftisch.tsx packages/client/src/features/kampftisch.css packages/client/src/features/tabletop.css packages/client/src/features/TableView.tsx packages/client/src/i18n/en/kampftisch.json packages/client/src/i18n.ts packages/client/test/kampftisch-beispiele.ts packages/client/test/kampftisch-model.test.ts packages/client/test/kampftisch-render.test.ts
git rm --cached --quiet packages/client/src/features/Kampfbuehne.tsx packages/client/src/features/kampfbuehne.css 2>/dev/null || true
git commit -m "feat(kampf): der Kampftisch — Karten mit Balken, Hand, Ablage und Einstellungen der Spielleitung

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

`git status --short` muss danach die beiden gelöschten Dateien nicht mehr zeigen, und `git show --stat HEAD` muss sie als gelöscht führen.

---

### Task 9: Sprache und Klartext

**Files:**

- Create: `packages/client/test/kampftisch-klartext.test.ts`, `packages/client/test/sprache-kampftisch.test.ts`
- Modify: `packages/client/src/i18n/en/P3.json` (verwaiste Sätze der alten Kampfbühne entfernen)
- Modify: `packages/client/src/i18n/en/kampftisch.json` (Sätze entfernen, die ein anderer Katalog schon führt)
- Modify: `packages/client/test/sprache-P3.test.ts` (die Stichprobe `t("Die Kampfbühne")` entfernen, falls der Satz verwaist)

**Interfaces:**

- Consumes: alle Anzeigetabellen und Komponenten aus Task 8.
- Produces: grünes `npm run gate:sprache`; ein Klartext-Wächter über die sechs neuen Oberflächendateien.

- [ ] **Step 1: Write the failing tests**

`packages/client/test/kampftisch-klartext.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Am Tisch sitzt eine Spielleitung, kein Entwickler (Kayas Klartext-Regel). Diese Wörter stehen
// in Code, Tests und Spezifikation — nie in dem, was die Oberfläche zeigt.
const FILES = ["Kampftisch.tsx", "Kampfkarte.tsx", "KampfBalken.tsx", "KampfFenster.tsx", "KampfAufnahme.tsx", "kampftisch-model.ts"];
const FORBIDDEN = /\b(projektion\w*|masken?\w*|payload|nutzlast|fingerabdruck|schema\w*|server|token|kennung\w*|actor\w*|vitalwert\w*|sheet|json|id)\b/i;
/** Sichtbarer Text: JSX-Textknoten, beschriftende Eigenschaften und jede Zeichenkette mit Leerzeichen außerhalb von className. */
function visibleStrings(source: string): string[] {
  const out: string[] = [];
  for (const match of source.matchAll(/>([^<>{}\n]+)</g)) out.push(match[1]!);
  for (const match of source.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)) {
    const before = source.slice(Math.max(0, match.index! - 24), match.index!);
    if (/\bclass(?:Name)?\s*=\s*\{?\s*$/.test(before)) continue;
    const content = match[2]!.replace(/\$\{[^}]*\}/g, " ");
    if (content.includes(" ")) out.push(content);
  }
  // Wege zum Server (`/actors/…/sheet/…`) sind keine Anzeige, auch wenn nach dem Ausblenden der
  // Platzhalter ein Leerzeichen darin steht.
  return out.map(s => s.trim()).filter(s => s.length > 2 && !/^[;,:)}\]]/.test(s) && !s.startsWith("/"));
}
describe("Klartext am Kampftisch", () => {
  it.each(FILES)("%s zeigt kein Fachwort", file => {
    const hits = visibleStrings(readFileSync(new URL(`../src/features/${file}`, import.meta.url), "utf8")).filter(text => FORBIDDEN.test(text));
    expect(hits, hits.join("\n")).toEqual([]);
  });
  it("beißt selbst", () => {
    expect(visibleStrings('return <p>Die Maske liegt in der Nutzlast.</p>;').filter(text => FORBIDDEN.test(text))).toHaveLength(1);
  });
});
```

`packages/client/test/sprache-kampftisch.test.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { beforeEach, describe, expect, it } from "vitest";
import { setzeEnglischeQuelleFuerTests, setzeSprache, t, type PluralFormen } from "../src/i18n.ts";
import KAMPFTISCH from "../src/i18n/en/kampftisch.json";
import P3 from "../src/i18n/en/P3.json";
import PLURAL from "../src/i18n/en.plural.json";
import { MASKE_LABEL, WORT_LEBEN_LABEL } from "../src/features/kampftisch-model";

// Geladen wird der echte Katalog, nicht ein Auszug: ein umformulierter Satz fällt hier auf.
const katalog = { texte: { ...(P3 as Record<string, string>), ...(KAMPFTISCH as Record<string, string>) }, plural: PLURAL as unknown as Record<string, PluralFormen> };

describe("Sprachpaket Kampftisch", () => {
  beforeEach(async () => { setzeEnglischeQuelleFuerTests(async () => katalog); await setzeSprache("de"); });
  it("bleibt deutsch, solange Deutsch gewählt ist", () => {
    expect(t("Der Kampftisch")).toBe("Der Kampftisch");
    expect(t(MASKE_LABEL.worte)).toBe("In Worten");
  });
  it("übersetzt nach Englisch", async () => {
    await setzeSprache("en");
    expect(t("Der Kampftisch")).toBe("The combat table");
    expect(t(MASKE_LABEL.worte)).toBe("In words");
    expect(t(WORT_LEBEN_LABEL.knapp)).toBe("badly hurt");
    expect(t("etwa {n} von 10", { n: 6 })).toBe("about 6 of 10");
  });
});
```

Stehen einzelne Sätze (zum Beispiel „Übernehmen“) nach Step 3 in einem anderen Katalog statt in `kampftisch.json`, bleibt der Test richtig, solange der Satz in P3 oder `kampftisch.json` steht. Sonst den betreffenden Katalog zusätzlich in `katalog.texte` einmischen.

- [ ] **Step 2: Run tests**

Run: `npx vitest run packages/client/test/kampftisch-klartext.test.ts packages/client/test/sprache-kampftisch.test.ts`
Expected: Der Klartext-Wächter ist PASS. Ist er rot, den sichtbaren Satz in Alltagsdeutsch umformulieren und seinen Katalogeintrag mitziehen, den alten löschen. Der Sprachtest ist PASS.

- [ ] **Step 3: Clean up the catalogues until the gate is green**

Run: `npm run gate:sprache`

Nach der Ausgabe vorgehen:

- **„verwaist“ in `P3.json`:** Den Eintrag löschen, wenn er von der alten Kampfbühne stammt („Die Kampfbühne“, „Zwei Reihen, eine Reihenfolge. …“, „{name} von der Bühne nehmen“, „Ohne Bogen“, „Ohne Bogen (Gegner, Tier, Ding)“, „Aus einem Wurf“, „Von der Spielleitung gesetzt“, „Bühne aufstellen“, „Stell eine Bühne auf, …“, „Die Bühne ist leer.“, „Setz die erste Kämpfende darauf. …“, „z. B. Wolf im Unterholz“, „Auf die Bühne stellen“, „Für diese Figur liegt noch kein Initiativwurf vor; …“).
- **Stichprobe in `sprache-P3.test.ts`:** Entfällt „Die Kampfbühne“, beide Zeilen mit `t("Die Kampfbühne")` dort streichen und den Kommentar „Kampfbuehne“ in „Kampftisch (siehe sprache-kampftisch.test.ts)“ ändern.
- **„uneinheitlich“:** Der Satz steht in einem anderen Katalog schon mit anderer Übersetzung. Den Eintrag aus `kampftisch.json` löschen, denn der vorhandene Katalog gilt.
- **„fehlend“:** Den Satz mit englischer Übersetzung in `kampftisch.json` ergänzen.

Run: `npm run gate:sprache`
Expected: 0 Verstöße.

Run: `npx vitest run packages/client/test/sprache-P3.test.ts packages/client/test/sprache-kampftisch.test.ts packages/client/test/i18n.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -- packages/client/test/kampftisch-klartext.test.ts packages/client/test/sprache-kampftisch.test.ts packages/client/src/i18n/en/P3.json packages/client/src/i18n/en/kampftisch.json packages/client/test/sprache-P3.test.ts
git commit -m "test(kampf): Klartext-Waechter und Sprachpaket fuer den Kampftisch

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Im Browser, in allen zwölf Looks, und festgehalten

**Files:**

- Create: `e2e/kampftisch.spec.ts`
- Modify: `docs/FEATURELISTE.md` (neuer Abschnitt am Ende), `STATUS.md` (neuer Kopfabschnitt)

**Interfaces:**

- Consumes: alles Vorige. `reviewApp` aus `e2e/helpers/review-app.ts`; `LOOK_LABEL` aus `packages/client/src/features/look-namen.ts`; `THEME_PRESET_IDS` aus `@chronicle/theme`.

- [ ] **Step 1: Write the browser test**

`e2e/kampftisch.spec.ts`:

```ts
// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { THEME_PRESET_IDS } from "@chronicle/theme";
import { HOW_TO_BE_A_HERO_PACKAGE, HTBAH_EXAMPLE_CHARACTERS } from "../packages/rules/src/examples.ts";
import { LOOK_LABEL } from "../packages/client/src/features/look-namen";
import { reviewApp } from "./helpers/review-app";
import { createGameplay } from "../packages/server/src/domain/gameplay.ts";
import { createActors } from "../packages/server/src/domain/actors.ts";
import { createKampfbuehne } from "../packages/server/src/domain/kampfbuehne.ts";

let host: Awaited<ReturnType<typeof reviewApp>>;
test.beforeAll(async () => {
  host = await reviewApp(15600 + Math.floor(Math.random() * 150));
  const gm = host.gm.userId, campaign = host.campaign.id, paket = { id: HOW_TO_BE_A_HERO_PACKAGE.id, version: HOW_TO_BE_A_HERO_PACKAGE.version };
  const game = createGameplay(host.db), actors = createActors(host.db), buehne = createKampfbuehne(host.db);
  await game.installPackage(gm, campaign, HOW_TO_BE_A_HERO_PACKAGE);
  const review = await game.previewPackage(gm, campaign, HOW_TO_BE_A_HERO_PACKAGE);
  await game.activatePackage(gm, campaign, { packageId: paket.id, packageVersion: paket.version, expectedVersion: 0, previewHash: review.previewHash });
  await game.updateSheet(host.player.userId, campaign, { actorId: host.actorId, expectedVersion: 0, fields: { ...HTBAH_EXAMPLE_CHARACTERS[0]!.fields, hp: 70 } });
  const wolf = await actors.createActorTemplate(gm, campaign, { commandId: randomUUID(), definition: { schemaVersion: 1, name: "Wolf", kind: "creature", loreEntryId: null, package: paket, fields: { hp: 40 } } });
  const kampf = await buehne.anlegen(gm, campaign, { name: "Hinterhalt am Pass" });
  await buehne.teilnehmerHinzufuegen(gm, campaign, kampf.id, { name: "Sera", seite: "gefaehrten", initiative: 15, actorId: host.actorId });
  await buehne.ausVorlage(gm, campaign, kampf.id, { commandId: randomUUID(), templateId: wolf.id, templateRevision: wolf.revision, anzahl: 2, seite: "gegner", initiative: 12, lage: "feld" });
  await buehne.eroeffnen(gm, campaign, kampf.id);
});
test.afterAll(async () => { await host?.close(); });

async function oeffne(page: Page, session: { value: string }, stage = "tisch&tab=kampf") {
  await page.context().addCookies([{ name: "chronicle_session", value: session.value, url: host.origin, httpOnly: true, sameSite: "Strict" }]);
  await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=${stage}`);
}
const karte = (page: Page, name: string) => page.getByRole("article", { name, exact: true });

test("die Spielleitung verdeckt und verbirgt, die Runde sieht nur, was sie sehen darf", async ({ browser }) => {
  const fehler: string[] = [];
  const leitung = await (await browser.newContext()).newPage(); leitung.on("pageerror", e => fehler.push(e.message));
  await oeffne(leitung, host.gm);
  await expect(leitung.getByRole("heading", { name: "Der Kampftisch", exact: true })).toBeVisible();
  await expect(karte(leitung, "Wolf 1")).toContainText("Die Runde sieht: schwer angeschlagen");

  await karte(leitung, "Wolf 1").getByRole("button", { name: "Was mit Wolf 1 geschehen soll" }).click();
  await leitung.getByRole("button", { name: "In die Hand (verdecken)", exact: true }).click();
  await expect(leitung.getByRole("complementary", { name: "Nur für dich sichtbar" })).toContainText("Wolf 1");

  await karte(leitung, "Wolf 2").getByRole("button", { name: /^Was die Runde bei Lebenspunkte sieht/ }).click();
  await leitung.getByRole("radio", { name: /^Verborgen/ }).click();
  await expect(karte(leitung, "Wolf 2")).toContainText("Die Runde sieht: nichts");

  await leitung.getByRole("button", { name: "Mit den Augen der Runde" }).click();
  await expect(leitung.getByRole("region", { name: "Spieltisch" })).not.toContainText("Wolf 1");
  await expect(karte(leitung, "Wolf 2")).not.toContainText("Lebenspunkte");

  const runde = await (await browser.newContext()).newPage(); runde.on("pageerror", e => fehler.push(e.message));
  const antwort = runde.waitForResponse(r => r.url().endsWith(`/api/campaigns/${host.campaign.id}/kaempfe`) && r.request().method() === "GET");
  await oeffne(runde, host.player);
  const roh = await (await antwort).text();
  expect(roh).not.toContain("Wolf 1");
  expect(roh).not.toContain('"ordnung"');
  expect(roh).not.toContain('"sicht"');
  await expect(karte(runde, "Sera")).toContainText("Deine Figur");
  await expect(karte(runde, "Sera")).toContainText("70 / 100");
  await expect(karte(runde, "Wolf 2")).not.toContainText("Lebenspunkte");

  await karte(runde, "Sera").getByRole("button", { name: "Lebenspunkte ändern, jetzt 70 / 100" }).click();
  await runde.getByLabel("Neuer Wert", { exact: true }).fill("65");
  await runde.getByRole("button", { name: "Übernehmen", exact: true }).click();
  await expect(karte(runde, "Sera")).toContainText("65 / 100");
  expect(fehler).toEqual([]);
});

test("der Kampftisch steht in allen zwölf Looks", async ({ page }, testInfo) => {
  const ordner = testInfo.outputPath("looks"); await mkdir(ordner, { recursive: true });
  for (const look of THEME_PRESET_IDS) {
    await oeffne(page, host.gm, "account");
    await page.getByRole("radio", { name: LOOK_LABEL[look], exact: true }).check();
    await page.goto(`${host.origin}/?campaign=${host.campaign.id}&stage=tisch&tab=kampf`);
    await expect(page.getByRole("region", { name: "Spieltisch" })).toBeVisible();
    await page.locator(".kampftisch-tafel").screenshot({ path: `${ordner}/${look}.png` });
  }
});
```

Heißt der Reiter nach `tab=kampf` nicht sofort „Kampf“ (`e2e/gui-navigation.spec.ts` prüft genau diese Adresse), vor der ersten Erwartung `await page.getByRole("tab", { name: "Kampf", exact: true }).click();` einfügen.

- [ ] **Step 2: Run the browser test**

Run: `npm run build`, danach `npx playwright test e2e/kampftisch.spec.ts e2e/gui-navigation.spec.ts`
Expected: PASS. Kein Vitest parallel.

- [ ] **Step 3: Look at every look**

Die zwölf Bilder unter `test-results/**/looks/*.png` einzeln mit dem Read-Werkzeug ansehen. Besonders auf die drei hellen Looks achten (Medieval, Parchment, Dawn).

Geprüft wird:

- Karten, Schrift und Balken sind auf dem Filz lesbar.
- Keine dunkle Fläche steht in einem hellen Look.
- Die Marke „am Zug“ ist zu lesen.
- Umgelegte Karten sind als solche erkennbar.
- Die Seitenleiste bricht nicht aus.

Jedes Leck in `kampftisch.css` beheben (nur Farbwerte der Looks) und diesen Schritt wiederholen, bis alle zwölf stehen.

Run: `node --import tsx tools/theme-kontrast.mjs`
Expected: 0 Verstöße. Keine neue Rolle, keine Änderung an den Looks.

- [ ] **Step 4: Full gates for the touched areas**

Run: `npm run typecheck && npm run build && npm run gate:boundaries && npm run gate:sprache && npm run gate:version`
Expected: alle grün.

Run: `npx vitest run packages/projection packages/rules/test/active-conditions.test.ts packages/rules/test/package-v2.test.ts packages/io packages/server/test/kampf-zug.test.ts packages/server/test/kampfkarten.test.ts packages/server/test/kampfkarten-export.test.ts packages/server/test/kampfbuehne.test.ts packages/server/test/kampf.test.ts packages/server/test/alles-in-einer-datei.test.ts packages/server/test/restore-order.test.ts packages/server/test/deletion.test.ts packages/server/test/actor-projection.test.ts packages/server/test/actor-portrait.test.ts packages/server/test/tabletop.test.ts packages/client/test/kampftisch-model.test.ts packages/client/test/kampftisch-render.test.ts packages/client/test/kampftisch-klartext.test.ts packages/client/test/sprache-kampftisch.test.ts packages/client/test/sprache-P3.test.ts packages/client/test/vitalanzeige.test.ts`
Expected: PASS. Ein roter Fall, der mit `git stash` auch ohne diesen Zweig rot ist, wird als vorbestehend gemeldet, nicht verschwiegen und nicht „repariert“.

- [ ] **Step 5: Write it down**

Am Ende von `docs/FEATURELISTE.md` einen Abschnitt „Der Kampftisch — Karten, Balken, Einstellungen der Spielleitung (2026-09-23)“ anfügen. Im Stil der vorhandenen Abschnitte enthält er:

- was gebaut ist: Lage, Einstellungen, Schnellgegner, Werte auf der Karte, Live, Vorschau
- die Belege: Testdateien mit Fallzahl, Gegenproben aus Task 1, 3 und 4, Browsertest, zwölf Looks angesehen
- den Satz, dass damit die offene Offenlegungsfrage aus Feature 13 („Die Balken stehen nicht auf der Kampfbühne …“) beantwortet ist
- was bewusst nicht enthalten ist: die Liste aus der Spezifikation

`STATUS.md` bekommt oben einen Kopfabschnitt „# Der Kampftisch — 2026-09-23“ mit:

- was gebaut ist
- welche gezielten Prüfungen grün sind, mit Zahlen
- was nicht lief (keine volle Suite, kein Installer)
- Verweisen auf Spezifikation, Plan und Mockup

- [ ] **Step 6: Commit**

```bash
git add -- e2e/kampftisch.spec.ts docs/FEATURELISTE.md STATUS.md
git commit -m "test(kampf): Kampftisch im Browser und in allen zwoelf Looks; Featureliste und Status

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

Danach `superpowers:finishing-a-development-branch`: Zweig `feature/kampftisch` gegen den dann aktuellen `main` prüfen (die parallele Sitzung hat dort weitergebaut). Die Wahl zwischen Merge und Pull Request gehört Kaya.
