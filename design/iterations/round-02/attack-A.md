# Nemesis — attack on Candidate A, *Das Skriptorium*, round 2

*Die Widersacherin. 2026-07-27. Read: [`product-A.md`](product-A.md),
[`spike-A1.html`](spike-A1.html), [`spike-A2.html`](spike-A2.html),
[`spike-review-A1.md`](spike-review-A1.md), [`spike-review-A2.md`](spike-review-A2.md),
[`../../spikes/spike-A-passage-identity/`](../../spikes/spike-A-passage-identity/) (identity.mjs,
run.mjs, RESULTS.txt), [`../../00-intake.md`](../../00-intake.md),
[`../CHAMPION.md`](../CHAMPION.md), and RB-01-{foundry,roll20,fantasy-grounds,owlbear,alchemy},
RB-11.*

**Method.** The candidate opens with a running spike, so I attacked it the same way. I installed
its declared dependencies, reproduced `node run.mjs` (25/27, matching `RESULTS.txt`), then wrote an
adversarial harness against the *same* `identity.mjs` on the *same* ProseMirror version and ran it.
Twelve of the findings below are execution output, not reading. The two scripts are preserved at
`…/scratchpad/attack.mjs` and `…/scratchpad/diag.mjs`; the spike directory has been restored to its
committed state (I removed the `node_modules` my run installed). To reproduce: `npm install` in
`design/spikes/spike-A-passage-identity`, drop either script in, `node <script>.mjs`.

Every break below has a scenario a person can walk through. Nothing here is a rumour. What I could
not break is named by section number in the last part, and that list is not padding either — §6.6 is
the best-answered section this project has produced.

---

## The one-sentence verdict

The candidate did exactly what round 1 demanded — it priced the editor with a running spike, and the
spike is honest about what it did not touch. **But the layer it priced does not hold.** The plugin
never re-checks the identities it mints, and the lineage that carries every revelation is
reconstructed after the fact from exact text concatenation — so ordinary writing (tidy a space,
write a paragraph into the gap you just made, press `Ctrl+Z` after a save) silently and irreversibly
revokes what characters were told. The flex is real for `Backspace` and absent for typing.

Not *"der Absatz weiß, wer ihn gelesen hat."* — **der Absatz weiß es, bis jemand ihn bearbeitet.**

---

# FATAL

A violation here is not a defect to be scheduled. Each of the three is reproducible in under a
minute on the candidate's own code.

## F1 · `passageIdentity()` has no fixpoint — N1/N2 reproduce *with the hardened plugin installed*

**The claim under attack.** §0.2, the headline line item of the whole candidate:
`passageIdentity()` plugin — 26 SLOC — *"per-transaction uniqueness invariant"*. §0.1 exists to
prove that without it, one pid addresses two sentences.

**The mechanism.** ProseMirror never calls `appendTransaction` on the transaction that
`appendTransaction` itself appended. `prosemirror-state/dist/index.js` sets
`seen[i] = { state: newState, n: trs.length }` *after* pushing the plugin's own transaction, so the
next pass sees `n === trs.length`, the `n < trs.length` guard fails, and the plugin is skipped. The
plugin therefore **mints every id blind and never verifies the result.** Its stated invariant is
enforced on the document as it arrives, never on the document it produces.

**Walk it.** Yesterday's session split a paragraph, so the entry contains passages `n_0001` and
`n_0002`, both revealed to Sera. This morning Kaya opens the article — a page load, so `mint()`'s
module-global counter is back at 0 — and splits a *different* paragraph.

```
split the last paragraph after a page reload (mint counter = 0):
  pass#1 docChanged=false pids=[p_0001,n_0001,n_0002,p_0003] dupPresent=false -> null
  pass#2 docChanged=true  pids=[p_0001,n_0001,n_0002,p_0003,p_0003] dupPresent=true -> appended fix
FINAL pids: p_0001, n_0001, n_0002, n_0001, n_0002
unique? false   appendTransaction ran 2 time(s)
n_0001 now addresses: ["A-Satz","GEHEIM"]
```

`n_0001` now addresses Sera's revealed sentence **and** a secret one. This is `N1`/`N2` — the exact
failure the entire §0 exists to prevent — with the fix installed. `lineage()` then compounds it: its
`newByPid` Map keeps only the last of each duplicate, so the commit records `revise n_0001,
revise n_0002` — **the two untouched, revealed passages are logged as edited**, and the projection,
resolving by pid, matches the secret block.

**Why the 27 assertions cannot see it.** Every test calls `resetMint()` on a fresh single-process
document. The harness is structurally incapable of producing a mint collision. The fuzz run
("3 000 ops, all pids unique") proves the counter is monotonic within one process, not that the
plugin converges.

**Do not accept "we'll use UUIDs" as the answer.** UUIDs remove *this* trigger and leave the defect:
any duplicate the plugin itself introduces, or that arrives already-duplicated from a `.chronicle`
import (§6.5 rule 2 requires packages carry pids), or from a hydrated server document, is minted
without re-check. The fix is a convergence loop with a bounded iteration count and an assertion that
fails the commit if it does not converge — plus a test that opens the *same* entry twice.

**Regression test owed before anything else:** load a document already containing `n_0001`, force
`mint()` to return `n_0001`, split — assert live pids unique. It fails today.

---

## F2 · Lineage is guessed from exact text concatenation, so ordinary editing silently revokes revelations

**The claim under attack.** §3.2: *"split → the pointer resolves to all children. A revelation on
the parent grants both halves. **No character silently loses a sentence.** (`L2`)"*

`lineage()` detects a split only when the concatenated text of ≥2 consecutive fresh blocks is
**byte-identical** to the parent's text. Anything else in the same save and the match fails; the
parent falls through to `retire`, the halves to `create`, and the pointer dies.

**Walk it — trigger (a), the candidate's own worked example.** §3.4, 21:31: *"Kaya splits the ledger
paragraph so the 1194 date stands alone."* The split leaves a leading space on the second half — the
spike's own `H1` output shows `" Das Original verbrannte 1194."`. She deletes it, because it is
ugly. One keystroke, before the save:

```
events: [{"kind":"retire","pid":"p_0002"},{"kind":"create","pid":"n_0001"},{"kind":"create","pid":"n_0002"}]
resolve('p_0002') = []            <-- Sera and Brannt held p_0002
```

**Trigger (b), even more likely.** She splits the paragraph and then writes the new thought that
motivated the split, in the gap she just made:

```
pids  : p_0001, n_0001, n_0003, n_0002, p_0003
events: [{"kind":"retire","pid":"p_0002"},{"kind":"create","pid":"n_0001"},
         {"kind":"create","pid":"n_0003"},{"kind":"create","pid":"n_0002"}]
resolve('p_0002') = []
```

**And the margin lies about it.** §2's flex renders *"Absatz geteilt · `p_4f9c` → zwei Absätze ·
2 Enthüllungen wandern mit: **Sera, Brannt** — beide Hälften"* client-side, at keystroke time. The
truth is decided at commit by a text diff that has by then stopped matching. **The UI promises
migration and the database records extinction.** Nothing surfaces the disagreement; the GM finds out
on Wednesday morning, or never.

**Root cause, and it is not a bug — it is §0.3 decision 4.** *"Lineage is computed at commit, not
per keystroke… which is why the keystroke cost is 0.087 ms."* The plugin **witnessed** the
`splitBlock`. It threw that evidence away and the server now guesses it back from text.
**The headline performance number and the correctness failure are the same decision.** Emitting a
structural intent record at the moment the transaction happens — the id-transaction already carries
`tr.setMeta(identityKey, [...fixes])`, so the information is in hand and discarded — costs
microseconds and makes the diff unnecessary.

---

## F3 · `Ctrl+Z` after a save destroys revelations permanently, in a table with no repair path

**The claim under attack.** §0.3 decision 3 — one of the four decisions the candidate is proudest of
— puts the id transaction *into* the undo history so that undo restores the original pid exactly.
It does. That is precisely what breaks it. §2's flex screenshot puts a **`[Rückgängig]`** button in
the margin line, directly beside the split notice.

**Walk it.** Split · save · `Ctrl+Z` · save.

```
commit#1 events: [{"kind":"split","parent":"p_0002","children":["n_0001","n_0002"]}]
commit#1 resolve('p_0002') = ["n_0002","n_0001"]          <-- correct
after undo pids: p_0001, p_0002, p_0003                   <-- original pid restored, as designed
commit#2 events: [{"kind":"retire","pid":"n_0001"},{"kind":"retire","pid":"n_0002"},
                  {"kind":"create","pid":"p_0002"}]
APPEND-ONLY LOG: [split p_0002->[n_0001,n_0002], retire n_0001, retire n_0002, create p_0002]
resolve('p_0002') over the whole log = []   <-- p_0002 is ALIVE in the document: true
```

Sera's and Brannt's revelation points at `p_0002`. A block whose pid **is** `p_0002`, containing the
text they were told, is sitting in the live document. `resolve()` returns nothing — forever.

**Two compounding defects, both in the priced code.**

1. **Identity is reused across generations.** Undo restores the literal attribute value, so the same
   pid string denotes two different objects in one append-only history.
2. **`resolve()` is first-match.** `events.find(e => e.kind === "split" && e.parent === p)` — no
   generation, no timestamp, no ordering discrimination. The stale `split` answers first and answers
   forever.

**And there is no way back.** §6.2 makes `PassageLineage` append-only by DB grant —
`GRANT INSERT, SELECT` and nothing else — and celebrates it, correctly, as the integrity property
that a three-character `AUDIT.splice` inverted in round 1. The consequence is that **a structural
edit committed in error is irreversible at the data layer**, and there is no compensating event kind
in the schema (`kind ∈ split|merge|retire|create|revise` — there is no `revive`, no `supersede`).
This is not a corner case: it is `Ctrl+Z`, in a live session, five seconds after a save.

---

# MAJOR

## M4 · The merge guard guards one keystroke, not the outcome

**The claim under attack.** §2, the flex: *"Backspace is a permission action… the most ordinary
keystroke in software is load-bearing for the product's one non-negotiable promise."* §6.4: a
server-side precondition. Timo's line — *"your **text editor** just stopped you from leaking a
secret?"*

The guard is defined over **merge events**, and merge events exist only when `lineage()`'s text
concatenation matches exactly. So the guard's coverage is an artifact of a string comparison, and
the two commonest ways to move a secret into a revealed paragraph do not produce one.

**(a) Cut and paste — and *where* you paste decides whether you are protected.**

Paste the secret at the **end** of the revealed paragraph:
```
events: [{"kind":"merge","parents":["p_0002","p_0003"],"child":"p_0002"}]   <-- guard CAN fire
```
Paste the *same text* at the **start** of the *same* paragraph:
```
events: [{"kind":"retire","pid":"p_0003"},{"kind":"revise","pid":"p_0002"}] <-- no merge event
what the guard WOULD have said: {"blocked":true,"gains":[{"holder":"Sera",...},{"holder":"Brannt",...}]}
Sera now reads: "Bruder Alder schweigt. Das Aschene Siegel ist eine Faelschung. …"
```
Same leak. Opposite verdicts. Decided by where the caret was.

**(b) Simplest of all — do not press Enter at all.** Kaya's cursor is at the end of paragraph four,
the one Sera and Brannt hold. The next sentence is the same thought, so she just keeps typing:
```
events: [{"kind":"revise","pid":"p_0002"}]
Sera reads: "…Das Original verbrannte 1194. Bruder Alder schweigt."
```
No guard exists for this and none is specified. The candidate's own flex scenario only works because
the GM *happened* to have pressed Enter first.

**Observable in the artifact.** `spike-A1.html`'s `input` handler writes `p.html = el.innerHTML` on
every keystroke; `renderKodex()` renders `p.html`; `syncFromDom()` flushes all passages on any
structural gesture. A1's own honesty list states the rule as *"Der Kodex zeigt die festgeschriebene
Fassung: Tippen ändert ihn nicht, erst eine Strukturänderung tut es."* **That is the leak, described
as the design**: type the secret, then split any paragraph in the article, and the reader's book
flushes.

**Why this is the most damaging finding in the document.** A safety mechanism that is reliable for
one gesture and absent for its neighbour is worse than no mechanism, because it manufactures
unearned trust. Timo's reaction is the marketing asset; a GM who believes it will stop writing
carefully. The guard must be a precondition on **content movement between passages of differing
audience**, evaluated on the committed content diff — not on a detected merge.

## M5 · The blocker's default, auto-focused button is *"reveal the secret"* — and the audit records it as deliberate

§2 lists `[Beiden zuerst enthüllen]` first. `spike-A1.html` renders it `b-primary` and
`openBlocker()` ends with `var btn = prose.querySelector(".blocker .b-primary"); if(btn) btn.focus();`.
`fixReveal()` writes a real Revelation: `{who, session:15, source:"Kaya", belief:true, via:"Blocker"}`.

**Walk it.** 21:47. Combat. Kaya backspaces out of habit, a red box appears, and she hits `Enter` to
make it go away — the way she dismisses every dialog in every program she uses. Both players are
granted the secret, and the append-only, non-repudiable `AuditEntry` says **Kaya revealed it in
session 15**. She will not find out until Sera quotes it back at her.

§8.4 worries the guard fires too often. The sharper risk is the exact opposite: **the escape from the
friction *is* the leak, one keystroke deep, and it forges a record of intent.** The fix is cheap and
is not what §2 specifies: `[Abbrechen]` is the default and the focused control, and revealing
requires a second, deliberate act that is not the `Enter` key.

## M6 · Revision pinning and lineage resolution are mutually exclusive, and the candidate asserts both

- §3.1 / `CHAMPION.md` §138–150: *"`revision_id` pins the version revealed, so a later GM edit never
  retroactively changes what a character learned."*
- §6.5 rule 1: *"`Revelation.passage_id` may reference a retired pid. **Reads resolve through
  lineage.**"*
- §2: *"On the tablet lying on the table, Sera's codex **re-renders as two paragraphs**."*

Pick one.

**Horn A — reads render the pinned revision.** Then the pinned revision contains the *unsplit*
paragraph, Sera's tablet cannot re-render as two, and `resolve()` is elaborate machinery for a case
that can never reach a reader. It also means the GM has **no way to push a correction**: Sera's
Wednesday-morning codex is a museum of every typo and every retconned name, and no re-reveal flow
appears anywhere in §7.2's slice-1 contents or the Session Diff.

**Horn B — reads resolve live through lineage.** Then the pin is not a pin, §3.1's *"which is also
why paste-over is safe"* is false, and F2/M4 are leaks rather than curiosities.

A1's honesty item 6 lands in the incoherent middle deliberately — content pinned, structure not —
and calls it *"die Revisions-Bindung aus §3.1, hier verkürzt."* It is not shortened. It is a third
rule that nobody has written down, and it is the rule under which M4(b) leaks.

## M7 · §4.1 manufactures the candidate's largest named risk, and neither prototype obeys it

§4.1: *"There is no Edit button and no view/edit toggle. One contenteditable surface, role-gated
affordances: the GM's caret is live, a player's is not, and **the DOM is the same tree with the same
roles for both**."*

§8.1 then names screen-reader-on-a-contenteditable-that-is-a-document-for-one-role-and-a-field-for-
another as *"the single largest accessibility risk in the product"* and *"the least defensible number
in this candidate"* (5 days, falsifier at 10).

`spike-A2.html` line 1393: `if (editable) body.setAttribute("contenteditable", "true");` — **the
player simply gets a plain document.** A1 has only a GM role. Both prototypes declined the sentence.

The risk is therefore **self-inflicted by a clause neither artifact would implement**, and §4.1's
justification (*"a two-mode wiki is precisely why GMs keep their real notes in Obsidian"*) applies to
the *writer*, not the reader — nobody keeps two copies of a book they cannot edit. Drop "the same
tree for both", ship a plain semantic document for non-writing roles, and §7.5's NVDA gate stops
being the gate most likely to go permanently red. Keep it, and invariant 8 ("accessibility is
architecture") is staked on the least-evidenced line in the estimate.

## M8 · The play posture has no layout below 960 px — which includes 200 % zoom on the machine at the table

§4.2 is the *entire* answer to the visibility tax: *"during a live session the Primary Stage stays
the document and the session state moves into a margin column beside it… the text holds the centre,
the machinery lives in the margin,"* and *"the default posture during play is the GM is in the
document, which is the only posture under which the visibility tax is payable at all."*

`spike-A1.html`'s own CSS:
```css
@media (max-width:960px){
  .body{ grid-template-columns:minmax(0,1fr); }
  .rand{ width:auto; border-left:0; border-top:1px solid var(--c-rule); }
}
```
`.rand` follows `.stage` in the DOM, so below 960 px the margin rail — arrivals, presence, the reveal
preview, blockers, margin notes, the dice log, turn order — **stacks below the article.**

**Walk it.** A 1366 px laptop, the commonest machine at a table, at the 200 % zoom §7.5 gates:
effective width 683 px. The GM must scroll past ten paragraphs of Haus Vharon to discover that a
reveal arrived or that a player joined. The gate says *"200 % zoom does not clip"* — nothing clips.
The gate cannot see this failure, and it is the failure that removes the candidate's answer to its
own §8.5. Same on a tablet in portrait, where `Ctrl+Enter`, `Ctrl+K` and `Backspace`-as-permission
have no touch equivalent specified anywhere.

## M9 · The fusion has now been demonstrated in one direction, twice

Kaya's goal is two halves *where each makes the other stronger*. After two full rounds:

| Direction | Evidence |
|---|---|
| **Table → Wiki** (Revelation, lineage, merge guard, per-character Kodex) | a 116-SLOC layer, 27 assertions, two prototypes, timing numbers |
| **Wiki → Table** (§3.4: *"the tavern article's `scene` passage **is** the playable scene; the captain's `statblock` passage **is** the token's rule data; the Library is the compendium is the wiki"*) | **nothing. Zero artifacts, zero assertions, zero measurements.** |

§4.3's Wissenskarte is *"still slice 2, still described rather than built"* — for the second round
running — and §8.6 concedes there is no game in it. But §8.6 concedes a **slice** problem. This is a
**thesis** problem: the untested half is the half that answers *"why would a Foundry table switch?"*,
and §5 already concedes that for a table wanting to play tonight, all six rivals win and three are
free. A round 3 that repeats this pattern is not sequencing; it is a thesis standing on one leg.

## M10 · The 28 days prices the item that already existed; the launch-blocking list is a second product with no number

§0.4 prices the editor — the one thing there was already a spike for — at 28 days with a stated
falsifier. Round 1 asked for a price on the unpriced item, and got one. Good.

§7.4 then declares **launch-blocking**, i.e. before a single sale:

1. the visual rule-builder (RB-11: this *is* the go-to-market),
2. UVTT / `.dd2vtt` **import and export**,
3. Roll20 campaign JSON import,
4. Fantasy Grounds campaign XML import,
5. Foundry-shaped journal **export**,
6. the Electron desktop host, gated on two unrun spikes (`S5`, `S6`).

**Not one of these carries a number anywhere in the candidate.** §7.3 explicitly justifies moving
Roll20 and FG import to launch because *"each needs its own bespoke shape mapping and neither shares
a line with anything else in slice 1"* — a cost argument stated without the cost. The candidate
discharged round 1's pricing demand for the cheap half and reproduced the same offence for the
expensive half, in the same document. §0.4's falsifier ("if the accessibility item exceeds 10 days…")
is the only falsifier in the roadmap, and it guards 5 of an unknown total.

## M11 · Invariant 7 is enforced where the evidence has already been destroyed — and we ship the export that launders it

§7.3: *"licensed content is flagged, not laundered (`licensed_source` records are usable in the GM's
own world and excluded from Publication, `.chronicle` sharing and forking — invariant 7 enforced at
the **import** boundary, where it is cheap, not at the publish boundary, where it is a lawsuit)."*

The import boundary is where the evidence is **weakest**. In Foundry the only provenance signal is
that content lives in a module's compendium pack — and the standard, documented GM workflow is to
**import an adventure into the world** so it can be edited. Once imported, the journal entry sits in
the world's own collection, indistinguishable from the GM's own prose. A four-year world containing a
purchased adventure therefore imports as the GM's canon, unflagged.

**Walk it.** A GM imports her Foundry world containing a €25 published adventure she edited heavily.
Our importer marks it as hers. §7.4 makes **Foundry-shaped journal export** launch-blocking and sells
it as *"A GM can leave us for Foundry with her whole codex intact."* She now has a one-click static
Publication of a paid adventure "as a website you own", and a one-click re-export. We built the pipe
and printed the arithmetic in the Import Report.

**The default must invert:** anything arriving through an importer is `licensed_source` until a human
clears it, and the **Nachtragsgewährung** screen — which the candidate already ships as the migrating
GM's first act — is exactly the right place to ask. That change costs a checkbox and closes the
invariant.

## M12 · *"NPC article and statblock are one object"* is invariant 3, stated as the selling point

§4: *"An Actor is an Entry with an `actor` extension. **NPC article and statblock are one object.**"*
§3.4: *"the captain's `statblock` passage **is** the token's rule data… **There is no 'build the
encounter' step because there is no second representation.**"*

`CHAMPION.md` carries `ItemTemplateExt` / `ItemInstanceExt` and `ItemInstance.pinned_revision_id
NOT NULL` for **items**. There is no `ActorInstance` in either document.

**Walk it.** Three town guards on a map. One document. Three HP pools, three condition sets, three
`defeat_pending` states (invariant 4) over one `Passage.content`. Knock one guard down and the
article says the captain is at 0.

The strongest available reading — Entry is the template, and the champion's pinning machinery extends
to actors — is *available*, and I will grant it. But then **the sentence that sells the fusion is
false and must be withdrawn**, because "no second representation" is the literal negation of
invariant 3, and it is the line doing the marketing work in §3.4. Either name `ActorInstance` with
its pinned revision, or stop selling the collapse.

---

# MINOR

## m13 · Foreign-id re-minting hangs on a `prosemirror-view` meta the headless harness never saw a browser set

Replay `H5`'s slice insertion **without** `tr.setMeta("paste", true)`:
```
pids: p_0001, p_0002, p_0003, FOREIGN_X, FOREIGN_Y
foreign survivors: 2
```
§0.3 decision 2 (*"every pasted block is re-minted unconditionally"*) and §1's *"0 foreign ids ever
survive"* rest entirely on `getMeta("paste") || getMeta("uiEvent") === "drop"`. Only
`prosemirror-view`'s DOM paste/drop handlers set those. Android soft-keyboard clipboard insertion,
IME reconversion and anything routed through `readDOMChange` do not. §0.5 concedes "Android soft
keyboards" and "browser-native paste normalisation" as unpriced without noticing that **the
discriminator itself is the unpriced thing**. Name it in §7.5's anchor-survival gate.

## m14 · The structural-signature gate excludes the blocker and cannot fail on a permissions defect

`spike-A2.html` discloses both honestly — *"Zwei Knoten sind absichtlich ausgenommen: der Prüfstand
und der Blocker-Slot"*, and the baseline is captured lazily per `role@docVersion`. **§7.5 does
not**: it lists *"structural-signature sweep stable across the axis matrix"* under **Accessibility**
with no exclusions named. As built, the sweep is blind to the one component carrying the security
claim (`#blockerSlot` has `data-sig-ignore`, line 694), and because the baseline is whatever renders
first for a role, a player DOM that leaked a secret node would simply *become* that role's baseline.

This is a good gate and should be adopted — with its exclusions written into the gate definition, an
ignore-list policy naming who may add one, and a golden signature committed to the repo.

## m15 · A1's merge mints a third identity; the priced layer does not

`commitMerge()` does `var pid = mint();` and `merged.holders = up.holders` (discarding
`lo.holders`). `identity.mjs` (H4, L3) keeps the **upper parent's** pid, and `resolve()` walks
`parents → child`. The artifact everybody will screenshot implements a different merge from the one
that was measured — and one that would orphan every pointer to *both* parents. It is benign only
because the guard forces the holder sets equal before `commitMerge` is reachable. Also already caught
by GUI-Architekt 2: the blocker headline quotes `g.gains[0].wouldGain`, naming one text while the
table lists two.

---

# What I could not break — by name, because a clean bill has to mean something

1. **§6.6, reachability.** This is the best-answered section this project has produced and RB-11's
   charge is discharged. Hosted rooms as the v1 default; the LAN degradation *printed on the join
   dialog* with its real consequences (no service worker → no offline codex, no OPFS, the "Not
   secure" chip) and a *"Im Desktop-Client öffnen"* button; **ACME DNS-01** as the CGNAT-safe path
   that needs no inbound port and no PKI of our own, CI-smoked against a real staging endpoint;
   third-party tunnels documented and explicitly not operated; the Plex-pattern DNS+PKI named as
   deferred with its bill written down and unpaid. The cost model exposes its inputs so they can be
   attacked, lands at < €0.01/session-hour, and — correctly — identifies the binding constraint as
   **relay CPU and socket count, not bandwidth**, with a named spike (`S-R1`) to falsify it. I tried
   to find the hand-wave RB-11 warned about. It is not there.

2. **§0.1, the baseline finding.** Real, and I reproduced it: `splitBlock` copies node attributes
   into both halves and `p_0002` ends up addressing two sentences. The fear was justified, and this
   is the first document in this project to prove one of its own claims at the byte level.

3. **`mergeGuard()`'s rule.** The symmetric difference is correct, and two authors derived it
   independently from opposite ends (A1 from the blocker text, A2 from §3.2's union argument). Two
   secret passages merge silently; two identical-audience passages merge silently; only asymmetry
   blocks. I could not construct a widening it misses **when it is invoked**. M4 is about invocation,
   not about the rule — the rule is sound and should survive into round 3 unchanged.

4. **Three-way split, reorder, and undo *within* a session.** A three-way split in one save is
   reconstructed correctly (`split p_0002 → [n_0001, n_0003, n_0004]`, `resolve` returns all three).
   `H10`: the pid moves with the node on cut-and-paste reorder. `H7`/`H8`: undo restores the original
   pid exactly and redo does not mint a third generation. §0.3 decision 3 — *not* setting
   `addToHistory: false` — is correct, non-obvious, and the kind of thing only a running spike finds.
   (F3 is the consequence of that same correct decision meeting an append-only log, not a refutation
   of it.)

5. **§0.5, the visible-surface honesty.** *"`prosemirror-view` is bundled and measured but not
   exercised… contenteditable behaviour, IME/composition events, Android soft keyboards,
   browser-native paste normalisation and screen-reader interaction are unpriced. That is where text
   editors actually die."* Both artifacts repeat it in their own honesty lists. Nobody had to catch
   this. They said it first, and round 1 demanded exactly that.

6. **§§8.2, 8.3, 8.5–8.10.** All real, all unflattering, none padding. §8.2 in particular — the
   retire-on-split rule may be structurally incompatible with CRDT collaborative editing, *"this is
   genuinely hard and I do not have an answer"*, named as the item most likely to force a v2 rewrite
   — is the most valuable paragraph in the candidate and I have nothing to add to it.

7. **A2's role projection is omission, not hiding.** `visibleDoc()` filters the model *before*
   render; `display:none` appears nowhere for secrets; the secret block is measurably absent from the
   player tree, and the node delta is the right way to photograph the property. That is the correct
   shape, and it is the honest counter to *"you just used `display:none`"*.

8. **§5's competitive ledger.** Honest to the point of self-harm, including the two rows that hurt
   most: Fantasy Grounds free since 2025-11-08 with a **cloud relay that solves for free what §6.6
   costs us money to approximate**, and Alchemy having shipped a no-code Sheet Builder before us. The
   summary sentence — *"all six beat us, and three of them are free"* — is the correct sentence and
   most candidates would not have written it.

9. **The Foundry moat argument is correct and load-bearing.** A journal page is stored as an HTML
   string, so the smallest object Foundry can draw a permission boundary around is a whole page;
   RB-05's abandoned PixiJS v7→v8 migration (*"far more sweeping and disruptive than we had
   planned"*) is exactly the right evidence that the ecosystem anchor which froze their renderer also
   freezes their schema. Whatever else in this candidate breaks, **that** difference is real, and no
   rival can copy it cheaply. It is worth building something around. It is not yet built.

---

## What round 3 owes, if this thesis survives

1. Make `passageIdentity()` converge, and test it across a reload. (F1)
2. Record structural intent **when the transaction happens**; stop reconstructing it from text. The
   evidence is already in `tr.setMeta(identityKey, …)`. (F2)
3. Give `PassageLineage` a generation, ban pid reuse across it, and make `resolve()` order-aware —
   or add a compensating event kind, because append-only plus `Ctrl+Z` currently means
   *irreversible*. (F3)
4. Redefine the guard as a precondition on **content movement between audiences**, evaluated on the
   committed diff, not on a detected merge — and make `[Abbrechen]` the default. (M4, M5)
5. Choose: pinned reads or live reads. Write the losing consequence down. (M6)
6. Delete "the same tree with the same roles for both". (M7)
7. Price the launch-blocking list, or move items off it. (M10)
8. Build something — anything — that runs in the **wiki → table** direction. (M9)

> *Der Absatz weiß, wer ihn gelesen hat —*
> *bis der Griffel ihn berührt.*
> *Ein Wächter, der nur Rücktaste kennt,*
> *hat nichts bewacht, nur zugeschaut.*
