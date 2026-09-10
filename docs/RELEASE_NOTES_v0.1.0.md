<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->
# Atlas Chronicles v0.1.0 — release notes

Prepared for the first GitHub release. Not published yet; see the block at the end for what still blocks it.

**A shared chronicle for pen & paper.** Campaigns, per-character knowledge, a wiki, generated maps, rule packages, and a table with traceable rolls.

Setup is described in [Getting Started](https://github.com/KTY137/Atlas_Chronicles/blob/main/docs/GETTING_STARTED_EN.md) — on your own computer, on your network, or on a server.

## What is in this first version

- **ChronicleHeroes**, the rules that ship with the app. Nine skills in three fields, a d100 rolled under the value, and armour that takes damage off and costs you initiative. A collection of one hundred skills to build your party's catalogue from, and forty ready-made loot cards with pictures.
- **The map studio.** Generate a region, a town, a building interior or a cave, then edit it: terrain, height, roads, buildings, rooms, walls and doors. A scatter brush for trees, rocks and reeds. Names that follow a line you draw. Moods — day, night, winter, autumn — saved with the map, so players see them too.
- **The table.** Rolls with receipts, knowledge per character, a wiki whose passages you reveal one at a time, and campaign export as a portable `.chronicle` file.

## Before you install

This build is **unsigned**. Windows will warn you that the publisher is unknown; that warning is accurate, and you should only continue if you trust where you got the file. There is no update channel — a later version means downloading again.

The installer is per-user and needs no administrator rights.

| | |
|---|---|
| File | `Atlas-Chronicles-Setup.exe` |
| Size | 217 MB |
| Platform | Windows, 64-bit |
| Electron | 44.2.0 |

## What is not finished

These are named rather than hidden. The build records them itself, in `installer.json`:

- No signature, no timestamp, no verified publisher.
- No update feed and no tested updater.
- No ASAR integrity check and no release fuses.
- No drain, recovery point or migration admission before installing over an existing version.

Voice and video chat are not part of the app. Text chat, player banners and presence run on the app server; for talking, use a separate application.

## Checking what you downloaded

Compare the SHA-256 of the file against this line before you run it. In PowerShell:

```
Get-FileHash .\Atlas-Chronicles-Setup.exe -Algorithm SHA256
```

```
003a000f740644029daee86dabd125f211beb0740e7c89cca027eed44564dbf9  Atlas-Chronicles-Setup.exe
```

Built from commit `10f3b54`.

## Why this is still a draft

Two things stand between this file and a published release.

- **`Andaria_03.02.2024.webp` states no licence.** The picture sits in the desktop artifact. Nobody has written down who drew it or under which terms it may be redistributed, so shipping it publicly would distribute a work without permission. Either the co-author records consent in the provenance package, or the image leaves the build.
- **Four build gates are open**, recorded by the build itself in `installer.json`: signature, update feed, ASAR integrity, and install-over-existing admission. These do not block a clearly labelled first release, but they belong in the notes, and they are in them.

How-to-be-a-Hero was the third blocker. It is resolved: the CC BY-NC-SA package now lives behind `@chronicle/rules/examples`, out of the shipped barrel, and `gate:boundaries` fails the build if product code imports it. ChronicleHeroes ships in its place.
