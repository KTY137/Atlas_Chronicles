# Owlbear Rodeo — Research Brief

Project Chronicle competitive research, RB-01. Access date for all sources: **2026-07-26**.
Target: Owlbear Rodeo 2.x (owlbear.rodeo), the minimalist browser VTT by a two-person team.
Note: owlbear.rodeo and docs.owlbear.rodeo blocked automated fetching (HTTP 403); claims for
those properties are reconstructed from the official blog, official extensions directory,
search-indexed documentation snippets, and third-party articles — flagged where secondhand.

## Platform & pricing

- **Platform:** pure browser SaaS, no install, desktop and mobile browsers. 2.3's "Warp Core"
  GPU renderer explicitly targets cross-platform performance — a 137-megapixel map demoed
  loading on an iPhone 14 Pro Max (https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/).
- **Self-hosting:** only the deprecated **1.0 "Legacy"** codebase, released source-available
  under a **non-commercial** license with Dockerfile/docker-compose; unmaintained
  (https://github.com/owlbear-rodeo/owlbear-rodeo-legacy,
  https://blog.owlbear.rodeo/owlbear-rodeo-legacy-edition/). 2.x is closed SaaS. The devs
  explicitly rejected the Foundry self-host model as adding setup complexity
  (https://blog.owlbear.rodeo/state-of-the-rodeo-lets-talk-about-subscriptions/).
- **Pricing (freemium, GM-pays):** subscription tiers gate **storage and room count, not play
  features**. Free "Nestling": 100 MB cloud storage, ~2 rooms. "Fledgling": $3.99/mo or
  $39.99/yr, 5 GB, 10 rooms. "Bestling": $7.99/mo or $79.99/yr, 10 GB, 25 rooms, custom room
  names/backgrounds, higher asset limits (50 MB files / 144-megapixel maps), and early access
  to beta features (docs.owlbear.rodeo/docs/managing-your-subscription/ via search snippets;
  https://www.enworld.org/threads/owlbear-rodeo-news-a-second-full-timer-cloud-storage-and-subscriptions-including-a-base-free-tier.688849/;
  tier perks per https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/ and
  https://blog.owlbear.rodeo/owlbear-rodeo-2-4-release-notes/). **Uncertain:** one April-2026
  comparison claims paid plans "start at $6/month"
  (https://blacklanternforge.com/blogs/news/roll20-vs-foundry-vtt-vs-owlbear-rodeo-which-virtual-tabletop-is-right-for-your-campaign)
  — possibly a 2025/26 price rise or an article error; verify on owlbear.rodeo/pricing.
- **Only the room owner (GM) needs a subscription; players join free and anonymously** via a
  room link with a join-approval knock — no player account needed unless they upload custom
  images (docs.owlbear.rodeo/docs/rooms/ and /docs/getting-started/ via search snippets).
- **No content marketplace.** No first-party map/adventure store; extensions are free
  ("All extensions remain open-source and free to users",
  https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/). Community extension devs
  monetize themselves via Patreon (e.g. https://www.patreon.com/cw/SeamusFinlayson,
  https://www.patreon.com/cw/battlesystem) — the ecosystem's economics live entirely outside
  the platform. The company's stated philosophy: charge for the product itself, no ads even on
  free tier, free tier deliberately playable for low-income users
  (https://blog.owlbear.rodeo/state-of-the-rodeo-lets-talk-about-subscriptions/).

## Feature inventory

**Core (first-party):**
- **Maps/tokens/fog:** battle maps up to very high resolutions, token management, drawing
  tools (Bézier path editing, shape editor), manual fog of war with four editing modes
  (Fit/Overlay/Trim/Join) plus shape snapping (2.4 release notes). **Dynamic fog** (walls,
  doors, lights, GPU soft shadows) arrived in 2.3 as a first-party extension on the Warp Core
  engine (https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/). Per-player vision is
  handled by the community "Smoke & Spectre!" extension. Not full Foundry-grade lighting
  automation; third-party 2026 comparisons still class its default fog as "classic reveal, not
  dynamic lighting" (Black Lantern Forge, above).
- **AI feature:** 2.4 (May 2026) shipped **"Forecast"** — a computer-vision pipeline that
  auto-detects rooms on an uploaded battlemap and fogs them in one click; imperfect results are
  corrected with a Slice tool; launched in beta for Bestling subscribers first
  (https://blog.owlbear.rodeo/owlbear-rodeo-2-4-release-notes/). Also 2.4: "Storage Saver" —
  client-side WebP conversion/resize on import (~20% smaller JPEGs).
- **Scene/asset management:** "Atlas" scene manager, Token Manager, Scene Importer, grid
  auto-alignment, direct image paste, cross-room copy/paste
  (https://blog.owlbear.rodeo/owlbear-rodeo-2-1-release-notes/).
- **Realtime multiplayer:** link-share rooms, GM approves joiners, all interaction synced live.
- **Character sheets / rules automation / compendiums: none first-party.** No native sheets, no
  rules engine, no compendium, no system support layer. All bookkeeping is out-of-app or via
  community extensions (EN World thread reactions,
  https://www.enworld.org/threads/owlbear-rodeo-2-0-launches-july-19th.697441/; Black Lantern
  Forge). There is **no sheet/system builder of any kind — GUI or code**; system support means
  a developer writes a TypeScript extension.
- **Dice:** first-party 3D dice extension for d20 systems; richer rolling via community
  extensions (dddice, Witchdice, Bones!, physical **Pixels** bluetooth dice integration)
  (https://extensions.owlbear.rodeo/).
- **Audio:** none first-party; community extensions DJinni Music Player and Tracks provide
  music/ambience; voice/video is explicitly out of scope (tables use Discord).
- **GM prep tools:** minimal — no journals/quests/wiki natively; community extensions Journal!,
  GM Vault, Loot!, Dashboard Maker, PDF Reader patch the gap (https://extensions.owlbear.rodeo/).
- **Extension ecosystem (the real feature list):** official directory with first-party
  extensions (Initiative Tracker, Dice, Dynamic Fog, Weather with GPU shader effects, Ranges,
  Prefabs, Outliner, Trackers, Colored Rings) plus a large community catalog: initiative/combat
  trackers, system-specific character sheets (Fabula Ultima, Shadowdark, Daggerheart, Lancer),
  5e/PF2e statblocks, AoE templates, spell effects (Embers), fog tools, audio
  (https://extensions.owlbear.rodeo/; unofficial index https://owlbear.rogue.pub/extensions).
  Extensions are **iframe-embedded web apps** with a manifest.json, talking to the host via the
  open-source TypeScript **@owlbear-rodeo/sdk**
  (https://docs.owlbear.rodeo/extensions/getting-started/ via search snippets,
  https://github.com/owlbear-rodeo/sdk, https://www.npmjs.com/package/@owlbear-rodeo/sdk,
  third-party dev writeup https://blog.dddice.com/building-an-extension-for-owlbear-rodeo-a-3rd-party-perspective/).
  2.3 additionally opened **GPU shader access** to extension developers.
- **Import/export/portability:** maps/tokens are plain images so assets are portable across
  VTTs (Black Lantern Forge). **Uncertain:** no evidence of full campaign/scene export in 2.x;
  cloud lock-in appears to be the trade for zero setup.
- **Theming/UI customization:** essentially none — paid tiers get custom room names/backgrounds;
  no user theming of the interface found. (Uncertain: minor appearance settings may exist
  behind the login wall.)
- **Accessibility:** an explicit, stated goal — "make Owlbear Rodeo the most accessible VTT"
  (2.0 beta patch 11, via search snippets). 2.1 shipped keyboard interaction with canvas
  objects (Tab/Enter/Arrows on tokens and drawings), screen-reader exposure of scene contents,
  and an accessibility menu for adding readable descriptions to items
  (https://blog.owlbear.rodeo/owlbear-rodeo-2-1-release-notes/). This is unusually strong for a
  canvas VTT, though by their own admission incomplete.
- **Mobile:** works in mobile browsers, touch-friendly, big maps load on phones (2.3 notes);
  used in person with projectors/TVs (EN World thread). No native apps found.

## UI & UX character

- **Information density: deliberately minimal.** The product identity is "maps + tokens + fog
  + dice in a browser tab, nothing to configure." Everything else is opt-in via extensions —
  density scales with the GM's appetite.
- **Visual design:** polished, friendly, hand-drawn/cozy aesthetic; 2.1 homepage got a
  cinematic animated hero; 2.3's GPU renderer added soft-shadow fog and procedural weather —
  "polish over feature count" is the explicit dev philosophy (subscription blog post).
- **Onboarding: the market benchmark.** Third-party comparisons consistently score it fastest:
  "running a game twenty minutes from now" / first session prep ~15-20 minutes, player join in
  seconds with no account (https://gmcrafttavern.com/foundry-vs-roll20-owlbear-2026/ — note
  this article contains outdated feature claims, treat only its onboarding verdict;
  https://blacklanternforge.com/blogs/news/roll20-vs-foundry-vtt-vs-owlbear-rodeo-which-virtual-tabletop-is-right-for-your-campaign;
  https://www.diceoutpost.com/guides/best-vtt-for-beginners/ via search snippets).
- **Common praises:** elegant simple interface "without the features I neither need nor want";
  zero player friction; free tier genuinely playable; works for in-person projector play
  (EN World threads).
- **Common complaints:** no character sheets or rollable sheet integration; no token
  attributes/HP without extensions, so state tracking is manual; 2.0 dropped 1.0's
  browser-cache storage ("the site's greatest feature gone") in favor of subscription cloud
  storage; "yet another subscription" fatigue; some old fans perceive 2.0 as feature creep
  betraying the minimalist promise; 100 MB free storage is tight for map-heavy GMs
  (https://www.enworld.org/threads/owlbear-rodeo-2-0-launches-july-19th.697441/).

## Community sentiment

Net-positive with a specific shape: beloved as the "just works" VTT for theatre-of-the-mind-plus
tables, one-shots, beginners, and GMs who keep rules on paper/Discord; consistently ranked the
easiest VTT and recommended as the Foundry/Roll20 alternative when setup cost is the concern.
The recurring criticisms are the flip side of the philosophy: anything resembling campaign
management, sheets, or automation requires assembling a personal stack of third-party
extensions of varying quality and maintenance, each with its own Patreon; and the 2.0
cloud/subscription pivot alienated part of the original free-local userbase. Sentiment sources:
EN World threads (above), Lair of Secrets review of 1.0 (https://lairofsecrets.com/gaming/review-owlbear-rodeo/),
2026 comparison articles (GM Craft Tavern, Black Lantern Forge, Dice Outpost),
alternativeto.net listing (https://www.alternativeto.net/software/owlbear-rodeo/).

## What to steal

1. **Zero-friction player join:** link → name → GM approves → playing, no player account.
   Adopt as a hard onboarding requirement: our players must never need an account to sit at a
   table (accounts only to persist their own data).
2. **"Free tier gates storage/quantity, never play features, no ads"** — pricing that the
   community reads as fair and that fuels word-of-mouth; only the GM pays. Directly compatible
   with our GM-centred model.
3. **Forecast-style AI map understanding:** one-click computer-vision auto-fog/auto-wall of an
   uploaded map, always human-correctable — a perfect fit for our "AI is optional and always a
   draft" invariant and the single biggest prep-minute killer OBR found.
4. **Sandboxed extension architecture:** iframe + manifest + typed SDK, no arbitrary code in
   the host page — an existence proof that a safe, thriving plugin ecosystem doesn't need
   Foundry-style arbitrary JS. Aligns with our declarative-packages invariant.
5. **Canvas accessibility pattern:** keyboard-walkable scene objects + screen-reader
   descriptions attached to canvas items (their 2.1 work) — steal the pattern and finish the
   job they admit is incomplete.
6. **Client-side asset optimization** (auto-WebP/resize on upload) — cheap goodwill, saves our
   storage and users' quotas.

## Exploitable weaknesses

1. **No character sheets, no rules layer, no system support** — the #1 community ask, answered
   only by scattered per-system community extensions. Our schema-native sheets + visual
   rule-builder attack exactly this void.
2. **No integrated campaign management** (journals/quests/wiki/handouts are third-party
   afterthoughts) — GM prep beyond maps happens outside the app; our GM-centred prep suite has
   no counterpart there.
3. **Fragmented extension experience:** assembling initiative + sheets + audio + vision from
   different unpaid maintainers, with separate Patreons and uneven quality — a coherent
   first-party experience beats this for campaign play.
4. **No self-hosting for 2.x and full cloud lock-in** (plus weak export evidence) — our
   self-hostable, export-friendly stance wins the sovereignty-minded (and German/EU
   data-protection-sensitive) crowd, plus the alienated 1.0 local-storage fans.
5. **No theming/UI customization** beyond paid room backgrounds — zero answer to our K1 axis.
6. **Two-person team, deliberately narrow scope** — they have stated they will not become a
   campaign manager; the "minimalist VTT that also manages your campaign well" position is
   structurally open.

## Threat vs our axes

Owlbear Rodeo is the strongest competitor on exactly one of our five axes — **onboarding
speed** — where it is the acknowledged market benchmark (playable in ~20 minutes, players join
account-free in seconds); we should aim for parity there rather than promising to beat it, and
it is now also moving into our **GM workload reduction** axis from the map side (Forecast
auto-fog shows they will automate prep chores with CV/AI), though it categorically refuses the
sheets/rules/campaign half of GM workload where most prep hours actually live. On
**accessibility** it is the only major VTT with a public "most accessible VTT" ambition and
shipped keyboard/screen-reader canvas work — a credible partial rival we can outrun by
finishing what they admit is unfinished. On **theming/customization joy** and the **visual
no-code rule-builder** it offers effectively nothing and its philosophy forbids it ever doing
so; those axes are uncontested. Strategic risk is therefore not feature competition but
positioning: for simple tables "Owlbear + Discord + paper sheets" is free and frictionless, so
Chronicle must make its richer capability feel as light as Owlbear at minute one — otherwise we
get sorted into the "heavy like Foundry" bucket — while our system-agnostic sheets, rule
packages, campaign tools, theming, and self-hosting give tables that outgrow Owlbear a place to
land.

## Sources

Accessed 2026-07-26. Official properties owlbear.rodeo / docs.owlbear.rodeo returned 403 to
automated fetch; docs content cited via search-indexed snippets.

- https://blog.owlbear.rodeo/state-of-the-rodeo-lets-talk-about-subscriptions/ (2022-05-27, pricing philosophy)
- https://blog.owlbear.rodeo/owlbear-rodeo-2-1-release-notes/ (2023-11-14, accessibility, Atlas)
- https://blog.owlbear.rodeo/owlbear-rodeo-2-3-release-notes/ (2024-10-09, Warp Core, dynamic fog, GPU effects)
- https://blog.owlbear.rodeo/owlbear-rodeo-2-4-release-notes/ (2026-05-23, Forecast CV auto-fog, Storage Saver)
- https://blog.owlbear.rodeo/owlbear-rodeo-legacy-edition/ + https://github.com/owlbear-rodeo/owlbear-rodeo-legacy (1.0 self-host, non-commercial license)
- https://extensions.owlbear.rodeo/ (official extension directory) and https://owlbear.rogue.pub/extensions (unofficial index)
- https://github.com/owlbear-rodeo/sdk, https://www.npmjs.com/package/@owlbear-rodeo/sdk, https://blog.dddice.com/building-an-extension-for-owlbear-rodeo-a-3rd-party-perspective/ (extension architecture)
- docs.owlbear.rodeo: /docs/managing-your-subscription/, /docs/rooms/, /docs/getting-started/, /extensions/getting-started/ (via search snippets; 403 direct)
- https://www.enworld.org/threads/owlbear-rodeo-2-0-launches-july-19th.697441/ and https://www.enworld.org/threads/owlbear-rodeo-news-a-second-full-timer-cloud-storage-and-subscriptions-including-a-base-free-tier.688849/ (community sentiment, tier details)
- https://blacklanternforge.com/blogs/news/roll20-vs-foundry-vtt-vs-owlbear-rodeo-which-virtual-tabletop-is-right-for-your-campaign (2026-04-23 comparison)
- https://gmcrafttavern.com/foundry-vs-roll20-owlbear-2026/ (2026 comparison; contains outdated OBR-1.0-era feature claims — used only for onboarding/positioning verdicts)
- https://www.diceoutpost.com/guides/best-vtt-for-beginners/ (beginner comparison, via snippets)
- https://lairofsecrets.com/gaming/review-owlbear-rodeo/ (1.0-era review: no token attributes, 24h room lifespan — historical)
- https://www.alternativeto.net/software/owlbear-rodeo/ (user positioning)
- https://www.patreon.com/cw/SeamusFinlayson, https://www.patreon.com/cw/battlesystem (extension-dev monetization)
