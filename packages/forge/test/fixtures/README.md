# Real Azgaar export fixture

`azgaar-full.json.gz` contains the **unchanged bytes** downloaded using the public
generator's own **Full JSON** export button on 2026-09-06. Gzip is only storage
compression. The decompressed SHA-256, source URL, generator version, exact seed,
canvas dimensions and capture method are recorded in `provenance.json`.

This is a fresh generated world named **Koria**, Azgaar **1.151.2**, 640 × 480,
4,733 packed cells and 698 living burgs. It is not a hand-written approximation,
a converted Minimal export, or the older 2026-07-27 measurement world.

The output was generated for this project. Azgaar permits use of generated maps,
including commercial use, in its [Knowledge Base](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Knowledge-Base#who-owns-the-maps-created).
No generator code, font, raster/SVG asset, TinyMCE, jQuery or charge artwork is
included. Heraldry **data** may remain inside the exact source artifact; the adapter
does not turn it into bundled artwork. The artifact is a test input, never an
automatically published wiki. Generated prose stays in retained source and is
counted as suppressed in the import report.

The source exporter implementation is
[export-json.ts](https://github.com/Azgaar/Fantasy-Map-Generator/blob/master/src/services/io/export-json.ts).
Full exports contain `pack.cells` as cell records; the live-browser typed-array
layout used by `spike-G-keim` is different.

To deliberately capture a **new** fixture on Windows with installed Edge:

```powershell
node packages/forge/tools/capture-azgaar-fixture.mjs
```

Review the new metadata and update the explicit expected fixture counts/version
in `azgaar-real.test.ts`. This is a fixture maintenance tool, not a product generator
or a reproducibility promise across upstream versions. Normal tests are offline.
The compact synthetic boundary fixture in `azgaar.test.ts` is separately labelled.
