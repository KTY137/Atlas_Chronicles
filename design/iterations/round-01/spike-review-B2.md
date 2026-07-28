# Quergutachten B2 → B1

GUI-Architekt 2 über [`spike-B1.html`](spike-B1.html), 2026-07-27.
Gelesen als Quelltext, gerendert in Chrome bei 1600 px und in einem echten 380-px-Viewport.

Vorbemerkung zur Fairness: die beiden Sitze hatten **verschiedene Aufträge**. B1 sollte den
Flex-Moment inszenieren, B2 die Universalität beweisen. Was unten unter „fehlt" steht, ist
deshalb nur dort ein Vorwurf, wo B1 etwas *behauptet*, das es nicht zeigt.

## Was es trifft

- **Es führt den Moment vor, statt über ihn zu reden.** Bühne mit Tokens, Anwesenheitsleiste,
  `W` spaltet die Linse, `Den Moment abspielen` fährt 21:47 als Sequenz ab. Ein Freund, dem man
  das zeigt, versteht in vier Sekunden, worum es geht. Mein Artefakt argumentiert; dieses
  *spielt*. Für Runde 1 ist das die wertvollere Hälfte.
- **`belegt 3/4 · M B S O` in der Wahrheitsspalte.** Pro Fakt eine Abdeckungsanzeige mit
  Initialen — nicht nur Farbe. Das steht so in keinem Kandidatendokument, beantwortet „wer weiß
  es sonst noch?" in einem Blick und kostet, sobald Grants existieren, fast nichts. Das ist die
  beste einzelne Erfindung in beiden Artefakten und gehört ins Produkt.
- **`Warum leer?` als Schaltfläche auf Bjorns Spalte.** Die Abwesenheit wird befragbar statt
  bloß leer. Mein statischer Leerzustand ist dagegen schwächer.
- **Die Spielendenprojektion lässt wirklich aus.** `renderPlayer()` baut ausschließlich Miras
  Spalte; die anderen Spalten existieren im gerenderten DOM nicht. Richtig gemacht.
- **Skins tragen Form, nicht nur Farbe.** Radius, Rahmenstärke, Korn, Label-Transform und
  Laufweite sind je Haut eigene Tokens. Archive mit 0 px und 2 px Rahmen liest sich wirklich
  anders als Signal. Das war die Schwäche, die Codex' eigenes Audit am Triumph-Spike fand — hier
  ist sie behoben.
- **Figurenfarbe ist nie allein tragend**: Farbton plus Initiale plus Name, überall.

## Was es fakt oder überzieht

1. **Die Auslassungsmeldung leckt Metadaten.** Sie nennt dem Spielenden die exakte Zahl der
   zurückgehaltenen Datensätze *und* die Namen der drei anderen Spalten. Unter der Nebel-des-
   Wissens-Doktrin dieses Kandidaten ist „drei weitere Figuren halten sechs Einträge, die du
   nicht siehst" selbst eine Enthüllung. Eine Zeile Text — aber es ist genau die Fehlerklasse,
   die der Kandidat nirgends machen darf. (Ich hatte dieselbe Klasse in meiner Transportleiste:
   die Zeugenmenge eines Reveals stand dort für alle Rollen. Gefunden nur, weil ich danach
   gesucht habe.)
2. **Ein Satz behauptet mehr, als die Datei kann.** „Es gibt kein DOM, in dem sie stünden, und
   **keine Rohabfrage, die sie liefert**." Die erste Hälfte stimmt. Die zweite ist in einer
   Einzeldatei falsch: `FACTS` und `ENTITIES` liegen im selben Skript, jede Konsole liest sie.
   `03-triumph-ui-direction.md` verlangt diesen Vorbehalt ausdrücklich. Umformulieren, nicht
   streichen — der Nachweis über den *Vertrag* der Antwort bleibt gültig und ist wertvoll.
3. **Ein Inhalt, ein Genre.** Nur Aldenfall. Das ist der Sitzzuschnitt und kein Fehler — aber die
   Runde darf B1 nicht als Beleg für Universalität lesen. Dafür gibt es B2.
4. **Kein Hochkontrast, keine Langtext-Locale, keine Dichte, kein Artwork-Ausfall, keine
   Zuschauendenrolle.** Hochkontrast ist keine Inhaltsfrage: die vier Skin-Paletten von B1 sind
   damit **rechnerisch ungeprüft**. Niemand hat Zahlen dafür. (B2 rechnet 272 Paare über 4 Skins
   × 2 Farbmodi × 2 Kontraststufen im Browser; dieselbe Prüfung ließe sich in einer Stunde auf
   B1s Tokens ansetzen und sollte vor der Wertung laufen.)
5. **Vier fest verdrahtete Figurenfarbtöne** (`--h-mira: 42` …). Bei sechs Spielenden geht das
   System aus. Das ist ein Fixture, kein Farbsystem; die echte Fassung braucht erzeugte,
   kontrastgeprüfte Töne aus einer Figuren-ID.
6. **Die Bühne bei 380 px.** Die absolut gesetzten Tokens überlappen ihre Beschriftungen
   („Wirt Hobb · hinter dem Vorh…"). Kein Layoutbruch, aber der schmale Fall ist erkennbar nicht
   der geprüfte.

## Was es in echt kosten würde

- **`Den Moment abspielen`** ist hier eine geskriptete Zeitachse. Die echte Fassung ist E1
  („Previously On"): Beat-Strom, deterministische Gewichtung, Filterung je Grant. Ein Feature
  von Aktgröße, keine Transition. Der Spike sollte das sagen.
- **`belegt n/4`** ist dagegen fast geschenkt, sobald `Grants` existieren — eine Aggregation je
  Fakt. Höchster Nutzen pro Zeile in beiden Artefakten.
- **Die Bühne mit Tokens** setzt die Cinematic-Rezeptur des Tisch-Zonenmodells voraus. Die steht
  in Scheibe 1 des Kandidaten drin, ist also im Rahmen — aber Tokenplatzierung, Vorhang und der
  Zustand „hinter dem Vorhang" müssen serverautoritativ sein. Der Spike modelliert das nicht,
  und genau dort liegt W4.

## Empfehlung an die Runde

B1 als **Vorführung**, B2 als **Beweisführung** werten — sie widersprechen sich nicht.
Übernehmen, was auch immer gebaut wird: `belegt n/4` und `Warum leer?` aus B1, die
Rollenprojektion inklusive Beat-Verlauf und die gerechnete Kontrastprüfung aus B2.
In **beiden** Artefakten die Auslassungsbehauptung entschärfen: ein Einzeldatei-Spike beweist
den Vertrag der Antwort, niemals den Zugriffsschutz.

---

# Quergutachten B2 → B1, zweite Runde

GUI-Architekt 2 über die **neu geschriebene** [`spike-B1.html`](spike-B1.html) (04:29 Uhr),
2026-07-27. Gelesen als Quelltext und in Edge bei 1500 px gerendert.

> Das Gutachten oben bezieht sich auf die **abgelöste** Fassung von B1 (02:42). Beide Artefakte
> wurden gegen das neu geschmiedete [`product-B.md`](product-B.md) noch einmal gebaut; B2s
> Vorgänger liegt als `spike-B2.superseded-0307.html` daneben. Was unten steht, gilt für die
> neue Fassung.

Vorbemerkung zur Fairness, unverändert: die Sitze haben **verschiedene Aufträge**. B1 inszeniert
den Flex, B2 führt den Universalitätsbeweis. „Fehlt“ ist nur dort ein Vorwurf, wo B1 etwas
*behauptet*, das es nicht zeigt.

## Was es trifft — und zwar besser als mein eigenes Artefakt

- **`project(upto)` ist ein echter Fold.** Der Zustand wird bei jedem Rendern aus dem
  Beat-Strom gefaltet; Beats mit Status `reverted` oder `proposed` werden übersprungen.
  Zurückspulen ist ein Cursor, Rücknahme ist ein Statuswechsel — mehr Code braucht es nicht.
  **Das ist die Substratbehauptung des Kandidaten, tatsächlich implementiert.** Mein B2 hat
  dafür eine Phasen-Aufzählung (`vor | vorschau | nach | zurueck`) und ist damit an genau der
  Stelle eine Attrappe, an der B1 ehrlich ist. Das gehört in die Wertung, und zwar zu B1s Gunsten.
- **Die Herkunftslinse rechnet vor, statt zu behaupten.** Pro Ziel Auswurf, Schaden und
  KP-Übergang, dazu der Würfelausdruck `5W6 = 3+6+2+5+1 = 17` als eigener Chip im Protokoll und
  ein `Warum?` an jeder Zeile. Invariante 6 ist hier keine Fußnote, sondern eine Spalte.
- **Der Grund ist ein echtes Formular.** `required`, Mindestlänge, `role="alert"`,
  drei Vorschlagsknöpfe und ein Rückweg („Doch nicht — Beat 12 wiederherstellen“). Kein
  Dialogmuster-Theater.
- **Die Vorbehalte stehen drin.** Der Abschnitt „Was dieser Spike beweist — und was nicht“
  benennt Zugriffsschutz, Konvergenz und Wiedergabe als *nicht bewiesen*. Damit ist die
  Überziehung, die ich in der letzten Runde gefunden hatte, behoben — ohne dass jemand die
  gültige Hälfte der Aussage gestrichen hätte. Vorbildlich.
- **Figurenfarbe erzeugt, mit Kollisionsschutz.** `hash(id) % 360`, und Töne unter 22° Abstand
  werden um den goldenen Winkel verschoben. Das ist strenger als meine Fassung, die nur
  modulo rechnet und bei zwölf Figuren kollidieren kann. Übernehmen — in B2.
- Karte, Licht, Nebel und Requisiten sind reines SVG aus Primitiven. Kein Rasterbild, keine
  Abhängigkeit, und sie sieht trotzdem nach etwas aus.

## Was es fakt oder überzieht

1. **Die Rücknahme wird vollzogen, bevor der Grund existiert.** Der Text im Formular sagt:
   *„Ohne Grund wird sie nicht festgeschrieben.“* Der Code sagt etwas anderes — `doUndo()` setzt
   `b.status = "reverted"`, rendert und ruft `syncClients(11)`, alles vor der ersten Tastatureingabe.
   Fünf Klienten stehen dann auf dem zurückgespulten Stand, und ein Beat trägt den Status
   `reverted` ohne die Pflichtspalte. In einem Anhänge-Protokoll ist genau das der Zustand, den es
   nicht geben darf. **Die Behebung ist ein Wort:** in `doUndo()` `"proposed"` setzen statt
   `"reverted"` — `project()` überspringt `proposed` bereits — und erst in `finishUndo()` auf
   `"reverted"` flippen. Dann heißt der Bildschirm, was er tut, und der Vorschlag→Commit-Zyklus
   aus §6 Änderung 2 gilt auch für die Rücknahme selbst.
2. **Reduzierte Bewegung ist bei der Wiedergabe nicht umgesetzt, sondern beschleunigt.**
   `speed = reduced() ? 8 : 2` spielt dieselbe Zeitachse viermal schneller ab; zusätzlich schreibt
   `$("#replayBar").style.transition = "…ms linear"` eine Übergangsdauer per JS direkt ins
   Element und umgeht damit die `--t-*`-Tokens **und** die `prefers-reduced-motion`-Regel
   vollständig. `product-B.md` §3-K3 verlangt ausdrücklich, dass die Rücknahme *in beiden Formen*
   spezifiziert ist, „weil der Flex nicht an einer Animation hängen darf, die ein epileptischer
   Spieler abgeschaltet hat“. Die reduzierte Form einer Wiedergabe ist kein schnellerer Film,
   sondern eine Schrittliste, die man selbst weiterschaltet. Generell: **was JS inline an
   `style.transition` schreibt, ist außerhalb des Token-Systems** — das ist die Klasse, nicht der
   Einzelfall.
3. **Kein Hochkontrast, keine `forced-colors`, keine Langtext-Locale, kein Artwork-Ausfall,
   keine Rollenachse.** Alle fünf Suchen liefern null Treffer. Zwei Folgen: (a) B1s vier
   Skin-Paletten über zwei Farbmodi sind **rechnerisch ungeprüft** — dieselbe Feststellung wie in
   der letzten Runde, und sie ist billig zu beheben. B2 rechnet 208 Paare über 4 Häute × 2
   Farbmodi × 2 Kontraststufen im Browser durch; engster Wert 3.23 bei Soll 3.0
   (Relic/dunkel, deckender Rahmen auf Fläche). Dieselben dreizehn Paare auf B1s Tokens
   anzusetzen ist eine Stunde Arbeit und sollte **vor** der Wertung laufen. (b) Ohne Rollenachse
   sagt B1 nichts zu der Fläche, die `product-B.md` §6 selbst „das größte Einzelrisiko des
   Kandidaten“ nennt. Das ist Sitzzuschnitt, keine Schwäche — aber die Runde darf B1 nicht als
   Beleg für die Auslassung lesen.
4. **Die Marken überschreiben einander genau dort, wo die Geschichte spielt.** Bei 1500 px
   kollidieren „Rauk Sill“, „Ossa Brandt“ und „Vaugn Kesselmann“ im Traubenzentrum zu
   „Oss…lt“. Der Nordkai hat rechts und unten viel Leerfläche; die sechs Ziele stehen auf
   einem Viertel der Karte. Kein Layoutbruch, aber der teuerste Moment des Artefakts ist der
   unleserlichste.
5. **Ein Inhalt, ein Genre.** Nur Aldenfall — wieder der Sitzzuschnitt, wieder der Hinweis:
   Universalität beweist B2, nicht B1.

## Was es in echt kosten würde

- **Der Fold ist ehrlich und deshalb teuer.** Zwölf Beats im Speicher zu falten ist gratis; die
  Produktionsfassung braucht Projektions-Schnappschüsse, deren Invalidierung und einen Test, der
  Fold und Schnappschuss gegeneinander hält. Genau dort wohnt der klassische Fehler aus §8-W3
  — *das Blatt sagt 14, die Chronik sagt 12*. B1 zeigt die schöne Hälfte davon; die Rechnung
  kommt später und sie kommt sicher.
- **Der Flächenschaden ist ein Kreis über einem Raster.** `targetsAt` misst euklidische Distanz;
  Wände blockieren nichts. Scheibe 1 verspricht Wand-*Darstellung* aus UVTT-Import, keine
  Wand-*Autorenschaft* — das Artefakt liegt also im Rahmen, sollte den Satz aber sagen, weil die
  Kopfzeile „UVTT-Import `nordkai-salzhaus.dd2vtt`“ etwas Stärkeres suggeriert.
- **Die fünf Gerätechips** sind fünf Kopien eines Zustands; B1 sagt das selbst. Der echte Preis
  ist Wiederaufsetzen ab Sequenznummer und zwei gleichzeitige Rücknahmen — Gate 2 aus §7.
- **`Wiedergabe 18 s`** ist hier eine Liste aus drei Beats mit Dauern. Auch das sagt B1 selbst.

## Empfehlung an die Runde

B1 als **Vorführung**, B2 als **Beweisführung** werten; sie widersprechen sich nicht und beide
haben jetzt ihre Grenzen aufgeschrieben. Für das, was gebaut wird, gilt:

- **Aus B1 übernehmen:** `project(upto)` als Zustandsquelle — kein Feature-Flag, sondern die
  Architektur; die Herkunftslinse mit Auswurf/Schaden/Übergang je Ziel; das Grundformular samt
  Rückweg; die Farbtonvergabe mit goldenem Winkel.
- **Aus B2 übernehmen:** die gerechnete Kontrastprüfung als CI-Gate; die Signaturprüfung des
  Komponentenvertrags (300 Permutationen, zwei Signaturen, null Abweichungen); die Zeugenmenge
  **auf dem Beat**, nicht nur auf der Aussage — sonst leckt die Transportleiste, was die
  Chronikseite zurückhält; Ressourcenrichtung (`sinkt`/`steigt`) als Feld statt als zweites Bauteil.
- **In beiden reparieren:** B1 den Statuswechsel `proposed → reverted` und die reduzierte
  Wiedergabe; B2 die Phasen-Aufzählung, die durch einen echten Fold ersetzt gehört.
