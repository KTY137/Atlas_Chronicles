# Cross-review of spike-A2.html, by GUI Architect 1

Written after finishing `spike-A1.html`. A2 was already present when I looked (parallel work), so this
is a real review of the finished sibling, not a placeholder.

**Seats, confirmed disjoint.** A1 took "the flex" — one screen, one moment, peak craft, the phone
screenshot. A2 took the Triumph acceptance matrix — prove the six-zone shell and its independent axes
(content × skin × role × theme × contrast × motion × labels × artwork) actually generalise. The two
files do not compete for the same frame, which is exactly what the brief asked for.

## What it nails

- **It measures instead of narrating.** A2 doesn't just claim the Zwillingsbeweis, the "Kein Strom"
  gate, and WCAG contrast — it runs them live against the actual rendered DOM: `serialisieren()` byte-
  compares real cloned nodes for three reader roles, the "Kein Strom" check clones the article host,
  strips `[data-artikel]` ancestors and counts what survives (a feed would survive; a highlight can't —
  and the code performs that exact strip, it doesn't assert it), and the contrast matrix computes real
  relative-luminance ratios via `getComputedStyle` across all 16 skin×theme×contrast combinations and
  prints the worst pair. The `innerHTML` setter is monkey-patched to count writes, so the "no innerHTML
  in the render path" claim is a measured `0`, not a promise. This is a materially stronger evidentiary
  posture than my own file, which narrates its invariants in prose and trusts hand-authored tokens.
- **Content-structure independence is actually proven, not asserted.** Three content packages
  (Aldenfall/fantasy, Kepler-9/sci-fi, Nebelakte/mystery-noir) run through the identical
  `baueArtikel()`/`baueTuerZeile()` code path, and the Prüfstand's first check compares the
  `data-komponente` signature string across all three — same component sequence, different nouns. That
  is exactly acceptance-matrix item 1–2.
- **The door mechanic itself survives the generalisation.** The Vollmacht → roll → mint → paragraph-in-
  place → footnote-with-weekday flow from CHAMPION/product-A §2 is reproduced faithfully and is
  reachable from all three worlds, not hand-coded once — a stronger claim about buildability than a
  single hard-coded article can make.
- **Genuinely honest self-critique baked into the artifact's own copy**, not just held back for a
  review doc: the contrast-matrix hint says outright that it measures computed element colour, not
  painted pixels, and that the binding K1 measurement belongs in CI, not a spike; the Zwillingsbeweis
  hint says the production version is over HTTP bytes and `getFullAXTree`, not DOM serialisation in one
  page. That is Gnōthi seauton done inside the artifact itself.
- **The missing-artwork and long-label axes are real, live toggles** (`Artwork An/Fehlt`,
  `Beschriftung Kurz/Lange Übersetzung`), directly satisfying acceptance-matrix items 2 and 9, which my
  file does not attempt at all (A1 has no skin/label/artwork axis — by design, it's one skin, one
  moment).
- Motion, contrast, and reduced-motion are wired through the same token set the shell already declares,
  and the contrast harness explicitly freezes transitions before measuring (`ohneUebergang`) rather than
  measuring a mid-crossfade colour — a detail that's easy to get wrong and here is gotten right.

## What it fakes, or is thinner than it reads

- **The three "genres" are the same story with renamed nouns**, deliberately: same paragraph numbers
  (3, 4, 11, 12, 19, 20, 25, 30), same beat shape (a double-book/double-list secret, a departure "neun
  Tage", a Vaugn-equivalent death at the same session number). That is the right choice for proving
  *structural* independence, but it means the content-package axis proves the shell is content-shaped,
  not that three independently-imagined settings were tested — a reviewer could mistake the Prüfstand's
  green check for more than it is. Worth being explicit about in the verdict write-up.
- **Every wiki link in the running demo is `href="#"` with `preventDefault`** — blue links, red links,
  Siehe-auch, all of it, across all three worlds. That's consistent and intentional (this spike proves
  projection, not navigation), but it's not narrated anywhere in-page the way the contrast and
  Zwillingsbeweis caveats are, so a reader could wonder why nothing ever navigates.
- **The live contrast check walks up `backgroundColor` on ancestors** (`grundfarbe`) to find the
  "ground" a text colour sits on. That's correct for the flat `--surface`/`--surface-2` panels the
  tested pairs actually sit on, but it would silently under- or over-report anywhere text sits on a
  gradient or `color-mix` composite that isn't a plain `background-color` — the code doesn't hit that
  case in the six pairs it tests, but the general technique is narrower than its own "measured, not
  asserted" framing implies. The artifact's own honesty note covers "painted pixels" but not this.
- **The `Beleg`/roll math is fixed at `+4 +2 −2` (attribute, haelt_etikett, Hörensagen)** exactly as in
  product-A.md, wired to a seeded `mulberry32()` PRNG with a demo-roll override (17) — good fidelity —
  but the deep-link query string (`phase=gepraegt`) hardcodes `wuerfel: 17` regardless of the "echter
  Zufall" toggle, so a bookmarked "already-minted" URL always shows the same canned roll even if the
  visitor asked for real randomness. Minor, and arguably correct for a reproducible verdict link, but
  worth naming.
- **Scale.** At ~2,280 lines with a hand-rolled DOM builder, a seeded RNG, live WCAG math, and a live
  DOM-diffing test harness, A2 is doing meaningfully more engineering than a design spike strictly needs
  — it is closer to a test harness wearing a UI than a UI with some self-checks. That is a defensible
  choice for *this* seat's brief (prove universality), and the file says as much about where the real
  version of these checks belongs (CI, over real HTTP), but it is the more expensive of the two files to
  have built, and would be the more expensive to maintain if any of its live-measurement code were
  mistaken for production infrastructure rather than spike-only self-verification.

## What it would cost to build for real

The generalisation proof (content × skin × role) is the cheap part to make real — it's mostly the
theme-manifest and package-projection architecture the Triumph doc already commits to, and this spike
is evidence the component contracts hold across genres. The expensive part is exactly what the
artifact's own hints flag: the Zwillingsbeweis has to become a real fixture pair compared over actual
HTTP responses (bytes, DOM, `getFullAXTree`, timing) for two live server sessions, not two DOM
serialisations in one tab with shared JS state — that's a CI harness against a running server, which is
a different (larger) piece of infrastructure than anything in this file. Likewise the contrast matrix
is honest that it needs to run on painted pixels (screenshot + colour sampling) to bind K1, not on
`getComputedStyle`. Neither gap is hidden; both are named. That is the file's strongest quality and the
main reason I'd trust its "green" checks more than a narrated claim — while still not trusting them past
what they actually measure.
