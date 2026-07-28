# RB-19 — Die Prüfung

**Argus' audit of RB-14, RB-15, RB-16, RB-17, RB-18 and `04-die-eine-plattform.md`.**
Compiled 2026-07-27. Sentinel's brief: findings only, no fixes applied.

> **This file overwrites a void first pass.** An earlier RB-19 was written at **12:50** and reported
> `design/04-die-eine-plattform.md` as **non-existent**. That was true at 12:50 and is no longer true:
> the synthesis landed at **13:04** (mtime, verified). Every finding in that pass about the synthesis —
> its §1.1 blocker, its §6 *"unanswerable, because there is no synthesis"* — is **void and is retracted
> here.** Its findings about RB-14..RB-18 are re-tested below and their disposition is recorded
> individually in **§8**: re-confirmed, overturned, or fixed by the synthesis. Nothing from the first
> pass is carried on trust.

**Scope commissioned.** (1) Every figure — attribution, source class, spot-check. (2) Every product
asserted dead / stalled / acquired. (3) Contradictions between the six documents and against the
ratified `RB-11`, `00-intake.md` and `OPEN-DECISIONS.md`. (4) Marketing laundered as fact.
(5) Whether the synthesis engaged Nemesis's arithmetic. Plus four named claims from RB-14 that carry
unusual weight and were verified **individually** (§1).

**Method.** Internal arithmetic re-added by hand against the source files. External figures checked
with WebSearch and, where the host permits, WebFetch. `worldanvil.com` is 403 to me as it is to
everyone else; nothing below rests on reading it directly. `blog.worldanvil.com`, `foundryvtt.com`
and `legendkeeper.com` **do** answer and were read first-hand. File times and line counts taken with
`ls`/`wc` over the tree. Where I could not establish a fact I say so in §9 and do not guess.

**Severity.** **blocker** — the document cannot be used as the binding corpus as-is. **major** — a
load-bearing claim is wrong, contradicted, or unverifiable. **minor** — precision or bookkeeping.

---

## 0. The one-paragraph verdict

**The synthesis exists, it is good, and it did not route around its adversary — it engaged all eight of
Nemesis's route items and adopted six of her findings verbatim, including the ones that cost it
(§7).** All four of the load-bearing RB-14 claims I was told to verify individually **hold**, and the
most load-bearing of them — the Foundry↔World Anvil module being one-way, GM-only, paid-token-gated
and permission-destroying — **verified verbatim against the vendor's own package page** (§1.2). Every
Similarweb figure in RB-14 §1.3 reproduces to the decimal. **There is nevertheless one blocker, and it
is not about evidence quality: `04` declares itself the binding corpus for round 6 onwards while being
blind to four briefs and one measurement spike that landed on disk in the eight to ten minutes before
it — one of which supplies exactly the measured renderer data `04` §10.9 declares does not exist, and
one of which puts two of `04`'s own rulings under live challenge.** Beneath it: five majors — a
pre-committed response that routes to a capability the corpus records as non-existent, an internal
contradiction between §7 R-A and §9 P1 on paid hosting, a provisional ruling (S3/S4) neither cited nor
reconciled, the "one volunteer's module" framing that a 200-OK fetch does not support, and RB-18's
under-counted repository inventory now inherited into the binding text.

---

## 1. The four load-bearing claims, verified individually

### 1.1 *"not a virtual tabletop (VTT) or map-making software"* — **HOLDS, with one precision defect**

**Established.** The sentence is live on World Anvil's FAQ today and is reproduced by search against
`worldanvil.com/faq` and by the copy on their maps pages. A second, independent vendor sentence
corroborates the map half directly: *"World Anvil is not a mapmaking software — it only makes your
maps interactive."* It is current, not a stale cache.

**The defect.** The FAQ sentence's subject is **World Anvil's Campaign Manager**, not World Anvil the
platform: *"World Anvil's Campaign Manager is not a virtual tabletop (VTT) or a map-making software."*
RB-14 §1.1 files it under **"Self-description"** of the company, RB-14 §6.1 renders it *"World Anvil
is …"*, and `04` §2 renders it *"their FAQ states **they** are …"*. The substitution is small and the
substance survives — the Campaign Manager *is* their play product, so a disclaimer on it is a
disclaimer on their play surface — but the sentence is quoted three times as the benchmark's own
verdict on itself and it should be quoted with its real subject. **Severity: minor.** Fix the subject;
do not weaken the finding.

**What is *not* established: the duration.** `04` says *"nine years of public refusal"* (§3.4),
*"their FAQ has said 'not a virtual tabletop' for nine years"* (§7 R-D), and *"they have said so for
nine years"* (closing). RB-14 §6.4 is the origin: *"they have publicly positioned against it for nine
years."* **No source anywhere establishes when that sentence first appeared.** What is established is
(a) a current FAQ statement, (b) founding in 2017, and (c) an open, unshipped community suggestion
*"Add Virtual Tabletop for D20 Play"* (RB-15 §0). The defensible sentence is *"they have never built
one, and their own FAQ still disclaims it"* — not a nine-year quotation. **Severity: minor**, and it
appears in the three most quotable sentences in the document.

### 1.2 The Foundry ↔ World Anvil module — **HOLDS, verbatim, on every clause**

This is the single most load-bearing external artefact in the brief. I fetched
`foundryvtt.com/packages/world-anvil` directly (**200 OK, 2026-07-27**). Every clause:

| RB-14 §6.3 / `04` §2 claim | Verdict | Evidence, first-hand |
|---|---|---|
| Imports WA articles into Foundry journals, categories → folders, timelines linked, cross-links preserved, per-article **WA Sync** | **Confirmed** | *"Categories import as folders with nested articles"*; *"Preserves cross-links between articles; linked content auto-imports"*; *"one-way sync via 'WA Sync' button"* |
| **One-way** | **Confirmed** | *"Supports one-way sync … to refresh content from World Anvil"* |
| **GM-only** | **Confirmed, verbatim** | *"All functionality of this module is restricted to Gamemaster users only"* |
| **Requires a paid API token** | **Confirmed** | Requires a World Anvil API token from the user dashboard, *"available to Guild member users"* — i.e. any paid tier. RB-14's *"Guild-tier"* is exact; `04`'s *"a paid API token"* is exact |
| **Drops World Anvil's permission model; imported content becomes private to the importing GM** | **Confirmed, verbatim, and stronger than the brief claims** | *"Imported content defaults to private access for the importing GM"* and *"does not currently attempt to preserve permission or visibility control settings from World Anvil when importing content"* |
| MIT, maintainer `didialchichi`, v1.5.2, verified Foundry 14.364 | **Confirmed** | MIT; didialchichi; 1.5.2 released ~2 weeks ago; *"Versions 13-14 (Verified 14.364)"* |

**The fusion thesis's best external evidence is sound.** One clause of the *framing* around it is not —
see §3.4.

### 1.3 Custom statblocks: HTML + CSS + TWIG, Grandmaster-gated — **HOLDS on both halves**

World Anvil's own Codex and knowledge-base pages, surfaced by search: custom statblock templates use
**HTML for structure, CSS for style and TWIG for logic**, the feature is **available to the Grandmaster
subscription tier and above**, and WA's own wording is *"a technical advanced feature that involves
coding."* Community tooling corroborates the shape (a CSS file, a badge template, a trackable
template, a form template; Bootstrap grid advised; a `#twig-help` Discord channel).

**Both the technical requirement and the tier gate are confirmed.** The *price* attached to the tier is
where the corpus was previously loose — see §4, m1: RB-14 reads ~$99/yr via proxy, third-party
Kindlepreneur reads $105/yr, RB-15 carries a stale $105. `04` **fixed this**: it quotes the tier as
**"$99–105/yr"** throughout (§3.4, §5 row 2, §5.1) and §10.5 rules *"use ranges, never a single figure,
and date every quote."* That is the correct handling and it is the model for the rest of the corpus.

**Corroborating spot-check:** the third-party lifetime figure `04` §0.5 leans on — Grandmaster
*"$12/month, $105/year, $650/lifetime"* — reproduces against Kindlepreneur. `04` labels it
`[Kindlepreneur, third-party, updated 2025-10-01]`, which is the right weight, and correctly records
that RB-14's inferred $400–500 was low.

### 1.4 The traffic figures — **the discipline HOLDS; one of the two numbers does not reproduce**

**The discipline question is what was asked, and it passes.** I grepped every occurrence of a traffic
figure across the six documents. **The two panels are never collapsed into one confident number,
anywhere.** RB-14 §1.3 tables both with panel and period; §5.1 says *"even on the pessimistic panel …
on the optimistic one"*; §8.13 writes the range *"~1.4–3.3 M visits/month"*; §9.6 lists it as
unresolved; RB-18 §7.4 repeats the conflict; `04` §10.2 records *"irreconcilable from outside"* and
carries only the invariant *"47 % organic search"* forward. **No document quotes a single visit
number as fact.**

**Similarweb reproduces exactly.** Fetched today: ~1.4 M visits, bounce **47.71 %**, **4.49**
pages/visit, **3 min 42 s**, **−4.87 %** MoM, global rank **#32,863**, category rank **#16**
(Roleplaying Games, US), US **43.38 %**, DE **6.34 %**, UK **6.1 %**. Every one of RB-14 §1.3's
Similarweb figures is correct to the decimal. That is unusually good sourcing and it should be said.

**Semrush does not.** RB-14 records Semrush **3.33 M, March 2025, ~12 min session**. Semrush's
currently visible worldanvil.com figures are **1.77 M (April), 2.38 M (March), 1.63 M (February)**,
4.52 pages/visit, 60.43 % bounce. I could not reproduce 3.33 M from any period, and the numbers I can
see sit much closer to Similarweb's than to RB-14's "optimistic panel." **Consequence: the "they
disagree by more than 2×" framing is weaker than stated — it may be an artefact of one stale
snapshot.** The strategic conclusion is unaffected (the range is honest either way, and the
sentence that survives — *"even at the pessimistic figure this is ~1.4 M visits a month"* — is the one
the corpus actually uses). **Severity: minor**, but the Semrush row should be dated as a snapshot that
did not reproduce rather than presented as a live rival estimate.

**One sub-claim inside the surviving figure is an inference wearing a panel's attribution.**
RB-14 §5.1 and `04` §5 row 11 both write: *"**47 % of World Anvil's traffic is organic search**
[Similarweb], **arriving at *user worlds***."* Similarweb measures **channel share**, not landing-page
distribution — and its traffic-source breakdown is **desktop-only** by methodology (the live figure
reads 47.06 %, and the desktop qualifier is stated on the panel). *"Arriving at user worlds"* is a
plausible inference and it is **not a Similarweb datum**, yet it sits inside the bracket. This is
load-bearing: it is the stated reason `04` §8.1 promotes `die offene Tür` to **launch-blocking**.
**Severity: minor** as a fact, **major** as a habit — this is the one place in six documents where an
inference is dressed in a panel's clothes.

---

## 2. Blocker

### 2.1 `04` declares itself the binding corpus while blind to four briefs and one spike that predate it

`04`'s first line: *"**Binding corpus: every design round from 6 onwards reads this file** alongside
`00-intake.md` and `iterations/CHAMPION.md`."* Its source list names the internal corpus it read in
full and explicitly excludes only RB-12/RB-13 as *"written concurrently."*

**File times, verified with `ls`:**

| File | mtime |
|---|---|
| `research/RB-18-widerspruch.md` | 12:31 |
| `research/RB-19` (the void first pass) | 12:50 |
| `spikes/spike-K-kartenmass/` (3 measurement scripts, `polygon-clipping` + `rbush`) | **12:54–12:55** |
| `research/RB-20a-kartenwerkzeuge.md` | **12:56** |
| `research/RB-20b-machbarkeit.md` | **12:56** |
| `research/RB-20d-erzeugung.md` | **12:57** |
| `research/RB-20c-kunstpipeline.md` | **13:02** |
| **`04-die-eine-plattform.md`** | **13:04** |

**`04` contains zero occurrences of "RB-20", "Kartenleger" or "Inkarnate."** It was written last and
knows least. Three concrete consequences, each of which a round-6 candidate will hit immediately:

**(a) `04` §10.9 and §4 Step 0 are falsified by a file eight minutes older.** `04` §10.9:
*"What one 'developer-day with an AI crew' produces in server, renderer, projection or persistence
code. **Zero data points.** The single calibration artifact covers one subsystem of fourteen. **This
remains the most important unknown in the entire project.**"* And §4 Step 0: *"that unit has never been
calibrated against a single line of server, renderer, projection or persistence code."*
**RB-20b (12:56) marks its numbers `[gemessen]` with the scripts on disk**: an **84-byte** undo patch
journal, **9.4 ms** per incremental per-character fog reveal as a vector mask, **0.021 ms/query**
culling at 50 k stamps, **1.06 MB gz / 45 ms parse** for a 50 k-stamp scene. RB-20a §7.1 cites a
**measured tile pyramid — 1,365 tiles / 9.9 MB / 31.7 s / 616× faster first pixel.** Whatever else is
true, *"zero data points"* and *"not a single line of renderer"* are not.

**(b) RB-20a puts two of `04`'s own rulings under live challenge, by name.** RB-20a's header states it
*"put[s] a live ruling under pressure — RB-15 §3.3/7c refuses a hand-drawing map editor outright"* and
rules on the collision in its §6/§7. `04` §3.1 row 7 ratifies **"REFUSE the paint program"** without
knowing a brief answering the stakeholder's own sentence (*"integriertes Inkarnate … wäre natürlich
sexy"*) landed eight minutes earlier with a costed alternative (`Der Kartenleger`, **≈43 base / ≈52
with contingency**, explicitly *not* a paint program). And RB-20a §7.3 item 3 proposes **a second
import target** (Azgaar GeoJSON) and says it *"should be argued explicitly against Rank 4's 'exactly
one' rule rather than smuggled past it"* — while `04` §3.2(d) and §9 P8 rule **"one flagship
migration … never two"** as settled.

**(c) A stakeholder sentence is outside the binding corpus.** RB-20a/b/c/d all target the same verbatim
Kaya quote about an integrated Inkarnate. `04` §1.2's anti-smuggling clause says no later round may
cite the ambition as authority for adding a surface and *"must overturn this section by argument."*
Round 6 will open with a surface question that four briefs have already argued and the binding
document has never heard.

**Why blocker and not major.** Nothing here says `04` is wrong. It says `04` cannot be what its own
first line claims to be — *the* file round 6 reads — until it either absorbs RB-20a–d or states, the
way it states for RB-12/13, that they are concurrent and out of scope. As written it silently asserts a
completeness it does not have, in a document whose §8.2 tells the champion that *"Gnōthi seauton is a
bookkeeping instruction."*

---

## 3. Major findings

### 3.1 `04` §7 R-A pre-commits to a path the corpus records as non-existent

`04` §7 R-A, pre-committed response, emphasis its own: *"If P90 campaign cost exceeds **1/36 of the
licence price per month** …, hosted rooms move to a metered add-on priced at cost, **the self-hosted
Electron path becomes the default in the copy**, and `die Raumuhr` degrades honestly rather than
silently. **This is decided now.**"*

Against three ratified/binding records:

- **RB-11**, three times: *"a browser player joining a GM's home server hits mixed-content and cannot
  get a certificate for a LAN IP … the only proven fix is Plex's DNS-zone + per-server
  wildcard-certificate service — which we would then operate forever. **Choosing a channel does not
  choose a solution.**"*
- **`00-intake.md` K6** carries the same paragraph as the problem *"the fork did **not** solve, and
  which every option pays identically."*
- **`OPEN-DECISIONS.md` S4**: *"'self-hostable' on the intake page currently implies a path that does
  not exist."*

**So the pre-committed response to the most-likely cause of death routes traffic onto a join path that
three binding documents record as unbuilt and unfunded.** A pre-commitment exists to make the decision
calmly in advance; this one, fired, would substitute one unpriced problem for another under exactly
the pressure it was written to avoid. It needs either the Plex-pattern service costed inside the
response, or the response re-aimed. **Severity: major.**

### 3.2 `04` contradicts itself on paid hosting: §7 R-A versus §9 P1

- **§7 R-A** (pre-committed): *"hosted rooms move to a **metered add-on priced at cost**."*
- **§9 P1** (provisional ruling): option (b) is rejected because *"a separate hosting SKU … **reintroduces
  the subscription** whose absence is our structural answer to their top Trustpilot complaints."*

A metered add-on priced at cost **is** a recurring hosting charge. The same document rules it
inadmissible in §9 and pre-commits to it in §7. One of the two must be re-worded; as they stand a round-6
candidate can cite `04` in support of either position. **Severity: major.**

### 3.3 P1 rules on hosting without citing `OPEN-DECISIONS.md` S3/S4, which already rule on it

`OPEN-DECISIONS.md` **S3** (provisionally ruled): *"**Licence primary**, plus **optional hosted rooms
priced at the cost they incur** … charge for **storage and rooms, never for features**."*
**S4** (deferred, provisional for planning): *"**yes, minimal hosted rooms**."*

`04` §9 P1 raises public-world hosting as a fresh decision, rejects option (b) on grounds that would
also cut against S3, and **cites neither S3 nor S4**. The first-pass audit raised this against RB-14
§8.18; the synthesis was the place to reconcile it and did not. `04` §9's own header says the table is
*"appended to `OPEN-DECISIONS.md` in its existing table format"* — and it was (P1–P9 are on disk, so
RB-14 §8.18's *"logged for OPEN-DECISIONS"* is now true; see §8) — but appending beside S3/S4 without
engaging them leaves two live rulings on the same subject pointing different ways. **Severity: major.**

### 3.4 "One volunteer's MIT module" understates its backing — and that sharpens the risk, not blunts it

Three documents describe the same artefact three ways, and my 200-OK fetch settles it:

- **RB-15 §0/§2**: *"credited to a single community author (`didialchichi`), **not to World Anvil and
  not to Foundry's company**"* … *"the connection … is **a hobby project**."*
- **RB-18 §4.4 / Break B-5**: *"Chronicle's real competitor on the seam is **not World Anvil and not
  Foundry**. It is **one volunteer's MIT module**."*
- **`04`** inherits the softened form: *"a … module **written by a single volunteer under MIT**"* (§2),
  *"**one volunteer's** free MIT module"* (§3.3/5, §5 row 4), and in the closing paragraph *"the bridge
  between them is **one volunteer's module**."*

**Verified:** the maintainer *is* one community author and the licence *is* MIT — but the canonical
repository is **`https://github.com/foundryvtt/world-anvil`, inside Foundry Gaming's own GitHub
organisation**, and World Anvil documents the integration on its own knowledge base
(`worldanvil.com/learn/rpg/foundry-integration`, cited in RB-15's own source list). RB-14's framing
(*"World Anvil's own flagship integration"*, *"officially blessed"*) is closer, though it attributes
the hosting to the wrong party.

**Why this is major and not cosmetic.** `04` §7 R-D's whole early-warning logic — *"the seam gets
closed"* — is calibrated on the assumption that the bridge is an unowned hobby artefact that nobody has
an incentive to deepen. If the canonical repo sits in the incumbent VTT vendor's org and the incumbent
wiki vendor documents it, then **the seam already has two companies standing next to it**, and R-D's
trigger (ii) (*"Foundry release notes for journal visibility derived from anything"*) is too narrow.
The correction makes the attack on our moat **stronger**, which is precisely why it must not be
sanded. **Severity: major.**

### 3.5 RB-18's repository inventory is short — and `04` has now inherited the wrong conclusion

RB-18 §1.6 presents *"**Every executable line in the repository** [computed, `wc -l`]"* as **2,454
lines** and concludes *"the lineage has **exactly one datum**: `spike-A-passage-identity` … it covers
**one subsystem out of fourteen**"*; §7.1 repeats *"The single calibration artifact."*

**My count today, `wc -l` over every `.js`/`.mjs` under `design/`: 3,661 lines.** Every individual
figure RB-18 prints is correct; the **inventory omits whole directories**:

| Omitted from RB-18 | Lines | mtime | Executed? |
|---|---:|---|---|
| `spikes/spike-B-wiederkehr/` (`wiederkehr.mjs` 334 + `run.mjs` 451) | 785 | 11:08–11:10 | **yes — `RESULTS.txt` on disk** |
| `spikes/spike-B-w1/run.mjs` | 222 | 11:12 | **yes — `RESULTS.txt` on disk** |
| `spikes/spike-K-kartenmass/` (`szene-mess.mjs` 115 + `vektor-mess.mjs` 85 + `bild-mess.py`) | 200+ | 12:54 | results embedded in RB-20b as `[gemessen]` |

The first two predate RB-18 (12:31) by roughly eighty minutes, and RB-18 §0 uses `stat` output over the
tree as its own evidentiary method, so it cannot claim not to have looked. Worse: RB-18 §1.4's
unpriced-items table lists ***"Die Wiederkehr's real cost — Round 5 owes a real cost estimate for this
subsystem"*** while a built-and-executed spike for exactly that subsystem sat in the tree.

**The inheritance is the new part.** `04` §10.9 carries the conclusion forward into the binding
corpus — *"Zero data points. The single calibration artifact covers one subsystem of fourteen"* — and
§4 Step 0 builds the project's highest-priority action on it. Two of the three omitted spikes were
already answerable when RB-18 wrote; the third, plus RB-20a/b's measured renderer numbers, was
answerable when `04` wrote (§2.1).

**What survives.** RB-18's *thesis* is not overturned: none of the three spikes is a hosted server, a
persistence layer or the server-side `Sicht` projection, so *"`Sicht` is unbuilt and unmeasured"*
stands, and Step 0 remains the right instruction. Only the **"zero"** and the **"single"** are false.
**Severity: major**, because the phrase now sits in the document round 6 must read.

---

## 4. Minor findings

| # | Finding | Where |
|---|---|---|
| m1 | **Pricing: RB-15's summary table is stale and uncaveated.** RB-15 §1 states `$58/yr Master, $105/yr GM, $300/yr Sage` bare; §1.1's prose caveat (*"approximate and stale"*, Jan-2025 third-party) does not travel with the table. RB-14 reads $54/$99/$300 via proxy. **`04` fixed the downstream use** ($99–105 ranges, §10.5's "use ranges, never a single figure") — the source table is still uncorrected. |
| m2 | **"Plato" is the wrong editor name.** World Anvil's *new* visual editor is **Plutarch**; **Plato** is the older one users are migrating *from*; **Euclid** is the advanced/BBCode editor. RB-14 §2.1 (*"Plato (new WYSIWYG/visual)"*), RB-18 §3.2 and **`04` §5 row 1** (*"three coexisting (Plato, Legacy BBCode, Euclid)"*) all invert it. The substance — three editors coexist and switching destroys content — is documented and unaffected; the name is quotable copy in the lineage's flagship attack row. |
| m3 | **`04` §3.1's own count does not reconcile with its own table.** It states *"Counted: **9 ABSORB · 4 INTEGRATE · 10 REFUSE**"* and §1.2 says *"**Ten** of them are refused in §3 below."* Adding the table's split rulings: **14 ABSORB · 4 INTEGRATE · 9 REFUSE.** INTEGRATE is right. This is RB-15 §3's unreconciled count (9/4/10 against 10 enumerated ABSORBs and 11 enumerated REFUSEs) carried into the binding text, together with the claim that *"the refusals are the load-bearing half."* |
| m4 | **RB-17 still launders the discredited Trustpilot 3.1**, twice — §4.3 A-2 and §5 Rank 6 — after RB-14 §0 traced it to a **ten-review** aggregate and established **3.8** from the live page (258 reviews). **`04` does not inherit it** (§10.4 records all three figures disagreeing), so the contamination is contained to RB-17, which must be corrected before anything quotes it. |
| m5 | **RB-14 §3.4's "1/16th of the ten-year cost" is attached to the wrong row of its own table.** $990 ÷ €30 ≈ **1/33**; 1/16 is the *five*-year figure ($495 ÷ 30). RB-14 bills the surrounding passage as *"the single sharpest sentence in this brief."* **`04` avoided it** (it uses ~20× against the $650 lifetime and $1,040–1,100 against €30, both correct) but did not correct the source. |
| m6 | **RB-15 §3.1/2 cites `OPEN-DECISIONS.md` §K5.** There is no K5 entry in that file; the canvas-separability permission is **S5**. Still unfixed. `04` §4 Step 10 cites it correctly. |
| m7 | **`04` §0.4's Rollplay description is 80 % verified and 20 % not.** Verified verbatim on `daydreamteam.com`: *"Design your character sheet layout with drag & drop"*, *"Define attributes that follow custom formulas"*, *"Create content with automated effects that follow your rules"*, *"Full dice formula support: dice pools tied to your attributes"*, *"Draft and shared versions"*, mobile-first, and **no VTT / no maps / no live play**. **Not reproduced on either cited page:** *"a marketplace"*, and *"freemium"* — the site's own line is *"No subscription. No account required. Works offline."* The ruling in §3.4/P4 does not depend on either. |
| m8 | **`04` restates figures with the marker stripped.** *"One More Multiverse raised **$17.6 M**"* (§7 R-A, §6.2) — RB-16 flags $17.6 M as a two-round **aggregator total** against a well-sourced **$17.5 M Series A**. *"users have asked for a 'World Anvil users only' option"* (§5 row 3) — RB-14 marks it `[vendor + community suggestions]`. *"Half a million people run Beyond20"* — the 500 k is a Chrome Web Store **install** figure (RB-18 §7.9 says so explicitly); `04` §1.1 attributes it correctly once and then uses *"run"* thereafter. |
| m9 | **Currency mixing without a rate.** §5.1's headline sentence sets *"about **$1,050** over ten years"* against *"**€30** once"*, and §0.5 computes *"roughly 1/20th"* from **$650** against **€30**. Both are honest at order-of-magnitude and neither changes a ruling; say so once rather than leaving a reader to do a conversion the document never states. |
| m10 | **Carried from the first pass, not re-derived:** WA team size asserted in RB-16 §5 (*"~16 employees"*) where RB-14 §9.2 calls it unestablishable; RB-17's false *"no current figure found"* for Beyond20 (RB-15 established 500 k the same day); RB-16 §0's unenumerable *"nineteen platform-scale attempts"*; RB-16 §2's compound *"six years"* (launch→suspension 6 y 2 m; ENnie→suspension 5 y); Quest Portal's total funding (Tracxn $13.7 M vs CB Insights $15.71 M); RB-17 §2.1's *"Fandom owned D&D Beyond from 2019"* (Curse Media acquisition announced Dec 2018). None is inherited by `04`. |

---

## 5. What holds — named, so the sound work is not smeared by the unsound

**Dead, stalled and acquired products: every claim I checked held, in both passes.** Nothing in the
corpus reports a live product as dead, and RB-16's three "alive" corrections (Shard Tabletop,
Myth-Weavers, MapTool) are right. Re-confirmed or newly confirmed today:

- **Sigil** — EA 26 Feb 2025; ~90 % of the team (~30 people) laid off ~3 weeks later; sunset announced
  Oct 2025; **servers close 2026-10-31**; six months complimentary Master Tier. Used identically in
  RB-15 §0, RB-16 §1.1, RB-17 §2.4 and `04` §1.2.
- **One More Multiverse** — wind-down announced 13–14 May 2024, 90-day wind-down, **$17.5 M Series A**,
  infrastructure cost the stated cause; Dice Monkey's *"$5 a person"* realtime arithmetic verbatim.
- **Let's Role** — Kickstarter Feb 2021, development ceased **13 Nov 2023**, site stays online, the
  founder's *"I've reached the end of my personal resources"* verbatim.
- **Astral TableTop** — halted 19 Oct 2021, founder retired, OBS↔Roll20 merger July 2022, servers off
  30 Aug 2022.
- **Realm Works** — 1,836 backers / **$170,748**; ENnie Silver 2014; suspended **29 Sept 2019**; still
  on sale at $59.99 with no development notice; Fog of World still advertised patent-pending.
- **Role** — **alive and scope-reduced**, and the specific claim `04` §4 Step 5 leans on is confirmed
  first-hand: Role's own changelog (2024-05-24) announces the **Owlbear Rodeo** integration, with the
  maps-and-tactics experience gated to **Patrons**. RB-16 §1.8's *"no longer builds its own tactical
  half"* is fair.
- **Fantasy Grounds free-to-play 2025-11-08**, Demiplane→Roll20 4 June 2024, Kobold Fight Club's death
  on a Google Sheets API policy change — all previously confirmed and unchallenged.

**Newly verified first-hand today, all of `04` §0's "[verified today]" claims that I could reach:**

- **§0.1** — `blog.worldanvil.com/newsletter/world-anvil-news-july-2026/`, **published 9 July 2026**,
  quote verbatim: *"You can toggle on or off the novel writing software, the RPG Campaign Manager,
  NSFW filters and many more features to customize the World Anvil experience to your needs."* The
  *"streamlined Diplomacy Webs"* update is on the same post. **`04`'s most conclusion-moving new
  finding is exact.**
- **§0.2** — Inline Article Creation, **published 14 January 2026**, `@`-mention → plus button →
  choose a template → *"the article will be spawned in your world"*, available to free and Guild users
  in the Visual editor. Exact. *(The post names that editor **Plutarch** — see m2.)*
- **§0.3** — `foundryvtt.com/article/journal/`, all four clauses verbatim: *"Journal Entries store
  Pages, with each one acting as a separate unit of related information"*; *"you can selectively choose
  individual players who will receive it"*; *"Secret … only be visible to the GM or Owner of the
  Journal Entry"* with a reveal button; and permissions *"established at the Journal Entry level …
  not individual pages."* **`04`'s §0.3 correction of CHAMPION §16 is right, and the narrower moat
  sentence it proposes is the one that survives a reviewer.**
- **§5.1** — `legendkeeper.com/pricing`, 200 OK: Pro **$9/mo or $7.50/mo annually ($90/yr)**, Basic
  free (view/export/collaborate), and verbatim: *"an unlimited number of guests can participate in your
  projects for free. Only the project owner needs an active subscription."* **`04`'s ruling that
  "players always free" is table stakes and not a differentiator is correctly evidenced.**
- **§0.5 / §5.1** — Kindlepreneur's Grandmaster **$12/mo, $105/yr, $650 lifetime** reproduces.

**RB-18's internal arithmetic — re-added by hand against the source files in the first pass and not
re-litigated here — reproduces exactly:** CHAMPION §9.2's "v4 full" column sums to **100** under a
**≈120** label; the slice-1 column sums to **67** as claimed; round 3's table is **82 + 16
contingency = 98** with the contingency line present and absent from CHAMPION; fog priced **12 (risk
high, falsifier at 20)** in round 3 and **7** (slice 1: **2**) in CHAMPION with no stated reason;
*"~60 days of editor leave slice 1"* verbatim in round 3 and no day count in CHAMPION §12.2; the
216–226 / ≈260–271 subtotals correct; the 31/69 and 48/52 fusion-parity splits correct.
**These are diffs, not opinions, and `04` adopts all four of them (§3.3).**

---

## 6. Marketing laundered as fact — the audit item, answered

**Broadly: no, and the discipline is the best I have audited in this corpus.** RB-14 defines a
five-label scheme in §0 and applies it in every table, including against its own brief (it *corrects*
the Trustpilot and Kickstarter figures it was handed). RB-15 §0 states three rules and honours them.
RB-16 marks company-database figures as third-party estimates rather than filings. RB-17 marks
Foundry's *Year in Review 2026* as vendor self-report at every use. RB-18 marks its own computations
`[computed]` with inputs shown. **`04` §"Sourcing discipline" is the strongest header in the set** —
it marks `[vendor]`, marks `[verified today]`, states the 403 constraint, and says outright *"nothing
is estimated into existence."* Vendor superlatives are quarantined throughout: WA's *"3,500,000+
worldbuilders"*, Kanka's *"400,000+"*, Roll20's *"over 10 million"*, DriveThruRPG's *"over 1 million"*,
StartPlaying's *">$50 M paid to GMs"* (with the date warning attached).

**The exceptions, all listed above and none of them in `04`'s rulings:**

1. **RB-17's ~3.1/5 Trustpilot**, twice, inside a strategy ranking, after RB-14 debunked it (m4). This
   remains the one true laundering in the set.
2. **RB-14 §5.1 / `04` §5 row 11's *"arriving at user worlds"*** inside a `[Similarweb]` bracket
   (§1.4). An inference in a panel's clothes, and it is the stated basis for a launch-blocking
   promotion.
3. **The "nine years"** duration (§1.1) — an inference presented as a dated fact, three times.
4. **RB-16 §5's "~16 employees"** stated as a survivor fact where RB-14 calls it unestablishable (m10).
5. **RB-15 §0's *"World Anvil, the biggest world-building platform in the hobby"*** — an unattributed
   superlative in a corpus that elsewhere refuses to say it, because RB-14 §1.2 established that **no
   independent user figure exists in any form**.
6. **Markers stripped in restatement** (m8) — the mildest form, and the one most likely to compound.

---

## 7. Did the synthesis use the attack? — **Yes. Comprehensively, and at cost to itself.**

This was unanswerable in the void pass. It is answerable now, and the answer is the strongest thing in
this audit. **All eight of RB-18 §6's route items are engaged; six of RB-18's findings are adopted
verbatim in a section titled *"Where Nemesis is right and it is adopted without face-saving."***

**The arithmetic is not routed around — it is the spine of the document.** `04` §3.3, quoted:

> *"1. **The ≈120-day figure is wrong.** CHAMPION §9.2's own table sums to **100**. Either twenty days
> are unattributed or the headline is padded. Fix the ledger before the next round quotes it.
> 2. **Round 3's 20 % contingency (16 days) was deleted between rounds with no note.** Restore it.
> 3. **The 60-day editor half fell off every total the lineage quotes.** Restore it to the ledger."*

`04` **never quotes ~120 anywhere else.** The only two occurrences in the whole document are the
adoption above and the work order at §8.2 (*"either attribute the missing twenty days or stop saying
120. Gnōthi seauton is a bookkeeping instruction"*). RB-18's reconciled total is carried into the risk
register at §7 R-B as *"**≈260–270 priced developer-days containing none of K1, K2 or K5** … 87–90
weeks — month 20 of a runway history sizes at 24–33 months."*

**The fusion/parity split is contested on the merits, not evaded.** `04` §3.2(a) is the model of how to
disagree with an adversary without dodging her:

> *"RB-18 §4.2 splits the tactical half into **31 fusion-bearing days and 69 parity days** (48/52 on
> the generous reading) and treats the parity share as an indictment. **I overrule the framing and keep
> the finding.** … The parity days buy the right to be evaluated. They are not optional and they must
> not be cut. **What I adopt from the same section without alteration: the order.** The 31–48
> fusion-bearing days … run first. §4 encodes this."*

And §4 does encode it: Step 1 determinism, Step 2 `Sicht`, Step 3 the atom — the fusion-bearing lines —
run before the canvas (Step 8) and before the builder (Step 9).

**The unanswered moat attack is adopted, not deflected.** §3.3/5: *"**The moat has never been attacked
against the real stack** — Foundry ($50 once) + World Anvil Grandmaster ($99–105/yr) + one volunteer's
free MIT module, which RB-14 estimates delivers **~80 % of Chronicle's fusion**. Every future flex must
be demonstrated against that stack, never against Foundry alone."* It is then wired into §5 row 4 as
the test condition and into §8.1 as a work order against CHAMPION §16.

**The tripwire is adopted as a hard gate.** §3.3/6 and §7 R-C: *"`Sicht` is at four. **Round 6 forges
nothing until S-P1 has run.**"* And §4 Step 0 makes calibration the project's first action:
*"This is the highest-leverage two days available in the project and it has been mandatory and unrun
for four rounds."*

**Where the engagement is partial, and it should be named.** RB-18 §6 item 4 is a disjunction:
*"**Cost K2, or stop calling it the go-to-market.** A ratified channel with no price is not a plan."*
`04` records the debt (§3.3/4 lists K2 among nine unpriced items; §8.2 orders CHAMPION §2 to carry the
block) **and continues to call the builder the go-to-market** (§4 Step 9: *"K2. The go-to-market"*)
**without pricing it.** That is a deferral of the disjunction rather than a resolution of it — legitimate
as a work order, but round 6 owes the number and should be told so in those words.

**Verdict on audit item 5: the failure mode this crew exists to prevent has not been committed.** The
synthesis engaged its adversary on the adversary's own arithmetic, adopted the findings that cost it,
and argued rather than averaged where it disagreed.

---

## 8. Disposition of the void first pass, finding by finding

| First-pass finding | Disposition now |
|---|---|
| **§1.1 blocker — `04` does not exist** | **VOID.** True at 12:50, false at 13:04. Retracted. The intake's two citations to `04` now resolve. |
| **§1.2 blocker — RB-14 §8.18's *"Logged for OPEN-DECISIONS"* is false** | **OVERTURNED.** `OPEN-DECISIONS.md` now carries a section *"New decisions raised by `04-die-eine-plattform.md`"* with **P1–P9**, P1 being exactly the public-worlds-vs-licence collision. The claim was premature, not false. |
| **§1.2 sub-finding — RB-14 §8.18 ignores S3/S4** | **RE-CONFIRMED and ESCALATED.** The synthesis inherited it: see §3.3 above. |
| **§1.2 sub-finding — RB-15 cites `OPEN-DECISIONS` §K5, which does not exist** | **RE-CONFIRMED** (m6). |
| **§2.1 — WA pricing contradiction RB-14 vs RB-15** | **RE-CONFIRMED at source; fixed downstream** by `04`'s $99–105 ranges and §10.5's ruling (m1). |
| **§2.2 — RB-17 launders the discredited 3.1 Trustpilot** | **RE-CONFIRMED; not inherited** by `04` (m4). |
| **§2.3 — the WA↔Foundry module is misattributed** | **RE-CONFIRMED by my own 200-OK fetch, and re-scoped.** RB-15's *"not to Foundry's company"* is wrong; `04` inherits the softened *"one volunteer's module"* (§3.4). |
| **§2.4 — RB-14's "1/16th of the ten-year cost"** | **RE-CONFIRMED; not inherited** by `04` (m5). |
| **§2.5 — RB-14 self-contradicts on mobile** | **RE-CONFIRMED at source; FIXED by the synthesis.** `04` §6.1 reclassifies it: *"parity by omission — World Anvil has no app either, 'responsive web only', and our phone surface is a **play** surface, not a reading one."* The RB-11 friction is gone. |
| **§2.6 — RB-18's line count is 29 % short** | **RE-CONFIRMED and WORSE** (3,661 lines, four spike directories), **and now inherited** into `04` §10.9 (§3.5). |
| **m1 — RB-15's bucket counts do not reconcile** | **RE-CONFIRMED and inherited** into `04` §3.1 (m3). |
| **m2–m8 (team size, Beyond20 "no figure", low vendor figure, "nineteen attempts", Quest Portal funding, Realm Works compound date, Fandom-2019)** | **CARRIED, not re-derived.** None is inherited by `04` (m10). |
| **§4 — every dead-product claim holds** | **RE-CONFIRMED**, plus Role/Owlbear newly verified first-hand (§5). |
| **§5 — labelling discipline is real** | **RE-CONFIRMED**, and `04` extends it (§6). |
| **§6 — "did the synthesis use the attack?" unanswerable** | **VOID. Now answered: yes** (§7). |

---

## 9. What I could not establish

Recorded so no future round launders an absence into a fact.

1. **When World Anvil's *"not a virtual tabletop"* statement first appeared.** No dated evidence of any
   kind. The *"nine years"* claim is unsupported (§1.1).
2. **Semrush's 3.33 M / March 2025 figure.** Did not reproduce. Semrush's currently visible
   worldanvil.com figures are 1.63–2.38 M/month. Whether 3.33 M was ever displayed, I cannot say.
3. **Whether 47 % of World Anvil's organic search traffic lands on *user worlds* rather than on
   marketing or knowledge-base pages.** Similarweb reports channel share, not landing pages. No
   landing-page data found at any price I can reach.
4. **World Anvil's live pricing page, first-hand.** 403 to me. The tier figures in this audit are
   third-party and are given only to adjudicate between internal documents.
5. **Whether RB-14's `r.jina.ai` proxy readings are faithful to the live pages.** I could not reproduce
   the proxy path. RB-14 weights all proxy material as vendor self-reporting either way, so this
   affects fidelity, not evidentiary class.
6. **World Anvil's real user count, revenue, subscriber count, worlds hosted, team size, and challenge
   participation.** Unchanged: vendor self-reports conflict (1.5 M / 3 M / 3.5 M), no filings exist,
   aggregators disagree.
7. **The exact prior free-tier article limit (125).** The **42** ceiling is corroborated indirectly
   through World Anvil's own support tickets; the 125 figure I could only find inside the corpus.
8. **Whether `spike-K-kartenmass` was executed to completion.** The scripts and a `package.json` are on
   disk; there is **no `RESULTS.txt`**, unlike spikes A, B-wiederkehr and B-w1. RB-20b prints its
   numbers as `[gemessen]` and names the scripts; I did not re-run them.
9. **Whether RB-20a–d were meant to be inputs to `04` or a parallel track.** `04` names RB-12/RB-13 as
   concurrent and out of scope and says nothing about RB-20 at all. Whether that is an omission or an
   intended separation is a verdict question, not mine (§2.1).
10. **Rollplay's, Minimal Sheets', FORGE's and Quest Portal's scale.** No reliable figures. `04` §10.8
    already says the finding is that the positions exist, not that they are large — which is correct.

---

## 10. Sources

**Internal, read or measured for this audit:**
`design/04-die-eine-plattform.md` (all 833 lines) · `design/research/RB-14`, `RB-15`, `RB-16`, `RB-17`,
`RB-18`, `RB-11` · `design/00-intake.md` · `design/iterations/OPEN-DECISIONS.md` (all 58 lines) ·
`design/research/RB-20a`, `RB-20b`, `RB-20c`, `RB-20d` (heads and verdict sections) ·
`design/spikes/` directory listing and `RESULTS.txt` inventory ·
`wc -l` over every `.js`/`.mjs` under `design/` (**3,661**) · `ls --time-style` over `design/` and
`design/research/` for the mtime ordering in §2.1.

**External, retrieved first-hand 2026-07-27:**

- [Foundry package — World Anvil Integration](https://foundryvtt.com/packages/world-anvil) *(200 OK: didialchichi, MIT, v1.5.2, verified 14.364, repo `foundryvtt/world-anvil`, GM-only, one-way, Guild API token, permissions not preserved)*
- [Foundry — Journal Entries](https://foundryvtt.com/article/journal/) *(Pages as units, selective Show Players, Secret blocks with reveal, entry-level ownership)*
- [World Anvil News: July 2026](https://blog.worldanvil.com/newsletter/world-anvil-news-july-2026/) *(published 2026-07-09; feature toggles quote verbatim; Diplomacy Webs)*
- [World Anvil — Inline Article Creation](https://blog.worldanvil.com/worldanvil/dev-news/new-feature-inline-article-creation-on-world-anvil/) *(published 2026-01-14; names the visual editor **Plutarch**)*
- [World Anvil FAQ](https://www.worldanvil.com/faq) *(403 to fetch; sentence surfaced by search: "World Anvil's Campaign Manager is not a virtual tabletop (VTT) or a map-making software")*
- [World Anvil — Custom Statblock Templates (Codex)](https://www.worldanvil.com/w/WorldAnvilCodex/a/custom-statblock-templates) and [Guide to Custom Statblock Templates](https://www.worldanvil.com/learn/rpg/custom-blocks) *(HTML + CSS + TWIG; Grandmaster and above; "a technical advanced feature that involves coding")*
- [World Anvil — Text Editors (Codex)](https://www.worldanvil.com/w/WorldAnvilCodex/a/text-editors) and [Switch Text Editors](https://www.worldanvil.com/learn/interface/switch-editor) *(Plutarch = new visual; Euclid = advanced/BBCode; Plato = the older one)*
- [Similarweb — worldanvil.com](https://www.similarweb.com/website/worldanvil.com/) *(~1.4 M visits, 47.71 % bounce, 4.49 pages/visit, 3 m 42 s, −4.87 % MoM, #32,863 global, #16 category, US 43.38 / DE 6.34 / UK 6.1; organic search 47.06 %, desktop methodology)*
- [Semrush — worldanvil.com](https://www.semrush.com/website/worldanvil.com/overview/) *(1.77 M April / 2.38 M March / 1.63 M February; 3.33 M not reproduced)*
- [LegendKeeper pricing](https://www.legendkeeper.com/pricing/) *(200 OK: Pro $9/mo, $7.50/mo annual, $90/yr; "an unlimited number of guests can participate in your projects for free. Only the project owner needs an active subscription")*
- [Kindlepreneur — Campfire vs World Anvil](https://kindlepreneur.com/campfire-vs-world-anvil/) *(Grandmaster $12/mo, $105/yr, $650 lifetime)*
- [Rollplay — creator tools](https://www.daydreamteam.com/creator-tools) and [Rollplay](https://www.daydreamteam.com/) *(drag & drop layout, custom formulas, automated effects, dice pools, "Draft and shared versions"; no VTT, no maps; "No subscription. No account required. Works offline")*
- [Role — Patrons, Video, and Owlbear Rodeo (changelog, 2024-05-24)](https://www.playrole.com/changelog/2024-05-24-patrons-video-obr) *(OBR embedded in Role rooms; maps & tactics gated to Patrons)*
- [World Anvil — Update: Free Account Changes](https://blog.worldanvil.com/announcements/update-free-account-changes/) *(April 2024 Freeman contraction; the 42-article ceiling corroborated through WA's own support tickets)*

---

*RB-19, second pass. The synthesis exists, it read its adversary, and it wrote down the findings that
cost it — that is the audit item that mattered and it passes. The four claims the strategy stands on
all hold, and the module clause holds verbatim, which is the best single piece of external evidence in
the corpus. What fails is not the evidence and not the argument. It is the clock: the file that calls
itself the binding corpus was written last and read least, and eight minutes before it a brief on the
same disk had already measured the renderer it says nobody has measured. Gnōthi seauton is not only a
rule about numbers. It is a rule about knowing what is already in the room.*
