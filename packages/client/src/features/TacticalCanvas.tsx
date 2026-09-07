// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createMapRenderer, visibleMapTiles, type MapHit, type MapPoint, type MapRasterTile, type MapStampImage, type MapRenderer, type ProjectedMapScene } from "@chronicle/render";
import { Button, Notice } from "@chronicle/ui";
import { parseAssetpaket } from "@chronicle/szene";
import { errorText } from "../api";
import { useAppearance } from "./Appearance";

/** The renderer never fetches private images. This scoped host owns requests and their lifetime. */
export function TacticalCanvas({ scene: projectedScene, tileBase, tileQuery = "", onMove, onSelect, onPoint, onScopeInvalidated, selection, focusObject }: {
  scene: ProjectedMapScene; tileBase: string; tileQuery?: string; onMove?: (id: string, to: MapPoint) => void; onSelect?: (hit: MapHit | null) => void; onPoint?: (point: MapPoint) => void; onScopeInvalidated?: () => void;
  selection?: MapHit | null; focusObject?: { id: string; x: number; y: number } | null;
}) {
  const { resolved } = useAppearance();
  const scene = useMemo(() => ({ ...projectedScene, rasterSampling: resolved.sampling }), [projectedScene, resolved.sampling]);
  const host = useRef<HTMLDivElement>(null), renderer = useRef<MapRenderer | null>(null);
  const latest = useRef({ scene, tileBase, tileQuery, onMove, onSelect, onPoint, onScopeInvalidated, selection }); latest.current = { scene, tileBase, tileQuery, onMove, onSelect, onPoint, onScopeInvalidated, selection };
  const synchronizing = useRef(0);
  // Renderer callbacks report user choices. Applying a controlled projection/selection
  // must not feed its temporary null selection back into the complete object outline.
  const synchronize = (apply: () => void) => {
    const controlled = latest.current.selection !== undefined;
    if (controlled) synchronizing.current++;
    try { apply(); } finally { if (controlled) synchronizing.current--; }
  };
  const schedule = useRef<() => void>(() => {}), clearScope = useRef<() => void>(() => {}), retryTiles = useRef<() => void>(() => {});
  const [error, setError] = useState(""), [tileError, setTileError] = useState(""), [ready, setReady] = useState(false);
  const [artError, setArtError] = useState("");
  const stampAssets = JSON.stringify([...new Set(scene.stamps?.map(stamp => stamp.asset) ?? [])].sort());
  useEffect(() => {
    if (!host.current) return;
    const mount = new AbortController(); let tilesRequest: AbortController | null = null, timer: ReturnType<typeof setTimeout> | undefined;
    let signature = "", cacheScope = "", cacheBytes = 0, deniedScope = "";
    const blobs = new Map<string, Blob>();
    const clear = () => { tilesRequest?.abort(); signature = ""; cacheScope = ""; cacheBytes = 0; blobs.clear(); };
    clearScope.current = clear;
    const loadTiles = async () => {
      const map = renderer.current, element = host.current, { scene: current, tileBase: base, tileQuery: query } = latest.current;
      if (!map || !element || mount.signal.aborted || !current.rasterScope) return;
      const scope = `${base}:${query}:${current.rasterScope}`;
      if (scope === deniedScope) return;
      if (scope !== cacheScope) { clear(); cacheScope = scope; }
      const tiles = visibleMapTiles([current.width, current.height], [Math.max(1, element.clientWidth), Math.max(1, element.clientHeight)], map.getCamera(), window.devicePixelRatio);
      const key = `${scope}:${tiles.map(t => `${t.level}/${t.x}/${t.y}`).join(",")}`;
      if (signature === key) return;
      signature = key; tilesRequest?.abort(); const controller = new AbortController(); tilesRequest = controller;
      const bitmaps: MapRasterTile[] = []; let cursor = 0;
      const invalidate = () => {
        if (controller.signal.aborted || mount.signal.aborted || cacheScope !== scope || renderer.current !== map) return;
        deniedScope = scope;
        // A denied tile invalidates already displayed pixels as well as pending/cache data.
        // Clear synchronously; projection polling can be offline or delayed indefinitely.
        map.setRasterTiles(current.rasterScope!, []); clear();
        setTileError("Die Kartensicht ist nicht mehr gültig. Die Ansicht wird aktualisiert.");
        latest.current.onScopeInvalidated?.();
      };
      const worker = async () => {
        while (cursor < tiles.length && !controller.signal.aborted) {
          const tile = tiles[cursor++]!, id = `${tile.level}/${tile.x}/${tile.y}`;
          let blob = blobs.get(id);
          if (!blob) {
            const response = await fetch(`${base}/${id}?view=${encodeURIComponent(current.rasterScope!)}${query ? `&${query}` : ""}`, { credentials: "same-origin", signal: controller.signal });
            if ([401, 403, 404, 409].includes(response.status)) { invalidate(); return; }
            if (!response.ok) throw new Error("Die Kartenkacheln konnten nicht geladen werden. Die Figurenliste bleibt bedienbar.");
            if (response.headers.get("X-Tactical-View") !== current.rasterScope) { invalidate(); return; }
            blob = await response.blob(); if (blob.type !== "image/png" || blob.size > 2 * 1024 * 1024) throw new Error("Ungültige Kartenkachel.");
            if (controller.signal.aborted || scope !== cacheScope) return;
            while (cacheBytes + blob.size > 16 * 1024 * 1024 && blobs.size) { const first = blobs.keys().next().value!; cacheBytes -= blobs.get(first)!.size; blobs.delete(first); }
            blobs.set(id, blob); cacheBytes += blob.size;
          }
          const bitmap = await createImageBitmap(blob);
          if (controller.signal.aborted || mount.signal.aborted) { bitmap.close(); return; }
          bitmaps.push({ id, left: tile.left, top: tile.top, width: tile.width, height: tile.height, pixelScale: 2 ** tile.level, image: bitmap });
        }
      };
      try {
        const work = await Promise.allSettled(Array.from({ length: Math.min(3, tiles.length) }, worker));
        const failure = work.find(r => r.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
        if (controller.signal.aborted || mount.signal.aborted || renderer.current !== map) { for (const t of bitmaps) t.image.close(); return; }
        map.setRasterTiles(current.rasterScope, bitmaps); setTileError("");
      } catch (failure) {
        for (const t of bitmaps) t.image.close();
        if (!controller.signal.aborted && !mount.signal.aborted) { signature = ""; setTileError(errorText(failure)); }
      }
    };
    const queue = () => { clearTimeout(timer); timer = setTimeout(() => { void loadTiles(); }, 100); };
    schedule.current = queue;
    retryTiles.current = () => { deniedScope = ""; clear(); latest.current.onScopeInvalidated?.(); queue(); };
    setError(""); setReady(false);
    void createMapRenderer(host.current, latest.current.scene, { signal: mount.signal, onCameraChange: queue,
      onSelect: hit => { if (!synchronizing.current) latest.current.onSelect?.(hit); }, onMoveToken: (id, to) => latest.current.onMove?.(id, to),
      onPoint: point => latest.current.onPoint?.(point),
    }).then(map => { if (mount.signal.aborted) { map.destroy(); return; } renderer.current = map; synchronize(() => map.update(latest.current.scene)); setReady(true); queue(); })
      .catch(reason => { if (!mount.signal.aborted) setError(errorText(reason)); });
    return () => { mount.abort(); clearTimeout(timer); clear(); renderer.current?.destroy(); renderer.current = null; schedule.current = () => {}; clearScope.current = () => {}; retryTiles.current = () => {}; };
  }, [scene.id]);
  useEffect(() => {
    const instance = renderer.current;
    if (!ready || !instance) return;
    const controller = new AbortController();
    const assets = JSON.parse(stampAssets) as string[];
    setArtError("");
    void (async () => {
      const packIds = [...new Set(assets.map(asset => asset.split("/")[0]!))];
      const manifests = new Map(await Promise.all(packIds.map(async pack => {
        if (!/^[a-z0-9._-]+$/.test(pack)) throw new Error("Ungültiger Karten-Assetverweis.");
        const response = await fetch(`/api/packs/${encodeURIComponent(pack)}/manifest`, { credentials: "same-origin", signal: controller.signal });
        if (!response.ok) throw new Error("Das Karten-Assetpaket konnte nicht geladen werden.");
        return [pack, parseAssetpaket(await response.text())] as const;
      })));
      const results = await Promise.allSettled(assets.map(async (asset): Promise<MapStampImage> => {
        const [pack, name, extra] = asset.split("/");
        const entry = pack && !extra ? manifests.get(pack)?.assets.find(item => item.name === name) : undefined;
        if (!pack || !entry) throw new Error("Das Karten-Asset ist im Paket nicht enthalten.");
        const response = await fetch(`/api/packs/${encodeURIComponent(pack)}/asset/${entry.datei.split("/").map(encodeURIComponent).join("/")}`, { credentials: "same-origin", signal: controller.signal });
        if (!response.ok) throw new Error("Ein Karten-Asset konnte nicht geladen werden.");
        const blob = await response.blob(), url = URL.createObjectURL(blob);
        try {
          const image = new Image(); image.src = url; await image.decode();
          return { asset, image: await createImageBitmap(image) };
        } finally { URL.revokeObjectURL(url); }
      }));
      const images = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
      if (controller.signal.aborted || renderer.current !== instance) { for (const item of images) item.image.close(); return; }
      instance.setStampImages(images);
      if (results.some(result => result.status === "rejected")) setArtError("Ein Teil der Kartenobjekte konnte nicht gezeichnet werden. Räume und Eingänge bleiben bedienbar.");
    })().catch(failure => { if (!controller.signal.aborted) setArtError(errorText(failure)); });
    return () => controller.abort();
  }, [stampAssets, ready, scene.id]);
  useLayoutEffect(() => {
    synchronize(() => renderer.current?.update(scene)); schedule.current();
  }, [scene]);
  useLayoutEffect(() => { clearScope.current(); schedule.current(); }, [scene.rasterScope, tileBase, tileQuery]);
  useLayoutEffect(() => { if (selection !== undefined) synchronize(() => renderer.current?.select(selection)); }, [selection?.kind, selection?.id, ready]);
  useLayoutEffect(() => {
    const map = renderer.current, element = host.current;
    if (!map || !element || !focusObject || !Number.isFinite(focusObject.x) || !Number.isFinite(focusObject.y)) return;
    const camera = map.getCamera();
    map.setCamera({ ...camera, x: element.clientWidth / 2 - focusObject.x * camera.scale, y: element.clientHeight / 2 - focusObject.y * camera.scale });
  }, [focusObject?.id, focusObject?.x, focusObject?.y, ready]);
  return <div className="tactical-canvas-frame">
    <div className="button-row"><Button disabled={!ready} onClick={() => renderer.current?.fit()}>Ganze Karte</Button><Button disabled={!ready} aria-label="Karte vergrößern" onClick={() => renderer.current?.zoomAt(1.5)}>+</Button><Button disabled={!ready} aria-label="Karte verkleinern" onClick={() => renderer.current?.zoomAt(1 / 1.5)}>−</Button></div>
    {error ? <Notice error>{error} Die Liste darunter bietet dieselben Figurenbefehle.</Notice> : null}
    {artError ? <Notice error>{artError}</Notice> : null}
    {tileError ? <Notice error>{tileError} <Button onClick={() => retryTiles.current()}>Kacheln erneut laden</Button></Notice> : null}
    {/* Die Signatur liegt NEBEN dem Renderziel, nicht darin: `createMapRenderer` besitzt das
        Wirtselement und raeumt es aus. Ein Kind darin waere beim ersten Neuaufbau verschwunden —
        und `pointer-events: none` sorgt dafuer, dass sie keinen Klick auf die Karte schluckt. */}
    <div className="tactical-canvas-wrap">
      <div className="tactical-canvas" ref={host} data-canvas-ready={ready} />
      <span className="karten-signatur" aria-hidden="true">Atlas Chronicles</span>
    </div>
    <p className="field-help">Karte ziehen oder mit Pfeiltasten verschieben. Mit dem Mausrad zoomen. Bewegliche Figuren lassen sich ziehen; genaue Werte stehen auch in der Figurenliste.</p>
  </div>;
}
