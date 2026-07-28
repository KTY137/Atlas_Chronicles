# Attack Pass — Candidate A, „Die Woche" (Round 4)

**Nemesis, die Widersacherin.** Read: `product-A.md`, `spike-A1.html` (markup + script, full file),
`spike-A2.html` (markup + script, full file), `00-intake.md`, `02-domain-model.md`, `CHAMPION.md`
(§§4, 6.8, 6.9, 9, 11–14), `RB-11-steam-vs-browser-verdict.md`, and round-03's `attack-A.md` for
lineage. Every break below is a walkthrough a person could actually have; nothing here is argued
from a strawman reading, and I concede by name what did not break.

**Verdict in one line:** the thesis's mechanism is well-typed and its privacy math is genuinely
sound where I could test it in code — but the thesis needs a player to reliably *come back* three
days later with no account, and the document that specifies "two hands, three days apart" never
once names what the second hand holds onto in between. That gap is fatal to the thesis as
written, not to the corpus's ten numbered invariants directly, and I say so precisely below.

---

## Break 1 (FATAL to the thesis as specified) — the second hand has nothing to hold

**The scenario.** Session 14 ends. Kaya issues three Vollmachten at 23:41, one of them to Sera:
*„Frag in der Kanzlei nach — gegen 18."* Sera joined this campaign the way `product-A.md` §7.1
step 2 and `CHAMPION.md` §6.8 both specify: **by link, display name, no account** — "die
Namenswache" normalises her name and that is her *only* identity at the table. Tuesday at 22:41
she is not at the table. She is on her phone, on a train, per the candidate's own flex narrative
(§2). She opens the app.

**The question the document never asks: how does the server know this phone, on this day, with
this browser, is Sera?**

- `02-domain-model.md` ties every permission-bearing object to `user_id`
  (`CharacterControllers(character_id, user_id, permission)`, `AuthSessions(id, user_id, …)`).
  `Users` carries `password_hash` — i.e. the schema's only modelled identity mechanism *is* an
  account.
- `CHAMPION.md` §6.8 states the account-free model explicitly and narrowly: *"An
  account-free table the display name is the only identity, and the GM grants revelations by
  clicking a name in a list."* That sentence describes **one evening, one room, one GM watching**.
  It says nothing about Tuesday.
- `CHAMPION.md`'s own presence model (§ *Presence is three things*) separates **Connection**
  from Attendance and Control and calls connection explicitly **"ephemeral, never persisted."**
  That is the one sentence in the whole corpus that touches this question, and it says the
  opposite of what Die Woche needs: it says the connection is *not* meant to be durable.
- Nowhere in `product-A.md` — not in §3 (the mechanism), not in §6 (the data shape), not in §7
  (the slice), not in §8 (the honest ledger, which otherwise volunteers weaknesses freely — see
  §8.1–§8.8 — and is exactly the place this belongs) — does the word "Konto", "Zugangslink",
  "Gerät", "Cookie", or any return-access mechanism appear. I grepped the whole document for
  every plausible term. It is not an oversight recorded and deferred; it is not mentioned.

**Why this is not a nitpick.** Walk the actual failure modes a real Tuesday produces:

- Sera's phone browser is Safari in a way that clears site data after a week of non-use (default
  on iOS for sites without recent interaction), or she force-quit and cleared "website data" the
  way ordinary humans do when a phone runs low on storage. Whatever cookie/localStorage token
  carried "you are Sera" is gone. She opens the link fresh. There is no login screen to recover
  through, because there is no account.
- She joined at the table on a shared tablet the GM passed around (a common real-table pattern
  for a "no install, join by link" product) and is now on her *own* phone for the first time.
  Same failure: no token ever existed on this device.
- Nothing in either spike or either design document distinguishes these failures from "she just
  didn't bother." **Gate W1 (die Türquote, §7.5) measures "≥50% of issued Vollmachten fired
  before expiry" as the candidate's own gate zero** — and it cannot distinguish a disengaged
  player from a locked-out one. A product could ship, run four instrumented weeks, go green on
  W1 for the wrong reason (the players who kept a warm session survived; the ones who didn't
  silently vanished from the numerator *and* the denominator's intent), and the verdict would
  never know.

**Why it is worse than a UX bug.** Whatever mechanism *would* fix this — a bookmarkable
capability link per character, a magic-link-by-email, a PIN-recovery flow — has to be invented,
and every option on the table trades against something this lineage already ruled on:

- A bare capability URL that reopens "Sera's book" is functionally **an anonymous bearer
  token**, which `CHAMPION.md`'s refusal list bans explicitly (*"No anonymous bearer token"*,
  §11) and `product-A.md` §10 re-affirms as inherited **verbatim**. Bearer-URL security is
  exactly the failure mode invariant 1 warns about generally (client-held secrets are not a
  permission boundary) applied to the specific case of a URL that leaks through browser history,
  shared-device autofill, screenshots, and pasted-into-Discord accidents — and a leaked Sera-link
  hands the holder her Vollmacht, her sealed-line preview state, and read access to a personal
  Kodex that by this candidate's own design contains **Hörensagen she was never meant to
  broadcast**.
- An actual email/PIN account contradicts the flex's own step 2 and the "no install, no account,
  20 minutes to a table" onboarding promise this lineage has fought for since round 1.

Neither option is discussed, priced, or even named as an open question. Compare: §8 prices four
other weaknesses in dollars, days, and percentages. This one — the precondition for the entire
mechanism to function unattended — is priced at nothing because it is not there.

**What actually breaks, concretely, end to end:** Kaya spends her tired 90 seconds at 23:41
writing and sealing three lines for three named players. One of those players — say, the one on
the tablet with the worst phone hygiene — never regains access. Her door quietly never resolves
to anything from her side; from the GM's side, the "Woche" panel just shows one Vollmacht that
expired unfired at session 15, indistinguishable in the data from a player who read the door and
chose not to walk through it. **The single number the GM surface is allowed to show her — "wie
viele Türen sind noch offen, es kann nur fallen" — has just quietly lied about why it fell.**

---

## Break 2 (MAJOR) — the roll and the mint are two keypresses, and the document never says what a
lost connection between them does

**The scenario.** The brief specifically asks to stress-test "one player on a tablet with 3G."
Put Sera on that tablet, in the exact flex moment. She presses the door. The server genuinely
rolls (both spikes are honest that the roll is real, not decorative — A2's `mulberry32()` PRNG
and the "the roll is really rolled; the seed is printed" comment are the correct thing to build).
The roll succeeds: 21 against 18. The card renders. **Now her connection drops** — a train
tunnel, a dead zone, the exact conditions the brief asked for — before she can press `Ctrl+Enter`.

**What happens to Vollmacht v_031?**

The precondition in `product-A.md` §3.1 is written entirely from the perspective of the *mint*
call (`praegung.beleg`), which checks `v.eingelöst_durch_wurf_id IS NULL`. That tells me the
*roll* (`wurf`) and the *mint* are separate persisted operations — which is good, and correctly
separates "the die was cast" from "a human confirmed it," honouring the champion's own invariant
that nothing becomes canon without a keypress. But the document never says, and neither spike
implements, what state the Vollmacht and the Wurf are left in when the roll succeeds
server-side and the client never receives or acts on it:

- If the Vollmacht stays `offen` and the successful `Wurf` persists unredeemed, that is
  *correct* — but nothing in either spike shows a "resume" path: reloading the page in spike A1
  (`btn-reset`) hard-resets to the demo's initial state, and spike A2's roll-state (`S.wurf`) is
  pure in-memory JS with no persistence or rehydration on reconnect. Neither artifact demonstrates
  that a player who reconnects five minutes later — or the next morning, since der Briefkasten's
  whole reason to exist is that reconnection can be hours late — gets back to "your roll succeeded,
  press Ctrl+Enter" rather than a page that has forgotten the roll ever happened.
- If instead an implementer reads "the roll spends the Vollmacht" (a reasonable reading of "on
  success the handler releases…", since §3.1 describes success and mint together as one
  paragraph) and commits the roll and the consumption atomically **before** the client's second
  keypress arrives, then a lost acknowledgment after a successful roll can silently produce
  **exactly the automatic canon the thesis's own founding sentence forbids** if any retry or
  crash-recovery path re-sends the mint request without first re-checking a still-open precondition
  — or, in the safer failure direction, silently and permanently spends a scarce, capped resource
  (≤1 per player per week + 2 free-floating) for a `Passage` the player never got to see arrive,
  which is a worse experience than the honestly-conceded `freigabe: offen` GM-debt path in §8.2,
  and isn't costed anywhere.

Either reading is plausible from the prose as written, and the two readings have opposite
failure modes (one merely inconveniences a scarce resource; the other risks the "Nichts wird
automatisch Kanon" invariant itself under a network partition). A specification that supports two
contradictory implementations of its own core transaction, at precisely the reachability seam
this document spends all of §8.3 pricing in the other direction (server-side wake latency, not
client-side connection loss), is a real gap — and it is a gap the brief's own "3G tablet" and
"Tuesday phone" scenarios are custom-built to expose.

---

## Break 3 (MAJOR) — the week's cost is universal; its benefit is conditional on a wiki the
candidate never requires, and no gate can tell the difference

**The scenario asked for directly by this task:** does the Wiki+Table fusion survive a GM who
does not want to write a wiki?

Every worked example in this document — the flex (§2), the worked week (§3.2), the first slice
walkthrough (§7.1) — presupposes a Haus Vharon with **31 existing paragraphs, five sections, a
pre-populated infobox, and a red link already sitting in it** before Die Woche's mechanism does
anything. The door mechanism's anchor type is explicit about what it attaches to:
`anker ∈ RoterLink(link_id) | Passage(pid) | Ort(region_pid)` — it is a decoration on top of
content that must already exist. "Die Lücke" (CHAMPION §10.6), which the document credits with
making Kaya's 90-second ritual possible ("she chooses rather than invents"), computes its
candidates *from the wiki's own red links and passages*. A GM who plays in the pack's own
intended lightweight mode — an Anlass, some dice, minimal between-session writing, the kind of
table the champion itself was originally built to serve without demanding a wiki habit — gives
"die Lücke" nothing to mine. Kaya's Saturday-night ritual degrades from "press V three times over
pre-computed candidates" back to "write three sealed lines and three anchors from a blank page,"
which is exactly the authoring cost §8.2 already prices at "can consume the entire typing budget"
— except worse, because §8.2's number assumes die Lücke's assistance and this GM doesn't have it.

**And the costs do not degrade with the benefit.** Every player's Tuesday capability requires the
world to be reachable (§8.3's +8.7% hosted-compute allowance, the scale-to-zero wake budget, the
degraded-laptop-shut path) *regardless of whether there is anything behind a door that week.* A
GM who writes no wiki still pays 100% of the availability tax and the GM-authoring-cost risk for
0% of the flex. The candidate's own gates do not catch this: **W1 (die Türquote)** measures fire
rate against issuance, and **W2 (das dickere Buch)** measures passages-gained-on-non-session-days
— both are silent on *why* a week produced nothing. A red W1 is declared to mean "the thesis is
refuted" (§7.5's own words: *"Say so before marketing does"*) — but a red W1 caused by "this GM's
wiki has nothing to anchor doors to" and a red W1 caused by "players fundamentally don't want
between-session play" (the round-03-fatal shape §8.1 already names and refuses to argue past) are
mechanically indistinguishable in the instrumentation as specified, and only one of those two
causes should kill the thesis. A four-week pilot with a low-wiki GM would fail W1 for a reason
that says nothing about whether "Zwei Hände, drei Tage" works for the GM this candidate actually
demonstrates it for.

---

## Break 4 (MINOR, code-level) — the flex's own artifact has no overflow guard on the door it
calls its highest-risk oracle

`product-A.md` §6.4 names `tuer_zustand` **"the highest-risk new oracle in this candidate,"**
because whether a link is a door tells the reader something exists behind it. I read both spikes
as code specifically to see whether that widget survives the stress cases the brief names —
a 380px viewport, a long label.

- **Spike A1** (`spike-A1.html`), the artifact that stages the actual flex demo (§2's "Beat
  four," the sentence Timo says out loud), renders the door target inside `.tuer-ziel`
  (`font: 600 var(--fs-body)/1.2 var(--f-ui)`, no `min-width: 0`, sitting in a `display: flex`
  header `.tuer-kopf`) inside a parent `.tuer` that is explicitly `overflow: hidden`. I grepped
  the entire stylesheet: **`overflow-wrap`, `word-break`, and `hyphens` never appear on
  `.tuer`, `.tuer-ziel`, `.tuer-meta`, `.ib-liste dd`, `a.eintrag`, or `.leer`.** The one
  `hyphens: auto` in the file is scoped to plain body paragraphs (`.absatz > p:not(.chip)`),
  never to the door.
- **Spike A2** (`spike-A2.html`), the later, explicitly-named "Universalitätsprüfung" built to
  stress exactly this ("a 90-character German compound noun" is this task's own framing, and A2's
  design intent is visibly the same: it sprinkles `overflow-wrap: anywhere` onto nineteen
  different selectors), **does** guard the equivalent widget: `.tuer .ziel span {
  overflow-wrap: anywhere; }` (line 688). The authors demonstrably know the fix. It is not in the
  artifact that stages the demo.

**Concretely:** every place name this campaign uses is short — "Ossa," "Kanzlei," "Vharon." German
compound nouns for exactly this kind of in-fiction bureaucratic institution routinely run 30–50+
characters with no internal space (`Kanzleiverwaltungsordnung`, `Siegelbuchführungspflicht`). Feed
one into `zeile-kanzlei`'s door row in spike A1 and the unbroken string, inside a flex header with
default `min-width: auto` on its child, will not wrap; the ancestor's `overflow: hidden` will not
scroll it into view — it will silently truncate off the right edge of a 19rem sticky infobox,
with no ellipsis, no affordance that text is missing. For the one widget this candidate names as
its highest privacy and highest UX risk, that means a player could see a door whose destination
name is partially invisible — a rendering bug that, on this specific component, reads uncomfortably
close to "the reader cannot fully verify what they're being invited to open."

This is fixable in one line (`overflow-wrap: anywhere` on `.tuer-ziel`, matching what A2 already
knows to do) and I am not asserting it as an architectural flaw — I am asserting that the artifact
chosen to carry the pitch has not yet had the fix its sibling artifact already contains applied to
its most important widget, and neither spike tests the door with content longer than four
characters.

---

## What I could not break — conceded by name

- **The privacy math on the door, as a pure function, is real and I verified it in code, not
  prose.** Spike A2's `baueTuerZeile(w, rolle, phase)` is a genuine pure projector: I traced it
  by hand for `rolle ∈ {spielerin, leitung, beobachter, fremd}` across both phases, and the
  claim — that a `beobachter` (an in-campaign observer) and a `fremd` reader (no campaign at
  all) receive byte-identical serialised output, while only the Vollmacht's holder receives a
  different node — holds for every combination the function accepts. The `zwillingsbeweis()`
  and `pruefstandLaufen()` routines measure this by literally serialising DOM nodes and comparing
  string length and content, not by asserting it in a comment. Within the scope of "does this
  pure function leak," it does not leak. I state plainly that this is a narrower claim than "the
  product will not leak" (Break 1's identity gap is upstream of this function entirely, and
  §8.8 is right that `Sicht` itself is unbuilt for the fourth round) — but the part that exists,
  works.
- **Gate „Kein Strom" is a real, executable test, not a prose refusal wearing a gate's clothing.**
  I checked: `pruefstandLaufen()` in spike A2 actually clones the article host, strips every
  `[data-artikel]` ancestor, and counts leftover `[data-neu='true']` nodes — this is the exact
  "remove every article context and nothing renders" operation §5.1 describes, genuinely
  performed, not simulated. A feed's marker nodes would survive that clone-and-strip; here they
  do not, because the "neu" state lives on the same node as the paragraph it decorates. This
  part of the anti-log argument is sound engineering, matching the champion's own bar (CHAMPION
  §6.9's "Orakelprobe" pattern) rather than a plausible-sounding paragraph.
- **`reduced-motion` is honoured with real redundancy, not a single forgettable rule.** Both
  spikes independently implement the media query, a `data-motion`/root-attribute override in
  both directions, and `!important` transition/animation kills — I checked all three layers exist
  in both files and none of them contradicts another.
- **System-agnosticism, for the specific claim "same component skeleton across genres," is
  demonstrated, not asserted.** Spike A2's `pruefstandLaufen()` builds the full article for
  `aldenfall`, `kepler`, and `nebelakte` and diffs the `data-komponente` signature string across
  all three — this is a real check that a fantasy house, a space station, and a 1998 freight
  office produce an identical component sequence, which is the correct falsifiable form of the
  K7/system-agnosticism claim this lineage has cared about since the harbor-satchel mistake.
- **The Vollmacht object's own type-level guarantees** — immutable holder, no `Vollmacht`
  constructor (so no chaining), a hard server cap, `404` (not `403`) on fired-after-expiry, the
  append-only `AuditEntry` on every issuance/firing/expiry/revocation — are exactly the right
  shape for the stated invariant and I found no hole in the *type*. §8.6 already names the one
  live risk here (the revocation race at the millisecond boundary) and hands it to Athena by
  name; I have nothing to add to that specific race that the candidate has not already flagged
  itself, so I am not re-claiming it as my own break.
- **`Zustand`, `defeat_pending`, and item template/instance are untouched by this candidate**, as
  claimed in §6.3, and I found nothing in either spike or the data shape that quietly moves board
  state or auto-resolves a defeat between sessions. This part of the "explicitly unchanged" list
  in §6.3 is accurate.

---

## Where this leaves the verdict

Break 1 is the one I would ask Apollon to weigh heaviest, and I want to be precise about its
shape so it isn't overstated: it is not a violation of one of the ten numbered hard invariants by
itself — the candidate never writes code that ships a bearer token. It is that the thesis, as
specified, has exactly one unaddressed precondition standing between it and either (a) silently
failing for any player whose browser forgets her between Saturday and Tuesday, in a way the
candidate's own gate zero (W1) cannot detect, or (b) being patched, later, with the one mechanism
this entire lineage has already refused by name. Breaks 2–4 are real and reproducible but smaller:
2 is a specification gap at exactly the seam the brief asked me to stress: 3 is a strategic
asymmetry the gates as designed cannot see: 4 is a one-line CSS fix that the candidate's own
second artifact already knows. None of the four is a strawman; all four are walkthroughs, not
rumours.
