# RB-17 — Das Substrat: how a tabletop platform actually comes to rule

**Brief:** K8/K9 — *"eine Chronicles Platform um die eine platform zu schreiben die jede andere
knechtet."* The ambition is treated as binding. The question asked here is mechanical: **by what
mechanism does a platform in this market come to dominate?** Not "is the ambition too big."

**Method and honesty rules.** Every figure is attributed. Vendor self-reporting is marked as such.
Where a number could not be established the document says **"no reliable figure found"** and moves
on; nothing is estimated into existence. `worldanvil.com` returns 403 to direct fetching
(Cloudflare), so all World Anvil facts here are from search results, third-party comparisons,
Trustpilot and the company's own blog as surfaced by search — never from a page I read directly.

**Does not duplicate:** RB-01 (competitor teardowns), RB-02 (rendering), RB-04 (asset licensing),
RB-05 (competitor maps), RB-07..10 (distribution), RB-11 (the verdict). RB-12 (Fandom wiki import)
and RB-13 (Fandom teardown) are being written concurrently and are deliberately not touched.

**The one-line answer, stated up front so the rest can be checked against it:**

> Nobody in this market rules by feature count. The winners win the *evaluation* with a base
> product that is best-in-class unmodded, and then win the *retention* by becoming the thing other
> people's work is made of — the format, the seam, the registry. **Software acquires; substrate
> defends.** The catastrophic error is doing them in the wrong order, and it is the error a
> substrate thesis invites.

---

## 1. The Foundry mechanism

### 1.1 The shape of the builder — this matters before any of the numbers

Foundry VTT began as one person's project. Andrew Clayton (*Atropos*) started development around
**August 2018**; the first public alphas began in **early 2019** (0.1.5 in February); it remained a
side project through 2019–2020 funded in part by **Patreon**; the first official public release,
**0.6.0, shipped 2020-05-22**, at which point it switched from Patreon-supported releases to a
**one-time purchase**. The launch funded the first two employees within months, and only then did
Atropos go full-time. (Wikipedia / everybodywiki, secondary sources; the timeline is consistent
across both.)

This is the single most relevant precedent in the entire competitive set, because it is **our
shape**: one builder, no studio, no investor, a one-time licence, players free. Everything below
should be read as "what did that one person do that compounded."

### 1.2 The license model, and what it buys

- **$50 USD one-time**, perpetual, all future updates free, no subscription
  (foundryvtt.com/purchase, via RB-01).
- **One licence = one hosted server for unlimited players.** Players never pay.
- Consequence: Foundry's revenue is **per GM**, and every player is a free distribution unit. The
  GM is the buyer; the players are the marketing. This is the model RB-11 already ratified for us,
  and Foundry is the proof it works at scale for a one-time price.

### 1.3 The extension API — what the seam actually is

Foundry's extension seam is not a plugin folder. It is a small number of specific, load-bearing
decisions (foundryvtt.com/article/module-development, foundryvtt.com/api, Foundry Community Wiki):

1. **A manifest, not a build step.** A module is a named subfolder under `{userData}/Data/modules`
   containing `module.json`. The manifest declares `scripts`, `esmodules`, `styles`, `languages`,
   `packs`, `relationships` to other packages, and a `socket` flag. There is no compilation, no
   registration ceremony, no SDK to install. **The cost of authoring a first module is minutes.**
2. **Hooks as the lifecycle.** Modules integrate through a documented `Hooks` system fired at
   defined lifecycle stages, rather than by patching. The API is versioned and published
   (v11/v12/v13/v14 documentation sites are all live simultaneously).
3. **Library modules.** A module can declare `"library": true`, marking it as infrastructure that
   exposes a shared API for *other modules* rather than user-facing features. **This is the detail
   most people miss and it is the ecosystem's actual multiplier**: it lets the ecosystem grow
   layers. Module authors depend on module authors, not only on Foundry. Once that happens the
   ecosystem has its own gravity independent of the vendor.
4. **`relationships` in the manifest.** Dependencies are declarative and machine-readable, which is
   what makes a registry able to resolve and warn rather than merely list.

**Read this as a design spec.** The seam is: a JSON manifest, a documented lifecycle event bus, a
declared dependency graph, and permission for third parties to become infrastructure for each other.

### 1.4 The package registry — and the four and a half years without a store

- **Submission is open to any active licence holder**; modules and systems require **manual review
  and approval** (foundryvtt.com/packages, Publisher Handbook).
- **Discovery lives inside the application.** Packages are browsed and installed from Foundry's own
  setup screen. The registry is not a website you must be persuaded to visit; it is a screen every
  GM already passes through. This is the difference between a registry and a directory.
- **There was no store until 2025-02-12** — the official Foundry VTT Marketplace, operated with
  partner Metamorphic Digital Studio (peginc.com announcement, via RB-01). That is **four years and
  nine months after the 0.6.0 launch, and roughly six years after the first alpha.** By the time the
  store existed the ecosystem was already at thousands of packages.

### 1.5 Creator economics — three channels, and the vendor takes nothing on two of them

The Publisher Handbook and Premium Content article (foundryvtt.com/article/publisher-handbook,
/article/premium-content) describe three parallel channels, and creators may **mix them**:

| Channel | How it works | What Foundry takes |
|---|---|---|
| **Sell it yourself** ("external premium content") | Package listed in the registry with a **"Purchase Here!"** link to *the creator's own website*. Buyer receives a **content activation key** by email; key is entered on their Foundry account; `module.json` carries `"protected": true`. | Nothing stated. The transaction never touches Foundry. |
| **Patreon** | Creator selects which Patreon tiers grant access; supporters link their Patreon account to their Foundry account and entitlements resolve automatically. | Nothing stated. |
| **Official Marketplace** (since 2025-02-12) | Purchases attach to the buyer's Foundry account; no activation codes. | *"the small fee we charge for using our Premium Content System"* — **percentage not published anywhere.** |

**"Self-publishing requires no agreements"** (Publisher Handbook, verbatim in substance). A creator
can list a paid module in Foundry's own registry, take 100 % of the money on their own storefront,
and use Foundry's entitlement infrastructure to deliver it. Foundry built the **plumbing for other
people's businesses** and only years later monetised a fourth, optional channel.

**Scale of the paid ecosystem:** 2,138 of 5,338 approved modules are premium (paid) packages, and
marketplace year one grew products 557 → 1,227 (+120 %), creators 65 → 107, marketplace users
19k → 60k (Foundry *Year in Review 2026* — **vendor self-report**).

### 1.6 Developer relations, and the fact that authors keep their work

- Packages are distributed under the **Foundry Virtual Tabletop Limited License Agreement for
  Module Development** — the licence text is referenced in the LICENSE file of many third-party
  system repositories (e.g. `fvtt-fria-ligan/forbidden-lands-foundry-vtt`), i.e. authors publish
  under their *own* repos, their *own* licences, their *own* names.
- **Non-retroactivity is written in**: modifications of the policy "shall not retroactively alter or
  revoke the rights given under the previous limited license," and existing packages may remain
  published under the terms they were published under (foundryvtt.com/article/license).
  **This is the developer-relations mechanism.** It is not a Discord presence. It is a promise that
  the ground will not move under work already done. An author's investment cannot be
  retroactively devalued by the platform. Nothing else on this list buys as much trust per word.
- Foundry ships an **AI Content Policy** and a **Licensed Content guide** — i.e. it does the legal
  thinking *for* its authors rather than leaving them exposed.
- **Ecosystem transparency as ritual:** the annual "Year in Review" publishes hard package counts,
  system shares, version-adoption percentages and marketplace growth. Publishing numbers that
  include bad ones (V14 adoption 12.92 %) is a trust instrument that costs nothing to operate.

### 1.7 Third parties whose entire business is Foundry-adjacency

- **The Forge** — turnkey Foundry hosting, 50+ server locations, built and operated by *KaKaRoTo*,
  who is simultaneously the author of many free Foundry modules **and** of Beyond20 **and** of the
  Roll20→Foundry converter. One community member became three separate pieces of market
  infrastructure.
- **Molten Hosting**, **FoundryServer.com** — further commercial hosting layered on Foundry.
- **Foundry Hub** (foundryvtt-hub.com) — an independent package index and technical guide.
- Foundry maintains an official **Partnerships** page acknowledging the layer.

A platform has become a substrate when other people's *companies* depend on it. Foundry passed that
line without building any of it.

### 1.8 The load-bearing question: software or ecosystem?

**Evidence that it is the ecosystem:**

1. **The median Foundry install is not Foundry.** Median user runs **19 modules** (Year in Review
   2026, vendor). Whatever the median GM is loyal to, it is not the shipped binary.
2. **System-agnosticism is not a Foundry feature; it is an author output.** **475 approved game
   systems (+30 % YoY)**, of which Foundry itself wrote almost none. D&D 5e is 62.68 % of installs —
   meaning ~37 % of the user base is there for a system a third party wrote for free.
3. **The ecosystem has veto power over the vendor's own releases.** One month after V14 shipped,
   only **1,590 of 5,338 modules** were V14-compatible and **V14 adoption was 12.92 %** (Year in
   Review 2026). Users refused the new software until the ecosystem allowed it. That is the
   definition of the ecosystem being the product: the vendor cannot ship a version its extenders
   have not blessed. Standard community advice — avoid "Update All," run minimal module sets
   (RB-01) — is users managing *the ecosystem*, not the app.
4. **Other companies' revenue depends on it** (§1.7).
5. **The store came last.** Nothing about the marketplace explains a six-year ecosystem that
   predates it.

**Evidence that it is the software:**

1. Reviewers say Foundry "blows away the competition as a battlemap tool" **even unmodded**, and
   call the lighting engine a game-changer (dmsjourney.com, ttrpgstack.com, via RB-01).
2. In year one there was no ecosystem to speak of, and Foundry still converted enough GMs at $50 to
   fund a company — during a pandemic, admittedly, which RB-01 already flags as a tailwind.
3. V14 continues to ship genuinely hard core engineering — Scene Levels, Scene Regions V2, Active
   Effects V2, a particle generator API — that no module could have supplied.

**The verdict, and it is not a fence-sit:**

> **Foundry's dominance was acquired by the software and is defended by the ecosystem.**
> The unmodded battlemap won the evaluation in 2020. The 5,338 modules are why nobody leaves in
> 2026. These are two different mechanisms operating in two different phases, and confusing them is
> the single most expensive mistake available to us.

The corollary is the one that binds our roadmap: **the ecosystem is a retention mechanism, not an
acquisition mechanism.** In year one it cannot help us, because it will not exist. In year three it
is the only thing that makes leaving expensive.

---

## 2. The D&D Beyond mechanism

### 2.1 What happened

- Fandom owned D&D Beyond from **2019**. **Hasbro announced acquisition on 2022-04-13 for
  $146.3 M cash**; transfer to Wizards of the Coast completed **2022-05-18** (Hasbro newsroom,
  GeekWire, Forbes, TechCrunch — the price is a company filing figure, reliable).
- Hasbro's release described "close to **10 million registered users**" (**vendor claim in a
  press release**).
- Note the lineage for RB-13: **the world's largest fan-wiki company built the dominant TTRPG
  digital toolset, and then sold it to the rights holder for $146 M.** Fandom's own wiki platform
  was never the asset. The *licensed rules layer* was.

### 2.2 What owning the rules layer buys

Four things, and they are not features:

1. **The character is the account.** A D&D Beyond character is not a document you made; it is a
   view over *content you bought*. The sheet cannot be exported to a rival because half of it is
   licensed text.
2. **The switching cost is a purchase history, not a workflow.** A user with $400 of digital
   sourcebooks has a switching cost denominated in money, which no competitor's better UI can
   refund. Compare Foundry, where the switching cost is 19 modules — large but replaceable.
3. **The compendium becomes the search default.** Rules lookup is the highest-frequency act in the
   hobby. Owning it means owning the daily habit even on days nobody plays.
4. **It is a legal moat, not an engineering one.** No amount of our work erodes it.

### 2.3 Why we can never have it

Because it is not for sale, and because our own invariants forbid the shortcut. The intake's
invariant is explicit: **no copyrighted rulebook content without licence**. The route the market
opened after the OGL crisis is real but narrow, and it is worth stating precisely because it is our
only legal opening:

- **January 2023:** after the OGL 1.1 backlash, WotC released **SRD 5.1 under CC-BY-4.0** — a
  perpetual, irrevocable, commercially usable licence over a *subset* of the rules.
- **2023:** Paizo + Azora Law published the **ORC License** with an alliance of **1,500+ publishers**;
  Pathfinder moved off the OGL onto ORC. ORC is designed to be system-neutral, perpetual,
  irrevocable, and eventually owned by a non-profit rather than by any publisher.

**What that means for us:** we can never own *the* rules layer, but for the first time in the
hobby's history there is a **legally clean corpus** — SRD 5.1 under CC-BY, plus the entire ORC
ecosystem — that third parties may author against. That is exactly the material a rule-package
format needs, and it did not exist before 2023. It is a genuine, dateable window.

### 2.4 The thing Sigil proved, which is worth more than everything above

Wizards of the Coast owned the rules layer, the brand, ~10 M registered users, and Hasbro's balance
sheet. It built **Sigil**, a 3D VTT.

- Rolled out **February 2025** with essentially no marketing push; beta was feature-thin and
  technically troubled.
- **Less than a month later, ~90 % of the Sigil team was laid off** (reported across GeekNative,
  TechRaptor, Gizmodo, EN World — press reporting, not a company statement).
- Development sunset; **servers shut down 2026-10-31.** Affected Master Tier subscribers get six
  months of complimentary access, applied 2025-11-07.
- The 2D **Maps** VTT continues, and D&D Beyond Maps became free to all users.

> **Owning the rules layer did not let the rights holder win the table layer.** Capital, licence,
> brand and ten million accounts were not a mechanism. This is the strongest single piece of
> evidence in this document that **feature scale and corporate scale are not how this market is
> won**, and it is dated 2025–2026, not 2015.

### 2.5 Beyond20 and AboveVTT — which layer is actually load-bearing

- **D&D Beyond has no public official API.** The community has asked for one on the official forums
  for years ("Public Development API" thread). Nothing shipped.
- **Beyond20** (kakaroto) injects roll buttons into the D&D Beyond character sheet DOM and routes
  the rolls into **Roll20, Foundry VTT and Discord**. It publishes its own Messaging API and DOM API
  so that *other* tools can integrate with the bridge. **Over 300,000 users as of March 2021**
  (extension store figure quoted in the project's own materials; **dated — no current figure
  found**).
- **Avrae** parses publicly accessible character-sheet pages to extract data.
- **AboveVTT** is an entire virtual tabletop layered *on top of* D&D Beyond in a browser extension —
  built, per the project's own description, by essentially one person with community support.

**What this tells us, and it is the most directionally useful finding in this document:**

1. **When a platform refuses a seam, the community carves one anyway.** Demand for an extension
   seam is inelastic. The only question a vendor controls is whether the seam is a documented API or
   a DOM scrape that breaks on every deploy.
2. **The load-bearing layer for players is the character sheet and the rules data — not the map.**
   Hundreds of thousands of players chose to run a fragile browser extension rather than move their
   character to the VTT. They brought the tabletop to their data. **The tabletop was the
   replaceable half.**
3. Three separate community projects (Beyond20, Avrae, AboveVTT) route *around* the map layer to
   reach the *knowledge and character* layer. Nobody built the reverse.

**Consequence for Chronicle, stated plainly.** Project Chronicle's two halves are not
interchangeable in strategic value. The wiki/knowledge/character half is the D&D-Beyond-shaped
half — the one users refuse to leave. The tactical canvas is the Roll20-shaped half — the one the
market has repeatedly demonstrated it will swap. **CHAMPION v5's cut — slice 1 ships no canvas
(§9.1) — is not merely a schedule decision under this analysis; it is the strategically correct
half to ship first.** It looks like a retreat from K5 and it is actually the substrate move. That
does not make §9.6's ruling automatic — Kaya still has to accept a launch that looks like "a wiki
with dice" — but the evidence now points one way rather than none.

---

## 3. Import/export as a weapon

### 3.1 The base case, already ours

**Dungeon Alchemist**: €2.46 M from 57,209 backers, 95/100, single-user, screenshottable, and it
**exports into every rival VTT** (RB-11, figures estimator-grade per RB-11's own caveat). It never
asked anyone to switch. Its addressable market was the *union* of every VTT's user base.

### 3.2 UVTT — the case that matters most, because a solo developer set the standard

- **Universal VTT was created by Megasploot**, the solo developer of **Dungeondraft** and
  **Wonderdraft** (Arkenforge documentation; Dungeondraft encyclopaedia).
- It bundles a map image with structured data: grid dimensions, wall positions, portals, light
  sources — i.e. exactly the data that is *expensive to rebuild by hand* and *cheap to serialise*.
- **`.dd2vtt`, `.df2vtt` and `.uvtt` are the same format**, named after whichever tool wrote it
  (Dungeondraft, DungeonFog, Arkenforge). Competing map tools adopted a competitor's format and
  merely changed the extension.
- **Roll20 accepts all three** and documents it in its official Help Center. **Fantasy Grounds Unity
  v4.4** added native UVTT import.
- **Foundry has no native support.** It arrived through a community module (Universal Battlemap
  Importer). Roll20's own script ecosystem got there via a community `UniversalVTTImporter` script
  before official support existed.
- Dungeondraft additionally ships a **public Modding API** (megasploot.github.io/DungeondraftModdingAPI)
  — the same solo developer also built the extension seam.

> **A one-person tool's export format became the interchange standard of a market in which every
> incumbent is larger, and the largest incumbent got it last, through a third party.**

Why this was available to the smallest player: **incumbents have no incentive to standardise.** A
format that moves data between VTTs is worth less to Roll20 than lock-in is. So the standard-setting
seat is structurally vacant, and it is occupied by whoever ships a format that is *easier to adopt
than to reinvent*. That is a solo-developer-sized act.

### 3.3 Foundry's importers — migration friction is the incumbent's moat, and third parties break it

Roll20 has historically offered no full native campaign export; users have requested it on Roll20's
own forums for years. The community answer is **R20Exporter** (a Chrome extension) plus
**R20Converter** (kakaroto) which converts the dump into a Foundry world or compendium. Known
fidelity problems exist (character JSON dropping during conversion, per The Forge's support forum).

Two lessons, pulling in opposite directions:

- **For us as challenger:** the incumbent's refusal to export is an attack surface, and a
  third-party bridge is *legitimate and normal* in this market. Nobody treated R20Converter as
  hostile.
- **For us as substrate:** the bridge's fidelity problems are the whole story of §3.6. A migration
  that half-works is a migration that failed.

### 3.4 Obsidian — the format *is* the product

- Data is **plain Markdown files in folders**. Obsidian's own About page states it verbatim:
  *"We use simple, open file formats that prevent lock-in and ensure that your data can be preserved
  for generations to come"* and *"100% supported by our users, not investors."*
- **6,068 community plugins and 650 themes** (community-maintained index, github.com/konhi/obsidian-community-list —
  third-party count, not vendor).
- The About page names **9 people** and describes "a small team." (A widely-circulated figure of
  ~$25 M ARR / 1.5 M MAU / 7 people comes from a finance-news aggregator, **not** from Obsidian —
  treated here as **unverified**.)

Obsidian is the closest thing to a proof that **a tiny team can be a substrate**: the anti-lock-in
guarantee is not a concession, it is the marketing, and the plugin count exceeds Foundry's on a
fraction of the headcount. Note carefully *why* it works: Markdown was already universal. Obsidian
did not invent a format; **it declined to.** It made itself the best editor of a format the world
already had, and monetised the two things a file format cannot do — Sync and Publish.

### 3.5 Figma — reading the incumbent's format as a migration ramp

Figma imports `.sketch` natively: artboards → frames, symbols → components, symbol page → a
"Symbols" page of main components (Figma Help Center). The import is explicitly one-way and
snapshot-based — no live link back. It existed to make *leaving Sketch* a five-minute act. This is
the same move as §3.2 pointed at the incumbent rather than at the market.

### 3.6 The counter-case, and it is the one that should scare us: OOXML

LibreOffice and OpenOffice have read `.docx` for roughly two decades. Microsoft still dominates.

- The **OOXML specification is ~6,000 pages**; ODF is ~867 (The Document Foundation / press
  coverage, 2026).
- Fidelity loss on round-trip is persistent and well documented; users routinely lose formatting.
- The Document Foundation's own framing in 2026 is that Microsoft's **file formats keep users on a
  short leash** — i.e. after twenty years of reading the format, the format is still the leash.

**Reading a rival's format is necessary and not sufficient**, and it fails specifically when the
rival owns the format's evolution and has an interest in complexity.

### 3.7 The generalisation — when "we read and write everyone's format" beats "we have a better format"

Import/export wins when **all four** hold:

| Condition | UVTT | Sketch→Figma | .docx→LibreOffice |
|---|---|---|---|
| **(a) The format is simple relative to the value it carries** — a map plus walls and lights is a few hundred lines of JSON | ✅ | ✅ | ❌ 6,000-page spec |
| **(b) The artefact is self-contained** — it does not drag an execution environment with it | ✅ a map is | ✅ a design file is | ❌ a document drags fonts, macros, layout engine |
| **(c) The format's owner cannot or will not break you** | ✅ Megasploot *wanted* adoption | ⚠️ Sketch could not stop it | ❌ Microsoft controls the spec |
| **(d) It removes a one-time cost, not an ongoing one** | ✅ rebuild-the-map is one-time | ✅ migration is one-time | ❌ interop with colleagues is forever |

And the two moves are strategically different, which the brief's framing already implies and this
evidence confirms:

- **Exporting into rivals** is an *acquisition* move. It converts your product from a destination
  into a supplier and makes every rival's install base addressable without asking anyone to switch.
  Cost is low and bounded. **Dungeon Alchemist and UVTT are both this.**
- **Importing from rivals** is a *conversion* move. It is expensive, unbounded, and fails
  catastrophically at partial fidelity. It is worth doing **once, extremely well, at a population
  you have chosen** — not generally.
- **Publishing a format others adopt** is the *moat* move. It is the cheapest of the three and the
  only one that cannot be revoked by a competitor.

---

## 4. The substrate thesis — stated, then attacked

### 4.1 The thesis

> A platform rules not by containing every feature but by **becoming the substrate the others plug
> into and import from** — owning the data, the format and the extension seam.

### 4.2 The strongest case for it

1. **Foundry** built a manifest-based seam, a registry inside its own setup screen, a
   non-retroactive licence so authors keep their work, and three distribution channels of which it
   monetised none for four years and nine months. Result: 5,338 modules, 475 systems, a median
   install of 19 modules, third-party hosting companies, and an ecosystem with **veto power over
   Foundry's own release cadence** (§1.8).
2. **Obsidian** made the file format the product, shipped ~6,068 community plugins' worth of seam,
   and monetised the two services a format cannot provide — with a team of about nine and no
   investors.
3. **UVTT** shows the standard-setting seat is vacant and solo-sized (§3.2).
4. **Dungeondraft's modding API** shows the same solo developer can run both the format and the seam.
5. **Beyond20 / Avrae / AboveVTT** show demand for a seam is inelastic: refuse to provide one and
   the community builds a worse one against your DOM, and hundreds of thousands of users will run it.
6. **Sigil** shows the alternative strategy — own the licence, spend the capital, ship the features —
   failing in public, in 2025, with the strongest hand anyone has ever held (§2.4).

### 4.3 Now the attack

**A-1 — A substrate with no plugins is just an unfinished app, and that is year one by definition.**
This is the thesis's fatal reading. In 2020 Foundry had no ecosystem; it won because the *unmodded*
product beat the field on lighting and battlemaps, and reviewers still say so today. **The ecosystem
was the second-order compounding, not the first-order proposition.** A team that reads Foundry's
2026 numbers and concludes "build the seam" has drawn the wrong lesson from the right data — the
seam did not cause the win, it *preserved* it. If our year one ships a beautiful extension API and a
merely-good base product, we get neither mechanism: no acquisition (base not best-in-class) and no
retention (no ecosystem yet).

**A-2 — Kanka is the counterexample and it must be answered, not dodged.** Kanka is open source
(GPLv3), self-hostable, has a genuine free tier, full data ownership, and claims **400,000+
worldbuilders** (**vendor self-report, on their own comparison page**). It is not the category
leader. World Anvil — closed, subscription, with documented complaints about paywalled private
pages and auto-renewal (Trustpilot, ~3.1/5 per the brief) — is the one everyone names.
**Portability and openness did not acquire.** They are a tiebreaker, not a wedge. People do not
choose a tool because they can leave it; they choose it because of what it does on a Tuesday.

**A-3 — Twenty years of reading the incumbent's format is not a market position** (§3.6).

**A-4 — Our extension seam is structurally weaker than Foundry's, permanently, and by our own
invariant.** Foundry's 5,338 modules run **arbitrary JavaScript**. Our invariant forbids arbitrary
code execution; rule packages are declarative and versioned. That is the right call for security and
for the visual builder — and it means **a declarative seam can host content authors but not
behaviour authors.** There is no declarative equivalent of Midi-QOL. Every behaviour our format
cannot express is a plugin that cannot exist, and the only fix is for *us* to build the primitive
first. **The format's expressiveness becomes a permanent roadmap obligation on the critical path,
forever.** This is the largest hidden cost of the substrate strategy for this specific product and
it is not in any prior RB.

**A-5 — A registry is not an artifact you ship; it is a job you take.** Foundry **manually reviews**
every module and system submission. Add: compatibility policy, breakage management (1,590 of 5,338
after one month), moderation, licence vetting, an AI-content policy, security review of third-party
content. For a solo builder with an AI crew, a registry launched in year one is a support queue that
competes directly with shipping.

**A-6 — A registry outside the app is a directory, nobody visits it.** Foundry's registry works
because it *is* the setup screen. Ours only becomes a substrate if installing a package is a click
inside the product.

**A-7 — The economics do not close in year one.** Under a one-time GM licence with free players,
ecosystem growth generates **no** direct revenue. Foundry ran a huge ecosystem for nearly five years
before monetising any of it, and still does not publish its take. Therefore, for us, the year-1–3
value of any ecosystem work must be **acquisition** or it is zero. That is a hard filter: build only
the ecosystem artefacts that are (i) demoable in a 90-second video and (ii) require our licence to
create.

**A-8 — Substrate strategies are slow, and slow is the one resource a solo builder has least of.**
Foundry: ~6 years from first alpha to the 2026 numbers, with employees from year one of the
commercial launch. Obsidian: nine people. Neither is "one person with an AI crew" at the point where
the ecosystem became the moat. **The thesis is not disproven for a solo builder — UVTT and
Dungeondraft prove the format and the seam are solo-sized — but the *registry* and the *ecosystem*
are not.** The honest split is: **format and seam, yes, alone. Marketplace and moderated registry,
no, not alone, not in year one.**

### 4.4 What survives the attack

The thesis survives in a narrowed, more useful form:

> **A solo builder cannot build an ecosystem in year one, but can build the things an ecosystem
> later attaches to — a published format, an in-app install path, and exports into every rival —
> at a cost of weeks rather than years, and can only do so if the base product independently wins
> its evaluation without a single third-party package installed.**

Substrate is a **second-year weapon built with first-year decisions.** The first-year decisions are
cheap. The first-year *product* is not, and it is what actually sells the licences.

---

## 5. What "knechten" concretely requires — ranked by leverage per unit of work

Ranked by (worth ÷ cost), with the year-one/later boundary made explicit. Costs are order-of-
magnitude engineering estimates for one developer with an AI crew and are marked as estimates; no
prior artifact in the lineage has spiked any of them.

### Rank 1 — Write everyone else's format (export)
- **What:** UVTT out; Foundry-shaped scene/journal JSON; Fantasy Grounds-shaped XML; plain
  HTML/Markdown for the wiki half.
- **Cost (estimate):** UVTT out ~2–4 days (same schema as the importer, and both are small). Foundry
  scene + journal ~1–2 weeks. FG XML ~1 week. Markdown/HTML export ~days.
- **When:** **Launch.** Already ratified by RB-11.
- **Worth:** Highest on this list, and the only mechanism here **already proven by a solo
  developer** (Dungeon Alchemist, §3.1). It converts every rival's user base into our addressable
  market without asking anyone to switch, and it neutralises the strongest objection to buying a new
  tool ("what if it dies").

### Rank 2 — Publish the format, don't merely support one
- **What:** a documented, **versioned** JSON schema for (a) the rule package and (b) the campaign/
  wiki bundle (`.chronicle`), under a permissive licence, with a reference parser in a public repo
  and a stability promise modelled on Foundry's **non-retroactivity clause** (§1.6).
- **Cost (estimate):** near-zero *incremental* if it is written alongside the exporter — days of
  documentation, not weeks of code. Its real cost is **discipline**: a published format cannot be
  casually changed.
- **When:** **Launch, with the exporter.**
- **Worth:** This is the UVTT move and it is the cheapest moat on the list. Megasploot did not lobby
  anyone; he shipped a format that was easier to adopt than to reinvent, and Roll20 now documents it
  officially. A format others adopt cannot be revoked by a competitor and costs one developer almost
  nothing to maintain.

### Rank 3 — The visual rule-builder as the creator on-ramp
- **What:** already ratified as the go-to-market (RB-11 / K2).
- **The substrate reading strengthens it specifically:** Foundry has 475 systems **and system
  creation there is code** — JavaScript + Handlebars + HTML/CSS is the official path, and the only
  no-code option is **Custom System Builder, a community module** by LinkedFluuuush, supported on a
  Discord channel (RB-01; foundryvtt.com/packages/custom-system-builder). **The no-code system-
  authoring surface is the largest unclaimed position in this market, and no incumbent occupies it.**
- **Cost:** large. The rules engine must exist first (intake tension 2 — building the builder before
  the engine is building a facade).
- **When:** end of year one at the earliest, after the engine. The **format** (Rank 2) ships long
  before the **builder**.
- **Worth:** it is the only item on this list that manufactures **authors**, and authors are what a
  registry is later made of. Rank 3 rather than Rank 1 solely because of cost and sequencing.

### Rank 4 — Read one rival's format, at high fidelity, chosen for population
- **What:** one flagship migration. RB-12 is already testing the right one (a real Fandom wiki).
  UVTT *in* is nearly free because it shares a parser with UVTT *out*, so it does not count against
  this budget.
- **Cost:** high and unbounded per target — fidelity is where the days go and where credibility dies
  (§3.6).
- **When:** one target before launch. **Not two.**
- **Worth:** high per target, but do **not** generalise it. Hard rule: **never ship a half-fidelity
  importer.** A bad import burns the single moment a user is willing to move, and it is the one
  moment you do not get twice.

### Rank 5 — A rule-package format others author in (the content channel)
- **What:** the format from Rank 2, plus the legal groundwork so third parties may publish systems
  against it.
- **The window is real and dateable:** SRD 5.1 under **CC-BY-4.0** since January 2023, and **ORC**
  with a 1,500+ publisher alliance (§2.3). A legally clean corpus for third-party system packages
  did not exist before 2023.
- **Cost:** the format design (shared with Rank 2) plus a licensing guide of the kind Foundry writes
  for its authors — days, not weeks, but it needs care.
- **When:** format at launch; the authoring GUI later (Rank 3).
- **Worth:** high, and it is where the ecosystem eventually comes from.

### Rank 6 — Open, portable data with no lock-in as a marketing weapon
- **What:** the claim, made true by Rank 1's work; aimed at World Anvil's documented pain
  (paywalled private pages, auto-renewal complaints, ~3.1/5 Trustpilot) and at Fandom's ownership
  model.
- **Cost:** near-zero if Rank 1 exists. It is a *claim* made true by work already done.
- **When:** launch, in the copy.
- **Worth:** **medium, and lower than it feels — this is where I most disagree with the brief's
  implicit ranking.** Kanka is open source, self-hostable, free and portable, claims 400,000+ users,
  and is not the leader (A-2). Portability closes a deal; it does not open one. Use it as the
  guarantee that removes the last objection, never as the headline.

### Rank 7 — In-app package install (the pre-registry)
- **What:** a `.chronicle-pkg` zip installable from a file **inside the app**, with signature/hash
  verification and a version-compatibility field — no server, no submissions queue, no moderation.
  RB-11's B6 already anticipates exactly this.
- **Cost (estimate):** ~1–2 weeks.
- **When:** year one, late.
- **Worth:** it is the *seam* without the *job* (A-5, A-6). It makes every later registry a
  front-end over an install path that already works, and it lets community packages circulate over
  Discord and itch.io in the meantime — which is precisely how Foundry's ecosystem behaved before
  the registry mattered.

### Rank 8 — Extension API + hosted package registry
- **Cost:** the API is the cheap part; the **registry is a permanent operational job** — manual
  review, compatibility policy, breakage management, moderation, licence and AI-content policy,
  security review of third-party content (A-5).
- **When:** **not year one. Not year two unless the package count would embarrass a rival.**
- **Worth:** high in year three, **negative in year one** — a registry with six packages is
  published evidence against us.

### Rank 9 — The Forge as a separately shippable tool
- **What:** WFC map generator + theme editor + visual rule-builder, kept **separable by
  architecture** (RB-11's ruling), decision to ship separately deferred.
- **Cost now:** architectural discipline only. Cost later: packaging and a store page.
- **Worth:** it is the Dungeon Alchemist *shape* — single-user, screenshottable, exportable,
  sellable without a table — and therefore the largest de-risking move available, because it can
  earn before the VTT half is sessionable. Ranked last **only** because nothing about it should
  change in year one; its value is entirely optionality, and optionality that costs nothing to hold
  should not compete for year-one attention.

---

## 6. The honest sequence — year one if the goal is to eventually rule

### 6.1 What year one is for

**Year one is not for building the substrate. It is for winning the evaluation, and for making the
three substrate decisions that cost weeks instead of years.**

That is the whole lesson of §1.8 and A-1. Foundry's year one was not an ecosystem play; it was
"the unmodded battlemap is better than everything else," and the ecosystem compounded on top of a
product that had already won. Our equivalent sentence has to be true by launch, about one thing, for
one person. CHAMPION v5 already names it: the encyclopaedia minted by play, the roll citable in
2031, per-character projection as the fog itself — for a GM on a Saturday and a player on a Tuesday.

### 6.2 The year-one sequence

1. **Ship one workflow to a quality nobody in the category matches, for a narrow user.**
   (CHAMPION slice 1, "Die Tür": one campaign, one evening, then one week, browser only, no canvas.)
   The §2.5 finding says this is the strategically correct half, not merely the affordable one.
2. **Ship the exports on day one** (Rank 1) — UVTT, Foundry-shaped, FG-shaped, Markdown/HTML.
3. **Publish the format spec on day one, versioned, with a non-retroactivity promise** (Rank 2).
   This is the cheapest ruling-mechanism available and it is available immediately.
4. **Ship exactly one high-fidelity import**, chosen because it moves a population (Rank 4, RB-12).
5. **Spend the year producing artefacts other people can show.** Die offene Tür (CHAMPION §10.11) —
   a public unauthenticated permalink over an existing byte-verified `fremd` projection — is already
   described in the champion as "the cheapest possible go-to-market artefact," and under this
   analysis it is the substrate move in miniature: our data, addressable, on the public web, free,
   with the author's name on it. Every published world is a distribution unit.
6. **Add in-app file-based package install late in the year** (Rank 7) — the seam without the job.
7. **Publish the numbers, ritually, including the bad ones.** Foundry's Year in Review — which
   publishes 12.92 % adoption alongside +38 % module growth — is a trust instrument that costs a
   day a year and that no competitor in this space except Foundry operates.

### 6.3 What year one must refuse — *precisely because* the ambition is large

Each refusal below is a direct consequence of a finding above, not a budget cut.

- **Refuse the hosted registry and the marketplace.** (A-5, A-6, Rank 8.) A registry with six
  packages is evidence against us. Foundry opened its store in year *five*.
- **Refuse the arbitrary-code extension seam.** (A-4.) Once shipped it can never be withdrawn, and
  Athena's invariant dies with it. Design declarative primitives instead — few, and right.
- **Refuse the second import target.** (Rank 4, §3.6.) One, at high fidelity.
- **Refuse feature parity as an axis.** RB-01 already rules the feature war against 5,338 modules
  unwinnable; Sigil (§2.4) shows it is unwinnable even with Hasbro's money.
- **Refuse "no lock-in" as the headline.** (A-2.) It is the guarantee that closes; it is not the
  pitch that opens.
- **Refuse Steam.** Already ratified: gated, not scheduled (RB-11).
- **Refuse a second user archetype.** Foundry won by being unmodded-best for *one* kind of GM.
- **Refuse to ship the visual rule-builder before the rules engine.** (Rank 3, intake tension 2.)
  A builder over a non-existent engine is a facade, and a facade shown to system authors — the exact
  audience our go-to-market depends on — is the one demo we cannot afford to fake.

**And the sharpest refusal, which contains all the others:**

> **Refuse to build the seam before the thing worth plugging into.**

### 6.4 The one thing that would falsify this analysis

If a base product that is *merely good* plus an excellent seam has ever beaten a *category-best*
base product with no seam, in any market, the ordering above is wrong. I could not find such a case
in this market or in the adjacent ones examined here (§3, §4.2). Foundry, Obsidian, Figma and
Dungeon Alchemist all won the product evaluation first. Kanka and LibreOffice had the openness and
lost anyway. That is four for, two against, and zero counterexamples — which is strong but not
proof, and it is the assumption a future round should attack first.

---

## Sources

**Foundry VTT**
- https://foundryvtt.com/article/module-development/ — manifest, `module.json`, scripts/esmodules/styles/packs/relationships/socket, Hooks, `"library": true`
- https://foundryvtt.com/article/system-development/ — system creation is JS + Handlebars + HTML/CSS
- https://foundryvtt.com/api/ — versioned API documentation (v11–v14 live simultaneously)
- https://foundryvtt.com/article/publisher-handbook/ — "self-publishing requires no agreements"; `"protected": true`; *"the small fee we charge for using our Premium Content System"* (percentage **not published**)
- https://foundryvtt.com/article/premium-content/ — three channels; Marketplace launched **Feb 12 2025**; "Purchase Here!" external sales; Patreon tier linking; content activation keys
- https://foundryvtt.com/article/license/ — Limited License Agreement for Module Development; **non-retroactivity** of policy changes
- https://foundryvtt.com/article/ai-policy/, https://foundryvtt.com/article/licensing-guide/ — vendor does the legal thinking for authors
- https://foundryvtt.com/article/partnerships/ — official acknowledgement of the third-party layer
- https://foundryvtt.com/packages/ — submission open to licence holders; manual review and approval
- https://foundryvtt.com/packages/custom-system-builder, https://custom-system-builder.gitlab.io/custom-system-builder/ — the only no-code system path is a **community** module (LinkedFluuuush)
- https://en.wikipedia.org/wiki/Foundry_VTT, https://en.everybodywiki.com/Foundry_Virtual_Tabletop — Atropos solo, Aug 2018 start, alpha 0.1.5 Feb 2019, Patreon, **0.6.0 on 2020-05-22**, first two employees after launch
- https://forums.forge-vtt.com/ , https://moltenhosting.com/ , https://www.foundryvtt-hub.com/ — third-party businesses built on Foundry; The Forge built by KaKaRoTo
- Foundry **Year in Review 2026** (vendor self-report, via RB-01): 5,338 modules (+38 %), 2,138 premium; 475 systems (+30 %); median 19 modules/user; 5e = 62.68 % of installs; **1,590/5,338 V14-compatible after one month, V14 adoption 12.92 %**; marketplace 557→1,227 products, 65→107 creators, 19k→60k users; 110k Discord, 85k subreddit

**D&D Beyond / WotC**
- https://newsroom.hasbro.com/news-releases/news-release-details/hasbro-acquire-dd-beyond-fandom — **$146.3 M cash**, "close to 10 million registered users" (**vendor claim**)
- https://www.geekwire.com/2022/dd-beyond-officially-joins-wizards-of-the-coast-in-146-3m-acquisition/ , https://www.forbes.com/sites/robwieland/2022/04/13/hasbro-acquires-dd-beyond-for-1463-million/ , https://techcrunch.com/2022/04/15/dnd-beyond-wizards-dungeons-and-dragons/ — announced 2022-04-13, transfer 2022-05-18
- https://github.com/kakaroto/Beyond20 , https://beyond20.here-for-more.info/api — DOM injection into D&D Beyond; routes to Roll20/Foundry/Discord; publishes its own Messaging + DOM API; **300,000+ users as of March 2021 (dated)**
- https://www.dndbeyond.com/forums/d-d-beyond-general/d-d-beyond-feedback/62574-public-development-api — long-standing unanswered request for an official API
- AboveVTT — a full VTT layered on D&D Beyond via browser extension, one developer + community
- https://www.geeknative.com/210648/its-official-wizards-of-the-coast-confirms-dds-sigil-vtt-is-shutting-down/ , https://techraptor.net/tabletop/news/wizards-of-coast-closes-doors-on-sigil-dd-beyond-vtt , https://gizmodo.com/dnd-sigil-vtt-canceled-hasbro-wizards-of-the-coast-2000578128 , https://www.enworld.org/threads/wizards-of-the-coast-is-sunsetting-sigils-active-development.712452/ — Sigil beta Feb 2025, ~90 % of team laid off within a month, **servers close 2026-10-31**, Maps VTT continues
- https://www.geekwire.com/2023/after-fan-outcry-wizards-of-the-coast-will-leave-its-original-open-license-in-place/ — OGL crisis; **SRD 5.1 under CC-BY-4.0, January 2023**
- https://paizo.com/orclicense , https://paizo.com/community/blog/v5748dyo6si7v — **ORC License**, Azora Law, **1,500+ publisher alliance**, Pathfinder moved to ORC

**Formats and import/export**
- https://arkenforge.com/universal-vtt-files/ , https://dungeondraft-encyclopaedia.gitbook.io/guide/final-steps/exporting-your-map/universal-vtt — **UVTT created by Megasploot** (Dungeondraft/Wonderdraft); `.dd2vtt`/`.df2vtt`/`.uvtt` are the same format
- https://help.roll20.net/hc/en-us/articles/41643201127831-Universal-Virtual-Tabletop-UVTT-Support — Roll20 officially accepts all three
- https://github.com/Imagix/uvtt2fgu — FGU tooling; FGU v4.4 native UVTT import
- https://wiki.roll20.net/Script:UniversalVTTImporter — community script preceded official support
- https://megasploot.github.io/DungeondraftModdingAPI/ — a solo developer's public modding API
- https://github.com/kakaroto/R20Converter , https://wiki.5e.tools/index.php/Foundry:Converting_from_Roll20 , https://forums.forge-vtt.com/t/importing-a-r20-converted-world/9106 — Roll20→Foundry migration is a third-party act; fidelity problems documented
- https://obsidian.md/about — *"simple, open file formats that prevent lock-in"*, *"100% supported by our users, not investors"*, ~9 named people, "a small team"
- https://github.com/konhi/obsidian-community-list — **6,068 plugins, 650 themes** (third-party index)
- https://help.figma.com/hc/en-us/articles/360040514273-Import-Sketch-files — artboards→frames, symbols→components, one-way snapshot import
- https://www.theregister.com/applications/2026/07/20/the-document-foundation-says-microsofts-file-formats-keep-users-on-a-short-leash/5274960 — OOXML ~6,000 pages vs ODF ~867; formats as "a short leash" after two decades of `.docx` support

**Wiki-side competitors**
- https://kanka.io/kanka-vs-worldanvil , https://kanka.io/ — GPLv3, self-hostable, real free tier, **400,000+ worldbuilders (vendor self-report)**
- https://www.trustpilot.com/review/worldanvil.com , https://www.smartcustomer.com/reviews/worldanvil.com — ~3.1/5; recurring themes: paywalled features, auto-renewal without notice, refunds after escalation
- https://www.legendkeeper.com/best-world-anvil-alternatives/ — competitor framing of World Anvil ("CSS/BBCode coding, banner ads, and a high price tag"); LegendKeeper exports "as a mini-HTML website that's yours"
- World Anvil user count: **conflicting vendor self-reports** — "3,500,000+ users" on the site vs "1.5 million" in an Oct 2025 company blog post. **No independent figure found.**

**Internal**
- `design/research/RB-01-foundry.md` (all Year in Review 2026 figures, review quotes, sentiment)
- `design/research/RB-11-steam-vs-browser-verdict.md` (Dungeon Alchemist €2.46 M / 57,209 backers; B6 `.chronicle` bundle; the creator-channel ruling; export-at-launch)
- `design/iterations/CHAMPION.md` §9.1, §9.6, §10.11, §16
- `design/00-intake.md` (invariants, K2, K4, K5, tension 2, tension 3)

---

## What could not be established

- **Foundry's marketplace revenue-share percentage.** The Publisher Handbook says only *"the small
  fee we charge for using our Premium Content System"* and directs publishers to email. **No
  reliable figure found.**
- **Beyond20's current user count.** 300,000+ is a **March 2021** figure. **No current figure found.**
- **World Anvil's real user count.** Vendor self-reports conflict (3.5 M+ vs 1.5 M). **No
  independent figure found.** Likewise no revenue, subscriber count or team size.
- **Obsidian's revenue and headcount.** The circulating "$25 M ARR / 7 people / 1.5 M MAU" figure is
  from a finance-news aggregator, not from Obsidian. **Treated as unverified.** First-party says only
  "a small team," nine named people, no investors.
- **Kanka's 400,000+** is vendor self-reported on its own comparison page. No independent verification.
- **Foundry's total licences sold or revenue.** **No reliable figure found.**
- **Whether the 2025 marketplace changed module-author *incomes*.** Only one year of product/creator
  counts is published; **no author-income data found.**
- **What share of Foundry users would churn if modules vanished.** The 19-module median supports the
  inference in §1.8 but does not measure it. **No data found.**
- **Any case of a merely-good base product plus an excellent extension seam beating a category-best
  base product with no seam** (§6.4). None found — which supports the ordering here but does not
  prove it.
