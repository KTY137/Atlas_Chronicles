# Features — Candidate B, „Der Zettelkasten", round 2

**Feature Architect · answering `attack-B.md` (4 fatal, 7 major, 4 minor) · read against
`product-B.md`, `spike-B1.html`, `spike-B2.html`, `00-intake.md`, `RB-11`.**

Nemesis found four fatals that the candidate's own honest ledger never saw, and she named the
repair for three of them in one sentence each. This document does not argue with any of the
eleven fatal/major findings. It accepts every one and answers with **structure**, not with prose.

Three of her findings are answered by **deleting** something rather than adding it. That is the
best outcome a round can produce, and it is where I started.

**The one-line summary of what changes:**

> The thesis survives and shrinks. **`Karte` stops meaning „everything durable" and starts meaning
> „everything *known*."** Everything the table *manipulates* moves to a second, explicitly mutable
> substrate. And the projection stops being a set membership test and becomes a **closed render
> tree the client cannot add to.**

---

## Part I — the four fatals

### F1 · Die Haltung — `belief` is deleted as a column, and the truth becomes an edge

**Answers:** FATAL 1 (`belief` has no disclosure rule; both artifacts render GM-only truth to the
holder — B2:1040 `für Sera falsch`, B1:1141 the unguarded `widerlegt` marker and the refuting id).

**What it is.** Nemesis is right that `belief` is used in two incompatible senses. The repair is
not a disclosure rule for the column — it is the **removal of the column**, because both senses
already have a home elsewhere in the model.

1. **`Revelation.belief` is deleted.** A revelation records that a character was issued a card.
   Nothing else. There is no truth flag on it and therefore nothing to redact.
2. **World-truth is the `widerlegt` edge, which §3.2 already invented and which Nemesis named as
   the single most convincing sentence in the candidate.** *„Sera kennt das Gründungsjahr, falsch"*
   is exactly: Sera holds `f3` („Gegründet 1044"); `f3` is `widerlegt` by `f3'` („Gegründet 1071");
   Sera does not hold `f3'`. She therefore sees `f3` **plain — no stamp, no marker, no italics, no
   id.** The GM sees the edge because she holds both endpoints. Edge projection is a conjunction
   over endpoints (F2), so this is enforced by the same one line that enforces everything else.
3. **Character confidence becomes `Haltung`, and its author is its audience.**

```text
Haltung (revelation_id, gesetzt_von_user_id, wert ∈ { glaubt | zweifelt | verworfen },
         gesetzt_at, notiz_karte_id NULL)
```

   The holder sets her own stance, or the GM sets it *for an NPC she runs*. **Disclosure rule, and
   it is a tautology rather than a policy: a Haltung is visible to the person who wrote it and to
   the GM. Nobody else.** §4's dotted rumour outline on the Wissenskarte is now a player marking
   *her own* intel as doubtful — which is a table gesture people actually make, and which cannot
   leak, because she is reading back her own keystroke.

**Why it is sensible now.** It is a net deletion of one column and one leak class, it makes §9.1's
best prep row (*dead information walking*) **computable and correct** — a character holding a card
whose `widerlegt` edge she cannot see — and it turns a security patch into a genuine play feature:
the party can now be *visibly, mechanically wrong about something they are sure of*, which is the
whole point of the boolean §3.1 called „the one boolean that makes this a story tool."

**Cost:** small. One column dropped, one 5-column table added, one render branch deleted from both
spikes.

**Invariants:** 1 (the field with no disclosure rule no longer exists — *unrepresentability over
policy*, the champion's own principle applied to a column). 6 unaffected.

---

### F2 · Die Sicht — a closed, per-reader render tree, and the client cannot compose

**Answers:** FATAL 2 (the projection is a bitmap over card ids; the product renders a graph —
eight demonstrated leak sites across two artifacts written by authors who had read the doctrine).
Also the enabling repair for F1, MAJOR 6 and MAJOR 10.

This is the largest change in the document and the one that decides the candidate.

**The finding, restated so the answer is judged against it:** `visible_karten()` decides whether a
**row** is sent. Every leak Nemesis found is a **composition** over rows the reader is entitled to
— edges, holder lists, denominators, provenance stamps, live-region strings. Row-level projection
cannot fix any of them, and the atom multiplies the number of composition decisions by the size of
the corpus. A lint on import paths will not hold that.

**What it is.** The server stops shipping *data* to the reading surfaces and starts shipping a
**Sicht**: an ordered, closed, already-composed render tree for exactly one reader.

```text
Sicht  = { knoten: Knoten[] }
Knoten = { art: abschnitt | absatz | feldzeile | kante | stempel | marke | lade_mehr
         , kinder: Knoten[]
         , texte: { sichtbar: string, aria: string|null, titel: string|null,
                    alt: string|null, live: string|null }   -- ONE producer, per recipient
         , handle: karte_id | null    -- present only for cards this reader holds
         }
```

Four rules, all enforced by the type rather than by review:

1. **Edges are conjunctions.** A `kante` node is emitted only if **both** endpoints projected
   present for this reader. This is the one line that closes B1:1250 (the Umriss printing
   `k_44a0 stützt →` to Vesper) and F1's `widerlegt` marker at once.
2. **There is no denominator anywhere in the type.** `Sicht` has no `gesamt`, no `weg`, no
   `nicht_vorhanden`. The client cannot emit „6 von 8", „N von 41" or „nicht vorhanden 7" because
   it does not possess the complement. B1:1124, B1:1597 and B2:1613 become **unwritable**, not
   forbidden.
3. **Holder lists and provenance stamps are already reduced.** `who_knows` runs server-side per
   reader; the stamp carries the author's *display name as this reader may see it*, or nothing.
   B1:1214 closes.
4. **Every string a human will ever perceive is one field of one node, produced once.** §6.8's
   promised „one string per surface per recipient" stops being a coding rule and becomes a
   **record with five slots that are filled together or not at all.** B2:1187 — the live region
   announcing the count the visible surface correctly suppressed — closes structurally: there is
   nowhere to put a string that is not also in `texte`.

**Das Sichtfeld-Manifest.** `oracles.yaml` gains a sibling, `felder.yaml`: every column on `Karte`,
`Revelation`, `Kartenrelation`, `Haltung` and `Zustand` declares a disclosure class
(`halter | autor | sl | niemand`) and, for the reader-facing ones, which `Knoten.texte` slot it may
reach. The `Sicht` projector is **generated from it**. A migration that adds a column without a
class **fails the build** — this is the mechanical form of Nemesis's own condition („a disclosure
rule for every column and every edge, not just every row").

**Die Leckbank, implemented, seeded red.** The Leak Bench §6.8 promised and neither artifact built:
a differential harness that renders `Sicht(reader)` and `Sicht(SL)` for a fixture world, serialises
**payload bytes, DOM text and the serialised accessibility tree (CDP `Accessibility.getFullAXTree`)**,
and asserts one property:

> **every token present in the reader's accessibility tree is present in the reader's payload,
> and every token in the reader's payload is present in the SL's.**

Its **first eight fixtures are the eight leak sites from `attack-B.md`**, checked in red, per the
crew rule that every confirmed break becomes a failing regression test before the fix.

**Why it is sensible now — and the honest price.** It is sensible because it is the *only* answer
that scales with the thesis: the atom multiplies composition decisions, so composition must move
behind the choke point. It also pays for itself three times: the Umriss becomes free (MAJOR 10),
the static Publication and the Auszug (§9.2) become „`Sicht` serialised to a file", and the client
render path loses all permission logic.

**The price, stated:** client-side interactivity over content becomes a round trip. Search-as-you-
type inside a long article, client-side facet filtering and optimistic reordering are gone from the
**player** surfaces. Mitigation, and it is honest rather than clever: the **Kasten's facet search
and the Kartei recipe are GM-only surfaces, where the reader's projection is the full corpus**, so
they keep a local index and stay instant. §11's numbers survive — a 41-card article's `Sicht` is a
few KB against the ~400 B/card baseline — but they must be **re-measured**, and S-R1 gains an
assertion: `Sicht` render p95 under 40 ms server-side at 500 pinned cards.

**Cost:** **large.** It is the largest engineering item in the candidate, larger than the Schnitt,
and it must be in slice Z1 or the candidate should not be built.

**Invariants:** 1 (the choke point becomes total). 8 (the accessibility tree becomes a *tested*
projection surface instead of the leakiest one). 10.

---

### F3 · Der Zustand — a second, explicitly mutable substrate, with `defeat_pending` named

**Answers:** FATAL 3 (immutability has no home for mutable play state; `defeat_pending`, health,
damage, condition, initiative and position appear zero times in `product-B.md`). Also invariant 4,
which the candidate simply does not carry today, and the pack's `undo` requirement (Act 1.3).

**The thesis is corrected, in public, in §1.** „One id everywhere" is withdrawn and replaced:

> **`Karte` is the atom of *knowledge*. `Zustand` is the substrate of *situation*. A Karte answers
> „what is true, and what was said." A Zustand answers „where are things right now." Knowledge is
> immutable, citable, issuable, arrangeable and exported as a graph. Situation is mutable,
> uncitable, unissuable, unarrangeable and exported as a savegame.**

```text
Zustand (actor_id, campaign_id, schluessel, wert jsonb, version int, updated_at, updated_by)
         -- UPDATE allowed. Not a Karte. Never in an Anordnung. Never in a Revelation.
         -- schluessel ∈ { hp_aktuell, lage, initiative, position, zustaende[], ressourcen{} … }
```

**The boundary is testable, and that matters more than the table.** A CI rule asserts that no
`Zustand` key is reachable from `AnordnungPin`, `AnordnungQuery`, `Revelation` or `Kartenrelation`,
and that no `Karte` is written on the combat hot path. Round 1's lesson (a three-character splice
inverting the domain model and surviving a rebuild) applies here too.

**Where the two meet, and it is the best idea in this section — `Der Niederschlag` (precipitation).**
A `Zustand` transition is silent and free. A transition the table will *remember* becomes knowledge
**exactly once, by a deliberate act**: the GM presses one key (or the card kind declares which
transitions are `bemerkenswert` — death, first blood, a condition that lasts past the scene) and a
single `ereignis` Karte is minted: *„Hauptmann Vharon fällt · Sitzung 14, 22:10."* Four hours of
combat precipitates four cards, not four hundred.

**Invariant 4, discharged explicitly.** HP crossing zero writes `Zustand[actor].lage =
defeat_pending`. Nothing dies. The GM's confirmation is a separate, explicit action, and *that*
action is what precipitates the `ereignis` Karte. The player's sheet shows `defeat_pending` with
the derivation biography intact (invariant 6).

**Undo, correctly separated.** The pack requires undo on the combat console; an append-only
knowledge store cannot have one. Now it does not have to: **`Zustand` carries a bounded per-session
undo stack (last 50 transitions, campaign-scoped), and the knowledge graph stays append-only.** The
two undo stories were conflated by the thesis; separating the substrates separates them correctly.

**And a fusion dividend the candidate did not have.** `Stärke 14` and `HP-Max 42` are **Feldkarten**
— durable, issuable, learnable. `hp_aktuell` is a **Zustand** — situational, visible to whoever is
at the table. So *„Sera kennt die Stärke des Hauptmanns, nicht seinen Willen — und sieht, dass er
blutet"* is now two different objects with two different permission stories, which is exactly right
and which no competitor separates at all.

**Cost:** medium. One table, one undo ring buffer, one CI boundary rule, one precipitation keypress.

**Invariants:** 4 (now carried at all). 6. 1 (Zustand gets its own `felder.yaml` classes — a
player sees her own resources, the GM sees the NPC's).

---

### F4 · Die Zustellliste — a Berichtigung delivers nothing until the GM says who

**Answers:** FATAL 4 (the Berichtigung fans new text to every holder unconditionally — B1:1505 —
including Vesper, absent since session 12, who reads the campaign's central twist on her phone on
Wednesday; and `granted_via` has no value for the row it writes).

**What it is.** The single most-used gesture in the product stops fanning out. Three separations:

1. **`granted_via` gains `berichtigung`** — the missing name for the row. Every delivery is a real
   Revelation with a real cause and is retractable like any other (`retracted_at`).
2. **Record correction and revelation are split.** Superseding a card is a fact about the *record*
   and is GM-side. Delivering the new text is a *revelation* and requires a decision. A holder who
   was not delivered sees **nothing change at all** — no strike, no stamp, no announcement, no live
   region. Her book still reads the old sentence.
3. **The Nachhall panel becomes actionable.** It already computes the holder list as a join
   (B1's `nachhallZahlen()` is real, not a literal). It now renders one row per holder with a
   **default of `zurückhalten`**, the reason printed:

   | Halter | Vorschlag | Grund |
   |---|---|---|
   | Sera | **jetzt zustellen** | am Tisch, Sitzung 14 |
   | Brannt | **jetzt zustellen** | am Tisch, Sitzung 14 |
   | Vesper | **zurückhalten** | abwesend seit Sitzung 12 |

   „Jetzt zustellen" is pre-selected **only** for characters present in the current GameSession, and
   even then the delivery runs through the existing **Reveal Sheet** — focus-trapped, no
   preselected recipient, byte preview, four-second abort. One code path, already built.
4. **Beim nächsten Mal** is the third option: the delivery queues and is offered again when that
   character is next present. This is `catchup_grant` with a reason, and it is what a GM actually
   wants for the absent player.

**Why it is sensible now.** It is the *story-correct* behaviour, not merely the secure one. Vesper's
character was not in the second cellar; she should still believe the seal is real. The break, once
fixed, becomes §9.1's strongest new prep row: **„Vesper glaubt noch, dass das Siegel echt ist"** —
deliberate, GM-authored dead information walking, which is the material of the next session. And it
removes code: the unconditional `forEach` fanout is deleted.

**Cost:** small–medium. One enum value, one screen that reuses two existing components, one deletion.

**Invariants:** 1. 6 (the derivation biography of an inert clause now also records *whether the
holder was told*).

---

## Part II — the seven majors

### F5 · Die Schonfrist, die attestierte Rechtschreibkorrektur, und der Verfall des Striches

**Answers:** MAJOR 5 (the Redaktion classifier admits nothing but commas; every German typo becomes
a permanent plot event, and the Lesefassung degrades monotonically toward a diff view, fastest for
the longest-serving players).

Three parts. The first is the important one and it removes the German-linguistics problem entirely.

**(a) Die Schonfrist — the untouched-card rule.** Stop asking the undecidable question („is this
diff cosmetic?") and ask the one the database already answers:

> A Karte with **zero Revelations, zero inbound `zitiert`/`stützt` edges, zero clause riders and no
> appearance in any built Publication or Auszug** is **freely correctable in place.** No supersede,
> no strike, no notification, no Session-Diff row, no Vorlagen-Review.

Nobody's belief, record or export can be falsified by changing something nobody has ever received.
Formally the store stays append-only (new card + tombstoned old, **no supersede edge**); to the GM
it is „I fixed my typo." This covers the overwhelming majority of typos — including every typo made
during prep, which is when typos are made — **with no heuristic over German at all.**

**(b) For cards that *have* been read: `Rechtschreibkorrektur`, deliberately chosen and attested.**
Nemesis named this repair; adopting it with a guard that makes it honest:

- The GM **chooses** it. It is never offered by a classifier.
- It produces a new card with relation `art: schreibweise`, **not** `supersedes`. No strike, no
  notification, no revelation touched.
- It requires a **human attestation** — the GM sees the character-level diff and confirms „the
  meaning is unchanged", logged with her user id under `channel: authoring` and listed in the
  Session-Diff's Redaktionsliste. §8.2's fear (a silent truth change) is not eliminated; it is
  made **attributable, reviewable and rare**, which is the honest best available.
- The deterministic classifier is **demoted from gate to warning**: if it finds a changed number,
  negation particle, link target or clause AST, the confirm button is replaced by *„Das sieht nach
  einer Bedeutungsänderung aus — nimm Berichtigen"* and requires a second, typed confirmation.

**(c) Der Verfall des Striches.** With F4 in place, a strike only ever appears in the book of a
holder who was **deliberately delivered** the correction — which is the dramatic beat, and it
should land exactly once. So: **the inline strike-through renders until that holder has opened the
arrangement once after delivery, or one session, whichever is first.** Then it collapses to a small
persistent `berichtigt` chip on the paragraph, and the struck text moves to **Der Verlauf** — the
card's biography, always one keystroke away, never lost. Nothing is hidden; the reading surface
stops being a diff view. After five years the loyal player's article is clean prose with N small
chips, and §9.2's Auszug is a book, not a booklet of struck sentences.

**Cost:** medium. (a) is one predicate over four joins; (b) is a screen; (c) is a per-holder
„last read" timestamp and a render flag.

**Invariants:** 6 (the Verlauf is the derivation of the text itself). 1 (the Schonfrist's predicate
is exactly „nobody has received this", so it cannot un-tell anyone anything). 10.

---

### F6 · Die Trägerbindung und die Lückenprobe — `binde` cards under projection

**Answers:** MAJOR 6 (a `binde` card cascades with its *section*, not its *neighbours*; B1's `k_g04`
reads „Was danach kommt…" following nothing, and „Es steht nur in den Rechnungsbüchern" is a
signpost authored *about* hidden content).

**(a) A `binde` card has a dependency, not a position.**

```text
AnordnungPin (anordnung_id, abschnitt, ord, karte_id, traeger_karte_ids uuid[] NULL)
```

> **Ruling: a `binde` or `abschnitt` card projects absent unless *every* one of its Träger projects
> present for this reader.** The cascade rule becomes „with its Träger, then with its section."

That is a conjunction computed in the same pass as F2's edge projection — literally the same line.
`k_g04` disappears for Sera the moment `k_g03` does, and the signpost goes with it.

**(b) The authoring surface makes it unavoidable, not optional.** When the GM places a `binde` card
between two cards, the editor **pre-fills its Träger with its two neighbours** and shows one line:
*„Für eine Leserin ohne k_g03 entfällt dieser Satz."* No checkbox to forget.

**(c) Die Lückenprobe — read the article as she reads it.** One control in the Kartei recipe: pick a
reader; the arrangement renders in that reader's `Sicht`, with the GM's own absent cards shown as
faint ghosts **beside** the prose (never inside it), so the GM sees the seams. This is a prep-hour
tool, on Tuesday, at the cheap hour — not at 21:14.

**(d) Der Anfangs-Lint, offered, never blocking.** A deterministic German check over card openings
(leading pronoun, `danach`, `deshalb`, `die zweite`, ordinal adverbs) that flags cards which begin
with a back-reference **and are not held by everyone who can see the arrangement**. It appears as a
row in §9.1's prep engine. It is a lint, not a solve.

**Honest limit, and it belongs in §8 rather than here:** the *prose tax* — writing sentences that
survive arbitrary reordering by strangers — is **not removed**. See „Unanswerable" below.

**Cost:** small.

**Invariants:** 1 (the signpost leak closes at the choke point). 8 (the Lückenprobe reads the same
`Sicht` the Leckbank tests).

---

### F7 · Die Bezugskante — upgrades route over provenance, never over the hash

**Answers:** MAJOR 7 (§9.3's go-to-market and §6.6.1's confirmation-oracle ruling are mutually
exclusive as written).

Nemesis wrote the repair in one sentence. It is adopted verbatim and the false sentence is deleted.

**What it is.**

- A card imported from a Kartensatz carries `herkunft = (paket_id, karten_index, version)` on its
  `derived_from` edge. `inhalt_hash` stays scope-bound and never crosses a universe boundary.
- **Upgrade offers route over `(paket_id, karten_index)`.** The client asks the registry a question
  about a *package* — *„gibt es ein neueres `bestiarium-srd`?"* — never a question about a
  universe's contents. **The registry never learns which universes hold what, and nothing phones
  home with content hashes.**
- §9.3's sentence *„two sets sharing a card share the identity"* is **struck** and replaced with
  *„two sets sharing a card share a derivation."* Dedup remains per-universe by local hash.

**Die Satzrevision, and it is the same screen we already have.** *„Bestiarium SRD 1.2 → 1.3:
4 Karten geändert, 1 neu, 0 entfernt. 2 der geänderten hast du an Spieler ausgegeben."* Per card:
Übernehmen · Behalten · Abweichen lassen, **default Behalten** — the `Vorlagen-Review` of §6.5,
unchanged. An accepted upgrade of an *issued* card routes through F4's **Zustellliste**. Nothing
new is invented; three existing mechanisms compose.

**Why it is sensible now.** RB-11 makes the creator channel the go-to-market, so the upgrade path is
launch-blocking, not a phase-three ambition — and it is currently described in vocabulary its own
security ruling forbids.

**Cost:** small.

**Invariants:** 1, 2 (a Kartensatz remains a declarative card list with no escape hatch), 7 (the
`derived_from` edge is also the licensing provenance record — invariant 7 enforced at the import
boundary, which §7.3 already gets right).

---

### F8 · Die Erbschaft — the flex's cold start is answered by import, not by time

**Answers:** MAJOR 9 in her numbering (the flex needs fourteen sessions; both marketing photographs
are of year three; it is a retention artifact marketed as an acquisition artifact).

Two moves. The first makes the retention flex takeable in the first hour; the second replaces the
acquisition artifact with one that needs no history at all.

**(a) The import mints the history.** `Fremdwelt-Import` (Foundry world folders, Roll20 JSON, FG
XML, Markdown/Obsidian vaults) is already launch-blocking per RB-11 §7.3, and it already ends in the
**Nachtragsgewährung** screen — *„1.106 Karten sind Kanon. Was weiß die Gruppe schon?"* Extend that
one screen into a **bulk grid**: cards down the side, characters across the top, tag- and
folder-shaped bulk selection, plus a coarse „as of session N" stamp per band.

The consequence is the answer: a GM who has been running a campaign in Obsidian for two years
imports it on a Tuesday and, **within twenty minutes, has 1,106 cards, three holders with genuinely
divergent projections and two years of stamps.** The Berichtigung flex, the Nachhall panel, the
five-reader divergence and the Auszug all work **on her own world, in the first hour**. The demo
does not have to be fabricated, and §2's fixture stops being a lie about week one.

This is also the correct read of the addressable market: the GM this candidate wins is *„the one who
has already lost a fact she knows she wrote down"* (§5). She has a corpus. She is not starting fresh.

**(b) The acquisition photograph is re-nominated.** §2's Berichtigung is a **retention** flex and
should be labelled as one. The **acquisition** flex is §3.4, which needs one session and two cards:

> **Die geteilte Infobox.** One page. Five readers. Five different pages. *„Die Gruppe kennt den
> Herrscher. Die Einwohnerzahl kennt niemand. Sera kennt das Gründungsjahr — falsch."* Side by side,
> in one screenshot, in a world that is ninety seconds old.

No competitor in the corpus can render that at all — an infobox that is partially knowable *row by
row, per character* is unrepresentable in a document model. It is a single still image, it needs no
history, and the product's first-run flow should **produce it deliberately**: a new world's
onboarding seeds two cards, issues one to one seat, and shows the split.

**Cost:** medium (the bulk grid), small (the onboarding beat).

**Invariants:** 7 (the import boundary is where licensed content is flagged — §7.3's best paragraph,
unchanged). 1 (the Nachtragsgewährung writes ordinary Revelation rows through the ordinary path).

---

### F9 · Die Aufnahme — the action log stops minting cards *(a deletion)*

**Answers:** MAJOR 10 in her numbering (the box manufactures its own backlog: 23 cards a session,
~900 a campaign, ~60,000 in five years, most of them machine-composed roll logs, every one
arrangeable and orphan-facetable). Also the first half of MAJOR 8 (the cache contradiction).

**What is removed.** §3.3's automatic `ereignis` minting. A die roll no longer creates a Karte.

**What replaces it.** The action log is a **log** — `AuditEntry`, `channel: play`, append-only,
cheap, already in the model — and the **Strom** renders it live, exactly as it does today. It is
simply not the Kasten. A log line becomes a Karte only by **Aufnehmen**: one keypress, by the GM or
by a player on her own scope, at the table or in the Session-Diff's triage list.

23 machine sentences per session become the three someone chose. The Session-Diff, which already
exists as tonight's review, becomes the place the choosing happens — which is what it is for.

**Why this is the right kill and not a retreat.** A wiki containing *„Menschenkenntnis 17 gegen 15.
Erfolg"* four hundred times is not a wiki, and §9.1's prep engine greeting the GM with a to-do list
the *tool* generated out of work the *tool* created is the failure mode Nemesis named precisely.
It also shrinks three other problems at once: the five-year corpus estimate falls by roughly an
order of magnitude, which cuts FATAL 2's enforcement-surface argument down with it; §8.3's arranging
gate gets a denominator set by the GM rather than by the product; and the query tail stops being
hundreds of dice sentences in capture order.

**Cost:** small, and net negative — this removes code and a table's worth of rows per session.

**Invariants:** 5 (unchanged: nothing is inferred, no AI anywhere). 10.

---

### F10 · Die Trägheit der Anordnung — invalidation is scoped, and articles do not churn

**Answers:** MAJOR 8 in her numbering (the projection cache's near-100 % hit rate is contradicted by
the fusion mechanism in the same document; Brannt's 3G tablet churns because a die landed).

F9 removes the cause (no card insert per roll). Three rules remove the class:

1. **Snapshot invalidation is tag-scoped, not global.** An `AnordnungSnapshot` is invalidated only
   if the inserted card carries a tag that appears in that section's predicate. Today's rule
   („invalidated on card insert or tag change") invalidates everything.
2. **Invalidation is per *section*, not per arrangement.** A pinned section never invalidates; only
   the query tail does.
3. **A reading surface is never live-updated mid-read.** The Strom is a subscription; an article is
   not. When a section the reader is currently viewing gains cards *she may see*, a quiet affordance
   appears — *„Neue Karten in diesem Abschnitt · aktualisieren"* — with **no number** (F2 makes the
   number unavailable anyway). She chooses. Her scroll position survives.

Rule 3 is also a courtesy: nobody wants the page they are reading to move because someone rolled.

**Cost:** small.

**Invariants:** 1 (the affordance carries no count and no id). 8 (no unbidden live-region churn).

---

### F11 · Der Umriss ist die Sicht, gedruckt — and it ships in Z1

**Answers:** MAJOR 11 in her numbering (accessibility is the deferred recipe and it is the recipe
that leaks — the Umriss is cut from Z1 while being the only recipe in B1 that prints edges to cards
the reader cannot see).

**What it is.** Once `Sicht` exists (F2), the **Umriss is not a third renderer** — it is `Sicht`
rendered with no styling: nodes as a nested list, `texte.sichtbar` as the label. It is therefore
nearly free, and it is promoted into Z1 alongside the other two recipes.

Three consequences, and the third is the reason this is architecture rather than politeness:

1. §7.1's „explicitly not in Z1" list loses the screen-reader-first recipe, which is the exact
   inversion invariant 8 exists to prevent.
2. It becomes the **developer's leak view**: what the Umriss shows *is* what the reader is entitled
   to. A leak visible in the Umriss is a leak everywhere.
3. It becomes the **Leckbank's input**, so the accessibility tree is a *tested* projection surface
   from commit 1 rather than the channel where the discipline stops.

**Cost:** small (given F2). Without F2 it is medium and still worth it.

**Invariants:** 8, 1, 10.

---

### F12 · Die kleinste echte Tafel — Z1 stops claiming an hour it does not ship

**Answers:** Act 1.1 and MAJOR 11 in her prose numbering (the table cannot play; the first shippable
artifact competes against a free, already-installed product with a deliberately worse editor).

Two moves, one of them just honesty.

**(a) The claim is corrected.** Z1 no longer says it „optimises for 21:00." Nemesis wrote the
replacement sentence herself and it is better than ours: Z1 is *the smallest honest demonstration of
per-character knowledge, sold to GMs who have already lost a fact they know they wrote down.*

**(b) Z1 grows by one small vertical: dice + `Zustand`.** Because F3 adds a substrate, and because a
new architectural claim must be tested in the *first* slice rather than the last, Z1 gains:

- the dice service and the action log in the Strom (§7.1 concedes dice is two days at any point);
- `Zustand` with `hp_aktuell`, `initiative`, `lage`;
- **`defeat_pending` with explicit GM confirmation** (invariant 4, currently uncarried);
- the per-session undo ring over `Zustand`;
- **Der Niederschlag** — one keypress precipitating one `ereignis` Karte.

That is a real, if minimal, table: initiative order, HP, conditions, dice, no auto-death, undo. It
also exercises the Karte/Zustand boundary and the F9 uptake gesture with the least machinery.

**What Z1 still does not have, and this stays true:** no map, no clauses, no `+2`, no Forge, no
Electron. Z1 is a knowledge product with a working combat strip, and it should be sold as one.

**Cost:** medium.

**Invariants:** 4 (carried at last), 6, 10.

---

### F13 · Die vier kleinen Verträge — the minors, and one of them is architectural

**Answers:** MINOR 12–15.

- **MINOR 12 · the lossy editor round-trip.** §7.4's Z-1 green criterion is restated so the spike
  cannot pass its easy half: the editor round-trips the **closed inline AST**, not a plain string.
  `contenteditable` is seeded from and read back into the AST with marks and `[[link]]` targets
  intact; `nur()` is a *display* helper and is banned from the editor path by name. The hard-coded
  `replace("Kestrel-Vertrag", …)` is deleted. The spike is re-run before the estimate is believed.
- **MINOR 13 · the reset that deletes a card.** The spike's `zuruecksetzen()` becomes a tombstone.
  Same cost, and it shows the thesis in code instead of contradicting it in the one file arguing
  that immutability must not be a matter of discipline.
- **MINOR 14 · the a11y contracts, and the tab-stop one is real.** `role="alertdialog"` on the
  non-modal abort toast becomes `role="alert"` plus a real focusable button. The countdown ring
  becomes a number under `prefers-reduced-motion`, with a visible toggle in the spike. And the
  **card handle stops being one tab stop per card**: the article body is a **composite widget** —
  one tab stop, arrow keys between handles, `aria-activedescendant`, Home/End, type-ahead. Forty-one
  cards is one tab stop; four hundred paragraphs is one tab stop. This is the standard pattern and
  it is the only version of §1.1(b) that survives at Fandom scale.
- **MINOR 15 · i18n tests the chrome, never the corpus.** `<html lang>` set and switched with the
  content axis (so `hyphens: auto` is not inert); `overflow-wrap: anywhere` + `hyphens: auto` on
  every prose and field surface; and a **content-length axis** in the spike harness that swaps in a
  90-character German compound and a 22-row infobox, at 380 px. For a German-first product this is
  a launch-blocking CSS line and a missing test axis, not taste.

**Cost:** small.

**Invariants:** 8, 10.

---

## Part III — beyond defence: three things that make the fusion sharper

None of these answers a break. Each exists because **the wiki half and the table half are one
substrate**, and each would require a competitor to rebuild their product, not add a module.

### N1 · Die Wissensprobe — a die roll that reads what the character learned

**New capability.** The rule AST (Z2) gains **one** predicate over the knowledge graph:

```text
haelt(karte_id)  ·  haelt_etikett(tag, mindestens: n)
```

So a homebrew Regelkarte can be: *„+2 auf Menschenkenntnis gegen Haus Vharon, wenn die Figur
mindestens 3 Karten mit `#haus-vharon` hält."* The bonus is **computed from what the player
actually learned at the table**, and invariant 6's derivation prints the reason in her own words:
*„+2 · du hältst 4 Karten über Haus Vharon (Sitzung 6, 9, 12, 14)."*

**Why no competitor can copy it:** none of them has a per-character knowledge set to query. Foundry
would need an id below the journal entry — which `RB-01-foundry` shows is unrepresentable across
5,338 modules on a median-19-module install. This is the wiki half making the table half
*mechanically* better, and it is the single most direct expression of „Wiki + PnP session."

**Permission-clean by construction:** the predicate reads **the rolling character's own
projection**, so the derivation shown to her contains only cards she holds. The GM's view of the
same roll may show more; that is two `Sicht` renders of one derivation, which F2 already does.

**Cost:** small — it is one predicate on an AST that must exist anyway. Invariants 2 (declarative,
closed operator set), 6, 1.

### N2 · Der Riss — the divergence meter, and it is a prep engine that runs at 21:00

**New capability.** A GM-only strip in the Context Lens, computed as a pairwise symmetric difference
over held-card sets on a chosen tag:

> **`#das-siegel` · Sera 6 · Brannt 4 · Ossa 0 · gemeinsam 2 · Riss: hoch**

The GM sees, at a glance, **which topic the party cannot currently have a coherent conversation
about** — which is exactly where the next scene is. Two joins, no AI, no scoring model beyond set
arithmetic, every number its own derivation (click a name, get the cards).

**Why it earns its place tonight:** §9.1's prep engine is genuinely the best creative extension in
the candidate and it runs on **Tuesday**. This is the same idea at the hour the candidate claimed
and did not deliver. And it is the most Pen-&-Paper-native object in the product: the game is
*about* people believing different things, and this is the only tool in the corpus that can measure
it.

Pairs with F1: a `Haltung` of `zweifelt` widens the Riss. Pairs with F4: a withheld Zustellung
widens it deliberately.

**Cost:** small. Invariants 1 (GM-only, one `felder.yaml` class), 5, 6.

### N3 · Betreten ist Ausgeben — the map issues the wiki

**New capability.** §4 already claims that a map region and a lore card can be **the same card**.
Exploit it: moving the party's tokens into a region **offers to issue that region's cards** to the
characters present — `granted_via: betreten`, through the same Reveal Sheet with the same abort
window and the same byte preview.

The corridor's description is one atom. It is on the map, it is in the article, one Berichtigung
fixes both, and **walking into it is what teaches it to a character.** The fog is not fog: it is
the projection. Wednesday morning, Sera's phone shows the corridor paragraph in the *Haus Vharon*
article because her character walked down it on Saturday, stamped with the session.

**Why no competitor can copy it:** their fog is a rendering state on a canvas; ours is the same
per-character knowledge projection that renders the encyclopedia. To copy this, Foundry or Owlbear
would need the journal identity model *and* a revelation edge underneath the canvas.

**Why it is sensible now rather than speculative:** it mints nothing. It issues cards the GM already
authored, through a path that already exists, with a decision she already makes. It is the one
*automatic* capture that does not manufacture backlog — which is exactly what F9 just deleted.

**Cost:** medium (it lands with the Wissenskarte in Z2). Invariants 1 (offered, aborted, server-
enforced — never a client-side fog trick), 9 (K7: art is content and skin; a region is a card).

---

## Part IV — what gets killed

Every round that only adds is a round that made the product harder to ship. Three deletions, and
the first is the candidate's own nominated cause of death.

### K1 · The automatic Schnitt is killed. The Schnitt survives as a boundary chooser.

§8.1 says the deterministic splitter is where the candidate most likely dies, and MAJOR 5 just
demonstrated what happens when a deterministic heuristic over German prose is made load-bearing:
it fails, silently, in the direction nobody modelled. The Schnitt is the **same class of problem
with the same class of guard**, and it is scheduled first.

**So it stops being load-bearing.** The paste still becomes one card in under a second — that is
untouched and it is the thesis's entrance. The Schnitt becomes a **separate, non-editing preview
surface**: the pasted buffer is displayed immutably with candidate cut points marked; the GM adds
and removes cut points with the keyboard; Enter commits N cards. The heuristic *seeds* the cut
points. The human *confirms* them.

This preserves §13's refusal exactly — **no cursor crosses a card boundary**, because choosing
boundaries on an immutable buffer is not editing a document — and it collapses spike **Z-2's** green
criterion from the unfalsifiable („does the machine cut the way a human would?") to the trivial
(`concat(cards) == normalize(input)` character-for-character, plus idempotence). The one-day
estimate becomes credible because the hard half was deleted rather than estimated.

### K2 · `Revelation.belief` is killed *(F1)*, and the automatic `ereignis` card is killed *(F9)*

Both are named above. Together they remove one leaking column, one leak class, one manufactured
backlog, one cache contradiction and roughly an order of magnitude of five-year corpus growth.

### K3 · The Umriss as a third renderer is killed *(F11)*

Not the recipe — the *implementation*. There are not three renderers; there is one `Sicht` and two
stylesheets over it. One fewer surface to keep honest, and the surface that leaked most is the one
that stops being written by hand.

---

## Net effect

**The candidate is materially stronger, and it is smaller.** Its thesis was over-claimed in exactly
one place — „one id everywhere" — and Nemesis found the hole through the only door the candidate
never opened (combat). Withdrawing that claim and naming `Zustand` costs the thesis nothing it was
actually delivering, and it buys invariant 4, a real undo, and a better permission story for a
statblock than any competitor has. The four fatals are answered by three deletions
(`belief`, the unconditional fanout, the automatic `ereignis`) and one large piece of architecture
(`Sicht`), and the large piece pays for itself three times over — it makes the Umriss free, the
Publication and the Auszug free, the Leak Bench possible, and the client render path permission-free.
Seven of the eight demonstrated leak sites become **unwritable** rather than forbidden, which is the
only enforcement story that survives 60,000 cards. Killing the automatic Schnitt removes the
candidate's own nominated cause of death by deleting it rather than defending it. And the three new
capabilities are the first things in either round-2 candidate that make the *wiki half improve the
table half mechanically* — a die roll that reads what you learned, a meter of what the party
disagrees about, and a map that teaches by being walked on.

**Where it is still soft, honestly.**

- **`Sicht` is a large, unbuilt, unmeasured piece of architecture, and it is now the critical path.**
  It replaced the Schnitt as the thing most likely to kill this candidate. It must be spiked in
  round 3 with a real number: `Sicht` render p95 at 500 pinned cards, and the payload size delta
  against §11's ~400 B/card baseline, which was computed for rows and no longer describes what ships.
- **The prose tax is unresolved and is now a named permanent weakness**, not a fixed one. Cards that
  live in four arrangements and are reordered per reader cannot carry pronouns or „danach". The
  Lückenprobe makes it visible at the cheap hour; it does not remove it.
- **§8.5 stands untouched.** There is still zero market evidence that anyone wants an atom-first
  knowledge tool, and no feature in this document is evidence. Only the instrumented four-hour
  session is, and it must now measure three bets, not two: the visibility tax, the arranging gate,
  and — new — whether the Karte/Zustand boundary is one a GM ever has to think about.
- **The acquisition story is better but not solved for fresh worlds.** F8 answers the migrating GM,
  who is probably the majority of the addressable market. A GM starting an empty world in week one
  still has §3.4's split infobox and nothing else, and that is a smaller flex than the one §2
  describes.
- **Z1 is still a wiki with a combat strip, competing against a free editor that is already
  installed.** F12 makes the claim honest. It does not make the fight easier.

*Der Kasten ist kleiner geworden und trägt mehr. Was der Tisch bewegt, ist kein Wissen; was der
Tisch lernt, ist kein Zustand. Zwischen beiden liegt eine Kante — und die Kante ist jetzt geschrieben.*
