# @chronicle/theme

Closed, framework-free M8 data contracts. This package has no dependencies and no DOM,
Node, network, CSS execution, storage, campaign authority or hashing implementation.
`tsconfig.json` checks its source using only the ES2022 library and no ambient host types.

## Files and persistence

`parseThemeManifest(unknown)` accepts a plain data object or JSON text. It rejects unknown
or missing fields, duplicate keys (including escaped equivalents), prototype keys,
accessors, non-JSON objects, symbols, cycles, sparse arrays and non-finite numbers.
Both the input text and canonical output must fit 64 KiB. Depth and node budgets apply
before schema validation. Objects returned by parsers are detached immutable snapshots.

The `.chronicle-theme` file is exactly `serializeThemeManifest(manifest)`: V1 manifest
JSON with recursively sorted UTF-16 object keys and ordinary JSON number/string spelling.
Case in hex colors and human-authored text is preserved, not silently normalized.
`themeCanonicalJson` offers the same bounded canonical JSON to hash a manifest or its
contrast report; it alone does **not** validate a manifest schema. Server/IO compute SHA256,
bind the report to that manifest hash and recompute the report on admission. Larger native
containers must use their own container budget, not this 64 KiB utility.

The exact exported types and enum lists are in `src/model.ts`. No field permits executable
styles, selectors, custom resource locations, HTML or rule behavior. Attribution is plain
text and a finite license label; it records the author's assertion, not a verified license
grant. Bundled presets use `LicenseRef-Project`, not an invented third-party license.

Structural validity and contrast admission are separate: an editor must be able to hold
and repair a bad-color draft. Save/pin/publication admission requires the report's `passes`
value. A stored report supplied by a client is never authoritative on its own.

## Finite token coverage and renderer contract

| Tokens/recipes | Existing UI uses to map |
| --- | --- |
| bg, bg-deep, surface, surface-2, surface-hover, input-bg | Shell, Reader, panel, field, toolbar, hover and live feature surfaces |
| text, text-muted, text-faint | Body, secondary/help text, placeholders and tertiary labels; all treated as normal text |
| accent, accent-strong, accent-ink, accent-soft | Primary control normal/hover, its label and selected surfaces |
| link, link-visited, focus, control-line | Real links, focus outline and meaningful field/control boundaries |
| ok/danger/warning/info/private and their -soft surfaces | Notice, validation, connection, whisper and provenance states |
| selection, selection-ink, disabled, disabled-bg | Selection and explicit readable inactive state; do not apply a blanket opacity afterward |
| line, line-strong, overlay | Decorative separators and obscuration only; never the sole control/state indicator |
| typography, geometry, sampling, motion | Finite local font IDs; spacing/radius/borders/edge/icon recipes; image sampling; numeric timing and cadence |

The existing undefined `--muted` and `--surface-1` are renderer aliases to `text-muted` and
`surface`. Hardcoded CSS colors, gradients or opacity must still be migrated by the host;
the package does not inspect or rewrite stylesheets. Essential text must have a declared
opaque reading surface, not depend on a photo or arbitrary gradient. Focus pair evidence
assumes the outline is adjacent to the declared surface (the current host uses an outline
offset); a different adjacency must be checked in the actual UI. Status retains text/icons
and cannot rely only on hue. Decorative lines do not stand in for `control-line`.

Presets are distinct in more than palette: Cyberpunk uses cut edges and snappy timing;
Medieval uses light paper, serif body, etched edges and rune icons; Fantasy uses the dark
shell with Cinzel/Plex, rounded geometry and gentle timing; PixelArt uses mono typography,
square stepped edges/icons, nearest sampling and stepped cadence. The host must actually
render these recipes. `PUBLIC_DEFAULT_THEME` is a fixed Fantasy value independent of any
private campaign selection.

## Contrast evidence and limits

`evaluateThemeAccessibility` returns the fixed algorithm ID, 135 measured token pairs,
their thresholds/kinds, failed pair IDs and an overall result. It contains no manifest
hash. The sRGB transfer function, luminance coefficients and luminance-ratio calculation
follow [W3C G18](https://www.w3.org/WAI/WCAG22/Techniques/general/G18.html), checked 2026-09-06.
The transfer breakpoint is 0.04045. Values are never rounded before comparison.

All declared text roles use 4.5:1, including headings, so this pure contract needs no font
size assumption. Meaningful focus/control boundaries use 3:1, following
[WCAG 2.2 non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
The disabled pair's 4.5:1 is labeled `inactive-product`: an intentional product requirement;
inactive controls are excepted by the WCAG criteria. Hover is checked against its own
surface, not required to differ by 3:1 from its unhovered color.

This report is evidence only for the declared opaque pairs. It does not certify overall
WCAG conformance or observe font size, compositing, actual rendered CSS, focus geometry,
graphics, native forced-colors output, keyboard navigation or assistive technology.
The shipped presets and fixed high-contrast palette pass every declared pair. DOM/browser,
keyboard, screenreader and zoom acceptance remain host responsibilities.

## Local authority

`parseAccessibilityPreferences` and `serializeAccessibilityPreferences` implement a separate
closed local V1 contract. The package does not read localStorage or media queries.
`recoverAccessibilityPreferences` explicitly returns `{preferences,recovered}` for malformed
or outdated local storage; do not use that convenience fallback for server manifests.

`resolveTheme(manifest, preferences, system)` applies the local skin and then accessibility.
System restrictions win even when local contrast says `normal`. Forced colors remain a
separate flag: the renderer must preserve native forced-color adjustment; RGB fallback
values cannot represent every OS palette. High contrast or an inaccessible draft uses the
fixed correction palette, removes decoration/transparency and reports `correctedContrast`
when correction was needed. The source draft remains unchanged. Low power also stops
motion; reduced-motion always resolves every duration to zero. Local system/reader font
replaces display and body roles. Density stays independent from skin; atmosphere `clean`
removes decorative art. Local preferences never enter the campaign manifest or native bundle.

## Focused verification

Run `npx vitest run packages/theme/test/theme.test.ts` and
`npx tsc -p packages/theme/tsconfig.json --noEmit` from the repository root. Tests exercise
actual file roundtrips, exact byte/JSON boundaries, side-effect rejection, four presets,
known luminance anchors, a just-below-threshold contrast pair, missing state contrast,
immutable drafts, local storage recovery and layered system restrictions.
