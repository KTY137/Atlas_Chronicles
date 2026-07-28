# RB-15 — Die Werkzeuglandschaft

**The map of the whole tabletop tooling landscape, and the absorb / integrate / refuse ruling for
each part of it.**

Compiled 2026-07-27. Commissioned against Kaya's amendments **K8/K9** (*"wir wollen halt sein wie
WorldAnvil nur besser größer stärker"* · *"eine marriage aus worldanvil und Foundry/roll20 etc. Wir
kombinieren die meisten pnp tools in ein giga tool. eine Chronicles Platform um die eine platform zu
schreiben die jede andere knechtet"*).

Reads as binding context and does not re-open: [`RB-11`](RB-11-steam-vs-browser-verdict.md) (one
web/DOM codebase, browser + Electron, one-time GM licence, players free, sold direct, Steam gated,
discovery through creators and system authors, UVTT + rival-shaped export at launch),
[`CHAMPION.md`](../iterations/CHAMPION.md) §1/§4/§9/§11/§16, [`00-intake.md`](../00-intake.md) and
the fifteen invariants. Does not duplicate RB-01 (Foundry, Roll20, Fantasy Grounds, Owlbear, Alchemy,
TaleSpire), RB-02 (rendering), RB-04 (asset licensing), RB-05 (competitor maps), RB-07..10
(distribution). Does not touch RB-12/RB-13 (Fandom import and teardown), which are being written
concurrently.

## Method, and what the evidence is worth

`worldanvil.com` returns **403** to direct fetch (Cloudflare). Everything attributed to World Anvil
here comes from search-surfaced knowledge-base and Codex pages, their own blog, third-party reviews,
and their community suggestion board — never from a page I read directly. Marked accordingly.
`legendkeeper.com` was fetched directly and is marked as such.

Three rules were applied without exception:

1. **No invented numbers.** Where a figure could not be established, the text says **"no reliable
   figure found"** and moves on. That phrase appears eleven times below and each one is a real gap,
   not a hedge.
2. **Vendor self-reporting is labelled `[vendor claim]`.** "World Anvil has 1.5 million users" is a
   marketing sentence, not a measurement, and it is written that way here.
3. **Pricing is as-observed, in the currency and period the source stated**, and prices in this
   market move (Inkarnate attempted a >2× annual increase in September 2025 and rolled it back —
   §1.7). Treat every number as a snapshot with a date, not a constant.

---

## 0. The finding, before the map

The landscape does **not** consist of many tools because nobody has tried to unify it. It consists of
many tools because **the three richest attempts at unification all failed at the same seam, and the
one company best placed to unify it has publicly declined to.**

- **Hasbro/WotC** built *Project Sigil*, a 3D VTT for D&D Beyond — the largest character-sheet and
  compendium platform in the hobby, owned by the largest publisher in the hobby. It shipped February
  2025, ~90 % of its team was laid off shortly after, active development ended in 2025 and the
  servers close **31 October 2026**. WotC's own framing: they could not sustain the level of ongoing
  support or the quality standard. Press framing: *"it never became entirely clear how Sigil would
  fit into the D&D ecosystem"* (GamesRadar, geeknative, D&D Beyond's own sunset post).
- **Roll20** assembled the giga-tool by acquisition instead of by engineering: VTT (Roll20) +
  marketplace (OneBookShelf/DriveThruRPG/DMsGuild, joint venture July 2022) + map making (Dungeon
  Scrawl) + character builder and rules compendium (Demiplane, acquired June 2024). Four of the
  eighteen functions below, under one owner, with *"over 10 million users"* `[vendor claim, 2022
  merger announcement]`. And **500,000 people still install a browser extension to route their
  character sheet from a competitor's product into it** (§2).
- **World Anvil**, the biggest world-building platform in the hobby (*"a community of 1.5 million
  users"* `[vendor claim]`), **has not built a VTT and shows no sign of doing so.** Its own community
  suggestion board carries an open, unshipped request *"Add Virtual Tabletop for D20 Play"*, and the
  competing suggestion — *integrate with Foundry instead* — is the one that has a product. That
  product, the "World Anvil Integration" module, is **MIT-licensed and credited to a single community
  author (`didialchichi`)**, not to World Anvil and not to Foundry's company.

So the honest shape of the ambition is not *"can one tool do everything"* — the answer to that is
demonstrably **no, and expensively no**. The shape is: **which seam is genuinely unowned, and is it
load-bearing enough that owning it re-orders the market?** This document's answer is §5, and the
answer is a permission object, not a feature.

---

## 1. The functional map

Eighteen functions. Brands are listed as *current owners of the function*, not as the function.

### Summary table

| # | Function | Who owns it today | Rough scale / price, as established | Ruling (§3) |
|---|---|---|---|---|
| 1 | World-building & wiki | World Anvil, LegendKeeper, Kanka, Obsidian, Notion, Campfire | WA free→$58/yr Master, $105/yr GM, $300/yr Sage; LK $90/yr; Kanka free→$4.99/mo; Campfire modular $2–12/mo, $375 lifetime | **ABSORB** |
| 2 | Live tabletop (map, tokens, fog) | Foundry, Roll20, Fantasy Grounds, Owlbear, Alchemy, TaleSpire | See RB-01/RB-05 | **ABSORB** |
| 3 | Character sheets & builders | D&D Beyond, Demiplane, Foundry systems, Shard, Quest Portal | Foundry: **475 systems**, 10 years | **ABSORB** (the schema) |
| 4 | Rules compendia (the *content*) | D&D Beyond, Demiplane, Foundry premium modules, 5eTools (illegally) | SRD 5.1/5.2 under CC-BY-4.0; ORC for Paizo | **REFUSE to publish · INTEGRATE the container** |
| 5 | Encounter & combat management, initiative | Foundry+Midi-QOL, Fantasy Grounds, Kobold Plus Fight Club, Obsidian Initiative Tracker | KPFC free, community-run | **ABSORB** |
| 6 | Monster / NPC / loot / name generation | donjon, Fantasy Name Generators, Avrae, a 2025–26 wave of AI GM assistants | Mostly free; AI tiers ~$8/mo (Quest Portal Pro) | **ABSORB** (deterministic + runtime-draft AI) · **REFUSE** (AI art) |
| 7 | Map making | Inkarnate, Wonderdraft, Dungeondraft, Dungeon Alchemist, Czepeku et al. | Inkarnate $5/mo or $25/yr; Wonderdraft & Dungeondraft ~$30 one-time each; Dungeon Alchemist €2.46 M / 57,209 backers (RB-07/11) | **INTEGRATE** (assets, UVTT) · **ABSORB narrowly** (WFC generation) · **REFUSE** (paint program) |
| 8 | Audio & ambience | Syrinscape, Tabletop Audio, YouTube, Foundry playlists | Syrinscape: 15 free SoundSets vs **1,746** on SuperSyrin; Tabletop Audio free | **REFUSE** |
| 9 | Session prep & notes | Obsidian, Notion, OneNote, World Anvil campaign manager, paper | Obsidian free for personal use | **ABSORB** |
| 10 | Timelines & calendars | Aeon Timeline, World Anvil, Campfire, LegendKeeper, Foundry calendar modules | Aeon ~$65 perpetual + 12 mo updates | **ABSORB narrowly · REFUSE the calendar engine** |
| 11 | Relationship & faction tracking | World Anvil (diplomacy webs, family trees), Kanka (relations), Campfire (Relationships), Obsidian graph | — | **ABSORB as a derived view only** |
| 12 | Scheduling & group-finding | StartPlaying, Discord, r/lfg, Roll20 LFG | StartPlaying: $6.65 M raised, >1,000 pro GMs, >100,000 games, 90/10 split; *">$50 M paid to GMs"* `[platform claim]` | **REFUSE** |
| 13 | Play-by-post & async play | Discord, forums (RPoL, Gamersplane, Rolegate), TaleSpire persistent boards | No reliable figure found | **ABSORB** |
| 14 | Voice / video | Discord, overwhelmingly. Roll20 and Foundry both ship A/V and are routed around | Discord free | **REFUSE** |
| 15 | Virtual dice & physical-dice readers | Every VTT; Avrae on Discord; Pixels, GoDice for hardware | Pixels: $3.5 M Kickstarter, ~25 k backers | **ABSORB** (virtual) · **INTEGRATE, deferred** (hardware) |
| 16 | Content marketplaces | DriveThruRPG/DMsGuild (Roll20), Roll20 Marketplace, Foundry premium listing, itch.io, Patreon | Foundry: **2,138 of 5,338** approved modules are paid (RB-01) | **REFUSE the storefront · ABSORB the format** |
| 17 | Streaming / actual-play production | OBS, Alchemy's production values, TaleSpire's diorama, Roll20 stream layer | — | **REFUSE** |
| 18 | Import / export / bridging | Beyond20, AboveVTT, UVTT as a de-facto standard, World Anvil↔Foundry module | Beyond20: **500,000** Chrome + **35,378** Firefox users | **ABSORB — and it is a weapon** |

### 1.1 World-building & wiki

The category Kaya named. Four models coexist:

- **World Anvil** — feature-maximalist. Articles, interactive maps, family trees, diplomacy webs,
  fantasy calendars, timelines, whiteboards for mindmapping, RPG statblocks, player character sheets
  *"for over a hundred systems"*, a community statblock library, custom statblock templates, and a
  campaign manager `[all from World Anvil knowledge-base pages, surfaced via search — site not
  directly readable]`. Guild tiers: Freeman (free), Master ≈ $6.50/mo or $58/yr, Grandmaster ≈
  $12/mo or $105/yr, Sage ≈ $175/6 mo or $300/yr; lifetime Sage and Grandmaster exist `[figures from
  a Jan-2025 third-party review; World Anvil's own pricing page is unreadable — treat as approximate
  and stale]`. Tiers gate *subscriber seats*: Grandmaster 100 slots, Sage 1,000.
- **LegendKeeper** — the anti-World-Anvil. **One paid plan, $9/mo or $7.50/mo billed annually
  ($90/yr)**, unlimited everything (projects, pages, maps, timelines, whiteboards, collaborators,
  storage), a free Basic tier that can *view, export and collaborate* but not create, and — the
  detail worth stealing — **"Guest participation is completely free; only project owners require an
  active subscription."** `[read directly from legendkeeper.com/pricing, 200 OK]`. That is exactly
  Chronicle's ratified GM-pays/players-free shape, already validated in the wiki half of the market.
  Third-party reviews describe it as *"the smoothest interface of any wiki tool tested"* with a
  *"well thought-through player-share feature."*
- **Kanka** — source-available (GitHub: `owlchester/kanka`, PHP/Vue/MySQL), unlimited campaigns and
  entries on a real free tier, paid from $4.99/mo for premium campaigns, larger uploads, no ads.
  Kanka's 2022 free-tier change caused enough community upheaval that the founder wrote a public
  post about it — a standing reminder that in this market **the free tier is a promise, and
  narrowing it is a reputational event.**
- **Obsidian / Notion** — general-purpose note tools that the TTRPG community has colonised. The
  Obsidian Hub maintains a whole "Plugins for TTRPG" category; the load-bearing three are **Dice
  Roller**, **Fantasy Statblocks** and **Initiative Tracker** (Obsidian-TTRPG-Community), plus
  Obsidian Leaflet for interactive maps. No reliable install figures found. What matters is the
  *shape*: GMs will rebuild a VTT's combat features inside a note-taking app rather than move their
  notes into a VTT. **Notes have higher switching cost than tables.**
- **Campfire Writing** — novelist-facing, and the most interesting *pricing* idea in the landscape:
  **18 modules sold individually**, from ~$2/mo each, ~$12/mo for all, ~$375 lifetime for
  everything. It is the only vendor here that has made "the giga tool" purchasable in pieces.

**What the category tells us:** the wiki half is a mature, crowded, *subscription* market with a
clear price ceiling around $90–105/yr for serious users, one credible one-time-ish option
(Campfire's lifetime), and a well-established free-for-players norm. And nobody in it plays.

### 1.2 Live tabletop

Covered exhaustively in RB-01 and RB-05; not repeated. The two facts that matter to *this* map:

- **Foundry's ecosystem is the thing that cannot be out-featured**: 5,338 approved modules, 2,138 of
  them paid, **475 systems**, median user runs 19 modules (Foundry's own Year in Review 2026, via
  RB-01). Chronicle's declarative, no-arbitrary-code invariant means **we can never have this
  ecosystem in this shape.** Stated bluntly because the map is worthless if it pretends otherwise.
- **That same ecosystem is Foundry's biggest liability**: one month after V14 released, only **1,590
  of 5,338** modules were V14-compatible (RB-01). The tool that owns the function also owns a churn
  problem that its users experience as breakage every year.

### 1.3 Character sheets & builders

D&D Beyond owns the 5e sheet as *product*. Demiplane's "Nexus" owns it for Pathfinder 2E, Vampire:
The Masquerade, Avatar Legends and a growing list — and Roll20 bought Demiplane in June 2024
explicitly to get *"the best-in-class character-building solution"* and to sync characters, content
and subscriptions across to the VTT. Foundry's answer is 475 community systems plus the community
module **Custom System Builder** — sheet building with formulas and rolls *"without any line of
code"* (RB-01), which is the closest existing thing to K2 and is, tellingly, **a community module
rather than a product.**

The undefended axis is unchanged from RB-01: **no one sells a first-class, visual, system-agnostic
sheet-and-rules authoring product.** They sell sheets for systems they chose.

### 1.4 Rules compendia — the content, not the container

The legal facts, which are the whole story:

- **SRD 5.1 is under CC-BY-4.0** since January 2023, irrevocably; SRD 5.2.1 followed under the same
  terms. Attribution is required; there is **no share-alike**, so a commercial VTT may ship it.
- **Paizo's ORC** exists precisely because CC BY-SA's share-alike could not accommodate Reserved
  Material.
- **Everything else is enforced.** WotC filed a **GitHub DMCA takedown against the 5etools mirrors in
  August 2024**, on the grounds that they consisted *"almost exclusively of content copied verbatim"*
  from published rulebooks, with contributors instructed that *"only 'official' (that is, published
  by WotC) data is to be included."* The most complete free compendium in the hobby is a copyright
  infringement and was treated as one.

And the *operational* fact, which is the one this crew will feel: **Kobold Fight Club — the
best-known encounter builder in 5e — died in late 2024 because it was backed by Google Sheets and
Google changed its API policy.** The community rebuilt it as Kobold Plus Fight Club. A compendium is
not a feature; it is a data pipeline with an owner who can change the terms.

### 1.5 Encounter & combat management

Foundry reaches deep automation only through module stacks (Midi-QOL et al.); Fantasy Grounds ships
rules automation natively (RB-01); Kobold Plus Fight Club owns standalone encounter balancing;
Obsidian's Initiative Tracker owns it for people who never opened a VTT at all. Nothing here is a
business. It is table stakes, and Chronicle already prices it (CHAMPION §9.2: initiative, HP,
conditions, undo, timers — 7 days, in slice 1).

### 1.6 Generation — monsters, NPCs, loot, names

Two eras stacked on top of each other:

- **The deterministic era**, still healthy: **donjon** (dungeon, world, NPC, name, treasure
  generators), Fantasy Name Generators, Avrae's dice-and-macro layer on Discord. All free, all tiny,
  all beloved, none monetised.
- **The AI era, 2025–26**, and it is *contested ground, not open ground.* The GDC 2026 survey found
  **52 % of game developers view generative AI negatively**. The **ENnie Awards banned AI-assisted
  submissions for the 2025–26 cycle**. **Inkarnate announced a total ban on AI art for its
  forthcoming marketplace in October 2025 after a boycott** (§1.7). And **Foundry's creator called
  generative AI in the industry "a betrayal of the creative people who made the TTRPG industry what
  it is,"** describing it as *"an exploitative technology that unfairly harvests the intellectual
  property of artists, writers, and designers."*

But Foundry's *written policy* is more precise than its founder's sentence, and it is the single
most useful artefact I found for Chronicle's own AI stance:

> **Prepared content must be human-made** — anything intentionally pre-created (text, images, audio,
> marketing) must originate from human creative work. **Improvised content may be AI-generated** —
> content generated at runtime in direct response to an end-user's prompt is permitted. **Code may be
> AI-generated** provided the author personally understands and is prepared to maintain it.
> — Foundry VTT AI Content Policy

That is, near-verbatim, the pack's existing invariant (*AI is optional and always draft*) plus an
explicit blessing of exactly how this crew is built. It should be adopted as Chronicle's published
policy, cited to its source, because it converts our largest reputational exposure into a stated
alignment with the most respected operator in the category.

### 1.7 Map making

Two sub-functions that behave completely differently.

**Authoring by hand** is owned and cheap: **Inkarnate** ($5/mo or $25/yr for Pro — browser,
subscription), **Wonderdraft** and **Dungeondraft** (~$30 one-time each, desktop, world maps and
battlemaps respectively). Plus the asset economy on top of them (RB-04). This is a settled market
with a decade of asset libraries; entering it is a content-production war, not a software war.

**Generation** is not settled: **Dungeon Alchemist** raised **€2.46 M from 57,209 backers**
(RB-07/RB-11) on procedural 3D interiors and — the fact RB-11 already built strategy on — **exports
*into* every rival VTT**, which is how a single-purpose tool reached the whole market without owning
a table.

And the market's temper here is worth recording precisely, because it is the clearest example of
this community's power over its vendors: in **mid-September 2025 Inkarnate announced a price rise
that would more than double an annual subscription; the outcry forced a rollback; days later an
outsourced Inkarnate advertisement was found to contain AI art; on 24 September the CEO confirmed
intent to permit generative AI on the coming third-party marketplace; a boycott followed; in October
2025 Inkarnate reversed and banned AI-generated art from the marketplace outright, with vetting.**
The community's response to the ban was *"almost universally positive."*

**Two pricing lessons in one incident: a >2× price rise is not survivable, and an AI position is not
a settings toggle.**

### 1.8 Audio & ambience

**Syrinscape** is the category owner and its moat is explicitly *content, not software*: **15
SoundSets free versus 1,746 on a SuperSyrin subscription**, with players able to join a GM's
broadcast with no account, no payment and nothing to install. **Tabletop Audio** is the free,
browser-based, deliberately simple alternative. Foundry ships playlists; every VTT ships some sound
layer; nobody has displaced Syrinscape, because nobody has licensed 1,746 curated sound sets.

### 1.9 Session prep & notes

Owned by general-purpose tools (Obsidian, Notion, OneNote) and by the wiki tier's campaign managers.
No reliable figure found for share. What is establishable is the *stack shape*: LegendKeeper's own
2025 round-up describes the typical DM as pairing **a memory tool + a VTT + one visual prep tool +
one asset-creation tool** — roughly four products `[vendor-adjacent source; treat as a well-informed
opinion, not a survey]`. I found **no rigorous survey of GM tool-stack size** and will not invent
one.

### 1.10 Timelines & calendars

**Aeon Timeline** (~$65 perpetual licence with 12 months of updates, up to five devices — notable as
one of the few non-subscription tools in the whole map) serves writers and historians. World Anvil,
Campfire and LegendKeeper all ship timelines; World Anvil additionally ships **fantasy calendars**
with custom month structures. Foundry has calendar modules. This is a commodity feature with a
long, deep tail: *custom calendars* look small and are not — leap rules, multiple moons, per-culture
epochs, and a UI for all of it.

### 1.11 Relationship & faction tracking

World Anvil ships **diplomacy webs and family trees**; Kanka ships a relations system with
`@mentions`; Campfire sells a Relationships module; Obsidian users get a graph view for free as a
by-product of linking. Nobody charges for this as a headline. It is a *view*, and every product that
built it as a separate editable object has quietly created a second source of truth its users must
maintain by hand.

### 1.12 Scheduling & group-finding

**StartPlaying** is the real business here: **$6.65 M raised** (seed $6.5 M, May 2022; Y Combinator,
a16z, Amino, Gravity, Polymath), **over 1,000 professional GMs**, **over 100,000 games hosted**,
**GMs keep 90 %, the platform takes 10 %**; the platform states GMs have earned *">$50 M"* on it
`[platform claim; an earlier post said ">$3 M" since Sept 2020 launch, so the two figures come from
very different dates — do not treat as a single trend line]`. Beyond the paid-GM niche, scheduling
is owned by **Discord** and by r/lfg.

This is a **two-sided marketplace with liquidity as the moat**. It is the single least
attackable function on the map for a one-person product, because its value is entirely in the
strangers on the other side.

### 1.13 Play-by-post & async play

Owned by *venues*, not by software: Discord servers (DISBOARD carries a whole `play-by-post` tag),
and forums — RPoL, Gamersplane, Rolegate. Community reporting describes most PbP as asynchronous by
construction and notes a live migration of forum RP into Discord, with a countercurrent of players
who still want threaded forums. **No reliable figure found** for population.

**There is no product here.** There is a practice with a fifty-year history (letter-writing campaigns
in the 1970s) and no tool that treats asynchronous play as a first-class mechanic with rules,
permissions and dice. TaleSpire's persistent boards are the nearest adjacent thing and, as CHAMPION
§16 already notes, they have no sheets, no rules and no journals.

### 1.14 Voice / video

**Discord, decisively.** Roll20 ships integrated voice/video and maintains a troubleshooting article
for it; its own community forums are full of threads recommending Discord instead, for reasons that
are structural rather than fixable: separation of concerns, CPU load on older machines, the ability
to run comms on a phone or tablet and keep the whole main screen for the tabletop, and simple
reliability. D&D Beyond's Maps shipped without voice/video at all and the forums noted it.

**A VTT that builds voice competes with Discord on Discord's home turf, pays SFU bandwidth forever,
and loses anyway.** This is the most thoroughly evidenced refusal on the map.

### 1.15 Dice — virtual and physical

Virtual dice are table stakes everywhere. The interesting edge is **physical-dice readers**:
**Pixels** (Bluetooth LED dice; **$3.5 M Kickstarter, ~25,000 backers**; retail on Amazon; explicitly
marketed as *"VTT Connectable via Bluetooth"*) and **GoDice**. The integration pattern is already
community-built and community-maintained — e.g. a public `pixels-demiplane-nexus-integration`
project on GitHub. Nobody has standardised it; every VTT bridge is bespoke.

### 1.16 Content marketplaces

**Roll20 owns the biggest one** via the OneBookShelf joint venture (DriveThruRPG, DMsGuild, eleven
storefronts in total; DriveThruRPG *"the premier digital marketplace... since 2001"* with *"over 1
million worldwide role-playing game users"* `[vendor claim]`). **Foundry runs a package listing where
2,138 of 5,338 approved modules are paid** (RB-01) — i.e. Foundry monetises other people's work at
scale without operating a conventional store. **itch.io and Patreon** carry the long tail (Dungeondraft
asset packs, map packs).

A marketplace is payments, tax, chargebacks, refunds, moderation, takedowns, ratings, disputes and
fraud. It is a *company*, and this builder is one person.

### 1.17 Streaming & actual-play production

Owned by OBS and by the platforms' own aesthetics. Alchemy bets on production values; TaleSpire bets
on the diorama gasp (RB-01). There is no dominant "stream your TTRPG" product because the pipeline is
already solved by generic broadcasting software.

### 1.18 Import / export / bridging

Treated as an afterthought by most vendors and as a *strategy* by the two that matter. **UVTT
(`.dd2vtt`/Universal VTT)** has become the de-facto interchange format for battlemaps with walls,
lights and portals, largely because Dungeondraft and Dungeon Alchemist export it and everyone else
reads it. **Dungeon Alchemist reached the whole market by exporting into its rivals** — RB-11's
founding observation. And the parasites in §2 are this function turned into a product.

---

## 2. The integration parasites — the most instructive category on the map

Three organisms, one lesson each.

**Beyond20** — a browser extension that adds roll buttons to a **D&D Beyond** character sheet and
fires the results into **Roll20, Foundry or Discord**. **500,000 users on the Chrome Web Store**
(35,378 on Firefox; ~300,000 as of March 2021, so it roughly tripled in four years). It is free, it
is unofficial, it is a volunteer project, and it sits between two of the largest commercial products
in the hobby.

**AboveVTT** — a Chrome extension that turns a D&D Beyond campaign page into *a functioning VTT
inside D&D Beyond*: DDB sheets driving HP, dice, conditions and spells in chat; monster tokens; maps
from official DDB modules; fog of war; dynamic lighting; grid and hex; custom tokens. **No signup, no
fee.** It is a virtual tabletop built *as a parasite on the compendium*, because the compendium
vendor would not build one — and when that vendor finally did (Sigil), the vendor's version is the
one shutting down while the parasite keeps running.

**The World Anvil ↔ Foundry module** — categories become folders, articles become journal entries,
cross-links are preserved, linked articles auto-import on access, a "WA Sync" button keeps it
updated, GM-only. Verified up to Foundry v14.364 and updated within the last fortnight. **Written by
one community author, MIT-licensed.** The connection between the largest world-building platform and
the largest open VTT in the hobby is a hobby project.

### What this proves about the "one tool" thesis

**It proves the thesis is right about the demand and wrong about the mechanism.**

Right about demand: half a million people did not install an extension for fun. They installed it
because their tools do not talk, and they were willing to add a *fourth* moving part rather than
give up either of the first two. The seam is real, painful, and mass-market.

Wrong about mechanism — three ways, each sharp:

1. **Nobody switched.** Every one of those 500,000 users still pays D&D Beyond *and* still uses
   Roll20 or Foundry. The bridge did not consolidate the market; it **made non-consolidation
   comfortable**. A giga-tool competes not against each rival separately but against *the rival plus
   its bridges*, and the bridges are free and written by people who are not paid to stop.
2. **What crosses the seam is impoverished.** Beyond20 moves a *number and a card*. AboveVTT moves
   *tokens and hit points*. The World Anvil module moves *article text into Foundry's HTML-string
   journal*. **None of them can move an object with an address, a provenance, a permission or a
   history** — because the receiving product has nowhere to put one. This is the structural moat
   CHAMPION §16 claims, and §2 is the proof it has been asking for: the bridges are not merely
   inferior to fusion, **they are incapable of it by construction.**
3. **The parasite depends on its host's DOM and dies on its host's schedule.** Beyond20 must track
   D&D Beyond's markup. AboveVTT lives entirely inside a page WotC owns. Kobold Fight Club died from
   a Google API policy change (§1.4). Foundry's own module ecosystem was **70 % broken one month
   after V14** (RB-01). Bridges are a permanent subscription to someone else's release schedule.

### What it proves about import/export as a weapon

Everything RB-11 ratified, plus a sharpening.

- **Import is the switching cost, and it is the only one we can pay on the user's behalf.** The
  reason people bolt tools together instead of moving is that moving means retyping a world.
  Whoever eats the migration cost gets the user. This is precisely why RB-12 (importing a real Fandom
  wiki) is being written in parallel and why it matters more than its size suggests.
- **Export is the *permission to try us*.** Dungeon Alchemist sold €2.46 M of a tool that makes maps
  for its competitors. A one-time-purchase product with no lock-in must say, credibly, *"if you
  leave, you take everything."* CHAMPION already has the strongest possible version of this
  (export → import → **diff empty**, §12.1 step 12) and it should be marketed as a promise, not
  buried as a gate.
- **But an export target is a maintenance liability forever, and this is the thing the crew has
  mispriced.** See §6 — it is the warning of this document.

---

## 3. ABSORB / INTEGRATE / REFUSE — the ruling

The buckets, counted honestly: **9 ABSORB · 4 INTEGRATE · 10 REFUSE** (some functions split, which
is why the count exceeds eighteen). The refusals are where this document earns its keep, so they are
argued at greater length than the absorptions.

### 3.1 ABSORB

**1 · World-building & wiki — ABSORB.** It is half the thesis and the only half with a measured
artefact behind it (the editor: 116 SLOC identity layer, 0.087 ms/keystroke at 300 passages,
CHAMPION §2). The differentiator is not "we have articles" — World Anvil has had articles for a
decade — it is the **addressable atom below the page** (the passage, with its own provenance and its
own projection). Absorbing the wiki without the atom would be building a worse World Anvil, and that
is the one failure mode this bucket must be guarded against.

**2 · Live tabletop — ABSORB, on the ratified schedule.** Non-negotiable: a wiki that does not play
is a wiki, and §5 shows the fusion claims are all false without a table. The sequencing question
(canvas in slice 2, `OPEN-DECISIONS.md` §K5) is out of scope here — but §1.2's second fact is a
mitigation nobody has written down: **Owlbear proves a table can be loved with almost no features**
(no initiative tracker, no character sheets without extensions — *"a battlemap tool, not a full VTT
platform"* — and it is the most-recommended tool in the hobby for time-to-table). The bar for "there
is a game in it" is far lower than Foundry sets it.

**3 · Character sheets — ABSORB the schema, and this is K2's real justification.** We are not
building sheets; we are building the thing that makes sheets, because §1.3 shows nobody sells one.
The evidence that this is the right bet is negative and strong: the closest competitor is a
*community module* (Custom System Builder), and its own docs lean on an example module and Discord
support (RB-01).

**5 · Encounter & combat management — ABSORB.** Already costed, already in slice 1, no market to
take because there is no business here.

**6 · Generation — ABSORB the deterministic generators, ABSORB AI strictly as runtime draft.** The
deterministic half (names, loot, NPCs, tables) is cheap, delightful, and structurally ours because
a generated result that can be *minted* carries provenance no donjon output can. The AI half adopts
**Foundry's published three-way policy verbatim in spirit** (§1.6): prepared content human-made,
improvised content AI-permitted at runtime on explicit user prompt, code AI-assisted with human
ownership. Publish the policy before shipping the feature, not after.

**9 · Session prep & notes — ABSORB, because the thesis is that we delete it.** *"Der Kanon ist der
Bodensatz des Abends"* is a claim about this function specifically. If prep survives Chronicle
intact, the champion is refuted (and the Prägerate gate says so).

**13 · Play-by-post & async — ABSORB, and it is the strongest ABSORB on the map.** §1.13 found a
fifty-year-old practice with *no product*. CHAMPION §16 already claims this ("the only seven-day
product in the comparison set") but claims it against *wiki* rivals; the map shows the gap is wider
than that — **it is unowned on both sides of the seam.** The one caution: unowned is not the same as
unwanted, and W1/W2 are the gates that decide which it is.

**15 · Virtual dice — ABSORB.** Already deeper than the market: seeded, AST-frozen, package-pinned,
byte-replayable across platforms and locales (Nachrechnen, gate *Nachgerechnet*). No rival's die roll
survives an engine upgrade. Keep the honest limit CHAMPION §4.11 states — durability, **not**
anti-forgery — and never let marketing upgrade it.

**18 · Import / export — ABSORB, as first-class product surface.** Ratified by RB-11; §2 explains
*why* it is a weapon and §6 explains what it costs.

**16b · The package format — ABSORB (as distinct from the marketplace, which is refused).** Rule
packages, theme manifests, tilesets and `die Ausgabe` are the tradeable units. Own the **format** and
the **validator** (`Geschlossene Tüte`, ten hostile fixtures); let other people's storefronts move
the goods.

### 3.2 INTEGRATE

**4b · Rules compendia — INTEGRATE the container, never the content.** We ship the *schema* and the
*validator*; SRD 5.1/5.2 under CC-BY is legally shippable with attribution and is the correct demo
payload; everything else arrives as user- or author-supplied packages. See the refusal in §3.3 for
the part that matters.

**7a · Map assets and interchange — INTEGRATE.** UVTT import and export at launch (already ratified,
already costed at 6 days in CHAMPION §9.2). The entire Inkarnate/Wonderdraft/Dungeondraft/Dungeon
Alchemist economy becomes our asset pipeline for free, and the licensing groundwork is done (RB-04).
**We win this function by reading other people's files, not by drawing.**

**8b · Audio — INTEGRATE only as a cue, if at all.** A scene may *emit a named cue*; what plays it is
the user's business. This is deliberately less than an integration — no bundled library, no
licensing, no CDN, no player. Cost: near zero. Value: the fusion story stays honest.

**15b · Physical dice readers — INTEGRATE, deferred, and cheap when it comes.** Web Bluetooth in an
Electron/browser client can read a Pixels die. It is a two-day flex that photographs beautifully and
appeals to precisely the creator channel RB-11 named. **It is not a launch item and must never be
allowed to become a hardware relationship.**

### 3.3 REFUSE — the part of this document that is worth reading

**4a · Publishing rules content — REFUSE.** We will never be a compendium publisher. Reasons, in
order of force: (i) the pack invariant already forbids unlicensed rulebook content; (ii) the enforcement
is real and recent — **WotC DMCA'd 5etools' mirrors in August 2024** for verbatim rulebook data;
(iii) it is not a software problem but a **content-operations** problem with per-system licensing
negotiations, and it is exactly what D&D Beyond and Demiplane are *for*; (iv) one person cannot data-enter
a game system, let alone maintain it across errata. **What the user does instead:** installs a rule
package authored by a system author or by the publisher, or the CC-BY SRD package we ship as the
reference implementation. *(This refusal has a sharp edge — see §6.)*

**7c · A hand-drawing map editor — REFUSE.** Chronicle will not compete with Inkarnate's asset
library or Dungeondraft's brushes. That is a decade of art production, and RB-04 already establishes
what commercial asset licensing costs. **K5 is not refused — it is scoped**: Chronicle builds a
**generator** (WFC, constraint-collapse, the Forge), which is an unowned capability, and imports
everything hand-drawn. **What the user does instead:** draws in Dungeondraft or generates in Dungeon
Alchemist, exports UVTT, and Chronicle reads walls, lights and portals losslessly.

**8a · An audio library — REFUSE.** Syrinscape's moat is **1,746 licensed SoundSets**, not a player
widget. Building the widget without the library ships an empty box; building the library is a music
licensing business. **What the user does instead:** Syrinscape's browser player (players join a GM's
broadcast free, nothing to install) or Tabletop Audio, in a second tab, where it already lives.

**10b · A fantasy-calendar engine — REFUSE (for slice 1–2).** Chronicle absorbs **the in-fiction
date** — it already has one, on every Revelation, and `die Postlaufzeit` already makes it mechanical.
It refuses the *engine*: arbitrary month structures, leap rules, multiple moons, per-culture epochs,
and the UI to configure them. World Anvil and Aeon Timeline serve people who want that, and it is a
bottomless feature. **What the user does instead:** keeps their calendar in World Anvil or Aeon
Timeline; Chronicle stores a date and a label and does not pretend to interpret it.

**11b · A hand-maintained relationship graph — REFUSE.** ABSORB the *view*, refuse the *object*.
Chronicle already knows who has heard what from whom (`Quelle`, `Gehört(from_character_id, …)`,
`Revelation`, `Brief`). A faction web is therefore **a projection of data that already exists**, and
building an editable graph beside it creates the second source of truth that every rival in §1.11 now
maintains by hand. **No new noun.** *(This is also §5's clearest example of fusion versus
co-location.)*

**12 · Scheduling & group-finding — REFUSE, absolutely.** StartPlaying's moat is **liquidity** — a
$6.65 M-funded two-sided marketplace with 1,000+ GMs and 100,000+ games. A scheduling feature inside
a GM-licensed product has **no network effect at all**, because our unit of existence is one table
that already knows each other. Building it means building a marketplace we cannot fill. **What the
user does instead:** Discord, r/lfg, StartPlaying. At most, Chronicle exports an `.ics` line for a
session date — and even that should wait until someone asks twice.

**14 · Voice / video — REFUSE, and this is the easiest call on the map.** Roll20 built it and
maintains a troubleshooting article for it; its own forum threads route users to Discord for reasons
that will not change (separation of concerns, CPU cost, comms on a phone so the screen stays for the
table, reliability). D&D Beyond Maps shipped without it. **And the economics are fatal to us
specifically:** WebRTC at scale needs an SFU, an SFU is a per-minute bandwidth cost, and Chronicle
sells a **one-time licence** — every hour of voice would be a permanent loss against a payment
received once. **What the user does instead:** Discord, in the other window, as they already do.

**16a · A content marketplace / storefront — REFUSE.** Payments, tax, VAT/MOSS, chargebacks,
refunds, moderation, DMCA handling, ratings, disputes, fraud. That is a company, and the builder is
one person with an AI crew. Roll20 *bought* its marketplace; Foundry took a decade to get to 2,138
paid packages. **What the user does instead:** authors sell `.ausgabe` packages, rule packages and
theme kits on itch.io, DriveThruRPG or Patreon; Chronicle guarantees the format, the validator and
the round-trip, and links out. **Chronicle is the file format, not the shop.**

**17 · Streaming & actual-play production — REFUSE.** No overlays, no spectator mode, no stream-deck
integration, no broadcast layer. OBS solved this; Alchemy's production-value bet and TaleSpire's
diorama bet are both bets *against* our accessibility-first, DOM-authoritative architecture (RB-11
struck game-engine paths for exactly this reason). **What the user does instead:** window-captures
the Cinematic recipe like everyone else, and shares `die offene Tür` — the public unauthenticated
permalink (CHAMPION §10.11) — which is a better artefact than a stream overlay anyway because it
persists.

**6c · AI-generated art — REFUSE, on the record, in writing, before anyone asks.** The **Inkarnate
incident of September–October 2025** is the whole argument: a price rise plus an AI-art position
produced a boycott, and only a *total ban with vetting* restored goodwill. The ENnies banned
AI-assisted submissions. Foundry's founder called it a betrayal. Chronicle ships **no generated
art**, ever, as prepared content. **What the user does instead:** brings their own art, or uses the
CC0/CC-BY asset ecosystem RB-04 mapped (Kenney et al.), or commissions.

**2b/18b · A plugin runtime that executes third-party code — REFUSE, and it costs us dearly.**
Foundry's 5,338 modules are the deepest moat in the category and we are **structurally forbidden from
copying it** by our own invariant (rule packages are declarative and versioned, *never* arbitrary
code execution — the invariant Athena guards). This is not a preference; it is a permanent ceiling on
our extensibility, and the map is dishonest if it does not say so. **The compensation is real but
smaller:** we get immunity to the failure mode that broke **70 % of Foundry's ecosystem one month
after V14**, and to the Kobold-Fight-Club death. Our extensibility surface is **declarative packages
plus a documented read API plus lossless export** — three things, all safe, none of which will ever
produce Midi-QOL. **Say this to system authors as a feature ("your package will still work in 2031"),
because to module authors it is a limitation.**

**Refused by omission, named so it stays refused:** mobile-native apps (browser + Electron only, per
RB-11); a social network / feed / follower graph; achievements or gamification of the GM; an official
Discord bot (a bot that mints canon breaks `die Fokuswache` and the human-keypress invariant at
once); and **push notifications in slice 1** — already refused in CHAMPION §11 for a reason this map
strengthens: a notification is how a product with no seventh-day value *fakes* one.

---

## 4. The order of absorption

The sequence is not "most valuable first." It is **substrates before surfaces** — because every one
of Chronicle's differentiating claims is a *property of the substrate*, and a surface built on a
missing substrate is a demo that cannot be hardened.

**Stage 0 — Determinism of the roll.** *(Nachrechnen's preconditions: integer-only arithmetic,
pinned RNG, locale-free formatting, cross-platform byte equality.)*
**Unlocks:** everything that calls a roll "citable." Without it, provenance is decoration and the
2031 claim is false. **Why first:** it is a constraint on the dice engine, and constraints are
retrofitted at ten times the cost. CHAMPION already puts it on the critical path (+3 days, gate
*Nachgerechnet*); this map's contribution is to say it is **stage 0, not a line item**.

**Stage 1 — The projection (`Sicht`).** Server-side, per-character.
**Unlocks:** fog, `haelt_etikett`, `erfahrungsgrad`, die Gegenüberstellung, der Brief, `tuer_zustand`,
der Umbruch, the masked handout, **and every refusal in §3.3 that depends on "we already know who
knows what"** — including the relationship view (§3.3/11b). **Why second:** it is the single
mechanism that four separate product claims share. It has been **grafted, unbuilt and unmeasured for
four consecutive rounds** (CHAMPION §2). Spike **S-P1** is two days. There is no honest reason it has
not run, and this map is one more voice saying so.

**Stage 2 — The addressable atom and the closed set of mint handlers.** The passage as an object
below the page; the five `praegung.*` gestures; `der Augenblick`.
**Unlocks:** the flex (§3.1), the footnote-as-roll, provenance chips, `die Saatbilanz`, and — per §2
— **the one thing no bridge can ever carry across a seam.** **Why third:** it needs a roll worth
citing (0) and a projection to be cited *to* (1).

**Stage 3 — Sheets as schema over declarative rule packages.**
**Unlocks:** the clause that makes a roll a *citation* rather than a number; `die Wissensprobe`;
system-agnosticism as an actual property rather than a slogan; and the entire creator channel.
**Why fourth:** intake tension 2 is exactly right — *building the builder before the rules engine
exists is building a facade*. But note the corollary the intake does not state: **the engine also
needs a filled package to be believable**, which is §6's problem.

**Stage 4 — Asynchronous play (die Woche).** Vollmacht, Brief, Umbruch, Wiederkehr, der ausstehende
Wurf.
**Unlocks:** the only differentiator on this map that **compounds weekly** rather than front-loading
at onboarding — which is the correct shape for a one-time-purchase product that needs ongoing reasons
to stay switched (CHAMPION §16). **Why here and not later:** it depends on 0–3 and on nothing else —
notably **not** on the canvas. It is the highest-value work available before any pixel is drawn.

**Stage 5 — Import and export.** Fandom/wiki import (RB-12); UVTT round-trip; rival-shaped export.
**Unlocks:** the switching cost, per §2 — and it must ship at launch per RB-11, which makes it the
one stage whose *position* is fixed by strategy rather than by dependency. **Why not earlier:** you
cannot export what does not exist; stages 0–3 define the shape being exported. **Why not later:**
because a product nobody can move into is a product nobody moves into.

**Stage 6 — The canvas.** Pixi, tile pyramid, KTX2, GPU fog.
**Unlocks:** the tactical half's *drawing*, and nothing above it. **Why this late is defensible:**
every claim in stages 0–5 is true without it, and Owlbear demonstrates how little a table needs to be
loved (§3.1/2). **Why this late is dangerous:** no artefact in five rounds has shown that an outline
table is pleasant for four hours (CHAMPION §9.6), and §1.2/RB-05 show the market's entry expectation
is a map. **This map does not rule on K5** — it observes that the *sequence* argument for deferring
the canvas is sound, and the *market-expectation* argument against it is also sound, and only Kaya
can price the gap.

**Stage 7 — The visual rule-builder as a shipped product surface.**
**Unlocks:** RB-11's go-to-market. **Why after 3 and 6:** the builder is a GUI over stage 3's
structures; and a builder whose output cannot be *seen at a table* has nothing to preview. **Order
within it, per intake tension 2:** engine → schema forms → layout editor → formula/node editor with
live trace (`die Testtafel`).

**Stage 8 — WFC map generation (the Forge).**
**Unlocks:** K5's flagship and the Steam-shaped half RB-11 identified. **Why last:** it needs a
renderer (6) and a tile/asset pipeline (RB-04), and Dungeon Alchemist proves this is a *product* in
its own right — which is an argument for building it well and late, not badly and early.

**What can wait years, explicitly:** stages 7 and 8; the Ausgabe as a publishable package; anything in
§3.2 beyond UVTT; and every single item in §3.3, which can wait forever.

---

## 5. Where the fusion actually creates something new

The test applied: **would this feature still work if the two halves were separate products connected
by the best bridge anyone could write?** If yes, it is co-location, however nice. If no — if the
bridge *cannot* carry it — it is fusion. §2 supplies the empirical standard for what a bridge can
carry: **a number, a card, a token, an HTML string.** Never an object with an address, a permission
or a history.

### Genuine fusion — four, and only four

**5.1 · The roll as a citable, durable, addressable object inside the encyclopedia.**
A footnote that opens into a d20 derivation; `der Augenblick` opening the map at the exact second the
roll resolved. **Why a bridge cannot do it:** Beyond20 has been moving rolls across this seam for
500,000 people since 2019 and has never once created a *thing you can link to next year*, because
Roll20's chat log and Foundry's HTML journal have nowhere to put an addressable object. Fusion is not
that the roll appears in the wiki; it is that **the roll has an address in the wiki's own namespace.**

**5.2 · Fog of war and article permission are the same predicate, evaluated once.**
`Eine einzige Freigabe` — the map opens because knowledge opened, one control, not two. **Why a
bridge cannot do it:** World Anvil's article permissions and Foundry's fog are two access-control
systems in two databases owned by two companies. The best possible bridge could *copy* one to the
other and would then own a synchronisation bug forever. This is the deepest fusion on the list and,
not coincidentally, the one that has gone unbuilt for four rounds (`Sicht`, stage 1).

**5.3 · The red link as a door — a reading affordance that is a play action.**
A wiki's most ordinary element (an unwritten link) becomes an authorised, capped, expiring invitation
to roll. **Why a bridge cannot do it:** the affordance lives in the reading surface and its
precondition lives in the rules engine and its result lands in the canon. Three subsystems, one
keypress. A bridge can link *to* a tool; it cannot make a link *be* a tool.

**5.4 · Knowledge state modifies the roll — `erfahrungsgrad`, `Erfahren schlägt Gehört`, die
Postlaufzeit.**
The same clause prints `+2` for the character who was there and `−2 · nur gehört` for the one who
received a letter about it three in-fiction days later. **Why a bridge cannot do it:** the *dice
math* reads the *wiki's* per-character knowledge projection at roll time. No two-product architecture
has ever attempted this, because the roll would have to make a network call to a competitor's
permission system to know its own modifier.

### Merely co-located — say so, and stop selling it

**Notes beside the map.** Foundry has journals. Roll20 has handouts. Alchemy has both. **This is
1990s-grade integration and Chronicle must never present it as the fusion.**

**A character sheet beside the wiki.** Co-located, and D&D Beyond + Beyond20 already delivers it well
enough that half a million people are content. Our sheet is differentiated by *schema and
authoring* (§3.1/3), not by adjacency.

**Maps with pins that open lore articles.** **The most commoditised "fusion" in the entire
landscape.** World Anvil ships it. LegendKeeper ships it and reviewers say it does it better
("infinite interactive maps, pins, and layers for linking lore directly to geography"). Kanka ships
it. **Chronicle must not claim map-pins-into-lore as a differentiator at any point, in any deck.**
The fused version is 5.2 — the pin's *visibility* being the same object as the reader's knowledge —
and if we cannot show that, we have shipped the commodity.

**Timelines beside articles.** World Anvil, Campfire, LegendKeeper, Aeon Timeline. Co-location.
Chronicle's *in-fiction date on a provenance chip* (§3.3/10b) is a different thing and should be
described as provenance, never as "we have timelines too."

**Audio triggered by scene change.** Co-location wearing integration's coat. Refused (§3.3/8a), and
the refusal is easier once it is named honestly.

**Handouts and images.** Co-location — **except** the masked-handout service, where the mask is a
projection of stage 1 and therefore genuinely fused. Precision matters: the fused part is the mask,
not the handout.

**The strict conclusion:** the fusion is worth **four** things. Four is enough — the crew's own
verdicts have punished "two features in one window" for five rounds, and every one of the four above
survives that test because a bridge with unlimited engineering behind it still could not build them.
But it means the marketing surface is narrower than the product, and any pitch listing eight fused
features is listing four real ones and four commodities.

---

## 6. What the map says back to the ambition

*"Eine Platform um die eine Platform zu schreiben die jede andere knechtet."* Taken as binding, the
map's answer is: **the ring is not made of features. It is made of one object.**

Every function on this map is either (a) already owned by someone with a decade of content or a
two-sided marketplace, or (b) unowned because it is *unownable by a separate product*. The eighteen
functions sort almost perfectly along that line. Group (a) is §3.3 — refuse it, integrate with it,
export to it, and stop. Group (b) is exactly §5's four items, and they share **one** mechanism: a
**server-side, per-character knowledge projection that is simultaneously a permission, a fog volume,
a dice modifier and a citation namespace.**

That is what "one platform to rule them all" means mechanically in this market. Not more features
than World Anvil, which is a losing race against a decade of them; not more automation than Foundry,
which is a losing race against 5,338 modules we are forbidden to imitate. **One object that no
two-company architecture can construct, sitting under every surface.** Sigil had Hasbro's money and
did not have it. Roll20 bought four companies and does not have it — its own users still bridge into
it from outside. World Anvil has 1.5 million claimed users and has publicly declined to try.

**Which makes the strategic risk precise, and it is not "too ambitious."** It is that stage 1 —
`Sicht`, the object the whole ring is made of — **has been carried in the design for four rounds and
has never been built or measured.** Two days. Everything in this document that is worth anything
rests on a spike that has not run.

**And two more honest gaps this map cannot close, recorded so they are not lost:**

**The empty-container problem.** RB-11 made the visual rule-builder the go-to-market, and §3.3/4a
refuses to publish rules content — correctly, on legal and capacity grounds. Both rulings are right
and together they create a hole: **a rule-builder ships an IDE, and an IDE with no programs is not a
product.** Foundry's 475 systems took ten years and hundreds of volunteers. Chronicle needs system
authors to arrive *before* there is a reason for them to arrive, and every one of them faces a
data-entry problem (monsters, spells, items, errata) that is not a software problem. **Nothing in
five rounds has costed the CC-BY SRD reference package** — the one payload we are legally free to
ship and which every demo, every gate fixture and every first-hour experience requires. It is
probably not large. It has simply never been counted.

**And the demo needs a world, not just a system.** A wiki-fusion product cannot be demonstrated
empty (CHAMPION §15.9 concedes session one is empty). RB-12's Fandom import is therefore doing
double duty as *the migration weapon* and *the content bootstrap*, and it should be resourced as
both.

---

## 7. Sources

**Read directly (200 OK):** legendkeeper.com/pricing · foundryvtt.com/packages/world-anvil

**Not readable (403, Cloudflare) — everything attributed to it is second-hand and marked:**
worldanvil.com

**Internal corpus:** RB-01 (all six), RB-02, RB-04, RB-05, RB-07, RB-08, RB-11 ·
`design/iterations/CHAMPION.md` · `design/00-intake.md`

**Search-surfaced, by claim:**

- World Anvil tiers, features, user claim — worldanvil.com/faq, /pricing, /learn/rpg/*,
  WorldAnvilCodex; blog.worldanvil.com; kindlepreneur.com; rigorousthemes.com (Jan 2025 pricing)
- World Anvil VTT stance — worldanvil.com community suggestion board ("Add Virtual Tabletop for D20
  Play"; "FoundryVTT integration"); worldanvil.com/learn/rpg/foundry-integration; app.roll20.net
  forum thread 9118388
- World Anvil billing complaints, Trustpilot ~3.1/5 — trustpilot.com/review/worldanvil.com;
  smartcustomer.com
- LegendKeeper — legendkeeper.com/pricing (direct); legendkeeper.com/world-anvil-alternative;
  legendkeeper.com "The best DM tools of 2025"
- Kanka — kanka.io, kanka.io/pricing, blog.kanka.io (2022 free-tier post), github.com/owlchester/kanka
- Campfire — campfirewriting.com/pricing; kindlepreneur.com; bestselfpublishingtools.com
- Obsidian TTRPG — publish.obsidian.md/hub "Plugins for TTRPG"; community.obsidian.md/plugins/initiative-tracker;
  plugins.javalent.com/statblocks; github.com/Obsidian-TTRPG-Community
- Beyond20 — chromewebstore.google.com (500,000 users); addons.mozilla.org (35,378);
  chrome-stats.com; beyond20.here-for-more.info
- AboveVTT — chrome-stats.com/d/abovevtt; enworld.org thread 679937
- Sigil shutdown — dndbeyond.com/posts/2086 ("Closing the Chapter on Sigil");
  dndbeyond-support.wizards.com "Sigil Sunset FAQ"; gamesradar.com; geeknative.com; techraptor.net;
  pcgamer.com (90 % layoffs)
- Roll20 consolidation — blog.roll20.net "Roll20 has acquired Demiplane" (June 2024);
  demiplane.com/blog/roll20-acquires-demiplane; venturebeat.com + forbes.com + icv2.com on the
  OneBookShelf joint venture (July 2022); en.wikipedia.org/wiki/Roll20
- 5etools DMCA — github.com/github/dmca/blob/master/2024/08/2024-08-07-wizards-of-the-coast.md;
  tildes.net
- SRD / CC-BY / ORC — dndbeyond.com/srd; dndbeyond.com/posts/1439 (OGL 1.0a & Creative Commons);
  paizo.com/orclicense; a5esrd.com/how-to-use-creative-commons
- Kobold Fight Club — dungeonsolvers.com; koboldplus.club; forums.giantitp.com
- Inkarnate incident — geeknative.com/206705; blizzardwatch.com (9 Oct 2025); gamerant.com;
  ttrpginsider.news
- Foundry AI policy & Atropos quote — foundryvtt.com/article/ai-policy/; pcgamer.com
- AI market/backlash context — GDC 2026 survey via char-gen.com and scriptoriumgm.com round-ups;
  ENnies 2025–26 AI ban, same sources *(secondary aggregation — the GDC figure should be verified
  against GDC's own report before it is quoted externally)*
- Map tools — inkarnate.com pricing via loreteller.com and arcaneeye.com; Wonderdraft/Dungeondraft
  ~$30 via arcaneeye.com and itch.io
- Audio — syrinscape.com/subscriptions, /web-player, /store (15 free vs 1,746 SoundSets);
  tabletopaudio.com via michaelghelfistudios.com round-up
- StartPlaying — pitchbook.com, cbinsights.com ($6.65 M total, $6.5 M seed May 2022);
  startplaying.games/blog (90/10 split, >1,000 GMs, >100,000 games); ttrpginsider.news
- Quest Portal — gamesbeat.com and arcticstartup.com ($7.6 M; 10,000 beta users; 140,000 sessions);
  questportal.com/questportal-pro ($8/mo AI tier); questportal.com (team of 13, Reykjavík)
- Owlbear Rodeo — blog.owlbear.rodeo "State of the Rodeo"; blacklanternforge.com; arcaneeye.com
- Voice/video — help.roll20.net "Integrated Voice and Video Troubleshooting"; app.roll20.net forum
  threads 2420959, 6042433, 8307709, 12168928; enworld.org thread 678533; dndbeyond.com forum 193888
- Pixels / GoDice — kickstarter.com/projects/pixels-dice ($3.5 M, ~25 k backers); amazon.com listings;
  gizmodo.com; github.com/blalasaadri/pixels-demiplane-nexus-integration
- Play-by-post — disboard.org `play-by-post` tag; rpgdirectory.jcink.net; newschoolrevolution.com
- Aeon Timeline — aeontimeline.com/pricing, /licensing-model, /faq; sourceforge.net review
- DriveThruRPG scale — venturebeat.com, forbes.com, zoominfo.com *(all vendor-derived)*

**"No reliable figure found"** was recorded for: Avrae's installed-server count; total AboveVTT
users; World Anvil's independently verified user base; Kanka's user base; Obsidian TTRPG plugin
install counts; DriveThruRPG revenue; Syrinscape subscriber count; play-by-post population; any
rigorous survey of GM tool-stack size; Foundry's World Anvil module install count; Shard Tabletop's
scale.
