# Features — Candidate A, *Das Skriptorium*, round 2

*Feature Architect. 2026-07-27. Written against [`attack-A.md`](attack-A.md) as the work order.
Read: [`product-A.md`](product-A.md), [`spike-A1.html`](spike-A1.html), [`spike-A2.html`](spike-A2.html),
[`spike-review-A1.md`](spike-review-A1.md), [`spike-review-A2.md`](spike-review-A2.md),
[`../../spikes/spike-A-passage-identity/identity.mjs`](../../spikes/spike-A-passage-identity/identity.mjs),
[`../../00-intake.md`](../../00-intake.md), RB-11.*

**Method.** Nemesis attacked running code, so every answer below names the line it changes, what a
person sees, what the server refuses, and a day cost. Three of her fourteen findings are answered by
**deleting** something rather than adding. One fatal and two majors are answered by a single
mechanism, because they are the same defect wearing three coats. Two findings I cannot close inside
this thesis and they are in §4, not dressed as fixes.

**The one sentence.** Her verdict is *"der Absatz weiß es, bis jemand ihn bearbeitet."* The answer is
not a better guess at what the edit did — it is to **stop guessing**: the editor already witnesses
every structural act, and the product's whole failure is that it throws that witness away and
reconstructs it from string comparison at the far end of a network. Record the intent, give identity
a generation, and pin what the reader was told. Everything else in this document follows from those
three.

---

## 0. The map — which finding is answered by what

| # | Finding | Answered by | Cost |
|---|---|---|---|
| **F1** | `passageIdentity()` has no fixpoint | **§1.1 Das Identitätsregister** + convergence loop | medium |
| **F2** | Lineage guessed from text concatenation | **§1.2 Das Strukturprotokoll** | medium |
| **F3** | `Ctrl+Z` after save orphans revelations irreversibly | **§1.3 Generation & die Berichtigung** | medium |
| **M4** | Guard covers Backspace, not typing or pasting | **§1.4 Die Zollgrenze** (a) + **§1.5 Der Nachtrag** (b) | medium |
| **M5** | Blocker's default button is "reveal the secret" | **§1.6 Umgekehrte Vorgabe** | small |
| **M6** | Pinning and lineage resolution are mutually exclusive | **§1.5 Der Nachtrag** — pinned reads chosen, price written down | medium |
| **M7** | §4.1 manufactures the largest named risk | **§3.1 KILL** the clause; ship **Der Leserbaum** | small (negative) |
| **M8** | No play layout below 960 px | **§1.7 Der Rand wird zur Leiste** + touch verbs + a gate that can fail | medium |
| **M9** | Fusion demonstrated in one direction, twice | **§1.8 Die Tafel** — a slice-1 wiki→table artifact | medium |
| **M10** | Launch-blocking list is a second product with no number | **§1.9** priced; **§3.2 KILL** two importers | small (doc), large (consequence) |
| **M11** | Invariant 7 enforced where evidence is destroyed | **§1.10 Herkunftsvermutung** | small |
| **M12** | "No second representation" negates invariant 3 | **§1.11 Der Auftritt** (`ActorInstance`) + withdraw the sentence | medium |
| **m13** | Foreign-id re-mint hangs on a `prosemirror-view` meta | folded into **§1.1** — the registry replaces the paste sniff | — |
| **m14** | Signature gate excludes the blocker | **§1.12 Goldene Signatur** | small |
| **m15** | A1's merge mints a third identity | **§1.12** — two-line artifact fix | small |
| — | §9.1 `PassageVariant` | **§3.3 KILL** | negative |

---

# 1. The answers

## 1.1 Das Identitätsregister — identity has an authority, and the plugin converges

**Answers:** F1 (fatal), m13.

**The defect, restated in one line.** `appendTransaction` is never called on the transaction it
itself appended, so the plugin mints blind and never inspects its own output; and `mint()` is a
module-global counter that a page reload resets to zero, so the second session of the day re-issues
ids that the first session's revelations already point at.

**What exists in the product.**

1. **A per-Entry pid registry, server-side.**
   ```text
   PassageId (entry_id, pid, gen, minted_at, minted_by, state ∈ live|retired)
             PRIMARY KEY (entry_id, pid, gen)
   ```
   Every pid that has ever existed in an Entry is a row. The document hydration payload carries a
   **registry snapshot** (a compact set — ~4 bytes per pid, ~12 KB for a 3 000-passage Entry) and a
   **lease**: a block of unused ordinals the client may mint from without a round trip. Leases are
   issued per open document, so two tabs, two co-GMs and yesterday's session cannot collide by
   construction. A reload draws a new lease; the counter never restarts at zero because it is not
   the client's counter.

2. **The plugin converges, and says so when it cannot.** `passageIdentity()` no longer trusts
   ProseMirror to re-invoke it. After building its fix transaction it re-derives `blocks(tr.doc)`
   and re-checks the invariant **in a bounded loop (max 8 passes)** inside the same
   `appendTransaction`. If the invariant does not hold after 8 passes the plugin sets
   `identity_unstable` in plugin state; the commit button becomes *"Identitäten werden neu
   vergeben…"* and the save goes through a server repair round trip instead of silently writing a
   broken document. This is ~14 SLOC on top of the 26.

3. **Re-minting is decided by provenance, not by a paste sniff — which is m13's fix and it is
   *simpler* than what it replaces.** Delete `getMeta("paste") || getMeta("uiEvent") === "drop"`.
   The rule becomes: **a pid is valid in this document iff it is in this document's registry
   snapshot as `live`.** Anything else — a pasted block, an Android soft-keyboard clipboard
   insertion, an IME reconversion, a `readDOMChange` path, a hydrated server doc, a
   `.chronicle` import — is re-minted because it fails the membership test, not because we
   guessed how it arrived. One check, no discriminator, no unpriced signal.

4. **The server is the final arbiter.** The commit endpoint re-runs uniqueness against the registry
   and rejects with `409 IDENTITY_CONFLICT` plus a **repair patch** (pid → new pid) that the client
   applies and re-submits. Import is the same path: `.chronicle` pids are allocated *through* the
   registry, so a package carrying a duplicate cannot install one.

**What the user sees.** In the normal case, nothing. In the pathological case, a save that takes one
extra round trip and a quiet line: *"Absatz-Identitäten neu vergeben (2)."* Never a lost paragraph,
never a silent one.

**Why it is sensible now.** It is the load-bearing claim of the candidate and it is currently false.
It also collapses three separate mechanisms — the paste discriminator, the mint counter and the
import id policy — into one membership test, which is fewer moving parts than today.

**Regression tests owed (Nemesis's own, plus two).** (a) Load a document already containing
`n_0001`, force `mint()` to return `n_0001`, split, assert live pids unique. (b) Open the same Entry
twice in one process, split in both, commit both, assert no collision. (c) Import a `.chronicle`
whose `lineage.jsonl` contains a pid already live in the target Entry.

**Cost:** medium — registry table + lease endpoint + convergence loop + 409-repair path ≈ **4 days**.
**Invariants:** strengthens 1 (the server owns identity, the client borrows it) and 10.

---

## 1.2 Das Strukturprotokoll — the editor records what it did; the server never guesses

**Answers:** F2 (fatal). Also the root cause behind M4's coverage gaps.

**The defect, restated.** `lineage()` detects a split only when the concatenated text of consecutive
fresh blocks is **byte-identical** to the parent's. Delete the leading space the split left behind,
or write the thought that motivated the split into the gap, and the parent falls through to
`retire` — `resolve()` returns `[]` and Sera loses a sentence she was told, silently.

**What exists in the product.** The plugin already computes *why* each pid was re-minted and already
writes `tr.setMeta(identityKey, [...fixes])`. That record is thrown away. Promote it to a typed,
persisted artifact:

```text
StructuralIntent (op ∈ split|merge|insert|delete|move|revise,
                  parent_pids[], child_pids[], offsets[],    -- split offsets within the parent
                  step_index, client_seq, tr_id)
```

Derived from the **ProseMirror step**, not from text: a `ReplaceStep` with `structure: true` and a
slice whose `openStart`/`openEnd` describe a block boundary *is* a split; `joinBackward` *is* a
merge; a moved node with a surviving pid *is* a move. No string comparison anywhere.

**The commit becomes `{doc, intents[]}`, and the server verifies rather than reconstructs:**

- every claimed child exists in the submitted doc and is fresh;
- every claimed parent is absent from it;
- every referenced pid is in the registry (§1.1);
- the union of claimed children's text is a **partition** of the parent's text at the recorded
  offsets, allowing for edits *inside* a child — this is a containment check, not equality, which is
  precisely the case `lineage()` fails today;
- an intent that fails verification **fails the commit**. It never degrades to a guess.

The old text-diff `lineage()` survives in exactly two places: as the **reconciliation path** for
documents that arrive without intents (import, server-side edits, API writes), and as a
**differential CI check** — any disagreement between the intent stream and the text diff on the same
commit reddens the build. That is how we find out that the intent recorder is wrong, instead of
finding out on Wednesday morning.

**What the user sees — and this is the part that matters.** The margin line stops being a client-side
prediction. It is rendered from the same intent record the server will receive, and it changes state
on commit:

> *Absatz geteilt · `p_4f9c` → zwei Absätze · 2 Enthüllungen wandern mit: **Sera, Brannt** ·
> vorläufig* → after save → *…· **bestätigt 21:31** · [Rückgängig]*

If the server disagrees, the line goes red and names the disagreement. **The UI can no longer promise
migration while the database records extinction**, because both read the same record.

**Why it is sensible now.** It costs microseconds — typing produces no structural steps, so the
0.087 ms headline survives untouched — and it removes the *class* of defect rather than a trigger.
It is also the precondition for §1.5: you cannot partition a reader's pinned text without knowing
where the split was, and only the intent knows.

**Cost:** medium — intent derivation + verification endpoint + the provisional/confirmed margin state
≈ **5 days**.
**Invariants:** 1 (intents are client-*asserted* and therefore untrusted; the server verifies
structurally and computes every permission consequence itself — an intent can never grant anything),
6 (the margin line is a derivation the GM can see), 10.
**Honest cost, stated here and again in §4:** an intent journal is a per-client causal record. Two
writers produce two streams with no total order. **This makes §8.2 (collaborative editing) harder,
not easier.**

---

## 1.3 Generation & die Berichtigung — pid reuse ends, and an append-only ledger learns to correct

**Answers:** F3 (fatal).

**The defect, restated.** Undo restores the literal attribute value, so one pid string denotes two
objects in one history; `resolve()` is `events.find(...)`, first-match, so a stale `split` answers
forever; and `PassageLineage` is append-only by DB grant with no compensating event kind, so a
structural edit committed in error is **irreversible at the data layer**. Split, save, `Ctrl+Z`,
save — five seconds, live session, revelations gone.

**Three changes, all small, all in the priced code.**

1. **Pids carry a generation and are never reused.** `(pid, gen)` is the identity; the registry's
   primary key already has it (§1.1). Undo restoring `p_0002` produces `p_0002@g2` — a new object
   with an honest name. The plugin, seeing a pid the registry snapshot marks `retired`, mints the
   next generation rather than accepting it. **No pid string ever denotes two objects again.**

2. **`resolve()` becomes order-aware.** It walks events in commit order **from the revelation's own
   `committed_revision_id` forward**, never backwards, and never `find`-first. ~20 SLOC replacing
   16. The stale split is behind the revelation's own horizon and cannot answer.

3. **`kind` grows one value: `supersede` — die Berichtigung.** Append-only stays append-only:
   nothing is ever deleted, the `GRANT INSERT, SELECT` grant is untouched, and round 1's hard-won
   integrity property is preserved exactly. A later event *books against* an earlier one, naming it,
   with a reason (`undo`, `gm_repair`, `import_reconciliation`) and an actor. `resolve()` skips
   superseded events. **This is how a ledger corrects itself: you do not erase a line, you book
   against it.**

**What the user sees.** Undo *before* the save is an ordinary editor undo. Undo *after* the save is a
**Berichtigung** and says so:

> *Teilung berichtigt · 2 Enthüllungen zeigen wieder auf den ganzen Absatz · Sitzung 15, 21:32*

It appears in the Session Diff as its own row (*"1 Berichtigung"*), so a GM who corrects a structural
mistake leaves a visible, honest trace instead of a hole. `[Rückgängig]` in the margin is now a
button that does what it says at every point in time, which it currently is not.

**Why it is sensible now.** It is `Ctrl+Z`. The candidate's own flex screenshot puts the button
there. Shipping an irreversible data layer behind the most-pressed keystroke in software is not a
scheduling question.

**Cost:** medium — one column, one enum value, one index, `resolve()` rewrite, the Berichtigung UI
≈ **3 days**.
**Invariants:** 1, 6, 10; preserves the append-only property that motivated the DB grant.

---

## 1.4 Die Zollgrenze — the guard is a precondition on content movement, not on a detected merge

**Answers:** M4(a).

**The defect, restated.** The guard fires only on `merge` events, and merge events exist only when
text concatenation matches exactly. Paste the secret at the **end** of a revealed paragraph and the
guard can fire; paste the *same text* at the **start** of the *same* paragraph and it never runs.
Same leak, opposite verdicts, decided by where the caret was.

**What exists in the product.** The guard is re-specified as a **customs check on content crossing a
passage boundary**, evaluated at commit on the verified intent stream plus the content diff — never
on a detected merge:

> **Rule.** For every passage `p` in the commit, for every inserted text run `r` in `p` whose
> **provenance** is another passage `q` in the same document (merge, cut/paste, drag, block move):
> if `holders(q) ⊄ holders(p)` the commit is **blocked**, and the blocker names every reader who
> would gain and exactly which text.

Provenance is known, not inferred: a run that arrives by merge carries the merge intent; a run that
arrives by paste carries the source pid in the ProseMirror slice (our paste is constrained and
block-wise, §1 of the candidate, so the slice is ours and we control its metadata); a run typed from
the keyboard has **no** provenance and is handled by §1.5, not here.

`mergeGuard()`'s rule itself survives **unchanged** — Nemesis could not break it and two authors
derived it independently. What changes is *when it is invoked*: it now runs on a symmetric-difference
computation over `(source audience, target audience)` for every crossing, in both directions, at
every caret position. Direction and caret stop mattering, which was the entire finding.

**What the user sees.** The same blocker component, in the same five places, with a headline that
reports **all** gains rather than `gains[0]` (m15's sibling defect): *"Zusammenführen gäbe Sera und
Brannt zwei Absätze."* Plus one new sentence when the crossing came from a paste rather than a
merge: *"Der eingefügte Text stammt aus `p_7b21`, den nur du kennst."*

**Cost:** medium — provenance tagging on the paste/move path + the commit-side crossing check
≈ **3 days**. The blocker component itself already exists.
**Invariants:** 1 (server-side precondition; the client may render it, not decide it), 10.

---

## 1.5 Der Nachtrag — pinned reads, and newly typed text accrues instead of leaking

**Answers:** M4(b), M6, and the candidate's own §8.5.

**Two defects, one mechanism.** M4(b): put the cursor at the end of a paragraph Sera holds and keep
typing — no `Enter`, no merge, no guard, and Sera reads the secret. M6: revision pinning and live
lineage resolution cannot both be true, and the candidate asserts both.

**The choice, made and written down: reads are pinned.** A Revelation delivers
`(passage_id, revision_id)` and the reader renders **that revision's content**, forever, until
something explicitly changes it. Lineage moves the *pointer*; it never moves the *words*.

**How Sera's tablet still re-renders as two paragraphs.** Because §1.2 exists. The split intent
carries its **offsets**, so the server partitions the *pinned* text at the same offsets and Sera's
codex shows two paragraphs, both stamped *gelernt Sitzung 14, von Bruder Alder*. This is the coherent
middle Nemesis correctly says nobody had written down — and it is only coherent because the intent
record exists. Text-diff lineage cannot do it; an offset can.

*The fallback, named because this is exactly where a hand-wave would sit:* if the pinned revision has
drifted too far from the current text for the offset to map, the revelation resolves to **both
children with the pinned text unchanged**, and the GM's margin says so: *"Seras Fassung ist zu alt
für diese Teilung — sie behält den ganzen Absatz. [Nachreichen]"*. Non-lossy, visible, never silent.

**Der Nachtrag, concretely.** Text added to a passage after a reveal becomes a **pending Nachtrag**
on that passage — a diff against the pinned revision, held server-side, delivered to nobody.

- **What the GM sees:** a quiet marker in the margin beside the paragraph —
  *"3 Sätze seit Sitzung 14 hinzugekommen · niemand hält sie"* — with two one-key fates:
  **[nachreichen]** (push the current revision to the passage's current holders, recorded as a real
  Revelation with `granted_via: nachtrag`) and **[behalten]** (stays GM-only).
  **The default is behalten.** Nothing is delivered by writing.
- **What the reader sees:** her paragraph as she was told it. If the GM nachreicht, the paragraph
  updates with a stamp: *"ergänzt Sitzung 15"* — so a change to something she was told is an
  **event in her book**, not a silent rewrite.
- **In the Session Diff:** *"7 Nachträge · 2 nachgereicht · 5 behalten."*

**The losing consequence, written down as the round demands.** Pinned reads mean **a typo fix does
not reach the reader without an explicit act.** That is a real cost and it is paid. Mitigations, both
cheap: a bulk action in the Session Diff (*"12 Absätze wurden bearbeitet — alle nachreichen?"*), and
a GM-set default under which **whitespace-only and typo-scale diffs** (below a configurable
edit-distance threshold, no new sentence boundary) are auto-nachgereicht. Sera's Wednesday-morning
codex is therefore not a museum of typos; it is a book whose *substantive* changes she was told
about.

**What this buys beyond the two findings.** §8.5's hole — the GM narrates a secret aloud and presses
nothing — narrows, because the paragraph now visibly accrues unreleased material and the marker sits
in her eyeline during prep. It also makes F2's and M4's residue harmless: unpinned text simply never
reaches a reader.

**Cost:** medium — the pending-diff store, the two-key margin control, the offset partition, the bulk
release ≈ **5 days**.
**Invariants:** 1, 5 (no AI anywhere in this loop), 6, 10.

---

## 1.6 Umgekehrte Vorgabe — `[Abbrechen]` is the default, and a blocker-reveal is reviewed

**Answers:** M5.

**The defect, restated.** The blocker's first, `b-primary`, auto-focused button is *"Beiden zuerst
enthüllen"*, and `fixReveal()` writes a real Revelation attributed to the GM in a non-repudiable
audit log. 21:47, combat, muscle-memory `Enter` — the escape from the friction **is** the leak, one
keystroke deep, and it forges a record of intent she cannot contest.

**What exists in the product.**

1. **`[Abbrechen]` is first in DOM order, is `b-primary`, and is the focused control.** `Enter` and
   `Esc` both resolve to it. The two fixes become secondary and tertiary.
2. **The destructive fixes are not reachable by `Enter`.** They require a pointer click or a named
   chord (`Alt+E` reveal, `Alt+R` retract), printed on the button. Each carries a **400 ms arm
   delay** — the same pattern as the Reveal Sheet's 4-second abort window, so it costs nothing new to
   teach — which defeats a keyboard-buffered keystroke landing on a box that just appeared.
3. **A blocker-initiated reveal is flagged for review.** `granted_via: merge_blocker` already exists;
   it now surfaces as its own Session Diff row: *"1 Enthüllung aus einem Blocker — bewusst?"* with
   `[bestätigen]` / `[zurücknehmen]`. Session end is the last cheap moment to catch a reflex, and
   retraction is already a shipped, honest mechanism.

**Why it is sensible now.** It is hours of work, it removes a forged-intent risk from a
non-repudiable log, and it inverts a design that currently makes the *dangerous* outcome the
*easiest* one. §8.4 worries the guard fires too often; this is the opposite and sharper risk, and it
is nearly free.

**Cost:** small — **≈ 0.5 days**, plus the Session Diff row.
**Invariants:** 1, 10.

---

## 1.7 Der Rand wird zur Leiste — the apparatus collapses upward, and touch gets verbs

**Answers:** M8.

**The defect, restated.** `.rand` follows `.stage` in the DOM and the 960 px breakpoint stacks it
*below* the article. A 1366 px laptop at the 200 % zoom §7.5 gates is 683 px effective: the GM scrolls
past ten paragraphs of Haus Vharon to find out a player joined. Nothing clips, so the gate cannot see
it — and this is the failure that removes the candidate's own answer to §8.5.

**What exists in the product.**

1. **Source order changes: the rail precedes the stage in the DOM at all widths.** On wide screens
   CSS grid `order` puts it on the right; nothing visual changes. This alone fixes keyboard and
   screen-reader order, which currently announces the document before the thing that just happened.
2. **Below 960 px the rail becomes a sticky *Apparatleiste*** directly under the campaign context,
   above the document, ~64 px tall, carrying only its **live** channel: arrivals, presence deltas,
   the reveal preview, and the blocker count. Non-live content — dice log, turn order history, margin
   notes — moves into the `Ctrl+K` sheet, which the candidate already ships.
3. **Blockers never live in the rail on narrow layouts.** They render inline at the caret, which A1
   already does correctly and which is the right behaviour at every width.
4. **Touch verbs, named because none were specified.** Long-press a passage handle → the passage menu
   (Enthüllen / Teilen / Marginalie / Nachtrag). Swipe-left on a passage → Marginalie. **Merge on
   touch is a menu item, not a gesture** — so `Backspace`-as-permission has a touch sibling that is
   deliberate rather than reflexive, which is the correct translation of the flex rather than a
   literal one.

**The gate that replaces the one that cannot fail.** §7.5's *"200 % zoom does not clip"* becomes:

> **Green when:** at 200 % zoom on a 1366 × 768 viewport, and on a 768 px-wide tablet in portrait,
> an arriving reveal and an open blocker are both visible **without scrolling the document**, and
> the tab order reaches the apparatus before the first paragraph.

**Cost:** medium — layout, the sheet migration, the touch menu ≈ **3 days**.
**Invariants:** 8 (this *is* invariant 8 — semantic order, zoom, no reliance on a wide viewport), 3.

---

## 1.8 Die Tafel — one artifact that runs wiki → table, in slice 1

**Answers:** M9 (partially; see §4).

**The defect, restated.** Table → Wiki has 116 SLOC, 27 assertions, two prototypes and timing
numbers. Wiki → Table has, after two rounds, **nothing**. §4.3's Wissenskarte is "still slice 2,
still described rather than built", for the second round running. That is a thesis standing on one
leg.

**What ships in slice 1 — deliberately not the Wissenskarte.** The full map is slice 2 and pretending
otherwise is how a round repeats this offence a third time. What ships is the smallest honest
demonstration of the reverse direction, and it is a **list, not a canvas**, so it costs days:

1. **`## Der zweite Keller` inside a `place` Entry is a region passage.** The authoring side already
   exists in §4.3; it becomes real.
2. **Die Tafel is the Outline recipe of that Entry** — `03`'s third render recipe, a semantic,
   keyboard-navigable region tree with the reader's projection applied. Not a consolation prize: the
   *authoring* surface and the *play* surface are the same DOM.
3. **The falsifiable claim, in the harness that already exists.** Open the scene as GM → five
   regions. Open as Sera → three, and the two she does not hold are **measurably absent from the
   DOM** (A2's node-delta method, applied to the table half). That is the first assertion this
   project has produced in the wiki → table direction and it can go red.
4. **`[[Bruder Alder]] wurde hier gesehen.` inside a region passage is a presence edge.** Opening the
   scene lists the actors its regions reference; revealing the region to Sera reveals *that Alder was
   seen there* — one gesture, both halves. Alder's article gains a backlink that reads
   *"erwähnt in Der zweite Keller · Sera hält"*.

**Why this and not more.** It is the cheapest thing that is genuinely bidirectional, it gives the
Outline recipe a consumer, it produces a measurement rather than a paragraph, and it does not pretend
WFC arrived early. When the Wissenskarte lands in slice 2 it renders *the same passages* — the list
is not throwaway scaffolding, it is the accessible recipe of the object the map will draw.

**Cost:** medium — region block type, the Outline surface, the presence edge, the projection
assertions ≈ **5 days**. Funded by §3.2.
**Invariants:** 1, 8, 9 (a region is content, never a depicted world), 10.

---

## 1.9 Die Rechnung — the launch-blocking list gets numbers, and two items leave it

**Answers:** M10.

**The defect, restated.** §0.4 priced the editor — the item that already had a spike — and §7.4 then
declared six launch-blocking items, **not one of which carries a number anywhere in the candidate**.
The same offence, in the same document, for the more expensive half.

**The list, priced, with the same falsifier discipline §0.4 used:**

| Launch-blocking item | Days | Risk | Verdict |
|---|---:|---|---|
| **Visual rule-builder — schema-form half only** (entities, fields, sheet layout; **no** formula/node editor) | **15** | **high — nobody in this crew has built one** | **Keep**, redefined |
| **UVTT / `.dd2vtt` import + export** (walls, doors, windows, lights, grid) | **6** | low — small, documented, stable JSON | Keep |
| **Foundry-shaped journal export** | **3** | low — the sanitiser run backwards, as §7.4 claims | Keep |
| **Electron desktop host** (+ spikes S5 NVDA-through-shell, S6 footprint) | **10** | medium | Keep — it *is* the self-hosting invariant |
| Roll20 campaign JSON import | 8 | **high — Roll20 ships no supported export; every path is a scraper** | **Cut** → §3.2 |
| Fantasy Grounds campaign XML import | 7 | high — bespoke, and FG went free 2025-11-08 | **Cut** → §3.2 |
| **New launch-blocking total** | **34** | | (was ~49) |

**The falsifier, stated so the ledger can check it:** *if the rule-builder's schema-form half exceeds
**20 days**, the launch scope is wrong and the round must say so* — the same shape as §0.4's
accessibility falsifier, guarding the largest number instead of the smallest.

**Why the redefinition of the rule-builder is not a dodge.** RB-11 says discovery runs through
**system authors**. A system author needs to *publish a package*: entities, fields, a sheet layout.
She does not need a visual formula editor to do that — Foundry reached 475 systems with authors
writing JSON by hand. The formula/node editor with live trace preview is the K2 crown jewel and it
ships after launch, when there are authors to complain about it.

**Cost:** small to write; **large in consequence** — it removes two migration paths from launch and
that is a real market loss, stated in §3.2 rather than hidden.
**Invariants:** 2 (the rule-builder edits validated declarative structures; no code path ever), 10.

---

## 1.10 Herkunftsvermutung — imports are foreign until a human says otherwise

**Answers:** M11.

**The defect, restated.** §7.3 enforces invariant 7 at the import boundary — where the evidence is
weakest. Foundry's documented GM workflow is to import a purchased adventure **into the world** so it
can be edited; once there it is indistinguishable from her own prose. Our importer marks it as hers,
and §7.4 then makes Foundry-shaped export launch-blocking and sells it as *"leave us with your whole
codex intact."* We built the laundering pipe and printed the arithmetic in the Import Report.

**What exists in the product — the default inverts.**

1. Everything arriving through **any** importer is written `provenance = imported_unverified`,
   `licensed_source = true`. Not just compendium-pack content. Everything.
2. **The Nachtragsgewährung screen grows a second column: *"Was ist deins?"*** — the migrating GM's
   first act already happens on this screen, so the ask costs no new surface. It renders the
   *source's own* structure (Foundry folder / compendium pack / Obsidian vault directory) as a
   bulk-selectable tree with one action per branch: **[Ich habe das geschrieben]**, which clears the
   flag and writes an `AuditEntry` naming who cleared it, when, and how many passages.
3. **Until cleared:** fully usable in her own world and at her own table — we do not cripple her
   prep. **Excluded from** Publication, `.chronicle` sharing, forking, and Foundry-shaped export.
4. **The export dialog counts out loud:** *"312 von 1 106 Passagen sind als fremd markiert und werden
   nicht exportiert. [Prüfen]"* — which is the moment a GM actually decides, with the consequence in
   front of her.

**Why it is sensible now.** It is one flag's default, one tree and one filter, and without it
invariant 7 is decorative. It also makes the leaving-promise **better**: *"Du kannst mit **deiner**
Arbeit gehen"* is a sentence a lawyer and a GM both like, and it is the one we can defend.

**Cost:** small — ≈ **2 days**.
**Invariants:** 7 (from decorative to load-bearing), 10.

---

## 1.11 Der Auftritt — `ActorInstance`, and the marketing sentence is withdrawn

**Answers:** M12.

**The defect, restated.** *"NPC article and statblock are one object"* and *"there is no second
representation"* are the literal negation of invariant 3, and they are the lines doing the marketing
work in §3.4. Three town guards over one `Passage.content` means three HP pools, three condition
sets and three `defeat_pending` states in one document; knock one down and the article says the
captain is at 0.

**What exists in the product.**

```text
ActorInstance (id, template_entry_id, pinned_revision_id NOT NULL, scene_id,
               label, hp, conditions[], defeat_pending, controller_id NULL)
```

- `Entry(actor)` is the **template**: the article, the statblock passage, the prose, the links.
- `ActorInstance` is **der Auftritt** — the appearance. Three guards are three rows over one Entry,
  with labels pre-filled *Wache 1 / 2 / 3*.
- Editing the article **never** mutates a live appearance's numbers. A **[Vorlage übernehmen]** action
  re-pins an appearance to the current revision, with a diff preview showing exactly what changes
  (invariant 6). This is the same pinned-and-promotable machinery `ItemInstance` already carries;
  it is not new machinery, it is a missing row.

**The sentence is withdrawn and replaced by a true one that is stronger:**

> *Es gibt keinen Encounter-Builder, weil die Vorlage der Artikel ist — aber jeder Auftritt trägt
> seine eigene Wunde.*

That is the thing Foundry does with an Actor, a compendium, a prototype token and a synthetic actor,
and that we do with one article and one row. The fusion claim survives; the invariant violation does
not.

**Cost:** medium — the table, the drag-to-scene path, the re-pin diff ≈ **3 days** (slice 2).
**The sentence correction costs nothing and happens now.**
**Invariants:** 3 (restored), 4 (`defeat_pending` is per-appearance, which is the only place it can
live), 6, 10.

---

## 1.12 Gate hygiene — the signature gate learns what it excludes

**Answers:** m14, m15.

- **§7.5's line becomes a definition, not a phrase.** *"Structural-signature sweep stable across the
  axis matrix"* is replaced by: a **golden signature per role, committed to the repo**, diffed in CI;
  an **explicit exclusion list in the gate definition** (the Prüfstand does not exist in the product,
  so it excludes itself; nothing else is excluded by default); and an **ignore-list policy** — adding
  `data-sig-ignore` requires a named owner and a test proving the ignored subtree contains no
  projection-dependent node.
- **`#blockerSlot` leaves the ignore list** and gets its own signature per role. It carries the
  security claim; it is the last node that should be invisible to the sweep. §8.4's nastier variant —
  a co-GM with narrower rights seeing a differently-rendered blocker — becomes a thing the gate can
  catch instead of a thing it reports as 288/288 green.
- **The baseline stops being lazy.** A committed golden signature means a defect present in *all*
  combinations is visible, which is the sweep's current blind spot (and A1's review named it first).
- **The 288-sweep stays a demo.** CI samples: all skins × all roles, then a rotating slice. Promised
  out loud now rather than discovered in a slow pipeline.
- **m15:** A1's `commitMerge()` is corrected to keep the **upper parent's** pid, matching
  `identity.mjs`, and the blocker headline reports all gains instead of `gains[0]`. Two-line fixes to
  the artifact everybody will screenshot.

**Cost:** small — ≈ **1.5 days** (the review already estimated 2–3 days to port the harness; this is
the policy half).
**Invariants:** 1, 8, 10.

---

# 2. Beyond defence — three capabilities that make the fusion stranger

None of these answers a break. Each exists only because a passage has identity, a reader has a
projection, and the same substrate carries both halves. Each is structurally unavailable to a product
that stores a page as one HTML string.

## 2.1 Der Souffleur — reading aloud *is* the reveal

**New capability.**

Every VTT has boxed read-aloud text and every one of them treats it as a static block the GM
copy-pastes into chat. Under this thesis it can be the thing that pays the visibility tax **by the
act of narrating**, which is §8.5's hole exactly.

**What it is.** A passage may be `block_type: aloud`. Consecutive `aloud` passages render, in the
Souffleur, as one flowing cue card in large type — the atom stays the atom, the *display* is
continuous. The GM presses **Space** and the next passage is spoken *and delivered to the whole
party in the same beat*: it lands in every player's Kodex stamped *gelernt Sitzung 15, vorgelesen*.
She can stop mid-card; what she did not read is not delivered. `Shift+Space` steps back one and
**retracts** the last delivery (an honest retraction, not an erasure).

**Why it is a flex.** The GM's most common live act — reading the boxed text — becomes the reveal,
so the tax is paid by a gesture she was going to make anyway. It photographs: a dark room, a big
serif cue card, three little reader discs filling in as she reads. And no competitor can build it,
because delivering *the sentence she just read* requires the sentence to be addressable.

**Why it is sensible now, not speculative.** It is a render recipe over passages that already exist
plus a keyboard handler over the reveal path that already exists. It needs no new table, no new
permission concept, and no AI.

**Cost:** medium — ≈ **3 days** (slice 2, with the reveal path).
**Invariants:** 1, 5, 8 (the Souffleur is semantic DOM with a live region; it is *more* accessible
than reading from a PDF), 9.

## 2.2 Die Randfrage — the player writes in the margin, and it is the GM's prep queue

**New capability.**

**What it is.** A player reading her own Kodex on Wednesday morning can anchor a **one-line question**
to a paragraph she holds. `Question(anchor_pid, author_character_id, text, session_id, state)` — GM-visible
only, never visible to other players. It arrives in the GM's margin rail **beside the sentence that
caused it**, and in the Docket before the session: *"3 Fragen liegen an."* Answering is one of the
three gestures the product already has: a reveal, a Marginalie, or a `[[red link]]` that becomes next
session's article.

**Why it is a flex.** It runs table → wiki → **table**, closing the loop the candidate only runs one
way. It is the retention mechanism §8.8 admits it lacks: **a reason for a player to open the app
between sessions**, and the reason is her own book. And it is the sharpest possible use of block
identity — a question about a page is a forum post; a question about *the third sentence of paragraph
four, which only she was told*, is something no rival can even address.

**Why it does not re-open §8.2.** A Randfrage is **not an edit to the Entry document**. It is a
separate row anchored to a pid, so it does not touch the single-writer lock, does not produce a
lineage event, and does not require the CRDT answer the candidate honestly does not have. That
constraint is why it is buildable now.

**Cost:** small — one table, one margin affordance, one Docket row ≈ **2 days**.
**Invariants:** 1 (server decides which questions the GM sees; a question can never reveal its
anchor's content to its author, since she already holds it), 8, 10.

## 2.3 Die Fassungsprobe — two readers' books, diffed against each other

**New capability.**

**What it is.** One key from any article: put **two characters' Kodex versions of the same article
side by side**, aligned by pid through `resolve()`, with lineage-resolved rows. Same paragraph,
different Fassung, different session stamp; one held with `belief: false`; one held by nobody.

> `p_4f9c` · Sera: *Fassung 3, Sitzung 14, Bruder Alder* · Brannt: *Fassung 1, Sitzung 6, Lady Ilva*
> `p_7b21` · Sera: — · Brannt: *Fassung 2, Sitzung 11, belief: false*

**Why it is a flex.** Every diff tool in the world diffs a document **against time**. This one diffs
it **against people**, and only a product where reads are pinned per character and passages have
identity can compute it. For the GM it is prep gold twenty minutes before 21:00 — *Brannt still
believes Ilva's version, and that is tonight's scene.* For the round it is the photograph a knowledge
graph otherwise does not have (§8.10): two books, same page, visibly different, no explanation
needed.

It is also the full-page sibling of §9.2's marginal *Fassung* apparatus — same data, same joins, one
extra view — and it makes §9.2 cheaper rather than adding to it.

**Cost:** small — a view over data §1.5 already stores ≈ **2 days**.
**Invariants:** 1 (GM-only; it is an oracle and gets its own `oracles.yaml` row —
`fassungsprobe` — like every other projection primitive), 6, 8.

---

# 3. What must be removed

*Mēden agan.* A round that only adds is a round that made the product harder to ship. Three cuts,
argued.

## 3.1 KILL — *"the DOM is the same tree with the same roles for both"* (§4.1)

**Delete the clause.** It manufactures the candidate's own largest named risk — a screen reader
meeting a region that is a document for one role and an editable field for another — and **neither
prototype implements it**: A2 line 1393 gives the player a plain document, A1 has only a GM role.
The justification (*"a two-mode wiki is why GMs keep their notes in Obsidian"*) is about the
**writer**, not the reader. Nobody keeps two copies of a book they cannot edit.

**What replaces it: Der Leserbaum.** Non-writing roles get a plain semantic `<article>` — no
`contenteditable` anywhere in the reader tree. Writing roles get one ProseMirror surface. §4.1's real
intent survives by a different mechanism: **there is still exactly one document and one URL; what
differs is whether a caret exists.** No published copy, no working copy, no second document.

**What it buys.** §0.4's 5-day accessibility line goes from *"no product has done this"* to
*"Google Docs has done this"*. §7.5's NVDA gate stops being the gate most likely to go permanently
red. Invariant 8 stops being staked on the least-evidenced line in the estimate. **This is the single
largest de-risking available in round 3, and it costs negative days.**

## 3.2 KILL — Roll20 JSON import and Fantasy Grounds XML import, off the launch-blocking list

**~15 days, cut.** The argument is not schedule, it is maintainability and reachability:

- **Roll20 ships no supported campaign export.** Every import path is a scraper or a community
  browser extension against an undocumented, changing shape. That is a contract we cannot honour and
  a support burden that arrives on day one of every Roll20 update.
- **Fantasy Grounds went fully free on 2025-11-08.** Its GMs have, this year, the *least* economic
  reason of any population to migrate, and its campaign XML is deep, bespoke and coupled to licensed
  rulesets we cannot round-trip anyway (invariant 7, and now §1.10).
- **The reachable paths remain covered at launch:** Foundry world import, Markdown/Obsidian vault
  import, UVTT in **and** out, Foundry-shaped journal export. And a Roll20 GM has a documented
  two-hop path — Roll20 → Foundry (their importer, maintained by them) → us — which we do not have to
  own.

**Stated as a loss, not framed away:** two migration populations get a worse day-one story, and the
market vote §7.3 was protecting is weakened. That is the price of the two importers being real. The
15 days fund §1.8 (Die Tafel, 5 days) and §1.10 (Herkunftsvermutung, 2 days) with 8 left over, which
is roughly the overrun §1.1–§1.3 will produce.

## 3.3 KILL — Der Schattenabsatz / `PassageVariant` (§9.1)

**This is the seductive one, and it is the one that most endangers the product.**

Two different *texts* for one pid means the merge guard, `resolve()`, lineage, the pinned revision,
`.chronicle` export, Publication, the static Kodex, the print builder and every `visible_passages`
call acquire a per-audience branch — **at exactly the layer that has just been shown unable to
maintain a single invariant across a page reload.** F1, F2 and F3 are all failures of *one* text per
identity. Shipping two is not ambition, it is arithmetic.

It also makes the thesis sentence ambiguous. *Der Absatz weiß, wer ihn gelesen hat* — **which
Absatz?**

**And it is not needed for its own use case.** `belief: false` on a Revelation already delivers the
story value — a character was told something false, and the product knows it, and the Fassungsprobe
(§2.3) renders it — with **zero** new branching. Unreliable narration survives; the second text does
not.

**Kill it in round 3. Revisit only after the identity layer has a fixpoint, a generation and a
green regression suite across a reload.** If it is still wanted then, it will be cheap. Today it is
a second product wearing one table's clothing.

*Minor cut, same spirit:* the in-browser **288-combination sweep is a demo, never a CI job** (A1's
review is right that 288 × 3 full renders will dominate a pipeline). CI samples; the demo keeps the
full grid.

---

# 4. What I cannot answer inside this thesis

Three things. Each would be worse as a feature than as a sentence.

## 4.1 The guard cannot be made total against a GM in a hurry

§1.4 closes the caret-position asymmetry and §1.5 stops typed text reaching a reader silently. Both
are real. **Neither removes the leak.** A GM who types a secret into a paragraph three characters hold
and then presses **[nachreichen]** because she is mid-combat has delivered it — and no software can
distinguish that from the legitimate case, which is the same keystroke with a different intention.
We have moved the leak from **silent and structural** to **visible and volitional**, which is the
most a permission system can do about a person deciding to share something. It should be said in
those words, because Timo's line — *"your text editor just stopped you from leaking a secret?"* — is
now true for merging and pasting and **not** true for deciding. Marketing that difference away is how
a safety mechanism manufactures the unearned trust Nemesis correctly names as worse than no
mechanism.

## 4.2 M9 at thesis level — no feature here makes a Foundry table switch tonight

§1.8 gives the wiki → table direction its first artifact and its first falsifiable assertion. It does
**not** answer *"why would a Foundry table switch?"*, and I will not pretend a region list does.
Foundry's answer is walls, vision, elevation, 475 systems, 2 758 modules and ten years of trust, and
§5 already concedes that for a table wanting to play tonight, all six rivals win and three are free.
No feature in this document changes that; the candidate's real answer is a **segment** answer — the
table that intends to still be playing in this world in 2031 — and whether that segment is large
enough is a positioning decision that belongs to Kaya and to `OPEN-DECISIONS.md`, not to a feature
list. **The honest status is: the reverse direction now has an artifact, not yet a reason.**

## 4.3 My own F2 fix makes §8.2 harder

An intent journal (§1.2) is a **per-client causal record**. Two writers editing one Entry produce two
intent streams with no total order, and the reconciliation rule for that case does not exist. This is
the retire-on-split-versus-CRDT problem the candidate already names as the item most likely to force
a v2 rewrite — and recording structural intent **deepens** it, because there is now a second thing
that must converge. The slice-1 mitigation is unchanged and still honest (single-writer lock per
Entry, presence, *"Kaya schreibt"*), and §2.2's Randfrage is deliberately designed to sit *outside*
the document so that player writing does not force the question early. But it is a deferral with a
due date, and my fix moved the due date closer, not further away. That is the cost of the fix and it
is stated here rather than in a footnote.

---

# 5. Net effect

**The candidate is materially stronger, and the strength is load-bearing rather than cosmetic.** All
three fatals are answered by mechanisms rather than promises, and — the part that matters — by
mechanisms that *reduce* moving parts: a registry membership test replaces the paste discriminator
and the mint counter and the import id policy (§1.1); a recorded intent replaces a text-diff
reconstruction and simultaneously makes pinned reads coherent for the first time (§1.2 + §1.5); a
compensating event kind lets an append-only ledger correct itself without reopening the DB grant
round 1 fought for (§1.3). The merge guard survives with its rule intact — Nemesis could not break
the rule, only its invocation — and now fires on content crossing an audience boundary in either
direction, at any caret position (§1.4). Two of the majors are answered by deletion (§3.1, §3.2), one
by inverting a default that currently makes the dangerous outcome the easiest one (§1.6), and one by
a checkbox that turns invariant 7 from decorative into load-bearing (§1.10). The launch-blocking list
now has numbers, a falsifier on its **largest** item rather than its smallest, and is 15 days shorter
(§1.9). Three new capabilities exploit the fusion in ways that are structurally unavailable to a
product storing pages as HTML strings — and one of them, the Randfrage, is the first thing in three
rounds that gives a *player* a reason to open the app on a Wednesday.

**Where it is still soft.** The reverse direction has an artifact and not yet a reason (§4.2) — the
Wissenskarte is still owed and a region list is a down payment, not a thesis. Collaborative editing
is now harder than it was this morning (§4.3), and the day a co-GM or Feldnotizen exists it returns
with interest. The guard's residue is a person, not a bug, and must be described as such (§4.1). The
28 days is now ~28 + 4 + 5 + 3 + 3 + 5 + 0.5 + 3 + 5 + 2 + 1.5 ≈ **60 working days for the editor
half**, and that number has not been spiked either — it is decomposed, which is better than a
paragraph and worse than a measurement. §8.9 is untouched: this candidate has now proved the atom
twice and the encyclopedia never, and a Fandom-grade product with no demonstrated search, index,
disambiguation or ranked autocomplete is half a claim. And the accessibility line — even after
§3.1 removes its worst case — remains the number most likely to break the estimate, exactly where
§0.4 put it.

> *Der Rand hält jetzt fest, was der Griffel tat,*
> *die Zeile trägt ein Datum und ein Geschlecht.*
> *Was bleibt, ist nicht der Absatz, der vergisst —*
> *es ist die Karte, die noch niemand zeichnet.*
