# Verschachtelte Karten

Der Atlas verbindet Weltkartenmarker mit dauerhaft gespeicherten Szenenkarten.
Ein vorhandenes Eingangs-Icon öffnet dieselbe Unterkarte bei jedem Besuch. In
deren Räumen lassen sich weitere Unterkarten erzeugen oder vorhandene
Szenenkarten verbinden. Jede Karte behält ihre eigene Identität, Geometrie und
Revisionsgeschichte.

## Bedienung

1. Als Spielleitung den **Atlas** öffnen und **Karte aus einem Wiki holen**
   wählen. Dort Adresse des Wikis und Name der Kartenseite angeben — die App
   holt Karte und Kartenbild selbst und schreibt mit, woher beides stammt.
   Daneben liegen **Kartenbild hochladen** (eine Karte, die nur aus einem Bild
   besteht: Inkarnate, Wonderdraft, ein Scan) und **Beispielkarte laden** für
   die mitgelieferte Andaria-Quelle mit ihren 190 Ortsmarkern. **Karte
   importieren** nimmt weiterhin Azgaar Full JSON oder Fandoms
   InteractiveMap-JSON von der Festplatte an. Alle Wege enden im selben Import;
   wiederholtes Laden derselben Quelle öffnet den gespeicherten Stand.
2. Einen Ort auf der Karte oder in der Ortsliste auswählen. **Unterkarte
   erzeugen** legt einen Grundriss an; **Vorhandene Karte verbinden** ordnet
   eine bestehende Szenenkarte diesem Ort zu.
3. Ein verbundenes Karten-Icon zeigt einen Eingang. Ein Klick darauf öffnet
   die Unterkarte unmittelbar. Der Listenfilter **Mit Unterkarte** findet
   bereits verbundene Orte ohne Suche auf der Zeichenfläche.
4. In der Unterkarte einen Raum oder seinen Marker auswählen und dort eine
   weitere Ebene anlegen. Dieselben Aktionen stehen in der Raumliste bereit.
5. **Karte bearbeiten** verwendet den vorhandenen Szenenkarteneditor und die
   Szenenplanung. **Kartenrevision speichern** schreibt eine neue Revision.
   **Eine Ebene zurück**, die Pfadnavigation und **Hauptkarte** führen zurück.
   Beim Verlassen ungespeicherter Änderungen erscheint eine Rückfrage.

`atlasMap` und `atlasChild` in der URL erhalten die geöffnete Karte über einen
Seitenneustart. Die Auswahl gehört zur jeweiligen Kampagne; ein Kampagnenwechsel
entfernt diese Kartenparameter. Die Hauptkartenkamera bleibt beim Wechsel in
eine Unterkarte innerhalb der laufenden Ansicht erhalten. Diese Kamera ist
kein dauerhaft gespeicherter Bestandteil der Karte.

## Datenvertrag

Eine Kartenadresse besteht aus
`(campaign_id, parent_kind, parent_map_id, knoten_id)`. `parent_kind` ist
`atlas` oder `tactical`. Identische Raum-IDs in verschiedenen Karten sind
damit verschiedene Adressen. Der Eingang zeigt auf eine gewöhnliche Karte in
`tactical_maps`; es gibt keinen zweiten Speicher für Unterkarteninhalte.

| Bestand | Bedeutung |
| --- | --- |
| `atlas_maps`, `atlas_nodes` | Importierte Weltkarte und kanonische Knoten |
| `tactical_maps` und vorhandene Revisionstabellen | Generierte oder verbundene Szenenkarte samt Bearbeitungen |
| `tactical_map_nodes` | Erhaltene Generator-Knoten mit ursprünglichen Kindkeimen |
| `betreten_karten` | Kartenadresse, Zielkarte und gegebenenfalls Generierungshash |
| `betreten_command_receipts` | Dauerhafte Bestätigung eines Befehls für Wiederholungen |

Jede Unterkarte hat höchstens einen Eingang als Elternbeziehung. Selbstbezüge,
Kreise, fremde Kampagnen und bereits anderweitig zugeordnete Zielkarten werden
abgewiesen. Das Modell bildet einen Baum mit voneinander unabhängigen
Koordinatensystemen. Der Übergang erfolgt durch einen benannten Eingang; Zoomen
auf der Weltkarte erzeugt keine neue Ebene.

Für neue Eingänge muss der Client die aktuelle Elternversion mitsenden.
Generierung beziehungsweise Zuordnung, Versionsänderung, Adresse und
Befehlsbestätigung werden gemeinsam transaktional gespeichert. Ein erneuter
Besuch erzeugt keine zusätzliche Karte. Wiederholungen derselben `commandId`
mit identischem Inhalt liefern die gespeicherte Antwort; abweichender Inhalt
führt zu einem Konflikt. Konkurrierende Änderungen werden nicht still ersetzt.

Der Server bestimmt den Kindkeim. Ein umbenannter Ort würfelt seine Unterkarte
nicht neu aus. Generierte Räume behalten ihren ursprünglichen Kindkeim;
gezeichnete oder importierte Räume erhalten einen stabil aus Kampagne, Karte
und Region abgeleiteten Keim. Ein manueller Kartenlink hat keinen
Generierungshash. Ein Eingang bleibt an eine vorhandene Region gebunden; der
Editor darf diese Region nicht mitsamt einem bestehenden Eingang entfernen.

## HTTP-Schnittstellen

Alle Pfade beginnen mit `/api/campaigns/:campaignId` und verwenden die
bestehende Sitzungsauthentifizierung.

| Methode und Pfad | Vertrag |
| --- | --- |
| `POST /maps/aus-wiki` | Body `{wiki, titel}`; holt Kartenseite und Kartenbild aus dem genannten Wiki. Antwort `{id, report, unchanged, bild}` |
| `POST /maps/beispiel` | Importiert die mitgelieferte Andaria-Quelle samt Bild; gleiche Antwort |
| `POST /maps/bild?dateiname=…` | Rohe Bildbytes; erzeugt eine Karte, die nur aus diesem Bild besteht |
| `POST /maps/import` | Body `{json: string}` für Azgaar oder Fandom InteractiveMap |
| `GET /maps/:id` | Sichtbare Atlasprojektion; für die Spielleitung zusätzlich `version`, `herkunft`, `background`, pro Knoten `canEnter`, `description` und gegebenenfalls `childMapId` |
| `GET /maps/:id/image` | Das Kartenbild aus dem Bildbestand der Kampagne, gemessener Typ, `private, no-store` |
| `GET /maps/:parentKind/:parentMapId/children` | `{nodes, version, ancestors}`; jeder Knoten enthält `knotenId`, `titel`, `x`, `y`, `canEnter`, `vorhandeneKarteId` |
| `GET /maps/:parentKind/:parentMapId/knoten/:knotenId/betretbar` | Beschreibt einen konkreten Eingang und die Elternversion |
| `POST /betreten` | Erzeugt oder verbindet eine Unterkarte; Antwort `{mapId, erzeugt, keimHash}` |
| `GET /tactical/maps/:id` | Vorhandener Leser für die aktuelle Szenenkartenrevision |

Der neue Client sendet an `/betreten` explizit:

```json
{
  "commandId": "eine-eindeutige-befehls-id",
  "parentKind": "atlas",
  "parentMapId": "weltkarten-id",
  "knotenId": "orts-id",
  "expectedVersion": 1,
  "name": "Optionaler Kartenname"
}
```

Zum Verbinden ersetzt beziehungsweise ergänzt `targetMapId` die Generierung.
`name` ist nur ein Anzeigename. Der Request enthält keinen Generator-Keim.
Die alte unvollständig adressierte Route `/knoten/:knotenId/betretbar` bleibt
nur bei eindeutiger Atlasadresse verwendbar.

Atlasmarker verwenden die Icons `place`, `city`, `castle`, `cave`, `ruin` und
`portal`. Eine vorhandene Unterkarte erhält `portal`. Kategorienfarben und
Quellsymbole bleiben Metadaten der Marker. Die Unterkartenreferenzen werden
zusammen mit der Kartenprojektion geladen; es braucht keinen einzelnen
HTTP-Aufruf je Weltkartenmarker.

## Sichtbarkeit

Import, Generierung, Zuordnung, Unterkartennavigation und rohe
Szenenkartenentwürfe sind Funktionen der **Spielleitung**. Sie erteilen keine
neuen Spielerrechte. Spieler erhalten weiterhin nur Atlasorte, die ihre
bestehende Wissens- und Freigabeprojektion erlaubt. Private Kindkeime,
Unterkarten-IDs und der vollständige beschriftete Andaria-Rasterhintergrund
werden ihnen nicht ausgeliefert.

Auch die Bildroute prüft Kampagne und Rolle bei jedem Aufruf. Der Server liest
dafür ausschließlich die bekannte lokale Bilddatei; hochgeladene Quellen
können keinen externen Bildabruf oder frei gewählten Dateipfad veranlassen.
Für Spielersichten bleiben die vorhandenen Szenenprojektionen und ihre
Freigabewege maßgeblich.

## ERON-Quelle und Darstellung

Die vollständige Quelle liegt unter
[`design/fixtures/eron/map-andaria.json`](../design/fixtures/eron/map-andaria.json).
Sie stammt von [Karte:Andaria im ERON Wiki](https://eron.fandom.com/de/wiki/Karte:Andaria),
Seite 280, Revision 1149 vom 7. Dezember 2025; abgerufen am 7. September 2026.
Die [Provenienzdatei](../design/fixtures/eron/map-andaria.README.md) nennt den
API-Aufruf, die Koordinaten und die Bildnachweise. Textquelle: ERON-Wiki-Autoren,
CC BY-SA 3.0. Bildherkunft und lokale Nutzungserlaubnis stehen in
[`media/LIESMICH.md`](../design/fixtures/eron/media/LIESMICH.md).

Die Quelle enthält 190 Marker und 16 Kategorien. Der Import ergänzt einen
Weltknoten, deshalb zählt die ungefilterte Ortsliste 191 Einträge. Stabile
Quellmarker-IDs bestimmen die Knotenidentität. Titel, Beschreibung und
Kategorien werden nicht als erfundene Wiki-Artikel veröffentlicht. Politische
Kategorien erzeugen keine räumliche Verschachtelung.

Die **Markerbeschreibung** kommt seit dem Kartenabruf mit in die Ortsansicht:
`GET /maps/:id` liefert sie der Spielleitung je Knoten als `description`, die
Ortsansicht zeigt sie unter „Aus der Quelle". Sie bleibt Quelltext — kein
Artikel, kein Kanon, keine Freigabe. Wer daraus einen Artikel machen will, tut
das ausdrücklich über „Mit dem Wiki verbinden".

Das passende Bild ist `Andaria_03.02.2024.webp`, 8192 × 8192 Pixel. Die Quelle
verwendet `xy` mit Ursprung unten links; im Renderer gilt `[x, 8192-y]`.
Der Client lädt das autorisierte Original und verkleinert es zur Anzeige auf
2048 × 2048 Pixel. Die Marker behalten ihre ursprüngliche Genauigkeit im
8192er-Koordinatensystem. Hineinzoomen liefert daher keine zusätzlichen
Rasterdetails.

Das Wiki wird **nur** abgefragt, wenn die Spielleitung „Karte holen" drückt:
nie beim Start, nie beim Anzeigen, nie beim Wiederherstellen einer Sicherung
und nie ausgelöst durch importierten Inhalt. Der Abruf spricht ausschließlich
`https:`, verweigert private und Rückschleifen-Ziele, folgt Weiterleitungen von
Hand (`redirect: "manual"`, höchstens drei, jede erneut geprüft) und bricht bei
harten Zeit- und Größengrenzen ab (Karte 8 MiB, Bild 24 MiB). Das Kartenbild
wird als Kampagnendatum im Bildbestand abgelegt, nicht als Datei neben dem
Programm — die Herkunft der Karte steht in `atlas_karten_herkunft`
([Kampagnenformat v19](CAMPAIGN_FORMAT_V19.md)), das Lizenzurteil des Bildes
fällt derselbe Leser wie beim Artikelimport ([WIKI_MEDIEN](WIKI_MEDIEN.md)).

Die importierte Originalquelle einschließlich SHA-256 bleibt als Artefakt
`eron-map` erhalten. Der native Validator leitet die normalisierten Daten
erneut aus dieser Quelle ab und weist manipulierte Marker zurück.
Verschachtelungen und erhaltene Generator-Knoten gehören zum expliziten
[nativen Kampagnenformat v6](CAMPAIGN_FORMAT_V6.md); Wiederherstellung übernimmt
Karten und Revisionen, ohne sie erneut zu generieren. Das gebündelte
Andaria-Hintergrundbild ist kein neu eingebetteter Archivbestandteil.

## Grenzen dieser Erweiterung

- Die erzeugten Unterkarten sind bearbeitbare schematische Grundrisse aus
  dem vorhandenen Generator. Sie rekonstruieren keine tatsächlichen ERON-Städte
  oder im Wiki beschriebenen Gebäude.
- Eine vorhandene Szenenkarte kann einem Eingang zugeordnet werden. Eine
  Oberfläche zum Umhängen oder Auflösen bestehender Kartenbeziehungen ist
  noch nicht enthalten.
- Es gibt keinen neuen Upload beliebiger Rasterbilder und keinen
  Terrain- oder Texturpinsel. Der bestehende Szenenkartenimport und das
  Zeichnen von Wissensregionen im Szenenplan bleiben eigene Funktionen.
- Eine Atlasfreigabe macht eine private Unterkarte nicht automatisch für
  Spieler betretbar. Für gemeinsame Spielszenen gelten die bisherigen
  Veröffentlichungs- und Projektionswege.

## Prüfpunkte

Die Parser- und Servertests prüfen reale Markerkoordinaten, stabile Identitäten,
Importwiederholung, Rechte, Bildauslieferung und manipulierte Archive. Die
Betreten-Tests decken verschachtelte Adressen, konkurrierende Befehle,
vorhandene Zielkarten und ungültige Beziehungen ab. Der Browsertest
[`e2e/nested-maps.spec.ts`](../e2e/nested-maps.spec.ts) führt Import, zwei
Unterkartenebenen, gespeicherte Bearbeitung, Wiederöffnung und mobile
Navigation durch. Ein sichtbares Canvas allein belegt noch keine erfolgreich
geladenen Bild- oder Objekttexturen; diese Darstellung muss zusätzlich über
Netzwerkantworten beziehungsweise die erzeugten Ansichten geprüft werden.
