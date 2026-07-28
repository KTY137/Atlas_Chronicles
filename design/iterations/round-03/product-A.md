# Der Konvent (the canon is authored by everyone at the table) — Product Candidate A, Round 3

> **Schreiben ist nicht Lesen.**
> The canon is written by everyone at the table and read by each of them differently — authorship and
> readership are independent axes, and no product in the corpus has both.

This is an **evolution of `CHAMPION.md` v3 (Das Skriptorium)**, not a fresh start. Everything the
champion establishes is carried unless this file changes it: the paragraph as the atom, the pid
registry and leases (§5.1), `StructuralIntent` (§5.2), `(pid, gen)` and die Berichtigung (§5.3), die
Zollgrenze (§5.4), der Nachtrag (§5.5), die Schonfrist (§5.6), die Sicht and `felder.yaml` (§6.2),
`oracles.yaml`, the Leak Bench, die Goldene Signatur, `Zustand`/`ActorInstance`/`defeat_pending`,
Passagensätze und die Bezugskante, die Wissensprobe, Betreten ist Ausgeben, die Fassungsprobe, der
Souffleur, die Randfrage, die geteilte Infobox, `widerlegt ≠ supersedes`.

The runtime is **pinned by RB-11 and not re-opened**: one web/DOM codebase, React/TS + PixiJS,
DOM-authoritative, canvas as one view behind `MapRenderer`; browser app **and** Electron desktop
client; one-time GM licence sold direct through a merchant of record, players always free; Steam
gated behind a named test, the Forge kept separable by architecture.

---

## 1. The thesis, and what it costs

**The champion's unexamined assumption is that exactly one human writes, alone, before the session.**
Every mechanism in `CHAMPION.md` is downstream of it: a single-writer lock per Entry (§16.4), a
reveal that is always the GM's act, a Randfrage deliberately built *outside* the document so that
player writing "does not force the question early", and an honest confession that retire-on-split
versus CRDT is *"the item most likely to force a v2 rewrite"*.

Der Konvent detonates it on purpose.

> **The world is a commons with an editorial constitution, not one person's document.**
> Players write **Feldnotizen**. A one-key **Ratifikation** turns a note into canon, in place, in the
> article, stamped with its author. A **co-GM** edits the same Entry concurrently. A player's field
> note about an NPC she met **becomes that NPC's article**.

**Optimised for:** year five and the table that stays together; the co-GM, who is unmodelled in every
product in the corpus; the player's reason to open the app on a Wednesday, which is now *her own
writing* and not only her own book; and the campaign as an artifact with more than one name on it.

**At the cost of, stated as costs and not as framing:**

- **The solo GM who wants nobody in her document.** She gets the champion, with our overhead on top.
  The default constitution (§6.2) is deliberately the champion's exact behaviour plus one clause, so
  the overhead is small — but it is not zero, and the queue exists even when it is empty.
- **Minute one, which was already lost, is now lost worse.** A commons needs at least two people
  before any of it fires. Owlbear is ~20 minutes to a running table with account-free joins
  (RB-01-owlbear). The champion's curve crossed theirs around session four; ours crosses when a
  second person writes something, which may be session six or never.
- **Self-hosting is demoted from an invariant to a mode.** Asynchronous authoring requires the world
  to answer on Wednesday morning when the GM's laptop is shut. §7 says this in one sentence and does
  not hide behind it: *wer nur im LAN hostet, bekommt das Skriptorium.*
- **A new inbox.** The Antragsliste is a decision the GM did not have on Saturday. Inboxes are how
  software dies and we have just built one. §9.2.
- **The enforcement surface gains an axis.** Sicht must now compose across authorship as well as
  readership; the byline is an oracle. Round 2's attack found eight leak sites in 3,700 lines written
  by the doctrine's own authors, and we are adding a dimension to exactly that surface. §9.4.
- **Everything the champion already loses, unchanged.** Foundry's tactical ceiling, Obsidian's free
  instant editor, Fantasy Grounds' free cloud relay, TaleSpire's diorama. §5.

---

## 2. The flex

One moment. One gesture. One result.

### „Sie hat das geschrieben. Und er darf es nicht lesen."

Kaya opens **Bruder Alder** in front of Timo. It is an ordinary encyclopedia article: infobox, eleven
paragraphs, blue links, one red link. Under the title runs a thin strip — the **Autorenleiste** —
four small discs: Kaya, Sera, Brannt, and a greyed disc labelled *Ossa · bis 2029*.

Kaya: *„Drei davon sind von mir."*

**The gesture.** She reaches for the **Aus Sicht** dial in the page header — the champion's own
per-reader dial (§9.2) — and picks **Brannt**.

**The result.** Five paragraphs disappear. The page does not grey them, does not stub them, does not
say *„5 weitere"*; they are absent, and so are their bylines. Two of the paragraphs that vanished
carry **Sera's disc**.

> Timo: *„Moment. **Sie** hat das geschrieben. Und **er** kann es nicht sehen?"*
> Kaya: *„Sie war in der Gruft. Er war oben."*

**Why this is the flex and not a nice screen.**

1. **It is one still image**, photographable at 1× on a laptop: one page, one author strip, one dial,
   and a visible difference. The champion needed a campaign with history for its merge blocker; this
   needs one ratified note and two seats.
2. **It is a "wait, what?" because it violates the only mental model this market has.** Every product
   in the corpus binds writing and reading together. Foundry's journal pages are HTML strings with a
   per-page ownership level, so the smallest object it can draw any boundary around is a whole page
   (RB-01-foundry; conceded unbroken by Nemesis in both round-2 candidates) — and an ownership level
   that lets a player *edit* a page necessarily lets them *see* it. Roll20's handouts carry per-player
   "can see / can edit" toggles on the whole handout (RB-01-roll20). Nobody has a page where the
   author of paragraph seven is a person who cannot read paragraph nine.
3. **It requires all three of our load-bearing layers at once** — block identity, per-character read
   authorisation, and now per-passage authorship — and no rival has the first of the three.
4. **It is a negative and a positive in one frame.** The champion's flex was a refusal (Backspace is
   a permission action). This one is a *grant*: the table wrote the encyclopedia, and the encyclopedia
   still keeps the table's secrets. Both halves of Kaya's sentence are in the same photograph.

**The second still, ninety seconds old, for the newcomer who has no campaign yet:** the champion's
geteilte Infobox (§3.2) with one row written by a *player* — *„Gründungsjahr · eingetragen von Sera ·
Kanon seit Sitzung 3 · Brannt weiß es nicht."* Same photograph, no history required.

**The honest amendment.** Timo's line is true about *this page*. It is not true about *this table*:
Sera can tell Brannt in the voice channel, and no software prevents that. We inherit the champion's
§16.5 residue verbatim and extend it — a commons makes it larger, not smaller, because now five
people hold writable secrets instead of one.

---

## 3. How the two halves fuse

Six mechanisms. The champion had six and three ran wiki → table; Der Konvent keeps all of them and
adds three that only exist because more than one person writes.

### 3.1 Die Feldnotiz — the player's capture surface *is* the wiki's inbox

`Ctrl+Enter` in a player's own Kodex, on a phone or a laptop, at the table or on a train: one line,
anchored to a passage she holds or free-standing on an Entry she can see. **It is not a new table.**
It is a `Passage` with `geltung: notiz`, `autor_user_id` set and `autor_actor_id` set to her
character — inheriting scoping, revisions, revelations, search, lineage and export for free, exactly
as the champion's Marginalie and Randfrage do.

A Feldnotiz is **hers immediately**: it lands in her own book, it is searchable by her, it is exported
in her Kodex. **Nothing is asked of the GM.** That is the whole on-ramp: writing costs a player one
keystroke and produces something *for her*, before the GM has done anything at all.

Visibility default: author + lead GM. The constitution (§6.2) can widen it; it cannot narrow it.

### 3.2 Die Ratifikation — one key turns a note into canon, **in place**

An Antrag (a Feldnotiz submitted for canon, `geltung: antrag`) renders in the GM's margin rail
**beside the sentence it is anchored to**, in the article, where she is already reading. Three keys,
all inherited from the champion's blocker-and-fix pattern (fifth use of one dialog component):

| Key | Result |
|---|---|
| `Alt+K` | **Kanon.** The passage moves into the prose at its anchor ordinal. Structural op → takes the Strukturbrief (§4.1) → one lineage event, `kind: ratify`. The paragraph keeps its author's disc forever. |
| `Alt+X` | **Abgelehnt, with a one-line reason that is delivered to the author.** A rejection with no reason is what kills a commons. The reason is a Passage too, `geltung: notiz`, addressed to her. |
| `Alt+W` | **Weitergeleitet** — the note becomes a Randfrage (champion §4.6), i.e. a question in the prep queue instead of a claim in the canon. This is the escape valve for *"nice idea, not yet true."* |

`[Nichts tun]` is the default and requires no keystroke; an unratified Antrag is inert and stays the
author's private note. **Silence never publishes anything.**

### 3.3 Ratifikation ist Enthüllung — the fusion gesture, at the table, at 21:16

**This is the mechanism the champion cannot have, and it is the fastest path in this category from
"someone said a cool thing" to "it is in the encyclopedia forever."**

When an Antrag is ratified **during a live GameSession**, the ratification routes through the existing
Reveal Sheet with its byte preview and 4-second abort, pre-selecting **the characters present in this
session** — `granted_via: ratifikation`, a new value on the champion's existing enum. One key, one
confirmation, and:

- the sentence is canon in the article, at its anchor, in the prose;
- it is **held** by everyone whose character was there, stamped *„gelernt Sitzung 15 · Kanon seit
  Sitzung 15 · geschrieben von Sera"*;
- it is **not held** by the character who was upstairs, including **the author's own byline**, which
  is suppressed for non-holders (§9.4);
- it is a `PassageLineage` event and a `Ratifikation` row, both append-only, both attributed.

Foundry's answer to the same table moment is: the GM types it into a journal later, if she remembers.

### 3.4 Der Konventspiegel — the table's disagreement becomes the prep

Two players wrote about the same thing and they do not agree. This is not a merge conflict. **It is a
scene.**

Detected structurally, with zero semantics and zero AI: two Feldnotizen or two ratified passages
anchored to the same pid, or carrying the same `Etikett`, **whose authors hold different revelation
sets for that subject.** The champion already computes exactly this quantity — der Riss, the pairwise
symmetric difference over held sets on a tag (§9.3). Der Konventspiegel is der Riss with an authorship
column:

> *„#der-ring · Sera hält 4, hat 2 geschrieben · Brannt hält 1, hat 1 geschrieben · gemeinsam 1 ·
> Riss: hoch · ihre Notizen widersprechen sich."*

Twenty minutes before 21:00 the GM's Docket hands her tonight's scene out of **what her own players
wrote**, not out of what she remembered to prep. Two joins, no scoring, no AI, every row its own
derivation.

### 3.5 Der Streitfall — the canon may hold two accounts, and say who believes each

Multi-authorship produces a species the champion has no slot for: **two ratified passages, by
different authors, that contradict.** `widerlegt ≠ supersedes` (champion §8.3) handles *the world
contradicted a claim*. It does not handle *two people at this table remember the night differently*.

The constitution may declare a **Streitfall**: both passages stay canon, both are marked, and the
article renders **both, side by side**, each with its author and its holder count.

> *„Sera: Der Ring gehörte seiner Schwester. · Brannt: Der Ring war ein Pfand."*

The GM does not have to decide, and **not deciding is a supported state with a name** rather than an
unresolved edit war. A wiki that can hold two contradictory canonical accounts and show who believes
each is something Fandom structurally cannot do, and it is exactly what a five-year table produces.
One render recipe over rows that already exist.

### 3.6 Die Mitleitung — two GMs, one Entry, 20:45

Kaya writes the tavern. Timo, her co-GM, writes the crypt three paragraphs down. Both cursors visible,
both typing, **no lock dialog, no "Kaya schreibt" banner, no turn-taking** — because §4 makes
structure serialized and text concurrent. The co-GM is the most common unmodelled role in this market:
Foundry has ownership levels but one GM role; Roll20 has no co-GM concept in its journal permissions;
Fantasy Grounds is GM-hosted, singular.

Table-side dividend of the same spine: **a co-GM may hold write rights on `Zustand` (monster HP,
initiative, conditions) without holding write rights on the canon.** He runs the fight; she keeps
writing. That separation is unrepresentable in every product in the corpus, because they all have one
GM flag.

### 3.7 Inherited unchanged

Die Revelation-Kante · Lineage und `resolve()` · die Marginalie · **die Wissensprobe** (`haelt()`,
`haelt_etikett()`) · **Betreten ist Ausgeben** · die Randfrage · der Souffleur · die Fassungsprobe.

### 3.8 The worked session — Sitzung 15

| Time | At the table | What the product does |
|---|---|---|
| Mi 07:40 | Sera on the train, on her phone | Her Kodex. She writes a Feldnotiz: *„Bruder Alder trägt den Ring seiner Schwester an einer Schnur. Er nimmt ihn nie ab."* She types `[[Bruder Alder]]` — **a red link, because Alder has no article**. 20 seconds. It is hers; nothing is asked of anyone. |
| Mi 07:41 | — | She presses `Alt+A`: **Antrag gestellt.** It appears in Kaya's Docket as *„1 Antrag · Sera → [[Bruder Alder]] (neu)."* |
| Sa 20:45 | Kaya and Timo prep together | Kaya writes the tavern in `Haus Vharon`; Timo writes the crypt in the same Entry, four paragraphs down. Two cursors, no lock. Timo presses Enter to split; Kaya presses Enter 180 ms later. Timo's intent wins the spine; Kaya's is **rebased and applied** — her margin line reads *„auf neuen Stand angewandt · 21:45:03"*. Neither of them notices. |
| Sa 20:52 | Kaya reads the Antrag | `Alt+K`. The Reveal Sheet opens **pre-selecting nobody** because no session is live; she confirms *nur Kanon*. **A new Entry `Bruder Alder` is created from the red link, with Sera's sentence as its first paragraph**, byline: Sera. Kaya's search now returns an article she did not write. |
| 21:14 | Sera rolls Insight against the Vharon ledger and wins | Kaya reveals paragraph four to Sera. 4-second toast, countdown ring; nothing has left the server. Inherited unchanged. |
| 21:16 | Brannt: *„Wer hat Alder das erzählt?"* Kaya improvises Ossa | `Ctrl+Enter` Marginalie, `[[Ossa]]` red link. 6 seconds, never left the paragraph. Inherited unchanged. |
| 21:31 | Brannt's player, on his own laptop, mid-scene: *„mein Char hat den Ring schon mal gesehen — beim Pfandleiher"* | He writes a Feldnotiz and presses `Alt+A`. It arrives in Kaya's margin rail **beside Sera's sentence**, because both are anchored to the same pid. |
| 21:32 | Kaya sees both | **Der Konventspiegel** fires in the rail: *„2 Anträge, ein Anker · Sera und Brannt widersprechen sich · Riss #der-ring: hoch."* She presses `Alt+S` — **Streitfall**. Both ratify. Both land. The Alder article now carries two contradictory sentences with two faces. **She has just turned a table disagreement into next session's scene without deciding anything.** |
| 21:33 | Delivery | `granted_via: ratifikation`, pre-selecting Sera and Brannt (present) and **not** Vesper (absent since Sitzung 12). Vesper's book changes in no way — no strike, no stamp, no live region. Inherited from der Nachtrag's recipient grid. |
| 21:47 | Kaya reads boxed text aloud | Der Souffleur, Space ×3. Inherited unchanged. |
| 23:40 | Session end | **Session Diff:** 11 revelations · 3 Anträge (2 ratifiziert, 1 weitergeleitet) · 1 Streitfall · 2 margin notes · 1 red link resolved · 1 rebased split · 0 misses. **Autorenzeile: Kaya 14 Absätze, Sera 2, Brannt 1.** |
| Mi 07:40 | Sera on the train again | The `Bruder Alder` article. Her own sentence, in an encyclopedia, with her name on it, and Brannt's contradiction beside it. **She wrote a page of a book that a table of five will still be reading in 2031.** |

**Play → knowledge, and knowledge → play, and neither direction is inferred.** Every row in the
middle column is an append-only `AuditEntry` or `Ratifikation`. **No AI is anywhere in this loop**
(invariant 5), and nothing is captured automatically: every canonical sentence exists because a human
wrote it as a sentence and another human pressed a key.

### 3.9 What Der Konvent refuses, on purpose

**A log is not an encyclopedia.** We do not mint passages from dice rolls, chat lines, token moves or
session transcripts. Round 2 already deleted the automatic `ereignis` card per roll after it was shown
to manufacture ~900 machine sentences per campaign (verdict §4, *deliberately not grafted*). Der
Konvent's answer to "the canon should grow from play" is **more authors, not automatic capture** —
because the thing that makes a sentence canon is that somebody meant it, and somebody else agreed.

---

## 4. Der Satz vom Halm — the multi-writer problem, solved

The champion names this its most likely v2 rewrite (§16.4), and the round-2 verdict names three
distinct failures (§3.1, *"wrong if collaborative editing arrives before it is solved"*):

1. `retire-on-split` is a **global** decision about a document;
2. two writers splitting different paragraphs produce **two lineage streams with no merge order**;
3. a CRDT merge can **resurrect a retired pid**, or converge two peers on different children;
4. and the F2 fix makes it worse: an intent journal is a **per-client causal record**, so there is now
   a second thing that must converge.

**All four are one mistake: the champion made a single object — the Entry document — serve as both
the collaboration unit and the identity unit.** Separate them and the research problem disappears.

> ### **Struktur ist serialisiert. Text ist nebenläufig.**

### 4.1 Der Strukturbrief — the spine has exactly one writer, and it is the server

Every structural operation — split, merge, insert, delete, move, retire, ratify — is a
`StructuralIntent` (champion §5.2, unchanged) that now carries **`base_entry_seq`**. The server holds
a monotonic per-Entry sequence and is the **total order**. Therefore:

- **There is never more than one lineage stream per Entry.** Failure (2) is not merged; it is
  **unrepresentable**. Two clients may *propose* concurrently; only the server's sequence exists.
- A stale intent gets **`409 STALE_SPINE`** plus the lineage delta since `base_entry_seq`, and the
  client **rebases**, using exactly the rule the champion already has:
  - all claimed parent pids still live → apply at recomputed ordinals, margin line
    *„auf neuen Stand angewandt"*;
  - a claimed parent was retired by an intervening event → **refuse, name the person, offer the
    children**: *„Der Absatz, den du teilen wolltest, wurde von Timo geteilt. [Auf die obere Hälfte]
    [Auf die untere] [Verwerfen]."*
- **Structural steps are rare by measurement, not by hope.** The champion's own spike established that
  *typing produces no structural steps* (§5.2) — which is why its 0.087 ms keystroke headline survives.
  The exclusive path is exclusive only for the rare operation, and it costs one round trip
  (~30–80 ms hosted) that the user never sees because it does not block typing.
- The **Strukturbrief** proper is a soft advisory lease (8 s, auto-renewed while a client is emitting
  structural steps) whose only job is to make the 409 rare in the common case of two people typing in
  different paragraphs. **It is an optimisation, not a correctness mechanism.** Correctness is the
  server sequence. A lease server that dies costs latency, never consistency.

### 4.2 Der Binnentext — the CRDT never touches identity

Inline text inside **one** passage is a sequence CRDT (Yjs-shaped) over characters and marks, keyed
`(entry_id, pid, gen)`.

**The CRDT contains no pids, no ordinals, no block boundaries, no revelations and no structure.** It
cannot resurrect a retired pid because it does not know what a pid is. Failure (3) is eliminated by
what the type does not contain — the champion's own *unrepresentability over policy* rule (§6.4),
applied one layer down.

y-prosemirror's dangerous behaviour is precisely at block boundaries. **We never let it near a block
boundary.** A Binnentext document is a paragraph's inline content and nothing else.

### 4.3 Die Umbettung — the one lossy edge, made loud

The one place the two layers touch: **a passage is retired (split, merged, ratified into place) while
another author has un-acked inline ops inside it.**

On retire, the Binnentext is **sealed** (frozen, archived with the revision) and the children get
fresh Binnentext documents seeded from the partition offsets the intent already records (§5.2). Then:

| Pending op | Fate |
|---|---|
| Entirely inside one child's offset range | **Transplanted** into that child, applied, acked. The author sees her text where she put it. |
| Straddling the cut | **Materialised as a Feldnotiz** anchored to the first child, carrying her original text verbatim, attributed to her, with a one-key *[an dieser Stelle einfügen]*. **Never dropped, never silently relocated.** |
| Inside a passage retired by a `ratify` or `merge` | Same rule against the surviving child. |

**This is the honest seam and §9.3 calls it the hardest weakness in the candidate.** A sentence a
person was writing across a boundary somebody else just moved cannot be reconstructed correctly by any
algorithm. We chose **loud and recoverable** over **quiet and wrong**. There is no third option and we
will not pretend there is.

### 4.4 Why this is smaller than what it replaces

Following the round-2 verdict's own signature test — *repairs that reduce moving parts are the
signature of a sound architecture*:

- **Deleted:** the single-writer lock per Entry, the presence banner it needed, the "Kaya schreibt"
  state, and the entire CRDT-versus-lineage question.
- **Added:** one integer column (`entry_seq`), one field on an existing message (`base_entry_seq`),
  one error code (`409 STALE_SPINE`), one advisory lease with no correctness role, and one CRDT
  scoped so tightly it has no interaction with anything the champion built.
- **Unchanged:** `passageIdentity()`, the registry, `mergeGuard()`, die Zollgrenze, `resolve()`,
  `supersede`, der Nachtrag. **None of the champion's three round-2 repairs is reopened.**

**The falsifier, stated so the ledger can check it:** if a spike shows the rebase refusal (§4.1, case
two) fires more than **twice per four-hour co-authoring session**, or if Umbettung straddle-cases
exceed **one per session**, the granularity is wrong and the round must say so. Both are measurable
and neither is arguable. **Status: unbuilt.** This candidate's central claim is a design, not a
number, and §9 says so before an attacker has to.

---

## 5. The differentiation ledger

Grounded claim by claim in the RB-01 briefs. **A ledger with no losses is a lie.**

### Foundry VTT

**What we do that it cannot.** A journal page is stored as an **HTML string**, so the smallest object
Foundry can draw a permission boundary around is a whole page, and its ownership levels bind reading
and writing together — a player who can edit a page can read all of it. There is therefore no
representation for *this paragraph was written by Sera and cannot be read by Brannt*. Retrofitting
sub-page identity means touching every journal read path in an ecosystem where **only 1,590 of 5,338
approved modules were V14-compatible one month after V14**, on a median-19-module install, with 475
systems (RB-01-foundry). RB-05 records the same ecosystem anchor forcing them to abandon a **renderer**
migration mid-cycle as *"far more sweeping and disruptive than we had planned"*: what freezes the
renderer freezes the schema. Nemesis attacked this argument in both round-2 candidates and conceded it
unbroken in both.

**What it still does better, bluntly.** Dynamic lighting, walls, vision, Scene Levels, Regions V2 with
attachable Behaviors, Active Effects V2 — a decade deep, and reviewers' single most-cited reason
players are impressed. 2,758 modules, 475 systems, a real Marketplace (557 → 1,227 products in year
one), $50 once and perpetual, ten years of trust, total data ownership. **For a table that wants to
play licensed 5e tonight with bought content and good lighting, Foundry beats us outright and will
for years.**

### Roll20

**What we do that it cannot.** Handouts carry per-player *can see / can edit* toggles on the whole
handout; there is no cross-linking wiki, no quest tracker, and prep tooling is widely rated basic
(RB-01-roll20). Player-authored canon has no representation. Their sheet/system authoring is HTML +
CSS + sheetworkers in a dialect that *"cannot properly be tested outside Roll20"*, with custom sheets
Pro-gated; Beacon is a developer SDK. **And they have no campaign export at all**, declined custom
content export, and a Character Vault users report failing — while we ship `.chronicle` round-trip,
static export and Foundry-shaped journal export. Two documented breaches (2018, 2024) make
*"here is the door out"* a sharper argument against them than against anyone.

**What it still does better.** ~10M registered accounts and the **LFG network effect — the one asset
nobody can buy**. Licensed compendiums (D&D, Pathfinder, CoC) and the Demiplane integration. Zero
install, functional table in 10–15 minutes, genuinely playable free tier. *"Everyone is already on
Roll20"* is not a feature we can out-build.

### Fantasy Grounds

**What we do that it cannot.** Story entries, quests, notes and parcels are GM-authored objects inside
a GM-hosted campaign; content licensing is per-GM-account and shared down to players (RB-01-fg). There
is no authorship axis and no ratification. Ruleset authoring is XML/Lua edited in Notepad++,
inheritance-based, **with no official GUI** — the flank K2 attacks.

**What it still does better, and this is our sharpest loss.** The deepest rules automation in the
market; ~3,500+ licensed products; **free-to-play since 2025-11-08** — client, hosting and unlimited
games, no licence; and **a cloud relay that already solves reachability for their tables, for free.**
§7 costs us real money to approximate the thing they give away. That is the honest asymmetry and no
design decision of ours changes it.

### Owlbear Rodeo

**What we do that it cannot.** *"No journals/quests/wiki natively"* (RB-01-owlbear) — the wiki half
does not exist, so there is nothing to co-author; the community extension `Journal!` is a third-party
patch. No knowledge model, no provenance, no authorship.

**What it still does better.** ~20 minutes to a running table, **account-free anonymous player joins**,
Warp Core with a 137-megapixel map loading on an iPhone 14 Pro Max, one-click CV auto-fog, and **an
explicit quality switch — the cleanest performance-UX decision anyone in this market has shipped**
(copy it outright). Their pricing model — storage and rooms, never features — is the one we adopt.
On minute one they beat us and Der Konvent widens the gap.

### Alchemy

**What we do that it cannot.** Universes with lore/worldbuilding, handouts and lore sharing are all
GM-authored and GM-shared (RB-01-alchemy); no player authorship, no ratification, no per-paragraph
reveal, no provenance stamp. No public API, no mod/plugin system, no community module ecosystem
(absence claim). No published accessibility statement; a reviewer with dyslexia reports text
readability problems; motion-heavy with no documented reduced-motion option — against our invariant 8,
which is architecture and gated from slice 1.

**What it still does better.** The best-looking product in the category. Built-in voice and video with
active-speaker highlighting. A native Streamer Mode reviewers call unique. And **a fully GUI,
drag-and-drop, block-based Sheet Builder in open beta with a System Builder in public beta — they beat
us to the first half of K2 and shipped it first.** Our answer must be *deeper*, not prettier: their
builder has no scripting by design and no formula trace; ours must show its derivation (invariant 6).

### TaleSpire

**What we do that it cannot.** No general campaign-data export; campaign state lives on vendor servers;
desktop-only, no browser/tablet/mobile, English-only. There is no text canon to author at all.

**What it still does better, and it is directly on my thesis.** TaleSpire ships **real-time
collaborative building on persistent cloud boards, with seat-holding guests able to enter while the
owner is offline** (RB-01-talespire). **It is the one competitor that has already solved the *social*
problem of several people building at once, in a shipped product with ~90 % positive across 4,300+
reviews — while Der Konvent has solved it on paper.** Plus the gasp: 2,100+ tiles, real 3D dioramas,
and *slabs*, the most elegant sharing primitive in the category. We should stop trying to
out-photograph a diorama and we should read their concurrency model before we ship ours.

### And the rivals our actual prospect compares us to

World Anvil, LegendKeeper, Kanka, Notion — and **Obsidian**, which is free, local, offline, instant,
already installed, has a decade of plugins and **no visibility tax whatsoever**. We do not win on the
editor; we win on what you write into, and now on *who else writes into it*. Obsidian's answer to
five people co-authoring is a git repository with merge conflicts.

> **The summary loss:** for a table that wants to play a licensed system tonight with bought content
> and good lighting, **all six beat us, and three of them are free**. We win the table that intends to
> still be playing in **this world** in 2031, with **more than one name on the title page**.

---

## 6. The data shape

`02-domain-model.md` is inherited whole: `User → UniverseMembership → Universe → Campaign →
GameSession`; roles on memberships, never on users; `AuthSession ≠ GameSession`; `Actor` as the
aggregate; `CharacterController`; scoped `KnowledgeEntry` (realised as `Revelation`);
`RulePackageInstallation`; append-only campaign-scoped `AuditEntry`. Presence stays three separate
things (control / attendance / connection). Everything in `CHAMPION.md` §8 stands unless listed here.

### 6.1 What changes on `Passage`

```text
Passage (pid PK, gen, entry_id, ord, block_type, content, clause NULL, anchor_pid NULL,
         created_revision_id, retired_revision_id NULL,
         geltung ∈ notiz | antrag | kanon,          -- NEW: authorship standing
         autor_user_id NOT NULL,                    -- NEW: who typed it
         autor_actor_id NULL)                       -- NEW: in whose character's voice
```

**`geltung` is orthogonal to `belief` and to `Haltung`.** `belief` is the GM's ground truth about a
fact; `Haltung` is a character's own confidence; **`geltung` is standing in the canon**. A ratified
passage may be `belief: false` (a canonical lie), and a Feldnotiz may be perfectly true and still not
canon. Conflating them is the mistake this section exists to prevent.

**A Feldnotiz is not a new table** (mēden agan): it is a Passage, and it inherits scoping, revisions,
revelations, lineage, search, export, `Sicht` and the Leak Bench for free — exactly as the champion
did for Marginalie, `feld` rows and `aloud` blocks.

### 6.2 Die Verfassung — three dials, three presets, and the default is the champion

```text
Verfassung (campaign_id, version, geaendert_von_user_id, at,       -- append-only, versioned
  wer_darf_schreiben ∈ nur_sl | sl_und_mitleitung | alle,
  was_wird_kanon     ∈ nur_sl_ratifiziert | mitleitung_ratifiziert | selbstkanon_im_eigenbereich,
  eigenbereich       ∈ keiner | figurenartikel | figurenartikel_und_feldnotizen,
  streitfall_erlaubt bool,
  austritt           ∈ bleibt_kanon | wird_zurueckgezogen | autor_entscheidet,
  nachfolge          ∈ keine | benannt(user_id) | konvent(mehrheit, karenz_tage))
```

**Default preset `Die Kanzlei`** = `nur_sl / nur_sl_ratifiziert / figurenartikel / true /
bleibt_kanon / keine`. **This is `CHAMPION.md` exactly, plus one clause: a player owns her own
character's article.** That one clause is the only thing every table already does informally, and it
is the cheapest possible entry into the thesis.

Two other presets ship: **`Der Konvent`** (`alle / mitleitung_ratifiziert /
figurenartikel_und_feldnotizen`) and **`Die Freie Stadt`** (`alle / selbstkanon_im_eigenbereich`), for
the West-Marches shape. **No other configuration surface exists.** The constitution is declarative
data, versioned, exported with `.chronicle`, and it **cannot grant code execution** — invariant 2 is
untouched because the Verfassung is an enum record, not a policy language.

### 6.3 New rows

```text
Ratifikation (id, passage_id, gen, entry_seq,
              antragsteller_user_id, antragsteller_actor_id NULL,
              entschieden_von_user_id, session_id NULL,
              ergebnis ∈ kanon | abgelehnt | frage | streitfall,
              grund_pid NULL, anonym bool, at)          -- append-only by DB grant

Binnentext   (entry_id, pid, gen, crdt_state bytea, sealed_at NULL)
             -- inline content only; contains NO pid, NO ordinal, NO revelation, NO structure
```

`PassageLineage` gains **`entry_seq`** (server-assigned, monotonic per Entry) and two `kind` values:
**`ratify`** and **`streit`**. `StructuralIntent` gains **`base_entry_seq`**. `Revelation.granted_via`
gains **`ratifikation`**. `Strukturbrief` is ephemeral and never persisted beyond its TTL.

### 6.4 `Sicht` composes across authorship — the hardest data change

`felder.yaml` (champion §6.2) currently declares one class per column: a **disclosure class**
(readership) plus which of the five `texte` slots it may reach. It now declares **two**:

```yaml
Passage.autor_user_id:
  offenlegung:    holder_only          # readership axis (existing)
  autorenklasse:  verfassungsabhaengig # NEW: authorship axis
  texte:          [sichtbar, aria]
```

`autorenklasse ∈ oeffentlich | autor_und_sl | nur_sl | verfassungsabhaengig`. The projector is
code-generated from the file as before; a migration adding a column without **both** classes fails the
build.

**The consequence, stated as a rule rather than a wish:** *the byline is an oracle.* Knowing that Sera
wrote something on this page leaks that Sera knows something on this page. So under any constitution,
**a non-holder sees no byline at all — not a redacted byline, not a count, not "1 weiterer Autor"**.
The `Sicht` type still has no denominator field (§6.2 rule 2), so *„3 von 5 Autoren"* is unwritable
rather than forbidden, at the new axis as at the old one.

Six new `oracles.yaml` rows, each with an owner and a green test or a red build:
`autorenleiste` · `antragsspur` · `ratifikations_ledger` · `konventspiegel` · `streitfall_render` ·
`autor_facette` (the author filter in search — the most dangerous of the six, because a facet with
zero results is itself an answer).

### 6.5 Two liabilities the thesis creates, named here rather than discovered later

- **Who owns a departed player's paragraphs?** `Verfassung.austritt`, default `bleibt_kanon` with
  attribution retained. The GDPR path is deliberately narrower than deletion: **the attribution can be
  pseudonymised on request while the passage stays**, because erasing a name is a different act from
  erasing a paragraph out of five people's shared five-year world. It cannot reach a `.chronicle` on
  someone's disk, a built Publication or a printed Konventsband — the champion's §16.11 residue,
  multiplied by the number of authors.
- **A player's writing is her copyright.** `Herkunftsvermutung` (champion §11.5) now needs a per-author
  dimension: a Passagensatz exported from a co-authored campaign carries **die Zuschreibung**, a
  per-passage attribution manifest, and export is **blocked** for passages whose authors have not
  cleared them — counted out loud, as the existing export dialog already counts foreign content.

---

## 7. Reachability, ruled — with a number

RB-11 charges this identically to every candidate and rules that hand-waving loses the round alone.
The champion's §14.2 table is inherited **unchanged and unhedged**:

| Path | Ships in v1? | What a non-technical GM behind CGNAT experiences |
|---|---|---|
| **Hosted room** (default, and now a **requirement**) | **Yes** | Create world → copy link → players in. She never meets the words port, certificate, NAT or IP. |
| Electron host + Electron players | Yes, €0 | Everyone installs; full capability; works behind CGNAT on a LAN. |
| Electron host + browser players on LAN | Yes, **degradation printed on the tin** | `http://192.168.x.x` is not a secure context: **no service workers → no offline codex**, no WebGPU, no OPFS, "Not secure" chip. The join dialog says exactly this. |
| Own domain via **ACME DNS-01** | Yes | A GM who owns `aldenfall.de` gets a real certificate on her home box behind CGNAT; DNS-01 needs no inbound port. We operate no PKI and no DNS zone. CI-smoked against ACME staging. |
| **Remote players, GM behind CGNAT, no hosted room** | — | **DNS-01 solves certificate issuance, not inbound reachability.** Behind CGNAT there is no inbound port. The only three answers are a **hosted room**, a **tunnel** (Cloudflare Tunnel / Tailscale Funnel — documented and CI-tested by us, operated by neither), or **a relay we run. There is no fourth.** |
| Plex-pattern DNS zone + per-server wildcard PKI | **No — explicitly deferred and named as deferred** | A service business, not a feature. Bill written down, unpaid. |

**What Der Konvent changes, in one sentence, and it is a cost:**

> **Wer nur im LAN hostet, bekommt das Skriptorium.** Asynchronous authoring requires the world to
> answer on Wednesday morning when the GM's laptop is shut. Under the champion the hosted room was an
> argument; under Der Konvent it is a **requirement**, and a GM who refuses it gets a single-writer
> product — which is a coherent, supported, honestly-labelled mode, not a broken one.

### The number, with its inputs shown

Champion baseline: play deltas 30–80 KB per client-hour ⇒ 5 clients × 4 h ≈ **1.0–1.6 MB/session**;
egress ≈ **€0.00014**; compute ≈ **€0.001 per room-hour**; **< €0.01 per session-hour**, dominated by
compute. Binding constraint: **relay CPU and socket count**, not bandwidth (spike S-R1: 50 synthetic
tables × 5 clients on one 4 vCPU node).

**Der Konvent's delta, computed rather than asserted.** A Feldnotiz ≈ 200 B of text; a small Yjs
update runs roughly 1.5–3× raw, plus the Antrag notification to one GM ≈ 300 B ⇒ **≈ 600–900 B on the
wire per note**. At an optimistic 5 players × 4 notes/week = 20 notes/week ⇒ **≈ 18 KB/week**, i.e.
**< 0.1 MB per campaign-month — under 1 % of the play traffic.** Bytes are not the issue.

**Sockets are.** Async authoring means a player may hold a socket for ~10 minutes on a Wednesday:
5 players × 2 async visits/week × 10 min ≈ **1.7 client-hours/week**, against ~20 client-hours/week of
play. That is **+8.5 % socket-hours**, so S-R1's 50 tables per 4 vCPU node becomes **≈ 46**. Cost per
session-hour is unchanged at **< €0.01**; the node count rises ~9 %.

*All figures are estimates with their inputs shown. None is a vendor quote.* **The falsifier:** if
S-R1 with async authoring enabled falls below **40 tables per node**, the socket model is wrong and
async authoring must move to a polled/HTTP path before launch.

### The RB-11 attack targets, answered

| Target | Answer |
|---|---|
| **GM-machine-as-server trust model** | Der Konvent does not rely on it; hosted rooms are v1 and are now a requirement. Self-hosting remains an invariant *for the world's data* (export, `.chronicle`, BYO storage), not for its availability. |
| **Package format free of any code-execution escape hatch** | Inherited §11.4 unchanged. **The Verfassung is an enum record, not a policy language**; a package can never grant, automate or bypass a ratification. |
| **Browser/desktop parity** | The Feldnotiz surface is identical in both, and **the phone is browser-only and is the thesis's primary player surface** — so parity is not a nicety here, it is the thesis. `Platform` port with both impls from commit 1. |
| **A live session's package-version pin** | Inherited B3. Extended: a **ratification during a live session pins the package revision** of any package passage the ratified text cites, so a mid-session upgrade cannot change what was just made canon. |
| **Full campaign round-trip, zero Steam** | `.chronicle` carries `lineage.jsonl` (with `entry_seq`), the pid registry, `ratifikation.jsonl`, `verfassung.json` and `zuschreibung.json`. **Honest detail: export flattens each Binnentext to its content.** Round-trip is byte-identical on content, lineage, ratifications and attribution, and **discards concurrent-edit history** — a real, named, deliberate loss, tested in CI. |
| **Discovery through creators (RB-08/RB-11)** | The visual rule-builder is the go-to-market and UVTT + Foundry/Roll20/FG-shaped export ships **at launch**, not late (inherited §12.4). Der Konvent adds one thesis-native lever: §11.2. |

---

## 8. The six zones under Der Konvent

Per `03-triumph-ui-direction.md`: six-zone shell (Session · Story · Cast · Library · Table · Forge),
independent axes content × skin × role × mode × a11y, one Scene with three render recipes, theme
manifest, DOM authoritative with Pixi behind `MapRenderer`, accessibility and performance as gates.
**Nothing in the shell doctrine is re-opened.** Two additions to the Primary Stage are demanded and
justified below.

| Zone | Under Der Konvent |
|---|---|
| **Story → der Konvent** | Still home; still the writing surface. **Adds die Autorenleiste** (§8.1) and **die Antragsspur** in the margin. Each passage handle carries its author disc; a passage you cannot read has no disc, because there is no passage. |
| **Session → der Rand** | The apparatus in the margin, unchanged in shape, gains one channel: **Anträge, beside the sentence that caused them.** Ratification never navigates away from the article. Before: der Docket, now carrying der Konventspiegel. After: der Session Diff, now carrying die Autorenzeile. |
| **Cast → Blätter, die schreiben** | A sheet is still an article layout over the same passages. **Adds the Feldnotizen tab, which is the player's authoring surface** — and under the default constitution, her character's article is her own writing region. This is where a player learns she is allowed to write. |
| **Library → das Regal** | Unchanged typed views, plus **die Autorenliste** (who wrote how much, per Entry and per campaign) and the **Ratifikationsledger** as a readable, filterable, exportable object — the thing that makes co-authored Passagensätze sellable (§11.2). |
| **Table → die Wissenskarte** | Unchanged (regions are passages; Betreten ist Ausgeben; no walls, no LOS, no sweep). **One thesis touch: a player may anchor a Feldnotiz to a region** — *„wir haben die Leiche hier vergraben"* — and ratification turns it into that region's passage. The map becomes co-authored without becoming co-drawn. |
| **Forge → das Formular** | Theme Studio + schema/type editor + rule-builder + generators + package tests, unchanged. **Adds die Verfassung** — three dials and three presets. Justified: the constitution is declarative, versioned, exportable, package-shaped data, and the Forge is where declarative artifacts are authored. It must **not** live in campaign settings, because it must travel with `.chronicle`. |

### 8.1 The two shell changes I demand, and why

1. **Die Autorenleiste is a permanent, first-class element of the Primary Stage**, not a hover
   affordance and not a history panel. The champion's stage has **no authorship affordance at all** —
   correct under a single-writer thesis, fatal under mine. It is one strip of discs under the title
   plus one disc on each passage handle. It is also, by §6.4, a permission surface from the first
   commit and gets its own row in `oracles.yaml`, its own per-role entry in die Goldene Signatur, and
   its own Leak Bench fixture (a non-holder's DOM and accessibility tree must contain **no** disc, no
   name, no count).
2. **Die Antragsspur is a new channel in der Rand**, subject to the champion's §12.6 layout rule
   unchanged: the rail precedes the stage in DOM order at all widths; below 960 px it collapses into
   the sticky Apparatleiste and carries only its live channel, while **blockers stay inline at the
   caret and never move into the rail.**

Both obey the inherited input contract: no bare single-letter shortcut, every command reachable three
ways, `reserved-keys.md` respected, touch verbs named (long-press a passage handle → Antrag stellen ·
Ratifizieren · Ablehnen).

---

## 9. Weaknesses

### 9.1 „Die Spieler schreiben nicht." — the mortal one

There is **zero market evidence** that players will write. RB-01 across six products shows **no
competitor models player-authored canon at all**, which is either an unoccupied position or an
unwanted one, and the corpus cannot tell us which. Owlbear has no journal at all and is the fastest
growing onboarding story in the category — that is at least weak evidence that tables do not want more
text surfaces.

If the median table produces zero Feldnotizen in eight sessions, **Der Konvent collapses to Das
Skriptorium plus overhead**, and the overhead is a byline strip, a queue, an authorship axis in the
permission spine and a CRDT.

Mitigations are honest and weak: the default constitution hands a player the one region she already
wants (her own character's article); die Randfrage (inherited) is a lower-effort on-ramp than writing;
and the Feldnotiz produces something *for her* before it asks anything of the GM.

**Falsifier, measurable in the instrumented four-hour session plus a three-session follow-up:
≥ 1 Feldnotiz per player per three sessions, and ≥ 40 % of Anträge ratified.** Below either number,
the thesis is refuted and the round must say so in those words.

### 9.2 We invented an inbox, and inboxes are how software dies

Every Antrag is a decision the GM did not have on Saturday. Under a loose constitution the queue can
grow faster than she clears it, and a GM staring at 40 unread Anträge on a Friday night is the exact
person who already refused to maintain a wiki.

Mitigations: `Alt+K` / `Alt+X` / `Alt+W` are one key each; `[nichts tun]` is free and default;
the rail shows a **hard cap of 20** with a *„alle von Sera ratifizieren"* bulk action; and the default
constitution keeps the queue near-empty by construction.

**Gate:** median Antrag age **< 1 session** and steady-state queue **≤ 20**. If either fails, the
constitution defaults are wrong — or the thesis is.

### 9.3 GENUINELY HARD — die Umbettung is lossy exactly where my thesis creates pressure

§4.3. Structure serialized + text concurrent solves lineage, CRDT-resurrection and the two-stream
problem cleanly. **The seam is real and cannot be closed.** When a passage is retired while another
author has un-acked inline ops:

- ops inside one child transplant cleanly;
- **ops straddling the cut cannot be placed correctly by any algorithm**, and become a Feldnotiz with
  her verbatim text and a one-key re-insert.

Her *sentence* survives; her *intent* — a thought spanning a boundary somebody else just moved — does
not. She has to re-place it by hand. **This fires precisely when two people are working fast in one
article, which is precisely the moment Der Konvent manufactures.** It is unmeasured; it is the item
most likely to be hated in usability testing; and it needs the spike the champion's editor got and
this candidate has not run. **There is no correct answer here — only loud versus quiet, and we chose
loud.**

Second-order: the rebase refusal (§4.1 case two) is a dialog that appears *because someone else was
working*, which is socially expensive in a way a lock dialog is not, because a lock at least explains
itself before you type.

### 9.4 The byline is an oracle, and I am adding an axis to the surface that already leaked eight times

Authorship metadata is information. *"Sera wrote three paragraphs here"* leaks that Sera knows three
things, even with every byte of text withheld. `Sicht` must now suppress bylines, author discs, the
Antragsspur, the Ratifikationsledger, "recently edited", der Konventspiegel and the **author facet in
search** — where a filter returning zero results is itself an answer.

That is **six new `oracles.yaml` rows and a second class on every column in `felder.yaml`**. Round 2's
attack demonstrated **eight leak sites in 3,700 lines written by the authors of the doctrine
themselves**, including one that announced *"6 von 13 Karten vorhanden, 7 nicht vorhanden"* into the
accessibility tree while four sibling guards on the visible surface were correct. **I am multiplying
that surface deliberately**, and the only thing standing between me and the same outcome is that
`Sicht`, the mechanism that would prevent it, is itself **grafted, unbuilt and unmeasured** (champion
§16.2) and now sits on my critical path twice over.

### 9.5 Concurrency degrades badly on exactly the connection my thesis depends on

The Strukturbrief and the intent sequence are server round trips. A player writing on a train — the
scenario the whole thesis leans on — hits deferred Enters and 409 rebases on a bad link. There is
**no offline authoring in v1**; and a browser player on a plain-`http://` LAN cannot have service
workers at all (RB-11, champion §14.2), so **offline authoring is structurally unavailable to exactly
the players a self-hosting GM invites.** Der Binnentext is a CRDT and *could* work offline — but
`geltung`, ratification and the reveal path are all server-authoritative (invariant 1), so an offline
note can be written and cannot be submitted. We ship that honestly and it is a real hole.

### 9.6 We are building for a table size nobody has

Three dials and a ratification queue are **too much machinery for five friends who trust each other**,
and **far too little for the one segment that would actually want a commons** — open-table West
Marches, play-by-post, and 40-member Discord servers, which need roles, bans, rate limits, revert
wars and an appeals path we will not build. `Die Freie Stadt` preset is a gesture at that segment, not
an answer to it. **We have no evidence for either segment**, and the segment that pays is unknown.

### 9.7 The thesis raises our operating floor while Fantasy Grounds lowers theirs

§7: hosted rooms move from convenience to requirement, +≈9 % nodes, and a permanent hosting tail for
worlds that must answer between sessions. Meanwhile Fantasy Grounds went **fully free on 2025-11-08
with a cloud relay included** (RB-01-fg). We are adding cost to the exact axis where a mature
competitor just went to zero.

### 9.8 Carried from the champion, unchanged and unsolved

No game in it beyond the inherited combat strip (§10) — third round · Fandom-grade search unproven ·
the browser half of the editor unpriced, and Der Binnentext puts a **CRDT** on that same unpriced
contenteditable surface · the sanitiser is still the most security-critical function in the product ·
pid churn leaks into permanent anchors · the guard's residue is a person, and a commons makes it five
people · asymmetric numeric secrets remain subtractable · the right to erasure collides with
append-only, now across multiple authors.

---

## 10. The first slice

**„Der ratifizierte Absatz."** One workflow. One universe, one campaign, browser only, hosted room,
**four people: one GM, one co-GM, two players.** Small enough to build; it already demonstrates the
flex.

**Brutally, what this slice refuses:** no map canvas, no clauses, no `+2`, no Wissensprobe, no
Fassungsprobe, no Souffleur, no Konventspiegel, no Streitfall, no Passagensätze, no Zuschreibung, no
Nachfolge, no Konventsband, no anonymous Anträge, no Verfassung *editor* (slice 1 ships the three
presets as a radio in campaign creation and nothing else), no second skin, no Electron, no theme
editor, no generators, no WFC, no rule-builder, no AI, no Roll20 or Fantasy Grounds importers
(launch-blocking, per the round-2 verdict — **not** slice-blocking).

**The workflow, end to end:**

1. A GM writes **one article with four paragraphs** and one `[[red link]]` in the Konvent.
2. She opens a session. **Two players join by link**, display name, no account. **One co-GM joins.**
3. **Concurrency, demonstrated:** the co-GM types in paragraph two while the GM types in paragraph
   four. Two cursors. **No lock dialog.** He presses Enter; she presses Enter 200 ms later; her intent
   is **rebased and applied**, and her margin line says so — *vorläufig → auf neuen Stand angewandt*.
4. **Authorship, demonstrated:** a player writes a **Feldnotiz** from her own Kodex **on a phone**,
   anchored to a passage she holds, containing a `[[red link]]`. `Alt+A` → Antrag.
5. It arrives in the GM's margin rail **beside the sentence that caused it.**
6. **`Alt+K`.** The passage lands in the prose at its anchor, with the player's disc on it, and **the
   red link becomes a new Entry whose first paragraph the GM did not write.**
7. **The flex, demonstrated:** ratification routes through the Reveal Sheet, pre-selecting the two
   characters present and **not** the absent one. Then: open the article as the absent player and show
   in DevTools that the paragraph **and its byline** are **measurably absent from the response body,
   the DOM and the serialised accessibility tree.**
8. Press the **Aus Sicht** dial through all three readers and photograph three different pages with
   three different author strips.
9. **Die kleinste echte Tafel, inherited and non-negotiable** (round-2 verdict §5.1, the binding
   item): dice, `Zustand` with `hp_aktuell`/`initiative`/`lage`, **`defeat_pending` with explicit GM
   confirmation** (invariant 4), the bounded per-session undo ring — **and one thesis touch: the
   co-GM holds `Zustand` write rights without canon write rights.** He runs the fight; she writes.
10. Export → import into an empty instance → **diff empty**, including `lineage.jsonl` with
    `entry_seq`, the pid registry, `ratifikation.jsonl` and `verfassung.json`.

**Contents (delta over the champion's slice 1, which is otherwise inherited):** `geltung` ·
`autor_user_id` / `autor_actor_id` · `Ratifikation` · `Verfassung` (3 presets, no editor) ·
`Binnentext` · `entry_seq` + `base_entry_seq` + `409 STALE_SPINE` + rebase · die Umbettung · der
Strukturbrief (advisory) · die Autorenleiste · die Antragsspur · six new `oracles.yaml` rows · the
second class in `felder.yaml` · six new Leak Bench fixtures · per-role Goldene-Signatur entries for
the byline strip.

**Cut from the champion's slice 1 to pay for it, honestly:** die Fassungsprobe, die Randfrage (its job
is done by `Alt+W` on an Antrag), der Souffleur, die geteilte Infobox as a *seeded* first-run flow (the
`feld` block type stays; the scripted onboarding moves to slice 2). **Never cut:** the scoping work,
`Sicht`, die Zollgrenze, the merge guard, the combat strip, Foundry + Obsidian import.

**Acceptance demo, one take, no cuts:** four paragraphs → co-GM and GM type simultaneously → both
press Enter → one rebases visibly → a phone writes a Feldnotiz → `Alt+K` → the sentence lands with a
face on it → the red link becomes an article the GM did not write → the absent player's DevTools shows
no bytes and no byline → the **Aus Sicht** dial through three readers, three different pages →
initiative, a guard to `defeat_pending`, undo → export → import → diff empty.

**The claim, stated so it cannot be inflated:** slice 1 is *the smallest honest demonstration that a
table can co-author an encyclopedia which still keeps the table's secrets, with a working combat
strip.* It does not claim to be a virtual tabletop.

---

## 11. Creative extensions

Three the thesis makes possible and nobody asked for, plus one small one.

### 11.1 Der Konventsband — the printed proceedings, with the table in the colophon

The champion has a printed Chronik. Under Der Konvent the print artifact **changes species**: a bound
volume whose **colophon lists the table by name**, whose paragraphs carry marginal author sigils, and
whose appendix is the ratification ledger — *„Sitzung 15 · Sera trug den Ring vor · ratifiziert."*
Every player's copy is built from **her** projection and **her own paragraphs are marked**, so five
people get five genuinely different books of the same world with their own writing in them.

This is the retention artifact, the birthday present and the reason a campaign that ended in 2031 is
still on a shelf in 2040. **No VTT in the corpus can produce it**, because none of them knows who
wrote what. Cost: the existing print builder plus one field.

### 11.2 Die Zuschreibung — the attribution manifest, and the GTM lever it unlocks

RB-08 and RB-11 rule that discovery runs through **creators**, not gamers — Foundry reached 475
systems and 2,758 modules with no store at all. The champion's answer is Passagensätze: make the
tradeable unit as small as possible.

Der Konvent adds the piece the whole category is missing. **Roll20's Marketplace has no built-in
royalty splitting between collaborators** (RB-01-roll20, verified); Foundry's revenue-share percentage
is not publicly stated anywhere. **Co-authored content is a solved social problem and an unsolved
accounting problem everywhere in this market.**

We ship **die Zuschreibung** — a per-passage attribution manifest inside every `.chronicle-pkg` — from
commit 1, **because our own core loop produces it as exhaust.** A 40-passage harbour-city kit written
by four people at one table exports with four names and a per-passage split, and an upgrade routes
over the existing `derived_from` provenance edge `(paket_id, index, version)` — never over a content
hash, so the registry never learns which universe holds what.

**The GTM consequence:** our creator population is **tables**, not lone authors, which multiplies the
addressable creator base by roughly the size of a table. That is a channel claim with a mechanism
behind it, not a hope.

### 11.3 Die Nachfolge — the campaign outlives the GM

The constitution has a slot nobody else has a place to put: **who becomes lead GM when the lead GM
stops.**

```text
Verfassung.nachfolge ∈ keine | benannt(user_id) | konvent(mehrheit, karenz_tage)
```

Under `konvent`, if the lead GM's account is inactive for `karenz_tage`, the remaining members may
**ratify a succession** — using the ratification screen that already exists — and leadership transfers
**without transferring ownership of anyone's writing**, because attribution is append-only and
per-passage.

This answers, with one enum, one timer and zero new UI, **the single most common way a five-year
campaign dies** *and* the single most common fear about any hosted product (*"what if you disappear?"*)
— and it is only expressible because authorship is distributed. Roll20 has no campaign export at all;
Foundry's world is a file one person owns.

### 11.4 Der anonyme Antrag — the small one

One boolean on `Ratifikation`. A player may submit a Feldnotiz **anonymously to the GM** — which
matters for the shy player, and matters more for the player writing something about *another player's*
character. It is the only place in the product where provenance is deliberately withheld, and the
label says exactly what it is: **social anonymity, not cryptographic.** The server knows, the audit
log records it, and the dialog says so in one line, because a privacy promise we cannot keep is worse
than no promise.

---

## 12. What Der Konvent bets, in one paragraph

The champion bought the cursor and made the paragraph the atom that carries permission, provenance,
mechanics, history and lineage. **Der Konvent takes that atom and gives it a second name on it.**
Structure is serialized by a server sequence and text is concurrent inside a passage, which retires
the champion's own most-likely-v2-rewrite item at the cost of one integer column and one honest lossy
seam. Authorship and readership become independent axes, which is the photograph — *she wrote it, and
he cannot read it* — and which doubles the enforcement surface of a permission spine that is not yet
built. If the players write, this is a product no competitor can construct, because none of them has
an object smaller than a page to attribute. **If the players do not write, this is the champion with a
queue.** That is the bet, unhedged, and §9.1 states the number that settles it.

> *Der Griffel war nur einer,*
> *nun führen ihn die vielen —*
> *und wer die Seite mitschreibt,*
> *darf trotzdem nicht drin lesen.*
