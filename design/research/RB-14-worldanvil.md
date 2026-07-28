# RB-14 — World Anvil: the deep teardown

**Status:** research brief, complete · **Compiled:** 2026-07-27 · **For:** design round 5 arena
**Trigger:** Kaya, 2026-07-27, amendments K8/K9 — *"wir wollen halt sein wie WorldAnvil nur besser
größer stärker"* / *"quasi eine marriage aus worldanvil und Foundry/roll20 etc. … eine Chronicles
Platform um die eine platform zu schreiben die jede andere knechtet."*

Five rounds of design named World Anvil in passing (CHAMPION §3.4, §16: *"a six-day product with no
seventh day"*) and never analysed it. This brief closes that gap. It does not tell the stakeholder his
ambition is too big. It establishes what World Anvil actually is, what it costs a GM, where it is weak,
where it is far stronger than this lineage has assumed, and what "besser, größer, stärker" would have to
mean concretely for one builder with an AI crew.

---

## 0. Method and sourcing discipline

**Access constraint.** `worldanvil.com` returns HTTP 403 to direct WebFetch and to curl (Cloudflare).
Their public pages were read through the `r.jina.ai` text proxy, which does fetch them successfully.
Everything sourced that way is marked **[WA-proxy]** and is World Anvil's own public text — i.e. it is
**vendor self-reporting**, with the same evidentiary weight as marketing copy, not more. Pages that are
JavaScript-rendered (the price widget's lifetime tier) do not survive the proxy and are recorded as
*no reliable figure found*.

**Labels used throughout:**

- **[vendor]** — World Anvil's own claim (site, FAQ, blog, knowledge base). Treated as a claim.
- **[third-party]** — independent review, aggregator, panel estimate, or user report.
- **[user]** — a named individual review or forum post. One report is an allegation, not a fact.
- **[inference]** — arithmetic or reasoning *we* performed, with the inputs shown.
- **[no figure]** — could not be established. Not guessed.

**One correction to the brief up front.** The brief states *"Trustpilot ~3.1/5"* and *"they ran
Kickstarters."* Both are shakier than they look:

- The **Trustpilot page itself, retrieved 2026-07-27, shows a TrustScore of 3.8/5** [third-party].
  The figure 3.1/5 traces to `smartcustomer.com`, which computes it from **10 reviews** [third-party] —
  a sample too thin to cite. World Anvil's own FAQ claims *"4.5 Star rating on TrustPilot"* [vendor],
  which does not match the live page either. **Use 3.8, and note that all three numbers disagree.**
  The complaints below are real and recurring; the *rating* is not the evidence — the complaint texts
  are.
- No Kickstarter **for the platform** was found. The Kickstarters run under *The World Anvil
  Publishing* are TTRPG **products** — e.g. *Broken Tales*, €122,128 from 1,900 backers
  [third-party, Kickstarter]. Tracxn lists World Anvil as **unfunded**, no rounds raised
  [third-party]. **World Anvil appears to be a bootstrapped, subscription-funded company that also
  publishes RPG books.** That is a materially different animal from a VC-funded platform, and it
  matters for §8.

---

## 1. What it is, and how big

### 1.1 The facts that hold

| Fact | Value | Label |
|---|---|---|
| Founded | 2017; closed beta 25 Oct 2017 | [third-party, corroborated] |
| Founders | Janet Forbes (CEO, writer), Dimitris Havlidis (CTO, GM) | [third-party + vendor] |
| Entity | World Anvil Ltd., London, United Kingdom | [third-party] |
| Funding | No rounds raised; listed as unfunded | [third-party, Tracxn] |
| Sibling business | *The World Anvil Publishing* — TTRPG books, Kickstarter-funded | [third-party] |
| Mobile app | **None.** Responsive web only. | [vendor, FAQ] |
| Self-description | *"not a virtual tabletop (VTT) or map-making software"* | [vendor, FAQ] |

### 1.2 The figures that do not hold, and what to do about them

**User count — three vendor numbers, all live, all different:**

| Source | Claim |
|---|---|
| worldanvil.com marketing pages | *"3,500,000+ worldbuilders"* [vendor] |
| worldanvil.com FAQ | *"over 3 million users"* [vendor] |
| Grokipedia (cited to WA sources, 2025) | *"over 1,500,000 worldbuilders"* [vendor via third-party] |
| WA blog, May 2018 | *"over 55,000 users and … more than 200,000 articles"* [vendor] |

**Verdict: no reliable figure.** The honest statement for the arena is *"World Anvil claims between
1.5 M and 3.5 M registered accounts depending on which of its own pages you read."* Registered accounts
on a free tier are, in any case, the weakest possible metric.

**Worlds hosted:** *"over 5 million worlds"* attributed to a WA representative in a community comment
about server costs [vendor, uncorroborated, weak]. **Treat as unverified.**

**Revenue:** **no figure found.** No filings surfaced, no disclosures. Do not model it in the arena as
if it were known.

### 1.3 The independent scale signal — and it is the one number in this brief that should change how the
crew thinks

Two commercial traffic panels, and they disagree badly:

| Panel | Period | Monthly visits | Session length | Other |
|---|---|---|---|---|
| Semrush | March 2025 | **3.33 M** | **~12 min** | US, then Germany, then Italy |
| Similarweb | June 2026 | **~1.4 M** | **3 min 42 s** | 4.49 pages/visit, 47.7 % bounce, −4.87 % MoM, global rank #32,863, category rank #16 (Roleplaying Games, US); US 43.4 %, DE 6.3 %, UK 6.1 % |

Both are estimates from different panels with different methodologies, and **the divergence cannot be
resolved from outside** [no figure]. What survives regardless of which is right:

1. **Traffic is 47 % organic search** [Similarweb, third-party]. Nearly half of everyone who arrives at
   World Anvil arrives from Google, at *somebody's world* — not at the marketing site.
2. Even at the pessimistic figure, this is **~1.4 M visits a month to hobbyist encyclopedias**. Foundry,
   Roll20 and Fantasy Grounds are *applications*; almost nobody reads a Foundry journal who is not at
   that table.
3. Germany is World Anvil's #2 or #3 market on both panels. Our stakeholder's market.

**This is the fact CHAMPION §16 does not price.** World Anvil is not primarily a competing feature set.
It is a **publishing destination with an audience arriving by search**. See §5 and §8.13.

---

## 2. The complete feature surface

Organised by what the feature *is for*, with an honest depth rating and the question that matters:
**is this why people stay?**

Depth scale: **thin** (exists, shallow) · **solid** (works, competitive) · **deep** (best-in-class,
years of accretion).

### 2.1 The wiki core — articles, templates, linking

- **28 article templates** [vendor, corroborated by Grokipedia] — Generic, Character, Settlement,
  Species, Item, Geography, Building, Spell, Tradition, Organisation, Ethnicity, Myth, Profession,
  Technology, Vehicle, Condition, Material, Rank, Ritual, Document, Law, Language, Military Formation,
  Landmark, Plot, Prose, Report, Person-of-note (list assembled from search results; the exact 28 were
  not all enumerable through the proxy).
- **Three text editors coexisting**: *Plato* (new WYSIWYG/visual), *Legacy BBCode* (advanced), *Euclid*
  [vendor, features list]. **This is a live wound — see §4.**
- **Autolinker** (Master+), mention system, tagging, Artemis dynamic search, article/world/category
  tables of contents, referenced-in tracking.
- **Custom article templates** — Grandmaster only, authored in **HTML + TWIG** [vendor].

**Depth: deep.** Nine years of template accretion. **Is it why people stay? Partly — but not the way we
assume.** The 28 templates are not a feature list; they are a **curriculum**. A beginner who does not
know what questions to ask about a world is handed the questions. Our lineage has no equivalent, and
CHAMPION §15.9 (*"session one is still empty"*) is exactly the problem World Anvil solved with prompts.

### 2.2 Maps

- Interactive maps with pins, **unlimited layers** (paid), marker groups, journey lines, compass,
  labels, invisible markers.
- **Polygonal and circular markers, custom markers, draggable pins: Grandmaster only** [vendor].
- **You cannot create a map from scratch** — WA is not map-making software; you upload an image
  [vendor FAQ + user review].
- **No fog of war.** WA's documented workaround is a duplicated opaque layer set visible only to
  players — *"you won't be able to move the layer, and layers are not transparent so you'll essentially
  have to duplicate the image"* [third-party guide].
- **No tokens, no token movement, no grid, no measurement, no line of sight.**
- DungeonFog partnership exists for map authoring [third-party].

**Depth: solid as an encyclopedia index, absent as a play surface.** **Is it why people stay?** The
*pin-to-article* map — click a city, read the city — is genuinely good and is one of the two features
reviewers name first. The battle-map half does not exist.

### 2.3 Timelines and Chronicles

- **Timelines**: unlimited events (paid), scalable down to hours and minutes, timescale mode and list
  mode (Feb 2024 overhaul), multiple parallel lanes (4 in Chronicles; Grokipedia cites up to 11).
  **Eras are not supported** [vendor, roadmap item].
- **Chronicles** (2022, **Master+**): timeline × map fusion — scroll the timeline, the map zooms to
  where the event happened; multiple maps across eras show the landscape changing.

**Depth: deep, and unique.** No rival in RB-01/RB-05 has anything comparable. **Is it why people stay?**
For a subset — the historians — yes, decisively. Reviewers call Chronicles *"one of the most interactive
and understandable overview of the game world"* [user, 2023].

### 2.4 Relationship structures

Family trees and bloodlines, diplomacy relation webs (Master+); organisation/content trees
(Journeyman+); variables; rollable and interactive tables.

**Depth: solid.** **Is it why people stay?** No. Nice-to-have depth; nobody's migration is blocked by a
family tree.

### 2.5 Character sheets, statblocks, RPG systems

- **100+ RPG systems** with prebuilt sheets and *"1000s of statblocks"* [vendor] — D&D all editions,
  Pathfinder, Starfinder, Call of Cthulhu, Savage Worlds, GURPS, FATE, Blades in the Dark, VtM,
  Shadowrun, Cyberpunk Red, Star Wars, …
- **Import characters from D&D Beyond** [vendor, free tier].
- **Custom statblock templates require HTML + CSS + TWIG**, and are **Grandmaster-only** (~$99/yr)
  [vendor, explicit: *"a technical advanced feature that involves coding"*].
- Sheets are **display objects, not live play surfaces**: a reviewer running Vampire reports you
  *"cannot use the sheet on the site to keep track of superficial and aggravated damage"* and *"you get
  taken to an editing page and cannot directly edit the display sheet"* [user, 2023].

**Depth: broad but shallow.** **Is it why people stay?** No — and this is the softest large surface in
their product. See §8.7: this is exactly what K2's visual rule-builder is aimed at, and the evidence
that it is a real gap is now on the record.

### 2.6 The campaign manager and the Digital Storyteller Screen (DSTS)

The DSTS is *"World Anvil's all-in-one GMing tool, meant to be used while you're running your session"*
[vendor]. What it contains:

| Panel | What it does | Live to players? |
|---|---|---|
| **Home / party stream** | Text messaging to the group | Yes (text chat) |
| **Dice roller** | System-agnostic notation, modifiers, exploding dice, dice pools, keep/drop; **public dice log** | Yes (a log) |
| **Library** | Searchable articles + statblocks, shortcuts | GM-side |
| **Plot** | The session plan from session setup | GM-side |
| **Party manager** | Character profiles, party summary/sheets, quests with GM-only notes, shared party equipment | Partly |
| **Handout screen** | Push images to players in real time | **Yes** |
| **Media collection** | YouTube / Spotify / SoundCloud links — *"will **not** be streamed to your players"*, plays locally only | **No** |

Plus **Campaign Logging Mode** (track object changes and take notes during play) and **secrets /
spoiler markers** for per-player visibility.

**Not found anywhere:** initiative tracker, HP/condition tracking, combat automation, any tactical
canvas. [no figure — absence of evidence, but the FAQ's own *"not a VTT"* corroborates.]

**Depth: thin-to-solid.** It is a **reference and broadcast screen**, not a table. **Is it why people
stay?** No. See §6 — it is the reason they *leave the tab*.

### 2.7 Secrets and per-player visibility

Secrets and spoiler markers (paid tiers), subscriber containers (Grandmaster), selective visibility
toggles, password-protected articles (Sage), custom access-denied page.

**Depth: solid in reach, presentation-layer in mechanism.** These are BBCode-level containers and
subscriber-group gating over an article that is assembled and then filtered. **Is it why people stay?**
For GMs, yes — secrets are *the* reason a GM upgrades from free. Which is why they are paywalled.

### 2.8 Manuscripts (novel writing)

Master+. Draft text stays linked to world reference entries while you write; export the manuscript
afterwards [third-party]. Free tier got a 1,000-word taste in the April 2024 change.

**Depth: solid, not Scrivener.** **Is it why people stay?** For the author segment, yes — and it is a
segment we should not contest (§8.6).

### 2.9 Whiteboards, discussion boards, Explorer Mode

Master+. Whiteboards are moodboard/visual-organisation canvases; discussion boards are per-world
forums; Explorer Mode is a reader-facing browsing mode.

**Depth: thin.** **Is it why people stay?** No.

### 2.10 Subscribers, monetisation, notifications, community

- **Subscriber groups**, unlimited in number, each with its own secrets; caps by tier (5 / 10 / 100 /
  1000).
- **Patreon / Ko-fi import by email** (Sage), subscriber access codes, custom domain, white-labelling.
- WA positions itself as monetisation-platform-agnostic: *"integrates with ANY monetization platform or
  storefront"* [vendor].
- **Notifications / feeds**: world update **RSS feed** (Journeyman+), **Discord webhooks** on article
  create/major update (Master+), account↔Discord role sync. No push notifications found.
- **Community & discovery (free tier)**: follow creators and worlds, comments, **Featured Content**,
  **Challenges** (Summer Camp in July, WorldEmber in December, plus prep challenges), reading lists,
  browse-by-genre.

**Depth: deep, and strategically the most important block in this section.** **Is it why people stay?
Yes — and this is the answer the crew has been getting wrong.** See §5 and §8.11–§8.13.

### 2.11 The API

- **Boromir (v2)**, superseding Aragorn (v1). *"An API token grants access to your entire world,
  including the ability to create, edit, and delete your content"* [vendor] — i.e. **read/write**.
- **Building an API consumer application is restricted to Grandmaster and above** [vendor].
- A Python client (`pywaclient`) exists on PyPI [third-party].

**Depth: solid.** **Is it why people stay?** No — but it is why they *can* leave (§7).

### 2.12 What World Anvil does not have at all

No mobile app · no VTT · no tokens · no fog of war · no map authoring · no combat automation · no live
shared canvas · no offline mode · no self-hosting · no desktop client · no rules engine (TWIG
expressions in sheets are the closest thing) · no eras on timelines · no import of a foreign wiki.

---

## 3. The business model, in detail

### 3.1 The tiers

Prices as displayed on `worldanvil.com/pricing`, 2026-07-27 [WA-proxy, vendor]:

| Tier | Monthly | Billed annually | Annual total | Storage | Worlds | Campaigns | Co-authors | Subscribers |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Freeman** (free) | — | — | $0 | 100 MB | 2 | 1–2 | 0 | 0 |
| ~~Journeyman~~ | — | — | — | 1 GB | 5 | 5–10 | 2 | 5 |
| **Master** | $5.99 | $4.50/mo | **~$54** | 2 GB | 10 | 10 | 4 | 10 |
| **Grandmaster** | $9.99 | $8.25/mo | **~$99** | 5 GB | ∞ | 20 | 9 | 100 |
| **Sage** | $30.00 | $25.00/mo | **~$300** | 15 GB | ∞ | ∞ | 20 | 1000 |

**Journeyman is deprecated** [vendor, features list marks it so]. The real entry paid tier is **Master**.

**Lifetime memberships** exist for **Grandmaster and Sage only**, one-time payment, *"includes ALL
features that will ever be added to its tier"*, **non-refundable, non-transferable,
non-downgradeable** [vendor]. **Exact prices: no reliable figure** — the price widget is
JavaScript-rendered and does not survive the text proxy. The only pricing statement found is WA's own
blog: *"These memberships are expensive, because we calculate around 5 years of membership time (with a
bit of a discount) into the cost."* [vendor]. **[inference, flagged as inference]** that implies an
order of magnitude around **$400–500 for lifetime Grandmaster and $1,200–1,500 for lifetime Sage**.
Do not quote those as prices.

### 3.2 Exactly which core capabilities sit behind the paywall

The brief asked us to verify that timelines, manuscripts, advanced privacy and subscriber management are
gated. **Verified, and the true list is worse than that:**

| Capability | Free | Gated at |
|---|---|---|
| **Private worlds / private articles** | ✗ | Journeyman → effectively **Master** |
| **Secrets & spoiler markers** | ✗ | Journeyman → effectively **Master** |
| **Timelines** | 2 timelines, 10 events | unlimited at Journeyman/**Master** |
| **Manuscripts** | 1,000 words (since Apr 2024) | **Master** |
| **Chronicles** | 1 map / 10 pins / 10 events | **Master** |
| **Family trees, diplomacy webs, whiteboards, discussion boards, Explorer Mode, rollable tables** | ✗ | **Master** |
| **Full world export (the escape hatch)** | ✗ — articles only | **all paid tiers** |
| **Co-authors** | 0 | Journeyman/**Master** |
| **Subscribers / monetisation** | 0 | Journeyman/**Master**; serious at Grandmaster/Sage |
| **Ad-free for you and your readers** | ✗ (ads shown) | **Master** (self), **Grandmaster** (visitors) |
| **Custom article templates / custom RPG sheets (HTML+TWIG)** | ✗ | **Grandmaster** |
| **API consumer app development** | ✗ | **Grandmaster** |
| **Advanced map markers (polygon/circle/custom/draggable)** | ✗ | **Grandmaster** |
| **Custom domain, white-label, Patreon import, password-protected articles, analytics** | ✗ | **Sage** |
| **Articles** | **42 published + 5 drafts** | unlimited from Journeyman/Master |

The free tier is not a product; it is a demo with a 42-article ceiling and adverts.

### 3.3 The number that matters: what a GM with five players actually pays

**Players pay nothing.** Freeman accounts can *"Join Campaigns"*, *"Play in Sessions"*, create and
interact with RPG characters, follow worlds and comment [vendor, features list]. **World Anvil already
ships our "players always free" promise.** That is not a differentiator for us; it is table stakes.

**The GM:**

| GM configuration | Tier needed | Per year | 5-year total |
|---|---|---:|---:|
| Fully public world, ≤42 articles, **no secrets, no private prep** | Freeman | **$0** | $0 |
| A real campaign: private world, secrets, unlimited articles, 10 campaigns, world export | **Master** | **$54** | **$270** |
| Power GM: homebrew system with custom sheets, API/Foundry tooling, unlimited worlds, no ads for readers | **Grandmaster** | **$99** | **$495** |
| Professional worldbuilder with a paying audience | **Sage** | **$300** | **$1,500** |

**The honest headline: a GM who wants secrets pays. $54/year is the floor, $99/year is the realistic
number for the kind of GM our product is built for.**

### 3.4 Our one-time licence beside that number — stated honestly, including where it flatters us

CHAMPION §14.1: **~€30 one-time, 300 hosted room-hours/year, 5 GB, players always free.**

| | World Anvil (Master) | World Anvil (Grandmaster) | Chronicle |
|---|---:|---:|---:|
| Year 1, GM | $54 | $99 | **~€30 once** |
| Year 5 cumulative | $270 | $495 | **~€30** |
| Year 10 cumulative | $540 | $990 | **~€30** |
| Players | $0 | $0 | **€0** |

**Where this is a real advantage:** by year two the argument is not close, and it compounds. Against
Grandmaster — the tier a system-author needs, which is *exactly* our go-to-market audience per RB-11 —
we are **1/16th of the ten-year cost**. For a channel that runs through creators and system authors, the
comparison *"$99/year forever for the right to write your own sheet in TWIG"* versus *"€30 once, and the
sheet builder is a GUI"* is the single sharpest sentence in this brief.

**Where it flatters us, and the arena must not skip this:**

1. **We are not selling the same thing.** World Anvil's price buys **unmetered public hosting with a CDN,
   SEO indexing and an audience**. Ours buys a licence plus **300 room-hours and 5 GB**. If a Chronicle
   world is to be publicly readable at a URL for ten years, someone pays for ten years of hosting, and a
   one-time €30 does not fund that. **This is an unresolved business-model collision, not a win** — see
   §8.13 and the open decision at the end.
2. **Their allowance never lapses; ours does.** A lapsed WA subscription still lets you *read* your
   private world (§7.4). Our 300 room-hours are annual. Whatever the renewal story is, it is a story.
3. **$54/year is not a lot of money to the buyer.** It is ~$4.50/month. The pricing attack does not win
   on absolute pain; it wins on *"forever"* versus *"once"*, and on the Grandmaster tier where the
   number gets real.

---

## 4. Why users are unhappy — the opening

**Ratings, all three of them, because they disagree:** Trustpilot page as retrieved 2026-07-27:
**TrustScore 3.8/5** [third-party]. WA FAQ claims **4.5** [vendor]. SmartCustomer computes **3.1 from
10 reviews** [third-party, too thin to cite]. **Total review count and star distribution: no figure** —
Trustpilot's distribution widget did not survive the proxy. Trustpilot's own "top mentions" for the
brand are: **Subscription · Refund · Service · Customer communications · Mistake · Website**.

The brief asked us to separate product complaints from company complaints. That separation is the whole
value of this section.

### 4.1 Product complaints — we beat these with craft

| Complaint | Evidence |
|---|---|
| **The editor migration is actively destroying users' work.** WA is rolling out a new visual editor (*Plato*) alongside legacy BBCode. Switching *"basically breaks all BBCode formatting including bullet points, headers, spoiler tags, and old BBCode tables"*; a user with a 150,000-word world reported tables deleted on conversion. **WA's own documentation warns**: *"Switching from the Advanced Editor to the Visual Editor isn't recommended unless you're certain you don't have any advanced or unorthodox BBCode, as you might lose part of your content."* | [vendor docs + third-party + user] |
| **Constant editor-mode churn.** 1★, 2026-02-02: *"The new changes are so annoying to work with that it's not fun at all… switching back and forth between old and new edit view constantly breaks formatting."* | [user, Trustpilot] |
| **Data loss during writing.** 2★, 2025-10-25: *"I've lost track of how many times I've typed out detailed notes, only for an unexpected error to wipe it all out… broken my trust."* | [user, Trustpilot] |
| **Navigation is a nightmare.** 1★, 2026-04-17: *"It was awful. After two months I cancelled my subscription… It was a nightmare to navigate… I can't even begin to describe how let down I was."* | [user, Trustpilot] |
| **Steep learning curve; too many tiers.** Named as the two headline downsides in a long-form review. | [third-party, Kindlepreneur] |
| **No mobile app.** Responsive web only, confirmed by WA. | [vendor] |
| **Dice roller fails on specific systems.** VtM 5e's paired-tens success counting exceeds it; users go back to Discord bots for such systems. | [user, on WA's own blog] |
| **Character sheets are not live.** No damage tracking during play; editing takes you off the display sheet; no specialty-next-to-skill field. | [user, 2023] |
| **Sheet authoring requires HTML + CSS + TWIG**, and only at $99/yr. | [vendor] |

**This is the craft opening, and one item on it is a live, currently-bleeding wound: the editor
migration.** CHAMPION §2's single measured asset is **the editor** — 116 SLOC identity layer,
0.087 ms/keystroke at 300 passages, three fatals found and repaired. The one thing this lineage has
actually measured is the one thing World Anvil is publicly failing at right now. That is not a
coincidence to waste.

### 4.2 Company complaints — a different kind of opening, and not one we beat with features

| Complaint | Evidence |
|---|---|
| **Auto-renewal with no warning, and no refunds.** Recurring across 2025–2026. 2★ 2025-11-16: *"Don't get the ANNUAL subscription… they don't warn you of the renewal charge… they charge you anyway and NO REFUNDS."* 2★ 2026-06-01: cancelled the moment the renewal mail arrived, refused a refund. WA's own checkout terms: *"you will be charged today and continue to be charged for your chosen period until you cancel"* and *"we are unable to offer refunds"*. | [user ×3 + vendor terms] |
| **Introductory rate that renews at roughly double.** | [third-party] |
| **Refunds are discretionary and inconsistent** — some users got partial refunds only after escalating to a supervisor. | [third-party] |
| **Support blamed the user for its own unsent warnings.** 4★ 2025-05-28: the reviewer reports the CTO/founder told them the renewal emails never arrived because *"you had unsubscribed from their marketing emails."* | [user, single, uncorroborated] |
| **The April 2024 free-tier contraction.** Article limit cut **125 → 42**; free drafts to 5; categories to 15; maps to 2; markers to 10; campaigns to 1; URL embeds removed. WA's stated reason, via staff: *"the abuse of the site is indeed one of the factors bringing about these changes."* Existing over-limit free users **can view, export and delete but cannot edit until they are back under the limit.** Community reaction quoted on WA's own blog: *"the 42 article limit is extremely inconvenient… such a drastic change seems unfair."* | [vendor blog + user comments] |
| **"Held my work at ransom."** 2★ 2025-10-04: *"They've essentially held all my hard work… at ransom… can't recommend a service that might hold your work hostage at a moments notice."* This is the April-2024 lock-out mechanism experienced from the inside. | [user] |
| **Community management.** 1★ 2025-07-16: *"World Anvil is NOT the place to do your worldbuilding… support AI generated content, show extreme favoritism… refuse to listen to suggestions, threaten to ban you for constructive criticism."* **Single review, uncorroborated. Record as an allegation, not a finding.** | [user, allegation] |
| **The AI gap.** WA states *"we do not train AI models on your work"* [vendor]. Users' actual grievance is different and WA's statement does not address it: **public worlds are open to third-party AI crawlers**, and users have asked for a "World Anvil users only" privacy option to defend against them. The complaint is not that WA trains on your work; it is that WA's all-or-nothing privacy model leaves published worlds undefended. | [vendor + community suggestions] |

**The strategic read.** Product complaints are beatable with craft and are the right thing to design
against. **The company complaints are a trust opening of a different kind, and they are the ones a
one-time-purchase model answers structurally rather than rhetorically:** there is no auto-renewal to
forget, no renewal mail to miss, no refund to argue about, no tier contraction that can lock you out of
editing your own world. **Our licence model *is* the answer to the top-mentioned Trustpilot terms —
"Subscription", "Refund", "Customer communications" — and we should say so in one sentence and never
say it again.** Attacking a competitor's billing practices is a bad look; shipping the model that makes
the complaint impossible is not.

---

## 5. Why users stay — and this section is the one the crew has been skipping

A better tool is not sufficient. Here is what a World Anvil user would actually lose.

### 5.1 The world is *published*, at a URL, and strangers read it

This is the big one and it is not a feature.

- **47 % of World Anvil's traffic is organic search** [Similarweb], arriving at *user worlds*.
- Even on the pessimistic panel that is **~1.4 M visits a month** to hobbyist encyclopedias; on the
  optimistic one, 3.33 M with a 12-minute session.
- Sage tier sells **custom domains and white-labelling** — WA understands perfectly that its top users'
  worlds are *websites*.

**A World Anvil user with an audience cannot migrate without killing the URL, the backlinks, the search
ranking and the readers.** No feature we ship compensates for that. This is the strongest lock-in in the
entire competitive set — stronger than Foundry's module ecosystem, because a module can be rewritten and
an audience cannot.

### 5.2 The community is a calendar, not a forum

**Summer Camp** (July) and **WorldEmber** (December), plus prep challenges, run annually with prompts,
duels, winners and prizes; plus follows, comments, Featured Content and reading lists — **all on the
free tier**. [vendor; participant statistics: **no figure**, WA does not publish aggregate numbers.]

This is a **deadline that makes people write**, repeated for years. It is why worlds have 150,000 words
in them. It costs almost nothing in engineering and it is the growth mechanism this crew has never
discussed.

### 5.3 The templates are a curriculum

28 templates that ask a beginner the questions they did not know to ask. **This is World Anvil's answer
to cold start — the exact weakness CHAMPION §15.9 carries unresolved into a fifth round.**

### 5.4 Money

For professional worldbuilders, WA is the **delivery layer for a Patreon**: subscriber groups mapped to
Patreon tiers, imported by email, gating secrets and advance chapters. Moving costs income, not just
time. [vendor]

### 5.5 The social cost of a shared world

Master gives 4 co-authors, Grandmaster 9, Sage 20. A migration is not one person's decision.

### 5.6 The export is data, not a world

Export gives JSON + HTML (§7). What does **not** come across: the template rendering, the infoboxes, the
autolinker's cross-links, the map pin bindings, the timeline and Chronicle presentation, the theme, the
subscriber gates, the comments, the followers, the URL. **A World Anvil export is a corpse of a world,
not a world.** RB-12's concurrent work on importing a Fandom wiki is the right shape of answer; this
brief flags that **World Anvil import is a second, equally load-bearing importer**, and it is easier
than Fandom's because the export is already JSON.

### 5.7 The refusal, named plainly

**What makes a World Anvil user refuse to move even to a strictly better tool:** *"my world is at a URL,
people I have never met read it, and I win a badge every December for writing in it."* Depth of features
is not what holds them. **Publication and ritual are.**

---

## 6. Play integration — the seam we attack

**The finding, stated as bluntly as the evidence allows: World Anvil has no live table, and says so
itself.**

### 6.1 Their own words

WA FAQ [vendor]: World Anvil is ***"not a virtual tabletop (VTT) or map-making software."*** A
third-party guide, describing the fog-of-war workaround: *"World Anvil is not designed as a VTT, so the
functionality on this front is limited."*

### 6.2 How thin, precisely

| Play capability | World Anvil |
|---|---|
| Text chat with the party | **Yes** (party stream) |
| Dice roller | **Yes**, system-agnostic notation, **public dice log**; fails on some systems (VtM 5e) |
| Push an image to players | **Yes** (handout screen) |
| Share music/ambience | **No** — media *"will not be streamed to your players"*, plays locally on the GM's machine only |
| Character sheet updated live during play | **No** — no damage tracking; editing leaves the display sheet |
| Tokens on a map | **No** |
| Token movement | **No** |
| Fog of war | **No** — workaround is a duplicated opaque, immovable layer |
| Grid / snapping / measurement / LOS | **No** |
| Initiative tracker, HP, conditions, combat automation | **Not found** [no evidence of existence] |
| Rules engine | **No** — TWIG expressions inside a sheet template is the ceiling |

**So World Anvil's "live play" is: a chat box, a dice log, and a picture frame.** It is a GM reference
screen with a broadcast channel bolted on.

### 6.3 What a World Anvil user actually does when the session starts: they leave the tab

And the evidence for that is **World Anvil's own flagship integration.**

**The Foundry VTT module** (`foundryvtt/world-anvil`, currently maintained by *didialchichi*, v1.5.2,
Foundry v13–14 verified through 14.364) [third-party, Foundry package registry]:

- It imports WA **articles** into Foundry **journals**, categories into folders, timelines linked to
  articles; preserves cross-links; offers a per-article **WA Sync** button.
- **One-way.** Changes in Foundry never push back to World Anvil.
- **GM-only.** *"All functionality of this module is restricted to Gamemaster users only."*
- **World Anvil's permissions do not transfer.** Imported content becomes **private to the GM who
  imported it** — every secret, every player-visibility setting, discarded at the border.
- Requires a **Guild-tier API token** — i.e. you must be a paying World Anvil subscriber to move your
  own content into the place where you play.

**Read what that integration is for.** Its entire purpose is to carry World Anvil's content *out of
World Anvil* into the application where the game actually happens — and it drops the permission model on
the way, because the two products do not share one. **World Anvil concedes, in its own officially
blessed integration, that play happens elsewhere. Foundry concedes, by needing the module at all, that
its journals are not good enough.**

**Other integrations, for completeness:**

- **Roll20: none.** Only community forum feature-requests. [third-party]
- **Discord:** webhooks announcing article creation/updates to a channel; account↔Discord role sync for
  Guild members; an old *Forgemaster* bot limited to WA's own server. **Announcement, not play.**
- **DungeonFog:** a map-authoring partnership. Not play.

### 6.4 What this means for Chronicle — and one warning

**This is the exact seam the product claims, and it is real.** World Anvil cannot close it without
becoming a different company: building a VTT means a canvas, a rules engine, real-time state, tokens,
fog and a networking model — the ~120 days CHAMPION §9.5 prices for us is *years* for a company whose
entire codebase is a PHP/TWIG-flavoured publishing platform with no game engine in it. And they have
publicly positioned *against* it for nine years.

**The warning attached to that opening, and it is not small:** the seam is symmetric. **Foundry cannot
build World Anvil's wiki either** — and yet the module exists, and it is *good enough*. A GM who runs
Foundry with the WA module today has, in practice, ~80 % of Chronicle's fusion at a cost of $99/yr
(Grandmaster) + $50 once (Foundry). The 20 % she does not have is precisely CHAMPION's thesis —
**per-character projection, the citable die roll, the mint, provenance, the seventh day** — none of which
she currently knows she wants. **Our fusion claim is not "nobody has connected these two things." It is
"the connection that exists is one-way, GM-only, permission-destroying and manual."** That is a true
sentence and a much narrower one. §3.1's flex must be demonstrated against *the module*, not against a
strawman where nothing connects.

---

## 7. Export and lock-in

### 7.1 Can a user leave with their world?

**Partly, and only if they pay.**

| | Free (Freeman) | Any paid Guild tier |
|---|---|---|
| Export a single article (PDF/print) | ✓ | ✓ |
| **Advanced world export (zip)** | **✗** | ✓ (requires a **User API Token**) |

Confirmed in WA's own export guide [WA-proxy, vendor] and FAQ (*"Guild members can export articles and
entire worlds. Free members can only export individual articles."*).

**The ugliest single fact in this brief: on World Anvil, you must be a paying customer to leave with
your world.**

### 7.2 What format, and how usable

- A **structured zip archive** containing *"all the metadata and contents of the world serialized in
  JSON format, as well as in a basic HTML format (which is human-readable)"* [vendor], with folders for
  articles, images and maps.
- Community tooling exists and works: **`WorldAnvil-to-MD`** parses the export into Obsidian-ready
  markdown with frontmatter, wiki-links, template rendering and image download [third-party, GitHub].
  **That is real, functioning escape infrastructure** — and it points at Obsidian, our nearest wiki
  rival.
- **Caveat from a community source:** *"the backup is not meant for anything but restoring on World
  Anvil."*
- **Whether maps, timelines, Chronicles, manuscripts, campaigns, statblocks, secrets and subscriber
  gates are included in the export: not stated by WA and not established here. [no figure.]** The
  export guide is silent. **This is a concrete follow-up: obtain a real World Anvil export and diff it.
  RB-12 is already building exactly this muscle for Fandom.**

### 7.3 Is the API read/write?

**Yes.** Boromir v2; *"An API token grants access to your entire world, including the ability to create,
edit, and delete your content"* [vendor]. **But developing an API consumer application is restricted to
Grandmaster and above** — $99/yr for the right to automate against your own data.

**For us this is a gift twice over:** a read/write JSON API means **a World Anvil importer is
buildable** (unlike Fandom, where RB-13's teardown is fighting HTML), and the fact that it is
paywalled is a sentence in our launch copy.

### 7.4 What happens when a subscription lapses

[vendor, FAQ + April 2024 blog; contested by users]

- Private content **remains visible/readable**. It does **not** become editable — you must make it
  public or renew.
- Downgrades apply at the end of the paid term.
- If you fall below a tier's limits (or the limits move under you, as in April 2024): **view, export and
  delete yes; edit no**, until you are back under the cap.
- **Contested in the wild:** at least one user reports being unable to make a world public after
  membership ended, i.e. unable to take the documented escape route. [user, uncorroborated]

**Judgement.** The lock-in is **moderate on data and severe on presentation and audience.** They do not
hold your text hostage. They hold your *world* — its rendering, its links, its readers and its URL —
and they hold your **edit key** the moment you stop paying. The felt experience of that, in users' own
words, is *"held my hard work at ransom"* — and the correct competitive response is not to sneer at it
but to make our own lapse behaviour boringly humane and to say so on the pricing page.

---

## 8. "Besser, größer, stärker" — made concrete

The stakeholder's sentence, turned into the table the design arena will use. **"Besser"** = same
capability, better executed. **"Größer"** = the capability made structurally larger by our fusion.
**Verdict** = what one builder with an AI crew should actually do.

Verdicts: **BEAT** (attack directly, we win) · **MATCH** (parity is required, do it cheaply) ·
**FUSE** (their capability becomes something else in our product) · **DO NOT** (concede, with a reason).

| # | World Anvil capability | How deep, really | "Besser" for us | "Größer" for us | **Verdict** |
|---|---|---|---|---|---|
| 8.1 | **28 article templates** | deep — a curriculum, not a list | Templates whose fields are **minted by play** with per-paragraph provenance, not typed into a form | The template becomes a *mint target*: a red link is a door (§3.4) | **FUSE.** Ship ~8 templates, not 28. Counting is a losing war; **the cold-start prompting is the part to steal** (§5.3, CHAMPION §15.9) |
| 8.2 | **Editor (3 coexisting, migration breaking user content)** | solid, currently failing | Our measured editor: 116 SLOC identity layer, 0.087 ms/keystroke at 300 passages (CHAMPION §2), **one** editor, no BBCode legacy | Passage identity means a paragraph survives a rewrite as an addressable atom — theirs cannot | **BEAT.** The single most attackable live wound. Their own docs warn you may lose content switching editors |
| 8.3 | **Interactive maps: pins, layers, journey lines** | solid as an index, **absent as play** | Same pin-to-article index, plus a real canvas, tokens, per-character fog as projection, UVTT round-trip | Fog opens *because knowledge opened* — one control, not two (CHAMPION §4.6) | **BEAT** — but note this is CHAMPION §15.1's unspiked ~120 days. **The claim is not free** |
| 8.4 | **Timelines + Chronicles (map × time)** | **deep, and unique in the market** | A timeline **computed from mint dates** — which they structurally cannot do, because nothing on WA has a provenance date | Die Herkunftsschicht *is* a timeline, per paragraph, already in the product | **DO NOT match Chronicles.** 4+ years of polish, off our critical path. Ship the computed timeline instead and refuse the comparison |
| 8.5 | **Family trees, diplomacy webs, org trees** | solid, decorative | — | — | **DO NOT.** High build cost, zero fusion value, blocks nobody's migration |
| 8.6 | **Manuscripts / novel writing** | solid, not Scrivener | — | — | **DO NOT.** CHAMPION §15.4 already concedes the long-form writer. WA owns the author segment; contesting it splits one builder across two markets |
| 8.7 | **Character sheets & statblocks (100+ systems); custom sheets = HTML + CSS + TWIG, Grandmaster-only** | **broad but shallow; not live in play** | **K2's visual rule-builder**: no HTML, no TWIG, no $99 tier, live per-actor preview (die Testtafel) | Sheets that are *play surfaces* — HP, conditions, damage, all live — which theirs explicitly are not | **BEAT, and this is the go-to-market.** RB-11 ratified the rule-builder as the channel; this brief supplies the proof that the gap is real and priced at $99/yr |
| 8.8 | **DSTS: party chat, public dice log, handout screen** | thin — a reference screen with a broadcast channel | Their die roll is a chat line that scrolls away; ours is **a durable citable object that mints an encyclopedia paragraph** and replays byte-identically (Nachrechnen, §4.11) | Not "better dice" — a different category of object | **FUSE.** This is the thesis. Demonstrate it against the Foundry+WA module stack, not against WA alone (§6.4) |
| 8.9 | **Secrets & per-player visibility** | solid reach, **presentation-layer mechanism** (BBCode containers, subscriber groups) | `Sicht` + Grenze B9: unheld bytes never leave the server; der Zwillingsbeweis proves it | Per-character projection is the *substrate*, not a filter | **BEAT structurally — but do not market it yet.** `Sicht` is grafted, unbuilt and unmeasured for a **fourth** round (CHAMPION §15.10). Run S-P1 before this claim is spoken aloud |
| 8.10 | **Subscribers, Patreon import, monetisation** | deep; this is their actual business | — | The GM's world becomes sellable as **die Ausgabe** (§10.9) — a week, not a wiki | **DO NOT in slice 1–2**, but understand it: **turning worldbuilders into publishers with paying audiences is the mechanism by which World Anvil became a destination.** Our creator channel needs an equivalent eventually |
| 8.11 | **Challenges: Summer Camp, WorldEmber, Featured Content, follows** | **deep, and nearly free in engineering** | — | **A recurring deadline that makes people write.** Costs a calendar, a prompt list and a badge table | **MATCH, early and cheaply.** This is the highest ratio of growth to engineering days in the entire competitive set, and it is absent from every round of this lineage |
| 8.12 | **API (read/write), Grandmaster-gated** | solid | Ours free with the licence | Their read/write JSON API means **a World Anvil importer is buildable** — much easier than Fandom | **BEAT trivially.** And build the importer: §5.6 |
| 8.13 | **Published, SEO-indexed public world at a URL, ~1.4–3.3 M visits/month** | **deep — the strongest lock-in in the market** | §10.11 *die offene Tür* generalised from one article to a whole world | A public world whose footnotes are die rolls with dates — a *readable artefact* no rival can produce | **MATCH — and this is the one we are most likely to get wrong.** See the warning below. It collides head-on with the one-time-licence model and needs a ruling, not a feature |
| 8.14 | **Ads on free worlds** | — | — | — | **DO NOT copy.** "Players always free, no ads" is a cleaner promise and costs nothing to keep |
| 8.15 | **Mobile: no app, responsive only** | absent | CHAMPION §3.4's flex **is a phone flex** — a Tuesday, a train, a door | A phone that *plays*, not a phone that reads | **BEAT.** Cheap parity-plus on a surface they have never had |
| 8.16 | **Subscription billing (auto-renew, no refunds, tier contraction)** | their trust liability | One-time licence: no renewal to forget, no refund to argue, no cap that can move under you | Humane, documented lapse behaviour on the pricing page | **BEAT structurally.** Say it once, in the model, not in the marketing |

### 8.17 The three sentences the arena should take from this table

1. **Attack the seam, not the surface.** World Anvil is a publishing platform that has said for nine
   years it is not a VTT. Do not out-feature the wiki; **out-*fuse* it.**
2. **The rule-builder is confirmed as the wedge.** Custom sheets on World Anvil cost HTML + CSS + TWIG
   *and* $99/year. That is a documented, quotable, verifiable gap aimed exactly at the audience RB-11
   ratified as our channel.
3. **Do not try to be bigger at what makes them big.** Their size comes from *publication and ritual* —
   indexed public worlds and an annual writing calendar — not from feature count. **Those two things are
   cheap to build and expensive to ignore, and this lineage has ignored both for five rounds.**

### 8.18 The open decision this brief forces

**Public worlds vs. the one-time licence.** §8.13 is a required capability and CHAMPION §14.1 does not
fund it. A €30 one-time licence cannot pay for a decade of SEO-indexed public hosting for an arbitrary
number of worlds. Three honest options, none chosen here:

- **(a)** Public worlds are **self-hosted** (Electron + the reachability problem RB-11 left explicitly
  unsolved — *"choosing a channel does not choose a solution"*).
- **(b)** A separate, small **hosting SKU** for published worlds — which reintroduces a subscription
  and blunts §8.16.
- **(c)** Public worlds are **capped by the Raumuhr allowance** and degrade honestly when exhausted —
  consistent with §14.1's existing degradation discipline, and the only option that costs nothing new.

**Logged for `OPEN-DECISIONS.md`. Kaya must rule.**

---

## 9. What could not be established

Recorded so no future round launders an absence into a fact:

1. **Exact lifetime membership prices** (JS-rendered). Only WA's statement that they cost *"around 5
   years of membership… with a bit of a discount."*
2. **Team size.** Third-party aggregators give **8, 15 and 17** employees. All unreliable.
3. **Revenue.** No figure of any kind.
4. **Total worlds hosted.** Only *"over 5 million worlds"* from a WA staff comment in a community thread.
5. **Registered users.** Three conflicting vendor figures: 1.5 M / 3 M / 3.5 M.
6. **Traffic.** Semrush 3.33 M (Mar 2025) vs Similarweb ~1.4 M (Jun 2026). Irreconcilable from outside;
   both are panel estimates.
7. **Trustpilot review count and star distribution.**
8. **Whether the world export includes maps, timelines, Chronicles, manuscripts, campaigns, statblocks
   and permissions.** WA's own export guide is silent. **Obtain a real export and diff it.**
9. **Whether the DSTS has any initiative/HP/condition tracking.** No documentation found; absence of
   evidence only, though the FAQ's *"not a VTT"* corroborates.
10. **Challenge participation figures** (Summer Camp / WorldEmber). WA does not publish them.
11. **Whether World Anvil ever raised money for the platform.** Only product Kickstarters under *The
    World Anvil Publishing* were found; Tracxn lists the company as unfunded.

---

## 10. Sources

**World Anvil's own pages, read via the `r.jina.ai` text proxy (vendor self-reporting):**
[pricing](https://www.worldanvil.com/pricing) ·
[features by guild level](https://www.worldanvil.com/learn/account/list-features) ·
[Codex features list](https://www.worldanvil.com/w/WorldAnvilCodex/a/list-features) ·
[FAQ](https://www.worldanvil.com/faq) ·
[RPG gamemaster](https://www.worldanvil.com/rpg-gamemaster) ·
[Digital Storyteller Screen guide](https://www.worldanvil.com/learn/rpg/dsts) ·
[world export guide](https://www.worldanvil.com/learn/world/export) ·
[API v2 Boromir docs](https://www.worldanvil.com/api/external/boromir/documentation) ·
[blog: new dice roller](https://blog.worldanvil.com/announcements/boost-your-games-with-the-new-dice-roller/) ·
[blog: lifetime memberships](https://blog.worldanvil.com/announcements/world-anvil-lifetime-sage-membership-lt-grandmaster-now-available/) ·
[blog: free account changes, Apr 2024](https://blog.worldanvil.com/announcements/update-free-account-changes/) ·
[blog: new visual text editor](https://blog.worldanvil.com/announcements/a-new-visual-text-editor-rolling-out-on-world-anvil/)

**Independent / third-party:**
[Trustpilot](https://www.trustpilot.com/review/worldanvil.com) ·
[Similarweb](https://www.similarweb.com/website/worldanvil.com/) ·
[Semrush](https://ja.semrush.com/website/worldanvil.com/overview) ·
[Tracxn company profile](https://tracxn.com/d/companies/world-anvil/__o2wnIpwqT81OG4AoPIFv2EyAiYO9ARu0MbIaAOzTrWc) ·
[Grokipedia: World Anvil](https://grokipedia.com/page/World_Anvil) ·
[Foundry VTT — World Anvil Integration package](https://foundryvtt.com/packages/world-anvil) ·
[GitHub: foundryvtt/world-anvil](https://github.com/foundryvtt/world-anvil) ·
[GitHub: WorldAnvil-to-MD](https://github.com/RHeynsZa/WorldAnvil-to-MD) ·
[Kindlepreneur review](https://kindlepreneur.com/world-anvil/) ·
[Medium: "Let's Talk About: World Anvil" (2023)](https://medium.com/@lazytoaster/lets-talk-about-world-anvil-63be5c62b0b6) ·
[Cannibal Halfling: System Split — Campaign Managers](https://cannibalhalflinggaming.com/2023/03/29/system-split-campaign-managers/) ·
[DungeonFog × World Anvil](https://www.dungeonfog.com/world-anvil/) ·
[Kickstarter: Broken Tales (The World Anvil Publishing)](https://www.kickstarter.com/projects/theworldanvil/broken-tales) ·
[SmartCustomer aggregate (cited only to be discounted)](https://www.smartcustomer.com/reviews/worldanvil.com)

---

*RB-14. The benchmark, measured. They are not a better wiki than us and they will not become a virtual
tabletop. But they are a place people go, and a calendar people keep, and neither of those is a feature
we can out-build — which means the platform that rules them all has to be a place before it is a
product.*
