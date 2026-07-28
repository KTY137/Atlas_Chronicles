# Fantasy Grounds (Unity) — Research Brief

Project Chronicle competitive research, RB-01. Access date for all sources: **2026-07-26**.
Vendor: SmiteWorks USA, LLC (Melbourne, FL; founded 2004 in Finland; D&D Beyond founder Adam
Bradford is Chief Development Officer since June 2024). Official site: https://www.fantasygrounds.com/
(note: site blocks automated fetches; claims below verified via Steam, the official Atlassian
customer portal / press kit, and press coverage).

## Platform & pricing

- **Desktop-only client** (Unity engine): Windows 64-bit, macOS 10.14+, Linux (Ubuntu 18.04+),
  distributed via own store and Steam, "full feature parity" claimed across OSes
  (press kit: https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/1845231641/Press+Kit+-+Fantasy+Grounds+VTT ;
  Steam: https://store.steampowered.com/app/1196310/). **No browser play, no self-hosting of a
  web app.** The only browser component is the **Online Reader** (beta, launched 2025-11-08): a
  web compendium for reading owned rulebook modules on any device — reading only, not play
  (https://www.wargamer.com/dnd/fantasy-grounds-free).
- **Networking**: GM hosts a session; default is SmiteWorks' **cloud relay** (no port
  forwarding), legacy LAN/direct mode still exists (port 1802, GM-side forwarding)
  (https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996639939/How+to+Join+a+Game).
  Campaign data lives locally on the GM's machine.
- **PRICING PIVOT — free-to-play since 2025-11-08** (announced at FG Con Online): the entire VTT
  client, hosting, and unlimited games are now free for GMs and players — no license, no
  subscription, no ads. Previously: one-time licenses ($20 Core / $50 Ultimate; Ultimate =
  free players connect to a paying GM) or monthly subscriptions
  (https://www.gamingonlinux.com/2025/11/fantasy-grounds-virtual-tabletop-vtt-is-now-free-to-play/ ,
  https://en.wikipedia.org/wiki/Fantasy_Grounds ,
  https://www.enworld.org/threads/fantasy-grounds-is-going-free-to-play.716127/).
  Existing license holders got a Loyalty Rewards program (claim window to 2026-01-01) or 30-day
  refunds.
- **Revenue is now 100% content**: the largest officially licensed VTT catalog — 50+ systems,
  ~3,500–3,900 store products (Steam lists 3,858 DLC, €3.99–€58.99; typical adventure module
  ~$20–30). Stated strategy (Bradford): drop entry cost for a new player from ~$70–80 to ~$20–30
  (https://www.wargamer.com/dnd/fantasy-grounds-free). Licensing partners include Wizards of the
  Coast (first officially licensed 5e VTT, 2015), Paizo, Modiphius, Pinnacle, Chaosium, and many
  more (press kit).
- **Community marketplace ("the Forge")**: creators sell or give away extensions/modules with
  auto-updates into the client; store-credit "gold" currency to dodge PayPal minimums
  (https://forge.fantasygrounds.com/ ,
  https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/1889009665/Fantasy+Grounds+Forge).
  Exact revenue-share percentage: **not confirmed** in accessible sources (uncertain).
- **Content licensing is per-account (the GM's)**: the GM's owned modules are shared to players
  at the GM's table during play; players buy nothing (long-standing model, consistent with the
  old Ultimate license; **high confidence but not re-verified post-F2P**).

## Feature inventory

- **Maps/tokens/vision**: tactical top-down maps plus a distinctive **"2.5D" tabletop
  perspective**; dynamic lighting, vision, line-of-sight, fog of war; tile-based map building
  and basic integrated image editing (press kit). Considered feature-complete but not
  best-in-class visually; no 3D à la Talespire.
- **Rules automation — the crown jewel**: automation is **native and first-party** per ruleset
  (press kit explicitly contrasts this with Foundry's reliance on community modules): attack/
  damage resolution, condition and effect tracking, spell targeting, saves, visibility. Effects
  are entered as **coded effect strings** (e.g. `DMG: 1d6 fire`), powerful but arcane —
  community consensus: "as a DM you spend pretty much no time on math"
  (Steam discussions, e.g. https://steamcommunity.com/app/1196310/discussions/0/4845400193816117478).
- **Character sheets / system support**: sheets are defined **per ruleset in XML + Lua**.
  Included rulesets: D&D 5e/4e/3.5e, Pathfinder 1/2, AD&D 2e, Call of Cthulhu, Starfinder, and
  a generic **CoreRPG** base layer; 50+ systems commercially. Building a new system means
  **copying an existing ruleset and editing XML/Lua in a text editor** (official guidance
  recommends Notepad++) — inheritance-based, no official GUI
  (https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996644298/Developer+Guide+-+Overview ,
  https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996644412/Creating+a+Ruleset+-+Overview).
  Gap-fillers are **third-party**: *Ruleset Wizard* (paid visual dev environment: WYSIWYG window
  editor, generates the XML, integrated Lua editor — i.e. low-code, not no-code;
  https://www.rulesetwizard.com/) and the community *MoreCore* ruleset (drag-and-drop dice
  formulas for arbitrary systems). **No official no-code system builder exists.**
- **Dice**: physics 3D dice, full roll automation into the combat tracker/chat.
- **Compendiums/content**: reference manuals as hyperlinked in-client modules; drag-and-drop
  from compendium into sheets/encounters; Online Reader (browser) for owned books (~1,600 of
  ~3,500 products at beta launch per EN World thread; free core rules for major systems
  included).
- **GM prep**: campaign/story entries, quests, notes, parcels/treasure, encounter pre-building,
  NPC creation, story templates and **procedural/random generation tables** (press kit);
  export of anything you build into shareable/sellable modules.
- **Multiplayer**: realtime sessions via cloud relay; GM-hosted; text chat, dice, shared
  handouts/images. Voice/video: **none built in** — tables use Discord etc. (widely documented;
  medium confidence that this is still true in 2026).
- **Audio**: no native soundboard of consequence; deep official **Syrinscape integration**
  ("Sound Links" trigger Syrinscape from NPCs/manual pages; requires Syrinscape subscription)
  (https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/2078932993/Using+Sound+Links).
- **AI**: **no native generative-AI features found** as of access date (searches surface only
  community workflows using external tools); uncertain whether anything is in development.
- **Import/export**: character XML import/export; D&D Beyond character import; NPC stat-block
  text paste-import; module export. No standard cross-VTT interchange (e.g. no UVTT map export
  confirmed — uncertain).
- **Extensibility**: extensions (Lua/XML) modify anything up to full rulesets; large veteran
  community; Forge distribution with auto-update.
- **Theming/UI customization**: skinning via **theme extensions** (official + Forge, e.g.
  wood/parchment/dark themes; decal support). Themes are developer artifacts, not an in-app
  theme editor (medium confidence).
- **Accessibility**: **no documented accessibility program** — no screen-reader support, no
  documented keyboard-navigation or contrast commitments found; Unity-engine custom UI is
  generally opaque to assistive tech (absence-of-evidence claim; high confidence there is no
  marketed a11y story, exact state uncertain).
- **Mobile**: no tablet/phone client for play; Online Reader is the only mobile touchpoint.

## UI & UX character

- **Information density**: very high — MDI "windows-within-windows" desktop metaphor; sheets,
  trackers, chat, images each spawn floating windows; radial menus; drag-and-drop as a primary
  verb. Power-user-optimized, discoverability-poor.
- **Visual quality**: functional but dated; community descriptions range from "clunky" to
  "design philosophy from the 80s"; "too eager to spawn new windows", "ugly clutter"
  (Steam reviews https://steamcommunity.com/app/1196310/reviews/ ; long-running official-forum
  UX threads, e.g. https://www.fantasygrounds.com/forums/showthread.php?46514-Let-s-talk-about-UX-baby).
  Wikipedia notes 2024 UI improvements; the fundamental metaphor is unchanged.
- **Onboarding friction**: notoriously steep. The trade-off the community itself states:
  FG front-loads learning the tool so prep gets cheap later ("if you don't mind spending 4 hours
  setting up a 4-hour game, go Foundry and save money" — i.e. FG preps faster *once mastered*,
  Steam discussion https://steamcommunity.com/app/1196310/discussions/0/4845400193816117478).
  Realistic time-to-first-real-session for a new GM: multiple evenings of tutorials (FG
  Academy, FG College, and Discord guides exist precisely because in-app guidance is weak) —
  estimate, uncertain. Players joining a prepared table are much faster (install client →
  join by GM name).
- **Praises**: unmatched official content catalog; buy-a-module-and-run-it prep economy
  ("everything is pretty much done for you" for $20); deepest native automation; stable,
  20-year-old product with responsive developer forum presence.
- **Complaints**: dated cluttered UI; learning curve; desktop-only/no browser; window
  management during play; Unity port performance/installer quality grumbles
  (EN World thread; Steam reviews at **81% "Very Positive" of ~1,054 reviews** — solid but the
  negative fifth is consistently about UX).

## Community sentiment

- Standard comparison folklore (Reddit/Steam/EN World): **FG = deepest automation + official
  content; Foundry = flexibility, modernity, community systems ("if you want Blades in the
  Dark you need Foundry"); Roll20 = lowest-friction browser entry.**
- The F2P pivot (Nov 2025) was received as a smart, overdue accessibility move ("much easier to
  get new players involved"; the Online Reader called "brilliant"), with minority skepticism
  about software polish ("the installer is complete garbage")
  (https://www.enworld.org/threads/fantasy-grounds-is-going-free-to-play.716127/ ,
  https://www.rpgpub.com/threads/fantasy-grounds-is-now-free.12594/).
- Even advocates concede "Foundry is definitely more modern as a software, but Fantasy Grounds
  is still a good product."

## What to steal

1. **Calculation-transparent, native automation as a per-system guarantee** — automation that
   ships with the system definition, not as fragile community add-ons. Our declarative rule
   packages + K2 builder can deliver FG-depth automation *without* Lua. (Directly validates our
   pack invariant "rule packages are declarative and versioned".)
2. **"Prep less, play better" module economy**: everything a GM builds (or buys) is a portable,
   versioned, auto-updating package — story, encounters, maps, monsters pre-linked so a bought
   or shared adventure is runnable in minutes. Steal the *export-anything-into-a-module* loop
   and Forge-style auto-update delivery.
3. **Effect/condition engine semantics** (durations, stacking, targeting, conditional
   modifiers applied automatically in the tracker) — but expose it through a visual builder and
   human-readable chips instead of coded effect strings.
4. **GM-pays, table-plays licensing**: one owner shares content with the whole table at play
   time. Frictionless for players; aligns with our GM-centred model.
5. **Sound Links pattern**: context-aware audio triggers attached to entities/pages
   (integration-first instead of hosting audio ourselves).

## Exploitable weaknesses

1. **No browser play** — install-required desktop client on a 2020-era Unity port; our
   zero-install browser + self-host story wins every "session 0 in 10 minutes" scenario.
2. **Dated, cluttered, discoverability-hostile UI** — floating-window MDI, radial menus,
   effect-string syntax; a "sexy AND accessible" modern UI (K3) is a direct, photographable
   contrast.
3. **Custom systems require XML/Lua** (or paying a third party for Ruleset Wizard, which is
   still low-code) — our no-code visual rule-builder (K2) attacks FG's moat at its weakest
   point: arbitrary/homebrew systems.
4. **No accessibility story at all** and no mobile/tablet play — our axis 5 is uncontested here.
5. **Theming is developer skinning, not user joy** — no in-app theme editor, no per-campaign
   mood system (K1 uncontested).
6. (Watch, not attack: their licensed-content catalog is a strength we cannot match and must
   not copy — invariant: no copyrighted content without license.)

## Threat vs our axes

Fantasy Grounds is strongest exactly where we are weakest at launch — **axis 1 (GM workload)**:
its native automation depth and buy-and-run licensed module economy genuinely minimize live-play
and prep effort for supported systems, and since Nov 2025 the software itself is free, removing
its historic price objection. It is, however, structurally weak on all four of our other axes:
**onboarding (axis 2)** is its most notorious failure (desktop install, steep learning curve,
windowed 2000s UI), **theming joy (axis 3)** exists only as developer-made skins, the **rule-
builder (axis 4)** is XML/Lua with a paid third-party low-code tool as the ceiling, and
**accessibility (axis 5)** is absent from its marketing, docs, and roadmap. The real threat is
narrow but sharp: for tables playing the ~50 licensed systems (above all 5e/Pathfinder), FG's
free client + official content undercuts our GM-workload pitch, and the F2P pivot plus the
browser-based Online Reader shows SmiteWorks is actively modernizing distribution under
D&D-Beyond-pedigree leadership — if they ever ship browser play or a real system builder, they
close their gaps faster than we can build their automation depth. Our counter-position: win the
tables FG structurally cannot serve — homebrew/indie systems, new GMs, browser-first groups,
accessibility-dependent players — and match automation depth per-system via the declarative
engine rather than per-content via licensing.

## Sources

All accessed 2026-07-26. Official site (fantasygrounds.com) returned HTTP 403 to automated
fetches; official facts were taken from SmiteWorks' Atlassian customer portal and Steam.

- Official / vendor:
  - Press kit: https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/1845231641/Press+Kit+-+Fantasy+Grounds+VTT
  - Developer Guide (ruleset dev): https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996644298/Developer+Guide+-+Overview
  - Creating a Ruleset: https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996644412/Creating+a+Ruleset+-+Overview
  - Forge marketplace: https://forge.fantasygrounds.com/ and https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/1889009665/Fantasy+Grounds+Forge
  - Hosting / joining games: https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996639939/How+to+Join+a+Game
  - Syrinscape Sound Links: https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/2078932993/Using+Sound+Links
  - Subscriptions (legacy): https://www.fantasygrounds.com/home/Subscriptions.php
  - Steam store page: https://store.steampowered.com/app/1196310/
- Press / reference:
  - Wargamer F2P exclusive: https://www.wargamer.com/dnd/fantasy-grounds-free
  - GamingOnLinux F2P: https://www.gamingonlinux.com/2025/11/fantasy-grounds-virtual-tabletop-vtt-is-now-free-to-play/
  - Wikipedia: https://en.wikipedia.org/wiki/Fantasy_Grounds
- Community:
  - EN World F2P thread: https://www.enworld.org/threads/fantasy-grounds-is-going-free-to-play.716127/
  - RPG Pub thread: https://www.rpgpub.com/threads/fantasy-grounds-is-now-free.12594/
  - Steam reviews: https://steamcommunity.com/app/1196310/reviews/
  - Steam FG-vs-Foundry discussion: https://steamcommunity.com/app/1196310/discussions/0/4845400193816117478
  - Official-forum UX thread: https://www.fantasygrounds.com/forums/showthread.php?46514-Let-s-talk-about-UX-baby
- Third-party tooling:
  - Ruleset Wizard: https://www.rulesetwizard.com/
  - FG Academy custom-ruleset guide: https://www.fantasygroundsacademy.com/post/creating-a-custom-ruleset-in-fantasy-grounds-unity-a-short-but-comprehensive-guide
