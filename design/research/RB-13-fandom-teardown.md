# RB-13 — Fandom, aufgemacht

**The teardown of the wiki half's actual rival.** Project Chronicle competitive research.
Access date for everything below: **2026-07-27.** Author: competitive analyst, PnP_App crew.

Five rounds of this lineage have claimed the product will be *"Fandom-grade."* The corpus contains
six competitor briefs on VTTs (RB-01) and **not one line of analysis of Fandom** — the thing the
other half of the product is supposed to beat. Kaya's verdict is one sentence long:

> *„wikiFandom ist halt scheiße, wir wollen das in besser integrieren und dann unser wiki in unsere
> custom app bringen (auch als Test ob das funktioniert)."*

This brief turns that sentence into a list of defects a person can check, a list of things Fandom
does genuinely well that we will not have on day one, and — §6 — a set of **falsifiable numeric
targets** that the design rounds can hold an artifact to. *Mēden agan*: no hit piece. A ledger with
no losses is a lie, and §3 and §7 are where the losses are written down.

---

## 0. How this was researched, and what could not be reached

**The one honest methodological problem, stated first.** `eron.fandom.com` and every other
`*.fandom.com` host return **HTTP 403 to any non-browser client** (Cloudflare bot mitigation,
`cf-mitigated: challenge`), and **WebFetch returns HTTP 402 for the entire `fandom.com` estate**, not
only for Eron. Consequence: **I could not measure a rendered Fandom page's transfer weight, request
count, ad-slot count or Core Web Vitals from this environment.** Google's PageSpeed Insights API
returned **HTTP 429** on every attempt (keyless quota). Every page-weight number attributed to Fandom
below is therefore either **Fandom's own published measurement**, a third party's, or a
**content-only** figure I computed through the MediaWiki API — which *is* reachable and which I used
for everything I measured myself. Each is labelled. §6 carries the measurement recipe the crew must
run in a real browser to close this gap.

**What I could reach and did use:**

- `https://<wiki>.fandom.com/api.php` over `curl` — works, unauthenticated, no rate limiting hit.
  Used for `action=parse`, `prop=revisions`, `meta=siteinfo&siprop=extensions`, and for reading
  Fandom's own policy and help pages **as wikitext**, which is why the quotes below are exact.
- `community.fandom.com` help/policy corpus via the same channel. **All Fandom policy quotes in this
  brief are first-party and reproducible with one `curl` command.**
- `minecraft.wiki`, `meta.miraheze.org`, `weirdgloop.org`, `legendkeeper.com`, `kanka.io`,
  `obsidian.md`, `notion.com` — plain fetch, worked.
- `worldanvil.com` and `wiki.gg` — **blocked** (403 / 401). World Anvil pricing below is secondhand
  and flagged as such.

---

## 1. What Fandom actually is

### 1.1 Scale

| | Figure | Source & confidence |
|---|---|---|
| Wikis | **250,000** | Fandom's own site, as of Sept 2023 (via detailed.com). First-party marketing figure. |
| Content pages | **40 million+**, 80+ languages | same |
| Monthly pageviews | **2 billion+** | same |
| Monthly uniques | **"350 million"** | Fandom's claim; **English Wikipedia carries a `failed verification` tag on it.** Treat as marketing. |
| Monthly visits, main property | **781.6 M** | Similarweb via detailed.com. Third-party estimate, not audited. |
| Organic search clicks, network | **800 M+/month** | detailed.com. Third-party estimate. |
| Global rank | 50th most-visited site (Oct 2023) | English Wikipedia |
| Mobile share of traffic | **56–64 % each month** | **Fandom's own number**, `Help:FandomMobile`. High confidence. |
| MediaWiki version | **1.43.9** | measured today on `eron.fandom.com` and `harrypotter.fandom.com` via `siteinfo`. |

### 1.2 Ownership, and who is actually being served

- Founded 2004-10-18 as **Wikicities** by Jimmy Wales and Angela Beesley; Wikia 2006–2016; Fandom
  since 2016.
- **Acquired by TPG Inc. (private equity) in February 2018.** This is the load-bearing fact of the
  whole business model and everything in §2 follows from it.
- **Curse Media, Dec 2018** (brought Gamepedia, D&D Beyond, Futhead, Muthead).
- **Focus Multimedia / Fanatical, Feb 2021** (a games storefront).
- **GameSpot, Metacritic, TV Guide, GameFAQs, Giant Bomb, Comic Vine — 2022-10-03**, from Red
  Ventures. Fandom bought its way *up the funnel* into reviews and discovery.
- **Sold D&D Beyond to Hasbro, April 2022, $146.3 M cash.**
- CEO **Jay Sullivan since 2026-02-04**.
- Layoffs: 2023 (GameSpot/Metacritic/Giant Bomb), Jan 2024 (GameSpot editorial), **Oct 2024 ≈11 % of
  all staff**, and a fifth round reported July 2026.

### 1.3 The business model, and what it costs the reader

**Who pays: advertisers. What is sold: the reader's attention and the reader's data. What the
community contributes: the inventory.** Editors write the pages; Fandom sells the space around them.
Contributors are not paid, do not share revenue, and — see §2.9 — are **contractually forbidden from
removing the ads from their own wiki.**

Revenue is **not reliably knowable**: public estimates in the results I saw range from **$130.4 M** to
**"$500 million to one billion"**, which is a spread of nearly an order of magnitude across
data-broker sites with no methodology. **No reliable revenue figure found.** One secondhand source
attributes **~75 % of 2025 revenue to programmatic and direct-sold advertising**; the direction is
certainly right, the number is not verifiable.

**What is verifiable is the machinery.** `meta=siteinfo&siprop=extensions` on Eron — a **74-article**
wiki with 1,153 lifetime edits — reports **226 loaded MediaWiki extensions.** At least **27** of them
exist to serve advertising, tracking, brand safety, experimentation or SEO, and serve neither a reader
nor an editor:

```
AdEngine · AnalyticsEngine · BrandSafeCollections · BrandSafetyReview · BrandSafetyTagging
ContentFootprint · CookiesMonitoring · CreatorMetrics · DataWarehouse · EmailMarketing
Experiments · ServerSideExperiments · FacebookTags · FastlyInsights · GoogleTagManager
KeywordsExclusion · MapsTracking · OpenGraphMeta · Piggyback · RecommendationTiles
SeoLinkHrefLang · SeoTweaks · Track · Twitter Tag · TwitterCards · UserActivityTags · WikiAnalytics
```

plus a compliance tier the product's shape forces on it — `AgeDeclaration`, `CoppaTool global tasks`,
`KidWikiChangeObserver`, `LegalImageReporting` — plus `ArticleVideo`, `FandomVideo`, `EmbedVideo`,
`FandomQuizzes`, and, named exactly as it sounds, **`StaffPowers`** and **`CloseDeadWiki`**.

> **Verify (30 seconds):**
> `curl -s -A "Mozilla/5.0" "https://eron.fandom.com/de/api.php?action=query&meta=siteinfo&siprop=extensions&format=json&formatversion=2"`

**And the reader is instrumented before the first byte of an article.** A plain `HEAD` against
`eron.fandom.com` — no login, no interaction, no consent dialog answered — returns:

```
set-cookie: exp_bucket=v9-18;   domain=.fandom.com; expires=2028-07-26
set-cookie: exp_bucket_2=v5-49; domain=.fandom.com; expires=2028-07-26
set-cookie: Geo={"region":"NW","city":"essen","country_name":"germany","country":"DE","continent":"EU"}
surrogate-key: wiki-2915492 wiki-2915492-mediawiki
```

Two two-year A/B experiment cohort assignments and a city-level geolocation, on a request for an
encyclopedia article about a fictional religion. **This is the product.** The wiki is the bait.

---

## 2. Why it is bad — the defect list, each one checkable

Every defect below is stated so that a person can confirm or refute it. Where I could measure, I
measured; where Fandom documents its own behaviour, I quote its own words, because that is unfalsifiable
by their PR.

### D1 — Ads are constitutionally protected, by written policy, against the community that hosts them

Fandom's **Customization Policy** — the binding rule on what a wiki's own administrators may do with
CSS/JS on their own wiki — says, verbatim:

> **"Basic Interface Elements & Advertisements** — The user interface and advertisements are the
> basic, expected functions of the site, **and must remain in place and unaltered.** … Some features
> are optional, but these should be managed via the settings or with staff help, **rather than being
> removed via CSS**."

> **"Article Content Space** — … **Native in-content placements, like content recommendation modules,
> should be respected as Basic Interface Elements.**"

> **"Right Rail** — Additional elements and modules are allowed to be placed in the right rail, below
> the default elements. However, **they may not push down the placement of the advertisement module in
> that space.**"

> **"Global Navigation** — … the global navigation bar **may not be altered, repositioned, obscured,
> or otherwise affected in any way.**"

This is the single most important citation in this brief. It is not "Fandom shows a lot of ads." It is
**"the advertisement is a first-class element of the page and the community that wrote the page is
forbidden to move it."** Everything else in §2 is downstream of that sentence.

> **Verify:** `curl -s "https://community.fandom.com/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&titles=Customization%20policy"`

### D2 — Fandom's own ad-quality help page documents the ad behaviours as *known and ongoing*

`Help:Bad advertisements` is Fandom telling readers how to report ads. Its own list of what slips
through:

> "Ads that cover up content on the page." · "Ads that move rapidly and continuously, flash in bright
> colors, or otherwise disrupt the senses so as to make the article on which it is embedded difficult
> to read." · "**Autoplay ads** – Ads that, when loaded, automatically execute audio. **Some of
> Fandom's video ads play automatically**, but they should do so muted." · "Intrusive unexpected
> behaviors: auto-redirects, **invisible click-capture overlays (clicking anywhere on the page opens an
> ad landing page)**, opens in a new tab, pop-ups and pop-unders, **fake close buttons**, etc."

And the escape clause:

> "*Note that advertisement removal requests are considered on a **case by case basis**. All complaints
> are accepted and investigated, but **not all ads can be removed**.*"

A platform that needs a documented triage workflow for invisible click-capture overlays and fake close
buttons on its own property has conceded the argument. **Autoplay video is confirmed by the vendor.**

### D3 — Page weight and load time: Fandom's own published numbers are catastrophic

I could not run Lighthouse against Fandom from here (§0). **I do not need to — Fandom published its
own.** `Help:Infoboxes/Benefits of Portable Infoboxes` argues that Portable Infoboxes are faster, and
to make the argument it prints PageSpeed Insights numbers for its own wikis:

| Comparison (Fandom's own page, Fandom's own measurement) | "Fast" side | "Slow" side |
|---|---:|---:|
| Dead Cells vs Enter the Gungeon — **Time to Interactive** | **28.6 s** | **42.7 s** |
| Dead Cells vs Enter the Gungeon — **Total Blocking Time** | **3,620 ms** | **7,510 ms** |
| Two identical pages, same wiki — **Time to Interactive** | **36.7 s** | **80.8 s** |
| same — **Total Blocking Time** | **5,810 ms** | **66,700 ms** |
| same — **Largest Contentful Paint** | **7.0 s** | **12.3 s** |

Read the *left* column again. That is the number Fandom chose to publish as the **good** outcome, in a
document written to make Fandom look fast: **a 28.6-second time to interactive and a 7.0-second LCP.**
Google's own "good" threshold for LCP is 2.5 s. These are mobile-throttled lab figures and undated —
that caveat is real and I am giving it — but the caveat cuts one way only: an advocacy page does not
inflate its own hero numbers.

> **Verify:** `curl -s ".../titles=Help%3AInfoboxes%2FBenefits%20of%20Portable%20Infoboxes"` — the table
> is in the wikitext.

### D4 — What I *could* measure: the markup-to-text ratio, and it is worse than it looks

Using `action=parse&prop=text` (the article's own rendered HTML — **no skin, no chrome, no ads, no
scripts**), measured today:

| Page | Article content HTML | Visible text | Ratio |
|---|---:|---:|---:|
| `minecraft.fandom.com` / **Diamond** | **251,583 B** | **15,480 B** | **16.3 ×** |
| `harrypotter.fandom.com` / **Harry Potter** | 1,583,157 B | 464,640 B | 3.4 × |
| `eron.fandom.com` / **Erismus** (largest Eron article) | 165,600 B | 54,744 B | 3.0 × |
| `eron.fandom.com` / **Eron (Planet)** | 3,812 B | 236 B | 16.2 × |

**245 KB of HTML to deliver 15 KB of reading, before a single ad, script, font or image loads.** That
is what a mature template ecosystem costs on the wire, and it is the honest reason Fandom's numbers in
D3 are what they are — the ads are not the only weight, they are the *last* weight added to a page that
was already heavy.

For contrast, the same wiki after it left: **`minecraft.wiki/w/Diamond` — 58,539 B over the wire
(gzip), 706,517 B uncompressed HTML, full page including all chrome.** An independent host delivers the
whole rendered page in **58 KB**.

> **Verify:** `curl -s ".../api.php?action=parse&page=Diamond&prop=text&format=json&formatversion=2"`
> and `curl -s --compressed -o /dev/null -w "%{size_download}\n" https://minecraft.wiki/w/Diamond`

**Anchor this against our own corpus:** the **entire Eron wiki — all 74 articles — is 307,255 bytes of
wikitext.** The complete encyclopedia is *smaller than one Fandom article's markup.*

### D5 — Mobile is the majority of the traffic and the least controllable surface

Fandom's own `Help:FandomMobile`: **"an average of 56–64 % of our total traffic comes from mobile
devices each month."** And from the Customization Policy, the rules for that majority surface:

> "CSS editing is available on both desktop and mobile (**whereas JS editing is only available on
> desktop**)." · "On the mobile skin, **the content area is compressed due to the limited screen
> size — you may only modify the written, user-generated text and images that are part of the
> article.**" · "On mobile, you may adjust the alignment of the background image, but **you may not
> override or otherwise modify the theme beyond what is available in ThemeDesigner.**"

So: **the surface where two-thirds of readers live is the surface a community has the least control
over**, and the layout decisions there — including where the ad goes relative to the lede — are
Fandom's alone. Their own Portable Infobox page states the consequence without embarrassment:

> "because we cannot consistently identify wikitables, **advertisements render above the content and
> lede**, providing a worse end-user experience."

That sentence is Fandom explaining that on a non-conforming page, **the first thing a mobile reader
sees is an ad, above the article's first sentence.**

### D6 — The age gate, and the compliance tax on being a children's-media property

The extension list carries `AgeDeclaration`, `CoppaTool global tasks` and `KidWikiChangeObserver`.
The user-visible consequence is the interstitial on wikis for franchises popular with children:
a modal asking whether you are an adult or a child before the content is reachable. The Minecraft Wiki
listed its removal as a headline benefit of leaving: **"No more age popup! Unlike Fandom, we won't be
forcing you to tell us if you're a child or an adult."** The gate exists because Fandom must segment
ad targeting by age, not because a reader needs it.

### D7 — Search inside a wiki is bad enough that leaving communities cite it as a reason

Fandom runs its own search (`UnifiedSearch` in the extension list — first-party, not stock
CirrusSearch). The Minecraft Wiki's migration announcement, written by the people who ran the largest
wiki on the platform:

> "**You might have noticed that the search results on Fandom are often less than ideal.** With our move
> away from Fandom we're now able to use a much more powerful and user-friendly search engine again."

Note *"again."* That is a community stating search got **worse** under Fandom's stack.

### D8 — Discovery is optimised for Fandom's network, not for the community's readers

The Portable Infobox page again, explaining a benefit to *Fandom*:

> "Portable Infoboxes enable more specific and relevant recommendations for what visitors can read
> next, **which helps to keep them on your wiki (and on the Fandom network)**. For example, if a
> visitor was reading an article about the actor Idris Elba on the Marvel Database, they would see
> suggested reading … for articles on **Dunderpedia (The Office Wiki), Luther Wiki, or Memory Alpha**."

The in-content recommendation module — the one the Customization Policy forbids you to remove — exists
to move a reader **off your wiki onto another Fandom property**. The interests being optimised are the
network's inventory, not the article.

### D9 — The UCP migration destroyed working features and did not replace them

The **Unified Community Platform** (all new wikis from **2020-03-11**, existing wikis migrated through
2020, Gamepedia after) merged two platforms onto one MediaWiki base. Documented losses, from Fandom's
own help pages:

- **Threaded forums removed**, replaced by *Discussions*: "consisted of old code that was very
  difficult to maintain … will not be made available on the UCP."
- **Wiki-style Polls (AjaxPolls) removed** outright: "the global usage of the feature was not
  sufficient to merit the required effort for replicating the feature."
- **Wikitext no longer supported on message walls.**
- Migration-day breakage: preferences not carried over, search broken (the Minecraft Wiki maintained a
  dedicated `Minecraft Wiki:UCP migration issues` page).

The pattern is the pattern of a platform whose roadmap is set by ad economics: **features with no
inventory attached get retired**, and the community's decade of accumulated workflow is a cost centre.

### D10 — Skin and theme control is a colour picker, and JavaScript is a privilege you apply for

- **Theme Designer** (the sanctioned path) offers exactly three sections: *Community identity*
  (name, graphics), *Header & background* (background image, nav colour), *Article styles* (article
  background, link colours, **a heading font**). Light and dark variants. That is the whole surface.
- **The skin itself — FandomDesktop — is not selectable.** There is no Monobook option, no custom
  skin, no alternate layout. Global navigation is untouchable by policy (D1).
- **Custom JavaScript is off by default and must be requested from Fandom:** "you cannot add custom
  community JS until you make a request for it to be turned on for your wiki … **For security reasons,
  edits to community JS must go through an approval process**." (The `ContentReview` extension in the
  list is that approval process, in code.)

Compare with the crew's own **K1**: themes that swap typography, spacing and rendering style, a theme
editor, per-campaign mood. **Fandom's entire theming surface is a subset of what K1 demands on day
one.** This is one of the few axes where the gap is not a matter of taste.

### D11 — The wiki owner does not own the platform, and Fandom says so in a policy document

From the **Forking Policy**:

> "**Editors and admins are custodians** of community projects for their wiki's subject for as long as
> they're active on Fandom, and so **we do not close wikis when a group decides to edit elsewhere.**"
>
> "**Wikis are therefore not owned by any particular set of editors**, but rather are a living project
> where people can come and go."
>
> "**All major changes to the Fandom wiki must be reviewed and approved by staff.**"
>
> "**Staff will remove rights from departing admins** and allow new admins to be chosen once the fork is
> complete."

And the extension list contains a module named `StaffPowers`. The custodian framing is coherent and
even defensible — but it must be read for what it is: **the community holds no title, no domain, no
right of closure, and no right to leave with the address.** §4 prices what that costs.

---

## 3. What Fandom does well — and what we will not have on day one

*The crew's rule: a ledger with no losses is a lie.* Everything here is real and most of it we cannot
match at launch.

### W1 — Zero cost, zero ops, forever, for anyone

A German-language wiki with **74 articles and 1,153 lifetime edits** is running on **MediaWiki 1.43.9,
226 extensions, a global CDN, image hosting, full-text search, a REST + Action API, XML export,
Scribunto/Lua, VisualEditor, interwiki, and 80-language i18n** — and Kaya and his colleagues paid
nothing and administered nothing. Reproducing that stack self-hosted is a sysadmin job forever. **This
is the strongest thing about Fandom and it is not close.**
→ **We will not have this.** Our model is a one-time GM licence plus die Raumuhr's hosted allowance
(CHAMPION §14.1). Zero-cost, zero-ops, unlimited public hosting is not on our roadmap at any slice.

### W2 — Portable Infoboxes are a genuinely good data model, and our own flex depends on them

`<infobox><data source="…">` is **declarative, machine-readable, presentation-independent** structured
data embedded in wikitext. The Eron harvest proves the payoff: **18 of 18 infobox templates in the wiki
use Portable Infobox markup; none is a hand-rolled wikitable.** The importer can map template → entity
type and `source` → field **directly**, with no HTML archaeology.

This deserves to be said plainly: **CHAMPION §3.2 (*die geteilte Infobox* — every infobox row its own
passage with its own provenance) is only cheap because Fandom spent a decade forcing this format on its
communities.** We inherit the benefit of their standardisation. Fandom's own argument for it —
device-independence, faster paint, SEO legibility, Knowledge Graph entry — is correct on the technical
merits.
→ **We will have this**, and the fixture (§5.3 of `fixtures/eron/README.md`) says it costs us a mapping
table, not a parser.

### W3 — Real search infrastructure, and a real mature template ecosystem

`UnifiedSearch` is weak *relative to CirrusSearch* (D7), but it is full-text search over 40 M pages
that no community had to build. Likewise Scribunto/Lua: Eron ships **124 templates and 22 Lua modules**
without anyone having installed anything.
→ **We will not have this on day one.** CHAMPION §12.4 states it in the champion's own voice:
**"Search at scale is red until run for a fifth round."** Our corpus is per-campaign and small, which
helps — but "search at scale" remains an unrun gate, and this brief does not improve it.

### W4 — Discoverability through Google

Weird Gloop, who have now moved three of the largest wikis on the internet off Fandom, put the number
on it: **"roughly 85 % of a wiki's traffic comes from Google."** Fandom's network reportedly takes
**800 M+ organic clicks a month**. A reader who has never heard of your wiki finds it anyway.
→ **We will structurally not have this** — see §7.

### W5 — Backups and export that actually work

Credit where it is due, and it is considerable: **the entire Eron corpus was harvested in one
afternoon, over an unauthenticated public API, with no permission and no negotiation** —
`action=query&export=1` produced a valid **MediaWiki `export-0.11` XML document with all 74 pages**
(351 KB), and `Special:Statistics` offers admin-requestable full-history dumps. Fandom's exit door is
open, documented and functional. Many platforms in §5 cannot say this.
→ Caveats that matter for §4: dumps are **text only — "This does not include private user
information or images"** — and **a new dump can only be requested once every seven days.**

### W6 — An accessibility guardrail we should copy, not sneer at

> "To ensure that themes meet accessibility requirements, **admins will not be able to save a theming
> choice that has bad contrast warnings**." — `Help:Theme Designer`

Fandom's theme editor **refuses to save an inaccessible theme.** Tension #1 of `00-intake.md` (K1+K3
theme freedom vs. contrast guarantees) is a tension Fandom has already resolved, in the strict
direction, in shipping code. **Our theme editor must do at least this** or we ship a K1 that is worse
than the thing we are mocking. Logged as target **M12**.

### W7 — Social layer, mobile app, and the on-ramp for a non-technical editor

Discussions/message walls/blogs/user profiles/global notifications, a first-party mobile app, and — the
underrated one — **an infobox GUI so a new editor never has to see a template**: "Simple infoboxes are
built using a user-friendly GUI by default, rather than forcing users to learn code immediately."
→ **We will have none of the social layer on day one**, and a phone browser instead of an app
(CHAMPION §12.1: "Browser only"). Note the resonance with **K2**, though: Fandom's `NewInfoboxBuilder`
is a visual structure editor over a declarative format — *the same bet as the visual rule-builder*,
shipped and validated at scale. Evidence the bet is sound.

**Summary of what we lack at slice 1:** free unlimited public hosting · Google discovery · a mobile
app · a Lua/template ecosystem · proven search at scale · any social/discussion feature · 80-language
i18n · a decade of editor muscle memory. **That is a long list and every item on it is real.**

---

## 4. The lock-in and the exit

### 4.1 What a wiki owner may legally take

**The text: everything.** All Fandom wiki text is **CC BY-SA 3.0 Unported** (Eron's `rightsinfo`
reports exactly this; historically-Gamepedia wikis may be **CC BY-NC-SA**, which is *not* free for a
commercial product and must be checked per wiki). Fandom's `Help:Licensing` states the three
obligations and — usefully — pre-agrees what satisfies attribution:

> "**Identify the license used and link to the license terms.**"
> "**Attribution (BY)** … you agree that being attributed in *any* of the following ways satisfies the
> attribution requirement: a link to or URL of the original article; a link to or URL of a stable copy
> of the article that credits the authors similarly to the edit history on Fandom; a list of all the
> contributing authors."
> "**Sharealike (SA)** … you can only release the resulting work under the same or similar license.
> **You also need to identify the changes to the original work.**"

**Consequence for the product, and it is a data-model requirement, not a footnote (this restates
`fixtures/eron/README.md` §2 because a design round will otherwise forget it):** a Fandom importer
brings **share-alike text into an application where users keep writing on top of it.** The importer
must carry **source URL + licence + "modified" flag per article**, and re-emit them on export, or the
product manufactures licence violations in its users' names. That is a column in `Entry`, and it
interacts with `Passage`-level decomposition: *if a Fandom paragraph becomes three passages and a
player's Vollmacht mints a fourth beside them, which of the four are CC BY-SA and which are the user's?*
**Unsolved. Hand to the next round.**

**The images: mostly nothing.** Dumps exclude files (W5), and the Eron harvest found **0 of 41 files
carrying any licence field in `extmetadata`**, with 37 of 41 having **no documented provenance at all**.
A wiki's picture collection is, legally, not portable.

### 4.2 What Fandom keeps

**The domain, the search ranking, the reader, and the conversation.**

- The **wiki stays online** — Forking Policy, D11: *"we do not close wikis when a group decides to edit
  elsewhere."* The old URL keeps its backlinks and its rank.
- Old redirects keep pointing at Fandom. The Minecraft Wiki: *"The old domains 'minecraft.gamepedia.com'
  and 'minecraftwiki.net' **will still redirect to the Fandom wiki**."*
- **You may not tell your own readers where you went.** Forking Policy: *"The Fandom wiki must not be
  used to promote or advertise the fork wiki." · "The new wiki's URL cannot be added to pages other
  than the discussion." · "**Sitenotices and Anonnotices referencing the discussion, the fork, or the
  new URL are not permitted.**" · Any reference must use a Fandom-supplied template obtained from
  support, and "any forking discussion reference not using this template will be removed by staff."*
- **Discussions posts are not in the dump.** `Help:Database download` covers page text only. A
  community's years of conversation are non-exportable — and that, not the articles, is the real
  hostage.
- **Departing admins lose their rights immediately** (D11), so the migration cannot be coordinated from
  inside.

### 4.3 What the exit actually costs — and the evidence that it is survivable

This is the part the product's pitch depends on, so it gets numbers rather than hope.

| Fork | Year | Outcome |
|---|---|---|
| **RuneScape Wiki → Weird Gloop** | 2018 | **"With a large, sustained effort, we were able to recover 95 % of RuneScape Wiki traffic within the first year."** (Weird Gloop, first-party) |
| **Terraria, Zelda** | 2022 | moved (wiki.gg / independent) |
| **Minecraft, Fallout, Hollow Knight** | 2023 | `minecraft.wiki` → Weird Gloop. Third-party (Semrush) puts it at **16.03 M visits in Oct 2025, +30.7 % MoM, 56 % from Google organic** — thirdhand, treat as indicative |
| **South Park, Dead by Daylight, League of Legends** | 2024 | LoL Wiki → Weird Gloop |
| **Warframe, Vampire Survivors, Undertale/Deltarune, Nichijou, Balatro** | 2025 | moved |

**Did the readers follow? Yes — after a year of deliberate, unglamorous work.** And the community's
own words show what that work is: the Minecraft Wiki's migration page is largely **a plea to its
readers to fight the SEO war by hand** — *"Don't click on Fandom links. In search results, always pick
minecraft.wiki links instead of Fandom ones. This tells Google and other search engines which site is
better for users."* Weird Gloop's summary of the difficulty: **"Since roughly 85 % of a wiki's traffic
comes from Google, it's nearly impossible for the new wiki to win without fixing this ranking
disparity."**

**Two findings that matter more than the traffic:**

1. **"On average, moving away from Fandom doubles the number of people editing."** (Weird Gloop,
   first-party.) The platform is not just extracting from readers; it is suppressing contribution.
2. **An entire third-party tooling ecosystem exists solely to route around Fandom.**
   **Indie Wiki Buddy** — a browser extension whose only job is to redirect Fandom visits and *filter
   Fandom out of ten search engines* — supports **800+ independent wikis across 22 languages**, and it
   ships integration with **BreezeWiki**, "a service that renders Fandom wikis without ads or bloat."
   **A reverse proxy exists whose entire product is Fandom's own content minus Fandom.** No stronger
   market signal for this brief's thesis exists.

**The social cost, stated honestly:** a fork splits the community in two, the incumbent keeps the name
and the address, admins lose their rights on the way out, non-English sister wikis frequently do not
follow (the Minecraft Wiki asked its readers to *"respect the decisions of those who choose to stay"*),
and someone must operate a MediaWiki cluster forever. **The exit is real, legal, and expensive.** It
takes an organisation — Weird Gloop, wiki.gg, Miraheze — and roughly a year.

---

## 5. The alternatives already in this space

### 5.1 The wiki-host tier (Fandom's direct replacements)

| | Model | Price | The one structural weakness |
|---|---|---|---|
| **Miraheze** | Non-profit wiki farm, community-governed, **no ads ever**, MediaWiki **1.45**, **25,920 wikis** | **Free**, donation-funded | **The funding is the weakness.** No advertising and no subscription means capacity depends on donations and volunteer sysadmins; the farm has had public existential funding/governance episodes. Also: MediaWiki, so every editing complaint in §2 that is really a *MediaWiki* complaint survives the move. |
| **wiki.gg** | Ad-funded, for-profit (launched **2022-03-14**, operated by indie.io), MediaWiki 1.43.5, gaming-focused | Free to communities | **Curated and vertical.** It hosts *game* wikis it accepts; it is not an open farm, and it is still an advertising business — a smaller, better-behaved one, but the incentive that produced §2 is the same incentive. |
| **Weird Gloop** | Company hosting a handful of very large community wikis (RuneScape, OSRS, Minecraft, LoL) | n/a — not open to applicants at will | **Not a product.** It is bespoke stewardship for a few flagship communities. Not an option for a 74-article world. |

### 5.2 The worldbuilding tier — **World Anvil and LegendKeeper are the real rivals for our wiki half**

The crew has never analysed either. They deserve the most space, because a GM choosing where to put her
campaign encyclopedia is choosing between us and these two, **not** between us and Fandom.

#### World Anvil — the incumbent, and the closest thing to our thesis that exists

*Pricing note: `worldanvil.com` blocks both fetchers (Cloudflare 403). Figures below are secondhand from
search results and should be re-verified in a browser before any artifact quotes them.*

- **Tiers (secondhand):** Freeman **free** (reported caps ~2 worlds / ~42 published articles / ~100 MB
  media) · Master **≈$6.50/mo, $58/yr** · Grandmaster **$12/mo, $105/yr, or $650 lifetime** ·
  Sage **≈$300/yr** (Google Analytics, Patreon member import, password-protected articles, **custom
  domain**). Journeyman is deprecated.
- **Feature surface, and it is enormous:** wiki articles with templates per entity class, categories,
  privacy controls, **manuscripts** (novel-writing), timelines, interactive maps, **family trees**,
  **diplomacy webs**, whiteboards, notebooks, **campaign manager**, **RPG system integration**,
  **statblocks**, **a dice roller**, **chronicles** (session reports), subscriber/beta-reader seats.
- **Live-play integration: yes, but only one-directional and not theirs.** World Anvil documents a
  **Foundry VTT integration** — a module that surfaces your World Anvil articles inside Foundry's
  journal directory. Their own doc: *"the module is not maintained by World Anvil; if you need help
  with Foundry or module set-up, please use Foundry's support resources."* **Lore flows into the VTT.
  Nothing flows back.** No die roll at a Foundry table has ever written a World Anvil article.
- **The structural weakness — and it is exactly our opening:** World Anvil is a **six-day product with
  a dice roller bolted on**. Its atom is the **article**, authored by hand, in advance; its campaign
  manager is a *place to put prep and notes*, not a mint. It has the wiki half and a gesture at the
  table half, and **no mechanism by which play changes the encyclopedia.** Everything CHAMPION §4
  describes — die Prägung, `Quelle`, `erfahrungsgrad`, per-character `Sicht` — is absent. Secondary:
  reported UX complexity ("tabs and buttons"), free-tier upgrade interstitials, and recurring
  complaints about auto-renewal and refunds (Trustpilot-tier evidence — low confidence, do not cite in
  an artifact).

#### LegendKeeper — the craft competitor, and the one whose polish should worry Aphrodite

- **Pricing (first-party, fetched):** **Basic free** — view & export all projects, collaborate on
  others' projects, 14-day full trial. **Pro $9/mo, or $7.50/mo billed annually.** Pro is *unlimited*:
  projects, wiki pages, maps, asset sizes, timelines, events, whiteboards, collaborators, storage,
  publish-to-web.
- **The two things they get right that we must match:** *"an unlimited number of guests can participate
  in your projects **for free**"* — **exactly our "players always free" rule (K6)**, already shipped by
  a competitor. And **offline editing with sync on reconnect**, plus export, under an explicit
  *"You own your data, not us."*
- **The structural weakness:** **deliberately not a VTT.** No dice roller, no tactical grid, no
  character sheets — documentation and worldbuilding only, with players reached through shared web
  links. Their positioning is our thesis's mirror image: they refuse the table entirely. Which means
  **the fusion in CHAMPION §4 is unreachable for them by choice**, and they have chosen to be a
  beautiful half.

#### Kanka — the free-tier competitor (first-party, fetched)

- **Kobold free** (unlimited entries, unlimited campaigns, **ads**) · **Owlbear $4.99/mo** (1 premium
  campaign, 10 MiB files, **ad-free**) · **Wyvern $9.99/mo** (3 premium campaigns, 25 MiB) ·
  **Elemental $24.99/mo** (7 premium campaigns, 100 MiB). Premium campaigns unlock **custom CSS + theme
  builder**, plugins, family trees, webhooks, 30-day change logs and undelete, member roles.
- **Structural weakness: it monetises by throttling the campaign, not the feature** — storage caps,
  entity caps, "premium campaigns" as a currency — and **the free tier shows ads to your players**,
  which is the exact defect §2 indicts. Also: an entity manager, not a play surface. No dice, no
  table, no mint.

#### Obsidian Publish / Notion — the generalists

- **Obsidian:** app **free without limits, no sign-up, local files, no telemetry**; **Sync $4/user/mo**
  annual ($5 monthly); **Publish $8/site/mo** annual ($10 monthly), incl. graph + full-text search.
  **Structural weakness:** Publish is a **static one-view publish** — one site, one reading of it, for
  everyone. There is no reader identity, therefore **no per-character projection is even expressible**.
  Also single-player by construction; real-time collaboration is not the model.
- **Notion:** **Free** for individuals · **Plus €9.50/member/mo** · **Business €19.50/member/mo**
  (per *member*, and a campaign is 4–6 members). **Structural weakness: it is priced and permissioned
  as an office product.** Granular row-level permissions are a **Business**-tier feature; the sharing
  model is workspace/teamspace, not character. And nothing about it is a game.

### 5.3 The one-line map

**Nobody in this list projects the same page differently for two readers, and nobody lets play write
the encyclopedia.** Fandom cannot (one cached page per URL — §1.3's `surrogate-key: wiki-2915492`);
World Anvil and Kanka have per-article privacy toggles but no per-character epistemology; Obsidian
Publish and Notion have no reader identity at all; LegendKeeper refuses the table on purpose. **That
gap is the product.** It is also, per CHAMPION §15.10, **still unbuilt after four rounds** — `Sicht`
remains grafted, unmeasured, and spike S-P1 unrun. The moat is real and we have not yet dug it.

---

## 6. „Besser als Fandom" — made measurable

**This is the section the arena will use.** Each target is falsifiable, checkable in a self-contained
HTML artifact or by a scripted measurement, and written so that it can go **red**. Where a target
compares against Fandom, the Fandom number and its source are given so the comparison is not a claim.

**The measurement rig (run this once, in a real browser, and the §0 gap closes):** load
`https://<any>.fandom.com/wiki/<article>` in Chrome DevTools with cache disabled and **no ad blocker**,
on the "Slow 4G" preset; record from the Network panel: total transfer, request count, distinct
third-party origins, and count of `<iframe>`/ad-slot elements; record from Lighthouse (mobile): LCP,
TBT, TTI, CLS. **Do the same for the Chronicle artifact.** Put both columns in the round's verdict.

### 6.1 Weight and speed

| # | Target | Green when | Fandom's number, for the record |
|---|---|---|---|
| **M1** | **Total transfer, one article, cold cache** | **≤ 250 KB** for the Eron **median** article (1,591 B wikitext); **≤ 1 MB** for `Erismus` (56 KB, the largest) | not measurable from here (§0). `minecraft.wiki` after leaving: **58.5 KB gzip** for a full rendered page |
| **M2** | **Distinct third-party origins** | **0.** The artifact runs under `default-src 'self' data:` with **zero CSP violations** in the console | 27+ ad/tracking/SEO extensions loaded on a 74-article wiki (§1.3) |
| **M3** | **Markup-to-text ratio** | **≤ 4 ×** rendered-HTML bytes per byte of visible text, on the Eron median article | **16.3 ×** measured today (`minecraft.fandom.com`/Diamond: 251,583 B HTML / 15,480 B text) |
| **M4** | **LCP**, mid-tier mobile, throttled 4G | **≤ 1.5 s** | **7.0 s** — Fandom's own published *best*-case figure |
| **M5** | **TBT / TTI** | **TBT ≤ 200 ms · TTI ≤ 3 s** | **TBT 3,620–66,700 ms · TTI 28.6–80.8 s** — Fandom's own published figures |
| **M6** | **Whole-corpus budget** | The **entire 74-article Eron corpus**, decomposed to passages, is available offline **under 2 MB** | the corpus is **307,255 B** of wikitext — smaller than one Fandom article's markup |

### 6.2 Ads, interruption and consent — the zero-targets

| # | Target | Green when |
|---|---|---|
| **M7** | **Ad count = 0** | Static assertion: the built artifact contains **no `<iframe>`**, no `googletag`, no `adsbygoogle`, no element whose id/class matches `/\b(ad|ads|advert|sponsor)\b/`. A grep gate in CI, not a promise. |
| **M8** | **Interstitials = 0, autoplay = 0** | No modal blocks first paint of content (no age gate, no cookie wall, no upgrade nag — cf. World Anvil's free tier and Fandom's age gate). **No `<video autoplay>`, no `<audio autoplay>`, no `window.open`.** Fandom's own `Help:Bad advertisements` concedes autoplay video; ours is a build failure. |
| **M9** | **Pre-interaction state written = 0** | The artifact sets **no cookie and no `localStorage` key before the first user interaction**. Fandom sets **three** (`exp_bucket`, `exp_bucket_2`, `Geo`) on a `HEAD` request — §1.3, reproducible with one `curl -I`. |

### 6.3 The things Fandom structurally cannot do

| # | Target | Green when | Why Fandom cannot |
|---|---|---|---|
| **M10** | **Reader-specific visibility** — *der Zwillingsbeweis* (CHAMPION §6) run over the **real** Eron corpus | Two readers with identical held halves produce **byte-identical DOM, `getFullAXTree` and response timing**, on ≥3 Eron articles including one with a door | One page, one cached HTML per wiki (`surrogate-key: wiki-2915492`), served to every anonymous reader. Per-reader *content* is not in the architecture; per-reader *ads* are. |
| **M11** | **Clicks to a fact, mid-session** | **≤ 2 interactions, 0 page loads**, from the Session zone to any passage in the corpus — measured as a click-path assertion over the fixture, not a claim | On Fandom: search → results → article → scroll → (ad, recommendation module) → fact. Nobody has ever done it in two on a phone at 21:47. |
| **M12** | **Offline availability** | The artifact opens from `file://` with the network disabled and remains fully readable and navigable | A Fandom page is unusable offline by construction. (LegendKeeper *does* offline-edit-and-sync — this target is against them, not Fandom.) |
| **M13** | **Ownership round-trip, on real material** | `eron-export.xml` (the genuine MediaWiki `export-0.11` document, 74 pages, 351 KB) **imports**, and export → re-import → **diff empty**, including per-article **source URL, licence and modified-flag** | Fandom's dump is text-only and rate-limited to one per seven days; images and Discussions do not come out at all. |
| **M14** | **Contrast floor in the theme editor** | The theme editor **refuses to save** a theme failing WCAG AA — matching `Help:Theme Designer`'s behaviour | Not a Fandom defect. **A Fandom feature we must not ship worse than.** K1's honest risk. |

### 6.4 Decomposition — the hard question of this beat, made into gates

*An article is not a passage. The fixture says a Fandom article is **10.8** passages, and — the finding
nobody predicted — **73 % of them are infobox rows, not prose.***

| # | Target | Green when | Open question it does not answer |
|---|---|---|---|
| **M15** | **Article → passages** | The importer yields **799 ± 5 %** candidate passages from the 74 articles (583 infobox rows + 216 prose paragraphs), each with a stable id, and **no passage crosses a section boundary** | The **212 list items** are undecided: a `Bekannte Fälle` bullet is semantically a **relation**, not a paragraph. Passage, relation, or both — **unsolved.** |
| **M16** | **Templates → types** | **9** used infobox templates map to entity classes with **zero hand-written parsing** of wikitable markup; the **137 unused** Fandom boilerplate templates are **not** imported; **0** Scribunto modules are ported | `Vorlage:Person` (20 articles) and `Vorlage:Infobox Charakter` (2) model the same class. **Competing schemas need a mapping UI, not automatic merge.** |
| **M17** | **Empty fields** | `Vorlage:Person` declares **41** fields; real articles fill **14–28**. The sheet renderer **omits** unfilled fields — a placeholder for an unfilled field is a red gate | — |
| **M18** | **No-prose survival** | The renderer displays **`Arvex Aurelius Paradon`** (18 infobox rows, **zero** prose) and **`Eron (Planet)`** (236 B, pure infobox) without a lead-paragraph assumption | A renderer that assumes a lede breaks on the wiki's most prominent character. |
| **M19** | **Categories are not the taxonomy** | The importer derives type from the **chosen infobox template**, and works when **71 of 74** articles carry no category at all | Fandom's own organisational offer is used by **3 of 74** articles. **The type must follow the structure the author already fills in.** |
| **M20** | **Redlinks: 1,253 → a usable number** | A door-candidate filter reaches **≥ 0.9 precision** against a hand-labelled sample of 100 redlinks, and **never** proposes a door for an epoch marker (`n. K.`, `v. K.`) or a date format | **69.3 % of all links in the corpus are red — 9.3 doors per written article.** CHAMPION §4.9 caps issuance at ~3/week. **How 1,253 becomes 3 is unsolved and is the single largest open design question this fixture produced.** |

**Every one of M1–M20 can go red.** M4/M5 cannot be run against Fandom from this environment until
someone runs the browser rig in §6; M10 depends on `Sicht`, which is unbuilt after four rounds
(CHAMPION §15.10); M20 has no proposed solution at all.

---

## 7. The one thing Fandom has that we cannot beat

**The reader is already there, and Google put her there.**

~85 % of a wiki's traffic arrives from a search engine (Weird Gloop, first-party); Fandom's network
takes a reported 800 M+ organic clicks a month; and when a community leaves, **Fandom keeps the wiki
online precisely so it keeps the ranking** (Forking Policy, §4.2). The largest wiki on the internet
needed a company, a year, and a printed plea to its own readers to recover 95 % of its traffic. That is
what the demand side is worth.

**We cannot compete for it, and the reason is not effort — it is our own architecture.** Chronicle's
spine is **Default-Deny durch Totalität**: a per-character `Sicht`, computed server-side, with no
visibility metadata on any player payload (CHAMPION §6). **A world that is default-deny is
default-unindexable.** Googlebot is a reader with no revelations; by design it sees nothing. §10.11's
*die offene Tür* publishes **one article at a time**, by explicit GM toggle, default off — that is a
go-to-market artefact, not a discovery engine, and the champion is right to call it the cheapest one it
has rather than a strategy.

So the honest statement, in the product's own voice:

> **Fandom is where a stranger finds your world. Chronicle is where your table lives in it.** We will
> never be the first Google result for someone else's fandom, and we should stop writing sentences that
> imply we might. Our distribution runs through creators and system authors (RB-11's ratified channel),
> through **die Ausgabe** as a tradeable unit, and through UVTT export into rivals' tools — **not**
> through search. Every artifact that claims "Fandom-grade" must mean *grade*, never *reach*.

The second-place answer, named so it is not confused with the first: **zero cost and zero ops.** A
74-article wiki running 226 extensions on someone else's CDN for free is a real offer to a real GM, and
we will be asking that GM for a licence fee. **Both of these are permanent, and neither is closable by
design.**

---

## 8. What this brief could not determine

1. **A first-party measurement of a rendered Fandom page** — transfer weight, request count, ad-slot
   count, real Core Web Vitals. Blocked by Cloudflare (403 to every non-browser client), WebFetch (402
   for the whole `fandom.com` estate) and PageSpeed Insights (429, keyless quota). **§6's browser rig
   must be run by a human before any artifact quotes a Fandom page-weight number.**
2. **Fandom's revenue.** Public estimates span $130 M to $1 B. **No reliable figure found.**
3. **Fandom's ad-slot inventory per page.** Fandom does not publish a slot list; `Help:Bad
   advertisements` documents `line-item-ID` tags and a *"Featured video"* code fragment, but no count.
   Ad-density claims below "several per page, plus a sticky video unit" would be invented.
4. **Whether Fandom currently sells any ad-free option to readers.** Not found; not asserted either way.
5. **World Anvil's exact current pricing** — `worldanvil.com` blocks both fetchers. Figures in §5.2 are
   secondhand and must be re-verified in a browser before use.
6. **Whether the Eron corpus is representative.** It is one 74-article German wiki with a brutally
   skewed size distribution (two articles carry 30 % of the bytes). Every number in §6.4 is a target
   *against this fixture* and may not generalise to a 10,000-article wiki. **CHAMPION §12.4's "Search
   at scale" gate remains red, and this brief did not improve it.**
7. **The licence provenance of a decomposed passage.** If a CC BY-SA paragraph becomes three passages
   and play mints a fourth beside them, the attribution boundary is undefined. **Named, not solved.**

---

*RB-13. Fandom is not bad because it is ugly. It is bad because it is a private-equity advertising
business that owns the address, writes the layout rules, forbids its own communities to move the ad,
keeps the page online after they leave, and publishes a 28.6-second time-to-interactive as its good
case. Everything the crew has said about being „Fandom-grade" should now mean one thing: grade, not
reach — and twenty numbers that can go red.*
