# Chronicle file adapters

Production code for RB-12 V1 passage import and the versioned wiki module bundle. No template, HTML or Lua is executed. The server owns authorization, acceptance, persistence and reader projection.

```ts
import { importEron, planEronReimport, createWikiBundle, serializeWikiBundle } from "@chronicle/io";

const preview = importEron({
  articles: articlesJson,
  templates: templatesJson,
  universeId,
  campaignId,
  wikiUrl: "https://eron.fandom.com/de/",
  importiertAm: "2026-09-06T12:00:00Z",
});

const review = planEronReimport(previousPreview, preview);
// A separate human acceptance command persists selected candidates in a transaction.
```

`preview` contains entries, revisions, passage ASTs, aliases, resolved and unresolved links, provenance, media references, the original JSON source and an import report. It always requires review. Imported passages have `praegung: null` and `geltung: "notiz"`; imported text does not impersonate a table mint.

Complete revision history can be supplied through `attributionByPageId`. Without it, provenance explicitly records missing author history and revision SHA1. It does not fabricate authors, substitute the last editor, or claim complete attribution. Media references are source-only and have unknown licensing; this adapter does not fetch bytes or invent verified Assets.

The decomposer balances nested template/link delimiters, retains filled infobox fields in template declaration order, preserves multi-value fields as one atom, and emits paragraphs, lists and quotation blocks under heading paths. Unknown constructs, tables, HTML and file markup survive as inert raw blocks with individual report entries. Original source also survives verbatim inside its original JSON values. Short prose is logged; the threshold defaults to 40 plain-text characters. `textErhaltung` measures retained parsed block text against retained plus explicitly dropped short-paragraph text; structural wiki delimiters and heading metadata are outside that metric.

IDs include universe/campaign/source scope, page identity and normalized AST content, excluding ordinal/heading placement and resolved link IDs. Identical duplicate blocks use an occurrence discriminator within their content hash. A reimport produces unchanged mappings, candidate additions and candidate removals; it never removes passages or rewrites revelations. Custom template mappings and link rejection policy are caller-supplied import configuration and must be retained by the host with its acceptance command.

`createWikiBundle`, `validateWikiBundle`, `serializeWikiBundle` and `parseWikiBundle` implement format `atlas-chronicles/wiki`, version 1 and block AST version 1. The reference parser rejects unsupported versions/fields, malformed ASTs, duplicate identities, broken graph references, cross-scope rows, cyclic lineage and missing/tampered original source. Serialization is canonical and round-trips without a semantic diff. This is the wiki module of an application export: application actor identities, maps, rules and media bytes require their own accompanying modules. Restoring grants also requires server authorization and actor reconciliation.

No runtime dependencies beyond the existing core/chronik workspace packages are needed. Run:

```powershell
npm.cmd exec -- vitest run packages/io/test
```

The suite imports the real Eron corpus and tests the documented 23-atom war and 18-field Arvex articles, redirects, determinism, source conservation, attribution gaps, reimport review, schema rejection and full wiki bundle roundtrip.
