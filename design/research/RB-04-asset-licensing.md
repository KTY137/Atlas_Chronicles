# Assets & Licensing

Project Chronicle research brief RB-04. Access date for all sources: **2026-07-26**.
Scope: which sprite/tile/token/audio/font/icon sources a **paid, self-hostable, browser-based**
VTT may legally ship, and what strategy follows. Answers Kaya's K5(e) — *"es muss doch sowas
unter einer kommerzialisierbaren Lizenz geben"*.

**The short answer: yes, such licenses exist — but "free for commercial use" is the wrong
question.** The question a VTT must ask is *"may I redistribute the asset file itself, to an
unlimited number of third parties, including third parties who will run their own servers with
it?"* Most licenses that say "commercial use OK" say **no** to that. Section
[The redistribution trap](#the-redistribution-trap) is the crux of this brief; everything else
follows from it.

Method note: some sources blocked automated fetching (itch.io pages, unity.com/legal,
forgotten-adventures.net → HTTP 403); claims for those are reconstructed from search-indexed
snippets and the publicly readable EULA-FAQ mirrors, and flagged. Nothing here is legal advice —
the German-law points in particular need a `Fachanwalt für Urheber- und Medienrecht` before the
first commissioning contract is signed.

---

## License classes and what they permit

Read this table as: *what may we do with the asset **file** in a product that (a) is sold,
(b) is installed and operated by third parties, (c) transmits the raw file to every browser at
the table, and (d) lets those users export their campaigns?*

### CC0 1.0 Universal — the safe class

Public-domain dedication. No attribution, no notice, no restriction on redistribution, no
sublicensing problem. This is the only class that is unambiguously frictionless for us.

Caveats that matter even here:

- **CC0 does not waive trademark or patent rights** (explicit in the CC0 legal text). A CC0
  sprite that depicts a trademarked or franchise-derived thing is still infringing — and OGA
  documents "fan art based on copyrighted franchises" as one of its three standing licensing
  problems (https://opengameart.org/content/art-with-licensing-issues).
- **CC0 carries no warranty of title.** If the uploader wasn't the author, CC0 conveys nothing.
  OGA states this plainly: *"while we tried our best, this file is in no way guaranteed to be
  accurate, and properly attributing the work you distribute with your project remains **your
  responsibility**"* (same URL).
- **German-law wrinkle (relevant, Kaya is the stakeholder):** under §29 UrhG copyright itself is
  not transferable and the `Urheberpersönlichkeitsrechte` are not waivable, so a blanket waiver
  of the CC0 kind is at least partly ineffective in Germany
  (https://irights.info/artikel/was-ist-cc0/28750,
  https://www.telemedicus.info/neue-cc-lizenz-cc0-no-copyright/). CC0 anticipates this with a
  **fallback unconditional license plus a non-assertion covenant**, so CC0 functions in practice
  in DE — but a residual §13 UrhG right to be named can in principle survive
  (https://wb-web.de/aktuelles/wann-bei-cc0-der-urheber-genannt-werden-muss.html). *Uncertain —
  contested in the literature.* **Practical mitigation: credit CC0 authors anyway.** It costs
  one row in a manifest and removes the entire dispute class.

### CC BY 3.0 / 4.0 — safe, with machinery

Redistribution and commercial use are permitted; attribution is mandatory and must be *carried
through every distribution*, including our exports.

CC BY 4.0 §3(a) requires retaining, where supplied: creator identification, a copyright notice,
a notice referring to the license, a notice referring to the warranty disclaimer, a URI to the
licensed material, an indication of modification, and the license text or a link to it — and it
may be satisfied *"in any reasonable manner based on the medium, means, and context in which You
Share the Licensed Material"* (https://creativecommons.org/licenses/by/4.0/legalcode.en). That
flexibility is what makes a generated credits page + machine-readable manifest a legitimate
compliance mechanism rather than a shortcut.

Two CC BY gotchas specific to us:

- **Anti-DRM clause.** CC BY grants permission to make *"technical modifications necessary to
  circumvent Effective Technological Measures"* (§2(a)(4), same URL), and the licensor may not
  use such measures to obstruct licensed uses. So CC-licensed art **cannot** be put behind
  asset-protection, watermarking gates, or a per-seat unlock. This forecloses "our art library is
  the moat" as a business idea for anything CC-licensed. (Practically irrelevant — a browser VTT
  cannot protect assets anyway — but it must not be planned around.)
- **Attribution must survive export and composition.** Our product exports campaigns and, via
  WFC, flattens tiles into atlases and composite maps. If the manifest does not follow the asset
  across those boundaries, the exported artifact is an unattributed redistribution and the
  license is breached.

**OGA-BY 3.0** is CC BY 3.0 with the technological-measures restriction removed, created
specifically so artists could allow DRM platforms (https://opengameart.org/content/oga-by-30-faq).
Slightly *better* than CC BY for us. Same attribution mechanics.

### CC BY-SA (and GPL on art) — the copyleft trap

LPC (Liberated Pixel Cup) is the canonical example: **dual-licensed CC BY-SA 3.0 *and* GPLv3**
(https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles,
https://lpc.opengameart.org/content/properly-licensing-your-liberated-pixel-cup-game-entry).
Both arms are copyleft: redistributing a modification grants the recipient the same rights.

The nuance that decides the case for a VTT:

- **ShareAlike attaches to *adaptations*, not to *collections*.** Putting an unmodified CC BY-SA
  tile in a bundle alongside our proprietary art is mere aggregation — SA does **not** infect the
  whole product (https://wiki.creativecommons.org/wiki/ShareAlike_interpretation,
  https://wiki.creativecommons.org/wiki/4.0/ShareAlike).
- **But our core feature is adaptation.** A WFC generator that composites tiles into a single
  rendered battlemap, packs them into a texture atlas, or recolours them for the theme system
  (K1) is plausibly producing **adapted material** → *that output* must be CC BY-SA. Concretely:
  the GM's generated map would be BY-SA-licensed, and any premium "export your map" or
  marketplace-sale feature is contaminated. First-party tiles authored to match a BY-SA tileset's
  edge grammar and palette are also at derivative-work risk.
- **The GPL arm is worse on art**: "corresponding source" for a sprite (layered PSD/Aseprite)
  has no settled interpretation, and the LPC guidance itself only tells you to propagate both
  licenses and document authorship in a `COPYING` file — it does not resolve the composite case.
- **LPC is not even internally uniform**: per-artist license variation exists (some contributors
  moved to CC-BY), so `CREDITS.TXT` must be read per file
  (https://github.com/ElizaWy/LPC, https://github.com/ElizaWy/LPC/issues/1).

**Verdict: exclude CC BY-SA and GPL art from the shipped default set by policy.** Not because it
is illegal — because the per-asset audit needed to stay safe costs more than commissioning
replacements, and one mistake taints a customer-facing output. This is a real loss: LPC is the
largest coherent free set of animated 4-direction character sprites in existence, exactly what
animated tokens want. Accept the loss; do not litigate the edge cases in production.

### CC BY-NC (and NC-SA / NC-ND) — fatal, and it hits "How to be a Hero"

NC forbids use *primarily intended for or directed toward commercial advantage or private
monetary compensation*. A paid VTT is the paradigm case.

**"How to be a Hero" is CC BY-NC-SA 4.0** (https://foundryvtt.com/packages/how-to-be-a-hero,
https://github.com/julr/htbah, https://rollenspiel-kompass.de/regelwerk/how-to-be-a-hero/) —
which independently confirms the pack's existing plan (intake §Source A: "only as a later,
licence-compliant external package"). Two separate blockers:

1. **NC:** we may not bundle or sell it, or ship it inside the commercial distribution.
2. **SA:** the ShareAlike arm would force the *contents of our rule-package format* under
   BY-NC-SA wherever the package is an adaptation of the rulebook.

Consequences to design around: HtbaH must be a **separately distributed, user-installable,
non-commercial package** maintained outside our commercial artifact — or covered by a **direct
written license from How to be a Hero e.V.** Additional flag: if a future marketplace takes a
revenue share on, or gates access to, a third-party HtbaH package, that arrangement starts to
look commercial even though we didn't author it. Decide this before the marketplace exists.

**ND (NoDerivatives)** is equally fatal for anything we scale, recolour, tint for theming, or
composite — which is every map asset. Note that **Tabletop Audio**, the category-leading RPG
ambience library, is **CC BY-NC-ND 4.0** (https://tabletopaudio.com/about.html) — NC *and* ND.
Unusable. Its SoundPad content is additionally *"not for use outside tabletopaudio.com"*.

### Paid one-time commercial licenses and asset-store EULAs — almost all unusable

See the next section. Short version: these are bilateral contracts between the store and one
buyer. They permit *use in a finished product*; they forbid *onward distribution of the asset*.
A VTT is onward distribution of the asset.

### SIL OFL 1.1 — safe for fonts, and the right answer

OFL explicitly permits bundling, embedding, redistributing **and selling** the font with
software, and permits hosting the font for others provided the full font package remains
available (https://openfontlicense.org/ofl-faq/, https://scripts.sil.org/ofl,
https://fossa.com/blog/open-source-licenses-101-sil-open-font-license-ofl/). The one live
obligation: **Reserved Font Name** — a *modified* font (including a subsetted/hinted/renamed
variant we generate for the PixelArt theme) must not carry the original name.

Self-host the WOFF2 files. Never link a font CDN: it breaks the self-hostable invariant, and
embedding Google Fonts from Google's servers has been held to transmit the visitor's IP address
without consent under GDPR by LG München I (2022) — *recalled from memory, not verified this
session; verify before relying on it.* Self-hosting is both the compliant and the invariant-
respecting path, so the question does not need to be reopened.

---

## The redistribution trap

**This is the crux.** A browser VTT is, architecturally, a file server for art.

Every tile, token, sprite sheet, effect frame and audio file is transmitted verbatim over HTTP to
every connected client, lands in the browser's HTTP cache, and is extractable in three clicks
(DevTools → Network → Save). We cannot prevent this; and for CC content we are contractually
forbidden from trying (CC BY §2(a)(4), above). Self-hosting compounds it: we also hand the entire
asset corpus to **third-party operators**, who then distribute it again to *their* players.

So a single map render performs three distinct copyright-relevant acts:

1. **Distribution / communication to the public** of each asset file to end users.
2. **Onward distribution to independent operators** — sublicensing-shaped. Many licenses forbid
   transfer or sublicensing outright.
3. **Provision of content-authoring tooling** — WFC generation plus user uploads plus a map
   editor makes the product arguably "game creation software" or a UGC platform, a category
   several EULAs carve out explicitly.

The distinction is therefore **not commercial vs. non-commercial. It is use vs. redistribution.**
A shipped game bakes assets into a bundle where extraction violates the game's own EULA; a VTT
ships them as first-class, user-facing, user-remixable files. Legally we resemble an **asset
marketplace** far more than we resemble a game. Every license evaluation must be done against
that framing.

### The clauses that actually bite

- **Unity Asset Store.** Assets may be distributed only *"to the extent that assets are embedded
  or incorporated into a game or digital product"* with *"substantial amount of original creative
  work"* and *"purpose, features, and function beyond the distribution of assets"* — and,
  decisively: **"A product is not 'incorporated' into the Licensed Product if it is designed to
  allow your end users to extract or download assets separately from the Licensed Product."** The
  FAQ further prohibits use in products *designed to let end users make their own games (like
  Roblox)* without the publisher's permission, because publishers want *"the opportunity to
  negotiate separate, fair pricing and terms"* for such uses
  (https://assetstore.unity.com/browse/eula-faq; unity.com/legal/as-terms returned 403). **Read
  literally, this describes our product and forbids it.** Unity Asset Store content — and by
  extension the same clause family on Epic's Fab — is out.
- **Synty Studios (one-time purchase licence).** *"You must not distribute our Assets as stock
  images or stock art (2D or 3D) or otherwise share them for re-use by third parties"*; *"You
  must not share the source files of any Assets outside your team"*; and the prohibited-uses list
  includes **"Creation of content for Metaverse-related and/or Game Creation Software"** plus
  bans on Generative-AI training and AI-assisted generation
  (https://syntystore.com/pages/one-time-purchase-licence). Sublicensing is limited to
  collaborators *"in relation to Products produced under your direct control"* — self-hosters are
  not under our control. Out, twice over.
- **Humble Bundle game-dev asset bundles.** Assets, modified or not, *may not be resold as
  standalone media, alone or in packs*, and the license is **non-transferable**
  (per-bundle One-Time Purchase Licence terms; reconstructed from search snippets and
  https://syntystore.com/pages/one-time-purchase-licence which is the same license family for
  Synty content sold through bundles). Non-transferability alone breaks the self-hosting chain.
- **Sonniss #GameAudioGDC bundles** (the biggest free-as-in-beer pro SFX libraries):
  *"Licensee may not sell any of the sound effects as they come. (Although the sound effects may
  be sold as incorporated into licensee project)."* Plus an explicit AI-training prohibition and
  no general sublicensing grant (https://sonniss.com/gdc-bundle-license/). Streaming the raw WAV/
  OGG to a browser inside a paid product is exactly the ambiguous case. **Unsafe by default.**
- **Free-with-credit itch packs.** Pipoya's very widely used top-down RPG sprites — precisely the
  content a VTT wants — are free for commercial use but **"do not redistribute or resell this
  assets"** (https://pipoya.itch.io/pipoya-free-rpg-character-sprites-32x32, terms per pack
  README / search snippets). Free ≠ redistributable. This pattern (CraftPix freebies,
  most Elthen/Sanctumpixel-style packs) is the majority of itch.io's "free" art. *Uncertain per
  individual pack — must be read individually; assume forbidden until read.*
- **VTT-native art vendors.** **Forgotten Adventures**, the best map-asset library in the hobby,
  requires an approved commercial license via an application form plus a scheduled meeting; *you
  may not publish commercial products without an approved license, and submitting the form does
  not grant one* (https://www.forgotten-adventures.net/commercial-application/ — 403 to automated
  fetch; per search snippet). Dungeondraft asset packs on itch are typically
  personal-use-via-VTT-or-print only, with commercial use forbidden absent written permission.

### The structural argument for public licenses

There is an elegant reason to prefer CC0/CC BY beyond price: **public licenses grant rights
directly to every downstream recipient.** With CC0/CC BY assets, we are not sublicensing at all —
each self-hoster and each player receives their license from the original author, so the
distribution chain never needs a sublicensing right we don't have. Paid EULAs are bilateral and
break at the first hop. For a self-hostable product, that is not a cost trade-off; it is an
architectural fit.

---

## Candidate sources

Verdict key: **YES** = bundle it; **COND** = usable with a named control; **NO** = do not ship,
policy-blocked.

| Source | Content | License | Safe for us? |
|---|---|---|---|
| **Kenney.nl** — https://kenney.nl/assets, https://kenney.nl/support | Thousands of 2D/3D/pixel/UI/audio/font/texture assets; incl. Tiny Dungeon, Tiny Town, Modular Dungeon Kit, Input Prompts, VFX Light Masks | **CC0 1.0.** *"all game assets on the asset pages are public domain licensed (CC0)"*, *"free to use them, even in commercial projects"*, *"Attribution is not required"* (kenney.nl/support; per-pack page states `License: Creative Commons CC0`, e.g. https://kenney.nl/assets/tiny-dungeon) | **YES** — primary bundled default. Single author = clean provenance. The paid "All-in-1" itch bundle is convenience only; license unchanged (*uncertain — verify the bundle page's own license line*) |
| **Poly Haven** — https://polyhaven.com/license | HDRIs, PBR textures, 3D models | **CC0.** Redistribution explicitly permitted; attribution and Patreon support requested, not required | **YES** |
| **ambientCG** (ex-CC0Textures) — https://ambientcg.com/, https://docs.ambientcg.com/license/ | PBR surfaces/atlases/decals, HDRIs, substances, terrain — stone, wood flooring, paving, ground | **CC0.** *"free to use without attribution - even in commercial circumstances"* | **YES** — the realistic floor/wall texture answer |
| **Dungeon Crawl Stone Soup tiles** — https://opengameart.org/content/dungeon-crawl-32x32-tiles + supplemental; https://github.com/crawl/tiles | 3000+ (and 3000+ more) 32×32 tiles in **orthogonal overhead three-quarter perspective** — terrain, walls, dungeon features, monsters, spell effects, items, GUI, avatars | **CC0 for the curated export** — artists *"signed off their copyright, returning these tiles to a license similar to 'public domain', CC Zero"* — **but the repo also ships `TILES_UNDER_UNKNOWN_LICENSE.md`** for tiles *"not eligible for reuse due to unclear licensing"* | **COND** — use only the curated CC0 export; diff `ARTISTS.md` / `TILES_UNDER_UNKNOWN_LICENSE.md` on every upstream bump. Best perspective match for VTT tokens in the free ecosystem |
| **0x72 — 16×16 DungeonTileset II** — https://0x72.itch.io/dungeontileset-ii | Dungeon walls/floors/props + animated characters | **CC0** (*"use this tileset for whatever you like under CC-0 license"*; itch 403 to fetch, per search snippet + https://itch.io/e/1455918/0x72-published-16x16-dungeontileset-ii) | **YES** |
| **game-icons.net** — https://game-icons.net/about.html | 4000+ **SVG** + PNG game icons (Lorc 1429, Delapouite 2022, others) | **CC BY 3.0**, per-author credit; suggested form *"Icons made by {author}. Available on https://game-icons.net"* | **YES (tier 2)** — the obvious UI iconography default. SVG = recolourable, so it serves the K1 theme system too. Requires wired per-author attribution |
| **OpenGameArt — CC0 subset** — https://opengameart.org/content/cc0-tiles-tilesets | Mixed community tiles/sprites/audio | CC0 | **COND** — provenance audit mandatory (see Risks). Prefer identifiable single authors over anonymous uploads |
| **OpenGameArt — CC BY / OGA-BY subset** — https://opengameart.org/content/faq, https://opengameart.org/content/oga-by-30-faq | Mixed | CC BY 3.0/4.0; **OGA-BY 3.0** = CC BY 3.0 minus the anti-DRM restriction | **COND (tier 2)** — attribution wired through manifest + exporter |
| **OpenGameArt — CC BY-SA / GPL subset** | Mixed | CC BY-SA 3.0/4.0, GPL 2.0/3.0 | **NO (policy)** — copyleft; composite/atlas output contamination |
| **LPC — Liberated Pixel Cup** — https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles, https://github.com/ElizaWy/LPC | The largest coherent free set of **animated 4-direction character sprites** + matching tiles | **Dual CC BY-SA 3.0 + GPLv3**, per-artist variation in `CREDITS.TXT` | **NO (policy)** — painful loss, correct call. See copyleft trap |
| **itch.io CC0 tag** — https://itch.io/game-assets/assets-cc0 | Mixed single-author packs, incl. CC0 effect/sprite packs (https://itch.io/game-assets/assets-cc0/tag-sprites) | CC0 (as tagged) | **COND** — the itch tag is self-declared by the uploader; the binding text is usually only in the pack README. Verify and archive evidence per pack |
| **Freesound — CC0 subset** — https://freesound.org/help/faq/ | SFX, ambiences | CC0 (filterable: license facet → "Creative Commons 0") | **YES (tier 1 audio)** |
| **Freesound — CC BY subset** | SFX, ambiences | CC BY | **COND (tier 2)** — attribution wired |
| **Sonniss #GameAudioGDC bundles** — https://gdc.sonniss.com/, https://sonniss.com/gdc-bundle-license/ | Very large professional SFX libraries, free download | Bespoke royalty-free; **"may not sell any of the sound effects as they come"**; AI-training prohibited; no sublicensing grant | **NO / unsafe by default** — we serve raw files to browsers. Could be revisited only for audio we *transform* into our own composed cues, with counsel |
| **Tabletop Audio** — https://tabletopaudio.com/about.html | Best-in-class 10-min RPG ambiences | **CC BY-NC-ND 4.0**; SoundPad *"not for use outside tabletopaudio.com"* | **NO** — NC and ND both fatal |
| **SIL OFL fonts** (Google Fonts, League of Moveable Type, etc.) — https://openfontlicense.org/ofl-fonts/ | Webfonts incl. pixel/display faces for theme presets | **OFL 1.1** (some Google Fonts are Apache-2.0 — also fine) | **YES** — self-host WOFF2; rename any modified/subset variant (Reserved Font Name) |
| **NASA imagery** — https://www.nasa.gov/nasa-brand-center/images-and-media/ | Space photography (Cyberpunk/sci-fi skyboxes) | Generally **not subject to US copyright**, but: *"The NASA Insignia, Logotype, identifiers, and imagery are not in the public domain"*; no implied endorsement; identifiable persons carry privacy risk; some NASA-hosted material is third-party copyrighted and marked | **COND, low value** — Poly Haven / ambientCG HDRIs are cleaner and better suited. Never the insignia |
| **Kay Lousberg / KayKit** — https://kaylousberg.com/game-assets, https://kaylousberg.itch.io/ | Stylised low-poly 3D kits (characters, dungeon, props) | **CC0**; author *requests* no reselling of unmodified copies (a request, not a license term) | **YES** if we ever need 3D. Honour the request |
| **Pipoya free RPG sprites/tilesets** — https://pipoya.itch.io/pipoya-free-rpg-character-sprites-32x32 | Top-down 32×32 characters + tilesets — exactly our shape | Free for commercial use **but "do not redistribute or resell this assets"** | **NO** — redistribution is literally our runtime |
| **Unity Asset Store** — https://assetstore.unity.com/browse/eula-faq | Enormous | Asset Store EULA: not "incorporated" if end users can extract/download separately; UGC/game-creation use needs publisher permission | **NO** |
| **Synty Studios** — https://syntystore.com/pages/one-time-purchase-licence | Stylised 3D packs | One-Time Purchase Licence: no distribution as stock art / for third-party re-use; **no "content for Metaverse-related and/or Game Creation Software"** | **NO** |
| **Humble Bundle game-dev asset bundles** | Mixed 2D/3D/audio | One-Time Purchase Licence: no standalone resale alone or in packs; **non-transferable** | **NO** — non-transferability breaks self-hosting |
| **Forgotten Adventures** — https://www.forgotten-adventures.net/commercial-application/ | Best-in-class VTT map assets + tokens | Proprietary; commercial use requires an approved license (application + meeting) | **NO for bundling** — **YES via user upload** (the GM's own purchase, see strategy) |
| **Dungeondraft asset packs** (various itch creators) | VTT map props/tiles | Typically personal-use-via-VTT/print only; commercial forbidden without written permission | **NO for bundling** — user-upload path only |
| **"Untamed" / Butterscotch Shenanigans CC0 release** | — | — | **UNVERIFIED** — no such CC0 asset release could be confirmed this session. Treat as not a source until someone produces a URL |

---

## What we need per category

1. **Floor / wall / dungeon tilesets for WFC — the real bottleneck.**
   Art is abundant (Kenney, 0x72, DCSS, ambientCG). What is **not** available off the shelf is
   the thing WFC actually consumes: **per-tile edge sockets and adjacency constraints.** Almost
   no published tileset ships that metadata. State this plainly to Kaya: *WFC's bottleneck is not
   the algorithm, it is an authored, constraint-annotated tileset.* Consequences:
   - The tile grammar (socket vocabulary, symmetry classes, weights, forbidden pairs) is
     **first-party work** regardless of where the pixels come from.
   - Standardise on the **47-tile "blob"/Wang autotile layout** as the interchange format — it
     encodes edge compatibility positionally, so third-party and user tilesets can be ingested
     mechanically (https://ijdykeman.github.io/ml/2017/10/12/wang-tile-procedural-generation.html).
   - Because CC0 art can be freely modified, we can **re-cut CC0 tiles into our socket layout** —
     which is exactly what CC BY-SA would have made hazardous. Another reason CC0 wins.
2. **Tokens / creature sprites, top-down.** DCSS's 3000+ tiles are in *orthogonal overhead
   three-quarter perspective* — the closest large free set to VTT token needs. Kenney Tiny Dungeon
   for stylised. The animated-token gap is real: LPC is the free ecosystem's answer and we are
   excluding it, so **animated tokens are a commission item.**
3. **Animated effects (fire, magic, water).** Thinnest safe supply in the whole survey; most itch
   effect packs are free-with-credit-no-redistribution. **Recommendation: prefer procedural /
   shader VFX over sprite-sheet VFX.** A WebGL fire or water shader is *our code*, not someone's
   art — it sidesteps licensing entirely, themes parametrically (K1), and scales without atlas
   memory. This aligns with RB-02's rendering direction; treat it as a licensing argument too.
4. **Map props / objects.** Kenney kits + ambientCG decals; realistic surfaces from
   ambientCG/Poly Haven.
5. **UI iconography.** game-icons.net (CC BY 3.0, SVG) as default, Kenney Input Prompts (CC0) for
   key/controller glyphs. SVG is a hard requirement for theme recolouring.
6. **Fonts.** OFL 1.1 only, self-hosted WOFF2, subset per theme preset, renamed if modified. One
   body face + one display face per shipped theme (Cyberpunk / Medieval / Fantasy / PixelArt).
7. **Ambient audio.** Freesound CC0 + Kenney audio only. The category leader is NC-ND. Plan a
   modest first-party ambience set, or ship no bundled ambience and be excellent at ingesting the
   GM's own files — the honest option given the supply.

---

## Recommended asset strategy

A five-tier model. The tier is a first-class field on every asset, enforced in CI.

**Tier 0 — a small first-party core set (commissioned, work-for-hire).**
Deliberately small: one dungeon tileset **with a complete WFC tile grammar**, one wilderness/
exterior set, ~40 tokens (incl. a few animated), the UI sprite kit, and one ambience bed. This is
the only art we can warrant, theme freely, recut for sockets, and **license onward to users**. It
is what makes K5 ("nur in besser") achievable, because the differentiator is the *generation
grammar*, not asset count.

*What the German commissioning contract must specify* (§ references = UrhG; verify with counsel):
- Copyright itself is **not transferable** under §29 UrhG — you acquire **exclusive exploitation
  rights** (`ausschließliche Nutzungsrechte`), not "ownership"
  (https://illustratoren-organisation.de/nutzungsrechte-fuer-auftraggebende/,
  https://www.gesetze-im-internet.de/urhg/__32.html).
- Scope: exclusive, worldwide, unlimited in time, all known types of use, **transferable and
  sublicensable** (`übertragbar und unterlizenzierbar`) — non-negotiable, because self-hosters and
  end users need sublicenses — plus the **right to modify/adapt** (`Bearbeitungsrecht`, needed for
  re-cutting and theme recolouring) and use in marketing.
- **Explicitly acquire the right to grant end users a license** to use the assets in their own
  campaigns, generated maps, and exports. Without this clause our users' exported maps are
  unlicensed.
- §31a UrhG: rights for **unknown future types of use** require written form and carry a
  revocation right — address explicitly.
- §§32/32a UrhG: the artist's claim to `angemessene Vergütung` and to **`Nachvergütung`** if the
  work becomes disproportionately successful is **not waivable**, and a `Total-Buy-Out` at a low
  flat fee in pre-formulated terms is invalid under §307 BGB
  (https://www.anwalt.de/rechtstipps/verguetung-im-urhebervertragsrecht-chancen-und-risiken-von-buy-out-modellen-267772.html,
  https://www.anwalt.de/rechtstipps/angemessene-verguetung-und-nachverguetungsansprueche-fuer-designleistungen-32-32a-urhg-207295.html,
  https://dejure.org/gesetze/UrhG/32.html). **Mitigation: pay market rate, document the
  scope-vs-fee reasoning in the contract, and prefer milestone or per-title bonuses over a
  rock-bottom lump sum.** (Recent case law is cited in the German commentary as BGH 18.05.2025 –
  I ZR 82/24; *uncertain, judgment not read this session*.)
- §13 UrhG attribution right cannot be fully waived — so contract *how* the artist is named (our
  credits page), rather than pretending they are not.
- Warranties + indemnity: sole authorship, no third-party or ripped assets, **no undisclosed
  AI-generated content** (AI output's protectability in DE/EU is contested, so we may be unable to
  obtain exclusivity in it at all).
- Deliverables: layered sources (PSD/Aseprite), the **documented tile grammar** — sockets,
  symmetry classes, weights, adjacency rules — not just PNGs, the palette definition, and per-file
  license metadata in our manifest schema.

**Tier 1 — CC0 bundled defaults.** Kenney + DCSS curated export + 0x72 + ambientCG/Poly Haven +
Freesound CC0. **Snapshot into our own repository with SHA-256 checksums and archived provenance
evidence — never hotlink upstream.** Credit the authors anyway.

**Tier 2 — CC BY / OGA-BY, credited automatically.** game-icons.net and selected OGA/itch CC BY
packs. Admission gate: attribution wired through the manifest **and** the exporter, verified by a
test.

**Banned by policy (CI-enforced):** anything NC, ND, BY-SA or GPL; any asset-store EULA (Unity /
Fab / Synty / Humble); any "free but no redistribution" pack; anything with unverifiable
provenance; anything AI-generated whose training provenance we cannot account for.

**Tier U — user uploads: the volume answer, and where the trap becomes a feature.**
We cannot ship Forgotten Adventures, Dungeondraft packs, or Humble-bundle art — but **the GM who
bought them may upload them for their own table.** So the strategy is: *ship a small clean set,
and be outstanding at ingesting the art users already own.* Concretely: `.dungeondraft_pack` and
Universal VTT (`.dd2vtt`) import, bulk tileset slicing, autotile detection, and a "bring your own
art" onboarding path. This serves K5 with **zero** licensing exposure and is a genuine
differentiator against Roll20's walled marketplace.

Uploads are **untrusted input** (pack invariant). Required controls: server-side re-encode of all
raster images (strips EXIF and malformed-decoder payloads), **SVG rejected or DOMPurify-class
sanitised** before ever being served — an SVG can carry `<script>`, which would breach the
no-arbitrary-code-execution invariant; dimension/size/frame-count caps; content served from a
separate origin or with `Content-Disposition`/strict CSP; per-campaign scoping so uploads never
leak into shipped defaults or another tenant; a **license attestation at upload time** recorded in
the manifest; and ToS + notice-and-takedown + repeat-infringer policy.

**Tier M — marketplace, later.** Whenever it lands, the creator agreement must grant *us* a
sublicensable right to distribute to buyers, **to buyers' self-hosted servers**, and **into
buyers' exports**. Draft that clause now, even if the marketplace is Phase 12 — it cannot be
retrofitted onto contracts already signed.

---

## In-app license bookkeeping

Attribution is not a credits screen bolted on at the end; it is a **data model** that has to
survive composition and export. Design it in Phase 0.

**Per-asset record** (one row per file, machine-readable, SPDX-identified):

```
asset_id, sha256, tier (0|1|2|U|M),
title, author, author_url, source_url, acquisition_date,
license_spdx        # CC0-1.0 | CC-BY-4.0 | CC-BY-3.0 | OFL-1.1 | proprietary-user | …
license_url, license_text_snapshot   # snapshot: upstream pages change/disappear
modifications       # required by CC BY 3(a): what we changed
attribution_required, redistribution_allowed, commercial_ok, sharealike_flag
provenance_evidence # archived page capture / repo commit hash
uploader_attestation # tier U only
derived_from[]      # ← the critical edge: atlases and composites point back at sources
```

**Mechanisms:**

- **`derived_from` is the load-bearing field.** When WFC flattens tiles into an atlas or renders a
  composite battlemap, attribution must propagate through the derivation graph — otherwise credit
  is silently lost at exactly the moment the product is most impressive.
- **CI gate:** build fails if any bundled asset lacks a manifest row, carries a banned SPDX id, or
  has a checksum mismatch against the snapshot. This is what turns policy into a guarantee.
- **In-app credits page**, generated from the manifest, reachable from the UI (not buried), plus
  per-asset license inspection in the asset browser (hover/details panel) — so a GM can see
  before using an asset whether it is redistributable.
- **Machine-readable endpoints:** `GET /api/licenses` and a `THIRD-PARTY-ASSETS.md` in every
  distribution artifact, so self-hosters inherit compliance automatically rather than having to
  understand it.
- **Export manifests (mandatory):** every campaign/scene/map export writes `LICENSES.json` plus a
  human-readable `CREDITS.md` covering exactly the assets referenced, transitively via
  `derived_from`. This is the mechanism that keeps CC BY compliance intact across the export
  boundary — and the reason CC BY is usable for us at all.
- **`redistribution_allowed = false` as a product feature:** tier-U assets flagged non-
  redistributable are usable inside the owner's campaign, excluded from sharing, from templates,
  from marketplace listings, and from exports intended for third parties. Same field, enforced in
  the sharing path, lets us honour licenses we ourselves cannot hold.
- **Localisation:** credits and license notices in de/en, per the pack's i18n scope.

---

## Risks

1. **Provenance risk on community aggregators (high).** OGA documents fan-art-of-franchises,
   plainly stolen assets, and license mismatch ("author says non-commercial but selects a
   commercial license") as standing problems, and disclaims accuracy — *"properly attributing the
   work you distribute with your project remains your responsibility"*
   (https://opengameart.org/content/art-with-licensing-issues). CC0 conveys nothing if the
   uploader wasn't the author. *Mitigate:* prefer single-author, reputation-backed sources
   (Kenney, 0x72, Poly Haven, ambientCG) for anything bundled; audit + archive evidence for any
   community-pool asset; keep tier-1 small enough to audit properly.
2. **DCSS mixed licensing (medium).** `TILES_UNDER_UNKNOWN_LICENSE.md` exists and the maintainer
   concedes residual uncertainty (*"if you happen to see a tile incorrectly included in this
   export, please contact the maintainer"*, https://github.com/crawl/tiles). *Mitigate:* pin a
   commit, diff the license files on every bump, never bulk-import.
3. **CC BY-SA contamination via generated composites (medium, self-inflicted if it happens).** A
   BY-SA tile reaching the WFC atlas or a rendered map makes customer-facing output BY-SA.
   *Mitigate:* the CI license gate; no BY-SA in the tree at all.
4. **Asset-store EULA breach (high severity, low likelihood if policy holds).** Unity/Fab/Synty/
   Humble content in the bundle is a contract breach against a well-resourced counterparty and a
   product-recall-class event. *Mitigate:* named ban list + CI gate + purchasing policy.
5. **German commissioned-art exposure (medium).** §32a `Nachvergütung` and §307 BGB invalidity of
   cheap total buy-outs mean a bargain art contract can be reopened years later, precisely if the
   product succeeds. *Mitigate:* market-rate fees, documented scope reasoning, bonus structure,
   counsel-reviewed template.
6. **CC0 does not waive trademark (medium).** A CC0 sprite depicting franchise or trademarked
   material is still infringing. *Mitigate:* visual review of bundled art for recognisable IP.
7. **AI-generated art, both directions (medium).** Inbound: contested protectability in DE/EU
   means we may not be able to hold exclusive rights in AI-generated commissions, plus training-
   data provenance risk. Outbound: Synty and Sonniss now **explicitly prohibit** using their
   assets to train or feed generative AI — which constrains any "generate variants from our
   library" feature to first-party and CC0 inputs only. *Mitigate:* contract warranty against
   undisclosed AI content; restrict any AI asset feature to tier-0 + CC0 inputs.
8. **Anti-DRM clause forecloses an asset moat (low, but strategy-shaping).** CC BY §2(a)(4) means
   CC content cannot be protected or gated. Do not plan a business model around asset protection;
   plan it around generation, theming, and workflow.
9. **Reserved Font Name (low).** Subsetting/modifying an OFL font for the PixelArt theme requires
   renaming. *Mitigate:* build-step naming convention.
10. **Audio supply is genuinely thin (medium).** The category leader (Tabletop Audio) is NC-ND and
    the big free pro libraries (Sonniss) forbid distributing the sounds as-is. *Mitigate:* CC0-only
    + a small commissioned ambience bed + excellent GM upload support; do not promise a large
    bundled soundscape library.
11. **Volume gap vs. incumbents (medium, honesty item for the K4 differentiation thesis).** A CC0
    bundled set will not out-quantity Roll20's marketplace or match Forgotten Adventures'
    photoreal-battlemap aesthetic. **Our axis must be generation + theming + bring-your-own-art,
    not asset count.** Any claim to Kaya of "we'll have more/better assets" is not supportable;
    "we generate better maps from fewer, smarter assets, and ingest what you already own" is.
12. **Upload pipeline as attack surface (high if neglected).** SVG script payloads, decompression
    bombs, malformed images, and cross-tenant leakage all sit on the tier-U path and touch the
    no-arbitrary-code-execution invariant directly. *Mitigate:* re-encode, sanitise or reject SVG,
    hard caps, separate serving origin, strict CSP.

---

## Sources

All accessed 2026-07-26. (403 = blocked automated fetch; claim reconstructed from search-indexed
snippets, flagged inline.)

**CC0 / public-domain sources**
- https://kenney.nl/support — Kenney license statement (CC0, no attribution required)
- https://kenney.nl/assets — Kenney catalogue; https://kenney.nl/assets/tiny-dungeon — per-pack `License: Creative Commons CC0`
- https://polyhaven.com/license — Poly Haven CC0
- https://ambientcg.com/ , https://docs.ambientcg.com/license/ — ambientCG CC0
- https://opengameart.org/content/dungeon-crawl-32x32-tiles , https://opengameart.org/content/dungeon-crawl-32x32-tiles-supplemental , https://github.com/crawl/tiles — DCSS tiles, CC0 with documented exceptions
- https://0x72.itch.io/dungeontileset-ii (403) , https://itch.io/e/1455918/0x72-published-16x16-dungeontileset-ii — CC0 dungeon tileset
- https://itch.io/game-assets/assets-cc0 (403) , https://itch.io/game-assets/assets-cc0/tag-sprites — itch CC0 tag
- https://kaylousberg.com/game-assets , https://kaylousberg.itch.io/ — KayKit CC0
- https://freesound.org/help/faq/ — Freesound license filtering, CC0 subset
- https://www.nasa.gov/nasa-brand-center/images-and-media/ — NASA media usage guidelines and carve-outs

**License texts and interpretation**
- https://creativecommons.org/licenses/by/4.0/legalcode.en — CC BY 4.0 §3(a) attribution, §2(a)(4) Effective Technological Measures
- https://creativecommons.org/licenses/by-sa/4.0/legalcode.en , https://wiki.creativecommons.org/wiki/ShareAlike_interpretation , https://wiki.creativecommons.org/wiki/4.0/ShareAlike — adaptation vs. collection
- https://opengameart.org/content/faq — OGA license classes, commercial use, DRM/app-store conflicts
- https://opengameart.org/content/oga-by-30-faq — OGA-BY 3.0
- https://opengameart.org/content/art-with-licensing-issues — documented licensing problems and disclaimer
- https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles , https://lpc.opengameart.org/content/properly-licensing-your-liberated-pixel-cup-game-entry , https://github.com/ElizaWy/LPC , https://github.com/ElizaWy/LPC/issues/1 — LPC dual CC BY-SA 3.0 / GPLv3 and per-artist variance
- https://game-icons.net/about.html — CC BY 3.0, per-author attribution
- https://openfontlicense.org/ofl-faq/ , https://scripts.sil.org/ofl , https://openfontlicense.org/ofl-fonts/ , https://fossa.com/blog/open-source-licenses-101-sil-open-font-license-ofl/ — OFL 1.1 bundling/selling/hosting, Reserved Font Name

**The redistribution trap**
- https://assetstore.unity.com/browse/eula-faq — "not 'incorporated' … if it is designed to allow your end users to extract or download assets separately"; UGC/game-creation carve-out (unity.com/legal/as-terms → 403)
- https://syntystore.com/pages/one-time-purchase-licence — no distribution as stock art; no "content for Metaverse-related and/or Game Creation Software"; AI prohibitions
- https://sonniss.com/gdc-bundle-license/ , https://gdc.sonniss.com/ — "may not sell any of the sound effects as they come"; AI-training prohibition
- https://tabletopaudio.com/about.html — CC BY-NC-ND 4.0; SoundPad not for external use
- https://pipoya.itch.io/pipoya-free-rpg-character-sprites-32x32 — free commercial use, no redistribution
- https://www.forgotten-adventures.net/commercial-application/ (403) — commercial license application/approval required
- https://3dskillup.art/3d-asset-licenses-for-games/ — survey of asset-license redistribution clauses (secondary)

**"How to be a Hero" licensing**
- https://foundryvtt.com/packages/how-to-be-a-hero , https://github.com/julr/htbah , https://rollenspiel-kompass.de/regelwerk/how-to-be-a-hero/ , https://howtobeahero.de/images/4/47/Regelwerk.pdf — CC BY-NC-SA 4.0

**German law**
- https://irights.info/artikel/was-ist-cc0/28750 , https://www.telemedicus.info/neue-cc-lizenz-cc0-no-copyright/ , https://wb-web.de/aktuelles/wann-bei-cc0-der-urheber-genannt-werden-muss.html — CC0 under §29 UrhG, fallback license, residual moral rights
- https://www.gesetze-im-internet.de/urhg/__32.html , https://dejure.org/gesetze/UrhG/32.html — §32 UrhG angemessene Vergütung
- https://www.anwalt.de/rechtstipps/verguetung-im-urhebervertragsrecht-chancen-und-risiken-von-buy-out-modellen-267772.html , https://www.anwalt.de/rechtstipps/angemessene-verguetung-und-nachverguetungsansprueche-fuer-designleistungen-32-32a-urhg-207295.html — buy-out risk, §32a Nachvergütung, §307 BGB
- https://illustratoren-organisation.de/nutzungsrechte-fuer-auftraggebende/ , https://graphixx.net/wp-content/uploads/2022/07/Nutzungsrechte_fuer-Auftraggebende-2022_.pdf — commissioning illustration: exploitation-rights scope checklist
- https://en.wikipedia.org/wiki/Copyright_law_of_Germany , https://www.wipo.int/wipolex/en/legislation/details/17676 — UrhG overview

**WFC / tile-grammar background**
- https://ijdykeman.github.io/ml/2017/10/12/wang-tile-procedural-generation.html — Wang tiles, edge-colour adjacency (the interchange format argument)
