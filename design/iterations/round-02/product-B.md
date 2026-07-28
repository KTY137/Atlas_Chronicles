# Der Zettelkasten (there is no cursor in a document) — Product Candidate B, Round 2

**Thesis, one line:**

> **Wissen sind Atome, und Atome sind unveränderlich. Eine Seite ist keine Datei, sondern eine Frage.**
> Knowledge is atoms and atoms are immutable. A page is not a file — it is a query plus an order.

This is an **evolution of `CHAMPION.md`, not a fresh start.** The Revelation edge, the permission spine
(§6 of the champion), the action/realtime architecture (§7), the package closure and the eight
boundaries (§10.4–10.5), the gates (§11.4), the business shape (§12) and the refusals (§16) are
adopted whole. What inverts is the **atom**: the champion's `Passage` is a mutable paragraph inside a
document and its identity must be *engineered and defended*. My `Karte` is an immutable, identified,
content-addressed unit of knowledge, and identity is **free by construction**. The champion's largest
unpriced item (§15.1 — *"nothing built in two rounds has a cursor in it"*) is not paid for. It is
**deleted from the requirement list**, and a much smaller requirement is put in its place, with two
falsifying spikes named in §7.4.

**Optimises for:** 21:00 (the live table, where capture is the only affordable gesture), Wednesday
morning (a codex readable on a phone, on paper, and as static files), cold start (the first card costs
four seconds, not a blank page), and the deletion of the editor bet.

**At the cost of, stated as costs and not as framing:**

- **Long-form authorship.** A GM who wants to write four pages of continuous, freely formatted prose
  has a **worse** tool here than Foundry's ProseMirror journal (RB-01-foundry: V14 journals are a real
  ProseMirror surface, TinyMCE removed) or Obsidian, which is free, local and already installed. I do
  not have a document editor and I am not building one. §8.1.
- **Composition labour on Tuesday.** The champion's GM writes; mine **arranges**. Ordering forty cards
  into a readable article is a chore nobody has asked for, at the hour the GM is least willing. §8.3.
- **A market shape with zero supporting evidence.** No product in the RB corpus is atom-first.
  Roam and Logseq are block-first and both lost the general market to document-first Obsidian.
  I will not invent evidence I do not have. §8.5.

---

## 1. The four verbs and the one noun

The whole product is four gestures over one object. This is not a slogan; it is the routing table,
and every zone in §4 is one of these verbs wearing a different skin.

| Verb | Gesture | Produces |
|---|---|---|
| **Erfassen** | capture — type, paste, roll, import, a player's field note | a new `Karte`, immutable, four seconds |
| **Ausgeben** | issue — hand a card to a character | a `Revelation` row (the champion's edge, unchanged) |
| **Berichtigen** | supersede — correct a card | a **new** card with `supersedes: old_id`; the old card never dies |
| **Anordnen** | arrange — pin, order, tag, section | an `Anordnung` (article / sheet / scene / handout) |

The noun is **die Karte**. Everything durable in the product is one: a paragraph of lore, an infobox
row, a statblock line, a map region, a ruling made at the table, a dice result, a player's theory, a
rule expression. **One id everywhere** — the unit of authorship *is* the unit of citation *is* the
unit of revelation *is* the unit of mechanics *is* the unit of export.

### 1.1 What a Karte actually is — and the caricature, killed on page one

The thesis dies to: *"a wall of index cards is a database with a nice theme."* Three structural
answers, all of them design decisions and not rhetoric.

**(a) A Karte has no size limit.** The system fixes *identity* and *immutability*; the author fixes
*length*. A 900-word Karte is legal, ordinary and common. What is illegal is a cursor that crosses a
card boundary. A Zettelkasten in which a Zettel may be an essay is still a Zettelkasten — it is not a
document with a cursor in it.

**(b) Prose is a rendering problem, not a storage problem.** An `Anordnung` has **three render
recipes**, structurally identical to `03-triumph-ui-direction.md`'s one-Scene-three-recipes doctrine:

| Recipe | What it is |
|---|---|
| **Lesefassung** *(default)* | Continuous prose. No card chrome, no borders, no boxes. Card boundaries are paragraph breaks. Infobox, lede, sections, blue links, red links. **Visually indistinguishable from a Fandom article.** Card affordances (handle, source stamp, Ausgeben, Berichtigen) appear on focus or hover, exactly like Wikipedia's section `[edit]` links. |
| **Kartei** | The box view: cards with handles, tags, holders, relations, order. The prep surface. |
| **Umriss** | Semantic outline — headings, relations, no prose. Screen-reader and mobile-first. |

The wall of index cards is a **view the GM chooses in prep**, not the product. The default reading
surface is prose. §8.6 names the risk that one screenshot of the Kartei recipe hands a critic the
caricature anyway.

**(c) The paste is the primary capture, and it is designed for, not tolerated.** The attack says: *the
first thing every real GM does is paste three paragraphs out of Google Docs — into what?* Into **one
card, immediately**, in under a second, with no decision required. Kind `roh`. It is already
citable, issuable, linkable and taggable. *Then* the **Schnitt** offers itself: a deterministic
splitter (blank line → heading → sentence boundary; no AI, ever) that previews the paste as N cards
with one key to accept all, one to accept some, Escape to leave it whole. **Leaving it whole is a
permanent, legitimate, unpunished state.** A GM who never once presses Schnitt gets the champion's
product with better identity guarantees.

The Schnitt is also where this candidate is most likely to die, and §8.1 says so at full volume.

---

## 2. The flex — *„Es gibt keine Datei. Es gibt eine Karte."*

21:52, Sitzung 14. Timo is on the sofa watching Kaya run her table.

Sera's player has just found the Vharon ledger. Three months ago Kaya wrote that the Aschene Siegel
was authentic. Tonight it is a forgery — and that sentence is, in every other product in the RB
corpus, **in four places**: the *Haus Vharon* article, the *Aschenes Siegel* article, the *Kestrel-Flügel*
article, and the handout she showed in Sitzung 6. Four documents. Four copies. Three she will forget.

Here there is **one Karte**, `k_9f21`. She tabs to its handle — a real `<button>`, so it works in
NVDA browse mode, focus mode and with a mouse identically — and presses **Enter → Berichtigen**.

Before the editor opens, the **Nachhall** panel states the blast radius. Not a warning; a fact:

> *Diese Karte liegt in **4 Anordnungen**, ist von **2 Karten** gestützt, trägt **1 Klausel**
> (+2 Menschenkenntnis · Gegenstand: Haus Vharon Finanzen · sealed), ist an **3 Charaktere**
> ausgegeben und ist die **Quelle** von 2 weiteren Ausgaben.*

She types the new sentence. Eight seconds. Enter. A four-second toast with a countdown ring —
**nothing has left the server yet.**

Then the screens. Not one screen: five.

| Reader | What changed |
|---|---|
| **Kaya (SL)** | all four Anordnungen now read correctly; the old card is struck, dated, and still there |
| **Sera** (holds the old card) | the paragraph she was told is **struck through** with the new one beneath it: *berichtigt, Sitzung 14 · vorher: Sitzung 6, Quelle Lady Ilva* |
| **Brannt** (holds the old card) | the same, in **his** three Anordnungen — including the *Kestrel-Flügel* article he read on his phone on Tuesday |
| **Ossa** (never held it) | the new card, clean. No strike. No history. No trace that a correction happened. |
| **Die Gruppe** (public arrangement) | **nothing.** The card was never public. Not greyed — absent. |

And Sera's sheet: the `+2` goes **inert with a visible marker**, and the derivation shows the
biography — `12 (Grundwert) → 14 (Sitzung 14 · +2 · k_9f21) → 12 (Sitzung 14, 21:52 · Klausel erloschen ·
Karte berichtigt)`.

Timo, leaning over:

> *„Du hast **einen Satz** geändert — und vier Seiten sind jetzt richtig, und jeder Spieler weiß
> etwas anderes darüber? Wo ist die Datei?"*

> *„Es gibt keine Datei. Es gibt eine Karte."*

**Second beat, ten seconds later, and it is the one that actually sells:** Timo asks how long the
*Haus Vharon* page took to write.

> *„Ich habe sie nie geschrieben. Ich habe 41 Karten geschrieben, über 14 Sitzungen, meistens am
> Tisch. **Die Seite ist eine Frage.**"*

She presses **Kartei** and the prose falls apart into forty-one cards, each stamped with the session
it was born in, eleven of them created by the table rather than by her — dice results, a ruling, two
of Sera's own field notes. She presses **Lesefassung** and it is an encyclopedia article again.

**The flex, named:** *one gesture, eight seconds, corrected an entire wiki — and every reader's
version of the truth updated differently and correctly, because there was only ever one atom.*

**Three honest amendments, because the round earned them:**

1. **The `+2` is slice 2.** Clauses need the rule engine. Slice 1's flex is the four-Anordnung
   correction, the Nachhall preview and the divergent reader views — which is already the whole
   argument and needs no fake number. The champion's §2 amendment 1 is inherited verbatim; shipping
   an animated hard-coded constant is the facade intake tension #2 forbids and round 1 proved the
   temptation is real.
2. **The best photograph is not this screen either.** It is the **Auszug** (§9.2): a printed, bound,
   six-page booklet titled *„Was Sera über Haus Vharon weiß — Stand Sitzung 14"*, lying on a real
   table next to real dice. A Pen-&-Paper product whose marketing asset is paper. That is a still
   image, and the champion admits (§15.10) it does not have one.
3. **The Kartei view is a liability as well as an asset.** §8.6.

---

## 3. How the two halves fuse — one substrate, two directions, worked

The champion's answer is the **Revelation edge**, and it is correct. Under this thesis it gets
strictly *cheaper*, and one column dies.

### 3.1 The edge, simplified by immutability

```text
Revelation(karte_id, character_id NOT NULL, granted_in_session_id,
           source_karte_id, belief, granted_via, batch_id,
           revealed_by, revealed_at, retracted_at?)

granted_via ∈ { direct, campaign_fanout, catchup_grant, import, fork_import }
```

**`revision_id` is deleted.** The champion needs `(passage_id, revision_id)` so that a later GM edit
cannot retroactively change what a character learned. A Karte cannot be edited, so **a revelation
cannot go stale by construction.** One column, one join, one entire class of "did we pin the right
revision?" bug, gone. This is the single cleanest structural dividend of the thesis and it is worth
more than it looks: `revision_id` appears in the champion's export format, its package diff, its
projection cache key and its live-session package pin.

`belief ∈ {true,false}` survives unchanged — *the one boolean that makes this a story tool instead of
a database.*

`source_karte_id` is a Karte, so the server-side precondition
**`visibility(source) ⊇ audience(issue)`** is the same predicate as everything else. One rule.

### 3.2 Three relations, and the distinction the document model cannot make

```text
Kartenrelation(from_karte, to_karte, art ∈ { supersedes | widerlegt | stützt | zitiert })
```

- **`supersedes`** — *this card replaces that card.* The old text was wrong as a **record**.
- **`widerlegt`** — *the world contradicts that claim.* The old card stays **true as a record** and
  **false as a fact.**
- **`stützt` / `zitiert`** — support and citation, which is what makes §9.1 and the Contradiction
  Engine pure joins.

That middle row is a product idea, not bookkeeping. When Lady Ilva testified in Sitzung 6 that the
seal was authentic, the card *„Lady Ilva bezeugt, dass das Siegel echt ist"* **was never wrong**. Ilva
said it. Superseding it would falsify the record of the session. Marking it `widerlegt durch k_9f21`
is correct, and it is what lets the party's book read: *„geglaubt bis Sitzung 14, widerlegt durch das
Rechnungsbuch"* rather than silently rewriting a night that happened. **A card can be a true record of
a false statement.** Every document-first tool in the corpus collapses these two into "edit the page."

### 3.3 The two directions, with a real session

**Knowledge → play.** There is no "build the encounter" step. The tavern's `szene`-kind cards *are*
the playable scene; the captain's `feld` cards *are* the token's rule data; a `regel` card *is* a
clause. The Library is the compendium is the wiki, because they are all the Kasten.

**Play → knowledge**, worked, Sitzung 14:

| Moment | What happens |
|---|---|
| 21:14 | Sera searches the Vharon ledger. Roll: Menschenkenntnis 17 vs 15, success. |
| **automatic** | The action log emits `k_e441`, kind `ereignis`, composed **deterministically** from the log — *„Sitzung 14, 21:14 — Sera durchsucht die Vharon-Rechnungsbücher. Menschenkenntnis 17 gegen 15. Erfolg."* — tagged `sitzung-14`, `sera`, `haus-vharon`. Nobody typed it. It is an atom, so it is citable, issuable, and **it lands by itself in the *Sitzung 14* Anordnung and in Sera's Chronik**, because both are queries. No AI. |
| 21:15 | Kaya focuses `k_9f21`, presses **Ausgeben** → Sera; the Reveal Sheet shows the byte preview and the source card `k_44a0` (*„Die Rechnungsbücher lagen im zweiten Keller unter dem Archiv"*), which Sera also receives because the precondition demands it. Two rows after the abort window. |
| 21:19 | Sera's player writes a **Feldnotiz** — a card in her own scope, citing `k_9f21` and `k_6_ilva`. Server-enforced: **she may cite only cards she holds.** It appears in the *Haus Vharon* Anordnung's `Theorien` section, for her and the GM. |
| 21:31 | Kaya rules that cover halves area damage. One key. A **Regelkarte**, `status: informal`, `ast: null`, scope chip from the current selection. **~6 seconds.** It is already a card in the box — no promotion machinery, no grafting. §4 Forge. |
| 21:52 | The Berichtigung of §2. |
| 22:40 | **Session-Diff.** Not a document review — a list of the 23 cards born tonight and the 11 issued. Three `roh` fragments get tagged and pinned. The Contradiction Engine reports that `k_6_ilva`, held by four characters with `belief: true`, is now contradicted; she marks it `widerlegt`, not `superseded`, in one keystroke. |

Every one of these is an append-only `AuditEntry` with `channel: play | authoring | system`. **Nothing
is inferred. No AI is anywhere in this loop.**

### 3.4 The infobox is where the fusion is sharpest

A Fandom infobox is one block. Here it is **N Feldkarten** — `Einwohner: 4.200`, `Herrscher: [[Lady Ilva]]`,
`Gegründet: 1044` — each an atom with its own provenance and its own revelation.

> *Die Gruppe kennt den Herrscher. Die Einwohnerzahl kennt niemand. Sera kennt das Gründungsjahr,
> falsch, seit Sitzung 3.*

An infobox that is **partially knowable, row by row, per character** is not expressible in a document
model without inventing atoms late and half-built. This is a two-line consequence of the thesis and it
is one of the strongest single screens in the product.

---

## 4. The six zones under this thesis

The six-zone shell of `03-triumph-ui-direction.md` survives — Session · Story · Cast · Library ·
Table · Forge, with Campaign Context, Module Rail, Collection Rail, Primary Stage, Context Lens and
Session Shelf. **One zone changes shape materially and it is justified below.**

| Zone | Under Zettelkasten |
|---|---|
| **Story → Die Anordnungen** | **Home.** Article-shaped Primary Stage in **Lesefassung**: infobox from Feldkarten, lede card, sections, prose, blue and red links, permanent Backlinks facet. Recipe switch to **Kartei** / **Umriss** keeps selection, exactly as the Table's three recipes do. Every editable surface accepts `[[`. |
| **Session → Der Strom** | **The material change.** During play the Primary Stage is a **capture stream**, not a document: everything tonight, newest last, with one always-focusable capture line at the head. Rolls, rulings, issues and typed lines all land as cards in the same stream. Before play it is the Docket (open threads = dangling relations, prep queue, next scene); after play it is the **Session-Diff**. **Justification:** capture-first means the live surface must be a *capture* surface. Making the GM navigate to an article at 21:14 is exactly the failure the champion's §4 amendment 3 invented the `Ctrl+K` overlay to paper over. The overlay stays; the Strom means she needs it less. |
| **Cast → Anordnungen mit Feldkarten** | An Actor is an Anordnung with an `ActorExt`. Its stats are Feldkarten, so a stat has provenance and a stat is individually issuable: *Sera kennt die Stärke des Hauptmanns, nicht seinen Willen.* NPC article and statblock are one object because they are one arrangement. |
| **Library → Der Kasten** | The box itself: every card, faceted by kind · tag · session · source · holder · relation · clause · orphan-status. This is where the "it's a database" honesty lives — and it is **good**, because a Zettelkasten's index is a first-class artifact, not an embarrassment. Also holds templates, instances, handouts, media and the asset provenance ledger (SPDX id, author, source, checksum, `derived_from`). |
| **Table → Die Wissenskarte** | A Scene is an Anordnung; a region is a Karte of kind `geometrie`. Three states per reader — held → drawn, named, stamped; held with `belief: false` → dotted rumour outline; not held → **absent, no bytes**. Cheaper here than in the champion, and with one gift the champion cannot have: **a region card and a lore card can be the same card**, so the corridor's description is one atom that lives on the map *and* in the article, and one Berichtigung fixes both. No walls, no LOS, no attenuation, no sweep polygon, no Pixi hot path. |
| **Forge → Kartenarten und Regelkarten** | Schema-Lite becomes *"define a card kind"*: fields, label, infobox order, default sections. The visual rule-builder edits **Regelkarten**. **The Ruling Card is not a feature here — it is the default state of a Regelkarte.** In the champion it is a graft with a promotion path; here `status: informal → formal` is a status change on an object that already exists. Same closed AST, no added expressive power. |

**Three shell amendments, each justified:**

1. **Default landing is Story.** One routing line; the whole philosophy made visible.
2. **The Link Well is shell-wide** and is therefore a **permission surface from the first commit** —
   `[[` autocomplete is the product's most dangerous oracle and it is projected per reader.
3. **The Context Lens gets a permanent `Nachhall` tab**, which subsumes the champion's `Erfasst`
   lens: for any selected card, who holds it, who cited it, which Anordnungen contain it, which
   clauses ride on it, and what a Berichtigung would touch. Titled with the same honesty caption —
   *der Kasten weiß, was der Tisch erfasst hat, nicht was am Tisch gesagt wurde.*

Everything else in `03` is adopted unchanged: independent axes (content × skin × role × mode × a11y),
9-slice theme manifests, DOM-authoritative with Pixi behind `MapRenderer`, the non-goals list. K7
holds absolutely: art is content and skin; the most cinematic moment in the product — a card arriving
in the stream, or a struck line resolving into its correction — is a **transition**, not a depicted
world.

---

## 5. The differentiation ledger

Every row cites the brief it stands on. **A ledger with no losses is a lie**, so every row has one.

### Foundry VTT — `RB-01-foundry`, `RB-05`, `RB-08`

**What we do that they cannot.** Foundry's journal is a document; its identity stops at the entry.
*Which character learned this paragraph, when, and from whom* is not merely unimplemented — it is
**unrepresentable**, because there is no id below the entry to hang it on. To add one they must change
**every journal read path**, in an ecosystem of **5,338 approved modules** on a **median-19-module**
install, where **only 1,590 of 5,338 modules were V14-compatible one month after V14 shipped**. `RB-05`
records them abandoning even the PixiJS v7→v8 **renderer** migration mid-cycle as *"far more sweeping
and disruptive than we had planned."* **If the ecosystem freezes the renderer, it freezes the schema.**
No-code system building is a third-party afterthought there (Custom System Builder is a community
module); ours is the product.

**What they still do better.** Walls, six wall types, four perception channels, Regions, elevation,
Scene Levels, `ClockwiseSweepPolygon` — a decade deep, and we will not out-build it. **475 approved
game systems (+30 % YoY).** $50 one-time, ten years of trust. And the one that stings under *this*
thesis: **their journal editor is a real ProseMirror surface and mine is deliberately not.** For a GM
who wants to write four formatted pages, Foundry is the better tool. Today and in v1.

### Roll20 — `RB-01-roll20`

**What we do that they cannot.** Roll20 has journals, handouts and folders and **no wiki-grade
linking**; **no visual no-code sheet or rules builder** at all (sheets are HTML/CSS/sheetworkers, and
custom sheets are **Pro-gated**); **no campaign export**, unreliable character transfer, and a
publicly declined custom-content export. We answer with `.chronicle`, the static Publication and the
Auszug: *hier ist deine Welt, als Website und als Buch, die dir gehören.* Being easy to leave is the
sharpest counter to lock-in there is, and Jumpgate is a **rendering** project on a decade-old engine —
it does not touch the knowledge model.

**What they still do better.** ~10 M accounts and the LFG network effect, which is a real product
feature we do not have. Licensed compendiums. Charactermancer. It runs in a browser tonight with zero
install, which is our own claim, made ten years earlier.

### Fantasy Grounds — `RB-01-fantasy-grounds`, `RB-08`

**What we do that they cannot.** Rulesets are **XML with an integrated Lua editor and no official GUI**
— low-code at best, and *"no official no-code system builder exists."* Their campaign/story entries,
quests and notes are documents. Nothing in their model knows who learned what. And their content moat
is **licensed**: sharing a *purchased* module is not sharing *the GM's own world*.

**What they still do better.** The deepest automation in the market. **~3,858 store products.** A
**free client since 2025-11-08** — they deleted the software price entirely, which undercuts our
one-time-licence pitch directly. And, decisively for §7.5: **their cloud relay already solves
reachability, for free, today.** We are shipping a hosted room to reach parity with a thing they give
away.

### Owlbear Rodeo — `RB-01-owlbear`

**What we do that they cannot.** No first-party journals, quests, wiki, sheets, rules engine or
compendium — by philosophy, not by backlog. Everything we are is what they deliberately refuse. And
this thesis makes one claim against them that the champion could not make: **cold start is
generative.** Their benchmark is ~20 minutes to a running table with account-free player joins in
seconds; the champion's wiki-first answer was to hand a new GM an empty encyclopedia. A card is four
seconds and a paste is one. We do not beat 20 minutes — we stop losing by an order of magnitude.

**What they still do better.** Minute one, still. The Warp Core renderer — **a 137-megapixel map on an
iPhone 14 Pro Max**. Dynamic fog, 2.4's Forecast CV auto-fog, the explicit quality switch (the
cleanest performance-UX decision anyone in this market has shipped — copy it outright). Unusually
strong canvas keyboard accessibility. Mobile. Price. And a philosophy that makes them loved, which is
not a feature we can build.

### Alchemy RPG — `RB-01-alchemy`

**What we do that they cannot.** Their universes, lore, scene creator and handouts are a
presentation layer over documents; nothing per-recipient, nothing provenance-stamped, no export story,
no self-hosting. Their arbitrary-system support is shallow (`RB-01-alchemy` says so directly).

**What they still do better.** They are **the best-looking product in the category**, and they
**shipped a block-based no-code Sheet Builder in open beta** — layout blocks, drag and drop, GUI-only.
**They beat us to the first half of K2 and it is live.** We must ship *deeper*, not prettier, and
saying otherwise would be a lie.

### TaleSpire — `RB-01-talespire`, `RB-07`

**What we do that they cannot.** **No character sheets and no rules engine after ~5 years of Early
Access, both explicitly deferred past 1.0.** GM prep tools — journals, quests, wikis, handouts —
**essentially absent**; they live in Symbiotes (sandboxed HTML/JS web-views with, e.g., a documented
400-character chat API limit) or outside the app. We are the entire other half of the product, and
their extension model is precisely the arbitrary-code-execution architecture our invariants forbid.

**What they still do better.** The gasp. **90 % positive across 4,300+ Steam reviews.** A coherent
toy-diorama art direction that photographs better than anything we will ever ship. `RB-07` estimates
~€1.6–2.6 M gross over five years on visual delight alone. **We will never out-photograph a diorama
and we should stop trying** — §9.2 is our answer, and it is paper, not pixels.

### The rivals our slice-1 prospect will actually compare us to

World Anvil, LegendKeeper, Kanka and **Obsidian**. Until clauses ship, a prospect is evaluating a
permission-scoped wiki, and **Obsidian is free, local, instant and already installed.** Import is our
answer for the migrating GM. For the fresh-world GM we have §9.1 and a four-second card — palliatives
that are better than the champion's, and still palliatives.

> **For a table that wants to play a licensed system tonight with bought content and good lighting,
> all six beat us, and two of them now cost nothing.** We win the table that intends to still be
> playing in this world in 2031, and the GM who has already lost a fact she knows she wrote down.

---

## 6. The data shape

`02-domain-model.md` is inherited: `User → UniverseMembership → Universe → Campaign → GameSession`,
roles on memberships never on users, `AuthSession ≠ GameSession`, Actor as the aggregate with
`CharacterProfile` as an extension, `CharacterController` on `actor_id`, `RulePackageInstallation` as
its own table, `AuditEntry` campaign-scoped and append-only, Timelines deferred to a nullable column,
Universe invisible until a second campaign needs it. **Five changes.**

### 6.1 `KnowledgeEntry` becomes `Karte` — the universal immutable atom

```text
Karte (id            uuid  -- RANDOM, never derived from content. See 6.6.
       universe_id   NOT NULL          -- CHECK: the scope predicate stays one index-friendly clause
       campaign_id   NULL
       art           enum  -- text | roh | feld | abschnitt | binde | ereignis | geometrie
                           --   | regel | notiz | medien
       inhalt        jsonb -- closed single-block AST. No headings, no nesting, no HTML, no Markdown.
       inhalt_hash   bytea -- content address. NEVER exposed to a non-holder. See 6.6.
       klausel       jsonb NULL         -- 0..1 declarative clause, `disclosure` REQUIRED
       schema_id     NULL, paket_id NULL
       erfasst_von_user_id, erfasst_in_session_id NULL, erfasst_at
       tombstone_at  NULL                -- see 8.4
       )
```

**Immutable.** No `UPDATE` on `inhalt`. Enforced the way the champion enforces the audit log — by
**database grant, not by discipline**: the runtime role holds `INSERT, SELECT` on `karte` and
`UPDATE (tombstone_at, ...)` on a strictly enumerated column list, and nothing else. Round 1's lesson
was that a three-character splice inverted the domain model's one non-negotiable property and
**survived a rebuild**; the same lesson is applied to the same layer.

**`Passage` and `Revision` are deleted.** So is the champion's `Entry` supertype.

### 6.2 `Anordnung` — a page with no content of its own

```text
Anordnung (id, universe_id NOT NULL, campaign_id NULL, parent_id NULL,
           schema_id, slug, titel, kanon_status, sichtbarkeit,
           abschnitte[]  -- ordered section descriptors
           )
AnordnungPin (anordnung_id, abschnitt, ord, karte_id)     -- explicit editorial order
AnordnungQuery(anordnung_id, abschnitt, praedikat, sortierung)  -- the tail
```

**An Anordnung contains no text.** It is `pins ∪ query`, per section, per reader. This is the sharpest
edge of the thesis and it buys four things at once:

- **The same card lives in N arrangements with no copies** — which is the flex in §2.
- **A per-audience arrangement is a rendering, not a fork.** Kanon, Die Gruppe and Sera are three
  projections of one object; the champion needs the same, but a *fourth* arrangement — *„Sitzung 14"*,
  *„Seras Chronik"*, *„Alles, was aus einer Lüge stammt"* — is **free here and a new document there.**
- **The wiki partly writes itself.** An `ereignis` card tagged at 21:14 appears in two arrangements at
  21:14 without anyone editing anything.
- **Forking a world forks arrangements, not prose** — cheap, diffable, and the reason §9.3 works.

**The honest counterweight, stated here and not buried in §8:** a query alone produces a dump. An
Anordnung is therefore `[pinned cards, explicitly ordered] ∪ [query tail]` **per section**, with
`binde`-kind connective cards between them. The GM's editorial labour is **ordering and connective
tissue**, not retyping. §8.3 prices that labour honestly.

### 6.3 Relations, links, tags

`Kartenrelation(from, to, art ∈ supersedes | widerlegt | stützt | zitiert)` — §3.2.
`Link(from_karte, to_anordnung_slug, resolved)` — the backlink graph, computed server-side on insert;
unresolved rows are red links and a first-class prep artefact.
`Etikett(karte_id, tag)` — tags are the query substrate; a tag is not a permission.

### 6.4 `Revelation` keys to `karte_id`. `revision_id` is deleted. §3.1.

### 6.5 Items, and invariant 3 as a structural triviality

An `ItemTemplate` is a **Kartensatz** — a named, ordered set of card ids. An `ItemInstance` stores the
card ids it was created from. Because cards are immutable, **"pinning a revision" is not a feature; it
is the absence of one.** Invariant 3 (*template edits never silently mutate instances*) stops being a
foreign key the champion has to defend and becomes a property of the store.

A template "edit" is a Berichtigung producing a new card and a new set version. Instances are offered
a **Vorlagen-Review** — *„Aschener Siegelring, 9 Instanzen in 3 Kampagnen, Etikette +1 → +2"*, each
Übernehmen · Behalten · Abweichen lassen, **default Behalten**. Promotion is unchanged from the
champion: an instance that becomes a story gains an Anordnung.

### 6.6 Two security consequences of content addressing — closed here, before Athena finds them

1. **Content-addressed ids are a confirmation oracle.** If `karte.id = H(inhalt)`, anyone who *guesses*
   a withheld sentence can compute its hash and probe for existence. **Ruling: ids are random UUIDs.
   `inhalt_hash` is a separate column, is never in a reader-facing payload, never in an ETag, never in
   an error body, and never crosses a universe scope.** It exists for import dedup, `.chronicle`
   round-trip and package diffing only. Row `karte_hash_exposure` in `oracles.yaml`, with a timing test.
2. **Ordering is an oracle.** An arrangement rendered as *"pins 1,2,4,5"* tells the reader that card 3
   exists. **Ruling: projection happens before ordering, ordinals are computed per reader after
   projection, no gap is ever rendered, no count is ever emitted ("mehr laden", never "31 Treffer"),
   and a section whose contents project empty renders no heading** — the `abschnitt` and `binde` cards
   cascade to absent with their section. Rows `anordnung_order`, `section_cascade`, `query_tail` in
   `oracles.yaml`. **This is a leak class the champion does not have, created by my thesis, and it is
   my responsibility.**

### 6.7 The Reader Projection, unchanged in shape and cheaper in practice

A character's visible-card set is a materialised bitmap over `karte_id`, recomputed on
`projection_version`, which increments **only when a revelation lands** — an event the reader watched
happen, hence a near-100 % in-session cache hit rate. N is table size (3–8), not user count. An
Anordnung's render is one bitmap intersect against `pins ∪ query_snapshot`.

`AnordnungSnapshot` materialises the query tail to an ordered id list, invalidated on card insert or
tag change — **the query re-runs on invalidation, never on read.**

### 6.8 What does not change

The champion's §6 permission spine in full: the three choke-point functions
(`visible_karten` / `visible_events` / `who_knows`), no `at_time` in the signature, `oracles.yaml` as a
CI-gated manifest, the dependency-cruiser rule reddening the build on raw `Karte`/`Revelation`/
`AuditEntry` imports outside the projection modules, unrepresentability over policy, the opaque
`ReaderProjection` with no total, the constructed-never-derived player payload, **one string per
surface produced per recipient** (visible text, `aria-label`, `title`, `alt` and live-region
announcement are one function's output), 404-never-403 with identical bodies and timing, the Sealed
Trace as a two-constructor sum type, Publish Trace, Verdeckte Probe, and the **Leak Bench** as a
constructed differential test over payload, DOM **and serialised accessibility tree**.

Also unchanged: three presence concepts (Control / Attendance / Connection), no `confidence` field, no
anonymous bearer token, Leseschlüssel bound to a `ReaderIdentity` with a claim page, and Publication as
a deliberate static snapshot.

---

## 7. The first slice

### 7.1 Slice Z1 — „Die Berichtigung"

One workflow. One universe, one campaign, browser only, hosted room, three people.
**No map, no dice, no combat, no clause, no `+2`, no Electron, no Forge.**

> Kaya pastes three paragraphs out of Google Docs. They become **one card** in under a second. She
> presses **Schnitt**; they become three; she keeps two and re-joins the third. She tags them
> `haus-vharon`. They appear in two Anordnungen — one she pinned by hand, one that is a query. She
> opens a session. Two players join by link with a display name and no account. She **issues** one
> card to one character. The other player's screen does not change **because the bytes never left the
> server.** She presses **Berichtigen**; the Nachhall states the blast radius; she commits. Both
> Anordnungen now read correctly, the holder sees the strike-through and the correction, the
> non-holder sees the new card clean, and the public arrangement shows nothing at all. She exports the
> campaign, re-imports into an empty instance, and the diff is empty.

**Contains:** accounts + campaign + membership + server-side permissions · `Karte` / `Anordnung` /
`AnordnungPin` / `AnordnungQuery` / `Kartenrelation` / `Etikett` / `Link` / `Revelation` · the
**single-card editor** with inline marks and `[[` autocomplete with red links · the **Schnitt** ·
**Lesefassung + Kartei** recipes with the section-cascade rule · real `<a href>` routing with a
server-side cold GET and a uniform 404 · a live session with the **Strom**, presence and the Reveal
Sheet (focus-trapped, no preselected recipient, byte preview, 4-second abort before anything is sent) ·
the per-character projection and the three-column tablist · `visible_events()` + `oracles.yaml` + the
dependency-cruiser rule · append-only `AuditEntry` and immutable `karte` **by DB grant**, with abort
and Retract · **Leseschlüssel** and two player surfaces (personal Kodex on a phone, *Was habe ich
verpasst?*) · **Feldnotizen** (nearly free here — a player capture is the same gesture with a different
scope, and it exercises the most dangerous oracle with the least-privileged user) · `.chronicle`
export/import · the `Clean` theme only · the `Platform` port with both implementations.

**Explicitly not in Z1:** maps, tokens, the Tactical recipe, dice, combat, clauses and derived numbers,
item templates and inventories, custom card kinds (three built-ins only: `text`, `feld`, `ereignis`),
the theme editor and second kit, the visual rule-builder, generators, WFC, AI, the Electron shell,
UVTT, importers, universes as a visible concept, collaborative editing, the Umriss recipe.

**Two cuts will be argued with, so they are defended here.** **Dice** is a two-day feature at any point
and proves nothing about the architecture. **The `+2`** is half the flex and it hurts — but a clause is
worthless before the rule engine exists and shipping a fake one is the facade intake tension #2 forbids.

**The honest cut order if it must shrink:** (1) the query tail, keeping pins only; (2) the Kartei
recipe, keeping Lesefassung; (3) Feldnotizen. **Never the scoping work** (free tonight, a migration in
2029) and **never the Berichtigung** — it is the flex, and it is four `COUNT` queries and one insert.

### 7.2 Slice Z2 — „Die Klausel"

The rule-engine core; clauses with required `disclosure`; the Sealed Trace, Publish Trace and
Verdeckte Probe; Herkunftsverlauf; the **Wissenskarte**; **Regelkarten** and the Session-Diff
formalisation door; the Contradiction Engine; **Der Kasten fragt zurück** (§9.1); the second skin.

### 7.3 Launch-blocking, distinct from slice-blocking

Per `RB-11`: **discovery runs through creators and system authors, not gamers** — Foundry reached 475
systems with no store at all — so these are launch gates, not phase-three ambitions.

- **The visual rule-builder**, via card-kind forms plus the Regelkarte formalisation path.
- **UVTT / `.dd2vtt` import (lossless: walls, doors, windows, lights, grid) and UVTT export**, plus
  Foundry-shaped journal export and Roll20/FG-shaped export. Dungeon Alchemist reached the whole
  market by exporting to its rivals (`RB-11`, `RB-05`: €2.46 M from 57,209 backers).
- **Fremdwelt-Import** — Foundry world folders, Roll20 campaign JSON, Fantasy Grounds campaign XML,
  Markdown/Obsidian vaults. Three rules make it a *Kasten* import: nothing is silently dropped
  (unmapped data becomes a red-linked `Import-Rest`, with the Import Report printing the arithmetic);
  **licensed content is flagged, not laundered** (invariant 7 enforced at the import boundary, where it
  is cheap, not at the publish boundary, where it is a lawsuit); and the import ends in the
  **Nachtragsgewährung** screen — *„1.106 Karten sind Kanon. Was weiß die Gruppe schon?"*
- **The Electron desktop host** — the self-hosting invariant's implementation (`RB-11`: a browser
  cannot host a local server; Foundry telemetry 68.35 % Electron).

### 7.4 The two spikes this candidate owes, and what falsifies it

Round 1's verdict demanded *"a number where the editor's price used to be."* My answer is not a smaller
price — it is a **smaller requirement**, and here is exactly what must be measured to prove it.

| Spike | Cost | Green when | Red means |
|---|---|---|---|
| **Z-1 · the single-card editor** | ~half a day | A focused `contenteditable` over **one** card with a whitelist of inline marks (em, strong, code, link, `[[wikilink]]`) and **no block structure, no split, no merge, no cross-card selection**. Pasting arbitrary HTML/RTF from Google Docs, Word and a Foundry journal yields **exactly one card**, marks preserved, structure discarded, and zero DOM outside the closed AST. | The editor is not smaller than the champion's. My cost advantage evaporates and the engineering lens should go to the Skriptorium. |
| **Z-2 · der Schnitt** | ~one day | Deterministic splitter over a 3,000-word Google Docs paste. Assert `concat(cards) == normalize(input)` **character for character** (nothing is lost), assert card count and order against a hand-labelled fixture, and assert idempotence. | The thesis's entrance is broken; every GM pastes monoliths; see §8.1. |

**I claim no number I have not measured.** The claim is structural: split, merge and cross-block
paste-over — the four operations the champion's §15.1 says nobody has priced — **are not in my
editor's contract at all.** Z-1 and Z-2 are what turn that claim into a fact or into a corpse.

---

## 8. Weaknesses — the honest ledger

### 8.1 The Schnitt is where this candidate most likely dies, and it is unbuilt

The four-second card is a claim; the 3,000-word paste is the reality. If the splitter produces bad
cards — a bullet list shredded into eleven atoms, a two-sentence paragraph cut mid-thought, a table
destroyed — the GM turns it off, pastes monoliths forever, and I have shipped the champion **with
worse authoring ergonomics and no rich-text editor to compensate.** I have not deleted the editor
risk; I have **moved** it, from "do ids survive a paste-over?" to "does the cut produce cards a human
recognises?" The second question is cheaper and more testable — Z-2 is one day, the champion's is
named as two — but it is not zero, and a candidate that pretends otherwise is doing what round 1
punished. Measurable, unmeasured, and first in the queue.

### 8.2 The semantic/cosmetic classifier is a heuristic over German, and it will be wrong — **hard**

Immutability has an absurd corner: fixing `Vharron` → `Vharon` must not create a supersede chain, a
strike-through in three players' books, and a live-region announcement. So there are two operations:

- **Berichtigung** — a new card, `supersedes`, holders see the divergence. **The default.**
- **Redaktion** — a corrected rendering of the *same* atom, `semantic: false`: no supersede, no strike,
  no notification, no revelation touched. Recorded in the changelog under `channel: authoring`.

And the guard, which is the only reason this is not a hole: **Redaktion is never freely chosen. It is
*offered*, and only when a deterministic classifier finds the diff below a declared threshold** —
whitespace, punctuation, casing only, with **no** change to any number token, any capitalised token,
any negation particle, any `[[link]]` target and any clause AST. Anything else offers Berichtigung and
nothing else.

**Why it is genuinely hard:** German negation is not a token list. *nie · nicht · kein · ohne ·
schwerlich · kaum · alles andere als* — and a GM can invert a sentence's meaning with no numbers, no
proper nouns and no negation particle at all (*„Er hat es gesehen"* → *„Er hat es gehört"*). A false
Redaktion is **a silent truth change nobody is told about**, which is precisely the failure the entire
thesis claims to prevent. The mitigations (default-Berichtigung, offer-never-choose, full changelog,
GM-visible Redaktionsliste in the Session-Diff) narrow it. **They do not close it, and I have no
mechanism that does.**

### 8.3 Composition labour replaces writing labour, and it may be worse

The champion's GM writes a paragraph in a page and is done. Mine captures a card and must *later* put
it somewhere. Ordering forty cards into a readable article is a drag-and-drop chore no GM has ever
asked for, at the hour (Tuesday, prep) when the GM is least willing — and **the default state of every
new Anordnung is unarranged.** If the Lesefassung of an unarranged arrangement reads like a database
dump, the Fandom half is dead on arrival and the attack's headline sentence is simply true.

Palliatives: query default orders (in-world date · session · capture time), section templates supplied
by the card-kind Schema, `binde` cards, and the plain fact that a 20-card article is fine unordered.
**All palliatives. The champion's visibility tax is unmeasured; mine is a *second* unmeasured
behavioural bet stacked on the first**, and the instrumented four-hour session must measure both:
`≤ 4 min total GM typing`, `≤ 2 misses in the Session-Diff`, **and** a new gate — *the GM arranges
≥ 60 % of tonight's cards within one week, unprompted.* Red falsifies the thesis and the round says so
before marketing does.

### 8.4 Immutability collides head-on with the right to erasure — **hard**

An append-only, content-addressed, supersede-chained store, fanned into per-character projections and
shipped out as `.chronicle` files, has **no `DELETE`** — and the champion made that a virtue enforced
by database grant. Then a player asks for her Feldnotizen to be erased. The stakeholder is in Germany;
the audience is EU-facing; this is not hypothetical.

The answer, and its limits: `Karte.tombstone_at` plus a **physical purge of `inhalt` and `inhalt_hash`**
while the id, the relations and the revelation rows survive, so the graph stays consistent and every
arrangement renders *„Karte gelöscht auf Verlangen · Sitzung 11"* instead of corrupting. Purge
propagates to the projections and to the search index in the same transaction.

**What it cannot do:** reach a `.chronicle` file already on someone's disk, a static Publication
already built, or a printed Auszug. Those are the same limits every export-friendly product has, and
"we are easy to leave" (§5, Roll20) is exactly what makes them unfixable. It needs a documented
retention policy and a purge-propagation test in CI, and it is a **legal surface, not a feature
backlog item.**

### 8.5 There is no evidence anyone wants this

The RB corpus contains **zero** examples of an atom-first TTRPG knowledge tool. Every adjacent product
— World Anvil, LegendKeeper, Kanka, Obsidian, and the journals in all six teardowns — is document-first.
In the general knowledge-tool market the two block-first products (Roam, Logseq) lost to document-first
Obsidian. That is a market signal **against** this thesis, and the honest reading is that the atom is
an architect's preference that users tolerate rather than seek. **I have no counter-evidence and will
not invent any.** The only mitigation in the design is that the atom is *invisible by default* — the
Lesefassung is the landing view precisely so that the substrate is a benefit the user receives and not
a discipline the user performs.

### 8.6 The Kartei recipe is a self-inflicted screenshot wound

One image of the Kartei view hands a reviewer *"it's Trello for lore"* and the review writes itself.
Mitigation is that Lesefassung is the default — and **defaults are what marketing screenshots ignore.**
Accepted, named, unfixed.

### 8.7 The ordering oracle is a leak class I created

§6.6.2. It does not exist in the champion, because a document's paragraph order is authored, not
computed per reader. Here every arrangement is a per-reader computation, so ordinals, gaps, section
headings, "load more" affordances and the query tail are all new oracle surfaces. Three new
`oracles.yaml` rows and the section-cascade rule are the answer; they are specified and untested.

### 8.8 Inherited, unresolved, and not pretended away

The champion's §15 items that this thesis does **not** fix: the visibility tax (§15.2, and I add a
second bet on top of it); the four-dimensional permission matrix attached to the friendliest UI in the
product (§15.3); K5's reallocation, which is Kaya's fork and not the oracle's (§15.4); asymmetric
numeric secrets in a shared roll (§15.5); *Erfasst, never Weiß* — the register records what the
software saw, and a GM who narrates a secret aloud and presses nothing leaves a hole where a clause
silently does not fire (§15.6); clause migration inside a five-year world (§15.7 — **worse here**,
because a Berichtigung of a clause-bearing card is a new atom and the migration must decide whether
holders of the old card keep the old clause; my ruling is **yes, and it is marked inert with the
biography visible**, which is inspectable, not safe); the hosting tail (§15.9); and Fandom-grade at
scale, still unproven by any artifact in any round (§15.11).

---

## 9. Creative extensions — three things the thesis makes possible

### 9.1 „Der Kasten fragt zurück" — the prep engine, as a pure join

Luhmann's actual mechanism was not storage; it was that a card **points at a next card**. Give the GM
one key that asks the box a question, and answer it with a deterministic join over rows we already
have — **no AI, no scoring, every row is its own derivation**:

- cards created in a session and **never used since** — *„Du hast in Sitzung 9 den Namen ‚Der zweite Keller' erfasst und nie wieder angefasst."*
- cards in **no arrangement** — orphans, the box's own to-do list;
- `stützt` relations pointing at a card that is now `widerlegt` — *„2 Karten stützen sich auf eine widerlegte Karte"*;
- **red links** older than three sessions;
- cards **nobody holds** that are load-bearing for an arrangement the party reads (the champion's Blind Spots, computed over cards instead of passages);
- a `widerlegt` card still held with `belief: true` by a character who was never told — *dead information walking*;
- a card whose only holder missed the last two sessions — *„Wenn Ossa Freitag fehlt, weiß niemand, wer das Schloss gebaut hat."*

Opened in the twenty minutes before 21:00, the box hands the GM tonight's material **out of what her
own table did**. This is the strongest answer available to *both* unmeasured behavioural bets at once:
it attacks cold start (a new world's box asks about its own red links, so the empty encyclopedia asks
questions instead of sitting blank) **and** it is the payoff that makes the visibility tax feel paid.
Fandom-grade **analysis**, not storage, and uncopyable without this data model.

### 9.2 „Der Auszug" — the product's real photograph, and it is made of paper

Because an article is an arrangement, the product can compose an arrangement **for a person and a
purpose** on demand, from the same renderer, in a different order — and hand it over as a physical
artifact.

> **„Was Sera über Haus Vharon weiß — in der Reihenfolge, in der sie es erfuhr, mit Quellen.
> Stand: Sitzung 14."** Six pages. Correctly redacted by the same projection that renders the screen.
> Every paragraph stamped with the session it was learned in and who said it. Printable, PDF,
> e-ink-friendly, and dated on the cover.

The Skriptorium needs a second export pipeline for this; here it is **the same renderer with a
different order and a print stylesheet**, and it exists the moment the Lesefassung exists. Three
consequences:

1. It is a **still image** — a bound booklet on a real table next to real dice. `RB-01-talespire`
   proves visual delight sells (90 % of 4,300+ reviews); we will never out-render a diorama, but a
   **Pen-&-Paper product whose marketing asset is paper** is a photograph nobody else in the corpus can
   take, and the champion admits (§15.10) it has none.
2. It is the **retention artifact**: three players get three genuinely different books of one
   campaign, and it is what a player keeps after the group breaks up.
3. It is the **sovereignty answer** (§7.5): the box is readable with no server, no account and no
   company. *Deine Welt öffnet sich auch ohne uns* stops being a promise about file formats and becomes
   an object you can hold.

### 9.3 „Kartensätze" — the smallest tradeable unit in the market

`RB-08` is explicit about how Foundry got where it is: **not discovery — creators.** 475 approved
systems and 2,758+ modules with **no store at all**. `RB-11` converts that into a mandate: the
go-to-market runs through authors. So make the authoring unit as small as it can possibly be.

Because a Karte is immutable, declarative, content-addressed and code-free, **a card is smaller than a
system, smaller than an adventure, smaller than a module.** The registry therefore trades
**Kartensätze**: a 40-card *Hafenstadt* kit, a 200-card SRD bestiary, a 12-card *Tavern rumours* pack, a
6-card *Ruling* set from one table's homebrew. Installing a set drops its cards into the GM's box
**unissued and unarranged** — inert until she arranges and issues them, which is the product's own
core gesture performed on someone else's work.

Three consequences and one risk:

- **The authoring cost per publishable unit collapses to minutes**, which is the causal mechanism
  behind Foundry's 475 systems applied one level lower.
- Because sets are content-addressed, two sets sharing a card **share the identity**, so the box
  deduplicates, and a correction to a widely-held card can be **offered** as a Berichtigung to everyone
  who holds it — a wiki with a supply chain, and the first upgrade path in this market that does not
  require trusting a stranger's JavaScript (`RB-10`, `RB-11`: our no-code invariant is the
  countermeasure, and it is only real if the format has no escape hatch — §10.4 of the champion,
  adopted whole).
- The **Forge** stays the Steam-shaped half (`RB-11`): the WFC generator, theme editor and rule-builder
  compile against a package *file* with **zero imports** from `codex/*`, `session/*`, `server/*`,
  enforced by a dependency-cruiser rule that is red from commit 1 — so a Kartensatz-authoring SKU stays
  available without being scheduled.
- **The risk, named:** shared card identity across universes is a privacy and integrity surface. Ruling:
  **dedup is per-universe, and `inhalt_hash` never crosses a scope boundary** (§6.6.1). A registry card
  entering a universe gets a fresh local id and a `derived_from` provenance edge; it is never the same
  row as somebody else's.

---

## 10. RB-11's five named attack targets, answered

| Target | Answer |
|---|---|
| **GM-machine-as-server trust model** | The GM's host is trusted to serve **her own campaign only**. It holds no other tenant's data, issues no cross-campaign tokens, and is not a certificate authority. Players connect to a host they were invited to by a Leseschlüssel bound to a `ReaderIdentity`; the host authenticates against the same server-side projection code as the hosted room — **one code path, two deployments**, gated by the `forge-standalone`-style CI target and the `Platform` port (B1). A GM who self-hosts can read every byte on her own disk — which is *already* true of her Google Doc, and is the point of self-hosting. |
| **Package format free of any code-execution escape hatch** | Champion §10.4 adopted verbatim, and **tightened by the thesis**: `Karte.inhalt` is a **single-block** closed AST — no headings, no nesting, no HTML, no Markdown at rest — so the AST is strictly smaller than the champion's and there is no `innerHTML` path in the renderer, lint-enforced. No embedded HTML/JS/Lua, no scripted SVG (re-encoded server-side or rejected), no remote fetch, no `url()` to a non-package origin, no iframes, no template-expression evaluation, no dynamic asset loading by constructed path. Formulas are an AST over a fixed operator set with no host access. **Regelkarten promote into the same AST**, so the growth engine adds zero expressive power. |
| **Browser/desktop parity** | B7: one repo, one build, two artefacts, **no SteamPipe step in CI** until a gate passes. B8: no desktop-only feature without a designed browser fallback, and the inverse binds — anything depending on service workers, OPFS or WebGPU needs a declared degraded path, because a LAN browser player is **not in a secure context** (§7.5). |
| **A live session's package-version pin** | `RulePackageInstallation` pins `(package_id, version)`; vendor-on-first-use merges a hashed, pinned copy into the universe; upgrades are explicit, diffable GM actions. And because a Revelation points at an **immutable card**, a package upgrade mid-session **cannot** change what a character already knows — here that is not a mechanism to build and test, it is a property of the store. |
| **A full campaign round-tripping through export, zero Steam** | `.chronicle` = the card graph + arrangements + relations + the revelation stream + the asset ledger. Cards are content-addressed, so the round-trip diff is a **hash comparison, not a semantic one** — the cheapest correct round-trip test in either candidate. CI gate in slice Z1, including a redacted-export case. Workshop packages, if ever, are stored as `{sourceId, version, sha256}` references, never re-hosted bytes. |

---

## 11. Reachability, with numbers — and one correction to the corpus

`RB-11` charges this identically to every option and says a candidate that hand-waves it should lose on
that ground alone. **What ships in v1: hosted rooms as the default join path.** This thesis *forces*
that choice more than the champion's does — a table needs to exist for four hours on Saturday, but **a
Kasten must be readable on Wednesday morning from a phone**, and a card box that is only reachable
while the GM's laptop is awake is not a knowledge base.

**Cost per session-hour, with inputs exposed so they can be attacked.** Cards are ~400 B; a 5-year
world of ~60 k cards ≈ 24 MB, ×3 for relations, FTS index and eight projections ≈ **~150 MB per world**,
under €0.05/month at commodity rates. Live deltas are card ids and small bodies: ~20–60 KB per
client-hour ⇒ **~0.4–1.2 MB per five-person four-hour session.** Relay compute ≈ **€0.001 per
room-hour**. All in, excluding assets: **< €0.01 per session-hour.** Assets carry the meter instead —
5 GB included per account, overage at cost (~€0.02/GB-month), a `StorageTarget` for BYO S3/R2/Backblaze
at our marginal cost of zero, and a Kaltes Regal moving untouched assets to infrequent-access after 12
months. *These are estimates with their inputs shown; none is a vendor quote.* The binding constraint
is relay CPU and socket count, not bandwidth — spike **S-R1**, 50 synthetic tables × 5 clients on one
4 vCPU node.

**What a non-technical GM behind CGNAT actually experiences:**

| Path | What actually happens |
|---|---|
| **Hosted room** *(default)* | Create world → send link → players in. She never meets the words port, certificate, NAT or IP. |
| **Electron host, everyone on Electron, same LAN** | Works, €0, full capability. Everyone installs. |
| **Electron host, browser players on LAN** | Works over plain `http://192.168.x.x` — **and it is not a secure context.** Service workers (no offline cache), OPFS and WebGPU are silently unavailable and the browser shows "Not secure". The join dialog says exactly that, with a button *„Im Desktop-Client öffnen"*. |
| **Own domain + ACME DNS-01** | The host binary carries an ACME client with a five-field wizard; DNS-01 needs no inbound port, so she gets a **real certificate on her home box behind CGNAT**, and with a public A record pointing at her LAN IP (the Plex trick) her **LAN** players get HTTPS with no PKI operated by us. CI-smoke-tested against a real ACME staging endpoint. |
| **Remote players, GM behind CGNAT, no hosted room** | **Correction to the corpus, and it matters:** DNS-01 solves *certificate issuance*, **not inbound reachability**. Behind CGNAT there is no inbound port, so remote players **cannot** reach her box — with or without a certificate. `CHAMPION.md` §12.2 reads as though the certificate closes this; it does not. The only three real answers are a **hosted room**, a **tunnel** (Cloudflare Tunnel / Tailscale Funnel — documented and CI-tested by us, operated by neither of us), or a **relay we run**. There is no fourth, and any candidate that implies one is wrong. |
| **Plex-pattern DNS zone + per-server wildcard PKI** | **Explicitly deferred, named as deferred, with its bill written down.** It is a service business, not a feature. |

**And the thesis's own reachability dividend:** because knowledge is atoms with a static renderer, the
offline fallback is a **real product, not a degraded one** — the static Publication and the **Auszug**
(§9.2) make the box readable with no server at all. Compare `RB-01-fantasy-grounds`: their cloud relay
already solves reachability for them, free, today. We are not ahead here. We are reaching parity by a
different road and shipping a paper artifact they do not have.

---

## 12. Business shape, licence, and Kaya's amendments

Inherited from the champion and `RB-11`, unchanged: **one-time GM licence (~€30, ≈ €23.50 net through a
merchant of record), players always free, sold direct.** No player ever buys anything. Charge for
storage and rooms, **never for features** — Owlbear's model, which the market accepts; Roll20 charges
for features and is the most complained-about product in the category (`RB-01-roll20`). Steam is a
gated shelf, not a growth engine (`RB-11`: GM Forge shipped our exact model there — 83 reviews, 1
concurrent player after eight years; the median 2025 Steam release earned $249). Themes: first-party at
launch, community kits through **our own registry**, Workshop only ever as a mirror.

| | Amendment | Answer under this thesis |
|---|---|---|
| **K1** | Themes + templates | Token-first from commit 1; ~16 seed lines per skin on a seed → ladder → end-token architecture; high contrast as one `--hc ∈ {0,1}` factor folded into one ladder. **Two kits at launch** — `Clean` (must be excellent with all art disabled) and `Archive` (editorial, built for reading, because the Lesefassung is the hot path). Contrast validated in CI **against painted pixels** via the live contrast probe. Illustration commissioning cost: **[needs a quote — no evidence base, will not invent one]**. |
| **K2** | Visual GUI rule-builder | The card-kind editor and the sheet builder are **the same tool**, because a sheet is an arrangement of Feldkarten. Sequenced engine → kind forms → layout → formula/trace (`OPEN-DECISIONS` K-Q3: core-first). **The Regelkarte is the go-to-market**: at the table it costs ~6 s and `ast: null`; formalisation happens in the Session-Diff or the Forge with nobody waiting; `fire_count++` by a deliberate keypress, never inferred — a registry ranking signal downloads cannot game. Conceded: **Alchemy shipped their Sheet Builder first** (`RB-01-alchemy`); we ship deeper, not prettier. |
| **K3** | State-of-the-art GUI | The Triumph shell, the Lesefassung as the crafted reading surface, the Strom as the live surface, the `Ctrl+K` overlay, the Nachhall lens. Motion carries state: a card arrives in the stream, travels to the arrangement, and a Berichtigung resolves a struck line into its correction. Reduced motion replaces travel with state change and keeps the arrival marker. Nothing animated on the map hot path. **No bare single-letter shortcut exists in the product** (NVDA and JAWS own the alphabet in browse mode); every command is reachable three ways, gated in `commands.yaml`. |
| **K4** | Differentiation | §5, with losses. Axes: the durable world, per-card knowledge, no-code authoring, accessibility, theming, portability. **Not** feature count, **not** the renderer, **not** minute one. |
| **K5** | Maps, generation, sprites | The **Wissenskarte** in Z2 — fog as knowledge projection, no walls, no LOS, no sweep — with the thesis's own gift that a region card and a lore card can be one card. Then UVTT import, tiling, budget lint, touch, and Owlbear's explicit quality switch (copy it outright). `RB-05`'s sequencing advice is adopted verbatim: **layout first, WFC as the detail filler**, because pure WFC struggles to produce readable, navigable dungeon topology on its own; the tile library is **slab-shaped**, TaleSpire's best idea. **This is still the reallocation Kaya must rule on** — `OPEN-DECISIONS.md`, unchanged and not resolved by this candidate. |
| **K6** | Distribution | `RB-11`, ratified and not re-opened. Browser non-negotiable — the Wednesday phone read *is* the thesis. One codebase, Electron shell as the self-hosting invariant's implementation. Hosted rooms as the v1 join path, §11. |
| **K7** | Game feel through staging | Fully honoured. Art is content and skin; the Kasten is semantic DOM; missing artwork is a designed state (kit loaded / deliberately disabled / 404 with a deterministic sigil from the title), never a broken one. |

---

## 13. What this candidate refuses

Everything in `CHAMPION.md` §16 — no arbitrary code execution ever; no embedded query language (Saved
Views and Anordnung queries are form-built declarative filters over a **closed predicate set**, no free
text, no joins, no recursion, hard cap 500 rows); no AI on the critical path and zero derived proposals
in Z1; no 3D; no feature-count war; no bare single-letter shortcut; no `at_time` in the choke point; no
`confidence` field; no anonymous bearer share token; no number printed as evidence that cannot go red;
no artifact that asserts a mechanism it does not implement without saying so **on the visible surface**;
and every spike declares `<meta charset="utf-8">` and a viewport tag on line one.

**Two refusals this thesis adds:**

- **No cursor crosses a card boundary.** No split, no merge, no cross-card selection, no document-wide
  paste-over. If a feature needs one, the feature is wrong, not the substrate.
- **No `UPDATE` on `Karte.inhalt`, enforced by database grant.** Immutability is not a coding
  convention. The one exception is the tombstone purge of §8.4, which is a separate, audited,
  enumerated-column grant.

---

*Candidate B, round 2. The bet, unhedged: **the atom is the product, and the page is a question.**
Where the Skriptorium buys an editor and gets prose, this buys composition and gets a wiki that
corrects itself in one gesture, a sheet and a map and an article that are one renderer, and a Ruling
Card that needed no grafting. It dies if the Schnitt cuts badly, if arranging is worse work than
writing, or if the market simply wants a document. Two spikes and one instrumented session decide it —
and I would rather be falsified in a day than defended for a round.*
