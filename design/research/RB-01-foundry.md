# Foundry VTT — Research Brief

Project Chronicle competitive research, target: **Foundry Virtual Tabletop** (foundryvtt.com).
Accessed: **2026-07-26**. Author: research subagent. Claims from training memory rather than a
fetched source are explicitly marked *(uncertain)*.

## Platform & pricing

- **Model:** Self-hosted server + browser clients. "Typically, this host is the Game Master who
  runs the game server as an application right on their own computer"; players connect via web
  browser with **no installation** (https://foundryvtt.com/article/faq/). Host app runs on
  Windows/Mac/Linux (Node/Electron). Internet is not required for normal operation beyond
  license verification and update checks (FAQ).
- **Price:** **$50 USD one-time**, perpetual license, all future updates free, "no subscription
  fees or feature gating" (https://foundryvtt.com/purchase/, https://foundryvtt.com/). EU VAT
  added at checkout (≈ €45.65 + tax shown to a German buyer). Patreon supporters get a discount
  on one license. 30-day refund if the software technically doesn't work for your setup (FAQ).
- **Per-GM licensing:** One license = one hosted server for **unlimited players**, who pay
  nothing (FAQ). Effectively per-GM pricing — the exact model our stakeholder brief compares
  against.
- **Current version:** V14 Stable (14.359, released April 2026)
  (https://foundryvtt.com/releases/14.359, https://foundryvtt.com/article/year-in-review-2026/).
- **Third-party hosting:** Because self-hosting is technical, a paid hosting ecosystem exists,
  most prominently The Forge (https://forge-vtt.com/plans — tier prices not verifiable in this
  pass; historically roughly $4–15/month *(uncertain)*). Foundry's own 14.5 roadmap adds HTTPS
  certificate provisioning and a new Launcher app — an implicit admission that self-host setup
  is a pain point (Year in Review 2026).
- **Marketplace economics:** Official Foundry Marketplace launched 2025-02-12, operated with
  partner Metamorphic Digital Studio; purchases attach to the buyer's Foundry account, no
  activation codes (https://peginc.com/the-official-foundry-vtt-marketplace-has-arrived/).
  Growth in year one: products 557 → 1,227 (+120%), creators 65 → 107, marketplace users
  19k → 60k (Year in Review 2026). **Creator revenue-share percentage is not publicly stated**
  anywhere I could find *(uncertain/unknown)*. Separately, 2,138 of 5,338 approved modules are
  "premium" (paid) packages (Year in Review 2026).

## Feature inventory

- **Maps/tokens/lighting:** Widely regarded best-in-class dynamic lighting, walls,
  vision/line-of-sight and fog of war; reviewers call the lighting engine a "game-changer" and
  say Foundry "blows away the competition as a battlemap tool" even unmodded
  (https://dmsjourney.com/foundry-vtt-review/, https://www.ttrpgstack.com/tools/foundry-vtt/).
  V14 adds **Scene Levels** (multi-floor maps), **Scene Regions V2** (interactive map regions
  with attachable Behaviors, replacing Measured Templates entirely), Active Effects V2, and a
  particle generator API (https://foundryvtt.com/releases/14.359, Year in Review 2026).
- **Character sheets / system support:** 475 approved game systems (+30% YoY), "over 200
  supported" advertised on the homepage; D&D 5e dominates (62.68% of installs)
  (Year in Review 2026). **System creation is code**: official path is JavaScript + Handlebars/
  HTML/CSS development (https://foundryvtt.com/article/system-development/,
  https://foundryvtt.wiki/en/development/guides/SD-tutorial). The main no-code option is the
  **community** module "Custom System Builder" — sheet building with formulas and rolls, "without
  any line of code" (https://foundryvtt.com/packages/custom-system-builder,
  https://custom-system-builder.gitlab.io/custom-system-builder/) — but it is third-party, its
  own docs lean on a companion example module and Discord support, and it is not a full rules
  engine (layout + formula sheets, not action/automation pipelines) *(depth assessment partly
  uncertain)*.
- **Automation:** Depth varies by system: some official systems (notably PF2e) ship deep
  automation; 5e reaches comparable depth only via module stacks (e.g. Midi-QOL) *(uncertain —
  community consensus from training, not re-verified this pass)*. Core provides Active Effects,
  now V2 in V14.
- **Dice:** Built-in digital dice and roll syntax; 3D dice via popular module (Dice So Nice)
  *(module name from training, uncertain)*.
- **Compendiums/content:** Compendium packs, adventure imports, official Marketplace (above);
  Foundry's own first-party adventure **Ember** in Early Access (3,808 Kickstarter backers)
  (https://foundryvtt.com/, Year in Review 2026).
- **GM prep:** Journal entries (ProseMirror editor, improved in V14; TinyMCE removed), scene
  building, playlists, handouts via journals/images; no dedicated quest tracker or wiki in core —
  covered by modules *(uncertain)*.
- **Realtime/multiplayer:** Live shared canvas; integrated audio playlists and ambient sound;
  built-in WebRTC voice/video exists but the community commonly uses Discord instead
  *(A/V reliability claim uncertain)* (FAQ lists "audio, voice / video").
- **AI:** **No native AI features**; a 2026 third-party review notes no AI capabilities
  (https://www.ttrpgstack.com/tools/foundry-vtt/). Community AI modules exist *(uncertain)*.
- **Import/export/portability:** Self-hosting means users own their data outright ("control over
  your data", foundryvtt.com); worlds are file-based and movable between hosts. No cross-VTT
  interchange standard *(uncertain)*.
- **API/mods:** The headline strength: full JavaScript/HTML/CSS extensibility; **5,338 approved
  modules** (+38% YoY), median user runs **19 modules** (Year in Review 2026).
- **Theming/UI customization:** Achievable — via CSS and theme modules, i.e. developer-grade
  customization, not an end-user theme editor *(uncertain on current core light/dark options)*.
- **Accessibility:** Weak in core. Open core issues ask for high-contrast text
  (https://github.com/foundryvtt/foundryvtt/issues/3574) and an "Accessibility Mode" for visual
  impairment (https://github.com/foundryvtt/foundryvtt/issues/3028). Gaps are patched by
  community modules: Foundry Navigator (keyboard-first, screen-reader-friendly navigation),
  Accessibility: Chatfinder, Accessibility Enhancements (sound cues)
  (https://foundryvtt.com/packages/foundry-navigator,
  https://foundryvtt.com/packages/a11y-chatfinder,
  https://foundryvtt.com/packages/accessibility-enhancements).
- **Mobile:** No official mobile app ("lacks official GM mobile application", TTRPG Stack).
  Browser access technically works; usable phone play depends on community modules such as
  Swipe VTT — whose mobile character sheets and chat drawer sit behind the author's **Patreon**
  (https://foundryvtt.com/packages/swipe-vtt); older Simple Mobile is unmaintained
  (https://foundryvtt.com/packages/simplemobile).

## UI & UX character

- **Information density:** High. Power-user tool with layered windows and many nested dialogs;
  V14's pop-out/detached windows for multi-monitor use double down on the desktop-pro posture
  (Year in Review 2026).
- **Visual quality:** Functional rather than beautiful; capable of stunning *table output*
  (lighting, animated maps) while the *chrome* itself is utilitarian *(characterization —
  synthesis of reviews, uncertain as a formal claim)*.
- **Onboarding friction:** Asymmetric. **Players:** click a link, play in the browser — minutes.
  **GMs:** buy, install, host (port forwarding/UPnP or paid hosting), pick a system, curate
  modules, build scenes — "initial scene setup is time-intensive for new GMs" and "self-hosting
  demands technical expertise" (https://www.ttrpgstack.com/tools/foundry-vtt/). Realistic time
  for a non-technical new GM to first session: hours to days *(estimate)*.
- **Common complaints:** steep learning curve / overwhelming feature surface
  (https://alternativeto.net/software/foundry-virtual-tabletop/reviews/); "extremely powerful …
  but unwieldy and poorly documented"; module updates breaking worlds — standard community
  advice is to avoid "Update All" and run minimal module sets
  (https://github.com/felddy/foundryvtt-docker/discussions/937 and community guidance);
  resource-heaviness on weak hardware; hosting/connectivity problems.
- **Common praises:** the price model (one-time, players free); dynamic lighting and immersion;
  automation that "wows" players; total data ownership; the sheer module ecosystem; an
  exceptionally active community (110k Discord members, 85k subreddit) (Year in Review 2026).

## Community sentiment

Overall: beloved by technical GMs, intimidating to everyone else. The recurring narrative in
comparisons is "Roll20 to start, Foundry once you know what you want" — Foundry wins on power,
price honesty, and ownership; loses on time-to-table, maintenance burden (module churn each major
version — only 1,590 of 5,338 modules were V14-compatible one month after release, and V14
adoption was 12.92%; Year in Review 2026), and approachability. Nobody praises its onboarding,
its accessibility, or its mobile story; everybody praises its lighting, automation ceiling, and
ecosystem. Sentiment sources: alternativeto.net reviews, dmsjourney.com review, ttrpgstack.com
review, enworld.org threads, GitHub issues cited above.

## What to steal

(Functional inspiration only — never trade dress.)

1. **The pricing psychology:** one purchase, unlimited players, players never pay or register
   payment. This single fact drives enormous goodwill vs. Roll20's subscription. Chronicle's
   self-hostable model should preserve "players are always free, GM pays once/predictably."
2. **Walls/lighting/vision as the emotional wow:** dynamic lighting is the #1 cited reason
   players are impressed. A competitive baseline of walls + vision + light — even simplified —
   is table stakes for "feels premium."
3. **Scene Regions with attachable Behaviors (V14):** declarative "when token enters region, do
   X" is exactly the shape of our no-code rule philosophy applied to maps — steal the concept,
   deliver it GUI-first from day one.
4. **Data ownership & offline operation:** worlds as portable files, minimal phone-home. Aligns
   with our self-hostable invariant; make export/import a first-class, visible feature.
5. **Ecosystem transparency rituals:** the annual "Year in Review" with hard package/usage stats
   and Patreon roadmap votes builds fierce loyalty cheaply. Adoptable practice, not code.

## Exploitable weaknesses

1. **GM onboarding cliff:** installation, hosting, networking, module curation, poor docs. Our
   axis 2 (onboarding speed) attacks this directly — browser-first, zero-install GM, sane
   defaults, "playable in 15 minutes."
2. **No-code system building is a third-party afterthought:** official system creation is
   JavaScript; Custom System Builder is a community module with limited scope. Our axis 4
   (visual rule-builder for arbitrary systems) has no first-party competitor here.
3. **Module fragility & upgrade churn:** every major version breaks a large fraction of the
   module ecosystem users depend on for core workflows. Our declarative, versioned rule
   packages (no arbitrary code execution) are structurally immune to this failure mode — say so
   loudly.
4. **Accessibility & mobile are community patches, not product:** open core issues on contrast,
   screen-reader support via modules, mobile play behind a module author's Patreon. Axes 5
   (accessibility) and partially 2 are wide open.
5. **Theming requires CSS:** no end-user theme editor; "looks" are developer artifacts. Axis 3
   (theming joy, template presets, PixelArt-grade restyling) is undefended.

## Threat vs our axes

Foundry is the strongest overall competitor and the ceiling we get measured against, but its
threat is uneven across our five axes. On **GM workload reduction (1)** it is genuinely strong
*in play* (automation, lighting, regions) yet weak *around play* — prep, hosting, module
maintenance and upgrade churn are GM workload, and the community feels it; we can win the
whole-lifecycle framing. On **onboarding speed (2)** Foundry is at its weakest and knows it (the
14.5 Launcher/HTTPS work), but a launcher does not fix a $50-upfront, self-hosted, curate-19-
modules pipeline — this is our clearest opening. On **theming joy (3)** and the **visual
rule-builder (4)** Foundry offers developer-grade paths (CSS; JavaScript system dev; a community
no-code module), not products — undefended if we ship GUI-first. On **accessibility (5)** core
Foundry is demonstrably behind with open issues and module band-aids. The real dangers: its
10-year, 5,300-module, 475-system ecosystem makes "feature count" unwinnable (as the intake
already concedes); its one-time price sets a brutal anchor against any subscription we might
consider; and its community loyalty means we must convert tables with a materially different
promise — "your whole table playing a *custom* system in minutes, beautiful and accessible out
of the box" — rather than a better Foundry.

## Sources

Accessed 2026-07-26:

- https://foundryvtt.com/ — homepage (V14, pricing claim, marketplace, Ember)
- https://foundryvtt.com/purchase/ — $50 license, VAT, perpetual updates
- https://foundryvtt.com/article/faq/ — hosting model, unlimited players, refunds, demo
- https://foundryvtt.com/article/year-in-review-2026/ — ecosystem/marketplace stats, V14, roadmap
- https://foundryvtt.com/releases/14.359 — V14 stable release
- https://foundryvtt.com/article/system-development/ — official (code-based) system dev
- https://foundryvtt.wiki/en/development/guides/SD-tutorial — community system-dev tutorial
- https://foundryvtt.com/packages/custom-system-builder and
  https://custom-system-builder.gitlab.io/custom-system-builder/ — no-code sheet builder module
- https://foundryvtt.com/packages/swipe-vtt, https://foundryvtt.com/packages/simplemobile —
  mobile modules
- https://foundryvtt.com/packages/foundry-navigator,
  https://foundryvtt.com/packages/a11y-chatfinder,
  https://foundryvtt.com/packages/accessibility-enhancements — accessibility modules
- https://github.com/foundryvtt/foundryvtt/issues/3574,
  https://github.com/foundryvtt/foundryvtt/issues/3028 — open core accessibility issues
- https://www.ttrpgstack.com/tools/foundry-vtt/ — 2026 third-party review
- https://dmsjourney.com/foundry-vtt-review/ — review (lighting/automation praise)
- https://peginc.com/the-official-foundry-vtt-marketplace-has-arrived/ — marketplace launch
- https://forge-vtt.com/plans — third-party hosting (tier details not retrievable this pass)
- https://alternativeto.net/software/foundry-virtual-tabletop/reviews/ — user sentiment
- https://github.com/felddy/foundryvtt-docker/discussions/937 — self-host friction example
- https://blog.forge-vtt.com/v14-is-out-on-the-forge/ — V14 on hosted platform
