# Schmiede, Charaktererstellung und Steam-Vorbereitung

Auftrag vom 12.09.2026: Fehler finden, die bestehende GUI weiterentwickeln und
insbesondere Regeln und Charaktererstellung übersichtlicher machen. Separater
Agent für die Steam-Vorbereitung. Ausgangspunkt: `4ed7b63`, saubere Arbeitskopie.

## Gestaltung

Die vorhandene warme Werkstattgestaltung bleibt die Grundlage. Drei Varianten:
(1) reine Verdichtung der bestehenden Formulare; (2) vollständiger Wizard;
(3) klare Aufgabenübersicht mit gegliedertem Editor, direkten Sprüngen und
sichtbarem nächsten Schritt. Gewählt ist (3): erfahrene Nutzer behalten den
direkten Zugriff, Einsteiger erhalten Orientierung. Ein erzwungener Wizard
erschwert das Überarbeiten komplexer Regeln; reine Verdichtung löst die
fehlende Orientierung nicht. Datenformate und Berechtigungsgrenzen bleiben
bestehen. Die zweite Prüfung erfolgt gegen die implementierten Browserabläufe.

## Arbeitspakete und Dateigrenzen

- `rule_forge`: RuleForge, Regel-Editoren, rule-forge.css, passende Tests.
- `character_creation`: ActorWorkbench, FigurAntrag, eigene Charakter-CSS, Tests.
- `steam_preparation`: Desktop-Paketierung und Steam-Dokumentation/-Werkzeuge.
- `forge_shell`: ForgeWorkbench, authoring.css, gemeinsame Integration und i18n.

Neue Übersetzungen werden je Paket in eigenen Sprachdateien gesammelt, um
Dateikonflikte zu vermeiden. Keine fremden Änderungen überschreiben.

## Abnahme

Reproduzierte Funktionsfehler erhalten gezielte Regressionen. Desktop- und
schmale Browseransichten, Tastaturbedienung, Entwurfsschutz, Paketprüfung und
Figurerstellung werden geprüft. Version, Grenzen, Sprache, Assets, Typprüfung,
Build und passende Tests liefern die Nachweise. Steam-Artefakte werden lokal
vorbereitet und geprüft; Kontoeinrichtung, App-/Depot-IDs und tatsächliche
Veröffentlichung werden nur als vorhanden ausgewiesen, wenn belegt.

Koordination: vorhandener LangGraph-StateGraph `forge-release` mit lokalem
SQLite-Checkpointer; LangGraph 1.2.11 geprüft, Tracing ausgeschaltet.

## Zweite Gestaltungs- und Funktionsprüfung

Die implementierte Variante wurde im echten Browser bei 1920 und 1440 Pixeln
sowie auf 390 Pixeln Breite angesehen. Die zwei Haupteinstiege tragen die
Übersicht; die Regelschmiede trennt Bibliothek, Paketübersicht und gruppierte
Bearbeitung. Die Charakterwerte stehen am Desktop nebeneinander und auf dem
Telefon untereinander. Abschnittssprünge setzen den Tastaturfokus sichtbar.
Die englische Übersicht verwendet dieselbe Hierarchie.

Eine unabhängige Quellprüfung fand drei zusätzliche Entwurfsverluste:
aktualisierte Vorlagenrevisionen, vorübergehende Ladefehler und das Löschen
eines anderen Bibliothekspakets. Alle drei wurden reproduziert und mit
gezielten Regressionen korrigiert. Die echten Browserabläufe belegen
schreibgeschützte Attributauswahl, Entwurfsschutz und die Übernahme einer
gespeicherten Vorlage in eine eigenständige Figur mit unveränderten Werten.

Die erste native Prüfung fand eine alte Migration im erzeugten Desktop-
Verzeichnis. Eine vollständige, auf das eigene Build-Verzeichnis begrenzte
Bereinigung behebt den Fehler; sechs Dateisystemregressionen und die
unabhängige Windows-Junction-Prüfung sichern den neuen Build ab.
Das abschließende Steam-Staging verwendet den neu gebauten Desktop vom
12.09.2026, 21:34:05 UTC. Es enthält die aktuelle GUI, die exakt 36 aktuellen
Migrationen und den korrigierten Atlas-Lizenztext. Prüfungen und verbleibende externe Release-Schritte stehen
in `docs/reviews/forge-clarity-20260912.md` und
`docs/steam/verification-20260912.md`.
