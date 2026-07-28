# RB-18 — Der Widerspruch

**Nemesis against the ambition itself.** Compiled 2026-07-27. Target: **K8/K9**, treated as binding —
*"wir wollen halt sein wie WorldAnvil nur besser größer stärker"* · *"quasi eine marriage aus worldanvil
und Foundry/roll20 etc. Wir kombinieren die meisten pnp tools in ein giga tool. eine Chronicles Platform
um die eine platform zu schreiben die jede andere knechtet."*

This document does not tell the stakeholder his ambition is too big. It establishes **what the ambition
costs in a unit that can be checked**, **which corpse it currently resembles and at which hour of that
corpse's life**, **whether "größer" is a plan to inherit World Anvil's central defect**, and **which of
the eighteen absorbed functions actually fuse and which are co-location wearing one logo.** It ends with
a concession that is meant to be worth something, and a warning that comes with a route.

**Reads as binding and does not re-open:** [`RB-11`](RB-11-steam-vs-browser-verdict.md) (one web/DOM
codebase, browser + Electron, one-time GM licence, players free, sold direct, Steam gated, discovery
through creators and system authors, UVTT + rival-shaped export at launch). Does not duplicate RB-01,
RB-02, RB-04, RB-05, RB-07..10, RB-12, RB-13.

---

## 0. Method, and what every number below is worth

Three rules, applied without exception.

1. **Every number is attributed to the artifact it comes from**, with a file and a section. Numbers this
   brief *computed* are marked **[computed]** with the inputs shown, so they can be re-added by hand.
2. **Vendor self-reporting is labelled.** No marketing sentence is laundered into a fact.
3. **Where a figure could not be established, the text says "no reliable figure found."** That phrase
   appears nine times below and every one is a real gap, listed again in §7.

**One measurement of my own, because it changes the calibration of everything else.** File
modification times across the entire design corpus run from `design/01-attack-plan.md` at
**2026-07-26 22:38** to `design/00-intake.md` at **2026-07-27 12:24**. Five design rounds, twenty
research briefs, twenty-three HTML spikes and four verdicts span **under fourteen hours of wall clock**.
*(Caveat: mtimes, not commits — there is no git repository yet. But they increase monotonically by round
and are consistent with the round numbering, which is strong.)* This fact is load-bearing in both
directions and §1.6 spends it honestly.

---

## 1. Front one — the arithmetic

### 1.1 The most-quoted number in five rounds does not reconcile with its own table

`CHAMPION.md` §2: *"the tactical half. §9.5 decomposes it at ~120 days for one developer with an AI
crew."* The same number is repeated in §15.1, in `round-04/verdict.md` §6 (*"~120/123-day tactical
half"*), in RB-15 and in RB-16 R4. It is the single most cited figure in the lineage.

**I added up the table it claims to decompose.** `CHAMPION.md` §9.2, column *"v4 (tactical, full)"*:

```
 8 MapRenderer + Pixi + input abstraction
10 Tile pyramid, KTX2/Basis, zoom variants
 8 Tokens: placement, drag, snap ×3, elevation
 6 UVTT import and export
 7 Fog: per-character
 7 Combat: initiative, HP, conditions, undo, timers
 9 Dice: seeded roller, AST, roll card, Trace
10 Die Prägung: five handlers, Fällung, Augenblick
 8 Accessibility + Outline recipe as a real play surface
 4 Perf harness, budget scene, CI gates
 6 Kartenabzug + masked-handout service
 5 Der Zwillingsbeweis
 9 B9 / totality / Anmerkung / Bild-Passage / NurLeitung
 3 Der Handschlag
───
100
```

**The column sums to 100. It is labelled ≈120.** [computed — add the fourteen integers above.]

The slice-1 column in the same table sums to **67**, which is exactly what it claims. So the arithmetic
error is not carelessness across the whole table; it is specific to the headline figure that the entire
lineage quotes.

Two readings, both damaging and neither soft:

- **If ~120 is the true number**, then twenty developer-days — a fifth of the tactical half — are
  **unattributed to any line item**. The table does not decompose the number it says it decomposes, and
  "the bill, decomposed so it can be attacked" cannot be attacked, because a fifth of it has no name.
- **If the table is the true number (100)**, then the lineage has spent two rounds quoting a padded
  headline while its own decomposition says something else. Every risk statement built on "~120 days" —
  including RB-16's R4 and this round's whole framing of the tactical half — is built on a figure that
  its own source contradicts.

### 1.2 Where the twenty days went: a contingency was deleted and the highest-risk line was halved

I traced the number back. `round-03/product-B.md` §5.6 — *"The bill, decomposed so it can be attacked.
One developer with an AI crew, tactical half only"*:

| Line | round 3 | CHAMPION v5 §9.2 "v4 full" | Δ |
|---|---:|---:|---|
| MapRenderer / Pixi / input | 8 | 8 | — |
| Tile pyramid, KTX2 | 10 | 10 | — |
| Tokens | 8 | 8 | — |
| UVTT in + out | 6 | 6 | — |
| **Fog** | **12 · risk: high** | **7** | **−5, no reason stated, no spike run** |
| Combat | 7 | 7 | — |
| Dice | 9 | 9 | — |
| Die Prägung | 10 | 10 | — |
| Accessibility + Outline | 8 · risk: high | 8 | — |
| Perf harness | 4 | 4 | — |
| Kartenabzug + masked handout | — | 6 | +6 new |
| Der Zwillingsbeweis | — | 5 | +5 new |
| B9 / totality / NurLeitung | — | 9 | +9 new |
| Der Handschlag | — | 3 | +3 new |
| **Contingency (20 %)** | **16** | **— absent** | **−16, unannounced** |
| **Total** | **98** | **100** | |

[computed: 82 base − 5 fog cut + 23 new lines = 100; round 3's 82 + 16 contingency = 98.] The
reconciliation is exact, which is what makes it a finding rather than a suspicion.

**Three concrete breaks, each with a scenario:**

- **B-1 · The contingency vanished between rounds.** Round 3 carried an explicit **20 % contingency,
  16 days**, and named it in the table. Round 4's table has no contingency line and no note explaining
  its removal. *Scenario:* round 6 forges against "100 days" and the first month of real renderer work
  runs 15 % over — a completely ordinary outcome — and the schedule is instantly at round 3's number
  with nothing left to absorb it, because the absorber was deleted while nobody was looking.
- **B-2 · The highest-risk line was cut by 42 % with no spike behind the cut.** Round 3 priced fog at
  **12 days and marked it `high`**, and wrote an explicit falsifier: *"If fog exceeds 20 days, the
  shared-party model is cut."* Round 4 prices the same capability at **7 days** — and in slice 1 at
  **2**. Nothing ran in between. `CHAMPION.md` §2 states it directly: *"Nothing in four rounds has
  exercised a Pixi scene graph, a tile pyramid, a KTX2 pipeline, a fog texture, a UVTT parser, a dice
  AST or a perf harness."* *Scenario:* a 12-day estimate that was already flagged high is now a 7-day
  estimate, and the only thing that changed is that the candidate needed a smaller total.
- **B-3 · The editor half fell off the ledger entirely.** `round-03/product-B.md` §6.4 states *"~60 days
  of editor leave slice 1."* `CHAMPION.md` §12.2 (slice 2, *„Die Feder"*) is the editor half **and
  carries no day count at all**. Sixty days that the lineage priced once are now invisible in every
  total the lineage quotes. *Scenario:* Kaya reads "slice 1 ≈ 105 days" and reasonably infers slice 2 is
  comparable or smaller. It is not; it is the sixty-day editor plus der Aushang plus the configurable
  Postlaufzeit plus die Ausgabe plus the map raster plus everything cut from slice 1.

### 1.3 The honest total of what has *any* number attached

Only numbers the lineage or RB-17 wrote down. Nothing invented.

| # | Item | Days | Source |
|---|---|---:|---|
| 1 | Tactical half, complete (its own table, correctly summed) | **100** | `CHAMPION.md` §9.2 [computed] |
| 2 | Die Woche's delta (Vollmacht, Brief, Umbruch, Wiederkehr, ausstehender Wurf, Nachrechnen, Fokuswache…) | **38** | `CHAMPION.md` §9.3 |
| 3 | The editor half / slice 2 „Die Feder" | **60** | `round-03/product-B.md` §6.4 |
| 4 | Exports into rivals beyond UVTT — Foundry scene+journal, FG XML, Markdown/HTML (**ratified at launch by RB-11**) | **13–18** | RB-17 Rank 1 |
| 5 | In-app file-based package install (the seam without the job) | **5–10** | RB-17 Rank 7 |
| | **Subtotal, zero contingency** | **216–226** | |
| | **+ round 3's own 20 % contingency, restored** | **≈260–271** | [computed] |

**≈260–270 developer-days.** That is the number, and it is not padded: it is the lineage's own figures,
re-added, with the discipline round 3 applied and round 4 dropped, put back.

### 1.4 What has no price at all after five rounds — including the go-to-market

This is the part that matters more than the total, and it is not a rhetorical list. Each of the
following is **named as required by a ratified document and carries no estimate anywhere in the
corpus**:

| Unpriced | Required by | Where the absence is on the record |
|---|---|---|
| **K2 — the visual rule-builder** | K2 (binding amendment) **and RB-11, which made it the go-to-market** | RB-17 Rank 3: *"Cost: large"* — no number. RB-15 Stage 7 — no number. `CHAMPION.md` prices der Vollmachtszettel and die Testtafel and nothing else. |
| **The declarative rules engine beneath it** | intake tension 2 (*"building the builder before the rules engine exists is building a facade"*) | Not a line in any table. The 9-day dice line is a roller, not an engine. |
| **K5 — WFC map generation, „die Schmiede"** | K5(b)(d), *Kaya's flagship bet* | RB-15 Stage 8, RB-17 Rank 9 — both explicitly deferred, neither costed. Comparable product: Dungeon Alchemist, €2.46 M / 57,209 backers. |
| **K1 — the theme editor + shipped skin kits** | K1 (binding) | `00-intake.md` tension 5: art-production cost *"remains genuinely open."* |
| **The art / illustration pipeline** | K1, K7 | `CHAMPION.md` §2: *"Not priced at all: illustration commissioning. [needs a quote — no evidence base, will not invent one]"* |
| **Die Wiederkehr's real cost** | `CHAMPION.md` §15.15 | *"Round 5 owes a real cost estimate for this subsystem."* The 5 days in §9.3 is the pre-attack guess the champion itself distrusts. |
| **Fandom-grade search at scale** | gate *Search at scale* | §15.3: *"unproven for a fifth round and made worse"*; gate red, never run. |
| **The CC-BY SRD reference package** | RB-15 §6, the empty-container problem | *"Nothing in five rounds has costed the CC-BY SRD reference package."* |
| **The Eron / Fandom high-fidelity import** | K10 (binding fixture), RB-12 | RB-17 Rank 4: *"high and unbounded per target."* |
| **Operating the hosted world** | `CHAMPION.md` §14.1 | Compute is priced; the *job* — support, abuse, incidents, backups — is not. RB-16 P1 is the most fatal cause of death in the file. |

**The sentence this table produces:** ≈260–270 developer-days buys a product that contains **none of
K1, K2 or K5** — three of the stakeholder's own binding amendments, one of which (K2) is the ratified
mechanism by which anybody is supposed to hear the product exists.

### 1.5 The calendar, with the assumption exposed rather than hidden

Division, not modelling. The assumption is stated so it can be replaced.

| Sustained rate | 260 days | 270 days |
|---|---:|---:|
| **5 dev-days/week** — no holidays, no illness, no support, no ops, no marketing, no further design rounds | 52 weeks | 54 weeks |
| **3 dev-days/week** — a solo builder who also answers users, runs the servers, writes the docs and sells the thing | 87 weeks | 90 weeks |

**Against the only runway figure in the corpus.** Let's Role — one person, a VTT, a creator store —
`RB-16` §1.3, the founder's own words: *"as the company's sole employee, my salary has been very low for
the past 2 years or non-existent for almost the whole of 2023. And I've reached the end of my personal
resources."* Kickstarter February 2021 → development ceased 13 November 2023: **33 months**, of which
roughly the last 24 were unpaid.

**So the arithmetic verdict, stated once, without softening and without padding:**

> **≈260–270 developer-days of priced work — with the visual rule-builder, the rules engine, the WFC
> generator, the theme editor and the art pipeline all excluded because nobody has costed them —
> consumes 12 to 21 months. At the realistic rate it ends at month 20 of a runway that history sizes at
> 24 to 33 months, and the go-to-market has not begun.**

That is not "impossible." It is **precisely the shape of Let's Role**, and Let's Role's product was
good.

### 1.6 What five rounds actually produced — and the correction that fairness requires

The indictment is easy to write and it is partly wrong, so here is the measurement.

**Every executable line in the repository** [computed, `wc -l`]:

```
  534  design/spikes/spike-A-passage-identity/   identity.mjs (176) + run.mjs (358)
1,889  round-04/.chk1 .chk2 .chk3 .eng + round-05/.kern-B .probe-B   (per-round verification harnesses)
   31  design/fixtures/eron/fixture.js
─────
2,454  lines of JavaScript, total, in the entire project
   23  HTML spike files
    0  lines of server, renderer, persistence, projection or networking code
    0  git commits — there is no repository
```

**The unfair half of the indictment.** That corpus was produced in **under fourteen hours of wall
clock**. No solo human builder in the history of this market has produced five attacked design rounds,
twenty research briefs and twenty-three interactive spikes in a day. The AI crew is not a metaphor and
its throughput on *documents and self-checking HTML* is measured and extraordinary. Any attack that
says "five rounds and nothing built" without saying "in fourteen hours" is dishonest, and I will not
make it.

**The fair half, and it is sharper than the unfair one.** The estimates in §1.3 are denominated in
*"one developer with an AI crew"* days. **That unit has never been calibrated even once.** Not in five
rounds. The lineage has exactly one datum: `spike-A-passage-identity` — 534 lines, 27 assertions, 25
passing, two deliberate naive-baseline failures, 0.095 ms/keystroke at 300 passages and 0.372 ms at
2,000, a 3,000-operation fuzz run with zero foreign passage-ids surviving. That is a genuinely good
artifact. **It is also the only bridge that exists between an estimated day and a measured one, and it
covers one subsystem out of fourteen in the table.**

### 1.7 The real finding of front one

**The number is not impossible. The number has no unit.**

Round 3 wrote 98. Round 4 wrote 105 and quoted 120 over a table that sums to 100. Not one of those days
has ever been converted into a measured day of server, renderer, projection or persistence work. A
schedule denominated in an uncalibrated unit is not a bill; it is a hope with columns.

**And that is the cheapest fixable thing in this entire document.** `S-P1` — *Drei Bücher, ein Server* —
is **two days** and has been mandatory and unrun for four rounds (`CHAMPION.md` §12.4, §2:
*"there is no excuse left"*). `S-T1` has been deferred for four. Running both converts every number
above from rhetoric into measurement, and it costs less than one round of design.

---

## 2. Front two — the graveyard's verdict

### 2.1 The comparison, named: Realm Works, and not the product — **the Kickstarter page, January 2013**

`RB-16` §2 nominates Realm Works and it is right, but it under-specifies *when*. Project Chronicle does
not resemble Realm Works the shipped product. It resembles **Realm Works twenty-two days before its
Kickstarter closed** — a fully specified system-agnostic campaign-knowledge platform whose central
mechanism was a per-player selective reveal, with a business model already written down and **not one
line of the sync layer in existence.**

### 2.2 Line for line, and it is worse than a resemblance

| | Realm Works, Jan 2013 | Project Chronicle, today |
|---|---|---|
| Central mechanism | **"Fog of World"** — GM selectively reveals world elements to players; *patent-pending* on Lone Wolf's own product page | **`Sicht`** — server-side per-character knowledge projection; fog and article permission as one predicate |
| Its build status at this point | unbuilt | **"grafted, unbuilt and unmeasured for the fourth consecutive round"** (`CHAMPION.md` §2) |
| Business model | **$59.99 one-time GM Edition, including six months of server access**; Player Edition $4.99 | **~€30 one-time GM licence, 300 hosted room-hours/year, players free** (`CHAMPION.md` §14.1) |
| Funding mechanism | a **Content Market**, announced for early 2016 | **die Ausgabe**, the tradeable week (`CHAMPION.md` §10.9) |
| Money in hand | **$170,748 from 1,836 backers** | **none, and no backers** |
| Team | a real company with staff | one person + an AI crew |
| Outcome | ENnie Silver 2014 · development **suspended 29 Sept 2019** · president: *"failing as a commercial venture"* · sync never landed | — |

**What Realm Works believed about itself at this exact stage** is a matter of record, because the page
is still live: I can read on `wolflair.com/realmworks/` **today, 2026-07-27**, that the Game Master
Edition is $59.99 with six months of server access, that the Content Market is coming, and that Fog of
World is patent-pending — with **no notice anywhere that nothing has been developed in nearly seven
years** (RB-16 §2). It believed the reveal mechanism was the product, that a one-time GM price with a
bounded server allowance would fund the hosting, and that a content market would carry the rest.

**Chronicle believes all three of the same things, and prices the server allowance more generously than
Lone Wolf did.** Realm Works included *six months*. Chronicle promises **300 room-hours a year,
forever, for €30 once** — and RB-14 §8.18 has already flagged that this does not fund the public,
SEO-indexed world that §8.13 says is required. Lone Wolf, a company with staff, made the more
conservative version of this bet and still could not land the layer.

### 2.3 The differences that genuinely matter — because a comparison that is unfair is useless

Four, and they are real:

1. **Realm Works was desktop-first with sync bolted on; Chronicle is server-authoritative from line
   one.** Realm Works' failure mode was architectural: truth lived on the GM's machine and had to be
   *pushed* — community reports describe the GM having to close and sync the realm, and players having
   to sync too, before a reveal reached them. `Grenze B9` (*der Projektor ist der Server*) makes that
   specific death structurally unavailable. **Chronicle's `Sicht` risk is "can one person build and
   afford it," not "was this ever the right shape."** That is a materially better position.
2. **Realm Works' funding mechanism was strangled by licensing.** Its Content Market launched into a
   Pathfinder pricing fight and shipped **no D&D 5e content at all**, because WotC products were
   unavailable. Chronicle refuses to publish rules content on principle (RB-15 §3.3/4a) — so it cannot
   die that death. RB-16 R6 states the price honestly: *"We are immune to the poison and also to the
   food."*
3. **Realm Works had no export weapon.** Chronicle has *export → import → **diff empty*** as an
   acceptance gate (`CHAMPION.md` §12.1 step 12) and RB-11 ratified rival-shaped export at launch. This
   is the single largest strategic difference in the table, and RB-17 §3.1–§3.2 shows it is the one
   mechanism a solo developer has *already proven* twice (Dungeon Alchemist; Megasploot's UVTT).
4. **Chronicle has one measured artifact Realm Works never published.** 27 assertions with the naive
   baseline deliberately failing, sub-millisecond keystroke cost at 2,000 passages, and a merge guard
   that demonstrates the leak it prevents (test X3). Realm Works' Kickstarter had a video.

**So the comparison is not "you are Realm Works." It is:** *you are Realm Works' promise ledger, with a
better architecture, a real escape hatch, one honest measurement, no money, and no company.*

### 2.4 The second corpse, and it fits the business shape better than the first

**Let's Role at month zero.** RB-16 §1.3 calls it *"the closest business-shape analogue to Project
Chronicle's builder."* The deadly detail is not that the product was bad — it shipped a stable 1.0,
had a community, and **revenue was growing**: *"Our visits are increasing, and so are revenues, but
we're still a long way from our objectives."* It died because the runway ended first, and because the
creator store — its equivalent of our K2 channel — **had disappointing sales from launch and never
recovered.** The founder had assumed that was a Kickstarter artefact. It was not.

**The uncomfortable delta:** Let's Role's store existed at launch. Chronicle's equivalent channel — the
visual rule-builder over a rules engine — is, per RB-15 Stage 7 and RB-17 Rank 3, **the last thing
built**, after the engine, after the canvas, uncosted. Let's Role's go-to-market underperformed from day
one. Chronicle's does not exist until roughly the day Let's Role died.

### 2.5 The tripwire this crew set for itself, and where it is standing

`RB-16` R7 defines its own early-warning indicator, in its own words:

> *"the number of design rounds a load-bearing mechanism has remained grafted, unbuilt, unmeasured.
> **It is at four.** Declare five the number at which the lineage has stopped being a design record and
> become a promise ledger — which is the document Realm Works' Kickstarter page became."*

**Round 5 is running right now** (`design/iterations/round-05/` exists and contains work). `S-P1` has
not run. **Unless it runs before round 5 closes, this crew's own tripwire — written by this crew,
yesterday — fires.** That is the single most concrete finding in front two, and no interpretation is
required to see it.

---

## 3. Front three — the World Anvil problem

### 3.1 "Wie World Anvil nur größer" may be a plan to inherit their central defect. The users' words:

Every quote below is a real user or reviewer, dated, and none of them is about a missing feature.

- **Royal Road, worldbuilding-tools thread:** *"WorldAnvil was just way the heck too complicated for me.
  **It has dozens and dozens of features, none of which I needed.**"* — the whole indictment in one
  sentence. Not "it is bad." *"None of which I needed."*
- **D&D Beyond forums:** *"World Anvil, while offering more customisation, has a very tedious and
  complicated interface. **Despite using it for a month, it would still take many times more time to
  create content there than it would on a piece of paper.**"* — after a month of practice, losing to
  paper.
- **Trustpilot:** *"overcomplicated, overwhelming and overall more annoying than useful."*
- **Trustpilot, 1★, 2026-04-17** (via RB-14 §4.1): *"It was awful. After two months I cancelled my
  subscription… **It was a nightmare to navigate**… I can't even begin to describe how let down I was."*
- **Kindlepreneur review:** *"a sharp learning curve, which could be a barrier for many authors who just
  want to jot down a few notes about their world."*
- **A 2026 review's cons list, verbatim:** *"Steep learning curve, can feel overwhelming at first,
  reorganization can take time for large worlds."*

**And the market's own verdict, which is stronger than any review, because someone is monetising it:**
on **2026-03-30** a competitor published a marketing page titled, literally, **"World Anvil Is
Overwhelming — Here's a Simpler Alternative"** (Inkwarden), whose entire argument is the six quotes
above. Meanwhile **LegendKeeper** — described in RB-15 §1.1 as *"the anti-World-Anvil"*: one plan,
unlimited everything, *"the smoothest interface of any wiki tool tested"* — sells against the same
defect. **Two live products currently make their living off World Anvil's size.** "Größer" is a plan to
build the thing two competitors are already attacking.

### 3.2 The mechanism, stated precisely, because "big = bad" is lazy and false

World Anvil's defect is **not feature count**. Foundry has 5,338 modules and nobody calls Foundry
overwhelming, because 5,319 of them are not installed. The defect is that World Anvil's surface is
**unresolved history presented to a first-time user as choice**:

- **Three text editors coexist** — Plato (visual), Legacy BBCode (advanced), Euclid — and **WA's own
  documentation warns that switching between them may destroy your content** (RB-14 §2.1, §4.1). One
  user with a 150,000-word world reported tables deleted on conversion.
- **Five tiers**, one of them (Journeyman) deprecated but still visible, with the capability the user
  actually wants (secrets, private worlds) scattered across three of them.
- **28 article templates** presented at once, of which a new GM needs two.
- Custom sheets requiring **HTML + CSS + TWIG** *and* the $99/yr tier, described by WA itself as *"a
  technical advanced feature that involves coding."*

**A product becomes overwhelming when it stops retiring things.** That is the mechanism, and it is
mechanical, not aesthetic.

### 3.3 The inheritance risk, named inside our own documents

This is the part that must not be softened, because the evidence is our own file.

**In five rounds, this lineage has added and has never once removed.** `CHAMPION.md` §1 states the
discipline explicitly: *"Die Woche is an addition to Der Abend, not a replacement of it… Everything v4
established is carried unless this file changes it."* §9: *"Nothing is refused. One thing is
sequenced."* The graft index (§18) only grows. §11's refusals are refusals of things never built, not
retirements of things carried.

Concretely, and countable:

| Accretion | Count | Source |
|---|---:|---|
| Named CI gates specified | **≈26** | `CHAMPION.md` §12.4 |
| Of those, executing today | **0** | no repository, no harness |
| New `oracles.yaml` / `felder.yaml` rows added in **round 4 alone** | **8** | §6 (`umbruch`, `tuer_zustand`, `vollmacht_karte`, `brief_umschlag`, `brief_unterwegs`, `briefwechsel`, `woche_bilanz`, `nachrechnen_replay`) |
| Distinct authoring surfaces in the Forge zone, before the Forge exists | **4** | §13: die Regelkarte, der Klauselzettel, **der Vollmachtszettel** (*"the third no-YAML authoring surface"*), die Testtafel |
| New database tables added in round 4 | **5** | §8.1: `Vollmacht`, `Brief`, `Lesestand`, `Credentials`, `Zugangsvorfall` |
| Zones in §13 that gained something in round 4 | **6 of 6** | §13 |

**Break B-4, and it is the front-three break:** *"Der Vollmachtszettel is the third no-YAML authoring
surface"* is written in the champion as a **feature**. World Anvil's third editor is written in its
users' reviews as **the reason they left**. The lineage has no deprecation gate, no surface budget, and
no round in which anything was retired — which is precisely the curve that produced the six quotes in
§3.1, running at AI speed. *Scenario:* by round 8, at the observed rate of ~8 new oracles and ~5 new
tables per round, a first-time GM's Forge zone offers six authoring surfaces and the Story zone carries
four provenance channels, none of which she asked for, and the first honest review says *"dozens and
dozens of features, none of which I needed."*

### 3.4 The other side, argued as strongly as I can argue it — because "smaller" is a strategy that has already lost, twice, in this exact market

This is the half a lazy attack would skip, and it is decisive.

**1 · "World Anvil but simpler" has been executed twice and neither attempt took the category.**

- **Kanka** (RB-17 A-2): open source under GPLv3, self-hostable, a genuine free tier, full data
  ownership, portable, **400,000+ worldbuilders claimed** [vendor self-report]. It is not the category
  leader.
- **LegendKeeper** (RB-15 §1.1): one plan, $90/yr, unlimited everything, guests free, reviewers call it
  *"the smoothest interface of any wiki tool tested."* Three people. Not the leader.

**World Anvil — closed, subscription, auto-renewing, disliked, dated — is the one everyone names.**
RB-17's conclusion is blunt and I endorse it against my own front three: *"Portability and openness did
not acquire. They are a tiebreaker, not a wedge. People do not choose a tool because they can leave it;
they choose it because of what it does on a Tuesday."*

**2 · Where bigger is genuinely, mechanically better.**

- **The 28 templates are a curriculum, not a list** (RB-14 §5.3). A beginner who does not know what
  questions to ask about a world is handed the questions. **The size *is* the onboarding** — and it is
  the exact weakness `CHAMPION.md` §15.9 has carried unresolved for four rounds (*"session one is still
  empty"*). A smaller product does not have that problem solved; it has it unaddressed.
- **The 47 % organic-search traffic arriving at *user worlds*** (RB-14 §1.3, Similarweb) is a function
  of those worlds being big enough to be worth indexing. Bigness at the *content* layer is the entire
  discovery engine.
- **The four genuine fusions require both halves to exist.** You cannot ship half of *"fog and article
  permission are the same predicate."* RB-15 §3.1/2 is right: *"a wiki that does not play is a wiki."*
  Here, refusing size refutes the thesis.

**3 · And the decisive asymmetry, which resolves the tension rather than splitting it.**

Read the six complaints in §3.1 again and note their *timestamps inside the user's life*: *"after two
months I cancelled"* · *"despite using it for a month"* · *"authors who just want to jot down a few
notes"* · *"can feel overwhelming **at first**."*

**Every single complaint about World Anvil's size is a first-hour or first-month complaint. Nobody
complains that World Anvil is too big in year three.** The people with 150,000-word worlds complain
about the *editor migration* — a competence failure — not about the size.

> **Size is a top-of-funnel problem, not a lifetime problem.** Therefore *"größer"* is survivable if and
> only if *the first hour is small* — and that is a shippable, testable, gate-able discipline, not a
> compromise.

**The rule I would put in the champion, phrased so it can go red:** a *Erststundenbudget* — the number
of distinct surfaces, controls and named concepts a first-time GM must pass to reach her first minted
paragraph — with a hard cap, measured in the same instrumented session as the Prägerate gate, and a
**deprecation gate**: no round may add a named surface without either retiring one or recording, in the
verdict, why it may not be retired. The lineage currently has 26 gates and not one of them can go red
because the product got bigger.

---

## 4. Front four — fusion, or a large app

### 4.1 The test, and the standard of proof

RB-15 §5 supplies it: *would this still work if the two halves were separate products connected by the
best bridge anyone could write?* And §2 supplies the empirical ceiling of what a bridge can carry — a
number, a card, a token, an HTML string; **never an object with an address, a permission or a history.**

RB-15 concludes four genuine fusions: the citable roll object (5.1), fog = article permission (5.2), the
red link as a door (5.3), knowledge state modifying the roll (5.4). **I attacked all four and could not
break any of them.** They stand.

**But four fusions is a claim about the product's *marketing surface*. The question K9 asks is about the
*bill*.** So I applied the test to the bill.

### 4.2 The tactical bill, decomposed by whether the money buys fusion

`CHAMPION.md` §9.2's 100-day table, re-sorted [computed]:

**Fusion-bearing — a bridge structurally cannot carry these:**

| Line | Days | Which fusion |
|---|---:|---|
| Fog: per-character | 7 | 5.2 — fog *is* the permission predicate |
| Die Prägung: five handlers, Fällung, Augenblick | 10 | 5.1 — the roll acquires an address in the wiki's namespace |
| Der Zwillingsbeweis | 5 | proves 5.2 |
| B9 / totality / Anmerkung / Bild-Passage / NurLeitung | 9 | the projection substrate all four rest on |
| | **31** | |

**Parity — Foundry ships these for $50 once; Fantasy Grounds has shipped them free since 2025-11-08:**

| Line | Days |
|---|---:|
| MapRenderer + Pixi + input abstraction | 8 |
| Tile pyramid, KTX2/Basis, zoom variants | 10 |
| Tokens: placement, drag, snap ×3, elevation | 8 |
| UVTT import and export | 6 |
| Combat: initiative, HP, conditions, undo, timers | 7 |
| Dice: seeded roller, AST, roll card, Trace | 9 |
| Accessibility + Outline recipe | 8 |
| Perf harness, budget scene, CI gates | 4 |
| Kartenabzug + masked-handout service | 6 |
| Der Handschlag | 3 |
| | **69** |

**Fair reading, both ways.** The strict split is **31 fusion / 69 parity**. The generous split credits
the dice line (the AST/seed freeze is what makes a roll *citable*, not merely rolled) and the
accessibility line (K3 is a binding amendment and an axis RB-11 says we win on), giving **48 / 52**.

**Either way, the finding stands and it is the sharpest thing in front four:**

> **Between 52 and 69 of the 100 developer-days in the tactical half buy parity with a $50 competitor
> and a free one. The fusion thesis buys, at most, 48 — and its single most-claimed element, per-character
> fog, is seven of them.**

That is not an argument for cutting the table. It is an argument that **the 31–48 fusion-bearing days
should run *first*, because they are the only days that cannot be bought elsewhere — and they are
exactly `S-P1`'s territory, the two-day spike that has not run for four rounds.**

### 4.3 The co-locations, named by name, as required

RB-15 §5 already named four. Here are the rest, from the ABSORB list and from the champion's own §13,
each with the reason it is co-location and not fusion.

| # | The claim | Why it is co-location |
|---|---|---|
| 1 | **Initiative, HP, conditions, undo, timers** (7 d) | RB-15 §1.5: *"Nothing here is a business. It is table stakes."* Obsidian's Initiative Tracker plugin is free and lives in a note app. Nothing crosses the seam. |
| 2 | **Tokens, drag, snap, elevation** (8 d) | Board state. `Zustand` is explicitly *"a Vorhaben yields knowledge, never board state"* (§8.3) — the champion itself severs it from the fusion. |
| 3 | **The Pixi renderer + tile pyramid** (18 d) | Pixels. A bridge would have nothing to carry because there is nothing to carry. |
| 4 | **The dice roller *as a roller*** | Avrae has done this free on Discord for years. Only the frozen AST + seed + package pin (`Nachrechnen`) is ours, and that is a property of the *record*, not of the roll. |
| 5 | **A character sheet beside the wiki** | RB-15 §5, and 500,000 Beyond20 users are content with the co-located version. Our sheet differentiates on **authoring** (K2), not adjacency. |
| 6 | **Maps with pins that open lore articles** | RB-15: *"the most commoditised 'fusion' in the entire landscape."* World Anvil, LegendKeeper and Kanka all ship it. **The champion must never claim it.** |
| 7 | **Timelines beside articles** | World Anvil, Campfire, LegendKeeper, Aeon Timeline. Chronicle's *computed* timeline from mint dates is a different object and must be described as provenance, never as "we have timelines too." |
| 8 | **Notes beside the map** | RB-15: *"1990s-grade integration."* |
| 9 | **Deterministic generators with a provenance chip** (RB-15 §3.1/6) | **New, and named here for the first time.** A donjon name pasted into the editor and minted by hand produces a byte-identical object to a name generated in-app and minted. **The bridge is Ctrl+C.** This is co-location wearing a provenance sticker. |
| 10 | **Der Briefwechsel** (§13, Cast zone) | RB-15 §3.3/11b already ruled the relationship graph a *derived view* — correct and cheap. But §13 gives it a zone entry, and a derived view with a zone entry is a feature that will acquire an editor. Watch it. |
| 11 | **Der Aushang** (§10.10, *"Fandom's main page, computed per character"*) | **A feed with a good excuse.** §5.2 already concedes der Umbruch *"is a rule with a gate, not a type"* and names it as the likeliest place the anti-log invariant is traded away. Der Aushang is that same pressure with a second surface and a nicer name. |
| 12 | **Die Ausgabe as a sellable SKU** (§10.9) | A package format. Genuinely good, genuinely a moat (RB-17 Rank 2) — but it is a *distribution* asset, not a fusion, and §16 currently lists it under differentiation. |

### 4.4 The competitor that is one unpaid volunteer

The strongest attack on the seam claim was already made in RB-14 §6.4 and **the champion has not
answered it.** Today, a GM can run:

- **Foundry VTT** — $50 once
- **World Anvil Grandmaster** — $99/yr
- the **World Anvil Integration** module — free, **MIT-licensed, written and maintained by one community
  author (`didialchichi`), verified through Foundry v14.364 and updated within the last fortnight**

RB-14's own estimate: that stack delivers **~80 % of Chronicle's fusion**. The missing 20 % is exactly
the four items in §4.1 — and *she does not currently know she wants any of them.*

**So the honest competitive sentence is not "nobody has connected these two things."** It is: *"the
connection that exists is one-way, GM-only, permission-destroying and manual."* True, narrow, and
correct. **Chronicle's real competitor on the seam is not World Anvil and not Foundry. It is one
volunteer's MIT module** — and the giga-tool must beat it on value-per-unit-of-effort, where the
volunteer is ahead by four orders of magnitude.

**Break B-5:** `CHAMPION.md` §16 claims *"the moat against Foundry's HTML-string journal is structural
and unbroken across four rounds of attack."* It has never once been attacked **against the module**. The
comparison in §3.1's flex table is against Foundry alone — a strawman in which nothing connects. *Scenario:*
the first informed reviewer runs Foundry + WA + the module beside slice 1 and finds that our shipped
product does less than the free bridge, because our fusion-bearing 31 days are the ones that were
sequenced last.

---

## 5. The concession — named, and meant

A clean bill from me is supposed to mean something. Here is what the evidence genuinely supports.

**5.1 · The seam is real, unowned, mass-market, and *measured*. This is the best-evidenced claim in the
entire corpus.** **500,000** Chrome users and **35,378** Firefox users installed **Beyond20** — a free,
unofficial, volunteer browser extension — rather than give up either half of their stack. **AboveVTT**
built an entire virtual tabletop *inside* a competitor's web page. The link between the largest
world-building platform and the largest open VTT in the hobby is **one person's MIT project.** Half a
million people paid a friction tax rather than consolidate. **K9's premise is not ambition. It is
observation.**

**5.2 · "Die eine Plattform" has a mechanical definition, it is one object, and that object is
solo-sized.** RB-15 §6 named it and it survived my attack intact: *a server-side, per-character
knowledge projection that is simultaneously a permission, a fog volume, a dice modifier and a citation
namespace.* Sigil had **$146.3 M** of platform acquisition, Unreal Engine 5, and the D&D brand — and did
not have it; ~90 % of its team was laid off three weeks after launch and the servers close 2026-10-31.
Roll20 bought **four companies** and does not have it; its own users still bridge into it from outside.
World Anvil has **publicly declined for nine years** (*"not a virtual tabletop"* — their own FAQ).
**Nobody owns the ring. The ring is a two-day spike. That part of the ambition is not merely achievable
by one builder — one builder is the only kind of entity that has ever tried.**

**5.3 · "Größer" is right in one specific, evidenced sense — bigger *reach*, not bigger *product*.**
RB-17 §3.2: **UVTT was created by Megasploot, the solo developer of Dungeondraft and Wonderdraft**, and
became the interchange standard of a market in which every incumbent was larger — *and the largest
incumbent got it last, through a third party.* Dungeon Alchemist raised **€2.46 M from 57,209 backers**
for a tool that exports into every rival. **The standard-setting seat is structurally vacant, because
incumbents have no incentive to standardise.** That is the one axis on which a one-person product can
be genuinely *larger* than World Anvil, and RB-17 prices it in **weeks**.

**5.4 · The rule-builder gap is real, documented, quotable, and confirmed by three independent
briefs.** World Anvil: custom sheets require **HTML + CSS + TWIG** *and* the **$99/yr Grandmaster**
tier — WA's own words: *"a technical advanced feature that involves coding."* Foundry: system creation
is JavaScript + Handlebars, and the only no-code path is **a community module supported on a Discord
channel.** RB-01, RB-14 and RB-17 each concluded independently that **nobody sells a first-class,
visual, system-agnostic sheet-and-rules authoring product.** That is a negative finding, which is the
hardest kind to fake. **K2 is the right bet.**

**5.5 · One thing in this lineage is measured, and it is good, and it is aimed at the wound the
benchmark is bleeding from right now.** 27 assertions, 25 passing, two deliberate naive-baseline
failures kept as the finding, 0.095 ms/keystroke at 300 passages and 0.372 ms at 2,000, a
3,000-operation fuzz with zero foreign passage-ids surviving, and a merge guard that *demonstrates the
leak it prevents.* Meanwhile **World Anvil's own documentation warns that switching editors may destroy
your content**, and a user with a 150,000-word world reported tables deleted on conversion. **The one
thing this lineage has actually measured is the one thing the benchmark is publicly failing at.** That
is not a coincidence to waste.

**5.6 · The one-time licence answers World Anvil's top-mentioned complaints structurally, not
rhetorically.** Trustpilot's own "top mentions" for the brand: **Subscription · Refund · Service ·
Customer communications · Mistake · Website.** There is no renewal to forget, no refund to argue, and no
tier contraction that can lock a user out of editing her own world. Say it once, in the model, and never
again.

**5.7 · And the calibration the crew has earned.** Five design rounds, twenty research briefs and
twenty-three interactive spikes in **under fourteen hours**. If that throughput transfers to code — and
nobody has demonstrated that it does — every number in §1 is wrong in the project's favour. **That is
the strongest argument for running S-P1 and S-T1 immediately: they are the cheapest possible measurement
of the single variable that decides whether K9 is fantasy or arithmetic.**

**Which part of "die eine Plattform" is achievable by one builder, precisely:**

| Achievable alone | Not achievable alone, ever | Achievable, but not *all of it* in this runway |
|---|---|---|
| The format, versioned + published (RB-17 R2) · exports into every rival (R1) · in-app file install (R7) · **the projection object** (S-P1, 2 days) · the citable roll · the wiki half · die Woche | A hosted registry with a moderation queue (RB-17 A-5) · a marketplace (RB-15 §3.3/16a) · a rules compendium (§3.3/4a) · scheduling liquidity (§12) · voice (§14) · an audio library (§8a) · a hand-drawing map editor (§7c) · **feature parity against 5,338 modules** | **K2** (builder + engine) **and K5** (WFC Forge) **and K1** (theme editor + kits) **and the canvas**, in year one, on top of everything in column 1 |

---

## 6. The warning, with the route attached

> **The warning.** ≈260–270 developer-days of *priced* work — reconciled from the lineage's own tables,
> with round 3's own 20 % contingency restored — buys a product containing **none** of K1, K2 or K5.
> At a sustainable solo rate that is month 20 of a runway history sizes at 24–33 months, and the
> ratified go-to-market has not begun. Meanwhile the load-bearing mechanism (`Sicht`) is unbuilt for a
> fourth round, the crew's own tripwire fires at five, round five is running, and the corpse this
> project most resembles — Realm Works at its Kickstarter — died of exactly that layer with a company,
> $170,748 and six years to fix it.

**The route, in the order the evidence supports. None of it shrinks the ambition.**

1. **Run `S-P1` before round 6 forges anything. Two days.** It is the ring itself (§5.2), it is the one
   thing four separate product claims share, and it is the tripwire in RB-16 R7. There is no defensible
   reason it has not run.
2. **Run `S-T1` — or one fifth of it.** Not to build the canvas: **to calibrate the unit** (§1.7). One
   measured day against one estimated day converts every number in this document from rhetoric into a
   bill. Nothing else in the project has this leverage.
3. **Fix the tables before the next round quotes them.** Restore the contingency, restore the editor
   half's 60 days to the ledger, and either attribute the missing twenty days or stop saying 120.
   *Gnōthi seauton* is a bookkeeping instruction.
4. **Cost K2, or stop calling it the go-to-market.** A ratified channel with no price is not a plan.
5. **Sequence the fusion-bearing 31 days first** (§4.2). They are the only days that cannot be bought
   for $50, and slice 1 currently spends 2 of the 7 fog days and defers the rest.
6. **Add the two gates front three demands:** an *Erststundenbudget* (surfaces to first mint, capped,
   measured in the Prägerate session) and a **deprecation rule** — no round adds a named surface without
   retiring one or recording why it cannot be retired. Twenty-six gates and not one of them goes red
   when the product gets bigger.
7. **Attack the champion's moat against the real stack**, not the strawman: Foundry + World Anvil
   Grandmaster + one volunteer's MIT module (§4.4).
8. **Rule on RB-14 §8.18** — public SEO-indexed worlds versus the one-time licence. RB-14 flagged it;
   §2.2 shows Realm Works made the more conservative version of the same bet and still could not fund
   it.

---

## 7. What could not be established

Recorded so no future round launders an absence into a fact.

1. **What one "developer-day with an AI crew" produces in server, renderer or persistence code.** Zero
   data points. The single calibration artifact (`spike-A-passage-identity`) covers one subsystem of
   fourteen. **This is the most important unknown in the document.**
2. **Whether the "≈120" figure includes twenty days of work that exists somewhere outside the §9.2
   table.** CHAMPION v4's original §9.5 is not on disk (superseded in place, and there is no git
   repository to recover it from). The reconciliation in §1.2 is exact against round 3's table, which is
   strong but not proof.
3. **Any cost for K1, K2, K5, the rules engine, search at scale, the SRD reference package, the art
   pipeline, or the Eron import.** No figure found in five rounds. Not estimated here.
4. **World Anvil's real user count, revenue, subscriber count or team size.** Vendor self-reports
   conflict (1.5 M / 3 M / 3.5 M); traffic panels conflict (Semrush 3.33 M vs Similarweb ~1.4 M). Per
   RB-14, use *"World Anvil claims between 1.5 M and 3.5 M registered accounts depending on which of its
   own pages you read."*
5. **World Anvil's true Trustpilot score.** RB-14 retrieved **3.8**; WA's FAQ claims 4.5; SmartCustomer
   computes 3.1 from ten reviews. All three disagree. **The complaint texts are the evidence; the rating
   is not.**
6. **How many first-hour abandonments World Anvil actually suffers.** The quotes in §3.1 are real and
   consistent, but there is **no funnel data of any kind** — the "size is a first-hour problem"
   generalisation in §3.5 is an inference from complaint timestamps, not a measurement. Flagged as
   inference.
7. **Inkwarden's scale, funding or user count.** No reliable figure found. It is cited only as evidence
   that a competitor is monetising World Anvil's size, which its own page title establishes.
8. **Realm Works' unit sales, revenue or active users at any point**, and Lone Wolf Development's 2026
   corporate status. No reliable figure found (RB-16 §7).
9. **Beyond20's current user count.** 500,000 is the Chrome Web Store figure carried in RB-15; RB-17
   notes the widely-quoted 300,000+ is dated March 2021. Treat 500,000 as the store's live number and
   not as active users.

---

## 8. Sources

**Internal, and the arithmetic is checkable against these files:**
`design/iterations/CHAMPION.md` §1, §2, §9.2, §9.3, §12.4, §13, §15, §16 ·
`design/iterations/round-03/product-B.md` §5.6, §6.4 (the 98-day table with its 20 % contingency) ·
`design/iterations/round-04/verdict.md` §5–6 ·
`design/00-intake.md` (K1–K10, tensions 2 and 5) ·
`design/spikes/spike-A-passage-identity/RESULTS.txt` (27 assertions, the perf figures) ·
`design/research/RB-11`, `RB-14`, `RB-15`, `RB-16`, `RB-17` ·
file mtimes across `design/` (2026-07-26 22:38 → 2026-07-27 12:24) and `wc -l` over every `.js`/`.mjs`
in the tree (2,454 lines).

**External, retrieved 2026-07-27:**

- [Inkwarden — *"World Anvil Is Overwhelming — Here's a Simpler Alternative"*, 2026-03-30](https://inkwarden.app/blog/world-anvil-alternative-inkwarden) — carries the D&D Beyond, Royal Road, Kindlepreneur and Trustpilot quotes used in §3.1
- [Royal Road — *"seeking writing tool advice: Notion, Campfire, World Anvil, or ?"*](https://www.royalroad.com/forums/thread/130113) — *"way the heck too complicated… dozens and dozens of features, none of which I needed"*
- [Royal Road — *"I'm curious, does anyone here use World Anvil for their works?"*](https://www.royalroad.com/forums/thread/145823)
- [Trustpilot — World Anvil](https://www.trustpilot.com/review/worldanvil.com)
- [World Anvil Review: Is It Good for Worldbuilding in 2026? (automateed.com)](https://www.automateed.com/world-anvil-review) — the 2026 cons list
- [Kindlepreneur — World Anvil review](https://kindlepreneur.com/world-anvil/) — *"a sharp learning curve"*
- [DL Method — World Anvil review 2025](https://dlmethod.com/world-anvil-review-is-it-worth-using-for-worldbuilders/)
- [SmartCustomer — worldanvil.com (3.1 from 10 reviews; cited only to be discounted)](https://www.smartcustomer.com/reviews/worldanvil.com)
- [AlternativeTo — World Anvil alternatives](https://alternativeto.net/software/world-anvil)

*(Figures on Sigil, Realm Works, Let's Role, One More Multiverse, Foundry, Beyond20, UVTT, Dungeon
Alchemist, Fantasy Grounds and the World Anvil↔Foundry module are carried from RB-14/15/16/17 with their
original attributions; they are not re-derived here and their sources are listed in those briefs.)*

---

*RB-18. The ambition is not too big — it is unpriced, and those are different diseases with different
cures. The seam is real and half a million people have already paid a tax to prove it. The ring is one
object and it is a two-day spike that has not run for four rounds. What is missing is not courage and
not scope. It is one measured day, set beside one estimated day, so that the number in the ledger stops
being a hope with columns.*

> *Sie zählten Tage, die noch niemand ging,*
> *und schrieben hundertzwanzig, wo nur hundert stand.*
> *Der Ring ist klein. Zwei Tage, mehr nicht —*
> *und niemand hat ihn je in seiner Hand.*
