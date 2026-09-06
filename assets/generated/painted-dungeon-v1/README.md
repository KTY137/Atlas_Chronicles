# Painted dungeon assets, v1

Three generated raster assets for Atlas Chronicles map-art iteration: a stone floor surface, a wooden table and rock rubble. These files are source artwork candidates outside `assets/packs/`; they are not registered or shipped by the application.

## Provenance and distribution status

- Generated on **2026-09-06** using OpenAI's **built-in `image_gen__imagegen` through Codex**, with one generation call per asset. No CLI/API fallback was used; the tool did not expose a model identifier.
- Prompt direction: Codex, following the user's Atlas Chronicles map-asset request. The images are AI-generated; this record does not assert exclusive human authorship, uniqueness or ownership.
- No source or reference images were supplied. The prompts requested new artwork and excluded third-party game art, named game styles, text and logos. This describes the inputs and direction, not an independent rights clearance.
- **Distribution grant: pending the project's licensing decision.** No CC0 dedication, ownership transfer or other distribution licence is created by this README. Pack registration needs the project's actual licence text and its hash under the existing asset contract.
- The PNG files are **byte-for-byte copies** of the generated outputs. No resizing, cropping, alpha cleanup or other pixel editing was applied. Originals remain in the tool output directory; embedded metadata was retained without asserting its independent verification.

The exact generation prompts, source output names and machine-readable measurements are also in [`provenance.json`](provenance.json). This JSON is a provenance record, **not** an `AssetpaketV1` manifest.

## Files and verification

| File | Pixels | Mode / alpha | Bytes |
| --- | --- | --- | ---: |
| [stone-floor.png](stone-floor.png) | 1254 x 1254 | RGB, opaque | 2,873,150 |
| [wooden-table.png](wooden-table.png) | 1536 x 1024 | RGBA, actual transparency | 2,534,421 |
| [rock-rubble.png](rock-rubble.png) | 1254 x 1254 | RGBA, actual transparency | 1,578,795 |

| File | SHA-256 of original PNG bytes |
| --- | --- |
| stone-floor.png | `ead331468004c894199371c4d21af04837a320f6c18d7444887805c73475adc6` |
| wooden-table.png | `06d26decb0196b8f8aebeda2cfede2c41b7c0724fd406d0c19ede822fb1447cf` |
| rock-rubble.png | `854751b349446e8466986ed09c7304a260fec1873402bc6a3501dd7cd96c9d05` |

All workspace images were decoded successfully with Pillow in read-only inspection. Their bytes match the original tool outputs, and all three images were visually inspected. No product build, product browser check or asset-pack gate was run by this asset worker.

## Visual findings and use limits

- **Stone floor:** an even, restrained grey flagstone surface with no walls, frame, props, text or grid. Use as a finite floor patch for now. Seamless repetition was not validated; every paired opposite-edge pixel differs in both axes. That comparison alone is not a complete seam-quality test. Treat it as **`kachelbar: false`** until a separately inspected tiling iteration exists.
- **Wooden table:** a clear, bare horizontal tabletop from overhead. The output is landscape despite a square preference in the prompt; use the measured 1536 x 1024 size. The painted proportions differ slightly from the requested five-plank description. Its alpha range is 0-254: 677,919 pixels (43.101%) are fully transparent; 865,322 are near-opaque (250-254); none reach 255.
- **Rock rubble:** an irregular cluster of chipped grey stones, with more small fragments than the prompt's initial count. Alpha spans 0-255: 970,502 pixels (61.717%) are fully transparent, and 524,249 are near-opaque (250-255). Fragment faceting remains pronounced; judge scale and lighting against the eventual map compositor.
- **Alpha quality:** both cutouts contain isolated outer-edge values of 1/255 rather than a perfectly zero alpha margin. For table/rubble respectively, their visible-content boxes at alpha >3 are `[107,162,1430,852]` and `[133,112,1138,1144]` (left, top, right-exclusive, bottom-exclusive). The rubble's raw RGB preview shows some red/yellow fringe pixels with low alpha; a scan of strongly reddish pixels found alpha at most 15/255. Validate the cutouts on light and dark map surfaces at the intended display scale before final publication. The coloured RGB behind alpha 0 is hidden when a compositor correctly honours alpha.
- **Placement:** no grid scale, anchor or collision footprint is ratified here. Table and rubble are individual props, not repeatable tiles. The three files share muted stone/wood colours, material texture and overhead framing; they have not yet been judged together in the product renderer.

## Registration handoff

Keep these candidates outside `assets/packs/` until the existing package contract has the actual distribution licence, measured anchors and footprints, and delivery/render integration. Do not invent a parallel package format from this provenance record.

At inspection time, [`tools/gate-assets.mjs`](../../../tools/gate-assets.mjs) reads each asset as UTF-8 text before hashing/counting bytes. That implementation is suitable for the existing SVG content but is not binary-safe for PNG: a later raster-pack integration must hash raw buffers and decode text only for SVG inspection. The asset owner controls that shared file; it was not changed here.

## Exact generation prompts

### stone-floor.png

```text
Use case: stylized-concept
Asset type: original raster stone-floor surface for a top-down tabletop RPG dungeon map.
Primary request: a square, full-bleed stone flagstone floor texture, camera exactly overhead in orthographic projection.
Style/medium: carefully hand-painted fantasy cartography with restrained brush texture, clear forms that remain readable when reduced; realistic material proportions, not photorealistic and not a schematic.
Subject: worn, irregular rectangular grey stone slabs with fine cool dark mortar joints, subtle chipped edges and restrained weathering. Broadly even midtone values across the entire square.
Color palette: low-saturation slate grey, warm grey and muted umber; no strongly colored light.
Lighting/mood: soft diffuse overhead ambient light, slight local ambient occlusion inside joints only.
Composition/framing: square image, ideally 1024 x 1024. Stone floor continues fully to every edge. No frame, border, room outline, walls, floor objects, vegetation, puddles or cast shadows. No vignette and no directional brightness gradient. The slab pattern should extend naturally across boundaries to support potential later tiling assessment; do not add border slabs.
Constraints: entirely new artwork. No third-party game art, named game style, logos, labels, lettering, watermark, UI or grid overlay. Opaque floor texture with no transparent gaps. Only the floor surface.
```

### wooden-table.png

```text
Use case: stylized-concept
Asset type: original transparent prop sprite for a top-down tabletop RPG dungeon map.
Primary request: one sturdy rectangular wooden table seen exactly from overhead, orthographic top view, on a genuinely transparent background with an alpha channel.
Style/medium: carefully hand-painted fantasy cartography with restrained brush texture and clear readable silhouette; realistic material proportions, not photorealistic and not a schematic.
Subject: a bare rustic oak table top built from five broad lengthwise planks with a simple thicker rim and small dark wooden pegs. Worn wood grain, gently chipped corners and subtle scratches, no objects on the table. Warm muted oak brown with cool umber in plank seams.
Composition/framing: square image, ideally 1024 x 1024. One horizontal table centered, table length about 78 percent of canvas width and depth about 42 percent of canvas height. All corners comfortably inside image. Camera perpendicular to tabletop; no perspective, no visible vertical front or side faces, no visible side-facing legs.
Lighting/mood: soft diffuse overhead ambient light, slight painted edge shading and local seam occlusion only, no long or directional cast shadow.
Constraints: truly transparent empty canvas around the table, not white, grey, black, checkerboard, parchment, floor, studio backdrop, or a rectangular opaque panel. Retain clean antialiased alpha edges. Entirely new artwork. No third-party game art, named game style, text, logos, labels, watermark, UI or grid. Only one bare table, no chairs, tableware, surrounding environment or other objects.
```

### rock-rubble.png

```text
Use case: stylized-concept
Asset type: original transparent rock-rubble prop sprite for a top-down tabletop RPG dungeon map.
Primary request: one small irregular cluster of broken stone rubble seen exactly from overhead in orthographic projection, isolated on a genuinely transparent background with an alpha channel.
Style/medium: carefully hand-painted fantasy cartography with restrained brush texture and clear readable silhouette; realistic material proportions, not photorealistic and not a schematic.
Subject: a low pile of seven to ten angular chunks of broken slate-grey stone, two larger pieces with chipped bevels, a few smaller fragments close around them. Fine restrained surface fractures, muted warm-grey highlights and cool umber crevices. Clear separations between pieces; substantial empty transparent spaces between the scattered outer fragments.
Composition/framing: square image, ideally 1024 x 1024. Center the cluster with a natural uneven silhouette occupying about 65 percent of width and height. All fragments entirely within the canvas with generous empty transparent margins. Camera perpendicular to the ground; no horizon and no isometric perspective.
Lighting/mood: soft diffuse overhead ambient light, modest shading on stone facets and subtle local occlusion where stones overlap. No long or directional cast shadow.
Constraints: truly transparent empty background, including gaps between separate fragments. Do not draw white, grey, black, checkerboard, parchment, a floor, a studio backdrop, an opaque base plate or dust haze. Clean antialiased alpha edges. Entirely new artwork. No third-party game art, named game style, text, logos, labels, watermark, UI or grid. Only rubble, no plants, bones, treasure or other objects.
```

## Original tool output paths

All originals are under:

```text
C:\Users\Administrator\.codex\generated_images\01a077c4-f1e4-7750-a5d5-c5e841d40a20
```

- `exec-6dfb80ff-813f-43a5-afe5-bd6adb9fca22.png` -> `stone-floor.png`
- `exec-d8fd1a38-28e6-403d-afd8-959314f6e46c.png` -> `wooden-table.png`
- `exec-ac7ecbc7-edf7-4019-ab51-0d3d49d9ed56.png` -> `rock-rubble.png`

