# Visual Reset — die lebende Sternwarte

**Ruling:** The round-5 HTML artifacts are executable product arguments, not visual ancestors.
They proved data, projection and interaction ideas. Visually they converge on the same beige,
dense admin-tool shell. Adding more blur or more CSS to that shell will not produce the product
Kaya asked for.

The next visual work is a **React design lab** built around one unforgettable vertical slice:
Andaria as the stage, a living table state, four real Eron figures, and one canon-minting reveal.
Only after that slice is good enough to want on screen for four hours do we distil the kit.

## The direction

Working name: **die lebende Sternwarte**.

The world is the luminous object in the room. UI sits above it as restrained instruments:
smoked glass, dark mineral surfaces, fine metallic edges, spectral teal and ember-gold light,
soft volumetric depth, crisp typography and deliberate negative space. Fantasy comes from
material, light, cartography and motion — not parchment covering every panel and not ornamental
fonts covering every label.

The visual hierarchy is:

1. **Stage:** the map or current story object owns the largest uninterrupted surface.
2. **Constellation:** actors, places and unresolved doors appear as spatially related signals,
   not a permanent spreadsheet.
3. **Lens:** selecting one thing opens a focused contextual instrument; the rest recedes.
4. **Ritual:** consequential actions — reveal, roll, mint, defeat — receive authored staging,
   sound hooks and a visible before/after state.
5. **Archive:** dense data remains available, but behind progressive disclosure rather than
   occupying the first frame.

Glass is a **material token** for floating controls and lenses. It is not applied to every card.
On low-power, high-contrast and reduced-transparency modes it becomes an opaque surface without
changing layout.

## Source-owned React stack

Use a small, explicit stack. No monolithic “fantasy UI” dependency and no library soup.

| Layer | Choice | Why |
| --- | --- | --- |
| Semantics and behaviour | React 19 + TypeScript | Already pinned; required by the current PixiJS React integration |
| Accessible primitives | Radix Primitives, composed in a shadcn-style local registry | Keyboard/focus behaviour is solved while the visual source remains ours |
| Styling | CSS variables + Tailwind utilities in the design lab | Fast material exploration without surrendering semantic tokens |
| Product motion | Motion for React | Layout, presence, gesture and interruptible spring transitions map cleanly to React state |
| Table renderer | PixiJS v8 behind `MapRenderer`; `@pixi/react` only inside that boundary | A real GPU-backed map without turning documents and controls into canvas |
| Signature effects | Selected React Bits / Aceternity components copied and rewritten into our registry | Pattern and shader vocabulary, not a permanent runtime contract |
| Authored hero animation | Rive only if the reveal/mint ritual needs a designer-authored state machine | Optional; never required for core interaction or accessibility |

References checked 2026-07-27:

- Radix Primitives: <https://www.radix-ui.com/primitives/docs/overview/introduction>
- shadcn registry model: <https://ui.shadcn.com/docs/registry/getting-started>
- Motion for React: <https://motion.dev/docs/react>
- PixiJS React integration: <https://pixijs.com/8.x/guides/getting-started/ecosystem>
- React Bits: <https://www.reactbits.dev/>
- Aceternity UI: <https://ui.aceternity.com/explore>
- Rive React runtime: <https://rive.app/docs/runtimes/react/parameters-and-return-values>

Do **not** adopt an old “react glassmorphism” package as the base. Glass is straightforward to
implement as our own material recipe; behaviour, accessibility, motion orchestration and the map
renderer are the parts worth buying from mature libraries.

## First design-lab slice

One route, not a dashboard collection:

`/lab/table?world=eron&scene=andaria&moment=reveal`

It must contain:

- the real Andaria map, tile-backed where needed;
- Olav der Ehrliche, Song Kayn, Oggugat and the earlier companion Yal'it as the real player party;
- one concealed region and one actionable door;
- a contextual lens that previews exactly who learns what;
- a staged reveal → roll → minted paragraph transition;
- role switch (GM/player), art-off, high contrast, reduced motion and narrow layout;
- an outline/DOM equivalent for the map state.

## Craft gates

The lab does not pass because it has many components. It passes when:

1. **Five-second read:** a new viewer names the map/state as the focus, not the navigation.
2. **One screenshot worth sharing:** the default frame looks like a paid game tool, not an admin
   panel or a component catalogue.
3. **One interaction worth replaying:** reveal → roll → mint has authored anticipation, impact and
   residue; reduced motion preserves the state change without spectacle.
4. **Material discipline:** at most three elevation/material tiers are visible at once; glass is
   reserved for instruments over the stage.
5. **No-art survival:** disabling campaign art keeps hierarchy, identity and usability intact.
6. **Real responsiveness:** 1600×1000 and ~390 px are composed states, not a squeezed desktop.
7. **Measured accessibility:** keyboard completion, visible focus, contrast checks and no
   information encoded only by glow, motion or colour.
8. **Measured performance:** interaction stays responsive on the target integrated-GPU laptop;
   shaders and blur have named fallbacks.

## Sequence

1. Preserve round 5 as product lineage; do not polish it.
2. Build the React lab and compare two materially different hero compositions using the same
   tokens and behaviour.
3. Choose by running the craft gates on screen.
4. Extract tokens, primitives, motion recipes and map overlays into the local registry.
5. Resume product rounds with that registry as the visual floor.

This reset does not make the product smaller. It stops us from multiplying a visual language that
Kaya has already rejected.

## Implementation landed

The first React lab now lives at [`visual-lab/`](visual-lab/). It renders the real Andaria map,
actors, concealed/revealed states, the context lens, the reveal result and the human canon
confirmation. Deterministic desktop and 390×844 captures live under
[`visual-lab/artifacts/`](visual-lab/artifacts/).

This is a visual and interaction proof. It deliberately uses a DOM image, not Pixi, and therefore
does not retire the `MapRenderer`, tile-streaming or GPU-performance debts.
