# RB-20a — Die Kartenwerkzeuge

**The standalone map-authoring market, torn down.** Compiled 2026-07-27. Target: the stakeholder's own
sentence, treated as the question and not as a mood —

> *„ja, integriertes Inkarnate oder etwas Besseres wäre natürlich sexy und würde perfekt reinpassen.
> (ist aber auch gottlos schwierig vernünftig zu implementieren)"*

He is right that it is hard. This brief establishes **which part is hard**, **what that part costs**,
and **whether the hard part is the part that matters.** It ends with a sequence and a number, and it
tries to break Apollon's thesis before endorsing the half of it that survives.

**Reads as binding and does not re-open:** [`RB-11`](RB-11-steam-vs-browser-verdict.md) — PixiJS pinned,
DOM-authoritative, canvas behind a `MapRenderer` boundary, browser + Electron; one-time GM licence,
players never pay; discovery through creators; **UVTT + Foundry/Roll20/FG export at launch**; the Forge
as the separately-shippable, Steam-shaped half. Does not duplicate
[`RB-02`](RB-02-rendering-tech.md) (renderer, pyramids, KTX2), [`RB-04`](RB-04-asset-licensing.md)
(the redistribution trap), [`RB-05`](RB-05-competitor-maps.md) (in-VTT map features, WFC),
[`RB-15`](RB-15-werkzeuglandschaft.md) (absorb/integrate/refuse), [`RB-17`](RB-17-substrat.md)
(the substrate thesis), [`RB-18`](RB-18-widerspruch.md) (the honest arithmetic for one builder).

**It does, however, put a live ruling under pressure.** RB-15 §3.3/**7c** refuses a hand-drawing map
editor outright. Apollon's thesis proposes something adjacent to it. §6 and §7 below rule on that
collision rather than pretending it is not there.

---

## 0. Method, and what every number below is worth

Three rules, no exceptions.

1. **Every number is attributed**, with a live URL, retrieved 2026-07-27.
2. **Vendor self-reporting is labelled `[vendor]`.** Estimator-grade third-party data is labelled
   `[estimator]`. Figures this brief computed are labelled `[computed]` with the inputs shown.
3. **Where a figure could not be established the text says "no reliable figure found."** That phrase
   appears eleven times and every one is a real gap, re-listed in §8.

`inkarnate.com` blocks automated fetch; its pricing, update log and marketplace terms were read through
the `r.jina.ai` text proxy and are therefore **vendor self-reporting read verbatim** — labelled
`[vendor, via proxy]`. `cartographyassets.com`, `pricetimeline.com`, `games-stats.com` and
`profantasy.com/products/campaign-cartographer-3` returned 403/503 and are not relied on.

**One correction to our own corpus, up front.** RB-15 §1.7 prices Inkarnate at *"$5/mo or $25/yr for
Pro."* **That is stale.** The live page today reads **Creator $7.99 USD/month** and **Studio $14.99
USD/month**, and the tier that carries commercial use is Studio, not "Pro" `[vendor, via proxy]`. Every
downstream sentence built on "$5/mo" should be re-read.

---

## 1. The tools, torn down

### 1.1 The category splits in two, and the split decides everything

Nothing else in this brief matters as much as this line:

| | **World-map tools** | **Battlemap tools** |
|---|---|---|
| Products | Inkarnate, Wonderdraft, Azgaar, Watabou, Campaign Cartographer, Other World Mapper | Dungeondraft, Dungeon Alchemist, DungeonFog, Arkenforge |
| Output | **a picture** (PNG/JPG/SVG) | **a picture plus wall, portal and light geometry** |
| Exports UVTT | **none of them** | all four |
| Money shape | subscription (1) or one-time $20–40 (4) or free (2) | one-time $20–45, one of them via a €2.46 M crowdfund |
| Whose problem it solves | the worldbuilder's | the VTT's |

Arkenforge's own interchange page states it plainly: *"At the time of publishing there are 4 map
builders that can create UVTT files"* — Dungeondraft, DungeonFog, Arkenforge, Dungeon Alchemist
(https://arkenforge.com/universal-vtt-files/). **Inkarnate and Wonderdraft — the two tools whose
signature is all over the stakeholder's own map — export no wall data at all, and never have.**

That split runs directly through Kaya's question. "Integriertes Inkarnate" means the *left* column.
The left column is the column that does not talk to a virtual tabletop.

### 1.2 Inkarnate

- **What it makes:** painted/stamped world, region, city, interior and battlemap art, in the browser.
  Output is a flat raster.
- **Tech:** browser web app. Firefox is **not an officially supported browser** — Mozilla carries a
  webcompat bug for exactly this (https://bugzilla.mozilla.org/show_bug.cgi?id=1934504), and users were
  still discovering it in January 2026 via the feedback board's *"Restore Firefox support"* request.
  **A Windows desktop app shipped on 2026-03-06, restricted to Creator and Studio plans, with a Mac
  version in development** — the vendor's stated reasons are performance and *"stability issues related
  to recent Chrome updates."* The internal rendering stack is **not publicly documented — no reliable
  figure found.**
- **Pricing** `[vendor, via proxy]`, https://inkarnate.com/ :
  | Tier | Price | Assets | Export | Editor res | Maps | Custom assets | Use |
  |---|---|---|---|---|---|---|---|
  | Hobby | free | "1K+ HD Art Assets" | 2K | 2K | 3 | — | personal |
  | Creator | **$7.99 USD /month** | "30K+ HD Art Assets" | "Export at 8K" | 4K | 100 | 100 | personal |
  | Studio | **$14.99 USD /month** | "30K+ HD Art Assets" | "Export at 16K (Beta)" | 4K | unlimited | 10,000 | **Commercial Use** |
- **Library:** *"30K+ HD Art Assets"*, with *"23,400"* stated elsewhere on the same page and *"8K
  Available Assets"* in its own statistics block — **three mutually inconsistent numbers on one vendor
  page**, recorded as such and not averaged. In-house art plus, since Inkarnate 2.0, an **invite-only
  Marketplace**.
- **Exports:** PNG and JPG. Its **"VTT (Grid) Export"** only lets you set the grid size in pixels so the
  image lands on a VTT grid — it emits no `.uvtt` file, no walls, no lights
  (https://x.com/inkarnaterpg/status/1767471612205421016; corroborated by its own feature board, below).
- **Scale:** **"16M+ Maps Created"** and **"236K+ Cloneable Maps"** `[vendor, via proxy]`.
  **~1.2 million visits/month, global rank #36,439, −2.48 % MoM, June 2026** `[estimator, Similarweb]`
  (https://www.similarweb.com/website/inkarnate.com/). **23 employees, founded 2016, founders Marc
  Hutcheson, Ingmar Gagen, Glenn Rane; the company began with an unsuccessful Kickstarter**
  `[estimator, Crustdata/Stargazer's World]`. **Revenue: no reliable figure found. Subscriber count: no
  reliable figure found.**

### 1.3 Wonderdraft

- **What it makes:** world and region maps, stamp-and-brush, desktop.
- **Tech:** built by **Megasploot**, the solo developer who also wrote Dungeondraft and **created the
  Universal VTT format** (RB-17 §3.2). Desktop, **64-bit Windows 10, Linux, macOS**; Surface Pro 4,
  Wacom and pen support (https://www.wonderdraft.net/).
- **Pricing:** **one-time ~$29.99**, DRM-free, no subscription `[estimator, multiple secondary sources;
  the vendor store page was not readable this session]`.
- **The measured detail that matters:** Wonderdraft's own feature list reads *"Map dimensions anywhere
  from 512 pixels to 8192 pixels."* **8192 is its ceiling.** Inkarnate Creator's ceiling is *"Export at
  8K"* = 8192. **The stakeholder's Eron map is 8192 × 8192.** It is a maximum-resolution export from
  one of exactly these two products.
- **Exports:** image only. **No UVTT.** *"DRM-free software and royalty-free user-made content."*
- **Library:** default themes plus separately sold art packs (Pirates Pack, Fantasy Buildings).
  **Asset count: no reliable figure found.**
- **Scale:** **no reliable figure found.** No Steam listing, no public sales data.

### 1.4 Dungeondraft

- **What it makes:** battlemaps with walls, portals and lights. Desktop, **Windows 10 64-bit or
  Ubuntu**, minimum Intel Core i3 2.6 GHz / HD Graphics 6000 / 4 GB RAM; **ARM64 unsupported**
  (https://dungeondraft.net/).
- **Pricing:** **one-time ~$19.99–20**, perpetual licence `[estimator, secondary sources]`.
- **Exports:** **the origin of `.dd2vtt` / Universal VTT** plus a printer-friendly filter. This is the
  single most consequential export decision in the category's history.
- **Library:** a default set, plus **CartographyAssets** — *"the largest asset library for mapmakers"* —
  plus Forgotten Adventures' paid Dungeondraft Integration. It ships a **public Modding API**
  (RB-17 §3.2). Total pack count: **no reliable figure found** (the category page 403s).
- **Scale:** **no reliable figure found.**

### 1.5 Dungeon Alchemist — the best-evidenced money in the market

- **What it makes:** 3D-rendered interiors and exteriors from drawn room outlines; procedural fill of
  walls, floors, objects and lighting, then a top-down export.
- **Tech:** desktop (Unity-class native; the engine is not stated on the store page). Windows 7+ 64-bit,
  macOS, SteamOS/Linux; 8 GB RAM, 8 GB storage, GeForce GTS 450-era GPU minimum.
- **Pricing and scale, exact:**
  - Kickstarter, 9 Feb – 11 Mar 2021: **€2,462,441 pledged by 57,199 backers against a €45,000 goal;
    average pledge €43** (https://www.kicktraq.com/projects/1024146278/dungeon-alchemisttm/). *(Our
    corpus carries 57,209; Kicktraq reads 57,199. A ten-backer discrepancy; the order of magnitude is
    not in doubt.)*
  - Steam: **€37.99 / $44.99**, **Early Access since 2022-03-31 — over four years and counting**,
    **93 % positive of 1,891 English reviews** on the store page; **3,878 reviews total, 3,675 positive
    / 203 negative** and an **all-time peak of 434 concurrent players (2025-07-10)**, ~144 average in
    June 2026 `[estimator, Steambase]`. One third-party tracker estimates **~134,390 units**
    `[estimator, games-stats; page 403s, figure from search index — treat as order of magnitude]`.
- **Exports:** *"Foundry, Roll20 and FantasyGrounds are currently supported"* plus printable images and
  UVTT (RB-05; https://www.dungeonalchemist.com/faqs).
- **Library:** **"6000+ objects to place"**, and the store page states flatly: *"Dungeon Alchemist does
  not use any generative AI/LLM's for its room generation"* — and, per the FAQ, only content generated
  by *"our own, paid artists."*

### 1.6 Campaign Cartographer 3+ (ProFantasy)

- **What it makes:** everything — overland, city, dungeon, starship — as **CAD vector drawings**.
- **Tech:** **Windows only. The CAD engine is based on FastCAD**; the product line dates to **1993**
  (https://en.wikipedia.org/wiki/Campaign_Cartographer). It is the oldest living product in this brief
  by two decades.
- **Pricing:** base **~$40**, plus **9 add-ons** (6 drawing add-ons, 3 symbol sets), plus the
  **Cartographer's Annual — £27.95 GBP for 12 monthly mini add-ons**, with back volumes visible to at
  least Vol 6 (2012), i.e. **14+ consecutive years of a content subscription**
  (https://www.profantasy.com/products/sub.asp).
- **Library:** fragmented across the add-on matrix. **Symbol Set 3 alone: *"over 2000 lovingly crafted
  modern overland and floorplan symbols"*** (https://www.profantasy.com/products/ss3.asp). A total
  across all products: **no reliable figure found.**
- **Exports:** own vector formats plus image export. **A verified export list could not be established
  this session** — the product page returned 503.
- **Scale:** **no reliable figure found.**
- **Why it is in this brief:** it is the only product in the category running the **razor-and-blades**
  model — sell the tool once, sell content forever — and it has survived 33 years on it. §2 rules on
  whether that is available to us. It is not.

### 1.7 Azgaar's Fantasy Map Generator — the most important entry in this document

- **What it makes:** a procedurally generated world *as data*: heightmap, coastlines, rivers, routes,
  and named **burgs, states, provinces, cultures, religions and markers**, all editable, all attributed.
- **Tech:** **browser, JavaScript migrating to TypeScript, SVG/WebGL rendering, Vite/Vitest/Playwright
  toolchain.** **5.8k GitHub stars, 958 forks.** Current deployed version **1.138.1**
  (https://github.com/Azgaar/Fantasy-Map-Generator).
- **Pricing:** **free.** *"The created maps can be used for free, even for commercial purposes."*
- **Licence — and this is the finding: MIT.** *"Copyright 2017-2024 Max Haniyeu (Azgaar)"*, with the
  repo's own gloss: *"You can produce, without restrictions, any derivative works from the original
  software and even reap commercial benefits from the sale of the secondary product."*
  (https://raw.githubusercontent.com/Azgaar/Fantasy-Map-Generator/master/LICENSE)
- **Exports — the richest *data* export in the entire category:** `.map`, **JSON** (*"can be used as an
  API replacement"*), **GeoJSON** carrying per-cell population, height, **states, provinces, culture**
  for use in QGIS, **CSV** for burgs and for markers, plus SVG and PNG
  (https://github.com/Azgaar/Fantasy-Map-Generator/wiki/GIS-data-export).
- **Library:** **zero raster stamps.** It is vector and procedural end to end. That is why it is free.

### 1.8 Watabou (Oleg Dolya) — Procgen Arcana

- **What it makes:** instant procedural one-page dungeons, medieval cities, villages, caves, in
  stylised line art.
- **Tech:** **Haxe + OpenFL**, browser.
- **Pricing:** free on the web; pay-what-you-want on itch.
- **Exports:** **PNG, SVG and JSON** — the JSON feeds a separate City Viewer that renders the city in 3D
  (https://watabou.itch.io/medieval-fantasy-city-generator).
- **Library:** zero. Procedural.
- **Scale: no reliable figure found**, though its generators are the most-linked map tools in the hobby.
- **Why it matters:** *instant* delights users even at low fidelity, and its JSON is proof that a
  generated settlement is naturally an **object graph**, not a picture. Watabou has published no VTT
  wall export in eight years despite recurring requests (RB-05).

### 1.9 Other World Mapper — the control experiment

- Vector-raster blend, layer-based, one-time purchase, DRM-free, Windows/Mac/Linux
  (https://www.otherworldmapper.com/). **Price, current version, last update, symbol count and export
  list: no reliable figure found** — the site carries no dates, no changelog and no news section.
- **Kickstarter, 7 Oct – 6 Nov 2014: $26,823 from 724 backers against an $8,750 goal (307 %)**
  (https://www.kickstarter.com/projects/2138108959/other-world-mapper-map-design-software).
- **The comparison is the point.** Same category, same crowdfunding platform, seven years apart:
  **$26,823 / 724 backers** versus **€2,462,441 / 57,199 backers** `[computed: a 92× ratio in money,
  79× in backers]`. The demand did not exist in 2014 and did in 2021. **What changed was not the
  category — it was that Dungeon Alchemist generated, and exported into every rival.**

### 1.10 The in-product editors — and what they actually are

Detail lives in RB-05 and is not repeated. The one fact this brief adds:

> **None of the four in-VTT "map editors" is a map *authoring* tool. Every one of them is a
> *placement and annotation* tool over an image the GM supplies from somewhere else.**

- **Foundry** — the richest wall/light *semantics* in the market (6 wall types × 4 perception channels ×
  five modes, directional walls, attenuation, doors with states and permissions), Scene Levels core
  since v14, Scene Regions V2. **Ships no map art. Draws nothing.** You import a picture and wall it by
  hand, segment by segment.
- **Roll20** — vector paths on a Dynamic Lighting layer, Plus-gated. Ships a marketplace. **Draws
  nothing.** Hard ceilings: **any image over 10,000 px in a dimension is force-downscaled**; 50,000
  Advanced-Fog cells; *"slice very large maps into 2–6 pieces."*
- **Owlbear Rodeo** — Scenes are *"an infinite space for you to lay out images, drawings, fog and more"*;
  a map is *"a single image in your library with information about how it should be positioned and
  resized"* (https://docs.owlbear.rodeo/docs/scenes/). **Ships no asset library.** Best renderer in the
  browser cohort (Warp Core, GPU fog, 137 MP on an iPhone) and deliberately no authoring.
- **TaleSpire** — the only one that genuinely *builds*, in 3D, from first-party assets. And its sharing
  mechanism is the single most instructive artefact in this brief: **a "slab" is copied with `Ctrl-C`
  and pasted with `Ctrl-V` as a code string on the clipboard, with a documented "30k clipboard
  limitation"** (https://talestavern.com/talespire-guide-to-sharing-copying-using-slabs-and-boards/).
  A whole building, shared as a placement list, in under 30 kB of text.

**One interop break worth naming, because it is arithmetic:** an **Inkarnate Studio 16K export
(16,384 px)** cannot be uploaded to **Roll20** at all without being force-downscaled to 10,000 px, and
exceeds the **8192 px** to which Foundry itself downscaled its own premium content *"for lower-spec
GPUs"* (RB-05). **The market's most expensive map-tool tier produces a file the market's two largest
tables cannot serve.**

---

## 2. The money, specifically — and which model actually works

### 2.1 The table

| Product | Model | Price today | Best money evidence |
|---|---|---|---|
| **Dungeon Alchemist** | one-time + crowdfund + Steam | €37.99 / $44.99 | **€2,462,441 / 57,199 backers**, goal €45,000; 3,878 Steam reviews; ~134 k units `[estimator]` |
| **Inkarnate** | **subscription** | $7.99 / $14.99 per month | ~1.2 M visits/mo `[estimator]`; 23 employees `[estimator]`; **revenue: no reliable figure found** |
| **Campaign Cartographer 3+** | one-time + 9 add-ons + **annual content sub** | ~$40 + £27.95/yr | 33 years alive; **revenue: no reliable figure found** |
| **Wonderdraft** | one-time | ~$29.99 | **no reliable figure found** |
| **Dungeondraft** | one-time | ~$19.99 | **no reliable figure found** |
| **Other World Mapper** | one-time | **no reliable figure found** | **$26,823 / 724 backers (2014)** |
| **Azgaar's FMG** | free, **MIT** | $0 | 5.8 k stars, 958 forks |
| **Watabou** | free / PWYW | $0 | **no reliable figure found** |

### 2.2 What the table says

**1 · The only large, verifiable sum in this market was raised by a one-time-priced tool that exports
into its rivals.** €2.46 M. Not by a subscription, not by an ecosystem, not by a marketplace. RB-11
already built strategy on this; the teardown confirms it and adds the control: **Other World Mapper,
same category, same platform, one-time price, no generation and no export — $26,823.** The variable is
not the price model. **It is generation plus export.**

**2 · Subscription is the model that got the category's only real company boycotted.** The sequence,
recorded because it is the cleanest pricing lesson available anywhere in our corpus: mid-September 2025
Inkarnate raised annual subscription by **more than 2×** with no announcement in official channels →
outcry → **rollback**; days later an outsourced Inkarnate advert was found to contain AI art; on
2025-09-24 the CEO confirmed intent to permit generative AI on the coming marketplace → boycott calls →
**October 2025, Inkarnate banned AI-generated art from the marketplace outright, with vetting**, to an
*"almost universally positive"* reception
(https://www.geeknative.com/206705/map-maker-inkarnate-reverses-ai-policy-following-community-backlash/,
https://blizzardwatch.com/2025/10/09/tabletop-map-making-website-inkarnate-allows-bans-ai-generated-art-user-driven-win-human-artists/).
A contributing factor named in the coverage: **seven years without a price rise**, which is what makes a
correction feel like a betrayal.

**3 · The razor-and-blades model works and is closed to us.** Campaign Cartographer has run a
**£27.95/yr, twelve-issues-a-year content subscription for 14+ consecutive years** on top of a $40 tool.
That is the only durable recurring revenue in the category and it is **content revenue, not software
revenue.** RB-15 §3.3 refuses publishing rules content; RB-04 establishes that we cannot license and
redistribute art at volume; RB-18 §1.4 records that the art pipeline has never been costed. **We cannot
sell blades. Therefore we cannot run CC3+'s model, and saying so now prevents a plan from forming
around it later.**

**4 · What this says about our own ratified model — one-time GM licence, players never pay.**
It is **the right shape and the wrong price band, and the two facts must be held together.**
- Right shape: every profitable map tool in this market except Inkarnate is one-time. The one
  subscription is the one that had to be rolled back under boycott. Our ratified model is on the
  correct side of the only pricing experiment this community has ever run in public.
- Wrong band, if we ever reason from map tools: the category's one-time prices are **$20–45**, and
  **€37.99 buys a finished, 4-years-in-Early-Access, 6,000-object generator built by a studio.** A
  ~€30 licence that includes a wiki, a VTT, a rules engine and a map editor is not "cheap" to a buyer
  who anchors on Dungeon Alchemist — it is **implausible**, and implausibility converts worse than
  price. RB-11's €30 was derived from Foundry's $50, which is the correct anchor. **Do not re-derive it
  from map tools.**
- And one structural gift, free: **Inkarnate's commercial licence is a monthly subscription
  (Studio, $14.99/mo) and its marketplace assets are non-commercial unless a commercial add-on is
  bought per pack.** A GM who wants to publish a map she made must keep paying. **A one-time licence
  with no commercial tier is a real, sayable differentiator against the category leader** — say it once,
  in the pricing page, and never again (RB-18 §5.6's discipline).

**5 · The marketplace numbers, for the record.** Inkarnate's Marketplace terms: *"INKARNATE will deduct
30 % of the list price of such Product … (the 'Platform Fee')"*, artist keeps 70 % less processing,
tax, chargebacks and refunds; buyers get a **non-commercial** licence by default with commercial rights
as a per-pack add-on; and — decisively for us — **"Customers may not redistribute, extract, or resell
any Products, whether in raw or modified form."** `[vendor, via proxy]`
(https://inkarnate.com/marketplaceTerms). That is RB-04's redistribution trap, restated by the category
leader, about its own store. **No Inkarnate marketplace asset can ever legally live inside a
self-hostable product that serves files to browsers.** RB-04 predicted this class; here it is in the
one store that matters.

---

## 3. What users complain about — the specification for „besser"

Complaints are ranked by evidence weight, not by loudness. Where a vote count exists, it is given,
because a vote count is a specification with a number attached.

### 3.1 Inkarnate — the subscription and the browser

Inkarnate runs a public Canny board. Its **top-voted feature requests** are the cheapest market
research in this document (https://inkarnate.canny.io/feature-requests?sort=top):

| Rank | Request | Votes | Status |
|---|---|---:|---|
| 1 | **"Group 2.0 - Save group as stamp"** | **574** | in progress |
| 2 | **"Downloadable Offline App (Wind / Mac)"** | **435** | registered |
| 3 | "River tool" | 421 | registered |
| 4 | "Merge two maps into one new map" | 384 | registered |
| 5 | "My Maps Nested folder structure / subfolders" | 213 | accepted |

And in the export category (https://inkarnate.canny.io/feature-requests?category=export&sort=top):

| Request | Votes | Status |
|---|---:|---|
| "Export layers with transparency" — *"impossible to create a clean roof-layer for programs such as Foundry"* | 17 | in progress |
| **"Generating UVTT files"** — *"walls and lights could be generated as UVTT files to go along with the map"* | **14** | registered |
| "Export as additional floors / multi-level maps" | 1 | registered |

**Read those two tables together. They are the single most important pair of numbers in this brief.**

> **574 votes want a composition to become a reusable object. 14 votes want a VTT file.**

Inkarnate's 1.2-million-visits-a-month audience is **not** asking to be a virtual tabletop. It is asking
for **stamp composability** — which is precisely TaleSpire's slab, precisely `{asset, x, y, scale,
rotation, layer}` made addressable, and precisely the mechanism Apollon's thesis is built on. The
market's own #1 vote validates the *mechanism* and refutes the *motive*.

**Performance and the browser, from Inkarnate's own bug board** (https://inkarnate.canny.io/bugs):
top bug **"I have no access to any of my maps…" (35 votes)** — loading screens, *"Updating Map"*, backup
errors; **"Dissapearing Stamps In App Version" (14)**; **"Brushes are a, watery, weird, unusable mess on
Linux" (12)**; **"Fantasy World Style Maps Wiped Themselves Blank During Upgrade" (9)**. Users report
**"5+ seconds to pivot or place a stamp"** when editing large groups, Firefox unusable at 3k/4k canvas,
mask-tool cursor lag, and **undo taking 3–5 seconds**.

**The structural complaints, each already answered by a ratified Chronicle decision:**

| Inkarnate complaint | Evidence | Our ratified answer |
|---|---|---|
| Subscription, and a >2× rise attempted | Sept 2025 rollback | **One-time GM licence** (RB-11) |
| Commercial use requires the top tier, monthly | Studio $14.99/mo | one-time, no commercial tier |
| Browser-only; offline app requested for years | **435 votes**, delivered 2026-03-06, **paid tiers only** | **Electron shell is already the self-hosting implementation** (RB-11 §2) |
| Firefox unsupported | Bugzilla 1934504 | one DOM codebase, no vendor lock |
| Data loss on upgrade | 35 + 9 votes | export → import → **diff empty** is an acceptance gate (CHAMPION §12.1 step 12) |
| No layer export → *"impossible to create a clean roof-layer for Foundry"* | 17 votes | **layers are the data model, not a render artefact** |
| No wall/light export | 14 votes | **UVTT in and out at launch** (RB-11, 6 days, CHAMPION §9.2) |

### 3.2 Wonderdraft — the abandonment complaint, and it is measurable

The public issue tracker at https://github.com/Megasploot/Wonderdraft/issues shows, today:

- **39 issues. All open. None closed.**
- Spanning **2023-01-08 → 2026-04-18** ("#39 Add assets doesn't work").
- **"Issue creation is restricted in this repository."**
- **No visible maintainer responses on any listed issue.**

That is not proof of abandonment — a closed-source vendor may support elsewhere — but *three years of
open issues with a zero close rate and a restricted tracker* is the strongest evidence available, and it
is the same developer who set this market's interchange standard. **Dungeondraft's tracker is worse in
absolute terms: 70 open issues, latest 2026-02-25, including *"High RAM usage on Linux, eventually
slowing the entire system down"* (2026-01-07).**

**The lesson for us is not schadenfreude, it is a warning.** RB-17 §3.2 holds Megasploot up as the proof
that a solo developer can set a standard. This brief adds the second half of that story: **the same solo
developer, having set the standard, could not keep two products maintained.** RB-18's runway arithmetic
and this tracker are the same finding seen from two sides.

### 3.3 Dungeondraft — the asset pipeline

Custom assets ship as `.dungeondraft_pack` with a JSON-shaped tag/set vocabulary. The community had to
build the tooling itself: **`Ryex/Dungeondraft-GoPackager`** (GUI + CLI to pack, unpack and edit assets
and tags) and **`EightBitz/Dungeondraft-Tools`** (generates a `default.dungeondraft_tags` file from
folder structure, generates thumbnails). **When two independent third-party toolchains exist to make a
vendor's asset format usable, the format is the complaint.**

Underneath it sits a licensing minefield that RB-04 and RB-05 already flag and this brief could not
resolve: **an official Dungeondraft EULA for its default assets could not be located this session — no
reliable figure found.** RB-05's CC BY-NC claim remains **unverified**, and creators themselves advise
against commercial use *"due to uncertainty about transitively inherited license restrictions"*, auditing
via the asset manifest inside `.dungeondraft_map`. **Chronicle must never depend on this, and per RB-04
never could.**

### 3.4 Dungeon Alchemist — style lock-in, and the ceiling on generation

From Steam's top-rated negative reviews and independent reviews
(https://steamcommunity.com/app/1588530/negativereviews/?browsefilter=toprated,
https://www.metacritic.com/game/dungeon-alchemist/): *"a very limited set of available environments"*;
*"lack of certain themes like sci-fi or cyberpunk"*; **"complete inability to create elevation or
multiple levels within the same map"**; *"details getting lost in translation from 3D to 2D"*;
development *"slow"*; and price resistance at $45–50 for something *"too barebones."*

**Four years in Early Access, a studio, 6,000+ objects, €2.46 M of runway — and it still ships one
visual style and no elevation.** That is the honest calibration for anyone estimating a generator.

### 3.5 Campaign Cartographer

Structurally: **1993, FastCAD, Windows-only, fragmented across 9 add-ons and 14 annual volumes.**
**Independent user complaints were not sourced this session — no reliable figure found.** The commonly
repeated criticism (learning curve) is not cited here because it was not verified.

---

## 4. The asset libraries — the real moat, and the arithmetic that closes it

### 4.1 The counts

| Product | Bundled assets | Provenance | Community market | Licence for us |
|---|---|---|---|---|
| **Inkarnate** | **"30K+ HD Art Assets"** (1K+ free); "23,400" and "8K" also stated on the same page | in-house artists | **Marketplace, invite-only at launch**, 30 % platform fee | **Forbidden.** *"Customers may not redistribute, extract, or resell any Products, whether in raw or modified form."* |
| **Dungeon Alchemist** | **"6000+ objects"** | *"our own, paid artists"*; **"does not use any generative AI/LLM's"** | Steam Workshop | not licensable |
| **Campaign Cartographer** | Symbol Set 3 alone *"over 2000"*; total unknown | in-house, 33 years | Annual, £27.95/yr | not licensable |
| **Dungeondraft** | default set | first-party + third-party | **CartographyAssets**, *"the largest asset library for mapmakers"*, free + paid | **per-pack minefield; no official EULA found** |
| **Wonderdraft** | default themes + paid packs | first-party | itch/Patreon long tail | *"royalty-free user-made content"*; packs vary |
| **TaleSpire** | first-party only + HeroForge minis | in-house | **slab economy** (clipboard strings) | closed |
| **Azgaar / Watabou** | **zero** | procedural vector | — | **MIT / free** |
| **Foundry / Roll20 / Owlbear** | **zero map art** | — | Roll20 marketplace; Foundry premium modules | — |

### 4.2 The number that closes the question

**Inkarnate 2.0 shipped, in one release** `[vendor, via proxy]`, https://inkarnate.com/updates :

> *"over 4,600 new and reworked assets"* — including *"over 2200 asset revisions and brand-new assets"*
> in the Fantasy Battlemaps Core Pack, *"over 500 new assets across all available map styles"* on the
> free plan, and *"over 65 high-impact effect stamps."*

**4,600 assets in one release. 30,000 in the library. 23 employees** `[estimator]`.

That is the moat, and it is not made of software. **Apollon's thesis says exactly this and is correct:
Inkarnate's expense is art production, not engineering.** But the thesis then draws the wrong
conclusion from its own premise. The correct conclusion is not *"therefore the increment is small."*
It is:

> **Therefore the increment is only small if we never intend to compete on stamps — and the moment a
> single screenshot invites the comparison, we lose it 4,600 to nothing.**

### 4.3 Can a solo builder compete at all? — the three-way close

**No, on library. Structurally, and in three independent ways, each already established:**

1. **You cannot buy it.** RB-04's redistribution trap, now confirmed at the category leader's own store
   (§2.2/5) and at Forgotten Adventures (application + meeting) and across the Dungeondraft pack
   ecosystem. A browser VTT is a file server for art; almost every commercial art licence forbids
   exactly that.
2. **You cannot make it.** 4,600 assets per release from 23 people. RB-18 §1.4 records that Chronicle's
   art pipeline is *"not priced at all."* This brief prices its competitor's, and the answer is a
   payroll.
3. **CC0 will not close the gap.** RB-04 risk 11 states it already: *"A CC0 bundled set will not
   out-quantity Roll20's marketplace or match Forgotten Adventures' photoreal-battlemap aesthetic."*

**Yes, on three things that are not library:**

- **Ingestion.** RB-04's Tier U — *"ship a small clean set, and be outstanding at ingesting the art
  users already own."* Every GM in this market already owns art. Kaya owns an 8192² map right now.
- **The format.** RB-17 Rank 2. Megasploot did not out-produce anyone; he published a schema.
- **What a placed asset *is*.** §6.

---

## 5. Export and interoperability

### 5.1 Who exports what

| Tool | Raster | Vector | **UVTT (walls/portals/lights)** | Structured world data |
|---|---|---|---|---|
| Dungeondraft | ✅ | — | ✅ **origin of the format** | modding API |
| DungeonFog | ✅ | — | ✅ | — |
| Arkenforge | ✅ | — | ✅ | — |
| Dungeon Alchemist | ✅ | — | ✅ **+ Foundry, Roll20, Fantasy Grounds directly** | — |
| **Inkarnate** | ✅ PNG/JPG | ❌ | ❌ **"VTT (Grid) Export" is a grid-sized PNG** | ❌ |
| **Wonderdraft** | ✅ | ❌ | ❌ | ❌ |
| **Azgaar's FMG** | ✅ PNG | ✅ SVG | ❌ | ✅✅ **JSON, GeoJSON, CSV — burgs, states, provinces, cultures, religions, markers** |
| Watabou | ✅ PNG | ✅ SVG | ❌ | ✅ JSON |
| Campaign Cartographer | ✅ | ✅ own CAD formats | ❌ | ❌ |
| Other World Mapper | **no verified list found** | | | |

Import on the receiving side remains uneven and largely volunteer-maintained: **Roll20** now officially
accepts all three UVTT extensions (https://help.roll20.net/hc/en-us/articles/41643201127831-Universal-Virtual-Tabletop-UVTT-Support);
**Foundry has no native support and arrives through the community module `dd-import`**
(https://foundryvtt.com/packages/dd-import/); **Fantasy Grounds needs the third-party `uvtt2fgu`**;
**Let's Role caps it at 16 MB, static backgrounds only.**

### 5.2 The finding

**Dungeon Alchemist did not reach the market by being good. It reached the market by being importable.**
And it is not alone: **Megasploot's UVTT is now read officially by Roll20 and unofficially by everyone
else, and it was written by one person to escape his own tool.** RB-17 §3.2 called the standard-setting
seat vacant; this teardown confirms that the seat is still vacant *and* shows who refuses to sit in it.

**Who refuses, and why it is a strategy not an oversight:**
- **Inkarnate refuses.** It has a live, dated feature request for UVTT with **14 votes** and a separate
  request titled *"Expand Inkarnate to be a VTT."* It is a subscription business whose retention depends
  on maps living inside its own account. Layer export — the mechanism a GM would need to take a map
  *out* cleanly — is at 17 votes and has been *"in progress"* rather than shipped.
- **TaleSpire refuses.** A slab is a clipboard string in a proprietary encoding. Beautiful inside,
  worthless outside.
- **Wonderdraft cannot.** It is a world-map tool and world maps have no walls. This is a category fact,
  not a failing — and it is the same fact that will apply to *our* world-map layer.

**The consequence for Chronicle, stated so it cannot be softened:** RB-11 already ratified UVTT +
rival-shaped export at launch, and RB-17 priced it at 13–18 days. This brief adds one line to that
ratification: **the export must include a world-map path, not only a battlemap path, because the tools
that produced the stakeholder's own fixture emit no UVTT and never will.** For world maps the
interchange target is not UVTT — it is **Azgaar's GeoJSON/JSON**, which is MIT, structured, and already
the closest thing the category has to a world-data standard.

---

## 6. The seam nobody occupies — and the verdict on Apollon's thesis

### 6.1 What no map tool does

Sorted, and each line is a negative finding, which is the hardest kind to fake:

1. **Nobody's stamp is an entity.** In every tool in §1, a placed mountain is a sprite with a transform.
   It has no identity, no article, no permission, no history. You cannot ask a map "what is this?" and
   get an object back.
2. **Nobody links authoring to knowledge.** World Anvil and LegendKeeper let you **pin** an article to a
   coordinate on an uploaded raster — RB-15 §5 already ruled this *"the most commoditised 'fusion' in
   the entire landscape"* and forbade us from claiming it. **But the pin is placed by a different
   person, in a different app, after the picture is finished.** The thing that drew the mountain and the
   thing that knows what the mountain is have never been the same program.
3. **Nobody has per-character map knowledge.** Every fog model in the market is per-token vision or
   per-scene exploration. No map tool has ever asked *what does this player know about this place.*
4. **No map object carries a mechanical clause.** A region cannot say "+2 to Survival here" anywhere in
   this market.
5. **Nobody re-skins.** A map's art style is baked at authoring time in every product surveyed. K1's
   "the map re-skins with the theme" has no precedent.
6. **Nobody does WFC commercially in this category.** Searched; found academic papers, Unity tools and
   itch experiments; **no commercial tabletop map product using wave function collapse — no reliable
   figure found, and I believe the absence is real.** RB-15 Stage 8's ruling stands unchallenged.

### 6.2 Where the seam is **not** empty — the counter-evidence, stated at full strength

**Azgaar's Fantasy Map Generator already makes a place rather than a picture, and it is free and MIT.**
Its output is not a raster with pins; it is **burgs, states, provinces, cultures, religions, routes and
markers as attributed vector features**, exportable as GeoJSON, JSON and CSV.

And it has already been bridged into a VTT **by a volunteer**: `Ethck/azgaar-foundry` imports an FMG
map into Foundry and creates **journal entries in compendiums for all map locations**, **map notes with
per-type icons**, marker support linking one-page dungeons and random encounters into journals, and
**per-journal-entry permissions for fine-grained player access** (https://github.com/Ethck/azgaar-foundry).

Read that again with RB-18 §4.4 in mind. **"Every place on the map is an entity with an article and a
permission" exists today, free, at 61 GitHub stars.** Any claim that the seam is empty must survive this
module, and a version of Apollon's thesis that has not heard of it is not yet a thesis.

### 6.3 Why it is nonetheless a seam — the four things the bridge cannot carry

Applying RB-15 §5's test (*would this still work if the halves were separate products joined by the best
bridge anyone could write?*) to `azgaar-foundry`, which **is** that bridge, built well:

| | The bridge | The fusion |
|---|---|---|
| **Direction** | one-shot import. Edit the map, re-import, and the journals you wrote are orphaned | the placement **is** the entry; there is no import |
| **Permission** | Foundry journal permissions — a per-user ACL on an HTML blob | **`Sicht`** — a server-side per-character knowledge projection; RB-15 §5.2's fog-is-permission |
| **Citation** | a journal entry is an HTML string with nowhere to put an address (RB-15 §5.1) | a placement can cite a **passage-id**; a region can carry a **Klausel** |
| **Fidelity** | Azgaar renders SVG vectors; the aesthetic is a schematic, not the painted map a GM actually shows | our raster path is measured: **8192², 1,365 tiles, 9.9 MB, 31.7 s, ~8 MB viewport RAM** |

**So the honest competitive sentence — modelled on RB-18 §4.4, which earned it:**

> **It is not true that nobody has made the map into a place. It is true that the only people who have
> done it did it in one direction, with no permission model worth the name, into a journal that cannot
> hold an address, at 61 stars — and that the tools with 30,000 stamps and 1.2 million visits a month
> have shown, by their own users' votes, that they are not coming.**

### 6.4 The verdict on the thesis, clause by clause

> *"Inkarnate makes a picture. We would make a place."*

**Upheld as a positioning line, refused as an engineering plan.** It is true and it is unowned in the
form that matters (§6.3). It is also *approximately* occupied (§6.2), and the approximation is free.

> *"The expensive part of Inkarnate is not its brush engine — it is thousands of hand-drawn stamps,
> which is an art-production cost, not an engineering one."*

**Upheld, and now quantified: 4,600 assets in one release, 30,000 in the library, 23 employees.**
This is the strongest clause in the thesis and §4 turns it from an assertion into a number.

> *"A stamp scene is a list of `{asset, x, y, scale, rotation, layer}`."*

**Upheld, and independently proven twice by the market:** TaleSpire ships whole buildings as clipboard
strings under a **30 kB** limit; Inkarnate's **#1 feature request, 574 votes**, is to make exactly such
a list into a first-class reusable object. **But the clause proves the wrong thing.** *The list* is
cheap. **The editor over the list is not**, and confusing the two is the single largest error available
here. Inkarnate's own bug board is a catalogue of that editor's difficulty — 5+ seconds to place a
stamp in a large group, undo at 3–5 s, mask-tool lag, brushes broken on Linux — **from the vendor that
has spent ten years and 23 salaries on it.** A selection model, a transform gizmo, marquee hit-testing,
z-ordering, grouping, layer management and a fast undo graph are a graphics-editor project. **Pixi gives
us sprites. It does not give us an editor.**

> *"The vector world layer must be built anyway, because the wiki links to it — so a map editor is an
> authoring UI for a data layer that already has to exist."*

**Upheld, and it is the load-bearing insight of the whole thesis.** Regions, roads and places as
queryable, permissioned entities are required by K8/K9 regardless of whether anyone ever paints
anything. Azgaar's GeoJSON proves the shape is natural; `azgaar-foundry` proves the demand.
**The delta from "a wiki that knows about places" to "a wiki whose places have coordinates" is small.**

> *"Therefore the increment is small and the differentiator is categorical."*

**Split.** The *differentiator* is categorical and **cheap** — entity binding is, by the decomposition in
§7.2, **4 of 43 days.** The *increment* is not small, because the increment as stated silently includes a
graphics editor. **This is the same pattern RB-18 §4.2 found in the tactical half: the fusion-bearing
days are the cheap ones, and the expensive days buy parity with products that already exist.** Here the
ratio is worse than RB-18's: **≈4 fusion days against ≈39 parity days.**

---

## 7. The answer: a sequence and a number

### 7.1 Which part is hard — ranked, with the evidence

| # | Part | Hard? | Evidence |
|---|---|---|---|
| 1 | **The stamp library** | **Impossible for one builder** | 4,600/release, 30 k total, 23 employees; unbuyable per RB-04 and Inkarnate's own store terms |
| 2 | **The brush / terrain-paint engine** | **Hard, and a different discipline** | Wonderdraft's *"automatically beautified coastlines"*; Inkarnate's mask tool and its lag; 24,162 distinct colours measured in a 260×166 downsample of the fixture |
| 3 | **The editing UI over the placement list** | **Hard, and underestimated** | Inkarnate's top bugs are all here, after 10 years |
| 4 | **The placement/scene format** | **Trivial** | TaleSpire ships buildings in <30 kB of clipboard text |
| 5 | **The renderer** | **Already paid** | PixiJS pinned (RB-11); measured pyramid: 1,365 tiles / 9.9 MB / 31.7 s / 616× faster first pixel |
| 6 | **The vector world layer as entities** | **Already required** | K8/K9; Azgaar proves the shape; `azgaar-foundry` proves the demand |
| 7 | **Entity binding + `Sicht` over placements** | **Cheap, and it is the whole differentiator** | it is a foreign key and a projection predicate |

**So: the hard part is the art, and the art is the part that does not matter to us.** The part that
matters — 6 and 7 — is the part we were building anyway. **Kaya's instinct that this is "gottlos
schwierig" is right about the tool he named and wrong about the thing he wants.**

### 7.2 The number

**Der Kartenleger** — a *placement* editor, explicitly **not** a paint program. Estimated in the
lineage's own unit, with RB-18 §1.7's warning attached in full: **that unit has never been calibrated
against a single measured day of renderer work.** This estimate is a hope with columns until S-T1 runs.

| Line | Days | Note |
|---|---:|---|
| Placement format (`asset_ref, x, y, scale, rot, layer, z, entity_id`) + validator + round-trip fixture | 2 | shares the export harness; RB-17 Rank 2 |
| Placement surface over `MapRenderer`: hit-testing, marquee, transform gizmo, snap, z-order, layer panel | **12** | **the real engineering.** Pixi gives sprites, not an editor |
| Undo/redo over the placement graph, on the *same* undo ring as combat | 3 | Inkarnate's undo is 3–5 s; ours is a gate |
| Stamp palette: search, tag facets, favourites, scatter-brush placement | 5 | |
| **Der Stempelsatz** — group → reusable named stamp | 3 | Inkarnate's own #1 request (574 votes); TaleSpire's slab |
| **Entity binding: every placement may carry a passage-id; `Sicht` projects over placements** | **4** | **the differentiator, and the cheapest line in the table** |
| Region/road/place vector layer, delta over what the wiki needs anyway | 3 | |
| Theme re-skin: atlas swap per K1 | 3 | depends on RB-05 improvement #8 |
| Tier-U raster ingest: upload → slice → autotile/stamp detection → provenance manifest | 5 | RB-04 Tier U, the volume answer |
| Placement culling + batching perf gates | 3 | the pyramid path is already measured |
| **Subtotal** | **43** | |
| **+ round 3's 20 % contingency, restored per RB-18 §1.2** | **≈52** | |

> **≈52 developer-days, and it buys zero stamps.**
>
> Set beside RB-18's reconciled **≈260–270 already-priced days** — which already exclude K1, K2 and K5 —
> that is **+20 % on a bill that lands at month 20 of a runway history sizes at 24–33 months.** And set
> beside the moat it is aimed at: **Inkarnate shipped 4,600 assets in one release with 23 employees.**

**Explicitly excluded and refused, and this is what keeps the 52 honest:** no brush/terrain-paint engine,
no coastline beautification, no mask tool, no first-party stamp library. The moment any of those enters,
this estimate is void and RB-15 §3.3/7c's refusal is correct as written.

### 7.3 The sequence

Ordered by evidence, not by appetite. Nothing here shrinks the ambition; it orders it.

1. **Reader before writer — and it is nearly free today.** Ship the map *viewer* with entity-bound
   pins over an **imported** raster, on the measured pyramid. **Cost: the pyramid already exists on
   disk.** This serves Kaya's own 8192² Eron map on day one, requires zero art, and delivers §6.1's
   items 1, 2 and 3 — the seam — **without touching the editor at all.** If per-character map knowledge
   over an imported picture does not delight, no editor will save it.
2. **UVTT in and out** (ratified, 6 days, CHAMPION §9.2). Walls, portals and lights arrive from
   Dungeondraft, Dungeon Alchemist, DungeonFog and Arkenforge for free. **This is the whole battlemap
   authoring problem, solved by reading a file.**
3. **A world-data import path beside it: Azgaar GeoJSON/JSON.** MIT-licensed, structured, and the only
   world-map interchange that carries named entities. RB-17 Rank 4 says *one* high-fidelity import,
   chosen for population; that one is Eron/Fandom (K10). **This is a second, cheap import chosen for
   *shape* rather than population — and it should be argued explicitly against Rank 4's "exactly one"
   rule rather than smuggled past it.**
4. **Then, and only then, `Der Kartenleger`** — ≈52 days, slice 3, over **user-uploaded and CC0 assets**
   (Kenney, DCSS curated export, 0x72, ambientCG per RB-04 tiers 0–1), never a first-party library.
5. **The Forge (WFC) last**, per RB-15 Stage 8, because RB-04 §1 establishes that WFC's real bottleneck
   is an **authored, socket-annotated tile grammar** that ships with no free tileset in existence — and
   because Dungeon Alchemist spent four years and €2.46 M to reach one visual style.
6. **Never:** a brush engine, a stamp library, a marketplace for stamps.

### 7.4 The one sentence to say back to Kaya

> **You already own the picture. It is 8192 × 8192 — the exact ceiling of both Inkarnate and Wonderdraft
> — and it cost you nothing but time in a tool that will never tell you what is on it. Building you a
> better version of that tool costs 4,600 drawings we cannot draw and cannot buy. Making that picture
> into a place costs four days.**

---

## 8. What could not be established

Recorded so no future round launders an absence into a fact.

1. **Inkarnate's revenue, subscriber count, or paid-vs-free ratio.** No reliable figure found.
   Traffic (~1.2 M/mo) is estimator-grade and is not revenue.
2. **Inkarnate's true asset count.** Its own page states **30K+**, **23,400** and **8K** simultaneously.
   Quote it as *"Inkarnate claims between 8,000 and 30,000 assets depending on which part of its own
   page you read"* — the same discipline RB-14 applied to World Anvil's account count.
3. **Inkarnate's rendering technology.** Not publicly documented. No reliable figure found.
4. **Wonderdraft and Dungeondraft unit sales or revenue, at any point.** No reliable figure found. No
   Steam listing, no public store data, no developer interview located.
5. **Whether Wonderdraft is maintained.** The tracker evidence (39 open / 0 closed / restricted /
   2023→2026) is strong but circumstantial. **It is not proof.**
6. **Dungeondraft's official EULA for its default assets.** Not located. RB-05's CC BY-NC claim remains
   unverified for a second brief running. **Do not build any dependency on it.**
7. **CartographyAssets' total pack count and licence taxonomy.** Site 403s to automated fetch.
8. **Campaign Cartographer's total symbol count, verified export list, current price, and any
   independent user complaints.** Product page 503s. Only Symbol Set 3's *"over 2000"* is sourced.
9. **Other World Mapper's current price, version, last update and export formats.** The site carries no
   dates at all. Only the 2014 Kickstarter figures are solid.
10. **Watabou's usage scale.** No reliable figure found.
11. **Dungeon Alchemist's unit sales.** 134,390 is one estimator's figure read from a search index
    behind a 403; the Kickstarter total and the Steam review counts are the only hard numbers.
12. **The 57,199 vs 57,209 backer discrepancy** between Kicktraq and our own corpus is unresolved.

---

## 9. Sources

**Internal:** `design/00-intake.md` (K1, K5, K8, K9, K10) · `design/iterations/CHAMPION.md` §1, §4, §9.2,
§9.6, §12 · `design/research/RB-02`, `RB-04`, `RB-05`, `RB-11`, `RB-15`, `RB-17`, `RB-18` ·
`design/fixtures/eron/media/kachelpyramide/pyramide.json` (1,365 tiles, 9.9 MB, 31.7 s — Apollon's
measurement, 2026-07-27).

**External, retrieved 2026-07-27.** `[vendor, via proxy]` = read through `r.jina.ai` because the origin
blocks automated fetch; treat as vendor self-reporting quoted verbatim.

*Inkarnate*
- https://inkarnate.com/ `[vendor, via proxy]` — tiers, prices, "30K+ HD Art Assets", "16M+ Maps Created", "236K+ Cloneable Maps", export resolutions
- https://inkarnate.com/updates `[vendor, via proxy]` — Inkarnate 2.0, "over 4,600 new and reworked assets", Marketplace invite-only
- https://inkarnate.com/marketplaceTerms `[vendor, via proxy]` — 30 % Platform Fee, non-commercial buyer licence, "may not redistribute, extract, or resell"
- https://inkarnate.canny.io/feature-requests?sort=top — 574 / 435 / 421 / 384 / 213 vote counts
- https://inkarnate.canny.io/feature-requests?category=export&sort=top — UVTT 14 votes, layer transparency 17 votes, "impossible to create a clean roof-layer for programs such as Foundry"
- https://inkarnate.canny.io/bugs?category=scene-editor&sort=top — 35 / 14 / 12 / 10 / 9 vote bug counts
- https://bugzilla.mozilla.org/show_bug.cgi?id=1934504 — Firefox not officially supported
- https://x.com/inkarnaterpg/status/1767471612205421016 — "VTT (Grid) Exports"
- https://www.similarweb.com/website/inkarnate.com/ `[estimator]` — ~1.2 M visits/mo, rank #36,439, June 2026
- https://crustdata.com/profiles/company/inkarnate `[estimator]` — 23 employees, founded 2016
- https://stargazersworld.com/2015/12/10/inkarnate-entertainment-team-interview/ — founders; unsuccessful Kickstarter
- https://www.geeknative.com/206705/map-maker-inkarnate-reverses-ai-policy-following-community-backlash/ , https://blizzardwatch.com/2025/10/09/tabletop-map-making-website-inkarnate-allows-bans-ai-generated-art-user-driven-win-human-artists/ , https://www.ttrpginsider.news/p/news-roundup-mapmaking-software-provider-inkarnate-faces-pressure-over-ai-policies — the Sept–Oct 2025 price rise, rollback, AI-art reversal
- https://feedback.inkarnate.com/feature-requests/p/downloadable-offline-app-wind-mac , https://feedback.inkarnate.com/feature-requests/p/expand-inkarnate-to-be-a-vtt — desktop app request; "Expand Inkarnate to be a VTT"

*Wonderdraft / Dungeondraft (Megasploot)*
- https://www.wonderdraft.net/ — platforms, "512 pixels to 8192 pixels", DRM-free, royalty-free user content
- https://github.com/Megasploot/Wonderdraft/issues — 39 open, 0 closed, 2023-01-08 → 2026-04-18, issue creation restricted
- https://dungeondraft.net/ — Windows/Ubuntu, min specs, ARM64 unsupported, universal VTT export, cartographyassets.com
- https://github.com/Megasploot/Dungeondraft/issues — 70 open, latest 2026-02-25, Linux RAM issue 2026-01-07
- https://github.com/Megasploot/Dungeondraft/wiki/Custom-Assets-Guide , https://github.com/Ryex/Dungeondraft-GoPackager , https://github.com/EightBitz/Dungeondraft-Tools — the asset/tag pipeline and its third-party tooling

*Dungeon Alchemist*
- https://www.kicktraq.com/projects/1024146278/dungeon-alchemisttm/ — €2,462,441 / 57,199 backers / €45,000 goal / 9 Feb–11 Mar 2021 / €43 avg
- https://store.steampowered.com/app/1588530/Dungeon_Alchemist/ — €37.99, EA since 2022-03-31, 93 % of 1,891, "6000+ objects", "does not use any generative AI/LLM's"
- https://steambase.io/games/dungeon-alchemist/steam-charts `[estimator]` — 3,878 reviews, peak 434 CCU 2025-07-10
- https://steamcommunity.com/app/1588530/negativereviews/?browsefilter=toprated , https://www.metacritic.com/game/dungeon-alchemist/ — style lock-in, no elevation, 3D→2D loss, price resistance
- https://www.dungeonalchemist.com/faqs — Foundry/Roll20/Fantasy Grounds export, artists

*Campaign Cartographer / Other World Mapper*
- https://en.wikipedia.org/wiki/Campaign_Cartographer — 1993, FastCAD, $40, 9 add-ons
- https://www.profantasy.com/products/sub.asp — Cartographer's Annual £27.95, 12 issues/yr, back to Vol 6 (2012)
- https://www.profantasy.com/products/ss3.asp — "over 2000 lovingly crafted modern overland and floorplan symbols"
- https://www.otherworldmapper.com/ — vector-raster blend, one-time, DRM-free, no dates
- https://www.kickstarter.com/projects/2138108959/other-world-mapper-map-design-software — $26,823 / 724 backers / $8,750 goal / 307 % / Oct–Nov 2014

*Azgaar / Watabou*
- https://github.com/Azgaar/Fantasy-Map-Generator — 5.8 k stars, 958 forks, JS→TS, SVG/WebGL, v1.138.1
- https://raw.githubusercontent.com/Azgaar/Fantasy-Map-Generator/master/LICENSE — **MIT**, "reap commercial benefits from the sale of the secondary product"
- https://github.com/Azgaar/Fantasy-Map-Generator/wiki/GIS-data-export — GeoJSON/JSON/CSV with states, provinces, cultures, burgs, markers
- https://github.com/Ethck/azgaar-foundry — journal entries, map notes, per-entry permissions; 61 stars, 20 forks, 129 commits
- https://watabou.itch.io/medieval-fantasy-city-generator , https://watabou.github.io/city.html — Haxe + OpenFL, PNG/SVG/JSON, City Viewer

*Interchange and the in-VTT editors*
- https://arkenforge.com/universal-vtt-files/ — "4 map builders that can create UVTT files"
- https://arkenforge.com/universal-vtt-files/dungeondraft-uvtt-export/ , https://arkenforge.com/universal-vtt-files/dungeonfog-uvtt-export/
- https://help.roll20.net/hc/en-us/articles/41643201127831-Universal-Virtual-Tabletop-UVTT-Support — Roll20 official UVTT support
- https://foundryvtt.com/packages/dd-import/ — Foundry's UVTT path is a community module
- https://github.com/Imagix/uvtt2fgu — Fantasy Grounds via third party
- https://docs.owlbear.rodeo/docs/scenes/ , https://docs.owlbear.rodeo/docs/managing-assets/ — a map is "a single image in your library"; no bundled art
- https://talestavern.com/talespire-guide-to-sharing-copying-using-slabs-and-boards/ — slabs as `Ctrl-C`/`Ctrl-V` clipboard code, "30k clipboard limitation"
- https://www.worldanvil.com/features/maps , https://www.legendkeeper.com/world-anvil-alternative — pins/layers on uploaded rasters (the commoditised fusion, RB-15 §5)

---

*RB-20a. The hard part of an integrated Inkarnate is four thousand six hundred drawings, and we were
never going to draw them. The part that is ours is a foreign key. Kaya's map is already eight thousand
one hundred and ninety-two pixels wide and knows nothing about itself; it does not need to be redrawn,
it needs to be asked a question.*

> *Sie malten Berge, tausendfach, und keiner weiß, wie er heißt.*
> *Wir malen keinen einzigen — wir fragen ihn.*
