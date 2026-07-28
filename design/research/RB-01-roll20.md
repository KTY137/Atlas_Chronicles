# Roll20 — Research Brief

Project Chronicle competitive research, brief RB-01. Access date for all sources: **2026-07-26**.
Target: Roll20 (roll20.net) — the browser-VTT incumbent. Claims that could not be verified
against a primary source are marked **[uncertain]**.

## Platform & pricing

- **Platform:** 100% browser-based SaaS. No desktop client, no self-hosting. The dedicated
  mobile app was retired and delisted from app stores as of Feb 2026; Roll20 now points mobile
  users at the responsive browser experience (roll20.net/characters for sheets)
  (https://blog.roll20.net/posts/were-retiring-the-roll20-mobile-app-to-build-something-better-heres-why/).
- **Model:** freemium subscription, effectively **per-GM** — one subscriber's game inherits the
  tier's features (dynamic lighting, mod scripts) for everyone at that table; players do not need
  to pay **[uncertain in exact mechanics; consistent across sources]**.
- **Tiers** (https://saga20.com/blog/roll20-vs-foundry-vtt-2026/,
  https://help.roll20.net/hc/en-us/articles/28498571071255-Roll20-Subscriptions,
  https://www.geeknative.com/210141/roll20-adds-new-150-subscription-aimed-at-high-usage-game-masters/):
  - **Free** — $0: maps, tokens, chat, dice, built-in voice/video, community character sheets,
    100 MB asset storage (5 MB max file)
    (https://app.roll20.net/forum/post/787242/approaching-limit-to-100mb-free-storage-but-deleting-art-assets-isnt-helping).
  - **Plus** — $5.99/mo: dynamic lighting, more storage.
  - **Pro** — $9.99/mo (~$109.99/yr): Mod (API) scripting, 10 GB storage, custom character
    sheets, compendium sharing (5 games × 15 players).
  - **Elite** — $150/yr (introduced Oct 2025): 50 GB storage, compendium sharing across
    20 games × 15 players ("300 player slots"), bundled Dungeon Scrawl Pro (map maker,
    ~$60/yr value).
  - Historical note: prices were raised in 2021 (Plus $49.99→$59.99/yr, Pro $99.99→$109.99/yr)
    (https://app.roll20.net/forum/post/10031927/roll20-announcement-price-increase).
- **Marketplace economics:** creators keep **70%**, Roll20 takes 30%; minimum listing price
  **$4.99**; monthly PayPal payouts; no exclusivity; no built-in royalty splitting between
  collaborators
  (https://roll20partners.zendesk.com/hc/en-us/articles/10498477973527-Roll20-Marketplace-Partner-FAQ,
  https://roll20partners.zendesk.com/hc/en-us/articles/10844883030679-Marketplace-Pricing-Standards).
  Marketplace purchases do not count against storage quota. Licensed first-party content
  (D&D, Pathfinder, Call of Cthulhu, etc.) is sold per-account and is not exportable.
- **Scale:** self-reported 10M registered accounts in 2022
  (https://www.enworld.org/threads/roll20-now-has-10-million-users.686259/); still ~#2 in
  Similarweb's Roleplaying Games category as of March 2026
  (https://www.similarweb.com/website/roll20.net/). Registered-accounts ≠ active users
  **[activity figures unknown]**.

## Feature inventory

- **Maps/tokens/lighting:** full 2D map+token stack; Fog of War; Dynamic Lighting (Plus+).
  **Project Jumpgate** (rolled out 2024–2025) is a rebuilt VTT engine with an "Experimental
  Performance Enhancement" mode for many-token pages, one-click Dynamic Lighting panel,
  hide/reveal mask tool, Explorer Mode (sepia explored areas), built-in lighting diagnostics
  (token-vision and light-source counts), and phase-one animated darkness effects (Dark Fog,
  Pale Mist) (https://blog.roll20.net/posts/jumpgate-update-lighting-updates/,
  https://wiki.roll20.net/Project_Jumpgate,
  https://help.roll20.net/hc/en-us/articles/38597501957015-2025-Change-Log). Community
  reports of jagged lighting edges and quality trade-offs persist
  (https://app.roll20.net/forum/post/12153872/jagged-edges-in-jumpgate-dynamic-lighting).
- **Character sheets / system support:** large community library of sheets (per-game
  selection); systems are supported by whoever writes a sheet. Sheet authoring is **code, not
  GUI**: HTML + CSS + "sheetworkers" (sandboxed JavaScript), with Roll20-specific dialect
  quirks that break normal web tooling ("cannot properly be tested outside Roll20 …
  in Codepen or JSFiddle") (https://wiki.roll20.net/Building_Character_Sheets,
  https://help.roll20.net/hc/en-us/articles/360037773413-Intro-to-Sheet-Development).
  Custom sheets in your own game require **Pro**
  (https://wiki.roll20.net/Using_Custom_Character_Sheets). The newer **Beacon SDK** is the
  next-gen sheet framework (used for the new D&D sheet and Demiplane-linked sheets) — still a
  developer SDK, not an end-user builder
  (https://blog.roll20.net/posts/newsletter-february-28-2025-public-alpha-demiplane-roll20-integration-march-ama-beacon-sdk-sheet-updates-more/).
  **There is no visual no-code sheet or rules builder.**
- **Rules automation:** shallow out of the box (sheet buttons, roll templates, macros).
  Deep automation requires Pro-gated **Mod (API) scripts** — sandboxed server-side JS, largely
  community-written. Reviewers consistently rate automation depth below Foundry's module
  ecosystem (https://saga20.com/blog/roll20-vs-foundry-vtt-2026/).
- **Dice:** chat dice engine with macros, roll templates, 3D dice; "Quantum Roll" true-random
  server-side rolls **[uncertain: long-standing documented feature, page not re-verified —
  wiki.roll20.net blocked automated access]**.
- **Compendiums/content:** licensed compendiums (D&D 5e/2024, Pathfinder, CoC, …) purchasable
  and shareable to tables (share limits are tier-gated, see pricing). **Demiplane** (acquired
  by Roll20; "D&D Beyond for every other system") is being integrated: Demiplane characters
  (PF2e, Starfinder 2e, Cyberpunk RED, VtM 5e, Alien, Marvel, Candela Obscura) link into
  Roll20 games and roll into the VTT, no subscription required
  (https://blog.roll20.net/posts/roll20-has-acquired-demiplane/,
  https://help.roll20.net/hc/en-us/articles/30050730960151-Demiplane-and-Roll20-Character-Sheet-Integration-Beta).
- **GM prep:** journals, handouts, folders; Charactermancer guided character creation for
  supported systems **[uncertain: feature long documented, not re-verified]**. No wiki-grade
  cross-linking or quest tracker; prep tooling is widely seen as basic.
- **Realtime/multiplayer:** core strength; plus a **Looking-for-Group** directory that is a
  genuine network-effect moat — "most games are found on Roll20"
  (https://alternativeto.net/software/roll20/about).
- **Audio/video:** built-in WebRTC voice/video and a music jukebox; community sentiment says
  the built-in A/V is unreliable and most tables use Discord **[community sentiment,
  widespread but anecdotal]**.
- **AI:** cautious stance — AI-generated art is banned from the marketplace; some AI-assisted
  content-creation tooling has appeared platform-side
  (https://redcirclegames.co.uk/2026/04/26/ai-developments-revisited.html) **[details thin;
  no flagship AI GM-assist product as of access date]**.
- **Import/export/portability:** the weakest area. No campaign export; character
  export/transfer requires a subscription (Character Vault) and users report it failing;
  purchased content is locked to the platform; devs have declined custom-content export citing
  security/copyright (https://app.roll20.net/forum/post/3024712/cant-export-my-character,
  https://www.milbysmaps.com/2020/11/03/map-module-for-foundry-and-a-note-about-roll20/).
- **Theming/UI customization:** essentially none for end users beyond per-game custom sheet
  CSS (Pro). No user-facing theme system.
- **Accessibility:** poor. Forum history shows screen-reader users describing the app as
  built "without consideration for the blind and visually impaired"; focus resets, unlabeled
  controls, canvas fully opaque to AT; pop-out sheets as a partial workaround
  (https://app.roll20.net/forum/post/6398033/accessibility-with-screen-readers-jaws-for-windows-slash-nvda,
  https://app.roll20.net/forum/post/11969534/blind-accessibility). No public VPAT/WCAG
  statement found **[absence = not found, not proven absent]**.
- **Mobile:** app retired (see Platform); tablet play via browser is possible but not a
  first-class experience **[community sentiment]**.

## UI & UX character

- **Onboarding is the headline strength:** zero install, join via link; a functional table in
  ~10–15 minutes vs. Foundry's 1–2 hour first setup
  (https://saga20.com/blog/roll20-vs-foundry-vtt-2026/). Free tier is genuinely playable.
- **Visual design is dated and dense:** 2012-era chrome, cramped right-dock (chat/journal/
  settings tabs), toolbars with poor discoverability. Jumpgate modernizes the canvas layer more
  than the surrounding UI. Recent settings redesigns drew complaints that labels don't match
  contents and controls are scattered illogically
  (https://app.roll20.net/forum/post/10613431/the-new-setting-ui-sucks).
- **Common praises:** accessibility of entry (browser, free, LFG community), voice/video
  included, huge licensed-content catalog, "everyone already has an account."
- **Common complaints:** performance on complex maps, dated/clunky UI, shallow automation,
  paywalled basics (dynamic lighting, custom sheets), storage nickel-and-diming, weak A/V,
  no data portability.

## Community sentiment

- Long-running "Roll20 vs Foundry" discourse: Roll20 wins on ease/reach, loses on power,
  price-over-time, and polish; Foundry's $50-once model is repeatedly cited against Roll20's
  subscription (~$240 for two years of Pro)
  (https://saga20.com/blog/roll20-vs-foundry-vtt-2026/).
- **Trust scars:** July 2024 security incident — an admin account was compromised, exposing
  names, emails, IPs, last-4 card digits
  (https://help.roll20.net/hc/en-us/articles/24620372778775-Data-Security-Incident-July-3rd-2024-FAQ,
  https://www.infosecurity-magazine.com/news/gamers-data-exposed-rpg-platform/); an earlier
  2018 breach and the 2018 "ApostleO" moderation controversy caused a lasting reputation dent
  (https://en.wikipedia.org/wiki/Roll20).
- Elite-tier launch (Oct 2025) read as segmentation toward professional GMs; core complaints
  (UI, portability, automation) remain the community's sore points **[synthesis of sources
  above]**.

## What to steal (functionally — never trade dress)

1. **Zero-install, link-to-table onboarding.** The browser-only, "click a link, you're in"
   flow is why Roll20 still owns the entry market. Our onboarding-speed axis must match or
   beat 10–15 minutes to first session — including for the GM.
2. **Per-GM pricing that covers the whole table.** One paying GM unlocks the table; players
   free. This is the psychologically correct model for a GM-centred product.
3. **Tier-appropriate free tier.** A genuinely playable free tier is the growth engine;
   Roll20 proves freemium works in this market — but their storage/lighting paywalls show
   where resentment starts. Gate convenience, not core play.
4. **Jumpgate's lighting UX details:** one-click lighting panel, hide/reveal mask, Explorer
   Mode (sepia explored areas), and especially **built-in diagnostics** (why can't this token
   see?) — that diagnostic transparency matches our GM-workload and calculation-transparency
   goals.
5. **LFG/community discovery as a product surface** (long-term): game discovery drove their
   network effect. Not a v1 feature, but design identity/accounts so a discovery layer can
   exist later.

## Exploitable weaknesses

1. **No visual builder for systems.** Sheet/system support = HTML/CSS/JS in a nonstandard
   dialect, custom sheets Pro-gated. Our no-code rule-builder (axis 4) attacks an undefended
   flank — Roll20's answer (Beacon SDK) is aimed at developers, not GMs.
2. **Accessibility debt.** Years of documented screen-reader hostility and no public
   conformance statement. A WCAG-serious VTT (axis 5) has no incumbent competition here.
3. **Dated, dense UI and no theming.** Zero user-facing theming; settings UX draws open
   revolt on their own forums. Our theming/customization joy (axis 3) and K3 "sexy AND
   accessible" mandate hit where they are weakest.
4. **Data lock-in.** No campaign export, unreliable character transfer, content locked to
   platform. "Your campaign is yours — export everything" is a trust-based differentiator,
   amplified by their 2018/2024 breach history.
5. **Shallow GM prep + automation.** Journals/handouts only; deep automation requires
   Pro + community JS. A GM console with transparent calculation, undo, and prep-time tooling
   (axis 1) out-prepares them without an ecosystem.

## Threat vs our axes

Roll20 is the incumbent we most resemble superficially (browser-based, freemium, GM-pays) and
its moats are real: ~10M accounts, the LFG network effect, the licensed-content catalog, and
the Demiplane integration extending sheet/compendium reach across many systems. On **axis 2
(onboarding)** it is the strongest competitor in the field — we must beat a 10–15-minute
baseline, not a strawman. On **axis 1 (GM workload)** it is only moderately threatening: prep
tools are basic and automation is paywalled and code-bound, but its content marketplace
reduces prep for *licensed* systems in a way we cannot match without licenses. On **axes 3
(theming), 4 (visual rule-builder), and 5 (accessibility)** Roll20 is weak to absent and shows
no roadmap signal of closing those gaps — Jumpgate investment is going into canvas performance
and lighting, and Beacon/Demiplane into developer-built sheets for licensed systems. Net: Roll20
threatens us on reach and content, not on craft; the realistic danger is not feature parity but
that "everyone is already on Roll20." Our counter is the switcher story its own community keeps
writing: portability, polish, accessibility, and a builder GMs can actually use.

## Sources

All accessed 2026-07-26. Note: help.roll20.net and wiki.roll20.net blocked automated fetching
(403); claims from those domains rely on search-index summaries and are flagged where thin.

- https://saga20.com/blog/roll20-vs-foundry-vtt-2026/ — pricing, feature and onboarding comparison
- https://help.roll20.net/hc/en-us/articles/28498571071255-Roll20-Subscriptions — tier overview
- https://www.geeknative.com/210141/roll20-adds-new-150-subscription-aimed-at-high-usage-game-masters/ — Elite tier
- https://app.roll20.net/forum/post/10031927/roll20-announcement-price-increase — 2021 price increase
- https://roll20partners.zendesk.com/hc/en-us/articles/10498477973527-Roll20-Marketplace-Partner-FAQ — 70/30 split, payouts
- https://roll20partners.zendesk.com/hc/en-us/articles/10844883030679-Marketplace-Pricing-Standards — $4.99 minimum
- https://blog.roll20.net/posts/jumpgate-update-lighting-updates/ — Jumpgate lighting UX
- https://wiki.roll20.net/Project_Jumpgate — Jumpgate overview
- https://help.roll20.net/hc/en-us/articles/38597501957015-2025-Change-Log — 2025 fixes
- https://app.roll20.net/forum/post/12153872/jagged-edges-in-jumpgate-dynamic-lighting — lighting quality complaints
- https://wiki.roll20.net/Building_Character_Sheets — sheet authoring (HTML/CSS/sheetworkers)
- https://help.roll20.net/hc/en-us/articles/360037773413-Intro-to-Sheet-Development — sheet dev intro
- https://wiki.roll20.net/Using_Custom_Character_Sheets — Pro gating of custom sheets
- https://blog.roll20.net/posts/roll20-has-acquired-demiplane/ — Demiplane acquisition
- https://help.roll20.net/hc/en-us/articles/30050730960151-Demiplane-and-Roll20-Character-Sheet-Integration-Beta — integration beta
- https://blog.roll20.net/posts/newsletter-february-28-2025-public-alpha-demiplane-roll20-integration-march-ama-beacon-sdk-sheet-updates-more/ — Beacon SDK
- https://blog.roll20.net/posts/were-retiring-the-roll20-mobile-app-to-build-something-better-heres-why/ — mobile app retirement
- https://app.roll20.net/forum/post/787242/approaching-limit-to-100mb-free-storage-but-deleting-art-assets-isnt-helping — free storage limit
- https://app.roll20.net/forum/post/3024712/cant-export-my-character — export failures
- https://www.milbysmaps.com/2020/11/03/map-module-for-foundry-and-a-note-about-roll20/ — creator on export stance
- https://app.roll20.net/forum/post/6398033/accessibility-with-screen-readers-jaws-for-windows-slash-nvda — screen-reader issues
- https://app.roll20.net/forum/post/11969534/blind-accessibility — blind-accessibility thread
- https://app.roll20.net/forum/post/10613431/the-new-setting-ui-sucks — settings UI complaints
- https://help.roll20.net/hc/en-us/articles/24620372778775-Data-Security-Incident-July-3rd-2024-FAQ — 2024 incident FAQ
- https://www.infosecurity-magazine.com/news/gamers-data-exposed-rpg-platform/ — 2024 breach coverage
- https://en.wikipedia.org/wiki/Roll20 — history incl. 2018 breach/controversy
- https://www.enworld.org/threads/roll20-now-has-10-million-users.686259/ — user count
- https://www.similarweb.com/website/roll20.net/ — traffic ranking
- https://redcirclegames.co.uk/2026/04/26/ai-developments-revisited.html — AI stance
- https://alternativeto.net/software/roll20/about — discovery/LFG sentiment
