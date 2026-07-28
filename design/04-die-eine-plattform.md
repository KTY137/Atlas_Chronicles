# 04 — Die eine Plattform

**The route to K9.** Compiled by Pythia, 2026-07-27. **Revision 2, same day, after RB-19.**
Binding corpus: every design round from 6 onwards reads this file alongside
[`00-intake.md`](00-intake.md), [`iterations/CHAMPION.md`](iterations/CHAMPION.md) and
[`iterations/OPEN-DECISIONS.md`](iterations/OPEN-DECISIONS.md).

**Commissioned by** Kaya's amendments **K8** (*"wir wollen halt sein wie WorldAnvil nur besser größer
stärker"*) and **K9** (*"quasi eine marriage aus worldanvil und Foundry/roll20 etc. Wir kombinieren die
meisten pnp tools in ein giga tool. eine Chronicles Platform um die eine platform zu schreiben die jede
andere knechtet"*). The Tolkien reference is deliberate and the ambition is treated as **real
direction, not hyperbole.**

---

## The corpus this document has read — stated exactly, because it claims authority over it

Revision 1 declared itself the binding corpus while being blind to four briefs and one measurement
spike that were already on disk when it was written. [RB-19](research/RB-19-pruefung.md) §2.1 called
that a blocker and was right: a document that claims binding authority while unaware of what it binds
is not authoritative, it is confident. **This revision names its corpus so the claim can be audited.**

**Read in full, and synthesised:**

| Document | What it contributes here |
|---|---|
| [RB-14](research/RB-14-worldanvil.md) | the benchmark, measured — pricing, editors, export gate, Trustpilot, traffic |
| [RB-15](research/RB-15-werkzeuglandschaft.md) | the eighteen-function map; the bridge ceiling; the absorb/integrate/refuse taxonomy |
| [RB-16](research/RB-16-friedhof.md) | the graveyard — causes of death, ranked |
| [RB-17](research/RB-17-substrat.md) | the substrate mechanism; the standard-setting seat |
| [RB-18](research/RB-18-widerspruch.md) | Nemesis against the ambition — the arithmetic, the parity split, the tripwire |
| **[RB-20a](research/RB-20a-kartenwerkzeuge.md)** | **the standalone map-authoring market, torn down; `Der Kartenleger` costed at ≈43/≈52** |
| **[RB-20b](research/RB-20b-machbarkeit.md)** | **Hephaistos' feasibility measurement — the first measured numbers on scene, culling, vector fog** |
| **[RB-20c](research/RB-20c-kunstpipeline.md)** | **the art bill, measured on Kaya's own map: ≈90 assets, €2,700–8,200, not "thousands"** |
| **[RB-20d](research/RB-20d-erzeugung.md)** | **generation: FMG is MIT and free; 690 red links in Kaya's own corpus; "emit doors, not articles"** |
| **[RB-19](research/RB-19-pruefung.md)** | **Argus' audit of this document and of RB-14..RB-18. Its blocker and five majors are answered in the sections named below** |
| **[RB-20e](research/RB-20e-widerspruch.md)** · **[RB-20](research/RB-20-kartenschmiede.md)** | **Nemesis against the map thesis, and the dedicated synthesis that rules on it. These landed *after* this revision was drafted. On the map, the place layer, generation intake and the art bill, `RB-20-kartenschmiede.md` and its ledger entries **M1–M8** govern and this document defers — with the two divergences named in `OPEN-DECISIONS.md` **P10** rather than averaged away** |
| [RB-11](research/RB-11-steam-vs-browser-verdict.md) | **read as ratified and closed** — one web/DOM codebase (React/TS + PixiJS), browser + Electron, one-time GM licence, players free, sold direct, Steam gated, discovery through creators and system authors, UVTT + rival-shaped export at launch |
| [`00-intake.md`](00-intake.md) · [`iterations/CHAMPION.md`](iterations/CHAMPION.md) · [`iterations/OPEN-DECISIONS.md`](iterations/OPEN-DECISIONS.md) | the binding brief, the champion, and the standing rulings **S1–S8** — which this document reconciles against rather than ruling over a second time (§9) |

**Measured artifacts on disk, read and used:** `spikes/spike-A-passage-identity/RESULTS.txt` ·
`spikes/spike-B-wiederkehr/RESULTS.txt` · `spikes/spike-B-w1/RESULTS.txt` ·
`spikes/spike-K-kartenmass/` (scripts, results embedded in RB-20b as `[gemessen]`) ·
`fixtures/eron/media/kachelpyramide/pyramide.json` · `fixtures/eron/articles.json`.
**§10.9 of revision 1 said there were none. That was false and it is corrected in §10.9 and §4 Step 0.**

**Deliberately out of scope, and why:** **RB-12/RB-13** (Fandom import and teardown) were written
concurrently with revision 1 and are not synthesised here; nothing in this document rules on import
*mechanics*, only on import *targets* (§3.2 d, §9 P8). **RB-01 to RB-10** are read through the later
briefs that cite them, not re-derived; where one of them is corrected it is corrected by name (§0.4).

**What RB-19 changed in this document, so no round has to diff it:** §0.4 (the wedge is not vacant, and
three briefs are corrected by name) · §0.6 (new — the map corpus) · §1.2 (nine refusals, not ten) ·
§2 (the FAQ's real subject; the module's real backing) · §3.1 (the count; rows 6 and 7 amended) ·
§3.2 (e) (new — the Azgaar collision, ruled) · §3.4 (the "nine years" claim withdrawn) ·
§4 Step 0 (the calibration inventory corrected) · §5 rows 1, 4, 11 · §5.1 (new — the laundered
inference, and `die offene Tür` generalised) · §7 R-A (re-aimed) · §7 R-D (triggers broadened) ·
§8 (rewritten as an itemised work order) · §9 (P1 overturned, P4/P8 revised, P11 added, **P10
superseded by RB-20's M1–M8**) · §10.2, §10.9 and six new entries.

**And one thing this revision does not do:** it does not re-rule the map question. `RB-20-kartenschmiede`
and its **M1–M8** landed after this draft; **they govern, and the two places where my argument diverges
from theirs are recorded in `OPEN-DECISIONS.md` P10 rather than averaged away.**

---

**Sourcing discipline.** Every external figure is attributed and dated. Vendor self-reporting is marked
`[vendor]`. Where a figure could not be established the text says **"no reliable figure found"** and
moves on — nothing is estimated into existence. `worldanvil.com` returns 403 to direct fetch
(Cloudflare); everything attributed to World Anvil's own pages is second-hand via search or via prior
briefs, and marked. Nine facts in this document were verified live on 2026-07-27 and are marked
**[verified today]**; four of them **change conclusions the prior briefs reached**, and those are
flagged where they land. **Three claims in revision 1 did not survive audit and are withdrawn rather
than softened:** the *"nine years of public refusal"* duration (no source establishes when World
Anvil's disclaimer first appeared), the *"one volunteer's module"* framing (§2), and *"zero data
points"* on the developer-day (§10.9).

**One currency rate, stated once so no reader has to guess.** Euro figures below assume
**1 EUR ≈ 1.10 USD** (RB-20c's stated assumption; **no rate was verified this session**). So ~€30
≈ ~$33. Every ratio in §0.5 and §5.2 is computed at that rate and is honest at order-of-magnitude only.

---

## 0. The six findings that were not in the briefs

Stated first, because four of them move rulings and one of them is a live threat.

**0.1 — World Anvil is repairing its central defect, right now, on a dated schedule.**
Their July 2026 newsletter, published **2026-07-09**: *"You can toggle on or off the novel writing
software, the RPG Campaign Manager, NSFW filters and many more features to customize the World Anvil
experience to your needs."* [vendor blog, verified today; RB-19 §5 re-fetched the post and reproduced
the quote verbatim]. RB-18 §3.1's entire front three — six user quotes about overwhelm, two competitors
monetising it — describes a wound the incumbent began suturing **eighteen days before this document was
written.**

**The consequence, stated so it cannot be read as a caveat.** Overwhelm is not an asset. It is a
**depreciating** condition of a competitor who is currently executing against it, on a dated schedule,
in public. Every craft-based opening against World Anvil's surface — "they are too big", "it is
confusing", "the first hour is bad" — is a claim with a shelf life measured in their release cadence,
not in ours. **Any strategy, deck, positioning line or design round that leans on their overwhelm as a
durable asset is leaning on something under active repair, and will be wrong before it ships.**

**What we do instead, and it is three things, none of which depends on them being bad:**

1. **We compete on structure, not on their craft.** The openings that do not depreciate are the ones
   they cannot close without becoming a different company: **no VTT** (their own Campaign Manager FAQ
   disclaims it, and the community suggestion asking for one is open and unshipped), **no rules
   engine**, **no per-character knowledge projection under anything**, and a **subscription** whose
   complaint cluster is structural (§5 row 8). Those are in §3.4 Amendment 2 and they are the only
   competitive claims permitted in copy.
2. **We make our own first hour a gate we can fail, not a comparison we can win.** Their fix is
   *user-side*: a toggle that hides a surface for the person who found it. Ours is *product-side*:
   **das Erststundenbudget** (a hard cap, measured) and **die Verjüngungsregel** (no round adds a named
   surface without retiring one) — §6.4, P6. A toggle cannot retire maintenance surface; a deprecation
   rule can. That difference is the entire durable version of "größer ohne überwältigend."
3. **We stop saying it.** No artifact, no deck, no round-6 candidate may cite World Anvil's overwhelm
   as a reason we win. It may be cited exactly once, as the *reason for our own gate* — which is what
   §6.4 already does.

**0.2 — World Anvil shipped the red link as an invitation to type, in January 2026.**
*Inline Article Creation*, released **2026-01-14** [vendor blog, verified today; RB-19 §5 re-fetched
the release post and confirmed every clause, and notes that the post names the visual editor
**Plutarch**, not Plato — see §5 row 1]: type `@name`, press `+`, pick a template, the article spawns
without leaving the page, **for free and Guild users alike.**

CHAMPION §3.4's headline sentence — *"Every wiki in the world renders a red link as an absence and an
invitation to type"* — is therefore **more true than when it was written, and now datable to a shipped
competitor feature.** Our claim survives intact and gets sharper, but **its evidentiary basis changes**:
it is no longer an observation about how wikis happen to behave, it is a contrast with a **named,
dated, shipped release by the benchmark.** That is a stronger claim and a more fragile one, and it must
be written that way.

**The claim, restated so the contrast is with the release and not with a vacuum:** *World Anvil's
January 2026 release makes the red link a faster way to open a text editor. Ours makes it a door: an
authorised, capped, expiring invitation to **roll**, visible only to its holder, that ends with one
paragraph, an author and a weekday.* The difference is not speed of authoring. It is **who writes, on
what authority, and whether the result carries provenance.** Work order in §8.1 — **the champion must
cite the 2026-01-14 release by name.** A round that asserts the red-link claim without that citation is
asserting into a vacuum that no longer exists.

**And it now has a supply side.** RB-20d measured Kaya's own Eron corpus: **74 articles, 762 distinct
outgoing wikilinks, 690 of them red, 1,810 link instances** `[gemessen over
fixtures/eron/articles.json]`. The headline flex has been fed, for five rounds, only by whatever a GM
happened to type. **690 doors already exist in the binding fixture**, and §0.6 names the mechanism that
manufactures more of them without writing prose.

**0.3 — Foundry's journal is not an HTML string, and CHAMPION §16 says it is.**
Verified today against Foundry's own documentation, and **re-verified first-hand by RB-19 §5, all four
clauses verbatim**: *"Journal Entries store Pages, with each one acting as a separate unit of related
information"*; a GM can *"show a page to one or more players… you can selectively choose individual
players who will receive it"*; Foundry ships a **Secret** text formatting *"which will only be visible
to the GM or Owner of the Journal Entry"*, with a reveal button; and permissions are *"established at
the Journal Entry level … not individual pages."*

**This is the most urgent item in the document, because a false claim about a competitor is sitting in
the champion right now.** CHAMPION §16 asserts *"the moat against Foundry's HTML-string journal is
structural and unbroken."* Foundry's journal is not an HTML string. The claim is falsifiable in about
ninety seconds by anyone who has opened Foundry — which is every reviewer, every system author, and
every person in our ratified discovery channel.

**The corrected claim is narrower, it is true, and it is stronger where it matters.** Written out below
as replacement wording, so a later round can paste it into §16 without re-deriving it (work order
§8.1):

> **Foundry's journal is not a string — it is Pages, and a GM can show a page to individually chosen
> players and hide Secret blocks behind a reveal button. What Foundry does not have is *derivation*.
> Its visibility is assigned **per document, by hand, by the GM**, it lives at the Journal Entry level
> rather than the page level, and it composes with nothing: a journal permission does not know what a
> character has seen, does not move when she learns something, does not lift the fog, and does not
> change a die roll. Chronicle's visibility is not assigned at all. It is **derived from a
> per-character knowledge projection, and it is the same predicate as the fog** — one object, evaluated
> server-side, that is simultaneously her article permission, her fog volume, her dice modifier and her
> citation namespace. The moat is not that they store text badly. It is that a hand-assigned ACL and a
> derived projection are different kinds of thing, and only one of them can be wrong about what a
> character knows.**

That sentence survives a reviewer who has actually used Foundry. §16's current wording does not, and
**the difference between them is the difference between a moat and an embarrassment.**

**0.4 — The no-code sheet-and-rules wedge is not vacant. Rollplay homesteads part of it, and three
briefs of ours say otherwise.** This is a correction to our own corpus and the three briefs are named,
because a negative finding repeated three times is exactly the kind of claim that stops being checked:

| Brief | What it concluded | Status |
|---|---|---|
| **RB-01** | nobody sells a first-class visual system-agnostic sheet-and-rules authoring product | **corrected — partially false** |
| **RB-14 §8.7** | the same, independently | **corrected — partially false** |
| **RB-17 §5 / Rank 3** | the same, and ranks the position as unclaimed | **corrected — the position is claimed; the ranking's *conclusion* survives on the restated wedge only** |

**What Rollplay actually ships** (daydreamteam.com) [vendor site, verified today; **the clauses below
were re-verified verbatim first-hand by RB-19 m7**]: *"Design your character sheet layout with drag &
drop"*, *"Define attributes that follow custom formulas"*, *"Create content with automated effects that
follow your rules"*, *"Full dice formula support: dice pools tied to your attributes"*, *"Draft and
shared versions"*, mobile-first, and **no VTT, no maps, no live play.**

**Two things revision 1 asserted about Rollplay did not reproduce and are withdrawn:** *"a
marketplace"* and *"freemium"*. Neither appears on either cited page. **Their own line is: *"No
subscription. No account required. Works offline."*** — which does not blunt the finding, it sharpens
it: **Rollplay is not only in the wedge, it is in the wedge at our own price posture.** The one-time /
no-subscription argument is not a differentiator against them. It is parity.

Alongside: **Quest Portal** ships *"no-code character sheets"* [vendor]; **Minimal Sheets** and
**FORGE** are further browser-based no-code sheet editors [vendor sites, surfaced by search]; Foundry's
**Custom System Builder** remains a community module. **No user, creator or revenue figure exists for
any of the four — the finding is that the positions exist, not that they are large** (§10.8).

**What is genuinely still open, restated precisely, because "restated" must mean something:**

> **A sheet builder is a form designer. A rules engine is a calculator. Neither is scarce.** What no
> product in the set has is **an authoring surface whose output runs a live table, reads a
> per-character knowledge projection inside its own dice math, mints a citable result into an
> encyclopedia, and exports into rivals' formats.** Rollplay has the builder and no table. Foundry has
> the table and requires JavaScript. World Anvil has neither and charges $99–105/yr for HTML + CSS +
> TWIG. **That intersection is empty and it is bounded by four requirements, not one** — which is why
> it is harder to homestead than a drag-and-drop canvas, and why any copy that says only *"build your
> system without code"* is now selling a commodity a free competitor already ships.

**0.5 — World Anvil's lifetime Grandmaster is $650, and that blunts the sharpest sentence in RB-14.**
[Kindlepreneur, third-party, last updated 2025-10-01, verified today; **reproduced by RB-19 §1.3**]:
Grandmaster *"$12/month"*, *"$105/year"*, *"$650/lifetime"*. RB-14 §3.1 recorded lifetime prices as *no
reliable figure* and inferred $400–500; the inference was low. RB-14 §3.4 called *"$99/year forever
versus €30 once"* the single sharpest sentence in the brief. It is weaker than it looks: the buyer who
does arithmetic can already buy World Anvil's forever for **$650 once**. At **1 EUR ≈ 1.10 USD** (the
one rate this document uses, stated in the header, unverified) ~€30 ≈ ~$33, so we remain roughly
**1/20th of that sticker** — still a very large number, but **the axis is price, not forever**, and
copy that leans on "forever" will be answered by a link to their lifetime page.

**0.6 — The map question was argued by four briefs and a measurement spike before this document was
written, and the answer re-scopes a refusal rather than adding a surface.**
This finding exists because revision 1 did not have it. RB-20a (12:56), RB-20b (12:56), RB-20d (12:57),
RB-20c (13:02) and `spikes/spike-K-kartenmass/` (12:54) all landed before revision 1 (13:04) and all
target the same verbatim stakeholder sentence: *„integriertes Inkarnate oder etwas Besseres wäre
natürlich sexy … (ist aber auch gottlos schwierig vernünftig zu implementieren)"*. **Four briefs
answered a question the binding document had never heard.** Their agreed finding, which is unusually
convergent for four independent passes:

| The three things "integriertes Inkarnate" turns out to be | Price | Verdict |
|---|---|---|
| **The stamp library** — Inkarnate ships 23,400–30,000+ assets [vendor, and internally inconsistent], **4,600 in a single release, with 23 employees** [RB-20a §4.2] | unbuyable *and* unmakeable — RB-04's redistribution trap is confirmed at the category leader's own store: *"Customers may not redistribute, extract, or resell any Products"* | **REFUSE, permanently** |
| **The terrain paint substrate** — brush, mask, blend, tiled undo over 67.1 megapixels | *"Photoshop-in-the-browser … the single largest unpriced surface in this whole area"* [RB-20c §5.1] | **REFUSE — and it is designed out, not deferred** (§3.1 row 7) |
| **The place layer** — regions, routes, places as entities that cite passages, carry clauses and project through `Sicht` | RB-20b measures the whole editor at **37 base / ≈44 with contingency**; the *minimal* version, `Der Ortsleger`, at **21 / ≈25**; RB-20a's `Der Kartenleger` at **≈43 / ≈52** | **Required anyway** — it is the wiki's geography surface, and 4 of its days are owed to K5 regardless |

**Three consequences that change what this document says elsewhere, each carried into the section it
belongs to:**

1. **The art bill is not the monster; it is the only calibrated line in the project.** RB-20c counted
   the actual visual vocabulary of Kaya's 8192² map: **≈90 distinct drawn assets, not thousands**, of
   which the settlement layer is **four glyph designs** available free under CC BY from game-icons.net,
   the eleven base surfaces are CC0, and the coastal contours, shore halos, roads and rivers are
   **strokes and mask offsets, not drawings**. Commissioning the ~60 that must be drawn runs
   **€2,700–8,200** at published per-asset rates. **That is the only number in this entire corpus
   denominated in a calibrated unit**, because an illustrator's per-asset rate is published and a
   "developer-day with an AI crew" is not. *(Ledger entry **M4** sharpens this and I adopt the
   sharpening: the art is the only calibrated line **and** the only one payable in cash by a builder
   who has none — **those are the same fact**, which is why RB-20c's conclusion "the art is not the
   risk" is rejected even though its method is adopted. **€0 until a paying user exists.**)*
2. **Generation is free, and it manufactures doors.** Azgaar's Fantasy Map Generator is **18,165 lines
   of TypeScript in `src/generators/`, MIT plus an explicit commercial-derivative-works clause, pushed
   2026-07-26** `[gemessen, RB-20d §2.1]`, and it emits burgs, states, provinces, cultures, religions,
   rivers and routes **as named, typed, cross-referenced records** — an infobox schema, not a picture.
   RB-20d's design finding is the one that matters and it is ours to adopt: **a generator must emit
   doors, not articles.** Naive import produces ~1,000 stubs, which is World Anvil's documented disease
   at generator speed and which **deletes the champion's headline flex by turning every red link blue.**
3. **The first millisecond was finally put on the fusion claim.** RB-20b measured per-character fog as
   a vector mask at **9.4 ms per incremental reveal**, a 50,000-stamp scene at **1.06 MB gzipped / 45 ms
   parse**, culling at **0.021 ms/query**, and region hit-testing at **7.85 µs** `[gemessen,
   spike-K-kartenmass]`. Its architectural conclusion is adopted verbatim in §3.1 row 7: **the
   authoritative fog is not geometry — it is a set of revealed ids, which is exactly `Sicht`** — the
   polygon mask is a derived render artifact. **The champion's fusion claim is cheaper than its own
   ledger says**, and it is the first time in six rounds anyone attached a number to it.

**And one honest limit on all of it:** RB-20b §9.1 records *"I rendered **zero** Pixi frames today."*
Everything measured is Node-side data and CPU image work. **No GPU frame, no hosted server, no real
persistence layer and no `Sicht` has been measured by anything.** Step 0 stands unchanged and so does
the tripwire (§7 R-C).

> **Deference, recorded so the lineage shows the disagreement instead of an average.**
> [`RB-20-kartenschmiede.md`](research/RB-20-kartenschmiede.md) and RB-20e landed **after** this
> revision was drafted, and they are the dedicated synthesis of the same question. **On the map they
> govern; this section is the older document.** The refusals agree exactly. Two things diverge and both
> are recorded in `OPEN-DECISIONS.md` **P10**: (a) on Azgaar, §3.2(e) below argues Rank 4 *does not
> reach* generated input, while **M7 argues it as an explicit exception — a *shape* import rather than a
> *population* import — and M7's framing is the ledger's**; (b) on arithmetic, RB-20b's *"12 of Der
> Ortsleger's 21 days are fusion-bearing"* is superseded by **RB-20 §5.4's union pricing: every
> fusion-bearing day in the map area is inside the committed half, and the ≈37 marginal editor days
> (≈65/≈78 standalone) contain none.** **Quote RB-20's numbers, not this document's.**

---

## 1. The ambition, restated precisely

Kaya's sentence is a **destination**. This section states what it means operationally, and — with equal
force — what it does not mean, so that no later round can smuggle scope in under its banner.

### 1.1 What K9 means

**One product, one account, one permission model, one data substrate**, in which the world-knowledge
half and the live-play half are not two applications sharing a window but **two views over the same
object**. The unification is not "all the features in one place." It is that the thing a character
knows is simultaneously:

- her **article permission** in the encyclopedia,
- her **fog volume** on the map,
- the **modifier** on her die roll, and
- the **namespace** in which a roll she made in 2027 is still citable in 2031.

RB-15 §6 named this and it survived Nemesis's attack intact (RB-18 §5.2): *a server-side, per-character
knowledge projection that is simultaneously a permission, a fog volume, a dice modifier and a citation
namespace.* **That object is the ring.** Everything else in this document is about how to get to it and
what to refuse on the way.

**"Knechten" — to make every other tool serve — has a mechanical definition and it is not conquest by
feature count.** It is: *our output is readable by every rival, their output is readable by us, and the
object we mint cannot be reconstructed by any bridge between them.* RB-15 §2 establishes the empirical
ceiling of what a bridge can carry — **a number, a card, a token, an HTML string** — and no more. Half
a million people run Beyond20 to move a number across that seam [Chrome Web Store figure, carried from
RB-15]. Nobody has ever moved an object with an address, a permission and a history across it, because
the receiving product has nowhere to put one.

**"Größer" has one legitimate reading and it is reach, not surface.** RB-18 §5.3 established it and I
ratify it: UVTT was created by **Megasploot**, the solo developer of Dungeondraft and Wonderdraft, and
became the interchange standard of a market in which every incumbent was larger — *and the largest
incumbent got it last, through a third party* [RB-17 §3.2, multiple sources]. Dungeon Alchemist raised
**€2.46 M from 57,209 backers** for a tool that exports into every rival and owns no table [RB-07/11].
**The standard-setting seat is structurally vacant because incumbents have no incentive to
standardise.** That is the axis on which a one-person product can be genuinely larger than World Anvil,
and RB-17 prices it in **weeks**.

### 1.2 What K9 does not mean — the anti-smuggling clause

**K9 authorises reach. It does not authorise scope.** No design round may cite K8, K9 or "die eine
Plattform" as authority for adding a surface. The following are named refusals of this document and a
later round that wants one must overturn *this section by argument*, not invoke the ambition:

- **It does not mean the eighteen functions of RB-15 §1.** **Nine of the eighteen carry a refusal** in
  §3 below.
- **It does not mean feature parity with any named rival.** RB-01 rules the feature war against
  Foundry's 5,338 modules unwinnable; **Sigil proves it is unwinnable with Hasbro's balance sheet**
  (~90 % of the team laid off three weeks after launch; servers close 2026-10-31) [RB-16 §1.1, RB-17
  §2.4].
- **It does not mean more surfaces than World Anvil.** Their size is their most-complained-about
  property (RB-18 §3.1) and they began hiding it on 2026-07-09 (§0.1).
- **It does not mean a marketplace, a registry, a compendium, voice, scheduling, an audio library or a
  hand-drawing map editor.** Each is refused in §3 with a reason and a "what the user does instead."
- **It does not mean the giga-tool is a single release.** It is a sequence (§4), and the sequence is the
  strategy.

**The bright line, phrased so it can be quoted back at a future round:**

> **Chronicle gets bigger by being read and written by more tools, not by containing more screens.**
> Every proposed addition must answer: does this increase reach, or does it increase surface? Reach is
> the ambition. Surface is the thing that killed the benchmark's reputation and is currently being
> toggled off.

**One worked example of this clause, so it is not decorative.** Kaya's own sentence about an integrated
Inkarnate is exactly the kind of ambition that could smuggle a surface. It was argued by four briefs
(§0.6), and the answer that came back **is not a new surface** — it is a *refusal* of the two expensive
parts (the stamp library, the paint substrate) and a *re-scoping* of the third (the place layer) onto
a data layer the wiki already requires. **That is what a correct application of this clause looks
like:** the ambition was heard, priced, and answered by building less, not by adding a screen. §3.1
row 7 and §3.4 Amendment 4 carry the ruling.

---

## 2. The product thesis, in one sentence

For five rounds the crew's reference sentence was **"Wiki/Fandom + PnP session."** That sentence named
the wrong rival on both sides: Fandom is the platform users are *leaving* (a bad host, K8/K10), and
"PnP session" describes a window, not a mechanism. **It is retired here.**

The benchmark is **World Anvil**, and the seam is precisely located: **World Anvil's play integration
is thin and they say so themselves — their FAQ states that *"World Anvil's Campaign Manager is not a
virtual tabletop (VTT) or a map-making software"* [vendor, RB-14 §6.1, subject corrected per RB-19
§1.1] — while Foundry's world-knowledge is thin, which is why the blessed integration between them is a
one-way, GM-only, permission-destroying import module** [Foundry package registry, RB-14 §6.3, every
clause re-verified first-hand by RB-19 §1.2 against a 200-OK fetch].

**Two precision corrections to that sentence, both from RB-19, both of which make it stronger:**

**(a) The FAQ's subject is the Campaign Manager, not the company.** Revision 1 rendered it *"their FAQ
states **they** are…"*. The real sentence disclaims their **play product**, which is the right target
anyway — a disclaimer on the Campaign Manager *is* a disclaimer on their play surface — but it must be
quoted with its real subject, because it is quoted three times as the benchmark's own verdict on
itself. **And the duration claim is withdrawn.** Revision 1 said *"nine years of public refusal."*
**No source anywhere establishes when that sentence first appeared.** The defensible sentence, and the
only one permitted in copy from here: ***they have never built one, their own FAQ still disclaims it,
and the community suggestion asking for one is open and unshipped*** [RB-15 §0].

**(b) "One volunteer's module" understates its backing — and that makes the attack on us worse, not
better.** RB-19 §3.4 settles the attribution with a 200-OK fetch. The maintainer *is* one community
author (`didialchichi`) and the licence *is* MIT (v1.5.2, verified Foundry 14.364). **But the canonical
repository is `github.com/foundryvtt/world-anvil` — inside Foundry Gaming's own GitHub organisation —
and World Anvil documents the integration on its own knowledge base.** So the honest sentence is:

> **The bridge is written by one person, and it stands between two companies who both point at it.**

Revision 1's framing (*"one volunteer's free MIT module"*, five times) was the comfortable reading, and
it is withdrawn. **The uncomfortable reading is the load-bearing one:** §7 R-D's early-warning logic was
calibrated on the assumption that the seam is an unowned hobby artefact nobody has an incentive to
deepen. If the canonical repo sits in the incumbent VTT vendor's organisation and the incumbent wiki
vendor documents it on its own help pages, **the seam already has two companies standing next to it**,
and the trigger that watched only for Foundry release notes was too narrow. §7 R-D is re-aimed.

**And here is the part that survives the correction, which is the part that matters.** Neither company
can close the seam by deepening the bridge, because **what the bridge cannot carry is not a missing
feature — it is a missing receiving type.** RB-19 verified Foundry's own documentation verbatim:
ownership is *"established at the Journal Entry level … not individual pages"*, assigned by hand. A
better importer, a two-way sync, a free API token — none of them creates a place to put a per-character
derived projection, because Foundry's journal has no such type and World Anvil's articles have no such
predicate. **Two companies stand next to the seam and neither has anywhere to put the object.** That is
the moat, it is narrower than "they have a string", and it is true.

### The sentence

> **World Anvil cannot play and Foundry cannot remember. Chronicle is one product in which what a
> character knows *is* her article permission, *is* the fog on her map, and *is* the modifier on her
> die roll — so the evening writes the encyclopedia, and the encyclopedia changes the next roll.**

### The short form, for a door or a headline

> **Was eine Figur weiß, ist was sie sieht, was ihr verborgen bleibt, und was sie würfelt.**
> *(What a character knows is what she sees, what stays hidden from her, and what she rolls.)*

### The stranger test

A stranger reading the long sentence learns four things without a glossary: there are two named rivals
and each is missing the other's half; there is one mechanism, not two features; the mechanism is
*knowledge*; and the loop closes — play writes the world and the world changes play. It contains no
German, no invented noun, and no claim that requires trust.

**What the sentence must never become.** It must not become *"a wiki and a VTT in one window."* RB-15
§5 is unambiguous: notes beside the map is **1990s-grade integration**; a sheet beside a wiki is
co-location that ~500,000 Beyond20 *installs* are already content with [Chrome Web Store install
figure, RB-18 §7.9 — **an install count, not a user count, and revision 1 said "run" where it should
have said "installed"**]; and **maps with pins that open lore
articles is the most commoditised "fusion" in the entire landscape** — World Anvil, LegendKeeper and
Kanka all ship it. Those must never be claimed as differentiation, in any deck, at any point.

---

## 3. Absorb / integrate / refuse — ratified

RB-15's eighteen-function map is **adopted essentially whole**. It is the best-argued artifact in the
corpus and I do not improve it by disagreeing with it decoratively. This section ratifies it, records
the four places I overrule Nemesis, the six places I adopt her without face-saving, and the three
amendments the new evidence forces.

### 3.1 The ruling, in one table

| Function (RB-15 §1) | Ruling | Change from RB-15 |
|---|---|---|
| 1 World-building & wiki | **ABSORB** — with the addressable atom below the page, or it is a worse World Anvil | — |
| 2 Live tabletop (map, tokens, fog) | **ABSORB** — position is a business call, not a dependency (§4) | — |
| 3 Character sheets & builders | **ABSORB the schema**, not the catalogue | — |
| 4 Rules compendia | **REFUSE to publish · INTEGRATE the container** — CC-BY SRD 5.1/5.2 is the reference payload | — |
| 5 Encounter & combat management | **ABSORB** — table stakes, already costed at 7 days | — |
| 6 Generation | **ABSORB deterministic · ABSORB AI strictly as runtime draft · REFUSE AI art** | **amended (§3.4 A4): deterministic world generation is INTEGRATE, not build — Azgaar's FMG is MIT with a commercial-derivatives clause, 18,165 lines we do not write [RB-20d §2.1] — and its output lands as *doors*, never as articles** |
| 7 Map making | **INTEGRATE assets + UVTT · ABSORB WFC generation · REFUSE the paint program · REFUSE the stamp library · ABSORB the place layer** | **amended (§3.4 A4).** The paint refusal is *upheld and hardened*: the terrain paint substrate is refused **and designed out**, not deferred [RB-20c §5.1]. The stamp library is refused **permanently** — 4,600 assets in one release, 23 employees, unbuyable under RB-04's redistribution trap [RB-20a §4]. The **place layer** (regions, routes, places as entities) is neither refused nor granted by RB-15 because it is not a map-making function — **it is the wiki's geography surface and is ruled ABSORB here** |
| 8 Audio & ambience | **REFUSE the library · INTEGRATE at most a named cue** | — |
| 9 Session prep & notes | **ABSORB — the thesis is that we delete it** | — |
| 10 Timelines & calendars | **ABSORB the in-fiction date · REFUSE the calendar engine** | — |
| 11 Relationship & faction tracking | **ABSORB as a derived view only. No new noun.** | reinforced — WA shipped a *"streamlined Diplomacy Webs"* update 2026-07-09 [vendor]; let them own it |
| 12 Scheduling & group-finding | **REFUSE, absolutely** — the moat is liquidity we cannot fill | — |
| 13 Play-by-post & async | **ABSORB — the strongest ABSORB on the map, unowned on both sides** | — |
| 14 Voice / video | **REFUSE** — an SFU is a per-minute bill against a payment received once | — |
| 15 Dice | **ABSORB virtual · INTEGRATE hardware, deferred, never a hardware relationship** | — |
| 16 Content marketplaces | **REFUSE the storefront · ABSORB the format** | — |
| 17 Streaming / actual play | **REFUSE** | — |
| 18 Import / export / bridging | **ABSORB as first-class product surface — and it is the weapon** | promoted: the *format* moves earlier (§4) |

**Counted, and this time the count reconciles with the table.** Revision 1 printed *"9 ABSORB · 4
INTEGRATE · 10 REFUSE"*, inherited from RB-15 §3's own unreconciled count, and §1.2 said *"ten of them
are refused."* Both were wrong. Adding the split rulings in the table above, **before** this revision's
two amendments: **14 ABSORB · 4 INTEGRATE · 9 REFUSE**, with **nine of the eighteen functions carrying
at least one refusal** (4, 6, 7, 8, 10, 12, 14, 16, 17). Row 7's amendment adds one ABSORB and one
REFUSE, giving **15 · 4 · 10** as the standing tally. *(RB-19 m3. A count that does not add up is a
small thing; a count that does not add up inside the sentence "the refusals are the load-bearing half"
is not.)*

**The refusals remain the load-bearing half — not by arithmetic but by consequence.** Each carries a
"what the user does instead" in RB-15 §3.3 and those sentences are ratified verbatim as the product's
public answer.

### 3.2 Where I overrule Nemesis

**(a) Parity days are not waste.** RB-18 §4.2 splits the tactical half into **31 fusion-bearing days
and 69 parity days** (48/52 on the generous reading) and treats the parity share as an indictment. I
overrule the framing and keep the finding. **RB-17 §1.8 is decisive and points the other way:
Foundry's dominance was *acquired by the software* and is only *defended by the ecosystem*.** Reviewers
say the unmodded battlemap *"blows away the competition"* — that is what converted GMs at $50 in 2020,
when there was no ecosystem. A product whose parity half is merely adequate loses the evaluation and
never gets to show anyone its fusion. **The parity days buy the right to be evaluated. They are not
optional and they must not be cut.**

**What I adopt from the same section without alteration:** the **order**. The 31–48 fusion-bearing days
are the only days that cannot be bought for $50, and they are the ones currently sequenced last. They
run first. §4 encodes this.

**(b) "Größer" is not refuted by the overwhelm complaints.** RB-18 §3.4 argues this itself and I ratify
its own counter-argument over its own front three: **every documented World Anvil overwhelm complaint
is a first-hour or first-month complaint** — *"after two months I cancelled"*, *"despite using it for a
month"*, *"can feel overwhelming **at first**"*. Nobody complains that World Anvil is too big in year
three; the people with 150,000-word worlds complain about the **editor migration**, which is a
competence failure, not a size failure. **Size is a top-of-funnel problem.** Therefore größer is
survivable if and only if **the first hour is small**, and that is a gate, not a compromise (§6.4).
*(Honesty marker, carried from RB-18 §7: this generalisation is an inference from complaint timestamps.
There is no funnel data of any kind. It is the best available reading, not a measurement.)*

**(c) The Realm Works comparison is right and its lesson is narrower than it reads.** RB-18 §2.2 is
correct that Chronicle resembles **Realm Works' Kickstarter page, January 2013** — a fully specified
system-agnostic knowledge platform whose central mechanism was a per-player selective reveal, with a
business model written down and no sync layer in existence. I do not soften it. But RB-18 §2.3 states
the four differences itself and the first is decisive: **Realm Works was desktop-first with sync bolted
on; truth lived on the GM's machine and had to be pushed.** `Grenze B9` — *der Projektor ist der
Server* — makes that specific death structurally unavailable. **Our `Sicht` risk is "can one person
build and afford it," not "was this ever the right shape."** That is a materially better position and
the comparison must be quoted with it attached.

**(d) One import target, and World Anvil is not it.** RB-14 §5.6 argues that a World Anvil importer is
*"a second, equally load-bearing importer"* and easier than Fandom's because their export is already
JSON and their API is read/write. RB-17 Rank 4 rules the opposite: **one flagship migration, chosen for
population, never two**, because a half-fidelity import burns the single moment a user is willing to
move. **I rule with RB-17 and against RB-14.** K10 makes the Eron/Fandom corpus a binding fixture, and
the acceptance test is already specified. **World Anvil import is target two and does not ship at
launch** — but the format (§4 step 4) must be designed so that target two costs days rather than weeks,
and that constraint is recorded as a design obligation now, when it is free.

**(e) The Azgaar collision, ruled explicitly rather than smuggled — because RB-20a asked for exactly
that.** RB-20a §7.3 item 3 proposes **a second import target, Azgaar GeoJSON/JSON**, and says in its own
words that it *"should be argued explicitly against Rank 4's 'exactly one' rule rather than smuggled
past it."* Revision 1 ruled *"one flagship migration … never two"* as settled without knowing the
challenge existed. **It is answered here, and the ruling is that the two things are not the same kind of
thing.**

RB-17 Rank 4's rule is about **migration**: *a half-fidelity import burns the single moment a user is
willing to move.* Every clause of it is about a **user's existing corpus** — years of their writing,
one switching moment, no second chance. Azgaar intake has none of those properties:

| | A migration (Rank 4's subject) | Azgaar/FMG intake |
|---|---|---|
| What is at risk | the user's irreplaceable corpus | nothing — the source is machine-generated |
| The moment | one, and it does not come twice | infinite; regenerate with the same seed |
| Fidelity failure means | their world is damaged and they leave | press the button again |
| Provenance | must be preserved | is a seed and a version string |

**Ruling: Azgaar intake is not a migration and Rank 4 does not reach it. The "exactly one flagship
migration" rule stands, unamended, and Eron/Fandom remains that one.**

> **Superseded in framing, not in outcome.** `RB-20-kartenschmiede.md` §5.2 and ledger entry **M7**
> reach the same admission by a different route: they treat Azgaar **as** a second import and argue it
> **explicitly against Rank 4** as a *shape* import rather than a *population* import. **That is the
> framing the ledger carries and the one a round should quote.** I record my own argument here rather
> than deleting it, because the two disagree about what Rank 4 *is* — and a lineage that hides that
> disagreement will re-litigate it in round 7.

But two conditions attach, and they are not decoration:

1. **It is a surface, so §1.2 applies.** It earns its place only through the sequence, and it is gated
   behind **`S-G1 · Der Keim` — one day** (RB-20d move 1: generate one world by hand, export Full JSON,
   write the mapper, print the counts). If the mapper is not written and printing counts inside one day,
   every other number in RB-20d's table is wrong, **and that is the finding.**
2. **The output lands as doors, not articles** (§0.6, RB-20d §4.3). A naive import produces ~1,000
   stubs and **deletes the champion's headline flex by turning every red link blue.** A generated place
   is a row — `{id, name, x, y, seed, typ, eltern, quelle}` — that renders everywhere as a red link with
   a seed behind it. `Nichts wird automatisch Kanon`, applied to geography.

**And the honest risk that comes with it, named now:** RB-20d §4.5 identifies **idempotent re-import**
as the one genuinely hard engineering problem in the pipeline — FMG's ids are array indices, and array
indices are not stable across regeneration. The existing tooling does not solve it (`azgaar-foundry`'s
own README: *"updates require reimporting the map to refresh journal contents"*). Its estimate is 4 days
by analogy to `spike-A-passage-identity`, **and RB-20d calls it the highest-variance number in its own
table.** If the three-way merge cannot preserve human paragraphs across a regeneration, **the ruling is
import-once, said out loud, rather than a lossy merge.** Recorded as open decision **P10**.

### 3.3 Where Nemesis is right and it is adopted without face-saving

1. **The ≈120-day figure is wrong.** CHAMPION §9.2's own table sums to **100**. Either twenty days are
   unattributed or the headline is padded. Fix the ledger before the next round quotes it.
2. **Round 3's 20 % contingency (16 days) was deleted between rounds with no note.** Restore it.
3. **The 60-day editor half fell off every total the lineage quotes.** Restore it to the ledger.
4. **K1, K2, K5, the rules engine, search at scale, the CC-BY SRD reference package, the art pipeline,
   the Eron import and the *job* of operating a hosted world have no price after five rounds.** A
   ratified go-to-market with no cost is not a plan.
5. **The moat has never been attacked against the real stack** — Foundry ($50 once) + World Anvil
   Grandmaster ($99–105/yr) + **the free MIT bridge module hosted in Foundry Gaming's own GitHub
   organisation and documented on World Anvil's knowledge base** (§2 b; the *"one volunteer's module"*
   framing is withdrawn), which RB-14 estimates delivers **~80 % of Chronicle's fusion**. Every future
   flex must be demonstrated against that stack, never against Foundry alone. **The correction makes
   this finding worse for us, which is why it is written this way.**
6. **The tripwire.** RB-16 R7 declared that *five* is the number of rounds at which a load-bearing
   mechanism remaining grafted, unbuilt and unmeasured converts a design record into a promise ledger.
   `Sicht` is at four. **Round 6 forges nothing until S-P1 has run** (§4 step 0, §7 R-C).

### 3.4 The four amendments the new evidence forces

**Amendment 1 — the wedge is restated, and three of our own briefs are corrected.** "No-code sheet
builder" is not an unclaimed position; **Rollplay homesteads it, at our own price posture** (§0.4:
*"No subscription. No account required. Works offline."*), and **RB-01, RB-14 §8.7 and RB-17 §5/Rank 3
each assert vacancy and are each wrong on that clause.** **The claim Chronicle makes is: system
authoring whose output runs a live table, carries per-character knowledge into its own dice math, mints
a citable result into an encyclopedia, and exports into every rival.** Rollplay has the builder and no
table. Foundry has the table and requires JavaScript. World Anvil has neither and charges $99–105/yr
for HTML + CSS + TWIG. **That four-clause intersection is still empty and it is harder to homestead
than a form designer.** Any marketing that says only "build your system without code" is now selling a
commodity a free competitor already ships.

**Amendment 2 — the overwhelm opening is time-limited.** World Anvil began shipping feature toggles on
2026-07-09 (§0.1) and shipped a search overhaul on 2026-01-23 and inline article creation on 2026-01-14
[vendor blog, verified today]. **They are executing.** Craft-based openings against their surface
depreciate. The openings that do not depreciate are the **structural** ones: **no VTT** (they have never
built one, their own Campaign Manager FAQ still disclaims it, and the community suggestion asking for
one is open and unshipped — *the "nine years" claim of revision 1 is withdrawn as unsourced,* RB-19
§1.1), no rules engine, a subscription model whose top Trustpilot mentions are *Subscription · Refund ·
Customer communications*, and — the one they cannot fix without becoming a different company — **no
per-character knowledge projection under anything.**

**Amendment 3 — the challenge calendar is absorbed, but gated on an audience.** RB-14 §8.11 rates
Summer Camp / WorldEmber as *"the highest ratio of growth to engineering days in the entire competitive
set."* I agree it is nearly free and I ratify **MATCH** — but a writing challenge with no participants
is published evidence against us, exactly as RB-17 A-5 says of a registry with six packages. **Ruling:
build the artifact that makes a challenge possible in year one — `die offene Tür`, the public
unauthenticated permalink — and run the first challenge only when a stated threshold of public worlds
exists.** Provisional threshold in §9 (P3).

**Amendment 4 — the map question, ruled.** Four briefs and a measurement spike (§0.6) answered Kaya's
"integriertes Inkarnate" sentence before this document first existed. **The ruling, in five lines, and
it is a re-scoping rather than an addition:**

1. **RB-15 §3.3/7c's refusal of a hand-drawing map editor is upheld and hardened.** Not because a brush
   engine is hard — RB-20b measures it as *"a mask render-texture, a soft round brush and a blend
   mode"*, a first-week exercise — but because **a raster layer costs resolution independence, costs
   cheap undo (84-byte patches vs. texture deltas, `[gemessen]`), and costs K1's theme re-skinning
   outright.** A raster mask cannot re-skin; repaint a raster map in PixelArt and you get a blurry
   raster map. **The strongest argument against the brush layer is K1**, and it is ours, not RB-15's.
2. **The stamp library is refused permanently.** 4,600 assets in one Inkarnate release, 23 employees,
   23,400–30,000+ in the library, and **unbuyable** — the category leader's own store terms forbid
   exactly what a browser VTT does: *"Customers may not redistribute, extract, or resell any Products,
   whether in raw or modified form."* [RB-20a §2.2/5; RB-04's redistribution trap, confirmed at the
   only store that matters].
3. **The terrain paint substrate is not deferred — it is designed out.** RB-20c §5.1 names it as the
   real difficulty and the largest unpriced surface in this area: a paint program on a 67-megapixel
   canvas. **The generator replaces the painter** (die Schmiede, §4 step 10). *(Honesty marker, RB-20c
   §7.7: this is an architectural claim resting on a WFC generator that does not exist yet. Nothing has
   demonstrated it.)*
4. **The place layer is ABSORB, and it was never RB-15's to refuse.** Regions, routes and places as
   queryable, permissioned entities are required by K8/K9 whether or not anyone ever paints anything —
   *"the wiki links to it."* RB-20b §7.3 flags this explicitly as its own argument rather than RB-15's
   and asks for an explicit ruling. **This is that ruling: the place layer is the wiki's geography
   surface, not a map-making function, and it is in.**
5. **The art bill is small, calibrated and delegable, and it is not the risk.** ≈90 distinct assets on
   Kaya's whole map, ~60 that must be commissioned, **€2,700–8,200** at published per-asset rates, of
   which the screenshot set is **12 assets / €1,100–2,200** [RB-20c §2a, §5.2]. **This is the only line
   item in the entire corpus priced in a calibrated unit.** *(And the one discipline that halves it —
   greyscale-with-alpha authoring for tint — is a discipline we would impose, not a practice RB-20c
   observed; its own §7.1 records the measurement that failed to establish it.)*

**What this amendment does not authorise.** No brush engine, no coastline beautification, no mask tool,
no first-party stamp library, no marketplace for stamps. **The moment any of those enters, the estimates
are void and RB-15 §7c's refusal is correct exactly as written.**

**And the amendment defers on everything downstream of the refusals.** `RB-20-kartenschmiede.md` is the
dedicated synthesis and **its ledger entries M1–M8 govern**: **M2** (the map is a feature of a wiki,
never a map product, never in a comparison table whose other column is a painting tool) · **M3** (the
placement editor is deferred, not refused, priced by union at ≈37 marginal / ≈65–78 standalone — *not*
the 37 or 43 the individual briefs printed) · **M4** (€0 of art until a paying user exists; the art is
the only calibrated line **and** the only one payable in cash by a builder with none, which are the same
fact) · **M5** (*die Häutungsregel* — the map re-skins where we drew it and not where they drew it) ·
**M6** (consume Azgaar's export, never fork it) · **M7** (the Azgaar import, argued against Rank 4) ·
**M8** (die Schmiede means the generator, the theme editor and the rule-builder — not a map editor —
and the 3-day package boundary is taken regardless, as gate **K-G8**). **And M1 is the question nobody
had asked: does Kaya still have the *layered project file* for the Andaria map?** If he does, the
vector world layer is an import rather than a reconstruction. **Nothing in this document overrides any
of those.**

---

## 4. The order of conquest

**Not a roadmap of features. A dependency order, with the multiplier named at every step.** The
governing rule, adopted from RB-15 §4 and RB-17 §6.3 and stated once:

> **Refuse to build the seam before the thing worth plugging into — and refuse to build any surface
> whose substrate has not been measured.**

Each step below states **what it unlocks**, and — the part the brief asks for — **which later step it
makes cheaper**. Where a step's position is fixed by *strategy* rather than by *dependency*, that is
said explicitly, because those are the only positions Kaya can move without breaking anything.

### Step 0 — Calibrate the unit. *(Two days plus a fifth of S-T1. Before round 6 forges anything.)*

`S-P1` (*Drei Bücher, ein Server*) and a fifth of `S-T1`. **Unlocks:** nothing in the product.
**Makes cheaper:** *every subsequent estimate in the project.* RB-18 §1.7's finding is the one that
matters most: **the number is not impossible, the number has no unit.** ≈260–270 developer-days is
denominated in "one developer with an AI crew" days.

**The inventory, corrected — because revision 1 inherited a wrong one and built the project's
highest-priority action on it.** RB-18 §1.6 counted 2,454 lines and concluded *"the lineage has exactly
one datum"*; revision 1 carried that forward as *"zero data points"* and *"not a single line of server,
renderer, projection or persistence code."* RB-19 §3.5 re-counted with `wc -l` over every `.js`/`.mjs`
under `design/`: **3,661 lines, and four spike directories, three of them with `RESULTS.txt` on disk.**
What actually exists:

| Artifact | What it measured | Evidence |
|---|---|---|
| `spike-A-passage-identity` | the addressable atom: 116 SLOC identity layer, **0.087 ms/keystroke at 300 passages, 0.372 ms at 2,000**, 3,000-op fuzz with zero foreign passage-ids surviving | `RESULTS.txt` |
| `spike-B-wiederkehr` | **the door ceremony end to end**: 41/41 passing, WebAuthn assertion verify **0.3728 ms**, `openDoor → confirmMint` round trip **0.0154 ms**, revocation races, der Zwillingsbeweis for door privacy, 404-timing spread **0.70 µs** | `RESULTS.txt` |
| `spike-B-w1` | the *Türquote* gate run as an instrument: power vs. false-green at N=3..40; KLM issuance-time arithmetic | `RESULTS.txt` |
| `spike-K-kartenmass` | scene serialisation (**50 k stamps = 1.06 MB gz, 45.4 ms parse**), culling (**0.021 ms/query**), region hit-test (**7.85 µs**), incremental per-character fog (**9.38 ms**), 84-byte undo patch, full-image colour census and tile-encode timings on the real 8192² map | scripts on disk; results embedded in RB-20b as `[gemessen]`. **No `RESULTS.txt` — RB-19 §9.8 could not confirm it ran to completion, and I did not re-run it either** |
| the tile pyramid | **1,365 tiles, 9.9 MB, 31.7 s build, 616× faster first pixel** on Kaya's 8192² map | `fixtures/eron/media/kachelpyramide/pyramide.json` |

**So the corrected sentence is:** *five measured artifacts exist, across identity, the door ceremony, a
gate's statistical power, map/scene data structures and the image pipeline.* **"Zero data points" was
false and is withdrawn.**

**And Step 0 survives the correction unchanged, which is the point of saying so.** Not one of those five
is **a hosted server over a real network, a real persistence layer under load, a GPU-rendered frame**
(RB-20b §9.1: *"I rendered **zero** Pixi frames today"*), **or `Sicht` itself.** RB-18's thesis is not
overturned — only its "zero" and its "single". One measured day of *server and projection* work set
beside one estimated day still converts the ledger from rhetoric into a bill, and nothing on disk has
done that. **This remains the highest-leverage two days available in the project and it has been
mandatory and unrun for four rounds.**

**One addition to Step 0, at a cost of one day, because it is now the cheapest calibration available:**
run **`S-G1 · Der Keim`** alongside (RB-20d move 1) — generate one FMG world by hand, export Full JSON,
write the mapper, print the entity counts and id stability across two exports of the same seed. No
canvas, no Pixi, no renderer. It calibrates the *parser/mapper* class of day, it is the gate on §3.2(e),
and if it does not finish in one day **every number in RB-20d's table is wrong and we find out for one
day instead of twenty.**

### Step 1 — Determinism of the roll. *(Dependency-fixed. First.)*

Integer-only arithmetic, pinned RNG, locale-free formatting, cross-platform byte equality; gate
*Nachgerechnet*. **Unlocks:** every claim that a roll is *citable* rather than merely rolled.
**Makes cheaper:** step 4 (a non-deterministic roll cannot be serialised into a format other people
read without shipping our RNG with it), step 5 (export fidelity), and the 2031 durability promise,
which is otherwise decoration. **Why first:** it is a constraint on the dice engine, and constraints
retrofitted cost an order of magnitude more than constraints designed in.

### Step 2 — `Sicht`, the per-character projection. *(Dependency-fixed. The ring.)*

Server-side, per-character, one predicate. **Unlocks — and this is the multiplier that justifies the
whole ordering:** fog, article permission, `haelt_etikett`, `erfahrungsgrad`, die Gegenüberstellung,
der Brief, `tuer_zustand`, der Umbruch, the masked handout, the relationship view (as a projection, not
an object), and `die offene Tür`'s public permalink. **Eleven surfaces, one object.**
**Makes cheaper:** all eleven, and it makes the *refusals* in §3 cheap too — RB-15 §3.3/11b can refuse
an editable relationship graph precisely because the projection already knows who has heard what from
whom. **Why second:** it is the only mechanism four separate product claims share, and it is the layer
Realm Works spent six years failing to land with a company and $170,748 behind it.

### Step 3 — The addressable atom and the closed set of mint handlers. *(Dependency-fixed.)*

The passage as an object below the page; the five `praegung.*` gestures; `der Augenblick`.
**Unlocks:** the flex, the footnote-as-roll, provenance chips, and the one thing RB-15 §2 proves no
bridge can ever carry. **Makes cheaper:** step 4 — **you cannot publish a format for objects you have
not defined**, and every day spent defining the atom late is a day of format churn. **Why third:** it
needs a roll worth citing (1) and a projection to be cited *to* (2).

### Step 4 — Publish the format. *(Moved earlier than RB-15 placed it. Days, not weeks.)*

A documented, **versioned** JSON schema for the rule package and the `.chronicle` campaign bundle,
under a permissive licence, with a reference parser in a public repo and a **non-retroactivity promise**
modelled on Foundry's own licence clause — *modifications shall not retroactively alter or revoke the
rights given under the previous limited license* [foundryvtt.com/article/license, via RB-17 §1.6].
**Unlocks:** every later interoperation claim. **Makes cheaper:** step 5 (export is a serialiser over a
schema that already exists), step 6 (import is a mapper *onto* it), step 11 (in-app install is a
validator over it), and the World Anvil importer that §3.2(d) defers to target two.
**Why here and not later:** RB-17 Rank 2 rates it the cheapest moat on the list, and its real cost is
**discipline, not code** — a published format cannot be casually changed, which is exactly why it must
be published before the surfaces that would churn it. **This is the UVTT move, and UVTT was one solo
developer's act.**

### Step 5 — Export into every rival. *(Position fixed by strategy: launch. Already ratified by RB-11.)*

UVTT out; Foundry-shaped scene and journal JSON; Fantasy-Grounds-shaped XML; Markdown/HTML for the wiki
half. RB-17 Rank 1 estimates 13–18 days total. **Unlocks:** the whole addressable market without asking
anyone to switch, and it neutralises the strongest objection to buying from a solo developer — *"what
if it dies."* **Makes cheaper:** step 6, because the importer and the exporter share a parser for UVTT
and share the schema for everything else. **The precedent is not theoretical:** Dungeon Alchemist
reached the entire market by exporting into its rivals, and **Role's own survival move was to stop
building its tactical half and integrate Owlbear Rodeo instead** [RB-16 §1.8]. Interoperation is a
survival strategy, not a concession.

### Step 6 — One high-fidelity import. *(Position fixed by strategy: before launch. Exactly one.)*

The Eron/Fandom corpus (K10, RB-12). **Unlocks:** the switching cost — the only cost we can pay on the
user's behalf. **Makes cheaper:** *the demo, and therefore every artifact in year one.* RB-15 §6 is
right that this does double duty as the migration weapon and the content bootstrap: **a wiki-fusion
product cannot be demonstrated empty**, and CHAMPION §15.9 has conceded session one is empty for four
rounds. **Hard rule, adopted from RB-17 Rank 4:** never ship a half-fidelity importer. A bad import
burns the one moment a user is willing to move, and it does not come twice.

### Step 7 — The declarative rules engine. *(Dependency-fixed.)*

**Unlocks:** the clause that makes a roll a *citation* rather than a number; `die Wissensprobe`;
system-agnosticism as a property rather than a slogan. **Makes cheaper:** step 9 — and the intake's own
tension 2 is the reason this cannot be inverted: *building the builder before the rules engine exists
is building a facade*, and a facade shown to system authors, the exact audience RB-11 ratified as our
channel, is the one demo we cannot afford to fake.

### Step 8 — The canvas. *(Position is a business call, not a dependency. Kaya's.)*

Pixi, tile pyramid, KTX2, GPU fog. **Unlocks:** the drawing of the tactical half, and nothing above it.
**Nothing in steps 0–7 or 9–12 requires it.** RB-17 §2.5 argues the knowledge half is strategically the
correct half to ship first — three separate community projects (Beyond20, Avrae, AboveVTT) route
*around* the map layer to reach the knowledge and character layer, and nobody built the reverse; **the
tabletop is the half the market has repeatedly demonstrated it will swap.** Against that: RB-05 and
RB-15 §1.2 show the market's *entry expectation* is a map, and no artifact in five rounds has
demonstrated that an outline table is pleasant for four hours. **Both arguments are sound. Only Kaya
can price the gap** (§9, and CHAMPION §9.6 already logs it).

**What the map corpus adds to this fork, and it moves it.** RB-20b §8 shows there is a **third option
neither side of the fork had**: a *map reader* over the already-built tile pyramid, with entity-bound
places and per-character `Sicht`, needs **no stamp renderer, no atlas pipeline, no brushes, no 8192²
export and no asset library.** Kaya's own 8192² Andaria opens in **17 KB and one frame** because the
pyramid is on disk and measured. **That satisfies the market's entry expectation with a picture the
stakeholder already owns**, and it does it without taking the canvas's authoring cost. **A round-6
candidate that forks on "canvas or no canvas" without considering "reader before writer" has forked on
the wrong axis.** The unpriced part remains the same as ever: RB-20b rendered zero Pixi frames, and its
own §10 names the one-day spike (`S-K1 · Der Stempelwurf`) that would close it.

**For the day counts, quote [`RB-20-kartenschmiede.md`](research/RB-20-kartenschmiede.md) §5.3–5.4, not
the individual briefs.** Its union pricing supersedes them, and its finding is sharper and less
flattering than any of theirs: **every fusion-bearing day in the entire map area is inside the
committed half, and the ≈37 marginal editor days (≈65/≈78 standalone) contain none** — which means
deferring the editor costs no differentiator at all. That is the arithmetic the ledger carries (M3).

### Step 9 — The visual rule-builder. *(K2. The go-to-market.)*

GUI over step 7's structures. Order within it, per intake tension 2: engine → schema forms → layout
editor → formula/node editor with live trace (`die Testtafel`). **Unlocks:** the only mechanism on the
list that manufactures **authors**, and authors are what an ecosystem is later made of.
**Makes cheaper:** nothing downstream — it is a terminal capability. Its value is entirely acquisition,
which is why RB-11 ratified it as the channel and why §3.4's amendment matters: it must ship as *system
authoring attached to a table*, never as a sheet designer.

### Step 10 — WFC map generation, die Schmiede. *(K5's flagship. Late, and well.)*

Needs a renderer (8) and an asset pipeline (RB-04). **Why late is right:** Dungeon Alchemist proves
this is a *product in its own right*, which is an argument for building it well and late rather than
badly and early — **four years in Early Access, €2.46 M, 6,000+ objects, a studio, and it still ships
one visual style and no elevation** [RB-20a §3.4]. That is the honest calibration for anyone estimating
a generator. **Keep it separable by architecture** (RB-11's ruling, OPEN-DECISIONS S5) — it is the
lifeboat SKU in §7 R-B, and RB-20b §6 makes the seam concrete and cheap: `packages/{szene, render,
forge, chronik}` with **one CI rule — `packages/forge` must never import `packages/chronik`** — at a
cost of 3 days. *"The Forge authors geometry; the campaign authors who may see it."* If that boundary
blurs, separability is dead and unrepairable, and with it the whole of §7 R-B.

**Three corrections the generation corpus forces on this step.** (i) **The algorithm is free and the
grammar is the product** — RB-04's bottleneck finding survives contact and sharpens: WFC's cost is *an
authored, constraint-annotated tileset* and **nobody ships socket metadata with any asset pack in this
market**. mxgmn/WaveFunctionCollapse is MIT; Karth & Smith (FDG 2017) establish that global properties
— *including "you must be able to find a path from the entrance to the exit"* — are **extensions bolted
onto WFC, not native to it**, and Gumin's own README concedes tileset satisfiability is NP-hard. So:
algorithm ≈5 days; **grammar and art unbounded, and that is where the refusal lives.** (ii) **Do not
take donjon's code** — it is **CC BY-NC 3.0**, which is fatal for a commercial product; RB-15's ABSORB
for deterministic generators means *build our own*, never *take theirs* [RB-20d §5]. (iii) **A rival
already ships the generation half.** RB-05 improvement #7 — *"nobody generates inside the VTT and lands
a walled, lit, playable scene"* — **is false as of ~June 2026**: **Augur: Instant Dungeons** does it in
Foundry with native Wall documents, doors, lights, seeds, and ingest of *"100k+ object"* Dungeondraft
libraries, paid via Patreon. **Its lesson is the one to steal: the way to solve the stamp problem is to
not own the stamps.** Generation is parity now; **only the linking half is unclaimed.**

### Step 11 — In-app file-based package install. *(Late year one. The seam without the job.)*

A signed, hash-verified `.chronicle-pkg` installable from a file **inside the app** — no server, no
submissions queue, no moderation. RB-17 Rank 7, ~1–2 weeks. **Makes cheaper:** any future registry,
which becomes a front end over an install path that already works — and in the meantime packages
circulate over Discord and itch.io, which is exactly how Foundry's ecosystem behaved before its
registry mattered.

### Step 12 — A hosted registry, a marketplace, an ecosystem. *(Refused for years. Not a step.)*

Foundry opened its store **four years and nine months after launch**, by which time the ecosystem
already had thousands of packages [RB-17 §1.4]. A registry is not an artifact you ship; it is a
permanent operational job — manual review, compatibility policy, breakage management, moderation,
licence vetting, security review. **A registry with six packages is published evidence against us.**

### 4.1 The sequence in one line

> **Measure the unit → freeze the roll → build the ring → define the atom → publish the format →
> export into everyone → import once, perfectly → build the engine → (draw the map, when Kaya says) →
> ship the builder → forge the maps → open the install path.** The registry comes in year three or
> never.

**And the one sentence that explains why this order and not another:** *every step from 1 to 6 makes at
least one later step cheaper, and steps 9 and 10 make nothing cheaper — which is exactly why they are
the ones a maximal ambition wants to build first.*

---

## 5. Where we are better than World Anvil, concretely

Each row: **their capability · their weakness, cited from their own users or their own documentation ·
our answer · how a design round tests the answer in an artifact.** Rows where the opening is closing
are marked **⏳**.

| # | Their capability | Their weakness (cited) | Our answer | How a round tests it |
|---|---|---|---|---|
| 1 | **The editor** — three coexisting (**Plutarch**, the new visual editor · **Plato**, the older one users are migrating *from* · **Euclid**, the advanced/BBCode editor — *names corrected per RB-19 m2; revision 1 inverted them*) | **WA's own docs warn** switching *"isn't recommended unless you're certain you don't have any advanced or unorthodox BBCode, as you might lose part of your content"*; a user with a 150,000-word world reported tables deleted on conversion; 1★ 2026-02-02: *"switching back and forth between old and new edit view constantly breaks formatting"*; 2★ 2025-10-25: *"I've lost track of how many times I've typed out detailed notes, only for an unexpected error to wipe it all out"*. **And a Manual Save Button had to be restored on 2026-01-22 "following user feedback"** [vendor dev-news, verified today] | **One editor.** The lineage's single measured artifact: 116 SLOC identity layer, 0.087 ms/keystroke at 300 passages, 0.372 ms at 2,000, a 3,000-operation fuzz with zero foreign passage-ids surviving, three fatals found and repaired | An artifact that **imports the Eron corpus, rewrites a 2,000-passage article, and diffs byte-identical** — the exact operation their documentation warns against |
| 2 | **Character sheets, 100+ systems** | Custom sheets require **HTML + CSS + TWIG** and the **$99–105/yr Grandmaster tier**; WA's own words: *"a technical advanced feature that involves coding"*. Sheets are display objects: a reviewer running Vampire *"cannot use the sheet on the site to keep track of superficial and aggravated damage"* | **K2's visual rule-builder over a declarative engine**, free with the licence, with `die Testtafel` (live per-actor preview) — and, per §3.4, **attached to a live table**, which no no-code competitor has | A round in which a **non-programmer authors a working clause and it fires at a table in the same artifact** — engine → form → trace → roll, one continuous demo |
| 3 | **Secrets & per-player visibility** | Mechanism is **presentation-layer**: BBCode containers and subscriber-group gating over an article that is assembled and then filtered. All-or-nothing privacy: users have asked for a *"World Anvil users only"* option against third-party AI crawlers and do not have one | `Sicht` + `Grenze B9`: **unheld bytes never leave the server**; der Zwillingsbeweis proves two worlds identical but for unheld content produce byte-identical output, DOM, `getFullAXTree` and response timing | **S-P1, and then the Zwillingsbeweis fixture pair.** Until S-P1 runs this row is a claim, not an answer, and must not be spoken aloud (CHAMPION §15.10) |
| 4 | **Live play — the DSTS** | Their FAQ: ***"World Anvil's Campaign Manager is not a virtual tabletop (VTT) or a map-making software."*** No tokens, no token movement, no fog (the documented workaround is a duplicated opaque immovable layer), no grid, no measurement, no initiative/HP/conditions found, no rules engine. Media *"will **not** be streamed to your players"* | A real table: dice, initiative, HP, conditions, `defeat_pending`, undo, regions/walls/portals from a real UVTT parse, **per-character fog as the projection itself** — now with a number on it: **9.38 ms per incremental per-character reveal** as a vector mask, and the authoritative fog is *a set of revealed ids*, not geometry [`gemessen`, spike-K, RB-20b §5] | The flex, run **against Foundry + WA Grandmaster + the bridge module in Foundry's own GitHub org**, not against WA alone (RB-18 B-5). Anything the module can carry is not our answer |
| 5 | **The die roll** | A chat line in a log that scrolls away; the roller *fails on VtM 5e's paired-tens success counting* and users return to Discord bots | A **durable citable object with an address in the wiki's namespace**, replayable byte-identically from a frozen seed, AST and package pin | Gate *Nachgerechnet*: replay in CI on Windows/macOS/Linux Chromium and Node, two package minors, locale forced `tr-TR`. **Claim durability, never "verified real play"** (CHAMPION §15.18) |
| 6 | **The red link** ⏳ | They shipped **Inline Article Creation on 2026-01-14**: `@name`, `+`, pick a template, article spawns [vendor, verified today]. The red link is now, explicitly, an invitation **to type** | The red link is a **door**: an authorised, capped, expiring invitation to roll, visible only to its holder, that ends with a paragraph and a weekday | The door flex on a phone, plus the Zwillingsbeweis fixture proving a non-holder sees an ordinary red link, byte-identical |
| 7 | **Export / API** | **You must be a paying customer to leave with your world** — free members export single articles only. API is read/write, but *building an API consumer application is restricted to Grandmaster and above* — $99–105/yr for the right to automate against your own data | Export at launch into UVTT, Foundry-shaped, FG-shaped and Markdown/HTML, plus a **published versioned format with a non-retroactivity promise**. Gate: export → import → **diff empty** | The round-trip gate, run on the **Eron corpus**, not a synthetic fixture |
| 8 | **Billing** | Trustpilot's own top mentions for the brand: **Subscription · Refund · Service · Customer communications · Mistake · Website.** Recurring: auto-renewal without warning, no refunds, an introductory rate that renews at roughly double, and the **April 2024 free-tier contraction (125 → 42 articles)** after which over-limit users could *view, export and delete but not edit* — experienced as *"held my hard work at ransom"* | **One-time licence.** No renewal to forget, no refund to argue, no cap that can move under you, humane documented lapse behaviour on the pricing page | Not an artifact — a **pricing page and a lapse-behaviour spec**, written once, reviewed by Athena, and never mentioned again in marketing |
| 9 | **Cold start** | Not a weakness — **their 28 templates are a curriculum**, and it is the exact gap CHAMPION §15.9 has carried unresolved for four rounds (*"session one is still empty"*) | **We are behind here.** Ship ~8 templates, and steal the part that matters: **the prompts**. The container is not the feature; the questions a beginner did not know to ask are | An artifact in which a GM with an empty world reaches her **first minted paragraph** inside the Erststundenbudget (§6.4) |
| 10 | **Overwhelm** ⏳ | Six dated user quotes (RB-18 §3.1) and two competitors monetising it — but they began shipping **feature toggles on 2026-07-09** | **The Erststundenbudget and the deprecation rule** (§6.4). A gate, not a mood | Instrumented first session: count named concepts and surfaces to first mint, in the same session as the Prägerate gate |
| 11 | **Publication at a URL** | Not a weakness — **their strongest lock-in**, stronger than Foundry's modules, because a module can be rewritten and an audience cannot. **47.06 % of their traffic is organic search** [Similarweb, desktop methodology, verified 2026-07-27 — *this is a **channel share**, not a landing-page distribution; see the correction below*] | `Die offene Tür`, **generalised from an article toggle to a published, indexed, followable world** (§5.1) over an already-byte-verified `fremd` projection. **A public world whose footnotes are die rolls with dates** | Promote it to launch-blocking (§8.1) and measure one thing: **does a stranger's search result land on a Chronicle world?** |

### 5.1 An inference was wearing a panel's clothes, and it was holding up a launch-blocking decision

**The one place in this corpus where a marker was worn by something that had not earned it, named
here because it is mine.** RB-14 §5.1 and revision 1's §5 row 11 both wrote: *"**47 % of World Anvil's
traffic is organic search** [Similarweb], **arriving at *user worlds***."* RB-19 §1.4 is right:
**Similarweb measures channel share, not landing-page distribution**, and its traffic-source breakdown
is **desktop-only by methodology.** *"Arriving at user worlds"* is a plausible inference and it is
**not a Similarweb datum**, yet it sat inside the bracket — and it was the stated reason `die offene
Tür` was promoted to launch-blocking. **No landing-page data was found at any price anyone in this crew
can reach** (§10.11). The inference is now labelled as an inference, everywhere it appears.

**The promotion survives, on three grounds that do not need the inference.** This matters: had the
promotion rested only on the laundered clause, it would have to be withdrawn. It does not.

1. **The structural argument, which needs no traffic data at all.** Foundry's lock-in is modules and
   **a module can be rewritten**; World Anvil's is an audience and **an audience cannot.** That is a
   claim about the *kind* of asset, not about its size, and it is unaffected by whether 47 % or 12 % of
   their sessions land on a user world.
2. **The migration argument, and it is the one that makes this launch-blocking.** K8 makes World Anvil
   migrants our named audience. **A World Anvil user's asset is not an article — it is a world with
   readers.** If we import their corpus perfectly and publish nothing, **every migrant loses their
   readers at the door, and no feature we ship compensates for that.** The switching cost we promised
   to pay on the user's behalf (§4 step 6) is not paid until the people who read her world can still
   find it. **An importer without a publisher is a half-fidelity import by another route**, and RB-17
   Rank 4's hard rule applies to it.
3. **The parity argument.** World Anvil and LegendKeeper both publish worlds at URLs today. **On the
   wiki half this is table stakes, not a bonus** — the same finding as "players always free" (§5.2),
   and it must be treated the same way: shipped without comment, never presented as a differentiator.

**Therefore `die offene Tür` must generalise, and the champion's §10.11 as written cannot carry it.**
CHAMPION §10.11 describes *"a GM-controlled, default-off toggle that publishes an article's existing
byte-verified-safe `fremd` projection at a stable public URL … the cheapest possible go-to-market
artefact this champion has."* **A per-article toggle does not carry a reader.** What is required, and
what §8.1 orders:

- **World-level publication**, not per-article — one decision, default off, GM-controlled.
- **A stable, human-readable URL space** (world root plus article paths) that **survives renames**, or
  every inbound link rots on the first edit.
- **Indexability**: sitemap, robots, per-page title/description/canonical, OpenGraph. Unglamorous, and
  it is the entire difference between published and findable.
- **Followability**: a feed of **minted paragraphs**. This is the one item on the list a rival
  structurally cannot copy — **nothing on World Anvil carries a provenance date**, so they can publish
  a world but cannot publish *what changed in it, by whom, on which weekday.*
- **A migrant's inbound links must be mappable**, or the audience is lost precisely at the moment we
  claimed to be saving it.
- **And the safety proof is not new work**: it is the same `fremd` projection, the same
  Zwillingsbeweis, the same predicate as the fog. **No rival's public world is a projection** — theirs
  is a separate publish pipeline over an assembled-then-filtered document. Ours is the same object the
  fog is.

**The one thing to measure, unchanged:** does a stranger's search result land on a Chronicle world?

### 5.2 The cost comparison, honestly

**Players pay nothing everywhere. This is the most important negative finding in the section and it
must be acted on, not merely noted.** World Anvil Freeman accounts can join campaigns, play in sessions
and create RPG characters [vendor features list]; **LegendKeeper states outright: *"an unlimited number
of guests can participate in your projects for free. Only the project owner needs an active
subscription"*** [legendkeeper.com/pricing, 200 OK, verified today; **re-fetched and confirmed by RB-19
§5**]; Foundry is one licence for unlimited players; and **Rollplay's own line is *"No subscription. No
account required. Works offline."*** (§0.4).

> **"Players always free" is table stakes on both halves of the market. It is not a differentiator, it
> has never been one, and it must be removed from every positioning surface in the lineage.**

It stays as a **promise on the pricing page** — a hygiene factor, whose absence would cost us and whose
presence earns nothing. **OPEN-DECISIONS S1 rules it an invariant and that ruling is untouched**; what
changes is only what we are allowed to *claim* for it. Any deck, champion section or round-6 candidate
that presents it as a competitive advantage is wrong, and §8.1 orders the correction.

**One GM, five players, ten years:**

| | Year 1 | 10 years | Note |
|---|---:|---:|---|
| World Anvil **Master** | $54 | **$540** | private worlds, secrets, unlimited articles [vendor via proxy, RB-14] |
| World Anvil **Grandmaster** | $99–105 | **$990–1,050** | the tier a *system author* needs — our exact channel audience |
| World Anvil **Grandmaster, lifetime** | **$650 once** | **$650** | [Kindlepreneur, third-party, updated 2025-10-01, verified today] |
| World Anvil **Sage** | ~$300 | **~$3,000** | custom domain, white-label, 1,000 subscribers |
| **LegendKeeper Pro** | $90 | **$900** | one plan, unlimited everything, guests free [verified today] |
| **Campfire, all modules** | $125 | **$375 lifetime** | the only other lifetime option in the wiki half [Kindlepreneur, 2025-10-01] |
| **Foundry VTT** | $50 once | **$50** | the play half, one-time, self-hosted |
| **The real rival stack** — Foundry + WA Grandmaster + the free MIT bridge module | $149–155 | **$1,040–1,100** | RB-14 §6.4 estimates this already delivers **~80 % of Chronicle's fusion**. The module is MIT and maintained by one community author, **but its canonical repo is in Foundry Gaming's own GitHub organisation and World Anvil documents it on their knowledge base** (§2 b) |
| **Chronicle** | **~€30 once ≈ ~$33** | **~€30 ≈ ~$33** | plus 300 hosted room-hours/year, 5 GB. Rate stated in the header; unverified |

**The sharpest true sentence, and it is narrower than RB-14's:**

> **The stack that already does 80 % of what we promise costs about $1,050 over ten years — roughly
> 32× our ~$33 — and requires two subscriptions and a manual, one-way, permission-destroying import
> across a bridge that two companies point at and neither owns. The 20 % it cannot do is the only thing
> we actually sell — and it is the part nobody currently knows they want.**

**Three ways this comparison flatters us, stated so no round skips them:**

1. **We are not selling the same thing.** World Anvil's price buys **unmetered public hosting with a
   CDN, SEO indexing and an audience**. Ours buys a licence plus 300 room-hours and 5 GB. A one-time
   €30 does not fund a decade of public hosting for an arbitrary number of worlds. **This is an
   unresolved business-model collision, not a win** — open decision P1, **reconciled against
   OPEN-DECISIONS S3/S4 in §9 rather than ruled a second time.**
2. **"Forever" is no longer the axis** (§0.5). Lifetime Grandmaster is $650 and Campfire's is $375. Our
   advantage is **price**, roughly 20× against the lifetime tier and ~32× against the annual stack, not
   the absence of a renewal. Copy must say so.
3. **$54–105/year is not a lot of money to the buyer.** The pricing attack wins on the Grandmaster tier
   and on the *structural* answer to their billing complaints (row 8), not on absolute pain.
4. **One-time pricing is not even a differentiator against the newest entrant.** Rollplay ships *"No
   subscription. No account required. Works offline."* (§0.4). **In the wedge we claim, our price
   posture is parity.** What is not parity is the four-clause intersection in §3.4 Amendment 1 — and
   that is the only thing copy may lead with.

---

## 6. Where we will be smaller, and why that is a choice

**Mēden agan appears here as a decision with reasons, not as an apology for a budget.** Each of the
following is a World Anvil capability we will deliberately not match, with the argument.

### 6.1 The list

| Their capability | Our decision | The argument |
|---|---|---|
| **Chronicles** — timeline × map, the fusion where scrolling time moves the map across eras | **Do not match. Refuse the comparison.** | Four-plus years of polish on a genuinely unique feature that no rival has. It is off our critical path and we would ship a worse one. We ship a **timeline computed from mint dates** — which they structurally cannot do, because nothing on World Anvil carries a provenance date — and describe it as provenance, never as "we have timelines too" |
| **Manuscripts / novel writing** | **Do not build.** | CHAMPION §15.4 already concedes the long-form writer. World Anvil owns the author segment and just made it toggleable for people who do not want it. Contesting it splits one builder across two markets |
| **Family trees, diplomacy webs, org trees as editable objects** | **Derived view only. No new noun.** | We already know who has heard what from whom. An editable graph beside a projection creates the second source of truth every rival in RB-15 §1.11 now maintains by hand. WA shipped a *"streamlined Diplomacy Webs"* update on 2026-07-09 — good; let them own it |
| **A fantasy-calendar engine** | **Refuse for slice 1–2.** | We absorb the in-fiction *date* (every Revelation has one, and `die Postlaufzeit` makes it mechanical). We refuse the *engine*: arbitrary month structures, leap rules, multiple moons, per-culture epochs and the UI for all of it. Bottomless |
| **28 article templates** | **Ship ~8.** | Counting is a losing war. **The curriculum is the part to steal** — the prompts, not the containers (§5, row 9) |
| **100+ prebuilt RPG systems, 1000s of statblocks** | **Ship the builder and one CC-BY SRD reference package.** | One person cannot data-enter a game system, let alone maintain it across errata. **WotC DMCA'd 5etools' mirrors in August 2024** for verbatim rulebook data. We refuse to be a compendium publisher on legal and capacity grounds both |
| **Subscriber groups, Patreon import, monetisation plumbing** | **Not in slice 1–2.** | It is their actual business and the mechanism by which worldbuilders became publishers with paying audiences. We will need an equivalent eventually; we do not need it to launch, and it is a payments company |
| **Ads on free worlds** | **Never.** | "Players always free, no ads" is a cleaner promise and costs nothing to keep |
| **A marketplace / storefront** | **Refuse.** | Payments, tax, VAT/MOSS, chargebacks, refunds, moderation, DMCA, ratings, disputes, fraud. That is a company. **Chronicle is the file format, not the shop** — authors sell on itch.io, DriveThruRPG or Patreon and we guarantee the format, the validator and the round-trip |
| **Voice / video, audio library, scheduling, hand-drawn map editing, streaming production** | **Refuse, each with a "what the user does instead."** | RB-15 §3.3 argues each at length and the arguments are ratified verbatim. The one that is fatal *to us specifically*: an SFU is a per-minute bandwidth cost against a payment received **once** |
| **A mobile app** | **Browser + Electron only.** | Ratified by RB-11. Note it is parity by omission — World Anvil has no app either, *"responsive web only"* [vendor FAQ], and our phone surface is a **play** surface, not a reading one |

### 6.2 What "smaller" buys, concretely

Every refusal above converts directly into one of the two things a solo builder actually lacks:
**calendar time** and **maintenance surface**. RB-16's P3 and P4 are the two causes of death that a
one-person team cannot outrun with cleverness — *"as the company's sole employee, my salary has been
very low for the past 2 years or non-existent for almost the whole of 2023. And I've reached the end of
my personal resources"* (Let's Role's founder) and *"building environments was a lot more complicated
than it is in other VTTs"* (One More Multiverse, whose differentiator became its onboarding cost, with
a **$17.5 M Series A** in the bank — *revision 1's $17.6 M is a two-round aggregator total, not a
raised round; corrected per RB-16 and RB-19 m8*).

**Owlbear Rodeo is the control group and it is uncomfortable:** two people, an explicit refusal to
become an everything-VTT, tiers that gate storage and rooms and **never play features** — and it is the
most-recommended tool in the hobby for time-to-table. Its survival mechanism is the opposite of our
ambition. **We are not copying it. We are borrowing its discipline and spending the difference on the
one object no bridge can carry.**

### 6.3 The one place "smaller" would refute the thesis

**Both halves must exist.** RB-18 §3.4 is right: you cannot ship half of *"fog and article permission
are the same predicate."* A wiki that does not play is a wiki. **The refusals above are all at the
*periphery*; none of them touches the ring.** Any future round that proposes shrinking `Sicht`, the
closed mint set, `haelt_etikett`/`erfahrungsgrad`, der Zwillingsbeweis, die Herkunftsschicht or the
round-trip gate is not applying Mēden agan — it is refuting the product.

### 6.4 Making "smaller" a gate rather than a mood

RB-18 §3.5 proposes two gates and I ratify both, with numbers to be set by the first instrumented
session:

- **Das Erststundenbudget.** The number of distinct surfaces, controls and named concepts a first-time
  GM must pass to reach her **first minted paragraph**, with a hard cap, measured in the same
  instrumented session as the Prägerate gate. **Red is a real red.**
- **Die Verjüngungsregel (the deprecation rule).** *No round may add a named surface without either
  retiring one or recording, in the verdict, why it may not be retired.* The lineage currently
  specifies ~26 CI gates and **not one of them can go red because the product got bigger** — which is
  precisely the curve that produced the six World Anvil complaints, running at AI speed.

**And the retroactive application, because it has teeth or it has nothing:** the Forge zone already
carries **four authoring surfaces before the Forge exists** — die Regelkarte, der Klauselzettel, der
Vollmachtszettel (written in the champion as *"the third no-YAML authoring surface"*, which is the
sentence World Anvil's users wrote their reviews about) and die Testtafel. **Round 6 retires one or
records why it cannot.**

---

## 7. The mortal risks, with early-warning indicators

Four, ranked by probability × fatality. Each carries a signal the crew can actually watch and a
**pre-committed response** — pre-committed, so the decision is made now, calmly, rather than later,
under pressure.

### R-A — The one-time licence versus the always-on server. *(RB-16 P1. Most likely death.)*

**The case.** One More Multiverse raised a **$17.5 M Series A** and died of a realtime bill: Dice Monkey's
post-mortem computes *"just to use the realtime firebase as a service would cost $5 a person"* — ~$30/
month for a six-player table against an optional ~$30 one-off purchase. Owlbear introduced
subscriptions *explicitly because* cloud storage and image sharing *"costs more to run the site."*
**Every survivor either does not pay the per-table cost (Foundry, self-hosting), owns the discovery
layer (Roll20, World Anvil), or is small enough that the cost floor never matters (Owlbear, Kanka,
Obsidian Portal).** Chronicle currently plans architecture (a) and (c) while committing to a hosted
seventh day, which puts it in category *none*. Die Woche makes it worse: the world must be reachable on
six more days than the previous champion required.

**Early warning.** Instrument **cost per campaign-month at the 90th percentile**, not the mean, from the
first hosted week of slice 1 — CHAMPION §14.1's ~26 compute-hours/campaign-year is a *mean*, and the
top decile eats the licence. Secondary and cheaper: **the ratio of wake events to mint events.** A wake
that produces no mint is pure cost.

**Pre-committed response — re-aimed, because revision 1's version routed onto a path that does not
exist.** Revision 1 pre-committed that *"the self-hosted Electron path becomes the default in the
copy."* **Three binding records say that path is unbuilt and unfunded**, and RB-19 §3.1 is right to call
it a blocker on the response rather than on the risk:

- **RB-11**, three times: *a browser player joining a GM's home server hits mixed-content and cannot get
  a certificate for a LAN IP; the only proven fix is Plex's DNS-zone + per-server wildcard-certificate
  service — which we would then operate forever.* ***"Choosing a channel does not choose a solution."***
- **`00-intake.md` K6** carries the same paragraph as the problem *"the fork did **not** solve, and
  which every option pays identically."*
- **`OPEN-DECISIONS.md` S4**: *"'self-hostable' on the intake page currently implies a path that does
  not exist."*

**And we now have it measured, not merely argued.** `spike-B-wiederkehr` tested passkey eligibility
across the six join topologies, and the result is worse than the certificate story alone: **`http://`
LAN IP → `insecure-context`; `https://` LAN IP → `rp-id-cannot-be-an-ip`; `http://` mDNS name →
`insecure-context`.** Only a hosted room, the Plex-pattern DNS + certificate, and `localhost` pass. **On
the default self-host topology the ratified identity mechanism cannot run at all.** A pre-commitment
that fires and pushes users there does not trade a known cost for a known cost — it trades a metered
bill for a login screen that does not work, under exactly the pressure it was written to avoid.

**The revised response, in three ordered moves, decided now:**

1. **What degrades first is the allowance, not the price model.** `Die Raumuhr`'s room-hour and storage
   allowance is what gives, publicly stated up front, degrading honestly per CHAMPION §14.1's existing
   degradation discipline. **No feature is ever withdrawn, and nothing a user has written ever becomes
   unreadable or unexportable because a meter ran out.** That last clause is the invariant, and it is
   the actual structural answer to their Trustpilot cluster — not the absence of a recurring line.
2. **If the allowance is not enough, hosted rooms and storage become a metered, opt-in utility priced
   at cost — and this is permitted, because OPEN-DECISIONS S3 already ruled it.** S3: *"Licence
   primary, plus optional hosted rooms priced at the cost they incur … charge for storage and rooms,
   never for features."* **Revision 1's §9 P1 rejected exactly that and did not cite S3. P1 is
   overturned in §9, and §7 and §9 now say the same thing.**
3. **The self-host path is not promoted to default in any copy until it exists.** Promotion is gated on
   one of two things being true: **either** the Plex-pattern DNS + wildcard-certificate service is
   costed and funded as a permanent operational job, **or** the cookie-credential fallback that
   `spike-B-wiederkehr` C1–C4 already passes (HttpOnly / Secure / SameSite=Strict, MAC-verified,
   revocable from *der Ausweis*) is ratified as the self-host identity mechanism **with its security
   review done by Athena and its limits printed on the page.** Until then the intake's *"self-hostable"*
   claim is a promise we cannot keep, and it is **open decision P11.**

**This is decided now — and unlike revision 1's version, every branch of it is executable in the week
the trigger fires.**

### R-B — Solo-founder exhaustion. *(RB-16 P3. Already written out in someone else's words.)*

**The case.** Let's Role: one person, a VTT, a creator store, a stable 1.0, **growing revenue** — and
*"I've reached the end of my personal resources."* Kickstarter February 2021 → development ceased
13 November 2023, roughly the last 24 months unpaid. RB-18 §1.5's arithmetic against the lineage's own
tables: **≈260–270 priced developer-days containing none of K1, K2 or K5**, which at a realistic solo
rate (3 dev-days/week, because the same person answers users, runs servers, writes docs and sells) is
**87–90 weeks — month 20 of a runway history sizes at 24–33 months, with the go-to-market not begun.**
An AI crew changes throughput; it does not change runway, and it **increases the surface that must be
maintained per unit of calendar time**.

**Early warning.** (i) The **ratio of maintenance commits to feature commits** — above ~40 % for two
consecutive months, breadth has passed the maintainable line for one person. (ii) **Any calendar month
with zero commits.** Astral's and Realm Works' deaths were both preceded by quiet, not by
announcements.

**Pre-committed response.** **Die Schmiede becomes the lifeboat.** RB-11 already requires the Forge
(WFC generator + theme editor + rule-builder) to stay separable by architecture, and OPEN-DECISIONS S5
already grants the permission. If either indicator fires, the Forge ships **as a single-user,
screenshottable, exportable, sellable tool in the Dungeon Alchemist shape** — a product that can earn
before the table half is sessionable. The architectural seam that makes this possible costs nothing to
keep clean and must never be allowed to close.

### R-C — The promise ledger. *(RB-16 R7 / RB-18 §2.5. The most specific risk in the corpus.)*

**The case.** Realm Works shipped our reveal mechanic — Lone Wolf's own page still calls Fog of World
*patent-pending* — won an **ENnie Silver in 2014**, took **$170,748 from 1,836 backers**, and then spent
six years failing to land the sync layer that made the reveal live. Development suspended 2019-09-29;
the president: *"failing as a commercial venture with what limited resources we can put into it."*
**The product page is still live today, still selling the $59.99 GM Edition with six months of server
access, with no notice that nothing has been developed in nearly seven years.** `Sicht` — the object
every promise in CHAMPION §6 rests on — is *grafted, unbuilt and unmeasured* for a **fourth** round, and
round 4 loaded three more projected surfaces on top of it.

**Early warning.** The crew wrote its own: **the number of design rounds a load-bearing mechanism has
remained grafted, unbuilt, unmeasured. It is at four. Five is the number at which the lineage stops
being a design record and becomes a promise ledger.** Round 5 is running.

**Pre-committed response.** **Round 6 forges nothing until `S-P1` has run.** Two days. It is the ring
itself, it is the mechanism four separate product claims share, and there is no defensible reason it
has not run. This is not a recommendation; it is the sequence's step 0.

### R-D — The seam gets closed, or the wedge gets homesteaded. *(RB-16 R8, sharpened by §0.)*

**The case.** The realistic version is not being acquired but **being made redundant by a survivor
shipping our differentiator, or by the wedge filling up while we build the engine underneath it.** Both
sides of that are moving *now*: World Anvil shipped feature toggles (2026-07-09), a search overhaul
(2026-01-23) and inline article creation (2026-01-14); the no-code sheet-and-rules space has at least
four live products and **Rollplay is in the wedge at our own price posture** (§0.4); Foundry's journal
already has Pages, selective per-player *Show Players* and Secret blocks with a reveal button (§0.3);
and the map corpus adds three more that revision 1 did not know about:

- **`azgaar-foundry`** already imports a generated world into Foundry as **interconnected journal
  entries in compendia, with map notes and per-journal-entry permissions** — i.e. *"every place on the
  map is an entity with an article and a permission" exists today, free, at 61 GitHub stars* [RB-20a
  §6.2]. **Any claim that the seam is empty must survive this module.**
- **Augur: Instant Dungeons** generates natively walled, lit, door-placed, seeded scenes *inside
  Foundry* and ingests *"100k+ object"* Dungeondraft libraries, paid via Patreon. **RB-05's "nobody
  generates inside the VTT" is false as of ~June 2026** [RB-20d §2.5].
- **CharGen** (char-gen.com, single creator, **£8/mo**) markets almost exactly our killer-app sentence
  — *"NPCs, settlements, factions, regions, and a map, all linked together"* [vendor's own comparison
  page; treat every word as marketing]. It is the **AI-generated** version of the pitch, which is where
  our deterministic, seeded, provenance-stamped posture becomes the differentiator rather than an
  implementation detail.

**And the seam has two companies standing next to it, not one volunteer** (§2 b). The trigger that
watched only Foundry's release notes was calibrated on an assumption that RB-19 §3.4 disproved.

**Early warning — a quarterly check, five lines, twenty minutes.**
(i) **World Anvil dev-news for tokens, initiative, HP or any live board state.** As of 2026-07-27 there
is none, and their own Campaign Manager FAQ still disclaims it. (ii) **Any journal, article or document
type — in Foundry, World Anvil or anywhere — whose visibility is *derived* rather than assigned.** This
is the trigger that matters, and it is deliberately not about the bridge: a two-way sync, a free API
token or a better importer changes nothing, because the object has nowhere to land. **What crosses the
moat is a *receiving type*, and it can appear without a single change to the module.** (iii) **The
bridge module's own repository and release cadence, plus any World Anvil API change adding write-back
or permission fields** — two companies now have a cheap way to deepen it. (iv) **Any no-code system
builder shipping a map with fog.** (v) **Any generator shipping a per-player reveal** — `azgaar-foundry`
plus Augur plus one permission model is the composite that would arrive from below.

**Pre-committed response.** If (ii) fires, the differentiator narrows immediately to **the projection
object and the citable roll**, and every artifact and every line of copy moves there in the same week —
we do not defend the composite claim. If (i) or (iii) fires without (ii), the claim narrows but holds,
and the response is to **re-run the flex against the new stack within two weeks and publish the result
even if it is worse.** If (iv) fires, the rule-builder's positioning drops "no code" from the headline
and leads with **"your system runs a table and exports into theirs."** If (v) fires, generation's
positioning drops "generate a world" and leads with **"a generated place that is a door, per
character."**

### R-E — Discovery never ignites. *(RB-16 R5. Lower fatality, longest fuse.)*

*"Not attracted an audience large enough"* (Astral) and *"store sales disappointing from launch"*
(Let's Role) are the same sentence twice. **Early warning:** the count of rule packages authored by
someone who is not us, **by month 3 after the rule-builder ships** — below ~5, the go-to-market has not
started and no amount of feature work will start it. Secondary: **outbound export files per week**, a
direct measure of whether creators find us useful. **Pre-committed response:** if package count is
below threshold at month 3, the effort moves from features to **artifacts other people can show** —
`die offene Tür` worlds, the format spec, and the export targets — because that is the only mechanism
in this market a solo developer has already proven twice.

---

## 8. Work order for `CHAMPION.md`

**This document does not rewrite the champion. The arena's verdicts own that file.** What follows is
the work order the next rounds execute against it. **This section is the operational deliverable of the
whole document** — everything above it is argument, and this is the part a round can be held to.

**How to read a row.** Each names **the champion section**, **what is now wrong or mis-aimed in it**,
and **the replacement claim** — stated so it can be lifted rather than re-derived. Rows marked
**[FALSE]** contain a claim about a competitor or about our own evidence base that is *not true today*
and is quotable by an outsider; those come first and they are not stylistic. Rows marked **[UNSOUND]**
are claims whose *basis* is bad even where the conclusion survives.

### 8.1 Claims that are false or mis-aimed — fix these first

| Champion section | What is wrong now | The replacement claim |
|---|---|---|
| **§16 Competitive position** **[FALSE]** | *"The moat against Foundry's **HTML-string journal** is structural and unbroken across four rounds of attack."* **Foundry's journal is not an HTML string.** Verified verbatim (RB-19 §5): Journal Entries store **Pages**, *"each one acting as a separate unit of related information"*; *"you can selectively choose individual players who will receive it"*; **Secret** blocks *"only be visible to the GM or Owner"* with a reveal button; permissions *"established at the Journal Entry level … not individual pages."* **Falsifiable in ninety seconds by every reviewer and system author in our ratified channel** | **Paste §0.3's block.** In short: *Foundry's journal is Pages, and a GM can show a page to individually chosen players and hide Secret blocks behind a reveal. What Foundry lacks is **derivation**. Its visibility is assigned **per document, by hand, by the GM**, sits at the **entry** level not the page level, and **composes with nothing** — it does not know what a character has seen, does not move when she learns something, does not lift the fog and does not change a die roll. Ours is not assigned at all: it is **derived from a per-character knowledge projection and is the same predicate as the fog.** The moat is not that they store text badly; it is that a hand-assigned ACL and a derived projection are different kinds of thing.* Delete *"HTML-string"* wherever it appears |
| **§16, the comparison set** **[UNSOUND]** | Every flex is measured against **Foundry alone** — a strawman in which nothing connects to anything | **Every flex is measured against the real stack: Foundry ($50 once) + World Anvil Grandmaster ($99–105/yr) + the free MIT bridge module** — ~$1,040–1,100 over ten years, delivering ~80 % of our fusion (RB-14 §6.4). **And the module is described correctly:** MIT, maintained by one community author, **canonical repository inside Foundry Gaming's own GitHub organisation, documented by World Anvil on their own knowledge base.** Not *"one volunteer's module."* **Anything that stack can carry is not our answer** |
| **§16, the rival set** | Wiki-side rivals appear as a parenthesis | Add **World Anvil, LegendKeeper, Kanka, Campfire** as first-class rows per K8. The benchmark is World Anvil, not Foundry |
| **§16 + every positioning surface** **[FALSE as a differentiator]** | *"Players always free"* is presented as an advantage | **It is table stakes.** World Anvil Freeman accounts join campaigns and play; LegendKeeper: *"an unlimited number of guests can participate in your projects for free"*; Foundry is one licence for unlimited players; Rollplay: *"No subscription. No account required."* **Remove it from every competitive claim. Keep it on the pricing page as a promise.** S1's invariant is untouched; only the claim changes |
| **§3.4 the headline flex** **[UNSOUND]** | *"Every wiki in the world renders a red link as an absence and an invitation to type"* asserts into a vacuum that no longer exists | **Cite World Anvil's *Inline Article Creation*, released 2026-01-14, by name** (§0.2), and restate the contrast as: *their release makes the red link a faster way to open a text editor; ours makes it a **door** — an authorised, capped, expiring invitation to **roll**, visible only to its holder, ending in one paragraph with an author and a weekday.* **The difference is not authoring speed. It is who writes, on what authority, and whether the result carries provenance** |
| **§1 the thesis sentence** | *"Wiki/Fandom + PnP session"* names the wrong rival on both sides | Adopt §2's sentence verbatim: **World Anvil cannot play and Foundry cannot remember** |
| **§10.11 `die offene Tür`** **[under-scoped, and it is launch-blocking]** | *"A GM-controlled, default-off toggle that publishes **an article's** … projection at a stable public URL … the cheapest possible go-to-market artefact this champion has."* **A per-article toggle does not carry a reader.** K8 makes World Anvil migrants our named audience, and **a World Anvil user's asset is not an article — it is a world with readers.** Import their corpus perfectly and publish nothing, and **every migrant loses their audience at the door; no feature we ship compensates** | **Promote to launch-blocking and generalise to a published, indexed, followable world** (§5.1), with six named requirements: **(1)** world-level publication, default off, GM-controlled; **(2)** a stable human-readable URL space that **survives renames**; **(3)** indexability — sitemap, robots, per-page title/description/canonical, OpenGraph; **(4)** **a feed of minted paragraphs** — the one item a rival structurally cannot copy, because nothing on World Anvil carries a provenance date; **(5)** a migrant's inbound links must be **mappable**; **(6)** no new privacy surface — the same `fremd` projection, the same Zwillingsbeweis, **the same predicate as the fog.** *(Ground the promotion on the structural, migration and parity arguments in §5.1 — **not** on "47 % arriving at user worlds", which is an inference, not a Similarweb datum.)* |
| **Every §16 use of the traffic figure** **[UNSOUND]** | *"47 % of World Anvil's traffic is organic search **arriving at user worlds**"* inside a `[Similarweb]` bracket | Similarweb measures **channel share, desktop-only** — **not landing-page distribution.** Quote it as: *"47.06 % of World Anvil's desktop traffic is organic search [Similarweb, 2026-07-27]; **where it lands is not published and we could not establish it**."* The strategic conclusion is unaffected; the attribution is |
| **Any §16 or copy use of *"nine years"*** **[FALSE]** | *"nine years of public refusal"* / *"their FAQ has said 'not a virtual tabletop' for nine years"* | **No source establishes when that sentence first appeared.** Replace with: ***"World Anvil's Campaign Manager is not a virtual tabletop (VTT) or a map-making software"** — their own FAQ, today; they have never built one, and the community suggestion asking for one is open and unshipped.* Note the subject is the **Campaign Manager**, not the company |

### 8.2 Under-scoped — the ledger does not say what it must

| Section | The problem | The order |
|---|---|---|
| **§9.2 the bill** | The table sums to **100**; the headline says **≈120**. Round 3's **20 % / 16-day contingency** was deleted between rounds with no note. The **60-day editor half** is in no total the lineage quotes | Restore the contingency, restore the editor to the ledger, and either attribute the missing twenty days or stop saying 120. *Gnōthi seauton* is a bookkeeping instruction |
| **§2 "what is priced"** | The list of unpriced items exists only in RB-18 | Carry it into §2 as a named block: **K1 (theme editor + skin kits), K2 (builder), the declarative rules engine, K5 (WFC), the art pipeline, the CC-BY SRD reference package, the Eron import, search at scale, die Wiederkehr's real cost, and the *job* of operating a hosted world.** A ratified go-to-market with no price is not a plan |
| **§11 refusals** | Refuses five things of its own; the strategy's refusals live only in RB-15 and here | Import §3.1's refusals into §11 so the champion carries them — **nine of the eighteen functions carry one**, plus row 7's two additions (the stamp library, permanently; the paint substrate, designed out). A refusal that lives only in a research brief gets re-litigated every round |
| **§12.4 the gates** | ~26 gates and **not one can go red because the product got bigger** | Add **das Erststundenbudget** and **die Verjüngungsregel** (§6.4), with the retroactive application to the Forge zone's four authoring surfaces |
| **§15.9 cold start** | Carried unresolved for four rounds; World Anvil solved it with 28 templates as a curriculum | Round 6 owes a cold-start answer built on **prompts**, not on more containers, tested inside the Erststundenbudget. **And it now has a second supply line: 690 red links already exist in the binding Eron fixture** (§0.2), and generation manufactures more (§3.2 e) |
| **§2 "what is measured"** **[FALSE]** | Wherever the lineage says the developer-day has **zero** calibration data, or that **one** spike is the only artifact | **Five measured artifacts exist** — spike-A (identity), spike-B-wiederkehr (the door ceremony, 41/41), spike-B-w1 (gate power), spike-K-kartenmass (scene/vector/image), and the tile pyramid — **and none of them is a hosted server, a real persistence layer, a GPU frame or `Sicht`.** Carry §4 Step 0's corrected table. *"Zero data points" is withdrawn; the instruction it justified is not* |
| **§9.5 / K5, the map story** | The champion has no ruling on Kaya's "integriertes Inkarnate" sentence, and five briefs plus a synthesis have now answered it | Carry §3.4 Amendment 4's **refusals** — **REFUSE the stamp library permanently · REFUSE the paint substrate and design it out · ABSORB the place layer** — and then **take the positions, the sequence and every day count from [`RB-20-kartenschmiede.md`](../research/RB-20-kartenschmiede.md) and ledger entries M1–M8, which govern.** Carry the one number that is calibrated (**art: ≈90 assets, €2,700–8,200**) and RB-20 §5.4's union arithmetic for the rest. Record `S-K1` (one day, first Pixi frame) as the falsifier |
| **§12.4, one new CI gate** | Nothing prevents the Forge from ceasing to be separately shippable | Add RB-20b §6's one-line boundary check, ratified as **gate K-G8** in M8: **`packages/forge` must never import `packages/chronik`.** *"The Forge authors geometry; the campaign authors who may see it."* Costs nothing to keep, is impossible to repair later, and **OPEN-DECISIONS S5 and §7 R-B's lifeboat both die without it** |

### 8.3 Over-scoped — carried without a retirement

| Section | The problem | The order |
|---|---|---|
| **§13 the shell, Forge zone** | Four authoring surfaces before the Forge exists; *"the third no-YAML authoring surface"* is written as a feature | Apply die Verjüngungsregel retroactively: retire one or record why not, in round 6's verdict |
| **§10.10 der Aushang** | RB-18 §4.3 calls it *"a feed with a good excuse"*, and §5.2 already concedes der Umbruch is *"a rule with a gate, not a type"* | Keep it in slice 2, but round 6 must either make a feed **unrepresentable** the way `NurLeitung<T>` makes a denominator unrepresentable, or record that the anti-log invariant is a policy here and name the pressure that will break it |
| **§8.1 accretion rate** | Round 4 alone added 8 oracle rows and 5 tables | Not a fault by itself — but the deprecation rule now applies to it, and round 6 reports the count |

### 8.4 What the next rounds must fork on

1. **The canvas's position** (step 8). Dependency says it can wait; market expectation says it cannot.
   CHAMPION §9.6 already logs it. **Candidates must fork here, not average — and the fork now has three
   branches, not two:** canvas-first, knowledge-first, and **reader-before-writer** (a map *viewer* over
   the measured pyramid with entity-bound places and per-character `Sicht`, no stamp renderer, no atlas,
   no brushes — RB-20b §8). A candidate that forks on two branches has not read §4 step 8.
2. **The public-worlds hosting model** (P1). A round that assumes hosted public worlds and a round that
   assumes self-hosted public worlds produce materially different architectures. Fork — **and neither
   branch may assume the self-host join path exists** (§7 R-A, P11).
3. **Whether the format ships before the product** (P2). I rule yes; a candidate that disagrees must
   argue it, because it changes what "launch" means.
4. **What the eight templates are, and whether the curriculum ships with them** (P5).
5. **Whether the place layer enters slice 1, slice 2, or not at all.** Fork; do not average — the three
   positions are genuinely different products in year one. **Ruled by `RB-20-kartenschmiede.md` and
   ledger entries M1–M8, not here** (§9 P10 is superseded); a candidate reads RB-20 for the numbers and
   this document only for the refusals.

### 8.5 The gate on round 6, restated so it cannot be missed

**Round 6 forges nothing until `S-P1` has run** (§7 R-C, §4 step 0). `Sicht` has been grafted, unbuilt
and unmeasured for four rounds; RB-16 R7 sets **five** as the number at which a design record becomes a
promise ledger. **Two days, plus one for `S-G1` if §3.2(e) is to be live in round 6.** This is not a
recommendation and it is not negotiable by a candidate that would rather draw something.

### 8.6 Debts this document records and does not discharge

Stated plainly, so no round mistakes a deferral for a resolution.

1. **K2 has no price and is still called the go-to-market.** RB-18 §6 item 4 is a disjunction —
   *"cost K2, or stop calling it the go-to-market"* — and §3.3/4 records the debt while §4 step 9 keeps
   the label. **That is a deferral, not a resolution. Round 6 owes the number**, and RB-19 §7 is right
   to say so in those words.
2. **The art pipeline is priced only for maps.** RB-20c gives €2,700–8,200 for the map vocabulary.
   K1's four shipped themes, tokens and the UI kit remain unpriced.
3. **`spike-K-kartenmass` has no `RESULTS.txt`.** Its numbers are printed as `[gemessen]` in RB-20b and
   the scripts are on disk and re-runnable; **nobody in this crew has re-run them.** Fix by running
   them, not by trusting them.
4. **RB-15, RB-16 and RB-17 carry uncorrected source defects** that this document does not inherit but
   also does not fix: RB-17's discredited 3.1 Trustpilot figure (twice, inside a strategy ranking, after
   RB-14 debunked it), RB-15's stale pricing table and its citation of a non-existent `OPEN-DECISIONS`
   §K5 (it is **S5**), RB-14's *"1/16th of the ten-year cost"* (it is ~1/33), and RB-15's stale
   Inkarnate pricing (**$7.99 / $14.99 monthly, not "$5/mo or $25/yr for Pro"** — RB-20a §0).
   **Nothing may quote those briefs on those points until they are corrected.**

---

## 9. Open decisions for Kaya

Each with Pythia's provisional call so nothing blocks. **Appended to
[`iterations/OPEN-DECISIONS.md`](iterations/OPEN-DECISIONS.md) in its existing table format.**

**First, the reconciliation this table owed and revision 1 did not pay.** `OPEN-DECISIONS.md` already
carries **S1–S8**, ruled by Apollon. Two of them rule on hosting:

- **S3 (provisionally ruled):** *"**Licence primary**, plus **optional hosted rooms priced at the cost
  they incur** … charge for **storage and rooms, never for features** — Roll20 charges for features and
  is the most complained-about product in the market."*
- **S4 (deferred, provisional for planning):** *"**yes, minimal hosted rooms**"*, with the honest note
  that *"'self-hostable' on the intake page currently implies a path that does not exist."*

**Revision 1's P1 raised hosting as a fresh decision, rejected a cost-priced hosting add-on, and cited
neither.** That left two live rulings on one subject pointing different ways, and it let §7 R-A and §9
P1 contradict each other inside this same document (RB-19 §3.2, §3.3). **I rule, once, here, and the
ruling is against my own revision 1:**

> **P1's rejection of a cost-priced hosting add-on is overturned. S3 stands and governs.** The
> distinction that reconciles everything is not *recurring vs. not* — it is **what the money buys.**
> A **subscription buys features**, and that is what the Trustpilot cluster (*Subscription · Refund ·
> Customer communications*) and the April 2024 free-tier contraction (125 → 42 articles, over-limit
> users able to *view, export and delete but not edit*) are actually about: **the right to use your own
> work being rented.** A **metered utility buys resources.** So the invariant is not "no recurring line
> ever." It is:
>
> **No feature is ever behind a recurring charge, and no lapse in a hosting charge may ever make your
> own content unreadable, unexportable or uneditable.**
>
> That is a structural answer their model cannot give, it is what S3 already ruled, and it costs us
> nothing to keep. **Every hosting decision below inherits it.**

| # | Decision | Provisional call |
|---|---|---|
| **P1** | **Public, SEO-indexed worlds vs. the one-time licence** — **revised, and reconciled with S3/S4 rather than ruling a second time.** §5.1 makes `die offene Tür` launch-blocking; ~€30 once does not fund a decade of unmetered public hosting with a CDN | **Licence primary (S3), with public worlds inside a stated `die Raumuhr` allowance that degrades honestly (§14.1), and — where the allowance is not enough — an opt-in metered room/storage utility priced at cost, which S3 already permits.** Revision 1 rejected that add-on; **the rejection is overturned.** The invariant above governs: features never recur, and lapsing never locks a user out of her own work. The uncapped path is self-hosting, **which does not exist yet — see P11.** **Reversal cost: high once pricing is public** |
| **P2** | **Does the published format ship before the product?** | **Yes.** Versioned JSON schema + reference parser + non-retroactivity promise, at launch, alongside the exporters. It is days of work, it is the cheapest moat on RB-17's list, and its cost is discipline rather than code — which means it must be published *before* the surfaces that would churn it |
| **P3** | **Do we run a writing challenge (a Summer Camp analogue)?** | **Yes, gated.** Not before **≥50 public `offene Tür` worlds exist.** A challenge with no participants is published evidence against us. Cost when it comes: a calendar, a prompt list, a badge table. *(Participation figures for World Anvil's own challenges: **no reliable figure found** — they do not publish them)* |
| **P4** | **Is "no-code system authoring" still the wedge, given Rollplay, Quest Portal, Minimal Sheets and FORGE?** — **revised.** Rollplay is verified to ship drag-and-drop layout, custom-formula attributes, automated effects, dice pools and draft/shared versions, with **no VTT and no maps**; *"a marketplace"* and *"freemium"* did **not** reproduce and are withdrawn — **their own line is "No subscription. No account required. Works offline."** | **Yes, restated, and the restatement now has four clauses because three of ours had only one.** The wedge is **authoring whose output (1) runs a live table, (2) reads a per-character knowledge projection inside its own dice math, (3) mints a citable result into an encyclopedia, and (4) exports into rivals' formats.** The standalone "build your sheet without code" claim is **retired from all copy** — it is now a commodity a free competitor ships. **RB-01, RB-14 §8.7 and RB-17 §5/Rank 3 are corrected by name** (§0.4). Note also: **one-time pricing is parity against Rollplay, not an advantage** |
| **P5** | **Which eight article templates, and does the curriculum ship with them?** | **The prompts are the feature; the templates are the container.** Ship ~8 containers and the full question set. World Anvil's 28 templates are their cold-start answer and ours is unbuilt after four rounds |
| **P6** | **The Erststundenbudget cap** | **Provisional: ≤3 distinct surfaces and ≤7 named concepts between empty world and first minted paragraph.** Set as a gate now, tuned after the first instrumented session. A number that can go red beats a principle that cannot |
| **P7** | **Does die Schmiede become the lifeboat SKU if runway compresses?** | **Yes, and the trigger is pre-committed** (§7 R-B): maintenance:feature commits above ~40 % for two months, or any zero-commit month. OPEN-DECISIONS S5 already grants the architectural permission; this ruling attaches the trigger to it so the decision is not made under pressure |
| **P8** | **World Anvil importer — launch or later?** — **revised, to say what the rule actually governs.** RB-20a §7.3 challenges the "exactly one" rule by name and asks to be argued rather than smuggled past | **Later, and the rule stands — but it is a rule about *migrations*.** Exactly one high-fidelity **migration** at launch; K10 makes it Eron/Fandom. RB-17 Rank 4's reasoning is entirely about *the user's irreplaceable corpus and the single moment she is willing to move* — none of which applies to machine-generated, seed-reproducible input. **Azgaar/FMG intake is therefore not a second migration and Rank 4 does not reach it** (§3.2 e); it is ruled separately in **P10**. **And the format must still be designed so migration target two costs days, not weeks** — free today, expensive in a year |
| **P9** | **Do we say anything, ever, about a competitor's billing practices?** | **No.** Row 8 of §5 is answered by shipping the model that makes the complaint impossible. **Say it once, in the pricing page and the lapse-behaviour spec, and never again.** Attacking a competitor's refunds is a bad look; being structurally unable to have the problem is not |
| **P10** | **The place layer and generation intake — does the map story enter the route, and where?** Raised here from RB-20a/b/c/d (§0.6, §3.4 A4) | **SUPERSEDED — see `OPEN-DECISIONS.md` M1–M8.** [`RB-20-kartenschmiede.md`](research/RB-20-kartenschmiede.md) is the dedicated synthesis and landed after this revision was drafted. **It governs; this row does not re-rule it**, and the two places where my argument diverges from its own are recorded in the ledger's **P10** rather than averaged. What survives from here without conflict: **`S-G1 · Der Keim` (one day) gates everything downstream**, and **generation emits doors, never articles** — an article exists only when a human mints one; if idempotent re-import cannot preserve human paragraphs across a regeneration, **ship import-once and say so, never a lossy merge** |
| **P11** | **The self-host join path — fund it, replace it, or stop claiming it?** The unresolved *other half* of **S4**, which flagged that *"'self-hostable' on the intake page currently implies a path that does not exist."* S4 asks whether we operate hosted rooms; **P11 asks what happens to the people who do not use them** | **DEFERRED — genuinely Kaya's, and it is money.** Now with measurement attached: `spike-B-wiederkehr` N1–N6 shows the ratified identity mechanism **cannot run on the default self-host topology** — `http://` LAN IP → `insecure-context`; `https://` LAN IP → `rp-id-cannot-be-an-ip`; `http://` mDNS → `insecure-context`. Only a hosted room, the Plex-pattern DNS + certificate, and `localhost` pass. **Provisional for planning: ratify the cookie-credential fallback** (spike-B C1–C4: HttpOnly / Secure / SameSite=Strict, MAC-verified, revocable from *der Ausweis*) **as the self-host identity mechanism, with Athena's review and its limits printed on the page** — because it is the only branch that costs no permanent operational job. **Until one branch is chosen, no copy and no pre-committed response may route users to self-hosting** (§7 R-A). **Reversal cost: low today, high once the intake page is public** |

---

## 10. What could not be established

Recorded so no future round launders an absence into a fact.

1. **World Anvil's real user count.** Vendor self-reports conflict: 3.5 M+, 3 M and 1.5 M on their own
   pages. **No independent figure found.** The honest phrasing for the arena is RB-14's: *"World Anvil
   claims between 1.5 M and 3.5 M registered accounts depending on which of its own pages you read."*
2. **World Anvil's traffic.** Similarweb reads **~1.4 M visits/month** and reproduces to the decimal on
   re-fetch (bounce 47.71 %, 4.49 pages/visit, 3 m 42 s, −4.87 % MoM, #32,863 global, #16 category).
   **RB-14's Semrush figure of 3.33 M (March 2025) did not reproduce**: Semrush's currently visible
   figures are 1.77 M April / 2.38 M March / 1.63 M February 2026 (RB-19 §1.4). **Record it as a
   snapshot that did not reproduce, not as a live rival estimate** — which means the *"they disagree by
   more than 2×"* framing is weaker than the corpus has been saying. The sentence that survives either
   way is the one we actually use: *even at the pessimistic figure this is ~1.4 M visits a month.*
   **And the organic-search figure is a channel share, desktop-only. Where that traffic lands is
   unpublished and could not be established at any price this crew can reach** — see item 11.
3. **World Anvil's revenue, subscriber count and team size.** No figure of any kind. Third-party
   aggregators give 8, 15, 16 and 17 employees; all unreliable.
4. **World Anvil's true Trustpilot score.** Live page 3.8 (RB-14, 2026-07-27); their FAQ claims 4.5;
   SmartCustomer computes 3.1 from ten reviews. All three disagree. **The complaint texts are the
   evidence; the rating is not.**
5. **World Anvil's exact current tier pricing.** RB-14 (via text proxy, 2026-07-27): Master ~$54/yr,
   Grandmaster ~$99/yr, Sage ~$300/yr. Third-party (Kindlepreneur, updated 2025-10-01): Grandmaster
   $12/mo, $105/yr, $650/lifetime. RB-15 (Jan-2025 third-party): Master $58/yr, Grandmaster $105/yr.
   **Use ranges, never a single figure, and date every quote.** Lifetime Sage price: **no reliable
   figure found.**
6. **Challenge participation figures** for Summer Camp and WorldEmber. World Anvil does not publish
   them and none surfaced. **This matters for P3** — we are matching a mechanism whose scale is unknown.
7. **Whether World Anvil's world export includes maps, timelines, Chronicles, manuscripts, campaigns,
   statblocks, secrets and subscriber gates.** Their own export guide is silent. **Concrete follow-up:
   obtain a real export and diff it.**
8. **Rollplay's, Minimal Sheets', FORGE's and Quest Portal's user or creator counts.** No reliable
   figures found for any of them. §0.4's finding is that the *positions exist*, not that they are
   large.
9. **What one "developer-day with an AI crew" produces in *server, renderer, projection or persistence*
   code.** **Corrected from revision 1, which said "zero data points" and was wrong.** Five measured
   artifacts exist (§4 step 0): spike-A, spike-B-wiederkehr, spike-B-w1, spike-K-kartenmass and the tile
   pyramid — covering identity, the door ceremony, a gate's statistical power, map/scene data structures
   and the image pipeline. **What remains genuinely unmeasured is the list that matters: a hosted server
   over a real network, a real persistence layer under load, a single GPU-rendered frame** (RB-20b §9.1:
   *"I rendered **zero** Pixi frames today"*) **and `Sicht` itself.** That is still the most important
   unknown in the project, and step 0 exists to close it.
10. **Any case, in this market or an adjacent one, of a merely-good base product plus an excellent
    extension seam beating a category-best base product with no seam.** RB-17 §6.4 searched and found
    none — four cases for the ordering, two against openness-first, zero counterexamples. Strong, not
    proof, and it is the assumption a future round should attack first.
11. **Whether World Anvil's organic search traffic lands on *user worlds* rather than on marketing or
    knowledge-base pages.** Similarweb reports **channel share, desktop-only**, not landing pages. **No
    landing-page data was found at any price this crew can reach.** Revision 1 carried this inference
    inside a `[Similarweb]` bracket and used it to justify a launch-blocking promotion; the promotion
    now rests on three arguments that do not need it (§5.1).
12. **When World Anvil's *"not a virtual tabletop"* disclaimer first appeared.** No dated evidence of
    any kind. The *"nine years"* claim is withdrawn.
13. **Whether `spike-K-kartenmass` ran to completion.** The scripts and a `package.json` are on disk;
    **there is no `RESULTS.txt`**, unlike spikes A, B-wiederkehr and B-w1. RB-20b prints its numbers as
    `[gemessen]` and names the scripts; **neither RB-19 nor this document re-ran them.**
14. **The cost of commissioning K1's four theme packs, tokens and UI kit.** RB-20c prices the *map*
    vocabulary (≈90 assets, €2,700–8,200, published per-asset rates) and explicitly refuses to invent
    the rest. **RB-04 has the German contract clauses and no quote. Nobody has one.**
15. **A measured entity count from a real FMG run.** RB-20d's ~1,000-burg figure is read from the source
    formula and corroborated by a third-party README; **the generator was not executed.** `S-G1` closes
    this in one day (P10).
16. **Whether feathered vector regions look good enough to replace a painted coastline.** Unknowable
    without a visual spike; RB-20b carries it as the one genuinely aesthetic risk in its table, and it
    is the risk with no day estimate.
17. **Rollplay's, Minimal Sheets', FORGE's and Quest Portal's user or creator counts** — unchanged, no
    reliable figures found (§0.4) — and **`azgaar-foundry`'s and Augur's install counts.** Neither
    package page displays them. So *"the pipeline is shipped"* is established; *"the pipeline is
    popular"* is not.

---

## Sources

**Verified live, 2026-07-27** — these are new to the corpus:
[World Anvil News: July 2026 (2026-07-09)](https://blog.worldanvil.com/newsletter/world-anvil-news-july-2026/) — feature toggles, Diplomacy Webs ·
[World Anvil Development News archive](https://blog.worldanvil.com/category/worldanvil/dev-news/) — search 2026-01-23, manual save restored 2026-01-22, inline article creation 2026-01-14, editor switching per world/article 2024-12-19 ·
[Inline Article Creation release post](https://blog.worldanvil.com/worldanvil/dev-news/new-feature-inline-article-creation-on-world-anvil/) ·
[Foundry VTT — Journal Entries](https://foundryvtt.com/article/journal/) — Pages as units, selective *Show Players*, Secret blocks, entry-level ownership ·
[LegendKeeper pricing](https://www.legendkeeper.com/pricing/) — $9/mo, $7.50/mo annually, guests free (200 OK) ·
[Kindlepreneur — Campfire vs World Anvil (updated 2025-10-01)](https://kindlepreneur.com/campfire-vs-world-anvil/) — WA Grandmaster $12/mo, $105/yr, **$650 lifetime**; Campfire $12.50/mo, $125/yr, $375 lifetime ·
[Rollplay — creator tools](https://www.daydreamteam.com/creator-tools) and [Rollplay](https://www.daydreamteam.com/) ·
[Quest Portal character sheets](https://www.questportal.com/character-sheets) ·
[Minimal Sheets](https://minimalroleplay.com/ecosystem/minimal-sheets) · [FORGE](https://forge-ttrpg.vercel.app/)

**External, added in revision 2** (all retrieved 2026-07-27 by the briefs cited, not re-fetched here):
[Foundry package — World Anvil Integration](https://foundryvtt.com/packages/world-anvil) — **repo
`foundryvtt/world-anvil`**, MIT, didialchichi, v1.5.2, GM-only, one-way, Guild API token, *"does not
currently attempt to preserve permission or visibility control settings"* [RB-19 §1.2, 200 OK] ·
[Azgaar Fantasy Map Generator](https://github.com/Azgaar/Fantasy-Map-Generator) +
[its LICENSE](https://raw.githubusercontent.com/Azgaar/Fantasy-Map-Generator/master/LICENSE) — MIT plus
an explicit commercial-derivative-works clause; **GitHub's classifier returns `NOASSERTION`, so the
asset ledger needs `LicenseRef-Azgaar-FMG-1.0` with a text snapshot** ·
[`Ethck/azgaar-foundry`](https://github.com/Ethck/azgaar-foundry) — journals in compendia, map notes,
per-entry permissions, 61 stars ·
[Augur: Instant Dungeons](https://foundryvtt.com/packages/instant-dungeons) — native walls, doors,
lights, seeds, Dungeondraft ingest ·
[Inkarnate](https://inkarnate.com/) and [/updates](https://inkarnate.com/updates) `[vendor, via proxy]`
— Creator **$7.99/mo**, Studio **$14.99/mo**, *"over 4,600 new and reworked assets"* in one release,
asset count stated as 30K+ / 23,400 / 8K on the same page ·
[Inkarnate marketplace terms](https://inkarnate.com/marketplaceTerms) — *"Customers may not
redistribute, extract, or resell any Products"* ·
[Inkarnate Canny](https://inkarnate.canny.io/feature-requests?sort=top) — **574 votes** for reusable
group-stamps vs **14** for UVTT export ·
[PixiJS ParticleContainer v8](https://pixijs.com/blog/particlecontainer-v8) — the supported per-particle
property set that matches our stamp record field for field ·
[game-icons.net](https://game-icons.net/) — 4,180 CC BY 3.0 SVG icons ·
[K. M. Alexander CC0 map brushes](https://kmalexander.com/free-stuff/fantasy-map-brushes/) ·
[cartographyassets.com/license](https://cartographyassets.com/license/) — thirteen CAL licences, **two
of which permit redistribution** ·
[Semrush — worldanvil.com](https://www.semrush.com/website/worldanvil.com/overview/) — 1.77 M / 2.38 M /
1.63 M; **3.33 M not reproduced**.

**Internal corpus, read in full:** `research/RB-14-worldanvil.md` · `research/RB-15-werkzeuglandschaft.md`
· `research/RB-16-friedhof.md` · `research/RB-17-substrat.md` · `research/RB-18-widerspruch.md` ·
**`research/RB-19-pruefung.md`** · **`research/RB-20a-kartenwerkzeuge.md`** ·
**`research/RB-20b-machbarkeit.md`** · **`research/RB-20c-kunstpipeline.md`** ·
**`research/RB-20d-erzeugung.md`** · `research/RB-11-steam-vs-browser-verdict.md` ·
`iterations/CHAMPION.md` · `iterations/OPEN-DECISIONS.md` · `00-intake.md`. All figures carried from
those briefs retain their original attributions and are not re-derived here.

**Measured artifacts on disk, read:** `spikes/spike-A-passage-identity/RESULTS.txt` ·
`spikes/spike-B-wiederkehr/RESULTS.txt` · `spikes/spike-B-w1/RESULTS.txt` ·
`spikes/spike-K-kartenmass/` (**no `RESULTS.txt`; not re-run**) ·
`fixtures/eron/media/kachelpyramide/pyramide.json` · `fixtures/eron/articles.json`.

---

*04, revision 2. The ambition is not too big; it was never priced, and those are different diseases with
different cures. World Anvil cannot play and has never built a table — their own Campaign Manager FAQ
still says so, and this July they spent their release hiding features rather than adding one. Foundry
can play and cannot remember, and the bridge between them is one person's MIT module sitting in
Foundry's own GitHub organisation with World Anvil's help pages pointing at it — which is worse for us
than a hobby project, and true, and therefore what we write down. Two companies stand next to that seam
and neither has anywhere to put the object. The seam is real, half a million installs pay a tax to
prove it, and the ring that closes it is one object, two days, and unbuilt for a fourth round.*

*What this revision cost me: a document that called itself binding while four briefs it had never read
were already on the same disk, eight minutes older, having measured the renderer it said nobody had
measured. Gnōthi seauton is not only a rule about numbers. So the route is unchanged and it is still
not the exciting one — measure the day, freeze the roll, build the ring, publish the format, write into
everyone else's, publish the world so the readers come with it, and only then make the thing beautiful.
Größer heißt gelesen werden, nicht gebaut werden. Die eine Plattform ist kein Gebäude — sie ist ein
Format und ein Wissen, das würfelt.*
