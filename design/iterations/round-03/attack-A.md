# Attack on Product Candidate A — „Der Konvent", Round 3

**Nemesis, die Widersacherin.** Read: `product-A.md` (902 lines), `spike-A1.html` (2,079 lines) and
`spike-A2.html` (2,334 lines) **as source**, both cross-reviews, `00-intake.md`, `02-domain-model.md`,
`03-triumph-ui-direction.md`, `RB-11`, and the RB-01 briefs for Foundry, Roll20, Fantasy Grounds,
Owlbear, Alchemy and TaleSpire.

I attacked the strongest reading. Where the candidate names a weakness before me, I do not claim it
as a finding — §9.1, §9.2, §9.3, §9.6 and §9.8 are conceded by name in §14 below, and a concession
from me is meant to be worth something.

**Verdict line:** three fatal breaks, nine major, two minor. Two of the three fatals are in the
artifacts, are reproducible from a URL, and are the exact failure mode §9.4 says will kill this
candidate — committed by the candidate's own measuring instrument, one round after it was named. The
third is not in the code at all: **§7 answers the reachability charge in the wrong unit and never
notices that the ratified one-time licence cannot pay for the world it now requires to be awake.**

---

## FATAL 1 — The live region hands the Beobachter seat a count, a byline and a name

**Where:** `spike-A2.html`, `#meldung` (markup line 937: `role="status" aria-live="polite"`, inside
`<footer class="brett">`, rendered for **every** role) · `ersteMeldung()` lines 2320–2332 ·
`nachSitzwechsel()` lines 2225–2233 · `scanRaum()` lines 1785–1788.

**Scenario, walkable in one action.** Open

```
spike-A2.html?rolle=beobachter
```

That is a documented preview address — the file lists it itself at line 922, labelled *„Stream ohne
Autorenschaft"*. `zustand.rolle` becomes `beobachter`, `erlaubteSitze()` narrows to the single seat
`stream`, and `SITZE` (line 1166) declares that seat's contract in its own words: **„nur öffentliche
Absätze · keine Bylines."** `projektion('stream')` duly returns `autoren: []` (line 1375);
`autorenleisteHtml()` duly prints, at line 1501, *„Autorenschaft wird an Beobachter nicht
ausgeliefert — weder als Scheibe noch als Name noch als Zahl."*

Then `ersteMeldung()` runs and writes into the polite live region, verbatim:

> **Bruder Alder** · **6** Absätze für diesen Sitz, **5** stehen nicht im Dokument — **2** davon von
> **Sera**. Nicht ausgegraut, nicht gestummelt — nicht vorhanden.

I recomputed the projection independently against the `PAKETE.aldenfall.bloecke` array: seat `stream`
holds 6 of 11 Absätze; 5 are withheld; 2 of those 5 (`p-07`, `p-11`) are Sera's. The numbers in the
announcement are exactly right, which is the problem. In one sentence, into the accessibility tree of
the seat that must have **no** authorship at all, the product delivers:

1. **that withheld material exists** — the existence disclosure `§6.4` forbids;
2. **how much** — the denominator `§6.2 rule 2` says is unwritable rather than merely forbidden;
3. **a name** — and not just any name: the name of the player whose secret is the entire flex.

This is not confined to the observer. `nachSitzwechsel()` (line 2230) composes the same string on
**every** seat change, including under `rolle=spieler`, where `sichtblockHtml()` labels the surface
*„Angemeldet als"* and explains *„Dein eigener Platz. Diese Seite ist die, die der Server dir
schickt."* `?rolle=spieler&sitz=brannt` produces the same 5 / 2 / Sera.

**Why it is fatal and not a spike detail.** `product-A.md` §6.4 states the governing rule as a rule,
not a wish: *„unter jeder Verfassung sieht ein Nicht-Halter **gar keine Byline** — keine redigierte
Byline, keine Zahl, kein ‚1 weiterer Autor'."* The artifact violates all three clauses of that
sentence in one live region. Invariant 1 (server-authoritative permissions; client-side hiding is
never a boundary) and invariant 8 (accessibility is architecture) both fall.

**Why it is worse than the leak itself.** `scanRaum()` — the Leak Bench's search space — is

```js
return ['#buehne', '#eintragsliste', '#autorenzeile', '#pfad']
```

`#meldung` is not in it. So while the sentence above is on screen and in the accessibility tree, the
Prüfstand reports `Treffer im Dokument 0 · bestanden`, `Treffer im Barrierefreiheitsbaum 0 ·
bestanden`, and prints *„Keine Fundstelle. Die entfallenen Absätze stehen nicht im Dokument — sie
sind nicht ausgegraut, nicht gestummelt, nicht gezählt."* The last four words are false at the moment
they are printed.

§9.4 stakes the candidate's survival on one claim: that round 2's eight leak sites — including one
that announced *„6 von 13 Karten vorhanden, 7 nicht vorhanden"* into the accessibility tree while the
visible surface was correct — were a rate that `Sicht` will fix. Round 3's flagship universality
spike, whose declared purpose is to prove that the projection is clean and that the check **can
fail**, reproduces that exact bug in that exact organ, and its own bench is architecturally blind to
it. That is a measurement of the rate, and the measurement is bad.

**Companion, GM-scoped, same mechanism, reported here for rate rather than as its own finding.**
`spike-A1.html` line 1870: `setzeLeser()` announces into `#ansage` (`aria-live="polite"`, line 1423)
*„Aus Sicht von Vesper. 7 von 11 Absätzen sichtbar, 4 nicht vorhanden."* Forty-one lines earlier, the
same file's own `#pruef` list asserts (line 1811): *„Kein Nenner in der Leserprojektion — ‚x von y'
steht nur in dieser SL-Karte."* The dial is GM apparatus, so this one is not itself a boundary
crossing — but the claim and its refutation are in the same render pass, and the same helper is the
announcement path for everything else in the file.

---

## FATAL 2 — The counted absence is printed on the reader's own page, in both artifacts

The flex paragraph of `product-A.md` §2 makes a promise in three negations:

> The page does not grey them, does not stub them, **does not say „5 weitere"**; they are absent, and
> so are their bylines.

Both artifacts say „5 weitere". Differently, and on the stage.

**(a) `spike-A2.html` — „−5 Absätze entfallen", in the article header, for players and observers.**

`sichtblockHtml()` line 1525 computes

```js
const entfallen = absatzZahl(prSl) - absatzZahl(pr);   // projektion('sl') minus projektion(sitz)
```

and line 1550 emits it unconditionally on `entfallen > 0`:

```js
+ (entfallen > 0 ? '<span class="entfallen' + (motionAn() ? ' puls' : '') + '" …>'
  + '<span class="zahl">−' + entfallen + '</span> Absätze entfallen</span>' : '')
```

`istBrille` (line 1521) is consulted **only** to choose the caption *„Aus Sicht"* vs. *„Angemeldet
als"* and the explanatory sentence. The counter is not guarded by role at all, and
`renderBuehne()` (line 1630) places `sichtblockHtml(sitz)` inside `<header class="artikelkopf">` of
`#buehne` — the stage, not the Prüfstand.

Scenario: `spike-A2.html?rolle=spieler&sitz=brannt`. Brannt's own page header reads
**„−5 Absätze entfallen"**, pulsing. The reference point of that subtraction is
`projektion('sl')` — the *Spielleitung's* projection. Brannt's client is told the size of the GM's
document. Under `?rolle=beobachter` the stream audience gets the same −5, on a Twitch overlay.

**(b) `spike-A1.html` — the Antrag counter is inside `<article class="blatt">`, and it changes when
a reveal that excludes you happens.**

Markup line 1322, inside the reader projection surface:

```html
<span>Anträge: <b class="num" id="ss-antraege">1 offen</b></span>
```

`renderAntrag()` writes it at line 1690 and line 1696 **regardless of `S.leser`**. Walk it:

1. Open `spike-A1.html`. In *Aus Sicht*, pick **Vesper** (`Alt+4`). Her page — the page the whole
   spike exists to photograph as *absence* — reads `Anträge: 1 offen`. Vesper's character has been
   absent since Sitzung 12. She did not write the Antrag, cannot read the anchor passage `p4`
   (`haelt: ["sera","brannt"]`), and has no relation to it. She is told a ratification proposal is
   pending.
2. Take the Brille off, press `Alt+K`, let the Enthüllungsblatt confirm. `vollziehe()` (line 1977)
   grants only to the checked recipients — correctly, Sera and Brannt.
3. Put Vesper's Brille back on. Her page now reads `Anträge: 0 offen`.

`product-A.md` §3.8, row 21:33, promises the opposite in the same document: *„Vesper's book changes
in no way — no strike, no stamp, no live region."* Her book changed. The delta is one bit, and one
bit is a channel: *something you were not part of just became canon*.

**Why fatal.** These are not the champion's inherited surfaces; the Sitzungsspiegel/Session-Diff and
the Sichtblock are **new** to Der Konvent (§8 places the Session Diff in *der Rand*, the GM
apparatus — A1 put it on the stage), and neither appears in §6.4's enumeration of six new
`oracles.yaml` rows. Two independently built artifacts, by two seats who did not coordinate, each
placed a projection-relative count on the reader's page. That is not one author's slip; that is the
shape of the surface.

---

## FATAL 3 — RB-11's one-time licence cannot fund a world that has to be awake on Wednesday

**This is the reachability charge, and the candidate answers it in the wrong unit.**

§7 does the honest half well: the champion's path table is inherited unhedged, DNS-01 is correctly
separated from inbound reachability, the CGNAT row names the only three answers and refuses a
fourth, and the Plex-pattern is deferred *as* deferred. I could not break the table. What I can break
is the sentence underneath it.

§7 converts the hosted room **from a convenience to a requirement**:

> Under the champion the hosted room was an argument; under Der Konvent it is a **requirement**.

and then prices only the **socket delta** of that conversion: ≈600–900 B per Feldnotiz, ≈18 KB/week,
+8.5 % socket-hours, 50 → ≈46 tables per 4 vCPU node, *„Cost per session-hour is unchanged at
< €0.01."* I checked the arithmetic and it holds (5 × 2 × 10 min = 1.67 h against 20 h = 8.3 %;
50 / 1.083 = 46.2).

**The arithmetic is right and the unit is wrong.** „Per session-hour" is the champion's unit, because
under the champion the room exists during a session. Der Konvent's requirement is *„die Welt muss am
Mittwochmorgen antworten, wenn der Laptop der Spielleitung zu ist"* — that is a **per-campaign-month
of availability** requirement: a resident world, storage for maps, handouts, `.chronicle` snapshots
and package art, backups, and a support surface, for the life of a campaign the product itself sells
as running to **2031** (§11.1's Konventsband, §12's *„in 2031"*, §3.8's closing row).

Against that requirement, RB-11 is ratified and unambiguous: **one-time GM licence, sold direct,
~78 % net, players always free, no player ever buys anything.** There is no renewal event, ever.
A €40 licence at 78 % is €31.20 of gross margin, spread across the five-year world the product's own
retention story requires: **≈ €0.52 per month** to fund permanent availability, storage growth, and
the support load of five people who can now all write.

And the candidate contradicts itself about which model pays. §5, Owlbear Rodeo:

> **Their pricing model — storage and rooms, never features — is the one we adopt.**

Owlbear's storage-and-rooms model is a **subscription**. So `product-A.md` simultaneously (a)
inherits a ratified one-time licence, (b) adopts a recurring storage-tier pricing model, and (c)
makes perpetual hosting a hard requirement of its central thesis — and never notices that the three
cannot coexist. §9.7 names *„a permanent hosting tail for worlds that must answer between sessions"*
and then gives the tail **no number at all**, while giving the +9 % play-node delta three.

RB-11's instruction was: *answer reachability with a number, not a hope.* Der Konvent gives a precise
number for the cheap part and a sentence for the expensive part, and the expensive part is the one
its own thesis created. This is the most under-priced problem in the evidence base, charged to every
option identically — and this candidate raised its own bill and did not re-add the column.

**Second-order, which sharpens it rather than softens it.** §7's own table says a GM who hosts only
on LAN *„bekommt das Skriptorium"* — the single-writer product. The corpus's own telemetry
(RB-11 / Foundry) says **68.35 % of that population runs Electron**, i.e. self-hosts. So the thesis
is structurally unavailable to the majority shape of the analogous market, **and** the minority for
whom it is available is the one we must host forever for a single payment. §9.1's falsifier
(≥ 1 Feldnotiz per player per three sessions) will be measured only in hosted rooms and then
generalised to a population where the mechanism is switched off.

---

## MAJOR 4 — Ratifikation has no undo, and A1 publishes another person's sentence by default

**Where:** `spike-A1.html` `oeffneEnthuellung()` lines 1963–1964 · `vollziehe()` line 1977 ·
`spike-A2.html` `ratifiziere()` line 2132 and the `Alt+K` handler line 2261 · `product-A.md` §3.2.

```js
S.ehTick  = setInterval(() => { rest -= 1; …}, 1000);
S.ehTimer = setTimeout(() => vollziehe(), 4000);
```

The Enthüllungsblatt's four-second ring is inherited from the champion's *reveal* flow, where the GM
deliberately triggered a disclosure of **her own** text. Der Konvent routes **another person's**
authored sentence through it (§3.3), and A2 removes the sheet entirely: `Alt+K` calls `ratifiziere()`
directly, with no dialog and no countdown.

**Scenario, 21:16.** Kaya is reading boxed text aloud, hands off the keyboard, laptop open on the
table. The cat crosses it. `Alt+K` lands. In A2 the Antrag is canon immediately. In A1 the sheet
opens with the recipients pre-checked and, if nobody looks at the screen for four seconds while a GM
is mid-sentence out loud, `vollziehe()` runs: the passage is written into the prose at its anchor,
Brannt's disc is on it forever, an Infobox row appears, the red link resolves into a **new Entry**,
and `granted_via: ratifikation` has gone out to the present characters.

**There is no un-ratify.** `Ratifikation` is append-only by DB grant (§6.3). `PassageLineage.kind =
ratify` is append-only. The champion's `Berichtigung` and `supersede` *add* a correction; they cannot
un-disclose bytes that already left the server, and §16.5's residue applies. §10's *„bounded
per-session undo ring"* is scoped to `Zustand` — monster HP and initiative — not to canon.

**And it contradicts the candidate's own rule.** §3.2's table states: *„`[Nichts tun]` ist die
Vorgabe und kostet keine Taste… **Schweigen veröffentlicht nie.**"* Once the sheet is open, silence
for four seconds publishes. Invariant 4's logic — nothing irreversible without an explicit human
confirmation — is applied to a monster's hit points and withheld from a player's authorship. The
default on a destructive, irreversible, *other-person's-data* action must be abort, not commit.

---

## MAJOR 5 — The late joiner is silently excluded forever, and der Konventspiegel then invents a scene out of it

**Where:** `product-A.md` §3.3, §3.4 · `02-domain-model.md` (presence is three separate things:
control / attendance / connection).

§3.3: ratification *„pre-selecting **the characters present in this session**"*. §3.8 row 21:33
executes it: Sera and Brannt yes, Vesper no.

**Scenario.** Brannt's player joins at 21:20 — twenty minutes late, the exact table the brief names.
At 21:16 Kaya ratified an Antrag; the recipient grid pre-selected the characters then present, which
did not include him. He is now permanently a non-holder of a canonical paragraph that every other
person at his table holds.

Nothing in the candidate backfills it. §5.5's *Nachtrag* is the champion's **reveal** path; §3.3
deliberately routes ratification through a **new** `granted_via` value with its own recipient
pre-selection, and no clause says the Nachtrag's recipient grid sweeps ratifications. And because the
projection is (correctly) total — no stub, no byline, no count, no gap in the ordinals — **he cannot
discover the hole, and neither can Kaya without diffing two projections.** The product's greatest
strength here becomes the reason the error is unfindable.

**Then it compounds.** §3.4 computes der Riss as the pairwise symmetric difference over held sets on
an Etikett. His held set is now short by one *for a bookkeeping reason*, so the Docket reports
*„Riss #der-ring: hoch · ihre Notizen widersprechen sich"* and hands Kaya a scene manufactured out of
a presence-tracking artefact. The mechanism the candidate sells as *„the table's disagreement becomes
the prep"* will, in its first month, hand a GM prep built on an attendance bug.

**And the definition is missing.** `02-domain-model.md` separates attendance from connection
precisely so this cannot be fudged. §3.3 says „present" and never says which. A player whose socket
dropped at 21:14 and reconnected at 21:18 is *attending* and *disconnected*. The candidate must pick,
and picking is a design decision with a different wrong answer on each side.

---

## MAJOR 6 — A Feldnotiz **is** a structural op, so §4.1's „structural steps are rare" is measured on the wrong workload

**Where:** `product-A.md` §4.1, §4.4, §6.1, §9.5.

§4.1's load-bearing justification for putting the spine on an exclusive server sequence:

> **Structural steps are rare by measurement, not by hope.** The champion's own spike established
> that *typing produces no structural steps* (§5.2) — which is why its 0.087 ms keystroke headline
> survives.

That measurement is true, and it is about **typing inside an existing paragraph, by one writer**.
Der Konvent's entire thesis is a different workload. Per §6.1 a Feldnotiz *is a Passage*. Therefore
**creating** one is an insert; **anchoring** it to a pid is a structural relation; **submitting** it
(`geltung: notiz → antrag`) is a state transition on a versioned row; **ratifying** it is
`kind: ratify` at a recomputed ordinal. Every one carries `base_entry_seq` and every one is a server
round trip that can return `409 STALE_SPINE`.

**Scenario, 21:31, from §3.8's own worked session.** Brannt writes his Feldnotiz mid-scene on his own
laptop and presses `Alt+A`. Four hundred milliseconds earlier Kaya pressed Enter inside `p4` — the
anchor. His intent is stale; the client rebases; if the claimed parent was retired he gets §4.1 case
two, *„Der Absatz, den du teilen wolltest, wurde von Kaya geteilt"* — a dialog, mid-scene, on the
on-ramp keystroke that §3.1 promises costs one keystroke and asks nothing of anyone. Now put him on
the tablet on 3G from the brief: the keystroke that was supposed to be free is a round trip on a
600 ms link, and §9.5 concedes there is no offline path.

**The falsifier measures the wrong quantity.** §4.4:

> if a spike shows the rebase refusal (§4.1, case two) fires more than **twice per four-hour
> co-authoring session** … the granularity is wrong

Refusals fire on split/merge/retire collisions between two people editing the same paragraph.
The Feldnotiz-insert path can be latency-blocked, deferred or 409-rebased on **every single note**
from a phone on a train and this falsifier stays green, because a note anchored to a live pid is
never *refused* — it is only slow. The candidate wrote a falsifier for the champion's problem, not
for its own.

---

## MAJOR 7 — The co-GM runs the fight, and the Verfassung cannot say who confirms a death

**Where:** `product-A.md` §3.6 (table-side dividend), §6.2 (`Verfassung`), §10 step 9 (slice 1) ·
invariant 4.

§3.6 sells the dividend hard, and it is a good idea:

> a co-GM may hold write rights on `Zustand` (monster HP, initiative, conditions) **without** holding
> write rights on the canon. He runs the fight; she keeps writing.

§10 step 9 ships exactly that pairing in slice 1, in the one-take acceptance demo, alongside
`defeat_pending`.

Invariant 4: zero or negative health never auto-kills — it creates `defeat_pending` **awaiting
explicit GM confirmation**. Now read `Verfassung` (§6.2). Six dials:
`wer_darf_schreiben`, `was_wird_kanon`, `eigenbereich`, `streitfall_erlaubt`, `austritt`,
`nachfolge`. **Every one of them is about canon. None of them is about the table.** §6.2 then closes
the door: *„No other configuration surface exists."*

**Scenario, 21:47, in the acceptance take.** Timo is running the fight. Brannt's PC drops to 0.
`defeat_pending`. Either:

- **Timo confirms** — and a person the constitution granted an initiative tracker and explicitly
  denied narrative authority has just killed a player character. Invariant 4 is satisfied on a
  technicality („a GM confirmed") and violated in spirit, and nothing in the data model records the
  distinction; or
- **Timo cannot confirm** — and the fight he is running stalls on Kaya, who is three paragraphs away
  in another document with two cursors on it. The dividend that made the co-GM worth modelling
  evaporates at the first hit point that matters.

The candidate invented the market's only co-GM role and gave it a permission model with exactly one
axis. `Zustand` write rights and `defeat_pending` confirmation authority are different powers and the
constitution has no word for the second.

---

## MAJOR 8 — An imported Passagensatz has no valid `autor_user_id`, and §11.2's GTM lever stands on it

**Where:** `product-A.md` §6.1 (`autor_user_id NOT NULL`), §6.5, §11.2 · `spike-A1.html` line 1572
(`AUTOREN[p.autor]`) · `spike-A2.html` line 1345 (`PERSONEN[personId]`).

§11.2 is the candidate's channel claim and it is a genuinely good one:

> A 40-passage harbour-city kit written by four people at one table exports with four names and a
> per-passage split … our creator population is **tables**, not lone authors.

Now install that kit into a stranger's campaign. Its four authors are `User` rows on **their**
instance. They are not users on this one. `Passage.autor_user_id` is `NOT NULL`. Three possibilities,
and §6 names none of them:

1. **Forge local `User` rows** for four people who never consented to accounts here — and now
   `Verfassung.austritt`, the §6.5 GDPR pseudonymisation path and `Nachfolge` all have ghost data
   subjects who cannot be contacted, and the byline strip shows four faces who are not at this table.
2. **Attribute to the installing GM** — a **false byline**, in the one product on earth whose central
   truth claim is that the byline is true. The Autorenleiste then says *„Kaya, 40 Absätze"* about
   forty paragraphs Kaya did not write, and the flex sentence *„Sie hat das geschrieben"* is a lie the
   product tells about its own core object.
3. **A foreign-author representation** — which `NOT NULL` forbids and which the code-generated
   projector (§6.4: *„a migration adding a column without both classes fails the build"*) has no
   class for, because `autorenklasse ∈ oeffentlich | autor_und_sl | nur_sl | verfassungsabhaengig`
   describes *who may see the byline*, never *whether the byline resolves to a local identity*.

Both spikes do a bare dictionary lookup on the author id (`AUTOREN[p.autor]` / `PERSONEN[personId]`)
and would throw on an unknown one — which is exactly the shape of the production bug.

**And it locks §6.5's own door.** §6.5 says export is *„blocked for passages whose authors have not
cleared them."* For an imported passage the author is not a user of this instance and can never
clear anything. The GM who installs a kit may be unable to export her own campaign.

---

## MAJOR 9 — Ratifying an anonymer Antrag publishes the identity the dialog just promised to withhold

**Where:** `product-A.md` §11.4 · §3.2 · §6.1 · §6.4.

§11.4, in full honesty about what it is:

> A player may submit a Feldnotiz **anonymously to the GM** — which matters for the shy player, and
> matters more for **the player writing something about another player's character** … social
> anonymity, not cryptographic. The server knows, the audit log records it, and the dialog says so.

§3.2, twenty pages earlier: *„The paragraph **keeps its author's disc forever**."*

**Scenario.** Vesper's player, who is uncomfortable saying it out loud, submits an anonymous Antrag
about *Brannt's* character — §11.4's own stated use case. Kaya reads it, agrees, presses `Alt+K`.
Nothing in §3.2's three-key table, nothing in the Enthüllungsblatt (A1 `oeffneEnthuellung()` shows a
byte preview and a recipient grid; it never shows or asks about anonymity), and nothing in
`ratifiziere()` consults `Ratifikation.anonym`. Two outcomes:

- **The disc appears.** The product has just published to the whole table, with one keystroke and no
  second confirmation, the identity a boolean was created to withhold. The dialog's promise was kept
  for exactly as long as the note was inert.
- **No disc appears.** Then the Autorenleiste has a hole, and in a product where §6.4 rules that
  *absence is information*, a paragraph with no disc among ten with discs is the loudest possible
  signal. Worse: everyone at the table can subtract.

**The structural version, which is the one that matters.** `autorenklasse` is declared **per column**
in `felder.yaml` (§6.4) and the projector is code-generated from it. `anonym` is **per row**, on
`Ratifikation` (§6.3). A per-column class cannot express a per-row exception. §11.4 is „one boolean"
that the enforcement architecture is structurally unable to see — the same category of mistake §6.4
exists to prevent, committed in §11.

---

## MAJOR 10 — die Autorenliste is a seventh oracle the enumeration misses, and A2 ships a working prototype of it

**Where:** `product-A.md` §8 (Library row), §6.4 (the six oracles) · `spike-A2.html`
`renderSammlung()` lines 1654–1667, footnote markup line 841, `verbotenesGut()` lines 1386–1403.

§8 gives Library *„**die Autorenliste** (who wrote how much, **per Entry and per campaign**)"*.

A per-campaign author volume is the aggregate oracle, and it is worse than any per-page byline: if
Sera's campaign figure is 40 and I can account for 12 across the pages I hold, I know 28 paragraphs
exist that I cannot read and who wrote them. §6.4 enumerates six new `oracles.yaml` rows —
`autorenleiste`, `antragsspur`, `ratifikations_ledger`, `konventspiegel`, `streitfall_render`,
`autor_facette`. **`autorenliste` is not one of them**, and neither is the Session-Diff
`Autorenzeile` that §8 adds in the same table.

A2 prototypes the failure precisely:

```js
function renderSammlung() {
  const pr = projektion(zustand.sitz);
  const eintraege = [{ titel: p.eintrag.titel, unter: absatzZahl(pr) + ' Absätze für diesen Sitz', … }]
    .concat(p.verwandte);          // ← unprojected, verbatim, for every seat
```

Only the **current** entry's count is projected. `p.verwandte` is a static list carrying per-entry
volumes — *„Die Alte Münze · Ort · 9 Absätze"*, *„Die Nacht des Brandes · Ereignis · 4 Absätze"* —
rendered identically to seats `sl`, `sera`, `brannt`, `vesper` and `stream`, under a footnote (line
841) that states: **„Die Liste zeigt nur, was der gewählte Sitz halten darf."** It does not.

`verbotenesGut()` derives its needles from the *current* entry's hidden blocks plus author names with
no visible passage, so the Leak Bench cannot see counts belonging to other entries — a second blind
spot in the same instrument as FATAL 1.

**This is also the „2,000 wiki entries" front.** At 2,000 entries the Sammlungsschiene is 2,000 rows
of per-entry paragraph volume, unvirtualised (`innerHTML` over the full list on every keystroke of
`#suche`, line 2255), and each row is a small oracle. The candidate's Fandom half scales the leak
surface linearly with the thing it is selling.

---

## MAJOR 11 — Slice 1 is the whole vision with four small things cut

**Where:** `product-A.md` §10 · against §9.3, §9.4, §9.8 and both cross-reviews.

§10 claims *„the smallest honest demonstration"*. Its own delta list over the champion's slice 1
contains, by name:

- a **sequence CRDT** (`Binnentext`) on a contenteditable surface the candidate itself calls unpriced
  (§9.8: *„the browser half of the editor unpriced, and Der Binnentext puts a CRDT on that same
  unpriced contenteditable surface"*);
- `entry_seq` + `base_entry_seq` + `409 STALE_SPINE` + a **client-side rebase engine** with two
  distinct outcomes;
- **die Umbettung** — which §9.3 titles *„GENUINELY HARD"*, calls unmeasured, and concludes with
  *„There is no correct answer here"*;
- a `Verfassung`, a `Ratifikation` ledger, and an **authorship axis on a permission spine that §9.4
  concedes is itself „grafted, unbuilt and unmeasured"**;
- six new `oracles.yaml` rows, a second class on **every** column in `felder.yaml`, six new Leak
  Bench fixtures, per-role Goldene-Signatur entries;
- plus the inherited combat strip with `defeat_pending` and undo, plus Foundry + Obsidian import,
  plus a `.chronicle` export/import with `diff empty`.

Cut to pay for it: die Fassungsprobe, die Randfrage, der Souffleur, one seeded onboarding flow.

**The acceptance demo is „one take, no cuts"** through: two simultaneous typists, a visible rebase, a
phone writing a Feldnotiz, `Alt+K`, a red link becoming an article, a DevTools proof of absence,
three reader projections, initiative → `defeat_pending` → undo, and export → import → empty diff.
That is not a slice. That is a product, filmed.

**And round 3 did not spike the part that decides it.** Neither A1 nor A2 contains an editor, a
second writer, or a single structural operation. Both cross-reviews say so independently —
*„Nebenläufigkeit ist in beiden A-Sitzen unbelegt … offene Spike-Schuld des Kandidaten"* (A1's review
of A2, §5) and *„die Zahl, die weiterhin niemand hat: Barrierefreiheit auf einer schreibbaren
Fläche"* (A2's review of A1). The one item slice 1 cannot be honest without is the one item three
rounds have not touched, and §4's falsifiers are marked **„Status: unbuilt"** by the candidate itself.

---

## MAJOR 12 — The proof needs four humans; the go-to-market needs one

**Where:** `product-A.md` §10 · RB-11 §„Implications" ·`00-intake.md` K6 consequence.

RB-11 is explicit and ratified: *„Discovery runs through **creators and system authors, not
gamers** … therefore the **visual rule-builder IS the go-to-market**, and UVTT + Foundry/Roll20/FG-
shaped export ships at **LAUNCH**."*

§10's refusal list cuts **„no rule-builder"** with no carve-out. It does flag the Roll20/FG importers
correctly — *„launch-blocking, per the round-2 verdict — **not** slice-blocking"* — which is exactly
the right distinction, and it is applied to the importers and **not** to the instrument RB-11 named
as the channel itself.

Set that beside slice 1's minimum configuration: *„four people: one GM, one co-GM, two players."*
The flex needs a ratified note, two seats and a difference; reaching it needs a player who writes
(§9.1: zero market evidence), a GM who works a queue (§9.2: an inbox), and a table with a co-GM
(§9.6: a table size nobody has).

**So the smallest configuration in which this product's central claim is visible is four humans, and
the channel that is supposed to bring them is a single creator evaluating a tool alone on a Tuesday
— and that tool is cut.** Every competitor's evaluation path is one person: Owlbear is ~20 minutes
solo, Foundry is a single install, Dungeon Alchemist — the precedent RB-11 cites for reaching a
market by exporting into rivals — is single-user by design. Der Konvent's demo cannot be run by the
person the strategy says will discover it.

This does not refute §9.1's bet. It says the bet cannot be *observed* until four people have already
committed, which is after the point at which the product had to win them.

---

## MINOR 13 — A2's Darstellung checks are scoped so they cannot see package text

**Where:** `spike-A2.html` `pruefeDarstellung()` lines 1866–1876, `body { overflow-x: hidden }`
line 206.

```js
$$('.knopf, .modulknopf .beschriftung, .tastenknopf span, .achsen-name,
    .eintragsknopf .titel, .pruefname')
  .forEach(el => { if (el.scrollWidth > el.clientWidth + 1) beschnitten++; });
```

Every selector in that list is **chrome the spike author wrote**. Not measured: `.artikeltitel`,
`.artikelunter`, `.kicker`, `.infofeld`, `.infowert`, `.streitkopf`, `.kontokopf .name`, `.stempel`,
`.bildunterschrift` — that is, every string a **content package** supplies. The axis the check is
paired with (`s-labels` → `LANG`) also only swaps chrome strings. Test and check are the same closed
set, so the row *„Abgeschnittene Beschriftungen: 0 · bestanden"* is a statement about the spike's own
vocabulary and nothing else. The 90-character German compound — *„Verbleib der Aufzeichnungen im
Kapitelhausschlüsselträgerverzeichnis"* — arrives through the infobox at 380 px, exactly where the
check does not look.

Second half: `body { overflow-x: hidden }` (line 206) propagates to the viewport, so the *user-visible*
symptom that the row *„Seitliches Rollen des Dokuments: 0 px · bestanden"* stands proxy for is
suppressed by construction. At 380 px an overflowing title is clipped and unreachable rather than
scrollable, and the row reads green either way. `spike-A1.html` has the same `overflow-x: hidden`
(`.chr`, line 191) and no check at all.

*Credit where due:* A1's cross-reviewer already found A1's hardcoded leak needles
(`text.match(/Sera/g)`, line 1781) and is right that a check which cannot fail is ornament. I add
only one thing: line 1790 colours that row with `gruen = (sera === 0)`, so in almost every projection
where „Sera" is **correctly** present the row shows red — training the reader to ignore red, which is
worse than no row.

---

## MINOR 14 — A2's Autorenzeile publishes a number that disagrees with its own page

**Where:** `spike-A2.html` `renderAutorenzeile()` lines 1669–1680, `absatzZahl()` line 1381.

```js
const n = pr.bloecke.filter(b => b.autor === a).length;
```

`Streitfall` blocks carry authorship on `konten[].autor`, not on `b.autor`. At seat `brannt` the
footer therefore reads **„Sera 1"** while two Sera-authored texts are on the page: `p-03` and
Fassung A of the Streitfall `p-04`. `absatzZahl()` likewise filters `typ === 'absatz'`, so the
Prüfstand reports *„Absätze im Dokument: 6"* while seven blocks render.

Invariant 6 says every derived number can show its derivation. This one cannot, because its
derivation contradicts the screen — and the number is the byline count, i.e. the candidate's newest
and most permission-sensitive object.

---

## What I could not break — conceded explicitly, by name

A clean bill from me is meant to mean something. These are not softeners; they are things I attacked
and failed to break.

1. **The runtime is not re-litigated.** RB-11 is inherited in the header and never re-opened. No
   engine, no toolkit differentiation. The candidate differentiates where it was told to: module
   boundaries, data model, package format, sync architecture.

2. **Invariant 2 holds, and §7 answers it correctly.** I hunted for a code-execution escape hatch in
   the new surface. `Verfassung` (§6.2) is an enum record with a closed value set per field, versioned,
   append-only, exported as data. It cannot express a predicate, let alone a program, and §7's line
   — *„a package can never grant, automate or bypass a ratification"* — is true of the schema as
   written. `Ratifikation` is append-only by DB grant.

3. **Invariant 5 holds absolutely.** There is no AI anywhere in the loop and §3.9's refusal to mint
   passages from dice rolls, chat lines or transcripts is the right call, correctly grounded in
   round 2's ~900-machine-sentences finding. I verified §3.4 is genuinely two joins: `renderSpiegel()`
   (A1 lines 1747–1770) computes the pairwise symmetric difference over held sets on an Etikett, with
   no scoring and no heuristic, and ships a `<details>` that shows the derivation (invariant 6, met).

4. **The core projection is correct where it is implemented, and one rule in it is the best thing in
   the round.** A1 renders withheld paragraphs as genuinely absent (`sichtbarePassagen()` →
   `renderProsa()`, no `display:none`, no stub), re-assigns ordinals per projection so no gap can be
   counted (line 1807), and — line 1602 — **suppresses a section heading whose every paragraph is
   gone**, because *„leere Überschrift wäre selbst ein Orakel"*. I tried to construct a path by which
   Sera's name reaches seat Vesper's prose, Infobox or Autorenleiste in A1 and there is none.
   A2's `naiv` mode — rendering the **wrong** implementation and letting the bench price it — is a
   genuinely better instrument than round 2 had, and its `stream` seat correctly returns
   `autoren: []`. The leaks I found are all *outside* the projection function, which is a real
   result about where the danger lives.

5. **§4's separation of structure from text is sound, and it is smaller than what it replaces.**
   One server sequence per Entry makes the two-stream problem *unrepresentable* rather than merged;
   a CRDT that contains no pid cannot resurrect one; the Strukturbrief is correctly demoted to an
   advisory optimisation with no correctness role. I tried to construct a pid-resurrection path
   through `Binnentext` and could not. §4.4's added/deleted/unchanged ledger is honest, and the
   claim that this retires the champion's most-likely-v2-rewrite item is, as an architecture, true.

6. **§9.3, die Umbettung, is conceded as named.** It is the hardest thing in the document, the
   candidate raises it first and calls it the hardest thing, and *„loud and recoverable over quiet and
   wrong"* is the correct choice. I have no better answer and I will not manufacture one.

7. **§9.1 is conceded as named.** *„Die Spieler schreiben nicht"* is the bet. The candidate states
   the falsifying numbers — ≥ 1 Feldnotiz per player per three sessions, ≥ 40 % of Anträge ratified —
   before an attacker has to, and I have no evidence the bet is wrong. Neither does anyone.

8. **§5's differentiation ledger is honest to the point of self-harm.** TaleSpire's shipped
   real-time collaborative building *„while Der Konvent has solved it on paper"*; Fantasy Grounds
   free-since-2025-11-08 with a free cloud relay named as *„our sharpest loss"*; Alchemy shipping the
   first half of K2 first. A ledger that hands the attacker three of his best weapons is not one I
   can break for dishonesty. The Foundry argument — an HTML-string journal page cannot draw a
   permission boundary smaller than a page, and its ownership levels bind reading to writing — I have
   now attacked in three rounds and it is still unbroken.

9. **K7 is held.** Art arrives as package content inside a `<figure>` with a caption
   (`beiwerkHtml()`), with a deterministic Ersatzsignet fallback and an `onerror` path that is
   actually exercised by the Nebelakte package's deliberately missing file. No depicted world inside
   a core component.

10. **The flex is a flex.** *„Sie hat das geschrieben. Und er darf es nicht lesen."* is one still
    image, it needs one ratified note and two seats, and no product in RB-01 can represent it. That
    is the strongest single sentence produced in three rounds. **Every fatal above is about the
    machinery around the photograph, not the photograph.** The three of them are repairable in days;
    FATAL 3 is repairable only by a decision Kaya has to make.

---

## What has to be true before this candidate ships

1. **A live region is an output surface.** `#meldung` and `#ansage` must be projected, must be in
   the Leak Bench's scan space, and must be a row in `oracles.yaml`. So must every announcement
   composed from model data rather than from the projection. (FATAL 1)
2. **No count that references a projection other than the reader's own may exist in the reader's
   document.** Not in the header, not in the Session-Diff, not in the Sammlung rail. The `Sicht` type
   already has no denominator field; the *stage* must inherit that rule, and `oracles.yaml` needs
   `autorenliste`, `sitzungsspiegel` and `sammlungsschiene`. (FATAL 2, MAJOR 10)
3. **§7 must be re-costed in campaign-months, and §5's Owlbear sentence must be reconciled with
   RB-11's one-time licence.** One of the three — perpetual hosting requirement, subscription
   pricing, one-time licence — has to go, and that is Kaya's call, not the round's. (FATAL 3)
4. **Ratifikation needs an explicit commit, a `Ratifikation.anonym` branch in the ratify path, and a
   defined answer for imported and departed authors.** (MAJOR 4, 8, 9)
5. **The Verfassung needs a table-authority dial, or §3.6's co-GM dividend must be cut from slice 1.**
   (MAJOR 7)
6. **§4 must be spiked before slice 1 is scoped**, with two real writers, a real editor, a real
   structural op and a measured Umbettung straddle rate — because §10 currently ships the one thing
   §9.3 says has no correct answer. (MAJOR 6, 11)

> *Fünf Hände führen einen Griffel,*
> *und keiner sieht, was alle schrieben —*
> *doch wer die Absätze zählt am Rand,*
> *hat sie dem Fremden schon gegeben.*
