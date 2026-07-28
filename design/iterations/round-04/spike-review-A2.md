# Cross-review: spike-A1.html, seen from Seat 2 (Universality)

Written by GUI Architect 2 while building `spike-A2.html`. A1 existed when this review started
(both files work the same corner of Candidate A in parallel; A1 was not consulted while building
A2, per the brief). This is a working-file critique for the round, not a verdict — Apollon and the
attack pass own that.

**Scope note before the critique lands:** A1 and A2 chose non-overlapping angles on purpose. A1 is
the *narrative depth* screen — one world, one skin, one seeded roll, three readers, built to make
„Der rote Link ist eine Tür" land as a feeling. A2 is the *universality* screen — three content
packages, four skins, three roles, high contrast, reduced motion, long labels, missing art, built
to make the same components survive a hostile switch-everything test. Most of what follows judges
A1 on its own terms, not for lacking the axis that was never its job.

## What A1 nails

- **The reserved chip strip is the single best craft detail in either file.** `.absatz > p` always
  reserves `padding-bottom: 1.75rem` for a provenance chip whether or not one is shown; toggling
  Herkunft flips `opacity`/`pointer-events` on an already-laid-out element. The design doc's own
  gate „Der Streifen" (*the page must not change shape when provenance is toggled*) is not just
  honored, it is enforced at the CSS level in a way that cannot regress by accident.
- **The reader dial changes the DOM, not a filter.** `projizieren(leser)` sets `.hidden` on
  paragraph nodes keyed by `data-leser`, and — importantly — closes any open footnote whose carrying
  paragraph just disappeared (`if (kasten && traeger && traeger.hidden) kasten.hidden = true`). A
  footnote belonging to an absent paragraph cannot be left dangling open. That is a real, specific
  correctness detail a lot of spikes would miss.
- **The seeded roll lands exactly on the threshold (18 vs. SG 18), not comfortably above it.**
  That is the right dramaturgical choice for a spike that exists to prove „the die decides, not the
  writer" — a roll that wins by 10 would have let a skeptic say the demo rigged itself toward yes.
- **The Vollmacht card discloses inline from the infobox row it belongs to**, via
  `aria-expanded`/`aria-controls`, Escape-to-close, and focus return to the door button — no modal,
  which matches the shell's own non-goal ("no floating-window desktop") and keeps keyboard flow
  sane without extra scaffolding.
- **„Die Woche" is genuinely two different data shapes, not one list re-skinned**: the GM's view is
  the set-difference groups from §5.2 (*Dazugekommen / Noch offen / Unterwegs*) with a footnote that
  says outright "Diese Zahl kann nur fallen"; the player's view is *her own* doors/letters/Umbruch,
  and the Umbruch group's only list item is the sentence "Keine Liste." — the copy self-polices the
  anti-log invariant it's implementing.
- **Motion durations match the spec bands precisely** (140 / 280 / 820 ms against the mandated
  110–180 / 220–340 / 600–1000) and `prefers-reduced-motion` strips both the transitions and the
  door's own gap-opening pseudo-elements, not just the obvious animations.
- Two interactions genuinely work end-to-end: the reader dial (real projection change with
  cascading footnote/Woche/Saatbilanz updates) and Würfeln → Prägen (a real, if canned, roll that
  inserts a new paragraph at its structural position and moves 5 separate counters).

## What it fakes, or narrows quietly

- **The "Zwillingsbeweis" is asserted in prose, not measured.** The `.zwilling` note tells Brannt
  his row is "byte-identical to a reader with no campaign," but nothing in the file serializes
  Brannt's row and a control row and compares lengths. A2's Prüfstand does exactly that
  (`serialisieren()` + a live byte-length diff, printed as a pass/fail row) precisely because a
  claim this central to the candidate's threat model (§6.4: *"the highest-risk new oracle in this
  candidate"*) is the one a reviewer should be able to click, not just read. As written, A1's claim
  would not survive Nemesis asking "prove it" in-page.
- **All three readers' paragraphs live in one shared DOM at all times**, gated by
  `data-leser`/`hidden`. That is the literal shape the design intent argues against — "a different
  document, not the same document with things hidden" — dramatized correctly in copy
  (`leser-note`: *"nicht dasselbe Dokument mit ausgeblendeten Stellen"*) while the markup underneath
  does exactly that. It's a defensible simplification for a single static HTML file (there's no
  server to ask), but it's worth naming precisely because the spike's own copy promises the
  opposite of what its DOM does.
- **innerHTML is used for dynamic content in four places** (`leserNote.innerHTML`,
  `zwilling.innerHTML`, `ergebnis.innerHTML`, and the whole minted paragraph + footnote inserted via
  `insertAdjacentHTML` as a hand-built string). Every string is a hardcoded German constant, so
  there's no live injection surface in this file — but it's the exact pattern a real
  implementation must forbid on the render path, reintroduced without comment. A2 instruments the
  `innerHTML` setter and prints a live "0 Zuweisungen" row on its Prüfstand for this reason; A1
  has no equivalent self-check, so a builder copying this file's pattern into production would
  already be in violation of the rule the design doc cares about.
- **One skin, one content package, one canned roll outcome.** Tokens are correctly used throughout
  (every color is a custom property; the media-query and attribute dark-mode overrides are both
  present and correctly ordered, attribute beats query in both directions) — but only one palette
  exists, so "this survives a skin swap" cannot be checked from this file. Again: not this seat's
  job, but worth being explicit that the claim isn't in evidence here.
- **No manual high-contrast or reduced-motion control** — only the OS-level
  `prefers-reduced-motion` media query is honored, no in-app override. The round's own acceptance
  matrix (`03-triumph-ui-direction.md`, item 8) asks for *explicit* Reduced Motion and high-contrast
  states as a visible product control, not only an OS passthrough. A1 doesn't claim to cover this
  (A2 does), but a reader who only opens A1 would not see that axis demonstrated at all.
- **The minted paragraph (`ABSATZ32`) is a second, hand-authored HTML string**, structurally
  parallel to but not sharing a code path with the six paragraphs already in the document. It
  proves the arrival animation and focus management convincingly, but not that "seeded" and
  "minted" paragraphs are two states of one renderer — a second content author extending this file
  would have to hand-write a third such string in the same fragile way.

## What it would cost to build for real

- **A genuine per-reader server projection** (so the DOM difference A1 dramatizes is actually
  produced by *not sending the bytes*, rather than by hiding nodes client-side) is `S-P1`, which the
  candidate's own ledger already flags as unbuilt for four rounds running (§8.8) — this spike
  doesn't add to that cost, it just makes vivid what's still owed.
- **Making the Zwillingsbeweis real** — an actual byte/DOM/AX-tree diff fixture, as the design doc
  promises for the `tuer_zustand` oracle (§6.4) — is a dedicated CI fixture pair, already scoped
  and costed in the source document, not new work this review is inventing.
- **Swapping the four `innerHTML` sites for a small DOM-builder** (A2's `el()`/`add()` pair is ~25
  lines and would drop in almost unchanged) is an hour of mechanical work, worth doing before this
  file is used as a reference by Hephaistos, precisely because it currently contradicts a rule the
  project cares enough about to test for elsewhere.
- **Adding a manual high-contrast + reduced-motion toggle to this same screen** is small (token
  discipline here is already clean, so it's mechanical, not a redesign) and would let A1's emotional
  proof also clear the accessibility items in the acceptance matrix on its own, rather than relying
  on a sibling file to cover that ground.

## Bottom line

A1 is the stronger *feeling* — the reserved chip strip and the on-the-threshold roll are genuine
craft, and the copy is disciplined about naming its own limits (*"Alle Projektionen liegen in
dieser Datei im Client"*, printed in the Kolophon, unprompted). Its central claim — that three
readers get three different documents — is dramatized rather than measured; A2 measures the
equivalent claim on stage. Neither file is a substitute for the other, and the round is better for
having both.
