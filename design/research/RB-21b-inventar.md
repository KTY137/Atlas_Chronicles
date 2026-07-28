# RB-21b — Das Enthaltensein: eine Relation für Karten und Inventar

**Hephaistos, der Schmied · 2026-07-27 · the item half of Kaya's nested-everything proposal.**

Twin of the map half. The question this brief answers is not *"how do we build inventories"* — it is
**whether a chest-in-a-room and a city-in-a-region are the same relation**, and if they are, where
exactly the sameness stops. A containment model is the most irreversible object in this product;
Kaya's own rule for irreversible things is binding (*„die Migration kostet am meisten — deswegen
sollte man von vornherein den extremsten, besten, aufwendigsten Pfad gehen"*), so it is designed
maximally, once, now, and it is designed cheap exactly where a named boundary makes replacement
possible.

---

## 0. Method, and what every number below is worth

- **Read code, not blog posts.** Every claim about Foundry's `dnd5e`, Foundry's `pf2e` and NetHack
  below was verified against the actual source, downloaded today, with line references. Where I read
  a defect, I say I read it and did not run it.
- **`[gelesen]`** = I have the file. **`[gemeldet]`** = user reports / issue threads, not vendor
  documentation. **`[keine belastbare Zahl gefunden]`** = exactly that, and I did not invent one.
- **Nothing here re-opens a ruled question.** The runtime is pinned by
  [`RB-11`](RB-11-steam-vs-browser-verdict.md): React/TS + PixiJS, DOM-authoritative, canvas behind
  `MapRenderer`, browser + Electron. No game engine. Where the instinct behind *"or Unity"* is right —
  Kaya wants real editor tooling, not a toy — the answer is on the pinned stack and it is already
  priced: [`RB-20b §8`](RB-20b-machbarkeit.md) buys *der Ortsleger* for 21 days of new work.
- **The arithmetic discipline is Nemesis's** ([`RB-18`](RB-18-widerspruch.md), binding): every day
  count carries RB-18 §6.3's restored 20 % contingency, no line is quoted without its table, and the
  unit — *"one developer with an AI crew"* days — is still uncalibrated and said so.

---

## 1. The ruling, up front

> **One relation. Two specialisations. Both boundaries are single predicates, and neither of them is
> „Ort vs. Gegenstand".**

**Yes, a chest-in-a-room and a city-in-a-region are the same relation** — and the reason is not
aesthetic. It is that the four things this product actually does with containment are identical in
both cases:

1. **Projection.** *"What is at this node, for this reader, right now"* is one query and one
   permission rule. `Sicht` does not care whether the children are streets or coins.
2. **Ordering of doors.** Kaya's second consequence is real and it holds: **a door is only live at
   the level you are standing on.** RB-12 measured the honest scale — **1 253 red edges, 689 distinct
   missing pages, 9.4 doors per written article, 77 doors in the worst single passage**
   ([`RB-12 §5.3`](RB-12-eron-uebernahme.md)). Containment supplies the ordering that triage alone
   could not: not 113 tier-1 doors at once, but the four in this room and the two in this crate.
   §1.4 tests this claim properly, because it is the one that would be embarrassing to accept on
   enthusiasm.
3. **Provenance and mint.** A place becomes an article by being opened; an item becomes an article by
   being opened. Same gesture, same `Augenblick`, same weekday on the footnote.
4. **Reachability.** *"Can this character get at that thing"* is a path comparison, and both halves
   need it.

**Where they genuinely diverge, they diverge at two named predicates and nowhere else:**

| | Boundary | Predicate | Places | Items |
|---|---|---|---|---|
| **A** | **Identity** | is the held thing a `Knoten` (addressable) or a `Posten` (a measure)? | always `Knoten` | either — `Die Fackel des Remus Paradon` is a `Knoten`, `3 Fackeln` is a `Posten` |
| **B** | **Physics** | does the holding node carry a `Fassung` (capacity + weight rule)? | `NULL` in slice 1 | present on containers, absent on a table-top |

Everything else — the edge, the path, the projection, the mint, the export — is one mechanism, and
a region costs exactly zero for the item half's machinery because `Fassung IS NULL` short-circuits
all of it.

**And the third thing Kaya's sentence implies, which I am refusing:**

> **It is not a DAG. Containment is a forest; everything that wanted a second parent was never
> containment.**

A road does not *sit inside* two regions, it **traverses** them. An underdark is not *inside* the
continent, it lies **beneath** it. A portal is not containment at all, it is **adjacency at a
distance**. A party stash accessible to four characters is not *in four places*, it is **one place
with four grants**. Each of those is a real relation and each gets a labelled edge in
`Nebenkante` — which carries no capacity, no weight rollup and no permission inheritance.

**The argument that makes this a ruling rather than a preference:** *capacity and weight are only
definable on a tree.* If a thing has two parents, *"how heavy is this bag"* has no answer without a
convention, and every convention double-counts or arbitrarily halves. So the DAG must be refused
**precisely where the physics lives**, and it may be permitted everywhere else, where it costs
nothing. This is `Mēden agan` doing real work: the expensive generality is bought only for the half
that cannot function without it.

### 1.1 The schema, in full, nothing hidden

```text
Knoten (id, campaign_id, art ∈ Ort | Behälter | Akteur | Szene | Universum,
        eltern_id NULL,                    -- exactly one parent. NULL = a root.
        pfad ID[],                         -- materialised ancestor path, root-first, maintained in-transaction
        tiefe int,                         -- = len(pfad); CHECK (tiefe <= MAX_TIEFE)
        vorlage_ref (template_id, revision) NULL,   -- §3
        entry_id NULL,                     -- the wiki article, IF this node was ever promoted
        eigengewicht bigint,               -- integer, in the package's smallest declared unit
        zustand jsonb,                     -- verschlossen, versiegelt, brennt, …
        CHECK (NOT (pfad @> ARRAY[id]))    -- the loop is unrepresentable, not merely discouraged
       )

Posten (id, in_knoten_id NOT NULL, vorlage_ref (template_id, revision) NOT NULL,
        anzahl bigint CHECK (anzahl > 0), zustand_hash,  -- the stack key
        platz jsonb NULL                   -- opaque slot/grid blob. Unused in slice 1. §7.3.
       )

Fassung (knoten_id PK,
         kapazitaet_stueck NULL, kapazitaet_gewicht NULL, kapazitaet_volumen NULL,
         gewichts_regel ∈ voll | anteil(p) | pauschal(w) | keine,
         durchsetzung ∈ hart | weich | keine  DEFAULT weich)

Nebenkante (von_knoten, nach_knoten, art ∈ grenzt_an | portal | liegt_unter | verläuft_durch
                                          | teil_von_auch | anker(scene_id, x, y))
Zugriff    (knoten_id, actor_id, art ∈ lesen | nehmen | legen, gewährt_von, gewährt_at)
```

Five tables. `Nebenkante` and `Zugriff` are where every hard case in the brief's own list goes, and
neither of them touches the rollup.

**`pfad` is load-bearing three times, which is why it is stored rather than walked:**

| Use | Query | Replaces |
|---|---|---|
| Cycle prevention | `ziel.pfad @> ARRAY[bewegtes.id]` | a recursive walk in a drop handler |
| Rollup / contents | `WHERE pfad @> ARRAY[knoten]` — one indexed query, no N+1 | Foundry's `reduce` over every item the actor owns |
| Reachability | longest common prefix of two `pfad`s | a bespoke distance rule |

It pays for itself three times and costs one array column and one trigger. That is the shape of a
maximal decision that is also a cheap one.

### 1.2 Where the specialisation begins — boundary A, `Knoten` vs `Posten`

This is the same rule [`RB-20b §1`](RB-20b-machbarkeit.md) already ruled for the map half, in a
second domain, and I am deliberately not inventing a second rule:

> *"A stamp is anonymous and cheap. Promotion is an explicit, separate act."*
> *"The trap: making the stamp the entity. If every tree is a row in the knowledge graph, then
> dragging a forest writes 400 wiki mutations… die Herkunftsschicht becomes a log of somebody
> rearranging shrubbery."*

**Verbatim true of items, and worse**, because items move an order of magnitude more often than
stamps. A `Posten` has no id worth citing, no article, no history, and cannot be a parent. `47 Pfeile`
is a *measure*, not forty-seven members. **`die Erhebung`** promotes a `Posten` of count 1 into a
`Knoten` — and the gesture that does it is the mint gesture, not a separate one (§6, beat 9).
Demotion is permitted only while the `Knoten` has no history at all (no `Revelation`, no citation, no
minted passage, no `Augenblick`) — after that it is refused, because the alternative is a footnote
pointing at nothing.

**The consequence that makes this boundary right rather than merely tidy:** a warehouse with four
hundred crates is four hundred `Knoten` with `entry_id IS NULL` and no article, no provenance chip
and no door — until a human opens one. Generation ([`RB-20d §4.3`](RB-20d-erzeugung.md), *die
Türsaat*) can therefore manufacture inventory at scale for the same reason it can manufacture places
at scale: **nothing it emits is canon and nothing it emits is prose.**

### 1.3 Where the specialisation begins — boundary B, `Fassung`

`Fassung IS NULL` ⇒ no capacity, no weight, no rollup, no enforcement. A region has none. A
tavern's common room has none. A backpack has one. **`gewichts_regel` is the entire physics, and it
is four constructors that cover every system in the corpus:**

```text
w(n) = eigengewicht(n) + f_n( Σ_{c ∈ kinder(n)} w(c) )

f = voll        → identity          a sack, a crate, a room
f = anteil(p)   → x·p               NetHack's bag of holding (p = ½ / ¼ / 2 by BUC)
f = pauschal(w) → w                 D&D 5e's bag of holding (contents weigh a flat 15 lb)
f = keine       → 0                 an extradimensional space the system says is free
```

Four lines, one recursive definition, and it reproduces NetHack's arithmetic, D&D 5e's, Pathfinder
2e's and Fantasy Grounds' desired-but-unimplemented behaviour without a branch anywhere in the
engine. **The rule is data in the rule package, never code** — invariant, `00-intake.md` source A:
rule packages are declarative and versioned, never arbitrary code execution.

**Two things I take from Pathfinder 2e's implementation because they are load-bearing and non-obvious
(§4.2):**

- The discount is **cancelled by overfilling** (`isOverfilled`) — an over-capacity bag of holding
  weighs its contents. That turns capacity enforcement from a modal dialog into a mechanical
  consequence, which is the only kind of enforcement a table does not disable.
- The discount is **cancelled by nesting** (`extradimensionalParadox`) — see §2.1, where this becomes
  the ruling.

**Enforcement defaults to `weich`.** Over-capacity is a *state*, not a rejected write. A GM moving
forty items in a hurry must never be blocked by arithmetic; every product that blocks her ends with
the table switching encumbrance off, which loses the data entirely.

### 1.4 Testing Kaya's second consequence — do doors actually get ordered?

The claim: *containment gives doors a natural ordering; not 1 253 doors, the four in this room.*
It is the most attractive claim in the brief and therefore the one to attack.

**It holds, partially, and the part it does not cover is nameable.** Against the real corpus:

| Door population (RB-12 §5.3–§5.4) | Count | Does containment order it? |
|---|---:|---|
| Doors that are **places** (`Blattheim` 14 incoming, `Nördliche Minenreiche` 16, `Königreich Terabur` 13, `Andaria` 15) | a large share of the 113 tier-1 doors | **Yes.** A place door is live when you stand in its parent. This is exactly the ordering claimed. |
| Doors that are **things** (`Andarisch` 18 — a *language*; `Remus Paradon II.` 13 — a *person*; `Magie`, `Kaiser`) | the rest | **No.** A language is not in a room. A dead emperor is not in a chest. Containment says nothing. |
| Doors inside **infobox rows** — 414 red of 627, 66.0 % | 21 % of all doors | **Partially.** An infobox row is a *property*, and a property is not contained by anything. |

**Ruling:** containment orders the **spatial** doors and is silent on the **conceptual** ones. That is
still a large and real win — it is the difference between a wiki that hands a GM 113 equally-loud
doors and one that hands her the four she is standing next to — but the sentence *"containment
defuses the doors problem"* is **half true and must be written down as half true.** The other half
(languages, persons, concepts, abstractions) is still governed by RB-12 §5.4's demand-triage and is
still, in that brief's own words, *„unsolved, named, and it belongs to the next round."* This brief
does not solve it and does not pretend to.

---

## 2. The known traps, solved concretely

### 2.1 Containment cycles — and the correction that makes the rest of this section possible

**The single most important sentence in this brief:**

> **The bag of holding inside the bag of holding is not a cycle.** It is a perfectly well-formed
> tree that violates a *game rule*. Conflating the two is why every implementation in §4 has a
> mechanism that is either too weak (it cannot express the rule) or too violent (it destroys data to
> enforce it).

Two entirely separate mechanisms, at two different layers:

**(a) `Die Schleifenwacht` — structural, in the database, no override, ever.**

A cycle means data with no root: an orphan set that no traversal terminates on, that no rollup can
compute, that no export can serialise and that no permission projection can resolve. It is not a rule
violation, it is corruption. Therefore:

- `eltern_id` is a single column. There is no second-parent to conflict with.
- `pfad` is maintained in the same transaction as any move, by one trigger, at one site.
- `CHECK (NOT (pfad @> ARRAY[id]))` plus a `BEFORE UPDATE` trigger that recomputes the subtree's
  paths and raises on containment. The cycle check is an indexed array containment, not a walk.
- `MAX_TIEFE = 24`. **Not a rule — a bound**, on path storage (≤24 ids ≈ 400 B) and on rollup fan-in.
  Kaya's own chain (`Universum → Kontinent → Region → Reich → Provinz → Stadt → Viertel → Gebäude →
  Stockwerk → Raum → Truhe → Beutel → Münze`) is 13; Foundry's `MAX_DEPTH = 5` **[gelesen —
  `module/data/item/templates/physical-item.mjs:52`]** would refuse Kaya's sentence at *Raum*, which
  is precisely what happens when a depth cap is invented for an item-only model and later asked to
  carry places.
- **There is no code path that can create a cycle**, because there is no code path — the constraint
  is below the application. This is the lineage's own house style (*"unrepresentability, not policy"*,
  CHAMPION §6) and §4.1 is the evidence for why it matters.

**(b) `Die Verschachtelungsregel` — declarative, in the rule package, per system, GM-overridable.**

One new predicate in the package format, and it is data:

```text
verschachtelung(träger_merkmal, inhalt_merkmal) → erlaubt | verboten | folge(<effekt-ref>)
```

| System | Declaration | Result |
|---|---|---|
| default (system-agnostic core) | `verschachtelung(*, *) = erlaubt` | nesting is normal |
| D&D 5e-shaped package | `verschachtelung(extradimensional, extradimensional) = folge(beutel_riss)` | the rupture, as an existing declarative effect |
| NetHack-shaped | `= folge(explosion)` | the same mechanism, different content |
| Pathfinder 2e-shaped | `= erlaubt`, and `gewichts_regel` yields identity when an extradimensional ancestor exists | the discount silently stops — §1.3 |
| Minecraft-shaped | `= verboten` | refused at the boundary, with a named error |

`folge(<effekt-ref>)` points at an effect the package already declares. **No new execution surface**
— the invariant that rule packages never execute code survives untouched, which is the whole reason
this is a predicate and not a hook.

**The GM can always override, and the override is audited.** `Mēden agan`: a refusal a GM cannot
override is worked around by renaming the item, and then the model is lying instead of merely
permissive. Every override writes an append-only `AuditEntry` with a mandatory reason
(`02-domain-model.md` refinement 5).

**What the player who does it deliberately gets:** a real answer, at the table, from the rule the
GM's package declares — not a shrug from the software and not a silent success that quietly breaks
the encumbrance number three sessions later.

### 2.2 Capacity and weight propagation

**The trap, measured in the most battle-tested containment implementation in existence.** NetHack
caches each object's weight in `obj->owt`, recomputes it recursively in `weight()`, and invalidates
by hand:

- **76 occurrences of `owt = weight(…)` across 27 source files** in the NetHack-3.6 tree **[gemessen
  — `grep -rn "owt = weight(" src/*.c include/*.h`, 5.58 MB tarball, today]**.
- **`add_to_container()` — the insertion primitive itself — does not update the container's weight.**
  **[gelesen — `src/mkobj.c`]** Every one of the 15 call sites must remember.

That is the canonical failure mode of a denormalised rollup, and it is not a criticism of NetHack; it
is what happens to *anyone* who caches a tree aggregate with manual invalidation.

**Our rule:**

> **Weight is never stored. It is derived, from one query, at one site — and a CI gate diffs the
> cache against the recomputation.**

- **Truth:** `SELECT … WHERE pfad @> ARRAY[knoten]` — the entire subtree in one indexed query, no
  recursion in the application, no N+1. Fold `gewichts_regel` bottom-up over the returned rows.
- **Cache:** a rollup column maintained by the **same trigger** that maintains `pfad`. **One
  invalidation site in the entire product**, not 76.
- **Gate „Die Waage stimmt"** (new `oracles.yaml` row): for every container in the acceptance
  fixture, cached rollup equals recomputed rollup **byte-identically**, after a 3 000-operation fuzz
  of moves, splits, merges, promotions and deletes. This is deliberately the same shape as
  `spike-A-passage-identity`'s 3 000-op fuzz — the one measured artifact this lineage owns — and it
  reuses its harness rather than inventing a second one.
- **Integers only.** `eigengewicht` is a `bigint` in the package's smallest declared unit; money is an
  integer in the smallest denomination. A rollup that must replay byte-identically across
  Windows/macOS/Linux under locale `tr-TR` (gate **Nachgerechnet**, CHAMPION §12.4) cannot contain a
  float sum, and this is the second place in the product where that gate's determinism requirement
  bites. `0.1 + 0.2` in a container rollup is exactly the bug **Nachgerechnet** exists to catch, one
  domain over.
- **All three capacity dimensions are enforced if set.** Foundry's `computeCapacity` checks `count`
  first and **silently ignores a weight capacity when a count capacity exists** **[gelesen —
  `module/data/item/container.mjs:234–248`]**. We do not copy that; a bag with both limits has both.

### 2.3 Stacking and splitting

- A `Posten` is `(vorlage_ref, anzahl, zustand_hash)`. Two `Posten` merge **iff** identical
  `vorlage_ref` *including revision* (§3), identical `zustand_hash`, identical holder.
- **Merge happens on insertion, server-side, in the same transaction** — NetHack's `merged()` inside
  `add_to_container` is the right instinct and the right place **[gelesen]**.
- **Splitting is a two-phase idempotent gesture**, the same state machine as *der ausstehende Wurf*
  (CHAMPION §7.7). A split under connection loss must never yield 47 + 47. This is not paranoia: it
  is the exact seam the brief's own network-partition discipline already requires elsewhere, and
  inventory is where a table will hit it weekly rather than yearly.
- **Concurrent take.** Two players take the last potion. Conditional decrement
  (`UPDATE … SET anzahl = anzahl − n WHERE id = ? AND anzahl >= n`); the loser receives a refusal
  *with the current count*, never a stale optimistic UI that has to be walked back. Trivial, and the
  single most common live-session inventory bug in every product in §4.

**The container-stack rule, which is ours and is better than the prior art's:**

Both Foundry systems forbid containers from stacking outright — `quantity: new NumberField({min: 1,
max: 1})` **[gelesen — `container.mjs:61`]**; `isStackableWith(): return false` with the comment
*"Containers never stack, otherwise their contents can have strange results"* **[gelesen —
`pf2e/src/module/item/container/document.ts`]**. Both are right about the danger and both overpay:
a merchant selling twenty empty sacks now has twenty rows.

> **Rule: a container `Posten` with `anzahl > 1` must be empty. Putting anything into one splits the
> stack — `anzahl − 1` remains a `Posten`, one is promoted to a `Knoten` and receives the child.**

One line in the insert handler, and the ambiguity the prior art feared is structurally impossible:
a stack never has contents, because the moment it would, it is no longer a stack. This is boundary A
(§1.2) doing exactly the work it was drawn for.

### 2.4 A container whose contents are unknown to the holder

Falls straight out of `Sicht`, with one genuinely new obligation. Three states of a node for a reader:

| State | The client receives |
|---|---|
| `unsichtbar` | **nothing.** The node is not in the payload. Byte-identical to a reader with no campaign. |
| `verzeichnet` | id, projected name, **and nothing else**: no child ids, no count, no array length, no weight breakdown, no shape. |
| `geöffnet` | the projected children — each of which is itself in one of these three states, recursively. |

**The numeric leak nobody in the corpus has named, and it is real:** if you carry a sealed chest, and
the client renders your encumbrance, and encumbrance is a sum the client performs, then **the
encumbrance number leaks the weight of contents you cannot see.** A player subtracts, and knows the
chest holds eleven pounds of something.

> **`Die Verbundlast`: encumbrance is a single scalar composed by the server. The client never sums.**
> The payload carries the number, never the addends.

Gate: **remove every child from a player payload and the printed encumbrance is unchanged.** This is
the same construction as gate *„Kein Strom"* (CHAMPION §5.2) — a property that a leaky implementation
cannot accidentally satisfy. It is also, as far as I can find, **the first numeric obligation ever
placed on `Sicht`**, which has been grafted forward unbuilt for four rounds (CHAMPION §2, §15.10).
That is a cost, not a feature, and it is charged in §7.

**And the honest tell, stated rather than hidden:** the *total weight* of a sealed container's
contents is itself information. If the GM wants *"it feels heavy"*, she sets
`gewichts_regel = pauschal(w)` on the sealed node with a `w` she chooses. Otherwise the sealed node
contributes only its `eigengewicht`, and the change on reveal is a tell. **There is no third option**,
and pretending otherwise is how a permission model acquires a hole. Named, in the honest-gap chip
grammar the champion already uses.

### 2.5 An item in two places — the shared party stash

**Refused as containment; supplied as a grant.** The stash is one `Knoten` with one parent (the
wagon, the camp, the guild vault). Four characters hold `Zugriff` rows. **Shared access is not shared
containment**, and the distinction is what keeps the rollup well-defined.

The genuinely hard case is the one a table hits in month one: the stash is in the wagon, the wagon is
at the camp, three players are at the camp and one is in town.

```text
erreichbar(actor, knoten) :=
     ∃ Zugriff(knoten, actor, nehmen)
  ∧ longest_common_prefix(actor.pfad, knoten.pfad) is within the package's declared Griffweite
```

A path-prefix comparison. Free, because `pfad` already exists — its **third** use (§1.1). The player
in town *reads* the stash (she holds `lesen`) and cannot *take* from it, and the refusal names the
reason (*„Du bist in Blattheim; der Wagen steht am Lager"*) instead of greying out a button.

### 2.6 The container moves with contents, mid-session

**Free by construction, and this is the strongest single argument for the edge-not-label model.**
Contents reference the container; the container references the place. **The ship sails in one row
update.** Fantasy Grounds' users cannot do this because containment there is a free-text `location`
string (§4.4); Roll20's cannot because there is no containment at all (§4.3).

Two real costs, both named:

1. **Path recompute.** Moving a subtree of N nodes rewrites N `pfad` values —
   `UPDATE … WHERE pfad @> ARRAY[schiff]`, one indexed statement, N rows. **Gate: moving a
   1 000-node subtree completes server-side in ≤50 ms on the reference laptop.** *I have not measured
   this* (§8, spike named).
2. **`Sicht` invalidation.** A ship arriving at Sarn changes reachability for five characters at once,
   which invalidates five cached projections. The map half already pays an analogous bill —
   [`RB-20b §5`](RB-20b-machbarkeit.md) measured incremental fog reveal at **9.4 ms** and
   from-scratch union at 800 revelations at **386 ms** — so the shape of the cost is known and the
   mitigation (incremental, cached, worker, never per-frame) is already ruled. Item-side invalidation
   is cheaper than fog because it is a set membership change, not a polygon boolean.

---

## 3. Invariant 3 under nesting — the template must not reach inside 300 bags

**The threat, concretely.** A `Beutel` template declares `kapazitaet_stueck = 5`. Three hundred
instances exist across nine characters and four warehouses; forty are full. The GM edits the template
to 3. **Do forty bags spill?** And the nastier version: the template declares
`verschachtelung = verboten`, the GM relaxes it to `erlaubt` — and now twelve existing nestings that
were illegal become legal retroactively, or the reverse, and twelve bags become invalid states that
no code path knows how to leave.

**Three rulings, and the third one makes the first two almost unnecessary.**

**(1) An instance binds to a template *revision*, never to a template.**
`vorlage_ref = (template_id, revision)`. This is not new machinery — it is the third application of a
discipline this corpus already runs: `Wurf` freezes a **clause revision**, `Nachrechnen` freezes a
**package pin** (CHAMPION §4.11), and rule-defined documents already store *"package id, package
version, schema type, document version and validation status"* (`02-domain-model.md`, concern 4).
One more use, zero new concepts.

**(2) A template edit creates a revision and mutates nothing.**
Instances keep their revision. The GM gets `die Angleichung` — a reconciliation surface in the exact
`NurLeitung<Differenzkarte>` shape *die Woche* already computes (CHAMPION §5.3), GM-only, therefore
no `Kein Nenner` problem:

```text
„Beutel · Rev. 3 → Rev. 4
  14 Exemplare tragen Rev. 3.
  Rev. 4 senkt die Kapazität von 5 auf 3.
  6 davon liegen über der neuen Grenze.        [ Angleichen ]  [ Auswählen ]  [ Lassen ]"
```

**Nothing moves until a human presses a key.** `Nichts wird automatisch Kanon`, applied to physics.
And note what the surface does *not* offer: there is no "migrate all and fix later." Angleichung with
6 over-capacity instances leaves them **over capacity** (`durchsetzung = weich`, §1.3) — it never
decides which item falls out of a bag. A model that spills a player's belongings because a GM edited
a template has lost the argument.

**(3) The load-bearing one: containment is never stored on a template, therefore a template edit
cannot reshuffle contents — it is unrepresentable.**

A template has no children. It has never had children and there is no column in which children could
be written. Every `Enthalten`/`Posten` row points at **an instance's id**. There is no query a
template edit could issue that would reach a child, because there is no join from `template_id` to a
containment edge that does not go through an instance. **This is invariant 3 expressed as a type
rather than as a rule**, in the lineage's own preferred style, and it is why (1) and (2) are belt and
braces rather than the actual defence.

**The apparent counterexample, and the boundary it forces.** Roll20's users have asked for years for
an *Explorer's Pack* that arrives with its contents **[gemeldet — Roll20 community forums, multiple
threads]**, and that is a legitimate want. It is **not** a template with children. It is:

```text
Bausatz (id, revision, zeilen[ (vorlage_ref, anzahl, in_zeile NULL) ])
```

— a declarative **recipe** that, at instantiation, creates one `Knoten` and N `Posten`, once, by a
human gesture, and is then finished. Editing the recipe never touches what it already built. PF2e
ships exactly this concept and calls it a `kit` **[gelesen — `src/module/item/kit`]**; taking it is
free and naming the boundary is the whole point.

**Gate „Die Vorlage rührt nichts an"** (new `oracles.yaml` row): a fixture with 300 instances of a
container template across 5 revisions and 3 nesting depths; every field of the template is edited in
turn; assert **zero `Posten` rows changed, zero `eltern_id` changed, zero `anzahl` changed**, and
`export → import → diff empty`. Red = invariant 3 is lost, and it is lost in the place where nobody
would look for it.

---

## 4. Prior art, examined — code where code exists

### 4.1 Foundry VTT / `dnd5e` — the reference implementation, and what it costs to retrofit

**Repo:** `foundryvtt/dnd5e`, MIT, **576 stars, 336 forks, 959 open issues**, last push
**2026-07-24** **[gemessen — GitHub REST API, today]**.

**The model** **[gelesen — `module/data/item/container.mjs`, `templates/physical-item.mjs`,
`documents/item.mjs`, `applications/item/container-sheet.mjs`]**:

- Containment is a **child → parent pointer**: `system.container`, a `ForeignDocumentField(BaseItem,
  {idOnly: true})` on every physical item.
- `contents` is computed by **scanning every item the actor owns and filtering**:
  `this.parent.actor.items.reduce((c, item) => item.system.container === this.parent.id ? … )`.
  `allContainedItems` recurses over that. For a world-level container the scan is over `game.items` —
  the entire world directory.
- Capacity: `count | volume | weight`, and `computeCapacity()` **checks count first and ignores a
  weight limit when a count limit is present.**
- The bag of holding is a **boolean**: `properties.has("weightlessContents")` ⇒ `totalWeight` returns
  the container's own weight. No fractional rule, so NetHack's and PF2e's arithmetic are not
  expressible.
- `quantity` is pinned to 1 by a migration that runs on every load (`#migrateQuantity`).
- Deletion: contents are deleted **only if `options.deleteContents`** is set; otherwise every child
  keeps a `system.container` pointing at a document that no longer exists.

**Where it is wrong, and it is the most important lesson in this brief:**

> **The cycle guard lives in the drop handler.**

`_onDropItem` computes `allContainers()` and refuses with `DND5E.ContainerRecursiveError`
**[gelesen — `container-sheet.mjs:239–243`]**. That is a **UI check**. Any module, any macro, any
`Item.update({"system.container": x})`, any compendium import, any undo path bypasses it entirely.
The structural backstop is `MAX_DEPTH = 5` used as a **loop bound inside `allContainers()`'s `while`**
— an infinite-loop guard, not a cycle rejection: with a cycle present the function returns five
wrong ancestors and no error.

**What retrofitting cost, in dates I verified today [gemessen — GitHub issues API]:**

| Event | Date |
|---|---|
| Issue **#729**, *"Native item container support"*, opened | **2020-10-23** |
| Closed / shipped | **2024-01-31** |
| **Elapsed** | **3 years, 3 months, 8 days** |
| Issue **#2782**, *"Users lack permissions to update containers nested within their sheets"* — *"as a player, you do not count as the owner of any container on your sheet, so you cannot in any way move items to or from them"* | **2024-02-01** — **one day later** |

**That is the price of a containment model added after the fact to the most-installed system on the
leading VTT** — and the first follow-on defect was a *permission* defect, on nested contents,
discovered by users within twenty-four hours. It is the strongest empirical support in this corpus
for Kaya's migration rule, and it is why this brief exists before a line of schema is written.

### 4.2 Foundry VTT / `pf2e` — the best containment model in the market, with two defects worth naming

**Repo:** `foundryvtt/pf2e`, **625 stars, 496 forks**, last push **2026-07-26** **[gemessen]**.

**What it gets right, and I am taking all four** **[gelesen —
`src/module/item/container/document.ts`, `helpers.ts`, `src/module/actor/inventory/bulk.ts`]**:

1. **Two kinds of container.** `stowsItems` (`system.stowing`) distinguishes a real container from
   *"merely one of the old pouches/quivers/etc."* — and non-stowing containers are **erased before any
   arithmetic**: `#flattenNonStowing`, commented *"Non-stowing containers are not 'real' and thus
   shouldn't split stack groups."* Without this, `20 Pfeile im Köcher` computes differently from
   `20 Pfeile lose`, which is a bug every naive implementation has. **This is the distinction between
   a container that changes physics and one that only changes presentation**, and it is the single
   most under-appreciated idea in the prior art. In our model it is `Fassung IS NULL` on a node whose
   children are still grouped in the UI.
2. **The discount is conditional, not absolute.** `bulkIgnored` returns zero when `percentFull > 100`
   **or** when `hasExtraDimensionalParent(this)` — *"extradimensionalParadox"*. So a bag of holding in
   a bag of holding **stops discounting** rather than exploding. That is the humane answer and it is
   the one I take as the default; NetHack's is available as `folge(explosion)` content (§2.1).
3. **`ejectContents()`** — contents move to the next-higher container, or to the actor. The answer to
   *"the bag was destroyed"* that is neither orphaning nor cascading deletion.
4. **`_preUpdate` coerces capacity and ignored-bulk to 0 when `stowing` is false** — the schema
   refuses to hold physics on a node that has none.

**The two defects, read not run, reported precisely because the corpus's rule is to read the code:**

- **`isContainerCycle` is called from exactly two places, both in the actor sheet's drag-and-drop
  handlers** (`src/module/actor/sheet/base.ts:822, 868`). Same class of exposure as §4.1.
- **`prepareBaseData` catches only self-loops of length one:** `if (this.system.containerId ===
  this.id) this.system.containerId = null;` — comment: *"Simple measure to avoid self-recursive
  containers."* A two-cycle is not caught.
- **And the consequence of a UI-layer guard, visible in the code:** `hasExtraDimensionalParent` — a
  *rule computation* — carries a defensive `encountered = new Set<string>()` with the comment
  *"Check for cyclical reference."* The codebase does not trust its own invariant. **And the guard
  reads as ineffective past depth 1**: the recursive call is `return hasExtraDimensionalParent(parent)`
  — the accumulator is not forwarded, so each hop starts with a fresh set and a two-cycle would
  recurse until the stack gives out. **I read this; I did not run it** (§8).

**The lesson, stated as a design rule rather than as criticism:** *a cycle guard implemented above
the data layer leaks defensive code into every downstream traversal, and defensive code is where
correctness goes to be almost right.* That is why §2.1(a) is a database constraint.

### 4.3 Roll20 — containment does not exist, and the reason is architectural

**No native containers, on any sheet, after fifteen years.** Requests are continuous and specific:
nested containers (a pouch in a sack in a backpack), collapsible containers, multiple inventory
repositories with auto-calculated weight, compendium packs that arrive as a container with contents,
*"bag of holding"* **[gemeldet — Roll20 community forums, at least seven distinct threads]**.

**The stated blocker is structural, not a matter of priority:** inventories are **repeating sections**
on a character sheet, and **repeating sections cannot nest** — a sub-inventory would require a
repeating section inside a repeating section, which the sheet framework does not support
**[gemeldet — Roll20 community forums; not vendor documentation, see §8]**.

> **The lesson is the one this brief is for.** Roll20 did not decide against nesting. Roll20 decided,
> years earlier, that an inventory is *a list of rows on a sheet*, and that decision made nesting
> unreachable without rewriting the sheet framework. **A containment model is not a feature you add;
> it is a shape you either have or do not.**

### 4.4 Fantasy Grounds — containment as a label

Containment is modelled as a **free-text `location` string** on the item, plus a carried state
(*not carried / carried / equipped*) that decides whether weight counts **[gemeldet — vendor wiki
(fetched, truncated) + multiple forum threads, 2011–2024; the ruleset source is not public, §8]**.

The complaints are exactly the failure modes the label model produces:

- Items inside a container, that container inside a bag of holding ⇒ **the weight lands on the
  character**, because a string is not an edge and there is nothing to propagate through.
- The community workaround is *"set the location to `Bag of Holding` and set the items to
  NOT CARRIED, then set the bag's own weight manually to simulate it."* That is **users hand-computing
  a rollup the model cannot express**, and it is the single clearest picture in the prior art of what
  containment-as-a-label costs at a real table.
- The recurring feature request is a fourth carried-state, *"in bag"*, that would track capacity —
  i.e. users asking for the label to become an edge.

### 4.5 Roguelikes and immersive sims — where the rules were actually stress-tested

**NetHack (3.6)** — a true recursive tree, and the most-played containment implementation ever
written **[gelesen — tarball downloaded today]**:

- `weight()` recurses over `obj->cobj`, and the bag-of-holding divisor is applied **at each level**,
  so nesting compounds: cursed ×2, blessed (x+3)/4, otherwise (x+1)/2 **[gelesen — `src/mkobj.c:1430–1455`]**.
- **The duplicated-rule tax, caught in the act.** The comment above that arithmetic reads: *"The macro
  `DELTA_CWT` in pickup.c also implements these weight equations."* **`DELTA_CWT` appears nowhere in
  the NetHack-3.6 tree except in that comment** **[gemessen — `grep -rn "DELTA_CWT"` over the whole
  source tree: exactly one hit, `src/mkobj.c:1448`]**. The comment outlived the duplicate. *This is
  what happens to the same physics rule written twice*, and it is why §1.3 makes the weight rule one
  declarative function evaluated by one evaluator.
- **`mbag_explodes(obj, depthin)`** — the bag-of-holding-in-a-bag-of-holding, with the probability of
  detonation rising with nesting depth (`1/1, 2/2, 3/4, 4/8, 5/16 …`) and recursing into contents
  **[gelesen — `src/pickup.c:2078–2100`]**. Destructive, memorable, and **deliberately probabilistic
  rather than a refusal** — the game says yes and then makes you regret it, which is a legitimate
  design and is exactly `folge(<effekt-ref>)` in §2.1(b).
- **The generator refuses the case rather than handling it:** when filling a bag of holding at level
  creation, a magic bag rolled as content is **rewritten into a plain `SACK`** **[gelesen —
  `src/mkobj.c:341`]**. Even NetHack does not want to generate the hard case.
- Stacking merges **on insertion into the container** (`merged()` inside `add_to_container`) — taken,
  §2.3.

**Minecraft** — cycles solved by **type**, which is the cheapest possible answer and shows its price:
a shulker box cannot be placed inside another shulker box or a bundle, and the stated design reason
is that nesting would yield unbounded inventory **[gemeldet — Minecraft wiki / Mojang bug tracker]**.
The price: players nested them anyway via hoppers in an early Bedrock build, and can still do it with
`/item` today. **A type-level refusal is enforceable at the boundary and is routinely defeated by any
path that does not go through the boundary** — which is §2.1(a)'s argument in a second industry.

**Grid / Tetris inventories** (Diablo, Resident Evil, Deus Ex, System Shock, Tarkov) — worth naming
only to place them correctly: a grid is a **presentation and a capacity function**, not a containment
model. It is `Fassung.kapazitaet_volumen` plus `Posten.platz`. §7.3 keeps that door open for one
nullable column and refuses to walk through it in slice 1.

### 4.6 What everyone gets wrong — the five, consolidated

| # | The mistake | Who | The fix here |
|---|---|---|---|
| 1 | **The cycle guard lives in the drop handler.** | Foundry `dnd5e` **[gelesen]**, Foundry `pf2e` **[gelesen]** | A database constraint on a materialised path. No code path can create a cycle because there is no code path. §2.1(a) |
| 2 | **The rollup is a hand-invalidated cache.** 76 sites, 27 files, and the insertion primitive is not one of them. | NetHack **[gemessen]** | Derived from one indexed query; cached by the same trigger that maintains the path; **one** invalidation site; gate „Die Waage stimmt". §2.2 |
| 3 | **The same physics rule is written twice** — and the second copy rots first. | NetHack **[gemessen: the comment outlived the macro]** | One declarative `gewichts_regel` on the node, one evaluator, shipped as package data. §1.3 |
| 4 | **Containment is modelled as a label, or not at all.** | Fantasy Grounds (`location` string) **[gemeldet]**, Roll20 (repeating sections cannot nest) **[gemeldet]** | An edge with a foreign key and a single parent. §1.1 |
| 5 | **Permission is inherited from the parent document**, so seeing the container means receiving its contents. | Foundry, by design — *"Embedded Documents defer to their parent ownership"* **[gelesen — Foundry API docs, `getUserLevel`]** | The contents are never on the client. §5. |

---

## 5. Permissions on contents — `die Durchsuchung`

**The naive implementation, named so it can be refused by CI rather than by memory:** ship the
container's contents to the client and hide them in the UI. That violates invariant 1 (server-side
permissions are the only truth) and Grenze B9 (*der Projektor ist der Server; no visibility metadata
on any player payload, ever*). It is also, verbatim, **what the market leader does** — Foundry's own
API documentation states that *"Embedded Documents defer to their parent ownership"*
**[gelesen — `foundry.documents.Item`, `getUserLevel`]**, which means an actor a player can see
delivers every item that actor holds, at every nesting depth.

**The protocol, end to end.**

```text
Durchsuchung (id, knoten_id, actor_id,
              status ∈ ausstehend | aufgelöst | abgebrochen,
              eröffnet_at, aufgelöst_at NULL, wurf_id NULL)
```

1. **Before.** A `verzeichnet` node in a player payload carries `id`, projected name, and **nothing
   else**. No child ids. No count. No array. No length. No weight breakdown. **Zero bytes of
   contents have ever been on that client.**
2. **The press.** Client sends `{knoten_id}`. Nothing else; it has nothing else to send.
3. **The row.** Server writes `Durchsuchung(status = ausstehend)`. **Idempotent, two-phase** — the
   same state machine as *der ausstehende Wurf* (CHAMPION §7.7). A reload re-renders the pending
   search; it never re-rolls and never re-resolves.
4. **The roll**, if the package binds a clause: server-side, seeded, `Nachrechnen`-replayable, with
   `haelt_etikett` evaluated against **this** character's own projection, exactly as every other roll
   in the product.
5. **The GM's window — the part the naive implementation cannot have.** While `status = ausstehend`,
   Kaya's rail shows *„Sera durchsucht die Kiste — noch nichts drin."* with one control: put something
   in. She creates a `Posten` or a `Knoten` under it. **This is an ordinary write. There is no special
   code path.** It works *because* the contents were never on the client: there is nothing to
   reconcile, no empty box the client has already rendered, no correction to explain away. **The
   protocol is correct rather than merely polite, and this beat is the proof.**
6. **Resolution.** The server snapshots at `aufgelöst_at`, computes the child projection for **this**
   actor, and sends the projected children — **the first bytes of contents that client has ever
   held.**
7. **Recursion is the same call.** A locked strongbox inside the crate arrives as `verzeichnet`, not
   `geöffnet`. One mechanism, at every depth, for places and for items alike.

**Three hard rules, each with a gate:**

- **`Kein Nenner` on contents.** The payload never carries *"3 of 7"*. A partially projected container
  is **byte-identical** to a fully projected one holding three things. The champion's existing
  `NurLeitung<T>` / `Kein Nenner` discipline (CHAMPION §6.5), applied where nobody had applied it.
- **Timing.** An empty `verzeichnet` node and one hiding five items must produce **identical response
  timing**. The lineage already requires this shape for die Vollmacht's *404, not 403, same body, same
  timing* (CHAMPION §4.9). New `oracles.yaml` rows: `behaelter_zustand`, `durchsuchung`,
  `verbundlast`, `posten_zeile`.
- **Der Zwillingsbeweis gets a dedicated fixture pair:** two worlds identical but for the contents of
  one sealed crate produce byte-identical payload, DOM, `getFullAXTree` **and response timing** for a
  non-holder. That fixture is the only thing that makes any of the above a claim rather than a hope,
  and it is priced in §7.

**The race, named with its transaction boundary — which is more than the lineage's existing race
has.** The GM commits a write at 21:14:07.4; the resolve snapshots at 21:14:07.6. Anything committed
after the snapshot **is simply not in the result**, and Kaya is told so (*„zu spät — Sera hat schon
geschaut"*) rather than the item silently appearing in a payload already sent. This is the same class
as die Vollmacht's revocation race, which CHAMPION §4.9 hands to Athena **unattacked and without a
boundary**. This one is handed to Athena **with** the boundary. It still needs her.

---

## 6. The table moment — eine Kiste im Lagerhaus, Hafenviertel, Blattheim

Saturday, 21:11, session 14. **Blattheim is a real tier-1 door in the real corpus** — 14 incoming
links, no article, one of RB-12 §5.4's 113 **[gemessen — RB-12]**. Five players: **Sera** and
**Brannt** in the warehouse; **Nera** in the room but her player is on her own sheet; **Ilva**
watching over Brannt's shoulder; **Radek**, whose character is three days north and whose player is
present at the table.

### What exists in the data at 21:11:00

```text
Knoten  andaria      art=Ort        pfad=[]                                     entry_id=NULL   (kein Artikel — Tür)
Knoten  kaiserreich  art=Ort        pfad=[andaria]                              entry_id=e_112  (Artikel, 32 eingehende)
Knoten  blattheim    art=Ort        pfad=[andaria,kaiserreich]                  entry_id=NULL   (kein Artikel — Tür, 14 eingehend)
Knoten  hafen        art=Ort        pfad=[…,blattheim]                          entry_id=NULL
Knoten  lager4       art=Ort        pfad=[…,hafen]                              entry_id=NULL
Knoten  kiste        art=Behälter   pfad=[…,lager4]   Fassung{stueck:8, voll}   entry_id=NULL
Knoten  kassette     art=Behälter   pfad=[…,kiste]    zustand{verschlossen}     entry_id=NULL
        └── keine Kinder. Kaya hat noch nichts entschieden.
```

Seven rows. `blattheim` has no article and is a red link everywhere in the wiki — and it is also a
node you can stand in. **That is the unification, in the fixture rather than in prose.**

### What is on the wire at 21:11:00

| | Payload for `lager4` | Bytes of `kassette` |
|---|---|---|
| **Sera** | the room, and `kiste` as `verzeichnet` — id + name, nothing else | **0** |
| **Brannt** | identical | **0** |
| **Nera** | identical (she is in the room; her attention is not a permission) | **0** |
| **Ilva** | identical to Brannt's — she is reading his screen, and there is nothing on it | **0** |
| **Radek** | `lager4` is not in his `Sicht`. **His payload is byte-identical to a reader with no campaign at all.** | **0** |

### The beats

1. **21:11:40** — Sera presses *durchsuchen* on the crate. Client sends `{kiste}`.
2. **21:11:40.2** — `Durchsuchung(kiste, sera, ausstehend)`. The package binds Wahrnehmung; the server
   rolls, seeded. `1d20 = 14 + 3 Wahrnehmung + 1 · du hältst 2 Passagen mit #hafenviertel = 18`.
3. **21:11:41** — Kaya's rail: *„Sera durchsucht die Kiste. Sie ist leer."* One control.
4. **21:11:52** — Kaya has eleven seconds and no plan. She presses it and creates one child under
   `kiste`: `kassette` already existed as a stub she seeded at 20:40; she now adds a `Posten`:
   `4 × Segeltuch`. **An ordinary write.** Nothing about it is a search-time special case.
5. **21:11:55** — resolve. Snapshot. Projection for Sera: `4 × Segeltuch` (a `Posten`), and `kassette`
   as **`verzeichnet`** — *„eine verschlossene Kassette"*, id and name, **no contents, no count, no
   weight of contents.** Those are the first content bytes Sera's client has ever received.
6. **21:11:55** — **Brannt receives nothing.** He is in the room; he did not search. His crate is
   still `verzeichnet`. If he now presses *durchsuchen*, that is his own `Durchsuchung` with his own
   roll and his own projection — and it may legitimately differ from Sera's.
   **Nera, Ilva: nothing. Radek: nothing, byte-identical.**
7. **21:12:20** — Sera picks up the strongbox. One row: `kassette.eltern_id := sera_actor`, path
   recomputed for a subtree of one. **Her encumbrance arrives as a single scalar** (`die Verbundlast`)
   — she cannot subtract her way to the weight of contents she has not seen, because the client never
   receives an addend. Kaya has set `gewichts_regel = pauschal(3 lb)` on the strongbox precisely
   because she wants it to *feel* light, and that is a decision she made rather than a leak she
   suffered.
8. **21:14** — the lock opens. `Durchsuchung(kassette, sera)`. Kaya, who now has three minutes of
   fiction behind her, decides: *ein versiegelter Brief mit dem Wappen von Haus Vharon.* One `Posten`,
   `anzahl = 1`.
9. **21:14:30 — the mint, and the payoff.** Kaya speaks the line. Sera presses **`Ctrl+Enter`**.
   `praegung.gesprochen` fires — **one of the closed set of five handlers; the set stays five, and
   this brief adds no sixth.** In that single keypress, three things happen and they are the same
   thing:
   - a passage is minted into **Haus Vharon**, `gepraegt_durch = gesprochen`, with `der Augenblick`
     capturing the warehouse at the exact second;
   - the letter is **promoted** (`die Erhebung`) from `Posten` to `Knoten` and receives an identity,
     because a thing you have written a paragraph about is no longer a measure;
   - `blattheim`'s red link, for Sera, becomes a **door** — she has now been there, and the door is
     visible only to its holder (CHAMPION §3.4, §6).

   > **Der rote Link ist eine Tür — und der Posten wird ein Ding. Ein Tastendruck, eine Geste.**

   That sentence is the whole argument of this brief compressed into one keypress, and it is only
   true because boundary A (§1.2) drew identity in the same place for places and for things.
10. **21:14:31** — Brannt's payload gains the passage as `[von Sera gehört]`; his next roll on
    `#haus-vharon` prints `+0 · Hörensagen`. Radek's payload is unchanged and byte-identical. Ilva,
    reading Brannt's screen, sees exactly what Brannt is permitted to see, which is the only reason
    the projection is worth anything at a physical table.

**What became canon:** one passage, by one human keypress, with a Saturday over it. **What did not:**
the crate, the sailcloth, the strongbox, the four hundred other crates in the harbour district. They
are `Zustand` — the explicitly mutable second substrate (CHAMPION §8) — and they will still be there
in session 40 without ever having produced a line of prose or a provenance chip. **That is the
anti-log invariant surviving contact with an inventory**, which is the thing a naive implementation
loses in week one.

---

## 7. Cost, and what is irreversible

### 7.1 The bill — the item half, on the pinned stack

| Line | Days | Risk |
|---|---:|---|
| `Knoten`/`Posten`/`Enthalten` schema, materialised `pfad`, cycle constraint + trigger, depth bound, migrations as pure functions | 3 | low |
| Rollup: derived weight/count/volume, one invalidation site, gate „Die Waage stimmt" + 3 000-op fuzz (reuses `spike-A-passage-identity`'s harness) | 3 | med |
| `Fassung` + declarative `gewichts_regel` evaluator, integer-only units, three enforced capacity dimensions, soft enforcement | 2 | low |
| Stacking: merge-on-insert, atomic idempotent split, the container-stack split rule, coin denominations | 2 | med |
| `vorlage_ref` revision binding, `Bausatz` instantiation, `die Angleichung` surface, gate „Die Vorlage rührt nichts an" | 3 | med |
| **`Sicht` over containment: three node states, `die Durchsuchung` two-phase protocol, `die Verbundlast` scalar, four `oracles.yaml` rows** | **5** | **high** |
| `Zugriff`, the `erreichbar` path-prefix predicate, concurrent-take conditional update | 2 | med |
| Der Zwillingsbeweis: the sealed-crate fixture pair (bytes, DOM, `getFullAXTree`, timing) | 2 | med |
| Inventory surface: the `Collection` recipe over a tree, drag/drop **and** keyboard-complete, Outline-first per CHAMPION §9.1 | 4 | med |
| Export/import: containment survives `export → import → diff empty`, including paths, `Posten` identity and revisions | 2 | low |
| **Subtotal** | **28** | |
| **+ RB-18 §6.3's restored 20 % contingency** | **≈34** | |

**The number is honest about two things and I will not launder either:**

1. **The 5-day `Sicht` line is not bounded until `S-P1` runs.** `S-P1` (*Drei Bücher, ein Server*, two
   days) is **mandatory and unrun for a fourth round** (CHAMPION §12.4). `Die Durchsuchung` and `die
   Verbundlast` are `Sicht`'s **first numeric obligations** in five rounds of design. If `Sicht` does
   not hold, that line is not 5 days, it is unknown. **`S-P1` is a hard precondition for this beat,
   not a nice-to-have**, and this is now the third independent brief to say so.
2. **The unit is uncalibrated.** RB-18 §1.6: *"one developer with an AI crew" days… that unit has
   never been calibrated even once.* This brief does not calibrate it either. It does what RB-20b
   did — it names the one measurement that would (§8, the half-day spike).

**Fusion-bearing vs. parity**, in RB-18 §4.2's frame (*"between 52 and 69 of the 100 tactical days
buy parity with a $50 competitor"*): **≈13 of the 28 days buy something no rival can be bought to
do** — the `Sicht`-over-containment 5, der Zwillingsbeweis 2, the revision/Angleichung 3, and 3 of
the schema days that exist only because places and items share one relation. **The other 15 buy
parity with what `dnd5e` has shipped since 2024-01-31.** RB-18 route item 5 is binding: **sequence
the 13 first.**

### 7.2 Irreversible — build maximal, now, once

1. **`Enthalten` as an edge with exactly one parent plus a materialised path.** Changing this later
   rewrites every query in the product, in both halves. Foundry needed 3 years 3 months to add it and
   broke permissions within 24 hours (§4.1).
2. **Boundary A — `Knoten` vs `Posten`.** You cannot retrofit identity onto stacks that were never
   individuated; you cannot retroactively de-individuate rows that have citations pointing at them.
3. **`vorlage_ref = (template_id, revision)`.** A database that stored `template_id` alone has
   **permanently lost** which revision each instance was made from. There is no migration that
   recovers it. This is the cheapest irreversible decision in the brief — one extra column — and the
   most expensive one to omit.
4. **Integer-only physical units.** Retrofitting integers onto stored floats loses the originals, and
   gate **Nachgerechnet** cannot be satisfied retroactively.
5. **The wire contract for `verzeichnet`.** You cannot un-ship bytes. Every client, every export and
   every third-party integration built against a leaky payload must change when you fix it — which is
   why Foundry's *"embedded documents defer to their parent ownership"* is, for them, effectively
   permanent.
6. **Containment in the export format.** An export that flattens containment cannot be re-imported
   into a nested world. Round-trip parity (`export → import → diff empty`, CHAMPION §12.1 step 12)
   must include paths and `Posten` identity **from the first export that ever leaves the building.**

### 7.3 Replaceable behind a named boundary — stay cheap here

1. **The rollup implementation** (cache vs. recompute) — behind one module, proven equal by
   „Die Waage stimmt". Swap freely.
2. **The physics rules themselves** — `gewichts_regel`, capacity dimensions, `verschachtelung`. All
   declarative package data. A new system ships new **data**, never new code.
3. **The inventory surface** — `Collection` is already a render recipe
   (`03-triumph-ui-direction.md`); three recipes exist and the Outline one ships first (CHAMPION §9.1).
4. **`MAX_TIEFE = 24`** — a number in one constant.
5. **Which clause resolves a `Durchsuchung`** — package data.
6. **Grid / slot / Tetris inventories.** Refused in slice 1. Buildable later with **no schema change
   at all**, provided `Posten.platz jsonb NULL` exists from day one. **One nullable column, now, is
   the entire option** — and that is precisely Kaya's rule read correctly: maximal where irreversible,
   one nullable column where a boundary makes replacement possible.

---

## 8. What could not be established

Recorded so no later round launders an absence into a fact.

1. **Subtree-move latency.** Moving a 1 000-node subtree with materialised paths on the reference
   laptop: **not measured.** The named spike is **half a day** — Postgres, 100 k `Knoten`, a 1 000-node
   ship, `UPDATE … WHERE pfad @> ARRAY[?]`, and the same for a recursive CTE, and take the winner. It
   is the direct analogue of RB-20b §10's one-day spike and it should run before the schema is
   frozen.
2. **Whether `ltree`/`text[]` with GiST beats a recursive CTE at our scale.** Unmeasured. The path is
   argued from its three uses (§1.1), not from a benchmark.
3. **How many item rows a long-running campaign actually holds.** **[keine belastbare Zahl gefunden]**.
   The Eron fixture has 74 articles and no inventory at all.
4. **Roll20's server-side inventory model.** Not public. The *"repeating sections cannot nest"*
   limitation is **community-reported, not vendor-documented** — treat §4.3 as `[gemeldet]`.
5. **Fantasy Grounds' exact field names and semantics.** The ruleset source is not public; the vendor
   wiki page fetched truncated and the forum archive returned HTTP 403. §4.4 is user reports, and its
   claims are limited to behaviour users describe repeatedly across a decade.
6. **Whether PF2e's `hasExtraDimensionalParent` accumulator defect is reachable in practice.** **I
   read the code; I did not run it.** The recursive call does not forward `encountered`; whether a
   two-cycle can exist in a live world depends on paths I did not audit.
7. **The cost of `die Angleichung`'s UI.** Estimated at 3 days with the schema work; uncalibrated,
   like every day in this corpus.
8. **Any evidence that a Roll20 or Foundry container leak has been publicly disclosed as a security
   issue.** Searched; **[keine belastbare Meldung gefunden]**. §4.6 row 5 rests on Foundry's own API
   documentation describing the design, not on a disclosed incident, and it is stated that way.

---

## 9. Sources

**Code, read today**
- `foundryvtt/dnd5e` (MIT; 576★, 336 forks, 959 open issues, pushed 2026-07-24) —
  `module/data/item/container.mjs`, `module/data/item/templates/physical-item.mjs`,
  `module/documents/item.mjs`, `module/applications/item/container-sheet.mjs`
- `foundryvtt/pf2e` (625★, 496 forks, pushed 2026-07-26) — `src/module/item/container/document.ts`,
  `src/module/item/container/helpers.ts`, `src/module/item/container/data.ts`,
  `src/module/actor/inventory/bulk.ts`, `src/module/actor/inventory/index.ts`,
  `src/module/actor/sheet/base.ts`
- `NetHack/NetHack`, branch NetHack-3.6 (full tarball, 5.58 MB) — `src/mkobj.c`, `src/pickup.c`,
  plus a whole-tree grep for `DELTA_CWT` and `owt = weight(`

**Issues, dates verified via GitHub REST API**
- foundryvtt/dnd5e#729 *Native item container support* — opened 2020-10-23, closed 2024-01-31
- foundryvtt/dnd5e#2782 *Users lack permissions to update containers nested within their sheets* —
  opened 2024-02-01
- foundryvtt/dnd5e#3299 *Containers breaking older item compendiums* — 2024-03-22

**Vendor documentation**
- Foundry VTT API, `foundry.documents.Item` / `getUserLevel` — *"Embedded Documents defer to their
  parent ownership."*
- Foundry VTT KB, *Users and Permissions* — the four ownership levels, GM-only by default

**Community reports `[gemeldet]`**
- Roll20 community forums — seven container/inventory feature threads, incl. the repeating-section
  nesting limitation
- Fantasy Grounds forums (archive) + FG customer portal wiki — location/carried semantics and the
  bag-of-holding weight complaints
- Minecraft wiki / Mojang tracker — shulker-box nesting refusal and its historical hopper bypass

**In-corpus, binding**
- [`CHAMPION.md`](../iterations/CHAMPION.md) v5 §3.4, §4.9, §4.11, §5.2, §5.3, §6, §7.7, §8, §9.1,
  §12.1, §12.4
- [`00-intake.md`](../00-intake.md) — the invariants, K1–K10
- [`02-domain-model.md`](../02-domain-model.md) — `Inventories`, `ItemInstances`, `ItemTemplates`,
  `AuditEntry`, the two-dimensional permission matrix
- [`RB-11`](RB-11-steam-vs-browser-verdict.md) · [`RB-12`](RB-12-eron-uebernahme.md) §5.3–§5.5 ·
  [`RB-18`](RB-18-widerspruch.md) §1, §4.2, §6 · [`RB-20b`](RB-20b-machbarkeit.md) §1, §5, §8 ·
  [`RB-20d`](RB-20d-erzeugung.md) §4.1–§4.5

---

> *Ein Sack ist keine Zahl, ein Reich ist keine Kiste —*
> *und doch: wer fragt „was liegt hier drin?",*
> *fragt beide Male gleich.*
> *Die Waage aber duldet keinen zweiten Vater,*
> *drum sei der Baum ein Baum,*
> *und alles andre eine Brücke.*
