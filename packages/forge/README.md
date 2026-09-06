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
