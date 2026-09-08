# Atlas Chronicles — Feature-Checkout und nächste Lieferungen

Stand: 2026-09-08. Untersuchte GitHub-Basis: `1b5b7d123fdbb56c9203abf6ba93236571bb31d2`.
Dieser Bericht ergänzt den vorhandenen Handoff; er ersetzt weder STATUS noch die
Nachweise aus anderen Checkouts. Insbesondere ist lokal uncommittete Arbeit anderer
Sessions hier nicht verfügbar und wird nicht überschrieben.

## Ergebnis

Die [Featureliste](../FEATURELISTE.md) markiert 16 von 18 Punkten als abgeschlossen.
Das ist der dokumentierte Stand, keine hier wiederholte Gesamtabnahme. Wesentliche
Produktwege sind vorhanden: Wiki, Karten, Spieltisch, Figuren, Loot und Inventare,
Geld/Vitalwerte, Regelbau, Bilder sowie native Kampagnensicherung. Ein Neubau dieser
Funktionen würde vorhandene Implementierungen verdoppeln.

Offen markiert sind #15 (Chronist-Modellanbindung) und #16 (vollständiger freier
NPC-/Siedlungsablauf). Der aktuelle [STATUS](../../STATUS.md) nennt zusätzlich
Kartenregressionen, eine ältere Desktop-Installation und den GUI-Abschluss.
Die aktuellen Dateien in `packages/chronist` und die Chronist-Oberfläche sind kein
Beleg dafür, dass diese gesamte Lieferung bereits abgenommen ist.

## Priorisierte Abnahmeliste

| Priorität | Arbeit | Konkrete Abnahme |
| --- | --- | --- |
| P0 | Karten-Testverträge aktualisieren | Neun dokumentierte rote Fälle in `tactical-entities-review.test.ts` gegen den aktuellen Editor prüfen. Die drei Specs `genre-assets`, `map-settings`, `siedlung-workshop` an die aktuelle Bedienfolge anschließen. Alte Selektoren ersetzen, nicht fachliche Aussagen entfernen. Vorher/Nachher-Belege trennen echte Produktfehler von veralteten Tests. |
| P0 | Aktuelles Kartenstudio tatsächlich ausliefern | Client und Desktop aus demselben festen Commit bauen; Paket und installierte Anwendung getrennt prüfen. Räume/Türen/Möbel, Unterkarten, Neustart, Export/Restore und Erhalt vorhandener Profile nachweisen. Laut STATUS steht die installierte Kartenlieferung noch auf `ca3898b`; ein neuer Commit ist kein neuer Installer. PDF-Parität bleibt eine eigene Prüfung. |
| P1 | Chronist #15 abschließen | Vorhandene 027/V16-Arbeit zuerst integrieren statt einen zweiten KI-Pfad bauen. Provider und ausgehende Daten ausdrücklich wählen; Quellen und Wissensgrenzen prüfen. Modellfehler, Abbruch, Neustart und Wiederaufnahme behandeln. Vorschlag bearbeiten und menschlich bestätigen; kein automatischer Kanon. Native Sicherung/Wiederherstellung gegen den endgültigen Vertrag prüfen. |
| P1 | Freien NPC-Generator #16 vervollständigen | Bestehende Figurvorlagen und Beutetabellen verwenden. Typus und Siedlung/Kontext wählen, Vorschau bearbeiten und eine konkrete Figur ausdrücklich erschaffen. Der Ablauf muss unabhängig von einer schon erzeugten Siedlung erreichbar sein. Vorlagen, Instanzwerte, Besitz und Herkunft getrennt halten; Neustart und Export/Restore prüfen. |
| P2 | GUI-Abschluss | Arbeitswege statt zusätzlicher unverbundener Menüs: eindeutiger nächster Schritt von Vorlage zu Figur/Exemplar und weiter zum Tisch. Kartenhierarchie und Werkzeugzustand sichtbar halten. Desktop/Tablet/Mobilansicht, Tastatur, Fokus, lange deutsche/englische Texte und bestehende Themes prüfen. |

## In diesem Änderungssatz: Schnellzugriff

Ein Suchdialog erschließt 21 statische Ziele für die Spielleitung und 13 für Spieler:
Bereiche, vier Tischansichten und die acht Schmiedezugänge einschließlich Übersicht.
Er nutzt die bestehenden `stage`-/`tab`-/`forge`-Routen und denselben Entwurfsschutz.
Öffnen über die Kopfzeile oder Strg/⌘+K, Auswahl mit Pfeilen/Enter, Schließen mit
Escape oder einer sichtbaren Schaltfläche. Die Suche unterstützt mehrere Wörter,
Umlaute und englische Begriffe. Sie durchsucht ausdrücklich keine Kampagneninhalte.

Die Umsetzung und ihre Prüfgrenze stehen in der
[Designiteration](../../design/iterations/quick-navigation-20260908.md).
Keine neue Datenhaltung, kein Provider, keine Schemaänderung und keine neue Abhängigkeit.
Sprach-/Videochat bleibt entsprechend der bestehenden Produktentscheidung entfernt.

## Reihenfolge der nächsten Integration

Zuerst den Schnellzugriff mit dem tatsächlichen Client-Build, Sprachgate und den neuen
Browserfällen abnehmen. Danach die bereits dokumentierten Kartenregressionen und das
Desktop-Paket schließen. Chronist und NPC-Generator jeweils als vollständigen
Benutzerablauf liefern; nicht erneut die vorhandenen Vorlagen/Engine-Grundlagen bauen.
