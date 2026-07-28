# Kreuzkritik B2 → B1

Gegenstand: [`spike-B1.html`](spike-B1.html) (80,5 KB, 1 `<style>`, 1 `<script>`, keine externen
Ressourcen). Gelesen und im Browser geöffnet am 27.07.2026, nach Fertigstellung von
[`spike-B2.html`](spike-B2.html). Ich habe B1 **nicht** verändert.

Wir hatten getrennte Aufträge — B1 baut den Flex, B2 den Universalitätsbeweis. Diese Kritik misst
B1 deshalb nicht an meinen Achsen, sondern an dem, was der Runde nach B1 noch fehlt.

## Was es trifft

1. **Es ist ein einziges Standbild, und das war der Auftrag.** Die Seite liest sich zuerst als
   Enzyklopädie und erst danach als Produkt — genau die Reihenfolge, die `product-B.md` §2.3
   verlangt. Kein Panel, kein Modus-Umschalter, kein Log. Der Satzspiegel trägt.
2. **22 Absätze, 5 Belege.** Es zahlt den Dichtepreis, den die These braucht: „3 getippt,
   19 geprägt" ist erst ab dieser Länge glaubwürdig. Meine 12 Absätze sind für den Flex zu wenig;
   B1 hat hier die härtere und richtige Wahl getroffen.
3. **Der rote Verweis steht in der Infobox** — „Kanzlei: *Ossa* (kein Eintrag)". Ein fehlender
   Eintrag mitten in der Faktentabelle ist präzise das, wonach ein echtes Wiki aussieht. Das ist
   beobachtet, nicht dekoriert.
4. **Die Leser-Projektion ist ein sichtbares Bedienelement** („Ansicht: Kaya (SL) — alles") und
   entfernt Abschnitte per `removeChild`, statt sie per CSS zu verstecken. Strukturell abwesend,
   nicht optisch versteckt — auf Abschnittsebene stimmt das.
5. **Es druckt seine eigene Einschränkung** (Zeilen 1124–1125: Fixtures liegen im Browser, die
   Projektion wird im Client gerechnet, in der Produktion entfernt der Server). Das ist die
   Redlichkeit, die die UI-Richtung fordert, und sie fehlt in vielen Spikes.
6. **`@media print` ist da.** Ungefragt, und es zeigt, dass jemand §10.1 (*die Chronik*) gelesen hat.

## Was es fingiert — oder genauer: was es strukturell nicht zeigen kann

1. **Es gibt kein Datenmodell hinter den Absätzen.** Die 22 Atome sind handgeschriebene
   `<div class="atom" data-art="…" data-zeit="…">` im HTML. Damit ist *„dieselbe Komponente
   überlebt einen Inhaltswechsel"* nicht geprüft, sondern nicht prüfbar: die Komponente **ist** der
   Inhalt. Bewiesen ist „diese eine Instanz sieht gut aus", nicht „das Bauteil trägt". Die Runde
   darf aus B1 keinen Komponentenschluss ziehen.
2. **`data-leser="kaya sera brannt vesper"` liefert jedem Leser jeden Satz mit aus.** 32 Knoten
   tragen diese Liste. Das ist *nicht* unehrlich — der Vorbehalt steht ja darunter —, aber es
   bedeutet: die am stärksten belastete Behauptung des Kandidaten (§2: Brannts Antwortkörper
   enthält *keine Bytes* des versiegelten Satzes; §9.7: das Augenblick-Leck) ist genau die, die
   dieses Artefakt nicht vorführen kann. Wenn das Standbild im Verdikt für das Gate einsteht, ist
   das Gate ungeprüft.
3. **Reduzierte Bewegung ist „sehr schnell", nicht „aus".** Zeilen 809–825 setzen
   `transition-duration: 1ms !important` auf `*`. Weil der Anfangswert von `transition-property`
   `all` ist, *erzeugt* diese Regel auf jedem Element einen 1-ms-Übergang, statt Übergänge zu
   entfernen. Zwei Folgen: es ist streng genommen keine Erfüllung von `prefers-reduced-motion`,
   und jede synchrone Messung am berechneten Stil liest danach den Wert *vor* der Änderung.
   Ich hatte denselben Fehler und habe ihn in B2 gefunden, weil mein Prüfstand plötzlich die
   Kontrastwerte des vorherigen Skins meldete. Einzeiler:
   `transition: none !important;` statt `transition-duration: 1ms !important;` — an beiden Stellen.
4. **Keine Skin-Achse.** Null Vorkommen von `relic`, `signal`, `clean`. B1 zeigt einen Skin, und
   den gut; Punkt 2 der Abnahmematrix (Inhalt und Skin unabhängig schaltbar) bleibt offen.
5. **Kein langes Etikett, keine fehlende Bilddatei.** Punkt 9 der Abnahmematrix bleibt offen.
   B1 hat keine Bildtafeln, also auch keinen entworfenen Leerzustand — das ist konsistent, aber
   ungeprüft.

## Was es kosten würde, das wirklich zu bauen

- **Die Artikelfläche selbst ist billig** — sobald `Passage` + `Revelation` + `gepraegt_durch`
  existieren, ist sie eine Listenrenderung, eine Randspalte und eine Fußnotenkarte. Tage, keine
  Wochen. B1 übertreibt hier nichts.
- **Teuer ist alles, was hinter jedem Chip hängt, und das Bild verschweigt es zwangsläufig:**
  `Wurf` dauerhaft + `paket_pin`-Replay, `Augenblick`-Aufnahme, und die `Sicht`-Projektion von
  *Geometrie* (§9.7 — bis heute unbebaut und unvermessen). §7.2 rechnet allein für die fünf
  Prägungs-Handler plus Puffer, TTL, Fällung und Augenblick **10 Tage**, und §5.6 setzt die
  Fog-Zeile mit **12 Tagen, Risiko hoch** an.
- **Die Leserwahl ist die eigentliche Rechnung.** „22 von 22 Absätzen in dieser Fassung" heißt:
  der Server projiziert pro Anfrage pro Leser. §9.8 räumt ein, dass `retrieve()` p95 gegen die
  5000-Entitäten-Fixture unbewiesen ist — und Der Abend macht das schlimmer, nicht besser, weil
  ein aus Abenden zusammengewachsenes Wiki mehr und kürzere Passagen hat.

## Empfehlung an die Runde

B1 ist die Fotografie, B2 ist das Argument. Kaya sollte B1 zuerst sehen — es ist das Bild, das den
Kandidaten verkauft — und danach B2, das die Frage beantwortet, ob dahinter ein Produkt oder ein
Screenshot steht. Keines der beiden allein erfüllt die Abnahmematrix: B1 trägt den Flex und die
Dichte, B2 trägt die Punkte 1, 2, 3, 7, 8, 9 und 10. Was **beide** offenlassen, und was das Verdikt
nicht überspringen darf, ist Punkt 3 in seiner scharfen Form — *unauthorized records omitted by the
production response*. Das ist kein UI-Beweis und wird es in keinem Spike werden.
