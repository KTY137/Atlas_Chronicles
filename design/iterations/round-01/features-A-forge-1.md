# Feature Response — Candidate A, „The Living Codex"

Feature Architect · 2026-07-27 · design round 1, answering [`attack-A.md`](attack-A.md)
Target: [`product-A.md`](product-A.md) · artifacts [`spike-A1.html`](spike-A1.html), [`spike-A2.html`](spike-A2.html)
Corpus: [`00-intake.md`](../../00-intake.md) · [`02-domain-model.md`](../../02-domain-model.md) ·
[`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) · `research/RB-10`, `RB-11`

---

## How to read this

Nemesis's verdict is correct and I do not argue with it: the substrate lives, the specification
does not. Her four fatals cluster because they *are* one failure — §6.7 walled the article and left
the arithmetic, the audience set and the query outside the wall.

So the spine of this response is **one structural change, not fourteen features**. Materialise
knowledge per character, and make that materialisation the *only* thing any read path may touch.
That single move answers F2 outright and makes F1, M2, M7, M8 and M10 tractable instead of
contradictory. Everything else here is either a consequence of it, a ruling that costs a paragraph,
or a removal.

I have verified the three artifact claims I build rulings on top of, in source:
`spike-A1.html` L1534 (`ABSAETZE.length - sichtbar.length`, printed to the player),
`spike-A2.html` L1481 (`${p.html}` into `innerHTML`) and L1498 (`hidden` printed to the reader),
`spike-A1.html` L1788 (`protokoll.filter(... !== "wurf")` — the log line is deleted). All three are
as reported.

Costs: **small** ≈ ≤3 days · **medium** ≈ 1–2 weeks · **large** ≈ 3+ weeks, for one builder.

---

## Part 0 — The spine: the Reader Projection

> **Change:** `audience_kind` stops being stored state. A revelation is materialised, at reveal
> time, as one row per character. The per-character set of visible passage ids is maintained as a
> **projection** — an append-driven, per-character index — and it is the only object any read path
> is allowed to hold.

```
Revelation (id, passage_id, character_id, granted_via, batch_id, session_id,
            revealed_by_user_id, revealed_at, source_action_id?, retracted_at?)
granted_via ∈ { public | campaign_fanout | membership_fanout | direct | catchup_grant | fork_import }
```

`audience` survives as an **authoring gesture on the Action** — the GM still presses `R` and picks
"the whole table" — and the server fans it out to N rows sharing one `batch_id`, so undo, audit and
the Canon Diff still speak in the GM's language. The stored truth is per character. Nothing else
changes in the GM's hands; everything changes underneath.

**Why the cost objection dissolves.** Nemesis prices per-reader materialised views at "60k passages
× N readers" and calls it the expensive answer. That arithmetic is right and the conclusion is
wrong, because **N is table size, not user count**. A campaign is 3–8 characters. A five-year world
at 60,000 passages × 8 characters is 480,000 integers — a roaring bitmap per character, single-digit
megabytes, updated by append on a human-paced event (a GM presses `R` a few dozen times a session).
This is a rounding error, and it buys the correct answer to the one question the product exists to
ask.

**Cost: medium.** It must land before slice 1 ships. It is unretrofittable in exactly the way §6.1
says, which is precisely why it is cheap tonight and impossible in 2029.

---

## Part 1 — The fatals

### F1 · The Sealed Trace, and Publish Trace as the verb

**Answers:** F1 (invariant 6 vs invariant 1 in the derivation view, roll card and action log).

Nemesis proves there is no third option *given her framing*: show the term and leak, or redact the
term and leak the magnitude by subtraction. Her framing is right and it contains the exit. The leak
in the redaction branch is not caused by redaction — it is caused by **redaction being conditional**.
If the trace is private only when it contains a secret, then privacy *is* the signal.

**Three rulings and one feature.**

**Ruling 1 — no partial trace, ever.** A projected trace either shows every term and the total, or
shows the total and no terms at all. A term list that does not sum to its own total is
unrepresentable in the API: `Trace` is a sum type — `Complete { terms[], total }` or
`Sealed { total }` — and there is no third constructor. This is a type, not a review note, and it is
lintable.

**Ruling 2 — the trace's default audience is the roller and the GM, uniformly.** Not "when it
contains a secret". Always. Kael's clean, secret-free Insight roll is sealed to the table exactly as
Ossa's is. There is therefore no observable difference between "she has a secret" and "she rolled",
and the oracle is gone — not mitigated, gone. This costs nothing at a real table, where nobody reads
anyone else's arithmetic out loud unprompted; it costs exactly one thing, named in Part 6.

**Ruling 3 — invariant 6 is a promise to the entitled reader, not to the room.** Write it into the
invariant: *every derived number can show its derivation to a viewer entitled to every term in it.*
The §2 flex ("wait — the plus two is a link?") happens on the **roller's own screen**, which is where
it always happened in Pythia's own scene, and it survives untouched.

**The feature — `Publish Trace`.** The GM (or the roller) can publish a trace to the table. It is an
Action: preview → commit → audit, like every other verb. The server projects the trace against the
target audience and returns one of two things:

- **Complete for that audience** → publish. The table sees the full derivation. This is the common
  case and it is the §2 moment made *deliberate* instead of accidental.
- **Blocked** → the GM sees, on her screen only, exactly what blocks it: *"2 Terme zitieren Passagen,
  die Kael und Brenn nicht haben — Iron Vault §2 (+2 Lore, gelernt 21:02)."* Each blocker carries a
  one-key `R`. **The leak becomes a reveal prompt.**

That last line is the whole answer. Brenn's player asks "why is hers six higher?", and the GM's
product hands her the two choices a real GM has — narrate the mystery, or tell them — with the second
one costing one keystroke. No competitor can even *pose* that question, because none of them knows
which terms a given player is entitled to.

**Cost: medium** (`visible_terms(viewer, trace)` as a sibling of the choke point, the sum type, the
publish Action, the blocker UI).

**Invariants:** satisfies 1 and 6 simultaneously by scoping 6's audience — the only resolution that
exists. Server-authoritative: sealed traces are sealed in the response body, not in the client.

---

### F2 · Per-character revelations + the Catch-Up Grant

**Answers:** F2 (a, b and c).

Part 0 is the schema half. Three behaviours complete it, one per scenario.

**(a) The joiner — `Catch-Up Grant`.** A new membership grants *nothing* automatically. Instead the
GM gets one screen: *"Mira tritt in Sitzung 20 bei. 47 Passagen sind Tischkanon. Alle gewähren ·
Auswählen · Keine."* Whatever she grants is written as revelation rows with
`granted_via: catchup_grant`, `session_id: 20`. Mira's stamps then read **"gewährt in Sitzung 20
(Nachtrag)"** — never "gelernt in Sitzung 14, 21:47" on a character who did not exist. The trace
stops printing a lie with a timestamp, and the GM gets a decision she actually wants to make (most
GMs do *not* want the new player to know everything).

**(b) The leaver — nothing happens.** Revelations key on `character_id`, and characters outlive
memberships (`CharacterController` already allows a character controlled by nobody). Brenn becomes an
NPC and keeps every paragraph he read. Membership churn is now structurally incapable of un-knowing
anyone, which is what §6.2 always claimed.

**(c) The returning hero — memory travels, and is quarantined by default.** Revelations belong to the
character, so importing Kael into campaign B brings his revelation set with him. Cross-campaign
revelations arrive **quarantined**: visible on his sheet as *"Erinnerungen aus Aldenfall (37) —
inaktiv"*, with clauses off, and the receiving GM activates all, some or none in one action. This is
the correct default (a new GM does not want a stranger's +2s live in her world) and it makes §6.6's
promise actually expressible.

**Cost: small**, given Part 0. The grant screen and the quarantine toggle are each a day.

**Invariants:** 1 (server enforces grants), 6 (stamps now tell the truth), 10 (all three paths are
audited rows).

---

### F3 · Saved Views replace the query language; content becomes a block AST

**Answers:** F3 (a leak/oracle, b XSS-through-fork, c cost).

Two removals and one small feature. Nemesis is right that the embedded query is load-bearing for
nothing and specified to nothing. I take her second option: **cut it.**

**(a) `Passage.kind: query` is deleted.** No grammar, no parser, no evaluator, no vocabulary version,
no migration story — because there is no language. Replaced by **Saved Views**: a *form-built*,
declarative filter record `{article_type[], tag[], infobox_field_predicates[], sort}` with a version
field and a closed predicate set (eq / neq / lt / gt / contains, on typed infobox fields only). It is
authored in the Forge's stage-2 schema forms, which already exist in §4.6's sequencing, so it costs
no new authoring surface. No free text, no joins, no recursion, no user-supplied expressions.

**The oracle closes for free.** A Saved View is evaluated **against the reader's projection**, and the
projection changes only when a revelation lands — and a revelation is *already a visible event* on the
reader's screen. So a category page can no longer move silently between Tuesday and Friday: if the
count changed, the reader was told something. Ambient inference becomes impossible not by policy but
because the only input that can change is one the reader observed. (And per Part 2/M2 the count is
never printed anyway.)

**The cost bound is a number.** A Saved View resolves as a bitmap intersection against the reader's
projection plus a typed index scan. Budget: **p95 < 60 ms, hard cap 500 rows, results cached per
(view, reader, projection_version)** — and `projection_version` only increments on reveal, so the
cache hit rate on a category page during a session is ~100 %. Nemesis's five-readers-five-evaluations
becomes one evaluation and four cache reads.

**(b) `Passage.content` is a declared, versioned block AST — never HTML, never markdown-at-rest.**
A closed node set: `paragraph · heading · list · listItem · table · row · cell · quote · code ·
imageRef · wikilink · statblockRef · clauseMarker · text`. Inline marks limited to
`em · strong · code · link(internal only)`. Renderers build DOM nodes; **there is no `innerHTML` path
in the article renderer, enforced by lint**. Markdown/Obsidian/World-Anvil import maps into the AST
and drops unknown nodes with a visible import report ("14 Blöcke nicht übernommen").

This is not sanitisation — sanitisation is a blacklist you lose eventually. It is a whitelist
substrate: a forked stranger's passage *cannot express* `<img onerror>` because there is no node that
carries an event handler and no serialisation path that emits raw markup. §9.3's fork business and
§9.1's player-authors both become safe by construction rather than by vigilance. It also gives M9's
`lang` a place to live, gives export a real format, and gives the diff engine something better than
string compare.

**Cost: medium** for the AST + renderer + importer. This is the single most expensive item in this
document and the one I would fight hardest for: it is free today and it is a rewrite of every
renderer, every export and every import after the first thousand articles exist.

**Invariants:** 2 (one declarative language in the product, not two), 1 (content path closed), 7
(import provenance report), 10.

---

### F4 · The Split Bill — reachability answered with arithmetic

**Answers:** F4.

RB-11 item 3 demands a policy, a number, and the CGNAT experience. Here are all three, and the
candidate's position is **better** than Nemesis assumes, because she priced the wrong half.

**The policy (v1), following RB-11's own recommendation:**

| Path | Ships v1 | Who |
|---|---|---|
| **Hosted rooms** — default join path, the codex answers a URL | **Yes** | everyone; the non-technical GM |
| **LAN / self-host** via the Electron host (B1 `Platform` port) | **Yes**, opt-in, honestly labelled | technical GMs, the own-your-data promise |
| **Plex-pattern DNS + per-server wildcard PKI** | **No — explicitly deferred and named as deferred** | nobody in v1 |

**The number.** Nemesis's fatal rests on "perpetual hosting of an ever-growing knowledge base funded
by a single payment." That is true of *pixels*. It is not true of *prose*, and prose is A's precious
half:

- 2,000 articles × ~30 passages × ~400 bytes ≈ **24 MB** of canon text.
- ×3 for revision history, + revelations, + FTS index, + eight per-character projections ≈
  **~150 MB per five-year world**, worst case.
- At commodity object storage (~$0.02/GB/month): **~$0.003 per world per month.** Add managed
  Postgres row overhead and replication and be generous: **under $0.05/world/month, forever.**
- The Tuesday-phone read is a handful of small JSON responses against a warm cache. A player reading
  for twenty minutes moves single-digit MB.

**Therefore the promise we make, and can keep: text canon is unmetered, forever.** That is the
durable-world thesis, and it costs us three cents a year. **Media is the meter** — maps, handouts,
audio, at 10–1000× the bytes and near-zero re-read. A licence includes a media quota (proposal:
5 GB); beyond it the GM points us at her own S3-compatible bucket or her own host, via the same
`Platform` port the self-host build already needs.

This is Owlbear's "gate quantity, never features" — but the quantity gated is **pixels, never world**.
Nemesis's hostage scenario ("the moment a five-year GM hits a storage tier, the durable-world thesis
is being metered") is answered exactly: the five-year GM's *world* never hits a tier, because her
world is text and text is free. Only her map library does, and a map library is replaceable in a way
a world is not.

**The CGNAT experience:** she never meets it. Hosted rooms are the default; she sends a link. The
self-host path is opt-in, and the app states plainly, before she chooses it, that browser players
joining a LAN host will hit mixed-content and that we do not yet solve it. **No hope, a caveat.**

**Session-hour cost:** realtime is text deltas over WebSocket — a 4-hour, 6-person session is single-
digit MB of protocol. Map tiles dominate and are content-addressed (RB-11 B3), so they transfer once
per client per asset, ever. Order of magnitude: **fractions of a cent per session-hour**; the honest
risk is not bandwidth, it is idle connection count, which is a per-room memory number, not a
per-world one.

**The companion feature — `Static Codex Export`.** Because the tail risk is real (see Part 6), the
product ships, from slice 1c, a one-click export of the codex **as a standalone static website**:
the reader's projection rendered to plain HTML files with the same typography, openable from a USB
stick with no server, no account and no us. It is the Tuesday-phone read for a self-hoster, it is
§8.7's anti-hostage guarantee made physical, and it is a marketing artifact (§8.6) — *"here is your
world, as a website you own."* Roll20 cannot do this. Foundry's file-based worlds are not readable.

**Cost: small** for the policy and the arithmetic (they are a decision and a paragraph).
**Medium** for Static Codex Export.

**Invariants:** 1 (the export is a projection, produced server-side, per named reader), 7, 10.

---

## Part 2 — The majors

### M1 · `who_knows()` as a second choke point, and a spike-fixture rule

**Answers:** M1.

The bug is that A2 answered a per-character question from a per-passage enum. The product-level fix
is that **there is no per-passage enum to answer from**: after Part 0, `Passage.visibility` degrades
to an *authoring default* (what happens when the article is created) and carries no runtime authority
at all. The `Knows` lens reads a named function:

```
who_knows(passage, viewer) -> [{ character, state, granted_via, source_action, at }]
```

— the mirror of `visible_passages`, same lint, same test matrix. And a **golden invariant test**: for
every fixture world, `who_knows` must agree with the revelation log, row for row.

**Two house rules for spikes**, because the artifact is the argument:
1. No spike may model visibility as an enum or a global boolean. Revelation rows with a character, or
   the spike does not model permissions and must say so in its own caption.
2. **Every fixture must have at least one passage whose roller is not the first-listed PC.** A2 passed
   review because Kepler and Nebelakte happened to hide the bug; Aldenfall did not. Make the
   asymmetric case mandatory in the fixture, and the class of bug is caught by opening the file.

**Cost: small.** **Invariants:** 1, 10.

### M2 · The projection is the only representable collection

**Answers:** M2 (all three instances, and the class).

Nemesis's architectural lesson is the finding, and it becomes three enforced things:

1. **Type boundary.** The render layer receives a `ReaderProjection` — an opaque, ordered collection
   with **no `total`, no `length` of the unfiltered set, and no handle to the repository**. The
   unfiltered passage collection lives in a module the render layer cannot import. `total − visible`
   is not discouraged; it is **unrepresentable**, because the render layer never holds `total`.
2. **CI lint.** Fails the build on any arithmetic between a filtered and an unfiltered collection, and
   on any import of the repository module from a render module. One rule, two checks.
3. **The differential test — the real gate.** Two synthetic readers, identical except that one holds a
   revelation the other does not. Their complete response streams (article render, search, backlinks,
   autocomplete, saved views, realtime deltas, error bodies, export) are diffed byte for byte. The
   only permitted difference is the granted content itself. **Any other byte that differs is a
   failing test.** That catches counts, lengths, ordinals, ETags, timing buckets and every future
   surface, including the ones §8.2 did not think of — which is the point, because §8.2 did not think
   of counts and both authors then shipped one.

**And a copy rule, because two careful authors wrote the leak in prose, not in code:** no player-facing
string may name a quantity of withheld things. The GM's view *should* show it — she is entitled, and
it is useful. The player's may not. That asymmetry is exactly the product.

**Cost: small.** **Invariants:** 1, 10.

### M3 · Abort within the window; retract after it

**Answers:** M3.

`undo` is currently one word doing two jobs, and the artifact chose the destructive one. Split it:

- **Abort (pre-commit).** For a short, explicit window — **3 seconds, or until the first client
  acknowledges the delta, whichever is first** — `Z` performs a true abort: the reveal is withdrawn
  before any client has rendered it, nothing enters any book, and the audit gains one
  `action_aborted` row. This is the finger-slip fix, and it is honest because nobody read anything.
- **Retract (post-commit).** After that, `Z` writes a `retracted_at` on the revelation rows plus a
  `Retraction` audit row. **The passage stays in the player's book**, marked *"zurückgezogen in
  Sitzung 14"* with the GM's optional one-line reason. The clause expires with a **visible event on
  the sheet**: *"−2 Insight · Iron Vault §3 zurückgezogen."* The action log is never mutated. A player
  cannot un-know, and now the software agrees.

The GM's UI states which one `Z` will do, live, with a countdown ring on the reveal toast. She always
knows whether she is erasing a mistake or correcting the record.

**Cost: small.** **Invariants:** 1, 6 (the sheet event *shows* the change rather than silently
performing it), 10; and it restores 02-domain-model refinement 5 (append-only audit).

### M4 · Reveal needs a mode, a target and a name

**Answers:** M4.

Four changes, none of them a design question:

1. **`isContentEditable` and `isComposing` guards** — copy A2 L1871 verbatim. A block editor *is* a
   contenteditable surface.
2. **Reveal is not a bare key in global scope.** It fires only when the **Docket/Bühne surface holds
   focus** (an explicit mode with a visible indicator), or via a chord (`Ctrl+Enter`) anywhere else.
   The GM authoring prose in the article body cannot reach it by typing "rumour", and the cat produces
   nothing.
3. **A reveal always has a named target.** The staged row is selected first (arrows), the commit
   control reads *"§3 enthüllen — an den Tisch"*, and Enter commits **that**. No unlabelled positional
   hotkeys.
4. **Docket slots are stable labels, not positions.** A staged passage carries a GM-assigned slot key
   that survives reordering, so muscle memory binds to the passage, not to the list index.

With M3's abort window this is the complete answer: hard to fire by accident, named when fired,
recoverable for three seconds, honest thereafter.

**Cost: small.** **Invariants:** 8 (keyboard operation stays complete — the mode is reachable and
announced), 10.

### M5 · Improvisation gets its own flex: the Stub Sprint and Improv Capture

**Answers:** M5 (partially — see Part 6 for the residue).

The break is real: the flex is a function of prep, on the axis the candidate claims to win. I do not
have a feature that makes an unwritten article exist. I have one that makes **the unit of
improvisation one sentence instead of an article**.

**The Stub Sprint.** The party rides for the Kepler foundry — a red link. The GM presses it, and the
product does not open a blank editor. It opens a typed stub already carrying everything the world
already knows about the thing:

- the type schema's infobox skeleton (Place: region, status, ruler — empty fields, one tab each),
- **every existing mention, quoted**: *"verlinkt aus Iron Vault §2 als 'die Marke des Herstellers'" ·
  "3× in der Sitzungsprotokoll erwähnt"*,
- three empty passages with visibility already defaulted by article type,
- and the reveal control on each, live.

She types one sentence into passage 1 and presses `Ctrl+Enter`. That is **eight seconds**, and the
paragraph lands on the stage stamped with the roll that prompted it. The competitor comparison is not
"Foundry does this faster" — Foundry does not do this at all; the Owlbear GM drags a JPEG and the
world remembers nothing. **Our improvisation writes the world; theirs evaporates.** That is the honest
claim and it is a better one than the prep claim.

**Improv Capture.** One key marks anything the GM just said or typed in chat as an *unfiled passage*
— no article, no visibility decision, no interruption. It lands in an inbox and is filed during the
Canon Diff, when she has time. This directly attacks §8.4's visibility tax by **deferring the tax to
after the session**, which is the only moment a GM has attention for it.

**And the claim gets downgraded.** Axis 1 is re-anchored: the candidate bets on **workload across a
campaign's life** (reuse, recall, not re-deriving what you already decided), not on minutes of prep
before session 15. Nemesis's demand stands as a round-2 gate: prep-minutes-per-play-hour, measured,
with staging counted — and we can instrument our own side natively, which is itself a differentiator
nobody else can offer.

**Cost: medium** (Stub Sprint), **small** (Improv Capture). **Invariants:** 3 (stubs are typed
templates, instances stay separate), 5 (no AI anywhere in this — the prompts are the product's own
backlinks), 10.

### M6 · The slice is re-cut into three, with a named cut line

**Answers:** M6.

§7 was three acts wearing one heading. The re-cut, in shipping order, each one demoable:

**Slice 1a — "the projection."** Auth · memberships · server permissions with horizontal-escalation
tests · `Article` + `Passage` on the block AST · per-character `Revelation` with fan-out · the
projection · `visible_passages` + `who_knows` + the CI lint · the player's book · the raw-response-body
absence test · the **differential test** (M2) · the `reveal` Action with abort/retract · a
focus-preserving realtime delta · JSON schema dump export.
**Demo:** GM presses `R`; it appears on one player's screen and is absent from the other's response
body; GM retracts; the log grows and nothing disappears.

**Slice 1b — "the number."** One clause shape, three numeric fields · the derivation view under the
Sealed Trace rules · `Publish Trace` · `bearer` (M11).
**Demo:** the §2 flex, plus the blocked-publish moment, which is the better demo.

**Slice 1c — "the record."** `PassageRevision` · the Session Lens (`at_time`, GM-only) · Canon Diff
v0 · the portable `.chronicle` package with a round-trip import test · Static Codex Export.

**What leaves slice 1 entirely:** `at_time` in the choke-point signature (it silently doubles the §6.7
matrix, and §6.7 is already a gate not a task — see the kill list), Reader's Cut *as of session N* for
players, and the portable package format (1a ships a raw schema dump, which is trivially lossless
because it *is* the schema; the trust promise is kept, the format work is not done twice).

Nemesis is right that "no dice engine" and "the derivation cites the passage" cannot both be true.
1b names the rules engine as what it is: a field schema, an evaluation order, a modifier stack, a trace
renderer. Hephaistos prices 1a, 1b and 1c separately.

**Cost:** this is a removal and a re-ordering, not an addition. **Small.**

### M7 · Filter-then-rank becomes cheap; the API has no total

**Answers:** M7.

Part 0 collapses the dilemma. The reader's visible set is already a materialised bitmap, so
**filter-then-rank stops being the expensive option**: the query is an FTS index scan bitmap-ANDed
with the reader's projection bitmap — index-using *and* correct, which Nemesis correctly said was
impossible without per-reader materialised views. We have per-reader materialised views. They cost
megabytes.

Two API rules make the leak unrepresentable rather than merely avoided:

- **`search()` returns `{ results[], cursor? }`. There is no `total`, ever, in any reader-facing
  search response.** Pagination is cursor-based, so there are no page counts and no gap positions. The
  UI says *"weitere laden"*, never *"31 Treffer"*. (The GM's search *may* show a total; she is
  entitled.)
- **Snippets are generated from the projected passage only** — the snippet generator physically
  cannot see an unprojected passage, because it takes a `ReaderProjection` (M2's type boundary).

**Stated target: p95 < 120 ms for `Ctrl+K` at 60,000 passages, 8 readers**, measured in CI against a
generated five-year fixture world. That fixture is worth building once and reusing for every
performance and leak gate in the product's life.

**Cost: medium.** **Invariants:** 1, 10.

### M8 · One view, named honestly: the Session Lens with tombstones

**Answers:** M8.

Both of Nemesis's horns come from calling one feature by an ambiguous name. The ruling:

- **The Session Lens is GM-only.** It is never a player-facing view and never the default projection of
  a shared screen. It is watermarked in the UI as *"Rückblick — Sitzung 3"*.
- **It shows revelations as they stood in session N**, including ones later retracted — because
  otherwise it is not history and §6.3's justification for killing `Timeline` genuinely does collapse.
- **Retracted-since content renders as a tombstone, not as prose**: struck, greyed, captioned
  *"Kael glaubte dies in S3 · zurückgezogen in S9"*, and **not copyable as clean text**. So the GM can
  see what her table believed and cannot accidentally re-show a retconned paragraph as canon. Both
  horns answered, one renderer.
- **`PassageRevision`: the as-of view shows the text as it stood in session N**, because that is what
  "as of" means, with a one-click *"aktuelle Fassung"* toggle.
- **Export ruling:** the canonical projection is **current canon**; history (revisions, revelations,
  retractions) exports as an accompanying event log, clearly separated. One canonical body, one
  history stream, no ambiguity about which is the world.

**Cost: small** (a ruling and a tombstone style). **Invariants:** 6, 10.

### M9 · `lang` on the chain, before content exists

**Answers:** M9.

`lang` (nullable, IETF tag) on **Universe → Article → Passage**, inheriting downward, emitted as a
`lang` attribute on every rendered block. It drives: hyphenation (which is why A1's `hyphens: auto`
does nothing today), screen-reader voice, the FTS dictionary per passage (German stemming on German
prose in a forked bilingual world), sort collation, and `[[` autocomplete matching.

One nullable column, today. A backfill over 4,000 paragraphs, later. There is no argument here.

**Cost: small.** **Invariants:** 8 (a language tag is the most architectural accessibility artifact
there is), 7 (forked worlds declare their language).

### M10 · Arrival, not replacement — and no optimistic reveal

**Answers:** M10 (all three sub-breaks).

Four things, and together they turn §2's headline from a liability into a better moment.

1. **Deltas patch; they never re-render.** The realtime channel carries `Revelation` events; the client
   inserts one block at its ordinal. Sibling nodes are untouched, so focus, scroll position and the
   screen-reader cursor survive by construction. This is a hard rule for the article renderer, not an
   optimisation.
2. **The Arrival Marker.** A new passage does **not** shove text under a reader mid-sentence. It lands
   *collapsed*, as a marked line at its ordinal — *"Neu · Sitzung 14 — Iron Vault §3"* — with an
   `aria-live="polite"` announcement, and expands on the reader's action, or automatically once they
   stop scrolling. Reduced motion removes the travel and keeps the marker. This reads as *more*
   premium than the shove, not less: the paragraph knocks before entering.
3. **Reconnect replay.** The client holds `last_revelation_seq`; on reconnect it requests everything
   after it. The append-only log makes this six lines. The 3G tablet catches up instead of desyncing.
4. **No optimistic reveal, and traces carry their citation text.** The reveal commits server-first; the
   GM's control shows a pending state for the round trip, and the mote flies **on ack**. A rejected
   reveal never leaves her screen — the entire "rejected after the mote flew to three books" design
   space is deleted rather than designed. And a trace term carries the citation's *rendered text*
   (title, ordinal, short entitled excerpt), not a bare id, so a client that has not yet received the
   passage still renders a live, meaningful citation and fetches the body on tap. §2's "the number is a
   link" stops depending on cache state.

**Cost: medium.** **Invariants:** 8 (this *is* the accessibility architecture claim, tested), 1 (server
ack before display), 10.

### M11 · `bearer` — one field, two values, no expression language

**Answers:** M11.

The fusion sentence gains one qualifier and nothing more:

```
clause: { type, target, value, scope, bearer }
bearer ∈ { knower | holder }
```

- **`knower`** (default) — active for any character with a live revelation. This is §2's flex, unchanged.
- **`holder`** — active only for the character who holds an *instance* of the item whose template
  article carries the passage, **and** has a live revelation for it. Kael gets the ring's +2; Ossa and
  Brenn, who merely read about it, do not.

It is a **closed enum**, deliberately. Nemesis's warning is exactly right — the moment a clause can be
conditional on possession it can be conditional on anything, and the clause vocabulary becomes §4.6's
stage-4 formula graph pulled into the substrate. Two values are not an expression language. `equipped`
and `attuned` are *not* added now, however tempting; they are stage-4 work and they wait there.

**Authoring UX:** a clause written on an article of type `Item` defaults to `bearer: holder` and warns
if the author flips it to `knower`. That warning is where the GM learns the distinction exists.

**Cost: small.** **Invariants:** 2 (still declarative and closed), 3 (template/instance separation now
holds mechanically, not just literally), 6.

### Minors · one hygiene block

Not features, rulings, all confirmed by grep and all trivial: UTF-8 BOM on every spike (charset is the
cheapest fix and the most expensive first minute); `input[type=radio]` in a `role="radiogroup"` for
Reader's Cut, copied from A1; `prefers-contrast` and `forced-colors` in A1, copied from A2 whose
contrast measurement Nemesis says to lift into CI verbatim; `readHash()` validates against the pack
registry and falls back to the default world with a visible notice (invariant 10 requires error
states). **Cost: small, all of it.**

---

## Part 3 — Beyond defence: three flexes that need the fusion

Each of these is *impossible* without a per-character revelation log joined to a wiki. None can be
copied by Foundry, Roll20, Alchemy or Owlbear without rebuilding their data model — which is the test
K4 actually sets.

### N1 · The Chronicle — the book the campaign wrote

**New capability.**

Every revelation is stamped with a session, a time, an actor and often the roll that earned it. So the
product can render, for any character, **their own history of learning as a readable document**:
Ossa's chronicle, in the order *she* learned things, each paragraph carrying the moment it was earned.
*"Sitzung 14, 21:02 — Recherche 21. Die Marke am Schloss stammt aus der Kepler-Gießerei."*

It writes itself. It is per-reader, so three players get three genuinely different books of the same
campaign. It is beautiful on a phone, it is the artifact a player keeps after the group breaks up, and
— answering §8.6 — **it photographs.** A knowledge graph does not screenshot; a gorgeous personal
chronicle with a roll printed under each revelation absolutely does, and it is the shareable thing that
recruits the next table.

**Why sensible now:** the data already exists after Part 0. This is a renderer and a print stylesheet
over rows we are storing anyway. It costs no new schema, no new authoring, no new GM work.
**Cost: medium.** **Invariants:** 1 (it is a projection, produced server-side), 8, 7.

### N2 · Blind Spots — the query only we can run

**New capability.**

The Docket gains a panel computed from the projections of everyone at tonight's table:

- **"Niemand weiß das."** Canon passages that are load-bearing for tonight — linked from tonight's
  scene, or high-backlink — that **no character** holds. The GM sees, before play, exactly which of her
  carefully built plot beams the table cannot yet stand on.
- **"Nur Ossa weiß das."** Single points of knowledge failure. *"Wenn Ossa Freitag fehlt, weiß niemand,
  wer das Schloss gebaut hat."* Every GM has been ambushed by this and no software has ever warned one.
- **"Kael weiß es, hat es aber nie erwähnt."** Held for three sessions, zero mentions in the log — a
  dangling thread the GM can pull.

**This is the payoff that redeems §8.4's visibility tax.** Nemesis's sharpest structural point is that
per-passage visibility is a chore no competitor imposes. Blind Spots is the answer to *why you would
bother*: because once the product knows who knows what, it can tell you what your table is missing —
and that is a prep tool of a kind that does not exist in this market, on the exact axis (GM cognitive
load) the candidate bet on. The tax buys something. Say so in the onboarding.

No competitor can compute this. It requires per-character knowledge state, which requires the
Revelation table, which is the thing §6.1 says cannot be retrofitted.

**Why sensible now:** it is three queries over the projection store, in the Docket that already exists.
**Cost: small–medium.** **Invariants:** 1 (GM-only surface, server-computed), 6, 10.

### N3 · Contradiction Watch — the scene generator inside the knowledge graph

**New capability**, riding on §9.2's `belief`.

The GM can declare, when authoring, that two passages **contradict** — an explicit, declarative link
type (`contradicts`), set by hand, no inference, no AI. Then the moment a single character comes to
hold both, the GM is told:

> *"Kael hält jetzt Iron Vault §3 (die Bücher sind echt) und Vharon-Briefe §1 (zwei sind gefälscht).
> Widerspruch seit 21:47."*

That is a scene, delivered to the GM at the moment it becomes playable. And when the truth finally
lands, the derivation view can say what Pythia already promised in §9.2 and had no mechanism to fire:
**"dieser +2 kam aus einer Lüge, Sitzungen 14–19."** A mechanical system that can be wrong on purpose
and prove it later — and now it *notices* when it is wrong, at the exact table where it matters.

**Why sensible now:** one link type, one query against the projection store, one notification in a
Docket that exists. It makes `belief` — already argued as "one nullable ref" — actually earn its
nullable ref rather than sitting decorative.
**Cost: small.** **Invariants:** 5 (zero AI; the GM declares the contradiction), 6, 1.

---

## Part 4 — What we remove

Four removals. Every round that only adds is a round that made the product harder to ship.

**1. The embedded query language — deleted.** (F3.) No grammar, no parser, no evaluator, no
privilege rule to get wrong, no version to migrate, no cost to bound, no line in the export format.
It was one sentence in §4.1 and load-bearing for nothing. Saved Views cover the real use case
(self-maintaining category pages) with a closed form-built predicate set. **This is the headline kill:
we remove an entire user-authored language from a product that must guard invariant 2 forever.**

**2. `audience_kind` as stored state — deleted.** (F2.) The permission matrix loses a dimension: the
§6.7 gate becomes universe role × campaign role × character, with `audience` surviving only as an
authoring gesture that fans out. Nemesis calls the §6.7 matrix a gate rather than a task; this makes
the gate materially smaller, which is the best kind of removal — it shrinks the thing that must be
exhaustively tested forever.

**3. `at_time` out of slice 1, and out of the choke-point signature.** (M6, M8.) It silently doubles
the matrix, and the feature it serves (Session Lens) is GM-only, off the hot path, and correctly
belongs in 1c. The signature becomes `visible_passages(viewer, scope)`; the temporal variant is a
separate, GM-only, explicitly-named function added in 1c and tested on its own.

**4. Optimistic reveal — deleted as an architectural commitment.** (M10.) Server-first commit, mote on
ack. This removes the entire design space of "a reveal the server rejects after three players read
it", which the candidate never designed and would have discovered in production. The 300 ms feeling
survives; the 300 ms *lie* does not.

**One thing I decline to kill, against expectation:** the Theory Board (§9.1). M5 is right that it
cannot be the *cure* for cold start — it needs an encyclopedia to have theories about — so I demote
its claim: it is not the cold-start answer, it is the *retention* answer for a table already three
sessions in. That reframing costs nothing and stops the circular argument. The feature itself is a
scoped `Passage` and a feed; it stays.

---

## Part 5 — Unanswerable within this thesis

Four things I could not fix, stated rather than papered over.

**U1 — Shared contested rolls with asymmetric secret knowledge cannot be jointly explained.** The
Sealed Trace closes F1's leak, and `Publish Trace` gives the GM a one-key path from "why is hers
higher?" to "here is why." But when she chooses *not* to reveal, the table sees two totals and no
reasons, and cannot resolve the check together with full information. Nemesis predicted this cost and
she is right that it is real. My only defence is that it is a property of the *fiction*, not of the
software: at a real table with a real secret, the same asymmetry exists and the GM narrates. We do not
make it worse; we simply cannot make it go away. **The 21:02 moment survives on Ossa's screen and is
diminished on Brenn's, and the product should stop advertising otherwise.**

**U2 — The steady-state prep advantage is unproven, and this round cannot prove it.** The Stub Sprint
makes improvisation cost one sentence instead of an article, and Improv Capture defers the visibility
tax. Neither is a measurement. Axis 1 says "measured, not felt", and the honest position is that
candidate A's prep claim is currently *felt*. Round 2 owes the number, against Foundry and Roll20, with
staging counted, and the candidate should carry the claim as provisional until then.

**U3 — No one-time payment funds indefinite hosting at the tail.** The Split Bill is arithmetically
sound for the median world and it is still true that a GM who paid once in 2027 and reads her codex in
2037 costs us money forever with no further revenue. Three cents a year is not zero and neither is a
decade. The promise we can actually keep is narrower than the thesis wants: *"your text is free while
we exist, and your world opens without us if we do not."* Static Codex Export makes the second half
real. The first half is a bet on us surviving, and no feature fixes that.

**U4 — The thumbnail.** N1's Chronicle photographs far better than an encyclopedia article, and it is
the best answer available. It is still not a TaleSpire diorama, and the category's currency on Steam
and on subreddits is dioramas (§8.6, RB-07's software-category penalty). Our growth channel remains a
30-second video and creator word of mouth — which RB-11 says is the right channel under a direct sale
anyway, but it does not make the picture problem disappear.

---

## Net effect

**The candidate is materially stronger, and the reason is that one change did most of the work.**
Materialising revelations per character (Part 0) is not a patch — it deletes F2, makes F1 resolvable
without contradiction, turns M7's unaffordable option into the cheap one, makes M2's leak
unrepresentable rather than merely forbidden, gives M8 a coherent temporal semantics, gives M10 a
replay substrate, and turns out to be the enabling condition for all three of the new flexes in Part 3.
Nemesis's four fatals clustered because they were one failure; the fix clusters for the same reason.

Two of the four fatals are now genuinely answered (F2 by schema, F3 by deletion plus a block AST).
F1 is answered at a stated, accepted price (U1). F4 is answered with arithmetic that reverses her
reading — A's precious half is prose, prose costs three cents a year, and the meter goes on pixels — but
the tail risk in U3 is real and the answer is a narrower promise plus an escape hatch, not a
refutation. The product also got *smaller*: one language, one permission dimension and one temporal
axis removed, and the slice honestly cut into three.

**Where it is still soft.** Three places, in order.

First, **U2** — the differentiation bet on GM workload is unmeasured, and the Stub Sprint is an
argument rather than evidence. That is the softest thing in the candidate now, because it is the axis
K4 is judged on.

Second, **the block AST (F3b) is the largest single cost in this document** and it lands in slice 1a,
before there is any content to justify it. It is correct, it is unaffordable later, and it will look
like over-engineering to anyone pricing 1a in isolation. Hephaistos should price it explicitly and
Apollon should expect it to be the item that gets argued about.

Third, **§8.3 remains untouched** — clause migration inside a five-year world. Nemesis conceded she
could not beat Pythia's framing and neither can I; `bearer` adds one more field to that migration
surface, which makes it very slightly worse. It stays the failure mode most likely to lose the user at
the moment they are most valuable, and it is a round-3 problem that should be *named* in round 2 rather
than discovered.

The thesis was never the problem. It is now specified well enough to attack again on different ground.
