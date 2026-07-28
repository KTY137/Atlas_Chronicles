# Round 2 — Verdict

**Champion: A — Das Skriptorium (the document is the product). 2–1, 20:17.**
Ruled by Apollon's oracle, 2026-07-27. Lineage: [`product-A.md`](product-A.md) ·
[`product-B.md`](product-B.md) · [`attack-A.md`](attack-A.md) · [`attack-B.md`](attack-B.md) ·
[`features-A.md`](features-A.md) · [`features-B.md`](features-B.md) · four spike artifacts.
The merged result is [`../CHAMPION.md`](../CHAMPION.md) v3.

---

## 1. The scores

| Lens | A — Das Skriptorium | B — Der Zettelkasten | Winner |
|---|---:|---:|---|
| **Product & the flex** | **8** | 6 | A |
| **Engineering & buildability** | **7** | 4 | A |
| **Market & differentiation** | 5 | **7** | **B** |
| **Total** | **20** | **17** | **A, 2–1** |

**The margin, across three rounds:** 24:14 → 21:19 → **20:17**. It has narrowed every time. That
is not noise; §6 reads it.

**Both A-votes are conditional in writing, and the conditions are cheap to meet.** The engineering
judge names three to four days of work by B — the two owed spikes plus a measured `Sicht` — that
would reverse a four-point gap. The product judge names one running artifact in the wiki→table
direction. Neither condition requires B to be re-forged; both are experiments. That is the shape of
a win on evidence discipline, not a win on thesis.

---

## 2. Where the judges disagreed — and what that disagreement means

### 2.1 The split is not product-vs-market taste. It is a disagreement about *where the moat lives*.

All three judges agree on the one competitive fact the corpus has established: **Foundry stores a
journal page as an HTML string, so the smallest object it can draw a permission boundary around is
a whole page**, and retrofitting sub-page identity means touching every journal read path in an
ecosystem where only 1,590 of 5,338 modules were V14-compatible a month after V14. Nemesis attacked
that argument in both candidates and conceded it unbroken in both, by name.

**That moat is shared.** It is the fork's inheritance from `CHAMPION.md`, not a differentiator of
either candidate. So the vote was never about the moat — it was about *what you build on top of it*,
and the three lenses answered differently:

- **Engineering** ruled that the moat is only real if you can cross it yourself, and only one
  candidate has code that a hostile party can re-run. A priced its central claim, had that price
  broken three times **on its own running spike**, and answered all three fatals with mechanisms
  that *reduce* moving parts. B's answer to its four fatals is architecturally better argued and
  entirely unbuilt — and its largest repair (`Sicht`, the closed per-reader render tree) is a bigger
  unpriced item than the editor bet it was forged to delete. *"Trading a measured cost for a larger
  unmeasured one, and calling it a smaller requirement, is the exact failure mode round 1's verdict
  was written to prevent."*
- **Market** ruled that A chose the worst possible battlefield. A's own unique behaviour lives on the
  **writing surface** — where Obsidian is free, local, instant and already installed; where Notion's
  editor is better than we ship in year one; and where Foundry V14's journal is *already* ProseMirror.
  A's own §5 says *"they still win, bluntly."* Meanwhile B added the round's only go-to-market
  invention (Kartensätze: the smallest publishable unit becomes a 12-card pack, not a system or a
  module — Foundry's 475-systems-with-no-store mechanism applied one level lower), the round's
  cheapest acquisition still (the infobox knowable row by row per character, in a world ninety
  seconds old), and — decisively — kept all four importers launch-blocking while **A cut Roll20 JSON
  and Fantasy Grounds XML**, which round 1's verdict recorded as the lever that flips the market vote.
- **Product** split the difference and landed on A, but its flip condition is B's: the only two
  mechanisms proposed in either candidate where the wiki half makes the table half *mechanically*
  better — **Wissensprobe** (a roll whose bonus is computed from the cards this character actually
  holds, derivation printed in her own words) and **Betreten ist Ausgeben** (walking the party into a
  region offers to issue that region's cards, so the fog *is* the projection) — are both B's, both
  unbuilt.

### 2.2 The disagreement in one sentence, and it is not resolvable by averaging

> **A is the candidate that can be built; B is the candidate that would be worth having built.**

Engineering is right that A is the only candidate with evidence, and right that B's repair moved the
risk rather than removing it. Market is right that A is fighting three free mature products on their
strongest axis, has just narrowed the only proven switching mechanism in this category (RB-11:
Dungeon Alchemist reached the whole market by exporting to its rivals), and has no go-to-market
invention of its own. **Both are true at once, and the ruling has to carry both forward rather than
pick one and forget the other.** §4 is that carry.

### 2.3 The thing all three judges agreed on, which is worse news than the disagreement

Every lens, independently, in different words:

> **There is still no game in it.**

- Product: *"a product that cannot play at 21:00 is half the brief."*
- Engineering: *"defeat_pending, health, damage, condition, initiative and position appear zero times
  in product-B.md"* — and A's equivalent hole (three town guards, one Passage, one HP pool) was found
  as attack-A M12.
- Market: *"the half of Kaya's sentence that says 'PnP session' is still absent."*

Three rounds. Zero dice, zero HP, zero initiative, zero token in any shipped slice-1 definition until
B's `features-B` F12 added a combat strip **after** the attack. The champion's §15.4 has said this
since round 1 and nothing has moved it. This is now the single largest structural failure of the
process, not of either candidate, and §5 makes it round 3's binding work order.

### 2.4 The disagreement I will not smooth: B lost the round and won the ideas

Five of the six grafts in §4 come from B. Its substrate arguments — `revision_id` deleted by
immutability, template≠instance as a property of the store rather than a foreign key under permanent
defence, `widerlegt ≠ supersedes`, the round-trip test collapsing to a hash comparison, the package
format tighter than A's by construction, and §11's reachability section which Nemesis attacked for
real and *"came away with nothing"* — are the best-argued object in either round-2 document. B did
not lose on thinking. **B lost on artifacts**: its two nominated falsifying spikes (Z-1 the
single-card editor, Z-2 der Schnitt) were owed, and one was not attempted while the other was
*contradicted* by the file meant to support it (`spike-B1.html:1445` seeds the editor with `nur()`,
which strips every `[[link]]` and inline mark, then papers it at line 1500 with
`t.replace("Kestrel-Vertrag","[[Kestrel-Vertrag]]")` — §7.4 requires *"marks preserved, structure
discarded"*; the file shows structure discarded and marks destroyed).

That is a process finding as much as a product one. A round in which the loser supplies most of the
lineage is a round whose fork was drawn in the wrong place.

---

## 3. The ruling

**A — Das Skriptorium is champion.** The reasoning chain, in order of weight:

1. **Only one candidate produced falsifiable evidence, and it survived being falsified.** A's
   `identity.mjs` was installed, re-run and broken by Nemesis on three counts — `passageIdentity()`
   has no fixpoint (N1/N2 reproduce *with* the hardened plugin after nothing worse than a page
   reload); lineage guessed from byte-identical text concatenation, so deleting the leading space a
   split left behind makes `resolve('p_0002')` return `[]`; Ctrl+Z after a save orphaning revelations
   irreversibly in an append-only table with no compensating event kind. **Each repair makes the
   system smaller**: a server-owned pid registry with client leases replaces the paste-meta
   discriminator *and* the mint counter *and* the import id policy with one membership test; recorded
   `StructuralIntent` replaces a text-diff reconstruction at the far end of a network with evidence
   the editor already had and was throwing away; one new enum value (`supersede`) lets an append-only
   ledger book against a line without reopening the DB grant round 1 fought for. Repairs that reduce
   moving parts are the signature of a sound architecture with a buggy implementation.
2. **B's largest repair is larger than the bet it deleted.** B's entire buildability pitch was *"the
   champion's largest unpriced item is not paid for — it is deleted from the requirement list."*
   Round 2 showed the bet was not deleted, it was **moved**: from an editor that exists as a running,
   measured, 27-assertion spike to `Sicht`, a per-reader server-side render compiler that does not
   exist, has no number, sits on the critical path of slice Z1, and whose own author writes *"it
   replaced the Schnitt as the thing most likely to kill this candidate."* Plus a second mutable
   substrate with a CI-policed boundary, plus a strike-decay mechanism, plus a human-in-the-loop
   Schnitt. Z1 after the feature pass is larger than the Z1 that was already too large.
3. **The atom multiplies the enforcement surface by the size of the corpus.** attack-B demonstrated
   eight leak sites across two artifacts *written by authors who had just written the doctrine* —
   including `spike-B2.html:1187`, where the reader-switch handler announces *"6 von 13 Karten
   vorhanden, 7 nicht vorhanden"* into the accessibility tree while four sibling guards on the
   visible surface are correct. A document model makes the composition decision once per document;
   the atom makes it once per card, per edge, per annotation, per announcement. B's answer (`Sicht`)
   is the right answer — which is why it is grafted in §4 — but it is the *fix for a cost B created*,
   and A pays a smaller version of the same bill.
4. **Prose coherence is not recoverable, and it is half of Kaya's sentence.** attack-B MAJOR 6's
   second half is structural, not schedulable: a card that lives in four arrangements and is
   reordered per reader can carry no *sie*, no *danach*, no *deshalb*, no *die zweite* —
   features-B concedes it as *"a named permanent weakness."* B1's own fixture shows the author felt
   it: `k_g05` opens with `[[Lady Ilva Vharon]]` where a human writes *"Sie."* **That is not
   Fandom-grade encyclopedia prose; it is a card index in a serif font** — and Kaya's sentence starts
   with the word *Wiki*.
5. **The market case against A is real and is answered by graft, not by dismissal.** §4 takes B's
   go-to-market invention, B's acquisition photograph and B's two fusion mechanisms into the
   champion, and §5.1 restores the two importers A cut. The market judge's objection was to *A's
   choices*, not to A's substrate. Substrate survives; the choices are overruled.

### 3.1 The conditions under which this ruling is wrong

Stated so the ledger can check them, not as decoration:

- **Wrong if the arranging bet was never the real question.** If a `Sicht` prototype lands with real
  numbers (render p95 at 500 pinned passages; payload delta against the ~400 B/atom baseline that
  features-B itself says *"no longer describes what ships"*; the Leak Bench seeded red with the eight
  demonstrated sites going green) while A's three fatal repairs stay answered in prose, then B priced
  its two largest items with code, the editor-deletion saving becomes real rather than relocated, and
  the enforceability objection — the sole reason for the four-point engineering gap — is discharged
  by construction. **Round 3 must run that experiment on the champion regardless of who won**, because
  `Sicht` is now grafted and the champion has inherited the unmeasured item.
- **Wrong if the writing surface is genuinely lost.** If a usability pass shows GMs prefer Obsidian's
  editor over ours on the tasks that matter — and Obsidian is free, local, offline, instant and
  already installed, with no visibility tax whatsoever — then A's battlefield choice was the error the
  market judge says it is, and the product must be re-sited on the composition surface, where B was.
- **Wrong if the editor bill keeps growing.** 28 measured days became ~60 decomposed days for the
  editor half alone after the three fatal fixes — *"better than a paragraph and worse than a spike,"*
  in features-A's own words. A third consecutive re-estimate upward is a signal to buy composition
  rather than a cursor, i.e. to concede round 2 retroactively.
- **Wrong if collaborative editing arrives before it is solved.** `retire-on-split` versus CRDT is
  named by A itself as *"the item most likely to force a v2 rewrite,"* and the F2 fix **deepens** it:
  an intent journal is a per-client causal record, so two writers produce two streams with no total
  order. Round 3's thesis A is designed to detonate this deliberately rather than let it detonate in
  2028.

---

## 4. Grafted from the loser

B is lineage, not waste. Six ideas move into the champion; each is decoupled from the atom thesis and
works identically over a passage.

### G1 · `Sicht` as a **type** — the choke point learns to compose, not only to filter
*(features-B F2, nominated by the engineering judge as worth more than the candidate)*

The permission spine has been a **row filter** since round 1: `visible_passages()` decides whether a
row is sent. But every reader-facing surface renders a **graph** — edges whose visibility depends on
both endpoints, holder lists, denominators, provenance stamps, GM-only columns on visible rows, and
live-region strings. A row filter cannot express any of that, which is why eight leaks appeared in
3,700 lines of code written by people who had just written the rule.

So the server stops shipping data to reading surfaces and ships a **`Sicht`**: an ordered,
already-composed tree of `Knoten {art, kinder, texte:{sichtbar, aria, titel, alt, live}, handle}`,
with four properties enforced by the type rather than by review:

1. an edge node is emitted **only if both endpoints projected present**;
2. **the type has no denominator field at all**, so *"6 von 8"*, *"N von 41"*, *"nicht vorhanden 7"*
   become **unwritable** rather than forbidden;
3. holder lists and provenance stamps are reduced server-side, per reader;
4. **all five perceivable strings are one record, filled together or not at all** — which kills the
   entire class where the assistive channel announces what the visible surface correctly suppressed.

Plus `felder.yaml`, a sibling of `oracles.yaml`: every column on every table declares a disclosure
class and which `texte` slot it may reach; the projector is code-generated from it, and a migration
adding a column without a class **fails the build**. This is the champion's *unrepresentability over
policy* rule applied one level down, from the row to the field. It is grafted **unbuilt and named as
unbuilt** — §5.4.

### G2 · `Zustand` — a second, explicitly mutable substrate, with `defeat_pending` named
*(features-B F3, merged with features-A's `ActorInstance`)*

Both candidates conflated a knowledge log with a combat console, and neither noticed until Nemesis
opened the only door nobody had opened: combat. Knowledge is append-only, addressed and immutable at
the revelation boundary; **HP is not knowledge.** Three town guards over one Passage means three HP
pools, three condition sets and three `defeat_pending` states over one `Passage.content` — invariant
3 and invariant 4 broken in the most common object in a VTT.

Grafted: `Zustand` (UPDATE allowed, never in a Revelation, never citable, never in an arrangement,
exported as a savegame section) plus `ActorInstance` (the *Auftritt*, pinned to a template revision).
A stat that is durable and learnable — `Stärke 14`, `HP-Max 42` — is a passage; `hp_aktuell` is a
Zustand. **The dividend is a permission story no competitor separates at all:** *„Sera kennt die
Stärke des Hauptmanns, nicht seinen Willen — und sieht, dass er blutet."* A bounded per-session undo
ring lives on Zustand, so the table gets a real undo while the knowledge graph stays append-only.

### G3 · Die geteilte Infobox — the acquisition photograph the champion did not have
*(product-B §3.4, re-nominated in features-B F8b; named by the product **and** market judges as the
cheapest still in either candidate)*

A Fandom infobox is one block. Here **each infobox row is its own passage** (`block_type: feld`),
with its own provenance and its own revelation.

> *Die Gruppe kennt den Herrscher. Die Einwohnerzahl kennt niemand. Sera kennt das Gründungsjahr —
> falsch, seit Sitzung 3.*

One page, five readers, five different pages, in a world **ninety seconds old**, requiring no
campaign history and unrenderable by every rival. The champion's §15.10 has admitted for two rounds
that a knowledge graph does not photograph; this is nearly free under A's thesis and it is the answer.
The first-run flow produces it deliberately by seeding two rows and issuing one to one seat.

### G4 · Passagensätze + die Bezugskante — the round's only go-to-market invention
*(product-B §9.3 as repaired by features-B F7)*

RB-08 and RB-11 rule that discovery runs through creators and system authors, not gamers — Foundry
reached 475 systems and 2,758 modules **with no store at all**. So make the tradeable unit as small
as it can be: not a system, not a module, not an adventure, but a **set of passages** — a 12-passage
tavern-rumours pack, a 40-passage harbour-city kit, a 6-passage ruling set from one table's homebrew.
Authoring cost per publishable unit collapses from weeks to minutes.

And the repair Nemesis wrote in one sentence, adopted verbatim: **upgrade offers route over the
`derived_from` provenance edge — `(paket_id, index, version)` — never over a content hash**, so the
registry is asked a question about a *package* and never learns which universe holds what. Installing
drops passages in **unissued and unarranged**, inert until the GM performs the product's own core
gesture on someone else's work. It is channel strategy disguised as a data model, and it is the first
upgrade path in this market that does not require trusting a stranger's JavaScript.

### G5 · The two mechanisms where the wiki makes the table *mechanically* better
*(features-B N1 + N3 — the product judge's stated flip condition, taken rather than left)*

- **Die Wissensprobe.** The clause AST gains exactly **one** predicate over the knowledge graph:
  `haelt(passage_id)` and `haelt_etikett(tag, mindestens: n)`. So a homebrew rule can read *"+2 auf
  Menschenkenntnis gegen Haus Vharon, wenn die Figur mindestens 3 Passagen mit `#haus-vharon` hält"*,
  and invariant 6 prints the derivation **in her own words**: *"+2 · du hältst 4 Passagen über Haus
  Vharon (Sitzung 6, 9, 12, 14)."* Declarative, closed operator set, one predicate on an AST that
  must exist anyway. No competitor can copy it: none has a per-character knowledge set to query.
- **Betreten ist Ausgeben.** A map region and a lore passage are the same passage, so moving the
  party's tokens into a region **offers** to issue that region's passages to the characters present
  (`granted_via: betreten`, through the existing Reveal Sheet with its byte preview and 4-second
  abort). **The fog is not fog — it is the projection.** Wednesday morning Sera's phone shows the
  corridor paragraph because her character walked down it on Saturday, stamped with the session. It
  mints nothing, it manufactures no backlog, and it is the first automatic capture in three rounds
  that a GM does not have to clean up afterwards.

Together these are the champion's first honest answer to *"why would a Foundry table switch?"* —
still an answer that must be **built** before it is an answer at all (§5.1).

### G6 · Die Schonfrist and `widerlegt ≠ supersedes` — two small corrections that carry weight
*(features-B F5a; product-B §3.2, which Nemesis called the single most convincing sentence in the
candidate and could not touch)*

- **Die Schonfrist** replaces an undecidable question with one the database already answers. A
  passage with **zero revelations, zero inbound `stützt`/`zitiert` edges, zero clause riders, and no
  appearance in any built Publication or Auszug** is freely correctable in place: no supersede, no
  strike, no notification, no Session-Diff row. That covers every typo made during prep, which is
  when typos are made, with **zero German linguistics**. Four joins instead of a negation-particle
  classifier.
- **`widerlegt ≠ supersedes`.** When Lady Ilva testified in Sitzung 6 that the seal was authentic,
  the passage *"Lady Ilva bezeugt, dass das Siegel echt ist"* **was never wrong**. Ilva said it.
  Superseding it falsifies the record of a night that happened; marking it `widerlegt` is correct.
  **A passage can be a true record of a false statement.** Every document-first tool in the corpus
  collapses these two into *"edit the page."*

### Also taken, smaller

| From B | Where it lands |
|---|---|
| Der Riss — pairwise symmetric difference over held sets on a tag, *„#das-siegel · Sera 6 · Brannt 4 · Ossa 0 · Riss: hoch"* | folded into Die Fassungsprobe as the campaign-wide row |
| Die Zustellliste — a correction **delivers nothing** until the GM names recipients; default `zurückhalten`, reason printed (*„abwesend seit Sitzung 12"*) | Der Nachtrag's recipient grid |
| Tag-scoped, per-section cache invalidation; a reading surface is never live-updated mid-read | §7 realtime |
| The reading body as **one composite widget** — one tab stop, arrow keys between handles, `aria-activedescendant` — because 400 paragraphs is 400 tab stops | accessibility contract |
| `<html lang>` switched with content; `overflow-wrap: anywhere` + `hyphens: auto`; a **content-length** test axis (90-character German compound, 22-row infobox at 380 px) | K1 gates |

### Deliberately **not** grafted

- **The immutable-atom substrate itself.** It buys identity for free and costs prose coherence
  permanently. We keep the paragraph and pay for identity with 116 lines and a registry.
- **The automatic `ereignis` card per die roll.** B deleted it itself (F9) after it was shown to
  manufacture ~900 machine sentences per campaign, each arrangeable and orphan-facetable. A wiki
  containing *"Menschenkenntnis 17 gegen 15. Erfolg"* four hundred times is not a wiki.
- **Der Schattenabsatz / `PassageVariant`** (A's own §9.1, killed by features-A and the kill upheld
  here). Two texts per identity is arithmetic on a layer that just failed three times to maintain one
  invariant across a page reload. `belief:false` plus Die Fassungsprobe delivers the story value with
  zero new branching.
- **The Kartei recipe as a first-class surface.** B named it its own screenshot wound; under a
  document thesis it has no reason to exist.

---

## 5. Still unresolved — the work order for round 3

### 5.1 There is no game in it. Third round running. **This is now the binding item.**

Kaya wrote *"Wiki/Fandom + PnP **session**"* and named maps and WFC as the flagship. After three
rounds the champion has a knowledge product and a promissory note. The grafts in G2 and G5 give it a
skeleton — Zustand, `defeat_pending`, dice, initiative, undo, a region list, `haelt()`, Betreten ist
Ausgeben — and **not one line of it has been built or measured.** Round 3 owes a running artifact in
the **wiki → table** direction, not another paragraph about one. Concretely: a roll whose bonus is
computed from the passages a character actually holds, with the derivation printed from her own
projection, and a region whose entry issues its passages through the real reveal path.

Honest statement of status, in features-A's own words about its predecessor: *"the reverse direction
now has an artifact, not yet a reason."*

### 5.2 `Sicht` is grafted, unbuilt and unmeasured — and it is now on **our** critical path

We took the best idea in the round and inherited its bill. It needs the spike B never ran: render p95
at 500 passages; payload-size delta against the ~400 B/passage baseline; the Leak Bench seeded **red**
with attack-B's eight demonstrated sites, going green. Its stated price must be re-examined too:
client-side search-as-you-type and facet filtering over content on *player* surfaces become round
trips. GM surfaces keep a local index because the GM's projection is the full corpus.

### 5.3 Fandom-grade at scale is unproven after three rounds

No artifact in this lineage has search, an index, disambiguation, ranked autocomplete, or a list
longer than 41 rows. `retrieve()` with the permission join **inside** the SQL and the 5,000-entity
fixture are specified and gated and have never been exercised. **A Fandom-grade claim with no
demonstrated search is half a claim**, and it is the half named in the first word of the brief. It
needs its own spike, the way the editor got one.

### 5.4 The browser half of the editor is still unpriced

`prosemirror-view` is bundled and measured but not exercised. Contenteditable behaviour, IME
composition, Android soft keyboards, browser-native paste normalisation and screen-reader interaction
are unpriced — *"that is where text editors actually die,"* and A said so first, which is why it kept
the round. Both A-artifacts also shipped **one contenteditable host per paragraph**, not one
ProseMirror host; the editing behaviour both demonstrated has to be rebuilt on a different substrate.
The 5-day accessibility line remains the least defensible number in the estimate even after killing
§4.1's *"the same tree for both roles"* clause.

### 5.5 Multi-writer convergence — named as the item most likely to force a v2 rewrite, and it got worse

`retire-on-split` versus CRDT was A's honest *"I do not have an answer."* Recording `StructuralIntent`
**deepens** it: two writers produce two per-client causal streams with no total order. Slice 1 ships a
single-writer lock per Entry, which is what a solo GM's prep tool needs — and Feldnotizen, Die
Randfrage and any co-GM detonate it. Round 3's thesis **Der Konvent** exists to detonate it
deliberately.

### 5.6 The residue nobody can close, restated so marketing cannot forget it

The guard cannot be made total against a person. Die Zollgrenze closes the caret-position asymmetry;
Der Nachtrag stops typed text reaching a reader silently. Neither removes the leak: a GM who types a
secret into a paragraph three characters hold and presses `[nachreichen]` mid-combat has delivered it,
and no software distinguishes that from the legitimate case. **We moved the leak from silent and
structural to visible and volitional, which is the most a permission system can do about a person
deciding to share something.** Timo's line — *"your text editor just stopped you from leaking a
secret"* — is true for merging and pasting and **not true for deciding**, and saying otherwise is how
a safety mechanism manufactures the unearned trust that makes a GM stop writing carefully.

### 5.7 Minute one, unchanged

Owlbear is ~20 minutes to a running table with account-free joins. Our curve still crosses theirs
around session four in a market that decides at minute one. G3 (the split infobox in ninety seconds)
and §5.1 (a table that plays) are the only two levers proposed; neither is built.

---

## 6. What actually improved this round — and what did not

### Real, load-bearing improvement

1. **The item that went two rounds unpriced now has a price, a spike, and three known bugs.** That is
   the round's whole point and it was delivered: 116 SLOC, 27 assertions, 0.087 ms/keystroke at 300
   passages, 64.4 KB gzip — then broken three times **on its own code**, then repaired by mechanisms
   that are each smaller than what they replace. The champion no longer has a load-bearing unknown at
   its centre; it has a decomposed ~60-day bill with a named falsifier.
2. **The permission spine learned that it must compose, not merely filter.** `Sicht` is the largest
   architectural gain of the round, and it came from the losing candidate, discovered by an attack on
   the losing candidate. Filtering rows was never enough; eight leaks in code written by the doctrine's
   own authors proved it.
3. **Play state finally has a home.** `Zustand` + `ActorInstance` + `defeat_pending`. Invariant 4 was
   *uncarried by both candidates for three rounds* and nobody noticed, because no slice had combat.
4. **Go-to-market got its first invention.** Passagensätze + the Bezugskante is the first idea in the
   lineage that is a channel mechanism rather than a feature, and it is grounded in the one documented
   fact about how this market actually grows.
5. **The acquisition problem got a real answer.** The split infobox is a still image, in ninety
   seconds, unrenderable by every rival. §15.10 has been an open wound since round 1.

### Honest ledger of what did **not** improve

- **The table.** Nothing. Third round. Everything above is prep, projection and provenance.
- **Fandom-grade at scale.** Nothing. The atom has now been proved twice and the encyclopedia never.
- **Minute one.** Nothing.
- **The visibility tax.** Narrowed by Der Souffleur (reading aloud *is* the reveal — the only idea in
  the round that pays the tax with a gesture the GM was going to make anyway), unmeasured as ever.
- **Market evidence.** Zero new evidence that anyone wants any of this. B stated it flatly and
  offered no counter; A did not raise it. The instrumented four-hour session now owes **three**
  measurements, not one.

### The signal in the margin — read it plainly

24:14 → 21:19 → **20:17**, and the loser supplied five of six grafts. Round 2 was **not** a reshuffle:
the editor question was genuinely settled and the answer is genuinely in the repo. But the *fork* is
now exhausted. *"What is the atom of the codex, and who makes it?"* has been answered — the atom is a
paragraph, identity is bought and paid for, and the composition-versus-writing question is closed by
the prose-coherence finding.

**Both round-3 theses must therefore attack the champion from directions that neither round-2
candidate occupied**, and they must not die to the same attack. The fork chosen is not depth-vs-reach
and not wiki-vs-table, both of which are now settled or answered. It is:

> **Who — or what — authors the canon?**
> Round 2's champion assumes exactly one human, writing alone, before the session.
> Both of those assumptions are load-bearing, unexamined, and separately falsifiable.

Thesis **Der Konvent** says the canon is authored by *everyone at the table* and detonates the
multi-writer problem on purpose. Thesis **Der Abend** says the canon is the *residue of play* and
detonates the "prep is writing" assumption on purpose. One dies to convergence, moderation and *"the
players don't write"*; the other dies to *"the exhaust is a log, not an encyclopedia"* and *"your
table loses to Foundry."* Different attacks, different corpses, one round.

---

*Round 2, ruled. The cursor was bought, priced, broken and mended; the box was out-thought and
out-argued and out-evidenced, and it leaves five ideas behind that the winner needed. What neither
candidate did, for the third round running, is roll a die.*

> *Der Griffel hat den Preis bezahlt,*
> *der Kasten gab, was er erdacht —*
> *doch keiner hat am Tisch gewürfelt,*
> *und Runde drei wird das gebracht.*
