# Atlas Chronicles — Steam store draft

Internal draft, 2026-09-12. Copy describes implemented product areas; promotion
requires the exact Steam build to pass the acceptance checklist. There is no
published Steam page. Suggested category: Player Tools. Pricing, release date,
developer/publisher display names and support links remain owner-supplied fields.

## Short description — German

Baue eine Welt, die deine Gruppe entdecken kann. Atlas Chronicles verbindet
Kampagnenchronik, Figurenwissen, Karten, eigene Regeln und Charakterbögen – mit
einem gemeinsamen Spieltisch für Szenen und nachvollziehbare Würfe.

## Short description — English

Build a world your players can discover. Atlas Chronicles brings campaign notes,
character knowledge, maps, custom rules and character sheets together, with a
shared tabletop for scenes and recorded dice rolls.

## About this software — German

**Eine Chronik für eure gemeinsame Geschichte**

Sammle Orte, Personen und Ereignisse deiner Pen-&-Paper-Kampagne und verknüpfe
sie zu einer Welt. Bestimme als Spielleitung, welches Wissen eine Figur erhält,
und behalte Geheimnisse, Entwürfe und bestätigte Einträge im Blick.

**Eigene Regeln und Figuren**

Entwickle Regelpakete und Charakterbögen in der Schmiede. Bearbeite Felder,
Formeln und Würfe, erprobe Regeln an Testfiguren und nutze die Vorlagen für
die Figuren deiner Runde.

**Von der Vorbereitung an den Spieltisch**

Bereite Karten und Szenen vor, platziere Figuren und teile die passende Sicht
mit deiner Gruppe. Am Tisch bleiben Würfe nachvollziehbar und Beiträge im
gemeinsamen Verlauf erhalten.

**Deine Kampagne auf deinem Rechner**

Die Windows-Anwendung verwaltet lokale Welten. Sichere deine Kampagne als
`.chronicle`-Datei und importiere sie in eine neue Welt. Für gemeinsames Spiel
verbindet sich die Gruppe mit dem laufenden Host; die Einrichtung und Zugänge
verwaltet die Spielleitung.

## About this software — English

**A chronicle for your shared story**

Collect the places, people and events of your tabletop RPG campaign and connect
them into a world. As the game master, decide what each character knows while
keeping track of secrets, drafts and confirmed entries.

**Your rules and characters**

Create rule packages and character sheets in the Forge. Edit fields, formulas
and dice rolls, try rules with test characters, and use your templates for the
characters in your campaign.

**From preparation to the tabletop**

Prepare maps and scenes, place characters, and share the appropriate view with
your group. At the table, dice results remain traceable and contributions stay
in the shared history.

**Your campaign on your computer**

The Windows application manages local worlds. Export your campaign as a
`.chronicle` file and import it into a new world. For group play, players connect
to the running host; the game master manages setup and access.

## Evidence and fields to settle before copying into Steamworks

| Claim or field | Product evidence / required decision |
| --- | --- |
| Campaign chronicle, per-character knowledge, maps and rolls | [README](../../README.md), [tactical UI](../TACTICAL_UI.md); qualify final installed build |
| Rule and sheet authoring | [authoring guide](../AUTHORING.md), `packages/client/src/features/RuleForge.tsx`, `ActorWorkbench.tsx`; merged GUI implemented, qualify the exact installed build |
| Local packaged build | [Native verification](verification-20260912.md): corrected staged Windows package passed 29 checks, including Forge navigation, rules activation, maps and semantic restart/restore; Steam installation remains open |
| Native export and fresh-world restore | [restore guide](../CAMPAIGN_RESTORE.md), desktop smoke suite; device-bound full-host recovery is a different feature |
| Hosting and player joining | [LAN guide](../LAN.md); actual two-device/firewall acceptance remains open |
| Windows x64 | `packages/desktop/src/main.ts` rejects other platforms; minimum OS/CPU/RAM/GPU/storage remains unmeasured |
| Language checkboxes | Client German/English exist. The desktop host manager still has German controls; do not claim complete English coverage until qualified |
| Chronist / AI assistance | Implemented but deliberately absent from promotional copy pending the Steam policy and survey decision in [README](README.md#content-survey-decisions-requiring-evidence). Survey must still disclose accessible functionality |
| Steam feature checkboxes | No proven Steam achievements, Workshop, Cloud, matchmaking, Steam Input, Deck/Proton or Linux/macOS support; leave unproven selections off |
| Voice/video and screen sharing | Removed from the product; omit from copy and screenshots |
| Commercial fields | Owner supplies price, release model/date, publisher and support/privacy details; none are inferred from repository author fields |

The proposed copy does not require a cloud account for a local world and makes
no promise of hosted public servers or included external AI credits. Do not
append old prototype screenshots, feature counts, unsupported RPG compatibility
claims or future features to this draft.

## Capture and artwork brief

Capture the exact accepted build using an original sample campaign with no
real credentials, private campaign content or unlicensed imported artwork.
Suggested five-screen sequence:

1. Campaign chronicle showing linked places and a selected article.
2. A prepared map with figures and the scene controls.
3. The Forge overview and an intelligible custom rule.
4. A character sheet created from that rule package.
5. The shared table with a recorded roll and the resulting history.

Make both German and English captures only after their full visible flows are
qualified. Screenshots should show the working application, with no marketing
text painted over the interface. Capsule art should use the readable Atlas
Chronicles title and approved artwork. [Store review requirements](https://partner.steamgames.com/doc/store/review_process).

| Required asset | Current Steam dimensions / format | Deliverable status |
| --- | --- | --- |
| Header capsule | 920 × 430 | Open |
| Small capsule | 462 × 174 | Open |
| Main capsule | 1232 × 706 | Open |
| Vertical capsule | 748 × 896 | Open |
| Screenshots | At least 1920 × 1080, 16:9 | Final-build captures open |
| Shortcut icon | 256 × 256, ICO or PNG | Open |
| App icon | 184 × 184, JPG | Open |
| Library capsule | 600 × 900 | Open |
| Library hero | 3840 × 1240, PNG | Open |
| Library logo | 1280 wide and/or 720 tall, PNG | Open |
| Library header capsule | 920 × 430 | Open |

Dimensions checked against Valve's current
[graphical asset overview](https://partner.steamgames.com/doc/store/assets)
on 2026-09-12. Use its templates for crop/safe-area rules. No artwork or
screenshot is described as Steam-ready merely because a local image exists.
