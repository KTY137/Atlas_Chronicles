# Feature Response — Candidate B, „The Table Engine"

Feature Architect · 2026-07-27 · design round 1, answering [`attack-B.md`](attack-B.md)
Target: [`product-B.md`](product-B.md) · artifacts [`spike-B1.html`](spike-B1.html), [`spike-B2.html`](spike-B2.html)
Corpus: [`00-intake.md`](../../00-intake.md) · [`02-domain-model.md`](../../02-domain-model.md) ·
[`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) · `research/RB-01-*`, `RB-05`, `RB-11`

---

## How to read this

Nemesis's verdict is right in its structure and I accept it without argument: **the substrate lives,
the thesis does not.** So this document does not defend "the wiki is exhaust." It kills that sentence
in Part 0, out loud, and then rebuilds the flex on the only ground that holds — and finds that the
ground that holds is *better*, not merely smaller.

Her five fatals are not five problems. They are two:

1. **F1 + F4** — the Projector was asked to invent semantics it does not have (a claim, a
   truthfulness). Both are answered by the same move: *the Projector routes and dates content it
   never authors, and every field it cannot derive is deleted rather than defaulted.*
2. **F2 + F3 + (F5's sharp edge)** — the projection was built by **subtraction from a GM object
   graph**, so forgetting leaks. Answered by one architectural ruling: *the player payload is built
   by construction and is a different type, and the test that proves it is differential, not a
   string search.*

F5 is a third, separate thing and it is answered by deletion.

**I verified every artifact claim I build on, in source, myself:**
`spike-B1.html` L1009–1105 (16 hand-typed `claim` strings), L1492 (`conf: "belastbar"` generated at
the table), L1503 (`"Der Projektor hat <b>0 neue Fakten</b>"`), L1335 (attendance as
`b.s === 5 ? … : …`), L1349 (`emptyBlock(isBjorn)`), L1010–1014 (`f-lich` stored `canon: "Weltkanon"`);
`spike-B2.html` L1119 vs L1123 (`out.sitzung` built before the curtain gate), L1132 (`b.pub || b.d`),
L1148 (`anwesend: !ch.why`), L1150–1153 (the `luecke.detail` payload), L1182 (`f.cast` as the
Sendefreigabe filter), L1504 (`sigOf` stops at `data-leaf`), and `data-leaf` on ten container nodes
(L1268–L1440). All as reported. Nothing here rests on her summary alone.

Costs: **small** ≈ ≤3 days · **medium** ≈ 1–2 weeks · **large** ≈ 3+ weeks, for one builder.

---

## Part 0 — The spine: the Claim, and the death of *exhaust*

> **Killed:** *"the wiki is **exhaust** — the world record writes itself"* and
> *"**Nobody wrote a word of that.** Not the GM, not a note-taker, not an AI."*
>
> **Replacement thesis, one line:** *A human still writes the sentence — once, in the second it
> becomes true. The engine writes everything else: **who has it, when they got it, from whom, in what
> mode, and whether it still stands.** Nobody has ever tracked a word of that.*

Nemesis's fork is real and I take horn 1 openly: **predicates are content, and content has an
author.** But her costing of horn 1 assumes the sentence is typed *at the table, during play, by the
GM, in full*. Three structural moves make that assumption false in the common case, and the residue
is measurable rather than argued (M7).

### The object she is missing: `Claim`

`Fact` splits. What the Projector produces and what a human authors stop being the same row.

```
Claim  (id, campaign_id?, universe_id?, subject_ref, text, predicate?, package_id?,
        authored_by: gm|package|import|party, created_at_beat_id?, standing)
Fact   is deleted as a name. A Claim is the noun; there is no second noun.
Grant  (id, claim_id, holder_ref, acquired_at_beat_id, mode, source_ref?, retracted_at_beat_id?)
```

`predicate` is **nullable and optional forever**. A system-agnostic homebrew world produces Claims
whose `text` is prose and whose `predicate` is `null`; everything in this document works. A rule
package (Act IV) may supply a predicate vocabulary and unlock the structured extras (N3, E4,
conflict detection). This is the explicit answer to F1's horn 2: **the ontology is an enhancement,
never a precondition**, and `00-intake`'s "system-agnostic" survives untouched.

`holder_ref` is `character_id | user_id | actor_id | audience_id`. That one widening pays for M6 and
N3 below and costs a column.

### Where Claims come from — three doors, only one of which is typing at the table

| Door | When | What the GM does | Share of real traffic |
|---|---|---|---|
| **Prep lines** | 20 min before, or whenever the page was stubbed | Types three bullets under „Aldrics Arbeitszimmer". They are Claims, `authored_by: gm`, held by nobody. | The majority. This is how GMs already prep. |
| **The Blank Beat** | 21:34, mid-sentence | Presses one key. **Types nothing.** | The rest. |
| **The Say Line** | 21:38, when she wants the words now | Types one short line into an always-reachable field. | Rare, and measured (M7). |

Revealing is then **selection, not authoring**: the GM taps the ledger token, the prep lines for that
entity appear as a pick list, she presses `1` and `Enter`. One Claim, one witness set, N Grants.
Zero characters typed at 21:34.

**Cost: medium.** It is a schema split plus one pick-list interaction, and it must land before slice 1
because Grants keyed on the wrong noun are unretrofittable.

---

## Part 1 — The fatals

### B-F1a · The Blank Beat — provenance at full fidelity, sentence optional forever

**Answers:** F1 (the live write path), and the residue of W2.

This is the invention Part 0 turns on, and it is the honest thing the "0 neue Fakten" status line was
groping for.

At 21:38 Hobb lies to Sela. The GM presses `M` and does not type. The engine commits:

```
Beat #349  Mark  s8  14. Frostmond  21:38:04
  speaker_ref: npc:hobb    witnesses: [sela]    mode: told
  claim_id: null           → creates Claim { text: null, standing: open }
```

A Claim with no text is legal. In Sela's column it renders with **everything except the words**:

> **[unbenannt]** · gehört · Sitzung 6 · 12. Frostmond · von **Wirt Hobb** · `Warum?`

And that card is *already useful at 21:47*, which is the whole point. The GM reads it aloud:
*"Sela — der Wirt hat dir in Sitzung 6 etwas über ihn erzählt."* She supplies the content from her own
head, which she has, because she is the one who said it. **The app supplies exactly what humans
forget — who, when, from whom, in what mode — and never pretends to supply what humans remember.**

Naming it later is a five-second act (B-F5c), and the moment it is named, every card everyone
already holds fills in retroactively, because they all point at one `claim_id`.

**Why this is sensible now and not a dodge:** it converts F1 from a content problem into a *latency*
problem. The provenance graph — the part no competitor has and the part a fold genuinely can compute
— is captured at full fidelity for the price of one keystroke. The prose is the only thing deferred,
and prose was always going to have an author.

**Cost: small** on top of Part 0. **Invariants:** 5 (no provider anywhere near it), 6 (the blank card
has a complete derivation *by construction* — it is nothing but derivation).

---

### B-F1b · The Honesty Instrument — the register says „Erfasst", never „Weiß"

**Answers:** F1's rhetorical half, W2's presentation half, and Nemesis's demand that the claim be
killed *out loud*.

Three concrete changes, all cheap, all load-bearing:

1. **Column headers change wording.** The character columns are titled **„Erfasst"** (Recorded), not
   „Weiß" / „Was sie haben". The truth column stays „Was die Spielleitung weiß" because that one is
   true.
2. **Every register view carries a permanent, non-dismissible footer:** *„Das Register kennt, was der
   Tisch aufgezeichnet hat — nicht, was am Tisch gesagt wurde."* It is not a disclaimer modal. It is a
   caption, in `--fs-micro`, always there. A GM who learns to distrust it appropriately in week one
   is a GM who still uses it in year two.
3. **The Projector's own counter becomes a shipped feature, not an embarrassment.** After every
   commit the transport bar reports what actually happened: *„Beat #350 · 0 Aussagen erzeugt · 3
   Grants erzeugt."* The number that shamed the artifact is the number that makes the product
   trustworthy. Nothing else in the market tells you what its automation did and did not do.

**Cost: small.** **Invariants:** 6 in spirit — the product refuses to over-report its own derivation.

---

### B-F2 · The Gap Rule — absence is GM-only, and its reasons are a closed type

**Answers:** F2 outright, and makes M3 buildable.

**Ruling (structural, not a review note):** *a gap explanation is never rendered to, and never sent
to, the holder of the gap.* The player projection type **has no `luecke` field**. It cannot be
forgotten because it cannot be expressed.

The `luecke.detail` string at `spike-B2.html` L1152 — *„In Sitzung 8 standest du im Hof, als im
Arbeitszimmer etwas gefunden wurde"* — is deleted from the product, not fixed.

**Where the feature goes instead: the Gap Card is a GM instrument.** It renders in the GM's register,
in Bjorn's column, which is precisely where it was always needed — in the two seconds before she
speaks. And it is a **closed sum type with no free text**:

```
GapReason =
  | NotYetJoined  { joined_in_session }
  | Absent        { sessions[] }              -- from SessionAttendance, never guessed
  | PresentNotWitness { beat_ids[] }          -- present, not in the witness set
  | NeverRevealed                             -- no Beat has ever touched this subject
```

Rendered in fixed precedence, all that apply. No prose, no ranking, no counterfactual search.

**What the player gets instead — and it is not nothing.** The player's own column may cite exactly
one class of thing: **facts about the player's own attendance, which they lived through.** *„Du warst
in Sitzung 5 und 6 nicht am Tisch."* That is not a disclosure — Bjorn's player knows he missed those
evenings. What is forbidden is any reference to the *existence, time, place, witnesses or count* of a
Beat he was not sent. Implemented as: the player-side reason is a `PlayerGapReason` with two
constructors, `NotYetJoined` and `Absent`, and **no third**.

**Cost: small.** **Invariants:** 1, enforced by type rather than by vigilance.

---

### B-F3 · Projection by construction — the player payload is a different type, built from nothing

**Answers:** F3 (a), (b) and (c). This is the most important ruling in the document.

Nemesis is right that `b.pub || b.d` is not a typo but an architecture. The architecture is
**subtraction**: take the GM's object, remove the dangerous parts, hope you remembered all of them.
Every future Beat type and every Beat type a rule package invents re-opens the hole.

**Four rulings, all enforceable at compile/lint time:**

1. **No fallback across the trust boundary, ever.** `Beat.public_text : Option<Text>`. `None`
   projects to a **typed blank** — *„Ein Beat wurde festgehalten."* — never to `gm_text`. The player
   payload type has no field capable of holding `gm_text`, so `b.pub || b.d` is not a bug that was
   written; it is a program that does not compile.
2. **The player payload is *constructed*, never *derived*.** No spread, no `Object.assign`, no
   `delete`, no shared object graph between the GM projection and the player projection. Two
   functions, two return types, one domain input. Lint rule: the player projector module may not
   import the GM payload type. This is cheap now and impossible in 2029.
3. **The curtain is a total function, not an early return.** `spike-B2.html` builds `out.sitzung`
   (including `szene`) at L1119 and gates at L1123 — so `?curtain=struck` still ships *„Aldrics
   Arbeitszimmer"* to the player. Replace with: `project(viewer, stage) : Payload` where
   `stage = Struck` maps to `ClosedStage { session_no, in_world_date? }` — a **distinct type with two
   fields**. There is no scene name in it because there is no field for one.
4. **Backstage entities are absent from the client's entity table, therefore unaddressable.** The
   keyboard shortcut namespace is *derived from the payload the client received*, not from a fixture.
   `spike-B1.html` L1590's `hidden` token and the `press 3` announcement both cease to exist —
   pressing `3` when the payload has two entities does nothing, and says nothing.

**Cost: medium**, and almost all of it is discipline rather than code. Retrofitted, it is large.
**Invariants:** 1, structurally. §3's "the Curtain is the single most dangerous control in the
product" finally gets a mechanism instead of an adjective.

---

### B-F3b · The Leak Bench — differential projection testing

**Answers:** F3's proof half, F2's blindness, m4, and M1's vacuity.

`omission()` at `spike-B2.html` L1673 searches the DOM for withheld claim strings. It cannot see a
paraphrase, a count, a timestamp, a scene name or a role hierarchy inversion — and it printed
`0 im DOM` while `luecke.detail` sat on screen. Replace it with something that can fail.

**The instrument, three layers:**

1. **Schema allow-list.** Every role's payload is validated against a typed schema of *permitted
   fields*. A field not on the list fails the build. New Beat types cannot leak by omission of
   thought, because they cannot serialise at all until someone declares their public shape.
2. **Differential projection.** For each fixture, generate a **twin world** identical in every
   respect except one secret (a Claim's text, its existence, its witness set, its scene). Assert the
   player payloads of world and twin are **byte-identical**. This catches everything a string search
   cannot: a count that ticks (m4), a timestamp that shifts, a scrollbar-sized array, a gap
   explanation that paraphrases. If Bjorn's screen can distinguish the two worlds, the twin test is
   red.
3. **Corollary ruling — no cardinality of the unheld.** The player payload contains no count of
   records withheld and no names of other characters' coverage. `spike-B1.html`'s omission note is
   deleted. Under (2) it would fail anyway, which is the point: the ruling does not need to be
   remembered.

**This is the test §7 item 7 asked for, written before the UI, and it is the strongest single piece of
engineering in either candidate.** No VTT in RB-01 has anything comparable; Foundry's per-user
ownership boolean has nothing to differentially test.

**Cost: medium.** **Invariants:** 1, 10.

---

### B-F4 · `confidence` is deleted. `Claim.standing` is derived. `Refute` is a Beat.

**Answers:** F4 in full, including its invariant-6 secondary.

Nemesis is right that truthfulness is not in the Beat and that three places in the corpus produce
three different defaults. The answer is not to pick one. **A field a deterministic fold cannot fill
is deleted, not defaulted.**

**Kept, because it *is* derivable:** `Grant.mode`. Mode is a property of the **gesture**, not of the
world, and the GM already chooses the gesture:

| Gesture | Beat | Mode | Derivation shown in `Warum?` |
|---|---|---|---|
| Reveal to the room | `Reveal` | `witnessed` | „Modus bezeugt, weil #400 ein Reveal mit Zeugenmenge [Mira] war." |
| `M`, with a speaker | `Mark` | `told` + `source_ref` | „…weil #349 ein Mark mit Sprecher Wirt Hobb war." |
| Hand over a Dossier | `Brief` | `read` | „…weil #512 ein Brief war." |
| GM sets it directly | `Fiat` | `gm_fiat` | „…kein Beat, gesetzt vor Kampagnenbeginn." |
| Rule package derives it | `Derive` | `inferred` | „…Paket nebelakte@1.2, Regel `spurenlese`." |

No per-utterance tagging. The same keystroke she was pressing anyway.

**Deleted:** `Grant.confidence`. It drove the GM's spoken ruling and had no derivation — an
invariant-6 hole in the flagship view, correctly found.

**Added in its place:** `Claim.standing ∈ { open | contested | refuted }`, a property of the **Claim**
(not the Grant), derived from the Beat log alone:

- `open` — nothing addresses it.
- `contested` — a `Refute(target_claim)` Beat exists but is itself unresolved, or two Claims on the
  same `subject_ref` + `predicate` disagree (only available where a package supplies predicates).
- `refuted` — a `Refute(target_claim, by_claim)` Beat is committed.

**`Refute` is a play event, not bookkeeping.** When the party proves Hobb lied, the GM presses `R` on
the claim. She was going to narrate that anyway; now the ledger learns it.

**The two-second read becomes honest and strictly better than what §1 advertised:**

> *„Sela — der Wirt hat dir das in Sitzung 6 erzählt. Was du nicht weißt: Beat #188 widerlegt es."*

The GM's truth column shows `widerlegt` in GM-red. Sela's column shows the claim **still standing for
her**, struck only in the GM's view. That divergence is not a bug to be reconciled — it is the
product (N1).

**Cost: small.** It is a deleted column, a derived enum and one new Beat type.
**Invariants:** 6 restored — every badge in the register now has a sentence explaining it.

---

### B-F5 · The Chronicle Pass is deleted. Three cheaper things replace it.

**Answers:** F5, both horns and the sharp edge. See also the kill list.

The dilemma is real and has no third slot, so the feature goes.

**B-F5a — Table-time canon.** Claims created at the table are `campaign_canon` **at commit**. There
is no `proposed` limbo and no ratification step. Canon is what happened; the GM does not ratify her
own table. `End Session` is one keystroke and produces the session page immediately. Five adults go
home. *Cost: small — it is a deletion.*

**B-F5b — Grants are immutable history; `Retract` is visible.** F5's sharpest edge is that the pass
revoked Grants players had already read. Ruling: **a Grant, once delivered, is permanent.**
Corrections are new Beats. `Retract(grant)` sets `retracted_at_beat_id` and renders in the
character's column as a **struck line with its own dates**:

> ~~Ein Söldner namens Vach habe den Kurier getötet.~~
> *in Sitzung 6 geglaubt · zurückgezogen in Sitzung 9*

Mira's column is never one line shorter than she remembers. It is one line **struck**, which is
exactly the human experience of *"we were wrong about that"* — and it is the only rendering of a
retcon any product in RB-01 could not fake. `BeatProposal → BeatCommit` is finally extended to
Grants, which §6 Change 2 built the machinery for and then did not use. *Cost: small.*

**B-F5c — „Lose Enden": an ambient queue that nothing depends on.** The Pass's genuine content
survives as a persistent list in the Session zone: unnamed Claims (B-F1a), auto-created stubs with no
name, open `defeat_pending`, detected contradictions. Properties that make it not-maintenance:

- **It never blocks anything.** No gate, no modal, no end-of-session interception.
- **Nothing degrades if it is ignored.** Claims are already canon; Grants already exist; the wiki
  already renders. Ignoring the list for a month costs you nothing but unnamed cards.
- **It is workable in five-second units, anywhere** — including on a phone in a queue on Thursday,
  which is the one form of between-session work GMs demonstrably *do* do.
- Naming an unnamed Claim fills in retroactively for everyone who holds it.

*Cost: medium.* **Invariants:** 4 (open `defeat_pending` surfaces here rather than expiring), 10.

---

## Part 2 — The majors

### B-M1 · Three instruments that can fail, replacing three that cannot

**Answers:** M1.

- **Structure sweep.** `data-leaf` is deleted from the ten container nodes (`spike-B2.html`
  L1268–L1440). `sigOf` descends to text nodes and hashes *tag + role + child count + text-length
  bucket*, so five entries, zero entries and an empty-state block hash **differently**. The sweep's
  axes become `role × curtain × selection × **viewport (5 widths)** × **content volume (0 / 1 / 5 /
  40 grants)**` — the last two are what M2 proves it never tested. A permutation that overflows
  horizontally is a failure, not a scroll.
- **Contrast over rasters.** The gate rasterises the **composite** — art, `filter: brightness(1.22)`,
  scrim, text — and samples the worst pixel under the text's bounding box. This is the exact case
  `03-triumph` names and the exact case 17 token-on-token pairs structurally cannot see.
- **Motion.** Delete the lamp that asserts the tokens against the band they were authored to. Replace
  with a **theme-manifest validator**: any skin — including a user-authored one under K1 — is
  rejected at import if its duration tokens fall outside the band or its pairs fall below contrast.
  That gate can fail, it protects a real threat (K1 lets users author skins), and it is the only
  version of this check that has a reason to exist.
- **Headline numbers are retired.** No artifact in this candidate prints "0 Abweichungen" as evidence
  of universality again.

**Cost: medium.** **Invariants:** 8.

---

### B-M2 · Two register layouts, one component — and a stated table size

**Answers:** M2 in full.

**Stated supported size: GM + 8 characters.** Written into the product doc. A number nobody can
scroll past.

**Wide layout (≤ 4 characters):** today's column-per-character register. Unchanged, because at four
it is the best thing in either artifact.

**Dense layout (≥ 5 characters):** the layout flips axes — **one row per Claim, one compact coverage
strip per row.** This is `spike-B1.html`'s `belegt n/4 · M B S O` indicator promoted from footnote to
primary, which is the invention Nemesis conceded by name.

```
Sein Siegel steht im geraubten Hauptbuch.        [M◆] [B ] [S○] [O○] [T ] [K ] [V ] [Y ]   1/8
Der Baron hat den Brand von Kern überlebt.       [M◆] [B ] [S◆] [O◆] [T◆] [K ] [V○] [Y ]   5/8
```

`◆ bezeugt · ○ gehört · ▷ gelesen · ◇ abgeleitet · blank = kein Grant`. Initial + glyph + `title` +
hue — colour never load-bearing. Seventeen Claims × eight characters fit in 842 px with room over,
and **the two-second read gets *better* at large tables**, because "who has this?" is one row instead
of eight columns.

Three attached fixes:
- **Character hues are generated,** `hue(index, skin)` from a per-skin rotation. `--h-mira`,
  `--h-bjorn`, `--h-sela`, `--h-ondra` are deleted. Denominator is `characters_present.length`.
- **The truth reference is sticky at every width.** Below 620 px it becomes a pinned header row, not
  `static`. The tablet player and the café laptop keep the reference the read depends on.
- **The module rail is fixed-width, not `max-content`** (m5), so switching locale cannot silently
  narrow the stage.

**Cost: medium.** **Invariants:** 8.

---

### B-M3 · „Warum leer?" becomes three indexed queries

**Answers:** M3.

Nemesis prices this as a counterfactual search with a ranking. It was — while the answer had to be
prose for an arbitrary audience. Under B-F2 it is a closed enum for a single audience (the GM), so
the computation collapses to three lookups the product already indexes:

1. the character's join Beat → `NotYetJoined`
2. `SessionAttendance` rows for the sessions in which the subject was touched → `Absent`
3. the witness sets of Beats whose `object_refs` contain the subject → `PresentNotWitness`
4. empty set → `NeverRevealed`

Fixed precedence, all that apply, no ranking. **Attendance is read from `SessionAttendance` and
nowhere else** — `spike-B1.html` L1335's session-number ternary and `spike-B2.html` L1148's
`anwesend: !ch.why` are both deleted. Change 4 was created for exactly this and both artifacts
ignored it; the fix is to use it.

**Cost: small.** **Invariants:** 1 (GM-only by type), 6.

---

### B-M4 · Immutable publish + bounded recompute — the replay question, decided

**Answers:** M4, and prices E2 honestly for the first time.

§6 named the requirement and shipped no mechanism, and never chose between materialised and derived.
Both choices, made:

**Choice 1 — packages are immutable on publish.** The Forge edits a **draft**. `Publish` freezes a
content-addressed version. A Beat may reference only a published version. Versions any Beat
references are retained **forever, pinned into the campaign** — including packages that arrived from
Workshop and were later uninstalled. This is affordable precisely because of invariant 2: a
declarative package is kilobytes of JSON, not a binary. Eleven Forge edits over a year is a few
hundred kilobytes of history. K2's "edits the package in place" premise is amended to "edits the
draft in place", which is what a builder should have done anyway.

**Choice 2 — Claims and Grants are materialised rows, and recompute is a slice.** Not a fold over ten
thousand Beats and not a forever-recompute of the world. Because every Claim carries
`created_at_beat_id` and every Grant carries `acquired_at_beat_id`, the downstream set of an amended
Beat is an indexed range query: *rows sourced at or after beat N whose subject appears in N's
`object_refs` transitive closure*. Amending Beat #212 of session 3 in session 40 touches tens of
rows, not tens of thousands.

**One honest refusal, named:** Rewind **plus** a package upgrade in the same operation is refused
with a specific error, not silently approximated. Amend across a version boundary is exact, because
the old version was retained.

**E2 is re-priced from "almost nothing" to medium.** That correction matters more than the mechanism.

**Cost: large.** This is the biggest single line item in the candidate and it should be stated as
such. **Invariants:** 2 (the reason it is affordable), 3, 6.

---

### B-M5 · Universe promotion is removed from the session path

**Answers:** M5. See also the kill list.

Four rulings, three of which are deletions:

1. **No per-fact promotion keystroke, and nothing at 23:52.** The one-key promote inside a rushed
   review is deleted.
2. **Universe Claims are authored in the Universe, not promoted from a campaign.** A campaign may
   *cite* a Universe Claim (its characters hold Grants on it); a campaign Claim never travels upward
   on its own. `spike-B1.html`'s `f-lich` — the campaign's central secret stored with
   `canon: "Weltkanon"` — becomes unrepresentable.
3. **Promotion, when a GM genuinely wants it,** is a deliberate multi-select in the Story zone with a
   blast-radius preview: *„3 Kampagnen teilen dieses Universum. Diese Aussage wird für 2 Spielleitungen
   und 0 Spielende lesbar. Sie ist in ‚Nebelakte' aktuell ein laufendes Geheimnis."* Preview →
   commit → named undo, like everything else in this document.
4. **Promotion strips all Grants.** A Universe Claim has no witnesses, because witnessing is
   campaign-scoped by definition. One rule, and the entire class of cross-campaign Grant leaks
   stops existing.

**E4 (cross-table archaeology) is scoped down:** by default it queries **only campaigns the asking
user runs**. A Universe with two editors gets shared archaeology only when both set
`share_play_history` on their `UniverseMembership`. Default off. One boolean closes the leak and E4
survives for the single-GM-many-campaigns case, which is the case that actually retains.

**Cost: small** (mostly deletion; the preview is medium and belongs to Act III, not slice 1).
**Invariants:** 1.

---

### B-M6 · The broadcast scope is deleted; the audience becomes a holder

**Answers:** M6.

`w.facts.filter(f => f.cast)` at `spike-B2.html` L1182 is a fourth visibility scope with no owner, no
UI, no schema and an inverted hierarchy. Delete it.

**Replacement, at the cost of one enum value:** `Grant.holder_ref` already accepts
`character_id | user_id | actor_id`. Add `audience_id`. **The stream audience is a pseudo-holder.**

- Casting a Claim to the stream is the **same gesture as the Dossier** (E3): select, press, commit.
  It emits a `Brief(audience: stream)` Beat.
- Therefore it is owned (a GM did it), audited (it is a Beat), in the schema (it is a Grant), undoable
  (`Retract`), and visible in the Claim's coverage strip as one more column.
- The Observer role defaults to `FollowCharacter(character_id)` — spectating over Mira's shoulder,
  which is what a friend between campaigns actually wants and is monotone by construction.
- The inverted case (audience knows more than a seated player) still exists, but now **only because a
  GM deliberately cast it**, which is exactly what streamers want and exactly what an accident must
  not be.

No fourth scope. No new mechanism. Nemesis's own concession that the Dossier is "a state transition
wearing a costume" is the reason this fits.

**Cost: small.** **Invariants:** 1.

---

### B-M7 · Slice 1 halved, and three exit gates that can go red

**Answers:** M7.

**Cut from slice 1** (moved to slice 2, named, not vanished): the Cinematic recipe's art pipeline
(slice 1 ships Outline + a plain Cinematic on a solid backdrop), the second skin, the VoiceOver/Safari
pass, Rewind (slice 1 has `Retract` only), and the Chronicle Pass (deleted outright).

**Slice 1, „Eine Enthüllung, ein Register":** identity + one campaign + one session; join by
hosted-room link; `SessionAttendance` editable mid-session; Beats `Reveal`, `Mark`, `Roll`, `Refute`,
`Retract` with commit; the Claim substrate with prep lines, Blank Beat and Say Line; the Projector
producing Grants; the register in both layouts; the GM-only Gap Card; the Leak Bench written **before**
the UI; the Outline recipe; one skin + High Contrast + Reduced Motion; full keyboard; in-world dating.

**Exit criterion, in three gates, each of which can fail:**

1. **The leak gate.** The Leak Bench passes on a fixture of **8 characters × 40 Claims × 3 curtain
   states × 2 locales**, *and* an adversarial human hour finds no leak. Red if either fails.
2. **The labour gate — the one that tests F1 as a measurement instead of an argument.** The client
   instruments the GM's own typing during one real four-hour session: total characters typed, total
   seconds in a text field, longest single interaction. **Green at ≤ 4 minutes of typing across the
   session and no single input interaction over 12 seconds.** Over that, the thesis is falsified and
   the round says so. This number is the whole bet, and it is now on a stopwatch.
3. **The cold-read gate.** At session **two**, a player who missed session one is shown their own
   register and asked "what does your character know about X?" — and must answer correctly with the
   GM silent. Red if they cannot, or if they learn something they should not have.

W1's cold start is not solved by this (see unanswerable), but the criterion no longer *depends* on
the cold start being solved, which was the actual defect.

**Cost: small** (a scope decision plus keystroke instrumentation).

---

### B-M8 · Reachability, with the arithmetic shown

**Answers:** M8. Adopts `RB-11`'s named recommendation rather than inventing a fifth option.

**Ruling — v1 has exactly one documented join path: hosted rooms.** A player clicks
`https://<room>.<our-domain>`, no account, no certificate, no mixed content, no LAN IP. This is the
default, the demo path, and the only path in the quickstart.

**Self-hosting survives as the own-your-data promise, honestly labelled:** LAN play works out of the
box; internet play from a self-hosted server requires your own domain and certificate, with a
ten-minute Caddy recipe in the docs. **The Plex-pattern DNS + wildcard-PKI service is explicitly
deferred and named as deferred** — RB-11's exact instruction, so it cannot arrive by accident in
month nine.

**The number, with its assumptions visible.** Per table-session, five clients:

| Item | Per client | Notes |
|---|---|---|
| Beats (JSON over WS) | ~0.6 MB | ~400 Beats × ~1.5 KB, heavy session |
| Presence / heartbeat | ~0.5 MB | 4 h |
| Assets, first session | ~15 MB | scene art + portraits |
| Assets, steady state | ~2 MB | immutable, content-addressed, cached |

**Steady state ≈ 3 MB × 5 = 15 MB per session ≈ 60 MB per table-month.** At Hetzner-class egress
(~€1/TB) bandwidth is **≈ €0.00006 per table-month** — i.e. not the cost. The cost is fixed: one
small VM + object storage + wildcard cert ≈ **€25–40/month**, and the binding constraint is **relay
CPU and socket count, not bandwidth**.

**Therefore a named spike, S-R1, before slice 1 exits:** 50 synthetic tables × 5 clients against one
4 vCPU node, measuring sockets, p95 Beat-commit latency and CPU. The plan's number is *"on the order
of 10³ concurrent tables per node before scale-out"*; S-R1 either confirms the order of magnitude or
the plan changes. **A measured order of magnitude with a named falsifier is the honest form of "a
number, not a hope."** `product-B.md`'s "Deferred to the RB-11 verdict, which does not yet exist" is
struck.

**Cost: medium** (the hosted-room service is real ops work, not a feature).
**Invariants:** 1 (rooms are server-authoritative), 10.

---

## Part 3 — Beyond defence: three capabilities the fusion makes possible and the market cannot copy

### B-N1 · Die Divergenz — dramatic irony as a data structure

**New capability.** Falls out of B-F4 at near-zero marginal cost, and is the strongest thing in the
candidate after the register itself.

Because Grants are per-holder and Claims carry `standing`, the product can compute something no
competitor can even pose: **the difference between what is true and what the table believes.**

One view, one keystroke (`D`) on any entity, GM-only:

> **Dein Tisch irrt sich derzeit in drei Dingen.**
> - *„Ein Söldner namens Vach tötete den Kurier"* — **widerlegt** durch #188. Noch geglaubt von:
>   **Sela** (gehört, von Wirt Hobb, Sitzung 6).
> - *„Das Haus von Kern erlosch vor sechzig Jahren"* — **bestritten**. Ondra hat die Register-Fassung;
>   #276 widerspricht ihr. Niemand am Tisch weiß, dass sich das widerspricht.
> - *„Hobb schuldet Bjorn zwei Silber"* — **offen**, aber Bjorn ist der Einzige, der es hat.

This is a prep instrument and a live instrument at once. The GM can *aim a scene at a wrong belief* —
which is the single most common thing a GM does by hand and the single most common thing they forget
they set up three sessions ago.

**Why nobody copies it:** it needs per-character acquisition records *and* claim-level standing *and*
an event log to derive both. Foundry has a boolean, Roll20 a share list, Alchemy authored lore
(RB-01-*). None of the six can render this view at any price short of rebuilding their data model.

**Cost: small.** **Invariants:** 1 (GM-only, by projection type), 6 (every line has a `Warum?`).

---

### B-N2 · „Die Fassung, die du liest" — the per-reader wiki

**New capability.** This is the Wiki-half of the fusion finally doing work, and it is the answer to
W6 (95 % of wall-clock time is between sessions) that the candidate confessed it did not have.

Every entity page renders **in the reader's own knowledge state**. Same URL, same layout, N truths:

- **Mira**, on her phone on Thursday, reads a real article about Baron Aldric — four paragraphs,
  ordered by in-world date, one of them marked *gehört · von Wirt Hobb · Sitzung 6*, one struck as
  *zurückgezogen*. It is prose she can actually read, and every line is stamped.
- **Bjorn** opens the same URL and reads a genuine, well-designed empty state: *„Deine Figur hat von
  dieser Person nie gehört."* No count, no names, no gap detail (B-F2).
- **The GM** reads the full article with a **per-paragraph coverage strip** in the margin — the M2
  Dense strip, applied to prose. She sees at a glance which paragraph of her own world nobody has.

**Two second-order effects that are the actual prize:**

1. **The players now have a reason to open the app between sessions**, which is the retention hole
   W6 named and which table-first products (Foundry included) all share. And they open it to read
   *their own character's memory*, which is the one document in a campaign that has never existed.
2. **`mode: read` becomes reachable** — via the Dossier (E3), which hands over a document and creates
   Grants. F4 correctly noted the mode was in the schema and unreachable. Note the deliberate
   non-feature: **merely reading a page you already have Grants for creates nothing.** No surveillance
   of players' reading. The Grant is created by the *GM's act of handing over*, not by the player's
   act of looking.

**Why nobody copies it:** every competitor's wiki has one text and a share list. Rendering N truths
from one page requires the Grant table, and the Grant table requires the event log.

**Cost: medium.** **Invariants:** 1 (it is the same projection function as the register — one
boundary, not two), 8 (it is prose in semantic DOM; it is the most accessible view in the product),
9 (art is content and skin, never a depicted world).

---

### B-N3 · NSCs wissen Dinge — knowledge for non-player actors, and the Rumour Graph

**New capability.** Costs one already-widened column (`Grant.holder_ref` accepts `actor_id`, Part 0)
and unlocks the GM's prep half.

Today the fog of knowledge covers the party. Extend it to the world: **the Baron's steward, Wirt Hobb
and the Kammer von Kern can hold Grants.** Then:

- The GM asks the question she actually asks at 21:20: **„Wer weiß, dass der Baron der Lich ist?"** —
  and gets an answer that includes NPCs and factions, not just PCs.
- **The Rumour Graph.** Every `told` Grant carries `source_ref`. That is a directed edge. So a single
  Claim renders as a propagation graph: who learned it first, who told whom, when, where it forked
  into a refuted variant. For a mystery or intrigue campaign this is the instrument the genre has
  never had, and it is **free** — it is a graph over rows that already exist for the party's sake.
- **The live payoff:** *„Dieses Gerücht hat 3 von 5 Figuren und 2 NSC-Fraktionen erreicht."* The GM
  knows exactly when the secret breaks, because propagation is now a measurement rather than a
  memory.

This also quietly repairs W6 from the *GM's* side: the between-session work this product supports is
not maintenance, it is **asking the world questions** — which is the only between-session work GMs
enjoy.

**Why nobody copies it:** same reason as N1 and N2, one layer further out. And note it needs no
predicate ontology — `source_ref` and `holder_ref` are enough for the graph; predicates only make the
queries richer where a package supplies them.

**Cost: medium.** **Invariants:** 1 (NPC Grants are GM-scope and must be in the *GM* payload type
only — the Leak Bench twin test covers this specifically), 5, 9.

---

## Part 4 — The kill list

Every round that only adds is a round that made the product harder to ship. Six removals, in order of
weight:

1. **The Chronicle Pass — deleted.** Nemesis is right that it has two slots and both are forbidden by
   the candidate's own judging rule. Table-time canon (B-F5a) + immutable Grants (B-F5b) + „Lose
   Enden" (B-F5c) cover its real content at a fraction of the cost and block nothing. This removes an
   end-of-session mode, a conflict-resolution UI, a diff renderer, and the retroactive-Grant-revocation
   bug class in one stroke.
2. **The thesis sentence — deleted.** *"the wiki is exhaust"* and *"Nobody wrote a word of that"* come
   out of §1 and §2. This is a removal, not a rewrite: they were justifying features (auto-canon
   without an author, the free ontology, the zero-labour claim) that now have no justification.
3. **`Grant.confidence` — deleted.** A displayed badge with no derivation and three incompatible
   defaults. `Claim.standing` replaces it and is derived (B-F4).
4. **The `Sendefreigabe` / broadcast scope — deleted.** A fourth visibility scope with no owner and an
   inverted hierarchy, replaced by one enum value on an existing column (B-M6).
5. **Universe promotion at end-of-session — deleted.** With it: the one-keystroke promote, the
   promotion path in the review, and the whole cross-campaign Grant leak class (B-M5).
6. **The vacuous instruments — deleted.** The 144-permutation `data-leaf` sweep, the token-reads-token
   motion lamp, the verbatim-string `omission()` detector, and B1's omission note. Three of them
   printed reassurance; one of them was itself a side channel (m4).

**Also cut from slice 1 but not from the product:** Rewind (Retract only in slice 1), the second skin,
the VoiceOver pass, the Cinematic art pipeline.

---

## Part 5 — Minors, briefly

- **m1** — `--gm` in relic/dark lifted to ≥ 4.5:1. One token. Caught only because someone finally
  computed the pairs; the rasterised composite gate (B-M1) is what stops the next one.
- **m2** — the five hard-coded values become tokens, and the stage's cinematic light rig
  (`rgba(255,190,96,…)` / `rgba(130,185,235,…)`, L338–339) moves into the **theme manifest** as a
  declared light pair, because K1 says skins are data and an amber glow on the Signal skin proves it
  was not. The 9 px coverage glyphs go to `--fs-micro` (11 px) — they are the Dense layout's primary
  carrier now (B-M2), so they cannot sit below the legibility floor.
- **m3** — **focus is architecture.** Renderers stop replacing `innerHTML` wholesale: keyed patching
  for the register, and an explicit focus contract — after any state change, focus returns to the
  element that caused it, or to its nearest surviving ancestor. This is a slice-1 gate alongside the
  keyboard pass, not polish.
- **m4** — answered structurally by B-F3b's no-cardinality ruling and the twin test.
- **m5** — the long-text locale must lengthen **content**, not chrome: the fixture gains real German
  compounds in claims, character names and source citations. Plus the fixed-width module rail
  (B-M2).

---

## Part 6 — What remains unanswerable

Four things. I would rather name them than ship a fake fix.

1. **The *exhaust* thesis itself is unrecoverable.** F1 is correct at the root: a deterministic fold
   over a Beat cannot write a world-sentence, and no feature in this document changes that. Part 0
   kills the claim rather than patching it. What survives is a smaller, true and still-uncontested
   claim — *nobody tracks who knows what* — and Kaya should hear that the flex got quieter before she
   ratifies it.
2. **W2's coverage gap is narrowed, not closed.** The Blank Beat drops the price of recording to one
   keystroke, which materially widens what gets captured. But a GM who says something in passing and
   presses nothing still leaves a hole, and the honest fixes all cost an invariant: voice capture is
   an AI provider on the critical path (invariant 5) and a privacy problem; tagging every utterance is
   the labour the candidate exists to abolish. The mitigation is permanent and linguistic — **„Erfasst",
   never „Weiß"** (B-F1b) — and the product must never present the register as complete.
3. **W1's cold start.** The flex still cannot be shown at session zero, and a seeded demo campaign is
   still a fake that a reviewer will name as one. B-M7 moves the payoff from session three to session
   two and removes the exit criterion's *dependence* on the cold start, which is the part that was
   actually broken. The sales wound stays open, and it is the strongest argument the rival candidate
   has.
4. **W8's social half.** `Retract`-as-visible-strike (B-F5b) is the best rendering software can offer
   of *"we were wrong about that"*, and it genuinely improves the case. It does not answer **does Mira
   un-know the sigil?** No data model answers that, because the question is about a person and not
   about a row.

---

## Net effect

**The candidate is stronger, and it is stronger in the specific way rounds are supposed to compound:
it lost a claim and gained a mechanism.** The substrate Nemesis conceded — Beats, proposal→commit, the
three presence concepts, one trace component, `origin_beat_id`, project-then-render — is untouched and
now has the two things it was missing: a **noun with an author** (`Claim`) and a **boundary with a
type** (construction, not subtraction). Both fatal clusters close on those two moves. Four of the five
fatals are answered by deletion or by a type, which is the cheap kind of answer; only M4's
immutable-publish-plus-bounded-recompute is genuinely large, and it was always going to be — the
correction that matters there is that E2 stops being priced at "almost nothing."

The product is also *stranger* than it was. B-N1 renders dramatic irony as a queryable structure,
B-N2 gives every reader their own version of the same wiki page — which is the first thing in this
round that makes the Wiki half earn its billing rather than ride along — and B-N3 extends the fog of
knowledge to the world's own inhabitants. None of the three is copyable without the event log plus
per-holder Grants, which is to say none of the six competitors in RB-01 can reach them without
rebuilding.

**Where it is still soft, honestly.** Three places. First, **the labour bet is now measurable but
unmeasured** — B-M7's four-minute gate is the right instrument and it has never been run; if a real
session comes in at fifteen minutes of typing, this candidate is finished and the gate will say so.
Second, **M4 is the load-bearing engineering risk and it is large for a solo stakeholder with an AI
crew** — W3 was right, and pressing it produced a real answer that is also a real cost. Third, **W7
got worse on purpose**: slice 1 now has less art than before, and a table-first product whose first
public artifact photographs worse than Owlbear's free tier is a positioning risk this document made
sharper rather than softer. That was the correct trade — a slice that can prove the leak gate and the
labour gate is worth more than a slice that screenshots well — but it should be named as a trade and
not as a win.
