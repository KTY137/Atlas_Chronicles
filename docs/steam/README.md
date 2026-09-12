# Steam release preparation

Prepared 2026-09-12. This is a local release workbench for the Windows x64
desktop. No Steamworks account, assigned app/depot IDs, Steam build, store page
or Valve approval has been verified. Nothing was uploaded or published.
The [store draft](store-draft.md) and [verification record](verification-20260912.md)
separate proposed store content from measured delivery evidence.

## Prepare the depot locally

Use one frozen, qualified source revision. Follow [DESKTOP.md](../DESKTOP.md)
for the pinned runtime and workspace installation. Run from the repository root:

```powershell
npm.cmd run build
npm.cmd run desktop:build
node packages/desktop/tools/package.mjs
```

The packager prints a folder under `.local/desktop-artifacts`. Select that
folder explicitly; the Steam tool deliberately has no “latest artifact” default:

```powershell
node packages/desktop/tools/steam.mjs --help
npm.cmd run steam:prepare -- --artifact=YOUR_ARTIFACT_FOLDER --stage=steam-review
```

Replace `YOUR_ARTIFACT_FOLDER` with that exact folder name. This works without
Steamworks credentials or IDs. It writes a **new** `.local/steam-staging/steam-review`
directory containing:

| Path | Purpose |
| --- | --- |
| `content/AtlasChronicles.exe` and the complete application tree | Actual depot payload; launch at its root |
| `scripts/` | Empty until both real Steamworks IDs are supplied |
| `output/` | Reserved for SteamPipe logs/cache, outside depot content |
| `steam-preparation.json` | Every staged file's size/SHA256, source-record hash, launch settings and open gates |

The tool reuses the installer's complete inventory verifier before and after
copying, validates launch/runtime resources and version metadata, rejects links,
additional or modified files, and known private/development resource names.
The private-file check is a focused admission check, not a general secret scan.
It never copies the artifact's adjacent `source/`, installer, logs or profiles.
It preserves existing output and writes the success record last. If an attempt
fails, retain the partial output for inspection and choose a new `--stage` name.
Do not upload a directory without its completed success record.

When the owner has real IDs from Steamworks, supply them as a pair and use a
new stage name:

```powershell
# Set these environment variables to the actual assigned IDs first.
npm.cmd run steam:prepare -- --artifact=YOUR_ARTIFACT_FOLDER --stage=steam-preview --app-id=$env:ATLAS_STEAM_APP_ID --depot-id=$env:ATLAS_STEAM_DEPOT_ID
```

This additionally creates `app_build_<app-id>.vdf` and
`depot_build_<depot-id>.vdf`. Paths are relative to the scripts, `Preview` is
`1`, the complete content maps to the depot root, and no `SetLive` is specified.
SteamPipe's preview mode produces local logs/manifests; a live-branch setting
can otherwise activate an uploaded build. Review these generated files before
using Valve's tools. This preparation command never executes SteamCMD, logs in,
uploads, selects a branch or changes Steamworks metadata.
[SteamPipe documentation](https://partner.steamgames.com/doc/sdk/uploading).

Numeric validation does not establish that an ID exists, belongs to Atlas, or
has the correct access. Confirm those facts in the owner's Steamworks account.
Synthetic IDs are used only in isolated tests. No `steam_appid.txt` is shipped.

## Launch configuration and acceptance

Configure a Windows 64-bit launch entry for `AtlasChronicles.exe` at the install
root, with blank arguments and default working directory. The executable runs
the existing host manager and bundled PostgreSQL. Steam receives the unpacked
application, not the Squirrel installer. There is no install script in this
configuration. Steam's application setup requires launch options and properly
associated depot/package access.
[Initial SteamPipe setup](https://partner.steamgames.com/doc/sdk/uploading#initial_setup).

The current runtime explicitly supports Windows x64. Minimum Windows version,
CPU, RAM, graphics and storage figures still need measurement on reference
hardware. Do not infer a supported OS from Electron's theoretical support or
publish this development machine as a minimum specification.

After the final merged desktop build is packaged and staged, the existing
native suite can exercise that copied executable with an isolated test profile:

```powershell
node packages/desktop/tools/smoke.mjs --executable="$PWD/.local/steam-staging/steam-review/content/AtlasChronicles.exe"
```

That proves a local executable flow, not Steam installation. Record the source
commit, `artifact.json` hash, `steam-preparation.json` hash, actual Steam BuildID
and depot manifest ID together when later qualifying a Steam build.

The corrected `steam-qualified-20260912` stage passed all 29 native checks,
including restart and semantic export/restore, under unchanged API limits.
Exact package hashes, migration parity, explicit scenario pauses and native
evidence are in [the verification record](verification-20260912.md). That
artifact does not embed a source revision; no commit identity is asserted.

| Required acceptance | Evidence to retain | Current status |
| --- | --- | --- |
| Steam library install and Play, ordinary Windows account, no developer checkout or Docker | Build/depot IDs, hardware/OS and startup evidence | Open |
| World creation, GM setup, player join, rule editing, character creation, maps and rolls | Actual installed build scenarios | Open for Steam |
| Persistence after quit/relaunch; portable `.chronicle` export and restore | IDs, hashes and semantic restore result | Open for Steam |
| Offline start of local world after initial installation | Steam offline-mode result, no remote provider required | Open |
| Update from previous accepted build, with a stopped host and pending migrations | Recovery-point/migration evidence and preserved campaign | Open |
| Steam Stop, normal Quit, manager-close/tray choice and crash cleanup | Owned worker/PostgreSQL process lifecycle | Open |
| Uninstall/reinstall and coexistence with standalone installation | Profile preservation, instance-lock and launcher behavior | Open |
| LAN with a second physical device, private-world access, firewall prompt behavior | Two-device evidence; no credentials in screenshots | Open |
| Keyboard, screen reader, scaling and reference-hardware performance | Actual accessibility/hardware results | Open |

Profiles live under Electron `userData`, outside the installation. The Steam
and standalone editions currently use the same application identity. Test this
explicitly; do not assume independent profiles or safe simultaneous instances.
Do not enable Steam Cloud for the live PostgreSQL cluster, DPAPI files or
recovery directory: the existing [device-bound recovery](../DESKTOP.md#device-bound-recovery)
is Windows-account-specific. A separate portable save-sync design is required
before claiming Cloud support. An old application binary alone is not a
database rollback.

## Store and release checklist

Valve lists **Player Tools** among accepted non-game software categories;
that is the proposed fit for Atlas, subject to the owner's actual app setup.
Account onboarding, legal entity, bank/tax details, agreement and the app fee
are owner/account work. Valve's onboarding page lists a USD 100 fee per product,
a 30-day waiting period for the first few titles, and at least two weeks of
public Coming Soon presence. No date for any of these has been established.
[Steamworks onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding).

- [ ] Owner confirms product type, assigned app/depot IDs, build-account rights
  and inclusion of the Windows depot in the appropriate packages.
- [ ] Owner supplies public developer/publisher identity, support contact,
  support/privacy pages, price, territories and release model/date.
- [ ] Current code and assets receive rights/notice review, including bundled
  dependencies, PostgreSQL, fonts, asset packs and sample rule content.
- [ ] Complete the Content Survey and resolve the Chronist-specific decisions below.
- [ ] Capture final qualified UI screenshots and produce the required store,
  library and icon assets in [store-draft.md](store-draft.md).
- [ ] Measure minimum/recommended hardware; verify each claimed language and
  feature in the exact build submitted for review.
- [ ] Finish the existing project desktop hardening/accessibility gates. The
  staging record retains the original artifact's open gates; a Squirrel
  signing/update-feed item describes the standalone channel, not a new Valve
  SteamPipe requirement. Record an explicit Steam-channel disposition for it.
- [ ] Review store page and product build through Steamworks, then record
  Valve's actual results before scheduling release.

Valve normally quotes 3–5 business days for store and build review and asks for
at least seven business days to allow corrections. Store claims must match the
available product; screenshots show the actual product, and selected platform
features must work in the submitted build. Approval and release are separate
steps. [Valve review process](https://partner.steamgames.com/doc/store/review_process).

## Content Survey decisions requiring evidence

The current [Chronist](../CHRONIST.md) can use local Ollama models or an
owner-provided Anthropic key stored by the desktop manager. Record exactly
which options the Steam edition exposes. **The present external paid-key flow
has not been established as acceptable for Steam.** Valve's live-AI FAQ says
paid external AI access should be managed for players with a Steam-supported
payment method. This makes the existing flow a product-policy question to
resolve with Valve or a separately reviewed Steam-edition change; this task
does not disable or approve it.
[Content Survey and live-AI FAQ](https://partner.steamgames.com/doc/gettingstarted/contentsurvey).

For the chosen edition, document accessible generation, provider/data handling,
actual protection against illegal outputs and test evidence. Human confirmation
before canon changes is an existing integrity boundary; it does not by itself
prove content safeguards. Inventory AI-assisted content actually shipped and
consumed by users, including art, narrative and localization. Source candidates
outside the depot are not evidence of shipped content: for example,
`assets/generated/painted-dungeon-v1/README.md` explicitly describes unregistered
candidates. Inspect the packaged files. Valve distinguishes pre-generated
player-facing content from generation during use and requires the corresponding
disclosures. [AI survey scope](https://partner.steamgames.com/doc/gettingstarted/contentsurvey).

No survey answer, legal determination, payment integration or Steam approval is
invented by the local preparation record.
