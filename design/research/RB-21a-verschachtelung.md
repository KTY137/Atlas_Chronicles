# RB-21a — Die Verschachtelung. Der Raum als Vertrag

**Ariadne, die Fadenführerin · 2026-07-27.** Beat: turn Kaya's sentence — *„jedes Universum ist dann
eine gigantisch große nested map. Mit nested inventory"* — into a containment model that gets designed
once, maximally, because it cannot be replaced later.

**Reads as binding and does not re-open:** [`RB-11`](RB-11-steam-vs-browser-verdict.md) — the engine
question is **ruled and struck at 2/2/2**; React/TS + PixiJS, DOM-authoritative, canvas behind
`MapRenderer`, browser + Electron. No Unity, no Godot, no Unreal. Where Kaya's instinct behind "Unity"
is right — he wants real editor tooling, not a toy — the answer is
[`RB-20b`](RB-20b-machbarkeit.md) §8, which already prices a placement editor on the pinned stack at
**21 days new work (~25 with contingency)** and measures five of its numbers on Kaya's own 8192² map.
Also binding: [`RB-18`](RB-18-widerspruch.md) (the arithmetic for one builder; the 20 % contingency;
*"a schedule denominated in an uncalibrated unit is not a bill; it is a hope with columns"*) ·
[`RB-12`](RB-12-eron-uebernahme.md) (the import contract, the passage atom, `passage_sha256` identity) ·
[`RB-20d`](RB-20d-erzeugung.md) (**emit doors, not articles**) ·
[`CHAMPION.md`](../iterations/CHAMPION.md) §4, §6, §8, §9, §11 · [`00-intake.md`](../00-intake.md)
(the invariants, K5, K7, K9, K10).

**Method, and what every number is worth.** Numbers I measured this session are marked **[gemessen]**
with the script that produced them, in
`…/scratchpad/{raum-mess.mjs, dag-mess.mjs, leck2.mjs, karte.json}`. Numbers read from a specification
or from source are marked **[aus der Spezifikation]**. Vendor marketing is labelled
**[Herstellerangabe]** and never laundered. Where a figure could not be established the text says
**"no reliable figure found"** — §9 lists every one.

**Eron is fixture, never subject** (K10). Every rule below must hold for a Star-Trek wiki, a cyberpunk
wiki, and a wiki with no map at all. Eron-shaped rules are marked **[corpus-specific]** and are
defaults, not laws.

---

## The answer in one paragraph

**It is not one graph and it is not a DAG. It is one tree plus one multigraph, and the split is a
permission decision, not an aesthetic one.** `Raum` — spatial containment — is a strict tree: **at most
one spatial parent per node, cycles unrepresentable by construction.** Everything else a place
participates in (political membership, jurisdiction, ownership, passage, adjacency, thematic grouping)
is a `Bezug`: a typed, optionally time-bounded edge in a multigraph where cycles are **legal and
expected**. The reason is measured, not argued: if the rule *"knowing a child implies knowing its
parent"* is applied over all edges instead of only the spatial one, a character holding 20 % of a
world's places thereby learns of **89 % of its secret organisations** (357 of 400) [gemessen,
`leck2.mjs`]. **One edge kind is a permission edge. The rest are content.** A model that blurs them
leaks by construction, and no amount of careful querying repairs it afterwards.

**One node type in the tree, two substrates for content.** Universe, world, region, settlement,
building, room and *fixed* container are all one row — `Ort` — because one type buys one traversal, one
projection, one breadcrumb, one door renderer and one URL space. An **item instance** is not an `Ort`;
it is a `Ding` on the champion's explicitly-mutable second substrate (`Zustand`), carrying the *same*
containment column into the *same* closure. **The one graph is the edge, not the row** — and a
one-way, audited, human-pressed **Beförderung** promotes a `Ding` to an `Ort` the day a chest becomes a
room.

**Coordinates do not nest and the corpus proves it.** In Kaya's own world, **Andaria is not a marker on
Andaria's map** — the container has no point in its own coordinate system; it *is* the artifact
[gemessen, `Karte:Andaria`]. So a child anchors into a parent's *map*, not into its parent: `Anker`
is a row per `(Karte, Ort)`, geometry `Punkt | Umriss | ohne`, taken directly from IMDF's `anchor`
(POINT, `unit_id`) and `footprint` [aus der Spezifikation]. Zoom is continuous **inside** one `Karte`
and a named, addressable **Übergang** between two — the same answer OSM gives (a vertical connection is
mapped as an explicit stairway/elevator, not as a zoom) and the same answer Unreal gives (sublevels
plus **world origin rebasing**, an offset vector applied to every actor, precisely because one
continuous coordinate space does not survive scale).

**And Apollon's second consequence — that containment defuses the redlink explosion — does not hold as
stated, and this is the most valuable finding in the brief.** Measured against RB-12's real corpus:
of **689 distinct redlink targets, 69 (10.0 %) are a place**; of **1,253 red edges, 182 (14.5 %) point
at a place**; of the **116 tier-1 doors, 18 are places** [gemessen]. The single most-wanted missing
page in the whole wiki, `Andarisch` at 18 inbound, **is a language.** Containment cannot order a
language, a house, a battle or a title, because none of them is contained by anything spatial.
**Containment orders one door in seven.** What survives — and it is better than the claim it replaces —
is that containment orders **exactly the doors a generator manufactures**, and gives a real number for
what a level shows: doors per container in the real corpus are **min 2 · median 5 · mean 11.9 · max 33**
[gemessen]. *"Not 1,253 doors — the four in this room"* is right at the median and wrong at the tail by
8×.

**One competitive fact the crew must swallow before it celebrates:** **LegendKeeper already ships
this.** Their own front page: *"Your world map isn't just an image. **Nest your maps indefinitely, zoom
from continents to crypts, and link every landmark to its wiki page.**"* [Herstellerangabe, fetched
2026-07-27]. Nested maps are not an unclaimed idea. What is unclaimed is the sentence *after* theirs —
their permission model is *"invite them as free collaborators or send them a public viewing link. **They
see what you want, nothing more**"*: share-level, per-viewer-at-best, not per-character, with no
`erfahrungsgrad` and no fog. **The nesting is parity. The projection down the nesting is the fusion.**

---

## 1. The shape, ruled

### 1.1 The candidates, and why the obvious answer is wrong

| Candidate | What it buys | Why it fails |
|---|---|---|
| **Tree** (one parent, no cycles) | breadcrumbs, subtree queries, moving a ship in one write, a defensible upward permission rule | cannot say "this road is in two regions", "this city is in the empire *and* the valley" |
| **DAG** (many parents, no cycles) | says both of those | **breadcrumb becomes a set**; upward permission implication becomes a leak (§5.2, measured); "move the ship" becomes ambiguous — from *which* parent did it leave? |
| **General graph** (cycles legal) | portals, ring roads, the Möbius dungeon | nothing is orderable; `Sicht` has no direction; a naive traversal never terminates |

The instinct is DAG. The instinct is wrong, and the reason is not performance — I measured
performance and a DAG is affordable. At 10,023 nodes the transitive closure of a strict tree is
**55,742 rows (5.56/node), built in 59 ms**; adding one extra parent per node makes it **123,035 rows
(12.28/node, ×2.2)**; three extra parents make it **249,911 rows (×4.5)** [gemessen, `dag-mess.mjs`].
Nothing there breaks.

**What breaks is meaning.** Three cases, each of which a DAG answers badly and a tree answers cleanly:

1. **The ship.** A ship contains rooms and moves between ports. In a tree this is *one UPDATE* of one
   column; every room, chest, coin and passenger moves with it for free, because containment is an
   edge and not a copy. In a DAG you must decide which of the ship's parents it *left*, and the
   closure of everything inside it must be recomputed against a set. **A DAG cannot move a ship
   without a policy, and a policy is what we are trying not to invent.**
2. **The breadcrumb.** *„Münze › Beutel › Truhe › Kammer › Haus Vharon › Blattheim › Andaria"* is a
   path. In a DAG it is a lattice, and the UI must either pick one (which is a hidden tree) or render
   all (which is a leak, §5).
3. **The permission implication.** §5.2 measures it. Under a DAG with organisational parents, holding
   a room discloses the cult that "contains" it.

### 1.2 The ruling

> **`Raum` is a strict tree. `Bezug` is a typed multigraph. A node has at most one spatial parent and
> arbitrarily many everything-elses.**

**The invariants, stated so they can be tested:**

| # | Invariant | Enforced by |
|---|---|---|
| **R1** | Every `Ort` has **exactly one** `raum_eltern_id`, except roots (`NULL`). Not zero-or-many. One or root. | `NOT NULL` on non-roots + a partial unique index on `(campaign_id) WHERE raum_eltern_id IS NULL` capped per campaign |
| **R2** | **A cycle in `Raum` is unrepresentable.** Not "rejected by a trigger" — unrepresentable, and the check is on the write path. | ancestor-set membership test before every re-parent, measured at **0.96 µs** at 10 k nodes [gemessen, `raum-mess.mjs`]; plus PostgreSQL's own `CYCLE … SET … USING` on every recursive read as a second net (SQL-standard, PG ≥ 14) |
| **R3** | **A `Bezug` may cycle, and must be able to.** A portal loop, a trade ring, mutual vassalage are all legitimate. Every traversal over `Bezug` is depth-capped and cycle-marked, never assumed acyclic. | `CYCLE` clause; a hard depth cap (default 6) on any UI that walks `Bezug` |
| **R4** | **`Bezug` carries no containment semantics and no permission implication, ever.** | §5.2's rule R-P3, with a gate |
| **R5** | The spatial parent is **mutable**; every other identity of a node is not. Re-parenting writes an `AuditEntry`. | audit table |
| **R6** | Vertical position is a **scalar band on the node** (`hoehe_von`, `hoehe_bis`, `ordinal`), never a containment edge. | §1.3 case 3 |

### 1.3 The five hard cases, worked

**Case 1 — a road spanning two regions.** *Not a containment problem.* A road is a `Weg`: a node with
`geometrie` (a polyline in some `Karte`'s coordinate space) and endpoints. Its `raum_eltern_id` is the
**lowest common ancestor of its endpoints**, computed, not typed — for a road from Blattheim to
Akkator that is Andaria. The regions it crosses are `Bezug(weg, beruehrt, region)` edges, as many as
you like, and they are content: they render, they are searchable, they carry passages, and they imply
nothing about permission. *Precedent:* OSM does not give a highway two parents either; a way that
spans several floors is tagged **`level=0;1`** or **`level=2-4`** — a *set-valued attribute on the
feature*, not a second containment edge [aus der Spezifikation, OSM Simple Indoor Tagging]. That is
exactly the shape ruled here: multi-membership is a value, not a parent.

**Case 2 — a portal joining distant nodes.** `Bezug(a, durchgang, b)`, symmetric, cycle-legal, with
`zustand ∈ offen | verschlossen | unbekannt` and an optional `klausel_ref`. A portal is **not** a
containment edge and must never become one, or a portal into a chest makes the chest an ancestor of a
continent. *Precedent:* OSM maps vertical connections as explicit stairway/elevator features with door
nodes per level (`repeat_on=1;3`), and IMDF has a first-class `opening` feature for exactly this — the
connection is a *thing*, not a relationship between containers [aus der Spezifikation].

**Case 3 — the underdark beneath a continent.** **Ruled: not a child of the surface.** It is a
**sibling** — another child of the same parent — distinguished by a negative elevation band. Evidence
from two independent specifications and one live competitor:

- OSM: `level=-1` is the first basement; the building declares `min_level` / `max_level` and even
  `non_existent_levels=4;13` [aus der Spezifikation].
- IMDF: `level` is a POLYGONAL feature with an **`ordinal`** and an **`outdoor`** boolean and an array
  of `building_ids` [aus der Spezifikation, OGC 20-094 reference].
- **Foundry VTT shipped this into core in v14** and the framing is the one to steal: *"V14 Scene
  Levels addresses this challenge by vertically 'stacking' multiple images inside a single scene, each
  at a defined elevation"* [Herstellerangabe, foundryvtt.com/releases/14.354, and their own caveat:
  *"still in active development and it will continue to evolve significantly"*]. Community
  documentation states it more usefully: *elevation is the real coordinate; a level is a named
  elevation band with a Bottom and a Top, with its own visibility list.*

  **Consequence for our own ledger:** CHAMPION §9.5 refuses "Scene Levels" for years. As of v14 that
  refusal is now a refusal of a **core competitor feature**, not of a third-party module. It should be
  re-read by Apollon on those terms. It is not this brief's call.

**Case 4 — the ship.** An ordinary `Ort` whose `raum_eltern_id` changes. Rooms, cargo and passengers
are its subtree and move implicitly. `bewegt = true` on the node flags it to the UI (a moving container
must never be cached as a static breadcrumb). **This case is the single strongest argument for the
tree** and it should be quoted whenever someone reopens the DAG question.

**Case 5 — a city in a realm politically and a valley geographically.** Ruled: **geometry decides the
spatial parent; everything political is a `Bezug`.** And this is not a thought experiment — **the real
corpus already contains the case and already disagrees with itself about it.**

`Blattheim` [gemessen, `Karte:Andaria` + `articles.json`]:

| Artifact | What it says Blattheim's parent is |
|---|---|
| `Karte:Andaria`, marker at `[1185.4, 5518.0]` | `categoryId` → **Elfenunion** |
| `Almek`, infobox | `Todesort=[[Blattheim]], [[Geeintes Elfenreich Demmaros]]` |
| `Thorbin`, infobox | `Heimat=… *[[Blattheim]], [[Geeintes Elfenreich Demmaros]]` |
| `Kaiserthing`, infobox | `sitz=[[Blattheim]]` — an **imperial** institution seats there |
| `Hochelfenrat`, infobox | `sitz=… *[[Blattheim]] (0 - 867) *[[Baumgard]] (Ab 867)` |
| `Flüsterer`, infobox | `sitz=*[[Schwarzweide]] (Bis 840) *[[Blattheim]] (840-866) *[[Baumgard]] (867-868)` |

Three different named parents from three artifacts, **and two of them are time-bounded.** A DAG would
store all three as parents and then be unable to answer "where is Blattheim" without a policy. The
tree answers it: `raum_eltern = Andaria` (the only container with geometry), anchored at
`Punkt(1185, 5518)` on `Karte(Andaria)`; and then

```
Bezug(Blattheim, gehoert_zu,  Elfenunion,                      quelle: karte)
Bezug(Blattheim, gehoert_zu,  Geeintes Elfenreich Demmaros,    quelle: infobox)
Bezug(Kaiserthing,  sitzt_in, Blattheim)
Bezug(Hochelfenrat, sitzt_in, Blattheim,  von: 0,   bis: 867)
Bezug(Flüsterer,    sitzt_in, Blattheim,  von: 840, bis: 866)
```

**`Bezug` needs `von` / `bis` from day one.** This is not a future nicety: two of the six real edges
above are already dated in the authors' own wikitext, and a model without them either drops the dates
or lies. One nullable pair of columns, ruled in now, because adding temporality to an edge table later
is a migration of every row.

### 1.4 What this refuses

- **No multiple spatial parents.** If two containers both genuinely contain something, one of them is
  not spatial. (Tested against every case anyone has produced; §9 records that I did not find a
  counter-example and cannot prove none exists.)
- **No cycle in `Raum`, at any scale.** The bag of holding inside the bag of holding is rejected at
  write time, with a named error. NetHack's answer to the same case is to destroy both items and open
  a hole in space [Herstellerangabe-equivalent: game documentation, not fetched successfully — HTTP
  403/402 on both wikis, §9]. That is evidence the case *arrives*, not a model to copy.
- **No implicit containment from a `Bezug`.** Owning a house does not spatially contain it.

---

## 2. The node — one type, or several?

### 2.1 The case for one type, argued as strongly as it can be

Every scale needs the same seven things: a stable id, a name, a parent, children, an article, doors, and
a per-character visibility. A chest and a continent differ in *magnitude*, not in *kind*. One type
means:

- **one traversal**, so the ancestor query is written once (0.70 µs/query at 56 k nodes [gemessen]);
- **one permission projection**, which is CHAMPION §6's whole architecture — a second node type means a
  second `Sicht` and B9 is stated once per surface, not once;
- **one breadcrumb renderer**, one door renderer, one search index, one URL space;
- **one export format**, which matters because `Die Ausgabe` and UVTT round-trip are both launch-
  blocking (RB-11);
- and it is the shape the champion already has: `Entry` is *"the substrate"* (§8).

### 2.2 The case for several, argued as strongly as it can be

- **Invariant: item template ≠ item instance** (intake, pack invariants). A continent has no template.
  Forcing one type either drags template/instance into `Ort` or drops it from items.
- **Lifecycle is opposite.** A place is canon: durable, cited, minted by a human keypress, never
  auto-created. An item instance is **board state**: created and destroyed every session, undoable via
  the `Zustand` ring, purged. CHAMPION §8.3 already severs them — *"a Vorhaben yields knowledge, never
  board state."* Making a copper coin an `Entry` puts it in the encyclopedia's namespace, in the
  search index, and in the export.
- **Cardinality is opposite.** Places: ~10³ per campaign, ~10⁴ for a generated world (FMG: ~1,000
  settlements, ~18 states [aus dem Quelltext, RB-20d]). Item instances: unbounded and churning.
  `Search at scale` has been **red for five rounds** (CHAMPION §12.4). Do not hand it 30,000 coins.
- **Weight, capacity, quantity and stacking** are meaningless on a region and load-bearing on a bag.

### 2.3 The ruling

> **One node type for the tree. Two substrates for the content. The containment relation is a single
> column that both substrates carry into the same closure.**

```text
Ort   — canon substrate.  universe · world · region · settlement · building · room · fixed container
Ding  — Zustand substrate. item instances: the sword, the coin, the bag, the corpse
```

- `Ort.raum_eltern_id → Ort.id`
- `Ding.behaelter_id → Ort.id` **or** `→ Ding.id` (a bag inside a chest inside a room)

Both edges are containment; both are checked by the same acyclicity rule R2; both are traversed by the
same recursive query with one `UNION ALL`. **The one graph is the edge, not the row.** That sentence is
the whole ruling and it is what lets us have Kaya's *"one mechanism serves maps AND inventory"* without
putting loot in the encyclopedia.

**Why a chest can be either.** A nailed-down chest in a room, with an article and a door, is an `Ort`.
A backpack a character carries is a `Ding`. The line is not "how big" — it is **"is this thing canon or
is it board state."**

**The named boundary that makes it cheap to be wrong: die Beförderung.** One human gesture promotes a
`Ding` to an `Ort` — the crate that turned out to be a smuggler's hold, the wagon that became a home.
It is one-way, audited, never automatic (`Nichts wird automatisch Kanon`, applied to structure —
exactly RB-12 §4.5's ruling for imported mechanical fields). The reverse (`Ort → Ding`) is **refused**:
a place that has been minted, cited and revealed cannot become disposable board state. If we picked the
line wrong, Beförderung is the migration path and it costs a keypress per row instead of a schema
change.

**What I will not do, and it is the discipline this section exists for:** invent a third substrate.
Characters, organisations, wars and languages are `Entry`s with `Bezug` edges. They are **not** nodes
in `Raum`. `Bezug(Hochelfenrat, sitzt_in, Blattheim)` is an edge; the Hochelfenrat is not inside
anything.

---

## 3. Coordinates and anchors

### 3.1 A city map is a separate artifact — established, not assumed

Three independent pieces of evidence, none of them ours:

1. **The corpus.** Kaya's Andaria map is `mapBounds [[0,0],[8192,8192]]`, `origin "bottom-left"`,
   `coordinateOrder "xy"`, base image `Andaria 03.02.2024.jpg`, 190 markers, 16 categories
   [gemessen, live MediaWiki export of `Karte:Andaria`, 109 KB]. A Blattheim map would be a different
   artist's raster at a different projection and a different scale. Nothing in the world map's
   8192 px contains Blattheim's street plan; at 8192 px across a continent, Blattheim is roughly one
   pixel.
2. **The generator authors, in public, about their own shipped integration.** Azgaar's FMG and
   Watabou's MFCG *have* the click-through everyone wants, and its ceiling is published:
   *"The two generators exchange information by putting it into a URL — currently it's a seed, a few
   flags (coast, river etc), and a name, whereas warping data of a medium-sized city would consist of
   hundreds of floating point numbers, making URLs unsuitable"* (RB-20d §4.4, quoting the itch.io
   thread). **The two scales do not share a coordinate space; they share a name and a seed.**
3. **Game engines, which have the most money in this problem and still do not do continuous LOD across
   scales.** Unreal's World Composition streams **sublevels** with up to **4 LOD streaming levels per
   level**, discovered by the naming pattern `[Package name]_LOD#`, and supports **world origin
   rebasing** — *"shifting of the world origin by some arbitrary amount, which results in adding an
   offset vector to all registered Actors"* — with an explicit `Enable World Origin Rebasing` switch;
   UE5 replaced the whole model with World Partition [Herstellerangabe, Epic documentation]. Origin
   rebasing exists because **float precision fails before scale does.** If the industry that ships
   continuous open worlds still rebases the origin and streams discrete sublevels, a two-person browser
   product does not get one continuous zoom from galaxy to coin.

> **Ruled: "nested maps" means a graph of linked artifacts with containment and anchors. It does not
> mean one continuous LOD zoom, and nobody has to prove otherwise because three sources already have.**

### 3.2 `Karte` and `Ort` are different tables

```text
Karte (id, ort_id NOT NULL,        -- the place this map DEPICTS. exactly one.
       bild_asset_id,
       groesse [w,h],              -- 8192 x 8192
       bounds [[x0,y0],[x1,y1]],   -- Kaya's own contract, adopted verbatim
       origin ∈ bottom-left | top-left,
       koordinaten_reihenfolge ∈ xy | yx,
       massstab_m_pro_einheit NULL,-- nullable: fantasy maps usually have no scale bar
       art ∈ welt | region | ort | grundriss | taktisch,
       herkunft {generator, version, seed} NULL)
```

**An `Ort` has 0..n `Karten`; a `Karte` has exactly one `Ort`.** Zero is the normal case (§3.4). Many
is real and cheap: a political map and a terrain map of the same continent, or the same castle before
and after the fire.

**The most important measured fact in this section: Andaria is not a marker on Andaria's map.** I
checked; there is no marker with that title [gemessen]. The container does not appear in its own
coordinate system — it *is* the coordinate system. That single observation is why `Karte.ort_id` points
*up* and why the anchor lives on the child.

### 3.3 The anchor

```text
Anker (karte_id, ort_id,           -- (map, child) — the child's geometry IN this map
       geometrie ∈ Punkt(x,y)
                 | Umriss(polygon)
                 | Pfad(polyline)   -- roads, rivers, walls
                 | ohne,
       hoehe_von NULL, hoehe_bis NULL, ordinal NULL,
       ab_zoom NULL, bis_zoom NULL) -- see §3.5
PRIMARY KEY (karte_id, ort_id)
```

**This is IMDF's shape, and the borrowing is deliberate.** IMDF's `anchor` is a POINT feature carrying
a `unit_id` and an `address_id` — a point that binds an addressable thing into a polygon; its `level` is
a POLYGONAL feature with an `ordinal`, an `outdoor` flag and an array of `building_ids`; its `footprint`
is the outline [aus der Spezifikation, OGC 20-094]. IMDF is an OGC Community Standard authored by
Apple and used for indoor mapping including by Google's ecosystem. **We are not inventing a spatial
model; we are adopting one that has already survived a standards process** — and paying nothing for it,
because the parts we take are three column names.

Three rulings fall out:

1. **The anchor is a row per `(Karte, Ort)`, not a column on `Ort`.** A place anchored into two maps of
   the same parent has two rows. A place anchored into none is simply absent from the table.
2. **A place with no geometry is a first-class citizen, not a degenerate case.** 187 of Eron's 190
   markers are places whose article does not exist; Andaria is a place whose *map* exists and whose
   *article* does not. Both must render. **A model that requires a place to have geometry cannot
   represent 100 % of a wiki on import day, and a model that requires it to have an article cannot
   represent the most important place in the stakeholder's own world.**
3. **`Anker.geometrie = ohne` is different from "no `Anker` row."** `ohne` means *"this child is in
   this map's area, and we do not know where"* — the case a wiki import produces constantly. No row
   means *"this child is not on this map."* The distinction is worth one enum value and it is the
   difference between an honest empty state and a lie.

### 3.4 What happens when a place has no map — and it is the common case

On import day, **every** place has no map except Andaria. In a generated world, all ~1,000 burgs have
no map. This is not the exception; it is the steady state.

> **Ruled: the Outline recipe *is* the map for every place that does not have one.**

CHAMPION §9.1 already commits to die Tafel — the Outline render recipe — as *"a fully usable play
surface, so a screen-reader player is never handed a canvas at all"*, and slice 1 ships **no canvas at
all** (§9.1, der Tisch ohne Leinwand). Under this ruling that decision stops being a concession and
becomes the architecture: a node renders as its **children, its doors and its breadcrumb**, in a list,
and a `Karte` is an *enhancement* that changes how the same children are laid out. The map is a view of
the containment graph, not a second data model.

**This is the cheapest thing in the brief and the strongest.** It means nested containment ships in
slice 1 with zero Pixi, zero tile pyramid and zero renderer — the same argument RB-20d §6.1 makes for
`Die Türsaat`, arrived at independently from the other direction.

### 3.5 What "zoom" means when the levels are discontinuous

Two mechanisms, and they must be named differently in the UI or users will conflate them:

- **Die Vergrößerung** — continuous zoom **inside** one `Karte`. LOD is the tile pyramid, which already
  exists on disk (1,365 tiles, 9.9 MB, 6 levels, 31.7 s to build from a 67.1 MPx source [gemessen by
  Apollon, RB-20b §2]). RB-20b's finding stands: *"the pyramid is not only the import path for foreign
  rasters; it is the LOD floor of our own renderer."* `Anker.ab_zoom` / `bis_zoom` is the declutter
  control — LegendKeeper ships exactly this (*"you can now control what zoom levels they show up at"*
  [Herstellerangabe]) and it is table stakes, not a differentiator.
- **Der Übergang** — a **named, addressable, animated transition** between two `Karten`. It has a URL,
  a back-stack, a breadcrumb entry and a duration. It is never disguised as a zoom, because the two
  artifacts have different sources, different scales and possibly different cartographers, and pretending
  otherwise produces the seam every user notices.

  *Precedent, and it is unanimous:* OSM does not zoom you between floors — it maps the stairway
  (`stairs=yes` + `indoor=room`) and the elevator (`highway=elevator`), each with door nodes per level
  and `repeat_on=*` for the identical ones [aus der Spezifikation]. IMDF has `opening`. Unreal streams
  sublevels. **Nobody in this problem space fakes continuity, and the ones with the biggest budgets
  fake it least.**

**The affordance rule:** a child that has its own `Karte` renders with a distinct affordance (a ring
you can step through) from a child that does not (a pin you can read). The user must be able to see,
before clicking, whether the click *reads* or *travels*. This is the same discipline CHAMPION §3.4
applies to the door and it should reuse the door's own vocabulary.

---

## 4. The wiki join — the fusion, spatially

### 4.1 Same row, linked rows, or one projecting the other?

**Ruled: one identity, one optional facet.**

```text
Entry  (id, campaign_id, titel, typ, …)      -- the champion's substrate, unchanged
Ort    (entry_id PK/FK → Entry.id,           -- the SPATIAL FACET of an Entry. 1:0..1
        raum_eltern_id → Ort.entry_id,
        massstab, hoehe_von, hoehe_bis, bewegt, …)
```

Not two rows with a join key: **one id.** The `Ort` row is a facet — an `Entry` either has a place in
space or it does not. Reasons, in order of weight:

1. **Two ids means two names, and the corpus already proves that fails.** The map calls a polity
   `Terabur`; the articles link `Königreich Terabur` (13 inbound) *and* `Terabur` (5 inbound); neither
   exists as an article [gemessen]. **The same polity is already three identities in one world.** Every
   additional id we introduce is another place for that to happen.
2. **One id means one URL, one search hit, one door, one revelation.** A per-character revelation
   granted on "the article" that does not also grant "the map node" is a leak with a bug report
   attached.
3. **The champion's atom is the passage, and passages hang off `Entry`.** A place's description *is*
   passages — including the map marker's own prose: RB-12 already rules `markers[] / notes[] →
   Anmerkung`, legend HTML → passage, `Herkunft: erzeugt`. Eron's map carries **9,512 characters of
   marker prose across 54 of 190 markers**, with 113 wikilink instances to 81 distinct targets, 65 of
   them missing [gemessen]. **That prose is passages, and it is some of the best-quality passages in
   the corpus, because each one already has a position and a faction.**

### 4.2 The containment edge is not a passage

`raum_eltern_id` is a column, not a `Passage`. If it were a passage, *"Blattheim liegt in Andaria"*
would be revealable independently of *"Blattheim existiert"*, and the breadcrumb would have to render a
half-known ancestor — which §5.3 shows is a leak with no clean rendering.

**Ruled: the edge's visibility is `min(sichtbarkeit(kind), sichtbarkeit(eltern))`.** You see the edge
only if you hold both endpoints. One predicate, no new table, no new oracle. A GM who *wants*
"Blattheim's true location is a secret" writes it as a passage on Blattheim and the place sits under a
parent nobody holds — which is the same mechanism, used deliberately.

### 4.3 One Eron example, end to end: **Blattheim**

**What exists today** [all gemessen]:

- **In the articles:** no article. A redlink with **14 inbound articles** — RB-12 tier **Tür** (≥3
  inbound), so it is already eligible as a `Vollmacht.anker`. Named in `Almek`, `Baldur`, `Das Kind`,
  `Der Falsche Zwerg`, `Ekmont von Radfurt`, `Flüsterer`, `Hochelfenrat`, `Kaiserreich`, `Kaiserthing`,
  `Olav der Ehrliche`, `Remus' Kaiserreich`, `Song Kayn`, `Thorbin`, `Yal'it der Wissbegierige`.
- **On the map:** a marker, `position [1185.4, 5518.0]`, `categoryId → Elfenunion`, and — checked — no
  popup description of its own.
- **In other articles' infoboxes:** two different named parents, two dated institutional seats (§1.3
  case 5).
- **Downstream:** `Versteck der Flüsterer in Blattheim` is its own redlink, linked from `Das Kind` — a
  *child* place named only inside another article's prose.

**What the model produces, in order:**

```text
Entry   e:blattheim   { titel: "Blattheim", typ: ort, artikel: UNGESCHRIEBEN }
Ort     e:blattheim   { raum_eltern: e:andaria, massstab: siedlung }
Anker   (k:andaria, e:blattheim) { geometrie: Punkt(1185.4, 5518.0) }
Bezug   (e:blattheim, gehoert_zu, e:elfenunion,  quelle: karte)
Bezug   (e:blattheim, gehoert_zu, e:demmaros,    quelle: infobox)
Bezug   (e:kaiserthing,  sitzt_in, e:blattheim)
Bezug   (e:hochelfenrat, sitzt_in, e:blattheim, von: 0,   bis: 867)
Bezug   (e:fluesterer,   sitzt_in, e:blattheim, von: 840, bis: 866)
Entry   e:versteck-der-fluesterer  { typ: ort, artikel: UNGESCHRIEBEN }
Ort     e:versteck…   { raum_eltern: e:blattheim }   -- no Anker: geometry unknown
```

**And the root, which is the case the model must not choke on:**

```text
Entry   e:andaria     { titel: "Andaria", typ: ort, artikel: UNGESCHRIEBEN }  -- 15 inbound, a redlink
Ort     e:andaria     { raum_eltern: e:eron-planet }
Karte   k:andaria     { ort: e:andaria, bild: "Andaria 03.02.2024.jpg",
                        bounds: [[0,0],[8192,8192]], origin: bottom-left, xy }
```

> **Andaria has a 67.1-megapixel map, 190 pins, 16 factions and no article.** RB-20d put it best and
> the containment model has to earn the sentence: *their map is a picture of a world whose data layer
> was never written.* Under this model the data layer **is** the map: 190 rows land as `Ort` + `Anker`
> with `Herkunft: übernommen`, a parent, a position and — for 54 of them — a paragraph. **Zero
> articles are written.** Die Saatbilanz reads `0 Absätze im Kanon · 190 Orte · 187 Türen`, and that is
> exactly RB-20d's ruling — *emit doors, not articles* — arriving from the import side instead of the
> generator side, with the same mechanism.

**The one thing this example does not answer, and I will not pretend it does:** which of Blattheim's two
`gehoert_zu` edges is correct, and whether `Elfenunion` and `Geeintes Elfenreich Demmaros` are the same
polity at different dates. **No reliable answer found; it is not derivable from the corpus.** It goes
to the import's mandatory human mapping screen (RB-12 §4.4), which already exists for exactly this
class of decision. **The model's job is to represent the disagreement without averaging it away, and it
does.**

---

## 5. Permissions and `Sicht` down the graph — the load-bearing part

### 5.1 Three states, one predicate

`Sicht` stays what CHAMPION §6 makes it: server-authoritative, composing at one choke point, no
visibility metadata on any player payload (Grenze B9), Default-Deny durch Totalität. **This brief adds
no second system.** What it adds is one derived ternary, and it is derived — never stored twice:

| State | Means | Derived from |
|---|---|---|
| `unbekannt` | the node does not exist for this character, byte-identically | no revelation, no implication |
| `benannt` | she knows it exists and its name; she holds no passage of it | **implied** by R-P1, or granted directly |
| `erschlossen` | she holds ≥1 passage of it | `Revelation` |

This is `erfahrungsgrad` (CHAMPION §4.2, `Erfahren schlägt Gehört`) applied to geography, which is what
RB-20b §5 already identified as *"the one thing in this entire brief that no competitor ships"* — a
region whose **label** may be visible while its **contents** are not.

### 5.2 The one implication rule, and the measurement that forces it

> **R-P1 (der Aufstieg).** Holding a node at `benannt` or better implies its spatial ancestors are
> `benannt`. Upward only. Transitively. **`benannt`, never `erschlossen`.**
>
> **R-P2 (kein Abstieg).** Holding a node implies **nothing** about its children. Default-Deny durch
> Totalität, unchanged.
>
> **R-P3 (die Bandsperre).** **Only the `Raum` edge implies. A `Bezug` never implies anything about
> visibility, in either direction, ever.**

R-P1 is not optional — without it a breadcrumb is unrenderable and a child's URL discloses an unheld
ancestor by inference. R-P3 is where the money is, and it is measured:

**[gemessen, `leck2.mjs` — 10,023 places in a 7-deep tree, plus 400 organisations in a 3-deep tree of
their own; 25 % of places at depth ≥4 carry an organisational `Bezug`. "Knowing a child implies knowing
its parent" applied over *all* edges vs. over the spatial edge only:]**

| Character holds | Spatial-only closure | All-edge closure | **Organisations disclosed** |
|---:|---:|---:|---:|
| 107 places (1 %) | 375 | 475 | **100 of 400 (25 %)** |
| 490 places (5 %) | 1,365 | 1,587 | **222 of 400 (56 %)** |
| 2,009 places (20 %) | 3,864 | 4,221 | **357 of 400 (89 %)** |

> **A character who has been to a fifth of the world learns that nine in ten of its secret societies
> exist — without anyone revealing anything.** Not their contents. Their *existence*, which for a cult
> is the whole secret.

**That is why §1's tree/multigraph split is a permission decision.** If `Raum` and `Bezug` were one
relation, R-P1 would produce this table, and no query-level care would repair it, because the leak is
in the schema. **The gate:** a `Bezug` row must never appear in any `Sicht` closure computation. It is
one assertion in one place and it belongs in `oracles.yaml` as row `raum_aufstieg`, with the fixture
above as its falsifier.

### 5.3 The leaks, named

Six, in descending order of how likely they are to ship.

**L1 · Der Zähler — the child count.** *"Diese Truhe enthält 7 Gegenstände."* A count is a
denominator, and CHAMPION §6.5 `Kein Nenner` already makes denominators unrepresentable in the player
payload via `NurLeitung<T>`. **Ruled: a container renders the children the reader holds and no count,
no "…und 3 weitere", no scrollbar sized to the truth.** The existing type does the work; the only new
obligation is remembering that a container is a place where somebody will want to add one.

**L2 · Die Brotkrume — the breadcrumb.** Under R-P1 the ancestors are `benannt` by construction, so the
spatial breadcrumb is safe. **The unsafe version is a breadcrumb that renders `Bezug`** — *„Truhe ›
Kammer › Haus Vharon › **Bruderschaft der Asche**"*. **Ruled: breadcrumbs render `Raum` only.** One
line, one gate, and R-P3 already forbids it; this is the surface where somebody will violate it
first.

**L3 · Die Suche — search over containers.** A full-text hit inside a container whose existence the
reader does not hold reveals the container. Der Zwillingsbeweis (CHAMPION §6) gets a **dedicated
containment fixture pair**: two worlds identical but for one chest's contents, asserting identical
bytes, DOM, `getFullAXTree` **and response timing** for a non-holder. Timing matters here more than
elsewhere: a subtree query over a large container is 3.18 ms and over an empty one is microseconds
[gemessen], which is a measurable oracle if the query runs before the projection. **Ruled: project
first, then query. Never query then filter.**

**L4 · Die Karte selbst — the raster, and this one has no clean answer.** A `Karte` is a JPEG. It
depicts coastlines, roads and painted city dots that no `Sicht` can redact, because they are pixels.
Kaya's own Andaria raster shows the whole continent to anyone who can see the image at all.

**Ruled, honestly, as two modes with the cost stated:**

- **`karte.grundriss_sichtbarkeit = oeffentlich`** (default): the raster is `benannt`-level for anyone
  who holds the depicted `Ort`; the **pins are projected** and the pins are where the knowledge is.
  This is the cheap mode and it is what LegendKeeper does. It is honest as long as we never claim the
  base map is secret.
- **`= projiziert`**: a masked raster per `Sicht`, served through the existing masked-handout service
  — already priced in CHAMPION §9.2 at **6 days (Kartenabzug + masked-handout)** and reduced to 4 in
  the no-canvas slice. RB-20b measured the vector half of this at **9.4 ms per incremental reveal**,
  with a from-scratch union at 800 revelations costing **386 ms in a worker** [gemessen, RB-20b §5].

**The thing that must be said out loud:** in `oeffentlich` mode, *„der rote Link ist eine Tür"* is
weakened for places, because the pixel already told you there is a city there. That is a real cost of
using a hand-painted world map, it is not fixable by the data model, and a product that pretends
otherwise is lying to a GM about her own handout.

**L5 · Das Gewicht — capacity propagation as a disclosure channel.** The total weight of a bag is a sum
over its subtree; if the sum runs over ground truth, a player weighing a bag learns there is something
in it she has not found. Subtree aggregation itself is not the problem — it costs **3.18 ms per region
subtree** at 56 k nodes, mean 1,399 descendants, max 2,532 [gemessen].

**Ruled: two numbers, both honest, and the difference is a GM tool.**

- `getragen` — computed over the reader's own projection. This is the number the player sees.
- `wahr` — computed over ground truth, typed `NurLeitung<Gewicht>`, GM-only, with no encoder instance
  in the player payload codec.
- One GM gesture: *„schwerer als er aussieht"* releases a passage, which is a mint, which is the
  existing mechanism.

**Named as a rule that will confuse somebody**, because physical weight is a thing a character would
feel. A table that wants strict physical realism will experience this as a bug. **It belongs in
`OPEN-DECISIONS.md`** — it is a product decision about whether inventory is a knowledge surface or a
physics surface, and this brief has taken the knowledge side because that is what the champion is.

**L6 · Der Anker — the child's coordinates.** A child's anchor exists in the *parent's* coordinate
space. Handing a holder-of-the-child the anchor when she does not hold the parent's map discloses the
parent's geometry. **Ruled: `Anker` is projected with the `Karte`, not with the `Ort`.** A place you
hold, on a map you do not, renders with no position — which is exactly `Anker.geometrie = ohne`'s
render path, already built for the common case.

### 5.4 The inventory traps, ruled

| Trap | Ruling | Cost |
|---|---|---|
| **Containment cycle** (bag of holding in bag of holding) | Unrepresentable. Ancestor-membership test on every re-parent — **0.96 µs at 10 k nodes** [gemessen] — plus PostgreSQL's `CYCLE … SET … USING` on every recursive read as a second net. **A model that cannot say no to a cycle will meet one**, and unlike NetHack we do not get to answer with an explosion. | ~0 |
| **Weight / capacity propagation** | Derived aggregate over the subtree, computed per projection (L5). Never stored, never denormalised — a stored total is a cache that will disagree with a re-parent. | 3.18 ms/subtree [gemessen] |
| **Search reveals a container's contents** | L3, and der Zwillingsbeweis fixture pair | in the existing gate |
| **Moving a container mid-session** | Free: one column write. The `Zustand` undo ring covers it, since `Ding.behaelter_id` lives on the mutable substrate. **A re-parent of an `Ort` is canon and is NOT undoable** — it is a `Berichtigung`. | ~0 |
| **Deep nesting as a griefing / perf vector** | Hard depth cap on `Ding` chains (default 8, campaign-configurable), enforced server-side on insert. Not because traversal is slow — it is not — but because a 400-deep bag chain is a denial-of-service on the *renderer* and on the breadcrumb. | 1 constant |

---

## 6. The doors, ordered — and Apollon's claim does not hold

### 6.1 The test, and the number

Apollon's claim: *"Containment gives doors a natural ordering: a door is only live at the level you are
standing on. Not 1,253 doors — the four in this room."*

**Tested against RB-12's real corpus, joined to the real map. It fails, and the failure is worth more
than the rescue.** [gemessen — `graph.json` redlink targets × `Karte:Andaria` marker titles and category
names]:

| | Count | Share |
|---|---:|---:|
| Distinct redlink targets in the corpus | 689 | |
| … that are a **place** (a map marker or a map category) | **69** | **10.0 %** |
| … that are not a place | 620 | 90.0 % |
| Red **edges** in the corpus | 1,253 | |
| … pointing at a place | **182** | **14.5 %** |
| … pointing at something else | 1,071 | 85.5 % |
| Tier-1 doors (≥3 inbound articles, RB-12 §5.4) | 116 | |
| … that are places | **18** | 15.5 % |

**The single most-wanted missing page in the entire wiki is `Andarisch`, 18 inbound — and it is a
language.** After it: `Nördliche Minenreiche` (16, a place), `Andaria` (15, a place), `Blattheim` (14, a
place), `Königreich Terabur` (13, a place), `Remus Paradon II.` (13, a person). The other 98 tier-1
doors are people, houses, titles, battles, institutions, deities and concepts. **None of them is
contained by anything spatial, and no containment model will ever order them.**

> **Containment orders one door in seven. Say it in those words, before marketing says something
> else.**

### 6.2 What survives, and it is better than what it replaces

Three claims that *do* hold, each with a number:

1. **Containment orders exactly the doors a generator manufactures.** RB-20d's whole thesis is that
   generation's job is to *make doors* — FMG emits ~1,000 settlements and ~18 states [aus dem
   Quelltext]. Every one of those is a place with a parent. **The 90 % that containment cannot order
   are the ones a generator cannot produce either.** The two findings are the same finding seen from
   two sides: generation produces spatial doors at scale; containment is the only thing that can
   present spatial doors at scale. Neither helps with `Andarisch`.

2. **A level's door load is measurable and it is survivable.** Doors per container in the real corpus
   [gemessen, markers per map category]: **min 2 · median 5 · mean 11.9 · max 33**
   (Südliche Minenreiche 33, Terabur 30, Numerien 28, Elfenunion 28, Nördliche Minenreiche 26, …,
   Dünenmeer 2, Resif 2). Apollon's *"the four in this room"* is **right at the median and wrong at the
   tail by 8×**. The renderer must survive 33 — which is the same shape as RB-12 §5.3's finding that a
   single passage carries up to **77** doors. *"Der rote Link ist eine Tür"* has to render at 0, 1, 5
   and 33, and a container showing 33 rings is a hedgehog.

3. **The import gains 187 doors that the wiki never had, and they are the best doors in the corpus.**
   Of 190 map markers, only **3** exist as articles [gemessen: `Akkator`, `Kukiria`, `Bjoldiri`].
   187 are named, positioned places with no article, **54 of them carrying a paragraph of the author's
   own prose** (9,512 characters total). RB-12 §5.5 predicted this without the numbers; here they are.
   **A door with a position, a faction and a description is very nearly a `Keim` the GM did not have to
   write** (CHAMPION §4.9, der Ankerkeim).

   And a caution from the same data: **5 of the map's 16 categories** — `Freie Städte`,
   `Magische Akademien`, `Atlanische Ruinen`, `Dünenmeer`, `Klipplande` — exist neither as an article
   nor as a redlink. The map introduces container nodes the wiki has never named.

### 6.3 The rule, stated concretely

- **A door is live at exactly one level: the level of its spatial parent.** An `Ort` door renders at
  its parent and nowhere else — never at the grandparent, never at the root.
- **What a player sees at a node:** the children she holds (`erschlossen`), the children she has heard
  of (`benannt`, rendered as doors), and **nothing else — no count, no ellipsis, no gap** (L1).
- **What the GM sees:** the same node with the full child list, plus RB-12 §5.4's three tiers
  (`Tür` ≥3 inbound / `Spur` =2 / `Notiz` =1) computed **within the subtree**, so demand ordering is
  local and a container of 33 shows its own top six.
- **What a generated world does:** its hundreds of unwritten children are `Ort` rows with
  `Herkunft: erzeugt`, `artikel: UNGESCHRIEBEN`, rendering at their own parent. **A 1,000-burg FMG
  world presents ~18 states at the root, not 1,000 burgs.** *That* is the real defusal, and it is a
  defusal of **generation**, not of the wiki's redlinks.
- **Non-place doors are unaffected.** They render exactly as CHAMPION §3.4 already specifies, in the
  passage that contains them, at whatever level that passage is read.

### 6.4 The arithmetic containment does not fix, restated so nobody re-discovers it

RB-12 §5.4 measured **113 tier-1 doors** against a Vollmacht supply of **~5 per week** for a
three-player table: **23 weeks to walk through the doors that exist on import day, before play creates
one.** Containment changes the **presentation** — 113 doors spread over a tree of containers is five
per screen instead of 113 in a list — and changes **nothing** about the supply.

> **It is a UI fix, not an economics fix. RB-12 §5.4's finding stands unimproved, and this brief does
> not get to claim it.**

---

## 7. The schema

### 7.1 The tables

```sql
-- ─── the spatial facet of an Entry ────────────────────────────────────────────
CREATE TABLE ort (
  entry_id        uuid PRIMARY KEY REFERENCES entry(id) ON DELETE RESTRICT,
  campaign_id     uuid NOT NULL,
  raum_eltern_id  uuid     REFERENCES ort(entry_id),   -- NULL only for a root
  massstab        smallint NOT NULL,        -- 0 universe … 7 container. advisory, not enforced
  art             text     NOT NULL,        -- welt|region|siedlung|bauwerk|raum|behaelter|weg
  hoehe_von       real, hoehe_bis real, ordinal smallint,   -- §1.3 case 3
  bewegt          boolean  NOT NULL DEFAULT false,          -- §1.3 case 4
  tiefe           smallint NOT NULL,        -- denormalised depth; R2's cheap guard
  herkunft        jsonb                     -- {generator,version,seed} | {import,wiki,pageid}
);
CREATE INDEX ort_eltern    ON ort(raum_eltern_id);
CREATE INDEX ort_kampagne  ON ort(campaign_id, art);

-- ─── item instances: the mutable substrate, same containment edge ─────────────
CREATE TABLE ding (
  id              uuid PRIMARY KEY,
  campaign_id     uuid NOT NULL,
  vorlage_id      uuid REFERENCES gegenstand_vorlage(id),   -- template ≠ instance (invariant)
  behaelter_ort   uuid REFERENCES ort(entry_id),
  behaelter_ding  uuid REFERENCES ding(id),
  traeger_actor   uuid REFERENCES actor_instance(id),
  tiefe           smallint NOT NULL,
  menge           integer NOT NULL DEFAULT 1,
  CONSTRAINT genau_ein_behaelter CHECK (num_nonnulls(behaelter_ort, behaelter_ding, traeger_actor) = 1)
);

-- ─── everything that is not spatial containment ───────────────────────────────
CREATE TABLE bezug (
  id        uuid PRIMARY KEY,
  von_entry uuid NOT NULL REFERENCES entry(id),
  art       text NOT NULL,   -- gehoert_zu|regiert|besitzt|sitzt_in|durchgang|beruehrt|grenzt_an|…
  nach_entry uuid NOT NULL REFERENCES entry(id),
  von_jahr  integer, bis_jahr integer,     -- §1.3 case 5 — needed on day one
  quelle    text NOT NULL,                 -- karte|infobox|absatz|erzeugt|hand
  passage_id uuid REFERENCES passage(id)   -- the passage that asserts it, if any
);
CREATE INDEX bezug_von ON bezug(von_entry, art);
CREATE INDEX bezug_nach ON bezug(nach_entry, art);

-- ─── maps and anchors ─────────────────────────────────────────────────────────
CREATE TABLE karte (
  id uuid PRIMARY KEY, ort_id uuid NOT NULL REFERENCES ort(entry_id),
  bild_asset_id uuid, breite integer, hoehe integer,
  bounds jsonb NOT NULL, origin text NOT NULL, koord_reihenfolge text NOT NULL,
  massstab_m_pro_einheit real,             -- nullable: most fantasy maps have no scale
  art text NOT NULL, grundriss_sichtbarkeit text NOT NULL DEFAULT 'oeffentlich',  -- L4
  herkunft jsonb
);
CREATE TABLE anker (
  karte_id uuid REFERENCES karte(id), ort_id uuid REFERENCES ort(entry_id),
  geometrie_art text NOT NULL,             -- punkt|umriss|pfad|ohne
  geometrie jsonb,
  ab_zoom real, bis_zoom real,
  PRIMARY KEY (karte_id, ort_id)
);

-- ─── the read path ────────────────────────────────────────────────────────────
CREATE TABLE raum_huelle (                 -- closure table, derived, rebuildable
  vorfahr_id uuid, nachfahr_id uuid, distanz smallint,
  PRIMARY KEY (vorfahr_id, nachfahr_id)
);
```

### 7.2 The queries that must be fast, with measured numbers

**[gemessen, `raum-mess.mjs` — 55,944 nodes in an 8-deep tree: 1 universe · 3 worlds · 40 regions ·
900 settlements · 4,000 buildings · 9,000 rooms · 12,000 containers · 30,000 items. Node 22, in-memory
structures standing in for the closure table. These are algorithmic costs, not Postgres costs — §9.]**

| Query | Where it runs | Measured |
|---|---|---:|
| **Breadcrumb** — ancestors of a leaf | every page header, every door, every search hit | **0.70 µs** |
| **Cycle check** — would this re-parent create a cycle? | every drag, every move, every import row | **0.96 µs** |
| **Subtree** — all descendants of a region | GM's Lücke, capacity sums, masked handout | **3.18 ms** (mean 1,399, max 2,532 descendants) |
| **Aufstieg** — upward closure of a character's held set (R-P1) | every `Sicht` build | **10.5 ms** for 2,816 held → 8,191 disclosed |
| **Closure table build** — from scratch | on import, on regeneration, never in a request | **202 ms**, 401,727 rows, ≈ **4.6 MB** at 12 B/row |

**At 10,000 nodes** [gemessen, `dag-mess.mjs`]: closure **55,742 rows (5.56/node), 59 ms to build.**

### 7.3 What breaks at 10,000 nodes — and it is none of the above

**Nothing in the traversal.** Everything above is microseconds or single-digit milliseconds. What
breaks, in the order I expect to hit it:

1. **The renderer, at ~500 focusable DOM objects** — RB-20b §2 already measured this ceiling for a11y
   proxies. A container with 33 children is fine; a region with 900 settlements rendered as an outline
   list is not. **Fix: the same three tiers RB-12 §5.4 already computes, applied per level.** Not new
   work.
2. **The `Sicht` rebuild, if it is recomputed rather than maintained.** 10.5 ms for one character is
   nothing; 10.5 ms × 6 characters × every page load is a budget. **Fix: maintain the upward closure
   incrementally on each revelation — one insert, not a rebuild. Rebuild only on join or on a
   permission change**, which is precisely RB-20b's ruling for the fog mask (9.4 ms incremental vs.
   386 ms from scratch).
3. **The closure table on write, if the tree is re-parented often.** Moving a region with 2,532
   descendants rewrites 2,532 × depth closure rows. **Fix: it is fine at human frequency and fatal at
   import frequency — so imports write the closure once, at the end, not per row.**
4. **The `Bezug` multigraph, if anyone renders it as a graph.** It cycles by design (R3). Every walk is
   depth-capped at 6 and cycle-marked. A "show me the whole relationship web" feature is where this
   dies; RB-18 §4.3 item 10 already flagged der Briefwechsel as *"a derived view with a zone entry [that]
   will acquire an editor. Watch it."* Same warning, second surface.

**What I did not test, and it is the honest gap:** none of this ran against PostgreSQL. These are
algorithmic costs in Node. A recursive CTE with `CYCLE` over a real index will be slower by a constant
I cannot name. **No reliable figure found** — and the spike that closes it is one day (§8).

### 7.4 What is irreversible, and what sits behind a boundary

**Irreversible — decide now, maximally, because migration is the expensive thing:**

| # | Decision | Why it cannot be undone |
|---|---|---|
| 1 | **`Raum` is a tree; `Bezug` is a multigraph; they are different tables** | Merging them later is one migration. **Splitting them later is a data-archaeology project** — once anything has been written into a single `parent` column with mixed semantics, no query can tell a spatial parent from a political one, and the leak in §5.2 is already shipped. |
| 2 | **`Ort` is a facet of `Entry` (one id), not a second row** | Every URL, every revelation, every link, every export references it. Splitting one id into two is a rewrite of the link graph. |
| 3 | **`Bezug` carries `von_jahr` / `bis_jahr`** | Two nullable columns now; a migration of every edge later, and every edge written in between is undated and unrecoverable. |
| 4 | **The anchor is a row per `(Karte, Ort)`, geometry on the child, in the parent's map space** | Anchors accumulate from imports and generators. Re-keying them means re-deriving geometry that was authored by hand. |
| 5 | **`Karte`'s coordinate contract (`bounds`, `origin`, `koord_reihenfolge`)** | Adopted verbatim from the corpus's own format and from IMDF. Changing the convention silently re-projects every anchor ever placed. |
| 6 | **R-P1/R-P2/R-P3 — one upward implication over one edge kind** | It is the permission model. Anything already revealed under a looser rule cannot be un-revealed. |
| 7 | **`Ding` is on the `Zustand` substrate, not the canon substrate** | Moving 30,000 loot rows into the `Entry` namespace later means minting them into canon, which is exactly what `Nichts wird automatisch Kanon` forbids. |

**Behind a named boundary — cheap to be wrong about:**

| Behind the boundary | The boundary |
|---|---|
| **The `Ort` / `Ding` line** (is a chest canon or board state?) | **Die Beförderung** — one-way, audited, human-pressed promotion. Wrong line costs one keypress per row. |
| **`massstab` — the 8-level scale ordinal** | Advisory, never enforced. Nothing branches on it; it orders a dropdown. Add levels freely. |
| **`Bezug.art` — the relation vocabulary** | An open enum with a per-campaign extension table. **Nothing in the engine branches on a `Bezug.art`** (R4), so adding `pilgert_nach` costs a row. |
| **Whether the closure table exists at all** | `raum_huelle` is **derived and rebuildable in 202 ms** [gemessen]. Drop it, replace it with recursive CTEs, replace it with `ltree`, replace it with materialised paths — the truth is `raum_eltern_id`. |
| **The rendering of a level** (map, outline, list, graph) | All are views over the same three tables. §3.4's ruling — the Outline recipe *is* the map — means the canvas is an enhancement that can arrive in slice 2 without a data change. |
| **`Anker.ab_zoom` / `bis_zoom`** | Presentation. Null is a valid answer forever. |
| **The depth cap on `Ding` chains** | A constant. |

---

## 8. What I would do next, and it is one day

**`S-R1 · Die Hülle`** — one day, no canvas, no Pixi, inside slice 1.

Load the real corpus: 73 articles + 190 map markers + 16 categories. Build `Ort`, `Anker`, `Bezug` and
the closure table. Print, as counts and nothing else: nodes by `art`; roots; max depth; orphans;
`Bezug` rows by `art`; how many markers resolve to an existing `Entry` (I predict 3) vs. mint a new one
(187); how many map categories have no wiki name at all (I predict 5); and the door load per container
(I predict min 2 / median 5 / max 33). Then run the same over a **real FMG Full JSON export**
(RB-20d's `S-G1`, also one day) and print the two side by side.

**The falsifier, stated before it runs:** if the import produces more than one root per world, or any
node with a genuinely ambiguous spatial parent that a human cannot resolve in under ten seconds, **the
tree ruling in §1 is wrong** and this document should be rewritten rather than patched.

It also does what RB-18 §1.7 says nothing in this project does: it converts an estimated day into a
measured one, on the stakeholder's own data, before a line of renderer exists.

---

## 9. What could not be established

Recorded so no future round launders an absence into a fact.

1. **PostgreSQL costs for any of §7.2.** Every number is Node in-memory. A recursive CTE with `CYCLE`
   over a real index is slower by a constant I did not measure. **No reliable figure found.** `S-R1`
   closes it.
2. **Whether a genuine counter-example to the single-spatial-parent rule exists.** I tested five hard
   cases and found none that survives; I cannot prove none exists. The rule is a **ruling**, not a
   theorem, and §8's falsifier is how it gets tested against reality.
3. **NetHack's exact bag-of-holding-in-bag-of-holding rule.** Both wikis returned **HTTP 403 and 402**
   to automated fetch. Search snippets state only that a randomly generated bag never *contains* one.
   Cited as evidence the case arrives, not as a mechanism.
4. **Whether `Elfenunion` and `Geeintes Elfenreich Demmaros` are the same polity.** Not derivable from
   the corpus. Goes to the import's human mapping screen.
5. **Whether the 249 link targets inside `Karte:Andaria`'s popups overlap the 689 article redlinks.** I
   computed the map's own popup links (**113 instances, 81 distinct, 65 missing**) but not the overlap
   with the article graph, because RB-12's 249 figure counts differently (it includes marker titles).
   **The two numbers are not reconciled and should be** — it is the same failure mode RB-12 §2.1 named
   when two readers disagreed 2.3× on the passage count.
6. **LegendKeeper's actual nesting model.** Their marketing says *"nest your maps indefinitely"*; I
   could not establish whether it is a tree or a DAG, whether cycles are possible, or how permissions
   compose down it. **Vendor claim only.** The claim that our differentiator is the projection rather
   than the nesting rests on their *permission* wording, which is explicit, not on their nesting model,
   which is not.
7. **Foundry v14 Scene Levels' per-level visibility mechanics.** The release notes say the feature is
   *"still in active development"*; the detailed elevation-band semantics come from community
   documentation, not from Foundry. Read as directional.
8. **Any measurement of `Sicht` itself.** Unchanged for five rounds. Spike **S-P1** (two days) remains
   unrun, and §5's rules are specifications, not observations. **Everything in §5 is unbuilt.**
9. **Depth distribution of real campaign worlds.** Kanka's own guidance — *"three to four levels of
   nesting handle 95 % of campaign worlds"* — is vendor advice, not data. My 8-level synthetic tree is
   a guess shaped to be pessimistic. **No reliable figure found.**
10. **The cost, in days, of anything in this brief.** I deliberately priced nothing. RB-20b already
    prices the place-layer at 21 days new work (≈25 with RB-18's contingency) and RB-20d prices die
    Türsaat at 17 (→20). **The containment model as specified here is a schema and a set of rules; its
    incremental cost against those two lines is not established and I will not invent it.**

---

## 10. Sources

**Internal, re-read and not re-derived:**
`design/00-intake.md` (invariants, K5, K7, K9, K10) ·
`design/iterations/CHAMPION.md` §3.4, §4.2, §4.9, §6, §8, §9.1–§9.6, §11, §12.4 ·
`design/research/RB-11-steam-vs-browser-verdict.md` (the engine ruling, 2/2/2) ·
`RB-12-eron-uebernahme.md` §1.5, §2.5, §4.4, §4.5, §5.3, §5.4, §5.5, §6 ·
`RB-18-widerspruch.md` §1.7, §4.2, §4.3 · `RB-20b-machbarkeit.md` §1, §2, §5, §8 ·
`RB-20d-erzeugung.md` §2.1, §3.3, §4.1–§4.5, §6.1 · `RB-02-rendering-tech.md` (budgets, tile pyramid).

**Measured this session [gemessen]** — scripts in
`…/049d5432-…/scratchpad/`:
- `karte.json` — live MediaWiki export of `Karte:Andaria` (109,184 bytes): 190 markers, 16 categories,
  `mapBounds [[0,0],[8192,8192]]`, `origin bottom-left`, `coordinateOrder xy`; **3 of 190 marker titles
  exist as articles, 187 do not**; 54 markers carry a description, **9,512 chars** of marker prose,
  **113 wikilink instances → 81 distinct targets, 65 missing**; markers per category min 2 / median 5 /
  mean 11.9 / max 33; **Andaria has no marker**; Blattheim at `[1185.4, 5518.0]`, category `Elfenunion`;
  **0 of 16 categories exist as articles, 11 as redlinks, 5 nowhere**; 174 of 190 markers sit inside at
  least one foreign category's bounding box and 34.2 % of category-pairs' boxes overlap — the author's
  own categories are **not** a spatial partition.
- `graph.json` × marker titles — **689 distinct redlink targets, 69 (10.0 %) are places; 1,253 red
  edges, 182 (14.5 %) point at a place; 116 tier-1 doors, 18 are places.**
- `raum-mess.mjs` — 55,944-node tree: closure 401,727 rows / 202 ms / ≈4.6 MB; breadcrumb 0.70 µs;
  cycle check 0.96 µs; subtree 3.18 ms (mean 1,399, max 2,532); upward closure 2,816 → 8,191 in 10.5 ms.
- `dag-mess.mjs` — 10,023 nodes: tree closure 55,742 rows (5.56/node, 59 ms); +1 parent 123,035
  (×2.2); +2 187,707 (×3.4); +3 249,911 (×4.5).
- `leck2.mjs` — the leak: organisations disclosed by an all-edge upward implication — **25 % at 1 %
  held, 56 % at 5 %, 89 % at 20 %.**

**External, retrieved 2026-07-27:**

- https://docs.ogc.org/cs/20-094/index.html and `/Reference/index.html` — **IMDF**, OGC Community
  Standard: `anchor` (POINT, `unit_id`, `address_id`), `level` (POLYGONAL, `ordinal`, `outdoor`,
  `building_ids`), `opening`, `footprint`, `relationship`
- https://wiki.openstreetmap.org/wiki/Simple_Indoor_Tagging — `level=*`, `level=0;1`, `level=2-4`,
  `repeat_on=*`, `min_level`/`max_level`, `non_existent_levels=4;13`, `stairs=yes`, `highway=elevator`
- https://wiki.openstreetmap.org/wiki/Indoor_Mapping — vertical connections as explicit features
- https://docs.unrealengine.com/4.27/en-US/BuildingWorlds/LevelStreaming/WorldBrowser and
  https://dev.epicgames.com/documentation/unreal-engine/world-composition-in-unreal-engine —
  **World Composition**: up to 4 LOD streaming levels per level (`[Package name]_LOD#`), **world origin
  rebasing** (*"adding an offset vector to all registered Actors"*), `Enable World Origin Rebasing`;
  World Partition as the UE5 replacement
- https://foundryvtt.com/releases/14.354 — **Scene Levels in core**: *"vertically 'stacking' multiple
  images inside a single scene, each at a defined elevation"*; *"still in active development"*
  [Herstellerangabe]
- https://foundrymods.com/how-to/foundry-v14-levels · https://wiki.theripper93.com/levels — elevation
  as the real coordinate, a level as a Bottom/Top band with its own visibility list [community docs]
- https://www.legendkeeper.com/ — *"Nest your maps indefinitely, zoom from continents to crypts, and
  link every landmark to its wiki page"*; *"invite them as free collaborators or send them a public
  viewing link. They see what you want, nothing more"* [Herstellerangabe]
- https://www.legendkeeper.com/the-new-legendkeeper-map-tool-is-here/ — pins, regions, paths, labels,
  per-zoom-level visibility, map embed blocks
- https://docs.kanka.io/en/latest/features/nested.html · https://kanka.io/learn/hierarchies — a single
  `parent` field per entry; *"three to four levels of nesting handle 95 % of campaign worlds"*
  [vendor advice, not data]; no documented cycle prevention or depth limit
- https://www.postgresql.org/docs/14/queries-with.html — `CYCLE column SET flag USING path`, SQL-standard
  cycle detection, PostgreSQL ≥ 14
- https://nethackwiki.com/wiki/Bag_of_holding (**HTTP 403**) · https://nethack.fandom.com/wiki/Container
  (**HTTP 402**) — not fetched; §9 item 3

---

*RB-21a. Kaya asked for one gigantic nested map with a nested inventory, and he was right that it is one
mechanism. He was right for a reason nobody had written down: the thing that nests is not the map and
not the bag — it is the **edge**, and it is one column that a continent and a copper coin both carry.
What could not be one thing is the graph. A world is a tree of where things **are** and a web of
everything else they **mean**, and the difference between those two is not taxonomy — it is 89 % of a
world's secret societies, measured. Blattheim is in three places at once in his own wiki, on a continent
that has sixty-seven million painted pixels and no article. The tree can say where it stands. The web
can say who claims it. Only a model that keeps them apart can say both without saying too much.*

> *Ein Kontinent ist eine Truhe, nur größer —*
> *derselbe Rand, dasselbe eine Wort: **worin**.*
> *Doch wem sie gehört und wer in ihr sitzt,*
> *das steht auf dem anderen Blatt.*
> *Wer beide Blätter zu einem heftet,*
> *verrät den Bund, bevor er ihn kennt.*
