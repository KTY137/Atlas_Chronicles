# Schmiede und Charaktererstellung

Auftrag: konkrete Fehler beheben und die bestehende Gestaltung besonders in der
Regelschmiede und Charaktererstellung übersichtlicher machen. Zusätzlich wurde
ein separater Agent mit der Steam-Vorbereitung beauftragt.

## Bedienung

Die Schmiede beginnt mit zwei großen Einstiegen: **Regelschmiede** und
**Figuren & NPCs**. Karten, Beute und Bilder bilden die zweite Gruppe. Im
Editor nimmt die Kopfzeile weniger Platz ein.

Die Regelschmiede gliedert ihre Reiter in Grundlagen, Spielregeln und
Prüfen & Übernehmen. Die Paketübersicht führt direkt zu Attributen, Aktionen
und Tests. Bibliothekssuche und sichtbare Paketmenüs ergänzen das Kontextmenü;
Testtafel und Übernahme sind direkt erreichbar. Die ChronicleHeroes-Vorlage
liegt unter „Mit einer Vorlage starten“.

Figurvorlagen haben eine durchsuchbare Sammlung mit sichtbarem Freigabestand.
Identität, Anfangswerte und optionaler Hintergrund/Beute sind getrennte
Abschnitte. Nach dem Speichern führt „Aus Vorlage Figur erschaffen“ direkt
zur passenden Vorlage; eine Vorschau zeigt den Namen und die Startwerte.
Spieler sehen vor dem Absenden die beantragten Abweichungen und können die
Vorlagenwerte wiederherstellen.

## Behobene Fehler

- Installierte Regelpakete sperrten auch Suche und Auswahl ihrer Attribute,
  Fähigkeiten und Zustände. Die Navigation bleibt jetzt bedienbar; Änderungen
  bleiben gesperrt.
- Attributsuche konnte nach dem Verkleinern einer Liste nicht mehr gelöscht
  werden; unter einem Filter neu angelegte Attribute blieben unsichtbar.
- Die letzte gültige Testvorschau konnte Beispiele in einen inzwischen
  ungültigen Entwurf übernehmen. Das ist jetzt gesperrt.
- Eine ältere lokale Freigabequittung überdeckte neuere Serverstände.
- Ein Klick auf die bereits gewählte Vorlage verwarf ihren Entwurf. Identische
  Revisionen bleiben geöffnet; eine neuere Revision lässt sich nach der
  vorhandenen Entwurfsabfrage übernehmen.
- Während ein Spielerantrag übertragen wurde, blieben Änderungen und Abbruch
  möglich. Die betroffenen Eingaben sind währenddessen gesperrt.
- Spieleranträge waren nicht an den allgemeinen Entwurfsschutz angeschlossen.
- Vorübergehende Ladefehler entfernten offene Figureneditoren und
  Loot-Inventare. Vorhandene Daten und Entwürfe bleiben nun mit Fehlermeldung
  sichtbar.
- Das Löschen einer früher gewählten Paketversion konnte einen unabhängigen
  neuen Regelentwurf löschen. Bibliotheksauswahl und Entwurf werden getrennt
  behandelt.

Alle genannten Verhaltenskorrekturen sind durch gezielte Regressionen belegt.
Die unabhängige Prüfung fand insbesondere die Fälle mit neueren Revisionen,
vorübergehenden Ladefehlern und der Paketlöschung; sie wurden vor der Abnahme
reproduziert und korrigiert.

## Prüfstand

Die Browserprüfung verwendet isolierte Kampagnen mit echten HTTP-Routen,
Datenbank und Anmeldung. Prüfbilder und Logs liegen unter
`.local/forge-release-20260912/`. Vorherige Bilder wurden mit agent-browser
aufgenommen und geöffnet. Desktopbreite 1440 und schmale Breite 390 werden
geprüft, ebenso die englische Übersicht.

Die zusätzliche Sichtprüfung bei 1920 Pixeln zeigt die vollständige Übersicht,
die Regelgliederung und das responsive Raster der Charakterwerte. Die
Abschnittssprünge scrollen im vorhandenen Inhaltsbereich und setzen den Fokus
auf die passende Überschrift. Die mobilen Wertefelder wurden auch unterhalb
des ersten Bildschirms angesehen.

| Prüfung | Ergebnis |
| --- | --- |
| Produktionsbuild und Client-Typprüfung | Bestanden; 3055 Module |
| Version | 0.4.3, beide auslieferbaren Pakete konsistent |
| Architekturgrenzen | 781 Dateien, neun Regeln, keine Verstöße |
| Sprache | 4952 Schlüssel, 26 Kataloge, keine offenen Texte oder Verstöße |
| Assets | 42 Tests; sieben Pakete und 611 Referenzen geprüft |
| Neue Browserabläufe | Alle drei bestanden: Regeln/Entwurfsschutz, englische mobile Übersicht, gespeicherte Vorlage → eigenständige Figur mit Scharfsinn 4 |
| Vorhandene Browserabläufe | Regel/Formel-, Aktivierungs- und sechs Navigationsabläufe bestanden; beide Ich-Abläufe, Figurenfreigabe und der lange Mehrbrowser-Figurenablauf bestanden |
| Vollständiger Unitlauf | 3114 bestanden, 19 fehlgeschlagen, 73 übersprungen; ein Worker-RPC-Timeout. 268 Dateien bestanden, 13 fehlgeschlagen, elf übersprungen |
| Gezielter Unit-Nachlauf | Alle 183 Tests in 17 Dateien bestanden, einschließlich aller 19 ursprünglich fehlgeschlagenen Fälle und des fehlgeschlagenen Prüfaufbaus; 161,73 Sekunden, ein Worker, unveränderte Limits |
| Desktop-/Steam-Werkzeuge | 30 Tests bestanden: sechs zur Build-Bereinigung, zehn zum Artefaktinventar und 14 zum Steam-Staging; im Windows-Paketworkflow eingebunden |
| Gepackte Windows-Anwendung | Alle 29 nativen Prüfungen bestanden: Einrichtung, Grafiken, Schmiede, Regeln, Karten, Export, vollständiger Neustart, lokale Sicherung, portabler Import und sicheres Löschen der Testwelt |

Der vollständige Lauf wurde beendet und als nicht grün festgehalten. Die
Fehler umfassen Test-/Hook-Zeitüberschreitungen, einen Realtime-Wartematcher
und einen inzwischen entfernten Schritttext im P1-Sprachtest. Der
Sprachtest prüft jetzt Platzhalter einer tatsächlich verwendeten Meldung.
Die vier Desktop-Squirrel-Tests isolieren die unbenutzten Host-Netzimporte;
die produktiven Installerpfade und ihre bisherigen Zeitlimits bleiben gleich.
Der gezielte Nachlauf aller fehlgeschlagenen Dateien sowie der neuen
Regressionen ist separat protokolliert; er ersetzt nicht die Historie des
ersten Laufs. Im Nachlauf traten weder Prüfaufbau- noch Worker-RPC-Fehler auf.
`unit-rerun-summary.json` ordnet jeden ursprünglichen Fehler seinem
bestandenen Nachlauf zu und bestätigt den unveränderten Originalbericht.

Zwei alte Figuren-Browserdateien verwendeten zunächst einen nicht laufenden
lokalen PostgreSQL-Port aus den Entwicklungseinstellungen. Für den Nachlauf
wurde über eine leere `E2E_DATABASE_URL` die vorhandene isolierte
PGlite-Testdatenbank gewählt. Die private Konfiguration wurde nicht geändert.
Der lange Mehrbrowser-Figurentest überschritt unter Last sein Gesamtlimit
von 120 Sekunden. Bei geringerer Last bestand derselbe unveränderte Test in
55,6 Sekunden: eigenständige Figuren, gemeinsame Inventare, Perspektivwechsel,
Zugangsentzug, Export und mobile Ansicht. Weder Testschritte noch Zeitlimits
wurden dafür geändert. Der Erstlauf und beide Diagnose-Nachläufe bleiben
erhalten; der abschließende Nachweis heißt `browser-actors-quiet-retry.log`.

Wichtige lokale Belege:

- `04-workshop-final-1920.png`, `05-rules-final-1920.png`,
  `06-character-final-1920.png`, `07-character-fields-final-1920.png`,
  `08-character-fields-final-mobile.png`.
- `browser.log`, `browser-final.log` und `browser-final/` mit den drei
  neuen Browserabläufen.
- `unit.log`, `unit-results.json` sowie der getrennte `unit-rerun`-Nachweis.

Alle Pfade liegen unter `.local/forge-release-20260912/`. Die getrennten
Karten-/Renderer-/Szene-Änderungen einer anderen Sitzung sind im vorausgehenden
Commit `4a82e86` enthalten; dieses Arbeitspaket verändert diese Dateien nicht.

Steam-Werkzeuge, Store-Entwurf und Release-Voraussetzungen stehen in
[docs/steam](../steam/README.md). Die technische Vorbereitung ist keine
Veröffentlichung auf Steam.

Die native Paketprüfung fand zusätzlich eine alte, inzwischen entfernte
Migration im erzeugten Desktop-Verzeichnis. Der Build ersetzt dieses
Verzeichnis jetzt vollständig und prüft die Löschgrenze einschließlich
Windows-Junctions in übergeordneten Verzeichnissen. Das verhindert auch
veraltete Manager-, Laufzeit-, Client- und Assetdateien. Unabhängige
Dateisystemregressionen belegen, dass fremde Verzeichnisse erhalten bleiben.
Der Atlas-Lizenztext und die Metadaten werden korrekt mit ausgeliefert.

Die abschließende native Prüfung verwendete direkt
`.local/steam-staging/steam-qualified-20260912/content/AtlasChronicles.exe`.
Alle 29 Prüfungen bestanden; beide Wiederherstellungswege bewahrten den
semantischen Kampagnenhash. Beleg: `.local/desktop-profiles/smoke-uHFnyU/evidence.json`
mit `passed: true`, ohne Aufräumfehler und ohne HTTP 429. Die schnelle Folge
vollständiger Szenarien hält das unveränderte Serverbudget an benannten
Grenzen ein; zwei gemessene Pausen dauerten zusammen 62,2 Sekunden.
Die Anfragezähler und Budgetheader wurden unabhängig geprüft. Es wurde ein
gepacktes lokales Programm geprüft, keine Steam- oder Squirrel-Installation.
