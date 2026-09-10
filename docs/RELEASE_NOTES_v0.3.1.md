<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Atlas Chronicles v0.3.1 — release notes

Two small things in the host window, both asked for after v0.3.0 was already built — and one
map fix from separate work that landed in the same build.

Setup is described in [Getting Started](https://github.com/KTY137/Atlas_Chronicles/blob/main/docs/GETTING_STARTED_EN.md).

## The invitation generator is findable now

v0.3.0 put invitation and pairing codes into a section called **Zugänge und Rollen** — and then
showed that section only while a world was running. That is exactly backwards. You go looking for
it when nothing is running: the world is stopped, you want to invite somebody, and the page has
no trace of the thing you are looking for.

The section is now always there. With no world running it says so, and says what to do about it:
start a world with **Fortsetzen**, and its rounds appear — an invitation code for new players,
and a pairing code for every member who can no longer sign in. The world list above points at it
too.

Nothing about the codes themselves changed. An invitation still lasts seven days and still has to
be approved by the game master inside the world; a pairing code still lasts ten minutes, is still
single-use, and is still redeemed in the browser under “Neues Gerät verbinden”.

## Local worlds can be deleted

Until now a world could be created but never removed. Every world you ever tried out stayed in
the list, and the only way to get rid of one was to find the folder yourself.

Each world in **Lokale Welten** now has a **Löschen** button. It opens a confirmation directly in
the row, and the confirmation is **typing the world's name**. Not a dialog you dismiss — a world
is months of play, and a misplaced click must not cost one.

**Where that name is checked matters.** Not in the window: in the host process, against the world
itself. A confirmation that only happens in the renderer is not a confirmation. The same place
also refuses to delete a world whose lock is held by a living process — a running world is never
pulled out from under itself. A lock left behind by a process that no longer exists does not
block anything.

The folder is renamed first and removed second, so a world disappears from the list even if the
removal then trips over a file somebody has open. The browser data belonging to that world's
address goes with it.

**What deliberately stays: the recovery points.** A recovery point carries its own copy of
`profile.json` and `secrets.dpapi`, so it remains restorable without its world. That is the
difference between “deleted” and “gone for good”, and both sentences are in the window where you
delete. If a world matters to you, make a recovery point before you delete it.

## Also in this build: interiors have interior walls

This one comes from separate work that landed in the same build, and it is worth its own
paragraph because it changes what a generated building looks like.

Stepping into a house, a tavern or a church used to give you an open box: the outer wall, and
doors standing in the open air. Measured on a 14x12 house — four rooms, twelve wall runs, every
one of them on the outer rectangle, not a single dividing wall, nine doors with no wall to sit in.

The cause was the rule that made walls: it asked “floor or rock?”, and a building fills the gaps
between its rooms with corridor, so the whole floorplan is one connected floor area — a rule
like that can only ever find the outline. It now asks *whose* cell this is: rock, corridor, or a
particular room. Where the owner changes, a wall stands; where the door pass has already opened a
gap, the gap stays.

Two older bugs came out with it, both in the room scatter: the room-size cap was one cell too
generous, and a single scatter pass is one draw of the dice — it now takes the best of three.
Measured over 2000 generations on five grids: no aborts, room sizes unchanged.

`GRUNDRISS_VERSION` goes 8 → 9: the geometry changes, so the ids change. Interiors you generated
before this release keep the shape they were saved with.

## Before you install

This build is **unsigned**. Windows will warn you that the publisher is unknown; that warning is
accurate. There is no update channel — a later version means downloading again. The installer is
per-user and needs no administrator rights.

| | |
|---|---|
| File | `Atlas-Chronicles-Setup.exe` |
| Size | 206 MB |
| Platform | Windows, 64-bit |
| Electron | 44.2.0 |

Your worlds live in `%APPDATA%\Atlas Chronicles`, separate from the installation. This release
contains **no migration and no schema change**; installing over v0.3.0 does not touch your data.

## What is not finished

Unchanged from v0.3.0, and recorded by the build itself in `installer.json`:

- No signature, no timestamp, no verified publisher.
- No update feed and no tested updater.
- No ASAR integrity check and no release fuses.
- No drain, recovery point or migration admission before installing over an existing version.

The eight-hour session and the absence of a password login are also unchanged. The host window is
a way back, not a reason to skip setting up a passkey.

**What was verified.** Both typechecks, the language and boundary gates, 503 map-generation
checks, 120 desktop and theme checks including two new ones for deletion, and the full packaged
Electron run — which now includes a step that deletes a world across the real IPC boundary,
proves a near-miss name leaves it standing, and proves its recovery point survives.

**One correction to the v0.3.0 notes.** That release said the packaged test run was not
performed. It was run afterwards and passed, but it uncovered one stale assertion in the test
itself: it still expected a V19 backup file from a run that no longer records map provenance,
because the sample map was removed in an earlier release and the expectation was left behind. The
test now asserts V15 and that the provenance table really is empty. No application code was
involved.

**The browser test suite still did not run** — it needs Microsoft Edge and a running PostgreSQL
instance. Seven server tests remain red for reasons that predate this work.

## Checking what you downloaded

```
Get-FileHash .\Atlas-Chronicles-Setup.exe -Algorithm SHA256
```

```
4e828bd23f807ee733c665310db56a2e9eadb559e39ba828293a1e960de59e8c  Atlas-Chronicles-Setup.exe
```

Built from commit `COMMIT_PLATZHALTER`.
