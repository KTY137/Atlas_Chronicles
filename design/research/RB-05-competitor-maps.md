# Competitor Map Technology

Project Chronicle research brief **RB-05**. Scope: **how the competition renders and handles maps
specifically** — the benchmark stakeholder requirement K5 must beat ("wir wollen das nur in besser").
Accessed: **2026-07-26**. Companion to RB-01-* (per-product platform briefs) and RB-02 (engine/asset
feasibility). Claims from training memory rather than a fetched source, or where sources conflict, are
marked *(uncertain)*.

## Executive summary of the field

Four architectural families exist, and they trade against each other predictably:

| Family | Examples | What it buys | What it costs |
|---|---|---|---|
| Browser 2D bitmap + WebGL lighting | Foundry, Roll20, Let's Role, Owlbear | Runs anywhere, any art asset works | Map is one giant texture; animation = video; weak-laptop cliff |
| Native 2D (Unity) | Fantasy Grounds Unity | Stable perf, offline | Install required, dated feel, slow iteration |
| Native 3D | TaleSpire (Unity), Project Sigil (UE5) | Genuinely beautiful, real elevation | Closed asset pipeline; Sigil is being **shut down** |
| Deliberately no tactical map | Alchemy RPG | Zero prep, cinematic mood | Loses the tactical audience |

Two findings dominate the strategic read:

1. **Project Sigil — Wizards of the Coast's Unreal Engine 5 3D VTT — is dead.** Development was
   halted in 2025 with reportedly ~90% of the team laid off, and servers close at the end of
   **October 2026**
   (https://www.belloflostsouls.net/2025/10/dd-wotc-officially-sunsets-project-sigil-servers-closing-in-2026.html,
   https://www.enworld.org/threads/project-sigil-3d-virtual-tabletop-finally-laid-to-rest.715907/).
   The 2D, browser-based **D&D Beyond Maps continues to be developed**
   (https://www.dndbeyond.com/posts/1918-sigil-and-d-d-beyond-maps-what-are-they-and-how-do).
   This is the strongest available evidence for our browser-first invariant: the best-funded
   game-engine VTT on the market could not sustain the content pipeline a 3D engine demands, while
   the boring 2D browser product survived. K5(c)'s "UE5 etc." question has an empirical answer.
2. **Nobody owns the whole map stack.** Foundry owns lighting/vision *semantics* and now elevation;
   Owlbear owns *renderer engineering* (GPU fog, tiled streaming, mobile); Dungeon Alchemist owns
   *generation quality*; TaleSpire owns *visual wow*. No product combines them, and each has a
   documented, quotable weakness. That gap is the attack surface.

---

## Per-competitor teardown

### Foundry VTT (v14, current stable 14.359, released 2026-04-01)

- **Rendering tech:** **PixiJS** (WebGL) is the canvas; PixiJS "powers FoundryVTT's canvas" and
  provides "its lighting renderer and many other Scene features". Also ships **GreenSock** for
  Pixi-object animation and, as of v14, **Anime.js** for timeline animation
  (https://foundryvtt.com/article/frameworks/, https://foundryvtt.com/article/year-in-review-2026/).
  The canvas is a tree of **groups** (stage → primary/interface/etc.); most layers draw into the
  interface group, weather draws into the primary group
  (https://foundryvtt.wiki/en/development/api/canvas).
- **Critical technical-debt fact:** v13 was *supposed* to migrate **PixiJS v7 → v8** and the team
  abandoned it mid-cycle: the migration would be "far more sweeping and disruptive than we had
  planned" for the module developer community, and they explicitly acknowledge the resulting
  lingering technical debt (https://foundryvtt.com/article/year-in-review-2025/). So the market
  leader is on a **WebGL-era renderer it cannot easily replace, because its own module ecosystem is
  the anchor.** WebGPU appears in v14 notes only as a future consideration
  (https://foundryvtt.com/article/year-in-review-2026/). *This is the single most exploitable
  structural weakness in the field.*
- **Lighting/vision model:** Multi-stage WebGL compositing using **ephemeral textures discarded per
  frame**; a `LightingLayer` with GPU shaders for coloration and animation (torch/flicker, chroma,
  vortex using noise textures), adaptive-luminance/halo/color-burn coloration modes. Line of sight
  is computed by a **`ClockwiseSweepPolygon`** intersecting rays against wall segments. Lights have
  separate `dim`/`bright` radii, emission angle, and `darkness.min`/`darkness.max` activation
  thresholds; sources can emit **darkness** (`isDarkness`), and **v13 added a priority system** so
  competing light/darkness sources resolve deterministically
  (https://deepwiki.com/foundryvtt/foundryvtt/3.3-lighting-system,
  https://foundryvtt.com/article/year-in-review-2025/).
- **Wall system — the richest in the market.** Six wall types (Normal, Terrain, Invisible, Ethereal,
  Door, Secret Door) with **four independent perception channels** (movement, light, sight, sound),
  each settable to None / Normal / **Limited** / **Proximity** / **Reverse Proximity**, plus
  **directional (one-way) walls** and an **Attenuation** option for gradual rather than binary
  falloff. Doors have Closed/Open/Locked states, swing/slide/swivel/ascend/descend animations, sound,
  and per-role permissions. Authoring: chaining (Ctrl-drag), sub-grid snapping (1/4 at 50px, 1/8 at
  100px, 1/16 at 200px), clone, copy/paste, Alt-click to select a connected structure, multi-select
  bulk edit. **No stated wall-count limit or performance guidance in the official article**
  (https://foundryvtt.com/article/walls/). Terrain walls give "see past one, not two" semantics.
- **Grid:** Square, **Gridless**, and four hexagonal varieties (even/odd columns flat-top, even/odd
  rows pointy-top). v12 added `SquareGrid#diagonals` + a world-level diagonal rule setting so systems
  stop monkey-patching the grid class, a **dedicated grid shader** (solid/dashed/dotted lines;
  square/diamond/round points; configurable thickness), and made large-token centers the hex centroid
  (https://foundryvtt.com/releases/12.316,
  https://github.com/foundryvtt/foundryvtt/discussions/10184).
- **Elevation:** **Scene Levels became a core v14 feature** (April 2026) — multiple stacked images at
  defined elevations inside one Scene; walls and lights can be level-specific or shared; vision,
  movement, and combat work across levels; stairs/ladders are Regions with a **Change Level**
  behavior. Foundry's own dev quote: "We had some challenging problems to solve — particularly around
  vision, lighting, and occlusion." **Scene Regions (V2)** now act as the 3D elevation counterpart to
  Walls, define **Surfaces** for tile occlusion, gained Emanation/Ring/Grid-Space shapes, can attach
  to tokens, and **absorbed Measured Templates**
  (https://foundryvtt.com/releases/14.359, https://foundryvtt.com/article/year-in-review-2026/).
  Note the timeline: for ~5 years elevation was **module territory** (TheRipper93's *Levels*,
  caewok's *Elevated Vision*, *Multilevel Tokens*), and the old module hung level logic on tiles
  (https://foundryvtt.com/packages/levels/, https://github.com/caewok/fvtt-elevated-vision).
  The classic module-era limitation is instructive: **"Fog in Foundry is unidimensional… if you
  explored any elevation, all areas in that zone (independent of elevation) will also be explored"**
  — explore floor 1, and floor 2 is pre-revealed (https://wiki.theripper93.com/levels).
  Whether core v14 fully fixes per-level fog is **not confirmed in the release notes I fetched**
  *(uncertain — verify before citing to Kaya)*.
- **Animated / video maps:** Supported via WebM/MP4/M4V for maps, tiles, and backgrounds; Foundry
  "loosely recommends keeping video map file sizes around 50MB or less" for distribution
  (https://foundryvtt.com/article/media/). **This is a documented pain point:** open issue #10343
  requests "an option to substitute a static image for Scenes using a video background… served to
  clients using a low performance mode", because animated WebM maps "severely impact performance on
  older hardware" (https://github.com/foundryvtt/foundryvtt/issues/10343). v13 added **KTX2
  compressed textures**, and Foundry's own premium content was *downscaled* (Vault of Aten to 8192px)
  "for lower-spec GPUs" (https://foundryvtt.com/article/year-in-review-2025/).
- **Token animation:** Core supports animated (video) token art. **Spritesheet** animation is *not*
  core — it needs the community module *Dylan's Animated Tokens* (directional spritesheets, v13/v14,
  supports Nihey and Universal LPC formats), whose own README warns "Universal LPC sheets may cause
  performance degradation if you use a large number in the same scene"
  (https://foundryvtt.com/packages/dylans-animated-tokens,
  https://github.com/righthandofvecna/dylans-animated-tokens).
- **Weather/particles:** Core has a weather layer; the de-facto standard is the **FXMaster** module
  (rain/snow/clouds/fog, crows/bats/spiders, plus filter effects: color overlay, underwater,
  lightning). Its 7.2.0+ release was a **performance overhaul** binding particle density to Foundry's
  client Performance Mode setting (Maximum 100% / High 75% / Medium 50% / Low 25%), with tiles able
  to "Restrict Weather" and Regions to "Suppress Weather"
  (https://github.com/gambit07/fxmaster). A sibling module exists specifically "to prevent adding
  weather effects in very large scenes that may cause lag"
  (https://foundryvtt.com/packages/weatherfx). v14 added a **core Particle Generator API**
  (shape sampling + mask config) and a **Screen Shake** API
  (https://foundryvtt.com/releases/14.359).
- **Performance limits users report:** Forge (hosting provider) forums document lag with "8K"
  high-resolution maps combined with dynamic lighting and animated tiles; "large map files (200 MB)
  are considered unusable… smaller files around 10–20 MB being more practical"; token movement and
  journal editing degrade over a session
  (https://forums.forge-vtt.com/t/seeking-advice-on-optimizing-performance-for-large-worlds-in-forge-vtt/162984,
  https://forums.forge-vtt.com/t/incredible-lag-and-unresponsive-game-world/76025).
  A whole class of modules exists purely to trade vision quality for FPS: *Token Vision Tweaks*
  ("allow trading quality for performance, or vice-versa", plus a fix for tokens seeing through
  distant walls on **large open maps**), *Perfect Vision*, *Alternative Token Visibility*
  (https://github.com/ruipin/fvtt-token-vision-tweaks,
  https://github.com/dev7355608/perfect-vision, https://github.com/caewok/fvtt-token-visibility).
- **Top map complaints:** (a) no native touch support — needs **TouchVTT**, which "can go a bit
  jittery when it tries to distinguish between pan and zoom gestures", and *Zoom/Pan Options*, whose
  known bug is asymmetric vertical/horizontal touchpad scroll
  (https://github.com/Oromis/touch-vtt, https://foundryvtt.com/packages/zoom-pan-options);
  (b) animated maps punish the weakest player's hardware with no automatic mitigation;
  (c) map prep (walls, lights) is skilled manual labor; (d) elevation was module-dependent for years
  and third-party write-ups still describe migrating off *Levels*
  (https://foundrymods.com/how-to/foundry-v14-levels — *third-party SEO site, treat as weak source*).

### Roll20

- **Rendering tech:** Being rewritten. Roll20's own words about the legacy engine: it "utilizes an
  older rendering engine that was created more than a decade ago", built for early-2010s browsers,
  combining **"software rendering with some WebGL sprinkled on top for things like dynamic
  lighting"**, on a codebase "written in 3 or 4 different libraries with different coding styles".
  **Project Jumpgate** ("Engine Mark II") aims to "move as much of the rendering work as possible to
  hardware acceleration and shaders" and says "as new web technology such as WebGPU becomes
  widespread, we'll be ready" (https://blog.roll20.net/posts/building-a-better-vtt/).
  Their published stress-test numbers: 100 animated dragons — CPU/GPU from **400% → 50%**; map
  panning under half the previous CPU; memory **4GB → 1.5GB**. The specific renderer library is not
  disclosed *(PixiJS plausible but unconfirmed — uncertain)*.
- **Lighting/vision model:** "Updated Dynamic Lighting" (UDL) replaced Legacy DL. Walls are drawn as
  **vector paths on a dedicated Dynamic Lighting layer**; lights are token properties; features
  include night vision, colored lights, bright/low light, daylight mode, directional light
  (https://pages.roll20.net/dynamic-lighting). Documentation is behind a Zendesk that returns HTTP
  403 to automated fetches, so tier claims below come from the wiki and forums.
- **Paywall:** Dynamic Lighting is a **Plus-tier feature**, gated on the *game creator's*
  subscription (players inherit it); marketplace modules shipping DL data need Plus/Pro for that data
  to work (https://wiki.roll20.net/Plus_Subscription, https://wiki.roll20.net/Pro_Subscription).
  Roll20's own marketing page is self-contradictory — the tier table lists Dynamic Lighting on Free,
  Plus, *and* Pro while the headline says "unlock line-of-sight lighting by upgrading your free
  account to a Plus or Pro subscription" (https://pages.roll20.net/dynamic-lighting) *(the practical
  answer is Plus+; the contradiction is itself a UX complaint)*.
- **Hard numeric limits (concrete and quotable):**
  - Upload size: **20MB Free / 50MB Plus / 100MB Pro**.
  - **Any image over 10,000px in a dimension is force-downscaled** to 10,000
    (https://app.roll20.net/forum/post/11769606/there-is-a-10-000-px-dimension-limit-regardless-of-mb-size).
  - Page canvas is sized in **70px increments**; **anything over 80×80 units triggers a
    "map may be too big" warning**.
  - Advanced Fog of War (Explorer Mode) has a **maximum cap of 50,000 cells**, with a Page Settings
    warning when exceeded (https://wiki.roll20.net/Advanced_Fog_of_War).
  - Official guidance: upload static images at **72–150 PPI**; **slice very large maps into 2–6
    pieces** and reassemble on the page; **3,500×3,500px is the "magic number"**; fully animated maps
    "should not exceed 2k resolution"; prefer WebM
    (https://wiki.roll20.net/Best_Practices_for_Files_on_Roll20).
  - Every upload is auto-resized to **four variants (thumb/med/max/orig)** used at different zoom
    levels — a genuinely good idea worth stealing.
- **Elevation:** None. No elevation model, no multi-floor scene concept *(uncertain only as to
  whether an experimental Jumpgate feature exists; nothing found)*.
- **Performance limits users report — the most extensively documented complaint set in the market:**
  - "even just 5 light sources causing things to freeze and token movement taking 10–15 seconds"
    (https://app.roll20.net/forum/post/1067149/dynamic-lighting-lag-issues.).
  - **Freehand drawing on the DL layer is a known lag cause** because Roll20 uses vector graphics:
    "freehand drawings are made up of dozens or hundreds of tiny lines, making the DL layer several
    hundred or even thousands of times 'larger' than it should be"
    (https://app.roll20.net/forum/post/5655289/unbearable-lag-when-working-with-any-form-of-dynamic-lighting).
  - A user on a **GTX 1660 Ti + Core i5** reported the *new* DL made the platform "unpliable" while
    Legacy DL was smooth; most lighting settings either worsened it or did nothing; the problem hit
    **the GM specifically, not the players**; the accidental fix was toggling browser hardware
    acceleration off and on. **No official Roll20 staff response in the thread**
    (https://app.roll20.net/forum/post/10705870/new-dynamic-lighting-lags-horribly).
  - Community mitigation advice is entirely subtractive: fewer walls, fewer lights, fewer
    vision-enabled tokens, smaller maps.
  - Browser extensions (LastPass named) and disabled hardware acceleration are common causes; a
    thread exists titled "Dynamic lighting is causing my browser to crash"
    (https://app.roll20.net/forum/post/2683572/dynamic-lighting-is-causing-my-browser-to-crash).
- **Top map complaints:** (1) performance, overwhelmingly; (2) **Explorer Mode reveal is shared, not
  per-player** — "whenever one player reveals the fog, all players can now see through the fog, with
  no way to turn this back" to the per-player behaviour users had before
  (https://app.roll20.net/forum/post/10373882/explorer-mode-revealing-tokens); (3) no per-token vision
  *range* limiting — an open feature request
  (https://app.roll20.net/forum/post/11706814/dynamic-lighting-limit-vision-range-slash-distance-slash-radius-per-token);
  (4) the paywall on the single feature that makes maps feel alive; (5) the 10,000px / 80×80 ceilings.

### Fantasy Grounds Unity

- **Rendering tech:** Unity-based native client (not browser). Its LoS/dynamic lighting is the
  headline difference from Fantasy Grounds Classic.
- **Lighting/vision model:** LoS is authored as **occluders on a dedicated LoS metadata layer**,
  separate from image layers, with occluder *types* — **Wall, Terrain, Door** — and modes
  Selection/Edit, Add Line, Add Rectangle, Add Ellipse. Terrain semantics: "players outside a terrain
  section can see the entire contents of the first terrain their vision reveals but cannot see past
  it, while players inside can see out in every direction"
  (https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996640584/Map+Line+of+Sight+Style+Guide).
  Overlapping walls auto-insert intersection points, which can then be deleted.
- **Image layers:** Multi-layer image model with LoS as metadata that can be **exported separately as
  XML** by right-clicking a layer in the image data panel, and that travels automatically with module
  exports
  (https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996645681).
  This makes FGU the best-served target for third-party LoS pipelines (see `uvtt2fgu`,
  https://github.com/Imagix/uvtt2fgu).
- **Grid & elevation:** Square and hex grids. **No elevation/multi-floor model** *(uncertain)*.
- **Animated maps / token animation:** Not a marketed capability *(uncertain — treat as
  absent/weak)*.
- **Top map complaints:** the separate metadata layer is confusing — "LoS occluders are created on a
  separate metadata layer, which can be confusing for users"; and forum threads exist about
  "occluder layers with no assigned image layer"
  (https://www.fantasygrounds.com/forums/archive/index.php/t-79172.html). Broadly: capable model,
  dated authoring UX, native install required.

### Owlbear Rodeo (2.x) — the renderer to actually respect

- **Rendering tech:** **"Warp Core"**, a purpose-built renderer shipped in 2.3, described as "built
  from the ground up to provide outstanding speed, cross-platform compatibility and beautiful visuals
  for a modern VTT experience". Uses a **tiled renderer for large maps and images** ("quicker loading
  and better performance for larger images"), plus **spatial indexing and GPU instancing**. Claimed
  **50–80% faster rendering for scenes with large numbers of drawings**
  (https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/).
- **The mobile proof point:** a **137-megapixel map rendered on an iPhone 14 Pro Max**. Stated
  ceilings for subscribers: **up to 144 megapixels, 50MB per file**
  (https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/) *(the subscription tier name — read
  as "Bestling" in the release notes — is uncertain; the numbers are the point)*.
- **Lighting/vision model:** Warp Core exposes **built-in dynamic fog primitives rendered on the
  GPU**: "All the dynamic fog in Warp Core is processed in parallel on the GPU which means it should
  support larger scenes and can be updated in real-time as the tokens move through the world."
  Implemented with **vertex and fragment shaders composited back into the scene**, with **two
  rendering paths**: the **fast path is selected for any light with `sourceRadius === 0`, which
  disables soft shadows but "can handle many more lights"**; the quality path gives soft shadows and
  feathered edges. There is a **secondary light mode** for conditional NPC light visibility, and
  **real-time collision** so "tokens get stopped by walls and players can't accidentally move to a
  room they haven't unlocked yet"
  (https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-week-day-3/,
  https://docs.owlbear.rodeo/extensions/reference/dynamic-fog/).
  **The explicit soft-shadow-vs-light-count switch is the cleanest performance/quality UX decision
  anyone in this market has shipped, and it is the model we should copy.**
- **What it deliberately omits:** "Owlbear does maps, tokens, fog, and dice, and nothing else, so your
  character sheet lives somewhere else" — no character sheets, no initiative tracker, no token
  transformation effects, no account required to join a room
  (https://startplaying.games/blog/posts/owlbear-rodeo-how-to,
  https://www.diceoutpost.com/guides/new-players-guide-to-owlbear-rodeo/).
- **Extension architecture:** Dynamic fog itself ships as an **extension, not core** — the official
  *Dynamic Fog* extension ("Add walls, doors and lights for a simple dynamic fog experience") sits
  alongside community alternatives, notably **Smoke & Spectre!** which advertises **"Per-Player fog
  and 'Spectre' tokens"** — i.e. the per-player reveal Roll20 users are begging for exists here, as
  third-party code (https://extensions.owlbear.rodeo/tag/fog). Extension devs can "program shaders
  directly into the Warp Core pipeline".
- **Other map features:** six procedurally-generated weather conditions with 600+ customization
  options; animated `.webm` token support demonstrated
  (https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/).
- **Grid & elevation:** Grid support present; **no elevation model documented**; no grid-type or
  elevation constraints stated in the release notes *(uncertain)*.
- **Top map complaints:** by design, the deep features (per-player fog, richer wall semantics,
  elevation, initiative-integrated map) are absent from core and fragmented across extensions of
  varying quality; not self-hostable *(uncertain — no self-host offering found)*.

### Alchemy RPG — the "no map" bet

- **Model:** A **cinematic** VTT. "Instead of an overwhelming focus on grids and maps like traditional
  VTTs, Alchemy brings your games to life with music, animated environments, overlays" — a scene is
  "dominated by an evocative art piece that's brought to life by particle effects like wind gusts or
  fae lights" (https://startplaying.games/blog/posts/alchemy-vtt-what-how-to,
  https://alchemyrpg.com/). It explicitly supports **theatre of the mind**
  (https://startplaying.games/blog/virtual-table-tops/the-new-players-guide-to-alchemy-rpg).
- **What that buys them:** GM prep collapses to "pick art + music". No walls, no lights, no fog to
  author. Consistent performance because there is no per-frame LoS computation on a huge bitmap.
  Reviewers describe it as prioritising "showmanship over tactical combat functionality" as a
  **deliberate design choice** (https://techraptor.net/tabletop/interviews/alchemy-rpg-vtts-and-focus-on-roleplaying).
- **What it costs:** it forfeits the tactical audience. Tactical Mode with a map and grid exists and is
  "a click away", but is not the product's centre of gravity.
- **Rendering tech:** not publicly documented *(unknown)*.
- **Lesson for us:** Alchemy proves there's a large, underserved appetite for **map-as-mood** rather
  than map-as-grid. A "Cinematic scene" mode — full-bleed art, particles, ambience, no grid, one
  click from the tactical scene — is cheap for us (we already need particles for K5c) and steals
  Alchemy's whole differentiator as a *mode* rather than a *product*.

### TaleSpire

- **Rendering tech:** Unity, deliberately on the **built-in render pipeline (BIRP)** rather than SRP —
  "plans to stick with BIRP until they outgrow it". Uses **`BatchRendererGroup`** so batches don't need
  per-frame updates, **`DrawMeshInstancedIndirect`** for high-poly meshes, and **lower-poly occlusion
  meshes for shadows and occlusion culling**; Unity's job system for further gains; Unity Physics
  (stateless, reloads all rigid bodies each frame)
  (https://bouncyrock.com/news/articles/talespire-dev-log-299,
  https://bouncyrock.com/news/articles/talespire-dev-log-193).
  Stated goal: "making the game run well on many machines by avoiding making board objects
  (tiles/creatures/props) more performance hungry than necessary."
- **Why beautiful maps are the entire pitch:** the map *is* the product. Building is done with
  **slabs** — copy-pasteable, shareable chunks of built map — which created a real sharing economy
  (community slab/board archives, e.g. https://talestavern.com/talespire-slab-archives/). This is the
  single best UX idea in competitor map building: **a map fragment is a first-class, shareable,
  reusable object.** Our WFC tile/pattern library should be explicitly slab-shaped.
- **Asset pipeline:** originally closed. **Official modding tools for custom miniatures** now exist,
  multi-asset-pack support was added as the prerequisite for modding, and community plugins
  (*Custom Assets Library Plugin* on Thunderstore) bridge custom assets into vanilla clients
  (https://talespire.thunderstore.io/package/PluginMasters/Custom_Assets_Library_Plugin/,
  https://bouncyrock.com/news/articles/talespire-dev-log-274).
  **HeroForge integration is the official custom-mini route but requires purchasing 3D Digital
  Downloads, and minis cannot be altered after purchase**
  (https://steamcommunity.com/app/720620/discussions/0/3773490640558164195/).
  Mod support for arbitrary custom meshes remained a top community feature request
  (https://feedback.talespire.com/p/mod-support-adding-custom-meshes-assets).
- **Elevation:** native and free — it is actually 3D.
- **Top map complaints:** you can only build from assets they ship (or buy via HeroForge); it is a
  native Steam client, not browser; system-agnostic rules support is thin. **The asset-pipeline
  bottleneck is exactly the trap K5(e) is trying to avoid** — which is why CC0/CC-BY tile libraries
  matter (Kenney's isometric dungeon/library/prototype tile packs are **CC0 1.0**, "allowed to use
  these game assets in any project including commercial ones… attribution is not required":
  https://kenney-assets.itch.io/isometric-dungeon-tiles).

### Let's Role — the most honest published limits in the industry

- **Rendering tech:** browser, **requires WebGL** for dynamic lighting.
- **Authoring:** dynamic lighting is toggled per scene from the Scene dock, which reveals a Dynamic
  Lighting dock; walls drawn press-move-release, **SHIFT+click for chain walls**; lights placed from
  templates including "animated or with special effects" options.
- **Vision model:** **360° vision only** — no directional/cone vision. GMs see *all* characters'
  fields of view simultaneously; players see only their own.
- **Published hard caps — quote these to Kaya as the bar to clear:**
  - Recommended scene size **~5000×5000px**, maximum **10000×10000px** "for well-configured systems".
  - **Up to 200 doors, 250 lights and 500 walls.**
  - Universal VTT import: **`.dd2vtt`, max 16 MB, static backgrounds only.**
  - Dynamic lighting "currently unavailable for crafts" (their extension format).
  (https://lets-role.com/page/dynamic-lighting-faq?locale=en)
- **Elevation / animated maps:** none / not supported on import.
- **Top map complaints:** the caps themselves; 360°-only vision; UVTT import is static-background-only.

### D&D Beyond Maps and Project Sigil

- **Project Sigil:** **Unreal Engine 5**, 3D, official D&D, free — "Powered by Unreal Engine 5, Sigil
  provides intuitive world-building and mini-making tools, and a connected 3D gameplay experience"
  (https://www.dndbeyond.com/posts/1918-sigil-and-d-d-beyond-maps-what-are-they-and-how-do).
  **Outcome: development halted 2025, ~90% of the team laid off, servers close end of October 2026**
  (https://www.belloflostsouls.net/2025/10/dd-wotc-officially-sunsets-project-sigil-servers-closing-in-2026.html).
  WotC's stated reason: they "couldn't sustain the level of ongoing development support that Sigil —
  or their community — deserved."
- **D&D Beyond Maps:** 2D browser VTT, "streamlines D&D play with automated rules and helpful UI",
  **explicitly unaffected by the Sigil sunset and still actively developed**
  (https://www.dndbeyond.com/posts/1918-sigil-and-d-d-beyond-maps-what-are-they-and-how-do).
  Rendering internals are not publicly documented *(unknown)*. Its map strength is *content*: official
  adventure maps arrive pre-configured, which is a licensing advantage we cannot and should not chase.
- **Lesson:** map fidelity was never Sigil's problem. **Content pipeline cost and sustainability
  were.** Any Chronicle plan whose map beauty depends on us commissioning bespoke 3D art has the same
  failure mode. WFC over licensable 2D tile atlases (K5d/K5e) is the structurally cheaper bet, and we
  should say so explicitly in round 1.

---

## Map tools ecosystem

The market's actual map *creation* happens outside the VTTs, and the interchange format is the seam
we can exploit.

### The de-facto standard: Universal VTT (`.dd2vtt` / `.uvtt`)

- "A VTT-agnostic export format (`.dd2vtt`) originally added to… Dungeondraft that includes not only
  the map image but also light/vision blocking information (walls and such), light sources on the
  maps, and **portals (doors & windows)**" (https://arkenforge.com/universal-vtt-files/).
- Semantics: **yellow lines = walls** (block sight+movement); **blue lines = portals** (block
  sight+movement but can be unlocked)
  (https://dungeondraft-encyclopaedia.gitbook.io/guide/all-the-tools/design-tab/portal-tool,
  https://dungeondraft-encyclopaedia.gitbook.io/guide/final-steps/exporting-your-map/universal-vtt).
- Importer support is uneven and often community-maintained: Roll20 needs a **Pro-only API script**
  (`UniversalVTTImporter`, which only recently gained window/door support and still has bug threads
  like "all my windows are doors")
  (https://wiki.roll20.net/Script:UniversalVTTImporter,
  https://app.roll20.net/forum/post/11486629/universalvttimporter-import-problem-all-my-windows-are-doors-request-for-help);
  FGU needs the third-party `uvtt2fgu` converter (https://github.com/Imagix/uvtt2fgu);
  MapTool documents its own import path (https://wiki.rptools.info/index.php/Import_Dungeondraft_Map);
  Let's Role caps it at 16MB, static only.
- **Chronicle implication:** shipping a *first-class, lossless, GM-visible* UVTT importer (walls,
  doors, windows, lights, grid alignment, resolution) is a **days-to-weeks** win that instantly makes
  us the best home for every map the market already sells. Nobody does this cleanly.

### Dungeondraft

- Desktop 2D map editor; the origin of the UVTT format; strong asset-pack ecosystem.
- **Licensing landmine:** default Dungeondraft assets are reported to be **CC BY-NC 4.0 — no
  commercial use even if you paid for asset packs**, with the author declining exceptions; commercial
  work requires explicitly commercial third-party asset packs, and the asset manifest inside a
  `.dungeondraft_map` file can be inspected to check
  (https://2minutetabletop.com/faq/map-commission-license/,
  https://azukailgames.itch.io/azukail-games-paper-and-scrolls-collection-for-dungeondraft-commercial-use/purchase)
  *(uncertain — sourced from an asset creator's FAQ and store pages, not Dungeondraft's own EULA;
  **verify against the official EULA before any commercial dependency**)*.

### Dungeon Alchemist — the direct K5(b)/K5(d) benchmark

- **Generation approach, and it is the important detail:** "The backbone of Dungeon Alchemist is a
  procedural content generation algorithm" that **learns a logical structure from a curated set of
  hand-made example rooms** — doors, windows, furniture, lights — then places objects "according to
  where it thinks it has to go" (https://dungeonalchemist.fandom.com/wiki/Dungeon_Alchemist_AI,
  https://www.dungeonalchemist.com/faqs).
- **Explicitly not generative AI:** "Dungeon Alchemist does not use any generative AI/LLMs for its
  room generation. All procedural algorithms are developed in-house and only use content generated by
  our own, paid artists" (https://store.steampowered.com/app/1588530/Dungeon_Alchemist/). Their
  marketing leans on this. **We should adopt the same posture:** WFC + hand-authored tile constraints
  is a *provenance and licensing* story as much as a technical one, and it aligns with the pack
  invariant that AI is optional and always draft.
- **Workflow:** pick a theme, **draw rooms, and the tool fills tiles, doors, windows, objects and
  lighting automatically**. 6000+ objects. Still **Early Access, expected to exit late 2026**.
- **Export:** "Foundry, Roll20 and FantasyGrounds are currently supported" plus printable images
  (https://www.dungeonalchemist.com/faqs). Minimum spec cites 8 GB RAM and older GPUs
  (Steam page).
- **What it does not solve:** it is a **separate paid desktop application**. Generation is
  export→import→re-fix — the round trip is the wound. Commercial licensing of exported maps is **not
  stated in the FAQ** *(unknown — must be verified if we ever bundle or recommend it)*.

### Inkarnate

- Browser-based fantasy/world map maker. Free tier has **limited export resolution**; **Pro
  (~$5/mo, ~$25/yr)** unlocks full asset library, high-resolution export, custom styles; **commercial
  use is attached to the Studio tier**, and maps exported while Studio was active reportedly remain
  commercially licensed after downgrade
  (https://www.ttrpgstack.com/tools/inkarnate/, https://inkarnate.com/) *(uncertain — sources
  conflict on which tier carries the commercial licence and the plans have been restructured
  repeatedly; verify on inkarnate.com before citing)*.
- Aimed at **world/region maps**, not walled battlemaps — it emits no wall/light metadata.

### Watabou (Procgen Arcana) and DunGen

- **Watabou** — a suite of free browser procedural generators (One Page Dungeon, Cave Generator,
  City/Village, Dungeon) at https://watabou.github.io/dungeon.html and
  https://watabou.itch.io/one-page-dungeon. Instant, delightful, and **stylised line-art output with
  no VTT wall data**; VTT export with walls has been a recurring community request rather than a
  shipped feature. Proof that *instant* generation delights users even at low fidelity.
- **DunGen** (https://dungen.app/faq/, https://dungen.app/walls/) — the closest existing thing to
  "generate a *playable* map":
  - Generates high-resolution dungeons "ready to import into Roll20, Foundry VTT, Fantasy Grounds,
    Astral or any other virtual tabletop".
  - **Emits wall/lighting metadata per target**: Roll20 wall coordinates via API (needs **Pro** + the
    Walls script), **Foundry `.json` scene files with walls included**, and **FGU `.xml` Line of Sight
    Definition files**.
  - Tile resolution **70px** (Roll20/Astral default) up to **140px**.
  - Patreon tiers: Free → **Dungeon Designer ($3+)** for wall/DL export → **Dungeon Architect ($10+)**
    for 140px + tilesets → **Dungeon Merchant** for a "commercial license to use content generated by
    any of DunGen's tools in your own products". A Foundry module exists to pull DunGen dungeons
    directly (https://github.com/mouse0270/foundryvtt-dungen).
  - **Chronicle implication:** DunGen has *proved the demand* for generation-with-walls and monetised
    it, but it is a bolt-on with a per-VTT export matrix. Doing this natively — generation that
    already knows about our wall, light, and elevation model, with no export step — is exactly the
    "one flow" K5(b) asks for.

### WFC feasibility note (supports K5(d))

WFC is a solved, well-documented, browser-viable technique: constraint propagation over tile adjacency
via **edge "sockets"** (matching sockets connect), with **backtracking and checkpointing** to recover
from contradictions rather than regenerating from scratch; it shipped commercially in *Caves of Qud*
(GDC talk: https://gdcvault.com/play/1026263/Math-for-Game-Developers-Tile) and has many JS/Canvas
implementations (https://lumitree.art/blog/wave-function-collapse,
https://blog.shaankhan.dev/implementing-wave-function-collapse-binary-space-partitioning-for-procedural-dungeon-generation/,
https://christianjmills.com/posts/dungeon-generation-via-wavefunctioncollapse-notes/). The common
production pattern is **hybrid**: a higher-level layout pass (e.g. BSP or hand-drawn room outlines,
which is essentially Dungeon Alchemist's "you draw, it fills") followed by WFC for detail fill.
Kaya's instinct is sound; the sequencing advice is *layout first, WFC as the detail filler*, because
pure WFC struggles to produce readable, navigable dungeon topology on its own.

---

## Where maps hurt users most today

Ranked by weight of documented user pain:

1. **Performance collapse when lighting/vision gets interesting.** Roll20 forums are a graveyard of
   this: 5 lights freezing a table; 10–15s token moves; a GTX 1660 Ti calling it "unpliable"; all
   community advice being "have less of everything". Foundry's version is subtler but real: 8K maps
   plus animated tiles plus dynamic lighting, and an entire module genre devoted to trading vision
   accuracy for FPS. **The map is the hot path and everyone loses on it.**
2. **The weakest laptop at the table sets the ceiling — and nothing manages that automatically.**
   Foundry issue #10343 is literally a request for per-client static substitution of video maps.
   FXMaster has to hand-implement density scaling against a manual Performance Mode setting. No
   product measures a client and adapts.
3. **Fog of war does the wrong thing socially.** Roll20 made Explorer Mode reveal shared with no way
   back, and users are explicit that this "contradicts the expected per-player vision functionality".
   Foundry only added *shared* fog as an option in v14.359 (i.e. it was per-user and inflexible
   before). Owlbear's per-player fog lives in a *community* extension. Nobody ships both models with
   a clean GM control.
4. **Map prep is skilled manual labour.** Walls, doors, windows, lights — drawn by hand, per map,
   forever. The whole Dungeondraft/DunGen/Dungeon Alchemist/UVTT industry exists to escape this, and
   the escape route is an *export/import round trip* with lossy, community-maintained importers
   ("all my windows are doors").
5. **Elevation is either absent or was a module.** Roll20, Owlbear, Let's Role: none. Foundry: core
   only since April 2026, and the module-era fog-across-elevation bug ("explore floor 1, floor 2 is
   already revealed") shows how deep the assumption of a flat world runs. Only TaleSpire gets it free,
   by being 3D and native.
6. **Hard ceilings that break real maps.** Roll20: 10,000px force-downscale, 80×80 page warning,
   50,000 fog cells, 2k for animated maps, "slice your map into 2–6 pieces". Let's Role: 500 walls,
   250 lights, 200 doors, 16MB UVTT, static only. Foundry: "keep video maps ≤50MB", 200MB maps
   "unusable".
7. **Touch and mobile are an afterthought in the browser products.** Foundry needs TouchVTT, which
   jitters distinguishing pan from zoom. Owlbear is the sole counter-example and it advertises the
   137MP-on-an-iPhone result precisely because it's rare.
8. **Animation is video, and video is expensive.** Animated maps and animated tokens are WebM files
   in every 2D product, so animation cost scales with pixels rather than with the number of animated
   *things*. Spritesheet tokens in Foundry are a community module that warns about degradation at
   scale.
9. **Paywalls on the feature that makes maps feel alive.** Dynamic lighting is Plus-tier on Roll20;
   the DunGen wall export is $3+/mo; UVTT import into Roll20 needs Pro. Our self-hosted, no-feature-
   gating posture is a differentiator on maps specifically, not just on price.

---

## "The same but better" — concrete improvement list

Difficulty: **S** = days, **M** = weeks, **L** = months / a genuine engineering bet.
"Owns it today" = the competitor whose implementation currently sets the bar.

| # | Improvement | Why it matters | Difficulty | Who owns it today |
|---|---|---|---|---|
| 1 | **WebGPU-first renderer with a WebGL2 fallback path**, no legacy plugin API to protect | Foundry publicly abandoned even a PixiJS 7→8 upgrade because its module ecosystem made it "far more sweeping and disruptive"; Roll20 only says it "will be ready" for WebGPU. WebGPU now ships by default in Chrome, Edge, Safari 26 and Firefox 141+ (~70–85% reach, figures vary by source). A greenfield product can take the compute/instancing win *now* — this is a multi-year lead the incumbents structurally cannot close. | L | Nobody. Owlbear's Warp Core is closest in spirit (GPU fog, instancing). |
| 2 | **Tiled, streamed map loading with compressed mip-mapped textures (KTX2/Basis) and pre-generated zoom variants** | Kills every published size ceiling at once: no 10,000px downscale, no "slice your map into 2–6 pieces", no 50MB advisory. Roll20 already generates 4 variants per upload (thumb/med/max/orig) and Owlbear proved 137MP on a phone with tiling — combine both and a 200MB map (today "unusable" on Foundry) opens instantly. | M | Owlbear Rodeo (tiled renderer, 144MP); Foundry (KTX2); Roll20 (zoom variants). |
| 3 | **GPU fog/vision with *both* social models: per-player exploration texture and shared-party mode, GM-togglable per scene**, plus a reveal/hide brush, per-player reveal preview, and undo | The single loudest unmet demand: Roll20 removed per-player reveal with "no way to turn this back"; Foundry only added *shared* fog in 14.359; Owlbear's per-player fog is a community extension. Shipping both models as core, switchable mid-session, with an explicit "what each player currently sees" preview, is a headline feature nobody has. | M | Split: Foundry (per-user), Owlbear ext. *Smoke & Spectre!* (per-player), Foundry v14 (shared). |
| 4 | **Walls arrive for free: first-class lossless UVTT/`.dd2vtt` import (walls, doors, windows, lights, grid alignment) + generator-native walls + assisted auto-walling of plain images** | Removes the biggest prep cost and instantly makes us the best home for every map the market already sells (Dungeondraft, DunGen, Dungeon Alchemist, Arkenforge). Today importers are Pro-gated (Roll20), third-party (`uvtt2fgu`), capped (Let's Role 16MB/static) or buggy ("all my windows are doors"). UVTT import alone is **S–M**; auto-walling a raw uploaded image is the **L** part. | M (UVTT: S) | The *tools* own it (Dungeondraft/DunGen/Dungeon Alchemist). **No VTT does it well natively.** |
| 5 | **Wall/light authoring that is actually fast: room-trace and flood-fill tools, magnetic snap to image edges, and a live "what this token sees" LoS preview while you draw** | Foundry has the best wall *semantics* in the market (6 types × 4 perception channels × None/Normal/Limited/Proximity/Reverse-Proximity, directional walls, attenuation, chaining, bulk edit) but you still place them segment by segment; Roll20's freehand DL paths are a *documented cause of lag*. Match Foundry's semantics, then beat its speed. | M | Foundry (semantics); Dungeondraft (authoring speed). |
| 6 | **Elevation as a first-class scalar on every placeable from day one — with per-elevation fog** | Foundry needed until v14 (April 2026) to make Scene Levels core, and its own devs called vision/lighting/occlusion under elevation "challenging problems"; the module era shipped with fog that was "unidimensional" (explore floor 1 → floor 2 pre-revealed). Roll20, Owlbear, Let's Role, FGU: nothing. Designing elevation into the vision/fog model *before* shipping is far cheaper than retrofitting it — this is the one place where being late to market is an advantage. | L | Foundry (2D, since v14); TaleSpire (real 3D). |
| 7 | **Generation → playable scene in one flow: hybrid layout pass + WFC detail fill, running in-browser, emitting our own walls/doors/lights/elevation directly** | K5(b)+(d) as a shipped feature instead of a round trip. Dungeon Alchemist is a separate €-priced Early-Access desktop app; DunGen is web but exports a per-VTT file matrix; Watabou is instant but emits no wall data. Nobody generates *inside* the VTT and lands a walled, lit, playable scene. Pair it with the pack's location generator so a generated location becomes a generated map. Sequence it Dungeon-Alchemist-style: **GM draws room outlines → WFC fills** (pure WFC produces poor dungeon topology). | L | Dungeon Alchemist (quality); DunGen (web + wall export); Watabou (instant delight). |
| 8 | **Sprite/tile-atlas map rendering with GPU instancing — animation priced per animated *thing*, not per pixel** | Every 2D competitor treats a map as one enormous bitmap, so "animated map" means a WebM whose cost scales with resolution — hence Foundry's ≤50MB advisory, Roll20's "animated maps must not exceed 2k", and open issue #10343 asking to serve players a static image instead. A tile/atlas map animates water, torches and foliage in one instanced draw call, and — critically for **K1** — lets a theme (PixelArt, Cyberpunk) *reskin the same map* by swapping the atlas. This is the "game-engine feel" answer that stays browser-first. | L | TaleSpire (instanced, but 3D + native). Nobody in browser 2D. |
| 9 | **Directional spritesheet token animation, batched — idle/walk/attack states driven by the action log** | Foundry needs a community module (*Dylan's Animated Tokens*) that warns Universal LPC sheets "may cause performance degradation if you use a large number in the same scene"; elsewhere animated tokens are per-token WebM videos. One atlas + one draw call makes 40 animated tokens cheaper than 4 videos, and satisfies K5(c) without touching the fog/lighting hot path. Adopt an existing sheet convention (LPC-style) so the asset ecosystem already exists. | M | Community modules in Foundry; nobody first-class. |
| 10 | **Automatic per-client quality negotiation + a pre-session scene budget lint** | Two halves of the same wound. (a) Measure each client's frame time and *automatically* drop that client to a static map substitute, lower fog resolution, and reduced particle density — the thing Foundry issue #10343 asks for and FXMaster only approximates via a manual Performance Mode setting. (b) Warn the GM *while prepping*: "this scene has 3,900 walls, 60 lights and a 2160p video background; your player on integrated graphics will see ~20fps." Steal Owlbear's honest quality switch (`sourceRadius === 0` → no soft shadows, many more lights) and expose it as a named GM choice rather than a hidden heuristic. | M (lint: S) | Foundry (manual perf mode); Owlbear (explicit quality/count tradeoff). Automatic: **nobody**. |
| 11 | **Touch and mobile as a shipped, tested target: momentum pan, pinch-zoom, large hit targets, one input abstraction** | Foundry has *no native touch support* — it needs TouchVTT, which "can go a bit jittery when it tries to distinguish between pan and zoom gestures". Owlbear is the only product that treats this as a feature and advertises 137MP on an iPhone. Given the accessibility invariant and the "table-usable" clause in K3, a tablet at the physical table is a real use case, and keyboard-navigable map controls come from the same input abstraction. | M | Owlbear Rodeo. |
| 12 | **Offline/degraded-network resilience: browser-side asset cache (Cache API/OPFS), optimistic token movement with server reconciliation, LAN-first self-host** | Self-hosting means LAN play and flaky home uplinks; a re-join should be instant, not a re-download of a 200MB map, and a 400ms hiccup should not freeze the map. The native products (FGU, TaleSpire) get this for free and it is one of the last real arguments for going native. Nobody in the browser cohort markets it — but the server-side-permissions invariant means moves must still be validated server-side, so this is "optimistic locally, authoritative on the server", not client trust. | M | Native clients (FGU, TaleSpire) by accident. Browser: **nobody**. |

**Bonus mode, near-free once 8 and the particle system exist:** a **Cinematic scene mode** — full-bleed
art, particles, ambience, no grid, one click to and from the tactical scene. That is Alchemy RPG's
entire differentiator reduced to a toggle inside our product.

### Sequencing recommendation

Do **2, 3, 4 (UVTT half), 5, 10 (lint half), 11** first — they are weeks-scale, they attack the
loudest documented pain, and they are demonstrable in a sales screenshot. Commit **1, 6, 8** as the
architectural bets that must be decided in round 1 because retrofitting any of them is a rewrite.
Treat **7** (WFC) as the flagship feature that lands *after* the renderer and wall model are stable —
generation is only impressive if what it generates is immediately playable, which means it depends on
6 and 8, not the reverse.

---

## Sources

Accessed 2026-07-26.

**Foundry VTT**
- https://foundryvtt.com/article/frameworks/ — PixiJS/GreenSock as the canvas stack
- https://foundryvtt.com/article/year-in-review-2025/ — abandoned PixiJS 7→8 migration, KTX2, priority system, v14 roadmap
- https://foundryvtt.com/article/year-in-review-2026/ — Scene Levels, Regions V2/Surfaces, Particle Generator API, Anime.js, WebGPU as future
- https://foundryvtt.com/releases/14.359 — v14 Stable 1, 2026-04-01; shared fog-of-war; elevation fixes; perf gains
- https://foundryvtt.com/releases/12.316 and https://github.com/foundryvtt/foundryvtt/discussions/10184 — grid shader, diagonals, hex centroid
- https://foundryvtt.com/article/walls/ — wall types, perception channels, proximity/attenuation, authoring
- https://foundryvtt.com/article/lighting/ , https://deepwiki.com/foundryvtt/foundryvtt/3.3-lighting-system — ClockwiseSweepPolygon, ephemeral textures, shader animations
- https://foundryvtt.wiki/en/development/api/canvas , https://foundryvtt.wiki/en/development/guides/pixi — canvas group structure
- https://foundryvtt.com/article/media/ — video map guidance (~50MB)
- https://github.com/foundryvtt/foundryvtt/issues/10343 — request for static substitution of video maps on low-perf clients
- https://foundryvtt.com/packages/levels/ , https://wiki.theripper93.com/levels — module-era elevation; unidimensional fog
- https://github.com/caewok/fvtt-elevated-vision , https://github.com/grandseiken/foundryvtt-multilevel-tokens
- https://github.com/ruipin/fvtt-token-vision-tweaks , https://github.com/dev7355608/perfect-vision , https://github.com/caewok/fvtt-token-visibility — quality-vs-perf vision modules
- https://github.com/gambit07/fxmaster , https://foundryvtt.com/packages/weatherfx — particle perf scaling
- https://foundryvtt.com/packages/dylans-animated-tokens , https://github.com/righthandofvecna/dylans-animated-tokens — spritesheet tokens + perf warning
- https://github.com/Oromis/touch-vtt , https://foundryvtt.com/packages/zoom-pan-options — touch support and its jitter
- https://forums.forge-vtt.com/t/seeking-advice-on-optimizing-performance-for-large-worlds-in-forge-vtt/162984 , https://forums.forge-vtt.com/t/incredible-lag-and-unresponsive-game-world/76025 — real-world perf reports
- https://foundrymods.com/how-to/foundry-v14-levels — *third-party SEO site, weak source, used only for module→core migration framing*

**Roll20**
- https://blog.roll20.net/posts/building-a-better-vtt/ — Project Jumpgate: legacy engine description, shader/hardware-acceleration goal, WebGPU intent, stress-test numbers
- https://pages.roll20.net/dynamic-lighting — feature claims, tier contradiction, WebGL requirement
- https://wiki.roll20.net/Plus_Subscription , https://wiki.roll20.net/Pro_Subscription — DL as Plus-tier, creator-based gating
- https://wiki.roll20.net/Best_Practices_for_Files_on_Roll20 — 72–150 PPI, slicing, 3500px, 2k animated, 4 auto-variants
- https://app.roll20.net/forum/post/11769606/there-is-a-10-000-px-dimension-limit-regardless-of-mb-size — 10,000px force-downscale
- https://app.roll20.net/forum/post/10039164/maximum-upload-size — 20/50/100MB tiers
- https://wiki.roll20.net/Advanced_Fog_of_War — 50,000-cell cap, perf impact of many AFoW tokens
- https://app.roll20.net/forum/post/10373882/explorer-mode-revealing-tokens — shared reveal, "no way to turn this back"
- https://app.roll20.net/forum/post/11706814/dynamic-lighting-limit-vision-range-slash-distance-slash-radius-per-token — no per-token vision range
- https://app.roll20.net/forum/post/10705870/new-dynamic-lighting-lags-horribly — GTX 1660 Ti "unpliable", GM-side lag, no staff reply
- https://app.roll20.net/forum/post/5655289/unbearable-lag-when-working-with-any-form-of-dynamic-lighting — freehand vector DL paths as lag cause
- https://app.roll20.net/forum/post/1067149/dynamic-lighting-lag-issues. — 5 lights, 10–15s token moves
- https://app.roll20.net/forum/post/2683572/dynamic-lighting-is-causing-my-browser-to-crash
- https://help.roll20.net/hc/en-us/articles/360045793374-Dynamic-Lighting-Requirements-Best-Practices — *returns HTTP 403 to automated fetch; content reached only via search snippets*
- https://wiki.roll20.net/Script:UniversalVTTImporter , https://app.roll20.net/forum/post/11486629/... — Pro-gated UVTT import, "all my windows are doors"

**Fantasy Grounds Unity**
- https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996640584/Map+Line+of+Sight+Style+Guide — occluder types, LoS layer, terrain semantics
- https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996645681 — Image Line of Sight Data, XML export
- https://www.fantasygrounds.com/forums/archive/index.php/t-79172.html — occluder-layer confusion
- https://github.com/Imagix/uvtt2fgu — third-party UVTT→FGU converter

**Owlbear Rodeo**
- https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/ — Warp Core, tiled renderer, spatial indexing, GPU instancing, 50–80% gains, 137MP on iPhone 14 Pro Max, 144MP/50MB, weather
- https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-week-day-3/ — GPU dynamic fog, soft shadows, collision
- https://docs.owlbear.rodeo/extensions/reference/dynamic-fog/ — two rendering paths, `sourceRadius === 0` fast path (*page returned 403 to direct fetch; content reached via search snippets*)
- https://extensions.owlbear.rodeo/tag/fog — official Dynamic Fog vs community *Smoke & Spectre!* (per-player fog)
- https://startplaying.games/blog/posts/owlbear-rodeo-how-to , https://www.diceoutpost.com/guides/new-players-guide-to-owlbear-rodeo/ — deliberate omissions
- https://deepwiki.com/owlbear-rodeo/owlbear-rodeo-legacy — legacy (1.x) architecture

**Alchemy RPG**
- https://alchemyrpg.com/ , https://startplaying.games/blog/posts/alchemy-vtt-what-how-to — cinematic scenes, particle effects
- https://startplaying.games/blog/virtual-table-tops/the-new-players-guide-to-alchemy-rpg — theatre of the mind
- https://techraptor.net/tabletop/interviews/alchemy-rpg-vtts-and-focus-on-roleplaying — "showmanship over tactical combat" as deliberate choice
- https://www.czepeku.com/blog/how-to-add-a-scene-to-alchemy-rpg , https://www.czepeku.com/blog/how-to-upload-a-map-to-alchemy-rpg — map/scene workflow

**TaleSpire**
- https://bouncyrock.com/news/articles/talespire-dev-log-299 — BatchRendererGroup, occlusion meshes, DrawMeshInstancedIndirect, BIRP, Unity Physics
- https://bouncyrock.com/news/articles/talespire-dev-log-193 — job-system rendering gains, perf philosophy
- https://bouncyrock.com/news/articles/talespire-dev-log-274 — multi-asset-pack support as modding prerequisite
- https://talespire.com/faq , https://talespire.com/taleweaverlite-guide
- https://talestavern.com/talespire-slab-archives/ — slab/board sharing economy
- https://talespire.thunderstore.io/package/PluginMasters/Custom_Assets_Library_Plugin/ , https://feedback.talespire.com/p/mod-support-adding-custom-meshes-assets , https://steamcommunity.com/app/720620/discussions/0/3773490640558164195/ — asset pipeline, HeroForge constraints

**Let's Role**
- https://lets-role.com/page/dynamic-lighting-faq?locale=en — wall/light authoring, 360°-only vision, 200 doors / 250 lights / 500 walls, 5000²–10000² px, 16MB static-only UVTT import

**D&D Beyond Maps / Project Sigil**
- https://www.dndbeyond.com/posts/1918-sigil-and-d-d-beyond-maps-what-are-they-and-how-do — UE5 vs 2D positioning; Maps unaffected
- https://www.belloflostsouls.net/2025/10/dd-wotc-officially-sunsets-project-sigil-servers-closing-in-2026.html — sunset end of October 2026, ~90% team laid off
- https://www.enworld.org/threads/project-sigil-3d-virtual-tabletop-finally-laid-to-rest.715907/
- https://dndbeyond-support.wizards.com/hc/en-us/articles/26423004178196-Sigil-FAQ
- https://www.dndbeyond.com/sigil

**Map tools & interchange**
- https://arkenforge.com/universal-vtt-files/ — UVTT format contents
- https://dungeondraft-encyclopaedia.gitbook.io/guide/final-steps/exporting-your-map/universal-vtt , https://dungeondraft-encyclopaedia.gitbook.io/guide/all-the-tools/design-tab/portal-tool — export options, wall/portal colour semantics
- https://wiki.rptools.info/index.php/Import_Dungeondraft_Map — MapTool import path
- https://2minutetabletop.com/faq/map-commission-license/ , https://azukailgames.itch.io/azukail-games-paper-and-scrolls-collection-for-dungeondraft-commercial-use/purchase — Dungeondraft CC BY-NC claim *(verify against official EULA)*
- https://www.dungeonalchemist.com/faqs , https://store.steampowered.com/app/1588530/Dungeon_Alchemist/ , https://dungeonalchemist.fandom.com/wiki/Dungeon_Alchemist_AI , https://dungeonalchemist.fandom.com/wiki/About_Dungeon_Alchemist — learned-from-examples PCG, "NO GENERATIVE AI", 6000+ objects, VTT export targets, Early Access exit late 2026
- https://dungen.app/faq/ , https://dungen.app/walls/ , https://github.com/mouse0270/foundryvtt-dungen — resolutions, per-VTT wall/LoS export, Patreon tiers incl. commercial licence
- https://watabou.github.io/dungeon.html , https://watabou.itch.io/one-page-dungeon , https://watabou.itch.io/cave-generator
- https://inkarnate.com/ , https://www.ttrpgstack.com/tools/inkarnate/ — tiers, resolution gating, commercial licence *(conflicting sources)*

**WFC, assets, platform**
- https://gdcvault.com/play/1026263/Math-for-Game-Developers-Tile — WFC shipped in *Caves of Qud*
- https://lumitree.art/blog/wave-function-collapse , https://blog.shaankhan.dev/implementing-wave-function-collapse-binary-space-partitioning-for-procedural-dungeon-generation/ , https://christianjmills.com/posts/dungeon-generation-via-wavefunctioncollapse-notes/ , https://drcodes.com/posts/wave-function-collapse-master-procedural-dungeon-generation — sockets, backtracking/checkpointing, hybrid BSP+WFC, browser implementations
- https://kenney-assets.itch.io/isometric-dungeon-tiles , https://kenney-assets.itch.io/isometric-library-tiles , https://kenney-assets.itch.io/isometric-prototypes-tiles — CC0 1.0, commercial use permitted, no attribution required (supports K5e)
- https://github.com/gpuweb/gpuweb/wiki/Implementation-Status , https://web.dev/blog/webgpu-supported-major-browsers , https://videocardz.com/newz/webgpu-is-now-supported-by-all-major-browsers — WebGPU default-on in Chrome/Edge/Safari 26/Firefox 141+ (macOS from 145); reach reported between ~70% and ~85% depending on source *(figures approximate)*
