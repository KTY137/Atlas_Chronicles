# Workshop & Networking

**Project Chronicle distribution-fork research, RB-10.** Access date for all sources: **2026-07-27**
(sibling briefs RB-01…RB-05 were accessed 2026-07-26). Feeds the K6 distribution verdict (RB-11).
Uncertain, dated, or single-source claims are marked **[uncertain]**. Legal questions are marked
**[legal — needs counsel]**; nothing here is legal advice.

**Bottom line up front.** Steam Workshop is a genuinely strong *distribution and discovery* channel
for exactly our content shape (declarative, data-only bundles), and the measured business effect of
official UGC support is large. But Workshop is a **transport, not a registry**: it is Steam-only,
its brand-new version control keys off Steam game branches rather than our semantic engine version,
and it confers **zero trust** on the content it serves. Meanwhile the networking story splits
cleanly: a Steam-only table gets Valve's relay for free and it is excellent; the asymmetric
"Steam GM + browser players" model (option D) requires us to additionally operate a DNS zone, a
certificate-issuance service and a relay — Plex's problem, at Plex's cost.

---

## Workshop mechanics

### The two integration models

- **Ready-to-Use Workshop** — items go live without developer approval; Steam auto-downloads
  subscriptions. Valve recommends it when you "want to support a larger number of items" and "want
  authors to be able to update content any time" ([Steamworks: Workshop](https://partner.steamgames.com/doc/features/workshop)).
- **Curated Workshop** — the developer approves each item and "you'll probably need an item server
  for managing ownership of the items." Required if items carry developer-assigned attributes
  (stats, balance values) or are sold ([Steamworks: Workshop](https://partner.steamgames.com/doc/features/workshop)).

### The publish/consume lifecycle (ISteamUGC)

Modern items use `ISteamUGC`; the old `ISteamRemoteStorage` path is legacy and some newer calls
"will not work with legacy ISteamRemoteStorage workshop items"
([Steamworks: Workshop Implementation](https://partner.steamgames.com/doc/features/workshop/implementation),
[ISteamUGC](https://partner.steamgames.com/doc/api/ISteamUGC)).

- **Publish:** `CreateItem()` → `StartItemUpdate()` → `SetItemTitle/Description/Content/Preview/
  Metadata` + `AddItemKeyValueTag()` → `SubmitItemUpdate()`.
- **The single most important fact for us:** "a workshop item is a representation of a **folder of
  files**" — `SetItemContent()` takes a directory, not a packed binary. Workshop is content-type
  agnostic ([Implementation guide](https://partner.steamgames.com/doc/features/workshop/implementation)).
- **Consume:** `SubscribeItem()` / `UnsubscribeItem()`, `DownloadItem()`, `GetItemState()`
  (`EItemState` flags incl. `k_EItemStateNeedsUpdate`), `GetItemDownloadInfo()`,
  `GetItemInstallInfo()` (returns the install path). "Subscribed files will be downloaded to the
  client in the order they were subscribed in."
- **Query/browse in-app:** `CreateQueryAllUGCRequest` / `CreateQueryUserUGCRequest` /
  `CreateQueryUGCDetailsRequest`; **50 results per page** (`kNumUGCResultsPerPage`), 1,000-item cap
  on a details request; `SetAllowCachedResponse` for caching.

### Metadata — the underrated feature

- `SetItemMetadata()` stores an arbitrary blob (up to `k_cchDeveloperMetadataMax` bytes) that "can
  be returned in queries **without having to download and install the item content**."
- `AddItemKeyValueTag()` — keys and values capped at **255 characters**, **max 100 per update**.

Together these give us a queryable index layer: package type, target system, engine compatibility
range, locale, content flags — resolvable *before* a single byte of content is fetched. This is
what makes a real dependency resolver possible on top of Workshop.

### Item types, collections, previews, size

- `EWorkshopFileType` distinguishes `k_EWorkshopFileTypeCommunity` (free, user-downloadable) from
  `k_EWorkshopFileTypeMicrotransaction` ("community-rated, developer-curated content like Team
  Fortress 2 uses"); collections are a first-class type used by TTS and Cities: Skylines for
  bundling.
- Previews: JPG/PNG/GIF, **under 1 MB** (`AddItemPreviewFile`), plus YouTube video previews.
- **Size:** Valve publishes **no universal hard cap** for `ISteamUGC` items — content goes to
  depots. What the developer *does* configure is the Steam Cloud "Byte quota per user" and "Number
  of files allowed per user" ([Implementation guide](https://partner.steamgames.com/doc/features/workshop/implementation);
  [Steam Cloud](https://partner.steamgames.com/doc/features/cloud)). Community reports of 200 MB /
  400 MB / 500 MB / 2 GB ceilings are **per-game developer settings or legacy-API artefacts**, not
  platform law ([Steam discussion](https://steamcommunity.com/discussions/forum/7/1697169163415862884/)) **[uncertain in detail]**.

### Paid Workshop items — current state (2026)

Yes, paid Workshop content exists and is not exotic. Mechanics:

- Runs through the **curated** model plus item definitions: "Steam will need to know which Workshop
  items are associated with which item definitions" and payment rules "so that Steam knows which
  users to allocate the appropriate portion of revenue from each sale." Valve handles payouts *and*
  "withholding necessary income tax for each item author"
  ([Steamworks: Workshop](https://partner.steamgames.com/doc/features/workshop)).
- **The split is ours to set, not Valve's.** "The percentage of Adjusted Gross Revenue that you are
  entitled to receive will be determined by the developer/publisher of the Application"; "The
  Publisher will have the ultimate discretion to determine the suggested retail price for your
  Contribution" ([Supplemental Workshop Terms – Revenue Sharing](https://steamcommunity.com/workshop/workshoplegalagreement/?appid=0)).
  A **25% creator share** is the commonly cited convention across Workshop programs, not a Valve
  rule ([generalistprogrammer, 2026](https://generalistprogrammer.com/tutorials/steam-workshop-paid-mods-earning-guide)) **[uncertain — secondary source]**.
- Payment cadence: "thirty (30) days from the end of the calendar month in which the Adjusted Gross
  Revenue was received"; "no payment is made earlier than **ninety (90) days** after the initial
  copy of a Contribution is distributed"; "You will not be entitled to any compensation for
  Contributions distributed for free."
- Valve reports creators have earned **$50M+** through Steam Workshop and has expanded paid
  Workshop to more games ([Steam news](https://store.steampowered.com/oldnews/15614)) **[headline/snippet only — not fully fetched]**.
- Historical caution: Valve's 2015 paid-Skyrim-mods launch was reversed within days after community
  backlash — **[background knowledge, not re-verified this session]**.

### Moderation & takedown tooling

- **Developer-side:** Steamworks Community Moderation lets team members with "Economy/Workshop
  Support" permission mark items **banned** or **incompatible**, and ban accounts from posting UGC
  entirely ([Steamworks: Community Moderation](https://partner.steamgames.com/doc/marketing/community_moderation),
  [Adding Moderators](https://partner.steamgames.com/doc/marketing/community_moderation/adding_moderators)).
- **Valve-side:** the SSA gives Valve the right "but not the obligation, to restrict or remove
  Workshop Contributions **for any reason**" (§6.B, [Steam Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/)).
- **DMCA is a liability we inherit and cannot control.** Reporting across 2025–2026 describes a
  process where complaints can be filed with little evidence, the accused's counter-evidence is
  reviewed *by the claimant*, and unretracted reports leave content down with account-suspension
  risk after roughly a month ([Vice](https://www.vice.com/en/article/steam-has-a-serious-dmca-problem-and-players-are-begging-valve-to-fix-it/),
  [Notebookcheck](https://www.notebookcheck.net/DMCA-abuse-on-Steam-is-out-of-control-and-Valve-isn-t-fixing-it.1084373.0.html),
  [Glass Almanac](https://glassalmanac.com/valves-silence-over-takedown-requests-is-shaking-steams-community/)) **[press reporting — Valve has not published process details]**.

### Why the channel matters at all — the numbers

GameDiscoverCo's 2025 analysis (~1,200 Steam games with >$1M first-month revenue, all official UGC
platforms counted — Workshop, mod.io, CurseForge, proprietary):

| Metric | UGC advantage |
| --- | --- |
| Revenue, year 1 | **+8%** |
| Revenue, year 5 | **+31%** |
| CCU retention after 2 years | **+75%** |
| CCU retention after 5 years | **+115%** |
| Total DLC revenue | **+105%** |
| Share of larger Steam games with official UGC | ~20% |

Authors explicitly flag correlation-vs-causation (UGC-enabled games skew to long-lifecycle genres)
([GameDiscoverCo](https://newsletter.gamediscover.co/p/analysis-ugc-still-powers-sales-and)).
Larian reported "+20% DAU across all platforms" after shipping BG3 mod support in 2024 (via the
same analysis).

**Precedent that a *tool* can carry a Workshop:** Wallpaper Engine is listed in Steam's **Software**
category and its Workshop shows **~2,842,820 entries**
([Workshop browse](https://steamcommunity.com/workshop/browse/?appid=431960)). Tabletop Simulator's
default filtered browse shows ~106,000 ([TTS Workshop](https://steamcommunity.com/workshop/browse/?appid=286160)).
A VTT-with-Workshop is not a stretch of the platform.

---

## Fit with declarative rule packages

Our packages — validated declarative bundles of schemas, sheet layouts, formula ASTs, dice tables,
locale files and tilesets, with a hard **no-code-execution** invariant — map onto Workshop almost
perfectly, because Workshop's unit *is a folder of files* and Valve imposes no opinion on what is
inside it.

**Proposed mapping:**

| Chronicle concept | Workshop mechanism |
| --- | --- |
| One rule package / theme / tileset | One Workshop item (`k_EWorkshopFileTypeCommunity`) |
| Package manifest (id, semver, deps, content hash) | `SetItemMetadata()` blob — readable in queries pre-download |
| Faceted search (type, system, engine range, locale, safety flags) | `AddItemKeyValueTag()` (≤100 tags, ≤255 chars each) |
| "Campaign starter kit" (rulepack + theme + tileset) | Workshop **collection** |
| In-app browser & install | `CreateQueryAllUGCRequest` + `SubscribeItem` + `GetItemInstallInfo` |
| Update available | `GetItemState()` → `k_EItemStateNeedsUpdate` |

**Ready-to-Use, not Curated.** A curated Workshop needs a human approving every item; with a solo
stakeholder that is a bottleneck by week two. The declarative format lets us substitute *machine*
curation: strict schema validation at import, resource budgets, and our own "verified" badge for
packages we sign. Reserve Curated for a later monetized-package tier (paid items require it).

**The strategic caveat — Workshop is a silo.** Workshop items are reachable only by owners of the
Steam build. This is precisely why TaleSpire, our closest Steam-native competitor, refused it:
developers stated they "don't want to lock mods into one ecosystem" and that Workshop would create
"a fractured userbase" across storefronts; they use **mod.io** with in-game integration and are
interested in community-hosted third-party repositories
([TaleSpire Q&A](https://steamcommunity.com/app/720620/discussions/0/3773490215217714515/),
[TaleSpire FAQ](https://talespire.com/faq)).

**mod.io as the cross-platform alternative:** REST API + open-source SDKs, Unreal/Unity plugins,
authorized middleware for Xbox/PS4/PS5/Switch, 11 storefronts, **automated scanning moderation**
("Every UGC submitted to mod.io is passed through automated scanning moderation … passed, censored,
rejected or flagged for manual review"), and a UGC Marketplace where the developer defines the
creator revenue share and price range ([mod.io docs](https://docs.mod.io/moderation),
[monetization](https://docs.mod.io/monetization/how-it-works), [platforms](https://docs.mod.io/platforms/),
[pricing](https://mod.io/pricing)).

**Architectural conclusion:** define our own package registry contract — id scheme, semver,
dependency graph, content hashing, validation — and make Workshop **one pluggable source** behind
it, alongside mod.io, a plain `.chronicle-pkg` zip, and (later) our own web registry. This costs
maybe two weeks more than hardwiring `ISteamUGC`, and it is the difference between a Steam feature
and a portable ecosystem. It also keeps option C/D alive at zero marginal cost.

---

## Threat model & versioning lessons

### Workshop distribution does **not** make content trusted

Valve hosts and serves; Valve does not vet. Two 2026 incidents make this concrete:

1. **Wallpaper Engine (reported ~2026-06-18, Kaspersky).** Malicious "animated wallpapers" deployed
   a backdoor and a credential-harvesting executable; attackers could "change your password, steal
   your credit card information, and upload more infested wallpapers under your name." Dozens of
   items, each downloaded thousands to tens of thousands of times; ~89% of victims in China
   ([BGR](https://www.bgr.com/2197808/steam-workshop-wallpaper-engine-spreading-malware/),
   [Panda Security](https://www.pandasecurity.com/en/mediacenter/how-hackers-used-steam-workshop-spread-malware/)).
2. **Meccha Chameleon (2026-07-24 → 26).** A community map used **UE5 Blueprint logic** to write a
   batch file into the user's Documents folder, then "launch a hidden PowerShell process in an
   attempt to retrieve an additional payload from a remote server." Developers were themselves
   infected while analysing it, which appears to have led to the compromise of the official Discord.
   A patch shipped "blocking Workshop maps from performing this behavior"; per one report,
   replacement malicious maps were uploaded before the underlying hole was closed
   ([mxdwn](https://games.mxdwn.com/news/meccha-chameleon-developers-patch-steam-workshop-malware-as-discord-hack-investigation-continues/),
   [Windows Central](https://www.windowscentral.com/gaming/pc-gaming/meccha-chameleon-steam-workshop-malware),
   [Digital Trends](https://www.digitaltrends.com/gaming/meccha-chameleon-steam-workshop-malware-custom-map/)) **[developing story]**.

**The common cause in both: the content format was expressive enough to execute.** Web wallpapers
are HTML/JS; UE5 maps carry Blueprints, a scripting VM with filesystem and process reach. Our
no-code invariant is exactly the right countermeasure — and it is only real if the format has **no
escape hatch**: no embedded HTML/JS/Lua, no SVG with script, no arbitrary URL fetch from package
data, no shell-out, no dynamic asset loading by path.

### Tabletop Simulator is the anti-pattern in our own genre

TTS mods carry Lua. The result is **self-replicating script infections**: scripts copy themselves
between objects inside a save, and objects saved out of an infected table carry the infection into
clean tables. The community had to build and publish disinfection tooling *as Workshop items*
("TTS Script Infection Removal Tools", "Malicious Script Check", "Disinfector Table")
([Steam Workshop item 3667504645](https://steamcommunity.com/sharedfiles/filedetails/?id=3667504645),
[3062067951](https://steamcommunity.com/sharedfiles/filedetails/?id=3062067951),
[BoardGameGeek thread](https://boardgamegeek.com/thread/2258533/security-concerns-about-tabletop-simulator)) **[community-sourced; not vendor-confirmed]**.
This is the exact future of a scriptable VTT with an open Workshop, and it is the strongest
empirical argument for our invariant that exists.

### Residual attack surface even with zero code execution

| Surface | Countermeasure |
| --- | --- |
| Decompression bombs, multi-GB tilesets, deeply nested JSON | Size + depth + entry-count budgets before parse; streaming validation |
| Formula-AST evaluation blowup (recursion, reference cycles) | Total-by-construction evaluator: cycle detection, step budget, wall-clock cap, no unbounded loops |
| Media decoders (PNG/WebP/OGG) — the real memory-safety surface | Format allowlist; re-encode on import; decode in a restricted worker/process |
| Locale/text injection into UI | Treat all package strings as data; no HTML rendering of package text |
| Impersonation ("official HtbaH pack") | Reserved-namespace ids; publisher verification; visible provenance in the install UI |
| Illegal/hateful imagery or text in tilesets | Report flow + our own ban list; Valve will not do this for us |
| Provenance | Content-address every package; sign first-party ones; show hash + source in the campaign |

Add a **quarantine state**: an imported package that has not passed full validation can be inspected
but cannot be loaded into a live session.

### Versioning — Workshop just changed, and it is not enough for us

Historically, Workshop had **no versioning**: subscribers always received the author's latest
upload, and a game patch broke every mod at once (the "modpocalypse").

**On 2026-01-09 Valve shipped Workshop version control**
([Steamworks announcement](https://store.steampowered.com/news/group/4145017/view/497183817277113900),
[PC Guide](https://www.pcguide.com/news/latest-steam-update-finally-stops-mods-from-breaking-when-game-developers-release-a-new-patch/),
[PC Gamer](https://www.pcgamer.com/software/platforms/steam-workshop-just-got-version-control-hopefully-making-it-less-of-a-headache-when-game-updates-break-all-our-mods/)):

- Developers opt in via an **"Enable Game Branch Versions"** setting in Steamworks.
- Authors can then "upload multiple versions of the same mod under a single Workshop item. Each mod
  version can be tagged to work with specific game versions, or marked as compatible with all
  versions."
- "If more than one version of a Workshop item is compatible with a player's current game version,
  the **latest uploaded version** will be the one that Steam downloads."
- API surface: `ISteamUGC::SetRequiredGameVersions` (min/max Steam beta branch),
  `GetNumSupportedGameVersions`, `GetSupportedGameVersionData`
  ([ISteamUGC](https://partner.steamgames.com/doc/api/ISteamUGC)).
- **Limits:** opt-in only; Valve "strongly recommends that game developers communicate clearly with
  mod authors before enabling version support"; the reviewed documentation describes **no
  player-facing pin/rollback UI**, and compatibility is keyed to **Steam branches**, not to our
  semantic engine version **[uncertain — verify in Steamworks partner docs once we have access]**.

**The consequence for our pinned-campaign requirement is decisive.** Steam selects a version per
*game branch*, per *client*. Our requirement is per *campaign*: "this table runs rulepack v1.4
until the GM chooses otherwise." Steam cannot express that, and will happily replace the installed
folder under a running campaign.

> **Hard architectural rule:** on first use, the resolved package is **copied into the campaign,
> content-addressed by hash**. The Workshop copy is a *source*, never the live artefact. A campaign
> upgrade is an explicit, diffable, undoable GM action with a declarative migration.

### Lessons from three mod ecosystems

- **Factorio** — `info.json` carries `dependencies` plus a base-version constraint; the portal
  separates **required** from **optional** dependencies. The community's hard-won rules: treat
  "loads" and "fully integrated" as different categories, and understand that the real failure mode
  is not that dependencies exist but that "dependency targets stop updating or version prerequisites
  misalign" ([Factorio Modding FAQ](https://wiki.factorio.com/Tutorial:Modding_FAQ),
  [compatibility guide](https://factorio-wiki.pages.dev/en/tips/mod-compatibility-check)).
- **Foundry VTT** — manifests declare a `compatibility` object with **minimum / verified / maximum**
  core versions; "nothing stops a user from installing the package on a version of Foundry Core that
  is higher than this" — i.e. *verified* is an honesty signal, not enforcement. The manifest format
  itself has broken across major versions, orphaning old packages and spawning community tools that
  exist purely to rewrite stale manifests
  ([Foundry: Package Management](https://foundryvtt.com/article/package-management/),
  [Versioning and Releases](https://foundryvtt.com/article/versioning/),
  [v10 Manifest Migration](https://foundryvtt.com/article/manifest-migration-guide/),
  [foundry-module-fixer](https://github.com/Remgr12/foundry-module-fixer)).
- **Cities: Skylines II** — Paradox abandoned Steam Workshop entirely for **Paradox Mods**,
  explicitly to reach PS5/Xbox, accepting a less mature platform and a rocky transition rather than
  "lock the mods to only the PC release"
  ([PC Gamer](https://www.pcgamer.com/cities-skylines-2-wont-use-steam-workshop-for-mod-sharing/),
  [Shacknews](https://www.shacknews.com/article/137409/cities-skylines-2-paradox-mods-no-steam-workshop-nexus-support)).
  Confirms: Workshop = PC/Steam silo, by design.

**Rules to adopt from all three:** semver the *package API*, not the app; `engine: ">=2.1 <3"`
ranges in every manifest; required vs. optional dependencies as distinct fields; a `verifiedAgainst`
field that is advisory and *labelled* advisory; refuse-to-load with a readable diagnostic rather
than best-effort partial load; declarative (data-driven) migrations, since we have no code; and
never auto-upgrade a package inside an active campaign.

---

## Multiplayer paths without a browser

### Steam Networking + Steam Datagram Relay (SDR)

Valve's "virtual private gaming network." Traffic rides the Valve backbone through a global relay
network; "IP addresses are never revealed," and all traffic is "authenticated, encrypted, and
rate-limited" — which is DoS protection for both host and players. It supports **peer-to-peer and
dedicated servers**, with a ticket flow that authorizes "a specific client to talk to a specific
gameserver, for a limited amount of time." The SDK also has built-in fallback to "direct UDP
connectivity or attempt NAT punch." API: `CreateListenSocketP2P`, `ConnectP2P`,
`ConnectToHostedDedicatedServer` ([Steamworks: SDR](https://partner.steamgames.com/doc/features/multiplayer/steamdatagramrelay),
[ISteamNetworkingSockets](https://partner.steamgames.com/doc/api/ISteamNetworkingSockets)).

**Cost:** the documentation states no price — it is a Steamworks partner benefit, effectively free
with a Steam release **[no explicit pricing published; treat as "included" but unpriced]**. No
bandwidth limits are documented either **[uncertain]**.

**The Steam lock-in is explicit and important:**

- The **open-source GameNetworkingSockets** library gives you the transport (reliable/unreliable
  UDP, fragmentation, encryption, NAT traversal) but *not* the relay: "Steam's authentication
  service, signaling service, and the SDR relay service" are Steam-only, and "at this time we are
  not able to offer access to SDR on other platforms to all partners"
  ([GitHub: GameNetworkingSockets](https://github.com/ValveSoftware/GameNetworkingSockets)).
- **Non-Steam clients** *can* be admitted to the relay if the game "has a version shipping on Steam"
  and the developer agrees "to update your game within a reasonable timeframe (a few months)" for
  bugfixes/security. But Valve "cannot promise that this service will always be available to
  non-Steam players" ([Steamworks: SDR](https://partner.steamgames.com/doc/features/multiplayer/steamdatagramrelay)).
  So: a *request*, not an entitlement — and irrelevant for browsers, which cannot speak SDR's UDP
  protocol regardless.

### Steam lobbies, friends & invites

Lobby API, rich presence and friends-list "join game" give a Steam-native table genuinely
best-in-class onboarding — the "click invite, they're in" experience that browser VTTs approximate
with copy-pasted links and account signups. This is a real product advantage of option B. The price:
"who can sit at the table" becomes "who has a Steam account with the app."

### Remote Play Together — not a player client

- "Only the host needs to own and install the game"; "up to four players — or even more with fast
  connections"; voice chat included; not supported for VR
  ([Steam Remote Play](https://store.steampowered.com/remoteplay)).
- Enabled automatically for titles flagged **Local Multiplayer / Local Co-op / Shared-Split Screen**;
  `ISteamRemotePlay::BSendRemotePlayTogetherInvite()` for in-game invites
  ([Steamworks: Remote Play](https://partner.steamgames.com/doc/features/remoteplay)).
- **It is video streaming plus input forwarding, not a networked session.** Every remote participant
  sees *the host's screen*. Keyboard/mouse is the host's single shared device; controllers are the
  intended input, and community reports describe awkward multi-keyboard behaviour
  ([Steam Remote Play discussions](https://steamcommunity.com/groups/homestream/discussions/0/3111395750251871358/)).

**Verdict: RPT is disqualified as our player channel.** Our product premise is *asymmetric*
GM/player views with server-authoritative permissions. RPT structurally cannot show a player a
different view from the GM's — sharing one screen would leak every GM secret. Use it at most as a
"let a friend watch over your shoulder" convenience, never as the player experience.

### Our own server/relay

Full control; works for browsers, non-Steam buyers and self-hosters; matches the pack's original
invariant. Cost: hosting, TURN/relay bandwidth (map and media bytes, not just deltas), TLS, uptime,
abuse handling, and an operational burden that never ends. Valve gives the equivalent relay away —
that saving is the single largest concrete engineering argument for a Steam-only path.

---

## The asymmetric setup — what it really costs

Option D — GM buys a Steam/native host client, players join free from a browser (the
Fantasy Grounds Ultimate / Foundry pattern) — is the most seductive *business* model on the table
and the most expensive *engineering* one. The bill, itemised:

1. **The desktop app becomes a server.** It must embed an HTTP + WebSocket server. Technically
   routine; strategically not: the app now needs authn/authz, session tokens, rate limiting, request
   validation and an update story for security fixes on a socket exposed to the LAN and possibly the
   open internet. "Untrusted input" now includes the network, not just uploads.
2. **Reachability — pick your poison.**
   - *Port forwarding / UPnP*: fails behind **CGNAT** (common on German mobile and some cable ISPs),
     fails on corporate/university/dorm networks, and asking a GM to configure a router is a
     conversion killer.
   - *A hosted relay/tunnel we operate*: works everywhere, costs money proportional to
     session-hours × media bytes — and means we are a hosting company after all, which was the thing
     leaving the browser was supposed to avoid.
   - *SDR*: solves NAT beautifully — **for Steam clients only**. Browsers cannot use it.
3. **TLS — the cost the pack never priced.** A browser page served over HTTPS may not open
   `ws://192.168.x.x` (mixed content), and a serious web app needs HTTPS anyway. A home LAN IP
   cannot obtain an ordinary public certificate. The proven solution is **Plex's**: own a domain,
   issue a per-server wildcard certificate, and hand the browser a hostname like
   `192-168-1-7.<server-hash>.chronicle.direct` that resolves to the server's local IP and matches
   the certificate the GM's app holds — "the wildcard certificate is valid for any IP used, and the
   user/server/hash makes it so a certificate can only be used to authenticate a specific server"
   ([filippo.io: How Plex is doing HTTPS for all its users](https://words.filippo.io/how-plex-is-doing-https-for-all-its-users/),
   [notes.billmill.org](https://notes.billmill.org/programming/DNS/How_plex_is_doing_HTTPS_for_all_its_users.html),
   [Plex support](https://support.plex.tv/articles/206225077-how-to-use-secure-server-connections/)).
   It works — Plex runs it at millions-of-users scale — but it means **we permanently operate a DNS
   zone, a certificate-issuance service, a per-install enrolment/identity flow, and cert rotation**.
   Plex also had to push *every* server onto HTTPS because mixed-content blocking made HTTP servers
   unreachable from the web app, and reported difficulty finding one configuration that satisfied
   all client types. Self-signed certificates are not a humane option for non-technical GMs.
4. **Two clients, one soul.** The native GM client and the browser player client must agree on
   rendering, theming (K1), diegetic UI (K7) and the rule-package engine. Every WFC map, sprite and
   theme must look right in both, or we have shipped two products with one budget.
5. **Workshop content cannot flow to browser players as files.** Workshop items download only to
   owners of the Steam app. The host can *render* Workshop content and stream state — but sending
   the package bytes to a non-Steam browser client is redistribution of a third party's Workshop
   contribution outside Steam. The SSA grants rights to *Valve* and, for accepted in-app
   distribution, the developer; it does not obviously grant us the right to re-host arbitrary
   contributor content on our own infrastructure for non-Steam users
   ([SSA §6.B](https://store.steampowered.com/subscriber_agreement/)) **[legal — needs counsel]**.
   Practically this forces browser players onto a thin client that never holds the package, which
   constrains offline behaviour and pushes latency-sensitive work back to the host.
6. **Support becomes the product.** "It works for me but Lisa can't connect" will be ticket #1
   forever. Fantasy Grounds' historical connection-troubleshooting reputation is the cautionary tale
   in our own market **[see RB-01-fantasy-grounds; not re-verified this session]**.

**Honest summary:** option D ≈ *a Steam game + a web app + a DNS/PKI service + a relay service*.
Options B (Steam-only, SDR, no browser) and A (browser-first, our servers) are each strictly cheaper.
D buys the best business story — GM pays, players free, Steam discovery, Workshop ecosystem — at the
highest engineering price, and it is the only option that needs *both* Valve's platform and our own.

---

## Cloud saves & portability

- **Quota is ours to set, and the ceiling is generous.** Steam Cloud enforces a "Byte quota per
  user" and "Number of files allowed per user" **per-user-per-game**; the Steamworks admin panel
  accepts up to **100,000,000,000 bytes (~93 GiB)**
  ([Steam Cloud](https://partner.steamgames.com/doc/features/cloud),
  [Facepunch.Steamworks wiki](https://wiki.facepunch.com/steamworks/SteamRemoteStorage)).
- **Per-file limits are the real constraint:** **100 MB** maximum for a single
  `ISteamRemoteStorage::FileWrite` / `FileWriteStreamWriteChunk` call, and files around **256 MB**
  "may result in a non-optimal storage endpoint choice for the user's location, negatively impacting
  upload/download performance."
- **Steam Auto-Cloud** (no code; declare file groups, Steam syncs on launch/exit) vs the
  **ISteamRemoteStorage API** (explicit control, `SetSyncPlatforms`). **Dynamic Cloud Sync** pulls
  changes during an active session but is designed for Steam Deck suspend/resume, not for concurrent
  multi-writer editing.
- **Shape mismatch, not size mismatch.** Steam Cloud is a *single-user file sync store*. A campaign
  is (a) shared among several people, (b) potentially gigabytes of maps and media, and (c) mutated
  concurrently during a live session. It can carry the GM's campaign database, package pins and
  settings; it cannot be the campaign backend.

**Recommended split:**

| Data | Home |
| --- | --- |
| Campaign DB, package pins, settings, small handouts | Steam Cloud (chunked <100 MB/file) |
| Large maps, sprite atlases, audio, video handouts | Local content-addressed library; optional our-cloud or user's own storage |
| Workshop packages | *Never* stored as bytes in the campaign export — store `{workshopId, version, sha256}` references, plus a vendored copy only where the licence allows |
| Portability | Our own `.chronicle` export bundle — the invariant already requires it |

Steam Cloud must **not** become the portability story: it is Steam-only, per-app, and vanishes the
moment a user leaves the platform. Our export/import bundle stays the guarantee, and it must be able
to round-trip a campaign with zero Steam involvement. That single rule keeps the Steam decision
reversible.

---

## Licensing interplay

**The sharp question: can CC BY-NC-SA content live on a Workshop attached to a paid product?**

### The facts

- **"How to be a Hero" is CC BY-NC-SA 4.0** — a free German system originating at Rocket Beans, now
  run by a registered Verein ([rollenspiel-kompass.de](https://rollenspiel-kompass.de/regelwerk/how-to-be-a-hero/),
  [howtobeahero.de](https://howtobeahero.de/)).
- **CC's NonCommercial term** prohibits uses "primarily intended for or directed toward commercial
  advantage or monetary compensation." CC's own guidance stresses it turns on the *use*, not the
  user: a for-profit's use is not automatically commercial, a non-profit's is not automatically
  non-commercial, and "primarily" is doing heavy lifting. CC deliberately declines to enumerate
  cases ([CC: NonCommercial interpretation](https://wiki.creativecommons.org/wiki/NonCommercial_interpretation),
  [CC BY-NC 4.0 legal code](https://creativecommons.org/licenses/by-nc/4.0/legalcode.en)).
- **Steam Subscriber Agreement §6.D:** contributors warrant they hold "sufficient rights in all User
  Generated Content" **and**, for Workshop specifically, that the contribution "was originally
  created by you." **§6.B:** contributions are "in principle made available to Subscribers for free.
  By way of exception, they may be made available to Subscribers for a fee"; Valve may remove them
  "for any reason" ([SSA](https://store.steampowered.com/subscriber_agreement/)).
- **ShareAlike compatibility:** "currently, no non-CC licenses have been designated as compatible
  with BY-SA 3.0" ([CC compatible licenses](https://creativecommons.org/compatiblelicenses)).

### The analysis

1. **The originality warranty is the first wall — before NC is even reached.** A user uploading an
   HtbaH package is not the original creator of the HtbaH rules. Even a scrupulously CC-compliant
   derivative contradicts the plain text of §6.D. Valve does not police this in practice, but it
   means every third-party-system package on our Workshop rests on a contributor misrepresentation,
   removable at Valve's discretion with no appeal.
2. **NC + free item + paid host app is genuinely unsettled.** *For:* the item is free, the uploader
   is uncompensated, and the use is fan/community use — "primarily" non-commercial. *Against:* the
   content sits inside a commercial ecosystem where, on the GameDiscoverCo numbers above, UGC
   measurably raises the paid product's revenue and retention; both Valve and we take a platform
   benefit from its presence. **German case law is the reason to take this seriously rather than
   hand-wave it:** LG Köln (2014-03-05, 28 O 232/13) held that "non-commercial" in CC means
   **purely private** use, convicting Deutschlandradio for using a CC BY-NC photo on
   dradiowissen.de; OLG Köln (2014-10-31, 6 U 60/14) partly reversed, holding that the licence text
   does not unambiguously settle whether such use falls under the NC exclusion
   ([netzpolitik](https://netzpolitik.org/2014/urteil-des-lg-koeln-zu-creative-commons-im-oeffentlich-rechtlichen-rundfunk/),
   [offenenetze.de](https://www.offenenetze.de/2014/11/25/olg-koeln-zum-begriff-noncommercial-in-creative-commons-lizenzen-urteil-des-lg-koeln-teilweise-abgeaendert/),
   [medien-internet-und-recht.de](https://medien-internet-und-recht.de/volltext.php?mir_dok_id=2656)).
   The outcome of that saga is *legal uncertainty in our home jurisdiction*, not a green light.
   **[legal — needs counsel]**
3. **Monetized Workshop items make it clearly impermissible.** The moment any NC-derived content
   touches a paid item, a revenue share, or a paywalled tier, NC is breached under any reading.
   **Decision rule: NC content and monetized UGC must be architecturally separated — enforced by the
   manifest's `license` field, not by a policy page.**
4. **ShareAlike is a second, independent problem.** SA requires derivatives under the same licence;
   the SSA grant to Valve is broad, non-exclusive and includes modification rights (for
   compatibility, and for contributions accepted for in-app distribution). Whether that can coexist
   with SA is the classic unresolved question, and CC lists no non-CC licence as BY-SA-compatible.
   *Mitigation:* accept SA content only as **separately-licensed data files** that ship the licence
   text and attribution inside the package, and never merge SA content into our proprietary assets
   or themes.
5. **A live data point.** A Tabletop Simulator Workshop item, "Pen and Paper How to be a Hero"
   (creator roboter5123, ~1,176 subscribers, ~1,652 unique visitors), exists — and is currently
   **removed for violating Steam Community & Content Guidelines**, visible only to its creator
   ([item 1703895881](https://steamcommunity.com/sharedfiles/filedetails/?id=1703895881)). The stated
   reason is not public and this may be unrelated to licensing — do not over-read it — but it is a
   concrete instance of exactly this content class disappearing without explanation.
6. **DMCA exposure is asymmetric and outside our control** (see Workshop mechanics above). As the
   app developer we cannot arbitrate takedowns; we can only lose content our users' campaigns depend
   on. This is a strong second argument for the **vendor-on-first-use** rule: a campaign that has
   already copied its packages survives a Workshop takedown.

### Policy we should adopt regardless of the distribution verdict

- Mandatory, validated manifest fields: `license` (SPDX or CC identifier), `attribution`,
  `sourceUrl`, `derivedFrom`. Import fails without them.
- The client displays licence and attribution wherever the content is used — attribution compliance
  becomes automatic instead of aspirational.
- Workshop/registry guidelines state plainly: uploaders warrant originality or explicit written
  permission; NC-licensed content may not be used anywhere monetization touches; SA content ships
  as separable data with its licence attached.
- The official HtbaH package ships **only** with the Verein's written permission, from us, signed —
  not from a Workshop upload. (This matches the pack's existing invariant: "no copyrighted rulebook
  content without licence"; an original demo system unblocks development.)

---

## Implications

1. **Workshop is a real, quantified growth channel — take it, but through an abstraction.** The
   measured UGC effect (+31% revenue at year 5, +115% CCU retention at year 5) is large enough to
   move the distribution verdict, and our content is Workshop-shaped to an unusual degree because
   Workshop items are literally folders of files with queryable metadata. But build a **Chronicle
   package registry contract** first and make `ISteamUGC` one adapter behind it, with mod.io, plain
   zip and a future web registry as siblings. This costs little now and keeps options A, C and D
   alive; TaleSpire and Cities: Skylines II both refused Workshop precisely because it is a
   PC/Steam silo.
2. **Workshop confers distribution, never trust — and our no-code invariant is the differentiator
   that makes an open Workshop survivable.** The 2026 Wallpaper Engine and Meccha Chameleon
   incidents, and TTS's self-replicating Lua infections, all trace to formats expressive enough to
   execute. We should say this out loud in marketing: *"our packages cannot run code, by
   construction."* It is a real safety claim, a genuine competitive line against TTS and Foundry
   modules, and it must be defended in the format design (no embedded scripting, no HTML rendering
   of package text, resource budgets, media re-encoding, quarantine state).
3. **Steam's January-2026 Workshop version control helps but does not solve our pinning
   requirement.** It selects by Steam game branch, per client; we need selection per campaign. The
   non-negotiable consequence is **vendor-on-first-use**: resolve, hash, copy into the campaign, and
   never auto-upgrade a package inside a live campaign. This also immunises campaigns against
   Workshop takedowns and abandoned authors — the failure mode Factorio and Foundry both teach.
4. **Networking splits the distribution fork cleanly.** A Steam-only table gets SDR — encrypted,
   relayed, DoS-protected, NAT-free, unpriced — plus friends-list invites, which is the best
   onboarding in the VTT market. Remote Play Together is disqualified as a player channel because it
   shares one screen and would leak every GM secret. The asymmetric option D costs *a Steam game
   plus a web app plus a Plex-style DNS/PKI service plus a relay*; it should only be chosen with
   that bill written down and accepted, not assumed away.
5. **Licensing is the sharpest unresolved risk, and it is sharpest in our home market.** Steam's
   originality warranty is violated by essentially every third-party-system package; NC content on a
   Workshop attached to a paid product is legally unsettled, and the Kölner Deutschlandradio cases
   show German courts reading NC narrowly and then declaring it ambiguous. Ship mandatory
   licence/attribution metadata from the first package format revision, forbid NC anywhere near
   monetization, and treat an official HtbaH package as a permission-and-contract question for the
   Verein, never as a Workshop upload.

---

## Risks

| # | Risk | Severity | Mitigation |
| --- | --- | --- | --- |
| R1 | **Workshop lock-in.** Hardwiring `ISteamUGC` makes the ecosystem unreachable from any non-Steam build, foreclosing options A/C/D and console/mobile forever. | High | Registry abstraction from day one; Workshop, mod.io, zip and web registry as adapters. |
| R2 | **A single code-execution escape hatch destroys the safety claim** (embedded HTML, SVG script, remote asset URLs, an "eval" in the formula language). TTS and Meccha Chameleon show how fast this is weaponised. | Critical | Athena owns the format threat model; no expressive construct enters the package spec without an attack pass; fuzz the validator; quarantine unvalidated packages. |
| R3 | **Version drift breaks live campaigns.** Steam's version control is branch-keyed, opt-in, and offers no per-campaign pin; an author's v2.0 can land mid-campaign. | High | Vendor-on-first-use with content hashing; explicit, undoable, migration-backed upgrades; refuse-to-load with a readable diagnostic. |
| R4 | **Dependency hell.** Shared library packages (dice engines, base themes) going unmaintained is the Factorio failure mode; Foundry's advisory `verified` field enforces nothing. | Medium | Required/optional dependency split; strict `engine` ranges; a maintained first-party base package set; publish an abandonment policy. |
| R5 | **DMCA / takedown exposure we cannot arbitrate.** Steam's process is widely reported as abusable; Valve may remove items "for any reason." | Medium-High | Vendored campaign copies survive takedowns; our own registry as fallback distribution; documented dispute guidance for creators. |
| R6 | **NC/SA licence breach.** HtbaH and much community content is CC BY-NC-SA; German case law on NC is narrow-then-ambiguous; SA has no designated non-CC compatible licence. | High **[legal]** | Mandatory `license`/`attribution` manifest fields validated at import; hard block on NC content in any monetized path; SA content only as separable data; counsel review before any paid Workshop tier. |
| R7 | **Option D's hidden infrastructure bill** — DNS zone + per-server certificate issuance + relay + a second client — discovered after the stack is pinned. | High | Price it explicitly in RB-11; if D is chosen, the Plex-pattern PKI service is a named phase-0 workstream, not a detail. |
| R8 | **Remote Play Together mistaken for a player channel** in planning or marketing; it shares the host's single screen and cannot support asymmetric GM/player views. | Medium | Written out of the architecture now; permitted only as spectator convenience. |
| R9 | **Steam Cloud treated as portability.** Per-file 100 MB caps, single-user sync semantics, Steam-only. | Medium | Steam Cloud for the campaign DB only; `.chronicle` export bundle is the portability guarantee and must round-trip without Steam. |
| R10 | **Moderation burden lands on a solo stakeholder.** Valve moderates almost nothing proactively; Ready-to-Use means anything ships. | Medium | mod.io-style automated scanning as a model; report flow + ban list in the client; consider mod.io if its automated moderation pipeline is worth the platform fee. |
| R11 | **SDR access for non-Steam clients is discretionary.** Valve "cannot promise that this service will always be available to non-Steam players." | Medium | Never make a non-Steam client's connectivity depend solely on SDR; keep our own relay path designed even if unbuilt. |

---

## Sources

**Steamworks / Valve (primary)**
- [Steam Workshop (Steamworks Documentation)](https://partner.steamgames.com/doc/features/workshop)
- [Steam Workshop Implementation Guide](https://partner.steamgames.com/doc/features/workshop/implementation)
- [ISteamUGC Interface](https://partner.steamgames.com/doc/api/ISteamUGC)
- [ISteamNetworkingSockets Interface](https://partner.steamgames.com/doc/api/ISteamNetworkingSockets)
- [Steam Datagram Relay](https://partner.steamgames.com/doc/features/multiplayer/steamdatagramrelay)
- [Steam Remote Play (Steamworks)](https://partner.steamgames.com/doc/features/remoteplay) · [Steam Remote Play (store)](https://store.steampowered.com/remoteplay)
- [Steam Cloud](https://partner.steamgames.com/doc/features/cloud)
- [Community Moderation](https://partner.steamgames.com/doc/marketing/community_moderation) · [Adding Community Moderators](https://partner.steamgames.com/doc/marketing/community_moderation/adding_moderators)
- [Steam Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/) (§6.A–6.D, UGC & Workshop)
- [Supplemental Workshop Terms – Revenue Sharing](https://steamcommunity.com/workshop/workshoplegalagreement/?appid=0)
- [Steamworks Development: New! Version Control For Steam Workshop Mods](https://store.steampowered.com/news/group/4145017/view/497183817277113900) (2026-01-09) · [community mirror](https://steamcommunity.com/groups/steamworks/announcements/detail/497183817277113901)
- [Content Creators Earn Over $50M Through Steam Workshop](https://store.steampowered.com/oldnews/15614) **[snippet only]**
- [ValveSoftware/GameNetworkingSockets (GitHub)](https://github.com/ValveSoftware/GameNetworkingSockets)

**Workshop version control — press**
- [PC Guide: Latest Steam update finally stops mods from breaking…](https://www.pcguide.com/news/latest-steam-update-finally-stops-mods-from-breaking-when-game-developers-release-a-new-patch/)
- [PC Gamer: Steam Workshop just got version control](https://www.pcgamer.com/software/platforms/steam-workshop-just-got-version-control-hopefully-making-it-less-of-a-headache-when-game-updates-break-all-our-mods/)

**Security incidents & UGC threat model**
- [BGR: The Steam Workshop Is Being Used To Spread Malware To Thousands Of Users](https://www.bgr.com/2197808/steam-workshop-wallpaper-engine-spreading-malware/) (Wallpaper Engine, ~2026-06-18, Kaspersky-sourced)
- [Panda Security: Steam Workshop — How Hackers Spread Malware](https://www.pandasecurity.com/en/mediacenter/how-hackers-used-steam-workshop-spread-malware/)
- [mxdwn: Meccha Chameleon Developers Patch Steam Workshop Malware](https://games.mxdwn.com/news/meccha-chameleon-developers-patch-steam-workshop-malware-as-discord-hack-investigation-continues/) (2026-07-25/26)
- [Windows Central: Meccha Chameleon Steam Workshop malware](https://www.windowscentral.com/gaming/pc-gaming/meccha-chameleon-steam-workshop-malware) · [Digital Trends](https://www.digitaltrends.com/gaming/meccha-chameleon-steam-workshop-malware-custom-map/)
- [Steam Workshop: TTS Script Infection Removal Tools](https://steamcommunity.com/sharedfiles/filedetails/?id=3667504645) · [Malicious Script Check](https://steamcommunity.com/sharedfiles/filedetails/?id=3062067951) · [Disinfector Table](https://steamcommunity.com/sharedfiles/filedetails/?id=2964935541)
- [BoardGameGeek: Security Concerns about Tabletop Simulator](https://boardgamegeek.com/thread/2258533/security-concerns-about-tabletop-simulator)

**DMCA / moderation criticism**
- [Vice: Steam Has a Serious DMCA Problem](https://www.vice.com/en/article/steam-has-a-serious-dmca-problem-and-players-are-begging-valve-to-fix-it/) · [Notebookcheck](https://www.notebookcheck.net/DMCA-abuse-on-Steam-is-out-of-control-and-Valve-isn-t-fixing-it.1084373.0.html) · [Glass Almanac](https://glassalmanac.com/valves-silence-over-takedown-requests-is-shaking-steams-community/)

**Comparable ecosystems**
- [TaleSpire FAQ](https://talespire.com/faq) · [TaleSpire Q&A: "A workshop would be a wonderful idea"](https://steamcommunity.com/app/720620/discussions/0/3773490215217714515/)
- [mod.io: Moderation](https://docs.mod.io/moderation) · [Monetization](https://docs.mod.io/monetization/how-it-works) · [Console platforms](https://docs.mod.io/platforms/) · [Pricing](https://mod.io/pricing)
- [Factorio Modding FAQ](https://wiki.factorio.com/Tutorial:Modding_FAQ) · [Factorio mod compatibility guide](https://factorio-wiki.pages.dev/en/tips/mod-compatibility-check)
- [Foundry VTT: Package Management](https://foundryvtt.com/article/package-management/) · [Versioning and Releases](https://foundryvtt.com/article/versioning/) · [v10 Manifest Migration](https://foundryvtt.com/article/manifest-migration-guide/) · [foundry-module-fixer](https://github.com/Remgr12/foundry-module-fixer)
- [PC Gamer: Cities: Skylines 2 won't use Steam Workshop](https://www.pcgamer.com/cities-skylines-2-wont-use-steam-workshop-for-mod-sharing/) · [Shacknews](https://www.shacknews.com/article/137409/cities-skylines-2-paradox-mods-no-steam-workshop-nexus-support)
- [Tabletop Simulator Workshop browse](https://steamcommunity.com/workshop/browse/?appid=286160) · [Wallpaper Engine Workshop browse](https://steamcommunity.com/workshop/browse/?appid=431960) · [TTS Knowledge Base: Steam Workshop](https://kb.tabletopsimulator.com/custom-content/steam-workshop/)

**UGC business impact**
- [GameDiscoverCo: Analysis — UGC (still) powers sales & retention](https://newsletter.gamediscover.co/p/analysis-ugc-still-powers-sales-and) (2025 update; ~1,200 games)
- [PCGamesN: What effect does the Steam Workshop actually have on concurrent player numbers?](https://www.pcgamesn.com/what-effect-does-steam-workshop-actually-have-concurrent-player-numbers)

**Asymmetric hosting / TLS**
- [filippo.io: How Plex is doing HTTPS for all its users](https://words.filippo.io/how-plex-is-doing-https-for-all-its-users/) · [notes.billmill.org summary](https://notes.billmill.org/programming/DNS/How_plex_is_doing_HTTPS_for_all_its_users.html) · [Plex: How to Use Secure Server Connections](https://support.plex.tv/articles/206225077-how-to-use-secure-server-connections/)

**Licensing**
- [Creative Commons: NonCommercial interpretation](https://wiki.creativecommons.org/wiki/NonCommercial_interpretation) · [CC BY-NC 4.0 legal code](https://creativecommons.org/licenses/by-nc/4.0/legalcode.en) · [CC compatible licenses](https://creativecommons.org/compatiblelicenses)
- [rollenspiel-kompass.de: How to be a Hero](https://rollenspiel-kompass.de/regelwerk/how-to-be-a-hero/) · [howtobeahero.de](https://howtobeahero.de/)
- [netzpolitik: Urteil des LG Köln zu Creative Commons](https://netzpolitik.org/2014/urteil-des-lg-koeln-zu-creative-commons-im-oeffentlich-rechtlichen-rundfunk/) · [offenenetze.de: OLG Köln zum Begriff „NonCommercial"](https://www.offenenetze.de/2014/11/25/olg-koeln-zum-begriff-noncommercial-in-creative-commons-lizenzen-urteil-des-lg-koeln-teilweise-abgeaendert/) · [OLG Köln 6 U 60/14 full text](https://medien-internet-und-recht.de/volltext.php?mir_dok_id=2656)
- [Steam Workshop: Pen and Paper How to be a Hero (TTS, removed)](https://steamcommunity.com/sharedfiles/filedetails/?id=1703895881)
