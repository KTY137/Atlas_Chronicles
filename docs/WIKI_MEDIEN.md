# Wiki-Medien — Bilder kommen mit

**Stand 2026-09-07.** Bilder eines importierten Wikis sind jetzt Teil der Chronik: als Passage im
Artikel, als Datei mit belegter Herkunft, und als Zeile im Kampagnenpaket. Vorher wurde jedes Bild
in Quarantäne geschoben — der Leser sah Wikitext in einem Kasten „nicht umgewandelt" dort, wo das
Portrait stehen sollte, und der Importbericht zählte das Portrait jeder benannten Figur als Verlust.

## Der Weg in zwei Schritten, und warum es zwei sind

```text
Artikel importieren            Bilddateien holen
─────────────────────          ────────────────────
Wikitext → Passagen            Browser lädt beim Quell-Wiki
[[Datei:…]] → Bildpassage      → PUT an den Server
Dateiverzeichnis → Herkunft    → Magic Bytes messen
Lizenzurteil je Datei          → speichern, Widerspruch melden
(Sekunden)                     (wiederholbar, abbrechbar)
```

Ein Artikelimport, der auf hundert CDN-Antworten wartet, sieht für die Spielleitung aus wie ein
Absturz. Und ein Bild, das nicht ankommt, darf den Text nicht mitreißen. Deshalb sind es zwei
Schritte mit einer gemeinsamen, stabilen Kennung: die **Asset-Id** wird aus dem normalisierten
Dateinamen und dem Import-Scope abgeleitet, überlebt einen Reimport und macht das Nachholen der
Bytes zu einem Nachtrag statt zu einem zweiten Import.

Beide Einstiege liefern den Bestand: der Live-Import lädt ihn selbst über
`prop=imageinfo|categories|fileusage|revisions`, der Datei-Upload nimmt eine dritte, **freiwillige**
`media.json` entgegen. Ohne sie importieren die Artikel vollständig — die Bilder heißen dann eben
nur beim Namen, und der Bericht sagt das auch so.

Die Bytes holt der **Browser**, nicht der Server. Das ist kein Umweg, sondern die sichere Richtung:
ein Server, der eine vom Nutzer genannte Adresse abruft, ist ein Werkzeug zum Abtasten fremder
Netze. Das Bild-CDN erlaubt den direkten Abruf per CORS (`access-control-allow-origin: *`), und was
der Browser hochlädt, vermisst der Server danach selbst.

## Die drei Regeln

### 1. Das Format kommt aus den Bytes, nie aus dem Namen

Fandoms CDN transkodiert Uploads still nach WebP und liefert sie unter dem ursprünglichen
`.jpg`-Namen aus. Alle zwölf von Hand geernteten Dateien in `design/fixtures/eron/media/` kamen so
an. Ein Importer, der der Endung traut, schreibt falsch etikettierte Dateien in den Korpus — und
eine falsch etikettierte Datei ist eine Lüge, die jeden Export überlebt.

`packages/io/src/bild.ts` liest PNG, JPEG, WebP und GIF aus dem Containerkopf, misst Breite und
Höhe und rechnet den SHA-256. Was es nicht ehrlich vermessen kann, weist es zurück, statt zu raten.
SVG fehlt bewusst: das ist ein skriptfähiges Dokument, kein Bild, und gehört nicht hinter ein
`<img>` im Browser einer Leserin.

Der Widerspruch zwischen behauptetem und gemessenem Typ wird **aufbewahrt und angezeigt**, nicht
geglättet.

### 2. Eine unbekannte Lizenz wird importiert, markiert — und nie als frei behandelt

Am echten Korpus gemessen: von 41 Dateien nennen **38 überhaupt keine Lizenz**. Genau zwei nennen
eine (Fandoms eigene Beispieldatei unter `PD`, ein Favicon mit `{{CC-BY-SA}}`), und genau eine
erklärt das Wiki selbst zum Bildzitat, also zu fremdem Werk.

`packages/io/src/medien.ts` ist deshalb pessimistisch gebaut:

| Urteil | Bedingung |
| --- | --- |
| `frei` | Eine **benannte** Lizenz: CC0, CC BY, CC BY-SA, GFDL, gemeinfrei, Public Domain |
| `zitat` | Das Wiki erklärt die Datei selbst zum Zitat oder zu Fair Use |
| `unbekannt` | Alles andere — **einschließlich `{{Selbst erstellt}}`** |

„Selbst erstellt" nennt einen Urheber. Es erteilt keine Bedingungen. Das als Lizenz zu lesen hieße,
die häufigste Selbstauskunft jedes Wikis in eine Erlaubnis zu verwandeln, die niemand gegeben hat.
Jedes Urteil führt den Text mit, auf dem es beruht, damit ein Mensch es überstimmen kann — und eine
solche Überstimmung wird als `lizenz_gesetzt_von = 'mensch'` festgehalten und überlebt jeden
Reimport.

### 3. Ein Bild ist so verborgen wie seine Passage

`wiki_asset_uses` hält fest, welche Passage welches Bild zeigt. Vor der Auslieferung stellt der
Server genau die Frage, die er auch vor einem Absatz stellt: hält diese Leserin eine Passage, die
es zeigt? Ohne diese Bindung wäre die Freigabe von Wissen umgehbar, indem man die Bilder direkt
abruft.

## Was wo liegt

| Ort | Inhalt |
| --- | --- |
| `packages/io/src/bild.ts` | Magic Bytes, Maße, Digest, Grenzen |
| `packages/io/src/medien.ts` | Lizenzlesung und Bestandsauswertung |
| `packages/io/src/wikitext.ts` | `[[Datei:…]]` → Bildpassage mit Unterschrift, Alt-Text, Ausrichtung |
| `packages/io/src/eron.ts` | Asset-Entwürfe, Herkunft, Bilanz im Importbericht |
| `packages/io/src/native-v7/` | Kampagnenformat v7, Modul `wiki-medien` |
| `packages/server/src/db/migrations/015_wiki_assets.sql` | `wiki_assets`, `wiki_asset_uses` |
| `packages/server/src/domain/wiki-medien.ts` | Bestand, Bytes annehmen, Auslieferung, Lizenz setzen |
| `packages/client/src/features/WikiMedien.tsx` | Bestandsansicht, „Bilder holen", Lizenzwahl |
| `packages/client/src/features/ArticleFigure.tsx` | Das Bild im Artikel, samt ehrlichem Platzhalter |

## Der Bildblock

`bildunterschrift` trug schon immer `assetId` und die Unterschrift. Neu und **durchweg optional**
sind `dateiname`, `alt`, `ausrichtung`, `breite` und `ausInfobox` — optional, weil ein vor diesem
Schritt geschriebenes Paket sie nicht hat und gültig bleiben muss. Der Dateiname steht bewusst *im
Block* und nicht nur am Asset: eine Datei, deren Bytes nie geholt wurden, kann sich so selbst
benennen, statt als Loch zu erscheinen. Das ist der Normalzustand zwischen den beiden Schritten.

`Asset.mime` und `Asset.sha256` sind aus demselben Grund optional geworden: beide beschreiben
Bytes. Sie sind gemeinsam gesetzt oder gemeinsam leer, und die Datenbank, der Bündelvalidator und
die Referenzprüfung erzwingen diese Paarung.

## Format v7

Zwei neue Tabellen bedeuten eine neue Formatgeneration — die Abdeckungsprüfung in
`domain/bundles.ts` verlangt, dass jede dauerhafte Spalte in einem Profil vorkommt, und hat die
beiden sofort gefunden. Eine Kampagne **ohne** importierte Bilder behält ihren v4/v5/v6-Umschlag;
erst das erste Bild verlangt v7.

Die Referenzprüfung misst beim Öffnen **jede gespeicherte Datei erneut** und rechnet ihren Digest
nach. Das ist teurer als ein Blick auf die Spalten und genau deshalb richtig: eine Zeile, die
`image/webp` behauptet und PNG-Bytes trägt, überlebt sonst jeden Export, und ab da glaubt jedes
Werkzeug der Spalte statt der Datei.

## Was das nicht kann

- **Keine öffentliche Bildauslieferung.** Die Publikation zeigt die Unterschrift, nicht die Datei.
  Eine anonyme Bildroute ist eine eigene Entscheidung über Lizenz und Reichweite.
- **Kein Nachschärfen, kein Umkodieren, keine Thumbnails.** Gespeichert wird, was geliefert wurde.
- **Keine Autorenhistorie für Bilder.** Die Lücke, die der Textimport bei `attributionByPageId`
  offen ausweist, ist bei Dateien dieselbe und wird genauso offen ausgewiesen.
- **Keine Duplikaterkennung über Dateigrenzen.** Zwei Dateien mit identischen Bytes unter
  verschiedenen Namen bleiben zwei Assets.
