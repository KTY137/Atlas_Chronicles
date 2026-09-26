<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Das Kompendium: vollständige Regelwerke im Paket

Stand 2026-09-26. Kaya: *„ich will vollständige DnD5e, DSA etc. packs haben die mit allen offizielen
Fähigkeiten bestückt sind“*; Lizenzwahl: **5e SRD 5.2 komplett** und **Pathfinder 2e Remaster (ORC)**.
Punkt (b) der Leiter (`2026-09-25-regelschmiede-leiter-design.md`). Entschieden nach
`kaya-entscheide-selbst`; Lizenzfragen stehen unten gesondert für Kaya.

## Ziel

Ein Regelpaket trägt neben seiner Mechanik ein **Kompendium**: alle Zauber, Klassenmerkmale,
Talente, Völker, Hintergründe, Ausrüstung, magischen Gegenstände, Kreaturen und das Regelglossar
eines Systems — nachschlagbar am Tisch, verknüpft mit dem Bogen, als Figurvorlage oder Lootkarte
übernehmbar. Erstes Paket: **Fünfte Edition — SRD 5.2.1**, auf Deutsch (offizielle deutsche Fassung)
und auf Englisch. Für Einsteiger gilt dieselbe Regel wie überall: jede Ansicht sagt, was sie ist,
und hat einen nächsten Schritt.

## Befund (2026-09-26)

**Das Format heute** (Bestandsaufnahme, Belege in der Sitzung): Seit „Grenzen ohne Sorgen“ passen
Name, Grad (`rank` 0–1000), ein Gruppenpfad und 200 000 Zeichen Text in eine Fähigkeit — Zauber
als Fähigkeit geht im Kern. Es fehlen: strukturierte Angaben (Zeitaufwand, Reichweite,
Komponenten, Dauer, Klassenliste), mehrere getrennte Listen je Figur (bekannte Zauber, Merkmale,
Talente — heute ein Feld, ein Budget), Gegenstände mit Angaben (Schaden, RK, Gewicht), Kreaturen,
die ein Paket mitbringt (Vorlagen sind nur Kampagnendaten), ein Nachschlagebereich, mehr als eine
Lizenzangabe, eine Sprache je Paket. Leistung: jede Regelprüfung liest, prüft und hasht das ganze
Paket neu, `GET /rules` liefert jede installierte Fassung vollständig, die Laufzeit schickt jeden
Fähigkeitstext an den Browser.

**Die Quellen** (Recherche, alle Belege mit Adresse im Sitzungsprotokoll):
- SRD **5.2.1** (1. Mai 2025), CC-BY-4.0, nur als PDF:
  `https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf` (364 Seiten).
  **Offizielle deutsche Fassung** (8. Dez. 2025, CC-BY-4.0, 412 Seiten):
  `https://media.dndbeyond.com/compendium-images/srd/5.2/DE_SRD_CC_v5.2.1.pdf` — metrisch
  („9 Meter“), W für Würfel, GM für Gold, mit einzelnen Übersetzungsfehlern.
- Umfang (eigene Zählung am PDF): 12 Klassen mit je einer Unterklasse, 339 Zauber (Grad 0–9),
  17 Talente, 9 Völker, 4 Hintergründe, 38 Waffen, 13 Rüstungen, 25 Werkzeuge, ~78
  Ausrüstungsteile, ~259 magische Gegenstände, ~330 Kreaturen, ~100 Glossareinträge, 15 Zustände.
- Maschinenlesbar: **open5e** `data/v2/wizards-of-the-coast/srd-2024` (Daten als `cc-by-40`
  ausgewiesen, 339 Zauber, 331 Kreaturen); 5e-bits `src/2024/en` als Gegenprobe (README nennt
  fälschlich OGL — nur zum Abgleich, nicht als Quelle).
- Pflichtangabe EN (wörtlich): „This work includes material from the System Reference Document
  5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The
  SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available
  at https://creativecommons.org/licenses/by/4.0/legalcode.“ — DE (wörtlich): „Dieses Werk enthält
  Material aus dem Systemreferenzdokument 5.2.1 („SRD 5.2.1") von Wizards of the Coast LLC, verfügbar
  unter https://www.dndbeyond.com/srd. Das SRD 5.2.1 ist lizenziert gemäß Creative Commons
  Namensnennung 4.0 International Public License (verfügbar unter
  https://creativecommons.org/licenses/by/4.0/legalcode.de).“ Keine weitere Nennung von Wizards,
  keine Marken („Dungeons & Dragons“, „D&D“); erlaubt ist „kompatibel mit der fünften Edition“ /
  „5E-kompatibel“. Änderungen (Strukturierung, Korrekturen) müssen als solche gekennzeichnet sein.
- Pathfinder 2e Remaster: Player Core, GM Core, Monster Core, Player Core 2 unter ORC; Pflichthinweis
  nach ORC §III.a; Reserved Material (alle Eigennamen der Spielwelt, Götter, Orte …) bleibt draußen;
  „Pathfinder“ nicht im Paketnamen. Maschinenlesbare Quellen (Foundry-pf2e-Daten, Archives of Nethys,
  Pf2eTools) sind lizenzrechtlich nicht sauber — Quelle wären die gekauften Bücher selbst.

## Entscheidungen

**K1 Das Kompendium gehört ins Regelpaket, nicht in ein zweites, abhängiges Paket.** Eine Runde
hat genau einen angehefteten Stand, Pakete sind je Fassung unveränderlich und gehasht; ein
Abhängigkeitsbegriff („Inhaltspaket erweitert Regelpaket“) bräuchte Auflösung, Versionsgrenzen und
Migration über zwei Pakete. Die neuen Grenzen (64 MiB) tragen ein vollständiges SRD. Verworfen:
Fähigkeiten allein strecken (Gegenstände, Kreaturen, Glossar passen nicht); getrennte Inhaltspakete
(Abhängigkeiten ohne Gegenwert für eine Runde).

**K2 Eintragsarten beschreibt das Paket selbst.** Das Format kennt keine festen Arten wie „Zauber“.
Ein Paket legt `compendium.kinds` an — je Art ein Name, eine Mehrzahl, ein Satz für Einsteiger und
ihre Angaben mit Typ (`text`, `number`, `boolean`, `list`, `enum` mit Werten, optionale Einheit).
So trägt dasselbe Format 5e-Zauber, PF2e-Zauber mit Traditionen und Chronicles-Lite-Fertigkeiten.

```ts
interface RuleCompendium { kinds: CompendiumKind[]; entries: CompendiumEntry[] }
interface CompendiumKind {
  id: string; label: string; plural: string; description: string;
  attributes: { key: string; label: string; type: "text" | "number" | "boolean" | "list" | "enum"; values?: string[]; unit?: string }[];
}
interface CompendiumEntry {
  id: string; kind: string; name: string;
  group?: string;                 // Pfad zum Einordnen, „Zauber/Grad 3/Hervorrufung“
  level?: number;                 // 0–1000, Sortierwert: Grad, Stufe; Herausforderungsgrad ×8 (1/8 → 1), der HG selbst steht als Angabe
  tags?: string[];
  attributes?: Record<string, string | number | boolean | string[]>;  // nur Schlüssel der Art, Typ geprüft
  summary?: string;               // eine Zeile für Listen, höchstens 500 Zeichen
  text: string;                   // Regeltext (K3)
  source?: { title: string; page?: number };
  links?: { abilities?: string[]; actions?: string[]; conditions?: string[]; entries?: string[] };
  template?: CompendiumTemplate;  // K5
}
```

**K3 Regeltext ist eine kleine, sichere Auszeichnung, kein HTML.** Absätze, `**fett**`, `*kursiv*`,
Listen (`- `), Überschriften (`### `), Tabellen (`| a | b |`) und Verweise `[[eintrag-id]]`. Ein
eigener Leser erzeugt daraus einen Baum, die Oberfläche zeichnet ihn mit React-Elementen — nie
`innerHTML`. Unbekannte Verweise bleiben Text. Damit tragen Werteblöcke von Kreaturen, Waffentabellen
und Zaubertexte ihre Form, ohne dass ein Paket Code in die Oberfläche bringen kann.

**K4 Mehrere Fähigkeitslisten je Figur.** `abilityRules.lists` (optional): je Liste Name, eigenes
Speicherfeld, eigenes Budget (optional) und welche Gruppenpfade dazugehören (Präfixe). 5e: „Merkmale“
(Klasse, Unterklasse, Volk, Hintergrund), „Talente“, „Zauber“. Der Knoten `abilities` im Bogenbaum
bekommt `list` und darf je Liste einmal stehen. Ohne `lists` gilt wie heute die eine Liste aus
`abilityField` — alte Pakete bleiben gültig und byteidentisch.

**K5 Kreaturen und Gegenstände sind Einträge mit Vorlage.** `template` ist entweder
`{ type: "figur"; kind; fields }` (Werte für die Felder des Pakets, gegen dessen Schema geprüft) oder
`{ type: "gegenstand"; kategorie?; seltenheit?; angaben: { label; wert }[] }` (passend zu den
Lootkarten). Die Spielleitung übernimmt einen Eintrag mit einem Knopf als Figurvorlage oder
Lootkarte ihrer Runde — über die bestehenden Wege, ohne neue Tabellen.

**K6 Fähigkeiten verweisen auf ihren Eintrag.** `RuleAbility.entry?: string` zeigt auf den
vollständigen Kompendiumseintrag; der Fähigkeitstext bleibt kurz (was auf dem Bogen steht). So wird
der lange Text nicht mit jeder Regelprüfung verschickt, und „Nachlesen“ am Bogen öffnet den Eintrag.

**K7 Eine Sprache je Paket.** `sprache` (BCP 47, z. B. `de`, `en`) ist eine Angabe des Pakets.
SRD 5.2.1 kommt als zwei Pakete aus derselben Datenstrecke. Verworfen: mehrsprachige Pakete — die
Mechanik (Feldnamen, Aktionen) müsste dann jede Beschriftung doppelt führen; das ist ein eigener
Schritt, falls je gebraucht.

**K8 Mehrere Namensnennungen.** `attribution.weitere?: RuleAttribution[]` für jede zusätzliche
Quelle (z. B. MIT-Hinweis einer Datenquelle), `attribution.changes` nennt, was geändert wurde
(„strukturiert, in Datenform gebracht, …“). Jede Pflichtangabe steht vollständig und wörtlich im
Paket und erscheint im Kompendium, am Bogen und in der Bibliothek.

**K9 Der Server hält große Pakete leicht.** (a) Ein Speicher geprüfter Pakete je Inhalts-Hash
(begrenzt nach Bytes) — ein Paket wird einmal gelesen, geprüft und gehasht, nicht bei jeder Prüfung.
(b) Die Laufzeit schickt kein Kompendium. (c) Neu: `GET …/rules/compendium?packageId&packageVersion`
liefert das Verzeichnis (Kennung, Art, Name, Gruppe, Grad, Schlagworte, Zusammenfassung, Arten),
`GET …/rules/compendium/entry?…&id` einen Eintrag vollständig — für jedes Mitglied der Runde, mit
`ETag` aus dem Hash. (d) `GET /rules` liefert Pakete ohne Kompendium; die Schmiede lädt ein Paket
zum Bearbeiten vollständig über `GET …/rules/package?…`.

**K10 Mitgelieferte Pakete liegen beim Server.** Große Vorlagen (SRD 5.2.1 DE/EN, später ORC)
liegen gepackt in `packages/rules/data/*.rules.json.gz`, nicht im Client-Bündel. Der Server nennt sie
unter `GET /api/rule-templates` und installiert eine per Kennung
(`POST …/rules/install-template { templateId }`) — kein 5-MB-Umweg über den Browser. Die kleinen
Vorlagen (Chronicles Lite, ChronicleHeroes …) bleiben, wo sie sind.

**K11 Nachschlagen ist ein eigener Ort.** „Nachschlagen“ am Tisch (Reiter) und auf „Ich“ (Knopf):
Suche über Name, Schlagworte und Zusammenfassung, Filter nach Art und Grad, lange Listen nur so weit
gezeichnet, wie sie sichtbar sind; die Eintragsansicht zeigt die Angaben als Tabelle, den Regeltext,
die Quelle und — für die Spielleitung — „Als Figurvorlage übernehmen“ / „Als Lootkarte übernehmen“.
Die Schmiede zeigt das Kompendium im Paket (Zahl je Art, Einträge ansehen und bearbeiten).

**K12 Grenzen** (in `RULE_LIMITS`): Arten 256, Angaben je Art 128, Einträge 65 536, Schlagworte je
Eintrag 64, Listenwerte je Angabe 256, Verweise je Eintrag 256, Text wie `longText` (200 000),
Fähigkeitslisten 32.

## Angriffsdurchgang

Das Kompendium ist Fremdinhalt aus einer Paketdatei. Geprüft wird beim Parsen, nicht beim Zeigen:
- **Einschleusen:** Regeltext wird nie als HTML ausgewertet; Verweise nur auf bestehende Kennungen,
  Tabellen mit höchstens 64 Spalten und 4 096 Zeilen; Bildverweise gibt es nicht.
- **Masse:** Tiefe, Knotenzahl, Bytes laufen durch die bestehenden JSON-Grenzen; das Verzeichnis
  wird serverseitig einmal je Hash gebaut; die Suche im Client arbeitet auf dem Verzeichnis, nicht
  auf 5 MB Text.
- **Kennungen:** eindeutig je Paket über Einträge und Arten; `kind` muss existieren; Angaben nur mit
  Schlüsseln der Art und passendem Typ; `enum`-Werte aus der Liste.
- **Vorlagen:** Figurwerte werden gegen das Paketschema geprüft wie jede Figurvorlage; eine
  übernommene Vorlage wird zur ganz normalen Kampagnenvorlage mit Fassung, Revision und Verlauf.
- **Zyklen:** Verweise dürfen Kreise bilden (Glossar), sie werden nie rekursiv aufgelöst.
- **Budget/Listen:** eine Fähigkeit gehört zu genau einer Liste (erster passender Präfix); unbekannte
  Kennungen in einer Liste machen den Bogen wie heute ungültig — die Reparatur zeigt
  „Gespeicherte Liste reparieren“.

## Das erste Paket: Fünfte Edition — SRD 5.2.1

- **Kennungen:** `org.atlas-chronicles.fuenfte-edition-srd-5-2-1.de` („Fünfte Edition — SRD 5.2.1“,
  `sprache: de`) und `…srd-5-2-1.en` („Fifth Edition — SRD 5.2.1“, `sprache: en`). Nie „D&D“.
- **Mechanik:** sechs Attribute, Übungsbonus nach Stufe, 18 Fertigkeiten, Rettungswürfe, Initiative,
  Rüstungsklasse, Trefferpunkte als Balken, Trefferwürfel, Bewegung, Heldeninspiration,
  Zauberplätze Grad 1–9 als Balken, Angriffs-, Schadens- und Rettungswurf-Aktionen, Zauberangriff und
  Zauber-SG, 15 Zustände (Erschöpfung als sechs Zustände „Erschöpft 1“ bis „Erschöpft 6“, weil Zustände keine Stufen kennen). Listen: Merkmale, Talente, Zauber.
- **Kompendium:** 339 Zauber, 12 Klassen und 12 Unterklassen samt Merkmalen je Stufe, 17 Talente,
  9 Völker, 4 Hintergründe, Waffen, Rüstungen, Werkzeuge, Ausrüstung, magische Gegenstände (mit
  Lootkarten-Vorlage), ~330 Kreaturen (mit Figurvorlage), Regelglossar.
- **Datenstrecke** `tools/srd-5-2-1/`: open5e-Daten (festgehaltener Stand) als Gerüst, englischer
  Text gegen das PDF geprüft, deutscher Text aus dem offiziellen deutschen PDF, Zuordnung DE↔EN über
  Reihenfolge und Namensliste; Zählprüfung gegen die Zahlen oben; offensichtliche Fehler der
  deutschen Fassung werden korrigiert und in `changes` benannt. Ergebnis: die beiden `.rules.json.gz`
  plus ein Prüfbericht.
- **Namensnennung:** die wörtlichen Pflichtangaben (EN bzw. DE) in `attribution.notice`, der
  Änderungshinweis in `changes`, der MIT-Hinweis von open5e in `weitere`; dazu ein Eintrag in
  `THIRD-PARTY-NOTICES.md` und `docs/legal/SRD-5.2.1-CC-BY-4.0.md`.

## Phasen

1. **Format** — Typen, Parser, Grenzen, Regeltext-Leser, Listen, `entry`, `sprache`, `weitere`;
   Angriffsdurchgang als Tests; alte Pakete bleiben gültig und byteidentisch.
2. **Server** — geprüfter Paketspeicher, Kompendium-Endpunkte, schlankes `GET /rules`,
   mitgelieferte Pakete per Kennung installieren.
3. **Oberfläche** — Nachschlagen (Tisch, „Ich“), Verweise vom Bogen, Übernehmen als Vorlage,
   mehrere Listen am Bogen, Kompendium in der Schmiede.
4. **SRD 5.2.1** — Datenstrecke, beide Pakete, Namensnennung, Prüfungen (Zahlen, Gültigkeit, ein
   Neulingsgang: Paket installieren, Figur anlegen, Zauber nachschlagen, Kreatur übernehmen).
5. **ORC-Paket** — eigene Spec, nachdem Kaya die Lizenzfragen unten entschieden hat.

## Lizenzfragen an Kaya

1. **ORC-Rückfluss:** Alles, was wir aus den ORC-Regeln ableiten, steht danach selbst unter ORC und
   darf von allen genutzt werden (auch unsere Umformung in Paketform). Einverstanden?
2. **Quelle für Pathfinder:** Sauber sind nur die Remaster-Bücher selbst (Player Core, GM Core,
   Monster Core, Player Core 2). Hast du sie als PDF, und sollen wir daraus bauen?
3. **Kopierschutz:** CC-BY und ORC verbieten technische Sperren, die Empfänger an der Nutzung der
   Inhalte hindern. Die Pakete liegen deshalb als offene Dateien in der App; für einen späteren
   Steam-Vertrieb empfehle ich, sie zusätzlich frei herunterladbar zu machen.

Das SRD-Paket hängt an keiner dieser Fragen und wird gebaut.

**Kayas Antworten (2026-09-26):** (1) ORC-Rückfluss: **in Ordnung**. (2) Pathfinder-Bücher: **keine
vorhanden** — das ORC-Paket wartet, bis eine saubere Quelle da ist; Foundry-, AoN- und
Pf2eTools-Daten bleiben ausgeschlossen. (3) Inhaltspakete werden **zusätzlich frei angeboten**: die
Pakete liegen offen unter `packages/rules/data/` im öffentlichen Repository, dazu ein Hinweis in
`packages/rules/data/README.md` und in `THIRD-PARTY-NOTICES.md`.
