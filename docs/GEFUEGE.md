# Das Gefüge — Stammbaum und Politogramm

Ein Beziehungsgraph, der jeder Leserin **ihren** Graphen zeigt. Verwandtschaft und Politik sind
zwei Darstellungen desselben Modells, nicht zwei Features.

Register-Zeilen: `PassageRelation, Link, Etikett, Haltung, Revelation` (Kategorie `wissen`,
`unser-champion`) und `Diplomatie-Beziehungsnetze` (bisher `konkurrenz-hat-es` — World Anvil
lieferte am 2026-07-09 „streamlined Diplomacy Webs" aus).

## Die eine Entscheidung: die Kante hängt an einer Passage

**Eine Beziehung ist kein Metadatum am Eintrag. Sie hängt an der Passage, die sie behauptet.**

Das ist der ganze Unterschied zu jedem Rivalen. Ein Beziehungsnetz als Weltwahrheit würde
jeder Spielerin beim ersten Öffnen den halben Stammbaum verraten, den ihre Figur nie erfahren
hat — und genau das verbietet die Champion-Zeile *„Niemand projiziert dieselbe Seite für zwei
Leser verschieden"*. Die Sichtbarkeitsregel ist deshalb **geliehen, nicht erfunden**:

> Eine Kante erscheint genau dann, wenn die Leserin die Passage hält, die sie behauptet.

Dieselbe Herleitung (`held`, aufgelöst durch die Lineage), die schon den Artikel trägt. Das
Gefüge führt **keine zweite Rechtepolitik** ein.

Nach [Kayas Migrationsregel](../CLAUDE.md) ist die Kante irreversible Schicht: sie wurde in
ihrer maximalen Form gebaut, nicht prototypisch.

## Das Modell

`packages/chronik/src/model.ts`. `art` ist eine **geschlossene Menge ohne default-Zweig**:

| Art | Graph | gerichtet |
|---|---|---|
| `elternteil_von` | Stammbaum | ja |
| `verheiratet_mit` | Stammbaum | nein |
| `geschwister_von` | Stammbaum | nein |
| `buendnis_mit` | Politogramm | nein |
| `feindschaft_mit` | Politogramm | nein |
| `lehen_von` | Politogramm | ja |
| `mitglied_von` | Politogramm | ja |

**`graph` und `gerichtet` werden abgeleitet und nie gespeichert** — `graphVon` und
`istGerichtet` sind total über `Beziehungsart`, eine neue Art ohne Zuordnung ist ein
Compile-Fehler. Zwei Spalten, die dasselbe sagen, können sich widersprechen; im Archiv
überdauert so ein Widerspruch Jahre unbemerkt.

Zurückziehen **löscht nicht**: `withdrawn_at`/`withdrawn_by` bleiben stehen. Eine Kante, die
einmal galt, bleibt als Zeile erhalten — und die Passage bleibt dabei unangetastet.

## Die Routen

```
GET  /api/campaigns/:id/gefuege                      — das ganze projizierte Gefüge
GET  /api/campaigns/:id/entries/:entryId/gefuege     — auf die Nachbarn eines Eintrags beschränkt
POST /api/campaigns/:id/beziehungen                  — Spielleitung: Kante eintragen
POST /api/campaigns/:id/beziehungen/:id/zurueckziehen
```

- Ein **Eintrag, den die Leserin nicht hält, hat für sie kein Gefüge** — 404, byte-identisch
  mit einem Eintrag, den es nicht gibt. Genau so verhält sich der Artikel selbst; das Gefüge
  darf keine Existenz bestätigen, die der Artikel verschweigt.
- Ein Knoten, dessen Eintrag die Leserin nicht kennt, wird **genannt, aber nicht begehbar**
  (`bekannt: false`, gestrichelter Rahmen, kein Sprung). Das ist dieselbe Regel, nach der ein
  Link im Artikel blau oder rot ist. Er darf genannt werden, weil die gehaltene Passage ihn
  selbst nennt.
- Eine Schleife (`von === nach`) ist **400**, nicht 404: für die Spielleitung ist sie eine
  fehlerhafte Eingabe, kein Geheimnis.

## Das Archivformat: native v9

Migration `019_gefuege.sql` bringt `beziehungen`. Eine neue Tabelle ohne Profil bringt **jeden
Export zum Stehen** — der Wächter `requireCoveredSchema` hat so schon die Bilder in v7, den
Zugangsvorfall in v8 und (zu spät) `campaign_deletions` gefunden. Deshalb liegt v9 in derselben
Änderung bei, nicht in einer späteren.

`packages/io/src/native-v9/validation.ts` prüft, was das JSON-Schema nicht ausdrücken kann: die
Kante gehört dieser Kampagne, ihre Passage und beide Einträge liegen im selben Paket, und sie
verbindet zwei verschiedene Einträge. Eine Kante ohne ihre Passage wäre eine Aussage ohne
Sprecher — im Archiv genau die Zeile, die einer Leserin später etwas zeigt, das ihr niemand
erzählt hat.

**Kein bestehendes Paket wird neu, nur weil v9 existiert.** Erst die erste Kante hebt den
Umschlag von v8 auf v9 — dieselbe Zurückhaltung wie bei den Bildern und dem Zugangsvorfall.

## Wo es in der GUI sitzt

Chronik → Artikel → Werkzeugleiste → **Gefüge**. Zwei Reiter, `Stammbaum` und `Politogramm`,
und ein Schalter `Ganze Kampagne` / `Nur dieser Eintrag`.

Beziehungen gehören dorthin, wo das Wissen lebt, und die linke Leiste bleibt bei neun
Einträgen. Der Knopf steht additiv neben `Historie`, `Gegenüberstellung` und `Bearbeiten`;
keiner der bestehenden wurde ersetzt oder verschoben. Die Fläche ist eine **Leserfläche** —
auch eine Spielerin sieht sie, nur eben mit ihren eigenen Kanten. Die Autorenfläche
(`Beziehung eintragen`) erscheint ausschließlich für die Spielleitung.

Gezeichnet wird als **Inline-SVG ohne Fremdbibliothek**: der Stammbaum nach Generationen
geschichtet, das Politogramm auf einem Kreis — bei politischen Kanten gibt es keine Richtung,
die eine Schichtung rechtfertigen würde, und ein Kreis lügt darüber nicht. Unter der Zeichnung
steht dieselbe Information als Liste, damit die Fläche ohne Grafik benutzbar bleibt (K3).

## Nachweise

- `packages/server/test/gefuege.test.ts` — 9 Fälle: Zuordnung zum Graphen, unbekannte Art
  abgewiesen, das ganze Gefüge für die Spielleitung, nur die gehaltenen Kanten für eine
  Spielerin, der genannte aber unbekannte Knoten, die Nachbarschaft eines Eintrags, der 404
  für einen nicht gehaltenen Eintrag, der 404 für eine schreibende Spielerin, und das
  Zurückziehen ohne Schaden an der Passage.
- `e2e/gefuege.spec.ts` — der echte Browserpfad: Spielleitung sieht beide Graphen, Sera sieht
  nur ihre Verwandtschaftskante und nirgends `Haus Ker`, und sie bekommt keine Autorenfläche.
  Prüft im selben Lauf, dass `Historie`, `Gegenüberstellung` und `Bearbeiten` sichtbar bleiben.
- `packages/server/test/bundles.test.ts` 8/8 grün nach v9 — Export und Restore tragen die neue
  Tabelle, der Abdeckungswächter wurde nicht umgangen.
