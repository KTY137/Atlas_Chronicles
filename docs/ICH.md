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

Wer noch keine Figur führt, bekommt eine ehrliche leere Fläche — keinen leeren Bogen.

## Keine zweite Fassung, keine zweite Route

Diese Fläche erfindet weder eine parallele Bogenkomponente noch eine eigene API. `Inventory`
wurde aus `ActorWorkbench.tsx` lediglich **exportiert**; ihr Verhalten ist unverändert. Eine
zweite Fassung wäre genau die Art Dopplung, die später zwei verschiedene Bögen für dieselbe
Figur zeigt.

## Nachweis

`e2e/meine-figur.spec.ts` — der echte Browserpfad einer Spielerin: alle bestehenden Bereiche
sind weiterhin sichtbar (`Heute`, `Chronik`, `Atlas`, `Tisch`, `Kanal`, `Woche`, `Runde`),
`Schmiede` bleibt der Spielleitung vorbehalten, `Ich` zeigt Bogen und Inventar, überlebt einen
Neuladevorgang über `?stage=ich`, und der Tisch behält seine Reiter `Figur` und
`Figuren & Inventar`.
