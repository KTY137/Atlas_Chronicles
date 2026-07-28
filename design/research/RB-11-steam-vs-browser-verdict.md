# Steam vs Browser — Decision Brief (2026-07-26)

**RB-11 · the K6 distribution verdict.** Forged by Pythia, compiled 2026-07-27.
Inputs: [RB-07 Steam economics](RB-07-steam-economics.md) · [RB-08 distribution precedents](RB-08-distribution-precedents.md) ·
[RB-09 client tech paths](RB-09-client-tech-paths.md) · [RB-10 Workshop & networking](RB-10-workshop-and-networking.md) ·
[00-intake](../00-intake.md) · three independent judge verdicts (business & reach · product & UX · engineering & risk).

*Note on missing inputs:* `RB-06-map-strategy.md` and `RB-00-competitive-landscape.md` **do not exist** in
`design/research/`. Their beat is partly covered by [RB-05 competitor maps](RB-05-competitor-maps.md),
[RB-02 rendering tech](RB-02-rendering-tech.md) and the `RB-01-*` teardowns. Nothing in this verdict rests on
a brief I did not read.

---

## Kaya's question, answered in one paragraph

No — Project Chronicle should not become a Steam-released game, and it should not become a Steam-released
anything **yet**. But the reason is not the one you expect, and the answer is not "stay in the browser."
The four briefs converge on a fact that dissolves most of the fork: **we were already going to build the
Steam client.** A browser cannot host a local server, so the self-hostable invariant has exactly one humane
implementation — a desktop binary with an embedded host (Foundry: 68.35 % of its installs are the Windows
Electron client). That binary is a web/DOM app in an Electron shell either way. Adding Steam to it later is
`$100`, a depot script, and 6–8 weeks of process; it is not an architecture. So build **one web/DOM codebase
(React/TS + PixiJS), shipped as a browser app and as an Electron desktop client**, sell it as a **one-time GM
licence with free browser players**, direct, through a merchant of record at ~78 % net — and hold the Steam
listing as a *gated later decision*, not a founding commitment. Going to Steam now would buy a shelf: the
median 2025 Steam release earned **$249**, and the one product that already shipped our exact model there —
GM Forge, $29.99, Workshop, free browser players — has **83 reviews and 1 concurrent player after eight
years**. Going to a game engine (option B) would be actively self-harming: no engine has a rich-text editing
control, so K2's wiki/notes surface becomes a multi-month text-editor project, and choosing an engine moves
us into the group of competitors (Fantasy Grounds, TaleSpire) that structurally *cannot* compete on
accessibility — the axis K4 told us to win.

---

## The four options, side by side

Judges' own numbers, unaveraged. `Bus.` = business & reach · `Prod.` = product & UX · `Eng.` = engineering & risk.

| Option | Bus. | Prod. | Eng. | Headline strength | Headline weakness |
|---|:--:|:--:|:--:|---|---|
| **A — Browser-first, self-hostable** | **7** | **8** | **8** | Best unit economics on the table (~78–80 % net vs ~40 % of list realised on Steam); zero adoption friction — players join by link; lowest build cost (0.95×) and lowest migration cost; the only channel where recurring revenue is legal at all | Zero-audience ignition with **no compounding channel whatsoever**. And it does *not* escape the infrastructure bill: a browser cannot host, and a LAN IP cannot get a public cert — so A pays option D's hardest engineering cost (a Plex-pattern DNS/PKI/relay operation, or Owlbear's 3 TB/month) with none of SDR's relief |
| **B — Steam-native game engine** | **2** | **2** | **2** | Steam lobbies, friends-list invites and SDR are genuinely the best table onboarding in the market — "click invite, they're in", encrypted, NAT-free, unpriced | **No game engine has a rich-text editing control** (Godot proposal #1182 still open; Unity UI Toolkit the same). Kills F3, downgrades F2/F4, drops accessibility from rank 1 to rank 3–4, forecloses the browser build, costs 2–3× effort, and is the only option requiring a total rewrite if wrong. The market has walked away from all-participants-pay in **one direction only** |
| **C — Hybrid single codebase** | **9** | **9** | **9** | Same code at 1.0× effort serves both channels; bundled Chromium turns WebGPU from a distribution risk into a build flag and makes the desktop build deterministic on Steam Deck; direct-sale + Steam-key arbitrage takes Steam's reach without Steam's margin; **A, C and D all remain reachable — only B is foreclosed** | **The three 9s are three different C's** (see next section). Business-C requires a 30–50k-wishlist campaign that does not exist; product-C and engineering-C explicitly assume Steam adds nothing and must stay free. The shared failure mode: the browser build rots into the second-class sibling and C becomes B with extra steps |
| **D — Asymmetric, GM buys & hosts** | **6** | **6** | **5** | The monetisation *shape* is the market's proven answer — FG Ultimate for two decades, Foundry's $50 today, one buyer covers a whole table with no player-side friction and real pricing power | **Needs both Valve's platform and our own**: a Steam SKU + a web app + a Plex-style DNS zone and certificate-issuance service + a relay ($200 in Direct fees, not $100). SDR — the one thing that would make GM-hosting free — is structurally unusable by browsers. Largest security surface (the desktop app becomes a network-exposed server). GM Forge already shipped it: 83 reviews, 1 CCU |

**Where the numbers themselves disagree:** only on **D**, and only by one point — the engineering judge alone
scores it 5, and names why: *"the code is cheap and the service is not."* Business and product judges price D
as a business shape; engineering prices it as an operations contract that never ends. That single-point gap is
the most informative number in the table, because **the operations bill is the part that lands on Kaya
personally, forever.**

---

## Where the judges disagreed — and what that disagreement actually means

Three judges, three lenses, one winner, three 9s. That looks like consensus. It is not. Read the *reasons*
and the agreement dissolves into a hard, unresolved strategic question.

### The disagreement: is Steam a channel we invest in, or a build target we keep reachable?

| Judge | What C *is*, in their words | What Steam contributes | What C costs |
|---|---|---|---|
| **Business** | "Steam as the discovery and Workshop surface", direct sale as the margin channel | **The reach asset** — tag adjacency to TaleSpire/TTS, four seasonal spikes, Update Visibility Rounds, third-party trust on a €40 download | A **second go-to-market motion**: 30–50k wishlists, EA as a multi-year *state*, store-page and review management, German rating + AI disclosure |
| **Product** | *"C wins because it is A with a better renderer target, not because Steam adds product value"* | **Nothing.** Bundled Chromium is the prize; the store is incidental | Nothing — *provided* the shell stays free. If spikes S1/S5/S6 fail, "C's product advantage collapses to a shelf listing" |
| **Engineering** | C "with the browser build held as the primary development target and D reachable later as a phase, not a phase-0 commitment" | Optionality, and free relay/UGC hosting *if* we ever take it | 0.05× effort and one adapter layer — *and* a second release train (depot packaging + 1–5 day build review) that "hotfixes land on desktop-time" |

**This is not a nuance. It is two incompatible plans wearing the same letter.**

- The **business judge's C** spends real money and real weeks on Steam and expects Steam to repay it in reach.
  Its explicit failure mode: *"C does not degrade gracefully into A — it degrades into GM Forge."*
- The **product and engineering judges' C** spends nothing on Steam and expects nothing from it. Their C is A
  with a desktop shell. Both say so in their own caveats: engineering — *"A wins outright"* if the spikes come
  back negative; product — *"RB-09 scores 'web only, no Steam' identically on F1–F5 at 0.95× effort, so A wins
  on the same evidence the moment the shell costs more than it returns."*

So the real fork was never A-vs-B-vs-C-vs-D. It is: **do we fund a storefront presence, or do we build the
architecture that lets us fund one later?** All three judges answer the *architecture* question identically.
Only one of them answers the *funding* question yes, and that one attaches a caveat — bandwidth, not
economics — that the other two never had to consider because their lens does not see Kaya's calendar.

### Three sharper disagreements underneath, each worth naming

1. **Whether A is actually cheap.** Product and engineering judges both attack A on the same ground and reach
   opposite conclusions about who pays. Product: self-hosted A "delivers the worst first-run experience in the
   whole option set for a non-technical GM." Engineering: A "does not actually escape the infrastructure bill —
   it just puts the whole thing on our books." **Both are right, and this is the most under-priced fact in the
   entire evidence base:** the mixed-content / no-cert-for-a-LAN-IP problem is charged to A, C *and* D
   identically. It is not a Steam problem. It is a *browser-players-join-a-home-server* problem, and the only
   proven fix is Plex's DNS-zone + per-server-wildcard-certificate service — which we would then operate
   forever. **Nothing in the K6 fork makes this go away. Choosing a channel does not choose a solution.**

2. **Whether Workshop survives contact with our product shape.** Business judge counts Workshop as a
   commercial asset (+31 % revenue, +115 % CCU retention at year 5). Product and engineering judges both flag
   RB-10 §5: Workshop items download **only to owners of the Steam app**, and re-hosting a contributor's
   package bytes to a browser client is redistribution the SSA does not obviously permit **[legal — needs
   counsel]**. In a product whose *players are browsers*, a GM's Workshop theme kit may render on the GM's
   client and not on the table's. **The Workshop statistic and our product shape are in direct tension, and
   only the engineering and product lenses saw it.**

3. **What "one codebase" degrades into.** Engineering and product judges independently identified the same
   decay path from opposite directions — engineering from release mechanics (web deploys are instant, Steam
   builds carry review latency, so hotfixes land on desktop-time and features accrete on the WebGPU-only
   side), product from governance (Workshop-only content and desktop-only effects). They converge on the same
   remedy, which I adopt below as a hard rule. **When two independent lenses invent the same guardrail, the
   risk is real.**

### What the disagreement means for the verdict

It means the honest verdict is **not a letter**. It is a letter plus a schedule. The intersection of all three
Cs — the part every judge endorses without conditions — is precisely:

> One web/DOM core. An Electron desktop shell. Browser players free. GM buys. Sold direct.

The part only one judge endorses, under a caveat he himself calls the flip condition, is the **funded Steam
storefront**. Delphic honesty requires saying which of those we are buying today.

---

## Recommendation

**Option C — but as an architecture now and a channel later. Concretely: build C, ship A, keep the Steam door
unlocked and unopened.**

The commitment, stated so git can check it:

1. **Runtime — decided, now.** One codebase: React/TS + PixiJS, DOM-authoritative, canvas as one view.
   Shipped as (a) a browser app and (b) an **Electron** desktop client. Electron over Tauri on three concrete
   findings, not taste: the Steam overlay hooks Chromium's in-process GPU but not WebView2; WebKitGTK is a
   documented graphics liability on exactly the Linux/Deck target our WebGL-heavy viewport lives on; and
   Electron already contains Node, which makes the GM-hosts case architecturally free.
2. **The desktop client is not a Steam concession. It is the self-hosting invariant's implementation.**
   A browser cannot host. The alternative to a desktop host is telling a non-technical GM to install
   Docker and PostgreSQL — RB-07 is blunt that "a Steam build that says 'now go set up PostgreSQL' is
   commercially dead," and it is equally dead on our own website. Foundry's own telemetry settles it: 68.35 %
   Electron. **We are building ~90 % of "the Steam client" for reasons that have nothing to do with Steam.**
3. **Monetisation — decided, now.** One-time **GM licence**, players always free, no player ever buys
   anything. Sold direct through a merchant of record (~78 % net, we keep the customer, the email and the
   SEO). This is Foundry's shape, and it is the only shape in RB-08 that nobody has ever retreated from.
4. **Steam — gated, not scheduled.** No `$100`, no Direct onboarding, no store page, no depot pipeline, no
   SteamPipe in CI until the gate below is passed. The listing costs 6–8 weeks of pure process *before* any
   marketing, and a Steam page with no campaign behind it is a permanent, public, brigadeable review
   scoreboard attached to a €249 outcome.
5. **The Steam SKU we would actually ship, when we ship one, is probably not the VTT.** RB-08's clearest
   finding: **Steam works for tools, not for tables.** Dungeon Alchemist — single-user, screenshottable,
   €37.99, exports *into* every rival VTT — raised €2.46M from 57,209 backers and scores 95/100; TaleSpire,
   a venue, raised ~$400k from 8,504 and its top complaint is the price of seating a group. Our **Forge**
   (WFC map generator + theme editor + visual rule-builder) is a single-user, visually spectacular,
   UVTT-exporting instrument. **That** is the Steam-shaped half of Project Chronicle. Keep it separable by
   architecture; decide whether to ship it separately when it exists.

### The reasoning chain, in order

1. B is eliminated on evidence, not preference: no rich-text editing control in any engine kills F3 outright;
   F2/F4 are 2–3× rebuilds; accessibility falls from rank 1 to 3–4; the browser build is foreclosed; and it is
   the only option whose failure mode is a total rewrite. All three judges scored it 2. *(unanimous)*
2. Player-pays is eliminated by the market: TaleSpire full-copy → Seats → free Guest Edition; Fantasy Grounds
   per-seat → Ultimate → **fully free, 2025-11-08**, with its CDO naming "$70 to $80" as the reason. Nobody in
   the sample ever moved the other way. Any candidate assuming player purchases is struck in round 1 without
   debate. *(RB-08 L1; unanimous)*
3. The GM-buys shape is validated (Foundry, FG Ultimate); **the GM-buys-on-Steam shape is not** (GM Forge:
   83 reviews, 34/100, 1 CCU, eight years, with Workshop and free browser players). Take the shape, refuse the
   shelf.
4. D's *code* is nearly free from the Electron path; D's *service* is not. The Plex-pattern DNS/PKI/relay is
   a named workstream, not a detail — and SDR, the one thing that would rescue it, cannot serve browsers.
   D therefore stays a **later phase**, never a phase-0 commitment.
5. That leaves C's architecture with A's channel — and the arithmetic says the channel is right: Steam
   realises ~€11–13 on a €30 list against ~€23.50 direct, so **Steam must move roughly twice the volume to be
   revenue-neutral**, and the volume it would move is undiscovered by default.
6. The Steam half is not thereby rejected; it is **deferred at near-zero cost**, because the architecture that
   reaches it is the architecture we are building anyway.

### The conditions under which this recommendation is wrong

Stated as falsifiers, so the ledger can check them:

- **It is wrong if Kaya can fund a second go-to-market motion.** If there is real bandwidth for a
  30,000–50,000-wishlist campaign, a multi-year public Early Access presence, store-page and review
  management — then the business judge is right and the Steam half should be worked from the start, because
  the reach compounds and the ignition problem is the one we cannot otherwise solve. My recommendation
  assumes a solo stakeholder with an AI crew cannot build the product and run a storefront campaign
  simultaneously. **If that assumption is false, this verdict flips.**
- **It is wrong if the Electron shell turns out not to be free.** If spike **S5** (NVDA survives the wrapper,
  not just Chrome) or **S6** (measured footprint and idle RAM on a GM's laptop already running Discord and a
  browser) come back negative, the shell is not a freebie — and since the shell is now load-bearing for
  *self-hosting*, that is a bigger problem than the Steam question. Run S5 and S6 before the stack is pinned.
- **It is wrong if Kaya's plan requires recurring revenue as the primary line.** Steam's own docs call
  recurring subscriptions "not a fully supported feature" and ban ad models. If MRR is the plan, Steam is
  structurally the wrong primary channel and the deferral becomes permanent, not conditional. *(This makes
  the recommendation **more** right, not less — but the reasoning changes and should be recorded honestly.)*
- **It is wrong in the other direction if Valve answers two open questions favourably** (RB-07 R13): that a
  system-agnostic VTT can list as app type **Game**, and that a paid-Workshop / marketplace tier is reachable
  for us. Both are unverified. If both land yes, Steam's economics improve enough that the Steam half stops
  being a loss-leader and the Forge SKU becomes a revenue engine rather than an experiment.
- **It is wrong if the Forge matures faster than the table.** If the WFC map generator reaches
  screenshottable, exportable quality well before the VTT is sessionable, the Dungeon Alchemist play becomes
  available early and should be taken — it de-risks the venture, because the tool can win even if the VTT
  does not.

---

## What we would gain and what we would give up

### Gained

- **~78–80 % net per unit** instead of ~40 % of list realised, plus the customer email, the upsell path, and
  SEO that compounds. On a €30 licence that is roughly **€23.50 vs €11–13**.
- **One codebase, one accessibility tree, one test story** — vitest + Playwright + **axe-core in CI**, the only
  path in RB-09's table with automated accessibility regression testing. Plain-git text diffs, no depot
  pipeline, no store review sitting between a bug and its fix.
- **Instant deploy for the web build.** No 1–5 day build review on the hotfix path.
- **Maximal optionality.** A, C and D all live in this codebase; the Steam listing, Workshop, SDR and the
  separate Forge SKU are all reachable later without a rewrite. Only B is foreclosed — and B is the option
  that would cost us the accessibility axis.
- **Deterministic rendering on the desktop build.** Bundled Chromium makes WebGPU a build-configuration
  choice rather than a distribution risk; the desktop client can honestly be "the best version" without the
  browser build being abandoned.
- **The safety claim as marketing.** Our no-code-execution package invariant is the direct countermeasure to
  the failure mode behind Wallpaper Engine's 2026 malware wave, Meccha Chameleon's Blueprint payload, and
  TTS's self-replicating Lua infections. *"Our packages cannot run code, by construction"* is a real,
  defensible line against TTS and Foundry modules alike.

### Given up

- **Steam's adjacency engine.** "More Like This" next to TaleSpire and Tabletop Simulator is a channel a web
  app can never buy. Four annual seasonal traffic spikes. Update Visibility Rounds for a product that ships
  continuously. **This is a real loss and I will not minimise it — it is the single best argument the other
  side has.**
- **Valve absorbing global VAT filing, chargebacks, fraud, refunds and — most valuably — UGC hosting and the
  DMCA process.** We keep those. A merchant of record (Paddle/Lemon Squeezy) buys back the tax and payments
  half; nothing buys back the UGC half except our own registry with our own notice-and-action procedure.
- **The trust signal.** A €40 download from an unknown German solo developer's website converts worse than the
  same €40 behind Steam's refund guarantee. Worth several percentage points, and unquantified here.
- **Free SDR.** Encrypted, relayed, DoS-protected, NAT-free, unpriced networking that we now either build,
  rent, or design around.
- **Not given up but deferred, deliberately: nothing about Steam is closed.** That is the whole point of the
  recommendation.

### Invariants from `00-intake.md` — which survive, which must be re-worded

| Invariant / amendment | Status under the recommendation |
|---|---|
| **"Browser-based, self-hostable"** (product-in-one-line) | **Survives, but must be re-specified.** "Browser-based" holds for players absolutely — join by link, no account, no install, no purchase, iPads included. "Self-hostable" must now read **"self-hostable via a one-click desktop host, or Docker for those who want it"** — not "self-hostable" as a bare word that quietly implies a competent sysadmin. **This is a real amendment and Kaya must ratify it.** |
| **System-agnostic** | Untouched. |
| **Server-side permissions as the only truth** (invariant #1) | Survives, **but the trust model shifts** when the GM's desktop client is the server. "Server-side" then means "the GM's machine," which is authoritative but not *ours*. Athena owns the resulting threat model: an app that binds a socket needs authn/authz, session tokens, rate limiting, request validation and a security-patch cadence. |
| **Rule packages declarative, versioned, never arbitrary code execution** | Survives and becomes *more* load-bearing — it is now a security differentiator, a Workshop-survivability precondition, and a Steam store-compliance asset. |
| **Uploads are untrusted** | Survives, extended: "untrusted input" now includes the network, not just uploads. |
| **No copyrighted rulebook content without licence** | Survives, and RB-10 hardens it: mandatory validated `license` / `attribution` / `sourceUrl` / `derivedFrom` manifest fields from the first format revision; NC content architecturally separated from anything monetised. |
| **K1 — themes + theme editor** | **Survives fully.** Token-driven theming is DOM-native (CSS custom properties, `color-mix()`, contrast tooling). Under B this becomes a bespoke rebuild with no cascade and no computed values. |
| **K2 — visual GUI rule-builder** | **Survives fully** — and gains strategic weight: it is a *creator* tool, and creators are our discovery channel (Foundry needed system authors, not gamers). Under B, F3 (rich text) makes the wiki half a text-editor project before the first differentiating feature exists. |
| **K3 — state-of-the-art *and* accessible GUI** | **Survives, and is the axis most damaged by any other option.** DOM ranks #1 for accessibility with a mature audit toolchain; engines rank 3–4 with hand-maintained parallel trees documented against Narrator, not NVDA/JAWS. Fantasy Grounds and TaleSpire are Unity apps and structurally cannot follow us here. **Choosing B would voluntarily join the group that cannot compete on our own differentiation axis.** |
| **K4 — differentiation mandate** | Survives; the winnable axes are unchanged, and two of them (accessibility, visual rule-builder) are DOM-native. |
| **K5 — map excellence, WFC, game-engine feel** | **Survives.** RB-02's existence proof stands (Owlbear: two people, GPU fog, 600-option weather, a 137 MP map on a phone). WFC is a constraint solver over tile adjacency — pure computation, path-independent, belongs in a worker. **It must not influence the client-tech decision.** The desktop build *raises* the ceiling. |
| **K6 — the distribution fork** | **Answered here.** Amend to record: option B rejected on evidence; player-pays struck; C's architecture adopted; the Steam channel gated. |
| **K7 — game feel through staging** | Untouched. Semantic DOM stays authoritative under C; under B the whole three-render-recipe architecture (Cinematic/Tactical/**Outline**) loses its Outline recipe, because an engine viewport has no accessibility tree to render into. |
| **New invariant to adopt** | **No feature ships desktop-only without a declared, designed browser fallback.** Both the product and the engineering judge independently invented this guardrail. Without it, C decays into B with extra steps, and the click-a-link promise and the iPad players go with it. |
| **New invariant to adopt** | **No player ever pays for anything.** The market has settled this in one direction across every vendor in the sample. |

---

## The sequencing answer

**This is a now-decision about architecture and a later-decision about channel — and the two are separable at
almost no cost. That separability is the finding.**

RB-09 prices it exactly: web-only is 0.95×, hybrid is 1.0×. The Steam-reaching architecture costs **~5 % of
build effort plus one adapter layer**, and most of that adapter layer is required by self-hosting anyway.
There is no premature wrapper to regret, because the wrapper is the self-host host.

### What must be decided now

1. **The runtime** (web/DOM + PixiJS + Electron). Everything else in round 1 depends on it.
2. **The monetisation shape** (GM buys, players free, one-time licence, direct sale). It shapes the account
   model, the entitlement checks and the licence UX.
3. **The registry contract** (below). Two weeks now; unaffordable to retrofit.
4. **Reachability policy** — the honest one. Which of hosted rooms / LAN-only / Plex-pattern PKI ships in v1,
   *with the cost written down*. My recommendation: **hosted rooms as the default join path, LAN/self-host for
   technical GMs and the own-your-data promise, and the Plex-pattern PKI service explicitly deferred and
   named as deferred.** Do not let it arrive by accident in month nine.

### What must NOT be decided now

Steam Direct onboarding · the store page · Workshop as an enabled source · SDR in the netcode · the separate
Forge SKU · Early Access · crowdfunding. Every one of these is reachable later from the boundaries below.

### The concrete boundaries that buy the optionality

Each is a named seam. Cross one and the option it protects dies.

| # | Boundary | What it keeps open | Cost if skipped |
|---|---|---|---|
| **B1** | **`Platform` port** — `openFile` / `saveFile` / `pickFolder` / `hostSession` / `discoverLAN` / `openExternal` / `social`. Browser impl + desktop impl. Domain code never assumes a path, a port, or a shell. | Browser build, desktop build, and any future shell | A fork disguised as a codebase |
| **B2** | **Package registry contract** — our own id scheme, semver, `engine: ">=2.1 <3"` ranges, required/optional dependency split, content hashing, validation. `ISteamUGC`, mod.io, plain `.chronicle-pkg` zip and a future web registry are **adapters behind it**, never the interface. | Workshop, mod.io, self-hosted registry, console/mobile forever | RB-10 R1: hardwiring `ISteamUGC` forecloses A, C **and** D. TaleSpire and Cities: Skylines II both refused Workshop for exactly this reason |
| **B3** | **Vendor-on-first-use, content-addressed** — a resolved package is copied into the campaign and hashed. The registry copy is a *source*, never the live artefact. Upgrades are explicit, diffable, undoable GM actions with declarative migrations. | Per-campaign pinning (Steam's new version control is **branch-keyed**, not campaign-keyed, and will replace a folder under a running session); immunity to takedowns and abandoned authors | RB-10 R3: an author's v2.0 lands mid-campaign. Also the shape that makes spike S4 ("Verify integrity of game files" vs. our cache) survivable |
| **B4** | **Entitlement port** — one `hasLicence()` seam with three possible adapters: direct licence key, Steam ownership, hosted account. | Selling direct, selling on Steam, or both, without touching feature code | Licence checks smeared through the app; a Steam SKU becomes a refactor |
| **B5** | **Session transport port** — WebSocket now; SDR, WebRTC or a relay later as adapters. **No SDR-only assumption ever enters domain code** (RB-10 R11: Valve "cannot promise" non-Steam access, and browsers cannot speak it regardless). | GM-hosted, hosted-by-us, and relayed play | The netcode is designed around a service we may not be allowed to use |
| **B6** | **`.chronicle` export bundle that round-trips a full campaign with zero Steam involvement.** Workshop packages stored as `{sourceId, version, sha256}` references, never as re-hosted bytes. | **Reversibility of the entire Steam decision** — and it sidesteps the unresolved SSA redistribution question | Steam Cloud silently becomes the portability story; per-file 100 MB caps and single-user sync semantics then define our data model |
| **B7** | **One repo, one build, two artefacts** — the web bundle and the Electron artefacts come out of the same pipeline. **No SteamPipe/depot step in CI until the gate is passed.** | A second release train stays a decision, not a habit | Hotfixes start landing on desktop-time; features accrete on the desktop-only side |
| **B8** | **Governance rule (not code): no feature ships desktop-only without a declared, designed browser fallback.** | The click-a-link promise, iPad players, and C's identity | C becomes B with extra steps — the failure mode two judges named independently |

### The gate — what must be true before we pay Steam anything

- **S1** — Steam overlay actually hooks our Electron build (Shift-Tab, screenshots, **friend invites** — the
  flow a GM would use to pull players in). RB-09's author flags this as *"the one finding in the brief I could
  not verify directly and it is load-bearing."*
- **S2** — Steam Deck: Linux Electron build, Pixi viewport frame time, on-screen keyboard behaviour.
- **S3** — Workshop round-trip: `steamworks.js` UGC upload/subscribe of a real rule package, **through B2's
  adapter, not against `ISteamUGC` directly.**
- **S4** — Depot delta patch size, and whether "Verify integrity of game files" fights B3's content-addressed
  cache.
- **Valve's answers to RB-07 R13(a) and (e)** — app type *Game* for a system-agnostic VTT, and the SDA's
  merchant-of-record characterisation.
- **A funded campaign plan** — not an intention. 30,000–50,000 wishlists is a marketing project, not a
  checkbox.

**S5 (NVDA through the shell) and S6 (measured footprint/idle RAM) are different: they gate the *shell*, not
the Steam listing, because the shell is load-bearing for self-hosting.** Run those two before the stack is
pinned in round 1.

---

## Steam Workshop — the strategic prize, or a trap?

**Verdict: a prize we must not be owned by. Design the *registry*, not the Workshop. Take Workshop later as
one mirror among several, never as the source of truth. And be honest that its headline statistic does not
transfer cleanly to our product shape.**

**The case for.** Our content is Workshop-shaped to an unusual degree: a Workshop item is literally *a folder
of files* with a queryable metadata blob and up to 100 key-value tags resolvable **before** any content is
downloaded — which is enough to build a real dependency resolver on top. Valve hosts, versions, distributes,
and runs the DMCA process; compared with becoming the DMCA/DSA-liable intermediary ourselves (designated
agent, notice-and-action procedure, storage bill), that is one of the strongest non-financial arguments for
Steam that exists. And the measured effect of official UGC support is large: +8 % revenue year 1, **+31 %
year 5**, **+115 % CCU retention at year 5**, +105 % DLC revenue. Wallpaper Engine — a *Software*-category
listing — carries ~2.84 million Workshop entries. A VTT with a Workshop is not a stretch of the platform.

**The case against, in the order that actually matters.**

1. **The statistic probably does not transfer.** The GameDiscoverCo dataset is ~1,200 Steam games earning
   >$1M in month one, and the authors themselves flag correlation-vs-causation (UGC-enabled games skew to
   long-lifecycle genres). More decisively for us: in every game in that sample, **the UGC consumer owns the
   app**. In our shape the UGC consumer at the table is a browser player who, per RB-10 §5, **cannot legally
   receive the package bytes at all** — Workshop items download only to owners of the Steam build, and
   re-hosting a contributor's content to non-Steam users is redistribution the SSA does not obviously permit
   **[legal — needs counsel]**. The mechanism that produces +115 % retention is structurally weakened for a
   product whose players are browsers. **Nobody should quote +31 % at us without that caveat attached.**
2. **It is a silo, and our closest analogue refused it on purpose.** TaleSpire — Steam-native, with tiles,
   minis and assets exactly like ours — chose mod.io instead, stating they "don't want to stay tied to Steam
   only in the long term" and don't want to split the modding community; mod.io was also chosen *because it
   works with the free Guest Edition*. Cities: Skylines II abandoned Workshop entirely for Paradox Mods rather
   than lock mods to PC. **Two independent vendors with our exact content shape looked at Workshop and walked.**
3. **Its versioning cannot express our requirement.** Valve shipped Workshop version control on 2026-01-09,
   and it is real progress — but it keys off **Steam game branches**, per client, opt-in, with no documented
   player-facing pin/rollback UI. Our requirement is per *campaign*: "this table runs rulepack v1.4 until the
   GM says otherwise." Steam cannot express that and will happily replace the installed folder under a running
   session. B3 is the answer, and B3 makes Workshop's versioning largely irrelevant to us either way.
4. **It confers distribution, never trust.** 2026 gave us two clean demonstrations — Wallpaper Engine's
   malicious wallpapers (backdoor + credential harvester, dozens of items, thousands to tens of thousands of
   downloads each) and Meccha Chameleon's UE5-Blueprint map writing a batch file and spawning hidden
   PowerShell. Both trace to the same cause: **the content format was expressive enough to execute.** Add
   TTS's self-replicating Lua infections in our own genre, where the community had to publish disinfection
   tooling *as Workshop items*. Our no-code invariant is the countermeasure — and it is only real if the
   format has no escape hatch: no embedded HTML/JS/Lua, no scripted SVG, no arbitrary URL fetch from package
   data, no shell-out, no dynamic asset loading by path.
5. **Legal exposure we cannot arbitrate.** The SSA's originality warranty (§6.D) is contradicted by
   essentially every third-party-system package a user will upload. DMCA process is widely reported as
   abusable, with the accused's counter-evidence reviewed by the claimant. And in our home jurisdiction, the
   Kölner Deutschlandradio saga (LG Köln 2014 → OLG Köln 2014) left "non-commercial" narrow-then-*ambiguous* —
   so CC BY-NC-SA content (which is what "How to be a Hero" is) sitting on a Workshop attached to a paid
   product is genuinely unsettled **[legal — needs counsel]**, and clearly impermissible the moment any paid
   Workshop tier exists.
6. **Moderation lands on one person.** Ready-to-Use means anything ships; Valve moderates almost nothing
   proactively. mod.io's automated scanning pipeline is a real differentiator here and is worth its platform
   fee on the moderation grounds alone.

**What to do about it, concretely:** build **B2** (the registry contract) now. It costs perhaps two weeks more
than hardwiring `ISteamUGC` and it is the difference between a Steam feature and a portable ecosystem. Ship
`.chronicle-pkg` zip import first, a web registry second, and treat Workshop and mod.io as adapters we enable
when and if we list. Adopt Ready-to-Use over Curated *if* we ever enable it — with **machine curation**
(strict schema validation, resource budgets, media re-encoding, a quarantine state, and our own signed
"verified" badge) substituting for the human approver a solo stakeholder cannot be.

---

## Decisions Kaya must make

Ranked by how much downstream architecture each one moves. Each is a yes/no or an either/or.

**1. Do players ever pay for anything? — YES or NO.**
*Recommended: NO, permanently, as an invariant.*
→ **NO:** we adopt the shape Foundry and FG Ultimate proved, adoption friction goes to zero, the GM never has
to sell software to 3–5 friends, and our pricing power comes from one buyer covering a table. → **YES:** we
adopt the one model every vendor in RB-08 has retreated from; a five-person table pays €150 before a die is
rolled; and the player's purchase is stranded the moment the group dissolves — an asymmetry no discount, seat
pack or bundle has ever fixed.

**2. Is there bandwidth and budget for a second go-to-market motion alongside building the product? — YES or NO.**
*This is the question the entire fork actually turns on, and only Kaya can answer it.*
→ **NO (assumed):** the recommendation above stands — build C, ship A, gate Steam. → **YES:** the business
judge's C is correct and the Steam half should be worked from the start: 30–50k wishlists, Early Access as a
multi-year *state* not a phase, store-page and review management, German age rating and AI disclosure. **There
is no middle setting.** A Steam page nobody campaigns for is GM Forge: a dead shelf listing costing 30 % on the
trickle that finds it, 10–15 % refunds, and a permanent brigadeable public score.

**3. One-time GM licence, or recurring hosted subscription, as the primary revenue line? — EITHER/OR.**
*Recommended: one-time licence primary, plus optional hosted rooms priced at the cost they incur.*
→ **Licence:** lowest ongoing obligation, no monthly justification treadmill, no per-user server cost, and
Steam remains reachable later. → **Subscription:** Steam is structurally foreclosed as a primary channel
(Valve's own docs: recurring is "not a fully supported feature"; ads banned), and we inherit Let's Role's and
Astral's failure modes. If we host anything, follow Owlbear: charge for **storage and rooms**, never for
features — Roll20 charges for features and is the most complained-about product in the market.

**4. Do we operate hosted rooms in v1? — YES or NO.**
→ **YES:** the join-by-link promise is reliable on day one, we absorb bandwidth (Owlbear: 3 TB/month at
two people) and we defer the Plex-pattern PKI service indefinitely. → **NO:** self-hosting is the only path,
and we must either ship LAN-only-with-caveats or fund the DNS-zone + per-server-certificate-issuance service
in phase 0. **There is no third answer, and "self-hostable" on the intake page currently implies one that does
not exist.**

**5. May the Forge (WFC map generator + theme editor + rule-builder) be a separable, separately-shippable
product? — YES or NO.**
*Recommended: YES as an architectural permission, with the shipping decision deferred.*
→ **YES:** we keep the single highest-upside Steam play available — Dungeon Alchemist's exact playbook, no
group coordination, native to Steam's visual discovery machine, and it de-risks the venture because the tool
can win even if the VTT does not. → **NO:** the Forge stays welded to the table, and the only Steam SKU we
could ever ship is the one the evidence says performs worst there.

**6. Business entity and public address before any sale, Steam or direct? — YES or NO.**
*Recommended: YES, and it is cheap to get wrong expensively.*
→ EU DSA trader disclosure makes a solo developer's legal name and postal address **public** on marketplaces;
a German Impressum obligation attaches to direct sales too. Budget a business address service or incorporate
**before** onboarding anywhere. Also: get the W-8BEN + TIN right the first time — the Germany–US treaty takes
software royalty withholding to 0 %, and misconfiguring it costs 30 % of US revenue permanently and
unrecoverably.

**7. Do we ship optional runtime AI generators at all? — YES or NO.**
→ **YES:** on Steam this is "live-generated AI content" by Valve's January 2026 definition — mandatory
store-page disclosure, a documented guardrail story, and in-overlay player reporting — in a market where
Dungeon Alchemist advertises *"does not use any generative AI/LLMs"* as a trust signal. Off Steam the
compliance burden vanishes but the audience sentiment does not. → **NO:** we gain a clean, marketable trust
position and lose a pack feature that was always specified as optional and always-draft.

**8. Working title as the public/product name? — EITHER/OR.** (K-Q4, lowest rank but time-sensitive.)
→ Under a direct-sales strategy the domain and SEO start compounding from day one, so the name is worth
settling earlier than it would be on a storefront.

---

## Implications for design round 1

The fork's resolution narrows round 1 rather than opening it. Three candidates still, but they now compete on
architecture *within* a pinned runtime — not on runtime.

1. **The runtime is pinned; stop re-litigating it.** React/TS + PixiJS, DOM-authoritative, Electron shell.
   A "Steam-native engine" candidate is **struck** — B scored 2/2/2 across three independent lenses on cited
   evidence, and RB-02's rejection now survives its own re-litigation on native-relevant grounds. Candidates
   differentiate on **module boundaries, data model, package format and sync architecture**, not on toolkit.
2. **Every candidate must carry the eight boundaries (B1–B8) explicitly**, with the seam named and the adapter
   list shown. A candidate without a `Platform` port, a registry contract, and vendor-on-first-use is not a
   candidate — it is a prototype.
3. **Every candidate must answer reachability with a number, not a hope.** State which of hosted rooms /
   LAN-only / Plex-pattern PKI it ships in v1, what it costs per session-hour, and what a non-technical GM
   behind CGNAT actually experiences. **This is the single most under-priced problem in the whole evidence
   base, and it is charged to A, C and D alike.** The candidate that hand-waves it should lose on that ground
   alone.
4. **The differentiation thesis must be restated for a direct channel.** Under A/C-deferred, our discovery
   runs through **creators and system authors**, not gamers — that is precisely how Foundry grew 32 % then
   22 % YoY to 475 systems and 2,758 modules with no store at all. Consequence: the **visual rule-builder is
   not merely a flagship feature, it is the go-to-market**, and RB-08 L4 becomes a launch requirement —
   **UVTT and Foundry/Roll20/FG-shaped export ship at launch, not in phase 9.** Dungeon Alchemist reached the
   whole market by exporting to its rivals; every VTT that demanded migration fought a ten-year head start.
5. **Two spikes move into round 1 itself, before the stack is pinned: S5 (NVDA through the Electron shell) and
   S6 (measured installed size and idle RAM of our own bundle).** They gate the *shell*, which is now
   load-bearing for self-hosting. S1/S2/S3/S4 stay in the Steam gate and must not delay round 1.
6. **Candidates must show the theme/skin production budget**, because intake tension #5 explicitly deferred
   "how many skin kits ship at launch, and whether additional kits are first-party, commissioned or
   Workshop-supplied" to this verdict. **The answer: first-party for launch, community-supplied through our
   own registry (B2), Workshop only ever as a mirror.** Kaya must fund launch kits directly; there is no
   storefront ecosystem arriving to do it for us.
7. **The attack pass gets three new named targets.** Athena: the GM-machine-as-server trust model, and the
   package format's freedom from any code-execution escape hatch. Nemesis: break the browser/desktop parity
   rule (B8) on paper, and break a live session's package pin (B3). Ariadne: prove `.chronicle` round-trips a
   full campaign with zero Steam involvement (B6).

---

## Where the evidence is thin — Delphic honesty

Recorded so nothing here is quoted with more confidence than it earned.

- **S1 (Steam overlay on Electron) is unverified and load-bearing** for the Steam half. RB-09's author says so
  in the brief's own words.
- **Electron's real footprint on our bundle is unmeasured.** The 150–250 MB / 100–200 MB figures are
  order-of-magnitude only, self-flagged as such.
- **No brief measures touch/tablet UX for our own design.** RB-05 only observes that competitors neglect it.
  We are claiming an iPad advantage we have never tested.
- **The Workshop UGC statistics are correlational**, self-flagged by their authors, drawn from *games* where
  the UGC consumer owns the app — a condition our players do not meet.
- **Fantasy Grounds' free-to-play pivot has eight months of data and no public outcome.** It is a directional
  signal, not proof. Re-check CCU, review velocity and marketplace activity in Q4 2026.
- **Dungeon Alchemist's and TaleSpire's revenue figures are estimator-grade** (VG Insights behind a login,
  SteamDB blocking fetches). Treat as orders of magnitude.
- **Foundry's reason for avoiding Steam has no primary source.** We know only that they never did it, never
  explained it, and grew anyway. **Do not tell Kaya "Foundry rejected Steam because of the cut."**
- **Five Valve questions remain open** (RB-07 R13): app type *Game* for a system-agnostic VTT; SDR's
  contractual status and cost; whether a *Software*-typed app still needs the German rating questionnaire;
  Next Fest eligibility for non-game software; and what the SDA actually says about merchant-of-record status
  and our German VAT position.
- **Two legal questions need counsel, not more research:** whether Workshop bytes may reach non-Steam browser
  players at all, and whether CC BY-NC-SA content can live on a Workshop attached to a paid product under
  German law.
- **Tax and entity questions are a Steuerberater's, not mine.** Nothing in RB-07 or here is tax advice.

---

## The exciting answer, and why it is the wrong one

The exciting answer is Steam. Steam is 132–147 million monthly users, a Workshop that fills itself, a relay
that costs nothing, friends-list invites, four traffic spikes a year, and a page that sits next to TaleSpire
forever. It is genuinely, measurably better at the one thing we are worst at.

It is still the wrong answer today, for a reason that has nothing to do with Valve: **Steam compounds an
audience; it does not create one.** The median 2025 release earned $249. GM Forge shipped our exact model —
GM pays, players free in the browser, Workshop enabled, sane price — and has 83 reviews and one concurrent
player after eight years. Steam is a shelf. Shelves reward products that already have word of mouth, and we
have none yet.

So we build the thing that can stand on the shelf, and we do not pay for the shelf until we have something
worth putting on it. The architecture costs 5 % more today and forecloses nothing except the option all three
judges rejected.

> *Zwei Türen, ein Haus: die eine steht offen, die andre nur angelehnt.*
> *Wer beide zugleich durchschreiten will, bleibt in der Schwelle stehn.*

---

**Verdict of record:** Option **C** as architecture, option **A** as channel, option **D** as a later phase,
option **B** rejected. Workshop: a mirror, never a source. The Steam door stays unlocked, and closed, until
the gate is passed.
