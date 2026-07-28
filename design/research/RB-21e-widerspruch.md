# RB-21e — Der Widerspruch gegen die Verschachtelung

**Nemesis, die Widersacherin, against the nested-everything proposal.** Compiled 2026-07-27.
Target: the stakeholder's own sentence, treated — correctly — as a data-model proposal:

> *„das Ding ist hier haben wir Weltkarten, aber wir wollen auch lokale Karten haben können. Oder
> **nested Maps**, das wäre wohl das krasseste. **Jedes Universum ist dann eine gigantisch große nested
> map. Mit nested inventory.**"*

Four briefs answered him on the same day. **RB-21a: a strict tree plus a typed multigraph, priced at
nothing. RB-21b: a forest with two named boundaries, 28→34 days. RB-21c: two CRITICALs, both fixable
today for ~0. RB-21d: a DAG, measured, plus 13→16 and 5→6 days.** This brief adds the fifth answer,
which is again the one nobody wrote: **what the four of them say when you read them against each
other instead of one at a time**, and **what the whole round costs against the ledger it actually
lands on.**

**I am bound by my own prior arithmetic** — [`RB-18`](RB-18-widerspruch.md) (the ledger, the
uncalibrated unit, the restored 20 % contingency, the accretion disease) and
[`RB-20e`](RB-20e-widerspruch.md) (the union method, die Bilderregel, *„der Ortsleger, nur als
Leser"*). **I do not contradict either.** Where this round closed one of my gaps I record it first,
because a document that only tightens screws is a mood, not evidence:

- **RB-20e §7.1 recorded that no measurement existed of whether places-that-mean-something have
  demand.** Still true, and §5.4 below says so — but RB-21d closed **five** of RB-20d's own gaps by
  *executing the generator five times*, which is the second consecutive round where measurement
  arrived instead of rhetoric. RB-21a produced five re-runnable scripts. RB-21c fetched and parsed
  **337 of 337** SVG licence tags. That is real work and I will not pretend otherwise.
- **RB-18 §1.4 listed the licence position of any third-party map source as unpriced and unexamined.**
  RB-21c closes it completely, at file granularity, with two CRITICALs. It is the best single brief in
  this round and possibly in the corpus.

**Reads as binding and does not re-open:** [`RB-11`](RB-11-steam-vs-browser-verdict.md) — the game
engine is **STRUCK at 2/2/2**; React/TS + PixiJS, DOM-authoritative, canvas behind `MapRenderer`,
browser + Electron. Unity/Godot/Unreal are out and are not mentioned again except to say that the
instinct behind them — *he wants real editor tooling, not a toy* — was already priced on the pinned
stack at **21 days new work (≈25 with contingency)** by [`RB-20b §8`](RB-20b-machbarkeit.md), and
that this brief does not re-open that either.

**Method.** Every break carries a scenario or a number. Numbers I computed are marked **[computed]**
with the inputs shown so they can be re-added by hand. Numbers I retrieved or measured myself today
are marked **[gemessen, 2026-07-27]** with the command or URL. Vendor self-reporting is labelled.
Where a figure could not be established the text says **"no reliable figure found"** — that phrase
appears eight times below and every one is re-listed in §7.

Break numbering continues: RB-18 ran B-1…B-5, RB-20e ran B-6…B-16. **This brief runs B-17 … B-27.**

---

## 0. The finding that outranks all five fronts

I was asked to attack on five fronts. Four of them produced real breaks. But the round has a defect
that is larger than any of them and that no single brief could see, because each was written inside
its own boundary:

> **Three briefs, written on one day, about the single most irreversible object in this product,
> specify three mutually incompatible schemas for it — and each declares its own version
> irreversible.**

| | RB-21a (Ariadne) | RB-21b (Hephaistos) | RB-21d (Erzeugung) |
|---|---|---|---|
| **The shape** | *"It is not one graph and it is not a DAG. It is one tree plus one multigraph."* | *"It is not a DAG. Containment is a forest."* | *"**„Nested" is a DAG and this is now measured, not asserted.**"* |
| **Parent cardinality** | `raum_eltern_id` — **exactly one**, `NOT NULL` on non-roots | `eltern_id` — **exactly one**, `NULL` = a root | `eltern: Kante[]` — *"**MULTI-PARENT. typed. never a single pointer.**"* |
| **The node tables** | `Ort` (canon) + `Ding` (board state) | `Knoten` + `Posten` + `Fassung` | `Knoten` + `Kante` |
| **The primary boundary** | **canon vs. board state** (`die Beförderung`) | *"neither of them is „Ort vs. Gegenstand"* — **addressable vs. measure** (`die Erhebung`) | none drawn |
| **Where possession lives** | `Ding.traeger_actor` — a **third alternative container column**, not a tree edge | `Knoten.art = Akteur` — the actor **is a node in the containment tree** | not addressed |
| **Everything non-spatial** | `Bezug` — a separate table, **carries no permission implication, ever** (R-P3) | `Nebenkante` — a separate table, no rollup, no inheritance | `Kante.art = gehoert_zu_herrschaft` — **inside `eltern`** |
| **Depth cap** | **8** on `Ding` chains, campaign-configurable | **`MAX_TIEFE = 24`**, and it mocks Foundry's 5 for being too small | none |
| **Declared irreversible** | §7.4, seven items | §7.2, six items | §6.3, *"Defining a format is an irreversible act"* |
| **Priced** | **nothing** (§9 item 10, deliberate) | **28 → 34 days** | **13 → 16 and 5 → 6 days** |

**This is RB-18 §1.1's disease — four numbers for one thing in one afternoon — transposed from a
schedule onto a schema.** A wrong schedule costs a surprise. A wrong schema costs what Kaya himself
named as the most expensive thing in the product: *„die Migration kostet am meisten."* And his own
rule — *build the maximal version of whatever is irreversible* — is not satisfiable by three
documents that disagree about what the irreversible thing **is**.

**Apollon cannot synthesise this round. He must rule it**, by name, before one line of schema exists.
§1–§2 below establish that the disagreements are real and load-bearing rather than vocabulary.

---

## 1. Front one — the nesting itself

### 1.1 B-17 — the DAG question is answered twice in one round, and the two answers are not compatible

RB-21a's central ruling, and it is argued from a measurement rather than from taste:

> *"if the rule „knowing a child implies knowing its parent" is applied over all edges instead of only
> the spatial one, a character holding 20 % of a world's places thereby learns of **89 % of its secret
> organisations** (357 of 400)."* [gemessen, `leck2.mjs`]

RB-21d's central ruling, from a different measurement, four hours away:

> *"**Landmass and polity are two parallel axes over the same points, not two levels of one tree.**
> 8 of 25 states span more than one landmass. The containment graph therefore needs **typed edges**
> (`liegt_in_geografie` vs `gehoert_zu_herrschaft`)… **This is the DAG, and it appears at the very
> first level of a default world.**"* [gemessen]

**Now run RB-21d's schema through RB-21a's own permission rule.** RB-21d puts
`gehoert_zu_herrschaft` — political membership — **inside `eltern`**. RB-21a's **R-P1** says holding
a node implies its ancestors are `benannt`, transitively. RB-21d never states R-P3 and never
distinguishes which edge kinds imply; its only permission ruling is *"`Sicht` must project per node,
not per subtree."*

> **RB-21d's record, governed by RB-21a's rule, is the exact configuration RB-21a measured as leaking
> 89 % of a world's secret organisations. Neither brief can see this, because the leak measurement is
> in one file and the multi-parent ruling is in another.**

*Scenario:* round 7 forges against RB-21d's `Knoten` record — reasonably, because it is the one with
the measured evidence behind it and the one the generator adapter needs. `eltern` is a typed list. A
year later somebody implements the breadcrumb and the upward implication, because a breadcrumb
without an upward implication is unrenderable (RB-21a §5.2 proves this). The `Bruderschaft der Asche`
is now `benannt` for every character who has stood in a room the brotherhood owns. **The leak is in
the schema, and RB-21a already wrote the sentence: „no amount of careful querying repairs it
afterwards."**

**Which is right?** RB-21a, on this narrow question, and the reason is that RB-21d's own evidence
does not require multi-parent *containment* — it requires multi-parent *membership*, which is exactly
what `Bezug` is. 8 of 25 states spanning two landmasses is a `Bezug(state, herrscht_ueber, landmass)`
problem. 324 of 575 routes crossing two provinces is RB-21a §1.3 case 1, already ruled, with OSM's
`level=0;1` set-valued attribute as precedent. **RB-21d measured the DAG and then put it in the wrong
column.** But it is RB-21d that has the generated corpus, and it is RB-21a that has the leak, and
**neither brief cites the other**, because they were written in parallel with disjoint file surfaces.
That is the cost of the spawn pattern, arriving on the one object where it is unaffordable.

### 1.2 B-18 — the tired GM at 21:00 gets two different answers to „where does this hang?"

Apollon's front-one question, exactly: *a GM who just wants to drop one battlemap and play tonight
now has to decide where it hangs in a graph.*

**The round answers it twice, incompatibly:**

- **RB-21a R1:** *"Every `Ort` has **exactly one** `raum_eltern_id`, except roots (`NULL`). Not
  zero-or-many. One or root."* — enforced by `NOT NULL` on non-roots **plus a partial unique index
  capping roots per campaign.** A battlemap that hangs nowhere is **unrepresentable**, by
  construction, deliberately.
- **RB-21b:** `Knoten (… eltern_id NULL, -- exactly one parent. NULL = a root.)` — no cap, no
  partial index. **A rootless battlemap is a legal row.**

So: at 21:04 on a Saturday, does the software let her play, or does it ask her a question about
Andaria? **The round does not know.** And note which brief is which: the one that forbids the orphan
is the one that priced nothing, and the one that permits it is the one that priced everything.

**And the cost is not only the question — it is the vocabulary.** To place one cave correctly under
RB-21a she must understand, or be shielded from: `Raum` vs `Bezug`, `Ort` vs `Ding`, `massstab`,
`Anker.geometrie = ohne` vs no `Anker` row, `hoehe_von`/`hoehe_bis`/`ordinal` (because an underdark
is a **sibling with a negative elevation band**, not a child — §1.3 case 3), `bewegt`, and `Übergang`
vs `Vergrößerung`. **[computed]** across the three briefs I count **≈35 newly named concepts in one
round** (§5.3 lists the count by brief). RB-18 §3.4 demanded an *Erststundenbudget* — *"the number of
distinct surfaces, controls and named concepts a first-time GM must pass to reach her first minted
paragraph, with a hard cap"* — precisely to make this measurable. **It was never adopted.** So the
question *„what does the abstraction cost the tired GM at 21:00"* has no instrument, in the round
that most needed one, because the instrument I asked for two briefs ago does not exist.

**The cheapest honest fix, and nobody proposed it:** a per-campaign `Unverortet` root — one row, one
name, one breadcrumb that reads *„noch nicht verortet"*. It satisfies R1, it lets her play tonight,
and it turns the graph question into a **later** question, which is the only kind a tired GM can
afford. Under RB-21a's own `Beförderung` discipline that is a re-parent, audited, one keypress.
**One row buys the entire 21:00 case, and the round spent four documents without writing it.**

### 1.3 B-19 — the re-parent of an `Ort` is not undoable, and that is a table-hour cost stated as a virtue

RB-21a §5.4, in its own trap table:

> *"**A re-parent of an `Ort` is canon and is NOT undoable** — it is a `Berichtigung`."*

Read that at the table. Kaya promotes the smuggler's wagon from `Ding` to `Ort` in session 12 —
`die Beförderung`, one-way, audited, exactly as designed. In session 20 he drags it to the wrong
harbour. **`Ctrl+Z` no longer works on that object**, because the `Zustand` undo ring covers `Ding`
and not `Ort`, and the correction is a `Berichtigung` with a reason field.

> **The moment a container becomes canon, moving it stops being cheap.** `Die Beförderung` is
> presented as *"the migration path that costs a keypress per row"* — and it is, structurally. What
> it also costs, and what is not written down, is that **every promotion silently converts a free
> gesture into an audited one.** A GM who promotes liberally is building herself a world in which
> nothing can be dragged back.

*Scenario:* by session 30, forty containers have been promoted because promotion is the gesture the
UI rewards (it grants an article, a door, a citation). The GM reorganises her harbour district on a
Wednesday. Forty `Berichtigungen`, each demanding a reason. She stops reorganising. **A model whose
canon surface is more expensive to move than its board-state surface will be used by keeping things
off the canon surface** — which is the anti-log invariant working correctly, and the encyclopedia
staying empty, which is CHAMPION §15.9's four-round-old wound.

---

## 2. Front two — the one-mechanism claim

### 2.1 B-20 — possession is not containment, and the round contains both answers, so one predicate does not compile

Apollon named the case exactly: *items are carried by characters who are themselves inside places, so
containment and possession are not the same edge.* **The round proves him right by contradicting
itself.**

- **RB-21a §7.1:** `ding (… behaelter_ort, behaelter_ding, traeger_actor, CONSTRAINT
  genau_ein_behaelter CHECK (num_nonnulls(behaelter_ort, behaelter_ding, traeger_actor) = 1))`.
  **Carriage is a third, alternative column.** `actor_instance` is **not** a node in `Raum`. Nowhere
  in RB-21a does an actor have a spatial parent.
- **RB-21b §1.1:** `Knoten (… art ∈ Ort | Behälter | **Akteur** | Szene | Universum, eltern_id,
  pfad ID[])`. **The actor is a node in the tree and carries a materialised path.**

Now read RB-21b's own reachability predicate, the one that answers *"can this character get at that
thing"* — its stated third justification for storing `pfad` at all:

```text
erreichbar(actor, knoten) :=
     ∃ Zugriff(knoten, actor, nehmen)
  ∧ longest_common_prefix(actor.pfad, knoten.pfad) is within the package's declared Griffweite
```

> **`actor.pfad` does not exist in RB-21a's schema.** An actor there has no row in the containment
> tree and therefore no path. **RB-21b's reachability predicate — the load-bearing answer to the
> party-stash case, the one it calls „free, because `pfad` already exists" — is unimplementable on
> RB-21a's model.** One of the two must give, and the choice is not cosmetic: it decides whether
> *„wo ist die Münze"* is answered by a tree walk or by a join through a table the tree does not
> contain.

**And it decides a permission question that neither brief asks.** If the actor is a node (RB-21b) and
R-P1 (RB-21a) implies ancestors upward, then **holding a coin implies knowing the person who carries
it, the room she is in, the building, the district, the city and the continent.** A pickpocket who
succeeds learns her victim's full location chain by construction. If carriage is a separate column
(RB-21a), the coin has no spatial position at all until you join through the actor — and then the
breadcrumb *„Münze › Beutel › Truhe › Kammer › Haus Vharon › Blattheim › Andaria"*, which RB-21a
prints as its own showcase sentence, **cannot be produced for a carried coin**, only for a coin in a
chest.

> **The unification's showpiece breadcrumb runs from a continent to a coin, and the model that
> forbids the leak cannot render it for any coin anybody is carrying.**

### 2.2 B-21 — `die Verbundlast`'s gate does not test the attack it was written for

RB-21b §2.4 is the round's sharpest original security finding and I want it credited: *"if you carry
a sealed chest, and the client renders your encumbrance, and encumbrance is a sum the client
performs, then the encumbrance number leaks the weight of contents you cannot see."* Correct, novel,
and the first numeric obligation ever placed on `Sicht`.

**The gate it proposes does not detect it.**

> *"Gate: **remove every child from a player payload and the printed encumbrance is unchanged.**"*

That gate passes trivially the moment the number is composed server-side, which is the whole ruling.
It tests that the client does not sum. **It does not test the subtraction.** The attack is:

1. The bag is `geöffnet`. The player legitimately receives **three** projected children, each a
   `Knoten` carrying `eigengewicht` (RB-21b §1.1 — it is a column on the node, and an inventory UI
   that cannot show an item's weight is not an inventory UI).
2. Two further children are `unsichtbar` — the illusion, the false bottom, the thing the GM has not
   revealed.
3. The player sums her three visible weights → **V**. The server hands her the composed scalar →
   **T**. She computes **T − V**, and learns there are eleven pounds of something she has not found.

RB-21b rules only the **sealed** case (`verzeichnet` contributes `eigengewicht` only, and it names
the reveal as an honest tell — *"there is no third option"*, correctly). **It never rules the
partially-projected open container**, which is not an edge case: it is the false-bottomed chest, the
hidden compartment, the drawer under the drawer — the single most common inventory secret at any
table in the hobby.

> **The round's best new gate is aimed one step to the left of the leak, and the case it does not
> cover is the case the mechanism exists for.** *Scenario:* der Zwillingsbeweis's sealed-crate fixture
> pair goes green in CI. Six months later a player at Kaya's table subtracts, out loud, at 21:40, and
> the gate is still green.

**The fix is one line and it is the champion's own:** the composed scalar must be computed **over the
reader's projection**, not over ground truth — which is RB-21a's `getragen` vs `wahr` split (§5.3
L5), already ruled, in the other brief, and **RB-21b never cites it.** Two briefs, same round, one
has the leak and the other has the fix, and they do not know about each other.

### 2.3 What survives of the one-mechanism claim, and it is more than I expected

| Clause | Verdict |
|---|---|
| *"A chest-in-a-room and a city-in-a-region are the same relation"* | **Upheld.** RB-21b's four uses (projection, door ordering, mint, reachability) are genuinely identical, and RB-21a's *"the one graph is the edge, not the row"* is the correct formulation of why. |
| *"Therefore one type"* | **Refuted, twice, and the two refutations disagree.** §0. |
| *"Weight and capacity are only definable on a tree"* | **Upheld, and it is the strongest argument in the round.** *"If a thing has two parents, „how heavy is this bag" has no answer without a convention, and every convention double-counts or arbitrarily halves."* That is the reason a DAG must be refused **where the physics lives** — and it is the one argument that survives §1.1 intact. |
| *"Containment and possession are one edge"* | **Refuted.** §2.1. |
| *"The unification defuses the doors problem"* | **Refuted as stated; §3.** |
| *"Coordinates do not nest"* | **Upheld, overwhelmingly.** IMDF, OSM, Unreal's world-origin rebasing, and Azgaar's own `burgSeed`-through-a-URL bridge all say the same thing independently. **Nobody has to prove this again.** |

---

## 3. Front three — the doors, and this is my strongest ground

### 3.1 B-22 — the round contradicts itself on the one number marketing will quote

Apollon's claim was: *containment gives doors a natural ordering — not 1,253 doors, the four in this
room.* Two briefs tested it against the same corpus on the same day.

**RB-21a, counted** [gemessen, `graph.json` × `Karte:Andaria`]:

| | Count | Share |
|---|---:|---:|
| Distinct redlink targets | 689 | |
| … that are a **place** | **69** | **10.0 %** |
| Red **edges** | 1,253 | |
| … pointing at a place | **182** | **14.5 %** |
| Tier-1 doors (≥3 inbound) | 116 | |
| … that are places | **18** | **15.5 %** |

**RB-21b, asserted, §1.4, same corpus, same day:**

> *"Doors that are **places** (`Blattheim` 14 incoming, `Nördliche Minenreiche` 16, `Königreich
> Terabur` 13, `Andaria` 15) — **a large share of the 113 tier-1 doors** … **Yes.** … This is exactly
> the ordering claimed."*

> **„A large share" is 15.5 %. One brief counted; the other estimated from four examples it had
> already seen quoted — and the four examples it chose are, by construction, the four place-doors
> anybody could name.** That is sampling on the dependent variable, in a brief whose own method
> section says *„Read code, not blog posts."*

RB-21a's sentence is the one that must survive into the verdict, in these words:
**„Containment orders one door in seven."** And the single most-wanted missing page in the entire
wiki — `Andarisch`, 18 inbound — **is a language.** No containment model will ever order a language,
a house, a battle or a title, because none of them is contained by anything spatial.

*(Hygiene, small but the standard is the corpus's own: RB-21a prints **116** tier-1 doors in §6.1 and
**113** in §6.4, three sections apart, for the same quantity. RB-12 says 113. One of them is a typo
and it is the most careful brief in the round. This is RB-18 §1.1 in miniature and it should be
corrected before anything cites it.)*

### 3.2 B-23 — containment does not reduce the doors. It multiplies them 2.6× and hides the increment.

This is the front Apollon flagged as strongest and it is stronger than he framed it, because the
arithmetic runs the other way.

**[computed], from the round's own measured inputs:**

| | Doors, distinct | Orderable by containment | Not orderable | Weeks to exhaust @ ~5 Vollmachten/wk |
|---|---:|---:|---:|---:|
| The wiki as imported (RB-12, RB-21a) | **689** | 69 (10.0 %) | **620** | **138** (2.6 y) |
| **+ one generated world** (RB-21d: 1,093 distinct named things) | **1,782** | 1,162 (65.2 %) | **620** | **356** (6.8 y) |
| Δ | **×2.59** | ×16.8 | **unchanged** | **×2.59** |

[inputs: RB-12's 689 distinct redlink targets and RB-21a's 69 places among them; RB-21d's *"1,163
named things, 1,093 distinct"* from one FMG run at 1280×720, every one of which is a place with a
parent; CHAMPION §4.9's issuance cap of ≤1 Vollmacht/player/week + 2 free-floating ≈ 5/wk for a
three-player table, carried unchanged from RB-12 §5.4.]

> **Containment's coverage rises from 10 % to 65 % — but only because the round manufactured the
> numerator. The absolute number of doors containment cannot order is 620 before and 620 after. The
> absolute number of doors is up 2.6×. The supply is unchanged.**

RB-21a says this itself, and it is the most honest sentence in the round:

> *"It is a **UI fix, not an economics fix.** RB-12 §5.4's finding stands unimproved, and this brief
> does not get to claim it."*

RB-21d says the opposite in its own §1 headline — *"Containment defuses the doors problem, and the
measured margin is larger than Apollon's hypothesis"* — and it is right **about its own corpus** (a
generated world's fan-out is genuinely tighter than a hand-written wiki's: p50 of 4–6 against 9.3 per
article). **Both are true and averaging them produces a lie.** The verdict must carry both sentences,
attributed, and must never print a single one.

### 3.3 B-24 — a hidden door is not the champion's door, and the champion's flex does not survive the scoping

Apollon asked whether the headline flex survives being scoped to a room. **It does not survive
intact, and the reason is mechanical rather than rhetorical.**

The champion's door is **a red link inside a sentence**. RB-12 measured that population: **9.3 doors
per written article, 55 % of passages carry at least one, one passage carries 77.** Its power is that
it arrives **while you are reading**, in the middle of somebody's prose, unbidden. It is a
provocation.

Containment's door is **an entry in a child list**. RB-21d's own §7.4 states the outcome precisely:

> *"She opens one realm. **Six provinces.** She opens one province. **Four towns and a marker.** The
> other **1,049 doors** exist, are addressable, are searchable, and are **not on the screen**."*

> **1,049 of 1,093 are hidden, by design, and a directory entry you have not navigated to is not a
> provocation — it is a filesystem.** The 620 non-place doors continue to render inline exactly as
> before, unchanged and unhelped. So containment does not scope the champion's doors at all: **it
> orders a different population, which the champion did not have and does not need, and which this
> round is importing.**

*Scenario:* the launch post says *„der rote Link ist eine Tür"* over a screenshot of a generated
world. A reviewer opens it, sees forty-four names at the root, opens three, and asks where the other
thousand are. The honest answer — *„they are addressable and searchable"* — is the answer World
Anvil gives about its own 28 templates, and RB-18 §3.1 recorded what users call that.

**What genuinely survives, and it is worth more than the claim it replaces** — RB-21a again, and it
is the best thing in the round:

1. **Containment orders exactly the doors a generator manufactures.** *"The 90 % that containment
   cannot order are the ones a generator cannot produce either."* Same finding from two sides.
2. **The import gains 187 doors the wiki never had**, of which **54 carry a paragraph of the author's
   own prose** (9,512 characters) with a position and a faction attached. *"A door with a position, a
   faction and a description is very nearly a `Keim` the GM did not have to write."* **That is the
   cold-start fix again, and it is real.**
3. **The fan-out is measurable and survivable**: min 2 / median 5 / mean 11.9 / **max 33** in the real
   corpus; **44 at the world, 80 in a state with no province layer** in the generated one. Apollon's
   *"the four in this room"* is right at the median and **wrong at the tail by 8× to 20×**. A
   container rendering 33 rings is a hedgehog and the renderer must survive it.

---

## 4. Front four — the dependency

### 4.1 B-25 — RB-21d prices at one day the audit RB-21c declares impossible, and I measured why

RB-21d's Shape B1 — *the cheapest thing in the brief, 5 → 6 days* — is, verbatim: *"**Embed the built
bundle, unmodified** … **We ship their `dist/`**, we touch none of their source."* Its entire
provenance line is:

> *"CSP / sandbox / offline asset audit (their `libs/`, fonts, heightmap templates) — **1 day**."*

**RB-21c, the same day, on the same tree:** 337 charges of which **179 (53.1 %) are CC BY-NC-SA 3.0 —
non-commercial**; **23 textures, 11.1 MB, null provenance**; a vendored **TinyMCE 7.1.0 under GPLv2
or later**; `openwidget.min.js` with **Azgaar's own hard-wired LiveChat organisation id**; a
`googletagmanager.com` include; 39 runtime references to `fonts.gstatic.com` with a named German
court decision attached (LG München I, 20.01.2022, Az. 3 O 17493/20). Two of these are **CRITICAL,
kein Override.** And on the textures Athena writes the sentence that settles it:

> *„Die Provenienz eines Assets nachträglich zu ermitteln ist **unmöglich**, nicht nur teuer — man
> kann eine Datei nicht rückwirkend fragen, woher sie kam."*

> **One brief prices at one day the task the other brief proves cannot be completed at any price.**

**And I checked whether `dist/` actually carries it, because both briefs assumed rather than looked**
[gemessen, 2026-07-27]:

```
$ curl -s .../master/vite.config.ts
    build: { outDir: '../dist', assetsDir: './' },
    publicDir: '../public',
```

**`publicDir: '../public'` is Vite's copy-verbatim directory.** `npm run build` copies **all 21.49 MB
of `public/`** into `dist/` untouched — the 179 non-commercial charges, the 11.1 MB of
provenance-less textures, `public/libs/tinymce/` (4.13 MB, GPLv2+), and `openwidget.min.js`.

> **„We ship their `dist/`" is, verbatim and by default, „we ship both of Athena's CRITICALs."**
> B1 is not the cheapest option in the round; it is the option that ships the two things that must
> never ship, and its mitigation is one line of one day inside a table that does not mention them.

### 4.2 B-26 — the dependency was audited on two axes and would have shipped on a third

Athena audited **licence**. RB-21d audited **determinism**. **Nobody audited whether the thing we are
about to execute inside a paid Electron binary is exploitable.**

[gemessen, 2026-07-27, GitHub API + raw fetch of `master`]:

```
public/libs/jquery-3.1.1.min.js          86,709 bytes   — present on master today
public/libs/jquery-ui.min.js            108,235 bytes
public/libs/jquery.ui.touch-punch.min.js  1,291 bytes
src/index.html                          654,014 bytes
  └─ <script src="libs/jquery-3.1.1.min.js">   ← a live tag, not dead ballast
     (12 such libs/ script and link tags in total)
```

**jQuery 3.1.1 was released in 2016.** Published, unpatched in that version:
**CVE-2020-11022** and **CVE-2020-11023** (XSS via `.html()`/`.append()` with untrusted HTML —
affects `>=1.0.3, <3.5.0`) and **CVE-2019-11358** (prototype pollution via `$.extend` — affects
`<3.4.0`). All three are fixed in 3.5.0. **All three are live in the file above.**

Athena's ledger records `jquery-3.1.1` only as *"veraltet (3.1.1 = 2016)"*, correctly — her brief was
about licences and jQuery's MIT licence is clean. RB-21d's B1 does not mention it. So:

> **The round's cheapest recommended path executes a nine-year-old jQuery with three published CVEs,
> inside our process, over a document assembled from user-supplied `.map` files — and the plan's
> entire treatment of that is one day of „asset audit" in a table whose subject was determinism.**

*Scenario, and it is the specific one Apollon named:* a GM downloads a campaign package containing a
crafted `.map`. It reaches FMG's importer, which reaches a `.html()` call in a UI path that jQuery
3.1.1 does not sanitise. In a browser tab that is an XSS. **In Electron it is whatever the preload
script can reach**, and the campaign — every passage, every revelation, every credential — is in the
same product. RB-21d's mitigation (*hidden `BrowserWindow`, sandboxed iframe*) is the right shape and
is **priced at zero**, because it appears in the prose and not in the table.

### 4.3 B-27 — the bus-factor mitigation has no price by construction, and the version pin makes `Nachrechnen` a promise we may not be able to keep

**489 commits vs. 32 for the next human** is established. The interesting part is what the round
offers against it.

- **Shape B2 — fork the generators** is the only actual mitigation for *"he stops"*, and RB-21d
  refuses to price it: *"**No day estimate is offered because any estimate would be a fiction.**"*
  That is intellectually honest and it is also RB-18 §1.4's disease in its purest form: **an
  unpriced mitigation is not a mitigation.** The bus-factor risk is therefore carried, not mitigated,
  and the document says so by omission.
- **Shape B1's mitigation is the version pin** — and the pin has a consequence nobody followed
  through. RB-21d §3.2: *"`version: "1.138.2"` — pinned; **a bump is a migration, not an upgrade**."*
  RB-21d §9.1: *"**Id survival across an FMG version bump. Not tested. This is the highest-variance
  unknown in the brief.**"* And `Weltkeim`'s whole promise is that *"everything derived from it is
  re-executable, provably."*

> **Compose those three and the promise does not close.** A world generated under v1.138.2 has 863
> nodes whose ids are the anchors for every revelation, every `Vollmacht`, every citation. To
> re-derive it — which is what `Nachrechnen` means — we must still possess and still be able to
> execute **that exact version**. So either we vendor and ship **every FMG version we have ever
> generated with**, forever, in a desktop binary, or `keim_hash` is a hash of something we can no
> longer run. RB-21d's own storage ruling (*"keep the Full JSON as a cache … **evictable**"*) makes
> the second case reachable by a cache eviction.

**No reliable figure found** for the built size of FMG's `dist/` after the strip Athena requires, and
therefore none for what B1 adds to an Electron binary per pinned version. I did not build it; I will
not invent it. But `public/` is 21.49 MB before the strip and `src/index.html` alone is 654 KB, so
"a few hundred kilobytes per pinned version" is not a defensible assumption and nobody should make it
in round 7.

---

## 5. Front five — the sequencing, and this is where the number lives

### 5.1 B-28 — the ledger, with this round added

Method is RB-20e §1.3's: every line once, at its own author's number, nothing invented, overlaps
subtracted by name.

| # | Line | Base days | Source |
|---|---|---:|---|
| — | RB-18's reconciled ledger | **216–226** | RB-18 §1.3 |
| — | + *„der Ortsleger, nur als Leser"* — the version I could not break last round | **+21** | RB-20b §8 / RB-20e §5.6 |
| | **Ledger entering this round** | **237–247** | (≈284–296 with contingency) |
| 1 | **The item half: schema, path, cycle constraint, rollup, `Fassung`, stacking, revisions, `Sicht`-over-containment, `Zugriff`, Zwillingsbeweis fixture, surface, export** | **+28** | RB-21b §7.1, its own subtotal |
| 2 | **Generation ingest: Full-JSON parser, the five identity conventions, the `cells.province` join, containment projection, `Weltkeim` capture, per-level door triage** | **+9** | RB-21d §5.1 (13) **− 4**, because its *"idempotent re-import / three-way merge"* line is RB-20d's number and is already inside the 21 above |
| 3 | **Generation embed (B1): vendored build, version pin, hidden-context harness, serialisation boundary, asset/CSP audit** | **+5** | RB-21d §5.2 |
| 4 | **The spikes this round declares to be preconditions:** `S-P1` (2), `S-R1 · Die Hülle` (1), the subtree-move measurement (0.5) | **+3.5** | RB-21b §7.1 note 1, RB-21a §8, RB-21b §8.1 |
| 5 | **The map-half containment model — schema, `Bezug`, `Karte`, `Anker`, closure, R-P1/R-P2/R-P3, the six leaks** | **not priced** | RB-21a §9 item 10: *"I deliberately priced nothing… its incremental cost is not established and I will not invent it."* |
| 6 | **RB-21c's remediation: fork + full mirror, strip `public/`, the 108-asset whitelist, generated `THIRD-PARTY-NOTICES.md`, self-hosted fonts, two CI gates** | **not priced** | RB-21c prices only the TinyMCE deletion, at ~0 |
| | **New this round, priced** | **+45.5** | [computed: 28 + 9 + 5 + 3.5] |
| | **Ledger, base** | **282.5–292.5** | [computed] |
| | **+ RB-18 §1.2's restored 20 % contingency** | **≈339–351** | [computed] |

**And now set that beside the line the crew declined three hours ago** (RB-20e §1.4):

| | Base | +20 % | @ 3 dev-days/wk |
|---|---:|---:|---:|
| Ledger + the **map editor** the crew was talked out of | 281–291 | **337–349** | **26 months** |
| Ledger + **nested maps and nested inventory** | **282.5–292.5** | **≈339–351** | **26 months** |

> **B-28, stated so it cannot be softened: the nesting round costs the same as the map editor, within
> two days, and lands on the same month of the same runway. The crew declined the 65-day map editor
> on Nemesis's arithmetic at lunchtime and picked up a 45.5-day containment model by dinner that puts
> the ledger back on the identical number — with two of its own load-bearing lines carrying no price
> at all, so 45.5 is a floor.**

**Month 26 of a runway history sizes at 24–33 months** (RB-16 §1.3: Let's Role, one person, ~24 of 33
months unpaid). K1, K2, the rules engine and the WFC grammar remain uncosted after seven rounds. The
ratified go-to-market has not begun.

**Is it the most seductive way yet to lose a year?** Not quite — and I will be precise, because the
answer is more useful than a verdict. The map editor was seductive because it produced a screenshot
and bought an 11–20 % fusion ratio. **Containment is different: RB-21b's own split is ≈13 of 28 days
buying something no rival can be bought to do — 46 %, the second-best ratio ever recorded in this
lineage**, behind die Türsaat's ≈53 % and ahead of the tactical half's 31–48 %. The other 15 days,
in RB-21b's own words, *"buy parity with what `dnd5e` has shipped since 2024-01-31."*

> **So it is not the map editor. It is the map editor's price with die Türsaat's ratio — which makes
> it the most defensible expensive thing this project has ever considered, and it is still 45.5 days
> that arrive on a schedule that had none left.**

### 5.2 B-29 — `S-P1` has not run, for the sixth round, and the round's largest line is explicitly unbounded until it does

[gemessen, 2026-07-27, directory listing of `design/spikes/` and `git log` at the project root]:

```
spike-A-passage-identity/   spike-B-w1/   spike-B-wiederkehr/
spike-G-keim/               spike-K-kartenmass/
→ five spikes.  There is no S-P1.
$ git log --oneline -5
fatal: not a git repository
```

**Six rounds. Five spikes. Zero on `Sicht`. Zero commits. No repository.** RB-16 R7 set the tripwire
at five; RB-18 §2.5 recorded it approaching; RB-20e §1.6 recorded it firing. **It is now one full
round past firing**, and this round's own authors say so independently:

- RB-21b §7.1: *"The 5-day `Sicht` line **is not bounded until `S-P1` runs**… **`S-P1` is a hard
  precondition for this beat, not a nice-to-have**, and this is now the **third independent brief** to
  say so."*
- RB-21a §9 item 8: *"Any measurement of `Sicht` itself. Unchanged for five rounds… **Everything in
  §5 is unbuilt.**"*

And §5 of RB-21a is where R-P1, R-P2, R-P3 and all six leaks live — that is, **the entire permission
architecture of the nesting proposal is specification, on top of a mechanism that has never been
executed.** The round's *second*-largest priced line (5 of 28 days) sits on it, and its author says
that line is not a number but an unknown.

### 5.3 B-30 — the accretion, counted, against the two gates I demanded and the one that was never adopted

RB-18 §3.3 measured the disease: **8 new `oracles.yaml` rows and 5 new tables in round 4 alone**, and
named the mechanism — *"A product becomes overwhelming when it stops retiring things."* RB-18 §3.4
demanded an **Erststundenbudget** and a **deprecation rule**. RB-20e §4.3 demanded **die
Bilderregel**. **[gemessen — read the three briefs] none of the three has been adopted, and this
round is the largest single accretion in the corpus's history:**

| Added this round | Count | Where |
|---|---:|---|
| New database tables specified | **≈15** (6 + 7 + 2, with three collisions) | RB-21a §7.1, RB-21b §1.1/§3/§5, RB-21d §6.3 |
| New `oracles.yaml` rows / named CI gates | **≈11** | `raum_aufstieg`; `behaelter_zustand`, `durchsuchung`, `verbundlast`, `posten_zeile`; „Die Waage stimmt", „Die Vorlage rührt nichts an"; two Zwillingsbeweis fixture pairs; „Saubere Tüte", „Vollständige Nennung" |
| New named concepts in the product's vocabulary | **≈35** | Raum · Bezug · Ort · Ding · Karte · Anker · Beförderung · Übergang · Vergrößerung · Aufstieg · Bandsperre · Berichtigung · Knoten · Posten · Fassung · Nebenkante · Zugriff · Erhebung · Schleifenwacht · Verschachtelungsregel · Angleichung · Bausatz · Durchsuchung · Verbundlast · Griffweite · Weltkeim · ErzeugerAdapter · Kante · rohblock · … |
| Gates now specified in total | **≈37** | CHAMPION §12.4's ≈26 + this round's ≈11 |
| Gates that execute today | **0** | no repository |
| Named surfaces or concepts **retired** this round | **0** | — |

> **Thirty-five new names and eleven new gates in one round, none of which can go red, in a product
> whose closest competitor is losing customers to a competitor whose entire marketing page is titled
> „World Anvil Is Overwhelming."** RB-18's B-4 said this would arrive by round 8 at the observed rate.
> It arrived early, and it arrived in the data model, which is the layer users cannot avoid.

---

## 6. The concession — named, and meant

A clean bill from me is supposed to be worth something.

**6.1 · The idea is right, and it is right for a reason Kaya could not have known.** *„Jedes
Universum ist eine gigantisch große nested map"* is not a feature request; it is the observation that
**the thing that nests is the edge, not the artifact** — one column that a continent and a copper coin
both carry. RB-21a's formulation, *"the one graph is the edge, not the row,"* is the best sentence
produced in this round and possibly in the corpus. It is what lets maps and inventory be one
mechanism without putting loot in the encyclopedia, and I could not break it.

**6.2 · The tree/multigraph split is a permission decision, and it is measured.** RB-21a's `leak2.mjs`
converts a taxonomy argument into a security measurement: an all-edge upward implication discloses
**25 % / 56 % / 89 %** of a world's secret organisations at 1 % / 5 % / 20 % of places held. *(Caveat,
stated because RB-21a states it: the tree is synthetic — 10,023 nodes, 400 organisations, an assumed
25 % edge density. The magnitude is a model. **The direction is not**, and the direction is what
decides the schema.)* **This is the single most valuable artifact in the round: it costs nothing today
and is unrecoverable later, which is exactly Kaya's own migration rule, satisfied.**

**6.3 · „Der Anker mit `geometrie = ohne`" and „die Tafel ist die Karte" are free, and they are the
whole nesting story for slice 1.** A place with no geometry is a first-class citizen; a node renders
as its children, its doors and its breadcrumb, in a list; **a `Karte` is an enhancement.** Nested
containment therefore ships with **zero Pixi, zero tile pyramid, zero renderer, zero art and zero
commissions** — the same €0 property that made *„der Ortsleger, nur als Leser"* the version I could
not break last round, arriving independently from the other direction. And it is grounded in
observation, not argument: **187 of 190 markers have no article; Andaria has a 67.1-megapixel map, 190
pins, 16 factions and no article; and Andaria is not a marker on Andaria's own map.**

**6.4 · Foundry's own history is the strongest empirical support for doing this now.** `dnd5e` issue
**#729** *"Native item container support"* — opened **2020-10-23**, closed **2024-01-31**: **three
years, three months, eight days.** Issue **#2782**, *"Users lack permissions to update containers
nested within their sheets"* — opened **2024-02-01, one day later.** **The most-installed system on
the leading VTT took three years to retrofit containment and produced a permission defect on nested
contents within twenty-four hours.** That is Kaya's migration rule with a date on it, and it is why I
am attacking the round's execution rather than its premise.

**6.5 · RB-21c is the best brief in this round and both of its CRITICALs are correct.** 179 of 337
charges are non-commercial; TinyMCE 7.1.0 is GPLv2-or-later and is **live**, not dead. Both cost ~0
today. Both are unrecoverable later, and Athena's reason is unanswerable: **you cannot ask a file
retroactively where it came from.** I add a third to her list — the vendored jQuery (§4.2) — and I
endorse her recommendation without reservation: **take `src/` and the export paths; leave `public/`
on the floor.**

**6.6 · The `Weltkeim` measurement is the round's best money-saving finding.** Same seed, canvas
1280×720 → 1600×900: **0 of 664 burgs keep `(id, name)`; 8 of 664 names survive at all (1.2 %); 1 of
25 state names survives.** A seed alone is not a re-derivation key. Storing
`generator|version|seed|canonical(options)` is **~100 bytes**, and the containment projection of a
whole generated world is **21 KB gzipped** against a 2.5 MB export of which **50.6 % is a trade
simulation log we would never read.** That is one struct, decided now, that prevents a class of
migration outright.

### 6.7 · And the version I cannot break

> **„Die Hülle, ohne Leinwand" — the containment edge, the anchor and the projection, in slice 1,
> with no map, no generator embedded and no item physics.**
>
> `Ort` as a facet of `Entry` (one id) · `raum_eltern_id` as **one** spatial parent · `Bezug` as a
> typed, dated multigraph that **never implies visibility** · `Anker` as a row per `(Karte, Ort)` with
> `ohne` as a first-class value · **R-P1 / R-P2 / R-P3** · `Bezug.von_jahr`/`bis_jahr` · the Outline
> recipe as the map · **`Ding` deferred entirely, `Fassung` deferred entirely, generation deferred to
> import-only.**
>
> I attacked it on all five fronts and it does not break:
> - **The nesting:** it is a column and a table, not an abstraction the GM must learn. With an
>   `Unverortet` root (§1.2) the 21:00 case costs one row and no decision.
> - **The one mechanism:** possession is not in it, so §2.1's contradiction cannot arise; the
>   encumbrance leak (§2.2) cannot arise because there is no weight.
> - **The doors:** it makes no claim it cannot support. Containment orders one door in seven, and
>   without generation there is no explosion to defuse — the 2.6× multiplication in §3.2 never
>   happens.
> - **The dependency:** **zero.** No fork, no vendored bundle, no `public/`, no jQuery, no CRITICALs.
> - **The arithmetic:** it is the schema and the rules, which RB-21a says are *"a schema and a set of
>   rules"* whose incremental cost against work already ledgered is not established — **and `S-R1 ·
>   Die Hülle` is one day and settles it on the stakeholder's own 73 articles and 190 markers, with a
>   falsifier written before it runs.**
>
> It also does the one thing RB-18 §1.7 said nothing in this project does: **it converts an estimated
> day into a measured one, on real data, before a line of renderer exists.**

---

## 7. The warning, with the route attached

> **The warning.** Three briefs specified three incompatible schemas for the most irreversible object
> in the product, on the same day, each declaring its own version irreversible — a DAG and two
> forests, two different primary boundaries, two depth caps (8 and 24), and two mutually
> unimplementable answers to where a character stands. Run RB-21d's record through RB-21a's own
> permission rule and you get RB-21a's own measured leak: **89 % of a world's secret organisations,
> disclosed by construction.** The priced part of the round is **45.5 developer-days**, which lands
> the ledger at **≈339–351** — within two days of the map editor the crew declined this morning, and
> the same **month 26** of a **24–33-month** runway — while the round's two load-bearing lines, the
> map-half schema and the licence remediation, **carry no price at all.** The cheapest recommended
> path ships, by default, both of Athena's CRITICALs plus a 2016 jQuery with three published CVEs,
> and prices the remedy at one day in a table about determinism. **And `S-P1` — two days, on which
> the round's second-largest line explicitly depends — has still not run, for a sixth round, in a
> project that still has no git repository.**

**The route, in the order the evidence supports. None of it shrinks the ambition; it orders it.**

1. **Apollon rules the schema before anything else in round 7.** Not a synthesis — a ruling, by name,
   on: (a) one spatial parent or a typed parent list; (b) which edge kinds imply visibility;
   (c) `Ort`/`Ding` or `Knoten`/`Posten` — the primary boundary is drawn in two different places and
   both are declared irreversible; (d) is an actor a node in the tree; (e) one depth constant.
   **Dissent goes into the lineage under RB-21a's and RB-21d's own names. It is never averaged.**
2. **Run `S-P1` — two days — before round 7 forges anything.** RB-18 route item 1, RB-20e route item
   1, now overdue by two full rounds past the crew's own tripwire, and now named a *hard
   precondition* by a third independent brief. There is no argument left.
3. **Run `S-R1 · Die Hülle` — one day.** Real corpus, real counts, a falsifier written first
   (*"more than one root per world, or one genuinely ambiguous parent a human cannot resolve in ten
   seconds, and the tree ruling is wrong"*). It is the cheapest calibration artifact left in the
   project and it needs no canvas.
4. **Build §6.7 — die Hülle ohne Leinwand — and nothing else from this round.** Defer `Ding`,
   `Fassung`, `die Durchsuchung`, `die Verbundlast`, the generator embed and the item physics until
   `S-P1` is green. RB-21b's own note says its `Sicht` line is unbounded until then; building on an
   unbounded line is how a 5 becomes a 20.
5. **Adopt RB-21c's two gates now — „Saubere Tüte" and „Vollständige Nennung" — and add a third:
   a CVE scan of every vendored third-party file in the shipping tree.** All three cost ~0 today and
   are unrecoverable later. Add the jQuery finding (§4.2) to RB-21c's ledger by name.
6. **Correct two claims before a reviewer does.** (a) **„Containment orders one door in seven"** —
   not *"a large share"*; RB-21b §1.4 must be corrected against RB-21a §6.1, and RB-21a's own
   116/113 discrepancy fixed. (b) **Nested maps are parity, not novelty** — LegendKeeper ships
   *"nest your maps indefinitely, zoom from continents to crypts"* and publishes a tutorial for it.
   **The projection down the nesting is the fusion. The nesting is the price of admission.**
7. **Add the `Unverortet` root** (§1.2). One row. It is the entire 21:00 case.
8. **Adopt the three gates I have now demanded across three briefs** — *Erststundenbudget*,
   the deprecation rule, *die Bilderregel*. This round added ≈35 named concepts and ≈11 gates and
   retired nothing, and there is still not one gate in the corpus that can go red because the product
   got bigger.
9. **If and only if 2–5 are green**, price the item half at **28→34** against the ledger it actually
   lands on, and let Kaya decide with the real number in front of him. He is entitled to spend it.
   He is not entitled to spend it believing this round was free because three briefs each priced
   only their own third.

---

## 8. What could not be established

Recorded so no future round launders an absence into a fact.

1. **PostgreSQL costs for anything in RB-21a §7.2.** Every figure is Node in-memory; a recursive CTE
   with `CYCLE` over a real index is slower by a constant nobody measured. Carried unchanged from
   RB-21a §9.1. **No reliable figure found.**
2. **Whether entity ids survive an FMG version bump.** RB-21d's own highest-variance unknown,
   untested, and it decides whether `Nachrechnen` over a generated world is a promise we can keep
   (§4.3). **No reliable figure found.**
3. **The built size of FMG's `dist/` after Athena's strip**, and therefore what Shape B1 adds to an
   Electron binary **per pinned version**. I did not build it. `public/` is 21.49 MB before the strip;
   `src/index.html` alone is 654,014 bytes. **No reliable figure found.**
4. **What the map-half containment model costs.** Priced nowhere in the round, deliberately
   (RB-21a §9 item 10). The 45.5 days in §5.1 is a **floor**, not an estimate.
5. **What RB-21c's remediation costs** — mirror, strip, whitelist, notices generator, self-hosted
   fonts, two CI gates. Athena prices only the TinyMCE deletion, at ~0. **No reliable figure found.**
6. **Whether any GM wants nested containment.** Zero demand measurements in either direction, in this
   round or any prior one. RB-20e §7.1 carried the same gap; it is **unchanged**, and it is now
   carrying 45.5 days instead of 65.
7. **LegendKeeper's nesting model** — tree or DAG, cycle handling, depth limit, and whether nested
   maps carry per-character visibility. Their marketing states the feature and a tutorial exists, so
   **the feature ships**; the permission model behind it is vendor silence, exactly as RB-21a and
   RB-21d both recorded. **No reliable figure found**, and the claim *"the projection is our
   differentiator"* rests on their **permission** wording, which is explicit, not on their nesting
   model, which is not.
8. **Whether the encumbrance subtraction in §2.2 is reachable in a real implementation.** I read the
   specifications; nothing is built; there is no code to run. Flagged as a specification defect, not
   an observed one — the same standard RB-21b applied to PF2e's accumulator.
9. **Whether jQuery 3.1.1's CVEs are reachable through FMG's own code paths.** I established the
   version, the live `<script>` tag and the published CVE ranges. **I did not audit FMG's ~34,000
   lines of `public/**/*.js` for an exploitable `.html()` sink.** The finding is that nobody looked,
   not that an exploit exists.

---

## 9. Sources

**Internal, and every computation is checkable against these files:**
`design/research/RB-21a-verschachtelung.md` §1.1–§1.4, §2.1–§2.3, §3.1–§3.5, §4.1–§4.3, §5.1–§5.4,
§6.1–§6.4, §7.1–§7.4, §8, §9 ·
`RB-21b-inventar.md` §1.1–§1.4, §2.1–§2.6, §3, §4.1–§4.6, §5, §6, §7.1–§7.3, §8 ·
`RB-21c-lizenz-und-risiko.md` §1.1–§1.4, §2.1–§2.6, §3.1–§3.5, §4.1–§4.3, §6, §7.1–§7.4, §8 ·
`RB-21d-erzeugung-je-ebene.md` §0.1, §1, §2.1–§2.3, §3.1–§3.4, §4.1–§4.4, §5.1–§5.4, §6.1–§6.3,
§7.1–§7.4, §8, §9 ·
`RB-18-widerspruch.md` §1.1–§1.7, §2.5, §3.3, §3.4, §4.2, §4.4 (binding, not contradicted) ·
`RB-20e-widerspruch.md` §1.3–§1.6, §4.3, §5.6, §7 (binding, not contradicted) ·
`RB-12-eron-uebernahme.md` §5.3–§5.5 · `RB-16-friedhof.md` §1.3, R7 · `RB-11` ·
`design/iterations/CHAMPION.md` §4.9, §6, §9.2, §12.4, §15.9 · `design/00-intake.md`.

**Measured by me, today, 2026-07-27 — every command shown so it can be re-run:**

- `ls design/spikes/` → **five spikes** (`A-passage-identity`, `B-w1`, `B-wiederkehr`, `G-keim`,
  `K-kartenmass`); **no `S-P1`.** `git log` at the project root → **`fatal: not a git repository`.**
- `curl https://raw.githubusercontent.com/Azgaar/Fantasy-Map-Generator/master/vite.config.ts` →
  **`publicDir: '../public'`**, `build.outDir: '../dist'` — Vite copies all of `public/` into `dist/`
  verbatim.
- `curl https://api.github.com/repos/Azgaar/Fantasy-Map-Generator/contents/public/libs` →
  **`jquery-3.1.1.min.js` 86,709 B · `jquery-ui.min.js` 108,235 B · `jquery.ui.touch-punch.min.js`
  1,291 B · `openwidget.min.js` 829 B · `tinymce/` present · `three.min.js` 623,573 B ·
  `dropbox-sdk.min.js` 40,598 B.**
- `curl .../master/src/index.html` → **654,014 bytes**; grep for `libs/` script and link tags →
  **12**, including a live **`<script src="libs/jquery-3.1.1.min.js">`.** (Corroborates RB-21c's
  638.7 KB figure exactly: 654,014 B = 638.7 KiB.)
- `curl .../master/package.json` → `"version": "1.138.2"`, `"license": "MIT"`.
- Door arithmetic in §3.2 [computed] from RB-12's 689/1,253, RB-21a's 69/182/18 and RB-21d's
  1,093 distinct, against CHAMPION §4.9's ≈5 Vollmachten/week.
- Ledger arithmetic in §5.1 [computed] from RB-18 §1.3, RB-20b §8, RB-21b §7.1, RB-21d §5.1–§5.2.

**External, retrieved 2026-07-27:**

- [NVD — CVE-2020-11022](https://nvd.nist.gov/vuln/detail/cve-2020-11022) and
  [CVE-2020-11023](https://nvd.nist.gov/vuln/detail/cve-2020-11023) — XSS in jQuery
  **`>=1.0.3, <3.5.0`**, patched in 3.5.0 · CVE-2019-11358 (`$.extend` prototype pollution,
  **`<3.4.0`**), via
  [IBM security bulletin](https://www.ibm.com/support/pages/security-bulletin-api-connect-vulnerable-jquery-cross-site-scripting-xss-and-other-vulnerabilities-cve-2012-6708-cve-2015-9251-cve-2019-11358-cve-2020-11022-cve-2020-11023)
  and [HeroDevs' CVE-2020-11022 entry](https://www.herodevs.com/vulnerability-directory/cve-2020-11022)
- [LegendKeeper](https://www.legendkeeper.com/) and
  [Make detailed Maps](https://www.legendkeeper.com/features-maps/) — *"nest your maps indefinitely,
  zoom from continents to crypts, and link every landmark to its wiki page"*; infinite nesting, 14K
  images [Herstellerangabe] · [*World-building with LegendKeeper: Nesting maps with the
  Atlas*](https://www.youtube.com/watch?v=pGQPfY_kJ_c) — a published tutorial, i.e. the feature ships
  and is documented, not merely marketed · [AlternativeTo —
  LegendKeeper](https://alternativeto.net/software/legendkeeper/about/)

*(Figures on Azgaar's repository metadata and licence, the 337 charges, the 23 textures, TinyMCE
7.1.0, Watabou's licensing, Foundry `dnd5e` #729/#2782, NetHack, PF2e, Roll20, Fantasy Grounds,
Realm Works, Let's Role, Dungeon Alchemist and Inkarnate are carried from RB-21a/b/c/d and
RB-16/17/20a–e with their original attributions and are not re-derived here.)*

---

*RB-21e. Er hat recht, und das ist das Teure daran. Das, was sich verschachtelt, ist nicht die Karte
und nicht der Beutel — es ist die **Kante**, eine einzige Spalte, die ein Kontinent und eine
Kupfermünze gleichermaßen tragen. Aber drei Schreiber haben an einem Tag drei Schemata für dieselbe
unumkehrbare Sache geschrieben, und jeder nannte seines unumkehrbar. Man kann nicht maximal bauen,
was man dreifach gedacht hat. Die Zahl ist wieder Monat sechsundzwanzig — dieselbe Zahl, die heute
Mittag den Karteneditor gekostet hätte, nur mit einem besseren Verhältnis und einer schlechteren
Buchführung. Und der Ring, auf dem alles steht, liegt seit sechs Runden ungeprüft da: zwei Tage,
mehr nicht.*

> *Ein Baum, ein Wald, ein Netz — drei Antworten, ein Tag,*
> *und jede trug den Satz: „dies lässt sich nie mehr wenden."*
> *Wer dreimal maximal baut, baut dreimal falsch.*
> *Erst richte, dann verschachtle — und miss zuvor den Ring.*
