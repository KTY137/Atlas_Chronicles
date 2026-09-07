# Zeitstrahl und Kopfleiste der Chronik

## Der Zeitstrahl — errechnet, nicht gepflegt

Register-Zeile: `Berechnete Zeitleiste aus Prägedaten` (Kategorie `wissen`, `unser-champion`) —
*„Eine Zeitleiste, die nicht von Hand gepflegt, sondern aus den Entstehungsdaten der Absätze
errechnet wird — die Herkunftsschicht IST eine Zeitleiste, pro Absatz."*

**Keine neue Tabelle.** Die Ereignisse werden aus zwei Beständen errechnet, die es ohnehin gibt:

1. **Datumsfelder der Passagen** — was das Quellwiki über Geburt, Tod und Gründung sagt.
2. **Bestätigte Prägungen** (`confirmed_mints`) — was am Tisch Kanon wurde, mit Weltzeit,
   Spieltag und Siegel.

Beides läuft durch dieselbe Sichtbarkeitsregel wie alles andere: **ein Ereignis erscheint genau
dann, wenn die Leserin die Passage hält, aus der es stammt.** Seras Zeitstrahl ist nicht der der
Spielleitung, und er ist es aus demselben Grund wie ihr Artikel.

### Welche Felder ein Datum sind

Eine **benannte Liste, keine Ratefunktion** (`domain/zeitleiste.ts`): `geburt`/`geboren`/
`geburtsdatum`/`birth`, `tod`/`todesdatum`/`gestorben`/`death`, `gründung`/`gegründet`/`founded`,
sowie `datum`/`jahr`/`zeitpunkt`/`date`/`year`. Geprüft wird gegen Schlüssel **und** Label.

### Der Kalender wird gelesen, nicht verstanden

Ein erfundener Kalender ist nicht parsbar, und `leseWeltjahr` tut auch nicht so. Sie liest **eine**
Zahl und **ein** Vorzeichen:

| Quelle | gelesen | genau |
|---|---|---|
| `837` | 837 | ja |
| `819 n. K` | 819 | ja |
| `c.a 1200 v. K.` | −1200 | **nein** |
| `Winter 866` | 866 | **nein** |
| `unbekannt`, `n. K.` | — | ohne Jahr |
| `180 cm`, `1,80 m` | — | **kein Datum** |

`genau: false` heißt: neben der Zahl stand noch etwas, das wir nicht verstanden haben. Die
Oberfläche zeigt das als `~` und **führt den Rohtext der Quelle immer mit** — die Leserin sieht,
was ihr Wiki sagt, nicht was wir daraus gemacht haben.

**Ein Wert mit Einheit ist eine Messung, kein Datum.** Ohne diese Regel stünde `Größe: 180 cm`
als Jahr 180 zwischen zwei Schlachten. Was gar kein Jahr trägt, landet unter „ohne lesbare
Jahresangabe" — nie auf einer erfundenen Null.

## Die Kopfleiste — die waagerechte Ordnung

Oben in der Chronik: `Übersicht` · die obersten Gruppen · `Zeitstrahl`.

Sie erfindet **keine zweite Ordnung**: die Einträge sind genau die obersten Gruppen aus
`baueNavigation`, also die **Kategorien des Quellwikis**, sobald welche importiert wurden — und
bis dahin die **Arten** der Artikel. Ohne diesen Rückfall wäre die Leiste in einem Bestand ohne
Kategorien leer, und genau so ein Bestand ist der häufige Fall direkt nach einem älteren Import.

Die Zähler sind dieselbe Silhouette wie im Baum: `2/12` heißt „zwölf gibt es, zwei kennst du".

Ein Klick auf eine Gruppe öffnet ihre Seite mit allen Artikeln darin; Untergruppen stehen als
eigene Abschnitte. Ein Artikel, den die Leserin nicht kennt, behält seinen Platz als `···` und
verliert nur seinen Namen.

## Nachweise

- `packages/server/test/zeitleiste.test.ts` — der Weltjahr-Leser gegen die Formen aus dem echten
  Bestand, die Messung, die kein Datum ist, die Ordnung nach dem Weltjahr, und die Spielerin,
  die nur ihre eigenen Ereignisse sieht.
- `e2e/wiki-kopf.spec.ts` — der echte Browserpfad: Kopfleiste mit Übersicht, Gruppen und
  Zeitstrahl; drei Ereignisse in der richtigen Reihenfolge mit ihrem Rohtext; `180 cm` kommt
  nicht vor; eine Gruppenseite öffnet ihren Artikel. Prüft im selben Lauf, dass `Gefüge`,
  `Historie`, `Gegenüberstellung` und `Bearbeiten` sichtbar bleiben.
