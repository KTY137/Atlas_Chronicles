# RB-21 — Die Weltmaschine

**Pythia, das Orakel · 2026-07-27 · das Urteil über Verschachtelung, Inventar und Erzeugung.**

Beat: Kaya's own sentence, read — correctly, by all five briefs — as a data-model proposal.

> *„das Ding ist hier haben wir Weltkarten, aber wir wollen auch lokale Karten haben können. Oder
> **nested Maps**, das wäre wohl das krasseste. **Jedes Universum ist dann eine gigantisch große nested
> map. Mit nested inventory.**"*

**Governed by Kaya's own migration rule** (binding, same day): *„die Migration kostet am meisten —
deswegen sollte man von vornherein den extremsten, besten, aufwendigsten Pfad gehen."* The crew's
sharpened form, which this document applies without exception: **build the maximal version of whatever
is irreversible — the data model, the permission model, the atom of knowledge, the import/export
formats — and stay cheap wherever a named boundary makes replacement possible.**

**Reads as binding and does not re-open.** [`RB-11`](RB-11-steam-vs-browser-verdict.md): the game
engine is **STRUCK at 2/2/2**; React/TS + PixiJS, DOM-authoritative, canvas behind `MapRenderer`,
browser + Electron. §5 closes it once and it is not mentioned again.
[`RB-18`](RB-18-widerspruch.md) and [`RB-20e`](RB-20e-widerspruch.md): the ledger, the uncalibrated
unit, the restored 20 % contingency, die Bilderregel — **not contradicted anywhere below, and not
re-derived.** [`RB-21c`](RB-21c-lizenz-und-risiko.md): Athena's two CRITICALs bind and cannot be
overridden. [`RB-12`](RB-12-eron-uebernahme.md): the import contract and the passage atom.
[`CHAMPION.md`](../iterations/CHAMPION.md) §3.4, §4.9, §6, §8, §9.1, §12; [`00-intake.md`](../00-intake.md).

**Reads and rules on:** [`RB-21a`](RB-21a-verschachtelung.md) (Ariadne) ·
[`RB-21b`](RB-21b-inventar.md) (Hephaistos) · [`RB-21c`](RB-21c-lizenz-und-risiko.md) (Athena) ·
[`RB-21d`](RB-21d-erzeugung-je-ebene.md) (Erzeugung) · [`RB-21e`](RB-21e-widerspruch.md) (Nemesis).
**Nemesis's eleven breaks B-17 … B-27 and her ledger break B-28 … B-30 are engaged one at a time in
§6.4. None is routed around.**

### Method, and what every number here is worth

- **[gemessen, 2026-07-27]** — produced by me, on this laptop, today, with the command shown, against
  the real fixture and the live wiki. Scripts and the fetched map are on disk in
  `…/049d5432-…/scratchpad/` (`karte.json`, `mapred.json`).
- **[aus dem Korpus]** — a figure another brief measured, which I re-ran and reproduced.
- **[Autorenangabe]** — a figure another brief measured which I did **not** reproduce, carried with
  its author's name attached.
- **[Herstellerangabe]** — vendor self-reporting. Never laundered.
- Where a figure could not be established the text says **„no reliable figure found."** §8 lists every
  one of them.

**One methodological remark that changes how the rest should be read.** I re-ran RB-21a's map join
myself, from a fresh live fetch of `Karte:Andaria` (109,182 B against her 109,184 B — a two-byte
revision drift, nothing else). **Every figure reproduced to the digit:** 190 markers, 16 categories,
`mapBounds [[0,0],[8192,8192]]`, `origin bottom-left`, `coordinateOrder xy`, 69 redlink targets among
the map's names, 18 of them tier-1, markers per category **min 2 · median 5 · mean 11.9 · max 33**,
54 markers carrying description, **9,512 characters** of marker prose, and **Andaria is not a marker
on Andaria's own map** [gemessen: `curl …api.php?…titles=Karte:Andaria` + join against
`fixtures/eron/graph.json`]. **RB-21a is the most reliable measured brief in this round and it is
ruled with, not merely cited.** §3.2 is where I nonetheless correct one of its headline numbers — with
a second signal, not with an opinion.

---

## 0. Die Antwort in drei Sätzen

> **1 · Er hat recht, und das Rechte daran ist eine Spalte.** The thing that nests is neither the map
> nor the bag — it is **the edge**, one column that a continent and a copper coin both carry; and the
> one thing that cannot be one graph is the graph itself: **`Raum` is a strict tree, `Bezug` is a typed
> dated multigraph, and the split between them is not taxonomy — it is 89 % of a world's secret
> societies, measured.**
>
> **2 · What gets built today is columns, not days.** The irreversible half — one spatial parent, the
> `Ort`/`Ding`/`Posten` lattice, `Bezug` with `von_jahr`/`bis_jahr`, `Anker` as a row per `(Karte,
> Ort)` with `ohne` as a first-class value, R-P1…R-P4, `vorlage_ref = (template, revision)`,
> integer-only units, containment in the export format, and the ~100-byte `Weltkeim` — is committed
> now, maximally, because every one of those is a migration later and a column today. **The
> reversible half — `Fassung`, the physics, `die Durchsuchung`, `die Verbundlast`, the item surface,
> the generator embed — is cut from this round entirely: 42 of Nemesis's 45.5 days are not spent, and
> the round's committed spend is 3.5 days of spikes plus a schema.**
>
> **3 · Nested maps are parity, not novelty — LegendKeeper ships them and publishes a tutorial — so
> the claim is the sentence after theirs: the projection *down* the nesting is the fusion.** And
> containment orders **roughly one door in five, measured two independent ways and still a floor**
> (§3.2) — which is a presentation fix and **not** an economics fix, exactly as RB-21a itself said and
> RB-21b did not.

**And the sentence to say back to him, which is the whole ruling compressed:**

> **Du hast nicht eine Karte in einer Karte beschrieben. Du hast eine Spalte beschrieben.** A continent
> and a coin answer the same question — *worin?* — and one column answers it for both, forever, for
> free. What costs money is the *other* graph: who owns it, who rules it, who sits in it. Those must
> never be the same column, because the day they are, a character who has walked a fifth of your world
> knows that nine in ten of its secret orders exist, and no amount of careful querying takes that back.
> **Der Baum sagt, wo etwas steht. Das Netz sagt, was es bedeutet. Getrennt kosten sie eine Spalte.
> Vermischt kosten sie die Welt.**

---

## 0.1 Das Urteil, das Nemesis namentlich verlangt hat

Nemesis's §0 outranks all five of her fronts and she is right that it does:

> *„Three briefs, written on one day, about the single most irreversible object in this product,
> specify three mutually incompatible schemas for it — and each declares its own version
> irreversible… Apollon cannot synthesise this round. He must rule it, by name."*

**She is correct, the disagreements are load-bearing rather than lexical, and here are the five
rulings.** Dissent is recorded under its author's name in §0.2 and is never averaged.

| # | The question | **Ruled** | Because |
|---|---|---|---|
| **a** | One spatial parent, or a typed parent list? | **One.** `raum_eltern_id`, `NOT NULL` on non-roots. RB-21a governs; RB-21d's `eltern: Kante[]` is **struck as containment** and survives whole as `Bezug`. | Two independent reasons that do not need each other. **(i)** RB-21a's leak: an upward implication over all edge kinds discloses **25 % / 56 % / 89 %** of a world's organisations at 1 % / 5 % / 20 % of places held. **(ii)** RB-21b's physics: *"if a thing has two parents, „how heavy is this bag" has no answer without a convention, and every convention double-counts or arbitrarily halves."* **RB-21d measured a real DAG and put it in the wrong column** — 8 of 25 states spanning two landmasses is `Bezug(staat, herrscht_ueber, landmasse)`; 324 of 575 routes crossing two provinces is RB-21a §1.3 case 1, with OSM's set-valued `level=0;1` as precedent. |
| **b** | Which edge kinds imply visibility? | **Exactly one: `Raum`, upward only, to `benannt` only.** R-P1 · R-P2 · R-P3, plus **R-P4 (new, §1.3)**: carriage never implies either. | It is the permission model, and anything revealed under a looser rule cannot be un-revealed. This is the single row in the whole ruling with no reverse gear. |
| **c** | `Ort`/`Ding` (RB-21a) or `Knoten`/`Posten` (RB-21b) — the primary boundary is drawn in two places and both are declared irreversible | **Both are real, both are kept, and they are not competing — they are orthogonal axes.** §1.2 draws the lattice: `Ort` · `Ding` · `Posten`, two one-way human promotions, one refused cell. | This is the one place where the round's contradiction dissolves under inspection instead of forcing a loser. RB-21a's boundary is **which substrate a row lives on** (canon vs. board state). RB-21b's is **whether a row has identity at all** (addressable vs. measure). A `Posten` is not a rival to a `Ding`; it is a *measure attached to* one. Neither author was wrong; each named one axis and called it the axis. |
| **d** | Is an actor a node in the containment tree? | **No.** Carriage is a third alternative column (`ding.traeger_actor`), never a `Raum` edge — RB-21a governs. **And RB-21b's `erreichbar` predicate is rescued rather than dropped:** `actor_instance` gains one nullable column, `steht_in_ort`, and reachability compares the *place the actor stands in*, not the actor. | Nemesis's B-20 is exactly right that RB-21b's predicate is unimplementable on RB-21a's schema, and exactly right that actor-as-node plus R-P1 means **a successful pickpocket learns her victim's full location chain by construction.** One nullable column closes both. §1.3. |
| **e** | One depth constant, or two? | **One. `MAX_TIEFE = 24`, over the whole containment closure — `Ort` chain and `Ding` chain together.** RB-21a's separate cap of 8 on `Ding` chains is struck. | The chain is **one edge**; two caps on one edge is precisely the thing this ruling just refused for parents. 24 is a **bound on path storage and render fan-in, not a game rule**. Kaya's own named chain is 13; the deepest chain observable in his real corpus is 4 (§1.1); Foundry's `MAX_DEPTH = 5` would refuse his own sentence at *Raum*. It is a constant behind a named boundary and all three briefs agree it is cheap to be wrong about. |

### 0.2 The dissent, recorded rather than averaged

- **RB-21d (Erzeugung) dissents on (a)** and its dissent is evidence, not noise: *"Landmass and polity
  are two parallel axes over the same points… This is the DAG, and it appears at the very first level
  of a default world."* **The measurement is upheld in full and the schema conclusion is struck.** Its
  own numbers are the reason: culture, religion and biome cut *across* states 16–17 times in 25 —
  which is precisely a statement that they are **not** containment.
- **RB-21b dissents on (e)** with `MAX_TIEFE = 24` and mocks Foundry's 5. **It wins on (e)** and RB-21a
  loses; recorded so the lineage can see that the brief which priced everything beat the brief which
  priced nothing on exactly one question, and that the reason was a number (Kaya's own 13-deep chain),
  not seniority.
- **A third collision neither Nemesis nor any author flagged, ruled here:** RB-21a stores the read
  path as a **closure table** (`raum_huelle`, 401,727 rows, 202 ms to build [Autorenangabe, Ariadne]);
  RB-21b stores it as a **materialised path** (`pfad ID[]`, justified three times over). **Ruling: the
  truth is `raum_eltern_id`. Both `pfad` and `raum_huelle` are derived caches behind one named
  boundary, and which one ships is decided by the half-day spike RB-21b already named — not by a
  brief.** That is Kaya's rule read correctly in the other direction: *cheap where a boundary makes
  replacement possible.*

---

## 1. Der Enthaltensvertrag — die unumkehrbare Hälfte

### 1.1 Die Form

> **`Raum` ist ein strenger Baum. `Bezug` ist ein typisiertes, datiertes Netz. Ein Knoten hat höchstens
> einen räumlichen Vater und beliebig viele Beziehungen zu allem anderen.**

RB-21a's R1–R6 are adopted verbatim and are not restated. Three things are added or changed:

**(1) Der `Unverortet`-Wurzelknoten — adopted, and it is the whole 21:00 case.** Nemesis's B-18 asks
what a tired GM at 21:04 does with a battlemap that hangs nowhere, and finds the round answering twice,
incompatibly. **Ruled: one row per campaign, `titel = „noch nicht verortet"`, `art = unverortet`.** It
satisfies R1 without asking her a question about Andaria; re-parenting later is one keypress. Nemesis
wrote *"one row buys the entire 21:00 case, and the round spent four documents without writing it"* —
correct, and it is now written.

**(2) Ein Wiederanhängen ist eine gewöhnliche Bearbeitung, kein `Berichtigung`.** Nemesis's B-19 is
upheld as a break and closed as a rule rather than absorbed as a virtue. RB-21a wrote *"a re-parent of
an `Ort` is canon and is NOT undoable"*, and Nemesis's scenario — forty promoted containers, a
harbour district reorganised on a Wednesday, forty reason fields, a GM who stops reorganising — is
real and is a table-hour cost stated as a feature.

> **Ruled: `die Beförderung` is one-way and audited. Re-parenting is neither.** A re-parent writes an
> `AuditEntry` and is otherwise an ordinary, reversible edit. **The justification is structural, not
> merciful:** §1.6 rules that the containment edge's visibility is *derived* — `min(sicht(kind),
> sicht(eltern))` — so **no `Revelation` is ever granted on the edge**, so a re-parent grants nothing
> and revokes nothing, so there is nothing for a `Berichtigung` to correct. A `Berichtigung` is owed
> only when the node itself has been cited.

**(3) Die Tiefe, gemessen an seiner eigenen Welt.** The deepest containment chain observable in Kaya's
real corpus is **four**, and three of its four links do not exist as articles
[gemessen, `fixtures/eron/graph.json`]:

```
Eron (Planet)                        ARTICLE
  └─ Andaria                         redlink · 15 eingehend · 67,1 MPx Karte · kein Artikel
       └─ Blattheim                  redlink · 14 eingehend
            └─ Versteck der Flüsterer in Blattheim   redlink · 5 eingehend
```

> **The real corpus's deepest spatial chain is four deep and three quarters of it is unwritten.** That
> is not a degenerate case to be handled; it is the **steady state**, and a model that requires a place
> to have an article cannot represent the most important place in the stakeholder's own world.
> Kanka's vendor advice — *"three to four levels of nesting handle 95 % of campaign worlds"*
> [Herstellerangabe] — is corroborated by the only real corpus we have, and `MAX_TIEFE = 24` is
> therefore a bound with a factor of six of headroom over the observed maximum and a factor of nearly
> two over Kaya's own imagined chain.

### 1.2 Das Gitter — Nemesis's (c), ruled by reconciliation

Two orthogonal axes, three legal cells, one refused by construction:

| | **ansprechbar** (has an id, can be a parent, can be cited) | **Maß** (a template + a count + a state hash) |
|---|---|---|
| **Kanon** (the encyclopedia's substrate) | **`Ort`** — universe, world, region, settlement, building, room, fixed container | **unrepresentable, and deliberately so.** There is no table. A canonical thing that cannot be addressed cannot carry a passage, a citation or a revelation, and every one of those is what canon *is*. |
| **Brettzustand** (`Zustand`, the explicitly mutable second substrate) | **`Ding`** — the sword, the bag, the corpse, the crate | **`Posten`** — `47 Pfeile`, `12 Kupfer`, `4 Segeltuch` |

**Two one-way, human-pressed, audited promotions, and no automatic path between any two cells:**

```
Posten ──die Erhebung──▶ Ding ──die Beförderung──▶ Ort
        (count must be 1)        (never reversed)
```

- **`die Erhebung`** (RB-21b) promotes a `Posten` of count 1 into a `Ding`. It is **the mint gesture,
  not a sixth one** — the closed set of five `praegung` handlers stays five, exactly as RB-21b argued
  and as CHAMPION §8.2 requires. A thing you have written a paragraph about is no longer a measure.
- **`die Beförderung`** (RB-21a) promotes a `Ding` to an `Ort`. One-way; `Ort → Ding` is refused,
  because a place that has been minted, cited and revealed cannot become disposable board state.

**Three consequences, and the third is the reason this lattice is worth the paragraph:**

1. **A `Posten` cannot be a parent, and that is enforced by absence rather than by a check.** No
   foreign key in the schema points at `posten.id`. There is no code path to defeat, because there is
   no column. *Unrepresentability, not policy* — CHAMPION §6's own house style.
2. **RB-21b's container-stack rule is adopted intact and is better than the prior art's:** a container
   `Posten` with `anzahl > 1` must be empty; putting anything into one splits the stack and promotes
   exactly one. Foundry's `dnd5e` and `pf2e` both forbid container stacking outright
   (`quantity: max: 1`; `isStackableWith(): return false`) [gelesen by Hephaistos] — right about the
   danger, and both overpay: a merchant with twenty empty sacks gets twenty rows.
3. **A warehouse with four hundred crates is four hundred rows with no article, no provenance chip and
   no door — until a human opens one.** That is the anti-log invariant surviving contact with an
   inventory, and it is the property that lets generation manufacture structure at scale for the same
   reason it may manufacture places at scale: *nothing it emits is canon and nothing it emits is prose.*

### 1.3 Der Akteur — Nemesis's (d), and R-P4

**An actor is not a node in `Raum`.** Carriage is `ding.traeger_actor`, one of three mutually exclusive
container columns. And one nullable column is added to the champion's existing `ActorInstance`:

```sql
ALTER TABLE actor_instance ADD COLUMN steht_in_ort uuid NULL REFERENCES ort(entry_id);
```

That single column does three things Nemesis proved the round could not do:

- **It makes RB-21b's reachability predicate implementable** on RB-21a's schema, which B-20 showed it
  was not. `erreichbar(actor, knoten)` compares the path of `actor.steht_in_ort` against the path of
  the target — not `actor.pfad`, which does not and must not exist. The party-stash case (the stash is
  in the wagon, the wagon is at the camp, one player is in town) survives whole, and the refusal names
  its reason — *„Du bist in Blattheim; der Wagen steht am Lager"* — instead of greying out a button.
- **It keeps the actor out of the permission closure**, which is the only reason B-20's pickpocket leak
  does not exist.
- **It is where the tactical half's token position already wants to live.** CHAMPION §9.1 already
  ships token positions as `Zustand`; `steht_in_ort` is the same fact at the containment scale, and
  the two must never be two facts.

> **R-P4 · die Trageschranke (new).** Carriage is a third edge kind. **It implies nothing, in either
> direction, ever.** Holding a carried `Ding` implies nothing about its carrier; holding a carrier
> implies nothing about what he carries.

**The cost of R-P4, stated rather than hidden, because Nemesis named it and she is right.** RB-21a's
showcase breadcrumb — *„Münze › Beutel › Truhe › Kammer › Haus Vharon › Blattheim › Andaria"* — is a
**chest** chain and renders whole. A **carried** coin's breadcrumb stops where the reader's own
projection stops: for a pickpocket who does not know where Sera stands, it reads
*„Münze › Beutel › (bei jemandem)"*.

> **That is not a defect. It is what a pickpocket actually knows**, and a model that printed the rest
> would be handing her a location chain she stole a coin to avoid needing. The unification's
> showpiece sentence is therefore narrowed by one clause — *from a continent to a coin, as long as
> nobody is carrying it* — and the narrowed version is the true one.

### 1.4 Koordinaten und Anker

**Ruled, and nobody has to prove it again — four independent sources already have.** RB-21a's §3 is
adopted whole and its evidence is unanimous: IMDF's `anchor` / `level` / `opening` (OGC Community
Standard), OSM's explicit stairway and elevator features with `repeat_on=*`, Unreal's **world origin
rebasing** (*"adding an offset vector to all registered Actors"* [Herstellerangabe, Epic]), and
Azgaar's own published ceiling on the FMG↔MFCG bridge — *"warping data of a medium-sized city would
consist of hundreds of floating point numbers, making URLs unsuitable"*.

> **„Nested maps" means a graph of linked artifacts with containment and anchors. It does not mean one
> continuous LOD zoom.** Nemesis's §2.3 marks this clause **upheld, overwhelmingly**. It is closed.

Three rulings carried forward unchanged from RB-21a because they are load-bearing and cheap:

1. **`Anker` is a row per `(Karte, Ort)`**, geometry on the child, in the parent's map space.
2. **`Anker.geometrie = ohne` is a first-class value and is different from no row at all.** `ohne`
   means *"this child is in this map's area and we do not know where"* — the case an import produces
   constantly. No row means *"not on this map."* One enum value, and it is the difference between an
   honest empty state and a lie.
3. **Die Tafel *ist* die Karte.** A node renders as its children, its doors and its breadcrumb, in a
   list; a `Karte` is an **enhancement** of how those same children are laid out. This is the cheapest
   and strongest thing in the entire round: **nested containment ships with zero Pixi, zero tile
   pyramid, zero renderer, zero art and zero commissions**, inside the slice CHAMPION §9.6 itself
   calls *"a wiki with dice and an outline."*

**And two names that must stay two names in the UI or users will conflate them:** *die Vergrößerung*
(continuous zoom **inside** one `Karte`, LOD supplied by the tile pyramid that already exists on disk
— 1,365 tiles, 9.9 MB, 6 levels [aus dem Korpus, RB-20b]) and *der Übergang* (a named, addressable,
back-stackable transition **between** two `Karten`). A child that has its own `Karte` renders with a
different affordance from one that does not: **the user must see, before clicking, whether the click
reads or travels.**

### 1.5 Der Wiki-Verbund

> **Eine Identität, eine optionale Facette.** `Ort` is the **spatial facet of an `Entry`**, sharing its
> primary key. Not two rows with a join key: **one id.**

The corpus supplies the argument and it is not theoretical: the same polity is already **three
identities in one world** — the map calls it `Terabur`, the articles link `Königreich Terabur`
(13 inbound) *and* `Terabur` (5 inbound), and none of the three exists as an article
[aus dem Korpus, Ariadne; reproduced]. **Every additional id we introduce is one more place for that
to happen**, and a revelation granted on "the article" that does not also grant "the map node" is a
leak with a bug report attached.

**The containment edge is a column, not a passage.** If it were a passage, *"Blattheim liegt in
Andaria"* would be revealable independently of *"Blattheim existiert"*, and the breadcrumb would have
to render a half-known ancestor. A GM who genuinely wants *"Blattheim's true location is a secret"*
writes it as a passage on Blattheim and parks the node under a parent nobody holds — the same
mechanism, used deliberately.

### 1.6 `Sicht` den Graphen hinunter — eine Aussage, vier Regeln, ein Nebel

`Sicht` stays exactly what CHAMPION §6 makes it: server-authoritative, composing at one choke point,
no visibility metadata on any player payload (Grenze B9), Default-Deny durch Totalität. **This ruling
adds no second permission system.** It adds one derived ternary — derived, never stored twice — and
four rules.

| State | Means | Derived from |
|---|---|---|
| `unbekannt` | the node does not exist for this character, **byte-identically** | nothing |
| `benannt` | she knows it exists and its name; she holds no passage of it | **implied** by R-P1, or granted |
| `erschlossen` | she holds ≥1 passage of it | `Revelation` |

This is `erfahrungsgrad` (*Erfahren schlägt Gehört*, CHAMPION §4.2) applied to geography — a region
whose **label** may be visible while its **contents** are not.

> **R-P1 · der Aufstieg.** Holding a node at `benannt` or better implies its **spatial** ancestors are
> `benannt`. Upward only. Transitively. **`benannt`, never `erschlossen`.**
>
> **R-P2 · kein Abstieg.** Holding a node implies **nothing** about its children.
>
> **R-P3 · die Bandsperre.** **Only the `Raum` edge implies.** A `Bezug` never implies anything about
> visibility, in either direction, ever.
>
> **R-P4 · die Trageschranke.** Carriage never implies anything, in either direction, ever (§1.3).

**R-P3 is where the money is and it is the only rule in this document backed by a controlled
experiment** [Autorenangabe, Ariadne, `leck2.mjs`; I did not re-run it]:

| Character holds | Spatial-only closure | All-edge closure | **Organisations disclosed** |
|---:|---:|---:|---:|
| 107 places (1 %) | 375 | 475 | **100 of 400 (25 %)** |
| 490 places (5 %) | 1,365 | 1,587 | **222 of 400 (56 %)** |
| 2,009 places (20 %) | 3,864 | 4,221 | **357 of 400 (89 %)** |

> **A character who has been to a fifth of the world learns that nine in ten of its secret societies
> exist — without anyone revealing anything. Not their contents. Their existence, which for a cult is
> the whole secret.**

**The caveat, stated because Ariadne stated it and Nemesis repeated it:** the tree is synthetic —
10,023 nodes, 400 organisations, an assumed 25 % edge density. **The magnitude is a model. The
direction is not, and the direction decides the schema.**

**The six leaks, ruled.** RB-21a's L1–L6 are adopted as written, with one change:

| | Leak | Ruled |
|---|---|---|
| **L1** | Der Zähler — *„diese Truhe enthält 7 Gegenstände"* | `Kein Nenner` / `NurLeitung<T>` already make it unrepresentable. A container renders the children the reader holds: **no count, no „…und 3 weitere", no scrollbar sized to the truth.** |
| **L2** | Die Brotkrume | **Breadcrumbs render `Raum` only.** Never `Bezug` (*„…› Haus Vharon › Bruderschaft der Asche"*), never carriage past R-P4. |
| **L3** | Die Suche | **Project first, then query. Never query then filter.** A subtree query over a large container is 3.18 ms and over an empty one is microseconds [Autorenangabe] — that difference is a timing oracle if the order is wrong. |
| **L4** | Die Karte selbst — the raster | **Two modes, honestly.** `oeffentlich` (default): the JPEG is `benannt`-level and **the pins carry the knowledge**. `projiziert`: a masked raster through the existing masked-handout service. **And the thing that must be said out loud: in `oeffentlich` mode „der rote Link ist eine Tür" is weakened for places, because the pixel already told you there is a city there.** That is a real cost of a hand-painted world map, it is not fixable by a data model, and a product that pretends otherwise is lying to a GM about her own handout. |
| **L5** | Das Gewicht | **Two numbers.** `getragen`, computed over the reader's own projection — the one the player sees. `wahr`, over ground truth, `NurLeitung<Gewicht>`, GM-only, with no encoder instance in the player payload codec. **Changed by §6.4 B-21 below.** |
| **L6** | Der Anker | **`Anker` is projected with the `Karte`, not with the `Ort`.** A place you hold, on a map you do not, renders with no position — which is `ohne`'s render path, already built for the common case. |

### 1.7 Das Schema

Reconciled across the three briefs. Column comments name which brief each decision comes from where it
was contested.

```sql
-- ─── der Raum: der Baum ───────────────────────────────────────────────────────
CREATE TABLE ort (
  entry_id        uuid PRIMARY KEY REFERENCES entry(id) ON DELETE RESTRICT,  -- ONE id (§1.5)
  campaign_id     uuid NOT NULL,
  raum_eltern_id  uuid REFERENCES ort(entry_id),      -- exactly one. NULL only for the campaign root
  art             text NOT NULL,      -- welt|region|siedlung|bauwerk|raum|behaelter|weg|unverortet
  massstab        smallint NOT NULL,  -- advisory. nothing in the engine branches on it
  hoehe_von real, hoehe_bis real, ordinal smallint,   -- elevation band, NOT a containment edge
  bewegt          boolean NOT NULL DEFAULT false,     -- the ship (§1.1)
  tiefe           smallint NOT NULL CHECK (tiefe <= 24),        -- ONE constant (§0.1 e)
  kind_keim       text NULL,          -- the derived child seed, stored not computed (§4.2)
  herkunft        jsonb               -- {weltkeim_id} | {import,wiki,pageid} | {hand}
);
CREATE INDEX ort_eltern   ON ort(raum_eltern_id);
CREATE INDEX ort_kampagne ON ort(campaign_id, art);
CREATE UNIQUE INDEX ort_eine_wurzel ON ort(campaign_id) WHERE raum_eltern_id IS NULL;

-- ─── Brettzustand, ansprechbar ────────────────────────────────────────────────
CREATE TABLE ding (
  id               uuid PRIMARY KEY,
  campaign_id      uuid NOT NULL,
  vorlage_id       uuid NOT NULL REFERENCES gegenstand_vorlage(id),
  vorlage_revision integer NOT NULL,          -- IRREVERSIBLE: (template, revision), never template
  behaelter_ort    uuid REFERENCES ort(entry_id),
  behaelter_ding   uuid REFERENCES ding(id),
  traeger_actor    uuid REFERENCES actor_instance(id),   -- carriage: a column, not a Raum edge
  tiefe            smallint NOT NULL CHECK (tiefe <= 24),
  eigengewicht     bigint NOT NULL DEFAULT 0, -- INTEGER, package's smallest unit. never a float
  CONSTRAINT genau_ein_behaelter
    CHECK (num_nonnulls(behaelter_ort, behaelter_ding, traeger_actor) = 1)
);

-- ─── Brettzustand, ein Maß ────────────────────────────────────────────────────
CREATE TABLE posten (
  id               uuid PRIMARY KEY,
  campaign_id      uuid NOT NULL,
  in_ort           uuid REFERENCES ort(entry_id),
  in_ding          uuid REFERENCES ding(id),
  bei_actor        uuid REFERENCES actor_instance(id),
  vorlage_id       uuid NOT NULL, vorlage_revision integer NOT NULL,
  anzahl           bigint NOT NULL CHECK (anzahl > 0),
  zustand_hash     text NOT NULL,             -- the stack key
  platz            jsonb NULL,                -- ONE nullable column = the whole grid-inventory option
  CONSTRAINT genau_ein_halter CHECK (num_nonnulls(in_ort, in_ding, bei_actor) = 1)
);
-- NOTE: no foreign key anywhere in this schema points at posten.id.
--       "a Posten cannot be a parent" is therefore unrepresentable, not policed.

-- ─── alles, was nicht räumliche Enthaltung ist ────────────────────────────────
CREATE TABLE bezug (
  id         uuid PRIMARY KEY,
  von_entry  uuid NOT NULL REFERENCES entry(id),
  art        text NOT NULL,   -- gehoert_zu|regiert|besitzt|sitzt_in|durchgang|beruehrt|grenzt_an|…
  nach_entry uuid NOT NULL REFERENCES entry(id),
  von_jahr   integer, bis_jahr integer,     -- IRREVERSIBLE: the corpus already dates its own edges
  quelle     text NOT NULL,                 -- karte|infobox|absatz|erzeugt|hand
  passage_id uuid NULL REFERENCES passage(id)
);
CREATE INDEX bezug_von  ON bezug(von_entry,  art);
CREATE INDEX bezug_nach ON bezug(nach_entry, art);

-- ─── Karten und Anker ─────────────────────────────────────────────────────────
CREATE TABLE karte (
  id uuid PRIMARY KEY, ort_id uuid NOT NULL REFERENCES ort(entry_id),
  bild_asset_id uuid, breite integer, hoehe integer,
  bounds jsonb NOT NULL,                     -- Kaya's own contract, adopted verbatim
  origin text NOT NULL,                      -- bottom-left | top-left
  koord_reihenfolge text NOT NULL,           -- xy | yx
  massstab_m_pro_einheit real,               -- nullable: most fantasy maps have no scale bar
  art text NOT NULL,                         -- welt|region|ort|grundriss|taktisch
  grundriss_sichtbarkeit text NOT NULL DEFAULT 'oeffentlich',   -- L4
  herkunft jsonb
);
CREATE TABLE anker (
  karte_id uuid REFERENCES karte(id), ort_id uuid REFERENCES ort(entry_id),
  geometrie_art text NOT NULL,               -- punkt | umriss | pfad | OHNE  (first-class, §1.4)
  geometrie jsonb, ab_zoom real, bis_zoom real,
  PRIMARY KEY (karte_id, ort_id)
);

-- ─── Herkunft der Erzeugung ───────────────────────────────────────────────────
CREATE TABLE weltkeim (
  id uuid PRIMARY KEY, campaign_id uuid NOT NULL,
  erzeuger text NOT NULL, version text NOT NULL, seed text NOT NULL,
  optionen jsonb NOT NULL,                   -- the COMPLETE option vector, canonically ordered
  keim_hash text NOT NULL,                   -- sha256(erzeuger|version|seed|canonical(optionen))
  quelle text NOT NULL,                      -- import | erzeugt
  eingelesen_at timestamptz NOT NULL
);

-- ─── der Akteur, an genau einem Ort ───────────────────────────────────────────
ALTER TABLE actor_instance ADD COLUMN steht_in_ort uuid NULL REFERENCES ort(entry_id);

-- ─── der Lesepfad: abgeleitet, wegwerfbar, hinter einer Grenze (§0.2) ─────────
--     EITHER a closure table OR a materialised path. The truth is raum_eltern_id.
```

### 1.8 Was heute festgelegt wird, und warum jede Zeile nicht warten kann

**This is the section Kaya's migration rule is for.** Every row is a column or a constraint. **None of
them is a day.** Each carries the reason it is unrecoverable later, not merely expensive.

| # | Committed now | Why it cannot wait |
|---|---|---|
| 1 | **`Raum` and `Bezug` are different tables** | Merging them later is one migration. **Splitting them later is data archaeology** — once anything has been written into one `parent` column with mixed semantics, no query can tell a spatial parent from a political one, and §1.6's leak is already shipped. |
| 2 | **`Ort` is a facet of `Entry` — one id** | Every URL, revelation, link and export references it. Splitting one id into two is a rewrite of the link graph, and the corpus already shows one polity wearing three identities. |
| 3 | **The `Ort`/`Ding`/`Posten` lattice (boundary A)** | You cannot retrofit identity onto stacks that were never individuated, and you cannot retroactively de-individuate rows that have citations pointing at them. |
| 4 | **`vorlage_ref = (vorlage_id, vorlage_revision)`** | A database that stored `vorlage_id` alone has **permanently lost** which revision each instance was made from. **No migration recovers it.** The cheapest irreversible decision in the round — one integer column — and the most expensive to omit. |
| 5 | **`bezug.von_jahr` / `bis_jahr`** | Two nullable columns now; a migration of every edge later, and **every edge written in between is undated and unrecoverable.** The corpus already dates two of Blattheim's six real edges in the authors' own wikitext. |
| 6 | **`Anker` as a row per `(Karte, Ort)`, geometry on the child, `ohne` as a value** | Anchors accumulate from imports and generators. Re-keying them means re-deriving geometry a human authored by hand. |
| 7 | **`Karte`'s coordinate contract (`bounds`, `origin`, `koord_reihenfolge`)** | Taken verbatim from the corpus's own format and from IMDF. Changing the convention silently re-projects every anchor ever placed. |
| 8 | **R-P1 / R-P2 / R-P3 / R-P4** | It is the permission model. Anything revealed under a looser rule **cannot be un-revealed.** |
| 9 | **`Ding` and `Posten` are on the `Zustand` substrate, not the canon substrate** | Moving 30,000 loot rows into the `Entry` namespace later means minting them into canon — exactly what `Nichts wird automatisch Kanon` forbids. |
| 10 | **Integer-only physical units** | Retrofitting integers onto stored floats loses the originals, and gate **Nachgerechnet** (byte-identical replay on three platforms under locale `tr-TR`) cannot be satisfied retroactively. `0.1 + 0.2` in a container rollup is exactly the bug that gate exists to catch, one domain over. |
| 11 | **Containment in the export format, including paths and `Posten` identity** | *You cannot un-ship bytes.* An export that flattens containment cannot be re-imported into a nested world, and every client, every third-party integration and every warranted round-trip built against the flat version must change when it is fixed. Round-trip parity (`export → import → diff empty`) must include it **from the first export that ever leaves the building.** **This is why the tables are created empty in slice 1 even though no inventory ships.** |
| 12 | **`posten.platz jsonb NULL`** | One nullable column **is** the entire grid/slot/Tetris-inventory option. Present from day one, it is buildable later with **no schema change at all**; absent, it is a migration of every stack in the world. Kaya's rule read correctly in both directions in one line. |
| 13 | **The `Weltkeim` struct (~100 bytes)** | `seed` alone is not a re-derivation key and this is measured, not argued: same seed, canvas 1280×720 → 1600×900 → **0 of 664 burgs keep `(id, name)`; 8 of 664 names survive at all (1.2 %); 1 of 25 state names survives** [Autorenangabe, RB-21d]. A world stored without its complete option vector and generator version **can never be re-derived**, and the loss is silent. |
| 14 | **`ort.kind_keim` stored, not computed** | Azgaar computes `seed + String(i).padStart(4,"0")` and throws it away. The derived child seed becomes **underivable** the moment the parent's option vector is lost. One text column makes *„die Stadt Blattheim"* a re-addressable artifact forever. |
| 15 | **The `Unverortet` root** | One row, and it is the entire 21:00 case (§1.1). |

### 1.9 Hinter einer Grenze — hier bleiben wir billig

Everything below may be wrong at the cost of a keypress, a constant or a swap. **Nothing here is
built maximally, and that is the discipline, not the compromise.**

| Behind the boundary | The boundary |
|---|---|
| Whether the read path is a closure table, a materialised path, `ltree`, or a recursive CTE | The truth is `raum_eltern_id`. All caches, rebuildable. §0.2, and the 0.5-day spike decides it |
| The `Ort` / `Ding` line (is a chest canon or board state?) | **Die Beförderung** — one-way, audited, human. A wrong line costs one keypress per row |
| The `Posten` / `Ding` line | **Die Erhebung** — same shape, same cost |
| `massstab` — the scale ordinal | Advisory. Nothing branches on it; it orders a dropdown. Add levels freely |
| `bezug.art` — the relation vocabulary | An open enum with a per-campaign extension table. R-P3 guarantees nothing in the engine branches on it, so adding `pilgert_nach` costs a row |
| `MAX_TIEFE = 24` | One constant |
| Every physics rule (`gewichts_regel`, capacity dimensions, nesting legality) | **Declarative package data, never code.** A new system ships new *data* |
| The rendering of a level (map, outline, list) | All views over the same three tables. §1.4's ruling means the canvas arrives in slice 2 with no data change |
| `anker.ab_zoom` / `bis_zoom` | Presentation. `NULL` is a valid answer forever |
| Which generator produces a world | **`ErzeugerAdapter: (Weltkeim) → Ort[]`** (§4.4) — import, embed and reimplement become three implementations of one interface |

### 1.10 Das Vokabular — und was diese Runde zurücknimmt

Nemesis's B-30 counts **≈35 newly named concepts, ≈11 new gates and zero retirements** in one round,
in a product whose closest competitor is losing customers to a rival whose entire marketing page is
titled *„World Anvil Is Overwhelming."* **P6's `die Verjüngungsregel` — no round adds a named surface
without retiring one or recording why it cannot be retired — has never once been applied. It is
applied here.**

**Committed to the product's vocabulary — ten names, and the GM meets three of them:**

`Ort` · `Ding` · `Posten` · `Bezug` · `Karte` · `Anker` · `Weltkeim` · `die Beförderung` ·
`die Erhebung` · `Übergang`/`Vergrößerung`.

**Struck as synonyms of the above — these names do not enter the product:**

`Knoten` (RB-21b, RB-21d) → **`Ort`** · `Kante` (RB-21d) and `Nebenkante` (RB-21b) → **`Bezug`** ·
`rahmen` (RB-21d) → the columns already on **`Karte`** · `Schleifenwacht` (RB-21b) → it is a database
constraint, not a concept anyone meets · `Bandsperre`, `Aufstieg` → rule ids **R-P1/R-P3**, not names.

**Deferred with the item half and not in the vocabulary until it is built (§6):** `Fassung` ·
`Verschachtelungsregel` · `Angleichung` · `Bausatz` · `Durchsuchung` · `Verbundlast` · `Griffweite` ·
`Zugriff` · `rohblock` · `ErzeugerAdapter`.

> **≈35 proposed → 10 committed, 5 struck, 10 deferred. The Erststundenbudget cost of this entire
> ruling is zero named concepts**, because with the `Unverortet` root a first-time GM reaches her
> first minted paragraph without meeting the graph at all. **That is a claim and it is gateable**
> (W-G9, §6.5).

---

## 2. Karten und Inventar: ein Mechanismus oder zwei?

> **Ein Mechanismus. Eine Kante, zwei Spezialisierungen, und die Linie läuft exakt dort, wo die Physik
> anfängt — nicht dort, wo der Maßstab wechselt.**

**Kaya is right, and RB-21b establishes why with four uses that are genuinely identical for a chest and
for a city:** projection (*what is at this node, for this reader, right now*), door ordering, the mint
gesture, and reachability. RB-21a supplies the correct formulation of *why* they are identical, and it
is the best sentence produced in this round:

> **Der eine Graph ist die Kante, nicht die Zeile.**

That single sentence is what lets maps and inventory be one mechanism **without putting loot in the
encyclopedia** — the thing a naive implementation loses in week one.

**The line, drawn precisely.** Everything is shared until one of exactly two predicates fires:

| | Boundary | Predicate | Places | Items |
|---|---|---|---|---|
| **A** | **Ansprechbarkeit** | is this an addressable thing or a measure? | always addressable (`Ort`) | either (`Ding` or `Posten`) |
| **B** | **Physik** | does this node carry a `Fassung` (capacity + weight rule)? | `NULL`, always, in every slice | present on containers, absent on a table-top |

**`Fassung IS NULL` short-circuits every line of the item half's machinery**, so a region costs exactly
zero for physics it does not have. That is why one mechanism is affordable rather than merely elegant.

**And RB-21b's strongest argument is the one that makes the DAG refusal a ruling rather than a
preference**, so it is repeated here in its own words:

> *"Capacity and weight are only definable on a tree. If a thing has two parents, „how heavy is this
> bag" has no answer without a convention, and every convention double-counts or arbitrarily halves.
> So the DAG must be refused **precisely where the physics lives**, and it may be permitted everywhere
> else, where it costs nothing."*

**Four things I take from the prior art without modification, because they were paid for by somebody
else's decade** [all gelesen by Hephaistos in the source, not from blog posts]:

1. **PF2e's `stowsItems`** — the distinction between a container that changes *physics* and one that
   only changes *presentation*, with non-stowing containers erased before any arithmetic. Without it,
   `20 Pfeile im Köcher` computes differently from `20 Pfeile lose`, which is a bug every naive
   implementation has. In our model it is `Fassung IS NULL` on a node whose children are still grouped
   in the UI.
2. **PF2e's conditional discount** — cancelled by overfilling, cancelled by nesting
   (`extradimensionalParadox`). A bag of holding inside a bag of holding **stops discounting** rather
   than exploding. NetHack's detonation stays available as declarative package content, never as code.
3. **PF2e's `ejectContents()`** — contents move to the next-higher container. The answer to *"the bag
   was destroyed"* that is neither orphaning nor cascading deletion.
4. **NetHack's merge-on-insertion.** Stacking merges inside the insert primitive, server-side, in one
   transaction.

**And the five mistakes the market makes, each refused by a structural property rather than by care:**

| # | The mistake | Who | Refused by |
|---|---|---|---|
| 1 | **The cycle guard lives in the drop handler** | Foundry `dnd5e` and `pf2e`, both [gelesen] | A constraint below the application. There is no code path to bypass because there is no code path |
| 2 | **The rollup is a hand-invalidated cache** — 76 sites, 27 files, and the insertion primitive is not one of them | NetHack [gemessen by Hephaistos] | Derived from one indexed query; one invalidation site; a fuzz gate that diffs cache against recomputation |
| 3 | **The same physics rule written twice** — and the second copy rots first (NetHack's comment outlived the macro it referenced) | NetHack [gemessen] | One declarative rule, one evaluator, shipped as package data |
| 4 | **Containment as a label, or not at all** | Fantasy Grounds (a free-text `location` string), Roll20 (repeating sections cannot nest) [both gemeldet] | An edge with a foreign key |
| 5 | **Permission inherited from the parent document**, so seeing the container means *receiving* its contents | Foundry, **by design** — *"Embedded Documents defer to their parent ownership"* [gelesen, Foundry API docs] | The contents are never on the client. §1.6 |

**The empirical support for doing this now rather than later is Foundry's own history, and it has
dates on it** [gemessen by Hephaistos via the GitHub API]:

> `dnd5e` issue **#729**, *"Native item container support"* — opened **2020-10-23**, closed
> **2024-01-31: three years, three months, eight days.** Issue **#2782**, *"Users lack permissions to
> update containers nested within their sheets"* — opened **2024-02-01, one day later.**
>
> **The most-installed system on the leading VTT took three years to retrofit containment and produced
> a permission defect on nested contents within twenty-four hours.** That is Kaya's migration rule with
> a receipt, and it is why the schema is ruled today and the physics is not built today.

---

## 3. Die Türen

### 3.1 Was Apollon behauptet hat, und was davon hält

Apollon's hypothesis: *"Containment gives doors a natural ordering: a door is only live at the level
you are standing on. Not 1,253 doors — the four in this room."*

**Ruled, in four clauses:**

| Clause | Verdict |
|---|---|
| *A door is live at exactly one level — the level of its spatial parent* | **Upheld, and it is the rule.** An `Ort` door renders at its parent and nowhere else. Never at the grandparent, never at the root |
| *„Not 1,253 — the four in this room"* | **Right at the median, wrong at the tail.** Real corpus fan-out: min 2 · median 5 · mean 11.9 · **max 33** [gemessen, reproduced today]. §3.3 sharpens this into something more useful than a range |
| *Containment defuses the doors problem* | **Refuted as stated. It orders roughly one door in five and leaves the other four exactly where they were.** §3.2 |
| *It is a fix* | **It is a presentation fix, not an economics fix.** RB-12 §5.4's finding stands unimproved and this round does not get to claim it. §3.4 |

### 3.2 Die Zahl, zweimal gemessen — und RB-21a wird nach oben korrigiert

**Nemesis's B-22 is upheld on method.** RB-21b's §1.4 asserted that place-doors are *"a large share of
the 113 tier-1 doors"* from four examples it had already seen quoted — sampling on the dependent
variable, in a brief whose own method section says *„Read code, not blog posts."* **RB-21b §1.4 is
corrected by name and the phrase is retracted.**

**But RB-21a's number is a floor derived from one signal, and I measured a second.** RB-21a joined the
689 redlink targets against the map's marker titles and category names. That join **structurally cannot
see a place that is not on the map** — and RB-21a's own best finding proves the mechanism: **Andaria is
not a marker on Andaria's own map.** The continent with 67.1 megapixels and 190 pins is invisible to the
method that counted places.

**So I ran an independent second join: against the values of place-typed infobox fields**
(`Geburtsort`, `Todesort`, `Sterbeort`, `Heimat`, `sitz`, `regierungssitz`, `Region`, `Stationierung`,
`Land`, `kontinente` — chosen from the corpus's own 115 distinct parameter names, conservatively, and
listed so the choice can be attacked) [gemessen, 2026-07-27, `fixtures/eron/articles.json` ×
`graph.json`]:

| Signal | Distinct redlink targets that are a place | Tier-1 (≥3 inbound) |
|---|---:|---:|
| **Map** (markers + categories) — RB-21a's method, reproduced exactly | **69** | **18** |
| **Place-typed infobox fields** — new, this ruling | **36** | **24** |
| Overlap between the two | 19 | — |
| **Union** | **86** | **29** |

| | RB-21a's published figure | **Union, measured today** |
|---|---:|---:|
| Share of the 689 distinct redlink targets | 10.0 % | **12.5 %** |
| Share of the 1,253 red **edges** | 14.5 % | **21.2 %** (266 of 1,253) |
| Share of the **113** tier-1 doors | 15.5 % | **25.7 %** |

**Eleven tier-1 doors that the map join could not see and the infobox join could**, in demand order:
`Andaria` (15), `Königreich Terabur` (13), `Minenreiche` (12), `Geeintes Elfenreich Demmaros` (9),
`Tal` (7), `Königreich Numerien` (4), `Königreich Eromir` (4), `Palekun` (4), `Kleingebirge` (3),
`Königreich Tal` (3), `Provinz Akkator` (3).

**And 86 is still a floor, provably.** `Versteck der Flüsterer in Blattheim` — **5 inbound, a tier-1
door, and a child place named only inside another article's prose** — is invisible to *both* signals
[gemessen]. Neither a marker nor an infobox value; a place that exists only in a sentence.

> **Ruled — and this is the sentence that goes into copy, into the champion, and nowhere else in any
> other form:**
>
> **„Die Verschachtelung ordnet ungefähr jede fünfte Tür — und das ist eine Untergrenze."**
>
> Never *„a large share."* Never *„containment defuses the doors problem."* And never the reverse
> error either: **10 % was measured honestly and is too low**, because the instrument was a map and
> the biggest places are not on it.

**Two corpus corrections, made by name:**

1. **RB-21b §1.4** — *"a large share of the 113 tier-1 doors"* → **25.7 %, measured two ways.**
2. **RB-21a's 116 vs. 113** — Nemesis flags this as *"a typo in the most careful brief in the round."*
   **It is not a typo; it is two different quantities and one mislabelled row.** RB-12 §5.4's own
   distribution table reads *"3–4 → 72, cumulative 116 (of which 3 are notation)"*, and the `Tür` tier
   is **113 after the notation guard** (`^[NnVv]\.\s?K\.?$`). So **116 = targets with ≥3 inbound;
   113 = tier-1 doors.** RB-21a §6.1's row is labelled *"Tier-1 doors"* and carries the pre-guard
   figure. **Both numbers stand; the label is wrong. All shares in this document are computed against
   113.**

### 3.3 Was ein Stockwerk anzeigen muss — und die Verteilung ist zweigipflig

The fan-out figure everyone quotes as a range is not a range. Markers per map category, the full
distribution [gemessen, reproduced today]:

```
2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 7,   ← eleven containers of ≤7
                                26, 28, 28, 30, 33   ← five containers of ≥26
```

> **There is nothing between 7 and 26 in the real corpus.** *„Min 2, median 5, mean 11.9, max 33"* is
> arithmetically true and descriptively misleading: **the distribution is bimodal, and a renderer that
> degrades gradually is optimising for a case that does not occur.**

**Ruled: two render modes, not a gradient.** Below the knee (≤ ~8 children) every child renders as a
door. Above it, RB-12 §5.4's three tiers (`Tür` ≥3 inbound · `Spur` =2 · `Notiz` =1) are computed
**within the subtree**, so a container of 33 shows its own top six and the rest are addressable and
searchable. **A container rendering 33 rings is a hedgehog**, and RB-20b §2's measured a11y ceiling of
~500 focusable DOM objects is the wall a region with 900 settlements hits.

### 3.4 Was die Verschachtelung nicht repariert — Nemesis B-23, unangetastet

**B-23 survives this ruling completely intact and the correction in §3.2 does not dent it.**
Recomputed with my union figure [computed, from RB-12's 689/1,253, this document's 86, and RB-21d's
1,093 distinct generated names, against CHAMPION §4.9's ≈5 Vollmachten/week]:

| | Doors, distinct | Orderable by containment | **Not orderable** | Weeks @ ~5/wk |
|---|---:|---:|---:|---:|
| The wiki as imported | **689** | 86 (12.5 %) | **603** | **138** |
| **+ one generated world** | **1,782** | 1,179 (66.2 %) | **603** | **356** |
| Δ | **×2.59** | ×13.7 | **unchanged** | **×2.59** |

> **Containment's coverage rises from 12.5 % to 66 % only because the round manufactured the
> numerator. The absolute number of doors containment cannot order is 603 before and 603 after. The
> supply is unchanged. The absolute number of doors is up 2.6×.**

**Both of the round's contradictory headlines are true of their own corpus and averaging them produces
a lie**, so the verdict carries both, attributed, and prints neither alone:

- **RB-21a:** *"It is a UI fix, not an economics fix. RB-12 §5.4's finding stands unimproved, and this
  brief does not get to claim it."*
- **RB-21d:** *"The generated containment graph has a strictly tighter door distribution than the
  human-written wiki it is supposed to overwhelm"* — **true, and true only of a generated corpus**,
  whose p50 of 4–6 genuinely beats a hand-written wiki's 9.3 per article.

### 3.5 Zwei Türpopulationen, und die Schlagzeile bleibt bei der ersten — Nemesis B-24

B-24 is the sharpest of Nemesis's door findings and it is upheld:

> *"1,049 of 1,093 are hidden, by design, and a directory entry you have not navigated to is not a
> provocation — it is a filesystem."*

**Ruled: they are two different door populations and the product must never let one wear the other's
sentence.**

| | **Die Tür im Satz** — the champion's | **Die Tür im Raum** — containment's |
|---|---|---|
| Where | inside somebody's prose, unbidden, mid-sentence | in a child list, after you navigated there |
| Population | 9.3 per written article; 55 % of passages carry ≥1; one passage carries 77 | median 5, bimodal (§3.3) |
| What it is | **a provocation** | **an index** |
| Owns the headline flex | **yes, exclusively** | **never** |

> **The headline flex „der rote Link ist eine Tür" stays attached to the inline red link and is never
> illustrated with a generated world's child list.** Nemesis's scenario — a launch post over a
> screenshot of a generated world, a reviewer opening three of forty-four names and asking where the
> other thousand are — is closed by refusing the marketing move, not by inventing a mechanism.
> The honest answer *„they are addressable and searchable"* is the answer World Anvil gives about its
> own 28 templates, and RB-18 §3.1 recorded what users call that.

### 3.6 Was die Verschachtelung wirklich gewinnt, und es ist mehr wert als die Behauptung, die es ersetzt

1. **Containment orders exactly the doors a generator manufactures**, and the converse is the same
   finding from the other side: *the 90 % containment cannot order are the ones a generator cannot
   produce either.* Neither helps with `Andarisch` — **18 inbound, the single most-wanted missing page
   in the entire wiki, and a language.**
2. **The import gains 187 doors the wiki never had, and they are the best doors in the corpus.** Of
   190 map markers, only **3** exist as articles (`Akkator`, `Kukiria`, `Bjoldiri`); **187** are named,
   positioned places with no article, **54 of them carrying 9,512 characters of the author's own
   prose** [gemessen, reproduced today]. **A door with a position, a faction and a paragraph is very
   nearly a `Keim` the GM did not have to write** — which is CHAMPION §15.9's four-round-old cold-start
   wound, addressed from the import side.
3. **Die Saatbilanz on import day reads `0 Absätze im Kanon · 190 Orte · 187 Türen`** — *emit doors,
   not articles*, arriving at the same mechanism from the import side that RB-20d reached from the
   generation side.
4. **And one caution from the same data:** 5 of the map's 16 categories — `Freie Städte`,
   `Magische Akademien`, `Atlanische Ruinen`, `Dünenmeer`, `Klipplande` — exist neither as an article
   nor as a redlink. **The map introduces container nodes the wiki has never named**, and the import's
   human mapping screen must handle a parent that exists nowhere in the prose.

---

## 4. Die Erzeugung — geurteilt je Maßstab

**Athena's permission list is binding and no ruling below overrides a CRITICAL.** Her two:
**(1)** the 179 CC-BY-NC-SA-3.0 charges may never ship in a sold product; **(2)** TinyMCE 7.1.0
(GPLv2-or-later, live, not dead ballast) may never ship in a proprietary binary. Nemesis adds a third
finding to that ledger and it is accepted: **jQuery 3.1.1 (2016) with CVE-2020-11022, CVE-2020-11023
and CVE-2019-11358, live via a `<script>` tag in a 654,014-byte `src/index.html`** [gemessen by
Nemesis via raw fetch].

### 4.1 Die Unterscheidung, die alles trägt: seinen Code brauchen ≠ sein Format sprechen

The brief asks for this distinction by name and it is the whole answer at three of four scales.

| | **Depending on his code** | **Speaking his format** |
|---|---|---|
| What it is | we execute his bytes inside our process | we read and write the same strings he does |
| Licence exposure | everything in his shipping tree becomes ours to clear | **none** — a file format is not a work |
| Bus factor | inherited whole | **zero** |
| CVE surface | inherited whole | zero |
| Upgrade | a migration | nothing |
| Example | vendoring FMG's `dist/` and driving `window.pack` | computing `seed + String(i).padStart(4,"0")` ourselves and storing it as `ort.kind_keim` |

> **Ruled: we speak every format in this ecosystem and we depend on nobody's code below the world
> scale — and at the world scale we defer the dependency rather than take it (§4.2).**

### 4.2 Weltmaßstab — Import-only jetzt, Einbettung aufgeschoben und bedingt

RB-21d's Shape B1 — *"Embed the built bundle, unmodified… **we ship their `dist/`**"* — is priced at
5→6 days and called the cheapest thing in the brief. **Nemesis's B-25 destroys it as written and the
mechanism is a one-line fact** [gemessen by Nemesis, `curl …/master/vite.config.ts`]:

```
build:     { outDir: '../dist', assetsDir: './' },
publicDir: '../public',
```

`publicDir` is Vite's **copy-verbatim** directory. `npm run build` copies **all 21.49 MB of `public/`**
into `dist/` untouched — the 179 non-commercial charges, the 11.1 MB of provenance-less textures,
`public/libs/tinymce/`, `openwidget.min.js` with **Azgaar's own hard-wired LiveChat organisation id**,
a `googletagmanager.com` include, and the 2016 jQuery.

> **„We ship their `dist/`" is, verbatim and by default, „we ship both of Athena's CRITICALs plus three
> published CVEs." Shape B1 as written is REFUSED. Not deferred — refused.**

**And the remedy is not a subtraction.** Athena's recommendation is *„nimm `src/` plus die
Datenexportpfade, lass `public/` liegen"* — but `src/index.html` is 654 KB carrying **12 live `libs/`
script and link tags**, and 19 of 23 generator files import d3 while 9 touch the DOM. **Deleting
`public/` and then making it run is work nobody in this round has priced, and I will not price it
either. No reliable figure found.** It is the round's **second unpriced load-bearing line**, and
Nemesis is right that a ledger with two of those is a floor, not an estimate.

**So the ruling takes the branch that owes none of it:**

| Shape | Ruled | Why |
|---|---|---|
| **A · Import-only** — the GM generates on Azgaar's own site and drops a `.map` / Full JSON | **TAKEN, for slice 1 and slice 2** | Zero fork, zero vendoring, zero `dist/`, **zero CRITICALs, zero CVEs, zero bus factor, no version pin, no strip to price.** The file *is* the artifact, so `keim_hash` records provenance over something we hold rather than over something we must still be able to execute |
| **B1 · Embed a stripped fork** | **DEFERRED and conditioned**, not refused | It is the only thing that turns `seed → world` into a function whose calling convention we own — real value, and it is what makes the pinned option vector honest. **Conditions: the strip is priced; gates „Saubere Tüte", „Vollständige Nennung" and „Der alte Kasten" are green; Athena re-reviews the stripped tree.** `OPEN-DECISIONS.md` **N3** |
| **B2 · Fork the generators into `packages/`** | **REFUSED** | 698 `pack` references, 97 `grid`, 11 `ensureEl(`, a 16-phase pipeline living in **1,337 lines of untyped `public/main.js`** with three replication sites, against a bus factor of one that shipped four feature releases in 2026. RB-21d declines to price it and says *"any estimate would be a fiction"* — correct, and **an unpriced mitigation is not a mitigation** |
| **C · Reimplement** | **REFUSED for now, kept reachable** | The honest external calibration: Dungeon Alchemist spent four years, €2.46 M and a studio; Azgaar has spent nine years and 489 commits. Kept reachable by `ErzeugerAdapter` (§4.4) |
| **Upstream — contribute the model to Azgaar** | **REFUSED as a strategy, ACCEPTED as a courtesy** | Upstreaming a containment/anchor model into a repo whose own architecture doc opens *"the current architecture is a mix of different patterns and styles"* buys nothing we can hold; **the grant we need is already in the licence.** What we should do costs an hour: file the `burg.province` finding (§4.3) as an issue. Goodwill, no dependency |

**Two lines of RB-21d's ingest work are column-shaped and are taken now at ≈0 days**, because they are
irreversible and the rest is not: **the `Weltkeim` struct** (§1.8 row 13) and **the `cells.province`
join stated as a contract** (§4.3) — the latter being a *correction to a committed line*, not new work.

### 4.3 Die zweizeilige Tatsache, die den ganzen Vorschlag lautlos zerstört hätte

RB-21d's single most valuable finding, and it binds every shape [gemessen by RB-21d, `keim3/keim4.mjs`]:

```
burgs on a freshly generated map:                                     664
burgs where `burg.province` is defined:                                 0
burgs where `pack.cells.province[burg.cell]` resolves a province:     664
```

`burg.province` is written by **exactly one line in the whole repository** — a UI controller that runs
only when a human opens the province editor.

> **The parent edge is not on the child. It is in `pack.cells.province[]`, a `Uint16Array`.**
>
> **Ruling — the ingest contract, in one line: read the Full JSON *with* `PackCells`. Never the
> Minimal export. Never GeoJSON.** The Minimal export has no cells and therefore **cannot reconstruct
> the containment graph at all**; FMG's GeoJSON carries five layers (Cells, Routes, Rivers, Markers,
> Zones) whose integer foreign keys point into tables the file does not contain — **it has the geometry
> and not the names.** GeoJSON is our **egress** target, in exactly Azgaar's five layers, because it is
> the only world-scale format anyone else reads.

**This correction lands on a line the crew has already committed** (RB-20 §5.3 lines 3–5, die Türsaat's
parser and mapper, 10 days inside slice 1). **It changes the specification and adds no days.**

**Three further rulings fall straight out of RB-21d's measurements and are adopted:**

1. **Culture, religion and biome are not containment.** They cut *across* states 16–17 times in 25.
   They are `Bezug`.
2. **Routes and rivers are not nodes with a parent; they are nodes with a computed LCA parent and a set
   of touched nodes** (`Bezug(weg, beruehrt, region)`, as many as you like) — 324 of 575 routes cross
   ≥2 provinces; 136 of 157 rivers cross ≥2 states.
3. **Landmass and polity are parallel axes, not two levels of one tree.** 8 of 25 states span more than
   one landmass. **`liegt_in_geografie` is `Raum`; `gehoert_zu_herrschaft` is `Bezug`.** This is
   exactly §0.1(a), arriving from the generator's own data.

**And two things the generator produces that we must actively refuse:**

- **Prose.** 56 markers arrive carrying **5,915 characters of generated English legend HTML** into a
  German world. **Ruled: `kind: rohblock`, inside a bordered card headed „Vom Generator erzeugt —
  nicht geprüft", with generator, version and `keim_hash` beneath. Citable, addressable, never a
  `Quelle`.** Default: import the **structure**, suppress the **prose**, opt-in only. Identical to
  RB-12 §2.8's treatment of an unconvertible wikitable, for the identical reason: *a silently dropped
  construct is a lie about completeness, and a silently promoted one is a lie about authorship.*
- **Names as identity.** 1,163 generated names collapse to 1,093 distinct — **70 collisions**, worst
  being `"1st Fleet"` × 19. **Key on `Ort.entry_id`, never on `titel`.** Same finding RB-12 already
  proved in the prose domain (content hash survives 88.9 %, ordinal position 0 %), second domain.

### 4.4 Die lokalen Maßstäbe — Import ist der erste Bürger, nicht der Notbehelf

Athena's §6 makes this a legal fact rather than a preference: `TownGeneratorOS` is **GPL-3.0**
(incompatible with a sold proprietary product), `RuneGeneratorOS` and `CompassOS` carry **no licence at
all** (public ≠ licensed), and for Village, One Page Dungeon, Dwellings and Mansion **no source exists
publicly**. Watabou himself: *"unless I am done with a project I don't make its code public."*

Against that, his **output** terms are the most generous in the entire corpus: *"You can use maps
created by the generator(s) as you like: copy, modify, include in your **commercial** rpg adventures
etc. Attribution is appreciated, but not required."*

> **Ruled: below the world scale, import is the only legal way to create a child node. Therefore the
> containment model carries „imported child node" as a first-class case, never as a fallback.** A model
> that builds *generate-in-place* as the normal case and *import* as the exception is wrong at exactly
> the scale Kaya asked for.

| Scale | Generator | Path | What we store |
|---|---|---|---|
| World / continent | **Azgaar FMG** (MIT + output grant) | **Import the Full JSON + PackCells** (§4.2, §4.3) | `Weltkeim`, the containment projection (**863 nodes, 21 KB gzipped — 4.4 % of the 2.5 MB export**), the raster as tile pyramid |
| City · village · dwelling | **Watabou** (closed) | **Link out and import** his JSON/GeoJSON. Never fork, never vendor, never read-and-reimplement-from | `ort.kind_keim` = the derived child seed we compute ourselves; the imported object graph as `Ort` + `Anker` |
| Dungeon interior | **Watabou One Page Dungeon** (closed) · **donjon** (source **CC BY-NC 3.0** — forbidden) | Import JSON only | as above |
| Battlemap / room | Dungeondraft · DungeonFog · Arkenforge · Dungeon Alchemist | **UVTT in and out** — already ratified, already ledgered at 6 days | walls, portals, lights, for free, by reading a file |

**The seam this whole beat is really about, stated once:** the mechanism to cross scales already exists
in Azgaar's code and has for years — a derived child seed plus **seventeen derived parameters** and a
tag vocabulary, handed to a different author's generator. **And every child world it produces is
rendered into a `pointer-events: none` iframe and thrown away.**

> **The gap is not the generator. It is the address.** `ort.kind_keim` is one text column and it is the
> entire difference: a child artifact that has an id, a parent, a coordinate frame, a permission and a
> history, instead of a picture in a window nobody may enter.

### 4.5 Was `Nachrechnen` über einer erzeugten Welt verspricht — und was nicht

Nemesis's B-27 composes three facts nobody had composed: the version pin (*"a bump is a migration, not
an upgrade"*), the untested unknown (*"id survival across an FMG version bump. Not tested. This is the
highest-variance unknown in the brief"*), and `Weltkeim`'s promise (*"everything derived from it is
re-executable, provably"*).

> **They do not close.** To re-derive a world generated under v1.138.2 we must still possess and still
> be able to **execute that exact version** — so either we vendor every version we have ever generated
> with, forever, in a binary, or `keim_hash` is a hash of something we can no longer run.
>
> **Ruled by narrowing the claim rather than by pretending: `Weltkeim` is a provenance record. It is
> not a re-derivation promise, and `Nachrechnen` is not claimed over a generated world, in any copy or
> any UI, until id survival across a version bump is tested.** Import-only (§4.2) makes this
> comfortable rather than painful: the `.map` file the GM dropped **is** the artifact, and we keep it.
> `OPEN-DECISIONS.md` **N7**.

---

## 5. Unity — einmal beantwortet und geschlossen

**The ruling stands and is not re-opened.** RB-11 struck the game-engine candidate at **2/2/2**. The
decisive finding was not performance and not licensing: **no game engine has a rich-text editing
control.** Choosing one turns the wiki half — which is *half the product* — into a multi-month
text-editor project, and drops accessibility from rank 1 to rank 3–4. **Unity, Godot and Unreal are
out.** The runtime is **React/TS + PixiJS, DOM-authoritative, canvas behind a `MapRenderer` boundary,
browser + Electron.**

**What his instinct was right about, in three clauses, because each is worth answering separately:**

1. **He wants real editor tooling, not a toy.** Correct, and it is already priced on the pinned stack:
   RB-20b §8's *der Ortsleger* at **21 days new work (≈25 with contingency)**, with five of its numbers
   measured on **his own 8192² map**. It is **deferred by `OPEN-DECISIONS.md` M3, not refused** — asked
   again when `S-P1`, `S-G1` and `S-K1` are green and somebody has asked twice.
2. **He sensed that "nested" is a *hierarchy* problem, and a game engine is the one kind of software
   that ships a hierarchy in the box.** Also correct — and it is exactly where the instinct
   misidentifies the thing he wants. A scene graph gives you a **transform hierarchy**. It does not
   give you a **permission projection down that hierarchy**, and it has never given anyone one. There
   is no engine, in any price bracket, with an `R-P1`.
3. **He sensed that the two halves should be one structure.** Right, and this ruling is that structure
   — but it is a **column**, not an engine.

**What he gets instead, and it is strictly more than the engine would have given him:**

> **The whole of §1 ships with zero Pixi, zero tile pyramid, zero renderer, zero art and zero
> commissions.** §1.4's ruling — *die Tafel ist die Karte* — means nested containment lands in the slice
> that currently has no canvas at all. **A game engine would have made the rendering easier and the
> nesting no easier at all**, because the nesting was never a rendering problem. It is a schema, a
> permission rule and one column, and the engine has none of the three.

Nothing above re-opens RB-11. This section exists so nobody re-opens it later.

---

## 6. Die Reihenfolge, der Schnitt und die Tore

### 6.1 Die Zahl, unverändert übernommen

**I do not re-derive Nemesis's ledger. I use it.** [RB-21e §5.1, binding]

| | Base days | +20 % | @ 3 dev-days/wk |
|---|---:|---:|---:|
| Ledger entering this round | 237–247 | ≈284–296 | ~22 months |
| **+ the round as priced by its authors (28 + 9 + 5 + 3.5)** | **282.5–292.5** | **≈339–351** | **26 months** |
| *(the map editor the crew declined this morning, for comparison)* | *281–291* | *337–349* | *26 months* |

> **B-28, restated in the crew's own words because softening it would be dishonest: the nesting round
> costs the same as the map editor, within two days, and lands on the same month of the same runway —
> with two of its own load-bearing lines carrying no price at all, so 45.5 is a floor.**

**And B-28's other half, which is the reason this is not simply refused:** RB-21b's own split is
**≈13 of 28 days buying something no rival can be bought to do — 46 %, the second-best fusion ratio
ever recorded in this lineage**, behind die Türsaat's ≈53 % and ahead of the tactical half's 31–48 %.
The other 15 buy parity with what `dnd5e` has shipped since 2024-01-31.

> **So it is not the map editor. It is the map editor's price with die Türsaat's ratio — which makes it
> the most defensible expensive thing this project has ever considered, and it is still 45.5 days
> arriving on a schedule that had none left.**

### 6.2 Der Schnitt — was nicht gebaut wird, ohne Beschönigung

**The honest total says this cannot all be built this round. It is not all built.**

**IN, now — and it costs columns, not days:**

Everything in §1.8: the `Raum`/`Bezug` split · `Ort` as a facet of `Entry` · the `Ort`/`Ding`/`Posten`
lattice as **empty tables** · `vorlage_revision` · `bezug.von_jahr`/`bis_jahr` · `Anker` with `ohne` ·
`Karte`'s coordinate contract · R-P1…R-P4 · integer-only units · containment in the export format ·
`posten.platz` · `Weltkeim` · `ort.kind_keim` · the `Unverortet` root · `actor_instance.steht_in_ort`.

**IN, now — and it costs 3.5 days:**

| Spike | Days | The falsifier, written before it runs |
|---|---:|---|
| **`S-P1 · Drei Bücher, ein Server`** | **2** | The per-character projection exists as running code and three books diverge on one server. **Sixth round. Three independent briefs now call it a hard precondition. There is no argument left** |
| **`S-R1 · Die Hülle`** | **1** | Real corpus → `Ort`, `Anker`, `Bezug`, closure. **If the import produces more than one root per world, or any node with a genuinely ambiguous spatial parent a human cannot resolve in under ten seconds, the tree ruling in §1 is wrong and this document is rewritten rather than patched.** Extended by this ruling: it must also print the **two-signal door count** of §3.2 |
| **Der Teilbaumzug** — 1,000-node subtree move, closure table vs. materialised path | **0.5** | Whichever loses is deleted. §0.2's boundary decided by measurement, not by a brief |

**CUT from this round entirely — 42 of Nemesis's 45.5 days:**

`Fassung` and the whole physics layer · `gewichts_regel` and the rollup · stacking, splitting and
concurrent take · `die Durchsuchung`'s two-phase protocol · `die Verbundlast` · `Zugriff` and
`erreichbar` · `die Angleichung` UI · `Bausatz` · the inventory surface · grid inventories · the
generator embed (B1) · the remaining ingest work beyond the two column-shaped lines in §4.2.

**Ledger effect** [computed]: **240.5–250.5 base, ≈289–301 with contingency** — the round adds 3.5
days, not 45.5, and the 42 are **returned to Kaya with a real number attached** rather than absorbed.
That is M3's shape, applied a second time, deliberately.

**And if the item half is ever built, RB-18 route item 5 binds: sequence the 13 fusion-bearing days
first, and the 15 parity days last.**

### 6.3 Die Vorbedingung, die kein Tor ist, weil sie null Tage kostet

[gemessen by Nemesis, 2026-07-27, at the project root]

```
$ git log --oneline -5
fatal: not a git repository
```

> **Six rounds. Five spikes. Zero commits. No repository.** ≈37 gates are now specified across the
> corpus and **zero of them can execute.** This is the cheapest item in the entire ledger and it is
> not on it. It is a precondition to everything above and it costs nothing.

### 6.4 Nemesis's Brüche, einzeln beantwortet

| # | Break | Answer |
|---|---|---|
| **B-17** | Three schemas, one round, RB-21d's record leaks 89 % under RB-21a's rule | **Ruled §0.1(a).** RB-21d's measurement upheld, its column struck. Dissent recorded under its author's name §0.2 |
| **B-18** | The tired GM at 21:00 gets two answers to *"where does this hang?"* | **Closed by the `Unverortet` root** (§1.1), which Nemesis proposed and nobody wrote. One row |
| **B-19** | A re-parent of an `Ort` is not undoable, stated as a virtue | **Closed by ruling** (§1.1): a re-parent is an ordinary audited edit, because the containment edge's visibility is derived and no `Revelation` is ever granted on it |
| **B-20** | Possession is not containment; `actor.pfad` does not exist; the showcase breadcrumb breaks | **Closed by one nullable column** (`steht_in_ort`) **and R-P4** (§1.3). The pickpocket leak is refused; RB-21b's predicate is rescued; **the showcase sentence is narrowed by one clause and the narrowed version is stated as the true one** |
| **B-21** | `die Verbundlast`'s gate tests the summation, not the subtraction | **Upheld, and the gate is replaced** (§6.5, W-G5). The fix is RB-21a's `getragen`/`wahr` split, which RB-21b never cited; the new gate detects the false-bottomed chest, which the old one could not |
| **B-22** | The round contradicts itself on the one number marketing will quote | **Upheld on method; RB-21b §1.4 retracted. And RB-21a corrected upward with a second measured signal** (§3.2). The 116/113 discrepancy is resolved as two quantities, not a typo |
| **B-23** | Containment multiplies doors 2.6× and hides the increment | **Upheld entirely and unchanged by §3.2's correction** (§3.4). 603 unorderable before, 603 after |
| **B-24** | A hidden door is not the champion's door | **Upheld. Two populations, named, and the headline flex is fenced to the inline red link** (§3.5) |
| **B-25** | B1 prices at one day the audit Athena proves impossible; `publicDir` ships both CRITICALs | **Upheld. Shape B1 as written is REFUSED** (§4.2). The strip is named as the round's second unpriced line and no number is invented for it |
| **B-26** | Nobody audited whether the embedded thing is exploitable — jQuery 3.1.1, three CVEs, inside Electron | **Upheld. Added to Athena's ledger by name, and gate „Der alte Kasten" is adopted** (W-G8). Import-only (§4.2) removes the exposure entirely for now |
| **B-27** | The version pin makes `Nachrechnen` a promise we may not keep | **Upheld. The claim is narrowed rather than defended** (§4.5) |
| **B-28** | The nesting round costs the map editor's price and lands on month 26 | **Upheld, quoted, and answered by cutting 42 of 45.5 days** (§6.1, §6.2) |
| **B-29** | `S-P1` unrun for a sixth round; the round's largest line is unbounded until it runs | **Upheld. `S-P1` is the first line of §6.2 and nothing in §1.6 may be built before it is green** |
| **B-30** | ≈35 names, ≈11 gates, zero retirements, no gate that can go red because the product got bigger | **Upheld, and answered for the first time in the lineage** (§1.10): 10 committed, 5 struck, 10 deferred, and **W-G9 makes the Erststundenbudget claim falsifiable** |

### 6.5 Die Tore — jedes kann rot werden

Written in CHAMPION §12.4's style: a condition, and what it falsifies.

| Gate | Green when | **If red** |
|---|---|---|
| **W-G1 · Der Aufstieg** (`oracles.yaml` row `raum_aufstieg`) | A `Bezug` row **never** appears in any `Sicht` closure computation. Falsifier fixture: RB-21a's 10,023-node tree with 400 organisations; a character holding 20 % of places discloses **zero** organisations | **The schema leaks by construction and no query-level care repairs it.** This is the single most valuable artifact of the round and it costs nothing today |
| **W-G2 · Die Hülle** (`S-R1`, 1 d) | Real corpus → one root per world; zero nodes with an ambiguous spatial parent a human cannot resolve in ten seconds; the printed counts by `art`; **and the two-signal door count of §3.2** | **§1's tree ruling is wrong and this document is rewritten, not patched.** It is the cheapest calibration artifact left in the project |
| **W-G3 · Die Schleifenwacht** | A cycle in `Raum` or in a `Ding` chain is **unrepresentable below the application**, proved by a 3,000-op fuzz of moves, promotions and deletes (reusing `spike-A-passage-identity`'s harness): zero cycles, zero orphans, zero paths that disagree with `raum_eltern_id` | We shipped Foundry's defect: a guard in the drop handler that any macro, import or undo path walks around |
| **W-G4 · Die Trageschranke** | A reader holding a carried `Ding` receives **zero bytes** of the carrier's location chain she does not independently hold; the breadcrumb truncates honestly at *„(bei jemandem)"* | R-P4 is decorative and a successful pickpocket reads her victim's full address |
| **W-G5 · Die Waage lügt nicht nach unten** *(replaces RB-21b's gate, per B-21)* | For an **open** container with *k* visible and *m* hidden children: `composed_scalar − Σ(visible eigengewicht) == 0`. For a **sealed** node: it contributes `eigengewicht` only, or the GM's deliberate `pauschal(w)` | A player subtracts, out loud, at 21:40, and learns there are eleven pounds of something she has not found — while the old gate is still green |
| **W-G6 · Saubere Tüte** *(Athena, verbatim)* | The shipping tree contains **no** file under GPL, AGPL, GFDL, LAL or any `*-NC` licence, and **no** binary without an entry in the provenance register | A sold product ships 179 non-commercial charges and a GPLv2+ editor. **CRITICAL, kein Override** |
| **W-G7 · Vollständige Nennung** *(Athena, verbatim)* | Every shipped third-party asset has a generated entry in `THIRD-PARTY-NOTICES.md` with title, author, source and licence, **reachable inside the product** (Electron: in the binary) | The MIT condition itself is unmet, and the 65 CC-BY-3.0 icon attributions are owed and absent |
| **W-G8 · Der alte Kasten** *(new — Nemesis §4.2)* | No vendored third-party file in the shipping tree has a published CVE for its pinned version. Runs in CI, breaks the build | We execute a nine-year-old jQuery with three published XSS/prototype-pollution CVEs inside an Electron process, over a document assembled from user-supplied `.map` files |
| **W-G9 · Das Erststundenbudget, an der Verschachtelung gemessen** *(P6, applied for the first time)* | From an empty world to the first minted paragraph, a first-time GM passes **≤3 distinct surfaces and ≤7 named concepts**, and **the containment graph contributes zero of them** | §1.10's central claim is false, and the round that finally applied die Verjüngungsregel failed it |

---

## 7. Was das für den Champion und die Arena bedeutet

### 7.1 Arbeitsauftrag am `CHAMPION.md`

| § | Change |
|---|---|
| **§6 (permission spine)** | **Add R-P1 · R-P2 · R-P3 · R-P4 as load-bearing rules of the spine**, with `raum_aufstieg` as a new `oracles.yaml` row and W-G1's fixture as its falsifier. This is the only addition to §6 and it is one rule with four clauses |
| **§8.1 (new tables)** | Add `ort`, `bezug`, `karte`, `anker`, `weltkeim` (populated in slice 1) and `ding`, `posten` (**created empty**, because the export format is versioned from the first export that leaves the building — §1.8 row 11). Add `actor_instance.steht_in_ort` to §8.2 changed columns |
| **§8.3 (explicitly unchanged)** | Reaffirm: **the closed set of five `praegung` handlers stays five.** `die Erhebung` and `die Beförderung` are gestures on existing handlers, not a sixth |
| **§9.1 (der Tisch ohne Leinwand)** | Upgrade the Outline recipe from *concession* to *architecture*: **die Tafel ist die Karte** (§1.4). A `Karte` is an enhancement; nested containment ships in the canvas-free slice |
| **§9.5 (what never ships)** | **Flag, do not re-rule:** the refusal of *"Scene Levels"* is now a refusal of a **core Foundry v14 feature**, not of a third-party module. Note the asymmetry in our favour: our elevation band (`hoehe_von`/`hoehe_bis`/`ordinal`) is a **column we get for free from this schema**, so we may hold the *data* of scene levels without the renderer. `OPEN-DECISIONS.md` **N8** |
| **§12.1 (slice 1 contents)** | Add the containment schema, the `Unverortet` root, `Weltkeim` capture, and **step 13 of the workflow: `export → import → diff empty` must include containment paths and `Posten` identity** |
| **§12.4 (gates)** | Add **W-G1 … W-G9**. Nine gates, against ten retired or deferred names (§1.10) — **the first round in this lineage with a positive retirement balance** |
| **§15 (carried weaknesses)** | Add two, honestly. **(a) Nested maps are parity, not novelty** — LegendKeeper's own front page: *"Nest your maps indefinitely, zoom from continents to crypts, and link every landmark to its wiki page"* [Herstellerangabe], with a published tutorial. **The nesting is the price of admission; the projection down the nesting is the fusion.** **(b) The reconciliation in §0.1 is a ruling, not a measurement**, until `S-R1` runs |
| **§16 (competitive position)** | One row: LegendKeeper ships nesting and their permission wording is *"invite them as free collaborators or send them a public viewing link. **They see what you want, nothing more**"* — share-level, per-viewer at best, **no `erfahrungsgrad`, no fog, no per-character projection.** That gap is the claim, and it is the only claim |

### 7.2 Korrekturen am Korpus, namentlich

1. **RB-21b §1.4** — *"a large share of the 113 tier-1 doors"* → **25.7 %, two signals** (§3.2).
2. **RB-21a §6.1** — the row labelled *"Tier-1 doors"* carries **116**, which is the pre-notation-guard
   count of ≥3-inbound targets; tier-1 is **113** (§3.2). Both figures are right; the label is not.
3. **RB-21a §6.1's place share is a floor**, and the union of two independent signals is 12.5 % of
   distinct targets / 21.2 % of red edges / 25.7 % of tier-1 doors, itself still a floor (§3.2).
4. **RB-21d §5.2 Shape B1** — *"we ship their `dist/`"* is refused; `publicDir: '../public'` makes it
   ship both of Athena's CRITICALs (§4.2).
5. **RB-21d §6.3's `Knoten` record** — `eltern: Kante[]` is struck as containment; the measurements
   behind it are upheld and re-homed on `Bezug` (§0.1a, §4.3).
6. **RB-21a §5.4 and §7.4** — the separate depth cap of 8 on `Ding` chains is struck; one constant,
   `MAX_TIEFE = 24` (§0.1e).
7. **RB-21a §5.4** — *"a re-parent of an `Ort` is NOT undoable"* is struck (§1.1).

### 7.3 Was die Arena bekommt

**The containment schema does not take a rung.** It is not a candidate and it is not a round — it is a
set of columns that lands inside whatever R7 forges, plus 3.5 days of spikes that must run before R7
forges anything. Putting it on a rung would repeat exactly the mistake RB-20 §8 diagnosed: the thing
that produces a diagram eating the rung from the thing that produces a sentence.

**The sharpest open question for the design arena is not the doors — I ruled them in §3. It is this,
and it is unmeasured in both directions across two consecutive rounds:**

> **Does any GM want nested containment?**
>
> Zero demand measurements exist, in either direction, in this round or any prior one (Nemesis §8
> item 6, unchanged from RB-20e §7.1 — and it now carries 45.5 days instead of 65). The market
> evidence is contradictory and both halves are real: **Roll20 has fifteen years of continuous,
> specific requests** for nested containers, collapsible containers, weight-calculating repositories
> and packs-with-contents [gemeldet] — and **Roll20 still does not ship it**, for a structural reason
> (repeating sections cannot nest) rather than a priority one. **Foundry's `dnd5e` took three years
> and three months to ship it and broke permissions in twenty-four hours.** Demand that survives
> fifteen years of refusal is evidence; so is a market leader deciding twice that it is not worth the
> rewrite. **Neither settles it, and asking two GMs costs a message.**

**And one deference, recorded rather than smoothed:** on the map, the place layer, generation intake
and the art bill, **M1–M8 govern** (`OPEN-DECISIONS.md`) and this document defers to them. Where this
document rules on generation (§4) it rules on **shape and containment**, not on whether the map is
built — M3 and M7 are untouched and are not re-opened.

---

## 8. Was nicht festgestellt werden konnte

Recorded so no later round launders an absence into a fact.

1. **PostgreSQL costs for anything in this schema.** Every traversal figure in RB-21a is Node
   in-memory; a recursive CTE with `CYCLE` over a real index is slower by a constant nobody measured.
   **No reliable figure found.** `S-R1` and the 0.5-day subtree spike close it.
2. **What Athena's strip costs** — deleting `public/` and then making FMG run, with 12 live `libs/`
   tags in a 654 KB `index.html`. Priced by nobody in the round; I did not build it. **No reliable
   figure found**, and it is the reason §4.2 takes import-only.
3. **The net of RB-21d's +9 ingest days against RB-20 §5.3's already-committed 10.** The overlap is
   real and has never been subtracted by name. **No reliable figure found.** Deferred as a block.
4. **What the map-half containment model costs in days.** RB-21a deliberately priced nothing; the
   incremental cost against work already ledgered is not established, and I will not invent it. **This
   is why §6.1's total is a floor and says so.**
5. **Id survival across an FMG version bump.** RB-21d's own highest-variance unknown. **No reliable
   figure found**, and §4.5 narrows a product promise because of it.
6. **Whether any GM wants nested containment.** Zero measurements, both directions, two rounds. §7.3.
7. **LegendKeeper's nesting model** — tree or DAG, cycle handling, depth limit, and whether nested maps
   carry per-character visibility. The feature demonstrably ships (marketing plus a published
   tutorial); the permission model behind it is vendor silence. **No reliable figure found**, and the
   claim *"the projection is our differentiator"* rests on their **permission** wording, which is
   explicit, not on their nesting model, which is not.
8. **The true place-share of the corpus's doors.** My union of two signals (86 distinct / 29 tier-1) is
   a **floor**, proved by `Versteck der Flüsterer in Blattheim` — a tier-1 door that is a place and is
   invisible to both signals. The true value is somewhere above 25.7 % of tier-1 and below the ~40 %
   an exhaustive human classification might yield. **No reliable figure found**; `S-R1` should print
   both signals and the union, and a human should classify the top 40 by hand once.
9. **Whether a genuine counter-example to the single-spatial-parent rule exists.** Five hard cases were
   tested across two briefs and none survives; nobody can prove none exists. **It is a ruling, not a
   theorem**, and W-G2's falsifier is how it meets reality.
10. **Any measurement of `Sicht` itself.** Unchanged for six rounds. **Everything in §1.6 is
    specification, on a mechanism that has never been executed.** `S-P1` is two days.
11. **Whether jQuery 3.1.1's CVEs are reachable through FMG's own code paths.** Nemesis established the
    version, the live tag and the CVE ranges; nobody audited ~34,000 lines of `public/**/*.js` for an
    exploitable sink. **The finding is that nobody looked, not that an exploit exists.**

---

## 9. Quellen

**Gemessen von mir, heute, 2026-07-27 — jeder Befehl nachvollziehbar:**

- `curl "https://eron.fandom.com/de/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&titles=Karte:Andaria"` →
  **109,182 B**; 190 markers, 16 categories, `mapBounds [[0,0],[8192,8192]]`, `origin bottom-left`,
  `coordinateOrder xy`; markers per category **2,2,3,3,4,4,4,5,5,6,7,26,28,28,30,33** (min 2 · median 5
  · mean 11.9 · max 33, **bimodal**); **54 markers with description, 9,512 chars**; **Andaria is not a
  marker on its own map**. *Reproduces RB-21a exactly.*
- Join of the map's 205 distinct names against `fixtures/eron/graph.json` → **69 redlink targets, 18
  tier-1.** *Reproduces RB-21a exactly.*
- **New:** join of place-typed infobox fields (10 parameters, chosen from the corpus's 115 distinct
  names) in `fixtures/eron/articles.json` against the same 689 targets → **36 distinct, 24 tier-1**;
  overlap with the map signal **19**; **union 86 distinct / 29 tier-1 / 266 of 1,253 red edges.**
- `Eron (Planet)` [article] → `Andaria` [redlink 15] → `Blattheim` [redlink 14] →
  `Versteck der Flüsterer in Blattheim` [redlink 5] — **the deepest observable containment chain in the
  real corpus is four, and three of its four links are unwritten.**
- `RB-12` §5.4's distribution table read directly: **116 = ≥3-inbound cumulative; 113 = tier-1 after
  the notation guard.**

**Intern, gelesen und geurteilt, nicht neu abgeleitet:**
[`RB-21a`](RB-21a-verschachtelung.md) · [`RB-21b`](RB-21b-inventar.md) ·
[`RB-21c`](RB-21c-lizenz-und-risiko.md) · [`RB-21d`](RB-21d-erzeugung-je-ebene.md) ·
[`RB-21e`](RB-21e-widerspruch.md) · [`RB-20`](RB-20-kartenschmiede.md) §5.2–§5.4, §7, §8 ·
[`RB-20a`](RB-20a-kartenwerkzeuge.md) · [`RB-20b`](RB-20b-machbarkeit.md) §1, §2, §5, §8 ·
[`RB-20d`](RB-20d-erzeugung.md) · [`RB-20e`](RB-20e-widerspruch.md) §1.3–§1.6, §4.3, §5.6 ·
[`RB-18`](RB-18-widerspruch.md) §1.1–§1.7, §3.3, §3.4, §4.2 · [`RB-12`](RB-12-eron-uebernahme.md)
§2.5, §2.8, §4.4, §4.5, §5.3–§5.5 · [`RB-11`](RB-11-steam-vs-browser-verdict.md) ·
[`RB-02`](RB-02-rendering-tech.md) · [`CHAMPION.md`](../iterations/CHAMPION.md) §3.4, §4.9, §4.11,
§6, §8, §9.1, §9.5, §12.1, §12.4, §15.9 · [`00-intake.md`](../00-intake.md) ·
[`OPEN-DECISIONS.md`](../iterations/OPEN-DECISIONS.md) M1–M8, P6, S1–S8.

**Extern** — carried with their original attributions from RB-21a–e and not re-fetched except where
marked: OGC **IMDF** 20-094 (`anchor`, `level`, `ordinal`, `opening`, `footprint`) · OSM Simple Indoor
Tagging (`level=0;1`, `repeat_on=*`, `highway=elevator`) · Epic, **World Composition / world origin
rebasing** · Foundry VTT v14 **Scene Levels** and the `getUserLevel` ownership doc ·
`foundryvtt/dnd5e` #729 / #2782 · `foundryvtt/pf2e` container sources · NetHack 3.6 `mkobj.c` /
`pickup.c` · **LegendKeeper** (*"Nest your maps indefinitely…"*, *"They see what you want, nothing
more"*) · `Azgaar/Fantasy-Map-Generator` v1.138.2, **MIT + the derivative-works grant**,
`vite.config.ts` (`publicDir: '../public'`), `src/generators/burgs-generator.ts` (`burgSeed` + 17
parameters), `src/controllers/provinces-editor.ts:1630` · **Watabou** Procgen Arcana FAQ and the eight
public repos · **donjon** (CC BY-NC 3.0) · NVD CVE-2020-11022 / CVE-2020-11023 / CVE-2019-11358 ·
PostgreSQL `CYCLE … SET … USING` · Kanka nested-entity guidance.

---

*RB-21. Er hat nach einer Karte in einer Karte gefragt und dabei, ohne es zu wissen, eine Spalte
beschrieben. Ein Kontinent und eine Kupfermünze beantworten dieselbe Frage — worin? — und eine einzige
Spalte beantwortet sie für beide, für immer, umsonst. Was Geld kostet, ist der andere Graph: wem es
gehört, wer darin sitzt, wer es beansprucht. Die beiden zu trennen kostet heute nichts und morgen
neunundachtzig Prozent der Geheimbünde einer Welt. Und die Türen: sie ordnet ungefähr jede fünfte, und
das ist eine Untergrenze, und es ist trotzdem keine Rettung — sechshundertdrei Türen blieben
ungeordnet, davor wie danach. Blattheim steht in seinem eigenen Wiki an drei Orten zugleich, auf einem
Kontinent mit siebenundsechzig Millionen gemalten Pixeln und keinem Artikel. Der Baum kann sagen, wo
es steht. Das Netz kann sagen, wer es beansprucht. Nur ein Modell, das beide auseinanderhält, kann
beides sagen, ohne zu viel zu sagen.*

> *Ein Baum für das Wo, ein Netz für das Was —*
> *und zwischen beiden eine einzige Wand.*
> *Wer sie einreißt, gewinnt eine Abfrage*
> *und verliert jedes Geheimnis, das er je hatte.*
> *Drum: erst den Ring vermessen, dann die Spalte setzen,*
> *und die Physik erst dann, wenn jemand zweimal fragt.*
