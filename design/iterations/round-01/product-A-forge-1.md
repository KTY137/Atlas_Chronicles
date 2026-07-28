# The Living Codex — Product Candidate A, Round 1

Forged by Pythia, 2026-07-27. Iteration round 1, candidate A.
Rival this round: **The Table Engine** (candidate B, table-first).
Binding inputs: [`00-intake.md`](../../00-intake.md) · [`01-attack-plan.md`](../../01-attack-plan.md) ·
[`02-domain-model.md`](../../02-domain-model.md) · [`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) ·
`research/RB-01-*`, `RB-02`, `RB-04`, `RB-05`, `RB-07`–`RB-10`.

---

## 1. The thesis

> **The world is the product. A session is a write to the world.**

Everything else follows. A GM does not buy a tabletop; a GM buys the only artifact of this hobby
that survives a group breaking up, a system change, and a decade: the interlinked world in their
head, currently rotting in a Google Doc. We build the place that world lives, and we make **play
the mechanism by which it grows** — not a separate activity that happens next to it.

**What this optimises for:** the fifth year. Accumulated, interlinked, permission-scoped canon;
reuse across campaigns and groups; a between-session loop that no competitor has; a knowledge
graph that carries *mechanical* weight, so lore is not decoration.

**At the cost of:** minute one. A GM with an empty codex and a session in twenty minutes is served
worse by us than by Owlbear Rodeo, and we will not pretend otherwise (RB-01-owlbear: ~20 min to a
running table, players join account-free in seconds — the acknowledged market benchmark). Our
value curve starts lower and crosses theirs somewhere around session four. That crossing point is
the whole bet, and section 8 treats it as the primary weakness rather than hiding it.

We also pay in **tactical ceiling**. Foundry's walls/vision/lighting/regions/elevation stack is a
decade deep (RB-01-foundry; RB-05 §Foundry). We do not out-build it in round 1 and we do not
claim to. We attach a competent table to an incomparable world, not the reverse.

---

## 2. The flex: **press R**

One keystroke. Here is the scene, exactly as it happens on a friend's kitchen table.

The GM has the *Iron Vault* article open. It is an ordinary-looking encyclopedia page — infobox,
prose, blue links to House Vharon and the Ledger, one red link she has not written yet. She puts
the cursor in the third paragraph:

> *The vault's true contents are the Vharon ledgers. Anyone who has read them argues about House
> Vharon's money with unearned confidence.* **`+2 Insight · subject: House Vharon finances`**

She presses **`R`**.

Three things happen in the same 300 ms, on three different screens:

1. **On the shared stage**, the paragraph arrives as a handout — typeset in the campaign's skin,
   announced in the session log with a timestamp.
2. **In each player's own encyclopedia**, that paragraph appears — permanently, stamped *learned
   in Session 14*. Not unlocked. It was structurally absent from every response they had ever
   received for that article, and now it is present.
3. **On every player's character sheet**, a new modifier is live. Not typed in by the GM. The
   clause was attached to the sentence.

Ninety seconds later a player rolls Insight against a Vharon banker and asks why the number is
19. The GM taps the result. The derivation opens:

```
Insight  19
  d20              14
  Wits             +3   Kael · Wits 3
  Trained          +2   Kael · Insight (trained)
  Vault knowledge  +2   ← Iron Vault §3, learned Session 14, 21:47
```

The friend leans in and says: *wait — the plus two is a link?*

Then the GM does the thing that ends the conversation. She opens the same *Iron Vault* article in
**Reader's Cut** and flips the audience: **as GM → as Kael → as the table**. Three genuinely
different articles. Not redaction bars. Different length, different paragraphs, different links —
Kael's version has a blue link where the GM's has a secret, and the table's version has neither.
They were never authored separately. There is one article, and the server renders the reader.

**That is the product's reason to exist:** the encyclopedia is not a place you keep notes about the
game. It *is* the game's memory, it has a mechanical body, and every person at the table is reading
a different book.

Nobody in the field does any part of this. Foundry journals are documents with a show-to-players
button (RB-01-foundry: no wiki or quest tracker in core — modules). Roll20 has journals and
handouts and no cross-linking (RB-01-roll20). Alchemy has "universes" as lore containers with no
mechanical or per-reader dimension (RB-01-alchemy). Owlbear and TaleSpire have nothing at all and
say so (RB-01-owlbear: no journals natively; RB-01-talespire: prep tools "essentially absent").

---

## 3. How the two halves fuse: the Canon Ledger

The fusion is not a link between two apps. It is one substrate with two faces.

### The mechanism, precisely

**Knowledge is decomposed to the passage, not the page.** An `Article` is a container with a type
and an infobox schema. Its body is an ordered list of `Passage` blocks. The passage — not the
article — is the unit of everything that matters:

| Passage carries | Meaning |
|---|---|
| `content` | the block itself (prose, table, statblock, image, embedded query) |
| `visibility` | `gm_only` · `revealed` · `public` — the default state, not the truth |
| `clause?` | an optional **declarative** mechanical statement drawn from the rule package's clause vocabulary. Never code. Versioned with the package. |
| `provenance` | authored / imported / derived-from-play / AI-drafted (RB-04 ledger fields apply) |
| `belief?` | attributed source + confidence — see §9.2 |

**Revelation is an Action, and Actions are the table's verb.** The triumph direction already makes
`Action` a primitive with preview → trace → commit → undo
([`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) §Universal primitives). `reveal`
joins `roll`, `equip`, `move` and `compare` as a peer. It is committed, audited, undoable, and
**server-authoritative**: an unrevealed passage is omitted from the response body, never hidden in
the client (invariant 1).

```
Revelation(passage, audience, session, actor, at)
   audience ∈ { public | campaign | membership | character }
```

Revelation is append-only. It is the join table between the two halves — literally the row where
"something happened at the table" and "something is now known in the world" are the same fact.

**Play → knowledge (the write path).** Every table event that could change what is known emits or
proposes a revelation:

- GM presses `R` on a passage → explicit revelation, instant.
- A player succeeds on a check the GM staged against a passage → the passage's revelation fires
  automatically, with the roll as its citation.
- A token enters a region tagged with an article → the region's staged passages are offered to the
  GM in the Session Shelf as one-key reveals (concept borrowed from Foundry's V14 Scene Regions
  with attachable Behaviors — RB-01-foundry §What to steal 3 — but pointed at knowledge rather
  than at rules).
- Combat, `defeat_pending` resolution, item transfer and scene changes append to the action log
  with entity links.

**Knowledge → play (the read path).** A revealed clause is *live*. The set of clauses active on a
character is a function of what that character knows. Knowing is mechanically real. Every derived
number's trace (invariant 6) can therefore cite a *sentence*, not just a stat.

**The post-session loop: the Canon Diff.** When the session ends, the GM opens one screen. It is a
diff of the world:

- **Committed** — the 6 revelations that fired, already in the codex, already in players' books.
- **Proposed** — derived, never auto-applied (invariant 5 in spirit, and GM authority in fact):
  *"`Iron Vault` · status: Sealed → Breached — source: Kael, Force 18 vs DC 15, 21:41"*;
  *"new stub `Vharon Ledger` — 4 mentions in session chat, 0 articles"*;
  *"`Brenn` relationship → `Ossa`: no longer `neutral`? — 3 assists this session"*.
- **Unanswered** — red links created during play, questions players asked that got no article.

The GM accepts, edits, or rejects. Accepted proposals become passage revisions **stamped with the
session number**, which makes "the world as the table knew it in session 3" a real query rather
than a UI trick.

### Worked example — Session 14, "The Iron Vault"

Party: **Kael** (Vharon-blooded duelist), **Ossa** (archivist), **Brenn** (sellsword).
Prep time before the session: eleven minutes, all of it in the codex.

| Time | At the table | In the codex |
|---|---|---|
| 20:04 | GM opens the **Docket** — the Session zone's pre-play face. It lists 9 passages she staged for tonight, grouped by the article they belong to, each with a hotkey. | Nothing yet. Staging is not revelation. |
| 20:31 | Ossa asks the innkeeper about the vault. GM presses `R` on *Iron Vault §1*. | §1 lands on the stage as a handout **and** in all three players' books, stamped S14. |
| 20:38 | Kael says "my family built that thing." GM Alt-clicks the House Vharon link → the article opens in the Lens **as Kael sees it**, so she can answer without spoiling. | Read-only projection. No write. |
| 21:02 | Ossa rolls Research 21 against a check the GM staged on *Iron Vault §2* (the lock's maker). | Auto-revelation fires, **scoped to Ossa only**. Kael's book does not change. The citation on the passage is the roll. |
| 21:14 | Ossa tells the party. GM presses `R` again with audience = campaign. | Same passage, second revelation row, wider audience. The passage now shows two provenance stamps: *known by Ossa 21:02 · told to party 21:14*. This distinction is invisible in every other product on earth. |
| 21:41 | Brenn forces the door. Force 18 vs 15. | Action log entry linked to `Iron Vault`. Nothing written to canon yet — proposals wait for the diff. |
| 21:47 | The ledgers. GM presses `R` on §3 — **the flex paragraph**, carrying `+2 Insight · House Vharon finances`. | Handout + three books + three sheets. The clause is now active for all three PCs because all three read the ledger. |
| 22:20 | Kael rolls Insight 19 against the banker; the trace cites *Iron Vault §3*. | — |
| 22:58 | Session ends. Canon Diff: 4 committed revelations, 3 proposals (vault status, a new `Vharon Ledger` stub, one relationship change), 2 unanswered red links. GM accepts 2, edits 1, rejects the relationship guess. | The world is 3 passages richer, and every one of them cites the moment it was earned. |
| Wednesday | Ossa, on a phone, reads her own encyclopedia. It has a **"since last session"** feed. She writes a theory into it: *"the maker's mark matches the Kepler foundry."* | A player-authored passage, scoped to Ossa, flagged to the GM's theory feed. The GM now knows what her table believes — before session 15. See §9.1. |

Total GM work outside the eleven minutes of prep: **nine keystrokes and one diff review**. That is
the GM-workload axis (attack plan axis 1) attacked from the knowledge side, which is where the
prep hours actually live and which every map-first competitor leaves untouched.

---

## 4. The six zones under this thesis

The six-zone shell from [`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) survives
intact — it is a good shell and re-forging it would be novelty for its own sake. What changes is
the **centre of gravity** and two structural additions I demand (§4.7).

### 4.1 Story → **the Codex** (the home zone)

Story is no longer "linked notes"; it is the product's front door and default landing. It becomes
a real encyclopedia:

- **Articles typed by schema** — Place, Faction, Person, Event, Item, Concept, Session. Types are
  declared by the rule/world package and carry infobox schemas, so an infobox is a typed record,
  not a hand-built table. This is Fandom's portable-infobox idea done as data.
- **Passage-level everything** — visibility, revelation, clause, provenance, revision.
- **Wikilinks, backlinks and red links as first-class citizens.** A red link is a *product feature*:
  it is a question the world has not answered, it appears in the Canon Diff, and it is the cheapest
  possible prep prompt.
- **Reader's Cut switcher** — view as GM / as any character / as the table / *as of session N*.
  Both axes together: "what did Kael believe in session 3?"
- **Embedded queries** — `all Places in the Vharon Reach with status ≠ ruined` as a passage. The
  wiki is queryable; category pages maintain themselves.

### 4.2 Session → **the Docket and the Diff**

Session is the *bridge zone*, and it has two faces that the shell already supports (quiet during
prep, loud during play):

- **Before:** the Docket — passages staged for tonight with hotkeys, open questions, red links,
  the recap of last time projected per player.
- **During:** the reveal rail. One list, keyboard-driven, every entry one keypress from the table.
- **After:** the Canon Diff. This screen is the product's heartbeat and should be the most
  polished single surface we ship.

### 4.3 Cast → **articles that can be rolled**

An Actor is an Article with a rule-data body. PC, NPC, faction and vehicle share the passage
substrate, so an NPC's secret motivation is a `gm_only` passage on their own page and becomes
known the same way anything else becomes known. Relationships are the codex link graph filtered to
entity types — the "faction map" is a view over backlinks, not a second data model.

### 4.4 Library → **the shelf and the ledger**

Collections of templates, instances, handouts, media. Item **template** is an Article; item
**instance** is an instantiation with its own passage stream for what *this* sword has done
(invariant 3 gets a narrative dividend: a template edit never mutates the instance's history).
The asset provenance ledger (RB-04: SPDX id, author, source, checksum, `derived_from`) lives here
and is visible, because a world you intend to publish (§9.3) needs clean rights.

### 4.5 Table → **the exercise chamber**

Unchanged in architecture: one Scene, three render recipes (Cinematic / Tactical / Outline), DOM
authoritative, Pixi behind `MapRenderer`, WebGL2 baseline (RB-02). What changes under this thesis:

- **Every placeable has a codex spine.** Select a token → the Lens shows its article. Select a
  region → the Lens shows the article and the staged passages.
- **A Scene is an article about a place** with a map attached, not a map with a name.
- **Reveal is the same verb on the map.** Uncovering fog and revealing a passage are two audiences
  of one action, and both land in the session log.
- **Map ambition is deliberately staged.** We take RB-05's weeks-scale wins that also serve the
  codex — UVTT/`.dd2vtt` lossless import (item 4: walls arrive for free; no VTT does this well
  natively), tiled/streamed loading (item 2), the scene budget lint (item 10b), touch (item 11) —
  and we defer the L-scale bets (WebGPU-first renderer, elevation, sprite-atlas rendering, WFC) to
  after the codex is real. RB-05's own sequencing agrees on WFC: generation must land *after* the
  wall/scene model is stable. Under this candidate WFC is round-3 work, and I say so rather than
  promising K5(d) in the launch slice.

### 4.6 Forge → **the vocabulary**

The visual rule-builder (K2) has a second job under this thesis: it defines the **clause
vocabulary** that passages may carry. Honest sequencing, per intake tension 2 (no fake builder
before the engine contract exists):

1. **Engine first** — declarative schema + AST formula language + trace. Slice 1 hard-codes one
   clause shape (§7).
2. **Schema forms** — article types, infobox fields, entity fields. GUI.
3. **Layout editor** — sheets and article templates.
4. **Clause/formula graph** with live trace preview — the crescendo, and the place where "lore with
   mechanical weight" becomes user-authorable rather than ours to hand out.

Theme Studio (K1) also lives here. Under this thesis theming has an extra target: **article
typography**. A codex read on a phone on Tuesday is a *reading* product, so the theme manifest's
type scale, measure and contrast pairs matter more than its ornaments. Skins ship with an editorial
mode; automated contrast validation is a CI gate from slice 1 (attack plan, Akt I).

### 4.7 Where I demand the shell change

Two additions, both forced by the thesis:

**(a) The Codex is an overlay, not only a zone.** Under a wiki-first product, knowledge lookup
during play must not cost a zone switch. `Ctrl+K` opens a codex palette over any zone — search,
jump, preview, and **reveal from the palette without leaving the Table**. The Story zone remains
the place you *author*; the overlay is the place you *consult*. Without this the thesis dies in
practice: a GM mid-combat will not navigate away, so she will keep her notes in a second window,
and we will have built Foundry's journal with better typography.

**(b) The Context Lens gets a permanent `Knows` tab.** For any selected object: who at this table
knows what about it, when they learned it, and from which roll or reveal. This is the inspector
for differential knowledge, and it is the GM's only defence against the cognitive load of running
a table where three people have three different truths. The triumph doc warns the Lens must not
become a junk drawer — `Knows` earns its slot because it is the one question this product exists
to answer.

**One divergence from the adopted direction, stated plainly.** The triumph doc and
[`02-domain-model.md`](../../02-domain-model.md) both defer the Universe layer until a second
campaign needs it. I keep the deferral of **the word** (onboarding never says "Universe") and
reject the deferral of **the layer**: from the very first article, every passage is stamped
`World` or `Campaign` with a visible two-state badge and a one-click move between them.
Retrofitting scope onto a year of unscoped notes is the migration from hell, and under a
wiki-first thesis it is the migration we would certainly face.

---

## 5. The differentiation ledger

Every "we can" is a claim the research supports; every "they still win" is a real loss.

### Foundry VTT

**We do what they cannot.** A scoped knowledge graph instead of documents — Foundry has *no wiki
and no quest tracker in core*; both are module territory (RB-01-foundry). Per-reader article
projection: Foundry's journal permissions are per-*page*, so differential knowledge means
maintaining parallel pages by hand. Lore with mechanical weight: Active Effects attach to actors
and items, never to a sentence a character read. And structurally: our packages are declarative
and versioned, so we are immune to the failure mode that defines their ecosystem — one month after
V14, only **1,590 of 5,338 modules** were compatible, and the median user runs 19 modules
(RB-01-foundry). No-code system authoring: theirs is JavaScript + Handlebars officially, with a
community module as the only no-code path.

**They still win.** Dynamic lighting, walls, vision, Scene Regions with Behaviors, Scene Levels /
elevation core since v14 — best-in-class and years ahead (RB-01-foundry; RB-05 items 5, 6). 475
game systems, 5,338 modules. $50 once, unlimited players — a brutal price anchor. Total data
ownership through file-based worlds. **For a table that wants deep tactical D&D tonight, Foundry
is the correct purchase and will remain so through our first two years.**

### Roll20

**We do what they cannot.** Any cross-linking at all — no wiki-grade linking, prep tooling widely
seen as basic (RB-01-roll20). Data portability: they have **no campaign export**, character
transfer requires a subscription and is reported to fail, and devs have declined custom-content
export. Our whole thesis is a durable artifact, so lossless export is existential for us and
merely inconvenient for them. Also: theming (they have none) and accessibility (documented
screen-reader hostility, no public conformance statement).

**They still win.** ~10M registered accounts and the LFG directory — a genuine network effect we
cannot buy. The licensed compendium catalog plus the Demiplane integration (PF2e, CoC, VtM 5e,
Cyberpunk RED…). Zero-install reach and a genuinely playable free tier. Jumpgate's lighting
diagnostics are better than anything we will ship in year one.

### Fantasy Grounds

**We do what they cannot.** Browser play at all — desktop-only Unity client (RB-01-fantasy-grounds).
Custom systems without XML/Lua in Notepad++. Any accessibility story whatsoever (they market none).
And critically for this thesis: their reference manuals are **purchased hyperlinked modules** — a
publisher's book rendered in-client. Ours is *the GM's own world*, growing from play, forkable and
publishable by the GM.

**They still win — and this is the closest call in the ledger.** Their "export anything you build
into a shareable, sellable, auto-updating module" loop is the nearest existing thing to my §9.3
idea, and it is *shipped*, with the Forge distributing it and auto-update delivering it. Their
native per-ruleset automation depth ("as a DM you spend pretty much no time on math") beats what
our engine will do for years. ~3,858 store products across 50+ officially licensed systems. And
since November 2025 the client is **free** — the price objection we would have exploited is gone.

### Owlbear Rodeo

**We do what they cannot — by their own policy.** No character sheets, no rules layer, no system
support, no campaign management; their two-person team has stated they will not become a campaign
manager (RB-01-owlbear). Every prep artifact is a third-party extension with its own Patreon. No
self-hosting for 2.x, weak export evidence. No theming.

**They still win, and it hurts.** Onboarding is the market benchmark and we are structurally
slower. Their Warp Core renderer loaded a **137-megapixel map on an iPhone 14 Pro Max**, which is
better than anything in the field (RB-01-owlbear; RB-05 §Owlbear — "the renderer to actually
respect"). Forecast — one-click CV auto-fog of an uploaded map — is the single biggest prep-minute
killer anyone has shipped. Their canvas keyboard/screen-reader work (2.1) is the only real a11y
effort in the market. **For a one-shot on Saturday, Owlbear beats us and is free.**

### Alchemy RPG

**We do what they cannot.** Self-hosting, an API, an extension model, real portability — they have
hosted-only SaaS with JSON character export as the ceiling (RB-01-alchemy). Their "universes" are
lore containers with no per-reader projection and no mechanical coupling. Accessibility: motion-first
presentation with reported readability problems and no published commitments — while our contrast
and reduced-motion guarantees are architectural (invariant 8). Homebrew is second-class there;
homebrew is our entire customer.

**They still win.** Best-looking product in the category; scene-as-mood-object; built-in A/V; a
native Streamer Mode reviewers call unique. And **their Sheet Builder is a shipped, block-based,
explicitly no-code GUI in open beta** — they beat us to market on the first half of K2 and proved
the appetite. We must ship *deeper* (versioned packages, formula trace, clauses), not merely
prettier.

### TaleSpire

**We do what they cannot.** No character sheets, no rules engine after ~5 years of Early Access,
both deferred past 1.0. Zero theming — the fixed aesthetic is the identity, by design. No
accessibility, English only, desktop-only. Prep tools essentially absent (RB-01-talespire).

**They still win.** Visual desire, at 90% positive across 4,300+ Steam reviews — proof that beauty
sells this category, and the bar our K3 claim gets measured against. Their **slab** export
(a whole diorama as a pasteable text string, indexed by community sites) is a better UGC exchange
than anything I propose for scenes, and I would steal it outright. Their seats model — GM pays,
guests do almost everything free, reusable forever — sets a generosity expectation we must match.

### The honest summary line

For a table that wants to play a licensed system tonight with bought content and good lighting,
**all six beat us, and three of them are free**. We win the table that intends to still be playing
in this world in 2031. That is a smaller market on day one and a stickier one forever, and a
candidate that claims otherwise is lying.

---

## 6. The data shape

[`02-domain-model.md`](../../02-domain-model.md) survives — role-not-entity, AuthSession ≠
GameSession, Actor as base, CharacterController as its own table, scoped knowledge with
`parent_entry_id`. Seven changes, one of them load-bearing.

**6.1 `KnowledgeEntry` splits into `Article` + `Passage`. (Load-bearing.)**

```
Article  (id, universe_id?, campaign_id?, parent_article_id?, article_type,
          title, slug, infobox_schema_ref, canon_status, created_by_user_id)
Passage  (id, article_id, ordinal, kind, content, visibility,
          clause_ref?, belief_ref?, provenance, created_by_user_id)
```

The article is a container; **the passage is the unit of visibility, revelation, provenance,
revision and mechanical clause**. Everything in §2 and §3 is downstream of this one decision, and
it is the change that cannot be retrofitted — splitting a year of markdown blobs into addressable
blocks with per-block ACLs is not a migration anyone survives.

**6.2 New: `Revelation` — the join between the halves.**

```
Revelation (id, passage_id, audience_kind, audience_id, session_id,
            revealed_by_user_id, revealed_at, source_action_id?, retracted_at?)
audience_kind ∈ { public, campaign, membership, character }
```

Append-only; retraction is a row, never a delete (a player cannot un-know, but a GM can mark a
reveal as mistaken and the history must show both). `source_action_id` is what makes a passage
citable back to the roll that earned it.

**6.3 New: `PassageRevision`, stamped by session.**

`(passage_id, revision_no, content, clause_ref, session_id?, authored_at, author)`. This gives
"the world as of session N" as a query, replaces most of the value of the deferred `Timeline`
table, and makes the Canon Diff a first-class object rather than a UI artifact. **I endorse
Apollon's mēden agan ruling: `Timelines` stays a nullable column, not a table.** Session-stamped
revisions are 80% of the value at 5% of the query cost.

**6.4 `Passage.clause_ref` — declarative, versioned, never code.**

A clause references the active rule package's clause vocabulary (`{type, target, value, scope,
condition?}`), carries `package_id` + `package_version` + `schema_type` + `document_version` +
`validation_status` exactly as the pack's contract requires, and is executed by the engine, never
evaluated as script (invariant 2). **A clause is active for a character iff that character has a
live revelation for its passage.** That single sentence is the fusion, expressed as a constraint.

**6.5 `Quests` and `Locations` dissolve into article types.**

They were tables in the round-0 proposal; under this thesis they are `article_type` values with
infobox schemas and type-specific views. Fewer tables, one substrate, and a GM can invent
`article_type: Heresy` without schema surgery. `Actors` keep their own table (rule_data, HP,
tokens, initiative — genuinely different lifecycle) but gain a mandatory `article_id`: **every
actor has a codex spine.**

**6.6 Character portability — the open question, answered.**

02-domain-model leaves it open. Under this thesis it must be answered "yes": a world outlives its
campaigns, so `Character` gains a universe-level identity and joins a campaign through an explicit
`CampaignRoster` row. A returning hero is the same character with a second roster row and a
different revelation set per campaign.

**6.7 The permission matrix becomes three-dimensional — and gets one door.**

Universe role × campaign role × **revelation**. This is strictly worse than the two-dimensional
matrix Athena was already told to treat as a first-class threat surface, and I am not going to
pretend the third axis is free (§8.2). The architectural answer is a **single choke point**:

```
visible_passages(viewer, scope, at_time) -> Passage[]
```

Every read path goes through it — article render, search, search *snippets*, backlinks,
"mentioned in", `[[` autocomplete, embedded queries, export, realtime deltas, AI context
assembly, and error messages. A CI lint fails the build if any query references the `passages`
table outside that function. The exhaustive test matrix (universe role × campaign role ×
audience_kind × at_time, including the observer role) is a **gate**, not a task.

---

## 7. The first slice

One workflow. No map, no dice engine, no combat, no theme editor, no AI, no rule builder, no
Steam. If it cannot be demoed in the 90 seconds of §2, it is not in the slice.

### What ships

**The reveal loop, end to end, in one campaign.**

1. Auth; one campaign; memberships for one GM and two players; server-side permissions with the
   horizontal-escalation tests from Akt I.
2. **Articles and passages.** Create, edit, reorder blocks. `[[wikilink]]` with autocomplete,
   backlinks, red links that create typed stubs. Three article types only: Place, Person, Concept.
3. **Per-passage visibility and the `reveal` Action** — keyboard-driven (`R`), with preview →
   commit → **undo**, audited, appearing live on player screens over the realtime channel.
4. **The player's book.** A player's article view rendered by `visible_passages`. Acceptance test
   inspects the **raw HTTP response body** and asserts unauthorized passage content is absent —
   not hidden, absent.
5. **Reader's Cut switcher** for the GM: as GM / as each player. Plus `as of session N`, backed by
   session-stamped `PassageRevision`.
6. **One clause shape, hard-coded.** `modifier(field, value)` against a character sheet with
   exactly three numeric fields. When a passage carrying it is revealed to a character, the
   modifier goes live, and the field's derivation view cites the passage. *This is the third organ
   of the flex and I refuse to defer it* — the knowledge↔rules coupling is the thing that cannot be
   bolted on later, so it must exist, minimally, from day one.
7. **Session object + Canon Diff v0.** Start/end a session; reveals are stamped; the end-of-session
   screen lists committed revelations, the red links created during play, and a recap field with
   the reveals pre-linked. **No derived proposals in v0** — proposals are slice 2, because a wrong
   proposal is worse than no proposal (§8.5).
8. **Clean skin only**, semantic DOM, full keyboard operation, visible focus, contrast validation
   in CI, NVDA/Firefox and VoiceOver/Safari passes. Accessibility is architecture from slice 1
   (invariant 8), not a later act.
9. **Lossless export** of everything above — articles, passages, revelations, revisions, clauses —
   as a declarative package, with a round-trip import test. Day one, because our thesis asks a GM
   to trust us with five years.

### What is explicitly NOT in slice 1

Maps, tokens, scenes, fog, combat, initiative, `defeat_pending`, dice, item templates/instances,
inventories, the theme editor and skin kits, the visual rule builder, AI adapters, generators,
WFC, Steam packaging, observer/streamer role, mobile layout polish, localisation beyond string
extraction.

That list is longer than the ship list. It should be.

### The acceptance demo (one script, one take)

> GM creates *Iron Vault* with three passages, one of them carrying `+2 Insight`. Adds a player
> character with Insight 3. Starts a session. Presses `R` on §3. On the player's screen the
> paragraph appears and Insight becomes 5, and the derivation cites the passage. GM opens
> Reader's Cut as the other player: the paragraph is not there — and the network tab proves the
> server never sent it. GM ends the session; the Canon Diff shows one committed revelation and one
> red link. GM exports and re-imports the campaign; the demo replays identically.

If that runs green, the thesis is real. If it does not, no amount of map work will save the
candidate.

---

## 8. Weaknesses

### 8.1 Cold start is structurally against us — and it is our primary business risk

Value is proportional to accumulated canon. Night one we show an empty encyclopedia against
Owlbear's running table (~20 minutes, players free and account-free — RB-01-owlbear). Every
purchase decision in this market is made at minute one, and our curve crosses theirs around
session four. Palliatives exist and none of them are a cure: a deterministic **Session Zero
interview** (a question tree, not AI, whose answers become the first ~30 linked passages), import
from Markdown/Obsidian/World Anvil, and shipping one excellent seed world. But the honest shape of
this weakness is: *we are a product you appreciate in retrospect, sold in a market that decides in
foresight.*

### 8.2 Three-dimensional permission with an unbounded read surface

Universe role × campaign role × revelation, and the leak surfaces are the sneaky ones: search
snippets, backlink lists, "mentioned in" counts, `[[` autocomplete suggesting an article title the
player should not know exists, embedded query results, realtime deltas, export dumps, AI context,
404-vs-403 distinctions, and even *article length*. The product's entire promise is differential
knowledge; one leak is not a bug, it is a refutation. The choke-point function (§6.7) and its test
matrix reduce this to a bounded, testable problem — but only reduce it. It never goes away, and
every future feature re-opens it. **Athena should treat §6.7 as the review target, not the schema.**

### 8.3 The hardest problem: versioning clauses inside a five-year world

This is the weakness I do not have a good answer to.

Clauses live inside passages. Passages live inside a GM's world for years. Rule packages version.
When a package upgrades — a clause type is renamed, a field is retyped, a formula's semantics
change — the migration does not touch a config file; it touches **four thousand paragraphs of
someone's lore**. Foundry's ecosystem shows what this looks like from outside: 1,590 of 5,338
modules compatible one month after V14 (RB-01-foundry). We would be inflicting that churn on
*prose*, and there is no equivalent of "disable the module and play anyway" — the sentence is
still on the page, and now it either lies about its mechanical effect or silently does nothing.

Partial answers: clause vocabularies are versioned independently of the package and support
declared migrations with dry-run diffs; a passage records the vocabulary version it was authored
against; unmigratable clauses degrade to *inert with a visible marker* rather than to wrong;
export always includes the vocabulary. None of that makes upgrading a five-year world safe. It
makes it *inspectable*. A GM who upgrades and finds 300 flagged passages will still be furious,
and this is the failure mode most likely to lose us a long-term user at exactly the moment they
are most valuable.

### 8.4 The visibility tax on the GM

Per-passage visibility means somebody decides visibility for every block. No competitor imposes
this chore. Both defaults are bad: default-public leaks the GM's secrets the first time she pastes
raw notes; default-GM-only means the "Fandom" half starts empty and players see a blank
encyclopedia for three sessions, which undercuts the pitch. Article-type defaults plus a bulk
"reveal this whole article" help. But there is a real possibility that GMs simply write everything
in one `gm_only` blob and use us as a prettier Foundry journal — in which case we shipped
complexity nobody used.

### 8.5 The Canon Diff can be confidently wrong

Derived proposals read an action log that does not know about bluffs, retcons, jokes and player
lies. "Brenn told the guard he was a Vharon" becomes a proposed canon fact. If the diff is wrong
often enough that GMs stop reading it, the fusion mechanism degrades into "a wiki next to a VTT" —
precisely the thing we said no competitor had fused. This is why slice 1 ships zero proposals: the
diff must earn trust before it is allowed to guess.

### 8.6 A knowledge graph does not photograph

RB-05 documents that map pain is the loudest pain in the market and RB-01-talespire proves visual
desire sells (90% of 4,300+ reviews for a product with no sheets and no rules). Our hero screenshot
is an encyclopedia article. Against TaleSpire dioramas and Alchemy's animated scenes, on a Steam
page (RB-07's software-category penalty) or a subreddit, we lose the thumbnail. The flex of §2 is a
*motion* — three screens changing at once — which means our marketing is a 30-second video, not an
image, and that is a materially harder growth channel.

### 8.7 Lock-in cuts both ways

Five years of world in our schema is our moat *and* the user's hostage. Roll20's most-cited
betrayal is exactly this (no campaign export — RB-01-roll20), and we would be holding something far
more precious than a Roll20 campaign. Lossless export is therefore in slice 1 (§7.9) and is
non-negotiable forever. Note the second edge: an export containing **revelations** is a record of
who knew what and when — a privacy artifact, not just a data dump, and it needs a redaction mode.

### 8.8 Two products' worth of engineering

A wiki-grade knowledge system with per-block ACLs, revisions and a query language is one product.
A realtime permission-aware VTT with maps, fog and combat is another. This candidate needs both,
and RB-09 already scopes the client work for a small team. Candidate B needs only the second.
That is a real cost difference and Hephaistos should price it.

---

## 9. Creative extensions

Three things this thesis makes possible that nobody asked for and nobody has.

### 9.1 The Theory Board — the between-session loop

Every player already has a personal encyclopedia (§2). Let them **write in it**. A player-authored
passage, scoped to that player by default, optionally shared to the party, and — this is the part —
**always visible to the GM in a theory feed**.

Consequences that no competitor can reach:

- The week between sessions becomes engagement. Nobody in this market has a between-session loop;
  D&D Beyond's character page is the closest thing and it is a form, not a place.
- A GM who can read what her table believes on Wednesday can plan Friday against it. Foreshadowing
  stops being a guess. This is the single highest-leverage GM tool I can imagine and it costs us a
  scoped `Passage` and a feed.
- Player theories that turn out right can be **promoted into canon by the GM with one action**, and
  the passage keeps the player's authorship. A player's guess literally becoming part of the world,
  with their name on it, is an emotional payload no VTT has ever delivered.
- It is the answer to §8.4's blank-encyclopedia risk: even an empty world fills up, from the other
  end.

### 9.2 Canon Divergence — rumour as a data type

Passages get an optional `belief`: `{source, confidence}`. A passage is then not "true" but
"asserted by House Vharon, confidence: propaganda". An article renders three ways: **as the GM
knows it · as House Vharon tells it · as the party currently believes**.

- Every campaign runs on misinformation, and no product models it — GMs keep a second, secret
  document of "what the players wrongly think", by hand, forever.
- A clause on a *believed* passage still fires. Kael gets his +2 because he read a ledger that was
  forged. Later, when truth is revealed, the derivation view can show it: **"this +2 came from a
  lie, sessions 14–19."** A mechanical system that can be *wrong on purpose, and prove it later*,
  is a thing tabletop software has never had.
- It is cheap: one nullable ref on Passage and a projection axis the renderer already has.

### 9.3 The World Ships — forkable worlds

A Universe is already a typed, versioned, provenance-tracked artifact with a clean asset ledger
(RB-04). So publish it — not as an adventure you buy, but as **a world you fork**.

- Someone downloads *Aldenfall*, forks it, runs their own campaign; their campaign-local passages
  extend the source without mutating it. The `parent_article_id` shape from
  [`02-domain-model.md`](../../02-domain-model.md) is already exactly this.
- A **canon lineage** view: *"this world is a fork of Aldenfall v3, diverged at 412 passages,
  merged 18 upstream revisions."* Wiki culture's actual magic — shared, forkable, attributed
  knowledge — arrives in a hobby that has never had it. Fandom has the sharing and no play;
  Fantasy Grounds has the modules and no forking (their content is a publisher's, not yours).
- It is Workshop-shaped in exactly the way RB-10 describes for rule packages and themes, which
  makes the K6 distribution fork *easier* under this candidate, not harder — and RB-10's warning
  applies in full: Workshop distribution does not make content trusted, so a forked world imports
  as declarative data with server-side validation and zero code execution (invariant 2).
- Business shape, offered not decided: worlds are free to fork; the *hosting and the table* are
  what anyone pays for. Owlbear's principle — gate quantity, never play features
  (RB-01-owlbear) — plus TaleSpire's seats generosity.

**A note on K6, since this thesis has an opinion.** The codex must be readable on a phone on a
Tuesday, by a player with no account and no install. That makes the **browser build
non-negotiable** and rules out option B (Steam-native only) outright. RB-09's recommendation —
one React/TS + Pixi codebase, browser build plus an Electron shell for Steam — fits this candidate
without compromise: Steam becomes an acquisition channel and a Workshop for forkable worlds
(§9.3), while the world itself lives at a URL. Under a table-first thesis that argument is
weaker; under this one it is decisive.

---

## Appendix — the amendments, answered

| | Kaya's amendment | This candidate's answer |
|---|---|---|
| K1 | Theme templates | Token-first from slice 1, Clean skin only at first. Extra target: **editorial typography**, because a codex is a reading product. Contrast validation is a CI gate. Kits are Forge work in Akt II. |
| K2 | Visual GUI rule-builder | Engine → schema forms → layout → clause/formula graph, in that order (intake tension 2). Slice 1 hard-codes **one** clause shape. The builder's unique second job here: authoring the **clause vocabulary** that lore can carry. |
| K3 | State-of-the-art GUI | The six-zone shell unchanged, plus the codex overlay and the `Knows` lens. Motion carries state: reveal *travels* from passage → stage → player book → sheet, and reduced motion replaces travel with state change. |
| K4 | Differentiation | Bet on axes **1 (GM workload, from the knowledge side)**, **4 (no-code, extended to clauses)**, **5 (accessibility)**, plus the sixth axis 02-domain-model proposed: **the durable world**. Explicitly *not* betting on onboarding speed (axis 2) — Owlbear owns it and this thesis cannot beat it. |
| K5 | Maps, generation, sprites | Staged, honestly: RB-05's weeks-scale wins first (UVTT import, tiling, budget lint, touch); WebGPU/elevation/sprite-atlas as committed architectural bets; **WFC deferred to round 3**, per RB-05's own sequencing. |
| K6 | Distribution fork | Browser non-negotiable (Tuesday phone reading). RB-09's Electron-plus-browser single codebase; Steam as channel + Workshop for forkable worlds; option B rejected. |
| K7 | Game feel through staging | Fully honoured. Art is skin and content; the codex is semantic DOM; the most cinematic moment in the product — a revealed passage arriving on the stage — is a *transition*, not a depicted world. |

---

*Pythia, round 1. The bet is stated without hedging: a world you keep, exercised by a table.
If the attack pass cannot break it on cold start, permission leakage, or clause migration, it has
not attacked hard enough.*
