# Cross-review — GUI Architect 1 (seat: THE FLEX) reviews `spike-A2.html`

Reviewer: seat A1 · 2026-07-27 · candidate A, round 1
Artifact under review: [`spike-A2.html`](spike-A2.html) — *„Prüfstand A2 — Universalitätsnachweis
für den Lebenden Kodex"*
Reviewer's own artifact, for disclosure of bias: [`spike-A1.html`](spike-A1.html)

The two seats did not build the same screen. A2 is the **system argument** (one component set
carrying three content packages × four skins × three roles × light/dark × contrast × motion ×
missing art × long labels, with a test bench, a fingerprint and a 12-step sweep). A1 is the
**emotional argument** (one screen, one keystroke, three surfaces changing at once). The overlap
is exactly one mechanism — pressing `R` — and A2 treats it as one axis among eight while A1 treats
it as the peak. That division held. Good.

---

## What it nails

**1. The seed-token architecture is the best single idea in either A-artifact.**
A skin is roughly fourteen lines: three hue/chroma pairs, four font stacks, a reading size, a
measure, a tracking rule, three radii, an ornament switch. Every surface colour is then *derived*
in OKLCH from those seeds through a light ladder and a dark ladder. That is why `Signal` is not
`Relic` recoloured — it moves hue, chroma, radius (0 px), letter-spacing (.07em), casing
(uppercase) and reading measure (68ch vs 58ch) at once, from data.

My own artifact hand-picks sixty-six literal values across two modes. It looks the way I wanted
and it does not generalise: a user-authored skin in A1's system is a designer's afternoon; in
A2's system it is a form with about ten fields. **K1 says theming must be intuitive and
user-adjustable with template presets.** A2's approach is the one that can actually carry a Theme
Studio. I would adopt it over mine and I am saying so in writing.

**2. The contrast measurement is real and it is the most transferable thing in the round.**
A 1×1 canvas probe reads the *computed* colour of `--ink`, `--ink-3` and `--accent-ink` against
`--paper`, runs proper WCAG relative luminance, grades AA/AAA per pair, and the 12-step sweep
reports the **worst ratio it actually saw**. The triumph direction promises "themes pass automated
contrast validation" and product-A §7.8 makes it a CI gate from slice 1. Every previous document
in this lineage asserted that. This is the first artifact that *runs* it. Lift this out of the
spike and into the build before anything else from either seat.

**3. It checked the combination that usually breaks.**
High contrast × dark is handled twice and correctly: once inside `@media (prefers-color-scheme:
dark)` guarded with `:not([data-theme="light"])`, once as the explicit `[data-contrast="hoch"]
[data-theme="dark"]` twin. I went looking for the classic failure — a high-contrast block written
against the light ladder leaking into dark and producing near-black ink on a near-black page — and
it is not there. That is not luck; someone thought about it.

**4. The „Antwort" tab is the right way to argue §6.7.**
Rendering the intended response body, with unauthorised passages *absent* rather than greyed, and
labelling the omission ("nicht ausgegraut, nicht redigiert — nicht gesendet"), is the correct
visual grammar for the product's load-bearing invariant. Paired with the honesty block that says
plainly this is the *intended* server shape and not an enforced one, it is exactly the register
this crew should write in.

**5. Deterministic state in the URL fragment.** Every combination is linkable and reproducible.
That is what makes a design contract auditable instead of anecdotal, and it is a habit worth
making mandatory for all future spikes.

---

## What it fakes

**1. The universality proof is circular, and it is the artifact's central weakness.**
Three content packages, four passages each, authored with *deliberately identical structure* —
the comment says so outright ("Die Struktur ist absichtlich identisch — das ist der Beweis"). But
identical structure rendering identically is not a proof of universality; it is a tautology. The
question that would actually hurt is the one the bench cannot ask: does a Krimi package *want* the
same four-passage article page, or does it want an evidence board, an alibi grid and a timeline —
i.e. does system-agnosticism survive contact with a system that disagrees about the shape of
knowledge? Its own honesty note concedes "vier Passagen sind ein Beweis, kein Lasttest"; the
deeper concession it does not make is that the fixtures were written to agree.

**2. The role axis changes fewer structures than the copy claims.**
"Rollen ändern *Struktur*" — they change the passage set, the shelf and the available actions,
which is real and correctly server-shaped in intent. But Beobachter, Spieler and SL still read the
same stage in the same geometry. The triumph doc's observer promise (a curated, non-mutating
surface) is met at the level of controls, not at the level of a different workspace. That may well
be the right product answer; it is not the answer the headline implies.

**3. The strongest skins lean on assets nobody can ship.**
`--frame` points at `../../spikes/assets/universal-ui/*.png` — 1.9–2.5 MB each, and the intake
already ruled these prototype direction art with no Tier-0 rights chain. It degrades correctly
(a missing `border-image` simply does not paint) and the honesty block names the problem. Still:
two of the four skins photograph well because of files that are not clearable, and the artifact's
"a skin is more than a recolour" claim is partly carried by them. Turn art off and `Relic` and
`Archive` converge harder than the bench admits.

**4. The clause is asserted, not computed — and so is mine.**
"Der Wurf ist eine Konstante" is disclosed. The +2 goes live because a boolean flipped, not
because an engine resolved a formula over a revelation set. My artifact has precisely the same
debt wearing a nicer coat: I animate a number from +5 to +7 with a cubic ease, which is *more*
persuasive and no more real. **This is a shared debt of the round, not a mark against A2**, and
Hephaistos should price the engine before either of us is believed. Product-A §7.6 is right that
this organ cannot be deferred; neither spike proves it exists.

**5. `aria-pressed` toggle buttons where radio groups belong.**
The axis controls sit in `<fieldset><legend>` and are announced correctly, but a group of
`aria-pressed` buttons loses native arrow-key navigation within the group; real radios give it for
free. Small — except this is the artifact whose thesis is that accessibility is architecture, so
the one place it should not spend a keyboard affordance is the control surface of its own
accessibility bench.

**6. OKLCH and `color-mix(in oklab, …)` with no fallback layer.**
Defensible in 2026 and the seed system genuinely needs a perceptual space. But it is a hard
browser floor chosen inside a spike, and floors chosen in spikes have a way of becoming stack
decisions nobody voted on. Say it out loud in the verdict rather than discovering it at build time.

---

## What it would cost to build for real

| Piece | Honest cost | Note |
|---|---|---|
| Seed-ladder token system | **Days.** Adopt verbatim. | Pays for itself immediately: a user-authored skin becomes a form, which is 60 % of the Theme Studio (K1). |
| Live contrast gate | **Days**, cheaper headless than here — the same luminance math over resolved tokens, no canvas needed. | Should land in CI in slice 1, not in a spike. Highest transfer value in the round. |
| Deterministic state fragments | **Hours.** | Make it a house rule for every spike and every bug report. |
| „Antwort" / response-body inspector | **A day for the panel. The hardest week of the slice for the thing it depicts.** | Meaningless until `visible_passages(viewer, scope, at_time)` exists server-side with the exhaustive matrix from §6.7 *and* the CI lint that fails any query bypassing it. The panel must not ship before the function, or it becomes a lie with a monospace font. |
| Four 9-slice skin kits | **Not costed here, and it is the expensive one.** | Tier-0 commissioning, slice metrics, safe text insets, resolution tiers, emissive masks, ledger rows — per asset, per skin. The intake flags art-production cost as the open business question; this bench quietly assumes it solved. |
| Three content packages as *real* packages | **Weeks, and it is the honest version of the universality claim.** | Today they are three fixtures with a shared shape. A genuine proof needs one package whose author did not know about the other two. |

---

## The gap neither seat filled

Product-A §4.2 says the Canon Diff "is the product's heartbeat and should be the most polished
single surface we ship." **Neither A1 nor A2 built it.** A2 built the axes, A1 built the peak, and
the screen the candidate's own thesis calls its most important remains undrawn in round 1. If
Pythia forges a round 2 for this candidate, that is the seat.

---

*A1, seat: the flex. I lose the architecture argument to A2 and I know it. I keep the claim that
a product is sold by a moment and audited by a bench, and that the round needs both on the table.*

---

# Cross-review, Schmiede 2 — A1 (Sitz: DER FLEX) liest `spike-A2.html`

Reviewer: Sitz A1 · 2026-07-27, Schmiede 2 · Kandidat A, Runde 1
Gelesenes Artefakt: [`spike-A2.html`](spike-A2.html), Stand 04:36 — *„Härtestand A2 —
Universalitätsnachweis für den Lebenden Kodex"*
Eigenes Artefakt zur Offenlegung der Befangenheit: [`spike-A1.html`](spike-A1.html).
Die Fassung 1 beider Sitze bleibt unverändert erhalten (`spike-A1-forge-1.html`); der Abschnitt
oben bezieht sich auf sie und wird nicht überschrieben.

Die Arbeitsteilung hat wieder gehalten, schärfer als beim ersten Mal. A2 ist ein **Labor**: ein
Prüfband mit neun unabhängigen Achsen, einer Abdeckungszählung, einem Feindtest und einer
Kontrastmessung am gezeichneten Pixel. A1 ist **ein Bildschirm um eine Taste**. Überlappung: die
Projektionsfunktion und die Passage `p_a4` / `p_7a21`. Sonst nichts.

---

## Was es trifft

**1. Die dreistufige Tokenarchitektur ist die beste Einzelidee der Runde — und sie ist jetzt
begründet, nicht nur schön.** Saat (≈16 Zeilen pro Haut) → Leiter (hell/dunkel setzen *nur*
Helligkeit) → Endtoken (nur die kennen die Bauteile). Der Gewinn ist konkret und nachprüfbar:
weil ausschließlich Endtoken in Bauteilregeln stehen, kann `@media (forced-colors)` die Endtoken
gegen Systemfarben tauschen, ohne eine einzige Komponentenregel anzufassen. Das ist kein
Styling-Trick, das ist Architektur, und es beantwortet K1 („Theming muss intuitiv und
benutzerseitig anpassbar sein") auf eine Weise, die mein eigenes Blatt nicht kann. Ich vergebe
rund sechzig Literalwerte über zwei Modi; A2 vergibt drei Farbton/Chroma-Paare. Für eine
Theme-Studio-Oberfläche ist meines eine Designerwoche und A2s ein Formular. **Das gehört
adoptiert, und zwar ganz.**

**2. `--hc` als Rechenschalter statt als zweiter Farbsatz.** Hoher Kontrast ist kein paralleler
Palettenzweig, sondern ein Faktor, den jede Leiterzeile per `calc()` einrechnet. Damit ist die
klassische Bruchstelle — ein Hochkontrastblock gegen die helle Leiter geschrieben, der in Dunkel
fast-schwarze Tinte auf fast-schwarzem Papier erzeugt — strukturell unmöglich statt nur zufällig
abwesend. Dasselbe Muster für Bewegung (`--mo`) und Dichte (`--dens`).

**3. „Abdeckung: 1 von 36 Kernkombinationen".** Ein Zähler, der die eigene Lücke anzeigt. Das ist
die ehrlichste einzelne Zeile in beiden A-Artefakten, und ich wünschte, sie stünde in meinem.

**4. „Bildmaterial: Kit an / Aus (Clean-Boden) / Fehlt (404)" als eigene Achse.** Fehlende Kunst
ist damit ein *Zustand des Systems*, kein Unfall — genau Punkt 9 der Abnahmematrix in
`03-triumph-ui-direction.md`, und der einzige Ort in der Runde, an dem er wirklich geprüft wird.

**5. Ein Befund, der in `product-A.md` §10.2 fehlt.** *„Der Steckbrief ist eine Leseroute. Eine
Zeile ‚Siegel-Status → gefälscht' leckt genauso wie ein Absatz."* §10.2 zählt
Autovervollständigung, Rückverweiszahl, „meintest du", 404-gegen-403 und ETag auf —
Infobox-Zeilen stehen dort nicht. A2 hat sie modelliert (`ib[].a`, `secret`) und benannt. Das ist
eine echte Ergänzung der Angriffsfläche und sollte in die Dokumentenlinie zurückfließen, statt im
Spike zu verhungern.

**6. Der Chip „Sicherer Kontext: ja/nein" misst §7.3 an sich selbst.** Die Erkenntnis, dass eine
Spielerin auf `http://192.168.x.x` Service Worker, WebGPU und OPFS *leise* verliert, wird hier
nicht behauptet, sondern zur Laufzeit gelesen. Genau so gehört sie in den Beitrittsdialog.

---

## Was es vortäuscht

**1. Das Kontrast-Gate ist nie rot geworden — und ein Test, der nicht scheitern kann, hat sich
nicht bewiesen.** Ich habe es getrieben: „Schlimmster Fall" auslösen → `#gate` bleibt `ok=1`,
„Gate grün für 6 geprüfte Paare". Danach „Durchlauf" (zwölf Kombinationen am Stück) → wieder
grün, bei 1680 px wie bei 380 px. Das Messwerk ist echt (1×1-Canvas, `getComputedStyle`, korrekte
WCAG-Relativluminanz, sechs benannte Paare mit eigenen Schwellen) — aber ein Leser kann *aus dem
Artefakt heraus nicht unterscheiden*, ob alle Kombinationen bestehen oder ob die Messung
strukturell immer besteht. **Fix, eine halbe Stunde: eine absichtlich kaputte Haut oder ein
absichtlich zu blasses Endtoken mitliefern, das das Gate sichtbar rot färbt, und daneben
schreiben „so sieht der Build-Bruch aus".** Ohne den roten Fall ist das Gate eine Behauptung mit
Nachkommastellen. Das ist meine schärfste Kritik an einem sonst sehr guten Artefakt.

**2. Die drei Inhaltspakete sind eine Ersetzungstabelle, kein Universalitätsbeweis.** Der
Kommentar sagt es offen (*„Die Struktur ist absichtlich identisch — das ist der Beweis"*), und
für die schwache Behauptung — *derselbe Bauteilsatz trägt drei Vokabulare* — stimmt das. Aber die
Pakete sind nicht bloß strukturgleich, sie sind stellenweise wörtlich transponiert: neun Passagen
in identischen Rollen, „2 von 7" Ratssitze *und* Ratsstimmen, „40 000" Kronen *und* Einheiten,
die Fälscherin heißt in Fantasy *und* Science Fiction **Ilva Ceren**, und **Roon** ist
Hafenmeisterin wie Dockmeisterin. Das liest sich wie Suchen-und-Ersetzen und schwächt genau die
Aussage, die es tragen soll. Die harte Frage bleibt unstellbar: *will* ein Krimi-Paket denselben
Neun-Absatz-Artikel, oder will es eine Indiztafel, ein Alibiraster und eine Zeitleiste? Ein
Paket, dessen Autor die anderen beiden nicht kannte, wäre der Beweis. Drei Transpositionen sind
eine Demonstration.

**3. Das Prüfband ist kein Produkt, und das darf die Runde nicht verwechseln.** A2 sagt es selbst:
*„Dieses Band ist kein Produkt-Chrome."* Richtig und sauber. Die Folge bleibt: das Artefakt kann
die Frage *„würde Kaya das Timo zeigen?"* nicht beantworten, weil neun Schalterreihen über allem
stehen. Das ist Sitzteilung, kein Fehler — aber Abdeckung ist nicht Begehrlichkeit, und K3
verlangt beides.

**4. Die stärksten Häute hängen weiter an Bildern ohne Rechtekette.** Drei PNG aus der
Spike-Serie, RB-04-Status offen, im Artefakt korrekt deklariert und über die Bildmaterial-Achse
abschaltbar. Trotzdem gilt der Befund aus Fassung 1 unverändert: schalte die Kunst ab, und
`Relic` und `Archive` rücken näher zusammen, als die Überschrift „Haut ≠ Umfärben" nahelegt. Die
Typografie- und Maßunterschiede tragen die Behauptung — die Rahmenkits schmücken sie.

**5. Die geteilte Schuld der Runde, unverändert: die Klausel ist eine Konstante.** A2 sagt es
(*„der Wurf ist in diesem Stand eine Konstante"*), ich sage es auch. Beide Blätter zeigen die
zweite Hälfte des Flex als Bild. `product-A.md` §9.2 schneidet Klauseln aus Slice 1 —
Hephaistos muss die Engine bepreisen, bevor einer von uns geglaubt wird.

**6. Ein Bauteil-Attribut wird aus einem Tokenwert per JS gespiegelt.** `--frame` → `data-frame`,
weil CSS nicht auf Tokenwerte selektieren kann. Offengelegt und pragmatisch. Aber es ist die eine
Stelle, an der „eine Haut ist reine Daten, null Bauteilarbeit" nicht ganz hält: sie braucht eine
JS-Zeile, die die Namen der Rahmenkits kennt.

---

## Der Zahlenstreit, der in den Verdikt gehört

Beide Sitze sind auf dieselbe Inkonsistenz in `product-A.md` §2 gestoßen und haben sie
**gegenläufig** gelöst. Das muss Apollon entscheiden, nicht der Zufall:

| | A2 | A1 |
|---|---|---|
| Befund | 9 / 4 / 5 ist nicht kumulierbar | dito |
| Lösung | **Zahl korrigieren** auf 9 / 4 / 6 („die Zahl kommt aus den Daten, nicht aus dem Dokument") | **Datenform ändern, Zahl behalten**: die Klauselpassage `p_4f9c` liegt in einem *zweiten Eintrag* („Die Vharon-Rechnungsbücher"), im Artikel hält Sera nur die Fälschung zusätzlich → 9 / 4 / 5 |
| Nebenwirkung | §2 muss umgeschrieben werden | die Herleitung des `+2` zitiert einen Satz aus einem **anderen** Eintrag — die Mechanik läuft über Eintragsgrenzen, das ist erst ein Graph |

Ich halte meine Lösung für die bessere *Produktaussage* und A2s für die ehrlichere
*Dokumentendisziplin*. Beides gleichzeitig geht nicht. Eine der beiden Fassungen von §2 muss
sterben.

Zweiter Fund, den nur A1 hat und der die Runde betrifft: **`Strg+3` ist die Kerngeste des
Kandidaten und im Browser vergeben.** Chrome und Firefox reservieren `Strg+1…8` für den
Tabwechsel; die Seite bekommt das Ereignis nicht. Im Electron-Gehäuse ist der Griff frei. Das ist
kein Spike-Detail, das ist B8 (Browser/Desktop-Parität) an einer sichtbaren Stelle.

---

## Was es wirklich kosten würde

| Stück | Ehrliche Kosten | Anmerkung |
|---|---|---|
| Saat → Leiter → Endtoken | **Tage. Sofort übernehmen.** | Zahlt sich am ersten Tag zurück und ist rund 60 % einer Theme Studio (K1). Ohne Alternative in dieser Runde. |
| `--hc` als Rechenschalter | **Stunden**, wenn die Leiter steht. | Macht Hochkontrast zu einer Eigenschaft des Systems statt zu einem zweiten Design. |
| Kontrast-Gate | **Tage**, kopflos billiger als hier — dieselbe Luminanzmathematik über aufgelöste Tokens, kein Canvas nötig. | Gehört in CI in Slice 1, **mit einem absichtlich roten Fall in der Testsuite**, sonst ist das Gate unbewiesen. |
| Abdeckungszähler + Zustand im Adressfragment | **Stunden.** | Hausregel für jeden Spike und jeden Fehlerbericht. |
| Antwortkörper-Inspektor (beide Sitze) | **Ein Tag für die Ansicht. Die härteste Woche des Slices für das, was sie zeigt.** | Wertlos, bevor `sichtbarePassagen(leser, geltung, zeit)` serverseitig existiert *und* eine Lint jede Abfrage daran vorbei rot macht. Die Ansicht darf nicht vor der Funktion ausliefern, sonst ist sie eine Lüge in Monospace. |
| Infobox-Zeilen als Leseroute (A2s Befund) | **Klein im Code, groß in der Testmatrix.** | §10.2 um Steckbriefzeilen ergänzen; jede Zeile braucht ihren eigenen Test wie jeder Absatz. |
| Vier 9-Slice-Kits | **Nicht bepreist, und es ist der teure Posten.** | Tier-0-Beauftragung, Schnittmaße, Textsicherheitsränder, Auflösungsstufen, Ledgerzeilen. §8 finanziert zwei (`Clean`, `Archive`); `Relic` und `Signal` stehen in A2 korrekt als „nach Start". |
| Drei echte Pakete statt drei Transpositionen | **Wochen — und das ist die ehrliche Fassung des Universalitätsanspruchs.** | Ein Paket, dessen Autor die anderen nicht kannte. |

---

## Was beide Sitze weiterhin nicht gebaut haben

Den **Editor**. A2 benennt es (§10.3: stabile Passagen-Anker über Bearbeitungen, der größte
unbepreiste Posten des Kandidaten), ich benenne es auch, keiner hat eine Zeile davon angefasst.
Beide Artefakte setzen feste IDs in einem Literal voraus. Der gesamte Kandidat steht auf dieser
Annahme, und Runde 1 hat sie zweimal umfahren.

---

*A1, Sitz: der Flex. Ich verliere das Architekturargument erneut an A2 und sage es erneut in
Schrift. Was ich behalte: ein Produkt wird in einem Moment verkauft und in einem Labor geprüft,
und eine Runde, die nur eines von beidem auf dem Tisch hat, hat den Kandidaten nicht gesehen.*
