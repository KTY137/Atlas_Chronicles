# MapRenderer

`createMapRenderer(host, scene, options)` asynchronously creates the PixiJS 8 WebGL
implementation. Give `host` an explicit CSS height and width. The Pixi dependency is
dynamically loaded; importing geometry/types does not initialize a browser or renderer.

```ts
const renderer = await createMapRenderer(host, projectedScene, {
  signal: controller.signal,
  onSelect: hit => showProjectedPlace(hit),
});
renderer.update(nextProjectedScene);
renderer.fit();
// On route exit / React effect cleanup:
controller.abort();
renderer.destroy();
```

The input contains only server-projected `cells`, `pins` and optional `tokens`.
There are no raw generator objects, permissions, source files or requests in this
boundary. Input replacement removes old GPU objects and clears vanished selections.
The component containing the map must expose the **same projected places** in a
keyboard-accessible DOM list; selecting a list item can call `renderer.select(...)`.
The list remains usable if initialization raises `MapRendererUnavailableError`.

Camera coordinates use viewport CSS pixels. Pointer drag pans; wheel zooms around
the pointer; arrow keys pan; +/− zoom; Home fits the world. Marker hit radii remain
constant on screen. `resize`, `setCamera`, `getCamera`, `panBy`, `zoomAt`, `fit`,
`hitTest`, `select`, `update` and idempotent `destroy` are explicit boundary methods.
ResizeObserver follows layout changes while preserving the viewport's center point.
Teardown releases the canvas, scene objects, listener group, observer and queued frame.

`geometry.test.ts` verifies coordinate inverses, cursor-anchored zoom, clamp/fit
centering, draw-order hit tests, projection replacement and malformed geometry.
These tests **do not prove S-K1/S-T1**. Those gates need the mounted production
client, actual browser/GPU evidence, named hardware and realistic scene load.
Tile pyramids, textures, Fog, movement commands and global tactical affordances are
separate work. This implementation draws the imported polygon world and the
projected pins/tokens it receives.
