# Forge: Azgaar import

`importiereAzgaar(json)` accepts an Azgaar **Full JSON** file, validates its size,
structure, source identities, coordinates and references, and returns a detached
world artifact. The production adapter handles exported **cell records**, not the
parallel typed arrays available in the generator's running browser.

The result contains `titel`, `keim`, `weltId`, `knoten`, `orte`, `szene`, `zellen`,
`quelle` and `bericht`. `quelle.json` is the exact original artifact, with SHA-256
and byte count. Persist it together with the graph and scene in one transaction.
The source/report/provenance are GM data: send a separate viewer projection to
clients. `azgaarImportAdapter(json)` binds the artifact to `ErzeugerAdapter` and
refuses mismatched provenance; it never starts a generator.

The adapter emits world, landmass, political, province and settlement nodes,
Voronoi cell polygons, cell-derived province memberships and political relations.
Overseas political entities touch multiple landmasses without acquiring multiple
spatial parents. Identity uses the complete available generation options and
stable coordinates/territory paths. Source numeric IDs are only join keys; the
source-derived child seed is retained explicitly as provenance.

No wiki article or knowledge grant is created. Generator notes remain in retained
source and are counted as suppressed. Roads, rivers, markers, economic simulation
and other unused source collections are reported as omitted, not silently called
imported. Minimal exports currently require re-export as Full JSON. Input is capped
at 32 MiB, 200,000 records per collection and 64 levels of JSON nesting.

The offline test suite uses both deliberately synthetic edge cases and the real,
unchanged Azgaar 1.151.2 export documented in [fixture provenance](test/fixtures/README.md):
698 places, 4,733 cells, deterministic repeated import, no article stubs. HTTP,
persistence/reimport merge and viewer projection belong to their own packages.
No generator bundle or runtime installation is part of the importer.

## Forge: Grundriss generation

`erzeugeGrundriss(auftrag, paket)` is the first map Chronicle produces itself. It takes a seed —
typically an `Ort.kindKeim`, the derived child seed Azgaar computes as `seed + cellId` and then
throws away — plus an `AssetpaketV1`, and returns a `TacticalMapDocumentV1` that the canonical
`parseTacticalMapDocument` accepts, one `Knoten` per room, and a report.

The seed never reaches the PRNG alone. It goes into a `Weltkeim` together with every option, the
generator version **and the asset pack's id and version**; the resulting `keimHash` seeds both the
noise and every derived id. A changed option — including a pack bump — is therefore a different
map and says so, rather than quietly returning the same one. RB-21d measured why: the same seed at
a different canvas kept `(id, name)` for 0 of 664 generated settlements.

The product is the address, not the rectangles. Each room leaves as a `raum` node with a typed
`liegt_in_geografie` edge to the building, the map's `Rahmen`, an `Anker` at its centre in the
building's frame, and a stored `kindKeim` for whatever is generated inside it next. The room's
`Region` id **is** its `KnotenId`, so a map anchor and a containment node cannot drift into two
identities for one room. Given a parent, the fragment passes `pruefeContainment` unchanged; without
one it is honestly a fragment and fails the missing-parent check rather than inventing a world.

Layout is a BSP partition with a spanning-tree corridor set plus optional loops. Walls are the
merged unit edges between floor and rock; portals sit in room/corridor openings, where by
construction no wall exists and no furniture is placed. Generation fails loudly on an unreachable
room *or an enclosed floor cell* instead of emitting an unplayable map. Furniture is chosen by
`art` + `schlagwort` **queries against the pack**, never by asset name, so a pack that cannot serve
a theme slot produces a report line instead of a crash or a silent gap.

No article, passage or knowledge grant is created — the generator emits doors, not articles. Line
of sight, fog, secret doors, traps, encounters, treasure, elevation, background raster and tile
pyramid are absent and enumerated in `bericht.ausgelassen` on every run.

`packages/forge/tools/zeichne-grundriss.mts` renders a result to a standalone SVG for inspection
(`design/spikes/grundriss/`); it resolves every `Stamp.a` through the real manifest and is a second,
independent check that the references are real.
