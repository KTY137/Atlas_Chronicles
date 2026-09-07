# Wiki-Navigation: von der Liste zur Karte der Welt

Stand 2026-09-07. Entwurf, freigegeben in der Brainstorming-Runde vom selben Tag.

## Ausgangslage

Das Wiki hat heute genau eine Navigationsfläche: eine flache, alphabetische Liste aller Artikel in
der Seitenleiste (`packages/client/src/Wiki.tsx`). Sie beantwortet die Frage „wie heißt der Artikel,
den ich suche?" und keine andere. Vier Fragen bleiben offen — welche Artikel es überhaupt gibt,
wie man in einer langen Liste wiederfindet, wie man von einem Artikel zum nächsten kommt, und wie
Artikel zueinander stehen.

Drei Befunde aus der Bestandsaufnahme bestimmen den Zuschnitt:

1. **Die Typisierung existiert und wird verschwiegen.** `entries.art`
   (`migrations/001_initial.sql:69`) trägt `charakter | organisation | spezies | gegenstand |
   ereignis | ort | regelseite | sonstiges` (`packages/chronik/src/model.ts:62-70`). Der Importer
   schreibt sie aus den Infobox-Vorlagen mit (`packages/server/src/domain/imports.ts:52`).
   `listEntries` gibt sie nicht heraus (`packages/server/src/domain/documents.ts:101`).
2. **Die Hierarchie existiert und wird verschwiegen.** `entries.parent_entry_id`
   (`migrations/002_documents.sql:9`) ist seit Migration 002 da, mit Zyklusprüfung im
   Bundle-Validator (`packages/io/src/campaign-bundle.ts:195`). Nichts befüllt sie, nichts liest sie.
3. **Die Kategorien der Quell-Wikis werden weggeworfen.** `[[Kategorie:Charaktere]]` fällt unter
   `MEDIAWIKI_NAMESPACES` und wird als Nicht-Artikel-Link verworfen
   (`packages/io/src/wikitext.ts:13-31`). Die Filterung ist dort richtig — eine Kategorie ist kein
   fehlender Artikel —, aber die Information geht dabei verloren statt in eine Tabelle zu wandern.

Es fehlt also weniger, als es aussieht. Was fehlt, ist eine Kategorietabelle, ein Endpunkt und drei
Oberflächen.

## Ziel

Eine Navigation, die sich wie ein Fandom-Wiki anfühlt: eine Übersichtsseite, die die Welt nach
Kategorien zeigt; eine gruppierte, aufklappbare Seitenleiste; Kategorieseiten; und im Artikel
Brotkrumen, Kategorie-Chips und Nachbarn. Alles wissensgefiltert, mit einer bewusst gestalteten
Andeutung dessen, was die Figur noch nicht weiß.

## Datenmodell

Neue Migration `019_wiki_kategorien.sql`, rein additiv:

```sql
CREATE TABLE categories (
  id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  slug text NOT NULL,
  title text NOT NULL,
  parent_category_id text REFERENCES categories(id),
  sichtbarkeit text NOT NULL DEFAULT 'silhouette'
    CHECK (sichtbarkeit IN ('verborgen','silhouette','offen')),
  UNIQUE(campaign_id, slug), UNIQUE(id, campaign_id)
);
-- statement
CREATE TABLE entry_categories (
  campaign_id text NOT NULL REFERENCES campaigns(id),
  entry_id text NOT NULL,
  category_id text NOT NULL,
  PRIMARY KEY(campaign_id, entry_id, category_id),
  FOREIGN KEY(entry_id, campaign_id) REFERENCES entries(id, campaign_id),
  FOREIGN KEY(category_id, campaign_id) REFERENCES categories(id, campaign_id)
);
-- statement
CREATE INDEX entry_categories_category_idx ON entry_categories(campaign_id, category_id);
-- statement
CREATE INDEX entries_parent_idx ON entries(campaign_id, parent_entry_id);
```

Die Kampagnen-ID steht in beiden Tabellen und in jedem Fremdschlüssel, weil die Kampagne in diesem
Schema durchgängig die Mandantengrenze ist — dieselbe Bauart wie `entry_aliases`
(`migrations/002_documents.sql:39`).

**Zwei Ordnungssysteme, bewusst getrennt.** Kategorien sind Mengenzugehörigkeit (ein Artikel in
vielen), `parent_entry_id` ist Enthaltensein (Stadt → Bezirk → Taverne, ein Artikel hat einen
Elternteil). Genau diese Trennung macht Fandom navigierbar; sie zusammenzulegen wäre billiger und
falsch. `art` bleibt unverändert und dient als Rückfallgruppierung für Artikel ohne Kategorie.

**Zyklen.** `parent_entry_id` prüft der Bundle-Validator bereits azyklisch. Für
`parent_category_id` und für Schreibpfade auf `parent_entry_id` braucht es dieselbe Prüfung in der
Domäne, vor dem Schreiben, mit Tiefenbegrenzung 16.

## Die Silhouetten-Regel

Spieler sehen im Wiki nur, was ihre Figur weiß (`documents.ts:97`, `bekannteEntryIds`). Eine
Navigation, die Struktur zeigt, kann das aushebeln. Die Regel dagegen:

- **`verborgen`** — die Kategorie erscheint nur, wenn der Spieler mindestens einen Artikel darin
  kennt, und zeigt ausschließlich die Zahl der bekannten.
- **`silhouette`** (Voreinstellung) — die Kategorie erscheint immer und zeigt „2 von 12 bekannt".
  Unbekannte Artikel erscheinen als graue, unbenannte Platzhalter. Titel, Auszüge und Slugs werden
  nie ausgeliefert.
- **`offen`** — auch die Titel unbekannter Artikel sind sichtbar; sie sind nicht anklickbar.

Die Voreinstellung ist `silhouette`, weil sie das Gefühl einer Welt erzeugt, die größer ist als das
Wissen der Figur. Die Spielleitung sieht immer alles und sieht zusätzlich, welche Stufe gilt.

**Brotkrumen** folgen einer eigenen, einfacheren Regel: unbekannte Vorfahren erscheinen immer als
neutraler Platzhalter ohne Titel, unabhängig von der Kategorie-Stufe. Das leakt nichts, was das
bekannte Kind nicht ohnehin verrät — dass es eine übergeordnete Ebene gibt, folgt aus seiner
Existenz.

**Durchsetzungsort.** Die Filterung steht ausschließlich in
`packages/server/src/domain/wiki-navigation.ts`, in einer Funktion, durch die jede Antwort läuft.
Kein Endpunkt filtert selbst. Der Client bekommt nie Daten, die er verbergen müsste — genau daran
scheiterte der verworfene Ansatz, den Baum im Browser zu bauen.

## API

Der Ansatz ist ein Skelett-Endpunkt plus ein Detail-Endpunkt. `listEntries` lädt heute für jeden
Artikel die vollen Passagen nach (`documents.ts:98`) — ein N+1, das bei einer flachen Liste
durchgeht und einen Baum erschlagen würde. Der Skelett-Endpunkt fasst `source()` deshalb nicht an.

**`GET /api/campaigns/:campaignId/navigation`** — das gesamte gefilterte Skelett in einer Antwort,
rein aus `entries`, `categories`, `entry_categories` und den Wissensmengen. Keine Passagen, keine
Auszüge.

```jsonc
{
  "kategorien": [
    { "id": "…", "slug": "goetter", "titel": "Götter", "elternId": null,
      "sichtbarkeit": "silhouette", "bekannt": 2, "gesamt": 12 }
  ],
  "arten": [ { "art": "ort", "bekannt": 31, "gesamt": 44 } ],
  "artikel": [
    { "id": "…", "slug": "…", "titel": "…", "art": "ort",
      "elternId": "…", "kategorieIds": ["…"], "bekannt": true, "ungelesen": 2 }
  ]
}
```

Unbekannte Artikel erscheinen in `artikel` nur mit `{ "bekannt": false, "kategorieIds": […],
"elternId": … }` — ohne `titel` und ohne `slug`, außer bei `sichtbarkeit: "offen"`. Die Antwort ist
pro `(userId, campaignId, revision)` gültig und invalidiert über den bestehenden `revision`-Zähler,
den der Client schon führt.

**`GET /api/campaigns/:campaignId/navigation/kategorien/:slug`** — die Kategorieseite: die
bekannten Artikel der Kategorie mit Auszügen, plus Unterkategorien. Nur dieser Endpunkt braucht
Auszüge und darf `source()` benutzen, begrenzt auf die Artikel einer Kategorie.

**Schreibpfade** (Ausbaustufe 2 und 3), alle nur für die Spielleitung:
`POST|PATCH|DELETE /api/campaigns/:campaignId/kategorien[/:id]` und die Zuordnung eines Artikels
über den bestehenden Speicherpfad des Editors.

Registrierung in `packages/server/src/http/wiki-navigation.ts`, das bereits existiert und in
`app.ts:144` eingehängt ist.

## Oberflächen

**Übersicht (neu).** Die Landefläche des Wiki-Reiters, wenn kein Artikel gewählt ist — sie ersetzt
den heutigen leeren Zustand. Kategoriekarten mit Titel, Zahl und den zuletzt gelesenen Artikeln
darunter; darunter die Gruppierung nach `art` für alles Unkategorisierte. Der bestehende leere
Zustand für die noch leere Chronik bleibt erhalten.

**Seitenleiste (Umbau).** Aus der flachen Liste wird eine gruppierte, aufklappbare Navigation:
Kategorie → Artikel, mit Einrückung entlang `parent_entry_id`. Der aufgeklappte Zustand wird lokal
gemerkt. Die Suche bleibt, wie sie ist, und flacht die Gruppierung während der Eingabe ab — beim
Suchen ist die Ordnung im Weg. Ein Alphabet-Index springt innerhalb der aktiven Gruppe.

**Artikelkopf (Erweiterung).** Brotkrumen entlang der Elternkette über dem Titel, Kategorie-Chips
darunter. Beides klickbar. Am Fuß, neben den bestehenden Backlinks
(`packages/client/src/features/Backlinks.tsx`), die Geschwister aus derselben Kategorie.

**Kategorieseite (neu).** Titel, Unterkategorien, Artikelliste mit Auszügen, Silhouetten-Platzhalter
für Unbekanntes.

**Editor (Ausbaustufe 2).** Zwei Felder: Kategorien (Mehrfachauswahl mit Anlegen) und übergeordnete
Seite (Suchauswahl über bestehende Artikel, mit Zyklusabweisung).

**Kategorieverwaltung (Ausbaustufe 3).** Eigener Bereich der Spielleitung: anlegen, umbenennen,
zusammenführen, Unterkategorien ordnen, Artikel massenweise zuweisen, Sichtbarkeitsstufe je
Kategorie schalten.

Die Oberflächen liegen als eigene Dateien unter `packages/client/src/features/` neben
`WikiMedien.tsx` und `Backlinks.tsx`. `Wiki.tsx` ist mit 69 dichten Zeilen bereits an der Grenze;
die Navigation kommt nicht hinein, sondern daneben, und `Wiki.tsx` behält die Auswahl-, Editor- und
Dirty-Logik.

## Import

`parseWikitext` sammelt `[[Kategorie:X]]` künftig ein, statt es nur zu verwerfen: Der Link bleibt
aus dem Fließtext und aus der Rotlink-Zählung heraus — die Begründung in `wikitext.ts:13-24` gilt
unverändert —, aber der Name wandert in ein neues Feld `kategorien: readonly string[]` des
Parse-Ergebnisses. `imports.ts` legt daraus Kategorien an und verknüpft sie. Ein zweiter Import
derselben Kategorie legt sie nicht erneut an.

Elternseiten kommen aus MediaWiki-Unterseiten (`Stadt/Bezirk`), wo die Quelle sie hat; wo nicht,
bleibt `parent_entry_id` leer und die Spielleitung setzt sie im Editor.

Ein Rückfüllschritt für bereits importierte Kampagnen ist nicht vorgesehen: die Quelltexte liegen in
`rohblock`-Passagen nicht vollständig genug vor, und ein erneuter Import ist der ehrlichere Weg.

## Fehlerfälle

- Kategorie-Slug kollidiert beim Anlegen → Abweisung mit dem bestehenden Konfliktpfad, wie bei
  Artikel-Slugs (`documents.ts:116`).
- Zyklus in `parent_category_id` oder `parent_entry_id` → Abweisung vor dem Schreiben, mit Nennung
  der Kette.
- Kategorie löschen, die noch Artikel trägt → die Zuordnungen fallen weg, die Artikel bleiben; die
  Bestätigung nennt die Zahl.
- Elternartikel wird gelöscht → Kinder werden zu Wurzeln, nicht mitgelöscht.
- Navigations-Endpunkt fällt aus → die Seitenleiste fällt auf die heutige flache Liste zurück. Die
  Navigation ist eine Verbesserung, kein Sperrpfad zum Inhalt.

## Tests

Testgetrieben, Reihenfolge Test vor Implementierung.

- `packages/server/test/wiki-navigation.test.ts` (bestehend, erweitert): Silhouetten-Regel je Stufe,
  Spieler gegen Spielleitung, Zähler, Zyklusabweisung, und ein Test, der belegt, dass die Antwort
  für einen Spieler keinen Titel eines unbekannten Artikels enthält.
- `packages/io/test/`: `[[Kategorie:X]]` landet in `kategorien` und nicht in den Rotlinks.
- Ein Test, der die Zahl der Datenbankabfragen des Skelett-Endpunkts bei 50 Artikeln beschränkt —
  ohne ihn kehrt das N+1 zurück.
- `e2e/`: Übersicht öffnen, Kategorie wählen, Artikel öffnen, Brotkrumen zurück.

## Ausbaustufen

1. **Substrat und Anzeige** — Migration, Import, Skelett-Endpunkt, Übersicht, gruppierte
   Seitenleiste, Brotkrumen und Chips. Nach dieser Stufe ist die Navigation für importierte Wikis
   vollständig nutzbar.
2. **Pflege im Fluss** — Kategorie- und Elternfeld im Editor, Kategorieseite, Geschwister.
3. **Verwaltung** — eigener Bereich der Spielleitung samt Sichtbarkeitsschaltern und
   Massenzuweisung.

## Nicht im Umfang

Freitext-Schlagworte neben Kategorien; automatische Kategorievorschläge; kategorieweite Freigabe
von Wissen; Umbenennen mit Weiterleitungen; Navigation außerhalb des Wiki-Reiters.
