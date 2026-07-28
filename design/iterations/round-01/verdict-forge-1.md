# Round 1 — Verdict

Apollon's oracle, 2026-07-27. Inputs: `product-A.md`, `product-B.md`, four spikes,
`attack-A.md`, `attack-B.md`, `features-A.md`, `features-B.md`, three independent judge votes.
Output: `CHAMPION.md` (v1) and the two theses for round 2.

---

## 1. The scores

| Lens | A — The Living Codex | B — The Table Engine | Lens winner |
|---|---:|---:|---|
| **Product & the flex** | **8** | 5 | A |
| **Engineering & buildability** | **8** | 5 | A |
| **Market & differentiation** | **8** | 4 | A |
| **Total** | **24** | **14** | **A, 3–0** |

No split to preserve on the *winner*. Every lens ranked A above B, and no lens put them within
two points. The margin is decisive on paper.

The margin is also the least interesting fact in this document. What matters is that three judges
reached the same verdict for three incompatible reasons, and named three different things that
would reverse it — none of which has been measured.

---

## 2. Where the judges disagreed — and what that disagreement means

### 2.1 They agreed on the winner and disagreed on the wound

Each lens named a *killer objection* against A. They do not overlap. They are not three
descriptions of one hole; they are three holes.

| Lens | A's killer objection | Where the evidence stands |
|---|---|---|
| Product | The flex is rationed by prep. Every `R` in the worked example presses against one of nine passages staged during eleven minutes of prep. Session 15 goes off-script → zero staged passages, zero flex. And the Sealed Trace fix makes derivations private by default, so "wait, the plus two is a link?" now needs a shared screen. | `features-A` U1 and U2 concede both. Unmeasured. |
| Engineering | Slice 1a ships a block-AST rich-text editor and **no artifact in the round has a cursor in it**. Both A spikes are read-only renderers over hard-coded fixtures. The one capability 1a cannot ship without is the one capability nothing demonstrates. `features-A` calls it "the single most expensive item in this document" and never prices it. | Unpriced. Unspiked. |
| Market | A owns a defensible square and has shown no road into it. RB-11 names two growth engines — the visual rule-builder as go-to-market, and export *into* Foundry/Roll20/FG/UVTT at launch — and A ships neither. Slice 1's export is self-export. | The rule-builder is Forge stage 4. Rival-shaped export is not in any slice. |

**What that means.** A won on the strength of its substrate, not on the strength of its plan. The
substrate is genuinely the best idea produced this round and no judge disputed it. The plan has
three independent unpriced items, and each lens found a different one because each lens was
looking somewhere else. A round-2 forge that only polishes the substrate will improve nothing that
any judge actually complained about.

### 2.2 The one substantive contradiction: whose slice 1 is smaller

This is the real split, and it is buried in the engineering vote.

- The **product** lens: "NEITHER slice 1 ships a table… both cut maps, walls, fog, tokens." It
  treats both slices as equally incomplete against Kaya's sentence.
- The **market** lens: A's slice-1 emptiness is an *asset* — no map means A can be adopted
  *alongside* Foundry at near-zero switching cost, the Dungeon Alchemist pattern. B cannot,
  because you cannot run two live tables.
- The **engineering** lens says the opposite of what the other two assume: *"B's slice 1 is also,
  read narrowly, SMALLER than A's."* No rule engine, no wiki editor, no export, one skin. And its
  flip condition is the exact inverse of its vote: if the block-AST editor comes in above roughly
  six weeks, "B's slice 1 … is genuinely the smaller thing to build, and my lens inverts."

So two lenses treat A's thinness as strategy and one treats it as an unpriced bill. **They cannot
both be right, and the discriminator is a spike nobody built.** Do not smooth this. It is the
single most load-bearing unknown carried out of round 1, and it is cheap to resolve: one week, one
editor spike, and the disagreement collapses in one direction or the other.

### 2.3 A disagreement about what B lost

The product lens scored B a 5 and called its Lens split "a single static image with a built-in
second question… it photographs better than anything in A." The market lens scored B a 4 and
called it "defensible and unsellable." Same artifact, different verdict, because they price the
attack differently:

- Product lens: B lost a *sentence* (`the wiki is exhaust`) and kept a mechanism.
- Market lens: B lost the *reason to switch*. "GMs will not maintain a wiki, so ours writes
  itself" is a reason to switch; "our journals carry provenance metadata" is a feature.

The market lens is right about the sales consequence and the product lens is right about the
engineering residue. Both are compatible, and together they are the correct reading of `features-B`
Part 0: **B is the only candidate whose pitch is weaker after the round than before it, and whose
substrate is stronger.** That is exactly the profile of a candidate that should lose and be
harvested, which is what happens below.

### 2.4 The one thing all three agreed on unprompted

All three lenses independently nominated **B-M7's labour gate** as the thing to steal — instrument
the GM's own typing during one real four-hour session, green at ≤4 minutes total and no single
input interaction over 12 seconds. Three judges, three lenses, one convergent theft is the
strongest signal the round produced. It is grafted below and it is now a hard gate on the champion,
not an aspiration.

Second near-unanimous graft: `Grant.mode` as a property of the gesture (product and market lenses
by name; engineering lens implicitly, via B's trace unification).

### 2.5 The disagreement the judges did *not* have, and should have

Nobody noticed that **A inherits W2**. B's hardest weakness — the ledger records what the software
saw, not what the table knows — applies verbatim to A's Revelation log. Worse in A: in B a missing
Grant produced a wrong *display*; in A a missing Revelation produces a wrong *number*, because a
clause is live iff a live revelation exists. A GM who narrates a secret aloud without pressing `R`
has a character who mechanically does not know it. That is a silent mechanical error in the
champion's flagship mechanism, and it is unaddressed in `features-A`. It is carried into §5 below
as work order item 6, and B's honesty instrument is grafted as the partial answer.

---

## 3. The ruling

**Champion: A — The Living Codex.** Merged, hardened and grafted, it becomes `CHAMPION.md` v1.

### The reasoning chain

1. **Unanimous, and not close.** 24–14 across three lenses with no lens dissenting on the winner.

2. **B lost its thesis at the root; A lost nothing at the root.** Nemesis F1 proved a deterministic
   fold over a Beat cannot produce a world-sentence, and proved it with B's own artifacts: all 33
   claim strings in both spikes are hand-typed German literals, and B1's live write path prints
   `Der Projektor hat 0 neue Fakten … erzeugt` in its own status line. `features-B` Part 0 accepted
   this and struck the thesis sentences. A's four fatals, by contrast, clustered because they were
   one failure — `audience_kind` as stored state — and one schema change (the Reader Projection)
   closed F2 outright and made F1, M1, M2, M7, M8 and M10 tractable. **A candidate whose fatals
   share a root cause is a candidate with a fixable specification. A candidate whose fatal is its
   first sentence is lineage.**

3. **The direction of convergence is the ruling.** Pressed on the market axis, B became A: B-N2
   ("Die Fassung, die du liest" — the per-reader prose wiki) is candidate A's thesis arriving
   through the back door, and `features-B` concedes it is "the first thing in this round that makes
   the Wiki half earn its billing rather than ride along." A never became B. When adversarial
   pressure pushes one candidate onto the other's substrate and not the reverse, the substrate that
   attracted is the correct one.

4. **A's moat is protected by the incumbent's own strength.** Foundry cannot copy per-passage ACLs,
   a revelation log and knowledge-bound clauses without a breaking data-model change, and RB-05
   documents them abandoning the PixiJS v7→v8 migration mid-cycle *specifically* because 5,338
   modules made it too disruptive. The same anchor that froze their renderer freezes their schema.
   That is a structural moat with a demonstrated inability to close it, which is rarer than a
   feature lead.

5. **A ships both halves of Kaya's sentence today; B ships one.** A's spikes render a real
   encyclopedia article — typed infobox, addressable passages, wikilinks that degrade to plain text
   for readers who do not know the target. B's spikes contain zero prose pages. Neither ships a
   table, and that is charged against the champion in §5, not against the loser.

### The conditions under which this ruling is wrong

Three, each with a falsifier that can run in round 2. All three are currently unmeasured, and I
will not pretend the ruling is safer than that.

| # | The ruling is wrong if… | Falsifier | Consequence |
|---|---|---|---|
| **R1** | The block-AST authoring surface is expensive. | Build the editor spike: `[[` autocomplete, block reorder, per-block visibility, over the declared closed AST, no-innerHTML lint green, round-trip through export. Land it in a week → A is a 9 and the ladder is real. Turn it into a ProseMirror/Lexical adoption with a bidirectional model mapping owned forever → 1a is the vision in disguise. | B's slice was the correctly-sized thing to build. The champion must either buy an editor and own the mapping honestly, or shrink slice 1a to typed one-line Claims and defer prose. |
| **R2** | A's workload bet is false on the axis K4 judges. | Run the grafted labour gate on a real four-hour session with A's staging step counted, against Foundry/Roll20 prep-minutes-per-play-hour. Red = A's staging-plus-authoring tax at or above Foundry level. | B's session-first skeleton (Beats, proposal→commit, the three presence concepts, project-then-render) is the correct spine and the encyclopedia is a view built on top of it. The champion inverts. |
| **R3** | The champion cannot be adopted *beside* an incumbent. | Ship rival-shaped export (Foundry/Roll20/FG/UVTT) and Obsidian/World Anvil/Markdown import in the launch slice, not only self-export. If they slip past launch, the complement posture is fiction. | A becomes a head-to-head purchase against three free products at minute one, with an unphotographable hero screen, an unmeasured workload claim, and the go-to-market feature parked in Forge stage 4. B's narrow-but-uncontested square and answered reachability become the better bet. |

One softer condition, ruled rather than deferred: if Kaya rules that **K5 — WFC map generation,
sprites, game-engine feel — is the launch flex** rather than a round-3 bet, then A's structural
deferral of the entire tactical half is disqualifying and B's live-session plumbing is what a map
plugs into. Provisional call, logged for `OPEN-DECISIONS.md`: K5 stays a round-3 bet, and round 2
forks explicitly on it (§7, thesis B).

---

## 4. Grafted from the loser

B is lineage. Seven ideas move into the champion. Each is named with its origin so the lineage
stays legible.

**G1 — `Revelation.mode` and `source_ref` (from B's `Grant.mode`, B-F4).**
Mode is a property of the *gesture*, not of the world: `witnessed | told | read | inferred |
gm_fiat`, each with a real derivation string. Every `told` carries `source_ref`. This is the one
thing A genuinely lacked — A knew *that* Ossa learned §2 at 21:02 and could not express "Sela was
told this by an innkeeper who was lying." It costs one enum and one nullable ref on a row the
champion already writes. Two capabilities fall out for free: the **Rumour Graph** (a `told` chain
is a directed edge; "this rumour has reached 3 of 5 characters and 2 NPC factions") and
**Divergence** (B-N1: one GM-only keystroke renders every wrong or contested belief still held at
the table, and who holds it). Also grafted: `holder_ref` widens to `character | actor | audience`,
so NPCs and factions hold revelations and the streamer audience is a holder rather than a fourth
visibility scope.

**G2 — `standing` and the `Refute` action (from B-F4).**
`Passage.standing ∈ {open | contested | refuted}`, derived from the log via a `Refute(target, by)`
action the GM presses when the party exposes the lie. This finally makes A's §9.2 fire on time: a
clause on a refuted passage expires with a visible event on the sheet, and the derivation reads
*"this +2 came from a lie, sessions 14–19."* B deleted `confidence` because a fold cannot fill it;
the champion inherits that deletion. **A field a deterministic process cannot fill is deleted, not
defaulted.**

**G3 — The three exit gates, above all the labour gate (from B-M7).**
Unanimously nominated. (a) **Labour gate**: the client instruments the GM's own typing across one
real four-hour session — green at ≤4 minutes total typing and no single input interaction over 12
seconds. (b) **Cold-read gate**: at session two, a player who missed session one answers "what does
your character know about X?" from their own book alone, GM silent, and learns nothing they should
not. (c) **Leak gate**: the differential test green at 8 characters × 40 passages × 3 states × 2
locales, plus an adversarial human hour. These replace `features-A` U2's confession with a
stopwatch. This is the only place in the round where a differentiation claim was made falsifiable.

**G4 — Control ≠ Attendance ≠ Presence (from B, Change 4).**
Three genuinely different facts: who may act as this character, who was *at* this session (users
and characters recorded separately), who has a socket open right now. Nemesis tried to collapse
them and could not. Correct in either candidate, expensive to separate later, and load-bearing for
the champion's Catch-Up Grant and its Blind Spots panel.

**G5 — Proposal → Commit as the engine's default shape (from B, Change 2).**
`defeat_pending` generalised: every consequential outcome is compute → show trace → human commits.
This unifies the champion's reveal preview/commit/abort, the Canon Diff's accept/discard, retraction
and any future combat console behind one mechanism, and it is the best structural work either
candidate produced. Carried with it: `origin_beat_id` on item instances (a looted sword has a
history because the loot was an action).

**G6 — Construction, not subtraction, plus the Leak Bench (from B-F3, B-F3b).**
The player payload is *constructed*, never derived from a GM object graph: no spread, no
`Object.assign`, no `delete`, no shared graph, and the player payload type has no field able to
hold GM text — so `b.pub || b.d` does not compile. Merged with A's own M2 discipline into one gate:
typed allow-list per role, plus differential twin testing (two worlds identical but for one secret;
player payloads byte-identical). B's own artifacts leaked three independent ways at a scale of four
characters *inside the surface built to prove they did not*, and A's two spikes both shipped a
withheld-count leak in prose. Policy demonstrably fails here; types and byte-diffs do not.

**G7 — Reachability with a named falsifier, and B's competitive sentence (from B-M8, §4).**
A answered reachability with storage arithmetic (the Split Bill). B answered it with the *binding*
constraint: relay CPU and socket count, ~€25–40/month fixed, plus a named unrun spike — 50
synthetic tables × 5 clients on one 4 vCPU node, measuring sockets, p95 commit latency and CPU,
before slice 1 exits. Both halves are grafted. And the copy, verbatim, because it is the sharpest
competitive sentence produced this round and it is grounded claim-by-claim in RB-01:
> *Every one of them models who may see this document. None of them models who learned this fact,
> when, and from whom.*

**Also grafted, smaller:** B-F1b's **honesty instrument** — the register is titled *Erfasst*
(Recorded), never *Weiß* (Knows), with a permanent caption, and the engine reports what it did and
did not do after every commit. The number that shamed B1 (`0 neue Fakten`) is the number that makes
the product trustworthy, and the champion needs it *more* than B did (see §5.6). And B-M2's
**dense coverage strip** (`belegt n/4 · M B S O`, hue + initial + glyph + title, colour never
load-bearing) as the champion's who-else-knows indicator at tables above four characters.

**Explicitly not grafted:** the exhaust thesis (dead at the root), the Chronicle Pass as an
end-of-session ratification mode (B deleted it itself; the champion's Canon Diff is already
zero-proposal in slice 1), `Grant.confidence` (deleted), the broadcast/`Sendefreigabe` scope
(replaced by `holder_ref: audience`), and B-M4's immutable-publish-plus-bounded-recompute — the
champion is not event-sourced on the primary write path and must not acquire that bill.

---

## 5. Still unresolved — the work order for round 2

Neither candidate answered these. Ranked by what would hurt most if discovered in round 4.

1. **The authoring surface is unpriced and unspiked.** Ruling condition R1. Nothing in this round
   has a cursor in it. This is the largest single unknown in the champion and the cheapest to
   resolve. **Round 2 owes the editor spike.**

2. **GM workload is claimed, never measured** — on the exact axis (K4 axis 1) the champion bets on.
   `features-A` U2 admits the claim is "felt." The grafted labour gate exists precisely to make it
   fail. **Round 2 owes minutes-of-prep-per-hour-of-play against Foundry and Roll20 with the
   staging step counted, and one instrumented session.**

3. **Clause migration inside a five-year world.** Untouched by both candidates, conceded by both
   the attack and the hardening pass. Independently versioned vocabularies, declared migrations
   with dry-run diffs, and inert-with-marker degradation make an upgrade *inspectable*, not safe.
   A GM who upgrades and finds 300 flagged paragraphs of her own prose is still furious. `bearer`
   and `standing` each make the surface very slightly worse. **This is the failure mode most likely
   to lose the user at the moment they are most valuable.**

4. **Neither candidate ships a table.** Kaya asked for a Foundry-grade live table. Slice 1 has no
   map in either candidate, and the champion's claim that "a Scene is an article with a map" has
   never been tested against walls, fog, vision or tokens. When the tactical half arrives, what it
   costs, and whether the codex substrate actually absorbs it are all open. **Round 2 forks on
   exactly this (§7).**

5. **Go-to-market.** RB-11 names two engines: the visual rule-builder as go-to-market (Forge stage
   4 in the champion; Alchemy's no-code Sheet Builder is already in open beta, so the market is
   ahead of us today on K2's first half) and rival-shaped export at launch (not in any slice).
   Ruling condition R3. **Round 2 owes a position on both, in the slice plan, not in prose.**

6. **The champion inherits W2 and it is worse here than it was in B.** The Revelation log records
   what the software saw. A GM who narrates a secret aloud and presses nothing leaves a hole — and
   in this product the hole is not a display error, it is a clause that silently does not fire.
   The honesty instrument (G-extra) and the Improv Capture key narrow the gap; neither closes it.
   **Round 2 owes a stated rule for what happens when the fiction and the projection disagree, and
   the champion must never present a reader's book as complete.**

7. **The thumbnail.** A knowledge graph does not photograph. N1 the Chronicle is the best answer
   available and it is still not a TaleSpire diorama, against a category whose currency on Steam
   and on subreddits is dioramas. The growth channel remains a 30-second video plus creator word of
   mouth. Unsolved, honestly named, and one of the two things thesis B in §7 exists to attack.

8. **Cold start.** The value curve crosses the competition around session four in a market that
   decides at minute one. Session Zero interview, Obsidian/World Anvil import and a seed world are
   palliatives. The Stub Sprint and the Chronicle are better than nothing and neither is a cure.

9. **The hosting tail.** No one-time payment funds indefinite hosting. Three cents a year is not
   zero and neither is a decade. Static Codex Export makes the honest half of the promise real
   ("your world opens without us if we do not exist"); the other half is a bet on our survival.

---

## 6. What actually improved this round

There was no previous champion — this is round 1 and the baseline is the intake. So the honest
measure is: *did the round produce more than two documents and a coin flip?*

**It did, in four specific places, and I will name what it did not do first.**

What did **not** improve: the fork was less orthogonal than it looked. Wiki-first vs table-first
sounded like two philosophies and behaved like one, because under adversarial pressure B re-derived
A's substrate (B-N2) while A never re-derived B's. Two candidates that converge are, in part, one
candidate forged twice. Round 2's theses must fork somewhere the champion is genuinely undecided,
which is why §7 abandons this axis entirely.

Also unimproved: **the table**. The round spent four artifacts, two attacks and two hardening passes
without either candidate advancing the half of Kaya's sentence that says "Foundry-grade live table."
Both cut it. Both were right to cut it from slice 1 and neither priced its arrival. That is a
reshuffle, not progress, and it is the reason thesis B exists in §7.

What genuinely improved:

1. **One structural idea per candidate survived attack and became load-bearing.** A's **Reader
   Projection** (materialised per-character revelations plus a bitmap) deleted a fatal outright and
   made five other findings tractable — the single highest-leverage move in the round. B's
   **proposal→commit as the engine's default shape** and the **three presence concepts** are
   correct regardless of who won, and both are now in the champion.

2. **Two theses died honestly.** "The wiki is exhaust / nobody wrote a word of that" was killed by
   its own artifact's status line, and `features-B` struck it rather than patching it. That is the
   process working: the round cost B its pitch and gave the champion `Grant.mode`, which is the
   trade a losing candidate is supposed to make.

3. **The round produced enforcement mechanisms, not just intentions.** Unrepresentability as a
   discipline (a Sealed Trace as a sum type; a `ReaderProjection` with no `total`; a player payload
   type that cannot hold GM text) plus the differential byte-diff test plus three exit gates that
   can go red. Both authors shipped a withheld-count leak *in prose* while boasting nothing leaked
   — which is the round's proof that eye review fails and types do not.

4. **Scope came down.** The champion removed an entire user-authored query language, one permission
   dimension, one temporal axis, optimistic reveal, and B removed the Chronicle Pass, `confidence`
   and the broadcast scope. Four of five fatals on each side were answered by deletion or by a type.
   A round that only adds is a round that made the product harder to ship; this one subtracted.

**Net:** a real round, with one honest caveat — the champion's three biggest unknowns (the editor,
the workload number, the channel) are all exactly as unknown as they were at the start. The round
hardened the substrate and did not touch the bill.

---

## 7. Round 2 — the two theses

The wiki-vs-table fork is exhausted. The champion is genuinely undecided on a different question,
and it is the question every judge circled without naming: **where does the loop close?** In an app
someone else already owns and paid for, or entirely in ours?

Both theses take `CHAMPION.md` v1 as their spine. They diverge on reach vs. depth, and they die to
different attacks — which is the test.

### Thesis A — **Der Beiwagen** (The Sidecar)

> The champion never grows a tactical half. It is the world that plugs into the table you already
> own — importing from Obsidian, World Anvil, Markdown and UVTT; exporting into Foundry, Roll20,
> Fantasy Grounds and plain HTML; adopted *beside* the incumbent at near-zero switching cost.

The bet: the unwinnable ecosystem war does not have to be fought. Dungeon Alchemist reached €2.46M
from 57,209 backers by exporting *into* every rival. The flex stays the derivation that cites a
sentence and the article the server renders per reader; the map stays Foundry's problem forever.
Slice 1 grows a Foundry module and a Roll20 bridge instead of a renderer. Every player is free;
the GM's licence is one-time; the codex is a URL a player opens on a phone on Tuesday.

Attack surface it must survive: can a companion own the loop, or does the mechanical clause die the
moment the sheet lives in someone else's app? Can you charge for a sidecar? Does "adopted alongside"
mean "abandoned first"? Does the fusion still exist if half of it runs in Foundry?

### Thesis B — **Der ganze Tisch** (The Whole Table)

> The champion grows its own tactical half fast, and fog of war for the map and fog of war for the
> world become the *same verb*. The scene knows what everyone knows: a wall, a token and a passage
> are three audiences of one reveal, and the map is a view over the codex rather than a thing
> attached to it.

The bet: the category is called virtual tabletop, the thumbnail problem is fatal, and the only way
to buy the photograph is to build it. Pull the renderer, UVTT import, tiled loading and eventually
WFC forward; make the hero screenshot a lit scene whose fog is per-character knowledge, not a
per-user boolean. The Chronicle becomes a *visual* artifact. K5 is promoted from round-3 bet to
launch flex.

Attack surface it must survive: two products' worth of engineering for a solo dev with an AI crew —
the exact cost `product-A.md` §8.8 confessed and nobody priced. Foundry's decade of walls, vision,
lighting, Regions and elevation. A slice-1 blowout. And the question of whether a beautiful map
that knows who knows what is actually better than a beautiful map, to anyone who has not played
four sessions.

They lose to different attacks: the Sidecar dies to *"you cannot own the wallet or the loop,"* the
Whole Table dies to *"you cannot build it."* If round 2 comes back with both surviving, the fork
was real.

---

*Apollon, round 1. The oracle read four artifacts, two attacks, two hardening passes and three
votes, and the honest summary is short: the substrate is settled, the bill is not. A world you
keep, exercised by a table — and the table is still a promissory note.*

> *Drei Richter, ein Urteil, drei verschiedene Wunden.*
> *Was hält, ist der Stein; was fehlt, ist der Preis.*
