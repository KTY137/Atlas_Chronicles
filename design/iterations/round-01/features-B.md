# Feature Response — Candidate B, „The Table Engine" (second pass)

Feature Architect · 2026-07-27 · design round 1, answering [`attack-B.md`](attack-B.md) (05:14)
Target: [`product-B.md`](product-B.md) (04:01) · artifacts [`spike-B1.html`](spike-B1.html), [`spike-B2.html`](spike-B2.html)
Corpus: [`00-intake.md`](../../00-intake.md) · [`01-attack-plan.md`](../../01-attack-plan.md) ·
[`02-domain-model.md`](../../02-domain-model.md) · [`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) ·
`research/RB-01-*`, `RB-05`, [`RB-11`](../../research/RB-11-steam-vs-browser-verdict.md)
Superseded predecessor: [`features-B.superseded-0335.md`](features-B.superseded-0335.md) — that pass
answered the 03:25 attack against the 02:23 candidate.

---

## How to read this

Nemesis's own summary is the correct one and I adopt it rather than arguing with it:

> *None of the four fatals argues against event sourcing. All four argue that the candidate has not
> finished writing the write path it claims is its only one.*

So this document finishes the write path. It is not a defence; it is four schema moves and one
gesture, and everything else in it falls out of those five things. The order below is the order of
dependency, not the order of severity: **S1 → S2 → S3 → G1**, then the majors, then three new
capabilities, then what I am removing.

The rule I held myself to: **a fatal answered by a promise is not answered.** Every entry states
what exists in the product, what the user sees, what the server enforces, and what it costs. Where I
could not do that, the break is in *What I could not answer* with the reason, and I would rather
lose the round on three honest residues than win it on three sentences.

**Costs:** small ≈ ≤ 3 days · medium ≈ 1–2 weeks · large ≈ 3+ weeks, for one builder, against the
event-sourced baseline the candidate already accepts (W3).

**I verified in source every artifact claim I build on**, not her summary of it:
`spike-B1.html` L1110–1130 (`Math.max(0, before-dmg)`, `if(t.hp === 0) t.pend = true` — the clamp
and the derived boolean, both as reported), L1157–1161 (`s.claim` constructed whole, predicate and
all, inside beat 7's `apply()`), L1223–1232 (`project()` skipping both `reverted` and `proposed`),
L1936–1953 (`render(); syncClients(11);` **before** `$("#reasonWrap").hidden = false`),
L1966–1977 (`restoreBeat12()` re-committing and re-broadcasting), L1267–1270 (`feGaussianBlur
stdDeviation="11"` as the fog mask filter);
`spike-B2.html` L1047–1055 (beat 411 `wit: "all"` while claims f2/f6 carry disjoint `holders`),
L1025–1045 (f2 holders `["sela"]`, f6 holders `["mira","ossa"]` — two holder sets, one beat),
L1367–1390 (`project()` allow-listing facts correctly), L1392–1406 (`visibleBeats()`'s own comment
naming the leak class and then implementing `wit: "all"` anyway). **F3 is reproducible exactly as
written and it is structural, not a fixture typo.** I confirmed that myself before designing against
it.

---

# Part 1 — The spine: three schema moves

## S1 · Zones and `ScenePresence` — the fourth presence concept

**Answers:** F2 (`witness_character_ids[]` has no deterministic source).
**Cost: medium.**

`02`'s Control / Attendance / Connection triad is right and Nemesis conceded it as a distinction.
What is missing is not a fix to those three; it is a fourth, and it is the one that has a *place* in
it rather than a *permission*.

```text
Zone          (id, scene_id, name, kind: room | area | offstage,
               derived_from: uvtt_partition | gm_drawn | implicit_default, geometry?)
ScenePresence (game_session_id, actor_id, zone_id, from_beat_id, to_beat_id?)
```

**What exists in the product.**

1. **Every scene has at least one zone.** The `SceneChange` beat creates `main` if nothing else
   exists, and puts every attending character in it. So the zero-effort path is horn (a) — everyone
   witnesses everything — *by explicit written default*, not by accident.
2. **On a Tactical scene the zones are free.** Slice 1 already imports UVTT walls, doors and windows
   losslessly (§7.3). A planar flood fill over that wall graph at *import time* partitions the floor
   into rooms — doors are portals, windows are portals flagged `sight_only`. This needs no LOS, no
   raycast and no runtime geometry: it is one offline pass over data we are already parsing, and it
   produces exactly the object F2 says is missing. **The room graph is a by-product of the import
   RB-05 rates at days.**
3. **Token movement already emits a beat.** When a token crosses a zone boundary, that same movement
   beat carries the presence transition. **Zero additional GM labour on the tactical recipe** — she
   is dragging the token anyway.
4. **On a Cinematic or mapless scene there are no coordinates**, so zones are chips: the Ledger Bar
   shows *„Kontor: Sela · Mira | Nebenraum: Ossa"*. Dragging a portrait between chips is one
   gesture, and it happens **per movement of fiction — three to six times a session — not per
   beat.** That is the whole difference between F2's horn (b) and a usable product: the multi-select
   is not on the most frequent write, it is on the rarest one.
5. **The witness set is computed and never typed:**

   ```text
   witness(beat) = ScenePresence(zone_of(beat.origin), at beat.seq) ∩ attending(session)
   ```

   The beat persists both the computed set **and** `witness_source: zone | all | gm_narrowed`. That
   makes R2 implementable, which is the finding: every witness set is reproducible from persisted
   state alone, and where the GM overrode it, the override is itself recorded as the source.

**What the server enforces.** The witness resolver runs server-side and is the *only* writer of the
audience on a beat effect (S2). A client may propose an override; it may not compute the set.

**What the GM sees, and this is the part that makes horn (a) honest rather than hidden.** The
Curtain Check gains one line:

> *„Diese Szene hat einen Raum. Jeder Beat wird von allen Anwesenden bezeugt. [Raum teilen]"*

One click splits it. The GM is never surprised by permissive witnessing, because the app told her
before the session started.

**Why sensible tonight.** It costs one table, one flood fill over an import we already ship, and one
resolver. It removes the two horns Nemesis named by making one of them the stated default and the
other a rare gesture. And it is the substrate for per-player fog later (see *Kills*), so it is not a
one-purpose table.

**Invariants.** 1 — the resolver is server-side and its output is an omission decision, never a CSS
one. 6 — `witness_source` is the derivation string for "why did Ossa not get this?", answering the
question the GM will actually ask.

---

## S2 · Beats carry no prose; the audience is on the *effect*, not on the beat

**Answers:** F3 (one witness set is coarser than per-claim grants; the withheld claim is delivered on
the same screen that omits it). **Also closes the aria-label limb of invariant 8.**
**Cost: medium–large.** It is the write path. It replaces work rather than adding it.

This is the change I would keep if I were allowed only one.

### The two rules

**Rule 1 — `Beat.summary` does not exist. There is no cross-scope sentence anywhere in the system.**

A beat carries typed payload only. The sentence a human reads is produced by a **`BeatRenderer`**: a
declarative template in the rule package (with first-party defaults per beat type), evaluated
**per recipient, against that recipient's grant set**. One function:

```text
render(beat_effect, viewer_grants, locale, skin) → string
```

The screen-reader string is that function's output. The visible string is that function's output.
The `aria-label`, the `title`, the `alt` and the `say()` announcement are that function's output.
**There is no second string in the product**, which is the durable rule and the only one that makes
F3 unrepeatable rather than fixed-once.

**Rule 2 — `Beat.witness_character_ids[]` is deleted. Audience moves down one level.**

```text
Beat       (id, …, channel, package_id, package_version, status, parent_beat_id, …)
BeatEffect (id, beat_id, ordinal, kind, payload jsonb, audience_character_ids[],
            audience_source: zone | all | gm_narrowed | claim_holders)
BeatDelivery (beat_id, recipient_character_id, effect_ids[])   -- materialised, indexed
```

Beat 411 in `spike-B2.html` does two things at once — creates claim f6 (holders `mira, ossa`) and
flips f2's `standing` (holder `sela`). Under S2 it is **one beat with two effects and two
audiences**, and `audience_source: claim_holders` derives each one from the claim it touches. Bjorn
holds neither. `BeatDelivery` therefore contains no row for Bjorn, and:

- beat 411 is **absent** from his `BeatDelivery` fan-out — not greyed, not redacted, not delivered;
- therefore absent from his page's *„Was geschah"*;
- therefore absent from his Ledger Bar;
- therefore absent from the `aria-label`, because the chip does not exist;
- therefore absent from `say()`, because there is nothing to announce.

**A beat none of whose effects reach a recipient is not delivered to that recipient.** That sentence
is the fix, and it is one line of the transport contract.

### What the user sees

Nothing new, and that is the point — except one thing the GM sees and should: the Ledger Bar's beat
chips are **different lists on different clients, by construction**. The GM's *„Was am Tisch
ankam"* view (a `W`-adjacent panel) shows, per beat, which characters received which effect —
because the GM is the person who needs to know that the room does not share a reality.

### What the server enforces

`BeatDelivery` is computed at commit, server-side, from `BeatEffect.audience_*`. The transport
(`@chronicle/transport`, B5) fans out **per recipient from the delivery table**, never broadcasts a
beat and filters at the edge. Slice 1's leak gate (§7.9) extends: the raw socket frame authenticated
as player B must not *contain* an effect B has no delivery row for.

### Why sensible tonight

Because the alternative is a `wit` field that the candidate's own artifact already leaked through on
the first player identity tried, and because the per-recipient renderer is *also* what E1's
spoiler-correct recap, the Beat Clip's audience filter and `.chronicle`'s export scoping all need
anyway. Three named features were going to require this function; F3 only proves that the table half
requires it too. And it is a **saving** for W2: because payloads are typed and per-field rather than
smeared into prose, the crypto-shred surface is enumerable instead of textual.

**Invariants.** 1 — omission at the transport, not at the DOM. 8 — accessibility can no longer
outrun the projection, because there is one string and it comes from the projection. 5 — the
renderer is a declarative template, not a generator; no AI, no invented sentence.

---

## S3 · The migration is a beat, and the pin is frozen for the life of a session

**Answers:** F4 (the attack the candidate invited).
**Cost: small.** Nemesis costed it at two paragraphs and she is right.

### Three parts

**1. `PackageMigration` is a beat type.**

```text
Beat.type = "package.migrate"
payload   = { package_id, from_version, to_version, migration_id,
              transform_hash, affected_refs[] }
channel   = authoring
```

The declarative transform is content-addressed and vendored under B3, so a fold at any `seq` can
re-apply it byte-identically forever — including after the source registry is gone, which is the
same property B3 already buys for the rule engine. The fold is complete again, B3's *"undoable"*
becomes true rather than aspirational, and a dropped snapshot **can** be rebuilt (F4's second limb),
which restores the sentence *"snapshots are cache, never truth."*

**2. The pin is immutable while a `GameSession` is live.** Server-enforced: the upgrade endpoint
returns `409 session_live` while `GameSession.status = live`. The GM sees:

> *„aschenpakt-grundregeln 0.5.0 ist vorgemerkt. Sie wird beim Sitzungsende angewandt — mit Diff und
> Probelauf."*

The Curtain Check already lints *"a package upgrade pending"* (§3); it now has something real to
show. Queued upgrades are visible, diffable and cancellable all evening.

**3. The escape hatch, because a real bug at 21:50 needs one and forbidding it invites a
workaround.** One button: **„Sitzung unterbrechen und aktualisieren."** It closes session 12,
appends the `package.migrate` beat *between* sessions where it belongs, runs the migration's dry-run
against the projection, and opens session 12b with `continues_from = 12`. The fiction is continuous
for the table; the log is honest for the fold. Rewind across the boundary is then a cross-session
operation, which is already gated (M7 below).

**Why sensible tonight.** F4 lands on the happy path because §7 makes package upgrades and the
rule-builder launch-blocking and E2's growth engine *is* GMs promoting rulings into new versions.
This is not a defensive fix; it is the mechanism E2 runs on. Snapshot cadence pins one snapshot at
every migration beat (M7), so the expensive case is also the cheap case.

**Invariants.** 2 — the transform is declarative, hashed and vendored; no code executes. 6 — the
migration beat is the derivation for *"where did `heat` come from?"*. 3 — item template migrations
ride the same rail and cannot silently mutate instances (see M3).

**Tests.** R3 (`replay-across-migration`), R4 (`snapshot-drop-rebuild`).

---

# Part 2 — The gesture the fusion was missing

## G1 · The Claim Ribbon — `T` composes, one beat, and the second door is the Diff

**Answers:** F1 (the typed field no gesture creates).
**Cost: medium.**

Nemesis's fork is fair and I take it in the open: **a predicate is content, content has an author,
and the author is the GM.** So it gets a gesture, a measured price, and — the part that saves the
labour promise — **it is never on the critical path of play.**

### The gesture

The GM selects a passage (on a page, in the shelf, in chat) and presses `T`. A single-line composer
opens anchored to the selection, four slots, all keyboard, no modal:

| Slot | Behaviour | Typical cost |
|---|---|---|
| **Subject** | Pre-filled from context — the entity whose page, token or portrait is focused. In the worked example: Vaugn. | 0 s |
| **Predicate** | Combobox over the package's declared `Relation` vocabulary (`Relation` is already a universal primitive in `03`). Type-ahead, 1–3 keystrokes. | ~2 s |
| **Object** | Autocomplete over the campaign entity index (M10), with **„Stub anlegen"** as the top fallback — stub-on-mention already exists, this reuses it. | ~2–3 s |
| **Recipient** | Drag onto a portrait, or `Enter` → the audience picker pre-filled with the zone's presence set (S1). | ~1 s |

`Enter` emits **one beat** with two effects: `claim.create` (audience: the claim's holders) and
`grant.create` (audience: same). `Claims.created_by = gm`, `source_beat_id` set. Refute, Blame and
E1's recap now have the typed object they point at, and it has provenance.

### The floor, which is the honest half

**Predicate is nullable, forever.** If the package declares no relation vocabulary, or the GM presses
`Enter` on an empty predicate, the claim is stored with `predicate = null` and `text = the selected
passage`. It is still a first-class Claim: it has holders, a standing, a source, a mode, a beat and a
page. **The typed half is an enhancement; the untyped half is the floor**, and a system-agnostic
product must work on the floor. This is the same discipline as §6's deletion of `confidence`, applied
forwards.

### The second door — and this is what saves the labour promise

Every untyped claim appears in the **Session Diff** at 22:10 with one row: *„Passage von Vaugn →
Sela · [typisieren]"*, predicate and object composed with nobody waiting. Two consequences:

- The at-table cost of the typed half is **optional**. A GM who is running a fight types nothing and
  loses nothing except structure she can add in ninety seconds later.
- §2's worked-example table gains the sixth row Nemesis asked for, stated honestly:
  **„das Prädikat tippen: deins, ~5 s am Tisch oder ~3 s im Diff."**

### The gate, re-specified so the thesis is falsifiable

§7's labour gate becomes:

> **Green at ≤ 4 minutes of total GM typing across one real four-hour session, *including* claim
> composition, with no single input interaction over 12 s and a stated budget of ≤ 20 typed claims
> per session.** Red means the typed half is a between-session activity, and §2's *"that page cost
> zero minutes of maintenance"* is struck the way §0 struck *"the wiki writes itself."*

I will not claim the gate passes. I claim it is now the *right* gate and that it can fail.

**Invariants.** 2 — the relation vocabulary is declarative package data. 6 — the claim's derivation
is its beat. 5 — no generator anywhere near this; the GM types the noun or nobody does.

---

# Part 3 — The majors

## M1 → A1 · Undo is a Proposal until the reason is committed

**Cost: small.** Test R5.

`Ctrl+Z` creates a **local** `revert.proposed` projection on the initiating client only. The other
four clients receive nothing — not the revert, and deliberately **not a „die Spielleitung tut
gerade etwas"-indicator**, because that is itself a tell. The reason composer is part of the same
surface, and `Commit` (or `Enter`) is what broadcasts.

Four seconds survives because the reason costs a click, not a sentence: the composer opens with a
chip row of the four reasons that cover almost everything — **„falsch platziert · falscher Wurf ·
falsche Regel · Regie-Entscheidung"** — plus a free-text field. One chip, `Enter`, done. `Escape`
discards the proposal with **no beat and no broadcast**, so the cat on the keyboard costs nothing and
the table never sees the fireball un-happen and re-happen.

The composer is a real `role="dialog" aria-modal="true"` with focus containment, no
`pointer-events: none` on the wrapper, and focus moved **synchronously** — the 180 ms `setTimeout` in
`spike-B1.html` L1951 is a race, not a transition.

**Why sensible.** It is the candidate's own `Proposal → Commit` mechanism (§6 Change 2) applied to
the one action that skipped it, so it costs no new concept, and it makes the same ruling as M7's
"scrubbing is local preview" — one rule, two features.

**Invariants.** 1 — a local projection is not a permission decision; the other clients simply have no
new state. 8 — the dialog is a dialog.

---

## M2 → A2 · `PendingOutcome` is projected state with two explicit exits, and resources have a floor

**Cost: small–medium.** Test R6.

```text
PendingOutcome (id, actor_id, kind, opened_by_beat_id,
                closed_by_beat_id?, resolution: confirmed | waived)
Resource.floor      : number | null      -- package-declared, may be negative
Resource.pending_at : expression         -- package-declared, not hard-coded 0
```

Three fixes, one per limb:

1. **It cannot evaporate.** A `PendingOutcome` is opened by a beat and closed **only** by an
   `OutcomeConfirmed` or `OutcomeWaived` beat. Jarn heals Vaugn for 1 and the chip does not vanish —
   it re-labels: *„geheilt auf 1 KP · Niederlage weiterhin offen"*, which is the correct and the
   interesting state. The Curtain Check's *"any defeat_pending left open"* lint now has something to
   find, and the Record has a resolution event to show.
2. **Negative health is representable.** `Math.max(0, …)` is deleted. The floor is package-declared
   and may be `-Con`, `null` (unbounded) or `0`. Death-saves and massive-damage thresholds become a
   package concern, which is what system-agnostic means.
3. **"Visible but unconfirmed" has a home that is not `Beat.status`.** Pending outcomes are
   *projected state*, so they render on every screen; `proposed` beats stay unfolded exactly as
   `project()` does today. The two concepts are separated by name before code exists, in the spirit
   of §6 Change 4 — which is the one habit of this candidate worth keeping unconditionally.

**Why sensible.** This is the limb that attacked §6 Change 2's claimed saving. The saving survives:
`Proposal → Commit` still unifies preview, diff triage and rewind. `PendingOutcome` is not a fourth
mechanism, it is the *output* of one — but it is a row, not an arithmetic coincidence.

**Invariants.** 4 — restored properly; the confirmation is no longer skippable by any arithmetic that
moves the number off zero. 6 — both exits are beats with reasons.

---

## M3 → A3 · `Beat.channel` and content-addressed template revisions

**Cost: medium.** Test R7.

**Limb A — the story stops being polluted by prep.** `Beat.channel: play | authoring | system`.
*„Was geschah"* renders `play` only. The **Changelog** tab on the same page renders all three —
nothing is hidden, and an item's authoring history is genuinely wanted, just not in its story. One
enum, two filters, same log.

**Limb B — templates are versioned in the fold, which is where invariant 3 actually lives.**

```text
ItemTemplateRevision (template_id, rev, hash, body jsonb, created_by_beat_id)
ItemTemplate.head_rev → ItemTemplateRevision
ItemInstance.template_rev_hash                 -- pinned at creation
```

A template edit is a **new revision, never a mutation**. A fold at `seq N` resolves `head_rev as of
N`, so Wednesday's damage change cannot retroactively rewrite Saturday's record and Blame cannot show
a derivation that never happened. Existing instances stay pinned to the revision they were created
under until the GM explicitly re-baselines them — one beat, diffable, per-instance or bulk, with a
preview of what changes.

**Why sensible.** §6 pins the rule package version per beat and says nothing about campaign-local
content, and templates *are* campaign content. This is the same idea one scope down, it costs one
table, and it is the difference between W3's *"the sheet says 14 and the wiki says 12"* being a
nuisance and being a hard-invariant violation.

**Invariants.** 3 — given teeth: template edits provably never mutate instances, and now the *record*
of an instance is safe too. 6 — a derivation renders against the revision it was computed under.

---

## M4 → A4 · Path 3 is renamed, disclosed, and encrypted where we honestly can

**Cost: small** (rename, disclosure, media key) **+ a deferred medium** (Path 3b) **with its bill
written**, exactly as Path 4 is.

Nemesis is right that §4's closing sentence is false as written, and I am not going to argue it.
Four moves, and the fourth is the honest one:

1. **Path 3 is renamed „Relayed room" and it says what it is at connect time**, using §4's own
   admirable Path-2 pattern — the one Nemesis conceded as the template B8 says it is:
   > *„Deine Spielenden erreichen dich über unseren Relay. Deine Daten liegen bei dir; unterwegs
   > laufen sie über unsere Server."*
   Same sentence in room settings, in the docs, and in the privacy notice.
2. **The bytes we can encrypt cheaply, we do.** Media is content-addressed and encrypted client-side
   under a per-campaign key held by the GM host and handed to approved players inside the
   already-authenticated join. Media is ~95 % of the bytes in §4's own table, so this is the large
   half of the confidentiality problem for a fortnight-free price.
3. **What the relay is, stated as properties we can actually hold:** it persists nothing (memory-only
   forwarding, TTL'd rooms), logs no payloads, and its retention is a published number.
4. **Beat payloads are relay-visible in v1 and we say so.** Real E2E for beats is **Path 3b**, and
   its bill goes on the page beside Path 4's: an out-of-band join secret in the URL fragment (never
   sent to the server), a per-room key wrapped per player, key rotation on player removal, and a
   support surface forever. Deferred, priced, not promised.

**And §4's sentence is rewritten:**

> *She gains sovereignty over storage and continuity. She does not gain confidentiality from us until
> Path 3b. **Path 2 (LAN) is the only path where we are not in the middle — which is why it ships in
> v1.***

**Why sensible.** Because the alternative is selling a word we cannot deliver, on RB-11's own named
attack target. The residue is in *What I could not answer*.

---

## M5 → A5 · The slice splits, and the exit criterion is repaired

**Cost: negative.** This entry removes work.

Nemesis raised M7 in the previous pass and it was not closed. It is closed now by cutting, not by
renaming.

**Slice 1 — „One encounter, rewound", literally.**
Hosted room + accountless join with GM approval · Tactical + Outline recipes · static uploaded map ·
UVTT import (walls as **collision only**, see m3) · **shared reveal-brush fog only** (see *Kills*) ·
initiative · the action pipeline over the demo package with preview → trace → commit ·
`PendingOutcome` · `Ctrl+Z` rewind as proposal-commit · Blame · the differential leak harness · two
skins + high contrast + reduced motion + axe-core + NVDA/VoiceOver · `.chronicle` round-trip in CI.

**Out of slice 1, into slice 2:** the Record's structured half entirely — stub-on-mention, Claims,
Grants, the Claim Ribbon, `ScenePresence` zones, per-recipient beat rendering, filtered *„Was
geschah"*, backlinks, `[[ ]]` autocomplete, the prose field, `T`/`W`, the Session Diff, and Replay.

**Slice 2 — „Die Seite, die niemand getippt hat"**, with its own gate: the leak gate at
8 × 40 × 3 × 2 plus the adversarial hour, and the retrieval gate from M10.

**The exit criteria, fixed so they can be met by their own contents:**

| Slice | Exit criterion |
|---|---|
| **1** | Kaya runs a **90-minute one-shot of the demo system** with four real humans. Somebody makes a mistake and it costs four seconds instead of four minutes. Not "a real campaign session" — slice 1 has no sheets beyond the demo package, so that criterion was unmeetable by construction. |
| **2** | Kaya runs a **real campaign session**, presses End Session, spends ≤ 90 s in the Diff, and closes the laptop on entity pages nobody typed. This is §7's original criterion, moved to the slice that can actually deliver it. |

**Why sensible.** S1 and S2 make the Record *more* expensive, not less, and they are prerequisites
for it being correct. Shipping a correct table first and a correct record second is the only ordering
where neither is shipped wrong.

---

## M6 → A6 · The Ruling Card: name now, count by gesture, formalise at a desk

**Cost: small** (card + counter) **+ medium** (Diff formalisation row + trigger pre-guess).

Nemesis is right that composing an AST in combat is authoring a rule with an audience waiting, and
right that the artifacts show a ruling as a string. So E2's chain is re-cut at the honest joint —
and it survives, because the link that matters is not the AST, it is the **count**.

**At the table, `R`:** a one-line card with a name (free text) and one **scope chip** taken from what
is already selected — *dieser Charakter · diese Aktion · diese Szene · Kampagne*. ~6 s. It emits a
`Ruling` beat with `expression_ast = null`, `status: informal`.

**The fire count is a gesture, not an inference.** The ruling lives as a chip in the Ledger Bar while
it is warm; when the situation recurs the GM presses it. One keypress, one beat, `fire_count++`. **No
AST is needed for E2's growth signal to be real** — and a count of deliberate presses is a *better*
signal than an inferred one, because it cannot be gamed and it cannot be wrong.

**Formalisation happens in the Session Diff and in the Forge, never in combat.** The Diff shows:
*„Deckung halbiert Flächenschaden · 3× · [formalisieren]"*. The Forge's rule-builder then opens with
the trigger **pre-guessed from the beats it fired on** — which action types, which target kinds,
which resource — because those fire events are beats with typed payloads. That is the pre-fill E2
promised, derived rather than asserted.

**E2's claim, restated honestly:** rulings are not born as AST. They are born as *named, counted,
scoped intentions*, and the AST arrives at a desk with nobody waiting. The chain
(`intention → count → formalise → publish`) still reaches the registry, and invariant 2 is still
preserved by construction, because formalisation writes into the same closed AST the engine already
evaluates.

**Round-2 consequence, stated as a commitment rather than a hope:** the artifact for candidate B in
round 2 is **the Ruling Card and the Forge formalisation screen**, not another table spike. That is
the one artifact that would move M6 and M14 at the same time, and its absence is the fair core of
both findings.

**Invariants.** 2 — informal rulings carry no expression at all, so there is nothing to execute; a
formalised one is AST-only.

---

## M7 → A7 · Four numbers on the rewind, and the map hot path is cleared

**Cost: medium.** This is a written performance budget, and it becomes a slice-1 gate.

| Question §7 never answered | The answer, stated |
|---|---|
| Local or table-wide? | **Scrubbing is local preview. Only Commit broadcasts.** Same ruling as A1 — one rule, two features. The stage carries a *„Vorschau — noch nicht am Tisch"* banner while a preview is open. |
| Snapshot cadence? | **Every 100 beats, plus one at every session boundary, plus one at every `package.migrate` beat.** Worst-case fold: 99 beats. The migration snapshot is what makes R4 cheap. |
| Maximum depth? | **To the start of the current session, hard.** Cross-session amendment is not a scrubber gesture; it is an explicit flow in the Record with its own confirmation naming what cannot be un-known (W5). This is a social ceiling that happens to be a performance ceiling. |
| Cost at beat 5,000 with 300 tokens? | **A gate:** the scrub holds 60 fps on `03`'s reference laptop, or the flex does not ship. |

**The hot path, concretely fixed against `03`'s budget:**

- The scrubber renders **by diff, not by rebuild**: `project(n)` returns state, the renderer receives
  `diff(prev, next)` and touches only changed tokens. No full `innerHTML` table rebuild
  (`renderOutline`), no 300 concurrent rAF tweens (`renderGlance` — tweens run on **commit**, not on
  scrub).
- Input is **rAF-coalesced**: one render per frame maximum, never once per pointer tick.
- **Label placement is off the hot path entirely.** `labelPlace → occupied` is O(n²); it runs on the
  *committed* state in an idle callback. During a scrub, labels freeze — nobody is reading names
  while dragging a scrubber.
- **Fog is a coarse mask texture updated on commit**, not an animated SVG `feGaussianBlur
  stdDeviation="11"` re-rasterised for 280 ms per tick. That shape is the freehand-vector lag RB-05
  documents killing Roll20 and it does not belong in our renderer at any n.
- **The beat tail is not `aria-live`.** One polite status region announces a single summarising
  sentence — *„Beat 9 von 12 · 21:41 · Initiative"* — after a 400 ms debounce, only when the scrub
  stops. Three announcements per step is a flood, and it is delivered to precisely the user who can
  least afford it.

**Why sensible.** The differentiator is a gesture, and an unbudgeted gesture performed in front of
five people is a liability, not a flex. Every item here is a constraint, not a feature; the total
cost is a week of renderer discipline that `03` already demanded.

---

## M8 → A8 · The audit lamps become CI gates, and the tautology becomes a differential test

**Cost: small.** This is her best compliment converted into infrastructure.

- **Auslassung — replaced.** The string search over `mount.innerHTML` cannot fail by construction and
  I confirmed that. It is replaced by a **constructed differential test**: build the *GM* payload,
  then assert that no value, no substring ≥ 12 characters, and no id belonging to any un-granted
  claim or undelivered beat effect appears anywhere in the player payload, the player DOM, or the
  serialised accessibility tree — `aria-label`, `title`, `alt`, `data-*` included. **That test can
  fail. Today it fails on beat 411**, which is R1, and it must be written before the fix.
- **Struktur — unblinded.** `#blame` loses `data-leaf`, because it is the one component whose
  contents genuinely differ by role. The `if (s === last) continue` neighbour collapse is removed and
  **cardinality is hashed into the signature** (`Tag · role · data-comp · childCount`), so a role
  receiving 2 targets and a role receiving 6 no longer hash identically.
- **Kontrast — completed.** `--dim/--surface`, `--muted/--surface2` and `--accent-text/--surface2`
  join `PAIRS`; and **any text over uncontrolled raster gets a mandatory scrim with a measured
  floor**, computed rather than eyeballed — `.scene__caption .tag` over the harbour photograph is the
  case that proves the rule. `03`'s theme manifest already declares a *controlled text scrim*
  fallback; this makes it enforced instead of available.
- **Bewegung** — no objection was raised and none is answered.

All four move into `tests/a11y/` and `tests/leak/` as **slice-1 CI**, per her own concessions 12 and
13, and the contrast method becomes the automated gate `01-attack-plan.md` Akt I already promises —
whichever candidate wins.

---

## M9 → A9 · Player-first symmetry, enforced in the projection

**Cost: small.** E3 loses its best marketing line and is right to.

**The hard rule, implemented in the data layer rather than written in a stance:**

> **Any metric whose group-by includes a single natural person is computed only for that person's own
> view, unless that person has switched it on.**

It rides the same `project(viewer)` path as claims — a `MetricScope` checked server-side, not a
policy paragraph. Then:

- **The GM's panel is aggregate-only by default** and it keeps everything a GM actually acts on:
  combat duration, round counts, session pacing, scene-type mix, thread age, the length of the
  longest pause. *„Eure Kämpfe dauern im Schnitt 47 Minuten"* ships. *„Ossa hat in 4 von 30 Szenen
  gesprochen"* does not.
- **Per-person numbers exist in exactly one place: the player's own „Mein Tisch"-Karte**, with one
  toggle — *„mit der Spielleitung teilen"*. Shared numbers arrive at the GM labelled with who shared
  them, which also makes them a gift rather than a measurement.
- **A join-time notice**, one plain-German sentence plus a link, once per campaign, acceptance
  recorded. That discharges a controller's transparency obligation onto a screen instead of onto a GM
  who does not know she has become one.

**Why sensible.** Nemesis's compounding point is the sharp one: the whole product is maximal
per-person attribution by design, and E3 only reads it aloud. The fix cannot be conduct; it has to be
a projection rule, because the projection is what we ship. It costs one scope check and one card, and
it removes a second unnamed legal workstream beside W2.

**Invariants.** 1 — the metric projection is the same server-side omission path as everything else. 5
— all arithmetic, no scoring, no advice, no AI.

---

## M10 → A10 · One retrieval function, one index, one number — and a 2,000-entry fixture campaign

**Cost: medium.** This is the half that is 50 % of Kaya's sentence and 2 % of the evidence, and she
is right about both figures.

**One function.** Search, `[[ ]]` autocomplete, backlinks, *„erwähnt in"*, the Session Diff, the
recap, the Beat Clip's audience filter and `.chronicle` export all call:

```text
retrieve(viewer, scope, query) → ranked rows
```

The three permission dimensions (universe role × campaign role × per-grant claim visibility) are
joined **inside the SQL**, never applied after it. One function means one place for the leak test to
point at — which is exactly what §6 called *"the largest single risk in the candidate"*, and it is
easier to defend a function than a habit.

**Real indexes, so "backlinks are queried" has a plan:**

```text
EntityIndex   (entity_id, campaign_id, universe_id, kind, name, aliases[],
               tsv tsvector, first_seen_beat_id, updated_at_seq)
BeatObjectRef (beat_id, entity_id, role)          -- written at commit, indexed both ways
ClaimIndex    (claim_id, subject_ref, predicate, object_ref, standing, tsv)
```

**Navigation, concretely** — because a wiki you cannot move through is not a source of fast gestures:

- a **kind browser** in the Collection rail (Personen · Orte · Fraktionen · Gegenstände · Sitzungen ·
  Stubs), which is also the disambiguation surface;
- **`Ctrl+K`**, one ranked palette over entities, claims and beats, results the viewer may not see
  simply **absent**, not greyed;
- **stub triage**: the Stubs view sorted by mention count, because a two-year campaign produces
  hundreds and the useful ones are the ones that keep coming back.

**The number, which is what M10 actually demanded.** A seeded fixture campaign ships as a dev
artifact: **5,000 entities, 50,000 beats, 8 characters, 3 permission states.** Against it, in CI:

> **p95 < 80 ms** for search, autocomplete and backlinks, **fully permission-filtered**, and the leak
> harness runs over the same corpus rather than over six rows.

**Why sensible tonight.** The fixture is a day of work and it permanently kills the *"unproven at any
scale"* objection for every future round — perf, leak, layout (M11) and the structural sweep all get
a wiki-scale corpus to run against instead of a demo. That is the cheapest evidence in this document.

---

## M11 → A11 · A content-string primitive, and a `lang=long` axis aimed at content

**Cost: small.** Test R8. For a German-market product this is content loss, not cosmetics, and I
agree with her framing entirely.

- **One primitive.** `<Text kind="content">` carries `overflow-wrap: anywhere` and, under
  `lang="de"`, `hyphens: auto`; every flex/grid ancestor that holds one carries `min-width: 0`, which
  is the actual cause of half of these clips. Chrome strings keep `nowrap`/ellipsis. The distinction
  is enforced by the component, not by the author remembering — B1's author already knew the
  technique and applied it to chrome, which is exactly the failure a primitive prevents.
- **`overflow-x: hidden` is banned on `body` and `.app`.** Overflow containment belongs to the
  component that owns a scroll region, with a visible affordance. Clipping content to hide a layout
  bug is how the bug ships.
- **The `lang=long` axis lengthens content, not labels.** Fixtures gain a 90-character unbreakable
  German compound in an entity name, a fact value, a target name, a beat sentence and a prose
  paragraph — the strings that actually die. R8 asserts full readability at 380 px, 1280 px and 200 %
  zoom, in all four skins and both contrast levels.

---

## M12 → A12 · Sheets on narrow layouts; actions pin, bodies scroll

**Cost: small.** Test R9.

- Below 640 px — **and at any width where the measured card height exceeds `100dvh − 32px`** — Blame,
  the revert confirmation and every other decision surface render as a **bottom sheet**:
  `max-height: min(85dvh, content)`, internal `overflow-y: auto`, `dvh` rather than `vh` so mobile
  browser chrome cannot steal the bottom.
- **Universal rule:** any surface with a primary action pins its actions in a footer bar **outside**
  the scroll region. The body scrolls; the decision never leaves the screen. One component, applied
  everywhere, so this class of bug cannot recur in a surface built later.

**Why sensible.** §7 promises iPads and phones as first-class joins and RB-11 records that *"we are
claiming an iPad advantage we have never tested."* This was the first test. Failing it on the confirm
step of the flex's second half is the worst possible place to fail it, and the fix is one layout
primitive.

---

## M13 → A13 · Every list is a projection, and resource visibility is package-declared

**Cost: small–medium.** Test R10.

```text
Resource.visibility_by_actor_kind : exact | band | hidden      -- declared in the package
```

- An NPC's health defaults to **`band`**: the player client receives the string *„schwer verwundet"*
  and **never the number** — omission at the projection, not formatting at the edge. `exact` is a
  deliberate package choice for systems that play with open numbers.
- `targets`, `initiative`, `scene.plan` and the client strip all route through the same
  `project(viewer)` as the facts. A player sees which devices are connected; she does not see
  everyone's bars.

**Why sensible.** D2's entire Curtain model exists to gate what player clients are *sent*, and
exactly one component honoured it. Fixing this also converts B2's structural-signature audit from a
coincidence into evidence: signatures will differ across roles for good reasons, and with cardinality
hashed (A8) the test will see it.

---

## M14 → A14 · The Import Bridge — play beside your incumbent, read your campaign in us

**Cost: medium.** This answers the *convertible* half of M14; the residue is in *What I could not
answer*.

Nemesis's join of W4 + W7 + W8 is correct and it is the sharpest strategic finding in the pass: the
demo's applause comes from Foundry veterans whose switching cost is a campaign, while RB-11's channel
is system authors who do not care about rewind. Two moves, and neither is a slogan.

**1. The acquisition artifact is the Forge, and it is already separable by architecture** (B3, B7,
RB-11 §5). A system author downloads the Forge alone, builds a sheet and three rules for their
homebrew in an evening, and exports a package that runs in our table **and** a
Foundry/Roll20/FG-shaped export of characters and scenes — which RB-11 makes launch-blocking anyway.
The Forge's own timeline is therefore decoupled from the table's, which is the point of keeping it
separable.

**2. The Import Bridge — the wiki half becomes the entry, not the reward.** A GM points us at a
Foundry world export, a UVTT scene folder or a Markdown/Obsidian vault. Five minutes later she has a
**read-only Chronicle Record** of her campaign: entities, journals and scenes as typed stubs, fully
searchable through A10, permission-scoped, with `[[ ]]` links resolved. She has changed nothing. She
is still playing in Foundry on Saturday.

Scope, stated so it is not oversold:

- **In:** Foundry world JSON (documented shape), UVTT scenes, Markdown/Obsidian vaults with wiki-link
  resolution.
- **Thin by their choice:** Roll20 — they have no campaign export and declined custom-content export
  citing security and copyright (RB-01-roll20), so we import only what community exporters emit and
  we say so.
- **Never:** presented as a migration. It lands as read-only stubs marked *„importiert, ungespielt"*,
  and a stub becomes ours the first time a Beat touches it — which is stub-on-mention working in the
  direction nobody thought to point it.

**Why sensible.** It is the only move in this document that lowers the switching cost to zero, it
exploits exactly the half of the product Nemesis says is unproven (and A10 is what makes it usable),
and it inverts RB-11's export mandate into an import funnel using the same file formats. Dungeon
Alchemist reached the market by exporting into its rivals; we can also *read* from them.

**Invariants.** 7 — imported content carries its origin in the asset/provenance ledger and is never
redistributed; a Foundry world containing licensed rulebook content stays local to that GM's install,
and the importer refuses to place licensed text into a shareable package.

---

# Part 4 — Beyond defence: three flexes no competitor can copy

These are not answers to breaks. Each one is nearly free *given* S1, S2 and G1, and each one is
structurally impossible for a product that mutates rows.

## N1 · The Contradiction Engine — the campaign's live lies, computed

**New capability. Cost: small–medium.** Pure query over data S2 and G1 already produce. No AI.

Because claims are typed, scoped and carry `standing`, and because grants record **who told whom, in
which mode, sourced from whom**, the Record can compute the world's disagreements as arithmetic:

| Pattern | What it means at the table |
|---|---|
| Two claims, same `subject` + `predicate`, incompatible `object` | An open contradiction. Somebody is wrong and it is a scene. |
| A claim with `mode: told`, `source_ref = character X`, where **X holds no grant for it** | **X said something X does not believe.** A structurally detectable lie — and the GM created it by choosing the source, so no inference is involved. |
| A claim refuted after being told onward | The rumour is still travelling. Every holder acquired *after* the refutation is a person operating on dead information. |
| A `gm_fiat` truth contradicted by a `campaign_canon` claim | The world knows something false and the GM knows it is false. This is the definition of a plot. |

The GM gets a **„Widersprüche"** panel: a ranked list, each row one sentence with a beat link and a
*„zum Beat springen"*. She opens it in the twenty minutes before 21:00 and it hands her tonight's
material, drawn from what her own table did.

**Why no competitor can have it.** Not because it is clever — because it needs to know who told whom
in which mode, and no VTT records that. Foundry has a per-user ownership boolean on a journal page.
This is Fandom-grade **analysis** rather than Fandom-grade storage, and it is the clearest case in
the whole candidate of the wiki half making the table half stronger.

**Invariants.** 5 — arithmetic only; every row is a join, not a judgement. 6 — every row shows its
derivation, because every row *is* a derivation.

## N2 · Player-authored claims — the wiki has five authors and knows which is which

**New capability. Cost: small–medium.** Needs one new direction on the permission matrix, flagged for
Athena.

Every player already gets their character's Record — the claims they hold, server-filtered. N2 makes
it **writable**: a player's note on a claim, or a new note on any page they can see, **is a Claim** —
`authored_by: player`, held by them, `standing: open`, **invisible to the GM by default.**

So the Record has five authors, all with provenance and all distinguishable in the UI:
**GM · package · projection · party · each player.** Three consequences:

1. **We capture the notes that already exist.** Players take notes today — in Discord, in notebooks,
   in a shared Doc nobody reads. Those notes are the single largest body of campaign knowledge no VTT
   has ever held, and the grant model means we can hold them **spoiler-scoped by construction**.
2. **A player's wrong belief is a first-class object.** When Sela writes *„Vaugn arbeitet für den
   Pakt"* and the GM's `gm_fiat` truth says otherwise, that is not an error — it is the most
   interesting row in N1's panel, and it appears there **only if the player publishes it to the
   table.**
3. **The recap writes itself in the players' own words**, filtered per viewer, which is a thing no
   recap in the market can be.

**The honest flag.** This introduces a permission direction the matrix does not yet have: *content a
player can see and the GM cannot.* That is new, it is correct (a private character note is private),
and it is Athena's call before it is built — including whether a GM's export or `.chronicle` bundle
may contain it (my answer: only with per-player consent, recorded).

**Invariants.** 1 — enforced server-side in the same projection. 5 — no generation. 10 — the
permission direction is designed before it is shipped, not discovered afterwards.

## N3 · Two dials on every page: **as of when**, and **through whose eyes**

**New capability. Cost: small.** It is a UI control over machinery S2 forces us to build anyway.

Every entity page carries two chips in its header:

> **Stand: jetzt ▾**   ·   **Aus Sicht: Spielleitung ▾**

Because a page is `project(seq, viewer)` and not a row, both dials are already implemented — this is
the control that exposes them.

- **Read Vaugn's page as it stood at the end of session 9.** Fandom has revision history; so does
  every wiki. That half is table stakes.
- **Read Vaugn's page as Sela knew it at 21:38** — and this half **nobody has**, because per-reader
  revision history requires per-character knowledge with provenance, which requires the table to be
  the writer.

Uses that earn it tonight, not in some imagined future:

- **Settling the table argument.** *„Was wussten wir, bevor wir das Hafenbuch gefunden haben?"* —
  two clicks, and the answer is authoritative rather than remembered.
- **Prepping a flashback**, which is otherwise the hardest thing to prep in any campaign tool.
- **Writing a recap that is correct for session 9** instead of contaminated by session 12.
- **`View as player` becomes a dial rather than a mode** — `03`'s permission goggles, generalised
  across time, and the same control the GM uses to check a leak before she causes one.

E1's spoiler-correct Beat Clip stops being a bespoke feature and becomes a special case of N3 with a
render target attached. That is a saving, not an addition.

**Invariants.** 1 — the *„aus Sicht"* dial is GM-only and it renders the **same** server projection
that player would receive, so it is a preview of an omission, never a re-hidden GM payload. 6 — the
dials are themselves derivations and say so.

---

# Part 5 — Kills

Every round that only adds is a round that made the product harder to ship. Four removals, the first
two load-bearing.

## K1 · The permanent rewind scrubber in the Ledger Bar (deviation D1, partially retracted)

**Removed.** The scrubber is the most dangerous and least frequent of the transport controls, it is
what blows `03`'s hot-path budget (M7), it is what W5 fears socially (a continuous control invites an
unbounded gesture), and it is what makes the never-collapsing bar impossible to lay out at 380 px.

**What stays in the bar:** `Ctrl+Z`, a discrete **„Beat zurück"** stepper, Preview, Commit, Blame.
**What moves:** the scrubber opens a focused **Rewind mode** — stage dimmed, *„Vorschau — noch nicht
am Tisch"* banner, `Escape` to leave.

D1's justification survives intact: *a gesture behind a menu is not a flex* — and `Ctrl+Z` is still
one keystroke. **Undo is the flex. The scrubber never was.** This removal simplifies the hot path,
the social problem and the narrow layout at once, which is the profile of a good cut.

## K2 · Per-player fog, out of slice 1

**Removed from slice 1; re-scheduled behind `ScenePresence`.** RB-05 notes nobody ships per-player
and shared fog together, and the reason is that per-player fog multiplies render state by the number
of clients — at exactly the moment S1 + S2 are rewriting the write path. Shared reveal-brush fog is
what tables actually use, and `ScenePresence` zones (S1) are the honest substrate for per-player
anything. Shipping per-player fog *before* zones would mean building it twice.

Keep the mid-session switch as a **launch** item, where it is still the uncontested RB-05 §3 demand
and where it will be correct.

## K3 · `Beat.witness_user_ids[]` — the column

**Deleted.** Characters witness; audiences receive; **users attend**, and `SessionAttendance` already
answers the user question. A second array answering the same question with different semantics is a
drift generator with a schema. S2 replaces it with `BeatEffect.audience_character_ids[]` and
`BeatDelivery`, and neither needs a user list.

## K4 · E3's per-person metrics

**Deleted**, per A9. *„Ossa hat in 4 von 30 Szenen gesprochen"* was the best line in §9 and it is the
line that makes a GM a data controller over her friends. The aggregate panel keeps everything a GM
can act on. A feature whose best demo sentence is the reason to cut it should be cut.

---

# Part 6 — Housekeeping (the minors, in one patch)

**Cost: small, all of it.**

| # | Fix |
|---|---|
| **m1** | §4's cost table row is wrong and the conclusion is not. Recompute the R2 + CX22 row against ~200 session-hours/table-year so it agrees with the compute cross-check, and state compute and bandwidth as separate lines rather than one blended row. The €0.02–0.05/session and €1–3/table-year conclusions stand. |
| **m2** | §7.3 says "S (days)"; RB-05 says "days-to-weeks". Use the source's range. Rounding an estimate toward oneself once is how an estimating culture starts. |
| **m3** | One sentence in §7 and one string in the UI: **„Wände blockieren Bewegung. Sicht wird gemalt."** Walls are collision in slice 1; sight is the reveal brush; LOS is cut. Put it on the fog tool where the wrong inference is made, not three rows down in a table. |
| **m4** | Move B1's UVTT honesty note out of the collapsed `<details>` and onto the stage line itself, where the claim is. Any screenshot must carry its own correction. |
| **m5** | The Curtain Check's fps lint runs against **persisted device profiles from the last session** and says so; with no profile it reports *„kein Profil — erste Sitzung"* rather than a green light. An aspirational line in a shipped gate is worse than a missing one. |
| **m6** | The state strip is built from real semantics — a definition list or a table with row headers — not `aria-label` on a bare `<li>`. It is the documented fallback for hidden map labels, so it must be the most robust component in the file, not the least. |
| **m7** | The 300-permutation sweep yields to the event loop in chunks, sets `aria-busy`, and reports progress. A demonstration of rigour should not itself feel broken. |

---

# Part 7 — What I could not answer

Three residues. I would rather name them than spend a paragraph each pretending.

**U1 — Confidentiality from us on Path 3, in v1.** A4 renames it, discloses it, encrypts the media
and prices Path 3b. It does not deliver E2E for beat payloads, because a browser shares no secret
with the GM's host and the honest fix is a fortnight of crypto plus a permanent support surface. So a
self-hosting GM behind CGNAT gains storage sovereignty and continuity, and does **not** gain
confidentiality from us until 3b ships. Path 2 (LAN) is the only v1 path where we are not in the
middle. **The sentence in §4 must be rewritten before it is quoted, not after.**

**U2 — The Foundry veteran's switching cost is a campaign, and no feature buys it.** A14 lowers the
cost of *trying* us to zero and re-points acquisition at the Forge, which is RB-11's channel. Neither
closes the underlying fact §5 already concedes honestly: *for a 5e tactical table playing tonight,
Foundry beats our first slice outright and will beat us on the map for years.* That is true, it is
not fixable by a feature in round 1, and the only real answers are time and a channel that does not
require switching. Anyone quoting the flex should know who applauds it and who buys.

**U3 — Whether the typed half survives the labour gate.** G1 gives the predicate a gesture, a price
and a second door in the Diff, and re-specifies the gate to include claim composition with a stated
budget of ≤ 20 typed claims per session. **It makes the question measurable; it does not answer it.**
If a real session produces sixty predicates and the gate goes red, then the typed half is a
between-session activity, §2's *"that page cost zero minutes of maintenance"* must be struck exactly
as §0 struck *"the wiki writes itself"*, and the fusion's claim narrows again — to *the log carries
the routing, the dating, the scoping and the provenance; the structure is yours.* That would still be
a real product. It would be a smaller sentence, and I will not pre-emptively claim the larger one.

---

# Part 8 — Net effect

**The candidate is stronger, and the write path is now finished rather than claimed.**

All four fatals converged on one seam, and three of them are closed by two schema moves that cost one
new table each: **`ScenePresence` gives the witness set a deterministic source** (S1), and **moving
the audience from the beat to the effect, with no cross-scope prose anywhere in the system, makes the
granularity match the grants** (S2). The third — the migration as a beat with a session-frozen pin
(S3) — is the two paragraphs Nemesis costed it at, and it restores the two sentences the substrate is
sold on: *the log is a complete description of what happened*, and *snapshots are cache, never
truth.* The fourth (F1) is answered by naming the gesture, pricing it at ~5 s, moving it off the
critical path into the Session Diff, and re-writing the gate so the thesis can fail loudly instead of
quietly. That is as far as honesty goes tonight; U3 says so.

The majors mostly resolved into **rules rather than features**, which is the sign the diagnosis was
structural: undo is a proposal, scrubbing is a preview, every list is a projection, every metric is
scoped to its subject, every content string wraps, every decision surface pins its actions, and there
is exactly one retrieval function with one permission join. Six of those are the same sentence at
different altitudes — *the projection is the product* — and each one removes a class of bug rather
than an instance. Three genuine additions earn their place because the fusion already paid for them:
**contradictions are computable** because we know who told whom, **players can author into a
spoiler-scoped wiki** because grants are per character, and **every page has a time dial and a
perspective dial** because a page was never a row. None is copyable by a product that mutates rows,
which was the assignment.

And the slice got smaller, which matters more than any of it: **the Record leaves slice 1**, the
permanent scrubber and per-player fog are cut, two columns and one telemetry feature are deleted, and
slice 1's exit criterion is one it can actually meet.

**Where it is still soft.** Three places, none of them hidden.

1. **The Record has a plan and no artifact.** A10 gives it one function, real indexes, a 5,000-entity
   fixture and a p95 number — but M10's underlying complaint stands until something is built. The
   wiki half is now *designed* at scale and still *proven* at six rows.
2. **The go-to-market is one round behind.** A6 makes rulings honest and A14 re-points acquisition at
   the Forge, but W8 is unchanged: Alchemy's Sheet Builder is shipped and ours is a plan. The round-2
   artifact must be the Ruling Card and the Forge formalisation screen, or M6 and M14 come back
   unanswered and deserve to.
3. **The event-sourcing tax is still a judgement, not a measurement.** W3's +25–40 % has no evidence,
   and S1 + S2 add per-recipient rendering and a delivery fan-out on top of it. Every number in this
   document about renderer discipline and retrieval latency is a gate, which is the right shape — but
   gates are promises until something runs. **Spike the fold, not the pitch.**

> *Wer schreibt, wer sah, wer sprach — jetzt steht es in der Spalte,*
> *und was der Satz nicht trägt, trägt niemand mehr im Stillen.*
