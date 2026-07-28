# Cross-review: spike-B2.html (from Seat 1 / GUI Architect 1, who built spike-B1.html)

Read in full (2080 lines) before writing this. B2 exists, so this is a real review, not a skip.

## What it nails

- **Genuinely different screen, as instructed.** B1 is one screen photographed at peak craft —
  the Haus Vharon article in the Archive skin, provenance layer already open, one footnote deep.
  B2 is a *Prüfstand*: a control room with an axis bar (skin × contrast × motion × width × role ×
  locale) sitting on top of the same underlying content, so the same Beleg/Nachrechnen mechanic
  gets re-proven under conditions B1 never touches. That is the right division of labour for two
  parallel seats and the two files do not read like the same designer twice.
- **„Nachrechnen" is a second, independently-written, genuinely re-executed verifier — not a
  reskin of mine.** Its dice core hashes `saat + "|" + index` per die (`wuerfel()`), evaluates the
  same three-op AST (`wurf`/`konstante`/`praedikat`), and folds the whole derivation into a
  canonical ASCII string that gets hashed into an `Abdruck` (`kanonisch()` / `abdruckVon()`).
  Comparing fingerprints rather than comparing totals is arguably a *stronger* proof-of-concept
  than mine — a totals-only compare can't catch a term that changed while cancelling another term,
  a fingerprint over the whole derivation can. Confirmed by reading the functions directly
  (`spike-B2.html:621-650`), not taken on faith.
- **The missing-asset fallback is staged on purpose, not accidentally broken.** It references three
  real files under `design/spikes/assets/universal-ui/` (`chronicle-panel-frame.png`,
  `signal-frame-kit-v1.png`, `archive-frame-kit-v1.png` — all present on disk) plus a fourth,
  `gibt-es-nicht.png` ("does-not-exist.png"), which is clearly a deliberate probe of the
  missing-artwork fallback path (acceptance-matrix item 9) rather than a broken link left by
  accident. `<img id="kitimg" ... loading="lazy">` plus an `onerror` handler and a
  `.kitband__fb` drawn placeholder back it up.
- **A real locale-stress test.** There's a second full copy string table in Finnish
  (`Alkuperätietokerros`, `Laske uudelleen ja vertaa sinettiin`, …) used to stress long
  translated labels against the layout — a concrete, working instance of acceptance-matrix item 9
  that B1 does not attempt at all.
- **The width simulator (`data-width="380/900/1280"`) is an honest, labelled trick.** It doesn't
  pretend to be a real narrow viewport — it re-flows the same DOM at a fixed `max-width` inside
  whatever window the reviewer has open, which is a defensible way to prove the grid degrades
  without asking the reviewer to actually resize a browser window.
- **Ctrl+Enter minting exists here too** (`praegen()`, wired at `metaKey||ctrlKey` + `Enter`), built
  independently from mine, and it also disables itself for the Observer role (`if(S.rolle==="ob")
  return;`) — a second, harder check that only a GM/Player can add to the canon.

## What it fakes, or at least doesn't own up to

- **The role projection is a client-side filter, and the page never says so.** `sichtbar()`
  decides per-atom visibility from `atom.sicht` and the current `S.rolle`, with the comment
  *"Weggelassen heißt weggelassen, nicht ausgeblendet"* ("omitted means omitted, not merely
  hidden") — but the entire `WELTEN` object, GM-only atoms included, still ships in the one
  `<script>` block that reaches every browser regardless of which role button is pressed. Anyone
  can read the "omitted" content in view-source in under ten seconds. `03-triumph-ui-direction.md`
  states this limitation explicitly for the whole Triumph spike ("it is not an access-control
  proof. Production APIs must omit unauthorized records before delivery"); B2 demonstrates exactly
  the pattern that note is warning about, and I could not find that sentence, or any equivalent of
  it, anywhere in B2's own copy. For a file whose entire premise is rigor across axes, that's the
  one axis it doesn't audit on itself.
- **The Nachrechnen fingerprint hides what it's actually catching from the reader.** Because the
  seal reports "byteidentisch" from an `Abdruck` hash rather than showing the arithmetic beside the
  frozen one term-by-term the way mine does (`beleg__derivation` table, step-by-step replay list),
  a viewer has to trust the hash rather than see the drift with their own eyes when a clause
  revision changes a bonus. B2 *does* print a diff list when the hash mismatches
  (`"Term "+(i+1)+" (...): "+orig+" → "+new`), so the information is there on failure — it is only
  on the *success* path that the reader sees "byteidentisch" and a hash rather than the arithmetic.
  Mine shows the working every time, pass or fail; that is a genuine difference in how convincing
  the two demos are to someone who has never seen the mechanic before.
- **No `aria-live` region anywhere in the file** (grep confirms zero hits), despite the seal,
  the toast-equivalent status text, and the minted-atom count all changing dynamically in response
  to button presses. A screen-reader user pressing Nachrechnen or Prägen has no announced
  confirmation unless focus happens to land inside the changed region. `focus-visible` is present
  and correctly implemented, but the live-region half of the same accessibility contract is not.

## What it would cost to build for real

- **The axis Prüfstand's honesty is the day it becomes double maintenance.** Every one of the four
  skins, three worlds, and the locale table has to be kept in sync by hand inside one 2000-line
  script; the moment a real rule package or real campaign content ships, this file's `WELTEN`
  object is the thing that goes stale first, because nothing forces it to track the schema the
  production `Anlass` format actually uses. It is closer to a fixture bank than a wired-up UI — a
  real build needs the fixture generation itself to come from the same package/installer path the
  product ships, or the Prüfstand quietly starts lying about parity it no longer has.
- **The role-omission story needs a server round-trip to be true**, not a client-side filter — the
  gap named above is not a small fix, it is the same "±permission-aware production response"
  boundary champion §4/§8 already names, and until an actual backend enforces it, every version of
  this page (mine and B2's alike) is a UI mock of the claim, not evidence for it.
- **The fingerprint-based seal needs the same +3-day dice-engine hardening product-B.md §8.1 already
  bills** (integer-only, RNG-pinned, locale-free, byte-equal across Windows/macOS/Linux/Node) before
  "byteidentisch" is a claim a shipped product can make rather than a claim a spike's own JS makes
  about itself.
