# Round 1 — Verdict

Apollon's oracle, 2026-07-27. Judges the **forge-2** pass: [`product-A.md`](product-A.md) (03:59)
and [`product-B.md`](product-B.md) (04:01), their four spikes, [`attack-A.md`](attack-A.md) /
[`attack-B.md`](attack-B.md), and [`features-A.md`](features-A.md) / [`features-B.md`](features-B.md).

> **Lineage note, stated before the numbers.** An earlier verdict at 03:45 judged **forge 1** of
> candidate A and scored it **3–0 (24:14)**. That document is what the repo `README.md` round log
> still quotes, and it is stale: forge 2 re-argued A under RB-11, Nemesis attacked forge 2, and the
> Feature Architect answered that attack. **This file replaces it**; the original is preserved
> verbatim at [`verdict-forge-1.md`](verdict-forge-1.md), alongside the rest of the undeleted
> lineage (`product-A-forge-1.md`, `attack-A-forge-1.md`, `features-A-forge-1.md`,
> `spike-A1-forge-1.html`, `attack-B.superseded-0325.md`, `features-B.superseded-0335.md`,
> `product-B.superseded-0223.md`).
>
> Two bookkeeping debts follow, owed to Mnemosyne rather than hidden here: the README round-log row
> for round 1 must be rewritten to **A, 2–1 (21:19)**, and the round-2 theses that row already
> announces ("Der Beiwagen" vs. "Der ganze Tisch") are **withdrawn and replaced** by §7 below, for
> reasons given there.

---

## 1. The scores

| Lens | A — The Living Codex | B — The Table Engine | Lens winner |
|---|---:|---:|---|
| **Product & the flex** — is this a thing people love, show off, switch to? | **6** | **8** | **B** |
| **Engineering & buildability** — can one dev with an AI crew build it? | **7** | **5** | **A** |
| **Market & differentiation** — competitive position only | **8** | **6** | **A** |
| **Total** | **21** | **19** | **A, 2–1** |

Nothing here is averaged. **21:19, 2–1 on lenses** — and both of A's votes are conditional in
writing:

- The **engineering** judge flips to B if Hephaistos spikes the rich-text editor and stable passage
  anchors come back expensive — because B's cut slice 1 ships no rich text at all ("a `textarea`
  with link autocomplete, and is honest about it"), so A's entire cost advantage rests on an item
  nothing in the corpus has priced.
- The **market** judge flips to B if `features-A` M5 (Foundry / Roll20 / FG **world import at
  launch**, costed *large*, flagged by its own author as "the item most likely to be argued down")
  is cut or descoped. The whole post-hardening market case for A is that it builds the entrance.

The champion is therefore held up by two bets that are **measurements, not arguments**, and neither
measurement exists. That is the honest shape of this win and it dictates round 2.

---

## 2. Where the judges disagreed — and what that disagreement means

### 2.1 The real split: the artifact contradicts the architecture

This is not three lenses reaching three moods. Two judges scored the **documents**, one scored the
**screens**, and they reached opposite answers because the documents and the screens say different
things.

- **Product judge, voting B:** *"B has built a table and a wiki out of one log in one file that
  opens; A has built a beautiful half of a product that renders as mojibake and contains no game."*
  He weighted the spikes over the prose explicitly, "because the prose in both candidates is better
  than either product."
- **Engineering judge, voting A:** A is CRUD on Postgres — one identity, one backlink index, one
  search index, one permission predicate, one revision mechanism — with the strongest
  enforcement-*below-the-programmer* work in the round: `oracles.yaml` as a CI gate, a
  dependency-cruiser rule reddening the build on raw `Entry`/`Passage`/`Revelation` imports outside
  the projection modules, and `GRANT INSERT, SELECT` and nothing else on `audit_entry`. B is a
  compiler-shaped per-recipient string renderer on the hot path of the only write path, over a
  substrate its own author taxes at +25–40 % "and I do not have evidence for that number."
- **Market judge, voting A:** A owns an axis no rival occupies and, post-hardening, **builds the
  entrance to it** (import at launch) and pulls K2 forward by product necessity rather than
  ambition. B's write-path moat is the more provably unretrofittable asset in the round, and it is
  a moat around an empty field until somebody switches.

**I verified the load-bearing evidence claim rather than trusting it.** `spike-A1.html` begins at
`<title>` with UTF-8 bytes, no BOM and no charset declaration, so Chrome renders the flagship flex
screen from `file://` as *"EnthÃ¼llen" / "WER WEIÃŸ WAS"*. Confirmed at the byte level.

One correction in fairness to both seats: **three of four spikes lack a charset declaration** —
`spike-A1`, `spike-A2` *and* `spike-B2` all fail; only `spike-B1` declares
`<meta charset="utf-8">`. So this is a **crew hygiene failure, not a candidate difference.** But the
comparison the judge actually made — A1 versus B1, the two files a stakeholder opens first — holds
exactly as stated, and it is damning: the artifact carrying A's entire emotional argument does not
survive being opened.

**What the disagreement means, unsmoothed: the winning thesis is currently represented by the
losing artifacts.** A's advantage is architectural and its seats produced drawings. B's
disadvantage is architectural and its seat produced a working fold. `spike-A1`'s own self-critique
says it plainly — the `+2` is a hard-coded constant animated with a cubic ease, *"which is more
persuasive than A2's static assertion and exactly as fake"*; passage ids are literals; *"the
security claim is a drawing."* `spike-B1` implemented `project(seq)` and unit-tested it 13/13
against its own candidate's numeric claims.

That is a **seat-discipline problem, not a thesis problem**, and it is the most dangerous finding
of the round, because architecture that is only ever drawn cannot be falsified. Binding ruling for
round 2: **an artifact that asserts a mechanism either implements it or says so on the visible
surface.** An honesty note inside a collapsed `<details>` (B1's UVTT disclaimer) or a footnote under
a beautiful animation (A1's `+2`) does not count. And every spike declares `<meta charset="utf-8">`
plus a viewport tag on line one.

### 2.2 The disagreement that is actually agreement

Strip the votes and all three judges say the same three things.

1. **Nobody proved Fandom-grade at any scale.** B's wiki half is ~2 % of its evidence: one entity
   page, four hard-coded backlink chips, a "what happened" list filtered by the literal
   `[6,7,11,12,13]`, a textarea, nothing longer than six rows in ~4,700 lines. A's is prettier and
   equally small: its backlink renderer is a hard-coded literal array switched on entry slug, and
   the `Link` table — one of the three new tables its own §6.2 demands — is approximated in neither
   spike. Both candidates *designed* a wiki; neither *built* one. `features-B` A10's seeded fixture
   — **5,000 entities, 50,000 rows, 8 characters, 3 permission states, p95 < 80 ms** — is the
   cheapest evidence anyone proposed all round and it belongs to the champion whoever wrote it.
2. **The two behavioural bets that decide both theses are unmeasured.** A's visibility tax (does a
   tired GM at 23:00 perform the reveal?) and B's labour gate (does the GM type ≤ 4 minutes?).
   Round 2 owes measurements, not prose.
3. **The permission model is harder than either candidate's own tests can see.** The single most
   instructive datum in the round is `spike-B2`'s `omissionCheck()`: it searches `innerHTML` for the
   values of withheld facts while `buildShell()` only ever emits facts from `visibleFactIds()` — so
   the lamp **cannot fail by construction**, reported *4 zurückgehalten · 0 im DOM* in green, and
   beat 411 leaked the withheld claim in plain text two components below, delivered *preferentially*
   through the `aria-label`. A's equivalent: `renderShelf()` writes the session log unconditionally
   while the stage correctly omits the very passages that log names by id, source and session. **Two
   independent seats, opposite candidates, identical class of bug.** That is not sloppiness; that is
   the shape of the problem, and it is why §4's G2 graft is unconditional.

### 2.3 The disagreement nobody resolved, because it is not ours to resolve

`attack-A` M13 and `features-A` U2 are right: **A reallocates the flagship Kaya named.** K5 says
maps *"nur in besser"*, with WFC-driven tile/sprite generation as a flagship bet. A's slice 1 cuts
maps, tokens, the Tactical recipe and dice; slice 2 is the rule engine; K5 begins at slice 3 at the
earliest, and §1 surrenders the tactical ceiling in writing. The Wissenskarte answers *half* of it,
on A's own thesis, at medium cost, in slice 2 — and it does not change the fact that the candidate
trades the flagship the stakeholder asked for against a flagship it prefers. **This is a stakeholder
fork, not a design defect.** It goes to Kaya via `OPEN-DECISIONS.md`; my provisional call is
recorded in `CHAMPION.md` §12 and the oracle does not get to close it.

---

## 3. The ruling

**Champion: A — The Living Codex**, wiki-first, at 21:19 and 2–1. The chain, shortest form:

1. **Both moats are structural; only one points at an empty field.** B's is the more provably
   unretrofittable — Foundry abandoned even the PixiJS v7→v8 *renderer* migration mid-cycle as "far
   more sweeping and disruptive than we had planned" for module authors and ate the debt publicly;
   if the renderer is unreplaceable because of the ecosystem, the write path is categorically
   harder. But an unretrofittable write path wins an argument about the four hours a week that
   Foundry already wins better, against the audience with the highest switching cost in the hobby.
   A's `Revelation(passage, subject, revision, source, belief)` edge points where nobody stands:
   none of the six teardowns models **who knows what**, and none connects a fact to a number.
2. **After hardening, A ships first on the axis it wins and B ships first on the axis it concedes.**
   `features-B` A5 is the best negative-scope move in the round — and it removes the entire Record
   from slice 1, so B's first public artifact is a tactical table with static maps, shared fog, no
   lighting and an undo button, competing head-on where `product-B` §5 already concedes *"for a 5e
   tactical table playing tonight, Foundry beats our first slice outright and will beat us on the
   map for years."* That is intake tension #3's unwinnable war, entered deliberately, with the
   Wiki/Fandom half — half of Kaya's sentence — deferred behind it.
3. **Cost class decides it for a solo stakeholder.** A is a supertype/subtype CRUD schema whose
   reads are filtered queries. B is event sourcing *plus* S2's per-recipient declarative renderer
   *plus* `BeatDelivery` fan-out *plus* per-recipient transport, on the hot path of the only write
   path, where R3 (byte-identical replay across migration) and R4 (drop all snapshots, refold from
   beat 0) are owed again by every future feature. B's own §1 proves the irreversibility: write
   paths are the thing a mature product cannot change — which binds symmetrically from day one.
4. **A has the better optionality.** `forge-standalone` as a CI target compiling Forge + rule engine
   plus WFC generator plus Theme Studio against a package file with **zero** imports from `codex/*`,
   `session/*`, `server/*` keeps the Dungeon-Alchemist-shaped SKU alive by architecture. If the wiki
   bet disappoints, A still owns a CRUD app and can bolt a table on. If the table bet disappoints,
   B owns a tax.

**Where this ruling is wrong** — falsifiable, in the order the tests should run:

- **The editor.** Two days on a ProseMirror/Tiptap surface where every passage is a top-level block
  node carrying an id, testing whether ids survive split, merge, paste-over and undo without a
  bespoke identity layer. If they do not — or if the crew refuses to constrain the editor
  (paste-as-plain into the focused block; split forces an explicit id decision) — A's slice 1 loses
  its only load-bearing component and the engineering vote reverses. This has now gone **two rounds
  unpriced** while every feature in the champion anchors to passage ids.
- **The import.** Descope M5 to Obsidian-vault import only and A enters release one as a blank
  encyclopedia against World Anvil's decade of content on one flank and Owlbear's twenty minutes on
  the other, with the fusion invisible until slice 2. The market vote reverses.
- **The evidence.** If A's next artifact is another wiki spike with a faked `+2` and a hand-coded
  backlink array while B's seat ships the Ruling Card it committed to, the product lens stops being
  one dissent and becomes the round's verdict.

One further honesty, since the corpus invites the comparison: **the margin collapsed between forge 1
and forge 2** — 24:14 / 3–0 became 21:19 / 2–1. Different documents, different judges; this is a
direction, not a measurement. But the direction has a cause. B's four fatals all converged on **one
unfinished seam** and closed with two tables. A's five fatals were five separate places where the
candidate scoped the passage and forgot to scope what hangs off it — the derived number, the source
stamp, the audit line, the share token. **A won on position. It did not win on hardening.**

---

## 4. Grafted from the loser

B is lineage, not waste. Six ideas move into the champion, plus a hygiene set. Every one is
thesis-neutral — none requires event sourcing — and all are integrated in `CHAMPION.md`.

**G1 — Blame as a universal right-click, and the two dials.**
Every derived number, every fact, every revealed passage is right-clickable to the second it became
true: *"became true at 21:38, Sitzung 12 — Sela was told this by Vaugn under duress, contested since
Beat 11 · [Zur Passage] · [Zurücknehmen]."* Generalised by `features-B` N3 into two chips in every
page header — **Stand: jetzt ▾** and **Aus Sicht: Spielleitung ▾**. The first is Fandom's revision
history, table stakes. The second is the half nobody has: read the page **as Sela knew it at
21:38**. Nearly free in A, because a page is already `projektion(betrachter, eintrag)`, Canon
Divergence already renders the shape for facts, and `features-A` M12 built the same thing for
numbers under another name. One gesture; three features collapse into it.

**G2 — The one-string rule (`features-B` S2), taken verbatim and unconditionally.**
There is exactly one human-readable string per surface and the projection produces it **per
recipient**: visible text, `aria-label`, `title`, `alt` and the live-region announcement are the
same function's output. It is the only rule that makes the accessibility tree structurally incapable
of out-running the permission boundary, and B2's beat 411 — leaking preferentially to screen-reader
users — is the proof it is needed. It arrives with its enforcement: the leak gate is a **constructed
differential test** (no value, no substring ≥ 12 chars and no id from any unheld passage appears in
the payload, the DOM, or the serialised accessibility tree), never a substring search over what the
renderer already chose to emit.

**G3 — The Ruling Card and the fire count (`features-B` A6 / E2).**
RB-11 makes the visual rule-builder the go-to-market; A's answer was Schema-Lite, which creates
*page types*, not *authors*. B's is better. At the table, one key opens a one-line card: free-text
name plus one scope chip taken from the current selection, ~6 s, `expression_ast = null`,
`status: informal`. The ruling sits as a chip while warm, and the GM **presses it when the situation
recurs** — `fire_count++` by deliberate gesture, never inference, which is a registry ranking signal
downloads cannot game. Formalisation into the closed AST happens in the Session Diff or at the
Forge, with nobody waiting. Publish sends the table's homebrew to our registry. It is the only
growth engine anyone proposed that attacks Foundry's 475-systems moat at its causal root: Foundry
got systems because it had **authors**.

**G4 — The Contradiction Engine (`features-B` N1), which A computes more cheaply than B can.**
A ranked GM-only panel of the campaign's live lies, as pure joins, no AI, no scoring: two
revelations with incompatible content on one subject; **a revelation whose cited `source` character
holds no revelation for what they are quoted as having said** — a structurally detectable lie the GM
created by choosing the source, inferred by nothing; a fact told onward after it was superseded, so
every later holder runs on dead information. A holds `Revelation.belief` — the one boolean letting a
character be entitled to something the GM knows is false — so this is *more* native here than in the
candidate that invented it. Opened in the twenty minutes before 21:00, it hands the GM tonight's
material out of what her own table did. Fandom-grade **analysis**, not storage.

**G5 — Proposal → Commit as the default shape, and PendingOutcome as a row.**
Nemesis conceded it and I agree: collapsing preview, `defeat_pending`, Session-Diff triage and undo
into **one mechanism with one test suite** is the largest architectural saving either candidate
found — and it needs no event sourcing. Two rules ride with it. `features-B` A1: an undo is a
**local projection until the reason is committed**; nothing broadcasts before the reason exists and
Escape discards with no event (A's own M2 four-second window is the same ruling from the other
side, and the champion states it once). `features-B` A2: a pending outcome is a **row** opened by
one action and closed only by an explicit confirm or waive — never `Math.max(0, hp)` arithmetic a
heal can silently erase; resource floors are package-declared and may be negative.

**G6 — Measurement instruments as CI gates.**
Both hostile judges named B2's two best ideas and both said take them whoever wins. (a) The **live
contrast probe** — `getComputedStyle` → 1×1 canvas → WCAG ratio, computed in the page at the moment
of viewing across skins × modes × contrast levels; the only number in the round anyone can recompute
— with the coverage gaps closed (`--dim/--surface`, `--muted/--surface2`, `--accent-text/--surface2`,
and a mandatory computed scrim under any text over uncontrolled raster). (b) The **structural
signature** — `Tag · ARIA role · data-comp · childCount`, hashed across the axis matrix as a jsdom
snapshot test; the first falsifiable test of 03's independent-axes doctrine anyone has produced —
with B's own faults fixed: no `data-leaf` on the one component that genuinely differs by role, and
no neighbour collapse that hashes 2 targets and 6 targets identically.

**Also taken, without ceremony:** `channel: play | authoring | system` on every audit event, so
Tuesday's typo fix appears in a Changelog tab and never in "Was geschah" (A's Session Diff and
deterministic recap need this and did not have it); the **content-string primitive**
(`overflow-wrap: anywhere`, `hyphens: auto` under `lang="de"`, `min-width: 0` mandated on every
flex/grid ancestor, `overflow-x: hidden` banned on `body`/`.app`) with the long-text test axis aimed
at **content** rather than chrome — A's codex rail has the identical bug; the **bottom-sheet rule**
(any decision surface taller than `100dvh − 32px` scrolls internally and pins its actions outside
the scroll region), which is how the champion avoids shipping an unreachable confirm button; and the
**5,000-entity fixture campaign** with a p95 latency gate.

**Deliberately not grafted, and why:** event sourcing itself — the tax is real, the reversibility is
zero, and A gets rewind-shaped behaviour from append-only `AuditEntry` plus revision-pinned
revelations at a fraction of the cost. The Beat Clip as the marketing unit — A's still-image answer
is the Wissenskarte, and a product whose only asset is a video is the weakness `product-A` §10.6
already names; the clip returns when there is a table to film. E3's per-person table telemetry —
B cut it itself, and it would hand a GM a profiling instrument over four named natural persons in
Germany.

---

## 5. Still unresolved — the work order for round 2

Ranked by damage done if still open when round 2 closes.

1. **The editor, and stable passage anchors.** Unpriced in forge 1, named as unimproved in the
   README's own round log, still unpriced after forge 2 *and* hardening — `features-A`'s closing
   section says outright *"nothing in this document touches it."* Every revelation, clause, link,
   export, publication and the whole Wissenskarte anchors to passage ids, and the failure is
   **silent**: a character keeps a `+2` whose sentence no longer exists. The cheap mitigation is
   known and written down nowhere. **Price it with a running spike, not a paragraph.** §7 forks
   here.
2. **The live table. Still.** Named unimproved last round; unimproved again. Neither A spike
   contains a table, a token or a map, and neither A slice adds one. The Wissenskarte is the answer
   on A's own thesis and it is **described, not built**. Round 2 owes it as an artifact: a real
   scene with regions, one player's map drawn from what they were told, another's drawn differently,
   two rooms in rumour outline because somebody lied to them.
3. **Fandom-grade at scale — unproven on both sides.** No search, no index, no navigation, no
   disambiguation, no ranked autocomplete, no list longer than a handful of rows in ~9,400 lines of
   artifact across four files. One `retrieve(viewer, scope, query)` with the permission join
   **inside** the SQL, real indexes and the fixture campaign are grafted; they must be exercised,
   not declared.
4. **The two behavioural bets.** Visibility tax and labour gate. Both measurable, both unmeasured,
   both decisive. One instrumented four-hour session answers both; no amount of prose does.
5. **F1's residue (`features-A` U1).** A shared check containing a sealed numeric term is still
   subtractable when two sheets are visible on one screen. `disclosure` moves the collision to
   authoring time, the Sealed Trace makes the leaky state unrepresentable, Verdeckte Probe resolves
   symmetrically — and the honest conclusion stands: **secret clauses should mostly not be
   numbers.** The product can guide that; it cannot enforce it.
6. **The tail of the one-time licence (`features-A` U3).** Text free forever, pixels metered, BYO
   bucket for the heavy user — and a GM who paid €30 in 2027 and reads her codex in 2037 still costs
   money with no further revenue. No feature fixes it; Kaya owns the pricing call.
7. **Cold start's shape (`features-A` U4).** Import shortens the curve dramatically for the
   migrating GM and does nothing for the GM starting a fresh world, who still faces an empty
   encyclopedia against Owlbear's twenty minutes.
8. **K5's allocation** — the stakeholder fork of §2.3, owed to `OPEN-DECISIONS.md`.
9. **Crew hygiene, cheap and embarrassing:** three of four spikes shipped with no charset
   declaration. One line, in the template, from now on.

---

## 6. What actually improved this round

Mixed, and I will say which half is which.

**Genuinely better — the permission discipline.** Forge 1's answer was one structural change doing
the work; forge 2's is one *rule* doing it: every surface hanging off a passage gets the passage's
own scoping, and the enforcement moved **below the programmer**, which is the only layer that
survives a 04:37 rebuild by a tired human. Concretely: `character_id NOT NULL` with `campaign` and
`user` deleted as stored subject types (free tonight, a five-year migration if deferred); the source
of a revelation becomes **itself a passage**, with the server-side precondition
`visibility(source) ⊇ audience(reveal)`; `visible_events()` as a sibling of `visible_passages()`
under the same lint; `oracles.yaml` as a CI-gated manifest with one row per read surface — seven of
them added that forge 2 did not have; a dependency-cruiser rule reddening the build on raw
`Entry`/`Passage`/`Revelation` imports outside the projection modules; and `GRANT INSERT, SELECT` —
and nothing else — on `audit_entry`, after a three-character `AUDIT.splice` inverted the domain
model's one non-negotiable property **twice, across a rebuild**.

**Genuinely new — the player.** Before this round the product had nothing a player could touch for
two slices. **Nachtrag** ("Was habe ich verpasst?" — a deterministic per-character delta with stamps
and sources, structurally impossible for any competitor that does not model who knows what) and
**Feldnotizen** (players write the wiki under one server-enforced constraint: you may cite only what
you hold) are queries and stylesheets over rows the permission fixes already require, and they are
the strongest retention argument anyone made all round.

**One real new differentiator.** The **Wissenskarte**: fog of war as a knowledge projection instead
of a vision computation. A Scene is an Entry, its regions are Passages, so the map a player sees is
the map they earned — wrong where they were lied to, rumour regions dotted, a *"gelernt Sitzung 14,
Quelle: Bruder Alder"* stamp on a corridor. It routes entirely around Foundry's decade-deep
wall/perception/sweep moat, gives WFC a consumer two slices early, and — commercially the point —
**it is a still image**, which §10.6 admits the candidate did not have.

**And the entrance got built**, the biggest strategic change of the round: world import from
Foundry, Roll20 and Fantasy Grounds at launch, funded by killing three outbound scene exporters, and
ending in the Nachtragsgewährung screen so the migrating GM's first act in our product is our core
gesture performed on her own four-year world.

**Now the uncomfortable half.** The two items the previous round named as unimproved — **the live
table and the editor** — are **unimproved again**. Nothing in this round has a cursor in it and
nothing has a token in it. The product also got *bigger* in the same breath as it got better;
`features-A` says it itself: *"the aggregate is a slice that has grown while I was defending it."*
Schema-Lite, three importers at *large*, reader identities, a claim flow, server-side `<a href>`
routing and two player surfaces all landed in slice 1 against six real kills. And the round's
artifacts moved backwards relative to the round's arguments: the champion's flagship spike does not
render its own German correctly.

A round that hardens the invariants, builds the entrance and produces one new differentiator is not
a reshuffle — the substrate is measurably harder to break than it was at 02:23. But a round that
leaves the same two items unpriced **twice** is telling us where to fork, loudly. §7 listens.

---

## 7. Round 2 — the fork

**Withdrawn:** the theses announced by the stale verdict ("Der Beiwagen", a sidecar into
Foundry/Roll20, vs. "Der ganze Tisch"). That fork is about the **entrance**, and the entrance was
substantially answered this round by import-at-launch; a sidecar additionally concedes the
"Foundry-grade live table" half of Kaya's sentence at the door; and decisively, **both sides of it
still need an atom of knowledge and neither settles what it is.** It stays available as a round-3
fork and is recorded as such.

**The fork round 2 needs** is the one that has survived two rounds unanswered while everything in
the champion hangs off it: **what is the atom of the codex, and who makes it?** Not an
implementation detail — it decides the editor's price, the primary stage, the visibility tax, the
cold start, the mobile story, the import mapping, and whether the flex photographs. The two answers
produce different products that **die to different attacks**, which is the entire point of a fork.

### A — „Das Skriptorium" (the document is the product)

The champion doubles down. A passage is a **paragraph inside a real rich-text surface with stable
block identity**, and round 2's first act is Hephaistos pricing and building it: passages as
top-level id-bearing block nodes; split, merge, paste-over and undo tested against id survival; the
editor deliberately constrained wherever the constraint buys identity. Prep *is* writing; the
writing surface becomes the best-loved screen in the product and the reason a World Anvil or
Obsidian user moves. The visibility tax is paid by making the reveal a **writing gesture** — you
reveal the sentence you are already looking at. Importers land into documents. The flex photographs
as one beautiful page three people read differently. Optimises 02:00 and depth; must prove it can
still be at the table by 21:00.
**Dies to:** *"You spent round 2 building a text editor. Anchors still drift under paste-over, a
revelation orphans silently, and the product still has no game in it — Notion had years and a team."*

### B — „Der Zettelkasten" (there is no cursor in a document)

The champion inverts. **Knowledge is atoms, and atoms are immutable.** A Karte is created by a
capture gesture — at the table, in prep, from an import, from a player's field note — and is never
edited in place: a correction is a **new atom that supersedes the old**, so stable anchors are free
by construction and the champion's largest unpriced item is *deleted* rather than paid for. An
article is not a document but a **rendered arrangement** — a query plus an order over atoms — so the
page, the sheet, the Wissenskarte and the per-character projection become one renderer. Canon
Divergence stops being a feature and becomes the substrate's default reading. Cold start is
generative because the first card costs four seconds instead of a blank page, and capture-first
makes the Ruling Card and Feldnotizen native rather than grafted. Optimises 21:00 and reach; must
prove it is still Fandom-grade.
**Dies to:** *"Fandom-grade means prose. A wall of index cards is a database with a nice theme,
nobody shows a friend their Zettelkasten, and the first thing every real GM does is paste three
paragraphs out of Google Docs — into what?"*

They are not two schedules of one product: one buys an editor and gets prose, the other deletes the
editor and gets composition. One's fatal is *"you cannot build it"*; the other's is *"nobody wants
it."* Both carry the whole champion — the Revelation edge, all six grafts, the permission gates —
and both owe the same two artifacts: a Wissenskarte that actually renders two players' different
maps, and an instrumented session that measures the visibility tax. Whichever wins, round 2 ends
with the atom settled and a number where the editor's price used to be.

> *Nicht wer lauter singt, gewinnt den Kranz,*
> *sondern wer sein eigenes Maß erträgt.*
> *A hält den Platz — auf zwei Messungen, die keiner hat.*
> *Runde zwei bringt Zahlen, oder sie bringt nichts.*
