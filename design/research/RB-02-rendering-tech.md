# Rendering Technology

Project Chronicle research brief RB-02. Access date for all sources: **2026-07-26**.
Scope: what to render the tactical map with in a browser, and an honest verdict on native game
engines (K5c). Written against the hard invariants: browser-first, self-hostable, no arbitrary
code execution from user content, accessible (keyboard/contrast/reduced-motion), 60 fps on an
ordinary laptop.

**Bottom line up front:** the "game-engine feel" Kaya wants (K5) is a *rendering and animation
quality* property, not an engine-brand property. It is reachable in a browser today — Owlbear
Rodeo already ships 100+ animated tokens, GPU-computed dynamic fog with soft shadows and
137-megapixel maps in a browser tab (https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/,
https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-week-day-2/). None of UE5 / Unity / Godot
gets us there *and* keeps the invariants. Recommendation: **DOM/React UI + PixiJS v8 map
viewport, WebGL2 as the shipping backend, WebGPU as a runtime-probed opt-in, Canvas2D as a
degraded floor.**

---

## WebGPU status

### Support matrix (mid-2026)

Primary source: the W3C GPU-for-the-Web group's own implementation-status wiki
(https://github.com/gpuweb/gpuweb/wiki/Implementation-Status).

| Engine / platform | Status 2026-07 | Notes |
|---|---|---|
| Chrome/Edge — Windows x86-64, macOS, ChromeOS | Shipped since v113 | The mature path. |
| Chrome — Windows **ARM64** | Behind `--enable-unsafe-webgpu` flag | Snapdragon X laptops do **not** get WebGPU by default. |
| Chrome — **Linux** | Partial: Intel Gen12+ since v144; NVIDIA (driver ≥535.183.01) + Wayland since v147; everything else needs flags | The weakest desktop platform. |
| Chrome — Android | ARM/Qualcomm/Intel GPUs on Android 12+ since v121; Imagination GPUs (Android 16+) since v139; **Samsung Xclipse still in progress** | Coverage is per-GPU-vendor, not per-OS-version. |
| Firefox — Windows | Shipped v141 (July 2025) | |
| Firefox — macOS | Apple Silicon v145; remaining Macs v147 | |
| Firefox — **Linux, Android** | **Nightly only.** Mozilla targets Linux "during 2026", Android work ongoing | |
| Safari — macOS 26 (Tahoe), iOS 26, iPadOS 26, visionOS 26 | Shipped, on by default | Requires the 2025 OS generation; users on macOS 15 / iOS 18 have no WebGPU. |

Aggregate reach: caniuse reports **83.63 %** global usage for WebGPU (82.17 % full +
1.46 % partial) versus **94.67 %** for WebGL 2 (https://caniuse.com/webgpu,
https://caniuse.com/webgl2). **Uncertain:** caniuse still lists Firefox as "no support", which
contradicts the gpuweb wiki's Firefox 141/145/147 shipping notes — the caniuse table lags, so the
true figure is likely higher than 83.6 % but the *shape* of the gap (Linux, older Apple OSes,
Windows ARM, several Android GPU vendors) is consistent across both sources. Secondary trackers
quote figures from "~70 %" to "~95 %"
(https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/,
https://altersquare.medium.com/three-js-vs-webgpu-in-2026-what-changed-for-large-scale-construction-viewers-79a7ed8b0b34);
treat all of them as marketing-grade estimates.

### Production readiness: not yet, for us specifically

The library authors themselves say so:

- **PixiJS:** "The WebGPU renderer is feature complete, however, inconsistencies in browser
  implementations may lead to unexpected behavior. **It is recommended to use the WebGL renderer
  for production applications.**" Their own status table marks WebGL "Recommended" and WebGPU
  "Experimental" (https://pixijs.com/8.x/guides/components/renderers).
- **Unity:** WebGPU is "experimental and not supported by all browsers and devices"
  (https://docs.unity3d.com/6000.3/Documentation/Manual/WebGPU.html).
- **Three.js:** `WebGPURenderer` has been a "production-ready option" since r171, but the docs
  still describe the renderer as "in an experimental state", and `WebGLRenderer` remains the
  default export (https://threejs.org/manual/en/webgpurenderer.html).

The decisive point for *this* product is not the global percentage — it is **which 16 % is
missing**. Self-hosters run Linux servers and disproportionately Linux desktops; WebGPU on Linux
is the single least-finished target in both Chromium and Firefox as of July 2026. A
self-hostable product that requires WebGPU would degrade worst for exactly its most invested
users. **WebGPU must therefore never be a requirement.**

### Fallback strategy

1. **Ship WebGL2 as the default backend.** 94.7 % reach, a decade of driver hardening, and every
   competitor's shipping renderer (Foundry's lighting/fog pipeline is WebGL —
   https://deepwiki.com/foundryvtt/foundryvtt/3.3-lighting-system).
2. **Runtime-probe WebGPU, do not trust `navigator.gpu`.** Adapter presence is not correctness.
   Request an adapter, compile the real shader set, render one off-screen smoke frame, compare
   against a reference hash; on any failure or exception, silently fall back to WebGL2 and record
   telemetry. Expose it as a user-visible "Experimental GPU renderer" toggle (default off at
   launch, default on later per allow-listed browser+GPU pairs).
3. **Author every visual effect twice or once-portably.** Either maintain paired GLSL/WGSL
   sources per effect, or adopt a shader-abstraction layer in the spirit of three.js's TSL, which
   transpiles one JS-authored shader to both WGSL and GLSL
   (https://threejs.org/manual/en/webgpurenderer.html). Any effect that *cannot* be expressed in
   WebGL2 is a feature-gated bonus, never a core mechanic.
4. **Canvas2D floor.** PixiJS 8.16.0 (released 2026-02-04) reintroduced an experimental Canvas 2D
   renderer specifically for "environments where a GPU context isn't available"
   (https://pixijs.com/blog/8.16.0). That is our "reduced graphics mode": static tokens, no
   dynamic lighting, pre-baked fog. It keeps the product *usable* on locked-down corporate
   machines, VMs and Raspberry-Pi-class kiosks rather than showing a black rectangle.

---

## Library comparison

Sizes are approximate and vary hugely with tree-shaking; treat every number as
order-of-magnitude and **uncertain** unless we measure our own bundle. Comparative figures
below are from npm/comparison surveys
(https://npmtrends.com/excalibur-vs-konva-vs-phaser-vs-pixi.js-vs-three,
https://www.pkgpulse.com/guides/fabricjs-vs-konva-vs-pixijs-canvas-2d-graphics-2026,
https://app.cinevva.com/guides/web-game-engines-comparison).

| Library | License | Size (approx, min) | WebGPU? | Lighting / particles | Maturity | Verdict |
|---|---|---|---|---|---|---|
| **PixiJS v8** | MIT | ~200 KB core, tree-shakeable | Yes — WebGPU + WebGL2 + experimental Canvas2D, `autoDetectRenderer()` | No built-in lighting; full custom-shader/filter/render-texture pipeline + particle containers. Proven for exactly our use case: Foundry's lights/fog are Pixi filters + render textures | Highest for 2D web rendering. Powers Foundry VTT. Active (8.16.0, Feb 2026) | **Recommended.** The only option with a shipping VTT proving the exact feature set. |
| **Phaser 4** | MIT | ~1 MB full build, modular | **No** — v4 is a renderer rewrite; WebGPU is groundwork only | Good arcade/particle/tilemap systems; lighting via custom pipelines | Stable since 2026-04-10; enormous install base ("played billions of times") | **No.** A *game* framework: scenes, physics, game loop, asset manager — all of which we already own in React/state layer. Fighting its loop costs more than it saves. |
| **Phaser AE** | **Proprietary** | n/a | Yes — WebGPU-first with WebGL2 fallback | Modern effects stack | Public ~June 2026, ~500 games | **No.** Proprietary licence is incompatible with a self-hostable product we must be able to ship and patch; two months old (https://phaser.io/news/2026/07/no-you-didn-t-miss-a-3d-update). |
| **Excalibur.js** | BSD-2-Clause | ~300 KB | No | Decent 2D graphics + tilemap; has a published WFC tutorial (https://excaliburjs.com/blog/Wave%20Function%20Collapse/) | **Still 0.x**, self-described "rough around the edges"; ~2.3 k stars, ~4.8 k weekly downloads (https://github.com/excaliburjs/Excalibur) | **No.** Pre-1.0 with a small community is the wrong dependency for a commercial product's core viewport. |
| **Konva** | MIT | ~150 KB | **No — Canvas 2D only** | No GPU shaders at all | Very mature, ~1.08 M weekly downloads, 14.3 k stars. Owlbear Rodeo **1.0** used it | **No** for the map. Excellent for the *token/asset/card editor* and drawing tools where interaction ergonomics beat throughput. Owlbear's own 2.x rewrite moved off it. |
| **Three.js** | MIT | ~600 KB+ | Yes — `WebGPURenderer` + WebGL2 fallback, TSL cross-compiles shaders | Full 3D lighting, shadow maps, postprocessing | Extremely mature; r184 (2026-04-16) | **Not for the base map.** Justified only if we later add true 2.5D/height (Talespire-style). Keep as a documented future escape hatch; the TSL shader-portability model is worth copying regardless. |
| **Cocos Creator** | Free, royalty-free (custom EULA) | Web builds ~2–4 MB | Yes — WebGPU backend since 3.6.2 | Full engine: particles, lighting, Spine, physics (some via WASM) | Mature, huge in CN mini-game market | **No.** Editor-centric workflow, EULA rather than OSI licence, and a scene format that fights a React/DOM-authoritative app (https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-web.html). |
| **Bevy (Rust→WASM)** | MIT/Apache-2.0 | **~15–30 MB** optimised wasm; ~3.5 MB for a minimal build | Via wgpu (WebGPU, WebGL2 fallback) | Strong ECS, growing 2D/lighting story | Fast-moving, breaking releases; browser is a second-class target — **no multithreading in browser wasm**, everything slower than native (https://bevy-cheatbook.github.io/platforms/wasm.html, https://bevy-cheatbook.github.io/platforms/wasm/size-opt.html) | **No.** The download alone is 15–30× our whole app budget, and we'd need a second UI toolkit for the DOM half. |
| **macroquad (Rust→WASM)** | MIT/Apache-2.0 | Small (low single-digit MB) | No (GL/GLES) | Minimal — immediate-mode drawing, no lighting/particle framework | Small project, hobby-scale ecosystem | **No.** Too little for the feature set; **uncertain** on 2026 maintenance status (not verified in this pass). |

### Can they do 100+ animated tokens plus lighting at 60 fps on a mid laptop?

Yes, and this is empirically settled rather than theoretical:

- **PixiJS** batches sprites automatically with up to 16 textures per batch (hardware dependent)
  and is documented for "thousands of sprites at 60 fps"; single-atlas scenes hit far higher
  counts (https://pixijs.com/8.x/guides/concepts/performance-tips,
  https://github.com/pixijs/pixijs/wiki/v4-Performance-Tips). An independent thesis benchmark
  found *every* test device drew 1 000 sprites at 60 fps, with batching being the dominant
  variable (https://lutpub.lut.fi/bitstream/handle/10024/160161/Diplomityo_pekonen.pdf).
- **Owlbear Rodeo's "Warp Core"** renders "over 100 of these dragons at once but still only take
  up 130 MB of CPU memory and 64 MB of GPU memory", supports scenes of 1 000+ items via a
  spatial index, is "50–80 % faster to render Scenes with large numbers of drawings" than its
  predecessor, and computes all dynamic fog "in parallel on the GPU"
  (https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-week-day-2/,
  https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-week-day-3/,
  https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/).

The binding constraint is never the library — it is **atlas discipline, culling, and how much
per-token JS runs per frame.** 100 tokens from one atlas with no per-frame allocation is trivial;
100 tokens with 100 distinct PNGs, 100 DOM nameplates and a filter each will drop a desktop to
20 fps in any engine.

### Text, UI and accessibility capability per library

Only PixiJS has a real story here, and it is the reason the recommendation is not close:
PixiJS's accessibility module "places DOM `<div>` elements over your canvas, aligned to the
bounds of accessible objects", which take keyboard focus via `tabIndex`, announce via
`accessibleTitle`/`accessibleHint`, choose their own tag via `accessibleType`, and use
`aria-live`/`aria-label`; pointer interactions on the proxy are forwarded as Pixi events
(https://pixijs.com/8.x/guides/components/accessibility). It is opt-in and it works best for
"discrete, bounded objects" — which is exactly what tokens are. Every wasm-engine option
(Unity, Godot, Bevy, Cocos) renders into an opaque canvas with **no DOM representation of scene
content at all**, and pixel streaming has no client-side scene at all.

---

## Native engines to web — verdict

All three are **non-starters as the product shell**. Two are non-starters even as a map-only
viewport.

### Unreal Engine 5 — non-starter, twice over

1. **There is no web export.** Epic removed the HTML5 platform plugin in **UE 4.24**, citing
   maintenance burden, engine heft and a "very limited userbase"; UE5 never had it
   (https://forums.unrealengine.com/t/the-future-of-web-based-content-built-with-ue-html5-webgl/154853,
   https://forums.unrealengine.com/t/ue5-export-to-html5/1625616/2). The only WebAssembly path is
   an unofficial community fork of **4.27**
   (https://github.com/SpeculativeCoder/UnrealEngine-HTML5-ES3) — a dead end for a decade-lived
   commercial product.
2. **Pixel Streaming is not browser-first, it is video.** UE runs on a server GPU and streams
   frames over WebRTC (https://dev.epicgames.com/documentation/unreal-engine/pixel-streaming-in-unreal-engine).
   Consequences, each independently disqualifying:
   - **Cost scales with concurrent players, not customers.** One GPU instance per concurrent
     session. Market pricing: StreamPixel €99/mo flat (https://www.streampixel.io/),
     Eagle 3D Streaming free tier = **60 lifetime minutes** then paid
     (https://www.eagle3dstreaming.com/pricing), and a one-week Steam-Next-Fest-scale demo
     estimated at $200–550 for the week
     (https://www.strayspark.studio/blog/pixel-streaming-ue5-cloud-gaming-demo). A 4-hour weekly
     session × a party of five × thousands of tables is a GPU-farm business, not a €X/month VTT.
   - **Self-hosting dies.** "Self-hostable" would mean every GM owns a datacentre GPU. The
     invariant is not merely bent, it is inverted.
   - **Accessibility is structurally impossible.** The client is a `<video>` element. No DOM, no
     ARIA, no screen-reader text, no user font scaling, no reduced-motion honouring, no browser
     zoom. Our accessibility invariant cannot be met at any effort level.
   - **Mobile and marginal networks** get latency, battery drain and video artefacts on exactly
     the material (small text on a battle map) that compresses worst.

   Verdict: **reject.** It is worth telling Kaya plainly that "Unreal Engine 5 in the browser"
   in 2026 means "a Twitch stream you can click", not an app.

### Unity 6 — non-starter as shell, not worth it as viewport

- **Licensing is survivable but not free.** The Runtime Fee was cancelled before Unity 6 shipped
  (https://www.notebookcheck.net/Unity-cancels-Runtime-Fee-before-controversial-pricing-structure-even-goes-into-effect-in-Unity-6.887828.0.html);
  Unity Personal is free below **$200 000** revenue, Unity Pro is **$2 200/seat/year**
  (https://www.strayspark.studio/blog/unity-engine-2026-state-comeback-runtime-fee-aftermath).
  For a commercial product intending to exceed $200 k, that is a per-developer annual cost and a
  vendor with a demonstrated willingness to change licence terms retroactively. Reputational risk
  is real and we would be re-litigating it in every enterprise sales conversation.
- **Build size is fatal for a web app.** Practitioner reports put a real Unity 6 WebGL project at
  **~50 MB**, with ~8 MB as the practical floor for anything
  (https://discussions.unity.com/t/eliots-webgl-notes-for-2026/1701530,
  https://app.cinevva.com/guides/web-game-engines-comparison). Our entire first-load target is
  ~1 MB gzipped.
- **WebGPU is explicitly experimental** in Unity's own docs, and developers report Unity 6
  WebGPU being *slower* per frame than its WebGL path
  (https://docs.unity3d.com/6000.3/Documentation/Manual/WebGPU.html,
  https://discussions.unity.com/t/unexpected-high-frame-cost-in-unity-6-webgpu-vs-webgl-questions-on-bindgroup/1653892).
- **No self-hostable open runtime, no DOM, no accessibility.** Verdict: **reject.**

### Godot 4 — the only honest contender, still rejected

- **Licence is perfect: MIT.** It is the only one of the three we could legally ship inside a
  self-hosted bundle without a vendor relationship.
- **But the download is 25–35× our budget.** An empty Godot 4.4 web project is reported at
  **~35 MB of compressed wasm**, ~25 MB after asset-pack stripping
  (https://best-games.io/blog/godot-web-export-optimization-guide,
  https://www.summerengine.com/blog/godot-web-export-guide) — **uncertain**, these are secondary
  sources, but Godot's own docs concede `.wasm`/`.pck` are "usually large" and lean on
  gzip/Brotli (https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).
- **Threading is a trap either way.** Multi-threaded export needs
  `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`, which
  breaks embedding, third-party media and many self-host reverse-proxy setups; Godot's answer was
  to make **single-threaded the default** since 4.3 — trading the performance we came for
  (https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html,
  https://godotengine.org/article/progress-report-web-export-in-4-3/). COEP in particular would
  poison our own architecture, since a VTT must embed user media and (like Owlbear) may want
  iframe-sandboxed extensions.
- **Documented web limitations are hostile to a session tool:** projects **pause when the tab
  loses focus**, audio autoplay restrictions, no low-level networking (HTTP/WebSocket/WebRTC
  only), "WebAssembly runs slower than native code, especially on mobile" (same source). A GM
  alt-tabbing to their notes must not pause the table's map.
- **The campaign manager is a document app.** Character sheets, wiki, quests, item cards,
  rule-builder forms — these want real DOM: text selection, browser find, native inputs, IME,
  font scaling, screen readers, CSS theming (K1). Godot's UI toolkit gives up all of it.
- Verdict: **reject as shell.** As a *map-only viewport* it is merely a bad trade (25–35 MB and a
  wasm bridge to buy features PixiJS already has). Keep on file only for a hypothetical offline
  "map studio" desktop companion.

### What Kaya should hear

"Game-engine feel" = sprite atlases, skeletal/frame animation, particles, shader-based lighting
and soft shadows, camera easing, parallax, and 60 fps. Every one of those is a browser-shader
technique, not an engine licence. Owlbear Rodeo — **a two-person team** — demonstrably ships
GPU dynamic fog with "soft shadows and feathered edges", GPU effect shaders exposed to third
parties, a 600-option weather system, a tiled renderer for 144-megapixel maps and 100+ animated
tokens, in a browser tab, on an iPhone
(https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/). The gap between Foundry/Roll20 and
"nur in besser" is *craft and pipeline*, not engine class. Choosing UE5 or Unity would trade the
invariants away and still not beat Warp Core.

---

## Recommended architecture

### The split: DOM is authoritative, canvas is a view

```
┌─ React/TS app shell ──────────────────────────────────────────────┐
│  DOM UI: sheets, wiki, combat console, rule-builder, theme editor │
│  CSS custom-property design tokens  ← K1 theming lives here       │
│  ┌─ Map viewport (one <canvas>) ─────────┐  ┌─ a11y layer ─────┐  │
│  │  PixiJS v8  ── WebGL2 | WebGPU | 2D   │  │ DOM token proxies │  │
│  │  layers: base(tiled) grid terrain     │  │ aria-live log     │  │
│  │          tokens fx light/fog overlay  │  │ scene outline     │  │
│  └───────────────────────────────────────┘  └───────────────────┘  │
└──── scene store (server-authoritative, normalized, framework-free) ┘
```

This is the same shape Foundry and Owlbear use, and it is the shape that keeps accessibility
alive. Foundry runs an HTML/CSS application layer over a PixiJS canvas whose `Canvas` object owns
layer groups, with a `LightingLayer` driving custom shaders and a *visibility* group that
"consolidat[es] multiple render textures, and appl[ies] a filter with special effects and blur"
for fog, while a `WallsLayer` computes line-of-sight and occlusion
(https://foundryvtt.com/api/classes/foundry.canvas.Canvas.html,
https://deepwiki.com/foundryvtt/foundryvtt/3.3-lighting-system). Owlbear keeps its GM UI in the
DOM and sandboxes third-party extensions as **iframes talking over a postMessage SDK**
(https://blog.owlbear.rodeo/building-an-extension-for-owlbear-rodeo-2-0/,
https://docs.owlbear.rodeo/extensions/getting-started/) — a pattern we should copy verbatim,
because it is also the only way to have an extension ecosystem *without* arbitrary code execution
in our origin.

### Hard rule: a renderer abstraction boundary

Define a `MapRenderer` interface (`setScene`, `applyPatch`, `setCamera`, `hitTest`,
`renderFrame`, `capability(x)`) and let nothing outside `src/render/pixi/*` import PixiJS. The
justification is not architectural purity, it is a live cautionary tale: **Foundry planned the
PixiJS v7→v8 migration for v13, investigated, and cancelled it** — the impact "would be far more
sweeping and disruptive than planned" and "irresponsible to enforce" on module developers; it did
not land in v14 either (https://foundryvtt.com/article/v13-patreon-vote/,
https://foundryvtt.com/releases/14.349). Foundry is stuck on Pixi v7 in 2026 because its
renderer leaked into its public API. We must not repeat that.

### Layer plan and the techniques behind each

| Layer | Technique |
|---|---|
| Base map | **Tile pyramid**, not one giant texture. Server pre-slices uploads into 512 px tiles at multiple LODs (Deep-Zoom/IIIF shape); client loads only visible tiles at the current zoom. This is exactly Owlbear's "new tiled renderer for large maps and images" and how they reach 144 MP with a 50 MB upload cap (https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/). Store tiles as **KTX2/Basis Universal** supercompressed textures — JPEG-class file size, transcoded to native GPU formats at runtime, which also cuts VRAM. |
| Grid | Procedural shader on a single quad (square/hex/iso). Never geometry per cell. Isometric support matters — Owlbear shipped isometric grids in Dec 2024. |
| Terrain / WFC-generated tiles | One **sprite atlas per theme pack**, built server-side at pack-upload time; instanced quads reading atlas UVs. |
| Tokens | Sprites from the same atlas set; frame animation driven by an atlas-frame table. **Instancing + flyweight**: share immutable per-asset data across instances — Owlbear's stated route to "100+ dragons at 130 MB CPU / 64 MB GPU" (https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-week-day-2/). |
| Effects / particles | GPU particle containers with a **declarative effect descriptor** (JSON: emitter shape, curves, blend, atlas frames). Declarative-only keeps the no-code-execution invariant intact even for community effect packs. |
| Lighting + fog of war | LOS polygons computed off the render path (worker, ideally Rust/WASM), uploaded as geometry, rasterised into a light render-texture with additive blending; darkness composited multiplicatively; penumbra/soft shadows via a blur pass. Explored-fog persisted as a coarse bitmask (≈1 texel per ¼ grid cell), **server-authoritative per player/party** — fog is a permission fact, not a client rendering detail. |
| Overlay | Measurement, selection, pings, rulers. Canvas for the visuals; the *numbers* also go to a DOM live region. |
| Labels / nameplates | MSDF bitmap text in-canvas for the hot path (PixiJS 8.16 fixed the MSDF/WebGPU colour path — https://pixijs.com/blog/8.16.0). Arbitrary/CJK text and anything user-selectable goes to DOM, not canvas. |

### Off-main-thread rendering

Put the renderer in a **Web Worker driving an `OffscreenCanvas`** wherever available:
Chrome 69+, Edge 79+, Firefox 105+, Safari 16.4+ for 2D, with WebGL2-in-OffscreenCanvas landing
in Safari 17 / iOS 17 (https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas,
https://web.dev/articles/offscreen-canvas,
https://github.com/mdn/browser-compat-data/issues/21127). This directly resolves tension #1 in
the intake: K3's motion-design-heavy DOM UI can no longer stall the map, because they are on
different threads. Detect and fall back to a main-thread canvas; do not fork the render code —
the worker boundary is a transport, the renderer is identical.

Also worker-bound: LOS/fog polygon solving, WFC generation, atlas packing previews, pathfinding.

### WFC map generation (K5b, K5d)

WFC is a **CPU-bound constraint solver**, so it belongs in a worker and/or on the server, never
on the render thread. Design notes:

- **Tiled model, not overlapping model.** Adjacency rules per tile edge (which tiles may sit
  above/below/left/right) are authorable in a GUI and reviewable by humans; the overlapping model
  learns from a bitmap and is unpredictable to art-direct
  (https://github.com/mxgmn/WaveFunctionCollapse,
  https://excaliburjs.com/blog/Wave%20Function%20Collapse/).
- **The rules are declarative data** — a tileset package with tile ids, edge sockets, weights and
  symmetry. This lands neatly on the pack format that K2's visual rule-builder already needs, and
  it satisfies the no-arbitrary-code invariant for community tilesets.
- **Contradictions are the real work.** Excalibur's demo reports a ">90 % success rate" *without*
  collision management and explicitly names the two mitigations: regenerate, or backtrack via
  command-pattern snapshots; over-tight rules explode combinatorially, loose rules produce "noisy"
  output (https://excaliburjs.com/blog/Wave%20Function%20Collapse/). Budget for
  seeded-deterministic generation, a hard step/time cap, backtracking with snapshot depth limits,
  and a human "reroll region" tool. WFC alone will not produce a *good dungeon* — plan a hybrid:
  graph/room-and-corridor layout for structure, WFC for coherent tile infill and decoration.
- Deterministic seeds make generated maps reproducible, diffable and shareable — and testable in
  CI, which a stochastic generator otherwise is not.

### Animation format and asset licensing (K5e)

- **Primary format: sprite-sheet frame animation** (Aseprite/TexturePacker JSON + atlas). Zero
  runtime licence encumbrance, trivially themeable, works in every backend including the Canvas2D
  floor.
- **Spine is a licensing landmine for us.** Integrating the runtimes is permitted, but "each user
  of the Products must obtain their own Spine Editor license"
  (https://en.esotericsoftware.com/spine-runtimes-license). In a product whose *point* is that
  GMs bring their own content, that clause pushes a per-GM licence obligation onto our users.
  Company-wide Spine Enterprise is quoted around **$7 000–11 000/year**
  (https://www.vendr.com/buyer-guides/esoteric-software) — **uncertain**, third-party
  procurement data. Position Spine as an *optional import* for users who already hold a licence,
  never as the shipped animation format, and get the multi-user case in writing from Esoteric
  before shipping any Spine import.
- **DragonBones** is the free/open alternative with Pixi and Phaser runtimes
  (https://github.com/pixijs/examples/pull/69) but is, as far as this pass could establish,
  largely dormant — **uncertain**; treat as an unmaintained format importer at best.
- **Shipped assets: CC0 first.** Kenney's packs are CC0 1.0 Universal — "you're allowed to use
  these game assets in any project including commercial ones… giving attribution is not required"
  — and include directly relevant top-down/isometric dungeon tilesets with multi-direction
  animated characters (https://kenney.nl/assets/isometric-miniature-dungeon,
  https://kenney-assets.itch.io/isometric-dungeon-tiles,
  https://opengameart.org/content/all-cc0-uploader-kenney). Broader CC0 pools exist on itch.io
  and OpenGameArt (https://itch.io/game-assets/assets-cc0/tag-tilemap).
- **Build a per-asset licence ledger from day one**: every shipped asset row carries source URL,
  licence id, author, and whether attribution is required, with a generated in-app credits
  screen. CC-BY is usable but only with that machinery; without it, one CC-BY file in the default
  theme is a compliance defect in a commercial product. Keep default themes **CC0-only** so
  attribution obligations never gate a release.

---

## Accessibility with a canvas map

A `<canvas>` is a pixel buffer; assistive technology sees nothing unless we build a parallel
representation. Canvas content "is not accessible to screen readers by default", and the fix is
ARIA on the element plus DOM fallback content
(https://pauljadam.com/demos/canvas.html). Our design principle: **the DOM scene model is
canonical; the canvas is one rendering of it.** Concretely:

1. **DOM proxies per interactive object.** Use PixiJS's accessibility module, which overlays
   focusable `<div>`s (or `<button>`s via `accessibleType`) aligned to object bounds, with
   `tabIndex`, `accessibleTitle`, `accessibleHint`, `aria-label`, and pointer-event forwarding
   (https://pixijs.com/8.x/guides/components/accessibility). Its own documented weakness —
   "works best for discrete, bounded objects" — is fine for tokens, doors, lights and notes, and
   irrelevant for terrain, which needs a summary rather than per-tile focus.
2. **Keyboard token movement as a first-class input mode, from slice 1.** Grid-stepping with
   arrows, `Shift`+arrow for 5-cell jumps, `Home` to snap to the selected token, `[`/`]` to cycle
   tokens in initiative order, `Enter` to open the token's sheet, `Escape` to release focus back
   to the viewport container. Movement must be *the same command* the mouse issues — one
   `MoveToken` intent, two input paths — so there is no second, less-tested code path.
3. **A canonical "scene outline" panel in the DOM.** A real tree/list of tokens grouped by
   region ("Party — 4; Enemies — 6; Objects — 3") with position ("Ranger, row F, column 12"),
   status effects, visibility and distance to the selected token. This is the screen-reader map,
   it is also genuinely useful to sighted GMs, and it doubles as the "reduced graphics mode" UI.
   Building it for accessibility gets us a feature, not a tax.
4. **`aria-live` announcements for scene events**, politely coalesced: "Ranger moved 3 squares,
   now 15 feet from Goblin 2." Screen-reader users need game-state announcements, not a redraw
   log (https://ianeress.substack.com/p/aria-for-web-games-november-13-2024). Rate-limit and
   batch, or the live region becomes noise.
5. **Focus visibility in two places.** A drawn focus ring in the canvas *and* a real focus
   outline on the proxy element, so browser-native focus indicators and high-contrast modes work.
6. **Never encode information in colour alone** — token status uses icon + shape + label, so
   K1's user-authored themes cannot destroy meaning. Theme tokens must pass a contrast validator
   before save (this is the concrete answer to intake tension #1).
7. **Honour `prefers-reduced-motion` inside the canvas too**: kill camera easing, token
   move-tweens, particle loops, light flicker and weather. Reduced-motion cannot stop at CSS
   when the animation lives in a shader.
8. **Test with real AT every slice** (NVDA + Firefox, VoiceOver + Safari, keyboard-only) and put
   an axe/keyboard-trap check in CI. A11y verified once at the end is a11y not delivered.

Note the strategic point: **this entire section is impossible for UE5 pixel streaming and
effectively impossible for Unity/Godot wasm.** Accessibility is not just an invariant we're
honouring — it is a differentiation axis (K4) that the engine-based competition structurally
cannot follow us onto.

---

## Performance budget proposal

Reference machine ("ordinary laptop"): 2020–2022 class, integrated GPU (Intel Iris Xe / Apple M1
/ Ryzen 5 iGPU), 8–16 GB RAM, 1920×1080 at 1× or 1440p at 1.5×, Chrome or Firefox, on battery.
Target **60 fps sustained** (16.7 ms), with a hard floor of 30 fps during map load or generation.

**Scene ceilings (soft-warn in the UI beyond these):**

| Quantity | Budget |
|---|---|
| Tokens in scene | 300 total, **≤100 animated simultaneously visible** |
| Dynamic light sources | 20 (of which ≤8 animated/flickering) |
| Wall/LOS segments | 1 500 |
| Drawings / measurement primitives | 2 000 |
| Base map | up to 144 MP via tile pyramid; **no single texture > 4096²** |
| Distinct textures per frame | ≤16 (one batch — PixiJS's batch limit) |
| Particles alive | 2 000 |

**Frame budget (16.7 ms):**

| Slice | Budget |
|---|---|
| Scene-store diff + interpolation | 2.0 ms |
| Renderer submit (transforms, batching) | 4.0 ms |
| GPU (draw + lighting/fog composite) | 8.0 ms |
| Slack for DOM UI, GC, input | 2.7 ms |
| Draw calls | ≤150 |
| Per-frame allocations on the hot path | **zero** — pre-allocate, pool, no closures per token per frame |

**Off-frame budgets:** LOS/fog recompute for 1 500 walls + 20 lights ≤ 8 ms in a worker, at most
once per token settle (not per drag pixel). WFC generation for a 64×64 tile region ≤ 2 s in a
worker with progress reporting and cancellation.

**Memory:** ≤400 MB CPU, ≤250 MB GPU for a budgeted scene. Owlbear's 130 MB CPU / 64 MB GPU for
100+ animated tokens is our sanity reference — if we are 3× that for the same scene, we have a
pipeline bug, not a hardware problem
(https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-week-day-2/).

**First load (the argument that ends the engine debate):**

| Target | Budget |
|---|---|
| App shell JS (React + state + router), gzip/br | ≤400 KB |
| Renderer (PixiJS tree-shaken), gzip/br | ≤150 KB |
| CSS + fonts | ≤150 KB |
| **Total first paint-to-interactive payload** | **≤1.2 MB** |
| Map viewport code-split, loaded on first scene open | separate chunk |

Compare: Godot ~25–35 MB, Bevy ~15–30 MB, Unity ~8–50 MB, UE5 pixel streaming = a continuous
video bitstream. Our target is **20–40× smaller than the cheapest engine option**, and on a
mobile connection that is the difference between a table starting on time and a table giving up.

**Network (see next):** token transform broadcasts ≤20 Hz; drag input 30 Hz client→server,
rebroadcast at 20 Hz; drawing strokes chunked ≤10 points/message.

**Enforcement:** these numbers are worthless as prose. Put them in CI — a headless
budget-scene benchmark asserting frame time and draw calls, plus a bundle-size gate that fails
the build. Ship an in-app perf HUD (frame time, draw calls, texture count, VRAM estimate) behind
a GM debug toggle, so field reports arrive with numbers.

---

## Rendering + realtime interplay

- **Render in the past.** Buffer remote snapshots and render ~100 ms behind server time,
  interpolating between the two straddling snapshots — the standard entity-interpolation model
  (https://www.gabrielgambetta.com/entity-interpolation.html,
  https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking). Naively applying
  positions on receipt produces the choppy 100 ms-jump movement that makes browser VTTs feel
  cheap; interpolation is what makes a token *glide*. At 20 Hz a snapshot arrives every 50 ms
  (https://gamedev.net/forums/topic/679630-20hz-server-performance-dilemma/).
- **Two clocks, deliberately.** Network at 20 Hz, render at 60 fps. The renderer never waits on
  the network; it always has two snapshots to interpolate between, plus a short extrapolation
  clamp (≤150 ms, then freeze) for dropped packets.
- **The dragger is authoritative locally, the server is authoritative globally.** The GM dragging
  a token sees it under the cursor with zero latency (local prediction); everyone else sees the
  interpolated stream. On server correction, ease to the corrected position over ~120 ms rather
  than snapping — gradual error correction over a short window is the accepted technique
  (https://www.gamedev.net/forums/topic/658931-smoothing-corrections-to-client-side-prediction/).
  Snapping a token is how players lose trust in a VTT.
- **Rate-limit at the intent layer, not the socket.** Coalesce per-entity: a token has *one*
  pending transform, overwritten until the next send tick, so a 5-second drag costs ~100 messages
  regardless of mouse polling rate. Same for camera and for fog reveals. Rate limits must be
  server-enforced per connection (an invariant: the client is untrusted), with the client's own
  throttling being an optimisation, not the control.
- **Drawing sync:** stream strokes as append-only chunks (≤10 points), each with a stroke id and
  sequence number, so late joiners and reconnects replay deterministically; commit to a single
  immutable stroke record on pointer-up. Never resend whole drawings. Simplify (Ramer–Douglas–
  Peucker) on commit, not during the stream — the live stream should be responsive, the stored
  artefact should be small.
- **Fog reveals are server-side facts.** The client renders a mask; the server decides what each
  player may know and sends only that player's mask deltas. Sending the full fog state and
  masking client-side is an information leak, not an optimisation.
- **Backpressure and tab-sleep.** On reconnect or a backgrounded tab, do not replay the queue —
  request a fresh scene snapshot and resync. Cap per-room broadcast bandwidth and degrade
  gracefully (drop interpolation fidelity before dropping correctness).

---

## Risks

1. **WebGPU dependency creep.** A developer writes a compute-shader-based lighting pass that has
   no WebGL2 expression, and 16 %+ of users — concentrated among Linux self-hosters — lose the
   feature or the app. *Mitigation:* capability-gated effects, paired shader sources or a
   TSL-style abstraction, CI job that renders the reference scene on the WebGL2 backend and
   diffs it, and an explicit architectural rule: **WebGL2 is the feature baseline.**
2. **PixiJS is a single, small-team dependency, and major upgrades can become impassable.**
   Foundry cancelled its v7→v8 migration as too disruptive and is still on v7 in 2026
   (https://foundryvtt.com/article/v13-patreon-vote/). *Mitigation:* the `MapRenderer` boundary
   (nothing outside `render/pixi/*` imports Pixi), pinned versions, a vendored fork we can patch,
   and a spike proving the abstraction by implementing a trivial second backend early.
3. **Accessibility retrofitted = accessibility failed.** The scene outline, DOM proxies and
   keyboard movement are architectural, not decorative. If the canvas ships first and a11y
   "comes later", the scene model will have grown canvas-shaped and the retrofit will be a
   rewrite. *Mitigation:* keyboard token movement and the outline panel are exit criteria for the
   *first* map slice, with AT testing in the definition of done.
4. **K3's motion design starving the map.** Compositor-heavy DOM animation over or near the
   viewport, or layout thrash from live panels, will eat the 2.7 ms slack. *Mitigation:*
   OffscreenCanvas/worker rendering, no animated DOM overlapping the viewport, `content-visibility`
   and transform-only animations, `prefers-reduced-motion` propagated into the shaders, and the
   CI frame-budget gate.
5. **Mobile and iPad memory ceilings.** A 144 MP map plus 100 animated tokens will OOM iOS
   Safari long before it drops frames; Owlbear's own limits (50 MB file / 144 MP) exist for this
   reason. *Mitigation:* device-class tiers capping LOD, atlas resolution, particle counts and
   light counts; measured, not guessed.
6. **Matching Warp Core is engine work, not library glue.** Owlbear built a bespoke
   WASM-assisted renderer with a spatial index, instancing, tiling and GPU fog over multiple
   releases. "PixiJS + effort" is the right *substrate*, but the differentiator Kaya wants costs
   real months of rendering engineering. *Mitigation:* stage it — playable map (tiles + tokens +
   grid) → LOS/fog → dynamic lighting → particles/weather → generation. Say the cost out loud in
   the roadmap rather than discovering it in phase 8.
7. **WFC quality and blow-ups.** Contradiction cascades, timeouts, and the classic failure of
   locally-valid/globally-boring output. *Mitigation:* hybrid layout+WFC, hard step caps,
   bounded backtracking, seeded determinism, region reroll, and — most importantly — a tileset
   authoring/preview tool, because WFC output quality is 90 % tileset design.
8. **Asset licence drift.** A CC-BY or "free for personal use" file entering a shipped default
   theme is a commercial compliance defect. *Mitigation:* per-asset licence ledger, CC0-only
   default themes, generated credits screen, and a build-time check that every shipped asset has
   a ledger row.
9. **Canvas text and i18n.** MSDF atlases don't scale to CJK glyph sets, and German compounds
   overflow fixed nameplate widths. *Mitigation:* atlas text only for latin-1 hot-path labels;
   DOM/`HTMLText` for arbitrary user text; nameplate truncation with the full string in the DOM
   proxy's accessible name.
10. **Untrusted uploads are a rendering attack surface.** Malicious SVG (scripts), decompression
    bombs, and pathological image dimensions all arrive through the map-upload path.
    *Mitigation:* server-side re-encode of every upload into our own tile/atlas format — never
    serve user bytes to the renderer directly — dimension/pixel caps, SVG rasterised server-side
    or rejected, and strict CSP on the app origin. This is the pack invariant "uploads are
    untrusted" applied to the renderer.

---

## Sources

All accessed 2026-07-26.

**WebGPU / platform status**
- https://github.com/gpuweb/gpuweb/wiki/Implementation-Status — authoritative per-browser,
  per-platform WebGPU status (primary source for the support matrix)
- https://caniuse.com/webgpu — 83.63 % global usage; Firefox row lags the gpuweb wiki
- https://caniuse.com/webgl2 — 94.67 % global usage
- https://web.dev/blog/webgpu-supported-major-browsers
- https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/ — secondary,
  marketing-grade adoption figures
- https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- https://web.dev/articles/offscreen-canvas
- https://github.com/mdn/browser-compat-data/issues/21127 — WebGL2-in-OffscreenCanvas on Safari 17/iOS 17

**Libraries**
- https://pixijs.com/8.x/guides/components/renderers — "recommended to use the WebGL renderer for production"
- https://pixijs.com/8.x/guides/components/accessibility — DOM overlay a11y model
- https://pixijs.com/8.x/guides/concepts/performance-tips and https://github.com/pixijs/pixijs/wiki/v4-Performance-Tips
- https://pixijs.com/blog/8.16.0 — experimental Canvas2D renderer, tagged text, MSDF/WebGPU fix (2026-02-04)
- https://pixijs.com/blog/pixi-v8-launches
- https://lutpub.lut.fi/bitstream/handle/10024/160161/Diplomityo_pekonen.pdf — independent sprite-count/batching benchmark
- https://phaser.io/news/2026/07/no-you-didn-t-miss-a-3d-update — Phaser 4 (MIT) vs Phaser AE (proprietary, WebGPU-first)
- https://github.com/phaserjs/phaser
- https://github.com/excaliburjs/Excalibur — BSD-2-Clause, still 0.x
- https://excaliburjs.com/blog/Wave%20Function%20Collapse/ — WFC in a JS engine, failure modes
- https://npmtrends.com/excalibur-vs-konva-vs-phaser-vs-pixi.js-vs-three — relative adoption
- https://www.pkgpulse.com/guides/fabricjs-vs-konva-vs-pixijs-canvas-2d-graphics-2026
- https://threejs.org/manual/en/webgpurenderer.html — WebGPURenderer status, WebGL2 fallback, TSL
- https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-web.html
- https://bevy-cheatbook.github.io/platforms/wasm.html and .../wasm/size-opt.html — Bevy browser limits, size
- https://app.cinevva.com/guides/web-game-engines-comparison — secondary size/licence survey

**Native engines**
- https://forums.unrealengine.com/t/the-future-of-web-based-content-built-with-ue-html5-webgl/154853 — HTML5 dropped in UE 4.24
- https://forums.unrealengine.com/t/ue5-export-to-html5/1625616/2
- https://github.com/SpeculativeCoder/UnrealEngine-HTML5-ES3 — unofficial UE 4.27 web fork
- https://dev.epicgames.com/documentation/unreal-engine/pixel-streaming-in-unreal-engine
- https://www.streampixel.io/ and https://www.eagle3dstreaming.com/pricing — pixel-streaming pricing
- https://www.strayspark.studio/blog/pixel-streaming-ue5-cloud-gaming-demo — cost worked example
- https://www.notebookcheck.net/Unity-cancels-Runtime-Fee-before-controversial-pricing-structure-even-goes-into-effect-in-Unity-6.887828.0.html
- https://www.strayspark.studio/blog/unity-engine-2026-state-comeback-runtime-fee-aftermath — Personal free ≤$200k, Pro $2 200/seat/yr
- https://docs.unity3d.com/6000.3/Documentation/Manual/WebGPU.html — "experimental"
- https://discussions.unity.com/t/eliots-webgl-notes-for-2026/1701530 — practitioner web build sizes
- https://discussions.unity.com/t/unexpected-high-frame-cost-in-unity-6-webgpu-vs-webgl-questions-on-bindgroup/1653892
- https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html — size, COOP/COEP, limitations
- https://godotengine.org/article/progress-report-web-export-in-4-3/ — single-threaded export default
- https://best-games.io/blog/godot-web-export-optimization-guide and https://www.summerengine.com/blog/godot-web-export-guide — secondary size figures (uncertain)

**Competitor architecture**
- https://foundryvtt.com/api/classes/foundry.canvas.Canvas.html — Foundry canvas/layer groups
- https://deepwiki.com/foundryvtt/foundryvtt/3.3-lighting-system — WebGL lighting, fog render textures, WallsLayer LOS
- https://foundryvtt.com/article/v13-patreon-vote/ — PixiJS v8 migration investigated and cancelled
- https://foundryvtt.com/releases/14.349 and https://blog.forge-vtt.com/v14-is-out-on-the-forge/ — v14, still no Pixi v8
- https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/ — Warp Core: 50–80 % faster, tiled renderer, spatial index, instancing, 137 MP map, 144 MP/50 MB limits
- https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-week-day-2/ — flyweight/instancing, spatial index, 100+ animated tokens at 130 MB CPU / 64 MB GPU, WASM
- https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-week-day-3/ — dynamic fog computed in parallel on GPU, soft shadows, fog primitives for extensions
- https://blog.owlbear.rodeo/building-an-extension-for-owlbear-rodeo-2-0/ and https://docs.owlbear.rodeo/extensions/getting-started/ — iframe + postMessage SDK sandboxing

**Accessibility**
- https://pauljadam.com/demos/canvas.html — canvas is inaccessible by default; ARIA/fallback techniques
- https://webaim.org/techniques/keyboard/
- https://ianeress.substack.com/p/aria-for-web-games-november-13-2024 — live regions for game events
- https://mn.gov/mnit/media/blog/?id=38-645700 — screen-reader map strategies

**Realtime**
- https://www.gabrielgambetta.com/entity-interpolation.html — entity interpolation
- https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking
- https://gamedev.net/forums/topic/679630-20hz-server-performance-dilemma/ — 20 Hz snapshot cadence
- https://www.gamedev.net/forums/topic/658931-smoothing-corrections-to-client-side-prediction/ — gradual error correction

**Generation & assets**
- https://github.com/mxgmn/WaveFunctionCollapse — original WFC, tiled vs overlapping model, ports
- https://github.com/printer83mph/wfc-js — TypeScript WFC implementation
- https://thecodingtrain.com/challenges/171-wave-function-collapse/ — JS/p5 walkthrough
- https://kenney.nl/assets/isometric-miniature-dungeon and https://kenney-assets.itch.io/isometric-dungeon-tiles — CC0, commercial use, no attribution required
- https://opengameart.org/content/all-cc0-uploader-kenney
- https://itch.io/game-assets/assets-cc0/tag-tilemap and https://itch.io/game-assets/assets-cc0/tag-isometric
- https://en.esotericsoftware.com/spine-runtimes-license — "each user of the Products must obtain their own Spine Editor license"
- https://en.esotericsoftware.com/spine-editor-license
- https://www.vendr.com/buyer-guides/esoteric-software — Spine enterprise cost estimates (uncertain, third-party)
- https://github.com/pixijs/examples/pull/69 — DragonBones with PixiJS
