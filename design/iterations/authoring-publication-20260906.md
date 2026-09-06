# M8: Themes und öffentliche Ausgabe — zwei Entwurfsrunden

Stand: 2026-09-06. Nach unabhängiger Gegenprüfung als Implementierungsvertrag übernommen, mit den verbindlichen Präzisierungen unten. Das ist noch keine gelieferte Funktion. Regel-/Bogenautor, Fremdformatadapter und Electron bleiben die übrigen M8-Arbeiten; dieser Entwurf ersetzt sie nicht.

## Übernahme nach unabhängiger Prüfung

Root übernimmt Runde 2 für die bereits beauftragte Implementierung. Folgende Präzisierungen
gehen bei abweichender Formulierung im Vorschlag vor:

- Präzisierung aus dem echten Eron-Importpfad: bestätigte Legacy-Adressen dürfen
  `/wiki/<Artikel>` oder `/<Sprache>/wiki/<Artikel>` verwenden. Die Sprache ist auf zwei
  ASCII-Buchstaben und einen optionalen zweiten Zweibuchstabenteil beschränkt. Der
  Sprachpräfix bleibt Bestandteil des global eindeutigen Pfads; verschiedene Sprachen
  werden nicht zu einer Adresse zusammengelegt. Das bewahrt insbesondere die tatsächlichen
  `/de/wiki/`-Quellen der vorhandenen Importvoreinstellung. Die vollständige Quell-URL bleibt
  unverändert als Herkunftsbeleg erhalten; HTTP und Native-V4-Prüfer verwenden denselben Vertrag.
- Eine ausdrücklich akzeptierte vollständige Autorenhistorie kann die vorher unvollständige
  Quellaussage derselben Ursprungs-PID ersetzen. Für jeden publizierten Stand zählt nur die
  zuletzt akzeptierte Aussage bis zu seiner gepinnten Artikel-Revisionssequenz. Ein späterer
  privater Reimport verändert keine bereits veröffentlichten Attributionen; sämtliche alten
  Artefakte bleiben erhalten. Diese Präzisierung wird mit positiven und neu gehashten negativen
  Fixtures in Server und Native V4 geprüft, bevor der Vertrag als geliefert gilt.

- Publish prüft **Artikelrevision, Artikel-Publikationsversion und Weltpolicy-Version** getrennt
  unter demselben Kampagnenlock. Zwei konkurrierende Auswahlen dürfen sich auch bei unveränderter
  Artikelrevision nicht überschreiben. Fehlende Publikationszustände haben erwartete Version0.
- Legacy-Routen unter `/wiki/...` gehören zum gesamten konfigurierten Host. Ein partieller
  UNIQUE-Index reserviert ihren normalisierten Pfad hostweit; eine zweite Welt erhält409.
  Die Quelle bleibt dokumentiert. Fremde Hosts werden durch einen lokalen Eintrag nicht verändert.
- `authoring_events` speichert zusätzlich **`request jsonb`** mit der vollständigen geschlossenen,
  normalisierten Eingabe einschließlich Scope, Ziel und erwarteten Versionen. V4 berechnet den
  Request-Hash nach; dieser Autorenverlauf verwendet keine opaken taktischen Altbelege.
- Ein fehlender öffentlicher Theme-Pin verwendet den festen mitgelieferten öffentlichen Default.
  Private Kampagnen-Themes und Theme-Pin-Änderungen beeinflussen keine öffentliche Ausgabe;
  die Zwillingsprüfung enthält genau diesen Fall.
- Der frameworkfreie Manifest-/Kontrast-/Präferenzvertrag liegt in **`packages/theme`**. Er
  enthält keine DOM-, Node-, Netzwerk- oder Kampagnenrechteabhängigkeit. Server und IO berechnen
  kanonische SHA256-Hashes und verifizieren den deterministischen Kontrastbericht; die GUI nutzt
  dieselben reinen Farb-/Präferenzregeln. V1 bleibt auf64KiB und die geschlossene Tokenliste begrenzt.

Die sieben Tabellen bleiben erhalten; die bestehende Historie und veröffentlichte Formate
werden nicht erweitert. Browser-/A11y-/Publikations- und Desktopabnahmen bleiben erforderlich.

## Bindung und vorhandene Bausteine

- [Implementierungsplan M8](../../docs/IMPLEMENTATION_PLAN.md#m8--autorenwerkzeuge-und-veröffentlichung): Presets bearbeiten/speichern/teilen, wirksame lokale Accessibility-Präferenzen; Public Reader aus, explizite Veröffentlichung, Aliase/Inbound-Mapping, SEO, Mint-Feed und dieselbe öffentliche Projektion auf allen Ausgaben.
- [Architektur 06 §14.1–14.3](../06-giga-product-architecture.md#14-theme-darstellung-und-game-feel): vier Presets **Cyberpunk, Medieval, Fantasy, PixelArt**; Skin, Density und Atmosphere sind unabhängige Regler. PixelArt verändert auch Typografie, Raster, Kanten/Icons, Sampling und Bewegung. Reihenfolge: Basistokens → Kampagnentheme → lokale Präferenz → zwingende Accessibility-Korrektur.
- [Architektur 06 §15.5](../06-giga-product-architecture.md#155-publikation): Weltdefault aus, rename-stabile menschliche URLs, Sitemap/robots/lokalisierte Metadaten/canonical/OpenGraph, abgeleiteter Mint-Feed, Inbound-Weiterleitung und Zwillingsbeweise auf sämtlichen Ausgaben. Content-Warnungen, Attribution/Lizenz und exportierbare Inhalte bleiben Pflicht.
- [Champion §10.11](CHAMPION.md#1011-die-offene-tür--public-unauthenticated-permalink-w) verlangt einen expliziten Aushang; [K-Q2](OPEN-DECISIONS.md) gibt lokalen Accessibility-Einstellungen Vorrang. Die älteren Zwei-Kit-Budgets ersetzen den ausdrücklichen Vier-Preset-Vertrag des M8-Plans und von 06 nicht. Source-owned Minimalpresets benötigen keine neue Auftrags-Art.

Aktueller Code, direkt gelesen:

| Vorhanden | Wiederverwendung und notwendige Grenze |
|---|---|
| `packages/ui/src/tokens.css`; `packages/client/src/styles.css` und Feature-CSS | Ein produktives Obsidian-Farbsystem, viele bereits semantische Variablen, daneben feste Farben/Abstände. Erst diese festen Zustands-, Eingabe- und Fokusfarben auf benannte Tokens überführen; ein Root-Palettenwechsel allein wäre kein fertiges Theme. |
| `packages/client/src/main.tsx` | Cinzel und IBM Plex Sans sind lokal gebündelt; System-/Monospace-Fallbacks vorhanden. Für die ersten Presets keine Remote-Fonts oder neue Font-Abhängigkeit nötig. |
| `styles.css` Reduced-Motion-Mediaquery, semantische Buttons/Notice/Reader | Vorhandene OS-Präferenz und DOM-Semantik erhalten. Lokale High-Contrast-, Art-off-, Transparenz-, Schrift-, Dichte- und Low-Power-Steuerung fehlt noch. |
| `packages/projection/src/entry.ts` | `projiziereEntry` und `entryBytes` leisten Passage-Auslassung, dichte öffentliche Ordinalzahlen und zielgefilterte Links. `LEERES_WISSEN` hält nichts; es ist noch kein fertiger Public Reader. |
| `domain/documents.ts`, `domain/wiki-navigation.ts` | Bestehende Kampagnenlocks, Revisions-CAS, Aliasauflösung und Backlinks. Diese APIs verlangen Mitgliedschaft; sie dürfen für Public nicht mit einer erfundenen GM-Identität aufgerufen werden. |
| SQL 001/002: `entries.public=false`, `revisions.document`, `entry_aliases` | Artikelbit und unveränderliche Quellstände existieren. Weltfreigabe, öffentliche Auswahl und Veröffentlichungsrouten fehlen. Das Artikelbit allein veröffentlicht keine Welt. |
| `confirmed_mints`; IO `model.ts`/`eron.ts`; `artifacts`/`passages.provenance` | Belege, alte Wiki-Adresse/Page-ID und explizit vollständige oder unvollständige Attribution wiederverwenden. Eron-Medien sind bisher `source-only`, Lizenzstatus unbekannt; ein öffentliches Artikelrecht erteilt kein Bildrecht. |
| Native V3, `domain/bundles.ts`, `actor_inventory_events` | Additiver Formatwechsel, vollständige Tabellenabdeckung, isolierter Restore sowie bewährte CAS-/Retry-/Audit-Muster sind vorhanden. Geschlossene alte Verträge werden nicht erweitert. |

## Runde 1 — der kleine Ansatz und seine Gegenprobe

Ansatz: Theme-JSON an der Kampagne speichern, CSS-Variablen setzen; Welt-Schalter und `entries.public` verwenden; öffentliche HTML-/SEO-Ausgabe aus aktuellen Artikeln und bestehenden Aliasen bauen.

Gegenprobe:

1. Ein publizierter Artikel erhält später eine private Passage oder eine private Änderung derselben PID. Ein pauschales Artikelbit würde diese Änderung ohne erneute Entscheidung verbreiten. Ein privater Rename dürfte ebenso wenig Public-URLs oder Suchvorschläge verändern.
2. CSS-Text, Remote-Fonts und Theme-URLs eröffnen Ausführung/Netzwerkzugriffe. Harte Produktfarben können Kontrast- und Fokuskorrekturen überstimmen. Ein PixelArt-Palettenwechsel erfüllt den Vertrag nicht.
3. Public-Vorschau als GM-Reader, Suchindex vor Filterung oder OpenGraph direkt aus `entries` geben eine zweite, großzügigere Sicht aus. Auch globale `version`, ETags, Änderungszeiten und Trefferzahlen verraten private Änderungen.
4. Eine alte externe URL kann intern zugeordnet werden; das setzt noch keine Weiterleitung auf einem fremden, nicht kontrollierten Host in Betrieb.

Ergebnis: Dieser Ansatz wird verworfen. Er spart gerade die Entscheidungen aus, die später nicht aus einem Theme oder Artikelbit rekonstruiert werden können.

## Runde 2 — korrigierter, begrenzter Vertrag

### A. Themes als Daten, Accessibility als lokale Autorität

Neuer geschlossener `ThemeManifestV1`, maximal 64 KiB: `schemaVersion:1`, `name`, `basePreset` (die vier oben genannten Werte), `colors`, `typography`, `geometry`, `sampling`, `motion`, `attribution`. Keine Selektoren, CSS-Strings, HTML, Skripte, Dateipfade, externen Asset-/Font-URLs oder Regeln.

`colors` ist ein festes Wörterbuch für Hintergrund-/Leseflächen, Textstufen, Linien, Akzent/Link, Fokus, Erfolg und Fehler samt jeweiligen Flächen. Die erste Version verwendet opake `#RRGGBB`-Werte; komponierte Glasflächen liegen nur hinter kontrollierten Textflächen. `typography` wählt je Rolle aus gebündelten Fonts und System-/Mono-Fallbacks. `geometry` enthält begrenzte Abstandseinheit, Radius und Kanten-/Icon-Rezept; `sampling` ist `linear|nearest`, `motion` ein begrenztes Rhythmusrezept. Density und Atmosphere bleiben getrennte Nutzungsregler. Die konkrete Tokenliste wird gegen die tatsächlich vorkommenden Produktzustände eingefroren, bevor der Parser veröffentlicht wird.

Vier aus denselben Komponenten gebaute Ausgangswerte; PixelArt benutzt zusätzlich Mono-/Pixel-Rezept, stufige Kanten, anderes Spacing, Nearest-Sampling und Schritt-Rhythmus. Art-off/High Contrast behalten Labels, Herkunftssymbole, Fokus und Status. Fremde Rasterbilder werden dadurch nicht nachträglich zu neu gezeichneter Theme-Art.

Ein deterministischer Validator liefert `ThemeAccessibilityReportV1 {algorithm, manifestHash, pairs, failures}`. Vorgeschlagene Produktgrenzen: normaler Lesetext ≥4,5:1, wesentliche Steuerungs-/Fokuskontraste ≥3:1; High Contrast bekommt eine geprüfte feste Korrekturpalette. Diese Zahlen sind Implementierungsvorschläge, kein bereits gemessener Kontrastnachweis. Fehlende Paarabdeckung und ein absichtlich schlechtes Preset müssen rot werden. Die Freigabe prüft zusätzlich tatsächlich gezeichnete Zustände einschließlich Hover, Fehler, disabled und Textflächen; mathematische Tokenpaare allein beweisen keine komplette Oberfläche.

Lokaler `AccessibilityPreferencesV1`: `contrast: system|normal|high`, `motion: system|reduced`, `transparency: system|reduced`, `art: on|off`, `font: theme|system|reader`, `density: compact|comfortable`, `atmosphere: clean|crafted|cinematic`, `lowPower: boolean`, optional lokale Skin-Wahl. Speicherung unter einem versionsgebundenen Browser-Key; kein Kampagnenexport und keine Übertragung der Accessibility-Präferenzen an Mitspieler. OS-Reduced-Motion/Forced-Colors und explizite Einschränkungen können nicht durch das GM-Theme aufgehoben werden. Browserzoom bleibt Browserzoom. Fehlerhaftes/veraltetes lokales JSON fällt auf sichere Defaults zurück.

Der Flow: Preset wählen → an echten Reader/Sheet/Roll/Notice-Beispielen verändern → Vorschau und Report → neue immutable Revision speichern → ausdrücklich für die Kampagne pinnen → genau diese Revision als `.chronicle-theme` herunterladen/importieren. Datei-Weitergabe erfüllt den ersten Share-Flow; eine Registry/Workshop-Anbindung wird damit nicht behauptet. Ein Import überschreibt keine gleichnamige Vorlage oder aktive Pin-Revision.

### B. Öffentliche Ausgabe als ausdrücklich freigegebener Stand

Die bestehende Kampagne ist die erste veröffentlichbare Welt; `universes` wird dadurch weder umgedeutet noch um eine zweite Autorenschaft ergänzt. Ein Public-Request benutzt niemals Mitgliedschaft, Reader-Perspektive oder Wissensunion. Auch mit GM-Cookie erhält die öffentliche Route dieselbe öffentliche Ausgabe.

GM-Flow: Weltname/Slug/Sprache/Warnungen konfigurieren → Artikel und konkrete Passagen auswählen → **den tatsächlich später ausgelieferten Public-Reader** ansehen → Publish mit erwarteter Artikelrevision und Policy-Version. Weltfreigabe ist ein eigener ausdrücklicher Schalter und standardmäßig aus. Artikel-Freigabe benutzt `entries.public`; ein gesetztes Alt-Bit ohne neuen expliziten Veröffentlichungsstand bleibt wirkungslos.

Die Auswahl pinnt `revisions.id` plus eindeutige ausgewählte PIDs dieser Revision. Inhalt kommt aus diesem unveränderlichen Quellstand, nicht aus später veränderten `passages`-Zeilen. Neue/private Bearbeitungen, Renames oder Mints veröffentlichen sich nicht automatisch. Aktualisieren ist eine erneute Vorschau/Publikationsentscheidung. Zurücknehmen schließt die aktuelle Ausgabe sofort, einschließlich Aliase, Feed, Suchergebnisse und Bilder. Keine zweite editierbare Inhaltskopie entsteht.

`projectPublicWorld`/`projectPublicEntry` erzeugen einmal ein geschlossenes öffentliches Lesemodell: publizierter Titel/Slug, gewählte Passagen mit dichten Ordinalzahlen, ausschließlich publizierte Linkziele, freigegebene Warnungen und Attribution. `offeneTueren` ist leer. Die Liste bekannter Slugs stammt ausschließlich aus öffentlichen aktuellen Namen und freigegebenen Routen. Private aktuelle Aliase, Versionsnummern, Quelle-/Roll-IDs, Mitglieder und Vollmachten bleiben intern.

HTML, JSON, Suche/Backlinks, Sitemap, robots, lokalisierte Metadaten, canonical, OpenGraph/Social-Card und autorisierte Vorschau konsumieren genau dieses Lesemodell. Die Vorschau darf lediglich einen angeforderten zukünftigen Pin einsetzen; sie erhält dadurch keine GM-Wissensmenge. `BlockReader` wiederverwenden und echte `<a href>`-Links/SSR ermöglichen; die heutige Button-Navigation allein ist keine crawlbare Publikation.

Der Mint-Feed ist eine abgeleitete Liste explizit im veröffentlichten Stand referenzierter `confirmed_mints`/Passagen. Nur freigegebener Text, Artikel-URL und ein kleines öffentliches Datums-/Herkunftsmodell erscheinen. Keine Roh-Rollreceipt, private Teilnehmerliste oder ungeprüfte vollständige `provenance` durchreichen. Ein nach der Veröffentlichung entstandener privater Mint verändert auch Feed-ETag/updated nicht. Social Cards werden ausschließlich aus demselben öffentlichen Textmodell erzeugt; Originalbilder/Metadaten sind kein Shortcut.

Erster Ausgabestand bleibt bei Text und geprüften Source-owned Motiven. Fehlen für ausgewählte Inhalte die durch deren Lizenz verlangten Attributionsangaben, verweigert Publish diese Auswahl mit konkreter Quellenlücke; der Editor erfindet keine Autorenangaben. Nicht nachgewiesene Eron-Bilder werden weder geladen noch als Social Card verwendet; Bildunterschriften bleiben Text. Ein später zugelassenes Bild benötigt pro Datei Quelle, Lizenz/Attribution, Prüfsumme und tatsächliche Bildprüfung. Die bisherige `source-only`-Referenz ist kein solcher Nachweis. Keine Veröffentlichung von taktischen GM-Quellen über diese Routen.

### C. Konkreter minimaler Speichervertrag

Vorschlag: **sieben additive Tabellen**, keine neue SQL-Datei in dieser Entwurfsrunde. Alle fachlichen Änderungen unter dem vorhandenen Kampagnenlock; GM/Owner vor Cachelookup erneut prüfen. Konflikte sind 409, Fremd-/fehlende Ziele gleichförmig 404. `version` positive SQL-Integer, Zeiten nichtnegative Millisekunden, IDs kampagnengebunden, SHA256 über festgelegtes kanonisches JSON. Vollständige geschlossene DTO-Felder und Limits werden beim Implementierungsstart eingefroren.

| Tabelle | Spalten / Grenzen |
|---|---|
| `theme_presets` | `id PK`, `campaign_id`, `head_revision=1`, `version=1`, `created_by`, `created_at`; deferred Head-FK auf Revision. Namen stehen im Manifest. |
| `theme_preset_revisions` | `theme_id`, `campaign_id`, `revision`, `manifest jsonb`, `content_hash`, `accessibility_report jsonb`, `created_by`, `created_at`; PK(theme_id,revision), same-campaign FK; UPDATE/DELETE verboten. |
| `campaign_theme_pins` | `campaign_id PK`, `theme_id`, `theme_revision`, `version=1`, `updated_by`, `updated_at`; FK auf konkrete immutable Revision. Fehlende Zeile bedeutet den mitgelieferten Produktdefault, keine implizite Datenmigration. |
| `campaign_publications` | `campaign_id PK`, `public_key UNIQUE` (stabile zufällige Identität, kein Bearer-Geheimnis), `enabled=false`, `world_slug`, `title`, `description`, `locale de|en`, `content_warnings jsonb`, `theme_id/theme_revision nullable pair`, `version=1`, `updated_by`, `updated_at`; öffentlicher Name wird nicht aus einem später privat umbenannten Kampagnentitel gelesen. |
| `entry_publications` | `entry_id PK`, `campaign_id`, `revision_id`, `passage_ids jsonb` (1..1000 eindeutige PIDs genau dieser Revision), `public_slug`, `public_metadata jsonb`, `version=1`, `published_by`, `published_at`; FK(entry,campaign) und FK(revision,entry). `public_metadata` ist ein geschlossenes Modell für Warnungen, bestätigte Attributionsangaben und öffentlich freigegebene Mint-Verweise/-Datumsfelder, mit Prüfung gegen deren kanonische Quellen. Kein Roh-HTML, kein frei erfundener Beleg. |
| `publication_routes` | `campaign_id`, `kind world|article|legacy`, `route`, `entry_id nullable`, `source_url nullable`, `created_by`, `created_at`; PK(campaign,kind,route). world: beide nullable Felder NULL; article: Entry gesetzt, Quelle NULL; legacy: Entry und belegte Quell-URL gesetzt. article/legacy-Ziele direkt an Entry-ID, keine Redirect-Ketten. Aktuelle Namen und Aliasrouten dürfen sich nicht widersprechen; Transaktionsprüfung reserviert den Namensraum. |
| `authoring_events` | `command_id PK`, `campaign_id`, `actor_user_id`, `operation` (`theme.create`, `theme.revise`, `theme.pin`, `publication.configure`, `entry.publish`, `entry.unpublish`, `route.add`, `route.remove`), `subject_id`, `request_hash`, `before_state nullable jsonb`, `after_state jsonb`, `ack jsonb`, `created_at`; unveränderlicher Audit- und Retry-Vertrag gemeinsam. Zustände referenzieren immutable Theme-/Artikelrevisionen; entfernte Routen erhalten einen expliziten Tombstone. Ack enthält nur Subjekt und akzeptierte Version. Import normalisiert zu create/revise; Export/Vorschau sind Reads. Keine öffentliche History-API. |

`entries.public` bleibt das vorhandene Artikelbit; die tatsächliche Zulassung verlangt **Welt an + Artikelbit an + gültiger expliziter Pin**. Beim Zurücknehmen bleibt der letzte Pin für eine erneute Vorschau erhalten, das Bit wird ausgeschaltet. Private Artikelrevision und Publikationsversion bleiben getrennte CAS-Werte. Epoch-/Mounted-Guards und erhaltene Command-IDs aus Actor-/Theme-Entwurfsflows werden übernommen: spätes Save A darf einen neu bearbeiteten Entwurf B nicht löschen.

Eine neue Befehlsfamilie darf die geschlossenen `actor_inventory_events` oder `tactical_command_receipts` nicht nachträglich umdeuten. Vorgeschlagene APIs: `/themes` mit create/revise/import/export/preview, `/theme-pin`, `/publication` GET/PUT, `/entries/:id/publication` GET/PUT/preview sowie `/publication/routes`. Anonymous ausschließlich eigene `/w/...`- und zugehörige Public-Ausgaberouten. Server erzeugt Public-Hashes/ETags nur aus dem öffentlichen Lesemodell; zunächst `no-store`, kein Cache-Key mit interner Globalversion. Sämtliche Aliase prüfen die aktuelle Freigabe vor einer Weiterleitung.

Der Request-Hash bindet Kampagne, aktuellen User, Operation, geroutetes Subjekt und normalisierte Eingabe einschließlich CAS-Version. Ein Retry liefert nach erneuter Autorisierung den ursprünglichen Ack; eine anderweitig verwendete globale Command-ID ist 409. Routenmutationen verwenden die Version der Weltpolicy als CAS und erhöhen sie, damit ein Alias keine zusätzliche unversionierte Schreibfläche erhält.

Menschliche URLs: `/w/{publicKey}/{worldSlug}/{articleSlug}`; die zufällige Identität stabilisiert die Welt, sichtbare Slugs und direkte Aliasziele überleben Renames. Alte Eron-URLs werden aus belegter Importquelle/Page-ID vorgeschlagen und vom GM bestätigt. `/wiki/...`-Weiterleitungen sind nur auf einem tatsächlich kontrollierten Host wirksam. Für einen fremden Quellhost entsteht ein überprüfbares Redirect-Mapping/Export, keine Behauptung, dessen eingehende Requests bereits übernehmen zu können. Keine Remote-URL wird zum Importieren oder Auflösen serverseitig abgerufen.

### D. Native nächste Version und Abnahme

Der nächste native Vertrag ist **V4 = vollständig unverändert validierter V3-Core + die sieben geschlossenen neuen Tabellen**. Er enthält sämtliche Theme-Revisionen, Reports/Pins, Welt- und Artikelpolicies, ausgewählte Quellrevisionen/PIDs, öffentliche Metadaten, Routen und Authoring-Events. Lokale Accessibility-Wahl, gerenderte Previews/Social Cards, Suchindizes, Cookies und Laufzeit-URLs bleiben abgeleitet/lokal und fehlen bewusst im Export. Neue `published_by`-Identitätsreferenzen müssen beim Export mitgesammelt werden.

Explizites V3→V4-Upgrade fügt leere Tabellen hinzu; vorhandenes `entries.public=true` eröffnet ohne Pin keine Ausgabe. Keine automatische Re-Publikation beim Restore auf einem neuen Host: gespeicherte redaktionelle Policy bleibt erhalten, die **lokale Hostfreigabe für Public Delivery ist standardmäßig aus** und wird getrennt aktiviert. Diese Betriebsgrenze ist kein Verlust im semantischen Roundtrip und verändert kein Bundle. Canonical-URLs werden aus der konfigurierten eigenen Origin erzeugt, nicht aus einem importierten Hostnamen. `check`, Restore, Re-Export und Dokumentation benennen diese Grenze ausdrücklich.

Vor Freigabe sind folgende echte Prüfungen erforderlich:

- Alle vier Presets pick→tweak→save→share→import mit leerem semantischem Diff; alte Pin-Revision bleibt bei Theme-Update unverändert. Fehlerhafte Kontrastpaare werden abgewiesen, sichere Accessibility-Korrekturen gewinnen auch nach Reload/Wechsel und bei verspäteten Antworten.
- Gleiche Reader-/Sheet-/Wurf-/Tisch-Flows mit Tastatur, sichtbarem Fokus, Screenreader, 200 % Zoom, schmaler Ansicht und Reduced Motion. Keine Bedeutung nur durch Farbe/Animation; keine ungeschützten Farben aus Feature-CSS. Keine Aussage „A11y bestanden“ allein aus einem JSON-Report.
- Zwillingswelten mit identischer veröffentlichter Auswahl, aber unterschiedlicher privater Passage, PID, Rename/Alias, Actor/Brief, Wurfbeleg und verborgenem Mint: identische Public-JSON/HTML/DOM/AX, Suchresultate/-zahlen, Feed, Metadaten, Sitemap, Redirectantworten und Social-Card-Pixel. Public-Hash/ETag/updated dürfen nicht auf private Änderungen reagieren.
- Default-off und Alt-`entries.public=true` ohne Pin liefern dieselbe fehlende Ressource wie ein unbekanntes Ziel. Public mit GM-Cookie entspricht Public ohne Cookie. Ein Welt-Unpublish während Card-/Reader-Erzeugung wird vor Auslieferung erneut geprüft; danach keine alte Cache-/Aliasantwort.
- Expliziter Publish gegen veraltete Artikelrevision oder Policy-Version schlägt konfliktbehaftet fehl; unbekannte PIDs, fremde Revisionen, freie Redirectziele und fehlende Bildprovenienz bleiben ausgeschlossen. Normaler Rename plus bestätigtes Inbound-Mapping wird über echte HTTP-Weiterleitung abgenommen.
- V4-Export/Restore in isolierten PGlite- und PostgreSQL-Zielen; vollständige Schemaabdeckung, gleiche Theme-/Publikationsentscheidungen, alte Command-Retries und keine lokal geerbte Freigabe des neuen Hosts. Veröffentlichte V1/V2/V3-Parser bleiben unverändert.

Reihenfolge für die Implementierung: zuerst Theme-Vertrag/Tokenauflösung mit lokalen Präferenzen und echtem Datei-Roundtrip; danach Publikations-Pins und ein gemeinsamer Public-Projektor mit allen Ausgabeflächen. Die beiden Teile dürfen einzeln geprüft werden, gelten gemeinsam erst mit den oben genannten M8-Nachweisen als erledigt. Registry, Social Network, frei ausführbare Themes und das Behaupten fremder Host-Weiterleitungen gehören nicht zu diesem Vorschlag.

Zur Übernahme stehen ausdrücklich diese Implementierungsentscheidungen: sieben additive Tabellen; Datei-Share als erster kompletter Theme-Austausch; Publikation auf gewählten immutable Artikelständen statt automatisch fortgeschriebener Artikelbits; separate lokale Hostaktivierung nach Restore. Vier Presets, lokale Accessibility-Autorität, Default-off, Inbound-Mapping und identische öffentliche Projektion sind dagegen bereits bindende Anforderungen.
