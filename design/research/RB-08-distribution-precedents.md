# Distribution Precedents

**Research brief RB-08** — how existing tabletop/VTT products chose their distribution channel, and what
it cost them. Input to the RB-11 distribution verdict (intake K6).

- **Access date:** 2026-07-26 / 2026-07-27 (all live figures captured on these dates).
- **Method:** vendor pages, Steam store pages, Steam community threads, Steambase/Kicktraq/BackerKit,
  trade press. Third-party estimate sites are labelled as estimates.
- **Reliability convention:** `[VERIFIED]` = primary source seen. `[REPORTED]` = secondary press.
  `[UNVERIFIED]` = community claim only, no primary source. `[INFERENCE]` = my arithmetic, not a source.
- **Caveat on Steam review counts:** a Steam store page shows *English-language* reviews by default;
  Steambase shows *all languages*. Where both are quoted the gap is not an error.

---

## Per-product teardown

### 1. TaleSpire — Steam-native, 3D, and it has been walking back "everyone pays" for five years

| Fact | Value | Source |
| --- | --- | --- |
| Channel | Steam only | store page |
| Kickstarter (2019-06-24 → 2019-08-08) | kr 3,542,036 NOK raised vs kr 1,079,668 goal (328%), **8,504 backers** (≈ USD 400k) `[REPORTED]` | Kicktraq |
| Steam Early Access | 14 Apr 2021 — **still in Early Access on 2026-07-27 (5¼ years)** `[VERIFIED]` | store page |
| Price | €20.99 / $24.99; devs state "the plan is to keep the price the same both during and beyond the Early Access period" `[VERIFIED]` | store page |
| Reviews | 90% of 3,274 English; all-languages 4,668 👍 / 506 👎 (5,174), score 90/100 `[VERIFIED]` | store page, Steambase |
| Peak CCU | **1,138 on 2023-07-16**; **68 concurrent on 2026-07-27** (−94% from peak) `[VERIFIED]` | Steambase |
| Everyone must own? | Originally yes. Now: **no**, via Seats + free Guest Edition | see below |

**The ownership walk-back is the story.** A full copy is required to control your own mini and camera.
Bouncyrock then bolted on two escape hatches:

1. **Seats** — $15 for one, **$50 for a 4-pack ($12.50/seat, half a full copy)**. Buyable by *anyone* who
   owns the full game, not just the GM. Seats are reusable across campaigns, not bound to a person, and
   auto-assign as guests arrive `[VERIFIED — talespire.com/seats-prices, dev log 429]`.
2. **TaleSpire – Guest Edition** — a separate, **free** Steam app, released **27 May 2024**. Joins any
   campaign with a free seat; can build, can even GM; the only hard limit is that it cannot *start* a
   campaign. Its own review score is **56% positive of 25** `[VERIFIED — store page]`.

**What the community complains about.** The dominant thread is not features, it's the purchase structure:

> "This whole seats thing is confusing and a tremendous turn off." — Steam Q&A thread on pricing; the OP
> asked for an unlimited-seat GM option. A commenter argued seats should be **20% of full price** to drive
> adoption. Dev `bouncyrock_luis` conceded the store page was unclear: *"We're in contact with Steam to
> rectify this issue."* `[VERIFIED]`

Other recurring negatives: **$75–$85 for a standard table of 4 + GM** to use an open beta; framerate
decaying with board size independent of what is on screen (reports of 20 fps zoomed in *or* out);
mandatory always-online (cloud-hosted campaigns); limited asset library; slow update cadence
`[REPORTED — Steambase review aggregation, Steam Q&A "Performance feedback"]`.

**Workshop: they said no, deliberately.** TaleSpire does **not** use Steam Workshop. It uses **mod.io**
plus copy-paste "slab" strings and third-party sites (TalesBazaar, TalesTavern). Stated reason:

> "The team doesn't want to stay tied to Steam only in the long term, and they don't want to split the
> modding community up between different platforms if they can avoid it." `[VERIFIED — Steam Q&A]`

mod.io was also chosen because it "will work with the guest version." This is a Steam-native studio with
exactly our content shape (tiles, minis, assets) explicitly rejecting Workshop for portability reasons.

---

### 2. Tabletop Simulator — the one product where "everyone buys it" actually works

| Fact | Value | Source |
| --- | --- | --- |
| Channel | Steam | store page |
| Released | 5 Jun 2015 (out of EA, 11 years old) | Steambase |
| Price | $19.99; 4-pack ≈ $59.99 `[REPORTED — community sources conflict, one cites $29.99 for a 4-pack; treat as approximate/dated]` | Steam discussions |
| Reviews | **70,852 👍 / 2,997 👎 (73,849), 96/100 "Overwhelmingly Positive"** `[VERIFIED]` | Steambase |
| Peak CCU | **17,555 on 2026-01-26** — an all-time peak *eleven years after launch* `[VERIFIED]` | Steambase |
| Current CCU | 6,257 `[VERIFIED]` | Steambase |
| Everyone must own? | **Yes.** Only the host needs the DLC/Workshop subscription; assets auto-download to joiners. Steam Remote Play is the only bypass, and it breaks on hidden-information games `[VERIFIED — Steam discussions, TTS KB]` | |

**Why the requirement survives here and nowhere else.** TTS is a *physics sandbox for board games*, not a
GM tool. Its Workshop is the entire product — thousands of community mods, and the mod is what people come
for. At $19.99 with a 4-pack, it prices like a co-op indie game, and the buying group is a board-game
group that already buys $60 boxes. The comparison a frustrated user made in the canonical thread is the
one that matters to us:

> "everyone at the table does not need to own a copy of the game to play [a real board game]."
> Answered by another user with: TTS differs because "everyone needs access to the house where the board
> game is being hosted." `[VERIFIED — Steam discussion 358415738208096845]`

That defence is exactly what a browser player client destroys. TTS gets away with it because it is a
*game*, cheap, and its Workshop content is worth more than the client.

**The Steam-specific hazard TTS demonstrates.** January 2022: a chat-moderation incident (a user kicked
from global chat for saying she was gay) triggered **two competing review-bomb campaigns**, ~300 reviews in
days, worldwide press (Kotaku, PC Gamer, NME, Wargamer, TechRaptor). Berserk Games killed global chat
permanently and donated **$10,000** to the National Center for Transgender Equality `[REPORTED]`.
Lesson: on Steam your reputation lives in a public, permanent, brigadeable review surface you do not
control. A solo operator has no PR function to absorb that.

---

### 3. Fantasy Grounds — the closest precedent to option D, and **it abandoned the model in November 2025**

This is the single most important finding in this brief.

**The old model (≈2004 – 2025-11-08)** — textbook option D:

- Free **Demo** client: could join a game hosted by an Ultimate licensee, could not host.
- **Standard/Core** license: host, but every player also needed a license. (~$39–$50 one-time,
  or a monthly subscription) `[REPORTED — historical, prices varied by era; Wargamer cites "$50"]`
- **Ultimate** license: ~**$149** one-time (upgrade street price ≈ $118–150), or an Ultimate
  subscription — **unlimited players join free with the demo** `[REPORTED — fantasygrounds.com,
  gg.deals, Steam bundle listings; figures dated, verify before quoting externally]`
- Crowdfunded the engine rewrite: **Fantasy Grounds Unity Kickstarter, May 2019 — $509,343 from 8,520
  backers against a $29,000 goal** `[REPORTED — Kicktraq]`. Shipped on Steam 5 Nov 2020.

**The pivot.** On **2025-11-08**, at Fantasy Grounds Con Online, SmiteWorks made the base software
**completely free to play** — GM *and* player, unlimited games, no licence, no subscription, no ads
`[REPORTED — Wargamer exclusive, GamingOnLinux, EN World, Pinnacle, DDO Players]`. Monetisation moved
entirely to content: the marketplace (**3,858 purchasable items on the Steam page alone** `[VERIFIED]`),
art/token/dice packs, and a new browser-based **Online Reader** (2,000+ modules at launch).

Stated reasoning, CDO **Adam Bradford**:

> "The free virtual tabletops available today either began as lightweight tools and have remained limited
> in scope, or they've introduced paywalls and subscription fees to access core features."
>
> "Getting started in that scenario could cost **$70 to $80**. By removing the software costs entirely,
> we're making it possible for someone to simply buy the box set module and start playing for around
> **$20 to $30** instead." `[REPORTED — Wargamer]`

President **Doug Davison**: "…we want everyone to experience how powerful and immersive virtual tabletop
gaming can be — **with zero upfront cost**."

**Current state (2026-07-27):** Steam page reads "Free to play". Reviews **81% of 1,054 "Very Positive"** —
the weakest sentiment of any major in this set `[VERIFIED]`. Current CCU **184** `[VERIFIED — Steambase]`.

**Read this carefully.** The company that ran the per-seat / Ultimate model longer than anyone — and that
successfully crowdfunded half a million dollars on it — concluded that the *software price itself* was the
adoption barrier and deleted it. That is a directional signal, not proof: the pivot is only eight months
old and no post-pivot revenue or user data is public. But nobody in this market has ever moved the other
way.

---

### 4. Foundry VTT — the proof that no store is needed

| Fact | Value | Source |
| --- | --- | --- |
| Channel | **foundryvtt.com only.** Confirmed absent from Steam by store search on 2026-07-27 `[VERIFIED]` | Steam search |
| Price | **$50 USD, one-time, one tier.** "There is only one type of license… no premium tiers, special editions, or season passes." Price **held at $50 despite inflation** (stated in the 2024 review) `[VERIFIED — FAQ]` | FAQ |
| Players pay | **Never.** "Each license allows for hosting a single Foundry Virtual Tabletop game server for an unlimited number of players (who do not need to purchase the software)." `[VERIFIED]` | FAQ |
| Payments | Stripe direct (cards + EU methods); **PayPal explicitly unsupported** `[VERIFIED]` | FAQ |
| Hosting | GM self-hosts, or uses official cloud hosting partners | FAQ |
| Company | Foundry Gaming LLC, Spokane WA, inc. 2018-10-09; Andrew Clayton ("Atropos"). Public release May 2020 | Wikipedia |
| Crowdfunding | **None for the VTT.** Kickstarter used later for *Ember*, their own RPG: **$710,981 from 3,808 backers**, Oct 2024 | 2025 review |

**Adoption trajectory — the evidence a non-store model works:**

| Metric | 2024 review | 2025 review | 2026 review |
| --- | --- | --- | --- |
| License owners YoY | **+32%** | **+22%** | not stated in the excerpt seen |
| Discord members | 85,000 (+~1,500/mo) | **approaching 100,000** (+~1,500/mo) | — |
| Subreddit | 60,000+ | ~75,000 (69,000+ comments, 7,500 posts/yr) | — |
| Approved game systems | 316 | 364 | **475 (+30% YoY)**, 144 already V14-ready |
| Approved modules | 2,758 | — | — |
| Premium packages | 467 → 862 (**+85% YoY**) | Marketplace launched Feb 2025: **500+ modules from 60+ creators** | — |
| Telemetry opt-in | 41% of owners | 51% of owners | — |
| Team | 9 devs + 12 content staff (2023, Wikipedia) | 8 core FVT (5 devs) + PF2e 2 + D&D5e 2 + **15 on Ember** | — |

Usage detail from the 2025 review `[VERIFIED]`: **average playtime 377 h/user, median 7.27 h** (a huge
long tail of light users behind a core of very heavy ones); **68.35% Windows Electron** clients,
**17.10% Linux hosting providers**; median 21 modules and 1 system installed per user; D&D5e 66.5% /
PF2e 33.1% of installs (2024).

No revenue is disclosed. `[INFERENCE]` Six straight years of 20–30% owner growth at a flat $50, funding a
~25-person operation across the VTT, two first-party system teams and a 15-person RPG project, plus a
premium marketplace with 60+ third-party creators and publisher partnerships (+106% YoY Patreon
integration usage) — that is a real company built on a one-time GM licence, no store, no subscription,
and free players. Treat the headcount-implies-revenue step as inference, not a sourced figure.

---

### 5. Roll20 — the biggest, and the most complained about

- Browser, freemium + subscription. Owned by **Wolves of Freeport, Inc.** (renamed from Orr Group, 2023).
- **April 2026 price increase** `[VERIFIED — Roll20 forum announcement]`: Plus **$4.99 → $5.99/mo**,
  **$49.99 → $59.99/yr**; Pro **$9.99 → $10.99/mo**, **$99.99 → $109.99/yr**. Free tier unchanged.
- Scale: **8M users (Q4 2020) → 10M (2022) → 15M+ players claimed (2025)** `[REPORTED — Roll20 blog,
  Bell of Lost Souls, EN World; the 15M figure is a vendor claim]`. Far and away the largest.
- **The Orr Group Industry Report — the only public VTT market dataset — was put on hold after 2021 and
  has not resumed** `[REPORTED — Roll20 wiki]`. Public transparency in this market got worse, not better.
- Complaints, in order of volume: **browser performance** (lag, freezes, crashes on busy scenes; forum
  threads titled "Lag so much lag soooo much lag", reports of 30–60 s to adjust a token's HP, players
  refreshing three times in a two-hour session); **core features behind paywalls**; **stagnation**; and
  now **price**. The April 2026 forum thread is full of "I see no reason to stay as a pro" and pointers to
  free alternatives `[VERIFIED — Roll20 forums]`.
- The standard comparison line: "Foundry is fast and smooth, offloading work to your hardware or hosting
  provider… Roll20 is stuck in the browser" `[REPORTED — myvtt.games 2025 comparison]`.

**Lesson: 15 million users is not a moat if the product is slow and the paywall sits on features.** The
market leader's single biggest weakness is exactly what a native or GPU-accelerated client fixes — which
is the strongest *pro*-native argument in this whole brief, and it does not require Steam.

---

### 6. Alchemy RPG — subscription, browser, still alive

- **Kickstarter 2023-04-25 → 2023-05-25: $740,619 from 4,522 backers**, goal $10,000; funded 20× in one
  day; described as the top-grossing VTT crowdfunding campaign `[REPORTED — TechRaptor, Kicktraq]`.
  (Dungeon Alchemist's €2.46M is larger but is a *tool*, not a VTT.)
- Model: free tier (GM hosts up to 3 games, players 3 characters); **Alchemy Unlimited $8/mo or $88/yr**
  `[REPORTED]`. A June 2026 comparison lists a Pro tier "around $10/month" `[REPORTED — dmtoolsai.com,
  low-quality source, treat as approximate]`.
- Positioning: immersion/streaming-first; **125+ publishing partners** with officially licensed worlds.
- Operating normally as of mid-2026. (Note: *Project Sigil*, D&D Beyond's own 3D VTT, had active
  development shut down in 2026 `[REPORTED]` — relevant as a graveyard entry, even Wizards could not make
  a 3D VTT stick.)

### 7. Owlbear Rodeo — cheap subscription, and the clearest statement of principle in the market

- Browser. Solo project from March 2020; second full-timer Jan 2021; both left day jobs after realising
  they were doing ~40 h/week on top of ~40 h/week `[VERIFIED — blog]`.
- **Free "Nestling" tier: full battle-map play and fog of war, 100 MB storage.** Paid tiers (Fledgling,
  Bestling) from **~$6/mo** buy *storage and rooms*, not features `[VERIFIED — blog, docs]`.
- The design rule, Mitch McCaffrey: *"if we can charge for the thing that people love about our site (the
  product itself) then we can spend all our time making a better product."* They explicitly contrast this
  with Roll20, which "locks big features behind paywalls." `[VERIFIED]`
- Cost driver disclosed: **3 TB/month of bandwidth in January 2021**. The 100 MB free tier is "a little
  low" purely because of cost. `[VERIFIED]`
- They warn against over-generous free tiers by name: *"development on Astral Tabletop has been stopped
  because they couldn't afford to continue to work on it."* `[VERIFIED]`

**Lesson: for a hosted VTT the marginal cost is bandwidth and storage, and that is the honest thing to
charge for.** Also the single strongest argument for keeping self-hosting available: it moves that cost
off our balance sheet entirely.

### 8. Let's Role — the documented failure of cosmetics-only freemium

- **Kickstarter Feb 2021: €287,001 from 5,206 backers**, goal €8,000, avg pledge €55 `[REPORTED — Kicktraq,
  GeekNative]`.
- Browser, free to play, monetised by **cosmetic microtransactions** (3D dice sets, sheet skins, avatar
  frames) plus publisher partnerships. Had a system builder — with **JavaScript** rules scripting.
- **Ceased new development on 2023-11-13**, ~2 years 9 months after launch. Site stays online "until
  further notice." No public reason given in the coverage found `[REPORTED — Tabletop Marketplaces,
  partially paywalled]`.

**Lesson: the model closest to "free browser VTT paid for by skins" is the one that died.** Note also that
its rules layer executed arbitrary JavaScript — the exact thing our declarative-package invariant forbids.

### 9. Dungeon Alchemist — see its own section below.

### 10. Inkarnate and Dungeondraft — the two map tools that both avoid Steam

| | Inkarnate | Dungeondraft |
| --- | --- | --- |
| Channel | Browser, own site | **Own site (dungeondraft.net), checkout via Humble Bundle widget**; DRM-free Win/macOS/Linux `[REPORTED]` |
| Price | Free tier; **Pro $5/mo or $25/yr** `[REPORTED]` | **$30 one-time** `[REPORTED]` |
| Licence hook | Free-tier maps are **personal use only**; Pro grants commercial use — a clean, non-crippling paywall | One-time, no tiers |
| On Steam? | No | No |

**No public statement from Megasploot explaining why Dungeondraft is not on Steam was found** — do not
assert a reason. `[UNVERIFIED]` The observable facts: one-time price, DRM-free, no Workshop, a large
third-party asset economy on itch.io that the developer neither hosts nor taxes.

Contrast the licence hooks: Inkarnate gates **commercial use**, not capability. That is a paywall model
worth stealing for a theme/rule-package marketplace.

### 11. GM Forge — the cautionary twin: option D, on Steam, already tried

This one deserves attention out of proportion to its size, because it is *our proposed option D, shipped*.

| Fact | Value | Source |
| --- | --- | --- |
| Channel | Steam | store page |
| Released | **30 May 2018** (8 years ago) | Steambase |
| Price | **$29.99**, never discounted (0 days on sale in the last 12 months) | Steambase price tracker |
| Model | **"When you buy a copy of GM Forge, your friends join you through their web browser without purchasing a copy."** | store description `[REPORTED]` |
| Workshop | **Yes** — Steam Workshop hosts its game systems; six sample systems shipped | store page |
| Reviews | **28 👍 / 55 👎 = 83 total, score 34/100, "Mostly Negative"** | Steambase |
| Current CCU | **1** | Steambase |

Eight years on Steam, with Workshop, with free browser players, at a sane price — **83 reviews and one
concurrent player.** Complaints centre on bugs and stability `[REPORTED]`.

**Steam is a shelf, not distribution.** Being listed buys you nothing if the product does not earn
word-of-mouth. Conversely: GM Forge's failure is *not* evidence against the asymmetric model. It is
evidence that the model is not a growth strategy by itself.

### 12. Merlin VTT — live competitive intel for K5

Not yet released ("Coming soon" as of 2026-07-27). "A basic 3D Virtual Tabletop that uses the **Unreal
Editor** as its creation tool, and **Foundry VTT as its game system layer**." Core program **permanently
free for players**: *"you don't need to purchase copies for your entire RPG group."* SDK sold separately
on Fab, with a free simpler version. Participants need Foundry for most features `[VERIFIED — store page]`.

Someone is already executing "UE5 front-end bolted onto an existing VTT's rules layer" — and shipping the
player client free on Steam. Relevant to K5(c) and to RB-09.

---

## Comparison table

| Product | Channel | Price model | Must all players pay? | Rough scale (2026-07-27) | Biggest lesson for us |
| --- | --- | --- | --- | --- | --- |
| **TaleSpire** | Steam only | $24.99 one-time + Seats ($15 / $50 per 4) + free Guest Edition | **Started yes → now no** | 5,174 reviews (90%); peak CCU 1,138 (2023), now 68; 5¼ yrs in EA | The seat model is *confusing*, and confusion at checkout is a conversion tax. Also: they rejected Steam Workshop for mod.io on purpose |
| **Tabletop Simulator** | Steam | $19.99 (4-pack ≈ $60) | **Yes** (host owns DLC; Remote Play is the only bypass) | 73,849 reviews (96%); **all-time peak CCU 17,555 in Jan 2026** | The only place "everyone buys" works — and it works because it is a cheap *game* whose Workshop is the product |
| **Fantasy Grounds** | Steam + own store | Was: free demo / ~$50 Standard / ~$149 Ultimate / subs. **Now: free** (2025-11-08) | Ultimate: no. **Now: nobody pays for software at all** | 1,054 Steam reviews (81% — weakest of the majors); CCU 184; 3,858 marketplace items | The longest-running option-D vendor **deleted the software price**; the money is in content. Only 8 months of evidence — direction, not proof |
| **Foundry VTT** | **Own site only. Not on Steam** | **$50 one-time, one tier, forever** | **No** — unlimited free browser players | +32% then +22% YoY owners; ~100k Discord; 475 systems; ~25 staff across projects | A store is optional. A one-time GM licence + creator marketplace sustains a real company |
| **Roll20** | Browser | Freemium; Plus $5.99/mo, Pro $10.99/mo (raised Apr 2026) | No | 15M+ claimed users | Scale ≠ loyalty. Paywalling *features* + browser lag = the churn engine we should aim at |
| **Alchemy RPG** | Browser | Free tier; $8/mo or $88/yr | No | KS $740,619 / 4,522 backers; 125+ publishing partners | Licensed-content partnerships are the subscription's real justification |
| **Owlbear Rodeo** | Browser | Free (full play + fog of war); ~$6/mo for storage & rooms | No | 3 TB/mo bandwidth (2021); 2-person team | Charge for **cost** (storage/bandwidth), never for gameplay features |
| **Let's Role** | Browser | Free + cosmetic microtransactions | No | KS €287,001 / 5,206 backers → **development ceased 2023-11-13** | Cosmetics-only freemium did not fund development. The clearest death in the set |
| **Dungeon Alchemist** | **Steam** | **$44.99 one-time**, no subs, Workshop free | **N/A — single-user tool** | KS €2,462,821 / **57,209 backers**; 3,878 reviews (95/100); 8,800+ Workshop maps + 4,500+ assets | **Steam works for tools, not for tables.** Exports *into* every rival VTT instead of competing with them |
| **Inkarnate** | Browser | Free; Pro $5/mo or $25/yr | N/A | — | Gate **commercial use**, not capability |
| **Dungeondraft** | Own site (Humble checkout) | **$30 one-time, DRM-free** | N/A | — | A one-time-price desktop tool needs no storefront; third-party assets thrive untaxed |
| **GM Forge** | Steam | $29.99, players free via browser, Steam Workshop | **No** | **83 reviews, 34/100, 1 CCU after 8 years** | Option D on Steam has already been tried and produced nothing. Steam is a shelf |
| **Merlin VTT** | Steam (unreleased) | Free player client; SDK on Fab | No | — | UE5 + free Steam player client + Foundry as rules layer — a competitor is executing K5's shape now |

---

## The "must everyone buy it" question

**The market has already answered, and the answer moves in one direction only.**

Every product that required all participants to pay has either softened the requirement or removed it.
Nothing in this sample moved the other way:

- **TaleSpire**: full-copy-only → Seats (2022-ish) → **free Guest Edition (May 2024)**.
- **Fantasy Grounds**: per-seat licences → Ultimate (GM pays for everyone) → **fully free (Nov 2025)**.
- **Tabletop Simulator**: the sole holdout, and even it leans on Steam Remote Play as an unofficial bypass.
- **Foundry, Roll20, Owlbear, Alchemy, Let's Role, GM Forge, Merlin**: never required it.

**What the requirement actually costs, in the words of the people who dropped it:**

- Adam Bradford (Fantasy Grounds, Nov 2025): getting started "could cost **$70 to $80**" — that number is
  the reason they went free.
- TaleSpire community, unprompted, arrives at the same arithmetic: "**$75–$85** for a standard group
  (4 players and a DM)" for an Early Access product.
- The structural objection, from a TaleSpire thread: players "expect more than they put in and may view
  buying the software as a gamble, especially if the GM burns out or the group breaks up" — a player's
  purchase is **stranded** the moment the table dissolves. A GM's purchase is not. This asymmetry of risk
  is the real reason player-pays fails, and it is not fixable with a discount.
- The frequently-requested fix is always the same: a cheap player-only client (~$10 or less) or an
  unlimited-seat GM option.

**Second-order effect: the GM becomes an unpaid salesperson.** Under player-pays, adopting your product
requires the GM to persuade 3–5 people to spend money on software for a hobby only one of them is driving.
That is a coordination problem, not a pricing problem, and it caps you at groups where every member is
already a PC gamer with a Steam wallet. Every mature vendor eventually concluded that the GM will pay
generously to *not* have to run that conversation — hence Ultimate, hence Seats, hence Foundry's $50.

**Corollary for us:** *any* option that requires players to own something is a strictly worse version of
option D, and option D itself is already the conservative choice. The live question is not "should players
pay" (no) but "does the GM buy a **licence** (Foundry, $50, no store) or a **Steam product** (option D,
GM Forge's exact shape, proven inert)".

---

## Why Foundry avoided Steam

**Verified facts (2026-07-27):**

- Foundry VTT has **no Steam store page**. A store search for virtual-tabletop software returns Merlin
  VTT, GM Forge, Realm Engine, Virtual Battlemap, Digital TableTops, Dragon Map Maker and others — no
  Foundry. Wikipedia lists no Steam distribution. The FAQ names only foundryvtt.com and cloud hosting
  partners. `[VERIFIED]`
- Purchases go through **Stripe**, direct. **PayPal is explicitly unsupported.** `[VERIFIED — FAQ]`
- The FAQ does not mention Steam or any third-party storefront **at all** — it is not addressed as a
  question, which is itself informative: it is not a live topic for them. `[VERIFIED]`

**On the claim that a Steam release was planned:** a page titled "Foundry Steam Release Date" asserting a
2024 announcement/release window surfaced in search. It is on an unrelated domain, reads as generated SEO
filler, and is **contradicted by the current absence of any Steam listing**. **Discard it.** `[UNVERIFIED,
likely false]`

**On the stated reason: there isn't one, publicly.** I found **no primary statement from Andrew Clayton
("Atropos") or Foundry Gaming LLC explaining the decision.** The only reason found anywhere is a
third-party forum comment: *"the reasons on why they don't put it on Steam is because of the % Cut as well
as the refund policy"*, immediately rebutted in the same thread by "the devs don't want to." `[UNVERIFIED
— do not repeat this as fact.]`

**What we can infer honestly from their published behaviour** `[INFERENCE, clearly labelled]`:

1. **The 30% cut is structural, not marginal, at a $50 one-time price with zero recurring revenue.** They
   have held $50 through six years of inflation and said so publicly. Losing $15 of it per sale, forever,
   to a channel would have to be paid for by a price rise they have visibly refused to make.
2. **Their product does not fit Steam's shape.** Foundry's value is a *server* the GM runs — self-hosted or
   with a hosting partner — plus a browser client for players. Steam sells and updates *client
   applications* tied to a Steam account. 17.10% of their installs are on Linux hosting providers, where
   Steam is irrelevant. Steam's refund window (2 h / 14 days) is also hostile to software whose entire
   value is delivered in the first session.
3. **They did not need discovery.** They grew 20–30% a year on creators: 475 approved systems, 2,758+
   modules, 1,350 developers, 60+ marketplace creators, publisher partnerships, a ~100k-member Discord.
   Discovery in this market runs through GMs, YouTube and system authors — the people who make the thing
   that makes your VTT worth using. Steam reaches gamers; Foundry needed *system authors*.
4. **A storefront would have complicated the licence they actually sell.** One licence, no tiers, no
   season passes, transferable to any host — that is hard to express as a Steam SKU and impossible to
   express as a Steam SKU that also hosts on a Linux VPS.

**The honest conclusion for RB-11:** Foundry is strong evidence that a non-store model *can* work — it is
arguably the most successful VTT of the decade by developer-ecosystem depth and it has never touched a
storefront. But we must **not** tell Kaya "Foundry rejected Steam because of the cut." We do not know why.
We know only that they never did it, never explained it, and grew anyway.

---

## Dungeon Alchemist: a tool that won on Steam

The strongest evidence in this brief that Steam can work for a TTRPG product — and, read carefully, the
strongest evidence about *which kind* of product.

**The numbers** `[VERIFIED unless marked]`:

| | |
| --- | --- |
| Developers | Briganti (Belgium) — Wim De Hert & Karel Crombecq, two roleplayers |
| Kickstarter | **2021-02-09 → 2021-03-11: €2,462,821 from 57,209 backers**; goal ~€20k; **fully funded in 3 hours**; top-ten most-funded board-game Kickstarter of all time `[REPORTED — Kicktraq/BackerKit/TechRaptor]` |
| Steam | Early Access **2022-03-31**; **still in EA on 2026-07-27**, targeting exit "late 2026" |
| Price | **$44.99 / €37.99**, one-time, no subscription (price *rose* during EA; frequently 20% off) |
| Reviews | 93% of 1,891 English; **3,675 👍 / 203 👎 = 3,878 all-languages, 95/100 "Very Positive"** |
| CCU | peak **434 (2025-07-10)**; **85 on 2026-07-27** |
| Workshop | **Steam Workshop enabled and heavily used: 8,800+ free user-made maps, 4,500+ shared assets** `[REPORTED — DA wiki]` |
| Players must own? | **No. Single-user tool.** |

`[INFERENCE — not a source figure]` 3,878 reviews at typical software review-to-owner ratios (1:30–1:70)
implies very roughly **120k–270k Steam owners**, on top of 57k Kickstarter backers. At $30–45 that is a
multi-million-euro product built by two people. Do not quote this as fact; it is arithmetic, and the ratio
varies wildly for software. **No sourced revenue or owner figure was obtainable** (VG Insights now
redirects behind a Sensor Tower login; SteamDB blocks fetching).

**Why it worked, precisely — four things, all of which we should copy or consciously reject:**

1. **Single-user.** No coordination problem, no stranded-purchase risk, no GM sales pitch. One person
   buys a tool for their own prep. This is *the* structural difference from every VTT on Steam.
2. **Instant, screenshottable value.** "High-quality maps in seconds." The Kickstarter funded in three
   hours because a 20-second GIF conveys the entire value proposition. Steam's discovery machinery is
   fundamentally a *visual* machine — capsule art, trailer, screenshots. A tool with a spectacular visual
   output is native to that machine. A campaign manager with permission-aware GM/player views is not.
3. **It feeds the competition instead of fighting it.** Exports to **Foundry, Roll20, Fantasy Grounds
   Unity, Above VTT, and the universal UVTT format** — including wall and lighting data, animated WEBM
   maps for Foundry and FG, and video export for TV/projector tables `[REPORTED — DA wiki]`. It never
   asked anyone to switch VTT. It made itself a *component*, and thereby addressable to the entire market
   rather than to the slice willing to migrate.
4. **Workshop as free content engine.** 8,800 maps and 4,500 assets contributed by users, at zero cost to
   the developer. Note the contrast with TaleSpire, which refused Workshop for portability reasons —
   Dungeon Alchemist could accept the lock-in because it is a Steam-only single-user tool with nothing to
   port.

**Also worth recording:** the store page explicitly states *"Dungeon Alchemist does not use any generative
AI/LLM's for its room generation."* In 2026 that is a **deliberate trust signal** in a market allergic to
genAI. Directly relevant to our optional-AI-generators feature and its framing.

**TaleSpire vs. Dungeon Alchemist — the contrast that makes the whole brief:**

| | TaleSpire | Dungeon Alchemist |
| --- | --- | --- |
| What it is | A multiplayer table (a *venue*) | A single-player tool (an *instrument*) |
| Who must buy | Originally everyone; now GM + seats | One person |
| Crowdfunding | ~$400k, 8,504 backers | **€2.46M, 57,209 backers (6.7× the backers)** |
| Reviews | 5,174 | 3,878 (fewer — but no group purchase inflating the count) |
| Sentiment | 90/100 | **95/100** |
| Top complaint | **Pricing/seats confusion, cost for a group** | Feature gaps, EA pace |
| Workshop | **Refused** (mod.io, to stay portable) | **Embraced** (13,000+ items) |
| Relationship to rivals | Competes with every VTT | **Exports to every VTT** |
| Years in EA | 5¼ and counting | 4⅓ and counting |

Same store, same audience, same year-ish. The tool raised 6.7× the backers and scores higher, and its
negative reviews are about features rather than about money. The difference is not quality — TaleSpire is
a well-liked product. The difference is that **one of them asks a group to transact and the other asks a
person.**

---

## Lessons for us

Ordered by how much they should move the RB-11 verdict.

**L1 — Kill "all players pay" now; it is not a live option.** Two of the three products that required it
have retreated, and the third is a cheap physics sandbox where the Workshop is the product. Any candidate
architecture that assumes player purchases should be struck in round 1 without further debate. *(Directly
answers K6 options A/B/C where they imply a paid player client.)*

**L2 — Option D's *shape* is validated; option D *on Steam* is not.** Fantasy Grounds proved players-join-
free works at scale for two decades. Foundry proved a $50 GM-only licence funds a ~25-person company with
no store at all. **GM Forge proved that the identical model, put on Steam, produces 83 reviews in eight
years.** Steam is a shelf, not a growth engine. If we choose D, choose it on the merits of the *asymmetric
licence*, not on the hope of Steam discovery — and be prepared to sell direct as the primary channel.

**L3 — Steam suits tools; our map generator and rule-builder are tools.** The one unambiguous Steam
success here is single-user, visually spectacular, and one-time-priced. `[This is the most actionable
finding.]` A credible route is a **split**: the collaborative VTT lives on the web (free players, GM
licence, self-hostable), while the **WFC map generator / theme editor / visual rule-builder** — the
single-user, screenshot-friendly, Workshop-shaped half — could ship as a standalone Steam product that
exports into our VTT *and into Foundry/Roll20/FG via UVTT*. That is Dungeon Alchemist's playbook applied
to our differentiators, and it makes our tools addressable to the entire existing market instead of only
to people willing to switch VTT. It also de-risks the whole venture: the tool can succeed even if the VTT
does not.

**L4 — Interoperate; do not demand migration.** Dungeon Alchemist reached the whole market by exporting
to rivals. Every VTT that demanded a switch fought a 10-year ecosystem head start (intake tension #3).
UVTT export, and Foundry/Roll20/FG-shaped exports, should be a **launch requirement**, not a Phase 9
nicety. Note that Merlin VTT is going further and using **Foundry as its rules layer** — a legitimate
strategic option to evaluate in RB-09, and a warning that this niche is being taken.

**L5 — Workshop is not free: it costs portability.** TaleSpire — Steam-native, with tiles/minis/assets
exactly like ours — **rejected Steam Workshop** to avoid being "tied to Steam only in the long term" and
splitting its modding community, and chose **mod.io** partly so its free Guest Edition could use it. Our
rule packages, theme templates and tilesets are our crown jewels and our moat; binding them to Steam
accounts permanently caps the browser side. **Recommendation to RB-10: design the content pipeline on a
neutral backend (mod.io or our own), and treat Steam Workshop as an optional mirror, never the source of
truth.**

**L6 — Monetise content and creators, not the client.** Both mature vendors converged here from opposite
directions: Fantasy Grounds deleted its software price and kept a 3,858-item marketplace; Foundry held a
$50 client and grew premium packages +85% YoY with 60+ creators, publisher deals, and Patreon
integration (+106%). Our **visual GUI rule-builder is a creator tool** — it manufactures exactly the goods
a marketplace sells. That argues for maximising client distribution (free/cheap, everywhere) and taking a
cut downstream. Inkarnate's variant is elegant and worth copying: gate **commercial use**, not capability.

**L7 — Never paywall gameplay features.** Owlbear charges for storage and rooms and says so plainly; Roll20
charges for features and is the most complained-about product in the market. If we host anything, charge
for the cost we actually incur (bandwidth, storage, hosted rooms). Self-hosting keeps that cost off our
books entirely and is a genuine differentiator — do not discard it lightly in the option-B enthusiasm.

**L8 — Subscriptions are fragile for an operation our size.** Let's Role died on cosmetics-only freemium in
under three years; Astral died on a too-generous free tier; Roll20's April 2026 increase (Plus $4.99→$5.99,
Pro $9.99→$10.99) produced immediate public churn talk. A **one-time GM licence plus a content marketplace**
carries the lowest ongoing obligation, no per-user server cost, and no monthly justification treadmill.

**L9 — Budget for a multi-year Early Access, publicly.** TaleSpire: 5¼ years in EA. Dungeon Alchemist:
4⅓ years, still shipping 2021 Kickstarter stretch goals in 2026. If we go to Steam, EA is a *state*, not a
phase. TaleSpire's commitment to hold price through and beyond EA is a good precedent to copy; Dungeon
Alchemist raised price during EA and got away with it because value was obvious.

**L10 — Crowdfunding is viable, but the amount is decided by the product's shape, not by ambition.**

| Campaign | Raised | Backers | Year |
| --- | --- | --- | --- |
| Dungeon Alchemist (*tool*) | **€2,462,821** | **57,209** | 2021 |
| Alchemy RPG (VTT) | $740,619 | 4,522 | 2023 |
| Foundry *Ember* (RPG, post-success) | $710,981 | 3,808 | 2024 |
| Fantasy Grounds Unity (VTT rewrite) | $509,343 | 8,520 | 2019 |
| TaleSpire (VTT) | ~kr 3.54M NOK (≈$400k) | 8,504 | 2019 |
| Let's Role (VTT) | €287,001 | 5,206 | 2021 |
| **Foundry VTT itself** | **none** | — | — |

VTT campaigns cluster at **$290k–$740k / 4k–8.5k backers**. The single-user tool with a demoable visual
output raised **3.3–8.6× more money from 6.7–15× more backers**. And the most successful product in the
category never crowdfunded at all. **Read: crowdfunding is realistic for us, most realistic for the map
generator / rule-builder, and it buys runway plus a launch-day audience at the price of a permanent public
obligation list.** For a solo stakeholder with an AI crew, that obligation list is a real risk — Dungeon
Alchemist is still discharging its 2021 promises five years later with a two-person team.

**L11 — Steam's reputation surface is a genuine, one-way risk.** Tabletop Simulator's January 2022 review
bombing cost it a global feature, $10,000, and a week of hostile international coverage — over a
moderation decision, not a product defect. Our product involves user-generated themes, user content
uploads and optional AI generators: three well-known flashpoints. A direct store has customer emails; a
Steam page has a permanent public scoreboard that strangers can brigade. `[Weigh in RB-11 alongside RB-07's
economics.]`

**L12 — The market's biggest opening is exactly where our brief already points.** Roll20 has 15M+ users and
its loudest complaint is *browser performance*; Fantasy Grounds just conceded that upfront cost is the
barrier; the Orr Group's public dataset went dark in 2021; D&D Beyond's Project Sigil was shut down in
2026. GPU-class rendering + zero cost for players + GM workload reduction is an unoccupied intersection.
Note that it is unoccupied **without needing Steam** — Foundry occupies the adjacent square with a $50
direct-sold licence.

---

## Sources

**TaleSpire**
- [TaleSpire on Steam](https://store.steampowered.com/app/720620/TaleSpire/) — price, EA status, reviews (accessed 2026-07-27)
- [TaleSpire – Guest Edition on Steam](https://store.steampowered.com/app/2881860/TaleSpire__Guest_Edition/) — free client, seats, 56%/25 reviews
- [TaleSpire Steam Charts | Steambase](https://steambase.io/games/talespire/steam-charts) — peak CCU 1,138 (2023-07-16), current 68, 5,174 reviews
- [TaleSpire Reviews | Steambase](https://steambase.io/games/talespire/reviews)
- [talespire.com/seats-prices](https://talespire.com/seats-prices) — how seats work
- [TaleSpire Dev Log 429 – Costs and Currencies](https://bouncyrock.com/news/articles/talespire-dev-log-429-costs-and-currencies) — $15/seat, $50 4-pack, regional pricing reasoning
- [Seats – A new way for your friends to play in TaleSpire](https://bouncyrock.com/news/articles/seats-a-new-way-for-your-friends-to-play-in-talespire)
- [Steam Q&A: "Please can the developers explain this pricing situation?"](https://steamcommunity.com/app/720620/discussions/0/4330853607903167686/) — seats confusion, dev response
- [Steam Q&A: "Access to Steam Workshop?"](https://steamcommunity.com/app/720620/discussions/0/3974929535248931758/) — why not Workshop
- [Steam Q&A: "Do all players need to own the game?"](https://steamcommunity.com/app/720620/discussions/0/3410929607717847254/)
- [TaleSpire on Kicktraq](https://www.kicktraq.com/projects/bouncyrock/talespire/) — Kickstarter totals
- [mod.io — TaleSpire Community Creations](https://mod.io/g/talespire)

**Tabletop Simulator**
- [Tabletop Simulator Steam Charts | Steambase](https://steambase.io/games/tabletop-simulator/steam-charts) — 73,849 reviews, peak CCU 17,555 (2026-01-25)
- [Steam discussion: "All Players Need a Copy of TTS?"](https://steamcommunity.com/app/286160/discussions/0/358415738208096845/)
- [Steam discussion: "Can friends play tabletop simulator without owning it?"](https://steamcommunity.com/app/286160/discussions/0/3046104336675579468/)
- [Tabletop Simulator FAQ – Knowledge Base](https://kb.tabletopsimulator.com/getting-started/faq/)
- [Kotaku — TTS Steam reviews descend into culture war](https://kotaku.com/tabletop-simulator-s-steam-reviews-descend-into-culture-1848341167)
- [PC Gamer — TTS studio kills global chat, $10K donation](https://www.pcgamer.com/tabletop-simulator-studio-kills-global-chat-for-good-makes-dollar10k-donation-to-trans-advocacy-group/)
- [Wargamer — TTS hit with transphobic Steam reviews](https://www.wargamer.com/tabletop-simulator/transphobic-steam-reviews)

**Fantasy Grounds**
- [Fantasy Grounds VTT on Steam](https://store.steampowered.com/app/1196310/Fantasy_Grounds_VTT/) — "Free to play", 81%/1,054, 3,858 DLC items (accessed 2026-07-27)
- [Fantasy Grounds VTT Steam Charts | Steambase](https://steambase.io/games/fantasy-grounds-vtt/steam-charts) — CCU 184, released 2020-11-05
- [Wargamer — Fantasy Grounds is now free to play](https://www.wargamer.com/dnd/fantasy-grounds-free) — 2025-11-08 pivot, Bradford and Davison quotes
- [GamingOnLinux — Fantasy Grounds VTT is now free to play](https://www.gamingonlinux.com/2025/11/fantasy-grounds-virtual-tabletop-vtt-is-now-free-to-play/) *(403 on fetch; corroborating headline only)*
- [Pinnacle Entertainment — Fantasy Grounds VTT is now free to play](https://peginc.com/fantasy-grounds-vtt-is-now-free-to-play/)
- [EN World — Fantasy Grounds Is Going Free To Play](https://www.enworld.org/threads/fantasy-grounds-is-going-free-to-play.716127/)
- [Fantasy Grounds Subscriptions page](https://www.fantasygrounds.com/home/Subscriptions.php) *(403 on fetch; historical prices via secondary sources)*
- [Fantasy Grounds Unity on Kicktraq](https://www.kicktraq.com/projects/smiteworks/fantasy-grounds-unity/) — $509,343 / 8,520 backers
- [gg.deals — FGU Ultimate License Upgrade](https://gg.deals/dlc/fantasy-grounds-unity-ultimate-license-upgrade/) — historical Ultimate pricing

**Foundry VTT**
- [Foundry VTT FAQ](https://foundryvtt.com/article/faq/) — $50, one tier, players free, Stripe, no PayPal (accessed 2026-07-27)
- [Year in Review: Five-Year Anniversary Edition (2025)](https://foundryvtt.com/article/year-in-review-2025/) — +22% owners, ~100k Discord, team composition, playtime stats
- [Year in Review: Four-Year Anniversary Edition (2024)](https://foundryvtt.com/article/year-in-review-2024/) — +32% owners, 862 premium packages, $50 held
- [EN World — Foundry VTT Year in Review 2026](https://www.enworld.org/threads/foundry-vtt-year-in-review-2026-most-popular-game-systems.719217/) — 475 approved systems (+30% YoY)
- [Foundry VTT — Wikipedia](https://en.wikipedia.org/wiki/Foundry_VTT) — company, dates, no Steam listed
- [Foundry Anniversary 2026](https://foundryvtt.com/article/anniversary-2026/) — 20% anniversary discount (no metrics)
- [Ember on Kickstarter](https://www.kickstarter.com/projects/foundryvtt/ember-rpg) — $710,981 / 3,808 backers
- Steam store search for virtual tabletop software, 2026-07-27 — **no Foundry listing**
- *Discarded:* "Foundry Steam Release Date" (webapp-new.itlab.stanford.edu) — SEO filler, contradicted by the live store; do not cite
- *Unverified:* an [itch.io forum comment](https://itch.io/post/15682871) attributing the decision to "the % Cut as well as the refund policy" — **community claim only**

**Roll20**
- [Roll20 Announcement – Price Increase (Apr 2026)](https://app.roll20.net/forum/post/10031927/roll20-announcement-price-increase) — Plus $4.99→$5.99, Pro $9.99→$10.99
- [Roll20 Blog — Orr Group Industry Report Q4 2020: 8 Million Users](https://blog.roll20.net/posts/the-orr-group-industry-report-q4-2020-8-million-users-edition/)
- [EN World — Roll20 Now Has 10 Million Users](https://www.enworld.org/threads/roll20-now-has-10-million-users.686259/)
- [Orr Industry Report — Roll20 Wiki](https://wiki.roll20.net/Orr_Industry_Report) — reports on hold since 2021/2022
- [Roll20 forum — "Roll20 Performance was about as bad as I've seen"](https://app.roll20.net/forum/post/10657305/roll20-performance-was-about-as-bad-as-ive-seen)
- [Roll20 forum — "Lag so much lag soooo much lag"](https://app.roll20.net/forum/post/10603634/lag-so-much-lag-soooo-much-lag)
- [Roll20 Help — Performance Issues: Steps to Troubleshoot Lag](https://help.roll20.net/hc/en-us/articles/12637048593303-Performance-Issues-Steps-to-Troubleshoot-Lag)

**Alchemy RPG / Owlbear Rodeo / Let's Role**
- [TechRaptor — Alchemy RPG Kickstarter funded 20× in one day](https://techraptor.net/tabletop/news/alchemy-rpg-kickstarter-fully-funded-in-one-day)
- [Alchemy RPG on Kicktraq](https://www.kicktraq.com/projects/alchemyrpg/alchemy-rpg-a-reimagined-vtt-experience/) — $740,619 / 4,522 backers
- [Alchemy RPG](https://alchemyrpg.com/)
- [Owlbear Rodeo — State of the Rodeo: Let's Talk about Subscriptions](https://blog.owlbear.rodeo/state-of-the-rodeo-lets-talk-about-subscriptions/) — reasoning, 3 TB/mo, Astral warning
- [Owlbear Rodeo — Managing your Subscription](https://docs.owlbear.rodeo/docs/managing-your-subscription/) — Nestling/Fledgling/Bestling
- [GeekNative — Let's Role rocks Kickstarter](https://www.geeknative.com/128767/the-vtt-landscape-heats-up-lets-role-rocks-kickstarter/)
- [Let's Role on Kicktraq](https://www.kicktraq.com/projects/lets-role/lets-role-an-immersive-and-easy-to-use-virtual-tabletop/) — €287,001 / 5,206 backers
- [Tabletop Marketplaces — Let's Role ceases new development (2023-11-13)](https://tabletopmarketplaces.substack.com/p/breaking-lets-role-virtual-tabletop) *(partially paywalled)*

**Dungeon Alchemist / Inkarnate / Dungeondraft**
- [Dungeon Alchemist on Steam](https://store.steampowered.com/app/1588530/Dungeon_Alchemist/) — €37.99, 93%/1,891 EN, Workshop, EA exit "late 2026", anti-genAI statement (accessed 2026-07-27)
- [Dungeon Alchemist Steam Charts | Steambase](https://steambase.io/games/dungeon-alchemist/steam-charts) — 3,878 reviews, peak CCU 434 (2025-07-10), current 85, $44.99
- [Dungeon Alchemist on Kickstarter](https://www.kickstarter.com/projects/1024146278/dungeon-alchemisttm) — €2,462,821 / 57,209 backers
- [TechRaptor — Dungeon Alchemist hits over $1M on Kickstarter](https://techraptor.net/tabletop/news/ai-powered-map-making-tool-dungeon-alchemist-hits-over-1-million-on-kickstarter)
- [DungeonAlchemist Wiki — VTT Support](https://dungeonalchemist.fandom.com/wiki/VTT_Support) — Foundry / Roll20 / FGU / Above VTT / UVTT export
- [DungeonAlchemist Wiki — Steam Workshop](https://dungeonalchemist.fandom.com/wiki/Steam_Workshop) — 8,800+ maps, 4,500+ assets
- [The Steam Workshop for Dungeon Alchemist](https://steamcommunity.com/app/1588530/workshop/)
- [Inkarnate](https://inkarnate.com/) and [TTRPG Stack review (2026)](https://www.ttrpgstack.com/tools/inkarnate/) — Pro $5/mo, $25/yr, commercial-use gate
- [Dungeondraft](https://dungeondraft.net/) — $30 one-time, DRM-free, Humble checkout

**Other Steam VTTs (comparison set)**
- [GM Forge – Virtual Tabletop on Steam](https://store.steampowered.com/app/842250/GM_Forge__Virtual_Tabletop/) *(region-blocked on fetch)*
- [GM Forge Reviews | Steambase](https://steambase.io/games/gm-forge-virtual-tabletop/reviews) — 28 👍 / 55 👎, 34/100 "Mostly Negative"
- [GM Forge Price Tracker | Steambase](https://steambase.io/games/gm-forge-virtual-tabletop/price) — $29.99, released 2018-05-30, 1 CCU
- [Merlin VTT on Steam](https://store.steampowered.com/app/2932670/Merlin_VTT/) — UE5 + Foundry rules layer, free player client
- [Realm Engine | Virtual Tabletop on Steam](https://store.steampowered.com/app/1427700/Realm_Engine__Virtual_Tabletop/)
- [Digital TableTops VTT on Steam](https://store.steampowered.com/app/3073720/Digital_TableTops_VTT/)

**Market context**
- [StartPlaying — A Comprehensive List of Virtual Tabletops](https://startplaying.games/blog/posts/a-comprehensive-list-of-virtual-tabletops)
- [myvtt.games — Foundry VTT vs Roll20 (2025)](https://myvtt.games/blog/foundry-vtt-vs-roll20-2025-which-vtt-is-better)

---

## Open items for RB-11 / follow-up

1. **Sourced sales data is unobtainable for free.** VG Insights now redirects to a Sensor Tower login;
   SteamDB blocks automated fetching. If a defensible revenue number for Dungeon Alchemist or TaleSpire
   matters to the verdict, it needs a paid Gamalytic/VG Insights lookup or a manual browser session.
2. **Fantasy Grounds' free-to-play outcome is not yet measurable** (8 months of data, none public).
   Re-check its Steam CCU, review velocity and marketplace activity in Q4 2026 before treating the pivot
   as a proven success rather than a directional signal.
3. **Foundry's Steam rationale has no primary source.** If this matters to Kaya, the honest routes are the
   Foundry Discord (~100k members, devs active) or a direct question — not further search.
4. **Merlin VTT** is unreleased and building the K5 shape (UE5 + free Steam player client) on top of
   Foundry. Worth a standing watch item and a mention in RB-09.
5. **Steam's 2 h / 14 d refund window vs. a tool whose value lands in the first session** is an RB-07
   economics item this brief surfaced but did not quantify.
