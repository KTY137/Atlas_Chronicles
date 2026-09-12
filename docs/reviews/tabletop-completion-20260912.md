# Spieltisch, Figuren und LAN — 2026-09-12

Auftrag: Kategorien per Drag-and-drop, gemeinsamer Tisch mit Karte und Figuren,
konfigurierbare animierte Würfel, englische ChronicleHeroes-Anzeige, vollständiger
Figurenbogen unter Ich/Me inklusive Bild und freier Punkte, stabile Menüs,
Regelaktivierung per Kontextmenü, GM-Entscheidungsbaum, LAN und Figurenlöschung prüfen.

Basis: `838190f`, sauberer Main. Keine Änderung an bestehenden Weltdaten zur Prüfung.

## Umsetzung und Dateizuständigkeiten

Der vorhandene LangGraph-Adapter `tools/review/workflow.py --workflow tabletop`
koordiniert Design → vier parallele Knoten → Integration → Verifikation und bei
Bedarf Reparatur → Übergabe. SQLite-Checkpoints liegen ausschließlich in `.local`;
LangSmith-Tracing bleibt aus. Python-Pin steht bereits in `tools/review/pyproject.toml`.
Dateien, Prozesse und Agenten werden ausschließlich durch die autorisierten Tools
der Sitzung verändert; der Graph fordert Arbeit an und hält Belege.

| Knoten | Zuständigkeit | Dateigrenze |
| --- | --- | --- |
| table_dice_gm | Tisch, Karte/Figuren, Würfel, GM-Baum | TableView, neue Tisch-/Würfel-/GM-Komponenten, dazugehörige Tests |
| characters_english | Ich-Bogen, freie Punkte, ChronicleHeroes-Englisch, Löschprüfung | MeineFigur, CharacterSheet, Charakterkomponenten, eigene Übersetzungsdatei und Tests |
| lan_network | Host, LAN, Netzwerkprüfung | desktop/server-Netzkonfiguration, LAN-Dokumentation und Tests |
| wiki_menus_rules | Kategorien, Menü-Lebenszyklus, Regelaktivierung | WikiNavigation, UI-Menüs, RuleForge, Integration, eigene Übersetzungen |

Gemeinsame Dateien (App, zentrale i18n-Einbindung, globale CSS-Dateien, STATUS,
Workflow und Paketmetadaten) liegen beim Hauptagenten. Andere Agenten melden nötige
Änderungen an diesen Grenzen; keine konkurrierenden Bearbeitungen.

## Designentscheidung

1. Vorhandene Projektionen, Szenen, Regelpakete, Transaktionen und Löschvorschauen
   bleiben die Daten- und Berechtigungsgrenze. Verdeckte Figuren dürfen am Tisch
   nicht durch eine neue Gesamtansicht sichtbar werden. Würfe bleiben serverseitig.
2. Ein neuer unabhängiger 3D-Spielzustand würde bestehende Karten, Berechtigungen
   und Würfelprotokolle doppeln. Gewählt ist ein räumlich gestalteter Tisch um die
   bestehende taktische Karte, mit erreichbaren Figuren und Würfeln.
3. Englisch ist eine Anzeigeübersetzung; IDs, gespeicherte Pakete und eigene
   Spielernamen bleiben stabil. Bestehende Regeln werden nicht still migriert.
4. LAN wird im vorhandenen Host-Modus fertiggestellt. Tests benutzen isolierte
   Datenbanken und mehrere Clients. Physische Erreichbarkeit von einem zweiten
   Rechner und dessen Firewall lässt sich nur an dieser Umgebung nachweisen.
5. Der GM-Baum ist ein speicherbarer Abenteuerbaum mit Szenen und Entscheidungen;
   der Nutzer hat diese Auslegung ausdrücklich bestätigt.

## Ergebnis

- Die Chronik-Navigation verschiebt Artikel per Ziehen oder Tastatur-Kontextmenü
  auch in leere und verschachtelte Kategorien. Ein Kategorienwechsel ersetzt nur
  die Ausgangszuordnung; weitere Kategorien bleiben erhalten. Die Einordnung in
  eine Artikelart löst alle Kategorien. Der GM-Endpunkt prüft den erwarteten Stand
  unter einer Transaktionssperre; Konflikte laden die aktuelle Ordnung neu.
- Der Spieltisch bündelt die erlaubten Figuren, die laufende taktische Karte und
  eine animierte Würfelschale. Anzahl und Seiten oder ein eigener Zahlenbereich
  sind einstellbar. Ergebnis, Bestätigung und Nachrechnen verwenden die vorhandenen
  serverseitigen Würfelbelege. Verborgene NPC-Würfe bleiben verborgen.
- Der private Abenteuerbaum speichert Szenen, Notizen, Entscheidungen und den
  aktuellen Knoten. Verknüpfte Spielszenen starten atomar mit dem Knotenwechsel.
  Veraltete Entwürfe werden erhalten und nicht über einen neuen Stand geschrieben.
- Der Figurenbogen unter Ich/Me zeigt Porträt, editierbare und berechnete Werte,
  Ressourcen, Fähigkeiten und freie Skill-Punkte. Originalbilder werden geprüft,
  revisioniert gespeichert und bei endgültiger Figurenlöschung mit entfernt.
- ChronicleHeroes hat eine englische Anzeige einschließlich Fertigkeiten,
  Fähigkeiten, Zuständen, Archetypen und Regelhinweisen. Übersetzt wird eine
  Anzeige-Kopie; Kennungen, Formeln, gespeicherte Pakete und eigene Texte bleiben
  die Originaldaten. Fehlende optionale JSON-Felder bleiben tatsächlich abwesend.
- Regelpakete bieten im Kontextmenü die Aktivierung an. Der konkrete angeklickte
  Stand öffnet die vorhandene Migrationsvorschau; erst die abschließende Aktivierung
  ändert die geltende Regelversion.
- Kontext- und Formelmenüs schließen bei den passenden Fokus-, Auswahl-, Escape-
  und Fensterereignissen. Native Auswahllisten behalten ihre normale Bedienung.
- Das Hostfenster bietet vor dem Weltstart eine konkrete Heimnetz-Adresse an.
  HTTP-LAN ist ausdrücklich auf eine private IPv4-Origin begrenzt; Host, Origin,
  WebSocket und Mitgliedschaft werden weiterhin geprüft. Ein UUID-Fallback nutzt
  Browserentropie, das Kopieren von Einladungen funktioniert auch ohne Clipboard-API.
  Anleitung: [LAN.md](../LAN.md).
- Native Sicherungen v21 enthalten Abenteuerbaum und Porträts. Ältere Formate
  bleiben lesbar; Sicherungen ohne diese Daten behalten ihr bisheriges Format.

## Prüfbelege

- Menüregressionen vor der Korrektur im echten Edge reproduziert: Fokuswechsel
  ohne Pointer und Fenster-Blur ließen das Kontextmenü stehen; nach Artwechsel
  blieb das Formel-Dropdown offen. Nach der Korrektur alle acht Prüfungen in
  `e2e/gui-interaction-regressions.spec.ts` bestanden, einschließlich bestehender
  Modal-/Vollbild-/Scroll-Regressionen.
- Wiki-Verschieben: 4 HTTP-Prüfungen bestanden (Rollen, Fremdkampagne, veralteter
  Stand, Erhalt weiterer Kategorien und unbekannter Artikel). Zusammen mit
  Navigationsmodell, Regelbibliothek und Formelblöcken 17/17 Prüfungen bestanden.
- `e2e/wiki-move-rules.spec.ts`: 2/2 vollständige Browserabläufe bestanden,
  einschließlich Drag-and-drop, Tastatur, Reload und Aktivierung erst nach Vorschau.
- Tisch/Abenteuerbaum: 67 gezielte Prüfungen bestanden, darunter HTTP-Sperren,
  konkurrierende Entwürfe, echte Szenenstarts, Würfel-Replay und Sicherungsrundlauf
  mit Bildbytes und bestätigtem Wurf in eine frische Datenbank.
- `e2e/tabletop-completion.spec.ts`: vollständiger Ablauf bestanden. Die Leitung
  legt einen Baum an, speichert ihn, startet damit eine echte vorbereitete Karte,
  würfelt drei Würfel im Bereich −2 bis 2, bestätigt und überprüft den Beleg. Ein
  zweiter Spielerclient sieht dieselben Würfel und keine GM-Notizen. Entscheidung
  und aktueller Knoten bleiben nach Reload erhalten. Zwei anfängliche Fehler
  waren im neuen Prüfskript (deutscher Stage-Schlüssel und Select-Locator).
- Figuren/Englisch: 45 gezielte Prüfungen und 2/2 vollständige Browserabläufe
  bestanden. Geprüft sind Upload mit Originalbytes, Entfernen, Reload, Figurenwechsel,
  Restpunkte von 15 auf 10, Inventar und Löschung mit Abbruch/Bestätigung/Referenzschutz.
  Zusätzlicher mobiler Sichtlauf bei 390 Pixeln bestanden; Punktekarten laufen nicht über.
- LAN-Browserabläufe über localhost und `192.168.178.54` bestanden: zwei getrennte
  Browserkontexte, Beitritt, Freigabe, Anmeldung nach Reload, Wiederanmeldung,
  Anwesenheit und WebSocket-Nachrichten. Echte fremde Host-/Origin-/WS-Anfragen
  werden abgewiesen. Der negative Host-Test verwendet `node:http`, weil das hier
  eingesetzte Node-fetch einen selbst gesetzten Host-Header ersetzt.
- Isolierter Electron-LAN-Smoke: 6/6 bestanden mit eigenem PostgreSQL 17,
  Desktop-Ersteinrichtung und separatem Edge-Beitritt. Netzwerkbindung und
  geordnetes Herunterfahren bestätigt. Lokaler Beleg:
  `.local/desktop-profiles/lan-rWiNbD/evidence.json`. Der erste Prüfversuch wartete
  unter paralleler Testlast zu kurz auf PostgreSQL; der Prüfstand wartet jetzt
  statusbasiert und der erste Host wurde geordnet gestoppt.
- Versions-, Architektur-, Sprach- und Asset-Gates bestanden: 4870 Sprachschlüssel
  in 23 Katalogen ohne Verstöße; 766 Quelldateien ohne Architekturverletzung;
  611 Assets in sieben aus ihren Quellen reproduzierten Paketen. Typprüfung,
  Clientbuild mit eigener Typprüfung und abschließender Desktopbuild bestanden.
  Die Desktopkopie enthält 182 Clientdateien und sieben geprüfte Assetpakete.
- Unabhängige Gegenprüfungen der Wiki-/Regel-/Menüänderungen sowie
  Tisch-/Würfel-/Sicherungsrechte ergaben keine weiteren konkreten Befunde.
- Vollständiger Vitest-Lauf mit zwei Workern: 3135 Fälle, davon 3058 bestanden,
  72 vom vorhandenen Prüfstand übersprungen und fünf zunächst fehlgeschlagen.
  Die Porträtdatei wurde noch vor ihrer korrigierten 404-CSRF-Erwartung geladen.
  Vier bestehende Siedlungs-/Native-v3/v6-Fälle überschritten unter der parallelen
  Last ihre bestehenden Zeitlimits (5, 15 bzw. 30 Sekunden).
  Gezielter Nachlauf aller vier betroffenen Dateien mit einem Worker: **53/53
  bestanden**, ohne geänderte Zeitlimits oder Produktionsänderungen. Der
  Determinismusfall benötigte dabei 1,33 Sekunden, die vorher betroffenen
  Sicherungsfälle 2,56 bis 9,47 Sekunden. Beide Originalberichte bleiben unter
  `.local/tabletop-20260912/vitest-full.json` und `vitest-followup.json` erhalten;
  der erste vollständige Lauf wird ausdrücklich nicht als fehlerfrei dargestellt.
- Insgesamt 15 unterschiedliche Browserfälle der fünf Feature-/Regressionsdateien
  bestanden, zusätzlich der mobile Sichtnachlauf und der native Desktop-Smoke.

## Grenzen und Übergabe

Die Prüfung nutzte ausschließlich isolierte Testwelten. Zwei Clients über die
echte LAN-IP auf diesem Rechner belegen HTTP-/WebSocket-Verhalten und den Hoststart;
ein zweites physisches Gerät samt dessen WLAN-/Firewall-Bedingungen wurde nicht
geprüft. Keine Firewall-Regeln oder Internetfreigaben wurden angelegt. Docker/TLS
und ein veröffentlichter Windows-Installer gehören nicht zum Nachweis dieses Laufs.

Der Tisch verwendet die bestehende 2D-Karte und Figurensteuerung; eine eigenständige
3D-Physiksimulation ist nicht Bestandteil. Die endgültige Figurenlöschung hält
bestehende Inventar- und Historienbezüge weiterhin geschützt und nennt die Gründe.

Während des Laufs erschien unabhängige Banner-/Theme-Arbeit einer Nachbarsitzung
in derselben Arbeitskopie. Diese wurde getrennt als `61a5e47` committed und bleibt
erhalten. Dieser Auftrag baut darauf auf und enthält ausschließlich seine eigenen Änderungen.
