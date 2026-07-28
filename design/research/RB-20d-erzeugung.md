# RB-20d — Die Erzeugung

**The generation question, answered with a sequence and a number.** Compiled 2026-07-27.
Target: Kaya's own sentence — *"ja, integriertes Inkarnate oder etwas Besseres wäre natürlich sexy
und würde perfekt reinpassen. (ist aber auch gottlos schwierig vernünftig zu implementieren)"*

He is right that it is hard. This brief establishes **which part** is hard, and the answer is not the
part anyone expected: **the algorithm is free, the art is unaffordable, and the genuinely hard part is
a design problem — what a generator is allowed to write into an encyclopedia.**

**Reads as binding and does not re-open:** [`RB-11`](RB-11-steam-vs-browser-verdict.md) (PixiJS pinned,
DOM-authoritative, browser + Electron, UVTT + rival-shaped export at launch, discovery through
creators, the Forge as the Steam-shaped separable half) · [`RB-15`](RB-15-werkzeuglandschaft.md) §3.2
7a (INTEGRATE map assets and interchange) and §3.3 7c (**REFUSE a hand-drawing map editor**) ·
[`RB-04`](RB-04-asset-licensing.md) (the asset ledger, the five tiers, CC0-only defaults) ·
[`RB-02`](RB-02-rendering-tech.md) §"WFC map generation" (tiled model, worker-bound, seeded,
step-capped) · [`RB-05`](RB-05-competitor-maps.md) (**the WFC research lives there and is built on,
not redone**).

**Does not duplicate:** RB-02, RB-04, RB-05, RB-15, RB-17. Where this brief contradicts one of them,
it says so by name — it does once, against RB-05, and the correction is in §2.5.

**RB-20a is not on disk at the time of writing.** The judgement in §4 ("is the killer application
genuinely new?") is therefore made against RB-05 and against fresh external research only, and must be
reconciled with RB-20a when it lands.

---

## 0. Method, and what every number below is worth

Four rules, applied without exception.

1. **Numbers this brief measured itself are marked [gemessen]**, with the command or the file, so they
   can be re-run. Numbers derived from reading source are marked **[aus dem Quelltext]** and are
   explicitly *not* the same thing as running it.
2. **Vendor self-reporting is labelled** and never laundered. Inkarnate's asset count is a marketing
   claim that contradicts itself on its own page; it is used as an order of magnitude, not as a fact.
3. **Where a figure could not be established, the text says "no reliable figure found."** §9 lists
   every one.
4. **Day estimates are denominated in the same uncalibrated unit RB-18 §1.7 destroyed** —
   *"a schedule denominated in an uncalibrated unit is not a bill; it is a hope with columns."*
   Every number in §6 is therefore offered **with its own calibration spike attached**, and the
   headline recommendation is chosen partly *because* it is the cheapest thing in the project that
   can calibrate the unit.

---

## 1. The verdict, up front

> **The expensive part of Inkarnate is not its brush engine and not its algorithm. It is 30,000
> hand-drawn stamps** (Inkarnate's own page, §2.6) **— an art-production cost RB-15 §7c already
> refused and RB-04 already priced as unaffordable.**
>
> **The expensive part of world generation is nothing.** Azgaar's Fantasy Map Generator is
> **18,165 lines of TypeScript across 40 files in `src/generators/`, with unit tests, under MIT plus
> an explicit clause granting commercial derivative works, last pushed 2026-07-26 — yesterday**
> [gemessen, §2.1]. It generates heightmaps, features, lakes, rivers, biomes, cultures, states,
> provinces, burgs, religions, routes, military, markers, markets, goods and coats of arms as
> **named, typed, cross-referenced records** — not as pixels.
>
> **The genuinely hard part is neither.** It is that a generated world arrives with **~1,000
> settlements** and Kaya's own hand-built world, after 1,153 edits, has **74 articles and 690 red
> links** [gemessen, §3.3]. Naive generation converts 690 doors into 1,000 stubs — and *"der rote Link
> ist eine Tür"* (CHAMPION §3.4), the champion's headline flex, **only exists while there are red
> links.** A generator that writes articles destroys the flex it was supposed to feed.
>
> **Therefore: the generator must emit doors, not articles.** That is the whole design finding, it
> costs less than the naive version, and it is the one thing in this space that a bridge structurally
> cannot carry (§4.4).

**The sequence, in order, none of it re-opening a ratified refusal:**

| # | Move | Days | Why here |
|---|---|---:|---|
| **1** | **`S-G1 · Der Keim`** — one FMG *Full JSON*, one mapper, one count. No canvas, no renderer, no Pixi. | **1** | The cheapest calibration artifact in the project (RB-18 route step 2), and it runs *inside slice 1*, which has no canvas (CHAMPION §9.1). |
| **2** | **Die Türsaat** — generated places land as **doors** (id, name, position, seed, type, parent), not as articles. Article on first opening, by the character who opened it. | **~17 (+20 % → 20)** | Reuses `Sicht`/B9 and the door projection already specified. Fusion, not co-location. |
| **3** | **Der Kartengrund** — FMG's SVG/PNG export → the tile pyramid that already works (1,365 tiles, 9.9 MB, 31.7 s [gemessen by Apollon]). | **1** | The pipeline exists on disk. |
| **4** | **UVTT-shaped dungeon fill** — layout pass emitting *our* walls/portals/lights, filled from **user-imported** Dungeondraft/UVTT assets. | **~13** | Slice 2+. Competes with a shipped Patreon module (§2.5). |
| **5** | **WFC as the detail filler**, on an authored tile grammar. | algorithm ~5; **grammar+art unbounded** | RB-04: *"WFC's bottleneck is not the algorithm, it is an authored, constraint-annotated tileset."* Unchanged, and re-confirmed. |
| **—** | **A stamp/brush editor.** | **refused** | RB-15 §7c stands, now with a measured number behind it: 30,000 assets. |

**Most value per day spent, unambiguously: move 1 and move 2.** They are the only ones that are not
parity, they need no renderer, and they are the only ones whose output is an *object with an address,
a permission and a history* — RB-15 §2's own standard for what a bridge cannot carry.

---

## 2. The state of the art, split by what it is actually good at

### 2.1 Voronoi world generation — Azgaar's Fantasy Map Generator, and it is not what the corpus assumes

RB-15 filed the whole map-making category under *"INTEGRATE (assets, UVTT) · ABSORB narrowly (WFC) ·
REFUSE (paint program)"*. That ruling is right and this brief does not disturb it — but the corpus has
never once looked inside FMG, and what is inside changes the arithmetic.

**Measured, this session** [gemessen — `git clone --depth 1`, `find`/`wc -l`, GitHub API]:

| Fact | Value |
|---|---|
| Version | **1.138.2** |
| Last push | **2026-07-26** (the day before this brief) |
| Stars / forks | **5,844 / 958** |
| Build | **Vite 8 + TypeScript 5.9 + vitest + Playwright + Biome** — not a legacy blob |
| **`src/generators/`** | **40 files, 18,165 lines TS, 6 `*.test.ts` files** |
| `src/renderers/` | 36 files, 8,598 lines |
| `src/controllers/` (the editor UI we do **not** need) | 58 files, **30,927 lines** |
| Runtime dependencies | `d3`, `delaunator`, `alea`, `lineclip`, `polylabel`, `three`, `driver.js` — all permissive |

**What the 18,165 lines contain**, by filename: `heightmap-generator`, `features`, `lakes`,
`river-generator`, `biomes`, `cultures-generator`, `states-generator`, `provinces-generator`,
`burgs-generator`, `religions-generator`, `routes-generator`, `military-generator`,
`markers-generator`, `markets-generator`, `goods-generator`, `production-generator`,
`names-generator`, `zones-generator`, `emblems/`, `voronoi`, `measurers-generator`.

**What it emits, per the project's own data-model wiki** (fields abbreviated):

```
burgs[]     name · cell · x,y · culture · state · population · type · capital · port
            citadel · plaza · walls · shanty · temple · coa · production[] · treasury · market
states[]    name · form · color · center · area · cells · burgs · neighbors · provinces · diplomacy[]
provinces[] name · center · burg (capital) · rural/urban population
cultures[]  name · base (namebase) · center · type · area · expansionism
religions[] name · type (Folk|Organized|Heresy|Cult) · form · deity · center · culture · expansion
rivers[]    name · source · mouth · parent · basin · cells[] · discharge (m³/s) · length (km)
routes[]    points[] (x,y,cellId) · group (roads|trails|searoutes) · length · name
markers[] · notes[] (name + legend HTML) · zones[]
```

**That is an infobox schema.** `Vorlage:Stadt` has fields; `burgs[i]` has the same fields, already
filled, already cross-referenced by integer id to a state, a province, a culture and a religion. This
is the single most consequential technical fact in the brief: the generator does not emit a picture
that must then be understood — **it emits the data layer the wiki needs anyway**, which is exactly
Apollon's thesis, and it is already written by somebody else under a licence that permits selling the
result.

**The number of places.** The auto setting for towns is
`rn(populatedCells.length / 5 / (grid.points.length / 10000) ** 0.8)`
[aus dem Quelltext, `src/generators/burgs-generator.ts:166`], and default state count is
`gauss(18, 5, 2, 30)` [aus dem Quelltext, `public/modules/ui/options.js:613`]. On a default grid that
is **~18 states and roughly a thousand settlements**; the Foundry importer's README states it plainly
from practice — *"for any randomly generated map from FMG there are literally a thousand plus burgs."*
**I did not run the generator; this figure is read from source and corroborated by a third party. It is
not [gemessen].**

**The honest integration cost, measured rather than guessed.** The generators are typed and modularly
filed but still coupled to FMG's global mutable world state and to the DOM:

| Coupling in `src/generators/**.ts` | Count [gemessen, `grep -o \| wc -l`] |
|---|---:|
| references to the global `pack` | **698** |
| references to the global `grid` | **97** |
| `TIME` (timing) / `WARN` | 65 / 8 |
| `window.` | 25 |
| `ensureEl(` — reads options straight out of DOM inputs | **11** |
| files importing from `d3` | **19 of 40** |

**Consequence, and it is the whole cost story:** *porting* FMG's generators into Chronicle means
untangling 698 global references and 19 d3 imports — weeks, and a permanent maintenance fork against a
project that pushed yesterday. **Running FMG unmodified and consuming its export means writing a
parser.** Only one of those two is a good idea, and it is not the one that feels like engineering.

### 2.2 WFC — build on RB-05, and one thing RB-05 did not say

RB-05's WFC section stands unchanged: tiled model with edge sockets, backtracking/checkpointing,
shipped in *Caves of Qud*, hybrid layout-then-fill because *"pure WFC struggles to produce readable,
navigable dungeon topology on its own."* RB-02 adds the engineering frame: worker-bound, seeded, hard
step cap, ≤2 s for a 64×64 region, region-reroll tool.

Three additions this brief can make:

1. **The licence is clean.** mxgmn/WaveFunctionCollapse is **MIT, Copyright (c) 2016 Maxim Gumin**
   [verified via the GitHub licence API]. No encumbrance, no attribution beyond the notice.
2. **The academic framing names the weakness precisely, and it is not "quality".** Karth & Smith
   (FDG 2017) reconstruct WFC as constraint solving and show that its *strength* is local
   propagation without backtracking — and that the interesting properties, **explicitly including
   "generating a dungeon level with a constraint that you must be able to find a path from the
   entrance to the exit"**, are **extensions bolted onto WFC**, not native to it. The algorithm is a
   texture synthesiser that happens to make floor plans. Global playability is a separate solver.
   Gumin's own README concedes the boundary: deciding whether a tileset admits a valid output is
   **NP-hard**, *"so it's impossible to create a fast solution that always finishes"* — with the
   consoling practical note that *"in practice the algorithm runs into contradictions surprisingly
   rarely."*
3. **RB-04's bottleneck finding survives contact and gets sharper.** *"WFC's bottleneck is not the
   algorithm, it is an authored, constraint-annotated tileset"* — and the market confirms it from the
   other side: **684 window variants in a single third-party Dungeondraft integration pack**
   (Forgotten Adventures), **6,000+ objects** in Dungeon Alchemist, **30,000+** in Inkarnate. Nobody
   ships socket metadata with any of them.

**Verdict on WFC, unchanged and now evidenced:** the algorithm is a week; the grammar is a product;
the art is a studio. Keep it exactly where CHAMPION §9.5 and RB-15 Stage 8 put it — **last**.

### 2.3 Watabou / Procgen Arcana — delightful, unintegrable, and the honest reason why

- **Output licence is generous:** *"You can use maps created by the generator(s) as you like: copy,
  modify, include in your commercial rpg adventures etc. Attribution is appreciated, but not
  required."* (Procgen Arcana FAQ.) The FAQ adds a non-binding preference against *selling* the maps
  themselves.
- **The code is not.** The FAQ: *"the source code of an early version of the city generator is
  available on GitHub"* — that is `watabou/TownGeneratorOS`, which is **GPL-3.0**, is an old snapshot
  (*"It lacks some of the latest features"*), and has **7 commits**. Village Generator and Perilous
  Shores are explicitly *"not planned to be opened anytime soon."*
- **Therefore:** GPL-3.0 forecloses embedding in a proprietary one-time-licence product, and the good
  versions are closed anyway. **Watabou can only be linked to, never absorbed** — which lands it
  exactly on RB-18 §4.3 item 9: *"the bridge is Ctrl+C."*
- **Four of his generators export JSON/GeoJSON** (MFCG exports buildings, roads, trees; One Page
  Dungeon exports JSON that RPG Map Editor and Dungeon Scrawl consume). So an *importer* is real work
  we could do and a *fork* is not.

### 2.4 Noise-based terrain — solved, cheap, licensed, and not the differentiator

**mapgen4** (Amit Patel / Red Blob Games) is **Apache-2.0**, together with its `dual-mesh` and `prng`
helpers, with the author's own explicit permission: *"You can use this code in your own project,
including commercial projects."* It supports 1 M+ Voronoi cells with a detailed river network and is
built for **real-time regeneration while you paint terrain** — which is the correct interaction model
for a terrain brush, and the correct citation if Chronicle ever wants one.

It is listed here for completeness and for the licence, not as a recommendation: FMG already contains a
heightmap generator plus 100+ heightmap templates, and adding a second terrain engine buys nothing the
first one does not already have.

### 2.5 Dungeon generators — and a correction to RB-05

RB-05's improvement #7 reads: *"Nobody generates **inside** the VTT and lands a walled, lit, playable
scene."* **That sentence is no longer true, and the crew must know it.**

**Augur: Instant Dungeons** (Augur Studios, module `instant-dungeons`, **v1.3.3, Foundry v13–v14,
verified 14, ~6 weeks old at time of writing, paid via Patreon**) generates *inside Foundry*:

- rooms, corridors and **fully walled scenes using native Foundry `Wall` documents**;
- **doors placed automatically at transitions**, with interaction and lighting behaviour;
- terrain underlays, room objects (beds, bookshelves, containers, altars, lighting), scene config
  (grid, token vision, fog behaviour);
- **seed**, room count, density, branching, size, symmetry, wall thickness, entry direction as
  parameters — i.e. seeded and re-rollable;
- and, decisively, **"you can import your own Dungeondraft packs (even massive 100k+ object
  libraries) to fully decorate your maps."**
- Its page states creator-made assets were produced **without AI tools** — the same provenance posture
  RB-15 §6c demands of us and Dungeon Alchemist already markets.

That last bullet is the strategic lesson of this entire brief, delivered by a competitor: **the way to
solve the stamp problem is to not own the stamps.** Augur ships a generator with no art library and
lets the user bring Dungeondraft's. It is exactly RB-15 §7a — *"we win this function by reading other
people's files, not by drawing"* — implemented by someone else, first, in a rival.

The rest of the family is as RB-05 recorded it: **DunGen** (web, per-VTT wall export matrix, Patreon
tiers, Foundry module), **Dungeon Alchemist** (£31.99, still Early Access with a stated **late-2026**
1.0, 6,000+ objects, learned-from-examples PCG, explicitly no generative AI), **donjon** — with one
new and disqualifying fact in §5.

### 2.6 Stamp painting — the number that closes the question

**Inkarnate, from its own front page** [vendor self-report, and internally inconsistent on the same
page — one section says **"30K+"** assets, another **"over 23,400"**]:

| | |
|---|---|
| Art assets | **30K+** (also stated as 23,400) |
| Maps created | **16M+** |
| Hobby (free) | 1K+ assets, 2K export |
| Creator $7.99/mo | 30K+ assets, 8K export, **personal use only** |
| Studio $14.99/mo | 16K export (beta), **commercial use included; maps exported while Studio was active stay commercially licensed after downgrade** |

A June 2026 update alone shipped *"over 4,600 new and reworked assets."*

**This settles the thesis's cost half, in the thesis's favour and against its conclusion at once.**
Apollon is right that a stamp scene is a trivial data structure — `{asset, x, y, scale, rotation,
layer}` — and right that the cost is art production. He is right that this is not an engineering cost.
**The consequence he does not draw is that a non-engineering cost we cannot pay is still a cost we
cannot pay.** 30,000 assets is not a commission; RB-04 sizes our affordable tier-0 at *one* dungeon
tileset, *one* wilderness set, ~40 tokens and a UI kit. The gap is three orders of magnitude.

---

## 3. What a GM would actually use unedited

Honest triage. "Unedited" means: opened, and run at a table, without an editing pass.

| Family | Used unedited? | The honest reason |
|---|---|---|
| **Watabou One Page Dungeon / city / village** | **Yes, routinely.** | The output is *finished by being stylised.* It never promises photorealism, so it never fails to deliver it. It is also complete: rooms, doors, a legend, a name. **The lesson is not the algorithm — it is that a confident art direction converts "procedural" from an excuse into a style.** |
| **Dungeon Alchemist** | **Yes** — it is the product. | Because a human draws the room outlines and the machine only fills. The human supplies the intent; the generator supplies the labour. |
| **Augur / DunGen dungeons** | **Yes for play, no for beauty.** | Walls, doors and lights arrive correct, which is the part that costs an hour by hand. Nobody screenshots them. |
| **Azgaar FMG world map** | **The data: yes. The picture: usually no.** | The political/cultural/economic layer is immediately usable and *is* the reason people use it. The default rendering reads as a reference map, not as a hand-painted world — which is precisely why Kaya's own Eron map is 8192² of painted Inkarnate/Wonderdraft art and not an FMG SVG. |
| **Pure WFC output** | **No.** | Locally valid, globally arbitrary. See §2.2: reachability is an *extension*. No shipped VTT uses raw WFC output as a playable map, and RB-05 found none either. |
| **Noise terrain alone** | **No.** | It is a heightfield. A heightfield is not a place. |

**The pattern, and it is the design rule to carry forward:**

> **Every generator whose output is used unedited either (a) commits to a style so completely that
> "generated" stops being a defect, or (b) takes its structure from a human and generates only the
> labour.** No generator is used unedited because its output is *realistic*.

Dungeon Alchemist is (b); Watabou is (a). RB-05 already recommended the (b) sequencing — *"GM draws
room outlines → WFC fills"* — and this brief adds that (a) is the cheaper of the two for us, because
**style is a theme manifest and K1 already requires one.**

### 3.3 The measurement that reframes the whole question

Run against K10's binding fixture — Kaya's own Eron corpus, `design/fixtures/eron/articles.json`
[gemessen, script over the fixture]:

```
articles                                                     74
distinct outgoing wikilinks                                 762
  … of which point at a page that does not exist            690   (0 of them namespaced — all mainspace)
total link instances                                      1,810
articles using Vorlage:Stadt (the city infobox)               2
most-linked missing page:  "Andarisch"                    ×  18
                           "Nördliche Minenreiche"        ×  16
                           "Andaria"                      ×  15
                           "Blattheim"                    ×  14
                           "Königreich Terabur"           ×  13
```

**Read the third line again.** *Andaria* — the place whose 8192×8192, 67.1-megapixel hand-painted map
sits in the same fixture directory, from which Apollon built a 1,365-tile pyramid — **is a red link.**
The picture of the place exists. The place does not.

That is the entire product thesis, measured, in the stakeholder's own world:

> **Their map is a picture of a world whose data layer was never written. 690 times.**

And it sets the target for generation precisely. Hand authorship, by a group of humans over 1,153
edits, produced **74 articles and 690 red links**. FMG produces **~1,000 settlements and zero red
links**, in seconds. **Both of those worlds are broken, in opposite directions** — one is all doors and
no rooms, the other is all rooms and no doors. World Anvil's documented disease (RB-18 §3.1,
*"dozens and dozens of features, none of which I needed"*) is the second one, running at generator
speed.

---

## 4. The generate → edit → link pipeline, specified

### 4.1 What a generator must emit for this product

Not an image. Six things, and FMG already emits five of them:

| Must emit | FMG | Watabou | WFC | Dungeon gens |
|---|:--:|:--:|:--:|:--:|
| 1. **Stable ids** for every place, region, route and faction | ✔ (integer indices, seeded) | ✖ (seed only) | n/a | ✖ |
| 2. **Names** in a coherent language per culture | ✔ (`names-generator` + namebases) | ✔ | ✖ | ✔ (thin) |
| 3. **Typed fields** — population, form, deity, port, capital, discharge | ✔ (§2.1) | partial | ✖ | ✖ |
| 4. **Containment and adjacency** — burg ∈ province ∈ state; state.neighbors; route.points | ✔ | ✖ | ✔ (tiles only) | ✔ (rooms) |
| 5. **Geometry in map space**, so a name has a coordinate | ✔ (x, y, cells) | ✔ (JSON) | ✔ | ✔ |
| 6. **Walls / portals / light** — the UVTT triple | ✖ | ✖ | ✔ (derivable) | ✔ (native) |

**FMG covers 1–5 and none of 6; the dungeon generators cover 6 and almost none of 1–4.** They are
complementary, they operate at different zoom levels, and neither is the other's competitor. That is
the map of the field, and it is why the recommendation is *both, in that order, years apart.*

### 4.2 The pipeline, and it is real

```
FMG (MIT, bundled, offline, in a worker/iframe)
  │  Full JSON  +  SVG/PNG
  ├─► der Kartengrund : SVG/PNG → tile pyramid  [pipeline exists: 1,365 tiles / 9.9 MB / 31.7 s]
  └─► der Keim (the mapper)
        burgs[]      → Ort        {id, name, x, y, seed, typ, eltern: provinz}
        provinces[]  → Region     {id, name, eltern: staat}
        states[]     → Macht      {id, name, form, diplomacy[] → Beziehung}
        cultures[]   → Kultur     {id, name, namebase}
        religions[]  → Glaube     {id, name, form, deity}
        rivers[] · routes[] → Weg {id, name, punkte[], gruppe}
        markers[] · notes[] → Anmerkung (legend HTML → passage, provenance = erzeugt)
```

Every emitted row carries `Herkunft: erzeugt`, the generator name, its version, and the seed — so the
`Nachrechnen`/provenance discipline the champion already applies to dice applies verbatim to places:
**a generated place is re-derivable, byte for byte, from a seed.** That is not decoration; it is what
lets a generated world be re-generated after an FMG version bump *without* clobbering what a human has
since written on top (§4.5).

### 4.3 The first sixty seconds — and the correction that makes it survivable

**The naive version, which is what the existing tool does:** import → 1,000 journal entries → a scene
with 1,000+ map notes. The `azgaar-foundry` README documents the consequence honestly: performance
mitigation via zoom-level culling, because *"for any randomly generated map from FMG there are
literally a thousand plus burgs… which can become cluttered."*

**That is World Anvil's disease acquired in one click**, and it violates the *Erststundenbudget*
RB-18 §3.4 demands. Do not ship it.

**Die Türsaat — the version that survives.** A generated place is **not an article**. It is a row:

```
Ort { id, name, x, y, seed, typ, eltern, quelle: {generator, version, seed} }
```

and it renders, everywhere in the product, as **a red link with a seed behind it**.

**The first sixty seconds, concretely:**

1. `0–5 s` — Kaya picks *Erzeugen* or drops an `.map` / Full JSON. The generator runs in a worker.
2. `5–20 s` — the raster is sliced into the pyramid; the map opens at z0 (17 KB, measured).
3. `20–30 s` — the map has pins. Every pin is a name. **Every name is red.** Nothing has been written
   into her encyclopedia. Die Saatbilanz reads `0 Absätze im Kanon`.
4. `30–45 s` — she presses one pin: *Blattheim*. The door opens the way §3.4 already specifies — a
   thin ring, a control. Behind it: name, culture, population, state, port, coat of arms, and the
   sentence *"Noch nicht erschlossen."*
5. `45–60 s` — `Ctrl+Enter`. **One paragraph is minted, by a human keypress, with a weekday over it.**
   `1 Absatz im Kanon · 999 Türen.`

**Der rote Link ist eine Tür — and generation is the thing that manufactures doors.** The flex is not
damaged by generation; it is *supplied* by it. The champion's headline gesture has, until now, been
fed only by whatever a GM happened to type. This is the first mechanism in five rounds that produces
doors at scale without producing prose.

### 4.4 Why this is fusion and not co-location — the test, applied

RB-15 §5's test: *would this still work if the two halves were separate products connected by the best
bridge anyone could write?*

**It is already answered, by the generators themselves, in public.** Azgaar's FMG and Watabou's MFCG
*have* the integration everyone wants: click a settlement in FMG, MFCG builds its street plan; click
"Overworld" in MFCG, FMG builds a world around it. And here is the ceiling, in the tool authors' own
words on the itch.io thread:

> *"The two generators exchange information by putting it into a URL — currently it's a seed, a few
> flags (coast, river etc), and a name, whereas warping data of a medium-sized city would consist of
> hundreds of floating point numbers, making URLs unsuitable for that level of data transfer."*

**That is RB-15 §2's bridge ceiling — *a number, a card, a token, an HTML string; never an object with
an address, a permission or a history* — independently rediscovered by two of the best generator
authors in the hobby, and published as a limitation of their own shipped integration.** It is the
strongest external corroboration of the fusion thesis anywhere in this corpus, and it was not
solicited.

What the bridge cannot carry, and what therefore only a fused product can do:

1. **A door that is per-character.** A generated burg visible to Sera and byte-identically absent for
   Brannt. A URL has no `Sicht`.
2. **A place that becomes an article by being opened**, with the opener's name and a weekday on the
   footnote. A URL has no mint.
3. **A region that carries a mechanical clause** — a Klausel bound to `zones[]`. A URL has no rules
   engine.
4. **A re-generation that preserves what humans wrote.** Requires stable ids + provenance on both
   sides of the seam. A URL has no history.
5. **Re-skinning with the theme (K1).** Requires the map to be a scene of entities, not a JPEG.

### 4.5 The one genuinely hard engineering problem in the pipeline, named

Not the generator. Not the parser. **Idempotent re-import.**

A GM generates a world, writes forty paragraphs across nine places over six months, then regenerates —
or bumps the FMG version, or edits the heightmap. FMG's ids are **array indices**, and array indices
are not stable across regeneration. Nothing in the existing tooling solves this: the `azgaar-foundry`
README states flatly that *"updates require reimporting the map to refresh journal contents."*

**The fix and its price:** identity must be `hash(world_seed, generator_version, entity_kind,
generation_path)` and never the index; every human-authored passage binds to that identity; re-import
is a **three-way merge** with an explicit "these 12 places no longer exist — keep as historical, or
retire?" surface. This is `spike-A-passage-identity`'s problem in a second domain, and that spike is
the one measured artifact the lineage owns (27 assertions, 0.372 ms/keystroke at 2,000 passages,
3,000-operation fuzz with zero foreign passage-ids). **Reuse it. It is the reason move 2 is 17 days
rather than 40.**

---

## 5. Licences and provenance — the ledger rows

Every recommendation below is checked against **invariant 7** (provenance tracked, nothing
unlicensed), against a **commercial one-time-licence product**, and against RB-04's CI licence gate
(build fails on a missing manifest row or a banned SPDX id).

| Source | Exact licence | Verified how | Survives invariant 7 + commercial? |
|---|---|---|---|
| **Azgaar Fantasy Map Generator** | MIT **plus** an added clause: *"You can produce, without restrictions, any derivative works from the original software and even reap commercial benefits from the sale of the secondary product. The derivates include created maps, map images, screenshots, videos, and other materials."* Copyright 2017-2024 Max Haniyeu (Azgaar). | Raw `LICENSE` fetched and stored verbatim; text reproduced in §8 | **YES — and it is the strongest licence in this brief.** ⚠ **Ledger caveat:** GitHub's classifier returns `spdx_id: NOASSERTION`, *not* `MIT`, because of the added clause. RB-04's `license_spdx` field must carry `LicenseRef-Azgaar-FMG-1.0` with a `license_text_snapshot`, or the CI gate will either false-positive it as MIT or reject it. |
| FMG runtime deps (`d3`, `delaunator`, `alea`, `lineclip`, `polylabel`, `three`, `driver.js`) | ISC / MIT family | package.json read | **YES** — but each needs its own ledger row; do not inherit them under FMG's. |
| **mxgmn/WaveFunctionCollapse** | **MIT**, Copyright (c) 2016 Maxim Gumin | GitHub licence API | **YES** |
| **mapgen4 + dual-mesh + prng** (Red Blob Games) | **Apache-2.0**, with the author's explicit *"including commercial projects"* | repo + author's page | **YES** — Apache-2.0 adds a NOTICE obligation; ledger it. |
| **Watabou — TownGeneratorOS** (old MFCG) | **GPL-3.0** | repo | **NO.** Copyleft is incompatible with a proprietary one-time-licence product. Do not fork, do not vendor, do not read-and-reimplement-from. |
| **Watabou — everything current** | closed source; **output** licensed *"copy, modify, include in your commercial rpg adventures… attribution appreciated, but not required"*, with a stated (non-binding) preference against reselling the maps | Procgen Arcana FAQ | **Output: YES for a user's own maps. Code: N/A.** Integration = link out or import their JSON. Never bundle. |
| **donjon** — Random Dungeon Generator source | **CC BY-NC 3.0** | donjon code page | **NO for any bundling or derivation.** NonCommercial is fatal here. RB-15's ABSORB ruling for deterministic generators must be read as *"build our own,"* never *"take donjon's."* |
| **Inkarnate** | Commercial use only on **Studio $14.99/mo**; assets never redistributable | inkarnate.com (vendor) | **User-upload path only**, exactly as RB-04 rules for Forgotten Adventures. Never bundled, never in a template, never in a marketplace listing. |
| **Dungeondraft asset packs** (the ecosystem Augur ingests) | typically personal-use-via-VTT; commercial forbidden without written permission | RB-04, unchanged | **User-upload path only**, `redistribution_allowed = false`, excluded from export-for-third-parties. |
| **Kenney tile packs** | **CC0-1.0** | RB-04/RB-05, unchanged | **YES** — and the only category from which a *shipped default* tileset may be re-cut into WFC sockets. |

**Two provenance mechanisms this brief adds to RB-04's ledger, both cheap:**

1. **`derived_from` must cross the generator boundary.** RB-04 already calls `derived_from` *"the
   load-bearing field"* for WFC atlases. A generated *place* needs the same edge:
   `{generator: "azgaar-fmg", version: "1.138.2", seed: …}`. Without it, a generated world exported to
   a third party carries no notice at all, and the export manifest (`LICENSES.json` + `CREDITS.md`)
   silently omits the one component that produced most of the content.
2. **A generated entity is never `dauerhaft` until a human mints it.** This is not a new invariant; it
   is `Nichts wird automatisch Kanon`, applied to places. It is also, conveniently, the same mechanism
   that keeps the first hour small (§4.3).

---

## 6. Cost — and which single one gives the most per day

**Unit warning, restated because RB-18 earned it:** these are days in the *same uncalibrated unit* as
CHAMPION §9.2. Nothing in this project has ever converted one of them into a measured day of renderer,
server or persistence work. Every row below therefore carries **its own falsifier**, and row 1 exists
specifically to calibrate the rest.

| # | Move | Days | Risk | Falsifier — say it before marketing does |
|---|---|---:|---|---|
| **1** | **`S-G1 · Der Keim`.** Generate one world in FMG by hand, export Full JSON, write the mapper, print the counts: entities by kind, id stability across two exports of the same seed, collisions against the Eron corpus. **No canvas. No Pixi. Runs inside slice 1.** | **1** | low | If the mapper is not written and printing counts inside one day, **every other number in this table is wrong**, and that is the finding. |
| **2** | **Die Türsaat.** Parser + mapper (4) · door-entity minting with provenance & seed (3) · pin↔entity binding reusing the door projection (2) · **idempotent re-import / three-way merge** (4) · the sixty-second UI (3) · raster→pyramid wiring (1). | **17** → **~20 with RB-18's 20 %** | **med**, concentrated entirely in the merge | If re-import cannot preserve human paragraphs across a regeneration, **ship import-once only and say so**. Do not ship a lossy merge. |
| **3** | **Der Kartengrund.** FMG SVG/PNG → the existing tile-pyramid script. | **1** | low | Already measured on a 67.1 MPx source. |
| **4** | **Dungeon layout → our walls/portals/lights**, decorated from *user-imported* UVTT/Dungeondraft assets. | **~13** | med | Needs slice 2's canvas. Also: **Augur already ships this in a rival for a Patreon fee.** If we cannot beat it on *linking* rather than on *dungeons*, do not build it. |
| **5** | **WFC detail fill.** Algorithm + worker + seed + step cap + region reroll. | **~5** | low | The algorithm is not the risk. |
| **5b** | **The WFC tile grammar and its art.** | **unbounded — no reliable figure found** | **high** | RB-04's tier-0 commission is *one* dungeon tileset. Inkarnate has 30,000 assets. Do not enter this race. |
| **—** | **A stamp/brush editor.** | **refused** | — | RB-15 §7c, now with a measured number: 30,000 assets, 16M maps, three orders of magnitude beyond tier-0. |

### 6.1 The answer to "which one gives the most per day"

**Move 1, then move 2.** Twenty-one days, total, buys:

- a world that arrives as **~1,000 named, typed, cross-referenced places with coats of arms,
  populations, cultures, religions, trade routes and diplomatic relations**, from **18,165 lines of
  MIT-licensed TypeScript we do not write and do not maintain**;
- delivered as **doors, not articles** — so the first hour stays small and the headline flex is fed
  rather than flooded;
- with **no canvas, no Pixi, no tile pyramid and no renderer as a prerequisite**, which means it is
  the only piece of K5 that can land in **slice 1**, the slice CHAMPION §9.6 admits is *"a wiki with
  dice and an outline"* and which Kaya must otherwise rule on;
- and it is **fusion-bearing** by RB-15 §5's own test, corroborated by the generator authors' own
  published statement about what a URL cannot carry (§4.4) — so it belongs to the 31–48 days RB-18
  §4.2 says should run *first*, not to the 52–69 days of parity.

**Compare honestly with the alternative reading of Kaya's sentence.** "Integriertes Inkarnate" — a
stamp editor — is, by measurement, an art-production programme of ~30,000 assets. It is not hard
because it is technically difficult. It is hard because it is **someone else's decade**, and we would
be buying the least defensible part of their product. Meanwhile the *data* half of what Inkarnate does
— placing named things in map space — is, in Chronicle, **an authoring UI for a layer that must exist
anyway because the wiki links to it.** Apollon's thesis is right about the increment. It is wrong only
where it implies the stamps are optional decoration: they are the reason Inkarnate has 16 million maps,
and we are not going to have them.

---

## 7. The killer application — is it new, and who is closest?

**The claim under test:** *generate a world → it arrives as a linked wiki with named places → the GM
opens a place and it is already a scene on the table.*

**Judged against RB-05 and against fresh research, in three parts:**

| Part | New? | Who is closest | Evidence |
|---|---|---|---|
| **generate a world → linked wiki with named places** | **NO. Shipped.** | **`azgaar-foundry`** (Ethck) — v0.5.8, Foundry 12+/verified 13, ~4 months old, unofficial, free. Imports FMG Full JSON into **interconnected journal entries in compendia**, plus one scene with **1,000+ map notes**, with markers (one-page dungeons, random encounters) linked into the journal. | foundryvtt.com/packages/azgaar-foundry; module README |
| **a place opens as a playable scene** | **NO, but only across a URL.** | **FMG ↔ MFCG**: click a burg, Watabou builds its street plan; click "Overworld", FMG builds a world around it. The bridge carries *"a seed, a few flags, and a name"* — and the authors state it cannot carry more. | itch.io MFCG community threads; FMG `Burg.MFCG` field exists in the type [aus dem Quelltext] |
| **it is a scene at the table, per character, minted by play** | **YES. Nobody.** | — | Nobody links a *generated* place to a per-character knowledge projection. The Foundry route produces GM-visible journals; the FMG↔MFCG route produces a picture; **World Anvil declined the whole pipeline outright.** |

**World Anvil — the K8 benchmark — was asked for exactly this and said no.** Their community-suggestion
page for "Azgaar's Fantasy Map Generator Integration" (import → automatic articles for states, towns,
cultures, races) is **Declined**, with the official response *"we aren't planning on an integration
with it,"* noting that large integrations divert resources, and pointing developers at their public API
instead. [Fetched via the `r.jina.ai` text proxy because worldanvil.com blocks direct fetch —
**vendor-hosted page, read as vendor self-reporting**, but the status field is unambiguous.]

Meanwhile the demand is documented from below: community CLI tools exist that convert FMG `.map` /
Full JSON into **Obsidian vaults**; an FMG discussion thread ("Interested in an Obsidian
integration") runs alongside the Foundry module.

**So the honest competitive sentence — and it is the same shape RB-18 §4.4 found for the seam:**

> **The pipeline is not unbuilt. It is built three times, by volunteers, in three directions, and
> every version of it drops the thing that makes it worth having: the generated place arrives as a
> document, never as a permission.** One is an unofficial Foundry module. One is a URL between two
> free web toys whose authors have published its ceiling. One is a CLI that writes Markdown files.
> The benchmark declined to build the fourth.

**One adjacent competitor deserves naming, because it is the AI-shaped version of this exact pitch.**
**CharGen** (char-gen.com, founder Nikita Vorontsov, single creator) markets *"NPCs, settlements,
factions, regions, and a map, all linked together"* and *"linked entities, NPCs to settlements to
regions to factions… portraits, tokens, maps, voice all in the same workspace"*, from **£8/mo**.
[Vendor self-reporting, read on the vendor's own competitor-comparison page — treat every word as
marketing.] It is the closest *positioning* to the killer app in the market. It is also
**AI-generated content and AI art**, which RB-15 §6c refuses on the record, and which Inkarnate itself
banned from its marketplace in October 2025 after a community revolt. **Our version of the same pitch
is deterministic, seeded, re-derivable and provenance-stamped — which is not merely a different
implementation, it is the differentiator**, and it is the same posture Dungeon Alchemist monetised
(*"does not use any generative AI/LLMs… only content generated by our own, paid artists"*).

---

## 8. The thesis, attacked

Apollon offered it for attack. Here is what survives.

**Survives, and is strengthened by measurement:**

- *"A stamp scene is a list of `{asset, x, y, scale, rotation, layer}`."* True, and the same shape as
  FMG's `burgs[]` / `markers[]`. Confirmed by reading FMG's actual types.
- *"The vector world layer must be built anyway, because the wiki links to it."* **Measured true, 690
  times, in Kaya's own world** (§3.3).
- *"Every stamp is an entity, every entity can cite a passage, every region can carry a mechanical
  clause, fog is per-character."* This is the fusion, it passes RB-15 §5's test, and §4.4 shows two
  independent generator authors publishing the exact reason a bridge cannot reach it.
- *"The differentiator is categorical."* Yes — and §7 identifies precisely which third of the
  killer app is unclaimed, which is the third that requires `Sicht`.

**Does not survive:**

- *"The expensive part of Inkarnate is thousands of hand-drawn stamps, which is an art-production
  cost, not an engineering one — therefore the increment is small."* The first clause is right (30,000
  assets, §2.6). **The "therefore" does not follow.** An art cost we cannot pay is not an increment we
  can take; it is a capability we will not have. The correct conclusion is Augur's, not ours-by-
  default: **do not own the stamps, ingest them** — which is RB-15 §7a, and which a rival shipped
  first.
- *"We would make a place, not a picture"* — as stated, this understates the danger. Naive
  place-making produces **1,000 stubs**, which is World Anvil's exact documented defect at generator
  speed, and it **deletes the champion's headline flex** by turning every red link blue. The thesis
  needs the amendment in §4.3: **emit doors, not articles.**

**And one correction the crew must record:** RB-05's improvement #7 states *"Nobody generates inside
the VTT and lands a walled, lit, playable scene."* As of ~June 2026 that is false — **Augur: Instant
Dungeons** does exactly this in Foundry, natively walled, with doors and lights, seeded, and ingesting
100k-object Dungeondraft libraries (§2.5). The *generation* half of RB-05 #7 is now parity. **Only the
linking half is unclaimed.**

---

## 9. What could not be established

Recorded so no future round launders an absence into a fact.

1. **A measured entity count from a real FMG run.** The ~1,000-burg figure is derived from the source
   formula and corroborated by a third-party README. **The generator was not executed.** `S-G1` exists
   to fix this in one day.
2. **Inkarnate's true asset count.** Their own page says both **"30K+"** and **"over 23,400"**. No
   reliable figure found; use "tens of thousands."
3. **Dungeondraft's default asset count**, and Forgotten Adventures' total. No reliable figure found;
   only the "684 window variants" datum and "thousands… if you have all the packs activated."
4. **Augur: Instant Dungeons' price, install base and licence.** The Foundry package page says "paid
   via Patreon" and does not state a licence; the Patreon post returns HTTP 403 to automated fetch. **No
   reliable figure found** for price or installs.
5. **`azgaar-foundry`'s install/endorsement count.** Not displayed on the package page. No reliable
   figure found — so "the pipeline is shipped" is established, but "the pipeline is popular" is not.
6. **What proportion of GMs use generated world maps unedited.** §3's triage is an inference from tool
   design and from how each tool is described by its own users, **not a measurement**. Flagged as
   inference, exactly as RB-18 §7.6 flags its own.
7. **Whether FMG can generate headless (Node, no browser).** 11 `ensureEl(` call sites and 19 of 40
   generator files importing d3 say "not without a DOM shim or a headless browser." **Not tested.**
   This matters only if generation must run server-side; the browser/worker route sidesteps it.
8. **The cost of the three-way merge on re-import.** 4 days is an estimate by analogy to
   `spike-A-passage-identity`, which is a different domain. It is the highest-variance number in §6.
9. **Whether Watabou would permit a deeper integration.** His FAQ addresses map licensing, not API or
   embedding. Not asked; **no reliable figure found**, and the GPL-3.0 fork route is refused
   regardless.
10. **Dungeon Alchemist's licence for exported maps** — still not stated in their FAQ (RB-05 flagged
    this; it remains open in 2026).

---

## 10. Sources

**Internal (re-read, not re-derived):**
`design/00-intake.md` (K1, K5a–e, K7, K8, K9, K10, invariant 7) ·
`design/iterations/CHAMPION.md` §1, §3.4, §4, §9.1–§9.6, §12.1–§12.4 ·
`design/research/RB-02-rendering-tech.md` (renderer, tile pyramid, WFC engineering, budgets) ·
`RB-04-asset-licensing.md` (the ledger, `derived_from`, tier 0, the tile-grammar bottleneck) ·
`RB-05-competitor-maps.md` (**the WFC research**, UVTT, DunGen, Dungeon Alchemist, Watabou) ·
`RB-11-steam-vs-browser-verdict.md` · `RB-15-werkzeuglandschaft.md` §3.2 7a, §3.3 7c, Stage 8 ·
`RB-17-substrat.md` Rank 9 · `RB-18-widerspruch.md` §1.7, §3.4, §4.2–§4.4, §7.

**Measured this session [gemessen]:**
`design/fixtures/eron/articles.json` — 74 articles, 762 distinct outgoing links, **690 mainspace red
links**, 1,810 link instances, 2 uses of `Vorlage:Stadt` (Node script over the fixture) ·
`git clone --depth 1 https://github.com/Azgaar/Fantasy-Map-Generator` + `find`/`wc -l`/`grep -c` —
`src/generators` 40 files / 18,165 lines, `src/controllers` 30,927 lines, 698 `pack`, 97 `grid`,
65 `TIME`, 25 `window.`, 11 `ensureEl(`, 19/40 files importing d3, 6 `*.test.ts` ·
GitHub API `/repos/Azgaar/Fantasy-Map-Generator` — v1.138.2, pushed 2026-07-26, 5,844 stars,
`spdx_id: NOASSERTION` · GitHub API `/repos/mxgmn/WaveFunctionCollapse/license` — MIT.

**External, retrieved 2026-07-27:**

- https://github.com/Azgaar/Fantasy-Map-Generator — repo, package.json, v1.138.2
- https://raw.githubusercontent.com/Azgaar/Fantasy-Map-Generator/master/LICENSE — **MIT + the derivative-works clause, quoted verbatim in §5**
- https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Data-model — burgs/states/provinces/cultures/religions/rivers/routes/markers/notes/zones and their fields
- https://github.com/Azgaar/Fantasy-Map-Generator/wiki/GIS-data-export — GeoJSON cell export
- https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Q&A — export formats; *"The Generator is licensed under MIT license and derivative works such as maps are free of charge."*
- https://foundryvtt.com/packages/azgaar-foundry · https://github.com/Ethck/azgaar-foundry — v0.5.8, Foundry 12+/verified 13, journals in compendia, 1,000+ map notes, *"literally a thousand plus burgs"*, *"updates require reimporting"*
- https://foundryvtt.com/packages/instant-dungeons — **Augur: Instant Dungeons** v1.3.3, Foundry 13–14, native Wall documents, doors, lights, furnishings, seed, Dungeondraft "100k+ object" import, no AI in creator assets, paid via Patreon
- https://www.patreon.com/posts/instant-dungeons-151178529 — **HTTP 403 to automated fetch**; content reached only via search snippets
- https://watabou.github.io/faq.html — output licence (*"copy, modify, include in your commercial rpg adventures… attribution appreciated, but not required"*), closed source except an early city-generator version
- https://github.com/watabou/TownGeneratorOS — **GPL-3.0**, old snapshot, *"lacks some of the latest features"*
- https://watabou.itch.io/medieval-fantasy-city-generator/devlog/112574/073-bug-fixes-geojson-export · devlog/46967 (FMG integration) · https://itch.io/t/2664390/ — the **URL-as-bridge** limitation, quoted in §4.4
- https://watabou.github.io/dungeon.html · https://watabou.itch.io/one-page-dungeon — JSON export into RPG Map Editor / Dungeon Scrawl
- https://github.com/redblobgames/mapgen4 · https://www.redblobgames.com/maps/mapgen4/ — **Apache-2.0**, *"including commercial projects"*, 1 M+ Voronoi cells
- https://github.com/mxgmn/WaveFunctionCollapse — **MIT (Maxim Gumin, 2016)**; tiled vs overlapping model; NP-hardness; *"in practice… contradictions surprisingly rarely"*
- https://adamsmith.as/papers/wfc_is_constraint_solving_in_the_wild.pdf · https://dl.acm.org/doi/10.1145/3102071.3110566 — Karth & Smith, FDG 2017; global constraints (entrance→exit path) as **extensions**
- https://donjon.bin.sh/code/dungeon/ — Random Dungeon Generator source under **CC BY-NC 3.0**
- https://inkarnate.com/ (via `r.jina.ai` text proxy) — **vendor self-report**: 30K+ / 23,400 assets, 16M+ maps, Hobby/Creator $7.99/Studio $14.99, commercial use on Studio
- https://inkarnate.com/updates — *"over 4,600 new and reworked assets"* (June 2026)
- https://www.worldanvil.com/community/voting/suggestion/667d9432-…/view (via `r.jina.ai`; worldanvil.com blocks direct fetch) — **Azgaar integration: Declined**, *"we aren't planning on an integration with it"*
- https://char-gen.com/alternatives/world-anvil — **vendor's own comparison page, marketing**: *"NPCs, settlements, factions, regions, and a map, all linked together"*, £8/mo, single creator
- https://store.steampowered.com/app/1588530/Dungeon_Alchemist/ — £31.99, Early Access, 1.0 targeted **late 2026**, 6,000+ objects, no generative AI
- https://www.forgotten-adventures.net/product/map-making/assets/dungeondraft-integration/ — 684 window variants; *"thousands"* of assets
- https://note.com/nonkuri_yubiri/n/n1d8f91ca1da6 · https://github.com/Azgaar/Fantasy-Map-Generator/discussions/1050 — community FMG→Obsidian converters

---

*RB-20d. The algorithm was never the price. Eighteen thousand lines of world generation are already
written, already tested, already licensed to be sold, and were touched yesterday by a stranger who will
keep touching them. Thirty thousand hand-drawn stamps are not ours and never will be. Between those two
facts sits the only sentence that matters: their map is a picture of a world whose data layer was never
written — six hundred and ninety times. Generation's job in this product is not to make a picture. It
is to manufacture doors.*

> *Sie malten Andaria in siebenundsechzig Millionen Punkten —*
> *und der Name blieb ein roter Strich.*
> *Der Bildermacher zeichnet zwanzigtausend Stempel.*
> *Wir öffnen sechshundertneunzig Türen. Das ist der Unterschied.*
