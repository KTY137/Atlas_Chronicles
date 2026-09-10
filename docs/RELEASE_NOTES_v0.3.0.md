<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Atlas Chronicles v0.3.0 — release notes

One release, one subject: **nobody should ever be locked out of their own world.**

Setup is described in [Getting Started](https://github.com/KTY137/Atlas_Chronicles/blob/main/docs/GETTING_STARTED_EN.md).

## What happened

An ordinary session lasts eight hours. A remembered browser lasts thirty days. There is no
password login — by design. So when a session lapses and you have set up neither a passkey nor a
remembered browser, the sign-in page is a wall: every way in needs a session, and you have none.

This is not only a player's problem. It happened to the person who **installed the server** —
the platform game master, on their own machine, with the world sitting healthy on the disk right
next to them.

Nothing was lost, and nothing ever was: the world, the campaigns and every account were intact
the whole time. There was simply no door.

## The host window now has the door

The desktop host window — the one that starts and stops your local world — gained a section
called **Zugänge und Rollen**. It appears while a world is running and offers three things:

- **Runden und Mitglieder.** Every campaign in this world, every member, their role, and the
  column that matters: whether that person can still get in at all.
- **Zugangscode erzeugen.** A one-use, ten-minute pairing code for any member. It is entered in
  the world under “Neues Gerät verbinden”. This is the way back.
- **Einladungscode erzeugen.** A seven-day invitation for a campaign, so you can bring somebody
  new in without first being inside yourself.
- **Zur Spielleitung machen / zum Spieler machen.** Who runs a round, decided from here.

**Why this is allowed here and nowhere else.** The host window runs on the machine that owns the
world, behind Electron's capability check, and it already holds the profile secrets. Whoever has
that window open has the folder. A login in front of it would be a lock on a door that is
already open.

**What it deliberately does not do.** It issues no session and takes over no account. It
produces codes that must be redeemed in the browser; only there does an access come into being.
And no role change may leave a round without a game master — that is checked in a transaction,
with a test that holds it.

One more line drawn on purpose: making somebody the game master **of a round** does not grant
them the right to create their own rounds **on this server**. Those are two different questions,
and merging them would be a quiet grant of privilege.

## Also in this release

**A user area.** “Your access” used to be a page for passkeys. It now says what you may do on
this server, which rounds you are in and with which role, and how to get back to the sign-in
page. It also warns you, in the place where it matters, that without a passkey or a remembered
browser you will need a new pairing code after signing out.

**An invitation link opened while already signed in used to do nothing at all.** The sign-in
page reads `?join=`, and it is only shown when nobody is signed in. It is now picked up and
explained: joining creates its own access for that round, so you sign out first.

**You could get stuck in the settings.** With no campaign open the whole navigation rail is
disabled, and the only ways out were an unlabelled wordmark and a dropdown. There is now a
labelled exit at the top and the bottom naming where it leads, Escape closes the page, and the
disabled rail says why it is disabled.

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
contains **no migration and no schema change**; installing over v0.2.0 does not touch your data.

## What is not finished

Named rather than hidden, and recorded by the build itself in `installer.json`:

- No signature, no timestamp, no verified publisher.
- No update feed and no tested updater.
- No ASAR integrity check and no release fuses.
- No drain, recovery point or migration admission before installing over an existing version.

**The browser test suite did not run for this release**, as for the last one: it needs Microsoft
Edge and a running PostgreSQL instance. And seven server tests are red — two live-sequence
assertions and five timeouts around tiles, settlements and native archives. They were red before
this work; that was checked by setting the changes aside and measuring again.

**What is not solved.** The eight-hour session itself is unchanged, and so is the fact that
there is no password login. The host window is a way back, not a way to avoid needing one — if
you run a world for other people, set up a passkey, and tell your players to do the same.

## Checking what you downloaded

```
Get-FileHash .\Atlas-Chronicles-Setup.exe -Algorithm SHA256
```

```
286b6ec33cf159b68077d17edfc77e09f04d8ed5886d48251c943ef75f767aec  Atlas-Chronicles-Setup.exe
```

Built from commit `COMMIT_PLATZHALTER`.
