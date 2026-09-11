# Kartenstudio: Anlagen, Vorlagen und Varianten — 2026-09-11

Auftrag: Issue #3 und Kayas ausdrückliche Freigabe zur Umsetzung und Integration auf main.
PR #4 ist als `f2d99d1` integriert. Dieser Folgeschritt erweitert dessen Auswahl; er erklärt
nicht die ganze 20-Punkte-Roadmap für abgeschlossen.

## Geliefertes Verhalten

- Burg und Schloss sind konkrete Optionen auf der Hauptkarte und in der freien Werkstatt,
  nur wenn der Server seine Anlagenprofile in `/tactical/generate/defaults` ausweist.
- `chronicle-anlage` v1 ist ein eigener Generator auf dem bestehenden Siedlungs-/Kartenvertrag:
  Burg mit Ringmauer, offenem Tor, vier Ecktürmen, Torhäusern, Bergfried und Nebenbauten;
  optional vierseitiger Graben mit Brücke. Schloss mit Hauptbau, Seitenflügeln, Ehrenhof,
  Dienstgebäuden, Gartenpavillons und sechs Parterres. Symmetrie ist einstellbar.
- Gebäudeminima/-maxima, Fläche, Licht, Setting, Relief und Standort werden validiert.
  Gelände wird außerhalb einer ausdrücklich terrassierten, trockenen Baufläche erzeugt.
  Straßen und Brücke verbinden die Anlage; Dächer überdecken weder Wege noch Wasser.
- Gebäude besitzen gewöhnliche dauerhafte Knoten/Kindkeime und öffnen die schon vorhandenen
  Innenraumprofile. Karten sind mit dem bestehenden Editor bearbeitbar und exportierbar.
- Ein ausdrücklich gewählter Typ/Standort beim erstmaligen Betreten hat Vorrang vor den
  Vorschlägen einer Region. Bereits verbundene Unterkarten bleiben beim Wiederbetreten erhalten.
- Vorlagen werden explizit als begrenzte, streng validierte JSON-Dateien gespeichert und
  geladen. Sie enthalten Name, Seed, normalisierte UI-Optionen, Generator-ID/-Version und
  den Hash der tatsächlich erzeugten Vorschau, keine Karteninhalte oder Kontodaten.
  Laden ersetzt nach Bestätigung nur den Generatorentwurf. Neue Vorschau-Hashes zeigen an,
  wenn Einstellungen, Engine oder Assetpaket nicht mehr dieselben Ergebnisse erzeugen.
- Zwei Vorschauen lassen sich nebeneinander vergleichen. Die letzten vier Vorlagen bleiben
  nur in der geöffneten Werkstatt; keine privaten Rezepte in geteiltem localStorage.
- Regionen zeigen jetzt Orte (1–24), regionale Zellgröße und Geländeregler statt wirkungsloser
  Raum-/Einrichtungs-/Lichtfelder. Sprachschlüssel liegen im neuen registrierten Paket P14.

## Abgrenzungen

Keine neue Datenbanktabelle, kein zweiter Kartenspeicher, kein Rewrite alter Generatorversionen.
Die Gebäudeinnenräume verwenden die vorhandenen Haus-/Turm-/Kirchenprogramme; mehrgeschossige
Burg-/Schlossprogramme, spezielle Thronsaalfolgen und Ausbaupunkte 05–20 bleiben offen.
Die sichtbare Architektur nutzt die vorhandene kartografische Darstellung, nicht ein neues
3D-Modell oder ein neues Premium-Assetpaket. Eine importierte Vorlage installiert keinen
historischen Generator; der Vergleichshash macht Versionsabweichungen sichtbar.

## Prüfstand

Lokale Basis: exakte CI-Quellen aus `46cf704`; Abgleich gegen main `f2d99d1` zeigt ausschließlich
zusätzliche Expeditionsassets/-Werkzeuge und die erhaltene Workflow-Korrektur. Kein betroffener
Produktquelltext wurde bei diesem ersten Abgleich parallel geändert. Vor der endgültigen
Integration kam Regelschmiede-PR #6 als `3beb68e` hinzu: dessen P13 bleibt erhalten, die
Kartenübersetzungen stehen nun in P14. Die Integration verwendet den aktualisierten main
als Git-Tree-Basis und erhält alle parallelen Regelwerkdateien.

Ausgeführt: **852 Vitest-Fälle in 42 Dateien grün** (Forge, Szene, relevante Client- und
Betreten-/Anlagen-Servertests; JSON-Bericht, 37,94 s). Darin 19 neue Generator-, 7 reale
HTTP/Persistenz-/Berechtigungs-/Sicherungs-, 29 Vorlagen- und 4 Formularprüfungen.
Burg und Schloss werden gespeichert, idempotent wieder geöffnet, ihre Innenräume betreten
und nach nativem Export/Restore mit leerem semantischem Diff erneut gelesen.
Root-Typecheck, Client-Typecheck/Produktionsbuild, Sprach- und Boundary-Gates sind grün.
Eine zusätzliche Prüfung der wiedergeöffneten Kartenfamilie und Stilvererbung schlug
zunächst für beide Anlagen fehl. Nach Korrektur bestanden 34 Serverfälle und der
Root-Typecheck erneut; Anlagen behalten nun auch ohne Außenmöbel ihren gewählten Stil.
Beide Anlagen wurden außerdem durch den echten serverseitigen PNG-Zeichenpfad gerendert
und visuell geprüft; das ersetzt keine Browserabnahme.

`e2e/map-compounds.spec.ts` ergänzt den realen Hauptkartenweg mit Tastaturauswahl, Bearbeitung,
Reload und Innenraum sowie den Vorlagen-Download/Upload, Variantenvergleich und Speichern.
Lokal erreicht Chromium die Testseite wegen `ERR_BLOCKED_BY_ADMINISTRATOR` nicht; diese beiden
Abläufe sind deshalb vor CI ausdrücklich **nicht als bestanden** ausgewiesen. Der Kartenworkflow
installiert Chromium und führt sie separat aus. Ein CommonJS-Vorladen von semver verhindert
den beobachteten Test-Loader-Initialisierungsfehler; keine App-Funktion wird dabei ersetzt.

Das übergreifende Asset-Gate hatte bereits auf der Basis 41 Loot-Reproduktionsabweichungen;
diese Arbeit ändert weder Loot-Bytes noch Prüfregeln. Windows-Installer und installierter
Desktop-Smoke sind nicht Bestandteil dieser lokalen Linux-Prüfung. Keine Release-Behauptung.
