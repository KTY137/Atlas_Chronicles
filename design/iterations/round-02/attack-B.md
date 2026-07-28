# Attack — Candidate B, „Der Zettelkasten (there is no cursor in a document)"

Nemesis · round 2 · read against `product-B.md`, `spike-B1.html` (1,722 lines, read as source),
`spike-B2.html` (2,000 lines, read as source), `00-intake.md`, `03-triumph-ui-direction.md`,
`RB-11`, `RB-01-*`.

**Verdict line:** the thesis is real and the *substrate* is the best-argued object in either round-2
candidate — and the product built on it hands GM-only truth to players in four demonstrable places,
has no home for the mutable state a table manipulates all evening, and its eight-second flex issues
knowledge to an absent player nobody authorised. Four fatal, seven major, five minor. Reachability,
the package format, and template-vs-instance I could not break and say so by name.

The candidate's own honesty is not a defence and I have not treated it as one: §8.1–§8.8 name the
Schnitt, the Anordnen labour, the market silence and the ordering oracle. **None of the four fatals
below is on that list.** They are what the honest ledger did not see.

---

## Act 1 — The table at 21:00

Five humans, a tired GM, a cat, a tablet on 3G, a latecomer, a homebrewer.

### 1.1 The table cannot play

Slice Z1 (§7.1) contains: **no map, no dice, no combat, no clause, no sheet, no Forge, no Electron.**
The preamble (line 18) says the candidate *"optimises for 21:00 (the live table, where capture is the
only affordable gesture)."* Those two statements cannot both be true of the thing that ships. At 21:00
in Z1 the five humans roll physical dice, track HP on paper, and type sentences into a shared box.
That is a very good shared box. It is not a live table, and the half of "Wiki + PnP session" that
Kaya named second is absent from the first slice entirely.

The champion has the same shape, so this is not differentiating — but candidate B *claims* 21:00 as
its optimisation target and does not deliver it, where the champion claims Tuesday and delivers
Tuesday. **Claiming the hour you do not ship is the version of this that costs a verdict.**

### 1.2 The 3G tablet waits on every dice roll — by the document's own two sections

§6.7: the projection cache is near-100 % because `projection_version` *"increments only when a
revelation lands"*, and `AnordnungSnapshot` is *"invalidated on card insert or tag change — the query
re-runs on invalidation, never on read."*

§3.3, 21:14: every roll **automatically emits a tagged `ereignis` card** which *"lands by itself in
the Sitzung 14 Anordnung and in Sera's Chronik, because both are queries."*

So the hot path is: one roll → one card insert with tags → every Anordnung carrying a query tail that
could match is invalidated → next read re-runs the query for every reader. §3.3's own session logs six
events in 38 minutes and §3.3's 22:40 line counts **23 cards born tonight**. The cache-hit argument is
computed for revelations and silently assumes nobody captures during play; the fusion mechanism
inserts a card per roll. **The two claims are in the same document and contradict each other.**

Concrete: Sera rolls at 21:14. Brannt's tablet, on 3G, is reading the *Haus Vharon* article whose last
section is a query. It re-runs. Nobody typed anything; nothing was revealed; the page churns because a
die landed. Multiply by ~23 per session and by the 500-row query cap (§13) at year three.

### 1.3 The cat commits, and there is no undo

B1 binds `Enter` in the card editor to `festschreiben()` (line 1461, `preventDefault` then commit) into
a four-second abort window. A cat, or a GM looking at the table instead of the screen, commits a
Berichtigung. Four seconds later it has fanned out to three players' books.

Immutability's price is that this cannot be undone. A Revelation has `retracted_at?` (§3.1) so a
*mis-issue* is retractable — good. A **mis-capture** is not: §8.4's tombstone is a purge with an
enumerated DB grant, designed as a legal surface for the right to erasure. The candidate's ordinary
"oops" has only the extraordinary remedy, and the ordinary correction (another Berichtigung) writes a
*second* supersede link and a *second* strike into every holder's book. **In an append-only store there
is no undo; there is only more record.** The pack's own domain scope lists undo as a requirement
(`00-intake.md`, "GM combat console with calculation transparency and **undo**").

### 1.4 The homebrew player waits until Z2, and the GM's own house rule is a card with `ast: null`

§4 Forge is genuinely the best answer in the round to K2 — *"the Ruling Card is not a feature here, it
is the default state of a Regelkarte"* — and I am not attacking it. I am attacking its schedule: the
rule engine is Z2 and the visual rule-builder is launch-blocking (§7.3). The homebrewer at the table
in Z1 gets a `regel`-kind text card that computes nothing. That is honest and it is also exactly what
Foundry's Custom System Builder already gives away.

---

## Act 2 — The invariants

### FATAL 1 · `belief` has no disclosure rule, and both the design and the artifact render it to the holder

**Invariant 1** — server-authoritative permissions; client-side hiding is never a security boundary.

`belief ∈ {true,false}` is called *"the one boolean that makes this a story tool instead of a
database"* (§3.1) and is then used in two incompatible senses in the same document:

- **Character confidence** — §4, *Table*: a region card *"held with `belief: false` → dotted rumour
  outline."*
- **GM ground truth** — §3.4: *"Sera kennt das Gründungsjahr, **falsch**, seit Sitzung 3"*; §9.1:
  *"a `widerlegt` card still held with `belief: true` by a character who was never told — **dead
  information walking**."*

Nowhere in §6, §6.6, §6.7 or §6.8 is `belief` given a disclosure rule. Under the ground-truth reading,
§4's dotted outline tells the player which of her map intel is a lie. Under the confidence reading,
§9.1's flagship prep query is meaningless, because a character believing something the world refuted is
the *normal* case and needs a separate truth flag that does not exist.

**And the artifact picks the leaking reading and ships it on the default surface.** `spike-B2.html`
line 1040:

```js
h += "<dt>" + esc(z.label) + "</dt><dd>" + links(z.wert) +
     '<span class="fq">' + esc("Sitzung " + st.s) +
     (st.glaube === false ? " · für Sera falsch" : "") + "</span></dd></div>";
```

`STEMPEL.f3.glaube = false`; `HALTER.f3 = ["sera"]`. **Walk it:** open `spike-B2.html` → axis *Leser* →
**Sera** → Lesefassung. The infobox row reads *„Gegründet · 1044 n. d. F. · Sitzung 3 · **für Sera
falsch**."* Sera's own screen tells her that the fact she is holding is false. No roll, no scene, no GM
decision. Three months of a lie, deleted by a `<span>`.

`spike-B1.html` has the same shape at line 1141–1143: the `widerlegt` marker and the stamp *„wahr als
Protokoll, falsch als Tatsache · widerlegt durch k_a7e3"* are appended with **no reader guard** — a
holder of the refuted card who was never told about the refutation reads that her fact is dead, and
reads the id of the card that killed it.

This is not a spike bug that a server-side projection fixes. `visible_karten()` decides *whether a row
is sent*. `belief` is a column **on a row the reader is entitled to**. There is no choke point in the
candidate's architecture that redacts a field of a visible row per recipient, and §6.8 adopts the
champion's spine wholesale without adding one.

### FATAL 2 · The projection is a set membership test; the product renders a graph

**Invariants 1 and 8.**

§6.7: *"A character's visible-card set is a **materialised bitmap over `karte_id`**."* One bit per card.
That answers exactly one question: *may this reader see this card?*

The product renders, on reader-facing surfaces, at minimum:

| Rendered thing | Whose visibility governs it | Expressible in the bitmap? |
|---|---|---|
| the card's text | the card | yes |
| `stützt` / `zitiert` / `widerlegt` / `supersedes` edges | **both endpoints** | no |
| the holder list (`who_knows`) | **every other character** | no |
| ordinals, totals, "N of M" | **the complement of the visible set** | no |
| provenance stamp („— Brannt, Sitzung 12") | the *author's* identity | no |
| `belief`, clause riders, `tombstone` reason | GM-only columns on visible rows | no |
| the live-region announcement | all of the above, again, separately | no |

Every one of those is a leak class that §6.6 does not close. §6.6 closes **two** — hash exposure and
ordering — and §8.7 is proud of having created and closed the second. The other five arrived with the
same thesis and are unnamed.

**Eight demonstrated leak sites across two artifacts written by authors who had read the doctrine:**

| # | File · line | What leaks | Walk-through |
|---|---|---|---|
| 1 | B1 · 1124 | `"6 von 8 Feldkarten sind für diese Leserin vorhanden"` — **inside the article**, in `renderInfobox()` | reader = Sera → Lesefassung → infobox footer |
| 2 | B1 · 1597 | `sichtbar + " von " + KARTEN.length + " Karten im Kasten"` — the total, per reader | any non-SL reader, stage header |
| 3 | B1 · 1214 | `hält: Sera, Brannt, Vesper` on every visible card in the Kartei | reader = Sera → Kartei |
| 4 | B1 · 1250–1256 | the Umriss prints `k_44a0 stützt →` for a card the reader does not hold | reader = **Vesper** → Umriss → section *Das Aschene Siegel*; `k_44a0` is `h:"sera,brannt"` |
| 5 | B1 · 1141 | the `widerlegt` marker + refuting card id, unguarded | see FATAL 1 |
| 6 | B2 · 1613–1617 | *„Karten in dieser Antwort 6 · **nicht vorhanden 7** · Abschnitte ohne Überschrift entfallen 1"* | reader = Sera → Linse → **Beweis** |
| 7 | B2 · 1187 | `ansagen(b.sicht + " von " + b.gesamt + " Karten vorhanden, " + b.weg + " nicht vorhanden")` — **the live region only** | reader switch, with a screen reader |
| 8 | B2 · 1040 | `für Sera falsch` | FATAL 1 |

Sites 1, 2, 6 emit a **count**, which §6.6.2 forbids in its own words (*"no count is ever emitted
('mehr laden', never '31 Treffer')"*) and which §6.8 forbids again by adopting *"the opaque
`ReaderProjection` with no total."* B1's honesty note at line 1270 claims, 150 lines above the code
that does it twice, *„Keine Lücke, keine Trefferzahl, kein Hinweis auf Ausgelassenes."*

Site 7 is the one that should end the argument. B2's author **knew** the count was an oracle: the
visible chip is guarded (`rolle === "sl" ? … : ""`, line 1109), the Kasten count is guarded (line 1275),
the Nachhall holder count is guarded (line 1486), the holder list is guarded with a written rationale
(line 1551). Four correct guards — and the same reader-switch handler announces the exact forbidden
string into the accessibility tree. **The screen-reader user is told the secret the sighted user is
not.** That is invariant 8 turned into the attack vector, and it is precisely what §6.8's *"one string
per surface produced per recipient (visible text, `aria-label`, `title`, `alt` and live-region
announcement are one function's output)"* and the Leak Bench *"over payload, DOM and serialised
accessibility tree"* exist to catch. Neither artifact implements either.

**Why this is candidate-specific and not a generic spike excuse.** Both files disclaim access control
("kein Zugriffsschutz", "die Projektion läuft im Browser"). That disclaimer covers **transport** — the
server omitting rows. It does not cover **composition**: sites 1–8 are all decisions about *what to
compose from rows the reader is legitimately entitled to*, and row-level projection cannot fix a single
one of them. The document-first champion makes this decision **once per document**. This thesis makes it
**once per atom, once per edge, once per annotation, once per announcement**. The atom multiplies the
decision count of the product's #1 invariant by the size of the corpus — 60,000 cards at year five
(§11) — and the enforcement offered is `oracles.yaml` plus a dependency-cruiser import rule. If two
authors who had just written the doctrine leak eight times in 3,700 lines, a lint on import paths will
not hold this in 200,000.

### FATAL 3 · Immutability has no home for the state a table changes all evening — and `defeat_pending` is not in this document

**Invariant 4** — zero/negative health never auto-kills; it creates `defeat_pending`.

`defeat_pending` appears **zero times** in `product-B.md`. So do *health*, *damage*, *condition*,
*initiative*, *position* and any other mutable quantity. I checked; the word "mutable" occurs only to
describe the champion's `Passage`.

That is not an oversight of scope, because §1 makes the claim for the *whole product*:

> *"**One id everywhere** — the unit of authorship *is* the unit of citation *is* the unit of revelation
> *is* the unit of mechanics *is* the unit of export."*

and §4 *Cast*: *"An Actor is an Anordnung with an `ActorExt`. **Its stats are Feldkarten.**"*

A Feldkarte is a `Karte`. A `Karte` is immutable **by database grant** (§6.1, §13): the runtime role
holds `INSERT, SELECT` and `UPDATE` on a strictly enumerated column list that does not include
`inhalt`. Therefore:

- If current HP is a Feldkarte, a four-hour combat emits a new content-addressed card per point of
  damage — each with an id, a Nachhall, a place in the Kasten, an entry in the orphan facet, a row in
  the Session-Diff, and a supersede chain. Three fights is more cards than the five-year world.
- If current HP is **not** a Feldkarte, then §1's "one id everywhere" is false for the entire VTT half,
  the Cast zone has two substrates, and the candidate owes a second data model it has not written.

There is no third option, and the document takes neither. The load-bearing word is "**durable**"
(*"Everything durable in the product is one [Karte]"*, §1) and it is never cashed out. The reason this
survived two rounds of self-critique is that **slice Z1 has no combat**, so the hole is invisible until
Z2 — the slice where the clause, the Wissenskarte, the rule engine *and* every mutable quantity arrive
at once, at the same time, on top of an append-only store.

This is the largest unpriced item in the candidate, and unlike the Schnitt (§8.1) and the Anordnen
labour (§8.3) it is not on the honest ledger.

### FATAL 4 · The Berichtigung issues knowledge to people nobody chose — including the player who was not there

**Invariant 1**, and it breaks the flex itself.

§2's five-reader table: Sera and Brannt hold the old card, so they see *"the paragraph she was told is
struck through **with the new one beneath it**."* §7.1 repeats it: *"the holder sees the strike-through
and the correction."*

**Delivering the new text to a holder is a revelation.** The holder learned the *old* fact; nobody
decided she should learn the *new* one. And §3.1's schema has no name for the row this creates:

```text
granted_via ∈ { direct, campaign_fanout, catchup_grant, import, fork_import }
```

There is no `supersede_fanout`. The single most-used gesture in the product writes revelation rows
through a path the revelation model does not model.

**Walk it, in the artifact that added the evidence:** `spike-B1.html` gives Vesper `an:false`,
`fehlt:"abwesend seit Sitzung 12"` — the cross-review praises this as §9.1 groundwork. Vesper holds
`k_9f21` (`h:"sera,brannt,vesper"`). Line 1505:

```js
AUSGABEN.filter(function(a){ return a.karte==="k_9f21"; }).forEach(function(a){
  AUSGABEN.push({ karte:"k_a7e3", figur:a.figur, s:14, quelle:"k_9f21" });
});
```

Every holder, unconditionally. Vesper — who was not at sessions 12, 13 or 14, whose character was not in
the second cellar, who never saw the ledger — is issued the forgery card at 21:52 and reads the twist on
her phone on Wednesday. The GM was never asked. §2's table does not list her; she is the reader the flex
forgot, and the file that invented her is the file that proves it.

The general form is worse than the absent-player case. **The GM cannot correct a record without
broadcasting.** Any semantic change fans a strike-through, a stamp and a live-region announcement into
every holder's client, mid-scene. The only quiet path is the Redaktion — and FATAL-adjacent MAJOR 5
shows that path is empty.

### Invariants held — stated so a clean bill means something

- **Invariant 2 (declarative, no code execution):** §10's answer is *stronger* than the champion's.
  `Karte.inhalt` as a **single-block** closed AST — no headings, no nesting, no HTML, no Markdown at
  rest — removes the `innerHTML` path structurally rather than by lint, and Regelkarten promoting into
  the same AST means the growth engine adds zero expressive power. Against `RB-01-talespire`'s Symbiote
  model this is the sharpest contrast in the round. Unbroken.
- **Invariant 3 (template ≠ instance):** §6.5 is the best paragraph in the document. Immutability turns
  *"pinning a revision"* from a foreign key that must be defended into the absence of a feature, and
  `Vorlagen-Review` with **default Behalten** is the correct default. Unbroken. (Its only cost is the
  typo tax of MAJOR 5: nine instances in three campaigns get a review prompt for a missing `l`.)
- **Invariant 5 (AI optional):** enforced aggressively and repeatedly — the Schnitt is deterministic
  *"no AI, ever"*, §3.3 closes with *"Nothing is inferred. No AI is anywhere in this loop."* Unbroken.
- **Invariant 7 (licensing/provenance):** §7.3's ruling that licensed content is **flagged at the
  import boundary, not laundered at the publish boundary** — *"where it is cheap, not where it is a
  lawsuit"* — is the best formulation of invariant 7 anyone has produced in either round. Unbroken.
- **Invariant 9 (K7):** fully honoured; the most cinematic moment is a transition, not a depicted world.
  Unbroken.
- **Invariant 6 (calculation transparency):** the derivation biography in §2 is right, and §8.8 concedes
  the §15.7 clause-migration corner as *"inspectable, not safe"* rather than hiding it. I have no
  attack the candidate has not already made on itself.

---

## Act 3 — The strategy

### MAJOR 5 · The Redaktion path is empty, so every German typo is a plot event — permanently

§8.2 offers two operations and stakes the thesis on the guard: Redaktion is *offered*, never chosen, and
only when a deterministic classifier finds whitespace / punctuation / casing only, with no change to a
number, a capitalised token, a negation particle, a link target or a clause AST.

Both spikes implement it. B2's own dialog (line 1816) already found the contradiction and printed it
on the surface — the round's most honest single sentence:

> *„§8.2 nennt „Vharron → Vharon" als Beispiel für eine Redaktion und verbietet gleichzeitig jede
> Änderung an einem großgeschriebenen Token. Beides zusammen geht nicht."*

I am pushing it further than B2 did. Read what actually survives the five checks
(`skelett` = letters+digits, lowercased; `zahlen`; `grossTokens`; `negationen`; `verweise`):

**Nothing but commas.** Any letter change fails check 1. Any capital gained or lost fails check 3 — and
in German every noun is capitalised, so the overwhelming majority of typos are in capitalised tokens.
B1's classifier (line 1062) has the same shape: any word change at all → `berichtigung`.

So §8.2's stated risk — a false Redaktion silently changing truth — is **not** the risk. The
implemented guard fails the other way, and the other way is worse for the product:

> **Walk it:** Kaya wrote `Kestrelfügel` in the lede card in session 1. Four players hold it. In
> session 14 she fixes the missing `l`. Result: a new card, `supersedes`, a Nachhall blast-radius
> panel, a four-second abort window, a strike-through in four players' books stamped *„berichtigt,
> Sitzung 14 · vorher Sitzung 1"*, a live-region announcement, a row in the Session-Diff, and — if the
> card is on an item template — a `Vorlagen-Review` across nine instances in three campaigns.

And it never ages out. §6 has no mechanism to retire a supersede chain; §2 states the old card *"is
struck, dated, and still there"* as a virtue. B1's `block()` (line 1016–1025) renders `korrigiert`
whenever holder sees both, forever. Therefore:

**The Lesefassung degrades monotonically toward a diff view, fastest for the players who have been at
the table longest.** After five years and a few hundred corrections, the loyal player's article is half
crossed out and the newcomer's is clean. §9.2's Auszug — *„was Sera weiß, in the order she learned it"* —
becomes a six-page booklet of struck sentences. The product's two named marketing artifacts are both
degraded by the product's central gesture, and the person they degrade worst is the retention case.

Repair exists and is not in the document: a third operation (silent `Rechtschreibkorrektur`, GM-only
audit, no supersede, no notification, deliberately chosen and logged rather than classifier-gated), or
strike-decay after N sessions. Either weakens the immutability story, which is presumably why neither
is there.

### MAJOR 6 · `binde` cards break under projection — dangling prose, and a hint-shaped leak

§6.2's honest counterweight makes `binde`-kind connective cards the answer to §8.3: the GM's labour is
*"ordering and connective tissue, not retyping."* §6.6.2 rules that *"the `abschnitt` and `binde` cards
cascade to absent **with their section**."*

With their section — not with their **neighbours**. A `binde` card's entire meaning is positional, and
the projection deletes neighbours, not sections.

**Walk it in B1's fixture.** `k_g04` is `art:"binde"`, `oeff:true`:

> *„Was danach kommt, hat das Haus nie in seine Chronik geschrieben. Es steht nur in den
> Rechnungsbüchern."*

It is written to follow `k_g03` (*„1069 nahm der Rat das Haus auf… eine Zusage, die in keinem Protokoll
steht"*). Make `k_g03` a GM secret — entirely natural; it is literally about an off-record promise. Read
as Sera: the section *Geschichte* is non-empty, so no cascade fires, and she reads a sentence beginning
*„Was danach kommt"* that follows nothing. Worse, she reads *„Es steht nur in den Rechnungsbüchern"* —
a connective card authored **about** hidden content is a signpost to it. The section cascade catches
empty sections; nothing catches a bridge whose far bank was projected away.

This is the joint between the two halves — readable prose × per-reader projection — and it is the joint
the candidate's own §8.3 mitigation leans on hardest.

**Second half of the same defect:** shared cards must be written context-free. B1's fixture proves the
author felt it — `k_g05` opens with `[[Lady Ilva Vharon]]` where a human writing an article writes
*„Sie"*. Prose that can live in four arrangements and be reordered per reader has no pronouns, no
*danach*, no *deshalb*, no *die zweite*. **That is not encyclopedia prose; it is a card index in a serif
font.** §8.3 prices *arranging*. It does not price *writing prose that survives arbitrary reordering by
strangers*, which is the harder and more constant tax, and which lands at 21:14 rather than on Tuesday.

### MAJOR 7 · §9.3's go-to-market and §6.6.1's security ruling are mutually exclusive as written

§9.3, consequence two: *"Because sets are content-addressed, two sets sharing a card **share the
identity**, so the box deduplicates, and a correction to a widely-held card can be **offered** as a
Berichtigung to everyone who holds it — a wiki with a supply chain."*

§9.3, risk ruling (and §6.6.1): *"dedup is **per-universe**, and `inhalt_hash` **never crosses a scope
boundary**. A registry card entering a universe gets a **fresh local id** and a `derived_from`
provenance edge; it is never the same row as somebody else's."*

Both cannot hold. **Walk it:** I publish a 200-card SRD bestiary; 400 GMs install it; I fix the goblin
card. To offer that Berichtigung, the registry must know which universes hold `H(goblin)` — either the
hash crosses the scope boundary (violating §6.6.1, the confirmation-oracle ruling the candidate wrote to
close its own thesis's first leak class) or every installation phones home with its content hashes
(same violation, worse). And "two sets sharing a card share the identity" is simply false once every
import mints a fresh local id.

**The repair is one sentence and the document does not contain it:** route upgrade offers over the
`derived_from` edge — `(package_id, card_index, version)` — never over the hash. That works, keeps
per-universe dedup by local hash, and keeps `inhalt_hash` scope-bound. Until it is written, the
candidate's most novel go-to-market mechanism is described in the vocabulary its own security ruling
forbids, in adjacent bullets, without noticing they are two different mechanisms.

### MAJOR 8 · The flex needs fourteen sessions before it exists — both photographs are of year three

§2 is a real flex. It is also, precisely, a **retention artifact marketed as an acquisition artifact**.

Count what it requires: 41 cards, 14 sessions, 4 arrangements holding one atom, 3 holders with divergent
histories, 1 clause, 1 player who was there in session 6, 1 who was not. Both spikes had to fabricate
that fixture because it cannot be demonstrated any other way.

Week one of a real world: 6 cards, 1 arrangement, 0 holders. The Nachhall panel — the mechanism, the
whole "not a warning, a fact" beat — reads *„liegt in 1 Anordnung, ist von 0 Karten gestützt, trägt 0
Klauseln, ist an 0 Charaktere ausgegeben."* Nothing happens. Five readers do not diverge, because
nobody has been told anything yet.

§2's *second* beat (*„Ich habe sie nie geschrieben. Ich habe 41 Karten geschrieben, über 14
Sitzungen"*), which the candidate correctly calls the one that actually sells, is **more**
history-dependent, not less. And §9.2's Auszug — the paper photograph, the answer to TaleSpire — is a
book of what one player learned over years.

Against `RB-01-owlbear`'s ~20 minutes to a running table and `RB-01-talespire`'s 90 % of 4,300 reviews
for a thing you see in one second, candidate B's two named marketing assets both require a campaign
that has been running for a year. §5 concedes the cold-start problem for *capture* (*"a card is four
seconds… we stop losing by an order of magnitude"*) and never notices that the flex has its own,
longer cold start. **The demo does not die in week two. It cannot be taken until month four.**

### MAJOR 9 · The box manufactures its own backlog

§3.3 (play → knowledge) and §8.3 (composition labour) are presented as a strength and a weakness. Read
together they are one compounding problem.

The automatic `ereignis` card means the corpus grows without authorship: 23 cards in one session (§3.3),
~900 per 40-session campaign, ~60,000 in a five-year world (§11). Most of them are machine-composed roll
logs — *„Menschenkenntnis 17 gegen 15. Erfolg."* Every one is an atom, so every one is arrangeable,
citable, orphan-facetable and countable.

The Anordnung's default state is unarranged (§8.3, stated). The query tail is capped at 500 rows (§13).
So the *Haus Vharon* article at year three has a `Sitzung N` tail that is hundreds of dice sentences in
capture order, and §9.1's prep engine — genuinely the best creative extension in the document — greets
the GM on Tuesday with a to-do list of orphans, red links and unused cards **that the tool generated
out of work the tool created**.

§8.3's new gate (*"the GM arranges ≥ 60 % of tonight's cards within one week, unprompted"*) is the right
instrument and I endorse it. What the document does not say is that the denominator is set by the
product, not by the GM: the more the wiki writes itself, the more there is to arrange.

### MAJOR 10 · Accessibility is the deferred recipe, and it is the recipe that leaks

**Invariant 8** — accessibility is architecture, not polish.

§7.1's explicit-not-in-Z1 list ends: *"…collaborative editing, **the Umriss recipe**."* The Umriss is
described in §1.1(b) as *"Semantic outline — headings, relations, no prose. **Screen-reader and
mobile-first**."* Both visual recipes ship in Z1; the screen-reader-first one is cut.

And B1's Umriss (line 1250) is leak site #4 in the FATAL 2 table — the only recipe in that file that
prints relation edges to a card the reader cannot see. **The accessibility surface is simultaneously the
deferred one and the leakiest one.** With site #7 (the live-region count that the visible surface
correctly suppresses), the pattern across both artifacts is consistent: the assistive channel is where
the discipline stops.

The rest of the a11y story is good and I say so in Act 4.

### MAJOR 11 · The first slice competes against a free product that is already installed — by the candidate's own ledger

I do not need to build this argument; §5 builds it: *"Until clauses ship, a prospect is evaluating a
permission-scoped wiki, and **Obsidian is free, local, instant and already installed**"*; *"their
journal editor is a real ProseMirror surface and mine is deliberately not"*; §8.5: *"there is **zero**
evidence anyone wants this… the two block-first products lost to document-first Obsidian."*

What I add is the conjunction: slice Z1 ships **no** dice, map, sheet, clause, Forge or Electron;
§8.1 says the Schnitt is the likeliest cause of death and is unbuilt; §8.3 says the arranging bet is
unmeasured and stacked on the champion's already-unmeasured visibility tax. So the first shippable
artifact is a wiki that (a) has a worse editor than the free competitor by design, (b) requires a second
unmeasured behaviour the competitor does not, and (c) cannot show its differentiating moment for months.

That is survivable **only** if the Revelation edge is visible from day one, which it is — Z1 does ship
issue, projection, the Reveal Sheet and two player surfaces, and that is the right cut. But the candidate
should stop describing Z1 as optimising for 21:00 and describe it as what it is: the smallest honest
demonstration of per-character knowledge, sold to GMs who have already lost a fact they know they wrote
down.

---

## Act 4 — The artifacts, read as code

Both files are unusually good and both are more honest than most. Credit first, then the faking.

### What is real

- **B1's single projection function.** `sieht()` / `block()` feed the Lesefassung, the Kartei, the
  Umriss *and* the "Wer sieht was" table. They genuinely cannot contradict each other. That is the best
  structural honesty in either candidate's artifacts — for the axis it covers.
- **B1's Nachhall numbers are joins, not literals.** `nachhallZahlen()` computes over `ANORDNUNGEN`,
  `RELATIONEN`, `KLAUSELN`, `AUSGABEN`. The flex's headline sentence is earned.
- **B1's single-card editor is the contract shown as behaviour**: `contenteditable` with
  `aria-multiline="false"`, Enter commits instead of creating a block, Escape discards, paste routed
  through `insertText`. §7.4's Z-1 *shape* is demonstrated, not estimated.
- **B2's Struktursignatur** (`tagName + data-k`, text/colour/class excluded, recomputed per axis change,
  allowed to differ on the role axis) is the cheapest high-leverage instrument in the round and should
  be lifted into the gate suite verbatim.
- **B2's section cascade proven by descent** — SL 10/6 → Sera 6/5 → Ossa 4/4 → Publikum 2/2. §6.6.2 made
  observable.
- **B2's contrast probe measures resolved tokens live, is allowed to go red, and prints the caveat that
  the CI probe must measure the painted pixel.**
- **B2's refusal panel**, including *„Der Spike baut Markup mit `innerHTML`. Das Produkt verbietet das
  (§10.4)."* Admitting the artifact violates the invariant it advocates is rare and correct.
- **B2's permission discipline in four places** (holder list, Kasten chip, stage chip, Nachhall numbers),
  each with a written rationale. This is why FATAL 2 is an architectural finding and not an author
  finding.

### MINOR 12 · B1's editor round-trip is lossy, and one hard-coded string hides it

Line 1445: `feld.textContent = nur(K.k_9f21.t)` — and `nur()` (line 1050) strips **every** `[[link]]`
and every inline mark. So opening the editor destroys the card's links. Line 1500 restores exactly one:

```js
t: t.replace("Kestrel-Vertrag","[[Kestrel-Vertrag]]"),
```

**Walk it:** press *Berichtigen* → the field shows plain text with the blue link gone → type a
correction that does not contain the literal substring `Kestrel-Vertrag` → commit → the new card has
zero links and the article's blue link has silently vanished.

§7.4's Z-1 goes green only when *"marks preserved, structure discarded."* The artifact demonstrates
**structure discarded, marks destroyed**, and papers it with a demo-specific `replace`. The cross-review
already noted the paste path takes `text/plain` (the cheap half); this is the expensive half shown as
its own opposite. The half-day estimate for Z-1 is unsupported by the artifact that appears to support
it.

### MINOR 13 · B1 resets by deleting a card

`zuruecksetzen()` (line 979): `delete K.k_a7e3; KARTEN.splice(i,1);`. The one file arguing that
immutability must be enforced *by database grant rather than by discipline* models mutation as its only
state-management primitive. Append-only with a tombstone (§8.4) would have cost the same and shown the
thesis in code. Caught by the cross-review; I confirm it and add that it matters more than a spike bug
usually would, because §6.1's entire argument is *"round 1's lesson was that a three-character splice
inverted the domain model's one non-negotiable property and survived a rebuild."*

### MINOR 14 · A11y contract gaps in B1

- `role="alertdialog"` on a toast (line 1533) that is deliberately non-modal and has no focus trap.
  `alertdialog` promises modality. `role="alert"` plus a real button is the honest contract for a widget
  whose point is *"keep working, you can still abort."*
- The `griff` is one `<button>` **per card**, inside the paragraph flow (line 1130). Forty-one cards is
  forty-one tab stops in one article; §1.1(b) justifies this as *"exactly like Wikipedia's section
  `[edit]` links"* — Wikipedia has eight sections, not four hundred paragraphs. At Fandom scale the
  reading surface becomes untabbable.
- `prefers-reduced-motion` is respected but has no visible toggle in B1's motion select for the
  *countdown ring* redesign; the ring must become a number under reduced motion, and that is unshown.

### MINOR 15 · The i18n axis tests the chrome and never the corpus

Neither file has a `lang` attribute anywhere. B1 sets `hyphens:auto` on `.prosa` (line 340), which is
inert without a document language — so German compounds do **not** hyphenate. Neither file sets
`overflow-wrap` or `word-break` anywhere.

B2's *"Längste Übersetzung"* axis swaps **UI labels** (`LABELS.lang`) and leaves all 39 content strings
across three worlds in the same length band. So the axis that would actually break the layout — a
90-character compound inside a card — is the one never varied.

**Walk it:** at 380 px, a card whose text opens with
`Aschenwaagensiegelbeglaubigungsverordnungsentwurf` overflows the Kartei cell
(`minmax(min(260px,100%),1fr)`) and the infobox `dd` (`grid-template-columns:8.25rem minmax(0,1fr)`),
with no wrap rule to catch it. For a German-first product this is a launch-blocking CSS line and a
missing test axis, not a taste question.

### What neither artifact touches, and what the round should not over-read

- **The Schnitt (§8.1)** is unbuilt in both files. Both say so. It remains the candidate's own nominated
  cause of death and nothing in round 2 moved it.
- **Anordnen (§8.3)** is unbuilt in both. B2 disables the button with an `sr-only` reason, which puts
  the candidate's *second* unmeasured behavioural bet in the same shelf as three working verbs.
- **13 cards (B2) and 41 (B1) are not Fandom-grade.** Both say so. The consequence they under-state:
  the universality matrix is proven at a scale where every design survives. Three worlds × identical
  slot topology × four infobox rows × four sections is not a universality test of *content shape* — it
  is a translation test. A world with 22 infobox rows, a 300-card article, or a section that projects
  to one card is untested, and those are the shapes §8.3 says are the normal case.
- **B1's four Anordnungen: only one is rendered**; three are rows in the lens. The headline is *"four
  pages are now correct."* That specific sentence is asserted, not shown, in the file built to show it.
- **Neither spike proves server-side projection**, and the largest unpriced engineering item in the
  candidate after the Schnitt is `visible_karten()` + the projection cache + the Leak Bench — which, per
  FATAL 2, is also larger than the candidate thinks it is.

---

## What I could not break — by name

1. **§11, reachability.** The strongest section produced by either round-2 candidate. It answers with
   numbers *and exposes its inputs so they can be attacked* (~400 B/card, ~150 MB/world, 0.4–1.2 MB per
   five-person four-hour session, ~€0.001/room-hour, `< €0.01` per session-hour, assets metered
   separately with a `StorageTarget` escape). It names the binding constraint as relay CPU and socket
   count rather than bandwidth, and puts a spike on it (**S-R1**, 50 × 5 on one 4-vCPU node). It states
   what a non-technical GM behind CGNAT actually experiences, path by path, including the insecure-context
   consequences for service workers, OPFS and WebGPU. It concedes that Fantasy Grounds gives the same
   capability away free and that *"we are not ahead here."* And it **corrects the corpus**: DNS-01 solves
   certificate *issuance*, not inbound reachability, so behind CGNAT the only three answers are a hosted
   room, a tunnel, or a relay — *"there is no fourth, and any candidate that implies one is wrong."*
   I attacked this for real and came away with nothing but a note that always-on Wednesday reads are
   priced as session-hours; the number is small enough that it does not matter.
2. **§10, the package format.** Single-block closed AST, no HTML/Markdown at rest, no `innerHTML` path,
   Regelkarten promoting into the same AST with zero added expressive power. Strictly tighter than the
   champion's and the correct answer to `RB-10`/`RB-11`'s Workshop threat model.
3. **§6.5, template vs instance.** Invariant 3 becomes a property of the store instead of a foreign key
   under permanent defence. Default `Behalten`. Nothing to attack.
4. **§3.2, `widerlegt` ≠ `supersedes`.** *"A card can be a true record of a false statement."* This is a
   genuine product idea, no document-first tool in the corpus can express it, and it is the single most
   convincing sentence in the candidate. Untouched.
5. **§6.6.1 and §6.6.2.** Both oracle classes were found and closed by the candidate *before* the attack
   pass, including the ordering, ordinal, count, section-cascade and "mehr laden" rules — and §8.7 owns
   the class as self-created. The rules are correct. My complaint (FATAL 2) is that they are two classes
   out of seven, not that these two are wrong.
6. **§3.1, the deletion of `revision_id`.** A real structural dividend, correctly traced through the
   export format, the package diff, the projection cache key and the live-session pin. Cheaper *and*
   safer. Unbroken.
7. **§8.5's refusal to invent market evidence.** The candidate states that the corpus contains zero
   atom-first TTRPG tools and that Roam and Logseq lost to Obsidian, and offers no counter-evidence.
   I will not manufacture a break out of an honest absence. The bet is named as a bet.
8. **B2's four correct permission guards and its refusal panel.** The author knew the rule and wrote the
   rationale down. That is why FATAL 2 is an indictment of the architecture's enforceability rather than
   of the author.

---

## What would change my verdict

Three things, in order of cost:

1. **A disclosure rule for every column and every edge, not just every row** — `belief`, holder lists,
   relation endpoints, provenance stamps, clause riders and the live-region string, each with a named
   choke point and an `oracles.yaml` row, plus a Leak Bench that diffs the **serialised accessibility
   tree** (§6.8 already promises this and neither artifact implements it). Without it, FATAL 1 and
   FATAL 2 stand and invariant 1 is decorative.
2. **A written answer to mutable state** — either a second, explicitly non-Karte substrate for HP,
   conditions, position and initiative with `defeat_pending` named, or a costed argument that a card per
   damage event is affordable. §1's "one id everywhere" cannot be repeated until one of those exists.
3. **A quiet-correction path** and a rule for `binde` cards under projection. Both are small; both are
   load-bearing; neither is in the document.

*Two spikes were promised in §7.4 and neither is what round 2 delivered: Z-1 was demonstrated in its
easy half and contradicted in its hard half, and Z-2 was not attempted. The candidate said it would
rather be falsified in a day than defended for a round. It was not falsified in a day — it was falsified
somewhere else entirely, in four places it never looked.*
