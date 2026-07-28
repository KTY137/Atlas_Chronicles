# Client Technology Paths

Research brief **RB-09** — the technical paths to a Steam-shippable client, and what each costs
us in features already committed.
Author: research beat, Apollon crew. Access date **2026-07-26**. All claims cited inline; claims
I could not verify in this pass are marked **[uncertain]** or **[dated]**.

## Scope and relationship to RB-02

[`RB-02-rendering-tech.md`](RB-02-rendering-tech.md) already answered *"what draws the map"* and
rejected UE5 / Unity / Godot — but it rejected them **under the browser-first invariant**
(wasm download size, web-export limitations, pixel-streaming economics). K6 puts that invariant
under review. Several of RB-02's arguments therefore **evaporate on a native path** and the engine
question must be re-litigated on native-relevant grounds: complex-UI quality, rich text, theming,
accessibility, and solo-dev effort. This brief does that re-litigation and then answers the
shell/distribution question RB-02 did not address.

Where RB-02 and RB-09 agree, I say so. Where the new premise changes the answer, I say that too.

### The committed feature set every path must still deliver

| # | Commitment | Source |
|---|---|---|
| F1 | Visual GUI rule-builder — dense forms **plus** a node/graph formula editor with live trace | K2 |
| F2 | 4+ theme templates (Cyberpunk/Medieval/Fantasy/PixelArt) **plus a user-facing theme editor** — swapping colour, typography, spacing *and* rendering style | K1 |
| F3 | Rich text / wiki / notes — authoring, not just display | pack PRODUCT_SPEC |
| F4 | Dense data tables (compendium, item library, initiative, action log) | pack PRODUCT_SPEC |
| F5 | Accessibility — screen reader, keyboard nav, OS contrast + reduced-motion settings | K3, pack NFR |
| F6 | de/en localisation | pack PRODUCT_SPEC |
| F7 | Sprite maps, game-engine feel, WFC generation | K5 |
| F8 | Realtime multiplayer, server-authoritative permissions | invariant #1 |
| F9 | Export / portability | pack PRODUCT_SPEC |

F1–F4 and F6 are **application-software** requirements. F7 is a **game** requirement. No single
runtime is best at both; every path is a trade between those two poles. That is the whole brief in
one sentence.

---

## Web + wrapper (Tauri/Electron)

### The shared premise

Both wrap our existing React/TS + PixiJS architecture in a desktop binary. The application code is
unchanged; only the shell differs. Both are Steam-shippable — Steam distributes arbitrary
executables and has a Software category; **Fantasy Grounds VTT** is a shipping VTT on Steam
(https://store.steampowered.com/app/1196310/Fantasy_Grounds_VTT/), so "is a VTT allowed on Steam"
is settled by precedent, not argument.

### Tauri v2

**What it is.** Rust backend, system webview frontend via Tao/Wry. Stable since **2024-10-02**;
current stable **v2.10.1 (2026-03-04)**; targets Linux, macOS, Windows, Android, iOS
(https://en.wikipedia.org/wiki/Tauri_(software_framework)). Binaries are small because Chromium is
*not* bundled — the app uses WebView2 (Windows), WKWebView (macOS), WebKitGTK (Linux)
(https://v2.tauri.app/reference/webview-versions/).

**Steamworks integration.** Workable, community-grade:
- `steamworks` (Noxime/steamworks-rs) — Rust bindings, **dual MIT/Apache-2.0** except the vendored
  Valve SDK files, loads the SDK dynamically, v0.12.x
  (https://github.com/Noxime/steamworks-rs, https://crates.io/crates/steamworks).
- `tauri-plugin-hal-steamworks` — a Tauri-specific plugin, in production use by one shipped title
  (https://crates.io/crates/tauri-plugin-hal-steamworks).

Licensing is fine. The Steamworks SDK itself is redistributable for Steam-distributed apps under
Valve's SDK agreement; the Rust wrapper adds no encumbrance.

**Three problems, one of them serious.**

1. **The Steam overlay does not work.** This is confirmed, technical, and not a configuration
   mistake. Tauri uses `CreateCoreWebView2Controller`, which puts rendering in a separate
   `msedgewebview2.exe` process with a cross-process child HWND; **no D3D device is created in the
   application process**, so Steam's overlay — which hooks the app's DirectX/OpenGL/Metal/Vulkan
   swapchain — has nothing to hook
   (https://github.com/MicrosoftEdge/WebView2Feedback/issues/3200,
   https://github.com/tauri-apps/tauri/issues/6196,
   https://www.construct.net/en/blogs/ashleys-blog-2/trying-show-steam-overlay-1861).
   Consequence for us: no Shift-Tab overlay, no in-overlay friends/chat/invite flow, no Steam
   screenshot hotkey, degraded Steam Input configuration UX. For a VTT the overlay is not
   load-bearing for *gameplay*, but the **friend-invite flow is exactly how a GM would want to pull
   players into a session**, and losing it also costs us the "this feels like a real Steam app"
   perception. Workarounds discussed upstream (headless wgpu → texture → canvas, or a transparent
   second D3D window) are hacks with performance and focus costs
   (https://github.com/tauri-apps/tauri/discussions/11944).

2. **WebKitGTK on Linux is a liability, and Linux is where Steam Deck lives.** Tauri's own docs
   have a dedicated "Linux Graphics Issues" page: WebKitGTK's DMABUF renderer requests buffer
   formats NVIDIA drivers do not provide, producing "anything from a blank window to subtle
   rendering problems" (https://v2.tauri.app/develop/debug/linux-graphics/). Community reports
   describe WebGL-heavy views (maps, editors, terminals) with high input latency and low frame
   rates that are fast in a normal browser, and note WebKitGTK masks the renderer string so you
   cannot even detect software rasterisation
   (https://news.ycombinator.com/item?id=41565913,
   https://github.com/tauri-apps/tauri/discussions/8524,
   https://github.com/tauri-apps/wry/issues/890). **Our map viewport is precisely a WebGL-heavy
   view.** RB-02 already showed Linux is the weakest WebGPU target; Tauri makes it worse by
   removing Chromium from the equation entirely.

3. **WebView2 is not guaranteed present on Windows 10.** The Evergreen runtime ships with Windows
   11 but not reliably with Windows 10, which is still **23.56 %** of Steam
   (https://store.steampowered.com/hwsurvey/Steam-Hardware-Software-Survey-Welcome-to-Steam,
   https://www.techtimes.com/articles/319581/20260703/steam-hardware-survey-june-2026-windows-11-tops-70-amd-closes-intel.htm).
   Fixing this means a Steam InstallScript bootstrapper or bundling the fixed-version runtime
   (~150 MB, which erases Tauri's size advantage). A developer porting a browser game to Steam
   named exactly this — "will Steam's InstallScript successfully install the WebView2 runtime" — as
   their primary unresolved risk
   (https://log.schemescape.com/posts/game-development/browser-based-game-on-steam-2.html).

**One anecdote worth recording, marked [uncertain]:** a developer reported giving up on Tauri +
Steamworks SDK for the Steam Linux build and packaging in Electron instead
(https://news.ycombinator.com/item?id=46087456 — the thread returned HTTP 429 on direct fetch; this
is a second-hand search summary, not verified text).

### Electron

**What it is.** Bundled Chromium + bundled Node. Bigger, older, boring — and boring is the point.

**Steamworks integration.** The most mature of any web path:
- `steamworks.js` (ceifa) — a Rust-backed N-API implementation for nw.js/Electron, the current
  recommended binding; it is a native module and needs explicit configuration to be reachable from
  the renderer (https://github.com/ceifa/steamworks.js/).
- `greenworks` (Greenheart Games, originally built for Game Dev Tycoon) — the historical option,
  self-described as maintained "on a best-effort basis… active development is not a priority"
  (https://github.com/greenheartgames/greenworks). **Treat greenworks as legacy**; use
  steamworks.js.

**The overlay reportedly works.** Chromium-based shells (Electron, nw.js) do create an in-process
GPU/D3D path that the Steam overlay can hook, unlike WebView2
(https://github.com/MicrosoftEdge/WebView2Feedback/issues/3200,
https://www.construct.net/en/forum/construct-3/general-discussion-7/steam-overlay-solution-187966).
Steam's overlay supports DX7–12, OpenGL, Metal and Vulkan and is inactive for software-rasterised
apps — so the requirement is simply "be GPU-accelerated in-process". **[uncertain]** — in practice
this often requires specific launch flags (in-process GPU / sandbox tweaks) and must be proven by a
spike, not assumed.

**Bundled Chromium is a feature here, not just a cost.** Because we ship the browser:
- WebGL2/WebGPU behaviour is **deterministic across Windows, Linux and Steam Deck** — no
  WebKitGTK, no per-distro driver roulette. RB-02's entire "which 16 % is missing" problem
  disappears *for the desktop build*.
- We can pin a Chromium version, ship shader-validated builds, and let the desktop client be the
  **high-end renderer target** while the browser build degrades gracefully. That is a genuinely
  attractive product story: "the Steam client is the best version".
- **Electron already contains Node.** The GM's Steam client can host the campaign server in-process
  for browser-joining players. This makes intake **option D (asymmetric: GM buys the Steam client,
  players join free from a browser)** essentially free architecturally. Tauri would need a bundled
  Node sidecar or a Rust rewrite of the server to match this. This is the single strongest
  technical argument in the whole brief.

**Costs.** ~150–250 MB installed footprint and ~100–200 MB baseline RAM **[uncertain — order of
magnitude, must be measured on our own bundle]**. On Steam this is close to irrelevant: players
routinely download 50 GB games, Steam does chunked delta patching on depots, and there is no
"download size" competitive pressure the way there is on the open web. The RAM cost is real on a
GM's laptop that also runs Discord (itself Electron) and a browser.

**Precedent.** Foundry VTT's desktop application is Electron + Node server + PixiJS
(https://foundryvtt.com/article/frameworks/, https://deepwiki.com/foundryvtt/foundryvtt/1-overview).
Foundry is not sold on Steam, but it proves the runtime carries a full VTT. Vampire Survivors
shipped a Phaser/JS game to a million-plus Steam sales before later building a parallel Unity
engine (https://gamedevjs.com/games/vampire-survivors/,
https://www.pcgamingwiki.com/wiki/Vampire_Survivors) — precedent *and* cautionary tale: the web
stack got them to market; console ports later forced a second engine.

### Raw WebView2 + C++ (the third option nobody mentions)

One developer rejected Electron (bloat), Tauri (1 200 dependencies, unclear licence-compliance
docs) and Neutralino, and hand-rolled a WebView2 host in C++ — "natively supports C++, lightweight,
no other dependencies", but **Windows-only**
(https://log.schemescape.com/posts/game-development/browser-based-game-on-steam-2.html). It
inherits every WebView2 overlay and runtime-distribution problem above and adds a bespoke shell we
must maintain. **Reject** — it optimises for a constraint (binary size) we do not have.

### Can one codebase truly serve browser + desktop?

Yes, with a hard discipline: **all platform capability behind a `Platform` port with a browser
implementation and a desktop implementation.** What breaks if you skip this:

| Capability | Browser | Desktop wrapper | Mitigation |
|---|---|---|---|
| Filesystem | Opaque handles via File System Access API (Chromium only); no arbitrary paths | Full FS | Port with `openFile`/`saveFile`/`pickFolder` intents; never assume paths in domain code |
| Local server hosting | Impossible | Trivial (Electron: in-process Node; Tauri: Rust or sidecar) | Feature-flag "host a session" as desktop-only |
| Ports / LAN discovery | None | Bind a port, mDNS discovery | Desktop-only; browser clients receive an address |
| TLS for LAN play | Self-signed certs poison browsers (warnings, blocked service workers, no secure-context APIs) | Same problem for *joining browsers* | Do **not** self-sign. Use plain HTTP on localhost (a secure context) for the host, and a relay or tunnel for remote players. This is a known Foundry pain point and we should not repeat it |
| Auto-update | Service worker / reload | Steam depots **or** Electron autoUpdater | On Steam, updates must go through depots — a self-updater fights Steam's "Verify integrity of game files", which will silently revert self-patched files (reasoned consequence, not a quoted rule; Steam's own update guidance is depot-based: https://partner.steamgames.com/doc/sdk/updating, https://partner.steamgames.com/doc/store/updates) |
| Code signing | n/a | Needed for **direct** distribution only | Steam-delivered binaries do not need our signature to install. If we also sell direct: OV/EV keys must now live on FIPS 140-2 Level 2 hardware (since June 2023), EV no longer buys instant SmartScreen reputation (since 2024), and certificate lifetimes cap at 1 year from 2026-02-15 — vendor-sourced, **[uncertain]** (https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options, https://www.ssl.com/products/software-integrity/code-signing/ev/) |

The honest summary: **one codebase, two capability profiles.** That is a small, well-understood tax
(one adapter layer), not a fork.

---

## Game engines for a tool-like UI

The question is not "can this engine draw our map" — all four can, trivially. It is **"can this
engine build a rule-builder, a wiki, a compendium table and a theme editor without us
re-implementing a browser."**

### Godot 4.6 — the only engine that is a real contender, and it still loses

**In its favour.** MIT licence (no vendor, no royalty, no seat fee — the only engine we could
embed in a self-hosted bundle). Best-in-class Steam story: **GodotSteam** is actively maintained,
GDExtension form, latest release **2026-07-16** against GodotSteam 4.20.1 / Steamworks SDK 1.64,
covering Windows, Linux, macOS, Android, ARM64
(https://godotsteam.com/getting_started/introduction/,
https://godotengine.org/asset-library/asset/2445, https://codeberg.org/godotsteam/godotsteam/releases).
Small binaries, fast startup, sane 2D pipeline, WFC addons exist
(https://github.com/AlexeyBond/godot-constraint-solving — backtracking, multithreaded).

**F1 — node editor: genuinely good.** `GraphEdit`/`GraphNode` are first-class built-ins with
zoom, snapping, panning, and connection handling
(https://docs.godotengine.org/en/stable/classes/class_graphedit.html). Godot's own VisualShader is
built on them, and **Orchestrator** proves a full visual-scripting graph editor with hundreds of
node types is shippable in Godot (https://github.com/Vahera/godot-orchestrator). This is the one
committed feature where an engine is *not* worse than the web.

**F3 — rich text: this is where Godot dies.** "The only way to output rich text is
RichTextLabel/BBCode", and Godot's controls "are designed to work with horizontal text only"
(https://godotengine.org/article/complex-text-layouts-progress-report-3/,
https://github.com/godotengine/godot-proposals/issues/1182 — *still open*, titled "Rich text
output / **input**, RichTextLabel refactoring"). There is **no rich-text editing control**. Our
wiki/notes/journal — a core GM workload-reduction feature — would mean writing a text editor:
caret, selection, IME, undo, inline images, links, tables, spellcheck, find-in-page. That is a
multi-month project on its own and we would ship a worse editor than a `contenteditable` div gives
free.

**F4 — data tables: adequate, not good.** `Tree` and `ItemList` exist; there is no virtualised
data grid with column resize/sort/freeze/multi-select of the quality the compendium needs. Third
party fills gaps (https://emergent-realms.itch.io/godot-dataviz-ui) but that is now our
dependency risk.

**Docking:** Godot's own editor docks are position-locked and users cannot detach panels — an
open, long-standing complaint (https://github.com/godotengine/godot-proposals/issues/1508,
https://github.com/godotengine/godot-proposals/issues/14454). For *our* app we would use a
community addon (https://github.com/gilzoide/godot-dockable-container). Workable, unpolished.

**F2 — theming: possible, but a rebuild.** `Theme` resources + `StyleBox` give a token-ish system
and are serialisable, so a user-facing theme editor is *buildable*. But it is a bespoke system with
no cascade, no computed values, no media queries, no `color-mix()`, no design-token ecosystem, and
no contrast-validation tooling. Everything Aphrodite would get free from CSS custom properties, we
build by hand.

**F5 — accessibility: real, new, and explicitly experimental.** Godot 4.5 added AccessKit-backed
screen reader support "to Control nodes… and screen reader bindings in order to customize the
behavior of any type of Node", plus access to OS high-contrast and reduce-animation settings — but
"its integration is still in its **experimental** phase", and even the editor's own coverage is
limited to the Project Manager, standard UI nodes and the inspector
(https://godotengine.org/releases/4.5/, https://caniplaythat.com/2025/04/29/godot-4-5-improves-accessibility-support-including-screen-readers/,
https://www.gamedeveloper.com/programming/godot-4-5-ushers-in-accessibility-features-including-screen-reader-support).
**Godot 4.6's release notes do not mention accessibility at all** beyond editor-theme contrast
(https://godotengine.org/releases/4.6/) — i.e. no visible second push in the following release
cycle. Custom-drawn controls — which a themed, "sexy" UI is full of — are not covered.

**Verdict: reject.** Confirms RB-02 on a different basis. Godot loses on F3 outright and on F2/F4/F5
by accumulation. We would spend the project's first year rebuilding browser primitives.

### Unity 6 — the closest engine analogue to our architecture, and still a bad trade

**Licensing is settled and survivable.** The Runtime Fee was cancelled outright, effective
immediately, for Unity 6 and every other version; Unity returned to seat-based subscriptions
(https://unity.com/blog/unity-is-canceling-the-runtime-fee,
https://unity.com/blog/terms-update-runtime-fee-cancellation). Thresholds: Personal free to
**$200 000** revenue, Pro **$200 001–$24 999 999**, Enterprise above; **Pro/Enterprise prices rose
5 % on 2026-01-12** (https://unity.com/products/pricing-updates). Pro was ~$2 200/seat/year before
that increase (secondary source, **[dated]**:
https://www.strayspark.studio/blog/unity-engine-2026-state-comeback-runtime-fee-aftermath), so
~$2 300/seat/year now — **derived, verify at unity.com/pricing before any decision**. For a
commercial product intending to exceed $200 k, this is a recurring cost plus a vendor with a
demonstrated willingness to change terms retroactively.

**F2 — UI Toolkit is the best theming story any engine has.** UXML + USS are deliberately
HTML/CSS-shaped, and Unity 6 finally added a formal **runtime data binding** system (static
bindings in UI Builder, programmatic C# bindings, or hybrid), removing the old
"manually sync data in `Update()`" pain
(https://docs.unity3d.com/6000.3/Documentation/Manual/UIE-runtime-binding.html,
https://docs.unity3d.com/6000.2/Documentation/Manual/UIE-data-binding.html). USS supports variables
and selectors — a real token system. Unity is the only engine where F2 is not a from-scratch build.

**F5 — better than expected, with a caveat that matters.** Unity's Accessibility module
(`AssistiveSupport`, `AccessibilityHierarchy`) documents support for **Android/TalkBack,
iOS/VoiceOver, Windows/Narrator, macOS/VoiceOver**, works with both uGUI and UI Toolkit, and ships
an Accessibility Hierarchy Viewer for live inspection
(https://docs.unity3d.com/6000.4/Documentation/Manual/accessibility/module-intro.html,
https://docs.unity3d.com/6000.3/Documentation/Manual/accessibility.html). Two caveats, both
material: (a) the hierarchy is a **manually maintained parallel tree**, not derived from the UI —
every control we build must be mirrored by hand, and every refactor can silently break it;
(b) the documented Windows target is **Narrator**, not NVDA or JAWS, which are what most blind
users actually run. **[uncertain]** — I found no evidence of a shipped Unity desktop application
passing an NVDA/JAWS audit. Third-party plugins (UAP) exist, which itself tells you the built-in
story is incomplete (https://assetstore.unity.com/packages/tools/gui/ui-accessibility-plugin-uap-87935).

**F3 remains fatal.** UI Toolkit has no rich-text editing control either. Same wiki problem as
Godot.

**Precedent cuts both ways.** **Fantasy Grounds Unity** is a real VTT, built in Unity, shipping on
Steam with DLC monetisation (https://store.steampowered.com/app/1196310/Fantasy_Grounds_VTT/,
https://www.fantasygrounds.com/home/FantasyGroundsUnity.php) — proof the path works. It is also,
per RB-01, the competitor most often criticised for dated, clunky UI. That is not a coincidence:
building document-app UX in an engine is expensive, so it gets less polish per euro.

**Verdict: reject**, but this is the closest call. If Kaya ever mandates console ports, Unity is
the re-entry point.

### Unreal Engine 5 — no, and it is not close

Bluntly: **UE5 is the wrong tool for a text-and-forms application, and the money makes it worse.**

- **Royalty stacking.** 5 % of worldwide gross above the first **$1 M lifetime** per product,
  regardless of who collects it; waived for Epic Games Store revenue; 3.5 % under "Launch Everywhere
  with Epic" if you ship on EGS simultaneously
  (https://www.unrealengine.com/license, https://www.unrealengine.com/eula/unreal). On Steam that
  stacks with Valve's cut: at scale we would be paying roughly **35 % marginal** on Steam revenue
  (30 % Steam + 5 % Epic) — see RB-07 for the tier detail. Note the perverse incentive: Epic's
  waiver rewards us for driving sales *away* from the storefront we chose for discovery.
- **UI.** UMG/Slate is a game-HUD toolkit. Dense forms, a wiki editor, a virtualised compendium
  table and a user-facing theme editor in Slate is a tooling project with a game engine attached.
  There is no CSS-equivalent cascade; theming is per-widget style assets.
- **Binary size.** Multi-GB shipping builds and a 100 GB+ source/derived-data footprint for the
  developer. Our whole product is a few hundred MB of code and user assets.
- **Iteration.** C++ compile times and Blueprint churn against Vite's sub-second HMR is not a
  comparison, it is a category error.
- **Ironically, its accessibility story is the best-documented of the engines**: the Slate Screen
  Reader plugin vocalises accessible Slate/UMG elements to **NVDA, JAWS and VoiceOver**, enabled via
  `Accessibility.Enable=1` (https://dev.epicgames.com/documentation/unreal-engine/supporting-screen-readers-in-unreal-engine,
  https://dev.epicgames.com/documentation/unreal-engine/blind-accessibility-features-overview-in-unreal-engine).
  But the supported widget list is short — Text Block, Editable Text Box, Slider, Button, Checkbox —
  and anything else needs a C++ `SWidget::CreateAccessibleWidget()` override per control. Five
  widget types does not cover a compendium, a node graph or a character sheet.

**Verdict: reject.** Confirms RB-02. Tell Kaya plainly: UE5 buys us photoreal 3D we do not want and
charges us 5 % plus a year of UI engineering for the privilege.

### Bevy — no

Bevy 0.18 shipped March 2026 with a stable renderer, and `bevy_feathers` now provides themed
widgets aimed at editors and inspectors
(https://www.strayspark.studio/blog/bevy-rust-game-engine-2026-indie-guide,
https://bevy.org/examples/ui-user-interface/standard-widgets/). But **text input is still being
upstreamed** (https://github.com/bevyengine/bevy/issues/19752,
https://github.com/ickshonpe/bevy_ui_text_input), and the project's own guidance is that widget
patterns "are likely to change substantially as the `bevy_ui_widgets` crate matures". An engine
where a text field is an open issue cannot host a wiki, a rule-builder and a theme editor. Add Rust
compile times, per-release breaking changes, and the thinnest AI-assist training corpus of any
option. **Reject.**

---

## Hybrid DOM + WebGPU viewport

This is the Foundry pattern and it is what RB-02 already recommended: **the DOM is authoritative,
the canvas is one view of it.** Foundry draws its scene with PixiJS to a full-screen `<canvas>`
while every panel, sheet, journal and dialog is DOM
(https://foundryvtt.com/article/frameworks/, https://foundryvtt.wiki/en/development/guides/pixi).

### Does it deliver "game-engine feel"?

Yes — with the caveat that *feel* comes from craft, not engine class. RB-02 documented Owlbear
Rodeo's two-person team shipping GPU dynamic fog with soft shadows, a 600-option weather system, a
tiled renderer for 144-megapixel maps and 100+ animated tokens, in a browser tab. PixiJS v8 offers
WebGPU + WebGL2 + an experimental Canvas2D floor with `autoDetectRenderer()`
(https://pixijs.com/8.x/guides/components/renderers, https://pixijs.com/blog/8.16.0).

**What web tech does deliver:** sprite atlases and batching, tilemaps, custom fragment shaders
(lighting, fog, weather, colour grading), render textures, particle containers, skeletal animation
via Spine/DragonBones Pixi runtimes, camera easing and parallax, 60 fps with 1 000+ sprites.

**Where it genuinely falls short:**
- **3D and 2.5D.** No Talespire-class 3D. (three.js is the escape hatch RB-02 documented; a
  different project.)
- **Physics and large simulations.** No built-in solver; anything heavy wants WASM or WebGPU
  compute, which is bespoke work.
- **Asset pipeline and editor tooling.** Engines give you an importer, an inspector, a scene editor
  and a profiler. We build every one of those or do without.
- **Memory and thread control.** No native memory layout control; browser WASM threading needs
  COOP/COEP headers which, as RB-02 showed, poison embedding and self-hosting.
- **Perf ceiling.** Roughly one order of magnitude below native for draw-call-bound or
  CPU-simulation-bound scenes. Irrelevant for a tile map with a few hundred tokens.

### Can WebGPU close the gap in 2026? Partly — and it does not matter for the desktop build

RB-02's support matrix stands: WebGPU shipped in Chrome 113+, Safari 26 (macOS Tahoe/iOS 26),
Firefox 141/145/147 on Windows and macOS with **Linux still targeted "during 2026"**
(https://github.com/gpuweb/gpuweb/wiki/Implementation-Status, https://web.dev/blog/webgpu-supported-major-browsers).
Aggregate coverage is quoted between ~70 % and ~85 % depending on the tracker — all
marketing-grade **[uncertain]** (https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/).
Foundry itself deferred PixiJS v8 partly because "WebGPU's API is not yet entirely stable" and
custom batch rendering was missing (https://foundryvtt.com/releases/13.332,
https://foundryvtt.com/article/v13-patreon-vote/) — the most experienced VTT team in the world is
waiting, which is the single best evidence available.

**But here is the point K6 changes:** on a **bundled-Chromium desktop build we choose the browser**.
The WebGPU support matrix stops being a distribution risk and becomes a build-configuration choice.
The Steam client can enable the WebGPU path with a known-good Chromium and validated shaders while
the web build stays on WebGL2. Shipping to Steam therefore *improves* our rendering ceiling rather
than costing us anything — the opposite of the intuition that pushed us toward engines.

### WFC (K5d) is path-independent

Reference and ports exist for JS, TypeScript, Rust, C#, GDScript and more
(https://github.com/mxgmn/WaveFunctionCollapse, https://github.com/topics/wave-function-collapse).
Godot has a backtracking multithreaded solver (https://github.com/AlexeyBond/godot-constraint-solving).
For us, WFC is a constraint solver over tile adjacency — pure computation, no rendering. It belongs
in a worker (Web Worker, or a Rust/WASM module if profiling demands) and it **must not influence the
client-tech decision**. Do not let a generation algorithm choose our UI toolkit.

---

## Accessibility per path

Accessibility is one of our five differentiation axes (intake tension #3). This section is
therefore a *ranking of differentiation capacity*, not a compliance checklist.

**Two truths that apply to every path:**

1. **The map canvas is inaccessible everywhere.** A canvas is a pixel buffer; a Godot/Unity/UE
   viewport is the same. RB-02's answer — DOM proxies per interactive object, keyboard token
   movement as a first-class input mode, a canonical DOM "scene outline" panel, coalesced
   `aria-live` announcements — is the design that solves it, and it is a *design* solution, not a
   toolkit feature. In DOM paths it is cheap (PixiJS ships an accessibility module that overlays
   focusable elements: https://pixijs.com/8.x/guides/components/accessibility). In engine paths we
   would build the whole parallel model ourselves.
2. **Only the DOM gives it to us by default for the other 90 % of the app.** Sheets, wiki,
   compendium, rule-builder, dialogs, menus — these are where a screen-reader user spends their
   time, and in a DOM path they are accessible unless we actively break them.

**Ranking, most to least capable:**

| Rank | Path | Evidence |
|---|---|---|
| 1 | **Browser / Electron / Tauri (DOM)** | Native semantics, ARIA, real focus management, browser find, text selection, IME, user font scaling and zoom, `prefers-reduced-motion`, `prefers-contrast`, Windows forced-colors mode, and a mature audit toolchain (axe-core, Playwright + axe in CI, Lighthouse). Works with NVDA, JAWS, Narrator, VoiceOver and Orca because the webview exposes a real accessibility tree (UIA on Windows via WebView2/Chromium; AT-SPI on Linux). **Existence proof: VS Code is Electron and ships an audited screen-reader mode used daily by blind developers** — well-documented, not re-verified in this pass. |
| 2 | **Unreal Engine 5** | Slate Screen Reader plugin drives NVDA/JAWS/VoiceOver — but only ~5 UMG widget types out of the box; anything custom needs a C++ override per widget (https://dev.epicgames.com/documentation/unreal-engine/supporting-screen-readers-in-unreal-engine). |
| 3 | **Unity 6** | Accessibility module documents Narrator (Windows) and VoiceOver (macOS) plus mobile readers, works with UI Toolkit, has a hierarchy viewer — but the hierarchy is hand-maintained and NVDA/JAWS coverage is unevidenced (https://docs.unity3d.com/6000.4/Documentation/Manual/accessibility/module-intro.html). |
| 4 | **Godot 4.5/4.6** | AccessKit integration is real and welcome, exposes OS high-contrast and reduce-animation settings, but is **self-described experimental**, covers standard Control nodes only, and saw no visible follow-up in 4.6 (https://godotengine.org/releases/4.5/, https://godotengine.org/releases/4.6/). |
| 5 | **Bevy** | No accessibility story worth citing at this maturity. |

**Note the strategic asymmetry, which is the whole reason this axis is a differentiator:** Foundry,
Roll20, Owlbear and Let's Role are all web apps and *could* follow us here but largely have not;
Fantasy Grounds and Talespire are Unity apps and structurally *cannot* follow us cheaply. Choosing
an engine would voluntarily move us into the group that cannot compete on this axis.

Between the two wrappers: **Electron ≥ Tauri on accessibility**, because Chromium's a11y tree is
identical everywhere we ship, whereas Tauri inherits WebKitGTK's weaker Linux a11y and WebView2's
Windows behaviour separately — two implementations to audit instead of one. **[uncertain]** —
reasoned from architecture, not from a comparative audit.

---

## Effort & risk for a solo dev

Kaya is one person with an AI crew. This section weights *what a solo operator can actually
sustain*, which is a different question from *what a studio would choose*.

| Dimension | Web + wrapper | Godot 4.6 | Unity 6 | UE5 | Bevy |
|---|---|---|---|---|---|
| **Relative build effort for F1–F6** | 1.0× (baseline) | ~2.5–3× (rich-text editor, data grid, docking, theme system all bespoke) | ~2–2.5× (UI Toolkit helps; rich text still bespoke) | ~4×+ | ~5×+ |
| **AI-assist density** | Highest — React/TS/CSS is the most-represented stack in any model's training data; the crew can generate and review it fluently | Moderate — GDScript corpus is much thinner; addon APIs churn | Good for C# gameplay, **thin for UI Toolkit tool UI** (a newer, less-documented API) | Thin for UMG/Slate tool UI | Lowest — small corpus, breaking releases every ~3 months |
| **Hot reload / iteration** | Vite HMR, sub-second, state-preserving | Scene reload; GDScript reload partial | Domain reload, seconds-to-tens-of-seconds | Live Coding + long C++ builds | Full Rust recompiles |
| **Headless testability** | vitest for logic; Playwright for E2E; **axe-core in CI for a11y** — the only path with automated accessibility regression testing | `--headless` + GUT/gdUnit4 | Unity Test Framework headless | Automation exists, heavy | cargo test |
| **Desktop E2E** | **Electron: Playwright's `_electron.launch()`, first-party (experimental but real)** (https://playwright.dev/docs/api/class-electron, https://www.electronjs.org/docs/latest/tutorial/automated-testing). **Tauri: `tauri-driver` WebDriver — Windows/Linux only, no macOS client; Playwright works only on Windows because only WebView2 speaks CDP** (https://v2.tauri.app/develop/tests/webdriver/, https://v2.tauri.app/develop/tests/webdriver/ci/, https://github.com/srsholmes/tauri-playwright) | Limited | Limited | Limited | Limited |
| **CI on Windows** | GitHub Actions `windows-latest`, no licensing step; Tauri WebDriver on GHA is demonstrated but brittle when the runner's WebView2 version drifts from the driver (https://github.com/Haprog/tauri-wdio-win-test/) | Straightforward, export templates cached | **Needs Unity licence activation in CI** — real recurring friction | Needs 100 GB+ runners, effectively self-hosted | Long cold builds |
| **Hiring / contractor availability** if Kaya ever needs help | Largest talent pool by an order of magnitude | Small but growing | Large (games), small (Unity *tool* UI) | Large but expensive | Tiny |
| **Version-control shape** | Plain git, text diffs, reviewable | git + some binary | Needs Git LFS + YAML merge tooling | Needs LFS/Perforce | Plain git |

**The decisive solo-dev argument.** Every engine path front-loads months of infrastructure —
rich-text editing, virtualised tables, docking, a theme system, an a11y layer — *before* the first
differentiating feature exists. A solo dev cannot amortise that. The web path front-loads
essentially none of it, and defers its own hard problem (renderer craft) to a component the
competition has already proven is achievable by two people.

---

## Decision table

Scores: ●●●● excellent · ●●●○ good · ●●○○ workable with effort · ●○○○ poor · ○○○○ absent.
"Effort" is relative build cost for the committed feature set — lower is better.

| Path | Steam-ready? | Browser-capable? | Complex-UI quality (F1–F4) | a11y (F5) | Map/sprite power (F7) | Effort | Verdict |
|---|---|---|---|---|---|---|---|
| **Electron + React/TS + PixiJS** | **Yes** — mature `steamworks.js`, overlay reportedly hooks Chromium's in-process GPU **[verify by spike]**, bundled Chromium = deterministic on Steam Deck | **Yes — same codebase** | ●●●● | ●●●● | ●●●○ (2D ceiling; deterministic WebGPU on desktop) | 1.0× | **RECOMMENDED** |
| **Tauri v2 + React/TS + PixiJS** | Partly — Steamworks bindings fine, but **no Steam overlay** (WebView2, confirmed upstream) and WebView2 runtime install on Win10 | Yes — same codebase | ●●●● | ●●●○ (two webview a11y implementations to audit) | ●●○○ (**WebKitGTK on Linux/Deck is a documented graphics liability**) | 1.05× | **Fallback only** — revisit if Tauri gains a Chromium/CEF backend |
| **Raw WebView2 + C++** | Partly — same overlay problem | Windows only | ●●●● | ●●●○ | ●●○○ | 1.3× | Reject |
| **Godot 4.6** | **Yes** — GodotSteam is the best engine Steam story (MIT, active, SDK 1.64) | No (25–35 MB wasm, tab-pause, COOP/COEP — RB-02) | ●●○○ (**GraphEdit excellent; no rich-text editing at all**) | ●●○○ (AccessKit, experimental) | ●●●● | 2.5–3× | Reject |
| **Unity 6** | **Yes** — first-party, Fantasy Grounds precedent | No (~50 MB WebGL, experimental WebGPU) | ●●●○ (UXML/USS best engine theming; no rich-text editing) | ●●○○ (manual hierarchy; Narrator, not NVDA/JAWS) | ●●●● | 2–2.5× | Reject; re-entry point only if consoles are mandated |
| **Unreal Engine 5** | Yes — **at 5 % royalty stacking on Steam's cut** | **No web export at all** (removed in 4.24) | ●○○○ | ●●●○ (best engine docs, ~5 widget types) | ●●●● (overkill) | 4×+ | Reject, emphatically |
| **Bevy 0.18** | Yes (steamworks-rs) | Yes but 15–30 MB wasm | ●○○○ (**text input still being upstreamed**) | ○○○○ | ●●●○ | 5×+ | Reject |
| **Web only, no Steam** (status quo ante) | No | Yes | ●●●● | ●●●● | ●●●○ | 0.95× | Viable, but forgoes Steam discovery + Workshop (RB-07/RB-10) |

---

## Recommendation

**Ship the existing web architecture (React/TS + PixiJS, DOM-authoritative) inside an Electron
shell for Steam, and keep the browser build from the same codebase.**

This is not a compromise — on the evidence it dominates:

1. **It is the only path that satisfies F1–F6 without rebuilding browser primitives.** Rich text,
   dense tables, dynamic token-driven theming, localisation and accessibility are all *given*. Every
   engine path pays months for them, and pays again on every refactor.
2. **It does not cost us F7.** RB-02 settled that "game-engine feel" is shader craft, not an engine
   licence, with a two-person team as the existence proof. Bundled Chromium makes the desktop build
   the *strongest* renderer target we have, not the weakest.
3. **Electron over Tauri is decided by three concrete findings**, not by taste: the Steam overlay
   hooks Chromium but not WebView2; WebKitGTK is a documented graphics liability on exactly the
   Linux/Steam Deck target Tauri would force us onto; and Electron already contains Node, which
   makes intake **option D** (GM's Steam client hosts, players join free in a browser) an
   architectural freebie instead of a second runtime. Tauri's advantage — binary size — is worth
   nothing on a storefront where nobody counts megabytes.
4. **It keeps every distribution option open.** Options A (self-host), C (hybrid) and D (asymmetric)
   are all reachable from one codebase. Option B (Steam-native only) is the only one this forecloses,
   and it is the option that would cost us the accessibility differentiation axis.
5. **It preserves the differentiation thesis.** Accessibility and the visual rule-builder are two of
   our five winnable axes (intake tension #3). Both are DOM-native strengths. An engine path would
   move us into the group of competitors that structurally cannot compete on accessibility, while
   gaining us map fidelity we have no evidence we need.

**Prerequisite spikes before this becomes a verdict** (feed into RB-11):
- **S1 — Steam overlay on Electron.** Build a throwaway Electron app + `steamworks.js`, launch via
  Steam, confirm Shift-Tab overlay, screenshots and friend invites. Record any launch flags needed.
  *This is the one finding in the brief I could not verify directly and it is load-bearing.*
- **S2 — Steam Deck.** Run the Linux Electron build on a Deck (native and via Proton). Measure the
  Pixi viewport frame time and confirm the on-screen keyboard and Steam Input behave in a
  keyboard/mouse-shaped app.
- **S3 — Workshop.** Prove `steamworks.js` UGC upload/subscribe round-trips a rule package (feeds
  RB-10).
- **S4 — Depot delta.** Push two Electron builds to a Steam depot and measure patch size; confirm
  "Verify integrity" does not fight our asset cache.
- **S5 — a11y in the shell.** Run NVDA against the Electron build, not just Chrome, and confirm the
  accessibility tree survives the wrapper.
- **S6 — Measure, do not assume.** Installed size and idle RAM of our own bundle; the 150–250 MB /
  100–200 MB figures in this brief are order-of-magnitude only.

---

## Sources

**Wrappers and Steam integration**
- Tauri (framework) — Wikipedia: https://en.wikipedia.org/wiki/Tauri_(software_framework)
- Tauri webview versions: https://v2.tauri.app/reference/webview-versions/
- Tauri Linux graphics issues: https://v2.tauri.app/develop/debug/linux-graphics/
- Tauri issue #6196, Steam Overlay: https://github.com/tauri-apps/tauri/issues/6196
- WebView2Feedback #3200, WebView2 + Steam Overlay: https://github.com/MicrosoftEdge/WebView2Feedback/issues/3200
- Construct blog, "Trying to show the Steam Overlay over WebView2": https://www.construct.net/en/blogs/ashleys-blog-2/trying-show-steam-overlay-1861
- Construct forum, Steam overlay solution for Electron apps: https://www.construct.net/en/forum/construct-3/general-discussion-7/steam-overlay-solution-187966
- Tauri discussion #11944, wgpu overlay workarounds: https://github.com/tauri-apps/tauri/discussions/11944
- Tauri discussion #8524 / wry #890, WebKitGTK performance: https://github.com/tauri-apps/tauri/discussions/8524 · https://github.com/tauri-apps/wry/issues/890
- HN, WebKitGTK performance: https://news.ycombinator.com/item?id=41565913
- HN thread on Tauri + Steam **[unverified, 429 on fetch]**: https://news.ycombinator.com/item?id=46087456
- Schemescape, porting a browser game to Steam (parts 1–2): https://log.schemescape.com/posts/game-development/browser-based-game-on-steam.html · https://log.schemescape.com/posts/game-development/browser-based-game-on-steam-2.html
- steamworks-rs (Noxime): https://github.com/Noxime/steamworks-rs · https://crates.io/crates/steamworks
- tauri-plugin-hal-steamworks: https://crates.io/crates/tauri-plugin-hal-steamworks
- steamworks.js (ceifa): https://github.com/ceifa/steamworks.js/
- greenworks (maintenance status): https://github.com/greenheartgames/greenworks
- Steamworks update docs: https://partner.steamgames.com/doc/sdk/updating · https://partner.steamgames.com/doc/store/updates
- Code signing options (Microsoft Learn): https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options
- EV code signing (SSL.com) **[vendor source]**: https://www.ssl.com/products/software-integrity/code-signing/ev/

**Engines**
- Godot 4.5 release notes (AccessKit, experimental): https://godotengine.org/releases/4.5/
- Godot 4.6 release notes: https://godotengine.org/releases/4.6/
- Can I Play That, Godot 4.5 accessibility: https://caniplaythat.com/2025/04/29/godot-4-5-improves-accessibility-support-including-screen-readers/
- Game Developer, Godot 4.5 accessibility: https://www.gamedeveloper.com/programming/godot-4-5-ushers-in-accessibility-features-including-screen-reader-support
- Godot GraphEdit / GraphNode: https://docs.godotengine.org/en/stable/classes/class_graphedit.html · https://docs.godotengine.org/en/stable/classes/class_graphnode.html
- Godot Orchestrator (visual scripting proof): https://github.com/Vahera/godot-orchestrator
- Godot complex text layouts report #3: https://godotengine.org/article/complex-text-layouts-progress-report-3/
- Godot proposal #1182, rich text input **[still open]**: https://github.com/godotengine/godot-proposals/issues/1182
- Godot proposals #1508 / #14454, docking: https://github.com/godotengine/godot-proposals/issues/1508 · https://github.com/godotengine/godot-proposals/issues/14454
- gilzoide/godot-dockable-container: https://github.com/gilzoide/godot-dockable-container
- GodotSteam: https://godotsteam.com/getting_started/introduction/ · https://godotengine.org/asset-library/asset/2445 · https://codeberg.org/godotsteam/godotsteam/releases
- godot-constraint-solving (WFC): https://github.com/AlexeyBond/godot-constraint-solving
- Unity, cancelling the Runtime Fee: https://unity.com/blog/unity-is-canceling-the-runtime-fee · https://unity.com/blog/terms-update-runtime-fee-cancellation
- Unity pricing updates (thresholds, 2026-01-12 increase): https://unity.com/products/pricing-updates
- Unity Pro seat price **[dated, secondary]**: https://www.strayspark.studio/blog/unity-engine-2026-state-comeback-runtime-fee-aftermath
- Unity Accessibility module (platform/screen-reader table): https://docs.unity3d.com/6000.4/Documentation/Manual/accessibility/module-intro.html · https://docs.unity3d.com/6000.3/Documentation/Manual/accessibility.html
- Unity UI Toolkit runtime data binding: https://docs.unity3d.com/6000.3/Documentation/Manual/UIE-runtime-binding.html · https://docs.unity3d.com/6000.2/Documentation/Manual/UIE-data-binding.html
- UI Accessibility Plugin (UAP): https://assetstore.unity.com/packages/tools/gui/ui-accessibility-plugin-uap-87935
- Unreal Engine licensing / royalty: https://www.unrealengine.com/license · https://www.unrealengine.com/eula/unreal
- Unreal screen reader support: https://dev.epicgames.com/documentation/unreal-engine/supporting-screen-readers-in-unreal-engine · https://dev.epicgames.com/documentation/unreal-engine/blind-accessibility-features-overview-in-unreal-engine
- Bevy standard widgets / text input upstreaming: https://bevy.org/examples/ui-user-interface/standard-widgets/ · https://github.com/bevyengine/bevy/issues/19752 · https://github.com/ickshonpe/bevy_ui_text_input
- Bevy 0.18 in 2026 **[secondary]**: https://www.strayspark.studio/blog/bevy-rust-game-engine-2026-indie-guide

**Rendering, hybrid and precedent**
- PixiJS renderers (WebGPU experimental, WebGL recommended): https://pixijs.com/8.x/guides/components/renderers
- PixiJS 8.16.0 (Canvas2D fallback, 2026-02-04): https://pixijs.com/blog/8.16.0
- PixiJS accessibility module: https://pixijs.com/8.x/guides/components/accessibility
- Foundry VTT frameworks (Electron, Node, PixiJS): https://foundryvtt.com/article/frameworks/ · https://deepwiki.com/foundryvtt/foundryvtt/1-overview · https://foundryvtt.wiki/en/development/guides/pixi
- Foundry v13 release / Pixi v8 deferral: https://foundryvtt.com/releases/13.332 · https://foundryvtt.com/article/v13-patreon-vote/
- W3C GPU-for-the-Web implementation status: https://github.com/gpuweb/gpuweb/wiki/Implementation-Status
- web.dev, WebGPU in major browsers: https://web.dev/blog/webgpu-supported-major-browsers
- WebGPU coverage estimate **[marketing-grade]**: https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/
- mxgmn/WaveFunctionCollapse (reference + port list): https://github.com/mxgmn/WaveFunctionCollapse · https://github.com/topics/wave-function-collapse
- Fantasy Grounds VTT on Steam: https://store.steampowered.com/app/1196310/Fantasy_Grounds_VTT/ · https://www.fantasygrounds.com/home/FantasyGroundsUnity.php
- Fantasy Grounds Unity on Steam with Linux support: https://www.gamingonlinux.com/2020/09/virtual-tabletop-app-fantasy-grounds-unity-appears-on-steam-with-linux-support/
- Vampire Survivors (Phaser → Steam → parallel Unity engine): https://gamedevjs.com/games/vampire-survivors/ · https://www.pcgamingwiki.com/wiki/Vampire_Survivors

**Platform data and tooling**
- Steam Hardware & Software Survey: https://store.steampowered.com/hwsurvey/Steam-Hardware-Software-Survey-Welcome-to-Steam
- Steam survey June 2026 (Win11 70.44 %, Win10 23.56 %): https://www.techtimes.com/articles/319581/20260703/steam-hardware-survey-june-2026-windows-11-tops-70-amd-closes-intel.htm
- Steam survey Linux share, June 2026 (3.69 %; SteamOS Holo 0.84 %): https://www.gamingonlinux.com/2026/07/steam-survey-june-2026-shows-linux-dip-to-3-69-percent/
- Playwright Electron: https://playwright.dev/docs/api/class-electron · https://www.electronjs.org/docs/latest/tutorial/automated-testing
- Tauri WebDriver testing + CI: https://v2.tauri.app/develop/tests/webdriver/ · https://v2.tauri.app/develop/tests/webdriver/ci/
- tauri-playwright (Windows-only CDP limitation): https://github.com/srsholmes/tauri-playwright
- Tauri WebdriverIO on GitHub Actions Windows: https://github.com/Haprog/tauri-wdio-win-test/
