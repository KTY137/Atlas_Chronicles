# Siedlungszonen und Expeditionsassets — 11.09.2026

Auftrag: neue Assets integrieren und die Karten-TODO aus Issue #3 weiter abarbeiten.
Basis: main `4f524ec4118cff7958a95b55227b41f0bf7a16ff` (PR #7).

## Assetintegration

`pk.expedition` 1.0.0 mit 24 Motiven war bereits über PR #5 auf main. Die
Manifest-/Byte-Auslieferung entdeckt es ohne einen weiteren registrierten Generatorstil.
Neu ist der verständliche Paketname im Editor. Ein Paketwechsel entfernt alte Kategorie-,
Genre- und Suchfilter, damit ein neues Paket nicht scheinbar leer ist. Alle ursprünglichen
Assetbytes, ihre Hashes und Lizenzen bleiben unverändert. Neutrale Expeditionsobjekte sind
manuell platzierbare Overlays in allen Settings, kein vorgespiegelter vollständiger Kartenstil.

## Roadmap 05: Viertel und Freiflächen planen

In der normalen Siedlungswerkstatt und an entsprechenden Karteneingängen gibt es einen
Zonenplan: Rechtecke mit Maus zeichnen oder mit Tastatur über Position/Größe in Prozent
anlegen, benennen, Nutzungsart und Dichte wählen und entfernen. Bis zu 16 Zonen. Nutzung:
Wohnen, Markt, Handwerk, Hafen, Adel, Arm und Freifläche. Die letzte überlagerte Nutzungszone
gewinnt; eine explizite Freifläche sperrt unabhängig von ihrer Reihenfolge.

Der gemeinsame, streng validierte V1-Vertrag erlaubt konvexe Polygone (3–32 Eckpunkte) in
normalisierten Kartenkoordinaten. Die Zeichenoberfläche erzeugt Rechtecke; importierte konvexe
Polygone bleiben bei Positions-/Größenänderungen erhalten. Selbstüberschneidungen, konkave
Masken, doppelte IDs, übergroße Namen/Zonenlisten und nicht endliche Koordinaten werden vor
der Generierung zurückgewiesen. Leere Namen während der Eingabe sind erlaubt, aber blockieren
eine Vorschau und Speicherung bis zur Korrektur.

Gebäude werden als ganze Dachumrisse geprüft, nicht nur nach ihrem Mittelpunkt. Die Dichte
reduziert deterministisch bereits passende Bauplätze; sie schiebt keine Ersatzgebäude nach.
Nutzungsarten wählen echte, settingabhängige Gebäudeprogramme, deren passende Innenräume
über den vorhandenen Betreten-Vertrag erzeugt werden. Hafenzonen verlangen ein reales Ufer
innerhalb von vier Bauzellen, außer im Science-Fiction-Setting (Raumhafen).

Das vorhandene Relief und Hauptstraßennetz werden nicht umgeformt. Zonen wirken nach der
ursprünglichen Parzellenwahl. Dekorationen können sich mit der Bebauung ändern. Nicht jeder
Vorgabe kann auf jedem Gelände ein Gebäude entsprechen; die Vorschau zeigt je Zone die
Gebäudezahl und insgesamt die freigehaltenen Bauplätze. Auch eine völlig unbebaute Karte ist
als Ergebnis einer Freiflächenplanung gültig, ohne Geistergebäude oder ungültige Unterknoten.

Die Zonen reisen mit portablen Kartenvorlagen und der gespeicherten Generatorherkunft.
Serverunterstützung wird als `siedlungsplanung:1` erklärt. Ältere Server bieten das Werkzeug
nicht an; inkompatible Vorlagen werden nicht stillschweigend ignoriert. Wechsel zu Gebäude,
Höhle, Region oder Anlage entfernt bzw. verweigert unpassende Planungseinstellungen.

**Keine stille Migration:** Ohne Plan oder mit leerem Plan bleibt die komplette Siedlung v8
unverändert. Aktive Zonen benutzen Siedlung v9 mit eigenen, aus dem vollständigen Plan
abgeleiteten IDs. Ein Golden-Hash gegen die unveränderte Basis belegt den vollständigen
Altfall: `647532b9e471b04ae647f9d62bdf1631509ab3f6f3da4f6e18be608bcf39e6f8`.
Es werden keine bestehenden Karten neu generiert oder bearbeiteten Inhalte überschrieben.

## Nachweis vor dem ersten Remote-Commit

- 1.076 reale Vitest-Tests in 60 Dateien bestanden, 0 Fehler, 0 übersprungen.
  Darunter 74 neue Fälle (24 Vertrag, 11 Generator, 9 Client/Vorlagen,
  25 Expeditionsplatzierung, 5 HTTP/Persistenz/Berechtigung).
- Der neue Generatortest wurde gegen die unveränderte Datei ausgeführt: fünf Fälle rot,
  sechs grün. Zwei Fehler der ersten Implementierung (ersetzte Bauplätze statt echter
  Dichteänderung und unzureichend abgeleiteter Zufall) wurden gefunden und behoben.
- Nach der letzten Präzisierung zur Vorrangregel bei Dichte 0 liefen die elf Generatorfälle
  erneut erfolgreich. Ein späteres dichteres Viertel darf eine frühere Null-Dichte-Zone
  überlagern, niemals aber eine explizite Freifläche.
- Root-Typecheck, Client-Typecheck/Produktionsbuild, Sprach- und Boundary-Gates bestanden.
- Alle zehn Node-Prüfungen des unveränderten Expeditionspakets bestanden.
- HTTP-Fälle prüfen Vorschau ohne Speicherung, idempotentes Speichern, tatsächliches
  Betreten einer Werkstatt, V1-Plan in nativer Sicherung/Wiederherstellung und GM-Rechte.

Der lokale Chromium-Testserver wird durch `ERR_BLOCKED_BY_ADMINISTRATOR` gesperrt.
Keine Umgehung. `e2e/map-zones-assets.spec.ts` wird im bestehenden GitHub-Kartenworkflow
zusammen mit beiden bisherigen Burg-/Schlossabläufen ausgeführt. Neue Abläufe: Plan per
Tastatur und Maus, leeren Entwurfsnamen berichtigen, Freiflächenwirkung, Vorlagendatei samt
Hash-Rundlauf, Speichern/Reload; alle 24 Vorschaubilder laden, inkompatible Filter wechseln,
zwei unterschiedlich große Expeditionsobjekte gedreht platzieren und nach Reload verifizieren.
Die Browserfehlerliste muss leer sein. Browserabnahme vor dem ersten CI-Ergebnis noch offen;
das endgültige Ergebnis und der integrierte Commit werden im PR/Issue protokolliert.

## Verbleibende Grenzen

Dies ist Zonenplanung **vor** der Erzeugung, keine räumliche Teil-Neugenerierung vorhandener
Karten (Roadmap 10) und kein frei gezeichnetes Straßen-/Küsten-Skizzensystem (09).
Der Straßen-Netzeditor (06), Geschosse (07) und die weiteren Punkte bleiben offen.
Kein neues Windows-Paket/Installer oder installierter Desktop-Smoke. Das globale Gate
hatte auf der Basis die separat dokumentierten 41 Loot-Reproduktionsabweichungen; keine
Lootdateien oder globalen Prüf-/Schutzregeln werden in diesem Ausbau geändert.
