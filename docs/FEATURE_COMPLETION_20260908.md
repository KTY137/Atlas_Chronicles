# Offene Features vollständig anschließen · 2026-09-08

Aktiver Auftrag: „implementiere die bitte vollständig; verbessere zudem die GUI weiter“.
Ausgangspunkt `c2bb8e2`, bestehender Worktree `experimental/featureliste-20260907`.
Diese Liste beschreibt das vollständige Ziel und wird bei Übergaben nicht auf bereits
fertige Teilstücke verkürzt. Vorherige Review: `docs/reviews/gui-regression-review-20260908.md`.

## Abnahmekriterien

- [ ] Siedlungen: Weiler/Dorf/Stadt frei erzeugen, echte Vorschau, kanonisch speichern,
  wieder öffnen, Gebäude betreten, Siedlung auch als Unterkarte erzeugen; Straßen sind
  keine Gebäude. Richtige Herkunft und Keime bleiben in Sicherung/Restore erhalten.
- [ ] KI-Chronist: vorhandenes Regelwerk bleibt zuerst; Prosa auswerten, Sitzungsnotizen
  auswerten und erzählerische Zusammenfassungen erstellen. LangGraph-StateGraph mit
  Checkpointer, begrenzten Aufrufen, geprüftem Modelloutput und Wiederaufnahme.
- [ ] Anbieter: lokale Modelle als Voreinstellung; konfigurierbare externe HTTP-Anbieter
  und unterstützte CLI-Anbieter für Selbstbetrieb/Desktop gemäß vorhandenem Chronistenentwurf.
  Die OpenAI-Schlüsseleinrichtung ist separat beim Nutzer angefragt, kein Schlüssel gefunden.
  Keine Annahme, dass eine unbeantwortete Frage eine Freigabe für Schlüssel oder Egress ist.
- [ ] Durchsicht: Befunde und Modellvorschläge mit Quellen ansehen, bearbeiten, verwerfen
  oder über den bestehenden Schreibpfad als Änderungsantrag einreichen. Niemals automatisch
  Kanon schreiben. Wissensrechte auch nach Änderungen der Sichtbarkeit erneut prüfen.
- [ ] Laufverwaltung: je Kampagne begrenzte aktive Arbeit; sichtbarer Umfang und Schätzung
  vor externem Egress, Freigabe je Lauf, Verbrauch/Kosten danach, Fehler und Abbruch bedienbar.
- [ ] Persistenz: additive aktuelle Bundle-Generation für neue Tabellen, Migration,
  Wiederherstellungsreihenfolge, Identitätszuordnung und Löschpfad vollständig anschließen.
  Unterbrochene Arbeit gehört in Sicherungen; keine Geheimnisse in Kampagnenexporten.
- [ ] Freier NPC-Generator: ohne manuell vorbereitete Figurvorlage neue, bearbeitbare NPCs
  erzeugen; aktuelle Kampagnenregeln, anschließende Erschaffung, Inventar und Beute über
  bestehende Domänen. Der bisherige Vorlagenweg bleibt benutzbar.
- [ ] GUI: klare Eingänge und Aufgabenfolge für alle neuen Funktionen, verständliche
  Leer-/Fehler-/Ladezustände, sichere Entwürfe, Desktop und Telefon, keine zweite Datenhaltung.
- [ ] Abschluss: gezielte Tests plus betroffene Konsumenten, Browserabläufe mit realen
  HTTP-/DB-Grenzen, `npm run typecheck`, `npm run build`, relevante Gates. Keine volle Suite.

## Ausführung

`python tools/review/workflow.py ... --workflow features` führt die Phasen Siedlung,
Chronist, NPC und Abschluss als LangGraph mit lokalem SQLite-Checkpointer.
Jede Phase hat unabhängige Arbeitspakete, Verifikation und eine ausdrückliche Reparaturkante.
Dateien, Tests und andere Effekte führt die autorisierte Sitzung aus; LangSmith bleibt aus.

## Aktueller Stand

Siedlungsbackend und GUI im Worktree implementiert; unabhängige Serverfälle,
28 Clientfälle, zwei Siedlungs-Browserabläufe und der bestehende taktische Browserkonsument
sind grün. Dabei wurden getrennte Kachelbudgets und die HTTP-503-Behandlung repariert.
Der Nutzer hat anschließend den vollständigen Merge nach `main` und einen tatsächlich
startbaren Desktop-Build angefordert. `main` enthält bereits weitere Kartenfunktionen
(Stand `07e9245`), die bei der Integration vollständig erhalten bleiben. Die kombinierte
Fassung muss nach dem Merge erneut gezielt geprüft werden.

Die angeforderte tiefe Kartenrecherche liegt in `docs/research/map-generation-20260908.pdf`.
Chronist, NPC und abschließende GUI-Gegenprüfung sind noch nicht umgesetzt und bleiben
Teil des aktiven Ziels. Die neue Lieferphase läuft über `--workflow delivery` im vorhandenen
LangGraph-Adapter; die Kartenrecherche über `--workflow map-research`.
