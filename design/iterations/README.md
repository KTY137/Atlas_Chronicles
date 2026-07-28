# The Iteration Arena

Kaya's standing order (2026-07-27, ~02:15, before sleeping): iterate the whole product idea
**ten times or more, ad infinitum** — adversarially reviewed, creatively extended, critically
examined. Apollon does not stop; Kaya stops him. Decisions that would need Kaya are either
deferred (recorded in `OPEN-DECISIONS.md`) or made by Apollon's own judgment and logged.

## The goal, restated verbatim in intent

> **Wiki/Fandom + PnP session** — combine what Foundry, Roll20 and all the others do, do it
> better, and create a product that is *truly a flex*.

## Round format

Each round produces **two materially different products**, hardened and judged:

```text
FORGE      two product candidates (different philosophies, never cosmetic variants)
  ↓
SPIKES     two GUI architects per product build real openable HTML artifacts,
           then cross-review each other's work
  ↓
ATTACK     an adversary tries to break each product on paper and in its spikes
  ↓
HARDEN     a feature architect answers the attack — every confirmed weakness becomes a
           concrete, sensible feature, not a patch of prose (this pairing is the point:
           adversary and feature agent work the same seam from opposite sides)
  ↓
VOTE       three independent judges (product, engineering, market) score both
  ↓
VERDICT    Apollon's oracle synthesizes; the winner becomes the champion of the next round,
           and the loser's best ideas are grafted on rather than discarded
```

## Lineage

| Path | Contents |
| --- | --- |
| `round-NN/product-A.md`, `product-B.md` | the two candidates of that round |
| `round-NN/spike-*.html` | the GUI architects' openable artifacts |
| `round-NN/attack-*.md` | adversary findings |
| `round-NN/features-*.md` | the hardening answers |
| `round-NN/verdict.md` | scores, the disagreement, the ruling |
| `CHAMPION.md` | the current best product — input to the next round |
| `OPEN-DECISIONS.md` | everything deferred for Kaya, with Apollon's provisional call |

Nothing is deleted. A losing candidate is lineage, not waste.

## Round log

| # | Candidates | Winner | The one thing that changed |
| --- | --- | --- | --- |
| 1 | **The Living Codex** (wiki-first) vs. The Table Engine (table-first) | **A, 3–0 (24:14)** | The substrate settled: knowledge decomposed to the **passage**, a passage can carry a declarative mechanical clause, and a clause is live for a character only if that character has a **revelation** for it — so a sentence a character read is a `+2` on their sheet, and the roll's derivation cites the sentence. Reader Projection (materialised per-character revelations) killed a fatal outright. B lost its pitch and gave up `Grant.mode`, proposal→commit as the engine's default shape, and three presence concepts. **Unimproved and honestly named: neither candidate advanced the live table, and nobody priced the rich-text editor** — nothing in the round has a cursor in it. |
| 1b | *(same theses, re-forged)* | **A, 2–1 (21:19)** | **Apollon's error:** `args` reached the script as a JSON string, so `args.round` was undefined and round 1 ran twice. Not wasted — the first forge predated [RB-11](../research/RB-11-steam-vs-browser-verdict.md) by two minutes and carried none of its binding requirements. The re-run is the honest round: **B took the product lens 8:6**, the margin fell from 24:14 to 21:19, and **both of A's votes are conditional in writing** — engineering flips to B if the rich-text editor prices expensive; market flips to B if Foundry/Roll20/FG world-import-at-launch gets descoped. Originals preserved as `*-forge-1.md` / `*.superseded-*.md`; nothing was overwritten silently. Script fixed to accept both arg forms. |
| 2 | **Das Skriptorium** (a passage is a paragraph in a real editor — buy the editor) vs. **Der Zettelkasten** (knowledge is immutable atoms, corrections supersede — delete the editor) | **A, 2–1 (20:17)** | **The editor was priced, broken by running code, and mended.** 116 SLOC, 0.087 ms/keystroke — then three fatals on A's own spike (no fixpoint across a page reload; lineage guessed from byte-identical text; Ctrl+Z orphaning revelations in an append-only table), each repaired by a mechanism *smaller* than what it replaced. **B lost the round and won the ideas: five of six grafts are its.** Biggest: `Sicht` — the choke point must **compose**, not merely filter, because eight leaks appeared in code written by the doctrine's own authors. Also grafted: `Zustand`+`defeat_pending` (invariant 4 was uncarried by *both* candidates for three rounds), the split infobox as the ninety-second acquisition still, Passagensätze as the first go-to-market invention, and the two mechanisms where the wiki makes the table *mechanically* better. **Margin narrowed again (24:14 → 21:19 → 20:17) and nobody has rolled a die yet — the atom fork is exhausted; round 3 forks on *who authors the canon*.** The oracle **withdrew** its own previous theses: the sidecar-vs-table fork is about the *entrance*, which import-at-launch substantially answered, and a sidecar concedes the "Foundry-grade live table" half of Kaya's sentence at the door. The fork that survived two rounds unanswered is sharper: **what is the atom of the codex, and who makes it?** It decides the editor's price, the primary stage, the visibility tax, the cold start, the mobile story, the import mapping, and whether the flex photographs. One buys an editor and gets prose; the other deletes the editor and gets composition. Fatals: *"you cannot build it"* vs. *"nobody wants it."* |
| 3 | **Der Konvent** (the canon is authored by everyone at the table) vs. **Der Abend** (the canon is the residue of play) | **B, 2–1 (20:18)** | **After three rounds of *"there is still no game in it"*, there is a game in it.** Der Abend's slice 1 ships dice, tokens, three grid types, elevation, lossless UVTT import *and* export, per-character fog derived from revelations, initiative, `defeat_pending`, undo and canvas accessibility — costed line by line with falsifiers on the high-risk rows — and the fusion becomes **bidirectional and mechanically inseparable**: `Wurf → Passage → footnote` runs table→wiki while `haelt_etikett`/`erfahrungsgrad` print `+2` to Sera and `+0 · Hörensagen` to Brannt **off the same clause**. A conceded half the brief in writing (*"It does not claim to be a virtual tabletop"*) and cut die Wissensprobe — the only knowledge→play mechanism — by name. **The split is the sharpest in the lineage: 8 / 4 / 8.** The engineering judge scored the winner a **4** — ~120 unspiked days, no Pixi, no server, no projector, worst optionality in the round — and that 4 is not discounted; it is written into the champion as gate zero. **Five grafts from the loser**, all repairs: der Briefkasten (world/letterbox split, < €0.01/campaign-month), die Berufung (a player cites her own passage mid-scene), `NurLeitung<T>` (the counted absence becomes a type with no player encoder), die Herkunftsprobe + the **deny-list inversion of every gate** (three of the round's gates failed as allow-lists written from memory — the round's single structural lesson), and Autorschaft as a sum type with *„die Belegzeile ist ein Orakel"*. **The honest counterweight: nothing was built.** Four HTML pages, zero lines of server, renderer or projector code, and `Sicht` grafted forward unbuilt for the third round while both candidates loaded more onto it. **Round 4 therefore opens with three spikes, not two documents** — S-T1 (the table, ≤25 measured days), S-P1 (three books, one server, ~2 days) and the Prägerate harness. The *who authors* fork is exhausted; round 4 forks on **whether the product lives between the evenings** (Die Woche) or **arrives already lived-in** (Die erste Minute). |
| 4 | **Die Woche** (the campaign has no off-days) vs. **Die erste Minute** (the world arrives already lived-in) | **A, 2–1 (19:18.5)** | **The narrowest split in the lineage: half a point on raw sum, lens-win count 2–1, and the one lens scoring buildability (engineering: **4** on A) hides a structural disagreement about what "buildable" means.** Die Woche's mechanism: **Die Vollmacht** — a scoped, capped, revocable pre-authorisation lets a GM write and authorise an outcome on Saturday night, for a player to fire on Tuesday, and the canon accretes with a weekday stamped on it. **The fatal break (attack-A Break 1):** identity must survive across days with **no account**, but the champion's permission model is keyed to `user_id` and calls the connection *"ephemeral, never persisted"*. **The ruling:** account-free join is preserved **only** for the single-evening, spectator, and evaluator path; any player who wants a Vollmacht to outlive the session it was issued in carries **Die Wiederkehr** — a lightweight passkey credential, password-free, emailless, and honestly named as an account rather than engineered around the refusal to name it. This is the engineering judge's own flip condition, deliberately triggered, turning a session-scoped app into an always-on async service at +8.7 % annual compute cost. **Five grafts from the loser, led by Nachrechnen** (the seed/AST/package-pin replay verifier, specified on its own copy as *"durability, not anti-forgery"*, asked for unprompted by two independent judges) plus die Fokuswache (scoped, focus-guarded mint hotkey), Geschlossene Tüte (closed-schema discipline applied to die Ausgabe), die Testtafel (live per-actor clause preview in the rule-builder), and die Freistelle-style honest-gap chip grammar. **The honest counterweight, and it is the signal this verdict names for round 5:** this round moved only the newest fifth of the product. Both candidates, independently, deferred the canvas rather than spike it — which means the ~120-day tactical half (Pixi, tile pyramid, KTX2, GPU fog texture) has now sat untouched for a **fourth round running**. A round that reshuffled more than it advanced, and the 19 to 18.5 margin (down from 20:17 and 20:18) is the honest instrument reading that back. The work order: either de-risk the canvas at scale (gate S-T1, ≤25 measured days) or spend round 5 provisioning Die Wiederkehr for real and running gate W1 as an instrumented pilot. **No more extending without de-risking the oldest debt.** |

---

**Format change from round 5 onwards:** Kaya's standing order of 2026-07-27 — every round must gain a level in features AND optics. Each round now has a named craft floor ("die Stufe"): R5 Die Leinwand · R6 Der Doppelblick · R7 Die Werkstatt · R8 Die Choreographie · R9 Die Dichte · R10 Die Spielerhand · R11 Der Gesamteindruck. Candidates must declare **Vortragsfeatures** (new capability classes, not repairs or defenses). A **fourth judge** scores level-up and craft by opening the previous round's artifacts and comparing them side by side.
