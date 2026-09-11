<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Atlas Chronicles v0.4.1 — release notes

Two fixes, both reported against v0.4.0: a map picture that never appeared, and an invitation
button that stayed locked.

Setup is described in [Getting Started](https://github.com/KTY137/Atlas_Chronicles/blob/main/docs/GETTING_STARTED_EN.md).

## Map pictures appear again, whatever their size

A world map brought in as a picture — uploaded, or fetched from a wiki — showed its place markers
on an empty dark canvas. The picture itself never appeared; a small line under the map said
`invalid raster tiles`.

The atlas cut every picture into four tiles laid out for exactly 8192 × 8192 map units. Those were
the measurements of the one map that used to ship inside the program. Since maps are brought in
rather than bundled, a map is as large as its own picture, and the renderer — correctly — refuses
tiles that reach past the map's edge. It refused the whole set at once, so nothing was drawn.

The picture is now laid over the map at the map's own size: scaled to at most 2048 pixels on its
longer side, cut into tiles that fit. The rule the renderer applies to tiles is now one shared
function, and the layout is checked against that same function for square, wide, tall, tiny and
fractional map sizes — so the two cannot drift apart again. An 8192 × 8192 map keeps exactly the
resolution it had.

Nothing is stored differently. Maps you already imported show their picture as soon as the new
version opens them.

## The invitation link can be created without restarting the world

The host window's order for the first time round is: create a world, set up a game master, open
the world, create a round *inside* the world, then come back here for the invitation link. Doing
exactly that left the section saying “there is no round in this world yet” with the button
greyed out — because the window read the list of rounds once, when the world started, and never
again. Only restarting the world made the round appear.

The window now reads the rounds again whenever you switch back to it, and every fifteen seconds
while a world is running. The sentence under an empty list says so.

## Before you install

This build is **unsigned**. Windows will warn you that the publisher is unknown; that warning is
accurate. There is no update channel — a later version means downloading again. The installer is
per-user and needs no administrator rights.

| | |
|---|---|
| File | `Atlas-Chronicles-Setup.exe` |
| Size | 206 MB (216,322,048 bytes) |
| Platform | Windows, 64-bit |
| Electron | 44.2.0 |

Your worlds live in `%APPDATA%\Atlas Chronicles`, separate from the installation. This release
carries **no** schema change.

## What is not finished

Unchanged from v0.4.0, and recorded by the build itself in `installer.json`: no signature, no
update feed, no ASAR integrity check or release fuses, and no drain, recovery point or migration
admission before installing over an existing version.

**Also in this build: large map pictures on a nearly full disk.** On the development machine,
with under 3 GB free, the 10.9 MB test map picture failed to load in the app window with
“Failed to fetch” — in the unchanged v0.4.0 as well — although the server delivered every byte:
read as a stream, as an array buffer, or from outside the window, it arrived whole. Only the
browser's direct route into a blob failed. The atlas now reads the picture as an array buffer,
which carries it either way. If a large download elsewhere in the app fails the same way, free
disk space is the first thing to check.

**What was verified.** Both reports reproduced first against the installed v0.4.0, before any
change. The typecheck across every package; the version gate; 138 render checks including four new
ones for the picture layout; and the full packaged Electron run, now 24 checks — two of them new:
the host window offers a round created in the game window without restarting the world, and a
1600 × 1000 map picture is measured as actually visible on the canvas, by its pixels.

**What was not verified.** The browser suite did not run. The cause of the blob failure is
inferred, not proven: there was no second drive to repeat the measurement on.

## Checking what you downloaded

```
Get-FileHash .\Atlas-Chronicles-Setup.exe -Algorithm SHA256
```

```
A3AFC79E6FB081BE8CB06303E4BB40514DF7E5B2998829F41B0A67D630141B46  Atlas-Chronicles-Setup.exe
```

Built from commit `b56b141`.
