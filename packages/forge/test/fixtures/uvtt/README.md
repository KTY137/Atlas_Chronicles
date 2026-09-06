# External UVTT fixture and adapter fidelity

This directory contains one genuine, unchanged Dungeondraft export from
[Imagix/uvtt2fgu at commit 9d37cb3](https://github.com/Imagix/uvtt2fgu/tree/9d37cb324d842745d3efc8364dfcec6383523999/exampleMaps),
its companion authoring project, and the upstream BSD-3-Clause license.
[provenance.json](provenance.json) pins full SHA-256 hashes, sizes, source URLs,
retrieval date and observed features. Tests verify all three original files.
The exact time of retrieval was not recorded; `retrievedAt` is explicitly null.

Attribution follows the repository's copyright notice: Andre Kostur (2021).
The [original license](upstream-LICENSE.txt) is retained verbatim. The
[Dungeondraft publisher FAQ](https://dungeondraft.net/) permits creators to
publish authored maps. The companion project records `uses_default_assets:true`
and an empty `asset_manifest`; no separate stock assets or application code
are vendored. The upstream repository license is not a claim that
Dungeondraft's underlying stock asset library is BSD-licensed.

The project's creation header records `1.0.1.3 awaken dryad` and local creation
time 2021-05-25 15:24:11 without a timezone. That is evidence of the authoring
project's creation build, not proof of the version used for this export.
The repository's later README version is not substituted for this evidence.

The UVTT 0.3 export has origin (2,1), a 10×10 grid at 256 pixels per cell,
a 2560×2560 embedded PNG, four wall polylines, one object blocker, two portals
with different closed flags and two colored lights. It is usable map content,
not a hand-written schema example. This single fixture does not establish
compatibility with every exporter. Small synthetic inputs in the test file
exercise hostile and missing-field cases and are explicitly separate.

## Adapter API

[uvtt.ts](../../../src/uvtt.ts) exports:

- `importUvtt(originalJson, provenance)` returns the validated native document,
  embedded image evidence, exact source artifact and `FidelityReport`.
- `exportUvtt(imported)` revalidates the source artifact and returns its exact
  original JSON, including formatting, unknown extensions and image bytes.
- `exportUvtt(imported, editedDocument)` writes edited supported fields,
  retains unknown properties on surviving source identities, and reports loss.
- `exportTacticalUvtt(document, image?)` exports a native map to legacy UVTT
  0.3 with an explicit report. Referenced backgrounds require matching bytes.
- `inspectUvttImage(base64)` checks a bounded static PNG/WebP container,
  dimensions and digest. It is not a pixel decoder or image-delivery service.

Only format 0.2 and 0.3 are accepted. The source is capped at 64 MiB; embedded
decoded image data is capped at 48 MiB. PNG chunk checksums and boundaries,
WebP RIFF/chunk boundaries, declared dimensions and animation indicators are
checked before returning image evidence. A future server must still perform
bounded decode/re-encode before delivery. Container inspection does not prove
that all compressed pixel data will decode. The adapter performs no network,
filesystem, generator, script or server operation.

## Field mapping and loss

The public [UVTT producer description](https://arkenforge.com/universal-vtt-files/)
provides the legacy field structure. Import uses `(point-map_origin)*pixels_per_grid`
for local image coordinates, including object blockers and portal/light positions.
Fractional crop origins shift the native grid lattice accordingly. Resolution
and image dimensions must agree within eight machine-epsilon units relative to
the pixel extent. This accepts arithmetic roundoff such as `2560/77*77`;
it does not admit pixel-size discrepancies. Embedded integer image dimensions
remain authoritative after that comparison.

| UVTT field | Native data |
| --- | --- |
| resolution | Independent external frame, pixel size, square grid |
| line_of_sight | Wall polylines |
| objects_line_of_sight | Object-blocking polylines |
| portals | Position, endpoints, radians, original closed/freestanding flags |
| lights | Position, pixel range, intensity, ARGB, shadow flag |
| environment | Baked-lighting flag and ambient ARGB |
| image | Exact bytes in import artifact; digest/MIME/dimensions in document |
| Unknown properties | Exact retained source plus explicit source-only report |

UVTT supplies no Chronicle articles, region passages, grants or actor tokens.
None are generated. Missing optional fields receive explicit default reports.
A missing image is reported while preserving usable geometry. Portal flags
do not reliably distinguish open doors from windows; this ambiguity is reported.

Untouched imports reproduce both original bytes and derived native data.
Native IDs are derived from SHA-256 of the entire exact source and collection
path; they are repeatable for that source, not stable across edited exports.
Wall vertices and portal endpoints have no native IDs. Unknown point attributes
follow exact coordinates only when those coordinates are unique in both old and
edited sequences. An unchanged full sequence retains its original attributes,
including duplicate coordinates. Removed, moved or ambiguous point attributes
remain in the original source and receive an explicit loss report; array indices
never silently reassign them to another edited point.
Edited/native UVTT exports therefore report identity loss whenever geometry
carries IDs. Hex/gridless declarations, independent grid offsets/scales,
non-UVTT axis frames, elevations, native stamps/regions/places and tile-cache
references are also reported when they cannot survive legacy UVTT.

`exactSource` means the returned source is unchanged. `sourceRetained` means
the original is still available through the supplied import artifact.
`nativeRoundTrip` describes preservation of this native projection, not
support for unknown producer behavior. Callers must inspect `issues` and
present any `severity:"loss"` entries before treating an edited export as a
portable replacement. Keep the native document and retained original together;
a lossy external export cannot replace historical native IDs or source evidence.
