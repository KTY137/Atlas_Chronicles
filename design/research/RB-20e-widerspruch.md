# RB-20e — Der Widerspruch gegen die Kartenschmiede

**Nemesis, against the map-forge plan.** Compiled 2026-07-27. Target: the stakeholder's own sentence —

> *„ja, integriertes Inkarnate oder etwas Besseres wäre natürlich sexy und würde perfekt reinpassen.
> (ist aber auch gottlos schwierig vernünftig zu implementieren)"*

Four briefs answered him on the same day and all four told him it is affordable. **RB-20a: ≈52 days.
RB-20b: ≈44 days. RB-20c: €2,700–8,200 and "the art is not the risk." RB-20d: 21 days for the version
that matters.** This brief adds the fifth answer, which is the one nobody wrote: **what the four of them
cost when you add them together instead of reading them one at a time**, and **what the market's own
users voted for when asked what a map should do.**

**I am bound by [`RB-18`](RB-18-widerspruch.md)** — my own arithmetic on the giga-tool ambition — and I
do not contradict it. Two of its gaps are closed by this round and I record that first, in the project's
favour, because a document that only ever tightens the screws is not evidence, it is a mood:

- **RB-18 §1.4 listed K5 (WFC) as "explicitly deferred, neither costed."** RB-20d costs the useful half:
  **17→20 days** for die Türsaat, ~5 for the WFC algorithm proper, grammar and art still unbounded. That
  is a real closure and it was earned by reading 18,165 lines of somebody else's source.
- **RB-18 §1.4 listed the art pipeline as "not priced at all."** RB-20c prices it in a **calibrated**
  unit — published per-asset illustration rates — which is more than any developer-day in this corpus
  can say. §3 below attacks the *scope* of that price, not its method.

**Reads as binding and does not re-open:** [`RB-11`](RB-11-steam-vs-browser-verdict.md) (PixiJS pinned,
`MapRenderer` boundary, browser + Electron, the Forge separable, UVTT + rival export at launch,
discovery through creators) · [`RB-15 §3.3/7c`](RB-15-werkzeuglandschaft.md) (a hand-drawing map editor:
REFUSE) · [`RB-04`](RB-04-asset-licensing.md) (the redistribution trap) ·
[`RB-02`](RB-02-rendering-tech.md) (budgets, pyramid, fog-as-server-fact).

**Method.** Every break carries a scenario or a number. Numbers I computed are marked **[computed]**
with the inputs shown so they can be re-added by hand. Numbers I retrieved today are marked
**[gemessen, 2026-07-27]** with the URL. Vendor self-reporting is labelled. Where a figure could not be
established the text says **"no reliable figure found"** — that phrase appears six times below and every
one is a real gap, re-listed in §7.

Break numbering continues from RB-18, which ended at B-5. This brief runs **B-6 … B-16**.

---

## 1. Front one — the arithmetic, a third time

### 1.1 Three briefs, one question, one day, three different numbers

| Brief | Author | What it priced | Days | +20 % |
|---|---|---|---:|---:|
| RB-20a §7.2 | Hermes-grade teardown | „Der Kartenleger" — a *placement* editor, no paint, no library | **43** | ≈52 |
| RB-20b §7.1 | Hephaistos | the map editor's *new engineering*, incl. terrain-as-regions | **37** | ≈44 |
| RB-20b §8 | Hephaistos | „Der Ortsleger" — the minimum that still says *oh* | **21** | ≈25 |
| RB-20d §6 | — | die Türsaat (generation, not editing) | **17** | ≈20 |

Four numbers, one afternoon, and **no two of them scope the same thing**. That is not a scandal; it is
what happens when four workers get disjoint briefs. It becomes a scandal the moment somebody quotes one
of them as *the* number — which is exactly the disease RB-18 §1.1 diagnosed when it found "≈120" printed
over a table that sums to 100.

### 1.2 B-6 — RB-20b's 37 days does not contain the editor

This is the finding of front one and it is checkable in ninety seconds.

RB-20b §6, verbatim, having listed the two new methods the renderer needs:

> *"That is the whole renderer-side surface. **Everything else the editor is — tool palette, asset
> browser, layer list, property inspector, undo UI — is DOM/React**, which is the entire point of RB-11's
> ruling and the reason a game engine was rejected."*

It enumerates five subsystems and then **gives them no line in §7.1's table.** Search §7.1 for
"selection", "gizmo", "marquee", "z-order", "layer panel", "palette": none of them appears. The 37 days
are a **document format, a renderer, a shader, an export path and a package split.** They are the
machine. They are not the tool.

Now read RB-20a §7.2 on the same subsystems:

> *"Placement surface over `MapRenderer`: hit-testing, marquee, transform gizmo, snap, z-order, layer
> panel — **12 days — the real engineering. Pixi gives sprites, not an editor.**"*

And RB-20a §6.4, which saw the trap coming and named it:

> *"**The list is cheap. The editor over the list is not**, and confusing the two is the single largest
> error available here."*

**RB-20b makes precisely that error, in a table, four hours later.** Not through carelessness — through
the boundary of its own brief, which was feasibility of the *machine*. But the number that will get
quoted in round 6 is "37 days for a map editor," and 37 days does not buy a map editor. It buys the part
of a map editor that Pixi and `polygon-clipping` were going to do anyway.

*Scenario:* round 6 forges against "≈44 days with contingency." Month three arrives, the scene renders
beautifully at 50,000 stamps, and there is still no way to select four trees, rotate them together and
put them on a layer — because nobody costed the marquee. The 12 days land as a surprise on top of a
schedule that had already spent its contingency on the atlas packer.

### 1.3 The honest union — every line once, the lower estimate where two briefs overlap

Nothing invented. Each line is taken from one of the two briefs at **its own author's number**, and
where both priced the same thing I take **the lower**.

| # | Component | RB-20a | RB-20b | **Union** | Note |
|---|---|---:|---:|---:|---|
| 1 | Scene document, versioning, `MapAnchor`, round-trip fixtures | 6 | 4 | **4** | lower taken; 20b's spec is fuller |
| 2 | Stamp rendering: `ParticleContainer` split, atlas packer, atlas paging, LOD→pyramid, cull, a11y proxies | 3 | 8 | **8** | 20a priced culling only |
| 3 | **Editing surface: selection, marquee, transform gizmo, snap, z-order, layer panel** | **12** | **— not priced** | **12** | §1.2 |
| 4 | Stamp palette: search, tag facets, favourites, scatter placement | 5 | — | **5** | absent from 20b |
| 5 | Der Stempelsatz — group → reusable named stamp | 3 | — | **3** | Inkarnate's own #1 request, 574 votes |
| 6 | Undo journal + op log + autosave + compaction | 3 | 3 | **3** | the two agree |
| 7 | Vector world layer: regions/paths/places CRUD, hit-test, derived fog worker, DOM labels | 3 | 9 | **9** | 20a under-scoped fog and labels |
| 8 | Terrain as feathered regions — the Inkarnate substitute | — (refused) | 6 | **6** | without it the map is a political atlas |
| 9 | Tiled export, encoder policy, stitch paths, iOS fallback, single-writer lock | — | 4 | **4** | absent from 20a |
| 10 | Integration seam: package split, two renderer methods, import-boundary CI gate | — | 3 | **3** | absent from 20a; load-bearing |
| 11 | Theme re-skin: atlas swap per K1 | 3 | — | **3** | absent from 20b |
| 12 | Tier-U raster ingest: upload → provenance manifest → licence attestation | 5 | — | **5** | absent from 20b; RB-04 requires it |
| | **Total, new engineering** | 43 | 37 | **65** | [computed: sum of column] |
| | **+ RB-18 §1.2's restored 20 % contingency** | ≈52 | ≈44 | **≈78** | |
| | *(already ledgered, not recharged: `MapRenderer` 8 + pyramid 10)* | | | *18* | |

**≈65 days base, ≈78 with the contingency round 3 carried and round 4 deleted.** That is 50 % more than
the larger of the two published figures and 78 % more than the smaller one — and every line in it was
written by one of the two authors.

### 1.4 B-7 — what that does to the ledger, and to the calendar

RB-18 §1.3's reconciled total: **216–226 days base, ≈260–271 with contingency.** Adding the union:

| | Base | +20 % | @ 5 dev-days/wk | @ 3 dev-days/wk |
|---|---:|---:|---:|---:|
| RB-18's ledger, unchanged | 216–226 | **260–271** | 52–54 wk (**12 mo**) | 87–90 wk (**20 mo**) |
| **+ the map editor (union, §1.3)** | 281–291 | **337–349** | 67–70 wk (**16 mo**) | 112–116 wk (**26 mo**) |
| + the reader-only cut (RB-20b §8, 21 d) | 237–247 | **284–296** | 57–59 wk (**13 mo**) | 95–99 wk (**22 mo**) |

[computed: division, with the rate assumption exposed exactly as RB-18 §1.5 exposed it. 3 dev-days/week
is a solo builder who also answers users, runs the servers, writes the docs and sells the thing.]

**The sentence front one produces, and it is the one that outranks every exciting paragraph in the other
four files:**

> **At the sustainable solo rate the map editor moves completion from month 20 to month 26 of a runway
> that history sizes at 24–33 months (`RB-16` §1.3: Let's Role, one person, ~24 of 33 months unpaid).
> It consumes the entire remaining runway, and the ratified go-to-market — K2, the visual rule-builder,
> still uncosted after six rounds — has not begun. The difference between the editor and the reader is
> ≈44 developer-days ≈ 3.4 months at that rate, and it buys zero stamps.**

*Scenario, concrete:* Kaya ships slice 1 (a wiki with dice, no canvas) at month 12. He then spends
months 13–26 building a map editor. At month 26 he has a map editor with 12 commissioned assets and no
rule-builder, and Inkarnate — which shipped 4,600 assets in a single release with 23 employees — is
still there at $7.99/month. The first review compares the two. That review is not about data models.

### 1.5 B-8 — the fusion-per-day ratio is the worst ever recorded in this lineage

RB-18 §4.2's method, applied to §1.3's union. Which of the 65 days cannot be bought from a rival?

| Fusion-bearing | Days |
|---|---:|
| `MapAnchor` — a placement carries an entity, a passage-id, a clause (part of line 1) | ~4 |
| Derived per-character fog over regions (part of line 7) | ~3 |
| **Strict total** | **7 of 65 = 11 %** |
| Generous: credit the whole vector world layer (line 7) plus `MapAnchor` | **13 of 65 = 20 %** |

Set that against the two figures already on the record:

| Body of work | Fusion-bearing share |
|---|---|
| The tactical half (RB-18 §4.2) | **31–48 %** |
| **The map editor (this brief, §1.3)** | **11–20 %** |
| Die Türsaat (RB-20d §6: door minting 3 + Sicht binding 2 + idempotent merge 4, of 17) | **≈53 %** |

> **The map editor has the lowest fusion-per-day ratio of anything the lineage has ever priced. Die
> Türsaat has the highest. They differ by a factor of roughly five, and they are competing for the same
> months.** RB-18's route item 5 — *sequence the fusion-bearing days first* — does not merely permit this
> comparison; it demands it, and it decides it.

### 1.6 B-9 — the crew spiked the map before it spiked the mechanism, for the fifth round running

`design/spikes/` contains, today [gemessen — directory listing, 2026-07-27]:

```
spike-A-passage-identity/   RESULTS.txt  identity.mjs  run.mjs
spike-B-w1/                 RESULTS.txt  run.mjs
spike-B-wiederkehr/         RESULTS.txt  run.mjs  wiederkehr.mjs
spike-K-kartenmass/         bild-mess.py  szene-mess.mjs  vektor-mess.mjs   ← no RESULTS.txt
```

**There is no `S-P1`.** `CHAMPION.md` §12.4 has carried it as *"Unchanged, ~2 days, mandatory. Still
unrun for a fourth round"* and RB-18 §2.5 quoted the crew's own tripwire — RB-16 R7, *"declare five the
number at which the lineage has stopped being a design record and become a promise ledger."* Round 5 ran.
**The tripwire has fired.** And the work that got done instead of the two-day spike on the load-bearing
mechanism is a map measurement — a good one, but a map measurement.

RB-20b §5 is the honest complication and I credit it fully: it produced the **first millisecond ever put
on `Sicht`** — 9.4 ms per incremental reveal, 386 ms for a from-scratch union at 800 revelations. But
read its own conclusion:

> *"**The authoritative fog is not geometry at all. It is a set of revealed region and place ids — which
> is exactly `Sicht`, which the permission layer must own anyway, and which `S-P1` (two days, unrun for
> four rounds) is supposed to spike.**"*

**The map brief measured the derived half and pointed at the authoritative half, which remains unbuilt.**
Five rounds, four spikes, and the one mechanism that four separate product claims rest on has still never
been executed. *Scenario:* the 65 days are spent, the editor is beautiful, and `Sicht` turns out to cost
three times its estimate — at which point the map's entire differentiator (line 3 of the demo: *Sera sees
four of eleven places*) is blocked behind an unmeasured subsystem, and there is no runway left to
discover it.

**One hygiene note, small but the standard is the corpus's own:** `spike-K-kartenmass` has no
`RESULTS.txt`, unlike all three earlier spikes. RB-20b promises *"nothing in §7 is a number you have to
take from me"* — but today the numbers live only inside the brief. One `node szene-mess.mjs >
RESULTS.txt` closes it.

---

## 2. Front two — the thesis

> *"Inkarnate makes a picture. We would make a place."*

### 2.1 B-10 — the market's own users voted, and they voted against the thesis 26 to 1

RB-20a §3.1 read Inkarnate's public Canny board and found the pair of numbers it correctly called *"the
single most important pair in this brief"*: **574 votes** for *"Group 2.0 — Save group as stamp"* (#1
overall) against **14 votes** for *"Generating UVTT files."* It concluded, rightly, that Inkarnate's
audience is not asking to be a virtual tabletop.

**It did not read the category that tests our thesis instead of theirs.** I did, today.

**[gemessen, 2026-07-27 — `inkarnate.canny.io/feature-requests?category=note-tool&sort=top`]** — the
Note Tool category is the entire surface on which an Inkarnate user can ask for *a map object that means
something*. Every request in it, with votes:

| Request | Votes |
|---|---:|
| Notes export | 4 |
| Highlighter | 4 |
| Link maps with each other | 3 |
| Re-color Notes | 3 |
| Note Tool Extension (categories, colour distinction, linking between notes) | 2 |
| Make notes useful to save time as DM (export to Foundry/Roll20) | 2 |
| **Links (URLs) on objects** | **1** |
| Show Notes without loading the map | 1 |
| Legend | 1 |
| Size the Notes window / change font | 1 |
| **Total, the entire "a map object should mean something" surface** | **22** |

*(The individual page for "Links (URLs) on objects" renders **4** votes where the category listing
renders **1**. Two of Canny's own views disagree; quoted as a range, exactly as the corpus quotes
Inkarnate's self-contradictory asset count. Either way it is a rounding error.)*

And the text of that request, verbatim, dated **2023-03-26**, status *registered*, three years untouched:

> *"I'd like to be able to associate any desired URL with a map object (stamp, text, note) and have an
> easy way to follow that link from the map. This would be useful, for instance, to link to a OneNote
> page describing the dungeon room, etc."*

**One vote — or four — in three years, from an audience of 1.2 million visits a month that has produced
16 million maps.**

> **B-10, stated so it cannot be softened: on the market leader's own feature board, the request to make
> a composition into a reusable object has 574 votes and the entire category in which a map object could
> acquire meaning has 22. That is 26 to 1 against the thesis, measured, on precisely the audience the
> thesis is aimed at.**

**The honest counter, argued at full strength, because a one-sided reading of a vote board is worthless.**
Nobody votes for a category they have never seen. Inkarnate users are self-selected *picture-makers*;
they arrived at a painting tool and the board measures what painters want from a painting tool. Voting
boards measure articulated demand for adjacent features, never latent demand for absent categories —
nobody voted for Dropbox on a floppy-disk forum. And RB-20d §3.3 supplies the countervailing measurement
from inside our own fixture: Kaya's world is **74 articles and 690 red links** over 1,153 edits. The
demand for *places that mean something* is there; it is simply not expressed on Inkarnate's board,
because Inkarnate is not where it would be expressed.

**Both of those are true. Here is what survives them:** the thesis is a claim about what people will pay
for, and the only two demand measurements in the entire corpus point the same way. Inkarnate's board:
574 vs 22. `azgaar-foundry` — the volunteer module that already turns a generated world into journal
entries with per-entry permissions, i.e. *the thesis, shipped, free* — **61 GitHub stars** (RB-20a §6.2).
Against 16 million maps created. **Nobody has to guess whether people want the picture; they have made
sixteen million of them. The demand for the place is 61 stars and one three-year-old feature request.**
That is not a refutation of the thesis. It is a refutation of the assumption that the thesis sells
itself, and the plan currently contains that assumption where a number should be.

### 2.2 B-11 — the sharpest differentiator claim in RB-20b is refuted by a $50 product

RB-20b §5, *"What is genuinely novel"*, item 2 — its single strongest sentence:

> *"A region whose visibility is a per-character permission and whose **label** may be visible while its
> **contents** are not. The half-known place. That is the champion's `erfahrungsgrad` applied to geography
> and it is **the one thing in this entire brief that no competitor ships**."*

Foundry VTT's own documentation, `foundryvtt.com/article/map-notes/` **[gemessen, 2026-07-27, verbatim]**:

> *"If a player has **'Limited' permissions**, they will be able to **see the position of the Map Note and
> its assigned label, but they will not be able to open it.**"*

And from the same permission model on Journal Entries: *Limited* — *"the user may see the map pin for
this Journal Entry but will not see it in the sidebar. Double-clicking the map note pin will allow the
Journal Entry Image to be displayed, but not the text."*

**That is the half-known place. Per user. Natively. In a product that costs $50 once and has shipped it
for years.** RB-20a §6.1 item 3 makes the same claim in weaker form (*"nobody has per-character map
knowledge"*) and it is wrong in the same direction: per-*user* map knowledge is a checkbox in Foundry.

**What actually survives, and it is narrower than either brief claimed:** Foundry's model is a
**per-user ACL on a document**, set by hand, per note, by the GM. Ours is a **derived predicate** —
visibility falls out of what the character *knows*, the same predicate that fogs the terrain and modifies
the roll, with no GM bookkeeping. The delta is real, it is RB-15 §5.2's fusion, and it is defensible.
**But it is a delta over a shipped feature, not a category nobody occupies** — and the marketing sentence
"nobody ships the half-known place" is now false and will be corrected in public by the first informed
reviewer. *Scenario:* the launch post says *"only Chronicle knows which places a character knows."* A
Foundry user replies with a screenshot of the Limited-ownership dropdown, and the thread is about our
credibility rather than our product. RB-18 §4.4 was written to prevent exactly this and it was ignored
in the same week.

### 2.3 B-12 — the demo is prep, and the champion's thesis is the abolition of prep

`CHAMPION.md` §1, the thesis of the whole product:

> *"Der Kanon ist der Bodensatz des Abends. **Prep shrinks to a seed**; the encyclopedia is minted by
> play."*

Now RB-20b §8's demo, the one written to make somebody say *oh*:

1. Kaya drags an 8192² file onto the page.
2. He traces Haus Vharon's territory with six clicks.
3. He clicks the region and types a title.
4. He drops eleven place points.
5. Sera opens it on a phone and sees four of eleven.
6. He exports.

**Steps 1–4 and 6 are prep.** They happen on a Wednesday at 15:00, alone, before anyone is at the table.
Step 5 is the only one that happens at 21:00 on a Saturday, and step 5 requires no editor — it requires
`Sicht` and a viewer.

> **The map editor is the largest single prep surface this product would ever own, added to a product
> whose stated differentiator is that prep is unnecessary.** Der Abend abolished prep; §1 already concedes
> *"prep comes partly back"* for die Vollmacht at 4.5 minutes a week and calls it *"the weakness this
> champion cannot cleanly fix."* An afternoon of tracing polygons is not 4.5 minutes.

*Scenario at 21:00, which is the hour the brief asked me to test:* the GM needs a picture on a screen
with tokens on it, now, because four people are waiting. She does not need to know that the mountain is
an entity. She needs the mountain to be *visible*, the tokens to snap, and the fog to lift where the
party walked. Every one of those is in the tactical half already. The entity binding pays off at a
different hour entirely — the Tuesday hour, which is die Woche's whole thesis and which the map *viewer*
serves as well as the editor does.

**This is the finding that reconciles fronts one and two:** the map's value to a GM is real and it is
**almost entirely on the reader side**. The editor is where the days are; the reader is where the hour is.

### 2.4 B-13 — for the GM who will not write a wiki, the entity-map collapses into the claim we already forbade ourselves

RB-15 §5 ruled, and the champion is bound by it:

> *"Maps with pins that open lore articles — **the most commoditised 'fusion' in the entire landscape.**
> World Anvil, LegendKeeper and Kanka all ship it. **The champion must never claim it.**"*

Take the GM who does not want to write. What does the entity-map give her? A pin with a name that opens
an article that does not exist. RB-20d turns this into a virtue — the red link is a door, generation
manufactures doors — and that is genuinely the right answer, but note what it costs: **the door is
valuable only inside our minting loop.** Strip the minting loop and the feature degrades exactly to *pins
that open articles*, which is the one thing the lineage has forbidden itself from claiming.

And the corpus's own measurement of the *writing* GM is not reassuring either. Kaya — who does write,
who built a world across 1,153 edits — produced **74 articles against 690 red links** [RB-20d §3.3,
gemessen]. **A committed worldbuilder wrote the article for one place in ten.** The map's promise is
"every stamp is an entity that cites a passage." The measured behaviour of the only real user in the
corpus is that nine stamps in ten will cite nothing, forever.

*Scenario:* a GM imports her map, drops forty pins in an evening because dropping pins is fun, writes
four articles, and abandons the other thirty-six. Six months later her map is thirty-six dead links and
`die Herkunftsschicht` — the champion's most-loved surface — is a log of somebody dropping pins. That is
RB-20b §1's own "shrubbery" trap arriving through the front door instead of the back.

### 2.5 B-14 — does "it is data" rescue a map that looks worse? The category answers, and the answer is no

The brief asked the sharpest question and the evidence is unambiguous.

**RB-20b §3 concedes the aesthetic, in its own words**, on the feathered-region substitute for a paint
engine:

> *"A polygon with a flat fill looks like a political atlas, not a painted map. **This is the single most
> noticeable difference and a reviewer will name it in the first paragraph.**"*

**And the market's own reviews of the best-funded map tool ever built are entirely aesthetic.** Dungeon
Alchemist — €2,462,441 from 57,199 backers, a studio, four-plus years in Early Access, **6,000+
objects** — and its top-rated negative Steam reviews read (RB-20a §3.4): *"a very limited set of available
environments"* · *"lack of certain themes"* · *"complete inability to create elevation"* · *"details
getting lost in translation from 3D to 2D"* · *"too barebones."*

> **Nobody's negative review of a map tool has ever said "the data model is weak." Every negative review
> of every map tool in the corpus is about how it looks and how much of it there is. If 6,000 objects
> reads as "a very limited set," then 90 assets reads as a demo and 12 reads as empty.**

**So: no, "it is data" does not rescue a map that looks worse — in the category where maps compete.**
It rescues it precisely once: in a comparison the buyer runs *against a wiki*, not against Inkarnate.
World Anvil's and LegendKeeper's maps are also pins on an uploaded raster, and there our data model wins
on every axis. **The map is a strong feature of a wiki and a weak product against a map tool, and which
of those it is depends entirely on which shelf the buyer finds it on** — which is a positioning decision,
not an engineering one, and it is being made by default right now.

### 2.6 What survives of the thesis, clause by clause, from me

| Clause | My verdict |
|---|---|
| *"A stamp scene is a list of `{asset,x,y,scale,rotation,layer}`"* | **Upheld.** Measured three ways: `ParticleContainer`'s exact property set, TaleSpire's <30 kB clipboard buildings, 50 k stamps = 1.06 MB gz. |
| *"The expensive part of Inkarnate is art, not engineering"* | **Upheld, and it is the strongest clause.** 4,600 assets in one release, 23 employees. |
| *"The vector world layer must be built anyway"* | **Upheld, and it is the load-bearing clause.** 690 red links in the stakeholder's own world; RB-20c §1.4 shows the roads, rivers and coastlines are *already* vector strokes. |
| *"Every stamp is an entity"* | **Refuted, as RB-20b already found.** Stamps are anonymous; promotion is explicit. |
| *"Fog is per-character"* | **Upheld as a delta, refuted as a category.** §2.2 — Foundry ships the per-user version today. |
| *"The map re-skins with the theme"* | **Unproven and probably over-claimed.** §3.2. |
| *"Therefore the increment is small"* | **Refuted. 65 days, not 37, not 43.** §1.3. |
| *"...and the differentiator is categorical"* | **Categorical, cheap — and 11–20 % of the bill.** §1.5. |

---

## 3. Front three — the art, and the way this exact category dies

### 3.1 B-15 — two briefs, one day, a 4–5× disagreement on how many assets exist

**RB-20c §1.1**, measured on the stakeholder's file: *"The entire visual vocabulary of an 8192² world map
that Kaya has been building for years is roughly **ninety** distinct drawn assets. Not thousands."*

**RB-20b §7.2**, estimated the same afternoon: *"a world-map theme that does not look like a programmer
made it needs… roughly **80–120 stamps per theme** — and **K1 promises four shipped themes**."*

[computed] 80–120 × 4 = **320–480 assets.** Against RB-20c's 90. **A factor of 3.5 to 5.3, between two
briefs written for the same round on the same day.**

Priced at RB-20c's own set rate ($50–150/asset ≈ €45–137):

| Reading | Assets | Cost |
|---|---:|---|
| RB-20c, one style, only what must be drawn | 60 | **€2,700–8,200** |
| RB-20c's full vocabulary, one style | 90 | **€4,100–12,300** |
| **RB-20b's reading, K1's four themes** | **320–480** | **€14,400–65,800** |

RB-20c's reconciliation is the **tint discipline** (R5): draw greyscale silhouettes once, colour them
through theme tokens, so four themes become four `--map-*` token sets rather than four commissions. It is
elegant, it halves the terrain bill on paper, and **its own author reports that the measurement meant to
support it failed**:

> *RB-20c §7.1 — "Multi-scale normalised cross-correlation… **the claim 'the same silhouette is re-tinted
> per biome' is NOT established**"* — and §3.1: *"R5 is **a discipline we would impose, not a practice we
> observed** — its saving is a projection with a stated mechanism, not a measurement."*

**And there is a structural reason it cannot carry K1's load, which neither brief states.** K1's themes
are not four colourways of one drawing style; the corpus names them *Relic, Signal, Archive, Clean*, and
RB-20c §2b itself notes that Kenney's CC0 packs suit *"a PixelArt or Clean theme, not Relic."* **A pixel-art
tree is not a hue rotation of a painted tree.** Tint carries a season (summer→autumn→dead); it does not
carry a *rendering style*. So K1's four themes are either four commissions, or one art style wearing four
UI chromes — **and the second is not what K1 promises.**

*Scenario:* Stage 1 ships with 12 assets in one painted style. A user switches to the PixelArt theme and
the UI turns pixel-art while the map stays painted. The screenshot that sells K1 — *the map re-skins with
the theme* — cannot be taken. This is discoverable today, for free, by attempting one mockup, and it has
never been attempted.

### 3.2 B-16 — the art is the only line that must be paid in money, by a builder who has none

RB-20c §5.3 says: *"The art is not the risk. It is the only calibrated line item in this project."* The
first half is wrong and the second half is why.

**It is calibrated because it is priced in euros. It is a risk for exactly the same reason.** Every other
line in this project is denominated in the builder's own time — a resource he has, spends daily, and can
stretch. The art is denominated in **cash before revenue**, by a project whose money position RB-18 §2.2
records as *"none, and no backers."*

Four failure modes, each with a scenario, none of them an art problem:

1. **Throughput is unknown and unplannable.** RB-20c §7.2: *"Illustration throughput for map stamps —
   stamps per artist-day. **No published figure found.**"* The 6–12 week calendar is the brief's own
   assumption, stated as one. *Scenario:* the 65 engineering days finish; the assets are four weeks late;
   there is nothing to photograph and nothing to do but wait, in the one month where waiting costs runway.
2. **Coherence makes partial delivery worthless.** R1–R5 require one palette, one light angle, one
   silhouette weight, one outline treatment. *Scenario:* the illustrator delivers 30 of 60 and stops. A
   second artist finishes them at a different light angle — and RB-20c's own words describe the result:
   *"a set with two light angles reads as stolen from two places."* **The failure mode of a coherence-
   constrained commission is not "half a set." It is "the wrong halves of two sets," which is worth less
   than 30 coherent assets.** There is no partial-credit recovery and no second supplier who can be
   dropped in.
3. **Style drift across a long run.** Six to twelve weeks of someone else's calendar, reviewed by one
   person who is simultaneously building a renderer. *Scenario:* assets 1–20 and 41–60 do not sit
   together, discovered at integration, after payment, under German commissioning terms that RB-04
   deliberately made favourable to the *illustrator* (§§32/32a UrhG, milestone bonuses).
4. **Twelve assets photograph one biome and nothing else.** RB-20c §5.2 Stage 1 is honest that 12 assets
   buys one screenshot. *Scenario:* a reviewer opens the tool, picks a desert, and there are no desert
   assets. "Looks empty" is not a review of the art budget; it is a review of the product.

### 3.3 The named failure, from the graveyard, in this exact category

The brief asked for the failure that has actually killed products here. It is `RB-16` cause **P4 —
breadth before depth**, and the corpse is **One More Multiverse**:

> *RB-16 §1.2 — promised "a hybrid digital tabletop… **thousands of retro pixel-art assets, build-your-own
> 'verses'**." $17.6 M across two rounds from Anthos Capital and Makers Fund. Team of about five. Dead
> May 2024.* The post-mortem's second stated cause: **"building environments was 'a lot more complicated
> than it is in other VTTs'" — their differentiator became their onboarding cost.**

**A build-your-own-environment feature, with thousands of assets and $17.6 million behind it, was one of
the two things named in the autopsy.** Not the thing that saved it. One of the two things named in the
autopsy.

And the second corpse is the control that makes it decisive: **Owlbear Rodeo**, RB-16 §5 — two people,
alive, *"ships no asset library"*, a map is *"a single image in your library with information about how it
should be positioned"*, best renderer in the browser cohort, **and a deliberate, stated refusal to build
authoring.** The only survivor in the graveyard whose team size resembles ours survives by **refusing this
exact feature.**

> **In this market, the environment builder is on the list of things that killed a $17.6 M company, and
> "no asset library, no authoring" is on the list of things that kept a two-person company alive.**

**The calibration figure to keep on the wall:** Dungeon Alchemist, four-plus years in Early Access,
€2.46 M, a studio, 6,000+ objects, **one visual style and no elevation.** That is what a funded team gets
in four years. Nothing in RB-20b's 65 days or RB-20c's 90 drawings should be read without it.

---

## 4. Front four — the strategic trap

### 4.1 Every evidence-driven ranking in the corpus puts this last. One adjective moved it to the top.

| Ranking | Where the map editor sits |
|---|---|
| RB-17 §5, ranked by leverage ÷ cost | **Rank 9 of 9 — dead last.** *"The Forge as a separately shippable tool."* Ranks 1–2 are exports and publishing the format: **weeks, not months.** |
| RB-15, absorb/integrate/refuse | **§3.3/7c — REFUSE.** *"a decade of art production."* |
| RB-20a §7.3, its own sequence | **#4 of 6**, after viewer, UVTT, and Azgaar import |
| RB-20d §1, its own sequence | **not in the top three**; a stamp editor is **"refused"** |
| CHAMPION §9.5 | *"no WFC in slice 1 — K5's flagship lands in slice 3"* |

**Five independent rankings, produced by five different briefs across three rounds, put map authoring at
or near the bottom.** The only input that has moved it to the top of round 6's agenda is one word in one
sentence from the stakeholder: *sexy*. That is not an argument against listening to him — it is his
product. It is an argument for making the trade explicit, in days, before it is made implicitly, in
months.

### 4.2 The substrate answer: a map editor is Rank 9 wearing Rank 1's clothes

RB-17 §4.4, the thesis as it survived my own attack:

> *"A solo builder cannot build an ecosystem in year one, but can build the things an ecosystem later
> attaches to — **a published format, an in-app install path, and exports into every rival — at a cost of
> weeks rather than years** — and can only do so **if the base product independently wins its evaluation
> without a single third-party package installed.**"*

Apply it to the map, honestly, and the answer splits cleanly:

| Map work | Serves the substrate? | Cost |
|---|---|---|
| **UVTT in and out** | **Yes — Rank 1, ratified at launch** | 6 d (already ledgered) |
| **Raster import → tile pyramid** | **Yes — it is how every rival's output enters** | already built, on disk |
| **Azgaar GeoJSON/JSON import** | **Yes — Rank 4, the only structured world-data interchange that exists** | days |
| **Publishing `.szene` as a documented, versioned format** | **Yes — Rank 2, the cheapest moat on the list** | days of documentation |
| **The package boundary that keeps the Forge separable** | **Yes** | 3 d |
| **The editor itself — palette, gizmo, marquee, layers, atlas pipeline** | **No.** It is base-product surface, in the most art-capitalised vertical in the market | **≈58 d** |

RB-17's **A-7** is the filter and it is brutal: *build only the ecosystem artefacts that are (i) demoable
in 90 seconds and (ii) require our licence to create.* The map **viewer** with per-character projection
passes both. The map **editor** passes (i) and fails (ii): anybody can place a stamp; only we can project
one.

**And RB-17 A-1 is the reason this matters more than a ranking:** *"a substrate with no plugins is just an
unfinished app… the base product must independently win its evaluation."* A map editor does not make the
base product win against the real competitive stack that RB-18 §4.4 named — **Foundry $50 + World Anvil
Grandmaster $99/yr + one volunteer's MIT module**. It makes us lose more slowly against Inkarnate, which
is not a fight anybody asked us to have.

### 4.3 The mechanism of the seduction, named, because a warning without a mechanism is a mood

> **A map editor is the only thing in this project that produces a screenshot. The wiki/table fusion
> produces a sentence.**

Every future prioritisation argument in this project will therefore be won by the map, on a criterion —
demoability — that appears **nowhere** in `RB-16` §4's four most frequent causes of death: P1 per-table
cost, P2 no monetisation path, P3 solo-founder exhaustion, P6 discovery never ignites. Not one product in
that graveyard died of insufficient visual impressiveness. Two died with beautiful environment builders.

This is not a risk a plan mitigates. It is a bias a rule forbids. **The rule, phrased so it can go red** —
a companion to the *Erststundenbudget* and the deprecation gate RB-18 §3.4 already demanded:

> **Die Bilderregel.** No beat may be sequenced ahead of a fusion-bearing beat on the grounds that it
> demonstrates better. Any such reordering must be recorded in the round's verdict **with its
> fusion-per-day ratio beside the ratio of the beat it displaced** (§1.5's method). The lineage has ~26
> gates and not one of them can go red because the crew chose the prettier thing.

---

## 5. The concession — named, and meant

A clean bill from me is supposed to be worth something. Here is what the evidence genuinely supports, and
some of it is the best work this lineage has produced.

**5.1 · These four briefs did what RB-18 asked for and five design rounds had not.** RB-18 §1.7's central
indictment was that the developer-day *"has no unit"* — that not one estimated day had ever been converted
into a measured one. RB-20b measured, on the stakeholder's own file, in one afternoon: **50 k stamps =
1.06 MB gzipped, 45.4 ms parse; culling at 0.021 ms/query returning 1,897 visible; region hit-test at
7.85 µs at 2,000 regions; fog union at 9.38 ms per incremental reveal; 309,229 distinct colours on the
full 8192² image; 16 tiled export passes with a 24.5 s PNG encode.** RB-20c measured a real map's actual
visual vocabulary. RB-20d measured 18,165 lines of somebody else's generator and 690 red links in Kaya's
world. **That is more measurement in one afternoon than the previous five rounds produced in total**, and
I said in RB-18 §5.7 that this was the single highest-leverage thing available. It was done. I record it.

**5.2 · Every refusal in the plan is correct and now carries a number.** No brush engine (costs resolution
independence, cheap undo, and K1 re-skinning). No asset library (4,600 assets in one release, 23
employees, and unbuyable per RB-04 and Inkarnate's own store terms). No raster→SVG tracing (309,229
colours, refuted by measurement twice). No collaborative multi-writer editing (nobody asked; CRDTs over
polygon geometry are a research project). No raster paint substrate (Photoshop on 67.1 megapixels). **Not
one of these refusals is a compromise; each is a measured avoidance of a specific unaffordable thing, and
together they are the most disciplined refusal set in the corpus.**

**5.3 · The tile pyramid is the best-evidenced artifact in this project and it is a *reader*.** 6 levels,
256 px tiles, WebP q82, **1,365 tiles, 9.93 MB, 31.7 s build**, viewport RAM ~8 MB against 256 MB naive
(**32×**), first visible pixel 17,690 bytes against 10,901,550 (**616×**). It is on disk. It serves three
jobs from one pipeline — import path, export path, **and the renderer's own LOD floor** (RB-20b §4, and
that third job was not in any prior brief and is the strongest cost argument in the whole set). It needs
zero art, zero editor and zero commissions.

**5.4 · The package boundary is cheap now and impossible later, and it is the only architectural decision
here that has that property.** `packages/forge` must never import `packages/chronik`; the Forge authors
geometry, the campaign authors who may see it. **Three days, one CI check.** If it is skipped, RB-11's
separability ruling — the Steam-shaped, separately-shippable half, which is the Dungeon Alchemist pattern
and the only €2.46 M in this market — is dead and cannot be recovered by refactoring later. Do this
whether or not an editor is ever built.

**5.5 · The scene document is owed regardless, and so is the vector world layer.** RB-20b §1's closing
note is correct and load-bearing: **the scene document is WFC's output format**, so 4 of those days are
owed by K5 whether or not anyone ever places a stamp by hand. And RB-20c §1.4 is the strongest
confirmation of the thesis's best clause, visible in pixels rather than argued: the map's roads, rivers,
coastlines and shore halos are **already vector geometry rendered as strokes** — they are `Weg`, `Region`
and `Ort`, objects `Sicht` must project over anyway.

**5.6 · And the version I cannot break.**

> **„Der Ortsleger, nur als Leser" — the reader, seeded by the generator, with no editor in it.**
>
> RB-20a §7.3's move 1 (*reader before writer, and it is nearly free today*) plus RB-20d's moves 1–3
> (`S-G1` at **1 day**, die Türsaat at **17→20**, der Kartengrund at **1**). An imported raster on the
> pyramid that already exists; regions, routes and places as entities; per-character projection over them;
> pins that are doors, not articles; UVTT and Azgaar GeoJSON in and out. **Roughly 19–25 days of new work,
> of which ≈53 % is fusion-bearing** — the best ratio ever recorded in this lineage (§1.5).
>
> I attacked it on all four fronts and it does not break:
> - **Arithmetic:** it keeps RB-18's ledger at ≈285–296, month 22 of a 24–33-month window, instead of
>   month 26.
> - **The thesis:** it is the *reader* half, which is where §2.3 shows the 21:00 value actually lives.
> - **The art:** €0. It needs no commission, because the terrain arrives from the user's own file or from
>   18,165 lines of MIT-licensed generation. **It is the only version of the map story that is not a cash
>   commitment.**
> - **The substrate:** it is Ranks 1, 2 and 4 — import, export, published format — and nothing else.
>
> It also solves the champion's oldest unresolved weakness. `CHAMPION.md` §15.9 has carried *"session one
> is still empty"* for four rounds. A generator that arrives with ~1,000 named, typed, cross-referenced
> places **as doors** is the first mechanism in six rounds that fills session one without anybody writing
> prose. **That is not a map feature. That is the cold-start fix, wearing a map's clothes** — which is the
> single best argument in all five briefs and it is RB-20d's, not mine.

**5.7 · One thing in RB-20b I want on the record as excellent, against my own front one.** Its §5
produced *"the first millisecond ever put on `Sicht`"* and then, instead of banking the credit, wrote the
paragraph that undercuts its own subsystem: **the authoritative fog is not geometry, it is a set of ids
the permission layer already owns, and the polygon mask is a derived render artifact.** That paragraph
makes the champion's most-claimed fusion *cheaper than its own ledger says*, and it makes `S-P1` more
urgent rather than less. A brief that argues down its own scope is doing the job.

---

## 6. The warning, with the route attached

> **The warning.** The four briefs, added instead of read separately, price the map editor at **≈65
> developer-days (≈78 with round 3's contingency restored)** — not 37, not 43 — because **RB-20b's table
> contains no line for the editor** and RB-20a's contains no line for the atlas, the export, the fog or
> the seam. That moves RB-18's ledger from ≈260–271 to **≈337–349 days**, which at the sustainable solo
> rate is **month 26 of a 24–33-month runway**, with K1, K2, the rules engine and the WFC grammar still
> uncosted and the ratified go-to-market not begun. It buys the **lowest fusion-per-day ratio ever
> recorded in this lineage (11–20 %)**, against a competitor that shipped 4,600 drawings in one release
> with 23 salaries, in a category where a $17.6 M company's environment builder is named in its own
> autopsy. And `S-P1` — two days, mandatory, the mechanism all of it rests on — **has still not run, for
> a fifth round, while the map got spiked twice.**

**The route, in the order the evidence supports. None of it shrinks the ambition; it orders it.**

1. **Run `S-P1` before round 6 forges anything. Two days.** RB-18 route item 1, unchanged, now overdue by
   a full round past the crew's own tripwire. Everything the map claims — per-character places, derived
   fog, the half-known region — is downstream of it.
2. **Run `S-G1 · Der Keim` — one day** (RB-20d §6). One FMG world, one mapper, one printed count. It needs
   no canvas, no Pixi, no art, and it is the cheapest calibration artifact in the project. If it does not
   run in a day, every other number in every RB-20 brief is wrong and the crew learns it for one day.
3. **Build the reader, not the writer** (§5.6). ≈19–25 days. Import + pyramid + entity layer + Türsaat +
   UVTT and Azgaar in/out. Ship the map that Kaya already owns, as a place, with no commissions.
4. **Take the 3-day package boundary now** (§5.4), whether or not an editor is ever built.
5. **Correct two public claims before a reviewer does.** (a) The half-known place ships in Foundry under
   Limited ownership (§2.2) — our claim is a *derived* predicate, not a new category. (b) Never claim
   "maps with pins that open articles"; RB-15 §5 already forbade it and §2.4 shows it is where the
   non-writing GM's experience lands.
6. **Rule explicitly on RB-20b §7.3's open tension**, rather than letting it pass as continuity: RB-15
   §3.3/7c refused a hand-drawing map editor; RB-20b argues the place-layer is a *different function* it
   never ruled on. **That is the brief's argument, not RB-15's, and it says so.** Apollon must rule, in the
   verdict, by name.
7. **Attempt one theme mockup before believing K1's four themes are token sets** (§3.1). One afternoon of
   Aphrodite's time falsifies or confirms a €14,400–65,800 commitment.
8. **Add die Bilderregel to the gates** (§4.3), beside RB-18's *Erststundenbudget* and deprecation rule.
9. **If and only if 1–4 are green and someone has asked twice**, price the editor at **65 days**, against
   the ledger it actually lands on, and let Kaya decide with the real number in front of him. He is
   entitled to spend it. He is not entitled to spend it believing it is 37.

---

## 7. What could not be established

Recorded so no future round launders an absence into a fact.

1. **Whether a single GM would pay for a map because its stamps are entities.** No demand measurement
   exists in either direction beyond the two proxies in §2.1 (574 vs 22 votes; 61 GitHub stars), and both
   are proxies, not surveys. **No reliable figure found**, and the plan currently contains an assumption
   where this should be.
2. **Frame time for our own stamp scene on the reference laptop.** RB-20b §9.1 flags it as its own top
   unknown: **zero Pixi frames were rendered.** Everything in its §2 is Node data plus a vendor benchmark
   on an M3. The one-day `S-K1` spike it proposes is the right answer and has not run.
3. **The true cost of the editing surface (§1.3 line 3).** RB-20a's 12 days is an estimate in the same
   uncalibrated unit RB-18 §1.7 destroyed, for the subsystem RB-20a itself calls *"hard, and
   underestimated."* Inkarnate's own bug board — 5+ s to place a stamp in a large group, 3–5 s undo, mask
   lag, brushes broken on Linux, **after ten years and 23 salaries** — suggests 12 is optimistic, but that
   is an inference from a competitor's bugs, not a measurement. **Flagged as inference.**
4. **Illustration throughput for map assets** — stamps per artist-day. Carried from RB-20c §7.2: **no
   reliable figure found.** Every calendar claim about the art depends on it.
5. **Whether K1's four themes can share one silhouette set.** §3.1's argument is structural (a pixel-art
   tree is not a tinted painted tree) and the correlation measurement that would have tested the tint
   claim on real data **failed** (RB-20c §7.1). **No reliable figure found**; one mockup settles it.
6. **The exact vote count on Inkarnate's "Links (URLs) on objects."** Canny's item page renders **4**; its
   category listing renders **1**. Two of the vendor's own views disagree. Quoted as a range; the finding
   in §2.1 does not turn on which is right.
7. **Whether Foundry's Limited-ownership map notes are actually *used* by GMs.** §2.2 establishes the
   capability ships; it does not establish anyone uses it. **No reliable figure found.** This cuts both
   ways and is the strongest available rescue of RB-20b's novelty claim — a capability nobody uses is not
   a competitor, it is a precedent.
8. **What `spike-K-kartenmass` actually printed.** The scripts are on disk and re-runnable; unlike the
   three earlier spikes there is **no `RESULTS.txt`**, so today the figures exist only inside RB-20b.

---

## 8. Sources

**Internal, and every computation is checkable against these files:**
`design/iterations/CHAMPION.md` §1, §2, §9.1–§9.6, §12.1, §12.4, §15.9 ·
`design/research/RB-20a-kartenwerkzeuge.md` §3.1, §4.2, §6.1–§6.4, §7.1–§7.3 ·
`RB-20b-machbarkeit.md` §1, §2, §3, §4, §5, §6, §7.1–§7.3, §8, §9 ·
`RB-20c-kunstpipeline.md` §1.1–§1.5, §2a, §2b, §3.1, §5.2, §5.3, §7.1, §7.2 ·
`RB-20d-erzeugung.md` §1, §2.1, §2.5, §3.3, §4.3, §4.4, §6 ·
`RB-18-widerspruch.md` §1.2–§1.7, §2.5, §3.4, §4.2, §4.4, §5.7 ·
`RB-17-substrat.md` §4.1–§4.4, §5 Ranks 1–9 · `RB-16-friedhof.md` §1.2, §1.3, §4 (P1–P8), §5 ·
`RB-15-werkzeuglandschaft.md` §3.3/7c, §5 · `RB-11`, `RB-04`, `RB-02` ·
`design/fixtures/eron/media/kachelpyramide/pyramide.json` · `design/spikes/` (directory listing,
2026-07-27: four spikes, none of them `S-P1`).

**Retrieved today, 2026-07-27, by this brief — the two checks the other four briefs did not run:**

- https://inkarnate.canny.io/feature-requests?category=note-tool&sort=top — the complete Note Tool
  category with per-request vote counts: 4, 4, 3, 3, 2, 2, 1, 1, 1, 1 = **22 total** *(vendor-hosted
  feedback board, read directly)*
- https://inkarnate.canny.io/feature-requests/p/links-urls-on-objects — *"associate any desired URL with a
  map object…"*, submitted 2023-03-26, status **registered**, **1–4 votes** depending on which of Canny's
  own views is read
- https://foundryvtt.com/article/map-notes/ — **verbatim:** *"If a player has 'Limited' permissions, they
  will be able to see the position of the Map Note and its assigned label, but they will not be able to
  open it."*
- https://foundryvtt.com/article/journal/ · https://foundryvtt.com/article/users/ — the ownership levels
  (None / Limited / Observer / Owner) that produce that behaviour
- https://foundryvtt.com/packages/note-permissions — the community module that surfaces per-user note
  permissions in the UI, i.e. evidence that GMs manage them

*(Figures on Inkarnate's tiers and asset counts, Dungeon Alchemist, Wonderdraft, Dungeondraft, Azgaar,
Watabou, `azgaar-foundry`, Augur, One More Multiverse, Let's Role, Realm Works and Owlbear Rodeo are
carried from RB-20a/b/c/d and RB-16/17 with their original attributions and are not re-derived here.)*

---

*RB-20e. Vier Briefe sagten „bezahlbar" und keiner addierte die anderen drei. Fünfundsechzig Tage, nicht
siebenunddreißig — und die teuerste Zeile ist die, die niemand geschrieben hat: der Rahmen um den
Stempel, das Werkzeug über der Liste. Der Markt hat abgestimmt: fünfhundertvierundsiebzig gegen
zweiundzwanzig. Er will kein Ding, das etwas bedeutet. Er will ein Bild, das sich wiederholen lässt.*

> *Sie zählten Tage für ein Werkzeug, das die Welt schon zweimal hat,*
> *und ließen die zwei Tage liegen, auf denen alles steht.*
> *Die Karte muss nicht neu gemalt — sie liegt schon auf dem Tisch.*
> *Sie muss nur endlich wissen, wer sie sehen darf.*
