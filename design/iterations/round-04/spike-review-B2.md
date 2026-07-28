# Cross-review — spike-B1.html, read by Seat 2 (`spike-B2.html`)

Round 4, product candidate B. Written by the architect who built `spike-B2.html` (the
universality proof: three content packages × four skins × three roles × contrast/motion ×
missing art × long labels), after reading `spike-B1.html` in full. The two artifacts were built
in parallel and did not see each other during construction; this is the honest look afterward.

Scope note: I don't have Seat 1's brief text, only the artifact. Where a gap below may simply be
"not this seat's job," I've said so — the point of this note is what the file demonstrably does
and doesn't do, not whether it followed instructions I can't see.

## What B1 nails

- **`Nachrechnen` reads `haelt_etikett` from the live DOM, not a lookup table.**
  `haeltEtikett()` (line 1770) runs
  `document.querySelectorAll('.atom[data-etikett~="…"][data-haelt~="…"]')` against the rendered
  article. That is a materially more honest proof of "wiki → table" fusion than a hardcoded
  `gehalten: 4` field in a data object (which is what B2 does) — B1 actually counts what the page
  is showing. The seeded replay itself (`fnv1a` + `mulberry32`, lines 1734–1751) is a real PRNG,
  not a canned number, and the three honest outcomes it distinguishes — `ok` / `unberuehrt`
  (package drifted but this clause wasn't touched) / `bad` — are a sharper model of package drift
  than a binary pass/fail.
- **Prägen has real Undo.** `praegen()` mints a passage and wires a working `undoBtn` (lines
  2468–2527) that removes the atom, deletes the minted `Beleg`, and resets the Bilanz text back to
  "0 an diesem Tisch" — a full reversible round-trip, not a one-way demo button. B2's `Prägen` has
  no undo at all; this is a real advantage B1 has and B2 doesn't.
- **The board is a real visibility polygon per scene**, not a per-column fog band: `sicht` is an
  arbitrary polygon (`BRETTER.*.sicht`), masked with an SVG `<mask>`, with walls, doors, props and
  a light gradient as independent layers, plus a same-data `brettGliederung()` outline fallback.
  That is a more faithful Tactical/Outline pairing than B2's column-range fog.
- **Honest in-page disclosure of scope.** Clicking any Sammlung entry other than "Haus Vharon"
  pops a toast: *"Dieser Prototyp zeigt nur Haus Vharon vollständig — die Schiene steht für die
  Struktur, nicht für ein zweites geschriebenes Kapitel."* That is exactly the right instinct
  (gnōthi seauton in the UI itself) and it's a pattern the module rail should have gotten too (see
  below).
- Live search (`#q`) actually filters the entry list and counts matching Absätze against real
  `.atom` text content — not a static count.

## What it fakes or omits, concretely

1. **Five of six module-rail buttons are dead with no signal that they're dead.** `Sitzung`,
   `Ensemble`, `Regal`, `Tisch` and `Schmiede` (lines 1376–1381) are plain `<button>` elements with
   no click handler anywhere in the file (confirmed: no `.mod` selector appears outside the CSS for
   `[aria-current="page"]`), no `aria-disabled`, no `title`. They share the exact same hover and
   `:focus-visible` affordance as the one working button (`Geschichte`). A keyboard or
   screen-reader user gets zero indication these do nothing — worse than the Sammlung entries two
   panels over, which at least toast an honest explanation on click. This is a direct miss against
   "controls say exactly what they do," and it's a five-line fix (wire the same `meldung()` toast
   the entry list already uses) that wasn't taken.
2. **No role axis.** `"Rolle: Leitung"` (line 1332) is a static string; there is no Player or
   Observer projection anywhere, so the round's acceptance claim *"GM, Player and Observer
   projections, with unauthorized records omitted"* is untested by this artifact — that load falls
   entirely on B2. Possibly out of this seat's scope; flagged as observed fact, not fault.
3. **No skin axis, no content-package axis.** Hardcoded to Archive + Aldenfall throughout — no
   `data-skin`, no second world. Fine for a narrative-fidelity spike; means B1 alone cannot carry
   the round's "one shell, three genres, four skins" claim.
4. **No high-contrast mode.** Dark/light (`data-theme`) and reduced motion (`data-motion`) both
   work; there is no `data-contrast` anywhere and no forced-colors handling. Given the triumph
   direction's own acceptance item *"explicit Reduced Motion and high-contrast states,"* this is a
   real gap, not a cosmetic one — and it's the cheapest of everything on this list to close (the
   token list already exists; B2's high-contrast override block is ~15 lines and nearly
   copy-pasteable).
5. **The board renderer bakes 22 literal hex colors into the SVG string** (`zeichneBrett()`, lines
   1926–1997): floor `#191512`, grid `#3b3229`, walls `#7d6d59`, doors `#c9a35e`, light stops
   `#e8cf9a`/`#c99b4a`, fog `#0a0806`, glyph fill `#f5ecdc`, prop fills, mask fill/stroke — verified
   by direct grep, not estimated. Only the token *circles* use `var(--c-token-a/b/c)`; everything
   else in the one component most likely to need re-skinning per campaign is untokenized. Toggle
   `themeBtn` to dark and the board's floor, walls, doors and light will not move. This is a direct
   contradiction of "every colour… a CSS custom property. Style only through tokens" for exactly
   the component where it matters most.
6. **Pervasive `innerHTML` for computed content** — derivation steps, seal verdicts, minted atoms,
   the board SVG itself are all built as concatenated strings and assigned via `.innerHTML`. Every
   string here is self-authored, so there's no live XSS risk in the spike as written. But it is
   exactly the technique product-B.md §8.1 says the champion architecture bans product-wide
   ("Passage.content as closed AST — never HTML… the champion bans innerHTML product-wide").
   Rebuilding this with structured DOM assembly (`createElement`/`textContent`, the way B2 does
   throughout) isn't a style nit — it's the difference between a spike and a component that could
   survive contact with a content pipeline that isn't 100% self-authored.
7. **No die Gegenüberstellung** (the per-character book comparison from product-B.md §9.2 step 6)
   anywhere in the file. Neither spike fully builds this — B2 only shows a one-line GM-only summary
   ("weicht in 4 Absätzen ab"), not an actual side-by-side — so this is a shared gap worth naming
   for the round, not a point against B1 specifically.

## What it would cost to build for real

- **Tokenize the board** (#5 above): 4–6 new `--c-board-*` tokens (floor, grid, wall, door, light,
  fog) with light/dark pairs, threaded through the existing style-string builder. Contained to one
  function and the `:root` blocks. Under half a day.
- **Signpost the dead rail buttons** (#1): wire the existing `meldung()` toast to the five inert
  `.mod` buttons. Minutes, not hours. Making those zones *real* is obviously a different order of
  cost entirely and not implied by this fix.
- **High contrast** (#4): cheapest item on the list — the semantic color tokens already exist as a
  clean, named set; it's an override block, not a redesign.
- **Add a role axis to one fixed scenario** (#2): the `data-etikett`/`data-haelt` pattern already
  shows the right instinct — permission-relevant facts live in `data-*` attributes on the atom, not
  a side table — which means a `data-sicht` attribute plus a per-atom visibility check is a natural
  extension. But it touches every atom in the article, the infobox and both lens tabs to do
  *structural* omission rather than CSS hiding, so it's a day, not an hour, once done honestly.
- **Replace `innerHTML` construction with structured DOM** (#6): the largest real item here — on
  the order of a day or two across roughly fifteen functions. Mechanical, not risky, but it's the
  one that should happen before this rendering approach is reused against content that isn't
  entirely first-party.

## Bottom line

B1 is deeper and more convincing than B2 in exactly one place — a single, fully believed scene —
and its `Nachrechnen` replay is the more honest implementation of "wiki → table" fusion of the two
artifacts, because it counts what the DOM actually shows instead of asserting a number. The cost of
that depth is that the one believed scene is all it proves: swap the content, the skin, the role or
the accessibility mode, and there is nothing under the hood to hold it up — which is the expected
and correct division between the two seats, not a failure of B1's brief. The untokenized board and
the un-signposted dead rail buttons are real, fixable defects independent of that division, and
worth closing before this file is shown as anything other than a companion spike.
