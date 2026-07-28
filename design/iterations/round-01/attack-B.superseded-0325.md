# Attack Pass — Candidate B, „The Table Engine"

Nemesis, die Widersacherin · 2026-07-27 · design round 1
Target: [`product-B.md`](product-B.md) · artifacts [`spike-B1.html`](spike-B1.html),
[`spike-B2.html`](spike-B2.html) — both read as source, not as description.
Corpus: [`00-intake.md`](../../00-intake.md) · [`01-attack-plan.md`](../../01-attack-plan.md) ·
[`02-domain-model.md`](../../02-domain-model.md) · [`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) ·
`research/RB-01-*`, `RB-05`, `RB-11` · [`spike-review-B2.md`](spike-review-B2.md).

---

## The strongest reading, stated first

I attacked this, not a caricature of it:

A `Beat` is an append-only, server-authoritative record of a consequential table event carrying a
**witness set**. A deterministic `Projector` folds Beats into `Facts` and `Grants`. Six competitors
model *"who may see this document"*; none models *"who learned this, when, and from whom."* The
second is a different data structure, it can only be populated automatically if the table is
already an event stream, and therefore **table-first is the precondition for the flex, not a
stylistic preference**. Everything else in the candidate — the promotion of `defeat_pending` into a
universal `BeatProposal → BeatCommit` shape, the separation of Control / Attendance / Presence, the
unification of "why is this number 14?" with "why does the wiki say he is dead?" into one trace
component — follows from that one substrate and is genuinely well-reasoned.

That reading is correct, and §6 is the best *structural* work in the round. I could not break it,
and I say so by name in the concessions.

What I found is that the candidate is broken at exactly one joint, and everything fatal hangs off
it: **the Projector cannot produce the sentences the flex displays.** The candidate promises
"nobody wrote a word of that" and then ships two artifacts in which every word was written by hand.
Once that joint fails, three further fatals follow — the permission surface leaks in three
independent places in the two artifacts built to prove it does not, the `mode`/`confidence` pair is
unfillable by a deterministic fold, and the Chronicle Pass is precisely the between-session
maintenance the candidate's own judging rule rejects.

I did not need W2 to do this. W2 says the ledger is *incomplete*. My finding is worse: as specified,
it is *empty*.

---

## FATAL

A CRITICAL from Athena blocks with no override. These are mine. Each one is reproducible by a person
walking a script.

### F1 — "Nobody wrote a word of that" is false. The Projector cannot produce a predicate.

**The claim under attack.** §1: *"**Nobody wrote a word of that.** Not the GM, not a note-taker, not
an AI. It is a fold over the session log."* §2: a `Reveal(Ledger, witnesses:[Mira])` *"produces one
Fact on the Baron's page"*, namely `Ledger bears Aldric's sigil`. §2 also states the Fact is
*"Structured, not prose."*

**The break.** The string *"bears Aldric's sigil"* is not in the Beat. A `Reveal` Beat carries
`actor_ids`, `object_refs`, `scene_id`, timestamps, `in_world_date` and a witness set (§6, Change 1).
A deterministic fold over that payload can derive exactly one class of assertion:

> `(Ledger, was_revealed_to, Mira, at beat #400, 14 Frostmoon)`

That is a fact **about the table**. Every claim shown in §1, §2 and both artifacts is a fact **about
the world**, and the world-facts contain semantic content that exists in no Beat field. `is the lich
of Kern`, `commissioned the courier's murder`, `owes Bjorn two silver`, `has not ordered wine in
three weeks` — a fold cannot invent any of these. The candidate says so itself: *"the Projector
cannot assert what the log does not contain."* Correct. And the log does not contain them.

**The proof, from the candidate's own artifacts.**

- Every claim in both spikes is a hand-authored literal. `spike-B1.html` `FACTS` contains **16**
  German sentences typed into the file (lines 1009–1105). `spike-B2.html` contains **17** more
  across three worlds (lines 940–1063). Zero of the 33 are derived from anything.
- The single place in either artifact where a Beat is created at run time is B1's `doMark()`
  (line 1478). Its own status line reports the result:

  ```
  "Der Projektor hat <b>0 neue Fakten</b> und <b>" + sp.targets.length + " neue Grants</b> erzeugt"
  ```

  Zero new Facts. The live write path of the flex artifact provably cannot create a Fact; it can
  only re-distribute a Fact somebody already typed.
- B2's Kontextlupe prints `created_by: projector` as a hard-coded string (line 1404) on records
  whose `claim` is a literal three hundred lines above.

**The fork, and both horns are the abolished labour.** There are exactly two ways to close the gap:

1. **Predicates are prose the GM types at the table.** Then at 21:34, with four people watching, the
   GM reveals the ledger *and types a sentence*. That is note-taking during play — strictly more
   expensive than the Google Doc the thesis mocks, because the Doc can be written afterwards and this
   cannot. The Chronicle Pass then reviews sentences the GM already wrote, and §2's headline —
   *"The GM is the editor of a paper they never had to write"* — is false.
2. **Predicates come from a controlled vocabulary** (§2's "structured, not prose"). Then somebody
   must author an ontology of predicates — `is_dead`, `bears_sigil_of`, `owes`, `lied_about` — for
   an arbitrary homebrew world, *before play*, in the Forge. That is Act IV work, presented as free,
   and it collides head-on with the product's one-line definition (`00-intake`: **system-agnostic**)
   and with RB-11's ruling that the visual rule-builder is the **go-to-market**. A system whose
   author never wrote fold rules produces a chronicle of `X was revealed to Y`, which is a table
   log, not a wiki.

The candidate does not choose. Both spikes silently take horn 1 and then claim horn 0.

**Scenario.** Kaya, 21:34, session 8. She reveals the ledger to Mira. What appears on the Baron's
page? Under the deterministic Projector as specified: *"Das Hauptbuch wurde Mira gezeigt."* Under the
demo: *"Sein Siegel steht im geraubten Hauptbuch."* The difference between those two sentences is the
entire product, and there is no mechanism in the candidate that turns the first into the second.

**Cost of the honest fix.** The flex survives only as *provenance over facts the GM still writes* —
which is real value, and is candidate A's territory, and is a much quieter claim than §1 makes.

---

### F2 — A GM secret reaches a player's client: the gap explanation is a disclosure channel

**The claim under attack.** §1's second-best moment is Bjorn's empty column, and B2's own
cross-review calls B1's `Warum leer?` button an invention that *"belongs in the product."* §3
deviation 2 and §6 declare that unauthorised records are **omitted from the response**.

**The break.** Explaining an absence is a disclosure. To say *why* a character does not hold a fact,
the response must reveal that the fact exists, roughly when it was learned, and by whom. B2 ships
exactly that to the player's own client.

**Reproduction.** Open `spike-B2.html?world=aldenfall&role=player&identity=bjorn`. Read audit card
**4 · Auslassung statt Verstecken**, which prints the literal payload delivered to this client. It
contains:

```json
"luecke": {
  "grund":  "Du warst in Sitzung 5 und 6 nicht am Tisch — deine Anwesenheit ist erfasst, nicht geraten.",
  "detail": "In Sitzung 8 standest du im Hof, als im Arbeitszimmer etwas gefunden wurde.
             Du gehörst nicht zur Zeugenmenge dieses Beats."
}
```

Source: `charCol()`, lines 1150–1153, delivered via the `role === "player"` branch at line 1178.

Bjorn's player now knows, from his own screen: (a) sessions 5 and 6 contained material about the
Baron, (b) **something was found in the study tonight**, (c) other characters witnessed it. That is
precisely the metagame the fog-of-knowledge feature exists to abolish. The player turns to the GM
and says "what did you find in the study?" — and the app told him to.

**Why the instrument does not catch it.** `omission()` (line 1673) tests for leaks with
`html.indexOf(esc(f.claim))` — a verbatim search for withheld **claim strings only**. A paraphrase,
a count, a timestamp or a location is invisible to it. The lamp reads `0 im DOM` while the payload
above sits on screen. The candidate's headline proof of "omit, don't hide" is blind to the leak it
is printing.

**Why this is a design fatal, not a spike bug.** §6's threat surface enumerates *"every search
snippet, backlink, autocomplete, 'mentioned in' list, recap and export"*. It does not enumerate the
gap explanation, because the candidate never noticed that absence is data. There is no rule anywhere
in `product-B.md` stating that a `Grant` gap may be explained only to the GM — and the flex is
poorer without the explanation, which is why the artifacts shipped it to the player.

---

### F3 — Omission is opt-in. The projection leaks whatever nobody remembered to redact.

**The claim under attack.** Invariant 1 and §3 deviation 2: *"Backstage material is omitted from the
response, never hidden in the DOM. The Curtain is the single most dangerous control in the product
and is therefore modelled as data, audited, and covered by tests."*

**The break.** In both artifacts, redaction is an allow-list applied per field by hand, with a
**fail-open default**. Three proofs, three different mechanisms:

**(a) The beat tail falls back to the GM text.** `spike-B2.html` line 1131:

```js
out.beats = w.beats.map(function (b) {
  return { t: b.t, typ: b.k, text: st.role === "gm" ? b.d : (b.pub || b.d) };
});
```

Two lines above sits the comment *"die Zeugenmenge eines Reveals ist Spielleitungswissen und darf
nicht über die Transportleiste hinauslecken."* But `b.pub || b.d` means: a Beat without a curated
public rendering ships its GM rendering. Two of the three fixtures contain such a Beat.
`?world=kepler&role=player` puts **`„Der Kurator war nie an Bord" · Modus: gehört`** into the
player's transport bar; `?world=nebelakte&role=player` does the same with `„Das Datum stimmt nicht"
· Modus: bezeugt`. Grant mode is per the file's own comment GM knowledge, and it is on the player's
screen.

This is not a typo. It is the architecture: every future Beat type, and every Beat type a rule
package invents, needs someone to remember to write a public projection, and the penalty for
forgetting is a leak rather than a blank. At a boundary the candidate itself calls the most
dangerous control in the product, the default must be *omit*, and it is *pass through*.

**(b) The scene name survives a struck curtain.** `project()` builds `out.sitzung` — including
`szene` — at line 1119, *before* the curtain check at line 1123 returns early. Open
`?world=aldenfall&role=player&curtain=struck`: the payload printed in audit card 4 still reads
`"szene": "Aldrics Arbeitszimmer"`. The GM is backstage staging tonight's ambush; the player's client
already holds its name and the in-world date. The response that claims to contain "keine Datensätze"
contains the one datum the curtain exists to hide.

**(c) B1 hides in the DOM and enumerates by keyboard.** `spike-B1.html` line 1590:

```js
document.querySelector('.token[data-entity="hobb"]').hidden = (r !== "gm");
```

The backstage NPC stays in the document, caption and all (`Wirt Hobb · hinter dem Vorhang`), removed
only by `[hidden]{display:none!important}` — the exact anti-pattern the same file's omission note
denounces four hundred lines later. And the keyboard handler (line 1642) announces the hidden
entity's existence to the player in words: pressing `3` as Mira says *"Wirt Hobb steht hinter dem
Vorhang — für Spieler nicht in der Antwort."* A shortcut namespace sized to the full entity list is
itself a disclosure channel; no shortcut should exist for a record the client was not sent.

Three leaks, three mechanisms, both artifacts, all in the feature the candidate nominates as its
largest single risk (W4). W4 is therefore not a risk the candidate is managing; it is a risk the
candidate has already lost twice at demo scale, with four characters and seventeen facts.

---

### F4 — `mode` and `confidence` are unfillable by a deterministic fold, and the ledger renders a lie as firm

**The claim under attack.** §1's two-second read: *"Sela, you were told something about him that you
have no reason to trust."* §6, Change 3: `Grants (… mode: witnessed|told|inferred|read|gm_fiat,
confidence: firm|unverified)`.

**The break.** Nothing in the candidate says who sets `confidence`, and the three data points in the
corpus give two incompatible answers:

| Where | Grant produced | `mode` | `confidence` |
|---|---|---|---|
| `product-B.md` §1 | Sela, hearsay from a lying innkeeper | `told` | `unverified` |
| `spike-B1.html` `doMark()` line 1492 | engine-generated at the table | `erzählt` (told) | **`belastbar` (firm)** |
| `spike-B2.html` `brief` action line 1960 | engine-generated at the table | `told` | **`soft` (unverified)** |

Two engines, two rules, and the hand-authored fixture `f-vach` in B1 uses the third. The Projector
cannot decide this, because truthfulness is not in the Beat: an NPC lying and an NPC telling the
truth emit the identical `Mark` with the identical witness set. Therefore:

- **If `confidence` defaults to firm** (B1's engine), the flex's own demo case inverts. Kaya presses
  `M` at 21:38 to record Hobb telling Sela about the mercenary Vach. The ledger now asserts Sela
  firmly knows something she was lied to about. At 21:47 the GM reads the column aloud and
  *confidently contradicts her own table*. That is W2's failure mode, but arriving through the
  engine's default rather than through a gap in coverage — and W2's proposed honest framing
  ("Recorded, never Known") does not help, because the column is not incomplete here, it is wrong.
- **If `confidence` defaults to unverified** (B2's engine), then E3 — *"The Dossier … the prettiest
  artifact in the product is also the most rigorous one"* — stamps every handout as hearsay. The GM
  issues an official, in-world, verifiable bounty poster and the recipients' columns record it as
  `gehört · unbestätigt`. Mode `read` exists in the schema and the brief action cannot reach it.
- **If the GM tags each grant**, that is per-utterance manual labour, which §7's judging rule
  rejects by name and W2 concedes is unaffordable.

**Secondary consequence — invariant 6.** Calculation transparency says every derived number can show
its derivation. `confidence` is displayed as a first-class badge next to every claim and has **no
derivation at all**: B2's `Warum?` trace (lines 1380–1386) lists beat, witness set, projector,
grant count and canon status — and never explains where `fest` or `unbestätigt` came from, because
there is nothing to say. A field that drives the GM's spoken ruling and cannot be traced is an
invariant-6 hole in the candidate's flagship view.

---

### F5 — The Chronicle Pass is the between-session maintenance the candidate's own rule rejects

**The claim under attack.** §7's judging rule: *"A feature that requires the GM to maintain something
between sessions is, by default, rejected."* §2: the Chronicle Pass is *"the valve between them"* —
23 facts, 2 conflicts, accept/edit/discard/promote, three minutes.

**The break.** The valve has exactly two possible slots and the candidate's own rules forbid both.

- **At 23:50, table still assembled.** Five adults with work tomorrow watch the GM do editorial
  review. The candidate's stated measuring stick is *"whether it survives contact with a live table
  at 21:00 with five humans waiting"*; the Chronicle Pass is the one feature in the product that
  **requires** five humans to wait, for zero benefit to any of them. The exit criterion literally
  scripts it: *"At 23:50 the GM presses End Session, spends three minutes in the Chronicle Pass, and
  closes a laptop."* Nobody else has closed theirs.
- **Later in the week.** Then it is between-session maintenance of the world record — the thing the
  thesis exists to abolish, the thing candidate A is mocked for requiring, and the thing GMs
  demonstrably do not do. If the GM skips it, facts stay `canon_status: proposed` forever and the
  self-writing wiki is a heap of unratified proposals.

There is no third slot, and the candidate never notices the dilemma.

**A second, sharper edge: the pass edits history players have already seen.** Grants are created at
commit time during play (§2's worked example: three Grants at 21:38), so players saw them on their
clients that evening. Discarding a fact at 23:53 revokes a Grant retroactively. Concrete: Mira's
player reads her column at 22:10; the GM discards fact F5 in the pass because she mis-tagged it;
next Tuesday Mira's column is one line shorter than she remembers and there is no record that it was
ever there — the Beat survives, the Grant does not, and the player cannot see Beats. The candidate
built `BeatProposal → BeatCommit` for exactly this problem (§6, Change 2) and then did not extend it
to Grants.

**Cost of the honest fix.** Auto-accept everything and demote the pass to an optional audit. Then
"the GM is the editor of a paper they never had to write" becomes "nobody is the editor", the "2
conflicts" line has no owner, and the promotion path in M5 fires unattended.

---

## MAJOR

### M1 — The Prüfstand measures what cannot fail

`spike-B2.html`'s credibility rests on *"Alle Zahlen im Prüfprotokoll werden im Browser gerechnet,
nicht eingetippt"*. The numbers are computed. They are also chosen so that they cannot fail.

- **The 144-permutation structure sweep is vacuous by construction.** `groupKey(s)` is
  `role + "/" + curtain + "/" + (selection visible)` (line 1524). `buildShell()` branches on exactly
  those three inputs and nothing else. The sweep therefore asks whether a pure function returns the
  same value for the same argument. Worse, the signature cannot see content even in principle:
  `data-leaf` is placed on `collection-list`, all three `grant-list` variants, `scene-art`,
  `portrait`, `trace`, `record-fields`, `brief-list` and `beat-tail` — i.e. on **every node whose
  children vary** — and `sigOf` stops descending there (line 1504). A column with five entries, zero
  entries, or an empty-state block hash identically. "144 Permutationen · 0 Abweichungen" is an
  a-priori truth printed as an empirical result, and the round must not read it as evidence of
  universality.
- **The contrast set excludes the only surface that can fail.** All 17 `PAIRS` are token-on-token.
  The stage headline `h2` sits on `.subject__art` under a scrim that is fully transparent past 88 %
  of its width, over an `<img>` with `filter: brightness(1.22)` applied (lines 524–534). Text over
  raster art is the classic contrast failure and the exact case `03-triumph` names ("controlled text
  scrim"); the harness structurally cannot measure it, and reports `272 Prüfungen · 0 Verstöße`.
- **The motion lamp compares the tokens to the band they were authored to.** `motionState()` reads
  `--t-res/--t-state/--t-trans` from computed style and asserts `110≤res≤180 ∧ 220≤sta≤340 ∧
  600≤tra≤1000`. The tokens are literally declared as `140ms / 260ms / 800ms`. The probe measures a
  1×1px element whose transition is the same variable. It can only fail if someone edits the tokens.
- The sweep room is a fixed `width:1200px` off-screen box (line 727), so no permutation is ever
  observed at any other width — see M2.

None of this makes B2 dishonest; audit card 6 lists real limits. It makes the headline numbers worth
less than they look, and the verdict should price them accordingly.

### M2 — Six players do not fit, and the flex is a horizontal scroll on a desktop

The ledger is one column per present character. The artifacts test four and five.

- **B2, GM, Nebelakte fixture (5 characters + truth = 6 columns).** `.ledger` is
  `grid-auto-columns: minmax(14rem, 1fr)` with `gap: .75rem` and `min-width: min-content`, so the
  register needs `6 × 224 + 5 × 12 = 1404 px`. On a 1600 px desktop the shell allocates the stage
  roughly `1600 − 122 (rail) − 248 (collection) − 352 (lens) − 36 (gaps) ≈ 842 px`. **The flagship
  view scrolls horizontally by ~600 px on a large desktop, with the artifact's own fixture.** Switch
  to the long-text locale and the `max-content` module rail grows to ~300 px, taking another 180 px
  from the stage. There is no sticky truth column in B2 at all, so scrolling right loses the
  reference the two-second read depends on.
- **B2 has no breakpoint below 940 px.** At 380 px the ledger is a 1404 px scroller inside ~348 px:
  four screens of horizontal travel to answer "have we met this guy before?"
- **B1 un-sticks the truth column exactly when it becomes necessary.** `.col.truth` is
  `position: sticky; left: 0` — until `@media (max-width: 620px)`, where it becomes `static`
  (line 767). The tablet player and the GM on a laptop in a café scroll the truth away.
- **Four is hard-wired.** B1 declares `--h-mira / --h-bjorn / --h-sela / --h-ondra` as literal hues
  and renders coverage as `belegt n/4`. A six-player table exhausts the colour system and prints a
  wrong denominator. (B2's cross-review found the hues; the `/4` denominator is the sharper half.)

The flex is advertised as a two-second glance. At five players it is a scroll; at six it is a scroll
with no colour system. The candidate never states a supported table size.

### M3 — "Warum leer?" requires proving a negative, and is 100 % hand-authored in both artifacts

The absence explanation is the flex's second-best moment and its most expensive unbuilt feature.
Answering "why does this character hold no Grant for this fact?" is a search over counterfactuals:
every Reveal touching the entity × the attendance record at that session × the character's join date
× the witness set of each Beat × whether a `told` chain existed — and then a ranking, because the
honest answer is usually five reasons at once. Nothing in `product-B.md` specifies it, prices it, or
names an owner.

Both artifacts fake it, and one of them refutes its own comment while doing so:

- B1: `emptyBlock(isBjorn)` (line 1349) emits three hand-written German paragraphs, **for Bjorn
  only**. Any other empty column gets `"nichts"`.
- B1's `Warum?` trace hard-codes attendance as a ternary on the session number:
  `'<dt>Anwesend</dt><dd>' + (b.s === 5 ? "Mira, Sela, Ondra (Bjorn fehlte)" : "Mira, Bjorn, Sela, Ondra")`
  (line 1335). The candidate's Change 4 makes `SessionAttendance` a first-class table precisely so
  this is not guessed; the artifact guesses it.
- B2 writes the comment *"Anwesenheit ist ein eigener Datensatz — sie hängt nicht daran, ob die
  Figur zufällig etwas weiß"* (line 1146) and then, two lines later, computes
  `anwesend: !ch.why` — attendance derived from the presence of a hand-written excuse string.

The idea is right and B2's cross-review is right to want it in the product. It is not free, it is not
specified, and no artifact has demonstrated it.

### M4 — Replay is unpriced: Amend and Rewind fold against package versions the Forge deletes

§6 makes it non-negotiable that every Beat records `package_id` **and** `package_version`, *"because
replay across a package upgrade is otherwise undefined."* The requirement is named; the mechanism is
absent. E2 (the Amend) is priced at *"almost nothing to build once the Projector exists."*

Concrete: session 40. Kaya amends Beat #212 from session 3, produced under `nebelakte@0.4`. Since
then she has edited her system eleven times in the Forge's visual builder, which — per K2's whole
premise — edits the package in place. Version 0.4 does not exist anywhere. The Amend preview
(*"7 facts change. Mira loses one thing she believed"*) cannot be computed, and neither can Rewind
past any package edit. The candidate has no immutable-publish model, no draft-vs-published split for
packages, no retention policy, and no answer for a package that arrived from Workshop and was
uninstalled.

The unstated prior question is worse: **are Facts and Grants materialised or derived on read?** If
materialised, every Amend requires a full downstream recompute against historical package versions
that must be retained forever. If derived, opening a session-40 wiki page is a fold over ten
thousand Beats. §6 never chooses, and the choice determines whether the product is buildable at all.
This is W3, and W3 correctly asks Nemesis to press it — pressed, it does not hold.

### M5 — Promotion to Universe canon crosses the escalation path the domain model already flagged

`02-domain-model` names the two-dimensional permission matrix (universe role × campaign role × entry
visibility) as *"a genuine escalation path — Athena reviews this before any schema lands."* This
candidate adds a third dimension **and** builds a one-keystroke promotion across the boundary, at
23:52, inside a review the GM is rushing because four people are waiting (F5).

`Facts` carry `canon_status: proposed|campaign_canon|universe_canon|retconned` and `universe_id?`.
Nothing states whether a `universe_canon` Fact carries Grants, whether universe `viewer` members can
read it, or what happens to a fact that is a live secret in campaign B. B1's fixture is a warning in
miniature: `f-lich` — *"Aldric von Kern ist der Lich von Kern"*, the campaign's central secret — is
stored with `canon: "Weltkanon"`. There is no confirmation step, no blast-radius preview, and no
named undo for promotion, although the same document builds preview-and-commit for everything else.

E4 makes it concrete in the other direction: *"In three of your campaigns someone has burned down the
Gilded Eel."* If a Universe has two `editor` members running separate campaigns — which is the entire
point of the Universe layer — then that panel tells GM A what GM B's table did. Cross-table
archaeology is a cross-table leak wearing a feature's clothes.

### M6 — The broadcast scope is unowned and non-monotone

B2 gives the Observer a `Sendefreigabe` column built from `w.facts.filter(f => f.cast)`, subtitled
*"kuratiert durch die Spielleitung"*. Nobody curates it: `cast: 1` is a literal in the fixture, there
is no UI to set it, it is not part of the Chronicle Pass, it appears in no schema in §6, and it is a
**fourth visibility scope** on top of the three §6 already calls the largest risk in the candidate.

It is also non-monotone. In the Aldenfall fixture the Observer receives F3 and F4; the player Bjorn
receives nothing. `02-domain-model` lists `observer` as a real campaign role — a friend between
campaigns, a partner watching the stream. That user now holds facts a seated player's character does
not, from the same server, in the same campaign. Role hierarchies that invert are how leaks are
discovered by users rather than by tests.

### M7 — Slice 1 is Akt I plus half of Akt II, with an exit criterion that cannot fail

**Scope.** §7's "in" list requires: identity, campaign, membership and roles; join-by-link without
accounts plus GM approval; `SessionAttendance` editable mid-session; an append-only Beat store with
`proposal → commit` and Rewind on three Beat types; a deterministic Projector producing Facts and
Grants; a three-scope server-side omission model *with its test written before the UI*; the
Chronicle Pass with conflict handling; the Cinematic **and** Outline recipes; two skins plus High
Contrast plus Reduced Motion with an automated contrast gate; full keyboard operation; NVDA/Firefox
and VoiceOver/Safari passes; in-world dating. That is `01-attack-plan` Akt I complete, the knowledge
half of Akt II, and the permission threat surface the plan defers to Akt V — for a solo stakeholder
with an AI crew. "One Scene, One Reveal, One Recap" is a slogan wrapped around four phases.

**Exit criterion.** *"Kaya runs one real session with real humans… If that does not happen, the slice
failed."* n = 1, run by the author, on a campaign with no history — and W1 concedes the flex *"cannot
be shown without a played history"* and only lands at session three. The criterion is therefore
structurally incapable of falsifying the candidate's own largest risk. A criterion that cannot fail
for the reason the bet is risky is not a criterion.

### M8 — Reachability is unanswered, and K6 is treated as open when it is ruled

`00-intake` §K6 was **RESOLVED on 2026-07-27 by RB-11** — Option C as architecture, ship A, one-time
GM licence, direct sales — and closes with a requirement addressed to every candidate: *"Every
round-1+ candidate must answer reachability with a number, not a hope."* `product-B.md` declares
`00-intake.md` a binding input and then writes *"Deferred to the RB-11 verdict, which does not yet
exist."* It does exist; it is in the corpus the candidate lists as `RB-01..RB-10`.

I accept the snapshot excuse for the citation. I do not accept the gap it leaves: slice 1 ships
*"GM plus up to four players joining by link"* against a self-hostable product, and neither the
candidate nor either artifact says how a player's browser reaches a GM's home server — mixed content,
no certificate for a LAN IP, the Plex DNS-zone problem the intake calls the one cost every
distribution option pays identically. For a candidate whose entire thesis is the live session, an
unanswered "can the five of them actually connect?" is the largest unpriced item in the plan.

---

## MINOR

**m1 — B1's palettes are now measured, and they hold, with one exception.** B2's cross-review is
right that B1's four skins were arithmetically unchecked. I computed 104 WCAG 2.2 pairs across
4 skins × 2 colour modes (body/secondary/meta text on both surfaces, accent-as-text, ink-on-accent,
the four mode chips over their own 12 % tint, the truth header, the curtain pill). **One failure:**
`--gm` on the truth-column header in relic/dark — the default state of the flex, 12.5 px uppercase —
at **4.39 : 1** against a 4.5 requirement. Everything else passes. Fix is one token; the finding
worth keeping is that a marginal failure sat in the default view and nobody knew.

**m2 — B1's "everything is a token" claim is false in five places.** The file header states *"Alles
Farbige, Typografische, Runde und Schattige ist ein Token."* Counter-examples: `.dots span
{font-size: 9px}` (the coverage indicator — 9 px bold, below the 11 px `--fs-micro` floor, and the
only per-character carrier of "who else has this"), `.clock {font: 700 24px/1}`, `.token .disc
{font-size:17px}`, `.empty-col {border: 1.5px dashed}`, and — visibly — the stage's cinematic light
is hard-coded `rgba(255,190,96,…)` and `rgba(130,185,235,…)` (lines 338–339). The Signal skin's
graphite-and-cyan stage glows amber; so does Clean. K1 says skins are data.

**m3 — B1 destroys focus on every state change.** `renderLedger`/`renderPlayer` replace
`scroll.innerHTML` wholesale on mark, undo, role switch and entity select. A keyboard GM who opens a
`Warum?` trace and then presses `M` is returned to the top of the document. `state.openTraces`
restores the panels but not the caret. Accessibility is architecture; focus is architecture.

**m4 — B1's omission note is a live side channel.** It tells the player the exact number of withheld
records *and* names the three other characters (found by B2's cross-review). The sharper half:
`omitted` is recomputed on every render from the full fixture, so the number **ticks up while the
session runs**. A player watching it go from 6 to 8 learns that the GM just revealed two things to
someone else — the precise inference the fog of knowledge exists to prevent.

**m5 — the long-text locale lengthens only the chrome.** `T.long` rewrites zone labels and module
names; the fact claims, character names, in-world dates and source citations — the strings that
actually wrap inside a 224 px column — are byte-identical in both locales. No 60-plus-character
German compound appears anywhere in the fixture. The axis tests the frame, not the content. Related:
because the module rail is `max-content`, switching locales silently narrows the stage on every
screen size (M2).

---

## What I could not break — conceded by name

A clean bill from me has to mean something. These I attacked and they held.

1. **Invariant 4, and its generalisation.** Promoting `defeat_pending` from an exception to the
   engine's default shape (`BeatProposal → BeatCommit` for every consequential outcome, §6 Change 2)
   is the single best structural idea in either candidate this round. It unifies the combat console,
   the Chronicle Pass and Rewind behind one mechanism. B2's fixture renders it correctly to players
   as *"Ergebnis offen — noch nicht bestätigt"*. Nothing to attack.
2. **Control ≠ Attendance ≠ Presence** (§6 Change 4). I tried to collapse it and could not: a PC
   present while its player is absent, a socket open from a phone in a pocket, and a controller grant
   are three genuinely different facts, and the ledger really is wrong the moment they are conflated.
   Correct, cheap now, expensive later. Take it regardless of which candidate wins.
3. **Invariant 2.** No arbitrary code execution anywhere in the document or either artifact. The
   Projector-extensibility question I raise in F1 is a *scope* problem, not a sandbox problem.
4. **Invariant 5.** Satisfied structurally rather than by a flag: slice 1 has no provider at all and
   the Projector is deterministic by construction. This is the strongest AI-optional story in the
   round and the candidate deserves the credit it claims.
5. **Invariant 3.** Template ≠ instance held absolute, with `origin_beat_id` added to instances — a
   real, non-mutating improvement that gives a looted sword a history for free.
6. **Invariant 6's unification.** "Why is this number 14?" and "why does the wiki say he is dead?"
   answered by one trace component walking one Beat chain is a genuine architectural saving, and B2
   implements it as a single `data-comp="trace"` list. My F4 attacks one *field* that has no
   derivation; the mechanism itself is sound.
7. **B2's projection pattern.** `project()` builds the payload before the renderer exists, the
   renderer cannot reach the fixture, and audit card 4 prints the real payload for inspection. That
   is the right shape for "omit, don't hide", and it is more honest than the Triumph spike, which
   projected in the view. My F2 and F3 attack what the projection *forgets*; the pattern is correct
   and should be inherited by whichever candidate wins.
8. **B1's `belegt n/4 · M B S O` coverage indicator.** B2's cross-review is right that this is the
   best single invention in either artifact. Colour is never load-bearing (hue + initial + `title`),
   it answers "who else knows?" in one glance, and it is one aggregation per fact once Grants exist.
   Keep it; fix the denominator.
9. **B1's four skins carry form, not recolour** — radius, frame weight, grain, label transform and
   tracking are per-skin tokens, and Archive at 0 px / 2 px genuinely reads differently from Signal.
   That was the defect Codex's own audit found in the Triumph spike, and it is fixed here.
10. **The weakness list.** W1–W8 are honest, specific and mostly correct, and W2 and W7 are
    self-identified without flinching. Every fatal above is *adjacent* to a weakness the candidate
    named — but none of them is the weakness the candidate named, which is the difference between a
    document that manages its risks and one that merely lists them.
11. **§5, the refusals.** No 3D, no authored-encyclopedia front door, no AI on the critical path, no
    branching Timeline table, no feature-count war. I checked the whole document against its own
    refusals and found no violation. *Mēden agan* observed.

---

## Verdict

Candidate B's **substrate** is the best structural work in round 1 and should survive the round
whatever else happens: Beats, `BeatProposal → BeatCommit`, the three presence concepts, one trace
component, `origin_beat_id`, and B2's project-then-render pattern.

Candidate B's **thesis** does not survive. "Record the table properly and the encyclopedia writes
itself" requires a Projector that can write a sentence, and a deterministic fold over a Beat can only
ever write *"X was shown to Y at 21:34"*. Every one of the 33 claims in the two artifacts was typed
by a human, and the one live write path in the flex demo reports `0 neue Fakten` in its own status
line. The candidate says it should be attacked at W2 and be wounded at the heart if W2 breaks. W2 is
a coverage problem. F1 is a content problem, and it is upstream of W2: a ledger cannot be
*incomplete* until it can be *populated*.

Around that, the permission surface the candidate itself nominates as its largest risk (W4) leaks in
three independent places, in the two artifacts built to prove that it does not, at a scale of four
characters and seventeen facts.

**Recommendation to Apollon.** Do not patch B. Take B's skeleton, kill the *exhaust* claim out loud,
and re-forge the flex around the one thing the Projector can honestly derive — **provenance and
audience over facts a human still writes**. That is a smaller claim, it is still a square no
competitor occupies, and it is the only version of this candidate that can be built.
