# Cross-Review: `spike-B1.html`, gelesen von GUI-Architekt 2 (B2)

Runde 2 · Kandidat B · geschrieben nach Fertigstellung von `spike-B2.html`, ohne Absprache.
Gelesen: Tokenblock, Projektion, Lesefassung, Editor, Abbruchfenster, Ehrlichkeitsnotiz.

---

## Was es trifft

1. **Eine Projektionsfunktion für alles.** Seite, Kartei, Umriss und die Tabelle „Wer sieht was"
   kommen aus derselben Funktion (`sieht`/`block`). Sie *können* sich nicht widersprechen. Das ist
   die stärkste strukturelle Ehrlichkeit in beiden Artefakten dieses Kandidaten — mein eigenes File
   rendert die Rollentabelle aus einem separaten Durchlauf und ist an dieser Stelle schwächer.

2. **Die Nachhall-Zahlen sind Joins, keine Literale.** `ANORDNUNGEN`, `RELATIONEN`, `KLAUSELN`,
   `AUSGABEN` existieren als Zeilen; „4 Anordnungen · 2 gestützt · 1 Klausel · 3 Charaktere · Quelle
   von 2" wird gerechnet. Damit ist der Kernsatz des Flex verdient und nicht behauptet.

3. **Der Einzelkarten-Editor ist das Wertvollste im File.** `contenteditable` mit
   `aria-multiline="false"`, Enter schreibt fest statt einen Absatz zu erzeugen, Escape verwirft.
   Das ist §7.4 Z-1 *als Verhalten gezeigt*, nicht als Kostenschätzung behauptet. Mein Spike hat an
   dieser Stelle nur ein `<textarea>` und beweist den Satz „kein Cursor überquert eine Kartengrenze"
   überhaupt nicht.

4. **Die Ehrlichkeitsnotiz steht auf der sichtbaren Oberfläche** — „Echt in dieser Datei" gegen
   „Gezeigt, nicht gebaut", inklusive „kein Zugriffsschutz", „nur eine der vier Anordnungen
   gerendert", „der Schnitt ist nicht gebaut". Genau das, was §13 verlangt, und die meisten Spikes
   tun es nicht.

5. **Der Skin Archive ist committed, nicht dekoriert.** Papiertextur, Serifensatz, Messing-Akzent,
   redaktioneller Rhythmus — die Lesefassung liest sich wie eine Seite und nicht wie ein Dashboard.
   Die Abschnittskaskade und die Ordinalzahlen nach der Projektion sind korrekt implementiert.

6. **Vesper, „abwesend seit Sitzung 12"** ist im Fixture angelegt — §9.1 („die einzige Halterin
   hat die letzten zwei Sitzungen gefehlt") ist damit vorbereitet statt nur zitiert.

---

## Was es fingiert oder auslässt

1. **Eine Achse von fünf.** `03-triumph-ui-direction.md` verlangt Inhalt × Skin × Rolle × Modus ×
   A11y als *unabhängige* Achsen. Bedient sind Rolle und Hell/Dunkel. Es gibt kein `data-skin`,
   keinen Inhaltswechsel (Fantasy → Sci-Fi → Kriminalfall), keinen Hochkontrast, keinen Zustand
   „Kunst fehlt", keine langen Labels. Die Punkte 1, 2, 7, 8 und 9 der Triumph-Abnahmematrix sind
   nicht adressiert. Das ist die verabredete Arbeitsteilung zwischen den beiden Sitzen — die Runde
   muss B1 dann aber als *den Moment* lesen und nicht als Universalitätsbeleg.

2. **Drei der vier Anordnungen sind Text in der Linse.** Das File sagt es selbst, und das ist
   ehrlich. Trotzdem: die Schlagzeile lautet „vier Seiten sind jetzt richtig", und genau diese
   Aussage wird behauptet statt gezeigt. Eine zweite, strukturell andere Anordnung aus derselben
   Karte hätte wenig gekostet und die Lücke geschlossen — es ist die einzige Stelle, an der der
   Kernclaim des Kandidaten unbelegt bleibt.

3. **Der Paste-Pfad nimmt `text/plain`.** Damit ist „genau eine Karte" bewiesen — aber §7.4 Z-1 ist
   erst grün, wenn *Marken erhalten und Struktur verworfen* wird. `text/plain` erhält keine Marken;
   es ist die billige Hälfte des Vertrags. Der teure Teil (HTML/RTF aus Google Docs, Word, einem
   Foundry-Journal auf eine Whitelist aus em/strong/code/link/`[[…]]` abbilden) ist nicht angefasst,
   und dort steckt der halbe Tag, den §7.4 veranschlagt.

4. **`prefers-reduced-motion` ohne Schalter.** Zeile 670 respektiert die Systemeinstellung — aber
   ohne sichtbaren Umschalter sieht eine Rezensentin auf einer normalen Maschine das
   Reduced-Motion-Design nie. Gerade dort muss der Countdown-Ring neu entworfen werden (Zahl statt
   Ring) und nicht bloß abgeschaltet; unbelegt bleibt, ob das getan ist.

5. **`role="alertdialog"` auf dem Abbruch-Toast.** Der Fokus wandert hin (`[data-akt="jetzt"]`) und
   Escape ist global gebunden — der Vertrag wird also weitgehend gehalten. Er ist trotzdem
   riskanter als nötig: `alertdialog` verspricht Modalität, und es gibt keine Fokusfalle. Bei einem
   Widget, dessen Sinn *„du kannst weiterarbeiten und trotzdem abbrechen"* ist, wäre `role="alert"`
   plus echter Button der ehrlichere Vertrag.

6. **`zuruecksetzen()` mutiert das Fixture: `delete K.k_a7e3`, `KARTEN.splice(...)`.** Funktioniert
   — aber die These dieses Kandidaten ist Unveränderlichkeit, per Datenbank-Grant erzwungen. Ein
   Spike, der die Karte *löscht*, um zurückzusetzen, modelliert genau das Gegenteil. Append-only mit
   Tombstone (§8.4) wäre gleich teuer gewesen und hätte die These im Code statt nur im Text gezeigt.

---

## Was es real kosten würde

- **Der Editor ist die teure Hälfte, nicht die Seite.** Was gezeigt wird, ist der einfache Fall.
  Der Vertrag aus §7.4 Z-1 (Marken erhalten, Struktur verwerfen, null DOM außerhalb des
  geschlossenen AST, drei fremde Quellformate) ist ein halber Tag nur, wenn die Whitelist wirklich
  klein bleibt; jede Konzession an Listen, Tabellen oder Bilder kippt das.
- **Die vier Anordnungen sind billig, sobald `pins ∪ query` existiert** — aber sie brauchen den
  Snapshot-Mechanismus aus §6.7, sonst rechnet jede Seitenansicht die Abfrage neu. Im Spike ist das
  ein Array-Filter; im Produkt ist es Invalidierung plus Cache-Key.
- **Der Rest ist ehrlich klein:** Nachhall = vier `COUNT`s, Berichtigung = ein Insert plus eine
  Relation, Abbruchfenster = eine Warteschlange vor dem Commit. §7.1 sagt das, und dieses Artefakt
  bestätigt es visuell.

---

## Verhältnis der beiden Artefakte

B1 ist der **Beweis, dass der Moment existiert**: eine Seite, ein Editor, fünf Leser, echte
Zahlen, eine Sekunde Gänsehaut. B2 ist der **Beweis, dass derselbe Bauteilsatz das überlebt**:
576 Kombinationen aus Inhalt × Skin × Farbschema × Kontrast × Kunst × Labels × Dichte ergeben eine
Struktursignatur; fünf Rollen ergeben fünf, und zwar durch Weglassen.

Keines der beiden ersetzt das andere, und die zwei zusammen decken die Triumph-Matrix ab — mit
einer verbleibenden Lücke, die beide teilen: **der Schnitt (§8.1) ist in keinem der Files gebaut**,
und das ist die Stelle, an der der Kandidat laut eigener Aussage am ehesten stirbt.
