# Kreuzprüfung — spike-B2 liest spike-B1

**Wer prüft:** GUI-Architekt 2 (Kandidat B, Sitzplatz 2 — der Universalitätsbeweis).
**Was geprüft wird:** [`spike-B1.html`](spike-B1.html), 145 982 B, *„Der Schwellentisch — elf Ringe
im Nebel"*. Gelesen als Code und als Gestaltung, am 2026-07-27, nach Fertigstellung von
[`spike-B2.html`](spike-B2.html).

---

## Was es trifft

1. **Die Namensprüfung ist wirklich eine Maschine, nicht eine Tabelle mit Urteilen darin.**
   `pruefeAlle()` läuft über 47 echte Namen und legt pro Name eine **`spur`** an — vier Stufen,
   jede mit `ok` und einem eigenen Satz. Der Grund ist damit eine *Struktur*, nicht ein String.
   Das ist mehr, als mein eigenes Ledger tut: ich drucke einen Grund, B1 druckt den Weg dorthin.
   Wenn eine der beiden Seiten Vorbild für die Produktion wird, ist es diese.

2. **Der Zwillingsbeweis mit einer Kontrollquelle ist die stärkere Konstruktion.**
   `projiziere(quelleJetzt("Blattheim"), "bodin")` baut die Welt, in der die Schwelle **nie
   existierte**, und vergleicht Bodins Hälfte gegen sie. Das trennt *„herausgefiltert"* von
   *„nie vorhanden"* — genau die Unterscheidung, um die es geht. Mein A/B/Leer-Vergleich
   beantwortet die schwächere Frage. Ich würde das übernehmen.

3. **`btnNennungen` ist die beste Einzelidee in beiden Dateien.** Ein Knopf, der 678 Nennungen
   auf der Karte einblenden will, sich weigert, den Grund druckt und die Versuche zählt.
   Die These als Bedienelement, das nichts tut. Kein Text kann das ersetzen.

4. **Kontrast wird über dem zusammengesetzten Nebel gemessen** (`mischeAufFog`), nicht gegen eine
   Wunschfarbe. Dieselbe Disziplin habe ich unabhängig gebaut; dass beide Seiten dort landen,
   spricht dafür, dass es die richtige Messung für eine Leinwand ist.

5. **Arvex Aurelius Paradon als waagerecht scrollender Infobox-Streifen mit der Rinne darunter.**
   M18 an der richtigen Entität, ohne Lead-Prosa-Annahme, und die Rinne druckt den Grund beim
   Fokus. Das ist der korpusehrliche Render und er sitzt an der prominentesten Stelle der Seite.

6. **Die rAF-Schleife läuft nur, wenn Bewegung erlaubt UND die Leinwand sichtbar ist.** Bewegung
   als Zustand, korrekt abgeriegelt — keine Tapete.

---

## Was es vortäuscht oder auslässt

1. **Das Regelpaket wird gelesen und nie geschrieben.** `REGELPAKET` ist eine Konstante im
   Modulraum; `KLASSE`, `NAMEN`, `KORPUS` sind Eron-Literale daneben. Der Kandidat behauptet in
   §6 und §3.1 ein **deklaratives, versioniertes, pro Welt austauschbares, benutzer-editierbares**
   Paket. B1 *zeigt* eine Konstante und *nennt* sie deklarativ. Das ist die Stelle, an der die
   Seite ihre eigene Hauptbehauptung nicht vorführt. (In B2 ist jede Feldbezeichnung dreiwertig
   umschaltbar und die Kaskade rechnet live neu — genau um diese Lücke zu schließen.)

2. **Die DOM-Hälfte des Zwillingsbeweises vergleicht `gliederungHtml(szene)` — eine Zeichenkette,
   die dieselbe Projektion erzeugt hat.** Bewiesen ist damit, dass der *Gliederungs-Generator*
   sauber ist, nicht, dass die *gerenderte Seite* sauber ist. `#hud`, die Lage-Liste, die Rinne,
   das Protokoll und der Kopf stehen nicht im Scan. Ein Leck dort wäre für den Beweis unsichtbar.
   **Das ist keine theoretische Sorge:** derselbe Scan über die echte Seite hat in *meiner* Datei
   zwei reale Lecks gefunden — eines davon im Kampagnentitel („Die Flüsterer von Blattheim"), das
   kein Code-Review gefunden hätte. Kosten der Behebung: zwei Zeilen (`document.querySelector(".werk").innerHTML`
   in den Nadel-Scan aufnehmen) plus die Ehrlichkeit, den Ausnahmebereich zu benennen.

3. **Zwei `createElement`-Aufrufe in 146 KB.** Praktisch die ganze Oberfläche wird als
   `innerHTML`-Zeichenkette zusammengesetzt (sauber escaped, das ist nicht der Vorwurf). Zwei
   Folgen: der Fokus stirbt bei jedem Neuaufbau eines Wirtsknotens, und ausgerechnet die Seite,
   deren These *„das DOM ist maßgeblich"* lautet, baut ihr DOM aus Text. **Für den echten Bau ist
   das die größte einzelne Umschreibung in der Datei** — nicht schwer, aber überall.

4. **Die Rolle ist eine Leserwahl, keine Rollenprojektion.** „Spielleitung" ist ein vierter
   Eintrag im `Sicht`-Wähler; Prüfstand, Register und Beweis stehen jedem Leser offen. Nach §6 des
   Kandidaten ist das Formular eine Leitungsfläche. Der Unterschied zwischen *„projiziert"* und
   *„strukturell abwesend"* ist genau der, den der Zwillingsbeweis verteidigt — und er wird in der
   Bedienung nicht gezogen.

5. **Zwei Zahlenquellen ohne Fußnote.** Der Trichter zeigt `KORPUS.kandidaten_nachfrage` (eine
   Konstante über 689 Namen), das Ledger rechnet über 47. Beide stehen ohne Kennzeichnung
   nebeneinander. Meine Seite hat dieselbe Klasse von Problem und markiert die interpolierten
   Zellen mit `*` und einer Fußzeile; B1 sollte dasselbe tun oder die Korpuszahl weglassen.

6. **Der schmalste Haltepunkt ist 400 px.** Der Auftrag nennt ~380 px. Ungetestet darunter.

---

## Was es echt kosten würde

Der Leinwand-Umfang ist ehrlich klein gehalten — eine Karte, eine Ebene, ein Dutzend Marken, keine
Kachelpyramide, kein Pixi. `RELIEF_MS`, `PROJ_MS`, `GEO_MS`, `NEBEL_MS` und `letzterRahmen` werden
gemessen und angezeigt; das sind genau die vier Zahlen, die **S-K1** liefern sollte. Zwischen B1
und B2 hat die Linie damit zum ersten Mal in fünf Runden ein Bild im Browser.

**S-K1 ist damit nicht erledigt**, und niemand darf es so zitieren: keine echte `.dd2vtt`-Geometrie,
keine 300 Marken, kein Worker, kein DPR-Stress, keine kalte Maschine. Die 14 Tage aus
[`product-B.md`](product-B.md) §10 bleiben eine Schätzung in einer unkalibrierten Einheit
(RB-18). Was diese beiden Seiten belegen, ist nur das untere Ende: *ein* Bild ist zeichenbar, die
Projektion kostet Mikrosekunden, der Nebel als ID-Menge ist inkrementell. Das ist wenig — und es
ist mehr als vier Runden zuvor.

Realistischer Aufwand, um B1 auf Produktionsstand zu bringen: **DOM-Neubau statt `innerHTML`** (3–4
Tage, mechanisch), **Regelpaket als editierbare Datei mit Validator** (2 Tage, in B2 im Prinzip
schon da), **Scan über das echte DOM** (Stunden), **Rollenprojektion statt Leserwahl** (1 Tag).

---

## Ist es eine Stufe über Runde 4?

**Ja, ohne Einschränkung.**
[`round-04/spike-B1.html`](../round-04/spike-B1.html) war eine **Dokumentfläche** — der Artikel
*Haus Vharon* mit Herkunftsrinne, erfundener Welt und erfundenen Figuren. Diese Seite ist eine
**räumliche Fläche mit echter Koordinatenmathematik**, einem live laufenden vierstufigen
Klassifikator über echte Namen aus einem echten fremden Wiki, einer getakteten Projektion und
einem Leck-Scan. Die Optik ist ebenfalls oben: Eckmarken, HUD, die Bilanz-Typografie und die
hypsometrische Platte sind Handwerk, für das Runde 4 keinen Anlass hatte.

Und die Ablösung der erfundenen Figuren ist vollzogen: *Sera und Brannt* sind weg, **Irme, Bodin
und Baldur** sind da, und sie sind echt — 2026 bearbeitete Artikel, die Spielerfiguren des
Stakeholders.

**Die beiden Seiten überschneiden sich weniger, als ich befürchtet hatte.** B1 ist der Auftritt:
die Bilanz, die elf Ringe, Arvex, die Weigerung. B2 ist das Argument: dieselbe Leinwand unter
sieben Achsen, drei Inhaltspaketen und vier Rollen, mit einem gemessenen Strukturabdruck darüber.
Wer nur eine von beiden sieht, glaubt entweder, dass es schön ist, oder dass es trägt — beides
zusammen sagen nur beide.
