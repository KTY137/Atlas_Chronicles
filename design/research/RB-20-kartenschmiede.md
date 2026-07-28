# RB-20 — Die Kartenschmiede

**Pythia's ruling on the integrated map tool.** Compiled 2026-07-27. This document enters the binding
corpus. It rules on the stakeholder's own sentence, treated as a question and not as a mood —

> *„ja, integriertes Inkarnate oder etwas Besseres wäre natürlich sexy und würde perfekt reinpassen.
> (ist aber auch gottlos schwierig vernünftig zu implementieren)"*

**Synthesises and supersedes as the operative ruling:** [`RB-20a`](RB-20a-kartenwerkzeuge.md) (the
market teardown), [`RB-20b`](RB-20b-machbarkeit.md) (feasibility, measured), [`RB-20c`](RB-20c-kunstpipeline.md)
(the art bill, measured on the fixture), [`RB-20d`](RB-20d-erzeugung.md) (generation),
[`RB-20e`](RB-20e-widerspruch.md) (Nemesis, against all four). The five briefs remain readable and
authoritative for their own evidence; **where a number in this file differs from one of them, this file
is the operative figure and says why.**

**Reads as binding and does not re-open:** [`RB-11`](RB-11-steam-vs-browser-verdict.md) (PixiJS pinned,
DOM-authoritative, canvas behind `MapRenderer`, browser + Electron, one-time GM licence, players never
pay, discovery through creators, **UVTT + Foundry/Roll20/FG export at launch**, the Forge separable) ·
[`RB-04`](RB-04-asset-licensing.md) (the redistribution trap) · [`RB-02`](RB-02-rendering-tech.md)
(budgets, pyramid, fog-as-server-fact) · [`RB-18`](RB-18-widerspruch.md) (the arithmetic for one builder).

**Method.** Nothing is invented. Every figure is carried from one of the five briefs with its original
attribution, or computed here from those figures with the inputs shown and marked **[computed]**.
Where the evidence is thin this file says **"the evidence is thin"** in those words, and where a figure
could not be established it says **"no reliable figure found."** §10 lists every gap.

**One discipline applied to myself, up front.** RB-20e's central finding is that four briefs each
priced a different scope and nobody added them. **A verdict that recommends a smaller thing without
adding *its* lines commits the same sin in the opposite direction.** §5.3 therefore prices the
recommendation by the same union method Nemesis used against the editor, and the recommended number is
**larger than the number Nemesis said she could not break**. That is deliberate. It is the honest one.

---

## 1. Die Antwort in drei Sätzen

> **1 · Yes — but not the version he imagines: we build the map that *knows*, not the map that *draws*,
> and the two are separated by ≈37 developer-days of which, by RB-18 §4.2's own test, exactly zero are
> fusion-bearing.**
>
> **2 · The committed thing is a reader and a seeder — the user's own 8192² raster on the pyramid that
> already exists, a vector world layer of regions, routes and places that the wiki's 690 red links
> require anyway, per-character projection over that geometry, and a generator that arrives with a
> thousand *doors* instead of a thousand articles — ≈24 developer-days for the part that cannot be
> bought anywhere, ≈42 for all of it, at €0 of art.**
>
> **3 · The stamp editor Kaya pictured is priced at ≈65 days (≈78 with contingency), it is not refused,
> it is not committed, and it is not asked again until three one-day spikes are green — because after
> the committed half lands it becomes a pure parity purchase, and a parity purchase deferred costs
> nothing but the wait.**

**And the sentence to say back to him, which is the whole ruling compressed:**

> **Du besitzt das Bild schon.** It is 8192 × 8192 — the exact export ceiling of both Inkarnate and
> Wonderdraft — and it cost you years in a tool that will never tell you what is on it. Building you a
> better version of *that* tool costs four thousand six hundred drawings we cannot draw and cannot buy.
> **Making that picture into a place costs four days, and making it answer a question you did not
> prepare for costs eleven more.**

### 1.1 The ruling Nemesis demanded by name (RB-20e route item 6)

RB-15 §3.3/7c **refuses a hand-drawing map editor**: *"Chronicle will not compete with Inkarnate's
asset library or Dungeondraft's brushes. That is a decade of art production."* RB-20b §7.3 argues the
place-layer is a *different function* RB-15 never ruled on, and honestly flags that this is its own
argument and not RB-15's. **Apollon must rule by name. I rule:**

> **RB-15 §7c stands, unamended, and it is upheld twice over by measurement it did not have.** It
> refused (a) a brush engine and (b) an asset library. Both refusals are re-confirmed here with
> numbers: 4,600 assets in one release from 23 employees; 309,229 distinct colours on the real file;
> a paint substrate that is Photoshop on 67.1 megapixels.
>
> **The vector world layer — regions, routes and places as permissioned, citable entities — is a
> different function and was never inside §7c's scope.** It is not map *making*. It is the wiki's
> geography surface, required by K8/K9 independently of whether anything is ever drawn, and evidenced
> in the stakeholder's own fixture: 74 articles, **690 mainspace red links**, of which *Andaria* — the
> place whose 67.1-megapixel painted map sits in the same directory — is one, fifteen times over.
>
> **The placement editor over that layer is inside §7c's spirit and outside its letter.** It is
> therefore **neither granted nor refused**: it is priced at ≈65 days, gated behind §7's three spikes,
> and returned to Kaya as a decision with a real number attached (`OPEN-DECISIONS.md` M3). He is
> entitled to spend it. He is not entitled to spend it believing it is 37.

---

## 2. Was schwer ist und was billig ist

One table. Taken from RB-20b's decomposition, **corrected wherever RB-20e broke it**, with the
correction marked. "Days" are new engineering only — `MapRenderer` (8) and the tile pyramid (10) are
already in `CHAMPION.md` §9.2 and are not re-charged.

| # | Part | RB-20b's verdict | **Corrected verdict** | Days | The evidence, and the correction |
|---|---|---|---|---:|---|
| 1 | **The stamp library** | *"the whole bill"* | **Impossible, permanently. Unchanged.** | — | 4,600 new/reworked assets in one Inkarnate release; 23 employees `[estimator]`; 30K+/23,400/8K on one vendor page. **Unbuyable:** *"Customers may not redistribute, extract, or resell any Products, whether in raw or modified form."* Eleven of CartographyAssets' thirteen CAL licences forbid it too |
| 2 | **The terrain paint substrate** | absent — substituted by feathered regions | **The genuinely hard thing, and it is designed out, not deferred** | **refused** | RB-20c §5.1: brush + eraser with falloff, layer compositing, blend modes, tiled undo over 67.1 MPx, GPU dirty-region readback. *"Photoshop-in-the-browser… the single largest unpriced surface in this whole area"* |
| 3 | **The editing surface** — selection, marquee, transform gizmo, snap, z-order, layer panel | **not in RB-20b's table at all** | **Hard, underestimated, and the largest single omission in the round** ⚠ | **12** | **RB-20e B-6.** RB-20b §6 enumerates five subsystems and prices none. RB-20a §6.4 saw it coming: *"The list is cheap. The editor over the list is not."* Inkarnate's own bug board after ten years and 23 salaries: 5+ s to place a stamp in a large group, 3–5 s undo, mask lag, brushes broken on Linux. **12 is probably optimistic; that is an inference from a competitor's bugs, not a measurement** |
| 4 | **The stamp bulk renderer** — `ParticleContainer`, atlas packer, paging, LOD | cheap-medium | **Cheap on a vendor's M3, unmeasured on ours** | 8 | `ParticleContainer`'s supported properties are *"texture, position, anchor, scale, rotation, alpha and color"* — the `Stamp` record field for field. 200,000 sprites at 60 fps `[Herstellerangabe, M3]`. **Zero Pixi frames were rendered this round.** What breaks first is not sprites, it is atlas residency past RB-02's 16-textures-per-frame budget |
| 5 | **The placement format** | trivial | **Trivial, and measured** | 2 | 50,000 stamps = **4.78 MB JSON / 1.06 MB gzip / 45.4 ms parse**; cull query 0.021 ms returning 1,897 visible. TaleSpire ships whole buildings as clipboard strings under a **30 kB** cap |
| 6 | **The renderer and the tile pyramid** | already paid | **Already paid, already built, and it does three jobs** | *0 (18 ledgered)* | On disk: 6 levels, 256 px tiles, WebP q82, **1,365 tiles, 9,900,000 B, 31.7 s**, viewport RAM ~8 MB vs 256 MB naive (**32×**), first visible pixel **17,690 B vs 10,901,550 B (616×)**. Import path, export path, **and the renderer's own LOD floor** — that third job is RB-20b's and it is the strongest cost argument in the set |
| 7 | **The vector world layer** — regions/routes/places, hit-test, snapping, labels | cheap | **Cheap, and owed regardless** | 9 | `rbush` + `polygon-clipping` + `earcut`, all MIT, single-digit kB. Hit-test **7.85 µs at 2,000 regions** — every mouse-move of every frame at 0.05 % of the frame budget. RB-20c §1.4: the map's roads, rivers, coastlines and shore halos are **already vector strokes**, visible in the pixels |
| 8 | **Per-character fog over geography** | cheap; *"the one thing no competitor ships"* | **Cheap in geometry. The claim is a delta, not a category** ⚠ | 3 | **RB-20e B-11.** Measured: **9.38 ms per incremental reveal**, 386 ms from scratch at 800 revelations, in a worker. But Foundry ships the half-known place today: *"If a player has 'Limited' permissions, they will be able to see the position of the Map Note and its assigned label, but they will not be able to open it."* **Ours is a derived predicate; theirs is a hand-set per-user ACL. That delta is real and it is all we may claim** |
| 9 | **Entity binding** — a placement carries a passage-id, a region carries a clause | *"the differentiator, and the cheapest line"* | **Upheld. 4 days, and every fusion-bearing day in the whole area is inside it** | 4 | It is a foreign key and a projection predicate. The trap is naming it wrong: **the stamp is not the entity.** Promotion is explicit, or dragging a forest writes 400 wiki mutations and die Herkunftsschicht becomes a log of somebody rearranging shrubbery |
| 10 | **Idempotent re-import** | *"the one genuinely hard engineering problem"* | **Upheld, and it is the highest-variance number in the corpus** | 4 | FMG's ids are **array indices**; indices are not stable across regeneration. `azgaar-foundry`'s own README: *"updates require reimporting the map to refresh journal contents."* Identity must be `hash(seed, generator_version, kind, path)`. 4 days is an estimate by analogy to `spike-A-passage-identity` **in a different domain** |
| 11 | **Export at 8192² from a browser** | medium; one platform cannot | **Upheld** | 4 | iOS/Safari canvas **area cap 16,777,216 px** — 8192² is **4.0× over**; a single-canvas export is impossible on iPad at any effort level. Tiled export is the only portable implementation. The bottleneck is the *encoder*, not the compositor: 16 × 2048² tiles = 24.5 s PNG vs 13.3 s WebP vs 0.4 s JPEG |
| 12 | **Raster → SVG tracing** | refuted | **Refuted twice, on the full file** | **0** | **309,229 distinct colours** on the full 8192² image; 22,536–24,162 on a 260×166 downsample, the twelve most common being twelve shades of one sea blue. Nobody should spend a day on it |
| 13 | **Collaborative multi-writer editing** | refuse | **Refuse** | **0** | CRDTs over polygon geometry are a research project (what is the union of two conflicting polygon edits?). Nobody asked. Single-writer lock with a visible holder and one-click handoff: 1 day |
| 14 | **The art, for one style** | *"80–120 stamps per theme × 4 themes"* | **≈90 for one style — but the ×4 is only avoided by narrowing K1's claim** ⚠ | §3 | **RB-20e B-15: a 3.5–5.3× disagreement between two briefs on the same day.** RB-20c measured the fixture: **≈76–82 distinct designs, rounded to ≈90**, and the settlement layer is **four glyphs**. §3 rules on the multiplication |

**The finding of the table, stated once:**

> **The hard part is the art, and the art is the part that does not matter to us. The second-hardest
> part is the editing surface, and it is the part nobody priced. The parts that matter — 6, 7, 9 —
> are the parts we were building anyway.** Kaya's instinct that this is *gottlos schwierig* is right
> about the tool he named and wrong about the thing he wants.

---

## 3. Das Kunsturteil

### 3.1 The number

**For the first release: €0.** Not "cheap" — zero. The first release commissions nothing, because the
first release's terrain is **the user's own file**, and the stakeholder is the proof: he already owns
an 8192², 10,901,550-byte painted world map, and Apollon has already sliced it.

**When art is commissioned, the bill is the only calibrated line item in this entire project**, because
an illustrator's per-asset rate is published and a "developer-day with an AI crew" has never once been
converted into a measured day (RB-18 §1.7):

| What | Assets | Cost | When |
|---|---:|---|---|
| **Nothing** — imported raster + CC0 markers + procedural lines | 0 | **€0** | slices 1–2, and possibly forever |
| **Der Schaustempelsatz** — the twelve that photograph one biome | 12 | **€1,100–2,200** | only when a paying user exists |
| **Der volle Satz** — one complete style, only what must be drawn by hand | 60 | **€2,700–8,200** | only when someone has asked twice |
| *(refused as stated)* four themes × 80–120 stamps | 320–480 | *€14,400–65,800* | **never in this shape — see §3.3** |

Rates: **$50–150/asset at the 25+ set tier**, $75–200 at 11–25, $100–300 at 1–10; German
*Honorarwerk* figures are indicative only (€384 half-page editorial, €295 animation day rate, read in
secondary coverage, not in the €29 primary). **Illustration throughput for map stamps — stamps per
artist-day — no reliable figure found**, so the commission is priced per asset and the artist quotes
the calendar. Assume 6–12 weeks of *someone else's* calendar for 60 assets.

### 3.2 What is free, and it is more than the corpus assumed

- **The settlement layer costs nothing.** The entire marker vocabulary of a real 8192² world map is
  **four glyph designs** — a gabled house, a round-topped keep, a wide gate, an anchor — at roughly
  four discrete sizes (413 marker-shaped components, clustered; 199 in the four clean clusters).
  game-icons.net publishes **4,180 CC BY 3.0 SVGs**, of which **189 Building & Place** and **74 Map &
  Country**. SVG means recolourable, which means K1 gets the marker layer for free.
- **Four things that read as artwork are arithmetic:** coastal contour lines, the shore halo, dashed
  roads, tapered rivers. All are strokes and mask offsets over vector geometry — `Graphics`, not
  textures — **and they re-skin with the theme, which a drawn coastline cannot.**
- **The eleven base surfaces are CC0** (ambientCG, Poly Haven).
- **An entire second shipped style is CC0 and already exists:** K. M. Alexander's #NoBadMaps corpus,
  ~33 brush sets from 16th–19th-century cartography (**Moronobu Gansai 1140+, Ogilby 800+**),
  *"free for personal or commercial use."* It is engraved/historical and therefore cannot serve
  Andaria's painted look — **which is exactly why it is worth having: it is a style Inkarnate does not
  lead in, at €0.**

### 3.3 The style discipline, and the one clause of it I do not adopt

RB-20c's R1–R4 are adopted verbatim as the commissioning brief: **one palette declared as tokens · one
light angle, never negotiated · one silhouette weight and outline treatment · shadow always on a
separate layer** (it cannot be retrofitted, and without it tint turns the shadow the object's colour).
Two additions to RB-04's tier-0 deliverable list stand: layered source, and greyscale-with-alpha
authoring.

**R5 — "draw once, tint through theme tokens" — is adopted as a *discipline* and refused as a
*saving*.** Its author reports the measurement that would have supported it **failed**: multi-scale
normalised cross-correlation across biomes returned 8 and 28 hits dominated by false positives, so
*"the claim 'the same silhouette is re-tinted per biome' is NOT established."* And RB-20e B-15 supplies
the structural reason it cannot carry K1's load: **a pixel-art tree is not a hue rotation of a painted
tree.** Tint carries a *season*. It does not carry a *rendering style*.

**Therefore I narrow K1's map claim now, in public copy, before a reviewer narrows it:**

> **Die Häutungsregel. The map re-skins where we drew it and does not re-skin where they drew it.**
> Region fills, coastlines, roads, rivers, labels, markers and UI chrome are ours: they are tokens and
> strokes, and they change completely with the theme. The imported raster and any commissioned stamp
> set are one style and stay that style. **The product must show which layer is which**, and the
> marketing sentence *"the map re-skins with the theme"* is replaced by *"everything we draw on your
> map wears your theme."*

That ruling costs one afternoon of mockup to falsify (§7, gate **K-G6**) and saves a
**€14,400–65,800** commitment from being made by assumption.

### 3.4 How our first release will compare visually to Inkarnate — undiluted

**Against a map the user already owns: identical, because it *is* an Inkarnate map**, served at 17 KB
to first pixel instead of 10.9 MB. This is not a rhetorical trick; it is the whole strategy, and it is
the same strategy a rival already validated — **Augur: Instant Dungeons** ships a generator with no art
library and lets the user bring Dungeondraft's 100k-object packs. *The way to solve the stamp problem
is to not own the stamps.*

**Against an empty world — our own landing-page screenshot, and a new GM's first campaign — we will
look worse than Inkarnate, and worse than Dungeon Alchemist, and it will be the first thing a reviewer
names.** Say it here so nobody is surprised:

- A polygon with a flat fill *"looks like a political atlas, not a painted map. This is the single most
  noticeable difference and a reviewer will name it in the first paragraph."* Feathering in a shader
  recovers most of the blended coast; it recovers **nothing** of freehand irregularity or of painting
  over a stamp.
- **"It is data" does not rescue a map that looks worse, in the category where maps compete.** Every
  negative review of every map tool in the corpus is aesthetic: *"a very limited set of available
  environments"* · *"lack of certain themes"* · *"complete inability to create elevation"* · *"too
  barebones"* — about a product with **6,000+ objects, €2.46 M and four-plus years in Early Access.**
  If 6,000 objects reads as *"very limited"*, ninety assets reads as a demo and twelve reads as empty.

**What compensates, and it is a positioning answer rather than an art answer:** *"it is data"* rescues
the map **exactly once — in the comparison the buyer runs against a wiki.** World Anvil's, Kanka's and
LegendKeeper's maps are also pins on an uploaded raster, and against those our data model wins on every
axis. **§4 therefore rules the shelf, because that is the decision that is currently being made by
default.**

---

## 4. Der Unterschied, entschieden

### 4.1 The thesis, clause by clause, final

| Clause | Ruling |
|---|---|
| *"A stamp scene is a list of `{asset, x, y, scale, rotation, layer}`"* | **Upheld, proven three ways.** `ParticleContainer`'s exact property set; TaleSpire's <30 kB clipboard buildings; 50 k stamps = 1.06 MB gz / 45.4 ms parse |
| *"The expensive part of Inkarnate is art, not engineering"* | **Upheld — and it is the clause that should worry him.** 4,600 assets in one release, 23 employees. **An art cost we cannot pay is not an increment we can take; it is a capability we will not have** |
| *"The vector world layer must be built anyway, because the wiki links to it"* | **Upheld, and it is the load-bearing clause.** 690 red links in his own world; the map's roads, rivers and coasts are already vector strokes |
| *"Every stamp is an entity"* | **Refuted as stated.** Stamps are anonymous; promotion is explicit; otherwise the provenance layer fills with shrubbery |
| *"Fog is per-character"* | **Upheld as a delta, refuted as a category.** Foundry ships Limited-ownership map notes today |
| *"The map re-skins with the theme"* | **Narrowed by ruling** — §3.3, die Häutungsregel |
| *"Therefore the increment is small"* | **Refuted. The editor is ≈65 days, not 37 and not 43.** But **the increment that carries the differentiator is ≈24** — §5.3 |
| *"…and the differentiator is categorical"* | **Categorical, cheap, and now provably front-loaded: 100 % of the fusion-bearing days are inside the committed half** — §5.4 |

### 4.2 Is *"we make a place, not a picture"* real, valuable and defensible? — ruled

**Real: yes, narrowly, and the narrow version is the only one that may be said out loud.** The
approximation exists and is free — `azgaar-foundry` already turns a generated world into interconnected
journal entries in compendia with **per-entry permissions**, at 61 GitHub stars. Foundry already ships
the half-known place per user. **What does not exist anywhere is a *derived* predicate:** visibility
falling out of what a character *knows*, from the same projection that fogs the terrain, cites the
passage and modifies the roll, with **no GM bookkeeping**. That is `Sicht` applied to geography, and it
is the delta — not the category.

**Valuable: yes, but not to the buyer the market data describes.** RB-20e B-10 is correct and I do not
route around it: on Inkarnate's own board, *"Group 2.0 — save group as stamp"* has **574 votes** and the
**entire** Note Tool category, in which a map object could acquire meaning, totals **22** — a three-year-old
request for *"associate any desired URL with a map object"* sitting at 1–4 votes, from an audience of
~1.2 M visits/month that has produced 16 million maps. **The counter is equally true and equally
narrow:** vote boards measure articulated demand for adjacent features, never latent demand for absent
categories, and the demand for places-that-mean-something is measured elsewhere — 690 red links in the
only real user's world, and half a million Beyond20 installs paying a friction tax rather than give up
either half of a stack.

**Both survive. What they jointly decide is the shelf, and I rule it:**

> **Chronicle's map is a feature of a wiki that plays. It is never a map product, it is never
> positioned against Inkarnate, and it never appears in a comparison table whose other column is a
> painting tool.** Against a map tool we lose on the only axis that category reviews on — how it looks
> and how much of it there is. Against a worldbuilding wiki we win on every axis, and *that* is the
> shelf where 690 red links live.

**Defensible: yes, structurally, for exactly as long as the projection is ours.** A bridge cannot carry
it, and this is the one place in the corpus where two competitors published the ceiling themselves:
Azgaar's and Watabou's own integration exchanges *"a seed, a few flags (coast, river etc), and a
name, whereas warping data of a medium-sized city would consist of hundreds of floating point numbers,
making URLs unsuitable."* A URL has no `Sicht`, no mint, no rules engine and no history.

### 4.3 The one concrete moment at a real table

The differentiator must be felt by a person in a room, or it is a designer's abstraction. RB-20e B-12
is right that steps 1–4 of every demo written this round are **prep** — Wednesday at 15:00, alone —
and that the champion's whole thesis is that prep shrinks to a seed. So the moment must be at 21:47,
and it must be the GM's, and it must require none of the editor.

> **21:47. Session fifteen. The party turns north, toward a place Kaya never prepared.**
>
> He does not alt-tab. He clicks the region on the map that has been on screen all evening. It is a
> **red link with a seed behind it** — a door. He presses it, and the thin ring opens onto: *Blattheim ·
> Hafenstadt · Kultur: andarisch · ~2,400 · Königreich Terabur · Wappen · **Noch nicht erschlossen.***
> He reads three lines aloud, invents the harbourmaster's grudge because that part is his job, Sera
> rolls, and `Ctrl+Enter`. **One paragraph is minted, by a human keypress, with a Saturday over it** —
> and Blattheim, which has been a red link fourteen times across his wiki, is now blue.
>
> Brannt, who was not in the room for that scene, opens the same map on his phone on Tuesday. **His
> Blattheim is still a red link, byte-identically**, and his DevTools contain none of it.

**Why that moment and not another.** In Foundry he would be alt-tabbing to a wiki that has nothing at
that coordinate. In World Anvil he would be *writing an article* at 21:47 — which is not a moment, it
is a chore. The difference a GM feels is not *"the mountain is an entity."* It is:

> **„Die Karte hat eine Frage beantwortet, auf die ich mich nicht vorbereitet hatte — und die Antwort
> wurde Kanon, ohne dass ich vom Tisch aufgestanden bin."**

That moment needs the pyramid (built), the world layer (owed anyway), the generator's doors, `Sicht`,
and the mint gesture that already exists. **It needs no marquee, no gizmo, no layer panel, no atlas
packer and not one commissioned drawing.** That is the sequence's own argument, and it is why the
sequence is what it is.

---

## 5. Die Reihenfolge

Four different things with four different costs. **Ordered so that each one reduces the demand for the
next**, which is the property that makes a sequence worth more than a list.

### 5.1 The chain, and which one makes the next one cheaper

| Thing | State today | What it makes cheaper |
|---|---|---|
| **1 · Die Kachelpyramide** | **measured and half-built** — on disk at `fixtures/eron/media/kachelpyramide/`, 1,365 tiles, 9.9 MB, 31.7 s, 32× RAM, 616× first pixel | **Everything.** It is the import path for every rival's output, the export path for anything that stays in-app, **and the renderer's own LOD floor** — which is the single fact that would make a stamp renderer affordable at world scale if one is ever built |
| **2 · Der Weltvektor** (regions, routes, places as entities) | owed regardless — 690 red links; the map's roads and coasts are already strokes | Makes the **generator** cheap: die Türsaat needs somewhere to land, and `Ort`/`Region`/`Weg` *is* that place. Also makes the **editor** cheap if it comes: an editor over rows that already exist is an authoring UI, not a data model |
| **3 · Der Erzeuger** (die Türsaat, over FMG) | free algorithm — **18,165 lines of MIT-licensed TypeScript**, pushed the day before this brief, plus an explicit commercial-derivative-works clause | Makes the **editor possibly unnecessary**, which is the cheapest outcome available. It also fixes `CHAMPION.md` §15.9 — *"session one is still empty"* — carried unresolved for four rounds. **That is not a map feature; it is the cold-start fix wearing a map's clothes** |
| **4 · Der Kartenleger** (the placement editor) | ≈65 days, ≈78 with contingency | **Nothing.** Every fusion-bearing day is already spent upstream (§5.4). It makes screenshots |

### 5.2 Tied to the champion's slices (§12)

**Slice 1 — „Die Tür" (no canvas, and this is the important sequencing claim).**
Die Türsaat needs **no Pixi, no pyramid, no renderer**: an FMG Full JSON in a worker, a mapper, and
rows that render as red links with seeds behind them. **It is the only piece of K5 that can land in the
slice `CHAMPION.md` §9.6 itself admits is *"a wiki with dice and an outline"*, and it is the answer to
the weakness that slice has carried since round 3.**

- `S-G1 · Der Keim` (1 d) · the FMG parser + mapper (4 d) · door minting with provenance and seed (3 d)
  · the sixty-second UI (3 d) · **die Grenze**, the package boundary + CI import gate (3 d).
- **The seam is taken here or never.** `packages/forge` must never import `packages/chronik`; three
  days now, impossible to repair later, and RB-11's separability ruling — the Steam-shaped half, the
  Dungeon Alchemist pattern, the only €2.46 M in this market — dies quietly without it.

**Slice 2 — „Die Feder" (the canvas arrives).**
- `S-K1 · Der Stempelwurf` (1 d, run *before* anything else here) · pyramid wiring (1 d) · Tier-U raster
  ingest with magic-byte sniffing, licence attestation and a provenance manifest (5 d) · scene document
  + `MapAnchor` + round-trip fixtures (4 d) · the vector world layer with derived per-character fog and
  DOM labels (9 d) · feathered region fill (3 d) · undo journal + a 4096² export (2 d).
- **UVTT in and out is already ratified and already ledgered at 6 days** — and it is *the whole
  battlemap authoring problem, solved by reading a file*, because all four UVTT-emitting tools hand us
  walls, portals and lights for free.
- **Azgaar GeoJSON/JSON import beside it.** RB-17 Rank 4 rules *exactly one* high-fidelity import and
  K10 makes it Eron/Fandom. **This is argued against that rule explicitly rather than smuggled past
  it:** it is a *shape* import, not a *population* import, it is the only structured world-data
  interchange the category has, it costs days, and it is MIT.
- **Die Wiedersaat** — idempotent re-import / three-way merge (4 d) — is the highest-variance line in
  the corpus. **If it does not land, ship import-once and say so in the UI. Never ship a lossy merge.**

**Slice 3 — die Schmiede.** WFC as *detail fill* on an authored, socket-annotated tile grammar
(algorithm ≈5 d; **grammar and art unbounded**), layout-pass-first per RB-05. **The editor question is
asked here for the first time, with S-K1's measured frame times in hand and not before.**

**Never:** §6.

### 5.3 The number — priced by the same union method Nemesis used against the editor

Every line taken from one of the five briefs at its own author's figure; where two briefs priced the
same thing, **the lower is taken**; nothing is invented. This is deliberately **larger** than RB-20e
§5.6's *"19–25 days"*, because that figure did not add RB-20b §8's Ortsleger lines to RB-20d's Türsaat
lines. A recommendation that under-adds itself is the same disease in a friendlier hat.

| # | Line | Days | Source | Stage |
|---|---|---:|---|---|
| 1 | **Die Grenze** — package split, two renderer methods, import-boundary CI gate | **3** | 20b §6 | slice 1 |
| 2 | `S-G1 · Der Keim` — one FMG world, one mapper, one printed count | **1** | 20d §6 | slice 1 |
| 3 | Türsaat: FMG parser + mapper | **4** | 20d §6 | slice 1 |
| 4 | Türsaat: door minting with provenance, seed and `Herkunft: erzeugt` | **3** | 20d §6 | slice 1 |
| 5 | Türsaat: the sixty-second UI (`0 Absätze im Kanon · 999 Türen`) | **3** | 20d §6 | slice 1 |
| | **Committed stage A — „die Türsaat", no canvas required** | **14** | | |
| 6 | `S-K1 · Der Stempelwurf` — the first Pixi frame this lineage has ever rendered | **1** | 20b §10 | slice 2 |
| 7 | Tile-pyramid wiring into the app (the build script exists and is measured) | **1** | 20d move 3 | slice 2 |
| 8 | Scene document, versioning, `MapAnchor`, round-trip fixtures | **4** | 20b §1 *(20a said 6; lower taken)* | slice 2 |
| 9 | Tier-U raster ingest: upload → magic bytes → licence attestation → manifest | **5** | 20a §7.2, RB-04 | slice 2 |
| | **Committed stage B — „der Kartengrund", the map that opens and knows** | **11** | | |
| 10 | Vector world layer: regions/routes/places, hit-test, snapping, derived fog worker, DOM labels | **9** | 20b §5 *(20a said 3; higher taken — 20a under-scoped fog and labels)* | slice 2 |
| 11 | Feathered region fill — flat-fill floor + one feather slider | **3** | 20b §8 *(half of 20b §3's 6)* | slice 2 |
| 12 | Undo journal + a 4096² single-canvas export | **2** | 20b §8 | slice 2 |
| | **Committed stage C — „der Ortsleger", the region that carries a clause** | **14** | | |
| 13 | **Die Wiedersaat** — idempotent re-import / three-way merge | **4** | 20d §6 — *highest variance in the corpus* | conditional |
| | **Total, committed** | **43** | | |
| | **+ RB-18 §1.2's restored 20 % contingency** | **≈52** | [computed] | |
| | *(already ledgered, not re-charged: `MapRenderer` 8 · pyramid 10 · UVTT 6)* | *24* | | |

**And the editor, for comparison, at RB-20e's own union figure minus the lines already inside the
commitment above** [computed: 65 − (4+9+3+3+2+5) = 39; the marginal lines are stamp rendering & atlas 8,
editing surface 12, stamp palette 5, der Stempelsatz 3, theme atlas swap 3, plus the deltas on terrain
(3), export (2) and undo (1)]:

| | Days | +20 % |
|---|---:|---:|
| **Der Kartenleger, marginal over the commitment** | **≈37** | **≈44** |
| Der Kartenleger, as a standalone union (RB-20e §1.3) | 65 | 78 |

### 5.4 The finding that decides the order

Apply RB-18 §4.2's fusion test to both halves. Nemesis identified the fusion-bearing lines of the
65-day union as `MapAnchor` (~4) and derived per-character fog (~3) — **7 of 65, the worst ratio ever
recorded in this lineage.**

**Both of those lines are inside the committed 43.** [computed: line 8 carries `MapAnchor`; line 10
carries the derived fog worker.] Therefore:

> **Every fusion-bearing day in the entire map area is inside the committed half. The ≈37 marginal days
> of the editor contain, by RB-18 §4.2's own test, exactly zero — not 11 %, not 20 %. Zero.**
>
> The committed half runs at **≈24 % strict / ≈40 % generous** fusion-per-day (7–17 of 43), against the
> tactical half's 31–48 % and the editor's 0 %. **That is why the order is not a preference. Deferring
> the editor costs no fusion at all, and it is the only decision in this document with that property.**

**One honest counterweight to my own finding, because a one-sided reading is worthless.** The editor's
single best line — *der Stempelsatz*, group → reusable named stamp, 3 days — is **the market's own #1
feature request at 574 votes**, and it is the mechanism TaleSpire monetised. It is parity, not fusion;
but it is parity with the strongest demand evidence in the whole corpus, and if the editor is ever
built it is the first line, not the last.

---

## 6. Was wir verweigern

*Mēden agan* governs scope and sequence, not ambition. Each refusal is a **measured avoidance of a
specific unaffordable thing**, and each names what the user does instead — because a refusal without a
substitute is a hole.

| # | Refused, permanently | Why, with the number | **What the user does instead** |
|---|---|---|---|
| 1 | **A first-party stamp library** | 4,600 assets in one release, 23 employees; unbuyable at the category leader's own store and across eleven of thirteen CAL licences | Brings her own (Tier-U ingest, `redistribution_allowed = false`, never re-served), or uses CC0: K. M. Alexander (~33 sets, 1140+/800+), game-icons.net (4,180), Kenney, ambientCG |
| 2 | **A raster brush / terrain-paint engine** | Photoshop on 67.1 megapixels; and it costs resolution independence, 84-byte undo **and** K1 re-skinning — a repainted raster map is a blurry raster map | Imports the terrain she already has, or generates it. **The paint substrate is designed out, not deferred: the Forge is what replaces the painter** |
| 3 | **Coastline beautification, the mask tool, stamp *flatten*** | These are the three things a stamp model structurally cannot do; naming them is cheaper than discovering them | They are already baked into the raster she imported |
| 4 | **A marketplace for stamps** | RB-04's redistribution trap, restated by the category leader about its own store; a registry is a job, not an artifact (RB-17 A-5) | The registry hosts **bytes** for `redistribution_allowed = true` and **metadata + an installer** for everything else. That is the only shape in which this hobby's actual asset economy can appear inside our product at all |
| 5 | **Multi-writer collaborative map editing** | CRDTs over polygon geometry are a research project; nobody in the corpus asked; saves an estimated 15–25 days *(unsourced estimate)* | Single-writer lock, visible holder, one-click handoff — 1 day |
| 6 | **Raster → SVG tracing** | 309,229 distinct colours on the real file | Nothing. It was never a thing |
| 7 | **Competing on asset count, in any copy, ever** | 6,000 objects reads as *"a very limited set"* in this category's own reviews | We do not enter the comparison — §4.2's shelf ruling |
| 8 | **Forking or vendoring FMG's generators** | 698 references to a global `pack`, 97 to `grid`, 19 of 40 files importing d3, 11 DOM `ensureEl(` call sites — a permanent maintenance fork against a repo that was pushed yesterday | We run it unmodified and **consume its export**. `LicenseRef-Azgaar-FMG-1.0` with a text snapshot, because GitHub classifies it `NOASSERTION`, not MIT |
| 9 | **Watabou's code, and donjon's** | TownGeneratorOS is **GPL-3.0** (incompatible with a proprietary one-time licence) and is an old snapshot; donjon's source is **CC BY-NC 3.0** | Link out, or import their JSON. Never fork, never vendor, never read-and-reimplement-from |
| 10 | **Generative AI in shipped art** | Exclusivity under §31a UrhG may be unobtainable for AI output; and in this hobby *"no generative AI"* is a marketing asset while *"some"* is a news cycle — Inkarnate banned it from its own marketplace in Oct 2025 after a revolt | Procedural generation everywhere; AI stays optional, always-draft, tier U, on the user's own upload path, never in a warranted export |

**And two claims refused, which is a different kind of refusal:**

- **Never claim "maps with pins that open lore articles."** RB-15 §5 already forbade it: *"the most
  commoditised 'fusion' in the entire landscape."* World Anvil, LegendKeeper and Kanka all ship it.
- **Never claim "nobody ships the half-known place."** Foundry ships it under Limited ownership and a
  reviewer will post the screenshot. We claim the *derived* predicate and nothing wider.

---

## 7. Die Tore

Every gate can go red. Written in `CHAMPION.md` §12.4's style: a condition, and what it falsifies.

| Gate | Green when | **If red** |
|---|---|---|
| **S-P1 · Drei Bücher, ein Server** *(carried, ~2 d, unrun for five rounds)* | The per-character projection exists as running code and three books diverge on one server | **Nothing in this document may be built.** Every map claim here — the derived fog, the half-known region, Brannt's red link — is downstream of it. It is the crew's own tripwire and it has fired |
| **K-G1 · S-K1 · Der Stempelwurf** *(1 d)* | 50,000 anonymous stamps in a `ParticleContainer` + 400 entity sprites over the real Andaria pyramid: p50/p95 frame time, draw calls, texture count, and the count at which 16.7 ms is first missed — on the reference laptop, WebGL2, on battery | **RB-20b §2 is wrong and the editor question closes for one day instead of eight.** If it misses at 5,000 stamps, *der Kartenleger* is not a 65-day decision, it is a no |
| **K-G2 · S-G1 · Der Keim** *(1 d)* | One FMG Full JSON → the mapper → printed counts by kind, plus **id stability across two exports of the same seed**, plus collisions against the Eron corpus | **Every day-figure in every RB-20 brief is wrong**, and the crew learns it for one day. This is the cheapest calibration artifact in the project |
| **K-G3 · Der Kartengrund** | Kaya's own 8192² Andaria: first visible pixel **≤ 50 KB and ≤ 1 frame**, viewport RAM **≤ 16 MB**, pyramid build **≤ 60 s**, format read from **magic bytes** and never from the filename | The best-evidenced artifact in the project does not survive being wired into the app, and the reader story fails at its cheapest point |
| **K-G4 · Die Türbilanz** *(the Erststundenbudget, applied to generation)* | After importing a generated world: **`0 Absätze im Kanon`**, **zero** articles written by the machine, and a human keypress mints the first one **within 60 s** | We shipped World Anvil's documented disease at generator speed — *"dozens and dozens of features, none of which I needed"* — and we deleted the champion's headline flex by turning 1,000 red links blue |
| **K-G5 · Die Wiedersaat** | Regenerate, or bump the FMG version: **every human-authored passage survives byte-identically**, bound by `hash(seed, generator_version, kind, path)` and never by array index; the three-way merge names every retired place with an explicit keep-or-retire choice | **Ship import-once and say so in the UI.** Never ship a lossy merge |
| **K-G6 · Die Häutung** *(K1's falsifier, §3.3)* | Switching theme visibly re-skins **every layer we drew** — fills, coastlines, roads, rivers, labels, markers — and the UI states plainly that the imported raster does not change | K1's *"the map re-skins with the theme"* is corrected in public copy **before** a reviewer corrects it, and a **€14,400–65,800** four-theme commission is never scheduled |
| **K-G7 · Der zweite Blick** *(der Zwillingsbeweis, extended to geography)* | Two characters, one scene: the weaker character's DevTools contain **zero bytes** of the regions, places, routes and doors she does not hold; her red link is byte-identical to a reader with no campaign at all | The differentiator does not exist. This is the map's version of gate *Leak* and it is the only gate here that can falsify §4 |
| **K-G8 · Die Grenze** | CI fails the build if `packages/forge` imports from `packages/chronik` | RB-11's separability ruling is dead and cannot be recovered by refactoring. **Cheap now, impossible later** |
| **K-G9 · Die Bilderregel** *(adopted verbatim from RB-20e §4.3)* | No beat is sequenced ahead of a fusion-bearing beat on the grounds that it demonstrates better; any such reordering is recorded in the round's verdict **with both beats' fusion-per-day ratios beside each other** | The lineage has ~26 gates and not one of them can go red because the crew chose the prettier thing. This one can |
| **K-G10 · Der einzige Winkel** *(only if art is ever commissioned)* | Every delivered asset passes a lint before the second payment milestone: one palette, one light angle, one silhouette weight, shadow on its own layer. **CI: no asset with `tier ∈ {1,2}` may sit on the `stamps` layer** | A coherence-constrained commission does not fail as *"half a set"* — it fails as *"the wrong halves of two sets"*, which is worth less than 30 coherent assets and has no partial-credit recovery |

**One hygiene item, at the corpus's own standard:** `spike-K-kartenmass/` has no `RESULTS.txt`, unlike
all three earlier spikes. RB-20b promises *"nothing in §7 is a number you have to take from me"*, and
today those numbers live only inside the brief. One redirect closes it.

---

## 8. Was das für die Arena bedeutet

**Recommendation: the Kartenschmiede does *not* take round 7's rung, and it does not join it as a
co-equal. It sends exactly one artifact into R7 and takes its own rung at R9 „Die Dichte", conditioned
on three spikes.**

**Why not R7.** *Die Werkstatt* is K1 + K2 at craft level — the theme system and the visual
rule-builder. K2 is the **ratified go-to-market** (RB-11: discovery runs through creators and system
authors) and is **still uncosted after six rounds** (RB-18 §1.4). Put the map on that rung and
die Bilderregel is violated in the same round it is adopted: **a map editor is the only thing in this
project that produces a screenshot; the wiki/table fusion produces a sentence.** The map would eat the
rung, K2 would be deferred again, and the round's own craft floor would be judged on the prettier
thing. RB-20e §4.1 records that **five independent rankings across three rounds put map authoring at or
near the bottom, and the only input that moved it to the top of the agenda is one adjective.**

**What does ride R7, and it belongs to K1 and nothing else:** **one map artifact for gate K-G6, die
Häutung** — a single mockup of a region-filled, road-struck, labelled map rendered in two themes over
an unchanged imported raster. It is an afternoon of Aphrodite's time, it is a genuine craft artifact of
exactly the kind R7 exists for, and it **falsifies or confirms a €14,400–65,800 commitment** that is
currently held as an assumption.

**Why R9.** *Die Dichte* is the rung whose name already describes die Türsaat: **a world that arrives
dense** — ~1,000 named, typed, cross-referenced places with cultures, religions, routes and diplomatic
relations, delivered as doors — against a hand-built world that produced 74 articles and 690 red links
over 1,153 edits. **Both of those worlds are broken in opposite directions**, and the rung that fixes
one with the other is Dichte, not Werkstatt.

**The three conditions, and they are not negotiable:**

1. **`S-P1` green** — the projection exists as running code. It has been mandatory and unrun for five
   rounds while the map got spiked twice, and the crew's own tripwire (RB-16 R7) has fired.
2. **`S-G1` green** (1 day) — the mapper runs and prints counts.
3. **`S-K1` green** (1 day) — the first Pixi frame this lineage has ever rendered.

**If S-P1 is still red when R9 opens, the Kartenschmiede does not forge.** No exceptions, and this
sentence exists so that the exception cannot be argued later.

---

## 9. Offene Entscheidungen für Kaya

Appended to [`../iterations/OPEN-DECISIONS.md`](../iterations/OPEN-DECISIONS.md) as **M1–M8** (append
only, existing table format preserved). The one that changes the most money is first:

> **M1 · Habt ihr noch die Inkarnate-/Wonderdraft-Projektdatei zur Andaria-Karte?**
> If you or your colleagues still hold the **project file** — not the 8192² export, the *.inkarnate*
> or *.wonderdraft* source with its layers, its polylines and its stamp placements — then the vector
> world layer is an **import, not a reconstruction**: coastlines, roads and rivers arrive as polylines,
> region outlines as polygons, and every stamp arrives as a placement record. That is committed line 10
> (9 days of authoring UI) falling to a parser, and it is the difference between tracing Haus Vharon's
> border with six clicks and **having it already**. It also decides whether the imported map can
> re-skin at all (§3.3): with layers, our strokes sit *above* their raster and wear the theme; without
> them, we can only draw on top of a flat picture. **Nobody has asked. It is one message to a
> colleague, and it is worth more than any estimate in this file.**

---

## 10. Was nicht festgestellt werden konnte

Recorded so no future round launders an absence into a fact.

1. **Frame time for our own stamp scene, on our own hardware.** **Zero Pixi frames were rendered this
   round.** Everything in §2 line 4 is Node-measured data plus a vendor benchmark on an M3. `S-K1`
   closes it for one day and has not run. **This is the most important unknown in this document.**
2. **Whether `Sicht` costs what the ledger says.** `S-P1` — two days — has not run for five rounds. The
   *derived* half of per-character fog is measured (9.38 ms/reveal); the *authoritative* half, which is
   the whole differentiator, has never been executed.
3. **Whether a single GM would pay for a map because its places are entities.** No demand measurement
   exists in either direction beyond two proxies — 574 vs 22 votes, and 61 GitHub stars — and both are
   proxies, not surveys. **The plan contains an assumption where this should be.** The evidence here is
   thin and §4.2 rules the shelf rather than pretending otherwise.
4. **The true cost of the editing surface.** 12 days is an estimate in the uncalibrated unit RB-18
   §1.7 destroyed, for the subsystem RB-20a itself calls *"hard, and underestimated."* Inkarnate's bug
   board after ten years and 23 salaries suggests 12 is optimistic — **but that is an inference from a
   competitor's bugs, not a measurement.**
5. **Illustration throughput for map stamps** — stamps per artist-day. **No reliable figure found.**
   Every calendar claim about the art depends on it; the commission is therefore priced per asset.
6. **Whether K1's four themes can share one silhouette set.** The correlation measurement that would
   have tested the tint claim **failed and its author reported the failure** (25–65 % precision,
   dominated by false positives). §3.3 rules by structure instead; K-G6 settles it with one mockup.
7. **Whether feathered regions look good enough.** Unknowable without a visual spike. It is the one
   genuinely aesthetic risk in §2 and it carries the highest risk mark for that reason.
8. **The cost of the three-way merge on re-import** (committed line 13). Four days by analogy to
   `spike-A-passage-identity` **in a different domain.** The highest-variance number in this file.
9. **Whether a WFC generator can truly replace the paint substrate at slice 3.** RB-20c §5.2's argument
   is architectural, not demonstrated, and it rests on a generator that does not exist. **Nothing in
   any brief measures it.**
10. **Inkarnate's revenue, subscriber count, asset count (its own page says 30K+, 23,400 and 8K
    simultaneously) and rendering technology.** No reliable figure found. Use *"tens of thousands
    across all styles."*
11. **Whether Foundry's Limited-ownership map notes are actually *used* by GMs.** The capability ships;
    usage is unmeasured. This cuts both ways and is the strongest available rescue of the novelty
    claim — *a capability nobody uses is not a competitor, it is a precedent.*
12. **The licence for Dungeondraft's default assets, and 2-Minute Tabletop's redistribution terms.**
    Not located for a third brief running. **Do not build any dependency on either.**

---

## 11. Quellen

**Internal, and every computation is checkable against these files:**
`design/research/RB-20a-kartenwerkzeuge.md` §1.1–§1.10, §2.2, §3.1, §4.2, §6.1–§6.4, §7.1–§7.4 ·
`RB-20b-machbarkeit.md` §0–§10 · `RB-20c-kunstpipeline.md` §1.1–§1.6, §2a–§2d, §3.1–§3.2, §5.1–§5.4,
§7.1 · `RB-20d-erzeugung.md` §1, §2.1–§2.6, §3.3, §4.1–§4.5, §5, §6 ·
`RB-20e-widerspruch.md` §1.2–§1.6, §2.1–§2.6, §3.1–§3.3, §4.1–§4.3, §5.1–§5.7, §6 ·
`RB-18-widerspruch.md` §1.2–§1.7, §4.2–§4.4 · `RB-17-substrat.md` §3.2, §4.3–§4.4, §5 Ranks 1–9 ·
`RB-16-friedhof.md` §1.2–§1.3, §4, §5 · `RB-15-werkzeuglandschaft.md` §3.2/7a, §3.3/7c, §5 ·
`RB-11-steam-vs-browser-verdict.md` · `RB-05-competitor-maps.md` · `RB-04-asset-licensing.md` ·
`RB-02-rendering-tech.md` · `design/iterations/CHAMPION.md` §1, §2, §4, §9.1–§9.6, §12.1–§12.4, §15.9 ·
`design/iterations/README.md` (the rung ladder R5–R11) · `design/00-intake.md` K1, K2, K5, K8, K9, K10 ·
`design/fixtures/eron/media/manifest.json` (`lizenz: NICHT ANGEGEBEN`, WebP-under-`.jpg`) ·
`design/fixtures/eron/media/kachelpyramide/pyramide.json` (**verified this session: 6 levels, 256 px
tiles, WebP q82, z0 = 17,690 bytes**) · `design/fixtures/eron/articles.json` (74 articles, 690 red
links) · `design/spikes/` (four spikes; **none of them `S-P1`**).

**External:** every URL underlying every external figure in this file is carried, with its original
attribution and retrieval date (2026-07-27) and its `[vendor]` / `[estimator]` / `[gemessen]` label,
in RB-20a §9, RB-20b §11, RB-20c §8, RB-20d §10 and RB-20e §8. **No external source is re-derived here
and none is quoted without one of those five files behind it.**

---

*RB-20. Der teuerste Teil eines integrierten Inkarnate sind viertausendsechshundert Zeichnungen, und
die zeichnen wir nie. Der Teil, der uns gehört, ist ein Fremdschlüssel und ein Prädikat. Kaya besitzt
sein Bild schon — achttausendeinhundertzweiundneunzig Pixel breit, und es weiß nichts über sich selbst.
Es muss nicht neu gemalt werden. Es muss gefragt werden können, und es muss antworten dürfen, je
nachdem wer fragt.*

> *Sie malten Berge, tausendfach, und keiner weiß, wie er heißt.*
> *Wir malen keinen einzigen — wir fragen ihn,*
> *und geben jedem eine andere Antwort,*
> *je nachdem, wer am Tisch die Frage stellt.*
