# Attack Pass — Candidate B, „The Table Engine" (second pass, against the hardened candidate)

Nemesis, die Widersacherin · 2026-07-27, 05:0x · design round 1
Target: [`product-B.md`](product-B.md) (04:01) · artifacts [`spike-B1.html`](spike-B1.html) (04:53),
[`spike-B2.html`](spike-B2.html) (04:36) — **read as source, not as description.**
Corpus: [`00-intake.md`](../../00-intake.md) · [`01-attack-plan.md`](../../01-attack-plan.md) ·
[`02-domain-model.md`](../../02-domain-model.md) · [`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) ·
`research/RB-01-*`, `RB-05`, [`RB-11`](../../research/RB-11-steam-vs-browser-verdict.md).
Superseded predecessor: [`attack-B.superseded-0325.md`](attack-B.superseded-0325.md) — that pass hit
the 02:23 candidate and the pre-04:00 spikes. **This pass does not re-report anything the revision
closed.** Where a wound was reopened rather than healed, I say so and I say which.

---

## The strongest reading, stated first

I attacked this, not a caricature of it.

**One write path.** A `Beat` is an append-only, server-authoritative, package-pinned record of a
consequential table event. A deterministic `project(seq)` folds beats into live table state read
forwards and into entity pages read backwards. There is no second write path, therefore there is no
synchronisation problem, therefore rewind, blame and replay are not three features but three calls to
the same fold. Six competitors mutate a row and log it afterwards; none of them can retrofit this, and
the abandoned Foundry Pixi v7→v8 migration is the right precedent for why (RB-05, RB-01-foundry). The
candidate then refuses the cheap version of its own pitch in §0 — *"a deterministic fold cannot produce
a world-sentence"* — and narrows the claim to something defensible: the log carries the **bookkeeping**,
not the prose. `defeat_pending`, the Session Diff and rewind collapse into one `Proposal → Commit`
mechanism with one test suite. Control / Attendance / Connection are separated by name before any code
exists. §4 answers reachability with three named paths, a default, and a bill.

That reading is correct, it is materially stronger than the 02:23 version, and §6 is still the best
structural work in the round. I say so by name in the concessions and I mean it.

**What I found is that the candidate now fails at one seam, and everything fatal hangs off it:
`Beat.witness_character_ids[]`.** It cannot be populated deterministically, it is one granularity too
coarse for the `Grant`s it is supposed to feed, and the page the flex sells still contains a typed field
that no gesture in the candidate creates. Plus one clean hit on the attack the candidate explicitly
invited: the package pin does not survive a mid-session upgrade, because the migration is not a beat.

---

## What the revision closed — stated before the attack, so the attack is honest

- **Old F1** (*"the Projector cannot produce a predicate"*) — **half-closed.** §0 now strikes the prose
  claim out loud and better than I would have. The *typed* half is still open and is F1 below.
- **Old F2** (*the gap explanation is a disclosure channel*) — **closed.** The `luecke` block is gone
  from B2's payload entirely, and B1's `Warum leer?` is a GM-side popover. Correctly fixed.
- **Old F3** (*omission is opt-in, redaction fails open*) — **half-closed.** The fact list is now built
  by allow-list (`visibleFactIds()`), not by subtraction. The **beat** channel is still fail-open by
  default (`wit: "all"`), and that is F3 below.
- **Old F4** (*`confidence` is unfillable*) — **closed by deletion.** §6 Change 3: *"A field a
  deterministic process cannot fill is deleted, not defaulted."* I withdraw the finding.
- **Old F5** (*the Chronicle Pass is between-session maintenance*) — **closed.** The ritual is gone,
  replaced by a 90-second in-session diff, and the judging rule now rejects between-session work by
  default.
- **Old M8** (*reachability unanswered*) — **substantially closed.** §4 is a real answer with real
  numbers. One limb survives as M4.
- **Old M7** (*slice 1 is Akt I + half of Akt II*) — **not closed.** It is M5.

---

## FATAL

*A fatal voids a claim the candidate is built on, or violates a hard invariant. Each is reproducible by
a person walking a script.*

### F1 — The page the fusion sells still contains a field that no gesture in the candidate creates

**The claim.** §2, worked example, 22:10 row and the paragraph under it:

> *"Next Tuesday, a player who missed session 12 opens Vaugn's page. Infobox, three linked beats each
> with an 18-second replay, two sentences of GM prose… **That page cost zero minutes of maintenance and
> is a real wiki page.** Nothing on it was invented by software."*

And §1's flex — the whole *"the wiki is version-controlled too"* beat — right-clicks the line
**`Faction: The Ashen Pact (contested)`**.

**The scenario.** 21:38, session 12. Vaugn cracks. The GM selects the passage, presses `T`, drags it to
Sela's portrait. §2's log column records exactly what that gesture produces:

```text
Grant(passage, holder=Sela, mode=told, source=Vaugn, beat=12/7)
```

A grant, on a **passage**, to a holder. The Record column on the same row then asserts:

> *Vaugn's page: `Faction: The Ashen Pact`.*

Nothing between those two cells turns an unstructured passage into
`subject=Vaugn, predicate=Faction, object=The Ashen Pact`. §6 Change 3 names the only two possible
authors: `Claims.created_by: projection | gm`. The projection cannot — §0 says so itself, and a predicate
is a world-sentence in schema clothing. So it is `gm`, and **no gesture, no form, no keystroke and no
second of the labour budget is specified for it anywhere in §2, §3, §7 or §9.**

Then the consequences stack. At 21:52 the GM presses **`Refute`** on *the faction claim* — `Refute`
needs a typed claim to point at. At 21:47 the blame popover reads that claim's `standing`, `mode`,
`source` and `contested since Beat 11`. E1's spoiler-correct recap filters grants attached to claims.
**Three of the candidate's four marquee moments are downstream of an object the candidate never says how
it comes into being.**

**The artifact confirms it rather than answering it.** `spike-B1.html` L1589–1590 hard-codes the two
infobox rows that are supposed to be derived —

```js
rows.push(["Rolle", '<span>Hafenmeister</span><span class="fact__mark">beobachtet · B6</span>']);
rows.push(["Ort",   '<span>Salzhaus am Nordkai</span><span class="fact__mark">B6</span>']);
```

— and `s.claim` is constructed whole, predicate and all, inside beat 7's `apply()` (L1157–1161). The one
thing an attacker needed to see is a fixture.

**Why it is fatal.** This is not "the prose is missing" — §0 conceded the prose and I accepted it. This is
the *typed* half, the half §0 explicitly **keeps**: *"its typed fields, its links in both directions, its
per-character visibility."* If a typed field costs the GM a form at the table, then either the labour gate
(§7: ≤ 4 min typing, no interaction over 12 s) is under-budgeted by however many predicates a session
produces, or the fields do not exist and the page is a timestamped log with a name on it — which is not
"a real wiki page" and is not Fandom-grade. The sentence *"nothing on it was invented by software"* is
true; the sentence *"that page cost zero minutes of maintenance"* is false as written.

**What would close it.** Name the gesture and price it. The honest shape is probably: `T` opens a
two-field quick-claim (predicate from the package's declared relation vocabulary, object by autocomplete
or free literal); passage grant and claim are one beat; the labour gate is re-measured **with** it. §2's
table then gains a sixth row reading *"typing the predicate: yours, ~4 s"* — and the candidate is honest
and still strong.

---

### F2 — `Beat.witness_character_ids[]` has no deterministic source, and the worked example asserts one

**The claim.** §2, 21:38 row: *"Ossa's book: nothing — he was in the next room, and **attendance is
recorded, not guessed**."* §6 Change 4 builds three tables to keep the concept clean.

**The scenario.** Ossa's player Tobias joined at 21:12. He is in `SessionAttendance` with
`joined_at = 21:12`, `left_at = null`. Ossa's token is at O6. Beat 7 fires at 21:38 in scene 3. The
server must now write `witness_character_ids[]`. From what?

Walk §6's tables. `SessionAttendance (game_session_id, user_id?, actor_id?, joined_at, left_at)` is
**session-scoped**: it knows Ossa was at the session, not that he was "in the next room."
`CharacterControllers` knows who *may act*. Connection is ephemeral and explicitly never persisted.
`Beat` carries one `scene_id`, and everyone present is in that same scene. **There is no per-room,
per-zone or per-sub-location presence anywhere in the model.** Token coordinates exist only while a
Tactical recipe is up, and slice 1 cuts LOS and any wall-derived room graph (§7, Out) — so even
coordinates cannot answer "was Ossa within earshot" without the thing that was cut. In a Cinematic or
mapless scene there are no coordinates at all.

That leaves exactly two implementations, and the candidate names neither:

- **(a) Everyone attending witnesses everything.** Ossa gets the grant, the per-character wiki is wrong in
  the permissive direction, and §2's fifth mechanical gift — *"keeping the secret out of the players'
  copy"* — is not a gift, it is a bug with a schema.
- **(b) The GM narrows the witness set per beat.** Then the **most frequent write in the product** carries
  a multi-select, and the labour promise dies at scale: not one form per session, one per consequential
  beat.

Both are reachable from the same 21:38 gesture, and which one ships changes the product.

**Why it is fatal.** The witness set feeds `Grant`s, `Grant`s feed the per-character Record, and the
per-character Record is what §2 says a wiki-first rival *"can have bolted on but cannot have without
making the table the writer."* The differentiator's differentiator has no source of truth — and the
candidate *narrates the derived answer* ("attendance is recorded, not guessed") in the document's
most-quoted table.

**What would close it.** Either model presence explicitly — `ScenePresence(actor_id, zone_id, from_beat,
to_beat)` maintained by the same `SceneChange`/movement beats that already move tokens, which is cheap
because the GM is moving them anyway — or state out loud that the default witness set is *all attending
characters* and that narrowing is a deliberate GM act with a named cost. Do not leave it unwritten: it is
the difference between a feature and a leak.

---

### F3 — One witness set per beat is coarser than per-claim grants — the withheld claim is delivered on the same screen that omits it

**Reproducible, in the candidate's own universality proof, right now.**

**Steps.** Open `spike-B2.html?world=aldenfall&role=player&phase=nach`. In the *Als wen?* select, choose
**Bjorn Eichhorst · Jannis**.

**What the fact list correctly omits.** `visibleFactIds()` / `project()` (L1367–1390) delivers only facts
whose `holders` contain `bjorn`: **f1** (Rolle) and **f3** (Erstmals gesehen). Withheld: **f2**
`Fraktion: Der Aschene Pakt` (holders `["sela"]`, standing `bestritten`), **f4** (`["mira","ossa"]`),
**f5** (`gmOnly`), **f6** `Widerspruch: Das Hafenbuch nennt einen anderen Zahler` (`["mira","ossa"]`).
Audit card 4's lamp then reports **„4 zurückgehalten · 0 im DOM"** and turns green.

**What the same screen hands him anyway.** Two components down, `buildShell()` renders "Was geschah" from
`visibleBeats()` (render at L1570–1576, filter at L1396–1406). Beat **411** is `wit: "all"` (L1053):

> **21:45 — „Das Hafenbuch widerspricht Vaugn. Anspruch wird bestritten."**

Bjorn reads, in plain visible text, on Vaugn's page, directly beneath a fact list containing no faction
and no contradiction: *there is a claim about Vaugn, a ledger contradicts it, and it is now contested.*
The identical string is also the `aria-label` of the beat chip in the never-collapsing Ledger Bar
(L1605–1608) and is spoken verbatim by `say()` on click (L2361–2364) — so the leak is delivered
**preferentially to screen-reader users**, which is an ugly way to lose invariant 1 and invariant 8 in one
motion.

**This is structural, not a fixture typo.** §6's `Beat` carries **one** `witness_character_ids[]`. Beat
411 does two things at once: it creates claim f6 (holders `mira, ossa`) *and* it flips f2's `standing` to
`contested` (holder `sela`). One witness set cannot express two holder sets, and the beat's
human-readable summary is written once for everyone who receives the beat. `visibleBeats()`'s own comment
(L1392–1395) names exactly this risk —

> *„Ohne diese Regel leckt die Transportleiste genau die Aussage, die die Chronikseite zurückhält —
> derselbe Fehler, nur eine Komponente weiter unten."*

— and then implements it one granularity too coarse to prevent it. The author saw the class of bug and
missed the instance.

**Why it is fatal.** Invariant 1 is not "the server filtered something"; it is that a GM-scoped fact must
not reach a player's client. It reached Bjorn's. And it reached him through the component D1 promotes to
*"the one element that never collapses, on any layout, in any zone, at any width"* — so the leak surface
is the one surface the candidate guarantees is always present. §6 already calls the third permission
dimension *"the largest single risk in the candidate."* It is, and the candidate's own artifact shows it
firing on the first player identity I tried.

**What would close it.** Beats do not carry cross-scope prose summaries. A beat carries typed payload; the
*sentence* is rendered per recipient from the claims that recipient holds; a recipient holding none of a
beat's claims does not receive the beat. That is more work than a `wit` field, and it is the work.

---

### F4 — The package pin does not survive a mid-session upgrade, because the migration is not a beat

**The candidate asked for this by name** (§10): *"Nemesis should try to upgrade a package mid-session and
then rewind across the boundary — that is the sharpest attack available against this candidate and I want
it run."* Run.

**The scenario.** Session 12 on `aschenpakt-grundregeln 0.4.2`. At 21:50 the GM notices Glutstoß halves
before resistance instead of after; 0.5.0 fixes it. B3 permits the upgrade: *"Upgrades are explicit,
diffable, undoable GM actions with declarative migrations."* Nothing in §6, §7 or B3 forbids doing it
while a `GameSession` is active. She upgrades. 0.5.0 also adds a `heat` resource to actors, and its
declarative migration seeds `heat = 0` on every existing actor.

Beats 5–13 carry `package_version = 0.4.2`. Beats 14+ carry `0.5.0`. Beat 15 sets Ossa's `heat = 3`.

At 22:05 something goes wrong and the GM rewinds to Beat 12.

`project(12)` folds beats 5…12, every one pinned to 0.4.2. **Where does `heat` come from?** The migration
was not a beat, so the fold cannot reproduce it, so `heat` is undefined in the projected state — while the
live installation is 0.5.0 and the sheet renderer, the action list and the `RulePackageInstallation` row
all say `heat` exists. The GM commits beat 13′. Under which version? If 0.5.0, the log now reads: 0.4.2
beats → a version boundary with **no event on it** → a 0.5.0 beat folded onto 0.4.2-derived state. Replay
of the session — E1's Beat Clip, the recap, the 18-second export, all three of §1's named capabilities —
must switch rule engines mid-fold across a boundary that leaves no trace in the log.

**The pin does not answer this.** A per-beat pin makes each beat *individually* interpretable. It does not
make the *sequence* coherent, because the state transformation reconciling two package versions lives
outside the only write path the candidate has. §6 Change 1's own words — *"there is no second write
path"* — are violated by the upgrade itself: `RulePackageInstallation` is mutated by an operation that is
not a beat.

**Second limb, cheaper and equally real.** §6 says projection snapshots are *"cache, never truth, and can
be dropped and rebuilt."* After a migration that is not in the log, **a dropped snapshot cannot be
rebuilt** — truth is no longer sufficient to reproduce state. That inverts the central architectural
promise.

**Why it is fatal.** §1 says the log plus the pinned package version is *"a complete description of what
happened."* It is not, across exactly one boundary — and that boundary is guaranteed to be crossed,
because §7 makes package upgrades and the rule-builder launch-blocking and E2's whole growth engine is GMs
promoting rulings into new package versions. **The failure arrives on the happy path.**

**What would close it, and it is small.** (1) A `PackageMigration` beat — version from, version to,
migration id, declarative transform — appended like everything else; the fold is complete again and B3's
"undoable" becomes true rather than aspirational. (2) A hard rule, stated in §6 and enforced server-side:
**a package pin is immutable for the lifetime of an active `GameSession`;** upgrades queue and apply at
End Session. That costs the GM one evening of a bug and buys back the substrate.

---

## MAJOR

### M1 — The undo broadcasts to every client *before* the mandatory reason exists, and `Escape` silently re-commits

**Scenario.** 21:47. The cat walks over the keyboard, or the GM's hand finds `Ctrl+Z` out of muscle memory
from the prose field she left ninety seconds ago. `spike-B1.html` L2204–2206 → `doUndo()` (L1936–1953):

```js
b.status = "reverted";
proposal = null; selected = null;
render();
syncClients(11);                    // ← broadcast, to all five clients
say("Beat 12 zurückgenommen. …Grund erforderlich.");
$("#reasonWrap").hidden = false;    // ← the "mandatory" gate opens AFTER the broadcast
```

Six health bars run backwards on three browsers and an iPad, two amber chips retract, the fog re-closes,
initiative steps back. *Then* she is asked why. She presses **`Escape`** — the universal "I did not mean
that" — and L2200 calls `restoreBeat12()` (L1966–1977), which sets the beat back to `committed` and
`syncClients(12)`. The table has now watched the fireball un-happen and re-happen, for no reason, in four
seconds. Two players ask what broke.

**This is forced by the pitch, not by spike sloppiness.** §1's flex is *"Elapsed: four seconds."* A
reason-first modal is not four seconds. So the candidate broadcasts optimistically and asks afterwards —
and W5's mitigation (*reverted beats stay visible as struck-through history*) does not help, because the
damage is the live multi-client state flap, not the log.

**Also.** `.reason` (L996–1022) is a `<div>` wrapping a `<form>`: no `role="dialog"`, no `aria-modal`, no
focus containment, `pointer-events: none` on the wrapper so the whole UI behind it stays operable, and
focus moved in on a 180 ms `setTimeout`. That is the presentation of the most dangerous control in the
product.

**What would close it.** Undo is a **local proposal** until the reason is committed: the GM's own client
shows the reverted projection immediately, the other four see nothing until `Commit`. That is the
candidate's own `Proposal → Commit` mechanism (§6 Change 2) applied to the one action that skipped it.
Four seconds survives; the table does not flicker; `Escape` becomes free.

### M2 — `defeat_pending` is a derived boolean, not a confirmed transition (invariant 4, incomplete)

§6 Change 2 promotes `defeat_pending` to *"the outcome proposal a GM has not confirmed."* The artifact
implements it as arithmetic — `spike-B1.html` L1114–1127:

```js
after: Math.max(0, before - dmg)
…
t.hp = h.after;
if (t.hp === 0) t.pend = true;
```

Three consequences, each walkable:

1. **The pending state evaporates without a decision.** Jarn heals Vaugn for 1 at 21:49. `hp` becomes 1,
   the next projection computes `pend = false`, the amber chip vanishes, and no beat records that *"is
   Vaugn defeated?"* was ever answered. Invariant 4 exists to force an explicit GM confirmation; here the
   confirmation is skippable by any arithmetic that moves the number off zero. The Record then has no
   resolution event to show, and the Curtain Check's *"any `defeat_pending` left open"* lint has nothing
   to find.
2. **Negative health is unrepresentable.** `Math.max(0, …)` clamps. Invariant 4 says *"zero **or
   negative** health"*; a system-agnostic product whose systems include death-saves-at-negative-Con or
   massive-damage thresholds cannot express them. `spike-B2.html` repeats the shape for the accumulating
   resource (`isPending`, L1342–1345: `t.v1 >= t.max`), so the clamp is a pattern, not an accident.
3. **The model cannot hold "visible but unconfirmed".** Read `Beat.status: proposed` as the pending
   defeat's home — the strongest available reading — and `project()` (L1228) does
   `if (b.status === "reverted" || b.status === "proposed") continue;`. A proposed beat is not folded,
   therefore not visible, therefore cannot be the amber chip §1 shows on every screen. So `defeat_pending`
   needs a representation the unification does not give it — which is precisely the saving §6 Change 2
   claims to have made.

**What would close it.** `defeat_pending` is a first-class projected state with two explicit exits
(`DefeatConfirmed`, `DefeatWaived`), both beats, both requiring the GM. Resources carry a package-declared
`floor` rather than a hard-coded `0`.

### M3 — One write path means Tuesday's typo fix is a Beat in Saturday's story, and templates are unversioned in the fold

§6 Change 1: *"there is no second write path. Every mutation is a committed beat."* Follow it honestly.

**Scenario A — the record fills with bookkeeping.** Wednesday 14:02 the GM renames the item template
`Longswrd` → `Longsword` and bumps its damage die. Both are mutations, so both are beats in the campaign
log. `Beat` (§6) carries `type`, `real_ts`, `in_world_date` — and **no flag separating in-fiction events
from authoring**. The Longsword's "What happened" section, which *"cannot go stale; there is nothing to
update"*, now reads: *"21:47 — Ossa runs it through Kord's shoulder"* … *"Wednesday 14:02 — field
`damage` changed 1d8 → 1d10."* The wiki half's flagship section is polluted by prep on the same axis as
story, in a candidate whose thesis is that prep is a queue inside Session.

**Scenario B — invariant 3, in the Record.** Instances are safe: `ItemInstance` rows exist and gain
`origin_beat_id`. The *page* is not a row — it is a fold. If the fold of session 12's beats reads the
**current** template to render "the sword Ossa carried", Wednesday's damage change retroactively rewrites
Saturday's record and Blame shows a derivation that never happened. §6 pins the **rule package** version
per beat but says nothing about versioning campaign-local content, and templates are campaign content.
This is W3's *"the sheet says 14 and the wiki says 12"* landing on a hard invariant instead of a nuisance.

**What would close it.** `Beat.channel: play | authoring` (filtered out of "What happened" by default,
still auditable), and content-addressed template versions so a fold at seq N reads the template as of
seq N.

### M4 — Path 3 ships most of Path 4's deferred bill, and it makes §4's sovereignty sentence false

§4 defers Path 4 (Plex-pattern DNS + per-server PKI) with the bill written down — correctly, and I credit
it. Then Path 3 ships in v1:

> *"The desktop app opens an **outbound** connection to our relay and receives an `https://room-xxxx.…`
> URL."*

That URL is on a domain **we** operate, terminating TLS on a certificate **we** hold, resolving through a
DNS zone **we** run forever, with a per-install enrolment/identity flow binding `room-xxxx` to that GM's
host, plus rate limiting and abuse liability on our side because the hostname is ours. Strip the
per-home-server certificate and Path 3 **is** the Plex service. §4 prices only the bytes (€0.34 per
table-year) and none of the operation it has just called *"a service business, not a feature."*

**And the promise breaks.** §4's CGNAT paragraph closes:

> *"The only thing she loses is our uptime, and the only thing she gains is sovereignty."*

False as written. Every beat, chat line and asset byte of the self-hosting GM's session transits our
relay. Unless the relay is end-to-end encrypted between GM host and player browsers — which nothing in §4,
§10 B5 or the transport port says, and which is hard when the browser shares no secret with the host —
she also loses **confidentiality from us**, which is the specific thing "own your data" is sold to buy.
This lands squarely on RB-11's named target *"the GM-machine-as-server trust model."*

**What would close it.** Either state that Path 3 is a convenience path with our servers inside the trust
boundary (and say so in the UI at connect time, exactly as §4 admirably does for Path 2's secure-context
loss), or specify the E2E scheme and price it. Do not sell sovereignty over a relay you operate.

### M5 — Slice 1 is still Akt I + Akt II + half of Akt III, and its exit criterion cannot be met by its own contents

Count §7's "In" against `01-attack-plan.md`: hosted rooms + accountless join + GM approval (Akt I); a
tactical renderer with drag/snap and **two** fog models — per-player *and* shared, which RB-05 §3 notes
nobody ships together; lossless UVTT import of walls/doors/windows/lights/grid; wall rendering and
blocking; initiative; a declarative rule engine with AST evaluation, preview, trace, commit and
`defeat_pending` (Akt II); rewind across all table state on all clients under 1.5 s; blame; replay;
stub-on-mention; typed infoboxes; filtered logs; automatic backlinks; `[[ ]]` autocomplete; `T` and `W`;
Session Diff with keyboard triage; a differential permission harness at 8 × 40 × 3 × 2; two skins plus
high contrast, reduced motion, `axe-core`, NVDA/Firefox and VoiceOver/Safari; `.chronicle` round-trip as a
CI test; the Outline recipe — **and event sourcing with snapshot maintenance underneath every one of
them**, self-estimated at +25–40 % with no evidence (W3).

That is not *"one encounter, rewound."* That is Akt I, Akt II and the front half of Akt III — and the
launch-blocking list then adds the Electron host, the rule-builder through sheet layout, and
Foundry/Roll20/FG-shaped export.

**And the exit criterion contradicts the contents.** §7: *"Kaya runs one real session with real humans."*
With which system? §7 cuts *"character sheets beyond the demo package"* and the rule-builder. Real humans
run a real game; slice 1 can only run the tiny demo package. The exit criterion is therefore either unmet
or met by a session nobody would otherwise have played — exactly the failure mode it was written to catch.

**What would close it.** Cut the Record's typed half and the Session Diff out of slice 1 and ship *"one
encounter, rewound"* literally: map, tokens, initiative, one action, `defeat_pending`, rewind, blame. The
wiki half becomes slice 2 with its own gate. Or keep the scope and rename the slice honestly.

### M6 — The go-to-market requires AST authoring at the table, and neither artifact shows a ruling as anything but a string

§9-E2 is the strategic core: rulings are *"written in the same closed AST the engine already evaluates, so
promotion adds no expressive power"*, they carry `fire_count`, and after twenty sessions the Forge opens on
the table's own house rules. RB-11 §"Consequence for K4" makes the builder the go-to-market, so this is the
growth engine, not a flourish.

**Scenario.** 21:44, mid-combat, three people talking. Someone is behind crates. The GM rules *"cover halves
area damage."* To become a `Ruling` with `expression_ast` she must now — in combat — choose a trigger, a
scope, and compose an expression in the package's AST vocabulary the engine can evaluate. That is not "one
small form"; that is authoring a rule with an audience waiting. She types a sentence instead, and E2's chain
(`expression_ast` → promotion adds no expressive power → publish to registry) snaps at the first link,
leaving a notepad with a counter.

**The artifacts confirm the fear.** `spike-B2.html` beat 410 (L1052) *is* the ruling, and it is a string:
`„Hausregel ‚Deckung halbiert Flächenschaden' greift zum dritten Mal"`. There is no AST, no expression
editor and no ruling form anywhere in either artifact. **The one feature RB-11 designates as the discovery
channel is the one feature neither spike touches.**

**What would close it.** Spike the ruling-capture form — 30 seconds, at the table, in combat — and measure
it against the labour gate. If the honest version is "the GM names it now and formalises it in the Session
Diff", say that: it is still good and it keeps E2 alive.

### M7 — Rewind is the most expensive operation in the system, it is unbounded, and the artifact blows `03`'s hot-path gate

`03-triumph-ui-direction.md` sets the budget: *300 scene tokens*, *no DOM layout work on the map hot path*,
*60 FPS on a 2020–2022 integrated-GPU laptop*.

**The document.** §7 makes rewind table-wide, multi-client, at Beat granularity, with a scrubber in the
never-collapsing Ledger Bar. It never states a **snapshot cadence**, a **maximum rewind depth**, whether
scrubbing is **local preview or table-wide broadcast**, or what a scrub costs in a campaign at beat 5,000.
Rewind is the flex, so it is performed live, in front of five people, over a log that only grows.

**The artifact, measured against 300 tokens.** `render()` (L1786–1793) runs a full `project(cursor)` and
then ten render passes, and it is bound to the scrubber's `input` event (L2082–2084) — once per pointer
tick. Inside it:

- `renderTokens` → `labelPlace` → `occupied` (L1422–1437) is O(n) over the cast, called per token:
  **O(n²) = 90,000 iterations per tick at n = 300**, plus ~1,200 `style.setProperty` calls forcing style
  recalculation — squarely the DOM layout work `03` forbids on the map hot path.
- `renderGlance` starts up to 300 concurrent `requestAnimationFrame` number tweens (L1442–1459).
- `renderOutline` rebuilds a 300-row table via `innerHTML`.
- `renderFog` re-queries `#fogHoles circle` wholesale and animates the `r` of circles inside a
  `feGaussianBlur stdDeviation="11"` mask (L1267–1270) — a full-canvas SVG blur re-rasterised for the whole
  280 ms transition. That is the freehand-vector dynamic-lighting lag shape RB-05 documents killing Roll20.
- `#tail` is `aria-live="polite"` (L981) and `renderTail()` clears and rebuilds it every tick, so
  **dragging the scrubber queues three beat announcements per step**, on top of the `aria-live="assertive"`
  `#announce`. A screen-reader user performing the flex gets a flood.

**Why major.** The differentiator is a gesture whose cost is unbounded in the two dimensions that grow — log
length and token count — and the only artifact of it demonstrates the anti-pattern at n = 10.

**What would close it.** State the rules: scrubbing is local preview, commit is table-wide; snapshots every
N beats with N named; a maximum rewind depth per session; a debounced scrubber updating the map from a diff
rather than a rebuild; the beat tail not `aria-live`, with one summarising status region instead.

### M8 — B2's four lamps are narrower than they read, and the one that matters cannot fail

B2 sells its lamps as *"kein Siegel, sondern eine Messung."* Three are measurements. One is a tautology.

- **Auslassung (the tautology).** `omissionCheck()` (L2060–2068) searches `mount.innerHTML` for `esc(f.v)`
  of every withheld fact. But `buildShell()` emits facts **only** from `visibleFactIds()` (L1546–1549), so
  a withheld fact's value can never be in the DOM by construction. **The test cannot fail.** It also cannot
  see F3's leak, because beat 411's sentence is not any fact's `v`. Green lamp, live leak, same screen.
- **Struktur.** Real and clever — the `Tag · role · data-comp` signature is the best single idea in either
  artifact. But `nodeSig` (L1868–1880) stops at `data-leaf`, and `data-leaf` is on `#blame` (L1688) — the
  **one component whose contents genuinely differ by role** (GM sees `Wissensrechte`, player sees `Bei dir`,
  L1736–1740) — and during the sweep it is `hidden` and empty. Additionally `if (s === last) continue`
  collapses identical neighbours, so a role receiving 2 targets and a role receiving 6 hash identically:
  **the sweep is blind to cardinality.** Card 1 discloses the `note`/`omit` leaf exemption honestly; it does
  not disclose these two, and they are larger.
- **Kontrast.** Method right, numbers recomputable — genuinely the only such numbers in the round. Coverage
  incomplete: `PAIRS` (L1969–1983) omits `--dim`/`--surface`, `--muted`/`--surface2` and
  `--accent-text`/`--surface2`, all of which are used; and it structurally cannot see the one place text
  sits on **uncontrolled raster** — `.scene__caption .tag` (L1505–1508) is `--muted` on
  `color-mix(surface 82%, transparent)` **over the harbour photograph**, which is where the
  "Bild: geladen · W×H px" status lives.
- **Bewegung.** Honest; the probe is a real element. No objection.

**What would close it.** Replace the string search with a differential test against a *constructed* player
payload; unmark `#blame` as a leaf; stop collapsing neighbours; add the missing pairs; put a scrim with a
measured floor behind any text over raster.

### M9 — E3 turns the flex into behavioural profiling of named third parties, and the stated stance does not cover the asymmetry

§9-E3 is proud of *"Ossa has spoken in 4 of the last 30 scenes"* and *"three of five players have never
used their character's second ability."*

**Scenario.** Ten sessions in, the GM opens the telemetry panel and says, warmly, *"Ruth, you've only spoken
in four of the last thirty scenes."* Ruth did not know she was being counted, cannot see the number, cannot
correct it, and is now the person who was measured by her friend.

The stated stance — GM-only, campaign-local, off by default, never aggregated, never sold, players choose
their own visibility — covers **our** conduct, not the conduct the feature enables. Under GDPR the GM is the
controller and the four players are data subjects; we would be shipping a controller a profiling instrument
over named natural persons in Germany, with transparency and access obligations attaching to a GM who has no
idea she has become a controller. The candidate has already accepted one legal workstream (W2, erasure);
this is a second one and it is unnamed.

**Compounding.** The product is *maximal* per-person attribution by design — that is the flex. E3 only reads
it aloud.

**What would close it.** Player-first symmetry as a hard rule: any number computed about a player is visible
to that player by default and to the GM only with consent, or it is aggregate-only (*"the party's combats
average 47 minutes"* is safe; *"Ossa spoke 4 times"* is not). Plus a plain-language notice at join time,
because that is a controller obligation someone has to discharge.

### M10 — The wiki half is unproven at any scale, in a product whose brief begins with the word "Wiki/Fandom"

Kaya's sentence is **Wiki/Fandom + PnP session**. Across both artifacts the Fandom half is: one entity page,
four hard-coded backlink chips (`spike-B1.html` L891–896), a "What happened" list filtered by a literal array
(`[6,7,11,12,13].indexOf(b.seq)`, L1620–1622), a `<textarea>`, and — in B2 — a four-item scene list whose
largest count is 6.

There is **no search**, **no index**, **no navigation between entities**, **no disambiguation**, **no type or
category browsing**, and **no list longer than six rows anywhere in ~4,700 lines of artifact.** Now put 2,000
entries behind it: stub-on-mention means a two-year campaign has hundreds of typed stubs; `[[ ]]` autocomplete
must rank them; backlinks *"are not maintained; they are queried"* — over what index, at what latency,
filtered by three permission dimensions per row (§6, which itself demands server-side filtering of every
snippet, backlink, autocomplete and "mentioned in" list)? §7 ships the Record's structured form in slice 1 and
budgets none of this.

**Why major and not fatal.** The candidate is table-first by declaration and concedes candidate A owns the
encyclopedist. Fair. But it also claims the return path — *"the wiki is the source of the GM's fastest
gestures"* — and a wiki you cannot search is not a source of fast gestures. **The half that is 50 % of the
stakeholder's sentence is about 2 % of the evidence.**

### M11 — Content strings have no wrap control, and B2's "Langtext" axis is aimed at the wrong strings

B2 deserves credit for having a `lang` axis at all — *"die Locale, an der Layouts sterben"* is the right
instinct. But `T.long` (L1233–1258) lengthens **button labels and section headings only**. Entity names, fact
values, target names, prose and beat summaries are byte-identical in both settings. German compounds do not
appear in chrome; they appear in `w.subject.n`, `f.v` and `target.n`.

**Scenario.** A German GM names an NPC `Rechtsschutzversicherungsgesellschaftsvertreterin`, or a fact value
reads `Hafenmeisterei-Verwaltungsvereinbarungswiderruf`. Grep says `overflow-wrap` appears **once in 4,739
lines of artifact**, on `.blame dd` (B2 L630). Nowhere else, and `word-break`/`hyphens` appear zero times. So:

- B2 `.fact__v` (L589) in a `.lens` column of `minmax(302px, 372px)`: an unbreakable 48-character token
  overflows the column, and `body { overflow-x: hidden }` (L243) clips it. **The fact value is unreadable and
  unreachable — no scroll, no ellipsis, no wrap.**
- B2 `.target__name b` in a `34px | 1fr | 96px` grid: the same.
- B1 `.page h2` at 26 px in a 730 px column (L553): overflows, clipped by `.app { overflow-x: hidden }`
  (L207).

B1's `.glance__n span` and `.ctx__campaign` *do* carry `ellipsis`/`nowrap` — so the author knows the technique
and applied it to chrome, not to content. The same mistake as the `lang` axis, one layer down.

**What would close it.** `overflow-wrap: anywhere` (plus `hyphens: auto` under `lang="de"`) on every
content-bearing string, and a `lang=long` axis that lengthens **content**, not labels — the axis that would
have caught this.

### M12 — On a 380 px phone the second half of the flex has an unreachable confirm button

`.blame` (B2 L614–621) is `position: fixed`, `width: min(392px, 100vw - 24px)`, `display: flex;
flex-direction: column` — **no `max-height`, no `overflow`**. `place()` (L1800–1808) computes
`top = min(max(10, r.bottom - h/2), innerHeight - h - 10)`; when `h > innerHeight - 20` the second term goes
negative, `max(10, …)` pins it to 10, and the rest of the card renders below the viewport with nothing to
scroll.

**Scenario.** Ruth is on a 380 × 660 phone. Role `player`, `lang = long`, `contrast = high` (thicker borders,
no ornament). She taps a fact for its provenance; `askRevert`'s confirm card is taller still — seven `dl`
rows, a four-line warning block, then the actions. `„Verstanden, zurücknehmen"` and `„Abbrechen"` are
off-screen and unreachable. The ✕ survives, because it is pinned to the top.

**Why major.** §7 promises iPads and phones as first-class joins, and RB-11 records that *"we are claiming an
iPad advantage we have never tested."* This is the first test and it fails.

### M13 — B2's target list is not role-filtered: "one component, two projections" holds only for the fact list

`buildShell()` renders `w.targets` identically for `gm`, `player` and `observer` (L1512–1529), and the client
strip repeats every target's bar for every connected device (L1668–1683). A player therefore sees
`Kaimann Bruk · NSC · 0 / 18 LP · Niederlage offen` — exact NPC hit points, exact maxima, exact pending state —
and the observer sees them too.

In most systems an NPC's exact HP is a GM fact, and the whole Curtain model (D2) exists to gate what player
clients are *sent*. Audit card 1 then celebrates that player and observer share a structural signature — and
the reason they do is that **only one component is projected.** The universality proof's role axis is real for
`facts` and decorative for `targets`, `initiative`, `scene__plan` and `clients`.

**What would close it.** Route the target list through `project()` like the facts, with a package-declared
`resource.visibility` (exact / band / hidden) per actor type. The same demo then becomes evidence.

### M14 — The flex speaks to the audience RB-11 says is not the channel, and is weakest on the axis RB-11 says is

The candidate concedes the pieces (W4: the flex dies in a screenshot; W7: 95 % of wall-clock is between
sessions; W8: on K2 we are behind today) but never joins them, and joined they are a strategy break.

*"Wait — you can undo a session?"* only lands on someone who has felt the pain of six manual HP edits. That
person is a Foundry or Roll20 veteran with a running campaign, 19 installed modules, a system we cannot run,
and — by §5's own honest ledger — a better tactical table than our slice 1 for years. The switching cost is a
campaign.

RB-11 §"Implications" 4 says discovery runs through **creators and system authors**, therefore *"the visual
rule-builder IS the go-to-market."* A system author does not care about rewind. They care about K2 — which the
candidate sequences to Act III/IV (honestly) and on which W8 admits Alchemy's Sheet Builder is shipped, in open
beta, with a validated block taxonomy, while ours is a plan.

**So the demo targets the population we cannot convert and under-serves the population we must convert.** E2 is
the bridge, and E2 is unspiked (M6).

**What would close it.** Make the rulings → builder path a first-class part of the round-1 pitch *with an
artifact*, or accept that the go-to-market is the Forge and re-sequence the slice accordingly. Do not ship a
demo whose applause comes from people who will not buy.

---

## MINOR

**m1 — §4's cost table contradicts its own compute cross-check by ~20×.** The row "R2 + Hetzner CX22" reads
€0.03 / table-year and €0.0002 / session-hour. The paragraph below derives €0.003 / session-hour from compute,
which at ~200 session-hours per table-year is **€0.60**, and then says compute *"dominates the bandwidth
line"* — which cannot be true of a row totalling less than compute. The blended conclusion (€0.02–0.05 per
session, €1–3 per table-year, break-even at 8–20 years) is internally consistent and **survives**; only the row
is wrong. Fix it before anyone quotes it.

**m2 — RB-05 says "days-to-weeks", the candidate says "S (days)".** §7.3. Small, but the candidate's
estimating discipline is otherwise excellent and this is the one place it rounds toward itself.

**m3 — "Wall authoring is out; wall rendering and blocking is in" is under-specified.** §7 cuts dynamic
lighting and LOS. Blocking *movement* is collision (cheap); blocking *sight* is LOS (cut). Since the same slice
ships per-player fog, every reader will assume walls occlude, and they will not. Say which.

**m4 — B1's own UI asserts a UVTT import it does not perform.** The stage line (L791) reads
*„UVTT-Import ‚nordkai-salzhaus.dd2vtt'"*, and the CSS comment above four hand-written `<path>` strings reads
*„Wände aus dem UVTT-Import — Daten, kein Zeichenwerkzeug"* (L1339–1344). The honesty note is excellent — and it
lives inside a collapsed `<details>` that no screenshot in a verdict deck will carry. Put the disclaimer on the
stage line.

**m5 — The Curtain Check cannot run when it is needed.** §3 lists *"a scene whose budget will render at 20 fps
on the weakest connected client"* as a **pre**-session lint. At 20:55 nobody has connected. Either it runs
against last session's device profiles (say so) or the line is aspirational.

**m6 — `aria-label` on a bare `<li>`** (B1 L1493, `.glance li`). Not reliably announced on `role=listitem`. The
visible text saves it, but the state strip is the documented fallback for when map labels cannot fit, so it
should be built from real semantics.

**m7 — B2's 300-permutation sweep blocks the main thread synchronously**, with no `aria-busy` and no progress.
On a modest laptop the tab freezes for seconds after a button press labelled „300 Permutationen durchrechnen".
Cheap to fix; a demonstration of rigour should not itself feel broken.

---

## What I could not break — conceded by name

A clean bill from me has to mean something. These are the things I attacked and failed to move.

1. **§0.** The best paragraph in the round. Striking *"the wiki writes itself"* before an attacker has to, and
   re-stating the claim in the form that survives, is exactly the discipline this crew asks for. I spent real
   time trying to show that the *bookkeeping* claim is also false and I could not: page existence, identity,
   backlinks, dating, changelog and graph position genuinely are mechanical. **Four of §2's five gifts hold.**
   Only the fifth (the secret) fails, and it fails on the witness set, not on the idea.
2. **§6 Change 3's deletion of `confidence`.** *"A field a deterministic process cannot fill is deleted, not
   defaulted."* That closes the previous round's F4 properly rather than cosmetically. Adopt the sentence as a
   crew rule regardless of which candidate wins.
3. **§6 Change 4 — Control / Attendance / Connection.** The distinction is right, and I could not break it *as a
   distinction*. F2 is that Attendance is too coarse to feed witness sets — a missing fourth concept, not an
   error in the three.
4. **The `Proposal → Commit` unification.** Collapsing `defeat_pending`, Session Diff triage and rewind into one
   mechanism with one test suite is a genuine and large architectural saving. M2 is a missing transition inside
   it, not an argument against it.
5. **The package-format answer to RB-11's named target.** Closed AST; no embedded HTML/JS/Lua; no scripted SVG;
   no arbitrary URL fetch from package data; no shell-out; no dynamic asset loading by path; rulings written in
   the *same* AST so promotion adds no expressive power. I looked for an escape hatch and there is none in the
   stated format. **This is the strongest invariant answer in the round.**
6. **B3 + B6.** Vendor-on-first-use with content-addressed hashing kills the takedown/abandoned-author problem
   and keeps Blame's derivation renderer available forever. `.chronicle` with packages as
   `{sourceId, version, sha256}`, assets by content hash, round-trip as a slice-1 CI test **including the
   shredded-data case**, is as good an answer to RB-11's Ariadne target as paper allows. F4 attacks the
   *migration*, not the pin.
7. **§5, the differentiation ledger.** I spot-checked it against the briefs rather than trusting it: Foundry's
   1,590-of-5,338 V14 compatibility (RB-01-foundry L122) ✓; Roll20 has no campaign export and declined
   custom-content export citing security/copyright (RB-01-roll20 L94–97) ✓; Fantasy Grounds free since
   2025-11-08 ✓ **and** SmiteWorks' cloud relay already solving reachability for them, for free
   (RB-01-fantasy-grounds L18) ✓ — a genuinely painful admission the candidate volunteered against itself;
   TaleSpire's sheets and rules still deferred past 1.0 after ~5 years ✓; Alchemy's Sheet Builder shipped in
   open beta while ours is a plan ✓. **Every "they still do better" I checked is real and none is softened.**
   *"For a 5e tactical table playing tonight, Foundry beats our first slice outright"* and *"Our v1 renderer
   will not beat Warp Core, and I will not claim it will"* are the two most valuable lines in the candidate.
8. **§4's Path 2 honesty.** The secure-context loss is enumerated correctly and completely — service worker,
   WebGPU, `crypto.subtle` — with WebGL2, the DOM product and the accessibility tree correctly excluded. Telling
   the GM in one sentence at connect time instead of failing mysteriously is the right pattern and should become
   the template B8 says it is.
9. **§4's Owlbear cross-check.** 3 TB/month ÷ 2 GB per table-year ≈ 18,000 active tables. I recomputed it; it is
   right, and using a competitor's published number to sanity-check one's own model is the correct instinct.
10. **B1's reduced-motion cascade.** I tried to break it and could not. Every duration in the file hangs on four
    tokens; `:root[data-motion="full"]` (0,2,0) out-specifies the `prefers-reduced-motion` block's `:root`
    (0,1,0) *and* comes later, so user choice beats the system in **both** directions with zero `!important`;
    the infinite `pulse` is separately killed by name in both the attribute and the media-query branch, avoiding
    the 1 ms-infinite hot loop that a naive token swap would produce. That is careful work.
11. **B1's small correctnesses.** `[hidden]{display:none !important}` guarding against a required dialog opening
    on load; the `.booting` class killing first-paint transitions; token transforms set *before* insertion so
    nothing travels from the corner; the label-placement fallback chain (below → above → right → suppressed) so
    a scrum does not produce overlapping names; hue generated by FNV-1a from the id with a golden-angle collision
    guard, and colour **never carrying alone** (initial + name + side-shape). None of that is decoration; all of
    it is the difference between a mockup and a component.
12. **B2's contrast method.** Computing from live `getComputedStyle` across 4 skins × 2 modes × 2 contrast levels,
    in the browser, at the moment of viewing, is the only number in this entire round anyone can recompute. M8
    attacks its *coverage*, not its method. The method should become the CI gate `01-attack-plan.md` Akt I
    already promises — whichever candidate wins.
13. **B2's structural signature as an idea.** `Tag · ARIA-role · data-comp`, hashed across axes, is the first
    falsifiable test of `03`'s independent-axes doctrine anyone has produced. As a jsdom snapshot test it costs
    about a day. Take it into the champion regardless of this verdict.
14. **W2 (right to erasure).** I could not improve on it and I could not break it. Identifying crypto-shredding,
    naming all three of its permanent consequences (irreproducible projections, partially opaque export bundles,
    honest holes in replay), and flagging the GM-vs-player controller question as `[legal — needs counsel]` is
    better than most shipped products manage. M9 adds a second legal workstream beside it; it does not undercut
    this one.
15. **The `Beat` table's shape itself.** Append-only; `parent_beat_id` for the proposal chain; per-beat package
    pin; snapshots as disposable cache. All four fatals are about what the table does **not** carry — a presence
    concept, a per-claim scope, a migration event, a predicate-creating gesture — and none of them is an argument
    for a different substrate. **If Apollon takes anything from B into the champion, take §6.**

---

## Verdict

**Not shippable as written; the substrate should survive the candidate.**

The 04:01 revision is a real improvement on 02:23 — it killed its own best lie in §0, deleted a field instead of
defaulting it, priced reachability, and wrote the most honest competitive ledger in the round. Three of the
previous pass's five fatals are properly closed and I have withdrawn them by name.

What remains is one seam and one omission, cheap to state and expensive to leave:

- **`Beat.witness_character_ids[]` cannot be populated (F2) and is too coarse to be trusted (F3).** Everything
  the candidate claims over a wiki-first rival — per-character knowledge, spoiler-correct recaps, server-side
  omission as a *gift of the log* rather than a chore — is downstream of that array, and the candidate's own
  artifact leaks through it on the first player identity I tried.
- **The typed predicate has no gesture (F1).** §0 conceded the prose and stopped one field short of honest.
- **The migration is not a beat (F4)** — the one attack the candidate invited; it lands, and the fix is two
  paragraphs long.

None of the four argues against event sourcing. All four argue that the candidate has not finished writing the
write path it claims is its only one. If B is not the champion, **§6, the `Proposal → Commit` unification, B2's
contrast gate and B2's structural signature should be carried into whatever is.**

### Regression tests owed before any of this is fixed

Per the standing rule — every confirmed break becomes a failing test first.

| # | Test | Asserts |
| --- | --- | --- |
| R1 | `tests/regression/beat-tail-scope.spec` | For every (world × role × identity): no beat string delivered to a client mentions the subject of any claim that client has no grant for. **Fails today on B2, Bjorn, beat 411.** |
| R2 | `tests/regression/witness-set-source.spec` | Every committed beat's `witness_character_ids[]` is reproducible from persisted state alone — no UI, no replay of GM input. **Currently unimplementable, which is the finding.** |
| R3 | `tests/regression/replay-across-migration.spec` | Commit under vN → migrate → commit under vN+1 → rewind past the boundary → re-commit → full replay yields a byte-identical projection. |
| R4 | `tests/regression/snapshot-drop-rebuild.spec` | Dropping all projection snapshots and refolding from beat 0 reproduces current state exactly, including post-migration campaigns. |
| R5 | `tests/regression/undo-broadcast-order.spec` | A revert is not visible to any non-initiating client until the reason is committed. |
| R6 | `tests/regression/defeat-pending-transition.spec` | `defeat_pending` clears only via an explicit `DefeatConfirmed`/`DefeatWaived` beat; healing above zero does not clear it; a package-declared negative floor round-trips. |
| R7 | `tests/regression/template-fold-version.spec` | Editing an `ItemTemplate` does not change the projection of any beat with a lower `seq`. |
| R8 | `tests/regression/content-overflow.spec` | A 90-character unbreakable German compound in an entity name, a fact value and a target name is fully readable at 380 px, 1280 px and 200 % zoom, in all four skins and both contrast levels. |
| R9 | `tests/regression/blame-popover-viewport.spec` | The provenance popover's primary action is reachable at 380 × 660 with `lang=long` and `contrast=high`. |
| R10 | `tests/regression/role-projection-targets.spec` | Target list, initiative, scene plan and client strip are projected per role, not merely the fact list. |

> *Du hast den Schreibpfad gefunden — und ihn nicht zu Ende geschrieben.*
> *Ein Protokoll, das nicht weiß, wer im Raum stand, erzählt am Ende jedem alles.*
