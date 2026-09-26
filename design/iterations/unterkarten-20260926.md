<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->

# Häuser von innen, Geschosse am Tisch — 2026-09-26

Zweig `feature/unterkarten`. Umgesetzt wurde der Innenraum-Prototyp aus den Kartenentwürfen
(Artefakt „Kartenlook", Runde 4). Die Kartenoptik im Atlas-Look (Phase B) ist noch offen.

## Was entsteht

- **Hausplaner** (`packages/forge/src/haus/`): `erzeugeHaus` baut je Geschoss eine gewöhnliche
  taktische Karte, alle im selben Rahmen.
  - Geschosse: Keller, Erdgeschoss, Obergeschoss (Sci-Fi: Unter-, Haupt-, Oberdeck).
  - Die Räume folgen dem echten Umriss auf der Stadtkarte: gedreht, Trapez, L-Form. Rundbauten
    werden radial geteilt.
  - Die Haustür liegt an der Straßenseite.
  - Ein Treppenblock (2×2) steht auf allen Geschossen an derselben Stelle.
  - Fenster, Böden, Türen, Licht.
  - Möbel nach Raumart, mit den echten Maßen des Assets. Stühle stehen an Tischen, und kein
    Möbelstück steht in einer Tür.
  - Erzeuger `chronicle-haus`, Version 1.
- **Server**:
  - Betreten eines Gebäudes ohne gewählte Größe oder Raumzahl erzeugt das Haus. Dasselbe gilt für
    die freie Erzeugung mit Gebäudetyp.
  - Jedes Geschoss wird über `importMap` gespeichert. Der Geschossverband mit Treppen entsteht
    als dieselbe Zeile, die das Kartenstudio von Hand anlegt.
  - Eine gewählte Größe bestellt weiter die freie Grundrissleinwand.
  - Der Stil der Stadt gilt auch innen: gemalt, Genre-Archiv, Grundriss, Zeitwelten.
- **Spieltisch**:
  - Die Spielleitung führt die laufende Szene über eine Treppe ins andere Geschoss. Das geht über
    Treppen-Pins auf der Karte oder im Abschnitt „Geschoss".
  - Jede Figur behält ihren Platz.
  - Jedes Geschoss hält seine Türen. Verlassene Geschosse parken ihre Türzustände.
  - Rücknahmen gelten weiter nur für Türen der ersten Karte.
  - Spieler sehen den Geschossnamen und Treppen nur in Räumen, die sie kennen.
- **Datenbank und Sicherung**:
  - Neue Tabelle `session_floor_states` (Migration 038). Sie liegt neben `session_tactical_states`,
    deren Anfang, Türen und Belege unverändert bleiben.
  - Exportfassung `native-v23`. Sie wird nur geschrieben, wenn eine Szene das Geschoss gewechselt
    hat.
  - Ein bespielter Stock lässt sich nicht aus dem Haus lösen. Die Löschvorschau nennt ihn als
    Blocker.
- **Assets**: pk.grundriss 1.3.0 (+17: Kamin, Herd, Theke, Esse, Kirchbänke, Schrank, Nachttisch,
  Webstuhl, Weinregal, Werkzeugwand, Bank, Trog, Fenster, Teppiche, Läufer). pk.zeitwelten 1.1.0
  (+19: Sofa, Fernseher, Wanne, Waschmaschine, Heizung, Rohre, Koje, Holotisch, Hydroregal,
  Bildschirmwand und weitere).

## Stadtgenerator: was die neue Paketversion aufgedeckt hat

Die Paketversion steht im Keim jeder Stadt, also sind alle Städte neu gewürfelt. Sieben
Qualitätsprüfungen fielen knapp. Keine davon wurde über den Keim oder eine Toleranz gelöst. Die
Ursachen waren echt:

1. **Adresse = Straße vor der Tür.** Ein Haus nannte eine Gasse 1,7 Zellen entfernt, während eine
   andere Straße 0,33 Zellen vor ihm lag. Jetzt gilt die nähere, sobald die genannte weiter als eine
   Zelle entfernt ist. Das behob vier Fälle.
2. **Park am Markt**, wenn am Tempel schon alle Flecken vergeben sind. Ein weiterer Rückgriff auf
   den ganzen Kern kostete zu viele Häuser und wurde verworfen.
3. **Rathaus und Kommandozentrale** bleiben dort, wo ihr Dach in der gemalten Zone liegt, wie der
   Kommentar es schon versprach.
4. **Höfe** ziehen aus einem eigenen Zufallsstrom, damit ein Zonenplan in der Stadt draußen keinen
   Hof verschiebt. Außerdem weichen sie jetzt wie jedes Haus den geplanten Straßen aus.

Die Goldtests wurden bewusst neu geschrieben: 15 Snapshots.

## Grün gesehen

- **forge**: 48 Dateien, 766/766. Darin `haus.test.ts` 10/10, alle Gebäude × 5 Umrissformen × alle
  Pakete.
- **server**:
  - `betreten` 27/27, `session-floors` 3/3, `siedlung-integration` 16/16.
  - `map-settings`, `map-workshop`, `map-floors-fog`, `grundriss`, `restore-order`, `deletion`,
    `kampfkarten-export`, `tactical*`, `map-lifecycle`, `map-studio`, `bundles`: alle grün.
  - Zwei Zeitüberschreitungen traten nur unter Parallellast auf und liefen allein grün.
- **io**: 25 Dateien, 312/312. Zwei Zeitüberschreitungen unter Last liefen allein grün.
- **client**: `sprache-P5`, `i18n`, `tactical-drafts-review`, `tactical-entities-review` 52/52.
  Client-Build grün.
- **Typprüfung** grün, bis auf die bekannten `@fastify/static`-Meldungen in `app.ts`.
- **Gates**: `gate:sprache`, `gate:boundaries`, `gate:version` und `gate-assets.mjs` grün
  (7 Pakete, 647 Assets). Beide Paketgeneratoren reproduzieren ihre Dateien mit `--pruefe`
  identisch.
- **Browser** (gebaute Oberfläche, eingebettete Datenbank):
  - Die Taverne zeigt im Erdgeschoss „Treppe hinauf: Obergeschoss" und
    „Treppe hinunter: Keller".
  - Ein Klick führt ins Obergeschoss (Gästezimmer). Die Figur bleibt an der Treppe.
  - Der Knopf im Abschnitt „Geschoss" führt zurück.
  - Dabei gefunden und behoben: Beide Übergänge lagen im Erdgeschoss auf demselben Punkt. Jetzt
    liegen sie abwechselnd in der oberen und unteren Hälfte des Blocks.

Nicht gelaufen: keine volle Suite, kein Installer, kein e2e-Lauf. `gate-assets-binary` braucht die
vollständigen `node_modules` und läuft im Hauptcheckout.
