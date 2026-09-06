# Szenenkarte im Produkt

Die Tischansicht enthält **Szenenkarte**. Die Spielleitung kann eine Karte importieren,
Wissensregionen anlegen, Figuren für eine Szene vorbereiten und die gespeicherte Szene
beginnen. Spieler sehen die Projektion ihres ausdrücklich gewählten Wissensblicks.

## Karte vorbereiten

1. Unter **Karte importieren** eine UVTT-Datei (`.dd2vtt`, `.df2vtt`, `.uvtt`) oder ein
   natives `TacticalMapDocumentV1` wählen. Native Dokumente können ein passendes PNG/WebP
   mitbringen; UVTT enthält das Bild in der Originaldatei.
2. Name, Urheber und Lizenz angeben. Vorschau und Fidelity Report prüfen und die Karte
   ausdrücklich in die Kampagne übernehmen. Originalquelltext und Herkunft bleiben erhalten.
3. Unter **Karte & Vorbereitung** die importierte Karte wählen. Regionen mit Klicks oder
   über die Eckpunktliste zeichnen. Eine Region mit einem bestehenden Artikel oder einer
   genauen Passage verbinden und **Kartenrevision speichern**. Unverknüpfte Regionen
   bleiben privat. Der Plan erzeugt keine Wiki-Artikel und erteilt kein Wissen.
4. Eine unter **Szenen** angelegte Szene wählen, Figuren hinzufügen, Positionen und Höhe
   über Karte oder Liste bearbeiten und **Karte & Figuren für Szene speichern**.
5. **Vorbereitete Szene beginnen** übernimmt die gespeicherte Kartenrevision und die
   Figurenpositionen in einen eigenen Sitzungssnapshot. Zwischenzeitlich geänderte Szenen
   oder Pläne müssen vor dem Start erneut geprüft werden.

Eine laufende Szene bleibt von späteren Kartenrevisionen und Planänderungen getrennt.
Ein wiederholter Start derselben aktiven Szene erzeugt keinen zweiten Snapshot. Ein neuer
Start nach dem Ende verwendet die dann gespeicherte Vorbereitung.

## Am Tisch

Karte ziehen, Mausrad beziehungsweise Zoomtasten, Pfeiltasten und **Ganze Karte** bedienen
die Kamera. Bewegliche Figuren lassen sich ziehen. Die Figurenliste bietet dieselben
serverseitigen Befehle mit genauen X/Y-Werten, skalarer Höhe, Drehung und Größe; sie bleibt
auch bei fehlender Grafikbeschleunigung bedienbar. Rasteranzeige und Einrasten sind lokal.

Die Spielleitung kontrolliert die Figuren der Szene. Spieler dürfen nur ausdrücklich
kontrollierte Figuren in ihrer aktuellen sichtbaren Kartenregion bewegen. Andere bekannte
Figuren sind gegebenenfalls sichtbar, ohne deren Schreibversion zu erhalten. Eine Bewegung
erteilt kein neues Wissen. Sichtprüfung und Berechtigung erfolgen erneut auf dem Server.

**Rücknahme** ist eine neue, geprüfte Änderung an Position beziehungsweise Portalzustand.
Die letzten 50 Änderungen bilden einen begrenzten Undo-Verlauf; ältere Befehle behalten
minimale Bestätigungen für wirkungslose Wiederholungen. Wiki-Wissen, Würfel und Kanonbelege
werden durch ein Karten-Undo nicht zurückgenommen.

## Bilder und Wiederherstellung

Der Server decodiert PNG/WebP unter festen Pixel-, Speicher-, Zeit- und Warteschlangenlimits.
Unbekannte Pixel werden vor jeder Verkleinerung entfernt. Auch ein niedrig aufgelöstes
Kachelbild enthält keine Farbanteile aus geheimen Bildbereichen. Private Bildkacheln werden
vor und nach der Verarbeitung erneut autorisiert. Ein abgelehnter Sichtstand leert bereits
angezeigte Browsertexturen und den privaten Kachelcache sofort, auch wenn die normale
Aktualisierung der Projektion gerade nicht erreichbar ist.

Native **`.chronicle` v3** enthält Originalquellen, Herkunft, Kartenrevisionen, Bindungen,
Pläne, Sitzungssnapshots, aktuellen Zustand und die begrenzten Undo-/Retry-Belege.
Rekonstruierbare Bildkacheln gehören nicht ins Archiv. V1/v2 benötigen ein ausdrückliches
Upgrade; siehe [Format](CAMPAIGN_FORMAT_V3.md) und [Restore](CAMPAIGN_RESTORE.md).

## Grenzen dieser Ausbaustufe

- Keine automatische Sichtlinie, Kollisionsprüfung oder Lichtsimulation. Wände, Portale,
  Lichtdaten und gemeldete Konvertierungsverluste bleiben erhalten.
- Regionen können in der Oberfläche verknüpft werden. Die persistenten Contracts unterstützen
  außerdem Stamp-/Place-Bindungen; deren vollständige Autoren- und Anzeigeoberfläche steht aus.
- Kein Terrain-Paint, Assetkatalog oder eingebetteter Fremdgenerator.
- Funktionale Drei-Browser- und Pixelprüfungen ersetzen nicht S-K1/S-T1 auf der vorgesehenen
  Referenzhardware. Größenlimits bei der Bildannahme sind keine Leistungszusage.

Die aktuellen Prüfergebnisse stehen in `STATUS.md`; der vollständige Arbeitsumfang bleibt
im [Implementierungsplan](IMPLEMENTATION_PLAN.md).
