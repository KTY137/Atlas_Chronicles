<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Atlas Chronicles v0.4.0 — release notes

The Chronicler can write now, not only read. Plus everything that had piled up in the host window
since v0.3.0, and one map fix that changes what a generated building looks like.

Setup is described in [Getting Started](https://github.com/KTY137/Atlas_Chronicles/blob/main/docs/GETTING_STARTED_EN.md).

## The Chronicler writes and revises wiki entries

Until now the Chronicler only read. It found events in your articles, went through your session
notes, and told the story back to you as a narrative summary. Writing worked halfway — a summary
could be submitted as a new article. Changing an article did not work at all: whatever you
submitted was appended at the end, and an existing passage stayed untouched.

Two new tasks in its workbench.

**Write an article.** You pick the sources; it drafts one coherent article in several paragraphs
instead of a single wall of text. Many sources are folded together through intermediate steps, so
a long list still fits in one budget.

**Revise an article.** Each passage you pick becomes exactly one unit covering its whole text, and
yields exactly one suggestion: the same statement, written more clearly. You see the old and the
new version side by side and decide whether the new one takes its place.

**The evidence rule got stricter without a new rule being written.** A revision's unit knows only
the one passage it revises, so a suggestion that quotes a different passage cannot pass the
citation check — that falls out of the planning rather than out of a special case. And if a
passage is too long for a single model call, it is skipped: there is no such thing as a
half-revised passage.

**Nothing reaches your canon without you.** A revision is filed as an ordinary proposal in the
same article, exactly like every other suggestion. Which passage it wants to replace is not a new
field in the database — it follows from the suggestion's single dependency, and the server checks
the interface's claim against it. Replacing happens through the correction mint that has existed
since the very first releases, on a button, with the fiction date you type. A passage that is not
canon yet cannot be corrected; you edit that one directly in the chronicle, because there is
nothing there to correct.

**A model still cannot put markup into your chronicle.** A suggestion may now carry several
paragraphs, but every block is still plain text: no links, no marks, no HTML.

The system prompt gained two sentences for the new tasks, so its version goes `chronist-prompt-1`
→ `-2`. The prompt is part of the wire, and the plan carries a prompt version precisely so that
change is announced rather than silent. Runs that were already going keep the plan they started
with.

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

## Invitations are links now, and the window says what it is for

The host window handed you a code to type. The sign-in page has always accepted both — its field
is called “Einladungslink oder Code” and pulls the code out of an address — so the window now
hands you the link instead:

```
http://localhost:46389/?join=Yy4kR2m8QpX7vLb3NwT5ZhF6cJ1sD0aG
```

in a selectable field with a Copy button. The link also carries the address of this world, which
nobody else would otherwise know.

The same for the pairing link, which needed one change on the sign-in page: it read only `?join=`.
It now reads `?pair=`, opens “Neues Gerät verbinden” by itself and fills the code in. Without that,
the code would have to be typed by exactly the person who cannot get in.

Copying can fail silently if the clipboard is not permitted in that window, which is why the link
sits in an input: the text stays selected and the sentence says “copy with Ctrl+C” rather than a
button that does nothing and says nothing.

And an orientation note at the top, because the window had grown section by section without ever
saying what it was: **this window is the caretaker, not the game.** What happens here, what
happens in the other window, and the order the first time round — create a world, set up a game
master, open the world, create a round *inside* the world, then come back here for the invitation
link. Buttons are named after what comes out of them, and the closing note explains the difference
between the two kinds of link: an invitation is for somebody not yet in the round, a pairing link
for somebody already in it who can no longer get in.

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
removal then trips over a file somebody has open — a leftover like that is swept up the next time
the world list is read, and never counts as a failure. The browser data belonging to that world's
address goes with it.

That renaming is also the one place this feature nearly shipped broken. Windows will not rename a
directory while any handle into it is open, and a world that was running seconds ago still has
its folder as the stopped host's working directory. Deleting a world you had just used therefore
failed with an unhelpful message — reliably in the packaged build, not at all in the development
build, which is what a race looks like. The rename now waits for the handle to go, for up to five
seconds, and only then gives up with a sentence that says what is actually happening and to try
again in a moment.

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

Your worlds live in `%APPDATA%\Atlas Chronicles`, separate from the installation.

This release **does** carry a schema change, the first since v0.1.0: migration `032` widens one
check constraint so the Chronicler's run table accepts the two new task names. It adds no table
and no column, and every existing row stays valid. It is applied automatically when a world
starts. Your data is not rewritten.

## What is not finished

Unchanged from v0.3.0, and recorded by the build itself in `installer.json`:

- No signature, no timestamp, no verified publisher.
- No update feed and no tested updater.
- No ASAR integrity check and no release fuses.
- No drain, recovery point or migration admission before installing over an existing version.
  That last one is worth a second look in this release, because this one does migrate: make a
  recovery point before you install over v0.3.0.

The eight-hour session and the absence of a password login are also unchanged. The host window is
a way back, not a reason to skip setting up a passkey.

**Why 0.4.0 and not 0.3.2.** 0.3.1 and 0.3.2 were both built on the development machine and
neither was published — 0.3.1's packaged test run found the deletion race described above, and
0.3.2 was ready to go when the Chronicler work landed on top of it. A new capability is not a
patch, so this is 0.4.0. Everything those two builds contained is in this one.

**What was verified.** The typecheck across every package; the version, boundary, language and
asset gates; 503 map-generation checks; 58 Chronicler checks including six new ones for the two
new tasks; 349 server and backup-format checks including two new end-to-end ones — one that
revises a passage, files it as a proposal and then really puts it in place of the old passage
across the actual database, and one that writes a whole article; 463 client and protocol checks;
and the full packaged Electron run, 22 checks, twice — which includes deleting a world across the
real IPC boundary, proving a near-miss name leaves it standing, and proving its recovery point
survives.

**One correction to the v0.3.0 notes.** That release said the packaged test run was not
performed. It was run afterwards and passed, but it uncovered one stale assertion in the test
itself: it still expected a V19 backup file from a run that no longer records map provenance,
because the sample map was removed in an earlier release and the expectation was left behind. The
test now asserts V15 and that the provenance table really is empty. No application code was
involved.

**What was not verified.** The browser suite did not run — it needs Microsoft Edge and a running
PostgreSQL instance. The Chronicler's two new tasks were checked through the server and the
generator, end to end including the correction that replaces a passage, but **not by clicking
through the finished window**; the workbench tiles and the side-by-side comparison are covered by
types and by the language gate, not by a screenshot. Seven server tests remain red for reasons
that predate this work.

## Checking what you downloaded

```
Get-FileHash .\Atlas-Chronicles-Setup.exe -Algorithm SHA256
```

```
42C314EA805B18D8ADBDA4F7FEA25F214781EB5882415C0BA7186B90C97EAE59  Atlas-Chronicles-Setup.exe
```

Built from commit `487637e`.
