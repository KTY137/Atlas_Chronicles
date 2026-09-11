<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Atlas Chronicles v0.4.2 — release notes

The host window becomes the place where a round is set up, and importing wiki articles works again
after a map picture was fetched.

Setup is described in [Getting Started](https://github.com/KTY137/Atlas_Chronicles/blob/main/docs/GETTING_STARTED_EN.md).

## The host window leads you through a round

Until now setting up a round meant switching windows: world and game master in the host window,
the round only in the game, the invitation in either place with different lifetimes, and letting
someone in only in the game — within thirty minutes, with no way to say no.

The host window now does all of it, top to bottom:

- **The world bar** names the world, its state, and the one button that matters right now:
  start the world, open the game, or stop the world.
- **First steps** — a checklist shown until someone besides you has joined: set up the game
  master, create a round, pass on an invitation link, let the first person in.
- **Round** — create a round right there, then three cards: *Invite* (link and copy), *At the
  door* (everyone waiting, with **Approve** and **Decline**), and *Members* (role, whether they
  can get in, access link). When someone new is waiting and the window is not in front, it
  flashes in the taskbar and its title shows the count.
- **Manage worlds** is folded away: delete, back up, bring a campaign, connect to a server,
  Chronicler key.

The game keeps its own round page, and both use the same server functions, so the rules match:
an invitation lasts **seven days** everywhere, a join request **24 hours** instead of thirty
minutes, and **Decline** exists in the game too. A declined person is told so on the sign-in page
and their name becomes free again.

The line “Who can join: only this computer” is deliberately honest. The local host is reachable
from this computer only; joining from other devices in the home network is the next step.

## Fixes in the host window

- The window rebuilt itself every 1.5 seconds. Typing a world's name to confirm deletion lost the
  focus mid-word. It now redraws only what changed.
- v0.4.1 reloaded the rounds under the window's global lock, so a click that brought the window
  to the front could collide with it (“an action is already running”). Reading no longer locks.
- A world that is not running can be deleted while another one runs. When deletion is not
  possible, the row says why.

## Wiki import works again after a map picture

“Auswahl übernehmen” failed for every article import in a campaign whose map picture had already
been fetched. The world's database log showed it eight times: the import looked for an existing
picture only by its own id, the map picture was there under another id with the same file name,
and the second insert of that name aborted the whole import. The import now also looks by file
name; an existing picture that no article uses yet takes over the import's id, so the articles
show it, and its bytes, licence decision and the map's reference stay as they were.

## Before you install

This build is **unsigned**; Windows will warn about an unknown publisher. The installer is
per-user and needs no administrator rights. Your worlds live in `%APPDATA%\Atlas Chronicles`,
separate from the installation. This release carries **no** schema change.

| | |
|---|---|
| File | `Atlas-Chronicles-Setup.exe` |
| Size | 206 MB (216,321,024 bytes) |
| Platform | Windows, 64-bit |
| Electron | 44.2.0 |

**What was verified.** Typecheck; version and language gates; server checks for declining, the
new lifetimes, creating a round from the host window, and the import with a same-named picture
(36/36 in the affected suites); desktop policy and unit checks (51/51); and the full packaged
Electron run, now 26 checks — including creating a round, issuing its link, approving one and
declining another request through the actual host window, keeping focus while typing a deletion
name across status polls, and deleting a resting world while another runs.

**What was not verified.** The browser suite did not run.

## Checking what you downloaded

```
Get-FileHash .\Atlas-Chronicles-Setup.exe -Algorithm SHA256
```

```
44C018B04BEC0B8ABE240BBB94A3EB45B528554FDFC4C3752DC04C13A0DE27C8  Atlas-Chronicles-Setup.exe
```

Built from commit `5b9462c`.
