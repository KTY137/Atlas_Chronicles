# Der Schlüsselmeister — Product Candidate A, Round 5

> **Die Türen sind nicht das Problem. Die Hände sind es.**
> The champion's invariant said *"one human keypress."* Round 4 read it and found that it never said
> **„jetzt"**. Round 5 reads the same five words and finds that it never said **„die Spielleitung"**,
> and never said **„einzeln"**. A world with 689 open doors is not a world with too many holes — it is
> a world with **too few authors**, and the product's job is to multiply the hands that may say yes:
> cheaply, revocably, in batches, and with every single act still traceable to a named person.

**Evolution of [`CHAMPION.md`](../CHAMPION.md) v5 (*Die Woche*) along one axis: who holds the key.**
Everything v5 established is carried unless this document changes it. Die Vollmacht is not replaced —
it is **demoted from the only key to one of three**, and the other two are the level.

---

## 1. The thesis, and what it costs

**Optimised for: the world that has more holes than hands.** The imported world (RB-12: **1,253 red
edges, 689 distinct missing pages, 9.3 doors per written article** — measured, not estimated). The
campaign at session forty. The table of four or five, where the GM is one reader against four writers.
The world that has an audience.

**At the cost of, stated as costs and not as framing:**

- **The small, single-authored world is unserved by the new machinery.** A two-person campaign with a
  tidy wiki has nothing to delegate and a Schleuse with one card a week is chrome. Round 4's Vollmacht
  still serves her; nothing in this round does.
- **The GM who writes for pleasure loses the writing.** *Der Abend* abolished prep; *Die Woche* gave
  4.5 minutes of it back at 23:41 (CHAMPION §15.14); **Der Schlüsselmeister takes the writing away
  entirely and gives her editing instead.** For a large class of GMs that is not a saving, it is a
  demotion. Named as a cost, not argued away — §11.2.
- **The blast radius of a bad judgment grows.** A Vollmacht releases one sealed line the GM wrote
  herself. A mandate lets someone else's keypress write canon inside a named region of the world for a
  week. Every safeguard in §4 is a safeguard against *this*, and none of them is a type.
- **The bill.** Slice 1 is **≈166 developer-days against the champion's 105** (§10.4) — because this
  candidate makes **both** the import **and** the canvas load-bearing rather than deferring either for a
  fifth round. That is the largest single cost in the document and it is not hidden in a footnote.
- **Everything CHAMPION v5 §1 already charges** — session one still empty, the long-form writer still
  unserved, prep partly back, availability no longer optional, lying still unmodelled — carried, unpaid,
  unimproved by this round except where a section says otherwise.

### 1.1 The invariant, rewritten — and it gets **shorter**, not longer

CHAMPION §15.17 recorded the round-4 damage honestly: the five-word invariant
(`Nichts wird automatisch Kanon`) became fifteen words
(`Nichts wird Kanon, das die Spielleitung nicht selbst geschrieben und freigegeben hat`), and
*"shorter invariants survive contact with tired developers; longer ones get exceptions."* That warning
is correct and this candidate is the test of it.

> **Nichts wird Kanon, ohne dass ein benannter Mensch es freigibt. Schweigen gibt nichts frei.**

**Fourteen words, two clauses, and it covers strictly more cases than the fifteen it replaces.** The
axis changed from *"is it the GM?"* to *"is there a name?"* — and the second clause is the one that does
the work, because every collaborative-writing product in the world has the opposite default (silence
accepts; you revert what you dislike). Here **no timeout, no queue drain, no expiry and no batch ever
promotes anything.** An unratified `Vormerkung` expires into nothing and leaves no trace in canon.
That is testable — gate **S4 · die Stille**, §12.3 — and it is the sentence the whole candidate stands on.

---

## 2. The flex — „**Sie** hat das geschrieben?"

**It is a Wednesday, 08:14.** No session. Kaya has the Eron import three days old and her phone on the
kitchen table. Timo is looking over her shoulder with a coffee.

**Beat one — the hole.** She opens **`Der Große Krieg`** (real: 6,226 bytes, `Vorlage:Krieg`, 16 infobox
rows, 7 prose paragraphs, 65 distinct link targets — RB-12 §2.10). The lead paragraph alone carries
**12 red links against 5 blue**. Timo, reading over her shoulder: *„Dein Wiki ist ja voller Löcher."*
Kaya: *„Neunundsechzig Prozent."*

**Beat two — the sluice.** She presses `S`. **Die Schleuse** opens: six cards, in article order, no feed,
no timestamps as the organising principle. Card three is four sentences about how **Andarisch** sounds —
the rolled *r*, the swallowed vowel, the way a Blattheim elf says *„Kaiserreich"* — written **Tuesday at
22:10**, by a player, on a train, in her own voice. Sera's name is on it and Kaya's is not.

**Beat three — the gesture.** Kaya reads it. Twelve seconds. She changes one word (*„geschluckt"* →
*„verschluckt"*) and presses **`K`**.

**Beat four — the actual flex, and it is a number.**

```
Andarisch · Kanon
    ✍ verfasst  Sera (Timo)      Di 22:10
    ✔ bestätigt Kaya             Mi 08:14   (1 Wort geändert)
    ⚄ erworben  Wurf #4471 · Sitzung 14 · 1d20+4 = 21 gegen SG 18
                                              [ Nachrechnen ]  [ Der Augenblick ]

    18 Türen geschlossen.
```

And the page behind it re-renders. In `Der Große Krieg`, in `Kaiserreich`, in `Hochelfenrat`, in
`Olav der Ehrliche`, in fourteen more articles, a word that was red is a link with a footnote, and the
footnote carries **two names and two dates**.

> **Timo:** *„Warte. **Sie** hat das geschrieben?"*

**Why this is the flex and not a variation on round 4's.** Round 4's astonishment was about **when** —
*der rote Link ist eine Tür*, and the door opened on a Tuesday. This one is about **who**, and it
photographs the difference in one frame: a paragraph in an encyclopedia with a player's name on the
authorship line and the GM's name on the release line. **Nothing in the corpus of rivals has two names on
one paragraph, because nothing in the corpus of rivals distinguishes writing from releasing at all.**
On Fandom, MediaWiki, World Anvil, LegendKeeper, Kanka, Notion and Obsidian, the person who types is the
person who publishes; the only question is whether they had permission beforehand. Here the two acts are
different acts, by different people, on different days, and **both are printed.**

**And the counter is the part that cannot be faked.** *„18 Türen geschlossen"* is not a copy line —
it is `graph.json` joined to the ratification, and the number is **per reader**: for Sera, who holds
eleven of those eighteen articles, it reads 11; for Brannt it reads 3; for a reader who holds none of
them it does not render at all. Fandom's `Wantedpages` can tell you `Andarisch` is wanted 18 times.
It cannot tell anyone what closing it did to *their* encyclopedia, because there is only one
encyclopedia and it is cached per URL (`surrogate-key: wiki-2915492`, RB-13 §1.3).

**The closer, on the same screen.** Die Saatbilanz (CHAMPION §3.1) gains a fourth axis, and on this
world it reads:

> *„1.100 Absätze übernommen · 31 am Tisch entstanden · 6 zwischen den Tischen · **9 von anderen
> Händen**."*

---

## 3. Das Level-Up — die Vortragsfeatures

Three capabilities CHAMPION v5 does not have. Each falls out of the thesis; none is bolted on.
Ordered by how much of the thesis they carry.

### 3.1 **Das Schreibrecht und die Schleuse** — the person who earned the paragraph writes it

**What it is.** A successful roll against a door no longer requires that the GM has already written the
answer. It mints a **Schreibrecht**: a single-use, scoped, expiring right to write **one** passage into
**one** entry, held by a named person, in her own voice.

What she writes is a **`Vormerkung`** — and a Vormerkung is **not a Passage**. Different table,
different id space, no encoder in any export, no row in any other reader's `Sicht`, not citable, not
revealable, not countable. It is visible to exactly two people: its author and whoever may ratify it.

**Die Schleuse** is where the ratifier sees them: a keyboard-first list of cards in **article order**,
never in arrival order, each showing the proposed text, the roll that earned it, the author, and — the
part that makes the decision cheap — **the demand it closes** (*„schließt 18 rote Kanten in 15
Artikeln"*). Three keys: `K` ratify · `E` ratify with edits · `X` reject with one line back to the
author, into her own Kodex, never canon.

**What the user does.** Player: rolls, succeeds, writes four sentences whenever she likes before the
right expires. GM: opens die Schleuse once a week over breakfast, reads, presses.

**Why only this thesis makes it possible.** Because the champion already severs *writing* from
*releasing* — `Vollmacht.freigabe` is a `SealedPassageRef` written at one moment and released at
another. Round 4 put both halves in the GM's hands and separated them in **time**. This candidate
separates them in **person**, which is the same seam, used the other way, and it needs no new
architectural concept: the release predicate already exists, it just stops assuming who stands on each
side of it.

**What it costs.**
- The GM stops writing and starts editing (§1, §11.2).
- **A rejection is a social act.** *„Nein, so klingt Andarisch nicht"* between friends is a cost the
  product creates and cannot pay. §11.5.
- ≈6 developer-days (§10.4), plus one new oracle row (`vormerkung`) and one Zwillingsbeweis fixture pair.

### 3.2 **Das Mandat** — authority as a scoped, out-of-character, retro-revocable grant

**What it is.** A named person other than the GM holds standing ratification authority over a **named
region of the world**: an `Etikett` (`#bruderschaft-der-flamme`), a `Raum` subtree with a depth bound
(RB-21a's spatial tree — `Blattheim` and everything below it), or a single `Entry`. Inside that scope,
**her keypress is the human keypress**, and every passage it releases carries **her** name on the
release line, not the GM's.

**Four properties, and each answers a specific way this goes wrong:**

| Property | Answers |
|---|---|
| **Ein Mandat bindet an `user_id`, niemals an `character_id`.** Everything it teaches its holder is marked `ausserhalb` — grants zero `erfahrungsgrad`, zero dice modifier, is never a `Quelle`, never a `Revelation`. | The player who holds the Bruderschaft would otherwise learn its secrets *as a character*. The product's own asymmetry (`Erfahren schlägt Gehört`, CHAMPION §4.2) already knows how to say "you heard this, your character did not." Gate **S3 · der Mandatsbeweis** proves it: a mandate holder's *character's* rolls, book, DOM and `getFullAXTree` are byte-identical to a non-holder's. |
| **Kein Mandat über das eigene Vorhaben.** A mandate is inert on any entry the holder's own character has an open Schreibrecht, Vollmacht or Vorhaben against. Evaluated server-side, at ratification time, not at grant time. | Self-dealing. |
| **Jedes Mandat steht in der Besetzungsliste.** Visible to the whole table, in Cast. There is no secret authority in this product. | Authority you cannot see is authority you cannot argue with. |
| **Der Widerruf ist rückwirkend und verlustfrei.** One keypress revokes a mandate **and** un-canons everything it released, in one audited gesture. The passages are not deleted — they become `zurückgezogen`: readable, addressable, permanently marked, out of canon, out of exports, out of derivations. | **This is what makes delegation cheap to be wrong about**, which is the only reason it is safe to try. RB-21a's `Beförderung` uses the same discipline in the other direction. |

**Why only this thesis makes it possible.** Round 4 already established that authorisation can be an
object with a scope, a cap, an expiry and an audit trail. A mandate is that object with the *anchor*
widened from one sealed line to a region, and the *holder* widened from a character to a person. Under
any thesis that keeps the GM as sole authoriser, the object has nowhere to point.

**What it costs.** It is the most dangerous thing in this document and §4 is about nothing else.
≈3 developer-days for the co-GM form that ships in slice 1; the player form is **held out of slice 1**
until gate S1 has run (§10.2).

### 3.3 **Der Schlüsselstapel** — the import's own demand, dealt as a deck

**What it is.** On import day the product does not hand the GM an encyclopedia. It hands her a **ranked
deck of key-candidates**, computed from the corpus with **no AI and no guessing** (RB-12 §5.4 is
explicit that the triage is arithmetic), each card pre-filled with everything the wiki already knows:

```
┌───────────────────────────────────────────────────────────┐
│  Andarisch                                  18 Artikel     │
│  eine Sprache · keine Seite · Tier 1                       │
│                                                            │
│  gewünscht in: Der Große Krieg · Kaiserreich · Hochelfenrat│
│                Olav der Ehrliche · Blattheim · …13 weitere │
│  Textstelle:  „…sprach in gebrochenem [[Andarisch]] zu…"   │
│                                                            │
│  [ K ] Schlüssel prägen    [ N ] Notiz    [ X ] verwerfen  │
└───────────────────────────────────────────────────────────┘
```

**And the first cards in the deck are not doors — they are merges.** **Die Zusammenlegung**: the corpus
contains eight verified clusters where one thing is several doors because somebody mis-typed it
(WELT.md §3.3(b), each cluster counted by hand):

| Was gemeint ist | Geschriebene Varianten | Türen → |
|---|---|---:|
| Das Elfenreich | `Geeintes Elfenreich Demmaros` (9) · `Geeinte…` (1) · `Geeinigtes…` (1) · `Vereinigtes…` (1) | **4 → 1**, 12 eingehend |
| Das Königreich | `Königreich Terabur` (13) · `Königgreich Terabur` (1) | 2 → 1 |
| Der Bruder | `Der Erste Bruder` (3) · `Der erste Bruder` (1) · `Erster Bruder` (1) · … | 5 → 2 |
| …plus Sheikat, Chi-Sen (×2), Ewiges Reich, Minenreiche, Erzherzog | | |

One keypress collapses four doors into one with twelve inbound links and writes an `Alias` row
(RB-12 §7.1 A2 — the table already exists for the corpus's one real redirect). **Card one of the deck
on Kaya's own world reads: „Vier Türen, ein Land."**

**What the user does.** Swipes a deck. Each keypress mints a **key**, never canon. Four minutes produces
thirty keys and eight fewer false doors.

**Why only this thesis makes it possible.** Because under this thesis a key is not expensive. Under
CHAMPION v5, minting a key means writing a sealed line — so a deck of 113 cards is a deck of 113 writing
assignments and nobody swipes it. **When the key becomes cheap, the deck becomes possible; the deck is
downstream of the economics, not of the UI.**

**What it costs.** ≈5 developer-days on top of RB-12's importer. And the honest counterweight, stated
before anyone else states it: **the merge removes ~30 of 689 targets — 4.4 %. It is not an economics
fix.** Its value is that **26 % of all redlink occurrences are piped** (WELT.md §3.3(c)) —
`[[Königgreich Terabur|Terabur]]` shows the reader a clean word and hides the typo — so a typo-door is
*indistinguishable from a world-gap* until something shows it, and nothing else in this market shows it.

---

## 4. Die Grenze — wo die Zustimmung zum Stempel wird

**Stated before §5, because it is the attack this candidate exists to survive and burying it would be a
failure of nerve.** Every mechanism in §3 moves toward the automatic canon this lineage has refused for
five rounds. Here is exactly where the line is, exactly what holds it, and exactly where it does not hold.

### 4.1 What is unrepresentable (types, not policy)

1. **There is no function `Vormerkung → Passage`.** The only constructor that yields a canonical
   `Passage` from a proposal is `praegung.ratifikation(vormerkung_id, user_id, ergebnis)`, it takes a
   `user_id` as a **required, non-defaultable argument**, and it writes an `AuditEntry` in the same
   transaction. There is no batch entry point, no cron, no expiry handler and no admin path that
   constructs a Passage. **A tired developer cannot write the automatic version by accident, because
   there is no signature to call.**
2. **The closed set of mint handlers stays closed.** CHAMPION §4.1's five `praegung.*` handlers become
   **six**, enumerated, with the same closed-set enforcement below the programmer. Six is the number for
   the rest of this lineage unless a verdict says otherwise.
3. **A `Vormerkung` has no encoder instance in the player payload codec**, exactly as `NurLeitung<T>`
   has none. It cannot leak by forgetting to filter; it can only leak by someone writing a codec.
4. **A mandate binds to `user_id`.** There is no constructor taking a `character_id`. The
   knowledge-vs-authority split is enforced by the type, not by a rule.

### 4.2 What is a rule with a gate (honest: these are the soft ones)

| The pressure | The rule | The gate | If red |
|---|---|---|---|
| Batch ratification becomes a swipe | Die Schleuse shows **one card at a time**, full text, and the ratify key is **not pressable in the first 1.5 s** a card is shown | **S2 · die Lesezeit**: instrumented median time-on-card ≥ 8 s | The Schleuse is a stamp and this candidate's central claim is false |
| "Ratify all" arrives in month one | There is no such control, and `oracles.yaml` gains a row asserting **no ratification surface produces more than one `Ratifikation` per keypress** | in the Orakelprobe | as above |
| A mandate silently widens | `Mandat.geltung` is immutable after grant; widening requires revoke-and-regrant, which is two audited rows and a visible change in Cast | audit assertion | delegation becomes ambient authority |
| Silence starts to mean yes | **Gate S4 · die Stille**: a fixture campaign where nobody presses anything for 30 simulated days produces **0** new Passages, **0** Revelations, **0** export bytes changed | CI, permanent | the invariant is gone and the product should say so |

### 4.3 Where it does **not** hold, named

**The rubber stamp is not solved and cannot be solved by this candidate's own machinery.** A 1.5-second
floor and an 8-second median measure *time*, not *reading*. A GM who ratifies fifteen cards in five
minutes has read the first four. **`NurLeitung<T>` makes a denominator unrepresentable; nothing here
makes an unread paragraph unrepresentable, and nothing can.** This is §11.1, it is the hard weakness,
and Athena should aim there.

**The second unclosed edge:** `Widerruf` un-canons a mandate's output, but it cannot un-*read* it. A
passage that was canon for six days was revealed, cited, rolled against and possibly exported in an
`Ausgabe`. Withdrawal is honest about the past (`zurückgezogen`, permanently marked); it does not undo
it. The champion has the same problem with `Berichtigung` and has never solved it either — but this
candidate makes it **more likely to happen**, which is a real increase in exposure and is charged here
rather than in a footnote.

---

## 5. How the two halves fuse

**The mechanism, in one sentence: the mint is a two-party act, and the two parties are cheap at
different things.**

- **The wiki half supplies demand, ranked, for free.** The redlink graph is not debris — it is a prep
  queue sorted by how much the world's own text already depends on each gap. 689 targets, 113 of them
  wanted by ≥3 articles (RB-12 §5.4). No competitor can produce that list from the reading surface,
  because none of them models a link to a page that does not exist as anything but a mistake.
- **The table half supplies events, at a rate set by play.** A four-hour session produces eight to
  fifteen moments worth a paragraph.
- **The consent layer is the market maker.** A Schreibrecht is the matching: an *event* (a roll) is bound
  to a *demand* (a door) and handed to a *hand* (a person). The GM's ratification is the clearing.

**And the fusion runs in both directions, which is the part rivals structurally cannot copy:**

| Direction | Mechanism | Real example from the corpus |
|---|---|---|
| Table → wiki | die Prägung (5 gestures) + **die Ratifikation** (new, 6th) | Sera's roll on `Andarisch` becomes a paragraph in eighteen articles' link graph |
| Wiki → table | `haelt_etikett` / `erfahrungsgrad` in the dice math | *„+2 · du hältst 4 Passagen über Haus Paradon"* — CHAMPION §4.3, unchanged |
| Wiki → table, **new** | **die Nachfrage steuert die Szene** | The GM's session prep is die Schleuse's other tab: *„Was in dieser Welt wird am meisten vermisst?"* — `Andarisch` 18, `Nördliche Minenreiche` 16, `Andaria` 15, `Blattheim` 14. **She sets the next scene where the demand is**, and the demand was computed by her players' own writing three years ago. |

### 5.1 A worked session, with real content

**Samstag, Sitzung 14, 21:47.** The party is in **Blattheim** — which is not an article. It is a redlink
with **14 inbound articles**, a marker at `[1185.4, 5518.0]` on `Karte:Andaria` with `categoryId →
Elfenunion`, and two different named parents in two different articles' infoboxes (`Almek` says
`Geeintes Elfenreich Demmaros`, the map says `Elfenunion` — RB-21a §1.3 case 5). The GM has written
nothing about it. She does not have to: the import gave her a place with a position, a faction and
fourteen articles that want it.

1. Sera speaks to a Hochelfen clerk. `Vorlage:Person` on `Arvex Aurelius Paradon` tells the GM what a
   Paradon sounds like in **18 infobox rows and zero prose** — the article a naive renderer breaks on
   (RB-12 §2.10, WELT.md §3.2), and the one that renders correctly here.
2. Sera rolls **Sprachen**. The card prints `+2 · du hältst 4 Passagen mit #hochelfenrat` — the
   champion's own `haelt_etikett`, unchanged. `1d20 = 17 + 4 = 21 gegen SG 18 · Erfolg`.
3. **Under CHAMPION v5 this is where it stops.** There is no sealed line about Andarisch, because there
   are 689 of these and the GM wrote three on Saturday night.
4. **Under Der Schlüsselmeister the success mints a Schreibrecht.** Sera sees, in her own book, a thin
   ring on the word `Andarisch`: *„Du darfst einen Absatz schreiben. Bis Sitzung 15."* Nobody else sees
   a byte of it — der Zwillingsbeweis carries the fixture pair (§12.3, S5).
5. **Dienstag, 22:10, im Zug.** Four sentences. `Vormerkung` id `v_0441`, `sicht = nur_verfasser`.
6. **Mittwoch, 08:14.** Die Schleuse. One edit, one keypress. **`Andarisch` closes 18 red edges** and the
   footnote carries two names, two dates and one die roll.
7. **Samstag, Sitzung 15.** The Anlass contains the week. Sera's landing is der Umbruch — her own
   articles, marked in place. And in the GM's Lücke, the ranked demand has changed: `Andarisch` is gone;
   `Nördliche Minenreiche` (16) is now first, and it is a place, so it has a parent, a marker and
   twenty-six siblings on `Karte:Andaria`.

**The sentence the product earns from this session and no rival can say:** *Fandom gave this world 1,153
edits over four years and cannot tell you which sentence came from play.* (RB-12 §2.9: `<ref>` appears
**zero** times in 307,255 bytes.) *From the first Saturday after the import, ours can — and from the
first Wednesday, it can also tell you whose hand.*

---

## 6. The six zones under this thesis

| Zone | Under Der Schlüsselmeister |
|---|---|
| **Session → die Fällung** | Four states, carried. *Nachher* changes shape: the issuance ritual (`V` ×N, ≤90 s of sealed-line writing) becomes **optional**, because a roll can now earn its own right. What the GM does at 23:41 is **nothing**, and that is the point. |
| **Story → das Archiv** | Red links render at four states — `Notiz` (1 inbound, plain text, dotted), `Spur` (2, clickable), `Tür` (≥3, a ring), and **`Offene Tür`** (a Schreibrecht you hold: a ring with a pen in it). Still not an editing surface in slice 1 — a Vormerkung is written in a single-line composer, not in the editor (which stays dormant, CHAMPION §7.1). |
| **Cast → die Zeugen** | Gains **die Mandatstafel**: who holds authority over what, with scope, expiry and issue date, visible to every member. Der Briefwechsel is carried but slips to slice 2 (§10.3). |
| **Library → das Regal** | Gains **der Schlüsselstapel** (the deck, permanent — it refills as play creates doors) and **das Widerrufsbuch** (every `zurückgezogen` passage, addressable forever). Die Ausgabe now bundles mandates as well as Vollmachten. |
| **Table → der Tisch** | **Die Leinwand ships.** §7. And under this thesis it is not a map viewer — it is **the highest-bandwidth consent surface in the product.** |
| **Forge → das Formular** | Gains **der Mandatszettel** — and, per `04-die-eine-plattform.md` §8.3 and die Verjüngungsregel, **retires der Vollmachtszettel**, whose whole surface is absorbed into die Schleuse (a Vollmacht is now the special case where the ratifier pre-writes and pre-ratifies in one gesture). **Net authoring surfaces in the Forge: unchanged at four.** This is the first round in the lineage to actually pay that rule. |

**The routing predicate, still one line:**

```text
live GameSession                          → Session
Vormerkungen in der Schleuse (Leitung)    → Story, mit der Schleuse scharf
offenes Schreibrecht (Spieler)            → Story, mit der Tür scharf
otherwise                                 → Story
```

---

## 7. Die Stufe — die Leinwand, und sie ist eine Zustimmungsfläche

**This candidate does not refuse the rung. The canvas ships in slice 1.** Round-04's verdict §6 named
the alternative plainly: *"If round 5 produces another close, well-verified extension of Die Woche
without ever running S-T1, that is the signal to stop extending."* Deferring the canvas a fifth time is
not a decision, it is a habit.

### 7.1 What ships, and which branch this is

`04-die-eine-plattform.md` §8.4 requires candidates to **fork, not average**, on the canvas, and names
three branches. **This candidate takes the third, explicitly: reader-before-writer** — a map *viewer*
over an entity-bound place layer with per-character `Sicht`, **no stamp renderer, no atlas, no brushes,
no tile pyramid, no KTX2** (RB-20b §8).

| Ships in slice 1 | Explicitly not in slice 1 |
|---|---|
| `MapRenderer` boundary + Pixi, **single-image scene**, DOM authoritative (RB-11, unchanged) | The tile pyramid and KTX2/Basis — the measured pyramid (1,365 tiles, 9.9 MB, 31.7 s build, RB-20b §2) exists on disk and stays there |
| **Grid: square · hex · gridless**, all three (grid math is arithmetic; there is one renderer) | Dynamic per-token LOS, Scene Levels (and note: **Foundry shipped Scene Levels in core v14** — RB-21a §1.3 case 3 — so this refusal is now a refusal of a competitor's shipped core feature, not of a module) |
| **Tokens that move**: placement, drag, snap ×3, elevation as a scalar band on the node (RB-21a R6). Positions are `Zustand`, undoable | The stamp library — **refused permanently** (`04` §0.6: Inkarnate's own store forbids redistribution verbatim; the moat is unbuyable) |
| **Per-character fog, derived from revelations, as a vector mask.** Measured: **9.4 ms per incremental reveal**, 386 ms for a from-scratch union at 800 revelations in a worker (RB-20b §5) | The GPU fog texture. The authoritative fog is **a set of revealed ids, which is `Sicht`** — the polygon is a derived render artifact (`04` §0.6.3, adopted verbatim) |
| **Initiative order**, HP, conditions, `defeat_pending` with explicit GM confirmation (invariant 4), the undo ring | The terrain paint substrate — **designed out, not deferred** |
| **UVTT import** (a parser: regions, walls, portals, from a real `.dd2vtt`) | UVTT **export** — slice 2 (champion's own cut order #1) |
| **Die Tafel** — the Outline recipe — remains **authoritative and co-equal**, not a fallback. K7/invariant 8: a screen-reader player is never handed a canvas, and RB-21a §3.4 rules that the Outline recipe **is** the map for every place without one — which on import day is 100 % of them | |

### 7.2 Why the canvas belongs to *this* thesis — der Schlüssel auf der Karte

CHAMPION §4.6 already rules **eine einzige Freigabe**: fog opens because knowledge opened, one control
not two. Under Der Schlüsselmeister that control is a **key**, and the map is where keys are pressed in
bulk with your eyes open.

The GM drags the party's four tokens into the temple's antechamber. Before she presses anything, the
canvas shows her — in the rail, not on the map — **exactly what the one keypress will teach whom:**

```
Vorkammer freigeben                                     4 Figuren
  Sera     +2 Passagen   (hält den Raum noch nicht)
  Brannt   +0            (hält ihn bereits — Sitzung 11)
  Thorbin  +3 Passagen
  Almek    +2 Passagen   ⚠ Almek ist nicht am Tisch  →  „+0 · nichts mitgebracht"
                                            [ F ] freigeben   [ Esc ]
```

One press. **Four `Revelation`s, four names, four `erfahrungsgrad` values, one audit entry, and the fog
lifts for exactly the characters it should.** This is a batch — and it is the *legible* batch, the one
that answers §4's whole problem, because **you can see what you are consenting to: it is on the map, and
the rail tells you the differential before you commit.** Nothing in die Schleuse can offer that, which is
why die Schleuse pays for legibility with a 1.5-second floor instead.

**And the departed-player row is not decoration** — it is round 4's grafted *Freistelle* chip grammar
(CHAMPION §18) doing its job on a new surface: an honest gap in the same vocabulary, rather than a
character silently vanishing from the reveal.

### 7.3 What the canvas costs, and the precondition

**+23 developer-days** against CHAMPION §9.2's own line items (§10.4). And it does not start until
**S-T1 runs**: one day for a first Pixi frame against the measured scene (`04` §8.2's `S-K1`), then the
perf harness and the budget scene. **Unrun for four rounds is the lineage's oldest debt and this
candidate pays it in slice 1 or does not ship.**

---

## 8. Die Übernahme — what happens when a real wiki arrives

**The corpus is the specification.** 69.3 % of links red · 3 of 74 articles categorised · `Vorlage:Regierung`
carrying nine articles and **six different kinds of thing** (WELT.md §2.1) · `Arvex Aurelius Paradon`
with 18 infobox rows and zero prose · `Gotteserhöhung` at 3 bytes with 8 inbound links · two articles
carrying 30 % of the corpus. **A candidate that only works on a tidy wiki has failed the brief.**

### 8.1 The first sixty seconds

**Not an encyclopedia. Three screens, in this order.**

**0–10 s · die Verlustliste.** RB-12 §2.8 rules that *"the import report is a first-class artefact and it
is a list of losses, not a success banner."* This candidate makes it **screen one**, not a link:

> **73 Einträge · 1 Weiterleitung · 1.100 Passagen · 543 Felder · 497 Absätze · 60 Listen**
> **Nicht übernommen:** 1 Wikitabelle (als Rohblock erhalten) · 16 Kurzabsätze · 137 unbenutzte
> Vorlagen · 22 Module · 4 Notationsziele (15 Kanten: `N. K.`, `N. K`, `V. K.`, `V. K`) ·
> 14 verwaiste Dateien · **31 von 41 Dateien ohne feststellbare Lizenz**
> *Textbewahrung: 97,2 %.*

*(Passage count: **RB-12 §2.6's V1 ruling, 1,100**. `WELT.md` §3.2 recounts the corpus at 1,075 and
corrects the README's prose-paragraph count from 216 to 492. **RB-12 §9.7 names this disagreement as
open and unreconciled**; this candidate adopts V1 because RB-12 §2.6 is the ruling and its decomposer is
specified and reproducible, and flags the divergence rather than silently averaging it.)*

**10–35 s · die neun Zeilen.** The mandatory, non-skippable template→type mapping (RB-12 §4.4). **Nine
rows, not 74** — and the screen carries WELT.md §2.1's finding as a visible warning on the
`Regierung` row: *„9 Artikel, mindestens 6 verschiedene Dinge — Staat, Adelshaus, Finanzbehörde,
Wahlversammlung, Attentäterorden, Glaubensbruderschaft."* Four minutes of a human's judgment, and it is
the moment the import stops being a conversion and becomes a decision. **K7 is enforced here: the screen
is generated from *her* templates. There is no Eron in the code.**

**35–60 s · der Schlüsselstapel, Karte eins.**

> **„Vier Türen, ein Land."**
> `Geeintes Elfenreich Demmaros` (9) · `Geeinte Elfenreich Demmaros` (1) ·
> `Geeinigtes Elfenreich Demmaros` (1) · `Vereinigtes Elfenreich Demmaros` (1)
> *12 Links, eine Seite.* `[ Z ] zusammenlegen`

### 8.2 What this thesis does with the redlinks

| | Vor | Nach der Triage | Nach der Zusammenlegung |
|---|---:|---:|---:|
| Distinkte fehlende Ziele | 689 | 672 (17 Notations-/Flexionsziele verworfen, 28 Kanten) | **≈659** |
| Tier **Tür** (≥3 eingehend) | 113 | 113 | **≈109**, zwei davon im Rang gestiegen |
| Tier **Spur** (=2) | 100 | | |
| Tier **Notiz** (=1) | 472 (68,5 %) | | **unverändert — und das Produkt hat für sie nichts** |

**And then the supply side, which is the actual thesis.** Model, with every input stated so it can be
refuted:

| | CHAMPION v5 | Der Schlüsselmeister |
|---|---|---|
| GM budget for key-work | 4 min in-session (Prägerate cap) + ~5 min/week = **540 s** | same **540 s** |
| Cost per key | **~90 s** — write and seal one line (CHAMPION §15.14) | **~20 s** — read a 390-char median paragraph (RB-12 §2.2) and judge |
| Supply from budget | 6/week, **capped at 5** (≤1/player/week + 2) | **~27/week** from budget… |
| Supply from play | — | …**bounded by events: ~15/week** for a three-player table |
| **Effective supply** | **5 keys/week** | **≈15 keys/week** |
| Day-one door queue (113 tier-1) | **23 Wochen** (RB-12 §5.4, unimproved by RB-21a §6.4) | **≈7,5 Wochen** |

**Three things must be said about that table, in this order.**

1. **It is arithmetic, not a measurement.** Every input is named so it can go red. Gate **S1 · die
   Schleusenquote** (§12.3) refutes it in four weeks if it is wrong. The champion's own gate zero — the
   mint rate — has been **never measured for five rounds**, and this candidate does not fix that either.
2. **The structural claim underneath it is stronger than the number, and it does not depend on the
   inputs.** The champion's key supply is one GM's *writing* divided among *n* players — it **falls** as
   the table grows. This candidate's supply is *n* players' writing filtered through one GM's *reading*
   — it **rises** as the table grows. **They are different resources with opposite slopes**, and that is
   true whatever the constants turn out to be.
3. **It is still not enough, and pretending otherwise would repeat round 4's mistake.** 7.5 weeks is not
   a solved problem, it is a survivable one. And the 472 singleton targets — **69 % of everything
   missing** — are untouched by every mechanism in this document.

### 8.3 What is honestly lost

- **Everything RB-12 §7.2 declares:** infobox themes, 137 templates, 22 Lua modules (never executed —
  invariant 2 applies to imports with full force), 88 heading-only sections (preserved as `pfad[]`), 16
  short fragments, 1,152 of 1,153 revisions. **Our history starts at import.**
- **The 472 `Notiz`-tier targets.** They render as dotted text and this product has no mechanism for
  them, ever. A word somebody linked once is not a door and will not become one.
- **Piped typos my merge cannot catch.** String-similarity finds `Königgreich`/`Königreich`. It does not
  find a genuinely different misspelling, and 26 % of redlink occurrences hide the target behind display
  text.
- **`Gotteserhöhung`, and this one hurts.** 3 bytes (`Die`), 8 inbound links, a central world concept —
  and it is **not a redlink at all**, so it never enters the deck. **This candidate's whole economy is
  blind to the article that exists and says nothing.** Fandom has no state between "article" and
  "nothing"; the champion has one (a passage); **the deck does not rank it.** Named in §11.3.
- **Images: nothing ships.** 0 of 41 files carry a licence field; 31 are `unbekannt`. RB-12 §6.3's
  policy is adopted whole — imported, quarantined, visibly marked, excluded from every export and from
  every public projection with no GM override.
- **CC BY-SA, unresolved and now worse.** RB-13 §8.7 and RB-12 §6.4 leave the boundary undefined:
  *if a CC BY-SA paragraph becomes three passages and play mints a fourth beside them, which are which?*
  **This candidate adds a third rights-holder to that question** (§11.2).

---

## 9. The data shape

`02-domain-model.md` and CHAMPION §8 are inherited whole. **Four new tables, two nullable columns, one
new enum value, one new mint handler. The `Quelle` sum type is untouched and gains no constructor.**

```text
Schreibrecht (id, campaign_id,
              inhaber_user_id NOT NULL,          -- immutable
              inhaber_character_id NULL,         -- NULL for a mandate-earned right
              anker ∈ Eintrag(entry_id) | RoterLink(link_id) | Keim(titel),
              erworben_durch_wurf_id,            -- the roll that earned it
              verfall ∈ NaechsteSitzung | Datum(d),
              status ∈ offen | geschrieben | ratifiziert | abgelehnt | verfallen)

Vormerkung   (id, schreibrecht_id, entry_id,
              text UntrustedText,                -- NOT a Passage. different table, different id space.
              verfasser_user_id, geschrieben_at) -- no encoder in the player payload codec

Mandat       (id, campaign_id,
              inhaber_user_id NOT NULL,          -- a USER. there is no character_id constructor.
              geltung ∈ Etikett(e) | Raum(ort_id, tiefe) | Eintrag(entry_id),   -- immutable
              erteilt_von_user_id, erteilt_at,
              verfall, cap_pro_woche,
              widerrufen_at NULL, widerruf_rueckwirkend boolean)

Ratifikation (id, vormerkung_id, durch_user_id NOT NULL, unter_mandat_id NULL,
              ergebnis ∈ kanon | geaendert | abgelehnt,
              passage_id NULL, at)               -- append-only, never updated

Zusammenlegung (id, ziel_titel, quell_titel[], durch_user_id, at)   -- audited, reversible
```

**Changed columns, all of them:**

- `Passage.verfasst_von_user_id` (nullable) — **the second name.** Null for everything the champion
  already mints; set for a ratified Vormerkung.
- `Passage.freigegeben_von_user_id` — the release line. **Two names on one paragraph is one nullable
  column and it is the whole flex.**
- `Passage.gepraegt_durch` gains one value: `ratifikation`.
- `Passage.status` gains one value: `zurückgezogen` — out of canon, out of exports, out of derivations,
  permanently addressable.
- `praegung.*` gains its **sixth and final** handler: `praegung.ratifikation`.

**Explicitly unchanged, and each is load-bearing:**

- **`Quelle` gets no fourth constructor.** A ratified paragraph's `Quelle` is `Wurf(wurf_id)` — the roll
  genuinely happened and the paragraph is what it produced. This is the *same* shape as P1, which is why
  `Nachrechnen` (CHAMPION §4.11) works on it unchanged and the seal on the footnote in §2 is real.
- **`Sicht`, Grenze B9, `Kein Nenner`, `NurLeitung<T>`, der Zwillingsbeweis, die Namenswache** — the
  entire spine of CHAMPION §6, untouched. Every new surface here is a projection through it, which is
  also why **S-P1 remains a hard precondition** and this candidate loads **four** more oracle rows onto
  it (`vormerkung`, `schleuse`, `mandat_tafel`, `nachfrage_zaehler`).
- **`ImportHerkunft`, `Alias`, `Asset.lizenz_status`** — RB-12 §10.5's three objects, accepted as
  specified. `Alias` is what die Zusammenlegung writes.
- **`Ort` / `Ding` / `Bezug` / `Karte` / `Anker`** — RB-21a's containment contract, adopted whole and
  unamended. The tree is a permission decision (89 % leak, measured) and this candidate does not touch it.

---

## 10. The first slice — „Die Schleuse"

**One workflow: one import, one evening, one Tuesday, one Wednesday.** Browser only, hosted room, three
people, **and a canvas.**

### 10.1 End to end, twelve steps

1. Kaya pastes `https://eron.fandom.com/de/`. **Verlustliste → neun Zeilen → Stapel.** Card one: *„Vier
   Türen, ein Land."* `Z`. Four minutes later: thirty keys, eight merges.
2. Two players join by link (die Namenswache runs). A player who wants a right to survive to Wednesday
   carries **die Wiederkehr** — CHAMPION §7.6, and it is still named as an account.
3. Session 14 opens on **die Leinwand**: a single-image scene, square grid, four tokens, initiative.
4. Sera rolls Sprachen against `Andarisch`. `+2 · du hältst 4 Passagen mit #hochelfenrat`. 21 vs 18.
5. **Ein Schreibrecht wird geprägt.** She sees a ring with a pen in it. Nobody else sees anything.
6. The party enters the antechamber. Kaya drags four tokens, reads the differential rail, presses `F`.
   **Four revelations, four names, fog lifts per character.**
7. A guard drops below 0 → `defeat_pending` → Kaya confirms → one `ereignis` passage. (Invariant 4.)
8. **Dienstag, 22:10.** Sera writes four sentences from a train. `Vormerkung v_0441`.
9. **Mittwoch, 08:14.** Die Schleuse. Six cards. `E`, one word, `K`. **18 Türen geschlossen**, two names
   on the footnote, **Nachrechnen** green.
10. Open Brannt's DevTools on Tuesday **and** Wednesday morning: no bytes of Sera's right, her Vormerkung
    or her text. His `Andarisch` is byte-identical to a reader with no campaign at all, until 08:14.
11. **Samstag, Sitzung 15.** Der Umbruch marks the week in place. The Lücke's ranked demand has moved.
12. Export → import → **diff empty**, including `autoren[]`, `ImportHerkunft`, Schreibrechte,
    Ratifikationen and every `zurückgezogen` passage. (RB-12 §6.4's carry-back is in the diff.)

### 10.2 What is explicitly **not** in slice 1

- **Player mandates.** Slice 1 issues mandates **only to memberships with `role = spielleitung`** — a
  co-GM — which costs **zero new permission surface** because `02-domain-model.md` already has the role.
  **The player mandate is held until gate S1 is green**, because delegating to a player before we know
  whether one GM can read fifteen cards a week is delegating to solve a problem we have not measured.
- **Der Brief and die Postlaufzeit** (champion's own cut order #2: *the door is the flex, the letter is
  the depth*), der Aushang, die Ausgabe as a package, push notifications of any kind, `freigabe: offen`.
- **The tile pyramid, KTX2, the stamp renderer, the atlas, brushes, UVTT export, Scene Levels, dynamic
  LOS, WFC, 3D.**
- **The editor.** A Vormerkung is written in a single-line composer. The measured editor (116 SLOC,
  0.087 ms/keystroke at 300 passages, CHAMPION §2) stays dormant for a fifth round.
- **Re-import.** RB-12 §8.2's 7-day reconciliation UI is slice 2 — but **A15 (idempotence) and A16
  (re-import under change, from the real `Erismus` rev-910/1139 pair) are slice-1 CI assertions**,
  because RB-12 §7.3 is right that a one-shot importer is worse than none.

### 10.3 If slice 1 must shrink — the cut order, in order

1. UVTT import (keep the region/wall data model; parse in slice 2).
2. Hex and gridless (keep square).
3. Die Zusammenlegung (keep the deck; merge by hand).
4. **The RB-12 importer itself** — ship against `eron-export.xml` as an offline fixture only, and defer
   the URL-in pipeline. *(This is the cut, and it is the one that hurts: it turns die Übernahme from a
   product into a demo.)*
5. **The canvas is cut last, after the import.** A fifth round of deferring it is not a decision.

**Never:** the six mint handlers · `Sicht`/B9 · `haelt_etikett`/`erfahrungsgrad` · der Zwillingsbeweis ·
die Herkunftsschicht · **die Schleuse** · **`Schweigen gibt nichts frei`**.

### 10.4 The bill, decomposed against CHAMPION §9.2's own table

| Line | CHAMPION v5 slice 1 | Here | Note |
|---|---:|---:|---|
| Everything CHAMPION §9.2 costs at slice 1 (no canvas) | 67 | 67 | carried |
| Die Woche's delta (§9.3) | 38 | **31** | −4 der Brief, −3 UVTT export |
| `MapRenderer` + Pixi + input abstraction, single-image scene | 0 | **8** | S-T1 precondition |
| Tokens: drag, snap ×3, elevation | 3 | **8** | |
| Fog: per-character vector mask (RB-20b measured) | 2 | **7** | |
| Perf harness, budget scene, CI gates | 1 | **4** | |
| Kartenabzug + masked handouts | 4 | **6** | |
| Tile pyramid, KTX2, stamps, atlas | 0 | **0** | refused / slice 2 |
| **Schreibrecht + Vormerkung + die Schleuse** | — | **6** | med |
| **Der Schlüsselstapel + die Zusammenlegung + Alias** | — | **5** | low |
| **Das Mandat (Zweitleitung only) + Widerruf + Widerrufsbuch** | — | **3** | **high** |
| **Der Mandatsbeweis + 4 new oracle rows + S4/S5 fixtures** | — | **3** | med |
| **Die Verjüngung: retire der Vollmachtszettel into die Schleuse** | — | **−1** | |
| **RB-12 §8.1 slice-1 importer** | 0 | **29** | **high** — RB-12 §8.3 names the decomposer and re-import as the risk |
| | **105** | **≈166** | ≈ **200 with RB-18's 20 % contingency** |

**Said plainly: this candidate is ~60 % more expensive than the champion's slice 1, and the reason is
that it stops deferring both of the lineage's two largest debts at once.** RB-18's arithmetic applies in
full and this candidate does not escape it. **§11.4.**

---

## 11. Weaknesses

### 11.1 The rubber stamp — and this is the hard one

**Die Schleuse's whole value is that ratification is cheap. Its whole danger is that ratification is
cheap.** The 1.5-second floor and the 8-second median gate (S2) measure elapsed time, not
comprehension. At fifteen cards a week the fifteenth is not read, and **no mechanism in this candidate
makes an unread paragraph unrepresentable** the way `NurLeitung<T>` makes a denominator unrepresentable.
Every safeguard in §4.2 is a rule with a gate. **This is the exact line the brief predicted Athena would
hunt for, it is where she should aim, and this document does not claim to have closed it.** The most
honest thing available is that the *consequence* is bounded: `Widerruf` un-canons, `zurückgezogen`
preserves, and the audit trail names who stamped what — the product can prove it went wrong, which is
not the same as preventing it.

### 11.2 Two names on one paragraph is a rights problem squared

RB-12 §6.4: CC BY-SA **propagates through derivatives**, and share-alike *has teeth*. A player-authored
passage, ratified by a GM, sitting in an entry decomposed from an imported CC BY-SA article has **three
rights-holders and one licence with an attribution obligation that must survive export**. Round 4 left
right-to-erasure vs. a durable citable `Wurf` unresolved and then collided it with a second person's
writing (der Brief). **This candidate collides it with a second person's writing *inside the canonical
object itself*.** A player who leaves and asks to be forgotten is asking to be removed from paragraphs
that other characters hold, that other rolls cite, and that an `Ausgabe` may already have shipped.
**Unresolved. Named. Not fixable inside this document.**

### 11.3 The economy is blind to everything the corpus did not make loud

The deck ranks by inbound demand. That is arithmetic, no AI, no guessing — and it is also its ceiling.
**472 of 689 missing targets (68.5 %) are wanted exactly once and will never enter the deck.**
`Gotteserhöhung` — 3 bytes, 8 inbound, a central world concept — is not a redlink at all and is
therefore invisible to every mechanism in §3.3. **The product is excellent at the holes the world
shouted about and has nothing at all for the holes it whispered.**

### 11.4 166 days, and both new load-bearing halves are unspiked

The canvas has never been built in five rounds (S-T1 unrun). The importer has never been built and
RB-12 §8.3 states in its own voice that its decomposer estimate *"is an estimate for the easy case"* and
that everything past the first construct Eron does not have is **unestimated**. This candidate makes
both load-bearing in slice 1. **RB-18's warning — *"a schedule denominated in an uncalibrated unit is
not a bill; it is a hope with columns"* — applies to §10.4 without discount.**

### 11.5 A player who writes canon writes a chase-shaped world

The conflict-of-interest lockout (§3.2) blocks the mechanical case: no mandate over your own open
Vorhaben. It does nothing about the deeper one. A player writing about the thing her character is
pursuing writes a world bent toward that pursuit, in a hundred small unfalsifiable ways, and **the GM's
veto is a filter on text, not on pressure.** Rejecting a friend's four sentences at 08:14 on a Wednesday
is a social act the product creates and cannot pay for. Round 4's Vollmacht never asked anyone to do
that.

### 11.6 Everything the champion carries, carried

`Sicht` unbuilt and unmeasured for a **fifth** round with **four more** projected surfaces loaded onto it
· the mint rate never measured (gate zero, unmoved) · **search at scale red for a fifth round and made
worse by this round's own content** (more short passages, from more hands, on more days, plus a demand-count
join on every article render) · the 02:00 long-form writer still least-served · the revocation race still
unattacked · the art pipeline still `[needs a quote]` · Fantasy Grounds still giving away free the relay we pay
for · die Wiederkehr's real cost still unchecked against anything.

---

## 12. The differentiation ledger — both halves

**A ledger with no losses is a lie.** The losses are in the right-hand column and several of them are permanent.

### 12.1 The table half

| Rival | What this candidate does that they cannot | What they still do better |
|---|---|---|
| **Foundry VTT** ($50 once) | **Correction carried, per `04` §8.1 [FALSE]: Foundry's journal is not an HTML string.** It is Pages; a GM can show a page to individually chosen players; **Secret** blocks hide behind a reveal button. What Foundry lacks is **derivation** — visibility is assigned per document, by hand, at the Entry level, and composes with nothing: it does not know what a character has seen, does not move when she learns, does not lift the fog and does not change a die roll. And **no VTT has a mechanism by which a player writes something a GM ratifies into a shared knowledge object with a provenance date.** | Tactical depth, ten years of modules, rules automation for 5e, **Scene Levels shipped in core v14** — which we refuse for years. |
| **Roll20** | Per-character knowledge as the same predicate as the fog; an export that exists | Network effect, zero-install browser onboarding, the marketplace |
| **Fantasy Grounds** | A knowledge surface that is written by play rather than read-only | **Free-to-play since 2025-11-08 with a free cloud relay** — they give away the reachability we pay 13 % of die Raumuhr for. Not closable by design. |
| **Owlbear Rodeo** | Anything that persists | ~20 minutes to a table. We will never win minute one. |
| **Alchemy** | Per-character projection; a citable roll | Production values, Sheet Builder, a live catalogue of pre-made adventures |
| **TaleSpire** | Sheets, rules, journals, a canon | The diorama gasp, and a genuine async precedent (persistent boards) |

### 12.2 The wiki half — new from this round (RB-13)

| Rival | What this candidate does that they cannot | What they still do better |
|---|---|---|
| **Fandom** | **Two names on one paragraph.** Reader-specific content is architecturally impossible: one cached page per URL (`surrogate-key: wiki-2915492`). `Wantedpages` exists but is unranked and unreachable from the reading surface. **No state between "article" and "nothing."** | **Free, zero-ops, forever, with 226 extensions on someone else's CDN** (RB-13 W1 — *"the strongest thing about Fandom and it is not close"*). Google. A mobile app. Lua. 80-language i18n. **And Portable Infoboxes, which our own flex depends on and which they standardised for us** (W2). |
| **World Anvil** ($105/yr, **$650 lifetime**) | **Inline Article Creation, released 2026-01-14** (`04` §0.2), makes the red link a faster way for **the world's owner** to open a text editor, for free and Guild users alike. **Ours makes it a way for someone who is not the owner to write at all** — on an authority that is scoped, dated, revocable and printed. Their own Campaign Manager FAQ says it is **not a VTT**; the community request is open and unshipped; **nothing on World Anvil carries a provenance date**, so a feed of minted paragraphs is structurally uncopyable. | Manuscripts, timelines, family trees, diplomacy webs, whiteboards, a shipped Foundry module (MIT, in Foundry Gaming's own GitHub org), a decade of surface area — **and they are actively repairing their overwhelm on a dated schedule** (`04` §0.1), so we may not cite it. |
| **LegendKeeper** ($7.50–9/mo) | Per-character projection under the nesting. **Their permission model is share-level** — *"they see what you want, nothing more"* — per-viewer at best, no `erfahrungsgrad`, no fog. And they refuse the table on purpose, so the fusion is unreachable **by their choice**. | **They out-craft us today.** Unlimited everything, offline edit + sync, *"you own your data,"* unlimited free guests — and **nested maps already shipped** (*"nest your maps indefinitely"*, RB-21a). **Our nesting is parity, not a differentiator.** |
| **Kanka** | A play surface at all | A free tier with unlimited entries |
| **Obsidian Publish / Notion** | Reader identity — without it per-character projection is **not expressible** | Obsidian: free, local, no telemetry. Notion: everything else. |

**And the loss that is permanent and must be stated in the product's own voice** (RB-13 §7): a
default-deny world is **default-unindexable**. Googlebot is a reader with no revelations. *Fandom is
where a stranger finds your world; this is where your table lives in it.* **We will never be the first
result for someone else's fandom and must stop writing sentences that imply we might.** Likewise
*"players always free"* is **table stakes, not a differentiator** (`04` §8.1) — World Anvil, LegendKeeper,
Foundry and Rollplay all offer it — and it stays on the pricing page as a promise, never in a
competitive claim.

### 12.3 RB-13's measurable targets — this candidate's numbers

| # | Target | This candidate | Fandom, for the record |
|---|---|---|---|
| **M3** | markup-to-text ratio, Eron median article | **≤ 4 ×** | **16.3 ×** measured |
| **M4/M5** | LCP / TBT / TTI | ≤ 1.5 s / ≤ 200 ms / ≤ 3 s | **7.0 s / 3,620–66,700 ms / 28.6–80.8 s** — their own published *best* case |
| **M7/M8/M9** | ads · interstitials · pre-interaction state | **0 · 0 · 0**, as CI grep gates | 3 cookies on a bare `HEAD` |
| **M10** | der Zwillingsbeweis over the **real** Eron corpus, ≥3 articles incl. one with a door | required green, and **extended**: identical bytes for a reader who does not hold an open Vormerkung | architecturally impossible |
| **M13** | ownership round-trip incl. source URL, licence, modified flag, `autoren[]` | required green in slice 1 | text-only dump, one per seven days, no images |
| **M18** | no-prose survival — `Arvex Aurelius Paradon`, 18 rows, zero prose | required green | — |
| **M19** | type from the infobox template, works when 71 of 74 articles carry no category | 9-row mapping screen, human-confirmed | Fandom's own offer used by **3 of 74** |
| **M20** | 1,253 redlinks → a usable number | **689 → ≈659 doors**, of which **≈109 tier-1**; **supply 5 → ≈15 keys/week**; queue **23 → ≈7.5 weeks** — all gated by S1 | `Wantedpages`, unranked |
| **M14** | theme editor refuses to save a WCAG-AA-failing theme | required — **Fandom already does this** and we must not ship worse | a feature, not a defect |

---

## 13. The gates

**Every one can go red. Three of them refute this candidate.**

| Gate | Green when | If red |
|---|---|---|
| **S1 · die Schleusenquote** | Over four instrumented weeks: **≥60 %** of earned Schreibrechte are written before expiry, **and ≥80 %** of Vormerkungen are ratified *or rejected* rather than expiring unread | **The thesis is refuted.** If the GM does not read, this is a stamp with extra steps and round 4's champion was right. |
| **S2 · die Lesezeit** | Instrumented median time-on-card in die Schleuse **≥ 8 s**; the ratify key is inert for the first 1.5 s; **no ratification surface produces >1 `Ratifikation` per keypress** (`oracles.yaml`) | as above |
| **S3 · der Mandatsbeweis** | A mandate holder's **character's** rolls, book, DOM, `getFullAXTree` and response timing are byte-identical to a non-holder's | Authority leaks into knowledge and §3.2's central safeguard is fiction |
| **S4 · die Stille** | A fixture campaign where nobody presses anything for 30 simulated days produces **0** new Passages, **0** Revelations, **0** changed export bytes | `Schweigen gibt nichts frei` is false and the invariant is gone |
| **S5 · die Achtzehn** | On the real Eron fixture, ratifying `Andarisch` turns **exactly 18** red edges blue and no others; the printed count is a per-reader `Sicht` projection and differs per reader; der Zwillingsbeweis holds over it | the flex is a copy line |
| **S-T1 · der Tisch, gebaut** | **Runs in slice 1.** One day for a first Pixi frame against the measured scene (`S-K1`), then the perf harness and RB-02's budgets as CI gates | **Unrun for a fifth round is the answer round-04's verdict §6 already gave.** |
| **S-P1 · Drei Bücher, ein Server** | ~2 days, **mandatory before anything in §9 is believed**. `04` §8.5: *"not a recommendation and not negotiable by a candidate that would rather draw something."* | Five rounds of grafted, unbuilt `Sicht`, now with four more surfaces on it |
| **Prägerate** (gate zero, carried) | ≥8 mints, ≤4 min GM chrome typing, no interaction >12 s | falsifies this champion **and** its predecessor |
| **Die Verjüngung** | Net authoring surfaces in the Forge did not grow this round | `04` §8.3's rule, paid for the first time |
| **Alle Tore aus CHAMPION §12.4** | carried unchanged, incl. **Nachgerechnet**, **Geschlossene Tüte**, **Kein Strom**, **W0–W3** | — |
| **RB-12 A1–A19** | all 19 machine assertions + the 10-minute human pass, incl. **A19 (anti-Eron: a second, structurally different corpus)** — *and that fixture does not exist yet and is a named prerequisite* | The importer is an Eron importer, which the brief forbids |

**Reachability, with a number.** The world stays scale-to-zero, woken by request. Round 4 priced ~6 wake
events/campaign-week at ≤90 s ⇒ 8.7 % of die Raumuhr's 300-hour allowance. This candidate adds player
writes and one weekly Schleuse read: **~9 wake events, one of them ~180 s ⇒ ~13 %**, +19 % hosted compute
against ~16 session-hours/month. Inputs shown; order-of-magnitude only; **die Raumuhr's shape is
unchanged and no feature moves behind a recurring charge** (`04` §9 P1's ruling, inherited).

---

## 14. Creative extensions

**Die Widerrufsprobe — counterfactual canon.** Because `Widerruf` un-canons a mandate's entire output in
one audited gesture and preserves every passage as `zurückgezogen`, a GM can ask a question no
worldbuilding tool can answer: *"what would this world look like if none of that had been true?"* —
reversibly, with the answer rendered as a real `Sicht` over a real corpus, and one keypress back. A
safety mechanism turns out to be a **narrative instrument**, and it exists only because delegation
forced us to make being wrong cheap.

**Der Fremdschlüssel — the audience may knock.** `04` §8.1 promotes *die offene Tür* from a per-article
toggle to launch-blocking world-level publication with a **feed of minted paragraphs** — the one item a
rival structurally cannot copy, because nothing on World Anvil carries a provenance date. Under this
thesis that published world can carry a *door*: a reader who is not at the table may write a Vormerkung
through it. **The entire safety model is the one already built — it lands in die Schleuse, it is not
canon, and silence refuses it.** A world with readers becomes a world with contributors without becoming
a wiki, and the GM never loses the veto.

**Der Lehrbrief — delegation as a shippable artefact.** Die Ausgabe currently bundles a seed, sealed
lines and letters in transit. Add mandates: a setting author publishes not just content but a
**delegation structure** — *"this scope belongs to whoever plays the archivist."* A new GM inherits an
answer to a question she did not know she had, and it is declarative, closed-schema, and validated by
`Geschlossene Tüte`'s eleven hostile fixtures plus three of its own.

---

## 15. Kaya's amendments

| | Amendment | This round |
|---|---|---|
| **K1** | Themes + templates | Authorship becomes a fourth provenance channel — **text**, so it survives high contrast by construction. Contrast floor enforced (M14). |
| **K2** | Visual GUI rule-builder | Der Mandatszettel joins; **der Vollmachtszettel retires**. Net surfaces unchanged. **Its price is still owed** (`04` §8.6.1). |
| **K3** | State-of-the-art GUI | Die Tafel stays co-equal with die Leinwand, not a fallback — accessibility as architecture, literally. |
| **K4** | Differentiation | New axis: **two names on one paragraph.** The seventh day is carried. |
| **K5** | Maps, generation, sprites | **The divergence closes.** The canvas ships in slice 1 as the reader-before-writer branch (`04` §8.4). Generation and the stamp library stay refused/deferred. |
| **K6** | Distribution | The phone is now the *writing* surface on a Tuesday, not only the reading one. |
| **K7** | Game feel through staging | Honoured, and tested: the mapping screen is generated from *her* templates; **A19 is the falsifier and its fixture does not exist yet.** |
| **K8/K9** | World Anvil, but bigger | Competing on **structure, never on their craft** (`04` §0.1): no VTT, no rules engine, no per-character projection — and now, no second author with a printed name. |

---

*Product candidate A, round 5. **Der Schlüsselmeister.** The bet, unhedged: the champion has spent five
rounds making the key more precious and this round makes the locksmith. It buys a world where 689 holes
close in weeks instead of half a decade, where the person who earned the paragraph writes it and the
person who owns the world reads it, and where a red link finally has more than one hand that may open
it. It pays for that with a Schleuse that could become a stamp and no type that prevents it; with two
names on one paragraph and three rights-holders behind it; with 166 days against the champion's 105,
because it refuses to defer the canvas or the import for a fifth round. **If gate S1 comes back red —
if the GM does not read what her players wrote — then the keys were never the constraint and this
document is wrong.** That is four weeks, not a year, and it remains the best thing about it.*

> *Nicht die Tür war zu schwer,*
> *sondern die eine Hand am Schlüssel.*
> *Nun schreibt, wer würfelt,*
> *und liest, wer die Welt besitzt —*
> *zwei Namen unter einem Absatz,*
> *und keiner davon ist die Uhr.*
