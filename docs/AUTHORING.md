# Themes and explicit publication

The adopted contract is [authoring/publication](../design/iterations/authoring-publication-20260906.md).
Migration `012_authoring.sql` adds seven tables. Full campaign exports use
[native v4](CAMPAIGN_FORMAT_V4.md); v1/v2/v3 stay closed historical formats and require an explicit
upgrade when restored into the current schema.

## Theme and local appearance flow

In **Schmiede → Themes**, a GM starts with Cyberpunk, Medieval, Fantasy or PixelArt, edits the
closed manifest with named controls, checks the rendered preview and contrast report, then saves
an immutable revision. **Gespeicherte Revision für die Runde übernehmen** changes the campaign
pin explicitly. Other members receive the change through their authorized live refresh.
Editing or importing a theme does not change an existing campaign or public pin.

The saved `.chronicle-theme` file contains exactly the canonical `ThemeManifestV1`; opening one
creates a new draft. It cannot contain CSS, scripts, remote font/image URLs or arbitrary tokens.
All four presets pass the pure package's 135 declared opaque color pairs. The host maps these
tokens to controls, notices, panels, dice cards, map controls and media indicators. PixelArt also
changes type, geometry, icon recipe, motion cadence and actual raster texture sampling.

**Zugang verwalten → Deine Darstellung** stores a versioned preference in this browser only:
local skin or campaign-following, high contrast, reduced motion/transparency, font, spacing,
atmosphere, decoration and low power. OS forced colors, increased contrast and reduced motion
take precedence. Bad stored JSON falls back to defaults; a storage failure is shown. Browser
preferences and credentials never enter a campaign export.

Pure contrast reports concern declared colors, not a full WCAG audit. The browser regression
also measures actual account text and primary controls, including hover, in all four skins;
it checks mobile width and OS overrides. Pair colors switch together to avoid unreadable
intermediate frames between light and dark themes. Whole-product accessibility, assistive
technology and every combined feature state need their own evidence.

## Public reader flow

In **Schmiede → Veröffentlichung**, configure the public title, slug, language, warnings and
optional immutable theme revision. A null public theme uses the fixed Fantasy preset, never
the private campaign's current pin. The world starts disabled.

Choose an article, select its passages explicitly, optionally select confirmed provenance
records for its public feed, then inspect **Öffentliche Vorschau prüfen**. The sandboxed preview
uses the exact HTML renderer used by anonymous delivery. **Genau diesen geprüften Stand freigeben**
pins that immutable article revision and selection. Article revision, publication version and
world-policy version must all still match. Later private edits, names, aliases, provenance or
theme heads do not silently update the published bytes. A new release needs a new preview and
decision. **Artikel zurücknehmen** immediately removes that article from public outputs and
redirects, while retaining its historical publication record for correct retries and restore.

World/article renames preserve explicit public aliases. The address editor can select proven
accepted Wiki import sources and requires an explicit confirmation before adding a legacy
mapping. `/wiki/...` and bounded language paths such as `/de/wiki/...` are unique across this
host; different language prefixes remain distinct. An internal mapping cannot install
a redirect on someone else's original server.

Anonymous HTML, JSON, search, backlinks, feed, sitemap and social SVG derive from one public
projection. GM cookies confer no extra visibility there. Text and captions can be published;
unproven imported image rights do not cause source images to be fetched or exposed. Required
attribution is checked against the source associated with the selected immutable revision.

## Delivery and operation

Anonymous delivery requires **both** an enabled world policy and the separate process setting
`CHRONICLE_PUBLIC_DELIVERY=1`. The setting defaults off, is not stored in the seven tables and
cannot be enabled by restoring an archive. The GM UI states when host delivery is off; draft
preview remains available. The operative demo is not automatically migrated or reconfigured
by browser tests; each test uses a distinct database schema and port.

Public routes:

- `/w/:publicKey/:worldSlug` and `/w/:publicKey/:worldSlug/:articleSlug`
- `/public/:publicKey/world.json`, `/entries/:articleSlug`, `/search?q=...`, `/backlinks/:articleSlug`
- `/public/:publicKey/feed.json`, `/sitemap.xml`, `/robots.txt`, `/social.svg?article=...`
- Confirmed `/wiki/...` and `/:locale/wiki/...` legacy redirects

Responses use `no-store`; ETags derive from the actual public body. A withdrawn publication
does not return its old content through conditional requests. New installations still need
the existing host/network/HTTPS configuration before public Internet reachability is claimed.

## Evidence and remaining work

`e2e/authoring.spec.ts` covers nine actual browser flows: shared campaign pin versus local/OS
preferences; byte-equal preview/anonymous/GM-cookie output and private mutation twins; lost write
acknowledgement plus failed revision lookup without duplicate themes; rendered account color
pairs for four skins; accepted Eron source attribution through publication and confirmed
`/de/wiki/` redirect; real nested theme-preview CSS and 390px layout; live removal of GM access;
and retained dirty editors during both 503 and 429 membership refresh failures. All nine pass
under `.local/e2e-authoring-complete/`. Independent cases restart their isolated HTTP host to
reset its request budget; this is not a rate-limit endurance measurement.

The integrated browser run passes all 23 functional flows in 2.2 minutes, including actual
loopback media, under `.local/e2e-authoring-integrated/`; four opt-in performance cases are
reported separately. The working-tree gate with real PostgreSQL passes 781 tests in 76 files,
with one intentional PGlite-only concurrency skip, TypeScript, 233-file/8-rule boundaries and
the asset gate. Canonical client artifact: `index-C4bNbIAT.js`.

Independent review produced failing regressions before correcting theme-save CAS baselines,
terminal editor authorization loss, and cross-entry attribution in fully rehashed native v4
archives. A browser regression also caught transient refresh errors unmounting a dirty editor.
SQL command races, source cutoffs, public privacy twins, exact schema coverage, real PostgreSQL
restore and CLI upgrade chains are covered by their focused suites. These totals describe the
shared working tree. A later final pre-commit gate passes789 tests in77 files, one intentional
skip,234 boundary files and41 assets after concurrent Claude additions. It includes an isolated
fix to derive a genuinely different package version in the existing generator test; the
production pack had reached that test's old hardcoded counterfactual version. The exact
committed-tree gate is recorded separately in STATUS.
Desktop delivery and the remaining M7/M9 acceptance work remain in [the full plan](IMPLEMENTATION_PLAN.md).
