# Der Regelkern — was Atlas Chronicles über ein Regelwerk weiß

Stand 2026-09-15. Atlas Chronicles kennt kein D&D, kein DSA, kein Pathfinder und kein
ChronicleHeroes. Es kennt nur Bausteine, aus denen ein Regelpaket gebaut wird. Der Host (Server)
besitzt das Paket, rechnet damit und liefert der Oberfläche ein Lesemodell. Die Oberfläche
zeichnet daraus Bogen, Proben und Fähigkeiten; sie rechnet selbst nichts nach.

## Die Bausteine (Primitive)

| Baustein | Was er ausdrückt | Beispiel |
| --- | --- | --- |
| Attribut (`fields`) | ein Wert, den jede Figur trägt: Zahl, Text, Ja/Nein, mit Grenzen | `geschick: 1–20` |
| Bogen (`layout.sections`) | Kategorien mit Feldern, beliebig verschachtelt (bis 16 Ebenen) | `Fähigkeiten → Handeln → Klettern` |
| Anordnung (`presentation`, Schema 3) | wie der Bogen gezeichnet wird: Gruppen, Karten, Tabellen, sichtbar-wenn | Zauberliste erst ab Stufe 2 |
| Abgeleiteter Wert (`computed`) | ergibt sich aus Attributen, ohne Wurf | `floor((@stärke - 10) / 2)` |
| Regel (`constraints`) | Bedingung für einen gültigen Bogen, mit Meldung | `@punkte <= 400` |
| Balken (`vitals`) | ein Vorrat mit Höchststand, Wirkung bei 0 und optionaler Farbe (Palette oder `#rrggbb`) | Lebenspunkte rot, Niederlage |
| Liste (`collections`) | Zeilen mit eigenen Feldern in einem Textfeld | Waffen, Zauber, Spezialisierungen |
| Aktion (`actions`) | ein Wurf mit Formel, Parametern, Voraussetzungen und Ergebnis | `1d20 + @geschick + ?bonus` |
| Ergebnisbereich (`outcome.bands`) | geordnete Stufen statt einer Schwelle | kritisch / Erfolg / Misserfolg, Qualitätsstufen 1–6 |
| Fähigkeit (`abilities`) | lernbar, mit Rang, Vorstufe, Preis, Wirkung auf Würfe | 200 Fähigkeiten in ChronicleHeroes |
| Zustand (`conditions`) | vorübergehend, wirkt in Würfe hinein | Erschöpft: −10 auf Körper |
| Migration (`migrations`) | wie Bögen von einer Version zur nächsten kommen | Feld umbenennen, hinzufügen, archivieren, umrechnen |
| Pakettest (`selfTests`) | festes Beispiel, das jede Installation nachrechnet | „Mira würfelt mit Saat 42 eine 17“ |

Formeln kennen Würfel (`3d6`, höchste/niedrigste behalten, explodierend), Rechnen, Vergleiche,
Bedingungen und die Funktionen `min`, `max`, `floor`, `ceil`, `round`, `abs` sowie Fragen an
gehaltenes Wissen. Alles ist begrenzt (Rechenschritte, Würfelzahl, Verschachtelung), damit ein
Paket nie den Tisch anhalten kann.

## Das Fähigkeitsprofil

Aus jedem Paket wird berechnet, was es kann (`describeRuleCapabilities`): wie viele Attribute,
abgeleitete Werte, Regeln, Balken, Listen, Fähigkeiten, Zustände, Aktionen; welche Würfel;
ob es abgestufte Ergebnisse und Proben mit mehreren Würfen gibt; wie tief der Bogen
verschachtelt ist; ob eine eigene Anordnung vorliegt; wie viele Migrationswege und Pakettests.
Das Profil wird nie gespeichert und nie vom Paket behauptet, sondern immer abgelesen. Das
Laufzeit-Lesemodell (`RuleRuntime.capabilities`) trägt es mit; die Regelwerkstatt zeigt es als
„Was dieses Regelwerk kann“. Oberflächen fragen „Hat dieses Regelwerk Balken?“, nie „Ist das
D&D?“.

## Referenzsysteme

Sieben Pakete (fünf eigene, dazu Chronicles Lite und das CC-BY-4.0-SRD) beweisen, dass dieselbe Engine sehr verschiedene Familien
ausdrückt. Sie kopieren keine fremden Regeltexte.

| Paket | Familie | Was es beweist |
| --- | --- | --- |
| ChronicleHeroes | W100, Talente, 200 Fähigkeiten, 12 Zustände | großer Katalog, Voraussetzungen, Budget, Wirkungen |
| How to be a Hero (Adaption) | W100, Fertigkeiten unter Handeln/Wissen/Soziales | verschachtelte Kategorien, Begabung, kritische Ergebnisse |
| W20-Fantasy-Referenz | sechs Attribute, Modifikatoren, Stufen, Zauberliste | abgeleitete Werte, Listen, sichtbar-wenn, abgestufte W20-Probe |
| 5E-kompatible Referenz | Übungsbonus, Rettungswürfe, Vorteil | Vorteil als „höchster von zwei“, Ressourcen |
| 3W20-Talent-Referenz | drei W20 gegen drei Attribute, Talentreserve, Qualitätsstufen 1–6 | Mehrwurf-Probe mit Ausgleich und gestuftem Ergebnis |
| Chronicles Lite | W50, viele allgemeine Fertigkeiten | das mitgelieferte leichte Regelwerk als Referenz |
| 5e-SRD (CC-BY-4.0, `docs/legal/SRD-5.1-CC-BY-4.0.md`) | vollständige SRD-Figurenregeln | Klassen, Stufen, Übungsbonus, Rettungswürfe, Zauberplätze in derselben Engine |

Bekannte Lücke: „zwei Einsen = kritischer Erfolg“ braucht Einsicht in einzelne Würfel. Das ist
die nächste Engine-Primitive (Arbeitstitel `zaehle(1d20, == 1)`), noch nicht gebaut.

## Migrationsgrenzen

**Unveränderlich** (nur mit neuem Schema und explizitem Migrationsweg): Paketformat Schema 2,
Anordnungsschema 3, Laufzeitvertrag (`RULE_RUNTIME_CONTRACT`), Inhaltshash (`stableJson` +
SHA-256), Pin-Semantik (Vorlage → Paket@Version), Beute- und Inventarmodell.

Regeln:
1. Schema 2 wächst nur additiv. Neue Bausteine sind optional; Pakete ohne sie bleiben
   byteidentisch und behalten ihren Hash.
2. Ein Feld, das seine Bedeutung ändert, ist ein neues Feld mit Migrationsweg.
3. Der Laufzeitvertrag wird nur erhöht, wenn das Lesemodell seine Form verliert. Neue
   Eigenschaften (wie `capabilities`) erhöhen ihn nicht.
4. Fähigkeitsprofile werden nie gespeichert.
5. Installierte Versionen sind unveränderlich. Jede Änderung ist eine neue Version mit
   Migrationsweg von jeder noch benutzten Vorgängerversion.

**Austauschbar** (frei änderbar): Renderer, Editoren, Layout, Texte, Regelkarte, Wegweiser.

## Wo was liegt

- Engine: `packages/rules/src` (`package-v2.ts`, `presentation-v3.ts`, `runtime.ts`,
  `capabilities.ts`, `formula.ts`, `supported-migration.ts`)
- Referenzpakete: `packages/rules/src/templates/`
- Host-Routen: `packages/server/src/domain/rule-runtime.ts`, `rule-activation.ts`,
  `pinned-actors.ts`, `rule-package-resolution.ts`
- Oberfläche: `packages/client/src/features/RulePresentationView.tsx`, `HostRuleFields.tsx`,
  `useHostRules.ts`, `RuleForge.tsx`, `RuleForgePath.tsx`, `RuleMap.tsx`
- Entscheidungen: `docs/superpowers/specs/2026-09-15-regelkern-universell-design.md`,
  `docs/iterations/2026-09-14-universal-rules-completion.md`
