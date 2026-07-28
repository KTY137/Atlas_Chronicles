# RB-20c — Die Kunstpipeline

**Aphrodite, on the art bill behind an integrated map editor.** Compiled 2026-07-27.
Target: Kaya's own sentence — *"ja, integriertes Inkarnate oder etwas Besseres wäre natürlich sexy und
würde perfekt reinpassen. (ist aber auch gottlos schwierig vernünftig zu implementieren)"*

**Extends [`RB-04`](RB-04-asset-licensing.md).** RB-04 answered *which licences may we ship*. This brief
answers *what must be drawn, by whom, for how much, and in which order* — and does not repeat RB-04's
licence-class table, redistribution-trap analysis, German §32/§32a commissioning law, or the five-tier
strategy. Where a source appears in both, RB-04 is authoritative.

**Reads as binding and does not re-open:** [`RB-11`](RB-11-steam-vs-browser-verdict.md) (PixiJS pinned,
DOM-authoritative, `MapRenderer` boundary, browser + Electron; the Forge as the separately-shippable
Steam-shaped half; our own registry, Workshop only as an adapter behind boundary B2; UVTT + rival export
at launch; discovery through creators). [`RB-15 §7c`](RB-15-werkzeuglandschaft.md) (*a hand-drawing map
editor — REFUSE; K5 is scoped to a generator*). [`RB-17 §4.3 A-5/A-6`](RB-17-substrat.md) (a registry is
a job, not an artifact; a registry outside the app is a directory). [`RB-18`](RB-18-widerspruch.md) (the
arithmetic; ≈260–270 priced developer-days buying none of K1/K2/K5; the developer-day has no calibrated
unit).

---

## 0. Method, and what every number below is worth

Four rules.

1. **Everything in §1 is measured on the stakeholder's own file**, `design/fixtures/eron/media/Andaria_03.02.2024.webp`
   (8192 × 8192, 10,901,550 bytes). The scripts are trivial (PIL + numpy + scipy) and every count can be
   re-run. Figures this brief computed are marked **[gemessen]**.
2. **Vendor self-reporting is labelled.** Inkarnate's asset counts are Inkarnate's claims about Inkarnate.
3. **One measurement failed and is reported as failed** (§7.1). It was the measurement that would have
   most flattered the thesis. It is in §7, not in §3.
4. **Where a figure could not be established, the text says "no reliable figure found."** That phrase
   appears six times and each one is a real gap, re-listed in §7.

**FX assumption, stated so it can be replaced:** illustration rates are published in USD. Euro bands below
assume **1 EUR ≈ 1.10 USD**. No rate was verified this session. Replace with the day's rate; the bands are
wide enough that it does not change any conclusion.

---

## 1. What Kaya's own map is actually made of — measured, not estimated

### 1.1 The headline, first, because it inverts the premise

> **[gemessen] The entire visual vocabulary of an 8192² world map that Kaya has been building for years
> is roughly ninety distinct drawn assets. Not thousands. Ninety.**

Everything below is the audit behind that sentence. Apollon's thesis says the expensive part of Inkarnate
is *"thousands of hand-drawn stamps."* Inkarnate does have thousands — **30K+ HD art assets** on the
Creator/Studio tiers, **1K+** on the free Hobby tier (inkarnate.com/faq, retrieved through a text proxy —
**vendor self-report**). But that catalogue spans every style and every map class Inkarnate sells: world,
region, battle, city, interior, across roughly a dozen art styles. **Kaya's map uses one style, one map
class, and a vocabulary two orders of magnitude smaller than the catalogue it was drawn from.**

### 1.2 The inventory, by layer

Compiled by opening six 1024 × 1024 full-resolution windows (`nord_eis_wald`, `berge_ost`, `wald_west`,
`steppe_mitte`, `vulkan_sued`, `kueste_ost`, plus `nadelwald_nord` and two more) and counting distinct
silhouettes. Counts are of **distinct drawn designs**, not instances.

| Layer | What is on the map | Distinct designs | How it is produced |
|---|---|---:|---|
| **Base surfaces** | temperate grass, dry savanna, badlands dirt, sand, snow/tundra, ice sheet, volcanic scree, shallow sea, deep ocean, marsh, paper grain | **~11** | painted region fills / tiling textures |
| **Trees — conifer** | green conifer, snow conifer (2–3 silhouettes each) | **~5** | stamps |
| **Trees — deciduous** | large canopy (4–6), small/sapling (3), autumn yellow/orange (2–3), blood-red (3), one hero world-tree | **~15** | stamps |
| **Trees — dead** | bare/twisted, 3–4 designs | **~4** | stamps |
| **Mountains** | grey snow-capped peak (4–5), grey bare peak (~3), volcanic brown peak (~3) | **~11** | stamps |
| **Hills / dunes / rock** | rounded hill mounds (3–4), sand dunes (2–3), cliff/plateau (2) | **~8** | stamps |
| **Settlement markers (flat glyphs)** | gabled house, keep/tower, gate/wall, anchor | **4** | flat two-tone icon glyphs |
| **Hero structures (painted)** | mountain castle, walled citadel, red-roofed manor, bone/tusk city, gate-bridge, temple-on-lava | **~6–8** | stamps, individually drawn |
| **Props** | bridge, grass tufts, small rocks, shipwreck, ships, ruins | **~10** | stamps |
| | | **≈ 76–82** | |

Round it up for variety that the map itself does not yet show and the honest figure is **≈ 90 distinct
assets**. That is the whole vocabulary. There is nothing else on the file.

### 1.3 The settlement markers — the one layer measured mechanically

The dark flat glyphs are separable from painted art by colour, so they can be counted rather than eyeballed.
Threshold `max(RGB) < 70 ∧ (max−min) < 28`, connected components, filtered to 18–260 px extent and ≥12 %
fill:

```
[gemessen]  48,801 raw dark components
              413 marker-shaped components after the size/fill filter
```

k-means (k=10) over 28×28 binarised silhouettes, then visual audit of the ten cluster montages:

| Cluster | What it is | n |
|---|---|---:|
| 1 | **anchor** (the port half of a port marker, split by the mask) | 50 |
| 2 | **keep / tower** | 62 |
| 4 | **house + anchor** (port town, drawn as one glyph) | 63 |
| 8 | **gate / city wall** | 24 |
| 3, 5, 9 | mixed: houses plus road-shadow and dead-tree false positives | 125 |
| 0, 6, 7 | false positives only (conifer silhouettes, cliff shadow, road shading) | 89 |

> **[gemessen] The settlement-marker vocabulary of the entire map is four glyph designs — a gabled house,
> a round-topped keep, a wide gate, and an anchor — composing about five markers at roughly four discrete
> sizes. 199 instances sit in the four visually-clean clusters alone.**

This matters more than it looks. **Four glyphs is a solved problem for €0.** game-icons.net publishes
**4,180 CC BY 3.0 SVG icons**, including **189 Building & Place** and **74 Map & Country**
(game-icons.net, /tags/building.html, /tags/map.html). SVG means recolourable, which means the K1 theme
system gets them for free. RB-04 already admits game-icons.net at tier 2 with attribution wired through
the manifest and the exporter. **The settlement layer of a map like Andaria costs nothing and is already
in the plan.**

### 1.4 What is on the map that nobody has to draw at all

Four effects that read as artwork and are computation:

- **Coastal contour lines** — the concentric white offsets around every coast and island. This is an
  iterated offset of the landmass mask, not a drawn asset. Visible clearly in `vulkan_sued` and
  `nord_eis_wald`.
- **The shore halo** — the bright-green grass band that follows every waterline in `wald_west`. Same
  mechanism, one offset, one fill.
- **Roads** — a dashed stroke along a polyline. There is no road *art*.
- **Rivers** — a tapered stroke along a polyline, width falling toward the source.

All four are strokes and mask offsets over vector geometry. In PixiJS they are `Graphics` and a mask, not
textures. **They are also exactly the geometry the wiki needs anyway** (a road is a route between two
places; a coastline bounds a region) — which is the strongest single confirmation of Apollon's third
claim, and it is visible in the pixels rather than argued.

### 1.5 What is not on the map at all

Inspected across the 1100 × 704 preview and nine full-resolution windows:

> **[gemessen] The map carries no text labels, no compass rose, no cartouche, no border frame, no scale
> bar and no drawn region boundaries. Zero.**

Every place-name on Andaria lives in the wiki, not on the raster. Kaya's own artefact has already made the
decision the thesis wants to make: **the map is the picture, the names are the data.** The "label styles"
line in the asset brief is, for this world, an empty category — and a live label layer over a static raster
is DOM text over a canvas, which is our accessibility axis (K3), not an art cost.

### 1.6 Reuse — established for the eye, not for the machine

Direct inspection of `wald_west` and `nadelwald_nord` shows one deciduous canopy family and one conifer
family repeated hundreds of times each at varying scale and mirroring. The attempt to *count* those
instances by normalised cross-correlation failed and is reported in **§7.1**. What survives is the visual
finding, which is not in doubt at full resolution: **a handful of silhouettes, repeated to the horizon.**

---

## 2. The four sources, priced

### 2a. Commissioning an illustrator

**Published rates.** Icon-set work is priced per asset with a volume curve:
**$100–300 per icon for 1–10, $75–200 each for 11–25, $50–150 each for sets of 25 or more**
(whatshouldicharge.io/illustrator; the same curve is echoed across the 2026 rate-guide cohort).
Spot illustration, which is the right comparable for a hero structure rather than a tree, is
**$50–500 per piece** (freelancerates.net/illustrator). Freelance hourly for 2D game art runs
**$25–60/h mid, $60–120+/h senior** (igaming/whimsygames 2026 guide; Upwork's 2D game art category).

**German figures, because the contract is German.** The Illustratoren Organisation publishes the
*Honorarwerk Illustration*, an empirical survey of fees for German clients. Two figures surfaced in
secondary coverage: **a half-page editorial illustration averages €384**, and **an animation illustrator's
day rate averages €295** (io-home.org / illustratoren-organisation.de, via search-indexed coverage — the
Honorarwerk itself is a €29 print publication and was not read this session; treat both figures as
indicative). A German full-time game artist averages **€73,729/yr** (erieri.com), which is a floor, not a
freelance rate.

**Applied to the inventory.** Take only what genuinely has to be drawn — trees, mountains, hills, hero
structures, props — because markers, base surfaces and the four line effects are covered elsewhere (§2b,
§2c, §1.3):

| Bundle | Assets | At $50–150/asset (set rate) | In euros |
|---|---:|---|---|
| **Full vocabulary of Andaria** (§1.2, all 90) | 90 | $4,500 – 13,500 | **€4,100 – 12,300** |
| **Only what must be commissioned** (trees 24, mountains/hills/rock 19, hero structures 7, props 10) | 60 | $3,000 – 9,000 | **€2,700 – 8,200** |
| **The screenshot set** (§5.2) | 12 | $1,200 – 2,400 *(at the 11–25 tier)* | **€1,100 – 2,200** |

**Turnaround: no reliable figure found.** No published stamps-per-day rate for map-asset illustration was
located. The market's only throughput signals are indirect and weak: Forgotten Adventures ships **3–5
releases a month** (forgotten-adventures.net/info), 2-Minute Tabletop's Everything Pack contains
**414 hand-drawn maps and assets** accumulated over years at a regular price of **$414** (discounted to
$70). Neither converts to a rate. **Price the commission per asset, not per day, and let the artist quote
the calendar.** A 60-asset commission should be assumed to run **6–12 weeks of the artist's calendar**, of
which almost none is Kaya's own time — that is the point of buying it.

**Contract terms are already specified and are not repeated here:** RB-04's tier-0 clause list is
binding — exclusive, worldwide, unlimited, **transferable and sublicensable**, with `Bearbeitungsrecht`,
the explicit right to grant end users a licence, §31a written form, market-rate fee with milestone bonuses
against §§32/32a, and a warranty against undisclosed AI content. One addition this brief makes to that
list: **deliverables must include the layered source, the palette definition, and the asset drawn on a
transparent background with its shadow as a separate layer** — without the separated shadow, §3's tint
discipline is impossible after the fact.

### 2b. Licensed and public-domain asset packs

RB-04 already ruled on the classes. What this brief adds is the **map-specific** supply, which RB-04 did
not survey:

| Source | What it gives a *world map* | Licence | Verdict |
|---|---|---|---|
| **K. M. Alexander — #NoBadMaps brushes** (kmalexander.com/free-stuff/fantasy-map-brushes/) | ~33 brush sets derived from 16th–19th-century cartography: settlements, mountains, forests, ships, cartouches, compasses, borders. Several sets are enormous — **Moronobu Gansai 1140+, Ogilby 800+, Donia 100+** | **CC0**, author states *"free for personal or commercial use"* | **YES.** The single largest free map-asset corpus found. **But it is engraved/historical, not painted** — it cannot serve Andaria's style. It can serve an entire *second* shipped style at €0. |
| **game-icons.net** | 4,180 SVG icons, 189 Building & Place, 74 Map & Country, 26 Tower | CC BY 3.0 | **YES** — covers §1.3's entire marker layer, recolourable for K1 |
| **ambientCG / Poly Haven** | tiling ground, rock, sand, snow, water surfaces | CC0 | **YES** — covers §1.2's eleven base surfaces |
| **Kenney** — Map Pack, Cartography Pack, Medieval RTS | top-down map tiles and cartographic marks | CC0 | **YES**, but stylistically stylised/flat; a fit for a PixelArt or Clean theme, not for Relic |
| **2-Minute Tabletop — Everything Pack** | 414 hand-drawn maps and assets, $70 (reg. $414) | not stated on the product page; licensing lives behind a separate FAQ | **user-upload path only** until the redistribution clause is read |
| **Forgotten Adventures** | the best map-asset library in the hobby | Fan-Content Licence for free use; **any compensation requires an approved Commercial Licence by application** | **NO for bundling** (RB-04, unchanged) — **user-upload path** |
| **CartographyAssets** — the Dungeondraft/Wonderdraft community library | the largest third-party map-asset economy that exists | thirteen bespoke **CAL-\*** licences (cartographyassets.com/license) | **see §4 — mostly NO, and the reason is structural** |

**The finding that matters in this row is CartographyAssets**, and it is a licence finding, not a supply
finding. Of its thirteen licences, exactly **two — `CAL-NR` (no restrictions) and `CAL-NA` (no attribution;
commercial use, modification and reselling all permitted) — allow us to redistribute the asset file.**
Every other tier forbids it:

- `CAL-BY-NCR` / `CAL-NA-NCR`: commercial use *in your user content*, modifications allowed, **reselling
  anything forbidden**
- `CAL-BY-NRB` / `CAL-NA-NRB`: **no resale of base items**
- `CAL-BY-NC`, `CAL-BY-NC-NS`, `CAL-BY-AS` and the `NA` mirrors: non-commercial and/or no modification

RB-04's redistribution trap therefore applies to **the entire community asset economy of this market**.
A browser VTT is a file server for art; "commercial use in your user content" is a licence to *make maps*,
not a licence to *serve the stamp*. And Dungeondraft's own default assets are reported **CC BY-NC 4.0 —
no commercial use even by paying customers** (RB-05, flagged uncertain there, and it should stay flagged).

**Consequence, stated once:** the map-asset market is a market of *files that may be used and may not be
passed on*. We may point at it. We may install from it on the user's own machine. We may never bundle it.

### 2c. Procedural, CSS/SVG-drawn, and generated

This is where the honest wins are, and there are three of them.

**1 · The four line effects (§1.4) are free and already better done procedurally than as art.** Offset
contours, shore halos, dashed roads and tapered rivers are strokes and mask offsets. They also *re-skin
instantly with the theme*, which a drawn coastline cannot. RB-04 §7.3 made the same argument for VFX
("prefer procedural / shader VFX over sprite-sheet VFX") and it is the same argument here: our code is
not someone's art, and it carries no licence.

**2 · Azgaar's Fantasy Map Generator is MIT, and it generates the world layer.** Verified against the
repository directly, not from a search snippet:

```
[gemessen, GitHub API 2026-07-27]
  Azgaar/Fantasy-Map-Generator   5,844 stars   958 forks
  last push 2026-07-26 (yesterday)   HTML/JS   ~52 MB
  LICENSE: MIT, plus an explicit clause —
    "You can produce, without restrictions, any derivative works from the original software
     and even reap commercial benefits from the sale of the secondary product.
     The derivates include created maps, map images, screenshots, videos, and other materials."
```

It renders to **SVG and WebGL**, and it generates coastlines, rivers, routes, biomes, **cultures, states,
religions, burgs and trade routes** — i.e. exactly the queryable world layer the wiki needs. *(A widely
repeated "20,000 GitHub stars" figure appears in secondary coverage; the API says **5,844**. The secondary
figure is wrong and is recorded here so nobody re-imports it.)* Whether to vendor it, fork it, or merely
read its data model is an engineering call for the Forge beat — but **the claim "there is no free
procedural world-map substrate" is false, and it is MIT, and it is maintained as of yesterday.**

**3 · Where generated output reads as cheap.** Procedural is convincing for *fields* — coastlines, contour
lines, biome masks, hatching, paper grain, region fills, river networks — and it reads as cheap the moment
it tries to be a *figure*. A generated tree looks generated. A generated mountain looks generated. The line
is silhouette: anything the eye reads as an object wants a hand; anything the eye reads as a surface or a
boundary does not. That is why §1.2's split holds — 11 base surfaces and 4 line effects go procedural,
~60 silhouettes go to an illustrator.

### 2d. AI-generated

Three separate costs, and they do not cancel.

**Licensing (invariant 7, and RB-04 risk 7).** AI output's protectability in DE/EU is contested, so the
exclusivity clause RB-04 requires for tier-0 art may be **unobtainable** for AI-generated assets — we
would ship art we cannot warrant, in a product whose whole licence-bookkeeping architecture exists to
warrant art. Training-data provenance is unknowable. And several licences we already touch (Synty, Sonniss)
now prohibit their assets being used to train or feed generative models, which constrains any
"generate variants from our library" feature to first-party and CC0 inputs regardless.

**Reputation, priced honestly.** Dungeon Alchemist — **€2.46 M from 57,209 backers**, the best-evidenced
money in this market — advertises the negative: *"Dungeon Alchemist does not use any generative AI/LLMs
for its room generation. All procedural algorithms are developed in-house and only use content generated
by our own, paid artists"* (Steam store page, via RB-05/RB-11). The market has a matching signal from the
other side: **itch.io ships a `no-ai` tag** that asset buyers browse by. In March 2026 Hasbro's CEO
publicly insisted AI is not used for D&D *because of backlash*; a €1.5 M Kickstarter that defended its AI
art became a news story for defending it. **In this hobby, "no generative AI" is a marketing asset and
"some generative AI" is a news cycle.**

**Verdict.** Adopt Dungeon Alchemist's posture verbatim, because it is simultaneously the licensing-safe
position, the marketing position, and the position our procedural/WFC architecture already implies:
**procedural generation, yes, everywhere; generative AI in shipped art, no.** RB-05 already recommended
exactly this and this brief seconds it with the reputational evidence attached. AI stays where the pack
invariant already puts it: **optional, and always draft** — a GM's private mood image on their own upload
path, flagged in the manifest as `tier U`, never in the bundled set, never in an export we warrant.

---

## 3. Style coherence — the discipline that makes ninety assets look commissioned

A hundred assets from one hand beat a thousand from ten. Five rules, and one of them is the money.

**R1 · One palette, declared as tokens, and no asset may introduce a colour outside it.** Apollon measured
24,162 distinct colours in a 260 × 166 downsample of Andaria — the twelve most common being twelve shades
of one sea blue. That is what a *painted* asset set looks like from the outside, and it is exactly why
raster tracing is refuted. But it is not a counter-argument to a palette: those 24,162 colours are the
*rendering* of a small palette through brush texture and shading. The constraint is on the artist's
palette, not on the output histogram.

**R2 · One light angle, written into the brief, never negotiated.** Every stamp on Andaria casts to the
same side. This is the single cheapest coherence rule and the single most visible failure when it breaks —
a set with two light angles reads as stolen from two places, which is exactly the impression a
mixed-source library gives.

**R3 · One silhouette weight and one outline treatment.** Andaria's stamps all carry the same dark
contour weight and the same interior hatching density. This is what makes a house glyph and a mountain
belong to each other despite being different classes of drawing.

**R4 · Shadow on a separate layer, always.** Named in §2a as a deliverable because it cannot be
retrofitted. Without it, tinting turns the shadow the same colour as the object.

**R5 · Draw for tint: greyscale-with-alpha silhouettes, coloured through the theme's tokens.** This is the
K1 connection, and it is where the arithmetic lives.

### 3.1 What R5 saves, quantified — and what it does not

Andaria contains, visibly, **the same tree family in four dresses**: green summer, autumn yellow/orange,
blood-red, and dead/bare. It contains the conifer family in **two**: green and snow-laden. It contains the
mountain family in **three** rock treatments: grey, snow-capped, volcanic brown.

If those variants are drawn separately, the terrain vocabulary of §1.2 costs what it costs. If they are
drawn once and tinted, the arithmetic changes:

| | Drawn separately | Drawn once, tinted through tokens |
|---|---:|---:|
| Tree silhouettes | 24 | 8 base + 0 |
| Conifer silhouettes | 5 | 3 base + 0 |
| Mountain / hill / rock | 19 | 9 base + 3 overlay sprites (snow cap, ash, moss) |
| **Terrain subtotal** | **48** | **23** |
| At $50–150/asset | **$2,400 – 7,200** | **$1,150 – 3,450** |

> **The tint discipline halves the terrain commission — roughly €1,100–3,400 saved on a €2,700–8,200
> bill — and, more importantly, it means Relic, Signal, Archive and Clean are four `--map-*` token sets
> rather than four commissions.** The saving is not one-off. It is per theme, forever.

**And now the honest part, because I tried to prove it on the file and could not.** §7.1 records the
failure: normalised cross-correlation of a green conifer against the snow-conifer forest, and of a green
canopy against the blood-red forest, produced no reliable matches. **The evidence does not support the
claim that Inkarnate tints; it is consistent with Inkarnate drawing each variant separately.** So R5 is
**a discipline we would impose, not a practice we observed** — its saving is a projection with a stated
mechanism, not a measurement. It is still the right discipline, for a reason that has nothing to do with
Inkarnate: **Inkarnate does not have a theme system and we do (K1).** They can afford 30,000 assets. We
have ninety, and ninety assets that tint are four times as many as ninety that do not.

**What tint cannot do, stated so nobody plans around it:** snow on a conifer is added geometry, not a hue
shift; so is ash, so is moss. Those want a small **overlay sprite** multiplied over the base, which is
three more assets and one more shader path — cheap, but not free, and it must be in the artist's brief
from the first asset.

### 3.2 Coherence across sources — the practical rule

Mixed sources are where coherence dies, and RB-04 already forces us to mix (CC0 base surfaces, CC BY
markers, commissioned silhouettes). The rule that keeps it coherent:

> **Third-party art is admitted only in the layers the eye does not read as figures.** Base surfaces
> (ambientCG, Poly Haven), marker glyphs (game-icons.net, monochrome and tinted through one token), and
> paper grain. **Everything the eye reads as an object comes from one hand.** A surface from a stranger is
> invisible; a tree from a stranger is a seam.

That rule is also a CI gate, because RB-04 already requires a `tier` field on every asset: *no asset with
`tier ∈ {1,2}` may be placed on the `stamps` layer.* Policy becomes a test.

---

## 4. The community path

RB-11 ratified: community assets through **our own registry**, Workshop only as a mirror behind boundary
B2. RB-17 A-5/A-6 constrain it hard: a registry is a job (manual review, compatibility policy, breakage
management, moderation, licence vetting, an AI-content policy, security review), and a registry outside
the app is a directory nobody visits. This brief does not re-open either. It adds the two things a
*map-asset* registry needs that a *rule-package* registry does not.

**4.1 · The licence field must be a redistribution predicate, not a label.** §2b's CartographyAssets
audit is the design input: thirteen licences, eleven of which forbid us serving the file. RB-04 already
specified `redistribution_allowed` as a first-class field and as a product feature. For map assets it
becomes the **routing key**:

| `redistribution_allowed` | What the registry does |
|---|---|
| **true** (CC0, CC BY, OGA-BY, `CAL-NR`, `CAL-NA`, first-party) | we host the bytes, we serve them to every client and every self-hoster, they may enter shared templates, exports and the marketplace |
| **false** (`CAL-BY-NCR`, Forgotten Adventures, Dungeondraft packs, itch "free but no redistribution") | **we host metadata and an installer, never the bytes.** The listing links to the creator; the user's own copy is installed into their own campaign; the asset is excluded from sharing, from templates, from exports intended for third parties |

The second row is not a compromise — **it is the only shape in which the hobby's actual asset economy can
appear inside our product at all**, and it turns RB-04's redistribution trap into the registry's
architecture. It also means the registry can launch pointing at a market that already exists, which is the
only way a solo builder gets a populated registry in year one.

**4.2 · Uploads are pictures, and pictures are an attack surface.** RB-04 §Tier U already specifies the
controls (server-side re-encode, SVG rejected or sanitised, dimension/size/frame caps, separate serving
origin, per-campaign scoping, licence attestation at upload, notice-and-takedown). Map assets add one:
**SVG is the whole point for tintable markers and SVG is the one format that can carry `<script>`.** The
resolution is not to reject SVG but to **normalise it at ingest into a whitelisted subset** (paths, groups,
`fill="currentColor"`, no `<script>`, no `<foreignObject>`, no external references) and store the
normalised form. That is a named workstream, and it is Athena's, not mine.

**4.3 · One live provenance problem, on our own fixture.** `design/fixtures/eron/media/manifest.json`
records for the Andaria map: **`"lizenz": "NICHT ANGEGEBEN — kein Lizenzfeld im Quell-Wiki"`**, uploader
*Cornelius Holloway*, 2024-02-03. The map was also **served as WebP under a `.jpg` filename** by Fandom's
CDN, which the manifest records as `format_geliefert` vs `format_laut_dateiname`. Both are correct
handling. Both are also the shape of every map a user will ever import: **no licence, wrong extension.**
The importer must therefore read format from magic bytes and must force an explicit licence attestation
before the asset can leave the importing campaign.

**4.4 · What Dungeondraft's ecosystem actually did for Dungeondraft.** Three things, and only one of them
is assets.

1. **It supplied the commercial licence the tool itself could not.** Dungeondraft's default assets are
   reported CC BY-NC (RB-05, uncertain); commercial map-makers therefore *had* to buy third-party packs.
   The ecosystem was not a bonus — it was the load-bearing part of the product's commercial story.
2. **It produced a licence taxonomy the vendor did not have to write.** Thirteen CAL tiers, authored by an
   independent operator (Innozoom), covering exactly the axes RB-04 identified: attribution, commercial
   use, modification, resale of base items, sharing of modifications. That is a free specification, and
   §4.1 above is largely a translation of it.
3. **It produced UVTT.** RB-17 §3.2 is the finding: Megasploot, one solo developer, set the interchange
   standard of a market in which every incumbent was larger, and *the largest incumbent got it last,
   through a third party.* The asset ecosystem is what gave the format its installed base.

**No reliable figure found** for CartographyAssets' total asset count, creator count or downloads. A
search-derived figure of *1,183 Dungeondraft assets* appeared and could not be verified against the site
(403 to automated fetch, and the text proxy returned listings without totals). It is recorded as
unverified and must not be quoted.

---

## 5. The number and the sequence

### 5.1 Which part is actually hard — the thesis, attacked

Kaya says it is *"gottlos schwierig."* He is right, and the crew has been pointing at the wrong difficulty.

**Apollon's thesis, claim by claim:**

| Claim | Verdict |
|---|---|
| *"The expensive part of Inkarnate is thousands of hand-drawn stamps — an art cost, not an engineering one"* | **Partly refuted.** Ninety assets, not thousands (§1.1). At €2,700–8,200 the art is the *cheapest, most predictable and most delegable* line in this entire project — the only line in the whole design corpus priced in a **calibrated** unit, because an illustrator's per-asset rate is published and a "developer-day with an AI crew" is not (RB-18 §1.7). |
| *"A stamp scene is a list of `{asset, x, y, scale, rotation, layer}`"* | **True, and it is small.** Andaria's stamp instances number in the low tens of thousands; at ~24 packed bytes per record that is under a megabyte, against **10.9 MB for the flattened WebP** and 9.9 MB for the tile pyramid. The scene that *generates* the picture is an order of magnitude smaller than the picture — and it is queryable, diffable and per-entity. |
| *"The vector world layer must be built anyway because the wiki links to it"* | **True, and it is the strongest claim in the thesis.** §1.4 shows the map's roads, rivers, coastlines and shore halos are *already* vector geometry rendered as strokes. That geometry is `Region`, `Route`, `Ort` — objects `Sicht` must project over anyway. |
| *"Therefore the increment is small"* | **Refuted as stated, and the refutation is the finding.** |

**The part that is hard is the part the thesis does not mention: the base-surface layer.** Andaria's eleven
biome surfaces are not stamps and not vectors — they are **painted regions on an 8192² raster**. Shipping
"paint your own world" means shipping a paint program: brush and eraser with pressure and falloff, layer
compositing, blend modes, a tiled undo history over 67.1 megapixels, GPU-side dirty-region readback, and
autosave of a raster that does not fit in a JSON row. **That is Photoshop-in-the-browser, it is the single
largest unpriced surface in this whole area, and it has nothing to do with art production.**

> **The stamps are not hard. The data layer is already required. The terrain paint substrate is hard —
> and it is the one part we do not have to build, because Kaya already owns his terrain and Apollon
> already built the pyramid that serves it.**

### 5.2 The sequence

**Stage 0 — Der Kartenimport. Art cost €0. Already half-built.**
The 8192² raster comes in, becomes a tile pyramid (measured: 1,365 tiles, 9.9 MB, 31.7 s build, ~8 MB
viewport RAM, 17 KB to first visible pixel), and entities are placed on it: a pin is an `Ort`, a polygon
is a `Region`, a polyline is a `Route`, and every one of them can cite a passage, carry a clause and be
projected through `Sicht`. Marker glyphs come from game-icons.net at €0. **This ships the entire
categorical differentiator — every stamp is an entity, fog is per-character, the map re-skins — without
one commissioned asset and without one line of brush engine.** It also directly serves K10 (the Eron
fixture) and RB-15 §7c's ratified refusal: we did not build a hand-drawing editor; we made the output of
one into a place.

**Stage 1 — Die Stempel. Art cost €1,100–2,200. 12 assets.**
The placement editor over imported terrain. Twelve assets is enough to photograph one biome: 3 conifers,
3 deciduous, 3 mountains, 2 hills, 1 hero structure — drawn to R1–R5, greyscale-with-alpha, shadow
separated. The screenshot that sells this is **not** "look how many trees we have." It is *click the tree —
it is a place, and it cites a passage.* Twelve assets is enough for that photograph and ninety would not
improve it.

**Stage 2 — Die Linien. Art cost €0.**
Coasts, shore halos, roads, rivers as `Graphics` strokes and mask offsets over the vector layer (§1.4),
themed through tokens. This is where a generated map starts looking drawn, and it is code.

**Stage 3 — Der volle Satz. Art cost €2,700–8,200 total (Stage 1 counts against it). ~60 commissioned
assets.** Only once Stages 0–2 have a user who is asking for it. Base surfaces from CC0 (ambientCG,
Poly Haven), a second free style from K. M. Alexander's CC0 historical corpus.

**Stage 4 — Die Schmiede.** WFC generates the terrain mask instead of a human painting it, which is the
ratified plan (RB-11: the Forge is the Steam-shaped half; RB-05 §7: layout pass first, WFC as detail fill).
**A generator is how we get terrain without a paint program.** The paint substrate is not deferred — it is
*designed out*, and the Forge is what replaces it.

**Never (or not before there is revenue):** a full raster paint engine; competing on asset count;
bundling any `CAL-BY-*` / Forgotten Adventures / Dungeondraft pack.

### 5.3 The number

> **The first release's art costs €0 for Stage 0, €1,100–2,200 for the twelve assets that make it
> photograph, and €2,700–8,200 for the full ninety-asset vocabulary that is not needed until someone
> asks. The art is not the risk. It is the only calibrated line item in this project.**

**In weeks, honestly split:**

| | Kaya's calendar | Someone else's calendar | Unit |
|---|---|---|---|
| Art, Stage 1 (12 assets) | ~2 days: brief, palette, light angle, review | 2–4 weeks | **calibrated** — published per-asset rates |
| Art, Stage 3 (60 assets) | ~5 days across the run | 6–12 weeks | **calibrated** |
| Import + pyramid + entity placement (Stage 0) | not costed here | — | **uncalibrated developer-days** (RB-18 §1.7) |
| Stamp placement editor (Stage 1) | not costed here | — | **uncalibrated developer-days** |
| Raster paint substrate | **refused / designed out** | — | would have been the largest unpriced surface in the corpus |

**I am not adding developer-days to RB-18's ledger.** Its central finding is that the unit has never been
calibrated once, and inventing a number for the map editor would be exactly the disease it diagnosed. What
this brief can say with a straight face is: **the art is bounded, priced in a real unit, and small; the
engineering is unbounded until S-T1 runs; and the sequence above is arranged so that the largest
engineering risk (the paint substrate) is never taken at all.**

### 5.4 The answer to Kaya, in one paragraph

*Integriertes Inkarnate* is not one thing, it is three, and they have wildly different prices. The
**stamps** are ninety drawings and about €3,000–8,000 — the cheapest, most predictable part of this
entire project, and the only part you can hand to someone else and get back on a date. The **data** —
regions, roads, places, every stamp an entity that cites a passage — you have to build anyway, because
the wiki links to it and `Sicht` projects over it. The **terrain painting** is the one that is *gottlos
schwierig*: it is a paint program on a 67-megapixel canvas, and it is the only part where Inkarnate has
years of engineering you would have to repeat. **So do not repeat it.** Import Andaria — Apollon's pyramid
already opens it in 17 kilobytes — put the entities on top, and let the Forge generate terrain later
instead of painting it. Inkarnate makes a picture; we make a place; and the part that makes it a place
costs nothing that a picture already paid for.

---

## 6. What this brief adds to RB-04

Recorded explicitly so the two files can be read together without duplication.

1. **A measured inventory** of what a real world map contains (§1) — RB-04 listed categories, this
   lists counts on a file.
2. **The map-asset supply survey** (§2b) — K. M. Alexander CC0, game-icons.net for markers, and the
   CartographyAssets CAL taxonomy, none of which are in RB-04.
3. **`redistribution_allowed` promoted from a field to a routing key** (§4.1): host-the-bytes vs
   host-the-metadata, which is how the hobby's real asset economy enters the product legally.
4. **Two additions to the tier-0 commissioning deliverables** (§2a, §3): separated shadow layer, and
   greyscale-with-alpha authoring for tint.
5. **A CI gate**: no `tier ∈ {1,2}` asset on the `stamps` layer (§3.2).
6. **SVG normalisation at ingest** rather than rejection, because tintable markers require SVG (§4.2).
7. **The AI posture, with the reputational evidence attached** (§2d) — RB-04 priced the licensing risk;
   this prices the market risk and recommends adopting Dungeon Alchemist's public wording.

---

## 7. What could not be established

1. **Stamp-instance counts on Andaria, and cross-biome silhouette identity. The measurement failed and the
   failure is reported here rather than buried.** Multi-scale normalised cross-correlation (five scales,
   greyscale, `scipy.signal.fftconvolve`) with a hand-picked isolated conifer template over the half-
   resolution map returned 8,546 / 4,167 / 1,605 / 457 peaks at thresholds 0.55 / 0.60 / 0.65 / 0.70.
   Overlay audit of two 512² windows showed precision between roughly **25 % and 65 %** — hits landed on
   marker glyphs, bare sea and mountain ridges as often as on trees. **The instance count is therefore not
   publishable and no tree count appears in this brief.** The same method run cross-biome (green conifer →
   snow forest, including inverted polarity; green canopy → blood-red forest) produced 8 and 28 hits
   respectively at 0.60/0.55, dominated by false positives — **so the claim "the same silhouette is
   re-tinted per biome" is NOT established, and §3.1 says so.** The marker measurement in §1.3 used a
   colour mask and clustering, not correlation, and does not share this weakness.
2. **Illustration throughput for map stamps** — stamps per artist-day. No published figure found. Priced
   per asset instead (§2a).
3. **The Illustratoren Organisation's actual fee tables.** The *Honorarwerk Illustration* is a €29 print
   publication; only two figures (€384 half-page editorial, €295 animation day rate) surfaced in secondary
   coverage and neither was read in the primary source.
4. **CartographyAssets' totals** — assets, creators, downloads. Site returns 403 to automated fetch; the
   text proxy returned listings without totals. A search-derived "1,183 Dungeondraft assets" could not be
   verified and must not be quoted.
5. **Inkarnate's real asset count.** "1K+ / 30K+ HD art assets" is Inkarnate's own FAQ, read through a
   text proxy — **vendor self-report**, and a different search result claimed 23,400/23,700. The two do not
   agree and neither was independently verified. Use "tens of thousands across all styles," not a figure.
6. **2-Minute Tabletop's and Dungeondraft's actual licence texts.** 2MT's Everything Pack page does not
   state commercial or redistribution terms; Dungeondraft's default-asset CC BY-NC status is reported by
   third parties, not by an EULA anyone in this corpus has read. Both remain **user-upload path only** and
   both need the primary text before any dependency.
7. **Whether a raster paint substrate is truly avoidable at Stage 4.** The argument in §5.2 is that a
   generator replaces the painter. It is an architectural claim, not a demonstrated one, and it rests on a
   WFC generator that does not exist yet. Nothing in this brief measures it.

---

## 8. Sources

**Internal (all measurable claims re-runnable against these files):**
`design/fixtures/eron/media/Andaria_03.02.2024.webp` (8192², 10,901,550 B) ·
`design/fixtures/eron/media/_vorschau.png` · `design/fixtures/eron/media/Karte_von_Andaria.webp` ·
`design/fixtures/eron/media/manifest.json` (uploader, `lizenz: NICHT ANGEGEBEN`, WebP-under-.jpg) ·
`design/fixtures/eron/media/kachelpyramide/pyramide.json` (6 levels, 1,365 tiles, 9,900,000 B) ·
`design/research/RB-02`, `RB-04`, `RB-05`, `RB-11`, `RB-15`, `RB-17`, `RB-18` ·
`design/iterations/CHAMPION.md` §1, §4, §9, §12 · `design/00-intake.md` (K1, K5, K8/K9, K10, invariant 7).

**External, retrieved 2026-07-27** (403 = blocked to automated fetch; jina = read through the
`r.jina.ai` text proxy and therefore vendor self-reporting):

*Asset counts and product claims*
- https://inkarnate.com/faq (jina) — Hobby "1K+" / Creator & Studio "30K+" HD art assets; Creator $7.99/mo, Studio $14.99/mo; Studio carries commercial use; 10,000 vs 100 custom-asset slots — **vendor self-report**
- https://store.steampowered.com/app/1588530/Dungeon_Alchemist/ — *"does not use any generative AI/LLMs… only use content generated by our own, paid artists"* (via RB-05/RB-11)
- https://2minutetabletop.com/everything-pack/ — 414 hand-drawn maps and assets, $70 (reg. $414); Plus $150
- https://www.forgotten-adventures.net/info/ (jina) — 3–5 releases/month; Fan-Content Licence; any compensation requires an approved Commercial Licence

*Free and public-domain map art*
- https://kmalexander.com/free-stuff/fantasy-map-brushes/ — ~33 CC0 brush sets from historical cartography; Moronobu Gansai 1140+, Ogilby 800+, Donia 100+; *"free for personal or commercial use"*
- https://game-icons.net/ , /tags/building.html , /tags/map.html , /tags/tower.html — 4,180 SVG icons, CC BY 3.0; 189 Building & Place, 74 Map & Country, 26 Tower
- https://kenney.nl/assets/tag:map — Map Pack, Cartography Pack, Medieval RTS, Sci-Fi RTS (CC0 per RB-04; per-pack counts not shown)
- https://github.com/Azgaar/Fantasy-Map-Generator , https://raw.githubusercontent.com/Azgaar/Fantasy-Map-Generator/master/LICENSE , GitHub API — MIT + explicit derivative-works clause; **5,844 stars, 958 forks, last push 2026-07-26** (the widely quoted "20,000 stars" is wrong)

*The community asset economy and its licences*
- https://cartographyassets.com/license/ (jina) — the thirteen CAL licences; only `CAL-NR` and `CAL-NA` permit redistribution/resale
- https://cartographyassets.com/ (jina) — *"the largest asset library for mapmakers and TTRPG players"*, operated by Innozoom; no totals published
- https://cartographyassets.com/assets/ , /asset-category/licenses/ — 403 to automated fetch

*Rates*
- https://whatshouldicharge.io/illustrator — $100–300/icon (1–10), $75–200 (11–25), **$50–150 (25+)**
- https://www.freelancerates.net/illustrator — spot illustration $50–500/piece; hourly $25–150
- https://igaming.whimsygames.co/blog/how-to-hire-igaming-game-artists-2d-3d-and-animator-rates-in-2026/ , https://www.upwork.com/hire/2d-game-art-freelancers/ — 2D game art $25–60/h mid, $60–120+/h senior
- https://illustratoren-organisation.de/shop/honorarwerk-illustration/ , https://www.io-home.org/leistungen/honorarfragen/grundlagen_verguetung/ , https://www.designtagebuch.de/honorarwerk-illustration-erschienen/ — Honorarwerk Illustration (€29, not read); €384 half-page editorial and €295 animation day rate via secondary coverage
- https://www.erieri.com/salary/job/game-artist/germany — €73,729/yr average German game artist (floor, not a freelance rate)

*The AI posture*
- https://www.pcgamer.com/game-that-raised-over-dollar15-million-on-kickstarter-defends-its-use-of-ai-art-its-certainly-going-to-hurt-people-but-i-dont-think-this-is-going-to-go-back-in-the-bag/ — a €1.5 M Kickstarter defending AI art becomes the story
- https://startplaying.games/blog/posts/neopets-rpg-canceled-paizo-pdf-prics-unreleased-mtg-ttrpg-wotc — Hasbro's CEO publicly insisting AI is not used for D&D, March 2026, *because of backlash*
- https://itch.io/game-assets/tag-asset-pack/tag-no-ai/ — itch.io ships a `no-ai` browse tag

---

*RB-20c. Neunzig Zeichnungen, nicht tausend — und die teuerste Zeile ist die, die niemand gezeichnet hat:
der Pinsel auf siebenundsechzig Millionen Pixeln. Kaya besitzt seine Karte schon. Wir müssen sie nicht
malen. Wir müssen sie nur bewohnbar machen.*

> *Sie zählten Stempel wie ein Heer,*
> *und fanden neunzig, mehr nicht, sehr —*
> *das Bild war fertig, längst gemalt.*
> *Wir schulden nur den Ort, der darin wohnt.*
