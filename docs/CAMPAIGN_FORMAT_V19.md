# Native Kampagnensicherung v19

V19 ergänzt Migration `031_kartenherkunft.sql` um das Modul `kartenherkunft` und
`kartenherkunftSchemaVersion: 1`. Die eingefrorenen Tabellen, Hashregeln und Parser von
V1–V18 bleiben unverändert. Die aktuelle Fassade liegt in
`packages/io/src/native-v19/current.ts`. Solange keine Karte ihre Herkunft mitschreibt,
delegiert sie an V18 und dessen bisherige datenabhängige Formatwahl — eine Runde ohne
geholte Karte bekommt also keine neue Formatnummer aufgedrängt.

| Tabelle | Gespeicherte Daten |
| --- | --- |
| `atlas_karten_herkunft` | Zu welcher Weltkarte die Angabe gehört, ihre Art (`wiki`, `beispiel`, `bild`), Adresse des Wikis, Seitentitel, Seiten- und Revisionsnummer, Name des Kartenbildes, Lizenzangabe der Seite, Abrufzeitpunkt und wer sie geholt hat |

Bigints bleiben dezimale Zeichenketten. Das Modul und der Gesamthash enthalten die
Originalzeilen. Export liest einen konsistenten Datenbankstand.

## Warum die Herkunft neben dem Artefakt steht und nicht darin

`artifacts.source` ist das **unveränderte Quelldokument**. Der native Validator leitet
die normalisierten Kartendaten erneut aus `source.quelle.json` ab und vergleicht Hash
gegen Hash (`packages/io/src/campaign-bundle.ts`). Ein Abrufzeitpunkt oder eine
Revisionsnummer darin machte dieselbe Karte bei jedem Abruf zu einer anderen Karte —
und ließe eine zweimal geholte Seite als zwei Karten in der Bibliothek liegen.

Die Herkunft ist deshalb eine eigene Zeile mit `map_id` als Primärschlüssel: **eine**
Karte, **eine** Herkunft. Ein zweiter Abruf derselben Quelle öffnet den gespeicherten
Stand und lässt die einmal notierte Herkunft stehen — ein zweiter Abruf ist kein
zweiter Ursprung.

## Was die Zeile verspricht

- `art` ist `wiki` (von der Spielleitung angegebene Adresse, live geholt), `beispiel`
  (die mitgelieferte Andaria-Quelle mit ihrer dokumentierten Herkunft) oder `bild`
  (eine Karte, die nur aus einem hochgeladenen Bild besteht).
- `wiki_url` und `seitentitel` sind bei `wiki` und `beispiel` **beide** gesetzt und bei
  `bild` **beide** leer. Eine halbe Wiki-Angabe ist keine Herkunft, sondern eine
  Behauptung; Migration und nativer Validator lehnen sie gleichermaßen ab.
- `wiki_url` beginnt mit `https://`. Der Abruf spricht nichts anderes, und eine
  Sicherung, die etwas anderes behauptet, ist keine Sicherung dieses Abrufs.
- `pageid` und `revid` sind optional. Die Kartenseite kommt über `?action=raw`; die
  Nummern über `action=query`. Antwortet das Wiki auf die zweite Frage nicht, bleibt
  die Herkunft ohne Nummern statt mit erfundenen.
- `bild_dateiname` ist ein **Name, keine Fremdschlüsselkante**. Die Karte nennt ihr
  Bild (`mapImage`), lange bevor jemand seine Bytes hat: ein Abruf, bei dem die Seite
  ankam und das Bild nicht, hinterlässt eine gültige Karte ohne Hintergrund, die
  weiß, welchen sie sucht. Bei `art = 'bild'` ist der Name Pflicht.
- `lizenz` ist die Lizenzangabe der **Seite** (`meta=siteinfo&siprop=rightsinfo`, also
  das, was unten auf jeder MediaWiki-Seite steht). Das Lizenzurteil über das **Bild**
  führt weiterhin `wiki_assets` mit `leseLizenz` — siehe [WIKI_MEDIEN](WIKI_MEDIEN.md).
  Eine unbekannte Lizenz bleibt unbekannt und wird nie als frei behandelt.

## Reihenfolgen

`restoreOrder` schreibt `atlas_karten_herkunft` **zuletzt**: die Zeile zeigt auf ihre
Karte und auf den Menschen, der sie geholt hat, und auf sie zeigt niemand.
`LOESCHREIHENFOLGE` löscht sie **vor** `atlas_maps`, aus demselben Grund in umgekehrter
Richtung.

## Das Kartenbild reist ohnehin schon mit

Es bekommt keine eigene Tabelle: die Bytes liegen als Zeile im Bildbestand
(`wiki_assets`, seit V7) mit gemessenem Typ, gemessenen Maßen, Quelladresse,
Beschreibungsseite, Urheber und Lizenzurteil. Das war der ausschlaggebende Grund,
den festen Pfad `design/fixtures/eron/media/…` aufzugeben: eine Datei neben dem
Programm ist genau die Stelle, an der ein Kampagnenpaket unvollständig wird.
