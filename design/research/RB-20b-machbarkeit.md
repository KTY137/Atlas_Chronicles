# RB-20b — Machbarkeit: der integrierte Karteneditor

**Hephaistos, der Schmied.** Compiled 2026-07-27. The question is the stakeholder's own:

> *"ja, integriertes Inkarnate oder etwas Besseres wäre natürlich sexy und würde perfekt reinpassen.
> (ist aber auch gottlos schwierig vernünftig zu implementieren)"*

He is right, and he is right about the wrong part. This brief locates **which** part is hard, prices it
in days for one builder with an AI crew on the pinned stack (React/TS + PixiJS), and names the version
that is small enough to build and still worth showing anyone.

**Reads as binding and does not re-open:** [`RB-11`](RB-11-steam-vs-browser-verdict.md) (PixiJS pinned,
DOM-authoritative, canvas behind `MapRenderer`, browser + Electron, the Forge separable, UVTT + rival
export at launch), [`RB-02`](RB-02-rendering-tech.md) (renderer, tile pyramid, KTX2, budgets),
[`RB-04`](RB-04-asset-licensing.md) (asset provenance), [`RB-18`](RB-18-widerspruch.md) (the honest
arithmetic — every number below is stated in the same uncalibrated unit RB-18 §1.7 indicts, and §9 says
so plainly).

**Method.** Every number is attributed. Numbers I measured today are marked **[gemessen]** with the
script that produced them. Vendor claims are marked **[Herstellerangabe]**. Where a figure could not be
established the text says **"no reliable figure found"** — that phrase appears four times, and §9 lists
eight gaps in total, each one real.

---

## 0. Bottom line, before the detail

**The brush engine is not the hard part. It is a first-week exercise. The hard part is 23,400 pictures.**

| The thing everyone assumes is hard | What it actually is | Verdict |
|---|---|---|
| Painting terrain with soft blended edges | a mask render-texture and one shader | **cheap** |
| Rendering 50,000 stamps at 60 fps | `ParticleContainer`, which Pixi already ships | **cheap** |
| Undo on a big scene | an 84-byte patch journal **[gemessen]** | **free** |
| The vector world layer (regions, roads, places) | `rbush` + `polygon-clipping`, both MIT, both mature | **cheap, and measured below** |
| Per-character fog as a vector mask | 9.4 ms per incremental reveal **[gemessen]** | **cheap — and it is the champion's fusion claim, finally with a millisecond on it** |
| Export at 8192² from a browser | 16 tiled passes; iOS Safari is a hard wall | **medium, with one platform that simply cannot** |
| **Looking as good as Inkarnate** | **23,400–30,000+ hand-made assets [Herstellerangabe]** | **this is the whole bill, and it is not an engineering bill** |

**Apollon's thesis survives — and it convicts him.** He is right that a stamp scene is a list, right
that the vector world layer must exist anyway, right that the expensive part of Inkarnate is art. The
engineering increment measures at **37 days base / 44 with RB-18's restored contingency**, on top of the
18 days (`MapRenderer` 8 + tile pyramid 10) the tactical half already owes. That is real and it is
affordable. **But the same finding that makes the engineering cheap makes the art the entire product
risk**, and the art has no number anywhere in this corpus — RB-04 gives the contract clauses and no
quote, `CHAMPION.md` §2 refuses to invent one, and I will not invent one either.

Therefore the recommendation is **not** "build a map editor." It is: **build the place-layer, ship one
deliberately limited house style, and never enter the asset war.** §8 prices it at **21 days** of new work
and it makes the stakeholder's own 8192² Andaria map clickable, fogged, queryable and citable against
the fixture already sitting on disk.

---

## 1. The scene model — is "this is trivial" true?

### What it actually is

```ts
// scene.v3.ts — the whole document, nothing hidden
type SceneDoc = {
  v: 3;                            // schema version, migrated forward, never in-place
  size: [number, number];          // 8192 x 8192 for Kaya's Andaria
  base?: PyramidRef;               // the imported raster, as a tile pyramid (RB-02)
  layers: Layer[];                 // ordered, named, lockable, hideable
  stamps: Stamp[];                 // the bulk
  regions: Region[];               // polygons — the world layer (§5)
  paths: Path[];                   // roads, rivers, borders
  places: Place[];                 // points
};

type Stamp = {
  id: StampId;                     // stable across export -> import -> diff
  a: AssetRef;                     // "pk.wald/baum_7" — pack-qualified, never a URL
  x: number; y: number;            // world px
  s: number;                       // uniform scale
  r: number;                       // radians
  l: LayerIdx;
  t?: number;                      // tint, 0 = none
  f?: number;                      // bitflags: flipX, flipY, locked, castsShadow
};
```

And the sentence the whole product turns on — **the entity binding is not a field on the stamp**:

```ts
// A stamp is anonymous and cheap. Promotion is an explicit, separate act.
type MapAnchor = {
  scene_id: SceneId;
  target: { kind: 'stamp'; id: StampId }
        | { kind: 'region'; id: RegionId }
        | { kind: 'place';  id: PlaceId };
  entry_id: KnowledgeEntryId;      // the wiki article
  passage_id?: PassageId;          // the citation, if one was named
  klausel_ref?: ClauseRef;         // the mechanical clause a region may carry
};
```

### Is Apollon's "trivial" claim true?

**About the shape: yes, and it is measurable.** [gemessen — `scratchpad/szene-mess.mjs`, Node 24.18.0,
this laptop, one in twelve stamps carrying an entity ref]

| stamps | JSON | gzip | `JSON.parse` | struct-of-arrays | index build | cull query | visible @1920×1080 |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1,000 | 0.09 MB | 0.02 MB | 1.6 ms | 0.02 MB | 0.2 ms | 0.005 ms | 58 |
| 5,000 | 0.48 MB | 0.11 MB | 5.3 ms | 0.11 MB | 0.8 ms | 0.010 ms | 237 |
| 20,000 | 1.91 MB | 0.43 MB | 24.2 ms | 0.46 MB | 2.1 ms | 0.007 ms | 1,262 |
| **50,000** | **4.78 MB** | **1.06 MB** | **45.4 ms** | **1.14 MB** | **2.3 ms** | **0.021 ms** | **1,897** |
| 200,000 | 19.27 MB | 4.25 MB | 196.0 ms | 4.58 MB | 12.3 ms | 0.111 ms | 11,832 |

A 50,000-stamp scene is **one megabyte over the wire and 45 ms to parse.** There is no data-engineering
problem here. The claim is true.

### The hard part

Not the shape — **identity and referential integrity under the gates the champion already set.**
`CHAMPION.md` §12.1 step 12 demands `export → import → diff empty`, and §12.4 carries *der
Zwillingsbeweis* and *Round-trip*. A scene joins that regime, which means:

- **`StampId` must survive the round trip byte-identically.** This is the *same* problem
  `spike-A-passage-identity` already solved and measured (116 SLOC, 0.087 ms/keystroke at 300 passages,
  3,000-op fuzz with zero foreign ids surviving). Reuse it; do not invent a second id scheme.
- **Deleting a stamp must not orphan a `MapAnchor`, and deleting an article must not silently delete
  geometry.** Two directions, two fixtures, both in the diff gate.
- **One place, many maps.** Because the anchor is a separate row keyed by `scene_id`, *Andaria the
  article* can be anchored on the world map, the regional map and the city map without duplication. If
  the entity were a field on the stamp, that would be three truths.

### The trap

**Making the stamp the entity.** If every tree is a row in the knowledge graph, then dragging a forest
writes 400 wiki mutations, the provenance layer fills with noise, and *die Herkunftsschicht* — the
champion's most-loved surface — becomes a log of somebody rearranging shrubbery. Stamps are anonymous
by default and **promoted on purpose**. This is not a performance decision, it is the anti-log
invariant (`CHAMPION.md` §5, §11) applied to geometry.

### Cheap path & days

Reuse the passage-identity layer, one `MapAnchor` table, versioned migrations as pure functions, and
two round-trip fixtures. **4 days.** Risk: low.

**Sequencing note that matters beyond this brief:** the scene document is also the *output format of
WFC*. K5's generator has to emit something, and this is the something. **§1 is on the critical path for
K5 whether or not an editor ever ships.** That is 4 of these 37 days that are owed regardless.

---

## 2. Rendering — what Pixi buys us, quantified

### What Pixi already gives us, in its own numbers

PixiJS's own v8 benchmark page [Herstellerangabe, MacBook Pro M3]: **200,000 sprites at 60 fps** with
plain `Sprite` + `Container`; **1,000,000 particles at 60 fps** with `ParticleContainer`, "over 3×
faster than the v7 particle container"
(https://pixijs.com/blog/particlecontainer-v8). RB-02 already carries the independent corroboration —
an LUT thesis benchmark where *every* tested device drew 1,000 sprites at 60 fps, with batching the
dominant variable.

**And here is the fact that decides this section.** `ParticleContainer`'s supported per-particle
properties are, verbatim from that page: *"texture, position, anchor, scale, rotation, alpha and
color."*

Set that beside `Stamp` from §1: `{a, x, y, s, r, t}`.

> **The stamp record is not merely renderable by `ParticleContainer` — it is `ParticleContainer`'s data
> model, field for field. Pixi shipped the map editor's renderer before we asked for it.**

### The split that falls out of it

```
ParticleContainer   ← the anonymous bulk (trees, rocks, waves). static:true except position.
                      No hit-test, no children, no DOM proxy. Tens of thousands.
Container<Sprite>   ← entity stamps only (§1: those with a MapAnchor). Hit-testable,
                      filterable, and each gets a Pixi accessibility DOM proxy. Hundreds.
```

That split is not a performance hack. It is *the product model expressed as a scene graph*: the things
that mean something are the things you can click, and there are a few hundred of them.

### What breaks first, and at what count

Not sprite count. **Texture count.** RB-02's budget is explicit: *"Distinct textures per frame ≤16 —
one batch (PixiJS's batch limit)."* Inkarnate ships 23,400–30,000+ assets [Herstellerangabe, §3]. Those
cannot co-reside in 16 atlases at usable resolution. So the ceiling is **atlas residency / VRAM**, and
it arrives long before the sprite ceiling.

Order of failure, as I expect to hit it:

| # | Breaks | Roughly when | Fix |
|---|---|---|---|
| 1 | **Batch breaks from atlas thrash** | >16 distinct atlases visible in one frame | per-theme atlases packed server-side at pack-upload time; atlas paging by viewport; a *scene lint* that tells the author "this scene needs 23 atlases" |
| 2 | **DOM a11y proxies** | ~500+ focusable objects | proxies only for entity stamps; terrain gets the Outline summary, per RB-02 §a11y-1 |
| 3 | **Per-stamp tint/filter** | any stamp with a unique filter | tint is a batchable vertex attribute; *filters are not* — filters are a per-layer effect, never per-stamp |
| 4 | **Raw sprite count** | far past our budget (Pixi's own 200 k) | culling, measured at **0.021 ms/query for 50 k stamps** [gemessen] |

**Culling is a non-issue and I have the number.** A uniform 512 px grid over 50,000 stamps builds in
2.3 ms and answers a viewport query in **0.021 ms**, returning 1,897 visible stamps at 1920×1080
[gemessen]. Against RB-02's 16.7 ms frame budget with 4.0 ms for renderer submit, culling costs 0.5 %
of its own slice.

### The LOD floor that makes this honest

At low zoom you must not draw 50,000 trees to produce 40 pixels of forest. Below a zoom threshold,
**draw the baked pyramid tile instead of the stamps** — the pyramid Apollon already built
(1,365 tiles, 9.9 MB, 6 levels, on disk at `fixtures/eron/media/kachelpyramide/`). The pyramid is
therefore not only the *import* path for foreign rasters; it is the *LOD floor of our own renderer*.
That is one pipeline serving three jobs and it is the strongest cost argument in this brief.

### Cheap path & days

`ParticleContainer` + `Container<Sprite>` split, server-side atlas packer, atlas paging, LOD switch to
pyramid tiles, uniform-grid cull, hit-test, a11y proxies for entity stamps, budget scene for the CI
perf gate. **8 days.** Risk: **medium** — the atlas packer and paging are the real work; everything
else Pixi does.

**Honest gap:** I rendered **zero** Pixi frames today. Node measured the data; the GPU measured
nothing. The 200 k figure is the vendor's, on an M3. §9 lists this as the top unknown and §10 names the
one-day spike that closes it.

---

## 3. The brush engine — the part everyone assumes is the hard part

### What Inkarnate actually does

From their tier page [Herstellerangabe, retrieved 2026-07-27 via `r.jina.ai` text proxy] and from
independent tutorial coverage (https://loreteller.com/learn/inkarnate-layers-guide/,
https://loreteller.com/learn/inkarnate-blending/):

- **Three brush sub-layers** — Background, Foreground, Top. Each is a *raster mask*.
- **Brush parameters**: size, **softness** ("high softness = fuzzy gradual edges, low = crisp"),
  opacity, blend mode.
- **Texture through mask**: the layer is filled with a tiled terrain texture and revealed by the mask.
- **Flatten**: a stamp can be burned into a brush layer, at which point *"the stamp loses its individual
  identity and becomes permanent texture."*

That is it. That is the whole engine. It is a mask render-texture, a soft round brush and a blend mode.

### Is it hard? No — and their own pricing page proves where the difficulty actually sits

Inkarnate's live tiers [Herstellerangabe, retrieved 2026-07-27]:

| Tier | Price | Assets | Export | **Editor resolution** |
|---|---|---|---|---|
| Hobby | free | 1 K+ | 2K | 2K |
| Creator | $7.99/mo | 30 K+ | 8K | **4K** |
| Studio | $14.99/mo | 30 K+ | **16K (Beta)** | **4K** |

*(Their own page states both "over 23,400 diverse assets" and "30K+ HD Art Assets". Two vendor claims
that disagree on the same page; quote them as a range. Note also that RB-15 §1.7's "$5/mo or $25/yr for
Pro" is **stale** — the live page shows $7.99 and $14.99 monthly tiers. Correct RB-15 when convenient.)*

Read the last column. **After roughly a decade, the market leader's editor is capped at 4K while its
export goes to 8K, and 16K export is still labelled Beta.** That is exactly the signature of a raster
mask pipeline: the mask is baked at editor resolution, so a larger export is an upsample, and a much
larger export is a research project. *(Inference from published tiers, labelled as inference — I have
no access to their internals.)*

**A stamp-and-region model has no such ceiling, because it stores no pixels.** A stamp is a transform;
a region is a polygon; both render at any resolution. That is not a marketing sentence, it is the
structural consequence of §1, and it is the one place where "etwas Besseres" is achievable **by
building less, not more.**

### Is stamp-and-region a legitimate substitute, or a visible downgrade?

**Both, and here is precisely where the line falls.** I will not soften this.

**What you lose, visibly:**

1. **The blended coast.** Inkarnate's aesthetic *is* sand fading into grass fading into forest. A
   polygon with a flat fill looks like a political atlas, not a painted map. This is the single most
   noticeable difference and a reviewer will name it in the first paragraph.
2. **Freehand irregularity.** Hand-painted mountain shading, a smear of mist, a deliberately messy
   edge. There is no polygon for "an artist's wrist."
3. **Painting over a stamp.** Inkarnate's *flatten* exists because authors want to bury a stamp under
   terrain. A stamp model cannot do that; it can only reorder.

**What recovers most of #1 without a paint engine:** render the region **feathered in a shader**.
Distance-to-edge → alpha ramp → blend between two terrain textures. The polygon stays the authority,
the softness is a *render parameter* (one slider), it is resolution-independent, its undo unit is the
polygon rather than a texture delta, and — the part that matters for K1 — **it re-skins with the theme,
because the textures come from the theme pack while the geometry does not.** A raster mask cannot do
that. Repaint a raster map in PixelArt and you get a blurry raster map.

**What does not recover: #2 and #3.** Say so out loud, in the product copy, before a reviewer does.

### The ruling, and its relationship to a ratified refusal

[`RB-15`](RB-15-werkzeuglandschaft.md) §3.3/7c **refuses a hand-drawing map editor**: *"Chronicle will
not compete with Inkarnate's asset library or Dungeondraft's brushes. That is a decade of art
production."* **I do not re-open that refusal — I sharpen it, and my measurements support it:**

- **Brushes: refuse.** Not because they are hard (they are not), but because a raster layer costs
  resolution independence, costs cheap undo (§4), costs theme re-skinning (K1), and buys an aesthetic
  we cannot staff.
- **Asset library: refuse, permanently.** 23,400–30,000 assets is the moat and it is made of human hours.
- **The stamp-and-region place layer: neither refused nor granted by RB-15** — it is not in their
  taxonomy, because it is not a map-making function. It is *the wiki's geography surface*, and
  `CHAMPION.md` §4 already requires that regions carry clauses and that fog opens because knowledge
  opened. **It has to exist.**

### Days

**6 days** — feathered-region shader (WebGL2 + a flat-fill Canvas2D floor per RB-02), texture-through-
mask compositing, blend modes, region draw/edit UI with a feather slider.
Risk: **medium-high**, and the risk is aesthetic, not technical: *"does it look good"* has no day
estimate. Budget one throwaway visual spike inside those 6 days and be willing to hear "no."

**Deferred and priced so nobody thinks it is free: a real raster brush layer = +8 days**
(mask render-textures per layer, stroke-delta undo with a memory cap, export baking, editor-resolution
policy). Do not spend it until someone has asked twice.

---

## 4. Large-canvas mechanics

### Undo/redo — measured, and it is free

[gemessen] One move patch: **84 bytes.** A 1,000-step undo ring: **82 KB.** The naive snapshot model at
50,000 stamps: **4.67 GB.** A 300-stamp scatter-brush stroke as one patch: **29 KB.**

Command journal, obviously. The interesting consequence is retrospective: **undo is free *only because*
§3 refused the raster brush.** A brush-stroke undo is a texture delta, not 84 bytes. This is the second
place where the paint engine's real cost shows up somewhere other than the paint engine.

### Autosave

The scene is 1.06 MB gzipped at 50 k stamps [gemessen]. Full-document autosave is affordable, but the
right shape is an **append-only op log with periodic compaction** — because that same log is the
collaboration substrate (below), the crash-recovery path, and it fits the append-only `AuditEntry`
discipline the champion already runs (§4.9). One mechanism, four jobs. **2 days.**

### Collaborative editing — refuse, with a number

Two GMs painting one map simultaneously is not a use case anyone in this corpus has asked for. A CRDT
over an array of geometry has ugly merge semantics (what is the union of two conflicting polygon
edits?) and is a research project. **Refuse it, and instead ship a single-writer lock with a visible
holder and one-click handoff — 1 day.** Refusing saves an estimated 15–25 days *(my estimate, not
sourced — treat as an order of magnitude)* and loses nothing anyone requested. Live *token* sync is a
different problem, it belongs to the VTT half, and it is already priced there.

### Export at 8192² from a browser — the measured wall

[gemessen, and independently re-derived on the stakeholder's own file:]

```
Andaria_03.02.2024.webp   8192 x 8192, WEBP, RGB
decode + convert          1.99 s
naive RGB array           192 MB      (RGBA backing store: 256 MB)
distinct colours, FULL    309,229     (top 12 all within one sea-blue-grey band)
distinct colours @260x166  22,536     (Apollon measured 24,162 — same finding, different resampler)
```

**Raster→SVG tracing is refuted again, on the full image this time, not a downsample.** 309,229 colours
is not a vector document. Nobody should spend a day on it.

**The canvas wall, and it is a platform wall, not a performance one:**

| Platform | Limit | 8192² = 67,108,864 px |
|---|---|---|
| iOS / Safari | canvas area cap **16,777,216 px** (https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/, https://github.com/wojtekmaj/react-pdf/issues/1149) | **4.0× over — a single-canvas export is impossible on iPad, at any effort level** |
| Chrome desktop | 16,384 max dimension | legal, at a 256 MB backing store |
| Firefox | ~11,164 max dimension (secondary source, *uncertain*) | legal by area, near the dimension edge |

So: **tiled export is not an optimisation, it is the only portable implementation.**

[gemessen — CPU encode proxy via PIL 10.4.0 on this laptop; browser `toBlob` uses the same class of
native encoder, so treat as order-of-magnitude, not as a browser measurement:]

| Tile | Passes | Peak RAM/pass | PNG | WebP q90 | JPEG q92 |
|---|---:|---:|---|---|---|
| 2048² | 16 | 16 MB | 1.53 s/tile → **24.5 s**, 63 MB | 0.83 s/tile → **13.3 s**, 6 MB | 26 ms/tile → **0.4 s**, 10 MB |
| 4096² | 4 | 64 MB | 5.01 s/tile → **20.0 s**, 82 MB | 3.62 s/tile → **14.5 s**, 10 MB | 69 ms/tile → **0.3 s**, 14 MB |

**The export bottleneck is the encoder, not the compositor.** Compositing 50 k stamps into 16 render
textures is a GPU job measured in milliseconds; turning them into a PNG is 25 seconds of CPU. Two
consequences:

- **Default the in-app "picture of my map" to WebP or JPEG**, offer PNG as the slow, explicit choice
  with a progress bar and a cancel button.
- **Stitching 16 tiles into one file** needs either an 8192² canvas (Chrome desktop, 256 MB — fine) or
  a streaming encoder. **Hosted: stitch server-side.** **Electron: stitch natively.** **iPad: offer the
  tiles or a 4096² downscale and say so in the UI rather than failing at 90 %.**

### Where the tile pyramid belongs: **both ends, and a third place nobody listed**

1. **Import.** Every uploaded raster becomes a pyramid. Apollon's measurement stands: 6 levels,
   256 px tiles, WebP q82, **1,365 tiles, 9.93 MB, 31.7 s build**, first visible pixel 17,690 bytes
   instead of 10,901,550 — **616×**. Verified against `pyramide.json` on disk.
2. **Export.** The pyramid *is* the export for anything that stays in-app; a flat file is produced only
   for rivals and for print.
3. **The renderer's LOD floor** (§2). This is the one that was not in any prior brief and it is the one
   that makes the stamp renderer affordable at world scale.

**One operational rule, carried from the fixture harvest and worth restating because it will bite
someone:** Fandom's CDN transcodes uploads to WebP and serves them under the original `.jpg`/`.png`
name. **Read format from magic bytes, never from the filename.** The file measured above is literally
named `.webp` only because the harvester renamed it after sniffing.

### Days

Undo journal 1 · op log + autosave + compaction 2 · tiled export + encoder policy + stitch paths +
iOS fallback 3 · single-writer lock and handoff 1 = **7 days.** Risk: medium, concentrated entirely in
the export path.

---

## 5. The vector world layer — and the first millisecond ever put on `Sicht`

### How much is standard geometry with known libraries?

**Almost all of it.** `rbush` (MIT, ~1 KB, the same R-tree behind Mapbox's tooling), `polygon-clipping`
(MIT, Martinez–Rueda boolean ops), `earcut` (MIT, triangulation for GPU fills), `simplify-js` (RDP).
Total dependency weight: single-digit kilobytes. I installed two of them and measured.

**Hit-testing** [gemessen — `scratchpad/vektor-mess.mjs`, irregular 40–80-vertex blobs over an 8192²
world, R-tree bbox prefilter + ray-casting point-in-polygon]:

| Regions | Vertices/region | Total vertices | Index build | 10,000 queries | **per query** |
|---:|---:|---:|---:|---:|---:|
| 100 | 40 | 4,000 | 1.6 ms | 23.6 ms | **2.36 µs** |
| 500 | 60 | 30,000 | 8.4 ms | 44.8 ms | **4.48 µs** |
| 2,000 | 80 | 160,000 | 5.2 ms | 78.5 ms | **7.85 µs** |

At 7.85 µs, you can hit-test on **every mouse-move of every frame** at 2,000 regions and spend 0.05 %
of the frame budget. Snapping (grid, vertex, edge) rides the same index for free. This component is
not a risk; it is a Tuesday.

### Per-character fog as a vector mask — the number the lineage has been missing for four rounds

`CHAMPION.md` §4 claims fog and article permission are one predicate. RB-15 §5.2 calls it one of the
four genuine fusions. RB-18 §4.2 counts it as 7 of the 31 fusion-bearing days and notes that **nothing
in five rounds ever exercised a fog texture.** Here is the geometry half, measured.

[gemessen — fog = world rectangle MINUS union of revealed area polygons, `polygon-clipping`:]

| Revelations | Union (from scratch) | Difference | Resulting fog | JSON |
|---:|---:|---:|---:|---:|
| 20 | 9.6 ms | 5.2 ms | 484 vertices | 18 KB |
| 50 | 8.5 ms | 5.5 ms | 1,049 vertices | 39 KB |
| 200 | 47.7 ms | 21.8 ms | 3,211 vertices | 120 KB |
| 800 | **386.2 ms** | 34.1 ms | 3,518 vertices | 132 KB |
| **one new revelation against an existing mask** | — | **9.38 ms** | — | — |

Compare a bitmap: 8,192 px / 32 px per cell = 256×256 = 65,536 cells = **8 KB per character as a 1-bit
mask** [gemessen], and O(1) to update.

**The honest architecture that falls out of these two columns, and it is the important paragraph in
this brief:**

> **The authoritative fog is not geometry at all. It is a set of revealed region and place ids —
> which is exactly `Sicht`, which the permission layer must own anyway, and which `S-P1` (two days,
> unrun for four rounds) is supposed to spike.** The polygon mask is a *derived render artifact*:
> computed in a worker, cached per character, updated **incrementally at 9.4 ms per reveal**, and
> rebuilt from scratch only on join or on a permission change — 386 ms at 800 revelations, in a
> worker, behind a spinner, once.

Consequences, stated plainly:

- **Per-character fog does not cost a new subsystem.** It costs a `union`/`difference` call over data
  the permission layer already owns. The champion's fusion claim is cheaper than its own ledger says.
- **The bitmap is not the enemy of the vector mask; it is its render target.** Rasterise the derived
  polygon once per camera change if the GPU path prefers a texture. Either way the *truth* stays a set
  of ids, which is what makes it a permission and not a rendering detail (RB-02: *"Fog reveals are
  server-side facts"*).
- **From-scratch union is the one thing that could bite.** 386 ms at 800 revelations is fine once and
  fatal per-frame. Cache aggressively; never recompute on camera move.

### Labels

**DOM, not canvas.** RB-02 §Labels already rules it: MSDF atlas text for hot-path nameplates, DOM for
arbitrary user text. World-layer labels are few, they are user-authored, they are translated, they must
be selectable and screen-reader-visible, and German compounds overflow fixed nameplate widths.
Positioning DOM labels against a camera transform is a `transform: translate3d` per label per frame for
a few dozen labels. Crisp at every zoom, free accessibility, no atlas.

### What is genuinely novel

**Two things, and neither is geometry:**

1. **Binding a polygon to a mechanical clause** (`MapAnchor.klausel_ref`) so that "you are inside the
   Aschenwald" is a modifier the dice engine reads. That is product design over the existing clause
   format, not new math.
2. **A region whose visibility is a per-character permission and whose *label* may be visible while its
   *contents* are not.** The half-known place. That is the champion's `erfahrungsgrad` applied to
   geography and it is the one thing in this entire brief that no competitor ships.

### Days

Regions/paths/places CRUD + editing + snapping 4 · index and hit-test 1 · fog derivation worker,
cache, incremental update 3 · DOM label layer 1 = **9 days.** Risk: low-medium.

---

## 6. The integration seam — how this does not become a second application

### Behind `MapRenderer`, with exactly two additions

RB-02's rule is binding: *nothing outside `src/render/pixi/*` imports PixiJS*, and the justification is
the live cautionary tale — Foundry investigated the Pixi v7→v8 migration, called it *"far more sweeping
and disruptive than planned"*, cancelled it, and is still on v7 in 2026 because its renderer leaked
into its public API.

The editor needs **two** new methods on the existing interface (`setScene`, `applyPatch`, `setCamera`,
`hitTest`, `renderFrame`, `capability`):

```ts
hitTestMany(rect: WorldRect): SceneRef[];              // marquee selection
renderToTiles(rect: WorldRect, px: number): AsyncIterable<{x,y,bitmap}>;  // §4 export
```

That is the whole renderer-side surface. **Everything else the editor is — tool palette, asset browser,
layer list, property inspector, undo UI — is DOM/React**, which is the entire point of RB-11's ruling
and the reason a game engine was rejected.

### Where it must live so the Forge stays separably shippable

```
packages/
  szene/       scene document, versioned migrations, validators   ← no Pixi, no React, no server
  render/      MapRenderer + render/pixi/*                        ← imports szene only
  forge/       the editor: tools, palettes, asset browser         ← imports szene + render
  chronik/     campaign, wiki, permissions, Sicht, dice           ← imports szene, NEVER forge
```

**The load-bearing rule, and it is a one-line CI check:** `packages/forge` must never import from
`packages/chronik`. The Forge authors **geometry**; the campaign authors **who may see it**. A
revelation is a permission fact and belongs to `chronik`; a polygon is a shape and belongs to `szene`.

If those blur — if the editor grows a "reveal this to Sera" button that reaches into `Sicht` — the
Forge can no longer ship as a standalone Electron binary, and RB-11's separability ruling is dead. That
is the trap, it is the *only* architectural trap in this brief, and it is cheap to enforce and
impossible to repair later.

The payoff is exactly the shape RB-11 named: `packages/{szene,render,forge}` + Electron = **a
standalone map tool that reads and writes `.szene` and `.uvtt` and exports into every rival** — which is
the Dungeon Alchemist pattern (€2.46 M from 57,209 backers) and the Megasploot pattern (a solo developer
who set the interchange standard of a market where every incumbent was larger).

### Days

Package split, the two renderer methods, the import-boundary CI check, one `.szene` file round-trip in
a bare Electron shell: **3 days.** Risk: low. Cost of *not* doing it: RB-11's separability, permanently.

---

## 7. The verdict, as a table

### 7.1 Component × hard-or-cheap × days × what kills it

New work only. `MapRenderer` + Pixi (8) and the tile pyramid + KTX2 (10) are **already in
`CHAMPION.md` §9.2** and are owed by the tactical half regardless; they are not re-charged here.

| # | Component | Hard or cheap | Days | Risk | **What kills it** |
|---|---|---|---:|---|---|
| 1 | **Scene model** — document, versioning, `MapAnchor`, round-trip fixtures | **cheap** (measured: 50 k stamps = 1 MB gz, 45 ms parse) | **4** | low | Making the stamp *be* the entity → 400 wiki mutations per dragged forest, and the anti-log invariant dies |
| 2 | **Stamp rendering** — `ParticleContainer` + entity sprites, atlas packer, paging, LOD to pyramid, cull | **cheap-medium** (Pixi's own model is our record, field for field) | **8** | med | Atlas thrash past 16 textures/frame; a11y proxies on non-entity stamps; per-stamp filters |
| 3 | **Terrain, as feathered regions** — SDF shader, texture blend, region authoring | **medium** — *aesthetic* risk, not technical | **6** | med-high | It looks like a political atlas and a reviewer says so in paragraph one |
| 3b | *(deferred)* real raster brush layer | cheap to build, expensive to own | *+8* | — | Costs resolution independence, cheap undo **and** K1 re-skinning. Do not spend until asked twice |
| 4 | **Large-canvas mechanics** — undo journal, op log/autosave, tiled export, writer lock | **medium**, all of it in export | **7** | med | iOS Safari's 16,777,216 px cap; a 25 s PNG encode with no progress bar |
| 5 | **Vector world layer** — regions/paths/places, hit-test, snapping, derived fog, DOM labels | **cheap** (7.85 µs/hit-test; 9.4 ms/incremental reveal) | **9** | low-med | Recomputing the fog union per frame instead of incrementally (386 ms) |
| 6 | **Integration seam** — package split, 2 renderer methods, import-boundary CI gate | **cheap, and load-bearing** | **3** | low | `forge` importing `chronik` → the Forge stops being separately shippable, permanently |
| | **Total, new engineering** | | **37** | | |
| | **+ RB-18 §6.3's restored 20 % contingency** | | **≈44** | | |
| | *(already ledgered, not re-charged: `MapRenderer` 8 + pyramid 10)* | | *18* | | |

**Refused, with the saving named:** collaborative multi-writer editing (−15–25 days, *my estimate*),
a competing asset library (RB-15 §7c, upheld), raster→SVG tracing (refuted by 309,229 colours
[gemessen]).

### 7.2 And the number that is not in the table

**The art.** Inkarnate: **23,400–30,000+ assets** [Herstellerangabe, and their own page states both].
RB-04's tier-0 recommendation is a *deliberately small* commissioned first-party core. A world-map
theme that does not look like a programmer made it needs, by my reckoning as the person who would have
to place them, roughly **80–120 stamps per theme** (≈20 mountains, ≈25 trees/forests, ≈15 settlements,
≈10 terrain textures, ≈15 icons/banners/borders, ≈10 decorations) — and K1 promises **four** shipped
themes.

**No reliable figure found** for what that costs. RB-04 specifies the German commissioning contract in
detail (§§29/31a/32/32a UrhG, exclusive transferable sublicensable rights, the end-user sublicense
clause) **and contains no quote.** `CHAMPION.md` §2 states: *"Not priced at all: illustration
commissioning. [needs a quote — no evidence base, will not invent one]."* I will not invent one either.

> **So the verdict on the stakeholder's sentence, precisely: an integrated map editor is not "gottlos
> schwierig" to implement. It is ~37–44 engineering days, and the measurements above are unusually
> specific for a system nobody has built. What is gottlos schwierig is making it look like Inkarnate,
> because Inkarnate is not software — it is a decade of drawings, and that is the only part of this
> that one builder with an AI crew genuinely cannot buy with time.**

### 7.3 Does the thesis survive?

Apollon's thesis, tested clause by clause:

| Claim | Verdict | Evidence |
|---|---|---|
| *"A stamp scene is a list of `{asset,x,y,scale,rotation,layer}`"* | **TRUE, and better than claimed** | It is `ParticleContainer`'s exact property set [Herstellerangabe]. 50 k stamps = 1.06 MB gz, 45 ms parse [gemessen] |
| *"The expensive part of Inkarnate is thousands of stamps — an art cost, not an engineering one"* | **TRUE, and it is the finding that should worry him** | 23,400–30,000+ assets [Herstellerangabe]; the engineering measures at 37 days |
| *"The vector world layer must be built anyway because the wiki links to it"* | **TRUE** | `CHAMPION.md` §4 requires region clauses and knowledge-driven fog; §1's scene doc is also WFC's output format, so 4 of the 37 days are owed regardless |
| *"Every stamp is an entity"* | **FALSE as stated, and dangerous** | §1's trap. Stamps are anonymous; promotion is explicit. Otherwise the provenance layer fills with shrubbery |
| *"Fog is per-character"* | **TRUE and cheaper than the ledger says** | Authoritative fog = a set of ids; the mask is derived at 9.4 ms/reveal [gemessen] |
| *"The map re-skins with the theme (K1)"* | **TRUE — but only if §3's refusal holds** | A raster mask cannot re-skin. This is the strongest argument against ever building the brush layer |
| *"Therefore the increment is small"* | **TRUE: 37–44 days** | §7.1 |
| *"...and the differentiator is categorical"* | **NOT YET.** The differentiator is categorical only if someone draws ~100 assets that look intentional | §7.2, §8 |

**One tension the crew must see rather than have smoothed over:** RB-15 §3.3/7c **REFUSED** a
hand-drawing map editor, and it was right. This brief upholds that refusal on brushes and on the asset
library, and argues the place-layer is a *different function* that RB-15 never ruled on. **That is my
argument, not RB-15's, and Apollon should rule on it explicitly rather than let it pass as
continuity.**

---

## 8. The smallest version that is still exciting

Not the smallest that works — the smallest that makes someone say *"oh."*

### „Der Ortsleger" — the place-layer. 21 days of new work.

**The demo, one take, against the corpus already on disk:**

1. Kaya drags `Andaria_03.02.2024.webp` — his own 8192², 10.9 MB, 67.1 MPx map — onto the page. It
   opens in **17 KB and one frame**, not 10.4 MB and a spinner. *(Pyramid pipeline: already priced at
   10 days in `CHAMPION.md` §9.2, already built once by Apollon, 31.7 s, on disk.)*
2. He traces **Haus Vharon's** territory with six clicks. It is a region. It is feathered, not a hard
   polygon. It carries a clause.
3. He clicks the region and types a title. The red link turns blue: **the region is the article, and
   the article is the region.** *Der rote Link ist eine Tür* — `CHAMPION.md` §3.4 — with a shape.
4. He drops eleven place points from the theme pack. Each is an entity. Each cites a passage.
5. Sera opens the same map on a phone. **She sees four of the eleven places and one of the six
   regions**, because that is what her `Sicht` holds — derived in 9.4 ms, per character, from the
   permission layer that already had to exist [gemessen].
6. He exports. UVTT for Foundry; a 4096² WebP for print. *(UVTT: already priced at 6 days.)*

**The sentence it earns:** *Inkarnate makes a picture. We make a place — out of the picture you already
have.*

**Cost, new work only:**

| From | Days |
|---|---:|
| §1 scene model + `MapAnchor` | 4 |
| §5 vector world layer (regions, places, hit-test, derived fog, DOM labels) | 9 |
| §6 integration seam (package split + CI boundary) | 3 |
| §3 feathered regions — **half of it**, the flat-fill floor + one feather slider | 3 |
| §4 — **only** the undo journal and a 4096² single-canvas export | 2 |
| *(reused, already ledgered: pyramid 10, `MapRenderer` 8, UVTT 6)* | *0* |
| **Total new** | **21** |
| **+ RB-18 §6.3's restored 20 % contingency** | **≈25** |

*(It falls to **15** if §6's package split and §3's feathering are deferred — but §6 deferred is §6
never done, and it is the seam that keeps the Forge separately shippable, so I would not.)*

**What is deliberately absent, and it is most of the editor:** no stamp bulk renderer, no atlas
pipeline, no brushes, no 8192² export, no asset library, no generation. **Not one of them is needed for
the demo above to land**, and every one of them is a door that stays open.

### Why this is the right cut, in RB-18's own terms

RB-18 §4.2's sharpest finding: *between 52 and 69 of the 100 tactical days buy parity with a $50
competitor; the fusion thesis buys at most 48.* Its route item 5: **sequence the fusion-bearing days
first.**

Of Der Ortsleger's 21 days, **12 are fusion-bearing** (§5's derived fog and entity regions, §1's
`MapAnchor`) — days that cannot be bought from Foundry for $50, from World Anvil for $99/yr, or from
one volunteer's MIT bridge module. The remaining 9 are structure that K5 owes anyway.

And it does the thing RB-18 §1.7 says nothing else in this project does: **it converts estimated days
into measured ones.** Five of the numbers in this brief were measured today on the stakeholder's own
map. That is the first calibration of the map subsystem in six rounds.

---

## 9. What could not be established

Recorded so no later round launders an absence into a fact.

1. **Frame time for our own stamp scene on the reference laptop.** I rendered **zero Pixi frames**
   today. Everything in §2 is Node-measured data plus a vendor benchmark on an M3. **This is the most
   important unknown in this brief**, and §10 names the one-day spike that closes it.
2. **Browser `toBlob` encode timings.** §4's export table is a PIL/CPU proxy. Same class of native
   encoder, but not a browser measurement.
3. **How many stamps a real Inkarnate world map contains.** No reliable figure found. §1's 1 k–200 k
   sweep brackets it; it does not measure it.
4. **The cost of commissioning an 80–120-asset theme pack, × 4 themes (K1).** No reliable figure found.
   RB-04 has the contract clauses and no quote; `CHAMPION.md` §2 refuses to invent one; so do I. **This
   is the largest unpriced item in the map story and it is larger than all 44 engineering days.**
5. **Whether Inkarnate's 4K editor cap is caused by raster masks.** Inference from their published
   tiers, labelled as inference in §3. I have no access to their internals.
6. **Firefox's exact maximum canvas dimension.** Secondary sources say ~11,164; not verified against a
   Mozilla source. Chrome's 16,384 and iOS's 16,777,216 px area cap are well-sourced; Firefox's is not.
7. **The 15–25 days saved by refusing collaborative editing** (§4). My estimate, unsourced. Treat as an
   order of magnitude.
8. **Whether feathered regions look good enough.** Unknowable without a visual spike. It is the one
   genuinely aesthetic risk in the table and it carries the highest risk mark for that reason.

---

## 10. The spike I would run first, and it is one day

RB-18 §6 route item 2 asks for *"S-T1, or one fifth of it — not to build the canvas: to calibrate the
unit."* Here is the fifth, aimed at the map:

> **`S-K1` · Der Stempelwurf — one day.**
> Load the 50,000-stamp scene file this brief already generated. Put the anonymous bulk in a
> `ParticleContainer` and 400 entity stamps in a `Container<Sprite>`. Pan and zoom over Kaya's real
> Andaria pyramid as the base layer. Report: frame time at p50/p95, draw calls, texture count, VRAM
> estimate, and the count at which it first misses 16.7 ms — on the reference laptop in RB-02's
> performance budget, on WebGL2, on battery.

One day converts §2's 8-day estimate from a vendor's M3 number into ours, tests the `MapRenderer`
boundary with a real second consumer, and produces the first frame this lineage has ever rendered. If
it comes back green, the 37 days are a bill. If it comes back red at 5,000 stamps, **this brief is
wrong and the crew finds out for one day instead of eight.**

---

## 11. Sources

**Internal (all figures re-derived or re-read against these files):**
`design/00-intake.md` K1, K5, K6, K9, K10 · `design/iterations/CHAMPION.md` §1, §2, §4, §9.2, §9.5,
§12.1, §12.4 · `design/research/RB-02-rendering-tech.md` (budgets, `MapRenderer` rule, tile pyramid,
labels, fog-as-server-fact) · `RB-04-asset-licensing.md` (CC0 sources, tier-0 commissioning, UrhG
clauses, WFC socket bottleneck) · `RB-05-competitor-maps.md` (UVTT, Dungeon Alchemist, Owlbear Warp
Core, Foundry's abandoned Pixi migration) · `RB-11-steam-vs-browser-verdict.md` (Pixi pinned, the Forge
separable, rival export at launch) · `RB-15-werkzeuglandschaft.md` §1.7, §3.2/7a, §3.3/7c ·
`RB-17-substrat.md` (Megasploot/UVTT, exports as the mechanism) · `RB-18-widerspruch.md` §1.3, §1.7,
§4.2, §6 · `design/fixtures/eron/media/` and `media/kachelpyramide/pyramide.json`.

**Measured today [gemessen] — every script is on disk and re-runnable, in
`design/spikes/spike-K-kartenmass/`:**
`szene-mess.mjs` (scene serialisation, culling, undo ring, export arithmetic) ·
`vektor-mess.mjs` (region hit-test via `rbush`, fog union/difference via `polygon-clipping`) ·
`bild-mess.py` (decode, full-image colour census and tile-encode timings against the real
`Andaria_03.02.2024.webp`). `npm i && node szene-mess.mjs && node vektor-mess.mjs && python bild-mess.py`.
Node 24.18.0, Python 3.10.11 / Pillow 10.4.0, `polygon-clipping` 0.15.7, `rbush` 4.0.1, Windows 11,
this laptop. **Nothing in §7 is a number you have to take from me.**

**External, retrieved 2026-07-27:**

- https://pixijs.com/blog/particlecontainer-v8 — *"200,000 [sprites] at 60fps"*, *"1,000,000
  [particles] at 60fps"* on a MacBook Pro M3; supported particle properties *"texture, position,
  anchor, scale, rotation, alpha and color"* **[Herstellerangabe]**
- https://inkarnate.com/ — tiers (Hobby free / Creator $7.99 / Studio $14.99), *"over 23,400 diverse
  assets"* **and** *"30K+ HD Art Assets"* on the same page, *"Export at 2K / 8K / 16K (Beta)"*,
  *"2K / 4K Editor Resolution"*, commercial use on Studio. Retrieved via the `r.jina.ai` text proxy.
  **[Herstellerangabe, and internally inconsistent — quote as a range]**
- https://loreteller.com/learn/inkarnate-layers-guide/ and
  https://loreteller.com/learn/inkarnate-blending/ — Background/Foreground/Top brush sub-layers,
  softness/opacity/blend modes, stamp *flatten* semantics *(third-party tutorial site; consistent with
  the vendor's own feature pages, but not first-party)*
- https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/ — *"Safari simply cannot draw large
  canvas elements. The limit is set at 16.777.216 pixels."*
- https://github.com/wojtekmaj/react-pdf/issues/1149 — the same cap reproduced in the wild on iOS
- https://github.com/jhildenbiddle/canvas-size — the library that exists **because** browsers give no
  way to query their own canvas limits; per-browser results are behind a docsify SPA and were **not**
  retrieved *(see §9.6)*
- https://issues.chromium.org/issues/40349850 — Chromium's canvas dimension ceiling
- `polygon-clipping` (MIT, Martinez–Rueda) and `rbush` (MIT) — installed and measured, not merely cited

---

*RB-20b. Der Schmied's answer to „gottlos schwierig": the forge is hot enough. Thirty-seven days buys
the machine. What it does not buy is the thousands of small drawings that make a map look like a place
somebody loved — and that is the only line in this document with no number under it. Build the
place-layer, draw a hundred good things, and refuse the war over the other twenty-three thousand.*

> *Der Stempel ist ein Wort, die Fläche ist ein Satz,*
> *und beide finden Platz in einer Zeile Code.*
> *Was teuer bleibt, ist nicht der Algorithmus —*
> *es ist die Hand, die tausend Bäume zeichnet.*
