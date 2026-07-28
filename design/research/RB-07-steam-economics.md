# Steam as a Channel

**Research brief RB-07** · compiled 2026-07-26/27 · access date for all web sources: **2026-07-26**
Question owner: the K6 distribution fork (browser-first self-hosted vs. Steam-native vs. hybrid vs.
asymmetric GM-host). This brief covers **only the Steam channel**: money, rules, discovery,
capabilities. Client tech paths are RB-09; precedents are RB-08; Workshop/networking depth is RB-10.

**Confidence marking used throughout:** `[V]` = verified against Valve's own Steamworks/Steam
documentation. `[S]` = secondary source (trade press, analyst, tooling site) — directionally useful,
numerically soft. `[E]` = my estimate/modelled arithmetic. `[?]` = uncertain, must be confirmed with
Valve before it can carry weight in a decision.

---

## Revenue & fees

### The take rate

| Lifetime Adjusted Gross Revenue (per app) | Valve's share | Ours |
| --- | --- | --- |
| $0 – $10,000,000 | 30% | 70% |
| $10,000,000 – $50,000,000 | 25% | 75% |
| above $50,000,000 | 20% | 80% |

`[V/S]` Tiers are **per app, not per publisher**, are not retroactive (only revenue above each
threshold gets the better rate), and have applied since 1 October 2018 with no structural change
announced as of July 2026. Revenue counted toward thresholds includes the base app, DLC, and
in-app purchases on that app. **Revenue from Steam keys redeemed after being sold elsewhere does
NOT count toward the tiers** — only direct Steam Store sales do.

For us this table is decoration. A niche TTRPG tool will not see $10M lifetime; **plan on a flat
30%** forever.

### The $100 Steam Direct fee

`[V]` **$100 USD per app**, paid up front, charged with VAT to a German buyer. It is
*non-refundable but recoupable*: Valve returns it as a line item in the payment made after the app
has passed **$1,000 Adjusted Gross Revenue**. It applies to *every* app ID including free ones —
so the asymmetric model (option D: paid GM host app + free player client app) costs **$200**, not
$100. A separate demo does **not** need its own fee (demos are attached to the base app) `[V]`.

Consequence worth noting: at $100/app, shipping rule packages or theme packs as **DLC** is
essentially free of platform entry cost — DLC does not carry its own Steam Direct fee `[?] verify
before planning a DLC catalogue`.

### What actually lands in the bank — the real per-unit math

The naive model (`net = price × 0.70`) is wrong by a wide margin. Deductions stack in this order:

1. **VAT is removed before the split.** `[V]` "Steam pricing is VAT inclusive in all countries
   where amounts are collected." A €29.99 German sale is €25.20 net of 19% USt *before* Valve's
   cut.
2. **Valve's 30%** on the VAT-exclusive amount.
3. **Refunds** — reversed in full. `[S]` Median refund rate across genres ≈ **9.5%**; Early Access
   ≈ **12.4%**.
4. **Regional pricing.** `[S]` Valve's own recommendations put CIS at 40–60% below USD, SE Asia
   50–70% below, LatAm (Argentina) 75–85% below, Japan/Korea 10–20% below; EUR sits roughly 1:1
   with USD.
5. **Discount culture.** `[S]` Typical seasonal-sale participation costs **15–25% of effective
   average price** over a product's life.

`[E]` Worked example at a €29.99 / $29.99 list price, globally distributed, moderate sale
participation:

```
list (DE, incl. 19% USt)          29.99
  − VAT                          −4.79   →  25.20
  − Valve 30%                    −7.56   →  17.64   (best case: German full-price buyer)
  − refunds (~10%)                        →  15.88
  − regional-price drag (~15%)            →  13.50
  − lifetime discount drag (~20%)         →  10.80
```

So **roughly €11–13 net per unit on a €30 list price** — about **37–43% of sticker**. A
third-party 2026 guide models the same shape and lands at ~$7.90 net on a $19.99 list `[S]`, which
is 39.5% — consistent. Use **40% of list** as the planning constant for Steam.

### Payouts

`[V]` Monthly, **by the 30th of the month following the sale month**. Minimum payout **$100 USD**
(configurable higher). **USD only**, by ACH (US) or SWIFT wire (international). Valve additionally
holds revenue ~30 days `[S]`, so realistically **6–8 weeks from first sale to first money in a
German account**, and every payout carries an inbound-SWIFT fee plus a USD→EUR conversion spread
(bank-dependent, ~0.5–2%) `[E]` that nobody puts in their spreadsheet.

### Tax, for a German solo developer or GmbH/UG

**Not tax advice. This is a Steuerberater question and must be treated as one.** What the sources
support:

- **Valve is effectively the seller to the end customer**, and collects and remits consumption tax
  itself: "Steam pricing is VAT inclusive in all countries where amounts are collected… In all
  other countries, we are selling cross-border and are not required to collect." `[V]` Valve does
  not use the phrase "merchant of record" in its own tax FAQ, but it behaves as one for VAT/GST
  purposes. `[?]` The precise contractual characterisation (licence to Valve vs. agency) lives in
  the Steam Distribution Agreement and should be read by a lawyer before the decision is final.
- **German VAT on our side:** the payment we receive from Valve is a B2B supply to a non-EU
  business; German community/practitioner consensus is that **reverse charge applies and no German
  USt is owed on Steam payouts**, but the turnover must still be *declared* in the
  Umsatzsteuer-Voranmeldung as a non-taxable supply `[S]`. Kleinunternehmerregelung (§19 UStG,
  €22,000 threshold) interacts with this and with the inability to reclaim Vorsteuer `[S]`.
- **US withholding:** default **30%** on US-source income for foreign partners unless a treaty
  applies. `[V]` Germany's treaty with the US reduces royalty withholding to **0%** for software —
  but only if the tax interview is completed correctly with a W-8BEN / W-8BEN-E **and a TIN**
  (German Steuernummer/USt-IdNr. accepted as foreign TIN). `[V/S]` Getting this wrong costs 30% of
  US revenue permanently. Verification of the tax form takes 2–7 business days `[V]`.
- **Income/trade tax** (Einkommensteuer or KSt + GewSt) is unaffected and fully owed in Germany.
- Reporting: non-US partners get IRS **Form 1042-S** by 15 March `[V]`. Valve provides
  country-by-country monthly sales data to support our own filings `[V]`.

### EU DSA trader status — the one that surprises solo developers

`[S]` Under DSA Art. 30, marketplaces selling to EU consumers must **collect and publicly display**
the trader's legal name, address, phone and email. Enforcement across app stores hardened from
17 February 2025. For a **solo developer without a business address, this means a real postal
address becomes public**. Budget for a business address / Impressum service, or incorporate.
`[?]` Steam's exact display surface and verification flow should be confirmed in Steamworks before
onboarding.

---

## Monetisation models that actually work

### What Steam supports

| Model | Supported? | Notes |
| --- | --- | --- |
| One-time purchase | Yes `[V]` | The default and the only model Steam's whole machine is tuned for. |
| Paid DLC | Yes `[V]` | No extra Steam Direct fee per DLC `[?]`. The natural home for rule packages, theme packs, tilesets, adventure content. |
| In-app purchase (MTX) | Yes `[V]` | **Mandatory** to use Valve's Microtransaction API — "Steam customers can only make purchases from the Steam Wallet". You cannot bolt Stripe into a Steam build. |
| Free base app + paid upgrade | Yes | Requires a second app ID (+$100) or a DLC unlock. |
| **Recurring subscription** | **Technically yes, practically discouraged** `[V]` | Steamworks has a *Recurring Subscriptions* / *Recurring In-Game Billing* feature (rolled out ~2013 for MMOs). Valve's own docs state it "**is not a fully supported feature**" and that developers should "consider whether recurring subscription is really the right path for their product." Treat as **not available** for planning purposes. |
| Ad-supported free tier | **Prohibited** `[V]` | "Advertising-based business models" are on Valve's list of what you shouldn't publish on Steam. Kills any freemium-with-ads idea. |
| Crypto / NFT / tokens | Prohibited `[V]` | Irrelevant to us, but confirms Valve polices business models, not just content. |
| Steam Points / awards | Cosmetic only | No revenue to us. Ignore. |

**The single most important line in this section:** Steam is a *licence-sales* platform, not a
*SaaS* platform. If the business plan requires recurring revenue, Steam is structurally the wrong
primary channel — you would be building the recurring layer outside Steam anyway, which reintroduces
the account system, the payment stack and the compliance surface Steam was supposed to remove.

### The three shapes that work for tool-like products

1. **Premium one-time, DLC catalogue on top** — Fantasy Grounds' historical model. Base client
   plus a long tail of paid ruleset/adventure DLC. Fits our rule-package architecture almost
   perfectly and is the highest-ceiling model on Steam for us.
2. **Cheap impulse buy + Workshop network effect** — Wallpaper Engine at ~$4: 20–50M owners,
   ~989,000 reviews, 98% positive `[S]`. Volume compensates for the low price; the Workshop is the
   product. Not reachable for a GM tool, but it is the proof that Steam's *software* audience is
   real when the price is impulse-tier and UGC compounds.
3. **Mid-price prosumer tool, rarely discounted** — Aseprite ($20) and Dungeon Alchemist
   ($44.99 / €37.99). Dungeon Alchemist's revenue is estimated at **~$2.2M** `[S, third-party
   estimator — soft]`, with 1,891 English reviews at 93% positive, Early Access since March 2022.
   Aseprite estimates run to ~$14.9M gross / ~$4.4M net `[S, very soft]`. This is the tier our
   product would live in.

### TTRPG-specific comparables on Steam

| Product | Price | Reviews | Model | Note |
| --- | --- | --- | --- | --- |
| TaleSpire | €20.99, Early Access since Apr 2021 | 4,341 all-languages, 90% positive `[V, store page]` | one-time, free "Guest Edition" demo | Closest structural analogue to a 3D VTT on Steam. `[E]` Boxleiter-style estimate at 30–50 units/review → ~130k–215k units; at ~€12 realised → **~€1.6–2.6M gross over 5 years**. Treat as an order of magnitude, not a number. |
| Dungeon Alchemist | €37.99 / $44.99 | 1,891 EN, 93% | one-time, Steam Workshop, Kickstarter-funded | ~$2.2M estimated `[S]`. Listed under **Games → RPG** with `Software`/`Utilities` tags — not in the Software category. |
| Tabletop Simulator | ~$20 | very large | one-time + paid DLC | The Workshop UGC + DMCA case study (see below). |
| Fantasy Grounds VTT | was $50 Ultimate / monthly sub; **now free to host and join**, monetised via ruleset/adventure DLC `[S]` | — | licence → DLC pivot | The clearest evidence that the "GM pays, players free" licence tier eventually collapses toward "client free, content paid". |

### What deep-discount culture does to a premium tool

`[V/S]` Valve's discounting rules: minimum discount 10%, maximum 90–95%; **30-day cooldown between
discounts**; **launch discount capped at 40%** (Valve suggests 10–15%); no discount for 30 days
after a price increase; **seasonal sales (Summer/Winter/Spring/Autumn) are exempt from the
cooldown**.

The trap is not the rules — it is the *expectation*. Steam buyers are trained to wait for the
seasonal sale, and the seasonal sale is simultaneously one of the platform's biggest recurring
discovery events. So:

- Discount → you get visibility, and you train your buyers that €30 means €18.
- Don't discount → you keep price integrity (Aseprite-style), and you opt out of the four largest
  recurring traffic spikes Steam gives you for free.

For a **tool with ongoing development costs**, this is worse than for a game: a game's revenue is
front-loaded and a 75%-off long-tail sale is pure upside; a tool's users expect years of updates,
so every deep-discount buyer is a long-term support/hosting liability bought at €5. `[E]` If we
ever run server infrastructure for Steam buyers, deep discounts and a perpetual licence are
directly incompatible — a €5 buyer cannot fund five years of sync/storage.

### Refunds: the specific hazard for a "try it" tool

`[V]` **Under 2 hours of runtime AND within 14 days of purchase = automatic refund**, no reason
needed. Valve can revoke refund rights from individuals who abuse the system, but does not police
it per-title `[S]`.

Two hours is *plenty* to build one map, generate a dungeon, or import a character sheet and then
refund. Documented cases exist of short games taking 21% refund rates from players who finished
them inside the window `[S]`. A GM tool is precisely the product where "use it for the session I
needed, then refund" is a coherent user strategy.

Mitigations that actually work: a genuinely useful **free demo/player client** (so the refund
decision is made before purchase, not after), value that accrues over time rather than in the first
session (campaign library, saved packages), and *not* designing the flagship feature as a
one-shot generator you can exhaust in 90 minutes. `[E]` **Budget 10–15% refund rate**, higher than
the 9.5% median, because our product's shape invites it.

---

## Store rules & legal surface

### Is a tool allowed? Yes — with a caveat that matters

`[V]` Steam explicitly accepts non-game software. The onboarding docs list accepted software
genres: *Animation & Modeling, Audio/Video Production, Design & Illustration, Photo Editing,
Educational & Tutorials, Finance & Accounting, **Player Tools**, SteamVR Tools*. "Player Tools" is
almost exactly our category. App types are Game / Software / DLC / Video / Demo `[V]`.

**But the strategic point is that the successful TTRPG tools do not list as Software.** TaleSpire,
Dungeon Alchemist and Tabletop Simulator all sit under **Games**, carrying `Software`/`Utilities`
as *tags*. Reasons this matters are in the Discovery section — chiefly Next Fest eligibility and
algorithmic surfaces. `[?]` **Open question for Valve: would a system-agnostic VTT be accepted as
app type "Game"?** Precedent says yes; get it in writing before building a launch plan on it.

### Prohibited content (the list that constrains us)

`[V]` Valve's "what you shouldn't publish" list. The items with teeth for us:

- **"Content you don't own or have adequate rights to."** This is the rulebook-content invariant,
  restated as a store rule. Shipping D&D/Pathfinder/HdH content without a licence is a store-policy
  violation, not merely a legal risk.
- **"Applications that modify customer's computers in unexpected or harmful ways."** A self-hosting
  tool that opens ports, installs a service, or spawns a local server must disclose this clearly.
  Our "no arbitrary code execution in rule packages" invariant is now also a *store compliance*
  asset, not just a security one.
- **Advertising-based business models** — prohibited (see monetisation).
- **Blockchain/NFT/crypto issuance** — prohibited.
- **A 2025 addition: content violating payment-processor / card-network / bank standards** `[S]`.
  Vague, retroactively applied, and it has already caused hundreds of delistings in the adult
  space. Relevant to us only through **Workshop UGC** — a user-generated adult TTRPG package could
  drag the parent app into that policy surface.

### AI-generated content disclosure

`[V/S]` Valve's AI disclosure regime, **clarified 16–17 January 2026**:

- **Exempt:** "AI powered tools" used for developer workflow (code assistants, etc.). This was the
  January 2026 clarification — our using Claude to build the product needs no disclosure.
- **Must disclose — pre-generated:** any AI-generated asset shipped in the product *or in
  marketing/store-page materials*. Free-text description required. Subject to the same review as
  any other content.
- **Must disclose — live-generated:** if the product generates AI images/text/audio **at runtime**,
  you check that box and must **describe the guardrails** preventing illegal or infringing output.
- Disclosures are surfaced on the store page, and the **Steam Overlay now lets players report
  in-app content as "illegal AI generation"** `[S]` — community moderation pointed straight at us.

**Direct hit on our roadmap.** The pack's "optional AI generators" (locations, NPCs, images) are
**live-generated AI content by Valve's definition**. That means: mandatory disclosure on the store
page, a documented guardrail story, and exposure to player-side reporting. It also means the AI
label is visible to buyers in a market segment (TTRPG) with a **loud, organised anti-AI-art
constituency**. Note Dungeon Alchemist explicitly advertises the *opposite* on its store page —
"does not use any generative AI/LLMs" `[V, store page]` — which tells you how the audience is
reading this.

### User-generated content and DMCA

This is where Steam is genuinely *better* than self-hosting.

- `[V]` Workshop requires enabling `ISteamUGC` plus a Steam Cloud quota; content is **hosted and
  distributed by Valve**, and **Valve operates the DMCA process**. Creators must warrant they hold
  the rights; infringing uploads can cost them revenue and get them banned.
- The precedent that matters: **Games Workshop has repeatedly DMCA'd Warhammer content out of
  Tabletop Simulator's Workshop** `[S]`. Valve removed the items. Tabletop Simulator itself was
  never at risk.
- The counterweight: **DMCA abuse on Steam Workshop is widely reported as poorly handled**, with
  creators saying they have no effective counter-notice path `[S]`. If our Workshop becomes the
  home of community rule packages, expect community anger aimed at *us* when a big publisher
  nukes a beloved package — even though the removal is Valve's and the takedown is the publisher's.

Compared with hosting a rule-package registry ourselves — where we become the DMCA/DSA-liable
intermediary, need a designated agent, a notice-and-action procedure, and the storage bill — **Valve
absorbing UGC hosting and takedown handling is one of the strongest non-financial arguments for
Steam.**

### Age rating

`[V]` Since **15 November 2024, Steam does not display products to German customers without a valid
age rating.** Two routes: a real **USK** rating (expensive, slow) or **Valve's built-in content
questionnaire**, which produces an IARC-style label that satisfies the Jugendschutzgesetz. The
questionnaire route is free and is what we would use. Note Valve's warning: do **not** enter a USK
rating obtained via IARC on a third-party store. `[?]` Whether an app typed as *Software* also
requires the questionnaire for German display — verify; assume yes.

### Third-party accounts and external servers

`[V/S]` Steam has a **"Requires 3rd-Party Account"** store-page disclosure and a consent flow for
transmitting user data to a third party at link time. A custom EULA is expected when the product
has its own account system, collects data outside Steam, or hosts UGC.

Nothing found prohibits an app that needs the user's own server or an external account — but it
**must be disclosed**, and it is a documented and heavily-punished source of negative reviews
(users hate it). `[E]` For our purposes: a Steam build that says "now go set up PostgreSQL" is
commercially dead. A Steam build that runs a **self-contained embedded host on the GM's machine**
is the only version of self-hosting that survives contact with a Steam audience.

---

## Discovery — the honest numbers

### The market you would be entering

`[S]` **20,282 games released on Steam in 2025**; 11,979 in H1 2026 alone → ~24,000 pace for the
year. Platform gross ≈ **$16.9B in 2025**, a record. Steam MAU ≈ **132–147M**; peak concurrents
**42,042,778** on 11 January 2026.

And the distribution underneath that:

- **Median revenue for a new 2025 Steam release: $249.** `[S]`
- **66% of games earned under $1,000.** `[S]`
- **47.5% sold fewer than 100 copies.** `[S]`
- 5,863 games earned over $100,000 — the best year ever for that band, and still **~29% of
  releases**. `[S]`

Steam is not a discovery machine you plug into. It is a marketplace where **the top ~10% capture
essentially everything**, and where the median outcome is €200.

### How visibility actually works — from Valve's own docs

`[V]` This is the most-misunderstood part and Valve says it plainly:

- **"Wishlists are not a factor in your game's algorithmic visibility on Steam."** Their real
  functions are (a) the launch/discount **email + notification blast**, and (b) qualifying for
  **Popular Upcoming**.
- Real algorithmic surfaces: the **New Releases queue** (a baseline pool that shows your title to
  users whose tag preferences match, prioritising the titles with fewest views), the **Discovery
  Queue**, **New & Trending**, top-seller lists, sale-event pages, and friend activity.
- **Tags and supported languages** materially gate who ever sees you. (de/en localisation in the
  brief is therefore also a discovery decision, not only an accessibility one.)
- A **review score below 40% reduces visibility**.
- Store-page traffic, conversion rate and (above 40%) review score are **not** visibility inputs.
- **Update Visibility Rounds** let you claim front-page space for major updates — this is a real,
  repeatable asset for a tool that ships continuously, and is under-exploited.

### The wishlist folklore, corrected

The "1,000 wishlists before launch" number is **folklore and it is wrong by an order of magnitude.**
The 2026 numbers `[S]`:

- **Popular Upcoming** entry: ~**7,000–12,000** wishlists, but it is a *ranked competition*, not a
  fixed bar — 7,000 clears in a quiet week and misses in a busy one. The **June 2026 front-page
  refresh widened the window from ~a week to ~a month, raising the effective bar for indies.**
- Zukowski's 2026 launch tiers: **5,000 (bronze) / 8,000 (silver) / 50,000 (gold) / 90,000
  (diamond)**; ~$250K+ revenue typically needs **30,000–50,000** wishlists at launch.
- Conversion: **~12% of wishlists convert on day one**; first-week sales ≈ **15–25% of the wishlist
  count**.
- Wishlist **velocity over the last 48–72h** matters more than the absolute total for Popular
  Upcoming.

`[E]` Run that backwards for us. To net €100,000 gross-to-us in a launch window at ~€12 net/unit,
we need ~8,300 units, i.e. ~35,000–55,000 launch wishlists. **That is a serious marketing campaign
in its own right** — it is not something Steam hands you.

### Next Fest — and the disqualifier

`[V]` Next Fest is **unreleased games only**, one Next Fest per title ever, requires a public demo,
demo submitted 2–4 weeks ahead. The documentation frames the whole event around *games*, and
**non-game software is not eligible** `[V/E — inferred from the eligibility wording; confirm with
Valve`]`. Next events: **October 2026, February 2027, June 2027**.

Even if we get in, the honest numbers `[S]` from **February 2026**:

- **Median: ~800 wishlists** across the whole week.
- 70th percentile 1,839 · 95th percentile 13,461 · single breakout 57,074.
- **Correlation between pre-fest wishlists and fest earnings: r = 0.825.** Next Fest **amplifies
  momentum you already have**; it does not create it.
- 68–88% of wishlists gained came from players who never opened the demo.
- Games under 50 reviews stay effectively invisible in Steam's algorithmic surfaces.
- June 2026 had **4,200+ demos** competing.

**Conclusion:** if we list as *Software*, we lose Next Fest entirely; if we list as *Game*, we get
one shot at a median outcome of ~800 wishlists. Neither is a discovery strategy.

### The software-category penalty

`[S]` Steam's software section is less prominently placed than games, users report difficulty
finding it, and the recommendation engine is driven by what players *play* — a structural bias
toward games. The 2025/2026 store redesign (Browse / Recommendations / Categories / Hardware / Ways
to Play / More) did not add software prominence.

`[E]` **Practical recommendation: list as app type "Game" with software/utility tags**, following
TaleSpire and Dungeon Alchemist, and only fall back to Software if Valve refuses. This single
choice is worth more than any marketing tactic in this brief.

### Compared with self-marketing a web app

| | Steam | Own web app |
| --- | --- | --- |
| Audience present | 132–147M MAU `[S]` | 0 |
| Guaranteed impressions | ~0 (baseline New Releases pool only) | 0 |
| Discovery channels you must build anyway | YouTube/Reddit/Discord/TTRPG press | identical |
| Discovery channels Steam adds | tag/queue surfacing, seasonal sales, wishlist blast, update visibility rounds, "More Like This" adjacency to TaleSpire/TTS | none |
| SEO | none (Steam owns the page) | yours, compounding |
| Direct relationship with buyer | none — Valve owns the customer | full (email, upsell, renewal) |
| Recurring revenue | effectively unavailable | native |

The honest framing: **Steam does not solve the discovery problem — it changes its shape.** Instead
of "get strangers to find your website," it becomes "get strangers to your Steam page so Steam's
adjacency engine can compound it." The compounding is real (**"More Like This" next to TaleSpire and
Tabletop Simulator is a channel a web app can never buy**), but the ignition is still on us.

---

## Steamworks capabilities we could exploit

| Capability | Verdict for us |
| --- | --- |
| **Steam Workshop** | `[V]` Requires enabling `ISteamUGC` + Cloud quota in App Admin. Valve hosts, versions, distributes, and handles DMCA. **Rule packages, theme templates and tilesets are textbook Workshop content.** This is the single most valuable Steam capability for us. Paid Workshop exists but is **curated per-title and Valve-approved** (CS2, Dota 2, TF2, Cities: Skylines, Skyrim, a handful of non-Valve titles); creator share is set by the developer, typically ~25% `[S]`. Assume **free Workshop**, and treat paid Workshop as a later ask, not a plan. |
| **Steam Cloud** | `[V]` Developer-configurable per-user quotas (multi-GB achievable, observed up to ~93GB `[S]`), ~10,000 files/user, **100MB practical per-file write limit** (250MB+ degrades). Fine for settings, rule packages, small campaign data. **Not** a substitute for a real asset/media backend for maps and handouts. |
| **Steam Datagram Relay / `ISteamNetworkingSockets`** | `[V]` Valve's private relay backbone: authenticated, encrypted, rate-limited, hides player IPs, and often *lowers* ping. Works for P2P and dedicated servers. **No fee is documented in the Steamworks docs** — it is widely understood to be free for Steam-shipped titles, but `[?] this must be confirmed contractually before we design our netcode around it.` Non-Steam clients can use SDR only if a Steam version ships, and Valve explicitly "cannot promise that this service will always be available to non-Steam players." **This is the killer feature for option D/asymmetric play: GM-hosted sessions with no server bill and no port forwarding.** |
| **Remote Play Together** | `[V/S]` One owner hosts; **up to 4 players (more on fast links) join without owning the app**, now even **without a Steam account** via an invite link + the Steam Link app. **BUT: it streams the host's screen and injects remote controller input** — it is designed for local/couch multiplayer. It cannot give players a *separate, permission-scoped view*. **It is therefore useless for our GM/player asymmetry requirement.** Do not plan around it. The free-player-join goal must be met by a real free client app or SDR-based networking. |
| **Steam Families** | `[S]` Up to 6 accounts pool licences; **one copy = one simultaneous user**, and developers can opt out per title. Because simultaneous play needs simultaneous copies, Families does **not** meaningfully erode a multi-seat table. Low risk. |
| **Steam Keys** | `[V/S]` Free to generate, **5,000 default at launch** (more case-by-case), sellable on our own site at **0% Valve cut**. Constraint: Valve's price-parity stance — "don't give Steam customers a worse deal than Steam Key purchasers." **This is the hybrid arbitrage: sell direct via Paddle at ~78% net and deliver a Steam key, so buyers still get the Steam library/auto-update experience.** Caveat: key sales don't count toward revenue tiers (irrelevant to us). |
| **Achievements / Trading Cards / Points** | Available for Game-typed apps; cosmetic. Achievements in a *tool* are a gimmick that could either charm the audience or cheapen it — an Aphrodite call, not an economics one. |
| **Steamworks SDK & build pipeline** | `[V/S]` The SDK is a native C/C++ library. Bindings exist for essentially every path we'd take: **Greenworks / steamworks.js** for Electron, **GodotSteam**, **Facepunch.Steamworks** for .NET, native for Unity/Unreal. **A pure browser build cannot use any of it** — this is the hard technical fork RB-09 must resolve. Uploads use **SteamPipe via `steamcmd`** with VDF app/depot build scripts; fully scriptable in CI (`steam-deploy` and similar). `[E]` Integration effort for a wrapped desktop app: **1–3 days for basic init/overlay/Cloud; 1–3 weeks for Workshop + SDR done properly.** |
| **Linux / macOS / Steam Deck** | `[S]` Steam hardware survey 2026: Linux **3.99–5.33%** (peaked 5.33% in March 2026, 3.99% in May), macOS **~2.16–2.35%**, Windows ~92%. Steam Deck is ~24% of Linux users. **Steam Deck is a poor fit for a GM console** (small screen, controller-first) but Proton usually handles a well-behaved desktop app for free. macOS matters more for TTRPG audiences than the 2% suggests `[E]`, and TaleSpire ships macOS. |

### Launch mechanics / checklist

`[V]` The gates, in order:
1. Sign the NDA + Steam Distribution Agreement; pay $100.
2. Bank + tax onboarding, identity verification (**2–7 business days** for tax verification).
3. **30-day mandatory wait** between paying the app fee and being allowed to release.
4. Store page built and submitted for review — **3–5 business days** (submit 7+ business days
   early); must then sit publicly as **"Coming Soon" for at least 2 weeks**.
5. Build submitted for review — **1–5 days**.
6. German age-rating questionnaire completed, or the product is invisible in Germany.
7. AI disclosure form completed.
8. Release.

`[E]` **Minimum realistic lead time from "we decide to ship on Steam" to "we can press the button":
6–8 weeks of pure process**, entirely independent of whether the software is ready — and that lead
time is *before* any wishlist campaign, which itself needs months.

---

## Direct-sales comparison

### Per-unit net, same €29.99 list, German buyer

| Channel | VAT handling | Platform cost | Net to us `[E]` | % of list |
| --- | --- | --- | --- | --- |
| **Steam** | Valve collects & remits | 30% | **€17.64** (before refund/discount/regional drag → ~€11–13 realised) | 59% (~40% realised) |
| **Paddle / Lemon Squeezy** (merchant of record) | Paddle collects & remits, files globally | ~5% + $0.50 `[S]` | **~€23.50** | 78% |
| **Stripe** (we are merchant of record) | **we** register, collect, file OSS/VAT everywhere | 2.9% + €0.30 base, realistically ~4–5% all-in with intl. cards, FX, Billing, Tax `[S]` | **~€23.9–24.2**, minus our compliance labour | ~80% |
| **itch.io** | dev handles | 10% default (settable to 0) + payment fees ~3% `[S]` | ~€21.9 | 73% |
| **Steam key sold via Paddle** | Paddle | ~5% + $0.50, **0% to Valve** | **~€23.50** *and the buyer gets a Steam library entry* | 78% |

### The trade, quantified

`[E]` **Steam nets us ~75% of what Paddle nets us per unit** (17.64 / 23.50 = 0.751, before
refunds/discounts; **~46–55% once the realised €11–13 figure is used**).

Therefore:

- On the optimistic (pre-drag) numbers, **Steam must sell ~1.33× as many units as direct sales to
  break even.**
- On realistic numbers (€12 realised vs €23.50 direct), **Steam must sell ~2× as many units.**

For a product with **zero existing audience**, Steam clears 2× trivially — 2 × 0 is still 0, and
Steam at least has 140M people walking past. For a product with **an established community**
(Discord, YouTube, TTRPG press coverage), the calculus inverts: every sale you would have made
anyway now costs you half its margin, plus you lose the customer email, plus you lose the ability
to ever sell them a subscription.

**The arbitrage nobody should skip:** sell direct via Paddle **and deliver a Steam key**. You keep
78%, the buyer gets the Steam experience, and you keep the customer relationship. The only limits
are Valve's 5,000 default key allocation and the price-parity expectation (so: same price both
places, differentiate with bundles/extras rather than discounts).

### What direct sales cannot buy

- Adjacency: appearing under "More Like This" on TaleSpire and Tabletop Simulator pages.
- The four annual seasonal-sale traffic spikes.
- Valve absorbing global VAT filing, chargebacks, fraud, refunds and **UGC hosting + DMCA
  handling**.
- The trust signal. A €40 download from an unknown German solo developer's website is a much harder
  sell than the same €40 through Steam's refund guarantee — genuinely worth several percentage
  points of conversion `[E]`.

---

## Implications for us

1. **Steam does not change the discovery problem; it changes the ignition problem.** The median
   2025 Steam release earned **$249**. Nobody is discovered by accident. If we ship to Steam we
   still must build the audience — the difference is that Steam *compounds* an audience once it
   exists (tag adjacency, seasonal sales, Workshop, update visibility rounds) in a way a standalone
   web app never will.

2. **Workshop + Steam Datagram Relay are the two things worth changing the architecture for, and
   Remote Play Together is not.** Workshop gives us free, versioned, Valve-hosted, Valve-DMCA'd
   distribution for exactly the artefacts K1 and K2 produce (rule packages, theme templates,
   tilesets) — solving both a discovery problem and a legal-liability problem in one move. SDR
   gives GM-hosted multiplayer with no server bill and no port forwarding, which makes the
   *self-hostable* invariant actually pleasant instead of a support nightmare. Remote Play Together
   is a screen-streaming feature and **cannot** deliver separate GM/player views — strike it from
   the option-D reasoning entirely.

3. **The business model has to be a licence, not a subscription.** Steam's recurring-subscription
   feature exists but Valve's own documentation calls it not fully supported and steers developers
   away; ad-supported models are outright banned. So the Steam-viable shape is **one-time purchase
   + paid DLC content packs** (Fantasy Grounds' pattern, and the pattern our rule-package
   architecture is already built for). If Kaya wants recurring revenue, that layer must live
   outside Steam, which reintroduces the accounts and payments stack Steam was meant to remove.

4. **Two structural gotchas must be designed around from day one, not patched later.** (a) The
   **2-hour/14-day refund window** is enough to use a GM tool for a whole session and refund it —
   so value must accrue over time, and a real free demo/player client must catch the "just trying
   it" buyer before purchase. (b) Our **optional AI generators are "live-generated AI content"**
   under Valve's January 2026 policy: mandatory store-page disclosure, a documented guardrail
   story, and player-facing reporting, in a market where a leading competitor (Dungeon Alchemist)
   *advertises the absence of generative AI* as a selling point.

5. **List as a Game, not as Software, and run the numbers honestly before committing.** Every
   successful TTRPG tool on Steam (TaleSpire, Dungeon Alchemist, Tabletop Simulator) is a *Game*
   with software tags; the Software category costs Next Fest eligibility and sits in a weaker
   discovery surface. And the arithmetic to hold in mind for the K6 verdict: at a €30 list price we
   realise **~€11–13 per unit on Steam vs ~€23.50 selling direct through a merchant-of-record** —
   Steam must move **roughly twice the volume** to be revenue-neutral. The cleanest resolution is
   probably **not a fork at all but both**: sell direct via Paddle with a **free Steam key**
   attached (78% net, we keep the customer), while the Steam listing does the discovery work.

---

## Risks

**High severity**

- **R1 — Discovery is not solved by shipping.** Median 2025 Steam release: $249; 66% under $1,000;
  47.5% under 100 copies. Popular Upcoming needs 7,000–12,000 wishlists in a *ranked* competition
  whose bar rose in June 2026; Next Fest's median is ~800 wishlists and correlates r=0.825 with
  pre-existing momentum. **A Steam launch without a 30,000+ wishlist campaign is a €249 launch.**
- **R2 — Refund window vs. tool usage pattern.** 2h/14d is enough to extract a full session's value.
  Budget 10–15% refunds, not the 9.5% median, and design the free tier to absorb tyre-kickers.
- **R3 — The subscription door is closed.** Recurring billing on Steam is documented by Valve as
  "not a fully supported feature"; ads are banned. If the commercial plan needs MRR, Steam cannot
  be the primary channel and the architecture must not assume it is.
- **R4 — Perpetual licence + ongoing server costs is an unbounded liability.** A €5 deep-discount
  buyer who expects five years of sync, storage and updates is a loss-making customer. Either the
  Steam SKU is strictly local/P2P (SDR, no backend), or the licence must not promise hosted service.
- **R5 — AI disclosure + TTRPG audience sentiment.** Runtime AI generators trigger mandatory
  disclosure, a guardrail description, and in-overlay player reporting — in a market where the
  strongest comparable product markets itself as AI-free. Reputational, not just procedural.

**Medium severity**

- **R6 — Workshop UGC drags us into publishers' IP enforcement.** Games Workshop has repeatedly
  DMCA'd Tabletop Simulator Workshop content. Our Workshop will fill with unlicensed 5e/Pathfinder
  rule packages within weeks of launch. Valve handles the takedowns and the legal exposure, but
  **we absorb the community anger and the publisher relationship damage** — and the 2025
  payment-processor clause adds a second, vaguer removal vector.
- **R7 — Process lead time and the 30-day fee wait.** 6–8 weeks minimum from decision to
  releasable, before any marketing. Plus German age rating (mandatory since 15 Nov 2024, else
  invisible in our home market) and the AI disclosure form.
- **R8 — Steam takes the customer.** No email list, no upsell path, no renewal conversation, no
  SEO. For a product intended to grow a content catalogue over years, losing the direct
  relationship is a compounding cost, not a one-time 30%.
- **R9 — Discount culture erodes price integrity.** Refusing to discount costs us the four biggest
  recurring traffic events; participating trains buyers to wait and halves effective ARPU.
- **R10 — DSA trader disclosure.** A German solo developer's **legal name and postal address become
  public**. Budget a business address or incorporate before onboarding.

**Lower severity / verify**

- **R11 — Payout friction.** USD-only SWIFT, $100 minimum, ~6–8 weeks to first money, plus FX
  spread. Cashflow-relevant for a solo operation, not existential.
- **R12 — US withholding misconfiguration.** Get the W-8BEN + TIN wrong and 30% of US revenue is
  gone permanently. Cheap to prevent, impossible to recover.
- **R13 — Unverified assumptions that must be closed before the K6 verdict:** (a) will Valve accept
  a system-agnostic VTT as app type *Game*? (b) is SDR contractually free and usable at our scale?
  (c) does a *Software*-typed app still need the German rating questionnaire? (d) is Next Fest
  formally closed to non-game software? (e) what exactly does the Steam Distribution Agreement say
  about merchant-of-record status and our German VAT position?

---

## Sources

All accessed **2026-07-26**. `[V]` marks Valve's own documentation.

**Valve / Steamworks (primary)**
- [Steam Direct Fee — Steamworks](https://partner.steamgames.com/doc/gettingstarted/appfee) `[V]`
- [Onboarding — Steamworks](https://partner.steamgames.com/doc/gettingstarted/onboarding) `[V]`
- [Reporting and Payments FAQ — Steamworks](https://partner.steamgames.com/doc/finance/payments_salesreporting/faq) `[V]`
- [Taxes FAQ — Steamworks](https://partner.steamgames.com/doc/finance/taxfaq) `[V]` · [German version](https://partner.steamgames.com/doc/finance/taxfaq?l=german)
- [Applications (app types) — Steamworks](https://partner.steamgames.com/doc/store/application) `[V]`
- [Visibility on Steam — Steamworks](https://partner.steamgames.com/doc/marketing/visibility) `[V]`
- [Steam Next Fest — Steamworks](https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest) `[V]`
- [Discounting — Steamworks](https://partner.steamgames.com/doc/marketing/discounts) `[V]`
- [Review Process — Steamworks](https://partner.steamgames.com/doc/store/review_process) `[V]`
- [Age Ratings Mandatory in Germany — Steamworks](https://partner.steamgames.com/doc/gettingstarted/contentsurvey/germany) `[V]`
- [Steam Datagram Relay — Steamworks](https://partner.steamgames.com/doc/features/multiplayer/steamdatagramrelay) `[V]` · [Steam Networking](https://partner.steamgames.com/doc/features/multiplayer/networking) · [Valve Developer Wiki: SDR](https://developer.valvesoftware.com/wiki/Steam_Datagram_Relay)
- [Steam Workshop — Steamworks](https://partner.steamgames.com/doc/features/workshop) `[V]` · [Workshop Implementation Guide](https://partner.steamgames.com/doc/features/workshop/implementation)
- [Steam Cloud — Steamworks](https://partner.steamgames.com/doc/features/cloud) `[V]`
- [Microtransactions (In-Game Purchases) — Steamworks](https://partner.steamgames.com/doc/features/microtransactions) `[V]`
- [Recurring Subscriptions — Steamworks](https://partner.steamgames.com/doc/store/pricing/subscriptions) `[V]` · [Recurring In-Game Billing](https://partner.steamgames.com/doc/features/microtransactions/recurring_billing)
- [Steam Keys — Steamworks](https://partner.steamgames.com/doc/features/keys) `[V]`
- [Pricing — Steamworks](https://partner.steamgames.com/doc/store/pricing) `[V]`
- [Uploading to Steam (SteamPipe) — Steamworks](https://partner.steamgames.com/doc/sdk/uploading) `[V]`
- [New Revenue Share Tiers and other updates to the Steam Distribution Agreement — Steamworks announcement, 2018](https://steamcommunity.com/groups/steamworks/announcements/detail/1697191267930157838) `[V]` *(page body did not render through WebFetch; tiers corroborated by secondary sources below)*
- [Discount Cooldowns Will Be 30 Days — Steamworks announcement](https://steamcommunity.com/groups/steamworks/announcements/detail/3396303599636871315) `[V]`
- [Steam Remote Play](https://store.steampowered.com/remoteplay) `[V]`
- [Steam Workshop — paid content overview](https://steamcommunity.com/workshop/aboutpaidcontent)
- [Steam Store: TaleSpire](https://store.steampowered.com/app/720620/TaleSpire/) `[V, store page]`
- [Steam Store: Dungeon Alchemist](https://store.steampowered.com/app/1588530/Dungeon_Alchemist/) `[V, store page]`
- [Steam Store: Fantasy Grounds Ultimate License bundle](https://store.steampowered.com/bundle/1689/Fantasy_Grounds_Ultimate_License/)

**AI disclosure**
- [Valve tweaks and clarifies AI disclosure rules for Steam — Game Developer, Jan 2026](https://www.gamedeveloper.com/business/valve-tweaks-and-clarifies-ai-disclosure-rules-for-steam)
- [Valve Clarifies Steam's AI Disclosure Rules — BigGo Finance, 17 Jan 2026](https://finance.biggo.com/news/202601171220_Steam_AI_Disclosure_Update_Focuses_on_Player_Content)
- [Steam AI Disclosure Policy Updated: Efficiency Tools Now Exempt — remio.ai](https://www.remio.ai/post/steam-ai-disclosure-policy-updated-efficiency-tools-now-exempt)

**Store rules, UGC, DMCA**
- [Steam rules updated to prohibit content that violates payment-processor rules — Automaton West](https://automaton-media.com/en/news/steam-rules-updated-to-prohibit-content-that-violates-rules-set-forth-by-payment-processors-and-banks/)
- [Steam's Wildly Unclear New Rules On 'Adult Content' — Kotaku](https://kotaku.com/steam-valve-adult-content-sex-games-online-safety-act-1851786391)
- [Games Workshop Removes Certain Tabletop Simulator Materials from Steam — TechRaptor](https://techraptor.net/tabletop/news/games-workshop-removes-certain-tabletop-simulator-materials-from-steam)
- [DMCA abuse on Steam is out of control — Notebookcheck](https://www.notebookcheck.net/DMCA-abuse-on-Steam-is-out-of-control-and-Valve-isn-t-fixing-it.1084373.0.html)
- [Steam Workshop and Copyright (compiled notes)](https://gist.github.com/MangaD/5a6651909e1b2a5a7241ce1661d4bf7f)
- [Content Creators Earn Over $50M Through Steam Workshop — Steam news](https://store.steampowered.com/oldnews/15614)

**Discovery data**
- [Making sense of the February 2026 Steam Next Fest — How To Market A Game](https://howtomarketagame.com/2026/04/13/making-sense-of-the-february-2026-steam-next-fest/)
- [What Steam Next Fest actually does — Voxel Game Discovery](https://voxelgamediscovery.substack.com/p/what-steam-next-fest-actually-does)
- [Who 'won' June 2026's Steam Next Fest — GameDiscoverCo / Simon Carless](https://newsletter.gamediscover.co/p/who-won-june-2026s-steam-next-fest)
- [How Many Wishlists Do You Need to Launch — presskit.gg](https://presskit.gg/field-guides/how-many-wishlists-to-launch)
- [How Many Wishlists Before Launch? Steam Benchmarks 2026 — Steam Page Analyzer](https://www.steampageanalyzer.com/blog/how-many-wishlists-before-launch)
- [Steam Popular Upcoming List: Wishlists Needed to Qualify — Steam Page Analyzer](https://www.steampageanalyzer.com/blog/steam-popular-upcoming-list)
- [Steam Algorithm Decoded: Wishlist Velocity, Popular Upcoming, Discovery Queue in 2026 — StraySpark](https://www.strayspark.studio/blog/steam-algorithm-decoded-wishlists-visibility)
- [How Many Games Release on Steam Per Day? (2026 Data) — Steam Page Analyzer](https://www.steampageanalyzer.com/blog/how-many-games-release-on-steam)
- [The Steam Paradox 2025: Why $16 Billion in Revenue Feels Like a Recession for Indies](https://game-developers.org/steam-paradox-2025-revenue-volume)
- [Steam Statistics 2026 — Axis Intelligence](https://axis-intelligence.com/steam-statistics/) · [Steam Statistics 2026 — SQ Magazine](https://sqmagazine.co.uk/steam-statistics/)

**Economics / fees / comparison**
- [How Much Does Steam Take? Revenue Share & Fees Guide 2026 — Immutable Guides (pub. 7 Jul 2026)](https://www.immutable.com/guides/how-much-does-steam-take)
- [Steam Revenue Share Explained 2026 — Steam Page Analyzer](https://www.steampageanalyzer.com/blog/steam-revenue-share-explained)
- [Steam Revenue Share Explained 2026 — Fungies.io](https://fungies.io/steam-revenue-share-explained/)
- [Valve limits number of default Steam keys to 5,000 per game — Game World Observer](https://gameworldobserver.com/2023/02/28/valve-steam-keys-guidelines-updated-rules)
- [Exploring Valve's Revised Rules For Steam Keys — Xsolla](https://xsolla.com/blog/exploring-valves-revised-rules-for-steam-keys)
- [Paddle vs Stripe vs Merchant of Record in 2026 — Fungies.io](https://fungies.io/paddle-vs-stripe-vs-merchant-of-record-2026/)
- [Stripe vs Paddle: Fees, Tax Handling & MoR Compared — DesignRevision](https://designrevision.com/blog/stripe-vs-paddle)
- [Itch.io vs Steam for Indie Games (2026)](https://generalistprogrammer.com/tutorials/itchio-vs-steam-indie-game-platform-comparison)
- [Verkauf von Spielen auf Steam — Kleinunternehmerregelung (spieleprogrammierer.de)](https://www.spieleprogrammierer.de/17-game-design-und-spieleentwicklung/27557-verkauf-von-spielen-auf-steam-kleinunternehmerregelung/) `[S, forum — treat as a lead for the Steuerberater, not as authority]`
- [Trader Status for Developer: DSA of EU — makaka.org](https://makaka.org/unity-tutorials/trader-status)
- [The EU Digital Services Act for Indie Game Studios — promise.legal](https://blog.promise.legal/eu-digital-services-act-indie-game-studios/)

**Refunds, Families, platform**
- [Everything you need to know about Steam refunds — PC Gamer](https://www.pcgamer.com/steam-refunds/)
- [Indie developer implores Steam to revisit refund policy — Destructoid](https://www.destructoid.com/steam-refund-abuse/)
- [Steam Family Sharing in 2026: New Steam Families System Explained — Marix](https://marix.app/library/faq/steam-family-sharing-rules-2026)
- [Steam's Remote Play Together now works without an account — Engadget](https://www.engadget.com/steam-remote-play-together-account-invite-anyone-175017613.html)
- [Steam Survey for May 2026 — GamingOnLinux](https://www.gamingonlinux.com/2026/06/steam-survey-for-may-2026-is-out-linux-down-at-3-99-percent-but-still-above-macos/) · [Linux Gaming Hits 5.33% (Mar 2026) — Phoronix/WindowsForum](https://www.phoronix.com/news/Steam-Survey-May-2026)

**Comparables**
- [Dungeon Alchemist revenue and stats — games-stats.com](https://games-stats.com/steam/game/dungeon-alchemist/) `[S, estimator — soft]`
- [Aseprite revenue estimate — steam-revenue-calculator.com](https://steam-revenue-calculator.com/app/431730/aseprite) `[S, estimator — very soft]`
- [Wallpaper Engine — SteamSpy](https://steamspy.com/app/431960) `[S]`
- [Foundry VTT FAQ (pricing, one-time $50 licence, players free)](https://foundryvtt.com/article/faq/)
- [Fantasy Grounds Unity — official](https://www.fantasygrounds.com/home/FantasyGroundsUnity.php)
- [Greenworks — Steamworks bindings for Electron/nw.js](https://github.com/tskazinski/electron-react-pixijs-greenworks-boilerplate) · [steam-deploy CI tool](https://github.com/PocketwatchGames/steam-deploy)
