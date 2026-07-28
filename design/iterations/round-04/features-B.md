# Features — Answering Round-4 Attack on Candidate B ("Die erste Minute")

**Author:** Feature Architect, working Nemesis's seam from the opposite side.
**Work order:** [`attack-B.md`](attack-B.md), four confirmed breaks (three major, one
minor–major), against [`product-B.md`](product-B.md).

Each feature below states: which break it answers (or "new capability"), what exists
concretely, why it earns its place tonight, its cost, and how it touches the ten hard
invariants. Nothing here is a promise — every fatal/major break gets a named mechanism,
a data shape, or an explicit "the product's own primitives already cover this."

---

## 1. Answering the four confirmed breaks

### 1.1 Die Fokuswache — scoped, guarded mint hotkey

**Answers:** Break 1 — global `Ctrl+Enter` hotkey with no focus guard, reproducibly
mis-triggerable from the search box.

**What it is, concretely.** The `keydown` listener moves off `document` and onto the
session shelf's containing element (the region that already holds `mintBtn`). Before
calling `praegen()`, it checks `document.activeElement`: if focus is inside any
`input`, `textarea`, `select`, or `[contenteditable]` node — including the `#q` search
box and every future rich-text field — the chord is left alone and falls through to
that field's own handler untouched. The shortcut's affordance (`Strg+Enter prägen`) is
shown next to `mintBtn` only while it is both enabled and the shelf holds focus, so the
gesture is discoverable exactly where it is legal and invisible everywhere else.
Nemesis's own repro (roll → click `#q` → type → Ctrl+Enter) becomes the first fixture in
a permanent regression suite: assert zero passages minted, before the fix lands, so the
fix is provably a fix and not a rewrite that happens to also work today.

**Why sensible now.** It is a one-listener change plus one activeElement check — exactly
the shape of fix the break asked for, no architecture involved, and it closes the door
before ProseMirror-class rich text (already on the champion's own roadmap) makes the
collision routine instead of occasional.

**Cost:** small.

**Invariants.** None violated. Strengthens invariant 10 (nothing is done without tests) —
the shipped fix and its regression fixture land together, not sequentially.

---

### 1.2 Die Wissensprojektion — a real per-(actor, passage) revelation ledger

**Answers:** Break 2 — the flagship "Erfahren schlägt Gehört" pairing (Sera +2 /
Brannt +0 from the same clause) is never computed, faked, or attempted; `haelt_etikett`
reads a flat per-passage `data-haelt` attribute with no per-character dimension.

**What it is, concretely.** `haelt_etikett(actor, etikett)` stops being a DOM query over
a shared attribute and becomes a real read against the `Revelation` rows the domain
model already specifies (§7.1(b) of `product-B.md`: "which character knew what, from
which source, with which `erfahrungsgrad`" — the data shape was named three rounds ago
and never wired). Concretely:

- Every `Revelation` row is keyed `(actor_id, passage_id)`, not `(passage_id)` alone, and
  carries `quelle ∈ Erlebt | Gehoert(actor_id, revelation_id) | Gelesen | Importiert`.
  `erfahrungsgrad` is *derived* from `quelle` by a mapping the installed rule package
  declares (declarative, per invariant 2 — never hardcoded in the engine).
- **Reveal writes are dual, in one transaction.** When a fact is revealed to Sera
  (`Erlebt`), the same server call writes a second row for every other actor present in
  the active scene: `Gehoert(brannt, quelle_revelation = sera's_row)`. This is the one
  concrete mechanism that makes the pairing real — the SAME clause, reading the SAME
  etikett, now genuinely evaluates to two different numbers for two different actors,
  because the row lives at `(actor, passage)`, not on the passage.
- The Beleg card's derivation line for Brannt's check now prints `+0 · Hörensagen zählt
  nicht (k_vharon_kenntnis@r7, dieselbe Klausel wie bei Sera)` — computed from his own
  `Revelation` row, not asserted in prose.
- This becomes the reference fixture the acceptance demo (§9.4) already promises but
  never had: both numbers, both real, in the same clause, in one CI-checked scenario.

**Why sensible now.** This is not new scope — it is building the thing the document
already claims exists in its own data model and quotes three times in its own selling
copy. It is the single highest-leverage fix in the round precisely because it is the
mechanic named as structurally uncopyable; leaving it unbuilt for a fifth round would
mean the candidate's central claim is still unproven where it is cheapest to prove.

**Cost:** medium. A real per-actor projection plus a transactional dual-write on reveal
is genuine engine work, but it is scoped to exactly the three predicates slice 1 already
commits to (`haelt`, `haelt_etikett`, `erfahrungsgrad`) — no new predicate, no new gesture.

**Invariants.** Strengthens invariant 6 (calculation transparency: the Beleg card now
shows *which* `Revelation` row and *whose* gesture produced the bonus, not just a number)
and stays inside invariant 2 (the `erfahrungsgrad` mapping is rule-package data, not code).

---

### 1.3 Die Freistelle & der Neuzugang — cast-size mismatch, handled and disclosed

**Answers:** Break 3 — every shipped Anlass hard-codes a 3-character cast; a table with a
different player count breaks the fusion silently (extra player gets a permanently
unexplained `+0`, or an unclaimed book sits advertised and unopened).

**What it is, concretely.**

- The Anlass manifest declares its cast explicitly — `besetzung: { buecher: […],
  groesse_empfohlen: N }` — and die Übernahme screen shows a **live seat count against
  joined players** as links are clicked: *„3 Bücher verfügbar · 4 Spieler beigetreten."*
  The mismatch is surfaced before the session starts, not discovered mid-scene.
- **Fewer players than books.** An unclaimed book is flagged `unbesetzt` in the Anlass
  panel — never hidden, matching the candidate's own honesty architecture — and defaults
  to GM-controlled NPC status, its inherited knowledge still counting toward party-scoped
  predicates exactly as the rule package defines. **Die Freistellung**: a one-click
  action promotes an `unbesetzt` book to any later-joining player, who inherits the same
  book a session-one player would have.
- **More players than books.** The extra player is walked through an explicit, worded
  choice at Übernahme — not a silent default: *„Neuer Charakter — du beginnst ohne
  mitgebrachtes Wissen"* or *„Diesen Platz mit [Name] teilen"* (a co-controller on the
  same Actor, using the domain model's existing many-to-many `CharacterController` —
  already speced for shared companions, no new table). Every check that would have scored
  a `haelt_etikett` bonus for a seated player renders `+0 · nichts mitgebracht` on the
  Neuzugang's card, in the **same visual grammar** Brannt's `Hörensagen` chip already
  uses — the reason is always visible on the card, never merely absent from it.
- **Die Aufholrunde**: one GM action reveals a named batch of passages to a newly-joined
  book in a single server call. It is a UI wrapper around the existing
  `praegung.freigabe` handler — same `actor_user_id`, same `gesture` discriminator, same
  audit row — not a bypass, so it stays inside the closed set of five mint handlers and
  the Prägerate gate's "≤4 min GM chrome" budget stays honest (bounded by N clicks, not
  free typing).

**Why sensible now.** Nemesis is right that this is the *default* case, not an edge case
— any table whose size differs from the seller's four sessions ago hits it. The fix uses
primitives the domain model already has (`CharacterController` many-to-many, the
five-gesture closed set, the existing chip grammar); it adds one manifest field and one
batch-wrapped gesture, not a new subsystem.

**Cost:** medium (mostly surface work; the only new persistent fact is the manifest's
declared seat count).

**Invariants.** Invariant 1 (server-authoritative — Aufholrunde still goes through the
handler, still lands in `AuditEntry`) and invariant 4/10 unaffected.

---

### 1.4 Das gemeinsame Infobox-Partial — one component, not two copies

**Answers:** Break 4 — B1's infobox lacks `overflow-wrap`; sibling spike B2 shows the fix
was already known.

**What it is, concretely.** `.infobox dt`/`dd` sizing (`min-width: 0`,
`overflow-wrap: anywhere`) is extracted into one shared design-system partial that both
skins (`Archive`, `Clean`) and every future spike import rather than redefine. Argus's
gate suite gains a check that diffs the infobox CSS actually applied under each skin
against the token source and fails the build if a skin overrides the wrap property —
closing the exact drift Nemesis found (B2 had the guard, B1 didn't) at the level of
"there is only one infobox," not "we remembered to copy the fix twice."

**Why sensible now.** The line-level fix is nearly free; the actual defect was
organisational — two components serving one visual contract with independently owned
CSS. Fixing the property without fixing the duplication guarantees the next skin, or the
next spike, regresses the same way.

**Cost:** small.

**Invariants.** None violated; strengthens invariant 10 via the added gate.

---

## 2. Beyond defence — making the fusion stranger, not just safer

### 2.1 Die Bruchlinie — table-native errata over inherited canon (new capability)

**What it is.** Because die Wissensprojektion (§1.2) now makes every fact's holder and
source explicit per actor, the GM can mark an inherited (`mitgebracht`) passage as
**superseded by table play** — *„das stimmt nicht mehr."* The original passage is never
deleted or silently rewritten (the same template/instance discipline invariant 3 already
demands, applied here by analogy: an imported fact is canon-as-shipped, table play is the
living instance). It stays visible, greyed, carrying a `widersprochen` chip, permanently
linked forward to the `am Tisch` passage that contradicts it. A reader sees both, in
order, stated in the product's own words. This is wiki-grade errata fused with
table-grade drama: players watch their own table falsify a stranger's fact, in public,
with a citation trail — the single-table cousin of §11.1's Die Gabelung, and cheaper.

**Why sensible now.** Zero new tables — it is one `PassageRelation` row typed
`widerspricht` (already an enumerated relation type in the format, §8.1) plus one
rendering rule for the chip. It strengthens the honesty thesis directly rather than
merely defending it: the product's whole sell is that it never lets you mistake one
person's record for your own, and this is the mechanism for the moment your own table
*replaces* someone else's record on purpose.

**Cost:** small.

### 2.2 Der Wissensspiegel — a GM knowledge-state mirror (new capability)

**What it is.** A read-only panel on the GM's Table rail listing, per present character,
which etiketten they currently hold and at what `erfahrungsgrad` — sourced directly from
die Wissensprojektion. Nothing new is computed; the dice engine already needs this
projection for every roll. This just surfaces it, so a tired GM can answer *"does anyone
at this table actually know about Ossa yet?"* in one glance instead of reconstructing it
from memory across four evenings of someone else's play plus however many of her own —
exactly the kind of GM chrome the Prägerate gate exists to eliminate.

**Why sensible now.** Pure UI over data §1.2 already has to build. Cheapest high-value
feature in the round because its marginal cost is a table, not an engine.

**Cost:** small.

### 2.3 Die Testtafel — a live per-character preview inside the rule-builder (new capability)

**What it is.** Der Klauselzettel (the visual rule-builder, K2, already slice-1) gains a
preview panel: as a system author edits a clause, it evaluates live against two or more
named test actors carrying different `erfahrungsgrad` for the same fact, shown side by
side — a Sera column and a Brannt column, updating as she types the clause. This is die
Wissensprojektion (§1.2) exposed as an authoring tool rather than only a runtime engine.

**Why sensible now.** RB-11 named the rule-builder as the go-to-market channel and a
published package "with a runnable example" as the differentiator over a package that
merely describes itself. This makes the example runnable *during authoring*, not only
after a played Anlass exists to prove it — a system author sees the "no rival stores
this" mechanic work before she ever ships a session, which is also the cheapest possible
way to make Break 2's fix visible to the people RB-11 says discovery runs through.

**Cost:** small (a preview surface over an engine §1.2 already builds).

---

## 3. Kill — the fourth provenance channel

**Remove:** "saturation rides colour" as a fourth *independent, load-bearing* encoding
channel in die Herkunftsschicht (alongside glyph shape = kind, fill = Herkunftsklasse,
stroke = `erfahrungsgrad`). Collapse to **three** load-bearing channels; colour/saturation
stays as decoration only, never asserted as an accessibility-independent carrier of
meaning.

**Why this is the right cut, not just a cut.** Three facts are load-bearing to the flex:
what kind of atom this is, whether it's `am Tisch` or `mitgebracht`, and how strongly a
given actor holds it. Shape, fill and stroke already cover exactly those three, each
verifiably surviving greyscale/high-contrast/colour-blind modes because each is a
*geometry* difference, not a colour difference. A fourth channel riding saturation is the
one channel in the set that is a colour difference — the weakest-surviving encoding of
the four under exactly the accessibility gate this candidate is contractually bound to
(invariant 8) — and Break 4 just demonstrated, in the same document, that this team
cannot currently keep two skins in sync on *simpler* CSS than a four-axis colour-and-shape
matrix. Proving a fourth independent channel survives every combination of skin × mode ×
render recipe is a combinatorial testing cost with no correspondingly named use in either
the flex, the acceptance demo, or any of Nemesis's breaks — nothing in four rounds has
asked for it. Cutting it removes an untested promise rather than a built feature, which is
the cheapest kind of cut available.

**What is not cut:** the three-channel encoding, the provenance toggle, die Saatbilanz,
and gate „Der Streifen" are unchanged.

---

## 4. What remains unanswerable within this candidate's thesis

- **The Neuzugang seat is structurally second-class no matter how honestly it is
  labelled.** §1.3 turns a silent failure into a disclosed, server-enforced one — the
  mismatch is now always visible and always explained — but it does not restore the
  candidate's core promise ("the world arrives already lived-in") equally to every seat at
  a table shaped differently from the seller's. A player who chooses "Neuer Charakter"
  still spends the whole evening `+0` on checks her tablemates take for granted, and no
  amount of UI honesty makes that feel like the pitch. This is a genuine residual tension
  between the thesis and real table sizes, not a bug the features above remove — it is
  named here rather than hidden, per the brief's own instruction that honesty beats a fake
  fix.

---

## 5. Net effect

The candidate is materially stronger than it was handed to Nemesis. Two of her four
breaks (the hotkey, the infobox) were genuinely cheap and are now closed with a fix *and*
a standing regression/gate, not a promise. The third (cast-size mismatch) is answered with
primitives the domain model already owned — no new architecture, just the disclosure and
the batch-wrapped gesture the design should have had from the start. The fourth — and the
one that mattered most — gets a real mechanism: die Wissensprojektion turns "no rival
stores per-character knowledge state a rule can read" from an asserted claim into a built
one, with a reference fixture that finally makes both halves of the flagship pairing
compute, and it compounds into three further features (Bruchlinie, Wissensspiegel,
Testtafel) that exploit the same ledger in ways no competitor's data model can copy
without first building the thing Foundry, Roll20, and Alchemy all lack: a fact that can be
held differently by two readers at once. The one deliberate cut (the fourth colour
channel) removes a combinatorial testing liability that no scene in four rounds has
actually needed, in the same spirit as the invariant that a field a process can derive is
deleted rather than defaulted.

**Where it is still soft:** die Wissensprojektion is now specified but still unbuilt in
any artifact — the fix answers the break on paper and in data shape, not yet in a running
spike, so the round-5 bar is a third spike that actually shows Sera's +2 and Brannt's +0
computed from the same clause, live. The Neuzugang residual (§4) is real and should be
said to Kaya in those words, not softened. And every weakness the candidate already
conceded against itself (§10.1–10.8 of `product-B.md` — the four-Anlass content bill, the
unmeasured mint rate, the unspiked tactical half, the consent/erasure collision) is
untouched by this pass on purpose: those are not Nemesis's breaks for this round, and
answering unasked questions would be exactly the excess Mēden agan warns against.
