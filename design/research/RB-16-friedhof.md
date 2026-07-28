# RB-16 — Der Friedhof

**The graveyard of all-in-one tabletop platforms: who tried, what it cost, and what killed them.**

Compiled 2026-07-27. Historian's brief. Companion to RB-01 (competitor teardowns), RB-05 (competitor
maps), RB-07..RB-11 (distribution). This file deliberately does **not** re-derive survivor facts that
RB-01 already establishes; it cites them.

**Method and its limits.** Everything below is attributed. Vendor self-reporting is marked as such.
Where a figure could not be established from a source I could reach, the file says **"no reliable
figure found"** and moves on — there are eleven such gaps and they are listed in §7. `worldanvil.com`
returns 403 to direct fetches (Cloudflare); World Anvil facts therefore come from search results,
Trustpilot aggregators, and third-party company databases, never from the vendor's own live pages.
Company-database figures (Tracxn, Crunchbase, PitchBook, RocketReach) are third-party estimates, not
audited filings, and are marked. **Three cases in the brief's candidate list turned out to be alive
and are corrected here rather than eulogised** (Shard Tabletop, Myth-Weavers, MapTool).

---

## 0. The headline finding, before the evidence

Across nineteen platform-scale attempts, **capital is not the constraint and never was.**

| Attempt | Money / brand behind it | Outcome |
|---|---|---|
| Sigil (WotC/Hasbro) | Unreal Engine 5 + a **$146.3 M** platform acquisition + the D&D brand | ~90 % of team laid off 3 weeks after launch; discontinued |
| One More Multiverse | **$17.6 M** raised; Twitch/Crunchyroll/Oculus co-founders as angels | Shut down May 2024 |
| Quest Portal | **$13.7 M** raised | Alive, but pivoted into an AI assistant + credits |
| DungeonScape | The official D&D 5e digital licence | Killed by a licence dispute; the company closed |
| Astral TableTop | Owned by DriveThruRPG's parent | Shut down 2022 |
| **Foundry VTT** | **$0 outside investment**, one dissatisfied GM, a Patreon | ~9 employees; the #1 or #2 position in the market |

Wizards of the Coast — the richest actor in this hobby, holding the brand every one of these products
orbits — has now **failed at this three times in eighteen years**: the D&D Insider Virtual Game Table
(promised 2008, killed 2012), DungeonScape (2014), and Sigil (2022–2025). Two of those failures came
*after* they owned the distribution platform. If money and brand were sufficient, Sigil would be the
product this crew is competing against instead of a case study.

What that means for Project Chronicle is stated precisely in §5 and §6, and it is not "the ambition is
too big."

---

## 1. The dead and the dying

Ordered by how much the case teaches us, not chronologically.

### 1.1 Sigil — Wizards of the Coast / Hasbro (announced Aug 2022, EA Feb 2025, dead Oct 2025)

**Promised:** a fully 3D virtual tabletop built in **Unreal Engine 5**, integrated with D&D Beyond —
the official, first-party, brand-backed all-in-one for the world's largest RPG.

**How far it got:** announced August 2022 (PC Gamer confirmed the UE5 build); over two years of public
teasing; early access launched 26 February 2025, free to download with paid tiers.

**What it cost:** the exact budget has never been publicly acknowledged. What *is* public: Hasbro
acquired D&D Beyond from Fandom for **$146.3 M** in April 2022 (Hasbro investor release; GeekWire;
Forbes), a platform with "more than 10 million registered users," explicitly to "strengthen Hasbro's
capabilities in the fast-growing digital tabletop category." Sigil was the flagship of that strategy.

**What stopped it:** three weeks after launch, WotC laid off roughly **90 % of the Sigil team — about
30 people**, including senior writer Andy Collins, a VFX artist, and the community manager (GeekWire;
Engadget; Gizmodo). PC Gamer's reporting names the mechanism in the headline: *"Hasbro pushed Sigil out
of the nest" — the layoffs happened because the "distinct monetization path" for Sigil never
materialized.* Community reception was lukewarm: technical problems, thin feature set, and hardware
demands that required a high-end gaming PC (TechRaptor; dungeonsanddragonsfan.com). Officially
discontinued October 2025; **servers scheduled off at the end of October 2026**, with six months of
complimentary Master Tier for anyone who had accessed it.

> **The lesson is not "3D is hard."** It is that a beautiful, brand-backed, engine-class VTT still has
> to answer *what does a table pay for, and how often*. Sigil could not. Compare RB-11's ruling that no
> game engine has a rich-text editing control: Sigil is the empirical proof that the engine path also
> fails on the business side, not only the text-editing side.

### 1.2 One More Multiverse (2020 – May 2024) — the most expensive death in the graveyard

**Promised:** a "hybrid digital tabletop," video-game-inspired, thousands of retro pixel-art assets,
build-your-own "verses," aggressively accessible design.

**How far it got:** launched 2020; a real, shipped, well-liked product with a distinctive look.

**What it cost:** **$17.6 M across two rounds** — a $17.5 M Series A (Game Developer; AccessNewswire;
GameRant; Crunchbase/Tracxn) from **Anthos Capital and Makers Fund**, with angels including Twitch
co-founder Kevin Lin, Crunchyroll co-founder Kun Gao, and Oculus co-founder Nate Mitchell. Team of
about five (TechRaptor).

**What stopped it, in their own framing:** announced 14 May 2024, 90-day wind-down, severance and
healthcare extensions for staff. The reason given was that the platform **"isn't sustainable to run"**
— infrastructure cost, not lack of users or lack of money.

**The number that should be pinned to our wall.** Dice Monkey's post-mortem does the arithmetic: *"just
to use the realtime firebase as a service would cost $5 a person"* — a six-player table therefore
costs on the order of $30/month in realtime infrastructure alone, against a business model whose
revenue event was an optional **~$30 one-off game purchase**. The analysis concludes OMM "probably
didn't have a shot" regardless of the raise, and adds a second cause: building environments was "a lot
more complicated than it is in other VTTs" — breadth that raised the onboarding cost.

> **$17.6 M could not outrun a per-seat realtime bill.** This is the single most decision-relevant fact
> in the file for a product selling a **one-time licence** and promising a **seventh day** of always-on
> availability. See §5, risk R1.

### 1.3 Let's Role (Kickstarter Feb 2021 – development ceased 13 Nov 2023)

**Promised:** an immersive, easy-to-use VTT with a creator store; funded on Kickstarter February 2021.

**How far it got:** beta early 2022; a Play Pass subscription in autumn 2022; a stable 1.0 in September
2023. Real product, real community, growing revenue.

**What stopped it — quoted verbatim from the founder's announcement** (via the EN World thread carrying
the full text; original at tabletopmarketplaces.substack.com, partly paywalled):

> *"To protect Let's Role, as the company's sole employee, my salary has been very low for the past 2
> years or non-existent for almost the whole of 2023. And I've reached the end of my personal
> resources."*

> *"Our visits are increasing, and so are revenues, but we're still a long way from our objectives."*

Store sales were disappointing from launch. The founder had assumed low store sales were a Kickstarter
artefact (backers already owned content) that would resolve as the community grew. **It did not.** The
Play Pass "succeeds in convincing part of the community" but fell far short. The site stays online;
only development stopped.

> This is the closest business-shape analogue to Project Chronicle's builder: **one person, a creator
> store, a growing but insufficient revenue line, and a personal runway that ran out before the curve
> did.** Not a failure of talent or of product. A failure of the gap between "revenue is growing" and
> "revenue pays a salary."

### 1.4 Astral TableTop (halted 19 Oct 2021, shut down 30 Aug 2022)

**Promised:** a polished browser VTT with a content marketplace, partnered with DriveThruRPG.

**How far it got:** shipped, grew, partnered with **OneBookShelf** (DriveThruRPG's parent) in 2019,
which took over operations. Per Tracxn, **Astral raised no venture funding** — its capital was the
partner's balance sheet.

**What stopped it:** announced 19 October 2021 (geeknative; Tenkar's Tavern). Founder **Tom Lackemann**
retired to pursue other ventures; the stated reason was that *"even with the growth that Astral has
experienced, it has not attracted an audience large enough to be a thriving business,"* plus an
intensifying competitive landscape. The marketplace closed; yearly subscriptions were replaced with
cheaper monthly ones and prepaid balances converted to credit. OneBookShelf inherited the decision.
**In July 2022 OneBookShelf merged with Roll20** (geeknative; Roll20 blog; Gizmodo) — and on
**30 August 2022 Astral was shut down permanently**. The community tried to raise funds to buy it; that
went nowhere (Arkenforge's farewell post).

> Two mechanisms in one case: **founder exit with no succession**, and **acquisition-as-euthanasia** —
> the acquirer merged with the market leader, and the redundant asset died eight months later.

### 1.5 DungeonScape / Codename: Morningstar — Trapdoor Technologies (2014–2015)

**Promised:** the *official* digital toolset for D&D 5th Edition, announced with the edition itself.

**How far it got:** public beta on multiple platforms.

**What stopped it:** WotC and Trapdoor "ceased working together"; the beta shut down at noon MST on
**31 October 2014** (Ten Copper; EN World). The termination is reported as a **licence disagreement**.
Trapdoor then relaunched the product on Kickstarter in January 2015 as a Pathfinder-first tool with a
roughly **half-million-dollar goal — and missed it spectacularly** (Tribality). **Trapdoor Technologies
closed permanently** (EN World, "Trapdoor Tech Closes Its Doors").

> The product was not bad and the market was not absent. **The platform they were built on revoked
> them.** This is the canonical demonstration of the licence-dependency death, and it is exactly the
> death Project Chronicle's invariant ("no copyrighted rulebook content without licence") is designed
> to be immune to — at the price named in §5, R6.

### 1.6 D&D Insider Virtual Game Table — Wizards of the Coast (2008–2012)

Promised alongside 4th Edition in 2008 as part of D&D Insider; **launched without it**. Alpha, then
beta from 2010. **Beta closed 30 July 2012**; WotC's stated reason was that they were "unable to
generate enough support for the tool to launch a full version to the public" (Wikipedia, *D&D
Insider*). Gleemax, the accompanying community hub, had already been cancelled in July 2008.

> WotC failure #1 of 3. The pattern this establishes — **announce the all-in-one, ship the parts that
> are easy, kill the hard part** — recurs in Sigil fourteen years later.

### 1.7 The absorbed: Tabletop Connect, Demiplane

- **Tabletop Connect** (Carl Pinder, Kickstarter 2013): a full-3D VTT for Windows and Mac. **Acquired by
  SmiteWorks**, makers of Fantasy Grounds; backers were transferred to that platform (Kickstarter
  updates). The standalone product never shipped as itself. *No reliable figure found* for the amount
  raised.
- **Demiplane** — "D&D Beyond for every other system," the Nexus character-builder platform — was
  **acquired by Roll20 on 4 June 2024** (Roll20 blog; Demiplane blog; rascal.news). Integration went to
  public beta in 2025. The hollowing has begun but is not complete: as part of the integration they
  **sunset the Pathfinder 2e Remastered sheet on Roll20 Characters** (existing characters readable, no
  new ones). Not yet a death; a reduction.

### 1.8 Alive, and the brief's candidate list corrected

Do not eulogise these; several are competitors, not corpses.

| Product | Status as of 2026-07 | Evidence |
|---|---|---|
| **Shard Tabletop** | **Alive.** UI refresh Nov 2024; 2024 Monster Manual compatibility pack Feb 2025; Call of Cthulhu, Esper Genesis, Tales of the Valiant support. 5e-centric. | shardtabletop.com, Blog of the Valiant, Gnome Stew |
| **Myth-Weavers** | **Alive.** 1,350+ active games across 146 systems; sheets + play-by-post forums; routine maintenance through 2024. | myth-weavers.com, @mythweavers |
| **MapTool / RPTools** | **Alive**, volunteer open source; GitHub issues opened as recently as June 2026. | github.com/RPTools/maptool |
| **Obsidian Portal** | **Alive** — see §3. Update posts Jan 2024 and Jan 2026; Campaign of the Month running Feb 2026. | blog.obsidianportal.com |
| **Quest Portal** | **Alive but transformed.** $13.7 M raised over 2 rounds (Series A $7.6 M, Oct 2023 — Tracxn/ArcticStartup); **13-person team in Reykjavík**. Now leads with an **AI GM Assistant** and a **credits** payment model justified by "today's rapidly shifting AI landscape." | questportal.com (fetched 2026-07-27) |
| **Role (playrole.com)** | **Alive, scope-reduced.** Founded 2015 (Elle Dwight, Ian Hirschfeld); **$2.75 M seed** Aug 2021 (TechCrunch). Video-first, 75 % creator revenue share. Notably it **no longer builds its own tactical half — it advertises native Owlbear Rodeo integration** for Patron subscribers. © 2026 Role, Inc. | playrole.com (fetched 2026-07-27), TechCrunch |
| **Alchemy RPG** | **Alive, stalling on depth.** Kickstarter Apr 2023: **>$600 k from >3,800 backers**, $250 k on day one, funded 20× in a day. But a Jan 2025 review documents full-retail modules shipping as *"just a set of splash screens," "nothing is set up at all"*, an "ingest issue" blamed and unfixed for months. | Kickstarter, TechRaptor, wargamer.com, numtini.com |
| **d20Pro** | **Uncertain / apparently dormant.** Still sold, "Free Trial. Buy Once. No Subscription." The most recent release announcement I could find is **v3.9, 28 July 2020**. No evidence of development since. | d20pro.com (fetched 2026-07-27) |
| **EpicTable** | **Uncertain.** Site live, "no subscriptions," licensing page claims active development; **no dated release note found**. | epictable.com (fetched 2026-07-27) |
| **Fabletop** | Site live, free, chat-based. **No evidence of active development found.** | fabletop.com |
| **Infrno** | **No reliable information found.** | — |

---

## 2. Realm Works — our failure mode, already run once, in full

Realm Works is not an analogue. It is **the same product's wiki half, built thirteen years earlier, with
the same central mechanism, and it died of the thing this champion has deferred four times.**

**What it was.** Lone Wolf Development's system-agnostic campaign-knowledge tool: relational entities
with automatic linking, full-text search, map navigation, embedded images/stat blocks/audio/video — and
its flagship mechanism, **"Fog of World," described on Lone Wolf's own product page as
patent-pending**: the GM selectively reveals world elements to players. *That is revelations.* This crew
reinvented it independently four rounds ago; Realm Works shipped it in 2013 and won the **ENnie Award,
Silver, Best Software, 2014** for it (Wikipedia).

**The money and the promise.** Kickstarter ran 22 January – 24 February 2013: **1,836 backers,
$170,748**. Software released July 2013. The commercial shape, still live on wolflair.com today:
**Game Master Edition $59.99** (including *six months of free server access*), **Player Edition $4.99**,
60-day money-back guarantee, plus a **Content Market** of prepared adventures — announced to debut in
**early 2016**.

**What actually happened to each promise.**

- **Cloud sync — the load-bearing promise — never became what users expected.** Community reports on the
  Lone Wolf forums describe the software as "isolated to just the computer it's on, with no cross
  platform syncing or app support," and the sync workflow as manual and session-breaking: the GM had to
  *close and sync the realm*, and players had to sync too, before a reveal reached them. The reveal
  mechanic shipped; **the real-time delivery of the reveal did not.**
- **The Content Market shipped and immediately generated licensing grief** — a Pathfinder PDF pricing
  dispute, and **no D&D 5e content at all** because WotC products were not available (Lone Wolf forums,
  "Content Market — Pricing Details & More"; Tribality, Dec 2015). The store that was supposed to fund
  the platform was hobbled by the licence regime described in §1.5.
- **Development was suspended on 29 September 2019.** Lone Wolf's announcement, quoted by Tenkar's
  Tavern: *"Effective immediately, we are officially suspending work on Realm Works while we focus on
  improving our other products."* Company president Rob Bowes called Realm Works *"my baby"* and said it
  was **"failing as a commercial venture with what limited resources we can put into it."** The
  downsizing was real: *"We're therefore saying goodbye to some excellent people, and that just adds to
  today's pain."* The servers would keep running; features might "eventually emerge within the Hero Lab
  Online framework."

**And here is the fact that should end any argument about whether this is our failure mode.** I fetched
`wolflair.com/realmworks/` on **2026-07-27**. The page still sells the Game Master Edition at **$59.99
with six months of server access**, still advertises the Content Market, still advertises Fog of World
as patent-pending, still offers the 60-day guarantee — and carries **no notice anywhere that the
product has not been developed in nearly seven years.** A world-knowledge tool with a player-visibility
mechanism can remain on sale, indefinitely, as a monument.

**Time from ENnie-winning launch to suspension: six years. Team: a real company with staff. Mechanism
that killed it: the sync layer between the GM's knowledge and the player's view — the exact layer
Project Chronicle calls `Sicht`, which CHAMPION §2 records as "grafted, unbuilt and unmeasured for the
fourth consecutive round."**

*Not established:* Realm Works' unit sales, revenue, or active-user count at any point; the specific
Kickstarter stretch goals delivered vs. dropped; whether Lone Wolf Development still trades in 2026 or
who owns it now. **No reliable figure found** on all four.

---

## 3. Obsidian Portal — the near-death, and the only rescue in this file

**What it was and is.** The original web campaign-management site: campaign wikis, characters, adventure
logs, GM-only sections. Running since **2007** — nineteen years, longer than every VTT in this file
except Fantasy Grounds.

**The near-death.** The founders sold to a corporate website-management group based in Australia.
Under that ownership — roughly the mid-2010s to 2019/2020 — the site was visibly neglected: forum
threads asking whether the API had been abandoned, whether the site was dying, whether anyone was
home. The acquirer's own account, relayed in the ownership-change announcement, is that they *"had lost
the team that were supporting Obsidian Portal."* A community grew up around leaving it ("Life after
Obsidian Portal," dreadgazebo.net).

**The rescue.** Ownership transferred incrementally over about a year, announced publicly in **May 2020**
(EN World press thread). The new "Head Portal Keeper" is an individual — handle **thaen**, described as a
40-year-old dad from Texas. 2020 shipped Public Forums, Forum Dice, **Player Secrets**, and Private
Characters. Update posts continue: January 2024, January 2026; Campaign of the Month still running
February 2026.

**The mechanism worth copying.** Obsidian Portal survived corporate abandonment because **the cost floor
of a text-and-images campaign wiki is low enough that one motivated person can carry it.** It did not
survive by being well-capitalised; it survived by being cheap. It is the counterexample that proves the
graveyard's economics: the products that died were the ones whose per-table running cost was
structurally high — realtime channels, asset CDNs, 3D scene servers.

> **Read §2 and §3 together and the shape of the wiki half becomes clear.** The knowledge half is the
> *survivable* half; it is the sync/liveness half that kills. Chronicle has fused them, which means
> Chronicle has fused a survivable half to the half that killed Realm Works and One More Multiverse.

---

## 4. The pattern — causes of death, ranked by frequency

Each cause carries at least two cases.

**P1 — Per-table running cost outruns per-table revenue. (Most frequent, most fatal.)**
One More Multiverse: **$17.6 M raised, killed by a realtime bill** (~$5/player/month vs. a $30 one-off
purchase — Dice Monkey). Owlbear Rodeo: introduced subscriptions *explicitly because* "moving to a cloud
model for both storage and image sharing … costs more to run the site" (their own blog, RB-01-owlbear).
Astral: closed the marketplace and replaced annual subscriptions with cheaper monthly ones — a revenue
restructure under cost pressure — before shutting. **Corollary: the platforms that externalise hosting
to the customer (Foundry, Fantasy Grounds pre-2025) do not appear in this failure column at all.**

**P2 — No monetisation path that scales with usage.**
Sigil: PC Gamer — the *"distinct monetization path … never materialized."* Let's Role: store sales
disappointing from launch, Play Pass "far from our objectives" even while growing. Astral: "not
attracted an audience large enough to be a thriving business." In all three the product worked and the
money didn't.

**P3 — Solo-founder / minimal-team exhaustion.**
Let's Role: *"as the company's sole employee, my salary has been very low for the past 2 years or
non-existent for almost the whole of 2023. And I've reached the end of my personal resources."* Astral:
founder retired; nobody succeeded him. Realm Works: *"failing as a commercial venture with what limited
resources we can put into it"* — the resource constraint stated by the president himself. Obsidian
Portal: five years of visible neglect after the supporting team was lost.

**P4 — Breadth before depth; the maintenance tax of the all-in-one.**
One More Multiverse: "building environments was a lot more complicated than it is in other VTTs" —
their differentiator became their onboarding cost. Sigil: thin feature set plus hardware demands
requiring a high-end gaming PC — engine-class ambition, shallow product. Alchemy: a marketplace of
licensed systems where modules shipped as splash screens at full retail price (numtini.com, Jan 2025) —
breadth of catalogue outrunning depth of implementation. **Owlbear Rodeo is the control group:** a
deliberate, stated refusal to grow scope, by two people, still alive (RB-01-owlbear §6).

**P5 — Dependency on somebody else's IP or licence.**
DungeonScape: killed outright by a licence disagreement with WotC; the company folded. Realm Works
Content Market: Pathfinder pricing fiasco and **zero 5e content because WotC products were unavailable**.
The **OGL 1.1 crisis of January 2023** generalised the threat: the leaked draft would have rendered
OGL 1.0 unauthorised, and — the structurally dangerous part — **the VTT Policy sat outside the licence's
legal terms, so WotC could alter it unilaterally** (Arkenforge's analysis; Bell of Lost Souls). Foundry
publicly called the terms "wholly unacceptable to the creator community" (EN World). Alchemy's revenue
is "largely from selling officially licensed content" (RB-01-alchemy) — a survivor sitting on the same
fault line.

**P6 — Network effects that never ignite; discovery is the actual product.**
Roll20 reached ~10 M registered users by 2023 (EN World) and 15 M is claimed for 2025 (a competitor's
blog — **third-party marketing claim, treat as unverified**; registered accounts are not active users,
as RB-01-roll20 already notes). Against that, Let's Role's store never sold and Astral's audience was
never "large enough." Roll20 then *bought* discovery outright: OneBookShelf/DriveThruRPG in 2022,
Demiplane in 2024. **The dead were not worse products; they were less findable ones.**

**P7 — Acquisition as slow euthanasia.**
Astral: partner → owner → owner merges with the market leader → dead in eight months. Demiplane:
absorbed 2024, one sheet already sunset in 2025. Tabletop Connect: absorbed into Fantasy Grounds,
never shipped as itself.

**P8 — The promised-feature debt trap.**
Realm Works: cloud sync promised, half-delivered, then frozen — six years. D&D Insider: the Virtual
Game Table promised at 4e's 2008 launch, shipped as alpha/beta, killed 2012 for lack of support.
**In both, the product survived on the strength of the promise long enough to make the eventual
non-delivery the story.**

---

## 5. The survivors, and the mechanism — not the virtue

**Foundry VTT — externalise the two costs that kill.**
Andrew Clayton ("Atropos") began it in 2018 for his own use, dissatisfied with existing feature sets
*and business models*; built a **Patreon community before release** (revenue before product); released
22 May 2020. **Bootstrapped, no outside investors.** Company size ~9 (RocketReach/D&B — third-party
estimates; LinkedIn lists 2–10). Mechanism, in three parts: **(a) $50 one-time, self-hosted — the
customer pays the hosting bill, so P1 cannot reach them; (b) the module/system ecosystem writes the
features, so P4's maintenance tax is distributed; (c) discovery runs through system and module authors,
not a store** — which is precisely why RB-11 ratified creators as our go-to-market. RB-01-foundry
records the ecosystem's growth: products 557 → 1,227 in one year, marketplace users 19 k → 60 k.

**Roll20 — own discovery, not just the table.**
First mover (2012 Kickstarter), freemium per-GM subscription, and then it bought the two layers that
generate demand: **OneBookShelf/DriveThruRPG (2022)** and **Demiplane (2024)**. Roll20's product is
mediocre on several axes RB-01-roll20 documents (accessibility "poor," export unreliable, no theming) —
and it does not matter, because the network and the storefront are the moat.

**Fantasy Grounds — the software is a storefront.**
Twenty years old. Bought Tabletop Connect's 3D technology rather than building it. Licensed rules
automation is the product. Then, on **8 November 2025, it went free-to-play**: the $50 Ultimate licence
and all subscriptions retired, base software free for everyone. CDO Adam Bradford's stated logic: drive
customers straight to the marketplace so someone can *"simply buy the box set module and start playing
for around $20 to $30 instead"* (Wargamer; GamingOnLinux; peginc.com). **The survivor mechanism is that
the software was never the revenue.**

**Owlbear Rodeo — stay small enough to be maintainable forever.**
Two people (Mitch full-time from May 2022). Explicitly refuses to become an everything-VTT. GM-pays
subscription; free tier deliberately kept playable; extensions open-source. Tiers gate **storage and
rooms, not play features**. This is the only survivor whose team is close to ours in size, and its
survival mechanism is *the opposite of our ambition*: it wins by refusing breadth.

**World Anvil — user content is the discovery engine.**
Founded 2017 by Janet Forbes with Dimitris; **bootstrapped, no funding raised** (Tracxn/Crunchbase);
**~16 employees** (Tracxn, April 2026 — third-party estimate). Subscription with annual auto-renew. Its
public worlds are indexed pages, i.e. every user is marketing. Honest about the friction: Trustpilot
carries 250+ reviews with a persistent complaint cluster — **annual auto-renewal without warning, no
refunds, "unintuitive and outdated" usability, heavily moderated feedback channels**. Aggregate ratings
conflict across sources (SmartCustomer reports **3.1/5 from 10 customers**; other summaries cite a 4.5);
**I could not resolve the true current Trustpilot score because worldanvil.com and Trustpilot both
refuse direct fetches.** Treat both numbers as unverified.

**Kanka — cheap enough never to need to win.** Two people, open source, **400,000+ creators claimed
(vendor self-report)**, seven years. **LegendKeeper** — solo-founded by Braden Herndon, now three people
(two full-time). **Campfire** — founded 2018, ~8 employees, ~$2 M revenue (RocketReach estimate,
unaudited).

**The one-sentence synthesis.** Every survivor either (a) **does not pay the per-table running cost**
(Foundry, Fantasy Grounds pre-2025, self-hosting), or (b) **owns the discovery layer** (Roll20, World
Anvil's indexed worlds), or (c) **is small enough that the cost floor never matters** (Owlbear, Kanka,
Obsidian Portal). **Project Chronicle currently plans (a)-and-(c) architecturally while committing to a
hosted seventh day that puts it back in category (none).**

---

## 6. The verdict for us — mortal risks, ranked, each with a watchable indicator

One builder, an AI crew, a **one-time GM licence with players always free**, one web/DOM codebase
shipped browser + Electron, sold direct, and an ambition to fuse a world-knowledge platform with a live
tabletop. Given the history above, here is what kills it, in order.

### R1 — The one-time licence versus the seven-day server. *(Cause P1. The most likely death.)*
CHAMPION §14.1 prices die Woche's always-on world at ~26 compute-hours/campaign-year, 8.7 % of the
300-hour allowance, <€0.05 per session-hour. **Those are means.** One More Multiverse died on the tail,
with $17.6 M in the bank, because realtime per-seat cost is not a mean — it is a distribution, and the
top decile of campaigns eats the licence fee. We are proposing **Foundry's price with Roll20's hosting
obligation, plus a Tuesday**.
**Early warning:** instrument **cost per campaign-month at the 90th percentile**, not the mean, from the
first hosted week of slice 1. Gate: if P90 campaign cost exceeds ~1/36 of the licence price per month
(i.e. the licence is consumed inside three years by hosting alone), the model is broken, not the
budget. A second, cheaper indicator: **the ratio of wake events to mint events**. Wakes that produce no
mint are pure cost.

### R2 — Fantasy Grounds went free on 2025-11-08, and the price anchor collapsed. *(Cause P2.)*
CHAMPION §14.3 already concedes this as "not closable by design." It is worse than a competitive
annoyance: FG's stated strategy is to make the software free so you buy a **$20–30 module**. Our
€30 one-time licence now sits above a competitor's zero, with less content behind it.
**Early warning:** track **how many VTTs still charge for the software itself.** Today: Foundry ($50)
and us. If that count reaches one, the licence is a legacy artefact and the revenue has to move to
Die Ausgabe/content — a pivot that takes months and should be started before it is forced.

### R3 — Solo-founder exhaustion, already written out in the exact words. *(Cause P3.)*
Let's Role's founder is the nearest living precedent and his sentence is the warning: *"I've reached the
end of my personal resources."* An AI crew changes the throughput of building; it does not change the
runway, and it *increases* the surface that must be maintained per unit of calendar time.
**Early warning, two of them:** (i) the **ratio of maintenance commits to feature commits** — when
maintenance exceeds ~40 % for two consecutive months, breadth has passed the maintainable line for one
person; (ii) **any calendar month with zero commits.** Astral's and Realm Works' deaths were both
preceded by quiet, not by announcements.

### R4 — Breadth before depth: the 120-day tactical half nobody has touched. *(Cause P4.)*
CHAMPION §2 is already the indictment: *"Nothing in four rounds has exercised a Pixi scene graph, a tile
pyramid, a KTX2 pipeline, a fog texture, a UVTT parser, a dice AST or a perf harness."* Sigil shipped
thin against the biggest brand in the hobby and was dismantled in three weeks. Slice 1 ships **no canvas
at all** (§9.1), which means the demo is a wiki with dice while K5 slips a slice.
**Early warning:** the **dates on which S-T1 (canvas/tactical) and S-P1 (`Sicht` projection) actually
run.** If slice 1 ships and neither has run, the most common cause of death in this file is already
inside the building. Make the spike dates a gate, not a hope.

### R5 — Discovery never ignites. *(Cause P6.)*
"Not attracted an audience large enough" (Astral) and "store sales disappointing" (Let's Role) are the
same sentence twice. RB-11 already ruled the answer: creators and system authors, plus UVTT +
Foundry/Roll20/FG export at launch, because Dungeon Alchemist reached the whole market by exporting to
its rivals. Note also **Role's survival move: it stopped building its tactical half and integrated
Owlbear Rodeo instead.** Interoperation is a survival strategy, not a concession.
**Early warning:** **the count of rule packages authored by someone who is not us, by month 3 after the
visual rule-builder ships.** Below ~5, the go-to-market has not started and no amount of feature work
will start it. Secondary: **inbound export files** — how many UVTT/Foundry exports leave the product
per week is a direct measure of whether creators find us useful.

### R6 — Licence dependency, which we have refused, at a price. *(Cause P5.)*
Our invariant ("no copyrighted rulebook content without licence") makes DungeonScape's death and the
OGL 1.1 shock structurally impossible for us. **It also removes the revenue line that funds Fantasy
Grounds and Alchemy.** We are immune to the poison and also to the food.
**Early warning:** **share of revenue from first-party/creator content vs. licence sales at month 12.**
If licences are ~100 % of revenue while FG is free (R2), the business has one leg.

### R7 — Realm Works' death, wearing Die Woche's clothes. *(Cause P8. The most specific risk in this file.)*
Realm Works shipped our reveal mechanic, won an ENnie, took $170,748 from 1,836 backers, and then spent
six years failing to land the sync layer that made the reveal live. `Sicht` — the server-side
per-character projection on which every promise in CHAMPION §6 rests — is "grafted, unbuilt and
unmeasured for the fourth consecutive round," and round 4 loaded **three more projected surfaces**
(`tuer_zustand`, `umbruch`, `briefwechsel`) plus an always-reachable identity subsystem on top of it.
**Early warning:** the number of design rounds a load-bearing mechanism has remained *grafted, unbuilt,
unmeasured*. **It is at four.** Declare five the number at which the lineage has stopped being a design
record and become a promise ledger — which is the document Realm Works' Kickstarter page became.

### R8 — Acquisition/absorption. *(Cause P7. Lowest probability, listed for completeness.)*
Sold direct, no investors, no cap table to force an exit. The realistic version is not being bought but
**being made redundant by a survivor shipping our differentiator** — a Foundry journal that gains real
relational structure, or World Anvil gaining a live table.
**Early warning:** watch Foundry release notes for **relational journal entities with per-player
visibility**, and World Anvil for **anything with initiative or tokens**. Either is the moat in CHAMPION
§16 being crossed.

---

## 7. What I could not establish

Named honestly, per the crew's rule. None of these were guessed at above.

1. **Sigil's development budget.** Never publicly disclosed; only the $146.3 M D&D Beyond acquisition is
   on record. No reliable figure found.
2. **Realm Works' sales, revenue, or active users** at any point, and **Lone Wolf Development's current
   corporate status/ownership in 2026.** No reliable figure found.
3. **Which Realm Works Kickstarter stretch goals were delivered vs. dropped.** The Kickstarter page
   returns 403 to fetch; search summaries were not specific enough to assert.
4. **World Anvil's true current Trustpilot score.** Sources conflict (3.1/5 from 10 customers per
   SmartCustomer; 4.5 cited elsewhere); worldanvil.com and Trustpilot both refuse direct fetches.
   Reported as unresolved.
5. **World Anvil's revenue or subscriber count.** No reliable figure found; the company is private and
   unfunded, so no filings exist.
6. **Foundry VTT's revenue or unit sales.** No reliable figure found — searches collide with unrelated
   companies named "Foundry."
7. **Let's Role's Kickstarter total and subscriber count.** The primary post-mortem is paywalled; the
   founder's quotes came via the EN World thread carrying the text.
8. **Tabletop Connect's Kickstarter raise** and the terms of the SmiteWorks acquisition.
9. **Infrno's status.** No reliable information found at all.
10. **Masterplan (the 4e adventure builder)** — not investigated within budget; excluded rather than
    guessed. Recommend a Hermes lookup if the crew wants the case.
11. **EpicTable's and d20Pro's actual development status.** Both sites are live and claim non-subscription
    models; neither publishes a dated recent release note that I could reach. d20Pro's most recent
    visible release post is v3.9, 28 July 2020 — suggestive, not conclusive.

---

## 8. Sources

**Sigil / WotC:** [GeekWire](https://www.geekwire.com/2025/wizards-of-the-coast-reportedly-lays-off-staff-working-on-virtual-tabletop-sigil/) ·
[Engadget](https://www.engadget.com/gaming/hasbro-laid-off-the-team-behind-its-virtual-tabletop-app-only-weeks-after-it-was-released-214024876.html) ·
[Gizmodo](https://gizmodo.com/dnd-sigil-vtt-canceled-hasbro-wizards-of-the-coast-2000578128) ·
[TechRaptor](https://techraptor.net/tabletop/news/wizards-of-coast-closes-doors-on-sigil-dd-beyond-vtt) ·
[PC Gamer](https://www.pcgamer.com/games/hasbro-pushed-sigil-out-of-the-nest-d-and-ds-latest-layoffs-happened-because-the-distinct-monetization-path-for-its-virtual-tabletop-sigil-never-materialized/) ·
[GeekNative](https://www.geeknative.com/210648/its-official-wizards-of-the-coast-confirms-dds-sigil-vtt-is-shutting-down/) ·
[GamesRadar](https://www.gamesradar.com/tabletop-gaming/project-sigil-is-officially-dead-and-i-cant-believe-d-and-d-fumbled-its-best-idea-in-years/)

**D&D Beyond acquisition:** [Hasbro investor release](https://investor.hasbro.com/news-releases/news-release-details/hasbro-acquire-dd-beyond-fandom) ·
[GeekWire](https://www.geekwire.com/2022/dd-beyond-officially-joins-wizards-of-the-coast-in-146-3m-acquisition/) ·
[Forbes](https://www.forbes.com/sites/robwieland/2022/04/13/hasbro-acquires-dd-beyond-for-1463-million/)

**D&D Insider Virtual Game Table:** [Wikipedia — D&D Insider](https://en.wikipedia.org/wiki/D%26D_Insider) ·
[EN World — D&D Does Digital Part II](https://www.enworld.org/threads/d-d-does-digital-part-ii-virtual-tabletops.663393/)

**DungeonScape / Codename: Morningstar:** [Ten Copper](http://tencopper.com/article/2014/11/dnd-5e-digital-tools-dungeonscape-cancelled/) ·
[EN World — Trapdoor Tech Closes Its Doors](https://www.enworld.org/threads/trapdoor-tech-closes-its-doors.663884/) ·
[Tribality](https://www.tribality.com/2015/01/04/trapdoor-technologies-codename-morningstar-misses-funding-goal/)

**One More Multiverse:** [TechRaptor](https://techraptor.net/tabletop/news/one-more-multiverse-vtt-platform-announces-closure) ·
[Bell of Lost Souls](https://www.belloflostsouls.net/2024/05/one-more-multiverse-the-virtual-ttrpg-platform-is-shutting-down.html) ·
[Dice Monkey post-mortem](https://www.dicemonkey.net/2024/05/14/one-more-multiverse-shutting-down/) ·
[Game Developer — $17.5M Series A](https://www.gamedeveloper.com/game-platforms/multiverse-raises-17-5-million-for-video-game-inspired-digital-tabletop-platform) ·
[GeekNative](https://www.geeknative.com/130773/tabletop-rpg-company-raises-17m-as-big-names-back-one-more-multiverse/)

**Astral TableTop:** [GeekNative](https://www.geeknative.com/135941/astral-tabletop-halts-development/) ·
[Tenkar's Tavern](https://www.tenkarstavern.com/2021/10/astral-virtual-table-top-to-cease.html) ·
[Arkenforge — Farewell to Astral](https://arkenforge.com/farewell-to-astral-tabletop/) ·
[GeekNative — Roll20/OneBookShelf](https://www.geeknative.com/144025/roll20-joins-with-drivethrurpg-and-dmsguilds-onebookshelf-to-form-a-joint-venture/)

**Let's Role:** [Tabletop Marketplaces (partly paywalled)](https://tabletopmarketplaces.substack.com/p/breaking-lets-role-virtual-tabletop) ·
[EN World thread carrying the announcement text](https://www.enworld.org/threads/lets-role-virtual-tabletop-ceases-new-development-not-to-be-confused-with-role-virtual-tabletop.700998/)

**Realm Works / Lone Wolf:** [Lone Wolf product page (fetched 2026-07-27)](https://www.wolflair.com/realmworks/) ·
[Tenkar's Tavern — suspension announcement, 2019-09-29](https://www.tenkarstavern.com/2019/09/hero-labs-lone-wolf-downsizes-ceases.html) ·
[Kickstarter project page](https://www.kickstarter.com/projects/610004753/realm-works-streamlined-rpg-campaign-tools) ·
[Wikipedia](https://en.wikipedia.org/wiki/Realm_Works) ·
[Lone Wolf forums — Content Market pricing](https://forums.wolflair.com/threads/realm-works-content-market-pricing-details-more.57639/page-5) ·
[Tribality — Pathfinder content](https://www.tribality.com/2015/12/03/realm-works-pathfinder-digital-content-enters-a-new-era/) ·
[Lone Wolf forums — cloud/sync complaints](https://forums.wolflair.com/threads/realm-works-cloud-software.55268/)

**Obsidian Portal:** [EN World — ownership change](https://www.enworld.org/threads/obsidian-portal-changes-ownership.672372/) ·
[Words In The Dark blog](https://blog.obsidianportal.com/) ·
[Dread Gazebo — Life after Obsidian Portal](https://dreadgazebo.net/life-after-obsidian-portal/)

**Survivors:** [Wikipedia — Foundry VTT](https://en.wikipedia.org/wiki/Foundry_VTT) ·
[Foundry FAQ](https://foundryvtt.com/article/faq/) ·
[Owlbear Rodeo — subscriptions post](https://blog.owlbear.rodeo/state-of-the-rodeo-lets-talk-about-subscriptions/) ·
[Wargamer — Fantasy Grounds free-to-play](https://www.wargamer.com/dnd/fantasy-grounds-free) ·
[GamingOnLinux](https://www.gamingonlinux.com/2025/11/fantasy-grounds-virtual-tabletop-vtt-is-now-free-to-play/) ·
[Roll20 — Demiplane acquisition](https://blog.roll20.net/posts/roll20-has-acquired-demiplane/) ·
[rascal.news](https://www.rascal.news/roll20-announces-acquisition-of-demiplane/) ·
[Kanka about page](https://kanka.io/about) ·
[LegendKeeper — team growth](https://www.legendkeeper.com/legendkeeper-is-growing-welcome-adam/)

**OGL 1.1 / VTT policy:** [Arkenforge analysis](https://arkenforge.com/what-does-ogl-v1-1-mean-for-vtts/) ·
[Bell of Lost Souls — leak](https://www.belloflostsouls.net/2023/01/dd-breaking-new-ogl-1-1-leaks-to-render-ogl-1-0-unauthorized.html) ·
[Bell of Lost Souls — OGL 1.2 and VTTs](https://www.belloflostsouls.net/2023/01/publishers-respond-as-wotc-takes-aim-at-virtual-tabletops-with-ogl-1-2.html) ·
[EN World — Foundry responds](https://www.enworld.org/threads/foundry-vtt-responds-to-ogl-1-2-draft.694702/)

**Living competitors:** [Quest Portal (fetched 2026-07-27)](https://www.questportal.com/) ·
[ArcticStartup — $7.6M Series A](https://arcticstartup.com/quest-portal-raises-7-6m/) ·
[Role (fetched 2026-07-27)](https://www.playrole.com/) ·
[TechCrunch — Role $2.75M](https://techcrunch.com/2021/08/19/roles-video-role-playing-platform-makes-a-2-75m-charm-attempt-on-the-burgeoning-tabletop-world/) ·
[numtini — Alchemy review, Jan 2025](https://www.numtini.com/2025/01/14/alchemy-vtt-changing-gold-into-lead/) ·
[Shard Tabletop](https://www.shardtabletop.com/) ·
[Myth-Weavers](https://www.myth-weavers.com/) ·
[RPTools/MapTool GitHub](https://github.com/RPTools/maptool) ·
[d20Pro (fetched 2026-07-27)](https://d20pro.com/) ·
[EpicTable (fetched 2026-07-27)](https://www.epictable.com/)
