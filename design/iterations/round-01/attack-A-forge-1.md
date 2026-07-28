# Attack Pass — Candidate A, „The Living Codex"

Nemesis, die Widersacherin · 2026-07-27 · design round 1
Target: [`product-A.md`](product-A.md) · artifacts [`spike-A1.html`](spike-A1.html),
[`spike-A2.html`](spike-A2.html) — both read as source, not as description.
Corpus: [`00-intake.md`](../../00-intake.md) · [`01-attack-plan.md`](../../01-attack-plan.md) ·
[`02-domain-model.md`](../../02-domain-model.md) · [`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) ·
`research/RB-01-*`, `RB-05`, `RB-11`.

---

## The strongest reading, stated first

I attacked this, not a caricature of it:

`Article` → ordered `Passage` blocks; the passage carries visibility, provenance, revision and an
optional declarative clause. `Revelation(passage, audience, session, actor, at)` is an append-only
join row and *is* the fusion — the same fact says "this happened at the table" and "this is now
known in the world". A clause is live for a character iff that character holds a live revelation
for its passage. One article, rendered per reader by the server. `visible_passages(viewer, scope,
at_time)` is the single read choke point, guarded by a CI lint and an exhaustive matrix.

That substrate is the best single idea produced this round, in either candidate. §6.1 is right
that it cannot be retrofitted. Nothing below argues otherwise.

What I found is that the candidate is not broken as a **thesis**. It is broken as a
**specification**, and every fatal sits at the same seam: the moment a piece of scoped knowledge
becomes **a number, in front of other people**. §6.7 built a wall around the *article*. The leaks
are in the *arithmetic*.

---

## FATAL

A CRITICAL from Athena blocks with no override. These are mine, and each one is reproducible by a
person walking a script.

### F1 — Invariant 6 and Invariant 1 are in direct conflict, and §6.7 does not know it

**The claim under attack.** §3: "Every derived number's trace (invariant 6) can therefore cite a
*sentence*, not just a stat." §6.7 lists the read paths that must go through the choke point:
article render, search, search snippets, backlinks, "mentioned in", `[[` autocomplete, embedded
queries, export, realtime deltas, AI context assembly, error messages.

**The derivation view is not on that list. Neither is the roll card, nor the shared action log.**
Those are the three surfaces that, by construction, cite passages other people cannot read.

**The scenario.** Session 14, 21:02. Ossa rolls Research 21 against a check the GM staged on
*Iron Vault §2* — the lock's maker. Auto-revelation fires, **scoped to Ossa only** (this is
product-A's own worked example, line for line). Now change one detail Pythia did not: §2 carries
`+2 Lore · subject: Halm foundry locks`, exactly as §3 carries `+2 Insight`.

21:20. The party works the lock together. The GM calls a check for everyone. Ossa rolls 24, Brenn
rolls 17. Brenn's player says the sentence every table says: *"why is hers six higher?"* and taps
her result on the shared stage.

Two outcomes exist and the product ships both invariants as absolutes:

- The trace opens and shows `+2 ← Iron Vault §2, learned 21:02`. Kael and Brenn now know that a
  passage exists at that address, that Ossa alone has it, that it is worth +2, and what its
  subject is. §6.2's `source_action_id` even hands them the roll that earned it. **Invariant 1 is
  gone** — and not through a bug, through the feature.
- The trace redacts the line. **Invariant 6 is gone**, and worse: the visible sum still does not
  add up, so the table learns there is a secret and learns its magnitude. Redaction here is
  strictly more informative than absence, which is the one thing §7.4 got right about passages and
  did not carry over to numbers.

There is no third option. "Show the derivation only to the roller" is the fourth option and it
fails at the table, where the sheet is on a screen three people can see and the GM is being asked
out loud.

**Why it is fatal rather than major.** This is not an edge case bolted onto the thesis; it *is*
the thesis. §2's closing argument is a friend leaning in and saying *"wait — the plus two is a
link?"* The candidate's flex works in §2 only because Pythia chose the one audience where the
conflict is invisible: all three PCs read the ledger, so nobody's trace cites anything anyone else
lacks. Change the audience from `campaign` to `character` — the audience the product exists to
support, the one it demonstrates at 21:02 — and the flex is a leak.

**What a fix costs.** The choke point signature is wrong. `visible_passages(viewer, scope,
at_time) -> Passage[]` cannot express "this number has four terms, you may see three, and you may
not learn that a fourth exists." Trace lines need to be projected *and* the sum needs to be
computed per audience, which means either every observer sees a different total for the same roll
(and the table cannot resolve a check together) or secret clauses cannot participate in shared
rolls at all. **The honest answer is probably the second one, and it costs the candidate the
21:02 moment it advertises.** Say that out loud in round 2 or lose it at the table.

---

### F2 — `audience_kind: campaign` makes mechanical state retroactive and revocable

**The claim under attack.** §6.2: `audience_kind ∈ { public, campaign, membership, character }`.
§6.4: "A clause is active for a character iff that character has a live revelation for its
passage. **That single sentence is the fusion, expressed as a constraint.**" §2: the passage
appears in a player's book "permanently, stamped *learned in Session 14*. Not unlocked."

A `campaign`-audience revelation is a row pointing at a **set that changes over time**. Character
membership in that set is not a fact about what a person read. It is a fact about a join table.

**Scenario A — the joiner.** Session 20. A new player joins Aldenfall; a `CampaignMembership` row
is written. She opens *Iron Vault*. Every campaign-audience revelation ever made resolves for her,
because that is what the predicate says. Her book fills with six sessions of earned canon she was
not at the table for — and **her character sheet gains `+2 Insight` for a ledger she never read**.
The derivation view will happily cite *Iron Vault §3, learned Session 14, 21:47* on a character
who did not exist in session 14. The product's single most-repeated promise — knowing is
mechanically real, and the number has an address — becomes a lie the trace prints with a
timestamp.

**Scenario B — the leaver.** Brenn's player quits after session 22. His membership is revoked; the
GM keeps the character as an NPC (a normal, expected move — `CharacterController` explicitly
allows a character controlled by nobody, 02-domain-model §4). Every campaign-audience clause on
that character silently evaluates to false. **The NPC forgets what he read**, mid-campaign, with
no event, no audit row and no notification, because nothing was retracted — the set just got
smaller. §6.2 is proud that "a player cannot un-know". Membership churn un-knows them.

**Scenario C — the returning hero.** §6.6 answers character portability "yes": a character joins a
second campaign through a `CampaignRoster` row, "a different revelation set per campaign". But a
`campaign`-audience revelation is scoped to the campaign, not to the character — so a hero
imported into campaign B arrives with **campaign B's** campaign-wide canon in his head and none of
his own. §6.6 asserts the property the schema in §6.2 cannot express.

**Why it is fatal.** The fix is to materialise per-character revelation rows at reveal time, which
deletes `audience_kind: campaign` as a *stored* dimension (it survives only as an authoring
gesture that fans out). That is a schema change to the table §6.1 and §6.2 call the one thing that
cannot be retrofitted. It is cheap now and it is a data migration over five years of someone's
world later — precisely the failure mode §8.3 says the candidate has no answer for. **Get this
wrong in slice 1 and §8.3 stops being a risk and becomes a certainty.**

---

### F3 — the embedded query is a second execution language, and nobody scoped it

**The claim under attack.** §4.1: "**Embedded queries** — `all Places in the Vharon Reach with
status ≠ ruined` as a passage. The wiki is queryable; category pages maintain themselves." §6.1:
`Passage(… kind, content …)` where kind ∈ prose, table, statblock, image, **embedded query**.
§9.3: worlds are forkable, and forked content "imports as declarative data with server-side
validation and zero code execution (invariant 2)".

Invariant 2 is guarded with real care — for **clauses**. The clause vocabulary is versioned,
package-pinned, validated, executed by the engine, never evaluated as script. Good. Meanwhile a
*second* user-authored language — the query — is introduced in one sentence in §4.1, given a
`kind` value in §6.1, listed once in the §6.7 choke-point enumeration, and never specified,
versioned, cost-bounded or migrated anywhere in the document. It is not in the Forge's four-stage
sequencing (§4.6). It is not in the export format (§7.9 lists "articles, passages, revelations,
revisions, clauses"). It has no vocabulary version, so §8.3's migration story does not cover it.

**Scenario A — the leak.** The GM writes a `public` passage on the *Vharon Reach* article:
`all Places in the Vharon Reach with status ≠ ruined`. Question the document never asks: **with
whose privilege does it evaluate?**

- Author privilege → it renders the GM's full corpus into a public passage. Total collapse of
  invariant 1, in the one passage kind whose output is not authored text and therefore is not
  something the GM proofreads before pressing `R`.
- Reader privilege → each reader gets a different list, which is correct and is also an oracle.
  Kael's list has four entries; the GM's has nine. Kael cannot see the five, but he can see that
  the *count* moved when the GM revealed something unrelated, and he can watch a category page
  grow between Tuesday and Friday. §8.2 names "embedded query results" in its list of sneaky
  surfaces and then §4.1 sells them as a headline feature. **Naming a hazard is not the same as
  clearing it.**

**Scenario B — the fork.** §9.3's whole business shape is that you download *Aldenfall* and fork
it. You are therefore importing a stranger's queries and a stranger's passage bodies into your own
account and rendering them in your own session. `Passage.content` in §6.1 has **no declared
format** — not markdown, not a sanitised AST, nothing. Both spikes render passage bodies straight
into `innerHTML` (`spike-A2.html` line 1481: `<p class="passage__txt">${p.html}</p>`; A1 escapes
first, A2 does not). §9.1 then makes *players* authors of passages, so the untrusted-author path
exists even without forking. One `<img src=x onerror=…>` in a forked world's passage, opened by
the GM, and the attacker has the GM's session — and with it every `gm_only` passage in the
universe. **Invariant 1 defeated through the content path, which §6.7's wall does not face.**

**Scenario C — the cost.** An embedded query on a popular article, evaluated per reader, through a
per-passage ACL, with an `at_time` predicate, in a 2 000-article world (see M7). Five readers on
one article is five full evaluations, and category pages are exactly the articles everyone opens.

**Why it is fatal.** Invariant 2 says rule packages are declarative and versioned, *never*
arbitrary code execution. The candidate honours that for the language it designed and violates it
for the language it mentioned. A query language embedded in user content, shipped between
strangers, with no grammar, no version, no cost bound and no privilege rule is an
arbitrary-execution surface wearing a wiki's clothes. Either specify it to the same standard as
the clause vocabulary in round 2, or **cut it from the candidate** — it is one sentence in §4.1
and it is load-bearing for nothing else.

---

### F4 — reachability is not answered once, and the corpus says that loses on its own

[`RB-11`](../../research/RB-11-steam-vs-browser-verdict.md) §"What round 1 must now do", item 3,
binding on this round:

> **Every candidate must answer reachability with a number, not a hope.** State which of hosted
> rooms / LAN-only / Plex-pattern PKI it ships in v1, what it costs per session-hour, and what a
> non-technical GM behind CGNAT actually experiences. **This is the single most under-priced
> problem in the whole evidence base… The candidate that hand-waves it should lose on that ground
> alone.**

Verified against the text: product-A.md contains zero occurrences of *reachability*, *CGNAT*,
*certificate*, *hosted rooms*, *session-hour*, *Platform port*, *registry*, or *B1–B8*. §9.3's K6
note argues browser-vs-Steam — a question RB-11 **closed on 2026-07-27** — and stops there.

This is not a missing paragraph. It is the one requirement candidate A is structurally worst
placed to meet, and it flows from the thesis:

- The Tuesday-phone read (§9.3, "readable on a phone on a Tuesday, by a player with no account and
  no install") is **off-session and off-LAN by definition**. LAN-only is therefore not an option
  available to this candidate at all — the cheapest of the three answers is struck by A's own
  argument for the browser build.
- That leaves hosted rooms or Plex-pattern PKI, and the thesis needs the *world* hosted, not the
  *session* — the codex must answer a URL at 14:00 on a Tuesday when nobody is playing. So the
  cost is not per session-hour. It is **per world, per month, forever, monotonically growing**, on
  a corpus the product promises will still be there in 2031.

**Consequence the candidate never states.** K6 was ruled: **one-time GM licence, players always
free**, sold direct at ~78 % net. Candidate A silently converts that into perpetual hosting of an
ever-growing knowledge base funded by a single payment — and then §9.3 adds *free forking* of
worlds, which multiplies the stored corpus by the number of forks, and cites Owlbear's principle
("gate quantity, never play features") as the mitigation. Gating *quantity* in this product means
gating **how much world a GM may keep**, which is §8.7's hostage problem arriving through the
front door instead of the back. §8.7 worries about lock-in; the real edge is that the moment a
five-year GM hits a storage tier, the durable-world thesis is being metered.

**Why it is fatal.** By the round's own binding rule, hand-waving this loses on that ground alone.
And unlike F1–F3 this one cannot be fixed by a schema change — it is a business-shape decision
that the thesis constrains harder than any rival candidate's does. Round 2 must open with a
number.

---

## MAJOR

### M1 — spike-A2's `Knows` lens is inverted on the default world, two clicks from a cold open

§4.7(b) demands a permanent `Knows` tab and calls it "the GM's only defence against the cognitive
load of running a table where three people have three different truths."

**Reproduce:** open `spike-A2.html` (defaults to Aldenfall, role SL), click §2 *„Die Marke am
Schloss"* in the Docket. The Wissen tab reports:

| Who | State | How |
|---|---|---|
| Kael Vharon | **weiß** | „Recherche 21 · S14 · 21:02" |
| Ossa | **weiß nicht** | „keine Enthüllung" |

§2's own data (line 1190) is `stamp: { by: "Ossa", how: "Recherche 21", at: "21:02" }`. **Ossa made
that roll.** The lens credits her roll to Kael and reports its actual author as ignorant. Kepler
and Nebelakte hide the bug because their fixture PCs happen to be the roller; Aldenfall — the
world that opens — does not.

**The root cause matters more than the bug.** A2 models visibility as an enum on the passage
(`vis: public|revealed|gm|secret`, line 1318-1326) plus one global boolean `S.revealed`. There is
no revelation row, no audience, no per-character set. A per-character question therefore *cannot*
be answered correctly, and the code returns a plausible-looking wrong answer instead of failing.
**The artifact does not implement the one table §6.1/§6.2 say cannot be retrofitted** — and it is
the artifact the cross-reviews crowned as the architecture argument.

Note the asymmetry the two cross-reviews missed because they only compared the seats on the token
axis: **A1 models revelations as rows with an audience** (`enthuellungen: [{publikum, zeit,
sitzung, grund}]`, line 1164-1205) and A2 does not. A2 wins theming; **A1 wins permissions.** Any
verdict that adopts A2's seed-ladder must not also adopt its visibility model.

### M2 — both spikes leak the count of withheld content inside the reader's own projection

Three instances, all in the surface whose entire purpose is proving nothing leaks:

- `spike-A1.html` line 1534-1538, rendered in the player's Reader's Cut:
  **„2 Absätze fehlen im Antwort-Body** — nicht ausgeblendet, nicht geschwärzt, nicht vorhanden.
  **Kein Platzhalter verrät ihre Länge**…" — a sentence that discloses the count while boasting
  that nothing discloses the length.
- `spike-A2.html` line 1498-1499, rendered for `spieler` and `beobachter`:
  „Ende des Artikels. **4** Passagen erhalten — **der Leser erfährt nicht, dass es 2 weitere
  gibt.**" Printed to the reader. Naming the number.
- `spike-A2.html` line 1461-1463: the infobox schema line appends „· **1 Feld** nicht in dieser
  Antwort" in the player's view.

Watch it work as an oracle: the GM presses `R`, the player's count drops 2 → 1, and the player has
learned that exactly one secret about the Iron Vault remains. §8.2's list of sneaky surfaces
names snippets, backlinks, autocomplete and *article length* — **it does not name counts of
withheld items**, which is why the two most careful authors in the round both shipped one.

**The architectural lesson, which is the real finding.** `visible_passages(…) -> Passage[]` cannot
leak. The leak comes from render code that *also* holds the unfiltered collection and can compute
`total − visible`. Both spikes do exactly that (`ABSAETZE.length - sichtbar.length`;
`pack.passages.length - vis.length`). §6.7's contract permits it. **The choke point must be the
only thing that can ever load passages, and "how many were withheld" must be unrepresentable in
the render layer, not merely discouraged.** That is one extra CI lint and one repository boundary,
and it is cheaper than the review that catches it by eye — which, on this evidence, does not.

### M3 — spike-A1's undo un-knows a player and deletes an audit line

`nimmZurueck()`, line 1779-1802. Verified in source:

- `zustand.protokoll = zustand.protokoll.filter(z => z.schluessel !== "wurf")` — **the roll entry
  is deleted from the log.** 02-domain-model refinement 5 is explicit: `AuditEntry` is append-only,
  no updates, no deletes, and it is the substrate for undo. The undo deletes its own evidence.
- `zeichneBuecher()` then renders `absaetze = zustand.enthuellt ? 4 : 3` and `wert = s.basis + 0` —
  **the paragraph vanishes from all three players' books and every sheet drops by 2.** §2 promises
  the paragraph arrives "permanently… Not unlocked." §6.2 promises "a player cannot un-know" and
  that retraction "is a row, never a delete".

**Scenario.** 21:47, the GM's finger slips and she reveals §4 — the passage saying two of the
ledgers are forgeries — instead of §3. She presses `Z` within two seconds. On the tablet, the
paragraph the player has already read disappears; his Insight silently drops back; if he had
already rolled, the roll is gone from the log. He asks what happened and the correct answer is
"nothing happened", which is false, and the log now agrees with the false version.

The right behaviour is the one the doc already describes and the artifact does not implement:
write a retraction row, leave the passage in the book marked *retracted in session 14*, expire the
clause **with a visible event on the player's sheet**, and never touch the log. This is a two-line
fix in the spike and a design ruling in the doc — but it is the ruling that decides whether "undo"
means *append a correction* or *rewrite history*, and the flex artifact currently demonstrates the
second one to the stakeholder.

### M4 — single-letter hotkeys on a writing product; A1 fires them from inside text

`spike-A1.html` line 1970-1987:

```js
var tag = (ev.target && ev.target.tagName) || "";
if (tag === "INPUT" && ev.target.type !== "radio") return;
if (tag === "TEXTAREA" || ev.metaKey || ev.ctrlKey || ev.altKey) return;
```

No `isContentEditable` check. No `isComposing` check. A wiki editor is a contenteditable surface —
that is what a block editor *is* (§7.2: "Create, edit, reorder blocks"). **A2 gets this right**
(line 1871 checks `t.isContentEditable`); A1, the artifact that will be shown to Kaya, does not.

**Scenario, 21:00.** The GM is typing a note into the article while the party argues — the product
explicitly wants her authoring during play (§4.7a exists because "a GM mid-combat will not navigate
away"). She types the word *"rumour"*. The `r` fires `enthuelle()`. §3 lands on the shared stage,
in three players' permanent books, with a clause live on three sheets, in 300 ms, with a fanfare.
The undo is M3's undo. **What does she apologise for?** Not the misfire — for the fact that three
people just read the ledger secret and cannot unread it, in a product whose entire premise is that
they cannot unread it.

Now add the cat the brief specifies. A cat on a keyboard produces `r`, `z`, `1`, `2`, `3` — reveal,
retract, and three Reader's Cut switches — because A1 binds all five as bare keys with
`preventDefault()`. **Irreversible-in-social-terms actions must not be reachable by one unmodified
keystroke with no confirmation and no target selection.** The Docket's per-row hotkeys (`R`, `T`,
`N` in the fixture) make this worse, not better: they are *unlabelled targets*, so the GM's muscle
memory is bound to a list whose order changes with staging.

### M5 — the flex is a function of prep, on the axis the candidate claims to win

§3's worked example is honest about its own precondition: "Prep time before the session: eleven
minutes, all of it in the codex", producing a Docket of 9 staged passages with hotkeys. Every
`R` in the session presses against something staged in those eleven minutes. Total live GM work:
"nine keystrokes and one diff review." K4 row: the candidate bets on **axis 1, GM workload**.

**Scenario — session 15.** The party ignores the vault entirely and rides for the Kepler foundry,
which §2 shows as a **red link**: a question the world has not answered. The GM has zero staged
passages there, therefore zero hotkeys, therefore zero flex. The product's answer to improvisation
is §4.1's cheerful framing that a red link "is the cheapest possible prep prompt" — but at 21:00
the prompt has no answer, and the product's shape now asks her to *write an encyclopedia article
live while five people watch*. Owlbear's GM apologises for nothing; she drags a JPEG onto a canvas
and keeps talking (RB-01-owlbear: ~20 minutes to a running table, the market benchmark the
candidate itself cites).

**Why this is major and not a quibble.** §8.1 concedes cold start — the *first* session. This is a
different break: it is the **steady state**. The candidate's differentiator is available exactly
in proportion to prep, on the axis where it promised to reduce prep. The two are not contradictory
(prep in the codex may still be less prep than prep in Foundry), but the candidate never makes that
argument and never measures it, and axis 1 says "measured, not felt" (01-attack-plan). Round 2 owes
a number: minutes-of-prep-per-hour-of-play against Foundry and Roll20, with the staging step
counted.

The related weakness §8.4 names — GMs who write one `gm_only` blob — has a sharper form the
document misses. §9.1's Theory Board is offered as the answer to the empty encyclopedia, and §8.4's
mitigation is that players fill it from the other end. But **the answer to "the GM won't write" is
"the players will write", and the answer to "the players have nothing to theorise about" is the
GM's articles.** That circle has to be broken by somebody doing unpaid authoring in week one, and
the market evidence says tables minimise obligation (Roll20's 10M accounts, Owlbear's account-free
join). The fusion has *two* authoring taxes, not one, and the candidate prices neither.

### M6 — "the first slice" is Akt I + Akt II + half of Akt V, called one workflow

§7 promises "One workflow. No map, no dice engine, no combat, no theme editor, no AI, no rule
builder, no Steam." Then it ships, in the same slice:

auth, memberships and server-side permissions with horizontal-escalation tests · a **block-structured
wiki** with `[[wikilink]]` autocomplete, backlinks and typed red-link stubs · **per-passage ACLs**
behind a choke point with an `at_time` axis · the `reveal` Action with preview/commit/**undo** and
audit · a **realtime channel** delivering it live · **session-stamped `PassageRevision`** and an
`as of session N` query · a **clause engine** with a field schema, a live modifier and a
**derivation view** · a **Canon Diff** screen · **lossless export with a round-trip import test** ·
and NVDA/Firefox + VoiceOver/Safari passes with contrast validation in CI.

Against [`01-attack-plan.md`](../../01-attack-plan.md): that is Akt I (identity, membership,
permissions, audit, token-first theming) **plus** Akt II (rule-engine core with trace, knowledge
workspace, search-with-permissions) **plus** Akt V (portability, export/import, accessibility
audit). §8.8 concedes "two products' worth of engineering" and then §7 does not price a single
item.

**The tell is item 6.** "No dice engine" — but the acceptance demo requires *"Insight becomes 5,
and the derivation cites the passage."* A derived value with a citable trace requires a field
schema, an evaluation order, a modifier stack, and a trace renderer. That is the rules engine, in
slice 1, under a heading that says the slice has no rules engine. §7.6 is right that this organ
cannot be bolted on later; it is simply not a small thing, and calling it "one clause shape,
hard-coded" does not make the surrounding machinery optional.

Hephaistos should price §7 item by item. My estimate is that items 2, 3+4 (choke point + response
body test), 6 and 9 are each a slice on their own, and item 5's `at_time` axis silently doubles the
test matrix in §6.7 that §6.7 already calls a gate rather than a task.

### M7 — search at 2 000 articles: rank-then-filter leaks, filter-then-rank abandons the index

§8.2 lists "search snippets" as a leak surface. It does not list **result counts and pagination**,
which is the instance with no clean fix.

A five-year world at 2 000 articles is 30–60k passages. The GM's `Ctrl+K` palette (§4.7a) and the
player's search both run through `visible_passages`, and the CI lint (§6.7) forbids any query
touching the `passages` table outside it. So an implementer has two options:

- **Rank then filter** — use the FTS index, get 50 hits, drop the ones the reader may not see,
  return 31. The reader now sees "31 results" on a page that shows 9, or page 2 of 3 with gaps.
  Result counts, page counts and gap positions are all channels. This is the version every team
  ships under time pressure because it is the fast one.
- **Filter then rank** — materialise the reader's visible set first. Correct, and it cannot use
  the text index against a per-reader ACL with an `at_time` predicate without a per-reader
  materialised view. At 60k passages × N readers × a temporal axis, that is the expensive answer,
  and the palette is on the hot path *during play* (§4.7a exists precisely so the GM can search
  mid-combat).

The candidate needs a stated answer, a target latency and a leak test in the §6.7 matrix. Right
now §6.7's signature — returning `Passage[]` with no notion of a total — actively pushes
implementers toward the leaky option, because a search UI needs a count and the function does not
give it one.

### M8 — `as of session N` has undefined semantics against retraction, and §6.3 spends that feature

§6.3 introduces `PassageRevision` stamped by session and uses it to justify killing the `Timeline`
table: "Session-stamped revisions are 80 % of the value at 5 % of the query cost." §4.1 sells both
axes together: *"what did Kael believe in session 3?"*

§6.2 also allows `retracted_at` — a GM marks a reveal as mistaken; the row stays.

**Scenario.** Session 3: the GM reveals *Iron Vault §2* to the campaign. Session 9: she decides it
was a mistake — a retcon — and retracts it. Session 11: she opens Reader's Cut, *as Kael*,
*as of session 3*.

Does §2 appear? Both answers are defensible and the document ships neither:

- **Yes** (evaluate revelations as-of session 3, ignore later retractions) — the time machine
  faithfully reproduces history, and the GM has just built a one-click way to re-show the table
  something she deliberately un-canonised, in a view she will screen-share.
- **No** (retraction is retroactive) — then §6.3's justification collapses: "the world as the
  table knew it in session 3" is not a real query, it is *the world as currently believed,
  back-dated*, which is the thing §6.3 said a UI trick would give you.

The same ambiguity hits `PassageRevision` (does the as-of view show the text as revised in session
7, or as it stood in session 3?) and it hits export (§7.9 exports revelations and revisions —
which projection is canonical?). This is cheap to settle and expensive to discover after a GM has
five years of revisions.

### M9 — `Passage` carries no language, in a de/en product whose thesis is reading

00-intake requires de/en localisation. §9.3 ships worlds between authors, therefore across
languages. §4.6 says theming's extra target is **article typography** because "a codex read on a
phone on Tuesday is a *reading* product". §6.1's `Passage` schema: `(id, article_id, ordinal,
kind, content, visibility, clause_ref?, belief_ref?, provenance, created_by_user_id)`. No `lang`.
Neither does `Article`.

Three concrete consequences:

1. `spike-A1.html` sets `hyphens: auto` on the reading column (line 527) and the file declares no
   language anywhere — no `lang` attribute, no `<html>` element at all. **Hyphenation requires a
   language; with none declared it does not fire.** German prose, unhyphenated, at a 38 rem
   measure, is exactly the ragged-right mess this candidate cannot afford, and it is invisible in
   review because it looks like a typography opinion rather than a missing attribute. (A2 does set
   `lang="de"` on `.app` and swaps it for the Finnish axis — credit where due.)
2. Screen readers pronounce a German world in the reader's default voice. Invariant 8 says
   accessibility is architecture; a language tag is the most architectural thing there is.
3. Search stemming, sort collation and the `[[` autocomplete all need the passage's language, and
   a forked world will legitimately contain both.

One nullable column on `Passage` (inheriting from `Article`, inheriting from `Universe`), and it is
free today. It is a backfill over 4 000 paragraphs later — the exact shape of pain §8.3 describes.

### M10 — nobody designed what an incoming revelation does to a reader who is mid-sentence

§2 sells "three things happen in the same 300 ms, on three different screens." A2's cross-review of
A1 already named the gap — *"was der Spielerschirm tut, wenn der Commit scheitert, hat niemand
entworfen"* — and it is wider than failure handling.

`spike-A2.html` rebuilds the entire DOM on every action: `render()` (line 1688) calls
`renderRail(); renderDocket(); renderCuts(); renderArticle(); renderLens(); renderLog();
renderActs()`, all via `innerHTML`. Consequences that are not artifact-local, because this is also
what a realtime delta does:

- **Keyboard.** Tab to §3's *„Diese Passage enthüllen"* button, press Enter → `doReveal()` →
  `render()` destroys the button → **focus resets to `<body>`**. The keyboard user tabs from the
  top of the page again. This happens on every single interaction in A2 (docket selection, cut
  switching, tab clicks that trigger render). In the shipped product it happens to **every player**
  every time the GM presses `R`: the article they are reading is replaced under them, scroll
  position and screen-reader cursor included.
- **The 3G tablet.** The player on 3G misses the websocket delta. But the clause is computed
  server-side from revelation rows, so **the next roll comes back with the +2 while the paragraph
  that justifies it is not in their client.** The trace renders a citation to a passage the client
  cannot resolve. §2's own selling point — the number is a link — becomes a dead link on the one
  device most likely to be at the table.
- **The optimistic commit.** A1 flips `zustand.enthuellt = true` *before* the choreography and has
  no failure path at all (line 1710-1777). There is no design for a reveal that the server rejects
  after the mote has already flown to three books.

The product needs a stated reconciliation model — delta application without destroying reading
state, a replay-on-reconnect path keyed on the append-only `Revelation` log (which is the right
substrate for it, so the fix is cheap), and a defined behaviour for a rejected optimistic reveal.

### M11 — a clause on a template Article activates for readers, not for holders

§4.4: an item **template is an Article**; the instance has its own passage stream. §6.4: "A clause
is active for a character iff that character has a live revelation for its passage."

**Scenario.** The GM writes the *Vharon Signet Ring* template article. §2 of it carries
`+2 Insight · subject: House Vharon finances` — a perfectly natural thing to write, since the
candidate's entire pitch is that lore carries mechanical weight. The party finds **one** ring.
Kael takes it. The GM presses `R` on the template's §2 with audience `campaign` so the table knows
what the ring is.

Per §6.4, the clause is now live on **all three characters**. Ossa and Brenn get +2 from an item
they do not hold, because they *read about it*. Invariant 3 as literally written is intact — the
template edit did not mutate the instance — but the fusion rule has no ownership, equipment or
attunement predicate anywhere in it, and §6.4 calls that one sentence "the fusion, expressed as a
constraint."

Adding a predicate is not free: the moment a clause can be conditional on possession, it can be
conditional on anything, and the clause vocabulary becomes an expression language — which is
§4.6's stage 4 (the formula graph), pulled forward into the definition of the substrate. That is a
real sequencing consequence and it belongs in round 2 rather than in a bug report from a table in
year one.

---

## MINOR

- **`readHash()` accepts unvalidated fragment state → dead page.** `spike-A2.html` line 1659-1665
  writes any `#w=` value straight into `S.world`; `renderRail()` then reads `PACKS[undefined].rail`
  and throws. Open `spike-A2.html#w=aldenfal` (one typo) and the page never renders. The artifact's
  most-praised habit — deterministic linkable state, which A1's reviewer wants made a house rule —
  is also its most fragile code. Invariant 10 requires error states; a shared link with a stale
  fragment is the most likely way anyone will ever open one of these files.
- **`aria-pressed` on the Reader's Cut buttons** (`spike-A2.html` line 1432) where a radiogroup
  belongs — an either/or choice loses native arrow-key navigation. Already found by A1's seat; I
  confirm it and add that A1 does it correctly with real `input[type=radio]`, so the fix is a copy.
- **No `prefers-contrast`, no `forced-colors` in A1.** Already found by A2's seat. I confirm by
  grep: neither string occurs in the file. Point 8 of the triumph acceptance matrix demands both,
  and accessibility is a competitive axis (K4/axis 5).
- **Missing charset/BOM across the round's spikes.** Already found and verified by A2's seat
  (`EnthÃ¼llen` on a `file://` open in Chrome). Not re-litigated here; noting that it stands.

---

## What I could not break — conceded by name

A clean bill from me has to mean something, so these are specific and each one is a place I
actually attacked.

1. **Invariant 4, `defeat_pending`.** Correctly absent from slice 1 and correctly named in §3's
   write path (its resolution appends to the action log). I looked for a place where the candidate
   auto-resolves a defeat and there is none.
2. **Invariant 5, AI-optional.** The best-handled invariant in the document. The Canon Diff's
   proposals are *derived, not AI*, are never auto-applied, and slice 1 ships **zero** of them
   because "a wrong proposal is worse than no proposal" (§8.5). Pythia attacked this before I could
   and reached the right answer.
3. **Invariant 9 / K7.** Fully honoured. Art is skin and package content in both spikes; the most
   cinematic moment in the product is a *transition*, not a depicted world. I went looking for a
   re-fusion of world and chrome and found none.
4. **Invariant 3 as literally stated.** Template edits do not mutate instances, and §4.4's
   per-instance passage stream ("what *this* sword has done") is a genuine improvement on the
   invariant rather than mere compliance. M11 attacks a different edge and does not touch this.
5. **Invariant 2 for the clause vocabulary.** Declarative, versioned, package-pinned, validated,
   executed by an engine, never evaluated as script, with `package_id` / `package_version` /
   `schema_type` / `document_version` / `validation_status` carried as the pack requires. Exactly
   right. F3 attacks a *different* language that §4.1 introduced and nobody specified.
6. **§8.3, clause migration inside a five-year world.** I could not beat Pythia's own framing.
   Her partial answers — independently versioned vocabularies, declared migrations with dry-run
   diffs, the authored-against version recorded per passage, unmigratable clauses degrading to
   *inert with a visible marker* rather than to wrong, vocabulary always in the export — are the
   right four moves. I found no fifth and no counter-example she had not already stated.
7. **§8.1, cold start.** Conceded at full strength with the competitor's number attached
   (RB-01-owlbear, ~20 minutes, account-free join). I did not find an unstated worse case; M5 is a
   different break (the steady state), not this one.
8. **A1's narrow-viewport behaviour.** I went hunting for a 380 px collapse and did not find one:
   media queries at 1179 / 760 / 420 px, single-column reflow with sensible source order, reading
   size stepped down, segmented controls made full-width, and the fee table wrapped in an
   `overflow-x: auto` container so the page body never scrolls sideways. This is better than the
   round deserves.
9. **A2's contrast measurement.** Real WCAG relative-luminance math over *computed* token values
   read from a 1 × 1 canvas, graded per pair, with the worst ratio actually observed reported
   across a 12-step sweep — and high-contrast × dark handled in both directions
   (`@media (prefers-color-scheme: dark)` guarded with `:not([data-theme="light"])` *and* an
   explicit `[data-contrast="hoch"][data-theme="dark"]` twin). I looked for the classic leak of a
   light-ladder high-contrast block into dark mode and it is not there. Lift this into CI verbatim.
10. **A2's keyboard guard.** Line 1871 checks `INPUT`, `TEXTAREA`, `isContentEditable` and all
    three modifier keys. Correct. A1 is the broken one (M4), and the fix is to copy A2's line.
11. **A2's asset-failure honesty.** `aldenfall-scene-v1.png` genuinely does not exist — verified
    against `design/spikes/assets/universal-ui/` — so the missing-art path is exercised by a real
    404, and the caption distinguishes *switched off* from *not found* from *present*. That is
    engineering, not decoration.
12. **A2's long-label axis.** Finnish compounds swapped in with a matching `lang` attribute on the
    rail, and the longest label reported by measurement rather than by claim. It is the only
    long-label test in the round and it passes.
13. **The differentiation ledger, §5.** I tried to falsify a competitor claim and could not. Every
    "they still win" is stated at full strength — Foundry's lighting/vision/Regions decade and its
    $50-once anchor, Roll20's ~10M accounts and licensed catalogue, Fantasy Grounds' shipped
    sell-and-auto-update loop **and its November 2025 free client** (deleting the price objection
    we would have used), Owlbear's 137-megapixel iPhone render and Forecast auto-fog, Alchemy's
    *already shipped* no-code Sheet Builder beating us to K2's first half, TaleSpire's slab export
    being better UGC than anything §9.3 proposes. The closing line — "for a table that wants to
    play a licensed system tonight… all six beat us, and three of them are free" — is the most
    honest sentence in either candidate.

---

## Verdict

The substrate survives. `Article` / `Passage` / `Revelation`, per-reader projection, and a clause
whose activation is a function of what a character knows is a genuinely new idea and the only one
in this round that no competitor can copy without rewriting their data model. Press `R` is a real
flex, not a demo trick.

The **specification** does not survive. Four fatals, and they cluster: F1, F2 and F3 are all the
same failure of imagination — §6.7 built a wall around the *article* and left the *arithmetic*,
the *audience set* and the *query* outside it. F4 is the round's own binding rule, unanswered.

None of the four is a reason to kill the candidate. Each is a reason it cannot proceed to a verdict
in this form. Round 2 for A owes exactly five things: a stated resolution of trace-vs-secrecy
(F1, and I expect the answer costs the 21:02 moment), per-character materialised revelations
(F2), embedded queries specified to the clause vocabulary's standard or cut (F3), reachability with
a number (F4), and the Canon Diff — **the screen the candidate's own §4.2 calls its heartbeat, and
which neither artifact drew.**

*Nemesis. I broke it four times where it mattered and I could not break it in six places where I
tried. Both halves of that sentence are the report.*
