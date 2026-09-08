# Ich — die eigene Figur

Ein eigener Bereich in der linken Leiste, zwischen `Heute` und `Chronik`. Er beantwortet die
Frage, die unter der Woche zuerst gestellt wird und für die der Spielabend der falsche Ort war:
*Was habe ich, und was kann ich?*

## Warum ein eigener Bereich

Bogen und Inventar existierten vollständig — aber nur unter **Tisch → „Figur"** bzw.
**Tisch → „Figuren & Inventar"**. Wer am Mittwoch auf dem Telefon nachsehen wollte, was seine
Figur trägt, musste den gemeinsamen Abend öffnen. Das ist die Fläche eines Spielabends, nicht
die einer einzelnen Person, und sie zeigt Szenen, Kanon und Vollmachten mit.

`Ich` ist deshalb kein neues Feature auf neuer Grundlage, sondern eine eigene **Adresse** für
Dinge, die es schon gab.

## Was er zeigt

- **Charakterbogen** — dieselbe `CharacterSheet`-Komponente wie am Tisch, gegen dieselbe Route
  `/actors/:id/sheet`, mit derselben serverseitigen Prüfung, denselben berechneten Feldern und
  demselben Konfliktverhalten bei einer fremden Änderung.
- **Inventar der Figur** — dieselbe `Inventory`-Komponente, ausdrücklich mit `gm={false}`:
  der `Vorrat der Spielleitung` ist keine Spielerfläche und erscheint hier nicht, auch nicht
  für eine Spielleitung, die zufällig eine eigene Figur führt.
- **Figurenwahl**, sobald jemand mehr als eine Figur führt. Die erste Wahl wird einmal
  festgehalten; eine spätere Freigabe hängt keinen offenen Entwurf um.

Wer noch keine Figur führt, bekommt eine ehrliche leere Fläche — keinen leeren Bogen. Für
Spieler ist sie seit dem Figurantrag keine Sackgasse mehr (siehe unten); für die Spielleitung
bleibt sie der Hinweis, dass sie ihre Figuren in der Schmiede erschafft.

## Die eigene Figur beantragen

Auf der leeren Fläche steht **Figur anlegen**. Der Weg dahinter ist bewusst kurz:

1. **Vorlage wählen.** Die Auswahl kommt ausschließlich aus
   `GET /actor-templates/freigegeben` — den Vorlagen, die die Spielleitung ausdrücklich für
   Spieler geöffnet hat, projiziert ohne Beutetabelle und ohne fremden Artikelverweis. Die
   Werkstattliste aller Vorlagen wird hier nicht geladen und deshalb auch nicht gefiltert.
2. **Namen geben.** Der Name gehört der Figur, nicht der Vorlage.
3. **Anfangswerte anpassen.** Gezeigt werden nur die Felder, die die gewählte Vorlage führt,
   vorbelegt mit ihren Werten. Abgeschickt wird allein die **Abweichung**: was du nicht
   änderst, bleibt der Wert der Vorlage — nicht der Paketstandard.
4. **Absenden.** Der Antrag trägt eine `commandId` aus `crypto.randomUUID()`; ein
   Wiederholungsversuch nach einem Netzfehler trifft denselben Antrag statt einen zweiten.

Danach steht dort *„…“ wartet auf die Spielleitung.* Solange ein Antrag offen ist, gibt es
keinen zweiten — dieselbe Regel, die der Server als `figurantraege_ein_offener` führt.
**Antrag zurücknehmen** macht den Weg wieder frei. Eine **Ablehnung** nennt ihren Grund und
lässt einen neuen Anlauf zu. Eine **Bestätigung** verschwindet von dieser Fläche, weil dann
genau das hier steht, worum es ging: der Bogen der eigenen Figur.

Die Fläche hängt am Live-Takt der Anwendung: bestätigt die Spielleitung, löst dieselbe
Verbindung, die auch Würfe und Briefe meldet, ein Neuladen aus — der Status weicht dem Bogen,
ohne dass jemand die Seite neu lädt.

Es gibt zu keinem Zeitpunkt eine unbestätigte Figur. Sie entsteht erst bei der Bestätigung,
über denselben Befehl, mit dem die Spielleitung auch sonst Figuren erschafft — siehe
[Figuren, Vorlagen und Inventar](ACTORS_UI.md).

## Keine zweite Fassung, keine zweite Route

Diese Fläche erfindet weder eine parallele Bogenkomponente noch eine eigene API. `Inventory`
wurde aus `ActorWorkbench.tsx` lediglich **exportiert**; ihr Verhalten ist unverändert. Eine
zweite Fassung wäre genau die Art Dopplung, die später zwei verschiedene Bögen für dieselbe
Figur zeigt.

## Nachweis

`e2e/meine-figur.spec.ts` prüft zwei Browserpfade. Der erste ist der einer Spielerin mit
Figur: alle bestehenden Bereiche
sind weiterhin sichtbar (`Heute`, `Chronik`, `Atlas`, `Tisch`, `Kanal`, `Woche`, `Runde`),
`Schmiede` bleibt der Spielleitung vorbehalten, `Ich` zeigt Bogen und Inventar, überlebt einen
Neuladevorgang über `?stage=ich`, und der Tisch behält seine Reiter `Figur` und
`Figuren & Inventar`.

Der zweite ist der einer Spielerin **ohne** Figur: leere Fläche, „Figur anlegen", Auswahl
allein aus den freigegebenen Vorlagen, geänderter Anfangswert, Absenden, der Status
„wartet auf die Spielleitung" über einen Neuladevorgang hinweg, und das Zurücknehmen.
`packages/client/test/figurantrag-review.test.ts` hält dieselben Entscheidungen als
Regressionen fest, ohne Browser.
