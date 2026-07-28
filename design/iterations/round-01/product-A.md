# The Living Codex — Product Candidate A, Round 1

Forged by Pythia, 2026-07-27 (**forge 2**). Iteration round 1, candidate A.
Rival this round: **The Table Engine** (candidate B, table-first).

> **Lineage note — read before citing.** Forge 1 of this candidate was written at 02:23, two
> minutes after [`RB-11`](../../research/RB-11-steam-vs-browser-verdict.md) landed at 02:21, and
> therefore absorbed none of RB-11's binding requirements: no priced reachability answer, no
> B1–B8 boundary map, no launch-export commitment, no skin-production budget. RB-11 §"Implications
> for design round 1" ¶3 says a candidate that hand-waves reachability *"should lose on that
> ground alone."* Forge 1 is preserved **verbatim and undeleted** at
> [`product-A-forge-1.md`](product-A-forge-1.md); it is the document judged by
> [`attack-A.md`](attack-A.md), [`features-A.md`](features-A.md) and [`verdict.md`](verdict.md).
> This forge 2 re-argues the same thesis from the sources under RB-11's pinned runtime and adds
> §7 (reachability, priced), §8 (the eight boundaries), and the theme/export/attack-target
> commitments RB-11 demands. Where forge 2 and forge 1 converge, the thesis forced it; where they
> differ, forge 2 is the later document and says so.

Binding inputs: [`00-intake.md`](../../00-intake.md) · [`01-attack-plan.md`](../../01-attack-plan.md) ·
[`02-domain-model.md`](../../02-domain-model.md) · [`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md) ·
[`RB-01-*`](../../research/) teardowns · [`RB-02`](../../research/RB-02-rendering-tech.md) ·
[`RB-04`](../../research/RB-04-asset-licensing.md) · [`RB-05`](../../research/RB-05-competitor-maps.md) ·
[`RB-07`–`RB-11`](../../research/).

---

## 1. The thesis

> **The world is the product. A session is a write to the world.**

A GM does not keep a virtual tabletop for five years. A GM keeps a *world* for five years — and
right now that world lives in a Google Doc, an Obsidian vault, or three notebooks, because
**no VTT models it**. Foundry "worlds" are isolated silos; Roll20 campaigns cannot share a wiki;
Fantasy Grounds shares *purchased* content, not a GM's own (this is not my claim — it is
[`02-domain-model.md`](../../02-domain-model.md) §"The Universe layer", grounded in the RB-01
teardowns). We build the place that world lives, and we make **play the mechanism by which it
grows** — not a second activity happening beside it.

**Optimised for:** the fifth year. Interlinked, permission-scoped, provenance-stamped canon;
reuse across campaigns and groups; a *between-session* loop no competitor has; and a knowledge
graph that carries mechanical weight, so lore is not decoration.

**At the cost of:** minute one, and the tactical ceiling.

- **Minute one.** Owlbear Rodeo is the acknowledged benchmark — ~20 minutes to a running table,
  players join account-free in seconds (RB-01-owlbear §UI, §Threat vs our axes). A wiki-first
  product hands a new GM an *empty encyclopedia*. Our value curve starts lower and crosses
  theirs somewhere around session four. That crossing point is the entire bet, and §9.1 treats it
  as the primary business risk rather than hiding it.
- **The tactical ceiling.** Foundry's stack — six wall types × four perception channels ×
  None/Normal/Limited/Proximity/Reverse-Proximity, directional walls, attenuation,
  `ClockwiseSweepPolygon` LoS, and Scene Levels core since v14 (RB-05 §Foundry) — is a decade
  deep. We do not out-build it in round 1 and we will not claim to. We attach a *competent* table
  to an *incomparable* world, never the reverse.

The rival's bet is the mirror image: the live session is the product, the wiki accretes as
exhaust. If both candidates survive the same attack the round is wasted, so state the fork
sharply: **B optimises the four hours; A optimises the 8,756 hours between them.**

---

## 2. The flex: *"Show me what they know."*

One gesture, one keystroke, and a friend leaning over your shoulder says *wait, what?*

### The scene

Kaya is showing her friend Timo the app at the kitchen table. She has the **House Vharon**
article open — an ordinary-looking encyclopedia page: infobox, prose, blue links to *The Iron
Vault* and *Brother Alder*, one red link she has not written yet. She puts the cursor in the
fourth paragraph:

> *The Ashen Sigil that House Vharon presents at court is a forgery. The original burned with the
> Kestrel Wing in 1194.*

She presses **`R`**.

A small inline chip appears: **`Revealed → Sera (Session 14) · source: Brother Alder`**.

Then she does the thing that makes Timo sit up. She hits **`Ctrl+3`** and the page splits into
three columns — *the same article, three times*:

| Column | What it contains |
|---|---|
| **Canon (GM)** | all nine paragraphs, including the two nobody will ever learn |
| **The Party** | four paragraphs. The forgery paragraph is **not** there — only one character knows it |
| **Sera** | five paragraphs. The forgery paragraph *is* there, stamped *learned Session 14, from Brother Alder* — and one paragraph above it is **struck through**, annotated *believed until Session 19* |

Timo: *"Wait — that's a real wiki. And the players have a different one? Automatically?"*

Kaya clicks the struck-through line. A small panel: **Canon Divergence** — *the party believed
the Sigil was authentic from Session 6 (Lady Vharon's testimony) until Session 19 (the ledger).*
It reads like a Fandom edit history, except it is not an edit history of the *article* — it is an
edit history of **what these five people believed, and when, and who told them.**

Then Kaya scrolls to Sera's character sheet. Her **Insight** has a `+2` on it. She clicks the
number, and the derivation trace does not end at a formula. It ends at a **sentence**:

> `Insight 14 = 12 base + 2` → *"Anyone who has read the Vharon ledgers argues about House Vharon's
> money with unearned confidence."* → *revealed to Sera, Session 14.*

**The flex, named:** *a paragraph a character read is a `+2` on their sheet, and the roll's
derivation cites the sentence.* Knowledge is not decoration next to the mechanics. Knowledge
**is** a mechanic, server-enforced, provenance-stamped, and legible to everyone at the table.

Nobody in the market has any part of this. Foundry journals are documents with a binary
show/hide (RB-01-foundry §GM prep — "no dedicated quest tracker or wiki in core"). Roll20 has
journals and handouts and no cross-linking (RB-01-roll20 §GM prep). Owlbear's journal is a
community extension (RB-01-owlbear §GM prep tools). Alchemy has "universes" and sells
*lore as purchased content* (RB-01-alchemy). None of them models **who knows what**, and none
connects a fact to a number.

---

## 3. How the two halves fuse: the Revelation edge

Not "the wiki and the table are integrated." A mechanism, named, with a schema.

### 3.1 The substrate: Entry → Passage

Every durable object in the product is an **Entry** — an article with a schema, a title, a slug
and an ordered list of **Passages**. A passage is the atomic unit of knowledge: a paragraph, an
infobox row, a statblock line, a table row, a map region annotation. A passage has a **stable id
that survives editing** (§9.5 prices this honestly — it is the hardest editor problem in the
document).

A passage may carry, optionally, exactly one **declarative clause** — a validated structure from
the rule package's vocabulary, never code:

```yaml
passage: p_4f9c
text: "Anyone who has read the Vharon ledgers argues about House Vharon's money
       with unearned confidence."
clause:
  kind: modifier
  target: skill.insight
  value: +2
  scope: { subject: "House Vharon finances" }
```

That clause is inert until someone is *entitled* to it.

### 3.2 The edge: `Revelation`

```text
Revelation(passage_id, revision_id, subject_type, subject_id,
           granted_in_session_id, source_entry_id?, belief, revoked_at?, superseded_by?)
```

- `subject_type ∈ {campaign, character, user}` — the party as a whole, one character, or one
  player out-of-character.
- `revision_id` pins **the version of the passage that was revealed.** A later GM edit does not
  retroactively change what a character learned; it creates a divergence (§10.2).
- `belief ∈ {true, false}` — a character can be entitled to something the GM knows is wrong.
  This one boolean is what makes the product a *story* tool instead of a database.
- `source_entry_id` — *who told them*. Brother Alder. The ledger. A dream.

**One edge does four jobs**, which is the parsimony argument (*mēden agan*):

1. **Permission** — it is the read-authorisation for that passage, enforced server-side
   (invariant 1). Client-side hiding is never the boundary.
2. **Provenance** — it is the "learned in Session 14, from Brother Alder" stamp.
3. **Mechanics** — a clause is live for a character **iff** that character holds a non-revoked
   revelation for its passage. The sheet's `+2` and the wiki's paragraph are the same fact.
4. **History** — the revelation stream *is* the campaign's epistemic timeline, which is why we
   can defer the `Timeline` table entirely (per [`02`](../../02-domain-model.md) §Concerns) and
   still answer *"what did they believe at Session 12?"*

### 3.3 The two directions of flow

**Knowledge → play.** Prep is writing. There is no separate "build the encounter" step: you write
the tavern article, and a `scene` passage inside it *is* the playable scene; you write the
captain, and a `statblock` passage inside her article *is* the token's rule data. The Library is
the compendium is the wiki. This is Foundry's Scene-Regions-with-Behaviors idea (RB-01-foundry
§What to steal #3 — declarative "when X, do Y") generalised from maps to *prose*.

**Play → knowledge.** The wiki grows from **the gestures the GM already makes**, not from a chore:

| GM already does this | Emits |
|---|---|
| shows a handout | `Revelation(campaign, session)` on every passage in it |
| "read this aloud" on a passage | `Revelation(campaign, session, source=this entry)` |
| a successful Lore roll against an entry | proposes revelations for the passages the DC unlocked; GM commits or edits |
| names an unwritten thing in session chat via `[[Kestrel Wing]]` | a **red-link stub** with `first_mentioned_in_session` |

Every one of those is an `AuditEntry` (already first-class and append-only per
[`02`](../../02-domain-model.md) refinement 5), so **undo reverses a revelation the same way it
reverses damage.** This is not AI summarisation. Nothing is inferred. Every growth of the world
is a deliberate, reversible, permission-carrying act.

### 3.4 Worked example — Session 14, "The Iron Vault" (Aldenfall)

1. **Before the session** Kaya writes *House Vharon* (nine passages, two of them the real secret)
   and *Brother Alder* (an NPC article; his statblock is a passage in it). She types
   `[[Kestrel Wing]]`; a red-link stub appears in the Codex with zero content. No prep step
   called "make an encounter" occurs at any point.
2. **19:40** Party joins by link. The Session Docket shows three open threads carried from
   session 13, each a live backlink, not a copied note.
3. **20:15** They interrogate Alder. Sera rolls Insight; the trace resolves against the *current*
   revelations she holds. She succeeds.
4. **20:16** Kaya selects the forgery paragraph, presses `R`, picks **Sera**, and — because Alder
   is the current scene's focused actor — the source defaults to *Brother Alder*. One keystroke,
   one click. In Sera's browser the House Vharon article gains a paragraph; her Insight becomes
   14; the derivation cites the sentence. The other four players see nothing, and their HTTP
   responses **contain no bytes of that paragraph** (§8, B-tests).
5. **20:41** Sera tells the party. Kaya presses `R` again, subject = **party**, source =
   *Sera's report*. Now the party codex has it — sourced to a player character, which is exactly
   how tables actually work and which nothing on the market can represent.
6. **21:30** Combat. `defeat_pending` on Alder's guard; Kaya confirms, or does not (invariant 4).
   The encounter is a state of the scene passage, not a separate silo (per
   [`03`](../../03-triumph-ui-direction.md): "Combat is a contextual Table state").
7. **22:50** Kaya ends the session. The recap is **generated deterministically from the
   revelation stream** — "the party learned 4 things; Sera learned 1 more; 2 red links were
   created" — not from an LLM. Invariant 5 holds by construction: there is no AI in this loop at
   all.
8. **Wednesday, 08:00** Sera reads the party codex on her phone over breakfast and posts a theory
   (§10.1). The world grew between sessions. **That is the loop the rival candidate structurally
   does not have**, and it is also the loop that forces us to pay for hosting (§7).

---

## 4. The six zones under this thesis

The stable six-zone shell of [`03-triumph-ui-direction.md`](../../03-triumph-ui-direction.md)
survives intact — Session · Story · Cast · Library · Table · Forge, with Campaign Context, Module
Rail, Collection Rail, Primary Stage, Context Lens and Session Shelf. My thesis changes what
lives inside them and *which one the product opens into*.

| Zone | Under wiki-first |
|---|---|
| **Story → the Codex** | **The home zone.** The app opens here, not in Session. An article-shaped Primary Stage: infobox, prose, passages, red links, and a permanent **Backlinks** facet in the Context Lens. Every text field in the entire product — including session chat and GM scratch notes — accepts `[[`. |
| **Session → the Docket & the Diff** | A *time-scoped lens over the Codex*, not a dashboard of its own data. Before: the Docket (open threads = backlinks, the prep queue, the next scene). During: the Shelf. After: **the Session Diff** — everything the world learned tonight, as a reviewable changeset the GM can amend before it becomes canon. |
| **Cast → articles that roll** | An actor is an Entry with an `actor` extension. NPC article and statblock are one object; there is no "the wiki page about the captain" *and* "the captain". Player sheets are article layouts driven by a schema. A sheet's derived numbers cite passages (§2). |
| **Library → the shelf** | Typed views over the Codex: templates, instances, inventories, cards, handouts, media, and the **provenance ledger** (RB-04: SPDX id, author, source, checksum, `derived_from` per asset). Item TEMPLATE and item INSTANCE stay rigorously separate (invariant 3) — a template is a universe-scope Entry, an instance is a campaign-scope row that references it and is never mutated by a template edit. |
| **Table → the exercise chamber** | One Scene, three render recipes (Cinematic / Tactical / Outline) exactly as ratified. The shift: **a Scene is a passage inside an article**, so a map has backlinks, a revision history, and revelations of its own — a region annotation can be revealed to one character. Outline is not an accessibility afterthought here; under this thesis it is the *native* representation and Tactical is the specialised one. |
| **Forge → the vocabulary** | Theme Studio + the visual rule-builder + generators + package tests. **The thesis's biggest structural payoff: the wiki-template editor and the character-sheet builder are the same tool**, because a sheet is a page schema. K2 is not a late flagship bolted on; it is the Codex's own type editor, and we cannot ship user-defined article types without it. See §4.1. |

### 4.1 Why K2 arrives *earlier* under this thesis than under the rival's

Intake tension #2 warns: building the rule-builder before the rules engine exists is building a
facade. Correct — and this thesis resolves it rather than deferring it. A wiki-first product needs
**user-defined page types** (a "Faction" article, a "Settlement" article) within the first ninety
days, because otherwise the Codex is one untyped blob. A page type is a schema. A character sheet
is a page type with numbers. So the honest sequencing — engine → schema forms → layout editor →
formula/action editor with live trace — is *pulled by product necessity* instead of being pushed
by ambition. A table-first candidate has no such forcing function and will reach the builder
later, which matters because RB-11 §4 makes the visual rule-builder **the go-to-market**, not a
feature: discovery runs through creators and system authors (Foundry: 475 systems, no store).

### 4.2 Where I demand the shell change — three amendments, justified

1. **Default landing zone is Story, not Session.** The Campaign Gate resolves to the Codex. A
   session is entered *from* the world. This is a one-line routing change and it is the entire
   product philosophy made visible.
2. **The Link Well is shell-wide, not a Story feature.** `[[` autocomplete and red-link creation
   live in the Campaign Context layer and are available in every editable surface. §9.2 names
   this as the product's most dangerous information leak, and it must be designed as a
   permission surface from the first commit, not retrofitted.
3. **The Party Codex is publishable to an anonymous read link.** Not a new role — a
   **scoped read token** that resolves server-side to the campaign's revelation projection. This
   is what makes the between-session loop real for a player who will not install anything, and
   it is the seed of §10.3. It is also, honestly, a new attack surface (§9.2).

Everything else — independent axes (content × skin × role × mode × a11y), 9-slice theme
manifests, DOM-authoritative with Pixi behind `MapRenderer`, the non-goals list — is adopted
unchanged. K7 holds: art is content and skin; no depicted world is welded into the chrome.

---

## 5. The differentiation ledger

A ledger with no losses is a lie. Each entry: what we do that they cannot, and what they still do
better.

### Foundry VTT

**We do, they cannot.** Cross-campaign world reuse — Foundry worlds are silos and its data model
has no layer above a world. Per-character knowledge state. Provenance on facts. First-party
no-code system building (Foundry's official path is JavaScript + Handlebars; the no-code answer
is a *community* module, Custom System Builder, which is sheets-and-formulas, not an
action/automation pipeline — RB-01-foundry §Character sheets). Structural immunity to module
churn: only 1,590 of 5,338 modules were V14-compatible one month after release (Year in Review
2026) — our packages are declarative and cannot break that way. Accessibility: their core has
open issues for high-contrast text (#3574) and an accessibility mode (#3028), patched by
community modules.

**They do better, and it is not close.** The tactical ceiling: walls, vision, lighting, Regions
V2 with attachable Behaviors, Scene Levels, a particle generator API (RB-05 §Foundry). The
ecosystem: 5,338 modules, 475 systems, median user runs 19. Automation depth for 5e/PF2e. The
$50 one-time price anchor. Ten years of community trust. **Any plan of ours that requires beating
Foundry at maps in year one is a fantasy.**

### Roll20

**We do, they cannot.** Data portability at all — there is no campaign export, character transfer
is subscription-gated and reported failing, purchased content is locked to the platform
(RB-01-roll20 §Import/export). Theming (they have none for end users). Accessibility (forum
history describes the app as built "without consideration for the blind and visually impaired";
no public VPAT found). Any wiki-grade cross-linking. A no-code builder — Beacon SDK is aimed at
developers.

**They do better.** Reach: ~10M registered accounts and the LFG directory, a genuine network
effect ("most games are found on Roll20"). The licensed compendium catalog plus Demiplane. A free
tier that is genuinely playable, with 10–15 minutes to a table. Voice/video included. We cannot
buy any of that in v1.

### Fantasy Grounds

**We do, they cannot.** Browser play at all (desktop-only Unity; the Online Reader is
reading-only). Accessibility — there is no documented programme and Unity custom UI is generally
opaque to AT. No-code system building (rulesets are XML + Lua edited in Notepad++; the ceiling is
a *paid third-party* low-code tool, Ruleset Wizard). Theming as end-user joy. A durable world
layer above the campaign.

**They do better.** Native, first-party automation depth per ruleset — "as a DM you spend pretty
much no time on math" — and the largest licensed catalog in the market (~3,858 store products,
50+ systems), **now with a free client since 2025-11-08**. Their buy-a-module-and-run-it prep
economy beats our blank page for anyone playing a supported system. RB-11 flags the honest
caveat: that pivot has eight months of data and no public outcome.

### Owlbear Rodeo

**We do, they cannot.** Everything above the map: sheets, rules, campaign memory, wiki,
compendium — they refuse this by stated philosophy and are a two-person team. Self-hosting (2.x
is closed SaaS; only the deprecated 1.0 is source-available, under a non-commercial licence).
Theming.

**They do better, and we should be scared of it.** Renderer engineering: Warp Core, tiled
streaming, spatial indexing, GPU instancing, GPU dynamic fog with an explicit soft-shadow-vs-
light-count quality switch, a **137-megapixel map on an iPhone 14 Pro Max** (RB-05 §Owlbear). And
onboarding — ~20 minutes, players join account-free in seconds. **We will not match Warp Core in
v1 and we will not match 20 minutes ever.** Their explicit quality switch is the single cleanest
performance UX decision anyone in this market has shipped and we should copy it outright.

### Alchemy RPG

**We do, they cannot.** Self-hosting, export, any API or mod ecosystem (they have none —
JSON character export is the ceiling). Homebrew as a first-class citizen (theirs is
reported "quirky and slower"; System Builder is beta with a "coming soon" help page).
Accessibility — motion-first with reported readability problems, degraded iOS support, no
statement found. Real tactical play — fog of war exists, **dynamic lighting and measurement/AoE
do not**.

**They do better.** Look and feel — consistently ranked the best-looking VTT; scene-as-mood-object
with animated environments and ambience. The licensed content moat: 125+ systems, V5, Call of
Cthulhu, Fallout. Native streamer mode. Integrated A/V. Their block-based Sheet Builder is the
nearest thing on the market to K2 and it is *shipped*; ours must be deeper, not merely prettier.

### TaleSpire

**We do, they cannot.** Sheets and rules — after ~5 years of Early Access both are still
deferred past 1.0. Browser play, tablets, localisation (English only — notable for a German-market
product). Accessibility (3D navigation as the sole modality). Theming — zero, by explicit design
philosophy. Campaign management of any kind.

**They do better.** Visual desire. A coherent, hand-crafted 3D diorama look that photographs
better than anything we will ever ship in 2D, at 90% positive across 4,300+ Steam reviews. The
**slab** economy — a map fragment as a first-class, copy-pasteable, community-indexed object — is
the best UX idea in competitor map building, and we should make our tile/pattern library
slab-shaped. Their seats model set the market's generosity expectation.

### The honest summary line

> We beat every one of them on **the world**, we beat most of them on **accessibility, theming
> and no-code authoring**, we beat none of them on **content catalogue**, we beat none of them on
> **renderer engineering in v1**, and we lose outright to Owlbear on **minute one** and to
> TaleSpire on **the screenshot**.

---

## 6. The data shape

[`02-domain-model.md`](../../02-domain-model.md) is inherited, including all six of Apollon's
refinements. My thesis changes it in four places and answers one open question.

### 6.1 `Entry` is promoted from a table to the substrate

Today `KnowledgeEntry` sits as a sibling of `Actors`, `Quests`, `Locations`, `ItemTemplates`.
Under this thesis that is backwards. **Every durable object gets a mandatory `Entry` row**, and
the domain tables become *extensions keyed by `entry_id`* — precisely the pattern Apollon already
ruled for `CharacterProfile` (refinement 1), applied consistently.

```text
Entry (id, universe_id NOT NULL, campaign_id NULL, parent_entry_id NULL,
       schema_id, slug, title, kind, visibility, canon_status, current_revision_id,
       created_by_user_id)
  ├─ Passage    (id, entry_id, ord, block_type, content, clause NULL, anchor_key)
  ├─ Revision   (id, entry_id, seq, author_user_id, session_id NULL, diff, content_hash)
  └─ extensions, 0..1 each, keyed by entry_id:
       ActorExt · SceneExt · ItemTemplateExt · LocationExt · QuestExt · RulePageExt
```

**Why this is not gratuitous generalisation** — it buys five things at once, each of which the
product needs anyway: one identity for links, **one** backlink index, **one** search index,
**one** permission predicate, **one** revision/diff mechanism (which is also B3's package-diff
substrate and B6's export unit). Refusing it means writing all five, five times.

`Entry.canon_status` becomes a real enum: `canon | rumour | apocryphal | superseded`, with
`superseded_by_entry_id`. `CHECK (universe_id IS NOT NULL)` stands (refinement 3), so the
two-dimensional visibility filter remains one index-friendly predicate.

### 6.2 Three new tables

- **`Link` (source_entry_id, source_passage_id, target_entry_id, target_slug, kind, resolved)** —
  the backlink graph, computed server-side on save. Unresolved rows are red links; a red link is a
  *first-class prep artefact*, not an error.
- **`Revelation`** — §3.2. The single most important table in the product. Indexed on
  `(subject_type, subject_id, passage_id)` and on `(granted_in_session_id)`.
- **`Schema` (id, universe_id NULL, package_id NULL, version, kind, definition)** — page types,
  sheet layouts and rule-package document types are one concept. This is what makes §4.1 true.

### 6.3 Timelines stay deferred — and now we do not need them

[`02`](../../02-domain-model.md) recommends keeping `Campaign.in_world_date` and a nullable
`timeline_id` column while deferring the table. I go further: **the revelation stream answers the
question the Timeline table was for.** "What did the party believe at Session 12" is a query over
`Revelation` filtered by `granted_in_session_id` and `revoked_at`. No branching UI, no
`parent_timeline_id`, no query-cost explosion. *Mēden agan*, and we get the feature anyway.

### 6.4 Character portability — the open question, answered

[`02`](../../02-domain-model.md) leaves open whether a PC can move between campaigns in one
universe. Under this thesis the answer is **yes, and it is free**: an Actor's `Entry` may live at
universe scope with campaign-scoped child entries (`parent_entry_id`) carrying campaign-local
state. A returning hero is one Entry with three children. This is the same additive,
non-destructive shape as universe-vs-campaign knowledge, and it is the same shape as item
template-vs-instance. One pattern, three problems.

### 6.5 What does *not* change

`AuthSession ≠ GameSession`. Roles on memberships, never on users. `Actor` as the aggregate with
`CharacterProfile` as an extension. `CharacterController` pointing at `actor_id`.
`RulePackageInstallation` as its own table. `AuditEntry` campaign-scoped and append-only. The
UI-primitives ↔ persistence-names mapping table owned by Kalliope.

---

## 7. Reachability, priced — the question RB-11 says loses the round

RB-11 §"Implications" ¶3: *answer reachability with a number, not a hope*, and it is charged to
every option identically. Here is the number, the arithmetic behind it, and what a non-technical
GM behind CGNAT actually experiences.

### 7.1 The ruling: **hosted rooms are the default join path in v1**

And this thesis *forces* it, which is a genuine asymmetry with the rival. A table only needs to
exist for four hours on Tuesday; **a wiki must be readable on Wednesday morning from a phone.**
A codex that is only reachable when the GM's laptop is awake is not a codex. The rival candidate
can honestly ship LAN-only. I cannot, and I will not pretend the bill away.

### 7.2 The bill, with the arithmetic shown

All figures are **estimates with the inputs exposed so they can be attacked**; none is a vendor
quote.

**Live session traffic.** A DOM-authoritative, text-heavy product's realtime channel is JSON
deltas: ~30–80 KB per client per hour ⇒ 5 clients × 4 h ≈ **1.0–1.6 MB per session.** Negligible.

**Asset egress dominates, and only on cold cache.** One 4096² tactical scene as a KTX2/WebP tile
pyramid ≈ 12–25 MB; three scenes ≈ 50 MB; five cold clients ≈ 250 MB. With scene reuse across a
campaign and an HTTP cache, steady state ≈ **60–100 MB per session.**

**Unit prices (public list, order-of-magnitude, 2026):** Cloudflare R2 egress €0; Hetzner ≈
€1/TB; AWS S3 ≈ $0.09/GB. Object storage ≈ €0.01–0.02/GB-month.

| Line | Steady state | At Hetzner/R2 class |
|---|---|---|
| Egress per 4-hour session | ~0.1 GB | **≈ €0.0001–0.001** |
| Compute per concurrent room-hour | shared 4 vCPU/16 GB node ≈ €25/mo carrying an est. 40–80 rooms | **≈ €0.001** |
| **Play, all-in** | | **≈ €0.001–0.01 per session-hour** |
| **Storage per campaign** | a five-year codex: ~400 scenes + handouts ≈ 8–20 GB | **≈ €0.10–0.40 / month, forever** |

**The number that matters, and it is uncomfortable.** Play is nearly free; **storage is the bill
and it never stops.** A €30 licence nets ≈ €23.50 through a merchant of record (RB-11). A single
15 GB world at €0.015/GB-month costs ≈ €2.70/year ⇒ **the licence funds roughly 8–9 years of one
world.** A GM with four worlds breaks it inside three years.

**Therefore the v1 policy, stated so it can be checked:** the licence includes a hosted quota —
**5 GB per universe and 2 concurrent rooms** — and overage is sold **at cost**, per GB-month and
per extra room. We follow Owlbear and charge for **storage and rooms, never for features**
(RB-01-owlbear §Platform & pricing; RB-11 Decision 3). Roll20 charges for features and is the
most complained-about product in the market. No player ever pays anything (RB-11's new invariant).

### 7.3 The self-host matrix, honestly — including a finding nobody in the corpus has named

Self-hosting stays real (invariant, and the sovereignty/EU-data audience is ours), but it is
**opt-in for technical GMs**, and here is exactly what each path gives you:

| Path | Works? | The honest caveat |
|---|---|---|
| **Hosted rooms** (default) | Yes, everything | We pay §7.2 |
| **Electron host + Electron players** | Yes, everything, €0 | Everyone installs; loses the click-a-link promise |
| **Electron host + browser players on LAN** | Yes, over plain `http://192.168.x.x` | **See below — this path silently loses capabilities** |
| **Electron host + browser players over the internet** | **Not supported in v1** | CGNAT + no certificate for a LAN IP. Named as deferred, not discovered in month nine |

**The finding.** A LAN IP served over plain HTTP is **not a secure context**; `localhost` is.
Secure-context-only web platform features therefore vanish for LAN browser players:
**service workers (so no offline/asset cache — the exact resilience RB-05 item 12 wants),
WebGPU, and OPFS**, plus the browser's "Not secure" chip. The GM on `localhost` and the Electron
players keep everything; the LAN browser player silently drops to the WebGL2 floor with no cache.
This is not a bug we can fix — it is the platform — and it must be **stated in the product, in
the join dialog**, not buried in docs. I have found no statement of this anywhere in RB-02,
RB-09, RB-10 or RB-11; it is the concrete mechanism behind the mixed-content problem those briefs
flag in the abstract.

### 7.4 What a non-technical GM behind CGNAT experiences

**Nothing.** She never meets CGNAT, because she never hosts. She clicks *Create world*, gets a
hosted room, shares a link, and her players are in — Owlbear's flow, which is the benchmark we are
matching rather than beating (RB-01-owlbear). The desktop client is offered as *"keep a local copy
and play offline / on your own LAN"*, which is what self-hosting actually means to a human.
**The Plex-pattern DNS-zone + per-server-wildcard-certificate service is explicitly deferred and
named as deferred**, with its operating cost written into `OPEN-DECISIONS.md` rather than
arriving by accident. We do not sign up to operate a PKI in v1.

---

## 8. The eight boundaries (B1–B8), and the named attack targets

RB-11: *"A candidate without a `Platform` port, a registry contract, and vendor-on-first-use is
not a candidate — it is a prototype."*

| # | Boundary | This candidate's implementation |
|---|---|---|
| **B1** | `Platform` port | `openFile`/`saveFile`/`pickFolder`/`hostSession`/`discoverLAN`/`openExternal`/`social`, two impls (browser, Electron) from commit 1. Domain code never sees a path or a port. |
| **B2** | Package registry contract | **A package *is* a Codex**: a set of `Schema` rows + `Entry`/`Passage` rows + assets, with our own id scheme, semver, `engine: ">=2.1 <3"`, required/optional deps, content hashing. `.chronicle-pkg` zip first; web registry second; Workshop and mod.io are adapters, never the interface. |
| **B3** | Vendor-on-first-use, content-addressed | Installing a package **merges a copy into the universe**, hashed and pinned. Upgrades are explicit, diffable GM actions — and because a `Revelation` pins `revision_id`, **a package upgrade mid-session cannot change what a character already knows.** That is the wiki-first answer to Nemesis's named target, and it falls out of the substrate rather than being bolted on. |
| **B4** | Entitlement port | One `hasLicence()` seam; adapters: direct key, hosted account, Steam ownership. Never smeared into feature code. |
| **B5** | Session transport port | WebSocket now; relay/WebRTC/SDR later as adapters. No SDR assumption enters domain code (browsers cannot speak it regardless). |
| **B6** | `.chronicle` export round-trips a full campaign, zero Steam | The export unit is the Entry graph plus the revelation stream. Workshop packages stored as `{sourceId, version, sha256}` references, never re-hosted bytes. Ariadne's proof target — and §10.3 makes this a *marketing* asset, not just a compliance one. |
| **B7** | One repo, one build, two artefacts | Web bundle + Electron artefacts from one pipeline. **No SteamPipe/depot step in CI**, at all, until the RB-11 gate passes. |
| **B8** | No desktop-only feature without a designed browser fallback | Governance rule, enforced in review. Note §7.3: the *inverse* also binds us — LAN browser players lose secure-context features, so any feature depending on service workers/WebGPU/OPFS needs a declared degraded path. |

**The five named attack targets, answered:**

1. **GM-machine-as-server trust model.** In v1 the GM's machine is a *host*, never the identity
   authority: authentication, licence and the party-codex share tokens are issued by us; the
   local host validates them. It binds a socket, so it gets authn/authz, session tokens, rate
   limiting, request validation and a patch cadence — Athena's beat, and a CRITICAL from her
   blocks.
2. **No code-execution escape hatch in the package format.** Enumerated closures, not a promise:
   no embedded HTML/JS/Lua; no scripted SVG (SVG re-encoded server-side or rejected); no remote
   fetch from package data; no `url()` to a non-package origin in theme CSS; no iframes; no
   template-expression evaluation; no dynamic asset loading by constructed path. Formulas are an
   **AST over a fixed operator set with no host access**, which is also what makes the visual
   formula editor and its live trace possible at all. RB-11 is explicit that this is a
   *marketable* differentiator against the 2026 Wallpaper Engine wave, the Meccha Chameleon
   Blueprint payload, and TTS's self-replicating Lua.
3. **Browser/desktop parity.** B8 plus §7.3's honest matrix in the join dialog.
4. **Live session's package-version pin.** B3 plus revision-pinned revelations (above).
5. **Full campaign round-trip with zero Steam.** B6, tested in slice 1 (§9 acceptance).

**Theme/skin production budget (RB-11 ¶6, which explicitly charges this to round 1).**
First-party for launch, community-supplied through **our own registry** (B2), Workshop only ever
as a mirror. Under *this* thesis the reading surface is the hot path, so the budget goes to
**typography, measure, and long-form legibility first, ornament second**: **two kits at launch —
`Clean` (the accessible baseline, must be excellent with all art disabled) and one Crafted kit
(`Archive`: editorial, oxblood/charcoal, built for reading)**. `Relic` and `Signal` are
post-launch and commissioned only if licence revenue funds them. Every kit passes automated
contrast validation as a CI gate. Actual commissioning cost is **[needs a quote — I have no
evidence base for illustration pricing and will not invent one]**.

**Launch exports (RB-11 ¶4 makes this a launch requirement, not phase 9).** At launch:
**UVTT/`.dd2vtt` import** (lossless: walls, doors, windows, lights, grid alignment — RB-05 rates
this S–M and notes *no VTT does it well natively*), **UVTT export**, and Foundry/Roll20/FG-shaped
scene export. Plus the two this thesis makes uniquely ours: **Markdown/Obsidian vault import**
(the acquisition wedge — the GMs we want already keep their world there, not in a VTT) and the
**static-site Codex export** of §10.3.

---

## 9. The first slice

This is the section where candidates cheat. Here is the whole of it.

### 9.1 What ships — "The Reveal"

**One workflow, one universe, one campaign, browser only, hosted room, three people.**

A GM writes three linked articles. She opens a session. Two players join by link with a display
name and no account. She reveals one passage to one character. That player's codex changes; the
other player's does not — and cannot, because the bytes never left the server. She undoes it. She
exports the campaign and re-imports it into an empty instance, and it is identical.

Concretely, the slice contains: accounts + campaign + membership + server-side permissions; the
`Entry`/`Passage`/`Revision`/`Link`/`Revelation` tables; a **single-user** rich-text editor with
stable passage anchors and `[[` autocomplete with red links; the article Primary Stage with a
Backlinks lens; a live session with presence and the `R` gesture; the per-subject codex
projection; append-only `AuditEntry` with undo; `.chronicle` export/import; the `Clean` theme
only; the `Platform` port (B1) with both impls even though only one is exercised.

### 9.2 What is explicitly NOT in slice 1

Maps. Tokens. The Tactical recipe. Dice. Combat and `defeat_pending`. Clauses and derived numbers
(the `+2`). Item templates and inventories. The theme editor and the second kit. The visual
rule-builder. Generators, WFC, AI adapters. The Electron shell. UVTT. Universes-as-a-visible-
concept. Collaborative editing. Mobile layouts beyond not-breaking.

**Two of those omissions will be argued with, so I defend them now.** *Dice* — a dice roller is a
two-day feature at any point in the product's life; it proves nothing about the architecture and
its absence makes slice 1 honest about being a knowledge slice. *The `+2`* — clauses are the
flex's second half and it hurts to cut them, but a clause is worthless until the rule engine
exists, and shipping a fake one would be exactly the "facade before the engine" that intake
tension #2 forbids. Slice 2 is the rule-engine core plus clauses; slice 2 is where the flex
becomes whole.

### 9.3 The acceptance demo, and the tests that must be green

One take, no cuts: write three articles with `[[` links → open session → two browsers join by
link → reveal one passage to one character → the other player's screen does not change → open
that player's DevTools network tab **and show the response body contains no bytes of the revealed
passage** → undo → export → import into an empty instance → diff is empty.

Gates, from the first slice, per [`03`](../../03-triumph-ui-direction.md):

- a player's API responses **omit** unauthorised passages — proven by response-body assertions,
  not by UI absence (invariant 1);
- **search, snippets, backlink lists, "mentioned in" counts and `[[` autocomplete** all filter on
  universe × campaign × revelation, each with its own test (§10 weakness 2 is why every one of
  these is enumerated separately);
- horizontal privilege escalation tests: universe `editor` who is a campaign `player` cannot read
  that campaign's GM-only passages;
- export → import → byte-identical diff;
- **axe-core clean in CI**; NVDA/Firefox reads the article, the reveal, and the backlink list;
  keyboard-only completes the whole demo; 200% zoom does not clip.

---

## 10. Weaknesses

Six, honestly. Two of them I do not know how to fully solve.

### 10.1 Cold start is structurally against us — and it is the business risk, not a UX risk

An empty encyclopedia is a worse first ten minutes than any competitor's. Owlbear is playing in
twenty minutes. Our value curve crosses theirs around session four, and **a product whose thesis
requires four sessions of faith before it pays has a conversion problem, not a design problem.**
Mitigations exist (Obsidian/Markdown import, a demo universe, red links as a prep game that makes
the empty state generative) and none of them changes the shape of the curve. This is the reason
to lose the round if there is one.

### 10.2 A three-dimensional permission matrix with an unbounded read surface — **hard**

[`02`](../../02-domain-model.md) already flags universe role × campaign role × entry visibility as
"a genuine escalation path". I add a fourth dimension — per-character revelation — and then
attach it to the friendliest UI in the product. The leak is not the article; it is **every
oracle around it**: `[[` autocomplete revealing that "Ashen Sigil Forgery" exists; a backlink
*count*; "did you mean"; a search result count; a red link turning blue; the party-codex share
token; a 404-vs-403 distinction; an ETag. Each is a separate read path and each needs its own
test. It is hard because it is not one check — it is an invariant across dozens of surfaces, and
**good wiki UX pulls in exactly the wrong direction** (autocomplete wants to be helpful).
Structural mitigation: one server-side projection function that every read path is *forced*
through, with lint that fails the build on a raw `Entry` query outside it. That reduces the
surface; it does not close it.

### 10.3 Stable passage anchors across editing — **hard, and unpriced anywhere in the corpus**

Revelations, links and clauses all anchor to passages. So a passage id must survive a GM
rewriting the paragraph around it, splitting it, merging two, or pasting over the lot. Notion and
Obsidian are years of work at exactly this problem. Get it wrong and revelations orphan silently —
a character quietly loses a fact, or worse, keeps a `+2` whose sentence no longer exists. RB-11's
strongest argument for the DOM runtime is that *no game engine has a rich-text editing control* —
true, and it makes our path possible — but **it does not make the editor free, and I can find
nothing in RB-02, RB-09 or the round-1 lineage that prices it.** Naming it as the largest unpriced
engineering item in this candidate: a ProseMirror/Tiptap-class editor with stable block identity,
plus (later) collaborative editing, is a multi-month workstream in its own right.

### 10.4 The visibility tax: the GM will forget to press `R`

If revealing is a chore, it will be skipped in the heat of play, the party codex drifts from
reality, and a *wrong* wiki is worse than no wiki because players will trust it. The mitigation is
architectural — reveals ride on gestures the GM already makes (§3.3) rather than existing as a
separate step, and the post-session **Session Diff** is a review surface that catches misses. But
it remains a behavioural bet on a human being at 23:00.

### 10.5 The Canon Diff can be confidently wrong

Provenance stamps make the party codex look authoritative. Two failure modes: a GM reveals the
wrong passage and the product renders the error with full ceremony; and a table that plays
loosely — where half of what players "know" was said aloud and never written — will find the
codex systematically *under*-reports, which erodes trust faster than an empty page would.

### 10.6 A knowledge graph does not photograph

K3 asks for a UI that photographs well; TaleSpire owns that mindshare with 3D dioramas at 90%
positive across 4,300+ reviews. Our flex is a *three-column diff of who knows what* — it is
astonishing in a 40-second demo video and mediocre as a single screenshot. Since RB-11 puts
discovery on creators and system authors rather than a storefront's visual machine, this hurts us
less than it would on Steam — but it is a real cost of choosing knowledge over spectacle, and it
means our marketing asset is a **recording**, not a still.

---

## 11. Creative extensions

Three things this thesis makes possible that nobody asked for.

### 11.1 The Theory Board — the between-session product

The revelation graph knows what each player believes. Give them a place to be **wrong on the
record**: a player posts a theory, links it to the passages it rests on, and other players stake a
position. The GM sees the board and can see her plot land or fail *before* Tuesday. When canon
later resolves, the board self-scores: *"Sera called it in Session 11, on three passages, before
the ledger existed."*

This is the only feature in either candidate that gives a group a reason to open the app on a
Wednesday, and it exists purely because we model belief separately from truth. It is also the
retention mechanic in its purest form — and it is cheap: it is Entries, Links and Revelations,
with one new `Stake` row.

### 11.2 Canon Divergence — rumour as a data type

Because `Revelation.belief` exists, the GM can plant a *false* fact with full provenance, and the
product renders its life cycle: believed from Session 6 (Lady Vharon's testimony) → contradicted
Session 19 (the ledger) → superseded. Players get a **"how our understanding changed"** view of
any faction, place or person, generated from data with no authoring cost.

Two second-order gifts: the same machinery renders a **retcon** honestly (the GM changes canon;
the product shows what the party believed under the old canon rather than silently rewriting
history — the failure mode of every wiki ever), and it makes **unreliable narration** a supported
feature rather than a workaround.

### 11.3 The World Ships — a static, per-audience Fandom, and the go-to-market

`.chronicle` export (B6) additionally emits a **self-contained static HTML site** of the world, in
two editions: **GM** (everything) and **Party** (the revelation projection only). No server, no
account, no login — a folder a GM can host anywhere, hand to players, or publish.

Why this is strategy and not a nice-to-have: RB-11 §4 rules that discovery runs through creators,
and RB-08's clearest lesson is that **Dungeon Alchemist reached the whole market by exporting into
its rivals** (€2.46M from 57,209 backers). A published campaign wiki is a *public artefact* with a
"built with Chronicle" footer that ranks in search, and it is the artefact a GM wants to show off
anyway. Our export is our advertising. It also, deliberately, makes us easy to leave — which is the
strongest possible answer to Roll20's lock-in (no campaign export at all) and the reason a
data-sovereignty-minded, EU-facing audience trusts us at all.

A fourth, smaller idea worth one line each: **worlds are forkable** (take your published world as
a starting universe, with attribution tracked through `derived_from` exactly as RB-04 requires of
assets) — which turns a system author's package and a GM's world into the same shippable object,
and gives our own registry (B2) something to hold on day one.

---

## Appendix — the amendments, answered

| Ref | Requirement | This candidate |
|---|---|---|
| K1 | Themes + templates | Token-first from commit 1; themes are data in our registry; **two kits at launch** (`Clean`, `Archive`), typography-led because reading is the hot path; contrast validation as a CI gate. |
| K2 | Visual GUI rule-builder | The Codex's own schema editor — **the same tool** as the wiki-template editor (§4.1). Sequenced engine → schema forms → layout → formula/trace. Arrives earlier under this thesis than under a table-first one. |
| K3 | State-of-the-art GUI | The Triumph shell unchanged; motion per its tempo table; nothing animated on the map hot path; a11y as architecture, gated from slice 1. |
| K4 | Differentiation | §5, with losses. The named axes: the durable world (axis 6), no-code authoring, accessibility, theming, portability. **Not** feature count, **not** the renderer, **not** minute one. |
| K5 | Maps, generation, sprites | Staged per RB-05's own sequencing: weeks-scale wins first (UVTT import, tiling, budget lint, touch, Owlbear's explicit quality switch); elevation and the sprite/tile atlas as committed architectural bets because retrofitting them is a rewrite; **WFC after the wall model is stable** — generation is only impressive if what it generates is immediately playable. |
| K6 | Distribution | RB-11 adopted whole. Pinned runtime, GM licence, players free, direct sale, Steam gated. §7 prices the part RB-11 says nobody priced. |
| K7 | Game feel through staging | Adopted unchanged. Art is content and skin; no depicted world in the chrome. |
| — | Invariant 5 (AI optional) | **There is no AI anywhere in the core loop.** The recap is deterministic from the revelation stream. This is a product position, not just compliance: Dungeon Alchemist advertises "no generative AI" as a *trust signal* (RB-05). |
