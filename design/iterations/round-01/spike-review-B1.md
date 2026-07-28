# Quergutachten B1 → B2

GUI-Architekt 1 über [`spike-B2.html`](spike-B2.html) (Fassung 04:36), 2026-07-27.
Gelesen als Quelltext, gerendert in Chrome bei 1560 px und als vollständige Seite bei 2900 px Höhe.
Zahlen unten sind aus dem gerenderten DOM ausgezählt, nicht aus dem Text übernommen.

**Vorbemerkung zur Fairness.** Die Sitze hatten verschiedene Aufträge: B1 den Flex-Moment,
B2 den Beweis der Universalität. Was hier unter „fehlt“ steht, ist nur dort ein Vorwurf,
wo B2 etwas behauptet, das es nicht zeigt — und einmal dort, wo die *Runde* etwas braucht,
das keiner von uns beiden liefert.

## Was es trifft

- **Es rechnet, statt zu behaupten.** 208 Kontrastpaare über 4 Häute × 2 Farbmodi × 2
  Kontraststufen, im Browser, an genau den Tokens, die oben stehen; schlechtester Wert
  `relic / dark / standard · Rahmen, deckend = 3.23` bei Soll 3.0. Das ist die einzige Zahl in
  dieser ganzen Runde, die jemand nachrechnen kann, und sie war genau die Lücke, die das
  Quergutachten der vorigen Runde bei B1 aufgemacht hat. Sie gehört als CI-Tor ins Produkt,
  bevor irgendein Feature gebaut wird.
- **Die Strukturvergleichssignatur ist die beste einzelne Idee in beiden Artefakten.**
  Der Baum aus `Tag · ARIA-Rolle · data-comp`, gehasht über 216 Darstellungsachsen und
  72 Ablaufachsen, prüft den *Komponentenvertrag* statt das Aussehen. Damit ist die
  Unabhängigkeitsdoktrin aus `03-triumph-ui-direction.md` zum ersten Mal falsifizierbar:
  eine Haut, die Semantik verbiegt, fällt als geänderte Signatur auf. Als Snapshot-Test über
  jsdom kostet das etwa einen Tag und rettet auf Jahre.
- **Es hat die eigene Medizin genommen.** Die Metadaten-Leckage, die B2 in der Vorrunde bei
  B1 gefunden hat („drei weitere Figuren halten sechs Einträge“), ist hier ausdrücklich
  ausgeschlossen: „Die Oberfläche selbst nennt diese Zahlen nicht … weil der Prüfstand
  allwissend sein *darf* — der Klient nicht.“ Genau die richtige Trennung, und sie ist im
  Code durchgehalten, nicht nur im Fließtext.
- **Bewegung wird gemessen, nicht versprochen.** Eine echte Messsonde im Dokument liest
  140 / 280 / 780 ms aus den berechneten Stilen und meldet `Räumlicher Weg 1 → 0`. Und der
  Satz, der zählt, steht da: die Rücknahme ist in beiden Formen spezifiziert, der Flex hängt
  an keiner Animation.
- **Die Chronikseite hält §0 des Kandidaten ein.** Zwei Sätze Prosa, ausdrücklich als von der
  Spielleitung getippt markiert, alles andere als Auswurf des Protokolls. Und der Leerzustand
  ist korrekt formuliert: „Vor Sitzung 9 ist zu dieser Person nichts aufgezeichnet. Das heißt
  nicht, dass nichts geschah.“ Das ist W1 sichtbar in der Oberfläche statt in einer Fußnote.
- **Karte 7 nennt die eigenen Grenzen zuerst.** Kein Zugriffsschutz, Fixtures in derselben
  Datei, `WORLDS` in jeder Konsole. Ein Spike, der das selbst schreibt, ist mehr wert als
  einer, der darauf gestellt werden muss.

## Was es fakt oder überzieht

1. **Der Tisch ist kein Tisch.** Die Rezeptur „Taktisch“ ist fünf blasse Kreise auf einer
   leeren Fläche plus eine Liste von Balken; kein Raster, keine Schablone, keine Nebelkante,
   keine Wand. B2 sagt das selbst — *„Lichtmodell, keine Wände. Die Rezeptur Taktisch ist hier
   ein Bekenntnis, keine Umsetzung.“* — und das rettet die Ehrlichkeit, nicht die Beweislage.
   Für einen Kandidaten, dessen Satz „Foundry-grade live table“ lautet, heißt das: **die Runde
   hat kein Artefakt, in dem eine taktische Fläche die Achsenmatrix übersteht.** B1 zeichnet
   eine, prüft sie aber nicht gegen Rollen, Sprachen und Bildausfall. Diese Lücke ist die
   ehrlichste gemeinsame Schwäche der beiden B-Spikes und gehört in die Wertung, nicht in eine
   Fußnote.
2. **Die Kontrastlampe verspricht mehr, als die Prüfung deckt.** Gemessen werden die Paare,
   die die Seite selbst deklariert (13 im aktuellen Zustand, 208 über alle Konfigurationen).
   Nicht darin: Text über der Kornschicht, Text auf der Bühnenfläche, deaktivierte Zustände,
   Platzhaltertext, Fokusring gegen die *Akzentfläche* statt gegen den Grund. Die Karte selbst
   ist präzise; die Statuslampe ganz oben liest sich als „das Produkt besteht Kontrast“, und
   das steht in keinem Verhältnis zu einer selbstgewählten Paarliste. Eine Zeile Beschriftung
   („208 deklarierte Paare“) räumt das aus.
3. **Die Signatur schließt genau das aus, worauf es sicherheitsseitig ankommt.** „Rollen dürfen
   abweichen — Auslassung ist der Zweck“ und „Fließtextabsätze sind Blätter“. Beides ist
   sauber begründet, aber es bedeutet: bewiesen ist, dass die *Schale* über Rollen stabil
   bleibt, nicht dass die *Projektion* dicht ist. Wer die Signatur als Rollenbeweis liest,
   liest sie falsch — und sie lädt zu dieser Lesart ein, weil die Rolle als Achse gleichwertig
   neben Haut und Inhalt steht.
4. **Eine einzige `aria-live`-Region auf einer Seite, die aus Zustandswechseln besteht.**
   Ausgezählt: 12 × `aria-label`, 9 × `aria-current`, 7 × `aria-pressed`, **1 × `aria-live`**.
   Ein Wechsel von Inhalt, Haut, Rolle oder Dichte baut die halbe Anwendung um; für eine
   Person am Screenreader passiert das lautlos. Ein zweiter, höflicher Live-Bereich für
   Achsenwechsel („Rolle: Zuschauend — 3 Aussagen ausgelassen“ … ohne die Zahl, siehe Punkt 3
   des eigenen Prüfprotokolls) kostet zehn Zeilen.
5. **Der Rohantwort-Block ist Beweisführung im Konjunktiv.** Das gezeigte JSON ist im selben
   Skript erzeugt, aus dem auch die Oberfläche liest. Es zeigt den *Vertrag* einer Antwort —
   was auch B2 so schreibt — aber es steht optisch als „Rohantwort an diesen Klienten“ da und
   sieht damit aus wie ein Netzwerkmitschnitt. Beschriftung „so *soll* die Antwort aussehen“
   statt „so sieht sie aus“, dann stimmt Bild und Behauptung überein.
6. **Das Demopaket riecht nach 5e.** „Feuerball“, „Schablone 6 m“, „LP“. Das verletzt keine
   Regel (keine Genre-Substantive in Routen, Anzeigenamen aus dem Paket — Karte 5 beweist das
   sogar), aber ein eigenes System hätte hier nichts gekostet und die Unabhängigkeitsthese
   noch etwas härter gemacht.

## Was es in echt kosten würde

- **Kontrastharnisch:** ~150 Zeilen plus eine gepflegte Paarliste, als CI-Tor. Bester
  Nutzen pro Zeile in der ganzen Runde. Sofort übernehmen.
- **Strukturvergleichssignatur:** ein Tag über jsdom, danach ein Snapshot je Achsenkombination.
  Der teure Teil ist nicht der Hash, sondern die Disziplin, `data-comp` in jeder Komponente
  zu pflegen — und genau die will man ohnehin.
- **Achsenmatrix als bleibende Entwickleroberfläche** („Prüfstand“-Route in der Schmiede):
  klein, und sie hält die Doktrin am Leben, wenn in Akt III niemand mehr an sie denkt.
- **Auslassungsnachweis:** wie geschrieben null Beweiskraft serverseitig — was Karte 7 sagt.
  Die echte Fassung ist der Differenztest aus §7 des Kandidatendokuments (8 Figuren × 40
  Behauptungen × 3 Zustände × 2 Sprachen) plus eine adversarische Menschenstunde. Der Spike
  ersetzt ihn nicht, er beschreibt ihn gut.
- **Die taktische Fläche:** Raster, Schablonengeometrie, Nebelmaske und UVTT-Wände sind in
  Scheibe 1 eingeplant und in keinem Artefakt der Runde gegen die Achsen geprüft. Das ist
  Wochen, nicht Tage, und es ist der Ort, an dem W4 („der Flex stirbt im Standbild“) und die
  Renderer-Grenze aus `03` zusammenfallen.

## Empfehlung an die Runde

**B2 als Beweisführung werten, B1 als Vorführung** — sie widersprechen sich in keinem Punkt,
und ihre Stärken sind komplementär bis zur Verdächtigkeit: B2 misst und zeigt keine Bühne,
B1 zeigt eine Bühne und misst nicht.

Zu übernehmen, unabhängig davon, welcher Kandidat gewinnt:

1. der gerechnete Kontrast **und** die Strukturvergleichssignatur aus B2, beide als Tor, nicht
   als Text;
2. aus B1 die Faltung als einzige Wahrheit (`project(seq)` trägt Tisch, Umriss und Chronikseite
   — Rückgängig ist dann kein Feature, sondern eine Zeile) und der Zustandsänderungs-Block als
   bewegungsfreie Form desselben Ereignisses;
3. in **beiden** Artefakten bleibt der Satz stehen, den keiner von uns beweisen kann: ein
   Einzeldatei-Spike zeigt den Vertrag einer Antwort, niemals den Zugriffsschutz.

Und eine Bitte an die Wertung: **die fehlende geprüfte Kartenfläche nicht einem der beiden
Sitze anlasten.** Sie ist ein Auftragsloch der Runde, kein Versäumnis eines Architekten.
