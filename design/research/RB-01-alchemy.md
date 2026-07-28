# Alchemy RPG — Research Brief

Project Chronicle competitive research, target: **Alchemy RPG** (alchemyrpg.com).
Access date for all sources: **2026-07-26**. Uncertain claims are marked *(uncertain)*.
Positioning in one line: a cinematic, theater-of-the-mind-first VTT — scenes, motion overlays,
music and "immersion" instead of grid-and-token tactics.

## Platform & pricing

- **Platform:** Web app (any modern browser) plus native desktop apps for Windows, macOS and
  Linux (https://www.alchemyrpg.com/, https://help.alchemyrpg.com/en/articles/9823706-alchemy-web-desktop-apps).
  **Not self-hostable** — fully hosted SaaS; no self-host option found anywhere in docs or
  marketing *(absence claim, but consistent across all sources)*.
- **Mobile/tablet:** runs in a browser on tablets/phones but explicitly "not optimized";
  iOS/Safari lacks webp/webm and motion-overlay support, which much of Alchemy is built on;
  recommended minimum resolution 1366x768, 16:9
  (https://alchemyrpg.backerkit.com/faq, https://help.alchemyrpg.com/en/articles/9823706-alchemy-web-desktop-apps).
- **Pricing history:** launched with freemium: free = 3 PCs, 3 games as GM, 1 homebrew
  universe; **Alchemy Unlimited $8/month or $88/year** for unlimited games/characters/universes
  (https://www.kickstarter.com/projects/alchemyrpg/alchemy-rpg-a-reimagined-vtt-experience/faqs,
  https://startplaying.games/blog/posts/alchemy-vtt-what-how-to,
  https://www.wargamer.com/dnd/alchemy-rpg-kickstarter).
- **Pricing now (2026):** the homepage advertises a free tier with "no paywalls" and unlimited
  access; the paid tier is the **"Alchemist Program"** — a supporter subscription granting a 5%
  marketplace discount, monthly "Essence" (virtual currency), Game Votes and Feature Votes,
  early feature access, dev chats and a badge; "cancelling just turns off the Alchemist perks,
  not your account" (https://www.alchemyrpg.com/,
  https://help.alchemyrpg.com/en/articles/14672863-the-alchemist-program). The exact Alchemist
  price is not published on the help page *(uncertain; the old $8/$88 Unlimited price may or may
  not still apply — one 2026 comparison article claims a "Pro tier ~$10/month",
  https://dmtoolsai.com/best-virtual-tabletops-in-2026-complete-comparison/)*. The shift from
  "capability paywall" to "cosmetics/discount/votes supporter model + content sales" appears to
  be the current monetization strategy *(uncertain on timing of the change)*.
- **Marketplace economics:** revenue comes largely from selling **officially licensed content**
  ("integrated adventures" with art, motion and audio baked in; modules typically $5–$35,
  https://www.rascal.news/alchemy-rpg-announces-free-vtt-day-one-day-full-of-premium-ttrpg-content-free-to-the-masses/).
  125+ licensed systems / publishing partners claimed (12 systems from ~50 publishers at 2023
  Kickstarter time; incl. Pathfinder 2e, Call of Cthulhu, Fallout, Kobold Press 5e, Vampire: The
  Masquerade V5) (https://www.alchemyrpg.com/, https://www.wargamer.com/dnd/alchemy-rpg-kickstarter,
  https://www.paradoxinteractive.com/games/world-of-darkness/news/alchemy). Creator sales are
  **curated/hand-selected**, paid via Stripe "after Alchemy's cut and payment processing fees";
  the split percentage is **not publicly disclosed**
  (https://alchemyrpg.backerkit.com/faq,
  https://help.alchemyrpg.com/en/articles/15004297-creator-revenue-dashboard). Marketplace policy
  requires original works by human creators; no explicit public AI-content policy found
  *(uncertain)* (https://alchemyrpg.com/about).
- 2023 Kickstarter raised $250k on day one; product had ~1 year early access before v1
  (https://www.wargamer.com/dnd/alchemy-rpg-kickstarter).

## Feature inventory

- **Scenes, not maps, as the core object:** scene-based play with animated environments, motion
  overlays, ambient sound and music; GM switches scenes to set mood; "window into any story
  world" (https://www.alchemyrpg.com/, https://startplaying.games/blog/posts/alchemy-vtt-what-how-to).
- **Tactical mode exists but is secondary:** battle maps with grid adjustment (square/hex,
  opacity, color), snap-to-grid, map variants/scaling, token scaling, and **fog of war**
  (https://www.kickstarter.com/projects/alchemyrpg/alchemy-rpg-a-reimagined-vtt-experience/faqs).
  **No dynamic lighting / wall-based line of sight found** in any doc or review *(uncertain —
  absence claim)*; community confirms missing measurement tools and AoE markers
  (https://yourgmchandler.medium.com/play-your-game-not-the-vtt-0a2f3882df9f).
- **Character sheets / system support:** 125+ officially licensed system integrations, plus a
  **Sheet Builder** (open beta): fully GUI, drag-and-drop, block-based — layout blocks (columns,
  lists, collapsible groups), input blocks (text, dropdowns, pips, switches, trackers) and
  "smart blocks" (attributes, skills linked to attributes, actions, items, HP/ammo trackers).
  Pips can programmatically add to attributes/skills and feed dice rolls/dice pools; dropdown
  choices can auto-add/remove actions on the character's action menu; conditional visibility;
  block-level color theming; explicit "no coding required"
  (https://help.alchemyrpg.com/en/articles/11050124-sheet-builder). A broader **System Builder**
  ("create a roleplaying game system without writing a single line of code") is in public beta;
  its dedicated help article is still "Coming soon"
  (https://help.alchemyrpg.com/en/articles/11048792-system-builder,
  https://churapereviews.com/2025/04/11/why-alchemy-rpg-is-the-best-virtual-tabletop-for-storytelling/).
- **Automation depth:** shallow-to-moderate. Sheet-level derived values, roll bonuses and
  action wiring — no evidence of full rules-engine automation (turn effects, condition
  application, scripted macros). No scripting/macro language, which Alchemy frames as a feature
  ("without needing to write custom code") *(depth assessment inferred from docs + reviews)*.
- **Dice:** integrated dice with dice-pool support wired into sheet blocks
  (https://help.alchemyrpg.com/en/articles/11050124-sheet-builder).
- **GM prep tools:** universes (lore/worldbuilding), scene creator, handouts and lore sharing,
  asset library, on-the-fly encounter creation
  (https://startplaying.games/blog/posts/alchemy-vtt-what-how-to,
  https://churapereviews.com/2025/04/11/why-alchemy-rpg-is-the-best-virtual-tabletop-for-storytelling/).
- **Realtime/multiplayer & AV:** built-in voice and video chat (no Discord needed), active-
  speaker highlighting, GM-controlled music/ambience; a **native Streamer Mode** (spectator
  chat, scene/music display for viewers) that reviewers call unique to Alchemy
  (https://www.alchemyrpg.com/, https://startplaying.games/blog/posts/alchemy-vtt-what-how-to).
- **AI features:** none advertised; no public AI policy found; its flagship partners (Chaosium,
  Paizo) ban AI content, and the marketplace requires original human-made works *(uncertain)*
  (https://alchemyrpg.com/about, https://www.geeknative.com/221420/the-human-touch-the-growing-list-of-tabletop-companies-banning-ai/).
- **Import/export/portability:** character sheets import/export as JSON (import historically
  gated behind Unlimited, on desktop app); dropdown/feature-block option lists export as JSON
  (https://alchemyrpg.backerkit.com/faq, https://help.alchemyrpg.com/en/articles/11050124-sheet-builder).
  **No public API, no mod/plugin system, no community module ecosystem** found *(absence claim)*.
- **Theming/UI customization:** the product itself is heavily art-directed, but user-side
  theming is limited to block colors/hex codes inside sheets and a "Zen Mode" that hides UI
  chrome (https://help.alchemyrpg.com/en/articles/11050124-sheet-builder,
  https://yourgmchandler.medium.com/play-your-game-not-the-vtt-0a2f3882df9f).
- **Accessibility:** no published accessibility statement found *(absence claim)*; one reviewer
  with dyslexia reports **text readability problems** and difficult rulebook navigation inside
  purchased modules (https://churapereviews.com/2025/04/11/why-alchemy-rpg-is-the-best-virtual-tabletop-for-storytelling/).
  Motion-heavy presentation with no documented reduced-motion option *(uncertain)*.

## UI & UX character

- **Visual design:** consistently ranked the best-looking VTT — "strongest" aesthetic appeal in
  comparison tables; full-bleed animated splash scenes, cinematic framing, low information
  density by design (https://www.czepeku.com/blog/choosing-your-ideal-virtual-tabletop).
- **Onboarding:** genuinely fast for players joining licensed/prepared games — no installs, no
  modules to configure, sheet actions surfaced in-panel so players "engage abilities and items
  without leaving the screen"; praised as friendly to non-technical players
  (https://yourgmchandler.medium.com/play-your-game-not-the-vtt-0a2f3882df9f,
  https://churapereviews.com/2025/04/11/why-alchemy-rpg-is-the-best-virtual-tabletop-for-storytelling/).
  A new table on a licensed system can plausibly play within an evening; custom/homebrew
  campaigns are reported to be much slower ("a lot of quirks if you're making a custom
  campaign", https://www.enworld.org/threads/what-vtt-s-do-you-most-dislike-and-why-defenders-welcome-to-defend.711396/page-6).
- **Common complaints (EN World/RPGnet, Feb 2025):** "Too many clicks. Too many things hidden
  in favor of spending screen real estate on the splash screens"; can't run multiple characters
  or set up a new PC while online; "the VTT gets in the way of playing far more than roll20 or
  Foundry"; "I sometimes wonder if anyone coding the site has actually run a long-term game
  online"; some purchased bundles are "just splash screens" with no adventure text, tactical
  maps, or set-up NPCs; suspicion the design funnels users toward store purchases
  (https://www.enworld.org/threads/what-vtt-s-do-you-most-dislike-and-why-defenders-welcome-to-defend.711396/page-6,
  https://forum.rpg.net/threads/whats-the-deal-with-alchemy-vtt.910279/ — thread title only,
  content 403 on access).
- **Common praise:** atmosphere/immersion, effortless licensed-content play, integrated AV,
  Streamer Mode, no-code sheet building, "more time playing, less time configuring"
  (https://yourgmchandler.medium.com/play-your-game-not-the-vtt-0a2f3882df9f).

## Community sentiment

Polarized along the narrative-vs-tactics axis. Narrative-game communities (Call of Cthulhu,
Vampire: The Masquerade V5 — which Paradox calls "one of the most complete system integrations
to date") and streamers embrace it
(https://startplaying.games/blog/posts/what-best-vtts-call-of-cthulhu,
https://www.paradoxinteractive.com/games/world-of-darkness/news/alchemy). GMs defecting from
Foundry cite configuration fatigue as the motive
(https://yourgmchandler.medium.com/play-your-game-not-the-vtt-0a2f3882df9f). Skeptics on EN
World/RPGnet see beauty over substance: click-heavy hidden UI, thin store content, weak
tactical play, and a business model that "yanks publishers away from better VTTs"
(https://www.enworld.org/threads/what-vtt-s-do-you-most-dislike-and-why-defenders-welcome-to-defend.711396/page-6).
Reddit-native discussion is sparse relative to Foundry/Roll20 *(uncertain — search access to
Reddit was limited during this research)*.

## What to steal

(Functional inspiration only — never trade dress.)

1. **Scene/mood as a first-class object.** GM-triggered scene switches bundling backdrop +
   motion + ambience + music are a huge cheap win for immersion and GM workload (axis 1) — our
   scenes/media domain can adopt "mood presets" without abandoning tactical maps.
2. **Block-based no-code sheet builder mechanics.** Their concrete block taxonomy (layout vs
   input vs "smart" blocks; pips feeding attributes/dice pools; dropdown options that
   auto-inject actions; conditional visibility; publish/unpublish state per sheet) is a
   validated GUI vocabulary for our K2 rule-builder — we can go further (formulas with live
   trace, versioned declarative packages) where they stop.
3. **In-panel action surfacing.** Players use abilities/items from a compact panel without
   opening the full sheet — fewer clicks in live play, great for onboarding (axis 2) and for
   our permission-aware player interface.
4. **Zen Mode.** One toggle to collapse all chrome while keeping play-critical state — cheap,
   loved, and a natural fit for our theming system (axis 3) and reduced-distraction
   accessibility (axis 5).
5. **Streamer/observer mode.** Native spectator presentation (scene + audio + spectator chat)
   maps directly onto our planned observer role and photographs well (K3).

## Exploitable weaknesses

1. **No self-hosting, no API, no mod ecosystem, weak portability** — hosted-only with curated
   content; JSON character export is the ceiling. Our self-hostable, export-friendly,
   declarative-package architecture is a direct counter.
2. **Click-heavy, hidden-function UI in actual long-term play** — beauty at the expense of
   operational efficiency ("gets in the way of playing"); GM console with calculation
   transparency + undo attacks exactly this.
3. **Tactical play is a stub** — fog of war but no dynamic lighting, no measurement/AoE tools;
   tables that want both narrative polish AND real tactical combat have no home there.
4. **Curated marketplace bottleneck + thin content quality** — hand-picked partners, undisclosed
   revenue split, and bundles criticized as art-only shells; an open, quality-gated community
   ecosystem differentiates.
5. **Accessibility is an afterthought** — motion-first presentation, reported dyslexia/readability
   problems, no accessibility statement, degraded iOS/tablet support; our "sexy AND accessible"
   constraint pair (K3) plus reduced-motion guarantees is a visible differentiator.
6. **Homebrew is second-class** — licensed universes shine, custom campaigns are quirky and
   slower to set up; System Builder is still beta with unfinished docs. Our GUI rule-builder for
   arbitrary systems (K2) can outflank it if we ship real formula/automation depth.

## Threat vs our axes

Alchemy is the most dangerous competitor on **look-and-feel** and the closest existing thing to
our onboarding and no-code stories, but it is beatable on every one of our five axes. (1) GM
workload: it reduces *setup* for purchased licensed content but community reports say it adds
*live-play* friction (clicks, hidden functions) and its store bundles can be hollow — our GM
console + prep tools attack the whole workflow, not just mood-setting. (2) Onboarding: its
zero-install, join-and-play flow for licensed systems is genuinely strong and sets the bar we
must match; for homebrew tables it degrades sharply, which is our opening. (3) Theming joy: it
is art-directed, not user-themable — the GM consumes Alchemy's aesthetic rather than authoring
their own; our token-first theme editor (K1) has no equivalent there. (4) Rule-builder: its
Sheet/System Builder is the nearest competitor to K2 and proves market appetite for no-code
system building, but it is beta, shallow on automation (no formula language with trace, no
versioned packages, no sharing economy for homebrew systems) — we must ship deeper, not just
prettier. (5) Accessibility: motion-heavy, readability complaints, no published a11y
commitments — a clear lane for us. Strategic caveat: Alchemy's exclusive publisher licensing
(V5, CoC, Fallout) builds a content moat we cannot copy short-term; our counter is
system-agnostic homebrew power plus open portability, not a licensing arms race.

## Sources

All accessed 2026-07-26.

- https://www.alchemyrpg.com/ — official site (features, systems count, free/Alchemist tiers)
- https://alchemyrpg.com/about — marketplace philosophy, original-works policy
- https://help.alchemyrpg.com/en/articles/11050124-sheet-builder — Sheet Builder documentation
- https://help.alchemyrpg.com/en/articles/11048792-system-builder — System Builder (stub, "coming soon")
- https://help.alchemyrpg.com/en/articles/14672863-the-alchemist-program — Alchemist supporter subscription
- https://help.alchemyrpg.com/en/articles/15004297-creator-revenue-dashboard — creator payouts, Alchemy's cut
- https://help.alchemyrpg.com/en/articles/9823706-alchemy-web-desktop-apps — platform/apps
- https://help.alchemyrpg.com/en/ — help center structure
- https://www.kickstarter.com/projects/alchemyrpg/alchemy-rpg-a-reimagined-vtt-experience/faqs — v1 features, fog of war, original pricing
- https://alchemyrpg.backerkit.com/faq — mobile/tablet limits, JSON import, marketplace curation
- https://www.wargamer.com/dnd/alchemy-rpg-kickstarter — Kickstarter, licensing, positioning
- https://startplaying.games/blog/posts/alchemy-vtt-what-how-to — feature/pricing overview, Streamer Mode
- https://startplaying.games/blog/posts/what-best-vtts-call-of-cthulhu — narrative-community fit
- https://www.czepeku.com/blog/choosing-your-ideal-virtual-tabletop — comparative rankings
- https://yourgmchandler.medium.com/play-your-game-not-the-vtt-0a2f3882df9f — GM switching from Foundry
- https://churapereviews.com/2025/04/11/why-alchemy-rpg-is-the-best-virtual-tabletop-for-storytelling/ — review incl. dyslexia/readability criticism
- https://www.enworld.org/threads/what-vtt-s-do-you-most-dislike-and-why-defenders-welcome-to-defend.711396/page-6 — critical community sentiment
- https://forum.rpg.net/threads/whats-the-deal-with-alchemy-vtt.910279/ — RPGnet thread (403 on direct access; seen via search excerpts)
- https://www.paradoxinteractive.com/games/world-of-darkness/news/alchemy — V5 launch on Alchemy
- https://www.rascal.news/alchemy-rpg-announces-free-vtt-day-one-day-full-of-premium-ttrpg-content-free-to-the-masses/ — module pricing $5–$35
- https://dmtoolsai.com/best-virtual-tabletops-in-2026-complete-comparison/ — 2026 pricing claim *(low confidence)*
