# Das Skriptorium (the document is the product) — Product Candidate A, Round 2

> **Der Absatz ist das Atom — und der Absatz weiß, wer ihn gelesen hat.**

The champion doubles down. A passage is not a record in a table that a form edits; it is a
**paragraph inside a real rich-text surface with stable block identity**, and every
consequential act in the product — reveal, clause, link, map region, export, publication — is a
gesture performed *inside the sentence you are already looking at*. Prep is writing. The writing
surface becomes the best-loved screen in the product and the reason a World Anvil, Obsidian or
Notion user moves.

**Optimises for:** 02:00 and year five. The GM who writes. Depth, typography, interlinked canon,
and a visibility tax paid at the speed of a keystroke because the reveal never leaves the document.

**At the cost of, stated as costs and not as framing:**

- **The GM who does not write.** A capture-first rival gets a first artifact in four seconds; we
  ask for a paragraph. §8.5 and §8.8 are honest about who that loses.
- **Minute one.** Unchanged from the champion: Owlbear is ~20 minutes to a running table with
  account-free joins (RB-01-owlbear). We hand a new GM a cursor. Our curve crosses theirs around
  session four in a market that decides at minute one.
- **The tactical ceiling.** Unchanged. Foundry's walls, perception channels, `ClockwiseSweepPolygon`
  and Scene Levels are a decade deep and we do not out-build them (RB-01-foundry, RB-05).

Everything in [`../CHAMPION.md`](../CHAMPION.md) is carried unless this document changes it. The
Revelation edge, the six B-grafts, `oracles.yaml`, the Leak Bench, the append-only audit by DB
grant, `character_id NOT NULL`, `revision_id` pinning, the Sealed Trace, the eight boundaries
B1–B8, the sixteen refusals — all inherited. Changes are marked **[Δ]**.

---

## 0. What round 2 owed, and the number it now has **[Δ]**

The round-1 verdict named one item as the fork's whole reason: *"the editor, and stable passage
anchors — unpriced in forge 1, unpriced after forge 2 and hardening… price it with a running
spike, not a paragraph."* It also ruled: **an artifact that asserts a mechanism either implements
it or says so on the visible surface.**

So this candidate opens with the spike, not the prose.

**Artifact:** [`../../spikes/spike-A-passage-identity/`](../../spikes/spike-A-passage-identity/)
— `identity.mjs` (the priced layer), `run.mjs` (27 assertions), `RESULTS.txt` (the raw run),
`package.json`. It runs headless on Node 24 against real `prosemirror-model`,
`prosemirror-state`, `prosemirror-transform`, `prosemirror-history` and `prosemirror-commands`.
`node run.mjs` reproduces every number below.

### 0.1 The baseline finding — the fear was justified

```
FAIL  N1 split — naive (attrs only, no plugin): are ids still unique?
      pids=[p_0001, p_0002, p_0002, p_0003]
FAIL  N2 split — naive: does the ORIGINAL pid now address two different sentences?
      p_0002 occurs 2x, addressing ["Das Aschene Siegel ist eine Faelschung.",
                                    " Das Original verbrannte 1194."]
```

ProseMirror's `splitBlock` copies node attributes into **both** halves. Put an id in an attribute
and press Enter, and one id now addresses two different sentences. A revelation, a clause, a
`[[link]]` and a map region all resolve to *whichever one the query happens to find first*. This
is the silent failure the verdict predicted, reproduced at the byte level in nine lines of test.

### 0.2 The fix, and its price

| Measurement | Value | How measured |
|---|---|---|
| **Identity layer, source lines** | **116 SLOC** (175 lines with comments) | `awk '/BEGIN PRICE/,/END PRICE/'`, non-blank non-comment |
| — `passageIdentity()` plugin | 26 SLOC | per-transaction uniqueness invariant |
| — `lineage()` commit diff | 42 SLOC | split/merge/retire/create/revise reconstruction |
| — `resolve()` pointer resolution | 16 SLOC | graph walk over lineage events |
| — `mergeGuard()` | 9 SLOC | the permission precondition (§2) |
| — helpers (`blocks`, `insertedRanges`, mint) | 23 SLOC | |
| **Assertions** | **25 / 27 passing**; N1+N2 are the naive baseline and fail by design | `node run.mjs` |
| **Keystroke cost, 300-passage article** | **0.087 ms** (budget 8 ms → 92× headroom) | 500 timed insertions after warm-up |
| **Keystroke cost, 2 000-passage article** | **0.379 ms** (21× headroom) | 200 timed insertions |
| **Commit-time lineage diff, 300 passages, 5 splits** | **0.34 ms**, all 5 splits detected, 0 false events | 20 timed runs |
| **Fuzz: 3 000 random ops** (type/split/merge/paste/undo/redo/delete) | 496 blocks, **every pid unique and non-null at every step** | seeded LCG, deterministic |
| **Fuzz: 1 200 duplicate-id pastes** | 2 778 blocks, **0 foreign pids surviving**, all unique | seeded LCG |
| **ProseMirror bundle** (model+state+transform+view+history+commands+keymap) | **208.1 KB min · 64.4 KB gzip · 56.3 KB brotli** | esbuild, minified, gzip/brotli via `zlib` |
| — against `03`'s 1.2 MB compressed shell budget | **5.4 % of budget (gzip)** | |

### 0.3 The four decisions the spike forced, none of which were in the corpus

1. **Nobody inherits a split.** Both halves are re-minted and the parent pid is **retired**. A
   "first half keeps the id" rule looks cheaper and is wrong: `H3` demonstrates that pressing
   Enter at position 0 creates an *empty* block first in document order, so the first-wins rule
   hands the identity to an empty paragraph and silently re-identifies the sentence a character
   was told. Retire-and-mint has no such case.
2. **Every pasted block is re-minted unconditionally, not just duplicates.** `H5` caught this:
   the first version only de-duplicated, so a pasted passage carrying `FOREIGN_Y` from another
   document became a live anchor here. An id arriving from outside this document is never valid
   inside it, duplicate or not. The `paste`/`drop` transaction meta is the discriminator; the
   plugin re-mints anything landing inside an inserted range.
3. **The id transaction must be in the undo history.** The first version set
   `addToHistory: false` — the reflex — and `H7` returned `undo=[p_0003, p_0004, p_0003]`: a
   **duplicate id produced by pressing Ctrl+Z**. Removing the flag makes `H7` and `H8` pass:
   undo restores the original pid exactly, redo restores the split pids exactly, and a
   split→undo→redo cycle does not mint a third generation.
4. **Lineage is computed at commit, not per keystroke.** The plugin's per-transaction job is one
   invariant (unique, non-null). Split/merge/retire reconstruction runs once per save against the
   last committed revision — which is why the keystroke cost is 0.087 ms and why 400 undos before
   a save cost the server nothing.

### 0.4 The editor's full price, decomposed so it can be attacked

The 116 SLOC is the part everyone feared. It is not the whole bill. One developer with an AI crew:

| Item | Days | Risk |
|---|---:|---|
| Port the identity layer to TS, wire to `prosemirror-view`, keep the 27 assertions green | 3 | low — it exists |
| Block AST ↔ ProseMirror node mapping, both directions, round-trip test | 4 | low |
| Constrained paste + the HTML→AST sanitiser (**shared with the Foundry importer**, §7.3) | 5 | medium |
| `[[` autocomplete through the projection, red links, backlink write-back | 4 | medium — it is an oracle (§6.4) |
| Reveal-as-writing-gesture, margin rail, inline blockers | 4 | low |
| **Accessibility on a contenteditable surface** — NVDA/Firefox + VoiceOver/Safari, roving focus, arrival without re-render | **5** | **high — this is where the estimate breaks** |
| Server: commit endpoint, lineage persistence, projection invalidation | 3 | low |
| **Total** | **28 working days ≈ 5–6 weeks** | |

**The falsifier, stated so the ledger can check it:** if the accessibility item exceeds 10 days,
this estimate is wrong by ~20 % and the round should say so. Nothing else on the list has that
shape.

**And the competitive fact that reframes the whole fear:** *Foundry V14's journal editor is
already ProseMirror* — TinyMCE was removed (RB-01-foundry, "GM prep"). The editor is not the
expensive thing and it is not a differentiator. **What you write into is.** Foundry stores a
journal page as an HTML string, so the smallest object it can draw a permission boundary around
is a whole page. We store an addressed block AST with lineage. That is the entire moat, and it is
116 lines plus a table.

### 0.5 What the spike does **not** prove — stated on the visible surface

It runs headless. `prosemirror-view` is **bundled and measured but not exercised**. Therefore
**contenteditable behaviour, IME/composition events, Android soft keyboards, browser-native paste
normalisation and screen-reader interaction are unpriced.** That is where text editors actually
die, and this candidate does not claim otherwise. The owed follow-up is a Playwright run in
Chrome and Firefox with a German IME and one NVDA pass — named in §7.5 as slice-1 gate work, not
as something already done.

---

## 1. The thesis under one constraint

Everything the champion put in a table, this candidate puts in a paragraph — and then makes the
paragraph a first-class, addressable, permission-bearing, lineage-tracked object. The bet is that
**the constraint buys identity, and identity buys everything else.**

The editor is therefore *deliberately narrower* than Notion or Google Docs, in exactly the places
where breadth would cost identity:

| Constraint | What it buys |
|---|---|
| Passages are **top-level block nodes only** — no nesting, no columns, no toggles | one flat, ordered, addressable list; `resolve()` is a graph walk, not a tree walk |
| **Paste is plain into the focused block**, or block-wise with all ids re-minted | `H5`, `H12`, and the fuzz result: 0 foreign ids ever survive |
| **No free-form embeds.** Images, statblocks, scene refs and clause markers are AST node kinds | no `innerHTML` path exists in the renderer; a forked stranger's passage *cannot express* an `onerror` |
| **No arbitrary block splitting inside a table cell or list item** — those are one passage | the atom stays the atom |
| **Merge is a permissioned action**, not a keystroke that always succeeds | §2 — the flex |

*Mēden agan.* We are not building a text editor. We are building **one addressable substrate with
a cursor in it**, and refusing every feature that would make the address unstable.

---

## 2. The flex — *"Dein Texteditor hat dich gerade am Verraten gehindert."*

One moment, one gesture, one result.

Kaya has the **Haus Vharon** article open in the Skriptorium — an ordinary encyclopedia page:
infobox, prose, blue links to *Der Eiserne Tresor* and *Bruder Alder*, one red link she has not
written yet. Timo is watching over her shoulder. Paragraph four reads:

> *Das Aschene Siegel, das Haus Vharon bei Hofe vorzeigt, ist eine Fälschung. Das Original
> verbrannte mit dem Kestrel-Flügel 1194.*

Sera and Brannt were told this whole paragraph in Sitzung 14. The next paragraph — *"Bruder Alder
schweigt seit dem Brand"* — nobody has been told.

**Gesture one.** Kaya puts the cursor between the two sentences and presses **Enter**, because she
wants the second sentence to stand alone. The paragraph splits. A quiet line slides into the
margin beside both halves:

> *Absatz geteilt · `p_4f9c` → zwei Absätze · 2 Enthüllungen wandern mit: **Sera, Brannt** —
> beide Hälften · [Rückgängig]*

On the tablet lying on the table, Sera's codex re-renders as two paragraphs, both still stamped
*gelernt Sitzung 14, von Bruder Alder*. Nothing was lost, nothing was silently re-identified.
This is `L1` and `L2` in the spike: `resolve("p_0002") = [n_0001, n_0002]`.

**Gesture two — the one Timo reacts to.** Kaya changes her mind, puts the cursor at the start of
the *next* paragraph and presses **Backspace** to pull it back up. The editor **refuses**, inline,
where the cursor is, in red:

> **Verschmelzen abgelehnt.**
> *Sera und Brannt kennen den oberen Absatz. Den unteren kennt niemand. Zusammenführen gäbe
> beiden: „Bruder Alder schweigt seit dem Brand."*
> `[Beiden zuerst enthüllen]` · `[Verschmelzen und Enthüllungen zurückziehen]` · `[Abbrechen]`

Timo, leaning in: *"Wait — your **text editor** just stopped you from leaking a secret?"*

**The flex, named:** *Backspace is a permission action.* The most ordinary keystroke in software,
in the most ordinary surface in software, is load-bearing for the product's one non-negotiable
promise — because the paragraph knows who has read it.

**Why this is the right flex and not a party trick.** It is the only demonstration in either
round that is (a) a *negative* — the product refusing to do something — which is the only kind of
security claim a bystander believes; (b) *photographable* as a single still: a red apparatus line
inside a beautiful typeset page; (c) impossible to fake, and impossible for any rival to build,
because it requires block-level identity *and* per-character read authorisation *and* a lineage
graph, and no competitor has the first of the three. It is `X1`/`X3` in the spike:

```
PASS  X1 MERGE GUARD: merging a revealed passage with a secret one is BLOCKED
      {"blocked":true,"gains":[{"holder":"Sera","wouldGain":"p_0003"},
                               {"holder":"Brannt","wouldGain":"p_0003"}]}
PASS  X3 UNGUARDED merge would widen an audience — demonstrate the leak the guard prevents
      WITHOUT the guard, resolving Sera's revelation yields "…Das Original verbrannte 1194.
      Bruder Alder schweigt." — secret text included: true
```

**Three honest amendments, because the flex must survive being poked.**

1. **The `+2` is still slice 2**, as ruled in the champion. Slice 1's flex is the two gestures
   above plus the three-column reader; the clause makes it whole later. We do not animate a
   hard-coded constant. (Round 1 did, and it was *more* persuasive for being fake.)
2. **The guard fires on a legitimate editing action.** If it fires often, GMs learn "Backspace is
   broken." Its firing rate in a real document is **unmeasured** — §8.4, with the instrumentation
   named.
3. **The best single photograph is still the Wissenskarte** (§4, Table). A red blocker in a
   document is the *"wait, what?"*; a map somebody was lied about is the thumbnail.

---

## 3. How the two halves fuse — writing is prep, reading is play, and the margin is the seam

Not "the wiki and the table are integrated." Three named mechanisms, one of which is new.

### 3.1 Inherited: the Revelation edge

Unchanged from `CHAMPION.md` §3.2 and not re-argued here.
`Revelation(passage_id, revision_id, character_id NOT NULL, granted_in_session_id, source_ref,
belief, granted_via, batch_id, revealed_by, revealed_at, retracted_at?, superseded_by?)`, doing
four jobs with one edge: permission, provenance, mechanics, history. `belief ∈ {true,false}` is
what makes it a story tool. `revision_id` pins the version revealed, so a later GM edit never
retroactively changes what a character learned — **which is also why paste-over is safe: the id
survives, the content changes, and the reader keeps the revision they were given.** (`H11`: the
partially overwritten resident passage keeps its pid; the change is a `revise` event, `L4`.)

### 3.2 New **[Δ]**: lineage, so knowledge survives writing

The champion assumed passage ids were immutable. The spike proves they are not: writing *moves*
them. So identity gets a second half.

```text
PassageLineage (id, entry_id, kind ∈ split|merge|retire|create|revise,
                parent_pids[], child_pids[], committed_revision_id,
                session_id NULL, actor_user_id, at)          -- append-only, DB-grant enforced
```

`resolve(pid) -> [live pids]` walks it. Its three rules, all tested:

- **split** → the pointer resolves to **all children**. A revelation on the parent grants both
  halves. No character silently loses a sentence. (`L2`)
- **merge** → the pointer resolves to the child, **and the merge itself is guarded** (§2), so it
  can never widen an audience. (`L3`, `X1`, `X2`)
- **retire** (deletion) → the pointer resolves to **nothing**. Dead, never dangling, and **never
  to a wrong passage** — which is the failure that would actually leak. (`L5`)

`resolve` is a **projection primitive**, a sibling of `visible_passages()` and `visible_events()`,
under the same lint and with its own `oracles.yaml` row (`lineage_resolve`) — because lineage is
itself an oracle: *"this paragraph you hold was split off something"* is information.

### 3.3 New **[Δ]**: the Marginalie — how play writes back without leaving the document

The champion's visibility tax was paid by hoping the GM would press a button in another zone.
Under this thesis, she never leaves the page.

`Ctrl+Enter` on the focused passage opens a **one-line margin note** anchored to that passage,
with `session_id` stamped and `channel: play`. ~3 seconds, no dialog, no navigation, cursor
returns to the prose. It is **not a new table** — it is a Passage with `block_type: margin` and
`anchor_pid`, so it inherits scoping, revisions, revelations, search and export for free.
*Mēden agan:* one substrate, zero new machinery.

Margin notes are GM-only by default and appear in the Session Diff with three one-key fates:
**promote** to prose (it becomes an ordinary passage, keeps its lineage), **formalise** into a
Ruling Card, or **discard**.

### 3.4 The worked example — Sitzung 15, timestamps from a real four-hour shape

| Time | What happens at the table | What the product does |
|---|---|---|
| 21:14 | Sera rolls Insight against the Vharon ledger and beats the DC | Kaya has the article open. She tabs to paragraph four's handle, presses Enter, picks Sera in the Reveal Sheet. 4-second toast, countdown ring, **nothing has left the server**. |
| 21:15 | Sera's tablet | The paragraph **arrives** — collapsed, marked *Neu · Sitzung 15*, `aria-live=polite`, expanding on her action. Brannt's screen does not change; his response body contains no bytes of it. |
| 21:16 | Brannt: *"Wer hat Alder das erzählt?"* Kaya improvises: *"Ein Schreiber namens Ossa."* | `Ctrl+Enter` on the Alder paragraph: *„Schreiber Ossa — Alders Quelle. Erfunden 21:16."* She types `[[Ossa]]`; autocomplete finds nothing; a **red link** is created with `first_mentioned_in_session: 15`. Elapsed: 6 seconds. She never left the paragraph. |
| 21:31 | Kaya splits the ledger paragraph so the 1194 date stands alone | Split event; both halves inherit Sera's revelation; margin line confirms *2 Enthüllungen wandern mit*. |
| 21:33 | She tries to merge the new half upward into a secret paragraph | **Blocked.** She picks `[Beiden zuerst enthüllen]`, which is the outcome she actually wanted. |
| 23:40 | Session end | **Session Diff:** 6 revelations, 3 margin notes, 1 red link, 1 split, 1 blocked merge, 0 misses. She promotes the Ossa note into a real paragraph in a new `[[Ossa]]` article — two keystrokes — and the red link turns blue. |
| Wed 07:40 | Sera on the train, on her phone | Her Kodex. Five paragraphs of Haus Vharon, each stamped with when and from whom. Brannt's has four. Neither is "the wiki with things hidden"; each is a different book. |

**Knowledge → play:** the tavern article's `scene` passage *is* the playable scene; the captain's
`statblock` passage *is* the token's rule data; the Library is the compendium is the wiki. There
is no "build the encounter" step because there is no second representation.

**Play → knowledge:** every row in the middle column above is an append-only `AuditEntry`.
Nothing is inferred. **No AI is anywhere in this loop.**

---

## 4. The six zones under this thesis

The six-zone shell of [`../../03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md)
survives — Session · Story · Cast · Library · Table · Forge, with Campaign Context, Module Rail,
Collection Rail, Primary Stage, Context Lens and Session Shelf. Independent axes
(content × skin × role × mode × a11y), 9-slice theme manifests, DOM-authoritative with Pixi
behind `MapRenderer`, the non-goals list, K7 — all unchanged.

| Zone | Under Das Skriptorium |
|---|---|
| **Story → das Skriptorium** | **Home. The app opens here.** The Primary Stage is the writing surface: infobox, prose, passages with handles, red links, a permanent Backlinks facet. |
| **Session → der Rand** | Not a zone you navigate to. During play the Session Shelf becomes a **margin rail** beside the document (§4.2). Before: the Docket. After: the Session Diff. |
| **Cast → Blätter, die rechnen** | An Actor is an Entry with an `actor` extension. NPC article and statblock are one object. A player sheet is an **article layout over the same passages** — a `sheet` recipe, not a second document. |
| **Library → das Regal** | Typed views over the Codex: templates, instances, inventories, handouts, media, the asset provenance ledger (SPDX id, author, source, checksum, `derived_from`). Template ≠ instance absolute; `pinned_revision_id NOT NULL`. |
| **Table → die Wissenskarte, und man schreibt sie** | A Scene is an Entry, so its regions are Passages — so the **Outline recipe of a scene is a document you can type into** (§4.3). |
| **Forge → das Formular** | Theme Studio + schema/type editor + rule-builder + generators + package tests. The wiki-template editor and the sheet builder are the same tool, because a sheet is a page type with numbers. |

### 4.1 Amendment: the editor is not a mode **[Δ]**

**There is no Edit button and no view/edit toggle.** One contenteditable surface, role-gated
affordances: the GM's caret is live, a player's is not, and the DOM is the same tree with the same
roles for both. Justification, not taste: a two-mode wiki is precisely why GMs keep their real
notes in Obsidian and their published notes in a wiki, and the moment there are two modes there
are two documents. This is also the single largest accessibility risk in the product (§0.4,
§8.1) — a contenteditable region that a screen reader must treat as a document in browse mode for
one role and a text field in focus mode for another. It is gated, not assumed.

### 4.2 Amendment: der Rand — the margin rail replaces the Session Shelf during play **[Δ]**

The champion's fourth shell amendment was a `Ctrl+K` codex overlay, on the argument that *a GM
mid-combat will not navigate away.* This candidate takes that argument one step further: during a
live session the Primary Stage **stays the document** and the session state moves into a margin
column beside it — arrivals, presence, the reveal preview, blockers, margin notes, the dice log,
turn order. Like a critical edition's apparatus: the text holds the centre, the machinery lives in
the margin.

Both survive: the overlay is still `Ctrl+K` for jumping. But the default posture during play is
*the GM is in the document*, which is the only posture under which the visibility tax is payable
at all.

### 4.3 The Table: you write the map **[Δ]**

A Scene is an Entry; its regions are Passages; the **Outline** recipe (03's third render recipe,
the accessible one) is therefore a document. So the GM builds a scene the way she builds
everything else — by typing:

```
## Der zweite Keller                      → a region
  ### Die Rechnungsarchiv-Nische          → a nested region
  > Man sagt, hier stand die Presse.      → the region's rumour text (belief: false)
  [[Bruder Alder]] wurde hier gesehen.    → a link, backlinked from Alder's article
```

Save, and the Wissenskarte renders: regions the reader holds are **drawn, named and stamped**;
regions held with `belief: false` are **dotted rumour outlines**; regions not held are **absent** —
no shape, no label, no placeholder, no bytes. Sera's map and Brannt's map differ, and each is
wrong exactly where somebody lied to them.

No walls, no LOS, no attenuation, no sweep polygon, no Pixi hot path. It routes around the one
moat we conceded, gives WFC a consumer two slices early, and it is **a still image** — the
marketing asset a knowledge graph does not otherwise have. It also makes the Outline recipe the
*authoring* surface rather than the accessibility consolation prize, which is the first time
anyone in this market has had a reason to build it well.

**Honesty:** still slice 2, still described rather than built. Round 2 paid its debt on the
editor; the Wissenskarte remains owed, and §8.6 says so.

---

## 5. The differentiation ledger

Every "we can" below is a consequence of block identity + per-character read authorisation +
lineage. Every "they still win" is a real loss.

### Foundry VTT (RB-01-foundry, RB-05)

- **We do, they cannot:** draw a permission boundary around a *paragraph*, not a page. Their
  journal editor is already ProseMirror (TinyMCE removed in V14) — but a journal **page is stored
  as an HTML string**, so there is nothing smaller to address. Adding per-block authorisation
  means changing every journal read path in an ecosystem of 5,338 modules with a median
  19-module install. RB-05 documents them abandoning the PixiJS v7→v8 **renderer** migration
  mid-cycle as *"far more sweeping and disruptive than we had planned"*: the same ecosystem anchor
  that froze their renderer freezes their schema. Also ours alone: lineage (a revelation survives
  the GM editing her own prose), the merge guard, per-character map projection.
- **They still win:** lighting, walls, vision, Regions, elevation; 475 systems and 2,758 modules;
  $50 once, perpetual, no feature gating; ten years of trust; a real Marketplace; a Launcher and
  HTTPS provisioning shipping in 14.5. **For a table that wants to play 5e tonight with bought
  content and good lighting, Foundry beats us outright and will for years.**

### Roll20 (RB-01-roll20)

- **We do, they cannot:** a wiki at all — RB-01 records *"no wiki-grade"* prep, journals and
  handouts only. And **leaving**: they have no campaign export, unreliable character transfer,
  and declined custom-content export. We answer with `.chronicle`, static Codex export and
  Publication: *here is your world, as a website you own.* Being easy to leave is the sharpest
  possible counter to their lock-in and the reason an EU, data-sovereignty-minded audience trusts
  us.
- **They still win:** ~10M accounts and the LFG network effect — the one asset in this market
  nobody can buy. Licensed compendiums. Zero-install browser reach on day one. Jumpgate will
  eventually make the canvas competitive.

### Fantasy Grounds (RB-01-fantasy-grounds)

- **We do, they cannot:** browser play at all (desktop-only Unity; the 2025-11-08 Online Reader
  is *reading* of purchased modules, not play). Accessibility as architecture — a Unity client
  structurally cannot follow us there (RB-11, K3). Sharing the **GM's own** world rather than
  purchased content. No coded effect strings.
- **They still win, and this is the most uncomfortable row in the ledger:** the deepest rules
  automation in the market; ~3,858 licensed store products; **fully free since 2025-11-08** — no
  licence, no subscription, no ads; and a **cloud relay that already solves reachability for
  them, for free, with no port forwarding.** They have what §6.6 costs us money to approximate,
  and they give it away.

### Owlbear Rodeo (RB-01-owlbear)

- **We do, they cannot:** campaign memory. RB-01 is explicit — *"no journals/quests/wiki
  natively"*, patched by community extensions (Journal!, GM Vault, PDF Reader). No sheets, no
  rules engine, no compendium. Everything durable happens somewhere else.
- **They still win:** the onboarding benchmark — ~20 minutes to a table, players join
  account-free in seconds; Warp Core GPU rendering with a 137-megapixel map on an iPhone 14 Pro
  Max; one-click CV auto-fog (2.4 "Forecast"); an explicit quality switch that is the cleanest
  performance-UX decision anyone in this market has shipped (we copy it outright); and a pricing
  model — **storage and rooms, never features** — that the market accepts and we adopt.

### Alchemy (RB-01-alchemy)

- **We do, they cannot:** self-host or export. RB-01: fully hosted SaaS, **no self-host option
  anywhere**, no public API, no mod/plugin system, no community module ecosystem; portability is
  character-sheet JSON. And per-character knowledge — their "universes" are lore *shared*, not
  lore *projected*.
- **They still win:** the best-looking product in the category; built-in voice and video with
  active-speaker highlighting (no Discord); a native Streamer Mode reviewers call unique; iPad
  and mobile ambitions; and — the concession that costs most — **a shipped, no-code Sheet Builder
  in open beta.** They beat us to the first half of K2. Our answer must be *deeper*, not
  prettier: their builder has no scripting *by design* and no formula trace; ours must show its
  derivation.

### TaleSpire (RB-01-talespire)

- **We do, they cannot:** anything textual. **No character sheets built in** (*"system-agnostic
  mostly by omission"*); **no rules automation**, planned post-EA; GM prep tools *"essentially
  absent"* — quests WIP, handouts "being refined"; sheet building is **code** (sandboxed HTML/JS
  Symbiotes with a 400-character chat API limit), not a GUI. No self-hosting, no offline mode, no
  general campaign export.
- **They still win:** the gasp. 2,100+ tiles and 280 minis, real 3D dioramas, ~90 % positive
  across 4,300+ reviews, and *slabs* — boards exported as compact pasteable text strings, which
  is the single most elegant sharing primitive in the category and we should steal its shape for
  scene fragments.

### The rivals our slice-1 prospect actually compares us to

Until clauses ship, a prospect is not evaluating a VTT — they are evaluating a **permission-scoped
wiki**. That field is World Anvil, LegendKeeper, Kanka, Notion and Obsidian.

- **We do, they cannot:** per-character projection; provenance on a sentence; a live table
  attached to the same substrate; the merge guard; lineage; and eventually a paragraph that is
  worth `+2`.
- **They still win, bluntly:** Obsidian is **free, local, offline, instant and already
  installed**, with a decade of plugins and no visibility tax whatsoever. World Anvil has years of
  content, templates and an existing community. Notion has a better editor than we will ship in
  year one and everyone already knows it. **Our answer for the migrating GM is import; for the
  GM starting fresh we have palliatives, not a cure** (§8.8).

> **A ledger with no losses is a lie, so here is the summary sentence:** for a table that wants to
> play a licensed system tonight with bought content and good lighting, **all six beat us, and
> three of them are free**. We win the table that intends to still be playing in this world in
> 2031, and the GM who would rather write than click.

---

## 6. The data shape

[`../../02-domain-model.md`](../../02-domain-model.md) is inherited with all six refinements, plus
`CHAMPION.md` §5 in full: `Entry` as substrate with `entry_id`-keyed extensions; `Link`,
`Revelation`, `Schema`, `ReaderIdentity`; the Reader Projection bitmap; `ItemInstance`
pinned-and-promotable; the three presence concepts; `AuthSession ≠ GameSession`; roles on
memberships; no `confidence` field.

**This thesis adds exactly one table and one function, and changes three rules.**

### 6.1 `Passage`, precisely **[Δ]**

```text
Passage (pid PK, entry_id, ord, block_type, content, clause NULL,
         anchor_pid NULL,        -- set only for block_type = 'margin'
         created_revision_id, retired_revision_id NULL)
```

`pid` is the canonical, minted, opaque id — **not** derived from position, ordinal, heading text
or content hash, all of which the spike shows to be unstable under ordinary writing.
`Passage.content` remains the closed, versioned block AST (paragraph, heading, list, table, quote,
code, imageRef, wikilink, statblockRef, clauseMarker, text; inline marks em/strong/code/link
only). Never HTML, never Markdown at rest. **No `innerHTML` path in the article renderer,
lint-enforced.**

### 6.2 `PassageLineage` — the one new table **[Δ]**

Schema in §3.2. Append-only, enforced the same way `AuditEntry` is: the runtime DB role holds
`GRANT INSERT, SELECT` and nothing else. Round 1's justification stands — a three-character
`AUDIT.splice` inverted the domain model's one non-negotiable property and *survived a rebuild*.

Write path: the commit endpoint runs `lineage(savedDoc, newDoc)` (0.34 ms at 300 passages),
persists the events, and invalidates only the affected pids in each ReaderProjection. Bounded
work: the number of structural edits in one save, not the size of the document.

### 6.3 `resolve()` joins the choke point **[Δ]**

```
visible_passages(viewer, scope)   -> ReaderProjection
visible_events(viewer, session)   -> [Event]
who_knows(passage, viewer)        -> [{holder, state, source, granted_via, action, at}]
resolve(pid, scope)               -> [live pid]        -- NEW, server-side only
```

`resolve` runs **inside** the projection module and never on a client. A client that could resolve
lineage could ask *"was this split?"* about a passage it does not hold, and a count is an oracle.
New `oracles.yaml` rows required from day one: **`lineage_resolve`, `split_marker`,
`merge_blocker`, `margin_note`**. CI fails if any row has no green test; the dependency-cruiser
rule that reddens the build on raw `Entry`/`Passage`/`Revelation`/`AuditEntry` imports outside
the projection modules extends to `PassageLineage`.

### 6.4 The merge guard is the fifth use of one dialog **[Δ]**

`mergeGuard(parents, holdersOf) -> null | {blocked, gains[]}` is a **server-side precondition**,
in the same family as the champion's `visibility(source) ⊇ audience(reveal)`. It renders through
the same preview→blockers→one-key-fix component as the Publish Trace, the reveal source
precondition, the template review and the reveal preview. **One pattern, five places: it costs
once and teaches once.**

The client may render the blocker optimistically for latency, but **the commit is server-first and
authoritative**. A client-side-only guard would be exactly the failure the intake forbids:
client-side hiding is never a security boundary.

### 6.5 Three rules that change **[Δ]**

1. **`Revelation.passage_id` may reference a retired pid.** Reads resolve through lineage. It is
   never rewritten — rewriting history is what makes a *wrong* wiki. Retraction stays honest: the
   paragraph remains, struck through, *"zurückgenommen in Sitzung 19."*
2. **`.chronicle` and `.chronicle-pkg` must carry lineage events**, or a forked world's
   revelations orphan on import. This is a **change to boundary B2** ("a package *is* a Codex"):
   the package format grows a `lineage.jsonl`. Round-trip CI test in slice 1, unchanged in spirit.
3. **Publication anchors are text-derived slugs, not pids.** A published static page's `#anchor`
   must survive a split; pids do not (by design). Lineage-aware 301s from retired anchors are
   specified and **not yet built** — §8.3.

### 6.6 Reachability, with the numbers **[Δ carried and re-costed]**

This thesis **forces** hosted rooms, and says why in one sentence: a table needs to exist for four
hours on Tuesday, but **a codex must be readable on Wednesday morning from a phone.**

| Path | Ships in v1? | What a non-technical GM behind CGNAT experiences |
|---|---|---|
| **Hosted room** (default) | **Yes** | Create world → copy link → players in. She never meets the words port, certificate, NAT or IP. |
| Electron host + Electron players | Yes, €0 | Everyone installs; full capability; works behind CGNAT on a LAN. |
| Electron host + browser players on LAN | Yes, **with its degradation printed on the tin** | Plain `http://192.168.x.x` is **not a secure context** (`localhost` is): no service workers → **no offline codex**, no WebGPU, no OPFS, and the browser's "Not secure" chip. The join dialog says exactly this, with a button *"Im Desktop-Client öffnen"*. |
| Eigene Domain via **ACME DNS-01** | Yes | A GM who owns `aldenfall.de` gets a real certificate on her home box **behind CGNAT** — DNS-01 needs no inbound port. Five-field wizard; we operate no PKI and no DNS zone. CI-smoke-tested against a real ACME staging endpoint. |
| No domain, wants browser players | Yes, as two named choices | Everyone on the desktop client, **or** a maintained, CI-tested third-party tunnel recipe (Cloudflare Tunnel / Tailscale Funnel) we document and do not operate. |
| Plex-pattern DNS zone + per-server wildcard PKI | **No — explicitly deferred, named as deferred** | It is a service business, not a feature. Its bill is written down and not paid. |

**Cost per session-hour, inputs exposed so they can be attacked:**

- Text is free forever and metering it would meter the thing the thesis instructs the GM to
  accumulate. 2 000 articles × ~30 passages × ~400 B ≈ 24 MB; ×3 for revisions, plus revelations,
  lineage, FTS index and eight projections ≈ **~150 MB per five-year world** ≈ **€0.003/month**
  at €0.02/GB-month.
- Play: JSON deltas ~30–80 KB per client-hour ⇒ 5 clients × 4 h ≈ **1.0–1.6 MB per session**;
  egress at ~€0.09/GB ≈ **€0.00014 per session**. Compute ≈ **€0.001 per room-hour**.
- **Therefore < €0.01 per session-hour, dominated by compute, not bandwidth.** The binding
  constraint is relay CPU and socket count — spike **S-R1**: 50 synthetic tables × 5 clients on
  one 4 vCPU node.
- Assets carry the meter: 5 GB included **per account**, overage **at cost** (≈ €0.02/GB-month),
  cancellable; a `StorageTarget` lets the GM point at her own S3/R2/Backblaze bucket (our marginal
  cost zero); a **Kaltes Regal** moves untouched assets to infrequent-access after 12 months at ⅓
  rate with one-click warm-up.

*All figures are estimates with their inputs shown. None is a vendor quote.* Monetisation per
RB-11 and unchanged: **one-time GM licence (~€30, ≈ €23.50 net through a merchant of record),
players always free, sold direct.** No player ever buys anything. Steam gated, not scheduled.
Boundaries B1–B8 carried in full, with the B2 amendment in §6.5.

---

## 7. The first slice — "Der geteilte Absatz"

One workflow. One universe, one campaign, browser only, hosted room, three people.
**No map, no dice, no combat, no clause, no `+2`, no Electron, no theme editor, no generators, no
AI, no collaborative editing.**

### 7.1 The workflow, end to end

A GM writes three linked articles in the Skriptorium. She opens a session. Two players join by
link with a display name and no account. **She reveals one paragraph to one character. She splits
that paragraph, and the revelation follows both halves. She tries to merge it into a secret
paragraph, and the product refuses.** That player's codex changes and the other's cannot, because
the bytes never left the server. She retracts. She exports the campaign, re-imports into an empty
instance, and the diff is empty.

### 7.2 Contents

- Accounts, campaign, membership, **server-side permissions**.
- `Entry` / `Passage` / `Revision` / `Link` / `Revelation` / **`PassageLineage`**.
- **The Skriptorium**: ProseMirror surface, passages as top-level id-bearing block nodes, the
  116-SLOC identity layer with its 27 assertions in CI, constrained paste, commit-time lineage,
  `[[` autocomplete with red links.
- **The merge guard**, server-side, with the shared blocker component.
- The article stage with a Backlinks lens; real `<a href="/w/<universe>/<slug>">` routing with a
  cold server-side GET against the reader's projection and **uniform 404, never 403** — same body,
  same timing, timing-variance test in `oracles.yaml`.
- A live session with presence, the **Reveal Sheet** (focus-trapped, `aria-modal`, no preselected
  recipient, byte preview, 4-second abort window during which nothing is sent), and the **margin
  rail**.
- The per-character projection and the **three-column tablist** (Kanon / Die Gruppe / Sera).
- `visible_passages` + `visible_events` + **`resolve`** + `oracles.yaml` + the dependency-cruiser
  rule + the Leak Bench differential test.
- Append-only `AuditEntry` **and** `PassageLineage` by DB grant; abort, then Retract.
- **Leseschlüssel** + one player surface: the personal Kodex on a phone (claim page, `httpOnly
  SameSite=Lax` cookie, keyless redirect, `noindex`, `no-store`, 60 req/min, revocation one row).
- **Foundry world import + Markdown/Obsidian vault import** — see §7.3.
- `.chronicle` export/import round-trip in CI, including lineage.
- The `Archive` skin only (typography-led; it is the reading kit and this is a reading product),
  with the Clean baseline reachable via the a11y axis.
- The `Platform` port (B1) with both impls from commit 1.

### 7.3 The two cheats this section usually contains, and what happened to them

**Cheat one: shipping the importers "because market."** The round-1 verdict recorded that the
market vote flips if import is descoped — so it is not descoped, it is **halved on an
architectural argument, not a schedule argument**: the HTML→block-AST sanitiser is *the same
function* as the editor's paste handler, which slice 1 must build anyway. Foundry journal pages
are HTML strings; Markdown/Obsidian vaults are markdown. Both land in the sanitiser we already
own, so both cost the mapping and not the parser. **Roll20 campaign JSON and Fantasy Grounds
campaign XML move to launch-blocking** (§7.4) because each needs its own bespoke shape mapping and
neither shares a line with anything else in slice 1.

The import still ends in the **Nachtragsgewährung** screen — *"1 106 Passagen sind Kanon. Was weiß
die Gruppe schon?"* — so the migrating GM's first act in our product is our core gesture,
performed on her own four-year world. Three rules hold: nothing is silently dropped (unmapped data
becomes a red-linked `Import-Rest` entry and the Import Report prints the arithmetic); **licensed
content is flagged, not laundered** (`licensed_source` records are usable in the GM's own world
and excluded from Publication, `.chronicle` sharing and forking — invariant 7 enforced at the
*import* boundary, where it is cheap, not at the publish boundary, where it is a lawsuit); and the
import lands into **documents**, which under this thesis is the only shape it could take.

**Cheat two: Schema-Lite.** Cut. Slice 1 ships **three hard-coded page types** (article, person,
place) and **no custom-type form**. `Entry.schema_id` points at one of three rows. The
"Neuer Seitentyp" form moves to slice 2 with the rule engine, where it belongs, because a page
type without a formula is a `<dl>`.

**Also explicitly not in slice 1:** Feldnotizen, *Was habe ich verpasst?*, the Wissenskarte, the
Ruling Card, the Contradiction Engine, clauses and derived numbers, item templates and
inventories, the second skin, the visual rule-builder, WFC, the Electron shell, UVTT, universes as
a visible concept, collaborative editing (§8.2).

### 7.4 Launch-blocking, distinct from slice-blocking

Per RB-11 §"Implications for design round 1" — discovery runs through creators and system authors,
so these are launch requirements, not phase 9:

- **The visual rule-builder** (schema forms + the Ruling Card's promotion path). It is the
  go-to-market, not a feature.
- **UVTT / `.dd2vtt` import and export** (walls, doors, windows, lights, grid) — the interchange
  all three rivals already read. The three bespoke outbound scene exporters are killed to fund it.
- **Roll20 campaign JSON and Fantasy Grounds campaign XML import.**
- **Foundry-shaped journal *export*** — new, and nearly free here: block AST → HTML is the
  sanitiser run backwards. *A GM can leave us for Foundry with her whole codex intact.* Being easy
  to leave is the counter to lock-in, and no rival can reciprocate.
- **The Electron desktop host** — the self-hosting invariant's implementation (RB-11: a browser
  cannot host; Foundry telemetry 68.35 % Electron), gated on spikes **S5** (NVDA through the
  shell) and **S6** (measured footprint and idle RAM).

### 7.5 The gates — every one can go red

| Gate | Green when |
|---|---|
| **Anchor survival** | The 27 assertions green in CI on every commit, **plus** the browser half the headless spike does not cover: Playwright in Chrome and Firefox, German IME composition, Android soft keyboard, native paste from Word/Google Docs/Obsidian, 10 000-op fuzz. **Red until run.** |
| **Leak** | The constructed differential test at 8 characters × 40 passages × 3 states × 2 locales over payload, DOM **and the serialised accessibility tree** — plus new cases: a split marker, a merge blocker, a margin note and a `resolve()` result must never appear in a non-holder's stream. Two synthetic worlds identical but for one secret, complete responses diffed byte for byte. |
| **Merge-guard friction** | Instrumented four-hour session: the guard fires **≤ 3 times**, and every firing ends in a fix rather than `[Abbrechen]`. Red falsifies the flex, and the round says so before marketing does. |
| **Labour / visibility tax** | Same session: **≤ 4 minutes total GM typing on product chrome, no single input interaction over 12 s**, and the Session Diff shows **≤ 2 misses**. |
| **Cold read** | At session two, a player who missed session one answers *"what does your character know about X?"* from her own book alone, GM silent, and learns nothing she should not. |
| **Performance** | 300-passage article, 6 viewers, 3 000 revelations, ArrowDown held 3 s → no frame > 50 ms and **zero `focusout` on the selected handle**; search keystroke → repaint < 8 ms with a virtualised 2 000-entry rail; `retrieve()` p95 < 80 ms against the **5 000-entity / 50 000-row fixture campaign**. Editor keystroke p99 < 8 ms *in a browser* (headless: 0.087 ms). |
| **Round-trip** | Export → import → byte-identical diff **including lineage events**, in CI, plus a redacted-export case. |
| **Accessibility** | `axe-core` clean; NVDA/Firefox and VoiceOver/Safari complete the demo keyboard-only **including editing**; 200 % zoom does not clip; live contrast probe green across skins × modes × contrast levels; structural-signature sweep stable across the axis matrix. |
| **Infrastructure** | Spike **S-R1**: 50 synthetic tables × 5 clients on one 4 vCPU node. |

**Acceptance demo, one take, no cuts:** write three articles with `[[` links → open session → two
browsers join by link → reveal paragraph four to Sera → Brannt's screen does not change → open
Brannt's DevTools and show the response body contains **no bytes** of it → **split the paragraph;
the margin says two revelations moved; Sera's tablet re-renders as two stamped paragraphs** →
**press Backspace to merge into the secret paragraph; the editor refuses, in red, naming exactly
who would gain what** → retract → export → import into an empty instance → diff empty. **Then
thirty seconds that are not the DevTools tab:** Wednesday morning, a phone, Sera reading her own
codex.

---

## 8. Weaknesses

### 8.1 The spike is headless, and editors die in the DOM

`prosemirror-view` is measured but not exercised. Contenteditable, IME composition, Android soft
keyboards, browser-native paste normalisation, and — worst — **screen-reader interaction with a
region that is a document for one role and an editable field for another** are all unpriced.
§4.1's "the editor is not a mode" makes this harder, not easier. The 5-day accessibility line in
§0.4 is the least defensible number in this candidate, and it is the one that decides whether
"accessibility is architecture" survives contact with a cursor.

### 8.2 Collaborative editing is unpriced and may be incompatible with the identity rule — **the hard one**

The retire-on-split rule is a *global* decision about a document. Two writers splitting different
paragraphs in the same Entry produce two lineage streams with no merge order, and the naive fix
(y-prosemirror / CRDT) re-introduces exactly the problem the spike just solved: a CRDT merge can
resurrect a retired pid or converge two peers on different children. **This is genuinely hard and
I do not have an answer.**

The mitigation is honest and partial: slice 1 ships a **single-writer lock per Entry** with
presence (*"Kaya schreibt"*), which is what a solo GM's prep tool actually needs. But it is a
deferral with a due date, not a solution — the day a co-GM exists, or the day Feldnotizen let
players write, it returns. And Feldnotizen is one of the champion's two strongest retention
arguments (N2), so this is not a corner case we can decline forever. **A candidate that claims
otherwise is lying; this one names it as the item most likely to force a v2 rewrite.**

### 8.3 Id churn leaks into things that are supposed to be permanent

Retire-on-split is right inside the product and awkward outside it. Pids appear in `.chronicle`
files, in `.chronicle-pkg` packages, in published static sites, and in player-visible URLs. A
published page's `#p_4f9c` anchor breaks the moment the GM splits that paragraph — and unlike a
revelation, a stranger's bookmark has no lineage resolver behind it. §6.5's answer (text-derived
slugs plus lineage-aware 301s) is specified, costed at roughly two days, and **not built**. Worse:
a *forked* world imports lineage events whose parents may not exist in the fork, and the
resolution rule for that case is undefined.

### 8.4 The merge guard fires inside the most impatient gesture in software

Backspace-at-start-of-paragraph is muscle memory. A guard that refuses it — even correctly — is a
guard that teaches "this editor is broken" if it fires often. **Its firing rate in a real document
is unmeasured**; §7.5 makes it a gate (≤ 3 per four-hour session, every firing resolved rather
than cancelled) precisely because I cannot argue it, only measure it. There is also a nastier
variant: the guard's *blocker text names the secret paragraph to the GM*, which is correct, but
the same component must never render for a co-GM with narrower rights — a `visible_events`
problem wearing an editor's clothes.

### 8.5 The visibility tax is narrowed, not closed

Making the reveal a writing gesture helps enormously at 02:00 and **does nothing at 21:47**, when
the GM is running combat and is not in the document. The margin rail (§4.2) is the answer and it
is a *posture* bet, not a mechanism. The register still records what the software saw: a GM who
narrates a secret aloud and presses nothing leaves a hole, and under this thesis the hole is not a
display error but **a clause that silently does not fire.** *Erfasst*, never *Weiß*. The product
must never present a reader's book as complete.

### 8.6 There is still no game in it

Slice 1 has no dice, no map, no token, no number. The Wissenskarte is described (§4.3), not built,
for the second round running. Against a capture-first rival we are strictly slower to a first
playable artifact, and against Owlbear we are twenty minutes slower to a table on day one. K5 —
the flagship Kaya named — begins at slice 2 in its knowledge-projection half and later in its WFC
half. **This is a stakeholder fork and belongs to Kaya**, recorded in `OPEN-DECISIONS.md`.

### 8.7 The sanitiser is now the most security-critical function in the product

Because paste and import share one HTML→block-AST path (§7.3 — a real cost saving), that path is
on the hot path of *both* the editor and the migration story, and it processes bytes from Foundry
worlds, Word, Google Docs and strangers' `.chronicle-pkg` files. The no-code invariant survives
only if it has no escape hatch: no embedded HTML/JS/Lua, no scripted SVG (re-encoded server-side
or rejected), no remote fetch from package data, no `url()` to a non-package origin, no iframes,
no template expressions, no dynamic asset loading by constructed path. **One bug here is a
refutation, not a defect** — and RB-11 documents exactly this failure class in 2026: Wallpaper
Engine's malicious items, Meccha Chameleon's Blueprint payload, TTS's self-replicating Lua.

### 8.8 The document thesis is weakest for the GM who accumulates rather than writes

The rival's charge lands partially and I will not pretend otherwise: the first thing many real GMs
do is paste four thousand words out of Google Docs. Our handler does the right thing — 60 blocks,
60 fresh ids, zero foreign anchors (`H12`, fuzz) — but the result is an *import*, not writing, and
none of the thesis's payoff (reveal-in-place, marginalia, lineage) has fired yet. Cold start is
unchanged in shape: import shortens the curve dramatically for the migrating GM and does nothing
for the GM starting fresh, who faces an empty page against Owlbear's twenty minutes. Session Zero
interview (a question tree, not AI), one excellent seed world, and red links as a prep game are
palliatives.

### 8.9 Fandom-grade at scale is still unproven

No artifact in three rounds has search, an index, disambiguation, ranked autocomplete or a list
longer than a handful of rows. The single `retrieve(viewer, scope, query)` with the permission
join **inside** the SQL and the 5 000-entity fixture are specified and gated; they have not been
exercised. This spike proved the *atom*, not the *encyclopedia*.

### 8.10 Carried, unchanged, honestly

Asymmetric numeric secrets in a shared roll remain subtractable when two sheets share a screen —
guidable, not enforceable; **secret clauses should mostly not be numbers.** Clause migration
inside a five-year world touches four thousand paragraphs of someone's lore with no
"disable the module and play anyway" escape; versioned vocabularies, declared migrations with
dry-run diffs and inert-with-a-marker degradation make an upgrade *inspectable*, not safe — **no
good answer exists.** The hosting tail: a GM who paid €30 in 2027 and reads her codex in 2037
costs us money forever; BYO bucket and the Cold Shelf help, nothing fixes it. And the thumbnail: a
knowledge graph does not photograph; the Wissenskarte and the merge blocker are the best answers
available and neither is a TaleSpire diorama.

---

## 9. Creative extensions — three things the thesis makes possible that nobody asked for

### 9.1 Der Schattenabsatz — the same passage, differently worded, per reader

Because a passage has a stable identity *and* the projection is per-character, one paragraph can
have more than one **wording**.

```text
PassageVariant (pid, audience_character_id, content, authored_revision_id)
```

The party's copy of `p_4f9c` reads *"Das Siegel ist eine Fälschung."*
Sera's copy of the **same passage** reads *"Das Siegel, das deine Mutter gefälscht hat."*
Same id, same lineage, same clause, same backlinks, same map region — two texts.

This is unreliable narration **at the sentence level**, and it is what mystery, horror and
intrigue GMs have been faking with private Discord DMs since Discord existed. It costs one table
and one branch inside `visible_passages`, and it is structurally impossible in every product that
stores a page as one string. It also gives the Kanon-Divergenz view something genuinely new to
render: not *what they believed and when*, but *what they were told it said.*

Guardrail, because this is a loaded weapon: a variant is **visible in the GM's Erfasst lens as a
variant**, counted in the Session Diff, and excluded from Publication unless explicitly selected —
so it can never become an accidental permanent falsification of the GM's own canon.

### 9.2 Die Fassung — your campaign as a critical edition

A critical edition of an ancient text prints the text, and in the margin prints the *apparatus*:
which manuscript says what, and who disagrees. **A five-year campaign produces exactly that data
without anyone intending to**, and no other product can see it.

In the margin rail, beside each paragraph, optional and GM-only:

> *⁴ Sera hält Fassung 3 (Sitzung 14, Bruder Alder) · Brannt hält Fassung 1 (Sitzung 6, Lady
> Ilva) · widerspricht `[[Das Vharon-Ledger]]` seit Sitzung 19 · niemand hält den zweiten Satz*

Three things collapse into one component: the champion's Contradiction Engine (a ranked GM-only
panel of the campaign's live lies, computed as pure joins over Revelations — no AI, no scoring),
the Herkunftsverlauf of a number, and the *Erfasst* lens. All three become **marginalia beside the
sentence that causes them**, which is where a GM is already looking during prep. Opened in the
twenty minutes before 21:00, it hands her tonight's material out of what her own table did.

This is the single most on-thesis idea in the candidate: *the campaign is a manuscript with a
transmission history, and we are the first product that can print the apparatus.*

### 9.3 Die gedruckte Chronik — the object a player keeps after the group breaks up

The champion's N7 (each character's personal history of learning, in the order *they* learned it)
is a screen. Under a thesis whose home ground is typography, it should be **a book**.

At any point — campaign end, a player leaving, a birthday — the GM (or the player, from her own
projection, which is the point) exports a **typeset PDF/EPUB**: real German hyphenation under
`lang="de"`, running heads with session numbers, drop caps at each chapter, an index generated
from the link graph, illustrations from the campaign's asset ledger with attribution, and a
**colophon** listing every session, every source and every person who told her something. Built by
the same builder as the `.chronicle` static-site export — **one code path, three destinations**
(Publication, static export, print).

Three players get three genuinely different books of the same campaign, and each one is *only*
what that character earned. It is the highest-value marketing artifact available to a product that
otherwise photographs badly (§8.10), it is a gift, and it is the most literal possible expression
of the thesis: **the document is the product, and at the end you can hold it.**

---

*Candidate A, round 2. The bet, unhedged: **buy the cursor, and the paragraph becomes the atom
that carries permission, provenance, mechanics, history — and now lineage.** The item that went
two rounds unpriced now costs 116 lines, 0.087 ms and five to six weeks, with the four decisions
the spike forced written down and the two it could not reach named on the visible surface. What
this candidate still cannot do is play a game at 21:00 with a map, and it will not pretend it
can.*

> *Der Griffel schreibt, der Rand erinnert,*
> *und wer die Zeile teilt, verliert sie nicht.*
> *Doch wer nur schreibt, sitzt spät am Tisch —*
> *und Runde drei bringt Würfel, oder nichts.*
