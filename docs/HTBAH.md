# How to be a Hero in Atlas Chronicles

In **Schmiede → HTBAH-Vorlage anpassen**, choose the round's 1–24 skills, stable IDs and
aptitude groups. Open the draft, inspect its fields, computed values, action outcomes and
source notice, then use **Aktivierung prüfen → Version installieren → Geprüfte Version für
diese Runde aktivieren**. Existing saved characters need an explicit package migration.
An installed version is immutable; create a new version or an independent copy to edit it.

The nine suggested skills are original examples, not an official mandatory catalogue.
The example characters Mara Morgenwind and Taro Fenn each distribute 400 points. They are
available in the preview and on an unsaved character only when the catalogue and calculations
remain compatible. Renaming labels is supported. For a changed catalogue, distribute the
points yourself; the UI explains why the prepared examples are unavailable.

## At the table

- **Tisch → Figur:** save raw skill points, aptitude bonuses, HP, agreed budget adjustment and
  spent Geistesblitze. Aptitudes, effective skills, total/remaining Geistesblitze and remaining
  creation points are derived from that version's formulas. Invalid effective skills above100
  or expenditure above the derived supply cannot be saved. Empty notes are valid.
- **Geistesblitz einsetzen** changes the draft only. Save it, then explicitly prepare another
  roll. The previous receipt remains. Refill is also an explicit saved edit. A lost save
  response can be retried with the original version and values without double expenditure.
- **Tisch → Aktionen:** choose a learned skill, an aptitude, initiative, damage or an explicitly
  agreed manual probe. The server rolls once, classifies the result, and stores its thresholds,
  complete package hash and replay trace. Confirm the result and use **Nachrechnen** to verify it.
- Damage rolls do not change HP automatically. HP edits do not automatically declare defeat.
  The sheet explains unconsciousness below10HP, death at0HP and unconsciousness after a single
  loss above60HP. The table applies these states explicitly.
- A skill with0 raw points uses its aptitude instead. The server enforces this precondition.
  Classified probes are excluded from the old fixed-threshold Vollmacht flow.

The generic rule editor also supports computed fields, cross-field validity conditions,
action preconditions and ordered result bands for other systems. Incomplete visual formula
edits remain editable, show an error and invalidate the package draft until corrected.

## Rule edition and attribution

The template pins the official PDF uploaded in2018 and the approved wiki probe revision27220
from2021. It uses the inclusive critical failure boundary: at an effective value of70,97 is
already a critical failure. The later unapproved revision33560 begins at98 and is not selected.
Source links, authors, revision IDs, license and adaptation notes are visible in the app and
travel with exported packages and campaigns.

Two choices are explicitly recorded as adaptations: an aptitude of0 fails even on a natural1;
critical damage doubles the agreed bonus together with the dice sum, `2 × (Nd10 + bonus)`.
The manual probe records the table's agreed thresholds rather than inventing a universal
modifier rule. Parry limitations and initiative ties remain decisions at the table.

Template data and adaptation are **CC BY-NC-SA4.0**. The generic engine remains separately
MIT-licensed. See [the template notice](../packages/rules/src/templates/LICENSE.md) and the
complete source attribution embedded in the package. No book pages, illustrations or logos
are bundled.

## Portability and verification

Campaigns with any installed extended rules package export as native **v5**, including an
inactive installed package. This preserves actor history, sheets, rolls, unused Vollmachten
and source attribution. See [native v5](CAMPAIGN_FORMAT_V5.md). Old v1 package/receipt semantics
and native v1–v4 public parsers remain unchanged.

Working-tree browser evidence on2026-09-06: HTBAH and the existing rule-forge/migration flow
both pass in15s, `.local/e2e-htbah-labels`. The HTBAH flow uses the real app/server with an
isolated test database, edits and activates the template, saves empty notes and HP/Geistesblitze,
checks constraints, confirms/replays a W100, rolls critical damage, validates the v5 HTTP export,
reopens the server and checks retained content plus390px layouts. This is functional browser
evidence, not an NVDA or reference-hardware performance result. Independent UI review covers
nine cases; pure rules and real-PostgreSQL integration have their separate review records.
