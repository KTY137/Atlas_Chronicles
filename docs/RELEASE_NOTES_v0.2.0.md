<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Atlas Chronicles v0.2.0 — release notes

The second release. It changes almost nothing about what the app *does* and a great deal about
how it looks, what it says, and whether you can find your way out of a page.

Setup is described in [Getting Started](https://github.com/KTY137/Atlas_Chronicles/blob/main/docs/GETTING_STARTED_EN.md) — on your own computer, on your network, or on a server.

## Twelve looks instead of five

Seven new ones: **Midnight** (cool graphite and steel blue), **Verdant** (forest green and gold),
**Ember** (warm dark with copper, etched edges), **Astral** (indigo night with violet and silver),
**Brass** (sepia and brushed metal, one corner cut away), **Parchment** (a bright, near-white
workspace with ink blue) and **Dawn** (a light warm tone with rosé).

Three of the twelve are light. Each palette was designed first — hue and saturation come from an
intention — and only its *brightness* was then adjusted until it passed all **135 declared colour
pairings**. All twelve pass every one; the tool that checks it, `tools/theme-kontrast.mjs`, reads
the same checker the test suite uses.

Picking one is no longer a dropdown of raw identifiers (`Cyberpunk`, `PixelArt`, `Medieval`). It
is a wall of tiles: four real colours from the look, a plain German name, and a sentence saying
what you will see.

## The interface says what it does

The rule behind this release: no jargon on screen. Roughly a hundred visible strings were
rewritten across **Your appearance** and the **theme workshop**.

- The workshop's 34 colour fields were labelled with their token names (`accent-ink`,
  `control-line`). They now carry role names and a sentence naming the place on screen —
  “Focus ring: the ring that shows where you are with the Tab key.” Grouped into six sections
  instead of one wall, and each field gained a **text input** beside the colour picker: without
  it, the colour was unreachable where the operating system's colour dialog is not keyboard
  operable.
- **Typefaces are chosen by their own image.** Five buttons, each *set in* the typeface it
  offers, plus a specimen of the chosen combination — title, body text, figures.
- **The legibility report names colours and repairs them.** Instead of
  `text-muted/surface: 2.41:1`, it says which two colours are meant, in German, bundled to one
  line per colour, with a button that inserts a working value. The suggestion only shifts
  brightness — copper stays copper — and checks every pairing that colour takes part in, so the
  repair cannot break something else.

## Motion, depth, and a receipt for every click

`:active` appeared **zero times** in 31 stylesheets. The app offered five motion speeds and had
no working transition rule at all. There was no elevation anywhere: every shadow was an inset
marker bar.

- Eleven kinds of building block now move on hover, at the speed the chosen look sets.
- Every click gets a receipt — one pixel down.
- Three elevation steps as tokens. The four floating surfaces used four different recipes.
- Focus is visible in composed rows, in `iframe`s, and on anything with a `tabindex`.

“Plain”, “High contrast” and “Leave out transitions” still switch all of it back off.

## Thirty-eight colour leaks

A sweep through 32 stylesheets found 118 hard-coded colours in rules; 52 were caught by the theme
layer, **66 were not**. Nine made text or a control unreadable in a light look — worst of them the
magnifier button over an article image, at **1.31 : 1**.

Four of the leaks used tokens that **never existed** (`--ink`, `--border`, `--ink-muted`,
`--surface-sunken`). `var(--ink, #4a4034)` looks like a fallback but was the only value: seven
rules had been painting a fixed light paper colour regardless of the chosen look, since forever.

All 38 are repaired. The base stylesheet now contains **zero** hard-coded colours, down from 62,
and `packages/ui/src/tokens.css` carries all 34 tokens instead of 15 — held to the preset by a
test, so it cannot drift again.

## Two things reported from actual use

**You could get stuck in the settings.** With no campaign open, the entire navigation rail is
disabled, and the only ways out were an unlabelled wordmark and a dropdown. There is now a
labelled exit at the top *and* the bottom naming where it leads, Escape closes the page, and the
disabled rail says why it is disabled.

**Ollama was not being found.** The host searched exactly once at startup, at exactly one address,
with one second of patience, and swallowed every failure. Now it checks `OLLAMA_HOST` (in all
three spellings people actually use), then `127.0.0.1` and `[::1]` — not the same thing on
Windows — with three seconds of patience, and there is a **“Search this computer for models”**
button in the chronicler that works without restarting anything. The report names every address
it checked and what it found there: a service that answers, a service that answers but has no
model installed, nothing listening, no answer in time, or an answer that was not a list of models.

## A user area

“Your access” was a page for passkeys. For a player it now says what they may do on this server,
which groups they are in and with which role, and how to get back to the sign-in page. An
invitation link opened while already signed in used to do **nothing at all** — the sign-in page
reads `?join=`, and it is only shown when nobody is signed in. It is now picked up and explained:
joining creates its own access for that group, so you sign out first.

## Before you install

This build is **unsigned**. Windows will warn you that the publisher is unknown; that warning is
accurate, and you should only continue if you trust where you got the file. There is no update
channel — a later version means downloading again.

The installer is per-user and needs no administrator rights.

| | |
|---|---|
| File | `Atlas-Chronicles-Setup.exe` |
| Size | 206 MB |
| Platform | Windows, 64-bit |
| Electron | 44.2.0 |

## What is not finished

Named rather than hidden. The build records these itself, in `installer.json`:

- No signature, no timestamp, no verified publisher.
- No update feed and no tested updater.
- No ASAR integrity check and no release fuses.
- No drain, recovery point or migration admission before installing over an existing version.

Voice and video chat are not part of the app.

**Two further things this release does not fix, stated plainly.** The spacing scale (43 different
pixel values) and the type scale (33 sizes) are still not scales; pulling them onto one touches
almost every line of two stylesheets and belongs in its own pass with its own visual comparison.
And the publication workshop still carries jargon — “feed”, “alias”, “host” — that the appearance
surfaces have shed.

**The browser test suite did not run for this release.** It needs Microsoft Edge and a running
PostgreSQL instance. Fifteen call sites in `e2e/authoring.spec.ts`, `e2e/passkeys.spec.ts` and
`e2e/sprache.spec.ts` were updated for the renamed controls, but that they pass is *not*
demonstrated. Seven server tests are red and were red before this work — two live-sequence
assertions and five timeouts around tiles, settlements and native archives; verified by setting
this release's server changes aside and measuring again.

## One thing found while building this release

The desktop package named itself **0.1.0** while the release said 0.2.0. Three separate
hard-coded version strings sat in the packaging tools, outside what `gate:version` compares —
that gate only checks the two workspace manifests against each other. Squirrel decides from
exactly that number whether an installation counts as an upgrade, so this was not merely a wrong
label. The version now travels from `packages/desktop/package.json` through the built package
into the artifact, and both tools refuse to run if they cannot find a usable one.

## Checking what you downloaded

Compare the SHA-256 of the file against this line before you run it. In PowerShell:

```
Get-FileHash .\Atlas-Chronicles-Setup.exe -Algorithm SHA256
```

```
019d6b50c1f4cc54443ec675ed543d4b06d1ac91f48d33e0751f1cc603947162  Atlas-Chronicles-Setup.exe
```

Built from commit `8c5d96d`.
